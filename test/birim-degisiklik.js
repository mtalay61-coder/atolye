// BİRİM TESTİ — DEĞİŞİKLİK SAYACI FARKI (v1.611.0)
// Kullanıcı: "Başka kullanıcıların yaptığı işlemler geç düşüyor, anında nasıl görebiliriz?"
// Ölçülen: sayacı artan tablo alanına düşer (kalem → siparişler); değişmeyen geçilir; bu cihazın 12 sn içindeki yazması
// ertelenir (görüldü sayılmaz, yaşlanınca tazelenir); bekleyen yazması olan alan ertelenir; bilinmeyen tablo yok sayılır;
// görüldü haritasında ertelenenler eski değerde kalır.
const { degisiklikFarki, degisiklikGoruldu, alaninTablolari, degisiklikIcerikAyni, tabloIcerikAyni, TABLO_SEMA } = require("./erp.cjs");
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
// v1.726.0: stok v2 geçişinden sonra sayaçları stk_* tabloları artırır (varyantlar / stok_hareketleri görünüm).
bekle("alan tabloları", alaninTablolari("stok"), ["urunler", "varyantlar", "stok_hareketleri", "stk_varyant", "stk_hareket", "stk_fis", "stk_renk", "stk_olcu"]);
// v1.645.2: ürün kaydı urunler'i damgalar ama varyantlar / stok_hareketleri sayacı da artar — aynı alan, bizim yazmamız.
const f4 = degisiklikFarki({ urunler: 1, varyantlar: 1, stok_hareketleri: 1 }, { urunler: 2, varyantlar: 2, stok_hareketleri: 2 },
  { sonYazma: (t) => (t === "urunler" ? 97000 : 0), simdi: 100000, bekleyenAnahtarlar: [] });
bekle("ana tablo damgası alt tabloları da kapsar (alan bazında)", [f4.alanlar, f4.ertelenen], [[], ["urunler", "varyantlar", "stok_hareketleri"]]);
const f5 = degisiklikFarki({ cari_hareketleri: 1 }, { cari_hareketleri: 2 }, { sonYazma: (t) => (t === "urunler" ? 97000 : 0), simdi: 100000, bekleyenAnahtarlar: [] });
bekle("başka alanın damgası kapsamaz (stok yazması carileri ertelemez)", f5.alanlar, ["cariler"]);
// v1.645.7: yoklama sekme gizliyken durur, dönüşte kendi yazmamız 12 sn'yi aşar — son kapı içerik karşılaştırması.
bekle("anahtar sırası önemsiz (jsonb yeniden sıralar)", degisiklikIcerikAyni([{ id: "k1", kod: "K-1", kalemler: [{ adet: 2, beden: "37" }] }], [{ kod: "K-1", id: "k1", kalemler: [{ beden: "37", adet: 2 }] }]), true);
bekle("undefined alan yok sayılır", degisiklikIcerikAyni({ a: 1, b: undefined }, { a: 1 }), true);
bekle("dizi sırası önemli, değer farkı yakalanır", [degisiklikIcerikAyni([1, 2], [2, 1]), degisiklikIcerikAyni({ a: 1 }, { a: 2 })], [false, false]);
// v1.645.11: çok satırlı tablo — buluttan dönen nesne yazılandan farklı biçimde (boş sütun null, cariId eklenir,
// zaman "+00:00", sunucu sütunu). 045'in cari okuma dönüşümü burada taklit ediliyor.
const yerelCari = [{ id: "c1", unvan: "Celal", tip: "Müşteri", paraBirimi: "TRY", hareketler: [
  { id: "h1", tarih: "2026-10-11", zaman: "2026-10-11T15:00:00.000Z", yon: "Alacak", tutar: 500, paraBirimi: "TRY",
    odemeSekli: "Çek", fisNo: "ODM-1", aciklama: "Ödeme", islemTipi: "Ödeme", kullanici: "Mahmut", cek: { cekNo: "77", banka: "Ziraat" } }] }];
const sema = TABLO_SEMA.cariler;
const satirdan = (r) => { const k = {}; Object.entries(r).forEach(([s, v]) => { k[s.replace(/_([a-z])/g, (_, h) => h.toUpperCase())] = v; }); return k; };
const bulutOku = (cariler) => cariler.map((c) => {
  const satir = { ...sema.satir(c), olusturma_zamani: "2026-10-11T15:00:01+00:00", surum: 3 };
  const hs = sema.cocuklar[0].cikar(c).map((h) => ({ ...h, zaman: h.zaman ? h.zaman.replace(".000Z", "+00:00") : null }));
  const { surum, ...satirSurumsuz } = satir;
  return { ...satirdan(satirSurumsuz), ...(satir.ek || {}), hareketler: hs.map((h) => {
    const k = satirdan(h); const ek = k.ek || {}; delete k.ek;
    Object.entries(ek).forEach(([a, d]) => { if (d !== null && d !== undefined) k[a] = d; }); return k; }) };
});
const bulutCari = bulutOku(yerelCari);
bekle("düz karşılaştırma aynı içeriği FARKLI sanıyordu (hatanın kendisi)", degisiklikIcerikAyni(yerelCari, bulutCari), false);
bekle("yazma biçiminde karşılaştırma: aynı", tabloIcerikAyni("cariler", yerelCari, bulutCari), true);
const baskaCihaz = bulutOku([{ ...yerelCari[0], hareketler: [...yerelCari[0].hareketler, { id: "h2", tarih: "2026-10-11", yon: "Borç", tutar: 50 }] }]);
bekle("başka cihazın yeni hareketi: farklı", tabloIcerikAyni("cariler", yerelCari, baskaCihaz), false);
const tutarDegisti = bulutOku([{ ...yerelCari[0], hareketler: [{ ...yerelCari[0].hareketler[0], tutar: 600 }] }]);
bekle("tutar değişti: farklı", tabloIcerikAyni("cariler", yerelCari, tutarDegisti), false);
if (hata) { console.log("BİRİM TESTİ HATA: değişiklik sayacı"); process.exit(1); }
console.log("── değişiklik sayacı testi temiz ──");
