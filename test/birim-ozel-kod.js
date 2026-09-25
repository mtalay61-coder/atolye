// BİRİM TESTİ — TİPE GÖRE ÖZEL KOD ALANLARI
//
// Kullanıcı (6 Eylül): "Özel kod alanlarını her stok kendi içinde adlandırsın — taban stoğu için
// özel kod deriye uymaz… veya stok tipine göre özel kod kullandıralım."
// Kararlar: tipe göre · serbest sayıda · genel alanlar da kalsın.
//
// Buradaki asıl iddia: DEĞER SIRAYA DEĞİL KİMLİĞE BAĞLI. Tipe özel alanlarda sıra tipten tipe
// farklı anlama gelir; ürünün tipi değişince "0,9 mm" sessizce "numara" alanında görünürdü.
const {
  ozelKodAlaniUyar, urunOzelKodAlanlari, ozelKodCiftleri, ozelKodMetni, eslesenOzelKodlar, ozelKodGoc,
} = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};

const alanlar = [
  { id: "g1", ad: "Tedarik\u00e7i Kodu", kapsamTuru: "genel", kapsamAd: "" },
  { id: "d1", ad: "Kal\u0131nl\u0131k", kapsamTuru: "malzeme", kapsamAd: "Deri" },
  { id: "t1", ad: "Numara", kapsamTuru: "malzeme", kapsamAd: "Taban" },
  { id: "m1", ad: "Kal\u0131p", kapsamTuru: "mamul", kapsamAd: "Bot" },
  { id: "s1", ad: "Yazl\u0131k Taban", kapsamTuru: "sezon", kapsamAd: "\u0130lkbahar/Yaz" },
  { id: "s2", ad: "T\u00fcm Sezon Notu", kapsamTuru: "sezon", kapsamAd: "T\u00fcm Sezon" },
];

const deri = { id: "u1", ad: "Deri", malzemeTipi: "Deri", ozelKodlar: { g1: "TX-9", d1: "0,9 mm" } };
const taban = { id: "u2", ad: "Taban", malzemeTipi: "Taban", ozelKodlar: { t1: "147" } };
const bot = { id: "u3", ad: "Bot", mamulTipi: "Bot", sezon: "\u0130lkbahar/Yaz", ozelKodlar: { m1: "K-12", s1: "TPU" } };
const dortMevsim = { id: "u5", ad: "Klasik", mamulTipi: "Bot", sezon: "T\u00fcm Sezon", ozelKodlar: { s2: "not" } };
const tipsiz = { id: "u4", ad: "Tutkal", ozelKodlar: { g1: "TX-1" } };

// ---- 1. KAPSAM --------------------------------------------------------------------------------
bekle("genel alan her \u00fcr\u00fcne uyar", ozelKodAlaniUyar(alanlar[0], taban), true);
bekle("ba\u015fka tipin alan\u0131 uymaz", ozelKodAlaniUyar(alanlar[1], taban), false);
bekle("mamul tipi alan\u0131 hammaddeye uymaz", ozelKodAlaniUyar(alanlar[3], deri), false);
bekle("tip e\u015fle\u015fmesi b\u00fcy\u00fck/k\u00fc\u00e7\u00fck harf duyars\u0131z",
  ozelKodAlaniUyar({ kapsamTuru: "malzeme", kapsamAd: "deri" }, deri), true);

// TABANIN ALANLARI DERİDE GÖRÜNMEZ — kullanıcının söylediği tam olarak bu.
bekle("deriye uygulanan alanlar", urunOzelKodAlanlari(deri, alanlar).map((a) => a.id), ["g1", "d1"]);
bekle("tabana uygulanan alanlar", urunOzelKodAlanlari(taban, alanlar).map((a) => a.id), ["g1", "t1"]);
bekle("bota uygulanan alanlar", urunOzelKodAlanlari(bot, alanlar).map((a) => a.id), ["g1", "m1", "s1"]);

// ---- SEZON EKSENİ (kullanıcı: "Mamulde sezon da kapsam ekseni olsun") -------------------------
bekle("sezon alan\u0131 e\u015fle\u015fen sezonda \u00e7\u0131k\u0131yor", ozelKodAlaniUyar(alanlar[4], bot), true);
bekle("sezon alan\u0131 ba\u015fka sezonda \u00e7\u0131km\u0131yor", ozelKodAlaniUyar(alanlar[4], dortMevsim), false);
// Sezon yalnız mamulde dolduruluyor: hammaddede sezon alanı kendiliğinden görünmüyor.
bekle("sezonsuz \u00fcr\u00fcnde sezon alan\u0131 yok", ozelKodAlaniUyar(alanlar[4], deri), false);
// "Tüm Sezon" JOKER DEĞİL: yazlık alan orada çıkmıyor, kendi alanı çıkıyor.
bekle("T\u00fcm Sezon joker de\u011fil",
  urunOzelKodAlanlari(dortMevsim, alanlar).map((a) => a.id), ["g1", "m1", "s2"]);
bekle("tipsiz \u00fcr\u00fcnde yaln\u0131z genel", urunOzelKodAlanlari(tipsiz, alanlar).map((a) => a.id), ["g1"]);
// Genel alan HER ZAMAN ÖNCE: aynı ürün her ekranda aynı düzende görünsün.
bekle("genel alan ba\u015fta", urunOzelKodAlanlari(deri, alanlar)[0].id, "g1");

// ---- 2. DEĞERLER ------------------------------------------------------------------------------
bekle("dolu kodlar etiketiyle", ozelKodCiftleri(deri, alanlar),
  [{ id: "g1", etiket: "Tedarik\u00e7i Kodu", deger: "TX-9" }, { id: "d1", etiket: "Kal\u0131nl\u0131k", deger: "0,9 mm" }]);
bekle("bo\u015f de\u011fer listelenmiyor", ozelKodCiftleri({ ...deri, ozelKodlar: { g1: "  " } }, alanlar), []);
bekle("arama metni", ozelKodMetni(taban, alanlar), "Numara 147");
bekle("e\u015fle\u015fen kod", eslesenOzelKodlar(taban, alanlar, "147").map((x) => x.etiket), ["Numara"]);
bekle("e\u015fle\u015fmeyen sorgu", eslesenOzelKodlar(taban, alanlar, "kal\u0131nl\u0131k"), []);

// TİP DEĞİŞİNCE değer GÖRÜNMEZ ama SİLİNMEZ. Sessizce silmek, yanlış tıklanan bir tip
// değişikliğini geri alınamaz kılardı; yanlış alanda GÖSTERMEK ise daha kötü olurdu.
const tipiDegisti = { ...deri, malzemeTipi: "Taban" };
bekle("tip de\u011fi\u015finde eski de\u011fer g\u00f6r\u00fcnm\u00fcyor",
  ozelKodCiftleri(tipiDegisti, alanlar).map((x) => x.etiket), ["Tedarik\u00e7i Kodu"]);
bekle("eski de\u011fer kay\u0131tta duruyor", tipiDegisti.ozelKodlar.d1, "0,9 mm");
bekle("tip geri al\u0131n\u0131nca de\u011fer d\u00f6n\u00fcyor",
  ozelKodCiftleri({ ...tipiDegisti, malzemeTipi: "Deri" }, alanlar).map((x) => x.deger), ["TX-9", "0,9 mm"]);

// ---- 3. GÖÇ -----------------------------------------------------------------------------------
// Eski biçim: beş sabit etiket + dizi değerler. Göç etmezse ekranlar boş görünür ve girilmiş
// kodlar kaybolmuş sanılır.
let sayac = 0;
const kimlik = () => `k${++sayac}`;
const eskiTanimlar = { ozelKodEtiketleri: ["Men\u015fei", "Taban", "", "", ""] };
const eskiStok = [
  { id: "a", ozelKodlar: ["\u0130talya", "Kau\u00e7uk", "", "", ""] },
  { id: "b", ozelKodlar: ["", "Deri", "", "", ""] },
  { id: "c", ozelKodlar: {} },
];
const goc = ozelKodGoc(eskiTanimlar, eskiStok, kimlik);

// BOŞ ETİKET ALAN AÇMIYOR: hiç kullanılmamış bir slot için başlık taşımanın anlamı yok.
bekle("bo\u015f etiketler alan a\u00e7m\u0131yor", goc.tanimlar.ozelKodAlanlari.length, 2);
bekle("alanlar genel kapsaml\u0131", goc.tanimlar.ozelKodAlanlari.map((a) => [a.ad, a.kapsamTuru]),
  [["Men\u015fei", "genel"], ["Taban", "genel"]]);
bekle("de\u011ferler kimli\u011fe ba\u011fland\u0131", goc.stok[0].ozelKodlar, { k1: "\u0130talya", k2: "Kau\u00e7uk" });
bekle("bo\u015f de\u011fer ta\u015f\u0131nm\u0131yor", goc.stok[1].ozelKodlar, { k2: "Deri" });
bekle("zaten nesne olan dokunulmuyor", goc.stok[2].ozelKodlar, {});
bekle("de\u011fi\u015fim bildiriliyor", goc.degisti, true);

// GÖÇ İKİ KEZ ÇALIŞMAZ: ikinci çağrı yeni kimlik üretip değerleri kopartmamalı.
const ikinci = ozelKodGoc(goc.tanimlar, goc.stok, kimlik);
bekle("ikinci g\u00f6\u00e7 alan eklemiyor", ikinci.tanimlar.ozelKodAlanlari.length, 2);
bekle("ikinci g\u00f6\u00e7 de\u011ferleri bozmuyor", ikinci.stok[0].ozelKodlar, { k1: "\u0130talya", k2: "Kau\u00e7uk" });
bekle("ikinci g\u00f6\u00e7te de\u011fi\u015fim yok", ikinci.degisti, false);

// Hiç özel kod kullanmamış bir kurulum: göç boş alan listesi kuruyor, çökmüyor.
const bos = ozelKodGoc({}, [], kimlik);
bekle("bo\u015f kurulum", bos.tanimlar.ozelKodAlanlari, []);

console.log(hata ? "\n\u2500\u2500 \u00d6ZEL KOD TEST\u0130 BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 \u00f6zel kod testi temiz \u2500\u2500");
process.exit(hata);
