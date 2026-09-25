/* ================= CARİ MODÜLÜ ================= */

const CARI_TIPLERI = ["Müşteri", "Tedarikçi", "Personel", "Her İkisi"];
const CARI_TIP_RENK = { "Müşteri": "var(--erp-primary)", "Tedarikçi": "var(--erp-brown)", "Personel": "var(--erp-purple)", "Her İkisi": "#C97B3D" };
const ODEME_SEKILLERI = ["Nakit", "Havale/EFT", "Kredi Kartı", "Çek", "Senet"];
// İŞÇİLİK kendi rengiyle (23 Eylül, v1.433.0): alışla aynı kahverengi olsaydı ekstrede yine
// "mal almışız" izlenimi sürerdi — işçilik bir HİZMET alımı, mal girişi yok.
const HAREKET_TIPI_RENK = { "Alış": "var(--erp-brown)", "Satış": "var(--erp-info)", "Ödeme": "var(--erp-warn)", "Tahsilat": "var(--erp-primary)", "İşçilik": "var(--erp-accent)" };

// Tüm carilerin hareketlerini tarayıp fiş no'ya göre gruplar; sipariş no önekinden (SAT-/ALS-/SP-) tipini çıkarır.
function tumFisleriTopla(cariler, stok) {
  const tumHareketler = [];
  (cariler || []).forEach((c) => {
    (c.hareketler || []).forEach((h) => {
      tumHareketler.push({ ...h, kaynakTip: "cari", cariId: c.id, cariAd: c.unvan, cariTip: c.tip });
    });
  });
  (stok || []).forEach((p) => {
    (p.hareketler || []).forEach((h) => {
      tumHareketler.push({ ...h, kaynakTip: "stok", urunAd: h.urunAd || p.ad, cariAd: h.cariAd || null });
    });
  });

  const gruplar = [];
  const index = {};
  tumHareketler.forEach((h) => {
    const key = h.fisNo ? `fis__${h.fisNo}` : `tek__${h.id}`;
    if (!(key in index)) {
      index[key] = gruplar.length;
      gruplar.push({
        // `zaman` varsa o kullanılır: cari hareketleri günü `tarih`te, saati `zaman`da tutuyor.
        // Yalnızca `tarih`e bakmak, işçilik fişlerini saatsiz gösteriyordu.
        key, fisNo: h.fisNo, siparisNo: h.siparisNo, siparisId: h.siparisId || null, uretimId: h.uretimId || null,
        tarih: h.zaman || h.tarih,
        cariId: h.cariId || null, cariAd: h.cariAd || null, cariTip: h.cariTip, hareketler: [],
      });
    } else if (h.cariAd && !gruplar[index[key]].cariAd) {
      gruplar[index[key]].cariAd = h.cariAd;
      gruplar[index[key]].cariId = h.cariId;
    }
    gruplar[index[key]].hareketler.push(h);
  });

  return gruplar.map((g) => {
    const cariSatirlari = g.hareketler.filter((h) => h.kaynakTip === "cari");
    const toplam = cariSatirlari.reduce((s, h) => s + (h.tutar || 0), 0);
    // PARA BİRİMİ fişin kendi para birimidir. Toplam ekranda sabit "₺" ile yazılıyordu: dolar
    // kesilmiş bir fiş "18,67 ₺" görünüyor, rakam doğru ama para birimi YANLIŞ okunuyordu.
    // Fiş tek para biriminde yazılır (kalemler kayıt para birimine çevrilir); yine de karışık
    // bir eski kayıt gelirse ilk satırınki esas alınır.
    const paraBirimi = (cariSatirlari[0] || {}).paraBirimi || "TRY";
    const odemeSekli = (cariSatirlari[0] || {}).odemeSekli || null;
    const vade = (cariSatirlari[0] || {}).vade || null;
    let tip = "Diğer";
    // Cari kartından kesilen fişler: AF- (Cariden Alış), SF- (Cariye Satış). Bu önekler
    // tanınmıyordu, bütün fiş fişleri "Diğer" olarak listeleniyor ve tip süzgeci işe yaramıyordu.
    // TEK SÖZLÜK (kullanıcı, 17 Eylül: "resimde Alış ve Cariden Alış var... bunları tek yere
    // bağlamıştık, kodları da tek yere bağlansın").
    //
    // Aynı iş iki ayrı etiketle listeleniyordu: cari kartından kesilen alış "Cariden Alış" (AF-),
    // siparişten gelen alış "Alış" (ALS-). İkisi de ALIŞ; nereden kesildiği fişin İÇİNDE görünüyor
    // (sipariş bağı var mı). İki etiket, tip süzgecini de ikiye bölüyordu: "alışlar" derken biri
    // gözden kaçıyordu.
    if (g.fisNo && (g.fisNo.startsWith("AF-") || g.fisNo.startsWith("ALS-"))) tip = "Alış";
    else if (g.fisNo && (g.fisNo.startsWith("SF-") || g.fisNo.startsWith("SAT-"))) tip = "Satış";
    // PARA HAREKETLERİ: THS- tahsilat, ODM- ödeme. Bu iki önek TANINMIYORDU ve hepsi "Diğer"e
    // düşüyordu — çek cirosu da ODM- numarası aldığı için orada kayboluyordu (kullanıcı bildirdi,
    // 6 Eylül: "fişlerde çek çıkışı diğer işlemlere atıyor, aslında işlemi biliyor").
    // Numara zaten işlemi söylüyordu; okunmuyordu.
    else if (g.fisNo && g.fisNo.startsWith("THS-")) tip = "Tahsilat";
    else if (g.fisNo && g.fisNo.startsWith("ODM-")) tip = "Ödeme";

    else if (g.fisNo && /^\d/.test(g.fisNo)) {
      // Üretim sipariş kodları artık salt sayısal (örn. "1023") — SAT-/ALS- ile başlamayıp
      // rakamla başlayan fişler üretime aittir.
      // "-Giriş" ekiyle biten fişler MAMUL GİRİŞİDİR; diğerleri o prosesteki hammadde tüketimi.
      //
      // Önceden ikisi aynı fişteydi ve tip yalnızca `fisNo === siparisNo` ile ayrılıyordu — bu da
      // pratikte hiç tutmuyordu: mamul girişi proses ekli fişin içinde kalıyor ve "Üretim Çıkışı"
      // etiketiyle listeleniyordu. Bir çıkış fişinin içinde mamulün stoğa girdiğini görmek,
      // hem muhasebe mantığına aykırıydı hem de takibi zorlaştırıyordu.
      // Sıra önemli: "-İşçilik" önce bakılır. Aksi hâlde rakamla başlayan her fiş "Üretim
      // Çıkışı" sayılıp işçilik fişleri hammadde çıkışlarının arasında kaybolurdu.
      if (g.fisNo.endsWith("-İşçilik")) tip = "İşçilik";
      else tip = (g.fisNo.endsWith("-Giriş") || g.fisNo === g.siparisNo) ? "Üretim Girişi" : "Üretim Çıkışı";
    }
    return { ...g, toplam, tip, paraBirimi, odemeSekli, vade };
  }).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
}

const FIS_TIP_RENK = {
  "Satış": "var(--erp-info)", "Alış": "var(--erp-brown)",
  // Cari kartından kesilen fişler, sipariş fişleriyle aynı renk ailesinde ama ayrı etiketle:
  // ikisi farklı belgeler (biri siparişin teslimi, diğeri doğrudan alım).
  "Cariye Satış": "var(--erp-info)", "Cariden Alış": "var(--erp-brown)",
  "Üretim Girişi": "var(--erp-primary)", "Üretim Çıkışı": "var(--erp-warn)",
  "İşçilik": "var(--erp-purple)", "Diğer": "var(--erp-text-2)",
  // Para hareketleri cari ekstresindeki renklerle AYNI (bkz. HAREKET_TIPI_RENK): aynı olay iki
  // ekranda iki farklı renkte görünmesin.
  "Tahsilat": "var(--erp-primary)", "Ödeme": "var(--erp-warn)",
};

// ---- Muhasebe: Kasa / Banka / Çek ----
// Basit, bağımsız bir modül — cari hesaplardan farklı olarak, işletmenin KENDİ nakit/banka/çek
// varlıklarını (dış cari ile ilişkilendirilebilir) takip eder. Her hesabın kendi hareket listesi
// (giriş/çıkış) vardır; bakiye bu hareketlerden TÜRETİLİR (ayrı bir alanda tutulmaz), böylece bakiye
// ile hareket geçmişi arasında hiçbir zaman tutarsızlık oluşmaz.
// CARİ HAREKETİNİN YÖNÜ — TEK KURAL, TEK YER.
//
// Bakiye `Borç − (diğer her şey)` olarak toplanıyor: pozitif bakiye "cari BİZE borçlu",
// negatif bakiye "biz cariye borçluyuz" demek.
//
//   Satış     → müşteri bize borçlanır      → "Borç"    (+)
//   Tahsilat  → o borcu kapatır             → "Alacak"  (−)
//   Alış      → biz tedarikçiye borçlanırız → "Alacak"  (−)
//   Ödeme     → o borcu kapatır             → "Borç"    (+)
//   İşçilik   → biz personele borçlanırız   → "Alacak"  (−)   hizmet alımı: alışla aynı yön
//
// TARİHÇE: kural iki kez yanlış kuruldu. Önce satış "Alacak" yazıyordu (müşteriye mal satmak
// bakiyeyi DÜŞÜRÜYORDU); v1.43.0'da düzeltilirken alış da "Borç"a çekildi ve bu sefer alış ile
// satış AYNI yöne gitti — "alışta da satışta da bakiye artıyor". İkisinin de tek bir yerden
// türetilmemesi bu iki hatanın da sebebi. Artık her çağrı yeri buradan soruyor.
// ÜÇÜNCÜ KEZ (v1.409.0): üretim işçiliği iki yerde ELLE "Borç" yazılıyordu, bu fonksiyona hiç
// sormuyordu — personel bize borçlu görünüyor, ona yapılan ödeme bakiyeyi büyütüyordu.
function hareketYonu(tip) {
  return tip === "Satış" || tip === "Ödeme" ? "Borç" : "Alacak";
}

// CARİ BAKİYESİ PARA BİRİMİ BAZINDA.
//
// Eskiden bütün hareketlerin `tutar` alanı toplanıp sonuna "₺" konuyordu. Hareketler kendi para
// birimlerini taşıdığı için bu iki ayrı hata üretiyordu:
//   - Tek para birimi EUR olan carinin bakiyesi doğru sayıyla ama YANLIŞ sembolle görünüyordu.
//   - TRY ve EUR hareketleri olan caride sayılar TOPLANIYORDU: 100 ₺ + 50 € = 150 gibi, yapılmamış
//     bir kur çevrimini yapılmış gibi gösteren anlamsız bir rakam.
// Ekstre satırlarındaki koşan bakiye zaten para birimi bazında hesaplanıyordu; kart başlığı ile
// liste ondan ayrışmıştı.
function cariBakiyeleri(cari, defter) {
  const toplam = {};
  ((cari && cari.hareketler) || [])
    // `defterKapsar`: "Muhasebe" kaydı hem Genel hem Resmi bakiyesine giriyor. Kasa
    // tarafındaki kuralın aynısı; iki taraf ayrışmasın diye tek fonksiyon.
    .filter((h) => defterKapsar(h.defter, defter))
    .forEach((h) => {
      const pb = h.paraBirimi || "TRY";
      toplam[pb] = (toplam[pb] || 0) + (h.yon === "Borç" ? (h.tutar || 0) : -(h.tutar || 0));
    });
  // Sıfırlananlar düşer: kapanmış bir para birimini "0 €" diye taşımak gürültü.
  Object.keys(toplam).forEach((pb) => { if (stokYuvarla(toplam[pb]) === 0) delete toplam[pb]; });
  return toplam;
}

// Bakiye sözlüğünü okunur metne çevirir. Boşsa "0 ₺" (varsayılan para birimi).
function bakiyeMetni(bakiyeler, isaretli = true) {
  const girdiler = Object.entries(bakiyeler || {});
  if (girdiler.length === 0) return "0 ₺";
  return girdiler
    .map(([pb, t]) => `${isaretli && t > 0 ? "+" : ""}${t.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`)
    .join(" · ");
}

// BAKİYE RENGİ — TEK KURAL.
//
// Pozitif bakiye "cari BİZE borçlu" (bizim alacağımız) → yeşil.
// Negatif bakiye "biz cariye borçluyuz" → kırmızı. Sıfır nötr.
//
// Neden tek yerde: aynı bakiye kart başlığında YEŞİL, ekstrenin toplam satırında KIRMIZI
// görünüyordu — toplam satırı kuralı ters kurmuştu ve üstelik işareti `Math.abs` ile silip
// yönü yalnızca renge bırakıyordu. Aynı sayının iki ekranda iki farklı renkte olması,
// "hangisi doğru" sorusunu doğuruyordu.
function bakiyeRengi(deger) {
  if (deger > 0) return "var(--erp-primary)";
  if (deger < 0) return "var(--erp-warn)";
  return "var(--erp-text-3)";
}

// Renk kararı için tek sayı gerekiyor (artı yeşil, eksi kırmızı). Para birimleri karışıksa
// hepsi aynı yöndeyse o yön, değilse 0 (nötr) döner — uydurma bir toplam üretmeden.
function bakiyeYonu(bakiyeler) {
  const degerler = Object.values(bakiyeler || {});
  if (degerler.length === 0) return 0;
  if (degerler.every((t) => t > 0)) return 1;
  if (degerler.every((t) => t < 0)) return -1;
  return 0;
}

// DEFTER KAPSAMI — "Muhasebe" ÜÇÜNCÜ BİR DEFTER DEĞİL, "ikisine de" demek.
//
// Kullanıcı (6 Eylül): "Muhasebe seçili olduğunda hem genel hem de resmi kayda işlemesi
// gerekiyor." Ekranda etiketi zaten "Muhasebe (ikisine de)" yazıyordu ama süzgeç `=== "Genel"`
// diye baktığı için kayıt HİÇBİR deftere girmiyordu: Genel toplamında yok, Resmi toplamında yok,
// yalnız "Tümü"de görünüyordu. Etiket bir şey vaat edip hesap başka şey yapıyordu.
//
// Kasa/banka tarafında "Muhasebe" TEK KAYIT olarak duruyor (cari tarafındaki gibi ikiye
// bölünmüyor). Bu bilinçli: bölünseydi hesabın GENEL bakiyesi aynı parayı iki kez sayardı ve
// ikinci kaydı toplamdan ayıklamak için her yere bir istisna eklemek gerekirdi. Tek kayıt +
// kapsam kuralı, hem toplamı hem kırılımı doğru tutuyor.
// KUR HANGİ YÖNDE SORULUR
//
// Kullanıcı (6 Eylül): "Ters mantık var, ben EUR kurunu biliyorum, sadece onu girip kendi işlemini
// yapsın. Kura yapılan kafa karıştırıcı — ben EUR kurunun 56 olduğunu biliyorum."
//
// Muhasebe formu kuru `1 TRY = ? EUR` yönünde soruyordu (0,0179). Kimsenin kafasında kur böyle
// durmuyor: piyasada kur her zaman "1 döviz kaç TL" diye konuşulur. Ondalıklı bir ters kur hem
// yazması zor hem yuvarlama hatasına açık.
//
// KURAL: TRY taraflardan biriyse soru DÖVİZ üzerinden sorulur ("1 EUR = ? TRY") ve hesap yönü
// buna göre ayarlanır. İki taraf da dövizse çapraz kur kaçınılmaz; o zaman doğrudan sorulur.
//
// `bolme`: kasadan cariye giderken tutarın BÖLÜNECEĞİNİ söyler. TL kasadan EUR cariye 3655 ₺
// işlenirken 3655 / 56 = 65,27 € olur — çarpmak 204.680 € gibi anlamsız bir sayı verirdi.
function kurSorusu(hesapPB, hedefPB, kurlar) {
  if (!hesapPB || !hedefPB || hesapPB === hedefPB) return null;
  const k = kurlar || {};
  if (hesapPB === "TRY") return { a: hedefPB, b: "TRY", bolme: true, onerilen: k[hedefPB] || null };
  if (hedefPB === "TRY") return { a: hesapPB, b: "TRY", bolme: false, onerilen: k[hesapPB] || null };
  // İki taraf da döviz: çapraz kur. Öneri iki TL kurundan türetiliyor.
  return {
    a: hesapPB, b: hedefPB, bolme: false,
    onerilen: (k[hesapPB] && k[hedefPB]) ? Math.round((k[hesapPB] / k[hedefPB]) * 10000) / 10000 : null,
  };
}

// Kuru uygular. Yön `kurSorusu`dan gelen `bolme` ile belirleniyor; çağıranın yeniden karar
// vermesi, iki yerin ayrışması demekti.
function kurUygula(tutar, kur, bolme) {
  if (!(kur > 0) || !(tutar >= 0)) return null;
  return Math.round((bolme ? tutar / kur : tutar * kur) * 100) / 100;
}

// KURU HEDEF TUTARDAN GERİ HESAPLAR — çevirinin İKİNCİ yönü.
//
// Kullanıcı (6 Eylül): "Cari için 42000 TL ödeme verdi ve 1000 USD tutuluyor. Kur ayarlamak
// yerine cariye işlenecek olan yere 1000 yazdığımızda kuru otomatik düzenlesin. Bu kural tüm
// para birimi çeviricilerde olsun."
//
// Pratikte hangi sayının bilindiği duruma göre değişiyor: bazen kur ("bugün euro 56"), bazen
// karşı taraftaki tutar ("1000 dolara sayıyoruz"). Tek yönlü bir form, bilinmeyeni bilinenden
// elle hesaplatıyordu — ondalıklı kur girip tutmasını beklemek gibi.
//
// `bolme` yönü `kurSorusu`dan gelir; burada tersi alınıyor.
function kurTersHesapla(tutar, hedefTutar, bolme) {
  if (!(tutar > 0) || !(hedefTutar > 0)) return null;
  const kur = bolme ? tutar / hedefTutar : hedefTutar / tutar;
  return Math.round(kur * 10000) / 10000;
}

// ================= ÇEK YAŞAM DÖNGÜSÜ =================
//
// Kullanıcı (6 Eylül): "Çek hareketi 'ciro et' yetersiz bir işlem. Çeki iade et, bankaya tahsil
// için ver olmalı (bankaya tahsile ver seçildiğinde banka seçilmeli, takip için hangi bankada
// tahsil bekliyor). Ciro edilen çek silinememeli, aşama aşama ilerlediği için. Ciro edilen çekin
// geçmişi görünmeli."
//
// Çek TEK BİR OLAY DEĞİL, bir SÜREÇ: alınır, ciro edilir ya da bankaya verilir, tahsil edilir ya
// da karşılıksız çıkar, iade edilebilir. Durumu tek bir açılır listeden seçtirmek bu süreci
// görünmez kılıyordu — hangi aşamadan hangisine geçilebileceği de yazılı değildi.
//
// HANGİ İŞLEM HANGİ DURUMDA YAPILABİLİR. Liste, "buradan nereye gidilebilir"i tek yerde
// tanımlıyor; ekran bunu okuyor, kendi kararını vermiyor.
const CEK_ISLEMLERI = {
  ciro: {
    ad: "Ciro Et",
    aciklama: "Çeki başka bir cariye ver — o cariye olan borcun azalır",
    izinliDurumlar: ["Portföyde"],
    yeniDurum: "Ciro Edildi",
    cariGerekli: true,
  },
  iade: {
    ad: "İade Et",
    aciklama: "Çeki VEREN cariye geri ver — ondan olan alacağın geri doğar",
    izinliDurumlar: ["Portföyde", "Tahsilde"],
    yeniDurum: "İade Edildi",
    cariGerekli: false,   // iade edilecek cari çekin kendi carisi
  },
  tahsile: {
    ad: "Bankaya Tahsile Ver",
    aciklama: "Çeki tahsil için bankaya ver — hangi bankada beklediği takip edilir",
    izinliDurumlar: ["Portföyde"],
    yeniDurum: "Tahsilde",
    bankaGerekli: true,
  },
  tahsil: {
    ad: "Tahsil Edildi",
    aciklama: "Çekin bedeli hesaba geçti — tahsildeki çekte parası verildiği bankaya girer",
    izinliDurumlar: ["Portföyde", "Tahsilde"],
    yeniDurum: "Tahsil Edildi",
    hesapGerekli: true,
  },
  karsiliksiz: {
    ad: "Karşılıksız Çıktı",
    aciklama: "Çek ödenmedi — alacak yeniden doğar",
    izinliDurumlar: ["Portföyde", "Tahsilde"],
    yeniDurum: "Karşılıksız",
  },
};

// Bir çekte YAPILABİLECEK işlemler. Ekran bu listeyi çiziyor; "neden bu düğme yok" sorusunun
// cevabı tek yerde.
function cekIzinliIslemler(cek) {
  const durum = (cek && cek.durum) || "Portföyde";
  return Object.entries(CEK_ISLEMLERI)
    .filter(([, tanim]) => tanim.izinliDurumlar.includes(durum))
    .map(([anahtar, tanim]) => ({ anahtar, ...tanim }));
}

// ETKİN GEÇMİŞ — geri alınmamış işlemler.
//
// Geçmiş EKLENİR, üzerine yazılmaz; bir işlem geri alındığında o satır silinmiyor, arkasına
// `geriAlma: true` ve `geriAlinanSatirId` taşıyan bir satır ekleniyor. Ama "bu çek bir aşamadan
// geçti mi" sorusunda geri alınmış işlem ile geri alma satırı birbirini götürür: net sonuç, hiçbir
// şey olmamasıdır.
//
// Bu ayrım yapılmasaydı yanlış bir ciroyu geri alan kullanıcı, çeki ve tahsilatını BİR DAHA HİÇ
// silemezdi — geçmiş dolu olduğu için kilit kalkmazdı. Çıkmaz sokak (bkz. 5m, 7e).
function cekEtkinGecmis(cek) {
  const gecmis = (cek && cek.gecmis) || [];
  const geriAlinan = new Set(gecmis.map((g) => g.geriAlinanSatirId).filter(Boolean));
  return gecmis.filter((g) => !g.geriAlma && !geriAlinan.has(g.id));
}

// ÇEK SİLİNEBİLİR Mİ.
//
// Kullanıcı: "Ciro edilen çek silinememeli, aşama aşama ilerlediği için." Portföyden çıkmış bir
// çek karşı tarafta bir kayıt doğurmuştur (ciroda cari hareketi, tahsilde banka takibi); silmek o
// kayıtları yetim bırakır. Geçmişi olan çek de silinemez: geçmiş, olmuş bir şeyin kaydıdır.
// Yalnız ETKİN geçmiş sayılıyor — geri alınmış işlem olmuş sayılmaz (bkz. `cekEtkinGecmis`).
function cekSilinebilirMi(cek) {
  if (!cek) return { olur: false, sebep: "Çek bulunamadı" };
  if ((cek.durum || "Portföyde") !== "Portföyde") {
    return { olur: false, sebep: `Çek "${cek.durum}" aşamasında — portföyden çıkmış çek silinemez` };
  }
  if (cekEtkinGecmis(cek).length > 0) {
    return { olur: false, sebep: "Bu çekin işlem geçmişi var — geçmişi olan çek silinemez" };
  }
  return { olur: true, sebep: "" };
}

// ================= ÇEK BAĞI — GERİ ALMA KAPISI =================
//
// Kullanıcı (10 Eylül): "Çek bağını kapat."
//
// Çek bir DEFTER; değişmez kural gereği yazma kapısına bağlandığı gibi GERİ ALMA kapısına da
// bağlı olmalı. Bir çek iki tür cari hareketine bağlanıyor ve ikisinin geri alınması farklı:
//
//   GİRİŞ hareketi (tahsilat/ödeme — `cek.hareketId`) → çekin DOĞDUĞU kayıt.
//     İşlem görmemiş çekte giriş silinince çek de gider (v1.80.0).
//     İşlem görmüş çekte giriş SİLİNEMEZ: çek karşı tarafta kayıt doğurmuştur (ciro hareketi,
//     banka takibi). Eskiden `fisGeriAl` bu durumda çeki sessizce siliyor, ciro kaydını karşı
//     caride yetim bırakıyordu — çek ekranındaki silme kilidinin etrafından dolaşan bir yol.
//
//   İŞLEM kaydı (ciro/iade: `gecmis[].hareketId`; tahsil: `gecmis[].hesapHareketId`) → çekin bir
//     AŞAMASI. Silinince çek bir önceki durumuna döner ve geçmişe "… geri alındı" satırı eklenir.
//     Eskiden çek "Ciro Edildi" kalıyordu: cariye verilmiş görünen ama karşılığında kayıt
//     olmayan bir çek.
//
// KİLİT VE SİLME AYNI EŞLEŞMEYİ KULLANIYOR (`cekGirisHareketineBagliMi`). Biri kimliğe diğeri
// fiş numarasına baksaydı, kimliksiz eski kayıtta silme kilidin etrafından dolaşırdı.

// Çek, silinen hareketlerden birinde mi DOĞDU? Bağ `hareketId`; kimliği olmayan eski kayıtta
// (v1.78.0 öncesi) fiş numarası.
function cekGirisHareketineBagliMi(cek, hareketIdler, silinenFisNolar) {
  if (!cek) return false;
  if (cek.hareketId) return hareketIdler.has(cek.hareketId);
  return !!cek.fisNo && silinenFisNolar.has(cek.fisNo);
}

// Silinmek istenen hareketler arasında İŞLEM GÖRMÜŞ bir çekin girişi var mı. Varsa sebebini ve
// NE YAPILACAĞINI söyleyen bir kilit döner; yoksa null. `fisGeriAl` ve ekranlar bunu okuyor —
// kural tek yerde.
function cekHareketKilidi(hareketIdler, { cariler, muhasebe }) {
  const idler = hareketIdler instanceof Set ? hareketIdler : new Set([...(hareketIdler || [])].filter(Boolean));
  if (idler.size === 0) return null;
  const tumHareketler = (cariler || []).flatMap((c) => (c.hareketler || []).map((h) => ({ cari: c, hareket: h })));
  const silinenFisNolar = new Set(tumHareketler
    .filter(({ hareket }) => idler.has(hareket.id) && hareket.fisNo)
    .map(({ hareket }) => hareket.fisNo));

  for (const cek of (muhasebe && muhasebe.cekler) || []) {
    if (!cekGirisHareketineBagliMi(cek, idler, silinenFisNolar)) continue;
    const silinebilir = cekSilinebilirMi(cek);
    if (silinebilir.olur) continue;

    const cekAdi = cek.cekNo ? `${cek.cekNo} numaralı çek` : "Bağlı çek";
    const durum = cek.durum || "Portföyde";
    const geriAlma = CEK_GERI_ALMA[durum];
    // Durumu doğuran işlemin satırı: son etkin satır ve yeni durumu çekin şimdiki durumu.
    const satir = [...cekEtkinGecmis(cek)].reverse().find((g) => g.yeniDurum === durum);
    let mesaj;
    if (geriAlma && satir && satir.hesapHareketId) {
      // TAHSİL: para bir kasa/bankaya girdi. Geri alma yolu o hesaptaki kaydı silmek.
      const tur = satir.hesapTur === "kasa" ? "Kasa" : "Banka";
      const hesapAd = satir.hesapAd || satir.bankaAd || "ilgili hesap";
      mesaj = `${cekAdi} ${hesapAd} hesabına tahsil edilmiş — bu hareket silinemez. Önce tahsili geri alın: ` +
        `Kasa & Banka > ${tur} > ${hesapAd} hareketlerinden bu çekin tahsil kaydını silin, çek "${satir.oncekiDurum}" durumuna döner.`;
    } else if (geriAlma && (satir ? satir.hareketId : cek.ciroHareketId)) {
      // CİRO / İADE: bir cariye hareket yazıldı. Geri alma yolu o fişi silmek; hangi caride hangi
      // fiş olduğunu söylüyoruz.
      const hareketId = (satir && satir.hareketId) || cek.ciroHareketId;
      const bulunan = tumHareketler.find(({ hareket }) => hareket.id === hareketId);
      const karsi = (bulunan && bulunan.cari.unvan) || (satir && satir.cariAd) || "ilgili cari";
      const fisNo = bulunan && bulunan.hareket.fisNo;
      mesaj = `${cekAdi} ${karsi} carisine ${geriAlma.fiil} — bu hareket silinemez. Önce ${geriAlma.isim} geri alın: ` +
        `${karsi} ekstresinden ${fisNo ? `${fisNo} fişini` : `${geriAlma.isim} hareketini`} silin, ` +
        `çek "${(satir && satir.oncekiDurum) || "Portföyde"}" durumuna döner.`;
    } else if (durum !== "Portföyde" && CEK_DURUM_GERI_ALMA[durum]) {
      mesaj = `${cekAdi} "${durum}" aşamasında — giriş hareketi silinemez. Önce Çek & Senet ekranında ` +
        `çekin "Son İşlemi Geri Al" düğmesiyle çeki portföye döndürün.`;
    } else if (durum !== "Portföyde") {
      mesaj = `${cekAdi} "${durum}" aşamasında — bu aşamanın geri alma yolu olmadığı için çekin giriş ` +
        `hareketi silinemez.`;
    } else {
      mesaj = `${cekAdi}: ${silinebilir.sebep} — giriş hareketi silinemez.`;
    }
    return { sebep: "cek-islemde", cekId: cek.id, cekNo: cek.cekNo || null, durum, mesaj };
  }
  return null;
}

// GERİ ALINABİLEN AŞAMALAR — bağlı bir kayıt doğuranlar.
//
// Bir aşama ancak KARŞILIĞINDA SİLİNEBİLECEK BİR KAYIT varsa geri alınabilir: o kaydın silinmesi
// aşamayı da geri alır (değişmez kural — silme hangi uçtan başlarsa başlasın aynı sonuç).
//   Ciro Edildi   → alıcı cariye ödeme hareketi
//   İade Edildi   → çeki veren cariye ters hareket
//   Tahsil Edildi → paranın girdiği kasa/banka hareketi
// Tahsilde ve Karşılıksız bir kayıt doğurmuyor; onların geri alma yolu yok.
const CEK_GERI_ALMA = {
  "Ciro Edildi": { etiket: "Ciro geri alındı", isim: "ciroyu", fiil: "ciro edilmiş", not: "Ciro hareketi silindi" },
  "İade Edildi": { etiket: "İade geri alındı", isim: "iadeyi", fiil: "iade edilmiş", not: "İade hareketi silindi" },
  "Tahsil Edildi": { etiket: "Tahsil geri alındı", isim: "tahsili", fiil: "tahsil edilmiş", not: "Tahsil kaydı silindi" },
};

// Bağlı kaydı (cari hareketi ya da kasa/banka hareketi) silinen çeki bir önceki durumuna
// döndürür. Çekin şimdiki durumunu doğuran işlem bu kayıtlardan birine bağlı DEĞİLSE null.
//
// Geri alınabilen aşamaların üçü de SON aşama (o durumdaki çekte başka işlem yapılamıyor, bkz.
// CEK_ISLEMLERI), yani geri almak zinciri ortasından koparmıyor — üretimdeki "sondan geriye"
// kuralının karşılığı kendiliğinden sağlanıyor. Yine de yalnız ŞİMDİKİ durumu doğuran satıra
// bakılıyor: eski bir satırın kaydı bir şekilde silinirse aradaki aşamalar atlanmasın.
function cekIslemGeriAl(cek, silinenIdler, { tarih, kullanici } = {}) {
  if (!cek) return null;
  const durum = cek.durum || "Portföyde";
  const tanim = CEK_GERI_ALMA[durum];
  if (!tanim) return null;
  const satir = [...cekEtkinGecmis(cek)].reverse().find((g) => g.yeniDurum === durum);
  const satirEslesti = !!satir && [satir.hareketId, satir.hesapHareketId].some((id) => id && silinenIdler.has(id));
  // v1.168.0 biçimi: geçmişsiz ciro, bağ `ciroHareketId` alanında.
  const eskiBicim = !satir && durum === "Ciro Edildi" && cek.ciroHareketId && silinenIdler.has(cek.ciroHareketId);
  if (!satirEslesti && !eskiBicim) return null;

  const yeniDurum = (satir && satir.oncekiDurum) || "Portföyde";
  const { ciroCariId, ciroTarihi, ciroHareketId, ciroTutar, ciroPB, ...kalan } = cek;
  return {
    ...kalan,
    durum: yeniDurum,
    gecmis: [...(cek.gecmis || []), {
      id: uid("cekh"),
      islem: tanim.etiket,
      oncekiDurum: durum,
      yeniDurum,
      tarih: tarih || bugunYerel(),
      cariId: (satir && satir.cariId) || ciroCariId || null,
      cariAd: (satir && satir.cariAd) || null,
      bankaId: (satir && satir.bankaId) || null,
      bankaAd: (satir && satir.bankaAd) || null,
      tutar: satir ? satir.tutar : (ciroTutar ?? null),
      paraBirimi: satir ? satir.paraBirimi : (ciroPB || null),
      hareketId: (satir && satir.hareketId) || (eskiBicim ? ciroHareketId : null),
      hesapHareketId: (satir && satir.hesapHareketId) || null,
      // Hangi satırın geri alındığı KİMLİKLE bağlı: aynı çek iki kez ciro edilip ikisi de geri
      // alınırsa, satırlar sıradan değil kimlikten eşleşsin.
      geriAlinanSatirId: satir ? satir.id : null,
      // Geri alma satırının KENDİSİ bir aşama değil. Eski biçimde (geçmişsiz ciro) eşleşecek satır
      // olmadığı için yalnız kimliğe bakmak bu satırı "etkin işlem" sayar ve çeki kilitli bırakırdı.
      geriAlma: true,
      kullanici: kullanici || null,
      not: tanim.not,
    }],
  };
}

// ---- SON İŞLEMİ GERİ AL (25 Eylül, v1.459.0) ----------------------------------------------------
//
// Kullanıcı: "Ciro edilen çek geri iade alınabilir, bunun için son işlemi sil olsun — ciro edilen
// çekte veya bankaya tahsil için."
//
// Geri alma yolu zaten vardı ama DOLAYLIYDI: ciroyu geri almak için alıcı carinin ekstresinde ciro
// fişini bulup silmek, tahsili geri almak için banka hareketlerinde tahsil kaydını bulmak gerekiyordu
// (kilit mesajı bunu tarif ediyordu). Çekin üstünde tek düğme artık AYNI kapıyı çağırıyor — ikinci
// bir geri alma mantığı yazılmadı:
//   "cari"  → ciro/iade: bağlı cari hareketi silinir (fiş silme kapısı, `cekIslemGeriAl` çalışır)
//   "hesap" → tahsil: bağlı kasa/banka hareketi silinir (hesap hareketi silme, aynı kural)
//   "durum" → tahsile verme / karşılıksız: kayıt DOĞURMAYAN aşamalar; yalnız durum geri döner
//             (`cekDurumGeriAl`). Eskiden bunların hiç geri alma yolu yoktu: yanlış bankaya
//             verilen çek orada kalıyordu.
// Geri alınabilecek bir şey yoksa null (Portföyde, ya da eski kayıtta bağ bulunamadı).
function cekSonIslemi(cek) {
  if (!cek) return null;
  const durum = cek.durum || "Portföyde";
  if (durum === "Portföyde") return null;
  const satir = [...cekEtkinGecmis(cek)].reverse().find((g) => g.yeniDurum === durum) || null;
  if (CEK_GERI_ALMA[durum]) {
    if (satir && satir.hesapHareketId) {
      return { tur: "hesap", durum, satir, hareketId: satir.hesapHareketId, hesapTur: satir.hesapTur || "banka", hesapId: satir.hesapId || satir.bankaId };
    }
    const hareketId = (satir && satir.hareketId) || (!satir && durum === "Ciro Edildi" ? cek.ciroHareketId : null);
    return hareketId ? { tur: "cari", durum, satir, hareketId } : null;
  }
  if (CEK_DURUM_GERI_ALMA[durum] && satir) return { tur: "durum", durum, satir };
  return null;
}

// İŞLEMİN CARİ HAREKETİNİ BUL (v1.462.0).
//
// Kullanıcı ekran görüntüsüyle bildirdi: ciro edilmiş çekte "Son İşlemi Geri Al" → "Bu işlemin cari
// hareketi bulunamadı". Çek "Ciro Edildi" diyor ama bağlı ciro fişi carilerde YOK — eski bir
// kayıtta cari yazması buluta ulaşmamış ya da başka bir cihazın eski listesi üzerine yazmış olabilir.
// Çek bu durumda sonsuza dek kilitli kalıyordu: geri alınamıyor, silinemiyor.
//   "bulundu"  — kimlikle bulundu (normal yol)
//   "benzer"   — kimlik yok ama aynı caride aynı çek no + tutar + birimle TEK hareket var
//                (kimliği farklı kalmış kopya); o silinir
//   "yok"      — hiçbir iz yok: cari tarafında silinecek bir şey kalmamış, yalnız çek geri döner
//   "belirsiz" — birden fazla aday: tahmin edilmiyor, fiş numaraları söyleniyor
function cekIslemHareketiBul(cek, satir, cariler, hareketId) {
  const tum = (cariler || []).flatMap((c) => (c.hareketler || []).map((h) => ({ cari: c, h })));
  if (tum.some((x) => x.h.id === hareketId)) return { sonuc: "bulundu", hareketId };
  const ciro = !satir || satir.yeniDurum === "Ciro Edildi";
  const cariId = ciro ? (satir && satir.cariId) || cek.ciroCariId : cek.cariId;
  const beklenenTip = ciro || (cek.tip || "Alınan") !== "Verilen" ? "Ödeme" : "Tahsilat";
  const tutar = satir && satir.tutar != null ? satir.tutar : (cek.ciroTutar ?? cek.tutar);
  const pb = (satir && satir.paraBirimi) || cek.ciroPB || cek.paraBirimi || "TRY";
  const adaylar = tum.filter(({ cari, h }) => cari.id === cariId && h.odemeSekli === "Çek"
    && (h.islemTipi || beklenenTip) === beklenenTip
    && Math.abs((h.tutar || 0) - (tutar || 0)) < 0.005 && (h.paraBirimi || "TRY") === pb
    && (!cek.cekNo || String(h.aciklama || "").includes(cek.cekNo)));
  if (adaylar.length === 1) return { sonuc: "benzer", hareketId: adaylar[0].h.id, fisNo: adaylar[0].h.fisNo || null };
  if (adaylar.length > 1) return { sonuc: "belirsiz", fisNolar: adaylar.map((a) => a.h.fisNo || "fiş no yok") };
  return { sonuc: "yok" };
}

// KAYIT DOĞURMAYAN AŞAMALAR — yalnız durum geri döner (bkz. `cekSonIslemi`).
const CEK_DURUM_GERI_ALMA = {
  "Tahsilde": { etiket: "Tahsile verme geri alındı" },
  "Karşılıksız": { etiket: "Karşılıksız geri alındı" },
};

function cekDurumGeriAl(cek, { tarih, kullanici } = {}) {
  const son = cekSonIslemi(cek);
  if (!son || son.tur !== "durum") return null;
  const tanim = CEK_DURUM_GERI_ALMA[son.durum];
  const yeniDurum = son.satir.oncekiDurum || "Portföyde";
  return {
    ...cek,
    durum: yeniDurum,
    // Tahsile verme geri alınınca çek artık o bankada beklemiyor.
    tahsilBankaId: son.durum === "Tahsilde" ? null : cek.tahsilBankaId || null,
    tahsilBankaAd: son.durum === "Tahsilde" ? null : cek.tahsilBankaAd || null,
    gecmis: [...(cek.gecmis || []), {
      id: uid("cekh"),
      islem: tanim.etiket,
      oncekiDurum: son.durum,
      yeniDurum,
      tarih: tarih || bugunYerel(),
      bankaId: son.satir.bankaId || null,
      bankaAd: son.satir.bankaAd || null,
      geriAlinanSatirId: son.satir.id,
      geriAlma: true,
      kullanici: kullanici || null,
      not: "Son işlem geri alındı",
    }],
  };
}

// ---- ÇEK ÖZETİ — "BU ÇEK NEREDEN GELDİ, ŞİMDİ NEREDE" (25 Eylül, v1.461.0) --------------------
//
// Kullanıcı: "Çekin üzerine tıklayınca çeki kimden alıp kime ciro ettiğimiz veya son durumu ile
// alakalı açılım yapsın."
//
// Geçmiş satırları vardı ama ham ("Ciro Et · Portföyde → Ciro Edildi · Tedarikçi A"); asıl sorular
// cümleyle cevaplanmıyordu: kimden geldi, şimdi kimde/nerede, vadesine ne kadar var. Özet çekin
// kendi kaydından + bağlı cari fişlerinden kuruluyor; ekran yalnız çiziyor.
//   kimden   — giriş carisi, giriş tarihi ve fişi, cariye işlenen tutar (kur çevrimi varsa)
//   nerede   — ŞİMDİKİ durumu doğuran etkin satırdan tek cümle (+ karşı taraf, tarih, fiş)
//   vade     — kalan/geçen gün (yalnız çek hâlâ bizdeyken ya da tahsildeyken anlamlı)
//   adimlar  — giriş + geçmiş, eskiden yeniye; geri alınan işlem ve geri alma satırı işaretli
function cekOzeti(cek, { cariler, bugun } = {}) {
  if (!cek) return null;
  const verilen = (cek.tip || "Alınan") === "Verilen";
  const durum = cek.durum || "Portföyde";
  const hareketler = (cariler || []).flatMap((c) => (c.hareketler || []).map((h) => ({ cari: c, h })));
  const bul = (id) => (id ? hareketler.find((x) => x.h.id === id) || null : null);
  const giris = bul(cek.hareketId);
  const girisCarisi = (cariler || []).find((c) => c.id === cek.cariId) || (giris && giris.cari) || null;
  const kimden = {
    etiket: verilen ? "Kime verildi" : "Kimden alındı",
    ad: girisCarisi ? girisCarisi.unvan : null,
    tarih: (giris && giris.h.tarih) || cek.tarih || null,
    fisNo: (giris && giris.h.fisNo) || cek.fisNo || null,
    islenen: giris && ((giris.h.paraBirimi || "TRY") !== (cek.paraBirimi || "TRY") || Math.abs((giris.h.tutar || 0) - (cek.tutar || 0)) > 0.005)
      ? { tutar: giris.h.tutar, pb: giris.h.paraBirimi || "TRY" } : null,
  };
  const etkin = cekEtkinGecmis(cek);
  const satir = [...etkin].reverse().find((g) => g.yeniDurum === durum) || null;
  const karsi = satir ? (satir.cariAd || (bul(satir.hareketId) || {}).cari?.unvan || null) : null;
  const yer = satir ? (satir.hesapAd || satir.bankaAd || cek.tahsilBankaAd || null) : (cek.tahsilBankaAd || null);
  // Karşı taraf adın SONUNA ek getirmeden yazılıyor ("Tedarikçi A'ya" mı "…'e" mi, addan
  // çıkarılamaz); ok işaretiyle "Ciro edildi → Tedarikçi A".
  const ok = (ad) => (ad ? ` → ${ad}` : "");
  const CUMLE = {
    "Portföyde": verilen ? "Ödenmeyi bekliyor (vadesi gelmedi)" : "Elimizde — portföyde",
    "Ciro Edildi": `Ciro edildi${ok(karsi)}`,
    "Tahsilde": `Bankada tahsilde${ok(yer)}`,
    "Tahsil Edildi": verilen ? `Ödendi — hesaptan çıktı${ok(yer)}` : `Tahsil edildi — hesaba girdi${ok(yer)}`,
    "İade Edildi": `İade edildi${ok(karsi || (girisCarisi && girisCarisi.unvan))}`,
    "Karşılıksız": "Karşılıksız çıktı",
  };
  const bagli = satir ? bul(satir.hareketId) : null;
  const nerede = {
    durum,
    cumle: CUMLE[durum] || durum,
    tarih: satir ? satir.tarih : null,
    fisNo: bagli ? bagli.h.fisNo || null : null,
    islenen: satir && satir.tutar != null && satir.paraBirimi
      && (satir.paraBirimi !== (cek.paraBirimi || "TRY") || Math.abs(satir.tutar - (cek.tutar || 0)) > 0.005)
      ? { tutar: satir.tutar, pb: satir.paraBirimi } : null,
  };
  // Vade: çek elden çıkmışsa (ciro, iade, tahsil) bizim takip ettiğimiz bir vade kalmadı.
  let vade = null;
  if (cek.vadeTarihi && ["Portföyde", "Tahsilde"].includes(durum)) {
    const gun = (t) => Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10));
    const fark = Math.round((gun(cek.vadeTarihi) - gun(bugun || bugunYerel())) / 86400000);
    vade = { gun: fark, metin: fark > 0 ? `Vadeye ${fark} gün var` : fark === 0 ? "Vadesi bugün" : `Vadesi ${-fark} gün geçti` };
  }
  const geriAlinanlar = new Set((cek.gecmis || []).map((g) => g.geriAlinanSatirId).filter(Boolean));
  const adimlar = [
    { id: null, tarih: kimden.tarih, baslik: verilen ? "Şahsi çek yazıldı" : "Çek alındı", ayrinti: kimden.ad, fisNo: kimden.fisNo, iptal: false, geriAlma: false },
    ...(cek.gecmis || []).map((g) => ({
      id: g.id, tarih: g.tarih, baslik: g.islem,
      ayrinti: g.cariAd || g.hesapAd || g.bankaAd || null,
      fisNo: (bul(g.hareketId) || { h: {} }).h.fisNo || null,
      iptal: geriAlinanlar.has(g.id), geriAlma: !!g.geriAlma,
    })),
  ];
  return { kimden, nerede, vade, adimlar };
}

// ---- ÇEK İADESİ — CARİ HAREKETİ ----------------------------------------------------------------
//
// Kullanıcı (10 Eylül): "İade cari hareket doğurur, düzeltmen gereken."
//
// Çek alınırken caride bir hareket doğdu (müşteri çekinde tahsilat: alacağımız azaldı). İade o
// işlemin TERSİDİR: çek geri verilince müşterinin borcu geri doğar. Eskiden yalnız çekin durumu
// değişiyor, tahsilat caride duruyordu — müşteri, elinde olmayan bir çekle borcunu kapatmış
// görünüyordu.
//
// TERS HAREKET GİRİŞİN AYNASI: tutar ve para birimi GİRİŞ hareketinden alınıyor. Giriş başka bir
// birimde (kur çevrimiyle) işlendiyse, çekin kendi tutarını yeniden çevirmek bakiyeyi TAM
// kapatmazdı — bugünkü kur girişin kurundan farklı. Giriş bulunamazsa çekin kendi tutarı.
//
//   Alınan çek (giriş Tahsilat, Alacak) → iade Ödeme, Borç  → müşterinin borcu geri doğar
//   Verilen çek (giriş Ödeme, Borç)     → iade Tahsilat, Alacak → tedarikçiye borcumuz geri doğar
//
// KASA HAREKETİ YOK — ciroda olduğu gibi: çek nakit değil.
function cekIadeHareketi(cek, { girisHareketi, tarih, fisNo, kullanici } = {}) {
  if (!cek || !cek.cariId) return null;
  const verilen = (cek.tip || "Alınan") === "Verilen";
  const islemTipi = verilen ? "Tahsilat" : "Ödeme";
  const cekPB = cek.paraBirimi || "TRY";
  return {
    id: uid("hrk"),
    tarih,
    yon: hareketYonu(islemTipi),
    tutar: girisHareketi ? girisHareketi.tutar : cek.tutar,
    paraBirimi: girisHareketi ? (girisHareketi.paraBirimi || "TRY") : cekPB,
    odemeSekli: "Çek",
    vade: cek.vadeTarihi || "",
    fisNo,
    islemTipi,
    aciklama: `Çek iadesi${cek.cekNo ? ` · No ${cek.cekNo}` : ""}${cek.banka ? ` · ${cek.banka}` : ""}`,
    kullanici: kullanici || null,
    defter: (girisHareketi && girisHareketi.defter) || "Genel",
    hesapAd: `Çek${cek.cekNo ? ` No ${cek.cekNo}` : ""}`,
    hesapPB: cekPB,
    hesapTutar: cek.tutar,
    cekId: cek.id,
  };
}

// ---- ÇEK TAHSİLİ — KASA/BANKA HAREKETİ ----------------------------------------------------------
//
// Kullanıcı (10 Eylül): "Tahsile ver demek tahsil günü gelene kadar bankada kalsın, banka tahsil
// etsin demek. Sonraki adımı çek ödendiğinde tahsil edildi olup para hangi bankaya verilmiş ise o
// bankanın kasasına girecek."
//
// Tahsil bir PARA hareketidir: çek kâğıttan paraya döner ve para bir hesaba girer. Eskiden yalnız
// çekin durumu değişiyordu; banka bakiyesi paranın girdiğini hiç bilmiyordu.
//
// CARİ HAREKETİ YOK: müşterinin borcu çek ALINDIĞINDA kapandı (giriş tahsilatı). Tahsilde cariye bir
// şey yazmak aynı borcu İKİNCİ kez kapatırdı.
//
// Yön çekin tipinden: alınan çekin parası hesaba GİRER, şahsi çekimizin karşılığı hesaptan ÇIKAR.
// Tutar HESABIN kendi biriminde gelir (kur çevirici formda); çekin kendi tutarı ayrıca taşınıyor.
function cekTahsilHesapHareketi(cek, { tutar, tarih, kullanici, cariAd } = {}) {
  if (!cek) return null;
  const verilen = (cek.tip || "Alınan") === "Verilen";
  return {
    id: uid("mhrk"),
    tarih,
    yon: verilen ? "Çıkış" : "Giriş",
    tutar: tutar > 0 ? tutar : cek.tutar,
    defter: "Genel",
    aciklama: `Çek tahsili${cek.cekNo ? ` · No ${cek.cekNo}` : ""}${cariAd ? ` · ${cariAd}` : ""}`,
    kullanici: kullanici || null,
    cekId: cek.id,
    cekTutar: cek.tutar,
    cekPB: cek.paraBirimi || "TRY",
  };
}

// İşlemi çeke uygular: durumu değiştirir ve GEÇMİŞE bir satır ekler.
//
// Geçmiş EKLENİR, asla üzerine yazılmaz — çekin nereden geçtiği sorusunun tek cevabı burası.
function cekIslemUygula(cek, islemAnahtari, ayrinti = {}) {
  const tanim = CEK_ISLEMLERI[islemAnahtari];
  if (!cek || !tanim) return null;
  if (!tanim.izinliDurumlar.includes(cek.durum || "Portföyde")) return null;
  const satir = {
    id: uid("cekh"),
    islem: tanim.ad,
    oncekiDurum: cek.durum || "Portföyde",
    yeniDurum: tanim.yeniDurum,
    tarih: ayrinti.tarih,
    cariId: ayrinti.cariId || null,
    cariAd: ayrinti.cariAd || null,
    bankaId: ayrinti.bankaId || null,
    bankaAd: ayrinti.bankaAd || null,
    tutar: ayrinti.tutar ?? null,
    paraBirimi: ayrinti.paraBirimi || null,
    hareketId: ayrinti.hareketId || null,
    // Tahsil kasa/banka hareketi: aşamanın geri alma bağı (bkz. `cekIslemGeriAl`).
    hesapHareketId: ayrinti.hesapHareketId || null,
    hesapTur: ayrinti.hesapTur || null,
    hesapId: ayrinti.hesapId || null,
    hesapAd: ayrinti.hesapAd || null,
    kullanici: ayrinti.kullanici || null,
    not: ayrinti.not || "",
  };
  return {
    ...cek,
    durum: tanim.yeniDurum,
    // Tahsile verilen çekin hangi bankada beklediği ÜST ALANDA da duruyor: liste ve süzgeç
    // geçmişi taramak zorunda kalmasın.
    tahsilBankaId: islemAnahtari === "tahsile" ? (ayrinti.bankaId || null) : cek.tahsilBankaId || null,
    tahsilBankaAd: islemAnahtari === "tahsile" ? (ayrinti.bankaAd || null) : cek.tahsilBankaAd || null,
    gecmis: [...(cek.gecmis || []), satir],
  };
}

// ---- ÇEK CİROSU -------------------------------------------------------------------------------
//
// Kullanıcı (6 Eylül): "Elimizdeki çekleri ciro edebilmek için ya cariden ya da çek ekranından
// işlem yapabileyim. Çek içine girip 'ciro et' dediğimizde başka cariye çıkış yapsın. Kur
// çevirici mantığını unutma."
//
// Ciro, elimizdeki bir çeki BAŞKA BİR CARİYE vermektir: o cariye olan borcumuz azalır. Yani
// muhasebe olarak bir ÖDEMEDİR ve yön kuralı da öyle (`hareketYonu("Ödeme")` → "Borç").
//
// KASA HAREKETİ YOK — bilinçli. Çek nakit değil; para vadesinde el değiştirir. Kasadan düşmek,
// olmayan bir para çıkışı yazmak olurdu. Çekin kendisi portföyden çıkıyor ve portföy toplamı
// zaten yalnız "Portföyde" durumundakileri sayıyor.
//
// KUR ÇEVİRİCİ: çek TRY olabilir ama cariye USD işlenebilir. Karşı taraf bilgisi, kasa
// hareketlerindeki alan adlarının AYNISIYLA taşınıyor (`hesapAd`/`hesapPB`/`hesapTutar`) —
// ekstre o alanları zaten okuyor, ikinci bir gösterim yolu yazmaya gerek kalmadı.
function cekCiroHareketi(cek, { cariId, tutar, paraBirimi, tarih, fisNo, aciklama, kullanici, defter }) {
  if (!cek || !cariId) return null;
  const cekPB = cek.paraBirimi || "TRY";
  const hedefPB = paraBirimi || cekPB;
  const hedefTutar = tutar > 0 ? tutar : cek.tutar;
  return {
    id: uid("hrk"),
    tarih,
    yon: hareketYonu("Ödeme"),
    tutar: hedefTutar,
    paraBirimi: hedefPB,
    odemeSekli: "Çek",
    vade: cek.vadeTarihi || "",
    fisNo,
    islemTipi: "Ödeme",
    aciklama: aciklama || `Çek cirosu${cek.cekNo ? ` · No ${cek.cekNo}` : ""}${cek.banka ? ` · ${cek.banka}` : ""}`,
    kullanici: kullanici || null,
    defter: defter || "Genel",
    // ÇEKİN KENDİ tutarı ve birimi karşı taraf olarak yazılıyor: cariye 1000 $ işlenip çekin
    // 42.000 ₺ olduğu ekstrede görünsün.
    hesapAd: `Çek${cek.cekNo ? ` No ${cek.cekNo}` : ""}`,
    hesapPB: cekPB,
    hesapTutar: cek.tutar,
    // Bilgi amaçlı. GERİ ALMA BAĞI BU ALAN DEĞİL: `cek.gecmis[].hareketId` (muhasebe kaydında,
    // buluta tam gidiyor). `cekId` cari_hareketleri şemasında (`ek`) yok, yenilemeden sonra düşer —
    // bu yüzden geri alma ona dayanmıyor.
    cekId: cek.id,
  };
}

// Çeki ciro edilmiş hâle getirir. Durum değişikliği ve ciro bilgisi TEK yerde kuruluyor ki
// çek ekranı ile cari kartı ayrışmasın.

function defterKapsar(kayitDefteri, secilen) {
  if (!secilen || secilen === "Tümü") return true;
  const d = kayitDefteri || "Genel";
  return d === secilen || d === "Muhasebe";
}

// ---- İKİZ KAYIT GÖÇÜ -------------------------------------------------------------------------
//
// Kullanıcı (6 Eylül): "Tek kayda düşsün, çok önemli."
//
// ESKİ BİÇİM: "Muhasebe" defteri seçilince cari hareketi İKİYE bölünüyordu — `defter: "Genel"` ve
// `defter: "Resmi"`, `esId` ile birbirine bağlı. Bedeli her yere yayılmıştı: silerken ikizi de
// silmek, toplarken ikizi saymamak, denetimde çiftin kopmadığını kontrol etmek. Her yeni ekran bu
// istisnayı hatırlamak zorundaydı; hatırlamazsa cari bakiyesi İKİ KATI çıkıyordu.
//
// YENİ BİÇİM: tek kayıt, `defter: "Muhasebe"`. Hangi deftere gireceğine `defterKapsar` karar
// veriyor. Kasa/banka tarafı zaten böyleydi; iki taraf artık aynı kuralı kullanıyor.
//
// GENEL İKİZİN KİMLİĞİ KORUNUYOR, Resmi olan atılıyor. Sebep kritik: stok hareketi fiş yazılırken
// GENEL ikizle AYNI kimliği alıyor (`078-fisyaz`, `kimlikler.get(k)`). Resmi olanın kimliğini
// tutsaydık stok ile cari arasındaki bağ kopardı ve fiş geri alınamaz hâle gelirdi.
//
// Yetim kalmış yarımlara DOKUNULMUYOR: eşi silinmiş bir kayıt kendi defterinde kalıyor. Onu
// "Muhasebe" yapmak, kullanıcının silmediği bir deftere kayıt eklemek olurdu; veri denetimi bu
// durumu zaten "yetim eş kayıt" olarak bildiriyor.
function esIkizleriBirlestir(cariler) {
  let birlesen = 0;
  const yeniCariler = (cariler || []).map((c) => {
    const hareketler = c.hareketler || [];
    const idKumesi = new Set(hareketler.map((h) => h.id));   // sirasiz-tamam
    // Atılacak Resmi yarımların kimlikleri.
    const atilacak = new Set();
    hareketler.forEach((h) => {
      if (!h.esId) return;
      if ((h.defter || "Genel") !== "Resmi") return;
      if (!idKumesi.has(h.esId)) return;   // eşi yok: yetim, dokunma
      atilacak.add(h.id);
    });
    if (atilacak.size === 0) return c;
    birlesen += atilacak.size;
    return {
      ...c,
      hareketler: hareketler
        .filter((h) => !atilacak.has(h.id))
        .map((h) => {
          if (!h.esId || !atilacak.has(h.esId)) return h;
          // Kalan Genel yarım "Muhasebe" oluyor ve `esId` düşüyor — artık bağlanacak bir eş yok.
          const { esId, ...kalan } = h;
          return { ...kalan, defter: "Muhasebe" };
        }),
    };
  });
  return { cariler: yeniCariler, birlesen };
}

// KASA/BANKA HESABINA HAREKET YERLEŞTİR — saf geçit.
//
// Kasa/banka defterine sistemin kendisi hareket koyan iki yol var: fişin peşin ayağı (7y) ve çek
// tahsili (7z-44). İkisi de aynı yerleştirmeyi yapıyor; ayrı ayrı yazılsalardı (denetim 16'nın
// kovaladığı kopya) biri hesabı bulamayınca sessizce atlarken diğeri hata verebilirdi. Saf olması
// şart: çek tahsilinde çek ve hareket TEK muhasebe yazımında gitmeli, ayrı iki yazım birbirini
// ezebilir (bkz. 7z-9, asenkron state).
function hesabaHareketEkle(muhasebe, hesapTur, hesapId, hareket) {
  const anahtar = hesapTur === "kasa" ? "kasalar" : "bankalar";
  return {
    ...muhasebe,
    [anahtar]: ((muhasebe && muhasebe[anahtar]) || []).map((h) =>
      (h.id === hesapId ? { ...h, hareketler: [hareket, ...(h.hareketler || [])] } : h)),
  };
}

function hesapBakiyesi(hesap, defter) {
  return (hesap.hareketler || [])
    .filter((h) => defterKapsar(h.defter, defter))
    .reduce((s, h) => s + (h.yon === "Giriş" ? h.tutar : -h.tutar), 0);
}

const MUHASEBE_RENK = "#2F6B4F";
// ---- TUTAR YAZIYLA (25 Eylül, v1.460.0) ------------------------------------------------------
//
// Çek bordrosu/makbuzunda tutar rakamın yanında yazıyla da basılıyor ("Yalnız kırk iki bin TL"):
// sonradan elle eklenen bir rakamın belgeyle çelişmesini gösteren olağan önlem. Türkçe kurallar:
// "bir yüz" değil "yüz", "bir bin" değil "bin" (ama "yüz bir bin", "iki yüz bir bin"); kelimeler
// bitişik yazılır (belge alışkanlığı: "kırkikibin"). Kuruş iki haneye yuvarlanıyor.
const PARA_YAZI_ADLARI = { TRY: ["TL", "kuruş"], USD: ["ABD Doları", "sent"], EUR: ["Avro", "sent"] };
function sayiYaziyla(n) {
  const birler = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
  const onlar = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
  const basamaklar = ["", "bin", "milyon", "milyar", "trilyon"];
  const ucluk = (x) => {
    const y = Math.floor(x / 100), o = Math.floor((x % 100) / 10), b = x % 10;
    return (y ? (y === 1 ? "" : birler[y]) + "yüz" : "") + onlar[o] + birler[b];
  };
  n = Math.floor(Math.abs(n));
  if (n === 0) return "sıfır";
  let sonuc = "", i = 0;
  while (n > 0 && i < basamaklar.length) {
    const parca = n % 1000;
    if (parca) {
      // Yalnız "1000" tek başına "bin" (bir bin değil); 101.000 = "yüzbirbin".
      const metin = i === 1 && parca === 1 ? "" : ucluk(parca);
      sonuc = metin + basamaklar[i] + sonuc;
    }
    n = Math.floor(n / 1000); i += 1;
  }
  return sonuc;
}
function tutarYaziyla(tutar, paraBirimi) {
  const t = Math.round(Math.abs(Number(tutar) || 0) * 100);
  const tam = Math.floor(t / 100), kurus = t % 100;
  const [ana, alt] = PARA_YAZI_ADLARI[paraBirimi || "TRY"] || [paraBirimi || "", ""];
  return `${sayiYaziyla(tam)} ${ana}${kurus ? ` ${sayiYaziyla(kurus)} ${alt}` : ""}`;
}

const MUHASEBE_PARA_BIRIMLERI = ["TRY", "USD", "EUR"];
const PARA_SEMBOLU = { TRY: "₺", USD: "$", EUR: "€" };

// SEMBOL → KOD. Uygulamada İKİ AYRI para birimi gösterimi var ve bu bilinçli değil, tarihsel:
//
//   ÜRÜNLER  → sembol  (`PARA_BIRIMLERI = ["₺","$","€"]`, ör. `urun.alisParaBirimi = "$"`)
//   MUHASEBE → kod     (`MUHASEBE_PARA_BIRIMLERI = ["TRY","USD","EUR"]`)
//
// Ürünün alış para birimi doğrudan bir fiş kalemine yazıldığında, kalem `"$"` değerini taşıyor;
// seçici onu tanımadığı için ekranda "TRY" görünüyor ama hesap `"$"` ile yapılıyor ve
// "Kur eksik: $ → TRY" çıkıyor. Kullanıcı bunu bildirdi (9 Eylül): fiyat TL girilmiş görünüyor
// ama satır dolar sanılıyordu.
//
// TANINMAYAN DEĞER `null` DÖNER; çağıran karar verir. Uydurma bir kod döndürmek, yanlış para
// biriminde fatura demek olurdu.
//
// `£` listeden kaldırıldı (9 Eylül) ama burada hâlâ tanınmıyor ve bu KASITLI: eski kayıtlarda
// seçilmiş olabilir. O kayıt sessizce TL'ye düşmemeli — `null` dönüp fiyatın taşınmamasını
// sağlıyor, kullanıcı da boş fiyatı görüp düzeltiyor.
const PARA_KODU = { "₺": "TRY", "$": "USD", "€": "EUR", TRY: "TRY", USD: "USD", EUR: "EUR" };
function paraKoduna(deger) {
  if (!deger) return null;
  return PARA_KODU[deger] || null;
}


// PARA HAREKETİ Mİ? (tahsilat / ödeme)
//
// Ödeme şekli (Nakit, Kredi Kartı, Havale…) yalnızca PARA hareket ettiğinde anlamlıdır.
// Satış/alış fişinde gösterilmesi yanıltıcıydı: fiş cariye borç yazar, kasadan para çıkarmaz;
// "Nakit" etiketi ödenmiş izlenimi veriyordu. Tahsilat ve ödemede ise para fiilen el değiştirir
// ve NASIL el değiştirdiği kayıt kadar önemlidir (kullanıcı: "tahsilatta açıklama bölümüne
// kredi kartı, nakit vs. göstersin").
//
// Fiş numarası ön eki birincil ölçüt (THS-/ODM-, v1.75.0'dan beri); eski kayıtlarda ön ek
// olmadığı için açıklama metnine de bakılıyor.
// HAREKETİN İŞLEM TİPİ — renklendirme ve etiketleme için tek kaynak.
//
// Kullanıcı (6 Eylül): "Kasa ve cari hareketlerinde ödeme ve tahsilat renklerine göre renklendir."
//
// `islemTipi` alanı YENİ kayıtlarda var ama eski kayıtlarda yok; fiş numarası ön eki (THS-/ODM-)
// en güvenilir ikinci kaynak, açıklama metni ise en son çare. Üç kaynağı her ekranda ayrı ayrı
// yorumlamak, birinin diğerinden farklı renk vermesi demekti.
// EKRANDA GÖSTERİLECEK FİŞ NUMARASI (23 Eylül, v1.433.0): işçilik fişinin numarası
// "10003-Üste-İşçilik" biçiminde — üretim no + proses + tür. Kayıtta böyle kalıyor (fiş defteri,
// arama ve eski kayıtlar buna dayanıyor), ama ekstrede numara sütununa sığmıyor ve türü zaten
// rozet söylüyor. Gösterimde yalnız "-İşçilik" eki atılıyor; numaranın kendisi değişmiyor.
function fisNoGoster(fisNo) {
  return String(fisNo || "").replace(/-İşçilik$/, "");
}

// SADE (TEK SATIR) ÖZET (23 Eylül, v1.435.0 — kullanıcı: "cari hareketleri detaysız da göstersin,
// şu anki hâli kalsın; tek satıra sığacak bilgiler yeterli").
//
// Kural: bilgiyi ATMAK değil, SIKIŞTIRMAK. Tek kalemli fişte ürün adı ve çarpım yazılır
// ("Deri Beyaz Deri · 11 Desi × 12,21 ₺"); çok kalemli fişte tek tek dökmek satırı taşıracağı için
// özetlenir ("102 Bayan Bot · 2 renk · 152 çift"). Para hareketlerinde ödeme şekli ve hesap yeter.
// Ürünsüz kayıtta açıklamanın kendisi tek bilgi kaynağıdır, olduğu gibi yazılır.
function hareketSadeOzet(urunGruplari, yapisizHareketler, ilk, g) {
  const say = (n) => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  if (urunGruplari && urunGruplari.length > 0) {
    // `urunRenkGrupla` (260-cari) grubun satırlarını `items` altında tutuyor.
    const kalemler = urunGruplari.flatMap((u) => u.items || []);
    const toplam = kalemler.reduce((t, k) => t + (Number(k.miktar) || 0), 0);
    const birim = (kalemler[0] || {}).birim || (urunGruplari[0] || {}).birim || "";
    const renkler = new Set(urunGruplari.map((u) => u.renk).filter(Boolean));
    const urunAdlari = [...new Set(urunGruplari.map((u) => u.urunAd).filter(Boolean))];
    // TEK KALEM: ürün · renk · miktar × birim fiyat — hepsi sığar.
    if (kalemler.length === 1) {
      const k = kalemler[0];
      const fiyat = k.birimFiyat ? ` × ${say(k.birimFiyat)}` : "";
      return [urunAdlari[0], olcuGoster(urunGruplari[0].renk), `${say(k.miktar)} ${birim}${fiyat}`.trim()]
        .filter(Boolean).join(" · ");
    }
    // ÇOK KALEM: dökmek yerine say — "kaç ürün, kaç renk, toplam kaç".
    const parcalar = [];
    parcalar.push(urunAdlari.length === 1 ? urunAdlari[0] : `${urunAdlari.length} ürün`);
    if (renkler.size > 1) parcalar.push(`${renkler.size} renk`);
    else if (renkler.size === 1) parcalar.push(olcuGoster([...renkler][0]));
    parcalar.push(`${say(toplam)} ${birim}`.trim());
    return parcalar.filter(Boolean).join(" · ");
  }
  // ÜRÜNSÜZ: ödeme/tahsilat/çek ya da elle kayıt.
  // ÖDEME ŞEKLİ TEKRARLANMIYOR: para hareketlerinde sol sütunda zaten rozet olarak duruyor
  // ("Nakit", "Çek · vade …"). Burada bir kez daha yazmak satırı bilgi eklemeden uzatırdı.
  const parcalar = [];
  if (g && g.odemeSekli && !paraHareketiMi(ilk)) parcalar.push(g.odemeSekli);
  if (g && g.vade && !paraHareketiMi(ilk)) parcalar.push(`vade ${g.vade}`);
  const aciklama = String((ilk && ilk.aciklama) || (yapisizHareketler || []).map((h) => h.aciklama).filter(Boolean)[0] || "").trim();
  if (aciklama && !/^(tahsilat|ödeme)$/i.test(aciklama)) parcalar.push(aciklama);
  return parcalar.join(" · ") || "—";
}

function hareketIslemTipi(h) {
  if (!h) return null;
  if (h.islemTipi) return h.islemTipi;
  const fis = String(h.fisNo || "");
  if (fis.startsWith("THS-")) return "Tahsilat";
  if (fis.startsWith("ODM-")) return "Ödeme";
  if (fis.startsWith("AF-")) return "Alış";
  if (fis.startsWith("SF-")) return "Satış";
  // ESKİ İŞÇİLİK KAYITLARI (23 Eylül, v1.433.0): `islemTipi` alanı v1.433 öncesinde yazılmıyordu;
  // o kayıtlarda tip fiş numarasının "-İşçilik" ekinden okunuyor. Yeni kayıtlar alanı taşıyor.
  if (/-İşçilik$/.test(fis)) return "İşçilik";
  const yazi = String(h.aciklama || "").trim();
  if (/^tahsilat/i.test(yazi)) return "Tahsilat";
  if (/^ödeme/i.test(yazi)) return "Ödeme";
  return null;
}

function paraHareketiMi(h) {
  if (!h) return false;
  if (/^(THS|ODM)-/.test(String(h.fisNo || ""))) return true;
  return /^(tahsilat|ödeme)$/i.test(String(h.aciklama || "").trim());
}
