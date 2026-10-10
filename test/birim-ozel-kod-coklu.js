// BİRİM TESTİ — ÖZEL KOD ALANI ÇOK TİPLİ (v1.636.0)
// Kullanıcı (Tanımlar ekran görüntüsüyle: Genel'de, Sandalet'te ve Ayakkabı'da ayrı ayrı "Taban", "Kalıp", "MODEL"):
// "tipler renk gibi ortak olabilsin". Ölçülen: eski tek kapsamlı kayıt göçsüz okunur; çok kapsamlı alan kapsamlarından
// birine uyan ürüne çıkar; aynı adla ekleme yeni alan açmaz, tipi ekler; birleştirme ikizleri toplar, değerleri taşır,
// farklı değerde çakışmayı bildirir ve ikizin değerini silmez.
const { ozelKodAlaniUyar, urunOzelKodAlanlari, ozelKodKapsamlari, ozelKodAlaniAdla, ozelKodAlanlariniBirlestir } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };

const eski = { id: "a1", ad: "Taban", kapsamTuru: "mamul", kapsamAd: "Sandalet" };
bekle("eski tek kapsam göçsüz okunur", ozelKodKapsamlari(eski), ["mamul|Sandalet"]);
bekle("eski genel = boş", ozelKodKapsamlari({ id: "g", ad: "X", kapsamTuru: "genel", kapsamAd: "" }), []);
const coklu = { id: "c", ad: "Kalıp", kapsamlar: ["mamul|Sandalet", "mamul|Ayakkabı", "sezon|Yazlık"] };
bekle("çok tipli: Ayakkabı ürününe uyar", ozelKodAlaniUyar(coklu, { mamulTipi: "ayakkabı" }), true);
bekle("çok tipli: sezonu uyan ürüne uyar", ozelKodAlaniUyar(coklu, { mamulTipi: "Bot", sezon: "Yazlık" }), true);
bekle("çok tipli: hiçbirine uymayan ürüne uymaz", ozelKodAlaniUyar(coklu, { mamulTipi: "Bot" }), false);
bekle("ürün alanları: genel önce, sonra uyanlar", urunOzelKodAlanlari({ mamulTipi: "Sandalet" }, [coklu, { id: "g", ad: "Model", kapsamlar: [] }, eski]).map((a) => a.id), ["g", "c", "a1"]);

let r = ozelKodAlaniAdla([eski], "taban ", "mamul|Ayakkabı", "yeni");
bekle("aynı adla başka tip: yeni alan açılmaz, tip eklenir", { id: r.id, yeniMi: r.yeniMi, k: ozelKodKapsamlari(r.alanlar[0]), eskiAlanlarSilindi: r.alanlar[0].kapsamTuru === undefined, adet: r.alanlar.length },
  { id: "a1", yeniMi: false, k: ["mamul|Sandalet", "mamul|Ayakkabı"], eskiAlanlarSilindi: true, adet: 1 });
r = ozelKodAlaniAdla([eski], "Taban", "mamul|Sandalet", "yeni");
bekle("aynı ad aynı tip: değişiklik yok", { id: r.id, degisti: r.degisti }, { id: "a1", degisti: false });
r = ozelKodAlaniAdla([eski], "Taban", "genel|", "yeni");
bekle("aynı ad Genel istenirse alan genel olur", ozelKodKapsamlari(r.alanlar[0]), []);
r = ozelKodAlaniAdla([eski], "Kalınlık", "malzeme|Deri", "yeni");
bekle("yeni ad: yeni alan", { id: r.id, yeniMi: r.yeniMi, k: r.alanlar[1].kapsamlar }, { id: "yeni", yeniMi: true, k: ["malzeme|Deri"] });

const alanlar = [
  { id: "t1", ad: "Taban", kapsamTuru: "mamul", kapsamAd: "Sandalet" },
  { id: "k1", ad: "Kalıp", kapsamTuru: "mamul", kapsamAd: "Sandalet" },
  { id: "t2", ad: "TABAN", kapsamTuru: "mamul", kapsamAd: "Ayakkabı" },
  { id: "k2", ad: "Kalıp", kapsamTuru: "mamul", kapsamAd: "Ayakkabı" },
  { id: "m1", ad: "MODEL", kapsamTuru: "genel", kapsamAd: "" },
  { id: "m2", ad: "Model", kapsamTuru: "mamul", kapsamAd: "Sandalet" },
];
const urunler = [
  { id: "u1", ad: "Ayakkabı A", ozelKodlar: { t2: "T-147", k2: "K9" } },
  { id: "u2", ad: "Sandalet B", ozelKodlar: { t1: "T-200", m1: "22900", m2: "22901" } },
  { id: "u3", ad: "Boş", ozelKodlar: {} },
];
const b = ozelKodAlanlariniBirlestir(alanlar, urunler);
bekle("3 ikiz birleşti", b.birlesenSayisi, 3);
bekle("kalan alanlar ve kapsamları", b.alanlar.map((a) => [a.id, ozelKodKapsamlari(a)]),
  [["t1", ["mamul|Sandalet", "mamul|Ayakkabı"]], ["k1", ["mamul|Sandalet", "mamul|Ayakkabı"]], ["m1", []]]);
bekle("değer taşındı (ikiz anahtarı silindi)", b.urunler.find((u) => u.id === "u1").ozelKodlar, { t1: "T-147", k1: "K9" });
bekle("çakışma bildirildi, kalan değer korundu", b.cakismalar, [{ urunAd: "Sandalet B", alanAd: "MODEL", kalan: "22900", ikiz: "22901" }]);
bekle("çakışan ürün değişmedi (ikiz değeri durur)", b.urunler.some((u) => u.id === "u2"), false);
bekle("değeri olmayan ürün yazılmaz", b.urunler.some((u) => u.id === "u3"), false);
bekle("ikiz yoksa hiçbir şey değişmez", ozelKodAlanlariniBirlestir([alanlar[0]], urunler).birlesenSayisi, 0);

console.log(hata ? "── özel kod çoklu tip testi BAŞARISIZ ──" : "── özel kod çoklu tip testi temiz ──");
process.exit(hata);
