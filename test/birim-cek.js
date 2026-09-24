// BİRİM TESTİ — ÇEK YAŞAM DÖNGÜSÜ
//
// Kullanıcı (6 Eylül): "Çek hareketi 'ciro et' yetersiz bir işlem. Çeki iade et, bankaya tahsil
// için ver olmalı. Ciro edilen çek silinememeli, aşama aşama ilerlediği için. Ciro edilen çekin
// geçmişi görünmeli."
//
// Çek TEK BİR OLAY DEĞİL, bir SÜREÇ. Durumu tek açılır listeden seçtirmek bu süreci görünmez
// kılıyordu; hangi aşamadan hangisine geçilebileceği de yazılı değildi.
const { cekIzinliIslemler, cekSilinebilirMi, cekIslemUygula } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};

const portfoyde = { id: "c1", durum: "Portf\u00f6yde", tutar: 42000, paraBirimi: "TRY", cekNo: "123" };

// ---- İZİNLİ İŞLEMLER ---------------------------------------------------------------------------
bekle("portf\u00f6yde be\u015f i\u015flem",
  cekIzinliIslemler(portfoyde).map((i) => i.anahtar),
  ["ciro", "iade", "tahsile", "tahsil", "karsiliksiz"]);

// CİRO EDİLMİŞ ÇEKTE İŞLEM YOK: çek elimizden çıktı, üzerinde başka işlem yapılamaz.
bekle("ciro edilmi\u015fte i\u015flem yok", cekIzinliIslemler({ durum: "Ciro Edildi" }).map((i) => i.anahtar), []);

// TAHSİLDEKİ çek geri alınabilir (iade), tahsil olabilir ya da karşılıksız çıkabilir —
// ama YENİDEN ciro edilemez: banka elinde, veremeyiz.
bekle("tahsildeki \u00fc\u00e7 i\u015flem",
  cekIzinliIslemler({ durum: "Tahsilde" }).map((i) => i.anahtar),
  ["iade", "tahsil", "karsiliksiz"]);

// ---- SİLME KİLİDİ ------------------------------------------------------------------------------
bekle("temiz portf\u00f6y \u00e7eki silinebilir", cekSilinebilirMi(portfoyde).olur, true);
bekle("ciro edilmi\u015f silinemez", cekSilinebilirMi({ durum: "Ciro Edildi" }).olur, false);
// GEÇMİŞİ OLAN çek portföye geri dönmüş olsa bile silinemez: geçmiş, olmuş bir şeyin kaydıdır.
bekle("ge\u00e7mi\u015fi olan silinemez",
  cekSilinebilirMi({ durum: "Portf\u00f6yde", gecmis: [{ islem: "\u0130ade Et" }] }).olur, false);

// ---- İŞLEM UYGULAMA ----------------------------------------------------------------------------
const tahsile = cekIslemUygula(portfoyde, "tahsile", {
  tarih: "2026-09-06", bankaId: "b1", bankaAd: "Ziraat", kullanici: "Test",
});
bekle("durum Tahsilde", tahsile.durum, "Tahsilde");
// HANGİ BANKADA BEKLİYOR — üst alanda da duruyor ki liste ve süzgeç geçmişi taramasın.
bekle("banka \u00fcst alanda", [tahsile.tahsilBankaId, tahsile.tahsilBankaAd], ["b1", "Ziraat"]);
bekle("ge\u00e7mi\u015fe bir sat\u0131r eklendi", tahsile.gecmis.length, 1);
bekle("sat\u0131r ge\u00e7i\u015fi anlat\u0131yor",
  [tahsile.gecmis[0].oncekiDurum, tahsile.gecmis[0].yeniDurum, tahsile.gecmis[0].islem],
  ["Portf\u00f6yde", "Tahsilde", "Bankaya Tahsile Ver"]);

// AŞAMA AŞAMA İLERLİYOR: tahsildeki çek tahsil edilince geçmiş İKİ satır oluyor, eskisi duruyor.
const tahsilEdildi = cekIslemUygula(tahsile, "tahsil", { tarih: "2026-09-20", kullanici: "Test" });
bekle("ge\u00e7mi\u015f birikiyor", tahsilEdildi.gecmis.length, 2);
bekle("ilk sat\u0131r duruyor", tahsilEdildi.gecmis[0].islem, "Bankaya Tahsile Ver");
bekle("son durum", tahsilEdildi.durum, "Tahsil Edildi");
// Banka bilgisi tahsil edildikten SONRA da duruyor: "hangi bankadan tahsil edildi" sorusu meşru.
bekle("banka bilgisi korunuyor", tahsilEdildi.tahsilBankaAd, "Ziraat");

// İZİN VERİLMEYEN GEÇİŞ SESSİZCE UYGULANMIYOR.
bekle("ciro edilmi\u015fi tekrar ciro etmek null", cekIslemUygula({ durum: "Ciro Edildi" }, "ciro", {}), null);
bekle("bilinmeyen i\u015flem null", cekIslemUygula(portfoyde, "yokboyle", {}), null);

console.log(hata ? "\n\u2500\u2500 \u00c7EK TEST\u0130 BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 \u00e7ek testi temiz \u2500\u2500");
process.exit(hata);
