// BİRİM TESTİ — SİPARİŞİN ÖDEMELERİ (v1.612.0)
// Kullanıcı: "Siparişte ödeme girişi de olsun." Sipariş kartı "Tahsilat Gir / Ödeme Gir" ile cari kartını dolu açar;
// kaydedilen hareket `siparisId` taşır. Ölçülen: satışta yalnız Tahsilat sayılır (Ödeme/Satış sayılmaz), alışta yalnız
// Ödeme; başka siparişin hareketi sayılmaz; para birimine göre ayrı toplanır; "kalan" siparişin biriminden düşer,
// fazla ödemede sıfırda durur; carisiz/hareketsiz çağrı boş döner.
const { siparisOdemeOzeti } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const satis = { id: "s1", tip: "Satış", siparisNo: "SAT-1" };
const alis = { id: "a1", tip: "Alış", siparisNo: "AS-1" };
const cari = { id: "c1", hareketler: [
  { id: "h1", siparisId: "s1", islemTipi: "Tahsilat", tutar: 1000, paraBirimi: "USD" },
  { id: "h2", siparisId: "s1", islemTipi: "Tahsilat", tutar: 500, paraBirimi: "USD" },
  { id: "h3", siparisId: "s1", islemTipi: "Tahsilat", tutar: 20000, paraBirimi: "TRY" },
  { id: "h4", siparisId: "s1", islemTipi: "Satış", tutar: 2560, paraBirimi: "USD" },
  { id: "h5", siparisId: "s1", islemTipi: "Ödeme", tutar: 100, paraBirimi: "USD" },
  { id: "h6", siparisId: "s2", islemTipi: "Tahsilat", tutar: 999, paraBirimi: "USD" },
  { id: "h7", siparisId: "a1", islemTipi: "Ödeme", tutar: 300, paraBirimi: "USD" },
  // Cari kartı hunisi `islemTipi` yazmaz; tip fiş ön ekinden (THS-) okunur.
  { id: "h8", siparisId: "s1", fisNo: "THS-1008001", tutar: 60, paraBirimi: "USD" },
] };
const o1 = siparisOdemeOzeti(satis, cari, 2560, "USD");
bekle("satışta yalnız Tahsilat (alan ya da THS- ön eki); birime göre ayrı; kalan siparişin biriminden", [o1.odemeler.map((h) => h.id), o1.toplamlar, o1.odenen, o1.kalan, o1.beklenenTip],
  [["h1", "h2", "h3", "h8"], { USD: 1560, TRY: 20000 }, 1560, 1000, "Tahsilat"]);
const o2 = siparisOdemeOzeti(alis, cari, 250, "USD");
bekle("alışta yalnız Ödeme; fazla ödemede kalan 0", [o2.odemeler.map((h) => h.id), o2.odenen, o2.kalan, o2.beklenenTip], [["h7"], 300, 0, "Ödeme"]);
const o3 = siparisOdemeOzeti(satis, cari, 2560, "EUR");
bekle("siparişin biriminde ödeme yoksa ödenen 0, kalan tam", [o3.odenen, o3.kalan], [0, 2560]);
const o4 = siparisOdemeOzeti(satis, null, 100, "USD");
bekle("carisiz çağrı boş", [o4.odemeler, o4.toplamlar, o4.odenen, o4.kalan], [[], {}, 0, 100]);
const o5 = siparisOdemeOzeti(satis, { id: "c1", hareketler: [{ id: "h8", siparisId: "s1", islemTipi: "Tahsilat", tutar: 10.555, paraBirimi: "USD" }] }, 20.005, "USD");
bekle("kalan kuruşa yuvarlanır", o5.kalan, 9.45);
process.exit(hata);
