#!/usr/bin/env node
// ÜRETİM SİLME — STOK / CARİ BAKİYE, EŞZAMANLI TESLİM, TEKRAR (7 Kasım). Yalnız yerel PostgreSQL; Supabase'e DOKUNMAZ.
// 12 paketi kurulu veritabanında (t-uretim-bakiye.sh: atolye_guvenlik kopyası → 12-geri-al → 12-uretim-sil-kur → 12-sonra-dogrula 6/6).
//
// Kahin — her durumda silmeden ÖNCE ve SONRA iki sayı ölçülür, beklenenle karşılaştırılır:
//   STOK = stk_stok (u-yeni'nin bütün varyantları; fiş VE satır geçerliyse sayar — uygulamanın gördüğü miktar)
//   CARİ = c-yeni bakiyesi: geçerli car_hareket (fişi varsa fişi de geçerli), Borç +, Alacak −
//   ESKİ FİŞLİ (istek'siz fiş, stok −2, cari Alacak 40)  → silinir; STOK +2, CARİ +40 (etki tamamen geri)
//   YENİ FİŞLİ (fis_kes ÜRT, stok −3, cari Alacak 30)    → silinir; STOK +3, CARİ +30
//   KARMA (eski + yeni fiş aynı üretimde)                 → ikisi birlikte iptal; STOK +5, CARİ +70
//   FİŞSİZ CARİ (eski fişli stok + fişsiz cari)           → KR010; hiçbir sayı değişmez, üretim duruyor
//   Her silinen üretim için: bağlı geçerli stok / cari hareketi 0, geçerli fiş başlığı (stk_fis.uretim_id) 0, iz tablosunda.
// EŞZAMANLI — aynı satış siparişi kaleminde (K) üretimin teslim fişi var; aynı anda ikinci teslim ∥ uretim_sil:
//   E1 teslim üretime BAĞLI (uretimId = U), zorla sıra (açık işlem 2 sn): önce teslim → silme KR010; önce silme → teslim KR010.
//   E2 teslim üretime BAĞSIZ (aynı kalem, başka iş), zorla sıra: ikisi de tamam; silme yalnız üretimin fişini iptal eder.
//   E3 doğal yarış (bekleme yok) × 12, bağlı / bağsız dönüşümlü.
//   Her koşuda: 40P01 (kilitlenme) yok; kalem karşılananı = geçerli teslim hareketlerinin toplamı (çift ters kayıt / çift düşüş yok);
//   STOK ve CARİ = başlangıç + geçerli teslimlerin etkisi; üretim yoksa bağlı geçerli hareket / fiş yok (yarım işlem yok).
// TEKRAR — silme isteği yeniden gönderilir:
//   T1 başarılı silmeden sonra aynı istek → zatenYok; satır sayısı, iptal sayısı, STOK, CARİ, karşılanan DEĞİŞMEZ.
//   T2 aynı anda iki silme isteği → biri silindi, öteki zatenYok; fiş bir kez iptal, karşılanan bir kez düşer.
//   T3 E1'de reddedilen silme, yenileyip (ekran listesi olmadan) tekrar → bu kez tamamı: iki fiş iptal, karşılanan 0.
const assert = require("assert/strict");
assert(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST), "Yalnız yerel PostgreSQL");
const T = require("../f0/ortak");
const { psql, ON } = T;
const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";
const KIM = `select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true); set local role authenticated;`;

let gecen = 0, kalan = 0;
const k = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); };
const sql = (s) => psql(s);
const sayi = (s) => Number(sql(s));
const VARYANT = sql("select varyant_id from public.stk_stok where urun_id = 'u-yeni' and renk_ad = 'Siyah' limit 1");
assert(VARYANT, "u-yeni Siyah varyantı yok");

// ---- ölçüler --------------------------------------------------------------------------------------------------------------
const STOK = () => sayi("select coalesce(sum(miktar), 0) from public.stk_stok where urun_id = 'u-yeni'");
const CARI = () => sayi(`select coalesce(sum(case when c.yon = 'Borç' then c.tutar else -c.tutar end), 0) from public.car_hareket c
  left join public.stk_fis f on f.id = c.fis_id where c.cari_id = 'c-yeni' and not c.iptal and (c.fis_id is null or not f.iptal)`);
const bakiye = () => ({ stok: STOK(), cari: CARI() });
const fark = (a, b) => ({ stok: +(b.stok - a.stok).toFixed(4), cari: +(b.cari - a.cari).toFixed(4) });
const bagliKalan = (u) => ({
  uretim: sayi(`select count(*) from public.uretim where id = '${u}'`),
  stokHareket: sayi(`select count(*) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id where h.uretim_id = '${u}' and not h.iptal and not f.iptal`),
  cariHareket: sayi(`select count(*) from public.car_hareket c left join public.stk_fis f on f.id = c.fis_id where c.uretim_id = '${u}' and not c.iptal and (c.fis_id is null or not f.iptal)`),
  fisBasligi: sayi(`select count(*) from public.stk_fis where uretim_id = '${u}' and not iptal`),
});
const iz = (u) => sayi(`select count(*) from public.uretim_silinen where id = '${u}'`);
const satirSayisi = (u) => sayi(`select (select count(*) from public.stk_hareket where uretim_id = '${u}' or fis_id in (select id from public.stk_fis where uretim_id = '${u}'))
  + (select count(*) from public.car_hareket where uretim_id = '${u}') + (select count(*) from public.stk_fis where uretim_id = '${u}')`);
const iptalSayisi = (u) => sayi(`select (select count(*) from public.stk_hareket where iptal and (uretim_id = '${u}' or fis_id in (select id from public.stk_fis where uretim_id = '${u}')))
  + (select count(*) from public.stk_fis where iptal and uretim_id = '${u}')`);

// ---- çağrılar (giriş yapmış kullanıcı) -------------------------------------------------------------------------------------
const kod = (metin) => (/40P01|deadlock/i.test(metin) ? "40P01" : (metin.match(/KR0\d\d/) || [])[0] || (metin ? "hata" : "tamam"));
function sil(u, ek = {}) {
  try { return { kod: "tamam", sonuc: JSON.parse(psql(`\\set VERBOSITY verbose\nbegin; ${KIM} select public.uretim_sil($j$${JSON.stringify({ id: u, sebep: "bakiye sınaması", ...ek })}$j$::jsonb); commit;`).split("\n").pop()) }; }
  catch (e) { return { kod: kod(String(e.stderr || e.message)) }; }
}
const ayri = async (ad, p, bekleSn = 0) => { const r = await T.rpcAyri(ad, p, { bekleSn }); return { kod: r.ok ? "tamam" : kod(r.hata), sonuc: r.sonuc }; };

// ---- fikstür ---------------------------------------------------------------------------------------------------------------
const uretimKur = (u) => sql(`set session_replication_role = replica;
  insert into public.uretim (id, siparis_no, urun_id, asama, ek) values ('${u}', '${u}-NO', 'u-yeni', 'Üretimde', '{}');`);
// Eski fiş: 1.744.7 öncesi yoldan yazılmış (istek boş) — tetikleyiciler atlanarak, yalnız test veritabanında
function eskiFis(u, { stok = -2, cari = 40, fissizCari = false } = {}) {
  const f = `${u}-EF`;
  sql(`set session_replication_role = replica;
    insert into public.stk_fis (id, aile, onek, istek, tur, kaynak, uretim_id) values ('${f}', 'stok', 'ÜRT', null, 'Üretim', 'Üretim', '${u}');
    insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, uretim_id, aciklama)
      values ('${u}-h1', '${f}', '${VARYANT}', 'u-yeni', ${stok}, 'Üretim', '${u}', 'eski üretim çıkışı');
    insert into public.car_hareket (id, cari_id, tarih, yon, tutar, fis_id, uretim_id, fis_no)
      values ('${u}-c1', 'c-yeni', '2026-10-01', 'Alacak', ${cari}, ${fissizCari ? "null" : `'${f}'`}, '${u}', '${f}');`);
  return f;
}
// Yeni fiş: uygulamanın bugünkü yolu (fis_kes ÜRT)
function yeniFis(u, { stok = -3, cari = 30 } = {}) {
  const istek = `${u}-i`;
  const r = T.rpc("fis_kes", { istek, fis: { aile: "stok", tur: "Üretim", onek: "ÜRT", kaynak: "Üretim", uretimId: u },
    stok: { satirlar: [{ id: `${istek}-h`, urunId: "u-yeni", renk: "Siyah", miktar: stok, kaynak: "Üretim", uretimId: u }] },
    cari: { satirlar: [{ id: `${istek}-c`, cari_id: "c-yeni", tarih: "2026-11-07", yon: "Alacak", tutar: cari, uretim_id: u, ek: { uretimId: u } }] } });
  assert(r.ok, JSON.stringify(r));
  return r.sonuc.fisNo;
}
// Satış teslimi (uygulamanın 081 yükü). `u` verilirse fiş ve stok satırı üretime bağlanır (üretimden teslim).
function teslimYuk(s, kalemId, adet, ekran, istek, u) {
  const y = T.teslimYuku({ s, kalemId, adet, ekran, istek });
  if (u) { y.fis = { ...y.fis, uretimId: u }; y.stok = { ...y.stok, satirlar: (y.stok.satirlar || []).map((x) => ({ ...x, uretimId: u })) }; }
  return y;
}
const karsilanan = (kid) => sayi(`select coalesce(karsilanan, 0) from public.siparis_kalemleri where id = '${kid}'`);
const teslimEdilen = (kid) => sayi(`select coalesce(-sum(h.miktar), 0) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id
  where h.kalem_id = '${kid}' and not h.iptal and not f.iptal`);

(async () => {
  console.log(`t-uretim-bakiye · ${DB} · önek ${ON} · uretim_sil ${sql("select count(*) from pg_proc where proname = 'uretim_sil'") === "1" ? "KURULU" : "YOK"} · kurallar ${sql("select public.fis_kural_aktif()")}`);
  console.log(`  başlangıç: ${JSON.stringify(bakiye())}`);

  // ---------------------------------------------------------------------------------------------------- 1) bakiye
  const durumlar = [
    ["ESKI", "eski fişli", (u) => { eskiFis(u); }, { stok: 2, cari: 40 }, true],
    ["YENI", "yeni fişli (fis_kes)", (u) => { yeniFis(u); }, { stok: 3, cari: 30 }, true],
    ["KARMA", "eski + yeni fiş aynı üretimde", (u) => { eskiFis(u); yeniFis(u); }, { stok: 5, cari: 70 }, true],
    ["FISSIZ", "eski fişli stok + fişsiz cari", (u) => { eskiFis(u, { fissizCari: true }); }, { stok: 0, cari: 0 }, false],
  ];
  for (const [ad, aciklama, kur, beklenenFark, silinmeli] of durumlar) {
    console.log(`${ad} — ${aciklama}`);
    const u = `${ON}-${ad.toLowerCase()}`;
    const b0 = bakiye(); uretimKur(u); kur(u); const b1 = bakiye();
    const etkisi = fark(b0, b1);
    k(`${ad}.uretim-etkisi-yazildi`, etkisi, { stok: -(ad === "KARMA" ? 5 : ad === "YENI" ? 3 : 2), cari: -(ad === "KARMA" ? 70 : ad === "YENI" ? 30 : 40) });
    const r = sil(u);
    const b2 = bakiye();
    k(`${ad}.sonuc`, r.kod, silinmeli ? "tamam" : "KR010");
    k(`${ad}.stok-cari-farki (silme öncesi → sonrası)`, fark(b1, b2), beklenenFark);
    k(`${ad}.baslangica-gore`, fark(b0, b2), silinmeli ? { stok: 0, cari: 0 } : etkisi);
    k(`${ad}.bagli-kalan (üretim / stok / cari / fiş)`, bagliKalan(u), silinmeli ? { uretim: 0, stokHareket: 0, cariHareket: 0, fisBasligi: 0 }
      : { uretim: 1, stokHareket: 1, cariHareket: 1, fisBasligi: 1 });
    k(`${ad}.iz`, iz(u), silinmeli ? 1 : 0);
    if (silinmeli) {
      // T1 — aynı silme isteği yeniden: hiçbir şey değişmez (çift ters kayıt yok)
      const once = { satir: satirSayisi(u), iptal: iptalSayisi(u), ...bakiye() };
      const r2 = sil(u);
      k(`${ad}.T1.tekrar-zatenYok`, [r2.kod, r2.sonuc && r2.sonuc.zatenYok], ["tamam", true]);
      k(`${ad}.T1.tekrar-hicbir-sey-degismedi`, { satir: satirSayisi(u), iptal: iptalSayisi(u), ...bakiye() }, once);
    }
  }

  // ---------------------------------------------------------------------------------------------------- 2) eşzamanlı
  // Her koşu: yeni sipariş (K: 20 adet), üretim U, U'ya bağlı ilk teslim (2 adet). Sonra ikinci teslim (3 adet) ∥ uretim_sil(U).
  const kosu = async (etiket, { bagli, sira }) => {
    const id = `${ON}-${etiket}`, u = `${id}-u`, kid = `${id}-k`;
    uretimKur(u);
    const s = T.siparisKur(T.sipObj(id, [T.kalemObj(kid, 20, 0)]));
    const b0 = bakiye();
    const r1 = T.rpc("fis_kes", teslimYuk(s, kid, 2, 0, `${id}-t1`, u));
    assert(r1.ok, JSON.stringify(r1));
    const birimTutar = 100;   // kalemObj birimFiyat
    const b1 = bakiye();
    const y2 = teslimYuk(s, kid, 3, 2, `${id}-t2`, bagli ? u : null);
    let a, b;
    if (sira === "teslim-once") {
      const p = ayri("fis_kes", y2, 2); await T.uyu(500); const q = ayri("uretim_sil", { id: u, sebep: "eşzamanlı" }); [a, b] = await Promise.all([p, q]);
    } else if (sira === "silme-once") {
      const q = ayri("uretim_sil", { id: u, sebep: "eşzamanlı" }, 2); await T.uyu(500); const p = ayri("fis_kes", y2); [b, a] = await Promise.all([q, p]);
    } else {
      [a, b] = await Promise.all([ayri("fis_kes", y2), ayri("uretim_sil", { id: u, sebep: "eşzamanlı" })]);
    }
    const b2 = bakiye();
    const teslimTamam = a.kod === "tamam", silTamam = b.kod === "tamam";
    // Beklenen: ilk teslim (2) silinmişse geri alınır; ikinci teslim (3) tamamsa geçerli (bağlıysa ve silme önce bittiyse olamaz)
    const gecerliTeslim = (silTamam ? 0 : 2) + (teslimTamam ? 3 : 0);
    const sonuc = {
      kilitlenme: [a.kod, b.kod].includes("40P01") ? "VAR" : "yok",
      tutarliKalem: karsilanan(kid) === teslimEdilen(kid) ? "evet" : `HAYIR (karşılanan ${karsilanan(kid)}, teslim ${teslimEdilen(kid)})`,
      teslimMiktari: teslimEdilen(kid),
      stokFarki: fark(b0, b2).stok, cariFarki: fark(b0, b2).cari,
      yarim: bagliKalan(u).uretim === 0 && (bagliKalan(u).stokHareket + bagliKalan(u).cariHareket + bagliKalan(u).fisBasligi) > 0 ? "VAR" : "yok",
    };
    const beklenen = { kilitlenme: "yok", tutarliKalem: "evet", teslimMiktari: gecerliTeslim, stokFarki: -gecerliTeslim, cariFarki: gecerliTeslim * birimTutar, yarim: "yok" };
    return { u, kid, s, a: a.kod, b: b.kod, sonuc, beklenen, b1 };
  };

  console.log("E1 — teslim üretime BAĞLI, zorla sıra");
  { const x = await kosu("e1a", { bagli: true, sira: "teslim-once" });
    k("E1a.sonuc (teslim önce ∥ silme)", [x.a, x.b], ["tamam", "KR010"]);
    k("E1a.tutarlilik", x.sonuc, x.beklenen);
    // T3 — reddedilen silme yenileyip tekrar: tamamı (iki teslim fişi iptal, karşılanan 0)
    const b0 = bakiye(); const r = sil(x.u); const d = fark(b0, bakiye());
    k("E1a.T3.tekrar-silme", r.kod, "tamam");
    k("E1a.T3.iki-teslim-geri (stok +5, cari −500, karşılanan 0)", [d.stok, d.cari, karsilanan(x.kid), teslimEdilen(x.kid)], [5, -500, 0, 0]);
    k("E1a.T3.bagli-kalan", bagliKalan(x.u), { uretim: 0, stokHareket: 0, cariHareket: 0, fisBasligi: 0 }); }
  { const x = await kosu("e1b", { bagli: true, sira: "silme-once" });
    k("E1b.sonuc (silme önce ∥ teslim)", [x.b, x.a], ["tamam", "KR010"]);
    k("E1b.tutarlilik", x.sonuc, x.beklenen); }

  console.log("E2 — teslim üretime BAĞSIZ (aynı kalem), zorla sıra");
  for (const [et, sira] of [["e2a", "teslim-once"], ["e2b", "silme-once"]]) {
    const x = await kosu(et, { bagli: false, sira });
    k(`${et.toUpperCase()}.sonuc (${sira})`, [x.a, x.b], ["tamam", "tamam"]);
    k(`${et.toUpperCase()}.tutarlilik`, x.sonuc, x.beklenen);
  }

  console.log("E3 — doğal yarış × 12 (bekleme yok)");
  { const ozet = {}; let bozuk = 0, kilit = 0;
    for (let i = 0; i < 12; i++) {
      const x = await kosu(`e3-${i}`, { bagli: i % 2 === 0, sira: "dogal" });
      const anahtar = `${i % 2 === 0 ? "bağlı" : "bağsız"}: teslim ${x.a} · silme ${x.b}`;
      ozet[anahtar] = (ozet[anahtar] || 0) + 1;
      if (x.sonuc.kilitlenme === "VAR") kilit += 1;
      if (JSON.stringify(x.sonuc) !== JSON.stringify(x.beklenen)) { bozuk += 1; console.log(`    ! ${i}: ${JSON.stringify(x.sonuc)} · beklenen ${JSON.stringify(x.beklenen)}`); }
      // bağlı yarışta ikisi birden tamam olamaz (biri ötekini görmeli)
      if (i % 2 === 0 && x.a === "tamam" && x.b === "tamam") { bozuk += 1; console.log(`    ! ${i}: bağlı yarışta ikisi de tamam`); }
    }
    console.log(`    dağılım: ${JSON.stringify(ozet)}`);
    k("E3.kilitlenme (40P01)", kilit, 0);
    k("E3.tutarsiz-kosu", bozuk, 0); }

  console.log("T2 — aynı anda iki silme isteği");
  { const id = `${ON}-t2`, u = `${id}-u`, kid = `${id}-k`;
    uretimKur(u); const s = T.siparisKur(T.sipObj(id, [T.kalemObj(kid, 20, 0)]));
    assert(T.rpc("fis_kes", teslimYuk(s, kid, 4, 0, `${id}-t1`, u)).ok);
    eskiFis(u);
    const b0 = bakiye();
    const [x, y] = await Promise.all([ayri("uretim_sil", { id: u, sebep: "çift" }, 1), (async () => { await T.uyu(200); return ayri("uretim_sil", { id: u, sebep: "çift" }); })()]);
    const sonuclar = [x, y].map((r) => (r.kod !== "tamam" ? r.kod : r.sonuc && r.sonuc.silindi ? "silindi" : r.sonuc && r.sonuc.zatenYok ? "zatenYok" : "?")).sort();
    k("T2.biri-silindi-oteki-zatenYok", sonuclar, ["silindi", "zatenYok"]);
    const d = fark(b0, bakiye());
    k("T2.bir-kez-geri (stok +6, cari −400+40 = −360, karşılanan 0)", [d.stok, d.cari, karsilanan(kid), teslimEdilen(kid)], [6, -360, 0, 0]);
    k("T2.bagli-kalan", bagliKalan(u), { uretim: 0, stokHareket: 0, cariHareket: 0, fisBasligi: 0 }); }

  console.log("BÜTÜN KOŞU — bu öneke ait yarım kayıt");
  k("TUT.uretimi-olmayan-gecerli-hareket", sayi(`select (select count(*) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id where h.uretim_id like '${ON}-%' and not h.iptal and not f.iptal
      and not exists (select 1 from public.uretim u where u.id = h.uretim_id)) + (select count(*) from public.car_hareket c left join public.stk_fis f on f.id = c.fis_id
      where c.uretim_id like '${ON}-%' and not c.iptal and (c.fis_id is null or not f.iptal) and not exists (select 1 from public.uretim u where u.id = c.uretim_id))`), 0);
  k("TUT.iptal-fiste-gecerli-satir", sayi(`select (select count(*) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id where f.iptal and not h.iptal and f.id in (select id from public.stk_fis where uretim_id like '${ON}-%' or istek like '${ON}-%'))
      + (select count(*) from public.car_hareket c join public.stk_fis f on f.id = c.fis_id where f.iptal and not c.iptal and f.id in (select id from public.stk_fis where uretim_id like '${ON}-%' or istek like '${ON}-%'))`), 0);
  k("TUT.kalem-karsilanan=teslim (bütün kalemler)", sayi(`select count(*) from public.siparis_kalemleri k where k.id like '${ON}-%' and coalesce(k.karsilanan, 0) <>
      coalesce((select -sum(h.miktar) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id where h.kalem_id = k.id and not h.iptal and not f.iptal), 0)`), 0);
  console.log(`  bitiş: ${JSON.stringify(bakiye())}`);
  console.log(`── t-uretim-bakiye.js: ${gecen} geçti, ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
