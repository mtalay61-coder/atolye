// BİRİM TESTİ — SON ALIŞ FİYATLARI (kullanıcı, 12 Eylül: "alış fiyatlarında son alış fiyatlarını
// hatırla; stok kartında listele — kart fiyatı ile gerçekleşen alışlar arasındaki fark için").
const { sonAlisFiyatlari } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};
const cariler = [
  { id: "c1", unvan: "Fatih Ticaret", hareketler: [
    { id: "h1", tarih: "2026-09-01", zaman: "2026-09-01T09:00:00Z", fisNo: "AF-20260901-001", urunAd: "Yapıştırıcı", renk: "T-28", beden: "Standart", miktar: 2, birim: "Adet", birimFiyat: 280, paraBirimi: "TRY" },
    { id: "h2", tarih: "2026-09-05", zaman: "2026-09-05T09:00:00Z", fisNo: "AF-20260905-001", urunAd: "yapıştırıcı", renk: "3100", beden: "Standart", miktar: 1, birim: "Adet", birimFiyat: 300, paraBirimi: "TRY" },
    // Çevrimli: kalem 10 USD, cariye 420 TL yazıldı — fiyat kalemin KENDİ biriminde hatırlanmalı.
    { id: "h3", tarih: "2026-09-07", zaman: "2026-09-07T09:00:00Z", fisNo: "AF-20260907-001", urunAd: "Deri", renk: "Siyah", beden: "", miktar: 5, birim: "metre", birimFiyat: 420, paraBirimi: "TRY", hamBirimFiyat: 10, kalemParaBirimi: "USD", kur: 42 },
    // Satış fişi ve ödeme karışmamalı.
    { id: "h4", tarih: "2026-09-08", fisNo: "SF-20260908-001", urunAd: "Yapıştırıcı", renk: "T-28", miktar: 1, birimFiyat: 999, paraBirimi: "TRY" },
    { id: "h5", tarih: "2026-09-09", fisNo: "ODM-20260909-001", tutar: 5000 },
  ] },
  { id: "c2", unvan: "Diğer", hareketler: [
    { id: "h6", tarih: "2026-09-06", zaman: "2026-09-06T09:00:00Z", fisNo: "AF-20260906-001", urunAd: "Yapıştırıcı", renk: "T-28", beden: "Standart", miktar: 3, birim: "Adet", birimFiyat: 290, paraBirimi: "TRY" },
  ] },
];
console.log("son alış fiyatları");
const hepsi = sonAlisFiyatlari(cariler, "Yapıştırıcı");
bekle("yalnız alış fişleri, en yeni önce, harf duyarsız", hepsi.map((x) => [x.fisNo, x.fiyat, x.cariAd]),
  [["AF-20260906-001", 290, "Diğer"], ["AF-20260905-001", 300, "Fatih Ticaret"], ["AF-20260901-001", 280, "Fatih Ticaret"]]);
bekle("renge göre", sonAlisFiyatlari(cariler, "Yapıştırıcı", { renk: "T-28" }).map((x) => x.fiyat), [290, 280]);
bekle("sınır", sonAlisFiyatlari(cariler, "Yapıştırıcı", { sinir: 1 }).length, 1);
bekle("çevrimli alışta kalemin kendi birimi", sonAlisFiyatlari(cariler, "Deri").map((x) => [x.fiyat, x.paraBirimi]), [[10, "USD"]]);
bekle("bilinmeyen ürün → boş", sonAlisFiyatlari(cariler, "Yok"), []);
bekle("boş ad → boş", sonAlisFiyatlari(cariler, ""), []);
console.log(hata ? "\n\u2500\u2500 SON ALI\u015e TEST\u0130 BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 son al\u0131\u015f testi temiz \u2500\u2500");
process.exit(hata);
