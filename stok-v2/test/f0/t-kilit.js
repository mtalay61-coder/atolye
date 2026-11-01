#!/usr/bin/env node
// F0 / KİLİT — EŞZAMANLI İŞLEMLERDE KİLİTLENME (deadlock) RİSKİ. Tasarım (VERI-TUTARLILIGI-F0.md § kilit analizi): fiş işlemleri
// dokunacakları sipariş kalemlerini İŞLEMİN BAŞINDA kimlik sırasıyla kilitler; böylece iki işlem aynı kalemleri hangi sırayla
// gönderirse göndersin kilitlenme olmaz. Bugün (1.742.3) fis_kes kalemleri yükteki SIRAYLA kilitler (alt_yaz satır satır).
// Zamanlamayı zorlamak için üçüncü bir oturum k1'i 1,5 sn tutar: A (k1, k2) k1'i bekler; B (k2, k1) k2'yi alıp k1'i bekler;
// tutucu bırakınca A k1'i alır, k2'yi ister (B'de) → kilitlenme. PostgreSQL birini 40P01 ile geri alır (veri bozulmaz; işlem düşer).
const { spawn } = require("child_process");
const T = require("./ortak.js");
const { ON } = T;

const tut = (kalemId, sn) => new Promise((coz) => {
  const c = spawn("psql", ["-X", "-q", "-At", "-d", process.env.STOK_V2_DB || "atolye_stok_v2_sinama"]);
  c.on("close", () => coz());
  c.stdin.end(`begin; select id from public.siparis_kalemleri where id = '${kalemId}' for update; select pg_sleep(${sn}); commit;`);
});
// Çok kalemli teslim fişi (yeni istemci biçimi: mutlak satır + artis), kalemler `sira` düzeninde
function ikiKalemliFis(s, sira, istek) {
  return { istek, fis: { aile: "stok", tur: "Satış", onek: "SF", cariId: "c-yeni", siparisId: s.id, siparisNo: s.siparisNo },
    stok: { satirlar: sira.map((k, i) => ({ id: `${istek}-h${i}`, urunId: "u-yeni", renk: "Siyah", miktar: -1, kaynak: "Satış", siparisId: s.id, kalemId: k, siparisNo: s.siparisNo })) },
    alt: { siparis_kalemleri: { satirlar: sira.map((k) => ({ id: k, siparis_id: s.id, miktar: 20, karsilanan: 1 })), artis: sira.map((k) => ({ id: k, miktar: 1 })) } } };
}

(async () => {
  console.log(`F0 / KİLİT · önek ${ON}`);
  const k1 = `${ON}-k1`, k2 = `${ON}-k2`;
  const s = T.siparisKur(T.sipObj(`${ON}-s`, [T.kalemObj(k1, 20, 0), T.kalemObj(k2, 20, 0, { renk: "Siyah" })]));
  const tutucu = tut(k1, 1.5);
  await T.uyu(200);
  const pA = T.rpcAyri("fis_kes", ikiKalemliFis(s, [k1, k2], `${ON}-iA`));
  await T.uyu(300);
  const pB = T.rpcAyri("fis_kes", ikiKalemliFis(s, [k2, k1], `${ON}-iB`));
  const [rA, rB] = await Promise.all([pA, pB, tutucu]);
  const kilitlenme = [rA, rB].filter((r) => !r.ok && /deadlock|kilitlenme|40P01/i.test(r.hata || "")).length;
  const sonra = { A: rA.ok ? "kabul" : rA.hata, B: rB.ok ? "kabul" : rB.hata, k1: { karsilanan: T.kalemDb(k1).karsilanan, teslim: T.teslimDb(k1) }, k2: { karsilanan: T.kalemDb(k2).karsilanan, teslim: T.teslimDb(k2) } };
  T.kontrol("K.ters-sira-kilitlenmez", "aynı kalemleri ters sırada gönderen iki fiş kilitlenmeden ikisi de tamamlanır", { sonra, gercek: [rA.ok, rB.ok, kilitlenme], beklenen: [true, true, 0] });
  // Not: iki SF fişi aynı gün aynı numara sayacı satırını (fis_sayac, onek+gün) kilitler — fiilen SIRAYLA çalışırlar. Bu yüzden
  // yukarıdaki durum bugün de kilitlenmez (yeşil). Sayaç kullanmayan yol: sipariş düzenleme (köprü alt_yaz) ters sırada.

  // K.fis-ile-duzenleme — A: fis_kes (k1, k2); B: aynı siparişin düzenlemesi alt_yaz (k2, k1 sırasıyla, fiyat değişir)
  const m1 = `${ON}-m1`, m2 = `${ON}-m2`;
  const s2 = T.siparisKur(T.sipObj(`${ON}-s2`, [T.kalemObj(m1, 20, 0), T.kalemObj(m2, 20, 0)]));
  const tutucu2 = tut(m1, 1.5);
  await T.uyu(200);
  const pA2 = T.rpcAyri("fis_kes", ikiKalemliFis(s2, [m1, m2], `${ON}-iA2`));
  await T.uyu(300);
  const pB2 = T.rpcAyri("alt_yaz", { siparis_kalemleri: { satirlar: [m2, m1].map((k) => ({ id: k, siparis_id: s2.id, urun_id: "u-yeni", urun_ad: "Yeni Ürün", renk: "Siyah", miktar: 20, fiyat: 110 })) } });
  const [rA2, rB2] = await Promise.all([pA2, pB2, tutucu2]);
  const kilit2 = [rA2, rB2].filter((r) => !r.ok && /deadlock|kilitlenme|40P01/i.test(r.hata || "")).length;
  const sonra2 = { fisKes: rA2.ok ? "kabul" : rA2.hata, duzenleme: rB2.ok ? "kabul" : rB2.hata,
    m1: { karsilanan: T.kalemDb(m1).karsilanan, teslim: T.teslimDb(m1) }, m2: { karsilanan: T.kalemDb(m2).karsilanan, teslim: T.teslimDb(m2) } };
  T.kontrol("K.fis-ile-duzenleme", "fiş ile ters sıralı sipariş düzenlemesi kilitlenmeden tamamlanır", { sonra: sonra2, gercek: [rA2.ok, rB2.ok, kilit2], beklenen: [true, true, 0] });
  T.kontrol("K.kilitlenmede-veri-tutarli", "kilitlenme olsa da geri alınan işlem iz bırakmaz (karşılanan = teslim)", { sonra: sonra2,
    gercek: [sonra.k1.karsilanan === sonra.k1.teslim, sonra.k2.karsilanan === sonra.k2.teslim, sonra2.m1.karsilanan === sonra2.m1.teslim, sonra2.m2.karsilanan === sonra2.m2.teslim],
    beklenen: [true, true, true, true] });
  // ---- TASARIM RİSKİ GÖZLEMLERİ (üretim kodu değişmez; önerilen düzen ELLE yazılmış işlemlerle taklit edilir) -------------------
  // Her izlenen tablonun AFTER STATEMENT `degisiklik_izle` tetikleyicisi TEK satırı günceller (degisiklik.id = 'tekil',
  // degisiklik-sayaci.sql). Yazan her işlem bu satırı ilk yazma deyiminin sonunda kilitler ve işlem bitene kadar tutar.
  // Sonuç: bir işlem 'tekil'den SONRA başka bir satır kilitlemeye kalkarsa, o satırı önceden tutup 'tekil'i bekleyen işlemle kilitlenir.
  const oturum = (sql) => new Promise((coz) => {
    const c = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", process.env.STOK_V2_DB || "atolye_stok_v2_sinama"]);
    let err = ""; c.stderr.on("data", (d) => { err += d; });
    c.on("close", (kod) => coz({ ok: kod === 0, hata: err.split("\n").filter((x) => /ERROR/.test(x)).join(" | ") }));
    c.stdin.end(sql);
  });
  const kilitMi = (...r) => r.filter((x) => !x.ok && /deadlock/i.test(x.hata || "")).length;

  // G1 — tasarımdaki ÖN KİLİT (kalem, yazmadan önce) + bugünkü fis_kes (önce yazar, sonra kalem kilitler)
  {
    const g = `${ON}-g1k`;
    const sg = T.siparisKur(T.sipObj(`${ON}-g1`, [T.kalemObj(g, 20, 0)]));
    const onKilit = oturum(`begin; select id from public.siparis_kalemleri where id = '${g}' for update; select pg_sleep(0.8);
      update public.siparisler set durum = durum where id = '${sg.id}'; commit;`);   // ön kilit → sonra ilk yazma ('tekil' ister)
    await T.uyu(250);
    const fk = T.rpcAyri("fis_kes", T.teslimYuku({ s: sg, kalemId: g, adet: 1, ekran: 0, istek: `${ON}-ig1` }));   // 'tekil'i alır, kalemi bekler
    const [r1, r2] = await Promise.all([onKilit, fk]);
    T.gozlem("K.G1-onkilit-ile-bugunku-fis", "ön kilitli işlem + bugünkü fis_kes", { kilitlenme: kilitMi(r1, r2), onKilit: r1.ok ? "tamam" : r1.hata.slice(0, 90), fisKes: r2.ok ? "tamam" : r2.hata.slice(0, 90) });
  }
  // G2 — önerilen DURUM TETİKLEYİCİSİ taklidi (işlem: kalem yazar → 'tekil' → sonra sipariş satırını günceller) +
  //      başka cihazın REST başlık yazması (tek deyim: sipariş satırını kilitler → deyim sonunda 'tekil' ister)
  {
    const g = `${ON}-g2k`;
    const sg = T.siparisKur(T.sipObj(`${ON}-g2`, [T.kalemObj(g, 20, 0)]));
    const tetik = oturum(`begin; update public.siparis_kalemleri set fiyat = fiyat where id = '${g}'; select pg_sleep(0.8);
      update public.siparisler set durum = 'Kısmi Teslim' where id = '${sg.id}'; commit;`);
    await T.uyu(250);
    const rest = oturum(`update public.siparisler set durum = 'Bekliyor' where id = '${sg.id}';`);
    const [r1, r2] = await Promise.all([tetik, rest]);
    T.gozlem("K.G2-durum-tetikleyici-ile-rest", "kalem→sipariş güncelleyen işlem + REST başlık yazması", { kilitlenme: kilitMi(r1, r2), tetikleyiciTaklidi: r1.ok ? "tamam" : r1.hata.slice(0, 90), rest: r2.ok ? "tamam" : r2.hata.slice(0, 90) });
  }
  // G3 — aynı taklit, ama sipariş satırı İŞLEMİN BAŞINDA (ilk yazmadan önce) kilitlenir: önerilen düzeltme
  {
    const g = `${ON}-g3k`;
    const sg = T.siparisKur(T.sipObj(`${ON}-g3`, [T.kalemObj(g, 20, 0)]));
    const tetik = oturum(`begin; select id from public.siparisler where id = '${sg.id}' for update; update public.siparis_kalemleri set fiyat = fiyat where id = '${g}';
      select pg_sleep(0.8); update public.siparisler set durum = 'Kısmi Teslim' where id = '${sg.id}'; commit;`);
    await T.uyu(250);
    const rest = oturum(`update public.siparisler set durum = 'Bekliyor' where id = '${sg.id}';`);
    const [r1, r2] = await Promise.all([tetik, rest]);
    T.gozlem("K.G3-on-kilitli-durum", "sipariş satırı baştan kilitli + REST başlık yazması", { kilitlenme: kilitMi(r1, r2), tetikleyiciTaklidi: r1.ok ? "tamam" : r1.hata.slice(0, 90), rest: r2.ok ? "tamam" : r2.hata.slice(0, 90) });
  }
  T.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
