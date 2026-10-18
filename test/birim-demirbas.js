// BİRİM TESTİ — DEMİRBAŞ AMORTİSMAN VE ÜRÜN PAYI (v1.705, 273).
const { amortismanAraligi, donemAmortismani, urunDemirbasPayi } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const ay = (y, m) => ({ bas: new Date(y, m, 1), son: new Date(y, m + 1, 0, 23, 59, 59) });
// 24.000 / 24 ay = 1000/ay; Ekim 2026 alım → Ekim'den itibaren
bekle("alım ayında 1 aylık pay", amortismanAraligi(24000, "2026-10-15", 24, ay(2026, 9)), 1000);
bekle("alımdan önceki ay 0", amortismanAraligi(24000, "2026-10-15", 24, ay(2026, 8)), 0);
bekle("24. ay (Eylül 2028) son pay", amortismanAraligi(24000, "2026-10-15", 24, ay(2028, 8)), 1000);
bekle("süre bitince 0", amortismanAraligi(24000, "2026-10-15", 24, ay(2028, 9)), 0);
bekle("yıllık aralık 3 ay (Eki-Ara)", amortismanAraligi(24000, "2026-10-15", 24, { bas: new Date(2026, 0, 1), son: new Date(2026, 11, 31, 23, 59) }), 3000);
const cariler = [{ id: "t", hareketler: [
  { id: "h1", tarih: "2026-10-01", tutar: 12000, paraBirimi: "TRY", defter: "Genel", demirbas: { id: "k1", tur: "Kalıp", ad: "K", amortismanAy: 12 } },
  { id: "h2", tarih: "2026-10-01", tutar: 1000, paraBirimi: "USD", defter: "Genel", demirbas: { id: "m1", tur: "Makine", ad: "M", amortismanAy: 10 } },
  { id: "h3", tarih: "2026-10-01", tutar: 500, paraBirimi: "TRY", defter: "Genel" },
] }];
bekle("dönem amortismanı kart kart (USD kurla)", donemAmortismani(cariler, { USD: 40 }, ay(2026, 9)),
  { toplam: 5000, kartlar: { "Kalıp Amortismanı": 1000, "Makine Amortismanı": 4000 } });
const tanimlar = { kapasite: { makineler: [{ id: "m1", ad: "M", omurAdet: 100000 }], kaliplar: [{ id: "k1", ad: "K", omurAdet: "6000" }, { id: "k2", ad: "K2", urunIdler: ["p"], omurAdet: 10 }] } };
const urun = { id: "p", kapasite: { Kesim: { makineId: "m1", kalipIdler: ["k1"] } } };
// k1: 12000/6000 = 2; m1: 40000/100000 = 0.4; k2: alımı yok → yok
bekle("ürün payı", urunDemirbasPayi(urun, tanimlar, cariler, { USD: 40 }).toplam, 2.4);
bekle("bağsız ürüne pay yok", urunDemirbasPayi({ id: "x" }, tanimlar, cariler, {}).toplam, 0);
console.log(hata ? "── demirbaş testi HATALI ──" : "── demirbaş testi temiz ──");
process.exit(hata);
