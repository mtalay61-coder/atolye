// BİRİM TESTİ — DEĞİŞİKLİK SAYACI FARKI (v1.611.0)
// Kullanıcı: "Başka kullanıcıların yaptığı işlemler geç düşüyor, anında nasıl görebiliriz?"
// Ölçülen: sayacı artan tablo alanına düşer (kalem → siparişler); değişmeyen geçilir; bu cihazın 12 sn içindeki yazması
// ertelenir (görüldü sayılmaz, yaşlanınca tazelenir); bekleyen yazması olan alan ertelenir; bilinmeyen tablo yok sayılır;
// görüldü haritasında ertelenenler eski değerde kalır.
const { degisiklikFarki, degisiklikGoruldu, alaninTablolari } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const onceki = { urunler: 3, siparis_kalemleri: 5, cariler: 1, muhasebe: 2 };
const yeni = { urunler: 3, siparis_kalemleri: 6, cariler: 2, muhasebe: 3, bilinmeyen: 9 };
const f1 = degisiklikFarki(onceki, yeni, { sonYazma: () => 0, simdi: 100000, bekleyenAnahtarlar: [] });
bekle("kalem → siparişler, cariler, muhasebe; ürünler değişmedi; bilinmeyen yok", [f1.alanlar, f1.tablolar, f1.ertelenen],
  [["siparisler", "cariler", "muhasebe"], ["siparis_kalemleri", "cariler", "muhasebe"], []]);
const f2 = degisiklikFarki(onceki, yeni, { sonYazma: (t) => (t === "cariler" ? 95000 : 0), simdi: 100000, bekleyenAnahtarlar: ["muhasebe:data"] });
bekle("5 sn önce bizim yazdığımız cariler + bekleyen muhasebe ertelenir", [f2.alanlar, f2.ertelenen], [["siparisler"], ["cariler", "muhasebe"]]);
const f3 = degisiklikFarki(onceki, yeni, { sonYazma: (t) => (t === "cariler" ? 80000 : 0), simdi: 100000, bekleyenAnahtarlar: [] });
bekle("20 sn önceki yazma artık ertelenmez", f3.alanlar.includes("cariler"), true);
bekle("görüldü: ertelenenler eski değerde", degisiklikGoruldu(onceki, yeni, f2.ertelenen), { urunler: 3, siparis_kalemleri: 6, cariler: 1, muhasebe: 2, bilinmeyen: 9 });
bekle("ilk okuma (önceki yok) → hepsi değişmiş sayılmaz çünkü 100 ilk okumayı 'görüldü' yapar; burada boş önceki ile fark", degisiklikFarki({}, { urunler: 1 }, { sonYazma: () => 0, simdi: 100000 }).alanlar, ["stok"]);
bekle("alan tabloları", alaninTablolari("stok"), ["urunler", "varyantlar", "stok_hareketleri"]);
// v1.645.2: ürün kaydı urunler'i damgalar ama varyantlar / stok_hareketleri sayacı da artar — aynı alan, bizim yazmamız.
const f4 = degisiklikFarki({ urunler: 1, varyantlar: 1, stok_hareketleri: 1 }, { urunler: 2, varyantlar: 2, stok_hareketleri: 2 },
  { sonYazma: (t) => (t === "urunler" ? 97000 : 0), simdi: 100000, bekleyenAnahtarlar: [] });
bekle("ana tablo damgası alt tabloları da kapsar (alan bazında)", [f4.alanlar, f4.ertelenen], [[], ["urunler", "varyantlar", "stok_hareketleri"]]);
const f5 = degisiklikFarki({ cari_hareketleri: 1 }, { cari_hareketleri: 2 }, { sonYazma: (t) => (t === "urunler" ? 97000 : 0), simdi: 100000, bekleyenAnahtarlar: [] });
bekle("başka alanın damgası kapsamaz (stok yazması carileri ertelemez)", f5.alanlar, ["cariler"]);
if (hata) { console.log("BİRİM TESTİ HATA: değişiklik sayacı"); process.exit(1); }
console.log("── değişiklik sayacı testi temiz ──");
