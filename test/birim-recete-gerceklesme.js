// BİRİM TESTİ — REÇETE GERÇEKLEŞMESİ
//
// Kullanıcı (6 Eylül): "Hammadde birim adedi reçeteye NOT olarak yansısın — deri 30 desi
// planlandı ama 31 desiden çıkıyor gibi. Bununla hem reçete kontrolü yaparız, gerçek maliyet
// yakalanıyor mu diye."
//
// Reçete bir TAHMİNDİR; gerçek tüketim ancak iş bitince belli olur (verilen − iade).
// TEK ÖLÇÜMDEN KARAR VERİLMEZ: bir üretimde deri kötü çıkmış olabilir.
const { receteGerceklesmeEkle, receteGerceklesmeDurumu, receteGerceklesmeAnahtari } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};

const DERI = { hammaddeUrunId: "u1", renk: "Siyah", beden: "", planlanan: 30 };

// ---- BİRİKTİRME --------------------------------------------------------------------------------
let ozet = receteGerceklesmeEkle(null, [{ ...DERI, gerceklesen: 31 }]);
bekle("ilk \u00f6l\u00e7\u00fcm kaydedildi", ozet[receteGerceklesmeAnahtari("u1", "Siyah", "")].olcum, 1);

ozet = receteGerceklesmeEkle(ozet, [{ ...DERI, gerceklesen: 31 }]);
ozet = receteGerceklesmeEkle(ozet, [{ ...DERI, gerceklesen: 32 }]);
const d = receteGerceklesmeDurumu(ozet, "u1", "Siyah", "");
bekle("\u00fc\u00e7 \u00f6l\u00e7\u00fcm", d.olcum, 3);
// (31 + 31 + 32) / 3 = 31,3333
bekle("ortalama", d.ortalama, 31.3333);
bekle("planlanan korunuyor", d.planlanan, 30);

// ---- ÖNERİ EŞİKLERİ ----------------------------------------------------------------------------
// %4,4 fark — %5 eşiğinin ALTINDA: ölçüm gürültüsü olabilir, öneri yok ama rakam görünüyor.
bekle("k\u00fc\u00e7\u00fck fark \u00f6neri do\u011furmuyor", d.oneriVar, false);

// Fark büyüyünce öneri çıkar: 30 planlı, 33 gerçekleşen (%10).
let buyuk = receteGerceklesmeEkle(null, [{ ...DERI, gerceklesen: 33 }]);
buyuk = receteGerceklesmeEkle(buyuk, [{ ...DERI, gerceklesen: 33 }]);
const ikiOlcum = receteGerceklesmeDurumu(buyuk, "u1", "Siyah", "");
// İKİ ölçüm yeterli değil: hangisinin sapma olduğu bilinemez.
bekle("iki \u00f6l\u00e7\u00fcmde \u00f6neri yok", ikiOlcum.oneriVar, false);
buyuk = receteGerceklesmeEkle(buyuk, [{ ...DERI, gerceklesen: 33 }]);
const ucOlcum = receteGerceklesmeDurumu(buyuk, "u1", "Siyah", "");
bekle("\u00fc\u00e7 \u00f6l\u00e7\u00fcm + %10 fark \u2192 \u00f6neri", ucOlcum.oneriVar, true);
bekle("fark oran\u0131", Math.round(ucOlcum.fark * 100), 10);

// EKSİ YÖNDE de çalışmalı: reçete fazla yazılmışsa da düzeltilmeli.
let az = receteGerceklesmeEkle(null, [{ ...DERI, gerceklesen: 26 }]);
az = receteGerceklesmeEkle(az, [{ ...DERI, gerceklesen: 26 }]);
az = receteGerceklesmeEkle(az, [{ ...DERI, gerceklesen: 26 }]);
const azD = receteGerceklesmeDurumu(az, "u1", "Siyah", "");
bekle("re\u00e7ete fazla yaz\u0131lm\u0131\u015fsa da \u00f6neri", azD.oneriVar, true);
bekle("fark negatif", azD.fark < 0, true);

// ---- GEÇERSİZ GİRDİLER -------------------------------------------------------------------------
// Sıfır tüketim ÖLÇÜM SAYILMAZ: veri girilmemiş demektir, ortalamayı bozar.
const sifir = receteGerceklesmeEkle(ozet, [{ ...DERI, gerceklesen: 0 }]);
bekle("s\u0131f\u0131r t\u00fcketim say\u0131lm\u0131yor", receteGerceklesmeDurumu(sifir, "u1", "Siyah", "").olcum, 3);
bekle("hi\u00e7 \u00f6l\u00e7\u00fcm yoksa null", receteGerceklesmeDurumu({}, "u1", "Siyah", ""), null);
bekle("ba\u015fka renk ayr\u0131 tutuluyor", receteGerceklesmeDurumu(ozet, "u1", "Kahve", ""), null);

// GİRDİ DEĞİŞTİRİLMEZ: çağıran eski özeti hâlâ kullanabilmeli.
const once = receteGerceklesmeDurumu(ozet, "u1", "Siyah", "").olcum;
receteGerceklesmeEkle(ozet, [{ ...DERI, gerceklesen: 40 }]);
bekle("girdi de\u011fi\u015ftirilmiyor", receteGerceklesmeDurumu(ozet, "u1", "Siyah", "").olcum, once);

// REÇETE DEĞİŞTİYSE karşılaştırma YENİ değere göre yapılır.
const yeniRecete = receteGerceklesmeEkle(ozet, [{ ...DERI, planlanan: 31, gerceklesen: 31 }]);
bekle("planlanan g\u00fcncelleniyor", receteGerceklesmeDurumu(yeniRecete, "u1", "Siyah", "").planlanan, 31);

// ---- EKSİ STOĞUN SEBEBİ ------------------------------------------------------------------------
//
// Kullanıcı (7 Eylül), "eksi stok giriş fişi eksikliğinden mi, reçete fazla düştüğü için mi?"
// sorusuna: "İKİSİ DE OLABİLİR." İkisi de olabiliyorsa hangisi olduğu VERİDEN çıkarılmalı.
const { eksiStokSebebi } = require("./erp.cjs");

// REÇETE FAZLA DÜŞÜYOR: planlanan 2, ölçülen 1,7 (%15 az) → her üretimde stoktan fazla düşülmüş.
const receteFazla = [{
  id: "m1", ad: "Bot",
  receteGerceklesme: { "u1|Siyah|": { olcum: 3, toplam: 5.1, planlanan: 2 } },
}];
bekle("re\u00e7ete fazla d\u00fc\u015f\u00fcyorsa te\u015fhis 're\u00e7ete'",
  eksiStokSebebi(receteFazla, "u1", "Siyah", "").tur, "recete");
bekle("\u015f\u00fcpheli mam\u00fcl adland\u0131r\u0131l\u0131yor",
  eksiStokSebebi(receteFazla, "u1", "Siyah", "").supheliler[0].urunAd, "Bot");

// TÜKETİM UYUMLU: düşülen miktar doğru → eksi, girişin yapılmamasından.
const uyumlu = [{
  id: "m1", ad: "Bot",
  receteGerceklesme: { "u1|Siyah|": { olcum: 3, toplam: 6, planlanan: 2 } },
}];
bekle("t\u00fcketim uyumluysa te\u015fhis 'giri\u015f'", eksiStokSebebi(uyumlu, "u1", "Siyah", "").tur, "giris");

// REÇETE AZ DÜŞÜYOR (ölçülen FAZLA): bu eksi stoğu AÇIKLAMAZ — reçete zaten az düşüyor.
const receteAz = [{
  id: "m1", ad: "Bot",
  receteGerceklesme: { "u1|Siyah|": { olcum: 3, toplam: 6.9, planlanan: 2 } },
}];
bekle("öl\u00e7\u00fclen fazlaysa re\u00e7ete su\u00e7lanm\u0131yor", eksiStokSebebi(receteAz, "u1", "Siyah", "").tur, "giris");

// HİÇ ÖLÇÜM YOKSA bir şey söylenmez. Uydurma teşhis, yanlış yeri düzelttirir.
bekle("\u00f6l\u00e7\u00fcm yoksa 'bilinmiyor'", eksiStokSebebi([{ id: "m1", ad: "Bot" }], "u1", "Siyah", "").tur, "bilinmiyor");
bekle("ba\u015fka renk kar\u0131\u015fm\u0131yor", eksiStokSebebi(receteFazla, "u1", "Kahve", "").tur, "bilinmiyor");

// TEK ÖLÇÜM yeterli değil (öneri eşiği): teşhis de yapılmaz.
const tekOlcum = [{ id: "m1", ad: "Bot", receteGerceklesme: { "u1|Siyah|": { olcum: 1, toplam: 1.7, planlanan: 2 } } }];
bekle("tek \u00f6l\u00e7\u00fcmde re\u00e7ete su\u00e7lanm\u0131yor", eksiStokSebebi(tekOlcum, "u1", "Siyah", "").tur, "giris");

console.log(hata ? "\n\u2500\u2500 RE\u00c7ETE TEST\u0130 BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 re\u00e7ete ger\u00e7ekle\u015fme testi temiz \u2500\u2500");
process.exit(hata);
