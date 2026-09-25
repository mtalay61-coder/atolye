// BANKALAR VE IBAN'DAN BANKA BULMA
//
// "Bankaları otomatik çekelim" — çevrimdışı çalışan bir uygulamada dışarıdan liste çekmek
// güvenilir değil (uygulama internetsiz de çalışıyor, bulut yalnızca eşitleme için). Bunun yerine
// iki şey yapılıyor:
//   1. Bankalar HAZIR LİSTE olarak geliyor; elle yazmak yerine seçiliyor.
//   2. IBAN yazılırsa banka OTOMATİK bulunuyor — Türkiye IBAN'ının içinde banka kodu var.
//
// Türkiye IBAN yapısı: TR + 2 kontrol + 5 banka kodu + 1 rezerv + 16 hesap = 26 karakter.
// 5 haneli banka kodu, bankanın 4 haneli EFT kodunun başına "0" eklenmiş hâlidir
// (Ziraat EFT 0010 → IBAN 00010).
//
// KOD DOĞRULUĞU: aşağıdaki EFT kodları yaygın kullanılan bankalar için yazıldı. Bir kod yanlışsa
// sonuç yalnızca "banka otomatik seçilmedi" olur — alan elle değiştirilebilir kalıyor, IBAN'dan
// gelen tahmin ASLA kullanıcının seçimini ezmiyor. Listede olmayan banka da elle yazılabilir.
const BANKALAR = [
  { ad: "Ziraat Bankası", kod: "0010" },
  { ad: "Halkbank", kod: "0012" },
  { ad: "Vakıfbank", kod: "0015" },
  { ad: "Türkiye Sınai Kalkınma Bankası", kod: "0014" },
  { ad: "TEB", kod: "0032" },
  { ad: "Akbank", kod: "0046" },
  { ad: "Şekerbank", kod: "0059" },
  { ad: "Garanti BBVA", kod: "0062" },
  { ad: "İş Bankası", kod: "0064" },
  { ad: "Yapı Kredi", kod: "0067" },
  { ad: "ING", kod: "0099" },
  { ad: "Fibabanka", kod: "0103" },
  { ad: "QNB Finansbank", kod: "0111" },
  { ad: "HSBC", kod: "0123" },
  { ad: "Denizbank", kod: "0134" },
  { ad: "Anadolubank", kod: "0135" },
  { ad: "Aktif Bank", kod: "0143" },
  { ad: "Odeabank", kod: "0146" },
  { ad: "Albaraka Türk", kod: "0203" },
  { ad: "Kuveyt Türk", kod: "0205" },
  { ad: "Türkiye Finans", kod: "0206" },
  { ad: "Ziraat Katılım", kod: "0209" },
  { ad: "Vakıf Katılım", kod: "0210" },
  { ad: "Emlak Katılım", kod: "0211" },
];

// IBAN'dan banka adı. Bulamazsa "" döner — yanlış tahmin yazmaktansa boş bırakmak yeğdir.
function ibandanBanka(iban) {
  const temiz = String(iban || "").replace(/\s+/g, "").toUpperCase();
  if (!/^TR\d{7}/.test(temiz)) return "";
  const kod5 = temiz.slice(4, 9);
  const banka = BANKALAR.find((b) => `0${b.kod}` === kod5);
  return banka ? banka.ad : "";
}

// DAHA ÖNCE GİRİLEN ŞUBELER. Türkiye'de on binlerce şube var; hazır liste taşımak hem devasa hem
// hızla eskiyor. Bunun yerine kullanıcının KENDİ girdikleri öğreniliyor: aynı bankaya ikinci çeki
// girerken şube artık listeden seçiliyor.
function bilinenSubeler(cekKayitlari, banka) {
  const cikan = [];
  (cekKayitlari || []).forEach((c) => {
    if (!c || !c.sube) return;
    if (banka && c.banka !== banka) return;
    if (!cikan.includes(c.sube)) cikan.push(c.sube);
  });
  return cikan.sort((a, b) => a.localeCompare(b, "tr"));
}

// Sterlin KALDIRILDI (kullanıcı, 9 Eylül: "bu birim hiç kullanılmaz"). Muhasebe tarafında zaten
// karşılığı yoktu (`MUHASEBE_PARA_BIRIMLERI`) — yani seçilebilir ama hiçbir hesaba giremeyen bir
// seçenekti. Listede durması, bir gün seçilip sessizce yanlış sonuç üretmesi demekti.
const PARA_BIRIMLERI = ["₺", "$", "€"];
const BIRIMLER = ["adet", "çift", "metre", "kg", "litre", "paket"];

// Birim seçeneklerini üretir.
//
// ÖNCEKİ DAVRANIŞ TUZAKLIYDI: "liste boşsa varsayılanları kullan, doluysa yalnızca listeyi kullan".
// Kullanıcı Tanımlar'a TEK bir birim (ör. "Desi") eklediği anda liste boş olmaktan çıkıyor,
// varsayılanlar devreden kalkıyor ve mevcut ürünlerin birimi ("çift") seçeneklerde bulunamıyordu.
// Tarayıcı bu durumda listenin İLK öğesini gösteriyor — kullanıcı ürünün birimini yanlış biliyor,
// kaydete bastığında da gerçekten değişiyordu.
//
// Artık kullanımda olan birim her zaman seçenekler arasında: veri, listeye uymadığı için
// sessizce bozulmaz.
function birimSecenekleri(tanimliListe, kullanimdaki) {
  const liste = (tanimliListe && tanimliListe.length > 0)
    ? tanimliListe.map((b) => b.ad)
    : BIRIMLER.slice();
  if (kullanimdaki && !liste.includes(kullanimdaki)) return [kullanimdaki, ...liste];
  return liste;
}
const ASAMA_RENK = {
  "Planlandı": "var(--erp-text-3)",
  "Kesim": "#C97B3D",
  "Dikim": "var(--erp-warn)",
  "Montaj": "var(--erp-brown)",
  "Kalite Kontrol": "#6B7A5A",
  "Tamamlandı": "var(--erp-primary)",
};
const KAYNAK_RENK = { "Üretim": "var(--erp-primary)", "Satınalma": "var(--erp-brown)", "Satış": "var(--erp-info)", "Manuel": "var(--erp-purple)" };

// =============================================================================================
// PROSES RENKLERİ
//
// Reçetede prosesler alt alta dizildiğinde birinin nerede bitip diğerinin nerede başladığı ancak
// küçük "Proses: X" yazısı okunarak anlaşılıyordu. Her prosese kendi rengini vermek, grubu
// okumadan ayırt edilebilir kılar.
//
// Renkler ELLE TANIMLANMAZ, proses adından türetilir: aynı ad her zaman aynı rengi alır (farklı
// oturum ve cihazlarda da), yeni bir proses eklendiğinde kimsenin renk seçmesi gerekmez.
// Palet uygulamanın sıcak toprak tonlarından seçilidir — rastgele HSL üretmek paletin dışına çıkan,
// birbirine karışan ve okunaksız renkler doğururdu.
const PROSES_PALETI = [
  "var(--erp-brown)", // taba
  "var(--erp-primary)", // zeytin
  "var(--erp-info)", // çini mavisi
  "#9C3D3D", // kiremit
  "var(--erp-purple)", // mürdüm
  "#B8860B", // hardal
  "#2F6B4F", // çam
  "var(--erp-warn)", // kavuniçi
  "#5A6B7A", // kurşun
  "#7A5A6B", // gül kurusu
];

// `sira` verilirse renk PROSES SIRASINDAN seçilir; verilmezse addan türetilir.
//
// Sıra tercih edilir çünkü addan türetme ÇAKIŞABİLİR: "Kalfa" ve "Kalite Kontrol" aynı sağlama
// değerine düşüp aynı rengi alıyordu — üstelik bunlar birbirini takip eden prosesler, yani
// çakışmanın en görünür olduğu yer. Sıra kullanıldığında ilk 10 proses garantili farklı renk alır.
// Sıra bilinmediğinde (ör. serbest yazılmış bir proses adı) ada geri dönülür.
// =============================================================================================
// HAREKET KAYNAĞI RENKLERİ (satır boyama)
//
// Uygulama, stok hareketlerini kaynağına göre zaten renklendiriyor (KAYNAK_RENK): Üretim zeytin,
// Satınalma taba, Satış çini mavisi, Manuel mürdüm. Bu renkler modüller arasında tutarlı ve
// kullanıcı onları okumadan tanıyor.
//
// Hammadde çıkış satırlarını da AYNI dile bağlar: kenarlık kaynağın renginde, zemin aynı rengin
// şeffaf tonu. Böylece bir üretim çıkışı, stok ekstresindeki üretim hareketiyle aynı görünür.
// =============================================================================================
// ONDALIK BİRİKME HATASI
//
// İkili kayan noktalı sayılarda 0.1 gibi değerler tam saklanamaz. 0,1'lik tüketimler arka arkaya
// çıkarıldığında minik hatalar birikir ve stok "0" yerine -3.5527136788005009e-15 gibi görünür.
// Giriş +15,2 · Çıkış −15,2 · Net 0 olmasına rağmen toplamın sıfır çıkmamasının sebebi budur.
//
// Çözüm: stok miktarı DEĞİŞTİĞİ HER YERDE yuvarlanır. Görüntülemede yuvarlamak yetmez — hata
// kayıtlı veride kalır, sonraki hesaplara taşınır ve "eksi stok" korumaları yanlış tetiklenir.
// 6 basamak, atölyede kullanılan en küçük ölçüden (0,001) fazlasıyla hassas.
// Ürün başına saklanan hareket sayısı. Sınır, depolama boyutunu kontrol altında tutmak için var
// (bkz. DEPO_SINIRI) ama fazla dardı: 200 hareketi aşan bir üründe en eskiler sessizce düşüyor ve
// defter neti kalıcı olarak bakiyeden ayrışıyordu — denetim ekranı bunu "fark" olarak gösterir ama
// sebebi geri getirilemez. 1000, birkaç yıllık hareketi taşır ve tipik bir üründe ~150 KB tutar.
// =============================================================================================
// SÜRÜM
//
// Her paket bir sürüm numarasıyla çıkar. Amaç, "hangi dosyadaydık" sorusunu ortadan kaldırmak:
// bir hata bildirildiğinde hangi sürümde olduğu bilinmezse, düzeltilmiş bir hatayı yeniden
// aramakla vakit kaybedilir.
//
// Numaralama:  BÜYÜK.KÜÇÜK.YAMA
//   BÜYÜK — veri yapısı değişti, göç gerekiyor
//   KÜÇÜK — yeni özellik eklendi
//   YAMA  — hata düzeltmesi, görsel değişiklik
// SEZONLAR — üç yerde ayrı ayrı yazılıydı (ürün formu, stok süzgeci) ve özel kod kapsamı
// dördüncüsü olacaktı. Ayrı listeler zamanla ayrışır: birine eklenen sezon diğerinde çıkmaz ve
// o sezona atanmış kayıt hiçbir süzgeçte görünmez.
// "Belirtilmemiş" listede YOK: o bir değer değil, değerin yokluğu (`sezon: ""`).
// SEKME ADLARI — üst şeritteki açık sayfa sekmeleri buradan adlandırılıyor. Sol menüdeki liste
// ile aynı anahtarları kullanıyor; ayrı yazılsalardı biri yeniden adlandırıldığında şeritte eski
// ad kalırdı.
// GEZİNME ZEMİNİ — DÜZ RENK DEĞİL, HAFİF KUBBE.
//
// Kullanıcı (7 Eylül): "Arka zemine efekt yapsak, renk çok düz duruyor. Şeridin ortası koyu,
// kenarlar daha açık, gölgeli veya oval gibi."
//
// Tek renkli geniş bir şerit gözde düz bir levha gibi duruyor; hafif bir eliptik geçiş yüzeye
// derinlik veriyor. Ortası bir tık koyu, kenarlara doğru açılıyor.
//
// BELİRGİNLİK ARTIRILDI (kullanıcı, 7 Eylül: "daha belirgin olsun efektler, gerekirse rengi
// koyulaştır"). İlk deneme ~%5 parlaklık farkındaydı ve ekranda neredeyse fark edilmiyordu.
// Şimdi #C6D9C0 → #E0EBDC → #F4F8F3, yani üç adımda ~%18.
//
// SINIRI METİN KONTRASTI ÇİZİYOR, zevk değil. En KOYU zemin noktasında ölçülen oranlar:
//   ana metin  #2C4029 → 7,52  (WCAG AAA eşiği 7:1)
//   seçili öge #BCD3B5 üstünde → 7,01
//   soluk metin ve pasif sekme → 5,0 üstü (AA eşiği 4,5)
//
// Ortası daha da koyulaştırılsaydı yazı, zeminin neresine denk geldiğine göre okunur/okunmaz hâle
// gelirdi — bir gradyanın yapabileceği en kötü şey bu.
//
// GRADYAN KOYULAŞINCA SOLUK TONLAR SIKIŞTI: ilk denemede soluk metin 3,46'ya düştü (AA altı) ve
// ölçüm bunu gösterdi. Soluk metin ve pasif sekme rengi de birlikte koyulaştırıldı — bir rengi
// değiştirmek, ONUN ÜZERİNDEKİ her şeyi yeniden ölçmeyi gerektiriyor.
//
// İKİ SABİT, YÜZEYİN YÖNÜNE GÖRE ADLANDIRILDI (elipsin şekline göre değil — karıştırması kolay):
//
//   _YATAY  → geniş ve alçak yüzeyler (üst şerit, mobil alt çubuk). Geçiş SOLDAN SAĞA olmalı,
//             bu yüzden elips DAR ve UZUN: `75% 180%`. Yüksekliğin %180 olması, elipsin şeridi
//             dikeyde tamamen aşması içindir — yoksa 40 piksellik şeritte üst ve alt kenarda
//             istenmeyen bir halka görünürdü.
//
//   _DIKEY  → dar ve uzun yüzeyler (sol menü). Geçiş YUKARIDAN AŞAĞIYA olmalı, bu yüzden elips
//             GENİŞ ve KISA: `180% 65%`.
//
// İkisine aynı gradyanı vermek menüde ortası koyu bir bant değil, üstü ve altı sönük bir sütun
// üretir — ilk denemede tam olarak bu oldu.
// İÇERİK ZEMİNİ — KREM VİNYET (kullanıcı, 7 Eylül: "krem rengi gibi olan yerde kenar yakın
// tonlarda ve efektli olsun").
//
// Gezinme yüzeyleri efekt alınca krem içerik alanı yanlarında düz kaldı.
//
// GEZİNMENİN TERSİ: burada ORTASI AÇIK, KENARLAR koyu (vinyet). Sebep okunurluk:
//
//   Şerit ve menü dar yüzeyler, üzerlerindeki yazı hep aynı bölgede. İçerik alanı ise sayfanın
//   en büyük yüzeyi ve METİN ORTASINDA okunuyor — kenarlar sayfa marjı. Kubbeyi düz koysaydık
//   (ortası koyu) en çok okunan bölge en koyu yer olurdu.
//
// ÖLÇÜM BU KARARI ZORLADI: soluk metin (#7A6A50) eski düz krem zeminde 4,32 — AA eşiği 4,5'in
// hemen altında. Kubbe (ortası koyu) onu 3,88'e düşürüyordu. Vinyetle merkez AÇILDIĞI için
// oradaki oran ÇIKIYOR — yeşile çekilmiş tonlarda merkezde 4,71, yani artık eşiğin ÜSTÜNDE.
// Kenarda 3,91'e iniyor ama orada metin yok.
//
// (Soluk metin renginin zaten sınırda olması ayrı bir iş — bu gradyanın yarattığı bir sorun değil,
// onun ortaya çıkardığı eski bir durum. Notta açık madde.)
//
// Belirginlik merkez/kenar oranı ~%28: gezinmedeki %18'den fazla, çünkü geçiş çok daha geniş bir
// alana yayılıyor ve aynı sertlik burada daha yumuşak görünüyor.
// TON YEŞİLE ÇEKİLDİ (kullanıcı, 7 Eylül: "ortadaki renk paletin dışında kalmış, tonun
// yeşillenmesi gerekli"). Gezinme yüzeyleri yeşile dönünce içerik zemini sıcak kremde kaldı ve
// ekranın ORTASI paletin dışına düştü — en büyük yüzey olduğu için de en çok göze çarpan uyumsuzluk.
//
// Krem tamamen atılmadı, yeşile ÇEKİLDİ: hâlâ bej karakterinde ama menü zeminiyle (#EDF2EC) aynı
// ailede. Ölçüm: ikisi arasındaki parlaklık farkı %4 — yan yana durduklarında aynı yüzeyin iki
// tonu gibi okunuyor, iki ayrı renk gibi değil.
//
// KARTLAR SICAK KREM KALDI (#FBF6EC) ve bu bilinçli: zemin yeşile kayınca kartlar ondan %10
// ayrışıyor, yani içerik kutuları zeminden daha net ayırt ediliyor. Zemin de kart da aynı tona
// gitseydi sayfa tek düze bir yüzeye dönerdi.
const ZEMIN_EFEKT_KREM = "radial-gradient(ellipse 100% 85% at 50% 40%, #F1F4E8 0%, #E9EEDD 55%, #D9E2C9 100%)";

const ZEMIN_EFEKT_YATAY = "radial-gradient(ellipse 75% 180% at 50% 50%, #C6D9C0 0%, #E0EBDC 55%, #F4F8F3 100%)";
const ZEMIN_EFEKT_DIKEY = "radial-gradient(ellipse 180% 65% at 50% 50%, #C6D9C0 0%, #E0EBDC 55%, #F4F8F3 100%)";

// MODÜL RENKLERİ — menü, üst şerit, anasayfa kartları ve pencere başlıkları AYNI tablodan okuyor.
// Uygulama bileşeninin içinde tanımlıydı; anasayfa kartları (110-navigasyon) göremiyordu ve orada
// her kutu aynı kahverengiydi. Aynı modülün iki ekranda iki farklı renkte görünmemesi için tek yer.
const MODUL_RENK = {
  anasayfa: "var(--erp-orange)",   // tape-orange — genel/nötr
  tanimlar: "#6B7A8F",   // terzi tebeşiri mavi-gri
  stok: "var(--erp-brown)",       // saddle — deri
  uretim: "var(--erp-primary)",     // atölye yeşili
  cari: "var(--erp-info)",       // defter mavisi
  siparis: "#9C3D3D",    // mühür/fiş bordosu — SATIŞ tarafı
  satinalma: "var(--erp-brown)",  // saddle — alış tarafı, stok/hammadde ile aynı dil
  depo: "#5A6B4E",       // depo yeşili — stoğa yakın ama ondan ayrı bir bakış
  fisler: "var(--erp-purple)",     // damga moru
  muhasebe: "#2F6B4F",   // hesap defteri koyu yeşili
  planlama: "#B8860B",
  gorevler: "var(--erp-purple)",  // görev moru — iş akışına ait, modüllerin hiçbirinin rengiyle çakışmıyor   // pusula/plan sarısı-kahvesi
  gunluk: "#7A5C8A",     // mürekkep moru — defter/kayıt dili
};

const SEKME_BILGISI = {
  anasayfa: { ad: "Anasayfa" },
  tanimlar: { ad: "Tanımlar" },
  stok: { ad: "Stok" },
  uretim: { ad: "Üretim" },
  cari: { ad: "Cari" },
  siparis: { ad: "Sipariş" },
  satinalma: { ad: "Alış Siparişi" },
  depo: { ad: "Depo" },
  paketleme: { ad: "Paketleme" },
  planlama: { ad: "Planlama" },
  fisler: { ad: "Fişler" },
  muhasebe: { ad: "Muhasebe" },
  atolye: { ad: "Atölye" },
};

const SEZONLAR = ["İlkbahar/Yaz", "Sonbahar/Kış", "Tüm Sezon"];

// BULUTA GİDEMEYEN KAYIT — TABLO AÇIKLAMALARI (19 Eylül).
//
// Kullanıcı: *"Buluta gönderilmeyenlere detay versin: 'bu stok' veya 'bu fiş' diye, üzerine
// tıklayınca."* Şerit yalnız tablo adını yazıyordu (`urunler (1×)`); kullanıcı için bu, hangi
// işinin havada kaldığını söylemiyor. Tablo adı VERİTABANININ dili, kullanıcının değil.
const TABLO_ACIKLAMALARI = {
  urunler: { ad: "Stok kartları", ayrinti: "Ürünler, renk/beden miktarları ve stok hareketleri" },
  cariler: { ad: "Cari kartları", ayrinti: "Müşteri/tedarikçi kartları, ekstre hareketleri ve fişler" },
  siparisler: { ad: "Siparişler", ayrinti: "Alış ve satış siparişleri, kalemleri ve karşılanan miktarlar" },
  uretim: { ad: "Üretim", ayrinti: "Üretim siparişleri, proses ilerlemesi ve atamalar" },
  muhasebe: { ad: "Kasa / banka / çek", ayrinti: "Hesaplar, para hareketleri ve çekler" },
  tanimlar: { ad: "Tanımlar", ayrinti: "Renk, beden, proses, kullanıcı ve gider kartı tanımları" },
  fis_defteri: { ad: "Fiş defteri", ayrinti: "Kesilen her fişin tek kaydı — stok ve cari tarafının kaynağı" },
  modeller: { ad: "Modelhane", ayrinti: "Modeller, tasarım ve teknik çizimler" },
  gorevler: { ad: "Görevler", ayrinti: "Atanan işler ve durumları" },
  mesajlar: { ad: "Sohbet", ayrinti: "Ekip mesajları" },
  koliler: { ad: "Paketleme", ayrinti: "Koliler ve içerikleri" },
  cek_gorselleri: { ad: "Çek görselleri", ayrinti: "Çeklerin ön/arka fotoğrafları" },
};

function tabloAciklamasi(tablo) {
  return TABLO_ACIKLAMALARI[tablo] || { ad: tablo, ayrinti: "Bu veri kümesi buluta gönderilemedi." };
}

// KULLANICI ROLLERİ (17 Eylül).
//
// Kullanıcı: *"Kullanıcı gruplarında admin her şeye yetkili, üretim kullanıcısı üretim işleriyle
// alakalı yerleri görüp işlem yapabilecek, muhasebe kullanıcısı muhasebe ile alakalı, üretim +
// muhasebe kullanıcısı, bir de panel kullanıcısı — bu sadece tek ekrandan işlem yapabilecek,
// örnek olarak üretimde barkod ekranı."*
//
// ÖNCE: yetkiler her kullanıcıya modül modül, işlem işlem elle veriliyordu (7 modül × 4 işlem =
// 28 kutu). Yeni personelde bu unutuluyor ya da yanlış işaretleniyordu; "üretimci neden sipariş
// göremiyor" gibi sorunlar buradan çıkıyordu. Artık ŞABLON seçiliyor, kutular ondan doluyor —
// ve gerekirse tek tek düzeltiliyor (şablon başlangıç, kilit değil).
//
// PANEL rolü diğerlerinden farklı: menüsü yok, tek ekrana kilitli. Atölyedeki ortak tablet/telefon
// içindir — kalfanın eline verilen cihaz yalnız barkod ekranını açsın, yanlışlıkla fiş silmesin.
const ROL_SABLONLARI = [
  {
    key: "Yönetici", ad: "Yönetici (admin)",
    aciklama: "Her şeye yetkili. Kullanıcıları ve tanımları yönetir.",
    tumYetki: true,
  },
  {
    key: "Üretim", ad: "Üretim",
    aciklama: "Üretim ve stok tarafı: iş dağıtır, teslim alır, malzeme görür. Para tarafını görmez.",
    yetkiler: {
      uretim: ["goruntuleme", "duzenleme", "kaydetme"],
      stok: ["goruntuleme", "duzenleme", "kaydetme"],
      siparis: ["goruntuleme"],
      fisler: ["goruntuleme"],
    },
  },
  {
    key: "Muhasebe", ad: "Muhasebe",
    aciklama: "Cari, kasa/banka/çek ve fişler. Üretim ekranlarını görmez.",
    yetkiler: {
      cari: ["goruntuleme", "duzenleme", "kaydetme", "silme"],
      muhasebe: ["goruntuleme", "duzenleme", "kaydetme", "silme"],
      fisler: ["goruntuleme", "duzenleme", "kaydetme"],
      siparis: ["goruntuleme"],
    },
  },
  {
    key: "Üretim + Muhasebe", ad: "Üretim + Muhasebe",
    aciklama: "İki tarafı da yapan kişi (küçük atölyede sık). Tanımlar ve kullanıcılar hariç.",
    yetkiler: {
      uretim: ["goruntuleme", "duzenleme", "kaydetme"],
      stok: ["goruntuleme", "duzenleme", "kaydetme"],
      siparis: ["goruntuleme", "duzenleme", "kaydetme"],
      cari: ["goruntuleme", "duzenleme", "kaydetme"],
      muhasebe: ["goruntuleme", "duzenleme", "kaydetme"],
      fisler: ["goruntuleme", "duzenleme", "kaydetme"],
    },
  },
  {
    key: "Panel", ad: "Panel (tek ekran)",
    aciklama: "Menü yok: yalnız seçilen ekran açılır. Atölyedeki ortak cihaz için.",
    yetkiler: { uretim: ["goruntuleme", "duzenleme", "kaydetme"] },
    panelMi: true,
  },
];

// Panel rolünün açabileceği ekranlar. Liste kısa: paneldeki kişi tek bir iş yapıyor.
const PANEL_EKRANLARI = [
  { key: "barkod", ad: "Barkod ekranı (üretim)", tab: "uretim" },
  { key: "atolye", ad: "Atölye ekranı (üretim)", tab: "uretim" },
  { key: "paketleme", ad: "Paketleme", tab: "paketleme" },
];

function rolSablonu(key) {
  return ROL_SABLONLARI.find((r) => r.key === key) || null;
}

// Şablondan yetki nesnesi üretir (modül listesi çağırandan gelir).
function rolYetkileriKur(rolKey, moduller) {
  const sablon = rolSablonu(rolKey);
  const sonuc = {};
  (moduller || []).forEach((m) => {
    const izinler = sablon && sablon.tumYetki
      ? ["goruntuleme", "duzenleme", "kaydetme", "silme"]
      : ((sablon && sablon.yetkiler && sablon.yetkiler[m]) || []);
    sonuc[m] = {
      goruntuleme: izinler.includes("goruntuleme"),
      duzenleme: izinler.includes("duzenleme"),
      kaydetme: izinler.includes("kaydetme"),
      silme: izinler.includes("silme"),
    };
  });
  return sonuc;
}

// GELİR / GİDER KARTLARI (17 Eylül).
//
// Kullanıcı: *"Muhasebe tarafında gelir gider kartları açmamız lazım. Kârlılığımızı kontrol edecek,
// giderleri listeleyecek veya alışsız giderleri kapatacağımız kartlar... girişin çıkış karşılığı
// olmak zorunda çünkü."*
//
// SORUN: para hareketinin karşı tarafı yalnız CARİ olabiliyordu. Kira, elektrik, maaş, nakliye gibi
// alışı olmayan giderlerde karşı taraf yoktu — kasadan çıkıyor, "hiçbir yere" gidiyordu. Kârlılık
// bu yüzden hesaplanamıyordu.
//
// ÇÖZÜM: çift kayıt mantığının basitleştirilmiş hâli. Her para hareketinin karşı tarafı dörtten
// biri: cari, GİDER KARTI, GELİR KARTI ya da virman. Gider/gelir kartı = küçük bir hesap planı.
//
// GRUPLAR fonksiyona göre (Tek Düzen Hesap Planı'ndaki 730/760/770/780 ayrımının sadeleştirilmişi):
// üretim gideri mi, satış-pazarlama mı, genel yönetim mi, finansman mı. Kâr-zarar raporu bu
// gruplardan çıkıyor. `tdhp` alanı isteğe bağlı: muhasebeciye aktarımda 770.03 gibi kod taşınsın.
// KULLANICI TANIMLI GRUPLAR (20 Eylül): aşağıdaki liste BAŞLANGIÇ; kullanıcı Gelir/Gider
// ekranından grup ekleyip adını değiştirebiliyor. Her atölyenin gider yapısı farklı — "Fason
// işçilik" ya da "İhracat giderleri" gibi kendi başlıklarını kurabilmeli.
//
// TEK KAYNAK: genel gider defteri de, kâr-zarar dökümü de bu listeyi okuyor. Ayrı bir grup
// listesi tutmak, aynı kartın iki ekranda iki farklı grupta görünmesi demekti.
function giderGelirGruplari(tanimlar) {
  const ozel = tanimlar && tanimlar.giderGruplari;
  if (Array.isArray(ozel) && ozel.length > 0) return ozel;
  return GIDER_GELIR_GRUPLARI;
}

const GIDER_GELIR_GRUPLARI = [
  { key: "uretim", ad: "Üretim gideri", tur: "gider", tdhp: "730" },
  { key: "satis", ad: "Satış ve pazarlama", tur: "gider", tdhp: "760" },
  { key: "yonetim", ad: "Genel yönetim", tur: "gider", tdhp: "770" },
  { key: "finansman", ad: "Finansman", tur: "gider", tdhp: "780" },
  { key: "gelir", ad: "Diğer gelir", tur: "gelir", tdhp: "649" },
];

// İlk kurulumda liste boş kalmasın diye hazır kartlar. Kullanıcı ekler/siler; bunlar yalnız
// başlangıç önerisi (atölyenin gerçek kalemleri: kira, elektrik, işçilik, nakliye…).
const HAZIR_GIDER_KARTLARI = [
  { ad: "İşyeri kirası", grup: "yonetim" },
  { ad: "Elektrik · su · doğalgaz", grup: "yonetim" },
  { ad: "Telefon · internet", grup: "yonetim" },
  { ad: "Personel ücretleri", grup: "uretim" },
  { ad: "SGK · vergi", grup: "yonetim" },
  { ad: "Nakliye · kargo", grup: "satis" },
  { ad: "Makine bakım · onarım", grup: "uretim" },
  { ad: "Yakıt · araç", grup: "yonetim" },
  { ad: "Banka masrafı · faiz", grup: "finansman" },
  { ad: "Kırtasiye · sarf", grup: "yonetim" },
];

// VİRMAN SEBEBİ HAZIR ÖNERİLERİ (17 Eylül). Sabit liste DEĞİL: alan serbest yazılıyor ve daha önce
// yazılanlar öneri olarak çıkıyor (öğrenen liste). Bunlar yalnız ilk kullanımda liste boş kalmasın
// diye duruyor; kullanıcının yazdığı yeni sebep de bir dahaki sefere önerilere karışıyor.
const VIRMAN_SEBEPLERI = [
  "Döviz bozdurma",
  "Nakit çekme (bankadan kasaya)",
  "Nakit yatırma (kasadan bankaya)",
  "Hesaplar arası aktarım",
  "Kasa devri",
];

const SURUM = "1.448.0";
const SURUM_TARIHI = "2026-09-25";
const SURUM_NOTU = "Sayfa yenilenince acik sekmeler ve pencereler korunuyor";

// ================= SÜRÜM GEÇMİŞİ (23 Eylül, v1.421.0) =================
// Kullanıcı: "Bundan sonra sürümlerde yaptığımız değişiklikleri sürüm geçmişine not edelim;
// kullanıcılar bilgilensin. Tanımlar'da sürüm geçmişi kalsın: neler eklendi, değişti, hata vs."
// Her sürümde EN ÜSTE yeni kayıt eklenir. `surumdenetim.js` en üst kaydın SURUM ile aynı olmasını
// şart koşuyor: geçmişi yazmadan sürüm çıkarılamaz. GitHub'a yayınlarken "not" bu listeden gelir.
// Tarih: GG.AA.YYYY. Maddeler kullanıcı dilinde, kısa (teknik ayrıntı DEVAM-NOTU.md'de).
const SURUM_GECMISI = [
  { surum: "1.448.0", tarih: "25.09.2026",
    eklenen: [],
    degisen: ["Sayfa yenilenince (ya da yeni sürüme geçilince) ekran ana sayfaya dönmüyor: açık modül sekmeleri, bulunulan ekran ve açık ürün / üretim / sipariş pencereleri geri geliyor; veriler buluttan güncel okunuyor",
              "Açıldığı andaki bilgiyi gösteren pencereler (reçete, maliyet, fiş, ekstre, fiş taslağı) yenilemede kapanıyor — eski bilgiyi göstermesinler diye; yeniden açılınca güncel hâliyle gelir"],
    duzeltilen: [] },
  { surum: "1.447.0", tarih: "25.09.2026",
    eklenen: ["Yeni sürüme OTOMATİK GEÇİŞ: uygulama açılırken yeni sürüm yayınlanmışsa sormadan ona geçiyor; telefonda uygulama 10 dakikadan uzun arka planda kalıp yeniden açılınca da geçiyor"],
    degisen: ["Çalışırken yeni sürüm çıkarsa yarım kalan iş kaybolmasın diye otomatik geçilmiyor; üstte 'Yeni sürüm — Güncelle' şeridi çıkıyor (artık 10 dakikada bir bakılıyor)"],
    duzeltilen: ["GitHub'dan birleştirilerek yayınlanan sürümler uygulamada 'yeni sürüm' olarak görünmüyordu — artık yayın dosyası (surum.json) da okunuyor"] },
  { surum: "1.446.0", tarih: "25.09.2026",
    eklenen: ["Sipariş düzenlemede girilmiş kalemlerin ÜRÜNÜ ve RENGİ de değiştirilebiliyor (miktar ve fiyatın yanında); planlanmış ya da teslim alınmış kalemler kilitli (🔒) ve değişmiyor"],
    degisen: ["Sipariş kartında ✎ Düzenle artık yeni sipariş formunu açıyor: başlık bilgileri dolu gelir, girilmiş kalemler altta listelenir, yeni ürün de aynı formdan eklenir; 'Değişikliklerini Kaydet' ile sipariş güncellenir"],
    duzeltilen: ["Sipariş düzenleme / ürün ekleme formu tam ekran sipariş kartının ARKASINDA açılıyordu ve kartı kapatmak gerekiyordu — artık önde açılıyor"] },
  { surum: "1.445.0", tarih: "24.09.2026",
    eklenen: [],
    degisen: ["Giriş artık YALNIZ bulut hesabıyla yapılıyor: bulut girişi olmazsa eskisi gibi kayıtlı şifreyle içeri alınmıyor, giriş ekranında kalınıyor ve sebebi (şifre hatalı, hesap onaysız, bağlantı yok…) ekranda yazıyor",
              "Tanımlar > Kullanıcılar: bulut hesabı açılamazsa kullanıcı EKLENMİYOR (eskiden 'yine de yerel kaydedilsin mi?' sorulup şifre düz metin saklanıyordu); sebep pencerede gösteriliyor, form dolu kalıyor",
              "Giriş kapalıyken (yeni kurulum) kullanıcı eklemek ve İlk Kurulum: hesap önce Supabase panelinde açılıyor, uygulama aynı kullanıcı adı + şifreyle doğrulayıp kaydı ekliyor; şifre uygulamada saklanmıyor"],
    duzeltilen: ["Güvenlik: kullanıcı eklenirken ve ilk kurulumda şifre artık hiçbir durumda uygulama verisine düz metin yazılmıyor; bulut reddettiğinde kayıtlı eski şifreyle giriş de artık mümkün değil"] },
  { surum: "1.444.0", tarih: "24.09.2026",
    eklenen: [], degisen: [],
    duzeltilen: ["İç iyileştirme: giriş ekranı testlerden sürülebilir hale getirildi — kullanıcı tarafında bir değişiklik yok"] },
  { surum: "1.443.0", tarih: "24.09.2026",
    eklenen: [],
    degisen: ["Bulutla giriş yapıldığında bekleyen kayıtlar kendiliğinden gönderiliyor (şeritteki 'Yeniden giriş yapınca gönderilir' sözü artık gerçekten yerine geliyor)"],
    duzeltilen: ["Giriş yapıldığı hâlde 'Bulut oturumunuz kapandı' uyarısı ekranda kalıyordu"] },
  { surum: "1.442.0", tarih: "24.09.2026",
    eklenen: ["Sipariş düzenleme formunda 'Ürün Ekle' düğmesi: yarım kalan siparişe sonradan yeni ürün/renk eklemek için (eylem vardı ama başlıktaki yazısız + ikonundaydı)"],
    degisen: [], duzeltilen: [] },
  { surum: "1.441.0", tarih: "24.09.2026",
    eklenen: ["Belgelerde 'Yazdır' düğmesi: sipariş, fiş, cari ekstresi ve reçete doğrudan yazıcıya gönderiliyor (önce PDF indirmeye gerek yok)"],
    degisen: ["Paylaş şeridinde PDF düğmesi artık dosya ikonuyla; yazdırma ayrı düğme"],
    duzeltilen: [] },
  { surum: "1.440.0", tarih: "24.09.2026",
    eklenen: ["Uygulama artık kurulabilir: tarayıcıda 'Uygulamayı yükle' çıkıyor, masaüstüne ve telefon ana ekranına kendi ikonuyla eklenebiliyor, adres çubuğu olmadan kendi penceresinde açılıyor"],
    degisen: [], duzeltilen: [] },
  { surum: "1.439.0", tarih: "24.09.2026",
    eklenen: ["Sipariş ekranında 'Fotoğraftan bul': barkodsuz ürünün fotoğrafı çekilip kayıtlı ürün görselleriyle eşleştiriliyor, seçilen ürün kalem alanına geliyor",
              "Depo > Okut ekranında 'Fotoğraftan bul': fotoğraftan bulunan ürünün depo durumu sorgulanıyor"],
    degisen: [], duzeltilen: [] },
  { surum: "1.438.0", tarih: "24.09.2026",
    eklenen: ["Sipariş ekranında 'Kamerayla okut': telefon kamerasıyla asorti ya da çift barkodu okutup kalem eklenebiliyor (Depo > Okut ile aynı okuyucu)"],
    degisen: [], duzeltilen: [] },
  { surum: "1.437.0", tarih: "24.09.2026",
    eklenen: [],
    degisen: ["Sipariş, fiş ve cari ekstresi tablolarında renksiz/ölçüsüz malzemeler için 'Standart' yazısı gösterilmiyor: renk hücresi boş kalıyor, beden sütun başlığı 'Miktar' oluyor (kayıtlar değişmiyor)"],
    duzeltilen: [] },
  { surum: "1.436.0", tarih: "24.09.2026",
    eklenen: [],
    degisen: ["Cari ekstresinde tarih, fiş no, fiş tipi ve defter etiketi tek satırda toplandı; sade görünümde hareket tam olarak tek satıra iniyor, detaylı görünümde ürün tablosu altında duruyor"],
    duzeltilen: [] },
  { surum: "1.435.0", tarih: "23.09.2026",
    eklenen: ["Cari ekstresinde 'Sade görünüm': her hareket tek satırda özetleniyor (ürün tabloları yerine). Detaylı görünüm olduğu gibi duruyor, düğmeyle geçiliyor ve tercih hatırlanıyor"],
    degisen: [], duzeltilen: [] },
  { surum: "1.434.0", tarih: "23.09.2026",
    eklenen: [],
    degisen: ["İşçilik satırında açıklama metni yazılmıyor — ürün, adet, birim fiyat ve tutar zaten tabloda, proses adı fiş numarasında; ürünsüz işçilik kaydında açıklama duruyor"],
    duzeltilen: [] },
  { surum: "1.433.0", tarih: "23.09.2026",
    eklenen: ["Cari ekstresinde işçilik kayıtları 'İŞÇİLİK' rozetiyle işaretleniyor"],
    degisen: ["İşçilik satırında fiş no sade gösteriliyor ('10003-Üste-İşçilik' yerine '10003'); türü rozet, ayrıntısı açıklama söylüyor",
              "İşçilik satırında açıklama tam yazılıyor (hangi proses, kaç adet, birim ücret)"],
    duzeltilen: ["İşçilik kaydı cari ekstresinde alış fişiyle aynı görünüyordu — mal alınmış izlenimi veriyordu"] },
  { surum: "1.432.0", tarih: "23.09.2026",
    eklenen: [],
    degisen: ["Renksiz malzemelerde (yapıştırıcı, toka, kutu) fiş ve sipariş ekranında artık 'Standart' renk seçtirilmiyor — alan hiç çıkmıyor, doğrudan miktara geçiliyor",
              "Ürünün tek rengi varsa o renk kendiliğinden seçili geliyor"],
    duzeltilen: [] },
  { surum: "1.431.0", tarih: "23.09.2026",
    eklenen: ["Fiş kaydedilmeden önce ONAY adımı: hangi üründen ne kadar stok değişeceği özetleniyor; alış ve satışta da var",
              "Stokta bulunamayan kalem varsa kayıt engelleniyor (veri hatası bariyeri)"],
    degisen: ["Alış siparişindeki 'Alış Fişi Oluştur' artık cari ALIŞ fişini açıyor — satışla aynı ekran; sipariş kartındaki eski teslim formu kullanılmıyor",
              "Sipariş kartından kesilen alış fişinin numarası artık cari fiş numarası (AF-…)",
              "Fiş, kalemlerin hepsi tek para birimindeyse o para biriminde açılıyor (siparişin dövizi korunsun diye)"],
    duzeltilen: [] },
  { surum: "1.430.0", tarih: "23.09.2026",
    eklenen: [],
    degisen: ["Pencere başlığındaki Kaydet düğmesi renkli şeride uyumlu (beyaz, saydam) — iki kırmızı çakışmıyor"],
    duzeltilen: ["Pencere başlığında iki kapatma düğmesi görünüyordu (X ve Kapat); X kaldırıldı, Vazgeç formun altındaki düğmede ve Esc ile çalışmaya devam ediyor"] },
  { surum: "1.429.0", tarih: "23.09.2026",
    eklenen: [],
    degisen: [],
    duzeltilen: ["Geliştirme denetimindeki yanlış alarm giderildi (bilerek kullanılmayan değişken 'ölü kod' sanılıyordu)"] },
  { surum: "1.428.0", tarih: "23.09.2026",
    eklenen: ["'Siparişten seç' panelinde koli grubuna kaç koli ekleneceği yazılabiliyor (boş bırakılırsa hepsi)"],
    degisen: ["Hazır koliler artık tek tek değil, aynı asortidekiler TEK SATIRDA toplanarak gösteriliyor — ekranı doldurmuyor; kod kod seçmek için 'tek tek seç' ile liste açılıyor"],
    duzeltilen: [] },
  { surum: "1.427.0", tarih: "23.09.2026",
    eklenen: [],
    degisen: ["Fiş ekranındaki 'Kalem Ekle' bölümü geniş ekranda iki sütun: solda elle kalem girişi, sağda koli okutma ve siparişten ekleme — sağ taraftaki boşluk değerlendirildi; dar ekranda alt alta iniyor"],
    duzeltilen: [] },
  { surum: "1.426.0", tarih: "23.09.2026",
    eklenen: ["'Siparişten seç' panelinde siparişe ait hazır koliler barkod tarzında listelenir (kod, çift, beden dağılımı); tek tıkla ya da 'Tümünü ekle' ile eklenir"],
    degisen: ["Koli barkodu okutma ve siparişten koli seçme aynı fonksiyonu kullanıyor — biri düzelince ikisi düzelir"],
    duzeltilen: ["Bir koli, sipariş kaleminin yalnızca bir kısmını karşılasa bile o kalem 'bekleyen' listesinden TAMAMEN düşüyordu; kalan miktar artık doğru hesaplanıyor"] },
  { surum: "1.425.0", tarih: "23.09.2026",
    eklenen: [],
    degisen: ["Sipariş kartından 'Satış Fişi Oluştur' artık yalnızca satış fişini AÇAR; hazır miktar ve koli otomatik doldurma kaldırıldı — fişteki standart 'Siparişten seç' ve 'Koli okut' ile ekleniyor",
              "'Siparişten seç' artık hazır/olmayan ayrımı yapmadan siparişin tüm kalanını ekler (standart davranış)"],
    duzeltilen: [] },
  { surum: "1.424.0", tarih: "23.09.2026",
    eklenen: ["Satış fişinde koliden gelen satırlar 'koli içi miktar × koli adet' olarak gösterilir; aynı asortideki koliler tek satırda toplanır, farklı asorti ayrı satır olur"],
    degisen: ["Satış fişinin üç bölümünü (üst bilgi, Kalem Ekle, kalem tablosu) ayıran çizgiler kalınlaştırıldı"],
    duzeltilen: [] },
  { surum: "1.423.0", tarih: "23.09.2026",
    eklenen: ["Sipariş kartında 'Koliler': siparişe ait koliler, hazır / sevk edildi, hangi fişle çıktığı",
              "Satış fişinde koliler koli koli görünür (koli no, çift, beden dağılımı); tek koli fişten çıkarılabilir",
              "Paketleme: seçili kolileri 'Elle kapat — sevk edildi say' (stok değişmez, sebep kaydedilir)"],
    degisen: ["Sipariş kartından 'Satış Fişi Oluştur': siparişin hazır kolileri koli satırı olarak yüklenir; yalnız koliye girmemiş hazır miktar düz satır olur"],
    duzeltilen: ["Siparişten satışta koliler 'Hazır' kalıyor, depo 'serbest −152' gösteriyordu; artık koliler kapanıyor",
                 "Aynı beden fişte iki satırda geçince stok kartında aynı bedenin ikinci satırı açılıyordu",
                 "Siparişten açılan fişte aynı bedenleri taşıyan ikinci koli atılıyordu",
                 "Kolide duran malı koli okutmadan düz satırla satarken uyarı veriliyor"] },
  { surum: "1.422.0", tarih: "23.09.2026",
    eklenen: [],
    degisen: ["Satış artık TEK ekran: sipariş kartından, cari kartından ve Depo > Sevkiyat'tan 'Satış' deyince aynı satış fişi açılır; diğerleri yalnız köprü",
              "Sipariş kartı 'Satış Fişi Oluştur': HAZIR (üretilmiş/tedarik edilmiş) satırlar yüklü gelir, hazır yoksa kalan; hazır ürünler matrisi kartta duruyor",
              "Depo > Sevkiyat kayıt yapmaz: müşteri başına 'Satış fişini aç'; kaydedilen koliler listeden düşer"],
    duzeltilen: ["Koli barkodu kutusu telefonda Enter'a tepki vermiyordu; artık 'Koliyi ekle' düğmesi var (Depo Okut, Sevkiyat, satış fişi ortak)"] },
  { surum: "1.421.0", tarih: "23.09.2026",
    eklenen: ["Tanımlar > Sistem > Sürüm geçmişi: hangi sürümde ne eklendi, ne değişti, ne düzeltildi"],
    degisen: ["GitHub'a yayınlarken sürüm notu geçmişten otomatik alınıyor; 'yeni sürüm var' şeridi değişiklikleri gösteriyor"],
    duzeltilen: [] },
  { surum: "1.420.0", tarih: "23.09.2026",
    eklenen: ["Cari kartından açılan satış fişinde 'Koli okut': koli okutulunca müşteri seçilir, kalemler siparişe bağlı eklenir",
              "Satış fişinde 'Siparişten seç' (alışta zaten vardı)"],
    degisen: ["Depo > Sevkiyat koliler müşteriye göre gruplanıyor; her müşteri kendi satış fişini alıyor",
              "Kolinin siparişi üretim üzerinden de bulunuyor (koli › üretim › sipariş); bulunamazsa satır serbest yazılıyor"],
    duzeltilen: ["Ürün kartındaki para birimi simgesi ('₺') fişte 'Kur bulunamadı' hatasına yol açıyordu"] },
  { surum: "1.419.0", tarih: "23.09.2026",
    eklenen: [],
    degisen: ["Tanımlar yeniden düzenlendi: Firma / Ürün / Üretim · Kullanıcılar / Görünüm / Yayın · Yedek & Bulut / Bakım / Çöp",
              "Eski 'Sürüm yayınla' formu kaldırıldı (GitHub'a yayınla aynı işi yapıyor)"],
    duzeltilen: [] },
  { surum: "1.418.0", tarih: "22.09.2026", eklenen: [], degisen: [],
    duzeltilen: ["GitHub anahtarı kaybolabiliyordu; artık uygulamanın kendi deposunda kalıcı, ekranda 'kayıtlı' rozeti"] },
  { surum: "1.417.0", tarih: "22.09.2026", eklenen: [], degisen: [],
    duzeltilen: ["Telefonda GitHub'a yayınlarken dosya seçilemiyordu (seçici filtresi kaldırıldı, HTML içerikten doğrulanıyor)"] },
  { surum: "1.416.0", tarih: "22.09.2026", eklenen: [], degisen: ["Sevkiyatta siparişe bağlı olmayan koliye sipariş seçilebiliyor"], duzeltilen: [] },
  { surum: "1.415.0", tarih: "22.09.2026",
    eklenen: ["Depo > Sevkiyat: kolileri okutup depodan sevk (kamyonet ikonu)"], degisen: [], duzeltilen: [] },
  { surum: "1.414.0", tarih: "22.09.2026",
    eklenen: ["Tanımlar > GitHub'a yayınla: yeni sürüm uygulamadan yükleniyor (tek işlem)"], degisen: [], duzeltilen: [] },
  { surum: "1.413.0", tarih: "22.09.2026",
    eklenen: ["Ürün kartı > Barkodlar: her beden için etiket basma; seçili bedenler için toplu basım (kopya adetli)"], degisen: [], duzeltilen: [] },
  { surum: "1.412.0", tarih: "22.09.2026", eklenen: [], degisen: [],
    duzeltilen: ["Kamera: uygulama indirilen dosyadan açılınca doğru uyarı (https bağlantısından açılmalı)"] },
  { surum: "1.411.0", tarih: "22.09.2026",
    eklenen: ["Depo > Okut: telefon kamerasıyla barkod okutup malın depodaki durumuna bakma (stok, kolide, serbest, bekleyen siparişler)"],
    degisen: [], duzeltilen: [] },
  { surum: "1.410.0", tarih: "22.09.2026", eklenen: [], degisen: [],
    duzeltilen: ["Bu cihaza yazma hatası (depo dolu) sessiz kalıyordu; artık uyarı penceresi çıkıyor",
                 "Çöpten geri yükleme: yazma tutmazsa kayıt çöpte kalıyor (eskiden kaybolabiliyordu)"] },
  { surum: "1.409.0", tarih: "22.09.2026", eklenen: [], degisen: [],
    duzeltilen: ["Üretim işçiliği personel carisine ters yazılıyordu; artık biz personele borçlanıyoruz (Alacak)",
                 "Kâr-zarar raporu işçiliği yönden bağımsız sayıyor"] },
  { surum: "1.408.0", tarih: "22.09.2026", eklenen: [], degisen: [],
    duzeltilen: ["İnternet kesilip gelince bekleyen kayıtlar eski veriyle yazılıyor, arada girilen iş siliniyordu",
                 "Fiş penceresinin başlığındaki Kaydet / Ctrl+S eski değerlerle kaydediyordu"] },
  { surum: "1.407.0", tarih: "22.09.2026", eklenen: [], degisen: [],
    duzeltilen: ["11 işlem fonksiyonu eski veriyle çalışabiliyordu (rezervasyon, çöp, muhasebe, koli, fiş defteri)"] },
  { surum: "1.406.0", tarih: "22.09.2026", eklenen: [], degisen: [],
    duzeltilen: ["Üretim geri alınınca fişler defterde iptal edilmiyordu", "Aynı fişe çift tıklama iki kez işleyebiliyordu",
                 "Üretim sekmesinde liste bir an boş görünüyordu"] },
  { surum: "1.405.0", tarih: "21.09.2026",
    eklenen: ["Reçete şablonları (Tanımlar > Üretim)", "Modelhanede liste/katalog görünümü ve resim büyütme"], degisen: [], duzeltilen: [] },
];

const HAREKET_GECMIS_SINIRI = 1000;



// TASARIM TOKENLARI (ERP standardı, 20 Eylül). Ekrandaki :root ve YAZDIRMA ÇERÇEVESİ aynı
// tabloyu okuyor: iframe'de var(--erp-*) tanımsız kalırsa yazı siyaha düşer, bu yüzden
// etiketYazdir/fisYazdir de bu bloğu head'e gömüyor.
const ERP_TOKENLARI = {
  "--erp-text": "#4A3B28", "--erp-text-2": "#7A6A50", "--erp-text-3": "#9B8B72",
  "--erp-border": "#C9B99A", "--erp-border-2": "#E4D8C0",
  "--erp-panel": "#FBF6EC", "--erp-panel-2": "#F2E8D8",
  "--erp-primary": "#4E6B4E", "--erp-primary-2": "#2C4029", "--erp-info": "#3D6B8A",
  "--erp-brown": "#8A5A38", "--erp-warn": "#B85C2E", "--erp-orange": "#E1611F",
  "--erp-orange-bg": "#FCE7DA", "--erp-purple": "#6B4E8A", "--erp-danger": "#B3261E",
};
// KÖPRÜ (20 Eylül): kullanıcının erp-tokens.css'i geldi. Bizim semantik isimler ONUN
// isimlerine bağlanıyor — kod değişmeden tema değişir. Sağdaki değerler standardın paleti.
//   --erp-text/-2/-3 ve --erp-panel: aynı isim, standart doğrudan tanımlıyor.
//   border → line, border-2 → line-soft, panel-2 → head, primary → ok, warn → wait,
//   danger → void, orange → accent (tek aksiyon rengi), brown → wait (kahve vurgu).
const ERP_KOPRU = {
  "--erp-border": "var(--erp-line)", "--erp-border-2": "var(--erp-line-soft)",
  "--erp-panel-2": "var(--erp-head)",
  "--erp-primary": "var(--erp-ok)", "--erp-primary-2": "var(--erp-ok)",
  "--erp-warn": "var(--erp-wait)", "--erp-danger": "var(--erp-void)",
  "--erp-orange": "var(--erp-accent)", "--erp-orange-bg": "var(--erp-accent-tint)",
  "--erp-brown": "var(--erp-wait)", "--erp-purple": "var(--erp-info)",
  // KÖŞE YUVARLATMA (kullanıcı, 20 Eylül: iki görüntüyü karşılaştırdı, "köşe yuvarlama olsun").
  // Kodda 700+ inline değer bu dört kademeye bağlı. Standardın --erp-radius:0'ı BİLEREK
  // uygulanmıyor; fikir değişirse burası: dördünü de var(--erp-radius) yapmak yeter.
  "--erp-r-sm": "4px", "--erp-r-md": "7px", "--erp-r-lg": "11px", "--erp-r-pill": "999px",
  // Koyu bildirim kutusu zemini (tema köprüsünün kapsamadığı eski kahve tonu).
  "--erp-toast": "var(--erp-shell)",
};
function erpTokenCss() {
  // Ekran: kullanıcının CSS'i + köprü. Yazdırma çerçevesi de aynı ikisini gömüyor.
  return ERP_TOKENS_CSS + "\n:root{" + Object.entries(ERP_KOPRU).map(([k, v]) => `${k}:${v}`).join(";") + "}";
}
// Yalnız hex tablo (tema dosyası yoksa geriye dönüş / dışa aktarım için).
function erpTokenHexCss() {
  return ":root{" + Object.entries(ERP_TOKENLARI).map(([k, v]) => `${k}:${v}`).join(";") + "}";
}

// HEX + ALFA BİRLEŞTİRMESİ (token geçişi, 20 Eylül): kod 50 yerde `alfaEkle(renk, "14")` diye hex'e
// opaklık ekliyordu. Renk artık var(--erp-*) olunca "var(--erp-primary)14" geçersiz kalıyor
// ve zemin şeffafa düşüyordu. Bu yardımcı her ikisini de işliyor: hex'e ekler, token'ı
// color-mix ile karıştırır.
function alfaEkle(renk, hexAlfa) {
  if (!renk || typeof renk !== "string") return renk;
  if (renk.startsWith("var(")) {
    const yuzde = Math.round((parseInt(hexAlfa, 16) / 255) * 100);
    return `color-mix(in srgb, ${renk} ${yuzde}%, transparent)`;
  }
  return renk + hexAlfa;
}

// NUMUNE ÜRETİMİ — SANAL ÜRÜN (Modelhane 3. tur, 20 Eylül).
//
// Numune, koleksiyona girmemiş bir MODEL için üretilir; ürün kartı yoktur (1. tur kararı: model
// stok ürünü değildir). Üretim modülü ise her yerde `urun.recete`, `urun.prosesUcretleri`
// okuyor. 15 okuma noktasına "ürün yoksa modelden" dalı eklemek yerine tek noktada SANAL ÜRÜN
// üretiliyor: reçete ve ad üretim siparişine kopyalanmış, buradan okunuyor.
//
// Mamul stoğuna GİRMEMESİ kendiliğinden sağlanıyor: teslim alma, stoktaki ürünü `id` ile
// bulup miktar artırır; sanal ürün stokta olmadığı için giriş yazılacak yer yok. Hammadde
// tüketimi ise reçete üzerinden normal düşer — istenen tam olarak bu.
function uretimUrunu(siparis, stok) {
  if (siparis && siparis.numuneMi) {
    return {
      id: siparis.modelId || `numune-${siparis.id}`, ad: siparis.model || "Numune",
      kategori: "Mamul", sanalNumune: true,
      recete: siparis.recete || [], prosesUcretleri: siparis.prosesUcretleri || {},
      variants: [], hareketler: [], gorseller: [], kod: siparis.modelKod || "",
    };
  }
  return (stok || []).find((p) => p.id === (siparis && siparis.urunId)) || null;
}

// HAMMADDE ALIŞ FİYATI TL (kullanıcı, 20 Eylül: "reçetede maliyet hesaplarken stok para
// birimlerini de hesapla; şu anda her şey TL gibi davranıyorsun ama USD/EUR olanları da
// toplaman lazım"). Deri çoğu zaman dolarla alınır; kartta 2,5 $ yazan fiyatı 2,5 ₺ saymak
// maliyeti 20 kat düşük gösteriyordu. Kur muhasebe ayarlarından (`muhasebe.kurlar`).
// KURU EKSİK PARA BİRİMİ (21 Eylül): kur tablosunda olmayan bir birimde fiyat olduğu gibi
// (çevrilmeden) sayılıyor — 2,5 $ → 2,5 ₺. Sessiz kalması tehlikeli: maliyet 48 kat düşük
// görünür ve kimse fark etmez. Bu yardımcı eksik birimi döndürür; ekranlar uyarı basar.
// SİMGE → KOD (kullanıcı, 21 Eylül: "kuru otomatik çekmesi lazım"). Kurlar zaten otomatik
// çekiliyordu (USD/EUR anahtarlarıyla); ama stok kartları para birimini SİMGEYLE saklıyor
// ("$", "€", "₺"). `kurlar["$"]` hiç bulunmadığı için dolar fiyatları çevrilmiyor, uyarı da
// "$, ₺ kuru girilmemiş" diyordu — TL için bile. Cari ekranındaki `PARA_KODU` eşlemesiyle aynı.
function alisPbKodu(urun) {
  const ham = String((urun && urun.alisParaBirimi) || "").trim();
  if (!ham || ham === "₺" || ham === "TL" || ham === "TRY") return "TRY";
  const esleme = { "$": "USD", "€": "EUR", "£": "GBP", USD: "USD", EUR: "EUR", GBP: "GBP" };
  return esleme[ham] || ham.toUpperCase();
}

function alisKuruEksik(urun, kurlar) {
  if (!urun || !(parseFloat(urun.alisFiyati) > 0)) return null;
  const pb = alisPbKodu(urun);
  if (pb === "TRY") return null;
  return (kurlar || {})[pb] ? null : pb;
}

function alisFiyatiTL(urun, kurlar) {
  if (!urun) return 0;
  const tutar = parseFloat(urun.alisFiyati) || 0;
  const pb = alisPbKodu(urun);
  if (pb === "TRY") return tutar;
  const kur = (kurlar || {})[pb];
  return kur ? tutar * kur : tutar;
}

// BULUT HATASINI İNSAN DİLİNE ÇEVİR (21 Eylül). Kullanıcı ekranında ham JSON gördü:
// `Supabase 401: {"code":"42501", ... "GRANT ... TO anon" ... permission denied for table muhasebe}`
// ve kasayı ya da sıfırlamayı suçladı. Oysa 42501 + "anon" = istek OTURUM JETONU OLMADAN gitti:
// rls-kimlik.sql anonim yazmayı bilerek kapatıyor. Veride sorun yok, giriş yok.
// Ham metin altta küçük punto kalıyor (destek için), üstte ne yapılacağı yazıyor.
function bulutHatasiAciklamasi(hata) {
  const h = String(hata || "");
  if (/42501/.test(h) && /\banon\b/.test(h)) {
    return "Bu cihaz buluta GİRİŞ YAPMADAN yazmaya çalıştı (oturum yok ya da süresi doldu). Veride sorun yok. Çıkış yapıp bulut hesabınızla yeniden girin, sonra \"Yeniden dene\".";
  }
  if (/42501/.test(h)) {
    return "Veritabanı bu tabloya yazma izni vermiyor. Supabase'de rls-kimlik.sql yeniden çalıştırılmalı (tablo sıfırlandıysa yetkiler de sıfırlanır).";
  }
  if (/42P01/.test(h) || /does not exist/.test(h)) {
    return "Bu tablo veritabanında yok. Sıfırlamadan sonra ilgili kurulum SQL'i çalıştırılmalı.";
  }
  if (/Failed to fetch|NetworkError/i.test(h)) {
    return "İnternet bağlantısı yok ya da buluta ulaşılamıyor. Bağlantı gelince \"Yeniden dene\".";
  }
  return null;
}


// HAMMADDE BİRİM FİYATI — RENK VE BOY DAHİL (kullanıcı, 21 Eylül: "boy olan fiyatları maliyet
// çekmiyor"). Boylu malzemelerin (fermuar, bağcık, fort bombe 1 mm…) alış fiyatı ürün kartında
// DEĞİL, `fiyatKurallari`nda boy/renk kuralı olarak duruyor; maliyet yalnız `alisFiyati`na baktığı
// için 0 çıkıyordu. Fişlerin kullandığı `fiyatBul` kullanılıyor — ekranda ne kesilirse maliyet de
// onu görür. Kural yoksa kart fiyatına düşer.
// Döner: { kendiFiyat, pb, tl, kaynak } — kendi biriminde fiyat, birim kodu, TL karşılığı.
function hammaddeBirimFiyati(hammadde, renk, beden, kurlar) {
  if (!hammadde) return { kendiFiyat: 0, pb: "TRY", tl: 0, kaynak: "yok" };
  let bulunan = null;
  try { bulunan = fiyatBul(hammadde, renk || null, beden || null, "", "Alış", []); } catch (e) { bulunan = null; }
  const kuralVar = bulunan && bulunan.kaynak && bulunan.kaynak !== "Genel" && parseFloat(bulunan.fiyat) > 0;
  const kendiFiyat = kuralVar ? parseFloat(bulunan.fiyat) : (parseFloat(hammadde.alisFiyati) || 0);
  const pb = kuralVar ? alisPbKodu({ alisParaBirimi: bulunan.paraBirimi }) : alisPbKodu(hammadde);
  const kur = pb === "TRY" ? 1 : parseFloat((kurlar || {})[pb]) || 0;
  return { kendiFiyat, pb, tl: kur ? kendiFiyat * kur : kendiFiyat, kaynak: kuralVar ? bulunan.kaynak : "Kart" };
}
