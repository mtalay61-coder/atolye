// BİRİM TESTİ — KASA SATIRI AÇIKLAMASI SADELEŞTİRME (v1.532.0).
// Kullanıcı: "Kasa işlemlerinde cari adı ve tahsilat yazıyor, alt satıra inen açıklamaya gerek yok."
const { kasaAciklamaSade } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
bekle("otomatik tahsilat açıklaması tamamen düşer", kasaAciklamaSade("Tahsilat · New Diamond · Tahsilat (TL Kasa)", "New Diamond", "Tahsilat"), "");
bekle("otomatik ödeme açıklaması tamamen düşer", kasaAciklamaSade("Ödeme · Fatih Ticaret · Ödeme (TL Kasa)", "Fatih Ticaret", "Ödeme"), "");
bekle("elle yazılan not kalır", kasaAciklamaSade("Tahsilat · New Diamond · Eylül taksidi", "New Diamond", "Tahsilat"), "Eylül taksidi");
bekle("carisiz serbest açıklama aynen", kasaAciklamaSade("Kira ödemesi", "", null), "Kira ödemesi");
bekle("kur bilgisi kalır", kasaAciklamaSade("Tahsilat · ABC · 100 $ (1 USD = 49 TRY kuruyla)", "ABC", "Tahsilat"), "100 $ (1 USD = 49 TRY kuruyla)");
bekle("boş → boş", kasaAciklamaSade("", "X", "Tahsilat"), "");
console.log(hata ? "\n── KASA AÇIKLAMA TESTİ BAŞARISIZ ──" : "\n── kasa açıklama testi temiz ──");
process.exit(hata);
