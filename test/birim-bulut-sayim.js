// BİRİM TESTİ — BULUT SAYIMI VE ARŞİVDEN GERİ YÜKLEME YARDIMCILARI (v1.712.0, 078-bulut-sayim)
// Ölçülen: cihaz sayımı alt kayıtları toplar; karşılaştırma "aynı / bulutta fazla / cihazda fazla (arşivde N)" der;
// Content-Range'den sayı okunur; arşiv satırları yalnız DELETE, tablo eşleşen, yinelenen kayıtta en yenisi; varyantta
// bileşik anahtar; geri yükleme sırası üst tablo önce.
const { arsivV2Yolu, stokV2AktifAyarla, cariV2AktifAyarla, altV2AktifAyarla, sayimKimlikFarki, cihazSayimlari, sayimKarsilastir, contentRangeSayisi, arsivSatirlariniHazirla, arsivGeriYuklemeSirasi, arsivCakismaSutunlari } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const cihaz = cihazSayimlari({
  stok: [{ id: "u1", variants: [{}, {}], hareketler: [{}, {}, {}] }, { id: "u2", variants: [{}], hareketler: [] }],
  cariler: [{ id: "c1", hareketler: [{}, {}] }],
  siparisler: [{ id: "s1", kalemler: [{}, {}, {}, {}] }],
  uretim: [{ id: "r1", prosesIlerleme: [{ proses: "Kesim", atamalar: [{}, {}] }, { proses: "Saya", atamalar: [{}] }] }],
  stokRezervasyonlari: [{}, {}], onaylar: [{}], cop: [],
});
bekle("cihaz sayımı", cihaz, { urunler: 2, varyantlar: 3, stok_hareketleri: 3, cariler: 1, cari_hareketleri: 2, siparisler: 1, siparis_kalemleri: 4, uretim: 1, uretim_atamalari: 3, stok_rezervasyonlari: 2, onaylar: 1, cop: 0 });
bekle("boş girdi", cihazSayimlari({}).urunler, 0);
const k = sayimKarsilastir(cihaz, { ...cihaz, uretim: 0, stok_hareketleri: 40, cop: null }, { uretim: 1 });
const satir = (t) => k.find((s) => s.tablo === t);
bekle("aynı", satir("urunler").durum, "aynı");
bekle("cihazda fazla + arşivde var → silinmiş olabilir", satir("uretim").durum, "cihazda 1 fazla — bulutta silinmiş olabilir (arşivde 1 silinmiş satır var)");
bekle("bulutta fazla → cihaz bayat", satir("stok_hareketleri").durum, "bulutta 37 fazla — bu cihaz eksik/bayat, sayfayı yenileyin");
bekle("okunamayan", [satir("cop").durum, satir("cop").bulut], ["okunamadı", null]);
bekle("Content-Range 0-0/1234", contentRangeSayisi("0-0/1234"), 1234);
bekle("Content-Range */0", contentRangeSayisi("*/0"), 0);
bekle("Content-Range bozuk", contentRangeSayisi("x"), null);
const arsiv = [
  { tablo: "uretim", islem: "DELETE", veri: { id: "r1", siparis_no: "SAT-2", surum: 5 }, zaman: "2026-10-19T10:00:00Z" },
  { tablo: "uretim", islem: "DELETE", veri: { id: "r1", siparis_no: "SAT-1", surum: 3 }, zaman: "2026-10-18T10:00:00Z" },
  { tablo: "uretim", islem: "GORUNTU", veri: { id: "r9" }, zaman: "2026-10-18T10:00:00Z" },
  { tablo: "uretim_atamalari", islem: "DELETE", veri: { id: "a1" }, zaman: "2026-10-19T10:00:00Z" },
  { tablo: "uretim", islem: "DELETE", veri: { id: "r2" }, zaman: "2026-10-17T10:00:00Z" },
];
bekle("arşiv: yalnız DELETE + tablo, yinelenen kayıtta en yeni", arsivSatirlariniHazirla("uretim", arsiv), [{ id: "r1", siparis_no: "SAT-2", surum: 5 }, { id: "r2" }]);
bekle("varyant anahtarı", arsivCakismaSutunlari("varyantlar"), ["urun_id", "renk", "beden"]);
bekle("üretim anahtarı yok (id)", arsivCakismaSutunlari("uretim"), null);
const v = [
  { tablo: "varyantlar", islem: "DELETE", veri: { urun_id: "u1", renk: "Siyah", beden: "41", miktar: 5 } },
  { tablo: "varyantlar", islem: "DELETE", veri: { urun_id: "u1", renk: "Siyah", beden: "41", miktar: 3 } },
  { tablo: "varyantlar", islem: "DELETE", veri: { urun_id: "u1", renk: "Siyah", beden: "42", miktar: 1 } },
];
bekle("varyant: bileşik anahtarla tekilleşir", arsivSatirlariniHazirla("varyantlar", v).map((x) => `${x.beden}:${x.miktar}`), ["41:5", "42:1"]);
bekle("geri yükleme sırası: üst tablo önce", arsivGeriYuklemeSirasi(["uretim_atamalari", "stok_hareketleri", "uretim", "urunler"]), ["urunler", "uretim", "stok_hareketleri", "uretim_atamalari"]);
// v1.729.1 — üretim listesi verilmediyse "0" değil "bilinmiyor" (Tanımlar'a hiç geçmiyordu → sahte "bulutta 1 fazla").
const bilinmez = cihazSayimlari({ stok: [], cariler: [], siparisler: [] });
bekle("üretim verilmedi → null", [bilinmez.uretim, bilinmez.uretim_atamalari], [null, null]);
const bs = sayimKarsilastir(bilinmez, { uretim: 1 }, {}).find((x) => x.tablo === "uretim");
bekle("üretim verilmedi → durum bilinmiyor, sahte fark yok", [bs.cihaz, bs.durum], [null, "bu cihazın sayısı bu ekranda bilinmiyor"]);
// Hangi kayıt farklı (v1.729.0 — kullanıcı: "Üretim · bu cihaz 0, bulut 1").
const kf = sayimKimlikFarki([{ id: "ur-2", siparisNo: "10040" }], [{ id: "ur-1", siparis_no: "10033" }, { id: "ur-3", siparis_no: "10041" }], "siparis_no",
  { ana: { "ur-1": "sil" } });
bekle("kimlik farkı: bulutta olup cihazda olmayan + bekleyen silme", kf.yalnizBulutta, [{ id: "ur-1", ad: "10033", bekleyen: "sil" }, { id: "ur-3", ad: "10041", bekleyen: null }]);
bekle("kimlik farkı: cihazda olup bulutta olmayan", kf.yalnizCihazda, [{ id: "ur-2", ad: "10040", bekleyen: null }]);
bekle("kimlik farkı: defter yoksa da çalışır", sayimKimlikFarki([], [{ id: 5, ad: "X" }], "ad").yalnizBulutta, [{ id: "5", ad: "X", bekleyen: null }]);
// v1.730.1 — v2 geçişinden sonra arşivden geri yükleme: görünüme / kapalı tabloya doğrudan POST yok.
bekle("v2 kapalı → bugünkü yol", ["varyantlar", "cari_hareketleri", "siparis_kalemleri", "urunler"].map((t) => arsivV2Yolu(t)), [null, null, null, null]);
stokV2AktifAyarla(true); cariV2AktifAyarla(true); altV2AktifAyarla(true);
bekle("stok v2: varyant / hareket geri yüklenemez", [!!arsivV2Yolu("varyantlar").engel, !!arsivV2Yolu("stok_hareketleri").engel], [true, true]);
bekle("cari v2: car_yaz", [arsivV2Yolu("cari_hareketleri").rpc, arsivV2Yolu("cari_hareketleri").p([{ id: "h1" }])], ["car_yaz", { satirlar: [{ id: "h1" }], iptal: [] }]);
bekle("alt v2: alt_yaz", [arsivV2Yolu("uretim_atamalari").rpc, arsivV2Yolu("uretim_atamalari").p([{ id: "a1" }])], ["alt_yaz", { uretim_atamalari: { satirlar: [{ id: "a1" }], sil: [] } }]);
bekle("ana tablolar bugünkü yol", [arsivV2Yolu("urunler"), arsivV2Yolu("uretim")], [null, null]);
stokV2AktifAyarla(false); cariV2AktifAyarla(false); altV2AktifAyarla(false);
if (hata) { console.log("BİRİM TESTİ HATA: bulut sayımı"); process.exit(1); }
console.log("birim-bulut-sayim: tamam");
