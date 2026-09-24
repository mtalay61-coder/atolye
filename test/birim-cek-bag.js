// BİRİM TESTİ — ÇEK BAĞI GERİ ALMA KAPISINDA
//
// Kullanıcı (10 Eylül): "Çek bağını kapat."
//
// Çek bir DEFTER ve değişmez kural gereği hem yazma hem geri alma kapısına bağlı olmalı. Üç yön
// açıktı:
//   1. CİRO hareketi silinince çek portföye DÖNMÜYORDU — "Ciro Edildi" kalıyor, cariye verilmiş
//      görünen ama karşılığında hiçbir kaydı olmayan bir çek oluşuyordu.
//   2. İşlem görmüş (ciro edilmiş, tahsile verilmiş…) bir çekin GİRİŞ hareketi silinince
//      `fisGeriAl` çeki durumuna bakmadan SİLİYORDU. "Portföyden çıkmış çek silinemez" kilidi yalnız
//      çek ekranındaydı; bu yol kilidin etrafından dolaşıyordu ve ciro kaydı karşı caride yetim
//      kalıyordu.
//   3. Çek ekranından silinen çekin bağlı giriş hareketi caride kalıyordu (tarayıcı senaryosunda).
const {
  fisGeriAl, cekIslemUygula, cekSilinebilirMi, cekIzinliIslemler, cekHareketKilidi,
  cekIadeHareketi, cekTahsilHesapHareketi, cekIslemGeriAl, hesabaHareketEkle,
} = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};

// ---- VERİ: müşteriden çek alındı, tedarikçiye ciro edildi --------------------------------------
const girisHareketi = {
  id: "h-giris", tarih: "2026-09-10", yon: "Alacak", tutar: 42000, paraBirimi: "TRY",
  odemeSekli: "\u00c7ek", islemTipi: "Tahsilat", fisNo: "THS-20260910-001", aciklama: "M\u00fc\u015fteri \u00e7eki",
};
const ciroHareketi = {
  id: "h-ciro", tarih: "2026-09-10", yon: "Bor\u00e7", tutar: 1000, paraBirimi: "USD",
  odemeSekli: "\u00c7ek", islemTipi: "\u00d6deme", fisNo: "ODM-20260910-001", aciklama: "\u00c7ek cirosu",
  cekId: "c1",
};
const portfoyCeki = {
  id: "c1", durum: "Portf\u00f6yde", tip: "Al\u0131nan", cekNo: "12345", cariId: "musteri",
  tutar: 42000, paraBirimi: "TRY", hareketId: "h-giris", fisNo: "THS-20260910-001",
};
const ciroluCek = cekIslemUygula(portfoyCeki, "ciro", {
  tarih: "2026-09-10", cariId: "tedarikci", cariAd: "Tedarik\u00e7i A",
  tutar: 1000, paraBirimi: "USD", hareketId: "h-ciro", kullanici: "Test",
});

const veriKur = (cek) => ({
  stok: [], siparisler: [], uretim: [], koliler: [],
  cariler: [
    { id: "musteri", unvan: "M\u00fc\u015fteri B", hareketler: [girisHareketi] },
    { id: "tedarikci", unvan: "Tedarik\u00e7i A", hareketler: [ciroHareketi] },
  ],
  muhasebe: { kasalar: [], bankalar: [], cekler: [cek] },
});

// ---- 1. CİRO HAREKETİ SİLİNİNCE ÇEK PORTFÖYE DÖNER ---------------------------------------------
console.log("1. ciro hareketi silinir");
{
  const veri = veriKur(ciroluCek);
  const s = fisGeriAl(veri, { hareketIdler: ["h-ciro"], tarih: "2026-09-11", kullanici: "Test" });
  const cek = ((s.muhasebe || {}).cekler || []).find((c) => c.id === "c1") || {};
  const gecmis = cek.gecmis || [];
  const son = gecmis[gecmis.length - 1] || {};
  bekle("engel yok", s.engel, null);
  bekle("ciro hareketi silindi", s.silinenCari, 1);
  bekle("\u00e7ek S\u0130L\u0130NM\u0130YOR", (s.silinenCekler || []).length, 0);
  bekle("\u00e7ek portf\u00f6ye d\u00f6nd\u00fc", cek.durum, "Portf\u00f6yde");
  // GEÇMİŞ EKLENİR, üzerine yazılmaz: ciro satırı yerinde, arkasına geri alma satırı geliyor.
  bekle("ge\u00e7mi\u015f iki sat\u0131r", gecmis.length, 2);
  bekle("ilk sat\u0131ra dokunulmad\u0131", gecmis[0], ciroluCek.gecmis[0]);
  bekle("geri alma sat\u0131r\u0131 ge\u00e7i\u015fi anlat\u0131yor",
    [son.islem, son.oncekiDurum, son.yeniDurum, son.cariAd, son.hareketId],
    ["Ciro geri al\u0131nd\u0131", "Ciro Edildi", "Portf\u00f6yde", "Tedarik\u00e7i A", "h-ciro"]);
  bekle("hangi sat\u0131r\u0131n geri al\u0131nd\u0131\u011f\u0131 kimlikle ba\u011fl\u0131", son.geriAlinanSatirId, ciroluCek.gecmis[0].id);
  bekle("geri alma an\u0131 ve kullan\u0131c\u0131", [son.tarih, son.kullanici], ["2026-09-11", "Test"]);
  bekle("\u00e7a\u011f\u0131rana bildirildi", (s.geriAlinanCekler || []).map((c) => c.id), ["c1"]);
  bekle("girdi de\u011fi\u015ftirilmedi", veri.muhasebe.cekler[0].durum, "Ciro Edildi");

  // Portföye dönen çek YENİDEN işlem görebilir: ciroyu doğru cariye tekrar yapmak mümkün olmalı.
  bekle("yeniden ciro edilebilir", cekIzinliIslemler(cek).map((i) => i.anahtar).includes("ciro"), true);
  // GERİ ALINMIŞ işlem, silme kilidini TEK BAŞINA tutmaz: net sonuç "hiçbir şey olmadı". Aksi hâlde
  // yanlış bir ciroyu geri alan kullanıcı, çeki ve tahsilatı bir daha hiç silemezdi (çıkmaz sokak).
  bekle("geri al\u0131nm\u0131\u015f ciro silme kilidini tutmaz", cekSilinebilirMi(cek).olur, true);

  // Geri alınmış çekin giriş hareketi artık silinebilir ve çek onunla birlikte gider.
  const veri2 = { ...veriKur(cek), cariler: s.cariler };
  const s2 = fisGeriAl(veri2, { hareketIdler: ["h-giris"] });
  bekle("sonra giri\u015f hareketi silinebilir", s2.engel, null);
  bekle("\u00e7ek giri\u015fiyle birlikte gider", (s2.silinenCekler || []).map((c) => c.id), ["c1"]);
}

// ---- 2. İŞLEM GÖRMÜŞ ÇEKİN GİRİŞ HAREKETİ KİLİTLİ ---------------------------------------------
console.log("2. i\u015flem g\u00f6rm\u00fc\u015f \u00e7ekin giri\u015fi silinmez");
{
  const veri = veriKur(ciroluCek);
  const s = fisGeriAl(veri, { hareketIdler: ["h-giris"] });
  bekle("engel \u00e7ek-i\u015flemde", s.engel && s.engel.sebep, "cek-islemde");
  bekle("HİÇBİR ŞEY DEĞİŞMEDİ \u2014 cariler", s.cariler, veri.cariler);
  bekle("HİÇBİR ŞEY DEĞİŞMEDİ \u2014 \u00e7ekler", s.muhasebe, veri.muhasebe);
  bekle("silinen yok", [s.silinenCari, s.silinenStok, (s.silinenCekler || []).length], [0, 0, 0]);
  // Mesaj NE YAPILACAĞINI söylüyor: hangi carinin ekstresinden hangi fiş silinecek.
  const mesaj = (s.engel && s.engel.mesaj) || "";
  bekle("mesaj ciro fi\u015fini s\u00f6yl\u00fcyor", /ODM-20260910-001/.test(mesaj), true);
  bekle("mesaj al\u0131c\u0131 cariyi s\u00f6yl\u00fcyor", /Tedarik\u00e7i A/.test(mesaj), true);

  // Tahsile verilmiş çek: o aşamanın geri alma yolu yok, mesaj bunu açıkça söylüyor.
  const tahsilde = cekIslemUygula(portfoyCeki, "tahsile", { tarih: "2026-09-10", bankaId: "b1", bankaAd: "Ziraat" });
  const s3 = fisGeriAl(veriKur(tahsilde), { hareketIdler: ["h-giris"] });
  bekle("tahsildeki \u00e7ekin giri\u015fi de kilitli", s3.engel && s3.engel.sebep, "cek-islemde");
  bekle("mesaj a\u015famay\u0131 s\u00f6yl\u00fcyor", /Tahsilde/.test((s3.engel && s3.engel.mesaj) || ""), true);

  // İşlem görmemiş çekin girişi eskisi gibi silinir (v1.80.0 davranışı korunuyor).
  const s4 = fisGeriAl(veriKur(portfoyCeki), { hareketIdler: ["h-giris"] });
  bekle("temiz \u00e7ekte engel yok", s4.engel, null);
  bekle("temiz \u00e7ek giri\u015fiyle gider", (s4.silinenCekler || []).map((c) => c.id), ["c1"]);

  // Kimliği olmayan ESKİ çek: silme de kilit de AYNI eşleşmeyi (fiş numarası) kullanıyor. Biri
  // kimliğe diğeri fişe baksaydı eski kayıtta silme kilidin etrafından dolaşırdı.
  const eski = { ...ciroluCek, hareketId: undefined };
  const s5 = fisGeriAl(veriKur(eski), { hareketIdler: ["h-giris"] });
  bekle("kimliksiz eski \u00e7ekte de kilit", s5.engel && s5.engel.sebep, "cek-islemde");
}

// ---- 3. KİLİT YARDIMCISI (ekranlar da bunu okuyor) ---------------------------------------------
console.log("3. kilit yard\u0131mc\u0131s\u0131");
{
  const veri = veriKur(ciroluCek);
  bekle("giri\u015f hareketi kilitli",
    !!cekHareketKilidi(["h-giris"], veri), true);
  // Ciro hareketinin kendisi KİLİTLİ DEĞİL: onu silmek ciroyu geri almanın yolu.
  bekle("ciro hareketi kilitli de\u011fil", cekHareketKilidi(["h-ciro"], veri), null);
  bekle("ilgisiz hareket kilitli de\u011fil", cekHareketKilidi(["baska"], veri), null);
}

// ---- 4. KENAR DURUMLAR --------------------------------------------------------------------------
console.log("4. kenar durumlar");
{
  // Çek zaten portföydeyse (bayat veri, ikinci silme) çeke dokunulmuyor.
  const s = fisGeriAl(veriKur(portfoyCeki), { hareketIdler: ["h-ciro"] });
  bekle("portf\u00f6ydeki \u00e7eke dokunulmuyor", (s.geriAlinanCekler || []).length, 0);

  // v1.168.0 biçimi: geçmişi olmayan, `ciroHareketId` taşıyan ciro. O da geri dönüyor ve ciro
  // alanları temizleniyor — kalan bir `ciroCariId` çeki hâlâ o cariye verilmiş gösterirdi.
  const eskiCiro = { ...portfoyCeki, durum: "Ciro Edildi", ciroHareketId: "h-ciro", ciroCariId: "tedarikci", ciroTutar: 1000, ciroPB: "USD" };
  const s2 = fisGeriAl(veriKur(eskiCiro), { hareketIdler: ["h-ciro"], tarih: "2026-09-11" });
  const cek = ((s2.muhasebe || {}).cekler || [])[0] || {};
  bekle("eski bi\u00e7im ciro geri d\u00f6n\u00fcyor", cek.durum, "Portf\u00f6yde");
  bekle("ciro alanlar\u0131 temizlendi", [cek.ciroHareketId, cek.ciroCariId, cek.ciroTutar, cek.ciroPB], [undefined, undefined, undefined, undefined]);
}

// ---- 5. İADE CARİ HAREKETİ DOĞURUR -------------------------------------------------------------
// Kullanıcı (10 Eylül): "İade cari hareket doğurur, düzeltmen gereken." Eskiden iade yalnız çekin
// durumunu değiştiriyordu; müşteri, elinde olmayan bir çekle borcunu kapatmış görünüyordu.
console.log("5. iade");
{
  const iade = cekIadeHareketi(portfoyCeki, { girisHareketi, tarih: "2026-09-12", fisNo: "ODM-20260912-001", kullanici: "Test" });
  bekle("alınan çekin iadesi ÖDEME, Borç", [iade.islemTipi, iade.yon], ["\u00d6deme", "Bor\u00e7"]);
  bekle("tutar ve birim giri\u015fin aynas\u0131", [iade.tutar, iade.paraBirimi], [42000, "TRY"]);
  bekle("\u00e7eke ba\u011fl\u0131 ve fi\u015fli", [iade.cekId, iade.fisNo], ["c1", "ODM-20260912-001"]);
  // Giriş başka birimde işlendiyse iade AYNI tutarı yazar: çekin tutarını bugünkü kurla yeniden
  // çevirmek müşterinin bakiyesini tam kapatmazdı.
  const dovizGiris = { ...girisHareketi, tutar: 1000, paraBirimi: "USD" };
  const iade2 = cekIadeHareketi(portfoyCeki, { girisHareketi: dovizGiris, tarih: "2026-09-12", fisNo: "x" });
  bekle("d\u00f6vizli giri\u015fte iade ayn\u0131 d\u00f6vizde", [iade2.tutar, iade2.paraBirimi], [1000, "USD"]);
  // Bakiye tam kapanıyor: giriş (Alacak) + iade (Borç) = 0.
  const net = [girisHareketi, iade].reduce((t, h) => t + (h.yon === "Bor\u00e7" ? h.tutar : -h.tutar), 0);
  bekle("giri\u015f + iade bakiyeyi s\u0131f\u0131rl\u0131yor", net, 0);
  const sahsi = cekIadeHareketi({ ...portfoyCeki, tip: "Verilen" }, { tarih: "2026-09-12", fisNo: "x" });
  bekle("\u015fahsi \u00e7ekin iadesi TAHS\u0130LAT, Alacak", [sahsi.islemTipi, sahsi.yon], ["Tahsilat", "Alacak"]);
  bekle("carisiz \u00e7ekte hareket yok", cekIadeHareketi({ ...portfoyCeki, cariId: null }, { tarih: "x" }), null);

  // GERİ ALMA: iade fişi silinince çek önceki durumuna döner.
  const iadeHareketi = { ...iade, id: "h-iade" };
  const iadeli = cekIslemUygula(portfoyCeki, "iade", {
    tarih: "2026-09-12", cariId: "musteri", cariAd: "M\u00fc\u015fteri B", hareketId: "h-iade", tutar: 42000, paraBirimi: "TRY",
  });
  const veri = {
    ...veriKur(iadeli),
    cariler: [{ id: "musteri", unvan: "M\u00fc\u015fteri B", hareketler: [girisHareketi, iadeHareketi] }],
  };
  // İade edilmiş çekin GİRİŞİ kilitli ve mesaj iade fişini söylüyor.
  const kilit = fisGeriAl(veri, { hareketIdler: ["h-giris"] });
  bekle("iadeli \u00e7ekin giri\u015fi kilitli", kilit.engel && kilit.engel.sebep, "cek-islemde");
  bekle("mesaj iade fi\u015fini ve yolu s\u00f6yl\u00fcyor",
    /ODM-20260912-001/.test(kilit.engel.mesaj) && /iadeyi geri al\u0131n/.test(kilit.engel.mesaj), true);
  const s = fisGeriAl(veri, { hareketIdler: ["h-iade"], tarih: "2026-09-13" });
  const cek = s.muhasebe.cekler[0];
  const son = cek.gecmis[cek.gecmis.length - 1];
  bekle("iade fi\u015fi silinince \u00e7ek portf\u00f6ye d\u00f6ner", cek.durum, "Portf\u00f6yde");
  bekle("geri alma sat\u0131r\u0131", [son.islem, son.oncekiDurum, son.yeniDurum, son.hareketId],
    ["\u0130ade geri al\u0131nd\u0131", "\u0130ade Edildi", "Portf\u00f6yde", "h-iade"]);

  // Tahsilden iade edilen çek, iadesi geri alınınca TAHSİLDE'ye döner (Portföy'e değil).
  const tahsilde = cekIslemUygula(portfoyCeki, "tahsile", { tarih: "2026-09-10", bankaId: "b1", bankaAd: "Ziraat TL" });
  const tahsildenIade = cekIslemUygula(tahsilde, "iade", { tarih: "2026-09-12", cariId: "musteri", hareketId: "h-iade" });
  bekle("tahsilden iade geri al\u0131n\u0131nca Tahsilde", (cekIslemGeriAl(tahsildenIade, new Set(["h-iade"])) || {}).durum, "Tahsilde");
}

// ---- 6. TAHSİL PARAYI HESABA SOKAR -----------------------------------------------------------------
// Kullanıcı (10 Eylül): "Çek ödendiğinde tahsil edildi olup para hangi bankaya verilmiş ise o
// bankanın kasasına girecek."
console.log("6. tahsil");
{
  const tahsilde = cekIslemUygula(portfoyCeki, "tahsile", { tarih: "2026-09-10", bankaId: "b1", bankaAd: "Ziraat TL" });
  const hh = cekTahsilHesapHareketi(tahsilde, { tutar: 42000, tarih: "2026-12-01", cariAd: "M\u00fc\u015fteri B" });
  bekle("al\u0131nan \u00e7ekin tahsili hesaba G\u0130R\u0130\u015e", [hh.yon, hh.tutar, hh.cekId], ["Giri\u015f", 42000, "c1"]);
  bekle("cari yok \u2014 bor\u00e7 \u00e7ek al\u0131n\u0131rken kapand\u0131", hh.cariId, undefined);
  bekle("\u015fahsi \u00e7ekin tahsili hesaptan \u00c7IKI\u015e",
    cekTahsilHesapHareketi({ ...tahsilde, tip: "Verilen" }, { tutar: 1, tarih: "x" }).yon, "\u00c7\u0131k\u0131\u015f");

  const muhasebe = { kasalar: [{ id: "k1", ad: "TL Kasa", hareketler: [] }],
    bankalar: [{ id: "b1", ad: "Ziraat TL", hareketler: [{ id: "eski" }] }, { id: "b2", ad: "Diger", hareketler: [] }] };
  const yeni = hesabaHareketEkle(muhasebe, "banka", "b1", { ...hh, id: "mh-1" });
  bekle("hareket do\u011fru bankaya, en \u00fcste", yeni.bankalar[0].hareketler.map((h) => h.id), ["mh-1", "eski"]);
  bekle("di\u011fer hesaplara dokunulmad\u0131", [yeni.bankalar[1].hareketler.length, yeni.kasalar[0].hareketler.length], [0, 0]);
  bekle("girdi de\u011fi\u015fmedi", muhasebe.bankalar[0].hareketler.length, 1);

  const tahsilEdilmis = cekIslemUygula(tahsilde, "tahsil", {
    tarih: "2026-12-01", tutar: 42000, paraBirimi: "TRY",
    hesapHareketId: "mh-1", hesapTur: "banka", hesapId: "b1", hesapAd: "Ziraat TL",
  });
  bekle("tahsil sat\u0131r\u0131 hesap ba\u011f\u0131n\u0131 ta\u015f\u0131yor",
    [tahsilEdilmis.durum, tahsilEdilmis.gecmis[1].hesapHareketId, tahsilEdilmis.gecmis[1].hesapAd], ["Tahsil Edildi", "mh-1", "Ziraat TL"]);

  // GERİ ALMA: banka hareketi silinince çek Tahsilde'ye döner.
  const geri = cekIslemGeriAl(tahsilEdilmis, new Set(["mh-1"]), { tarih: "2026-12-02" });
  bekle("banka hareketi silinince Tahsilde", geri && geri.durum, "Tahsilde");
  bekle("geri alma sat\u0131r\u0131", geri && [geri.gecmis[2].islem, geri.gecmis[2].hesapHareketId],
    ["Tahsil geri al\u0131nd\u0131", "mh-1"]);
  bekle("ilgisiz hareket \u00e7eke dokunmuyor", cekIslemGeriAl(tahsilEdilmis, new Set(["baska"])), null);

  // Tahsil edilmiş çekin girişi kilitli; mesaj hangi hesaptan neyin silineceğini söylüyor.
  const k = fisGeriAl(veriKur(tahsilEdilmis), { hareketIdler: ["h-giris"] });
  bekle("tahsil edilmi\u015f \u00e7ekin giri\u015fi kilitli", k.engel && k.engel.sebep, "cek-islemde");
  bekle("mesaj hesab\u0131 ve yolu s\u00f6yl\u00fcyor", /Ziraat TL/.test(k.engel.mesaj) && /tahsili geri al\u0131n/.test(k.engel.mesaj), true);
  // Tahsili geri alınan çek hâlâ Tahsilde: o aşamanın geri alma yolu yok, kilit sürüyor.
  const k2 = fisGeriAl(veriKur(geri), { hareketIdler: ["h-giris"] });
  bekle("tahsil geri al\u0131n\u0131nca kilit Tahsilde a\u015famas\u0131yla s\u00fcr\u00fcyor", /Tahsilde/.test((k2.engel || {}).mesaj || ""), true);
}

console.log(hata ? "\n\u2500\u2500 \u00c7EK BA\u011eI TEST\u0130 BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 \u00e7ek ba\u011f\u0131 testi temiz \u2500\u2500");
process.exit(hata);
