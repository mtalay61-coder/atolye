// BİRİM TESTİ — KÂR/ZARAR SATIŞ GELİRİ (27 Eylül, v1.498.0)
//
// Hata: rapor geliri stok hareketinin `birimFiyat`ından okuyordu, `fisYaz` fiyatı yalnız cari ayağına
// yazıyor → gerçek veride satış geliri 0. Test tohumu stok hareketine fiyat koyduğu için yakalanmamıştı;
// bu test GERÇEK `fisYaz` çıktısıyla kuruyor.
// İddialar:
//   • Gelir, stok hareketiyle aynı kimliği taşıyan cari hareketinden: KDV'siz fişte tutar.
//   • KDV'li fişte gelir MATRAH (KDV gelir değil), maliyet değişmez.
//   • Döviz satır: cariye çevrilmiş tutar (TL) gelir olur.
//   • Cari ayağı yoksa stoktaki fiyat; o da yoksa 0 ve `fiyatsizSatir` sayılır.
const { fisYaz, karZararHesapla, iscilikDefteri, fisinDefteri } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const bugun = new Date().toISOString();
const fis = (fisNo, kalemler) => ({
  fisNo, tip: "Satış", cariId: "c", kaynak: "Satış", stokTarihi: bugun, cariTarihi: bugun.slice(0, 10),
  kayitParaBirimi: "TRY", kurlar: { USD: 40 }, kurZorunlu: true, tutarYuvarla: true, birimFiyatBolerek: false,
  yon: "Borç", defter: "Genel", odemeSekli: "Nakit", vade: "", siparis: null, kalemler,
});
const stok0 = [{ id: "m", ad: "Bot", alisFiyati: 60, variants: [{ renk: "Siyah", beden: "40", miktar: 10 }], hareketler: [] }];
const cariler0 = [{ id: "c", unvan: "Müşteri", hareketler: [] }];
const k = { urunId: "m", urunAd: "Bot", renk: "Siyah", beden: "40", birim: "çift", miktar: 2, birimFiyat: 100, paraBirimi: "TRY" };
const rapor = (r) => {
  const s = karZararHesapla({ stok: r.stok, cariler: r.cariler, muhasebe: { kurlar: { USD: 40 } }, giderKartlari: [], donem: "tumu" });
  return { gelir: s.satisGeliri, smm: s.smm, brut: s.brutKar, fiyatsiz: s.fiyatsizSatir };
};

console.log("Gerçek fiş yazımından");
const r1 = fisYaz(JSON.parse(JSON.stringify(stok0)), JSON.parse(JSON.stringify(cariler0)), fis("SF-1", [k]));
bekle("stok hareketinde fiyat yok (hatanın kökü)", r1.stok[0].hareketler[0].birimFiyat, undefined);
bekle("KDV'siz: gelir = tutar", rapor(r1), { gelir: 200, smm: 120, brut: 80, fiyatsiz: 0 });
const r2 = fisYaz(JSON.parse(JSON.stringify(stok0)), JSON.parse(JSON.stringify(cariler0)), fis("SF-2", [{ ...k, kdvOrani: 20 }]));
bekle("KDV'li: gelir = matrah (cari tutarı 240)", [r2.cariHareketleri[0].tutar, rapor(r2)], [240, { gelir: 200, smm: 120, brut: 80, fiyatsiz: 0 }]);
const r3 = fisYaz(JSON.parse(JSON.stringify(stok0)), JSON.parse(JSON.stringify(cariler0)), fis("SF-3", [{ ...k, birimFiyat: 5, paraBirimi: "USD" }]));
bekle("USD satır: cariye çevrilmiş TL", rapor(r3).gelir, 400);

console.log("Cari ayağı yoksa");
const eski = [{ ...stok0[0], hareketler: [
  { id: "x1", tarih: bugun, renk: "Siyah", beden: "40", miktar: -1, kaynak: "Satış", birimFiyat: 90, paraBirimi: "TRY" },
  { id: "x2", tarih: bugun, renk: "Siyah", beden: "40", miktar: -1, kaynak: "Satış" },
] }];
bekle("stoktaki fiyat, yoksa 0 + sayılır", rapor({ stok: eski, cariler: cariler0 }), { gelir: 90, smm: 120, brut: -30, fiyatsiz: 1 });

console.log("Eksik kur uyarısı (v1.538.0)");
// EUR işçilik (cari hareketi) var, kurlarda EUR yok → tutar TL sayılır ve `kurEksik` EUR'u söyler.
const iscilikCari = [{ id: "p", unvan: "Usta", tip: "Personel", hareketler: [
  { id: "i1", tarih: bugun.slice(0, 10), yon: "Alacak", tutar: 10, paraBirimi: "EUR", islemTipi: "İşçilik", fisNo: "1-Kesim-İşçilik" }] }];
const kzEksik = karZararHesapla({ stok: [], cariler: iscilikCari, muhasebe: { kurlar: { USD: 40 } }, giderKartlari: [], donem: "tumu" });
bekle("kuru olmayan para birimi raporlanır", kzEksik.kurEksik, ["EUR"]);
const kzTam = karZararHesapla({ stok: [], cariler: iscilikCari, muhasebe: { kurlar: { USD: 40, EUR: 50 } }, giderKartlari: [], donem: "tumu" });
bekle("kur varsa uyarı yok, tutar çevrilir", [kzTam.kurEksik, kzTam.uretimIscilik], [[], 500]);

console.log("Defter seçimi (v1.543.0)");
{
  // Genel satış (SF-1), Resmi satış, Muhasebe gideri, Resmi işçilik.
  const rR = fisYaz(JSON.parse(JSON.stringify(r1.stok)), JSON.parse(JSON.stringify(r1.cariler)), { ...fis("SF-R", [{ ...k, miktar: 1, birimFiyat: 300 }]), defter: "Resmi" });
  const cariler = [...rR.cariler, { id: "p", unvan: "Usta", tip: "Personel", hareketler: [
    { id: "i2", tarih: bugun.slice(0, 10), yon: "Alacak", tutar: 30, paraBirimi: "TRY", islemTipi: "İşçilik", fisNo: "2-Kesim-İşçilik", defter: "Resmi" }] }];
  const muhasebe = { kurlar: { USD: 40 }, kasalar: [{ id: "k", paraBirimi: "TRY", hareketler: [
    { id: "g1", tarih: bugun.slice(0, 10), yon: "Çıkış", tutar: 50, giderKartId: "kira", defter: "Muhasebe" },
    { id: "g2", tarih: bugun.slice(0, 10), yon: "Çıkış", tutar: 7, giderKartId: "kira", defter: "Genel" }] }], bankalar: [] };
  const kz = (defter) => {
    const x = karZararHesapla({ stok: rR.stok, cariler, muhasebe, giderKartlari: [{ id: "kira", ad: "Kira", grup: "yonetim" }], donem: "tumu", defter });
    return [x.satisGeliri, x.uretimIscilik, x.giderToplam];
  };
  bekle("Tümü: hepsi", kz("Tümü"), [500, 30, 57]);
  bekle("Genel: Genel satış + Muhasebe/Genel gider, Resmi işçilik yok", kz("Genel"), [200, 0, 57]);
  bekle("Resmi: Resmi satış + işçilik + Muhasebe gideri", kz("Resmi"), [300, 30, 50]);
}
bekle("işçilik defteri ayarı: yoksa Genel, geçersizse Genel", [iscilikDefteri(null), iscilikDefteri({ iscilikDefteri: "Resmi" }), iscilikDefteri({ iscilikDefteri: "x" })], ["Genel", "Resmi", "Genel"]);
bekle("fişin defteri: cari ayağından; yoksa null; Muhasebe öncelikli", [
  fisinDefteri({ hareketler: [{ kaynakTip: "stok" }] }),
  fisinDefteri({ hareketler: [{ kaynakTip: "cari", defter: "Resmi" }] }),
  fisinDefteri({ hareketler: [{ kaynakTip: "cari" }, { kaynakTip: "cari", defter: "Muhasebe" }] }),
], [null, "Resmi", "Muhasebe"]);

process.exit(hata);
