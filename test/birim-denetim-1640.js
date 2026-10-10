// BİRİM TESTİ — MRP eksik maliyeti kurla (v1.640.0): dövizli alış fiyatı TL sayılmaz; kur yoksa 0 + kurEksik.
const { mrpHesapla } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const stok = [
  { id: "m", ad: "Bot", kategori: "Mamul", variants: [{ renk: "Siyah", beden: "40", miktar: 0 }], recete: [{ hammaddeUrunId: "d", hammaddeAd: "Deri", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", renk: "Siyah", beden: "Standart", miktar: 2, proses: "Kesim" }] },
  { id: "d", ad: "Deri", kategori: "Hammadde", alisFiyati: 10, alisParaBirimi: "$", variants: [{ renk: "Siyah", beden: "Standart", miktar: 0 }] },
];
const siparisler = [{ id: "s", tip: "Satış", durum: "Bekliyor", kalemler: [{ urunId: "m", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 5, karsilanan: 0 }] }];
const kurlu = mrpHesapla(siparisler, stok, [], false, { USD: 40 })[0] || {};
bekle("kur varken eksik maliyet TL (10 desi × 10 $ × 40)", { eksik: kurlu.eksikMiktar, maliyet: kurlu.eksikMaliyet, tl: kurlu.alisFiyatiTL, kendi: kurlu.alisFiyati }, { eksik: 10, maliyet: 4000, tl: 400, kendi: 10 });
const kursuz = mrpHesapla(siparisler, stok, [], false, {})[0] || {};
bekle("kur yokken 0 + kurEksik", { maliyet: kursuz.eksikMaliyet, kurEksik: kursuz.kurEksik }, { maliyet: 0, kurEksik: true });
process.exit(hata);
