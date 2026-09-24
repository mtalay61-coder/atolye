// BİRİM TESTİ — DEFTER KAPSAMI ("Muhasebe" = ikisine de)
//
// Kullanıcı (6 Eylül): "Muhasebe seçili olduğunda hem genel hem de resmi kayda işlemesi gerekiyor."
//
// Ekranda etiket zaten "Muhasebe (ikisine de)" diyordu ama süzgeç `=== "Genel"` diye baktığı için
// kayıt HİÇBİR deftere girmiyordu: Genel toplamında yok, Resmi toplamında yok, yalnız "Tümü"de
// görünüyordu. Etiket bir şey vaat edip hesap başka şey yapıyordu.
const { defterKapsar, hesapBakiyesi, esIkizleriBirlestir, kurSorusu, kurUygula, kurTersHesapla } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};

// ---- KAPSAM ------------------------------------------------------------------------------------
bekle("Genel kayd\u0131 Genel'e girer", defterKapsar("Genel", "Genel"), true);
bekle("Genel kayd\u0131 Resmi'ye girmez", defterKapsar("Genel", "Resmi"), false);
bekle("Resmi kayd\u0131 Resmi'ye girer", defterKapsar("Resmi", "Resmi"), true);
// ASIL İDDİA:
bekle("Muhasebe kayd\u0131 Genel'e girer", defterKapsar("Muhasebe", "Genel"), true);
bekle("Muhasebe kayd\u0131 Resmi'ye girer", defterKapsar("Muhasebe", "Resmi"), true);
// Defteri yazılmamış eski kayıtlar Genel sayılıyor — biçim değişmeden önceki veri böyle.
bekle("defteri bo\u015f kay\u0131t Genel say\u0131l\u0131r", defterKapsar("", "Genel"), true);
bekle("defteri bo\u015f kay\u0131t Resmi say\u0131lmaz", defterKapsar(undefined, "Resmi"), false);
bekle("T\u00fcm\u00fc her \u015feyi kapsar", ["Genel", "Resmi", "Muhasebe"].every((d) => defterKapsar(d, "T\u00fcm\u00fc")), true);
bekle("defter verilmezse her \u015fey kapsan\u0131r", defterKapsar("Resmi", null), true);

// ---- BAKİYE ------------------------------------------------------------------------------------
// Kullanıcının ekranındaki durumun küçültülmüş hâli.
const kasa = { hareketler: [
  { yon: "Giri\u015f", tutar: 23554, defter: "Muhasebe" },
  { yon: "Giri\u015f", tutar: 1254, defter: "Resmi" },
  { yon: "Giri\u015f", tutar: 448, defter: "Resmi" },
  { yon: "Giri\u015f", tutar: 2255, defter: "Muhasebe" },
  { yon: "Giri\u015f", tutar: 22544, defter: "Genel" },
  { yon: "Giri\u015f", tutar: 122 },
] };

// TOPLAM DEĞİŞMEMELİ: "Muhasebe" tek kayıt olarak duruyor, iki deftere birden SAYILIYOR ama
// hesabın kendi bakiyesinde bir kez geçiyor. Bölünseydi toplam aynı parayı iki kez sayardı.
bekle("hesap toplam\u0131 tek sayar", hesapBakiyesi(kasa), 50177);
bekle("Genel = Genel + Muhasebe", hesapBakiyesi(kasa, "Genel"), 22544 + 122 + 23554 + 2255);
bekle("Resmi = Resmi + Muhasebe", hesapBakiyesi(kasa, "Resmi"), 1254 + 448 + 23554 + 2255);

// Çıkışlar da aynı kuralla düşülüyor.
const cikisli = { hareketler: [
  { yon: "Giri\u015f", tutar: 1000, defter: "Muhasebe" },
  { yon: "\u00c7\u0131k\u0131\u015f", tutar: 300, defter: "Muhasebe" },
  { yon: "\u00c7\u0131k\u0131\u015f", tutar: 200, defter: "Resmi" },
] };
bekle("\u00e7\u0131k\u0131\u015f Genel'den d\u00fc\u015fer", hesapBakiyesi(cikisli, "Genel"), 700);
bekle("\u00e7\u0131k\u0131\u015f Resmi'den d\u00fc\u015fer", hesapBakiyesi(cikisli, "Resmi"), 500);

// ---- İKİZ KAYIT GÖÇÜ ---------------------------------------------------------------------------
//
// Eski biçimde "Muhasebe" cari hareketi İKİYE bölünüyordu (Genel + Resmi, `esId` ile bağlı).
// Göç tek kayda indiriyor. Kritik nokta: GENEL ikizin kimliği KORUNMALI — stok hareketi fiş
// yazılırken onunla aynı kimliği alıyor; Resmi olanı tutsaydık stok-cari bağı kopardı.
const ikizli = [{
  id: "c1", unvan: "M\u00fc\u015fteri",
  hareketler: [
    { id: "g1", tutar: 100, defter: "Genel", esId: "r1" },
    { id: "r1", tutar: 100, defter: "Resmi", esId: "g1" },
    { id: "tek", tutar: 50, defter: "Resmi" },
    // YET\u0130M: e\u015fi silinmi\u015f: dokunulmamal\u0131.
    { id: "y1", tutar: 70, defter: "Resmi", esId: "yok" },
  ],
}];
const goc = esIkizleriBirlestir(ikizli);
const kalanlar = goc.cariler[0].hareketler;
bekle("bir ikiz birle\u015fti", goc.birlesen, 1);
bekle("kay\u0131t say\u0131s\u0131 bire d\u00fc\u015ft\u00fc", kalanlar.length, 3);
bekle("GENEL ikizin kimli\u011fi korundu", kalanlar[0].id, "g1");
bekle("defteri Muhasebe oldu", kalanlar[0].defter, "Muhasebe");
bekle("esId d\u00fc\u015ft\u00fc", kalanlar[0].esId, undefined);
bekle("ikizsiz kay\u0131t dokunulmad\u0131", kalanlar[1], { id: "tek", tutar: 50, defter: "Resmi" });
// Yetim yarıma DOKUNULMUYOR: "Muhasebe" yapmak, kullanıcının silmediği bir deftere kayıt eklemek
// olurdu. Veri denetimi bunu zaten "yetim eş kayıt" olarak bildiriyor.
bekle("yetim yar\u0131m korundu", kalanlar[2].defter, "Resmi");

// GÖÇ İKİ KEZ ÇALIŞMAZ.
const ikinci = esIkizleriBirlestir(goc.cariler);
bekle("ikinci g\u00f6\u00e7 bir \u015fey de\u011fi\u015ftirmiyor", ikinci.birlesen, 0);

// GÖÇTEN SONRA BAKİYE AYNI KALMALI — asıl mesele bu.
const oncekiGenel = ikizli[0].hareketler.filter((h) => defterKapsar(h.defter, "Genel"))
  .reduce((t, h) => t + h.tutar, 0);
const sonrakiGenel = kalanlar.filter((h) => defterKapsar(h.defter, "Genel"))
  .reduce((t, h) => t + h.tutar, 0);
bekle("Genel bakiye g\u00f6\u00e7ten etkilenmedi", sonrakiGenel, oncekiGenel);
const sonrakiResmi = kalanlar.filter((h) => defterKapsar(h.defter, "Resmi"))
  .reduce((t, h) => t + h.tutar, 0);
bekle("Resmi bakiye do\u011fru", sonrakiResmi, 100 + 50 + 70);

// ---- KUR YÖNÜ ----------------------------------------------------------------------------------
//
// Kullanıcı (6 Eylül): "Ters mantık var, ben EUR kurunu biliyorum — 56 olduğunu biliyorum.
// Kura yapılan kafa karıştırıcı."
//
// Form kuru `1 TRY = ? EUR` yönünde soruyordu (0,0179). Piyasada kur her zaman "1 döviz kaç TL"
// diye konuşulur; ondalıklı ters kur hem yazması zor hem yuvarlama hatasına açık.
const KURLAR = { USD: 42, EUR: 56 };

// TL kasadan EUR cariye: soru DÖVİZ üzerinden, hesap BÖLME.
const s1 = kurSorusu("TRY", "EUR", KURLAR);
bekle("TL kasada soru d\u00f6viz \u00fczerinden", [s1.a, s1.b], ["EUR", "TRY"]);
bekle("\u00f6neri d\u00f6vizin TL fiyat\u0131", s1.onerilen, 56);
bekle("y\u00f6n b\u00f6lme", s1.bolme, true);
// Kullanıcının ekranındaki sayı: 3655 ₺ → 65,27 €. Çarpsaydı 204.680 € gibi anlamsız çıkardı.
bekle("3655 TRY = 65,27 EUR", kurUygula(3655, 56, s1.bolme), 65.27);

// EUR kasadan TL cariye: aynı soru, ters hesap.
const s2 = kurSorusu("EUR", "TRY", KURLAR);
bekle("EUR kasada da soru d\u00f6viz \u00fczerinden", [s2.a, s2.b], ["EUR", "TRY"]);
bekle("y\u00f6n \u00e7arpma", s2.bolme, false);
bekle("100 EUR = 5600 TRY", kurUygula(100, 56, s2.bolme), 5600);

// İki taraf da döviz: çapraz kur kaçınılmaz, doğrudan soruluyor.
const s3 = kurSorusu("USD", "EUR", KURLAR);
bekle("\u00e7apraz kur do\u011frudan", [s3.a, s3.b], ["USD", "EUR"]);
bekle("\u00e7apraz \u00f6neri iki TL kurundan", s3.onerilen, 0.75);

bekle("ayn\u0131 para biriminde soru yok", kurSorusu("TRY", "TRY", KURLAR), null);
bekle("kur bilinmiyorsa \u00f6neri yok", kurSorusu("TRY", "GBP", KURLAR).onerilen, null);
bekle("ge\u00e7ersiz kur null d\u00f6ner", kurUygula(100, 0, false), null);

// ---- ÇEVİRİNİN İKİNCİ YÖNÜ ----------------------------------------------------------------------
//
// Kullanıcı (6 Eylül): "Cari için 42000 TL ödeme verdi ve 1000 USD tutuluyor. Kur ayarlamak yerine
// cariye işlenecek olan yere 1000 yazdığımızda kuru otomatik düzenlesin."
//
// Hangi sayının bilindiği duruma göre değişiyor: bazen kur, bazen karşı taraftaki tutar. Tek
// yönlü form, bilinmeyeni bilinenden ELLE hesaplatıyordu.
// ---- SEMBOL → KOD ------------------------------------------------------------------------------
//
// Kullanıcı (9 Eylül): "Satır bazında hammaddeyi TL birim fiyatla çekti ama satıra USD yazdı.
// Hammadde alış fiyatı 0,22 USD aslında, TL para birimi var."
//
// Sebep: uygulamada İKİ AYRI gösterim var. Ürünler SEMBOL tutuyor (`"$"`), muhasebe KOD bekliyor
// (`"USD"`). Ürünün alış para birimi doğrudan fiş kalemine yazılınca kalem `"$"` taşıyor; seçici
// onu tanımadığı için ekranda "TRY" görünüyor ama hesap `"$"` ile yapılıyor → "Kur eksik: $ → TRY".
const { paraKoduna } = require("./erp.cjs");
bekle("₺ → TRY", paraKoduna("₺"), "TRY");
bekle("$ → USD", paraKoduna("$"), "USD");
bekle("€ → EUR", paraKoduna("€"), "EUR");
// Zaten kod olan değer bozulmamalı: fonksiyon iki yönde de çağrılabiliyor.
bekle("TRY → TRY", paraKoduna("TRY"), "TRY");
bekle("USD → USD", paraKoduna("USD"), "USD");
// TANINMAYAN SEMBOL null döner; uydurma bir kod döndürmek yanlış para biriminde fatura demekti.
//
// `£` listeden KALDIRILDI (kullanıcı, 9 Eylül: "bu birim hiç kullanılmaz") ama test duruyor:
// eski kayıtlarda seçilmiş olabilir ve o kayıt sessizce TL'ye düşmemeli. Seçenek listeden
// çıkarılınca VERİDEN de çıkmaz.
bekle("kald\u0131r\u0131lm\u0131\u015f sembol (£) tan\u0131nm\u0131yor", paraKoduna("£"), null);
bekle("hi\u00e7 bilinmeyen sembol", paraKoduna("¥"), null);
bekle("bo\u015f de\u011fer null", paraKoduna(""), null);
bekle("tan\u0131ms\u0131z null", paraKoduna(undefined), null);

const sTL = kurSorusu("TRY", "USD", KURLAR);
bekle("42000 TL / 1000 USD = 42 kur", kurTersHesapla(42000, 1000, sTL.bolme), 42);
// Gidiş-dönüş tutarlı olmalı: bulunan kurla yeniden hesaplayınca aynı tutar çıkmalı.
bekle("gidi\u015f-d\u00f6n\u00fc\u015f tutarl\u0131", kurUygula(42000, kurTersHesapla(42000, 1000, sTL.bolme), sTL.bolme), 1000);

const sUSD = kurSorusu("USD", "TRY", KURLAR);
bekle("1000 USD / 42000 TL = 42 kur", kurTersHesapla(1000, 42000, sUSD.bolme), 42);
bekle("d\u00f6viz kasada da tutarl\u0131", kurUygula(1000, kurTersHesapla(1000, 42000, sUSD.bolme), sUSD.bolme), 42000);

bekle("s\u0131f\u0131r hedef null", kurTersHesapla(42000, 0, true), null);
bekle("s\u0131f\u0131r kaynak null", kurTersHesapla(0, 1000, true), null);

console.log(hata ? "\n\u2500\u2500 DEFTER TEST\u0130 BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 defter testi temiz \u2500\u2500");
process.exit(hata);
