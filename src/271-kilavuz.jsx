// ================= KULLANIM KILAVUZU (v1.698 → v1.711 resimli, ayrıntılı) =================
// Kullanıcı: "Kullanım kılavuzu yapabilir miyiz" — karar: uygulamanın İÇİNDE (sürümle birlikte güncel kalır), çalışan ve
// yönetici için ayrı bölümler; kullanıcının rolüne göre ilgili bölüm önde açılır. İçerik veri olarak (KILAVUZ) tutulur:
// yeni bir ekran ya da iş akışı eklenince buraya bir madde eklemek yeter. Arama başlık + adım + ipucu metninde yapılır.
// Ekran adları menüdeki adlarla AYNI yazılır (kullanıcı ekranda aradığını burada da aynı adla bulsun).
//
// RESİMLER (v1.711 — kullanıcı: "kılavuz daha detaylı olsun, resimli olsun"): `kilavuz/<ad>.jpg` dosyaları, uygulamanın
// yayınlandığı klasörün yanında (GitHub Pages aynı depo). `test/kilavuz-resim.js` sanal veriyle uygulamayı gezip üretir;
// bir ekran değişince yeniden koşulur. HTML'e gömülmez (5 MB'lık uygulama 2,4 MB daha şişmesin); yüklenemezse (dosya
// yok, çevrimdışı) satır sessizce gizlenir — metin tek başına yeterli kalır. Her konu `resimler: [{ d: dosya, a: altyazı }]`.
const KILAVUZ = [
  // ---------------- ÇALIŞAN ----------------
  { b: "calisan", baslik: "Ekran düzeni ve temel kurallar", resimler: [{ d: "anasayfa", a: "Anasayfa: üst menü, sekme şeridi ve özet kartları" }], adimlar: [
    "Üstte ana menü var: Anasayfa, Depo, Üretim, Planlama, Siparişler, Finans. Bir grubun adına dokununca altındaki ekranlar açılır (Depo: Stok, Ürün Stok, Fiyat Listesi, Depo, Paketleme, Sevkiyat, Alış / Satış).",
    "Açtığınız her ekran, menünün altındaki şeritte sekme olarak durur; sekmeye dokununca ona geçersiniz, × ile kapatırsınız. Kapatılan ekran kaybolmaz; yeniden açınca kaldığı yerden devam eder.",
    "Sağ üstteki ikonlar: Sohbet (görevler ve mesajlar), Kılavuz (kitap), Günlük (yalnız yetkililer), Uyarılar (üçgen), Tanımlar (dişli) ve kullanıcı menüsü (baş harfleriniz).",
    "Şeridin sağındaki yeşil kutu güncel dolar ve euro kurudur. Kalem simgesiyle elle girilir; döner ok TCMB'den çeker.",
    "İnternet yokken uygulama kilitlenir ve kayıt girilmez — yarım kayıt oluşmasın diye. Bağlantı gelince kendiliğinden açılır.",
    "\"Buluta yazılamadı\" uyarısı çıkarsa veri bu cihazda saklanmıştır; bağlantı düzelince yeniden gönderilir. Uyarıya dokununca hatanın metni görünür.",
    "Bilgi mesajları (\"kaydedildi\", \"kur güncellendi\") ekranın sol altında çıkar, dokununca kapanır.",
    "Listelerin sütun başlıklarının altındaki küçük kutular süzgeçtir: yazdıkça liste daralır. Tarih için gg.aa, tutar için >1000, <500 ya da 100-500 yazabilirsiniz.",
    "Kartlarda ve listelerde sağ tık (telefonda uzun basma) ile o kayda ait eylemler (yazdır, düzenle, sil, tam ekran) açılır.",
  ], ipucu: "Anasayfadaki kartlara dokununca ilgili ekran açılır: bekleyen sipariş, açık üretim, alacak, kasa." },

  { b: "calisan", baslik: "Sipariş girmek", resimler: [{ d: "siparis-form", a: "Yeni satış siparişi formu" }], adimlar: [
    "Siparişler › Sipariş › \"Yeni Sipariş\". Form tam ekran açılır.",
    "Müşteri kutusuna ünvan, kod ya da telefonun bir parçasını yazıp listeden seçin. Müşteri yoksa yanındaki + ile hızlıca açabilirsiniz.",
    "Sipariş tarihi bugündür; teslim tarihini girin (termin takibi ve planlama bu tarihe bakar). Müşteri sipariş kodu, belge no ve sezon isteğe bağlıdır.",
    "Cari Defteri: Genel ya da Resmi. Resmi seçilirse fiş ve cari hareketi resmi defterde tutulur; sonradan değişmez.",
    "Kalem Ekle: Ürün kutusuna model adını ya da kodunu yazıp seçin; sonra rengi seçin. Beden kutuları renk seçilince açılır.",
    "Asorti varsa asortiyi ve set sayısını seçip \"Uygula\"ya basın — beden miktarları dolar. Asortisiz girişte miktarları beden kutularına tek tek yazın.",
    "Birim fiyat ve para birimini girin; KDV açıksa oranı kontrol edin. \"Ekle\" ile kalem listeye iner. Başka renk ya da model için aynı adımları tekrarlayın.",
    "Satırdaki notu (kalem notu) ve proses notlarını üretim kartı ve iş emri de gösterir; atölyeye iletilecek özel isteği buraya yazın.",
    "Bitince üstteki \"Siparişi Kaydet\". Kaydedilen sipariş listede \"Bekliyor\" durumunda görünür ve Planlama'ya düşer.",
  ], ipucu: "\"Barkod okut · kamera · ses · fotoğraf\" şeridinden ürünü okutarak ya da fotoğrafını çekerek de kalem ekleyebilirsiniz." },

  { b: "calisan", baslik: "Sipariş listesi ve sipariş kartı", resimler: [{ d: "siparis-liste", a: "Sipariş listesi: durum çipleri ve sipariş satırları" }], adimlar: [
    "Siparişler › Sipariş: üstteki çipler duruma göre süzer (Bekliyor, Üretimde, Hazır, Tamamlandı, İptal, Tümü). Arama kutusu sipariş no, müşteri ve model arar.",
    "Satıra dokununca sipariş kartı açılır: kalemler renk × beden matrisinde, karşılanan ve kalan miktarlarla.",
    "Kartın başlığındaki eylemler sabit sırada: Yazdır / PDF / WhatsApp, Düzenle, Tam ekran, Kapat. Sipariş çıktısı model görseli ve beden dağılımıyla basılır.",
    "Tedarik Planlama bölümü (kartın içinde, dokununca açılır) kalemleri üretime ya da satın almaya gönderir; aynı iş Planlama ekranından toplu da yapılır.",
    "\"Tahsilat Gir / Ödeme Gir\" düğmesi siparişe bağlı ödeme açar; sipariş kartı ödenen ve kalanı gösterir.",
    "İptal: kalemleri üretime gitmemiş sipariş iptal edilir, gitmişse önce üretim bağı çözülür. Silme yalnız yetkili kullanıcıya açıktır ve çöp kutusuna gider.",
  ] },

  { b: "calisan", baslik: "Planlama: siparişten üretim ya da satın alma", resimler: [{ d: "planlama", a: "Sipariş Planlama: Bekleyen çerçevesi, Üret/Satınalma panelleri ve altta Planlanmış" }], adimlar: [
    "Planlama › Sipariş Planlama. \"Bekleyen\" çerçevesi, bekleyen kalemi olan tüm satış siparişlerinin ürün × renk satırlarını beden beden listeler; çerçeve kendi içinde kayar.",
    "Satırın sonundaki çekiç (Üret) ya da kutu (Satın Al) simgesi o satırı sağdaki panele gönderir. Birden çok satırı tikleyip \"Seçilenleri üret\" derseniz üretimler doğrudan açılır.",
    "\"Satın almaya gönder\" seçilenleri Satınalma paneline toplar; orada tedarikçiyi seçip alış siparişi oluşturursunuz.",
    "Üret panelinde her satır ayrı bir üretim olur (aynı ürün + renk tek üretimde birleşir). Üretim açılınca kalem \"planlı\" olur ve Bekleyen'den düşer.",
    "Reçetesi onaylı olmayan modelin üretimi açılmaz; uyarı hangi modelin reçetesinin eksik olduğunu söyler. Ürün kartı › Reçete'den onaylayıp dönün.",
    "Alttaki \"Planlanmış\" çerçevesi üretime ya da satın almaya gönderilmiş, henüz tamamlanmamış kalemleri gösterir; hücreye dokununca bağlı üretim ya da alış siparişine gidersiniz.",
    "Sipariş İhtiyaç Planlama ve Hammadde İhtiyaç sekmeleri reçeteye göre eksik hammaddeyi hesaplar; oradan tedarikçiye hammadde alış siparişi açılır.",
  ], ipucu: "Planlanmış bir satırı geri almak için ilgili üretimi silmek gerekir; silme kalemi yeniden Bekleyen'e döndürür." },

  { b: "calisan", baslik: "Proses planlama: işi yapacak cariyi önceden ayırmak", resimler: [{ d: "proses-planlama", a: "Proses Planlama: Saya sekmesi, Bekleyen ve Planlanan çerçeveleri" }], adimlar: [
    "Planlama › Proses Planlama. Üstte her proses ayrı sekme (Kesim, Saya, Kalfa…); yanında o proseste bekleyen iş sayısı.",
    "\"Bekleyen\": açık üretimlerin bu prosesteki henüz verilmemiş adımları. Sırası gelmiş iş normal, önceki proses bitmemiş iş soluk görünür (\"önceki proseste\"); o da planlanabilir.",
    "İşleri tikleyip \"Seçilenleri planla\" deyince alttaki \"Planlanan\" çerçevesine iner. Orada her işe \"Cari\" kutusundan işi yapacak kişiyi seçin.",
    "Plan iş vermez: stok, cari ya da fiş hareketi yazmaz; yalnız sırayı ve kişiyi ayırır. İş yine üretim kartından, sırası gelince verilir.",
    "Planlanan kişi üretim kartında \"Planlandı: …\" etiketiyle görünür ve Kime kutusu onunla dolu gelir; barkod ekranında kişi kendi ekranına girince \"Bana planlanan işler\" listesini görür.",
    "Süre ve bitiş tahmini: kişinin saatlik adedi ve çalışma saati girilmişse ondan, yoksa makine/kalıp kapasitesinden hesaplanır. \"kapasite ?\" görünen işin ürününe makine bağlı değildir.",
    "Yukarı/aşağı oklar sırayı değiştirir, × plandan çıkarır; \"Kart\" üretim kartını açar.",
  ] },

  { b: "calisan", baslik: "Üretim listesi ve üretim kartı", resimler: [{ d: "uretim-liste", a: "Üretim Takibi: aşama çipleri ve üretim satırları" }, { d: "uretim-kart", a: "Üretim kartı: Prosesler sekmesi, sıradaki adım açık" }], adimlar: [
    "Üretim › Üretim. Üstte tarih süzgeci (Tümü, Bugün, Bu Hafta, Bu Ay) ve aşama çipleri (Kesim, Saya…, Tamamlandı). Satırdaki aşama, üretimin şu an beklediği prosestir.",
    "\"Yeni Üretim Siparişi\": siparişten bağımsız, stoğa üretim açar (model, renk, beden miktarları). Siparişe bağlı üretimler Planlama'dan açılır.",
    "Satıra dokununca kart açılır. Üstte model, üretim no, miktar ve beden dağılımı; \"Prosesler\" ve \"Hammadde İhtiyacı\" sekmeleri.",
    "Prosesler sırayla listelenir; yalnız sırası gelen adımda iş verme formu açıktır. Önceki adım teslim etmeden sonraki adıma iş verilemez — kural budur ve sonradan geri alma da adım adım, sondan başa yapılır.",
    "Ara proses (ör. Kampre) kendiliğinden tamamlanır: bir sonraki asıl proses verildiğinde kapanır ve fasoncusuna işçilik yazılır.",
    "Sağ tık › Barkod etiketi ve İş emri: üretim ve parça barkodlarını, A4 iş emrini (model görseli, müşteri, proses bazlı hammadde) basar.",
    "\"Hammadde İhtiyacı\" sekmesi reçeteye göre bu üretimin tüm malzemesini, stokta olan ve eksik olanı gösterir.",
  ] },

  { b: "calisan", baslik: "Üretimde iş vermek", resimler: [{ d: "uretim-kart", a: "İş verme: beden kutuları, verilen hammadde, Kime ve İşi Ver" }], adimlar: [
    "Üretim kartında sıradaki proses açık gelir (kırmızı çerçeveli). Beden kutularına bu kişiye verilecek miktarları yazın; boş bırakılan beden kalanın tamamı sayılır. Asorti seçip \"Uygula\" ile de doldurabilirsiniz.",
    "\"Verilen hammadde\" tablosu reçeteye göre çıkacak malzemeyi gösterir. Gerçekte farklı verdiyseniz (deri 390 desi gibi) sayıyı düzeltin; boş bırakırsanız reçete kadar verilmiş sayılır. Artan, teslim alırken hesaplanır.",
    "\"Kime\" kutusundan personeli seçin. Listede bu prosese bağlı personel çıkar; kimse bağlı değilse herkes. Planlama'da kişi ayrıldıysa kutu dolu gelir ve \"Planlandı\" etiketi görünür.",
    "\"İşi Ver\": hammadde stoktan düşer, rezervasyonlar tüketilir, parça barkodu üretilir. Kalan miktar varsa aynı prosese başka kişiye de verilebilir (iş bölünür, her parça kendi barkodunu alır).",
    "Yanlış verdiyseniz atamanın yanındaki \"Geri Al\" işi geri çeker ve hammaddeyi stoğa döndürür — ancak teslim alınmamışsa.",
  ], ipucu: "Hammadde stokta yoksa iş verilemez (eksi stok kırpılmaz). Depo › Stok Girişi ile alışı girin ya da Hammadde İhtiyaç'tan alış siparişi açın." },

  { b: "calisan", baslik: "Üretimde işi teslim almak", resimler: [{ d: "uretim-teslim", a: "Teslim Al formu: verilen, sağlam, tamir, hurda satırları" }], adimlar: [
    "Üretim kartında verilmiş atamanın altında \"Teslim Al\" formu durur. Beden sütunlarında verilen miktar yazar; Sağlam satırı verilenle dolu gelir.",
    "Eksik gelen çiftler için Sağlam'ı azaltın: kalan kişinin üzerinde açık iş olarak durur, sonra teslim alınır (form \"X çift ustada kalıyor\" der).",
    "Tamir: çifti hangi prosese geri gönderileceğini ve sebebini seçin; tamir işi ilgili prosese yeniden düşer. Hurda: sebebiyle yazılır, ücret ödenmez, Fire Raporu'na gider.",
    "Verilen hammaddeden artan varsa tabloda düzeltin; fark stoğa iade olarak işlenir.",
    "\"Teslim Al\": fason personelin carisine işçilik alacağı (ürünün proses ücreti × sağlam çift) fişli olarak yazılır. Atölye içi bölüme bağlı maaşlı personelde cariye yazılmaz, bölüm tahakkukuna gider.",
    "Son proses teslim alınınca üretim \"Tamamlandı\" olur ve mamul stoğa girer; siparişe bağlıysa siparişin karşılananı artar.",
    "Geri alma: tamamlanmış adımın \"detay / geri al\" satırından. Sonraki adımlar başlamışsa önce onlar geri alınır (sondan başa).",
  ] },

  { b: "calisan", baslik: "Barkodla atölye ekranı", resimler: [{ d: "atolye-ekrani", a: "Atölye ekranı: personel girişi, alabileceği ve elindeki işler" }], adimlar: [
    "Üretim › \"Atölye Ekranı\" (büyük yazılı, tablet için) ya da \"Barkod Okut\". Klavye gibi yazan okuyucu kullanılır; kod elle de yazılıp Enter'a basılabilir.",
    "Önce personel kendi barkodunu okutur (cari kartındaki barkod kodu). Ekranda adı ve iki liste görünür: \"Alabileceğim işler\" (bağlı olduğu proseslerde sırası gelmiş işler) ve \"Elimdeki işler\".",
    "\"Bana planlanan işler\" şeridi, Proses Planlama'da bu kişiye ayrılmış işleri gösterir; sırası gelmiş olanlar \"Size planlandı\" rozetiyle en üste çıkar.",
    "Üretim ya da parça barkodu okutulunca iş alınır. Miktar kutusu boşsa tamamı; bir sayı yazılırsa o kadarı (32 çift 12 + 20 diye bölünebilir).",
    "Aynı barkod ikinci kez okutulunca iş teslim edilir. Teslimde sağlam/tamir/hurda sorulmaz, tamamı sağlam sayılır; farklıysa üretim kartından teslim alın.",
    "Başkasının elindeki parça okutulursa ekran uyarır; işi devretmek için önce o kişi teslim etmelidir.",
  ], ipucu: "Cari kartı › Bilgiler'de \"Kod Ata\" prosesin bandından (Saya 2000-2999 gibi) kişiye barkod verir." },

  { b: "calisan", baslik: "Stok: hammadde ve ürün kartları", resimler: [{ d: "stok", a: "Stok Yönetimi: hammadde kartları, Liste / Katalog görünümü" }, { d: "urun-stok", a: "Ürün Stok: mamuller renk × beden matrisinde" }], adimlar: [
    "Depo › Stok: hammadde, yarı mamul ve hizmet kartları. Depo › Ürün Stok: mamuller (satılan ürünler). İkisinin araması ayrıdır; × ile temizlenir.",
    "Kart satırı toplam miktarı gösterir; dokununca kart açılır. Hammaddede renk ve beden/ölçü (boy, cm) varyantları, mamulde renk × beden matrisi.",
    "\"Ürün Ekle\": ad, kategori, birim, para birimi ve alış fiyatı; sonra renk ekleyin (Tanımlar'daki renklerden). Mamulde \"Ürün Stok\" işaretli renkler görünür.",
    "Stok kodu: ürün kartında değiştirilebilir kod (ör. 27080 D). Arama ve etiketler bu kodu kullanır.",
    "Miktar doğrudan değiştirilmez: her değişim bir fişle olur (alış, satış, üretim, Stok Girişi). Kart › Stok Hareketleri bütün geçmişi fiş numarasıyla listeler.",
    "Min. stok her renk/beden altında ayrı ayarlanır; altına düşen kalemler Anasayfa ve Hammadde İhtiyaç'ta uyarır.",
    "Katalog görünümü (Stok'ta sağ üst) ürünleri görselli kartlar hâlinde, fiyat listesindeki katalog fiyatıyla gösterir; PDF'e basılır.",
  ] },

  { b: "calisan", baslik: "Stok giriş / çıkış (sayım, fire, numune)", adimlar: [
    "Depo › Stok ya da Ürün Stok › \"Stok Girişi\". Ürünü ve rengi seçin, yönü (Giriş / Çıkış) seçip beden miktarlarını girin.",
    "Not alanına sebebini yazın (sayım farkı, fire, numune, hediye…). Kaydedilen fiş MNL- numarası alır ve Fişler'de görünür.",
    "Siparişe ya da cariye bağlı olmayan stok hareketi yalnız bu yolla girilir. Alış için Alış / Satış ekranındaki alış fişini, üretim çıkışı için üretim kartını kullanın.",
    "Bu fişler Gelir / Gider'de \"stok giriş/çıkış\" kartına bağlanır (Tanımlar › Üretim'de kart seçilir); böylece hiçbir hareket karşılıksız kalmaz.",
  ] },

  { b: "calisan", baslik: "Sevkiyat ve koli", resimler: [{ d: "sevkiyat", a: "Sevkiyat: siparişin kalan ve stok durumu, Sevk et paneli" }], adimlar: [
    "Depo › Sevkiyat: açık siparişler kalan miktarıyla listelenir. \"Sevk et\" düğmesi kalanı renk × beden tablosunda, stoktaki miktarla yan yana gösterir.",
    "Sevk fişinde \"Siparişten seç\" açık gelir; satırdaki Ekle ile koli, asorti ya da beden olarak ekleyin. \"Stoktakilerle doldur\" stokta olan kadarını tek dokunuşta ekler.",
    "Kaydedilen sevk fişi satış fişidir: cariye borç, stoğa çıkış yazar, siparişin karşılananını artırır. KDV açıksa siparişteki oranla hesaplanır.",
    "Paketleme (Depo › Paketleme): üretimden çıkan çiftleri kolilere ayırır, koli barkodu basar. Sevkiyatta koli okutulunca sipariş kendiliğinden bulunur.",
    "Depo › Depo › Okut: telefon kamerasıyla ürün ya da koli barkodu okutup depodaki durumuna bakarsınız (salt okuma).",
  ] },

  { b: "calisan", baslik: "Alış / Satış fişi", resimler: [{ d: "alis-satis", a: "Alış / Satış: cari seçimi, fiş paneli ve son fişler" }], adimlar: [
    "Depo › Alış / Satış: cariyi seçip \"Alış fişi aç\" ya da \"Satış fişi aç\". Fiş aynı ekranda panelde açılır; carinin açık siparişleri \"Siparişten seç\"te hazırdır.",
    "Siparişsiz alışta ürünü arayıp seçin, renk ve bedenlere miktar ve birim fiyat girin. Dövizli alışta kur fişe yazılır; stok maliyeti bu fiyattan hesaplanır (son alış ortalaması).",
    "Peşin alış/satışta \"Peşin\" kutusunu işaretleyip kasayı seçin: cari hareketi ve kasa hareketi tek fişle, birbirine bağlı yazılır.",
    "Kaydedilen fiş cariye borç/alacak, stoğa giriş/çıkış olarak işlenir; fiş numarası (ALS-/SAT-) kendiliğinden verilir. Liste \"Son fişler\"de görünür, cari süzgeciyle daraltılır.",
    "Hizmet bedeli, navlun gibi mal hareketi olmayan tutarlar cari kartındaki \"Ürünsüz kayıt\" ile girilir.",
    "Fiş geri alma: Fişler ekranından ya da cari karttan. Faturası kesilmiş fiş geri alınmaz; sonraki adımları (sevk, üretim) başlamış fişler de önce onlar geri alınmadan silinmez.",
  ] },

  { b: "calisan", baslik: "Cari listesi ve cari kartı", resimler: [{ d: "cari-liste", a: "Cari Hesaplar: tip çipleri, alacak/borç ve defter süzgeci" }, { d: "cari-kart", a: "Cari kartı: Hareketler sekmesi, fiş düğmeleri ve ekstre" }], adimlar: [
    "Finans › Cari. Üstte tip çipleri (Müşteri, Tedarikçi, Personel, Fasoncu…); arama ünvan, telefon ve vergi no arar. Sağda toplam alacak, borç ve net.",
    "Satıra dokununca kart açılır. Başlıkta bakiye (Genel / Resmi ayrı), telefon, WhatsApp ve e-posta. Kalem simgesi ünvanı, tipi ve para birimini düzenler.",
    "Hareketler: Alış Fişi, Satış Fişi, Ödeme, Tahsilat düğmeleri ilgili formu açar. Liste defter (Tümü / Genel / Resmi) ve para birimine göre süzülür; \"Sade görünüm\" her hareketi tek satırda gösterir.",
    "Fiş numarasına dokununca fiş açılır. Ekstre yazdır (sağ tık › Ekstre) PDF üretir; WhatsApp ve e-posta ile gönderilebilir.",
    "Açık Siparişler & Bakiye: carinin bekleyen siparişleri ve sipariş bazında ödenen/kalan. Siparişler: tüm sipariş geçmişi.",
    "Bilgiler: vergi no, vergi dairesi, adres, il/ilçe, e-fatura mükellefiyeti, logo ve renk. Personelde barkod kodu, bağlı prosesler, bölüm ve maaş bilgileri burada.",
    "Pasife alınan cari listeden kalkar ama geçmişi durur; Pasifler sekmesinden geri alınır.",
  ] },

  { b: "calisan", baslik: "Tahsilat ve ödeme", resimler: [{ d: "odeme-tahsilat", a: "Ödeme & Tahsilat: tip, ödeme şekli, cari ve kasa seçimi" }], adimlar: [
    "Finans › Ödeme & Tahsilat. Üstte Tahsilat / Ödeme seçin; ödeme şeklini (Nakit, Kart, Havale, Çek, Senet) seçin.",
    "Cariyi yazıp seçin, tutarı ve para birimini girin. Kasa ya da banka hesabı zorunludur: para nereye girdi / nereden çıktı burada belli olur.",
    "Dövizli tutar TL kasaya giriyorsa kur ve TL karşılığı sorulur; cari dövizle, kasa TL ile hareket görür.",
    "Çekle tahsilatta çek bilgileri (banka, çek no, vade) doldurulur; çek, Çek & Senet ekranında portföye girer. Ciro, tahsile verme ve iade oradan yapılır.",
    "Kaydedince fiş numarası (THS-/ODM-) verilir; cari ekstresinde ve kasa defterinde aynı numarayla birbirine bağlı görünür.",
    "Siparişe bağlı tahsilat sipariş kartındaki \"Tahsilat Gir\" ile girilir; sipariş kartı ödenen/kalanı gösterir.",
  ] },

  { b: "calisan", baslik: "Kasa & Banka, Çek & Senet", resimler: [{ d: "kasa-banka", a: "Kasa & Banka: hesaplar, bakiye ve hareket defteri" }, { d: "cek-senet", a: "Çek & Senet: portföy, durum ve vade" }], adimlar: [
    "Finans › Ödeme & Tahsilat ekranının şeridinden Kasa & Banka ve Çek & Senet açılır.",
    "Kasa & Banka: her hesap (TL Kasa, USD Kasa, banka hesapları) ayrı kart; dokununca hareket defteri açılır. Hesap açma, virman (hesaplar arası aktarım) ve gider/gelir kaydı buradan.",
    "Gider ya da gelir kaydında Gelir / Gider kartı seçilir (kira, elektrik, maaş…); kartsız kayıt raporlara girmez.",
    "Banka Excel'i: bankadan indirilen hesap hareketlerini yükleyip defterle eşleştirir (mutabakat).",
    "Çek & Senet: alınan ve verilen çekler durumlarıyla (Portföyde, Ciro Edildi, Tahsilde, Tahsil Edildi, Karşılıksız). Vade yaklaşanlar Anasayfa'da uyarır.",
    "Çek üzerinde: Ciro et (tedarikçiye verince onun carisine ödeme yazılır), Bankaya tahsile ver, Tahsil edildi, İade. Her işlem geri alınabilir ve geçmişte görünür.",
  ] },

  { b: "calisan", baslik: "Fişler ekranı", resimler: [{ d: "fisler", a: "Fişler: tür çipleri, tarih/cari süzgeci ve fiş listesi" }], adimlar: [
    "Finans › Fişler: bütün fişler tek listede (Alış, Satış, Üretim işçiliği, Tahsilat, Ödeme, Stok giriş/çıkış, Maaş…). Tür çipleriyle süzülür.",
    "Satıra dokununca fişin içeriği açılır; \"İşlemler\" menüsünden yazdırma, e-fatura taslağı (KDV'li satış fişinde) ve geri alma.",
    "Fişsiz hareket yoktur: her stok ve cari hareketi bir fişe bağlıdır. Fiş silinince bağlı hareketler birlikte geri alınır.",
    "Dönem kapanışı yapılmış tarihlere fiş girilmez ve o tarihteki fişler silinmez (Tanımlar › Firma › Dönem kapanışı).",
  ] },

  // ---------------- YÖNETİCİ ----------------
  { b: "yonetici", baslik: "Tanımlar — nerede ne var", resimler: [{ d: "tanimlar-urun", a: "Tanımlar › Ürün: renkler, bedenler, birimler, asortiler" }], adimlar: [
    "Tanımlar (sağ üstteki dişli). Sekmeler üç öbekte: TANIMLAR (Firma, Ürün, Üretim, Kapasite, E-Fatura & KDV, Web Sitesi), SİSTEM (Kullanıcılar, Görünüm, Sürüm geçmişi), VERİ (Yedek & Bulut, Bakım, Çöp Kutusu).",
    "Başlıklar kapalı gelir; dokununca açılır ve cihaz bunu hatırlar (Ürün sekmesinde alt sekmeler var, orada başlıklar hep açık). Üstteki arama kutusu renk, beden, birim, proses adlarında arar; arama yazılıyken Ürün'ün bütün alt sekmeleri birlikte görünür.",
    "Firma: ünvan, vergi bilgileri, logo, dönem kapanışı, e-posta gönderim ayarları, cari tipleri (Fasoncu gibi özel tipler).",
    "Ürün (alt sekmeler): Renkler (renk kodu, malzeme tipi, \"Ürün Stok\" işareti, açıklama; Model Rengi), Beden & Boyut (beden grupları), Asortiler, Birimler, Ürün Tipleri (mamul ve hammadde), Fire Sebepleri, Atölye Bölümleri, Fiyat Grupları, Özel Kodlar.",
    "Üretim: Prosesler (sıra, barkod bandı, gider kartı), Ara Prosesler (sabit cari, ücret), Reçete şablonları, Stok giriş/çıkış gider kartları.",
    "E-Fatura & KDV: KDV açma anahtarı ve varsayılan oranlar; e-fatura serisi, senaryo ve gönderici etiketi.",
    "Görünüm: yazı/kutu boyutu, mobil düzen, kart düzenleri (sekme sırası ve gizleme). Sürüm geçmişi: her sürümde ne değişti.",
  ] },

  { b: "yonetici", baslik: "Üretim tanımları: prosesler ve ara prosesler", resimler: [{ d: "tanimlar-uretim", a: "Tanımlar › Üretim: prosesler ve ara prosesler" }], adimlar: [
    "Prosesler üretim sırasını belirler (Kesim 1, Saya 2…). Her prosesin barkod bandı personel kodlarını (1000-1999 gibi) ve gider kartı işçilik giderinin Gelir / Gider'de düşeceği kartı belirler.",
    "\"Gider kartlarını otomatik oluştur\" her proses için \"<Proses> işçiliği\" kartını Üretim grubunda açar; sonradan kartı değiştirebilirsiniz.",
    "Ara proses (Kampre, Zigzag…) bir asıl prosese bağlanır, sabit bir fasoncuya yapılır ve sonraki asıl proses verilince kendiliğinden tamamlanır; ücreti ürün kartında özelleştirilebilir.",
    "Ürün kartı › Reçete'de hammaddeler prosese bağlanır; ara proses eklentileri de orada seçilir. Hammaddesi olmayan proses (Saya) \"ek proses\" olarak eklenir.",
    "Proses silinmez, yalnız pasife alınır; geçmiş üretimler eski adıyla kalır.",
  ] },

  { b: "yonetici", baslik: "Kapasite: makine, kalıp/bıçak, eleman", resimler: [{ d: "tanimlar-kapasite", a: "Tanımlar › Kapasite: proses sekmeleri, makine ve kalıp kartları" }], adimlar: [
    "Tanımlar › Kapasite. Üstte \"Tümü\" ve her proses için sekme; proses sekmesinde yalnız o prosesin makineleri, kalıpları ve elemanları görünür.",
    "Makine / Teçhizat: ad, adet, günlük çalışma saati, kalıpsız işlerde saatlik adet, bağlı prosesler. Aynı tip makineleri (3 pres) tek kayıt yapıp Adet'i artırın.",
    "Kalıp / Bıçak: hangi makinede kullanıldığı, beden beden saatlik adet (boş beden kesilmez), Adet (boşsa makinenin tüm adetlerinde ortak; 1 ise aynı anda tek makinede), ömür (çift) ve bağlı ürünler.",
    "Eleman çalışma saatleri: personelin başlangıç/bitiş, mola, saatlik adet ve prosesleri. Günlük saat kendiliğinden hesaplanır; planlama süreleri buradan okur.",
    "Ürün kartı › Kapasite sekmesinde her proses için makine, kalıp/bıçak ve personel seçilir; bedene göre günlük adet orada görünür. Proses planlama ve üretim raporu hedefleri bu bağdan hesaplanır.",
    "Günlük kapasite = en yavaş kalıbın o bedendeki saatlik adedi × çalışan makine adedi × günlük saat. Kalıp yoksa makinenin kendi saatlik adedi.",
  ] },

  { b: "yonetici", baslik: "Demirbaş alımı ve amortisman", adimlar: [
    "Makine, kalıp ve bıçak alımı iki yoldan girilir: Tanımlar › Kapasite'de kartın altındaki \"Satın alındı…\" ya da tedarikçinin cari kartında Alış fişindeki \"Demirbaş\" seçimi.",
    "Tedarikçi, tutar, para birimi, tarih, amortisman süresi (ay) ve defter girilir. Kayıt tedarikçiye fişli bir Alış hareketi olarak yazılır.",
    "Amortisman: tutar ay sayısına bölünür; alım ayından itibaren her ay Gelir / Gider'de \"Makine / Kalıp / Bıçak Amortismanı\" kartında görünür. Alışın tamamı ayrıca gidere yazılmaz.",
    "Ürün maliyetine pay: kalıp/makine kartına \"Ömür (çift)\" girilirse pay = alım ÷ ömür. O kalıbı kullanan ürünlerin maliyet ekranında ayrı satır olarak eklenir.",
  ], ipucu: "Pay eklenen ürünlerde önceki \"Maliyet OK\" onayı \"maliyet değişti\" uyarısına döner; yeni maliyeti kontrol edip yeniden onaylayın." },

  { b: "yonetici", baslik: "Kullanıcılar, yetkiler ve görünürlük", resimler: [{ d: "tanimlar-kullanicilar", a: "Tanımlar › Kullanıcılar: roller, modül yetkileri ve görebileceği bilgiler" }], adimlar: [
    "Tanımlar › Kullanıcılar ve Yetkiler: kullanıcı ekleyin, rol şablonu seçin (Yönetici, Üretim, Muhasebe, Panel…) ya da modül yetkilerini tek tek işaretleyin. Yetkisi olmayan modül menüde görünmez.",
    "\"Görebileceği bilgiler\" kutuları: işaretlenmezse kullanıcı Finans raporlarını, Gelir / Gider'i ve anasayfadaki alacak/kasa özetlerini görmez. Silme düğmeleri yalnız yetkili kullanıcıda çıkar.",
    "Onay sistemi: açıksa yetkisiz kullanıcının yaptığı silme/düzenleme yöneticinin onayına düşer (Uyarılar ikonu). Kapalıysa yetkisi olmayan işlem doğrudan engellenir.",
    "Girişi açmak (Firma › \"Giriş gerekli\") her kullanıcıya şifre ister; Günlük (sağ üst) kim ne yaptı kaydını tutar.",
    "Kullanıcı silinmez, pasife alınır; günlükteki kayıtları adıyla kalır.",
  ] },

  { b: "yonetici", baslik: "Fason üretim, atölye içi bölüm ve maaşlı personel", adimlar: [
    "Fason çalışan (dışarıdaki saya, kalfa ustası) Personel tipinde ya da Fasoncu tipinde caridir. Teslimde işçiliği carisine alacak olarak yazılır; ödeme Ödeme & Tahsilat'tan yapılır.",
    "Atölye içi bölüm (Tanımlar › Ürün › Atölye Bölümleri): bölüm adı, bölümün yaptığı prosesler ve maaşlı personeli. Bu proseslerde teslimde cariye işçilik yazılmaz; bölümün tahakkukuna gider.",
    "Maaş: ay başında bölüm personeline \"Maaş\" fişi tahakkuk eder ve bölümün gider kartına (\"<Bölüm> maaşı\") düşer. Gelir / Gider ve Kâr / Zarar'da bölüm bazında görünür.",
    "Cari kartı › Bilgiler › Personel bilgileri: bölüm, aylık maaş, işe başlangıç, aylık çalışma saati. Mesai: ay, hafta içi / cumartesi / pazar saatleri; tutar saat ücreti × katsayıyla hesaplanır ve ayrı Mesai fişi yazılır.",
    "Mesai katsayıları Tanımlar › Ürün › Atölye Bölümleri'nde (varsayılan hafta içi ×1,5, cumartesi ×1,5, pazar ×2; aylık 225 saat).",
  ] },

  { b: "yonetici", baslik: "Cari tipleri", adimlar: [
    "Müşteri, Tedarikçi, Personel ve Her İkisi sabittir. Tanımlar › Firma › Cari Tipleri'nde kendi tiplerinizi (Fasoncu, Kargo…) ekleyin; her tip bir ana tip gibi davranır.",
    "Fasoncu \"Personel gibi\" olmalı: prosese bağlanır, barkod alır, üretimde iş verilir; maaş paneli görmez. \"Tedarikçi gibi\" seçilirse bu alanlar görünmez.",
    "Tipin adı ya da ana tipi değiştirilince o tipteki cariler kendiliğinden güncellenir. Kullanılan tip silinmez.",
    "Cari listesinde özel tip sekmesi yalnız o tipte cari varsa görünür.",
  ] },

  { b: "yonetici", baslik: "Ürün kartı, reçete ve maliyet", resimler: [{ d: "recete", a: "Ürün kartı › Reçete: proses bazlı hammadde satırları ve onay" }, { d: "maliyet", a: "Ürün kartı › Maliyet: hammadde, işçilik, genel gider, demirbaş payı, kâr" }], adimlar: [
    "Ürün kartı sekmeleri: Stok Bilgileri, Reçete, Maliyet, Kapasite, Fiyatlandırma, Siparişler, Stok Hareketleri, Barkodlar, Teknik Çizim, Özel Kodlar. Sıra Tanımlar › Görünüm'den değiştirilir.",
    "Reçete: her hammadde bir prosese bağlanır; mamul rengi × beden için hammadde rengi ve ölçüsü eşlenir. \"Otomatik eşleştir\" aynı adlı renkleri doldurur; eşleşmeyen renk kırmızı \"eksik\" etiketiyle görünür.",
    "Hammaddeye sonradan renk eklendiyse reçete uyarır (\"renk eklendi\"); bedeni kapsamayan satırlar için turuncu \"eşleştir…\" kutusu çıkar.",
    "Pozisyon (1. Renk, 2. Renk) çok renkli modelde hangi hammadde rengi hangi parçaya gider onu söyler; sipariş girişinde renk seçimi buna göre açılır.",
    "\"Reçeteyi onayla\": eksiksiz reçete onaylanmadan üretim açılmaz. Reçete değişince onay düşer ve yeniden onay ister.",
    "Maliyet: hammadde (son alış ortalaması, renk bazlı), işçilik (proses ücretleri satır satır, ara prosesler dahil), genel gider (çift başı: defter ÷ aylık hedef ya da ürüne özel), demirbaş payı, kâr marjı ve satış fiyatı. TL / USD / EUR'ya çevrilir.",
    "\"Maliyet OK\": eksikleri (fiyatsız hammadde, girilmemiş kur, işçiliksiz proses) görüp onaylarsınız; sonradan maliyet değişirse onay \"eskidi\" uyarısı verir. Fiyat Listesi bu onayı okur.",
    "Fiyatlandırma: fiyat gruplarına (Toptan, Perakende…) satış fiyatı ve kâr marjı; katalog fiyatı buradan seçilir.",
  ] },

  { b: "yonetici", baslik: "Gelir / Gider kartları ve fişlerin karşılığı", resimler: [{ d: "gelir-gider", a: "Gelir / Gider: gruplar, kartlar ve dönem toplamları" }], adimlar: [
    "Finans › Gelir / Gider: kartlar gruplar altında (Üretim, Satışlar, Genel…). \"Hazır kartlar\" sık kullanılan giderleri açar; her kart tür (gelir / gider) ve grup taşır.",
    "Kural: her hareketin bir cari, tutar ya da fiş karşılığı vardır. Üretim işçiliği prosesin kartına, stok giriş/çıkış kendi kartına, satış ve alış fişleri Satışlar grubuna, bölüm maaşları bölüm kartına otomatik bağlanır.",
    "Kasa/bankadan girilen gider ve gelirler kart seçilerek yazılır; kartsız kayıt raporlara girmez.",
    "\"Üretim gider bağları\" paneli (Gelir / Gider'in altında, açılır) hangi fişin hangi karta gittiğini listeler; karşılıksız kalan fiş varsa orada görünür.",
    "Kâr / Zarar: satış geliri, satılan malın maliyeti, işçilik, giderler, amortisman ve bölüm kâr/zararı dönem dönem (bu ay, geçen ay, bu yıl).",
  ] },

  { b: "yonetici", baslik: "Üretim raporu", resimler: [{ d: "uretim-raporu", a: "Üretim Raporu: özet kartları, proses hedef/gerçekleşen ve personel üretimi" }], adimlar: [
    "Üretim › Üretim Raporu. Günlük / Haftalık (pazartesi–pazar) / Aylık seçimi; oklarla önceki ve sonraki döneme geçilir.",
    "Özet kartları: açık üretim sayısı, açık üretimdeki çift, biten üretim (dönemde stoğa giren), şu an personelde olan çift. Altında proses proses biten çift.",
    "Proses tablosu: günlük hedef (bu tablodan girilir; boşsa makine kapasitesinden hesaplanır), dönem hedefi (günlük × iş günü), gerçekleşen, oran çubuğu, hurda, personelde ve bekleyen.",
    "Personel üretimi: kişinin teslim ettiği sağlam çift, proses dağılımıyla; haftalık ve aylıkta gün gün sütunlar ve günlük ortalama.",
    "Açık üretimler tablosu her üretimin proses proses ilerlemesini (ör. 60/100, biten proseste ✓) gösterir; numaraya dokununca üretim kartı açılır.",
  ] },

  { b: "yonetici", baslik: "Finans raporu ve gün sonu", resimler: [{ d: "finans-raporu", a: "Finans Raporu: kayıtlı raporlar ve dönem karşılaştırması" }], adimlar: [
    "Finans › Finans Raporu: Varlık raporu, Alacaklar ve Borçlar, yaşlandırma (vadesi geçen alacaklar), nakit akış projeksiyonu, dönem karşılaştırması ve kart maliyeti ile gerçekleşen maliyet farkı.",
    "\"Yan yana\" görünümü iki dönemi karşılaştırır. Raporlar PDF ve Excel'e aktarılır.",
    "Cari Mutabakat: seçilen cari için dönem ekstresi ve mutabakat mektubu; WhatsApp ve e-posta ile gönderilir.",
    "Gün sonu: her akşam özet (satış, tahsilat, üretim, kasa) e-posta ile gönderilir; Tanımlar › Firma'da alıcı ve saat ayarlanır. Rapor Supabase'de çalışır, uygulama kapalıyken de gider.",
    "Termin takibi: teslim tarihi yaklaşan ve geçen siparişler Anasayfa'da ve Finans Raporu'nda uyarır.",
  ] },

  { b: "yonetici", baslik: "Güvenlik: günlük, çöp, yedek ve bakım", resimler: [{ d: "tanimlar-yedek", a: "Tanımlar › Yedek & Bulut: bulut durumu, yedek alma ve geri yükleme" }], adimlar: [
    "Günlük (sağ üst): kim, ne zaman, neyi değiştirdi. Toplu silme ve büyük tutar değişiklikleri ayrıca uyarı üretir.",
    "Çöp Kutusu (Tanımlar › Çöp): silinen kayıtlar 30 gün geri alınabilir, 90 gün saklanır. Sayı sekmenin adında görünür.",
    "Yedek & Bulut: veri Supabase'de; bu cihazdaki kopya yalnız yedek ve bekleyen yazmalar içindir. \"Şimdi yedekle\" JSON indirir; \"Yedekten geri yükle\" seçilen yedeği yükler (onay ister).",
    "Bakım: veri denetimi (yetim sipariş bağı, fişsiz hareket, kaynaksız hareket), defter onarımı, üretim adım sırası denetimi (önceki adım bitmeden sonraki adıma iş verilmiş üretimleri listeler) ve veritabanı sıfırlama (yalnız boş kurulum için).",
    "Yeni sürüm çıkınca uygulama kendiliğinden geçer; çalışırken üstte şerit görünür, Sürüm geçmişi sekmesi değişiklikleri listeler.",
  ] },

  { b: "yonetici", baslik: "Bu kılavuz ve PDF", resimler: [{ d: "kilavuz", a: "Kılavuz ekranı: bölüm seçimi, arama ve PDF düğmeleri" }], adimlar: [
    "Sağ üstteki kitap simgesi kılavuzu açar; rolünüze göre Çalışan ya da Yönetici bölümü önde gelir. Her konu başlığına dokununca adımlar ve ekran görüntüsü açılır.",
    "Arama kutusu başlık, adım ve ipucu metinlerinde arar; eşleşen konular her iki bölümden gelir.",
    "\"PDF (bu bölüm)\" görünen bölümü, \"PDF (tümü)\" iki bölümü ayrı kapaklarla, resimleriyle birlikte indirir. Konular sayfa ortasından bölünmez.",
    "Ekran görüntüleri örnek firmayla üretilmiştir (Örnek Ayakkabı); sizin verinizle aynı yerleşim, farklı içerik görürsünüz.",
  ] },
];

function kilavuzResimAdresi(dosya) {
  // Göreli: uygulama ve `kilavuz/` aynı klasörde. PDF iframe'i için mutlak adres (about:blank belgede göreli çözülmez).
  try { return new URL(`kilavuz/${dosya}.jpg`, window.location.href).href; } catch (e) { return `kilavuz/${dosya}.jpg`; }
}

// PDF (v1.699, kullanıcı: "kılavuzu PDF olarak da indirilebilir yapalım"). Ortak `htmldenPdfBlob` (075) uzun çıktıyı tek
// resim olarak çizip sayfa boyunda DİLİMLİYOR — bir satır iki sayfanın arasında ikiye bölünebiliyordu. Kılavuzda her konu
// AYRI çizilir ve sayfaya sığmıyorsa yeni sayfaya geçer; konu ortasından kesilmez. Kapak: firma adı, bölüm, sürüm, tarih.
// RESİMLER (v1.711): konu HTML'ine girer; çizimden önce yüklenmeleri beklenir, yüklenemeyen gizlenir.
function kilavuzKonuHTML(m, sira) {
  const kac = (x) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const resimler = (m.resimler || []).map((r) =>
    `<figure style="margin:8px 0 4px"><img src="${kilavuzResimAdresi(r.d)}" style="width:100%;border:1px solid #D9CFC3;border-radius:6px" onerror="this.parentNode.style.display='none'">` +
    `<figcaption style="font-size:11px;color:#7A6A58;margin-top:3px">${kac(r.a)}</figcaption></figure>`).join("");
  return `<div style="padding:4px 2px 10px"><div style="font-size:17px;font-weight:700;margin:0 0 6px;color:#5B3F25">${sira}. ${kac(m.baslik)}</div>` +
    resimler +
    `<ol style="margin:0;padding-left:20px;font-size:13px;line-height:1.55">${m.adimlar.map((a) => `<li style="margin:0 0 4px">${kac(a)}</li>`).join("")}</ol>` +
    (m.ipucu ? `<div style="margin-top:6px;font-size:12px;background:#F4EFE8;border-radius:6px;padding:6px 10px">İpucu: ${kac(m.ipucu)}</div>` : "") + "</div>";
}
async function kilavuzPdfBlob(bolumler, firmaAdi) {
  const kut = await pdfKutuphaneleriniYukle();
  if (!kut) return null;
  const cerceve = document.createElement("iframe");
  cerceve.setAttribute("aria-hidden", "true");
  cerceve.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;";
  document.body.appendChild(cerceve);
  const ciz = async (html) => {
    // Çerçeve önce KÜÇÜLTÜLÜR: yükseklik bir önceki çizimden kalırsa gövde o kadar uzun ölçülür ve her konu tam sayfa
    // yer kaplar (ilk denemede 15 konu 17 sayfa çıktı). Sonra içeriğin kendi yüksekliğine açılır.
    cerceve.style.height = "10px";
    const belge = cerceve.contentDocument;
    belge.open(); belge.write(pdfCiktiBelgesi(html)); belge.close();
    if (belge.fonts && belge.fonts.ready) { try { await belge.fonts.ready; } catch (e) { /* devam */ } }
    // Resimler yüklenmeden ölçülürse yükseklik eksik çıkar ve resim kırpılır; yüklenemeyen figür onerror ile gizlenir.
    await Promise.all([...belge.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = () => { if (img.parentNode) img.parentNode.style.display = "none"; r(); }; }))));
    belge.body.style.minHeight = "0";
    const yuk = Math.ceil(belge.body.getBoundingClientRect().height);
    cerceve.style.height = `${yuk}px`;
    return kut.html2canvas(belge.body, { scale: 2, backgroundColor: "#ffffff", windowWidth: 794, height: yuk, windowHeight: yuk, useCORS: true });
  };
  try {
    const pdf = new kut.jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const G = pdf.internal.pageSize.getWidth(), Y = pdf.internal.pageSize.getHeight();
    let y = 0, ilk = true;
    const yerlestir = (tuval, yeniSayfa) => {
      const h = (tuval.height * G) / tuval.width;
      if (!ilk && (yeniSayfa || y + h > Y)) { pdf.addPage(); y = 0; }
      ilk = false;
      pdf.addImage(tuval.toDataURL("image/jpeg", 0.9), "JPEG", 0, y, G, h);
      y += h;
    };
    for (const b of bolumler) {
      const kapak = `<div style="font-size:24px;font-weight:700">${firmaAdi ? firmaAdi + " — " : ""}Kullanım Kılavuzu</div>` +
        `<div style="font-size:15px;margin-top:4px">${b.ad}</div><div style="font-size:11px;color:#7A6A58;margin-top:2px">Sürüm ${SURUM} · ${new Date().toLocaleDateString("tr-TR")}</div><hr style="border:0;border-top:1px solid #D9CFC3;margin:10px 0 4px">` +
        `<ol style="font-size:12px;line-height:1.5;padding-left:20px;margin:6px 0 0">${b.konular.map((m) => `<li>${m.baslik.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</li>`).join("")}</ol>`;
      yerlestir(await ciz(kapak), true);
      let i = 0;
      for (const m of b.konular) yerlestir(await ciz(kilavuzKonuHTML(m, ++i)), false);
    }
    return pdf.output("blob");
  } finally {
    document.body.removeChild(cerceve);
  }
}

// Ekran görüntüsü: yüklenemezse (dosya yok, çevrimdışı) figür tamamen gizlenir — kırık resim simgesi gösterilmez.
function KilavuzResim({ r }) {
  const [yok, setYok] = useState(false);
  if (yok) return null;
  return (
    <figure data-kilavuz-resim={r.d} style={{ margin: "6px 0 10px" }}>
      <img src={kilavuzResimAdresi(r.d)} alt={r.a} loading="lazy" onError={() => setYok(true)}
        style={{ width: "100%", maxWidth: 820, display: "block", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }} />
      <figcaption style={{ fontSize: 11, color: "var(--erp-text-3)", marginTop: 4 }}>{r.a}</figcaption>
    </figure>
  );
}

function KilavuzEkrani({ aktifKullanici, tanimlar, showToast }) {
  const yonetici = !tanimlar || !tanimlar.girisAktifMi || (aktifKullanici && aktifKullanici.rol === "Yönetici");
  const [bolum, setBolum] = useState(yonetici ? "yonetici" : "calisan");
  const [ara, setAra] = useState("");
  const [acik, setAcik] = useState({});
  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false);
  const nrm = (x) => String(x || "").toLocaleLowerCase("tr-TR");
  const q = nrm(ara.trim());
  const liste = KILAVUZ.filter((m) => (q ? true : m.b === bolum))
    .filter((m) => !q || nrm([m.baslik, ...(m.adimlar || []), m.ipucu].join(" ")).includes(q));
  const hepsiAcik = liste.length > 0 && liste.every((m) => acik[m.baslik]);
  return (
    <div data-kilavuz style={{ maxWidth: 900 }}>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 4px" }}>Kullanım Kılavuzu</h2>
      <p style={{ fontSize: 13, color: "var(--erp-text-2)", margin: "0 0 12px" }}>Adım adım nasıl yapılır, ekran görüntüleriyle. Aradığınız işi yazın ya da bölüm seçin.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {[{ k: "calisan", ad: "Çalışan" }, { k: "yonetici", ad: "Yönetici" }].map((x) => (
          <button key={x.k} type="button" data-kilavuz-bolum={x.k} onClick={() => { setBolum(x.k); setAra(""); }}
            style={{ padding: "7px 16px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${bolum === x.k && !q ? "var(--erp-primary)" : "var(--erp-border)"}`,
              background: bolum === x.k && !q ? "var(--erp-primary)" : "#fff", color: bolum === x.k && !q ? "#fff" : "var(--erp-text-2)" }}>
            {x.ad}
          </button>
        ))}
        {/* PDF İNDİR: görünen bölüm (aramada eşleşenler); "Tümü" iki bölümü ayrı kapaklarla. */}
        {["bolum", "tumu"].map((kapsam) => (
          <button key={kapsam} type="button" className="btn-ghost" data-kilavuz-pdf={kapsam} disabled={pdfHazirlaniyor}
            style={{ fontSize: 12, padding: "6px 10px" }}
            onClick={async () => {
              const anBolum = bolum, anAra = ara.trim(), anListe = liste;   // await öncesi fotoğraf
              setPdfHazirlaniyor(true);
              try {
                const ad = (x) => (x === "yonetici" ? "Yönetici bölümü" : "Çalışan bölümü");
                const bolumler = kapsam === "tumu"
                  ? ["calisan", "yonetici"].map((k) => ({ ad: ad(k), konular: KILAVUZ.filter((m) => m.b === k) }))
                  : [{ ad: anAra ? `Arama: ${anAra}` : ad(anBolum), konular: anListe }];
                const blob = await kilavuzPdfBlob(bolumler, ((tanimlar && tanimlar.firmaBilgileri) || {}).unvan || "");
                if (!blob) { if (showToast) showToast("PDF hazırlanamadı (bağlantı?)"); return; }
                blobIndir(blob, `Kullanim kilavuzu - ${kapsam === "tumu" ? "tum" : (anAra ? "arama" : anBolum)}.pdf`);
              } finally { setPdfHazirlaniyor(false); }
            }}>
            {pdfHazirlaniyor ? "Hazırlanıyor…" : kapsam === "tumu" ? "PDF (tümü)" : "PDF (bu bölüm)"}
          </button>
        ))}
        <button type="button" className="btn-ghost" data-kilavuz-hepsi style={{ fontSize: 12, padding: "6px 10px" }}
          onClick={() => { const n = {}; liste.forEach((m) => { n[m.baslik] = !hepsiAcik; }); setAcik({ ...acik, ...n }); }}>
          {hepsiAcik ? "Hepsini kapat" : "Hepsini aç"}
        </button>
        <input data-kilavuz-ara value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ara: sipariş, maaş, sevkiyat…"
          style={{ ...inputStyle, flex: "1 1 220px", maxWidth: 360, fontSize: 13 }} />
      </div>
      {liste.length === 0 && <EmptyState text="Bu aramayla eşleşen konu yok." />}
      <div style={{ display: "grid", gap: 8 }}>
        {liste.map((m, sira) => {
          const ac = q ? true : !!acik[m.baslik];
          return (
            <div key={m.baslik} data-kilavuz-konu={m.baslik} style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", background: "#fff" }}>
              <button type="button" onClick={() => setAcik({ ...acik, [m.baslik]: !acik[m.baslik] })}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
                {ac ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span style={{ fontSize: 12, color: "var(--erp-text-3)", minWidth: 22 }} className="mono">{sira + 1}.</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--erp-text)" }}>{m.baslik}</span>
                {(m.resimler || []).length > 0 && <span title="Ekran görüntülü" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>🖼</span>}
                {q && <span style={{ fontSize: 11, color: "var(--erp-text-3)", marginLeft: "auto" }}>{m.b === "yonetici" ? "Yönetici" : "Çalışan"}</span>}
              </button>
              {ac && (
                <div style={{ padding: "0 14px 12px 36px" }}>
                  {(m.resimler || []).map((r) => <KilavuzResim key={r.d} r={r} />)}
                  <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 13, lineHeight: 1.5, color: "var(--erp-text)" }}>
                    {m.adimlar.map((a, i) => <li key={i}>{a}</li>)}
                  </ol>
                  {m.ipucu && <div style={{ marginTop: 8, fontSize: 12, color: "var(--erp-text-2)", background: "var(--erp-panel)", borderRadius: "var(--erp-r-sm)", padding: "6px 10px" }}>💡 {m.ipucu}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
