#!/usr/bin/env node
// F1 — KARŞILANANIN TEK YAZARI SUNUCU: başarısızlık testleri (VERI-TUTARLILIGI-F0.md § 8). F1'den ÖNCE kırmızı olmaları beklenir.
// Kullanıcı kararları (1 Kasım, F1 onayı):
//   2) F1'den sonra yeni teslim / iptalde otomatik hesaplama yapılabilir; ama ÖNCEDEN VAR OLAN farkın işlem sırasında değişmesi
//      ayrıca RAPORLANIR (fis_karsilanan_iz + yanıtta `karsilananDuzeltme`) ve test edilir.
//   4) Hayalet karşılanan (hareketsiz) otomatik sıfırlanmaz; gece denetiminde açıkça raporlanır.
// Kilit: degisiklik.tekil tek satırı (F0 § 4) — ön kilitli işlemle yan yana kilitlenme olmamalı.
const { spawn } = require("child_process");
const T = require("./ortak.js");
const { ON } = T;
const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";

const oturum = (sql) => new Promise((coz) => {
  const c = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB]);
  let err = ""; c.stderr.on("data", (d) => { err += d; });
  c.on("close", (kod) => coz({ ok: kod === 0, hata: err.split("\n").filter((x) => /ERROR/.test(x)).join(" | ") }));
  c.stdin.end(sql);
});
const kilitMi = (...r) => r.filter((x) => x && !x.ok && /deadlock/i.test(x.hata || "")).length;
const izVar = () => T.psql("select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'fis_karsilanan_iz';") === "1";
const izOku = (kalemId) => (izVar() ? T.jsonSorgu(`select tur, onceki_karsilanan::float as onceki, onceki_hesap::float as hesap, yeni_karsilanan::float as yeni, islem from public.fis_karsilanan_iz where kalem_id = '${kalemId}' order by id`) : null);
const korumasiz = (sql) => T.psql(`select set_config('fis.kapi', 'acik', false); select set_config('fis.kalem', 'acik', false);\n${sql}`);

(async () => {
  console.log(`F1 başarısızlık testleri · önek ${ON}`);

  // F1.yanit-kalemler — fis_kes yanıtı etkilenen kalemlerin güncel karşılananını döndürür (istemci yerel değeri ondan alır)
  {
    const A = `${ON}-y-A`;
    const s = T.siparisKur(T.sipObj(`${ON}-sy`, [T.kalemObj(A, 20, 0)]));
    const r = T.rpc("fis_kes", { ...T.teslimYuku({ s, kalemId: A, adet: 4, ekran: 0, istek: `${ON}-iy1` }), istemci: { surum: "1.743.0" } });
    const yanit = r.ok ? (r.sonuc.kalemler || null) : r.hata;
    T.kontrol("F1.istemci-alani-kabul", "yükteki `istemci` alanı kabul edilir (eski ve yeni SQL)", { sonra: { kabul: r.ok }, gercek: r.ok, beklenen: true });
    T.kontrol("F1.yanit-kalemler", "fis_kes yanıtında kalemler: [{id, karsilanan}] = veritabanı", { sonra: { yanit, db: T.kalemDb(A).karsilanan },
      gercek: yanit, beklenen: [{ id: A, karsilanan: 4 }] });
    // F1.iptal-yanit-kalemler
    const ip = T.rpc("fis_iptal", { ...T.iptalYuku({ s, kalemId: A, fisNo: r.sonuc.fisNo, adet: 4, ekran: 4 }), istemci: { surum: "1.743.0" } });
    const yanit2 = ip.ok ? (ip.sonuc.kalemler || null) : ip.hata;
    T.kontrol("F1.iptal-yanit-kalemler", "fis_iptal yanıtında kalemler (iptal sonrası 0)", { sonra: { yanit: yanit2, db: T.kalemDb(A).karsilanan }, gercek: yanit2, beklenen: [{ id: A, karsilanan: 0 }] });
  }

  // F1.onceden-fark-raporlanir — kalemde ÖNCEDEN fark var (karşılanan 9, geçerli hareket 4). Yeni teslim 1 gelir.
  {
    const A = `${ON}-f-A`;
    const s = T.siparisKur(T.sipObj(`${ON}-sf`, [T.kalemObj(A, 20, 0)]));
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 4, ekran: 0, istek: `${ON}-if1` }));
    korumasiz(`update public.siparis_kalemleri set karsilanan = 9 where id = '${A}';`);   // önceden var olan fark (canlıda D1a)
    const once = { karsilanan: T.kalemDb(A).karsilanan, teslim: T.teslimDb(A) };
    const r = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 1, ekran: 9, istek: `${ON}-if2` }));
    const sonra = { karsilanan: T.kalemDb(A).karsilanan, teslim: T.teslimDb(A), iz: izOku(A), yanitDuzeltme: r.ok ? (r.sonuc.karsilananDuzeltme || null) : r.hata };
    T.kontrol("F1.onceden-fark-raporlanir", "fark işlemde düzelir (5 / 5) ve iz kaydı + yanıtta düzeltme bilgisi var", { once, sonra,
      gercek: [sonra.karsilanan, sonra.teslim, sonra.iz, (sonra.yanitDuzeltme || []).length],
      beklenen: [5, 5, [{ tur: "onceden_fark", onceki: 9, hesap: 4, yeni: 5, islem: "fis_kes" }], 1] });
  }

  // F1.hayalet-korunur — hayalet (karşılanan 5, hiç hareket yok) kaleme teslim 2: SIFIRLANMAZ (karar 4) → 7, iz kaydı 'hayalet_korundu'
  {
    const A = `${ON}-h-A`, B = `${ON}-h-B`;
    const s = T.siparisKur(T.sipObj(`${ON}-sh`, [T.kalemObj(A, 20, 5), T.kalemObj(B, 10, 3, { renk: "Beyaz" })]));
    const once = { A: T.kalemDb(A).karsilanan, B: T.kalemDb(B).karsilanan };
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 2, ekran: 5, istek: `${ON}-ih1` }));
    const sonra = { A: T.kalemDb(A).karsilanan, teslimA: T.teslimDb(A), B: T.kalemDb(B).karsilanan, izA: izOku(A), izB: izOku(B) };
    T.kontrol("F1.hayalet-korunur", "hayalete teslim: 5 + 2 = 7 (sıfırlanmaz) ve iz 'hayalet_korundu'", { once, sonra,
      gercek: [sonra.A, sonra.izA], beklenen: [7, [{ tur: "hayalet_korundu", onceki: 5, hesap: 0, yeni: 7, islem: "fis_kes" }]] });
    T.kontrol("F1.hayalet-dokunulmaz", "fişe girmeyen hayalet kalem (B) değişmez, izi yok", { sonra, gercek: [sonra.B, (sonra.izB || []).length], beklenen: [3, 0] });
  }

  // F1.gece-raporu — fis_gece_denetimi karşılanan bölümü: hayalet sayısı + günün düzeltmeleri (karar 2 ve 4)
  {
    const g = JSON.parse(T.psql("select public.fis_gece_denetimi(null)::text;"));
    const k = g.karsilanan || null;
    T.kontrol("F1.gece-raporu", "gece denetiminde `karsilanan` bölümü: hayalet + fark + günün düzeltmeleri", { sonra: k ? { hayalet: k.hayalet && k.hayalet.sayi, fark: k.fark && k.fark.sayi, duzeltme: k.duzeltme && k.duzeltme.sayi } : null,
      gercek: !!(k && k.hayalet && k.fark && k.duzeltme && k.hayalet.sayi > 0 && k.duzeltme.sayi > 0), beklenen: true });
  }

  // F1.iz-erisimi — iz tablosuna giriş yapmış kullanıcı doğrudan yazamaz / okuyamaz (yalnız sunucu işlemleri)
  {
    let sonuc = "tablo yok";
    if (izVar()) {
      try { T.psql(`select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', false); set role authenticated; select count(*) from public.fis_karsilanan_iz;`); sonuc = "okunabildi"; }
      catch (e) { sonuc = "reddedildi"; }
    }
    T.kontrol("F1.iz-erisimi", "fis_karsilanan_iz doğrudan okunamaz (RLS / yetki)", { sonra: { sonuc }, gercek: sonuc, beklenen: "reddedildi" });
  }

  // ---- KİLİT (degisiklik.tekil) ----
  // F1.G1-yeni-kodla — F0 K.G1'in aynısı: başka bir işlem kalemi önce kilitleyip sonra yazar ('tekil'i ister); yanında fis_kes.
  {
    const g = `${ON}-g1k`;
    const sg = T.siparisKur(T.sipObj(`${ON}-g1`, [T.kalemObj(g, 20, 0)]));
    const onKilit = oturum(`begin; select id from public.siparis_kalemleri where id = '${g}' for update; select pg_sleep(0.8);
      update public.siparisler set durum = durum where id = '${sg.id}'; commit;`);
    await T.uyu(250);
    const fk = T.rpcAyri("fis_kes", T.teslimYuku({ s: sg, kalemId: g, adet: 1, ekran: 0, istek: `${ON}-ig1` }));
    const [r1, r2] = await Promise.all([onKilit, fk]);
    T.kontrol("F1.G1-yeni-kodla", "ön kilitli işlem + fis_kes: kilitlenme yok, ikisi de tamam", { sonra: { onKilit: r1.ok || r1.hata.slice(0, 80), fisKes: r2.ok || (r2.hata || "").slice(0, 80) },
      gercek: [kilitMi(r1, r2), r1.ok, r2.ok], beklenen: [0, true, true] });
  }
  // F1.tekil-tutucu — 'tekil'i tutan (ilgisiz bir yazma yapmış, 1 sn bekleyen) işlemin yanında fis_kes: bekler, kilitlenmez
  {
    const g = `${ON}-t1k`;
    const sg = T.siparisKur(T.sipObj(`${ON}-t1`, [T.kalemObj(g, 20, 0)]));
    const diger = T.siparisKur(T.sipObj(`${ON}-t1d`, [T.kalemObj(`${ON}-t1dk`, 5, 0)]));
    const tutucu = oturum(`begin; update public.siparisler set durum = durum where id = '${diger.id}'; select pg_sleep(1); commit;`);
    await T.uyu(250);
    const bas = Date.now();
    const fk = await T.rpcAyri("fis_kes", T.teslimYuku({ s: sg, kalemId: g, adet: 1, ekran: 0, istek: `${ON}-it1` }));
    const r1 = await tutucu;
    T.kontrol("F1.tekil-tutucu", "'tekil' tutulurken fis_kes bekler ve tamamlanır (kilitlenme yok)", { sonra: { fisKes: fk.ok, bekledi_ms: Date.now() - bas, karsilanan: T.kalemDb(g).karsilanan },
      gercek: [kilitMi(r1, fk), fk.ok, T.kalemDb(g).karsilanan], beklenen: [0, true, 1] });
  }
  // F1.iptal-kes-eszamanli — iki kalemli fişin İPTALİ ile aynı kalemlere ters sırada yeni fiş aynı anda (k1'i tutan üçüncü oturumla zorlanır)
  {
    const k1 = `${ON}-c-k1`, k2 = `${ON}-c-k2`;
    const sc = T.siparisKur(T.sipObj(`${ON}-sc`, [T.kalemObj(k1, 20, 0), T.kalemObj(k2, 20, 0)]));
    const fis = (sira, istek) => ({ istek, fis: { aile: "stok", tur: "Satış", onek: "SF", cariId: "c-yeni", siparisId: sc.id, siparisNo: sc.siparisNo },
      stok: { satirlar: sira.map((k, i) => ({ id: `${istek}-h${i}`, urunId: "u-yeni", renk: "Siyah", miktar: -2, kaynak: "Satış", siparisId: sc.id, kalemId: k })) },
      alt: { siparis_kalemleri: { satirlar: sira.map((k) => ({ id: k, siparis_id: sc.id, miktar: 20, karsilanan: 2 })), artis: sira.map((k) => ({ id: k, miktar: 2 })) } } });
    const ilk = T.rpc("fis_kes", fis([k1, k2], `${ON}-ic1`));
    const tut = oturum(`begin; select id from public.siparis_kalemleri where id = '${k1}' for update; select pg_sleep(1.2); commit;`);
    await T.uyu(200);
    const pI = T.rpcAyri("fis_iptal", { no: ilk.sonuc.fisNo, sebep: "F1", alt: { siparis_kalemleri: { satirlar: [k1, k2].map((k) => ({ id: k, siparis_id: sc.id, miktar: 20, karsilanan: 0 })), artis: [k1, k2].map((k) => ({ id: k, miktar: -2 })) } } });
    await T.uyu(300);
    const pK = T.rpcAyri("fis_kes", fis([k2, k1], `${ON}-ic2`));
    const [rI, rK] = await Promise.all([pI, pK, tut]);
    const d = { k1: [T.kalemDb(k1).karsilanan, T.teslimDb(k1)], k2: [T.kalemDb(k2).karsilanan, T.teslimDb(k2)] };
    T.kontrol("F1.iptal-kes-eszamanli", "iptal + ters sıralı yeni fiş: kilitlenme yok, karşılanan = teslim (2 / 2)", { sonra: { iptal: rI.ok || rI.hata, kes: rK.ok || rK.hata, ...d },
      gercek: [kilitMi(rI, rK), rI.ok, rK.ok, d.k1, d.k2], beklenen: [0, true, true, [2, 2], [2, 2]] });
  }
  // GÖZLEM G4 — fis_iptal (fiş X'i kilitler → kalem ön kilidini bekler) ile aynı siparişin İPTALİ fis_bag_coz (önce hareketleri günceller
  // → en sonda fiş başlığına not yazar, X'i ister) aynı anda. Ters sıra F1'den ÖNCE de vardı (fis_iptal X'ten hemen sonra hareketleri
  // günceller); F1'in kalem ön kilidi bekleme penceresini genişletir. Çözümü F4 (siparis_iptal, tek sıra) — burada yalnız ölçülür.
  {
    const k = `${ON}-b4k`;
    const sb = T.siparisKur(T.sipObj(`${ON}-b4`, [T.kalemObj(k, 20, 0)]));
    const t = T.rpc("fis_kes", T.teslimYuku({ s: sb, kalemId: k, adet: 3, ekran: 0, istek: `${ON}-ib4` }));
    const tut = oturum(`begin; select id from public.siparis_kalemleri where id = '${k}' for update; select pg_sleep(1); commit;`);
    await T.uyu(200);
    const pI = T.rpcAyri("fis_iptal", T.iptalYuku({ s: sb, kalemId: k, fisNo: t.sonuc.fisNo, adet: 3, ekran: 3 }));
    await T.uyu(300);
    const pB = T.rpcAyri("fis_bag_coz", { siparisId: sb.id, siparisNo: sb.siparisNo });
    const [rI, rB] = await Promise.all([pI, pB, tut]);
    T.gozlem("F1.G4-iptal-ile-bag-coz", "fis_iptal + aynı siparişin fis_bag_coz'u", { kilitlenme: kilitMi(rI, rB), iptal: rI.ok ? "tamam" : (rI.hata || "").slice(0, 80), bagCoz: rB.ok ? "tamam" : (rB.hata || "").slice(0, 80),
      karsilanan: T.kalemDb(k).karsilanan, teslim: T.teslimDb(k) });
  }
  T.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
