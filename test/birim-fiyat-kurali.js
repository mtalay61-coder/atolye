// BİRİM TEST — CARİYE ÖZEL FİYAT, RENK/BEDEN KIRILIMIYLA
//
// Kullanıcı (17 Eylül): "Fiyatlandırmada tekil cari için fiyatın alış satış olduğunu, renk beden
// seçimi de olması gerekir."
//
// Cari kuralı önce "bu cariye hep şu fiyat" demekti. Aynı müşteriye siyahı başka, bejı başka
// fiyata satmak sık (deri maliyeti renge göre değişiyor). Kural artık isteğe bağlı renk/beden
// taşıyor ve EN ÖZELİ kazanıyor: cari+renk+beden → cari+renk → cari+beden → cari.
const { fiyatBul } = require("./erp.cjs");

let hata = 0;
function esit(ad, bulunan, beklenen) {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen);
  if (!ok) { hata = 1; console.log(`  ✗ ${ad}: ${JSON.stringify(bulunan)} ≠ ${JSON.stringify(beklenen)}`); }
  else console.log(`  ✓ ${ad}`);
}

const urun = {
  ad: "Bot", satisFiyati: 900, alisFiyati: 400,
  variants: [{ renk: "Siyah", beden: "40" }, { renk: "Bej", beden: "40" }],
  fiyatKurallari: [
    { id: "k1", kapsam: "cari", deger: "c2", tip: "Satış", fiyat: 1000, renk: null, beden: null },
    { id: "k2", kapsam: "cari", deger: "c2", tip: "Satış", fiyat: 1100, renk: "Siyah", beden: null },
    { id: "k3", kapsam: "cari", deger: "c2", tip: "Satış", fiyat: 1250, renk: "Siyah", beden: "40" },
    { id: "k4", kapsam: "cari", deger: "c2", tip: "Alış", fiyat: 380, renk: null, beden: null },
  ],
};
const cariler = [{ id: "c2", unvan: "Müşteri B", tip: "Müşteri" }];

console.log("fiyat kuralı — cari + renk + beden");
esit("en özel kural kazanır (Siyah/40)", fiyatBul(urun, "Siyah", "40", "c2", "Satış", cariler).fiyat, 1250);
esit("beden tutmazsa renk seviyesi (Siyah/41)", fiyatBul(urun, "Siyah", "41", "c2", "Satış", cariler).fiyat, 1100);
esit("renk tutmazsa cari geneli (Bej/40)", fiyatBul(urun, "Bej", "40", "c2", "Satış", cariler).fiyat, 1000);
esit("alış kuralı satışla karışmaz", fiyatBul(urun, "Siyah", "40", "c2", "Alış", cariler).fiyat, 380);
esit("cari yoksa kart fiyatı", fiyatBul(urun, "Siyah", "40", null, "Satış", cariler).fiyat, 900);
esit("kaynak etiketi kırılımı söyler", fiyatBul(urun, "Siyah", "40", "c2", "Satış", cariler).kaynak, "Cariye özel (Siyah/40)");

// ESKİ KAYITLAR: renk/beden alanı hiç yokken kural cari seviyesinde çalışmaya devam etmeli.
const eskiUrun = { ...urun, fiyatKurallari: [{ id: "e1", kapsam: "cari", deger: "c2", tip: "Satış", fiyat: 950 }] };
esit("eski kayıt (renk/beden alanı yok)", fiyatBul(eskiUrun, "Siyah", "40", "c2", "Satış", cariler).fiyat, 950);

if (hata) { console.log("── fiyat kuralı testi BAŞARISIZ ──"); process.exit(1); }
console.log("── fiyat kuralı testi temiz ──");
