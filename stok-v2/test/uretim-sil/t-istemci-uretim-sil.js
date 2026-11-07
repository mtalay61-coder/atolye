#!/usr/bin/env node
// 12 KURULU SUNUCU × 1.744.7 / 1.744.8 İSTEMCİ — ÜRETİM SİLME (7 Kasım, yayın öncesi son kontrol). Yalnız yerel PostgreSQL.
// İstemci: F0_ERP ile seçilen derleme (1.744.7 = main'deki yayın; 1.744.8 = dal). Silme, ekranın "Sil" düğmesinin çağırdığı
// işlevle yapılır: 300-uretim.jsx onRemove → 100-app.jsx onRemoveOrder={uretimSil} → 076 useUretimSil(...)(id, true). Uygulamanın
// REST / RPC istekleri gerçek veritabanına gider (rpc → aynı adlı işlev, üretim DELETE → oturumlu delete, sipariş kalemleri alt_yaz).
// Tarayıcıda tıklanmaz: bu ortamda PostgREST yok; ekran ile veritabanı arasındaki kod yolunun tamamı uygulamanın kendi kodu.
//
// Fikstür (her durum için ayrı): satış siparişi S, kalem K (20 adet; planlama → bu üretim), stoktan teslim 3 adet (karşılanan 3);
// üretim U ve durumuna göre fişleri:
//   YENI   — ÜRT fişi fis_kes ile (stok −3, cari Alacak 30)
//   ESKI   — istek'siz eski fiş (stok −2, cari Alacak 40)
//   KARMA  — YENI + ESKI aynı üretimde
//   FISSIZ — eski fişli stok −2 + fişsiz cari Alacak 40
//   BAYAT  — yalnız yeni fişler (1.744.7'nin bugün yazabildiği tek biçim) ama ikinci ÜRT fişini başka cihaz kesti, ekran görmüyor
// Kahin (istemciden bağımsız): sunucuda ÖNCE / SONRA fotoğraf — üretim var mı · üretimin fişleri (iptal mi) · geçerli bağlı hareket ·
// STOK (stk_stok) · CARİ bakiye · kalem K (karşılanan, planlama) · K'nın geçerli teslimi.
//   İşlem TAMAMLANDIYSA: üretim yok, bütün fişleri iptal, bağlı geçerli hareket 0, STOK / CARİ üretimden öncekine döndü,
//     karşılanan = geçerli teslim (3), ekran sunucuyla aynı.
//   İşlem REDDEDİLDİYSE: SONRA = ÖNCE (hiçbir kayıtta kısmi değişiklik yok), ekran değişmedi.
//   İkisinin ARASI (işlem bitmedi ama sunucuda bir şey değişti) = KISMİ → kırmızı.
const assert = require("assert/strict");
const path = require("path");
assert(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST), "Yalnız yerel PostgreSQL");
const T = require("../f0/ortak");
const { psql, E, ON } = T;
const ERP = process.env.F0_ERP || path.join(__dirname, "../../../test/erp.cjs");
const React = require(require.resolve("react", { paths: [path.dirname(ERP)] }));
const { renderToString } = require(require.resolve("react-dom/server", { paths: [path.dirname(ERP)] }));
const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";
const ETIKET = process.env.ISTEMCI_ETIKET || "?";
const KIM = `select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true); set local role authenticated;`;

let gecen = 0, kalan = 0;
const k = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); };
const sql = (s) => psql(s);
const sayi = (s) => Number(sql(s));
const kim = (s) => { try { psql(`\\set VERBOSITY verbose\nbegin; ${KIM} ${s}; commit;`); return "tamam"; }
  catch (e) { return (String(e.stderr || e.message).match(/ERROR:\s+([0-9A-Z]{5})/) || [])[1] || "hata"; } };
const VARYANT = sql("select varyant_id from public.stk_stok where urun_id = 'u-yeni' and renk_ad = 'Siyah' limit 1");

// ---- sunucu fotoğrafı ------------------------------------------------------------------------------------------------------
const STOK = () => sayi("select coalesce(sum(miktar), 0) from public.stk_stok where urun_id = 'u-yeni'");
const CARI = () => sayi(`select coalesce(sum(case when c.yon = 'Borç' then c.tutar else -c.tutar end), 0) from public.car_hareket c
  left join public.stk_fis f on f.id = c.fis_id where c.cari_id = 'c-yeni' and not c.iptal and (c.fis_id is null or not f.iptal)`);
function foto(u, kid) {
  return {
    uretim: sayi(`select count(*) from public.uretim where id = '${u}'`),
    fisler: sql(`select coalesce(string_agg(id || ':' || case when iptal then 'iptal' else 'gecerli' end, ',' order by id), '') from public.stk_fis where uretim_id = '${u}'`),
    bagliGecerli: sayi(`select (select count(*) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id where h.uretim_id = '${u}' and not h.iptal and not f.iptal)
      + (select count(*) from public.car_hareket c left join public.stk_fis f on f.id = c.fis_id where c.uretim_id = '${u}' and not c.iptal and (c.fis_id is null or not f.iptal))`),
    stok: STOK(), cari: CARI(),
    karsilanan: sayi(`select coalesce(karsilanan, 0) from public.siparis_kalemleri where id = '${kid}'`),
    planlama: sql(`select coalesce(planlama::text, 'null') from public.siparis_kalemleri where id = '${kid}'`),
    teslim: sayi(`select coalesce(-sum(h.miktar), 0) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id where h.kalem_id = '${kid}' and not h.iptal and not f.iptal`),
  };
}

// ---- fikstür ---------------------------------------------------------------------------------------------------------------
function eskiFis(u, fissizCari) {
  const f = `${u}-EF`;
  sql(`set session_replication_role = replica;
    insert into public.stk_fis (id, aile, onek, istek, tur, kaynak, uretim_id) values ('${f}', 'stok', 'ÜRT', null, 'Üretim', 'Üretim', '${u}');
    insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, uretim_id, aciklama)
      values ('${u}-h1', '${f}', '${VARYANT}', 'u-yeni', -2, 'Üretim', '${u}', 'eski üretim çıkışı');
    insert into public.car_hareket (id, cari_id, tarih, yon, tutar, fis_id, uretim_id, fis_no)
      values ('${u}-c1', 'c-yeni', '2026-10-01', 'Alacak', 40, ${fissizCari ? "null" : `'${f}'`}, '${u}', '${f}');`);
  return [{ tur: "stok", id: `${u}-h1`, miktar: -2, fis: f }, { tur: "cari", id: `${u}-c1`, tutar: 40, fis: fissizCari ? null : f }];
}
function yeniFis(u, ek = "-i") {
  const istek = `${u}${ek}`;
  const r = T.rpc("fis_kes", { istek, fis: { aile: "stok", tur: "Üretim", onek: "ÜRT", kaynak: "Üretim", uretimId: u },
    stok: { satirlar: [{ id: `${istek}-h`, urunId: "u-yeni", renk: "Siyah", miktar: -3, kaynak: "Üretim", uretimId: u }] },
    cari: { satirlar: [{ id: `${istek}-c`, cari_id: "c-yeni", tarih: "2026-11-07", yon: "Alacak", tutar: 30, uretim_id: u, ek: { uretimId: u } }] } });
  assert(r.ok, JSON.stringify(r));
  const no = r.sonuc.fisNo;
  return [{ tur: "stok", id: `${istek}-h`, miktar: -3, fis: no, sunucu: true }, { tur: "cari", id: `${istek}-c`, tutar: 30, fis: no, sunucu: true }];
}
function kur(ad) {
  const u = `${ON}-${ad}`, sid = `${u}-s`, kid = `${u}-k`;
  // satış siparişi + stoktan teslim (üretime bağsız) — karşılanan 3
  const planlama = { tip: "Üretim", referansNo: `${u}-NO` };
  const s = T.siparisKur(T.sipObj(sid, [T.kalemObj(kid, 20, 0, { planlama })]));
  const t = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: kid, adet: 3, ekran: 0, istek: `${u}-tes` }));
  assert(t.ok, JSON.stringify(t));
  // planlama teslimden SONRA (teslim yükü kalemi tam satırıyla yazar)
  sql(`update public.siparis_kalemleri set planlama = '${JSON.stringify(planlama)}'::jsonb where id = '${kid}'`);
  const oncesi = { stok: STOK(), cari: CARI() };   // üretimden ÖNCE
  sql(`set session_replication_role = replica;
    insert into public.uretim (id, siparis_no, urun_id, asama, ek) values ('${u}', '${u}-NO', 'u-yeni', 'Üretimde', '{}');`);
  let satirlar = [];
  if (ad === "yeni" || ad === "karma") satirlar = satirlar.concat(yeniFis(u));
  if (ad === "eski" || ad === "karma") satirlar = satirlar.concat(eskiFis(u, false));
  if (ad === "fissiz") satirlar = satirlar.concat(eskiFis(u, true));
  // BAYAT EKRAN — yalnız yeni fişler (1.744.7'nin bugün yazabildiği tek biçim); ikinci ÜRT fişini başka cihaz az önce kesti,
  // bu ekran görmüyor
  if (ad === "bayat") { satirlar = satirlar.concat(yeniFis(u)); yeniFis(u, "-i2"); }
  const sipEkran = { ...s, durum: "Kısmi Teslim", kalemler: s.kalemler.map((x) => ({ ...x, karsilanan: 3, planlama })) };
  return { u, kid, satirlar, oncesi, sipEkran };
}

// ---- ekran (uygulamanın elindeki veri) + 076 useUretimSil -------------------------------------------------------------------
function ekran(u, satirlar, sipEkran) {
  const stokH = satirlar.filter((s) => s.tur === "stok").map((s) => ({ id: s.id, tarih: "2026-10-01", renk: "Siyah", beden: "", miktar: s.miktar,
    kaynak: "Üretim", uretimId: u, fisNo: s.fis, ...(s.sunucu ? { uretimFisAdi: `${u}-NO-Kesim` } : {}) }));
  const cariH = satirlar.filter((s) => s.tur === "cari").map((s) => ({ id: s.id, tarih: "2026-10-01", yon: "Alacak", tutar: s.tutar,
    uretimId: u, siparisNo: `${u}-NO`, fisNo: s.fis, ...(s.sunucu ? { uretimFisAdi: `${u}-NO-Kesim` } : {}) }));
  return {
    uretim: [{ id: u, siparisNo: `${u}-NO`, urunId: "u-yeni", urunAd: "Yeni Ürün", stogaEklendiMi: false,
      prosesIlerleme: [{ proses: "Kesim", tamamlandiMi: true, atamalar: [{ id: `${u}-a1`, tamamlandiMi: true, fisNo: satirlar[0].fis }] }] }],
    stok: [{ id: "u-yeni", ad: "Yeni Ürün", kategori: "Mamul", variants: [{ renk: "Siyah", beden: "", miktar: 10 }], hareketler: stokH }],
    cariler: [{ id: "c-yeni", unvan: "Yeni Cari", hareketler: cariH }],
    siparisler: [sipEkran],
  };
}
async function ekrandanSil(u, e) {
  E.tabloBaslangicTam("urunler", JSON.parse(JSON.stringify(e.stok)));
  E.tabloBaslangicTam("cariler", JSON.parse(JSON.stringify(e.cariler)));
  E.tabloBaslangicTam("uretim", JSON.parse(JSON.stringify(e.uretim)));
  E.tabloBaslangicTam("siparisler", JSON.parse(JSON.stringify(e.siparisler)));
  const kayit = { uretim: e.uretim, stok: e.stok, cariler: e.cariler, siparisler: e.siparisler, toast: [], cop: 0 };
  const set = (a) => (v) => { kayit[a] = typeof v === "function" ? v(kayit[a]) : v; };
  // 100-app adimlariYurut ile aynı sözleşme
  const adimlariYurut = async (adimlar) => { const yapilan = []; for (const a of adimlar) { a.yerelUygula(); const s = await a.yaz();
    if (!s || s.ok === false) return { ok: false, yapilan, kalan: a.ad, hata: (s && s.hata) || "?" }; yapilan.push(a.ad); } return { ok: true, yapilan }; };
  let sil = null;
  function Ekran() { sil = E.useUretimSil({ uretim: e.uretim, siparisler: e.siparisler, stok: e.stok, cariler: e.cariler, showToast: (m) => kayit.toast.push(m),
    adimlariYurut, setUretim: set("uretim"), setSiparisler: set("siparisler"), setStok: set("stok"), setCariler: set("cariler"),
    copaAt: () => { kayit.cop += 1; }, stokRezervasyonlari: [], setStokRezervasyonlari: () => {}, aktifKullanici: { ad: "Ali", rol: "Yönetici" }, fisDefteriniDonustur: null }); return null; }
  renderToString(React.createElement(Ekran));
  const r = await sil(u, true);
  await T.uyu(200);
  return { tamam: !!(r && r.ok), ekranUretim: kayit.uretim.some((x) => x.id === u) ? 1 : 0,
    ekranHareket: kayit.stok[0].hareketler.filter((h) => h.uretimId === u).length + kayit.cariler[0].hareketler.filter((h) => h.uretimId === u).length,
    mesaj: (kayit.toast.slice(-1)[0] || "").replace(/\s+/g, " ").slice(0, 150) };
}

// ---- ağ: üretim DELETE gerçek veritabanına (oturumlu); diğerleri f0/ortak'ın fetch'i (rpc gerçek, sipariş başlığı durum) -----
const ortakFetch = global.fetch;
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const m = yol.match(/^uretim\?id=in\.\(([^)]*)\)/);
  if (sec.method === "DELETE" && m) {
    const idler = decodeURIComponent(m[1]).split(",").map((x) => x.replace(/^"|"$/g, ""));
    const kod = kim(`delete from public.uretim where id in (${idler.map((i) => `'${i}'`).join(",")})`);
    if (kod === "tamam") return { ok: true, status: 204, json: async () => [], text: async () => "" };
    const g = JSON.stringify({ code: kod, message: `üretim silinemedi (${kod})` });
    return { ok: false, status: 400, json: async () => JSON.parse(g), text: async () => g };
  }
  if (/^uretim\b/.test(yol) && sec.method && sec.method !== "GET") return { ok: true, status: 201, json: async () => [], text: async () => "" };
  return ortakFetch(url, sec);
};

(async () => {
  console.log(`t-istemci-uretim-sil · istemci ${ETIKET} (${path.relative(process.cwd(), ERP)}) · ${DB} · uretim_sil ${sql("select count(*) from pg_proc where proname = 'uretim_sil'") === "1" ? "KURULU" : "YOK"} · kurallar ${sql("select public.fis_kural_aktif()")}`);
  const ozet = [];
  for (const ad of ["yeni", "eski", "karma", "fissiz", "bayat"]) {
    const { u, kid, satirlar, oncesi, sipEkran } = kur(ad);
    const once = foto(u, kid);
    const a = await ekrandanSil(u, ekran(u, satirlar, sipEkran));
    const sonra = foto(u, kid);
    const sonuc = a.tamam && sonra.uretim === 0 ? "TAMAMLANDI" : !a.tamam && JSON.stringify(sonra) === JSON.stringify(once) ? "REDDEDİLDİ (değişiklik yok)" : "KISMİ";
    console.log(`${ad.toUpperCase()} — istemci: ${a.tamam ? "tamam" : "olmadı"} · ${sonuc} · mesaj: ${a.mesaj}`);
    if (sonuc === "KISMİ") console.log(`    önce  ${JSON.stringify(once)}\n    sonra ${JSON.stringify(sonra)}`);
    k(`${ad}.kismi-degisiklik-yok`, sonuc === "KISMİ" ? "KISMİ" : "yok", "yok");
    if (sonuc === "TAMAMLANDI") {
      k(`${ad}.tutarli (fişler iptal, bağlı hareket 0, stok/cari üretim öncesi, karşılanan = teslim)`,
        { fisler: sonra.fisler.split(",").every((x) => /:iptal$/.test(x)), bagliGecerli: sonra.bagliGecerli, stok: sonra.stok, cari: sonra.cari, karsilanan: sonra.karsilanan },
        { fisler: true, bagliGecerli: 0, stok: oncesi.stok, cari: oncesi.cari, karsilanan: sonra.teslim });
      k(`${ad}.ekran-sunucuyla-ayni`, [a.ekranUretim, a.ekranHareket], [0, 0]);
    } else if (sonuc.startsWith("REDDEDİLDİ")) {
      k(`${ad}.ekran-degismedi`, [a.ekranUretim, a.ekranHareket], [1, satirlar.length]);
    }
    ozet.push(`${ad}: ${sonuc}`);
  }
  console.log(`  özet (${ETIKET}): ${ozet.join(" · ")}`);
  console.log(`── t-istemci-uretim-sil (${ETIKET}): ${gecen} geçti, ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
