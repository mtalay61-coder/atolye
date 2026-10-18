// BİRİM TESTİ — KAPASİTE (v1.703, 273).
const { prosesKapasitesi, isYukuHesapla, elemanGunlukSaat } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const tanimlar = { kapasite: {
  makineler: [{ id: "m1", ad: "Kesim", adet: 2, gunlukSaat: 9 }, { id: "m2", ad: "Dikiş", adet: 1, gunlukSaat: 8, saatlikAdet: 10 }],
  kaliplar: [{ id: "k1", makineId: "m1", bedenSaatlik: { "37": 40, "38": 30 } }, { id: "b1", makineId: "m1", bedenSaatlik: { "37": 60, "38": 20 } }],
} };
const urun = { kapasite: { Kesim: { makineId: "m1", kalipIdler: ["k1", "b1"] }, Saya: { makineId: "m2" } } };
// 37: kalıp 40, bıçak 60 → darboğaz 40 × 2 makine = 80/saat × 9 saat = 720
bekle("kalıp+bıçak darboğaz × makine adedi", [prosesKapasitesi(tanimlar, urun, "Kesim", "37").saatlik, prosesKapasitesi(tanimlar, urun, "Kesim", "37").gunluk], [80, 720]);
bekle("bıçak 38'de daha yavaş", prosesKapasitesi(tanimlar, urun, "Kesim", "38").saatlik, 40);
bekle("kalıpta olmayan beden eksik", !!prosesKapasitesi(tanimlar, urun, "Kesim", "40").eksik, true);
bekle("kalıpsız makine kendi hızı", prosesKapasitesi(tanimlar, urun, "Saya", "40").gunluk, 80);
bekle("bağsız proses eksik", prosesKapasitesi(tanimlar, urun, "Kalfa", "37").eksik, "makine bağlı değil");
// 160 adet 37 → 2 saat; 80 adet 38 → 2 saat; toplam 4 saat / 9 = 0.44 gün
bekle("iş yükü", isYukuHesapla(tanimlar, urun, "Kesim", { "37": 160, "38": 80, "40": 0 }), { saat: 4, gun: 0.44, eksik: [] });
bekle("eleman günlük saat (mola düşer)", elemanGunlukSaat({ baslangic: "08:00", bitis: "18:00", molaDk: 60 }), 9);
bekle("gece vardiyası", elemanGunlukSaat({ baslangic: "22:00", bitis: "06:00" }), 8);
console.log(hata ? "── kapasite testi HATALI ──" : "── kapasite testi temiz ──");
process.exit(hata);
