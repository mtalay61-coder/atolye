// BİRİM TESTİ — HAMMADDE DURUM STANDARDI (v1.632.0)
// Kullanıcı: "Sipariş hammadde ihtiyacında stoğu bulunan ürünler, siparişi olan ürünler, olmayan ürünler v.s. renkleri
// değişsin; bu bizim standartlarımız da olsun ve planlamanın mantığının aynısı olsun."
// Ölçülen: hammaddeDurumu → eksik yok = yeterli; eksiğin tamamı yolda = yolda; bir kısmı yolda = kismen; hiç yok = eksik.
// siparisHammaddeIhtiyaci: bu satış siparişi için verilmiş, teslim alınmamış alış siparişi `yolda`ya ve durum'a yansır;
// başka siparişe ayrılmış alış sayılmaz.
const { hammaddeDurumu, siparisHammaddeIhtiyaci } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
bekle("eksik yok → yeterli", hammaddeDurumu(0, 0), "yeterli");
bekle("eksik yok, yolda olsa da → yeterli", hammaddeDurumu(0, 5), "yeterli");
bekle("eksiğin tamamı yolda → yolda", hammaddeDurumu(4, 4), "yolda");
bekle("yolda eksikten fazla → yolda", hammaddeDurumu(4, 10), "yolda");
bekle("bir kısmı yolda → kismen", hammaddeDurumu(4, 1), "kismen");
bekle("hiç sipariş yok → eksik", hammaddeDurumu(4, 0), "eksik");

// Mamul m1 (reçete: Deri 2 birim / çift) — satış 10 çift → 20 gerekli; stok 5 → eksik 15.
const stok = [
  { id: "m1", ad: "Bot", kategori: "Mamul", variants: [{ renk: "Siyah", beden: "40", miktar: 0 }],
    recete: [{ proses: "Kesim", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", hammaddeUrunId: "h1", hammaddeAd: "Deri", renk: "Siyah", beden: "", miktar: 2, birim: "metre" }] },
  { id: "h1", ad: "Deri", kategori: "Hammadde", birim: "metre", variants: [{ renk: "Siyah", beden: "", miktar: 5 }] },
];
const satis = { id: "s1", tip: "Satış", siparisNo: "SAT-1", durum: "Bekliyor", kalemler: [{ id: "k1", urunId: "m1", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 10, karsilanan: 0 }] };
const alis = (id, miktar, siparisId) => ({ id, tip: "Alış", siparisNo: id, durum: "Bekliyor", hammaddeTalebiMi: true,
  kalemler: [{ id: `${id}k`, urunId: "h1", urunAd: "Deri", renk: "Siyah", beden: "", miktar, karsilanan: 0, rezervasyonlar: [{ siparisId, miktar }] }] });
const durumu = (siparisler) => {
  const k = siparisHammaddeIhtiyaci(satis, stok, siparisler, []).kalemler[0];
  return k ? { gereken: k.gereken, eksik: k.eksik, yolda: k.yolda, netEksik: k.netEksik, durum: k.durum } : null;
};
bekle("alış yok → eksik", durumu([satis]), { gereken: 20, eksik: 15, yolda: 0, netEksik: 15, durum: "eksik" });
bekle("10 yolda → kismen", durumu([satis, alis("a1", 10, "s1")]), { gereken: 20, eksik: 15, yolda: 10, netEksik: 5, durum: "kismen" });
bekle("15 yolda → yolda", durumu([satis, alis("a1", 15, "s1")]), { gereken: 20, eksik: 15, yolda: 15, netEksik: 0, durum: "yolda" });
bekle("başka siparişin alışı sayılmaz", durumu([satis, alis("a2", 15, "s9")]), { gereken: 20, eksik: 15, yolda: 0, netEksik: 15, durum: "eksik" });
process.exit(hata);
