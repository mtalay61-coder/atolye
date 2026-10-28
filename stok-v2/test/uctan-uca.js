#!/usr/bin/env node
// STOK v2 — UÇTAN UCA: uygulamanın gerçek yazma katmanı (test/erp.cjs: 040 + 038 köprüsü) → gerçek sunucu işlemi
// (yerel PostgreSQL'de stk_yaz) → geçiş görünümleri (varyantlar / stok_hareketleri) → uygulamanın okuduğu hâl.
// Her adımda buluttan okunan stok, ekrandaki (bellekteki) stokla aynı olmalı.
// kos.sh çalıştırır (stk_gecis yapılmış taze veritabanında). Supabase'e DOKUNMAZ.
const { execFileSync } = require("child_process");
const path = require("path");
const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";

const psql = (sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB], { input: sql, encoding: "utf8" }).trim();
const jsonSorgu = (sql) => JSON.parse(psql(`select coalesce(json_agg(x), '[]'::json) from (${sql}) x;`) || "[]");

const bellek = {};
global.window = { localStorage: { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } },
  __supabaseYenidenDenemeMs: [] };
let rpcSayisi = 0;
const rpcAdlari = [];
// Sahte ağ: rpc/stk_yaz yerel veritabanında Ali (Yönetici) olarak çalışır; urunler'e yazmalar başarılı sayılır.
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const rpcAdi = (yol.match(/^rpc\/(stk_yaz|car_yaz|fis_yaz)/) || [])[1];
  if (rpcAdi) {
    rpcSayisi++;
    rpcAdlari.push(rpcAdi);
    const p = JSON.parse(sec.body).p;
    const metin = JSON.stringify(p);
    if (metin.includes("$j$")) throw new Error("test: yük $j$ içeriyor");
    try {
      const sonuc = psql(`select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', false);
                          set role authenticated;
                          select public.${rpcAdi}($j$${metin}$j$::jsonb);`).split("\n").pop();
      return { ok: true, status: 200, json: async () => JSON.parse(sonuc), text: async () => sonuc };
    } catch (e) {
      // Sunucu hatası (PostgREST 400 gibi): ağ hatası değil — yeniden denenmez, hata yukarı gider.
      const metin = String(e.stderr || e.message);
      return { ok: false, status: 400, json: async () => ({ message: metin }), text: async () => metin };
    }
  }
  if (/^(varyantlar|stok_hareketleri|cari_hareketleri)/.test(yol)) throw new Error(`test: köprü açıkken REST alt tablo isteği: ${sec.method} ${yol}`);
  return { ok: true, status: 200, json: async () => (sec.method === "PATCH" ? [{ id: "x" }] : []), text: async () => "" };
};
const { supabaseTabloEsitle, tabloBaslangicTam, surumleriYukle, stokV2AktifAyarla, stokV2TanimlarAyarla, cariV2AktifAyarla, yazmaZarfi } = require(path.join(__dirname, "../../test/erp.cjs"));

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\n    çıkan:   ", JSON.stringify(a)); }
};
const derin = (x) => JSON.parse(JSON.stringify(x));
const std = (x) => (x == null || String(x).trim() === "" || String(x).trim() === "Standart" ? "Standart" : String(x));
const yuvarla = (n) => Math.round(Number(n) * 1e6) / 1e6;

// Uygulamanın açılış okumasının (045) stok kısmı — aynı tablolardan, aynı biçimde.
function buluttanOku() {
  const urunler = jsonSorgu("select id, ad, kategori from public.urunler order by id");
  const v = jsonSorgu("select * from public.varyantlar");
  const h = jsonSorgu("select * from public.stok_hareketleri order by tarih desc, id");
  return urunler.map((u) => ({
    ...u,
    variants: v.filter((x) => x.urun_id === u.id).map((x) => ({ renk: x.renk, renkId: x.renk_id || null, beden: x.beden, miktar: yuvarla(x.miktar), minStok: Number(x.min_stok) || 0 })),
    hareketler: h.filter((x) => x.urun_id === u.id).map((x) => {
      const { ek, urun_id, fis_no, siparis_no, cari_id, uretim_id, siparis_id, kalem_id, rezervasyon_siparis_id, fazla_gonderim, ...kalan } = x;
      return { ...(ek || {}), ...kalan, fisNo: fis_no, siparisNo: siparis_no, cariId: cari_id, uretimId: uretim_id, siparisId: siparis_id,
        kalemId: kalem_id, rezervasyonSiparisId: rezervasyon_siparis_id, fazlaGonderim: fazla_gonderim, miktar: Number(x.miktar) };
    }),
  }));
}
const tanimOku = () => JSON.parse(psql("select veri from public.tanimlar where id = 'tekil';"));

// Ekrandaki stok (hareket toplamı, 012 kuralı) ile buluttaki görünümü karşılaştırır: ürün × renk × beden → miktar, ve
// hareket kimlikleri.
function ozet(stok) {
  const m = {};
  stok.forEach((u) => (u.hareketler || []).forEach((h) => {
    const k = `${u.id}|${std(h.renk)}|${std(h.beden)}`;
    m[k] = yuvarla((m[k] || 0) + Number(h.miktar || 0));
  }));
  Object.keys(m).forEach((k) => { if (m[k] === 0) delete m[k]; });
  return Object.keys(m).sort().map((k) => `${k}=${m[k]}`);
}
const hareketIdleri = (stok) => stok.flatMap((u) => (u.hareketler || []).filter((h) => Number(h.miktar) !== 0).map((h) => h.id)).sort();
const bulutOzeti = () => {
  const satirlar = jsonSorgu("select urun_id, renk, beden, miktar from public.varyantlar where miktar <> 0");
  return satirlar.map((r) => `${r.urun_id}|${std(r.renk)}|${std(r.beden)}=${yuvarla(r.miktar)}`).sort();
};
function karsilastir(ad, stok) {
  bekle(`${ad}: stok (ürün × renk × beden) bulutta aynı`, bulutOzeti(), ozet(stok));
  const bulutH = jsonSorgu("select id from public.stok_hareketleri").map((x) => x.id).sort();
  bekle(`${ad}: hareketler bulutta aynı`, bulutH, hareketIdleri(stok));
}
const hrk = (id, renk, beden, miktar, fisNo, ek = {}) => ({ id, renk, beden, miktar, kaynak: "Manuel", tarih: "2026-10-28T09:00:00.000Z", fisNo, ...ek });

(async () => {
  stokV2AktifAyarla(true);
  let tanimlar = tanimOku();
  stokV2TanimlarAyarla(tanimlar);
  let stok = buluttanOku();
  tabloBaslangicTam("urunler", derin(stok));
  surumleriYukle("urunler", stok.map((u) => ({ id: u.id, surum: 1 })));
  // Göçten sonra ekrandaki hâl = hareket toplamı (012). Göç farkı fişi bunu kayıtlı stokla eşitledi.
  karsilastir("0) açılış", stok);

  console.log("1) Fiş: üç ürüne giriş/çıkış (biri eksiye düşer)");
  stok = derin(stok);
  const u = (id) => stok.find((x) => x.id === id);
  u("u-canta").hareketler.unshift(hrk("e1", "1058 - Taba/Siyah", "36", -3, "SAT-E1", { siparisId: "sip-9", kalemId: "k-9" }));
  u("u-kosele").hareketler.unshift(hrk("e2", "Siyah", "Standart", -10, "SAT-E1"));
  u("u-iplik").hareketler.unshift(hrk("e3", "Standart", "Standart", 40, "ALS-E2"));
  await supabaseTabloEsitle("urunler", stok);
  karsilastir("1", stok);
  bekle("1: satış fişi tek fiş, iki satır", psql("select count(*) from public.stk_hareket where fis_id = 'SAT-E1';"), "2");

  console.log("2) Yeniden adlandırma — önce stok yazması, Tanımlar buluta SONRA varıyor (en kötü sıra)");
  rpcSayisi = 0;
  const yeniTanim = derin(tanimlar);
  yeniTanim.renkler.find((r) => r.id === "r-siyah").ad = "Gece Siyahı";
  stokV2TanimlarAyarla(yeniTanim);
  stok = derin(stok);
  stok.forEach((p) => {
    p.variants.forEach((v) => { v.renk = String(v.renk).replace(/Siyah$/, "Gece Siyahı").replace("Taba/Siyah", "Taba/Gece Siyahı"); });
    p.hareketler.forEach((h) => { h.renk = String(h.renk).replace(/^Siyah$/, "Gece Siyahı").replace(/^siyah$/, "Gece Siyahı").replace("Taba/Siyah", "Taba/Gece Siyahı"); });
  });
  await supabaseTabloEsitle("urunler", stok);
  bekle("2: ad değişikliği stok isteği üretmedi", rpcSayisi, 0);
  psql(`update public.tanimlar set veri = $j$${JSON.stringify(yeniTanim)}$j$::jsonb where id = 'tekil';`);
  tanimlar = yeniTanim;
  karsilastir("2", stok);

  console.log("3) Hareket silme (fiş geri al) ve geri yükleme");
  stok = derin(stok);
  const silinen = u("u-iplik").hareketler.find((h) => h.id === "e3");
  u("u-iplik").hareketler = u("u-iplik").hareketler.filter((h) => h.id !== "e3");
  await supabaseTabloEsitle("urunler", stok);
  karsilastir("3 silme", stok);
  bekle("3: satır silinmedi, iptal edildi", psql("select iptal from public.stk_hareket where id = 'e3';"), "t");
  stok = derin(stok);
  u("u-iplik").hareketler.unshift(silinen);
  await supabaseTabloEsitle("urunler", stok);
  karsilastir("3 geri yükleme", stok);

  console.log("4) Kodsuz renk model rengine çevrildi (Kahve → 1058)");
  stok = derin(stok);
  const etiket = "1058 - Taba/Gece Siyahı";
  u("u-canta").variants = u("u-canta").variants.filter((v) => v.renk !== "Kahve");
  if (!u("u-canta").variants.some((v) => v.renk === etiket && v.beden === "37")) u("u-canta").variants.push({ renk: etiket, beden: "37", miktar: 0, minStok: 0 });
  u("u-canta").hareketler.forEach((h) => { if (h.renk === "Kahve") h.renk = etiket; });
  await supabaseTabloEsitle("urunler", stok);
  karsilastir("4", stok);
  bekle("4: Kahve varyantı bulutta yok", psql("select count(*) from public.varyantlar where urun_id = 'u-canta' and renk = 'Kahve';"), "0");

  console.log("5) Yeni renk Tanımlar'a eklenip AYNI ANDA fişe girdi (Tanımlar buluta sonra varır)");
  const tanim5 = derin(tanimlar);
  tanim5.renkler.push({ id: "r-lacivert", ad: "Lacivert" });
  stokV2TanimlarAyarla(tanim5);
  stok = derin(stok);
  u("u-kosele").hareketler.unshift(hrk("e5", "Lacivert", "Standart", 6, "ALS-E5"));
  await supabaseTabloEsitle("urunler", stok);
  bekle("5: Tanımlar varmadan: serbest renkle yazıldı", psql("select r.tur from public.stk_hareket h join public.stk_varyant v on v.id = h.varyant_id join public.stk_renk r on r.id = v.renk_id where h.id = 'e5';"), "serbest");
  psql(`update public.tanimlar set veri = $j$${JSON.stringify(tanim5)}$j$::jsonb where id = 'tekil';`);
  bekle("5: Tanımlar varınca tanımlı renge bağlandı", psql("select v.renk_id from public.stk_hareket h join public.stk_varyant v on v.id = h.varyant_id where h.id = 'e5';"), "r-lacivert");
  karsilastir("5", stok);

  console.log("6) Ürün silindi (hareketleriyle)");
  stok = derin(stok).filter((p) => p.id !== "u-eski");
  await supabaseTabloEsitle("urunler", stok);
  bekle("6: silinen ürünün hareketi iptal (iz kalır)", psql("select bool_and(iptal) from public.stk_hareket where urun_id = 'u-eski';"), "t");
  // Bulut görünümü urunler'e bakmaz: silinen ürünün satırı görünmemeli (iptal).
  bekle("6: görünümde silinen ürün yok", psql("select count(*) from public.stok_hareketleri where urun_id = 'u-eski';"), "0");

  console.log("7) Açılıştan yeniden okuma: ekran = bulut");
  const okunan = buluttanOku().filter((p) => p.id !== "u-eski");
  bekle("7: yeniden okunan stok aynı", ozet(okunan), ozet(stok));
  bekle("7: yeniden okunan hareketler aynı", hareketIdleri(okunan), hareketIdleri(stok));

  console.log("8) Cari v2 + yazma zarfı: satış fişinin stok ve cari satırı TEK fis_yaz");
  cariV2AktifAyarla(true);
  const cariOku = () => jsonSorgu("select id, unvan from public.cariler order by id").map((c) => ({
    ...c, hareketler: jsonSorgu(`select * from public.cari_hareketleri where cari_id = '${c.id}' order by id`).map((h) => {
      const { ek, cari_id, para_birimi, odeme_sekli, fis_no, siparis_no, uretim_id, urun_ad, ...kalan } = h;
      return { ...(ek || {}), ...kalan, paraBirimi: para_birimi, odemeSekli: odeme_sekli, fisNo: fis_no, siparisNo: siparis_no,
        uretimId: uretim_id, urunAd: urun_ad, tutar: Number(h.tutar) };
    }) }));
  let cariler = cariOku();
  tabloBaslangicTam("cariler", derin(cariler));
  surumleriYukle("cariler", cariler.map((c) => ({ id: c.id, surum: 1 })));
  const bakiye = () => Number(psql("select coalesce(sum(case when yon = 'Alacak' then tutar else -tutar end), 0) from public.cari_hareketleri where cari_id = 'c-2';"));
  const b0 = bakiye();
  rpcAdlari.length = 0;
  stok = derin(stok); cariler = derin(cariler);
  u("u-kosele").hareketler.unshift(hrk("e8", "Gece Siyahı", "Standart", -2, "SF-E8"));
  cariler.find((c) => c.id === "c-2").hareketler.unshift({ id: "ce8", tarih: "2026-10-28", zaman: "2026-10-28T12:00:00.000Z", yon: "Alacak", tutar: 480, paraBirimi: "TRY", fisNo: "SF-E8", aciklama: "Satış fişi" });
  let zarf = yazmaZarfi(["urunler", "cariler"]);
  await Promise.all([supabaseTabloEsitle("urunler", stok, { zarf }), supabaseTabloEsitle("cariler", cariler, { zarf })]);
  bekle("8: tek istek, fis_yaz", rpcAdlari, ["fis_yaz"]);
  bekle("8: cari bakiye arttı", bakiye(), b0 + 480);
  bekle("8: cari görünümü uygulamanın yazdığı biçimde", psql("select tarih || '|' || zaman || '|' || fis_no from public.cari_hareketleri where id = 'ce8';"), "2026-10-28|2026-10-28T12:00:00.000Z|SF-E8");
  karsilastir("8", stok);

  console.log("9) Tek işlem: stok tarafı sunucuda düşerse cari de YAZILMAZ, iki söz de reddedilir");
  rpcAdlari.length = 0;
  const s9 = derin(stok); const c9 = derin(cariler);
  // Sunucuda olmayan ürün (urunler'e REST yazması bu testte sahte): stk_yaz "Ürün bulunamadı" der → fis_yaz geri alınır.
  s9.push({ id: "u-yok", ad: "Olmayan", variants: [], hareketler: [hrk("e9", "Standart", "Standart", 1, "ALS-E9")] });
  c9.find((c) => c.id === "c-1").hareketler.unshift({ id: "ce9", tarih: "2026-10-28", yon: "Borç", tutar: 77, paraBirimi: "TRY", fisNo: "ALS-E9" });
  zarf = yazmaZarfi(["urunler", "cariler"]);
  const r9 = await Promise.allSettled([supabaseTabloEsitle("urunler", s9, { zarf }), supabaseTabloEsitle("cariler", c9, { zarf })]);
  bekle("9: iki söz de reddedildi", r9.map((x) => x.status), ["rejected", "rejected"]);
  bekle("9: cari satırı yazılmadı", psql("select count(*) from public.car_hareket where id = 'ce9';"), "0");
  bekle("9: stok satırı yazılmadı", psql("select count(*) from public.stk_hareket where id = 'e9';"), "0");

  console.log("10) Cari hareket silme → iptal (iz kalır), görünümden düşer");
  const c10 = derin(cariler); c10.find((c) => c.id === "c-2").hareketler = c10.find((c) => c.id === "c-2").hareketler.filter((h) => h.id !== "ce8");
  await supabaseTabloEsitle("cariler", c10);
  bekle("10: iptal", psql("select iptal from public.car_hareket where id = 'ce8';"), "t");
  bekle("10: bakiye geri", bakiye(), b0);

  console.log(hata ? "\nUÇTAN UCA BAŞARISIZ" : "\nUÇTAN UCA TAMAM");
  process.exit(hata);
})().catch((e) => { console.error(e); process.exit(1); });
