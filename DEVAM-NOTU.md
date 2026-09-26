# Atölye ERP — Devam Notu

Yeni sohbete **`src/` klasörünü ve bu dosyayı** ekle. Denetleyicileri, `birlestir.js`,
`konum.js`, `paketle.js` ve `yap.sh`'ı da eklersen Claude yeniden yazmak zorunda kalmaz.
`atolye-erp.jsx` ÜRETİLEN dosya; göndermeye gerek yok.

Son sürüm: **v1.476.0** · 26 Eylül 2026

---

## YENİ OTURUM — BURADAN BAŞLA

**Barkod şeması (6a) TAMAMLANDI, v1.136.0.** Bölüm 6b'yi oku — ne yapıldığı, hangi üç hata çıktığı
ve neyin AÇIK kaldığı orada.

**`barkod-semasi.sql` ÇALIŞTIRILDI** (kullanıcı bildirdi, 6 Eylül). Stok noları artık buluta
gidiyor. **Bir daha sorma.**

**Son iş (26 Eylül, v1.476.0): sipariş notları prosese yazılıyor, üretimde o proseste görünüyor. Birleştirmeyi artık Claude yapıyor (kullanıcı onayı, 26 Eylül).** Bkz. "PROSES BAZLI SİPARİŞ NOTLARI".
Önceki (v1.453.0): hammadde formunda da renk tek arama kutusu.
Önceki (v1.452.0): mamul formunda renk yazarak ekleniyor (`AramaliSecici`).
Önceki (v1.451.0): dar ekranda üst menü tek "Menü" (☰) düğmesinde.
Önceki (v1.450.0): üst menü ölçerek sığıyor + stok kategori şeritleri açık.
Önceki (v1.449.0): YENİ TASARIM — yan kolon kalktı (üst menü), açık "A" paleti.
Önceki (v1.448.0): yenilemede ekran korunuyor.
Önceki (v1.447.0): yeni sürüme otomatik geçiş (surum.json).
Önceki (v1.446.0): SİPARİŞ DÜZENLEME SİPARİŞ FORMUNDA — form önde, kalemler altta düzenlenebilir (ürün/renk/miktar/fiyat), kilitliler salt okunur.** Bkz. "SİPARİŞ DÜZENLEME FORMDA".
Önceki (v1.445.0): yerel şifre yedeği kaldırıldı — giriş yalnız bulut hesabıyla.
**⚠ PAKET EKSİKLERİ (v1.444.0 zip'inde yoktu) — bkz. "PAKET EKSİKLERİ" bölümü. Asıl dosyalar bulunursa yerleştir.**
**PROJE ARTIK GIT DEPOSUNDA (24 Eylül, v1.445.0 üzerinde):** kaynak `mtalay61-coder/atolye` deposunda, Claude Code ile geliştiriliyor; zip taşımaya gerek yok. Bkz. "GIT DEPOSUNA TAŞINDI" bölümü ve `CLAUDE.md`.
Önceki (v1.444.0): yerel şifre yedeğini kaldırma denendi, geri alındı; giriş ekranına test işareti.
Önceki (v1.410.0): yerel yazma hatası artık sessiz değil (90 yer), 13. denetim borcu kapandı.
Önceki (v1.409.0): üretim işçiliği cari yönü (Borç → Alacak).
Önceki (v1.408.0): 24 efekt incelendi, iki veri kaybı hatası.
Önceki (v1.407.0): denetim 18'e C (eksik bağımlılık) + T (tanımdan önce); 11 useCallback.
Önceki (v1.406.0): FİŞ DEFTERİ BAYAT OKUMA düzeltildi + üretim sekme filtresi.
Önceki (22 Eylül, v1.405.0 üzerinde): DENETİM 18 — BAYAT OKUMA (`bayatdenetim.js`).
Önceki (21 Eylül, v1.405.0): REÇETE ŞABLONLARI + modelhane katalog ve resim büyütme.
Önceki: v1.404.0): maliyet — boy fiyatları, düzenlenebilir hücreler, üretim sapmaları; çift miktar kutusu kalktı.
Önceki: v1.403.0): OTURUM DÜŞÜNCE şerit + Yeniden giriş (v1.402 açıklamasının devamı).
Önceki: v1.402.0): bulut yazma hataları insan diliyle açıklanıyor.
Önceki: v1.401.0): MALİYET YAZDIR (seçili birimde); reçete yazdırmadan fiyatlar kalktı.
Önceki: v1.400.0): FİYAT GRUBU DÜZENLEME + birim uyuşmazlığı uyarısı.
Önceki: v1.399.0): maliyet özeti TEK SÜTUN sağa yaslı; fiyat grubu seç-gir.
Önceki: v1.399.0): maliyet özeti TEK SÜTUN sağda, işçilik proses proses.
Önceki: v1.398.0): MALİYET SEKMESİ + fiyat gruplarına maliyetten satış fiyatı (para birimli).
Önceki: v1.397.0): REÇETE MALİYET DÖKÜMÜ — kendi birimi, TL, seçilen birim, dağılım.
Önceki: v1.396.0): maliyette para birimi SİMGELERİ koda çevriliyor — kur otomatik.
Önceki: v1.395.0): kuru girilmemiş para biriminde maliyet UYARISI.
Önceki: v1.394.0): SİLME ONAYI PENCERELİ; sekiz ONAYSIZ satır içi silme korundu.
Önceki: v1.393.0): KASA/BANKA kartı aynı kalıba — dört kart senaryoda.
Önceki: v1.392.0): tema kararlarının hepsi — gölge yok, menü 176px, toast sol altta + GERİ AL.
Önceki: v1.391.0): TEMA KABUĞU — kapsayıcı ve yan menü standarda bağlandı; tema artık görünüyor.
Önceki: v1.390.0): köşe yuvarlatma KARARI — kalıyor; 695 değer tek sabite.
Önceki: v1.389.0): reçete/SMM maliyetinde PARA BİRİMİ — USD/EUR kurla TL'ye.
Önceki: v1.388.0): SİPARİŞ KARTI eylemleri aynı kalıba.
Önceki: v1.387.0): ÜRÜN KARTI eylemleri başlığa alındı; kart eylemleri senaryosu.
Önceki: v1.386.0): MODELHANE 3. TUR — atölye numune emri (sanal ürün).
Önceki: v1.386.0): MODELHANE 3. TUR — numune üretimi, yarım çift destekli.
Önceki: v1.385.0): MODELHANE 2. TUR — reçete+maliyet, numune turları.
Önceki: v1.384.0): ERP STANDARDI 1-2-3. adım — token CSS, ikon sprite, erp-ib eylem çubuğu.
Önceki: v1.383.0): DÜĞME YERLERİ — cari kartı referans, tek düzenleme modu.
Önceki: v1.382.0): TASARIM TOKENLARI — 2.509 renk kullanımı tek kaynağa bağlandı.
Önceki: v1.381.0): ERP ARAYÜZ STANDARDI 1. tur — araç çubuğu sırası, disabled kuralı, kısayollar.
Önceki: v1.380.0): ürün maliyeti ve satış fiyatı senaryoyla doğrulandı.
Önceki: v1.379.0): test seçicileri metinden işaretlere — 2. tur.
Önceki: v1.378.0): gider gruplarında tür seçimi + senaryo kapsamı.
Önceki: v1.378.0): ÜRÜN MALİYETİ (çift başı genel gider + satış fiyatı) ve gider grubu yönetimi.
Önceki: v1.377.0): genel gider grupları KARTLARDAN; kalem kart seçerek ekleniyor.
Önceki: v1.376.0): genel giderde GERÇEKLEŞEN/SAPMA ve kullanıcı tanımlı gruplar.
Önceki: v1.375.0): OTOMATİK ONARIM KALDIRILDI; kaynağı belirsiz hareketler bildiriliyor.
Önceki: v1.374.0): GENEL GİDER DEFTERİ ve çift başı maliyet.
Önceki: v1.373.0): HAYALET REZERVASYON — üretim silinince defter temizleniyor.
Önceki: v1.372.0): ÜRETİM İŞÇİLİĞİ kâr-zarara girdi.
Önceki: v1.372.0): GELİR / GİDER kendi ekranında, kart ekstresi eklendi.
Önceki: v1.371.0): KARŞILIKSIZ PARA HAREKETİ denetimi (kasa tarafı).
Önceki: v1.370.0): teslimde GERÇEKTE VERİLEN miktar gösteriliyor.
Önceki: v1.369.0): artan/ek alınan kutuları yan yana ve başlıklı.
Önceki: v1.368.0): teslimde EK ALINAN hammadde girilebiliyor.
Önceki: v1.367.0): KARŞILANAN artık hareketlerden TÜRETİLİYOR (kök çözüm).
Önceki: v1.366.0): HAYALET KARŞILANAN denetimi ve onarımı.
Önceki: v1.365.0): üretime çıkış ELLE VERİLEN hammadde miktarından.
Önceki: v1.364.0): serbest paketleme kontrolü + alış siparişi paketleme + planlama rozeti.
Önceki: v1.363.0): paketlemede kaynak künyesi (üretim no · sipariş no · müşteri).
Önceki: v1.362.0): kaynak ikonları HÜCRE seviyesinde de birleştiriliyor.
Önceki: v1.361.0): FAZLA SEVK VE STOKSUZ SATIŞ REDDEDİLİYOR.
Önceki: v1.360.0): toplu koli etiketi + "Depoda" görünümü.
Önceki: v1.359.0): aynı üretimin payları tek satır + planlama boşken sebep yazılı.
Önceki: v1.358.0): asortili koli ÇOKLU YAZMA düzeltildi + senaryo yazıldı.
Önceki: v1.357.0): asortili koliler düzeltildi + FAZLA SEVK uyarısı.
Önceki: v1.356.0): kasa/banka hesap bilgisi düzenlenebiliyor.
Önceki: v1.355.0): bölme 13. tur — üretim silme ve ONAY SİSTEMİ (bağ ref ile çözüldü).
Önceki: v1.354.0): koli kurarken TÜM ADETLERİ ASORTİLE.
Önceki: v1.353.0): bölme 12. tur — tedarik planlama ve çöp kutusu.
Önceki: v1.352.0): bölme 11. tur — üretim teslim alma (en büyük tek fonksiyon).
Önceki: v1.351.0): bölme 10. tur — sipariş teslim ve prosese iş verme.
Önceki: v1.350.0): bölme 9. tur — ad değiştirme çıktı, onay sistemi ÇIKMADI.
Önceki: v1.349.0): bölme 8. tur — göç, hurda telafi, muhasebe bağı.
Önceki: v1.348.0): FİŞLER TEK EKRANDA; işçilikte adet/birim fiyat; banka adı öğrenen alan.
Önceki: v1.347.0): çek işlemleri ve silme zincirleri ayrı dosyalarda (6.-7. tur).
Önceki: v1.346.0): cari fişi kesme ayrı dosyada — bölme 5. tur.
Önceki: v1.345.0): AÇILIŞ YÜKLEME ayrı dosyada — en büyük parça taşındı.
Önceki: v1.344.0): bölme 3. tur — koli ve fiş defteri yazma ayrı dosyalarda.
Önceki: v1.343.0): yedekleme ayrı dosyada — bölme 2. tur.
Önceki: v1.342.0): 2. MADDE BAŞLADI — app dosyası bölünüyor (bkz. 32).
Önceki: v1.341.0): TESTLER METİNDEN KURTARILIYOR — 1. tur (bkz. 31).
Önceki: v1.340.0): bekleyen yazma şeridinde tıklanabilir AYRINTI.
Önceki: v1.339.0): sipariş matrisi bölünmüş kalemleri topluyor (asıl düzeltme).
Önceki: v1.338.0): paketleme notu kaldırıldı, ürün kartı satırları toparlandı.
Önceki: v1.337.0): ürün kartından "P.Birimi Ekle" kalktı; sipariş matrisi
planlamayla değişmiyor. Önceki: v1.336.0): ORTAK EYLEM ÇUBUĞU — Kaydet/Vazgeç pencere başlığında.
Önceki: v1.335.0): anasayfada toplam alacak PARA BİRİMİ BAZINDA.
Önceki: v1.334.0): FİYATLANDIRMA — cariye özel fiyatta renk/beden kırılımı (bkz. 31).
Önceki (v1.333.0): kâr/zarar raporu (bkz. 30).
Önceki (v1.332.0): kalem eklendikten sonra form tam sıfırlanıyor.
Önceki (v1.331.0): fiş ekranı toparlandı (alanlar içeriği kadar).
Önceki (v1.330.0): fiş ekranı sadeleşti — kalem satırı tek satır, üst satır düzenlendi.
Önceki (v1.329.0): ölçü seçici rengin yanına alındı.
Önceki (v1.328.0): ölçü açılır listeden; ürün ve renk YAZARAK aranıyor.
Önceki (v1.327.0): boyut ölçülerinde miktar kutusu seçimle açılıyor.
Önceki (v1.326.0): KULLANICI ROLLERİ + PANEL kullanıcısı (bkz. 29).
Önceki (v1.325.0): menü yeniden düzenlendi, fişler ikiye ayrıldı, fiş numarası
kısaldı (bkz. 28). Önceki (v1.324.0): görevler anasayfada + WhatsApp, sohbet anlık, anasayfa sadeleşti
(bkz. 27). Önceki (v1.323.0): modelhanede RESİM HAVUZU + MENÜ GRUPLARI (bkz. 26).
Önceki (v1.322.0): GELİR/GİDER KARTLARI — alışsız giderlerin karşı tarafı (bkz. 25).
Önceki (v1.321.0): MODELHANE — 1. tur (künye, tasarım, teknik, aşama akışı,
koleksiyona alma). `gorevler.sql` içinde `modeller` tablosu, KULLANICI ÇALIŞTIRACAK.
Önceki (v1.320.0): eski işler kapatıldı — ödeme etiketi, kullanıcı damgası, virman tek işlem.
Önceki (v1.319.0): stok kartında TEKNİK ÇİZİM SEKMESİ (iskelet).
Önceki (v1.318.0): virman sebebi ÖĞRENEN LİSTE.
Önceki (v1.317.0): virmanda SEBEP SEÇİMİ ZORUNLU.
Önceki (v1.316.0): kasa hareketlerinde DÜZENLE + ONAYLI SİLME; virmanda KUR ÇEVİRİCİ.
Önceki (v1.315.0): KASA EKRANI İŞLEM ÇUBUĞU + VİRMAN.
Önceki (v1.314.0): ödeme/tahsilatta KASA-BANKA SEÇİMİ ZORUNLU.
Önceki (v1.313.0): KASA↔CARİ HAREKETİ TEK ÇEKİRDEKTEN (`207-kasa-cari-ortak.jsx`).
Önceki (v1.312.0): KASA/BANKA → CARİ YÖNÜ DÜZELTİLDİ (ciddi kayıt hatası).
Önceki (v1.311.0): üretimde ARTAN İADESİ AYRI FİŞ (`…-İade`).
Önceki (16 Eylül, v1.310.0): FİŞSİZ HAREKET YAZILAMAZ — numarasız hareket geçitte kaynağına
göre numara alıyor. Önceki (v1.309.0): PARÇA 2 — HER STOK HAREKETİ DEFTERE — bkz. 23 sonu.
Önceki (v1.308.0): PARÇA 1 — STOK MİKTARI HAREKETLERDEN TÜRETİLİYOR — bkz. 23.
Önceki (v1.307.0): Adım 3'ün YARIM KALAN yanı kapandı — sipariş yolunda yan etkiler
(setStok/setCariler/tabloYaz) hesap fonksiyonunun içindeydi, defter yazımından ÖNCE çalışıyordu.
Önceki (v1.306.0): OTURUM SÜRDÜRME — sayfa yenilenince giriş istemiyor (12 saat).
Önceki (v1.305.0): uyarılar uzunluğa göre kalıyor + dokununca kapanıyor.
Önceki (v1.304.0): FİŞ DEFTERİ — ADIM 3 (sipariş yolu da atomik) — bkz. 22 sonu.
ÜÇ ADIMIN ÜÇÜ DE TAMAM. Önceki (v1.303.0): FİŞ DEFTERİ — ADIM 2 (defterden yeniden kur) — bkz. 22 sonu.
Önceki (v1.302.0): FİŞ DEFTERİ — Adım 1 (tek kayıt, atomik yazma) — bkz. 22.
`gorevler.sql` içinde `fis_defteri` tablosu, KULLANICI ÇALIŞTIRACAK.
Önceki (v1.301.0): STOK TUTARSIZLIĞI KÖK NEDENİ — bulut yazımı yarım kalınca açılışta
bulut yereli eziyordu; BEKLEYEN YAZMA DEFTERİ + "Fişten yeniden yaz" onarımı — bkz. 21 (ÖNEMLİ).
Önceki (v1.300.0): RAPOR MATRİS HÜCRESİ — sipariş / giden / kalan üstte, aşama dökümü
altta — bkz. 20. Önceki (v1.299.0): kaynak sipariş notu TIKLANABİLİR (19 sonu).
Önceki (v1.298.0): MATRİSLER TABLO GÖRÜNÜMÜNDE (`matris-tablo` sınıfı) — bkz. 18 sonu.
Önceki (v1.297.0): sipariş hücresinde kesir YALNIZ kısmi karşılamada (19 sonu).
Önceki (v1.296.0): sipariş matris hücresi sade — tamamı karşılanan bedende tek sayı
(bkz. 19 sonu). Önceki (v1.295.0): SİPARİŞ KARTI SEKMELERİ — Tedarik Girişleri ve Fiş Geçmişi artık
"Fişler" sekmesinde; kartın altındaki yığılma bitti — bkz. 19. Önceki (v1.294.0): STOK DURUMU MATRİS görünümü (renk × beden + metrik seçici) — bkz. 18.
Önceki (v1.293.0): mobilde "TÜMÜ" paneli — bütün ekranlar + "Masaüstü görünümüne geç";
kullanıcı "masaüstü moda nasıl geçeceğiz" diye sordu, dönüş yolu YOKTU. Önceki (v1.292.0): SAHA MODU KALDIRILDI — tek mantık: mobil, masaüstü ekranlarının
kısıtlanmış hâli. Bölüm kataloğuna Tedarik Girişleri ve Fiş Geçmişi eklendi — bkz. 16 ve 17.
Önceki (v1.291.0): MOBİL DÜZEN KİPİ — geniş telefon/tablet ve "masaüstü site" kipinde
alt çubuk çıkmıyordu; artık gövde sınıfı + cihaz tercihi — bkz. 17 sonu.
Önceki (v1.290.0): Mobil Görünüm 2. tur — alt çubuk sayısı ayarlanır (3–8), modül içi
BÖLÜMLER düzenlenebilir ve sipariş kartında uygulanıyor — bkz. 17 sonu.
Önceki (14 Eylül, v1.289.0): MOBİL GÖRÜNÜM DÜZENLEYİCİ — sürükle-bırak sıra, gizleme, alt çubuk
— bkz. 17. AÇIK SORU KAPANDI: kullanıcı "kısıtlama ekranı en mantıklısı" dedi. Önceki (v1.288.0): SAHA MODU 3. tur — ürün görseli, çoklu kalem sepeti, mobilde
matris kaydırma; AÇIK SORU: saha modu mu, normal ekranların mobil kısıtlaması mı (16 sonu).
Önceki (v1.287.0): SAHA MODU 2. tur — asorti, otomatik fiyat, sipariş listesi (matris)
+ planlama, ekstre matrisi — bkz. 16 sonu. Önceki (v1.286.0): SAHA MODU — bkz. 16.
Önceki (v1.285.0): YENİ ÜRÜN formunda beden grubu kısayolu — bkz. 14 sonu.
Önceki (v1.284.0): fişte FİYAT/P.B. düzenlenebilir; Tanımlar'da TANIMSIZ ÖLÇÜLER
bölümü — bkz. 15. Önceki (v1.283.0): BEDEN GRUPLARI — aralıkla tanımla, ürün kartında tek dokunuşla ekle
— bkz. 14. Önceki (v1.282.0): Tanımlar'da BEDEN/BOYUT ADI DÜZENLEME — bağlı kayıtlar hizalanıyor
— bkz. 13. Önceki (v1.281.0): başlatıcı önce `surum.json` okuyor (kullanıcı HTTP 401 gördü);
`surum.json` örneği ve rehberde sorun bölümü. Önceki (v1.280.0): STORAGE'DAN ÇALIŞTIRMA — `baslat.html` yönlendirici + `storage-kurulum.md`;
herkese tek sabit adres. Önceki (v1.279.0): SÜRÜM DUYURUSU — güncel sürüm bulutta, herkes açılışta görüp
indiriyor (dosya göndermeye son) — bkz. 12. `gorevler.sql` içinde artık `surum` tablosu da var.
Önceki (v1.278.0): SOHBET — ekip/kişisel kanallar, kayıt bağlama, sohbetten görev
verme; görev ve sohbet TEK EKRANDA (sekme) — bkz. 11 sonu. `gorevler.sql` içinde artık `mesajlar`
tablosu da var, ikisi birlikte çalıştırılacak. Önceki (v1.277.0): GÖREVLER MODÜLÜ — atama, durum akışı, kontrol adımı, yazışma,
menü rozeti; `gorevler.sql` KULLANICI ÇALIŞTIRACAK — bkz. 11. Önceki (v1.276.0): TEMİZLİK DENETİMİ — ölü kod, prop uyumsuzlukları, boş durum kutusu
metni; iki yeni denetim aracı (`olukoddenetim.js`, `propdenetim.js`) — bkz. 10. Önceki (v1.275.0):
"SİPARİŞTEN SEÇ" (9b) — alış fişine aynı tedarikçinin diğer açık
siparişlerinden satır; sipariş kartı + Cari › Alış Fişi; tek fiş, her siparişin karşılananı kendi
kaydında; geri alma çalışıyor — bkz. 9b. Önceki (v1.274.0): tek renk havuzu (9g), Paylaş Şeridi (9h).** Önceki (v1.272.0): tedarik detayı (9f sonu). Önceki (v1.271.0): çipte alış fişi no (9f). AÇIK TARTIŞMA: renk yapısı (hammadde / mamul / model rengi → ikiye indirme) — 9g'yi oku.**
Önceki (v1.270.0): yöneticisiz liste kilidi (9e). Önceki (v1.269.0): renk kodları tek havuz (9d). Kullanıcı VERİTABANINI SIFIRLADI (13 Eylül), baştan başlıyor.**
Önceki (v1.268.0): JSON yedeği tam + dosyadan geri yükleme (9c). Önceki (v1.267.0): bekleyen üretimler toplam · kalan (8z sonu). Önceki (v1.266.0): E-posta düğmesi WhatsApp gibi — paylaş
menüsü PDF ekli, alıcı panoya; SMTP/`eposta` fonksiyonu İSTEĞE BAĞLI — bkz. 9a sonu. AÇIK KARAR: "Siparişten seç" (alış fişine başka siparişten satır) — 9b'yi oku, başlanmadı.**
Önceki (v1.264.0): üretimden koli sınırı (8z). Önceki (v1.263.0): sipariş çıktısı PDF + WhatsApp paylaşımı (8y) — GERÇEK CİHAZDA DENENMEDİ. Önceki (v1.261.0): sipariş başlığı sıkı (8x). Önceki
(v1.260.0): fiş geçmişi matris + kaynak ikonları (8w). Önceki (v1.259.0): Tedarik Girişleri matris (8v).
Önceki (v1.258.0): sipariş kartında Tedarik Girişleri bölümü, sevk kaynağı FIFO miktarla ve
tıklanabilir — bkz. 8v. Öncesi (12 Eylül, v1.257.0): KİMLİK DOĞRULAMA 2. AŞAMA hazır — `rls-kimlik.sql` yazıldı
(ÇALIŞTIRILMADI), uygulamada bulut ön giriş ekranı — bkz. 8u. KULLANICIDA BEKLEYEN: (1) `kullanici`
fonksiyonunu deploy etmek (8t), (2) bütün kullanıcılara bulut hesabı, (3) sonra `rls-kimlik.sql`.**
Öncesi 8t: bulut kullanıcısı uygulamadan. Öncesi 8s: son alış fiyatları. Öncesi 8r: sipariş kartı düzenleme modu. Öncesi 8q: model rengi barkodu.
Öncesi 8p: Depo başlığı. Öncesi 8o: Stok başlığı. Öncesi 8n: aşama
ikonları. Öncesi 8m: Excel =
tablo. Öncesi 8l:
resim sütunu. Öncesi
8k: sade ekran. Öncesi 8j: sütun ayarları.
Öncesi 8i: matris varsayılan. Öncesi 8i: hücrede aşama.
Öncesi 8h: matris düzeni. Öncesi 8g:
seçenek listesi. Öncesi 8f: sütun aramaları. Öncesi
8e: serbest arama. Öncesi 8d: tutar sütunları. Öncesi 8c: hazır ürünler. Öncesi 8b: sipariş
raporu aşama satırları. Öncesi 8a: rapor motoru + Sipariş raporları. SIRADAKİ: aynı sekmeyi diğer modüllere yaymak (Stok, Cari, Üretim…) — motor hazır, her
modül yalnız düz satır + alan listesi verecek.** Yolda: `kodSayaclari` açılışta sıfırlanıyordu, kapandı (8a sonu).
Öncesi: Satın Al renk+beden (7z-51).
Öncesi: alış fişine yalnız tıklanan ihtiyaç (7z-50; **7z-36'nın otomatik doldurması GERİ ALINDI,
bir daha önerme**), alış fişinde renk/tek satır (7z-49), şerit sekmeleri (7z-48). Ondan önce: kullanıcı girişi
AKTİF, `mahmut@atolye.local` bulut kimliğiyle giriyor (7z-45). Öncesi: 7z-44 (çek iade/tahsil), 7z-43 (çek bağı).

~~KARAR BEKLİYOR — 7z-46~~ **YAPILDI (v1.255.0, bkz. 8t).**

**Önce bunları oku, sırayla:**
1. **"DEĞİŞMEZ KURAL — YENİ DEFTER, İKİ KAPIYA BİRDEN BAĞLANIR"** (aşağıda, Çalışma yöntemi'nden
   hemen önce). Bu projedeki en pahalı hata sınıfı orada tarif edilmiş ve beş kez tekrarlanmış.
   **6b'de altıncı kez görüldü** — bu kez yeni defterde değil, bir ALANDA (`variant.barkod`).
2. **6b — barkod şeması** (notun sonu): yapılanlar, çıkan üç hata, açık kalanlar.
3. **KAPSAM KARARLARI** — tekrar önerilmeyecek şeyler: geçmiş veri göçü (3. bölüm başı), depo
   kapsamı (5s), raf/min. stok/transfer (4o sonu).

**Bu oturumda (2-6 Eylül) yapılanların özeti — v1.72 → v1.136:**
- Ana sayfada Son İşlemler akışı + tür sekmeleri (3i, 4s)
- Bakiye rengi tek kural, sipariş/fiş ayrımı, "Satın Alma" → "Alış Siparişi" (3j, 5g, 5h)
- Fiş numaraları sıralı ve tipe göre: THS/ODM/AF/SF (3k)
- Çek girişi ayrıntılı, Çekler listesine bağlandı, geri alma kapısına takıldı (3m, 3n, 3p)
- Banka IBAN'dan otomatik, şubeler öğreniliyor (3o)
- **Paketleme modülü**: koli kurma, koli/kutu etiketleri, sevkiyatta barkod okutma (3s, 3t, 3u–3v)
- **Barkodla Atölye**: personel barkodu, iş alma/teslim, parça bölünmesi (4b–4h)
- İş emri belgesi (A4), hammadde matrisi (4j–4l)
- Depo ikiye ayrıldı: Hammadde + Mamul (4o); tek ürün tek satır (5u)
- Stok durumu tablosunda beş tur süren hesap/adlandırma düzeltmeleri (4u–5d, 5e)
- **Kalıcı barkod şeması** (6b): stok no / renk kodu / ölçü kodu / asorti kodu, hepsi atanır ve
  buluta yazılır. v1.135.0'ın türetilmiş kodları kaldırıldı.

## ARAÇLAR VE TEST ALTYAPISI (6 Eylül itibarıyla)

```sh
./yap.sh                 # birleştir → 17 denetim → ölü kod → paketle
./test/kosu.sh           # 22 birim testi + 78 tarayıcı senaryosu (sayım 19 Eylül, v1.358.0)
node konum.js 5204       # birleşik satır → src dosyası:satır
```

- **Kaynak:** `src/` altında 64 parça. `atolye-erp.jsx` ÜRETİLEN dosya, elle düzenlenmez.
- **Denetleyiciler (17):** yapı, gidiş-dönüş, alt tablo, matris, katman, sonuç, stok, sürüm, fiş,
  asorti, hareket kapıları, **beden sırası (17, bu oturumda eklendi)**…
- **Birim testleri:** fisyaz-gerial, ambalaj, cari-yön, fiş no, banka, barkod (Code128),
  atölye barkod, stok durumu, hareket etiketi, **barkod şeması (44 iddia, 6 Eylül)**.
  `birim-asorti-barkod.js` SİLİNDİ — ölçtüğü türetilmiş kod biçimi kaldırıldı.
- **Tarayıcı senaryoları:** fiş, sipariş, silme, üretim, cari kart, cari bakiye, reçete öneri,
  çıkış fişi, çok modelli fiş, onay düzenleme, fiş özet, görsel seçici, hata paneli, depo köprüsü,
  geri dönüş, son işlemler, bakiye renk, çek girişi, paketleme, sevkiyat, barkod atölye,
  mamul depo, satın alma sütunu, satın al düğmesi, **barkod sipariş (6 Eylül)**.

**SQL dosyaları — yeni kurulumda çalıştırılmalı:** `koli.sql`, `atolye-barkod.sql`,
`barkod-semasi.sql`,
`satis-para-birimi.sql`, `sezon-yili.sql`,
`cari-kodu.sql`, `cek-gorselleri.sql`, `recete-gerceklesme.sql`.

**Bekleyen SQL: `gorevler.sql`** (Görevler tablosu, v1.277.0 — çalıştırılmazsa görevler yalnız
yerelde kalır, ikinci cihazda görünmez) ve **`rls-kimlik.sql`** (2. aşama, v1.257.0) — önkoşulları dosyanın başında; hepsi
sağlanmadan ÇALIŞTIRILMAMALI. Diğerlerinin hepsi çalıştırıldı (son: `recete-gerceklesme.sql`, 7 Eylül).

**Supabase Edge Function:** `supabase-kur-fonksiyonu.ts` — TCMB kuru için, kurulumu dosyanın
başında yazılı. Zorunlu değil (kurulmazsa halka açık aracılara düşer) ama kurulmadan TCMB kuru
pratikte alınamıyor.

## ESKİ SIRADAKİ İŞ (31 Ağustos, tamamlandı)

### 1. DOSYAYI MODÜLLERE BÖL — TAMAMLANDI (31 Ağustos)

`atolye-erp.jsx` artık `src/` altında 53 parça. Kaynak dosya ARTIK ELLE DÜZENLENMİYOR; üretiliyor.
Numaralar üç haneli ve beşer artıyor: ada göre sıralama sayısal sırayla aynı kalsın (iki haneli
olsaydı `100-`, `20-`den önce gelirdi) ve araya yeni parça sıkıştırılabilsin.

```
src/
      000-cekirdek.jsx           38  import, font yükleyici, kategori sabitleri
      005-urunsecici.jsx        169  AramaliUrunSecici
      010-stokdurumu.jsx        421  StokDurumuMatrisi, StokDurumuTablosu, KategoriIkonu
      015-sabitler.jsx          100  para/birim, aşama-kaynak renkleri, proses paleti, SÜRÜM
      020-rezervasyon.jsx       288  rezervasyon/stok durumu hesapları, tarih üst sınırı
      025-veri-fark.jsx         229  fark belleği, günlük, sürüm kilidi, sırayla, pgKimlik
      030-supabase.jsx          173  bağlantı sabitleri, oturum/auth, supabaseIstek, tekilYaz
      035-sema.jsx              182  TABLO_SEMA
      040-esitle.jsx            267  supabaseSil/SilBilesik, yazma kuyruğu, tabloEsitle, tabloYaz
      045-oku.jsx               228  supabasedenOku, kayıt çevirimi, renk kimliği
      050-tarih-proses.jsx      199  tarih/yuvarlama, proses ikon-renk, ölçü tipleri, ürün yardımcıları
      055-recete.jsx            165  sipariş hammadde ihtiyacı, reçete kapsamı, ambalaj rengi
      060-depo.jsx              180  veri kilidi, pencere sabitleri, depo boyutu, güvenliYaz/Oku
      065-giris.jsx             138  logo, ilk kurulum ve giriş ekranları
      070-ihtiyacmatrisi.jsx    211  ihtiyaç satırları, beden sıralama, IhtiyacMatrisi
      075-fis-ortak.jsx         289  fiş no üretimi, para çevirme, yazdırma, fiyatBul
      100-app.jsx              5296  AtolyeERP (App) — TEK BİLEŞEN, bölmek gerçek refaktör ister
      110-navigasyon.jsx        431  NavItem, geciken işler, ana sayfa
      115-tanim-ogeleri.jsx     437  görsel sıkıştırma, ColorSwatch, TanimListesi, Bolum
      120-gunluk.jsx            215  GunlukPaneli
      125-veridenetimi.jsx      275  veri tutarlılık motoru + ekranı
      130-tanimlar.jsx         1579  TanimlarModule — tek bileşen
      135-tanim-bolumler.jsx    594  Supabase, defter onarım, depolama, yedek, sıfırlama, kombinasyon
      140-asorti.jsx            281  asorti oluşturucu/uygula/teklif, ölçü tipi, kombinasyon adı
      145-recete-grupla.jsx     162  reçete gruplama, rezerve hesapları, hareket gruplama
      150-stok-giris.jsx        133  BagimsizStokGirisiFormu
      152-stok.jsx             2060  StokModule — tek bileşen
      155-stok-hucre.jsx        261  StokGirisHucre, EkFiyatEkleyici, UrunOzetSatiri
      160-urunkarti.jsx        4174  ProductMatrixCard — tek bileşen, en büyük parça
      200-cari-sabit.jsx        100  cari/fiş sabitleri, tumFisleriTopla, hesapBakiyesi
      205-muhasebe.jsx          375  MuhasebeModule
      210-hesaplar.jsx          756  HesapListesi, CekListesi
      220-hammadde-alis.jsx     222  hammadde satın alma durumu ve rezervasyon dağıtımı
      225-kur.jsx               201  KurRozeti
      230-mrp.jsx               439  mrpHesapla, PlanlamaModule, fire raporu, rezervasyon deposu
      235-hammaddeihtiyac.jsx   859  HammaddeIhtiyacSekmesi
      240-planlama-sekme.jsx    480  planlanmış sekmesi, sağ panel kartı, sipariş planlama sekmesi
      250-fisler.jsx            325  FislerModule
      255-stokfisi.jsx          520  StokFisiFormu
      260-cari.jsx              545  CariModule, hareket gruplama, FisKalemMatrisi
      265-carikart.jsx         1179  CariCard
      270-miktar.jsx            124  ifadeHesapla, MiktarGirisi
      275-yazdir.jsx            564  reçete/fiş yazdırma, cari ekstre, teslim fişi
      280-atolye.jsx            924  atölye ekranları, barkod okutma
      300-uretim.jsx            594  UretimModule
      305-teslimalma.jsx        401  TeslimAlmaFormu
      310-uretimkarti.jsx       936  UretimSiparisKarti
      320-siparis-sabit.jsx      91  sipariş durumları, sesli sipariş butonu
      325-siparis.jsx          1592  SiparisModule — tek bileşen
      330-siparis-ozet.jsx      471  tedarik durumu, çeviri paneli, sipariş özet satırı
      335-planlama-bolum.jsx    400  PlanlamaBolumu, PlanlamaSatiri
      340-sipariskarti.jsx     1342  SiparisCard — tek bileşen
      350-ortak-ui.jsx           28  Field, inputStyle, EmptyState
```

**Bölme SIRA KORUYARAK yapıldı** — parçalar birleştirilince çıkan dosya, bölmeden önceki
dosyanın BİREBİR aynısı (sha256 eşleşiyor) ve paketlenen HTML de gönderilmiş v1.42.0 ile aynı.
Notta önerilen dağılım (fişi 20'ye almak, App'i sona atmak) yerine düz dilimleme seçildi:
yeniden sıralamak semantik olarak güvenli GÖRÜNÜYOR ama bunu kanıtlamak zor; birebir aynı çıktı
ise bölmenin hiçbir şeyi değiştirmediğinin kanıtı. Alan bazlı taşımalar (`fisYaz`'ı tek dosyada
toplamak gibi) 2. işin doğal parçası, ayrı ve denetlenebilir adımlar olarak yapılacak.

- `import`/`export` YOK. Parçalar tek kapsamı paylaşıyor, sadece ayrı dosyalarda duruyorlar.
  ES modüllerine geçmek 400+ üst düzey adı export/import etmeyi gerektirirdi.
- `birlestir.js` parçaları ada göre sıralayıp `atolye-erp.jsx`i üretir ve
  `src/.satir-haritasi.json` yazar.
- Denetleyiciler BİRLEŞİK dosyada çalışmaya devam ediyor (kural tek yerde). `konum.js` bulguların
  satırını çevirir: `atolye-erp.jsx:19540` → `205-muhasebe.jsx:265`. `kontrol.sh` bunu otomatik yapar.

**Hâlâ büyük olan altı parça TEK BİLEŞENİN GÖVDESİ** — düz dilimlemeyle daha küçültülemezler,
bölmek gerçek refaktör ister (iç parçaları ayrı bileşene çıkarmak; hook sırası ve state sahipliği
değişir, yani DAVRANIŞ RİSKİ VAR — tarayıcıda doğrulama şart):

| parça | satır | bileşen |
|---|---|---|
| `100-app.jsx` | 5.296 | `AtolyeERP` — state + sekmeler + pencere yöneticisi |
| `160-urunkarti.jsx` | 4.174 | `ProductMatrixCard` |
| `152-stok.jsx` | 2.060 | `StokModule` |
| `325-siparis.jsx` | 1.592 | `SiparisModule` |
| `130-tanimlar.jsx` | 1.579 | `TanimlarModule` |
| `340-sipariskarti.jsx` | 1.342 | `SiparisCard` |

Bunlara dokunulmadan önce 2. iş (tek kapı) yapılmalı: `fisYaz`/`fisGeriAl` bu bileşenlerin
içindeki kopyaları eritince gövdeler zaten küçülecek.

### 2. TEK KAPI: `fisYaz` — YAPILDI (31 Ağustos, v1.43.0)

`src/078-fisyaz.jsx` → **`fisYaz(stok, cariler, fis)`**. Fişin bütün stok ve cari yan etkilerini
üreten **saf** fonksiyon: state'e dokunmaz, toast göstermez, buluta yazmaz; yalnızca yeni `stok`,
`cariler` ve `cariHareketleri` döndürür. Saf olmasının sebebi: iki çağrı yerinin biri `setStok`
içinden, diğeri `setSiparisler` güncelleyicisinin İÇİNDEN çalışıyor — yan etkili bir fonksiyon
orada kullanılamazdı. Kaydetme ve bildirim çağıranda kaldı.

İki ticari fiş yazıcısı da bu kapıdan geçiyor:
- `stokFisiKaydet` (cari kartından kesilen alış/satış fişi)
- `siparisGerceklestir` (sipariş teslim alma)

16. denetleyici artık **9 yazıcı, 3 silici** sayıyor (10'du). `kapidenetim.js` listesinde bu ikisi
yerine tek `fisYaz` var.

**PARAMETRELİ — çünkü iki yol bugün ayrışmış durumda.** Farkları burada sessizce birleştirmek
kullanıcının gördüğü rakamları değiştirirdi. Bu yüzden her fark bir BAYRAK olarak duruyor: kapı
tek, davranış bugünküyle birebir aynı. **Her bayrak kapatılmayı bekleyen bir karardır:**

| # | ayrım | fiş yolu | sipariş yolu |
|---|---|---|---|
| 1 | `yon` | ~~Alış→Borç, Satış→Alacak~~ → **KAPANDI: ikisi de Borç** | ikisi de **Borç** |
| 2 | `kurZorunlu` | kur yoksa kaydı REDDET | ham tutarla devam et |
| 3 | `tutarYuvarla` | çevrilen tutarı yuvarlar | yuvarlamaz |
| 4 | `birimFiyatBolerek` | birim fiyatı ayrıca çevirir | tutar ÷ miktar |
| 5 | `zaman` | ~~yazar / yazmaz~~ → **KAPANDI (v1.57.0): ikisi de yazıyor** | yazıyor |

**1 numara KAPANDI (kullanıcı kararı, 31 Ağustos).** Bakiye `Borç − Alacak` toplandığı için aynı
satış işlemi cari kartından girildiğinde bakiyeyi AZALTIYOR, sipariş teslim yolundan girildiğinde
ARTIRIYORDU. Elle hareket formunun varsayılanı da Alış/Satış için `Borç`. Kullanıcı: **"bakiye
artmalı"** → fiş yolu da `Borç` yazıyor. Altın test farkı tek satır: `yon: Alacak → Borç`.

> **GEÇMİŞ VERİ — KAPANDI (2 Eylül, kullanıcı kararı): DÜZELTİLMEYECEK.**
> Mevcut veri TEST verisi, gerçek kayıt değil. Kullanıcı: *"müdahale etmene gerek yok, hâlâ test
> yapıyoruz, data doğru değil."* Eski yönlü kayıtlar oldukları gibi kalıyor.

**Bu arada düzelen kök sebep:** `stokFisiKaydet` eskiden `setStok`u kur kontrolünden ÖNCE
çağırıyordu — kur bulunamayınca "fiş kaydedilmedi" deniyor ama **mal zaten stoğa girmiş**
oluyordu (borç yok, stok var). `fisYaz` her şeyi önce hesaplayıp sonra yazdığı için bu mümkün değil.

**Bilinen, bilerek KORUNAN iki davranış** (düzeltmek rakam değiştirir, ayrı karar):
- Sipariş yolunda ürün bulunamayıp kalem atlansa bile `karsilanan` yine de artıyor.
- Fiş yolunda ürün bulunamayan kalem için eskiden cari hareketi yine yazılıyordu; artık yazılmıyor
  (kalem tümüyle atlanıyor). Ürün seçiciden geldiği için pratikte oluşmaz.

**Tek görünür değişiklik:** sipariş teslim yolunda cari hareketlerinin SIRASI. Eskiden her kalem
tek tek başa ekleniyordu (sonuç: ters sıra), artık hepsi bir kerede kalem sırasıyla ekleniyor —
fiş yolundaki davranışın aynısı. Tarayıcı testi bunu doğruladı: sıra dışında iki çıktı birebir aynı.

### 2b. TEK KAPI: `fisGeriAl` — SİLME YOLLARI DA BİRLEŞTİ (31 Ağustos, v1.44.0)

`src/079-fisgerial.jsx` · `fisYaz`ın tersi, yine **saf**: state'e dokunmaz, çöpe atmaz, buluta
yazmaz. Yeni `stok`/`cariler`/`siparisler` dizilerini ve "ne silindi" listelerini döndürür; çöp
kaydı, yazma ve bildirim çağıranda kalır.

- `removeHareketEverywhere` (tek hareket, stok/cari kartından) → `fisGeriAl`
- `yetimFisTemizle` (fişin tamamı, ekstreden) → `fisGeriAl`
- `cariSilCascade` **silici değilmiş**: adı öyle ama artık hareketi olan cariyi silmeyi REDDEDEN
  korumalı bir yol. Denetleyici listesi bu yüzden yanıltıcıydı, düzeltildi.
- 16. denetleyici: **3 silici → 1**.

Kapıda toplanan, daha önce yollara dağılmış üç kural:
1. **`esId` kardeşi birlikte silinir.** Muhasebe defterinde bir kayıt Genel+Resmi olarak iki satır
   yazılır; yalnızca birini silmek diğerini yetim bırakıp bakiyeyi bozardı. Eskiden `yetimFisTemizle`
   kümeyi kendisi genişletiyordu, `removeHareketEverywhere` cari tarafında ayrıca kontrol ediyordu —
   aynı kural iki farklı yerde. Artık `fisGeriAl` kümeyi kendisi genişletiyor.
2. **Sipariş `karsilanan` geri düşümü** ve durum kuralı (`Tamamlandı`/`Kısmi Teslim`/`Bekliyor`,
   `İptal` korunur) tek yerde. v1.40.0'ın kök sebebi buydu.
3. **Miktar kırpılmadan geri alınır** (`Math.max(0, …)` yok).

**Doğrulama**
- `test/senaryo-silme.js` (yeni): teslim al → fişi ekstreden sil. Stok miktarı geri düşüyor, borç
  siliniyor, `karsilanan` 0'a dönüyor, durum `Bekliyor` oluyor. v1.42.0 paketiyle karşılaştırıldı:
  **stok/cari/sipariş sonuçları birebir aynı**; tek fark çöp kayıtlarının SIRASI (fisYaz'ın kalem
  sırası değişikliğinin doğal sonucu).
- `test/birim-fisyaz-gerial.js` (yeni, tarayıcısız): `fisGeriAl` gerçekten `fisYaz`ın tersi mi?
  Fiş yazılıp geri alınıyor, sonuç başlangıç durumuyla karşılaştırılıyor. Muhasebe defteri (eş kayıt)
  ve tek kalem geri alma da kapsamda. 9 iddia, hepsi geçiyor.

### 2c. ÜRETİM DE KAPIYA BAĞLANDI (31 Ağustos, v1.45.0)

**Bildirilen hata:** Fişler ekranından işçilik fişi silinince cari kaydı gidiyor ama üretim kartında
proses hâlâ "teslim alındı" duruyordu. Üretim çıkış fişi silinince stok geri geliyor ama üretim
ilerlemesi değişmiyordu.

**Kök sebep:** `fisGeriAl` stok + cari + siparişi geri alıyordu; üretim siparişinin ilerlemesi
(`atama.tamamlandiMi`, `adim.tamamlandiMi`, `stogaEklendiMi`, `asama`) dördüncü bir defterdi ve
kapının dışında kalmıştı. Üretimin kendi geri alma yolu (`uretimProsesAtamaTeslimGeriAl`) vardı ama
fiş silme onu hiç çağırmıyordu — yine iki kopya, yine ayrışma.

**Çözüm — iki parça:**
1. **Fiş AİLESİ birlikte gider.** Bir teslim alma üç fiş numarası yazıyor: `1001-Kesim` (hammadde
   çıkışı), `1001-Kesim-İşçilik` (personel carisi), `1001-Kesim-Giriş` (mamul girişi). Hangisi
   silinirse silinsin üçü birden geri alınır. Yalnızca birini silmek mamulü stokta ya da işçiliği
   personelin carisinde bırakırdı — bildirilen hatanın ikinci yarısı buydu.
2. **Üretim ilerlemesi geri alınır:** atama "teslim alınmadı"ya döner, adım tamamlanmamış sayılır,
   son prosesse `stogaEklendiMi` kalkar, `asama` o prosese geri çekilir.
   **Atama SİLİNMEZ** — iş hâlâ personelde görünür, kullanıcı yeniden teslim alabilir.
   Bu, `uretimProsesAtamaTeslimGeriAl`ın üretim güncellemesiyle birebir aynı.

**Fiş no AYRIŞTIRILMIYOR, YENİDEN ÜRETİLİYOR.** `uretimFisAilesi()` üretim kaydındaki adımlar ve
atamalar üzerinde dolaşıp fiş numarasını teslim almadaki formülle (`${siparisNo}-${proses}${ek}`)
yeniden kuruyor ve karşılaştırıyor. Metni parçalayıp ayrıştırmak, biçim değiştiğinde sessizce
eşleşmemeye yol açardı — bu projede iki kez yaşandı.

Hareketlerde `uretimId` zaten yazılıydı; bağ oradan kuruluyor.

**Doğrulama:** `test/birim-fisyaz-gerial.js` 4. blok — 10 iddia. Yalnızca işçilik fişi silinerek
başlanıyor; hammadde stoğa dönüyor, mamul stoktan düşüyor, cari kaydı gidiyor, atama ve adım
teslim alınmamışa dönüyor, atama duruyor.
**EKSİK:** üretim için tarayıcı senaryosu henüz yok (üretim siparişi kur → prosesi ver → teslim al →
Fişler'den sil). Diğer üç yolun senaryosu var; bu yol şimdilik yalnızca birim testiyle kapsanıyor.

### 2d. ÜRETİM FİŞLERİ KİLİTLENDİ (31 Ağustos, v1.46.0)

**Kullanıcı kararı:** üretim çıkışı, işçilik ve mamul girişi fişleri Fişler ekranından ve cari
ekstresinden SİLİNEMEZ. Geri alma tek yoldan yapılır: **üretim kartındaki "Geri Al"**, ve
**sondan geriye doğru**.

**Neden:** üretim prosesleri sıralı ilerler — bir adımın çıktısı sonraki adımın girdisidir. Fişler
ekranından ortadaki bir fişi silmek zinciri ortasından koparır: hammadde stoğa geri döner ama
sonraki proses onu çoktan tüketmiştir. Üretim kartındaki geri alma bu sırayı zaten kontrol ediyor
("sonraki prosesler başlamış — önce onları geri almalısınız"); aynı kontrolü ikinci bir yerde
tekrarlamak yerine ikinci yolu kapattık. **Kural tek yerde kalsın diye kapı, kuralın olmadığı
yoldan geçişi reddediyor.**

**Üç katman:**
1. `fisGeriAl` — üretim kaydına bağlı bir hareket varsa ve `uretimeIzinVer` verilmemişse
   `{ engel: { sebep: "uretim-fisi", uretimNo, proses } }` döner ve HİÇBİR ŞEYİ DEĞİŞTİRMEZ.
   Kilit veri katmanında: yeni bir ekran eklense de delinemez.
2. `removeHareketEverywhere` / `yetimFisTemizle` — engeli görüp kullanıcıya nereden geri alacağını
   söyler; `yetimFisTemizle` ayrıca günlüğe yazar.
3. Ekran — Fişler'de "Sil" düğmesi yerine kilit rozeti ("Üretimden geri alınır"), cari ekstresinde
   fiş grubunun çöp kutusu yerine kilit ikonu. İkisi de sebebi anlatan `title` taşıyor.

**İSTİSNA:** üretim kaydı artık yoksa (fiş kalıntı) kilit uygulanmaz — geri alınacak ilerleme
kalmamıştır, fiş normal şekilde temizlenir.

### 2e. ÜRETİM GERİ ALMASI DA KAPIDAN GEÇİYOR (31 Ağustos, v1.47.0)

`uretimProsesAtamaTeslimGeriAl` artık `fisGeriAl({...}, { uretimHedefi, uretimeIzinVer: true })`
çağırıyor. **151 satır → 86.** Stok/cari/üretim geri alma mantığının son kopyası kalktı.

- **Fiş numarası formülü tek yerde:** `uretimFisAdlari(u, adimIndex, atamaId)` hem geri almanın
  hedefini kurarken hem bir hareketin hangi adıma ait olduğunu bulurken kullanılıyor. Metni
  ayrıştıran hiçbir yer yok — biçim değişirse iki taraf birlikte değişir.
- **Ara proses dalı eridi:** eskiden ayrı bir kod bloğuydu; artık `atamaId: null` demek yeterli.
- **Çağıranda kalanlar:** uygunluk kontrolü (teslim alınmış mı, sonraki adımlar başlamış mı),
  rezervasyon iadesi, yazma ve bildirim.
- **Eski kayıt toleransı:** `uretimId` alanı eklenmeden önce yazılmış hareketlerde kimlik yok.
  Kapı bu yüzden kimlik yoksa fiş numarasını bütün üretimlerde arıyor — aksi halde eski fişler
  hem kilidin hem geri almanın dışında kalırdı.

**Doğrulama:** `test/senaryo-uretim.js` (yeni, tarayıcı). Tohuma teslim alınmış bir üretim kondu
(hammadde çıkışı + işçilik + mamul girişi). Senaryo önce **Fişler ekranında kilidi** doğruluyor
(kilit rozeti var, "Sil" düğmesi yok), sonra üretim kartından geri alıyor. Sonuç: hammadde 7→10,
mamul 9→6, üç fiş de silinmiş, atama ve adım teslim alınmamışa dönmüş, `stogaEklendiMi` kalkmış,
atama personelde duruyor.

> **Altın çıktılar yenilendi:** tohuma üretim verisi eklendiği için `fis`, `siparis` ve `silme`
> senaryolarının çıktıları da değişti (başlangıç stokları farklı). Yenilenmeden önce eski tohumla
> hepsinin geçtiği doğrulanmıştı; bundan sonraki karşılaştırmalar yeni taban üzerinden.

### 2f. CARİ KARTI AÇILIŞ GÖRÜNÜMÜ (31 Ağustos, v1.48.0)

Kart açılınca telefon / vergi no / adres / fotoğraf ve (personelde) barkod + proses paneli
doğrudan çiziliyordu. Bunlar kayıt sırasında giriliyor ve özetleri zaten kart BAŞLIĞINDA görünüyor
(ad · tip · proses · barkod). Kart ise günlük işte **hareketler** için açılıyor; düzenleme alanları
ekranın üçte birini alıp ekstreyi aşağı itiyordu.

Artık üç blok da `Düzenle` düğmesinin arkasında (bakiye satırının sağında). Kapalıyken kart
doğrudan Hareketler/Siparişler sekmelerine açılıyor.

**Doğrulama:** `test/senaryo-cari-kart.js` — açılışta Telefon/Barkod/Proses alanları YOK, Düzenle
düğmesi VAR; düğmeye basınca üçü de geliyor.

### 2g. "SEVK EDİLDİ" NOTU (31 Ağustos, v1.49.0)

Satış fişi geçmişindeki beden rozetleri malın depoya NEREDEN girdiğini söylüyordu
("✓ Üretimden depoya girdi (1001-Temizleme-Giriş)"). Artık NEREYE gittiğini de söylüyor:
"↳ ✓ Sevk edildi (SAT-1001-F1 · 31.08.2026)". İkisi birlikte zinciri tamamlıyor.

Yalnızca SATIŞ tarafında gösteriliyor: alış fişinde hareketin kendisi zaten depoya giriştir,
oraya "sevk edildi" yazmak yanlış olurdu.

### 2h. AMBALAJ UYARISI SEBEBİNİ YAZIYOR (31 Ağustos, v1.50.0)

**Bildirim:** "Kesim için girdim fakat ambalaj gördü." Reçeteye Kesim + Deri + 22 desi girilirken
"Ambalaj malzemesi — renk eşleştirmeye gerek yok" kutusu çıkmış.

**Teşhis:** hata değil, görünmeyen bir kural. Kutu tek bir şeye bakıyor:
`urun.kategori !== "Mamul" && (urun.malzemeTipi || "") === "Ambalaj"` — yani seçilen HAMMADDENİN
Malzeme Tipi alanı. Seçilen prosesle (Kesim/Saya…) hiçbir ilgisi yok. Kodda bu alanı kendiliğinden
"Ambalaj" yapan yer de yok; değer ürün kartından ya da ürün ekleme formundan geliyor
(iki yerde de varsayılan boş = "Genel").

**Düzeltme:** kutu artık sebebini yazıyor — hangi ürünün hangi alanı yüzünden böyle davrandığı ve
nereden değiştirileceği (Stok → ürün → Düzenle → Malzeme Tipi). Kuralın kendisi değişmedi.

### 2i. AMBALAJ KARARI SATIR BAZINDA (31 Ağustos, v1.51.0)

**Kullanıcı:** "Ambalaj olarak başka malzeme de tanımlayacağız, orada ambalajdan çekmesini
istemeyeceğim. Ambalaj değişken ise seçim yapalım."

**Sorun:** karar tümüyle ürünün malzeme tipine bağlıydı. Tipi "Ambalaj" olan HER hammadde, her
reçetede otomatik "rengi siparişte seçilir" davranıyordu. Ama ambalaj tipinde birden çok malzeme
var ve hepsi siparişe bağlı değil: kutu müşteriye göre değişir, koruyucu poşet/kurutucu modelin
sabit parçasıdır.

**Çözüm:** reçete satırına `ambalajDegisken` alanı. Karar artık SATIR bazında:
- **Değişken** — renk siparişte seçilir, üretimde `ambalajRengiUygula` reçetedekinin üzerine yazar.
- **Sabit** — sıradan bir malzeme gibi davranır: renk reçetede seçilir, sipariş değiştirmez,
  renk kapsam denetimine de girer.

Reçete formunda ambalaj tipli hammadde seçilince iki seçenekli bir kutu çıkıyor (varsayılan
"Değişken"). "Sabit" seçilirse normal renk eşleştirme arayüzü açılıyor.

**Tek yer:** `ambalajDegiskenSatirMi(receteSatiri, urun)` — hem renk uygulaması, hem kapsam
denetimi muafiyeti, hem sipariş ekranındaki "kutu" rozeti buradan besleniyor. Eskiden üç yer de
ayrı ayrı `ambalajUrunuMu`ya bakıyordu.

**GERİYE DÖNÜK UYUM:** eski satırlarda alan yok; `undefined` = **değişken** sayılıyor, çünkü bu
alan eklenmeden önce ambalaj tipli her satır zaten öyle davranıyordu. "Sabit" seçilen satıra
açıkça `false` yazılıyor. Veri göçü gerekmedi.

**Doğrulama:** `test/birim-ambalaj.js` — 10 iddia: alan yoksa eski davranış, sabit satırda
reçetedeki rengin korunması, değişkende sipariş renginin uygulanması, ambalaj olmayan malzemenin
hiç etkilenmemesi, kapsam denetiminde sabit satırın muaf OLMAMASI.

### 2j. DEĞİŞKEN AMBALAJDA SEÇENEKLER REÇETEDEN (31 Ağustos, v1.52.0)

**Kullanıcı:** "Reçetede ambalajda değişken istenen stokları seçelim, oradan eşleştirsin."

**Sorun:** sipariş ekranındaki "Kutu rengi" listesi STOKTAKİ BÜTÜN ambalaj renklerini gösteriyordu.
O modelde hiç kullanılmayan kutular da listede çıkıyor, yanlış seçime davetiye oluyordu.

**Çözüm:** reçetedeki değişken ambalaj satırında, siparişte seçilebilecek renkler işaretleniyor
(`ambalajSecenekleri`). Sipariş ekranındaki liste artık seçili MAMULÜN reçetesinden geliyor:
`ambalajRenkSecenekleri(mamul, stok)`.

- Hiçbiri işaretlenmezse o hammaddenin TÜM renkleri geçerli. "Hepsi" durumu satıra YAZILMIYOR —
  yazılsaydı sonradan eklenen bir renk listenin dışında kalırdı.
- Birden çok değişken ambalaj satırı varsa listeler birleşiyor.
- Reçetede hiç değişken ambalaj yoksa sipariş ekranında alan HİÇ ÇIKMIYOR (eskiden boş boş duruyordu).
- Sabit satırlar seçenek üretmiyor: rengi zaten reçetede belli.

**Doğrulama:** `test/birim-ambalaj.js` 15 iddiaya çıktı; son beşi bu davranış (seçenek yazılmamış /
yazılmış / sabit / birden çok satır / reçetesiz mamul).

### 2k. AMBALAJ SEÇİMİ TİP METNİNDEN KURTULDU (31 Ağustos, v1.53.0)

**Bildirim:** "Ambalaj nereden seçeceğiz?" — kullanıcı reçeteye "Kutu" hammaddesini ekliyor ama
değişken/sabit seçim kutusu hiç çıkmıyor.

**Kök sebep — önceki iki sürümde de yazılmıştı ama kapatılmamıştı:** seçim kutusu yalnızca
`malzemeTipi === "Ambalaj"` olan üründe gösteriliyordu. Kullanıcının kutusu "Kutu" tipinde. Yani
bir özelliğin varlığı, kullanıcının bir alana TAM OLARAK doğru kelimeyi yazmasına bağlıydı. Bu
kırılganlık iki kez not edildi ("hâlâ açık"), üçüncüde hataya döndü.

**Çözüm:** soru artık HER reçete satırında soruluyor. Malzeme tipi yalnızca VARSAYILANI belirliyor:
tipi "Ambalaj" olan üründe varsayılan "değişken", diğerlerinde "sabit" geliyor — ikisi de tek
tıkla değişiyor.

- `ambalajDegiskenSatirMi`: satırdaki açık işaret her şeyin önünde. Alan yoksa (eski satır) ürünün
  malzeme tipine bakılır — geriye dönük uyum böyle korunuyor.
- Yeni eklenen her satır işaretini AÇIKÇA yazıyor (true/false). Yokluğu "tipe bak" demek olduğu
  için, açık yazmak satırı kendi kendini anlatır hale getiriyor.
- Ürüne yeni bir alan EKLENMEDİ: `ambalajMi` bayrağı bulut şemasında yeni sütun (SQL) isterdi.
  Karar zaten satırın işi; ürüne alan eklemek gereksizdi.

**Doğrulama:** `test/birim-ambalaj.js` 19 iddia. Yenileri: tipi "Ambalaj" olmayan üründe satır
işaretinin geçerli olması, ambalaj tipli üründe "sabit" işaretinin tipi ezmesi, ve tipsiz bir
kutunun siparişe renk seçeneği üretmesi.

### 2l. AÇILIR LİSTE KIRPILMASI (31 Ağustos, v1.54.0)

**Bildirim:** "ekran tam olmuyor" — reçetede hammadde ararken öneri listesinin yalnızca ilk bir
buçuk satırı görünüyor, gerisi kartın alt kenarında kesiliyordu.

**İki ayrı sebep vardı:**
1. Ürün kartının dış kutusunda `overflow: hidden` — köşeleri yuvarlatmak için konmuştu ama kartın
   İÇİNDEKİ açılır listeyi de kırpıyordu. Kaldırıldı; köşe yuvarlaklığı `borderRadius` ile zaten
   duruyor, kırpma yalnızca köşeye dayanan zeminli çocuklar için gerekliydi, öyle bir çocuk yok.
2. Asıl kırpan: pencerenin KAYDIRMA alanı (`overflow: auto`). O meşru — kaldırılamaz. Çözüm
   listeyi yeniden konumlandırmak.

**Çözüm:** `AramaliUrunSecici` açılırken kutunun altındaki boşluğu ölçüyor (hem kaydırma kabının
hem ekranın alt kenarına göre). Aşağısı darsa ve yukarısı daha genişse liste YUKARI açılıyor;
her iki durumda da yüksekliği kullanılabilir alana göre kısılıyor. Ölçüm yalnızca açılışta
yapılıyor, her karede değil.

**Doğrulama:** `test/senaryo-recete-oneri.js` — listenin tamamının kaydırma kabının içinde kalıp
kalmadığını ölçüyor, hem geniş (950px) hem dar (520px) pencerede. Dar pencere, hatanın görüldüğü
telefon durumunu taklit ediyor.

### 2m. ÇIKIŞ/ALIŞ FİŞİ FORMU SATIR SATIR (31 Ağustos, v1.55.0)

**Kullanıcı:** "Sipariş satış fişinde satır satır satış yaptırsın; toplu olacağı zaman üstten
asortili adet seçip kalem ekle deyip aşağı atsın. Sipariş girme ekranı gibi aynı mantık."

**Sorun:** form, siparişte BEKLEYEN her renk/beden için ekrana bir miktar kutusu koyuyordu.
20 renk/bedenli bir modelde yirmi kutu, çoğu boş kalacak. Ekran doluyor ama iş görünmüyor:
hangi satırların gerçekten çıkılacağı ancak hepsi tek tek okunarak anlaşılıyordu.

**Yeni akış** (sipariş girme ekranıyla aynı):
- Üstte yalnızca **Model + Renk** seçilir, "Kalem Ekle" denir. **KALEM = MODEL + RENK.**
- Eklenen satır o rengin **BÜTÜN bedenlerini** matris olarak listeler ve siparişteki **kalan
  miktarlarla DOLU gelir**. En sık yapılan iş "kalanı çık"; boş matris koyup her bedeni elle
  doldurtmak o işi uzatıyordu.
- Satırın içinde iki yol yan yana: bedenleri **elle düzelt** ya da **asorti uygula**. Aralarında
  kip değişimi yok.
- Satır başlığında toplam ve satırı çıkarma düğmesi; her bedende kalan/elde ve yetersiz/fazla uyarısı.
- "Kalanların tümünü doldur" hem miktarları dolduruyor hem BÜTÜN satırları açıyor — eskiden
  miktar doluyor ama satır ekranda olmadığı için ne çıkacağı görünmüyordu.

**İlk deneme yanlıştı:** beden de üstten seçilip tek tek ekleniyordu. Kullanıcı düzeltti —
sipariş girmedeki mantık renk bazlı, bedenler satırın içinde.

**Ekleme EZMEZ, asorti EZER.** Zaten eklenmiş bir satır tekrar eklenirse girilen miktarlar
korunur. Asorti uygulamak ise satırı o asortiye EŞİTLER: üstüne eklemek, ikinci kez uygulayanı
sessizce iki katına çıkarırdı.

**Altta yatan veri değişmedi:** `teslimMiktarlar` sözlüğü aynı, kaydetme yolu aynı. Değişen
yalnızca o sözlüğün nasıl doldurulduğu. Kanıtı: `senaryo-siparis` çıktısı yeni akışla alındığında
eskisiyle **birebir aynı** (bayt bayt) çıktı.

**Test notu:** beden kutularına `title="Çıkılacak miktar"` verildi. Panelde başka sayı kutuları da
var (kur çevrimi); sırayla seçmek yanlış alanı dolduruyordu — testin ilk koşusunda tam bu oldu ve
girilen miktar kur alanına gitti. Ad vermek hem kullanıcıya ipucu, hem teste sağlam tutamak.

### 2n. FİŞ DÜĞMESİ ÜSTTE, ÇOK SATIRLI FİŞ (31 Ağustos, v1.56.0)

**Kullanıcı:** "Satış fişi oluştur butonunu satış fişinin üzerine al. Aynı fişe 1'den fazla satır
eklemesine izin ver; eklediğimizi altta satır oluştursun, 1 veya 1'den fazla satır oluşturup
kaydet deyince fişi kaydetsin."

- **Düğme fişin ÜSTÜNDE ve kalıcı.** Eskiden düğme ile fiş birbirinin YERİNE geçiyordu (ternary):
  fiş açılınca düğme kayboluyordu, kapatmak için aşağıdaki "Vazgeç"i bulmak gerekiyordu. Şimdi
  düğme yerinde duruyor, fiş altında açılıyor, düğme "…Fişini Kapat"a dönüşüyor.
- **Çok satır zaten çalışıyordu** ama kanıtı yoktu; test yazıldı. Aynı modelin başka rengi de,
  başka bir model de aynı fişe ayrı satır olarak ekleniyor; "İşlemi Kaydet" hepsini TEK fiş
  numarasıyla kaydediyor (fiş no zaten sipariş başına üretiliyor, satır başına değil).

**Doğrulama:** `test/senaryo-cikis-fisi.js` (yeni). İki renkli + iki modelli bir alış siparişinde
üç satır ekleniyor: 1 → 2 → 3. Beden kutusu toplamı 4 (Bot Siyah 40+41, Bot Taba 40, Deri bedensiz).
Düğmenin hem kapalı hem açık durumda görünür olduğu da ölçülüyor.

> **SÜRÜM KAZASI:** v1.55.0 İKİ KEZ farklı içerikle paketlendi — önce beden beden ekleyen sürüm,
> sonra kullanıcının düzeltmesiyle model+renk satırlı sürüm. Aynı numarayla iki farklı dosya
> gönderildi. Davranış değiştiğinde numara MUTLAKA artmalı; yoksa "hangi 1.55.0" sorusu cevapsız kalır.

### 2o. FİŞLERE SAAT (31 Ağustos, v1.57.0)

**Kullanıcı:** "fişlere de saat ekle."

Üç yerde saat eksikti:

1. **Sipariş fişinin cari hareketinde `zaman` hiç yazılmıyordu** (ayrışma 5). O yol
   `addCariHareketFromStok` hunisinden geçmediği için zaman damgası düşüyordu; sonuçta aynı gün
   kesilen iki fişten hangisinin önce olduğu ekstrede anlaşılmıyordu. Artık iki yol da yazıyor.
   **AYRIŞMA 5 KAPANDI.**
2. **Yazdırılan fişte** tarih `toLocaleDateString` ile basılıyordu — saat hiç çıkmıyordu. Artık
   `tarihYaz` kullanılıyor: değerde saat varsa gösteriyor, gün damgasıysa göstermiyor. Böylece
   olmayan bir saat uydurulmuş olmuyor (saat dilimi artığı 03:00 hatasının sebebi buydu).
3. **Basım tarihi** (belgenin ne zaman yazdırıldığı) üç yazdırma ekranında da saatli oldu. Aynı
   gün iki kez basılan bir belgede hangisinin güncel olduğu yalnızca günle anlaşılmıyordu.

Cari hareketi gün bazlı saklanmaya devam ediyor; `zaman` onun yanında duran AYRI bir damga.
Altın çıktı farkı tam olarak bu: sipariş fişinin cari hareketlerine `zaman` alanı eklendi.

### 2p. ÇOK MODELLİ TEK FİŞ — DOĞRULANDI (31 Ağustos)

**Kullanıcının sorusu:** "1 siparişte 3 ayrı model var; 3 modelin 2'si için tek fişte satış yapmak
istiyorum — SAT-1001-F1 içinde 2 model."

Davranış zaten böyleydi ama KANITI yoktu; `test/senaryo-cok-modelli-fis.js` yazıldı:
- İki model "Kalem Ekle" ile ayrı satır olarak ekleniyor (satır sayısı 2, beden kutusu 4).
- Kaydedince İKİSİ DE `SAT-1001-F1` numarasına yazılıyor.
- Üçüncü model fişin dışında kalıyor (`300 Model 40: 0/5`), sipariş "Kısmi Teslim"e geçiyor.
- Sonraki fiş `-F2` numarasını alıyor (bkz. çok fişli teslim).

Fiş numarası SİPARİŞ başına üretiliyor (`${siparisNo}-F${teslimSayaci}`), satır ya da model başına
değil — bir fişte kaç model olduğu fiş numarasını etkilemiyor.

### 2r. "TEK SATIR EKLEYEBİLİYORUM" — SEBEBİ SESSİZ TEKRAR (31 Ağustos, v1.58.0)

Kullanıcı iki tur boyunca aynı fişe birden çok satır ekleyemediğini söyledi; testler ise
eklenebildiğini gösteriyordu. İkisi de doğruydu — eksik olan şuydu:

**Eklendikten sonra model/renk seçimi OLDUĞU GİBİ KALIYORDU.** Düğmeye ikinci kez basmak hiçbir
şey yapmıyordu (o satır zaten ekli, `grupEkle` sessizce aynı anahtarı görüp geçiyordu). Kullanıcı
açısından tablo net: bastım, bir şey olmadı, demek ki tek satır ekleniyor. Testlerde bu görünmedi
çünkü test her seferinde açılır listeden BAŞKA bir model seçiyordu — gerçek kullanımdaki en doğal
hareketi (aynı düğmeye tekrar basmak) hiç denememişti.

**Üç düzeltme:**
1. Ekledikten sonra seçim, henüz EKLENMEMİŞ ilk model/renge kayıyor. Arka arkaya basmak artık işe
   yarıyor: 1 → 2 → 3 satır.
2. Zaten eklenmiş bir model/renk seçiliyken düğme KİLİTLİ ve "Zaten eklendi" yazıyor. Sessiz
   hiçbir şey yapmama yerine durumu söylüyor.
3. Düğmenin yanında sayaç: "Eklenmeyi bekleyen N model/renk var — birden fazlasını aynı fişe
   ekleyebilirsiniz." Hepsi eklenince "Bekleyen bütün model/renkler bu fişe eklendi."

**Ders:** test, işin YAPILABİLDİĞİNİ kanıtladı ama kullanıcının yolunu izlemedi. "Aynı düğmeye
tekrar bas" gibi en tembel hareket, arayüzün sessiz kaldığı yeri bulan hareketti.

### 2s. ONAY PANELİ AÇIKKEN DÜZENLEME (31 Ağustos, v1.59.0)

**Kullanıcı ekran görüntüsüyle sordu: "2. satırı nereden ekleyeceğim?"** Ekranda yeni arayüz
vardı, "Kalem Ekle" düğmesi de duruyordu ve basılabilir durumdaydı — ama altta ONAY PANELİ açıktı
("Şunu onaylıyor musunuz? Aşağıdaki ürünlerin stoğu değişecek" + "Evet, Onayla ve Kaydet").

**Mesele düğmenin yokluğu değil, ekranın verdiği mesajdı.** Onay paneli "iş bitti, sadece onayla"
diyordu; o hâldeyken yukarıda düzenlemeye devam edilebileceği anlaşılmıyordu. Üstelik satır
eklenince paneldeki ÖZET bayatlıyor ama ekranda duruyordu — kullanıcı eski özeti görüp yeni satırı
eklemiş oluyordu.

**Düzeltme:** onay paneli açıkken herhangi bir düzenleme (satır ekle, satır çıkar, miktar değiştir,
asorti uygula) onayı KAPATIP düzenlemeye döndürüyor. Bayat özet ekranda kalmıyor, "hangisi
kaydedilecek" sorusu doğmuyor.

**Doğrulama:** `test/senaryo-onay-duzenleme.js` — satır ekle → İşlemi Kaydet (onay açılır) →
Kalem Ekle: ikinci satır ekleniyor ve onay kendiliğinden kapanıyor.

**Ders (2r'nin devamı):** iki tur boyunca "çalışıyor, testim geçiyor" dedim; test geçiyordu çünkü
test onay panelini açmadan satır ekliyordu. Kullanıcının ekran görüntüsü, sorunun kod yolunda
değil ARAYÜZÜN VERDİĞİ MESAJDA olduğunu gösterdi. Bir sonraki sefere: kullanıcı "göremiyorum"
diyorsa, önce ekran görüntüsü iste — kendi testimin geçmesi onun ekranında işin yürüdüğü anlamına
gelmiyor.

### 2t. FİŞ KALEMLERİ SİPARİŞ GİRİŞİ DÜZENİNDE (31 Ağustos, v1.60.0)

**Kullanıcı:** "Kalemleri ekle deyince siparişte aşağı ekliyorsun, şu anda sadece girmek için
ekliyorsun. Sipariş girişi gibi yapabilirsin."

Eklenen her satır kendi kutusunda, kendi asorti kontrolüyle duruyordu — ekranı uzatıyor ve aynı iş
(kalem listesi) iki ekranda iki farklı biçimde görünüyordu.

**Yeni düzen, sipariş girişinin aynısı:**
- **Tablo**: satır = model+renk, sütun = beden. Beden sütunları eklenen satırların BİRLEŞİMİ;
  bir satırda olmayan beden "—" görünür. Sağda satır toplamı ve satırı çıkarma düğmesi.
- Hücreler düzenlenebilir kalıyor (fiş formunun sipariş girişinden farkı bu: miktar burada belirlenir).
- **Uyarı yalnızca sorun varsa** hücrede yazılıyor ("+3 fazla", "elde 2"); kalan/elde bilgisi
  ipucunda. Her hücreye iki satır bilgi yazmak tabloyu okunmaz hale getiriyordu.
- **Asorti giriş alanına taşındı**: seçili model+renge uygulanır, satır ekli değilse aynı anda
  ekler. Satır başına asorti kutusu tablo düzenini bozardı.
- "Bu dağılımı asorti olarak kaydet" önerisi tablonun altında, seçili model+renk için.

**Test notu:** hücre ipucu artık kalan/elde değerlerini de taşıdığı için (`title="Çıkılacak miktar ·
kalan 6 · elde 7"`) senaryolardaki tam eşleşen seçici kırıldı; `title^=` (ile başlayan) yapıldı.
Dört senaryo bu yüzden düzeltildi — ipucu metnini veri taşıyacak şekilde değiştirirken testlerin
ona bağlı olduğunu hatırla.

### 2u. YAZDIRILAN FİŞTE SATIR BAZLI FİYAT (31 Ağustos, v1.61.0)

**Kullanıcı:** "Satış fişi yazdırmaya satır bazlı birim fiyat ve p. tipi ekle."

`FisYazdir` tablosuna iki sütun eklendi: **Birim Fiyat** ve **Tutar**, her ikisi de satırın kendi
para birimi sembolüyle. Fiş kalem kalem yazıldığı için her hareket kendi `birimFiyat` ve
`paraBirimi` alanını zaten taşıyordu; belgede görünmüyordu.

- Bir satırda (model+renk) bedenler farklı fiyatlanmışsa tek bir sayı yazmak yanlış olurdu:
  "karışık" yazılıyor, satır tutarı yine doğru toplanıyor.
- **Genel toplam para birimine göre AYRI yazılıyor.** Eskiden bütün tutarlar toplanıp sonuna "₺"
  konuyordu; farklı para birimlerindeki kalemler varsa bu, yapılmamış bir kur çevrimini yapılmış
  gibi gösteriyordu.

> **DOĞRULAMA EKSİĞİ:** yazdırma önizlemesi ayrı bir pencerede açılıyor ve test düzeneğinde o
> pencereyi açtıramadım. Bu değişiklik yalnızca derleme + denetimlerle doğrulandı, tarayıcı
> senaryosuyla DEĞİL. Fiş çıktısını gözle kontrol etmek gerekiyor.

### 2v. FİŞ SATIRINDA FİYAT/ADET/TUTAR (31 Ağustos, v1.62.0)

**Kullanıcı (ekran görüntüsüyle):** "Satış fişinde sağda birim fiyat ve toplam adet, toplam tutar
yazması gerekiyor." Ekran ÜRÜN KARTI → Stok Hareketleri'ndeki fiş kartıydı: renk×beden matrisi
vardı ama fişin ne kadarlık bir iş olduğu ancak sayılar toplanarak anlaşılıyordu.

- Fiş başlığının sağında: **birim fiyat · toplam adet · toplam tutar**.
- Çok renkli fişin matrisinde her renk satırı için de: **Toplam · Br. Fiyat · Tutar**.

**Fiyat nereden geliyor:** stok hareketi fiyat TAŞIMAZ (miktar, renk, beden, kaynak). Aynı fiş
numarasına yazılmış CARİ hareketi ise birim fiyatı, para birimini ve tutarı taşıyor. `fisYaz`
ikisini aynı fiş numarasıyla yazdığı için eşleşme kesin. Fiyatı stok hareketine de kopyalamak,
aynı bilgiyi iki yerde tutmak ve ayrışma riski üretmek olurdu.

- Muhasebe defterinde aynı kalem Genel+Resmi olarak iki kez yazılır; tutarı çift saymamak için
  yalnızca Genel alınıyor.
- Cari karşılığı OLMAYAN fişlerde (üretim çıkışı/girişi) fiyat sütunları hiç çıkmıyor — o fişin
  bir tutarı yok, "0 ₺" yazmak yanlış olurdu.
- Bir renkte bedenler farklı fiyatlanmışsa "karışık" yazılıyor, tutar yine doğru toplanıyor.

**Doğrulama:** `test/senaryo-fis-ozet.js` — alış fişi kesiliyor, ürün kartındaki fiş satırında
`br. 120 ₺ · +6 metre · 720 ₺` çıkıyor; üretim fişinde fiyat/tutar hiç yok.

**Test notu:** ekrandaki "01.09.2026 12:30" biçimi her koşuda değişiyor; `normalles` yalnızca ISO
damgalarını sabitliyordu. Senaryo bu biçimi de sabitliyor.

### 2y. CARİ BAKİYESİ PARA BİRİMİ BAZINDA (31 Ağustos, v1.63.0)

**Kullanıcı (ekran görüntüsüyle):** ekstre satırında tutar "2.124,21 €" yazarken kart başlığındaki
bakiye aynı sayıyı **"₺"** sembolüyle gösteriyordu.

**Kök sebep:** `bakiye()` bütün hareketlerin `tutar` alanını toplayıp sonuna sabit "₺" koyuyordu —
hareketin kendi `paraBirimi` alanına hiç bakmadan. İki ayrı hata üretiyordu:
1. Tek para birimi EUR olan caride doğru sayı, YANLIŞ sembol.
2. TRY + USD hareketleri olan caride sayılar TOPLANIYORDU (1000 ₺ + 50 $ = 1050): yapılmamış bir
   kur çevrimini yapılmış gibi gösteren anlamsız bir rakam.

Ekstre satırlarındaki koşan bakiye zaten para birimi bazında hesaplanıyordu; kart başlığı, defter
satırı ve liste özeti ondan ayrışmıştı.

**Düzeltme:** `cariBakiyeleri(cari, defter)` para birimi başına sözlük döndürüyor; `bakiyeMetni`
onu "1.000 ₺ · 50 $" gibi yazıyor; `bakiyeYonu` renk kararını veriyor (hepsi aynı yöndeyse o yön,
karışıksa nötr — uydurma bir toplam üretmeden). Kart başlığı, Genel/Resmi satırı ve listenin
Alacak/Borç özeti bu üçünü kullanıyor. Sıfırlanan para birimleri listeden düşüyor.

**Doğrulama:** `test/senaryo-cari-bakiye.js` — EUR carisinde "2.124,21 €" çıkıyor ve "2.124,21 ₺"
ÇIKMIYOR; karışık caride "1.000 ₺ · 50 $" ayrı yazılıyor, "1.050" hiçbir yerde geçmiyor.

### 2z. GÖRSEL EKLEME: GALERİ VE KAMERA (31 Ağustos, v1.64.0)

**Kullanıcı:** "Galeriden ve fotoğraf çekmeyi ekleyelim stok resimleri için."

Önceden tek yol vardı: fotoğrafı KOPYALAYIP kutuya yapıştırmak. Telefonda bu, Fotoğraflar
uygulamasına gidip resme basılı tutup "Kopyala" demek, sonra uygulamaya dönüp kutuya uzun basıp
"Yapıştır" demek anlamına geliyordu — bir görsel için yedi hareket.

`ColorSwatch`e iki düğme eklendi: **Galeriden** ve **Fotoğraf Çek**. Bileşen tek yerde olduğu için
ürün kapak resmi, renk görselleri ve personel fotoğrafı — hepsi birden kazandı.

**İki AYRI gizli dosya girdisi gerekiyor.** Fark tek öznitelikte: `capture="environment"` olan
girdi telefonda doğrudan kamerayı açar, olmayan galeriyi. Tek girdiyle iki düğme yapılamıyor;
tarayıcı özniteliği tıklama anında değil girdinin kendisinden okuyor. Masaüstünde `capture`
yok sayılır, normal dosya seçici açılır — düğmeyi gizlemeye gerek yok.

**İki tuzak:**
- Girdi her seçimden sonra `value = ""` ile temizleniyor. Aksi halde AYNI fotoğrafı ikinci kez
  seçince `change` olayı tetiklenmiyor ve kullanıcı "bir şey olmadı" sanıyor.
- Hata sessizce yutulmuyor: küçültme başarısız olursa kutuda "Fotoğraf okunamadı" yazıyor.
  Kullanıcı düğmeye bastı, bir cevap hak ediyor.

Fotoğraf `fileToCompressedDataUrl` ile küçültülüyor — ham telefon fotoğrafı 3-8 MB, olduğu gibi
saklamak depo sınırını tek üründe doldururdu.

**Doğrulama:** `test/senaryo-gorsel-secici.js` — iki düğme ve iki girdi (biri `capture` ile) var;
ayrıca galeri girdisine gerçek bir PNG verilip ürünün `kapakResmi` alanına veri URL'si olarak
yazıldığı ve küçüldüğü ölçülüyor. Test görseli `test/test-gorsel.png`.

### 3a. HATALAR OKUNABİLİR OLDU (31 Ağustos, v1.65.0)

**Kullanıcı:** "Hata veriyor ama resmi yüklüyor, hatayı kopyalayamıyorum, kısa gösteriyor ekranda.
Boyut ile alakalı olabilir."

**Asıl sorun hatanın kendisi değil, GÖRÜNMEMESİ.** Kaydetme hataları 2,2 saniyelik bir toast
olarak çıkıyordu: telefonda uzun metin kırpılıyor, kaybolup gidiyor, kopyalanamıyor.
Bildirilemeyen hata, yok sayılmış hatadır — kullanıcı sorunu anlatamıyor, ben de göremiyorum.

- Kaydetme hataları artık **kullanıcı kapatana kadar duran** bir panelde. `white-space: pre-wrap`
  ile satır sonları korunuyor, metin kırpılmıyor.
- **Kopyala** düğmesi: hata metni + sürüm + zaman damgası panoya gidiyor. Pano API'si olmayan
  tarayıcılarda "metni seçip elle kopyalayın" deniyor, sessizce başarısız olmuyor.
- Boyut aşımı mesajı artık şunu da açıkça söylüyor: **"Bu kayıt buluta YAZILAMADI — değişiklik
  yalnızca bu cihazda duruyor, sayfayı yenilerseniz kaybolur."** Kullanıcının gördüğü tam olarak
  buydu: resim ekranda duruyor ama kaydedilmemiş.
- Görsel seçicide küçültme oranı yazıyor ("3,8 MB → 46 KB"), sınıra yaklaşınca sebep anlaşılır olsun.

**~~AÇIK KALAN YAPISAL SORUN~~ — ÇÖZÜLDÜ (6 Eylül, v1.158.0, bkz. 7u).** Görseller artık ürün
başına ayrı yerel anahtarda (`gorsel:<urunId>`); `stok:items` görselsiz yazılıyor.

**Doğrulama:** `test/senaryo-hata-paneli.js` — yazma hatası tetikleniyor; panel açılıyor, sebebi ve
veri boyutunu yazıyor, Kopyala düğmesi var ve toast süresi geçtikten sonra da AÇIK kalıyor.

### 3b. TARAYICI DEPOSU DOLU — GERÇEK SEBEP (31 Ağustos, v1.66.0)

Kullanıcı hata panelini kopyalayıp gönderdi (v1.65.0'ın işe yaradığı ilk yer):

```
Stok kaydedilemedi
Failed to execute 'setItem' on 'Storage': Setting the value of 'atolye:stok:items'
exceeded the quota.
Veri boyutu: 523.7 KB
```

**Teşhis:** kaydın kendi boyutuyla ilgisi YOK. 523 KB, kayıt sınırının (5 MB) yalnızca %10'u.
Dolan şey TARAYICININ TOPLAM deposu: uygulama `window.storage`ı localStorage üzerine kurulu bir
köprüyle kullanıyor ve localStorage'ın toplam sınırı çoğu tarayıcıda ~5 MB. Bütün kayıtlar
(`stok`, `cari`, `siparis`, `uretim`, `cop`…) o 5 MB'ı PAYLAŞIYOR.

**Neden görünmüyordu:** Depolama Durumu paneli her kaydı KENDİ sınırına göre ölçüyordu. Stok
%10 doluysa panel yemyeşil — depo tamamen dolmuşken bile. Kendi sınırına bakan bir ölçü, paylaşılan
bir sınırı hiç göremez.

**İki düzeltme:**
1. `depoKullanimi()` — localStorage'ı anahtar anahtar tarayıp toplam ve kayıt bazında boyut
   döndürüyor (anahtar adı da sayılıyor, o da yer kaplıyor). Artifact ortamında localStorage yok,
   orada `null` dönüp atlanıyor.
2. Kota hatası artık `kotaHatasiMi()` ile ayrı yakalanıyor (Chrome mesajı, Safari `QuotaExceededError`,
   Firefox kodu 1014 — tek metne güvenmek bir tarayıcıda teşhisi kaçırırdı) ve panel şunu yazıyor:
   toplam kullanım, en çok yer kaplayan 6 kayıt, "bu değişiklik KAYDEDİLMEDİ" uyarısı ve ne
   yapılacağı. Depolama Durumu paneline de gerçek tarayıcı doluluğu ve kayıt listesi eklendi
   (%70'ten sonra uyarı şeridi).

**En hızlı yer açma yolu genellikle çöp kutusu** (`cop:data`): silinen kayıtların TAM kopyasını
tutuyor, 300 kayıt sınırı var ama silinen bir ürün görselleriyle birlikte kopyalandığı için tek
kayıt yüzlerce KB olabiliyor.

### 3c. "5 MB" VARSAYIMI YANLIŞTI (31 Ağustos, v1.67.0)

Kullanıcı Depolama Durumu'nu gönderdi: **Stok 523,7 KB · Cari 20,9 KB · Tanımlar 305,2 KB** —
toplam ~850 KB. Yani kota hatası alındığında depoda 5 MB'lık veri YOKTU.

**İki ders:**
1. **"localStorage ~5 MB" bir kural değil, bir varsayım.** Dosyadan açılan sayfalarda (`file://`),
   gizli sekmede ve bazı mobil tarayıcılarda kota çok daha küçük olabiliyor. Uygulama bu sayıyı
   sabit yazıp doluluk yüzdesi hesaplıyordu; hesap yanlış tabana oturunca panel "yemyeşil" derken
   depo doluydu. Artık `navigator.storage.estimate()` ile TARAYICININ KENDİ rakamı okunuyor;
   tarayıcı bildirmiyorsa uydurma bir kota yazılmıyor, "okunamadı" deniyor.
2. **localStorage kotası KARAKTER sayar (UTF-16), bayt değil.** `veriBoyutu` UTF-8 bayt döndürüyor.
   Türkçe karakterler ve base64 görseller yüzünden ikisi belirgin biçimde ayrışıyor. Hata paneli ve
   Depolama Durumu artık ikisini birlikte gösteriyor — "850 KB veri var ama kota doldu" çelişkisi
   ancak böyle çözülüyor.

### 3d. DEPOYU DOLDURAN BU UYGULAMA DEĞİLDİ (31 Ağustos, v1.68.0)

Kullanıcı kayıt bazındaki listeyi gönderdi:

```
Tarayıcı deposu — kayıt bazında (4.92 MB)
Tarayıcı kotası: 0 B / 10240.00 MB · localStorage yükü: 5033.6 bin karakter
  not-defteri:tasks   3.46 MB   ← BU UYGULAMAYA AİT DEĞİL
  yedek:2026-08-31    457.2 KB
  stok:items          350.8 KB
  tanimlar:data       305.2 KB
  yedek:2026-08-30    222.0 KB
  yedek:2026-08-29     93.6 KB
```

**Üç bulgu:**

1. **Deponun %70'ini başka bir uygulama kullanıyor.** `not-defteri:tasks` 3,46 MB. Dosyadan açılan
   sayfalar (`file://`) aynı localStorage'ı PAYLAŞIYOR — telefondaki başka bir HTML uygulaması
   depoyu doldurmuş. Panel ve hata mesajı "ürün görsellerinizi silin" diyordu; bu, sorunu olmayan
   yerde aratan YANLIŞ bir tavsiyeydi. Artık kayıtlar "bu uygulama / başka uygulama" diye
   ayrılıyor, toplamları ayrı gösteriliyor ve yabancı kayıt baskınsa mesaj değişiyor:
   "buradan görsel silmek yer AÇMAZ".

2. **`navigator.storage.estimate()` localStorage'ı KAPSAMIYOR.** "0 B / 10240 MB" döndürdü: depo
   4,92 MB'de tıkalıyken bomboş gösterdi. O ölçüm IndexedDB/Cache içindir. Kaldırıldı; doluluk
   artık saydığımız KARAKTER üzerinden ~5 milyon karakterlik pratik sınıra göre veriliyor
   (5033,6 bin karakter = sınırın tam üstü, hatayla birebir tutuyor).

3. **Kendi yedeklerimiz de suç ortağı: 7 günlük yedek 773 KB.** Yedek tam bir veri kopyası;
   tıkanan bir depoda yedi gün 1,8 MB'a kadar çıkabiliyordu. **3 güne indirildi.** Yedeğin amacı
   "dün ne vardı"yı kurtarmak; bulut yedeği zaten ayrı.

**Ders:** paylaşılan bir kaynakta "benim payım küçük" demek yetmiyor. Panel yalnızca kendi
kayıtlarını ölçtüğü için deponun dolu olduğunu göremedi; kullanıcıya da kendi verisini
suçlayan bir tavsiye verdi. Ölçü, kaynağın TAMAMINI görmeli.

### 3e. DEPO INDEXEDDB'YE TAŞINDI (31 Ağustos, v1.69.0)

**Kullanıcı:** "5 MB uygulama için çok düşük. 1 ay sonra ne yapacağız?" — haklıydı. Önceki üç sürüm
sınırı daha iyi ÖLÇMEYE çalışıyordu; asıl iş sınırı KALDIRMAKtı.

**Kanıt elimizdeydi:** `navigator.storage.estimate()` 10 GB kota bildirmişti. O rakam localStorage
için anlamsızdı ama IndexedDB için gerçek. Yani cihazda yer vardı, biz yanlış depoyu kullanıyorduk.

**Yapılan:** `window.storage` köprüsü localStorage yerine **IndexedDB** üzerine kuruldu. Uygulama
kodunun tek satırı değişmedi — arayüz aynı (`get/set/delete/list`, hepsi asenkron).

- **Köprü artık ayrı bir dosyada** (`depo-koprusu.js`), paketleyicinin içine gömülü bir metin
  değil. Gömülüyken ne okunabiliyor ne test edilebiliyordu; artık tarayıcı testi onu doğrudan sınıyor.
- **Göç otomatik ve DOĞRULANIYOR:** ilk açılışta `atolye:` kayıtları IndexedDB'ye kopyalanır, her
  kayıt GERİ OKUNARAK karşılaştırılır, ancak ondan sonra localStorage'dan silinir. Doğrulanamayan
  kayıt localStorage'da BIRAKILIR — yarım göçte veriyi silmektense iki kopya bırakmak yeğdir.
  Okuma da yereldeki artıklara bakmayı sürdürüyor.
- **Başka uygulamaların kayıtlarına dokunulmuyor** (`atolye:` öneki olmayanlar).
- **Geri düşüş:** IndexedDB açılamazsa (eski tarayıcı, gizli sekme kısıtı) köprü localStorage'a
  döner; uygulama çalışır, yalnızca eski sınırla.
- Silme her iki depodan birden yapılır: yarım göç durumunda silinen kayıt bir sonraki okumada
  geri gelirdi.

**Doğrulama:** `test/senaryo-depo-koprusu.js` — gerçek Chromium'da: eski localStorage kayıtları
taşınıyor, localStorage'daki `atolye:` kayıtları boşalıyor, yabancı kayıt duruyor, IndexedDB'de
kayıtlar görünüyor, yaz/oku/listele/sil çalışıyor ve **8 MB'lık tek bir yazma başarıyla geçiyor**
(eski köprüde kesin kota hatasıydı).

**Yan kazanç:** localStorage boşaldığı için o ~5 MB diğer uygulamalara da açılıyor.

Depolama Durumu paneli de düzeltildi: asıl depo olarak IndexedDB kullanımı/kotası gösteriliyor,
localStorage bölümü "eski depo" olarak kaldı (yabancı kayıtlar orada duruyor).

**AÇIK (artık aciliyeti yok):** görselleri ürün kaydından çıkarıp ayrı kayıtlara taşımak.
`stok:items` 350 KB ve görseller onun çoğu; kayıt küçüldükçe her yazma hızlanır. Ama depo sınırı
artık dayatmıyor.

### 3f. AÇIK KENDİ RENGİNE KAVUŞTU (2 Eylül, v1.70.0)

**Kullanıcı (ekran görüntüsüyle):** hücredeki alt sayıyı sarıyla işaretleyip "burası gerçek
ihtiyacı gösteriyor, anladığım kadarıyla stok + talep. Üstteki satırla renkleri aynı, ona da ayrı
bir renk ekleyelim" dedi.

**İki ayrı eksik vardı:**
1. **İki sayı da kırmızıydı.** Hücrede üstte stok, altta açık duruyor. Stok eksideyken üst üste iki
   kırmızı sayı çıkıyor ve hangisinin ne olduğu ayırt edilemiyordu. "Açık" artık **mor** (#6B3FA0)
   ve küçük bir çip içinde — bu tabloda mor başka hiçbir anlamda kullanılmıyor.
2. **İki sayının ne olduğu hiçbir yerde yazmıyordu.** Kullanıcı alttakinin ne olduğunu kendi
   çözmüştü ve "stok + talep" diye okumuştu — sonuç olarak doğru (satın alınacak miktar) ama
   hesabı değil: açık, talepten stok VE yoldaki alımlar düşüldükten sonra kalan. Tablonun üstüne
   iki satırlık bir açıklama şeridi kondu.

**Renk kavrama bağlandı, yere değil:** "açık/ihtiyaç" nerede geçiyorsa (matris hücresi, grup satırı,
tekil tablonun İHTİYAÇ sütunu, sütun başlığı, alt kırılım, toplam satırı) hepsi aynı mor. Aynı
sayının farklı yerlerde farklı renkte görünmesi, onu iki ayrı şey sanmaya yol açıyordu.

### 3g. ÜRÜN KARTI KAPANINCA GELDİĞİN EKRANA DÖNÜYOR (2 Eylül, v1.71.0)

**Kullanıcı:** "Depoda iken stok üzerine tıklayınca stok açılıyor, kapatınca Stok Yönetimi ekranına
atıyor; kapatınca Depo'da kaldığımız yerden devam etmesi gerekir."

**Mekanizma ZATEN VARDI** (`donusHedefi` + "Geri dön" düğmesi, sipariş ekranından açılan ürünlerde
çalışıyordu). Depo ekranı onu geçmiyordu: `uruneGit(id)` dönüş hedefi olmadan çağrılıyordu.
Bu, "özellik var ama bağlanmamış" durumunun bir örneği daha — yeni bir çağrı yeri eklenirken
mevcut sözleşmenin isteğe bağlı parametresi atlanmış.

Üç çağrı yeri de düzeltildi:
- **Depo** → "Depoya dön"
- **Planlama** → "Planlamaya dön". Burada ayrıca bir hata daha vardı: `onGoToUrun={(urunId) =>
  setTab("stok")}` — ürün kimliği ALINIP KULLANILMIYORDU, kullanıcı tıkladığı ürünü Stok listesinde
  elle aramak zorunda kalıyordu.
- **Ana sayfa** → "Ana sayfaya dön" (aynı kimlik hatası oradaydı).

Sekmeler `display: none` ile duruyor (unmount edilmiyor), bu yüzden dönünce kaydırma konumu ve açık
satırlar kendiliğinden yerinde kalıyor — ek bir iş gerekmedi.

**Doğrulama:** `test/senaryo-geri-donus.js` — Depo'da ürüne tıkla, kart açılıyor ve "Depoya dön"
düğmesi çıkıyor; Kapat'a basınca Depo tablosu geri geliyor.

### 3h. CARİ YÖNÜ — ÜÇÜNCÜ VE DOĞRU HALİ (2 Eylül, v1.72.0)

**Kullanıcı:** "Alış ve satışta bakiye artıyor. Yanlışlık var: alış fişi girdiğimizde cariye
borçlanacağız, satış girdiğimizde alacaklı olmamız lazım."

**Kural artık TEK YERDE** — `hareketYonu(tip)` (`src/200-cari-sabit.jsx`):

| işlem | anlam | yön | bakiye |
|---|---|---|---|
| Satış | müşteri bize borçlanır | `Borç` | **+** |
| Tahsilat | o borcu kapatır | `Alacak` | − |
| Alış | biz tedarikçiye borçlanırız | `Alacak` | **−** |
| Ödeme | o borcu kapatır | `Borç` | + |

Pozitif bakiye = "cari BİZE borçlu", negatif = "biz cariye borçluyuz".

**Bu kural üçüncü denemede oturdu ve sebebi hep aynıydı: tek bir yerden türetilmiyordu.**
1. Başlangıç: fiş yolu Satış→`Alacak` yazıyordu, müşteriye mal satmak bakiyeyi DÜŞÜRÜYORDU.
2. v1.43.0: satış düzeltildi ama alış da `Borç`a çekildi — bu sefer alış ve satış AYNI yöne gitti.
3. v1.72.0: dört tipin dördü de `hareketYonu`dan geliyor; elle hareket formu da dahil.
   (Form eskiden Alış'ı da `Borç` yazıyordu, Ödeme'yi de Tahsilat'la aynı sayıyordu.)

Form artık yönü açık yazıyor: "Bakiye artacak — cari bize borçlanır" / "Bakiye azalacak — biz
cariye borçlanırız". Sadece "artacak/azalacak" demek ne anlama geldiğini söylemiyordu.

**Altın çıktı farkı tam beklenen yerde:** alış hareketleri `Borç`→`Alacak`, satış `Borç` kaldı.

> ### GEÇMİŞ VERİ — KAPANDI (2 Eylül, kullanıcı kararı): DÜZELTİLMEYECEK
> Bu tarihe kadar yazılmış bütün alış hareketleri `Borç` olarak, elle girilmiş Ödeme hareketleri
> `Tahsilat` yönünde kayıtlı — yani eski kayıtların yönü ters. **Düzeltilmeyecek.**
>
> Kullanıcı: *"müdahale etmene gerek yok, hâlâ test yapıyoruz, data doğru değil."* Sistem henüz
> gerçek kullanımda değil; mevcut kayıtlar deneme amaçlı. Bir veri göçü yazmak, atılacak veriyi
> düzeltmek için risk almak olurdu.
>
> **BİR SONRAKİ OTURUM İÇİN:** bu konuyu tekrar açma. Gerçek kullanıma geçilirken doğru hamle göç
> değil, TEMİZ BAŞLANGIÇtır (Tanımlar > Veritabanını Sıfırla). Kullanıcı gerçek veriyle
> başladıktan SONRA yön hatası çıkarsa o zaman göç konuşulur.

### 3i. ANA SAYFADA "SON İŞLEMLER" (2 Eylül, v1.73.0)

**Kullanıcı:** "Tanımlara yaptığımız hareketleri detaylı şekilde ana sayfada olsun — kullanıcı
ödeme girdi, kullanıcı bu kadar fatura kesti vs."

**AYRI GÜNLÜK TABLOSU TUTULMADI, VERİDEN TÜRETİLDİ.** Ayrı bir "işlem günlüğü" her yeni işlem
yolunda "oraya da yaz"ı hatırlamayı gerektirirdi — bu projedeki hataların çoğu tam olarak bu tür
ikili yazımlardan çıktı (fiş = stok + cari, kimlik iki yerde…). Cari hareketleri, stok hareketleri
ve siparişler zaten ne olduğunu ve ne zaman olduğunu taşıyor.

**Eksik olan tek şey "kim" idi** ve o eklendi:
- `ek.kullanici` — `cari_hareketleri` tablosunun `ek` JSON sütununa yazılıyor, **SQL göçü
  gerekmiyor**; okuma tarafı `ek`i zaten kaydın köküne açıyor.
- Kullanıcı adı `addCariHareketFromStok` hunisinde tamamlanıyor — fiş numarası ve zaman damgasıyla
  aynı gerekçe: yeni bir kayıt yolu eklendiğinde kimse eklemeyi unutamasın.
- Eski kayıtlarda alan yok; akışta "—" görünüyor. Uydurma isim yazmak denetim kaydını
  güvenilmez yapardı.

**Panel ne gösteriyor:**
- Zaman · işlem türü (Alış/Satış/Ödeme/Tahsilat/Üretim/sipariş) · cari veya ürün · tutar/miktar ·
  fiş no · kullanıcı. Satıra tıklayınca ilgili kayda gidiyor.
- **Kişi bazında özet:** "Test Kullanıcısı — 3 satış · 2 ödeme" gibi. Kullanıcının sorduğu
  "kim kaç fatura kesti" bu satır.
- Kişi süzgeci (Herkes / kullanıcı rozetleri) ve "daha fazla göster".

**Çift sayım engellendi:** Muhasebe defterinin "Resmi" kopyası (aynı olayın ikinci kaydı) akışa
girmiyor; cari karşılığı OLAN stok hareketleri de girmiyor (yoksa her fiş iki satır olurdu) —
akışa yalnızca cari karşılığı olmayan stok hareketleri (üretim çıkışı/girişi, elle düzeltme) giriyor.

### 3j. BAKİYE RENGİ TEK KURAL (2 Eylül, v1.74.0)

**Kullanıcı:** "Cari içine girmeden görünen bakiyeleri alacak durumuna göre aynı renkte olsun."

**Bulunan:** aynı bakiye iki ekranda iki farklı renkteydi.
- Kart başlığı / liste: pozitif → **yeşil**, negatif → kırmızı.
- Ekstrenin TOPLAM satırı: `netT >= 0 ? "#B85C2E" : "#4E6B4E"` — **kural tersti**, pozitif net
  kırmızı yazılıyordu.
- Üstelik toplam `Math.abs(netT)` basıyordu: işaret siliniyor, yön yalnızca renge kalıyordu.
  Renk de ters olunca bakiyenin yönü ekranda **hiç** görünmüyordu.
- Ekstredeki koşan bakiye sütunu ise hiç renklendirilmemişti.

**Düzeltme:** `bakiyeRengi(deger)` — pozitif yeşil (cari BİZE borçlu), negatif kırmızı (biz
borçluyuz), sıfır nötr. Kart başlığı, Genel/Resmi satırı, koşan bakiye sütunu ve toplam satırı
hepsi buradan besleniyor. Toplam artık işaretini de yazıyor (`+1.500 ₺`).

**Doğrulama:** `test/senaryo-bakiye-renk.js` — hesaplanan RGB değerleri karşılaştırılıyor:
listedeki `+1.500 ₺`, ekstredeki koşan bakiye ve toplam net, üçü de aynı yeşil; borçlu tedarikçi
kırmızı.

### 3k. FİŞ NUMARALARI SIRALI VE TİPE GÖRE (2 Eylül, v1.75.0)

**Kullanıcı:** "`EL-20260902-02ZQYK` gibi girecekğine, tahsilat için `THS-20260902-001`,
`THS-20260902-002` gibi devam etsin."

**İki değişiklik:**
1. **Ön ek işlem tipinden geliyor:** `THS` tahsilat, `ODM` ödeme, `AF` alış, `SF` satış,
   `EL` (tipi bilinmeyen elle kayıt). Eskiden elle girilen HER hareket `EL-` alıyordu; tahsilat
   ile ödeme numaradan ayırt edilemiyordu.
2. **Son blok rastgele değil SIRALI:** `-001`, `-002`… Gün ve ön ek başına ayrı sayaç; sayaç
   mevcut kayıtlardan hesaplanıyor.

**TAKAS AÇIKÇA YAPILDI.** Rastgele blok ("02ZQYK") çakışmayı imkânsıza yakın kılıyordu. Sıra
numarası bu güvenceyi bırakıyor: iki kullanıcı AYNI GÜN, AYNI TİPTE, birbirinden habersiz
(çevrimdışı) kayıt girerse ikisi de aynı sırayı bulabilir. Karşılığında numara okunur ve sayılabilir
oluyor — muhasebenin beklediği bu. Aynı cihazda çakışma yine imkânsız: üretilen numara mevcutlarda
varsa bir sonrakine geçiliyor. Eski rastgele numaralar sayaca karışmıyor (sayı olmadıkları için
yok sayılıyorlar) ama çakışma kontrolüne giriyorlar.

**TEK ÇAĞRI = TEK NUMARA.** Muhasebe defterinde bir işlem Genel+Resmi olarak iki kayıt üretiyor;
numara kayıt başına üretilseydi tek işlem iki ayrı fiş gibi görünürdü. Numara huninin başında bir
kez üretilip ikisine de veriliyor.

Numara üretimi kartlardan alınıp **hunilere** taşındı: sıra hesabı BÜTÜN carilerdeki numaraları
görmeyi gerektiriyor, kart yalnızca kendi carisini görüyordu. Kart artık işlem tipini taşıyor,
numarayı huni koyuyor — fiş numarası/zaman damgası/kullanıcı ile aynı yer.

**Doğrulama:** `test/birim-fisno.js` — 13 iddia: ön ek eşlemesi, 001'den başlama, en büyükten
devam, ön ek ve gün başına ayrı sayaç, eski rastgele numaraların sayacı bozmaması, çakışmada atlama.

### 3l. SON İŞLEMLER AÇILIR MENÜ OLDU (2 Eylül, v1.76.0)

**Kullanıcı:** "Ana ekrandaki son işlemler açılır menü olsun, tıklayınca son 20 hareket açılsın,
aşağıda devamı gibi."

- Panel **kapalı açılıyor**: ana sayfa bir ÖZET ekranı, on iki satırlık akış onu aşağı itiyordu.
- **Kapalıyken bile bir şey söylüyor:** başlıkta kayıt sayısı ve SON işlemin özeti duruyor
  (zaman · tür · cari/ürün). Açmadan da "en son ne oldu" cevaplanıyor — kapalı bir kutunun
  hiçbir bilgi vermemesi, açılır menüyü işe yaramaz kılar.
- Açılınca **20 kayıt**; altında "Devamı (N kayıt daha)" ile 20'şer ekleniyor.
- Kişi süzgeci ve kişi bazlı özet açıldığında görünüyor.

**Doğrulama:** `senaryo-son-islemler.js` genişletildi — kapalıyken listenin GİZLİ ama başlıkta
sayının ve son işlem özetinin GÖRÜNÜR olduğu, tıklayınca listenin açıldığı ölçülüyor.

### 3m. CARİDE ÇEK GİRİŞİ AYRINTILANDI (2 Eylül, v1.77.0)

**Kullanıcı:** "Cari çek girişinde ödeme tipi çek olduğunda banka bilgileri, çek no, çek sahibi mi
cirolu mu, IBAN bilgileri vs. detaylı giriş yapalım."

Eskiden ödeme şekli Çek/Senet seçilince yalnızca **vade tarihi** soruluyordu. Çekin kimden geldiği,
hangi banka, hangi numara — hepsi açıklama satırına elle yazılıyordu. **Çek bir söz değil BELGEDİR:**
karşılıksız çıktığında ya da ciro edildiğinde bunlar olmadan takip edilemez.

Çek/senet seçilince açılan bölüm: **Çek No · Banka · Şube · IBAN/Hesap No · Çekin sahibi
(Kendi / Cirolu) · Keşideci · Not**.

- **Kendi mi cirolu mu** takipte belirleyici: cirolu çek karşılıksız çıkarsa alacak ciro edenden
  değil KEŞİDECİden istenir. Bu yüzden "Cirolu" seçilince keşideci alanının etiketi de değişiyor
  ("Çeki asıl yazan firma/kişi").
- Ayrıntılar **tek alt nesnede** (`cek`) tutuluyor, hareketin kök alanlarına serpiştirilmiyor:
  çek olmayan hareketlerde altı boş alan taşımak ve "bu banka alanı neyin bankası" belirsizliği
  üretmek istemedik.
- Şemada `ek.cek` olarak saklanıyor — **SQL göçü gerekmiyor**, `ek` zaten JSON.
- Nesne yalnızca gerçekten doldurulmuşsa yazılıyor; boş bir `cek` her harekete iliştirilmiyor.
- Ekstre satırında da görünüyor (No · banka · cirolu · keşideci): "hangi çekti" sorusu en çok
  orada soruluyor.

**Doğrulama:** `test/senaryo-cek-girisi.js` — Nakit'ken alanlar YOK; Çek seçilince altı alan da
çıkıyor, girilen bilgiler kayda `cek` nesnesi olarak yazılıyor ve ekstrede görünüyor.

### 3n. ÇEK TEK YERE DÜŞÜYOR (2 Eylül, v1.78.0)

Bir önceki sürümde açık bırakılan boşluk kapatıldı: caride girilen çek artık **Muhasebe > Çekler**
listesine de yazılıyor. Öncesinde aynı çek iki yerde ve birbirinden habersizdi — vadesi gelen çeki
hatırlatan liste, caride girilen çeki hiç görmüyordu.

- Çek kaydı `hareketId` ve `fisNo` ile doğduğu cari hareketine bağlanıyor; listede "· cariden"
  rozetiyle işaretleniyor.
- **Çek listesinin kendi formu da eşitlendi**: banka, şube, IBAN, keşideci, kendi/cirolu alanları
  oraya da eklendi. İki ekranda farklı alan kümesi olması, aynı çekin nereden girildiğine göre
  eksik kalmasına yol açardı.
- Liste satırında banka/şube, keşideci ve **cirolu** rozeti görünüyor: vadesi gelen çeki ararken
  "hangi banka, kim yazmış" bilgisi satırda olmalı.

**YAKALANAN HATA — yön kuralı bu ayrımı yapamaz.** Çekin "Alınan" mı "Verilen" mi olduğunu
`hareketYonu`dan türetmeye çalıştım; testte Tahsilat çeki **"Verilen"** olarak düştü. Sebep:
Satış ve Ödeme AYNI yönde (ikisi de bakiyeyi artırır) ama biri çek alır, diğeri çek verir.
Bakiye yönü ile belge yönü farklı sorular — açık eşleme yazıldı
(`Tahsilat`/`Satış` → Alınan, `Ödeme`/`Alış` → Verilen).

> **AÇIK:** cari hareketi silinince ona bağlı çek kaydı SİLİNMİYOR. `hareketId` bağı kuruldu ama
> `fisGeriAl` çek listesine dokunmuyor — silme kapısının bilmediği dördüncü bir defter daha
> (üretimde aynısı yaşanmıştı, bkz. 2c). Sıradaki iş adayı bu.

### 3o. BANKA OTOMATİK, ŞUBE ÖĞRENİLİYOR (2 Eylül, v1.79.0)

**Kullanıcı:** "Çek için banka ve şubeleri otomatik çekelim, tek tek girmeyelim."

**"Dışarıdan çekmek" bu uygulamada olmaz:** uygulama çevrimdışı da çalışıyor (bulut yalnızca
eşitleme için). Bir servise bağlanan alan, internet yokken boş kalır ve kullanıcı neden
çalışmadığını anlamaz. Bunun yerine iki çözüm:

1. **Banka hazır listeden** (`BANKALAR`, 24 banka) — `datalist` ile, yani listede olmayan banka
   elle de yazılabiliyor. Seçenekleri kilitlemek, listede olmayan bir bankayı imkânsız kılardı.
2. **IBAN yazılınca banka OTOMATİK doluyor.** Türkiye IBAN'ının 5-9. hanesi banka kodudur
   (TR + 2 kontrol + **5 banka** + 1 rezerv + 16 hesap). 5 haneli kod, bankanın 4 haneli EFT
   kodunun başına "0" eklenmiş hâli (Ziraat 0010 → 00010). Gerçek bir "otomatik çekme", üstelik
   internetsiz.
3. **Şubeler ÖĞRENİLİYOR:** Türkiye'de on binlerce şube var; hazır liste hem devasa hem hızla
   eskir. Onun yerine kullanıcının o bankaya daha önce girdiği şubeler öneri olarak çıkıyor —
   ikinci çekten itibaren şube de seçilerek giriliyor. Öneriler BÜTÜN carilerden toplanıyor:
   şube bilgisi cariye değil bankaya ait.

**İki koruma:**
- IBAN'dan gelen banka, alan BOŞSA yazılıyor — kullanıcının seçimi asla ezilmiyor.
- Kod tanınmazsa boş bırakılıyor; yanlış banka yazmaktansa boş bırakmak yeğdir.

Aynı düzen hem cari kartındaki çek girişinde hem Muhasebe > Çekler formunda — iki ekranda farklı
davranış, aynı çekin nereden girildiğine göre eksik kalmasına yol açardı.

**Doğrulama:** `test/birim-banka.js` (12 iddia: tanınan/tanınmayan kodlar, boşluk-küçük harf
toleransı, yabancı IBAN, şube öğrenme, banka filtresi) ve `senaryo-cek-girisi.js` genişletildi —
IBAN yazılıp banka alanının kendiliğinden dolduğu tarayıcıda ölçülüyor.

### 3p. ÇEK DE GERİ ALMA KAPISINA BAĞLANDI (2 Eylül, v1.80.0)

Bir önceki sürümde açıkça bırakılan boşluk kapatıldı: cari hareketi silinince ona bağlı **çek
kaydı da siliniyor**. Ödemesi silinmiş bir çekin vadesi gelince hatırlatılması, kullanıcıyı
olmayan bir alacağın peşine düşürürdü.

- Bağ `hareketId` üzerinden; kimliği olmayan eski kayıtlar için `fisNo` yedek eşleşme.
- Silinen çek çöp kutusuna düşüyor (tip, tutar, vade özetiyle).
- `fisGeriAl` artık BEŞ defteri birden geri alıyor: stok · cari · sipariş · üretim · çek.

**Bu, kullanıcının koyduğu değişmez kuralın ilk uygulaması** (bkz. notun başındaki
"YENİ DEFTER, İKİ KAPIYA BİRDEN BAĞLANIR"). Aynı hata beş kez tekrarlandığı için kural artık
notun en üstünde ve her yeni defter için silme testi zorunlu.

**Doğrulama:** `senaryo-cek-girisi.js` genişletildi — çek girilip hareket silindikten sonra
Çekler listesinin BOŞ olduğu ölçülüyor.

### 3r. BARKOD TEMELİ (2 Eylül, v1.81.0) — SEVKİYAT İŞİNİN 1. ADIMI

**Kullanıcının istediği (tam metin):** "Sevkiyatı barkod ile yapmamız gerekiyor. Koli üzerine
barkod yapıştırmamız lazım. Her çiftin 1 barkodu olacak, bu 37 no için 1 barkod. Koli içinde 8 adet
var ise 8 adet kutu barkodu ve 1 adet koli barkodu olacak. Koli barkodu içerisinde koli içi detay
açılmış olacak ve içindeki ürünleri bilen barkod olacak. Sevkiyatta o barkodu okuttuğumuzda koli içi
kalemleri ekleyecek. Bunu üretim bazlı takip edeceğimiz şekilde olması lazım, ürünün geçmişi."

Bu iş üç parça: **(1) çift barkodu**, (2) koli kaydı + koli barkodu, (3) sevkiyatta okutma.
Bu sürümde **1. parça** yapıldı — diğer ikisi koli kararına bağlı (aşağıda).

**`src/077-barkod.jsx`:**
- **Code128-B üretimi kendi içimizde.** Barkod görselini bir servisten ya da CDN kütüphanesinden
  almak, internet yokken boş etiket basmak demekti. Yazdırılabilir SVG döndürülüyor.
- **Çift barkodu ÜRÜN+RENK+BEDEN başına.** "37 no için 1 barkod" tam olarak bu: aynı modelin bütün
  37'leri aynı kodu taşır. Kutu etiketi "bu nedir" sorusunu cevaplar, "hangi çift" sorusunu değil.
- **Kodlar TÜRETİLMİYOR, ATANIP SAKLANIYOR.** Ürün adından türetilen bir kod, ürün yeniden
  adlandırılınca değişir ve basılmış bütün etiketler bir anda geçersiz olur. Kod bir kez atanıp
  varyantın üstünde duruyor; ikinci atama çağrısı var olan kodlara DOKUNMUYOR.
- Ön ek "8": mağaza içi kullanım aralığı, gerçek EAN'larla karışmaz.

**TESTİN YAKALADIĞI GERÇEK HATA:** Code128'in bitiş karakteri diğerlerinden farklı, 6 değil **7**
elemanlı (2331112). Tabloya 6 hane yazmış, sondaki kapanış çubuğunu unutmuştum. O çubuk olmadan
okuyucuların çoğu barkodu HİÇ okumaz — ekranda hata görünmez, sadece "okutamıyorum" denir.
Ayrıca ilk yazımda Start A ile Start B desenlerini karıştırmıştım. İkisi de birim testiyle çıktı.
`test/birim-barkod.js`: 16 iddia.

> ### KARAR BEKLEYEN — KOLİ NEREDE OLUŞUR?
> 2. parça (koli kaydı) tek bir soruya bağlı: koliler NE ZAMAN paketlenir?
> - **(a) Üretim kartında, mamul girişi sırasında** — `uretimId` orada belli, "üretim bazlı takip"
>   isteğine en doğrudan cevap. Önerilen varsayılan.
> - **(b) Ayrı bir "Paketleme" ekranında** — stoktaki mamullerden koli kurulur; üretimle bağ
>   kullanıcının seçimine kalır.
> - **(c) Satış fişi keserken** — kolileme ile sevkiyat tek adım olur.
>
> **KOLİ YENİ BİR DEFTERDİR** → notun başındaki değişmez kural geçerli: yazma kapısı, `fisGeriAl`,
> çöp kutusu ve SİLME TESTİ ile birlikte gelecek.
>
> **Bir sınır da baştan yazılsın:** çift barkodu ürün+renk+beden başına olduğu için TEK BİR ÇİFTİN
> geçmişi ondan izlenemez (bütün 37'ler aynı kodu taşır). "Ürünün geçmişi" koli barkodundan gelir:
> koli hangi üretimden çıktığını bilir. Çift bazında geçmiş istenirse her çifte ayrı seri numara
> gerekir — bu ayrı ve çok daha büyük bir iş.

### 3s. PAKETLEME MODÜLÜ (2 Eylül, v1.82.0) — SEVKİYAT İŞİNİN 2. ADIMI

**Kullanıcı (b) seçeneğini seçti:** "Müşteri koli bazında sipariş veriyor, koli içi genelde
asortili. Bazen kırık asorti veriyor, koli içine başka stok da koyabiliyoruz — aynı kolide x ve y
ürünü olabilir. En mantıklısı b: ürün paketlemede koli içi oluşturup ona göre kutu ve koli barkodu."

Ayrı ekran doğru seçimdi: koliyi üretim kartında kurmak tek üretimin mamulleriyle sınırlardı,
satış fişinde kurmak kolilemeyi sevkiyat anına sıkıştırırdı.

**`src/315-paketleme.jsx` + `koli:data` defteri:**
- Koli kur: sipariş (opsiyonel, seçilince cari kendiliğinden gelir), müşteri, **üretim** (ürünün
  geçmişi buradan izlenecek), not.
- İçerik: ürün+renk seç → **asorti uygula** ya da beden kutularını elle doldur. İkisi aynı ekranda,
  kip değişimi yok. **Farklı ürünler aynı koliye girebiliyor** (kullanıcının özellikle belirttiği durum).
- Koli kodu sıralı: `K-20260902-001` — fiş numaralarıyla aynı gerekçe, barkod okunmadığında gözle
  okunup elle aranabilmeli.
- **Koli etiketi**: koli barkodu + içindekiler tablosu (ürün, renk, beden, adet, çift barkodu).
- **Kutu etiketleri**: her çift için bir etiket, adet kadar. "8 adet varsa 8 kutu barkodu" — aynı
  beden 3 çiftse o barkod 3 kez basılıyor.
- Barkodsuz varyant varsa ETİKET BASMADAN ÖNCE uyarı + tek düğmeyle toplu kod atama.

**Barkodun kendisi veri taşımıyor.** "Koli barkodu içinde detay açılmış olacak" isteği şöyle
karşılanıyor: barkod yalnızca koli kodunu taşır (içerik listesi Code128'e sığmaz, sığsa da
okunmaz bir devasa barkod olurdu); içerik kayıtta durur ve okutulunca kayıttan açılır. Etikette
ayrıca gözle okunacak şekilde de basılıyor.

**TESTİN YAKALADIĞI GERÇEK KULLANIM HATASI:** beden kutuları önce `onBlur` ile listeye ekliyordu.
Adedi yazıp doğrudan "Koliyi Kaydet"e basınca **ilk tıklama kayboluyordu** — tıklama önce odağı
taşıyor, `onBlur` çalışıyor, React yeniden çiziyor ve düğme yenilendiği için tıklama tamamlanmıyor.
Kullanıcı iki kez basmak zorunda kalırdı. Girişler doğrudan state'te tutulacak şekilde
değiştirildi; koli içeriği artık girişlerden TÜRETİLİYOR, ayrı liste tutulmuyor.

**Değişmez kural uygulandı:** koli yazma + silme + çöp kutusu + **silme testi** birlikte geldi.
Sevk edilmiş koli silinemiyor (karşılığı bir fiş var; onu geri almak fişin işi).

> **SIRADAKİ — 3. ADIM:** sevkiyatta koli barkodunu okutup kalemleri fişe ekleme ve `fisGeriAl`
> bağı (fiş geri alınınca koli "Hazır"a dönmeli). Koli defterinin kapıya bağlanması bu adımda
> tamamlanacak.

### 3t. KOLİ BARKODUYLA SEVKİYAT (2 Eylül, v1.83.0) — BARKOD İŞİ TAMAM

Üç adımlı işin sonuncusu: **"Sevkiyatta o barkodu okuttuğumuzda koli içi kalemleri ekleyecek."**

- Satış siparişinin çıkış fişinde **koli barkodu okutma** alanı. Barkod okuyucular okumayı Enter
  ile bitirdiği için Enter da düğme de aynı işi çağırıyor.
- Okutulunca koli içindeki kalemler siparişin BEKLEYEN kalemleriyle eşleştirilip miktar kutularına
  dağılıyor; satırlar da kendiliğinden açılıyor.
- **Eşleşmeyen kalem sessizce yutulmuyor:** hangi ürünün bu siparişte olmadığı yazılıyor. Koli
  yanlış siparişe okutulduğunda kullanıcı bunu ancak böyle fark eder.
- Zaten okutulmuş ya da sevk edilmiş koli reddediliyor (hangi fişle çıktığı söylenerek).
- **Koli çıkarılınca eklediği miktarlar da geri alınıyor.** Yalnızca rozeti silmek, miktarları
  koli okutulmuş gibi bırakır ve fiş fazla çıkardı.
- Geri bildirim kartın İÇİNDE: kart bir pencerede açılıyor, ekran köşesindeki toast barkod okutan
  kişinin baktığı yerde değil.

**Kaydedince** koli "Sevk edildi"ye geçiyor ve `sevkFisNo` ile hangi fişle çıktığını saklıyor.
**Fiş geri alınınca** koli yeniden "Hazır" oluyor ve `sevkFisNo` temizleniyor — kalan bir numara,
koliyi ileride yanlış bir fişe bağlı gösterirdi.

`fisGeriAl` artık **ALTI defteri** birden geri alıyor: stok · cari · sipariş · üretim · çek · koli.

**Doğrulama:** `test/senaryo-sevkiyat.js` — barkod okutuluyor (miktarlar 3 ve 5 olarak doluyor),
fiş kesiliyor (koli "Sevk edildi", fiş no yazılı), fiş siliniyor (koli "Hazır", fiş no temiz).
Değişmez kuralın gerektirdiği silme testi bu.

### 3u. ETİKETLER BARKOD YAZICISINA GÖRE (2 Eylül, v1.84.0)

**Kullanıcı:** "Kutu barkodu barkod yazıcıdan basılacağı için koli içi adet kadar barkod basmalı,
tek sayfaya değil — koli 8 çift ise 8 sayfa. Kutu etiketi 6×4 cm, koli 15×10 cm."

**`etiketYazdir` — fiş yazdırmadan AYRI bir yol.** Fiş rulo kâğıda sürekli akar (`size: 80mm auto`
yeter); etiket ise SABİT boyutlu ve yazıcı her etiketi ayrı besler. Bu yüzden:
- `@page` hem genişlik hem **yükseklik** alıyor: kutu `60mm 40mm`, koli `150mm 100mm`.
- Her etiket kendi **sayfasında**: 6 çift → 6 sayfa. Alt alta dizmek barkod yazıcısında etiketlerin
  kayarak yarım basılmasına yol açıyordu.
- **Son etikette sayfa sonu YOK** — yazıcıya fazladan bir boş etiket besletirdi.
- Kenar boşluğu 0: etiket zaten tam boyutunda kesilmiş, ayrıca boşluk içeriği kaydırıyor.
- Barkod SVG'si `max-width: 100%` ile sınırlı: taşan bir barkod kesilir ve OKUNMAZ hale gelir.

Düğmeler ne basacağını söylüyor: "Kutu Etiketleri (6 sayfa · 6×4)", "Koli Etiketi (15×10)".

**Doğrulama:** yazdırma iletişim kutusu otomasyonla açılamıyor; onun yerine yazdırma çerçevesinin
İÇERİĞİ ölçülüyor — üretilen sayfa sayısı, `@page` boyutu, barkod sayısı ve son etikette sayfa
sonunun olmaması. 6 çiftlik koli için: 6 sayfa, `60mm 40mm`, 6 barkod. Koli etiketi: 1 sayfa,
`150mm 100mm`, 3 içerik satırı.

> Gerçek yazıcıda bir kez denenmeli: ölçüler ve sayfa sonları doğrulandı ama etiket kâğıdının
> kalibrasyonu (boşluk/gap ayarı) yazıcı tarafında.

### 3v. KOLİ MATRİSİ VE ETİKET İÇERİĞİ (2 Eylül, v1.85.0)

**Kullanıcı:** "Koli dağılımı matris uygula, koliye müşteri adı ve sipariş no ekle, koli ve kutuda
stok ve renk daha belirgin olsun, koli ve kutuya resim de ekle."

- **Matris (`koliMatrisi`)**: satır = ürün+renk, sütun = beden. Düz liste ("Bot Siyah 40 × 3,
  Bot Siyah 41 × 2…") koli büyüdükçe okunmaz oluyordu ve asorti dağılımı ancak satırları gözle
  toplayınca görülüyordu. Uygulamanın her yerinde renk × beden matrisi var; koli de aynı dili
  konuşuyor. Hem Paketleme listesinde hem koli etiketinde aynı matris.
- **Koli etiketinde müşteri adı EN ÜSTTE ve büyük**, altında sipariş no ve toplam çift. Koli
  sevkiyata çıkarken ilk bakılan bilgi bu.
- **Kutu etiketinde ürün, renk ve beden belirgin**: beden 20px, ürün/renk 12-13px kalın. Etiket
  rafta metrelerce uzaktan okunuyor — barkod okuyucunun işi ayrı, gözün işi ayrı.
- **Görsel her iki etikette de.** Görsel önce RENGE ait olan (`renkResimleri[renk]`), yoksa ürün
  kapağı: aynı modelin siyahı ile bejini yazıya bakmadan ayırt ettiren şey bu.

**Doğrulama:** `senaryo-paketleme.js` genişletildi — koli etiketinde müşteri adının yazıldığı,
beden sütunlarının matris olarak çıktığı ve görselin girdiği; kutu etiketlerinde 6 sayfanın
her birinde görsel olduğu ölçülüyor. Görsel için tohuma 1×1 PNG kondu: sınanan şey görselin
etikete GİRMESİ, nasıl göründüğü değil.

### 3y. PAKETLEME PERSONEL EKRANI OLDU (2 Eylül, v1.86.0)

**Kullanıcı:** "Paketlemede siparişin içeriğini çeksin, siparişte olmayan stok ve renklerini
göstermesin. Sipariş no girip siparişin içindeki stoklar çıksın. Üretim no okutup direkt onun
bilgileriyle ürün gelsin, birkaç yoldan ulaşılabilir olsun. Bu ekranı personel kullanacak, az veri
ile önüne çıksın. Hatta üretilmiş ürünleri de listeleyip hazır olanlara barkod basabilir."

**Ekran artık KAYNAK ODAKLI.** Önce bütün mamul listesi açılıyordu; personel aradığı iki satırı
onlarca ürün arasında buluyordu. Şimdi kaynak seçilmeden ürün listesi HİÇ açılmıyor.

**Üç yol, tek sonuç:**
1. **Okutma kutusu** — sipariş no da üretim no da AYNI kutuya yazılıyor. Personelin hangi
   numaranın nereye yazılacağını bilmesi gerekmiyor; ikisi de orada aranıyor.
2. Sipariş açılır listesi (seçilince müşteri kendiliğinden geliyor).
3. Üretim açılır listesi.

Kaynak seçilince içerik doğrudan dökülüyor: her ürün+renk bir satır, bedenler yan yana, üstünde
görsel ve renk adı. Her bedenin yanında **kalan** yazıyor (`38 /2`), satır başında **"Kalanı doldur"**
düğmesi var — en sık yapılan iş tek tıkla bitiyor.

- **Sipariş kaynağında karşılanmış kalemler listeye girmiyor:** paketlenecek olan kalandır.
- İki kaynak birden seçili kalamıyor; hangisinin içeriği gösterildiği belirsiz olurdu.
- Kaynaksız çalışmak isteyen için **"serbest paketleme"** bağlantısı duruyor — istisna, varsayılan değil.

**Paketlemeyi bekleyen üretimler** listesi eklendi (stoğa eklenmiş üretimler): her satırda görsel,
üretim no, ürün, renk, adet ve iki düğme — **doğrudan kutu etiketleri** ya da **bu üretimden koli
kur**. Personel çoğu zaman önce etiketleri basıp kutulara yapıştırıyor, koliyi sonra kuruyor;
iki yol da açık.

**Doğrulama:** `senaryo-paketleme.js` — kaynak seçilmeden ürün kutusu YOK ve yönlendirme yazısı var;
sipariş no okutulunca yalnızca o siparişteki ürün çıkıyor (`125 Model` var, stoktaki `SS Model`
YOK) ve tam iki beden kutusu geliyor; "Kalanı doldur" ile koli kuruluyor.

### 3z. KOLİ SINIR DENETİMİ + KOLİ TABLOSU (3 Eylül, v1.87.0)

**Kullanıcı (ekran görüntüsüyle):** "Kontrol koymak lazım, aynı koliden 3 adet yaptı ve yukarıdan
gitmedi, sınırsız koli yapıyor." Ekranda 8 çiftlik bir siparişe karşılık **üç ayrı 8'lik koli**
(K-…-001/002/003) duruyordu — toplam 24 çift.

**Kök sebep:** "kalan" hesabı yalnızca `karsilanan`a bakıyordu. `karsilanan` FİŞ kesilince artıyor,
koli kurulunca değil. Yani kurulmuş ama henüz sevk edilmemiş koliler **görünmez bir taahhüttü**;
ekran her seferinde siparişin tamamını kalan gibi gösteriyordu.

**Düzeltme — iki katman:**
1. **Hesap:** kalan = `miktar − karsilanan − hazır kolilerdeki adet`. Sevk edilmiş koliler
   sayılmıyor; onların adedi zaten `karsilanan`a yansıdı, iki kez saymak kalanı olduğundan az
   gösterirdi. Kalanı biten beden listeye HİÇ girmiyor.
2. **Kapı:** kaydetmede sipariş aşılıyorsa koli REDDEDİLİYOR ve hangi bedende ne kadar fazla
   olduğu tek tek yazılıyor. Uyarı yetmezdi: fazla koli kurulup etiketleri basıldıktan sonra fark
   edilirse iş çoktan yapılmış olur.

Ayrıca sipariş getirilirken kalan yoksa açıkça söyleniyor ("paketlenecek kalem kalmadı — hepsi
kolilenmiş ya da sevk edilmiş"); boş bir liste "veri gelmedi" gibi de okunabilirdi.

**İKİNCİ HATA — "Buluta yazılamadı: koliler".** Ekran görüntüsünün üstünde duruyordu. Koli defterini
eklerken bulut tablosunu unutmuşum: `koliler` tablosu Supabase'de yok, yazma başarısız oluyor.
**Veri kaybolmuyor** (yerel kopya yazılıyor) ama diğer cihazlara geçmiyor.
`koli.sql` eklendi — Supabase > SQL Editor'de bir kez çalıştırılmalı.

> **DEĞİŞMEZ KURALA EK MADDE:** yeni defter eklenirken **bulut tablosu da** kurulmalı. Kural şimdiye
> kadar yazma/geri alma/çöp/test diyordu; "buluta yazılabiliyor mu" adımı eksikti ve ilk uygulamada
> tam oradan sızdı. Denetleyiciler bunu göremiyor çünkü hata çalışma anında, ağ tarafında oluşuyor.

**Doğrulama:** `senaryo-paketleme.js` — ilk koli siparişin tamamını aldıktan sonra ikinci koli
kurulmak istendiğinde kalan kutu sayısı 0 ve "paketlenecek kalem kalmadı" yazısı çıkıyor.

### 4a. KOLİLER BULUTTAN DA OKUNUYOR (3 Eylül, v1.88.0)

Kullanıcı `koli.sql`'i çalıştırdı ("Success. No rows returned" — DDL'de beklenen cevap). Tablo
kurulunca yazma düzeldi; ama bu sırada **ikinci bir eksik** çıktı: koliler buluta YAZILIYOR ama
buluttan HİÇ OKUNMUYORDU. Açılışta yalnızca yerel kopyadan okunuyordu.

Sonuç: ikinci bilgisayarda koli listesi BOŞ görünürdü. Paketlemeyi yapan personel kendi kurduğu
koliyi sevkiyat bilgisayarında bulamaz, koli barkodunu okuttuğunda "koli bulunamadı" alırdı —
üstelik veri bulutta duruyor olmasına rağmen.

Muhasebe için zaten kurulmuş olan desen kolilere de uygulandı: **buluttan oku, bulut erişilemezse
yerel kopyaya düş.** Tek yönlü eşitleme (yaz ama okuma) sessiz bir veri kaybı gibi görünüyor;
oysa veri duruyor, yalnızca hiç istenmiyor.

> **DEĞİŞMEZ KURALIN BULUT MADDESİ GENİŞLETİLDİ:** yeni defter eklenirken tablo kurmak yetmiyor,
> **okuma yolu da** bağlanmalı. Yazma yolu ilk denemede fark ediliyor (uyarı çıkıyor); okuma yolu
> ancak İKİNCİ bir cihazda fark ediliyor — yani sahada, kullanıcı zor durumdayken.

### 4b. BARKODLA ATÖLYE (3 Eylül, v1.89.0)

**Kullanıcı:** "Her personelin kendi barkodu var. Barkod okutup kendi alabileceği ve teslim
edebileceği ürünleri görüyor… Üretim barkodunu ilk okutma iş alma, ikinci okutma teslim etme.
Hiçbir tuşa basmadan sadece barkod okutarak. İnce ayrıntı: 32 çift olarak gelen ürün 12 çift başka
kalfaya, 20 çift başka kalfaya gidebilir; geçmişten gelen barkodun yanına -1, -2 gibi hangi
üretimin parçası olduğu bilinen yeni kod türetsin."

**`src/285-barkod-atolye.jsx` — TEK KUTU, İKİ AŞAMA.** Ekranda tek bir okutma kutusu var, odak hep
onda (okuyucu klavye gibi yazıyor; odak başka yerdeyse okutma hiçbir işe yaramaz ve kullanıcı
sebebini anlamaz). Ne okutulduğuna göre ne yapılacağına UYGULAMA karar veriyor:
- personel barkodu → o kişinin ekranı
- parça/üretim kodu → **alınmamışsa alınır, alınmışsa teslim edilir**

Ekranda iki liste: **elimdeki işler** (teslim edilecekler) ve **alabileceğim işler** (bağlı
proseslerinde sırası gelmiş, dağıtılmamış miktarı olanlar). Bağlı proses tanımsızsa hiçbir iş
gösterilmiyor — herkesin her işi alabilmesi, kimin ne yaptığını izlenemez hale getirirdi.

**PARÇALANMA.** Her atama kendi barkodunu alıyor, kod ana koddan türüyor: `1001-1`, `1001-2`.
Etikete bakan biri hangi üretimin parçası olduğunu okuyabiliyor. Kod ATAMAYA YAZILIP SAKLANIYOR,
sırasından türetilmiyor: bir atama silinirse sıradaki parçanın kodu kayar ve basılmış etiket başka
bir işi gösterirdi (varyant barkodlarındaki kararın aynısı).

**Bölme, miktar girmeden oluyor:** okutma kalan işin TAMAMINI alıyor. 32 çiftin 12'sini alan kalfa
kalanı okutmadan bırakıyor, ikinci kalfa okuttuğunda geri kalan 20'yi alıyor. "Hiçbir tuşa
basmadan" isteği ancak böyle karşılanıyor — miktar sorulsaydı ekranda klavye gerekirdi.

**Sıra korunuyor:** iş yalnızca sırası gelmiş adımda verilebiliyor (öncekiler bitmiş olmalı).
Başkasının parçasını teslim etmek reddediliyor; kimin ne yaptığı kaydın kendisi.

**Bulut:** `atolye-barkod.sql` — `uretim_atamalari` tablosuna `barkod` sütunu ve tekillik indeksi.
Sütun yoksa yerel çalışır ama ikinci bilgisayarda parça barkodları kaybolur ve okutma
"tanınmayan barkod" der. (Değişmez kuralın bulut maddesi: yazma + okuma yolu. Okuma tarafı
`kayitaCevir` sayesinde kendiliğinden çalışıyor.)

**Doğrulama:** `test/birim-atolye-barkod.js` — 15 iddia: kod türetme (silinen kodun tekrar
kullanılmaması dahil), barkod çözme (personel/parça/ana/bilinmeyen), sıradaki adım, dağıtılmamış
miktar hesabı (parçalanma).

### 4c. TESLİM SESSİZCE ÇALIŞMIYORDU (3 Eylül, v1.90.0)

**Kullanıcı:** "Barkod sadece alma işlemi yapıyor, teslim etmeyi göremedim."

**Sebep:** `teslimEt`, teslim alma fonksiyonuna yanlış biçimde veri gönderiyordu —
`{ bedenMiktarlari, hurda, tamir }` yollanmıştı, oysa beklenen `{ saglam, tamir, hurda }`.
Fonksiyon sağlam haritasını boş buluyor, toplamı sıfır çıkıyor ve `if (sonucToplam <= 0) return;`
ile **sessizce dönüyordu**. Ekranda hiçbir şey olmuyor, hata da görünmüyordu.

**İki ders:**
1. **Sessiz dönüş, yanlış biçimden pahalıya mal oldu.** `sonucToplam <= 0` durumu "yapacak bir şey
   yok" diye yorumlanıp geçiliyor; oysa çağıran taraf bir hata yapmış olabilir. Bu tür erken
   dönüşler, hatayı çağıranın göremediği yere saklıyor.
2. **Bir önceki sürümde bu ekranın tarayıcı senaryosu YOKTU** ve notta "eksik" diye yazılmıştı.
   Hata tam oradan sızdı; kullanıcı ilk denemede buldu. Birim testleri kod türetmeyi ve barkod
   çözmeyi doğruluyordu ama iki bileşen arasındaki SÖZLEŞMEYİ hiçbir şey doğrulamıyordu.

**`test/senaryo-barkod-atolye.js`** yazıldı: personel okut → iş al → tekrar okut → teslim.
Ölçülenler: giriş sonrası listeler (alabileceğim 1, elimdeki 0), alma sonrası parça barkodu
(`2001-1`) ve miktar (32), teslim sonrası atamanın `tamamlandiMi` olması ve adımın kapanması.

### 4d. BARKOD OKUTMA TEK EKRANDA (3 Eylül, v1.91.0)

**Kullanıcı:** "Barkod okutma tek ekrandan gerçekleşsin."

İki ayrı barkod ekranı vardı: **Barkod Okut** (usta iş dağıtıyor) ve **Barkodla Atölye** (kalfa işi
kendi alıyor/teslim ediyor). İkisi de personel barkodu okutup iş listesi gösteriyordu; hangisinin
ne yaptığı ancak açınca anlaşılıyordu ve elinde okuyucu olan kişi yanlış ekranda "neden
çalışmıyor" diye kalıyordu. Eski ekran (`BarkodOkutmaEkrani`, 203 satır) **silindi** — kullanılmayan
bir bileşen bırakmak ileride "hangisi geçerli" sorusunu doğururdu.

**BİRLEŞTİRİRKEN ÇIKAN GERÇEK TASARIM HATASI.** Kalan tek ekran, okutmada kalanın TAMAMINI
alıyordu. Bu, kullanıcının özellikle vurguladığı bölünmeyi (32 çift → 12 + 20) İMKÂNSIZ kılıyordu:
ilk kalfa 32'yi alıyor, ikinciye hiçbir şey kalmıyordu. Kod yorumunda "bölmek isteyen kalanı
okutmadan bırakır" yazıyordu ama bu doğru değildi — okutma zaten hepsini alıyordu.

**Çözüm:** okutma kutusunun yanında **miktar kutusu**. Boş = kalanın tamamı (en sık yapılan iş);
sayı yazılırsa o kadarı alınır ve ekranda "20 çift başkasına kaldı" yazar. Sayı yazmak tek hareket,
gezinme gerektirmiyor. Kısmi alımda istenen adet bedenlere SIRAYLA dağıtılıyor; oransal bölmek
küsurat üretirdi (12 çiftin 3 bedene bölünmesi 4,33) ve atölyede çift bölünmez.

**Doğrulama:** `senaryo-barkod-atolye.js` uçtan uca dört adım:
1. Personel barkodu → giriş (alabileceğim 1, elimdeki 0)
2. Miktar 12 → okut → `2001-1` parçası, 12 çift, "20 çift başkasına kaldı", iş hâlâ alınabilir
3. Tekrar okut → **teslim** (kullanıcının kuralı: ilk okutma alma, ikinci okutma teslim)
4. Tekrar okut → kalan 20, `2001-2` parçası; adım kapanmıyor

### 4e. BARKOD EKRANI YERLEŞİMİ (3 Eylül, v1.92.0)

**Kullanıcı:** "Barkod ekranında solda alabileceği işler, sağda elinde olan işler, altta o oturumda
teslim ettiği işler toplansın."

- **Solda alabileceği, sağda elindeki.** Önce tersiydi. İş soldan sağa akıyor: alınacak → elde →
  teslim. Ekran da o sırayı izliyor.
- **Altta bu oturumda teslim edilenler**, saat · parça barkodu · ürün/renk · proses · adet olarak
  ve üstte **toplam** (`24 çift · 2 parça`). Üstteki iki sütun "ne yapacağım", alttaki "ne yaptım".
  Kalfa gün sonunda ustaya bunu gösteriyor; ekrandan çıkmadan görülebilmeli.
- **Oturum = personel girişinden çıkışına.** Başka biri barkodunu okuttuğunda liste sıfırlanıyor;
  aksi halde bir sonraki kişi öncekinin işini kendi işi sanırdı.

Veri üretim kaydında zaten var; buradaki liste onun kopyası değil, oturum boyunca biriken bir
ekran durumu. Üretim kaydından okumak kalfanın yapamayacağı bir gezinme gerektirirdi.

**Doğrulama:** `senaryo-barkod-atolye.js` — metin akışında "Alabileceğim işler"in "Elimdeki
işler"den ÖNCE, oturum özetinin ikisinden de SONRA geldiği ve toplamın doğru yazıldığı ölçülüyor.

### 4f. SİLİNEN NUMARA BİR DAHA VERİLMİYOR (3 Eylül, v1.93.0)

**Kullanıcı:** "Üretimden fiş sildiğinde o üretim no başka üretim fişine verilmesin."

Aynı kökten **iki** hata vardı; ikisi de "numarayı o anki listeden hesaplama" alışkanlığından:

**1. Üretim numarası.** `uretimNo`, mevcut üretimlerin en büyüğü + 1 olarak üretiliyordu. Bir üretim
silinince en büyük düşüyor ve bir sonraki üretim **silinenin numarasını** alıyordu. O numaraya bağlı
eski fişler, etiketler ve parça barkodları ("1001-1") yeni üretime aitmiş gibi görünüyordu.
Artık silinenler de sayılıyor: numara çöp kutusundaki TAM KOPYADAN okunuyor (`enBuyukUretimNo`).
Bir numara bir kez kullanıldıysa bir daha verilmiyor.
*(Çöp boşaltılırsa numara yeniden serbest kalır — çöpü boşaltmanın bilinen bedeli.)*

**2. Fiş numarasının atama eki.** `1001-Kesim-2`'deki "2", atamanın o anki KONUMUNDAN geliyordu.
Bir atama silinince sonrakiler kayıyor ve **eski fiş numarası bambaşka bir atamayı gösteriyordu**.
Artık ek, atamaya bir kez yazılıp saklanan **parça barkodundan** (`1001-2`) türüyor; silmeden
etkilenmiyor. Barkodu olmayan eski atamalarda konuma düşülüyor — onlar için başka dayanak yok.
Kural `uretimAtamaEki`de tek yerde; üç çağrı yeri de oradan besleniyor (eskiden üçü ayrı ayrı
`sıra + 1` hesaplıyordu).

**Genel ders — nota yazıldı:** kalıcı bir numara, O ANKİ listeden hesaplanmaz. Liste değişkendir;
numara kalıcı olmalıdır. Aynı hata daha önce `uretim.length` ile de yaşanmıştı, sonra "en büyük"e
geçilmiş ama silinenler unutulmuştu. Doğru dayanak: bir kez atanıp SAKLANAN değer, ya da hiç
küçülmeyen bir kaynak.

**Doğrulama:** `birim-atolye-barkod.js` — 11 yeni iddia: çöpteki numaranın sayılması, başka türlerin
sayılmaması, ekin barkoddan gelmesi ve **bir atama silindikten sonra diğerinin ekinin kaymaması**.

### 4g. PARÇA KODU MALI TANIYOR, PROSESİ DEĞİL (3 Eylül, v1.94.0)

**Kullanıcının sorusu:** "1000 numaralı fişi aldıktan sonra Kesim'de 1000-1 oluyor, Saya'da 1000-2.
Mantık ne burada?" — Haklı bir soru: sayaç ÜRETİM BAŞINA ve bütün prosesler boyunca ilerliyordu,
yani "-2" bölünmeyi değil "bu üretimde verilen ikinci iş"i gösteriyordu. Bölünme olmasa bile her
proseste kod değişiyor, her proseste yeni etiket basmak gerekiyordu.

**Kullanıcının kararı:** "Fişte bölünme yoksa -1/-2 olmasın. Böldüysek 1001 numaralı fişin 2.
parçası diye kod versin, onun için üretimin içinden yeni barkod bastırsın; kaldığı proses ve
sonrasıyla yoluna o şekilde devam etsin."

**Yeni kural:** atama, adımın kalanının TAMAMINI alıyorsa ve adımda başka atama yoksa **bölünme
yoktur** → kod üretimin kendi kodudur (`1000`). Aksi halde parça kodu doğar (`1000-1`, `1000-2`);
parça numarası üretim boyunca artar ve yeniden kullanılmaz.

Sonuç: bölünmemiş bir bohça Kesim'de de Saya'da da `1000`. **Etiket bir kez basılıp iş bitene kadar
kullanılıyor** — numara malı tanıyor, prosesi değil.

**İki yan etki, ikisi de ele alındı:**
1. **Aynı kod birden çok atamada olabiliyor** (Kesim'in bitmiş `1000`'i ve Saya'nın açık `1000`'i).
   Okutma artık AÇIK (teslim edilmemiş) atamayı arıyor; bitmişler eşleşmiyor. Belirsizlik yok.
2. **Tekillik indeksi kaldırıldı.** `atolye-barkod.sql` güncellendi (v1.89.0'daki dosyayı
   çalıştıranların da yeniden çalıştırması gerekiyor): indeks yerinde kalsaydı ikinci prosese iş
   vermek veritabanı hatasıyla reddedilirdi.

**Parça etiketi üretim kartından basılıyor:** her atamanın yanında kodu ve bir yazıcı düğmesi var.
Etiket 6×4 cm; barkodun yanında ürün, renk, proses, beden dağılımı ve toplam adet gözle okunacak
şekilde basılıyor — okuyucu bozulduğunda ya da etiket başka bohçaya karıştığında tek dayanak yazı.

**Doğrulama:** `senaryo-barkod-atolye.js` — Kesim bölündüğü için `2001-1` (12) ve `2001-2` (20);
Saya bölünmeden alındığı için `2001` (32). Yani bölünme varsa parça kodu, yoksa ana kod.

### 4h. PARÇA KENDİ KODUYLA YOLUNA DEVAM EDİYOR (3 Eylül, v1.95.0)

**Soru:** bölünmüş parçalar sonraki proseste birleşiyor mu?
**Kullanıcı:** "Birleştiği de oluyor, birleşmediği de. Bölünen parça yoluna -1 eki almış olarak
devam edecek, sanki ayrı üretimmiş gibi."

**Kural netleşti: KOD BOHÇAYI TANIYOR, PROSESİ DEĞİL.** Kesim'de teslim edilen `2001-1` bohçası
Saya'da yine `2001-1` olarak alınıyor — yeni kod doğmuyor, ana koda da dönmüyor. Etiket bir kez
basılıp iş bitene kadar bohçanın üstünde kalıyor.

**Nasıl çalışıyor:** okutulan kod açık bir atamada bulunmazsa, BİTMİŞ atamalarda aranıyor. Bulunan
parçanın adımı bitmiş ve bir sonraki adım açıksa, o bohça sonraki prosese **aynı kodla** alınıyor.
En son teslim edilen eşleşme seçiliyor: aynı kod birden çok proseste geçmiş olabilir.

- **Taşınan miktar, teslim edilen SAĞLAM miktardır** — hurda/tamire ayrılan çift sonraki prosese
  gitmiyor. Atanan miktarı taşımak, olmayan malı bir sonraki prosese devretmek olurdu.
- **Birleşme:** iki parça birlikte devam edecekse her biri kendi koduyla okutuluyor; sonraki
  proseste iki ayrı atama olarak duruyorlar. Tek bohçaya gerçekten birleştirmek (kodları
  birleştirmek) ayrı bir işlem olurdu — kullanıcı "birleşmediği de oluyor" dediği için şimdilik
  ayrı devam etmek yeterli.

**Doğrulama:** `senaryo-barkod-atolye.js` — Kesim `2001-1` (12) ve `2001-2` (20) diye bölünüyor;
`2001-1` teslim edilip tekrar okutulunca Saya'ya **`2001-1` kodu ve 12 çiftle** geçiyor.

### 4i. BARKODLAR NEREDEN BASILIYOR (3 Eylül, v1.96.0)

**Kullanıcı:** "Üretim barkodlarını nereden alacağız, bölünmüşleri nereden?"

Eksik gerçekti: parça etiketleri basılabiliyordu ama **ana üretim barkodunu basacak bir yer yoktu**.
İşin başında etiket basmadan barkodlu akış hiç başlayamaz.

**İkisi de üretim kartında, bulunması gereken yerde:**
- **Ana üretim barkodu** → kart başlığında, üretim numarasının yanında **"Barkod"** düğmesi.
  İşin başında bir kez basılıyor; bölünme olmadığı sürece bütün prosesler boyunca aynı etiket
  yetiyor (kod bohçayı tanıyor, bkz. 4h).
- **Bölünmüş parçalar** → her atama satırında kodu (`2001-1`) ve yanında yazıcı düğmesi. Parça
  ancak bölününce doğduğu için etiketi de o satırda doğuyor.

Her iki etiket de **6×4 cm**, kutu etiketiyle aynı boy — atölyede tek tip etiket kâğıdı kullanılsın.
Barkodun yanında model, renk, beden dağılımı ve toplam adet **gözle okunacak şekilde** basılıyor:
okuyucu bozulduğunda ya da etiket başka bohçaya karıştığında tek dayanak yazı oluyor.

**Doğrulama:** `senaryo-barkod-atolye.js` — üretim kartındaki düğme basılıyor, çıkan etiket
`60mm 40mm`, tek sayfa, bir barkod ve kod yazılı.

### 4j. İŞ EMRİ BELGESİ (3 Eylül, v1.97.0)

**Kullanıcı:** "Üretim barkodunun içerisinde reçetedeki gibi proses bazlı hammadde ihtiyacı yazması
gerekiyor, en üstte model resim, müşteri, stok bilgileri vs. Personele detay vermemiz gerekiyor."

**Bu, barkod etiketi DEĞİL — ayrı bir belge.** 6×4 cm'lik etikete reçete tablosu sığmaz;
sığdırılmaya çalışılsaydı hem barkod hem yazı okunmaz olurdu. Artık iki belge var ve ikisi de
gerekli:
- **Barkod etiketi (6×4 cm)** → bohçaya yapışır, okutulur
- **İş emri (A4)** → personelin eline verilir, ne yapacağını anlatır

Barkod iş emrinin de üstünde: kâğıdı eline alan kişi doğrudan okutabilsin.

**İş emrinde ne var:**
- Üstte model görseli, model adı, renk, beden dağılımı ve toplam çift
- Müşteri, satış sipariş no, teslim tarihi (bağlı satış siparişinden)
- **Her proses için ayrı tablo**: hammadde · renk · beden · gereken miktar — reçeteden hesaplanıyor
  (`beklenenTuketim`, kartın ekranda kullandığı hesabın aynısı; ikinci bir hesap yazmak ikisinin
  ayrışması demekti)
- **Hammaddesi olmayan proses de yazılıyor:** "Bu proseste hammadde çıkışı yok". Atlanan bir proses,
  personele "tablo eksik mi" dedirtirdi.

`etiketYazdir`e `ustHizali` seçeneği eklendi: küçük etiket ortalanır (içerik az, göz ortaya bakar),
A4 gibi dolu sayfalar üstten hizalanır — ortalamak uzun tabloyu sayfanın dışına taşırıyordu.

**Doğrulama:** `senaryo-barkod-atolye.js` — çıkan belge `210mm 297mm`, barkod var, "1. Kesim" ve
"2. Saya" başlıkları çıkıyor, reçeteden gelen hammadde (Deri) yazılı, hammaddesiz proseste açıklama
satırı var ve beden toplamı doğru. Tohuma bu iş için reçete satırı eklendi.

### 4k. İŞ EMRİ HAMMADDE TABLOSU MATRİS OLDU (3 Eylül, v1.98.0)

**Kullanıcı:** "İş emrinde matris olsun, bedenler aşağı doğru sıralanıyor, sayfaya sığmaz bu şekilde."

Doğru tespit: her hammadde × beden ayrı satırdı. 5 bedenli bir modelde tek hammadde 5 satır
kaplıyordu; birkaç malzemeli bir proses tek başına sayfayı dolduruyordu.

**Yeni düzen — uygulamanın her yerindeki matris:** satır = hammadde (+renk), sütun = beden,
sağda toplam. Aynı bilgi, beşte bir yer.

`isEmriHammaddeMatrisi(proses, bedenler)` yazıldı. `beklenenTuketim` beden kırılımını TOPLAYIP tek
sayı veriyor (ekranda öyle gerekiyor); iş emrinde ise personelin hangi bedene ne kadar malzeme
alacağını görmesi gerek. İkisi de aynı reçeteden ve aynı ambalaj renk kuralından besleniyor —
ayrı bir "gerçek" üretilmiyor, yalnızca kırılım korunuyor.

- "Tüm Bedenler" reçete satırı her bedene uygulanıyor; beden adı yazılı satır yalnızca kendi
  sütununa düşüyor (matriste tek hücre).
- Hammaddenin kendi bedeni varsa ad yanında parantez içinde yazılıyor — mamul bedeniyle
  karışmaması için.

**Doğrulama:** `senaryo-barkod-atolye.js` — üretim iki bedenli (41:20, 42:12) yapıldı; başlık
satırında `41` ve `42` SÜTUN olarak çıkıyor, gövdede beden başına satır YOK (Kesim'de iki hammadde
satırı, Saya'da "hammadde çıkışı yok"). Tohuma yalnızca 42 bedene giren bir reçete satırı eklendi
ki tek sütuna düşen malzeme de sınansın.

### 4l. BEDEN-BEDEN EŞLEŞMESİ TEK SATIRDA (3 Eylül, v1.99.0)

**Kullanıcı:** "Beden beden eşleşmesinde yine aşağı atıyor satırı. Yanına beden yazıp aynı satırda
ikisi görünsün."

Bir önceki sürümde matrise geçilmişti ama satır anahtarında **hammaddenin kendi bedeni** vardı.
Beden-beden eşleşmesinde (mamul 41 → taban 41, mamul 42 → taban 42) o beden her satırda
değiştiği için hammadde yine beden başına ayrı satır oluyordu — matris kâğıt üstünde yine
aşağı uzuyordu.

**Düzeltme:** satır anahtarından hammadde bedeni çıkarıldı. Artık bir hammadde tek satır;
kendi bedeni **hücrenin içinde**, miktarın yanında yazıyor:

```
Taban | Siyah | 20 (41) | 12 (42) | 32 adet
```

- Hammadde bedeni BÜTÜN hücrelerde aynıysa (ör. tek numara taban) satır adının yanında **bir kez**
  yazılıyor; hücreler kalabalıklaşmıyor.
- Değişiyorsa (beden-beden eşleşmesi) her hücrede kendi bedeni görünüyor.

**Doğrulama:** tohuma gerçek bir beden-beden eşleşmesi kondu (mamul 41 → taban 41, mamul 42 →
taban 42). Senaryo, "Taban" satır sayısının **1** olduğunu ve hücre içeriğinin
`Taban | Siyah | 20 (41) | 12 (42) | 32 adet` şeklinde çıktığını ölçüyor.

**v1.100.0 — PARANTEZ.** İlk yazımda hammadde bedeni miktarın yanına parantezsiz konmuştu:
`20 41`. Kullanıcı hemen fark etti — iki ayrı sayı gibi okunuyor. `20 (41)` ise "20 adet,
41 numara" diye tek bakışta anlaşılıyor. Küçük bir işaret, okunabilirliğin tamamı.

### 4m. "PERSONEL BARKODU OKUTTUM, TEPKİ VERMİYOR" (3 Eylül, v1.101.0)

Ekran okutmayı yalnızca **Enter** ile alıyordu. Barkod okuyucuların çoğu okumayı Enter ile bitirir
ama hepsi bitirmez — bitirme karakteri cihaz ayarında kapalı olabiliyor. O durumda kod kutuya
yazılıp orada kalıyor, ekranda hiçbir şey olmuyordu. Kullanıcı açısından uygulama bozuk görünüyor.

**İki düzeltme, iki ayrı sebebe:**

1. **Enter beklenmiyor artık.** Yazma DURUNCA (120 ms) kendiliğinden okunuyor. Okuyucu bütün kodu
   bir çırpıda yazar, insan harf harf — bu süre ikisini ayırmaya yetiyor. Enter yolu da duruyor;
   ikisi çakışmıyor çünkü okutma sonrası kutu temizleniyor.
2. **Barkodu tanımlı personel yoksa ekranda büyük bir uyarı var** ve nereden atanacağı yazıyor
   (Cari → personel kartı → Düzenle → Barkod Kodu). Okutup tepki alamayan kullanıcının ilk
   düşüncesi "uygulama bozuk" oluyor; oysa sebep çoğu zaman kodun hiç atanmamış olması.
   Tanınmayan kod mesajı da ayrıştı: personel girişi öncesi "bu kod hiçbir personele tanımlı değil",
   sonrası "bu üretim/parça kodu bulunamadı".

**Doğrulama:** barkodsuz durumda uyarının çıktığı ölçüldü.

> **v1.102.0 — KENDİLİĞİNDEN OKUMA GERİ ALINDI (kullanıcı kararı).**
> "Bunu iptal et, elle de giriyoruz kodu." Haklı: kod elle yazılırken verilen kısa duraklamalar
> yarım kodu okutuyordu. Bir okuyucu sorununu çözmek için getirilen otomatik davranış, elle
> girişi bozdu.
>
> Tetikleyici artık AÇIK ve iki tane: **Enter** ya da kutunun yanındaki **"Okut" düğmesi**.
> Belirsiz bir otomatik davranıştansa iki net yol daha iyi. Enter göndermeyen okuyucu için
> düğme zaten yeterli.
>
> **Ders:** "kullanıcı adına tahmin eden" davranışlar, tahminin yanlış olduğu durumda sessizce
> zarar veriyor. Bu ekranda tahmin (duraklama = kod bitti) elle yazan kullanıcı için hep yanlıştı.

**Ders:** "hiçbir tepki yok" en pahalı hata biçimi. Ne olduğunu söylemeyen bir ekran, kullanıcıyı
kendi kurduğu yanlış teoriyle baş başa bırakıyor. Bu oturumda aynı biçimde üç hata çıktı
(sessiz teslim, sessiz kota, sessiz okutma) — hepsinde düzeltme, işlemin kendisi kadar
"neden olmadı"yı söylemekti.

### 4n. ÜRETİM NUMARALARI 5 HANE (3 Eylül, v1.103.0)

**Kullanıcı:** "Barkodlarda sorun olacak gibi — 1001 üretim barkodu, 1001 kesici personel barkodu.
Ya hane sayısını değiştireceğiz, örn. üretim barkodu 5 haneli olacak, 10001'den başlayıp devam
edecek."

Gerçek bir çakışmaydı. Personel barkodları **proses bantlarından** geliyor ve 4 hane
(Kesim 1000-1999, Saya 2000-2999…). Üretim numaraları da 1001'den başlıyordu. Aynı kod hem bir
personele hem bir üretime denk gelebiliyor, okutulan kodun hangisi olduğu belirsizleşiyordu.
(Ekran personeli önce arıyordu, yani üretim okutulamaz hale gelirdi — sessiz ve anlaşılmaz bir
davranış.)

**Çözüm — kullanıcının önerdiği gibi hane sayısıyla ayırma:** `URETIM_NO_TABAN = 10000`, yani ilk
üretim **10001**. Personel 4 hane, üretim 5 hane; aralıklar kesişmiyor.

Harf ön eki (`U-1001`) de düşünüldü ama üretim numarası fiş numaralarında, etiketlerde ve
ekranlarda görünen bir şey; biçimini değiştirmek bütün geçmişi okunmaz kılardı.

- **Eski 4 haneli üretimler tabanı düşürmüyor:** mevcut en büyük 1002 bile olsa yeni numara 10001
  oluyor. Eski kayıtlar numaralarını koruyor.
- **Personel bandı üretim aralığına taşarsa uyarı çıkıyor:** proses tanımında başlangıç numarası
  10000'den büyük seçilirse cari kartında kırmızı uyarı beliriyor. Kural bir yerde yazılı olsa da
  başka bir ekrandan bozulabiliyordu.

**Doğrulama:** `birim-atolye-barkod.js` — taban 10000, eski 4 haneli numaraların tabanı düşürmemesi,
silinen numaranın çöpten okunması (5 haneli değerlerle).

### 4o. DEPO İKİYE AYRILDI — MAMUL DEPOSU (3 Eylül, v1.104.0)

**Kullanıcı:** "Depoyu mamul ve hammadde olarak ayıralım, hatta depo mantığını burada kurgulayalım."

**DEPO İKİ AYRI SORU SORAR** ve ikisi aynı listede karışınca bakan kişi hangi soruya cevap
aradığını unutuyordu:

| depo | soru | talep nereden | arz nereden |
|---|---|---|---|
| Hammadde | "üretebilmek için ne **almalıyım**?" | reçeteden | satın almadan |
| Mamul | "sevk edebilmek için ne **üretmeliyim**?" | satış siparişinden | üretimden |

Depo sekmesi artık: **Hammadde Deposu · Mamul Deposu · Fire Raporu**.

**Mamul deposunda bir çiftin geçebileceği haller** (satır = ürün+renk, sütun = beden):

| hal | anlamı |
|---|---|
| **stok** | depoda duran |
| **kolide** | fiziken depoda ama HAZIR bir koliye konmuş |
| **serbest** | stok − kolide |
| **üretimde** | henüz stoğa girmemiş, üretimi süren |
| **talep** | satış siparişlerinde karşılanmamış kalan |
| **açık** | talep − serbest − üretimde (pozitifse ÜRETİLMESİ gereken) |

**"Kolide" ayrı tutuluyor** çünkü o mal fiziken orada ama SÖZÜ VERİLMİŞ. Serbest saymak aynı çifti
iki müşteriye satmaya yol açardı — koli sınır denetiminde (3z) tam olarak bu hata yaşanmıştı,
oradaki ders buraya taşındı.

Açığı olan satırlar üste sıralanıyor: depoya bakan kişinin ilk sorusu "ne eksik".
Açık rengi mor (#6B3FA0) — hammadde deposundaki "açık" ile aynı renk, aynı kavram (bkz. 3f).

**Doğrulama:** `test/senaryo-mamul-depo.js` — 40 bedeninde stok 10, kolide 3 → **serbest 7**,
talep 6 → açık YOK. 41 bedeninde stok 4, üretimde 2, talep 9 → **açık 3**. Hesabın her satırı
ayrı ayrı ölçülüyor.

> ### DEPO KAPSAMI — KARARLAŞTI (3 Eylül, kullanıcı: "şu anda 3 sorunun cevabı da hayır")
> Üç şey de **KAPSAMA ALINMAYACAK**:
> - **Raf/lokasyon takibi yok.** Depo miktar bazlı: "kaç çift var" sorusuna cevap veriyor,
>   "nerede duruyor" sorusuna vermiyor.
> - **Mamulde asgari stok uyarısı yok.** Mamul stoğu siparişe göre üretiliyor; "asgari seviye"
>   sipariş bazlı bir atölyede yanlış alarm üretirdi. (Hammadde tarafında min. stok VAR ve orada
>   anlamlı: reçete talebi öngörülebilir.)
> - **Depolar arası transfer yok.** Tek depo var.
>
> **BİR SONRAKİ OTURUM İÇİN:** bu üçünü tekrar önerme. İhtiyaç doğarsa kullanıcı söyler. Özellikle
> raf takibi cazip görünüyor ama her stok hareketine bir "nereden/nereye" alanı ekler ve tek
> depolu bir atölyede karşılığı olmayan bir bakım yükü doğurur.

### 4p. BÖLÜNMÜŞ ÜRETİMDE ANA KOD KAPANIYOR (3 Eylül, v1.105.0)

**Kullanıcı:** "104 çiftlik ürünü 64 + 40 olarak Saya prosesinde böldük ve Kalfa prosesinde yine
104 olarak geri geldi. Üretim no 10006 ise, fişi ikiye böldüğümüzde 10006-1 ve 10006-2 oluştu;
bundan sonra 10006 üretimini kapatıp yoluna 10006-1 ve 10006-2 olarak devam etmesi gerekirdi."

**Sebep:** ana kod (`10006`) bölünmeden sonra da "kalanın tamamını al" anlamına geliyordu.
Kalfa adımında hiç atama olmadığı için `dagitilmamis` 104 döndürüyor ve tamamı **tek parça**
olarak alınıyordu — iki parça sessizce birleşmiş görünüyordu.

**Kural iki durumu AYIRMAK zorunda** (ilk denemede ayırmadım ve kalanı alma yolu kapandı):
- **Bölünen adımın KALANI** (64 alındı, 40 duruyor): ana kod hâlâ geçerli. O 40 çiftin henüz bir
  parça etiketi yok; ikinci kalfa ana kodu okutup kalanı alıyor ve `10006-2` doğuyor.
- **YENİ bir adım** (Saya bitti, Kalfa açıldı): ana kod **KAPALI**. Okutulunca reddediliyor ve
  parça kodları söyleniyor: "10006 bölündü — parça barkodunu okutun: 10006-1, 10006-2".

Ayırt edici: hedef adımda hiç atama var mı? Varsa dağıtım sürüyor, yoksa adım yeni.

- **Alabileceğim işler listesi de değişti:** bölünmüş üretimde ana kod değil, sonraki prosese
  hazır PARÇALAR listeleniyor (kendi kodlarıyla). Ana kodu göstermek "tamamını alabilirsin"
  demekti.
- **Üretim kartından yapılan atamalarda da** bölünmüş üretimde ana kod bir daha verilmiyor
  (`bolunmeVar` artık `uretimBolunmusMu`yu da sayıyor).

**Doğrulama:** `birim-atolye-barkod.js` — bölünmüş/bölünmemiş ayrımı, parça kodlarının sıralanması
ve bölünmüşte sıradaki kodun `10006-3` olması. `senaryo-barkod-atolye.js` akışın tamamını
yürütüyor: 12 alınıyor (`2001-1`), kalan 20 ana kodla alınıyor (`2001-2`), teslim parça koduyla
yapılıyor, parça sonraki prosese kendi koduyla geçiyor.

> **BİLİNEN AÇIK — bir sonraki adım için:** bir adımın alınabilir miktarı hâlâ ÜRETİMİN TOPLAMINDAN
> hesaplanıyor (`dagitilmamis`), önceki adımın TESLİM ETTİĞİNDEN değil. Yani Saya'dan 64 teslim
> edilmişken Kalfa'da 104 çiftlik yer varmış gibi görünüyor. Yeni adımda ana kod kapatıldığı için
> bildirilen hata çıkmıyor ama hesabın kendisi hâlâ yanlış tabanda. Doğrusu: bir adımın havuzu =
> önceki adımın teslim ettiği sağlam miktar. Bu, `dagitilmamis`ın yeniden yazılması demek.

### 4r. ÜRETİM LİSTESİ AKORDEON (3 Eylül, v1.106.0)

**Kullanıcı:** "Üretimde fiş açtığımızda, diğer fişe tıklayınca bir önceki detay kapansın."

Her kart kendi açık/kapalı durumunu tutuyordu; hepsi birden açık kalabiliyordu. Üretim kartları
uzun (prosesler, atamalar, hammadde tabloları) olduğu için üç kart açıkken listede gezinmek
imkânsız hale geliyordu.

Açık kart durumu **listeye taşındı**: tek bir `acikKartId` var, bir kartı açmak diğerini kapatıyor.

**İç state KORUNDU.** Kart tam ekran pencerede ve tek başına da kullanılıyor; oralarda dışarıdan
yöneten bir liste yok. Kart `onAcKapa` propu VERİLDİYSE dışarıdan yönetiliyor, verilmediyse kendi
durumunu tutuyor — iki kullanım biçimi de bozulmadı.

**Doğrulama:** `senaryo-barkod-atolye.js` — tohuma ikinci bir üretim eklendi (akordeon ancak iki
kartla sınanabilir); birinci kart açıkken ikinciye tıklanıyor ve açık kart sayısının **1'de
kaldığı** ölçülüyor (2'ye çıkmıyor).

### 4s. SON İŞLEMLERDE TÜR SEKMELERİ (3 Eylül, v1.107.0)

**Kullanıcı:** "Son işlemleri filtreleyelim, sekme olarak alış, satış, tahsilat vs."

Akış karışık geliyordu: bir tahsilatı ararken araya üretim hareketleri giriyordu. Panelin üstüne
**tür sekmeleri** eklendi: `Tümü (5) · Alış (2) · Üretim (2) · Alış siparişi (1)` gibi.

**Sekmeler SABİT LİSTE DEĞİL, olay türlerinden türetiliyor.** Sabit bir liste yazsaydım, yarın
eklenen bir tür (ör. "Fire") sekmesiz kalır ve sessizce gizlenirdi. Her sekme kendi türünün
rengini taşıyor — akıştaki rozetlerle aynı renk, aynı kavram.

**Sayılar kişi süzgecinden SONRA hesaplanıyor.** "Ahmet" seçiliyken "Satış (3)" yazıyorsa sekmeye
basınca gerçekten 3 satır görünmeli; toplam sayıyı göstermek yanlış beklenti kurardı.

**Kişi değişince tür süzgeci sıfırlanıyor:** o kişide o tür hiç olmayabilir ve ekran boş kalırdı —
boş liste "veri yok" gibi okunuyor.

**Doğrulama:** `senaryo-son-islemler.js` — sekmelerin sayılarıyla çıktığı ve "Alış" sekmesine
basınca akışta YALNIZCA alış rozetinin kaldığı ölçülüyor.

### 4t. AYNI TALEP BİRDEN ÇOK KEZ YAZILIYORDU (3 Eylül, v1.108.0)

**Kullanıcı (ekran görüntüsüyle):** "Stok hareketlerinde sorun var, aynı talebi birden fazla
yapmış." Ürün kartındaki **Talep Eden Siparişler** listesinde `SAT-1002 · talep 20` satırı DÖRT
kez görünüyordu; ilk satır "stoktan 20 karşılanıyor", diğer üçü "açık 20". Talep 80 çıkıyor,
açık 60 görünüyordu.

**İki ayrı sorun vardı ve ikisi üst üste binmişti:**

1. **GERÇEK ÇİFT KAYIT.** Üretim planlaması aynı üretim için tekrar çalıştığında stok rezervasyon
   defterine İKİNCİ bir kayıt ekliyordu. Rezervasyon "bu sipariş bu malzemeden şu kadar isteyecek"
   demek; iki kez yazılınca talep iki katına çıkıyor ve satın alma o yanlış sayıya göre
   yönlendiriliyordu. Artık anahtar **üretim no + malzeme**: bir üretimin bir malzemeye ihtiyacı
   TEK bir taleptir, ikinci yazım atlanıyor.
2. **AYIRT EDİLEMEZLİK.** Aynı siparişin farklı üretimleri aynı malzemeyi isteyebiliyor; bu
   meşru. Ama ekranda yalnızca sipariş no yazdığı için satırlar birbirinin AYNISI görünüyordu.
   Kayıtta `uretimNo` zaten vardı, gösterilmiyordu. Artık her talep satırında "üretim 10006"
   rozeti var — hem meşru tekrarlar ayırt ediliyor hem gerçek bir çift kayıt varsa görünür oluyor.

**Neden ikisi birden yapıldı:** yalnızca çift yazımı engellemek eski (zaten yazılmış) kayıtları
düzeltmiyor; kullanıcı hâlâ dört satır görüyor ama neden olduğunu anlayamıyordu. Yalnızca üretim
no göstermek de asıl hatayı yerinde bırakıyordu.

> **MEVCUT VERİDE:** bu tarihten önce oluşmuş çift rezervasyonlar SİLİNMEDİ — hangisinin fazla
> olduğunu kod güvenle bilemez (miktarlar farklı olabilir). Ekranda artık üretim no göründüğü için
> aynı üretimin tekrarlanan satırları gözle ayırt edilebilir; planlamayı temizleyip yeniden
> planlamak da defteri düzeltiyor.

### 4u. "SATIN ALMA OLUŞTURDUĞUMUZ STOKLARI GÖSTERMİYOR" (3 Eylül, v1.109.0)

**Kullanıcı (ekran görüntüsüyle):** Taban kartında SATIN ALMA sütunu **"—"**, ama aynı satırın
detayında `YOLDAKİ ALIŞLAR: ALS-1001 · 6 bekliyor · rezerveli (SAT-1001)` yazıyor.

**Sebep:** sütun yalnızca **REZERVESİZ** yoldaki miktarı sayıyordu. Alış siparişi bir satış
siparişine rezerveli açıldıysa sütun boş kalıyordu; bilgi yalnızca satır detayında duruyordu.
Kullanıcı açısından "sipariş verdim, uygulama görmüyor".

Sütunun eski tanımı **kasıtlıydı** ve gerekçesi hâlâ geçerli: rezerveli mal geldiğinde SERBEST
stoğa girmez, başka bir siparişe aittir. Ama o gerekçe **BEKLENEN** sütununu ilgilendiriyor,
"satın alma var mı" sorusunu değil.

**Düzeltme:**
- **SATIN ALMA = yoldaki TOPLAM**, rezerveli kısım parantezde: `6 (6 rez.)`. "Sipariş verdim mi"
  sorusu doğru cevaplanıyor, "serbest kalacak mı" sorusu da kaybolmuyor.
- **BEKLENEN değişmedi** (serbest + rezervesiz yolda): oraya rezerveliyi eklemek "yolda mal var"
  diye ikinci kez söz vermeye yol açardı.
- Grup rozetindeki "N yolda" ve tablo TOPLAM satırı da aynı hesaba geçti — sütun rezerveliyi
  sayarken toplamın saymaması ikisinin birbirini tutmamasına yol açıyordu (aynı sayı, iki farklı
  değer: bu projedeki en sık hata biçimi).

**Doğrulama:** `test/senaryo-satin-alma-sutunu.js` — stok 0, talep 6, yolda rezerveli 6 kurulup
sütunda `6 (6 rez.)` ve toplam satırında `6` çıktığı, detayda hem yoldaki alışın hem üretim
numarasının göründüğü ölçülüyor.

### 4v. SATIN ALMA SÜTUNU TALEBE GÖRE KIRPILIYORDU (3 Eylül, v1.110.0)

**Kullanıcı (ekran görüntüsüyle):** "Taban Beyaz 36'ya 7 çift bağımsız giriş yaptım, durum bu
şekilde. Başka hiç stok girişi yok." Tabloda **Beyaz·36** satırı: stok 7 · rezerve 6 · serbest 1 ·
**SATIN ALMA —** · talep 6. Diğer bütün bedenler `12 (12 rez.)` gösterirken bu satır boştu.

**Sebep — bir önceki düzeltmenin eksik kalan yarısı.** v1.109.0'da sütun `yoldaRezerve`den
besleniyordu; o değer `rezervasyonKarsilama`dan geliyor ve **talebe göre KIRPILIYOR**: bir satırın
talebi stoktan karşılandıysa "yolda" 0 sayılıyor. Beyaz·36'ya stok girilince talebi (6) karşılandı
ve o bedenin yoldaki alımı ekrandan kayboldu.

**"Satın alma var mı?" sorusu talepten BAĞIMSIZDIR.** Mal yolda, gelecek; talebin karşılanmış
olması bunu değiştirmiyor. Sütun artık doğrudan ALIŞ SİPARİŞİ KALEMLERİNDEN besleniyor
(`yoldaToplamAlim` / `yoldaRezerveliAlim`) — satır detayındaki "YOLDAKİ ALIŞLAR" ile aynı kaynak.

`yoldaRezerve` (talebe tahsis edilmiş yoldaki miktar) yerinde duruyor; o talep hesabının parçası.
İki kavram ayrıldı: **tahsis edilen** ile **fiilen yolda olan** aynı sayı değil.

**Ders:** bir sütunu "en yakın duran değişkenden" beslemek, o değişkenin ne için hesaplandığını
sormamak demek. `yoldaToplam` talep hesabı için üretilmişti; sütunun sorusu başkaydı.

**Doğrulama:** `senaryo-satin-alma-sutunu.js` — stok 7, talep 6 (yani talep stoktan KARŞILANMIŞ),
yolda rezerveli 6 kuruldu; sütunda `6 (6 rez.)`, AÇIK ✓ ve toplam satırı tutarlı.

### 4y. "BEKLENEN 1 YAZIYOR, -1 OLMASI GEREKMEZ Mİ?" (3 Eylül, v1.111.0)

**Kullanıcı:** "Beklenen 1 yazıyor, aslında -1 olması gerekmez mi? Talep 6 gösteriyor. Beklenen
mantığı nedir? Açık nedir?"

Soru iki gerçek kusuru ortaya çıkardı:

**1. Tablonun üstündeki formül sayıları TUTMUYORDU.** Yazan: `beklenen = serbest + satın alma`.
Satırdaki sayılar: serbest **1** · satın alma **6** · beklenen **1**. Formüle göre 7 çıkması
gerekirdi. Sebep: SATIN ALMA sütunu v1.110.0'da rezerveli alımları da göstermeye başladı, oysa
BEKLENEN yalnızca **rezervesiz** alımı sayıyor (rezerveli mal geldiğinde kendi siparişine gider,
serbest kalmaz). Formül eski sütun tanımına göre yazılmıştı ve güncellenmemişti.
Yeni hâli: `serbest = stok − rezerve · beklenen serbest = serbest + rezervesiz satın alma`.

**2. "BEKLENEN" adı iki türlü okunuyordu:** beklenen STOK mu, beklenen İHTİYAÇ mı? Kullanıcı
ihtiyaç olarak okumuş ve "-1" beklemiş (7 stok − 6 talep gibi bir mantıkla ters işaret).
Başlık **"BEKLENEN SERBEST"** oldu.

**Sütunların anlamı (ipuçları da genişletildi):**

| sütun | anlamı |
|---|---|
| STOK | elde fiilen duran |
| REZERVE | stoğun siparişlere ayrılmış kısmı |
| SERBEST | stok − rezerve · bugün başka işe verilebilecek |
| SATIN ALMA | sipariş edilmiş, henüz gelmemiş TOPLAM (parantezde rezerveli kısım) |
| BEKLENEN SERBEST | serbest + **rezervesiz** satın alma · geldiğinde serbest kalacak |
| TALEP | siparişlerin reçeteye göre istediği toplam |
| AÇIK | talep − stoktan karşılanan − yoldaki tahsisli · **satın alınması gereken** |

**Ders:** ekrandaki açıklama metni de koddur. Sütunun tanımı değiştiğinde formülü güncellemeyi
unutmak, kullanıcıya yanlış bir zihinsel model kurduruyor — üstelik sayılara güvenini sarsıyor.

### 4z. BEKLENEN SERBEST HESABI YANLIŞTI (3 Eylül, v1.112.0)

**Kullanıcı:** "Beklenen hâlâ 1 görünüyor." — Bir önceki sürümde adı düzeltmiştim (BEKLENEN →
BEKLENEN SERBEST) ama **sayının kendisi yanlıştı**; kullanıcı ona işaret ediyordu.

**Durum:** stok 7 · talep 6 · yolda REZERVELİ 6. Beklenen serbest **1** yazıyordu.

**Hata:** hesap yalnızca "rezervesiz" alımı sayıyordu. Oysa o rezerveli 6, talebi **STOKTAN
karşılanmış** bir siparişe ait — artık o siparişe gerekmiyor. Geldiğinde serbest stoğa girecek.
Doğru değer 1 değil **7**.

**Yeni hesap:** `beklenen serbest = serbest + (yoldaki toplam alım − taleplere FİİLEN tahsis
edilen)`. `rezervasyonKarsilama` zaten stoğu önce dağıtıp kalan talebe yoldakini tahsis ediyor;
tahsis edilmeyen kısım sahipsizdir.

- Stok 0, talep 12, yolda rezerveli 12 → tahsis 12 → beklenen serbest **0** (doğru: hepsi o
  siparişe gidecek).
- Stok 7, talep 6, yolda rezerveli 6 → tahsis 0 → beklenen serbest **7** (doğru).

Başlıktaki formül de güncellendi: `beklenen serbest = serbest + tahsis edilmemiş satın alma`.

**Ders — üç turda üç kez aynı sütun:** önce sütun rezervelileri hiç göstermiyordu, sonra talebe
göre kırpıyordu, sonra beklenen hesabı eksik sayıyordu. Ortak sebep: "rezerveli" kelimesinin iki
ayrı şeyi anlatması — **bir siparişe bağlı açılmış olmak** ile **fiilen o talebe tahsis edilmiş
olmak**. İkincisi stok durumuna göre değişiyor; birincisi sabit. Ayrı isimlendirilmeden doğru
hesap kurulamıyordu.

### 5a. "REZERVE NEDEN REZERVEDE ÇIKMIYOR?" (3 Eylül, v1.113.0)

**Kullanıcı:** "Rezerve neden rezervede çıkmıyor? Rezerve siparişimiz var çünkü."

**Sayı doğruydu, AD yanlıştı.** Sütun rezervasyon TALEBİNİ değil, o talebe **stoktan ayrılan**
kısmı gösteriyor. Stok yoksa ayrılacak bir şey de yok → 0. Kullanıcının stoksuz bedenlerinde
"REZERVE —" görünmesinin sebebi buydu; rezervasyonlar duruyor ve **TALEP** sütununda görünüyor.

Başlık **AYRILAN** oldu (tablo ve matris başlıkları dahil). Formül satırı da genişletildi:
`ayrılan = talebe stoktan verilen · serbest = stok − ayrılan · beklenen serbest = serbest +
tahsis edilmemiş satın alma`.

Sütun ipuçları da açıldı: AYRILAN "stok yoksa 0 olur, rezervasyon talebinin tamamı TALEP,
karşılanamayan kısmı AÇIK sütununda" diyor; TALEP "rezervasyon defterindeki tam ihtiyaç, stok
olsun olmasın buraya yazılır" diyor.

**Bu tablodaki dördüncü adlandırma düzeltmesi** (SATIN ALMA, BEKLENEN SERBEST, AÇIK ipucu, şimdi
AYRILAN). Ortak sebep: sütun adları HESABIN İÇ ADINDAN türemişti (`rezerve`, `beklenenSerbest`),
kullanıcının sorduğu sorudan değil. Kullanıcı "rezerve siparişim var mı" diye soruyor, kod
"stoğun ayrılan kısmı" diye cevaplıyordu. Yeni sütun eklerken adı **kullanıcının sorusundan**
türetmek gerekiyor.

### 5b. AÇIKLAMA SATIRI SÜTUN ADIYLA AYNI KELİMEYİ KULLANIYOR (3 Eylül, v1.114.0)

**Kullanıcı (ekran görüntüsüyle):** "Her rengin rezervesi var ama sadece Beyaz 36'da görünüyor,
diğerlerinde neden görünmüyor?"

**Cevap AYRILAN'ın tanımında:** stoktan ayrılır. Diğer bedenlerde stok 0 olduğu için ayrılacak bir
şey yok; rezervasyonların kendisi **TALEP** sütununda duruyor (12, 12, 6, 3…) ve yoldaki alımlarla
karşılandığı için AÇIK ✓.

**Ama ekran bunu söylemiyordu — iki kusur:**
1. Sütun başlığı v1.113.0'da **AYRILAN**'a çevrilmişti, tablo üstündeki açıklama satırı hâlâ
   "rezerve" diyordu. Ekranda iki farklı ad aynı sütunu anlatıyordu; kullanıcı haklı olarak
   "rezerve nerede" diye aradı.
2. "Stok yoksa 0 olur" bilgisi yalnızca sütun İPUCUNDA (title) vardı. Telefonda ipucu görünmüyor —
   bu ekranı en çok telefondan kullanan kişi o bilgiyi hiç göremiyordu.

Açıklama satırı artık: `ayrılan = açık taleplere STOKTAN verilen (otomatik) · stok yoksa 0 olur,
rezervasyonun tamamı TALEP sütununda · serbest = stok − ayrılan · beklenen serbest = serbest +
tahsis edilmemiş satın alma`.

**Ders:** masaüstünde ipucu (title) bir açıklama yolu, telefonda DEĞİL. Anlamı taşıyan bilgi
ipucunda kalırsa, kullanıcıların çoğu için hiç yazılmamış demektir.

**Doğrulama:** `senaryo-satin-alma-sutunu.js` — açıklamada "ayrılan" geçtiği, eski "rezerve ="
ifadesinin KALMADIĞI, "stok yoksa 0 olur" ve "rezervasyonun tamamı TALEP sütununda" cümlelerinin
ekranda bulunduğu ölçülüyor.

### 5c. TALEP İLE AYRILAN ARASINDAKİ FARK (3 Eylül, v1.115.0)

**Kullanıcı:** "Talep ile ayrılan stok arasında ne fark var?"

- **TALEP** bir İHTİYAÇTIR: siparişlerin reçeteye göre isteyeceği toplam. Stok olsun olmasın
  rezervasyon defterine yazılır.
- **AYRILAN** o ihtiyacın **stoktan fiilen karşılanan** kısmıdır. Elle yapılan bir işlem değil:
  stok varsa en eski talepten başlayarak dağıtılır. Bu yüzden `AYRILAN ≤ TALEP` ve `AYRILAN ≤ STOK`.

**Talep her zaman üçe bölünür ve toplamları talebi verir:**

```
talep = stoktan ayrılan + yoldan tahsisli + açık
```

Satır detayına bu **denklem** eklendi. Üç sütunun birbiriyle ilişkisi ancak yan yana yazılınca
görünüyordu; ayrı ayrı bakınca "biri neden 0" sorusu doğuyordu.

- Beyaz·36 → `talep 6 = ayrılan 6 + yoldan 0 + açık 0` (stok var, hepsi stoktan)
- Beyaz·37 → `talep 12 = ayrılan 0 + yoldan 12 + açık 0` (stok yok, hepsi yoldaki alımdan)

**Ders — son beş sürümün ortak dersi:** bu tablodaki sorunların hiçbiri hesap hatası değildi;
hepsi **isimlendirme ve ilişkiyi gösterme** eksikliğiydi. Bir sayıyı doğru hesaplamak yetmiyor;
diğer sayılarla ilişkisi ekranda görünmüyorsa kullanıcı her sütunu ayrı bir "gerçek" sanıyor.

### 5d. KÜSURATLI STOK SAYILARI (3 Eylül, v1.116.0)

**Kullanıcı (ekran görüntüsüyle):** Taban kartında `BEKLENEN SERBEST 15.87`, `AÇIK 3.87`.
Taban ÇİFT ile sayılıyor — **yarım taban diye bir şey yok.**

**Kök sebep:** kısmen teslim alınmış alış kalemlerinde yoldaki miktar, kalemin teslim ORANIYLA
çarpılıyordu:
```
teslimOrani = karsilanan / miktar
yolda = rezervasyonKalan × (1 − teslimOrani)
```
Bölünmez birimlerde bu küsurat üretiyor (27 ısmarlanmış, 5 gelmiş → 22 × 0.8148…).
Üstelik ÇİFT SAYIM: `rezervasyonKalan` zaten açık kısmı gösteriyor, oranla bir kez daha kırpmak
teslim alınanı ikinci kez düşüyordu.

**Düzeltme:** kalemin henüz gelmemiş miktarı (`miktar − karsilanan`) bir HAVUZ; rezervasyonlara
**sırayla** dağıtılıyor. Teslim alınan kısım zaten STOK sütununda sayılıyor. Girdiler tam sayıysa
sonuç da tam sayı kalıyor.

Kullanıcının satırı düzeldikten sonra: stok 7 · ayrılan 7 · serbest 0 · satın alma 22 ·
yoldan tahsisli 15 · beklenen serbest 7 · talep 22 · açık 0 — hepsi tam sayı ve
`22 = 7 + 15 + 0` denklemi tutuyor.

**`test/birim-stok-durumu.js`** yazıldı (15 iddia): küsurat olmaması, teslim alınanın yolda
sayılmaması, tam/kısmi/hiç teslim alınmamış üç durum ve talep denkleminin her durumda tutması.
Bu tabloya beş sürümdür dokunuyoruz ve ilk kez ALTINDAKİ HESAP birim testiyle kilitlendi —
önceki düzeltmeler yalnızca tarayıcı senaryosuyla korunuyordu.

### 5e. KÜSURATIN ASIL KAYNAĞI: REZERVASYON ORANLA BÖLÜNÜYORDU (4 Eylül, v1.117.0)

**Kullanıcı (iki ekran görüntüsüyle):** "ALS-1004'te sorun var, siparişlere bölmüş rezervasyonu."
Alış siparişi ekranında: **177 çift** için rezervasyon → `SAT-1004 · 123.13` · `SAT-1001 · 46.17` ·
`SAT-1002 · 7.7`.

v1.116.0'da yanlış yeri tamir etmiştim (yoldaki miktarın teslim oranıyla kırpılması). O da gerçek
bir hataydı ama **küsuratın kaynağı değildi**; kullanıcı "hâlâ aynı" dedi ve haklıydı.

**ASIL SEBEP — `hammaddeRezervasyonDagit`:** alınan miktar, kaynak satış siparişlerinin
AĞIRLIĞINA ORANLANARAK bölünüyordu:
```
pay = alınan × (o siparişin ağırlığı / toplam ağırlık)
```
Çift/adet gibi bölünmez birimlerde bu doğrudan küsurat üretiyor. Üstelik son siparişe "kalan ne
varsa" yazılıyordu, yani yuvarlama artığı da oraya biniyordu.

**Doğrusu — ihtiyaca göre sırayla:** her satış siparişinin bu hammaddeye KENDİ ihtiyacı zaten
belli. Alınan miktar sırayla dağıtılır; her sipariş ihtiyacı kadar alır, kalan bir sonrakine geçer.
İhtiyaçlar tam sayıysa paylar da tam sayı kalır. 177 → **123 · 46 · 8**.

**Bir davranış daha düzeldi:** alınan miktar toplam ihtiyaçtan FAZLAYSA fazlası artık rezervesiz
kalıyor — kimseye söz verilmemiştir, geldiğinde serbest stok olur. Eskiden fazlalık da son siparişe
yazılıyor ve o sipariş ihtiyacından çoğunu rezerve etmiş görünüyordu.

**Ders — "hâlâ aynı" dendiğinde:** ikinci kez tahmin etmek yerine kullanıcıdan ham veriyi istemek
doğru hamleydi. Ekran görüntüsündeki `123.13` sayısı, hesabın hangi adımında bölme yapıldığını
tek başına söyledi. Bir önceki tur boşa gitmedi (o hata da gerçekti) ama belirtiyi açıklamıyordu;
"düzeltme belirtiyi açıklıyor mu" diye sormak gerekiyordu.

> **MEVCUT VERİDE:** hâlihazırda küsuratlı yazılmış rezervasyonlar KENDİLİĞİNDEN düzelmez —
> kayıtta `123.13` yazıyor. O alış siparişinin planlamasını temizleyip yeniden planlamak
> (ya da rezervasyonu elle düzeltmek) gerekiyor. Yeni açılan alışlar tam sayı gelecek.

**Doğrulama:** `birim-stok-durumu.js` — 177'nin 123/46/8 diye dağıtılması, yetmeyen miktarın
sırayla verilmesi, fazlanın rezerve edilmemesi ve kesirli birimlerde (metre) meşru küsuratın
korunması.

### 5f. "ÜRETİMDEN GİRİŞ" ETİKETİ HAMMADDEDE TERSTİ (4 Eylül, v1.118.0)

**Kullanıcı (Astar hammadde kartı):** "Üretimden giriş yazan aslında üretime çıkış yapılmış,
yanlışlık var gibi başlıkta."

Stok hareketleri süzgecinde `kaynak === "Üretim"` olan grup **sabit** "Üretimden Giriş" diye
etiketleniyordu. Mamulde doğru (üretim biter, mal stoğa girer) ama **hammaddede tersi**: malzeme
üretime ÇIKAR. Kart aynı ekranda hem mamul hem hammadde gösteriyor; tek bir sabit metin ikisini
birden doğru anlatamıyordu.

**Etiket artık hareketlerin İŞARETİNDEN türüyor** (`uretimKaynakEtiketi`):
- hepsi negatifse → **Üretime Çıkış**
- hepsi pozitifse → **Üretimden Giriş**
- karışıksa → sade **Üretim** (yanlış bir cümle kurmaktansa yön iddia etmemek yeğdir)

**Neden kategoriye değil işarete bakıldı:** kategori (Mamul/Hammadde) elle seçilen bir alan ve
yanlış girilmiş olabilir; hareketin işareti ise fiilen ne olduğunu söyler. Etiketin veriyle
çelişmesi, veriden şüphe ettirir.

**Doğrulama:** `test/birim-hareket-etiketi.js` — altı iddia: hammadde/mamul yönleri, karışık
durumda yön iddia edilmemesi, üretim hareketi olmayan ve boş listelerde sade etiket.

### 5g. SİPARİŞ İLE FİŞ AYRIMI (4 Eylül, v1.119.0)

**Kullanıcı — bir kavramın altını çizdi:**
> "Satış siparişi: sattığımız ürünler için sipariş. Alış siparişi: alış yaptığımız ürünler için
> sipariş. Satış fişi ve alış fişi bunlara göre isimlendirilmeli. Resimde görünen ALIŞ FİŞİ ama
> SATINALMA yazıyor, sanki siparişte kalmış gibi kafa karıştırıyor."

**Ayrım şu ve uygulamanın her yerinde geçerli olmalı:**

| kavram | ne demek |
|---|---|
| satış siparişi / alış siparişi | henüz olmamış, sözleşilmiş iş |
| satış fişi / alış fişi | fiilen olmuş, stoğu ve cariyi hareket ettiren belge |

Stok hareketinin kaynağı kayıtta `"Satınalma"` yazıyor ve ekranda da öyle görünüyordu; oysa o satır
bir **alış fişidir**. "Satınalma" kelimesi işi hâlâ sipariş aşamasındaymış gibi gösteriyordu.

`kaynakEtiketi()` eklendi: `Satınalma → Alış Fişi`, `Satış → Satış Fişi`, `Üretim → yöne göre`
(bkz. 5f). Hem süzgeç düğmelerinde hem satır rozetinde aynı ad kullanılıyor — süzgeçte "Alış Fişi"
yazıp satırda "Satınalma" görmek ikisini farklı şeyler sandırıyordu.

**KAYITTAKİ DEĞER DEĞİŞTİRİLMEDİ.** `kaynak` alanı bütün geçmiş kayıtlarda ve süzgeç
karşılaştırmalarında kullanılıyor; değiştirmek veri göçü gerektirir ve eski kayıtlar süzgeçlerin
dışında kalırdı. Yalnızca ekran adı eşleniyor.

### 5h. "SATIN ALMA" → "ALIŞ SİPARİŞİ" (4 Eylül, v1.120.0)

**Kullanıcı:** "Satınalmaya Alış siparişi diyelim. Şundan dolayı: satış siparişine kod verirken
SS0001 deriz; satınalma siparişi de SS0001 olur, baş harfleri benzer. Birini satış siparişi,
diğerini alış siparişi diyelim."

Gerekçe pratik ve doğru: **satış / satınalma** aynı harfle başlıyor, **satış / alış** başlamıyor.
Kod üretirken, konuşurken ve ekranda ayırt etmeyi kolaylaştırıyor.

Değişen ekran adları:
- Sol menü ve modül kartı: `Satın Alma` → **Alış Siparişi**
- Sipariş modülü sekmesi ve kart başlığı: `Satın Alma Siparişi` → **Alış Siparişi**
- Satış tarafı da açıkça yazılıyor: eskiden sadece "Sipariş" diyordu → **Satış Siparişi**
- Hammadde ihtiyaç ekranı düğmesi: `Satın Alma Siparişi Oluştur` → **Alış Siparişi Oluştur**
- Stok durumu sütunu: `SATIN ALMA` → **ALIŞ SİPARİŞİ**

**"Satın Al" düğmesi DEĞİŞMEDİ** — o bir EYLEM, belge adı değil ("satın al" fiili "satış" ile
karışmıyor). Karışıklık belge adlarındaydı.

**Veri değerleri yine değişmedi** (`tip: "Alış"`, `kaynak: "Satınalma"`, `planlama.tip:
"Satınalma"`). Yalnızca ekran adları. Testlerdeki sekme seçicileri yeni ada göre güncellendi —
beş senaryo `name: "Satın Alma"` arıyordu.

> **BİR SONRAKİ OTURUM İÇİN:** bu ayrımı uygulamanın KALAN yerlerinde de gözden geçir. Cari
> ekstresi, raporlar ve yazdırılan belgelerde "satınalma/satış" kelimeleri sipariş anlamında mı
> fiş anlamında mı kullanılıyor, tek tek bakılmalı.

### 5i. BEDENLER KÜÇÜKTEN BÜYÜĞE (4 Eylül, v1.121.0)

**Kullanıcı (sipariş formu ekran görüntüsüyle):** "Beden sıralaması küçükten büyüğe doğru olmalı."
Sütunlar `40 36 37 38 39` diye çıkıyordu.

**Sebep:** varyantlar EKLENME sırasında duruyor. Kullanıcı 40'ı önce eklediyse liste öyle geliyor.
Beden ise bir SIRA ifade eder; ekleme sırası değil sayısal sıra beklenir.

`bedenSirala` zaten vardı (sayıyı sayı gibi sıralıyor: "10" > "9"; sayısal olmayanları — S/M/L —
alfabetik bırakıyor) ama yalnızca birkaç ekranda kullanılıyordu. Sıralama eksik olan yerlere
eklendi: **sipariş formu** (asıl şikâyet), sesle doldurma, stok girişi, stok listesi matrisi,
ürün kartı, reçete hammadde bedenleri, üretim formu.

**DENETLEYİCİ 17 EKLENDİ — `bedendenetim.js`.** Bu hata SESSİZ: liste çizilir, sadece sırası
yanlıştır; kimse "bozuk" demez, "tuhaf" der. Yeni bir ekran kuralı atlarsa derleme durduruyor.
Kural: `.map(v => v.beden)` sonucu `bedenSirala` ile sarılmalı. Sıralamanın anlamsız olduğu
yerler (ör. yeni renge aynı bedenleri açarken) satır sonunda `// sirasiz-tamam` ile muaf.

**Neden denetleyici, neden test değil:** sıra hatası her ekranda ayrı ayrı doğabilir ve her ekran
için tarayıcı senaryosu yazmak pahalı. Denetleyici kuralı KAYNAKTA arıyor, ekran sayısından
bağımsız. (Aynı gerekçeyle 16 denetleyici daha var; bu 17.)

### 5j. CARİ KARTINDA FİŞ SAYIMI (4 Eylül, v1.122.0)

**Kullanıcı (ekran görüntüsüyle):** "Sadece 1 fiş kesildi ama 5 yazıyor, 5 beden girildiği için
sanırım. Orası 1 olmalı."

Doğru teşhis. Bir satış fişi **beden başına bir hareket** yazıyor (5 beden → 5 kayıt). Defter
sekmeleri ham hareket sayısını gösteriyordu: `Tümü (5) · Genel (5)`. Oysa ekstrede **tek satır**
var — sayı ile listenin boyu birbirini tutmuyordu.

**Düzeltme:** sayım artık ekstrenin kullandığı gruplamayı (`cariHareketleriGrupla`) kullanıyor.
Aynı fişin satırları tek sayılıyor. Para birimi sekmeleri de aynı şekilde düzeltildi — aynı hata
oradaydı ve fark edilmemişti.

**Neden ikinci bir sayma yöntemi yazılmadı:** ekstre gruplayıp gösteriyor, sekme ayrı sayıyordu;
ikisinin ayrışması kaçınılmazdı. Bu projede tekrar eden kalıp: **aynı soruya iki ayrı hesap.**

**Doğrulama:** `senaryo-cari-kart.js` genişletildi — tohumda beş bedenli tek fiş var, sekmelerin
`Tümü (1) · Genel (1) · Resmi (0)` gösterdiği ölçülüyor.

### 5k. TAHSİLATTA ÖDEME ŞEKLİ GÖRÜNÜYOR (4 Eylül, v1.123.0)

**Kullanıcı:** "Tahsilatta açıklama bölümüne kredi kartı, nakit vs. göstersin."

Ekstrede ödeme şekli **yalnızca Çek/Senet'te** gösteriliyordu. Bu kısıt bilinçliydi ve gerekçesi
hâlâ geçerli: satış/alış FİŞİNDE "Nakit" etiketi yanıltıcı — fiş cariye borç yazar, kasadan para
çıkarmaz; etiket ödenmiş izlenimi veriyordu.

**Ama gerekçe tahsilat/ödemeyi kapsamıyor.** Orada para FİİLEN el değiştiriyor ve nasıl
değiştirdiği kaydın parçası. Kısıt daraltıldı: ödeme şekli artık **çek/senet VE para
hareketlerinde** görünüyor, fişte görünmüyor.

`paraHareketiMi(h)` eklendi: fiş numarası `THS-`/`ODM-` ile başlıyorsa (v1.75.0'dan beri) ya da
açıklama "Tahsilat"/"Ödeme" ise para hareketidir. Ön ek birincil ölçüt; eski kayıtlarda ön ek
olmadığı için açıklamaya da bakılıyor.

**Doğrulama:** `senaryo-cari-kart.js` — aynı kartta bir tahsilat (Kredi Kartı) ve beş bedenli bir
satış fişi (Nakit) var; tahsilatta "Kredi Kartı" GÖRÜNÜYOR, fişte "Nakit" GÖRÜNMÜYOR. İki kural
tek senaryoda birlikte korunuyor.

### 5l. ÇEK AYRINTISI AÇIKLAMA SÜTUNUNA TAŞINDI (4 Eylül, v1.124.0)

**Kullanıcı:** "Çek detayını açıklama bölümüne yazsın, tarihin altında boşa kalabalık yapıyor."

Ödeme şekli rozeti TARİH sütununda, fiş numarasının altındaydı. O sütun dar; çek ayrıntısı
(`Çek · No 0012345 · Ziraat Bankası · cirolu · keşideci …`) üç satıra sarıyor ve tarihi boğuyordu.
AÇIKLAMA sütunu ise tahsilatlarda neredeyse boş duruyordu — bir yanda taşma, diğer yanda boşluk.

Rozet açıklama sütununa taşındı ve ayrıntı okunur hâle getirildi: `Çek · vade 2026-09-14 ·
No 0012345 · Ziraat Bankası · cirolu · keşideci Kadir Tekstil`.

**Gösterim kuralı DEĞİŞMEDİ** (v1.123.0): çek/senet ve para hareketlerinde var, satış/alış fişinde
yok. Taşınan yalnızca yer.

**Doğrulama:** `senaryo-cari-kart.js` — çekli bir tahsilat eklendi; ayrıntının AÇIKLAMA hücresinde
BULUNDUĞU ve TARİH hücresinde BULUNMADIĞI hücre hücre ölçülüyor (metinde arama değil, `td`
indeksiyle).

### 5m. "SATIN AL" ÇIKMAZ SOKAKTI (4 Eylül, v1.125.0)

**Kullanıcı:** "Satın alma tıklayınca satın alma ekranı açması gerekir."

Düğme Planlama'daki **hammadde ihtiyaç** penceresini açıyordu. Ama iki ekran ihtiyacı FARKLI
tanımlıyor:
- **Planlama:** bekleyen satış siparişlerinden doğan ve HENÜZ PLANLANMAMIŞ ihtiyaç
- **Depo:** stok/rezervasyon defterinden hesaplanan **açık**

Bir malzemenin Depo'da açığı olup planlamada karşılığı olmayabilir (üretim zaten planlanmışsa).
O durumda pencere bir bildirim gösterip kapanıyordu — kullanıcı açısından **"bastım, hiçbir şey
açılmadı"**, üstelik aynı satırda "açık 8" yazarken.

**İLK DÜZELTME YANLIŞTI (v1.125.0):** boş durumda **alış fişi** taslağı açılmıştı. Kullanıcı
hemen düzeltti:

> "Bu ekranda alış fişi ve satın al aynı ekran oldu. **Alış fişi**, satınalma siparişi olmadan
> direkt cariden alış yapar. **Satın alma** ise alış sipariş girişi yapar."

İkisi ayrı belgeler ve ayrı ekranlar olmalı:

| düğme | ne yapar |
|---|---|
| **Alış Fişi** | siparişsiz, doğrudan cariden alım — stok ve cari anında hareket eder |
| **Satın Al** | **alış siparişi** girer — henüz mal yok, söz var |

**Doğru düzeltme (v1.126.0):** malzeme, hammadde ihtiyaç ekranına **miktarsız bir satır** olarak
ekleniyor (`serbestMi: true`). Kullanıcı miktarı kendisi yazıp alış SİPARİŞİNİ buradan
oluşturuyor — ekranın işi zaten bu. Ekran açılıyor, malzeme listede, ama alış fişi açılmıyor.

- Serbest satır yalnızca MRP'de karşılığı OLMAYAN renk/beden için ekleniyor; aynı hücre iki kez
  listelenirse kullanıcı hangisine miktar yazacağını bilemez.
- `satinAlma` nesnesi elle uydurulmuyor, gerçek hesaplayıcıdan alınıyor — ilk denemede bir alanı
  (`acikFisler`) unutmak çalışma anında hataya yol açtı.

**Ders:** bir düğme HER ZAMAN bir şey açmalı. "Koşul sağlanmadı, kapat" davranışı kullanıcıya
uygulamanın bozuk olduğunu düşündürüyor; doğru hamle ya işi yapmak ya da yapılabilecek en yakın
şeyi açmak.

**Doğrulama:** `test/senaryo-satin-al-dugmesi.js` — açığı olan ama planlamada karşılığı olmayan bir
malzemede düğmeye basılıyor; **hammadde ihtiyaç (alış siparişi) ekranının açıldığı**, malzemenin
listede olduğu ve **alış FİŞİ ekranının açılmadığı** ölçülüyor. Üç iddia birlikte, çünkü asıl hata
"bir şey açılmaması" değil "YANLIŞ ŞEYİN açılması"ydı.

### 5n. DEPODA "ALIŞ FİŞİ" GERÇEKTEN FİŞ AÇIYOR (4 Eylül, v1.127.0)

**Kullanıcı:** "Bizim doğrudan alış fişi girişi ekranımız yok! Alış fişine tıklayınca alış siparişi
oluşturuyor. Ve kontrol yok, 2. kez alış fişine tıklıyorum yine aynı miktarları ekliyor. Satın alma
doğru çalışıyor ve kontrol var."

**İki ayrı hata vardı ve ikisi de bendeydi:**

1. **Depo'daki "Alış Fişi" düğmesi `depo-alis` penceresini açıyordu ve o pencere SİPARİŞ formunu
   çiziyordu.** Yani fiş düğmesi sipariş üretiyordu. Kullanıcının ayrımı:
   - **alış fişi** → sipariş olmadan doğrudan cariden alım (mal elde, borç doğdu)
   - **satın al** → alış siparişi girişi (henüz mal yok, söz var)

   Artık cari kartındaki ile **AYNI fiş ekranı** açılıyor (`stok-fisi`, tip Alış). İkinci bir
   "alış girişi" ekranı yazmak, ikisinin zamanla ayrışması demekti.

2. **Çift kayıt koruması yoktu.** Her basış yeni bir sipariş üretiyor, aynı miktarlar tekrar
   ekleniyordu. Yeni pencere anahtarı **cari + tip**: ikinci basışta yeni form değil, yarım kalan
   form geri geliyor (`depoPencereAc` — cari kartındaki fiş penceresinde zaten kullanılan mekanizma).

**Planlama bu alımı görür.** Kullanıcı "alış girişi yapıldığında planlama bunu kontrol etmeli"
dedi; ayrı bir bağ kurmaya gerek yok: fiş stoğu ANINDA artırıyor, MRP de ihtiyacı mevcut stoktan
hesaplıyor. Tek gerçek kaynak stok.

**Tedarikçi:** malzemenin kartında varsayılan tedarikçi tanımlıysa fiş onunla açılıyor; yoksa
ekranda tedarikçi seçiliyor.

### 5o. FİŞTE CARİ SEÇİMİ VE ÖN DOLU ÜRÜN (4 Eylül, v1.128.0)

**Kullanıcı:** "Ekran açılıyor. Bir de satın almada cari seçimi var ama alış fişinde yok; cari
seçimi olsun, başka cariden alım için. Diğer eksikle beraber yapalım."

**1. Cari seçimi forma eklendi.** Fiş cari kartından açıldığında cari zaten belliydi, seçim
gerekmiyordu. Depo'dan açıldığında ise tedarikçi malzemenin varsayılanından geliyor ve başka bir
cariye çevirecek yer yoktu. Aynı iş iki ekranda farklı davranıyordu (satın almada seçim vardı).
Seçim formun EN BAŞINDA: fişin kime yazılacağı, tarihten de fiş numarasından da önce gelen karar.

**Kayıt seçilen cariye yazılıyor.** Eskiden kayıt, pencerenin AÇILDIĞI cariye gidiyordu; formdaki
seçim yok sayılırdı. Artık cari fişin bir parçası ve kaydeden taraf onu okuyor. Cari seçilmeden
kaydet düğmesi kapalı.

**2. Depo'dan gelen ürün/renk ön dolu geliyor** (önceki sürümde eksik bırakılmıştı). Pencere
başlığında ürün adı yazıyor ama form boş açılıyordu; kullanıcı Depo'da gördüğü malzemeyi formda
yeniden aramak zorundaydı.

**Doğrulama:** `senaryo-satin-al-dugmesi.js` — cari seçim kutusunun BULUNDUĞU ve Depo'dan gelen
ürünün seçili GELDİĞİ ölçülüyor.

**Doğrulama:** `senaryo-satin-al-dugmesi.js` — Depo'daki "Alış Fişi" düğmesine basılınca
**"CARİ · ALIŞ FİŞİ"** ekranının açıldığı ve **sipariş formunun açılmadığı** ölçülüyor.
İkinci basış tarayıcıda ölçülmüyor (pencere tam ekran açıldığı için şerit gizleniyor); koruma
`depoPencereAc` anahtarından geliyor.

### 5p. İHTİYAÇ ADETLERİ VE BAŞLIK (4 Eylül, v1.129.0)

**Kullanıcı:** "Adetler iki tarafta da sıfır geliyor, ihtiyaç adetlerini de çeksin. Ayrıca alış
fişinde en üstte cari yazıyor, değişince o bilgi değişmiyor — farklı cariye yazıyor ama."

**1. İhtiyaç adetleri ön dolu geliyor.** Depo satırındaki AÇIK miktarlar beden kutularına
yazılıyor. Ürün seçili gelip adetlerin sıfır kalması, kullanıcıya Depo'da gördüğü sayıları elle
kopyalatıyordu — bağlamın yarısı taşınıp yarısı bırakılmıştı. Değerler değiştirilebilir: alım
ihtiyaçtan farklı olabilir (tedarikçinin minimum sipariş adedi, yuvarlama).

**2. Cari değişince pencere başlığı da değişiyor.** Kayıt doğru cariye gidiyordu (v1.128.0) ama
üstteki başlık açılıştaki cariyi göstermeye devam ediyordu. **Ekranın kayıtla çelişmesi**, kullanıcıya
"hangisi doğru" sorusunu sorduruyor — sayı doğru olsa bile güveni bozuyor. Form cari değişimini
yukarı bildiriyor, pencere hem başlığını hem kayıt hedefini güncelliyor.

**Doğrulama:** `senaryo-satin-al-dugmesi.js` — AÇIĞI OLAN satırdan açılıyor (ön dolum ancak açık
varsa ölçülebilir); miktar kutularında sıfırdan büyük değer bulunduğu ve cari değiştirilince yeni
carinin başlıkta göründüğü ölçülüyor.

### 5r. DEPO SATIRINDA DURUM ROZETİ (4 Eylül, v1.130.0)

**Kullanıcı:** "Satınalma veya alış fişi hangisi yapılır ise rozet ekle ve diğerini kaldır. Alış
fişi ile giriş yapıldığında eksik kalmamıştır; satınalma siparişi yapılmış ise alış fişi de
olacaktır."

Satırın **üç durumu** var ve her birinde yapılacak iş farklı:

| durum | görünen |
|---|---|
| açık var, sipariş yok | **Satın Al** + **Alış Fişi** (iki yol da açık) |
| sipariş verilmiş (yolda) | **sipariş verildi · N** rozeti + yalnızca **Alış Fişi** |
| açık yok, yolda yok | **karşılandı** rozeti, düğme yok |

Mantık kullanıcının cümlesinden birebir: alış fişi girildiyse eksik kalmaz (rozet, düğme yok);
sipariş verildiyse mal gelince yine alış fişi kesilecek (o düğme kalır, "Satın Al" kalkar).

**Neden düğmeyi gizlemek gerekiyordu:** sipariş verilmiş bir malzemede "Satın Al"ı göstermek
ikinci siparişe davetti — bu oturumda zaten çift rezervasyon hatası yaşandı (bkz. 4t).
Yapılamayacak işin düğmesini göstermek, olmayan bir seçenek sunmaktır.

**Doğrulama:** `senaryo-satin-al-dugmesi.js` — açığı olan satırda iki düğmenin bulunduğu ve rozet
olmadığı; açığı olmayan satırda "karşılandı" rozetinin bulunduğu ve hiçbir düğme olmadığı
ölçülüyor.

### 5s. "DEPODAKİ HER ŞEY" GERÇEKTEN HER ŞEY (4 Eylül, v1.131.0)

**Kullanıcı:** "Şu anda ihtiyacı olmayan ürünler görünmüyor. Depoda stoğu olan — stok dahil çeksin,
yanında alış ve satın al dursun, pratik oldu. Bu kadarı yeterli."

Hareketi olmayan (stok 0, talep 0, yolda 0) renk/bedenler HER süzgeçte eleniyordu. Süzgecin adı
"depodaki her şey" iken bir kısmını gizlemek sözü tutmamaktı. Ayrıca hiç hareketi olmayan bir
malzeme için de alış yapılabilir (stok tazeleme, yeni renk açma) — düğmeler zaten satırda.

Eleme yalnızca daraltıcı iki süzgeçte kaldı: **açığı olanlar** ve **rezervasyonlu**.

> ### KAPSAM KARARI — DEPO BU KADAR (kullanıcı, 4 Eylül)
> Oturumun sonunda kullanıcı kapsamı kendisi çizdi: *"Biz depo mantığından çıktık, hammadde
> planlıyoruz. Depo için stoktaki malları rahat görebilmemiz yeterliydi… Bence kötü olmadı, daha
> ileri gitmesin, depo yeter. Bu kadarı yeterli."*
>
> **Depo ekranı planlama tablosunun üstüne kurulu** ve öyle kalıyor: talep/ayrılan/açık sütunları,
> Satın Al ve Alış Fişi düğmeleri, durum rozetleri. Kullanıcı bunu pratik buldu.
>
> **BİR SONRAKİ OTURUM İÇİN:** depoyu "sade stok görünümü"ne ayırma önerisi SUNULDU ve
> REDDEDİLDİ. Tekrar önerme. Bu tabloya dokunurken tek ölçüt şu: "stoktaki malları rahat görmek"
> bozuluyor mu? Yeni sütun/kavram eklemek bu ekranı ağırlaştırır; bu oturumda sütun adları dört kez
> değişti ve bunun sebebi ekranın iki işi (depo + planlama) birden yapmasıydı.

### 5u. TEK ÜRÜN TEK SATIR (4 Eylül, v1.133.0)

**Kullanıcı (5t'yi netleştirdi):** "Tek stok tek satırda olacak; renk, beden, boyut tıklayınca
açılıp detay verecek. Örn. stoğu 14 adet ise — renk ve bedenler dahil — 14 gösterecek, kullanıcı
stok üzerine tıklayınca hangi renk hangi beden orada görünecek."

**5t yarım kalmıştı:** beden sütunları gizlendi ama satırlar hâlâ `ürün + renk` bazındaydı. Üç
renkli bir malzeme listede üç satır kaplıyor, "bu üründen toplam kaç var" sorusu satırları gözle
toplamayı gerektiriyordu.

Gruplama artık **yalnızca ürün** bazında. Satırda ürünün TOPLAM stoğu (bütün renk ve ölçüler
dahil) duruyor; yanında `3 renk · 9 ölçü — detay için tıklayın` özeti var. Tıklanınca alt katman
açılıyor ve kırılım `renk · beden` satırları hâlinde orada.

Beden sütunları grup satırından **tamamen** kalktı: bir üründe birden çok renk olduğu için aynı
beden birden çok kez geçiyor ve tek satıra sığmıyordu. Ayrıntının yeri alt katman.

**Doğrulama:** `senaryo-satin-al-dugmesi.js` — iki renkli "Deri" için listede **tek satır**
bulunduğu, özet hücresinin `N renk · N ölçü — detay için tıklayın` yazdığı ve tıklanınca detayın
açıldığı ölçülüyor.

### 5t. BEDEN SÜTUNLARI TIKLAYINCA AÇILIYOR (4 Eylül, v1.132.0)

**Kullanıcı:** "Stok renk/beden/boyut detayına tıklayıp aşağı açsın, detayı oradan görelim, çok
kalabalık oldu."

Depo satırı her beden için bir hücre taşıyordu. Dokuz bedenli bir üründe satır dokuz hücreyle
uzuyor, asıl bakılan şeyler (malzeme adı, stok, açık, düğmeler) sıkışıyordu.

Kapalı satırda artık tek bir özet hücre var: **"N ölçü · detay için tıklayın"**. Satıra tıklanınca
ZATEN VAR OLAN alt katman tablosu açılıyor ve bütün bedenler tam sütunlarıyla orada duruyor.
Bilgi kaybolmuyor, bir tık ötesine geçiyor — bu ekranın kuruluş ilkesi zaten buydu (üst katman
"ne var", alt katman ayrıntı), beden hücreleri o ilkeye uymuyordu.

Tek ölçülü malzemeler (beden'i olmayan hammaddeler) zaten ayrı "tekil" tabloda ve beden sütunu
taşımıyor; onlar değişmedi.

**Doğrulama:** `senaryo-satin-al-dugmesi.js` — satıra tıklanınca detay tablosunun açıldığı
ölçülüyor. Kapalı özet hücresi bu senaryoda ölçülmüyor: verideki malzeme tek ölçülü olduğu için
"tekil" tabloya düşüyor.

### 5v. ÜRÜN KARTINDA BARKODLAR SEKMESİ (4 Eylül, v1.134.0)

**Kullanıcı:** "Stok barkodlarını stok içinde görebileceğimiz sekme yapalım stok içerisine."

Çift barkodları varyantların üstünde saklanıyordu ama YALNIZCA etiket basarken görülüyordu.
"Bu ürünün 38 numarasının kodu ne" ya da tersinden "bu kod hangi ürün" sorusunun bakılacak yeri
yoktu. Ürün kartına **Barkodlar** sekmesi eklendi: renk · ölçü · barkod · stok.

Kodu atanmamış varyantlar kırmızı "kod atanmamış" ile görünüyor — eksik olduğu fark edilsin
(kod atama Paketleme ekranındaki toplu düğmeden yapılıyor).

### 5y. ASORTİ BARKODU (4 Eylül, v1.135.0)

**Kullanıcı:** "Sipariş giriş ekranında barkod okut bölümü olsun ve okutulan ürün asorti kadar
eklensin. Sonradan asorti katları veya adet düzenlemek için satır düzenlemek de gerekli."

**YENİ DEFTER AÇILMADI.** Kod, zaten var olan iki kimlikten türetiliyor:
`A-<varyant barkodu>-<asorti id>` → varyant barkodu ürün+rengi, asorti id beden dağılımını verir.
Saklanacak yeni kayıt yok; okutulunca iki taraf da mevcut veriden çözülüyor. Yeni bir defter,
değişmez kural gereği yazma + geri alma + çöp + silme testi + bulut tablosu (yazma VE okuma)
yükü getirirdi — burada karşılığı yoktu.

**Basma:** ürün kartı → Barkodlar sekmesi. Her renk × asorti için bir satır: kod, çift sayısı ve
6×4 cm etiket yazdırma düğmesi. Etikette dağılım da yazılı (`36:1 37:2 38:2 39:2 40:1`).
Rengin çift barkodu atanmamışsa kod üretilmiyor, sebebi yazıyor.

**Okutma:** sipariş giriş ekranının üstünde okutma kutusu. Okutulunca asortinin dağılımı KALEM
olarak ekleniyor. **Aynı kodu tekrar okutmak miktarları artırıyor** — asorti katı böyle oluşuyor,
ayrı bir "kaç kat" kutusuna gerek kalmadı. Eklenen satırlar normal kalemler; adetler aşağıdaki
listeden tek tek düzenlenebiliyor (kullanıcının istediği "sonradan düzenleme").

**Üründe olmayan beden sessizce atlanmıyor:** asortide 41 var ama üründe yoksa o beden eklenmiyor
ve bildirimde söyleniyor. Olmayan bedene sipariş yazmak, karşılığı üretilemeyecek bir satır demek.

**Doğrulama:** `test/birim-asorti-barkod.js` — 10 iddia: kod biçimi, kullanıcının örneğindeki
dağılımın (8 çift) birebir çözülmesi, olmayan bedenin atlanıp bildirilmesi, tanınmayan
varyant/asorti ve çift barkodunun asorti sanılmaması.

> ### ESKİ NOT — ASORTİ BARKODU TASARIM SORUSU (çözüldü, v1.135.0)
> **İstek:** "Barkod ile sipariş için asorti barkodu oluşturalım. Örn. 125 model siyah renk
> 36:1, 37:2, 38:2, 39:2, 40:1 — toplam 8 çift içeriğinde barkod; fuarlarda sipariş alırken
> okuttuğumuzda siparişe eklemesi için."
>
> **YAPILMADI.** Sebep: karar gerektiren bir veri modeli sorusu var ve oturumun sonunda aceleyle
> seçilmemeli. Asorti barkodu şunları bağlamak zorunda: **ürün + renk + asorti dağılımı**.
> Üç seçenek:
> 1. **Ürün kaydında** (`urun.asortiBarkodlari`) — yeni tablo gerekmez ama stok şemasının bu
>    alanı koruduğu DOĞRULANMALI (şema belirli sütunlar yazıyor, fazladan alanlar düşebilir).
> 2. **Asorti tanımında** (tanimlar.asortiler içinde renk+ürün bağı) — asorti zaten bir tanım;
>    ama aynı asorti farklı ürün/renklerde kullanılıyor, bağ orada tekilleşmez.
> 3. **Yeni defter** (`asorti_barkod`) — en temiz ama değişmez kural gereği yazma + geri alma +
>    çöp + silme testi + bulut tablosu (yazma VE okuma) ile birlikte gelmeli.
>
> Okutma tarafı da tasarlanmalı: kod okutulunca hangi ekranda ne olacak — satış siparişi formunda
> kalem olarak mı eklenecek, yeni sipariş mi açılacak?
>
> **Sıradaki oturumun ilk işi bu olabilir; önce seçenek kullanıcıya sorulmalı.**

### 6a. BARKOD ŞEMASI — KARARLAR (5-6 Eylül, KAPANDI)

Kullanıcının önerisi: *"Barkod oluştururken bir hikâyeye göre oluştursun. Stoğumuz 3. stok,
renk kodumuz 1021 siyah, bedenimiz 36 numara. Barkod hep 90 ile başlasın."*

Sorulan üç karar ve **alınan cevaplar**:

| soru | cevap |
|---|---|
| Seviye hanesi kullanılsın mı? | **Hayır** — dört seviyenin uzunlukları farklı, ayrım oradan |
| Stok no kaç hane? | **4 hane** (9999) |
| Eski `A-<varyantBarkod>-<asortiId>` biçimi? | **Temiz geçiş** — eski biçim tanınmayacak |

Kullanıcı birinci soruyu farklı bir tasarımla cevapladı ve bu tasarımı belirledi:

> *"Renk, beden, stok hepsinin arka planda kodu olsun. Örn: 42 no beden aslında 04 nolu beden gibi.
> Bu işleri kullanıcı da görsün ama değiştiremesin. Daha anlamlı olur."*

Ayrıca **kodlar sistem tarafından sırayla atanır** (kullanıcı elle girmez).

**"Üçüncü ölçü (boyut) şemada yok" endişesi geçersizdi.** Boyut ayrı bir eksen değil:
`tanimlar.bedenler` listesinin İÇİNDE `tip: "Boyut"` olarak duruyor (130-tanimlar.jsx:441) ve
varyantın `beden` alanı ikisinden birini taşıyor. Ölçü kodu `bedenler[]`e yazıldığı için boyut da
otomatik kapsanıyor, aynı numara havuzundan. Bu soru kapandı, tekrar açılmasın.

### 6b. KALICI BARKOD ŞEMASI (6 Eylül, v1.136.0)

```
90 + stok(4)                        900003          6 hane   sadece stok
90 + stok(4) + renk(4)              9000031021     10 hane   stok + renk
90 + stok(4) + renk(4) + beden(2)   900003102104   12 hane   + beden
90 + stok(4) + renk(4) + asorti(3)  9000031021225  13 hane   + asorti
```

**UZUNLUKLAR ŞEMANIN PARÇASI.** Seviye hanesi yok; dört uzunluk farklı olduğu için kod hangi
seviyede olduğunu uzunluğuyla söylüyor. Bir alanın hane sayısı değişirse iki seviye çakışır ve kod
çözülemez. Hane sayıları TEK YERDE (`KOD_HANE`) duruyor, uzunluklar oradan hesaplanıyor ve
`birim-barkod-semasi.js` dört uzunluğun farklı olduğunu ayrıca ölçüyor — hane değişirse önce o
iddia kırılsın.

**Dört kalıcı kod alanı.** Hepsi bir kez atanır; kayıt yeniden ADLANDIRILINCA DEĞİŞMEZ.

| alan | hane | nerede | buluta nasıl gidiyor |
|---|---|---|---|
| stok no | 4 | `urun.stokNo` | **yeni sütun** — `barkod-semasi.sql` |
| renk kodu | 4 | `tanimlar.renkler[].barkodKodu` | `tanimlar` tek JSON satırı, kendiliğinden |
| ölçü kodu | 2 | `tanimlar.bedenler[].barkodKodu` | aynı (beden VE boyut) |
| asorti kodu | 3 | `tanimlar.asortiler[].barkodKodu` | aynı |

**Sayaçlar `tanimlar.kodSayaclari` içinde ve GERİ GİTMİYOR.** Bir kaydı silmek numarasını serbest
bırakmaz. Sayaç tutulmasaydı en yüksek numaralı renk silindiğinde o numara bir sonraki renge
verilirdi ve basılmış etiket başka rengi gösterirdi.

**Atama iki yoldan:** yeni bir renk/ölçü/asorti tanımlandığı anda (`saveTanimlar` içinde), ve
Paketleme ekranındaki "Eksik kodları ata" düğmesiyle toplu (stok noları da orada atanıyor).
Aynı fonksiyon (`kodlariAta`) — iki ayrı atama mantığı, ayrışacak iki mantık demekti.

**Aralık dolarsa sessizce sarmıyor, söylüyor.** En dar aile 2 haneli ölçü (99). Sarmak, aynı kodu
iki kayda vermek ve basılmış etiketin yanlış malı göstermesi demek.

**Ekranlar:** Tanımlar'da renk/beden/boyut/asorti satırlarının yanında kod rozeti — **görünür ama
salt okunur** (kullanıcı kararı). Ürün kartı → Barkodlar sekmesinde stok no, renk kodu, ölçü kodu
ve kurulan barkod bir arada; ürün barkodu (renksiz) ve her renk × asorti için etiket düğmesi.
Sipariş ekranındaki okutma kutusu artık dört seviyeyi birden okuyor: asorti kodu dağılımı toptan
ekliyor, 12 haneli kod TEK ÇİFT ekliyor, renksiz/bedensiz kodlar kalem üretmiyor ve sebebini
söylüyor.

**KALDIRILANLAR (temiz geçiş kararı):** `variant.barkod` (`8xxxxxxx`), `varyantBarkoduAta`,
`barkodlaVaryantBul`, `asortiBarkoduKur`, `asortiBarkoduCoz`, `test/birim-asorti-barkod.js`.
O biçimlerle basılmış etiket varsa **yeniden basılmalı**.

#### Bu işte çıkan ÜÇ HATA (tekrarlamamak için)

**1. `variant.barkod` BULUTA HİÇ GİTMİYORDU — değişmez kuralın altıncı ihlali.**
`TABLO_SEMA.urunler.cocuklar.varyantlar` sütunları tek tek sayıyor (`urun_id, renk, renk_id,
beden, miktar, min_stok`); `barkod` orada YOKTU, okuma tarafında (045-oku) da yoktu.
`SUPABASE_URL` kodda gömülü olduğu için `supabaseAcikMi()` her zaman doğru ve açılışta
`setStok(damga.urunler)` bulut kopyasıyla yereli EZİYOR. Sonuç: v1.135.0'da atanan çift barkodları
yalnızca o oturum yaşıyordu; toplu atama tekrar çalıştırılınca sayaç baştan başlıyor ve **aynı kod
başka varyanta düşebiliyordu**. Türetilmiş asorti barkodu da buna bağlı olduğu için birlikte
çürüyordu.
> **Denetim 7 bunu göremez.** Şemadaki SÜTUNDAN uygulamadaki alana bakıyor; hiç sütunu olmayan bir
> alanı göremiyor. **Açık iş:** denetim 7'ye ters yön eklenmeli — "kalıcı diye tarif edilen bir
> alanın şemada karşılığı var mı".
>
> **Kural:** kalıcı olması gereken her yeni alan için ÖNCE `TABLO_SEMA`ya ve okuma tarafına bak.
> "Şema fazladan alanı korur" varsayımı bu projede İKİ KEZ yanlış çıktı (`olusturuldu`, `barkod`).

**2. `renk.kod` ZATEN DOLUYDU — az kalsın kullanıcı verisi ezilecekti.**
Barkod kodunu `tanimlar.renkler[].kod` alanına yazıyordum. O alan kullanıcının elle girdiği TON
KODU ("aynı isimli farklı tonları ayırt etmek için", `onRenkTonKoduChange`), ve `130-tanimlar.jsx`
kombinasyon kodu önerirken oradan sayısal değer okuyor (satır 54, 68). Yazsaydım kullanıcının
kodları ezilir, tersinden elle yazılmış "101" barkod kodu sanılırdı. Alan `barkodKodu` olarak
ayrıldı; `birim-barkod-semasi.js` ton kodunun korunduğunu ölçüyor.
> Bu, notun "değiştirmeden önce o alanı/biçimi kullanan HER YERİ ara" kuralının ihlaliydi.
> Yazmadan önce `grep -rn "\.kod\b" src/` yapılsaydı ilk denemede görülürdü.

**3. Bildirimler 200 ms'de kayboluyordu.** `showToast` her çağrıda yeni bir 2200 ms zamanlayıcı
kuruyor ama ÖNCEKİNİ iptal etmiyordu; eski bildirimin sayacı dolduğunda ekrandaki YENİ bildirimi
siliyordu. Art arda barkod okutulduğunda "Tanınmayan barkod" uyarısı görünüp anında kayboluyordu —
fuarda hızlı okutan biri hiç göremezdi. `useRef` ile önceki zamanlayıcı iptal ediliyor.
> Bu hatayı denetleyici değil, senaryo testi yakaladı: uyarı 120 ms'de vardı, 320 ms'de yoktu.

#### Yeni şemanın GÖRÜNÜR bir sonucu

Barkod tanımlı renk/ölçü kodundan kurulduğu için, **tanımlarda olmayan** bir renk/beden artık
barkod ALAMIYOR (eski şemada kod varyantın üstüne yazıldığı için alabiliyordu). Paketleme'deki
uyarı bu yüzden sebebi AYIRIYOR:
- "kod atanmamış" → düğme çözer
- "Tanımlar'da yok — renk: Beyaz" → yalnızca kullanıcı tanım ekleyerek çözer, düğme çözemez

Ayrımı göstermeyip tek düğme koymak, basınca hiçbir şeyin değişmediği bir düğme olurdu (bkz. 5m,
"Satın Al çıkmaz sokaktı").

#### Doğrulama

- `test/birim-barkod-semasi.js` — 44 iddia: şemanın kendisi (dört uzunluğun çakışmaması), kod
  atama, ikinci atamanın kod değiştirmemesi, ad değişince kodun sabit kalması, silinen numaranın
  geri verilmemesi, ailenin dolması, ton kodunun korunması, dört seviyenin çözülmesi, boyut
  ölçüsünün kendi kodunu kullanması, 12 tanınmayan-kod durumu.
- `test/senaryo-barkod-siparis.js` — gerçek tarayıcıda uçtan uca: kodları ata → barkodu kur →
  sipariş ekranında okut. İki asorti katı + bir tek çift = 36:2 37:4 38:5 39:4 40:2, **17 çift**.
  Renksiz/bedensiz kodlar kalem üretmiyor, tanınmayan kod bildiriliyor.
- `senaryo-paketleme.js` ALTIN ÇIKTI DEĞİŞTİ. **Gerekçe:** ölçtüğü alan (`variant.barkod`) artık
  yok. `barkodsuzKalan` yerine `kodDurumu` geldi: stok nosuz ürün, kodsuz renk, kodsuz ölçü, stok
  nolarının benzersizliği ve tanımsız sebebin ADIYLA yazılması. Tohuma "Bej/37/38" tanımları
  eklendi ki kutu etiketinde barkodun gerçekten basıldığı ölçülebilsin (`barkodVar: 6`).
- Veri tutarlılık motoruna `BARKOD_KOD_CAKISMASI` denetimi eklendi: aynı numara iki kayda düşerse
  yakalar. Uygulama tekilliği koruyor ve stok noyu veritabanı indeksi de koruyor, ama tanım kodları
  tek JSON satırında olduğu için indeksle korunamıyor.

#### 6c. KOD ETİKETLERİ ADIYLA ANILIYOR (6 Eylül, v1.137.0)

**Kullanıcı:** *"Otomatik verilen kodlarda 'kod' değil. Renk kodu, beden kodu v.s olmalı."*

Haklıydı. Ürün kartının Barkodlar sekmesinde İKİ SÜTUN da "KOD" yazıyordu; hangisinin renk
hangisinin ölçü kodu olduğu ancak sırasından anlaşılıyordu. Tanımlar'daki rozetler de "kod yok"
diyordu — ekranda üç ayrı kod ailesi varken hangisinin eksik olduğunu söylemiyordu.

Kodun ADI, kodun kendisi kadar önemli: barkodun hangi parçasını doldurduğunu söyleyen tek şey o.

- Ürün kartı sütunları: `RENK KODU`, `ÖLÇÜ KODU`. Kurulamayan barkod "kod eksik" değil
  **"barkod kurulamıyor"**.
- Tanımlar rozetleri kendi adlarını taşıyor: `Renk kodu: 0001`, `Beden kodu: 04`,
  `Boyut kodu: 07`, `Asorti kodu: 001`. Eksikse "Renk kodu yok" gibi.
- `TanimListesi` propu `barkodKoduHane={4}` yerine `barkodKodu={{ ad: "Renk kodu", hane: 4 }}`:
  ad ile hane birlikte geçiyor, ikisi ayrışamıyor.
- Atama bildirimi: "stok no 2, renk kodu 3, ölçü kodu 7, asorti kodu 1". Aralık dolduğunda da
  aile adı okunabilir yazılıyor ("ölçü kodu"), iç ad değil ("beden").

#### 6d. "STANDART" YER TUTUCUSU İÇİN AYRILMIŞ KOD (6 Eylül, v1.138.0)

**Kullanıcı ekran görüntüsü gönderdi: "Barkod oluşturmamış."** — "Deri" hammaddesinde renk kodları
atanmış (0006, 0005…), stok no atanmış (0011), asorti barkodları kurulmuş; ama ÖLÇÜ KODU "—" ve
çift barkodu "kod eksik". Ölçü: `Standart`.

**Sebep tasarımdaydı.** `"Standart"` bir tanım DEĞİL, uygulamanın renksiz/ölçüsüz stok kartlarına
(tutkal, toka, çelikli taban) doğrudan yazdığı YER TUTUCU — `152-stok.jsx:61,136-137`.
`tanimlar.bedenler` içinde karşılığı yok ve OLMAMALI: kullanıcının her ölçüsüz malzeme için
"Standart" diye bir beden tanımlaması anlamsız olurdu. Yeni şema kodu tanımdan aldığı için bu
duruma karşılık üretmiyordu.

**Çözüm: 0 numarası ayrıldı.** Kod atama 1'den başlıyor, yani 0 hiçbir kayda verilmiyor.
Ölçüsüz malzemenin barkodu `90 · stok · renk · 00`, renksiz VE ölçüsüz olanınki
`90 · stok · 0000 · 00`. Kullanıcı gerçekten "Standart" adında bir renk/beden tanımlarsa o tanımın
kendi kodu kazanır — arama önce tanıma bakıyor, yer tutucuya sonra düşüyor.

**Buna bağlı iki incelik:**
- `renkKoduBul` / `bedenKoduBul` artık "kod yok" için **null** dönüyor, sıfır değil. Sıfır geçerli
  bir kod olduğu için ikisini tek değere ezmek, kodu atanmamış bir rengi ölçüsüz sanmak demekti.
  Çağrı yerlerinde `!kod` yerine `kod === null` kullanılıyor.
- `kodMetni` null/undefined/"" değerlerini ÖNCE eliyor: `Number(null)` sıfır veriyor ve kodu
  atanmamış bir kayıt ayrılmış "Standart" kodunu almış gibi görünürdü.
- `barkodEksikleri` "Standart"ı eksik SAYMIYOR; Paketleme uyarısında "Tanımlar'da yok" listesine
  girmiyor.

`birim-barkod-semasi.js` bu durumu birebir ölçüyor (ölçüsüz, renksiz+ölçüsüz, çözme, eksik
sayılmaması, tanımlanmış "Standart"ın kendi kodunu alması).

#### TUR SÜRESİ — NEDEN UZUYOR, NE YAPILDI (15 Eylül)

**Kullanıcı:** *"Neden artık yavaşladın? Uygulama ilerledikçe yavaşlıyorsun. Nasıl hızlandırırsın?"*

**Sebep (ölçüldü):** her turda tam koşu çalıştırılıyor ve sonucu bekleniyor. Senaryo sayısı 20'den
62'ye çıktı; her senaryo kendi Chromium'unu açıyor ve SIRAYLA çalışıyordu → tek koşu ~13–15 dakika.
Kod yazmak değil, beklemek uzatıyordu.

**Yapılan:** `kosu.sh` senaryoları **paralel** çalıştırıyor (`xargs -P`, varsayılan 4 iş;
`KOSU_IS=6 ./kosu.sh` ile artırılabilir). Ölçüm: 62 senaryo **383 sn (~6,5 dk)** — yarı yarıya.
Senaryolar birbirinden bağımsız (her biri kendi depo tohumu + kendi tarayıcısı), paylaşılan durum yok.

**Çalışma biçiminde de değişiklik:** küçük ve yerel değişikliklerde (metin, renk, tek hücre) önce
YALNIZ etkilenen senaryolar çalıştırılıyor, tam koşu tur sonunda bir kez. Davranışa dokunan
değişikliklerde (kayıt yolu, fiş, planlama) tam koşu her zaman.

**Sıradaki hızlandırma seçenekleri (yapılmadı):** tarayıcıyı senaryolar arasında yeniden kullanmak
(tohum izolasyonunu bozma riski), ağır senaryoları bölmek, paket adımını tur başına bir kez yapmak.

## UYARI (TOAST) SÜRESİ (15 Eylül, v1.305.0)

**Kullanıcı:** *"Uyarılar çok kısa sürüyor. Üzerine tıklayınca kapansın, okunmuyor."*

Süre sabit **2,2 sn** idi; kısa bir cümleye bile yetmiyordu, "kur bulunamadı", "fiş kaydedilemedi",
onarım özetleri gibi uzun uyarılar hiç okunamıyordu. Artık:
- süre **uzunluğa göre**: 4 sn + her 20 karakter için 1 sn, en çok 12 sn;
- **üzerine dokununca kapanıyor** (sağda × işareti, ipucu "Kapatmak için dokunun");
- mobil düzende **tam genişlikte ve alt çubuğun üstünde**: köşedeki küçük kutu telefonda hem
  görünmüyor hem sığmıyordu. Satır aralığı açıldı, en fazla 420px (masaüstü).

**Doğrulama:** `senaryo-mobil-gorunum` — uyarı 2,8 sn sonra hâlâ ekranda (eski süreyi aştı),
üzerine dokununca kapanıyor.

## OTURUM SÜRDÜRME (15 Eylül, v1.306.0)

**Kullanıcı:** *"Sayfa yenilendiğinde tekrar kullanıcı adı ve şifre girmemi istiyor."*

`aktifKullanici` yalnız bellekteydi. Artık oturum yerelde saklanıyor (`oturum:aktif`):
**kullanıcı KİMLİĞİ + giriş zamanı + kimliğin bulut mu yerel mi olduğu. ŞİFRE SAKLANMIYOR.**
Açılışta kullanıcı, tanımlardaki listeden kimliğiyle bulunuyor.

**12 saat sınırı:** atölye bilgisayarı paylaşılan bir cihaz olabilir; süresiz açık oturum, ertesi
gün başka birinin o kişinin adıyla işlem yapması demekti. 12 saat bir vardiyayı kapsıyor, ertesi
güne sarkmıyor. Süre dolunca kayıt siliniyor ve giriş isteniyor.

**Geçersiz sayılan durumlar:** kullanıcı listeden silinmiş ya da pasif; süre dolmuş; kullanıcı
"Çıkış" demiş (kayıt siliniyor); özel sekme (depo yok → oturum sürdürülemez, giriş istenir).

**Doğrulama:** `senaryo-oturum.js` (yeni) — giriş sonrası kayıt oluşuyor ve içinde şifre YOK;
yenilemede giriş istenmiyor; 13 saat eski oturumda giriş isteniyor ve kayıt siliniyor; listede
olmayan kimlikle oturum kabul edilmiyor.

## ADIM 3'ÜN TAMAMLANMASI (16 Eylül, v1.307.0)

Adım 3'te `siparisGerceklestir` hesap fonksiyonuna taşınmıştı ama **yan etkiler içeride
kalmıştı**: `setStok`, `setCariler` ve depolama bloğu hesap fonksiyonunun içinde, yani **fiş
defterine yazmadan ÖNCE** çalışıyordu. Defter yazımı reddedilse bile stok değişiyordu — Adım 3'ün
güvencesi kâğıt üstündeydi. Hepsi defter yazımından sonraya taşındı; hesap fonksiyonu artık saf.

> Altın çıktı değişti (`senaryo-fis-defteri`): fiş geri alındıktan sonra `karsilanan` ve varyant
> artık 0 görünüyor (önce 6 kalıyordu). Yeni değer doğru olan.

## KASA/BANKA HAREKETİNİN CARİYE YÖNÜ (17 Eylül, v1.312.0) — CİDDİ

**Kullanıcı:** *"Muhasebede kasadan girilen ödeme ile cari içinden girilen ödemeler farklı oluyor:
kasadan ödeme yapınca alacağa, cariden yapınca borca yazıyor."*

**Teşhis — kullanıcı haklı, gerçek bir kayıt hatası.** Muhasebe ekranından girilen hareket cariye
**sabit `yon: "Tahsilat"`** ile yazılıyordu. Yani kasadan ÇIKIŞ (ödeme) yapılsa bile cariye alacak
düşüyordu; aynı olay cari kartından girilince `hareketYonu("Ödeme")` → "Borç" oluyordu. İki ekran
aynı olayı TERS kaydediyordu ve bakiye hangi ekrandan girildiğine göre değişiyordu.

Kural `hareketYonu`da tek yerde yazılıydı (200-cari-sabit) ama muhasebe tarafı ona sormuyordu —
"tek kural, tek yer" ilkesinin delindiği bir nokta.

**Düzeltme:** yön artık aynı fonksiyondan geliyor:
- kasa/banka **Giriş** = tahsilat → cariye **"Alacak"** (cari borcu azalır),
- kasa/banka **Çıkış** = ödeme → cariye **"Borç"** (bizim borcumuz azalır).
Fiş ön eki de işlemin cinsini söylüyor: tahsilat `THS-`, ödeme `ODM-` (eskiden ikisi de THS-).

**Doğrulama:** `senaryo-kasa-cari-yon.js` (yeni) — kasa girişi: cari `Alacak`, fiş `THS`;
kasa çıkışı: cari `Borç`, fiş `ODM`. Tam koşu: 67 senaryo temiz.

> **KULLANICIYA:** bu hatadan önce muhasebe ekranından girilmiş ÖDEMELER cariye ters yazılmış
> olabilir. Cari ekstresinde yönü yanlış görünen ödeme varsa silip yeniden girmek gerekir; toplu
> düzeltme aracı YAZILMADI (hangi kaydın gerçekte ödeme olduğunu ayırt etmek için açıklama metnine
> güvenmek gerekirdi, o da kırılgan).

### TEK ÇEKİRDEK (v1.313.0)

**Kullanıcı:** *"...cari içinden kasa hareketi yapmak istediğinde kasa işlemlerini açsın AYNI KOD ile."*

`207-kasa-cari-ortak.jsx` eklendi: `kasaCariHareketiKur` hem cari hareketini hem kasa/banka
hareketini TEK yerde kuruyor — yön, fiş numarası, bağ kimliği, karşı taraf alanları, açıklama.
`kasaIslemTipi` / `kasaHesapYonu` iki ekranın sözlüğünü çeviriyor:
`kasa GİRİŞ = Tahsilat` ⇄ `kasa ÇIKIŞ = Ödeme`.

- **Muhasebe ekranı** cari hareketini artık elle kurmuyor, çekirdeği çağırıyor.
- **Cari kartı** yönü `hareketYonu(hareketTipi)`den, kasa yönünü `kasaHesapYonu`dan alıyor
  (eskiden ikisi de yerinde elle yazılıydı; v1.312.0'daki hata oradan çıkmıştı).

**Neden görsel birleştirme değil:** iki formun alanları farklı (cari formunda çek/senet, vade,
işlem tipi; kasa formunda hesap para birimi ve kur dönüşümü). Tek ekrana indirmek ikisinin de
alanlarını taşıyan büyük bir form demek ve bu turda riskliydi. **Hata sınıfını kapatan asıl adım
mantık birleştirmesiydi** — kayıt artık hangi ekrandan girilirse girilsin aynı fonksiyondan çıkıyor.

### KASA/BANKA SEÇİMİ ZORUNLU (v1.314.0)

**Kullanıcı:** *"Cariden kasa seçtirmeden giriş çıkış yapıyor. Tutar hangi deftere yazılıyor?"*

**Cevap: hiçbirine.** Hesap seçimi OPSİYONELDİ; boş bırakılınca yalnız cari hareketi yazılıyordu.
Para cari ekstresinde görünüyor ama hiçbir kasada/bankada görünmüyordu — kasa bakiyesi gerçeği
yansıtmıyor ve "bu para nereye girdi" sorusunun cevabı kayıtta bulunmuyordu.

- Ödeme/tahsilatta **hesap seçimi artık zorunlu**. Seçilmeden kaydedilemiyor; uygun para biriminde
  hesap yoksa "önce Muhasebe'den kasa/banka açın" deniyor. (Çek/senet hariç: çek kasaya girmez.)
- **Veri Denetimi'ne kural:** "Ödeme/tahsilatın kasa/banka karşılığı yok" (ORTA). Eski kayıtları
  bulmak için. **Otomatik onarım YOK** — paranın hangi hesaba gittiğini yalnız kullanıcı bilir,
  tahmin etmek yanlış kasayı şişirirdi. Kaydı silip yeniden girmek gerekiyor.

**Doğrulama:** hesapsız ödeme içeren veride denetim bulguyu üretiyor; `cari-kart`, `cari-bakiye`,
`kasa-cari-yon`, `fis` senaryoları değişmedi. Tam koşu: 67 senaryo temiz.

> **KALAN (isteğe bağlı):** görsel birleştirme — cari kartındaki Ödeme/Tahsilat formunun yerine
> doğrudan kasa hareketi formunun açılması. Mantık tek olduğu için artık yalnız bir düzen işi.

**Doğrulama:** `senaryo-kasa-cari-yon` aynı sonucu veriyor (giriş → Alacak/THS, çıkış → Borç/ODM);
`cari-kart` ve `cari-bakiye` senaryoları değişmedi. Tam koşu: 67 senaryo temiz.

## KASA EKRANI: İŞLEM ÇUBUĞU VE VİRMAN (17 Eylül, v1.315.0)

**Kullanıcı:** *"Üstten kasa seçildiğinde ilk olarak hareketleri getirsin. Hareketlerin üzerinde
ödeme, tahsilat, kasalar arası virman vs. yapabileceğimiz işlemler butonu olsun, tıklayınca güzel
butonları olsun, oralardan işlem yapalım."*

- **Hesap açılınca ilk görünen şey HAREKETLER.** Form artık varsayılan kapalı; eskiden ekranın
  üstünü form kaplıyor, hareketleri görmek için aşağı kaymak gerekiyordu.
- **İşlem çubuğu:** Tahsilat · Ödeme · Virman · Serbest kayıt. Seçilince form açılıyor ve YÖN
  KİLİTLENİYOR (tahsilat → Giriş, ödeme → Çıkış); kullanıcı ayrıca yön seçmiyor.
- **VİRMAN (yeni):** kasalar/bankalar arası aktarım. Kaynaktan çıkış, hedefe giriş, **tek yazma**,
  aynı `muhasebeBagId`, `VRM-` fişi. Cari YOK — para şirket içinde yer değiştiriyor, kimseye borç
  doğmuyor. Para birimi farklıysa **hedefe geçen tutar ayrıca soruluyor**: kur tahmin edilmiyor,
  döviz bozdurmada makas olur, gerçekte kaç para geçtiğini kullanıcı bilir.

**Yakalanan regresyon:** formu "işlem seçilince aç" haline getirirken hareket listesi de form
bloğunun içinde kalmıştı — işlem seçilmeden hareketler görünmüyordu. `senaryo-cek-iade-tahsil`
yakaladı (banka hareketini silme adımı düğmeyi bulamadı). Liste ayrı bloğa alındı.

**Doğrulama:** `senaryo-kasa-islemler.js` (yeni) — hesap açılınca form kapalı, hareketler görünür,
dört işlem düğmesi var; TL→USD virmanında hedef tutar soruluyor, TL kasaya `Çıkış:480:VRM`, USD
kasaya `Giriş:10:VRM`, ikisi aynı bağ kimliğinde. Tam koşu: 68 senaryo temiz.

## KASA HAREKETİ: DÜZENLE, ONAYLI SİLME, VİRMANDA KUR (17 Eylül, v1.316.0)

**Kullanıcı:** *"Kasa işlemlerinde silme onaylı olsun ve düzenleme yapabilmek için düzenle butonu
da olsun. Virmanda kur çevirmek için kur çeviricimiz vardı, onu kullanalım."*

- **Onaylı silme:** satırdaki çöp kutusu `SilOnayButonu`ya çevrildi (tek dokunuş sorar, ikincisi
  siler). Para kaydında yanlış dokunuş pahalı.
- **Düzenle:** satır içi panel — tarih, tutar, açıklama. **Cariye bağlı hareketlerde karşı taraf da
  aynı bağ (`muhasebeBagId`) üzerinden güncelleniyor**; cari tutarı kur çevrimi yüzünden farklı
  olabildiği için ORAN korunuyor. Yön ve para birimi değiştirilmiyor: yön işlemin cinsini belirler,
  değiştirmek başka bir işlem demektir — o zaman silinip yeniden girilir.
  **Virman satırı düzenlenmiyor** (iki hesabı birden ilgilendiriyor; tek taraftan değiştirmek
  ikisini ayrıştırırdı) — silinip yeniden yapılır.
- **Virmanda kur çevirici:** cari ödeme/tahsilatındaki `kurSorusu` + `kurUygula` yardımcıları.
  Kur yazınca hedef tutar, hedef tutar yazınca kur hesaplanıyor; kullanıcı hangisini biliyorsa onu
  giriyor.

**Yakalanan regresyon:** onaylı silmeye geçince `senaryo-cek-iade-tahsil`in tek dokunuşlu silme
adımı çalışmaz oldu (banka hareketi silinmeyince çek "Tahsilde"ye dönmedi). Senaryo iki dokunuşa
çevrildi — davranış değişikliği doğru, test eskiydi.

**Doğrulama:** `senaryo-kasa-islemler` — düzenle düğmesi var; 500 → 650 düzeltmesinde kasa
`Çıkış:650:Ödeme düzeltildi`, cari karşılığı `Borç:650`. Tam koşu: 68 senaryo temiz.

## VİRMAN SEBEBİ (17 Eylül, v1.317.0)

**Kullanıcı:** *"Kasalar arası virmanda virman sebebi seçilsin, örnek döviz bozdurma gibi."*

`VIRMAN_SEBEPLERI` (015-sabitler): Döviz bozdurma · Nakit çekme (bankadan kasaya) · Nakit yatırma
(kasadan bankaya) · Hesaplar arası aktarım · Kasa devri · Diğer.

- **Seçim zorunlu**: ay sonunda "bu 480.000 ₺ neden USD kasasına gitti" sorusunun cevabı serbest
  metin kutusuna kalmasın. "Diğer" seçilirse açıklama da zorunlu.
- Sebep **alan olarak** saklanıyor (`virmanSebebi`), ayrıca açıklamaya da yazılıyor. Raporda
  "döviz bozdurmalar" diye süzmek için metin ayrıştırmak kırılgan olurdu.
- Liste kısa tutuldu: uzun liste seçimi yavaşlatır, kimse sonuna kadar okumaz. Yeni bir sebep
  gerekirse sabit listeye eklenir (Tanımlar'a taşımak da mümkün, şimdilik gerek görülmedi).

### ÖĞRENEN LİSTE (v1.318.0)

**Kullanıcı:** *"Tanımlara değil de; bir kere girilen kaydı hatırlasın, sonrasında o kayıt çıksın
ve başka kayıt da girilebilsin."*

Sabit liste kaldırıldı. Sebep alanı **serbest yazılıyor**, daha önce yazılanlar öneri olarak
çıkıyor (`<datalist>`). **Öneriler ayrı bir yerde tutulmuyor** — geçmiş virman hareketlerinin
`virmanSebebi` alanından toplanıyor, en son kullanılan başta. Kayıtların kendisi hafıza; ayrı bir
liste tutmak onu güncel tutma (silme, yeniden adlandırma) derdini getirirdi. `VIRMAN_SEBEPLERI`
yalnız ilk kullanımda liste boş kalmasın diye duran birkaç hazır öneri.

Sebep hâlâ **zorunlu** (boş bırakılamaz); "Diğer" kavramı kalktı, çünkü artık istediğini yazabiliyor.

**Doğrulama:** `senaryo-kasa-islemler` — sebep boşken kaydet denince form açık kalıyor; listede
olmayan "Kira için nakit" yazılıp kaydedildikten sonra, sonraki virmanda öneri listesinin BAŞINDA
çıkıyor. Tam koşu: 68 senaryo temiz.

## TEKNİK ÇİZİM SEKMESİ (17 Eylül, v1.319.0)

**Kullanıcı:** *"Stok kartı içerisinde üretim teknik çizimlerini yükleyeceğimiz, teknik resim
detayları vereceğimiz sekme ekleyelim. O alan oluşsun, altını dolduracağız."*

Ürün kartına **Teknik Çizim** sekmesi eklendi (iskelet — kullanıcı içeriği doldururken şekillenecek):
- **Çizimler:** birden çok görsel (`teknikCizimler: [{ id, gorsel, baslik }]`). Yükleme `ColorSwatch`
  ile — galeri/kamera/URL üçlüsü zaten orada, ikinci bir yükleyici yazmak aynı işi tekrar etmekti.
  Her çizimin başlığı satır içinde yazılıyor (Kalıp, Saya, Taban…), silme onaylı.
  Görsele dokununca katalogdaki büyük görsel penceresi açılıyor.
- **Teknik detaylar:** serbest metin (`teknikNot`) — ölçü, malzeme, dikiş payı, kalıp notu.
  Yapı netleşince ayrı alanlara bölünecek; şimdiden alan uydurmak kullanıcının gerçek ihtiyacını
  tahmin etmek olurdu.
- **Sekme nerede çıkıyor:** mamulde her zaman, hammaddede yalnız çizim varsa. Deri/iplik kartında
  boş bir "teknik çizim" sekmesi gürültü olurdu.

**Doğrulama:** `senaryo-teknik-cizim.js` (yeni) — hammaddede sekme yok, mamulde var ve etiket
`Teknik Çizim (1)`; başlık "Kalıp" ve teknik not ürüne kaydediliyor. Tam koşu: 69 senaryo temiz.

> **SIRADAKİ (kullanıcı dolduracak):** alan yapısı belli olunca serbest metin bölünecek; iş emrine
> / PDF'e basma ve üretim ekranından erişim eklenebilir.

## BEKLEYEN ÜÇ MADDE KAPATILDI (17 Eylül, v1.320.0)

Kullanıcının ekran görüntüleriyle bildirdiği üç madde:

**1. "Ödemeler alış diye görünüyor."** Son İşlemler listesi türü AÇIKLAMA METNİNDEN tahmin
ediyordu; muhasebe ekranından girilen ödemenin açıklaması beklenen kalıba uymayınca satır "Satış"
görünüyordu. Artık tür önce `islemTipi` ALANINDAN okunuyor (17 Eylül'de eklendi); yoksa eski tahmin
sürüyor ve `ODM-`/`THS-` fiş ön ekleri de tahmine katıldı.

**2. "Kullanıcı göstermiyor."** Kasa/cari yolundan yazılan hareketlerde `kullanici` alanı hiç
doldurulmuyordu. Değer tek kaynaktan geliyor: `islemKullanicisiAd()` (025-veri-fark) — günlüğün
zaten tuttuğu aktif kullanıcı. Prop zinciriyle taşımak "bir yol unutuldu" hatasına açıktı.
Kasa hareketi, cari hareketi ve virman damgalanıyor. Giriş sistemi kapalıyken alan BOŞ kalıyor
("Bilinmeyen" damgalamak listeyi bilgi vermeden kirletirdi).
> Bu maddenin testi girişli akış gerektiriyor; test ortamında giriş ekranı adımı oturmadı, bu
> yüzden senaryoya BAĞLANMADI. Gerçek kullanımda doğrulanması gerekiyor.

**3. "Virmanda 2 fiş oluşuyor, birini silince diğeri kalıyor."** Fiş TEKTİ (aynı `VRM-…`, aynı
`muhasebeBagId`); iki HAREKET vardı — biri çıkış, biri giriş. Ama silme tek hareketi siliyordu:
kaynak kasa eksilmiş, hedef kasa şişmiş kalıyordu. Artık bağın **iki ayağı birlikte** siliniyor,
hangi satırdan silinirse silinsin, ve iki hesabın listesi de süzülüyor.

**Doğrulama:** `senaryo-kasa-islemler` — virman satırı düzenlenemiyor (iki hesabı ilgilendiriyor),
onaylı silme sonrası TL kasada 0, USD kasada 0 hareket kaldı. Son İşlemler'de kasadan girilen ödeme
"Ödeme" etiketiyle görünüyor. Tam koşu: 69 senaryo temiz.

> **KALAN (4. madde):** fiyatlandırmada tekil cari fiyatının ALIŞ/SATIŞ ayrımı ve RENK/BEDEN
> seçimi; varsayılan "renk/beden için aynı fiyat" işaretli gelsin, farklı fiyat verilecekse o
> satırlara değer girilsin. Modelhane'den önce ya da sonra yapılabilir.

## ÖLÇÜ SEÇİMİ (18 Eylül, v1.327.0)

**Kullanıcı:** *"Boyut olan ürünlerde tüm boyutlar gelmesin, seçim ile girelim."*

Fiş kalem formunda (255-stokfisi) miktar kutuları ürünün BÜTÜN ölçüleri için açılıyordu. Ayakkabı
bedeninde bu doğru (asorti mantığı: her numaraya miktar girilir), ama BOYUT'ta (bağcık
120/130/140/150/160 cm, deri ebadı…) genelde tek boyut alınıyor; beş kutuyu birden açmak ekranı
dolduruyor ve yanlış kutuya yazma riski getiriyor.

- `olcuTipi !== "Beden"` ve birden çok ölçü varsa: önce **ölçü çipleri**, kutu ancak seçilen ölçü
  için açılıyor. **Beden tipinde davranış aynen duruyor.**
- Çip seçimi kaldırılınca o ölçünün girilmiş miktarı da temizleniyor ve kalemlere yalnız GÖSTERİLEN
  ölçüler giriyor — ekranda görünmeyen bir satırın fişe sızması fişi sessizce bozardı.

### AÇILIR LİSTE + ARAMA (v1.328.0)

**Kullanıcı:** *"Çip değil renk gibi seçmeli olsun, ekranı rahat kullanmalıyız. Bir de stok ve renk
seçmeli ve yazarak da aratmak gerek."*

- **Ölçü artık açılır liste** (renk seçicinin aynısı), çipler kaldırıldı: çipler satırlara sarıyor
  ve ölçü sayısı arttıkça ekranı dolduruyordu. Ölçü değişince eski ölçünün miktarı temizleniyor.
- **Ürün ve renk yazarak aranıyor:** `<input list=…>` (datalist). Yazdıkça süzüyor, dokunarak
  seçmeye de devam ediyor — iki kullanımı bir arada tutan tek çözüm bu. Açılır listede 18 ürün
  varken bile aranan şeyi bulmak kaydırmayla oluyordu; 100 üründe imkânsız olurdu.
- Ürün kutusuna yazılan metin ürün kimliğine çevriliyor; aynı adda iki ürün varsa etiketteki
  kategori/birim ayırıyor. Metin hiçbir ürünle eşleşmezse seçim temizlenir (yanlış ürüne kalem
  eklenmesin).

**Yeri (v1.329.0):** ölçü seçici RENGİN YANINDA. Ürün → renk → ölçü aynı hizada, göz soldan sağa
akıyor; fiyat ve miktar sonra geliyor. Önce miktar kutularının yanındaydı ve seçim sırası
kırılıyordu.

**Doğrulama:** `senaryo-olcu-secimi` — bağcıkta ölçü listesi 5 seçenek, miktar kutusu yok;
"130 cm" seçilince kutu açılıyor. Botta (beden) ölçü seçici yok, kutular açık.
`senaryo-fis` ürün/renk seçimini arama kutusuna çevirdi. Tam koşu: 74 senaryo temiz.

## FİŞ EKRANI SADELEŞTİ (18 Eylül, v1.330.0)

**Kullanıcı:** *"Miktar da boyutun yanında olsun, tek satıra sığsın hepsi, gerekirse yazıları
küçült. Üstteki bilgiler için: cari içinden giriş yapıldığı için üstte cari adı var, tedarikçiyi
kaldır; cari defteri ve p.birimini ufaltıp sağ üste koy. Üst satırı da düzene koy."*

**Kalem satırı:** ürün → renk → ölçü → **miktar** → fiyat → P.B. hepsi tek hizada. Miktar kutuları
62→52 px, yazı 12→11 punto: beden tipinde 5-6 kutu yan yana artık sarmalanmıyor.

**Üst satır:**
- **Cari seçici kaldırıldı** — daha doğrusu yalnız gerektiğinde çıkıyor: cari kartından açılan
  fişte cari zaten belli ve başlıkta yazıyor, aynı bilgiyi ikinci kez seçtirmek satırı boşuna
  dolduruyordu. Depo/stok yolundan açılan fişte cari boş gelir, o zaman seçici görünür.
- **Para birimi ve cari defteri sağ üstte, küçük** (11 punto). İkisi de FİŞİN TAMAMINI ilgilendiren
  ayar; kalem kalem değişmiyorlar, alan satırında yer kaplamaları gereksizdi.

**Test tarafı:** miktar ve fiyat kutuları artık `data-kalem-miktar` / `data-kalem-fiyat` ile
işaretli. `senaryo-fis` kutuları SIRAYLA dolduruyordu (`input[type=number]` nth(0), nth(1)) ve
sıra değişince fiyatı miktara yazdı — işarete göre doldurmaya çevrildi, bu sınıf kırılganlık
kalktı. Tam koşu: 74 senaryo temiz.

### EKRAN TOPARLAMA (v1.331.0)

**Kullanıcı:** *"Çok boş alan var, dağılmasına gerek yok. Ekranı toparla."*

Üst satır `repeat(auto-fit, minmax(125px, 1fr))` ızgarasındaydı: `1fr` alanları ekran genişliğine
YAYIYORDU — dört alan geniş ekranda 400 px'e kadar uzayıp aralarında okunmayan boşluk bırakıyordu.
Artık flex + alan başına **sabit genişlik** (`Field`'a `genislik` prop'u eklendi): alan içeriği
kadar duruyor, dar ekranda yine alt satıra sarıyor.

- Ürün 190, renk 130, ölçü 130, fiyat 120 px; tarih 150, fiş no 160, ödeme şekli 140, peşin 200.
- Dış boşluklar kısıldı: kart dolgusu 14→10/12, bloklar arası 14→10, başlık altı 12→8.

**Doğrulama:** `senaryo-fis` ve `senaryo-olcu-secimi` aynı sonucu veriyor (düzen değişti, davranış
değil). Tam koşu: 74 senaryo temiz.

### FORM SIFIRLAMA (v1.332.0)

**Kullanıcı:** *"Kalemlere ekle deyince ürünü sıfırla, yeni kalem başka ürün olabilir."*

`kUrunId` sıfırlanıyordu ama **arama kutusunun metni** ve seçili ölçü kalıyordu: ekranda hâlâ eski
ürünün adı yazıyor, altında renk alanı görünmüyordu (çünkü ürün aslında seçili değil) — kullanıcı
"ürün seçili mi, değil mi" diye bakmak zorunda kalıyordu. Artık ürün, arama metni, renk, ölçü ve
fiyat birlikte temizleniyor.

**Doğrulama:** `senaryo-olcu-secimi` — "Kalemlere Ekle" sonrası ürün kutusu boş, renk alanı gizli,
fiyat boş; eklenen kalem listede duruyor. Tam koşu: 74 senaryo temiz.

## FİŞ KARTI: İŞLEMLER MENÜSÜ (18 Eylül, v1.334.0)

**Kullanıcı:** *"'İlgili cariye git' ve 'Ensa Deri carisine git' aynı şey, bu ikisini de kaldır;
üstte cari adı yazıyor, orayı tıklanabilir yap. Burası siparişten gelmişse 'ilgili siparişe git'
olabilir. Bunun için de işlemler tuşu yapalım, tıklayınca orada ilgili cariye git, bağlantılı
siparişlerini göster, git vs. işlemler yapabilelim."*

- Alttaki **"… carisine git" düğmesi kaldırıldı**; başlıktaki **cari adı tıklanabilir** (dahili
  işlemde düz metin kalıyor). Aynı yere iki yol, ikisi de aynı işi yapıyordu.
- Bağlantı düğmeleri, sil ve temizle **"İşlemler" düğmesinin arkasına** alındı: kart açılır açılmaz
  üç dört mavi bağlantı görünüyor, asıl içerik (kalemler) aşağı itiliyordu. Menü kapalı başlıyor.

**Test tarafı — üç senaryo etkilendi, hepsi düzeltildi:**
- `senaryo-cek-bag`in "kart açık mı" kontrolü bağlantı METNİNE bakıyordu; o metin menüye girince
  gizlendi ve kontrol "kapalı" deyip kartı ikinci tıklamayla gerçekten kapatıyordu. Artık kartın
  açıklığı **İşlemler düğmesinin varlığından** anlaşılıyor.
- `evaluate` içindeki `click()` React dinleyicisine ulaşmadığı için menü açma **Playwright
  tıklamasıyla** yapılıyor; yardımcı, menü zaten açıksa dokunmuyor (düğme toggle).
- `senaryo-uretim` ve `senaryo-cek-iade-tahsil` ölçümlerinden önce menüyü açıyor.

**Doğrulama:** `senaryo-menu-gruplari` — İşlemler düğmesi var, menü kapalı başlıyor, cari adı
tıklanabilir, ikinci "carisine git" düğmesi yok; düğmeye dokununca bağlantılar çıkıyor.
Tam koşu: 75 senaryo temiz.

## TOPLAM ALACAK PARA BİRİMİ BAZINDA (18 Eylül, v1.335.0)

**Kullanıcı:** *"Anasayfada toplam alacak sadece TL cinsinden toplanıyor, 3 para birimi var, ayrı
ayrı toplanması gerek."*

Kart `cariBakiye`yi kullanıyordu — o da yalnız TL bakiyesini veriyor; dolar ve euro alacakları hiç
görünmüyordu. Kart "toplam alacak" diyor ama toplamın bir kısmını gösteriyordu.

Artık `cariBakiyeleri` ile para birimi bazında toplanıyor: **TL büyük satırda, döviz alt satırda**
(`4.500 € · 3.000 $`). Tek para birimi varsa alt satır eski bilgiyi (cari sayısı) gösteriyor.

> **Kur ile tek sayıya çevirmedim:** kur her gün değişir, alacak dövizdir. "270.000 ₺ alacağım var"
> demekle "3.000 $ alacağım var" demek aynı şey değil; ikincisi tahsil edilecek olan.

**Doğrulama:** `senaryo-anasayfa-alacak.js` (yeni) — üç para birimli veride ana satır `120.000 ₺`,
alt satır `4.500 € · 3.000 $`; tek para birimli veride alt satır `3 cari kayıtlı`.
Tam koşu: 76 senaryo temiz.

## ORTAK EYLEM ÇUBUĞU (18 Eylül, v1.336.0) — 1. TUR

**Kullanıcı:** *"Kaydet, vazgeç butonları uygulamanın her yerinde dağınık. Sağ üstte bulunan
butonların içinde olsun, zaten el alışkanlığı var... Silme, düzeltme, kaydetme yan yana olsun."*

**Sunulan üç seçenek:** (1) pencere başlığında eylem yuvası, (2) sağ altta yüzen çubuk,
(3) kart başlığında satır içi çubuk. **Seçilen: 1 + 3 birleşimi** — tek bileşen, iki yerde.

**`352-eylem-cubugu.jsx`:**
- `EylemCubugu` — `[{ tur, ad, onClick, pasif, ipucu }]` alıyor. Türler: kaydet (dolgulu yeşil),
  duzenle (mavi), sil (kırmızı), vazgec (gri).
- **SIRA:** Kaydet · Düzenle · Sil, hepsi **Kapat/Küçült'ün SOLUNDA**. Yıkıcı olan Sil sağ köşeye
  konmuyor: kapatma refleksiyle giden parmak ona çarpmasın.
- **Pencere eylem kaydı:** tam ekran pencerenin başlığı App'te tek yerde çizilir, içeriği modüldür.
  Prop zinciri kurmak her modülü tek tek değiştirmek demekti; onun yerine küçük bir kayıt —
  modül `pencereEylemleriBildir(pencereId, eylemler)` der, başlık okur, abonelik React'i tetikler.

**İlk bağlanan ekran: fiş formu.** Kaydet ve Vazgeç başlıkta; **formun altındaki düğmeler DURUYOR**
— uzun formda göz aşağıdayken oraya bakılıyor. Aynı iş, aynı isim, iki yerde: kafa karıştıran şey
aynı işin iki farklı İSİMLE durmasıdır, iki yerde olması değil. Kalem yokken Kaydet pasif ve ipucu
sebebini söylüyor.

**Doğrulama:** `senaryo-olcu-secimi` — çubuk var, eylemler `kaydet:pasif` ve `vazgec`.
`senaryo-satin-al-dugmesi` altını güncellendi (başlıkta artık Kaydet/Vazgeç yazıyor).
Tam koşu: 76 senaryo temiz.

> **SIRADAKİ TURLAR:** ürün kartı, cari kartı, sipariş kartı ve modelhane kartı da aynı çubuğa
> bağlanacak (Düzenle/Sil oraya taşınacak); gömülü kartlarda aynı bileşen kart başlığında kullanılacak.

## İKİ SADELEŞTİRME (19 Eylül, v1.337.0)

**1. "P.Birimi Ekle" kaldırıldı.** Kullanıcı: *"P.birimi ekle'yi kaldır, fiyatlandırma
seçeneğimiz var, oradan eklenebilir."* Ürün kartının üst satırındaki küçük ekleyici
(`EkFiyatEkleyici`), Fiyatlandırma sekmesindeki tam düzenleyiciyle aynı işi yapıyordu — iki yol,
biri eksik (renk/beden kırılımı yok, cari bazlı fiyat yok). Bileşen ve kullanılmayan state'leri
tamamen silindi.

**2. Sipariş matrisi planlamayla DEĞİŞMİYOR.** Kullanıcı: *"Sipariş aslında 144 çift toplamı. Üst
satır sipariş toplamı ama aşağıdan planlama yaptıkça değişiyor ve kafa karıştırıyor. Planlama
yapılanlar zaten aşağıda görünüyor ve sekmelerde toparlanıyor."*

Hücre kısmi karşılamada `karşılanan/toplam` kesri gösteriyordu (v1.296–1.297'de böyle
kurulmuştu). Artık **her zaman sipariş miktarı** yazıyor: üst matris "ne istendi" sorusunun cevabı
ve o değişmez. Karşılanma durumu hücredeki **küçük nokta**dan (turuncu: kısmi, yeşil: tamam) ve
ipucundan anlaşılıyor; dökümü Tedarik Planlama ve Fişler sekmelerinde zaten var.

**Doğrulama:** `senaryo-siparis`, `senaryo-siparisten-sec`, `senaryo-tedarik-girisleri` değişmedi.
Tam koşu: 76 senaryo temiz.

## PAKETLEME NOTU KALDIRILDI (19 Eylül, v1.338.0)

**Kullanıcı sordu:** *"Paketleme ne işe yarıyor?"* — **Cevap: hiçbir işe.** Kodda izi sürüldü:
ürün kartında yazılıyor, kartta bir satırda gösteriliyor, Supabase'e kaydediliyordu. **Hiçbir yer
okumuyordu** — ne paketleme modülü, ne alış siparişi, ne fiş. Yalnız hammaddede vardı.

**Kullanıcı:** *"Şu an mantıksız, kaldıralım, ekran sadeleşsin. Alanları da toparlayalım."*

- `paketlemeNotu` alanı ürün kartı düzenleme formundan, ürün oluşturma formundan ve kart bilgi
  satırından kaldırıldı. Doldurulan bir alanın hiçbir işe yaramaması, boş durmasından kötü:
  kullanıcı "bir yerde kullanılıyordur" diye düşünür.
- Bilgi satırları toparlandı: alanlar arası boşluk 14→10, satır arası 8, üst boşluk 8→6.

> **Not:** paket büyüklüğüyle satın alma yuvarlaması (bağcık 100'lük paket → 250 ihtiyaç 300'e
> yuvarlanır) istenirse bu SAYI alanı olarak yeniden kurulur; metin notu o işi yapamıyordu.
> Veri alanı Supabase şemasında duruyor, eski kayıtlar bozulmadı.

**Doğrulama:** ürün kartında "Paketleme" metni yok, hata yok. Tam koşu: 76 senaryo temiz.

## SİPARİŞ MATRİSİ — ASIL DÜZELTME (19 Eylül, v1.339.0)

**Kullanıcı:** *"Önceki turda siparişi düzelttik ama düzelmedi. Üstte siparişin tamamı görünecek,
sipariş planlandığında üstte değişiklik olmayacak, sekmeler gösterecek."*

**v1.337.0'da yanlış yeri düzeltmişim:** hücredeki `karşılanan/toplam` kesrini kaldırdım, ama sayı
yine de düşüyordu. Asıl sebep başkaydı.

**Gerçek sebep:** planlama yapılınca sipariş kalemi **İKİYE BÖLÜNÜYOR** — planlanan parça
(`planlama` dolu) + kalan parça (`100-app`, üretim/satın alma planlama). Bu doğru bir kayıt
tekniği: her parça kendi tedarik kaydını taşıyor. Ama matris her bedene TEK kalem koyuyordu
(`kalemBedenIndex[k.beden] = k` — son yazılan kazanıyor), o yüzden 12 çiftlik beden planlandıkça
4'e düşmüş görünüyordu. ADET sütunu doğru toplamı gösteriyordu, hücreler göstermiyordu; ikisi
arasındaki çelişki kafa karışıklığının kaynağıydı.

**Düzeltme:** aynı renk+beden için **bütün parçalar toplanıyor**. Karşılanan da toplanıyor,
parçalardan biri planlanmışsa hücre kilitli sayılıyor. Üst matris artık siparişin kendisini
gösteriyor; bölünme oraya yansımıyor, dökümü Tedarik Planlama ve Fişler sekmelerinde.

**Doğrulama:** `senaryo-siparis-matris-sabit.js` (yeni) — Siyah/41 için 8 planlanmış + 4 kalan iki
kalem: hücre **12** gösteriyor ve ADET sütunuyla tutarlı. Tam koşu: 77 senaryo temiz.

## BEKLEYEN YAZMA — AYRINTI (19 Eylül, v1.340.0)

**Kullanıcı:** *"Buluta gönderilmeyenlere detay versin: 'bu stok' veya 'bu fiş' diye, üzerine
tıklayınca."*

Şerit yalnız tablo adını yazıyordu (`urunler (1×)`) — bu VERİTABANININ dili, kullanıcının değil;
hangi işinin havada kaldığını söylemiyordu.

- `TABLO_ACIKLAMALARI` (015-sabitler): her tablonun insan dilinde adı ve bir cümlelik açıklaması
  (Stok kartları · Cari kartları · Siparişler · Üretim · Kasa/banka/çek · Tanımlar · Fiş defteri ·
  Modelhane · Görevler · Sohbet · Paketleme · Çek görselleri).
- Şeritte her kayıt **tıklanabilir çip**; dokununca ayrıntı paneli: ne olduğu, kaç deneme, son
  deneme zamanı, hatanın kendisi ve "bu cihazdaki kayıt güncel, gönderilene kadar diğer cihazlar
  eksik görür" notu.

**Yakalanan regresyon:** çip "Tanımlar" yazınca üç senaryodaki
`locator('button:has-text("Tanımlar")')` ÇİPİ yakalamaya başladı (nav düğmesi yerine). Senaryolar
`getByRole("button", { name: "Tanımlar / Ayarlar", exact: true })` ile kesin hedefe çevrildi.
`senaryo-bekleyen-yazma`da zaman damgası normalleştirildi (her koşuda değişiyordu).

**Doğrulama:** çip `Tanımlar (5×)` yazıyor; tıklanınca panel açılıyor ve
`Tanımlar — Renk, beden, proses… | 5 deneme · son: <zaman> | Failed to fetch` gösteriyor.
Tam koşu: 77 senaryo temiz.

## FİŞLER TEK EKRANDA + ÜÇ DÜZELTME (19 Eylül, v1.348.0)

**1. Fişler tek ekranda — v1.325.0'daki ayrım GERİ ALINDI.** Kullanıcı: *"Fişler tek yerde olması
daha doğru; sonuçta satış hem muhasebeyi hem stoğu etkileyen bir durum."*
Ayrımın gerekçesi "depocu para fişlerini geçmesin"di; kullanımda görüldü ki bir SATIŞ fişi zaten
iki tarafı birden ilgilendiriyor — onu iki listede göstermek, aynı belgeyi iki yerde aramak
demekti. Menüde tek **Fişler** girişi (Finans altında), ayrım yerine **tip çipleri**.

**2. Para fişleri çiplerde.** Sayaçlarda `Tahsilat` ve `Ödeme` yoktu; o yüzden ekranda yalnız
"Tümü" ve "Satış" çipi görünüyordu. Çip listesi: Tümü · Satış · Alış · Tahsilat · Ödeme ·
Üretim Girişi · Üretim Çıkışı · İşçilik · Diğer.

**3. İşçilikte adet ve birim fiyat.** Kullanıcı: *"Üretim işçilikte br fiyat ve adet göstermeli,
sonuçta var bu."* Bilgi açıklama METNİNDE vardı ("… 12 adet × 500 ₺") ama fiş listesi ALANLARI
okuyor. Metinden ayrıştırmak kırılgan olurdu; `miktar`, `birimFiyat` ve `birim` artık alan olarak
yazılıyor — hem normal işçilikte hem ara proses işçiliğinde.

**4. Banka adı öğrenen alan.** Kullanıcı: *"Daha önce girilen bankaları hatırlasın, seçmeli
olsun."* Hesap ekleme alanları artık `datalist`li: yazdıkça süzüyor, dokunarak seçtiriyor.
Öneriler ayrı listede TUTULMUYOR — var olan hesaplardan toplanıyor (virman sebebindeki kalıp).
Aynı bankanın "Ziraat", "Ziraat Bankası", "ziraat bankasi" diye üç yazımla kaydedilmesi böylece
azalıyor.

**Etkilenen testler:** beş senaryo "Stok Fişleri"/"Muhasebe Fişleri" arıyordu → "Fişler";
`senaryo-cek-iade-tahsil`in silme adımı metin yerine kesin kalıba çevrildi.
Tam koşu: 77 senaryo temiz.

> **KALAN (bu turdan):** banka listesi düzenleme (hesap adı/banka/IBAN değiştirme) — şu an yalnız
> ekleme, pasife alma ve silme var.

## BÖLME — 8. TUR (19 Eylül, v1.349.0)

Üç parça daha çıktı:

**`086-goc.jsx` — `useGocVeOnarim()`**: Supabase göçü ve defter toplu onarımı.
Göç adım adım ilerliyor, her adımın sonucu ayrı sayılıyor; bir adım patlarsa sonrakilere
geçilmiyor — **yarım göç, hiç göç etmemekten kötüdür** (iki yerde iki farklı gerçek olur).

**`085-muhasebe-bagi.jsx` — `useMuhasebeBagiTemizle()`**: fiş silinince kasa/banka ayağını da
temizler. Yalnız cari tarafını silmek kasada karşılıksız hareket bırakıyordu; ilk denemede tam
olarak bu oldu ve kasa bakiyesi gerçeği söylemez hale geldi.

**`084-hurda-telafi.jsx` — `useHurdaTelafi()`**: hurdaya çıkan adetlerin yerine açılan telafi
üretimi. Telafi kaynağın kendisini DEĞİŞTİRMEZ, ayrı üretim olarak açılıp kaynağına bağlanır —
kaynağın adedini artırmak fireyi görünmez yapardı.

**Dokuz turun toplamı:** `100-app.jsx` 7.758 → **6.153** satır. **1.605 satır** çıktı, on iki yeni
dosya: `084` · `085` · `086` · `087` · `088` · `089` · `090` · `091` · `092` · `093` · `094` · `095`.

**Doğrulama:** `uretim`, `silme`, `cek-bag` aynı sonucu veriyor. Tam koşu: 77 senaryo temiz.

### 9. TUR — ad değiştirme çıktı, onay sistemi ÇIKAMADI (v1.350.0)

**`082-ad-degistir.jsx` — `useAdDegistirme()`** (343 satır): ölçü ve renk adı değiştirme, artı
aynı aileden olan onarım işleri (`defterdenYenidenKur`, `eksikHareketOnar`, `tanimsizOlcuCevir`).
Bu parçanın büyüklüğünün sebebi: bir bedenin adı değişince **sekiz yerde** hizalanması gerekiyor —
ürün varyantları, reçete, stok hareketleri, sipariş kalemleri, üretim beden dağılımları ve proses
atamaları, koli kalemleri, asorti oranları, rezervasyonlar. Yoksa "41" ile "41 " iki ayrı beden
olur ve üretim/stok eşleşmesi kopar.

**ONAY SİSTEMİ TAŞINAMADI — ve bu bilerek böyle bırakıldı.** `onayUygula`, SİLME ZİNCİRLERİNİ
çağırıyor; zincirler App'te çok daha sonra tanımlanıyor. Hook'a almak, henüz var olmayan
fonksiyonları parametre olarak istemek demekti. Taşıma geri alındı ve App'teki bloğun başına
sebebi yazıldı. **Bölmek her zaman doğru cevap değil:** bir parçayı çıkarmak için önce onun
bağlarını çözmek gerekiyorsa, o bağ çözülene kadar parça yerinde durur.

**On turun toplamı:** `100-app.jsx` 7.758 → **5.810** satır. **1.948 satır** çıktı (%25), on üç
yeni dosya: `082` · `084` · `085` · `086` · `087` · `088` · `089` · `090` · `091` · `092` · `093` ·
`094` · `095`.

**Doğrulama:** `beden-adi`, `fis-defteri`, `stok-turetme`, `uretim` aynı sonucu veriyor.
Tam koşu: 77 senaryo temiz.

### 10. TUR — iki büyük iş yolu (v1.351.0)

**`081-siparis-teslim.jsx` — `useSiparisTeslim()`** (229 satır): siparişin karşılanmasını
kaydeden yol. **Atomik** (Adım 3): önce hesap yapılır, sonra fiş defterine yazılır; defter
yazılamazsa sipariş, stok, cari, koli — hiçbiri değişmez. Bu sıra bir kez yanlış kurulmuştu:
yan etkiler hesabın içindeydi ve defter reddetse bile stok değişiyordu.
Tek fişle iki siparişi kapatma da korundu: teslim satırı kendi `siparisId`sini taşıyabiliyor.

**`080-proses-ver.jsx` — `useProsesVer()`** (245 satır): bir üretim adımının personele verilmesi.
Kurallar dosyanın başına yazıldı: hammadde ÇIKIŞI iş verilirken olur (malzeme kalfanın eline
geçtiği anda stoktan çıkmıştır; teslimi beklemek depoda olmayan malı var göstermekti);
rezervasyonlar önce tüketilir; ara proses işçiliği ayrı fiş (iki kişiye iki ücret).

**On bir turun toplamı:** `100-app.jsx` 7.758 → **5.348** satır. **2.410 satır** çıktı (%31),
on beş yeni dosya: `080` · `081` · `082` · `084` · `085` · `086` · `087` · `088` · `089` · `090` ·
`091` · `092` · `093` · `094` · `095`.

**Doğrulama:** `siparis`, `siparisten-sec`, `fis-defteri`, `tedarik-girisleri`, `uretim`,
`verilen-hammadde`, `hazir-urunler`, `fis-ozet` aynı. Tam koşu: 77 senaryo temiz.

### 11. TUR — `079-uretim-teslim.jsx` (v1.352.0)

**489 satır — App'teki EN BÜYÜK TEK FONKSİYON** çıktı: bir üretim adımının personelden teslim
alınması. Sağlam/hurda ayrımı, işçilik ücreti, tamir ataması, son adımda mamul girişi.

Dört kuralı dosyanın başına yazıldı:
- **Hurda ücret almaz** — hurdanın çıktığı aşama o aşamadır; hurdaya işçilik ödemek hatayı
  ödüllendirmekti. Açıklamaya "(N hurda ödenmedi)" yazılıyor ki tartışma çıkmasın.
- **İşçilik ayrı fiş** (`-İşçilik` ekiyle) — mal hareketi ile para hareketi aynı numarada
  toplanırsa "bu fiş neyi anlatıyor" sorusu cevapsız kalıyordu.
- **Tamir ayrı atama**, kaynağı yazılı — "kaç kez tamir gitti" ancak böyle cevaplanıyor.
- **Son adımda mamul girer** — ara adımda girmek, satılamayacak malı satılabilir göstermekti.

**On iki turun toplamı:** `100-app.jsx` 7.758 → **4.863** satır. **2.895 satır** çıktı (**%37**),
on altı yeni dosya (`079`–`095`).

**Doğrulama:** `uretim`, `hazir-urunler`, `fis-ozet` aynı. Tam koşu: 77 senaryo temiz.

### 12. TUR — planlama ve çöp kutusu (v1.353.0)

**`078-planlama.jsx` — `usePlanlama()`** (367 satır): satış siparişini karşılamak için üretim
açma, satın alma siparişi açma, hammadde satın alma planlama. Üç kural yazıldı:
- **Kalem ikiye bölünür** — kısmi planlamada planlanan ve kalan parçalar ayrı kayıt olur; miktarı
  azaltmak kalanı sessizce kaybetmek ve bir daha planlanamaz hale getirmekti. (Üst matris bu
  bölünmeyi göstermez — v1.339.0.)
- **Rezervasyon defteri** — üretim kararında MEVCUT stoktan da ayırmak gerekir; o miktarın alışı
  yoktur, dolayısıyla alış kaleminde izi de yoktur.
- Farklı fişlere planlanmış tekrar eden kalemler **otomatik birleştirilmez**: ayrı tedarik
  kayıtlarını temsil ediyorlar.

**`077-cop.jsx` — `useCopKutusu()`** (84 satır): silinen kayıtların gittiği yer ve geri alma.
`COP_SINIRI` de oraya taşındı (App'te ve hook'ta iki kopya kalmasın diye tek kaynak yapıldı).
Çöp kutusu "emin misiniz" sorusundan daha güvenli: soruyu yanlış cevaplamak da geri alınabiliyor.

**On üç turun toplamı:** `100-app.jsx` 7.758 → **4.421** satır. **3.337 satır** çıktı (**%43**),
on sekiz yeni dosya (`077`–`095`).

**Doğrulama:** `siparis`, `tedarik-girisleri`, `siparis-matris-sabit`, `uretim`, `silme`,
`geri-donus` aynı. Tam koşu: 77 senaryo temiz.

> **KALAN:** onay sistemi (önce silme zincirleriyle bağı çözülmeli), üretim silme
> (`uretimSil`, ~190 satır), tanım/kayıt yazma sarmalayıcıları (`saveX` ailesi — küçük ve App'e
> yakın olmaları doğal). Geri kalanın büyük kısmı ekran bağlama kodu.

## TÜM ADETLERİ ASORTİLE (19 Eylül, v1.354.0)

**Kullanıcı:** *"Koli kurarken 'asorti kur, tüm adetler için' seçildiğinde belirli asorti kuralına
göre asorti oluştursun. Örn. standart 8'li seçip tüm adetleri bu şekilde koli yap dediğinizde adedi
asortileyip artan adetler boşta kalacak şekilde asorti oluştursun. Kalanı elle koliye ekleriz."*

`AsortiUygulaKontrolu`'na **"Tüm adetleri asortile"** düğmesi eklendi (kalan adet bilgisi verilen
ekranlarda görünür; şu an paketleme).

**HESAP:** her beden için `kalan / o bedenin oranı` → bunların **en küçüğü** tam set sayısıdır.
Bir bedende 5 sete yetecek mal varken diğerinde 3 set varsa çıkan asorti 3 settir; fazlası
asortiye girmez, hücrelerde kalır. **Artanı zorla dağıtmak asortiyi asorti olmaktan çıkarırdı** —
koliyi açan kişi beklediği dağılımı bulamazdı.

Tam set çıkmıyorsa uyarı veriliyor: "Kalan adetler bir tam asorti setine yetmiyor — kalanı elle
girin". Başarılıysa kaç set dolduğu ve artanın boşta bırakıldığı söyleniyor.

> **DOĞRULANMADI:** senaryo tohumunda asorti tanımı yok, o yüzden düğme otomatik testte
> görünmüyor (asorti tanımsızken görünmemesi doğru davranış). Hesabın kendisi elle denenmeli:
> asorti tanımlı bir üretimde koli kurup düğmeye basın. Bir sonraki turda asortili tohumla ayrı
> senaryo yazılacak.

**Tam koşu:** 77 senaryo temiz (mevcut davranış bozulmadı).

## BÖLME — 13. TUR: ONAY SİSTEMİNİN BAĞI ÇÖZÜLDÜ (19 Eylül, v1.355.0)

**`076-uretim-sil.jsx` — `useUretimSil()`** (190 satır): üretim silme ve ona bağlı her şeyin geri
sarılması. Üretim açıldığı andan itibaren dört yere dokunmuş oluyor — hammadde stoktan çıkmış,
işçilik cariye yazılmış, mamul (tamamlandıysa) stoğa girmiş, satış siparişinin planlaması dolmuş.
Silmek hepsini geri sarmak demek; biri atlanırsa haftalar sonra "stok neden tutmuyor" diye geri
gelen bir fark kalır. Fiş ailesi birlikte siliniyor (`-İşçilik`, `-Giriş`, `-İade`).

**`075-onay.jsx` — `useOnaySistemi()`** (71 satır): **v1.350.0'da taşınamamıştı.** Sebep:
`onayUygula` silme zincirlerini çağırıyor, zincirler App'te çok daha sonra tanımlanıyor.

**Çözüm bir REF:** hook işleri `islerRef.current.X()` diye çağırıyor; App, zincirler hazır olunca
ref'i dolduruyor (`onayIsleriRef.current = { urunSilCascade, cariSilCascade, siparisSilCascade,
uretimSil, copaAt }`). Tanım sırası böylece bir bağımlılık olmaktan çıktı. **Önce bağı çözmek,
sonra taşımak** — v1.350.0'da taşımayı zorlamamak doğru karardı.

**On dört turun toplamı:** `100-app.jsx` 7.758 → **4.181** satır. **3.577 satır** çıktı (**%46**),
yirmi bir yeni dosya (`075`–`095`).

**Doğrulama:** `onay-duzenleme`, `silme`, `kullanici-rolleri`, `uretim`, `fis-defteri` aynı.
Tam koşu: 77 senaryo temiz.

> **BÖLME BURADA DURUYOR.** Kalan ~4.180 satırın büyük kısmı ekran bağlama kodu (JSX ve modüllere
> prop geçirme) ve küçük `saveX` sarmalayıcıları — ikisi de App'te durmalı. Daha fazla bölmek
> dosya sayısını artırır, anlaşılırlığı artırmaz.

## HESAP DÜZENLEME (19 Eylül, v1.356.0)

**Kullanıcı:** *"Banka listesi düzenleme olsun."* (v1.348.0'dan kalan madde.)

Kasa ve banka hesaplarında **ad, banka ve IBAN** artık düzenlenebiliyor. Önceden tek yol hesabı
silip yeniden açmaktı; hareketi olan hesap silinemediği için bu da mümkün değildi ve yanlış yazılan
ad kalıcı oluyordu.

**Para birimi DÜZENLENMİYOR** — hareketler o birimde yazıldı; sonradan değiştirmek geçmişi yanlış
gösterirdi. Düzeltme gerekiyorsa yeni hesap açılıp virman yapılır.

> **YAPILAMADI:** "tüm adetleri asortile" için senaryo yazma denemesi yarım kaldı — tohumdan
> üretim getirilebiliyor ama koli satırları çizilmiyor (üretim `tamamlandı` olduğu hâlde
> paketlemeye düşmüyor; muhtemelen `prosesIlerleme` boş olduğu için). Senaryo silindi, iş duruyor.
> Bir sonraki turda paketlemenin üretimi hangi şartla kabul ettiği çözülüp yazılacak.

**Tam koşu:** 77 senaryo temiz.

## ASORTİLİ KOLİ DÜZELTMESİ + FAZLA SEVK (19 Eylül, v1.357.0)

**1. Asortili koliler — v1.354.0 YANLIŞ KURULMUŞTU.** Kullanıcı: *"Koli kur içinde toplu koli
kurma yanlış mantık oldu. Şu anda kalanların hepsini tek koliye koyuyor; aslında asorti şeklinde
kolilere koyması gerekli."*

İlk sürüm N setin TOPLAMINI tek koliye yazıyordu. Ama asorti koli demek **içinde bir set olan
koli**: 3 set çıkıyorsa 3 AYRI koli kurulmalı — koliyi açan kişi bir set bulmalı, üç setlik yığın
değil. Düğme artık "Asortili koliler kur" ve her set için ayrı koli oluşturuyor; artan adetler
boşta kalıyor, elle ekleniyor.

**2. FAZLA SEVK UYARISI.** Kullanıcı: *"Fazla satış yaptık, bunu belirtmesi gerekli."*
136 çiftlik siparişe 160 çift sevk edilmişti ve ekranda hiçbir yerde görünmüyordu — durum yine
"Teslim edildi" diyordu. Artık `Fazla sevk (+24)` yazıyor, ipucunda sipariş/sevk karşılaştırması
var.

**Sıralama tuzağı:** renk grubunda en "geri"deki durum gösteriliyor; fazla sevk en ileri aşama
olduğu için sıralamada sona düşüyor ve hiç görünmüyordu. Fazla sevk artık sıralamayı atlayıp öne
çıkıyor — bu bir aşama değil, bir **uyarı**: sessiz kalırsa fatura ile sipariş tutmaz ve fark
aylar sonra bulunur.

**Doğrulama:** `senaryo-siparis-matris-sabit`e fazla sevk kalemi eklendi (6 istendi, 9 sevk edildi
→ "Fazla sevk (+3)"). Tam koşu: 77 senaryo temiz.

### ASORTİLİ KOLİ — ÇOKLU YAZMA HATASI (v1.358.0)

Senaryo yazılırken **gerçek bir hata çıktı:** 3 set için 3 koli kurulması gerekirken **tek koli**
kaydediliyordu. Sebep React'in toplu state güncellemesi — `koliEkle` döngüde üç kez çağrılıyor ama
her çağrı AYNI koli listesini görüyor, sonuncusu diğer ikisini eziyor. Kullanıcının ekranda
gördüğü de buydu ama sebebi ancak test yazınca ortaya çıktı.

**Düzeltme:** `koliEkleCoklu(adet, veri)` — numaralar ve kayıt TEK yazmada üretiliyor.

**Paketlemenin üretimi kabul şartı da çözüldü:** üretim beden listesini `bedenMiktarlari` alanından
okuyor (`bedenDagilimi` değil). Önceki turda senaryo yanlış alanı yazdığı için satırlar hiç
çizilmemişti — uygulamada sorun yoktu, testin kendisi yanlıştı.

**`senaryo-asorti-koli.js` (yeni):** 40→7, 41→12 kalan; asorti 40:2 / 41:3. Beklenen 3 set
(7/2=3, 12/3=4 → en küçük 3). Sonuç: **3 koli**, her birinde 40'tan 2 + 41'den 3, toplam 15 çift;
40'ta 1, 41'de 3 adet boşta. Tam koşu: **78 senaryo** temiz.

### İKİ GÖSTERİM DÜZELTMESİ (v1.359.0)

**1. "Sanki 2 üretimden girmiş gibi".** Kullanıcı: *"Tek üretimden 120 çift stoğa girdi ama sanki
2 üretimden girmiş gibi gösteriyor."*

Bir üretim PARÇA PARÇA teslim alınabiliyor (önce 10, sonra 5) ve her teslim ayrı bir stok
hareketi. Sevk satırındaki FIFO payları bu hareketleri ayrı ayrı gösterince **aynı üretim numarası
iki kez** görünüyordu. Paylar artık kaynak + fiş/üretim numarasına göre toplanıyor: bir üretim,
bir satır.

**2. Tedarik Planlama boşken sebebi yazıyor.** Kullanıcı: *"Eksik kalan tedarik planlama yine
yok."* — Aslında planlama DOĞRU çalışıyordu: 136 adetlik siparişin 160'ı sevk edilmiş, planlanacak
kalem kalmamıştı. Ama bölüm hiç çizilmiyordu ve boşluk bir cevap değil: kullanıcı "planlama
çalışmıyor mu" ile "planlanacak bir şey yok" arasını ayırt edemiyordu.

Artık yazıyor: *"Planlanacak kalem yok. Siparişin 136 adedinin tamamı karşılandı (24 adet FAZLA
sevk edildi — faturaya yansımalı)."*

**Doğrulama:** `senaryo-siparis-matris-sabit` — planlanacak kalem VARKEN mesaj çıkmıyor (null),
fazla sevk rozeti duruyor. Tam koşu: 78 senaryo temiz.

## TOPLU YAZDIRMA + DEPODA GÖRÜNÜMÜ (19 Eylül, v1.360.0)

**1. Toplu koli etiketi.** Kullanıcı: *"Toplu paketlenen ürünleri yazdırmak için toplu yazdırma
ekleyelim, ürünleri seçip toplu şekilde yazdırması için."* Asortili koli kurunca bir seferde
3-10 koli çıkıyor; etiketleri tek tek bastırmak aynı işi onlarca kez yapmaktı.
Koli listesinde **seçim kutusu + "Tümünü seç" + "Koli etiketlerini yazdır (N)"**. Etiket İÇERİĞİ
ile YAZDIRMA ayrıldı (`koliEtiketiIcerigi` / `koliEtiketleriYazdir`), tek koli yolu da aynı
fonksiyonu kullanıyor.

**2. "Depoda" görünümü.** Kullanıcı: *"Paketlenmiş ürünleri paketlendi ve depoya girmiş diye
ekleyelim... hem depo stoğumuz olur. Adet × koli sayısı şeklinde çıkabilir, aynı üretimden çıkanlar
için."*

Yeni çip: **Depoda** = paketlenmiş ama sevk edilmemiş koliler. **Ayrı bir durum alanı TUTULMUYOR:**
bir koli kurulduğu anda paketlenmiş ve depodadır, sevk edilince çıkar. İkinci bir alan tutmak iki
yerde iki gerçek demekti.

Üstte özet: aynı üretimden çıkan eşit adetli koliler toplanıyor —
`Üretim 10099 · Bot Siyah: 5 × 3 koli = 15`.

**Doğrulama:** `senaryo-asorti-koli` genişletildi — 3 koli kurulduktan sonra "Depoda" çipinde özet
`5 × 3 koli = 15`, 3 seçim kutusu ve "Koli etiketlerini yazdır (3)" düğmesi.
Tam koşu: 78 senaryo temiz.

> **BU TURDAN KALAN (kullanıcının aynı mesajından):**
> - Paketlenmiş ürünü TEKRAR paketleme kontrolü: sipariş ve üretim kaynağında aşım zaten
>   reddediliyor, ama SERBEST paketlemede böyle bir kontrol yok.
> - Satın alınan ürünler için paketleme (alış fişi kaynağı) — henüz yok.

## SEVKİYAT KURALLARI SIKILAŞTIRILDI (19 Eylül, v1.361.0)

**Kullanıcı:** *"Sevkiyat fazla yapılamasın. Olmayan ürün satılamaz. Mantığı iyi oturtalım."*

**1. FAZLA SEVK ARTIK REDDEDİLİYOR.** Eskiden yalnız İŞARETLENİYORDU (`fazlaGonderim`): fiş
kesiliyor, sipariş kapanıyor, fark ancak aylar sonra fatura tutmayınca görülüyordu — 136 çiftlik
siparişe 160 çift çıkmıştı. Artık işlem hiç yapılmıyor ve hangi bedende ne kadar fazla olduğu tek
tek yazılıyor ("sipariş aşılıyor" demek nereyi düzelteceğini söylemiyordu).

**2. OLMAYAN ÜRÜN SATILAMAZ.** Sevk edilen miktar mevcut stoğu aşamaz. Eksi stok teknik olarak
hâlâ mümkün (açılış göçü, sayım farkı) ama SATIŞLA eksiye düşmek başka: depoda olmayan malı sevk
etmiş görünmek hem müşteriye hem muhasebeye yanlış bilgi vermekti.
**Yalnız satışta:** alış siparişinde mal GİRİYOR; ilk denemede alış teslimatı da reddedilmişti,
`siparis.tip !== "Alış"` koşuluyla düzeltildi.

**3. "İki üretim girişi" — ikinci düzeltme.** v1.359.0'da paylar `kaynak|uretimId|fişNo` ile
birleştirilmişti ama yetmemiş: aynı üretimin iki teslim hareketinde `uretimId` birinde dolu
birinde boş olabiliyor ve anahtara girince ayrı sayılıyorlardı. Anahtar artık yalnız
**kaynak + belge numarası**.

**Doğrulama:** `siparis`, `siparisten-sec`, `tedarik-girisleri`, `cikis-fisi` aynı sonucu veriyor.
Tam koşu: 78 senaryo temiz.

> **ELLE DENENMELİ:** ret kurallarının senaryosu yazılamadı — fiş kesme formunu otomatik akışta
> açıp miktar girme adımı oturmadı. Kalan 4 iken 9 girip "Satış Fişi Oluştur" deneyin; "Sipariş
> aşılıyor" uyarısı çıkmalı ve fiş KESİLMEMELİ.

## "İKİ ÜRETİM" — ÜÇÜNCÜ VE ASIL DÜZELTME (19 Eylül, v1.362.0)

Kullanıcı aynı sorunu **üçüncü kez** bildirdi: *"Tek üretimdi ama 2 üretim girmiş gibi gösterdi."*

**İlk iki denemede yanlış katmanı düzeltmişim:**
- v1.359.0: paylar `kaynak|uretimId|fişNo` ile birleştirildi → yetmedi.
- v1.361.0: anahtar `kaynak|belge`ye indirildi → yine yetmedi.

**Asıl sebep:** birleştirme KALEM içinde yapılıyordu (`kaynakBul` sonucunda). Ama aynı beden fişte
**iki ayrı kalem** olarak durabiliyor — farklı teslim partileri ayrı kalem satırı — ve her kalemin
kendi payı hücreye AYRI AYRI ekleniyordu (`hucreler[b].kaynaklar.push(...)`). Kalem içinde
birleştirmek bu yüzden hiçbir şeyi değiştirmiyordu.

**Düzeltme:** hücre doldurulduktan sonra aynı belgeden gelen ikonlar orada da toplanıyor —
bir üretim = bir ikon, adet toplanmış.

> **DERS:** aynı belirti üçüncü kez geldiğinde "bir daha aynı yere bakmak" yerine belirtinin
> ÇIKTIĞI yerden (render) geriye doğru izlemek gerekiyordu. İlk iki düzeltme doğru ama etkisiz
> katmanlardaydı.

**Doğrulama:** tam koşu 78 senaryo temiz. Bu düzeltmenin kendi senaryosu YOK — sipariş kartını
otomatik akışta açma adımı oturmadı (kart tıklaması senaryoda çalışmıyor). **Elle bakın:** aynı
üretimden iki teslim partisi olan bir sevk satırında artık tek üretim ikonu görünmeli.

## PAKETLEMEDE KAYNAK KÜNYESİ (19 Eylül, v1.363.0)

**Kullanıcı:** *"Paketlemede sipariş no, siparişi veren cari gibi bilgiler de görünsün."*

Personel elinde ÜRETİM numarasıyla geliyor ama koliyi hangi müşteri için hazırladığını
bilmiyordu; cari boş kaldığı için etiket de müşterisiz basılıyor, koli rafta "kimin bu" diye
kalıyordu.

Koli formunun üstünde artık künye şeridi var: **Üretim 10099 · Sipariş SAT-9099 · Müşteri B**
(varsa teslim tarihi de). Üretim bir satış siparişinden doğduysa cari **kendiliğinden** seçiliyor —
kalemlerin `planlama.referansNo` değeri üretim numarasıyla eşleşerek bulunuyor.

Siparişe bağlı olmayan üretimde (stok için üretim) bunu açıkça yazıyor: *"Siparişe bağlı değil
(stok için üretim)"* — boş bırakmak "veri gelmedi" gibi okunabilirdi.

**Doğrulama:** `senaryo-asorti-koli` genişletildi — üretim 10099, ona bağlı SAT-9099 siparişi;
künye `Üretim 10099 · Sipariş SAT-9099 · Müşteri B` çıkıyor. Tam koşu: 78 senaryo temiz.

## ÜÇ AÇIK MADDE KAPANDI (19 Eylül, v1.364.0)

**1. Serbest paketlemede stok kontrolü.** Sipariş ve üretim kaynağında aşım zaten reddediliyordu;
serbest modda HİÇBİR kontrol yoktu ve aynı mal iki kez kolilenebiliyordu. Ölçü mamul stoğu:
depoda 10 çift varken 15 çiftlik koli kurmak, olmayan malı paketlenmiş göstermekti. **Sevk
edilmemiş kolilerdeki adetler de düşülüyor** — onlar fiziken zaten kutuda.

**2. Satın alınan ürünler paketlenebiliyor.** Alış siparişi artık okutulabiliyor ve listede
görünüyor. **Ölçü tersine çevrildi:** satışta paketlenecek olan henüz teslim EDİLMEMİŞ kalandır,
alışta ise teslim ALINMIŞ maldır — gelmemiş malı kolileyemezsiniz. Aynı formül ikisine de
uygulanınca alış siparişinde hiç satır çıkmıyordu.

**3. Planlama sekmesinde bekleyen sayısı.** Kullanıcı: *"Eksik miktarın üretimle mi satın almayla
mı geleceğini planlamamız lazım."* Üretim/satın alma seçimi zaten kalem bazında vardı
(`kalemTipleri`); eksik olan GÖRÜNÜRLÜKTÜ. Sekme artık `Tedarik Planlama (2 bekliyor)` yazıyor ve
turuncuya dönüyor — sekmeyi açmadan eksik olup olmadığı görülüyor.

**Doğrulama:** `paketleme`, `asorti-koli`, `sevkiyat`, `siparis`, `siparis-matris-sabit`,
`siparisten-sec` aynı sonucu veriyor. Tam koşu: 78 senaryo temiz.

> **ELLE DENENMELİ:** serbest modda stoktan fazla koli kurmayı deneyin ("Stok yetmiyor" çıkmalı);
> bir alış siparişi numarası okutup teslim alınmış kalemlerin listelendiğini görün.

## ELLE VERİLEN HAMMADDE REÇETEYİ EZİYOR (19 Eylül, v1.365.0)

**Kullanıcı:** *"Üretimden malzeme çıkış yaparken giden hammadde miktarını reçeteden çekiyor.
Elle doldurduğumuzda yazılıyor ama yine reçeteden çekiyor. Artan miktarı elle girdiğimiz değerden
hesaplıyor. Burada sadece elle girilen miktarı üretime çıkış yapması gerekiyor."*

**Tutarsızlık tam olarak buradaydı:** iş verirken kullanıcı miktarı değiştirebiliyor
(`verilenHammaddeler`) — reçete 300 desi diyor, ustaya 390 desi veriliyor. **Artan hesabı bu
değere göre** yapılıyordu (`(verilen − iade) / sağlam adet`) ama **stok çıkışı hâlâ reçeteden**
hesaplanıyordu. Aradaki 90 desi havada kalıyor, fiilen depodan çıkan mal ile kayıt tutmuyordu.

**Düzeltme:** `079-uretim-teslim` içinde tüketim önce `verilenHammaddeler`e bakıyor; kayıt varsa
o miktar düşülüyor, yoksa reçete kullanılıyor (elle girilmemiş satırlar için eski davranış aynı).

**Doğrulama:** `senaryo-verilen-hammadde`ye stok çıkış hareketlerinin ölçümü eklendi
(`cikisHareketleri`), böylece çıkışın hangi miktardan yapıldığı artık altın çıktıda görünüyor.
`uretim`, `hazir-urunler`, `fis-ozet` değişmedi. Tam koşu: 78 senaryo temiz.

> **ELLE DENEYİN:** reçetesi 1 desi olan bir malzemeden 3 çiftlik işe 5 desi verin; teslim
> alırken stok çıkışının 3 değil **5** olduğunu görün.

## HAYALET KARŞILANAN (20 Eylül, v1.366.0)

**Kullanıcı:** *"Sipariş toplamı 136 çift ama planlayabileceğim 120 çift görünüyor. Üretime 120
olarak gönderiyorum, 136 gitti görünüyor fakat üretimde 120 gitmiş. Çok tutarsız durum. (Bu sipariş
daha önce fazla sevkiyat yaptığım sipariş; üretim ve sevkiyatlarını silip yeniden planlarken oluşan
durum.)"*

**Kök neden:** sevkiyat/üretim silindiğinde sipariş kalemindeki `karsilanan` sayacı geri
alınmamış. 136 çiftlik siparişte 16 çift "karşılanmış" görünüyor ama ortada o sevkiyatı yapan
stok hareketi YOK. Sonuç: o 16 çift ne planlanabiliyor ne de teslim edilmiş sayılıyor —
hiçbir yerde görünmeden kayboluyor.

**Veri Denetimi'ne yeni kural: "Karşılanan miktar hareketlerden fazla".** Ölçü stok hareketleri;
çünkü sevk edilen mal stoktan çıkar ve o hareket siparişin kimliğini taşır. Hareket yoksa sevk de
olmamıştır. Bulgu, hangi siparişin hangi kaleminde kaç adet hayalet olduğunu yazıyor.

**Onarım düğmesi:** "Karşılananı düzelt" — sayacı gerçek sevk miktarına çekiyor, sipariş yeniden
planlanabilir hale geliyor.

### KÖK ÇÖZÜM — `013-karsilanan.jsx` (v1.367.0)

Kullanıcı: *"Karşılanan miktarı da stok hareketlerinden türetmek; stok miktarında yaptığımızın
aynısı. Onu es geçmeden yapalım."* — **Yapıldı.**

`siparisKarsilananlariHesapla(siparisler, stok)`: her stok hareketi `siparisId` + `kalemId`
taşıyor (`fisYaz` bunu zaten yazıyordu, geri alma da aynı çifti okuyor). Zincir kuruluydu; eksik
olan onu **kaynak kabul etmekti**. Artık sayaç tutulmuyor, hareketlerden hesaplanıyor —
"hayalet karşılanan" mekanik olarak imkânsız.

**Üç incelik:**
- **Yön:** satışta hareket negatif, alışta pozitif; karşılanan her ikisinde de pozitif.
- **Hareketsiz siparişe DOKUNULMUYOR:** eski kayıtlarda hareketler `siparisId` taşımıyor olabilir;
  sıfırlamak, teslim edilmiş siparişi açık göstermek olurdu. Veri Denetimi kuralı bu durumları
  ayrıca bildiriyor.
- **Kalıcı yazılıyor:** yalnız bellekte düzeltmek diskte hayalet bırakırdı, başka cihaz eski
  değeri okumaya devam ederdi.

**İki tuzak yaşandı:** (1) `setStok` içinde hesaplamak yetmedi — açılışta stok siparişlerden ÖNCE
yükleniyor, türetme boş listeyle çalışıp üzerine yazılıyordu; `useEffect`e alındı. (2) Effect
`saveSiparisler`den ÖNCE duruyordu ("before initialization"); tanımın altına taşındı.

**Doğrulama:** `senaryo-karsilanan-turetme.js` (yeni) — sayaçta 16 yazılı ama stokta 4 adetlik
sevk: **4'e çekiliyor**. Hiç hareketi olmayan siparişteki 5 **korunuyor**.
Tam koşu: **79 senaryo** temiz.

**Doğrulama:** 36 adetlik kalemde `karsilanan: 16` yazılı ama hiç hareket yok → denetim bulguyu
buluyor. Onarım düğmesinin senaryosu yazılamadı (bulgu grubunu açma adımı oturmadı);
**elle deneyin:** Tanımlar › Veri Denetimi › Denetimi Başlat → bulguyu açın → "Karşılananı düzelt".
Tam koşu: 78 senaryo temiz.

## EK ALINAN HAMMADDE (20 Eylül, v1.368.0)

**Kullanıcı:** *"Girişte adet belirtiyoruz, çıkışta artanı alıyoruz. Malzeme yetmeyince kullanıcı
fazla malzeme alabilir; bunu girmek için çıkışta bildirmesi gerek — teslim ederken artan malzeme
ve eksik kalan malzeme olarak girilebilsin."*

Girişte ne verildiği yazılıyordu, teslimde artan alınıyordu. Ama iş sırasında depodan EK malzeme
alınırsa bunun kaydı hiçbir yerde yoktu: **stok fiilen azalıyor, kayıt azalmıyordu.**

**Artan kutusunun hemen altına "+ek" kutusu eklendi.** İkisi aynı sorunun iki yönü ("fazla mı
kaldı, eksik mi geldi"); ayrı bir bölüme koymak, teslim eden kişinin onu görmeden formu
kapatmasına yol açardı.

**Ek alınan, iadenin tam tersi olarak işleniyor:** stoktan ÇIKAR ve kendi fişini alır
(`10015-Kesim-EkMalzeme`). Tüketimi doğrudan artırmak yerine ayrı hareket — "ne verildi, ne ek
alındı, ne geri geldi" üçü de kayıtta kalıyor; birim tüketim hesabı ancak böyle doğru çıkıyor.

**Fiş ailesine dahil:** üretim silinince `-EkMalzeme` hareketi de geri alınıyor; yoksa stoktan
düşmüş ama hiçbir üretime bağlı olmayan bir hareket kalırdı.

**Doğrulama:** `senaryo-verilen-hammadde`ye `ekAlinanKutusu` ölçümü eklendi (2 kutu çıkıyor);
`uretim`, `hazir-urunler` değişmedi. Tam koşu: 79 senaryo temiz.

### YERLEŞİM DÜZELTMESİ (v1.369.0)

**Kullanıcı:** *"Ek kullanılan ve artan malzeme yan yana olsunlar, şu an iç içe geçmiş. Üzerine
açıklama yaz, artan ve eksik malzeme olarak başlık yap."*

İki kutu ALT ALTA duruyordu; üstteki "0" ile alttaki "+ek" tek bir kutu gibi okunuyor, hangisinin
hangi satıra ait olduğu kayboluyordu. Artık **yan yana**.

Bölüm başlığı: **"Artan ve eksik malzeme"**. Üstünde iki satırlık açıklama, kutu renkleriyle
eşleşen küçük kareler:
- **Artan** — işten geriye kalan, stoğa geri döner
- **Ek alınan** — malzeme yetmeyince depodan fazladan alınan, stoktan düşer

Renk tek başına yetmiyordu; hangi kutunun ne olduğu ancak yazıyla anlaşılıyor.

**Doğrulama:** `senaryo-verilen-hammadde` başlık değişikliğine göre güncellendi; ölçümler aynı.
Tam koşu: 79 senaryo temiz.

### VERİLEN MİKTAR GÖSTERİMİ (v1.370.0)

**Kullanıcı:** *"Ek yazan gibi artan da yazsın. Bir de 1560 yazan adet, aslında verirken 1200
verdim; verirken adet değişmişse değişen adeti göstersin."*

**1.** Kutunun yanındaki sayı REÇETE miktarıydı. Elle 1200 verildiğinde ekranda hâlâ 1560 yazıyor,
kullanıcı artanı yanlış sayıya göre hesaplıyordu. Artık **verilen** yazıyor; reçeteden farklıysa
turuncuya dönüp yanında `(reçete 1560)` duruyor — ikisi de gerekli: biri "ne verdim", diğeri "ne
vermem gerekirdi".

**2. Aşım ölçüsü de düzeltildi:** iade kutusu reçeteye göre kontrol ediliyordu; 1200 verilmişken
1300 iade girilince uyarı çıkmıyordu (reçete 1560 olduğu için). Artık gerçekte verilene göre —
verilenden fazlasını iade etmek fiziksel olarak mümkün değil.

**3.** Artan kutusuna da `artan` yazısı kondu (ek kutusundaki gibi).

**Doğrulama:** `senaryo-verilen-hammadde`ye `verilenEtiketi` ölçümü eklendi: `/8 (reçete 6`.
Tam koşu: 79 senaryo temiz.

## KARŞILIKSIZ PARA HAREKETİ DENETİMİ (20 Eylül, v1.371.0)

Uzun süredir açık olan madde kapandı. Mevcut kural (2c) **cari tarafından** bakıyordu: "ekstrede
ödeme var, kasada yok". Yeni kurallar **ters yöne** bakıyor.

**Üç meşru karşılık var**, sırayla kontrol ediliyor:
1. **Virman** — para iki hesap arasında gezdi; karşı ayağı `muhasebeBagId` ile eşleşir.
2. **Gider/gelir kartı** — kira, elektrik gibi; cari yok ama karşılık var.
3. **Cari bağı** — ödeme/tahsilat; karşı tarafın cari hareketi DURUYOR olmalı.

**Üç yeni bulgu:**
- `para-hareketi-karsiliksiz` (orta): hiçbiri yok. Para hareket etmiş, nereye gittiği yazılmamış;
  kâr-zarar raporuna da girmiyor.
- `virman-tek-ayak` (ciddi): virman iki hareket yazar, biri silinmiş — **toplam kasa bakiyesi
  yanlış**.
- `para-bagi-kopuk` (ciddi): hareket bir cari kaydına bağlı ama o kayıt yok. En sinsisi, çünkü
  hareket "bağlı" görünüyor.

> **OTOMATİK ONARIM YOK, BİLEREK.** Paranın kime gittiğini sistem bilemez; tahmin etmek yanlış
> cariye borç yazmak olur. Karar kullanıcıda: hareketi düzenleyip gider kartı seçer, eksik ayağı
> yazar ya da kaydı siler.

Yeni hareketlerde karşılık v1.322.0'dan beri zorunlu; bu kural **eski kayıtlar** için — liste
zamanla kendiliğinden kısalır.

**Doğrulama:** `senaryo-karsiliksiz-para.js` (yeni) — dört hareketli kasa: karşılıksız, gider
kartlı (meşru, bulgu ÇIKMIYOR), tek ayaklı virman, kopuk bağ. Dördü de doğru sınıflanıyor.
Tam koşu: **80 senaryo** temiz.

## GELİR / GİDER KENDİ EKRANINDA (20 Eylül, v1.372.0)

**Kullanıcı:** *"Gelir gider kartlarını tanımlardan çıkaralım, finansın altına sekme açalım...
Gider kartlarını da cari gibi görmesi lazım. Giderlerin raporları vs. olacak."*

**Neden taşındı:** Tanımlar bir KURULUM ekranı — renk, beden, proses gibi bir kez doldurulup
unutulan şeyler. Gelir/gider kartları ise her gün kullanılan bir defter: yeni gider çıkar, kart
eklenir, rapor oradan okunur. İkisini aynı sayfada tutmak, günlük işi kurulum ayarlarının arasına
gömmekti. Artık **Finans › Gelir / Gider**.

**Kart artık cari gibi:** kendi **toplamı** ve **ekstresi** var.
- Toplam, o karta yazılmış bütün kasa/banka hareketlerinden hesaplanıyor (gelir eksi, gider artı).
- "Hareketler" düğmesi ekstreyi açıyor: tarih · hesap · açıklama · tutar, tarih sırasında.
- **Ayrı defter tutulmuyor:** hareketin kendisi zaten `giderKartId` taşıyor; ikinci bir kayıt iki
  yerde iki gerçek demek olurdu.

**Bir hata da yakalandı:** sekme menüde vardı ama ekran hiç bağlı değildi — tıklayınca boş sayfa
açılıyordu.

**Doğrulama:** `senaryo-gelir-gider.js` (yeni) — kart listeleniyor, toplam 24.000 çıkıyor, ekstre
iki hareketi tarih sırasında gösteriyor. `senaryo-gider-kartlari` yeni ekrana yönlendirildi,
`senaryo-menu-gruplari` nav sayısı güncellendi. Tam koşu: **81 senaryo** temiz.

> **SIRADAKİ (kullanıcının aynı mesajından, henüz YAPILMADI):**
> - Üretim işçiliklerini gider kartlarına bağlamak → "işçilik ödemeleri / işçilik karşılıkları" raporu
> - Kasa formunda cari ve gider kartını TEK seçicide birleştirmek ("ekstra gider" demeye gerek kalmasın)
> - Ürün bazlı kâr raporu (10'a alıp 12'ye satınca 2 kâr)

## ÜRETİM İŞÇİLİĞİ KÂR-ZARARDA (20 Eylül, v1.372.0)

**Kullanıcı:** *"Üretim işçiliklerini bu kartlara bağlayabiliriz. Rapor alırken işçilik ödemeleri
ve işçilik karşılıkları gibi rapor alabiliriz."*

**Not:** gelir/gider kartlarının Tanımlar'dan çıkıp Finans altına taşınması v1.371.0'da zaten
yapılmıştı (menüde **Finans › Gelir / Gider**).

**Eksik olan işçilikti.** İşçilik ücreti üretim sırasında cariye BORÇ yazılıyor (`-İşçilik` fişi)
ama kâr-zarar raporu bunu hiç saymıyordu; malın maliyeti yalnız hammadde sayılıyor, **brüt kâr
gerçekte olduğundan yüksek** görünüyordu.

**Neden SMM'nin içinde, ayrı bir gider değil:** işçilik malın üzerine biner — ayakkabı kesilmeden,
dikilmeden satılamaz. Kira gibi dönemsel bir gider değil, üretilen malın parçası. Muhasebede de
730 (Direkt İşçilik) satılan malın maliyetine girer.

**Neden cari hareketi ölçü alınıyor:** işçilik ödenmiş olsun olmasın DOĞMUŞTUR; ödeme ayrı bir
olaydır ve kasa tarafında görünür. Kullanıcının sorduğu **"işçilik karşılığı"** tam olarak bu:
hak edilmiş ama henüz ödenmemiş ücret de o dönemin maliyetidir.

Ayrıca **işçilik dökümü** eklendi: kime ne kadar hak edildi (çip listesi).

**Doğrulama:** `senaryo-kar-zarar`a 1.500 ₺ işçilik eklendi — brüt kâr 5.000 → **3.500**,
net kâr −15.000 → −16.500. Tam koşu: **81 senaryo** temiz.

## HAYALET REZERVASYON — KÖK NEDEN (20 Eylül, v1.373.0)

**Kullanıcı:** *"Üretim ihtiyacı her renk için 0,30 adet gerçekte doğru. Talep 1,96 diyor, ihtiyaç
2,56 diyor. Eski kayıtlardan mı çekiyor? Nerede karışıyor?"*

**BULUNAN KÖK NEDEN:** üretim planlandığında hammadde için **stok rezervasyonu** yazılıyor
(`stokrez:data`, `uretimNo` alanıyla). Üretim SİLİNDİĞİNDE bu defterden hiçbir şey
silinmiyordu — `uretimSil` stok hareketlerini, cari hareketlerini, sipariş sayaçlarını geri
alıyor ama **rezervasyon defterine dokunmuyordu**.

Rezervasyon Depo ekranında **açık talep** sayılıyor (`rezervasyonKarsilama`). Silinen her üretimin
talebi defterde kalınca talep ve ihtiyaç kümülatif olarak şişti: 0,30 olması gereken satır 1,96
gösterdi.

**2,56 sayısının kaynağı ayrı:** stok **−0,6** (eksiye düşmüş). Açık ihtiyaç hesabı
`talep − serbest` olduğu için `1,96 − (−0,6) = 2,56`. Bu kısım matematiksel olarak doğru — eksi
stoğu da kapatmak gerekir — ama tabloda "AYRILAN −0,6" diye görünmesi kafa karıştırıyor.

**Düzeltme:** `uretimSil` artık o üretimin rezervasyon kayıtlarını da siliyor (adımlar zincirine
dahil, yani yarım kalmıyor).

**Mevcut bozuk veri için:** Veri Denetimi'ne `hayalet-rezervasyon` kuralı eklendi — artık var
olmayan bir üretimin açık rezervasyonunu bulup listeliyor, "Yetim rezervasyonları temizle"
düğmesiyle siliyor.

> **DÜRÜST NOT:** denetim kuralının ve temizleme düğmesinin otomatik senaryosu YAZILAMADI —
> test ortamında `stokrez:data` tohumu okunmuyor (uygulama açılışta o anahtarı farklı ele
> alıyor olabilir), bu yüzden bulgu testte üretilemedi. Kural elle denenmeli:
> **Tanımlar › Veri Denetimi › Denetimi Başlat.**

**Aynı sınıf hata üçüncü kez:** `karsilanan` sayacı (v1.367.0'da türetmeye geçildi), şimdi
rezervasyon defteri. **Ortak desen: silme yolları türev kayıtları geri almıyor.** Kalıcı çözüm
rezervasyonu da türetmek olurdu; bugünlük silme + denetim ile kapatıldı.

Tam koşu: 81 senaryo temiz.

## GENEL GİDER VE ÇİFT BAŞI MALİYET (20 Eylül, v1.374.0)

**Kullanıcı:** *"Elektrik, kira, faturalar, SSK, vergi, araç giderleri, amortisman ve diğer
işçilik maliyetleri gibi veri yok. Bunları ortalama gireceğimiz bir alan oluşturalım, aylık satış
adedine bölüp çift başı ortalama gider maliyeti çıkaralım... Şoför 0,20 TL, muhasebeci 0,50 TL,
modelci 1 TL gibi. Aylık üretim hedefi koyalım; hem hedefler tutuyor mu görürüz hem maliyetin
gerçekleşmesini."*

**`397-genel-gider.jsx`** — Finans › Gelir / Gider ekranına ikinci sekme.

**Neden ayrı defter:** bu giderler kasadan ÇIKMADAN önce de bilinir — kira her ay 50.000'dir,
ödenmeden de maliyete girer. İki defter iki ayrı soruya cevap veriyor:
- **Gider kartları:** "bu ay ne ödedik?" (gerçekleşen)
- **Genel gider defteri:** "bir çift ayakkabı bana kaça mal oluyor?" (planlanan)

**Altı grup:** İşletme · Maaşlı personel · Vergi ve SGK · Araç ve lojistik · Amortisman · Diğer.

**Hedef bölen:** aylık üretim hedefi girilir, sabit giderler ona bölünür. Her kalemin yanında
**kendi çift başı katkısı** yazıyor (şoför 600 ₺ / 3.000 çift = **0,20 ₺/çift**), grup başlığında
grubun toplamı.

**Üç kutuluk özet:** aylık toplam · hedefe göre çift başı · **bu ay gerçekleşen çift başı**
(mamul giriş hareketlerinden sayılıyor). Hedefin altında üretilirse çift başı maliyet ARTAR ve
kutu turuncuya döner — "hedef tutuyor mu" sorusunun cevabı burada.

> **FASON İŞÇİLİK BURAYA GİRİLMEZ:** o zaten cariye borç yazılıyor ve kâr-zararda "Üretim
> işçiliği" satırında görünüyor. İki yerde saymak maliyeti şişirirdi. Maaşlı personel (şoför,
> modelci, muhasebeci) ise üretim adedine bağlı olmadığı için buraya girer.

**Doğrulama:** `senaryo-genel-gider.js` (yeni) — 60.000 kira + 600 şoför + 1.500 muhasebeci,
hedef 3.000: toplam **62.100 ₺**, çift başı **20,70 ₺**, şoför satırı **0,20 ₺/çift**.
Tam koşu: **82 senaryo** temiz.

> **SIRADAKİ:** çift başı genel giderin ÜRÜN MALİYETİNE yansıtılması — hammadde + işçilik +
> genel gider + kâr marjı = satış fiyatı önerisi (kullanıcının istediği son adım).

## OTOMATİK ONARIM KALDIRILDI (20 Eylül, v1.375.0)

**Kullanıcı:** *"Veri denetimi bizi yanlışa daha fazla sürüklüyor. Düzelttiği şey aslında üstünü
süpürmek... yanlış veriyi düzeltmek daha yanlış. Test aşamasındayız, kurallar belli ve net:
kayıtsız stok, hareket istemiyorum; neyin nereden geldiği belli olsun."*

**DÖRT ONARIM DÜĞMESİ DE KALDIRILDI:** "Defterden yeniden kur", "Fişten yeniden yaz",
"Karşılananı düzelt", "Yetim rezervasyonları temizle". Hepsi veriyi sessizce düzeltiyor, hatanın
NEDEN oluştuğunu gizliyordu — aynı hata ertesi gün yine oluşuyor, kullanıcı "düzelttim" sanıyordu.

Yerine bulgunun üstünde açıklama: **otomatik düzeltme yok**; düzeltme izi kalan bir işlemle
yapılır — stok farkı için **Bağımsız Stok Girişi** (sayım fişi), yanlış fiş için **fişi geri alıp
yeniden kesmek**, yetim kayıt için kaynağını düzeltmek.

**İKİ YENİ KURAL (ikisi de onarımsız, yalnız bildirir):**
- `kaynaksiz-hareket`: fiş numarası olmayan, kaynağı yazılmamış ya da **fişsiz gelip sonradan
  numara verilmiş** (`fisOtomatik`) stok hareketleri. Üçü de aynı soruyu cevapsız bırakıyor:
  "bu miktar nereden geldi?"
- `kaynaksiz-cari-hareketi`: fiş numarası olmayan cari hareketleri (açılış bakiyeleri hariç —
  onlar tanımı gereği belgesiz ve ayrı işaretli).

**DOĞRULANAN:** derleme zamanı denetimi (`fisdenetim.js`) hareket üreten **28 noktanın hepsini**
tarıyor ve hepsi fiş numarası yazıyor — yeni kod fişsiz hareket üretemiyor. Sorun eski kayıtlarda.

**Doğrulama:** `senaryo-kaynaksiz-hareket.js` (yeni) — fişsiz stok hareketi ve fişsiz cari hareketi
bildiriliyor, onarım düğmesi sayısı **0**. Onarım kullanan iki eski senaryo (`fis-defteri`,
`bekleyen-yazma`) yeni davranışa göre güncellendi: düğmenin OLMADIĞINI sınıyorlar.
**84 senaryo** tek tek karşılaştırıldı, hepsi altın çıktılarıyla aynı.

## PLAN–GERÇEK KARŞILAŞTIRMASI (20 Eylül, v1.376.0)

**Kullanıcı:** *"Genel gider çift başı maliyetteki gider kalemini giderlerden çeksin. Elle girilen
değerlerin yanında gerçekleşen değerler yazılsın, sapma var mı ne kadar görebilmek adına. Örnek:
kira 125.000 yazdık, çift başı 20,8 TL tuttu ama 6.000 çift değil 7.000 çift yaptık ve gerçek kira
maliyetini göstersin... Ana giderlerde alt gider de eklensin, fason işçilik gideri olsun, altına
kesim, saya vs."*

**1. Her kalem bir gelir/gider kartına bağlanabiliyor.** Bağlanınca o kartın BU AYKİ kasa/banka
ödemeleri toplanıp satırda gösteriliyor: `gerçek 138.000 ₺ · +%10 · 19,7 ₺/çift`.
- Sapma %5'in altındaysa yeşil, üstündeyse kırmızı (fazla) ya da mavi (az).
- Çift başı gerçek maliyet **gerçekleşen üretim adedine** bölünüyor — hedefe değil. 6.000 hedefe
  göre 20,83 ₺ olan kira, 7.000 çift üretilince 17,86 ₺'ye iniyor.

**2. Kullanıcı tanımlı gider grupları.** Sabit altı grup yetmiyordu; her atölyenin gider yapısı
farklı. Artık grup eklenip silinebiliyor ("Fason işçilik" açıp altına kesim, saya, montaj gibi).
**Kalemi olan grup silinemiyor** — altındaki kayıtlar sahipsiz kalırdı. Varsayılan altı grup
silinmiyor, yalnız başlangıç listesi.

**Zaten vardı:** üretim hedefinin yanında gerçekleşen adet ve gerçekleşen çift başı maliyet
(ekran görüntüsünde 8.936 çift · hedefin %149'u · 59,87 ₺).

**Doğrulama:** `senaryo-genel-gider` genişletildi — plan 60.000 / gerçek 66.000 → `+%10` sapması
ve grup ekleme düğmesi sınanıyor. **84 senaryo** tek tek karşılaştırıldı, hepsi aynı.

### TEK KAYNAK: GİDER KARTLARI (v1.377.0)

**Kullanıcı:** *"Gider grupları aslında buradan olacak: üretim giderleri bir grup, altında kesim
vs. olan giderler alt kalem. Gider eklerken gider alt kalemleri listelensin, oradan seçip eklemek
yeterli. Aylık üretim hedefinin yanında gerçekleşen hedef olsun."*

**1. Gruplar artık gelir/gider kartlarının gruplarından geliyor** (Üretim gideri 730 ·
Satış-pazarlama 760 · Genel yönetim 770 · Finansman 780). Ayrı grup listesi kaldırıldı — iki yerde
iki grup yapısı tutmak, "Kesim İşçilik Gideri" kartının bir grupta, genel gider kaleminin başka
grupta durması demekti.

**2. Kalem eklerken KART SEÇİLİYOR** (gruplara ayrılmış açılır liste). Kartı seçince ad, grup ve
gerçekleşen bağı kendiliğinden geliyor; elle ad yazmak aynı gideri iki farklı adla iki yerde tutmak
olurdu. Aynı kart ikinci kez eklenemiyor.

**3. Hedefin yanında gerçekleşen adet** — kutu aşağıda da var ama karar burada veriliyor: hedefi
yazarken bu ayın gerçeğini görmek gerekiyor. Hedefin altındaysa turuncu.

**Yakalanan yan etki:** gruplar değişince eski gruplu kalemler (`isletme`, `personel`…) hiçbir
başlığa girmiyor ve ekrandan **silinmiş gibi** görünüyordu. Tanımlı gruba girmeyen kalemler artık
**"Gruplanmamış (eski kayıt)"** başlığı altında duruyor.

**Doğrulama:** `senaryo-genel-gider` yeni yapıya göre güncellendi — grup başlığı "Genel yönetim",
kart seçici var, sapma `+%10`. **84 senaryo** karşılaştırıldı, hepsi aynı.

## ÜRÜN MALİYETİ VE SATIŞ FİYATI (20 Eylül, v1.378.0)

**Kullanıcı:** *"1 çift ürün için çift başı genel gider, hammadde gideri, işçilik gideri ve kâr
olarak satış fiyatı çıkarabiliriz"* + *"grup için yeni grup ekleme veya düzeltme olsun"*.

**1. Ürün kartı › Reçete sekmesinde zincir tamamlandı.** Hammadde ve işçilik zaten hesaplanıyordu;
eklenen:
```
  hammadde + işçilik            (Toplam Üretim Maliyeti — vardı)
+ çift başı genel gider          (aylık genel gider / aylık üretim hedefi)
= TAM MALİYET
× (1 + kâr marjı)
= ÖNERİLEN SATIŞ FİYATI
```
Genel gider hesabı `397-genel-gider` ile **aynı kaynaktan** okunuyor (ayrı hesap yazmak, iki ekranda
iki farklı maliyet demekti). Hedef girilmemişse uyarı çıkıyor, sessizce 0 sayılmıyor.

**Kâr marjı ÜRÜNE ÖZEL** (`product.karMarji`, varsayılan %30): her modelin kârlılığı farklı;
tek genel marj dayatmak pahalı modelde para kaybettirir.

**2. Gider grubu yönetimi** (Gelir/Gider Kartları bölümü): grup eklenebiliyor, **adı yerinde
düzenlenebiliyor**, TDHP kodu verilebiliyor. Altyapı vardı (`giderGelirGruplari` özel listeyi
okuyordu) ama arayüz yoktu, gruplar koda gömülüydü.
**Kartı olan grup silinemiyor** — altındaki kartlar sahipsiz kalırdı. Ad değişiyor ama anahtar
sabit kaldığı için kartların bağı kopmuyor.

> **ELLE DENENMELİ:** maliyet bloğunun senaryosu yazılamadı — otomatik akışta ürün kartının
> Reçete sekmesine geçme adımı oturmadı. **Stok › bir mamul › Reçete** açıp alt satırdaki
> "Tam maliyet / Önerilen satış fiyatı" şeridini kontrol edin.

**84 senaryo** karşılaştırıldı, hepsi aynı.

### GİDER GRUPLARI — TÜR SEÇİMİ (v1.378.0)

**Kullanıcı:** *"Grup için yeni grup ekleme veya düzeltme olsun."*

Ekleme ve ad düzenleme **zaten vardı** (Gelir/Gider ekranının üstünde); eksik olan iki şeydi:

**1. Tür seçimi.** Yeni grup hep "gider" olarak açılıyordu; gelir başlığı ("Hurda satışı",
"İhracat primi") kurulamıyordu. Kâr-zarar raporu türe göre ayırır — gider brüt kârdan düşer,
gelir eklenir — yani yanlış tür doğrudan yanlış kâr demekti.

**2. Test kapsamı yoktu.** `senaryo-gider-gruplari.js` (yeni): beş grupla başlıyor, "Fason
işçilik" (gider) ve "Hurda satışı" (gelir) ekleniyor, "Üretim gideri" → "Üretim maliyeti" diye
düzenleniyor; hepsi kalıcı yazılıyor ve türler doğru kaydediliyor.

**Tek kaynak hatırlatması:** bu liste kart formu, genel gider defteri ve kâr-zarar dökümü
tarafından okunuyor — grup adını değiştirince üçü birden değişiyor.

Tam koşu: **85 senaryo** temiz.

### TESTLER METİNDEN KURTARILIYOR — 2. TUR (v1.379.0)

1. turda (v1.341.0) 126 → 105 inmişti. Bu turda **105 → 69**.

**Dönüştürülenler:** `data-fis-kaydet` (Alış/Satış Fişini Kaydet), `data-cari-fis-ac="Alış|Satış"`
(cari kartından fiş açma), `data-onay-evet` (Evet, Onayla ve Kaydet).

**ÜÇ DÖNÜŞÜM GERİ ALINDI — ders:** "Vazgeç" ve "Tahsilat" her ekranda **farklı düğme**. Fiş
formundaki `data-fis-vazgec` işaretini koli formuna, kasa çubuğundaki "Tahsilat"ı da fiş
ekranına uygularken yanlış düğmeyi hedefledim; dört senaryo kırıldı (`cek-girisi`, `paketleme`,
`pesin-tahsilat`, `ozel-kod-ekle`). Geri alındı, metin haliyle bırakıldı.

**KURAL:** bir metin birden çok ekranda geçiyorsa, işaret vermeden önce **hangi düğme olduğu**
doğrulanmalı. Aynı yazı ≠ aynı iş.

Kalan 69 seçicinin çoğu tek kullanımlık ve ekrana özgü ("Tedarikçi A", "AS-1" gibi veri adları) —
bunlar zaten metne bağlı olmak zorunda.

Tam koşu: **85 senaryo** temiz.

### ÜRÜN MALİYETİ — SENARYO (v1.380.0)

Ürün maliyeti ve satış fiyatı önerisi **v1.378.0'da yapılmıştı** (ürün kartı › Reçete sekmesi,
"Toplam Üretim Maliyeti" bloğunun altında) ama senaryosu yoktu.

**`senaryo-urun-maliyeti.js`:** deri 100 ₺/desi × reçete 2 desi = 200 hammadde; kesim işçiliği 50;
genel gider 60.000 / 3.000 çift = 20. Ekranda **"Toplam Üretim Maliyeti: 250 ₺"**,
**"Tam maliyet: 270 ₺"**, %25 marjla **"Önerilen satış fiyatı: 337,5 ₺"**. Üçü de doğru.

Bu, kullanıcının 20 Eylül'de istediği zincirin son halkası: hammadde + işçilik + genel gider + kâr
= satış fiyatı. Artık dört parça da kayıt altında ve testli.

Tam koşu: **86 senaryo** temiz.

## ERP ARAYÜZ STANDARDI — 1. TUR (20 Eylül, v1.381.0)

Kullanıcı bir arayüz standardı belgesi verdi (`erp-tokens.css` + `erp-icons.svg` + dört adım).
**İki dosya yüklemede yoktu** — 1. adım (token) ve 2. adım (ikon sprite) onlar gelmeden
yapılamıyor. Dosyaya bağlı olmayan kısımlar yapıldı:

**3. adım — araç çubuğu tek parça (`352-eylem-cubugu.jsx`):**
- **Sıra bileşenin içinde sabit:** Yeni · Kaydet · Düzenle · Kopyala · Sil ┆ Ara · Filtre ⟶
  Yenile · Yazdır · Excel ┆ Küçült · Kapat. Eylemler hangi sırada verilirse verilsin tabloya göre
  dizilir; sayfada olmayan çıkar, kalanların sırası değişmez.
- **Kullanılamayan aksiyon gizlenmez, `disabled` olur** ve `title` nedenini yazar. Eski `gizli`
  seçeneği yok sayılıyor.
- Her düğmenin title'ında kısayolu: "Kaydet · Ctrl+S", "Vazgeç · Esc".

**Kısayollar (kontrol listesi maddesi):** Ctrl+S kaydet, Ctrl+N yeni, F2 düzenle, F5 yenile, Del
sil, Esc vazgeç — aktif pencerenin çubuğundaki işe bağlı. Çubukta karşılığı yoksa tarayıcı
davranışı korunuyor; varsa varsayılan engelleniyor (Ctrl+S'in "sayfayı kaydet" penceresi, F5'in
sayfa yenilemesi bir ERP'de form kaybı demek). Yazı alanı içindeyken Del ve Esc'e dokunulmuyor.

**Tuzak:** kısayol effect'i `usePencereler()`den ÖNCE durunca "aktifPencereId before
initialization" ile uygulama hiç açılmadı; hook'un altına taşındı.

**Doğrulama:** `senaryo-olcu-secimi` — title'lar `["Önce cari ve en az bir kalem gerekli",
"Vazgeç · Esc"]`, Esc pencereyi kapatıyor. Tam koşu: **86 senaryo** temiz.

> **BEKLEYEN (dosyalar gelince):** 1. adım token CSS, 2. adım ikon sprite, 4. adım sayfaları tek
> tek geçirme. Kontrol listesindeki bazı maddeler mevcut tasarımla ÇELİŞİYOR ve tartışılmalı:
> "hiçbir yerde köşe yuvarlatma yok", "gölge kullanmayın", "satır içinde aksiyon ikonu yok"
> (ürün kartında var), "toast sol altta + Geri al" (bizde sağ altta, geri al yok).

## TASARIM TOKENLARI (20 Eylül, v1.382.0)

**Kullanıcı:** *"Tasarımı ortak yapmamız lazım."*

Uygulamada **3.625 renk kullanımı, 119 farklı ton** vardı. En sık 16'sı (kullanımların %85'i)
semantik token'a çevrildi: `--erp-text/-2/-3`, `--erp-border/-2`, `--erp-panel/-2`,
`--erp-primary/-2`, `--erp-info`, `--erp-accent`, `--erp-warn`, `--erp-orange/-bg`,
`--erp-purple`, `--erp-danger`. **2.509 kullanım** `var(--erp-*)`'a bağlandı.

**Tek kaynak:** `ERP_TOKENLARI` tablosu (015-sabitler). Hem ekrandaki `:root` hem YAZDIRMA
ÇERÇEVESİ (`etiketYazdir`/`fisYazdir` iframe'i) bunu gömüyor — iframe'de tanımsız kalırsa yazı
siyaha düşerdi. Kullanıcının `erp-tokens.css`'i gelince aynı isimlerle üzerine yazar.

**Koşunun yakaladığı iki gerçek sorun:**
1. **Hex + alfa birleştirmesi (57 yer):** `renk + "14"` token'a uygulanınca
   `var(--erp-primary)14` geçersiz kalıyor, zeminler ŞEFFAFA düşüyordu. `alfaEkle(renk, "14")`
   yardımcısı: hex'e ekler, token'ı `color-mix(in srgb, … 8%, transparent)` ile karıştırır.
2. **Veri alanına sızıntı:** `renkKodu` (kayıtta saklanan renk) token almıştı; geri hex yapıldı.
   Veriye token yazılmaz — dışa aktarım ve yazdırma o değeri olduğu gibi kullanır.

**Test uyarlaması:** renk ölçen 3 senaryo inline `style.color` yerine `getComputedStyle`
okuyor (inline'da artık `var()` duruyor). `pesin-tahsilat` altını güncellendi: `color-mix`
sonucu `color(srgb 0.306 …)` biçiminde raporlanıyor ama değer aynı (0,306 × 255 = 78).

**Dokunulmayan:** template literal içindeki (yazdırma HTML) hex'ler ve nadir 103 ton. Onlar
kullanıcının token dosyası gelince ikinci turda.

Tam koşu: **86 senaryo** temiz.

> **KULLANICI ONAYI GEREKEN 4 MADDE** (standardın kontrol listesinde, mevcut görünümü kökten
> değiştirir): köşe yuvarlatma yok · gölge yok · satır içi aksiyon ikonu yok · toast sol altta
> + Geri al. Onaysız girilmedi.

## DÜĞME YERLERİ TEK TİPE (20 Eylül, v1.383.0) — BAŞLANGIÇ

**Kullanıcı:** *"En büyük sorunumuz butonların yerleri çok karışık. Kaydet bazen aşağıda bazen
yukarıda. Silme bazen sağ üstte bazen aşağıda. Düzenleme tuşu caride iki kere var. Bunları tek
tipe almamız lazım."*

**ENVANTER (nerede ne var):**

| Ekran | Kaydet | Sil | Düzenle | Eylem çubuğu |
|---|---|---|---|---|
| Cari kartı | 2 | 1 | **2** | yok |
| Ürün kartı | 1 | **8** | 0 | yok |
| Sipariş kartı | 1 | 0 | 0 | yok |
| Fiş formu | — | — | — | **var** (başlıkta) |
| Paketleme | 1 | 1 | 0 | yok |
| Kasa/banka | 2 | 3 | 1 | yok |
| Tanımlar | 1 | 2 | 1 | yok |

Yalnız fiş formu standarda uyuyor (eylemler pencere başlığında). Diğerleri kendi düğmelerini
alta/üste/satır içine koymuş.

**Bu turda — cari kartı referans sayfa yapıldı:**
- İki "Düzenle" iki ayrı şey yapıyordu: başlıktaki kalem ad/tipi, gövdedeki düğme
  telefon/adresi açıyordu. **Gövdedeki kaldırıldı**; başlıktaki kalem tek düzenleme modu, hepsini
  birden açıyor (`duzenleAcik = duzenleModu`).
- Başlık eylemleri işaretlendi: `data-kart-eylem="duzenle|pasif|sil"` — sıra sabit.

**KURAL (bundan sonra her kart için):** eylemler kartın BAŞLIĞINDA, sağda, sabit sırada:
Düzenle · (özel) · Sil ┆ düzenlemedeyken Kaydet · Vazgeç. Gövdede eylem düğmesi YOK.

**Doğrulama:** `senaryo-cari-kart` tek düğmeye geçirildi (işaretle bulunuyor). **86 senaryo**
temiz.

> **SIRADAKİ (standardın 4. adımı):** ürün kartı (8 sil düğmesi!), sipariş kartı, kasa/banka,
> tanımlar — her biri ayrı tur. Ürün kartındaki 8 "Sil" büyük olasılıkla satır içi ikonlar;
> standart "satır içinde aksiyon ikonu yok, seçim + toplu işlem" diyor — kullanıcı onayı gerek.

## ERP STANDARDI — DOSYALAR BAĞLANDI (20 Eylül, v1.384.0)

Kullanıcı `erp-tokens.css` ve `erp-icons.svg` yükledi. Üç adım tamam:

**1. Token CSS.** `src/tema/erp-tokens.css` DEĞİŞTİRİLMEDEN duruyor; `tema-gom.js` (yap.sh'a
eklendi) onu `src/001-tema-dosyalari.jsx` içine JS sabiti olarak gömüyor. Tek dosyalık HTML dış
dosya yükleyemez. **Dosyayı güncellemek = src/tema'ya kopyalayıp ./yap.sh.**

**İsim çakışması çözüldü:** kullanıcının `--erp-accent`ı KIRMIZI aksiyon; bizim kod aynı ismi
170 yerde KAHVE vurgu için kullanıyordu. Bizimki `--erp-brown` oldu.

**Köprü (`ERP_KOPRU`, 015-sabitler):** bizim semantik isimler onun paletine bağlı —
border→line, border-2→line-soft, panel-2→head, primary→ok, warn→wait, danger→void,
orange→accent (tek aksiyon rengi), brown→wait, purple→info. `--erp-text/-2/-3` ve `--erp-panel`
aynı isim, doğrudan onun değeri. Sonuç: **kod değişmeden tema değişti** — font Archivo, sayfa
zemini #f6f1ea, metin #24201b.

**2. İkon sprite.** c2pa metadata temizlendi (11 KB → 3,5 KB, 21 ikon), body açılışına gömüldü.

**3. Eylem çubuğu `.erp-ib`.** Düğmeler yazısız ikon (30×30, mobilde 44×44), sprite'tan
(`#i-save`, `#i-trash`…). Ad ve kısayol `title`da, `aria-label` var. Kaydet `erp-ib--primary`
(tek dolu kırmızı), Sil `erp-ib--danger`.

**Test uyarlaması:** 7 senaryo yalnız RENK değeri değiştiği için farklıydı (ok yeşili
#55702b, wait #a1651a); `satin-al-dugmesi` başlık metninde düğme yazıları artık yok (ikon).
`pencere-sekmeleri` sabit hex yerine `--erp-panel` token'ını okuyor. Altınlar güncellendi.

**Yapılmayan (onay bekliyor):** `--erp-radius: 0` var ama inline `borderRadius`lara
dokunulmadı; gölgeler duruyor; satır içi ikonlar duruyor; toast yeri aynı.

Tam koşu: 86 senaryo.

## MODELHANE — 2. TUR (20 Eylül, v1.385.0)

1. turun notunda planlanan üç işten ikisi yapıldı. Model kartına iki sekme:

**Reçete.** Satır yapısı ÜRÜN KARTIYLA AYNI (`hammaddeUrunId`, `renk`, `miktar`, `birim`,
`proses`) — koleksiyona alırken `modeliKoleksiyonaAl` zaten `recete`yi kopyalıyordu, artık dolu
gidiyor. Maliyet hammadde kartının **son alış fiyatından**; künyedeki **hedef maliyetle** yan
yana: "sığıyor" (yeşil) ya da "X ₺ aşıyor" (kırmızı). Modelci çizim aşamasında görüyor.
İşçilik ve genel gider burada yok — onlar koleksiyona alındıktan sonra ürün kartında.

**Numune turları.** Sektör pratiği: proto → geliştirme → onaylı numune (sealed sample). Her turun
fotoğrafı, tarihi, yorumu ve KARARI var (devam / revizyon / onay). **"Onay" kararı aşamayı
kendiliğinden "onaylı"ya çekiyor** — onaylı numune üretimin kalite ölçütü, aşamayla kopuk
kalamaz. Onaylı tur turuncu zeminle ayrılıyor.

**Yapılmayan (3. tur):** numune ÜRETİMİ — üretim modülünden "numune" işaretiyle: hammadde düşer,
mamul stoğuna girmez. Üretim modülü entegrasyonu, ayrı tur.

**Doğrulama:** `senaryo-modelhane` genişletildi — deri 120 ₺ ile reçete toplamı `120 ₺`; numune
turu açılıp "onay" verilince aşama `onayli`. Tam koşu: **86 senaryo** temiz.

## MODELHANE — 3. TUR: NUMUNE ÜRETİMİ (20 Eylül, v1.386.0)

**Kullanıcı:** *"Üretimi çift yapıyoruz ama numune tek de üretilebiliyor, yani ½ çift."*

**KARAR — ÜRETİM MODÜLÜ DEĞİL, AYRI KAPI (`numuneUret`, 100-app).** 1. tur notunda "üretim
modülünden numune işaretiyle" planlanmıştı; vazgeçildi. Üretim modülü stok ÜRÜNÜ ister, model
ürün değil (1. tur kararı); sanal ürünle kandırmak her okuma noktasına istisna koymak demekti.
Numune modelcinin elinde, tek parça, proses takibi olmadan yapılır — gereken tek şey:
- hammadde **reçete × miktar** kadar düşer,
- mamul stoğuna **girmez**,
- kendi fişi olur (`NUM-…`, yeni kaynak türü "Numune", `FIS_ON_EKLERI`ne eklendi),
- hammadde maliyeti tura yazılır, modelin geçmişine olay düşer.

**Yarım çift:** miktar seçeneği ½ / 1 / 2 çift. Reçete çift başına yazıldığı için tüketim
`reçete × 0,5`. `stokYuvarla` iki hane.

**Olmayan malzemeyle numune yapılmaz:** stok yetmiyorsa hiç yazmıyor (satış kuralıyla aynı).

**Kapı kaydı:** `kapidenetim.js` İZİNLİ_YAZICILAR'a `numuneUret` eklendi — derleme denetimi
yeni hareket yazıcısını hemen yakaladı, doğru çalışıyor.

**Tuzak:** ilk yazımda `setStok` kullanıldı — yalnız bellek, diske yazmıyor; senaryo "Üretildi
yazısı var ama deri düşmedi" diye yakaladı. Diğer kapılar gibi `saveStok`a çevrildi.

**Doğrulama:** `senaryo-modelhane` — deri 11 → **10,5** (½ çift), hareket `NUM-…:-0.5`, mamul
stoğuna giriş **yok**, turda "Üretildi" görünüyor. Tam koşu: **86 senaryo** temiz.

**Modelhane üç turu tamam:** künye/tasarım/teknik/geçmiş → reçete+maliyet, numune turları →
numune üretimi → koleksiyona alma.

## MODELHANE — 3. TUR (20 Eylül, v1.386.0)

**İki numune üretme yolu var, ikisi de kasıtlı:**

**1. Hızlı üret (zaten vardı — `numuneUret`, numune turunun içinde).** Reçeteyi adetle çarpıp
stoktan HEMEN düşer, fiş keser, geçmişe yazar. Atölyeye gitmeyen, modelcinin elinde yapılan tek
çift / yarım çift için. Stok yetmiyorsa hiç yazmaz.

**2. Atölye emri (bu tur — `numuneUretimiAc`).** Üretim modülünde gerçek bir emir: proses
takibi (kesim → saya…), personel ataması, işçilik. Kesim atölyede yapılacaksa bu.

**Sanal ürün (`uretimUrunu`, 015-sabitler):** üretim modülü 15 yerde `urun.recete`,
`urun.prosesUcretleri` okuyor; model ürün değil (1. tur kararı). 15 yere dal eklemek yerine tek
noktada sanal ürün: reçete ve ad emre kopyalanmış (`numuneMi`, `modelId`, `recete`), oradan
okunuyor. Beş dosyadaki `stok.find(p => p.id === siparis.urunId)` bu yardımcıya çevrildi.

**Mamul stoğuna girmemesi kendiliğinden:** teslim alma stoktaki ürünü id ile bulup miktar
artırır; sanal ürün stokta olmadığı için giriş yazılacak yer yok. Hammadde ise reçete üzerinden
normal düşer — istenen tam olarak bu.

**Tuzak:** iki düğme aynı `data-model-numune-uret` işaretini taşıyordu; senaryo yanlış düğmeyi
tıklayıp "Üretildi" yazısını göremedi. Atölye emri `data-model-numune-emir` oldu.

**Doğrulama:** `senaryo-modelhane` — emir açılıyor, `urunId: null`, reçete 1 satır kopyalanmış,
model adı "(NUMUNE)" ekli; Üretim ekranı emri hatasız gösteriyor. **86 senaryo** temiz.

### ÜRÜN KARTI — DÜĞMELER TEK TİPE (v1.387.0)

Envanterdeki "8 Sil" çözüldü: yalnız BİRİ ürün kartını siliyor (başlıkta). Diğer yedisi satır
içi işlemler — reçete satırı sil (6), beden sil, renk sil, fiyat kuralı sil. Bunlar standardın
"satır içinde aksiyon ikonu yok" maddesine giriyor ve **kullanıcı onayı bekliyor**; dokunulmadı.

**Yapılan:** Kaydet/Vazgeç düzenleme formunun BAŞINDAN kart BAŞLIĞINA taşındı — cari kartıyla
aynı düzen. Başlık eylemleri işaretlendi (`data-kart-eylem`): kapalıyken Düzenle · Pasif · Sil,
düzenlemede Kaydet · Vazgeç. Gövdede eylem düğmesi kalmadı.

**`senaryo-kart-eylemleri.js` (yeni):** ürün ve cari kartını AYNI işaretle ölçüyor —
ikisi de `["duzenle","pasif","sil"]` / `["kaydet","vazgec"]`. Sonraki kartlar (sipariş, kasa,
tanımlar) bu senaryoya eklenerek aynı kalıba zorlanacak.

**86 senaryo** temiz (+1 yeni = 87).

### SİPARİŞ KARTI — AYNI KALIP (v1.388.0)

Sipariş kartı zaten ortak `KayitEylemleri` bileşenini kullanıyordu (Düzenle · Kaydet · Sil,
`140-asorti`). Bileşene `data-kart-eylem` işareti ve kısayollu title eklendi; `SilOnayButonu`
yalnız kart eylemi olarak kullanıldığında işaret taşıyor (`kartEylemi` prop) — satır içi
silmeler kalıba karışmasın.

**Öğrenilen:** listeden açılan sipariş kartı SALT OKUNUR (eylem yok, yalnız PDF/WhatsApp);
düzenleme tam ekran pencerede. Senaryo `data-siparis-tam-ekran` ile pencereyi açıp ölçüyor.
Satır `role="button"` bir div — React onClick, DOM `onclick` değil; metinden yukarı çıkarak
tıklama bulamıyordu, `data-siparis-satir` işareti eklendi.

`senaryo-kart-eylemleri` üç kartı ölçüyor: ürün `duzenle·pasif·sil / kaydet·vazgec`, cari
`duzenle·pasif·sil`, sipariş `duzenle·sil`. **87 senaryo** temiz.

**Kalan kartlar:** kasa/banka (210-hesaplar), tanımlar (130).

## MALİYETTE PARA BİRİMİ (20 Eylül, v1.389.0)

**Kullanıcı:** *"Reçetede maliyet hesaplarken stok para birimlerini de hesapla. Şu anda her şey
TL gibi davranıyorsun ama USD veya EUR olanları da toplaman lazım."*

Deri çoğu zaman dolarla alınır; kartta **2,5 $** yazan fiyat **2,5 ₺** sayılıyor, maliyet 48 kat
düşük çıkıyordu. Üç ekran düzeltildi, tek yardımcıyla (`alisFiyatiTL(urun, kurlar)`,
015-sabitler; kur `muhasebe.kurlar`dan):

1. **Ürün kartı reçete maliyeti** (160) — `kurlar` prop'u App → StokModule → ProductMatrixCard
   zincirine eklendi.
2. **Model reçetesi** (390) — aynı zincir Modelhane'ye.
3. **Kâr-zarar SMM** (247) — burada ayrı bir hata çıktı: kod `p.alisPB` okuyordu, ürün kartı
   `alisParaBirimi` yazıyor. Alan adı hiç eşleşmediği için çevirme HİÇ çalışmıyor, dolarlık alış
   TL sayılıyordu. Kullanıcının bildirdiği belirtinin kâr-zarar tarafındaki kaynağı bu.

**Doğrulama:** `senaryo-modelhane` — deri 2,5 $ × 48 = **120 ₺**; `senaryo-urun-maliyeti` — deri
2 $ × 48 = 96, reçete 2 desi → 192 + işçilik 50 = **242 ₺** üretim maliyeti. **87 senaryo** temiz.

> Kur girilmemiş para biriminde (kur tablosunda yoksa) fiyat olduğu gibi kalıyor — sessiz
> düşürme yerine; ama bunu ekranda belirtmek gerek (sonraki tur).

## KÖŞE YUVARLATMA KARARI (20 Eylül, v1.390.0)

Kullanıcıya aynı ekranın iki görüntüsü gösterildi (yuvarlak / keskin); karar: **"köşe yuvarlama
olsun."** Standardın `--erp-radius: 0`'ı BİLEREK uygulanmıyor.

**Yine de tek sabite bağlandı:** 695 inline `borderRadius` sayısı dört kademeye çevrildi —
`--erp-r-sm` 4px (eski 2-5), `--erp-r-md` 7px (6-8), `--erp-r-lg` 11px (10-14),
`--erp-r-pill` 999px. Köprüde tanımlı (`ERP_KOPRU`). Fikir değişirse dördünü de
`var(--erp-radius)` yapmak yeter; kod değişmez. Yazdırma HTML'leri (template literal) dışarıda.

**Toast zemini** tema köprüsünün kapsamadığı eski kahve tondu (#4B3625); `--erp-toast` →
`--erp-shell` (temanın koyu menü rengi) oldu.

**Kalan üç tasarım kararı:** gölgeler · satır içi aksiyon ikonları · toast konumu + Geri al.

**87 senaryo** temiz.

## TEMA KABUĞU (21 Eylül, v1.391.0)

**Kullanıcı:** *"Tema olmadı mı, ne yapmam lazım?"* — Haklıydı. v1.384'te token CSS yüklendi ve
test `body` için doğru renkleri gördü; ama uygulamanın ANA KAPSAYICISI kendi fontunu (`Inter`)
ve yeşil radyal gradyanı basıp temayı eziyordu. Görünen tek fark birkaç düğmeydi. Test body'yi
ölçtüğü için yakalayamadı — ders: tema testi kapsayıcıyı ölçmeli, body'yi değil.

**Düzeltilen:**
- Ana kapsayıcı: `fontFamily: var(--erp-font)` (Archivo), `background: var(--erp-page)`;
  `ZEMIN_EFEKT_KREM` gradyanı kaldırıldı.
- Üst/alt çubuklar: `--erp-topbar`, 2px `--erp-line` çizgi; `ZEMIN_EFEKT_YATAY` kaldırıldı.
- Yan menü: **koyu** `--erp-shell`, yazı `--erp-shell-ink`; `ZEMIN_EFEKT_DIKEY` kaldırıldı.
- NavItem: aktif öğe `--erp-shell-2` zemin + beyaz yazı + sol kenarda `--erp-accent` çizgi
  (standardın `.erp-nav a[aria-current]` tanımı); pasif öğe %80 opak.

Görüntü: `tema-anasayfa.png`.

**Test:** `sekmeler` yalnız zemin rengi ve 2px konum farkı; altın güncellendi. **87 senaryo**.

> **KALAN (standardın kabuğu için):** `.erp-shell` grid (176px menü) yerine bizim 220px menü
> duruyor; anasayfadaki yeşil başlık bandı ve modül kartlarının renkleri hâlâ eski yeşil
> ailesinden (köprüde primary→ok). Gölge/satır içi ikon/toast kararları bekliyor.

## TEMA — KALAN KARARLAR (21 Eylül, v1.392.0)

**Kullanıcı:** *"Hepsini yap."*

- **Gölgeler kaldırıldı** (14 yer, `boxShadow: none`; inset olanlar — menü aktif çizgisi — kaldı).
  Standart: "gölge kullanmayın, 1px çizgi yeter."
- **Menü 176px** (standardın `.erp-shell` gridi); daraltılmış 64px aynı.
- **Anasayfa/nav başlık bandı** eski yeşil (#3C4F38) yerine `--erp-shell`; çizgili desen kaldırıldı.
- **Toast sol altta** (`left: 24`), mobilde iki kenara yayılıyor.
- **GERİ AL:** `showToast(mesaj, { geriAl })` — ikinci parametre verilirse toast'ta "Geri al"
  düğmesi çıkar, toast 9 sn kalır. Cari kartından kesilen fişe bağlandı.

**Geri al'ın tuzağı:** ilk sürüm fişi DEFTERDEN arıyordu; defter yazımı beklemede kalınca
(bulut yok) fiş bulunamıyor, geri al sessizce çalışmıyordu. Şimdi `fisYaz`ın döndürdüğü hareket
kimlikleriyle (`kimlikler` + `cariHareketleri`) doğrudan `yetimFisTemizle`ye gidiyor; deftere
bağlı değil. Çek/üretim kilitleri aynen geçerli. Hook'tan sonra tanımlı olduğu için ref ile geç
bağlama (onay sistemindeki çözüm).

**Satır içi aksiyon ikonları:** YAPILMADI — dördüncü karar. Reçete satırı, beden, renk, fiyat
kuralı silmeleri satır içinde; "seçim + toplu işlem çubuğu"na geçirmek kullanım akışını değiştirir,
ayrı tur.

**Doğrulama:** `senaryo-fis` — toast solda, "Geri al" var, basınca stok 3 → **7**. `sekmeler`
zemin rengi, `gorevler` takvim (vade bugün geçti) — altınlar güncellendi. **87 senaryo**.

### KASA/BANKA KARTI — AYNI KALIP (v1.393.0)

Hesap kartı başlığında düğmeler zaten doğru yerdeydi (Düzenle · Sil / Kaydet · Vazgeç); eksik
olan işaretler ve bir sapmaydı: **düzenleme modunda Sil de görünüyordu**. Diğer kartlarda
düzenlemede yalnız Kaydet · Vazgeç var; eşitlendi.

Hareket satırlarındaki kalem/sil ikonları satır içi — dördüncü karar, dokunulmadı.
Kart, listeden hesap seçilince açılıyor ("Soldan bir kasa seçin"); senaryo için
`data-hesap-satir` işareti eklendi.

`senaryo-kart-eylemleri` dört kartı ölçüyor: ürün, cari, sipariş, kasa — hepsi
`duzenle·(pasif)·sil / kaydet·vazgec`. **87 senaryo** temiz.

**Kalan kart:** tanımlar (130).

## SİLME ONAYI — KARMA YOL (21 Eylül, v1.394.0)

**Tanımlar ekranı kart değil:** her değişiklik anında kaydediliyor (49 nokta), başlık eylemi
yok. Kart kalıbı dört kartta tamam (ürün, cari, sipariş, kasa). Tanımlar'daki altı silme satır
içi — dördüncü kararın konusu. Kullanıcıya üç seçenek sunuldu, "devam" dedi; önerilen karma
yol uygulandı: **ikon satırda kalır, onay pencereyle.**

**`SilOnayButonu` yeniden yazıldı (140-asorti):** eski "Emin misiniz? Tekrar dokunun" çift
dokunuşu 3 sn içinde aynı yere ikinci dokunuşla siliyordu — telefonda kaydırırken yanlışlıkla
kolay. Şimdi pencere açılıyor: ne silineceği yazıyor, **"Sil"** (kırmızı, tek dolu düğme) ve
"Vazgeç"; Esc ve arka plana dokunmak kapatır. Standart: "düğmesi 'Sil' diyor, 'Tamam' değil."
İşaretler: `data-sil-onay` (ikon), `data-sil-penceresi`, `data-sil-onayla`, `data-sil-vazgec`.

**ASIL BULGU — SEKİZ ONAYSIZ SİLME:** taramada sekiz satır içi silme HİÇ onay sormadan
siliyordu: beden grubu, asorti, özel kod alanı (2), ürünün bedeni, ürünün rengi, fiyat kuralı,
görev. Hepsi `SilOnayButonu`na çevrildi, her birinin sorusu kendi (`"Siyah rengi bu üründen
kaldırılsın mı?"`). Standardın asıl derdi — yanlışlıkla silme — buydu.

**Test uyarlaması:** 10 senaryo eski çift dokunuşu kullanıyordu (`button[title^="Emin
misiniz"]`, "iki kez tıkla" döngüleri); ikinci adım `data-sil-onayla`ya yönlendirildi. Pencere
satırın DIŞINDA açıldığı için satır içinde arayan yardımcılar ikinci tıkta onu bulamıyordu.

**`senaryo-sil-onayi.js` (yeni):** asortiye dokun → silmiyor, pencere açık, düğme "Sil";
Vazgeç → kayıt duruyor; Sil → siliniyor. **88 senaryo** temiz.

### KUR EKSİK UYARISI (v1.395.0)

v1.389'da not edilen açık kapandı. Kur tablosunda olmayan bir birimde (ör. GBP) alış fiyatı
çevrilmeden sayılıyordu — 2,5 £ → 2,5 ₺; maliyet onlarca kat düşük ama sessiz.

`alisKuruEksik(urun, kurlar)` (015-sabitler): eksik birimi döndürür. Ürün kartı maliyet bloğunda
ve model reçetesinde kırmızı şerit: **"GBP kuru girilmemiş — bu birimdeki fiyatlar çevrilmeden
sayıldı, maliyet eksik."** Fiyatı sıfır olan satırlar uyarı üretmez.

**Doğrulama:** `senaryo-urun-maliyeti` — USD (kuru var) iken şerit YOK; deri GBP yapılınca şerit
VAR. **88 senaryo** temiz.

### SİMGE → KOD (v1.396.0)

**Kullanıcı ekran görüntüsü:** ürün kartında *"$, ₺ kuru girilmemiş"* — TL için bile. *"Kuru
otomatik çekmesi lazım."*

Kurlar zaten otomatik çekiliyordu (`muhasebe.kurlar` = `{USD, EUR}`). Sorun: **stok kartları
para birimini SİMGEYLE saklıyor** (`"$"`, `"€"`, `"₺"`); `kurlar["$"]` hiç bulunmadığı için v1.389
ve v1.395'teki yardımcılar dolar fiyatını çevirmiyor, uyarı da yanlış çıkıyordu.

**`alisPbKodu(urun)`** (015-sabitler): `₺/TL/TRY/boş → TRY`, `$ → USD`, `€ → EUR`, `£ → GBP`.
Cari ekranındaki `PARA_KODU` eşlemesiyle aynı mantık. `alisFiyatiTL` ve `alisKuruEksik` bunu
kullanıyor — ürün kartı, model reçetesi ve kâr-zarar SMM üçü birden düzeldi.

**Neden test yakalamadı:** test verisi kodla (`"USD"`) yazılmıştı, gerçek veri simgeyle.
**DERS: test verisi gerçek verinin BİÇİMİNDE olmalı.** `senaryo-urun-maliyeti` artık `"$"` ile.

**88 senaryo** temiz.

> **YAPISAL NOT:** para birimi iki biçimde dolaşıyor (simge ve kod). Uzun vadede tek biçime
> (kod) göç edilmeli; şimdilik her okuma noktası çeviriciden geçmeli.

## REÇETE MALİYET DÖKÜMÜ (21 Eylül, v1.397.0)

**Kullanıcı:** *"Reçetede bunu detaylandıralım. Stoğun para birimi ve kendi birimi ile tutarı ve
TL tutarı; reçetede hangi para birimiyle maliyet isteniyorsa ona bölecek. Ayrı bir alanda her
birimin toplamları. Örnek göster öyle başla."* — Önce tablo örneği gösterildi, onay: "çok iyi".

**Ürün kartı › Reçete › maliyet bloğu:**
1. **Maliyet birimi seçici** (₺ TRY · $ USD · € EUR), ürüne kaydedilir (`maliyetBirimi`). Kuru
   olmayan birim pasif. Seçiliyse yanında `1 $ = 48,70 ₺`.
2. **Satır dökümü tablosu:** Hammadde · Miktar (birimiyle) · Birim fiyat (kendi biriminde) ·
   Tutar (kendi) · TL · seçilen birim. Toplam satırı.
3. **Para birimi dağılımı:** `$ 6,25 $ = 304,38 ₺ · %83` gibi çipler — maliyetin ne kadarı hangi
   kura bağlı. Tek birim varsa gösterilmez.
4. **Özet de seçilen birimde:** hammadde, işçilik, toplam üretim, çift başı genel gider, tam
   maliyet, önerilen satış fiyatı.

**Hesap:** her satır önce TL'ye (`alisFiyatiTL`, simge→kod), sonra hedef birimin kuruna bölünür —
çapraz kur (€ → $) doğru. Tutarlar artık hep iki ondalık.

**Doğrulama:** `senaryo-maliyet-dokumu.js` (yeni) — örnekle AYNI veri: toplam **368,25 ₺ =
7,56 $**, dağılım $ %83 · ₺ %13 · € %5. (Örnekte TL payı %12 yazılmıştı; gerçek 12,8 → %13.)
`urun-maliyeti` yalnız biçim farkı (242 → 242,00). **89 senaryo** temiz.

## MALİYET SEKMESİ VE FİYAT GRUPLARI (21 Eylül, v1.398.0)

**Kullanıcı:** *"Bu listeyi maliyet sekmesi olarak aç, buradan satış fiyatı oluşturalım.
Tanımlı fiyatları çekip eklediğimiz fiyatlar çeksin. Örnek: toptan USD fiyat tanımladık ve
toptan USD cari o fiyattan o stoğu alsın."*

**1. Maliyet sekmesi.** Reçete sekmesindeki maliyet bloğu (seçici, döküm, dağılım, özet)
**Maliyet** adlı yeni sekmeye taşındı; Reçete'de yalnız "Maliyet ve satış fiyatı → Maliyet
sekmesi" düğmesi kaldı.

**2. Satış fiyatı oluştur paneli (Maliyet sekmesinin altında).** Tanımlardaki her SATIŞ fiyat
grubu + "Genel" bir satır: grubun para birimi, **marj %** (ürün+grup başına, `grupMarjlari`),
**önerilen fiyat** (tam maliyet × (1+marj) ÷ grubun kuru), **mevcut fiyat** (önerinin altındaysa
kırmızı fark), **Uygula**. Uygula, `fiyatKurallari`na `kapsam: fiyatGrubu` kuralını GRUBUN PARA
BİRİMİYLE yazar (+ fiyat geçmişi logu, `kaynak: "maliyet"`). Genel satırı `satisFiyati`nı yazar.

**3. ALTYAPI AÇIĞI KAPATILDI — kural para birimi taşımıyordu.** "Toptan USD" grubunun 6,30'u TL
çalışan cariye kesilen fişte **6,30 ₺** olarak gidiyordu. Şimdi:
- Fiyat grubu tanımında para birimi seçiliyor (Tanımlar › Fiyat Grupları, `paraBirimi`).
- Kural `paraBirimi` taşıyor; `fiyatBul` onu döndürüyor (eski kurallarda ürünün birimi, yoksa TRY).
- `fiyatFiseCevir(fiyat, kaynakPb, fisPb, kurlar)` (075-fis-ortak): önce TL, sonra fişin birimi;
  kur yoksa çevirmez ve uyarır. Fiş formu ürün seçilince bunu kullanıyor.

**Doğrulama:** `senaryo-fiyat-grubu.js` (yeni) — tam maliyet 242 ₺ × %25 ÷ 48 = **6,30 $** öneri;
Uygula → kural `fiyatGrubu:6.3:USD`; gruba atanmış **USD cari fişte 6,3**, **TL cari fişte
302,4** (6,3 × 48). `urun-maliyeti` ve `maliyet-dokumu` yeni sekmeye yönlendirildi.
**90 senaryo** temiz.

### MALİYET ÖZETİ — TEK SÜTUN (v1.399.0)

**Kullanıcı:** *"Fiyat kalemlerini sağ tarafa at, hepsi kimi ortada kimi sağda olmasın:
hammadde toplamı, işçilik toplamı, genel gider, kâr, toplam fiyat. Toplam fiyatın yakınına para
birimi tiplerini ekle; altta fiyat grupları; işçilik fiyatları detaylı yazsın."*

Özet artık muhasebe fişi gibi: sağa yaslı iki sütunlu ızgara (etiket | tutar), üstten alta
**Hammadde → İşçilik · Kesim / İşçilik · Saya / (ara prosesler) → İşçilik toplamı → Genel
gider (çift başı) → Tam maliyet → Kâr (marj kutusu satırda) → Toplam fiyat**. Para birimi
tipleri (₺ $ €) toplam fiyatın yanında; üstteki eski seçici kaldırıldı. Altında "Satış fiyatı
oluştur" paneli (v1.398).

İşaretler: `data-ozet-hammadde/-iscilik/-iscilik-satir/-genel/-tam/-kar/-toplam`.
`senaryo-urun-maliyeti` işaretlerden okuyor: 192 + 50 + 20 = 262, kâr 65,50, toplam 327,50.
Görüntü: `maliyet-ozeti.png`. **90 senaryo** temiz.

### MALİYET ÖZETİ DÜZENİ (v1.399.0)

**Kullanıcı:** *"Fiyat kalemlerini sağ tarafa at, kimi ortada kimi sağda olmasın: hammadde
toplamı, işçilik toplamı, genel gider toplamı, kâr, toplam fiyat. Toplam fiyatın yakınına para
birimi tiplerini ekle ve altta eklemek istediğimiz fiyat gruplarını seçip girelim."*

**Özet artık muhasebe fişi gibi:** iki sütunlu grid (etiket | rakam), sağa yaslı, 460px.
Hammadde → İşçilik (proses bazlı alt satırlar + toplam) → Genel gider → **Tam maliyet** (çizgi)
→ Kâr (marj kutusu + tutar) → **Toplam fiyat** (kalın çizgi, büyük). Para birimi tipleri
(₺ $ €) "Toplam fiyat" etiketinin hemen yanında.

**Fiyat grupları paneli:** tüm gruplar otomatik listelenmiyor. Kullanıcı grubu SEÇER → fiyat
öneriyle dolu gelir → düzeltir → Ekle. Kayıtlı olanlar altta listede: fiyat, öneri, fark yüzdesi
(kırmızı = önerinin altında), "Öneriye eşitle", sil.

**Doğrulama:** `senaryo-fiyat-grubu` yeni akışa (seç → Ekle) geçirildi; sonuç aynı (6,30 $ / TL
cari 302,4). Görüntü: `maliyet-ozet.png`. **90 senaryo** temiz.

## FİYAT GRUBU DÜZENLEME (21 Eylül, v1.400.0)

**Tanımlar › Fiyat Grupları:** ad, tip (Satış/Alış) ve **para birimi** satır içinde
düzenleniyor, anında kaydediliyor. Silme artık pencereli onayla ("bu gruba atanmış carilerin
grubu boşalır" uyarısıyla).

**Neden gerekliydi:** para birimi alanı v1.398'de geldi; ondan önce açılmış "Toptan USD" gibi
gruplar TL sayılıyordu ve tek yol silip yeniden açmaktı.

**Yan etki yakalandı:** grubun para birimi sonradan değişince üründe o gruba TL ile kayıtlı eski
fiyat eski birimde kalıyor (300 ₺, grup artık $). Ürün › Maliyet › Fiyat grupları listesinde
kırmızı uyarı: *"grup artık $ — fiyat ₺ ile kayıtlı, 'Öneriye eşitle' ile yenileyin"*.
"Öneriye eşitle" artık grubun GÜNCEL birimiyle yazıyor.

**Doğrulama:** `senaryo-fiyat-grubu-duzenle.js` (yeni) — grup USD yapılıyor (kalıcı), eski TL
kuralı uyarı alıyor, eşitleme `fg1:6.3:USD` yazıyor, uyarı kalkıyor. `satin-al-dugmesi` yalnız
açılış toast'unun zamanlaması. **91 senaryo** temiz.

> **Kullanıcı için:** "Toptan USD" grubunuzu Tanımlar'dan açıp para birimini USD yapın; sonra
> ürünlerde o gruba TL ile girilmiş fiyat varsa Maliyet sekmesinde uyarı çıkar, "Öneriye
> eşitle" ile dolara geçirin.

## MALİYET YAZDIR (21 Eylül, v1.401.0)

**Kullanıcı:** *"Maliyet yazdır ekranı olsun, hangi fiyat birimi seçili ise o halde yazdırsın.
Reçetedeki yazdır kurları TL çekiyor; maliyetteki gibi olabilir veya fiyatları kaldırabiliriz,
maliyette var."*

**`MaliyetYazdir` (275-yazdir):** Ürün › Maliyet › "Maliyet Yazdır (PDF)". Ürünün seçili
`maliyetBirimi`nde: başlıkta birim ve kur (`Ürün Maliyeti · $ USD · 1 $ = 48,70 ₺`), hammadde
tablosu (proses, hammadde, miktar, birim fiyat ve tutar kendi biriminde, TL, seçili birim), para
birimi dağılımı, işçilik, sağa yaslı özet (hammadde → işçilik → genel gider → tam maliyet → kâr →
toplam fiyat), kayıtlı satış fiyatları. Hesap ürün kartıyla AYNI yardımcılardan — ikinci formül yok.
Pencere tipi `maliyet` (App'te bağlı). Dosya adı `Maliyet-<ürün>-<birim>`.

**Reçete yazdırma sadeleşti:** birim fiyat, tutar ve işçilik ücreti sütunları ile alttaki
maliyet özeti KALDIRILDI. Reçete atölyeye gider — ne kadar malzeme; fiyat maliyette. Altta not:
"Fiyat ve maliyet bilgisi ayrı: Ürün kartı › Maliyet › Yazdır."

**Doğrulama:** `senaryo-maliyet-dokumu` — yazdırma açılıyor, başlık `$ USD · 1 $ = 48,70 ₺`,
toplam fiyat **9,83 $** (7,56 hammadde × 1,30). `satin-al-dugmesi` toast zamanlamasına bağlı
oynuyordu; fixed-eleman ölçümünden toast çıkarıldı, artık kararlı. **91 senaryo** temiz.

## BULUT HATASI AÇIKLAMASI (21 Eylül, v1.402.0)

**Kullanıcı ekranı:** `Supabase 401: {"code":"42501", ... GRANT ... TO anon ... permission denied
for table muhasebe}` — *"Hiç işlem yapılmadı kasada. Veritabanını sıfırlamıştım, kasayı
sıfırlamadı ondan olabilir."*

**Gerçek sebep:** kasa ya da sıfırlama DEĞİL. `42501` + rol `anon` = istek **oturum jetonu
olmadan** gitti. `rls-kimlik.sql` anonim yazmayı bilerek kapatıyor. Kasada işlem yapılmadan
yazma olmasının sebebi **günlük otomatik kur çekimi**: açılışta kur güncel değilse `kurlariCek`
çalışıp `muhasebe` kaydına yazıyor — bu cihazda bulut oturumu olmadığı için reddedildi.
(Diğer tablolar o oturumda hiç yazılmadığı için listede yalnız kasa/banka/çek göründü.)

**`bulutHatasiAciklamasi(hata)`** (015-sabitler): ham hatanın üstünde kalın, insan dilinde satır:
- 42501 + anon → "Bu cihaz buluta GİRİŞ YAPMADAN yazmaya çalıştı… çıkış yapıp bulut hesabınızla
  yeniden girin, sonra Yeniden dene"
- 42501 (başka rol) → "rls-kimlik.sql yeniden çalıştırılmalı (tablo sıfırlandıysa yetkiler de)"
- 42P01 / does not exist → "tablo yok, kurulum SQL'i çalıştırılmalı"
- Failed to fetch → "bağlantı yok"
Ham metin altta küçük puntoyla duruyor (destek için).

**91 senaryo** temiz.

> **Kullanıcıya:** çıkış yapıp bulut hesabıyla girin → Yeniden dene. Düzelmezse Supabase SQL
> Editor'de kontrol: `select grantee, privilege_type from information_schema.role_table_grants
> where table_name='muhasebe';` — `authenticated` görünmüyorsa rls-kimlik.sql yeniden çalıştırılır.

### OTURUM DÜŞTÜ ŞERİDİ (v1.403.0)

v1.402.0 hatayı insan diliyle açıklıyordu ama **uygulama oturumun düştüğünü fark etmiyordu**:
`jetonTazele` başarısız olunca `oturumYaz(null)` sessizce çalışıyor, sonraki her yazma ANONİM
gidip 42501 ile reddediliyordu. Kullanıcı ancak kırmızı şeritte ham hatayı görünce anlıyordu.
(Not: v1.402.0 kullanıcıya ulaşmamış bir önceki denemede üretilmişti; bu tur onu doğrulayıp
tamamladı.)

- `030-supabase`: `oturumDustuDinle(fn)` — jeton yenilenemeyince dinleyici çağrılıyor.
- App: `oturumDustu` durumu; ya bu bayrak ya da bekleyen yazmalarda 42501/anon hatası varsa en
  üstte kırmızı şerit: **"Bulut oturumunuz kapandı. Kayıtlar bu cihazda duruyor ama buluta
  gitmiyor."** + **"Yeniden giriş yap"** → `BulutGirisEkrani` `sebep: "oturum-dustu"` ile,
  açıklaması: "hiçbir şey kaybolmadı, giriş yapınca bekleyen kayıtlar gönderilir".
- Giriş tamamlanınca bayrak iniyor.

**Kasada işlem yokken yazma neden?** Açılıştaki otomatik kur güncellemesi `muhasebe` kaydına
yazıyor (kurlar orada). Diğer tablolar o oturumda yazılmadığı için listede yalnız kasa/banka/çek.

**Doğrulama:** `senaryo-oturum-dustu.js` (yeni) — 42501/anon hatası uygulamanın kendi kanalından
(`__bekleyenYazmaDegisti`) veriliyor; şerit + düğme var, basınca giriş ekranı "Oturumunuz kapandı"
ile açılıyor. **92 senaryo** temiz.

## MALİYET SEKMESİ — 5 İSTEK (21 Eylül, v1.404.0)

**1. Maliyet yazdırmada kayıtlı satış fiyatları kaldırıldı.**

**2. BOY FİYATLARI ("boy olan fiyatları maliyet çekmiyor").** Boylu malzemelerin (fermuar,
bağcık, fort bombe 1 mm…) alış fiyatı kartta değil `fiyatKurallari`nda **boy/renk kuralı** olarak
duruyor; maliyet yalnız `alisFiyati`na baktığı için 0 çıkıyordu. `hammaddeBirimFiyati(hm, renk,
boy, kurlar)` (015-sabitler) fişlerin kullandığı `fiyatBul` ile Alış fiyatını buluyor; kural
yoksa kart fiyatı. Ürün kartı dökümü ve Maliyet Yazdır bunu kullanıyor. **Boy** satırda
gösteriliyor (`Fermuar · Siyah · 50 cm`), fiyat kuraldan geldiyse altında "Boy fiyatı".

**3. DÜZENLENEBİLİR MALİYET.** Döküm tablosunda birim fiyat, özet sütununda işçilik (proses
başına) ve çift başı genel gider artık kutu. Seçili birimde yazılır, TL kaydedilir.
- Birim fiyat **kaynağına** yazılır: boy/renk kuralından geldiyse o kurala, yoksa karta.
- İşçilik `prosesUcretleri`ne (Reçete'deki "İşçilik ₺/adet" ile aynı alan).
- Genel gider **ürüne özel** `genelGiderCiftBasi` (TL); "ürüne özel · sıfırla" ile defter
  hesabına döner. Maliyet Yazdır aynı kuralı kullanıyor.

**4. ÇİFT MİKTAR KUTUSU KALKTI.** Renk×beden düzeninde "Hammadde Rengi" altındaki kutu üstteki "N
beden — hepsinde aynı miktar" kutusuyla birebir aynıydı → kaldırıldı. Pozisyon düzeninde satır
kutusu yalnız **birden çok pozisyon** varken görünüyor (o zaman her pozisyonun kendi miktarı
olabilir). Tek renk düzenindeki kutu tek giriş olduğu için kaldı.

**5. ÜRETİM SAPMALARI MALİYET SEKMESİNDE.** "Üretimden ölçülen tüketim" Reçete'den taşındı ve
yalnız FARKI olan üretimleri gösteriyor: **Üretim no · Stok (renk, boy) · Fark (çift başı) ·
Fark (toplam)**. Veri: `receteGerceklesmeEkle` artık sapan her ölçümü üretim numarasıyla
`sapmalar`a yazıyor (son 30); teslimde `uretimNo` ve `toplamFark` ölçüme eklendi. Eski kayıtlar
(üretim no tutulmadan önce) "N ölçüm ort." satırı olarak görünüyor.
**Kaybedilip geri konan:** yeterli ölçüm + anlamlı farkta *"reçeteyi X yapmayı değerlendirin"*
önerisi — taşıma sırasında düşmüştü, `recete-gerceklesme` senaryosu yakaladı.

**Doğrulama:** `senaryo-maliyet-duzenle.js` (yeni) — kart fiyatı 0 olan fermuar boy kuralından
4 ₺; maliyette 5 yapılınca **kurala** yazıldı (kart 0 kaldı); genel gider ürüne özel 25; sapma
tablosunda yalnız `10077 · +0,2`. `recete-gerceklesme` yeni panele, `maliyet-dokumu` kutu okumaya
geçirildi. **93 senaryo** temiz.

## REÇETE ŞABLONLARI + MODELHANE KATALOG (21 Eylül, v1.405.0)

Kullanıcı aynı mesajı (v1.401 ekranlarıyla) yeniden gönderdi; ilk bölüm v1.404'te yapılmıştı.
Yeni istekler:

**1. Modelhane katalog görünümü** — "Liste | Katalog" anahtarı; katalogda kapak resmi büyük kart
(kod, ad, aşama). Kapağa dokununca büyür, alta dokununca liste görünümünde o model açık gelir.

**2. Resim büyütme** — `ResimBuyutucu` (140-asorti, ortak): stok katalogundaki büyütmenin ortak
hali (tam ekran, kırpmasız, dokunma/Esc ile kapanır). Modelhane kataloğunda ve model kartındaki
tasarım/teknik resimlerde.

**3. REÇETE ŞABLONLARI** — `tanimlar.receteSablonlari: [{ id, ad, satirlar: [{ hammaddeUrunId,
hammaddeAd, renk, beden (boy), miktar, birim, proses }] }]`. Şablon RENKTEN BAĞIMSIZ (standart
malzemeler her mamul renginde aynı).
- `sablonuUruneUygula(sablon, product)` (055-recete): ürünün HER mamul rengine "Tüm Bedenler"
  satırı; aynı mamul renginde aynı hammadde+renk+boy+proses varsa ATLANIR (iki kez uygulamak
  reçeteyi ikiye katlamaz). Atomik `onReceteGrubuGuncelle` kapısından.
- `recetedenSablonSatirlari(recete)`: ilk mamul renginden, bedenden bağımsız satırlar (tüm
  bedenlerde aynı boy ve miktar). Bedene göre değişen (taban numarası) şablona GİRMEZ.
- **Ürün › Reçete** üstünde şablon çubuğu: seç → "Şablondan reçete oluştur" (reçete boşsa) /
  "Şablondan reçeteye ekle"; "Bu reçeteden şablon oluştur".
- **Model › Reçete**: "Şablondan" seçici (zaten olanı atlar) + "Şablon olarak kaydet".
- **Tanımlar › Üretim › Reçete şablonları**: şablon aç, adını değiştir, satır miktarı düzenle,
  satır ekle (hammadde seç; renk/boy ilk varyanttan), satır/şablon sil (pencereli onay).
- Model reçetesinin fiyatı da renk+boy dahil (`hammaddeBirimFiyati`).

**Tuzak:** `receteSablonuKaydet` `saveTanimlar`dan ÖNCE tanımlanınca uygulama hiç açılmadı
(temporal dead zone) — senaryo boş ekranla yakaladı, tanımın altına taşındı.

**Doğrulama:** `senaryo-recete-sablon.js` (yeni) — boş reçetede düğme "Şablondan reçete oluştur";
uygulama 1 satır (1 renk), ikinci uygulama yine 1 (çift yok); modelhane katalogu 1 kart, kapağa
dokununca büyütme açık. **94 senaryo** temiz.

## DENETİM 18 — BAYAT OKUMA (22 Eylül, v1.405.0 üzerinde, kaynak değişmedi)

Kullanıcı "kapanış state'inde bayat okuma riski ne demek" diye sordu, açıklama sonrası "yap" dedi.
`bayatdenetim.js` (TypeScript AST ile, `oludenetim.js` gibi) iki kalıbı arıyor:
- **A — set sonrası okuma:** `setX(...)` sonra aynı fonksiyonda `x` → eski değer.
- **B — await sonrası okuma:** async fonksiyonda `await`ten sonra state okunuyor → bekleme öncesinin fotoğrafı.

"State" = useState dizisi, bileşen parametresi, ya da hook'un kendi parametresinden açılan ad
(`const { stok, setStok } = d;` — bölünmüş dosyalardaki bütün `useXxx(d)` hook'ları). İlk sürüm bu
son kalıbı yerel sanıyordu ve asıl iş dosyalarını (079, 080, 091) HİÇ görmüyordu — düzeltildi.

Elenenler (her biri birim testinde sabit): dışlayan if/else ve ?: dalları, switch case'leri, set
sonrası return/throw/break (yalnız okumadan ÖNCE gelen), `return` sonrası ölü kod, yerel gölge
değişken, setter'ın kendisi. **await fırlatabilir:** yolda catch'li bir try bloğu varsa aradaki
return ELENMEZ (hata yolu onu atlar) — `girisYap` ve fiş defteri bu sayede görüldü.

**Borç listesi** (13. denetim gibi): mevcut 12 anahtar `fonksiyon|değişken|tür` biçiminde kayıtlı,
`BORC=1` ile listelenir. Listede olmayan yeni geçiş BULGU; karşılığı kalmayan borç da BULGU (liste
yalnız küçülür). Muafiyet `// bayat-muaf: <gerekçe>` (gerekçesiz geçmez). `SAYIM=1` tam envanter.

**GERÇEK (2 fonksiyon, DÜZELTİLMEDİ — kullanıcıya soruldu):** `091-fisdefter-yaz.jsx`
`fisDefterineKayitYaz` ve `fisDefterineYaz`. Hata yolunda `setFisDefteri(fisDefteri)` bekleme
ÖNCESİNİN defterini geri koyuyor; await sürerken yazılan başka bir fiş bellekten silinir, bir sonraki
yazma tüm diziyi yazdığı için buluttan da silinir. Yalnız `tekilYaz` yerel yazmada da başarısız
olunca (depo dolu) tetikleniyor — nadir ama sessiz veri kaybı. Önerilen çözüm: geri alma fonksiyonlu
(`o => o.filter(k => k !== kayit)`) ve `next` en güncel defterden (ref) kurulmalı.
**KÜÇÜK:** `300-uretim.jsx` çizim sırasında `setUretimSekmeFiltre("Tümü")` — bir kare boş liste.
**Zararsız (9):** okunan alan set ile değişmiyor ya da yol pratikte kapalı; gerekçeler listede.

**Doğrulama:** `test/birim-bayat-denetim.js` (6 yakalar, 9 geçer, gerekçesiz muafiyet geçmez);
gerçek dosyaya sabotaj (`setStok` sonrası `stok.length`) yakalandı; `yap.sh` temiz, HTML baytı
baytına aynı (md5 eşit).

## FİŞ DEFTERİ BAYAT OKUMA (22 Eylül, v1.406.0)

Kullanıcı denetim 18'in iki bulgusunun düzeltilmesini istedi. Sonda (`console.error` ile iz) sırasında
**üçüncü ve daha ağır** bir hata çıktı: üretim geri alma defterde HİÇBİR fişi iptal etmiyordu
(`bulundu=false ×3`). Sebep: `100-app.jsx`'teki üç çağıranın (üretim teslim geri alma, iki fiş silme
yolu) bağımlılık dizisinde `fisDefterindeIptal` yok — açılıştaki BOŞ defteri gören kopyayı tutuyorlar.
Denetim 18 bu türü (eksik bağımlılık) GÖRMÜYOR.

**Çözüm (`091-fisdefter-yaz.jsx`):** `defterRef` — her çizimde state'e eşitlenir, bu kancanın
yazmaları onu ANINDA günceller. Üç fonksiyon da okumayı ref'ten yapıyor, state'i fonksiyonlu set ile
güncelliyor (açılış yüklemesi ve otomatik defterin araya giren değişikliği ezilmez). Fonksiyonlar
artık `fisDefteri`ne bağımlı değil; eski bir kopyası çağrılsa da güncel defteri görür — çağıranların
bağımlılık dizilerine DOKUNULMADI. Ortak `kayitEkleVeYaz`: başarısızlıkta YALNIZ o kayıt çıkarılır ve
geri alınmış hâl depoya yeniden yazılır (arada yazılan tam defter başarısız kaydı depoya sokmuş
olabilir). İptalde bulut ve bellek aynı `iptalZamani`nı taşır.

**Üretim sekmesi (`300-uretim.jsx`):** `gecerliSekme` — çizim geçerli sekmeyle yapılıyor, set yalnız
state'i eşitliyor.

**Doğrulama:** `senaryo-fis-defteri-bayat.js` (yeni, altın kayıtlı). ESKİ kodla (TEST_HTML ile ayrı
paket) çalıştırılıp hatalar görüldü, YENİ kodla düzeldi:
| durum | eski | yeni |
|---|---|---|
| üretim geri alma | Kesim, Kesim-Giriş AKTİF | ikisi iptal |
| ardışık 3 iptal | yalnız Z | X, Y, Z |
| aynı çizimde çift tıklama | ikisi de `true` (yan etki 2 kez!) | ikincisi `false` |
| A başarısız, arada B | bellek `ESKI`, depo `B,A,ESKI` | bellek ve depo `B,ESKI` |
| ilk çizimdeki kopya | yeni kaydı görmüyor | görüyor |
Kanca testi için `derle.js` DISA_AKTAR'a `useFisDefteriYazma` eklendi. 95 senaryo AYNI (`oturum` ve
`oturum-dustu` paralel yükte oynak, tek başına AYNI — önceden de böyle). Birim testleri temiz.
Denetim 18 borcu 7'ye indi (hepsi zararsız). `birim-bayat-denetim.js` artık `BORCSUZ=1` ile koşuyor
(küçük örnek dosyada borç listesi "ölü borç" veriyordu). 300 sn araç sınırı: senaryolar 12'lik
partilerle koşturuldu.

**AÇIK:** denetim 18'e 3. tür — `useCallback` içinde çağrılan, kendisi state'e bağlı bir fonksiyonun
bağımlılık dizisinde olmaması. Asıl hatayı bu tür üretti.

## EKSİK BAĞIMLILIK — DENETİM 18 C ve T (22 Eylül, v1.407.0)

v1.406'daki asıl hatanın türü (bağımlılık dizisinde olmayan fonksiyonun eski kopyası) denetime eklendi.

**C — eksik bağımlılık:** `useCallback/useMemo/useEffect(fn, [dizi])` içinde okunan, AYNI bileşende/
kancada tanımlı ve çizimden çizime değişen bir ad dizide yoksa bulgu. Kararlı sayılanlar: setter'lar,
`useRef`, adı `…Ref` ile biten, yalnız sabitlerden oluşan ifade (`12*60*60*1000`), modül düzeyi adlar,
ölü kod. İlk sayım 74 (27 useCallback + 47 useEffect); kural v1.406'daki üç yeri kendiliğinden buldu.

**useCallback'lerin HEPSİ düzeltildi** (bağımlılık eklemek bunların davranışını değiştirmez):
`uretimSil` (+stokRezervasyonlari, copaAt), `planlaUretim` (+cop), `hurdaTelafiUretimiAc` (+cop),
`uretimProsesAtamaTeslimAl` (+stokRezervasyonlari), `stokFisiKaydet` (+fisDefterineYaz; `d.fisGeriAlRef`
açıldı), `fisDefterineYaz/KayitYaz` (`kayitEkleVeYaz` useCallback oldu), `yeniRenkVeReceteEkle`
(+tanimlar), `uretimProsesAtamaTeslimGeriAl` (+muhasebe, koliler, fisDefterindeIptal),
`veritabaniSifirla` (+stok, cariler, siparisler, uretim, cop), `removeHareketEverywhere` ve
`yetimFisTemizle` (+fisDefterindeIptal). Gerçek riskler: eski rezervasyon listesinden süzme (yeni
rezervasyonu silme), eski çöpten üretim numarası (numara tekrar verme), eski `copaAt` (çöpe yeni
atılanı silme), eski muhasebe/koliden geri alma.

**TUZAK — uygulama açılmadı:** `fisDefterindeIptal` dizide ama `useFisDefteriYazma` çağrısı 200 satır
AŞAĞIDAYDI → "Cannot access before initialization". Derleme ve 17 denetim görmedi, senaryolar
yakaladı. Eksik bağımlılığın asıl sebebi bu sıralamaydı. Kanca çağrısı geri almanın ÜSTÜNE taşındı.
Aynı tuzak v1.405'te de yaşanmıştı → **T kuralı:** bağımlılık dizisinde aynı fonksiyonda AŞAĞIDA
`const/let` ile tanımlı ad = bulgu ("uygulama AÇILMAZ"). Eski hâl üzerinde denendi, yakaladı.

**useEffect — 44 anahtar İNCELENMEDİ, `ETKI_BORC`ta.** Efekte bağımlılık eklemek NE ZAMAN çalıştığını
değiştirir; çoğu bilerek tek değişikliğe bağlı tetikleyici (hedef açma, "görüldü"). Yeni bir efekt
eksiği bulgu verir; liste yalnız küçülür. `BORC=1` listeler, `C_SAYIM=1` tam envanter.

**Doğrulama:** birim testi 24 ✓ (C için 3 yakalar/4 geçer, T için 1); sabotaj (1042'den bağımlılığı
silmek) C ile yakalandı; 94 senaryo AYNI (`oturum`, `oturum-dustu` paralelde oynak, tek başına AYNI);
birim testleri temiz. Senaryolar 12'lik partilerle, 6 paralel, ~140 sn/parti.

## EFEKTLER İNCELENDİ — İKİ VERİ KAYBI (22 Eylül, v1.408.0)

Kullanıcı "sen devam et" dedi; v1.407'de "incelenmedi" bırakılan 44 efekt bulgusu (24 efekt) tek tek okundu.

**Ölçüt (incelemeden çıktı):** efekt her çalıştığında O ÇİZİMİN güncel değerini görür; eksik
bağımlılık senkron kullanımda yalnız "şu değişince yeniden çalışma" demektir (tetikleyicilerde
bilinçli). Bayat okuma yalnız SONRADAN çalışan kısımda olur: zamanlayıcı/dinleyici içindeki fonksiyon,
`await` sonrası, çağrılmadan SAKLANAN fonksiyon (onClick olarak verilen). Denetim 18 C, efektlerde
artık yalnız bunları sayıyor (`gecikmeliMi`); `ETKI_BORC` kaldırıldı.

**HATA 1 — VERİ KAYBI (`100-app.jsx`, bekleyen yazmalar):** "online" olayı ve dakikalık zamanlayıcı,
efektin kurulduğu çizimdeki `bekleyenleriYenidenGonder`i çağırıyordu; efekt yalnız bekleyen tablo
SAYISI değişince yenileniyor. O kopya stok/cari/siparişin ESKİ hâlini `tabloYaz` ile yerele VE buluta
(fark alarak — yenileri silerek) yazıyordu. **Kanıt:** iki fiş kesildi, "online" sonrası ikisi de
yerel depodan gitti. İnternet kesikken çalışıp bağlantı gelince işin silinmesi demek.
Çözüm: `yenidenGonderRef` — tetikleyici her seferinde güncel fonksiyonu çağırıyor.

**HATA 2 — YANLIŞ KAYIT (`255-stokfisi.jsx`, başlık eylemleri):** başlıktaki Kaydet ve **Ctrl+S**,
efektin son çalıştığı çizimdeki `kaydet`i çağırıyordu; efekt tarih/fiş no/ödeme şekli/vade/peşine
bağlı değildi. **Kanıt:** kalemden sonra "SONRADAN-NO" + Havale/EFT → kayıt `AF-…` + Nakit. Alttaki
düğme doğruydu. Çözüm: `kaydetRef`/`vazgecRef`; efekt artık yalnız etiket/pasiflik için
(`[pencereId, kaydetPasif, alisMi]`).

**Küçük:** Veri Denetimi ekranı tanımlar değişince tazelenmiyordu → `tanimlar` bağımlılığa eklendi
(`sonuc` dizide yok, döngü olmaz).

**Denetleyicide hata:** "setter güncelleyicisi" eleği `set[A-Z]…` kalıbıyla `setTimeout/setInterval`i
de eliyordu — zamanlayıcıları tam görmesi gereken yerde kördü. `ZAMANLAYICI` istisnası eklendi; birim
testi yakaladı. Bu düzeltme Veri Denetimi bulgusunu çıkardı.

**Kalan 5 efekt bulgusu zararsız, BORC'ta gerekçeli:** açılış göçü (veriyi parametreyle alıyor),
showToast (kararlı), otomatik yedek (boş/kilitli veride yedek almıyor), iki "hedef görüldü" bildirimi.

**Doğrulama:** `senaryo-bayat-efekt.js` (yeni, altın kayıtlı) — eski kodla iki hata görüldü, yeni
kodla ikisi de düzeldi. Denetleyici eski kodda `bekleyenleriYenidenGonder`, `kaydet`, `onVazgec`i
buldu. Birim testi 29 ✓. 95 senaryo AYNI (`oturum`, `oturum-dustu` paralelde oynak, tek başına AYNI).

**AYNI KALIP BAŞKA YERDE:** `pencereEylemleriBildir` şu an yalnız stok fişinde kullanılıyor; yeni bir
ekran eylem çubuğuna fonksiyon verirse ref deseni kullanılmalı (denetim 18 C zaten yakalar).

## ÜRETİM İŞÇİLİĞİ CARİ YÖNÜ (22 Eylül, v1.409.0)

**Kullanıcı (ekran görüntüsüyle):** "üretimde oluşan işçilik fişleri ters yazılıyor, bizim personele
borçlanmamız gerekli". Kesici Hakan: `10002-Kesim-İşçilik` 5.320 BORÇ + ödeme `ODM-…` 5.000 BORÇ →
bakiye +10.320. Ödeme borcu kapatmak yerine büyütüyordu.

**Sebep:** işçiliği yazan İKİ yer (`079-uretim-teslim.jsx` teslim alma, `080-proses-ver.jsx` ara
proses) yönü ELLE `"Borç"` yazıyordu; tek kaynak `hareketYonu(tip)`e (200-cari-sabit) hiç
sormuyordu. Yön kuralı ÜÇÜNCÜ KEZ aynı sebeple bozuldu (bkz. 200-cari-sabit TARİHÇE).
**Çözüm:** ikisi de `hareketYonu("İşçilik")` → "Alacak" (Satış/Ödeme dışı her tip Alacak). Tabloya
"İşçilik → Alacak (hizmet alımı)" satırı eklendi; `birim-cari-yon.js` 3 yeni iddiayla kilitledi
(İşçilik=Alacak, işçilik=alış yönü, işçilik≠ödeme yönü).

**Kâr-zarar (`247-karzarar.jsx`) de düzeltildi:** işçiliği yalnız `yon === "Borç"` ise sayıyordu —
yön düzelince yeni işçilik rapordan DÜŞERDİ. Artık yöne bakılmıyor: eski (Borç) ve yeni (Alacak)
kayıtlar aynı olayı anlatıyor; işçilik geri alması karşı kayıtla değil silmeyle yapıldığı için ters
yönlü işçilik hareketi yok.

**NEDEN HİÇ YAKALANMADI:** test tohumu işçiliği ELLE ve doğru yönde (Alacak) kuruyordu; senaryolar
uygulamanın YAZDIĞI yönü değil tohumu okuyordu. Yön değişikliği 93 senaryonun HİÇBİRİNİ değiştirmedi.
**Yeni `senaryo-iscilik-yonu.js`:** işçilik ARAYÜZDEN doğuyor (teslim formu, `data-teslim-al` işareti
eklendi) → yön, bakiye (tohum −30, yeni −105, ödeme +100 = −35 → biz borçluyuz), kâr-zarar (135).
Eski kodla: yön Borç, bakiye +175, kâr-zarar 105 (tohumdaki Alacak'ı saymıyordu).

**`senaryo-uretim-iade.js` ONARILDI ve takıma alındı** (7a'dan beri "kart açma adımı oturmadı"):
tohumdaki atamada `verildiMi: true` yoktu → teslim formu hiç açılmıyordu; ayrıca "Teslim Al" yazılı ilk
düğmeye basılıyordu, o artık formun kendi gönder düğmesi (iade girilmeden teslim alıyordu). Şimdi:
artan 2 metre ayrı `1002-Kesim-İade` fişiyle stoğa dönüyor.

**AÇIK — ESKİ KAYITLAR:** v1.409 öncesi yazılmış işçilik hareketleri hâlâ "Borç" (kullanıcının ekranındaki
5.320 dahil). Otomatik onarım ilkesi gereği (v1.375) kendiliğinden çevrilmedi. Seçenekler: (a) test
verisi — temiz başlangıçta kaybolur; (b) tek seferlik, günlüğe yazan göç: `-İşçilik` ekli + `yon:
"Borç"` hareketleri "Alacak"a çevir (086-goc kalıbı). **KARAR (22 Eylül): (a)** — test verisi,
dokunulmayacak; temiz başlangıçta kaybolur. Göç YAZILMAYACAK.

**Doğrulama:** 97 senaryo (iki yeni), teslimle ilgili 34'ü bu sürümde yeniden koşturuldu, hepsi AYNI;
birim testleri temiz; denetimler temiz.

## YEREL YAZMA HATASI SESSİZ DEĞİL — 13. DENETİM BORCU KAPANDI (22 Eylül, v1.410.0)

Kullanıcı: "kimlik doğrulamayı sonraya bırakalım, test bitsin. Kontrol yapalım, eksik ne var,
düzelmesi gerek". Bütün denetimler borçlarıyla dökümlendi: denetim 18'in 12 borcu gerekçeli
zararsız; **gerçek eksik 13. denetimdeydi (14 borç, notta 10 yazıyordu).**

**Kapsam büyüktü:** `tabloYaz/tekilYaz(...).catch(() => {})` uygulama genelinde **90 yerde** — denetim
yalnız silme bağlamına baktığı için 14'ünü görüyordu. Kalanlar arasında üretim teslimi (079),
proses verme (080), cari fişi (089), ad değiştirme (082), tanımlar, rezervasyonlar. Bu kalıp YEREL
yazma hatasını (depo dolu, boyut aşımı) yutuyordu: değişiklik yalnız bellekte, sayfa yenilenince
HABERSİZ kayıp. (Bulut hatası ayrı yoldan zaten görünür: `__supabaseHataBildir` şeridi + bekleyen
yazma, kendiliğinden yeniden denenir.)

**Çözüm:** `yazimiIzle(soz, etiket, veri)` (040-esitle, tabloYaz'ın yanında). Sözü reddetmez, sonuç
nesnesine çevirir (`{ ok:false, yerel:true, hata }`); yerel hatada `window.__kayitHatasiBildir` köprüsü
(App'te `kaydetmeHatasiBildir`'e bağlı, useEffect) → depo dolu / boyut aşımı ne yapılacağını anlatan
pencere. Köprü kancalara parametre taşımayı ve TDZ riskini ortadan kaldırıyor. 90 yer mekanik
olarak çevrildi (etiket anahtardan: "Stok kartları", "Cari kartları", "Siparişler", "Üretim", "Çöp
kutusu", "Tanımlar", "Fiş defteri"…). Davranış değişmedi — yalnız hata görünür oldu.

**Çöpten geri yükleme (077) yeniden yazıldı:** yazma BEKLENMEDEN kayıt çöpten siliniyordu → disk
yazması tutmazsa kayıt ne listede ne çöpte kalıyordu. Artık: yaz → bekle → yerel hata ise ekran geri
alınır, kayıt ÇÖPTE KALIR, uyarı + günlük; bulut hatası ise kayıt geri gelir ama mesaj açıkça "buluta
yazılamadı, yeniden denenecek" der. Dört tür (ürün/cari/sipariş/üretim) tek tabloyla.

**13. denetim sıkılaştırıldı:** A kalıbı artık HER YERDE HATA (borç listesi kalktı). İstisna gerekirse
satıra `sonuc-muaf: <gerekçe>`. Sabotajla denendi (087'ye eski kalıp geri kondu → yakalandı).

**Yeni `senaryo-yazma-hatasi.js`:** depo "stok:items" için bozuluyor — yardımcı `yerel:true` döner ve
köprüyü çağırır; bozuk depoda geri yükleme: kayıt listede DEĞİL, çöpte, uyarı; sağlam depoda: listede,
çöp boş (test ortamında bulut yok → "buluta yazılamadı" mesajı, dürüst). `derle.js` DISA_AKTAR'a
`useCopKutusu`, `yazimiIzle`, `tabloYaz`.

**Test düzeltmeleri (uygulama değil):** `senaryo-katalog` "410" arıyordu → sürüm numarası 1.410.0'a
takıldı; arama nokta/rakam çevrili 410'u saymıyor. `senaryo-fis-defteri-bayat` yoğun paralel yükte
oynaktı (sabit bekleme) → koşula bağlı bekleme; 8 paralel kopyada 8/8 AYNI.

**Doğrulama:** 98 senaryo AYNI (`oturum-dustu` paralelde oynak, tek başına AYNI — önceden de böyle);
birim testleri temiz; bütün denetimler temiz. Ölü kod uyarısı (`_e` propu, 1) duruyor — uyarı, hata değil.

## DEPO > OKUT — SORGULA (22 Eylül, v1.411.0)

**Kullanıcı:** "Depoda barkod okutma nasıl olacak?" Önerilen: tek "Depo Okut" ekranı, iki kip —
SORGULA (salt okuma) ve SAY (sayım → sayım fişi, "Sayım ekranı" maddesini de kapatır). **Kararlar:**
"Önce Sorgula, sonra Say"; cihaz **TELEFON KAMERASI**.

**Kamera (`236-depo-okut.jsx` `KameraOkuyucu`):** `getUserMedia` (arka kamera), saniyede ~6 kare.
Önce tarayıcının `BarcodeDetector`ı (Android Chrome, code_128); yoksa (iPhone Safari, masaüstü Linux)
**KENDİ Code128 çözücümüz** (`077-barkod.jsx`: `code128KarakterEsle`, `code128KosulardanCoz`,
`code128SatirdanCoz`, `kameraKaresiCoz`). Dış kütüphane YOK (çevrimdışı, "dışarıya bir şey gitmez").
Çözücü: parlaklık satırı → YEREL eşik (gölgeye dayanıklı) → koşu genişlikleri → Start-B → her 6 koşu
kendi toplamıyla 11 modüle normallenip EN YAKIN desene (sapma > 1.6 ise ret) → Stop → KONTROL HANESİ
(tutmazsa null). Ters tutulan barkod okunur. Karenin orta bandında 9 satır denenir. Aynı kod 2 sn
içinde tekrar gelirse yok sayılır; okununca titreşim. Kamera https ister (Storage adresi uygun).

**Sorgula (`DepoOkut`, `depoOkutSonucu`):** `urunBarkoduCoz` → seviye (ürün/renk/beden/asorti).
Mamul: `mamulDeposuDurumu` ile beden matrisi (Stok, Kolide, Serbest, Üretimde, Talep, Açık), okutulan
beden(ler) vurgulu, bekleyen satış siparişleri (sipariş no, müşteri, beden, kalan). Hammadde:
`stokDurumu` (Stok, Rezerve, Serbest, Yolda). İkisi: son 6 hareket, "Ürün kartı" düğmesi. Tanımsız
kodda sebep: koli (`K-`) / üretim parçası (`1001-1`) / 90'la başlamıyor / şemaya uyuyor ama ürün yok.
Elle girdi kutusu (USB/Bluetooth okuyucu klavye gibi yazar). Depo modülüne "Okut" sekmesi
(230-mrp), `tanimlar` prop'u eklendi (100-app). Hiçbir veriye yazmaz.

**Denetim:** `yapidenetim.js` genel adlarına `Uint8Array`, `Uint8ClampedArray`, `Float32Array`.

**Doğrulama:**
- `birim-code128-cozucu.js` (yeni, kosu.sh'de): sentetik kamera satırları — temiz etiket 4 seviye × 2
  yön; keskin kare %100, hafif bulanık+gölgeli %94, çok bulanık %6 (okumaması doğru); **1800 karede 0
  yanlış okuma**; barkodsuz 2000 rastgele desenden 0 kod.
- `senaryo-depo-okut.js` (yeni): A) kodlar uygulamanın düğmesiyle atanıyor, beden/renk/hammadde/koli/
  tanımsız okutuluyor, **depo bayt bayt aynı** (salt okuma). B) **SAHTE KAMERA:** beden barkodu kendi
  kodlayıcımızla çizilip y4m videoya çevriliyor, Chromium `--use-file-for-fake-video-capture` ile
  açılıyor, "Kamerayla okut" → ürün ekrana geliyor (yöntem: yerleşik okuyucu — Linux Chromium'da
  BarcodeDetector yok, kendi çözücümüz uçtan uca sınandı). `ortak.js`'e `tarayiciArgs` seçeneği.
- 99 senaryo AYNI (`oturum-dustu` paralelde oynak, tek başına AYNI); birim testleri temiz.

**v1.412.0 — İLK TELEFON DENEMESİ (kullanıcı, Android Chrome ekran görüntüsü):** "Kamera izni
verilmedi" — adres `content://media/external/down…`: uygulama İNDİRİLEN HTML olarak Chrome dosya
görüntüleyicisinde açılmış. Tarayıcı güvenli olmayan (https olmayan) sayfaya kamera iznini SORMADAN
reddediyor; mesaj yanıltıcıydı (ayarlarda verilecek izin yok). Düzeltme: `guvensizAdres()` —
`content:` ya da `isSecureContext === false` (file: hariç) ise kamera denenmeden "https bağlantısından
açın (baslat.html / Storage)" deniyor; NotAllowed gelip adres https değilse de aynı mesaj; https'te
gerçek izin reddi için "kilit simgesi > İzinler > Kamera". http://atolye.test (güvensiz) ile doğrulandı.
**KULLANICIYA:** telefonda uygulamayı Storage/baslat.html https bağlantısından açıp yeniden denemesi söylendi.

**KRİTİK BULGU (22 Eylül, kullanıcının telefonunda): SUPABASE STORAGE HTML'İ `text/plain` VERİYOR.**
Public `Uygulama` bucket'ındaki (büyük U; içinde yalnız `atolye-erp-v1.280.0.html`, `baslat.html` ve
`surum.json` HİÇ YÜKLENMEMİŞ) dosyanın public adresi açıldı → sayfa yerine KAYNAK KOD, Türkçe karakter
bozuk (`AtÃ¶lye`). Supabase kendi alan adından HTML çalıştırmayı güvenlik gereği engelliyor. **v1.280'deki
"Storage'dan çalıştırma" planı (baslat.html + surum.json + storage-kurulum.md) ÇALIŞMAZ.** Uygulama bugüne
kadar hep indirilen dosyadan (`content://`) açılıyormuş. Proje: `mqdgucoomgqcvhvgixbl`. Veritabanı/giriş
Supabase'de kalır; yalnız HTML başka yerden (https) yayınlanmalı — kullanıcıya GitHub Pages önerildi.
**GITHUB PAGES (kullanıcı kabul etti):** hesap `mtalay61-coder`, depo `atolye` (public), adres
**https://mtalay61-coder.github.io/atolye/**. Kök `index.html` = `baslat.html`'in kopyası (adres
doğrudan başlatıcıyı açsın); `surum.json` url = `https://mtalay61-coder.github.io/atolye/atolye-erp-v1.X.0.html`.
Her sürüm: HTML'i yükle (Add file > Upload) + surum.json'u güncelle. baslat.html surum.json'u `?t=`
ile önbelleksiz okuyor (Pages CDN önbelleği sorun olmaz).

**GERÇEK CİHAZDA DENENMEDİ:** telefon kamerası (odak, ışık, eğik tutma) testte sentetik. Kullanıcı
iPhone/Android'de denemeli; okumazsa geri bildirim (hangi telefon, etiket boyutu) ile çözücü ayarlanır.

**SIRADAKİ — SAY kipi:** okutulan beden +1, asorti kendi dağılımı; hammaddede okut + miktar; bitince
sayılan↔kayıttaki beden beden fark → onayla → SAYIM FİŞİ (`fisYaz` kapısı, fiş defteri, geri alınabilir).

## YAYIN GITHUB PAGES'E TAŞINDI + BEDEN ETİKETİ (22 Eylül, v1.412.0 / v1.413.0)

**YAYIN:** Supabase Storage HTML'i `text/plain` verdiği için (bkz. v1.411 bölümü) uygulama
**GitHub Pages**'e taşındı ve ÇALIŞIYOR — kullanıcı telefonunda/masaüstünde kamera açıldı, alt yazı
"yerleşik okuyucu" (masaüstü Chrome'da BarcodeDetector yok → kendi Code128 çözücümüz).
Depo: `mtalay61-coder/atolye` (public, main). Kök `index.html` = `baslat.html` kopyası;
`surum.json` url = `https://mtalay61-coder.github.io/atolye/atolye-erp-v1.X.0.html`; `.nojekyll`
eklendi (Jekyll README'yi öne çıkarıyordu), README silindi. **Adres:
https://mtalay61-coder.github.io/atolye/** — telefonda ana ekrana eklenecek.
**HER SÜRÜMDE:** yeni HTML'i depoya yükle + `surum.json`u güncelle (ikisi de Add file > Upload).
`storage-kurulum.md` ARTIK GEÇERSİZ (Supabase yolu); yerine bu akış.

**BEDEN ETİKETİ (v1.413.0, kullanıcı: "o düğmeyi ekle ve seçili bedenler için toplu basım da koy"):**
Ürün kartı > Barkodlar'da kodlar görünüyordu ama yalnız ÜRÜN ve ASORTİ etiketi basılabiliyordu;
depoda okutulan asıl etiket beden etiketi. Eklenen: her satırda yazıcı düğmesi
(`data-etiket-bas="renk|beden"`), satır seçim kutuları (`data-etiket-sec`), başlıkta "tümünü seç"
(`data-etiket-tumu`, yalnız barkodu olanlar), seçim varken şerit: kopya adedi (1-20) + "Seçilenleri
bas (N etiket)". Seçim SIRA NUMARASIYLA DEĞİL `renk|beden` kimliğiyle tutuluyor (varyant eklenip
silinince sıra kayar → yanlış etiket). Kodu olmayan varyantta düğme ve kutu pasif. Etiket gövdesi
tek yerde (`bedenEtiketiGovde`) — tek ve toplu basım aynı etiketi üretsin.

**Doğrulama:** `senaryo-beden-etiketi.js` (yeni) — `window.print` susturulup `etiketYazdir`ın gizli
iframe'i okunuyor: tek satır → 1 etiket ("125 Model Siyah · 38" + barkod SVG); 3 beden × kopya 2 →
6 etiket, 3 ayrı metin; tümünü seç → 4 satır / 8 etiket; düğme metni sayıyı doğru gösteriyor.
100 senaryo AYNI (`oturum-dustu` paralelde oynak, tek başına AYNI); birim testleri ve denetimler temiz.

## UYGULAMADAN GITHUB'A YAYINLAMA (22 Eylül, v1.414.0)

**Kullanıcı:** "GitHub'a yüklemenin kolay yolu yok mu? … uygulamanın içine dosyayı yükleyecek yer
yapsak ve bizim uygulamadan yüklesek?" Üç seçenek sunuldu (tek dosya/index.html, GitHub Desktop,
yayın betiği); kullanıcı uygulama içi yüklemeyi seçti.

**`137-github-yayin.jsx`** — Tanımlar > Genel, yalnız Yönetici. Dosya seç → "Yayınla": sürümlü HTML
ve `surum.json` **tek commit**te depoya gider, ardından uygulama içi sürüm kaydı da tazelenir
(`onSurumYayinla`), yani açık duran ekranlar şeridi görür.

**Neden Git Data API (blob → tree → commit → ref PATCH), Contents API DEĞİL:** Contents dosya başına
ayrı commit atar → iki dosya = iki commit = arada YARIM DURUM (surum.json yeni sürümü gösterir ama
HTML henüz yok → herkes 404). Ağaç tek commit'le gidiyor; dal EN SON oynuyor, o adım düşerse yayın
eski sürümde kalır. Ayrıca Contents'ın boyut sınırı belirsiz (uygulama 3,4 MB), blob 100 MB'a kadar.

**ANAHTAR (token) YALNIZ `localStorage`** (`github:token`, ayarlar `github:ayar`): tanımlara
yazılsaydı buluta gider ve veritabanını görebilen herkes depoya yazabilirdi. Ekranda anahtar alma
tarifi var: fine-grained token, yalnız `atolye` deposu, **Contents: Read and write**. Depo ayarları
(sahip/depo/dal) açılır bölümde, varsayılan `mtalay61-coder/atolye/main`. Sürüm no dosya adından
okunuyor (`atolye-erp-v1.414.0.html` → `1.414.0`), elle değiştirilebiliyor. Hata mesajları duruma
göre: 401 anahtar, 403 yetki, 404 depo/dal, 409/422 dal adı.

**Denetim 18 kendi kodumu yakaladı:** `yayinla` içinde `await` sonrası `anahtar`/`ayar` okunuyordu
(yükleme sürerken kullanıcı değiştirebilir) → bekleme öncesi sabitlendi. `unescape` yerine
`TextEncoder` (Türkçe harfli surum.json `btoa`da patlardı). `Upload` ikonu çekirdeğe eklendi.

**Doğrulama:** `senaryo-github-yayin.js` (yeni) — `api.github.com` rota ile taklit, GERÇEK istek yok.
Sıra doğrulandı (ref → commit → 2 blob → tree → commit → PATCH), tek commit, ağaçta iki yol,
`surum.json` içeriği (sürüm + adres), sürüm no dosya adından, sonuç şeridi; anahtar `localStorage`'da
ve `tanimlar:data` içinde YOK; 401 ve 404 yollarında anlaşılır mesaj, ilk istekte duruyor, sonuç
şeridi çıkmıyor. `senaryo-gorsel-secici` daraltıldı: sayfadaki BÜTÜN dosya girdilerini sayıyordu
(yeni HTML seçicisi listeye giriyordu) ve galeri girdisini "sonuncu" diye seçiyordu — yanlış kutuyu
seçme riski; artık `accept*="image"` ile sınırlı (altın güncellendi). 101 senaryo AYNI, birim
testleri ve denetimler temiz.

**v1.417.0 — TELEFONDA DOSYA SEÇİLEMİYORDU** (kullanıcı: "telefondan yüklemek için dosyayı açmıyor,
sadece yazı yazılıyor"): `accept=".html,text/html"` Android'de indirilen dosyayı GİZLİYOR — indirilen
HTML çoğu cihazda `application/octet-stream` türüyle duruyor. Filtre KALDIRILDI; doğrulama içerikten:
ilk 400 bayt `<!doctype html`/`<html` içermiyorsa dosya reddediliyor ve sebebi söyleniyor (GitHub'a
istek gitmiyor). Sürüm no dosya adından bulunamazsa dosyanın `<title>`ından ("Atölye ERP 1.416.0")
okunuyor — telefon indirirken adı bozsa da çalışsın. Senaryoya eklendi (yedek.json seçildi → uyarı,
0 istek). Tanımlar ekranına dokunan 20 senaryo AYNI.

**v1.418.0 — ANAHTAR KALICI DEĞİLDİ** (kullanıcı: "kayıtlı kalması gerekmiyor muydu?" — "Önce GitHub
anahtarını kaydedin" uyarısı): anahtar yalnız `localStorage`taydı; Android'de site verisi temizlenince
ya da kısıtlı modda yazılamayınca sessizce kayboluyordu. Artık asıl yer **uygulamanın yerel deposu**
(`window.storage`, IndexedDB, PAYLAŞIMSIZ — buluta asla gitmez), `localStorage` yedek. Açılışta
localStorage boşsa depodan okunuyor. Ekranda "✓ anahtar bu cihazda kayıtlı" rozeti; yazılamazsa
"tarayıcı depoya yazamıyor" deniyor (sessiz kalmıyor).
**Doğrulama:** senaryoda anahtar kaydediliyor, localStorage SİLİNİYOR, ekran kapatılıp açılıyor →
rozet "kayitli", kutu dolu, `window.storage`ta var, `tanimlar:data` içinde YOK. (Sayfa yenileme testte
kullanılamıyor: test deposu bellekte.)

**KULLANIM (her sürümde):** Tanımlar > GitHub'a yayınla > dosyayı seç > Yayınla. GitHub Pages 1-2
dakikada yeniler. v1.414.0'ın KENDİSİ hâlâ elle yüklenmeli (özellik onun içinde).

## DEPO > SEVKİYAT (22 Eylül, v1.415.0)

**Kullanıcı:** "depoya sevkiyat ekleyelim, depodan sevk etmek için, hem barkod okuyucuyu kullanarak,
kolilenmiş ürünler vs okutarak sevk ederiz; sevkiyat logosu kamyonet olsun."

**YÖN TERSİNE ÇEVRİLDİ:** sevkiyat bugüne kadar SİPARİŞTEN başlıyordu (sipariş kartı → fiş oluştur →
koli barkodu → kaydet). Depodaki kişinin elinde sipariş değil KOLİ var. `238-sevkiyat.jsx`: koliyi
okut → sipariş kendiliğinden bulunur → gruplanır → "Sevk et". Depo modülünde "Sevkiyat" sekmesi
(`Truck` ikonu; sekme satırına `ikon` alanı eklendi). Kamera okuyucu `KameraOkuyucu` (236) ile ortak.

**STOK/CARİ/SİPARİŞ YAZIMI BU EKRANDA DEĞİL:** okutulan koliler siparişe göre gruplanıp aynı kapıdan
(`siparisGerceklestir`, 081) geçiyor — fiş defteri, stok ve cari hareketi, karşılanan sayacı, kolinin
"Sevk edildi" durumu hep o kapının işi. İkinci bir sevk yolu açmak iki ayrı mantık demekti.
**Kapıya dönüş değeri eklendi** (`true/false`): defter reddederse ekran koliyi listeden DÜŞÜRMÜYOR,
tekrar denenebiliyor. Mevcut çağıranlar dönüşü kullanmıyordu, davranış değişmedi.

**Kurallar:** koli kalemi siparişin satırına ürün+renk+beden ile eşleniyor; eşleşmeyen kalem sevk
satırı üretmiyor ve uyarı olarak gösteriliyor. Fazla sevk kapıda zaten reddediliyor — ekran düğmeye
basmadan ÖNCE kırmızı uyarı veriyor. Siparişe bağlı OLMAYAN koli buradan sevk edilmiyor (karşılanan
sayacı nereye yazılacağı belli değil), ayrı başlıkta sebebiyle duruyor. Sevk edilmiş koli okutulunca
fiş numarasıyla uyarılıyor; ÜRÜN etiketi okutulunca "sevkiyatta koli barkodu okutulur" deniyor.
Her sipariş KENDİ fişini alıyor (karışık okutulsa bile).

**Doğrulama:** `senaryo-depo-sevkiyat.js` (yeni) — iki siparişin kolileri + siparişsiz koli + sevk
edilmiş koli + gerçek ürün barkodu okutuluyor. Sevk sonrası: stok 20→17 / 20→15, `K-001` "Sevk
edildi (SAT-9-F1)", karşılanan 37=3 / 38=5, fiş defterinde `SAT-9-F1`, SAT-10 grubu listede kalıyor,
siparişsiz koli hâlâ uyarıda. 102 senaryo AYNI, birim testleri ve denetimler temiz.

**v1.416.0 — SİPARİŞSİZ KOLİ (telefonda gerçek deneme):** kullanıcı GitHub Pages'teki uygulamada
kamerayla `K-0922019` kolisini okuttu — **kamera Android'de "cihaz okuyucusu" (BarcodeDetector) ile
çalıştı**, ekran koliyi doğru biçimde sevke almadı. Sebep tasarımda: koli ÜRETİMDEN ya da serbest
modda kurulduğunda `siparisId` taşımıyor (315-paketleme: `siparisSec` dışındaki yollar boş bırakıyor),
yani siparişsiz koli istisna değil NORMAL. Çözüm: siparişsiz koli için ekranda **hedef sipariş seçimi**
(`sevkAdaySiparisler`): koli içeriğini (ürün+renk+beden) karşılayabilecek, kalanı olan açık satış
siparişleri; kolinin carisi varsa onunkiler önce, sonra en çok karşılayan. Seçim YALNIZ bu sevkiyatta
yaşıyor — **kolinin kaydı değişmiyor** (ikinci bir koli yazma yolu açmamak için); sevk fişi ve
"Sevk edildi" durumunu yine kapı yazıyor. Aday yoksa sebebi söyleniyor.
**Doğrulama (senaryoya eklendi):** aday listesi ("SAT-9 · Müşteri B · 1 çift karşılar"), seçim sonrası
gruba katılma, sevk → `SAT-9-F2`, stok 15→14, karşılanan 38=5→6, koli `siparisId` hâlâ boş ama
`Sevk edildi(SAT-9-F2)`. 102 senaryo AYNI, birim ve denetimler temiz.

**SIRADAKİ (aynı ekranda):** kolisiz/serbest mal sevki — ürün etiketi okutup miktar girerek. Bugün
reddediliyor; hangi siparişe yazılacağı sorusu çözülmeli (müşterinin açık siparişleri arasından seçim).

## TANIMLAR YENİDEN DÜZENLENDİ (23 Eylül, v1.419.0)

**Kullanıcı:** "Tanımlar'dan başla. Tanımlar çok iç içe ve alakasız yerler de var, toparla."
Eski "Genel" sekmesi firma bilgisi, e-posta, mobil düzen, GitHub yayını, eski sürüm formu, JSON/Excel
yedek, bulut, depolama durumu, otomatik yedek, defter onarımı ve veritabanı sıfırlamayı üst üste
yığıyordu; Birimler "Üretim"deydi, Özel kodlar ayrı sekmeydi.

**Yeni düzen (tek düzey, sekme çubuğunda üç öbek etiketi `data-tanim-obek`):**
- TANIMLAR — **Firma** (firma bilgileri, e-posta) · **Ürün** (renkler, bedenler & boyutlar, birimler,
  asortiler, fiyat grupları, özel kod alanları) · **Üretim** (prosesler, ara prosesler, reçete şablonları)
- SİSTEM — **Kullanıcılar** · **Görünüm** (mobil düzen) · **Yayın** (GitHub'a yayınla; yalnız Yönetici)
- VERİ — **Yedek & Bulut** (JSON/Excel, otomatik yedek, bulut, depolama durumu) · **Bakım** (veri
  denetimi, defter onarımı, veritabanı sıfırla) · **Çöp Kutusu**
Bölümlerin İÇİ değişmedi — aynı bileşenler, aynı veri, aynı `data-*` işaretleri; yalnız yerleri.
Kesim `/tmp/duzenle.py` ile satır sınırları doğrulanarak yapıldı (her sınırda beklenen metin).
**Kaldırılan:** eski "Sürüm yayınla" formu (elle bağlantı yazma; `surumForm` state'i) — GitHub'a
yayınla aynı kaydı kendi tazeliyor. Varsayılan sekme `firma`. Kâr-zarar'daki "Tanımlar › Genel ›
Gelir/Gider" yol tarifi "Finans › Gelir / Gider" oldu; özel kod yol tarifi "Tanımlar › Ürün › Özel Kod
Alanları" oldu.

**Testler (uygulama değil):** sekme adı/anahtarıyla giden 13 senaryo yeni adlara taşındı ("Renk &
Beden"→"Ürün", "Veri Denetimi"→"Bakım", `uretim`→`urun` fiyat grubu/asorti için, "Genel"→"Görünüm"/
"Yedek & Bulut", yayın → `yayin`). `senaryo-surum-duyuru` 3. adımı artık GitHub yayın yoluyla (api
taklit) — altın: url GitHub adresi, not boş. DİKKAT: `senaryo-ozel-kod-ekle` 91. satırdaki "Özel
Kodlar" ÜRÜN KARTININ sekmesi, Tanımlar'ın değil — yanlışlıkla değiştirilip geri alındı.
102 senaryo AYNI (`hazir-urunler` paralelde oynak, tek başına AYNI); birim testleri ve denetimler temiz.

## KOLİDEN SEVK TEK YOL (23 Eylül, v1.420.0)

**Kullanıcı (ekran görüntüleriyle):** "Koliler siparişe bağlı aslında; koli üzerinde müşteri, hangi
siparişten ve üretimden geldiği yazıyor (`K-0922004 · Angelina · üretim 10002`). Koli okutulunca
direkt cariyi seçip koliyi eklesin; farklı müşterilerin kolileri varsa ayrı fişler atsın. Bu
'koliden ekle' mantığı cari içinden satış açınca da olsun, aynı yere çıksın; alış için de siparişten
seçtirelim."

**Teşhis:** v1.415/416 siparişi yalnız `koli.siparisId`den arıyordu; üretimden kurulan kolide o alan
boş ama `uretimId` var ve üretim → satış siparişi bağı `kalem.planlama.referansNo`da. Cari de
`koli.cariId`de. Yani sipariş çözülebilirdi.

**`237-koli-fis.jsx` (ortak çözücü):** `koliSiparisiniCoz` sırası: koli.siparisId → üretim üzerinden
planlama referansı → carinin açık satış siparişlerinde içerik eşleşmesi → yoksa SERBEST.
`koliCarisiniCoz`: koli.cariId, yoksa çözülen siparişin carisi. `koliKalemleriniFisSatirinaCevir`:
koli kalemi → fiş satırı (`koliId`/`koliKod` taşır; eşleşen sipariş satırı varsa `kalemId`+`siparis`
bağı — sipariş kartındaki "siparişten seç" ile aynı biçim); fiyat sipariş satırından, yoksa ürün kartı
satış fiyatı. Ürün para birimi SİMGE ("₺") → koda ("TRY") çevriliyor (`satisPbKodu`; senaryoda "Kur
bulunamadı (₺ → TRY)" olarak yakalandı).

**Cari fişi (`255-stokfisi`):** "Siparişten seç" artık tipe göre (alışa alış, satışa satış siparişleri).
Satış fişine **"Koli okut"** (`data-koli-okut`): cari boşsa kolininki seçilir, başka cariye ait koli
reddedilir, sevk edilmiş / zaten fişte olan koli reddedilir, satırlar çözülen siparişe bağlı eklenir.
**Kapı (`089-carifisi`):** satırlar `koliId` taşıyorsa kayıt sonrası koli "Sevk edildi" + `sevkFisNo`
(`koliler`, `saveKoliler` d'ye eklendi; App'ten geçiyor). `fisGeriAl` zaten `sevkFisNo`dan koliyi
"Hazır"a döndürüyor — cari fişi silinince koli geri geliyor (senaryoda doğrulandı).

**Depo > Sevkiyat (`238`):** gruplama CARİYE göre; her cari bir SATIŞ FİŞİ (`stokFisiKaydet`, cari
fişiyle AYNI kapı; fiş no `SF-…`), satırlar çözülen siparişe bağlı, çözülemeyen "serbest". Carisi hiç
belli olmayan koli sebebiyle ayrı ("cari kartından satış fişi açıp orada okutun"). v1.416'daki elle
sipariş seçimi kalktı (artık gerek yok). `siparisGerceklestir` sevkiyat ekranından çıktı; sipariş
kartındaki fiş yolu olduğu gibi duruyor (senaryo-sevkiyat AYNI).

**Doğrulama:** `senaryo-depo-sevkiyat.js` yeniden yazıldı — K-001 üretimden (sipariş ÜRETİM üzerinden
bulundu, "SAT-9 (üretim)"), K-002 yalnız cari (serbest), K-003 bağsız, K-004 sevk edilmiş. Müşteri B
sevk → SF-0922001, stok 20→17/20→15, karşılanan 37=3/38=5, koli sevk edildi; Tedarikçi A serbest →
SF-0922002, stok 17→15, karşılanan DEĞİŞMEDİ. Cari kartından satış fişi + koli okut → cari seçili,
"K-001 eklendi · 2 satır · SAT-9 (üretim)", kayıt; Sil → koli Hazır, stok 20, karşılanan 0.
102 senaryo AYNI, birim testleri ve denetimler temiz.

## SÜRÜM GEÇMİŞİ (23 Eylül, v1.421.0) — HER SÜRÜMDE ZORUNLU ADIM

**Kullanıcı:** "Bundan sonra sürümlerde yaptığımız değişiklikleri sürüm geçmişine not edelim;
kullanıcılar bilgilensin. Tanımlar'da sürüm geçmişi kalsın: neler eklendi, değişti, hata vs."

**`SURUM_GECMISI`** (015-sabitler, `SURUM_NOTU`nun altında): `{ surum, tarih, eklenen[], degisen[],
duzeltilen[] }` — en üste yeni kayıt. Kullanıcı dilinde, kısa; teknik ayrıntı bu notta. 1.405'ten
1.421'e geriye dönük dolduruldu (17 kayıt).
**Ekran:** Tanımlar > Sistem > **Sürüm geçmişi** (`SurumGecmisi`, 137'de; `data-surum-kaydi`,
`data-surum-madde`): son 3 sürüm açık, diğerleri tıklayınca; "bu sürüm" rozeti.
**Yayın notu:** GitHub'a yayınla, `onSurumYayinla`ya notu `surumNotuKur(no)` ile geçmişten veriyor;
üst şeritteki "Yeni sürüm vX" yanında not görünüyor (`data-surum-notu`, kısaltılmış, tamamı title'da).
**Denetim 10'a kural (c):** `SURUM_GECMISI[0].surum === SURUM` değilse BULGU — geçmiş yazılmadan
sürüm çıkarılamaz (sabotajla doğrulandı: 1.422.0 → "kaydını SURUM_GECMISI'nin başına ekleyin").

**SÜRÜM ÇIKARMA ADIMLARI (bundan sonra):** 1) `SURUM`/`SURUM_NOTU` güncelle; 2) `SURUM_GECMISI`
başına kaydı ekle; 3) `yap.sh`; 4) senaryolar; 5) DEVAM-NOTU bölümü; 6) paket.

**Doğrulama:** `senaryo-surum-duyuru`ya geçmiş kontrolü eklendi (17 kayıt, ilk = SURUM, "bu sürüm",
maddeler açık); test sürümü 9.9.9 geçmişte olmadığı için yayın notu boş — doğru. Tanımlar'a dokunan
20 senaryo + sevkiyat senaryoları AYNI; denetimler temiz.

## SATIŞ TEK EKRAN (23 Eylül, v1.422.0)

**Kullanıcı (ekran görüntüsüyle):** "Siparişten satışta koli barkodu yazınca tepki vermiyor. Satış
ekranını tek yere bağlayalım — aynı kod olmasın, satış ekranı tek olsun; depodan da, siparişten de,
cariden de satış deyince tek ekran açılsın. Farklı yerler yalnız köprü olsun. Aynı şey kasa/banka,
planlama vs. için de geçerli."

**Yapılan:**
- **Köprü (`satisFisiAcSiparisten`, 100-app):** sipariş kartındaki "Satış Fişi Oluştur" artık kartın
  içindeki formu değil cari satış fişini (255) açıyor; satırlar siparişe bağlı yüklü. **HAZIR kuralı
  korundu (12 Eylül):** hazır (üretilmiş/tedarik edilmiş) satır varsa YALNIZ onlar, hazır miktarla;
  hazır hiç yoksa kalanlar. Diğerleri fişteki "Siparişten seç" ile eklenir. Hazır ürünler matrisi
  kartta, düğmenin üstünde duruyor (formun içinden taşındı). Alış siparişi teslimi ŞİMDİLİK kartın
  formunda (081 `siparisGerceklestir`) — sonraki adım.
- **Depo > Sevkiyat (238) kayıt yapmıyor:** koliler cariye göre gruplanır, "Satış fişini aç" → aynı
  255 penceresi, koli satırları yüklü; kaydedilen koliler listeden düşer.
- **`BarkodGirdisi` (236):** `<form onSubmit>` + görünür "Ekle/Koliyi ekle" düğmesi. Android Gboard
  Enter'ı keydown'da "Unidentified/Process" gönderdiği için `onKeyDown` tepki vermiyordu; form
  gönderimi hem klavyenin Git tuşuyla hem USB okuyucunun Enter'ıyla çalışıyor. Üç yerde aynı bileşen
  (Depo Okut, Sevkiyat, satış fişi koli okut).
- 255'te satır miktar girdisi `data-fis-miktar="renk|beden"`, hazır satırda `title="Hazır N"`.

**Testler:** `senaryo-hazir-urunler` tek ekrana taşındı (fiş 255'te açılıyor, hazır matrisi kartta
ölçülüyor, onay penceresi yok). Altın: "41=6 (Hazır 6)", "42=3 (Hazır 3)", 43 yüklenmedi, karşılanan
43:0. 102 senaryo AYNI; fişe dokunan 16 senaryo son değişikliklerle yeniden koşturuldu, AYNI; birim
testleri ve denetimler temiz.

**SIRADAKİ (kullanıcının genel ilkesi):** aynı "tek ekran + köprü" düzeni ALIŞ (sipariş kartı alış
teslimi → cari alış fişi), kasa/banka işlemleri ve planlama için. Sipariş kartındaki eski satış formu
kodu (showTeslim satış dalı) artık ölü; alış taşınınca 340'tan tamamen çıkarılacak.

## SİPARİŞTEN SATIŞTA KOLİLER KAPANIYOR (23 Eylül, v1.423.0)

**Kullanıcı (4 ekran görüntüsü):** üretim 10002 (Angelina · SAT-1001, 152 çift, 19 koli) sevk edildi →
depoda "kolide 152, serbest −152", Paketleme'de 19 koli "Hazır" duruyor. "Kolilenmiş ürünleri sevk
ettiğimizde kapatması gerekir; eklerken koli koli eklemesi, toplu adet ve koli no'larını kaydetmesi
lazım; siparişe bağlı koliler siparişte bilinmeli, sipariş raporunda kullanırız."

**Sebep:** siparişten satış düz satırla yapıldı (v1.421'deki kart formu da, v1.422 köprüsü de koliyi
yüklemiyordu) → stok düştü, koliler "Hazır" kaldı.

**Düzeltmeler:**
- **Köprü (340):** siparişe çözülen (`koliSiparisiniCoz`: koli › üretim › sipariş) HAZIR koliler KOLİ
  SATIRI olarak yüklenir (`koliKalemleriniFisSatirinaCevir`); düz satır yalnız koliye girmemiş hazır
  miktar kadar (hazır − kolide). 152'nin hepsi kolideyse düz satır yok.
- **`fisKalemAnahtari` (075):** koli satırı için anahtara `koliId` eklendi — başlangıç satırları
  tekilleştirilirken aynı bedenleri taşıyan ikinci koli "kopya" sayılıp ATILIYORDU (senaryo: 2 koli → 1).
- **`fisYaz` (078) — ESKİ HATA:** her varyant yalnız İLK eşleşen hareketi uyguluyordu (`find`); aynı
  renk/beden iki satırda geçince ikincisi YENİ varyant açıyordu ("37:3" ve "37:−3"). Artık bütün
  eşleşenler toplanıyor; kartta olmayan beden iki satırda da tek yeni varyant. `birim-fisyaz-varyant.js`
  (yeni, kosu.sh'de): iki koli → tek varyant, yeni beden → tek varyant, geri alma başlangıca döner.
- **Satış fişi (255):** fişteki koliler özeti (`data-fis-koliler`, `data-fis-koli`): koli no, çift, beden
  dağılımı, "×" ile koli bütün satırlarıyla çıkar. **Kolide mal uyarısı** (`data-fis-koli-uyarisi`):
  koliye bağlı olmayan satış satırı serbestten (stok − hazır kolideki) fazlaysa "Bu mal kolide…".
- **Sipariş kartı (340) "Koliler"** (`data-siparis-kolileri`, `data-siparis-koli`): TÜRETİLİYOR (ayrı
  kayıt yok): siparişe çözülen koliler, hazır/sevk sayıları, sevk fiş no ya da "elle kapatıldı".
  Eksik-var koşulunun DIŞINDA — sipariş tamamen sevk edilince de görünüyor. Hareketlere koli no
  yazılmadı: koli kaydı `sevkFisNo`yu zaten taşıyor, tek kaynak orası.
- **Paketleme "Elle kapat — sevk edildi say"** (`data-koli-elle-kapat`, seçili kolilerde): stok/cari
  DEĞİŞMEZ; koli "Sevk edildi", `elleKapatildi: { sebep, kim, zaman }`, günlüğe yazılır. Kullanıcının
  mevcut 19 kolisini kapatmak için.

**Test:** `senaryo-siparis-koli-sevk.js` (yeni) — 2 koli üretimden, sipariş kartından fiş: "2 koli · 16
çift", kaydet → ikisi "Sevk edildi (SF-…)", stok 0 (tek varyant), karşılanan tam, depo "kolide 0 · açık
0", kartta iki koli fiş no ile; düz satış uyarısı; elle kapatma (stok değişmedi, sebep saklandı).
`senaryo-surum-duyuru` sürümden bağımsız yapıldı (her sürümde altın değişmesin: `ilkKayitBuSurum`,
`enAz17Kayit`, `sirali`). 103 senaryo AYNI; birim testleri ve denetimler temiz.

**KULLANICIYA:** mevcut 19 koli için Paketleme > Tümünü seç > Elle kapat.

## SATIŞ FİŞİNDE KOLİ GRUPLAMA + BÖLÜM ÇİZGİLERİ (23 Eylül, v1.424.0)

**Kullanıcı (ekran görüntüsü):** üç aynı-asortili koli tek satırda "KOLİ İÇ. MİK. 8 × KOLİ ADET 3 =
TOP. ADET 24 Çift" görünsün; farklı asorti alt satırda toplansın. "Masaüstü için ekranı toparladım,
ekran 3 bölüm, bölümleri ayıran çizgileri belirginleştirelim ve kalınlaştıralım."

**Koli gruplama (255):** `grubuBol` — her ürün+renk grubu, koli içeriğindeki BEDEN DAĞILIMINA (asorti
imzası, sıralı `beden:miktar` dizisi) göre alt satırlara bölünüyor. Aynı imzadaki koliler TEK satırda
toplanıyor (`koliIcMik` × `koliAdet` = `toplamAdet`); farklı imza ayrı satır. Koliye bağlı olmayan
kalemler eskisi gibi tek, düzenlenebilir satırda. Koli satırlarında beden hücreleri SALT OKUNUR
(span, input değil) — fiziksel kolinin içeriği; değiştirmek için koliyi listeden çıkarıp elle satır
eklenir. `KOLİ İÇ. MİK.` / `KOLİ ADET` sütunları yalnız fişte koli varsa görünür.

**Bölüm çizgileri:** satış/alış fişinin üç ana bölümü (üst bilgi şeridi, Kalem Ekle, kalem tablosu)
aynı koyu `2px solid var(--erp-brown)` kenarlık ve hafif gölgeyle (`BOLUM_KENAR`/`BOLUM_GOLGE`)
ayrılıyor; aralarındaki boşluk 10'dan 16'ya çıktı.

**`senaryo-sevkiyat` (eski) YENİ DAVRANIŞA UYARLANDI:** v1.423'teki otomatik koli yükleme
("Satış Fişi Oluştur" siparişe bağlı hazır koliyi ELLE OKUTULMADAN yükler) bu senaryoyu bozmuştu —
elle barkod okutma adımı artık gereksiz/geçersizdi. Adım kaldırıldı, yerine otomatik yüklemenin
doğrulanması kondu (`data-fis-koliler`, `data-fis-koli`); sevk/geri alma ölçümleri aynı kaldı.

**Doğrulama:** `senaryo-koli-satir-gruplama.js` (yeni) — 3 koli aynı asorti (36:1 37:2 38:2 39:2
40:1 = 8 çift) + 1 koli farklı asorti (36:2 37:2 = 4 çift): 2 satır çıkıyor, ilki "8 / 3 / 24 çift /
21.600 ₺", ikincisi "4 / 1 / 4 çift / 3.600 ₺", beden hücreleri salt okunur, 4 koli de kayıttan sonra
"Sevk edildi", stok bütün bedenlerde doğru düşüyor. 104 senaryo AYNI, birim testleri ve denetimler
temiz.

## SİPARİŞTEN SATIŞ FİŞİ — SADECE AÇ (23 Eylül, v1.425.0)

**Kullanıcı:** "Siparişten satış fişi oluştururken satış fişini açsın sadece, geri davranış standart
olacak zaten." v1.422-424'te buton hazır miktarı ve siparişe bağlı koliyi ÖNCEDEN hesaplayıp fişe
dolduruyordu (237-koli-fis, siparisHazirKalemleri). Kullanıcı bunu gereksiz buldu: fişin kendi
standart araçları (Siparişten seç, Koli okut) zaten aynı işi yapıyor, kullanıcı orada seçsin.

**Değişen (340-sipariskarti):** "Satış Fişi Oluştur" tıklanınca `onSatisFisiAc(siparis, [])` — BOŞ
kalemle satış fişini açıyor, hiçbir ön hesap yok. Eski 3110 karakterlik köprü bloğu ~640 karaktere
indi. "Hazır olanların tümünü fişe koy" düğmesi artık yalnız Alış'ta görünüyor — satışta zaten
tıklansa bir yere yazmıyordu (`teslimMiktarlar`ı okuyan inline form satışta kapalı, ölü tıklamaydı).

**Hazır ürünler matrisi KALDI, bilgi amaçlı:** kartta hâlâ "kaynak: Üretildi/Alış fişi, N/M hazır"
gösteriliyor; artık fişi doldurmuyor. "Koliler" bilgi bölümü de (v1.423) aynen duruyor.

**Davranış değişikliği — BİLİNÇLİ:** standart "Siparişten seç" hazır/olmayan ayrımı yapmadan
siparişin TÜM kalanını ekler (koli okut hâlâ yalnız o koliyi ekler). Eskiden "hazır olmayan sevk
edilmesin" kısıtı vardı; kullanıcı bunu kaldırıp standart davranışa döndü.

**Testler yeni davranışa uyarlandı:** `senaryo-sevkiyat` (koli artık ELLE okutuluyor — eski davranışa
döndü), `senaryo-siparis-koli-sevk` (K-A/K-B elle okutuluyor, sonuç AYNI), `senaryo-koli-satir-gruplama`
(4 koli elle okutuluyor, gruplama sonucu AYNI — mantık koliden bağımsız çalışıyor), `senaryo-hazir-urunler`
(fiş boş açılıyor, hazır matrisi bilgi amaçlı ölçülüyor, "Siparişten seç" ile TÜM kalan — 43 dahil —
ekleniyor, karşılanan 41=10/42=5/43=4). 104 senaryo AYNI, birim testleri ve denetimler temiz.

## SİPARİŞTEN SEÇ — KOLİLER BARKOD TARZINDA (23 Eylül, v1.426.0)

**Kullanıcı (ekran görüntüsü):** "Siparişten seçte tüm siparişi ekliyor, koli olarak listelesin
oradan ekleyelim, barkod mantığında. Koli ekle nasıl çalışıyor?"

**"Koliyi ekle" ne yapıyor:** Fiş üstündeki "Koli barkodu okutun ya da yazın" kutusunun submit
düğmesi — kutuya yazdığın/kamerayla okuttuğun kodu fişe ekliyor. Kutu boşken basmanın bir etkisi yok.

**Yapılan (255-stokfisi):** "Siparişten seç" paneli artık iki parçalı:
1. Siparişe ait HAZIR koliler barkod tarzında listeleniyor (kod, çift, beden dağılımı) —
   `data-siparis-koli-ekle`, tek tıkla ekler. "Tümünü ekle" (`data-siparis-koli-tumu`) hepsini ekler.
2. Altta yalnız KOLİYE GİRMEMİŞ kalan (varsa) için eski matris + "Kolisiz kalanı ekle" — koli hiç
   yoksa (Alış siparişlerinde) eskisi gibi "Bu siparişin kalemlerini ekle".
Koli okutma ve buradan tıklama AYNI fonksiyonu çağırıyor (`koliyiFiseEkle`, ortak çıkarıldı) — biri
düzelince ikisi düzeliyor.

**Yolda çıkan gerçek hata:** Kalan hesabı `!kalemler.some(f => f.kalemId === k.id)` ile "bu kalem
fişte VAR MI" diye soruyordu — bir koli kalemin yalnızca bir KISMINI taşısa bile (152 çiftlik
siparişte her koli 8 çift) o kalem TAMAMEN bekleyen listesinden düşüyordu. Tek koli eklenince kalan
144 çift görünmez oluyordu, panel bile kapanabiliyordu. Düzeltme: fişteki bağlı satırların TOPLAM
miktarı düşülüyor (`kalemKalani`), varlık değil miktar kontrolü.

**Doğrulama:** `senaryo-siparisten-koli-sec.js` (yeni) — SAT-1001, 19 hazır koli (8 çift/koli) + 2
çiftlik kolisiz kalan (36 bedeninde). Panel açılınca 19 koli listeleniyor ("Tümünü ekle (19 koli ·
152 çift)"), tek koliye tıklayınca kalan 18 buton + koli fişte, "Tümünü ekle" sonrası 0 buton kalıyor
ve yalnız "Kolisiz kalanı ekle" görünüyor. Kaydedilince 19 kolinin hepsi "Sevk edildi", stok tüm
bedenlerde tam düşüyor, karşılanan doğru (36=21, 37=38, 38=38, 39=38, 40=19). 105 senaryo AYNI,
birim testleri ve denetimler temiz.

## FİŞ EKRANI İKİ SÜTUN (23 Eylül, v1.427.0)

**Kullanıcı (ekran görüntüsü):** "Masaüstü için ekran alt alta yığılmış, sağ taraf boş, toparla."
Kalem Ekle bölümünde ürün girişi → Kalemlere Ekle → koli kutusu → Koliyi ekle → fişteki koliler →
Siparişten seç hepsi tek sütunda alt alta diziliyordu; 1600px ekranda sağ yarı tamamen boştu.

**Yapılan (255-stokfisi):** Kalem Ekle bloğu iki sütunlu grid oldu —
`gridTemplateColumns: repeat(auto-fit, minmax(420px, 1fr))`, medya sorgusu YOK:
- **SOL:** elle kalem girişi (ürün/renk/ölçü/fiyat/miktar, asorti kontrolü, "Kalemlere Ekle").
- **SAĞ:** hazır kaynaklardan ekleme — başlık ("Koliden / siparişten ekle", alışta "Siparişten
  ekle"), koli barkodu kutusu + "Koliyi ekle", fişteki koliler özeti, "Siparişten seç" paneli.
Ayrım işlevsel: biri tek tek yazarak girer, öteki hazır olanı seçer. Sütun içindeki bloklardan
eski `flexBasis: "100%"` (tek sütun zorlaması) kaldırıldı.

**Ölçüldü (gerçek tarayıcı):** 1600px'te koli kutusu ürün alanının SAĞINDA ve aynı hizada
(`yanYana: true`, üst farkı 4px); 700px'te alt alta (`yanYana: false`). `auto-fit` sayesinde ~900px
altında kendiliğinden tek sütuna iniyor — telefon görünümü bozulmadı.

**Doğrulama:** 105 senaryo AYNI, birim testleri ve denetimler temiz.

## KOLİ LİSTESİ EKRANI DOLDURMUYOR (23 Eylül, v1.428.0)

**Kullanıcı (ekran görüntüsü):** 19 koli tek tek listeleniyor, "Siparişten seç" paneli ekranın
tamamını kaplıyor — "koliler ekranı çok dolduruyor, nasıl azaltırız".

**Yapılan (255-stokfisi):** Koliler ASORTİ İMZASINA göre gruplanıyor (beden dağılımı aynı olanlar
tek satır). Pratikte hepsi aynı üretimden çıktığı için tek satır oluyor: "19 koli · 8 çift/koli ·
(36:1 37:2 38:2 39:2 40:1)". Satırda:
- **adet kutusu** (`data-koli-grup-adet`) — kaç koli eklenecek; boş bırakılırsa hepsi. Koliler kod
  sırasına göre alınıyor.
- **"N koli ekle"** (`data-koli-grup-ekle`) — düğme metni girilen adede göre değişiyor.
- **"tek tek seç"** (`data-koli-grup-ac`) — kod kod seçmek isteyen için liste AÇILIYOR; varsayılan
  KAPALI (`acikKoliGruplari` state). Kod düğmeleri de küçültüldü (yalnız kod, çift/dağılım grup
  satırında zaten var).
Üstte "Hazır koliler: 19 koli · 152 çift" özeti + "Tümünü ekle".

**Doğrulama:** `senaryo-siparisten-koli-sec` güncellendi — açılışta 0 kod düğmesi (katlı), 1 grup
satırı; "tek tek seç" → 19 kod düğmesi, tek koli eklenince 18 kalıyor; adet kutusuna 3 → düğme
"3 koli ekle" → fişte 4 koli · 32 çift, grup satırı "15 koli"ye düşüyor; "Tümünü ekle" → grup satırı
kalmıyor, 19 koli "Sevk edildi", stok ve karşılanan doğru. 105 senaryo AYNI, birim testleri ve
denetimler temiz.

## BAKIM TURU — TARAMA (23 Eylül, v1.429.0)

**Kullanıcı:** "eksikleri düzeltelim, çalışmayan yerler."

**Yapılan tarama (hepsi temiz çıktı):**
- 18 denetimin tamamı TEMİZ; denetim 18'in 12 borcunun hepsi gerekçeli ve zararsız.
- **Gerçek tarayıcıda 17 modül** tek tek açıldı: hiçbirinde JS hatası ya da boş ekran yok.
- **Alt sekmeler** (Stok, Depo, Paketleme, Üretim, Modelhane, Planlama, Muhasebe, Gelir/Gider,
  Fişler, Onay Bekleyenler) gezildi: hata yok.
- Ekranlarda "yakında / çalışmıyor / desteklenmiyor" gibi yarım bırakılmış ifade yok; işlevsiz
  (`onClick={() => {}}`) düğme yok.
- Notta "AÇIK — 'Satın Al' düğmesi BOZUK" yazıyordu; **senaryo ile doğrulandı: ARTIK ÇALIŞIYOR**
  (başlık "Satın Al: Deri", `undefined` yok, panel iki rengi de getiriyor: Siyah 13, Taba 3). Not
  eskimiş, kayıt düzeltildi.

**Düzeltilen:** `oludenetim.js` yanlış alarm veriyordu — `const { eskiTip: _e, ...r }` kalıbındaki
`_e` bir alanı ÇIKARMAK için yazılır, kullanılmaması işin ta kendisidir. Alt çizgiyle başlayan adlar
artık atlanıyor. Bu 1 bulgu her koşuda listede duruyordu ve gerçek bir bulguyu gölgeleyebilirdi.

**ALIŞ TEK EKRAN — DENENDİ, GERİ ALINDI (karar kullanıcıda):** Satış v1.422'de cari fişine taşınmıştı;
alış hâlâ sipariş kartının içindeki formda (koddaki not: "Alış şimdilik kartta"). Taşıma yapıldı ve
uçtan uca çalıştı (senaryo: stok 7→32, cariye Alacak 300, karşılanan 25). **Ama** kart formundaki
ONAY PENCERESİ (kaydetmeden önce stok etkisinin özeti) cari fişinde yok — alışta bu adım kullanıcının
isteğiyle konmuştu ve 6 senaryo onu ölçüyor (silme, cikis-fisi, cok-modelli-fis, onay-duzenleme,
fis-ozet, son-islemler). İstenmeyen bir kayıp olacağı için geri alındı; `satisFisiAcSiparisten`
fiş tipini siparişten okuyacak biçimde kaldı, yani karar verilince tek satırlık değişiklikle açılır.
**KULLANICIYA SORU:** alış cari fişine taşınsın mı — taşınırsa onay penceresi cari fişine mi eklensin,
yoksa alışta da kaldırılsın mı?

**Doğrulama:** 105 senaryo AYNI, birim testleri ve denetimler temiz (ölü kod dahil).

## PENCERE BAŞLIĞI — ÇİFT KAPATMA + KIRMIZI KAYDET (23 Eylül, v1.430.0)

**Kullanıcı (ekran görüntüsü):** "kapatma butonu 2 tane var, kaydet bordo renkte kırmızı sırıtıyor."

**Çift kapatma:** Başlıktaki X aslında modülün bildirdiği **"Vazgeç"** eylemiydi (`i-close` ikonu,
küçük kipte yazısız). Yanında pencerenin kendi "Kapat"ı duruyordu — iki düğme, aynı görünüm, ikisi
de kaydetmeden çıkıyor; hangisinin ne yaptığı belirsizdi. `EylemCubugu`, `kucuk` kipte (yani pencere
başlığında) `vazgec` türünü artık çizmiyor. Vazgeç formun altındaki kendi düğmesinde duruyor ve
**Esc kısayolu çalışmaya devam ediyor** — kısayol çubuğa değil, bildirilen eylem listesine bakıyor
(tarayıcıda doğrulandı: Esc pencereyi kapatıyor).

**Kırmızı Kaydet:** `.erp-ib--primary` dolgusu `--erp-accent` (turuncu-kırmızı); pencere başlığı
zaten bordo/renkli bir şerit, iki kırmızı çakışıyordu. Başlığa `erp-pencere-baslik` sınıfı verildi
ve o kapsamda dolgulu buton saydam beyaza alındı (`rgba(255,255,255,0.16)`, ikon beyaz, hover'da
%30). Sayfa içindeki eylem çubuklarında dolgu AYNEN duruyor — standart bozulmadı.

> **TUZAK — CSS'İN İKİ KOPYASI VAR:** `src/001-tema-dosyalari.jsx` ile `src/tema/erp-tokens.css`
> aynı kuralları içeriyor ama derlemeye giren **`tema/erp-tokens.css`**. Kural önce yanlış dosyaya
> yazıldı, tarayıcıda hiçbir şey değişmedi (ölçüm `rgb(236,48,19)` göstermeye devam etti). Bundan
> sonra stil değişiklikleri `tema/erp-tokens.css`e yazılmalı.

**Doğrulama:** Tarayıcıda başlıkta tek "Kapat" (`kapatSayisi: 1`), eylem listesi yalnız `kaydet`,
Kaydet arka planı `rgba(255,255,255,0.16)` ve ikon beyaz; Esc pencereyi kapatıyor. `senaryo-olcu-secimi`
altını güncellendi (başlık eylemlerini listeliyordu, `vazgec` artık yok). 105 senaryo AYNI, birim
testleri ve denetimler temiz.

## ONAY ADIMI ORTAK EKRANA + ALIŞ TEK EKRANDA (23 Eylül, v1.431.0)

**Kullanıcı:** üç seçenek sunuldu, **"1 SEÇENEK"** dedi — onay penceresi ortak fiş ekranına taşınsın,
alış ve satışta da çalışsın.

**Onay adımı (255-stokfisi):** Kaydet artık doğrudan yazmıyor (`kaydet` → onay, `kaydetOnayli` →
`kaydetYaz`). Panel (`data-fis-onay`): stok etkisi MATRİS olarak (ürün satır, beden sütun; alışta
`+`, satışta `-`), cari hareketinin hangi deftere işleneceği, ve **veri hatası bariyeri** — kalemin
ürünü stokta tam olarak bir kez bulunmuyorsa `data-fis-onay-evet` pasif. Düğmeler:
`data-fis-onay-evet` / `data-fis-onay-vazgec`. **Onay açıkken kalem değişirse onay kapanıyor**
(`useEffect([kalemler])`) — eski formdaki davranış; bayat özetle "evet" dedirtmemek için.
Ctrl+S de aynı yoldan geçiyor (senaryoda doğrulandı).

**Alış tek ekranda (340):** "Alış Fişi Oluştur" artık cari ALIŞ fişini açıyor; sipariş kartındaki
teslim formu kullanılmıyor. `satisFisiAcSiparisten` fiş tipini siparişten okuyor.

**PARA BİRİMİ — YENİ KURAL:** fişin kalemlerinin HEPSİ tek para birimindeyse fiş o para biriminde
açılıyor (`kalemPBleri.length === 1`), yoksa carininki. Sebep: USD fiyatlı alış siparişi TL fişe
düşünce cari hareketi güncel kurla TL'ye çevriliyordu — döviz borcu TL'ye dönüşüyordu (testte
75 USD → 3.600 TRY olarak yakalandı). **KALAN SINIR:** bir siparişte hem TL hem USD kalem varsa
ortak ekran tek para birimi kullanır ve dönüşümü açıkça yazar (`25 USD × 48 = 1.200 TRY`); döviz
borcunu ayrı tutmak için iki ayrı fiş kesmek gerekiyor. Kullanıcıya bildirildi, karar bekliyor.

**FİŞ NUMARASI DEĞİŞTİ:** sipariş kartından kesilen alış fişi artık `AS-1-F1` değil `AF-…` (satışta
zaten `SF-…` idi). Siparişe bağı (`Alış Fişi AS-1`) korunuyor.

**TEST TAKIMINDA TARİH BOMBASI GİDERİLDİ:** altın çıktılarda `AF-0923001` gibi TARİH TAŞIYAN fiş
numaraları vardı — ertesi gün bütün takım kendiliğinden kırılacaktı. `normalles`e kural eklendi:
`(AF|SF)-AAGGsss` → `<fisno-sss>` (sıra numarası korunuyor, "aynı fişte mi" ayrımı testin konusu).

**Uyarlanan testler:** `alis-teslim-yardimci.js` (YENİ, ortak adım: fiş aç → siparişten seç →
miktarlar → kaydet → onayla) ve ona bağlanan `siparis`, `silme`, `fis-ozet`, `son-islemler`,
`fis-defteri`. Yeni ekrandaki karşılıklarına taşınanlar: `onay-duzenleme` (onay açıkken kalem
ekleme + onayın kapanması), `cok-modelli-fis` (üç modelden ikisini tek fişte kesip üçüncüsünü
siparişte bırakma — fazlalık satır `Bu bedeni fişten çıkar` ile atılıyor), `cikis-fisi` (aynı fişe
üç ayrı satır), `siparisten-sec` (fiş satırı fiyatı: `data-fis-satir-fiyat` işareti EKLENDİ).
Kaydet adımı olan 9 senaryoya onay tıklaması eklendi. `fis-defteri` atomiklik testi tarihten
bağımsız kuruldu (beklenen fiş no çalışma anında hesaplanıyor): defter reddedince uyarı çıkıyor,
sipariş karşılanmıyor, stok değişmiyor.

**YENİ SENARYO:** `senaryo-alis-tek-ekran.js` — alış fişi açılıyor, onaydan ÖNCE hiçbir şey
yazılmıyor, vazgeç geri dönüyor, onaylayınca stok 7→32, cariye Alacak 300, karşılanan 25; satışta
da onay çıkıyor ve işaret `-`.

**Doğrulama:** 106 senaryo AYNI, birim testleri ve denetimler temiz.

## RENKSİZ MALZEMEDE RENK SORULMUYOR (23 Eylül, v1.432.0)

**Kullanıcı:** "Renksiz hammaddeler de standart seçtiriyoruz. Nasıl mantık yapmamız lazım?"

**Teşhis:** "Standart" bir RENK DEĞİL, yer tutucu (bkz. 077-barkod: ayrılmış 0000 kodu; 152-stok:
renk seçilmezse varyanta "Standart" yazılıyor). Ürün tanımında renk zaten isteğe bağlıydı; sürtünme
FİŞ ve SİPARİŞ ekranlarındaydı: ürün seçilince renk kutusu BOŞ kalıyor, tek seçenek "Standart" olsa
bile kullanıcı elle seçmeden kalem eklenemiyordu (`if (!seciliUrun || !kRenk) return showToast(...)`).

**Kural — TEK SEÇENEK SORULMAZ:**
1. Ürünün tek rengi varsa kendiliğinden seçilir (kullanıcı tıklamaz).
2. O tek renk "Standart" ise alan HİÇ ÇİZİLMEZ — doğrudan miktara geçilir. ("Standart"ı göstermek
   yalnız fazladan adım değil, yanıltıcı: renk diye bir şey yokken renk seçtiriyormuş gibi durur.)
3. Gerçekten çok renkli üründe hiçbir şey değişmez.
`tekRenk` / `renkSorulmaz` + tek satırlık `useEffect` ile; **255-stokfisi** ve **325-siparis**'te aynı
kural, aynı adlar.

**Doğrulama:** `senaryo-renksiz-malzeme.js` (yeni) üç durumu birden ölçüyor — Yapıştırıcı (renksiz):
renk alanı YOK, tek miktar kutusu, kalem tek adımda eklendi; Astar (tek ama GERÇEK renk): alan var,
"Bej" hazır dolu; Deri (çok renkli): alan var, seçim isteniyor. 107 senaryo AYNI (`barkod-atolye`,
`oturum`, `oturum-dustu` paralelde oynak, tek başına AYNI); birim testleri ve denetimler temiz.

**SIRADAKİ (aynı kural, henüz uygulanmadı):** 150-stok-giris, 300-uretim ve 160-urunkarti'ndaki
"Renk seçin…" seçicileri de aynı mantığa çekilebilir — oralarda renksiz malzeme akışı daha seyrek
olduğu için bu turda dokunulmadı.

## İŞÇİLİK EKSTREDE ALIŞ GİBİ GÖRÜNÜYORDU (23 Eylül, v1.433.0)

**Kullanıcı (ekran görüntüsü):** personel kartında iki kayıt — biri alış (`AF-0923003`), biri işçilik
(`10003-Üste-İşçilik`). "İşçilik olan sanki alım yapmışız gibi gösteriyor; fiş no çok dolu, işçilik
olduğunu açıklama satırına yazalım."

**Sebep:** `hareketIslemTipi` (200-cari-sabit) işlem tipini fiş numarasının ÖNEKİNDEN okuyor
(`THS-`, `ODM-`, `AF-`, `SF-`). İşçilik hiçbirine uymuyordu → tip `null` → rozet yok; hareket
`urunAd`/`renk`/`miktar`/`birimFiyat` alanlarını taşıdığı için de alış fişiyle AYNI ürün tablosuyla
çiziliyordu. Numara ayrıca üç bilgiyi birden taşıyor: üretim no + proses + tür.

**Düzeltme:**
- Kaynakta `islemTipi: "İşçilik"` yazılıyor (079-uretim-teslim ve 080-proses-ver, iki yer).
- `hareketIslemTipi`: ESKİ kayıtlarda alan yok → `/-İşçilik$/` ekinden tanınıyor (göç gerekmedi).
- `HAREKET_TIPI_RENK`e `"İşçilik": var(--erp-accent)` — alışla aynı kahverengi olsaydı izlenim sürerdi.
- Cari kartında (265) **İŞÇİLİK rozeti** (`data-hareket-rozet`), fiş no `fisNoGoster()` ile sade
  gösteriliyor (`10003`), açıklama TAM yazılıyor (alışta olduğu gibi ilk iki kelimeye kırpılmıyor).
- **KAYITTAKİ NUMARA DEĞİŞMEDİ:** fiş defteri, arama ve eski kayıtlar `10003-Üste-İşçilik`e dayanıyor;
  yalnız GÖSTERİM sadeleşti (senaryoda ayrıca ölçülüyor).

**v1.434.0 — AÇIKLAMA KALDIRILDI:** v1.433'te işçilik satırına TAM açıklama basılmıştı; kullanıcı
ekran görüntüsünde o alanı işaretleyip "gerek yok, fişte var zaten detaylar" dedi. Haklı: ürün, renk,
adet, birim fiyat ve tutar sağdaki TABLODA; prosesin adı fiş numarasında (`10003-Saya`); türü rozet
söylüyor — açıklama üçüncü kez aynı şeyi yazıyordu. Tablo VARSA açıklama yazılmıyor; tablo YOKSA
(ürünsüz işçilik kaydı) açıklama tek bilgi kaynağı olduğu için duruyor.

**Doğrulama:** `senaryo-iscilik-gorunum.js` (yeni) — tohumda `islemTipi` ALANI OLMAYAN eski bir işçilik
kaydı ve bir alış kaydı: rozet 2 adet (biri ürünsüz kayıt), ekranda `10003` var /
`10003-Üste-İşçilik` yok, TABLOLU kayıtta açıklama YOK, ÜRÜNSÜZ kayıtta açıklama VAR, alış satırı
etkilenmemiş, kayıttaki fiş no aynı. 108 senaryo AYNI (`oturum`, `oturum-dustu` paralelde
oynak, tek başına AYNI); birim testleri ve denetimler temiz.

## CARİ EKSTRESİ — SADE GÖRÜNÜM (23 Eylül, v1.435.0)

**Kullanıcı:** "Cari hareketleri detaysız da göstersin. Şu anki hâli kalsın. Tek satıra sığacak
bilgiler yeterli. Örnek göster birkaç farklı tip için, öyle yap."

**`hareketSadeOzet` (200-cari-sabit) — kural: bilgiyi ATMA, SIKIŞTIR.**
- **Tek kalemli fiş:** ürün · renk · miktar × birim fiyat → `Deri · Beyaz Deri · 11 Desi × 12,21`
- **Çok kalemli fiş:** tek tek dökmek satırı taşırır → sayılır: `102 Bayan Bot · 2 renk · 152 çift`
  (tek ürün varsa adı, birden çoksa "N ürün"; tek renk varsa adı, birden çoksa "N renk")
- **İşçilik:** `102 Bayan Bot · Siyah Süet · 152 adet × 120` (rozet ve fiş no zaten sol sütunda)
- **Para hareketi (ödeme/tahsilat):** ödeme şekli TEKRARLANMIYOR — sol sütunda zaten rozet olarak
  duruyor ("Nakit", "Çek · vade …"); ek bilgi yoksa `—`.
- **Ürünsüz elle kayıt:** açıklamanın kendisi tek bilgi kaynağı, olduğu gibi yazılır.

**Ekran (265-carikart):** defter çiplerinin sağında **"Sade görünüm" / "Detaylı görünüm"** düğmesi
(`data-ekstre-gorunum`). Varsayılan DETAYLI — mevcut davranış değişmiyor. Tercih `localStorage`ta
(`cari:ekstre-sade`): ekstreye her girişte yeniden seçilmesin. Sade satır tek satıra kırpılıyor
(`nowrap` + `ellipsis`), tarih/fiş no/rozet ve borç-alacak-bakiye sütunları aynen duruyor.

**v1.436.0 — SOL SÜTUN DA TEK SATIR:** v1.435'te açıklama sütunu tek satıra inmişti ama SOL sütun
hâlâ üç satırdı: tarih kendi satırında, altında fiş no + tip + defter etiketi sarmalanıyordu — tek
kalemli bir alış fişi bile üç satır kaplıyordu (kullanıcı: "sadece görünümü tek satır yap; tarih,
fiş no, fiş tipi vs. tek satıra topla; detaylıda da aynı şekilde, detaylıda daha yüksek olabilir,
detay var sonuçta"). Tarih kimlik satırının İÇİNE alındı, satır `nowrap`: sığmazsa yatay kayıyor,
bölünmüyor. **Ölçüm:** sade görünümde satır 31 px (tek satır), detaylıda 58 px — fark ürün
tablosundan geliyor, istenen davranış bu.

**TUZAK:** `urunRenkGrupla` (260-cari) grubun satırlarını **`items`** altında tutuyor, `kalemler`
değil — ilk yazımda miktarlar 0 çıktı, senaryo yakaladı.

**Doğrulama:** `senaryo-ekstre-sade.js` (yeni) — dört tip (tek kalemli alış, üç satırlı iki renkli
satış, işçilik, ödeme) sade kipte tek satıra iniyor; detaylı kipte sade satır YOK (0 adet); tercih
`localStorage`ta "1" olarak kalıyor. 109 senaryo AYNI (`oturum`, `oturum-dustu` paralelde oynak, tek
başına AYNI); birim testleri ve denetimler temiz.

## TABLOLARDA "STANDART" YAZILMIYOR (24 Eylül, v1.437.0)

**Kullanıcı (ekran görüntüsü):** alış siparişi kalem tablosunda RENK sütunu "Standart" diye doluyor,
beden sütun başlığı da "STANDART". "Standart yazısını kaldıracaktık, yazmasına gerek yok."

**Teşhis:** "Standart" bir renk/beden DEĞİL, renksiz-ölçüsüz malzemenin yer tutucusu (152-stok renk
seçilmeyince yazıyor; 077-barkod'da ayrılmış kodu var). **Veri tarafında zaten boş dizeyle aynı
sayılıyordu** (`stokAnahtarNrm`, 012/078) — eksik olan GÖSTERİM tarafıydı. v1.432'de fiş/sipariş
GİRİŞİNDE renk sorulmuyordu ama çıkan TABLOLARDA hâlâ yazıyordu.

**`olcuGoster(deger, bos = "")` (012-stok-turetme):** "Standart" → boş (başlıklarda "Miktar").
Uygulandığı yerler: sipariş kalem tablosu (325), fiş kalem tablosu ve küçük matris (255), cari
ekstresi `FisKalemMatrisi` (260) ve sade özet (200). **KAYIT DEĞİŞMİYOR** — varyant hâlâ
`Standart/Standart`; yalnız ekranda yazılmıyor.

**Doğrulama:** `senaryo-standart-gizli.js` (yeni) — renksiz Kalıp + gerçek renkli Deri aynı fişte:
Kalıp satırında renk hücresi BOŞ, başlık "Miktar", Deri'nin rengi "Siyah" DURUYOR, tabloda hiç
"Standart" geçmiyor, kayıttaki varyant `Standart/Standart`. 110 senaryo AYNI (`barkod-atolye`,
`oturum-dustu` paralelde oynak, tek başına AYNI); birim testleri ve denetimler temiz.

> **TEST NOTU:** senaryo FİŞ ekranı üzerinden ölçüyor — sipariş ve fiş tabloları aynı yardımcıyı
> kullanıyor, fişin seçicileri ise oturmuş. Sipariş ekranı aramalı seçici kullanıyor
> (`AramaliUrunSecici`, datalist DEĞİL); oradan sürmek isteyen bunu bilmeli.

## SİPARİŞTE KAMERAYLA BARKOD OKUMA (24 Eylül, v1.438.0)

**Kullanıcı:** "Siparişte kamera ile barkod okuma ekranı ekleyelim, daha önce yaptık."

**Yapılan:** Sipariş formundaki barkod kutusunun yanına `KameraOkuyucu` (236-depo-okut) eklendi —
Depo > Okut ve Depo > Sevkiyat'takiyle AYNI bileşen: önce cihazın kendi okuyucusu (Android Chrome),
yoksa yerleşik Code128 çözücü (iPhone). Okunan kod elle yazılanla AYNI kapıdan geçiyor
(`asortiBarkodOkut`) — ikinci bir okuma mantığı yok, asorti ve çift barkodu ayrımı orada. Kamera
görüntüsü `flexBasis: "100%"` ile kendi satırına iniyor, barkod kutusunu ve mikrofonu ezmiyor.

**Doğrulama:** `senaryo-siparis-kamera.js` (yeni) — kodlar atanıyor, bir ürün beden barkodu
uygulamanın KENDİ çizicisiyle (`window.__erp.barkodSvg`) çiziliyor, y4m'e çevrilip Chromium'un sahte
kamerasına veriliyor: kamera düğmesi var, "yerleşik okuyucu" kodu çözüyor ve sipariş kalemi
kendiliğinden ekleniyor. 111 senaryo AYNI; birim testleri ve denetimler temiz.

> **TEST NOTU:** barkod kutusu YENİ SİPARİŞ formunda — sipariş ekranı liste görünümünde açılıyor,
> senaryonun önce "Yeni Sipariş"e basması gerekiyor. `y4mYaz` artık `senaryo-depo-okut`tan dışa
> aktarılıyor (iki senaryo paylaşıyor).

## FOTOĞRAFTAN ÜRÜN TANIMA — SİPARİŞ VE DEPO (24 Eylül, v1.439.0)

**Kullanıcı:** "Siparişte kamera ile barkod okumaya ilave, kamera ile ürün okuma da olsun. Ürünü
fotoğrafından tanıyıp sipariş alalım. Barkodsuz ürünün fotoğrafından ürünün ne olduğunu tanısın.
Bunu depoda da kullanabiliriz."

**YENİDEN KULLANILDI, YENİDEN YAZILMADI:** `GorselIleBul` (118-gorsel-eslestirme) zaten vardı —
Paketleme (315) ve stok kartında (152) kullanılıyor, birim testi `birim-gorsel-eslestirme.js`.
Karşılaştırma KULLANICININ KENDİ ürün görselleriyle, cihazın içinde: renk histogramı (28 kutu) +
8×8 aHash. Dışarıya hiçbir şey gitmiyor, uydurma ürün üretilemez, sonuç ÖNERİDİR.

- **Sipariş (325):** barkod kutusunun yanına "Fotoğraftan bul". Havuz `urunUygun` (tipe göre
  süzülmüş: alışta hammadde, satışta mamul) — fotoğrafın yanlış listede aranması engelleniyor.
  Seçim kalem alanını DOLDURUYOR, kalemi kendiliğinden EKLEMİYOR: miktarı ve fiyatı kullanıcı
  onaylıyor.
- **Depo > Okut (236):** aynı düğme. Seçilen ürünün RENK BARKODU `urunBarkoduKur` ile kurulup
  normal sorgulama yolundan geçiyor — ikinci bir sorgulama mantığı yok, okutulmuş gibi davranıyor.
  Koda sahip olmayan ürün için sebep söyleniyor ("barkod kodu atanmamış — Paketleme'de Eksik
  kodları ata"), sessiz kalınmıyor.

**Doğrulama:** `senaryo-foto-ile-urun.js` (yeni) — iki ayırt edilebilir ürün görseli (koyu/dikey ve
açık/yatay), fotoğraf kayıtlı görselin BOZULMUŞ hâli (ölçek + bulanıklık + parlaklık + tezgâh arka
planı), yani "aynı ürünün başka fotoğrafı". Sipariş: doğru ürün ilk sırada, seçilince alan doluyor
("Foto Model A · Siyah seçildi"). Depo: kod atanmamışken uyarı, kodlar atandıktan sonra ürünün
durumu sorgulanıyor (`data-depo-okut-sonuc="fm1"`). 112 senaryo AYNI; birim testleri ve denetimler
temiz.

> **TEST NOTU:** panele `data-foto-panel`, dosya girdisine `data-foto-dosya="galeri"`, adaylara
> `data-foto-aday` işaretleri eklendi — ekranda BAŞKA dosya girdileri de var, ilk `input[type=file]`
> yanlış yere gidiyordu.

## KURULABİLİR UYGULAMA (24 Eylül, v1.440.0)

**Kullanıcı:** "Uygulamayı kısayol olarak nasıl yapacağım masaüstüne?" → tarayıcının kendi kısayol
adımları anlatıldı; sonra "nerede var yükleme" diye sordu: **"Uygulamayı yükle" seçeneği hiç
çıkmıyordu.** Sebep: tarayıcı bir sayfayı ancak üçü birden varsa kurulabilir sayıyor —
**manifest + ikonlar + fetch dinleyen servis çalışanı**. Üçü de yoktu.

**HTML'e eklenenler (`paketle.js`):** `<link rel="manifest">`, `theme-color`, apple-touch-icon ve
iOS meta etiketleri, gövde sonunda servis çalışanı kaydı (yalnız `https:` iken; `file://` açılışta
sessizce atlanıyor).

**Depoya BİR KEZ yüklenecek 5 dosya** (`yayin-dosyalari/` altında, pakette de var):
`manifest.json`, `sw.js`, `ikon-192.png`, `ikon-512.png`, `ikon-maskeli-512.png`.
Bunlar sürümden bağımsız — bir kez yüklenir, bir daha dokunulmaz.

**Kararlar:**
- `start_url: "./"` — kısayol SÜRÜMLÜ dosyayı değil KÖK adresi açıyor; başlatıcı her zaman
  yayındaki son sürüme gidiyor, kısayol eskimiyor.
- **Servis çalışanı ÖNBELLEĞE ALMIYOR** (bilerek): uygulama tek dosya, güncelleme başlatıcıdan
  geliyor. Önbellek girseydi "yeni sürümü yayınladım ama eski açılıyor" sorunları başlardı —
  kazancı yok, riski çok. `fetch` dinleyicisi var ama araya girmiyor (kurulabilirlik şartı).
- Maskelenebilir ikonda içerik ortadaki %60'ta: Android ikonu daire/kare kırpabiliyor.

**Doğrulama:** gerçek HTTP sunucusunda (file:// değil) manifest okunuyor, üç ikon da 200 dönüyor,
`sw.js` erişilebilir, `theme-color` yerinde, sayfa hatası yok. 112 senaryo AYNI (`oturum` paralelde
oynak, tek başına AYNI); birim testleri ve denetimler temiz.

## BELGELERDE DOĞRUDAN YAZDIRMA (24 Eylül, v1.441.0)

**Kullanıcı:** "Sipariş doğrudan yazdırma yok, PDF var. Yazdırma ekle."

**Teşhis:** Paylaş şeridinde (`PaylasSeridi`, 075-fis-ortak) PDF · WhatsApp · E-posta vardı; kâğıda
basmak için önce PDF indirip açmak gerekiyordu. Mevcut `indirYazdirilabilirHTML` de dosya İNDİRİYOR
(onload'da print), doğrudan yazdırmıyor.

**Eklenen:** `belgeyiYazdir(govdeHTML, baslik)` — gizli bir `iframe` açıp belge gövdesini yazıp
yazıcı penceresini çağırıyor. `belgeyiPaylas`a `"yazdir"` yolu, şeride "Yazdır" düğmesi
(`data-paylas-yazdir`). Şerit ORTAK olduğu için sipariş, fiş, cari ekstresi ve reçete çıktılarında
birden çıktı.

**Kararlar:**
- **`iframe`, `window.open` DEĞİL:** telefon tarayıcıları açılır pencereyi engelliyor, kullanıcı
  "hiçbir şey olmadı" diyordu.
- **PDF üretiminden ÖNCE dönüyor:** yazdırmanın PDF kütüphanesine ihtiyacı yok, internet yokken de
  çalışmalı. Düğme `mesgul` iken de basılabiliyor (PDF hazırlanırken yazdırma beklemiyor).
- Çerçeve yazdırma penceresi kapanmadan kaldırılırsa Safari boş çıktı veriyor → 60 sn sonra
  kaldırılıyor. Görseller yüklenmeden basılırsa logo boş çıkıyor → `load` sonrası basılıyor.
- Yazdır düğmesi PDF'in SOLUNDA: kâğıda basmak en sık yapılan iş. PDF artık dosya ikonuyla
  (ikisi de yazıcı ikonundayken hangisinin ne yaptığı belirsizdi).

**Doğrulama:** `senaryo-siparis-yazdir.js` (yeni) — `window.print` izleniyor (gerçek yazdırma
çağrılmadan): düğme var, yazıcı penceresi 1 kez çağrılıyor, basılan gövde siparişin kendisi
(`SAT-9001` var, menü/MODÜLLER YOK). `senaryo-tedarik-girisleri` altını güncellendi (şeritte artık
"Yazdır" da yazıyor). 113 senaryo AYNI; birim testleri ve denetimler temiz.

## SİPARİŞ DÜZENLERKEN ÜRÜN EKLEME (24 Eylül, v1.442.0)

**Kullanıcı:** "Sipariş düzenle deyince stok ekleme de olsun; yarın kalan sipariş üzerine devam
etmek için önemli."

**Eylem ZATEN VARDI:** `onKalemEklemeyeBasla` (325-siparis: `sipariseKalemEklemeyeBasla`) — form
siparişin carisi ve tipiyle açılıyor, eklenen kalem o siparişe yazılıyor. Ama kartın BAŞLIĞINDA
YAZISIZ bir `+` ikonuydu; düzenleme formundayken gözden kaçıyordu. Düzenleme formuna (Kaydet /
Vazgeç yanına) açık adıyla düğme kondu (`data-siparis-urun-ekle`) — **ikinci bir ekleme yolu değil,
aynı kapının görünür kısayolu**; iki yol olsaydı zamanla birbirinden ayrılırdı.

**Doğrulama:** `senaryo-siparise-urun-ekle.js` (yeni) — düzenlemede düğme VAR, basınca
"SAT-7001 siparişine kalem ekleniyor", yeni sipariş AÇILMIYOR, mevcut kalem bozulmuyor.
114 senaryo AYNI (`oturum`, `oturum-dustu` paralelde oynak, tek başına AYNI); birim testleri ve
denetimler temiz.

> **TEST SINIRI — DÜRÜSTÇE:** kalemin forma girilip kaydedilmesi senaryoda SÜRÜLMÜYOR. Sipariş
> formunun aramalı seçicisi (`AramaliUrunSecici`, 005) öneriyi `onMouseDown` ile seçiyor; düz
> `click`, Enter ve barkod yolu denendi, testten sürülemedi. O akış bu sürümde DEĞİŞMEDİ (kartın
> `+` düğmesiyle aynı fonksiyon). Sipariş formunu testten sürmesi gereken ileriki bir iş çıkarsa
> önce seçiciye test işareti eklemek gerekiyor.

> **KART AÇMA — TEST NOTU:** sipariş kartında düzenleme yalnız TAM EKRAN kartta çiziliyor. Sıra:
> sipariş no'nun `role="button"` taşıyan ATA şeridine tıkla → `button[title^="Tam ekran aç"]` →
> `[data-kart-eylem="duzenle"]`. Liste kartında düzenle düğmesi görünmüyor.

## GİRİŞ SONRASI "OTURUM KAPANDI" ŞERİDİ (24 Eylül, v1.443.0)

**Kullanıcının durumu:** `rls-kimlik.sql` çalıştırılmış (kimlik koruması AÇIK). Uygulamada giriş
yapıyor ama kırmızı "Bulut oturumunuz kapandı" şeridi ekranda kalıyor, `surum` kaydı bekliyor.

**Teşhis (adım adım, ekran görüntüleriyle):**
- `pg_policies`: her tabloda `giris_yapmis_hersey` → `{authenticated}`. **SQL tarafı doğru.**
- Supabase **Authentication > Users**: `mahmut@atolye.local`, **Last sign in 24 Eyl 20:17** —
  **giriş GERÇEKTEN başarılı.** Yani sorun ne SQL'de ne hesapta; uygulamada.

**İki ayrı kusur bulundu (100-app, normal giriş ekranının `onGiris`u):**
1. `setOturumDustu(false)` YALNIZ `BulutGirisEkrani` yolunda vardı. Normal giriş ekranından bulutla
   girilince işaret asılı kalıyordu → kullanıcı giriş yaptığı hâlde "hâlâ kapalı" okuyordu.
   YEREL girişte işaret bilerek DURUYOR (bulut oturumu gerçekten yok).
2. Şerit yalnız `oturumDustu`dan değil, **bekleyen kaydın eski 401 hatasından** da çiziliyor.
   Giriş sonrası bekleyenler gönderilmediği sürece uyarı kalıyordu — oysa şeridin kendi metni
   "Yeniden giriş yapınca gönderilir" diye söz veriyor. Artık bulutla girişte
   `yenidenGonderRef.current(true)` çağrılıyor (sessiz).

> **TEST SINIRI — DÜRÜSTÇE:** bu iki düzeltme SENARYOYLA ÖLÇÜLEMEDİ. Denendi: şerit, bekleyen yazma
> köprüsüne (`window.__bekleyenYazmaDegisti`) sahte kayıt enjekte edilerek getirilebiliyor ama
> `bekleyenleriYenidenGonder` GERÇEK bekleyen veriyi depodan okuyor; sahte kayıt gönderilmiyor, bu
> yüzden "şerit kapandı mı" ölçümü anlamsız çıkıyor. Gerçek ölçüm için 401 veren bir yazma →
> bekleyen kayıt → çıkış → bulutla giriş zinciri kurmak gerekiyor; bu turda yapılmadı.
> Bozulma kontrolü yapıldı: `oturum`, `oturum-dustu`, `bulut-kullanici`, `yoneticisiz`,
> `kullanici-rolleri`, `bekleyen-yazma` senaryoları AYNI.

> **YANLIŞ TEŞHİS (aynı turda, geri alındı):** "giriş ekranı `!loading` şartına takılıyor, kullanıcı
> kilitleniyor" diye bir düzeltme yapıldı; sabotaj testi düzeltme OLMADAN da geçtiğini gösterdi
> (uygulama o anda `loading` durumunda değil). Kanıtlanmamış değişiklik geri alındı.

**Doğrulama:** 114 senaryo AYNI (`oturum` paralelde oynak, tek başına AYNI); birim testleri ve
denetimler temiz.

## PAKET EKSİKLERİ (24 Eylül, v1.445.0 oturumu) — ÖNCE BUNU OKU

Kullanıcının yüklediği `atolye-erp-src-v1_444_0.zip` EKSİKTİ (önceki oturumun paketleme hatası):

- **Kaynak (4 parça):** `137-github-yayin.jsx`, `236-depo-okut.jsx`, `237-koli-fis.jsx`,
  `238-sevkiyat.jsx`. Zip'teki `src/.satir-haritasi.json`'dan bulundu. Yayındaki v1.444.0 HTML'inden
  **DERLENMİŞ hâlleriyle** (React.createElement) geri çıkarıldı — davranış aynı (89 senaryo
  karşılaştırması temiz), JSX biçimi kayıp. Her dosyanın başında "⚠ YEDEK KAYNAK" uyarısı var.
  Kullanıcı asıl .jsx'leri içeren eski bir zip yüklerse DEĞİŞTİR (v1.444.0'dan bu yana bu dört
  dosyaya dokunulmadı).
- **Testler:** 19 senaryo betiği yok (bayat-efekt, iscilik-yonu, yazma-hatasi, depo-okut,
  beden-etiketi, github-yayin, depo-sevkiyat, siparis-koli-sevk, koli-satir-gruplama,
  siparisten-koli-sec, alis-tek-ekran, renksiz-malzeme, iscilik-gorunum, ekstre-sade,
  standart-gizli, siparis-kamera, foto-ile-urun, siparis-yazdir, siparise-urun-ekle);
  `altin-uretim-iade.txt` yok; birim testleri `birim-code128-cozucu.js`, `birim-fisyaz-varyant.js`
  yok; yardımcı `alis-teslim-yardimci.js` yok → siparis, silme, fis-ozet, son-islemler, fis-defteri
  senaryoları ÇALIŞMIYOR. `kosu.sh` bu yüzden bu pakette tam koşmaz.
- **Ortam:** `senaryo-surum-duyuru.js` `/home/claude/erp/baslat.html` yolunu sabit kullanıyor;
  paketi başka dizine açınca `ln -sfn <paket> /home/claude/erp` gerekiyor.
- **Paketlerken:** zip'i `src/` + `test/` + kök dosyaların TAMAMIYLA oluştur; paketledikten sonra
  `.satir-haritasi.json` ile `src/` dosya listesini ve `kosu.sh` listesiyle `test/`i karşılaştır.

## YENİ TASARIM (25 Eylül, v1.449.0 — Claude Code oturumu)

**Kullanıcı:** "Tasarımımız çok eski. Birkaç kere uğraştık ama olmadı. Siyah kolon hoş değil, güncel
tasarım lazım." Sipariş ekranı üzerinden üç yön çizildi (Tasarım tuvali, claude.ai artifact):
A açık-nötr (beyaz menü), B sıcak-kum, C üst menü/yan kolonsuz. **Karar: "C'nin yerleşimi, A'nın renkleri."**

**Önceki denemeler neden tutmadı:** kodda **1.188 sabit hex** vardı (çoğu bej/kahve: #E4D8C0 238,
#C9B99A 220…). Yalnız token değiştirmek ekranın çoğunu eski tonda bırakıyordu.

**Yapılanlar:**
- **Renk katmanı `ERP_TEMA`** (015-sabitler): kullanıcının erp-tokens.css'i DEĞİŞMEDİ; köprüden sonra
  gelen son katman. Açık gri sayfa (#F5F6F8), beyaz panel, çizgiler #DCE0E5/#E8EBEF, metin #1D2129,
  tek vurgu marka kırmızısı #C4321A (yalnız ana eylem + seçili öğe), DM Sans. Eski görünüme dönmek =
  tabloyu boşaltmak. Bildirim kutusu koyu kalıyor (`--erp-toast`).
- **Sabit renkler temaya bağlandı (633 dize):** yalnız DÜZ dize literalleri, TS ayrıştırıcıyla
  (betik mantığı: `#E4D8C0/CFC2A8/D9C9AC→line-soft`, `#C9B99A/C8BCAC→line`, koyu kahveler→text,
  `#7A6A50/#455A40→text-2`, `#A6957A→text-3`, açık kremler→hover/head). **Şablon dizeleri (backtick)
  DOKUNULMADI**: yazdırma/PDF belgeleri ayrı pencerede, token yok. `<`/`>` içeren dizeler de dışarıda.
  Renkli vurgular (turuncu, mor, durum renkleri) yerinde — ayrı tur.
- **VERİ GERİ ALINDI:** betik renk KODU varsayılanlarını da çevirmişti (`renkKodu: "#C9B99A"` —
  veritabanına yazılan değer, `type="color"` kutusu) ve yazdırma yedeği `ERP_TOKENLARI`'nı. Dördü +
  tablo elle hex'e döndü; `bekleyen-yazma` senaryosu yakaladı. **Ders: sabit→token eşlemesi yalnız
  stil bağlamında; veri alanları (renkKodu, value=) ve yedek tablolar hariç.**
- **`${renk}XX` saydamlık birleştirmeleri → `alfaEkle(renk, "XX")`** (27 yer). Token değerine iki hane
  eklemek geçersiz CSS'ti; bazıları (`var(--erp-text-2)33`) zaten bozuktu — kategori/proses kenarları
  görünmüyordu (sürüm notunda "düzeltilen").
- **Yan menü → ÜST MENÜ** (100-app, `<header className="ust-menu">`, 56px): logo+firma adı, Anasayfa,
  Depo▾, Üretim▾, Planlama, Siparişler▾, Finans▾; sağda Sohbet (rozet), Günlük, Onay (rozet),
  Tanımlar (dişli), kullanıcı menüsü (ad, rol, test modu notu, sürüm, Çıkış). Gruplar ve yetki
  koşulları yan menüyle AYNI. Açılır listenin içeriği kapalıyken de DOM'da (`display:none`) —
  `data-nav` her zaman bulunuyor. Dışarı tıklama kapatır. Dar ekranda (≤1100) firma adı, (≤880)
  grup ikonları gizlenir; menü kaydırılmıyor (açılır listeler kırpılırdı). `NavGrubu` kaldırıldı,
  `NavItem` açık zemine göre yeniden çizildi. `sidebarDaraltilmis`, `acikNavGruplari` → `acikUstMenu`.
- **Yükseklikler:** `PENCERE_SERIT_YUKSEKLIGI` artık `calc(var(--ust-menu-h) + 40px)` dizesi
  (060-depo); `--ust-menu-h` masaüstünde 56px, mobilde 0 (100-app efekti). `--menu-genislik` hep 0.
  Sekme şeridi menünün altında (`top: var(--ust-menu-h)`), sayfa zemininde; etkin sekme beyaz kart.
- **Mobil:** üst menü CSS ile gizli (`.ust-menu { display:flex }` sınıfta — satır içi display
  mobil gizlemeyi eziyordu, ekran görüntüsünde yakalandı); alt çubuk aynen, seçili öğe yeni renkte.
- Modül başlığı: renkli nokta + kesikli çizgi (`StitchDivider`) kalktı, 22px sade başlık.

**Testler:** `ortak.js`'e `modulAc(sayfa, ad)` (data-nav'a doğrudan); 85 menü tıklaması çevrildi.
`.sidebar` → `.ust-menu`; `sekmeler`in kaydırma ölçümü yeni yerleşime göre (şerit ve menü sabit, menü
şeridin üstünde). Altını güncellenenler (yalnız tasarım farkı): `bakiye-renk`, `pesin-tahsilat`
(renk değerleri), `sekmeler` (renk, başlık boyutu, konumlar), `satin-al-dugmesi` (sabit öğe listesinde
üst menü), `menu-gruplari` (ilk hâl 4 grup + 4 öğe).

**Ekran görüntüsü tekniği (bu ortamda esm.sh kapalı):** test paketi + npm'den `lucide-react@0.383.0`
gömülü, yazı tipleri curl ile rotalanıyor (`/tmp` betikleri; tekrar gerekirse aynı yol).

**AÇIK:** renkli vurgular (eski turuncu #E1611F 40, #C97B3D, #B8860B…), pencere başlık bantları
(sipariş mavisi, ürün penceresinin kategori rengi) — kullanıcı geri bildirimine göre.

### v1.450.0 — MENÜ SIĞDIRMA + AÇIK KATEGORİ ŞERİTLERİ (25 Eylül)
**Kullanıcı** (tablet ekran görüntüsü): "Finans" ve "Siparişler" sağdaki ikonların altına giriyordu.
Test ortamında 900px'te sığıyordu — cihazın yazı boyutu ayarı metni büyütüyor, **genişlik eşiği
güvenilmez**. Çözüm ölçüm: `ustMenuSigdir` (100-app) her çizimde, ekran boyutu değişince ve
`document.fonts.ready`'de menü kabının `scrollWidth > clientWidth` olup olmadığına bakıp kademeyi
DOM sınıfıyla ayarlıyor (React durumu değil — yoksa ölç/çiz döngüsü): `sik-1` grup ikonları gizli,
`sik-2` yalnız ikon (etiketler `.ust-menu-etiket` gizli; erişilebilir ad aria-label/title'dan),
`sik-3` Anasayfa düğmesi de gizli (logo anasayfaya gidiyor). Anasayfa düğmesine ev ikonu eklendi.
Ölçüldü: 1000→normal, 900→sik-1, 820/760→sik-2.

**Stok kategori şeritleri** (kullanıcı: "stok kategori şeritlerini de açık renk yap"): dolu koyu
bant + beyaz yazı → kategori renginin %8 tonu, 1px %20 kenar, yazı/ikon kategori renginde
(`data-stok-kategori-bandi`). Ürün penceresinin kategori renkli başlığına dokunulmadı (bant değil).

**yap.sh:** koruma artık önce `git fetch origin main` yapıyor. PR telefondan birleştirildiğinde
yerel origin/main eski kalmış, v1.449 yayındayken üstüne derlenmişti (commit öncesi geri alındı).

### v1.451.0 — ☰ MENÜ KADEMESİ (25 Eylül)
**Kullanıcı** (telefon ekran görüntüsü, ~430px, "Masaüstü görünümü" seçili — `body.masaustu-duzen`
üst menüyü 720px altında da gösteriyor): kademe 3'te bile ikonlar üst üste biniyordu. **Kademe 4**
(`sik-4`): normal menü (`.ust-menu-normal`) gizli, tek "Menü" düğmesi (`.ust-menu-dar`, aria-label
"Menü") — açılır listede bütün modüller grup başlıklarıyla. Menü tanımı artık TEK TABLO (100-app,
`menu` dizisi): normal menü ve ☰ listesi aynı tablodan, yetki koşulları aynı. ☰ öğeleri `data-nav`
DEĞİL `data-nav-dar` taşıyor (aynı ad iki düğmede olmasın). Ölçüldü: 430px masaüstü kipinde sik-4,
taşma yok, öğe seçince liste kapanıp modül açılıyor. Anasayfa başlığı Space Grotesk → tema yazı tipi.

## YENİLEMEDE EKRAN KORUNUYOR (25 Eylül, v1.448.0 — Claude Code oturumu)

**Kullanıcı:** "Sayfayı yenilediğimizde her şeyi kapatıp ana sayfaya alıyor. Yenilemeyi aslında açılan
yeni renk vs. güncellensin diye yapıyorum."

**Karar:** veriyi sayfa açıkken yerinde tazelemek (bir "Buluttan yenile" düğmesi) açılış yüklemesini,
fark belleğini (`tabloBaslangicTam`), iyimser kilit sürümlerini ve bekleyen yazma kuralını İKİNCİ bir
yoldan kurmak demekti — yanlış kurulursa veri kaybı. Onun yerine yenileme tam ve temiz yükleme
yapmaya devam ediyor, EKRAN geri getiriliyor.

**Nasıl (095-pencereler + 100-app):** `sessionStorage["arayuz:durum"]` = etkin sekme, açık sekmeler,
sekme geçmişi, CANLI pencereler (`urun`, `uretim`, `siparis` — yalnız kayıt kimliği taşıyan, her
çizimde güncel veriden kurulanlar) ve etkin pencere. Her değişimde yazılıyor, açılışta `useState`
ilk değerleri buradan. KOPYA taşıyan pencereler (reçete, maliyet, fiş, ekstre, depo-satınal, stok-fişi
taslağı) geri getirilmiyor — yenilemeden sonra eski veriyi gösterirlerdi. Yükleme bitince kaydı
silinmiş pencereler bir kez ayıklanıyor. sessionStorage sekmeye özel: yeni açılış ana sayfadan başlar;
yenileme ve otomatik sürüm geçişi kaldığı yerden sürer. Çıkışta (`kullaniciCikisYap`) siliniyor.
Modüllerin iç durumu (alt sekme, süzgeç, yarım form) geri gelmiyor.

**yap.sh KORUMASI:** çıktı dosyası `origin/main`'de zaten varsa derleme DURUYOR ("önce SURUM'u
artır"). Bu oturumda iki kez sürüm artırılmadan derlenip yayındaki dosya ezildi (commit'ten önce geri alındı).

**Doğrulama:** `senaryo-yenileme-ekran` (YENİ): Stok + Sipariş sekmeleri ve SAT-Y1 penceresi açık →
yenile → üçü de geri, pencere görünür; tohumdaki not değiştirilmiş → pencere yeni notu gösteriyor
(veri yeniden okundu); kayda elle eklenen silinmiş-sipariş ve reçete pencereleri geri gelmiyor.

## RENK YAZARAK EKLEME (25 Eylül, v1.452.0 — Claude Code oturumu)

**Kullanıcı** (ürün kartı ekran görüntüsü, 12 renkli açılır liste): "Renk ekleme yazma ile seçici olsun,
yazdıkça elensin liste."

**`AramaliSecici` (005-urunsecici, GENEL):** `secenekler: [{deger, etiket}]`, `onSec(deger)`. Kendi
listesini çiziyor — tarayıcının datalist'i telefonda tutarsız (liste çıkmıyor/süzme görünmüyor).
Türkçe harf duyarsız; kelime başı eşleşenler önce ("siy" → Siyah Süet, Siyah Deri, Kırık Siyah),
sonra kelime içi. Ok tuşları + Enter, dokunarak seçim (`onMouseDown` — blur'dan önce). Varsayılan
`temizle`: seçimden sonra kutu boşalır ve odakta kalır (EKLEME kutusu; art arda renk). Seçenekler
`data-aramali-secenek`, kutu `veriAdi` ile işaretlenebilir.

**Bağlandığı yer (152-stok, yeni/düzenlenen ürün formu, MAMUL):** tek renk "Renk seçin… + Ekle" →
`data-renk-ekle-arama`; model rengi (2+ renk) kombinasyon seçimi → `data-model-rengi-arama`. Seçim
anında `toggleRenk`; eklenen renk `secilebilirRenkler`den zaten düşüyor. `mamulRenkSecimi` durumu
kalktı. Hammadde formunda renkler düğme (çip) olarak kalıyor — dokunulmadı.
Diğer "Renk seçin…" açılır listeleri (ürün kartı reçete eşlemesi 160, sipariş formu renk seçimi)
aynı bileşene geçirilebilir — kullanıcı isterse.

**Doğrulama:** `senaryo-renk-arama` (YENİ): Mamul sekmesi → Ürün Ekle; 6 renk; "siy" süzmesi, Enter
ekler + kutu boşalır + listeden düşer, dokunarak ekleme, "eşleşen yok" mesajı, çipler.

**v1.453.0 — HAMMADDE FORMU** (kullanıcı, ekran görüntüsü: bütün renkler düğme dizisi): "bu tek liste
olsun, az önceki gibi kutu boş gelsin, yazdıkça liste daralsın". Düğme dizisi → `AramaliSecici`
(`data-hammadde-renk-arama`); süzgeç AYNI (kombinasyon etiketi olmayanlar + hammaddede
`renkTipeUygunMu` malzeme tipi); aynı adlı renkler tekilleştiriliyor. Seçilenler altta etiket
(`data-secili-renkler`, × ile çıkar — mamuldeki etiket görünümü). "Yeni Renk" satırı yerinde.
`senaryo-renk-arama` ikinci sayfada hammadde formunu ölçüyor (boş başlıyor, "der" süzmesi, Enter,
etiket, ×). NOT: aynı sayfada mamul formu açıkken "Ürün Ekle" formu kapattığı için ayrı sayfa.

**v1.454.0 — ÖZEL KOD ÖNERİSİ** (kullanıcı, Taban/Kalıp alanlarının ekran görüntüsü: "bu alanlarda aynı
şekilde olsun"). Renkten farkı: değer SERBEST (yeni taban no yazılabilmeli) → ayrı bileşen
`AramaliMetin` (005): kutu değeri tutuyor (`deger`/`onDegis`), altında `oneriler` süzülüyor (başı
eşleşen önce, sayısal sıralı, kutudaki değerin kendisi hariç, en çok 50). Enter yalnız bir öneri
VURGULUYSA seçer; yoksa yazılan kalır. Öneriler = o ALAN KİMLİĞİNE diğer ürünlerde girilmiş
değerler. Bağlandığı yerler: yeni ürün formu (152, `items`) ve ürün kartı düzenleme (160,
`tumUrunler`, ürünün kendisi hariç). `setForm`/`setEditForm` fonksiyonlu (bayat okuma kuralı).
Senaryo: `renk-arama`ya `ozelKod` (öneri "147", seçim, serbest "999X").

## PROSES BAZLI SİPARİŞ NOTLARI (26 Eylül, v1.476.0 — Claude Code oturumu)

Kullanıcı (sıradaki işlerden 1. madde — "sipariş açıklamasını üretime taşımak" — şöyle olsun):
"Not girdiğimizde üretime not var ise üretimin hangi prosesine ait onu da yazıp o proseste gösterecek.
Örnek: kesim için 'deriyi iyi yerinden kes', temizleme için 'her tek poşete konacak'."

- **Veri:** kalemde `notlar: [{ proses, metin }]` (proses "" = genel). v1.470'in `aciklama`sı genel not
  olarak okunuyor (`kalemNotlari`), düzenlenince `notlar`a taşınıyor. Yardımcılar 320'de:
  `kalemNotlari`, `grupNotlari`, `notlariTekille`, `uretimSiparisNotlari`, `notEtiketi`, `htmlKacis`,
  bileşen `KalemNotDuzenleyici` (çipler + proses seçici + metin + "+"; `salt` gösterim).
- **Sipariş formu (325):** Ekle satırında not düzenleyicisi; yazılıp "+"lanmamış not da Ekle'de
  kaleme gidiyor (`kNotTaslak`). Kalem listesinde her renk satırında düzenleyici — KİLİTLİ
  (planlanmış) satırda da (`grupNotDegistir`); kaydetme kilitli kalemi asıldan alırken NOTU formdan
  alıyor. Proses seçenekleri: reçetedeki prosesler (tanım sırası) + her birinin ardına ürünün bağlı ara
  prosesi + tanımlı diğer prosesler (`notProsesleri`; SiparisModule'e `tanimlarAraProsesler` geçiyor,
  satın alma sayfasındaki örneğe `tanimlarProsesler` de eklendi — yoktu).
- **Üretim CANLI okur, kopyalamaz** (`uretimSiparisNotlari`: kalemin `planlama.referansNo` = üretim
  no). Planlamadan sonra eklenen not da atölyeye düşer; eski işler göç istemez. (Kutu rengi
  kopyalanıyor çünkü tüketimi değiştiriyor; not yalnız bilgi.)
- **Gösterim:** üretim kartı (310) başında genel not + "N proses notu", her proses satırının altında
  sarı not kutusu (`data-uretim-proses-notu`); iş emrinde proses başlığı altında "NOT: …" ve başta
  "SİPARİŞ NOTU"; atölye ekranında (280) iş kartında ve iş alma/teslim başlığında büyük sarı not.
  Üretimde olmayan prosese yazılmış not genel notlarda görünür (kaybolmasın). Sipariş kartı (340) ve
  çıktısı (075) notları "Kesim: …" etiketiyle gösteriyor. Teslim fişine not basılmıyor (iş bittikten
  sonra basılıyor).
- Test: yeni `senaryo-proses-notu` (kilitli kaleme not → kayıt, üretim kartı, atölye); 
  `senaryo-siparis-form-duzen` not düzenleyicisine uyarlandı.

## FİNANS — DÖNEM, NAKİT AKIŞI, MALİYET FARKI (26 Eylül, v1.475.0 — Claude Code oturumu)

Kullanıcı (önerilen sıradaki işlerden 2. maddeyi seçti: "2 de olsun"): dönem karşılaştırması, nakit
akış projeksiyonu, kart maliyeti ile gerçekleşen maliyet farkı. Üçü de Finans Raporu'nun "Görünüm"
seçiminde (248); defter ve "tarih itibarıyla" seçimleri geçerli ("yan yana" bunlarda Tümü sayılır).

- **Dönem Karşılaştırma** (`finansDonemKarsilastir`, `DonemKarsilastirmaGorunumu`): iki tarihte
  `finansRaporSatirlari` → `finansOzet`; grup, toplam, değişim, yüzde. Hazır noktalar: geçen ay sonu
  (varsayılan), 30 gün önce, geçen yıl sonu. SINIR: fiyat/kur güncel — stok farkı miktar farkıdır.
- **Nakit Akışı** (`finansNakitAkisi`, `NakitAkisiGorunumu`): başlangıç kasa+banka (TL); vadesine göre
  alınan çek (portföy/tahsilde), açık alacak (yaşlandırma FIFO'su), verilen çek, açık borç. Haftalık
  (8) / aylık (6, ilk ay bugünden). "Vadesi geçmiş" ayrı satır (isteğe göre birikimliye katılır,
  katılınca "en düşük nakit" adayı), son dönemden sonrası "Sonrası". Satıra dokununca kalemler.
  Kuru olmayan birim dışarıda, uyarı yazılı. Çek durumu ortak yardımcıya taşındı (`finansCekDurumu`).
- **Maliyet Farkı** (`finansMaliyetFarki`, `MaliyetFarkiGorunumu`): üretim başına KART (reçete × adet ×
  güncel fiyat + proses ücretleri × adet) ve GERÇEKLEŞEN (uretimId'li net hammadde çıkışı × aynı fiyat
  + "-İşçilik" fişleri). Esas adet: tamamlanan işte stoğa giren çift (fire farka yansır), devam edende
  planlanan (fark eksi görünebilir, ekranda yazılı). Hammadde bazında kart/gerçek miktar ve fark;
  reçete dışı malzeme etiketli. Varsayılan "Tamamlanan üretimler", "Devam edenler dahil" seçilebilir.
  Sonuç sütunları önde (dar ekranda Fark görünsün).
- Test: `birim-finans-ek.js` (hesaplar), `senaryo-finans-ek.js` (ekran; tarih 26.09.2026'ya sabit).

## STANDART — YENİ ÜRÜN FORMU VE ÜRÜN KARTI (26 Eylül, v1.472.0 — Claude Code oturumu)

Kullanıcı (Stok ▸ yeni hammadde "Silme Suyu", renk/beden seçmeden Matris Oluştur; tabloda
"STANDART" başlığı ve "Standart" satırı): "Standart beden renk olayını halletmiştik sanıyorum, hâlâ
önüme çıkıyor."

- v1.437'deki `olcuGoster` kuralı (yer tutucu yazılmaz, beden başlığı "Miktar") yalnız sipariş/fiş
  tablolarına uygulanmıştı. Şimdi: yeni ürün formu matris önizlemesi (152), ürün kartı "Renkler ve
  Bedenler" matrisi, kart içi fiş matrisi, mamul→hammadde rengi tablosu ve fiyat grubu tablosu (160).
  Kart özeti yer tutucuyu saymıyor ("1 renk × 1 beden" yerine "tek stok kalemi").
- v1.473.0: özet sıfır olan tarafı yazmıyor ("2 renk", "3 beden") — tam koşuda `satin-alma-sutunu` "2 renk × 0 beden" yakaladı, altını güncellendi.
- v1.474.0 (kullanıcı seçti: "renksiz tabloda Renk \ Beden başlığı da kalksın"): `matrisKoseBasligi(renkler, bedenler)` (012) — yeni ürün formu, ürün kartı matrisleri (160) ve üretim kartı çıkış matrisi (310, orada `olcuGoster` da eklendi). Form ve kart matrisleri `data-stok-matrisi` ile işaretli (test bunu kullanıyor).
- KAYIT DEĞİŞMEDİ: varyant yine `Standart/Standart`.
- **İş akışı (kullanıcı, 26 Eylül: "Evet birleştir"):** bundan sonra PR'ı Claude açıp testler temizse
  kendisi birleştiriyor (merge); sorun görürse kullanıcıya söylüyor.
- Test: yeni `senaryo-standart-form`.

## MALZEME TİPİNE GÖRE RENK (26 Eylül, v1.471.0 — Claude Code oturumu)

Kullanıcı (Stok ▸ yeni hammadde "Astar Taytüyü", Malzeme Tipi "Astar"): "Stok açarken malzeme tipini
seçip renk eklendiğinde renkler o malzeme tipine ait olsun. Ortak renk varsa onu da işaretlesin.
Mantık o şekilde idi, kontrol et yine."

**Bulunan:** yalnız "Yeni Renk" ile AÇILAN renk tipe bağlanıyordu (`yeniRenkKaydet(ad, "Hammadde",
malzemeTipi)`). Listeden SEÇİLEN genel (tipsiz) renk ürüne girip tipsiz kalıyordu; başka tipin rengi
(Deri'nin "Taba Deri"si) listede hiç çıkmıyordu, ortak kullanılamıyordu.

- `renkleriTipeBagla(adlar, malzemeTipi)` (100-app): seçilen renklere tipi EKLER (üyelik; hiçbir tip
  silinmez), tek `tanimlarKodluYaz`. Çağıranlar: `saveProduct` (152, yeni ürün) ve ürün kartında var
  olan renk ekleme (160, hammadde + malzeme tipi varsa).
- Yeni ürün formu (152) renk listesi sırası: bu tipin renkleri (birden çok tipi varsa ek "ortak: …"),
  genel renkler (ek "genel · Astar olur"), başka tiplerin renkleri (ek "Deri · ortak olur") — sonuncular
  kutu boşken GİZLİ, yazınca bulunur (`AramaliSecici` seçeneğine `ek` ve `yalnizAramada` eklendi).
  Seçili renk etiketinde kaydedince birden çok tipi olacaksa mor "ortak" rozeti (`data-ortak-renk`).
- Ürün kartı (160): hammaddede liste yine tipe göre dar; kutuya yazınca başka tipin renkleri de
  öneriye giriyor.
- **Karar:** genel (tipsiz) renk seçildiğinde de tipe bağlanıyor (kullanıcı: "renkler o malzeme tipine
  ait olsun"). Sonucu: o renk artık diğer tiplerin varsayılan listesinde değil, ama yazınca bulunuyor
  ve orada da seçilince o tipi de kazanıyor — renkler kullanıldıkça tiplerine oturuyor.
  `renkTipeUygunMu` başka yerde yalnız 160'ta kullanılıyor (orada da yazınca bulunuyor), reçete/fiş
  renk seçimleri tip süzmüyor — kayıp yok.
- Test: yeni `senaryo-malzeme-tipi-renk`.

## SİPARİŞ FORMU DÜZENİ VE RENK BAZLI AÇIKLAMA (26 Eylül, v1.470.0 — Claude Code oturumu)

Kullanıcı (sipariş düzenleme ekran görüntüsü): "Birim fiyatı, para tipini üst satıra al, gerekirse
yazıları ufalt. Asorti ve asorti seçiciyi tek satıra topla, kalemlere ekle'nin adını Ekle yap ve rengi
yeşil olsun, güzel bir ikon da olabilir. Barkod okutu da tıklayınca açılsın, kullanmayınca çok yer
kaplıyor. Eklerken açıklama satırda olsun, renk bazlı açıklama girebilelim, tek tek."

- **Üst satır:** Ürün / Renk / Birim Fiyat + para birimi eşit sütunlu ızgara yerine esnek satır
  (ürün ve renk `1.5 1 180px`, fiyat `0.8 1 140px`, kutu rengi `1 1 160px`). Etiket kısaldı
  ("Birim Fiyat", "tüm ölçüler için" ipucunda), fiyat kutusu ve para birimi küçük yazılı. Dar
  ekranda yine alt alta iner.
- **Asorti + açıklama + Ekle tek satır, matris altında tam genişlik.** `AsortiUygulaKontrolu`na
  `satirIci` (alt boşluk yok). Matris tablosu `width: auto` — tek başına kalınca genel tablo
  kuralıyla yayılıyordu.
- **"Ekle" düğmesi:** `EKLE_DUGMESI` (320), sabit yeşil #2F8F46 + beyaz yazı + `PackagePlus`
  ikonu (000'da içe aktarıldı). `data-kalemlere-ekle` korundu (testler).
- **Barkod paneli katlanır:** kapalıyken tek ince kesikli düğme (`data-barkod-paneli-ac`), açıkken
  etiketin sağında "Gizle" (`data-barkod-paneli-kapat`; testte ikonlar boş çizildiği için yazılı).
  Tercih cihazda `localStorage["siparis:barkodPaneli"]` — fuarda okutan açık bırakır.
- **Renk bazlı açıklama:** `kalem.aciklama` (boşsa alan yok). Formda `kAciklama`; "Ekle" o rengin
  bütün ölçülerine yazar; aynı satıra açıklamasız ikinci "Ekle" eskisini SİLMEZ (miktar artırmak
  için). Kalem listesinde renk hücresinin altında satır içi kutu (`data-form-kalem-aciklama`,
  `grupDegistir` ile satırın bütün ölçülerine); kilitli satırda salt okunur yazı. Sipariş kartında
  renk adının altında (`data-kart-kalem-aciklama`), sipariş çıktısında (`siparisCiktisiHTML`) renk
  hücresinde. Üretim fişine/planlamaya henüz taşınmıyor.
- Test: yeni `senaryo-siparis-form-duzen`.

## SİPARİŞTE RENK YAZARAK VE RESİMLİ (26 Eylül, v1.469.0 — Claude Code oturumu)

Kullanıcı (sipariş formu, telefonun kendi açılır listesi): "Stok renk resimleri tanımlı ise renk
içinde resim göstersin, renk eklerken de filtre olsun, yazdıkça daralan liste şeklinde."

- `AramaliMetin` (005) iki yeni prop aldı: `resimler` ({öneri: resim}) ve `disabled`. `resimler`
  verilince her önerinin solunda 34px resim (yoksa boş yer tutucu, hizalı kalsın), kutudaki değer
  bir öneriyle TAM eşleşince o resim kutunun içinde (`data-aramali-kutu-resim`). Diğer kullanımlar
  değişmedi (prop verilmezse eski görünüm).
- Sipariş formu Renk alanı `<select>` yerine `AramaliMetin` (`data-siparis-renk-arama`), resimler
  ürünün `renkResimleri`nden. Yazılan metin (`kRenkYazi`) ile geçerli seçim (`kRenk`) ayrı:
  yarım yazım seçimi boşaltır (ölçü matrisi kapanır, yanlış renge miktar girilmesin), listeden
  seçilince/kutudan çıkınca ilk eşleşene oturunca matris açılır. `kRenk` dışarıdan değişince
  (yeni renk oluşturma, ürün değişimi, düzenleme) yazı onu izliyor — `oncekiKRenk` ref'i kullanıcının
  yarım yazısını, seçim temizlendiğinde silmemek için.
- "+ Renk" panelinde pozisyon seçimleri (1./2./3. Renk) de `AramaliMetin` (`data-siparis-yeni-renk-poz`),
  etiket "Ad (ton kodu)", seçim kimlikle `yrPozisyonlar`da; yazı `yrPozisyonYazi`da. Eski
  "+ Yeni renk oluştur…" seçeneği yanındaki "+ Yeni" düğmesi oldu.
- Not: kutudaki yazı bir öneriyle tam eşleşirse liste bilerek süzülmüyor (açılır liste gibi seçimi
  değiştirmek kolay olsun) — ör. tohumda "Taba" varken "taba" yazınca bütün liste görünür.
- Test: yeni `senaryo-siparis-renk-resim`; `senaryo-siparis-duzenle` renk seçimini yazarak yapıyor.

## ESKİ SÜRÜM DOSYALARI TEMİZLİĞİ (26 Eylül, v1.468.0 — Claude Code oturumu)

**Kullanıcı:** "Şişmesin diye eski kayıtları siliyorum (main'de v1.440–1.446'yı elle sildi),
otomatik yapalım; son 3 kayıt hariç diğerleri silinsin."

- `yap.sh` sonu: `ls atolye-erp-v*.html | sort -V | head -n -3` → git'te kayıtlıysa `git rm`, değilse
  `rm`; yeni derlenen dosya asla silinmez. Silmeler commit'e kendiliğinden girer (sahnelenmiş).
- Neden güvenli: başlatıcı (index.html) ve uygulama (`surumeOtomatikGec`) yalnız `surum.json`daki
  son sürümü açıyor; eski dosyaya bağlı kod/test yok (surum-duyuru sahte adres kullanıyor).
  Silinen dosyalar git geçmişinde: `git checkout <commit> -- atolye-erp-vX.html`.
- CLAUDE.md dizin açıklaması güncellendi.

## RENK KODU, STANDART, SEÇİCİDE RESİM (26 Eylül, v1.467.0 — Claude Code oturumu)

**Kullanıcı (üç ekran görüntüsü):** "Renk kodunu otomatik veriyor, burada vermemiş; stok kartı
içerisinden açılan renk bu, tüm açılan renklere otomatik renk kodu versin. Standart'ı kaldırmıştık,
burada yine çıktı. Siparişte ürün girerken resimde göstersin."

- **Renk kodu (barkod `barkodKodu`, ton kodu `kod` değil):** `saveTanimlar` `kodlariAta` ile kod
  veriyordu ama App'teki kısa yollar (`yeniRenkKaydet`, malzeme/mamul tipi, `yeniOlcuKaydet`, özel kod
  alanı, `kombinasyonOlusturGlobal`, `asortiOlustur`…) tanımları doğrudan `tekilYaz` ile yazıyordu.
  Hepsi `tanimlarKodluYaz(next)` yardımcısından geçiyor (kodlariAta → setTanimlar → yazım; bağımlılık
  dizilerine eklendi, bayat denetimi istedi). Eski kodsuz kayıtlar: 090-yukleme buluttan okuyunca bir
  kez `kodlariAta([], t)` (renk/ölçü/asorti), sessiz. Çevrimdışı açılışta yapılmıyor (sayaç bayat
  olabilir). Kalan doğrudan yazımlar: açılış göçü damgası, yükleme, sıfırlama, cari kodu (kod
  gerektirmeyen ya da kendi kodunu atan yollar).
- **Standart:** ürüne önce renk eklenince beden "Standart" yer tutucusu doğuyor, sonra gerçek beden
  eklenince sütun kalıyordu (tersi: renk satırı). `standartYerTutucuyuKaldir(urun, eksen)` (152-stok)
  `addRenkToProduct`/`bedeniUrunEkle` sonunda: başka değer varsa ve Standart'ın silme engeli yoksa
  (`renkBedenSilmeEngelleri` + eksende boş dize taşıyan hareket) Standart varyantları kaldırılır.
  Üzerinde iş olan Standart kalır (kullanıcı çöp ikonuyla karar verir). Var olan ürünlerde kalmış
  boş Standart sütunu çöp ikonuyla ya da bir sonraki beden eklemede kalkar.
- **Ürün seçicide resim** (`AramaliUrunSecici`, sipariş/reçete/fiş ortak): kapak resmi → ilk renk
  resmi → kategori ikonu; 36 px, `data-urun-secici-resim`.
- Test: `senaryo-renk-kodu-standart.js`.

## MODEL RENGİ YAZARAK SEÇİM (26 Eylül, v1.466.0 — Claude Code oturumu)

**Kullanıcı (ürün kartı ekran görüntüsü, Kaç renkli? 3 · 1./2./3. Renk "Seçin…"):** "Buradaki renkleri
de arama ile liste daralsın."

- Üç `<select>` → `AramaliMetin` + `yalnizListeden` (sezon kutusuyla aynı kalıp):
  ürün kartı çok renkli yeni Model Rengi pozisyonları (`data-model-rengi-poz`, tanımlı tekli renkler,
  kombinasyon etiketleri hariç), ürün kartı "Renk Ekle" tanımlı renk/model rengi seçimi
  (`data-kart-renk-arama`), yeni ürün formundaki pozisyonlar (152-stok, `mamulRenkTanimli`).
  Yeni üründe model rengi seçimi zaten `AramaliSecici` idi (v1.452).
- Yarım yazım kutudan çıkınca ilk eşleşene oturur, eşleşmeyen temizlenir; "Ekle" / "Model Rengi
  Olarak Ekle" yalnız LİSTEDEKİ değerlerle açık (yazarken kutuda yarım metin olabildiği için
  `disabled` artık "dolu mu" değil "listede mi" diye bakıyor, tıklamada da kontrol).
- Test: `senaryo-model-rengi-arama.js`; `senaryo-renk-gocu.js` kart seçeneklerini kutuya odaklanıp
  öneri listesinden okuyor (altın AYNI).

## ÜRETİMDEKİ MAL VE İŞÇİLİK — FİNANS RAPORU (26 Eylül, v1.465.0 — Claude Code oturumu)

**Kullanıcı:** "Ödenen ve ödenmeyen işçilik olarak ayırmak lazım. Örnek: mamulün yarısı üretildi ve
stok değeri 1000 TL oldu; toplam değeri 1500 olması gerekirken üretimde o kadar hammadde ve işçilik
üretti. Bunu 1000 TL olarak hesaplar. Gerçekleşen o anki durumu göstermeli. Şu an için olan stok,
yarı mamul, mamul tüm değerler göstersin." (Önce "işçilik nasıl olacak" soruldu; standart/tam
maliyet önerisi yerine GERÇEKLEŞEN maliyet istendi.)

- Üretim veri modeli (keşif): hammadde TESLİMDE, proses başına, reçeteyle düşülüyor (stok hareketi
  `uretimId`, `kaynak: "Üretim"`, fiyatsız); işçilik teslimde personele `…-İşçilik` cari fişi
  (`uretimId`, yön Alacak = biz borçluyuz); ödeme ayrı Ödeme hareketi; mamul girişi son proseste
  `…-Giriş` (fiyatsız). DİKKAT: DEVAM-NOTU 3501 "çıkış iş verilirken" diyor, kod teslimde düşüyor
  (ara proses istisnası: sonraki ana prosesin ilk atamasında bütün reçete).
- `finansUretimDegerleri({uretim, stok, cariler, kurlar, tarih, araProsesler})`: açık her üretim için
  hammadde = üretime bağlı stok hareketlerinin NET çıkışı × `hammaddeBirimFiyati` (stok değerlemesiyle
  aynı fiyat); işçilik = üretime bağlı `-İşçilik` fişleri; aktarılan = bu üretimden stoğa giren mamul
  çiftleri × mamul birim maliyeti (hammadde + işçilik); DEĞER = max(0, hammadde + işçilik − aktarılan).
  Tamamlanan (bugün), bütün çiftleri stoğa girmiş ya da değeri 0 olan iş listelenmez.
- **Ödenen / ödenmemiş işçilik:** personel carisinin borç yaşlandırması (`cariYaslandirma`, FIFO) →
  açık kalan işçilik fişleri ödenmemiş. Ödenmemiş kısım zaten "Personel borcu" (Ticari Borçlar);
  üretim satırında bilgi olarak, özetin altında toplam satırı (`data-finans-uretim-ozet`).
- **Mamul değerleme:** "Hammadde + işçilik" (varsayılan, `maliyet`; işçilik = `prosesUcretleri` +
  ara proses ücretleri, `finansIscilikBirim`), "Yalnız hammadde" (`hammadde`, v1.463 davranışı),
  satış, alış. Genel gider stok değerine GİRMEZ (dönem gideri).
- Yeni alanlar: Hammadde payı, İşçilik payı, İşçilik ödenen, İşçilik ödenmemiş, Mamule aktarılan.
  "Stok Değeri" şablonuna eklendi. Üretim satırı: kalem "Üretimdeki mal (yarı mamul)", miktar = kalan
  çift, ayrıntı "4/10 çift stoğa girdi · aşama".
- Bilinen yaklaşıklık: aktarılan, standart birim maliyetle (kart ücreti + reçete); gerçekleşen ile
  standart farkı üretim açıkken yarı mamulde kalır, üretim bitince görünmez (fark raporu yok).
- Test: `birim-finans-rapor.js` (kullanıcının örneği: yalnız kesimde 1.100, 4/10 çift çıkınca 750 =
  1.080 + 350 − 680; ödenen 60 / ödenmemiş 290), `senaryo-finans-uretim.js`.

## ALACAK / BORÇ YAŞLANDIRMA (26 Eylül, v1.464.0 — Claude Code oturumu)

**Kullanıcı:** "Alacak yaşlandırma yapalım." (v1.463 sonrası önerilerden 1. madde)

- `cariYaslandirma(cari, {defter, tarih, varsayilanVade})` (248-finans-rapor): PB başına; bakiye
  yönündeki hareketler açık kalem adayı, karşı yöndeki TOPLAM en eski kalemden başlayarak düşülür
  (**FIFO**). Kalan kalemler: `{tarih, vade, fisNo, kalan, gun, kismen}`; yaş = rapor günü − vade
  (vade yoksa tarih + `varsayilanVade`); vade ileride → "Vadesi gelmemiş". Dilimler
  `YAS_DILIMLERI`: vadesi gelmemiş / 0-30 / 31-60 / 61-90 / 91-180 / 180+. Ayrıca ağırlıklı
  ortalama gecikme, en eski kalem günü, vadesi geçen tutar. − bakiyede aynı yöntem → BORÇ
  yaşlandırması.
- Satış fişlerinde `vade` çoğunlukla boş (yalnız çek/senette dolu) → ekranda "Varsayılan vade
  (gün)" kutusu (varsayılan 0 = fiş tarihinden yaşlanır).
- Finans Raporu'na **Görünüm** anahtarı: Varlık Özeti | Yaşlandırma. Yaşlandırmada Alacaklar/
  Borçlar, dilim çubuğu (TL, kurla), cari başına tablo (PB başına satır, TL karşılığına göre
  sıralı), satıra dokununca açık fişler (kısmen kapanan "… tutarın kalanı"), PB toplam satırları,
  Excel (`raporExcelAktar`; açık kalem satırları `no-print`, girmez), Yazdır. "Yan yana" seçiliyse
  Genel ve Resmi için iki tablo. Defter/tarih seçimleri ortak.
- Cari satırlarına dilim alanları eklendi (`yas…`, `vadesiGecen`, `ortalamaGecikme`, `enEskiGun`);
  hazır şablonlar "Alacak Yaşlandırma", "Borç Yaşlandırma" — kendi süzgeci/Excel'i için.
- Grid taşması: geniş tablo grid öğesini büyütüp sayfayı yana kaydırıyordu → kaplara
  `gridTemplateColumns: "minmax(0, 1fr)"`.
- Test: `birim-finans-rapor.js` (FIFO, kısmi kapanış, dilimler, varsayılan vade, borç yönü, rapor
  satırı), `senaryo-finans-yaslandirma.js` (tarihler bugüne göreli). `senaryo-cek-yazdir.js`
  düzeltildi: ciro fiş no'su bugünün tarihini taşıdığı için altın her gün değişiyordu → yalnız önek.

## FİNANS RAPORU — VARLIK / YÜKÜMLÜLÜK (25 Eylül, v1.463.0 — Claude Code oturumu)

**Kullanıcı:** "Finans raporu ekleyelim. Birden fazla rapor, sipariş raporu gibi kaydederiz. Varlık
raporu örnek: alacaklar, borçlar, hammadde stok mali değeri, mamul stok değeri, portföydeki çekler,
yazılan çekler… çok detaylı. 2 defter için ayrı filtreleyerek rapor şablonu. Büyük uygulamalardan
esinlen."

- Menü: Finans ▸ **Finans Raporu** (sekme `finansrapor`, yetki `muhasebe`). Dosya `248-finans-rapor`.
- **Satır üretici** `finansRaporSatirlari({cariler, muhasebe, stok, kurlar, defter, tarih,
  mamulDegerleme})`: her para kalemi bir satır — kasa/banka hesabı, carinin PB başına bakiyesi
  (+ → Ticari Alacaklar, − → Ticari Borçlar; kalem cari tipinden "Müşteri alacağı" vb.), çek
  (alınan: Portföydeki / Bankada tahsildeki / Karşılıksız (şüpheli) = Varlık; ciro edilmiş ve
  vadesi gelmemiş = **Bilgi** (nazım/risk, net varlığa girmez); şahsi çek Portföyde/Tahsilde =
  Yükümlülük "Ödenecek şahsi çek"), stok varyantı (Hammadde/Yarı Mamul: `hammaddeBirimFiyati`;
  Mamul: `finansMamulBirimDegeri` — reçete hammadde maliyeti [işçilik/genel gider YOK] ya da satış
  ya da kart alış fiyatı). Hizmet stok dışı.
- Alanlar: Taraf, Grup, Kalem, Ad, Ayrıntı, Defter, P.B., Tutar, TL Karşılığı, **Net Etki (TL)**
  (varlık +, yükümlülük −, bilgi 0 — hangi süzgeçle toplanırsa toplansın net varlığı verir), Miktar,
  Birim Değer, Vade, Vade Ayı, Vade Durumu (geçmiş/0-30/31-60/61-90/90+), Son Hareket, Not.
- **Defter:** cari/kasa hareketi kendi defteri (`defterKapsar`, Muhasebe = ikisine de); çek giriş
  hareketinin defteri (yoksa Genel); **stok deftersiz** (stok hareketi defter taşımıyor) — her
  defterde aynı, ekranda yazılı. "Genel · Resmi yan yana": iki defterin satırları + özet iki sütun
  ve fark.
- **Tarih itibarıyla:** hareket tarihi ≤ seçilen gün; çek durumu geçmiş satırları oynatılarak
  (geri alma satırları da `yeniDurum` taşıdığı için doğru). Bugün/boşsa çekin kayıtlı durumu.
- **Kur:** `muhasebe.kurlar`; kuru olmayan birim TL karşılığı null, net 0, notta "kuru yok",
  özetin altında uyarı — sessizce 1:1 sayılmıyor. Fiyatı/maliyeti olmayan stok 0 + uyarı.
- **Üstte Varlık Özeti** (`finansOzet`): grup toplamları, toplam varlık/yükümlülük, NET VARLIK;
  yazdır düğmesi.
- **Kayıtlı raporlar:** sipariş raporunun motoru (`RaporSekmesi`, modül "finans"). Hazır şablonlar
  kodda (`FINANS_HAZIR_RAPORLAR`, sabit kimlik): Varlık Raporu (yalnız Net Etki — TL karşılığı
  toplamı varlıkla borcu toplardı), Alacaklar ve Borçlar, Çekler ve Vadeler, Stok Değeri, Döviz
  Pozisyonu, Nakit Takvimi (çek vadeleri, vade ayına göre). Kaydederken DOKUNULMAMIŞ hazırlar
  veriye yazılmıyor (nesne kimliğiyle süzülüyor); değiştirilip kaydedilen hazır aynı kimlikle
  yazılır ve geçerli olur; silinen hazır şablon yeniden görünür.
- Sonraki adım fikirleri (yapılmadı): alacak yaşlandırma (FIFO ile fatura bazlı), işçilik/genel
  giderli mamul maliyeti, nakit akış projeksiyonuna açık sipariş vadeleri, dönem karşılaştırma
  (iki tarih yan yana).
- Test: `birim-finans-rapor.js` (defter, tarih, çek durumları, stok değeri, kur yok, özet),
  `senaryo-finans-rapor.js`; `menu-gruplari`/`finans-menu` altınları "Finans Raporu" ile.

## ÇEK: FİŞİ KAYIP İŞLEM — SON İŞLEMİ GERİ AL (25 Eylül, v1.462.0 — Claude Code oturumu)

**Kullanıcı (ekran görüntüsü, "Kontrol"):** ciro edilmiş çek (06.09, Temizleme Cevval) → "Son
İşlemi Geri Al" → "Bu işlemin cari hareketi bulunamadı — geri alınamadı"; silmek de reddediliyor
("portföyden çıkmış çek silinemez"). Çek KİLİTLİ kalmıştı.

- Teşhis: `gecmis[].hareketId` bulutta korunan bir alan (cari_hareketleri.id); Fişler/ekstre
  silme yolları çeki `cekIslemGeriAl` ile döndürüyor (senaryolarla ölçülü). Yani fiş bir yoldan
  carilerde hiç olmamış: büyük olasılıkla eski bir kayıtta cari yazması buluta ulaşmamış ya da
  başka cihazın eski listesi üzerine yazmış ("Buluta gönderilemeyen kayıt" şeridi açıktı). Kullanıcı
  verisine bakılmadı; kesin sebep bilinmiyor.
- Çözüm `cekIslemHareketiBul(cek, satir, cariler, hareketId)`: "bulundu" → normal yol; "benzer"
  (aynı cari, Çek, beklenen işlem tipi, tutar+birim, açıklamada çek no — TEK aday) → o kopya fiş
  silinir ve çek `cekIslemGeriAl` ile AYRICA döner (kimlik tutmadığı için fiş silme çeki
  tanımaz); "yok" → cariye dokunulmaz, yalnız çek döner, mesaj "ekstreyi kontrol edin" der;
  "belirsiz" (birden çok aday) → hiçbir şey yapılmaz, fiş numaraları söylenir.
- Test: `senaryo-cek-kayip-fis.js` (üç durum).

## ÇEK ÖZETİ — SATIRA DOKUNUNCA (25 Eylül, v1.461.0 — Claude Code oturumu)

**Kullanıcı:** "Çekin üzerine tıklayınca çeki kimden alıp kime ciro ettiğimiz veya son durumu ile
alakalı açılım yapsın."

- Satıra (boş alan/yazı) dokunmak özeti açıp kapatıyor; düğme, görsel, input ve panelin içi
  (`[data-cek-ozet]`) hariç (`closest` süzgeci). "Geçmiş" düğmesi "Ayrıntı · Geçmiş (n)" oldu ve
  her çekte görünüyor (işlemsiz çekte de kimden/vade bilgisi anlamlı).
- Kural saf fonksiyonda: `cekOzeti(cek, { cariler, bugun })` (200-cari-sabit) →
  `kimden` (giriş carisi, tarih/fiş giriş hareketinden, kur çevrimi varsa cariye işlenen),
  `nerede` (şimdiki durumu doğuran etkin satırdan cümle + tarih + fiş + karşı tarafa işlenen),
  `vade` (yalnız Portföyde/Tahsilde; kalan/geçen gün), `adimlar` (giriş + geçmiş; geri alınan
  satır `iptal` → üstü çizili, geri alma satırı soluk).
- Cümlelerde karşı taraf ok ile: "Ciro edildi → Tedarikçi A" — adın sonuna ek ("'ya/'e")
  addan güvenle çıkarılamıyor.
- Her yolculuk adımında yazdır ikonu (v1.460 düğme kimlikleri korundu).
- Test: `senaryo-cek-ozet.js` (vade bugüne göreli kuruluyor ki altın her gün aynı kalsın);
  `senaryo-cek-yazdir.js` "Geçmiş" yerine `[data-cek-ayrinti]`.

## ÇEK BORDROSU YAZDIR (25 Eylül, v1.460.0 — Claude Code oturumu)

**Kullanıcı:** "Çek işlemlerinde yazdır ekranı olsun. Çek girişi, ciro vs. çıktı alalım."

- `CekYazdir` (275-yazdir), `CariEkstre` kalıbında pencere: Yazdır (`indirYazdirilabilirHTML`),
  PaylasSeridi (PDF/WhatsApp/e-posta), küçült, kapat. Pencere tipi `cek`, kimlik
  `cekId` ya da `cekId|satirId`; veri YALNIZ kimlikler — çek her çizimde güncel `muhasebe`den
  okunuyor (bayat pencere dersi). Yenilemede geri gelmiyor (CANLI listesinde değil, ekstre gibi).
- Belge adı işlemden (`CEK_BELGE_ADLARI`): satır yoksa "Çek Giriş Bordrosu" / "Şahsi Çek Çıkış
  Bordrosu"; Ciro/İade/Tahsile Verme bordrosu, Tahsil Makbuzu, Karşılıksız Tutanağı; geri alma
  satırı "Çek İşlem İptali — …". Belge no = işlemin cari fişi (giriş THS/ODM, ciro ODM…).
- İçerik: firma başlığı, karşı taraf, çeki veren, çek tablosu (no, banka/şube, keşideci, vade,
  tutar), **tutar yazıyla** (`tutarYaziyla`/`sayiYaziyla`, 200-cari-sabit; "bir yüz/bir bin"
  denmez, binlerde 1 başka rakamla söylenir — `birim-tutar-yaziyla.js`), karşı tarafa başka
  birimde işlendiyse o tutar, TL karşılığı, not, çek fotoğrafları, Teslim Eden/Alan imza alanları
  (giriş, ciro, iade, tahsile verme; tahsil/karşılıksız/iptal el değiştirme değil → imza yok).
- Düğmeler: çek satırında "Yazdır" (son etkin işlemin belgesi, işlem yoksa giriş); Geçmiş
  panelinde "Giriş" satırı ve her işlem satırında yazdır ikonu.
- Test: `senaryo-cek-yazdir.js` (giriş bordrosu, ciro bordrosu + fiş no + $ işlenen, geri alma
  sonrası geçmiş düğmeleri ve iptal belgesi).

## ÇEKTE CARİ BİRİMİ VE SON İŞLEMİ GERİ AL (25 Eylül, v1.459.0 — Claude Code oturumu)

**Kullanıcı:** "Çek girişinde ve ciroda kur çevirici koyalım. TL çek alınıp USD hesabına
izlenebilir. Ciro edilen çek geri iade alınabilir; bunun için son işlemi sil olsun — ciro edilen
çekte veya bankaya tahsil için."

- **İlke:** çek KENDİ biriminde (belgede ne yazıyorsa), cari hareketi CARİNİN biriminde. Karşı
  taraf alanları (`hesapAd`/`hesapPB`/`hesapTutar`) ciro ve kasa hareketlerindekiyle aynı —
  ekstre "Çek No … 42.000 ₺" gösteriyor. İade ters hareketi zaten GİRİŞİN aynası (cari birimi).
- **Çek & Senet > Yeni Çek:** cari seçilince "Cari hesabı" (varsayılan carinin `paraBirimi`),
  farklıysa "Cariye işlenecek" + Kur (çift yönlü). `cekEkleVeIsle` hareketi `cariTutar/cariPB`
  ile yazıyor. TL cariye döviz çekte ayrı "TL Karşılığı" kutusu gizli: cariye işlenen TL o.
  DİKKAT (yakalanan hata): kutu boşken güncel kurla ÖNERİLEN tutar görünüyor; dokunmadan
  kaydedilirse kaydet önerilen değeri kullanıyor (önce `parseFloat("")` → sessiz ret).
- **Cari kartı çek girişi:** Tutar carinin hesabına işlenen; çek kutusunda "Çek para birimi",
  farklıysa "Çek tutarı" + Kur (`cekCevrim`). Çek kaydı çekin tutarı/biriminde, `cariTutar/cariPB`
  bilgi olarak. `cekCevrim` `cariPB` TANIMINDAN SONRA olmalı (TDZ — önce kartı çökertti).
- **Ciro:** kur çevirici zaten vardı ama birim çekin biriminde kalıyordu; alıcı cari seçilince
  artık o carinin birimi + kurla çevrilmiş tutar geliyor.
- **Son İşlemi Geri Al** (çek satırında, iki dokunuşlu): kural `cekSonIslemi` (200-cari-sabit).
  Ciro/iade → bağlı cari fişi App'teki fiş silme kapısından (`onCekCariHareketSil` →
  `removeHareketEverywhere`, çek `cekIslemGeriAl` ile döner); tahsil → bağlı kasa/banka hareketi
  `hareketSil` ile (yetki/onay orada); tahsile verme ve karşılıksız → kayıt doğurmadığı için
  yalnız durum (`cekDurumGeriAl`, `CEK_DURUM_GERI_ALMA`; tahsil bankası temizlenir). İKİNCİ bir
  geri alma mantığı YAZILMADI. Ciro/iade/durum geri alması `muhasebe` silme yetkisi istiyor.
  Kilit mesajı: Tahsilde/Karşılıksız çekin giriş hareketi silinmek istenirse "Son İşlemi Geri Al".
- Test: yeni `senaryo-cek-kur-geri-al.js` (giriş, ciro, ciro/tahsile/tahsil geri alma, cari kartı).

## KASA & BANKA / ÇEK & SENET / CARİ PASİFE AL (25 Eylül, v1.458.0 — Claude Code oturumu)

**Kullanıcı:** "Muhasebe olan adı Kasa & Banka olarak değiştirelim. Finans altına Çek & Senet
ekleyelim." · "Cari pasife alma olsun."

- Finans ▾: Cari, **Kasa & Banka** (eski Muhasebe), **Çek & Senet** (yeni), Gelir / Gider, Fişler.
- Mamul Stok deseni: TEK `MuhasebeModule` örneği iki sekmede (`tab === "muhasebe" || "cekler"`),
  `kapsam` = `muhasebeKapsamRef` ("kasabanka" / "cek"). Kasa & Banka'da Çek sekmesi yok (seçim
  "cek" kalmışsa Kasa gösterilir), Çek & Senet'te sekme şeridi yok. Varsayılan `kapsam="genel"`
  eski davranış. Sekme anahtarı `muhasebe` DEĞİŞMEDİ (yetki anahtarı, kayıtlı arayüz durumu,
  `muhasebe:data` tablosu) — yalnız görünen ad. "Muhasebe" DEFTER adı (Genel/Resmi/Muhasebe) ve
  "Muhasebe" KULLANICI ROLÜ ayrı şeyler, dokunulmadı.
- Görünen metinler: çek geri alma mesajı "Kasa & Banka > Kasa > …"; carikart "Kasa & Banka
  ekranından"; kur ipuçları "Muhasebe'deki kur" yerine üst şerit (kur zaten orada).
- **Cari pasife alma zaten vardı** (başlıkta yazısız arşiv ikonu; pasifler "Pasifler" sekmesinde,
  seçim listelerinden düşüyor) ama kullanıcı bulamadı. Kart altına, Ekstre Yazdır'ın yanına
  yazılı `PasifButonu` ("Pasife Al / Aktife Al") eklendi; ikisi aynı `pasifDegistir` yolundan,
  bildirimle ("… Pasifler sekmesinden geri alınabilir").
- `yap.sh` koruması genişledi: çıktı dosyası HEAD'de commit'liyse ve `src/` HEAD'den farklıysa
  DUR (aynı dalda ikinci iş sürüm artırılmadan derlenip commit'li v1.457'nin üstüne yazmıştı;
  git'ten geri alındı).
- Testler: "Muhasebe"ye giden senaryolar "Kasa & Banka"/"Çek & Senet"e çevrildi (altınlar AYNI);
  `menu-gruplari` altını bilerek güncellendi; yeni `senaryo-finans-menu.js`.

## SEZON VE YIL YAZARAK SEÇİM (25 Eylül, v1.457.0 — Claude Code oturumu)

**Kullanıcı:** "Mamul stokta sezon, yıl seçmeli olsun, özel kodlardaki gibi."

- Ürün formunda (mamul) Sezon `<select>`'ti, Yıl düz sayı kutusuydu → ikisi de `AramaliMetin`.
- `AramaliMetin`'e iki seçenek: `yalnizListeden` — kutudan çıkınca değer listede yoksa ilk
  eşleşene oturur, eşleşen yoksa temizlenir (sezon özel kod KAPSAM EKSENİ; serbest yazım hiçbir
  kapsamla eşleşmezdi). `sayisal` — yalnız rakam, telefonda sayı klavyesi. Yıl 4 haneyle sınırlı.
- Yıl önerileri: diğer ürünlerde girilmiş yıllar + bu yıl + sonraki yıl.
- Genel davranış değişikliği: kutudaki değer bir önerinin TAM kendisiyse liste süzülmüyor, diğer
  seçenekler görünüyor (açılır liste gibi; özel kod alanlarında da geçerli).
- Test: `senaryo-mamul-stok.js` → `sezonYil` bölümü.

## UYGULAMA SİMGESİ: ND LOGOSU (25 Eylül, v1.456.0 — Claude Code oturumu)

**Kullanıcı:** (bej, kabartmalı "ND" logosu görseli) "Uygulama simgesi bu olsun."

- `ikon-192.png`, `ikon-512.png` (logo kenarın %84'ü), `ikon-maskeli-512.png` (%62 — Android
  maskesi daire/yuvarlak kare keser, güvenli alan ortadaki ~%80), yeni `ikon-64.png` (sekme simgesi)
  ve `ikon-apple-180.png` (iOS ana ekranı). Hepsi BEYAZ zemin: logo açık bej, gönderilen görsel de
  beyaz zeminliydi; saydam bırakılsa iOS siyaha boyuyor.
- Üretim: ortamda görüntü aracı yok (PIL/ImageMagick yok); Chromium canvas ile logo kutusu
  (beyaz olmayan piksellerin sınırı) bulunup ortalanarak çizildi. Kaynak görsel depoda değil;
  yeniden üretmek gerekirse aynı yöntem.
- `paketle.js` ve `index.html` başlığına `rel="icon"` (önceden favicon hiç yoktu) ve 180 px
  `apple-touch-icon` eklendi. `manifest.json` `background_color` #FFFFFF (açılış ekranı simgeyle
  aynı zemin).
- Kurulu uygulamalarda simge hemen değişmeyebilir: Android/Chrome manifesti birkaç gün içinde
  yeniden okur; iOS'ta kısayolu silip yeniden eklemek gerekir.

## MAMUL STOK AYRI (25 Eylül, v1.455.0 — Claude Code oturumu)

**Kullanıcı:** "Stokta mamul stoğunu ayıralım; sekme şeklinde değil, Depo'nun alt sekmesi olsun."
Seçenek soruldu → "Üst menüde Depo altında" seçildi.

- Depo ▾ artık: **Stok** (Hammadde / Yarı Mamul / Hizmet), **Mamul Stok** (yalnız mamul), Depo, Paketleme.
  Stok listesindeki "Mamul" kategori sekmesi kalktı; Mamul Stok'ta kategori sekmesi hiç yok.
- **Tek bileşen, iki kapsam:** `StokModule({ kapsam })` — `"hammadde"` / `"mamul"` / `"genel"`.
  Ayrı bir modül kopyası AÇILMADI: kart, reçete, pencere, matris hepsi aynı kod. App'te tek
  `StokModule` örneği iki sekmede görünür (`tab === "stok" || tab === "mamulstok"`); kapsam
  `stokKapsamRef` ile son görünen sekmeden gelir (diğer sekmeye geçince gizli kalan örnek
  kapsamını korusun, açık kart/pencere durumu kaybolmasın diye örnek tek).
- Kapsam değişince `filterCat` sıfırlanır (mamulde "Mamul", değilse "Tümü"); yeni ürünün kategorisi
  seçili sekmeden → Mamul Stok'tan eklenen ürün mamul.
- **Ürüne gidiş doğru sekmeye:** şeritteki "Ürün: X" penceresi ve `stokHedefUrunId` (başka
  modülden ürüne atlama) ürünün kategorisine göre `stok` ya da `mamulstok` sekmesini seçer —
  aksi hâlde mamul kartı hammadde listesinin üstünde açılıyordu.
- Testler: Stok'tan "Bot" (mamul) açan ~20 senaryo `modulAc(sayfa, "Mamul Stok")`'a çevrildi
  (altınları AYNI kaldı); `katalog` hammadde bölümünde Stok'a geçiyor; `pencere-sekmeleri` Deri'yi
  Stok'tan, Bot'u Mamul Stok'tan açıp şeritten sekmeler arası dönüşü ölçüyor; `menu-gruplari`
  altını "Mamul Stok" ile güncellendi (bilerek). Yeni: `senaryo-mamul-stok.js`.

## OTOMATİK SÜRÜM GEÇİŞİ (25 Eylül, v1.447.0 — Claude Code oturumu)

**Kullanıcı:** (v1.446 birleştirildikten sonra) "Hâlâ 443." → "Yeni sürüm haber versin ve ona geçiş
yapsın kullanıcılar. Uygulama olarak girdikleri için eski sürüm çıkabilir veya otomatik geçsin."

**Sebep:** yayın artık GitHub PR birleştirmesiyle (`main` → Pages). Başlatıcı `surum.json`'u okuyup
doğru sürüme gidiyordu, ama AÇIK uygulamanın "yeni sürüm" şeridi yalnız buluttaki `surum` kaydına
bakıyordu ve o kaydı yalnız uygulama içi "GitHub'a yayınla" güncelliyordu → şerit hiç çıkmadı.
Telefonda "uygulama" olarak açılan ekran arka plandan dönünce yeniden yüklenmiyor; eski sürüm
bellekte kalıyor.

**Çözüm (030-supabase + 100-app):** `guncelSurumuOku()` = `surum.json` (uygulamanın kendi
klasöründen, yalnız http(s), `no-store`) + bulut kaydı; hangisi yeniyse. `surumeOtomatikGec(v, SURUM)`
`location.replace(url)` yapar. Ne zaman:
- AÇILIŞTA → sormadan geçiş (kaybolacak iş yok).
- `visibilitychange` ile geri gelince, **10 dk'dan uzun** gizli kaldıysa → geçiş. Kısa süreli
  geçişte (WhatsApp'a bakıp dönmek) geçiş YOK — yarım form kaybolurdu; şerit çıkar.
- Çalışırken (10 dk'da bir) → yalnız şerit.
**DÖNGÜ KORUMASI:** aynı sürüme sekme başına bir kez (`sessionStorage` `surumGecisi:<sürüm>`);
yazılamıyorsa hiç geçilmez. Yerel veri ve bekleyen yazmalar aynı adresin deposunda, yeni sürüm aynen görür.
`surum.json`'a `not` alanı eklendi (şeritte görünür). Test kancası: `window.__surumGeriDonusEsigiMs`.

**GEÇİŞ DÖNEMİ:** v1.446 ve öncesinde bu kod yok. O sürümde açık kalan ekranlar v1.447'ye ancak
başlatıcıdan (ana adres / ana ekran kısayolu) yeniden açılınca geçer; v1.447'den sonrası otomatik.

**Doğrulama:** `senaryo-surum-otomatik` (YENİ; `ortak.js`'e `adres` seçeneği — uygulama http'den
açılıyor, `surum.json` rota ile): açılışta geçiş; döngü yok (ikinci açılışta şerit 9.9.9); eski sürümde
ne geçiş ne şerit; kısa arka plan → şerit, uzun → geçiş. `surum-duyuru` (bulut kaydı yolu) AYNI.

## SİPARİŞ DÜZENLEME FORMDA (25 Eylül, v1.446.0 — Claude Code oturumu)

**Kullanıcı:** "Siparişte düzenleme düzgün çalışmıyor, düzenle deyince arkada yeni sipariş girişi
gibi çalışıyor ve üstteki ekranı kapatman gerekiyor. Yeni sipariş gibi hareket edecek ama altta
girilenler gösterecek ve girilenler de düzenlenebilir olacak: renk, adet, stok gibi değiştirilebilir
(planlananlar değişemez)."

**Sorun:** iki ayrı yol vardı. ✎ kartın içinde başlık kutuları + satır içi miktar/fiyat açıyordu;
"+" ve düzenlemedeki "Ürün Ekle" ise sipariş formunu modülün normal yerinde, yani tam ekran kartın
(zIndex 100) ARKASINDA açıyordu (`ekleHedefiId` akışı).

**Yeni akış (tek yol):** kartta ✎ → `siparisDuzenlemeyiBaslat(id)` formu siparişin başlığı
(cari, tarihler, müşteri kodu, not, defter, kayıt para birimi) ve KALEMLERİN KOPYASIYLA doldurur.
Form düzenlemede `position: fixed; zIndex: 110` ile kartın önünde, kart şeridiyle aynı renkte
"… siparişi düzenleniyor" başlığıyla çiziliyor (`data-siparis-duzenleme`). Düğme "SAT-… Değişikliklerini
Kaydet" (`siparisDuzenlemeKaydet`); kaydedince/vazgeçince form kapanıyor, kart güncel hâliyle duruyor.
Tip seçici gizli; teslimat yapılmışsa cari seçici kilitli ve sebebi yanında.

**Kalem tablosu (form altı):** satır = ürün + renk + KİLİT SEBEBİ. Kilitli satırlar (planlanmış
ya da karşılanan > 0 — `kalemKilitSebebi`, kural DEĞİŞMEDİ) salt okunur, 🔒 "planlandı"/"teslim
alındı" etiketli. Serbest satırlarda: ÜRÜN seçici (`grupUrunDegistir` — renk yeni üründe yoksa
boşalır, kaydetmede "renk seçin" reddi; ambalaj tercihi sıfırlanır), RENK seçici (`grupDegistir`),
miktar, fiyat, sil. Değişiklik sonrası aynı ürün+renk+ölçüye düşen serbest kalemler birleşiyor.
Kayıtlı ama üründen sonradan kalkmış renk "(listede yok)" olarak gösteriliyor ve kaydı ENGELLEMİYOR
(hata kalıbı 2). Yeni ürün aynı formun "Kalem Ekle" alanından; `kalemEkle`/barkod birleştirmesi
kilitli kaleme miktar EKLEMİYOR (yeni satır açıyor).

**Kaydetme güvencesi:** kilitli kalem ASIL kayıttan alınıyor; formdan düşmüşse geri ekleniyor —
kilitli kalem bu yoldan değişemez/silinemez. `kalemSil`/`kalemDuzenle` de kilitliyi reddediyor.
"Tamamlandı"/"İptal" siparişe YENİ kalem eklenemiyor (eski `sipariseKalemEklemeyeBasla` kuralı, artık kaydetmede).

**Kaldırılanlar (ölü kod):** kartta `baslikDuzenle`/`baslikForm`, satır içi miktar/fiyat kutuları ve
"+" düğmesi; modülde `ekleHedefiId`, `sipariseKalemEklemeyeBasla`, `hedefSipariseEkle`,
`siparisKalemiGuncelle`, `siparisBasligiGuncelle`, `siparisKalemiSil`. Karta tek prop: `onDuzenle`.

**Doğrulama:** `senaryo-siparis-duzenle` yeni akışa göre YENİDEN yazıldı (altın güncellendi): kartta
kutu yok; form önde (`elementFromPoint`); başlık dolu, cari kilitli; kilitli satırda kutu/silme yok;
miktar 5→8, Taba satırı ürün Bot→Çizme (renk boşaldı, renksiz kayıt reddedildi) → Kahve, fiyat
350→375; yeni ürün eklendi; kaydedince kilitli kalem (4, karşılanan 2) ve cari korundu, form kapandı,
kart görünür. Formun ölçü miktar kutularına test işareti `data-olcu-miktar` eklendi.

## GIT DEPOSUNA TAŞINDI (24 Eylül, v1.445.0 üzerinde — Claude Code oturumu)

**Kaynak artık `mtalay61-coder/atolye` deposunda duruyor.** `src/`, denetleyiciler, `test/`, SQL
dosyaları ve bu not depoda düz dosyalar; zip ile taşıma bitti. Yayın (GitHub Pages, `main`) aynı
depodan: `index.html` = eski `baslat.html` (birebir aynı; depoda ayrı `baslat.html` tutulmuyor).
Oturum rehberi: `CLAUDE.md`.

**Ortam bağımsızlığı:** araçlar sohbet ortamının sabit yollarını kullanıyordu
(`/usr/local/lib/node_modules_global`, `/home/claude/.npm-global/...`, `/home/claude/erp/baslat.html`).
Artık `package.json` (typescript 6.0.2, react 19, playwright 1.56.1) + `npm install`; betikler düz
`require("typescript")` vb. kullanıyor. `senaryo-surum-duyuru` başlatıcı olarak `index.html`'i açıyor.

**Doğrulama:** `./yap.sh` temiz; üretilen `atolye-erp-v1.445.0.html` kullanıcının gönderdiği v1.445.0
HTML'iyle aynı — tek fark sürüm geçmişinde bir madde (kaynak, HTML'den biraz daha yeni).

**Test takımı tamamlandı (kısmen):**
- `alis-teslim-yardimci.js` YENİDEN YAZILDI (asıl dosya kayıptı): `siparis`, `silme`, `fis-ozet`,
  `son-islemler`, `fis-defteri` altın çıktılarıyla AYNI.
- v1.413.0 zip'inden geri alındı ve AYNI geçti: `senaryo-iscilik-yonu`, `-uretim-iade`,
  `-yazma-hatasi`, `-depo-okut`, `-beden-etiketi` (+ altınları) ve `birim-code128-cozucu.js`.
- `senaryo-bayat-efekt` v1.413 hâli tek ekran fişinden (v1.431.0) önceye ait, GEÇMİYOR → eklenmedi.
- HÂLÂ YOK (kosu.sh listesinde, dosyası yok): bayat-efekt, github-yayin, depo-sevkiyat,
  siparis-koli-sevk, koli-satir-gruplama, siparisten-koli-sec, alis-tek-ekran, renksiz-malzeme,
  iscilik-gorunum, ekstre-sade, standart-gizli, siparis-kamera, foto-ile-urun, siparis-yazdir,
  siparise-urun-ekle senaryoları ve `birim-fisyaz-varyant.js`. İhtiyaç oldukça yeniden yazılacak.
- Bu ortamda `tedarik-girisleri` FARKLI çıkıyor: WhatsApp bağlantısı (`wa.me`) ağ kısıtı yüzünden
  açılamıyor (`chrome-error://`) — kod hatası değil. Paralel koşuda `siparisten-sec` ve
  `fis-defteri` ara sıra oynak; tek başına AYNI.
- 4 YEDEK KAYNAK parçası (`137`, `236`, `237`, `238`) derlenmiş hâlde kalıyor. v1.413 zip'indeki
  `236-depo-okut.jsx` asıl JSX ama v1.413'ten sonra değişmiş (BarkodGirdisi, foto ile arama) —
  doğrudan değiştirilemez; o dosyaya dokunulacak ilk işte elle JSX'e çevrilmeli.

## YEREL ŞİFRE YEDEĞİ — TAMAMLANDI (24 Eylül, v1.445.0)

**Kullanıcı:** kimlik doğrulamayı açtı, son yerel hesabı (Muharrem) sildi, "hazır" dedi.

**v1.444.0 notundaki "ikinci ekleme yolu" YOKTU.** Senaryo `window.confirm`'ü otomatik kabul
ediyordu; yerel kayıt oradan geliyordu. Kodda tek ekleme yolu `kullaniciEkle`.

**Yapılanlar:**
- `065-giris.jsx` `GirisEkrani`: giriş YALNIZ `supabaseGiris`. Bulut reddederse içeri girilmiyor
  (kayıtta düz metin şifre olsa bile); sebep kalıcı kutuda `data-giris-hatasi` (+ toast).
- `130-tanimlar.jsx` `kullaniciEkle`: fonksiyon reddederse kullanıcı EKLENMİYOR; sebep `alert`
  penceresinde (2. satır = hata), form dolu kalıyor. "Yine de yerel kaydedilsin mi?" kalktı.
- **KİLİDİN ÇÖZÜMÜ — oturumsuz ekleme = panel hesabını doğrulama.** Hesap açan `kullanici`
  fonksiyonu yönetici jetonu istiyor. Giriş kapalıyken (yeni kurulum / veritabanı sıfırlama) jeton
  yok; yerel yol da kalkınca ilk kullanıcı eklenemez, giriş de yöneticisiz açılamazdı (kilit).
  Artık jeton yoksa verilen e-posta + şifreyle `supabaseGiris` DENENİYOR; tutarsa kayıt
  `bulutHesabi: true` ekleniyor ve doğrulama oturumu hemen kapatılıyor (`supabaseCikis`) — giriş
  kapalıyken kimlik değişmesin. Tutmazsa pencere: "Supabase > Authentication > Users > Add user ile
  hesabı açıp tekrar ekleyin".
- **İlk Kurulum ekranı** aynı mantıkla: hesap panelde açılmış olmalı, ekran girişi dener; tutarsa
  Yönetici kaydı (ŞİFRESİZ, `eposta`, `bulutHesabi: true`) oluşur ve bulut kimliğiyle içeri girilir.
  Eskiden şifre düz metin yazılıp yerel oturum açılıyordu.
- Eskiden kalma `bulutHesabi: false` kayıtlar: rozet açıklaması "GİRİŞ YAPAMAZ"; satırdan şifre
  verilince bulut hesabı açılır ve düz metin şifre silinir (bu yol zaten vardı); bulut silmeyi
  reddetse de yerel kayıt silinebilir (değişmedi, senaryoda ölçülüyor).
- App'teki "yerel giriş" dalı (`bulutMu=false`, yerel rozet, bulut ayrıntı kartı) artık
  GirisEkrani'ndan tetiklenmiyor; yalnız 12 saatlik eski yerel oturum sürdürülürse görünür.
  Zararsız, bir sonraki temizlikte kaldırılabilir.
- `bayatdenetim.js` borç listesinden karşılığı kalmayan `girisYap|sifre|B` silindi.

**Senaryolar:** `bulut-kullanici` (404 → eklenmez; eski yerel kayıt tohumda, silinebiliyor),
`bulut-giris` (ret → ekranda kalıyor + sebep kutusu; kart açılmıyor), `yoneticisiz` (giriş kapalı:
hesap yokken eklenmez, panelde açılınca Yönetici + şifresiz eklenir), `gorevler` ve `sohbet`
(auth 400 + yerel şifre → `bulutGirisRotasi`). Altınlar güncellendi, farklar tek tek okundu.

**Doğrulama:** 13 denetim + ölü kod temiz, derleme OK. Pakette çalışabilen 89 senaryonun 89'u
AYNI (altını güncellenen 3'ü dahil; `gorevler`/`sohbet` bulut taklidiyle altınla birebir aynı),
24 birim testi temiz. Paket eksikleri yüzünden 25 senaryo koşulamadı (yukarıda).

**AÇIK:** Tanımlar'daki kayıtlarda eskiden kalma `sifre` alanı temizlenmiyor (başarılı girişte
silinebilir — kullanıcıya sorulmadı).

## AÇIK KALANLAR

1. ~~`barkod-semasi.sql`~~ — **ÇALIŞTIRILDI (6 Eylül, kullanıcı bildirdi).** `urunler.stok_no`
   sütunu ve tekil indeksi yerinde; stok noları artık buluta yazılıp geri okunuyor.
2. **Denetim 7'ye ters yön** — kalıcı alanın şemada karşılığı var mı (yukarıda).
3. **Atölye ve koli barkodları bu aileye girmedi.** Parça barkodu (`1001-1`) ve koli kodu
   (`K-20260906-001`) kendi biçimlerinde kaldı — biri üretim parçasını, diğeri bir KAPSAYICIYI
   gösteriyor, ürün kimliği değil. Bilerek dışarıda; ihtiyaç doğarsa kullanıcı söyler.
4. ~~Depoda/stokta okutma ekranı yok~~ — **SORGULA YAPILDI (v1.411.0)**, SAY kipi sıradaki. Eski not: şema `900003` (renksiz) ve `9000031021` (renk) seviyelerini
   destekliyor ama bunları okutacak bir ekran yalnızca sipariş tarafında var, orada da kalem
   üretmiyorlar. Depo sayımı/arama için kullanılacaklarsa ayrı bir iş.

### 7a. FOTOĞRAFLA ÜRÜN BULMA (6 Eylül, v1.139.0)

**Kullanıcı:** *"Paketlemede üretimin veya stoğun fişi kaybolmuş olabilir. Personel ürünün kodunu
bilmiyor olabilir. Bu durumda ürünün resmini çekip eşleşen en yakın ürünlerden listelenir
(üretimden gelmiş ise üretimi olan modeller içerisinde eleme yaparsa daha az arama yapar), listeden
modeli seçip paketler. Aynı mantığı katalogda da kullanacağız… Bu yapıyı başka yerlerde de
kullanabiliriz, ona göre kurgula."*

> ### KAPSAM KARARI — DIŞARIYA HİÇBİR ŞEY GİTMEZ (kullanıcı, 6 Eylül)
> AI anahtarının nerede duracağı soruldu; kullanıcı soruyu kökünden kapattı:
> *"Bu yaptığımız AI mi onu da bilmiyorum. Stoğumuzda olmayan bir şeyi istemiyoruz. İçine
> girmediğim bilgiyi istemiyorum."*
>
> **Servis çağrısı, API anahtarı ve dil modeli YOK.** Eşleştirme kullanıcının KENDİ ürün
> görselleriyle, cihazın içinde yapılıyor. Ekranda görünen her şey (ad, renk, fiyat, stok)
> kullanıcının girdiği kayıttan geliyor; uydurma bilgi üretebilecek bir katman yok.
>
> **Bir sonraki oturum için:** "AI ekleyelim mi" diye TEKRAR ÖNERME. Kullanıcı isterse söyler.
> Bu karar aynı zamanda çevrimdışı çalışmayı garanti ediyor — atölyede internet kesilince
> paketleme durmuyor, ki proje kuralı zaten bu ("işin durmaması güncel veriden önceliklidir").

**Nasıl çalışıyor.** Her görselden iki imza çıkıyor:
- **renk** — 28 kutulu histogram. Doygunluğu düşük pikseller (siyah/gri/kahve, atölyede çoğunluk)
  AÇIKLIK eksenine, doygun olanlar RENK TONU eksenine düşüyor. Yalnız ton kullanılsaydı siyah ile
  beyaz aynı kutuya girerdi.
- **biçim** — 8×8 gri tonlama ortalama karması (aHash), 64 bit. Mutlak parlaklığa değil parlaklık
  DESENİNE bakıyor; aynı model farklı ışıkta çekilse de deseni korunuyor.

Skor `0.7 × renk + 0.3 × biçim`. Renk ağırlıklı, çünkü aynı modelin siyahı ile bejini ayıran şey
renk; biçim ikisinde de aynı ve bu ürün grubunda (ayakkabı silüetleri birbirine benziyor) tek
başına zayıf.

**Arka plan kırpılıyor:** fotoğrafın orta %60'ı alınıyor. Tezgâhın rengi kenarları dolduruyor ve
kırpılmazsa histogram ürünü değil MASAYI ölçüyordu.

**Havuzu ÇAĞIRAN veriyor** — modül "neyin arasında arayacağını" kendi kararlaştırmıyor. Asıl kazanç
burada ve kullanıcının kendi tespiti: Paketleme'de varsayılan havuz DAR — stoğa girmiş üretimler +
bekleyen satış siparişlerinin kalemleri, yani "paketlenmeyi bekleyen" küme. 400 model yerine 15
model arasında aramak hem hızlı hem isabetli. Bulunamazsa "tüm mamullerde ara" düğmesi var.

**Seçim sonrası KAYNAĞA bağlanıyor.** Kullanıcının derdi "fişi kaybolmuş": modeli bulmak yarısı,
kayıp fişi geri bulmak diğer yarısı. Seçilen ürün+rengin üretimi ya da siparişi varsa normal
kaynak seçme yolundan geçiliyor (aynı doğrulamalar, aynı kalan hesabı). Yoksa serbest moda düşülüp
SEBEBİ yazılıyor — sessizce serbest moda düşmek, personelin siparişe bağlamayı unutması demekti.

**YENİ DEFTER YOK, YENİ SÜTUN YOK.** İmzalar saklı görsellerden anlık türetiliyor ve oturum içinde
bellekte tutuluyor (`imzaOnbellek`). Çekilen fotoğraf da SAKLANMIYOR, yalnız eşleştirmede
kullanılıp atılıyor. Ürün kaydına imza alanı eklemek 6b'deki yükün aynısını getirirdi (şema +
okuma + SQL + silme testi) ve karşılığı yoktu.

**Yeniden kullanım için kurgulandı** (kullanıcı istedi):
```
gorselEslestir(hedefImza, havuz, { enFazla, esik }) → sıralı [{ ...aday, skor }]
<GorselIleBul havuz={…} onSec={…} acikMi onKapat altBilgi showToast />
```
Saf fonksiyon tarayıcısız test ediliyor; kanvas işi (`dataUrlImzasi`) ayrı. Aday birimi
ÜRÜN+RENK, çünkü görsel renk bazında saklanıyor (`renkResimleri`) ve paketlemede seçilen şey
modelin bir rengi. Sıradaki kullanıcı: **katalog** (kullanıcı: "her 2 side" — hem personel hem
müşteri; müşteri tarafında alış fiyatı/tedarikçi/maliyet GÖRÜNMEMELİ, bu henüz yapılmadı).

**Doğrulama:** `test/birim-gorsel-eslestirme.js` — aynı malın farklı ışıkta yakın kalması, siyah
ile bejin ayrışması, doygun rengin gri ekseninden ayrılması, aynı renkleri taşıyan farklı desenin
tam eşleşmemesi, sıralama, eşik ve görselsiz adayın davranışı.

> **Testin yakaladığı bir çelişki:** kodun yorumu "görseli olmayan aday elenmez" diyordu ama
> varsayılan eşik (0) onu eliyordu. Eşik artık YALNIZCA puanlanabilmiş adaylara uygulanıyor;
> imzasız aday her hâlükârda listede kalıyor. "Eşleşmedi" ile "görseli yok" farklı iki şey ve
> ikincisi kullanıcının düzeltebileceği bir eksik — sessizce elemek eksiği hiç fark ettirmezdi.

### 7b. KATALOG GÖRÜNÜMÜ (6 Eylül, v1.140.0)

**Kullanıcı:** *"Katalog yapalım, aslında bu bizim tarafta stok yönetimi. İlave sekme açmayalım,
burayı daha katalog gibi kullanalım. Ürün resimleri büyük, sanki web sitesinde geziniyor gibi;
1 büyük resim ve etrafında varyant resimleri listelenecek. Ürün bilgileri çekilecek, özel kodlar
burada devreye girecek. Fiyatlar çekilecek ama burada ince nokta: sadece ana ekrandaki fiyatlar,
çünkü özel fiyatlar görünmesi tehlikeli. Amaç web sitesinden alışveriş yapıyor gibi sipariş veya
katalog bakmak."*

**AYRI SEKME AÇILMADI** — Stok ekranının ikinci GÖRÜNÜMÜ. `Liste / Katalog` anahtarı, aynı
`filtered` verisi. Arama, kategori sekmeleri ve süzgeçler ikisinde de aynı işi görüyor; ayrı sekme
olsaydı süzgeçler iki yerde durur ve ayrışırdı.

**FİYAT KURALI — işin ince noktası.** Katalog `fiyatBul`u HİÇ ÇAĞIRMIYOR. `fiyatBul` cari kimliği
ve fiyat grubuyla çalışıp müşteriye özel fiyatı döndürüyor; ekranda bir müşteriye başka bir
müşterinin fiyatını göstermek geri alınamayan bir hata. Katalog yalnızca ürün kaydının KENDİ
alanlarını okuyor: `satisFiyati`, `alisFiyati`. Fiyatlandırma sekmesindeki kurallar buraya
sızmıyor. **Senaryo testinin asıl iddiası bu:** ürünün cariye özel 555 ₺ fiyatı var ve hiçbir
görünümde ekrana gelmiyor.

**Ekran:** ızgara (kart başına tek kapak görseli — bütün renkleri ızgaraya dökmek tek modeli
onlarca kutuya yayar ve gezinme hissini bozardı), detayda 280 px büyük görsel + altında varyant
küçük görselleri. Varyanta tıklamak büyük görseli VE beden/stok dökümünü birlikte değiştiriyor:
seçilen renk, bakılan şeyin tamamı. Özel kodların yalnızca DOLU olanları çiziliyor — beş boş satır
bilgi değil gürültü.

**MÜŞTERİ GÖRÜNÜMÜ tek düğme.** Ekranı müşteriye çevirmek fuarda bir hareket; gizlemenin de tek
hareket olması gerekiyor, menüye gömülü bir ayar o anda hatırlanmazdı. Açıkken alış fiyatı ve stok
ADETLERİ gizleniyor — müşteriye "3 tane kaldı" pazarlık malzemesi, "var/yok" ise siparişin cevabı.
Varsayılan personel görünümü.

**Fotoğrafla Bul** katalogta da var (7a'daki ortak bileşen); havuz süzülmüş listenin ürün+renkleri,
yani kategori sekmesi daraldıkça arama da daralıyor.

**Doğrulama:** `test/senaryo-katalog.js` — görünüm anahtarının varlığı, ızgara, büyük görsel + iki
varyant görseli, özel kodların etiketiyle görünmesi, ana satış fiyatı, personel modunda alış
fiyatı, müşteri modunda alışın gizlenmesi ve ölçü başlığının değişmesi. Her üç görünümde de
**özel fiyatın sızmadığı** ayrı ayrı ölçülüyor.

> **Test kurarken çıkan tuzak:** `ozelKodEtiketleri` tam BEŞ eleman değilse uygulama listeyi
> varsayılana döndürüyor (`100-app.jsx:373`). Tohuma iki etiket verilince ekranda "Özel Kod 1"
> çıkıyordu. Mevcut ve bilinçli bir kural; test tohumu buna uymak zorunda.

### 7c. ÖZEL KODLAR: GÖRÜNÜR, ARANIR, SÜZÜLÜR (6 Eylül, v1.141.0)

**Kullanıcı:** *"Özel kod dolu ise görünsün; örn. Özel kod 1 taban ise 'Taban: 147' yazsın. Ürün
aramada taban filtreleyerek arama vs. yapılır."*

**AYRIŞMA KAPANDI.** `product.ozelKodlar` iki farklı biçimde okunuyordu: ürün kartının sekme
rozeti ETİKETE göre (`(product.ozelKodlar || {})[etiket]`), düzenleme formu ve katalog ise DİZİ
İNDİSİNE göre. Uygulama diziyi yazıyor, yani rozet dolu kodda bile 0 gösteriyordu. İndis doğru
biçim: etiket yeniden adlandırılınca ("Özel Kod 1" → "Taban") değer yerinde kalıyor; etikete
bağlansaydı ad değişince kod kaybolurdu.

**Listede etiketiyle görünüyor.** `UrunOzetSatiri`'ye dolu kodlar rozet olarak eklendi:
`Taban: 147`. Çıplak bir "147" hangi alana ait olduğunu söylemiyordu. Boş kodlar çizilmiyor.

**Arama geniş, süzgeç dar.** Arama havuzuna hem ETİKET hem DEĞER girdi: "taban" yazmak taban kodu
dolu olanları, "147" yazmak o değere sahip olanı buluyor — ayrı bir alan seçmeye gerek kalmadan.
Arama kutusunun metni de güncellendi ("Ürün, renk, beden veya özel kod ara…"), yoksa yeni
yeteneğin varlığı görünmezdi.

**Süzgeç İKİ AŞAMALI:** önce hangi kod (etiket), sonra hangi değer. Tek aşamalı olsaydı bütün
kodların bütün değerleri tek listede karışırdı — "147" hem taban hem kalıp numarası olabilir ve
ikisi aynı şey değil. Değer seçilmezse "o kodu DOLU olanlar" süzülüyor; boş bırakılmış kayıtları
ayıklamanın yolu bu. Değerler açılır listeden seçiliyor, elle yazılmıyor: "147" ile "147 "
arasındaki fark süzgeci boş döndürürdü.

Süzgeç YALNIZCA en az bir üründe dolu kod varsa çiziliyor — hiç kullanılmayan bir alan için
ekranda iki açılır liste durması gürültü olurdu. Etiketler Tanımlar'dan geliyor; kullanıcı
"Özel Kod 1"i "Taban" yapınca süzgeç de "Taban" diyor.

**Doğrulama:** `senaryo-katalog.js` genişletildi — listede etiketli rozet, etikete göre arama
("taban" → kodu dolu iki ürün, kodsuz olan elenir), değere göre arama ("Kauçuk" → tek ürün), kodu
seçince dolu olanların süzülmesi, değeri seçince tek ürüne inmesi.

### 7d. ÖZEL KOD ARAMASI ÜRÜN SEÇİCİSİNE DE GİRDİ (6 Eylül, v1.142.0)

Bir önceki turda açık bırakılmıştı: özel kodlar yalnızca Stok ekranında aranıyordu.
Kullanıcı: *"Mantıklı yap."*

İki aramanın ayrı davranması **"taban 147'yi Stok'ta buluyorum ama siparişte bulamıyorum"**
demekti. `AramaliUrunSecici`nin havuzuna özel kodlar eklendi — hem etiket hem değer. Seçici
sipariş girişinde ve reçetede hammadde seçerken kullanılıyor, ikisi de kazandı.

**Havuz ve eşleşme sebebi TEK YERDEN çıkıyor** (`ozelKodCiftleri` / `ozelKodMetni` /
`eslesenOzelKodlar`). Ayrı ayrı yazılsalardı biri etiketi arayıp diğeri etiketi göstermeyebilirdi
ve kullanıcı "bu satır neden geldi?" sorusuyla kalırdı.

**Eşleşme sebebi rozette görünüyor.** "Kauçuk" arayınca listede yalnızca ürün adı çıksaydı,
kullanıcı satırın neden geldiğini bilemez ve doğru ürün olduğuna güvenemezdi. YALNIZCA aramayla
eşleşen kod basılıyor; hepsini basmak satırı doldurup ürün adını ezerdi (dar ekranda ad ezilmesi
bu bileşende yaşanmış bir hata, bkz. bileşendeki not).

Etiket listesi verilmezse seçici yine çalışıyor, yalnız değerleri arıyor — çağıran propu geçirmeyi
unutsa da "147" bulunabilsin.

**Doğrulama:** `senaryo-katalog.js` — sipariş ekranında "Kauçuk" araması doğru modeli getiriyor,
diğerini eliyor ve rozette `Taban: Kauçuk` yazıyor.

### 7e. ÖZEL KOD ETİKETLERİ ÇIKMAZ SOKAKTI (6 Eylül, v1.143.0)

**Kullanıcı:** *"Özel kodları nereden ekleyeceğiz? Tanımlarda boş çıkıyor."*

**Gerçek bir çıkmaz sokaktı.** Zincir şöyleydi:
1. Sıfırlama `ozelKodEtiketleri`yi BOŞ DİZİYE çekiyor (`100-app.jsx:2806`) — bilinçli, gerekçesi
   "başlıksız beş kutu görünmesin".
2. Tanımlar ekranı listeyi `map` ile çiziyordu; boş listede hiç kutu çıkmıyor ve **alan eklemenin
   yolu yoktu**. Başlık + açıklama görünüyor, altı boş — yani gizleme niyeti de tutmuyordu.
3. Etiket olmayınca ürün kartındaki "Özel Kodlar" sekmesi de çıkmıyor
   (`160-urunkarti.jsx:1201`), yani DEĞER de girilemiyordu.

Tek bir sıfırlama, özelliği kalıcı olarak erişilemez kılıyordu.

**Çözüm.** Liste boşken açıklama + "5 özel kod alanı oluştur" düğmesi çiziliyor. Dolu iken HER
ZAMAN beş kutu: değerler üründe dizi indisiyle (`ozelKodlar[0..4]`) durduğu için liste kısalırsa
dolu bir kod adsız kalır ve ekranda ": 147" görünürdü. Boş bırakılan başlık `onBlur`'da varsayılan
adına dönüyor — adsız alan değerini okunamaz kılıyor. Her tuşta değil `onBlur`'da, yoksa yazarken
ad kullanıcının altından kayardı.

Normalleştirme tek yerde: `ozelKodEtiketleriNormalle` (015-sabitler). Aynı beş-slot kuralı
`100-app.jsx:373`te de vardı; ikisinin ayrışmaması için kural artık paylaşılan bir fonksiyonda.

**İKİ SEVİYE KARIŞIYORDU, EKRANA YAZILDI.** Açıklama metni artık ayrımı söylüyor: *başlıklar*
Tanımlar'da, *değerler* her ürünün kendi kartındaki "Özel Kodlar" sekmesinde (Düzenle ile).
Başlık değişince girilmiş değerler yerinde kalıyor, çünkü değer başlığa değil SIRAYA bağlı.

**Doğrulama:**
- `test/birim-ozel-kod.js` — boş/eksik/uzun liste, boş başlığın varsayılana dönmesi, boşluk
  kırpma, ikinci normalleştirmenin bir şey değiştirmemesi.
- `senaryo-katalog.js` — Tanımlar → Özel Kodlar'da BEŞ kutunun çizildiği, başlıkların yerinde
  olduğu ve değerlerin nerede girileceğinin ekranda yazılı olduğu.

> Bu, notun "çıkmaz sokak" kalıbının bir örneği daha (bkz. 5m "Satın Al çıkmaz sokaktı", 7a'daki
> "düğme çözemez" ayrımı). **Kalıp:** bir listeyi `map` ile çizen ekran, liste BOŞKEN ne
> göstereceğine de karar vermek zorunda. Boş liste + ekleme yolu yok = özellik erişilemez.

### 7f. ÖZEL KODLAR STOK TİPİNE GÖRE (6 Eylül, v1.144.0)

**Kullanıcı:** *"Özel kod alanlarını her stok kendi içinde adlandırsın — taban stoğu için özel kod
deriye uymaz… veya stok tipine göre özel kod kullandıralım."*

**TİPE GÖRE seçildi, ürün başına değil** — ve sebebi kayda geçsin: **ürün başına adlandırma
FİLTRELEMEYİ ÖLDÜRÜR.** 7c'de kurduğumuz "taban kodu 147 olanları getir" sorusunun gruplanacak
zemini kalmaz; 200 üründe 200 farklı başlık olur ve süzgecin değer listesi anlamsızlaşır.

> ### KAPSAM KARARLARI (kullanıcı, 6 Eylül)
> 1. Başlıklar **stok tipine** göre tanımlanır (malzeme tipi / mamul tipi).
> 2. Alan sayısı **tipe göre serbest** — taban iki alan isterken deri altı alan isteyebilir.
> 3. **Genel alanlar da kalır**: "Tedarikçi Kodu" her üründe anlamlı.

**DEĞER SIRAYA DEĞİL KİMLİĞE BAĞLI.** Eskiden `ozelKodlar[0..4]` diziydi. Tipe özel alanlarda sıra
tipten tipe farklı anlama gelir: ürünün tipi Deri'den Taban'a çevrildiğinde "0,9 mm" sessizce
"numara" alanında görünürdü. Artık `ozelKodlar: { "<alanId>": "147" }` — bağ kimlikle kuruluyor.
Alanın adı, tipi ya da sırası değişse de değer doğru alanda kalıyor. 6b'deki dersin aynısı.

**Veri modeli:** `tanimlar.ozelKodAlanlari = [{ id, ad, kapsamTuru, kapsamAd }]`.
`kapsamTuru` = `genel` | `malzeme` | `mamul`; `kapsamAd` tip adı. Kapsam METİNLE eşleşiyor çünkü
ürün tipini metin olarak taşıyor (`malzemeTipi` / `mamulTipi`), tip kaydının kimliğini değil.

**Tip değişince eski değer GÖRÜNMÜYOR ama SİLİNMİYOR.** Kayıtta duruyor, tip geri alınırsa yerine
dönüyor. Sessizce silmek, yanlış tıklanan bir tip değişikliğini geri alınamaz kılardı; yanlış
alanda göstermek ise daha kötü olurdu.

**Ekranlar:** Tanımlar → Özel Kodlar'da alanlar kapsamına göre gruplu, ad + kapsam ile ekleniyor,
adı sonradan değişebiliyor (kimlik sabit kaldığı için değerler etkilenmiyor). Tipi silinmiş
alanlar ayrı bir uyarı kutusunda gösteriliyor — gizlemek, değerleri erişilemez kılardı. Ürün
kartındaki sekme yalnız O ÜRÜNE uygulanan alanları çiziyor. Stok süzgecinde alan adının yanında
kapsamı da yazılı ("Taban (Ayakkabı)"): aynı ad iki tipte tanımlı olabilir.

**Göç** (`ozelKodGoc`) bir kerelik ve sessiz: eski beş etiket "Genel" kapsamlı alanlara dönüşüyor,
ürünlerdeki diziler indis sırasına göre o alanların kimliklerine bağlanıyor. Boş etiket alan
açmıyor. İkinci çağrıda hiçbir şey değişmiyor.

#### Bu işte çıkan ÜÇ HATA

**1. `ozelKodlar` her açılışta SİLİNİYORDU.** Yüklemede `entry.ozelKodlar.length === 5` değilse
diziyi sıfırlayan bir normalleştirme vardı (`100-app.jsx:429`). Yeni biçim NESNE olduğu için
`length` tanımsız → koşul false → değerler her açılışta boşaltılıyordu. Tarayıcı senaryosu
yakaladı; birim testi yakalayamazdı, çünkü hata saf fonksiyonda değil yükleme yolundaydı.
> **Kural:** bir alanın BİÇİMİ değişiyorsa, o alanı "doğrula/normalleştir" diye eline alan her
> yeri ara. `grep -rn "ozelKodlar" src/` bunu ilk denemede gösterirdi.

**2. Göç yalnızca bulut yoluna bağlanmıştı.** Yerel okuma yolunda (`internet yokken`) göç hiç
çalışmıyordu; oradaki yorum zaten *"iki yolun davranışı ayrışmamalı"* diyordu. İkisine birden
bağlandı. Bu, değişmez kuralın 4. maddesinin (yazma VE okuma) yükleme tarafındaki karşılığı.

**3. TDZ — `ozelKodAlanlari` kullanımdan sonra tanımlanmıştı.** `filtered` hesabı onu kullanıyor
ama `const` aşağıda duruyordu; bileşen "Cannot access before initialization" ile çöküyordu.
**Denetim 2 bunu YAKALAMADI:** bileşen gövdesindeki `const` sırasına bakmıyor. Tarayıcı senaryosu
yakaladı — "denetleyici + derleme YETERLİ DEĞİL" tespitinin bir örneği daha.

**Doğrulama:** `test/birim-ozel-kod.js` (26 iddia) — kapsam eşleşmesi, tabanın alanının deride
görünmemesi, genel alanın başta olması, tip değişince değerin görünmemesi ama korunması, göçün
tam ve tekrarsız olması. `senaryo-katalog.js` — Tanımlar'da kapsam grupları, listede rozet,
etiket/değer araması, iki aşamalı süzgeç ve sipariş ekranındaki arama.

### 7g. SEZON DA KAPSAM EKSENİ (6 Eylül, v1.145.0)

**Kullanıcı:** *"Burada mamul için farklı senaryo yaparız."* → sorulunca: **"Sezon da kapsam
ekseni olsun."**

Mamul tipi zaten eksendi; sezon dördüncü eksen oldu: `kapsamTuru: "sezon"`, `kapsamAd` sezon adı.
**Sezon yalnız mamulde dolduruluyor** (152-stok, `kategori === "Mamul"` koşuluyla), dolayısıyla
sezona bağlı bir alan doğal olarak yalnız mamullerde görünüyor — ayrıca "kategori mamul mü" diye
bakmaya gerek kalmadı.

> **"Tüm Sezon" JOKER DEĞİL, bir değer.** Yazlık bir alanı "Tüm Sezon" ürünlerinde de göstermek
> cazip görünüyor ama o zaman GERÇEKTEN her sezona ait ürünlere özel bir alan tanımlamak imkânsız
> hale gelirdi. Eşleşme birebir; iki sezona da alan isteniyorsa iki alan açılır ya da alan Genel
> yapılır. Birim testi bunu ayrıca ölçüyor.

**Sezon listesi tek yere toplandı** (`SEZONLAR`, 015-sabitler). Üç yerde ayrı ayrı yazılıydı (ürün
formu, stok süzgeci) ve özel kod kapsamı dördüncüsü olacaktı. Ayrı listeler zamanla ayrışır:
birine eklenen sezon diğerinde çıkmaz ve o sezona atanmış kayıt hiçbir süzgeçte görünmez.
"Belirtilmemiş" listede YOK — o bir değer değil, değerin yokluğu (`sezon: ""`).

**Doğrulama:** `birim-ozel-kod.js` — sezon alanının eşleşen sezonda çıkması, başka sezonda
çıkmaması, sezonsuz üründe hiç çıkmaması, "Tüm Sezon"un joker olmaması.
`senaryo-katalog.js` — Tanımlar'da sezon grubunun görünmesi ve aynı mamul tipindeki iki üründen
YALNIZ yazlık olanında sezon alanının rozet olması.

### 7h. HAMMADDEDE DE SATIŞ FİYATI (6 Eylül, v1.146.0)

**Kullanıcı:** *"Hammaddede satış fiyatını da ekleyelim."*

Satış fiyatı yalnız mamulde vardı. Üç yerde kapalıydı ve biri SESSİZ VERİ KAYBIYDI:
- Ürün kartının hammadde bloğunda alan hiç çizilmiyordu.
- Yeni ürün formunda alan yalnız mamulde görünüyordu.
- **Kayıt sırasında `satisFiyati: isMamul ? … : 0`** — yani hammaddeye bir yolla değer girilse
  bile kaydederken sıfırlanıyordu. Girilen değerin sessizce atılması, alanı hiç göstermemekten
  kötü.

Üçü de açıldı. Ek fiyatlarda da tip artık seçilebiliyor; önceden hammaddede `"Alış"` sabit
yazılıydı ve kullanıcının seçtiği tip YOK SAYILIYORDU.

**Okuma görünümünde satış YALNIZCA girilmişse çiziliyor.** Çoğu hammadde satılmıyor; her satırda
"Satış: 0,00 ₺" taşımak bilgi vermeyen bir gürültü olurdu.

Form etiketi birimden okunuyor: hammaddede "çift başına" yanlış olurdu (desi, metre, adet).

**`fiyatBul` zaten kategoriye bakmıyordu**, yalnızca alan boş olduğu için sıfır dönüyordu. Stok
fişi de kategori süzmüyor — yani hammadde satış fişiyle satılabiliyor ve fiyat artık oradan
geliyor.

> **AÇIK:** satış SİPARİŞİ ekranı ürün listesini `kategori === "Mamul"` ile süzüyor
> (`325-siparis.jsx:103`), yani hammadde satış siparişine kalem olarak eklenemiyor. Fiş yolu
> çalışıyor, sipariş yolu çalışmıyor. Bilinçli bir kısıtlama gibi duruyor (sipariş = model
> siparişi) ve dokunulmadı — kullanıcı hammaddeyi siparişe de yazmak isterse söylemeli.

**Doğrulama:** `senaryo-katalog.js` — satış fiyatı olan bir hammaddenin kartında hem alış hem
satışın göründüğü.

> **Bu turda yapılan hata:** JSX ÖZNİTELİKLERİNİN ARASINA `{/* */}` yorumu konuldu ve sözdizimi
> hatası verdi. Bu, notun "sık karşılaşılan hata kalıpları" listesinin 1. maddesi. Denetim 1
> anında yakaladı; yine de kalıbın hâlâ tekrarlandığı kayda geçsin.

### 7h. ALIŞ VE SATIŞ PARA BİRİMİ AYRILDI (6 Eylül, v1.146.0)

**Kullanıcı:** *"Mamulde alış ve satış p.birimi ayrı ayrı girilebilmeli."*

Ürün kaydında tek bir `alisParaBirimi` vardı; satış fiyatı ekranlarda **`₺` SABİTİYLE** basılıyordu.
Yani dövizle satılan bir ürünün fiyatı zaten yanlış birimde görünüyordu. `satisParaBirimi` alanı
eklendi, ürün kartında satış fiyatının yanına kendi seçicisi geldi.

**KULLANICIYA VERİLEN SQL: `satis-para-birimi.sql`.** `urunler` sütunlarını tek tek sayıyor;
sütun açılmadan alan buluta gitmez ve bir sonraki açılışta bulut kopyası yereli ezip alanı
siler — v1.135.0'daki çift barkodu hatasının aynısı. Varsayılan `₺`: o tarihe kadar satış fiyatı
zaten ₺ gösteriliyordu, geçmişi başka bir birime çekmek girilmemiş bir bilgiyi uydurmak olurdu.

**Bu değişiklik iki sessiz hatayı da açığa çıkardı:**

1. **Katalogda satış fiyatı ALIŞIN birimiyle gösteriliyordu.** `katalogFiyat` tek bir
   `paraBirimi` döndürüyordu ve o alışın birimiydi; hem alış hem satış aynı etiketle basılıyordu.
   Artık `satisBirimi` / `alisBirimi` ayrı.
2. **Döviz uyarısı mamulü DIŞARIDA BIRAKIYORDU** (`p.kategori !== "Mamul"`). Gerekçesi vardı:
   mamulün dövizli bir fiyatı olamıyordu. Artık olabiliyor, dolayısıyla dışarıda bırakmak dövizli
   mamulü olan bir kurulumda stok değeri toplamını sessizce yanlış gösterirdi. Koşul kaldırıldı.

**KÂR YALNIZCA AYNI PARA BİRİMİNDE HESAPLANIYOR.** Dolarla alınıp euroyla satılan bir üründe
"satış − alış" bir sayı verir ama anlamı yoktur. Çevirmek de doğru değil: kur ürün kartında yok ve
hangi günün kuru olduğu belirsiz. Birimler farklıysa rakam yerine sebebi yazılıyor
("Kâr: ₺ → €, hesaplanmadı"). Yanlış bir kâr göstermektense hiç göstermemek daha iyi.

**Mamul ve hammadde blokları AYNI kaldı** — ürün kartında iki ayrı fiyat bloğu var ve ikisine de
aynı seçici kondu. Ayrışmaları "hammaddede döviz var, mamulde yok" gibi bir tuhaflık üretirdi.

**Doğrulama:** `senaryo-katalog.js` — alışı ₺, satışı € olan bir üründe katalog detayının
`990 €` ve `410 ₺` bastığı ayrı ayrı ölçülüyor.

### 7i. SEZON YILI, ÜRÜN AÇILIŞINDA ÖZEL KOD, SEKME KURALI (6 Eylül, v1.147.0)

#### Sezon yılı

**Kullanıcı:** *"Mamulde sezon kriterine ek olarak yıl seçelim, örn. İlkbahar/Yaz sene olarak da
2027 yılı gibi."*

`sezonYili` ayrı bir alan — sezon adıyla birleştirip tek metin yapmak ("İlkbahar/Yaz 2027")
süzgecin sezona VE yıla AYRI AYRI bakmasını imkânsız kılardı; "bütün 2027 koleksiyonu" ile
"bütün yazlıklar" iki farklı soru. Stok süzgecinde sezonun yanında ayrı bir yıl kutusu var ve
YALNIZCA kullanılan yılları listeliyor (sabit bir 2020-2030 aralığı hem eskir hem şişirir).

**Yıl özel kod KAPSAMINA girmedi, bilinçli.** Kapsam sezon adına bağlı kaldı: yıla da bağlansaydı
her yıl bütün alanları yeniden tanımlamak gerekirdi. Yıl bir süzme kriteri, alan ekseni değil.

**SQL: `sezon-yili.sql`.** Varsayılan yok — yılı olmayan eski kayıtlar boş kalıyor; uydurulan bir
yıl, süzgeçte yanlış koleksiyona düşen ürünler demek olurdu.

#### Özel kodlar ürün açılışında

**Kullanıcı:** *"Özel kodları yukarıya alalım, ürün açılışında özel kodlar da girilsin."*

Ürün ekleme formuna eklendi; kategori/tip/sezon alanlarının ALTINDA duruyor, çünkü hangi alanların
çıkacağını onlar belirliyor — kullanıcı önce tipi seçiyor, alanlar ona göre beliriyor. Sonradan
kartı açıp doldurmak iki adımlı bir işti ve ikincisi unutuluyordu.

> **Yakalanan hata:** kaydetme yolunda ilerideki bir `ozelKodlar: {}` satırı formdan gelen
> kodları EZİYORDU (nesne değişmezinde sonraki anahtar önceki anahtarı ezer). Kaldırıldı.

#### SEKME KURALI — bundan sonra geçerli

**Kullanıcı:** *"Soldaki pencereden açılan her sayfa açık kalsın, bir sonraki sayfa onu ezmesin,
üstte açık sekmeler olsun. Bu bundan sonra NET KURAL olsun. Bir ekrandan bir yere geçiş var ise,
geçiş yapılan ekran kapatılınca önceki ekrana geri dönsün."*

> ### DEĞİŞMEZ KURAL — HER EKRAN ŞERİTTE GÖRÜNÜR
> Sol menüden açılan her sayfa üst şeritte bir sekme olur, açık kalır ve elle kapatılana kadar
> durur. Yeni bir modül eklenirken `SEKME_BILGISI`'ne adı yazılmalı; yazılmazsa şeritte anahtar
> adıyla (`fisler` gibi) çıkar. `senaryo-sekmeler.js` bu kuralı ölçüyor.

Modüller zaten `display:none` ile gizleniyordu, yani sekme değiştirmek form state'ini
KAYBETTİRMİYORDU — eksik olan şey açık sayfaların GÖRÜNMESİ ve kapatılabilmesiydi. Kullanıcı
hangi sayfaları açtığını sol menüye bakarak hatırlamak zorundaydı.

**`setTab` sarmalandı.** Uygulamada ~50 `setTab` çağrısı var; her birini elle değiştirmek birini
atlamak demekti. Sarmalayıcı sekmeyi listeye ekliyor ve ziyaret geçmişine yazıyor; ham setter
(`setTabHam`) yalnız sarmalayıcının içinde kullanılıyor.

**Kapatınca öncekine dönüş** ziyaret GEÇMİŞİNDEN geliyor, liste sırasından değil: liste "hangi
sırayla açıldı"yı söyler, "en son neredeydim"i değil. Kapatılan sekme aktifse, geçmişte hâlâ açık
olan son sayfaya dönülüyor. **Anasayfa kapatılamaz** — dönülecek bir yer hep kalmalı.

Sayfa sekmeleri ve kayıt pencereleri AYNI şeritte (araya ince bir ayraç kondu): kullanıcı için
ikisi de "açık duran bir şey"; iki ayrı çubuk, ikisinin ne farkı olduğunu sordururdu.

**Doğrulama:** `test/senaryo-sekmeler.js` — üç sayfanın birbirini ezmemesi, aynı sayfaya tekrar
gitmenin ikinci sekme açmaması, kapatınca önceki sayfaya dönülmesi, Anasayfa'da kapatma düğmesi
olmaması.

> **İki ALTIN ÇIKTI DEĞİŞTİ, gerekçe:** `senaryo-fis-ozet` ve `senaryo-satin-al-dugmesi` sabit
> konumlu ögelerin metnini okuyor; şerit artık her zaman görünür ve içinde sayfa sekmeleri de
> var, dolayısıyla o metin uzadı. Ölçülen davranışlar (fiş satırının içeriği, fiş ekranının
> açılması) DEĞİŞMEDİ.

### 7j. PARA BİRİMİ TÜM STOKLARDA (6 Eylül, v1.148.0)

**Kullanıcı:** *"P.birimi hem tüm stoklarda olsun, alış ve satış p.birimi farklı olabilir.
SQL eklendi."* → `satis-para-birimi.sql` ve `sezon-yili.sql` **ÇALIŞTIRILDI**, bir daha sorma.

7h'de satış para birimi eklenmişti ama iki yer eksik kalmıştı:

1. **Ürün EKLEME formunda satış para birimi seçicisi yoktu** — etikette "₺" sabit yazılıydı.
   Alışın seçicisi vardı, satışınki yoktu; yani dövizle satılan bir ürünü açarken kartı sonradan
   açıp düzeltmek gerekiyordu. Gereksiz bir ikinci adım ve unutulmaya açık.
2. **Liste satırında satış fiyatı YALNIZ MAMULDE ve hep "₺" gösteriliyordu.** Hammaddenin de
   satış fiyatı var (artan deri, fazla taban satılıyor; bkz. ürün kartındaki not) ve artık kendi
   para biriminde.

Toplam stok değeri uyarısının metni de düzeltildi: "bazı hammaddelerin alış fiyatı" diyordu,
artık alış VE satış tarafını, hammadde VE mamulü kapsıyor.

**Doğrulama:** `senaryo-katalog.js` — dolarla alınıp lirayla satılan bir HAMMADDE eklendi; liste
satırında satış fiyatının `120 ₺` olarak (alışın `$`'ı değil) basıldığı ölçülüyor.

### 7k. CARİ KODU (6 Eylül, v1.149.0)

**Kullanıcı:** *"Tüm carilere değişmez kod verilmeli, ekranda görünmeli, değişmez kod id gibi."*

Carinin zaten bir `id`si vardı ama o İÇ KİMLİK: ekranda okunmuyor, telefonda söylenmiyor, evrakta
yazmıyor. `cari.kod` insan içindir — dört haneli, sırayla atanıyor.

**Unvan değişse de kod değişmiyor** ("Ahmet Tekstil" → "Ahmet Tekstil Ltd." aynı cari) ve **silinen
numara bir daha verilmiyor** — sayaç `tanimlar.kodSayaclari` içinde ve geri gitmiyor. Yoksa eski
bir evrakta yazan kod BAŞKA bir cariyi gösterirdi. Barkod işindeki (6b) makinenin aynısı;
`kodSayacIlerlet` yeniden kullanıldı, ikinci bir sayaç mantığı yazılmadı.

**`cari-kodu.sql` ÇALIŞTIRILDI** (kullanıcı bildirdi, 6 Eylül) — sütun + tekil indeks. `cariler` sütunlarını tek tek
sayıyor; açılmadan alan buluta gitmez ve bir sonraki açılışta silinir.
`barkod_kodu` sütunuyla karıştırılmasın: o, personelin atölyede okuttuğu barkod.

**Nerede atanıyor:** açılışta (bulut VE yerel yol — ikisinin ayrışmaması kuralı) ve `saveCariler`
içinde, yani yeni cari kaydedilir kaydedilmez. Ayrı bir "kodları ata" düğmesine bırakmak,
kullanıcının cariyi açıp kodunu boş görmesi demekti.

> **Yolda kapatılan bir ayrışma:** `hizliCariEkle` kendi yazma yolunu kullanıyordu
> (`setCariler` + `tabloYaz`), yani `saveCariler`daki kod atamasını atlardı. Tek kapıya bağlandı.
> Notun "aynı şeyi yazan iki yer, ayrışacak iki yer" kalıbı.

**Ekranda:** cari kartında unvanın SOLUNDA rozet — kod kimliğin kendisi, unvan değişebilir.
Kodu olmayan cari için rozet HİÇ çizilmiyor; boş bir rozet "kodu var ama okunamıyor" izlenimi
verirdi. Cari araması da koda bakıyor: kodun görünür olmasının tek anlamı onunla bulunabilmesi.

**Doğrulama:** `birim-barkod-semasi.js` — atama, dört haneli gösterim, unvan değişince kodun sabit
kalması, ikinci atamanın kod vermemesi, silinen numaranın geri verilmemesi, aralığın dolması.
`senaryo-cari-kart.js` — kod rozetinin gerçekten ekranda olması.

### 7l. ÖZEL KOD ALANI STOK AÇILIŞINDA EKLENEBİLİYOR (6 Eylül, v1.150.0)

**Kullanıcı:** *"Özel kodlar stok açılışında görünmüyor. Özel kodu burada stok açarken de
ekleyebiliriz; eklediğimiz özel kod o stoğa ait olur."*

**Görünmeme sebebi:** blok `alanlar.length === 0` ise `null` dönüyordu. Hiç alan tanımlanmamış bir
kurulumda — yani yeni bir kurulumda — hiç çizilmiyordu ve özellik yok sanılıyordu. Bu, 7e'deki
çıkmaz sokağın aynı kalıbı: **bir listeyi çizen ekran, liste BOŞKEN ne göstereceğine de karar
vermek zorunda.** Artık blok her zaman görünüyor; boşken sebebi yazılı.

**Yerinde alan ekleme.** Formda "Alan Ekle" ile başlık açılıyor ve **seçili tipe ait oluyor**:
kategori Hammadde + malzeme tipi "Deri" ise alan `malzeme/Deri` kapsamında doğuyor, yani yalnız
deri stoklarında görünüyor. Tip seçilmemişse alan **Genel** açılıyor — kapsamsız alan her üründe
görünür ve bu, "bu stoğa ait olsun" niyetinin en yakın karşılığı. Düğmenin `title`ı hangisinin
olacağını önceden söylüyor, bildirim de sonradan tekrar ediyor.

Aynı kapsamda aynı ad varsa yeni alan AÇILMIYOR, var olanın kimliği dönüyor: iki özdeş başlık
ürün kartında hangisine yazdığınızı ayırt edilemez kılardı. (Tanımlar ekranındaki ekleme de aynı
kuralı uyguluyor; iki yerin ayrışmaması için aynı kontrol.)

Bu, projedeki "yerinde tanım açma" kalıbının devamı (yeni renk, yeni malzeme tipi, yeni ölçü,
yeni tedarikçi): formu kapatıp Tanımlar'a gidip geri dönmek, yarım kalan formu kaybettiriyordu.

**Doğrulama:** `test/senaryo-ozel-kod-ekle.js` — hiç alanı olmayan bir kurulumda blokun ve
"Alan Ekle" düğmesinin görünmesi, sebebin yazılı olması, "Deri" seçiliyken eklenen alanın
`malzeme/Deri` kapsamına ve KİMLİKLE kaydedilmesi, formda anında belirmesi.

### 7m. KATALOG DETAYI TIKLANAN KARTIN ALTINDA (6 Eylül, v1.151.0)

**Kullanıcı:** *"Katalog ekranında stoğa tıklayınca stok aşağıda kalınca sorun oluyor, stoğu görmek
için yukarı çıkıyoruz. Tıklayınca olduğu yerden detay versin."*

Detay paneli ızgaranın ÜSTÜNDE çiziliyordu. Aşağıdaki bir karta tıklayan kullanıcı, açılan detayı
görmek için sayfayı yukarı kaydırmak zorundaydı — tıkladığı yerle sonucun göründüğü yer farklıydı.

**Çözüm:** detay ızgaranın İÇİNE, tıklanan kartın hemen ardına taşındı ve `gridColumn: "1 / -1"`
ile bütün sütunları kaplıyor; yani kartın altındaki satırda açılıyor.

> Sütun sayısı `repeat(auto-fill, minmax(180px, 1fr))` ile TARAYICIDA hesaplanıyor, dolayısıyla
> "satırın sonu neresi" JS'te güvenilir biçimde bulunamıyordu. Tam satır kaplayan bir ızgara ögesi,
> aynı sonucu hesap yapmadan CSS'e bırakıyor.

Detay JSX'i `katalogDetayiCiz(p)` fonksiyonuna çıkarıldı ki ızgaranın içinden çağrılabilsin.
Ayrıca **açık karta tekrar tıklamak kapatıyor**: detayı kapatmak için ayrı bir düğmeye uzanmak,
tıklanan yerin uzağına gitmek demekti (aynı şikâyetin küçük hâli).

**Doğrulama:** `senaryo-katalog.js` — detay panelinin üst kenarının, tıklanan kartın üst kenarından
AŞAĞIDA olduğu ölçülüyor. Panel stiliyle (`grid-column: 1 / -1`) bulunuyor; metinle aranırsa büyük
bir ata öge yakalanıyor ve konum ölçümü anlamsızlaşıyor (ilk denemede tam olarak bu oldu).

### 7n. ÜRÜN KARTINDAN DA ALAN EKLEME (6 Eylül, v1.152.0)

7l'de açık bırakılmıştı: yerinde alan ekleme yalnız stok açılış formundaydı. Aynı işi iki ekrandan
birinde yapabilmek, "hangi ekranda ne yapabiliyorum" diye hatırlamayı gerektiriyordu. Ürün
kartının Özel Kodlar sekmesine de eklendi; kapsam ÜRÜNÜN KENDİ TİPİNDEN geliyor (tipi yoksa Genel).

Değer girme yalnız Düzenle modunda; alan EKLEME her zaman açık, çünkü bu bir TANIM değişikliği,
ürünün kendi kaydı değil. Düzenle modunda değilken bunu söyleyen bir satır var.

> ### KISIR DÖNGÜ — testin yakaladığı
> Sekme "bu ürüne uygulanan alan varsa" çıkıyordu; gerekçesi *"içi boş bir sekme kullanıcıyı
> 'bir şey mi eksik' diye düşündürür"*di ve o gün doğruydu. Alan ekleme buraya gelince kural bir
> **kısır döngüye** dönüştü: alan eklemenin yolu sekmenin içinde, sekme ise alan olmadan
> açılmıyordu. Sekme artık HER ZAMAN var — boş sekme artık boş değil, içinde "Alan Ekle" ve
> durumun sebebi duruyor.
>
> **Kalıp:** bir şeyi GİZLEME kuralı, o şeyin içine YENİ BİR YETENEK konduğunda yeniden
> düşünülmeli. Gerekçesi hâlâ geçerli görünse de sonucu değişmiş olabilir. Bu oturumda üçüncü
> kez çıktı (7e Tanımlar, 7l stok formu, burada ürün kartı).

**Doğrulama:** `senaryo-ozel-kod-ekle.js` — karttaki "Alan Ekle" düğmesinin varlığı ve buradan
eklenen alanın tipi olmayan bir üründe GENEL kapsamla, kimlikle kaydedilmesi.

> **Senaryo yazarken iki tuzak:** (1) "Özel Kodlar" adında İKİ düğme var — biri Tanımlar
> ekranının sekmesi (o ekran `display:none`, yani görünmez), biri ürün kartınınki; ayrım
> görünürlükle yapılıyor. (2) "Deri" adı ekranda birkaç yerde geçiyor (malzeme tipi çipi, seçenek
> listesi); ürün SATIRI adıyla değil ŞEKLİYLE bulunuyor (içinde "renk/beden" yazan düğme).

- **Sipariş kalemi ürünün satış para birimini ÖN DOLDURMUYOR.** Sipariş formunda para birimi elle
  seçiliyor; ürün seçilince `satisParaBirimi`nin gelmesi doğal olurdu ama sipariş genelinde tek
  para birimi var ve iki farklı birimli ürün aynı siparişe girerse ne olacağı ayrı bir karar.
- **Stok değeri toplamı hâlâ birimleri karıştırıyor** (`toplamStokDegeri`): farklı birimdeki
  ürünlerin fiyatları toplanıyor. Uyarı rozeti var ama toplam yine de tek sayı olarak basılıyor;
  para birimi bazında ayırmak ayrı bir iş.
- Katalogdan doğrudan sipariş satırı OLUŞTURULMUYOR; "Sipariş ekranına git" düğmesi var. Kalemi
  katalogdan seçip siparişe atmak ayrı bir iş.
- **Denetim 2'ye bileşen içi `const` sırası eklenebilir** (yukarıdaki 3. hata).

### 7o. SİPARİŞ KALEM SATIRI DAR EKRANDA (6 Eylül, v1.153.0)

**Kullanıcı (ekran görüntüsüyle):** *"Renk alanı görünmüyor, dengeli dağılım yapalım."*

Kalem ekleme satırı SABİT ORANLI ızgaraydı: `1.4fr 0.9fr 0.8fr`. Renk sütununa düşen payın içinde
bir de "+ Renk" düğmesi var ve `whiteSpace: nowrap` ile kırılmıyordu; dar ekranda seçiciye ~50 px
kalıyor, seçili renk okunamıyordu.

**`fr` oranları ALT SINIR TANIMAZ** — sütun ne kadar dar kalırsa kalsın oranı korur. Çözüm
`repeat(auto-fit, minmax(200px, 1fr))`: her sütunun bir alt sınırı var, sığmayınca sütun daralmak
yerine ALT SATIRA iniyor. Geniş ekranda üçü yan yana, dar ekranda alt alta.

Aynı mantık iç satırlara da uygulandı: renk seçicisi `flex: "1 1 120px"` + `minWidth: 110`, düğme
`flex: "0 0 auto"` ve satır `flexWrap`. Düğme sığmazsa seçiciyi ezmek yerine alt satıra geçiyor —
asıl iş seçicide. Fiyat satırı ve ürün görselinin durduğu dış kap da aynı şekilde kırılabilir.

**Doğrulama:** `senaryo-barkod-siparis.js` — görünüm 820 px'e daraltılıp renk seçicisinin
genişliği ölçülüyor, alt sınır 100 px. Ölçümden sonra görünüm eski hâline döndürülüyor ki
senaryonun geri kalanı etkilenmesin.

> **Kalıp:** dar ekranda "kaybolan" bir alan genelde gizlenmiş değil, EZİLMİŞTİR. `fr` oranlarının
> alt sınırı yok; `minmax` ve `flex-basis` var. Sabit oranlı bir ızgarada kırılamayan bir öge
> (nowrap düğme, sabit genişlikli seçici) varsa, komşusu sıfıra doğru gider.

### 7p. KAYDEDİLMİŞ SİPARİŞİ DÜZENLEME (6 Eylül, v1.154.0)

**Kullanıcı:** *"Kaydedilmiş siparişi düzenlemek yok, düzenleme ekleyelim."*

Kalem SİLME zaten vardı ve iki kapısı vardı (planlanmış / karşılanmış). Eksik olan **miktar** ve
**başlık** düzenlemesiydi.

**Asıl mesele düzenlemeyi eklemek değil, KAPILARI doğru koymak.** Sipariş tek başına duran bir
kayıt değil: `karsilanan` fişten geliyor, `planlama` üretim/alış siparişine bağlı, hazır koliler
siparişin kalanından düşülüyor. Bunlardan biri varken kalemi değiştirmek, karşı taraftaki kaydı
sessizce yalancı çıkarır.

**Kapılar SİLMEYLE AYNI** (`kalemKilitSebebi`) — ayrı bir kural seti yazmak, birinin diğerinden
gevşek kalması demekti. Kilitli kalemde miktar kutusu HİÇ ÇİZİLMİYOR; devre dışı bir kutu
göstermek "neden yazamıyorum" sorusunu doğururdu, sebebi zaten `title`da yazılı.

**CARİ DEĞİŞİKLİĞİ ÖZEL KAPI:** siparişten fiş kesilmişse fişler O CARİYE yazıldı. Cariyi
değiştirmek, kesilmiş fişlerle siparişin başka kişileri göstermesi demek — ekstre ile sipariş bir
daha örtüşmez. Teslimat varsa cari alanı düzenleme formunda okunur metne dönüyor ve sebebi
yanında yazıyor; kullanıcı kaydettikten SONRA reddedilmiyor.

**SIFIR MİKTAR KALEM SİLMEK DEĞİLDİR.** Sıfırlanmış bir satır siparişte durur ve "bu neden burada"
sorusunu doğurur; silmek ayrı bir eylem ve kendi onayı var. Miktar sıfıra çekilmek istenirse
kullanıcı silme düğmesine yönlendiriliyor.

**Kaydetme anı:** miktar `onBlur`da yazılıyor. Her tuşta kaydetmek, "12" yazarken önce "1" olarak
kaydedip sipariş geçmişini gürültüye boğardı.

Başlıkta düzenlenebilenler: cari (kapılı), sipariş tarihi, teslim tarihi, müşteri sipariş kodu,
not. Salt okunur önizlemede düzenleme kapalı — tam ekranda yapılır.

**Doğrulama:** `test/senaryo-siparis-duzenle.js` — temiz kalemin 5→8 değişip kayda geçmesi,
karşılanmış kalem için miktar kutusunun HİÇ çizilmemesi ve miktarının korunması, teslimat yapılmış
siparişte cari kilidinin sebebiyle görünmesi ve carinin değişmemesi, başlıktaki tarih/notun
kaydedilmesi.

> **Senaryo yazarken:** hem durum süzgeci ("Tümü") hem sipariş satırı, metinle değil GÖRÜNÜRLÜKLE
> seçilmek zorunda kaldı — aynı metin birçok ata ögede geçiyor ve `.last()` görünmeyen bir
> sarmalayıcıya düşüyordu. Bu oturumda üçüncü kez aynı tuzak.

### 7r. SİPARİŞE KALEM EKLEME VE FİYAT DÜZENLEME (6 Eylül, v1.155.0)

**Kullanıcı:** *"Yeni kalem ekleme ve br fiyat düzenleme de ekle."*

#### Kalem ekleme — YENİ FORM YAZILMADI

Karta ikinci bir kalem formu yazmak yerine, ZATEN OLAN form hedefe yönlendiriliyor: ürün seçici,
asorti uygulama, barkod okutma, fiyat bulma, ölçü matrisi — hepsi orada. İkinci bir form,
ayrışacak ikinci bir form demekti.

Kartta **"Siparişe Yeni Kalem"** → form o siparişin TİPİ ve CARİSİYLE açılıyor, üstte hangi
siparişe eklendiği yazıyor, kaydet düğmesi **"SAT-D1 Siparişine Ekle"**e dönüşüyor. Aynı formun
iki sonucu olduğu için düğmenin adı da değişiyor: "Siparişi Kaydet"e basıp var olan siparişe
eklendiğini fark etmek (ya da tersi) geri alınması zahmetli bir sürpriz olurdu.

**Kapalı siparişe kalem eklenmiyor** ("Tamamlandı" / "İptal"): kapanmış bir işi yeniden açmak
demek. Durum değiştirmek ayrı ve bilinçli bir eylem, buradan sessizce yapılmıyor.

**Birleştirme kuralı:** aynı ürün+renk+ölçü zaten varsa yeni satır açılmıyor, miktarı artıyor
(yeni sipariş formundaki kuralın aynısı). AMA karşılanmış/planlanmış satıra dokunulmuyor — onun
miktarını buradan artırmak, düzenleme kapılarını arkadan dolaşmak olurdu; o durumda ayrı satır
açılıyor.

#### Birim fiyat

Renk satırındaki fiyat yerinde düzenleniyor — **yalnız bütün grup DÜZENLENEBİLİR ve TEK
FİYATTAYSA**. Karışık fiyatlı bir gruba tek kutu koymak hangi bedenin fiyatının değiştiğini
belirsiz bırakırdı; grupta kilitli kalem varsa da kutu, dokunulamayan satırları değiştirecekmiş
gibi görünürdü. Değişiklik o rengin BÜTÜN ölçülerine uygulanıyor: ekranda tek fiyat gösteriliyor,
tek kutu da tek anlam taşımalı.

> ### TESTİN YAKALADIĞI AD ÇAKIŞMASI
> Yeni düğmeye "Kalem Ekle" dedim. Aynı kartta fiş formunun kendi **"Kalem Ekle"** düğmesi var ve
> FİŞE satır ekliyor. `senaryo-cikis-fisi` anında kırıldı: fiş satırı eklenmiyor, sipariş kalem
> formu açılıyordu — yani gerçek bir kullanıcı da yanlış düğmeye basardı.
>
> "Siparişe Kalem Ekle" de YETMEDİ: içinde "Kalem Ekle" geçtiği için hâlâ ayırt edilemiyordu.
> Ad tamamen ayrıldı: **"Siparişe Yeni Kalem"**.
>
> **Kalıp:** aynı ekranda iki düğmenin adı biri diğerinin ALT DİZESİ olmamalı. Ayırt etme yükünü
> kullanıcıya yıkmanın yanı sıra, metinle eleme yapan her şey (test, erişilebilirlik aracı) yanlış
> ögeyi bulur.

**Doğrulama:** `senaryo-siparis-duzenle.js` genişletildi — fiyat kutusunun karışık kilitli renk
grubunda ÇIKMAMASI, temiz grupta çıkması ve 350→375 değişiminin kayda geçmesi; kalem ekleme
modunun başlığı ve düğme adının değişmesi.

#### AÇIK KALAN

- Kalem ekleme modunda ürün seçici tüm ürünleri gösteriyor; siparişin tipine göre zaten süzülüyor
  ama "bu siparişte zaten olan renk" ayrıca işaretlenmiyor.
- Para birimi düzenlemesi `siparisKalemiGuncelle` üzerinden HAZIR ama arayüzde bağlı değil.

### 7s. "MUHASEBE" DEFTERİ HİÇBİR DEFTERE İŞLEMİYORDU (6 Eylül, v1.156.0)

**Kullanıcı (ekran görüntüsüyle):** *"Muhasebe seçili olduğunda hem genel hem de resmi kayda
işlemesi gerekiyor."*

Kasa/banka hareketinde defter seçenekleri: Genel · Resmi · **Muhasebe (ikisine de)**. Etiket bunu
vaat ediyordu ama süzgeç `(h.defter || "Genel") === defter` diye bakıyordu; "Muhasebe" ne Genel'e
ne Resmi'ye eşit olduğu için kayıt **HİÇBİR DEFTERE GİRMİYORDU**. Yalnız "Tümü"de görünüyordu.

Kullanıcının ekranındaki sayılar bunu birebir gösteriyordu: toplam 50.177, ama
`Genel: 22.666 · Resmi: 1.702` — iki "Muhasebe" hareketi (23.554 + 2.255) hiçbir kırılımda yok.
Sekme sayaçları da `Genel (2) · Resmi (2)` iken toplam 6 hareket vardı.

**Çözüm: `defterKapsar(kayitDefteri, secilen)`** — "Muhasebe" üçüncü bir defter değil, "ikisine de"
demek. Bakiye, sekme sayaçları ve liste süzgeci aynı kuraldan geçiyor; ayrı yazılsalardı biri
sayıp diğeri göstermeyebilirdi.

> **Kasa tarafında "Muhasebe" TEK KAYIT olarak duruyor** — cari tarafındaki gibi ikiye
> bölünmüyor (`205-muhasebe.jsx`, `esId` ile bağlı Genel+Resmi ikizi). Bu bilinçli: bölünseydi
> hesabın kendi bakiyesi aynı parayı İKİ KEZ sayardı ve ikinci kaydı toplamdan ayıklamak için her
> yere bir istisna eklemek gerekirdi — cari tarafında tam olarak o istisnalar var
> (`110-navigasyon.jsx:267`, `160-urunkarti.jsx:4152`: `defter === "Resmi" && h.esId` ise atla).
> Tek kayıt + kapsam kuralı hem toplamı hem kırılımı doğru tutuyor.

**Doğrulama:** `test/birim-defter.js` — kapsam kuralının altı hâli (Muhasebe'nin ikisine de
girmesi, defteri boş eski kayıtların Genel sayılması) ve kullanıcının ekranındaki rakamların
küçültülmüş hâliyle bakiye hesabı: toplam TEK sayıyor, Genel ve Resmi kırılımı Muhasebe'yi
İÇERİYOR.

> **Kalıp:** ekrandaki ETİKET bir şey vaat ediyorsa, hesabın da onu yapıp yapmadığı ölçülmeli.
> "(ikisine de)" yazısı aylardır oradaydı ve kimse doğrulamamıştı. Bu oturumdaki "kod eksik
> yazıyor ama sebebi başka" ve "boş liste = özellik yok" bulgularıyla aynı aile: arayüzün SÖZÜ ile
> kodun DAVRANIŞI arasındaki sessiz fark.

### 7t. MUHASEBE DEFTERİ TEK KAYDA İNDİ (6 Eylül, v1.157.0)

**Kullanıcı:** *"Bu mantıkta arka planda nasıl işliyor? 2 fiş mi kaydediyor? Bence tek fiş olmalı,
kod verip ona göre çekmeli."* → sonra: **"Tek kayda düşsün, çok önemli."**

Kullanıcı haklıydı ve kodda İKİ FARKLI YÖNTEM vardı:
- **Kasa/banka:** tek kayıt, `defter` alanı, `defterKapsar` ile kapsam (7s'de düzeltilen taraf).
- **Cari (fiş):** "Muhasebe" seçilince İKİ kayıt — `defter:"Genel"` + `defter:"Resmi"`, `esId` ile
  bağlı.

> **Kullanıcının endişesi ölçüldü: STOK ÇİFTLENMİYORDU.** `078-fisyaz`'ta stok hareketi kalem
> başına tek kez yazılıyor (`kimlikler.get(k)`); ikizleşme yalnızca cari hareketindeydi. Yine de
> gerekçe geçerliydi.

**İkiz yöntemin bedeli:** `esId` kodda 34 yerde geçiyordu — silerken ikizi bul (`079-fisgerial`),
toplarken ikizi sayma (`110-navigasyon`, `160-urunkarti`), buluta yazarken eşleşmeyi koru
(`035-sema`), denetimde çiftin kopmadığını kontrol et (`125-veridenetimi`). Her yeni ekran bu
istisnayı hatırlamak zorundaydı; hatırlamazsa **cari bakiyesi iki katı** çıkıyordu.

**Yapılanlar:**
- **Göç** (`esIkizleriBirlestir`, saf fonksiyon): mevcut ikiz çiftler tek kayda birleşiyor,
  `defter: "Muhasebe"` oluyor, `esId` düşüyor. Açılışta hem BULUT hem YEREL yolda çalışıyor.
- **Dört yazıcı** tek kayda çevrildi: `078-fisyaz`, `152-stok` (cari köprüsü), `205-muhasebe`,
  `265-carikart`.
- **Okuyucular** tek kurala bağlandı: `cariBakiyeleri`, cari kartı defter sekmeleri ve listeleri,
  ekstre (`275-yazdir`). Hepsi artık `defterKapsar`dan geçiyor.

> ### GÖÇTE KRİTİK NOKTA — GENEL İKİZİN KİMLİĞİ KORUNUYOR
> Stok hareketi, fiş yazılırken GENEL ikizle **AYNI kimliği** alıyor (`kimlikler.get(k)`). Resmi
> olanın kimliğini tutsaydık stok ile cari arasındaki bağ kopar ve **fiş geri alınamaz** hâle
> gelirdi. Birim testi bu bağı ayrıca ölçüyor.

**Yetim yarımlara DOKUNULMUYOR:** eşi silinmiş bir kayıt kendi defterinde kalıyor. Onu "Muhasebe"
yapmak, kullanıcının silmediği bir deftere kayıt eklemek olurdu; veri denetimi bu durumu zaten
"yetim eş kayıt" olarak bildiriyor.

**`esId` genişletmesi `fisGeriAl`da DURUYOR** — göç açılışta çalışıyor ama başka cihazdan gelen ya
da yedekten dönen veride ikiz kalabilir. Yalnızca birini silmek diğerini yetim bırakır.

**Doğrulama:**
- `birim-defter.js` — göç: ikizin birleşmesi, GENEL kimliğin korunması, `esId`nin düşmesi, yetim
  yarımın korunması, ikinci göçün bir şey değiştirmemesi ve **bakiyenin göçten etkilenmemesi**.
- `birim-fisyaz-gerial.js` yeniden yazıldı: kalem başına TEK kayıt, defterin "Muhasebe" olması,
  ikiz bağının olmaması, kimliğin stok hareketiyle aynı olması, geri almanın temiz dönmesi; ayrıca
  **eski ikiz veride yalnız biri verilse de ikisinin silinmesi**.

> **Kalıp:** aynı kavramın iki farklı saklama biçimi, er ya da geç birinin diğerinden gevşek
> kalmasıyla sonuçlanır. 7s'deki hata (kasa tarafında Muhasebe hiçbir deftere girmiyordu) tam da
> iki biçimin farklı yerlerde farklı varsayımlar üretmesiydi.

#### AÇIK KALAN

- `esId` alanı şemada ve okuma yolunda DURUYOR (eski veri için). Yeni kayıtlarda yazılmıyor;
  bir süre sonra kimsede kalmazsa şemadan da çıkarılabilir.
- `125-veridenetimi`'ndeki "yetim eş kayıt" denetimi duruyor — eski veriyi kontrol etmeye devam
  ediyor, yeni kayıtlarda hiç tetiklenmiyor.

### 7u. GÖRSELLER AYRI ANAHTARA TAŞINDI (6 Eylül, v1.158.0)

Notun uzun süredir taşıdığı "yapısal sorun" maddesi. Kullanıcı sıradaki işi sorunca öncelik olarak
önerildi ve onaylandı.

**Sorun:** ürün görselleri (`kapakResmi`, `renkResimleri`) ürün kaydının İÇİNDE, bütün ürünler de
TEK yerel anahtarda (`stok:items`). `guvenliYaz` 5 MB'ı aşan kaydı **depoya sormadan reddediyor**.

> **Sınır tarayıcının değil, UYGULAMANIN kendi kuralı.** Depo v1.69.0'da IndexedDB'ye taşındı ama
> `DEPO_SINIRI` kontrolü kaldı. Yani "IndexedDB'ye geçtik, sorun çözüldü" varsayımı yanlıştı —
> işe başlamadan önce ölçüldü.

Doldurduğunda **STOK KAYDEDİLEMEZ** hâle geliyor: özellik kaybı değil, çalışmayı durduran bir hata.
Katalog (7b) ve fotoğrafla bulma (7a) görsel kullanmayı teşvik ettiği için sınıra gidişi biz
hızlandırmıştık.

**BULUT TARAFI SIKIŞMIYOR** — bu da ölçüldü: `urunler` tablosunda her ürün KENDİ satırında ve
görselleri o satırda. Sıkışan yer yalnızca yerel tek anahtar. Bu yüzden **şema değişmedi, SQL
gerekmedi**; çözüm tamamen yerel tarafta kaldı.

**Çözüm:** görseller yerelde ürün başına ayrı anahtarda (`gorsel:<urunId>`). `stok:items` görselsiz
yazılıyor, açılışta geri birleştiriliyor.

**UYGULAMANIN GERİ KALANI DEĞİŞMEDİ.** Bellekteki ürün nesnesi görsellerini taşımaya devam ediyor;
ayrım yalnızca KALICILAŞTIRMA anında oluyor. Katalog, ürün kartı, etiket yazdırma, görsel
eşleştirme — hiçbirine dokunulmadı. Alternatif (her okuma yerini `gorselGetir(urunId, renk)`
çağrısına çevirmek) onlarca dosyaya yayılan bir değişiklik olurdu.

**Ayrıntılar:**
- Alanlar SİLİNMİYOR, BOŞALTILIYOR (`kapakResmi: ""`, `renkResimleri: {}`): yok olurlarsa bulut
  şeması alanı `{}` yerine `null` sanabilir.
- Birleştirmede ÜRÜNDE ZATEN GÖRSEL VARSA dokunulmuyor — buluttan okunan kayıt daha günceldir.
- `gorselFarki`: yalnız DEĞİŞEN görseller yazılıyor, ürünü silinen ya da görseli kaldırılan
  anahtarlar siliniyor. Her kayıtta hepsini yazmak, tek bir miktar değişikliğinde onlarca
  megabaytı diske geri yazmak demekti.
- Görsel yazımı stok yazımını BEKLETMİYOR ve hatası stok kaydını düşürmüyor: görsel kaybı can
  sıkıcı, stok kaybı iş durduran bir şey.
- `tabloYaz`a dördüncü parametre eklendi (`yerelKayitlar`): yerele başka bir hâl yazılabiliyor.

> ### DENETİM 9'A GEREKÇELİ MUAFİYET EKLENDİ
> Katman denetimi haklı olarak uyardı: `guvenliYaz` doğrudan çağrılıyor, "değişiklik buluta
> gitmez". Burada bilinçli — görsel buluta ÜRÜN SATIRINDAN gidiyor, bu anahtarlar yalnız yerel
> yansıma. Denetleyicinin anahtar adına dayalı muafiyet listesi şablon dizesiyle kurulan
> anahtarları göremiyor ve "neden muaf" bilgisini denetleyicinin içinde tutuyordu. Projenin kendi
> kuralına uyularak `katman-muaf: <gerekçe>` etiketi eklendi (bkz. matris-muaf, fis-muaf).

**Doğrulama:**
- `test/birim-gorsel-depo.js` — ayırma, birleştirme, bulut hâlinin ezilmemesi, farkın yalnız
  değişeni yazması, yetim anahtarın silinmesi, boş görselin saklanmaması.
- `test/senaryo-gorsel-depo.js` — gerçek tarayıcıda: `stok:items` **133 KB → 2 KB**, görsel ayrı
  anahtarda, ekranda görünüyor ve **yeniden açılışta geri geliyor**.

> **Senaryo yazarken:** gerçek `reload()` ölçüm yapmıyor — test altyapısı depoyu `addInitScript`
> ile kuruyor ve yeniden yükleme ORİJİNAL tohumu geri koyuyor. Bölünmüş depo ikinci bir uygulama
> örneğine verilerek "kaydedilmiş hâlden açılış" taklit edildi.
>
> `senaryo-gorsel-secici` ALTIN ÇIKTISI değişmedi ama okuma yeri değişti: görseli `stok:items`
> içinden okuyordu, artık `gorsel:<urunId>` anahtarından okuyor. Ölçülen davranış (kaydedildi,
> veri URL'i, küçültüldü) aynı.

#### AÇIK KALAN

- Görseller HÂLÂ ürün kaydının içinde BULUTA gidiyor. Orada sıkışma yok ama her ürün güncellemesi
  görselleri de yeniden gönderiyor; bant genişliği açısından ayrı bir tabloya taşımak ileride
  düşünülebilir (SQL gerektirir).
- `DEPO_SINIRI` hâlâ 5 MB. IndexedDB'de bu sınır teknik olarak gereksiz; yükseltmek ayrı bir karar.

### 7v. AÇILIŞ FİŞİ (6 Eylül, v1.159.0)

**Kullanıcı (31 Ağustos'tan beri bekleyen istek):** *"Her hareket fişe bağlı olsun, stok hareketten
türetilsin."*

**Neden şimdiye kadar mümkün değildi.** Miktar İKİ YERDE duruyor:
- `variants[].miktar` — ekranlarda okunan sayı (**ÖNBELLEK**)
- `hareketler[]` — o sayının nereden geldiğini anlatan kayıtlar (**DEFTER**)

İkisi bugüne kadar birbirinden bağımsızdı: ilk kurulumda ve elle stok girişinde miktar yazıldı ama
karşılığında hareket YAZILMADI. Defter önbelleği açıklamıyordu. "Stok hareketten türetilsin"
deseydik açılış bakiyeleri sıfırlanır, **elde olan mal kayıtta yok olurdu**.

**Açılış fişi tam olarak bu boşluğu kapatıyor:** her ürün+varyant için "hareketlerin anlatamadığı
kadarı"nı TEK bir hareket olarak yazıyor. Ondan sonra defter önbelleği eksiksiz açıklıyor.

**MİKTARLAR DEĞİŞMİYOR.** Açılış fişi bir DÜZELTME değil, bir AÇIKLAMA: ekrandaki sayıya
dokunmuyor, yalnız nereden geldiğini kayda geçiriyor. Panelde bu açıkça yazılı ve senaryo ayrıca
ölçüyor — bir tıkla yüzlerce hareket yazan bir düğmenin ne yapıp ne yapmadığı önceden anlaşılmalı.

**Ürün başına TEK fiş numarası** (`ACL-20260906-…`): bir ürünün bütün varyantlarının açılışı tek
bir olaydır. Fiş numarası hareketin hangi olaydan doğduğunu söyler.

**EKSİ AÇILIŞ DA YAZILIYOR.** Hareketler stoktan fazlasını anlatıyorsa açılış negatif olur.
Kırpmak, "eksi stok girişlerin eksik olduğu bilgisidir" kuralına aykırı olurdu.

**İKİNCİ ENGEL — GEÇMİŞ KIRPMASI:** `HAREKET_GECMIS_SINIRI` ürün başına 1000 hareket tutuyor.
Kırpılan hareketler toplamdan da düşüyor, yani fark yeniden açılıyor. Bu yanlış alarm DEĞİL, gerçek
bir kopukluk — ve açılış fişi bunu da soğuruyor: kırpma olan üründe ikinci bir açılış fişi kesmek,
kaybolan geçmişi tek satıra indirmek demek. Sayı doğru kalıyor; ayrıntı kaybı zaten kırpmanın
kendisinden geliyor.

**Nerede:** Tanımlar → Veri Denetimi. Panel açığı satır satır gösteriyor (ilk 50), kesme düğmesi
kaç satır yazacağını söylüyor. Açık yoksa panel bunu da söylüyor — "her miktarın bir fişi var".

**Tutarlılık denetimine yeni madde:** `STOK_DEFTER_AYRISMASI`. Açılış fişi kesilmeden bu denetim
HER ÜRÜNDE bulgu verirdi, o yüzden bulgu doğrudan "Açılış Fişi ile tek satıra dökülebilir"
tavsiyesiyle geliyor.

> ### DENETİM 16 YENİ KAPIYI YAKALADI
> `acilisFisleriUret` hareket yazan yeni bir yol; kapı listesinde olmadığı için bulgu verdi.
> Listeye GEREKÇESİYLE eklendi: bir kereye mahsus, ticari fiş değil, defterin başlangıç noktası.
> `fisYaz`dan geçirilemez — `fisYaz` cari/sipariş/ambalaj yan etkileri olan bir işlem, açılışın
> hiçbiri yok.

**Doğrulama:**
- `test/birim-acilis-fisi.js` — fark hesabı (hareketsiz / kısmen açıklanmış / tam açıklanmış /
  hareket fazlası), ürün başına tek fiş, varyantların aynı fişe bağlanması, **açığın sıfırlanması**
  ve ikinci çağrının hareket üretmemesi.
- `test/senaryo-acilis-fisi.js` — gerçek tarayıcıda: panel açığı buluyor, kesince 5 satır / 2 fiş
  yazılıyor, hepsinin fiş numarası var, **miktarlar değişmiyor**, açık kapanıyor ve denetimde
  ayrışma bulgusu kalmıyor.

#### AÇIK KALAN

- **Önbellek hâlâ serbestçe yazılabiliyor.** Notun asıl hedefi `variants[].miktar`ı yalnız
  `fisYaz`/`fisGeriAl`ın değiştirebilmesiydi; açılış fişi bunun ÖN ŞARTIYDI, kendisi değil. Artık
  ayrışma ÖLÇÜLEBİLİYOR (denetim madde `STOK_DEFTER_AYRISMASI`), ama yazma yolları hâlâ açık —
  kapatmak ayrı bir iş ve elle stok girişi gibi meşru yolların hepsini fişe bağlamayı gerektirir.
- Geçmiş kırpması sürüyor; kırpma olan üründe açık yeniden doğar ve ikinci açılış fişi gerekir.
  Kırpmayı kaldırmak (ya da kırparken açılışa toplamak) ayrı bir karar.

### 7y. FİŞTEN PEŞİN TAHSİLAT / ÖDEME (6 Eylül, v1.160.0)

**Kullanıcı:** *"Ödeme şekline göre kasa/banka hareketi — fiş şu an yalnız borç yazıyor, kasadan
para çıkarmıyor."*

> ### İŞE BAŞLAMADAN ÖNCE SÖYLENEN RİSK
> Fiş formunda ödeme şekli HER ZAMAN seçili (varsayılan "Nakit") ve bugüne kadar hiçbir şey
> yapmıyordu. Otomatik kasa hareketi açsaydık, bugüne kadar varsayılanı bırakarak kesilmiş
> **vadeli/açık hesap fişleri de kasayı boşaltırdı**. Listede "Açık Hesap" seçeneği yok — yani
> sistem "bu fiş peşin mi" sorusunu hiç sormuyordu.

> ### KAPSAM KARARLARI (kullanıcı, 6 Eylül)
> 1. Para **yalnızca fişte kasa/banka seçilirse** hareket eder. Boş bırakılırsa fiş eskisi gibi
>    yalnız cari borcu yazar — **varsayılan davranış değişmedi**.
> 2. Hesap **elle** seçilir.
> 3. **Kısmi olabilir**: fişin bir kısmı peşin, kalanı açık hesap.

**ÇEK/SENET DIŞARIDA, bilinçli:** orada kasadan para ÇIKMAZ, para vadesinde hareket eder ve çekler
kendi defterinde takip ediliyor. Ödeme şekli Çek/Senet seçilince peşin alanı GİZLENİYOR — alanı
orada göstermek, olmayan bir işlemi vaat etmek olurdu.

**ALTYAPI HAZIRDI:** kasa/banka hareketi ile cari hareketi arasında `muhasebeBagId` bağı zaten
vardı (kasa tarafından kurulan yön) ve `fisGeriAl` bu bağı tanıyordu. Yeni bir mekanizma değil,
var olanı fiş tarafından da kurmak gerekti.

**Yön:** alışta borçlanıyoruz, peşin ödersek kasadan **ÇIKAR**; satışta alacaklıyız, peşin tahsil
edersek kasaya **GİRER**. Fişin yönünün tersi.

**Peşin tutar fiş toplamını AŞAMAZ:** aşarsa cari ters yöne geçer ve "bu carinin bize borcu var"
gibi görünür. Fazla ödeme meşru bir işlem ama kendi kaydı olmalı, fişin içine sıkıştırılmamalı.
Hesap seçilince tutar fişin toplamıyla ön doluyor — en sık durum peşinin tamamı.

#### Yolda çıkan iki hata

**1. Peşin kaydı `yeniCariler`e hiç girmiyordu.** Blok, cari listesinin güncellendiği satırdan
SONRA duruyordu; `cariHareketleri` dizisine giriyor ama cariye işlenmiyordu. Uygulama yolunda
görünmüyordu çünkü orada `addCariHareketFromStok` diziyi ayrıca işliyor — yani hata yalnız
`fisYaz`ın döndürdüğü `cariler` alanındaydı ve birim testi yakaladı.

**2. Geri alma peşin ayağını bulamıyordu.** Peşin cari kaydının kimliği kalemlerin kimliğinden
farklı; çağıran yalnız kalem kimliklerini veriyor. Toplanmasaydı fiş silinir ama tahsilat kaydı ve
kasa hareketi ortada kalırdı — **cari bakiyesi kalıcı olarak yanlışa dönerdi**. `fisGeriAl`a dar
bir genişletme eklendi: aynı fiş numarasına sahip VE `muhasebeBagId` taşıyan cari kayıtları. Yalnız
fiş numarasına bakmak, aynı fişe elle eklenmiş başka kayıtları da silerdi.

> ### DENETİM 16 YİNE ARADA DURDU
> Kasa hareketini `stokFisiKaydet` içinde yerleştirince o fonksiyon "hareket yazan yeni bir kapı"
> gibi göründü. Hareketi üreten `fisYaz`, oradaki iş yalnızca yerleştirme — tıpkı
> `addCariHareketFromStok` gibi. Ayrı bir geçide çıkarıldı (`muhasebeyePesinIsle`) ve listeye
> "geçit, kendisi kapı değil" notuyla eklendi. Kapı sayısı ölçüsünün anlamlı kalması buna bağlı.

**Doğrulama:**
- `birim-fisyaz-gerial.js` — hesap seçilmezse kasa hareketi olmaması, kasa hareketinin üretilmesi,
  alışta çıkış yönü, kısmi tutar, cariye kapatan kaydın yazılması, bağın aynı olması ve **fiş geri
  alınınca kasa bağının bildirilmesi**.
- `senaryo-pesin-tahsilat.js` — formda seçicinin görünmesi, varsayılanın "peşin yok" olması ve
  ödeme şekli Çek seçilince alanın gizlenmesi.

### 7z. CARİDEN TAHSİLAT/ÖDEMEDE KASA SEÇİMİ (6 Eylül, v1.161.0)

**Kullanıcı:** *"Cariden ödeme/tahsilatta da kasa banka seçilmesi gerekli — ödemenin nereye
yazılacağı ile alakalı."*

Cari kartından girilen Tahsilat/Ödeme yalnız cari hareketi yazıyordu. **Tahsilat/ödeme tanımı
gereği bir para hareketidir**: hesap yazılmazsa cari bakiyesi düzelir ama para havada kalır ve
kasa ile cari birbirini tutmaz.

Artık form Tahsilat/Ödeme'de "Hangi kasaya/bankaya girdi?" (ya da "çıktı?") soruyor. **Tahsilat
kasaya GİRER, ödeme kasadan ÇIKAR.** Bağ `muhasebeBagId` ile kuruluyor — fişteki peşin ayağın
(7y) ve kasa ekranından girilen hareketin kullandığı bağın aynısı. **Üç yol da aynı çifti
üretiyor**, dolayısıyla geri alma ve denetim üçünü de tanıyor.

**ALIŞ/SATIŞ HAREKETİNDE ALAN ÇIKMIYOR:** onlar cariye borç yazar, para hareket ettirmez —
peşin kısmı FİŞ formunda seçiliyor. **Çek/senette de çıkmıyor:** para vadesinde hareket eder.

**YALNIZ AYNI PARA BİRİMİNDEKİ HESAPLAR listeleniyor.** Farklı birimdeki bir hesaba tutarı olduğu
gibi yazmak kasa bakiyesini sessizce bozardı; çevirmek ise "hangi kurla" sorusunu doğurur ve o
karar bu formun işi değil. Uygun hesap yoksa sebebi yazılıp yalnız cari kaydı yazılıyor —
dead-end yok.

> **Yolda temizlenen ölü dal:** ikiz kayıt kaldırıldığında (7t) `submitHareket` içindeki dallanma
> yarım kalmıştı — `resmiId` üretiliyor ama hiç kullanılmıyor, iki dal da aynı şeyi döndürüyordu.
> Ölü kod denetimi bunu görmüyor (yerel değişken, prop değil).

**Doğrulama:** `senaryo-pesin-tahsilat.js` — alanın Tahsilat'ta çıkması, 750 ₺'lik tahsilatın
kasaya **Giriş** olarak yazılması ve cari kaydıyla bağlanması.

### 7z-2. KUR ÇEVİRİCİ (6 Eylül, v1.162.0)

**Kullanıcı:** *"Yeri gelmişken kur değiştirici ekleyelim. TL kasasına TL ödeme yapıp cariye başka
kur ile işlemek gibi, daha önce yaptık."*

7z'de hesap listesi **aynı para birimiyle SÜZÜLÜYORDU** — gerekçesi "farklı birimdeki hesaba
tutarı olduğu gibi yazmak kasa bakiyesini bozar, çevirmek ise hangi kurla sorusunu doğurur ve o
karar bu formun işi değil"di. Kullanıcı o kararın kendisine ait olduğunu söyledi: **dolar borcuna
TL kasadan tahsilat** gerçek bir iş. Süzgeç kalktı, çevrim eklendi.

Ters yön Muhasebe ekranında ZATEN VARDI (kasa tutarı girilir, "Cariye İşlecek Tutar" ayrıca
hesaplanır, `cariTutar`/`cariPB` alanlarında saklanır). Buradaki kayıt **aynı alan adlarını**
kullanıyor, iki yön birbirine benzesin diye.

> ### KUR SORULMUYOR, TÜRETİLİYOR
> Alan "Hesaba işlenecek tutar", kur ise altında hesaplanıp gösteriliyor. Pratikte iki tutar da
> biliniyor ("100 dolarlık borcuna 4.200 TL ödedi"); kuru yazdırıp tutarı hesaplatmak,
> kullanıcının BİLDİĞİ sayıyı ondalık kur oyunuyla yakalamaya çalışmak olurdu. Alan, hesap
> seçilince güncel kurla ÖN DOLDURULUYOR — bilinmiyorsa tahmin hazır, biliniyorsa üzerine yazılıyor.

**Çevrimde tutar ZORUNLU:** boş bırakılırsa kasaya sıfır yazılır ve para kaybolurdu.

Kayda giren alanlar: kasa hareketinin `tutar`ı **hesabın kendi biriminde**, `cariTutar`/`cariPB`
karşı tarafta, `kur` ikisinden türetilmiş.

**Doğrulama:** aynı senaryoda — 100 USD'lik tahsilat TL kasaya **4.200 TRY** olarak giriyor,
`cariTutar: 100`, `cariPB: "USD"`, `kur: 42`.

### 7z-3. EKSTRE SIRALAMASI VE KASA ADI (6 Eylül, v1.163.0)

**Kullanıcı (ekran görüntüsüyle):** *"Sıralamayı fiş id'ye göre yap ve bazılarında hangi kasaya
işlendiği yazılı bazılarında yazılmamış — tamamında hangi kasaya yazılmış görelim."*

#### Sıralama

Sıralama ZATEN fiş numarasına göreydi; sorun oydu. **Fiş sayacı ÖN EKE GÖRE ilerliyor**
(`fisNoSiradaki`, kök = `"ODM-20260906-"`), yani `ODM-002` ile `THS-002` farklı anlara ait iki ayrı
olay. Düz metin sıralaması önce bütün ODM'leri sonra bütün THS'leri getiriyordu; ekranda saatler
`21:56 → 21:55 → 21:54 → (saatsiz) → 21:55 → 21:55` diye gidiyordu.

> **Fiş numarası tek başına sıralama anahtarı OLAMAZ.** Kronoloji ancak zamandan çıkar; fiş
> numarası aynı andaki kayıtlar için İKİNCİL anahtar olarak işe yarar (toplu işlemlerde kararlı
> ve okunabilir sıra).

Zaman birincil, fiş numarası ikincil oldu. Ayrıca `cariHareketleriGrupla` `zaman` alanını
TAŞIMIYORDU — yalnız `tarih` taşıyordu, dolayısıyla aynı günün kayıtları gün içinde rastgele
sırada görünüyordu. Alan gruba eklendi.

**Ölçüm:** karışık girilmiş dört fiş (THS-008/010, ODM-002/003) artık `010 → 003 → 008 → 002`
sırasında, yani `21:56 → 21:55 → 21:54 → 21:53`. ODM ve THS iç içe.

#### Hangi kasaya işlendiği

Muhasebe ekranından girilen hareket hesabı açıklamaya yazıyordu (`"Tahsilat (TL Kasa)"`); cari
kartından girilen yazmıyordu. **Aynı bilgi iki yoldan girilince biri hesabı söylüyor, diğeri
söylemiyordu** — ekstreye bakan kişi paranın nereye gittiğini yalnız bazı satırlarda görebiliyordu.
Cari kartı yolu da hesabı yazıyor artık.

> **Yolda:** açıklama bloğu uzayınca 12. denetim (fişsiz hareket) satırı işaretledi — `fisNo`
> yayılan `ortak` nesnesinde ama denetimin 30 satırlık penceresinden çıkmıştı. Alan hareket
> satırında AÇIKÇA yazıldı; denetim gevşetilmedi.

**Doğrulama:** `senaryo-pesin-tahsilat.js` — cari kartından girilen tahsilatın ekstrede
`Tahsilat (TL Kasa)` olarak görünmesi.

### 7z-4. KUR HER YERDE DÖVİZ ÜZERİNDEN SORULUYOR (6 Eylül, v1.164.0)

**Kullanıcı (ekran görüntüsüyle):** *"Burada ters mantık var. Ben EUR kurunu biliyorum, sadece onu
girip kendi işlemini yapsın; kura yapılan kafa karıştırıcı. Ben EUR kurunun 56 olduğunu biliyorum
sadece. Başka yerlerde de kontrol et."*

Muhasebe formu kuru **`1 TRY = ? EUR`** yönünde soruyordu — ekranda `0,0179`. Piyasada kur her
zaman "1 döviz kaç TL" diye konuşulur; ondalıklı ters kur hem yazması zor hem yuvarlama hatasına
açık.

**KURAL (`kurSorusu`):** taraflardan biri TRY ise soru DÖVİZ üzerinden sorulur (`1 EUR = ? TRY`)
ve hesap yönü buna göre ayarlanır. İki taraf da dövizse çapraz kur kaçınılmaz; o zaman doğrudan
sorulur (`1 USD = ? EUR`).

`bolme` alanı yönü taşıyor: TL kasadan EUR cariye **3655 ₺ ÷ 56 = 65,27 €**. Çarpsaydı 204.680 €
gibi anlamsız bir sayı çıkardı.

> **İki kopya birleştirildi.** Kur yönü `210-hesaplar`da hem KAYDETME hem EKRAN tarafında AYRI AYRI
> hesaplanıyordu. Biri düzeltilip diğeri unutulsaydı ekranda bir tutar görünüp kayda başkası
> yazılırdı. Artık ikisi de `kurSorusu`/`kurUygula`dan geçiyor.

**Diğer yerler kontrol edildi (kullanıcı istedi):**
- **Fiş formu (`255-stokfisi`)** — zaten doğru: *"Kur kutusu HER ZAMAN '1 yabancı = ? TRY'
  yönünde sorulur."* Dokunulmadı.
- **Cari kartı (`265-carikart`, 7z-2)** — kur girilmiyor, iki tutardan türetiliyor. Ama GÖSTERİM
  ham oranı yazıyordu: TL cari + döviz kasa durumunda `1 TRY = 0,0179 EUR` çıkıyordu. Gösterim de
  `kurSorusu`ndan geçirildi.

**Doğrulama:**
- `birim-defter.js` — TL kasa/EUR cari (bölme), EUR kasa/TL cari (çarpma), çapraz kur, önerinin
  dövizin TL fiyatı olması, kullanıcının sayısı: `3655 → 65,27`.
- Tarayıcıda: muhasebe formunda etiketin `Kur (1 EUR = ? TRY)` olması ve 3655 ₺ girilince
  "Cariye İşlecek Tutar" alanının **65,27** göstermesi.

### 7z-5. RENKLENDİRME VE YİNELENEN AÇIKLAMA (6 Eylül, v1.165.0)

**Kullanıcı:** *"Kasa ve cari hareketlerinde ödeme ve tahsilat renklerine göre renklendir. Alt alta
2 kere Nakit yazıyor onu da kontrol et."*

#### Yinelenen açıklama

Ürünsüz bir kayıtta (tahsilat, ödeme) açıklama **İKİ KEZ** çiziliyordu: bir kez `ilk.aciklama`
olarak, bir kez de `yapisizHareketler` listesinde. `ilk` ürünsüz olduğu için o listenin de
içindeydi. Üstteki blok artık yalnız aşağıdaki listenin kapsamadığı durumda çiziliyor.

#### Renklendirme

`HAREKET_TIPI_RENK` zaten vardı (Tahsilat yeşil `#4E6B4E`, Ödeme kiremit `#B85C2E`, Alış kahve,
Satış mavi) ama yalnız FORM düğmelerinde kullanılıyordu; listelerde her rozet aynı kahverengiydi.
Ekstreye bakan kişi paranın hangi yöne gittiğini ancak tutar sütununa bakarak anlıyordu.

**Tek kaynak `hareketIslemTipi`:** `islemTipi` alanı yeni kayıtlarda var, eskilerde yok; fiş
numarası ön eki (THS-/ODM-/AF-/SF-) en güvenilir ikinci kaynak, açıklama metni son çare. Üç
kaynağı her ekranda ayrı ayrı yorumlamak, aynı harekete iki ekranda farklı renk vermek demekti.
Cari ekstresi ve kasa listesi aynı fonksiyonu ve aynı renk tablosunu kullanıyor.

Kasa listesine ayrıca işlem tipi ROZETİ eklendi — bir satırın tahsilat mı ödeme mi olduğu daha
önce yalnız Giriş/Çıkış sütunundan anlaşılıyordu.

**Doğrulama:** `senaryo-pesin-tahsilat.js` — açıklamanın bir kez görünmesi ve tahsilat rozetinin
`rgb(78, 107, 78)` (yeşil) olması.

### 7z-6. KUR ÇEVİRİCİ ÇİFT YÖNLÜ (6 Eylül, v1.166.0)

**Kullanıcı:** *"Cariye işlenecek p.birimi ters de çalışsın. Cari için 42000 TL ödeme verdi ve
1000 USD tutuluyor; kur ayarlamak yerine cariye işlenecek olan yere 1000 yazdığımızda kuru otomatik
düzenlesin. Bu kural TÜM p.birimi çeviricilerde olsun."*

**Hangi sayının bilindiği duruma göre değişiyor:** bazen kur ("bugün dolar 42"), bazen karşı
taraftaki tutar ("1000 dolara sayıyoruz"). Tek yönlü bir form, bilinmeyeni bilinenden ELLE
hesaplatıyordu — ondalıklı kur girip tutmasını beklemek gibi.

**`kurTersHesapla(tutar, hedefTutar, bolme)`** — `kurUygula`nın tersi, yön yine `kurSorusu`dan
geliyor. İki fonksiyon aynı `bolme` bayrağını kullanıyor, yani gidiş ve dönüş birbirini tutuyor
(birim testi bunu ayrıca ölçüyor: 42000 → kur → 1000 → aynı kur).

**Uygulandığı yerler:**
- **Muhasebe kasa formu:** "Cariye İşlecek Tutar" okunur bir kutuydu, artık YAZILABİLİR.
- **Cari kartı tahsilat/ödeme:** tutar zaten yazılabiliyordu (7z-2), şimdi KUR kutusu da eklendi.

> **İKİ ALAN TEK GERÇEĞİN İKİ YÜZÜ.** Birine yazılınca diğeri güncelleniyor: kur yazılınca hedef
> tutar serbest bırakılıyor (yeniden kurdan hesaplanıyor), hedef tutar yazılınca kur geri
> hesaplanıyor. Bırakılmasaydı ekranda birbirini tutmayan bir çift kalırdı — ve hangisinin kayda
> gittiği belirsiz olurdu.

**Fiş formu (`255-stokfisi`) DIŞARIDA, gerekçesiyle:** oradaki kur para birimi BAŞINA sorulur ve
toplam ONLARCA satırdan hesaplanır. "Toplam şu olsun" demek, hangi satırın kurunun değişeceğini
belirsiz bırakırdı — tek kur, tek satır varsayımı orada geçerli değil.

**Doğrulama:**
- `birim-defter.js` — `42000 TL / 1000 USD = 42`, ters yönde (döviz kasa) aynı sonuç, gidiş-dönüş
  tutarlılığı, sıfır girdilerde `null`.
- `test/senaryo-kur-cevirici.js` — tarayıcıda üç adım: tutar girilince kur ön doluyor (42 → 1000),
  hedefe **800** yazılınca kur **52,5** oluyor, kura **40** yazılınca hedef **1050** oluyor.

> `senaryo-pesin-tahsilat` altın çıktısında `kurGosteriliyor` false → true oldu: cari kartında kur
> artık gösteriliyor (önceden yoktu). Beklenen iyileşme.

### 7z-7. EKSTREDE PARANIN NEREYE İŞLENDİĞİ (6 Eylül, v1.167.0)

**Kullanıcı:** *"Cari hesap hareketlerinde ödeme/tahsilatın nereye işlendiği bilgisi görünsün.
1000 USD ödeme, kasa TL gibi."*

Ekstre cari tarafındaki tutarı gösteriyordu (1000 $) ama paranın hangi kasaya, hangi para
biriminde ve NE KADAR girdiğini göstermiyordu. Para birimleri farklı olduğunda bu bilgi ekstrede
hiç yoktu — 1000 dolarlık ödemenin kasadan 42.000 ₺ olarak çıktığı yalnız Muhasebe ekranında
görülebiliyordu.

**ALAN OLARAK TAŞINIYOR, metne gömülmüyor:** `hesapAd`, `hesapPB`, `hesapTutar`. Açıklama metninden
ayrıştırmak kırılgan olurdu — açıklamayı kullanıcı değiştirebiliyor.

**SQL GEREKMEDİ:** alanlar `cari_hareketleri.ek` (jsonb) içinden gidiyor; okuma tarafı `ek`i kayıt
köküne zaten açıyor. Aynı yolla `muhasebeBagId` de artık buluta gidiyor — daha önce yalnız yerelde
duruyordu ve yenilemeden sonra kasa/cari eşleşmesi kopuyordu.

**Üç yazma yolunun üçüne de eklendi:** cari kartı (7z), fişin peşin ayağı (7y), muhasebe ekranı.
Biri eksik kalsaydı ekstre bazı satırlarda bilgiyi gösterip bazılarında göstermezdi — 7z-3'te
düzeltilen sorunun aynısı.

**Tutar yalnız PARA BİRİMLERİ FARKLIYSA yazılıyor:** aynı birimde cari sütunundaki sayının aynısı
olurdu ve satırı gereksiz uzatırdı. Ekranda:
- Farklı birim → `Nakit · TL Kasa 42.000 ₺`
- Aynı birim → `Nakit · TL Kasa`

**Doğrulama:** `senaryo-pesin-tahsilat.js` — rozetin hesap adını taşıması; ayrıca elle kurulan
veriyle 1000 USD / 42.000 ₺ satırının `Nakit · TL Kasa 42.000 ₺` olarak basıldığı ölçüldü.

### 7z-8. ÇEK CİROSU (6 Eylül, v1.168.0)

**Kullanıcı:** *"Elimizdeki çekleri ciro edebilmek için ya cariden ya da çek ekranından işlem
yapabileyim. Çek içine girip 'ciro et' dediğimizde başka cariye çıkış yapsın. Kur çevirici
mantığını unutma."*

Çek durumu zaten bir açılır listeydi ve içinde "Ciro Edildi" seçeneği vardı — ama yalnız ETİKETİ
değiştiriyordu. Kime verildiği kaydedilmiyor, cariye hiçbir hareket yazılmıyordu.

**CİRO BİR ÖDEMEDİR:** elimizdeki çeki başka bir cariye vermek, o cariye olan borcumuzu azaltır.
Yön kuralı da öyle (`hareketYonu("Ödeme")` → "Borç"), ayrı bir kural yazılmadı.

> **KASA HAREKETİ YOK — bilinçli.** Çek nakit değil; para vadesinde el değiştirir. Kasadan düşmek,
> olmayan bir para çıkışı yazmak olurdu. Çek portföyden çıkıyor ve portföy toplamı zaten yalnız
> "Portföyde" durumundakileri sayıyor.

**KUR ÇEVİRİCİ DAHİL** (kullanıcı ayrıca hatırlattı): çek TRY olabilir ama cariye USD işlenebilir.
Panel `kurSorusu`/`kurUygula`/`kurTersHesapla` üçlüsünü kullanıyor, yani 7z-6'daki gibi **İKİ
YÖNLÜ**: tutara ya da kura yazılabiliyor. Ölçüm: 42.000 ₺'lik çek, USD seçilince **1000 $**.

**Karşı taraf bilgisi 7z-7'nin alanlarıyla taşınıyor** (`hesapAd: "Çek No 12345"`, `hesapPB`,
`hesapTutar`), yani ekstre ikinci bir gösterim yolu yazılmadan çekin kendi tutarını gösteriyor:
`Çek · Çek No 12345 42.000 ₺`.

**Kapılar:**
- Yalnız **PORTFÖYDEKİ** çekte "Ciro Et" çıkıyor — ciro edilmiş ya da tahsil edilmiş bir çeki
  yeniden ciro etmek, aynı çeki iki kez vermek olurdu.
- Çeki VEREN cari, ciro listesinde YOK — kendisine geri ciro anlamsız.
- Uygulama tarafı tek kapı (`cekCiroEt`): iki ekran, birinin çeki portföyden düşürüp diğerinin
  düşürmemesi demekti.

> ### TDZ HATASI YİNE ÇIKTI
> `cekCiroEt`, bağımlılığı olan `addCariHareketFromStok`tan ÖNCE tanımlanmıştı — sayfa açılışta
> "Cannot access before initialization" ile çöküyordu. **Denetim 2 bunu hâlâ yakalamıyor**
> (bileşen içi `const` sırası); notta açık madde olarak duruyor ve bu oturumda ikinci kez ısırdı.
> Tarayıcı senaryosu yakaladı.

**Doğrulama:** `test/senaryo-cek-ciro.js` — iki çekten yalnız portföydekinde düğmenin çıkması,
panelin açılması, USD seçilince 1000/42 hesaplanması, çekin "Ciro Edildi" olup alıcıyı kaydetmesi,
cariye Borç yönünde fiş numaralı hareket yazılması ve karşı tarafta çekin kendi tutarının durması.

#### AÇIK KALAN

- Ciro CARİ KARTINDAN başlatılamıyor; yalnız çek ekranından. Kullanıcı "ya cariden ya da çek
  ekranından" demişti — çek ekranı yapıldı, cari kartına giriş noktası eklenmedi.
- ~~Ciro GERİ ALINAMIYOR~~ — **KAPANDI (v1.226.0, bkz. 7z-43).** Ciro fişi silinince çek
  portföye dönüyor.

#### AÇIK KALAN (7z-7)

- Bu bilgi BUNDAN SONRAKİ kayıtlarda var. Eski hareketlerde `hesapAd` yok; ekstrede yalnız
  açıklama metnindeki "(TL Kasa)" görünür (o da 7z-3'ten sonra girilenlerde). Geriye dönük
  doldurmak `muhasebeBagId` üzerinden mümkün — kasa hareketinden okunup cari kaydına yazılabilir.

#### AÇIK KALAN

- Peşin alanı **serbest fiş formunda** (cari kartı / depo). **Sipariş teslim alma** formunda yok —
  o ayrı bir yol (`siparisGerceklestir`) ve kendi ekranı var. Orada da anlamlı olur.
- ODEME_SEKILLERI listesinde hâlâ "Açık Hesap" yok. Peşin alanı boş bırakmak fiilen o anlama
  geliyor ama ödeme şekli alanı yanıltıcı kalmaya devam ediyor.

### 7z-9. FİŞTEN SİLİNEN KASA KAYDI DA SİLİNSİN (6 Eylül, v1.169.0)

**Kullanıcı:** *"Kasa hareketleri fişler ile bağımsız! Fişlerden sildiğim kasadan silinmiyor!
ÇOK ÖNEMLİ bu bağlantılar."*

Haklıydı ve sebebi tam olarak notun sürekli uyardığı kalıptı: **aynı işi yapan iki yol, biri
eksik.**

- `removeHareketEverywhere` (cari kartından tek hareket silme) → `sonuc.muhasebeBagIdler`ı
  UYGULUYORDU.
- `yetimFisTemizle` (Fişler ekranından fişin tamamını silme) → aynı `fisGeriAl` sonucunu alıyor
  ama o alanı **HİÇ OKUMUYORDU**.

Sonuç: hareket cariden gidiyor, kasada YETİM kalıyor ve **kasa bakiyesi kalıcı olarak şişik**
duruyordu. Ölçüm: fiş silindikten sonra `KASA: 1, CARİ: 0`.

**Ortak fonksiyona alındı** (`muhasebeBaglariniTemizle`) — üçüncü bir silme yolu eklenirse de
oradan geçecek.

> ### İLK DÜZELTME ÇALIŞMADI — ASENKRON STATE
> Temizliği `setMuhasebe((prev) => …)` içinde hesaplayıp dışarıda yazmaya çalıştım. React
> güncelleyicisi ASENKRON: fonksiyon dönerken yeni hâl hazır değil, diske yazılacak nesne `null`
> kalıyordu. Ekranda düzelmiş görünüp DİSKE YAZILMAYAN bir düzeltme — ilk ölçümde `KASA: 1`
> çıkması bunu yakaladı. Yeni hâl artık `setMuhasebe`nin DIŞINDA hesaplanıyor.
>
> **Kalıp:** state güncelleyicisinin içinde hesaplanan bir değer, o fonksiyon dönerken YOKTUR.
> Yan etki (yazma) oradan tetiklenmemeli.

`temel` parametresi: fiş silerken çek kayıtları da gidiyor ve `muhasebe`yi değiştiriyor. Mevcut
state'ten yürüsek o değişikliği geri alırdık; temizlik `sonuc.muhasebe` üzerine uygulanıyor.

**Doğrulama:** tarayıcıda Fişler ekranından tahsilat fişi silindi → `KASA: 0, CARİ: 0`.

### 7z-10. CARİ TİP SEKMELERİ KENDİ RENGİNDE (6 Eylül, v1.169.0)

**Kullanıcı:** *"Müşteri, personel, tedarikçi sekmelerini kendi rengine boyayalım; üzerine
tıkladığımızda daha koyu renk ile yansın, orada olduğumuz belli olsun."*

`CARI_TIP_RENK` zaten vardı (Müşteri yeşil, Tedarikçi kahve, Personel mor) ama renk YALNIZ
seçiliyken görünüyordu; seçili olmayanların hepsi aynı griydi. Yani **renk "hangi tip" değil
"hangisi seçili" bilgisini taşıyordu** — zaten dolgudan anlaşılan bir şey.

Şimdi ikisi farklı iki soruya cevap veriyor: **renk TİPİ**, **dolgu SEÇİMİ** söylüyor. Seçili olan
koyu zemin + açık yazı, diğerleri kendi renginde ama soluk.

**Doğrulama:** `senaryo-pesin-tahsilat.js` — üç sekmenin zemin ve yazı renkleri ölçülüyor.

### 7z-11. ÇEK YAŞAM DÖNGÜSÜ (6 Eylül, v1.170.0)

**Kullanıcı:** *"Çek hareketi 'ciro et' yetersiz bir işlem. Çeki iade et, bankaya tahsil için ver
olmalı (bankaya tahsile ver seçildiğinde banka seçilmeli, takip için hangi bankada tahsil bekliyor).
Onlar için ekran kalabalık olur, 'İşlemler' diye buton ekle, tıklayınca seçtir, açılır pencere.
Ciro edilen çek silinememeli, aşama aşama ilerlediği için. Ciro edilen çekin geçmişi görünmeli.
Çek resmi olmalı, önü ve arkasının çekildiği."*

**Çek tek bir olay değil, bir SÜREÇ.** Durumu tek açılır listeden seçtirmek bu süreci görünmez
kılıyordu; hangi aşamadan hangisine geçilebileceği de yazılı değildi ve "Ciro Edildi" seçmek karşı
tarafta hiçbir kayıt doğurmuyordu.

**Beş işlem, tek tanım tablosu (`CEK_ISLEMLERI`):** Ciro Et · İade Et · Bankaya Tahsile Ver ·
Tahsil Edildi · Karşılıksız Çıktı. Her işlem hangi durumlarda yapılabileceğini KENDİ tanımında
taşıyor; ekran bunu okuyor, kendi kuralını koymuyor.

- Ciro edilmiş çekte hiç işlem YOK — elimizden çıktı. Düğme de çıkmıyor: devre dışı bir düğme
  "neden basamıyorum" sorusu doğurur.
- Tahsildeki çek iade/tahsil/karşılıksız olabilir ama **yeniden ciro edilemez** — banka elinde.

**İŞLEMLER AÇILIR PENCEREDE, iki aşamalı:** önce hangi işlem, sonra o işlemin alanları. Beş
işlemin alanlarını birden göstermek pencereyi de liste kadar kalabalık yapardı.

**Bankaya tahsile verirken banka ZORUNLU** ve hangi bankada beklediği hem geçmişte hem ÜST ALANDA
(`tahsilBankaAd`) duruyor — liste ve süzgeç geçmişi taramak zorunda kalmasın. Listede rozet olarak
görünüyor: `Ziraat · tahsilde`.

**GEÇMİŞ EKLENİR, ÜZERİNE YAZILMAZ.** Her işlem bir satır bırakıyor: önceki durum → yeni durum,
tarih, cari/banka, tutar, kullanıcı. Çekin nereden geçtiği sorusunun tek cevabı burası.

**SİLME KİLİDİ:** portföyden çıkmış ya da geçmişi olan çek silinemez. Kontrol **YETKİDEN ÖNCE** —
yönetici olmak da bu kaydı silmeye yetmez, çünkü sorun izin değil TUTARLILIK.

**Kur çevirici ciroda korunuyor** (7z-6'daki iki yönlü mantık): çek TRY, cariye USD işlenebilir.

> ### ÇEK GÖRSELLERİ AYRI ANAHTARDA
> Kullanıcı çek fotoğrafı (ön/arka) istedi. Çekler `muhasebe` TEKİL kaydının içinde duruyor;
> görselleri oraya koymak 7u'daki duvarın aynısı olurdu — tek anahtar, 5 MB, dolduğunda
> **MUHASEBE KAYDEDİLEMEZ**. Çek başına iki fotoğrafla o sınıra ürünlerden daha hızlı gidilir.
> Depo katmanı hazır (`cekGorselOku`/`cekGorselYaz`, `cekgorsel:<cekId>`), **arayüz henüz
> bağlanmadı** — bkz. açık kalanlar.

**Doğrulama:**
- `test/birim-cek.js` — izinli işlemler (portföyde beş, ciro edilmişte sıfır, tahsilde üç), silme
  kilidi, geçmişin birikmesi, banka bilgisinin üst alanda durması, izinsiz geçişin `null` dönmesi.
- `senaryo-cek-ciro.js` — menüde beş işlem, ciro akışı (42.000 ₺ → 1000 $), geçmiş satırı,
  ciro edilmiş çekte "İşlemler" düğmesinin hiç çıkmaması.

> **Ölçüm tuzağı (dördüncü kez):** düğme sayımına görünürlük süzgeci konmayınca gizli kaplardaki
> düğmeler de sayıldı ve "2" çıktı. `getBoundingClientRect().width > 0` eklendi.

### 7z-13. ÇEK GÖRSELLERİ — BULUT BAĞLANTISI (6 Eylül, v1.172.0)

**Kullanıcı:** *"Çek resimleri SQL bağlantısı olsun."*

7z-11'de depo katmanı yazılmış ama arayüze bağlanmamış ve "yalnız yerelde kalır, ikinci cihazda
görünmez" diye açık bırakılmıştı. Kullanıcı o sınırı kabul etmedi — haklı, çek fotoğrafı çekin
KANITI ve tek cihazda kalması onu yarı işe yaramaz kılar.

**`cek-gorselleri.sql` ÇALIŞTIRILDI** (kullanıcı bildirdi, 6 Eylül) — ayrı tablo, çek başına bir satır.

> **NEDEN `muhasebe` KAYDININ İÇİNDE DEĞİL:** çekler `muhasebe` TEKİL kaydında (tek satır, tek
> JSON) duruyor. Görselleri oraya koymak 7u'daki duvarın aynısı olurdu — kayıt başına 5 MB ve
> dolduğunda **MUHASEBE KAYDEDİLEMEZ**. Çek başına iki fotoğrafla o sınıra ürünlerden daha hızlı
> gidilir.

**İKİ YOL, İKİ BİÇİM** (7u'daki kalıbın aynısı):
- **BULUT** → `cek_gorselleri` tablosu, satır başına bir çek. Sıkışma yok.
- **YEREL** → çek başına ayrı anahtar (`cekgorsel:<id>`). `tabloYaz`ın dördüncü parametresiyle
  (yerele boş liste) toplu anahtar hiç dolmuyor.

**Arayüz:** çek satırında iki küçük kutu — ÖN ve ARKA. Ayrı kutu, çünkü tek kutu "hangi yüz"
sorusunu cevapsız bırakırdı. Fotoğraf çekin kendisinin kanıtı: numara, keşideci ve banka elle
girilirken yanlış yazılabilir, fotoğraf yazılamaz.

> **Yolda:** `ColorSwatch`ın ipucu metni sabitti — *"bu ÜRÜNÜN rengine görsel ekle"*. Bileşen artık
> çekte de kullanılıyor ve orada YANLIŞ BİLGİ veriyordu. `baslik` parametresi eklendi.

**İki denetim araya girdi ve ikisi de haklıydı:**
- **Denetim 7 (gidiş-dönüş):** `on_yuz` sütunu `.on` alanından yazılıyor ama okunduğunda `onYuz`
  oluyordu. `OKUMA_ISTISNA`ya eklendi — sütun adında "yüz" var çünkü `on` tek başına SQL'de
  okunaksız; uygulamada ise nesne zaten `cekGorsel` bağlamında.
- **Denetim 10 (sürüm koşulu):** yeni tablonun sürümü hiç okunmuyordu, güncellemeler koşulsuz
  INSERT yoluna düşecekti — ikinci cihazdaki değişiklik sessizce ezilirdi.
  `surumleriYukle("cek_gorselleri", …)` eklendi.

**Doğrulama:** `test/senaryo-cek-gorsel.js` — ön/arka için iki ayrı kutu, yüklenen fotoğrafın çek
başına anahtara (`cekgorsel:c1`) yazılması ve TOPLU anahtarın boş kalması.

#### AÇIK KALAN
- **Tahsil Edildi / Karşılıksız işlemleri kasa-banka hareketi DOĞURMUYOR.** Çekin bedeli tahsil
  edilince hangi hesaba, hangi tutarla gireceği ayrı bir karar; bilerek dışarıda.
- ~~Ciro GERİ ALINAMIYOR~~ — **KAPANDI (v1.226.0, bkz. 7z-43).**

### 7z-12. DÖRT KÜÇÜK DÜZELTME (6 Eylül, v1.171.0)

**Kullanıcı:** *"Siparişte 'yazarak doldur' ekranda çok yer kaplıyor, barkod ile girişin sağına koy,
açıklamaları da kaldır. Sola barkod girişi, sağda mikrofon amblemi. Alış/satış siparişlerini
ayırdık fakat üstte alış/satış yazıyor, onu da kaldır — nereden girmişsek o kalsın. Üst sekmeler
bazen ekranın üzerine oturuyor. Fişlerde çek çıkışı 'Diğer' işlemlere atıyor; aslında işlemi
biliyor."*

#### Sesli giriş küçüldü

Kendi mor kutusunda, formun en üstünde, açıklama satırıyla birlikte **dört satır** yer kaplıyordu —
oysa özellik ayda birkaç kez kullanılıyor. Artık barkod satırının sağında tek bir **🎤** amblemi;
ne olduğu `title`da, örnek cümle zaten açıldığında placeholder'da.

İkisinin aynı satırda olması ayrıca doğru: ikisi de "kalem eklemenin hızlı yolu".

#### Üstteki Alış/Satış seçici gizlendi

Alış ve satış AYRI ana sekmelere bölündüğünde (`sabitTip`) formdaki bu satır **İKİNCİ bir seçim
noktası** oluyordu: "Alış Siparişi" sekmesinden girip formda "Satış"a basmak mümkündü ve hangisinin
geçerli olduğu belirsizdi. `sabitTip` varken gizleniyor.

#### Şerit tam ekran modların üstüne oturuyordu

**Atölye** ve **barkod okutma** ekranları `inset: 0` ile ekranın tepesinden başlıyordu, ama sekme
şeridinin `zIndex`i daha yüksek (500 > 200) — şerit o ekranların başlığının üzerine biniyordu.
Diğer bütün tam ekran paneller zaten `top: PENCERE_SERIT_YUKSEKLIGI` kullanıyordu; **bu ikisi o
kuralın dışında kalmıştı.** Kurala alındılar.

#### Çek çıkışı "Diğer"e düşüyordu

`tumFisleriTopla` fiş tipini ön ekten çıkarıyor ama **`THS-` ve `ODM-` önekleri tanınmıyordu**.
Çek cirosu `ODM-` numarası aldığı için "Diğer" grubuna düşüyordu. Kullanıcının dediği gibi
**numara zaten işlemi söylüyordu, okunmuyordu.**

İki tip eklendi (Tahsilat/Ödeme) ve renkleri cari ekstresindekiyle AYNI (`HAREKET_TIPI_RENK`) —
aynı olay iki ekranda iki farklı renkte görünmesin.

**Doğrulama:** tarayıcıda çek cirosu fişi `Ödeme` etiketiyle listeleniyor; 38 senaryonun tamamı
değişmedi.

### 7z-14. ÇEK DEFTERİ, KUR VE ROZET (6 Eylül, v1.173.0)

**Kullanıcı:** *"Çek girişi yaparken de kur çevirici gerekli. Bunu PARA OLAN HER YERDE yap
mutlaka! Çek listesinde sağdaki listeyi kaldır, rozet olarak kalsın. Ciro edildi, bankaya
tahsilinde vs. seçmeli olmasın, zaten işlem yapıp yön belirliyoruz. Çek girişinde p.birimi değişse
bile tutar üzerinde TL işareti duruyor. Verilen çek için kendi çek defterimiz olması gerekiyor;
verilende kendimiz çek yazmışız demektir ve onu da ŞAHSİ ÇEK ÇIKIŞI olarak isimlendir."*

#### Kendi çek defterimiz

Alınan çek ve verilen çek **farklı şeyler**: alınan çek bir ALACAK ve elimizde duruyor; şahsi çek
çıkışı BİZİM İMZAMIZ ve bir BORÇ. Tek listede karıştırmak portföy toplamını da anlamsız kılıyordu
— biri artı biri eksi sayılıp aynı satırda görünüyorlardı.

İki sekme: **Alınan Çekler** · **Şahsi Çek Çıkışı**. Portföy toplamı artık AÇIK SEKMEYE ait.
"Yeni Çek" düğmesi açık sekmenin tipiyle başlıyor ve adı da değişiyor ("Şahsi Çek Yaz") — şahsi
sekmesindeyken formun "Alınan" gelmesi en sık yapılan hatayı davet ederdi.

Depodaki DEĞER değişmedi (`tip: "Verilen"`), yalnız ekrandaki ad. Veri göçü gerekmedi.

#### Durum artık rozet

Sağdaki açılır liste kaldırıldı. **Serbest seçim, "Ciro Edildi" yazıp karşı tarafta hiçbir kayıt
doğurmamak demekti** — işlemler penceresi (7z-11) hem durumu değiştiriyor hem gereken kaydı
yazıyor. `onDurumGuncelle` propu da kaldırıldı: kullanılmayan bir prop "buradan da değiştirilebilir"
izlenimi bırakırdı.

Durum süzgecine eksik iki durum eklendi (Tahsilde, İade Edildi) — 7z-11'de yeni durumlar geldi ama
süzgeç listesi güncellenmemişti.

#### Tutar etiketindeki sabit ₺

`Tutar (₺)` yazılıydı; dolar çeki girerken bile öyle görünüyordu. Seçilen para biriminden
okunuyor: `Tutar ($)`.

#### Çek girişinde kur çevirici

**"Para olan her yerde"** kuralı gereği. Döviz çekte **TL Karşılığı** ve **Kur** alanları çıkıyor,
7z-6'daki gibi ÇİFT YÖNLÜ: birine yazılınca diğeri hesaplanıyor.

> Çekin GİRİŞ günündeki TL değeri ayrı bir bilgi ve sonradan hesaplanamaz — vade geldiğinde kur
> değişmiş olacak. Bu yüzden `tlKarsiligi` ve `kur` kayda yazılıyor.

**Doğrulama:** `senaryo-cek-gorsel.js` genişletildi — iki defter sekmesi ve sayıları, durum
seçicisinin OLMAMASI, tutar etiketinin `Tutar (₺)` → `Tutar ($)` değişmesi, kur ve TL karşılığı
alanlarının çıkması.

#### ~~AÇIK KALAN~~ — kapandı (v1.175.0, bkz. 7z-16)

### 7z-15. STOK EKRANINDA TEK SÜZGEÇ: ARAMA (6 Eylül, v1.174.0)

**Kullanıcı:** *"Stok yönetimi ekranı çok dolu, filtreler her tarafı kapattı. Üstteki hepsini
kapat, arama çubuğundan filtre yapalım sadece."*

Ekranın üst şeridinde **beş açılır süzgeç** (malzeme tipi, mamul tipi, sezon, sezon yılı, özel kod
+ değeri) ve ayrıca bir **tip çipleri şeridi** vardı. Her biri ayrı ayrı eklenmişti ve tek tek
makuldü; toplamı ürün listesini aşağı itiyordu.

**Hepsi ARAMANIN İÇİNE alındı.** Yazılan kelime artık şunlarda aranıyor: ürün adı, kategori,
malzeme/mamul tipi, sezon, **sezon yılı**, özel kodlar (alan adı ve değer), renk ve beden.

> ### ÇOK KELİMELİ ARAMA
> Boşlukla ayrılan her kelime AYRI aranıyor ve hepsini birden taşıyan ürünler listeleniyor.
> Tek dize olarak arasaydık kelime sırası önemli olurdu: `"mamul yazlık"` çalışır, `"yazlık mamul"`
> hiçbir şey bulmazdı. Ölçüldü: ikisi de aynı sonucu veriyor.

Ölçüm: `hammadde` → kategoriyi, `yazlık` → sezonu, `2027` → yılı, `mamul yazlık 2027` → üçünü
birden süzüyor. Ekranda görünür açılır süzgeç sayısı **0**.

**KATEGORİ SEKMELERİ KALDI** (Tümü / Hammadde / Yarı Mamul / Mamul / Hizmet): onlar süzgeç
kutusu değil, sayaç taşıyan tek tıklık sekmeler ve "kaç hammaddem var" sorusunu yazmadan
cevaplıyorlar. Liste/Katalog anahtarı ve "Ürün Ekle" de süzgeç olmadığı için yerinde.

> **Ölü kod denetimi işini yaptı:** süzgeçler kaldırılınca `filterSezon`, `filterSezonYili`,
> `filterMalzemeTipi`, `filterMamulTipi` state'leri ve yalnız onlar için hesaplanan yıl listesi
> boşta kaldı — denetim ikisini işaretledi, hepsi temizlendi.

**Doğrulama:** `senaryo-katalog.js` — açılır süzgeç sayısının 0 olması, çok kelimeli aramanın
doğru ürünü getirmesi ve kelime sırasının sonucu değiştirmemesi. Senaryodaki eski iki aşamalı
süzgeç testi (önce hangi kod, sonra hangi değer) yeni akışa çevrildi.

### 7z-16. ÇEK GİRİŞİ CARİYE İŞLENİYOR (6 Eylül, v1.175.0)

7z-14'te açık bırakılan madde. **Kullanıcı:** *"Şahsi çek çıkışı cari hareketi doğurmuyor. Kendi
çekimizi yazmak, karşı tarafa borcumuzu kapatan bir işlem — ciroda kurduğumuz bağın aynısı burada
da kurulmalı."*

Doğrusu İKİ YÖNDE de geçerli — açık madde yalnız verilen çeki söylüyordu ama alınan çek de aynı
boşluktaydı:

| Tip | Ne oldu | Yön | Fiş |
|---|---|---|---|
| **Verilen** (şahsi çek çıkışı) | biz ödedik, o cariye borcumuz azaldı | Borç | `ODM-` |
| **Alınan** (müşteri çeki) | müşteri ödedi, alacağımız azaldı | Alacak | `THS-` |

Çek yazmak ya da almak bir SÖZ değil; karşılığında mal ya da borç kapanışı olan bir işlem.

> ### ÇİFT KAYIT KAPISI
> Cari kartından girilen çekte hareket ZATEN yazılıyor ve çeke `hareketId` olarak bağlanıyor.
> Orada ikinci bir hareket yazmak **cari bakiyesini iki katına çıkarırdı**. Bu yüzden hareket
> yalnız `hareketId` YOKSA doğuyor — yani Muhasebe > Çek ekranından girildiyse.

**KASA HAREKETİ YOK** — çek nakit değil, para vadesinde el değiştirir (7z-8'deki gerekçenin aynısı).

**Tek kapı:** `cekEkleVeIsle`. Muhasebe modülündeki `cekEkle` artık yalnız onu çağırıyor; iki
yazma yolu bırakmak, birinin cariye işleyip diğerinin işlememesi demekti — bu oturumda tam olarak
o hatadan (7z-9) çıkmıştık.

Karşı taraf bilgisi 7z-7'nin alanlarıyla taşınıyor (`hesapAd: "Çek No 12345"`), yani ekstrede
çekin kendi bilgisi görünüyor.

**Doğrulama:** `senaryo-cek-gorsel.js` — şahsi çekte yön `Borç` / fiş `ODM-` / açıklama "Şahsi çek
çıkışı", alınan çekte yön `Alacak` / fiş `THS-` / açıklama "Müşteri çeki", ve her iki çekin de
`hareketId` ile cari kaydına bağlanması.

> **Senaryo yazarken:** form alanları ETİKETİNDEN bulunmak zorunda kaldı. "İlk sayı kutusu"
> demek, modülün üstündeki TCMB kur kutusuna denk geliyordu — ilk denemede 5000 oraya yazıldı ve
> çek hiç kaydedilmedi.

### 7z-17. EKSİ STOK KENDİ BAŞINA İHTİYAÇTIR (6 Eylül, v1.176.0)

**Kullanıcı (ÖNEMLİ):** *"Stok eksiye düştüğünde talep göstermiyor. Stok eksi demek, stok girişi
yapılmamış ama stoktan çekilmiş demek — aslında stok var ama fiş girişi yok. Bu durumda bile
ihtiyaç bildirmesi gerekir."*

**Hesap DOĞRUYDU, sorun listeye HİÇ GİRMEMESİYDİ.** `mrpHesapla` ihtiyacı yalnızca bekleyen satış
siparişlerinden topluyordu; bir hammaddenin bu listede yer alması için onu isteyen bir sipariş
gerekiyordu. Sipariş yoksa hammadde hiç görünmüyor, stoğu −7 olsa bile.

Oysa eksi stok kendi başına bir ihtiyaçtır: **"bu kadarını zaten harcamışız ve karşılığı yok."**
Sipariş beklemeye gerek yok.

**Çözüm sade:** eksi stoktaki varyantlar `gereken: 0` ile gruba ekleniyor. Fark hesabı
(`mevcutStok − gereken`) sonucu kendiliğinden doğru veriyor — `0 − (−7)` değil, `−7 − 0 = −7`,
yani eksik 7. Formüle dokunulmadı.

**ZATEN TALEBİ OLAN HÜCREYE DOKUNULMUYOR:** orada eksi stok farka çoktan dahil; ikinci kez
eklemek talebi şişirirdi.

**KAPSAM hammadde ve yarı mamul.** Bu ekran SATIN ALMA planlaması yapıyor; eksiye düşmüş bir MAMUL
satın alınmaz, üretilir — o ayrı bir ekranın işi. (Mamul tarafı için aynı boşluk sürüyor, aşağıda.)

**Satırın sebebi ipucunda yazılı:** "Bu satır siparişten değil, stoğun eksiye düşmesinden geliyor."
Yoksa "gereken 0 ama neden eksik görünüyor" sorusu doğardı.

**Doğrulama:** `test/senaryo-eksi-stok-ihtiyac.js` — HİÇ SİPARİŞ YOKKEN eksi stoktaki hammaddenin
listede görünmesi, eksik rozetinin `−7` olması ve sebebin ipucunda yazması.

#### AÇIK KALAN

- **Mamul eksiye düşerse üretim ihtiyacı bildirilmiyor.** Aynı boşluğun mamul tarafı: satılmış ama
  üretim girişi yapılmamış mamul eksiye düşer ve bu bir ÜRETİM ihtiyacıdır. Satın alma ekranına
  koymak yanlış olurdu; üretim planlama tarafında ele alınmalı.

### 7z-18. VERİLEN HAMMADDE VE OTOMATİK ARTAN (6 Eylül, v1.177.0)

**Kullanıcı:** *"Üretimde proses teslim alırken artan hammadde sorunu, verirken de göstersin —
aynı ekran, aynı adetler. Deri bölünmez: ihtiyaç 300 desi ama bir kanat 390 desi var; kesiciye
bunu verip artanı almamız gerekiyor. Arkada otomatik 90 getirsin, az veya fazla varsa kullanıcı
girsin. Bununla hem reçete kontrolü yaparız, gerçek maliyet yakalanıyor mu diye."*

**Eksik olan neydi:** hammadde YALNIZCA teslim alırken, reçeteye göre düşülüyordu. "Gerçekte ne
verildi" bilgisi sistemde HİÇ YOKTU. Artan kutusu (7. sürümlerden beri var) boş başlıyordu ve
kullanıcı farkı kafadan hesaplayıp yazıyordu — yani sistemin bildiği bir şeyi insana sorduruyordu.

**Verme ekranına hammadde matrisi eklendi.** Teslim alma ekranındaki "artan" tablosunun eşi: aynı
hammaddeler, aynı hesap (`atamaHammaddeleri` — iki ekran aynı listeyi görsün diye AYNI
fonksiyondan geçiyor). Kullanıcı gerçekte verdiğini yazıyor; boş bırakırsa reçete kadar verilmiş
sayılıyor (en sık durum bu).

**Atamaya `verilenHammaddeler` yazılıyor** — reçete kadar verilen kalem de dahil. "Girilmedi" ile
"reçete kadar" ayrımı sonradan yapılamaz ve teslim ekranı hangisi olduğunu bilmek zorunda.

**Teslimde artan ÖN DOLUYOR:** `verilen − reçete`. Fark yoksa kutu boş kalıyor; sıfır yazmak
"artan yok" demenin gürültülü hâli olurdu. İpucunda gerekçe var: *"Verilen 8 metre · reçete
6 metre → artan 2"*.

İade mekanizmasının kendisi zaten doğruydu (stoğa geri giriş, ayrı hareket, fire hesabını bozmadan)
— eksik olan yalnızca farkın nereden geleceğiydi.

**Doğrulama:** `test/senaryo-verilen-hammadde.js` — verme ekranında alanın çıkması ve reçete
beklentisini göstermesi (6 metre / 3 adet), 8 metre verilince atamaya `beklenen 6 · verilen 8`
yazılması, teslim ekranında artan kutusunun **2** ile ön dolması.

#### ~~AÇIK KALAN~~ — kapandı (v1.195.0, bkz. 7z-29)

- ~~**Gerçekleşen tüketim reçeteye NOT olarak yansımıyor.**~~ Kullanıcı ayrıca şunu istedi:
  *"Hammadde birim adedi reçeteye not olarak yansısın — deri 30 desi planlandı ama 31 desiden
  çıkıyor gibi."* Veri artık elde (`verilen − iade` = gerçek tüketim, reçete beklentisi de kayıtlı);
  yapılacak iş bu farkı ürün reçetesine not olarak biriktirmek ve kullanıcıya "reçeteyi güncelle"
  önerisi sunmak. Ayrı bir iş.
- Tüketim hâlâ REÇETEYE GÖRE düşülüyor; iade ayrı bir giriş hareketi. Gerçek tüketimi doğrudan
  yazmak daha kısa olurdu ama "ne verildi / ne geri geldi" ayrımı kaybolur ve fire hesabı yanlış
  çıkardı (mevcut yorumda gerekçesi yazılı).

### 7z-19. SEKME ŞERİDİ SAYFAYLA KAYIYOR (6 Eylül, v1.178.0)

**Kullanıcı:** *"Sayfa aşağı kaydığında sekme en altta kadar gitmesin. Sekme bitene kadar kaysın."*

Şerit `position: fixed` idi: ekranın tepesine YAPIŞIK duruyor, sayfa nereye kaydırılırsa
kaydırılsın orada kalıyordu. Uzun listelerde bu, ekranın en değerli 40 pikselini kalıcı olarak
sekmelere ayırmak demek — kullanıcı içeriğe bakarken sekmelere bakmıyor.

Artık `position: absolute`: sayfanın tepesinde duruyor ve sayfa kaydıkça yukarıda kalıp görüş
alanından çıkıyor. Ölçüm: başta `top: 0`, 400 piksel kaydırınca `top: −98`.

> **`sticky` DENENDİ VE YANLIŞTI:** o da ekranın tepesine yapışıyor, yani kullanıcının şikâyet
> ettiği davranışın aynısı. `static` da olmazdı: şerit `<main>`in KARDEŞİ ve dış kap
> `display:flex` — akışa bırakılsa menünün yanına, sütun olarak düşerdi.

`paddingTop` DURUYOR ama anlamı değişti: artık SAYFANIN başındaki boşluk, ekranın değil. Aşağı
kaydırıldığında şerit de boşluk da yukarıda kalıyor.

**Dengesi:** sekmelere dönmek için sayfanın başına çıkmak gerekiyor. Alternatifi ekranın sürekli
40 piksel dar olmasıydı; kullanıcı bu dengeyi açıkça istedi.

**Doğrulama:** `senaryo-sekmeler.js` — şeridin başta `0`, kaydırınca negatif konumda olması.

> **Altın çıktı değişti, gerekçe:** `senaryo-satin-al-dugmesi` GÖRÜNEN SABİT PANELLERİN metnini
> topluyor; şerit artık `fixed` olmadığı için o listede değil. Ölçülen davranış (fiş ekranının
> açılması) DEĞİŞMEDİ — tersine, şeridin o listeye karışması 7i'de not edilmiş bir gürültüydü ve
> kendiliğinden temizlendi.

### 7z-20. SOL MENÜ KAYDIRIRKEN EKRANDA KALIYOR (7 Eylül, v1.179.0)

**Kullanıcı (ekran görüntüsüyle):** *"Sol sekme barı kayıp. Bir önceki konuşmamızda bunun için
değil miydi?"*

**Kusur ESKİYDİ, yeni değişiklik onu GÖRÜNÜR KILDI.** Menü akışta duruyordu ve `minHeight: 100vh`
ile sayfa boyunca uzuyordu — ama İÇİNDEKİ ikonlar en üstteydi. Aşağı kaydırınca ekranda yalnız boş
kahverengi bir şerit kalıyordu; menü "vardı" ama kullanılamıyordu (ekran görüntüsünde tam olarak
bu görülüyor).

Üst sekme şeridi SABİTKEN bu fark edilmiyordu: gezinme oradan yapılabiliyordu. Şerit de
kaydırılabilir olunca (7z-19) ekranda **hiçbir gezinme aracı kalmadı**.

**`position: sticky; top: 0`** — menü kendi yerinde başlıyor, kaydırma sırasında ekranın tepesinde
kalıyor.

> **`minHeight: 100vh` → `height: 100vh` DEĞİŞİMİ ŞART:** sticky bir öge, kapsayıcısı kadar uzunsa
> HİÇ YAPIŞMAZ — yapışacak boşluk kalmaz. `minHeight` ile menü sayfa boyunca uzuyordu, yani sticky
> hiçbir işe yaramazdı. `overflowY: auto` da eklendi: menü ekrandan uzunsa kendi içinde kaysın.

**`fixed` YAPILMADI, bilinçli:** akıştan çıkarmak içeriğin menünün altına kaymasına yol açardı ve
genişliğini CSS değişkeninden okuyan tam ekran pencereler yanlış hizalanırdı.

**Doğrulama:** `senaryo-sekmeler.js` — 600 piksel kaydırdıktan sonra menü ikonunun hâlâ ekran
içinde olması (`142` → `86`), yani menünün yukarı çıkıp ekranda kalması.

> **DERS:** bir öge "kaybolmuyor" diye onun KULLANILABİLİR olduğu varsayılamaz. Menü DOM'da vardı,
> yüksekliği de sayfayı kaplıyordu; kullanılamaz olan içeriğiydi. Ekran görüntüsü olmasa bu ayrım
> kaçardı.

### 7z-21. İKİSİ DE HİÇ KAYBOLMASIN (7 Eylül, v1.180.0)

**Kullanıcı:** *"Sol menü ve üst sekmeler HİÇ KAYBOLMASIN!"*

7z-19'daki karar geri alındı. Sıralama şöyleydi:
1. Şerit `fixed` idi (her zaman ekranda).
2. Kullanıcı *"sekme bitene kadar kaysın"* dedi → `absolute` yapıldı.
3. Sol menünün de kullanılamaz olduğu ortaya çıktı (7z-20) → menü `sticky` yapıldı.
4. Kullanıcı iki hâli de görüp **ikisinin de sabit kalmasını** istedi.

> **KARAR DENEYEREK VERİLDİ, tartışılarak değil.** Şeridin 40 pikseli ile "her an gezinebilmek"
> arasındaki denge, ancak iki hâl de kullanılınca anlaşıldı. Not bunu kayda geçiriyor ki ileride
> "şerit neden sabit" sorusu yeniden açılmasın.

**Şerit `fixed` (top: 0)**, **menü `sticky` (top: 40)**.

> Menü `top: 0` ile yapışsaydı ilk ikonu şeridin ALTINDA kalırdı — görünür ama tıklanamaz.
> Yüksekliği de `calc(100vh − 40px)`: şeridin payı düşülmezse menünün ALTI ekran dışına taşardı.

**Doğrulama:** `senaryo-sekmeler.js` — 800 piksel kaydırdıktan sonra şeridin hâlâ `top: 0`'da,
menü ikonunun hâlâ ekranda ve şeridin ALTINDA (`≥ 40`) olması.

> **Altın çıktı geri döndü:** `senaryo-satin-al-dugmesi` iki tur önceki hâline döndü — şerit yine
> `fixed` ögeler listesinde. Beklenen.

### 7z-22. MENÜ VE ŞERİT AÇIK MOR (7 Eylül, v1.181.0)

**Kullanıcı:** *"Sol ve üst menüyü açık mor renginde yap."*

> **TEK BİR RENK DEĞİŞİKLİĞİ DEĞİL.** Zemin koyu kahveden (`#4B3625`) açık lavantaya dönünce
> ÜZERİNDEKİ HER ŞEYİN okunurluğu tersine döner: krem metin (`#F2E8D8`) açık morda görünmez,
> kahverengi ayraçlar kaybolur, seçili öge vurgusu (daha koyu kahve) anlamını yitirir.
> Yalnız `background` değiştirilseydi menü "mor ama okunmaz" olurdu.

Beş rol birlikte tanımlandı:

| Rol | Renk | Nerede |
|---|---|---|
| Zemin | `#E4DAF2` | menü, üst şerit, mobil alt çubuk |
| Metin | `#3F3159` | başlıklar, seçili öge |
| Soluk metin | `#6E5F8C` | alt başlık, rol, pasif ögeler |
| Ayraç | `#CBBBE0` | kenarlıklar, şerit ayracı |
| Seçili zemin | `#CFC0E8` | seçili menü ögesi, pasif sekme |

**Seçili öge artık zeminden bir ton KOYU** — eskiden tersiydi (koyu menüde seçili olan daha koyu
kahve, metin krem). Zemin açılınca ikisi de tersine döndü.

**MOBİL ALT ÇUBUK DA AYNI PALETE ALINDI:** aynı işi yapan iki gezinme aracı iki farklı renkte
olsaydı, dar ekrana geçen kullanıcı kendini başka bir uygulamada sanırdı.

**Dokunulmayan:** pencere başlıkları modül renginde koyu zemin + krem metin kullanıyor. Onlar
gezinme değil İÇERİK başlığı; modül rengiyle bağı korundu.

**Doğrulama:** `senaryo-sekmeler.js` — menü zemini, menü metni ve şerit zemini birlikte ölçülüyor.
İkisi birden ölçülmezse "rengi değişti ama yazısı kayboldu" durumu gözden kaçar.

#### Mobil alt çubuk — atlanan bir zemin (v1.182.0)

**Kullanıcı ekran görüntüsü gönderdi (7 Eylül):** dar ekranda alt çubuktaki SEÇİLİ öge hâlâ koyu
kahve kutu içindeydi ve üzerindeki mor yazı okunmuyordu.

Palet değiştirilirken alt çubuğun ZEMİNİ, İKON rengi ve YAZI rengi güncellenmişti; **seçili ögenin
kendi zemini (`#3B2E1F`) atlanmıştı.** Tam da 7z-22'de "yalnız `background` değiştirilseydi menü
mor ama okunmaz olurdu" diye yazdığım tuzağın, bir alt bileşende tekrarı.

> **Neden ilk ölçümde çıkmadı:** senaryo GENİŞ ekranda çalışıyordu ve mobil çubuk `display: none`
> idi. Ölçüm doğruydu ama kapsamı dardı. Artık senaryo dar ekrana geçip alt çubuğun zemin, seçili
> zemin ve seçili yazı renklerini de ölçüyor, sonra görünümü eski hâline döndürüyor.

**Dokunulmayanlar:** sağ alttaki bildirim kutusu ve anasayfadaki modül kartlarının ikon kutusu hâlâ
koyu kahve — ikisi de gezinme değil, içerik.

#### Anasayfa karşılama bandı (v1.183.0)

**Kullanıcı:** *"Logonun arka planını da değiştir, mor ile uyumlu olsun. Çok yer kaplıyor, onu da
ufalt. Ekranı kullanacağız."*

Menü ve şerit mor olunca bant yanık turuncu kaldı ve **ekranın en büyük rengi olarak menüyle
çatıştı.** Menü paletinin KOYU ucuna alındı (`#4A3A63`): aynı aile, ama menüden ayrı bir katman
olduğu belli olsun diye koyu — üzerindeki krem yazı da öyle korunuyor.

> **ASIL ŞİKÂYET RENK DEĞİL YERDİ.** Bant ekranın üçte birini kaplıyordu ve her açılışta iş
> gecikiyordu. Ölçüm: **~200 piksel → 60 piksel**.

Nasıl küçüldü:
- Dikey iç boşluk `40/32` → `18/16`, başlık `34` → `22`, logo `44` → `30`.
- **Tarih kendi satırından çıkıp başlığın yanına alındı** — tek kelimelik bir bilgi için 21 piksel
  ayrı satır.
- **Açıklama cümlesi tamamen kaldırıldı** ("Ayakkabı üretiminizin renk, beden... yönetin"):
  uygulamayı her gün açan kişiye ne işe yaradığını anlatmak ilk günden sonra gürültü.
- Bandın altındaki kart boşluğu da `24` → `16`; bant küçülünce altındaki boşluk orantısız kalırdı.

Dokuma dokusu ve dikiş ayracı korundu, mor tonlarına çevrildi — bandın karakteri kayboldu değil,
sıkıştırıldı.

**Doğrulama:** `senaryo-sekmeler.js` — bandın zemini, YÜKSEKLİĞİ, başlık boyutu ve açıklamanın
kaldırıldığı ölçülüyor. Yükseklik ölçülmezse "rengi değişti ama hâlâ yer kaplıyor" gözden kaçar.

#### Şeritte kalan siyah yazı (v1.184.0)

**Kullanıcı:** *"Turuncu yazılar iyi ama siyah çok sırıtıyor."*

Üst şeritte AKTİF sekmenin yazısı `#221B14` idi — neredeyse siyah. Zemin, kenarındaki sekmeler ve
sol menü mora dönmüşken bu tek başına kalıyordu. Modül renkleri (turuncu, mavi, yeşil) kasıtlı bir
vurgu; siyah ise eski paletten kalan bir artıktı.

Aktif sekme `#3F3159` (menüdeki seçili öge yazısıyla AYNI ton), pasif sekmeler `#5D4E80` oldu.
Ölçüm: şeritte artık siyaha yakın hiçbir metin yok.

> **Üçüncü kez aynı ders:** palet değiştirilirken renk ROLLERİNİN hepsi birden gözden geçirilmeli.
> Önce menünün metni (7z-22), sonra mobil çubuğun seçili zemini (v1.182.0), şimdi şeridin aktif
> yazısı. Her seferinde tek bir yer atlandı ve ancak kullanıcı görünce fark edildi.

#### Anasayfa modül kartları (v1.185.0)

**Kullanıcı ekran görüntüsü gönderdi (7 Eylül):** modül kartlarının ikon kutuları hâlâ koyu kahve
bloklardı — mor gezinme çubuğu ile krem kartlar arasında eski paletten kalan tek yabancı öge.

v1.182.0'de bunlara "gezinme değil, içerik" diye dokunmamıştım. **Yanlış ayrımdı:** kart bir modüle
GİDEN düğme, yani gezinmenin kendisi.

Her kutu artık kendi modülünün rengini alıyor (zemin rengin %13 saydamı, ikon rengin kendisi);
sayaç satırı ve hover kenarlığı da öyle. Kutu artık "buraya tıklanır" demenin yanında **"ne
olduğunu" da söylüyor** — menüdeki ve şeritteki modül renkleriyle aynı dil. Tanımlar mavi-gri,
Stok deri kahvesi, Üretim atölye yeşili.

> ### `MODUL_RENK` SABİTLERE TAŞINDI
> Tablo `AtolyeERP` bileşeninin İÇİNDE tanımlıydı; `110-navigasyon` onu göremiyordu ve orada her
> kutu aynı kahverengiydi. Kusurun asıl sebebi buydu — renk seçilmemişti değil, **seçilemiyordu**.
> Artık tek yerde: aynı modül iki ekranda iki farklı renkte görünemez.

### 7z-23. MODÜL BAŞLIĞI KÜÇÜLDÜ, KUR MENÜYE TAŞINDI (7 Eylül, v1.186.0)

**Kullanıcı:** *"Başlıklar bilgiden fazla yer kaplıyor. Kur sol menü en alta al. Başlığı küçült."*

Her modülün üstünde dört katman vardı: büyük başlık (24px), sağında kur rozeti, altında açıklama
paragrafı, altında kesikli ayraç. Dördü birlikte ilk gerçek içeriği ~200 piksel aşağı itiyordu.

**Üçü de ele alındı:**

1. **Başlık 24 → 17.** Modül adı bir YÖN LEVHASI, manşet değil — zaten sekme şeridinde ve sol
   menüde de yazıyor; üçüncü kez büyük puntoyla tekrar etmesi gereksiz.
2. **Açıklama satırı tamamen kaldırıldı.** *"Tanımlı renk/bedenlerden seçerek ürün matrisi
   oluşturun…"* gibi cümleler ilk gün işe yarar; her açılışta iki satır yer kaplamaları bilgiyi
   aşağı itiyordu. Ne olduğu başlığın kendisinde yazılı.
3. **Kur rozeti sol menünün EN ALTINA.** Her modülün başlık satırında duruyor ve genişliğinin
   yarısını yiyordu — oysa **kur modüle ait bir bilgi değil, uygulamanın geneline ait.** Menüde
   tek yerde durunca hangi ekranda olursanız olun aynı yerde.

Menü daraltılmışken rozet DİKEY dizilime geçiyor (`dar` parametresi): 64 piksellik menüde yan yana
iki kur artı iki düğme sığmıyor.

> `marginTop: auto` ile en alta itiliyor. Bu ancak menü ekran yüksekliğinde sabit olduğu için
> çalışıyor (7z-21) — akışta uzayan bir menüde "en alt" sayfanın sonu olurdu.

**Doğrulama:** `senaryo-sekmeler.js` — başlık puntosu, kurun menüde olması, açıklamanın kalkması
ve **ilk gerçek içeriğin (arama kutusu) üst konumu**: ~200 → **122 piksel**.

> Ölçülen şey BOYUT değil KONUM. Yalnız punto ölçseydik "küçüldü ama hâlâ aşağıda" durumu
> kaçardı — bu oturumda karşılama bandında da aynı ayrım kurtarmıştı.

#### Rozet dar menüye sığmıyordu (v1.187.0)

**Kullanıcı ekran görüntüsü gönderdi:** *"Döviz oturmadı tam."* Dar menüde `48,2400` ikinci satıra
kırılmış, `elle` ve `5g` etiketleri ile iki düğme alt alta düşüp kutuyu iki kat uzatmıştı.

Rozet menüye taşınırken `dar` parametresi eklenmişti ama yalnız DİZİLİMİ değiştiriyordu; içeriğin
kendisi masaüstü ölçüsündeydi. Dar mod artık gerçekten kompakt:

- **İki ondalık** (`48,24`) — dört ondalık 64 piksele sığmıyor. Kuruş hassasiyeti HESAPTA
  korunuyor; buradaki sayı bir göz ucu bilgisi ve tam değer `title`da.
- **`elle` / `5g` rozetleri gizli** — bilgi kaybolmuyor, ikisi de `title`da ve menü genişletilince
  geri geliyor. Bayatlık uyarısı ayrıca KENARLIK RENGİNDE de duruyor, yani dar menüde bile
  "bu kur eski" bilgisi tamamen kaybolmuş olmuyor.
- **Düğmeler yan yana** (kendi sıralarında) — dikey dizilimde alt alta düşüyorlardı.

Ölçüm: dar menüde kutu **48 px** (menü 64), yükseklik **63 px**, metin `$48,24 €55,80` — kırılma
yok. Menü genişletilince tam bilgi geri geliyor.

**Doğrulama:** `senaryo-sekmeler.js` — kutunun menüden dar olması ve yüksekliği ölçülüyor.

### 7z-24. TCMB KUR FONKSİYONU (7 Eylül, v1.188.0)

**Kullanıcı:** *"TCMB'den kur çekme işini de yapalım."*

> **KOD ZATEN HAZIRDI, FONKSİYON YOKTU.** `kurlariCek` beş kaynaklı bir zincir deniyor:
> kendi Supabase fonksiyonumuz → dört halka açık aracı → Harem → Frankfurter → model web araması.
> İlk halka `${SUPABASE_URL}/functions/v1/kur` adresini çağırıyordu ama **o fonksiyon hiç
> yazılmamıştı** — projede `supabase/` klasörü bile yoktu. Her seferinde 404 alınıp güvenilmez
> aracılara düşülüyordu; kullanıcının ekranlarında kaynağın hep "elle" görünmesinin sebebi buydu.

**KULLANICIYA VERİLEN DOSYA: `supabase-kur-fonksiyonu.ts`** — kurulum adımları dosyanın başında.

Neden gerekli: tarayıcı TCMB'nin `today.xml` adresini DOĞRUDAN okuyamaz, çünkü TCMB sunucusu CORS
başlığı göndermiyor. Fonksiyon aynı işi bizim adımıza yapar; **veri yine resmî TCMB verisidir**,
arada duran biz olduğumuz için değişmez.

Ayrıntılar:
- `ForexSelling` (döviz satış) önce, yoksa `BanknoteSelling` (efektif satış). TCMB bazı birimlerde
  ilkini boş bırakıyor. İkisi de yoksa `null` — uydurma sayı döndürmek yanlış kurla fatura demek.
- **USD ve EUR'un İKİSİ de şart.** Tek kurla dönmek, yarısı güncel yarısı eski bir çift bırakırdı.
- CORS başlıkları HER yanıtta, hata yanıtlarında da: yalnız başarılıya koymak tarayıcının hatayı
  okuyamamasına ve "Failed to fetch" gibi anlamsız bir mesaja yol açar.
- `Verify JWT` KAPALI kurulmalı — uygulama `Authorization` göndermiyor (yeni tip
  `sb_publishable_…` anahtarları JWT değil) ve taşınan veri zaten herkese açık.

#### Kur artık AİT OLDUĞU günle kaydediliyor

`kurlariKaydet` her zaman KAYIT ANINI yazıyordu. TCMB kuru günde bir açıklar ve hafta sonu/tatilde
son iş gününün kurunu döner: pazar günü çekilen cuma kuru "bugün alındı" görünüyor, **bayatlık
uyarısı hiç çalışmıyordu.** Fonksiyon XML'deki tarihi de gönderiyor, kayıt onu kullanıyor.

> **Yolda yakalanan uyumsuzluk:** ilk yazımda fonksiyon `Date="09/02/2026"` alanını gönderiyordu,
> oysa uygulama `gg.aa.yyyy` bekliyor. TCMB ikisini de yazıyor ama biçimleri farklı
> (`Tarih="02.09.2026"` / `Date="09/02/2026"`). Ayrıştırılamayan tarih sessizce kayıt anına
> düşerdi — yani düzeltme hiç çalışmamış olurdu. Gerçek XML biçimiyle sınanınca çıktı.

### 7z-25. KUR ROZETİ ÜST ŞERİDE TAŞINDI (7 Eylül, v1.189.0)

**Kullanıcı:** *"Bunu sağ üst bara alalım en iyisi."*

Rozet iki tur önce modül başlığından alınıp sol menünün altına konmuştu. Orada iki sorun vardı:
menü daraltılınca 64 piksele sıkışıyor (v1.187.0'de kompaktlaştırıldı ama yine dar), ve **menü
dibi ekranın en az bakılan köşesi.**

Artık üst sekme şeridinin SAĞ UCUNDA. Ölçüm: şerit 40 piksel, rozet **19 piksel** — sığıyor;
sağ kenardan 10 piksel içeride.

> ### ŞERİT İKİ BÖLGEYE AYRILDI
> Kaydırma daha önce dış kapta idi. Rozeti oraya koysaydık sekmelerle BİRLİKTE KAYARDI ve çok
> sekme açıldığında ekrandan çıkardı — oysa kur her an görünmeli. Şimdi: solda `flex: 1` +
> `overflowX: auto` sekme alanı, sağda `flexShrink: 0` rozet. Sekmeler ne kadar çoğalırsa
> çoğalsın rozet ne kayıyor ne daralıyor.

**Şerit modu (`serit`) kompakt:** iki kur yan yana, iki ondalık, kaynak/bayatlık etiketleri gizli,
düğmeler küçük, hap biçimli hafif kenarlık.

> **AMA UYARI DURUMLARINDA KENARLIK GERİ GELİYOR:** kur girilmemişse turuncu, bayatsa amber,
> gayriresmî kaynaksa kaynağın rengi. O üç durum GÖRÜLMELİ — sadeleştirme uğruna "kurun eski
> olduğu" bilgisini yutmak, yanlış kurla fiyat verilmesi demekti.

Menüden kaldırıldı: iki yerde birden durması "hangisi güncel" sorusunu doğururdu. `dar` parametresi
kodda kaldı (menüye geri konmak istenirse hazır).

**Doğrulama:** `senaryo-sekmeler.js` — rozetin şeritte olması, şeridi taşırmaması, sağ uca yakın
durması ve menüden kaldırılmış olması.

> **Altın çıktı değişti, gerekçe:** `senaryo-satin-al-dugmesi` sabit ögelerin METNİNİ topluyor;
> şerit artık kur değerlerini de içeriyor. Ölçülen davranış (fiş ekranının açılması) değişmedi.

### 7z-26. KUR HATASININ SEBEBİ SÖYLENİYOR (7 Eylül, v1.190.0)

**Kullanıcı fonksiyonu kurdu, yine çekmedi.** İlk denemede Supabase'in verdiği rastgele adla
(`hyper-handler`) kaydedilmişti — uygulama `/functions/v1/kur` çağırdığı için 404. Ad düzeltildi,
yine olmadı; sebebi ekrandan anlaşılamıyordu.

**Sorun mesajdaydı:** bütün başarısızlıklar sessizce yutulup tek bir *"Kur alınamadı"* metnine
çıkıyordu. Fonksiyon kurulu değil mi, adı mı yanlış, JWT doğrulaması mı reddediyor, TCMB mi
cevapsız — hepsi aynı görünüyordu. Kullanıcı hangisini düzelteceğini bilemez.

Artık durum koduna göre **ne yapılacağı** söyleniyor:

| Durum | Mesaj |
|---|---|
| 404 | "'kur' fonksiyonu bulunamadı — adı tam olarak 'kur' olmalı" |
| 401 / 403 | "yetki istedi — fonksiyon ayarlarından **Verify JWT** seçeneğini KAPATIN" |
| 200 ama boş | "fonksiyon çalıştı ama TCMB'den kur okuyamadı" |
| ağ hatası | "fonksiyona ulaşılamadı (ağ ya da zaman aşımı)" |

Teşhis konsola da yazılıyor: bildirim birkaç saniyede kayboluyor, sorun giderirken geriye dönüp
bakılabilmeli.

> **DERS:** yedekli bir zincir (5 kaynak) sağlamlık için iyidir ama HATAYI GİZLER — her halka
> sessizce sonrakine düştüğü için sistem "çalışıyor ama yanlış kaynaktan" hâline geliyor ve
> kullanıcı bunu ancak kaynağın "elle" yazdığını görünce fark ediyor. Sessiz düşüşün sebebi
> kaydedilmeli.

#### Zincir askıda kalıyordu (v1.191.0)

**Kullanıcı:** *"Kur alınıyor diyor ama hata da vermiyor."*

Teşhis mesajları eklenmişti (v1.190.0) ama kullanıcı ONLARI DA GÖREMİYORDU. Sebep: zincirin
**son iki adımında zaman aşımı YOKTU** — Frankfurter ve model araması (`api.anthropic.com`).
İndirilen bir HTML dosyasında dış isteklere yanıt hiç gelmeyebiliyor; `await fetch(...)` süresiz
askıda kalıyor, zincir ilerlemiyor ve *"Kur alınıyor…"* son söz oluyordu.

> **SESSİZ BEKLEME, HATANIN EN KÖTÜ BİÇİMİ:** kullanıcı çalıştığını sanıp bekliyor. Hata mesajı
> eklemek yetmiyor; mesajın YAZILDIĞI yere ulaşılabildiğinden emin olmak gerekiyor.

- Ortak `zamanAsimliGetir` yardımcısı eklendi (varsayılan 8 sn).
- Model aramasına 25 sn — doğası gereği yavaş (web araması yapıyor) ama SINIRSIZ değil.
- Son adımın `catch`i artık sessiz değil: zaman aşımıysa "hiçbir kaynak zamanında yanıt vermedi",
  değilse "hiçbir kaynağa ulaşılamadı" diyor.

**Doğrulama:** tarayıcıda kur yenileme düğmesine basıldığında zincir kesin bir cevapla bitiyor:
`Kur alınamadı — Supabase 'kur' fonksiyonuna ulaşılamadı (ağ ya da zaman aşımı)`.

#### İki taraf birbirini bekliyordu (v1.192.0)

O mesaj (`ulaşılamadı`) sanıldığı gibi "fonksiyon yok" demiyordu. **Süreler ters sıradaydı:**

| Taraf | Bekleme |
|---|---|
| Uygulama → fonksiyon | 8 sn |
| Fonksiyon → TCMB | 10 sn |

Yani fonksiyon TCMB'yi beklerken uygulama ONDAN ÖNCE vazgeçiyordu. Fonksiyon cevabını —hatta
kendi hata mesajını bile— yetiştiremiyor, ekranda hep "ulaşılamadı" yazıyordu.

**Sıralama düzeltildi:** uygulama **15 sn**, fonksiyon **6 sn**. Fonksiyon önce pes edip
`{"hata":"TCMB 6 saniyede yanıt vermedi"}` döndürüyor, uygulama onu okuyup AYNEN gösteriyor.

> **KURAL:** iç içe zaman aşımlarında DIŞTAKİ her zaman daha uzun olmalı. Tersi, iç katmanın
> ürettiği teşhisi kalıcı olarak görünmez kılar — hata mesajı yazılır ama kimse okuyamaz.

Uygulama artık fonksiyonun kendi hata metnini de aktarıyor: çıplak durum kodu yerine
"TCMB 6 saniyede yanıt vermedi" gibi bir cümle.

> ### ÇALIŞTIĞI DOĞRULANDI (7 Eylül)
> Kullanıcı: *"TCMB kurları güncellendi — USD: 48.3195 ₺, EUR: 56.1581 ₺ (04.09.2026). Oldu, hem
> de çok hızlı geldi."* Fonksiyon kurulu ve devrede; kur artık resmî TCMB kaynağından geliyor.
> Bir daha "kuruldu mu" diye sorulmasın.
>
> Dönen tarih (04.09) ile o günün tarihi (07.09) farklıydı: TCMB günlük kuru saat 15:30 civarında
> açıklıyor ve hafta sonunda yenilemiyor, yani sabah saatinde son iş gününün kuru geliyor. Bu
> DOĞRU davranış — ve v1.188.0'de eklenen "kur ait olduğu günle kaydediliyor" düzeltmesi sayesinde
> rozet bunu bayat olarak işaretliyor. Düzeltme olmasaydı üç günlük kur "bugün alındı" görünecekti.

### 7z-27. MUHASEBEDEKİ İKİNCİ KUR BLOĞU KALDIRILDI (7 Eylül, v1.193.0)

**Kullanıcı:** *"Bunu kaldıralım, en üstte kur var, buna gerek yok daha."*

Muhasebe ekranının üstünde USD/EUR kur kutuları, "son güncelleme" ve "TCMB'den Kur Çek" düğmesi
vardı. Kur üst şeride taşındıktan sonra (7z-25) bu ikinci kopya oldu.

> **KALDIRILAN YALNIZ GÖRÜNTÜ DEĞİLDİ.** O düğme kendi `kurGuncelle` fonksiyonunu çağırıyordu:
> doğrudan `tcmb.gov.tr` adresine `fetch` atan, CORS yüzünden tarayıcıda neredeyse hiç çalışmayan
> ZAYIF bir kopya. Ana uygulamadaki zincir ise beş kaynaklı. Dahası, buradaki `kurElleGuncelle`
> **`kurGecmisi`ne HİÇ YAZMIYORDU** — o kutulardan girilen kurun geçmişi kayboluyordu.
>
> Yani "aynı işi yapan iki yer" yalnız fazlalık değil, **davranışı farklı** iki yerdi.

Toplam (Genel TL Karşılığı) KALDI: o bir muhasebe bilgisi, kur değil. Kur bilinmeyen para birimi
uyarısı artık "sağ üstteki rozetten girebilirsiniz" diye yönlendiriyor.

> ### YAMA SIRASINDA YAPTIĞIM HATA
> Bloğu keserken `s.index(isaret)` çağrısını dosyanın BAŞINDAN arattım; aynı dizgi daha önce de
> geçtiği için yanlış aralık kesildi ve bir `}` kayboldu. Sözdizimi denetimi yakaladı ama satır
> numarası dosyanın sonunu gösterdiği için yanıltıcıydı.
>
> Dosya son paketten geri alınıp yama `s.index(isaret, bas)` ile (başlangıçtan SONRA arayarak)
> yeniden uygulandı ve süslü parantez dengesi ayrıca sayıldı (`0`).
>
> **Kural:** metin kesiminde ikinci sınır her zaman birincisinden SONRA aranmalı.

> **Senaryo da kırıldı ve düzeltildi:** `senaryo-kur-cevirici` sayı kutularının SIRASINA
> dayanıyordu (`[2]=tutar`, `[3]=kur`). Üstteki kur kutuları kalkınca bütün indeksler kaydı.
> Alanlar artık ETİKETİNDEN bulunuyor — ekran düzeni değişse de doğru alanı bulur. Bu oturumda
> aynı ders üçüncü kez çıktı (çek formu, üretim formu, şimdi burası).

### 7z-28. KUR PANELİ KIRPILIYORDU (7 Eylül, v1.194.0)

**Kullanıcı:** *"Kur geçmişi listelensin, elle kur girme altta kalıyor görünmüyor."*

İki şikâyet, TEK sebep: rozet şeride taşınırken (7z-25) dış kaba `overflow: hidden` konmuştu.
Rozetin açılır paneli şeridin İÇİNDE `position: absolute` — yani şeridin dışına taşan kısmı
kırpılıyordu. **Panel açılıyor ama görünmüyordu**; kur geçmişi de o panelin içinde olduğu için
ikisi birden kayboldu.

- `overflow: hidden` kaldırıldı. Kaydırma zaten İÇ sarmalda (`overflowX: auto`), dış kapta
  gereksizdi — sekmelerin kaymasını sağlayan o değildi.
- Panelin `zIndex`i 400 → **600**. Şeridinki 500; panel şeritten aşağı taşıyor ve altındaki
  içeriğin ÜZERİNDE durması gerekiyor. 400 iken sayfanın kendi ögelerinin altında kalıyordu.
- **Kur geçmişi varsayılan AÇIK** geliyor. Paneli açan kişi zaten kurla ilgileniyor; geçmişi bir
  tık daha arkaya koymak gereksizdi.

> **Kalıp:** `overflow: hidden` bir kaydırma çözümü değil, KIRPMA aracıdır. Kaydırmayı iç sarmala
> taşıdıktan sonra dış kapta bırakmak, o kapsayıcıdan taşan HER ŞEYİ (açılır menüler, ipuçları,
> paneller) sessizce yok eder.

**Doğrulama:** `senaryo-sekmeler.js` — elle giriş düğmesine basılınca panelin açılması ve
kırpılmamış olması (yüksekliği var, ekran içinde) ölçülüyor; ölçüm sonrası panel kapatılıyor ki
sonraki ölçümlerin önünü kapatmasın.

### 7z-29. REÇETE GERÇEKLEŞMESİ (7 Eylül, v1.195.0)

**Kullanıcı:** *"Hammadde birim adedi reçeteye NOT olarak yansısın — deri 30 desi planlandı ama
31 desiden çıkıyor gibi. Bununla hem reçete kontrolü yaparız, gerçek maliyet yakalanıyor mu diye."*

**`recete-gerceklesme.sql` ÇALIŞTIRILDI** (kullanıcı bildirdi, 7 Eylül) — `urunler.recete_gerceklesme` jsonb.

Reçete bir TAHMİNDİR. Gerçek tüketim ancak iş bitince belli olur — 7z-18'de verilen hammadde
kaydedilmeye başlandı, artan da teslim alırken geri geliyordu; iki veri ilk kez bir arada.

    gerçek birim tüketim = (verilen − iade) / teslim alınan SAĞLAM adet

> **SAĞLAM ADEDE BÖLÜNÜYOR, verilen adede değil.** Hurda çıkan çift için de deri harcandı ama o
> çift satılmayacak. Maliyet için doğru soru "bir SATILABİLİR çift kaç desi yiyor". Fire ayrı bir
> başlık ve kendi ekranında izleniyor.

#### Tek tek değil, ÖZET

Her üretimin her hammaddesi için ayrı satır tutmak ürün kaydını (ve `urunler` tablosunu) sürekli
şişirirdi. Hammadde başına yalnız `{olcum, toplam, planlanan, sonTarih}` duruyor; ortalama
ikisinden çıkıyor.

`planlanan` HER ÖLÇÜMDE güncelleniyor: reçete değiştirilmişse karşılaştırma yeni değere göre
yapılmalı, yoksa kullanıcı çoktan düzelttiği bir farkı görmeye devam eder.

#### Öneri iki şarta bağlı

| Eşik | Değer | Gerekçe |
|---|---|---|
| En az ölçüm | **3** | İki ölçüm birbirini doğrulayabilir ama üçüncüsü olmadan hangisinin sapma olduğu bilinemez. Daha yükseği (5-10) daha güvenli olurdu ama bir modelden yılda birkaç üretim geçiyor; öneri hiç görünmezdi. |
| En az fark | **%5** | Kesim payı, tartı hassasiyeti ve yuvarlama zaten bu mertebede oynuyor. Daha düşük eşik gerçek sapmayı değil ölçüm gürültüsünü bildirirdi. |

> **RAKAMLAR HER ZAMAN GÖSTERİLİYOR**, öneri şarta bağlı. Bilgi saklanmıyor; yalnız "reçeteni
> değiştir" denmiyor. Ve öneri bir CÜMLE — otomatik değişiklik yok. Reçete kullanıcının kararı;
> ölçüm ona bilgi verir, yerine geçmez.

Ekranda (ürün kartı → Reçete): *"Deri Siyah · reçete 2 → ölçülen 2,3 metre (3 ölçüm) +15% —
reçeteyi 2,3 yapmayı değerlendirin"*. Öneri varken kutu amber, yoksa nötr.

Gerçekleşme MAMULE yazılıyor, hammaddeye değil: aynı deri başka modelde başka miktarda kullanılır.

**Doğrulama:**
- `test/birim-recete-gerceklesme.js` — biriktirme ve ortalama, iki eşiğin ayrı ayrı çalışması,
  eksi yönde de öneri (reçete FAZLA yazılmışsa), sıfır tüketimin ölçüm sayılmaması, girdinin
  değiştirilmemesi, reçete değişince planlananın güncellenmesi.
- `test/senaryo-recete-gerceklesme.js` — üç ölçüm + %15 farkta öneri cümlesinin çıkması, TEK
  ölçümde aynı rakamların görünüp önerinin ÇIKMAMASI.

### 7z-30. EKSİ STOK: İHTİYAÇ DEĞİL, SAYIM UYARISI (7 Eylül, v1.196.0)

**Kullanıcı:** *"Eksi stoklar için tedarik aslında mantıksız, çünkü eksi stok olamaz; yoktan var
olamaz. Eksi stoğu ihtiyaç için değil, DEĞERLENDİRME için kullanalım."*

**7z-17'nin DÜZELTİLMESİ.** 6 Eylül'de eksi stok ihtiyaç listesine eklenmişti; o günkü şikâyet
*"görünmüyor"* idi. **Görünmesi doğruydu, satın almaya dönüşmesi yanlıştı** — ve bu ayrımı ilk
turda ben yapmadım.

> Malzeme fiziksel olarak eksiye düşemez. `Taban −112` demek "112 taban borçluyum" değil,
> **"112 tabanın girişini yapmamışım ama tüketmişim"** demek. Yani gerçek stok BİLİNMİYOR:
> 0 da olabilir, 300 de. `−112` görüp 112 sipariş etmek, zaten depoda duran malı ikinci kez almak.

Kullanıcı sunulan üç seçenekten **ikisini birden** seçti ve birleşimleri tutarlı:

| Kural | Ne yapıyor |
|---|---|
| **SIFIR SAY** | Hesapta eksi değer 0 kabul edilir. "Elimde hiç yok" varsayımı: en fazla ihtiyacı olduğundan AZ gösterir, asla fazla sipariş ürettirmez. |
| **İŞARETLE** | Satır ve liste başı "stok bilinmiyor, sayım gerekli" diye damgalanır. Sayı veriliyor ki iş tıkanmasın, ama sayının neye dayandığı yazılı. |

**Liste başında toplu uyarı:** kaç kalemin kaydı bozuk, hangileri, gerçek kayıt değeri ne
(`kayıt: −7 metre`). Tek tek hücre gezip ⚠ aramak gerekmiyor. Bu bir satın alma listesi değil,
**düzeltme listesi**.

Hücrede de ⚠ işareti var — rakamın güvenilmez olduğu ipucunda değil, EKRANDA görünmeli.

`hamStok` ve `stokBilinmiyor` alanları MRP çıktısına eklendi; ham değer taşınıyor çünkü sayımı
yapacak kişi o sayıyı arayacak.

**Doğrulama:** `senaryo-eksi-stok-ihtiyac.js` yeni kurala göre yeniden yazıldı — toplu uyarının
çıkması, kayıt değerinin gösterilmesi, "0 kabul edildi" açıklaması ve **eksi değerden satın alma
miktarı TÜREMEMESİ**.

> Senaryoda bir ölçüm yanlış şeyi ölçüyordu (hücre ipucu), çünkü o senaryoda hiç sipariş yok ve
> matris hücresi hiç çizilmiyor. Ölçüm kaldırıldı ve sebebi senaryoya yazıldı — yanlış ölçüm,
> ölçmemekten kötüdür: yeşil görünüp güven verir.

#### AÇIK KALAN

- **Sayım ekranı hâlâ yok.** Eksi stoğu düzeltmenin tek dürüst yolu sayım: "şu an depoda gerçekte
  kaç var" deyip farkı fişe bağlamak. Uyarıdan oraya doğrudan bir giriş noktası konmalı.
- ~~Eksi stoklar giriş fişi eksikliğinden mi, reçeteden mi?~~ **Cevaplandı: "İKİSİ DE OLABİLİR"**
  → 7z-31'de sebep veriden tahmin ediliyor.

### 7z-31. EKSİ STOĞUN SEBEBİ VERİDEN TAHMİN EDİLİYOR (7 Eylül, v1.197.0)

Sorulan soru — *"eksi stoklar giriş fişi eksikliğinden mi, reçete fazla düştüğü için mi?"* —
**Kullanıcı: "İKİSİ DE OLABİLİR."**

İkisi de olabiliyorsa hangisi olduğu KULLANICIYA SORULAMAZ; **veriden çıkarılmalı.** Ve tam bunu
ayırt eden veri 7z-29'da toplanmaya başlamıştı:

| Ölçüm ne diyor | Teşhis | Gerekçe |
|---|---|---|
| Ölçülen < planlanan (reçete FAZLA düşüyor) | **Reçete** | Her üretimde stoktan gereğinden çok düşülüyor; eksi kendiliğinden birikir, giriş fişi eksik olmasa bile. |
| Ölçülen ≈ planlanan | **Giriş** | Düşülen miktar doğru; öyleyse eksi, malzemenin girişinin hiç yapılmamasından. |
| Hiç ölçüm yok | **Söylenmez** | Uydurma teşhis yanlış yeri düzelttirir: reçeteyle uğraşırken asıl sorun kesilmemiş alış fişiyse eksi birikmeye devam eder. |

Ekranda her bozuk kalemin altında:
- *"↳ **Reçete fazla düşüyor olabilir.** Bot: reçete 2 → ölçülen 1,7 (3 ölçüm) — reçeteyi düzeltmek
  eksinin BİRİKMESİNİ durdurur, ama biriken kısım yine sayımla kapanır."*
- *"↳ Ölçülen tüketim reçeteyle uyumlu — eksi büyük ihtimalle alış girişinin yapılmamasından."*
- *"↳ Bu hammadde için henüz üretim ölçümü yok; sebep söylenemez."*

> **"Ölçülen FAZLA" durumu reçeteyi suçlamıyor.** O yönde reçete zaten AZ düşüyor demektir ve eksi
> stoğu açıklamaz — ters yöndeki farkı da teşhis saymak, kolayca yanlış yere yönlendirirdi.
>
> Ayrıca **reçetenin düzeltilmesi biriken eksiyi kapatmaz**, sadece büyümesini durdurur. Bu cümle
> ekranda yazılı: yoksa kullanıcı reçeteyi düzeltip sayımı atlar ve kayıt bozuk kalır.

Reçete gerçekleşmesi MAMUL üzerinde, eksi stok HAMMADDE'de tutuluyor; o hammaddeyi kullanan bütün
mamullerin ölçümlerine bakılıyor.

**Doğrulama:**
- `birim-recete-gerceklesme.js` — üç teşhisin ayrı ayrı doğru çıkması, ters yöndeki farkın reçeteyi
  suçlamaması, tek ölçümde teşhis yapılmaması, başka rengin karışmaması.
- `senaryo-eksi-stok-ihtiyac.js` — iki durum ayrı ayrı açılıyor: ölçüm reçeteyi suçladığında
  şüpheli mamulün adıyla söylenmesi, ölçüm yokken sebebin SÖYLENMEMESİ.

#### AÇIK KALAN

- **Sayım ekranı** — her iki teşhiste de son adım sayım. Uyarıdan oraya giriş noktası konmalı.

### 7z-32. PALET ADAÇAYI YEŞİLİNE ÇEVRİLDİ (7 Eylül, v1.198.0)

**Kullanıcı bir renk örneği gönderdi:** *"Mor renk olmadı. Attığım renk yakışır bizim tonlar ile."*

Haklıydı: uygulamanın kendi renkleri zaten yeşil ailesinde (atölye `#4E6B4E`, muhasebe `#2F6B4F`,
depo `#5A6B4E`). Mor onların yanında yabancı duruyordu.

| Rol | Mor | Yeşil |
|---|---|---|
| Zemin | `#E4DAF2` | **`#EDF2EC`** |
| Seçili zemin | `#CFC0E8` | `#D8E5D4` |
| Ayraç | `#CBBBE0` | `#C7D8C2` |
| Ana metin | `#3F3159` | `#2C4029` |
| Pasif sekme metni | `#5D4E80` | `#4F6349` |
| Soluk metin | `#6E5F8C` | `#5E7358` |
| Karşılama bandı | `#4A3A63` | `#3C4F38` |
| Bant vurgusu | `#C9B4EA` | `#AFC9A9` |

> ### TEK GEÇİŞTE, EŞLEME TABLOSUYLA
> Mor paletinde rolleri parça parça değiştirmiştim ve her seferinde bir yer atlanmıştı: menü
> metni, sonra mobil çubuk zemini, sonra şerit yazısı, sonra kart ikonları — **dört tur ve dört
> kullanıcı bildirimi**.
>
> Bu sefer önce eşleme tablosu yazıldı, sonra bütün kaynak dosyalarda birden uygulandı: **34
> nokta, tek geçiş**. Ardından eski renklerin hiç kalmadığı arandı (`0` sonuç) ve dört ayrı yer
> (menü, şerit, mobil çubuk, karşılama bandı) tarayıcıda tek tek ölçüldü.
>
> **Kalıp: renk değişimi bir arama-değiştirme işi değil, bir ROL EŞLEMESİ işi.** Rolleri önce
> listele, sonra hepsini birden çevir.

Yorumlardaki "mor" geçen gerekçeler de güncellendi — kodda yanlış bilgi bırakmamak için.

**Doğrulama:** `senaryo-sekmeler.js` altın çıktısında yalnız renk DEĞERLERİ değişti; davranış
ölçümleri (kaydırma, panel açılması, kur rozeti, başlık konumu) aynı kaldı.

### 7z-33. GEZİNME ZEMİNLERİNE KUBBE EFEKTİ (7 Eylül, v1.199.0)

**Kullanıcı:** *"Arka zemine efekt yapsak, renk çok düz duruyor. Şeridin ortası koyu, kenarlar
daha açık, gölgeli veya oval gibi."*

Tek renkli geniş bir şerit gözde düz bir levha gibi duruyor. Hafif bir eliptik geçiş yüzeye
derinlik veriyor: ortası bir tık koyu, kenarlara doğru açılıyor.

> **FARKLAR KASITLI OLARAK KÜÇÜK** (`#E2ECDF → #EDF2EC → #F5F8F4`, üç adımda ~%5 parlaklık).
> Gradyan bir DOKU olmalı, bir desen değil. Belirgin olsaydı üstündeki metnin kontrastı yer yer
> değişir ve okunurluk "zeminin neresine denk geldiğine" bağlı hâle gelirdi.

#### İki sabit, yüzeyin yönüne göre

| Sabit | Nerede | Elips | Neden |
|---|---|---|---|
| `ZEMIN_EFEKT_YATAY` | üst şerit, mobil alt çubuk | `75% 180%` | Geniş-alçak yüzeyde geçiş SOLDAN SAĞA olmalı → elips DAR ve UZUN. Yükseklik %180, elipsin 40 piksellik şeridi dikeyde tamamen aşması için; yoksa üst-alt kenarda halka görünür. |
| `ZEMIN_EFEKT_DIKEY` | sol menü | `180% 65%` | Dar-uzun yüzeyde geçiş YUKARIDAN AŞAĞIYA olmalı → elips GENİŞ ve KISA. |

> ### İKİ HATA YAPTIM, İKİSİ DE ÖLÇÜMLE ÇIKTI
> **1. Yanlış yere yanlış gradyan.** Yamada iki `background: "#EDF2EC"` satırını sırayla
> eşleştirdim; ilki sandığım gibi sol menü değil MOBİL ÇUBUK'tu. Menü yatay gradyan aldı — yani
> ortası koyu bir bant değil, üstü ve altı sönük bir sütun. Tarayıcı ölçümü yakaladı.
>
> **2. Ölçüm etiketim yanıltıcıydı.** Düzelttikten sonra ölçüm hâlâ "ters" gösteriyordu; sebep
> koddaki atama değil, benim `genişlik > yükseklik ? yatay : dikey` kıyasımdı. Elipsin ŞEKLİ ile
> yüzeyin YÖNÜ ters orantılı — yatay yüzey için dar-uzun elips gerekiyor. Sabit adları yüzeyin
> yönüne göre; bu ayrım yorumda açıkça yazılı, çünkü karıştırması kolay.

**Doğrulama:** üç yüzeyin elips ölçüleri ayrı ayrı okundu — menü `180×65`, şerit ve mobil çubuk
`75×180`.

#### Belirginlik artırıldı (v1.200.0)

**Kullanıcı:** *"Daha belirgin olsun efektler. Gerekirse rengi koyulaştır."*

İlk deneme ~%5 parlaklık farkındaydı ve ekranda neredeyse fark edilmiyordu. Yeni değerler
`#C6D9C0 → #E0EBDC → #F4F8F3` — üç adımda ~%18. Seçili öge zemini (`#BCD3B5`) ve ayraç
(`#AFCAA8`) da koyulaştırıldı: gradyanın orta bölgesinde kaybolmasınlar diye.

**SINIRI ZEVK DEĞİL, METİN KONTRASTI ÇİZDİ.** En koyu zemin noktasında ölçülen oranlar:

| Ne | Oran | Eşik |
|---|---|---|
| Ana metin `#2C4029` | **7,52** | AAA = 7 |
| Seçili öge üzerinde ana metin | **7,01** | AAA = 7 |
| Soluk metin `#455A40` | **5,05** | AA = 4,5 |
| Pasif sekme `#465A41` | **5,03** | AA = 4,5 |

> ### GRADYAN KOYULAŞINCA SOLUK TONLAR SIKIŞTI
> İlk denemede soluk metin **3,46**'ya düştü — AA eşiğinin altı, üstelik 11 piksellik yazıda.
> Ölçüm bunu gösterdi ve soluk metin ile pasif sekme rengi de birlikte koyulaştırıldı.
>
> **Kalıp: bir zemin rengini değiştirmek, ONUN ÜZERİNDEKİ HER ŞEYİ yeniden ölçmeyi gerektirir.**
> Gradyanda bu iki kat geçerli, çünkü "zemin rengi" tek bir değer değil, bir aralık — kontrast en
> kötü noktaya göre hesaplanmalı.

Ortayı daha da koyulaştırmak mümkündü ama o zaman yazı, zeminin neresine denk geldiğine göre
okunur/okunmaz hâle gelirdi — bir gradyanın yapabileceği en kötü şey bu.

### 7z-34. KREM İÇERİK ZEMİNİNE VİNYET (7 Eylül, v1.201.0)

**Kullanıcı:** *"Krem rengi gibi olan yerde kenar yakın tonlarda ve efektli olsun."*

Gezinme yüzeyleri efekt alınca krem içerik alanı yanlarında düz kaldı.

> ### GEZİNMENİN TERSİ YÖNDE: ORTASI AÇIK, KENARLAR KOYU
> Şerit ve menü DAR yüzeyler; üzerlerindeki yazı hep aynı bölgede, kubbe (ortası koyu) sorun
> çıkarmıyor. İçerik alanı ise sayfanın en büyük yüzeyi ve **metin ortasında okunuyor** —
> kenarlar sayfa marjı. Aynı kubbeyi buraya koysaydık **en çok okunan bölge en koyu yer** olurdu.

**ÖLÇÜM BU KARARI ZORLADI.** Önce kubbe denendi (`#EADCC5` merkez) ve kontrast ölçüldü:

| Zemin | Soluk metin `#7A6A50` oranı |
|---|---|
| Mevcut düz `#F2E8D8` | 4,32 |
| Kubbe merkezi `#EADCC5` | **3,88** ← daha kötü |
| Vinyet merkezi `#F7F0E3` | **4,63** ← daha iyi |
| Vinyet kenarı `#E6D6BC` | 3,67 (orada metin yok) |

Vinyet merkezi AÇTIĞI için en çok okunan bölgede kontrast ARTIYOR. Kenarda düşüyor ama orası boş
alan.

`backgroundAttachment: "fixed"` — gradyan sayfayla kaymıyor, ekrana sabit. Akıp gitseydi uzun
sayfalarda aşağı inildikçe zemin tek renge dönerdi; efekt yalnız sayfa başında görünür, aşağısı
düz kalırdı.

Belirginlik merkez/kenar ~%28 (gezinmedeki %18'den fazla): geçiş çok daha geniş bir alana
yayıldığı için aynı sertlik burada daha yumuşak görünüyor.

#### Ton yeşile çekildi (v1.202.0)

**Kullanıcı ekran görüntüsüyle:** *"Ortadaki renkten bahsediyorum. Renk paketinin dışında kalmış,
tonun yeşillenmesi gerekli."*

Gezinme yüzeyleri yeşile dönünce içerik zemini sıcak kremde kaldı ve **ekranın ORTASI paletin
dışına düştü** — en büyük yüzey olduğu için de en çok göze çarpan uyumsuzluk.

Krem tamamen atılmadı, **yeşile çekildi**: `#F1F4E8 → #E9EEDD → #D9E2C9`. Hâlâ bej karakterinde
ama menü zeminiyle (`#EDF2EC`) aynı ailede — ölçüm: aralarındaki parlaklık farkı **%4**, yani yan
yana durduklarında aynı yüzeyin iki tonu gibi okunuyorlar.

> **KARTLAR SICAK KREM KALDI** (`#FBF6EC`) ve bu bilinçli: zemin yeşile kayınca kartlar ondan
> **%10** ayrışıyor, yani içerik kutuları zeminden daha net ayırt ediliyor. İkisi de aynı tona
> gitseydi sayfa tek düze bir yüzeye dönerdi.

**Yan fayda — açık madde kapandı:** soluk metin `#7A6A50` eski krem zeminde 4,32 ile AA eşiğinin
altındaydı. Yeni tonların merkezinde oran **4,71** — artık eşiğin ÜSTÜNDE. Yani renk uyumu için
yapılan değişiklik okunurluğu da düzeltti.

Yedek düz renk de gradyanın orta tonuyla hizalandı (`#E9EEDD`): gradyan yüklenemezse ekran birden
başka bir renge dönmesin.

### 7z-35. SİPARİŞ DURUMU ELLE SEÇİLMİYOR + ORTAK EYLEM ŞERİDİ (7 Eylül, v1.203.0)

**Kullanıcı:** *"Sipariş durumu manuel kaldıralım, gerek yok çünkü sipariş hareketi ile durum
belirleniyor. Silme ve kaydetme butonları tek tip olsun; bazı yerlerde aşağıda, bazılarında
üstte. Standart olsun, kullanıcı ekranda silme/kaydetme aramasın — hepsi sağ üstte. Kaydet, sil,
düzenle ikon şeklinde standart olsun."*

#### Durum artık rozet

Açılır liste kaldırıldı. **Elle seçim, hareketlerin hesapladığı durumla ÇELİŞEBİLİYORDU:**
kullanıcı "Tamamlandı" seçse de teslim edilmemiş kalem duruyorsa liste onu bekleyen sayıyordu.
**İki kaynak varsa biri yalan söyler.**

`durumGuncelle` ve `onDurumChange` propu tamamen kaldırıldı (5 geçiş noktası). Rozet, neye
dayandığını ipucunda söylüyor: *"Durum, siparişin hareketlerinden hesaplanır"*.

#### `KayitEylemleri` — ortak şerit

Uygulamada **23 ayrı "Kaydet" düğmesi** var, **13 dosyada**; kimi formun altında, kimi başlığın
yanında. Her ekranda düğmeyi ARAMAK gerekiyor.

Ortak bileşen üç eylemi tek yerde tanımlıyor: aynı sıra, aynı ikonlar, sağ üstte.

> **SIRA SABİT — Düzenle · Kaydet · Sil.** Silme EN SAĞDA ve en uçta: yanlışlıkla basma riski en
> yüksek olan eylem, parmağın en az uğradığı köşede dursun. Kaydet ile Sil'i yan yana koymak
> (ikisi de "işi bitiren" eylem gibi göründüğü için) en tehlikeli yerleşim olurdu.
>
> Verilmeyen eylem HİÇ ÇİZİLMİYOR; devre dışı gri bir ikon "neden basamıyorum" sorusu doğurur.

**Doğrulama:** `senaryo-siparis-duzenle.js` — açılır listenin kalmaması ve rozetin ("Onaylandı")
ipucuyla birlikte durması.

#### Sipariş kartı tamamlandı (v1.204.0)

**Kullanıcı:** *"Adım adım yapalım, sipariş ok."*

Siparişin eylemleri ÜÇ yere dağılmıştı: silme başlıkta, "Siparişi Düzenle" ve "Siparişe Yeni Kalem"
kartın ortasında (notun yanında). Üçü de başlıktaki tek şeride alındı.

Kartın ortasında artık yalnız NOT duruyor — o bir eylem değil, siparişin kendi bilgisi.

> **`duzenleBaslik` parametresi eklendi.** İkon tek başına NEYİ düzenlediğini söylemiyor: "Düzenle"
> yazan bir kalem ikonu, üç farklı şeyi düzenleyebilecek bir ekranda hangisi olduğunu belirtmez.
> İpucu metni bunu taşıyor ("Cari, tarihler, müşteri kodu ve notu düzenle") ve testler de ona
> bağlanıyor.

> **Senaryo metne değil ANLAMA bağlandı.** `senaryo-siparis-duzenle` düğmeleri METİNLERİYLE
> buluyordu ("Siparişi Düzenle"); ikona dönünce kırıldı. Artık `title` ile bulunuyor — görsel
> değişiklikte kırılmaz. Çıktı birebir aynı kaldı, yani davranış korundu.

#### AÇIK KALAN — dönüşüm devam ediyor

Şerit yazıldı ve sipariş kartında kullanıldı; **kalan 12 dosya dönüştürülmedi.** Hepsini tek turda
taşımak ölçülemeyecek kadar geniş bir değişiklikti ve yarım bırakılan bir standart, bilinen bir
tutarsızlıktan KÖTÜDÜR — kullanıcı artık hangi ekranın hangi kurala uyduğunu da bilmez.

**Sıradaki:** `265-carikart` (cari kartı — sipariş kartıyla aynı yapı, en yakın eş), sonra
`160-urunkarti`, `315-paketleme`, `210-hesaplar`, `152-stok`, `150-stok-giris`, `255-stokfisi`,
`260-cari`, `140-asorti`, `275-yazdir`, `225-kur`.

**`325-siparis`'teki 5 düğme KASITLI OLARAK DOKUNULMADI:** onlar YENİ KAYIT formunun sonundaki
"Siparişi Kaydet / Vazgeç" çifti. Uzun bir formda kaydet düğmesi akışın sonundadır ve orada
aranmaz; yukarı taşımak kullanıcıyı formu doldurduktan sonra başa döndürürdü.

> Not: bunların bir kısmı YENİ KAYIT formu (formun altında "Kaydet" yaygın ve doğru bir kalıp),
> bir kısmı VAR OLAN kaydın eylemleri (sağ üstte olmalı). Dönüştürmeden önce her biri bu ikisinden
> hangisi diye ayrılmalı — hepsini aynı kalıba sokmak formları bozardı.

### 7z-36. ALIŞ FİŞİ İHTİYAÇTAN DOLUYOR (7 Eylül, v1.205.0)

**Kullanıcı:** *"Depodan alış fişi oluşturduğumuzda ihtiyaç otomatik çeksin, tekrar elle
girmeyelim."*

Depo'dan tek ürünle geliniyordu; o tedarikçiden alınacak DİĞER eksikler ekranda görünmüş olsa bile
fişe tek tek yazılıyordu. Aynı tedarikçiye zaten fiş kesiliyorsa hepsini aynı fişe koymak işin
doğal hâli.

**KAYNAK MRP**, depo'daki ham eksi stok değil: "gerçekten ne lazım" sorusunun cevabı bekleyen
siparişlerden geliyor. Eksi stok bir kayıt hatası, miktar değil (7z-30).

**TEDARİKÇİ SÜZGECİ ŞART.** Fiş TEK BİR CARİYE kesiliyor; başka tedarikçinin malını o fişe koymak
borcu yanlış yere yazardı. Tedarikçisi olmayan hammadde de girmiyor.

> **KALEMLERİN NEREDEN GELDİĞİ SÖYLENİYOR:** *"2 kalem bu tedarikçinin eksiklerinden dolduruldu ·
> miktarlar değiştirilebilir, satırlar silinebilir"* + "Hepsini temizle". 18 satırın kendiliğinden
> belirmesi, söylenmezse "ben bunları girmedim" sorusu doğurur.
>
> Miktarlar serbest: alım ihtiyaçtan farklı olabilir (tedarikçinin minimum sipariş adedi,
> yuvarlama, bütçe).

**ÇİFT EKLEME KORUMASI:** zaten listede olan satır tekrar eklenmiyor. Form yeniden çizilirse
(cari değişimi, pencerenin geri gelmesi) miktarlar ikiye katlanırdı.

İhtiyaç hesabı `try/catch` içinde: hesaplanamazsa fiş yine açılıyor. Bu bir kolaylık, önkoşul değil.

**Doğrulama:** `test/senaryo-fis-ihtiyactan.js` — aynı tedarikçinin iki renginin gelmesi, BAŞKA
tedarikçinin eksiğinin GELMEMESİ, bilgi şeridi ve temizleme yolu.

> **Test verisinde bulunan tuzak:** tohumdaki reçetelerde `mamulRenk`/`mamulBeden` alanları yoktu
> ve MRP hiç satır üretmiyordu. Ölçüm önce "0 kalem" verdi; kodda değil VERİDE eksik olduğu,
> `mrpHesapla`yı doğrudan çağırınca anlaşıldı. Senaryo o alanları kuruyor.

#### Tıklanan satır da kalem oluyor (v1.206.0)

**Kullanıcı:** *"Aslında alış fişine tıkladığımda TIKLANAN ihtiyacı otomatik ekrana getirmesini
istedim; şu anda hammadde, renk ve miktar giriyoruz."*

İlk uygulama diğer eksikleri kalem yapıyordu ama **tıklanan satır yalnız FORM ALANLARINI
dolduruyordu** (`baslangicKalem`): ürün ve renk seçili geliyor, kalem listesine girmesi için
kullanıcının ayrıca "Kalem Ekle"ye basması gerekiyordu. Depo'da zaten "bunu alacağım" denmiş bir
satır için fazladan bir adım.

Artık tıklanan satır, açık miktarlarıyla birlikte listenin BAŞINDA kalem olarak duruyor.

> ### BU ARADA BENİM BOZDUĞUM BİR ŞEY ORTAYA ÇIKTI
> `baslangicKalemler` etkisi ile `baslangicKalem` etkisi AYNI `ilkSecimYapildi` bayrağını
> paylaşıyordu. Çoğul olan önce çalışıp bayrağı kaldırınca **tekil olan hiç çalışmıyordu** —
> yani bir önceki sürümde form doldurma tamamen bozulmuştu.
>
> Tekil yol kaldırıldı: iki ayrı doldurma mekanizması, ikisinin zamanla ayrışması demekti. Artık
> TEK YOL var.

> ### SENARYODA HİÇ ÖLÇMEYEN BİR ÖLÇÜM
> `senaryo-satin-al-dugmesi` içindeki `urunOnDolu`, yanlış ürünü ("Bot") arıyordu ve **hep `false`
> dönüyordu**. Yeşil görünmediği için kimse fark etmemiş; ölçtüğünü sandığı şeyi hiç ölçmüyordu.
> Anlamlı hâle getirildi (`urunKalemOlarakGeldi`) ve artık `true`.
>
> `miktarOnDolu` de `false → true` oldu: o senaryo tam bu eksikliği ölçüyormuş.

**Doğrulama:** `senaryo-fis-ihtiyactan.js` — tıklanan satırın kalem olarak gelmesi ve MİKTARININ
(20) dolu olması.

#### "Satın Al" da aynı kurala geçti (v1.207.0)

**Kullanıcı:** *"Satın al tuşu da aynı mantıkta çalışmalı."*

"Satın Al", Planlama'daki satın alma panelini o malzemeye odaklanmış olarak açıyordu ama
**miktarları taşımıyordu**: hedefle eklenen serbest satırlar `eksikMiktar: 0` ile geliyor ve
kullanıcı Depo'da GÖRDÜĞÜ sayıyı buraya elle yazıyordu.

Zincirin üç halkası da güncellendi: Depo düğmesi açık miktarları gönderiyor → `hammaddeyiPlanla`
onları hedefe koyuyor → ihtiyaç ekranı serbest satırı o miktarla kuruyor.

> `fark` ve `eksikMi` açık miktardan TÜRÜYOR: satır ancak eksikse satın alma listesine giriyor.
> Sıfır miktarlı satırı eksik saymak, alınacak bir şey yokken sipariş formu açtırırdı.

**Doğrulama:** `senaryo-satin-al-dugmesi.js` — `satinAlMiktarOnDolu` (rezervasyon açığı 20).

> **AYNI KURAL, İKİ DÜĞME.** "Alış Fişi" ve "Satın Al" farklı işler yapıyor (biri olmuş alım, biri
> söz) ama Depo'daki bağlamı taşıma kuralları aynı olmalı — kullanıcı ikisinden birinde elle
> yazmak zorunda kalırsa hangisinde olduğunu hatırlamak zorunda kalır.

### 7z-37. PARA BİRİMİ: SEMBOL vs KOD (9 Eylül, v1.208.0)

**Kullanıcı ekran görüntüsüyle:** *"Kur ile alakalı sıkıntı var. Satır bazında hammaddeyi TL birim
fiyatla çekti ama satıra USD yazdı, kur varken üstte çıkıyor ama kuru çekmedi. Hammadde alış
fiyatı 0,22 USD aslında, TL para birimi var."*

> ### UYGULAMADA İKİ AYRI PARA BİRİMİ GÖSTERİMİ VAR
> ```
> ÜRÜNLER  → SEMBOL   PARA_BIRIMLERI          = ["₺","$","€","£"]
> MUHASEBE → KOD      MUHASEBE_PARA_BIRIMLERI = ["TRY","USD","EUR"]
> ```
> Bu bilinçli bir ayrım değil, tarihsel. İki taraf hiç temas etmediği sürece sorun çıkarmıyordu.

7z-36'da ürünün alış para birimi DOĞRUDAN fiş kalemine yazıldı ve iki taraf ilk kez temas etti:
kalem `"$"` taşıyor, seçici onu tanımadığı için ekranda **"TRY" görünüyor** ama hesap `"$"` ile
yapılıyor → **"Kur eksik: $ → TRY"**. Yani ekrandaki değer ile hesaplanan değer farklıydı.

**`paraKoduna(deger)`** eklendi: `"₺"→"TRY"`, `"$"→"USD"`, `"€"→"EUR"`. Zaten kod olan değer
bozulmuyor (iki yönde de çağrılabilir).

> **KARŞILIĞI OLMAYAN SEMBOLDE `null`:** `£` ürün listesinde var ama muhasebede yok. Uydurma bir
> kod döndürmek yanlış para biriminde fatura demekti. O durumda **fiyat da taşınmıyor** (0
> bırakılıyor): yanlış para biriminde bir fiyat taşımaktansa boş bırakmak dürüst — kullanıcı boş
> fiyatı görür ve girer, ama sessizce TL'ye çevrilmiş bir dolar fiyatını fark etmez.

**Doğrulama:**
- `birim-defter.js` — üç sembolün çevrilmesi, kodun bozulmaması, `£`/boş/tanımsız için `null`.
- `senaryo-fis-ihtiyactan.js` — ürün `"$"` tutarken kalemlerin **USD** gelmesi ve "Kur eksik"
  uyarısının ÇIKMAMASI.

> **DERS:** iki alt sistem yıllarca ayrı yaşayıp aynı kavramı farklı temsil edebilir; sorun ancak
> aralarına bir köprü kurulduğunda ortaya çıkar. Köprü kurarken temsil farkı ARANMALI — burada
> ölçüm bunu yakalamadı çünkü test verisindeki ürünlerde para birimi hiç doluydu değildi;
> kullanıcının gerçek verisi yakaladı.

#### Sterlin kaldırıldı (v1.209.0)

**Kullanıcı:** *"£ bunu uygulamadan kaldır, bu birim hiç kullanılmaz. Nerede varsa tara ve
kaldır."*

Tarama sonucu: **bir tanım, üç yorum.** `PARA_BIRIMLERI` listesinden çıkarıldı, yorumlardaki
örnekler güncellendi.

> Sterlin zaten muhasebe tarafında karşılığı OLMAYAN bir seçenekti (`MUHASEBE_PARA_BIRIMLERI`
> içinde yok): seçilebiliyor ama hiçbir hesaba giremiyordu. Listede durması, bir gün seçilip
> sessizce yanlış sonuç üretmesi demekti.

**`paraKoduna` hâlâ `£`'yi TANIMIYOR ve bu kasıtlı.** Seçenek listeden çıkarılınca VERİDEN
çıkmaz — eski bir kayıtta seçilmiş olabilir. `null` dönüp fiyatın taşınmamasını sağlıyor;
kullanıcı boş fiyatı görüp düzeltiyor. Sessizce TL'ye düşseydi fark edilmezdi.

Birim testi genelleştirildi: kaldırılmış sembol (`£`) ve hiç bilinmeyen sembol (`¥`) ayrı ayrı
sınanıyor.

**Doğrulama:** ürün formundaki para birimi seçicilerinde artık yalnız `₺ $ €` var.

### 7z-38. CARİNİN PARA BİRİMİ VARSAYILAN GELİYOR (9 Eylül, v1.210.0)

**Kullanıcı:** *"Cari açarken varsayılan para birimini seçelim, alış veya satışta olan para
birimini çeksin. Kullanıcı değişmek isterse değişebilir."*

Carinin kendi para birimi zaten kayıtlıydı (`cari.paraBirimi`) ama formlar onu kullanmıyordu:

| Yer | Önceki | Şimdi |
|---|---|---|
| Cari kartı hareket formu | sabit `"TRY"` | carinin para birimi |
| Stok fişi (açılış) | carininki (doğruydu) | — |
| Stok fişi (cari DEĞİŞİNCE) | **eski değerde kalıyordu** | yeni carininki |

Dolarla çalışan bir tedarikçiye her girişte para birimi elle düzeltiliyordu.

> ### VARSAYILAN ≠ DAYATMA
> `paraBirimiElle` bayrağı: kullanıcı para birimini bir kez elle seçtiyse, sonradan cari değişse
> bile o seçim KORUNUYOR. Otomatik bir varsayılan, kullanıcının bilinçli seçimini ezmemeli —
> aksi hâlde "değiştiriyorum ama geri dönüyor" durumu doğar ki bu, hiç varsayılan olmamasından
> daha sinir bozucudur.

Kalem para birimi de aynı yerden geliyor: fişin geneli dolar iken satırın TL başlaması, her
kalemde iki ayrı yeri düzeltmek demekti.

**Doğrulama:** `senaryo-pesin-tahsilat.js` — tedarikçi USD iken ödeme formunun USD açılması.
Ayrıca elle sınandı: fiş açılışta USD, cari TL olana çevrilince TRY.

#### Sorulmayan bir bilgi karar veriyordu (v1.211.0)

**Kullanıcı:** *"Cari açılışta varsayılan para birimi seçmiyoruz ki? Bilgiyi neden alıyor?"*

**Haklıydı ve bu benim bıraktığım bir boşluktu.** Yeni cari formunda para birimi alanı **HİÇ
YOKTU**: cari sessizce `"TRY"` kaydediliyor, kullanıcı ancak kartını açıp düzenlerse fark
ediyordu. v1.210.0'da hareket ve fiş formları bu alanı varsayılan olarak kullanmaya başladı —
yani **hiç sorulmayan bir bilgi, her işlemin para birimine karar veriyordu.**

Alan forma eklendi (Adres/Not satırının altında). Varsayılan yine TRY — çoğu cari TL, her
seferinde seçtirmek gereksiz. Ama artık **görünür ve değiştirilebilir**; sessiz bir varsayım değil.

**Doğrulama:** `senaryo-cari-kart.js` — formda USD seçilip kaydedilen carinin `paraBirimi`
alanının USD olması.

> **DERS:** bir alanı "varsayılan kaynağı" yapmadan önce, o alanın KULLANICI TARAFINDAN
> GİRİLEBİLİR olduğundan emin olunmalı. Yoksa sistem, kimsenin girmediği bir değere göre karar
> verir ve kullanıcı neden öyle davrandığını anlamaz.

> **Ölçüm tuzağı, bu oturumda kaçıncı kez:** form doldururken görünmeyen bir alana yazdım
> ("Cari unvanı gerekli" hatası verdi). Aynı etiketler kapalı formlarda da duruyor;
> `getBoundingClientRect().width > 0` süzgeci olmadan ilk eşleşen görünmez olan olabiliyor.

### 7z-39. SON İŞLEMLERDE FİŞ BAŞINA TEK SATIR (9 Eylül, v1.212.0)

**Kullanıcı ekran görüntüsüyle:** *"Fişleri satır olarak gir, tek fiş görünsün."*

Cari hareketleri KALEM kalem tutuluyor. Beş kalemli bir satış fişi akışta **beş satır** üretiyordu
ve hepsi aynı fiş numarasını taşıdığı için liste kendini tekrar ediyor gibi görünüyordu —
kullanıcı aynı fişi (`SF-20260909-001`) üç kez gördü.

Artık fiş numarası olanlar tek satırda toplanıyor:
`SF-TEST-1 · 3 kalem · Bot · Lacivert` — tutar kalemlerin toplamı (29.640 ₺).

Kararlar:
- **Grup anahtarı cari + fiş no.** Fiş sayacı tipe göre ilerlediği için aynı numara iki ayrı
  caride görünebilir; karışmasınlar.
- **Fiş numarası OLMAYAN kayıt tek başına duruyor** — onu neye göre gruplayacağımızı bilmiyoruz.
- **Zaman, en yeni kalemin zamanı:** fişin akıştaki yeri son hareketine göre.
- **Ürün adları tekilleştiriliyor:** aynı ürünün üç bedeni "Bot · Bot · Bot" değil "Bot" yazsın.
- Para birimi ilk kalemden: fişin kayıt para birimi zaten tek olmalı.

**Doğrulama:** `senaryo-son-islemler.js` — üç kalemli fişin numarasının bir kez geçmesi, satırda
"3 kalem" yazması ve toplamın doğru olması.

> **Ölçüm sırası tuzağı:** ölçümü önce kapanıştan hemen önce yazdım ve panel o sırada kapalıydı;
> "toplam doğru" derken fiş numarasını hiç bulamadı. Panelin AÇIK olduğu ana taşındı.

### 7z-40. HAREKETSİZ STOK OLMAZ — STOK TUTARSIZLIĞI (9 Eylül, v1.213.0) · KRİTİK

**Kullanıcı ekran görüntüsüyle:** *"Yine başladı stok tutarsızlığı. Depodan alış fişine tıklayarak
giriş yaptım ama sorun bu."*

Ekranda iki alış fişi (+8 ve +8), hareket neti 16, **kayıtlı stok 0** ve uygulamanın kendi uyarısı:
*"Kayıtlı stok ile hareket geçmişi tutmuyor."*

> ### SEBEP: EŞLEŞMEYEN VARYANT SESSİZCE ATLANIYORDU
> ```js
> const h = yeniHareketler.find((x) => x.renk === v.renk && x.beden === v.beden);
> return h ? { ...v, miktar: v.miktar + h.miktar } : v;   // ← eşleşmezse HİÇBİR ŞEY olmuyor
> ```
> Fiş kesiliyor, cari hareketi yazılıyor, stok hareketi yazılıyor — ama varyant bulunamadığı için
> **miktar hiç artmıyordu.** Kalemin rengi boş/`null` geldiğinde (Depo'dan renksiz bir satırla
> gelinince) tam olarak bu oluyordu. Ölçümle yeniden üretildi: hareket 2, varyant miktarı 0.

**"Fişsiz hareket olmaz" kuralının simetriği eksikmiş: HAREKETSİZ STOK DA OLMAZ.** Hareket
yazılıyorsa karşılığı stokta görünmek ZORUNDA.

İki katmanlı düzeltme:

1. **`fisYaz` artık varyant açıyor.** Eşleşme normalleştirilerek aranıyor (`null` ile `""` aynı
   sayılıyor — veri iki biçimi de taşıyor); yine de bulunamazsa varyant EKLENİYOR. Yeni bir renk
   ilk kez alınıyor olabilir; ama her hâlükârda stok hareketle tutuyor.
2. **Kaynakta renk çözülüyor.** Depo'dan renksiz gelindiğinde, ürünün TEK rengi varsa o
   kullanılıyor. Birden fazlaysa boş bırakılıyor — yanlış varyanta yazmaktansa kullanıcıya
   sordurmak doğru.

**Doğrulama:** `birim-fisyaz-gerial.js` — rengi BOŞ bir kalemle fiş yazılıyor; hareketin yazılması,
**stok toplamının hareket netine eşit olması** ve karşılıksız hareket için varyant açılması.

> ### KARARSIZ BİR ÖLÇÜM DE ORTAYA ÇIKTI
> `senaryo-son-islemler` içindeki `sonIslemOzeti` bu turda `false → true` döndü. Bunu kendi
> değişikliğime yormadan önce **eski `fisYaz` ile tekrar çalıştırdım: yine `true`.** Yani değişim
> benim düzeltmemden değil.
>
> Sebep: geçen turda panel ölçümü için eklediğim `waitForTimeout(700)`, fiş kesme adımına daha çok
> zaman tanıyor. Ölçüm önceden KARARSIZDI ve `false` yanlış değerdi. Şimdi üç ardışık çalıştırmada
> `true`.
>
> **Bir altın çıktı değiştiğinde ilk iş, değişimin kendi değişikliğinden gelip gelmediğini
> KANITLAMAK** — yormak değil.

### 7z-41. "STANDART" YER TUTUCUSU (10 Eylül, v1.214.0)

**Kullanıcı ekran görüntüleriyle:** *"Stokta renk var ise Standart renk olmaz, burada çelişki var.
Stokta Standart açıklamasına gerek de yok. Örnek: Çelikli taban renksiz, renk altında Standart
yazıyor — mantık buna göre kurulu ise devam edebiliriz, yoksa Standart yazısına gerek yok."*

**Mantık gerçekten öyle kurulu.** Renksiz/ölçüsüz varyant `renk: "Standart", beden: "Standart"`
olarak tutuluyor (`152-stok.jsx`, `077-barkod.jsx`) ve barkod şemasında `0` kodu bu yer tutucuya
AYRILMIŞ. Yani "Standart" bir tanım değil, "bu üründe renk/ölçü ayrımı yok" demenin yolu.

**Çelişki benim v1.213.0'daki eklememden geldi.** Karşılığı olmayan hareket için varyant açarken
BOŞ dize yazmıştım (`renk: ""`), oysa uygulamanın kuralı `"Standart"`. Sonuç: Bağcık kartında
- `Siyah · Standart` (gerçek renk)
- `Standart · Standart` (yer tutucu)
- `· Standart` ← **adsız renk, benim açtığım satır**

İki düzeltme:

1. **Açılan varyant `"Standart"` yazıyor**, boş dize değil.
2. **Eşleşmede `"Standart"` ile boş AYNI sayılıyor.** Aynı varyant kimi kayıtta `""`, kimi kayıtta
   `"Standart"` duruyor; ikisini farklı saymak aynı malzeme için iki satır açardı — ekran
   görüntüsündeki `Siyah · Standart` / `· Standart` ikilisi tam olarak buydu.

**Doğrulama:** `birim-fisyaz-gerial.js` — hem "Standart" hem gerçek renk taşıyan bir üründe
renksiz kalemle fiş yazılıyor; YENİ SATIR AÇILMIYOR, miktar mevcut "Standart" varyantına gidiyor,
gerçek renk bozulmuyor.

#### GÖÇ YAZILMAYACAK — karar

Bozuk kayıtları (adsız renk satırı, gerçek renkle birlikte duran "Standart") temizleyecek bir göç
düşünülmüştü. **Kullanıcı gerek olmadığını söyledi (10 Eylül): "Test aşamasındayız, boşa bir şey
yapmana gerek yok, zaten sıfırlayacağız veriyi."**

Kod tarafı düzeldi; sıfırlanan veriyle bu satırlar zaten oluşmayacak. Göç yazmak, bir kez
çalışacak ve sonra ölü kalacak bir kod demekti.

> Bu turda ayrıca hatırlanması gereken: **hangi aşamada olunduğu, neyin yapılmaya değer olduğunu
> değiştirir.** Üretimdeki bir sistemde göç zorunluydu; test aşamasında aynı iş boşa emek.

### 7z-42. SİPARİŞTEN FİŞE GEÇİŞ (10 Eylül, v1.215.0)

**Kullanıcı:** *"Siparişten satış fişine gidebilme. Satış fişine tıklayınca satış fişini açsın."*

Sipariş bir SÖZ, fiş olmuş bir iş. Sevkiyat yapıldığında aynı kalemler fişe elle yeniden
giriliyordu — oysa hepsi siparişte yazılı.

Sipariş kartının eylem şeridine fiş ikonu eklendi: siparişin carisi, tipi ve **bekleyen
kalemleriyle** fiş açılıyor.

> **YALNIZ BEKLEYEN MİKTAR TAŞINIYOR** (`miktar − karşılanan`). Kısmen teslim edilmiş bir kalemin
> tamamı fişe düşerse **müşteriye ikinci kez fatura kesilir.** Ölçüm: 10 sipariş, 4 karşılanan →
> fişe 6 geliyor.

Alış siparişinde alış fişi, satış siparişinde satış fişi açılıyor — tip siparişten geliyor.
Kalemin para birimi korunuyor: fiyat orada hangi parayla konuşulduysa o.

`stokFisiAc` çoğul kalem alacak şekilde genişletildi; Depo'daki yolla (7z-36) aynı mekanizma
kullanılıyor — ikinci bir doldurma yolu açılmadı.

**Doğrulama:** `senaryo-siparis-duzenle.js` — düğmeye basıldığında satış fişinin açılması.
Ayrıca elle sınandı: kalan 6 adet ve ürün adı fişte hazır.

#### Kapatınca gelinen ekrana dönüş (v1.216.0)

**Kullanıcı:** *"Gidiş geçişlerinde bağla, kapatınca geri ekrana gelsin unutma."*

`pencereKapat` **listenin SONUNCU** penceresine dönüyordu — bu açılış sırası, GELİŞ YOLU değil.
Siparişten fiş açılıp araya başka bir pencere girdiyse, fiş kapatıldığında kullanıcı hiç ilgisi
olmayan bir ekranda buluyordu kendini.

Pencereye `gelinen` alanı eklendi: hangi pencereden açıldıysa onun kimliği. Kapatılınca oraya
dönülüyor.

> **`gelinen` HÂLÂ AÇIKSA** oraya dönülüyor; o pencere kapanmışsa eski davranış (son pencere)
> geçerli — kapalı bir pencereye dönmeye çalışmak boş ekran demekti.
>
> **Yalnız VERİLDİYSE yazılıyor:** aynı pencere başka bir yerden yeniden açıldığında eski geliş
> yolu silinmiyor.

**Doğrulama:** `senaryo-siparis-duzenle.js` — fiş açılıyor, kapatılıyor ve SİPARİŞ kartına
dönülüyor (`sipariseDondu`).

> Bu altyapı geneldir: başka geçişlere de (cariden fişe, depodan ürüne) aynı şekilde `gelinen`
> verilerek bağlanabilir. Şu an yalnız siparişten fişe yolunda kullanılıyor.

#### KESİLMİŞ FİŞE GİTME (v1.217.0) — 7z-42 yanlış anlaşılmıştı

**Kullanıcı:** *"215'te yapılanı yanlış anladın. Kesilmiş fişin içine girsin, zaten siparişten fiş
kesebiliyor. Fiş ekranına tıklayınca fişe gitsin, amaç bu."*

7z-42'de YENİ fiş kesme yolu yapılmıştı; istenen ise sipariş kartındaki **fiş geçmişinde** duran
KESİLMİŞ fişe gitmekti. O listede fiş numarası DÜZ METİNDİ: kullanıcı fişin kesildiğini görüyor
ama içine giremiyordu.

Fiş numarası artık düğme; tıklanınca Fişler ekranı o numarayla süzülmüş olarak açılıyor.

- **Hedef aramaya yazılıyor**, ayrı bir "tek fiş" görünümü yazılmadı: liste zaten fiş numarasına
  göre süzülüyor ve kullanıcı aramayı temizleyip diğerlerine bakabiliyor.
- **Tip süzgeci "Tümü"ye alınıyor** — hedef fiş o an seçili tipte olmayabilir, kullanıcı boş liste
  görürdü.
- **Hedef tüketiliyor**: aksi hâlde arama temizlense bile her çizimde geri yazılırdı.
- Numarası olmayan satır düğme OLMUYOR — gidilecek bir yer yok.

> ### ÇALIŞTIĞI DOĞRULANDI (10 Eylül)
> Kullanıcı: *"Fişe gitme çalışıyor."* Sipariş kartındaki fiş geçmişinden kesilmiş fişe geçiş
> devrede.
>
> Otomatik ölçüm bunu yakalayamamıştı: test verisinde sipariş–fiş bağı kurulamadığı için fiş
> geçmişi bölümü hiç çizilmiyordu. **Senaryo yazılamayan bir yol, gerçek veriyle doğrulandı** —
> ileride bu bölüm için tohum verisi kurulabilirse senaryoya da alınmalı.
>
> 7z-42 de aynı sebeple yarım kalmıştı: istek yanlış anlaşıldı ve doğrulama, yapılanın DOĞRU ŞEY
> olduğunu değil yalnızca ÇALIŞTIĞINI gösterdi.

#### Mamul renklerine otomatik kod (v1.225.0) · BARKOD ENGELİ

**Kullanıcı:** *"Tanımlı model renklerine renk kodu sistem otomatik atmadığı için barkod
oluşturamıyor."*

`yeniRenkVeReceteEkle` içindeki kod üretimi **yalnız `tip === "Hammadde"` için çalışıyordu**;
mamul renkleri `kod: ""` ile kaydediliyordu. Barkod şeması renk kodunu ZORUNLU kullandığı için
(`077-barkod.jsx`) o renkler için barkod üretilemiyordu.

> **AYNI İŞİ YAPAN İKİ YER, BİRİ EKSİK.** Tanımlar ekranından mamul rengi eklendiğinde kod
> veriliyordu (`130-tanimlar.jsx`), model/reçete üzerinden eklendiğinde verilmiyordu. Bu oturumda
> defalarca çıkan kalıbın bir örneği daha.

Kod artık her tipe veriliyor. **Sayaç TİPE GÖRE ayrı ilerliyor** — hammadde ve mamul kodları
birbirinin numarasını yemesin.

> **AÇIK KALAN:** hâlihazırda kodsuz kaydedilmiş mamul renkleri kendiliğinden kod almaz. Test
> aşamasında veri sıfırlanacağı için göç yazılmadı (aynı gerekçe: 7z-41). Sıfırlama yapılmazsa
> o renklere Tanımlar ekranından elle kod verilmeli.

#### Ürün resmi tam ekran (v1.224.0)

**Kullanıcı:** *"Stok yönetimi ekranında stok resmine tıklayınca büyük resmini açsın."*

Katalog görünümündeki 280 piksellik kutu `objectFit: cover` ile görüntüyü KIRPIYOR; deri deseni,
taban dişi gibi ayrıntılar için tam hâli gerekiyor. Resim tıklanınca tam ekran açılıyor.

- Tam ekranda `objectFit: contain` — **kırpma yok**, büyütmenin amacı tam hâli görmek.
- Zemin VE resim tıklanınca kapanıyor: ayrı bir kapatma düğmesi aranmasın.
- `zIndex: 900` — pencerelerin (600) üstünde; görsel her şeyin önünde durmalı.

> **DOĞRULANAMADI:** denetimler ve senaryolar temiz ama tarayıcı ölçümünde katalog görünümü
> açılamadığı için tıklama sınanamadı. Gerçek kullanımda denenmeli.

> **Yama sırasında bir hata:** state eklerken ok fonksiyonunun `=>` işaretini `=` yapmışım
> (`const katalogGorsel = (p, renk) = ...`). Sözdizimi denetimi ve DÖRT senaryo birden yakaladı —
> bir metin yamasının komşu satırı bozabileceğinin hatırlatıcısı.

#### Alış Siparişi ekranının adlandırması (v1.223.0)

**Kullanıcı ekran görüntüsüyle:** *"Sağda satın alma yazısını alış siparişi olarak değiştir ve üst
başlıkta Sipariş Yönetimi yazmıyor."*

- **Başlık eksikti:** sekmenin anahtarı `satinalma` ama `TAB_TITLES` tablosunda karşılığı yoktu,
  başlık başka bir yerden düşüyordu. `satinalma: "Alış Siparişi"` eklendi.
- **Düğme "Yeni Satın Alma" diyordu** → **"Yeni Alış Siparişi"**. Ekranın adı Alış Siparişi;
  düğmenin başka bir ad kullanması hangi kaydın oluşacağını belirsizleştiriyordu.

> 6 Eylül'de "alış fişi" ile "satın al" ayrımı netleştirilmişti; bu düğme o günden kalma eski adı
> taşıyordu. **Bir kavram yeniden adlandırıldığında, o adı kullanan HER yer taranmalı.**

#### Siparişe giderken durum süzgeci (v1.221.0)

**Kullanıcı ekran görüntüsüyle:** *"İlgili siparişe git tıklayınca açılan ekran bu."* — Alış
Siparişi ekranı açılmış ama liste BOŞ: *"Bu filtre/aramayla eşleşen alış siparişi yok."*

Süzgeç varsayılan **"Bekliyor"** da kalıyordu; hedef sipariş "Tamamlandı" olduğu için ekran doğru
açılmasına rağmen hiçbir şey görünmüyordu. **Kullanıcı doğru yere geldiğini bile anlamıyordu.**

**İlk düzeltmede hedefin KENDİ durumu seçilmişti — yetmedi.** Kullanıcı: *"Tümünü açıp arama
ekranına o sipariş no yazsa daha sade olur; şu anda hepsini gösteriyor, aşağıda kalabiliyor."*
O durumda onlarca sipariş olabiliyor ve hedef listenin altında kayboluyordu.

**Doğru çözüm süzgeç değil ARAMA:** durum "Tümü"ye alınıyor ve arama kutusuna siparişin numarası
yazılıyor (v1.222.0). Tek kayıt kalıyor; kullanıcı aramayı silince tam listeye dönüyor —
Fişler ekranındaki (v1.217.0) yolun aynısı.

> Süzgeçle daraltmak "doğru kümeyi" gösterir, aramayla daraltmak **doğru KAYDI** gösterir.
> Hedefe gitmenin amacı ikincisi.

> **AYNI HATA FİŞLER EKRANINDA DA VARDI** ve orada `setFiltreTip("Tümü")` ile çözülmüştü
> (v1.217.0). Bir ekrana "hedefe git" eklerken **o ekranın süzgeçlerinin hedefi gizleyip
> gizlemediği** kontrol edilmeli — gitmek yetmiyor, görünmek de gerekiyor.

#### Cari ekstresinde de fişe gitme (v1.220.0)

**Kullanıcı:** *"Cari hareketlerde de aynı şekilde fişe tıklayınca açsın."*

Ekstrede fiş numarası zaten iki hâlde çiziliyordu:
- **Siparişi olan fiş** → SİPARİŞE gidiyordu. **Bu davranış korundu:** sipariş, fişten daha geniş
  bir bağlam; oradan fişe zaten ulaşılıyor.
- **Siparişi olmayan fiş** → düz metindi. Artık düğme, Fişler ekranını o fişle süzüyor.

Üç ekranda da aynı kapı (`fiseGit`): sipariş kartı, ürün kartı stok hareketleri, cari ekstresi.

#### Stok hareketlerinde de fişe gitme (v1.219.0)

**Kullanıcı:** *"Stok kartı stok hareketleri ekranında da fiş no tıklayınca fişe gitsin, az önce
yaptığımız gibi."*

Aynı davranış ürün kartındaki stok hareketleri listesine de verildi: fiş numarası düğme, tıklanınca
Fişler ekranı o fişle süzülüyor. Stok hareketini görüp "bu hangi fişten geldi" diye merak eden
kullanıcı numarayı elle aramak zorunda kalmıyor.

> Aynı kapı (`fiseGit`) kullanıldı, ikinci bir yol açılmadı. Numarası olmayan satır yine düğme
> olmuyor.

#### 7z-42 GERİ ALINDI (v1.218.0)

**Kullanıcı:** *"Çok doğru. Önce yaptığın fiş kesme ekranını kaldır, karışıklık olmasın."*

Siparişten YENİ fiş kesme düğmesi ve `siparistenFisAc` kaldırıldı. **İki ayrı yol yan yana
durunca hangisinin ne yaptığı karışıyordu**; zaten siparişten fiş kesilebiliyor.

Kalanlar (bilinçli):
- **`fiseGit`** — fiş numarasına tıklayınca Fişler ekranı süzülür. İstenen buydu.
- **`stokFisiAc`'ın `baslangicKalemler` parametresi** — Depo'dan alış fişi yolu (7z-36) bunu
  kullanıyor, o yol istenen ve çalışan bir yol.
- **`pencereAc`/`pencereKapat`'taki `gelinen`** — genel bir gezinme altyapısı, tek bir özelliğe
  bağlı değil.

> **Yanlış anlaşılmış bir özelliği kaldırmak, üstüne bir tane daha eklemekten iyidir.** Kod
> küçüldü, senaryodaki ölçümü de kaldırıldı — ölçülmeyen bir davranış kalmadı.

### 7z-43. ÇEK BAĞI GERİ ALMA KAPISINDA (10 Eylül, v1.226.0)

**Kullanıcı:** *"Çek bağını kapat."* — oturum başında koddan okunarak bildirilen boşluk üzerine.

Çek v1.80.0'da geri alma kapısına bağlanmıştı ama yalnız GİRİŞ yönüyle. 7z-8/7z-11'de çeke
işlemler (ciro, tahsile ver…) eklenince o işlemlerin doğurduğu kayıtlar kapıya BAĞLANMADI —
değişmez kuralın yedinci ihlali. Üç yön açıktı ve üçü de önce eski paket üzerinde tarayıcıda
ÜRETİLDİ, sonra düzeltildi:

| yön | eski davranış | yeni davranış |
|---|---|---|
| ciro fişi silinir | çek "Ciro Edildi" kalıyordu | çek ciro öncesine döner, geçmişe "Ciro geri alındı" eklenir |
| işlem görmüş çekin GİRİŞ fişi silinir | `fisGeriAl` çeki durumuna bakmadan SİLİYORDU, ciro kaydı karşı caride yetim kalıyordu | **engel** (`cek-islemde`), hiçbir şey değişmez; mesaj ne yapılacağını söyler |
| çek listesinden silinir | çek gidiyor, doğduğu tahsilat ekstrede yetim kalıyordu | tahsilat da gider (çöpe ikisi birlikte düşer) |

> ### İKİNCİ YOL, BİRİNCİ YOLUN KİLİDİNİN ETRAFINDAN DOLAŞIYORDU
> "Portföyden çıkmış çek silinemez" kilidi (7z-11) yalnız çek ekranındaki silme düğmesindeydi.
> Aynı çek, bağlı tahsilat fişi silinerek `fisGeriAl`dan kilitsiz siliniyordu. Kilit artık veri
> katmanında — yeni bir ekran eklense de delinemez (üretim kilidinin, 2d, aynısı).

**TEK KURAL, ÜÇ OKUYUCU.** `cekHareketKilidi` (200-cari-sabit) hem `fisGeriAl`ın engelini hem
Fişler ekranındaki "Çek işlemde" rozetini hem cari ekstresindeki kilit ikonunu besliyor. Silme ile
kilit AYNI eşleşmeyi kullanıyor (`cekGirisHareketineBagliMi`: `hareketId`, kimliksiz eski kayıtta
fiş no) — biri kimliğe diğeri fişe baksaydı eski kayıtta silme kilidin etrafından dolaşırdı.

**Ciro fişinin kendisi KİLİTLİ DEĞİL:** onu silmek ciroyu geri almanın yolu. Ciro son aşama
(ciro edilmiş çekte işlem yok), yani geri almak zinciri ortasından koparmıyor.

**Kilit mesajı yol gösteriyor:** *"12345 numaralı çek Tedarikçi A carisine ciro edilmiş — bu hareket
silinemez. Önce ciroyu geri alın: Tedarikçi A ekstresinden ODM-20260910-001 fişini silin, çek
portföye döner."* Tahsilde/Tahsil Edildi/Karşılıksız aşamalarında mesaj, o aşamanın geri alma yolu
olmadığını açıkça söylüyor.

**Çek listesinden silme ikinci bir silme mantığı yazmadı:** `cekHareketiyleSil` bağlı hareketi
bulup `removeHareketEverywhere`e veriyor; çek `fisGeriAl`ın çek tarafında onunla birlikte gidiyor.
Hareket bulunamazsa (kimliksiz eski kayıt, hareket zaten silinmiş) çek eskisi gibi tek başına siliniyor.

#### KURAL DEĞİŞİKLİĞİ — ETKİN GEÇMİŞ (kullanıcıya bildirildi, itiraz etmedi)

7z-11'deki "geçmişi olan çek silinemez" kuralı artık **etkin** geçmişe bakıyor (`cekEtkinGecmis`):
geri alınmış işlem ile geri alma satırı birbirini götürür. Geçmiş YİNE silinmiyor, üzerine
yazılmıyor — `geriAlma: true` + `geriAlinanSatirId` taşıyan satır ekleniyor.

Sebep çıkmaz sokak: yanlış bir ciroyu geri alan kullanıcı, geçmiş dolu olduğu için o çeki ve
tahsilatını BİR DAHA HİÇ silemezdi. Çöpe düşen çek kaydı geçmişin tamamını taşıyor; denetim izi
kaybolmuyor.

#### Yolda kapatılan eski bir hata — muhasebe çift yazımı

`removeHareketEverywhere` önce kasa karşı kaydını temizleyip yazıyor, ARDINDAN çek değişikliğini
`sonuc.muhasebe` ile yazıyordu. İkinci yazım kasa temizliğini içermediği için onu EZİYORDU. İkisi
aynı işlemde nadiren birleşiyordu, ama ciro geri alma ile birleşme ihtimali doğdu. Artık TEK yazım:
temizlik `sonuc.muhasebe` üzerine yapılıyor, çek değişikliği de içinde. `yetimFisTemizle` aynı
biçime alındı.

#### Doğrulama

- `test/birim-cek-bag.js` (yeni, 32 iddia) — ciro geri alma (geçmişin eklenmesi, ilk satıra
  dokunulmaması, kimlik bağı, girdinin değişmemesi, yeniden ciro edilebilmesi), işlem görmüş çekte
  engel ve **hiçbir verinin değişmemesi**, mesajın fişi ve cariyi söylemesi, tahsildeki çekte kilit,
  temiz çekte v1.80.0 davranışının korunması, kimliksiz eski çek, ciro hareketinin kilitli olmaması,
  v1.168.0 biçimli (`ciroHareketId`) ciro.
- `test/senaryo-cek-bag.js` (yeni) — kullanıcının yolu: Fişler'de giriş fişinde rozet + Sil yok,
  temiz çek ve ciro fişinde Sil var; ekstrede SATIR BAZINDA kilit; ciro fişi Fişler'den silinince
  çek Portföyde ve geçmiş iki satır; kilit kalkıyor; çek listesinden iki çek silinince iki tahsilat
  da gidiyor, çöpte 3 cari hareketi + 2 çek.
- **Aynı senaryo eski v1.225.0 paketiyle çalıştırıldı:** çek "Ciro Edildi" kaldı, rozet/kilit yok,
  temiz çekin tahsilatı caride kaldı. Yani senaryo düzeltmeyi gerçekten ölçüyor.

> **Ölçüm tuzağı:** ekstredeki kilit ilk ölçümde "0 görünür" çıktı, öge sayfadaydı. Kilit yalnız
> bir ikon taşıyor ve test derlemesinde ikonlar boş `<i>` olarak çiziliyor — genişlik sıfır.
> Görünürlük süzgeci yerine SATIR bazında ölçüldü (satırın kendisi görünür mü + içinde kilit mi,
> silme düğmesi mi). Eski pakette aynı ölçüm `kilit: false, silDugmesi: true` verdi.

> **Senaryo yazarken:** Fişler'de fiş satırı aç/kapa düğmesi — aynı fişe ikinci kez gelmek onu
> KAPATIYOR. Açık olup olmadığı detay metninden anlaşılıyor. Fiş numarası gizli sekmelerde de
> geçtiği için `getByText(...).filter({ visible: true })` şart.

#### AÇIK KALAN

- ~~**İade Et cari hareketi YAZMIYOR.**~~ — **KAPANDI (v1.227.0, bkz. 7z-44).**
- ~~Tahsil edildi geri alınamıyor~~ — **KAPANDI (v1.227.0):** tahsil banka hareketi doğuruyor, o
  hareket silinince çek Tahsilde'ye dönüyor. **Tahsile ver ve Karşılıksız** kayıt doğurmuyor ve
  geri alınamıyor — kullanıcı (10 Eylül): *"diğer ikisi doğru"*.
- `cekCiroluHal` (200-cari-sabit) kullanılmıyor — 7z-11'de `cekIslemUygula` geldi, bu kaldı.
  Ölü kod denetimi yalnız prop/state'e baktığı için görmüyor.

### 7z-44. ÇEK İADESİ CARİYE, TAHSİLİ BANKAYA (10 Eylül, v1.227.0)

**Kullanıcı:** *"Tahsile ver demek tahsil günü gelene kadar bankada kalsın, banka tahsil etsin demek.
Sonraki adımı çek ödendiğinde tahsil edildi olup para hangi bankaya verilmiş ise o bankanın
kasasına girecek. Bu adım hariç diğer ikisi doğru. İade cari hareket doğurur, düzeltmen gereken."*

> **Tahsile ver ve Karşılıksız DEĞİŞMEDİ** — kullanıcı ikisini doğru buldu. Karşılıksız bir kayıt
> doğurmuyor; bunu tekrar önerme.

| işlem | eskiden | şimdi | geri alma yolu |
|---|---|---|---|
| İade Et | yalnız durum değişiyordu, tahsilat caride kalıyordu | çeki veren cariye **ters hareket** | iade fişini sil → önceki durum |
| Tahsil Edildi | yalnız durum değişiyordu, banka paranın girdiğini bilmiyordu | **banka/kasa hareketi** | o hareketi sil → Tahsilde (ya da Portföyde) |

Her iki kaydın kimliği çekin geçmiş satırına yazılıyor (`hareketId` / `hesapHareketId`); kayıt
silinince `cekIslemGeriAl` aşamayı geri alıyor. 7z-43'teki ciro geri alması aynı fonksiyona
genellendi (`CEK_GERI_ALMA` tablosu: Ciro Edildi, İade Edildi, Tahsil Edildi). Yalnız ŞİMDİKİ durumu
doğuran satıra bakılıyor — üçü de son aşama, zincir ortasından kopmuyor.

#### İade

- **Ters hareket GİRİŞİN AYNASI:** tutar ve birim giriş hareketinden. Giriş kur çevrimiyle başka
  birimde işlendiyse çekin tutarını bugünkü kurla yeniden çevirmek bakiyeyi TAM kapatmazdı. Giriş
  bulunamazsa çekin kendi tutarı. Birim testi: giriş + iade = 0.
- Alınan çek → **Ödeme, Borç, ODM-** (müşterinin borcu geri doğar). Şahsi çek → Tahsilat, Alacak, THS-.
  Ciroyla aynı gerekçe: çeki geri vermek ekonomik olarak bir ödeme.
- Carisi olmayan çekte hareket yok (iade edilecek kimse yok).
- Tahsilden iade edilen çekin iadesi geri alınınca **Tahsilde**'ye dönüyor, Portföy'e değil.

#### Tahsil

- **Tahsildeki çekte banka SORULMUYOR**, çekin verildiği banka hesabı yazılıyor (`tahsilBankaId`).
  Panelde okunur metin olarak görünüyor.
- **Portföydeki çek doğrudan tahsil edildiyse** (gişe, elden) kasa/banka seçiliyor. Bu yol
  kullanıcının tarif ettiği akışta yok ama `CEK_ISLEMLERI` Portföyde → Tahsil Edildi'ye izin
  veriyordu; kaldırmak yerine hesabı sorduruldu. Tahsile verildiği banka hesabı silinmişse de seçim açılıyor.
- **Kur çevirici:** hesap çekten farklı birimdeyse "Hesaba girecek" tutar ve kur (çift yönlü)
  çıkıyor, birim hesabın birimi ve seçilemez. Tutar girilmeden işlem kapalı: çekin tutarını başka
  birimdeki hesaba olduğu gibi yazmak bakiyeyi sessizce bozardı. Ölçüm: 1000 $ çek, TL banka → 42.000 / 42.
- **Cari hareketi YOK:** müşterinin borcu çek alınırken kapandı; tahsilde cariye yazmak aynı borcu
  ikinci kez kapatırdı. Senaryo cari hareket sayısının değişmediğini ölçüyor.
- Alınan çek → hesaba **Giriş**, şahsi çek → **Çıkış**.
- **Geri alma `hareketSil`de** (205-muhasebe): banka/kasa hareketi silinince çek ve hesap TEK
  muhasebe yazımında güncelleniyor.

#### Denetim 16 — kapı sayısı ARTMADI

Tahsil hareketi `cekIslemYap` içinde yerleştirilince denetim yeni bir yazıcı buldu. Peşin ayak (7y)
aynı yerleştirmeyi `muhasebeyePesinIsle` içinde yapıyordu. İkisi saf bir geçide alındı
(`hesabaHareketEkle`), listede `muhasebeyePesinIsle` yerine o duruyor: **11 yazıcı, değişmedi.**
Saf olması şart — çek ile hareket TEK yazımda gitmeli (7z-9: iki asenkron yazım birbirini ezer).

Yazma sırası da düzeltildi: cari hareketi artık geçiş (`cekIslemUygula`) KESİNLEŞTİKTEN sonra
yazılıyor. Eskiden önce hareket yazılıp sonra geçiş reddedilebilirdi.

#### Doğrulama

- `test/birim-cek-bag.js` genişledi (57 iddia): iade hareketinin yönü/tipi/tutarı, dövizli girişte
  aynı döviz, bakiyenin sıfırlanması, şahsi çek, carisiz çek, iadeli çekin kilidi ve mesajı, iade
  geri alma, tahsilden iade; tahsil hareketinin yönü, carisiz olması, `hesabaHareketEkle`, tahsil
  geri alma, ilgisiz hareketin çeke dokunmaması, tahsil edilmiş çekin kilit mesajı.
- `test/senaryo-cek-iade-tahsil.js` (yeni) — çek listesinden iade, tahsildeki TL ve USD çekin tahsili
  (panelde sabit banka, USD'de kur kutuları), Fişler'de kilit mesajının bankayı söylemesi, iade
  fişinin silinmesi, banka hareketinin silinmesi.
- **Aynı senaryo önceki v1.226.0 ile çalıştırıldı:** iade hareketi yok, banka hareketi yok, kilit
  mesajı yok, banka hareketi olmadığı için geri alma da yok. Senaryo farkı ölçüyor.

#### Yolda görülenler (dokunulmadı)

- **`islemTipi` kayda girmiyor — BİLİNÇLİ.** `addCariHareketFromStok` hunisi alanı fiş ön ekini
  seçmek için okuyup ardından siliyor (`islemTipi: undefined`); tip ekranlarda fiş ön ekinden
  (`ODM-`/`THS-`) çıkarılıyor (`hareketIslemTipi`). Senaryo bu yüzden tipi değil ön eki ölçüyor.
- **Cari hareketindeki `cekId` buluta gitmiyor** (`cari_hareketleri.ek`te yok). Hiçbir yer okumadığı
  için sorun değil; geri alma bağı çekin geçmişinde. Koddaki yanıltıcı yorum ("hareket silinirse
  çekin dönmesi buradan bulunuyor") düzeltildi.
- `CEK_DURUM_RENK` tablosunda Tahsilde ve İade Edildi yok (varsayılan renge düşüyor).

### 7z-45. KULLANICI GİRİŞİ AKTİF — BULUT GİRİŞİ NEDEN OLMADI GÖRÜNÜYOR (11 Eylül, v1.228.0)

**Durum:** kullanıcı Tanımlar > Kullanıcılar'da girişi **Aktif** yaptı ve Supabase'de
`mahmut@atolye.local` hesabını açtı. Kimlik doğrulama **1. aşamanın** doğrulanması sürüyor;
`rls-kimlik.sql` (2. aşama) çalıştırılmadı ve **bu pakette dosyası yok** — geçilirken kullanıcıdan
istenmeli ya da yeniden yazılmalı.

**Kullanıcı:** *"Kullanıcı açtım ama yerel bağlantı diyor yine."*

**Kök sebep (ekran tarafı):** bulut girişi reddedilince hata YALNIZ `console.warn`a yazılıyordu;
ekranda "bu kullanıcının bulut hesabı yok" deniyordu — hesap VARKEN. Telefonda konsol yok, rozetin
`title` ipucu dokunmatikte okunamıyor, üstelik rozet Ana Sayfa'da hiç görünmüyor (modül başlık
şeridinde). Yani Supabase'in neden reddettiği hiçbir yoldan öğrenilemiyordu.

**Yapılan:**
- `bulutGirisSebebi` (030-supabase): Supabase'in İngilizce cevabı Türkçe ve NE YAPILACAĞIYLA eşleniyor
  (şifre tutmuyor / hesap onaylanmamış / e-postayla giriş kapalı / bağlantı yok); tanınmayan mesaj
  olduğu gibi gösteriliyor.
- Yerel girişe düşülünce **ekranın üstünde kart** açılıyor: denenen e-posta + sebep. Kapatılana kadar
  duruyor; rozet artık düğme, dokununca kart yeniden açılıyor. Günlüğe de `bulutEposta`/`bulutSebep`
  yazılıyor.
- Yanıltıcı "bulut hesabı yok" metni kaldırıldı.

**Doğrulama:** `test/senaryo-bulut-giris.js` (yeni) — Supabase auth isteği sahte cevapla
karşılanıyor: "Email not confirmed" ve "Invalid login credentials" durumlarında kart doğru e-postayı
(`Mahmut` → `mahmut@atolye.local`) ve sebebi gösteriyor, kapatılıyor, rozete dokununca açılıyor;
başarılı cevapta kart da rozet de yok.

**SONUÇ (11 Eylül):** kullanıcı yeni sürümle *"Düzeldi şu anda"* dedi — `mahmut` artık bulut
kimliğiyle giriyor. Kartta hangi sebebin yazdığı bildirilmedi; olası sebepler şifre farkı
(Supabase en az 6 karakter istiyor) ya da onaylanmamış hesaptı. Diğer kullanıcılar için hesap
açılırken aynı iki noktaya dikkat.

### 7z-46. KARAR BEKLİYOR — UYGULAMADAN SUPABASE KULLANICISI AÇMAK (11 Eylül, KOD YOK)

**Kullanıcı:** *"Supabase'e girmeden uygulamadan Supabase API yazamaz mıyız?"* — ardından
*"Bunu not et, sonra devam edeceğiz."* **Başlanmadı; devam ederken önce onay alınacak.**

Bugün her kullanıcı için Supabase paneline girip Authentication > Users > Add user ile hesap açmak
gerekiyor (e-posta `kullaniciadi@atolye.local`, şifre Tanımlar'dakiyle aynı, Auto Confirm).

#### Neden doğrudan tarayıcıdan OLMAZ

- **Yönetim API'si (`/auth/v1/admin/users`) gizli anahtar ister.** HTML'e girerse dosyayı eline
  geçiren her şeyi yapar, RLS dahil. Bu hata projede iki kez yapıldı — tekrarlanmamalı.
- **Herkese açık kayıt (`/auth/v1/signup`) açılmamalı.** Açık anahtar zaten HTML'de; dosyayı bulan
  kendine hesap açar ve 2. aşamada "giriş yapmış herkese açık" veritabanına girer.

#### Önerilen yol — Supabase fonksiyonu (TCMB kur fonksiyonunun, 7z-24, aynı düzeni)

Fonksiyon (ör. `kullanici`) Supabase sunucusunda çalışır, gizli anahtar oradadır, HTML'e girmez.
Fonksiyonlarda `SUPABASE_SERVICE_ROLE_KEY` Supabase tarafından hazır verilir — kullanıcı anahtar
kopyalamaz (kurulumda doğrulanmalı).

- **Çağıran doğrulanır:** uygulama girişte aldığı oturum jetonunu `Authorization: Bearer` ile
  gönderir; fonksiyon jetonu `auth.getUser` ile doğrular, e-postadan Tanımlar kaydındaki kullanıcıyı
  bulur, **rolü Yönetici değilse reddeder.**
- **İşlemler:** kullanıcı ekle → `admin.createUser({ email, password, email_confirm: true })`;
  şifre değiştir → `admin.updateUserById`; kullanıcı sil → `admin.deleteUser`.
- **E-posta kuralı TEK yerde kalmalı:** uygulamadaki `kullaniciEposta` (Türkçe harf sadeleştirme,
  `k.eposta` varsa o). Fonksiyon e-postayı UYGULAMADAN almalı, kendi türetmemeli — iki ayrı
  kural bir gün ayrışır.
- **CORS başlıkları HER yanıtta** (7z-24 dersi: yalnız başarılıda olursa hata "Failed to fetch" görünür).
- `Verify JWT`: kur fonksiyonunda KAPALI kuruldu çünkü jeton gönderilmiyordu. Burada kullanıcının
  gerçek jetonu gidiyor, açık olabilir — kurulumda denenmeli; fonksiyon içindeki `getUser`
  kontrolü her durumda şart.
- **Hata görünür olmalı** (7z-45 dersi): Supabase'in reddi Tanımlar ekranında okunur dille
  gösterilmeli (ör. "şifre en az 6 karakter").

#### Uygulama tarafı

- Tanımlar > Kullanıcılar'da ekle / şifre değiştir / sil fonksiyonu çağırır; bulut başarısızsa
  Tanımlar kaydı DEĞİŞMEZ (yarım kalmış hesap: Tanımlar'da var, bulutta yok olmasın).
- **Yan kazanç:** şifre doğrudan Supabase'e gittiği için Tanımlar'da düz metin saklanması gerekmez
  (2. aşamanın parçası). Yerel şifre yedeği, bütün kullanıcılar bulut kimliğiyle girene kadar kalır.
- Bulut hesabı olan / olmayan kullanıcı listede işaretlenebilir.

#### Kullanıcının yapacağı

Fonksiyonu bir kez Supabase'e yüklemek (kur fonksiyonundaki gibi, Edge Functions > yeni fonksiyon).

#### Bilinen sınır

"Yönetici mi" bilgisi Tanımlar kaydından okunuyor; veritabanı henüz açık olduğu için o kayıt
değiştirilebilir. 2. aşamada (`rls-kimlik.sql`) daralır; rollerin tamamen sunucuda korunması ayrı iş.

### 7z-47. REÇETEDE SİLME ONAYLI (11 Eylül, v1.229.0)

**Kullanıcı:** *"Reçetede stok silme onaylı olsun, tek tıklama ile siliniyor."*

Ürün kartının reçete sekmesinde altı silme düğmesi `onReceteSilToplu` çağırıyordu; **beşi tek
dokunuşla** siliyordu (yalnız matris satırındaki düğme `SilOnayButonu`ydu). En tehlikelisi hammadde
GRUBU başlığındaki çöp kutusu — o hammaddenin bütün satırlarını götürüyordu.

Beşi de `SilOnayButonu`na alındı (iki dokunuş, 3 saniyede onay düşer):
- hammadde grubu başlığı — üç görünümde (satır 2800, 3250, 3590 civarı)
- "Bu satırdaki tüm eşleşmeleri sil"
- "Tekli renklerin tümünü sil"

Onay başlığı KAÇ satırın gideceğini söylüyor ("2 satır silinecek — emin misiniz?"). Düzen bozulmasın
diye `marginLeft` taşıyan düğmeler bir `span` içine alındı; ortak bileşene stil parametresi eklenmedi.
Kaynakta `onClick={() => onReceteSilToplu` kalmadı — altı çağrının altısı da onaylı.

**Doğrulama:** `test/senaryo-recete-sil-onay.js` (yeni) — Bot'un reçetesinde Deri grubunun çöp
kutusuna TEK dokunuş: satır sayısı 4 kalıyor, "Emin misiniz?" çıkıyor; ikinci dokunuş: 2. **Aynı
senaryo değişiklik öncesi v1.228.0 ile:** tek dokunuşta 4 → 2, onay yok.

> **Ölçüm tuzağı (yine):** grup başlığındaki düğmenin dolgusu 0, test derlemesinde ikon boş `<i>` —
> genişliği SIFIR ölçüldüğü için görünür düğme aramasında hiç çıkmadı; ilk denemede senaryo yanlışlıkla
> "Ürünü sil"i buldu. Düğme başlığı + içindeki `data-ikon="Trash2"` ile bulunuyor, tıklama DOM üzerinden.
> Tohumdaki reçete satırlarının KİMLİĞİ YOK; senaryo kimlik ekliyor — kimliksiz satırda toplu silme
> `undefined` kimliğiyle bütün reçeteyi götürürdü (gerçek kayıtta satırlar `uid("recete")` taşıyor).

**Aynı kartta hâlâ tek dokunuşla silinenler (dokunulmadı, reçete değil):** ek fiyat rozetlerindeki
çarpı (`onEkFiyatSil`) ve Fiyatlandırma'daki özel fiyat kuralı çöp kutusu (`fiyatKuraliSil`).

### 7z-48. ŞERİT SEKMESİ KENDİ KARTINI AÇIYOR — TEK KAYNAK PENCERE YÖNETİCİSİ (11 Eylül, v1.230.0)

**Kullanıcı:** *"Üst sekmeler düzgün çalışmıyor, stok içinden küçültüyoruz sonra geri dönüşte o stoğu
değil stok yönetimini açıyor."*

**Kök sebep — iki doğruluk kaynağı.** Uygulamanın pencere yöneticisi (`acikPencereler`,
`aktifPencereId`) BİRDEN ÇOK kart tutabiliyordu, ama kartı çizen modüller yalnız TEK bir "açık kart"
değeri tutuyordu (`acikUrunId`, `tamEkranSiparisId`, `tamEkranUretimId`). Kart yalnız ikisi
eşleşince çiziliyordu:

| durum | şerit | ekran (eski) |
|---|---|---|
| Deri küçültüldü, Bot açılıp küçültüldü, şeritten Deri | Deri etkin | **Stok listesi** (`acikUrunId` = Bot) |
| Bot kapatıldı (Deri açıkken) | Deri etkin | **Stok listesi** (`acikUrunId` = null) |
| başka modülden şeritten Deri | Deri etkin | **Stok listesi** |
| Alış siparişi küçültülüp şeritten açıldı (TEK sipariş bile) | — | **Satış Siparişi ekranı**, kart yok |

Siparişte ikinci bir hata vardı: şerit tıklaması `sipariseGit(p.id)` çağırıyordu ve `p.id` pencere
kimliği (`siparis-s1`), kayıt kimliği değil — sipariş bulunamıyor, tip bilinemediği için hep Satış
ekranına gidiliyordu. Üretimde de `setUretimHedefId(p.id)` aynı biçimde hiçbir karta uymuyordu.
Tek siparişte/üretimde kart yine de görünüyordu (tek değer tesadüfen eşleşiyordu); ikincisi
açılınca bozuluyordu.

**Yapılan:**
- Pencereye **`kayitId`** eklendi (gösterdiği kaydın kendi kimliği).
- Modüller "açık kart" değerini TUTMUYOR: açık kartları App'ten alıyor (`acikUrunIdleri`,
  `acikUretimIdleri`, `acikSiparisPencereleri`), görünen kartı `aktifPencereId`den okuyor.
- **Her açık kart KURULU kalıyor, etkin olmayan gizli** (`display: none`) — modüllerin sekme
  değişiminde durumunu korumasıyla aynı mantık. Tek kart çizilseydi A → B → A geçişinde A yeniden
  kurulur, içindeki sekme ve yarım girişler kaybolurdu.
- **Sipariş modülünün iki kopyası var** (Satış / Alış, `sabitTip`). Pencere hangi kopyadan
  açıldıysa o kopya çiziyor (`veri.sahipTip`); ikisi birden çizseydi aynı sipariş iki ayrı kartta
  iki ayrı yarım girişle dururdu. Şerit tıklaması `sahipTip`e göre doğru ekrana götürüyor.
- Şerit tıklaması artık yalnız pencereyi etkinleştirip kartı çizen modüle geçiyor; liste
  süzgeçlerine dokunmuyor.
- Yönlendirmeyle gelen ürün kartı sekmesi ürün başına (`hedefSekmeleri[urunId] = { sekme, sayac }`);
  `sayac` anahtara giriyor, aynı ürüne aynı sekmeyle ikinci kez gelindiğinde de sekme uygulanıyor.

> **Yeni bir tam ekran kart eklenirken:** modülde "açık kart" state'i TUTULMAYACAK. Açık kartlar
> pencere yöneticisinden, görünen kart `aktifPencereId`den okunacak; şerit tıklamasında pencere
> kimliği kayıt kimliği gibi kullanılmayacak (`p.kayitId`).

**Doğrulama:** `test/senaryo-pencere-sekmeleri.js` (yeni) — ürün: tek kart, iki kart arasında
gidiş dönüş, başka modülden dönüş, biri kapatılınca şerit ile ekranın aynı şeyi söylemesi, kartın
iç sekmesinin (Reçete) korunması; sipariş: tek alış siparişinde şeritten dönüş (doğru ekran + kart),
iki siparişte başka modülden öncekine/sonrakine dönüş; üretim: iki üretimde öncekine dönüş.
**Eski sürümde ölçüldü:** ürün tarafı aynı senaryoyla (dört durumda kart yok, şerit Deri diyor);
sipariş/üretim tarafı ayrı bir yoklamayla — tek alış siparişinde şeritten dönüşte kart yok ve ekran
"Satış Siparişi", iki siparişte öncekine dönüşte kart yok. (Yeni senaryo `data-*-karti` niteliğiyle
ölçtüğü için eski pakette o kısım ayırt edici değil.)

### 7z-49. DEPO'DAN ALIŞ FİŞİ — İHTİYAÇ RENKLİ VE TEK SATIR (11 Eylül, v1.231.0)

**Kullanıcı (ekran görüntüsüyle):** *"İhtiyaç 880 çift Gold rengi ama alış fişinde fazla gösteriyor."*
Fişte iki satır: `Baret Toka · (renksiz) · 880` ve `Baret Toka · Gold · 880` — toplam 1.760.

**Kök sebep — bir düzen değişikliği düğmenin verisini sessizce boşalttı.** Depo matrisi "tek ürün tek
satır" düzenine geçince (`StokDurumuMatrisi`, grup anahtarı yalnız `urunId`) grubun **`renk` alanı
YOK OLDU**, ama "Alış Fişi" düğmesi `g.renk` göndermeye devam etti — hep boş. Miktarlar da yalnız
BEDENE göre toplanıyordu: iki rengin aynı bedeni birbirini EZİYORDU (son yazılan kalıyordu).
`alisFisiAc` renksiz kalemi üründen çözemedi (ürünün birden çok rengi var), MRP aynı ihtiyacı `Gold`
olarak ekledi; formdaki çift ekleme engeli yalnız formda ZATEN duran satırlara bakıyordu, gelen
listenin kendi içindeki kopyaya bakmıyordu.

**Yapılan:**
- Düğme açık satırları **renk + beden + miktar** olarak gönderiyor (`taslak.kalemler`); eski
  `taslak.renk` / `taslak.miktarlar` yolu kaldırıldı (tek çağıran Depo).
- `hazirKalemleriTekille` + `fisKalemAnahtari` (075-fis-ortak): hazır gelen listede aynı
  ürün·renk·beden BİR KEZ, **ilk gelen kalıyor** — tıklanan satır başta olduğu için onun miktarı
  geçerli. TOPLANMIYOR: iki kaynak aynı ihtiyacı söylüyor. (`bekleyenKalemleriBirlestir` gerçekten
  ayrı parçaları toplayarak birleştiriyor — farklı iş, karıştırılmasın.)
- Formdaki "N kalem dolduruldu" sayısı tekillenmiş listeden.

**Doğrulama:** `senaryo-fis-ihtiyactan.js` genişledi — Deri'nin İKİ rengine aynı bedende açık
(Siyah 20, Taba 7) ve kalemler satır satır ölçülüyor.
- yeni: `Deri · Siyah · 20`, `Deri · Taba · 7` — "2 kalem"
- **eski v1.230.0, aynı senaryo:** `Deri · (renksiz) · 7` (Taba'nın 7'si Siyah'ın 20'sini ezmiş),
  `Deri · Siyah · 20`, `Deri · Taba · 10` — "3 kalem"

> **ALTIN ÇIKTI DEĞİŞTİ, gerekçe:** eski altın "3 kalem" diyordu — HATAYI doğru sanıp altına almıştı.
> Ölçüm yalnız "Deri geldi mi"ye bakıyordu, satırları saymıyordu. `tiklananMiktarGeldi` de hücre
> metninde "20" arıyordu; miktar giriş kutusunda durduğu için ikinci renk eklenince yanlışlıkla
> `false` verdi — artık kalem satırından okunuyor.

#### ~~AÇIK — "Satın Al" düğmesi aynı sebeple BOZUK~~ — ÇÖZÜLDÜ (23 Eylül taramasında doğrulandı; aşağıdaki metin tarihsel)

Aynı grupta "Satın Al" da `g.renk` gönderiyor. `senaryo-satin-al-dugmesi`nin altın çıktısında hata
zaten kayıtlı: pencere başlığı **"Satın Al: Deri · undefined"** ve **"Deri bulunamadı"** bildirimi
(senaryo yalnız ekranın açıldığına baktığı için yeşil). Satın alma paneli TEK RENK için kurulu
(`satinAlmaAc(urunId, renk)`), birden çok renkte açığı olan üründe hangisinin açılacağı bir karar.
Kullanıcıya soruldu; öneri: tek renkte açık varsa doğrudan o renk, birden çoksa ürün odaklı liste.

### 7z-50. ALIŞ FİŞİNE YALNIZ TIKLANAN İHTİYAÇ (12 Eylül, v1.232.0)

**Kullanıcı (ekran görüntüsüyle):** *"Monta çivisi 1 ihtiyaç var, tıkladım, açılan ekran bu şekilde."*
Fişte üç satır vardı: tıklanan Monta Çivisi (1 paket) + aynı tedarikçinin iki Yapıştırıcı eksiği.
Sorulunca: *"Sadece tıkladığım gelsin."*

> ### 7z-36 GERİ ALINDI — BİR DAHA ÖNERME
> 7 Eylül'de kullanıcı *"depodan alış fişi oluşturduğumuzda ihtiyaç otomatik çeksin"* demişti ve
> aynı tedarikçinin BÜTÜN eksikleri fişe konuyordu. Gerçek kullanımda tek ihtiyaç için kesilen
> fişe istenmeyen satırlar geliyor; **silmek, elle eklemekten çok iş.** Kullanıcı tersini istedi.

`alisFisiAc` artık MRP'ye hiç bakmıyor; fişe yalnız Depo'da tıklanan satırın açık miktarları
giriyor (renk ve beden bazında, 7z-49). `mrpHesapla` çağrısı ve `try/catch` kaldırıldı.

**Diğer eksikler kaybolmuyor:** Depo'da satır satır duruyor, her birinin kendi "Alış Fişi" düğmesi
var ve aynı tedarikçiye ikinci kez basıldığında YARIM KALAN fiş geri geliyor (pencere anahtarı
cari + tip, `depoPencereAc`) — yani kullanıcı isterse satırları aynı fişte topluyor. Bu yüzden
"diğerlerini de ekle" düğmesi YAPILMADI: var olan yol zaten bunu veriyor.

Bilgi şeridinin metni de düzeltildi: *"N satır Depo'da tıkladığınız açık ihtiyaçtan dolduruldu"*
(eskisi "bu tedarikçinin eksiklerinden" diyordu — artık yanlış).

**Doğrulama:** `senaryo-fis-ihtiyactan.js` — AYNI tedarikçide (c1), açığı olan ikinci bir ürün
(Kopça, Bot'un reçetesinde) eklendi. Yeni sürümde fişte yalnız Deri'nin iki rengi var; **eski
v1.231.0'da** `Kopça · Standart · 20` satırı da geliyordu.

> **Tohumda yokmuş:** senaryodaki "başka tedarikçinin eksiği girmedi" ölçümü `u3`/Taban'a bakıyordu
> ama Taban tohumda ÜRÜN olarak yok (yalnız reçetede geçen bir kimlik) — ölçüm kendiliğinden
> geçiyordu. Yerine gerçek bir ürün kondu.
>
> `ayniTedarikcininDigerEksigiGirmedi` ilk yazılışında sayfa METNİNDE "Kopça" arıyordu ve hep
> `false` veriyordu: ürün, "Ürün seçin…" listesinde de geçiyor. Kalem SATIRLARINDAN ölçülüyor.

### 7z-51. "SATIN AL" DA RENK+BEDEN İLE — ALIŞ FİŞİYLE AYNI KALIP (12 Eylül, v1.233.0)

**Kullanıcı:** *"Satın al ile alışta yaptığımızın aynısı olması gerekli. Stok zaten belli renk beden vs."*

7z-49'da Alış Fişi düğmesi düzeltilmişti; Depo'daki **Satın Al** aynı hatayı taşımaya devam
ediyordu: "tek ürün tek satır" düzenine geçildiğinde grubun `renk` alanı yok olmuştu ama düğme
`g.renk` göndermeye devam ediyordu. Sonuç: pencere başlığı **"Satın Al: Deri · undefined"**, hiçbir
varyant eşleşmediği için **"Deri bulunamadı"** bildirimi ve panel HİÇ açılmıyordu.

**Yapılan — üç kat, alış fişindeki kalıbın aynısı:**
- Düğme açık satırları `kalemler: [{renk, beden, miktar}]` olarak gönderiyor (`g.renk` /
  bedene göre toplanmış `miktarlar` kaldırıldı).
- `hammaddeyiPlanla(urunId, urunAd, kalemler)`; pencere anahtarı artık renksiz (`depo-satinal-<urunId>`),
  başlık "Satın Al: <ürün>". Pencere içi başlıkta basılan `p.veri.renk` kaldırıldı — "undefined"ın
  ikinci kaynağı oydu.
- `serbestSatirlar` gelen kalemlerden kuruluyor (önce varyantları TEK renge göre süzüyordu).

**Satın alma paneli artık birden çok rengi kapsıyor:** `satinAlmaPanel = { hammaddeUrunId, renkler: [...] }`.
Miktar anahtarı zaten `renk::beden` olduğu için tablo yapısı değişmedi; satırlar renk × beden oldu ve
birden çok renkte **Renk sütunu** çıkıyor. Matristeki tek renklik "Satın Al" düğmesi aynı yoldan
tek elemanlı diziyle çağırıyor — iki ayrı açılış yolu yazılmadı.

Panelin ön dolu miktarı: `netEksik` varsa o, Depo'dan gelen serbest satırda `eksikMiktar`
(serbest satırların `netEksik`i 0 doğuyor; eskiden yalnız `netEksik`e bakılıyordu).

**Doğrulama:** `senaryo-satin-al-dugmesi.js` — Deri'nin İKİ renginde açık (Siyah 13, Taba 3) ve
panel satırları renk·beden·miktar olarak ölçülüyor.
- yeni: başlıkta "undefined" yok, "bulunamadı" yok, panel `Siyah · 13` ve `Taba · 3`
- **eski v1.232.0:** başlık "Deri · undefined", "Deri bulunamadı", panel hiç açılmıyor (`null`)

> **İki ölçmeyen ölçüm düzeltildi:** `satinAlMiktarOnDolu` sayfa metninde `\b20\b` arıyordu (aynı
> sayı başka yerde de geçebilir) — artık panel satırlarından okunuyor ve panel hiç açılmadıysa
> BAŞARISIZ sayılıyor (boş dizide `every` hep `true` döner). Eski altın çıktı, başlıktaki
> "undefined"ı ve "bulunamadı" bildirimini içinde TAŞIYORDU: senaryo yalnız ekranın açıldığına
> baktığı için yeşil görünüyordu.

## 8. RAPORLAR — KULLANICININ KURDUĞU RAPORLAR

### 8a. RAPOR MOTORU + SİPARİŞ RAPORLARI (12 Eylül, v1.234.0)

**Kullanıcı:** *"Raporlar yapalım, her modülün içine sekme olarak bir veya daha fazla rapor. Raporu
kullanıcı kendi yapabilsin: hangi bilgileri isteyecek, gruplu vs."* Sorulunca: ilk modül **Sipariş**,
kayıtlı rapor kapsamı **ortak / kişisel seçilebilir**, çıktı **ekran + Excel + yazdırma**.

**TEK MOTOR, HER MODÜL** — `245-rapor.jsx`:
- Modül verisini **düz satırlara** çevirir (sipariş: her KALEM bir satır, başlık alanları tekrar
  eder) ve bir **alan listesi** verir: `{ anahtar, ad, tip: metin|sayi|tarih|para, secenekler?,
  paraBirimiAlani? }`.
- `RaporSekmesi` süzgeç (alan · işlem · değer, hepsi VE), gruplama (sıralı; sayılar toplanır,
  metinde tek değer ya da "(N farklı)"), sıralama, toplam satırı, Excel (`XLSX`, zaten vardı),
  yazdırma (`indirYazdirilabilirHTML`, zaten vardı).
- **Para toplamı birim karışıksa toplanmaz** — "(karışık p.b.)" yazar. Dolarla lirayı toplamak
  yanlış bir sayı verirdi; alan `paraBirimiAlani` ile hangi sütunun birimi taşıdığını söylüyor.
- Kaydedilen rapor bir **TANIM** (sütunlar, süzgeçler, gruplar, sıralama); veri değil. Açılınca o
  günkü veriyle hesaplanır. Eski kayıtta artık var olmayan alan **atlanır**, rapor kilitlenmez.
- Kayıt yeri `tanimlar.raporlar` (`{ id, modul, ad, kapsam, sahip, tanim }`). Tanımlar kaydı zaten
  bütün olarak buluta gidiyor; kişisel rapor da gidiyor ama yalnız `sahip`e gösteriliyor — kişisel
  rapor MAKİNEDE değil KULLANICIDA dursun diye (başka cihazdan da görsün).
- Sipariş modülünde üst sekme **Liste · Raporlar**; modül kimliği `siparis-satis` / `siparis-alis`
  (iki kopya ayrı raporlar tutuyor). Liste, Raporlar açıkken `display:none` — süzgeç/arama durumu kaybolmuyor.

> **Yeni modüle rapor eklemek:** (1) düz satır üreten bir fonksiyon + alan listesi (bkz.
> `siparisRaporSatirlari`, `SIPARIS_RAPOR_ALANLARI`), (2) modüle `raporlar`, `onRaporlarKaydet`,
> `aktifKullanici` propları (App'te `raporlariKaydet` hazır), (3) `<RaporSekmesi modulAnahtari=…>`.
> İkinci bir rapor mantığı YAZILMAZ.

**Doğrulama:** `test/birim-rapor.js` (yeni; 8b ile 33 iddia) — düz satırlar, süzgeç işlemleri (metin/sayı/
tarih/boş-dolu, VE, boş değerin yok sayılması, bilinmeyen alan), gruplama (toplam, farklı sayısı,
`_adet`), hesap (gruplama alanı başa, toplam satırı, karışık p.b., sıralama, bilinmeyen sütun).
`test/senaryo-rapor-siparis.js` (yeni) — sekme, kurucuda sütun kapatma + Ürün›Renk gruplama →
tablo `Bot Siyah 16/12/400` `Bot Taba 3/0/81`, toplam `19/12/481`; kaydet → `tanimlar.raporlar`;
ikinci açılışta kayıtlı rapor listede ve açılınca AYNI tablo.

#### YOLDA BULUNAN HATA — `kodSayaclari` her açılışta sıfırlanıyordu

Senaryonun ikinci açılışında kayıtlı rapor kayboldu. Sebep: açılışta tanımlar **sabit bir alan
listesiyle** yeniden kuruluyordu (`t = { renkler, bedenler, … }`), listede olmayan her şey
düşüyordu. `raporlar` yeni olduğu için fark edildi; ama **`kodSayaclari` de düşüyordu** — 6b'deki
"sayaç geri gitmez, silinen numara bir daha verilmez" güvencesi açılışta bozuluyordu.
`kodlariAta` sayacı 0'dan başlatıp DURAN kayıtların numarasını atlıyor; silinmiş en yüksek numara
bir sonraki kayda verilebilirdi (basılmış etiket başka rengi gösterir). **Eski pakette ölçüldü:**
tohuma `kodSayaclari: { renk: 5, cari: 12 }` konuldu, açılıştan sonra `{ cari: 3 }` kaldı.

Düzeltme: `t = { ...t, renkler, … }` — dönüştürülen alanlar ezilir, gerisi korunur. Yeni alan
eklerken listeye yazma zorunluluğu kalktı. Senaryo `sayacKorundu` ile ölçüyor (sayaçlar ilerleyebilir,
5 ve 12'nin altına düşmemeli).

> Kullanıcıya söylenmeli: bugüne kadar bir renk/asorti/cari SİLİNDİYSE onun numarası yeniden
> verilmiş olabilir. Etiket basılmış bir numaranın çakışması ancak elle kontrol edilebilir.

#### AÇIK
- Diğer modüller (Stok, Cari, Üretim, Fişler, Muhasebe) — her biri kendi düz satırlarını verecek.
- Alış Siparişi kopyasında da sekme var ama ayrı ölçülmedi (aynı bileşen, `siparis-alis`).
- Süzgeçte "ya da" (VEYA) yok, yalnız VE. Kullanıcı isterse sonra.
- Rapor sütun sırası alan listesinin sırası; kullanıcı sürükleyip değiştiremiyor.

### 8b. SİPARİŞ RAPORU AŞAMA SATIRLARINA BÖLÜNÜYOR (12 Eylül, v1.235.0)

**Kullanıcı:** *"Planlanmış olanın son durumu ayrı satırlarda: üretime planlanmış veya bir kısmı
üretime bir kısmı satın almaya… 200 çift ayakkabı üretimde, 100 çifti üretilmiş depoda, 40 çifti
kesim bekliyor, 50 çifti sayada, 10 çift planlanmamış — her biri ayrı satırda, filtreleyebileyim.
Aynı mantık üretimden ve planlamadan da bilgi çeksin."*

Her sipariş kalemi bulunduğu **aşamalara bölünüp her aşama BİR SATIR** oluyor
(`siparisRaporSatirlari`, `uretimAsamaDagilimi` — 245-rapor). Aşamalar:

| aşama | nereden |
|---|---|
| Teslim edildi | kalemin `karsilanan`ı |
| `<Proses> bekliyor` | önceki prosesten gelmiş, kimseye verilmemiş (`adimBedenDurumu.kalan`) |
| `<Proses>'de` (Saya'da, Kesim'de, Montaj'da — ünlü uyumu `bulunmaEki`) | verilmiş, teslim alınmamış atamalar |
| Hurda | teslim sonucundaki hurda listesi |
| Üretildi (stokta) | son gerçek prosesten SAĞLAM çıkan − teslim edilen |
| Satın alma — teslim alındı / yolda | bağlı alış siparişinin kalemi (`karsilanan`) |
| Planlanmadı | planlaması boş kalemin kalanı |
| Alış tarafı: Teslim alındı / Bekleniyor (yolda) | |

**Akış hesabı üretim kartıyla AYNI yardımcılardan** (`oncekiAdimdanMevcutBedenler`,
`adimBedenDurumu`, `atamaSonucu`) — ikinci bir akış mantığı yazılmadı. Ara prosesler atlanıyor.
Hurda telafisi üretimi (`hurdaKaynakUretimNo`) aynı kaleme sayılıyor. Üretim aynı bedeni birden
çok kalemle paylaşıyorsa miktar kalemlere oranlanıyor (nadir).

**Kalem bazlı sayılar BİR kez sayılıyor.** Sipariş miktarı / teslim edilen / kalan / fiyat / tutar
her aşama satırında tekrar ediyor; gruplama ve toplamda `tekilAnahtar: "_kalemId"` ile kalem başına
bir kez toplanıyor. Bu yapılmadan önce ölçüldü: 10 çiftlik kalem üç aşamaya bölününce "Kalan" 24,
"Tutar" 900 çıkıyordu (doğrusu 12 / 400). Motorun genel özelliği — başka modüllerde de kullanılabilir.
`asamaMiktar` her satırda ayrı toplanıyor; kalem toplamını veriyor (birim test: 210 = 210).

**Doğrulama:** `birim-rapor.js` (33 iddia) — kullanıcının örneği birebir: 200 çift üretimde
(Kesim 160 bitti, Saya'da 150 verilmiş 100 bitmiş, Montaj 100 bitmiş) + 10 planlanmamış + 20 teslim →
`Teslim edildi:20 · Kesim bekliyor:40 · Saya bekliyor:10 · Saya'da:50 · Üretildi (stokta):80 ·
Planlanmadı:10`; hurda ayrı satır ve sağlamın akması; prosessiz eski üretim; satın almada teslim
alınan/yolda; bir kez sayma. `senaryo-rapor-siparis.js` — tohuma üretime planlı kalem eklendi,
ekranda aşama satırları `Teslim edildi:4 · Kesim bekliyor:4 · Saya'da:6 · …`; gruplamada Kalan 12, Tutar 400.

> **Bilinen yaklaşıklık:** "Üretildi (stokta)" = üretimden sağlam çıkan − teslim edilen. Depo
> stoğuna doğrudan bakılmıyor (aynı model başka siparişten de üretilmiş olabilir).

### 8c. SATIŞ FİŞİNDE HAZIR ÜRÜNLER (12 Eylül, v1.236.0)

**Kullanıcı (ekran görüntüsüyle, Stok Çıkışı paneli):** *"Bu ekrana siparişin hazır ürünlerini
getirecek bir bölüm olsun; üretilmiş veya tedarik edilmiş ürünler listelensin, oradan satış yapılsın."*

Sipariş kartının **Stok Çıkışı (Satış)** panelinin üstünde "Hazır ürünler" tablosu: ürün · renk ·
beden · kaynak (Üretildi / Satın alındı) · hazır · stokta. Satır başına **"Fişe koy"**, üstte
**"Hazır olanların tümünü fişe koy"**. Alış tarafında yok (hazır kavramı yok).

**Hazır = 8b'deki aşama bölünmesinden iki aşama:** "Üretildi (stokta)" + "Satın alma — teslim
alındı" (`siparisHazirKalemleri`, 245-rapor). Kesimde bekleyen ya da yolda olan hazır değil. Aynı
hesap: raporun "üretildi" dediğiyle fişin "hazır" dediği ayrışmasın. Kalanla sınırlı.

**Stok ile hazır ayrı gösteriliyor, küçüğü sessizce alınmıyor.** Hazır sayısı üretim/alış kaydından,
stok depodan geliyor; tutmuyorsa (stoğa girmemiş üretim, başka siparişe verilmiş mal) "Stokta"
sütununda ⚠ ve açıklama. Kullanıcıya "hazır" deyip fişe eksik yazmak yanıltıcı olurdu.

Doldurma `tumunuDoldur` ile AYNI iki state'e yazıyor (`teslimMiktarlar`, `eklenenGruplar`) —
ikinci bir doldurma mantığı yok; fişin gerisi (asorti, kaydet, onay) değişmedi.

**Matris düzeni (v1.237.0, kullanıcı: "matris düzeninde yap"):** satır = model+renk, sütun = beden,
hücrede "hazır / stokta" (⚠ stok azsa), satır sonunda toplam ve "Fişe koy" (o model+rengin bütün
bedenlerini koyar). Sipariş girişi ve fiş tablosuyla aynı biçim; beden başına satır 8 bedenli
modeli 8 satıra yayıyordu.

**Doğrulama:** `senaryo-hazir-urunler.js` (yeni) — 41: 10 çift üretimde, Montaj'dan 6 sağlam
çıkmış → hazır 6; 42: 5 çift satın almada, 3'ü teslim alınmış → hazır 3; 43: planlanmamış → listede
yok. "Hazır olanların tümünü fişe koy" → fişte 41=6, 42=3, 43 boş; kaydedilince `karsilanan` 6/3/0.

### 8d. RAPORDA TUTARLAR (12 Eylül, v1.238.0)

**Kullanıcı (ekran görüntüsüyle):** *"Tutara ek: teslim edilen tutar, kalan tutar, sipariş tutarı vs.
de ekleyelim."*

Yeni sütunlar: **Sipariş Tutarı** (eski "Tutar"), **Teslim Edilen Tutar**, **Kalan Tutar** — kalem
bazlı, gruplama/toplamda kalem başına bir kez; **Aşama Tutarı** = aşama miktarı × birim fiyat, her
satırda ayrı. Hepsi kalemin para biriminde; karışık p.b. kuralı aynen geçerli.

**Ekran görüntüsündeki hata:** toplam satırında **Birim Fiyat 2.505,50** — 16 satırın fiyatı alt alta
toplanmıştı. Alan tanımına `toplanmaz: true` geldi: toplamda boş, grupta metin gibi (tek değerse o,
değilse "(N farklı)"). Motorun genel özelliği.

**Doğrulama:** `birim-rapor.js` (36 iddia) — tutarlar satır satır, toplamda birim fiyat yok ve
tutarlar bir kez, grupta birim fiyat "222". `senaryo-rapor-siparis.js` — tohum tutarlı hâle
getirildi (Kesim 10 bitti, Saya 4 bitti / 6 çalışıyor, Montaj 4 çıktı ve teslim edildi): aşama
miktarları kalemi tam veriyor, gruplamada Aşama Tutarı = Sipariş Tutarı (400 = 400).

### 8e. RAPORLARDA ARAMA (12 Eylül, v1.239.0)

**Kullanıcı:** *"Raporlarda arama çalışmıyor."*

Sipariş modülünün arama kutusu sekme çubuğunun ÜSTÜNDE duruyor; Raporlar sekmesinde de görünüyordu
ama yalnız listeyi süzüyordu (liste gizliyken görünmez bir etki). Kutu artık rapora bağlı:
`raporAra` (245-rapor) bütün METİN sütunlarında (cari, ürün, renk, sipariş no, aşama, planlama…)
harf duyarsız arıyor, süzgeçlerden ÖNCE uygulanıyor; sayı sütunlarında aramıyor. Özet satırı
"… · "taba" aramasıyla" diyor, placeholder sekmeye göre değişiyor. `RaporSekmesi`ne `arama` prop'u —
diğer modüller kendi kutusunu verecek.

**Doğrulama:** `birim-rapor.js` (41 iddia) — metin/aşama/planlama sütunlarında arama, sayıda
aramama, boş arama, sıra (arama → süzgeç). `senaryo-rapor-siparis.js` — kutuya "taba" → 1 satır, Renk Taba.

### 8f. SÜTUN ARAMALARI (12 Eylül, v1.240.0)

**Kullanıcı:** *"Birden fazla filtreleme için kolonların üzerine arama ekleyelim veya üst ana arama
ekranını detaylı arama için yapalım."* — İlki yapıldı: tablo başlığının altında her sütunun kendi
kutusu (`tanim.kolonAramalari`, `raporKolonAra`). Hepsi birden (VE); serbest arama ve süzgeçlerle
de birleşiyor (sıra: arama → sütun aramaları → süzgeçler → gruplama).

- Metin/tarih: **içerir**, harf duyarsız.
- Sayı/para: `5` eşit · `>5` · `<5` · `>=5` · `<=5` · `5-10` aralık; virgül de nokta sayılır.
  **Anlaşılmayan girdi hiçbir satırı geçirmez** — sessizce her şeyi göstermek, kullanıcıya süzgeç
  çalışıyor sandırırdı.
- Gruplu raporda satırlara (gruplama ÖNCESİ) uygulanıyor: sayı kutusu aşama/kalem satırını süzer,
  grubun toplamını değil. Dolu kutu kahverengi çerçeveli; kurucu başlığındaki "N süzgeç" sayısına dahil.
- Kutular kayıtlı raporla birlikte SAKLANIYOR; yazdırmada gizli (`no-print`), Excel'e girmiyor.

Süzgeç paneli (alan · işlem · değer) duruyor: "boş / dolu", "eşit / farklı" gibi kesin koşullar ve
tarih aralığı oradan.

**Doğrulama:** `birim-rapor.js` (52 iddia) — içerir, iki sütun VE, sayı eşit/büyük/aralık/küçük
eşit-virgüllü, boş kutu, anlaşılmayan girdi, bilinmeyen sütun, gruplu raporda satır düzeyi.
`senaryo-rapor-siparis.js` — Aşama "teslim" + Aşama Miktarı ">3" → tek satır `Teslim edildi:4`.

### 8g. SÜTUN ARAMASINDA SEÇENEK LİSTESİ (12 Eylül, v1.241.0)

**Kullanıcı:** *"Filtrelemede tıklayınca dolu satırlar çıksa (tarih vs. için), yazdıkça daralsa ve
seçmeli olsa daha kullanışlı olur."*

Her sütun kutusuna bir `datalist` bağlandı: dokununca o sütunda **gerçekten var olan değerler**
listeleniyor, yazdıkça daralıyor, seçiliyor (tarayıcının kendi açılır listesi; telefonda da çalışıyor).
Liste **diğer sütun aramalarıyla süzülmüş** satırlardan geliyor: Renk "Siyah" seçildiyse Beden
listesinde yalnız siyahın bedenleri kalır. En çok 200 değer.

- Sayı/para sütununda liste HAM değer veriyor (`2220`, `2.220,00` değil): kutu `>2220` gibi
  girdileri okuyor, binlik noktasını sayı sanırdı.
- Tarih sütununda liste ekran biçiminde (`12.09.2026`) ve kutu bunu anlıyor (`raporTarihGirdisi`:
  gün.ay.yıl → yıl-ay-gün; yıl yoksa "-ay-gün" ile içerir). ISO yazmak da olur.

**Doğrulama:** `birim-rapor.js` (55 iddia) — tarih kutusu gün.ay.yıl, ay.gün, ISO. Senaryo —
Aşama "teslim" + Aşama Miktarı ">3" seçiliyken Renk listesi yalnız `Siyah`, Aşama Miktarı listesi
`3, 4` (teslim satırlarından), Tarih listesi `01.09.2026`.

### 8h. RAPORDA MATRİS DÜZENİ (12 Eylül, v1.242.0)

**Kullanıcı:** *"Matris şeklinde yapalım, her bedene satır eklemesin. Ortak planlama içinde 36, 37, 38
bedenler üretimdeyse hepsi matris olarak listelensin; ayrılan olduğunda — 36 kesim aşamasında,
diğerlerinin üretimi bitmişse — ayrı satır olsun. Matris mantığımız burada da devam etsin."*

Kurucuda **DÜZEN: Liste / Matris — bedenler sütun**. Motor geneli (`raporMatris`): modülün alan
listesi `matrisAlan` (beden) ve `matrisDeger` (hücreye yazılacak sayı — siparişte aşama miktarı)
söylüyor. Satırlar beden DIŞINDAKİ seçili metin sütunlarına göre birleşiyor, her beden bir sütun,
sağda "Toplam Aşama Miktarı", sonra diğer sayısal sütunlar. **Aşaması farklı beden kendiliğinden
ayrı satıra düşüyor** — ayrı kural yazılmadı, gruplama anahtarının sonucu (Aşama seçili sütunlardaysa).
Gruplama seçiliyse anahtar o alanlar; diğer metin sütunları tek değer / "(N farklı)".
Sütun aramaları anahtar sütunlarda çalışıyor; Excel'e beden sütunları da gidiyor. Düzen kayıtlı
raporla saklanıyor (`tanim.matris`).

**Yolda düzeltilen hata — grup satırlarını toplamak kalemi iki kez sayıyordu.** Bir kalem iki aşama
grubuna dağılınca (Teslim edildi 4 + Saya'da 6) her grup satırı "Sipariş Miktarı 10" taşıyor ve
genel toplam 29 çıkıyordu (doğrusu 19). Kalem başına bir kez sayılan sütunların GENEL toplamı artık
gruplama öncesi satırlardan alınıyor (`raporToplam(…, hamSatirlar)`); liste gruplamasında da aynı
hata vardı, o da kapandı.

**Doğrulama:** `birim-rapor.js` (64 iddia) — kullanıcının örneği: 36 Kesim bekliyor, 37-38 üretildi
→ iki satır `[Kesim bekliyor: 10 · — · —]`, `[Üretildi: — · 12 · 8]`; anahtar sütunlar; kalem tutarı
bir kez; beden toplamları; gruplamayla anahtar; iki gruba dağılan kalemin toplamı bir kez (matris ve
liste). Senaryo — matris tablosu başlık/gövde/toplam; toplam satırı Sipariş Miktarı 19, Tutar 481.

### 8i. MATRİSTE HÜCREDE AŞAMA (12 Eylül, v1.243.0)

**Kullanıcı:** *"Bedenleri de tek satıra toplayamıyor muyuz? Yapmadan örnek göster."* — iki seçenek
gösterildi; **seçenek 1** (tek satır, hücrede aşama) seçildi.

Alan tanımına `matrisAyrim: "asama"` geldi. Matriste **Aşama sütunu seçili değilse** bedenler tek
satırda toplanıyor ve her hücre aşamaya bölünüyor: "**10** kesim bekliyor", aynı bedende iki aşama
varsa alt alta "**6** üretildi (stokta) / **4** kesim bekliyor". Aşama sütunu seçiliyse eskisi gibi
aşama başına satır. Üç görünüm de kullanıcının elinde (liste / matris-aşamalı / matris-tek satır).
Hücre değeri sayı ya da `[{ etiket, miktar }]`; `_hucreToplam` hep sayı — beden ve satır toplamları
oradan. Excel'de dökümlü hücre "10 Kesim bekliyor / 4 Üretildi" metni.

Seçenek 2 (aşama özeti ayrı sütunda) yapılmadı.

**v1.244.0 — kullanıcı "neden olmadı?" dedi:** ekran görüntüsü liste düzenindeydi; DÜZEN anahtarı
kurucunun içinde kalmış, görülmemişti. Beden alanı olan raporda yeni rapor artık **matris açılıyor**
(`raporTanimiBos`) ve **Liste / Matris** düğmeleri sonuç başlığının yanında da var (kurucu kapalıyken
bile). Kayıtlı eski raporlar kendi düzeniyle açılıyor (`matris` alanı yoksa liste).

**Doğrulama:** `birim-rapor.js` (68 iddia) — aşama seçili değilken tek satır ve hücre dökümü, aynı
bedende iki aşama, toplamlar. Senaryo — Aşama kapatılınca hücre `4 teslim edildi 6 saya'da`.

### 8j. SÜTUN AYARLARI (12 Eylül, v1.245.0)

**Kullanıcı:** *"Sütunların yerlerini değiştirip, boyutlarını değiştirip, başlık isimlerini
kısaltacağımız bir yer olması gerekli — 'Toplam Aşama Miktarı'nı 'Top.Aş.Mik.' yapmak, kolon
genişliklerini ayarlamak, Sipariş No'yu ilk veya sona almak gibi."*

Sonuç başlığında **Sütunlar** düğmesi → panel: görünen her sütun için ⇈ ↑ ↓ ⇊ (sıra), kısa ad
kutusu, genişlik (px; boş = kendiliğinden), sıfırla. Matriste "Toplam Aşama Miktarı" sütunu da
(`_toplam`) kısaltılabiliyor, taşınamıyor (beden sütunlarının sağında sabit). Ayarlar
`tanim.sutunAyarlari = { anahtar: { ad, genislik } }`; **sıra `tanim.sutunlar` dizisinin sırası** —
ayrı bir sıra alanı yok. Kayıtlı raporla saklanıyor; Excel başlıkları da kısa adı kullanıyor.
Başlık ve hücrede `title` ile tam metin; genişlik sabitlenince taşan metin "…" ile kesiliyor.

**Gruplama alanları en solda kalıyor** (satırların neye göre toplandığı okunsun); kendi aralarında
taşınıyor, panelde "· gruplama" işaretli. Sütun taşıma bu yüzden iki listede: `gruplar` / `sutunlar`.

**Doğrulama:** senaryo — "Aşama Miktarı" → "Aş.Mik." ve 60px (ölçülen başlık 64px = 60 + dolgu),
"Kalan" sona; ikinci açılışta kayıtlı raporun tablosu birebir aynı (kısa ad ve sıra dahil).

### 8k. RAPOR EKRANI SADE — TEK AYARLAR PANELİ (12 Eylül, v1.246.0)

**Kullanıcı:** *"Matris varsayılan gelsin, rapor kur kapalı gelsin ve ayarlar bölümü olsun, oradan
yapalım. Kullanılmayacak şeyler ekran önünde kalmasın."*

Raporlar sekmesi açılınca ekranda yalnız: kayıtlı rapor rozetleri · özet satırı ("N matris satırı") ·
**Ayarlar** · Excel · Yazdır · tablo. Kurucu (düzen, sütun seçimi, süzgeçler, gruplama, sıralama),
**sütun ayarları** ve **kaydet** tek panelde (`data-rapor-ayar-paneli`), **kapalı gelir**; "Yeni
rapor" açıyor (yeni raporun ilk işi kurulmak). "kaydedilmedi" uyarısı özet satırında. Ayrı "Sütunlar"
düğmesi ve sonuç üstündeki Liste/Matris çifti kaldırıldı — düzen de panelde. Panel `display:none` ile
gizleniyor (DOM'da kalıyor; içindeki state ve kutular korunuyor).

**Doğrulama:** senaryo `ayarlarKapaliGeldi: true`; ayarlar açılıp liste/matris, sütun ayarları ve
kaydet aynı panelden yapılıyor; ikinci açılışta tablo aynı.

### 8l. RAPORDA RESİM SÜTUNU (12 Eylül, v1.247.0)

**Kullanıcı:** *"Raporları stok resimlerine ekleyelim; kapak ve renk resimlerini sorgularsın, renk
bazında resim yoksa kapak resmi göstersin."*

Sipariş raporuna **Resim** sütunu (ilk sıra): satırın ürün+renginin renk resmi, yoksa kapak —
sipariş kartındaki kuralın aynısı (`renkResimleri[renk] || kapakResmi`). Uygulamadaki `stok`
görselleri birleştirilmiş hâli taşıdığı için ayrı okuma yok (`siparisRaporSatirlari(…, stok)`).

Yeni alan tipi **`resim`** motorda: 36px küçük resim (yoksa kesik çizgili boş kutu); aranmaz,
süzülmez, gruplanmaz; gruplamada ilk resim; matriste anahtar değil, satırın başında
(`resimSutunlari`); Excel'e girmez (data URL hücreye sığmaz); yazdırmada basılıyor.

**Doğrulama:** `birim-rapor.js` (72 iddia) — renk resmi / kapak / yok, aramada yok, gruplamada ilk
resim, matriste anahtar dışı. Senaryo — Siyah satırlarda renk resmi, Taba'da kapak.

### 8m. EXCEL VE YAZDIR = EKRANDAKİ TABLO (12 Eylül, v1.248.0)

**Kullanıcı:** *"Excel ve yazdır tabloda gördüğü gibi yapsın. Tablo başka, yazdır başka olmasın."*

`raporExcelAktar` artık veri modelinden değil **ekrandaki tablodan** okuyor (`#rapor-yazdir-…` içindeki
`<table>`): aynı sütunlar, aynı sıra, aynı kısa başlıklar, matriste beden sütunları ve dökümlü
hücre metni ("4 teslim edildi / 6 saya'da"), toplam satırı dahil. Yazdırma zaten aynı tabloyu
basıyordu (`indirYazdirilabilirHTML`), böylece üç çıktı tek kaynaktan. Sütun arama satırı
(`no-print`) ikisinde de yok. Türkçe biçimli sayılar ("2.220,00") Excel'de SAYI; başlık satırı
metin kalıyor ("41" beden başlığı sayıya dönmesin). Resim hücresi Excel'de "(resim)"
(SheetJS'in ücretsiz sürümü hücreye resim gömmüyor); yazdırmada resim basılıyor.

Test derlemesindeki `XLSX` sahtesi `utils` taşıyor (dosya yazmıyor); `raporExcelAktar` son
çıktıyı `window.__sonRaporExcel`e bırakıyor — indirme ölçülemediği için senaryo oradan okuyor.

**Doğrulama:** senaryo — matriste Excel: satır sayısı ekranla aynı, başlıklar birebir (kısa adlar
dahil), 41 hücresi `4 teslim edildi / 6 saya'da`, toplam satırı sayısal.

### 8n. AŞAMA YANINDA PROSES İKONU (12 Eylül, v1.249.0)

**Kullanıcı:** *"Proses ikonları var, onları da yanında göster."*

Aşama satırları prosesini taşıyor (`_proses`: "Kesim bekliyor" / "Saya'da" → Kesim / Saya);
alan tanımında `ikonAlani: "_proses"`. `AsamaIkonu`: proses varsa tanımlardaki proses ikonu
(`ProsesIkonu`, `tanimlar.prosesler[].ikon` — üretim kartıyla aynı), proses dışı aşamalarda sabit
ikon (`ASAMA_IKONLARI`: üretildi → Package, teslim edildi/yolda → Truck, teslim alındı → PackageCheck,
hurda → Trash2, planlanmadı → Compass, üretim bekliyor → Hammer). Listede ve matris anahtar
sütununda aşamanın solunda, matris hücre dökümünde her aşama satırının başında. Matris ayrımı
`proses`i de taşıyor (`{ etiket, miktar, proses }`). İkon inline SVG olduğu için yazdırmada basılıyor;
Excel'de metin yok, hücre metni değişmedi. `RaporSekmesi`ne `tanimlarProsesler` prop'u.

**Doğrulama:** birim — `_proses` dizisi, hücre dökümünde proses. Senaryo — Aşama hücrelerinde ikon:
`Teslim edildi:Truck`, `Saya'da:Shirt` (Saya'nın varsayılan ikonu), `Planlanmadı:Compass`.

### 8o. STOK EKRANI BAŞLIĞI SIKI (12 Eylül, v1.250.0)

**Kullanıcı (ekran görüntüsüyle):** *"Ekranın yarısına yakını arama, sekme vs. — bunları saralım."*

Stok modülünün üst kısmı üç satırdan ikiye indi, dolgular küçüldü:
- Arama satırı: kutu 6px dolgu / 13px yazı, kısa placeholder; "Toplam Stok Değeri" → küçük "Stok
  değeri"; "Bağımsız Stok Girişi" → "Stok Girişi" (ipucunda tam ad), düğmeler 12px.
- Kategori sekmeleri 5×10px / 12px, alt boşluk 20 → 8.
- **Liste / Katalog anahtarı ve katalog düğmeleri (Fotoğrafla Bul, Müşteri görünümü) kategori
  sekmeleriyle AYNI satırda** (sağda) — ayrı satır kalktı.

Ölçüm (900px genişlik): başlıktan ilk ürün kartına 300px → 237px. Telefonda kazanç daha büyük
(kalkan satır sarılmıyor). Modül başlığı + dikiş çizgisi (App) dokunulmadı.

**Doğrulama:** `senaryo-katalog.js` — `sikiBaslik`: Liste düğmesi "Tümü" sekmesiyle aynı satırda,
ilk kart başlığa 200px'den yakın. Diğer ölçümler değişmedi.

> **ALTIN ÇIKTI DEĞİŞTİ, gerekçe:** `senaryo-sekmeler` Stok arama kutusunun üst kenarını ölçüyor
> (`ilkIcerikUstu` 122 → 121): kutunun dolgusu küçüldü. Ölçülen davranış (içerik başlığın hemen
> altında) değişmedi.

> Aynı sıkılaştırma diğer modüllerde (Cari, Sipariş, Depo…) YAPILMADI; kullanıcı Stok'u gösterdi.

### 8p. DEPO BAŞLIĞI SIKI (12 Eylül, v1.251.0)

**Kullanıcı (ekran görüntüsüyle):** *"Depo'nun yarısına yakını arama, sekme vs. — bunları düzeltelim."*

Ekran görüntüsünde üst şeritte **boş bir nokta ve çizgi** duruyordu: `TAB_TITLES`te `depo` yoktu
(7z-48'deki `satinalma` eksikliğinin aynısı). Eklendi; modülün kendi 20px "Depo · hammadde
rezervasyon ve tedarik durumu" başlığı KALDIRILDI (ikinci kez basılıyordu).

- Üç satırlık açıklama paragrafı kaldırıldı; metni "Hammadde Deposu" sekmesinin ve arama kutusunun
  ipucunda (title). Mamul / Fire sekmelerine de kısa ipucu.
- Sekmeler 5×10px / 12px, alt boşluk 14 → 8; arama 5×8px / 12px; süzgeç rozetleri 3×9px; özet
  11px, tek satır.

Ölçüm (900px): başlıktan ilk tablo satırına 300px → 168px.

**Doğrulama:** `senaryo-satin-al-dugmesi.js` — `sikiBaslik`: üst şeritte "Depo", ilk satır
başlığa 200px'den yakın. Diğer ölçümler değişmedi.

> `senaryo-geri-donus` Depo'yu kaldırılan açıklama cümlesinden tanıyordu ("Hammadde deposunun tam
> tablosu") ve kırmızıya düştü; artık üst şerit başlığı + görünür "Hammadde Deposu" sekmesinden
> tanıyor. Altın çıktı değişmedi.

### 8q. MODEL RENGİ BARKODDA TANINIYOR (12 Eylül, v1.252.0)

**Kullanıcı (Paketleme ekran görüntüsüyle):** uyarı *"2 renk/bedende çift barkodu kurulamıyor …
Tanımlar'da yok: renk: 1001 - KAHVE SÜET/Bej · renk: 1002 - Lacivert/Bej"* — *"Model rengi
eşleşmeyen herhalde, orada kod tanımsızlığı var."* Doğru teşhis.

Mamulün varyant rengi bir **renk kombinasyonu etiketi** ("1001 - KAHVE SÜET/Bej"); kayıt
`tanimlar.renkKombinasyonlari`nde. Barkod şeması (6b) yalnız `tanimlar.renkler`e bakıyordu, o
yüzden mamul renkleri "tanımsız" çıkıyor ve **hiçbir mamulün kutu etiketi basılamıyordu**.

**Yapılan (077-barkod):**
- `renkTanimiBul` renkte bulamazsa `modelRengiTanimiBul`: kimlik, etiket ya da etiketin
  "KOD - " başıyla eşleşme (renk adları değişse de kod kalır). Tanım biçiminde döner:
  `{ id, ad: etiket, barkodKodu: kombinasyon kodu, modelRengiMi: true }`.
- **Kombinasyonun kendi kodu (1001…) barkoda renk kodu olarak giriyor** — 4 hane, değişmez,
  tekil; ayrı bir barkod kodu atamaya gerek kalmadı.
- Çözme (`urunBarkoduCoz`) renk kodunu önce renklerde, sonra kombinasyonlarda arıyor
  (`renkTanimiKoddanBul`).
- **Çakışma korumaları:** renk sayacı (`kodlariAta`) kombinasyon kodlarını atlıyor; yeni kombinasyon
  kodu (`kombinasyonEkle`) renklerin barkod kodlarını atlıyor. Aynı 4 haneli alanı paylaşıyorlar.

`TAB_TITLES`e `paketleme` eklendi (üst şerit boştu), modülün kendi başlığı kalktı.

**Doğrulama:** `birim-barkod-semasi.js` — model rengi tanımsız sayılmıyor, barkod 1001 ile
kuruluyor, okutulunca model rengine çözülüyor, ad değişince kod başından eşleşiyor, renk sayacı
1001'i atlıyor.

> Kullanıcının verisinde uyarı yeni sürümde kaybolmalı; kalırsa stok no eksik ya da beden
> tanımsız demektir (uyarı hangisi olduğunu yazıyor).

> **Depo'daki "Üretim bekliyor" sorusu KAPANDI (13 Eylül):** 10005 ve 10006'nın ürünlerinin
> REÇETESİ YOK; reçetesiz üretimde proses adımı oluşmuyor, rapor da doğru olarak "Üretim bekliyor"
> diyor. Eşleşme hatası değil. Reçete tanımlanınca aşamalar kendiliğinden ayrılır.

### 8r. SİPARİŞ KARTINDA DÜZENLEME YALNIZ ✎ İLE (12 Eylül, v1.253.0)

**Kullanıcı (ekran görüntüsüyle):** *"Düzelt tuşuna tıklamadan düzeltme yapmaya izin vermesin —
yanlışlıkla tıklama vs. için."*

Sipariş kartında miktar ve birim fiyat kutuları her zaman açıktı (v1.2xx, "miktar yerinde
düzenleniyor"); telefonda tabloya dokunurken sayı değişebiliyordu. Artık **miktar kutusu, birim
fiyat kutusu ve kalem silme çarpısı yalnız ✎ (Düzenle) ile açılan modda** görünüyor; mod dışında
düz metin. Mod = başlık düzenleme formu (`baslikDuzenle`): ✎ açar, formdaki Kaydet / Vazgeç kapatır
— ayrı bir "düzenleme modu" state'i yok, ikinci bir açma/kapama yolu olmasın. ✎'nin ipucu artık
"Düzenle — cari, tarihler, not; kalem miktarı ve fiyatı da bu moddayken değişir". "+" (kalem ekle)
dokunulmadı: kendisi zaten bir niyet düğmesi.

**Doğrulama:** `senaryo-siparis-duzenle.js` — mod dışında miktar/fiyat kutusu ve silme çarpısı 0
(`modDisiKutu`); ✎ sonrası eski adımlar aynen (miktar 5→8, başlık, fiyat 350→375). Başlık kaydı
modu kapattığı için fiyat adımında ✎'ye yeniden basılıyor. Senaryo ✎'yi eski ipucu metniyle
buluyordu (`Cari, tarihler, müşteri kodu`), `^Düzenle` ile bulacak şekilde güncellendi.

### 8s. SON ALIŞ FİYATLARI (12 Eylül, v1.254.0)

**Kullanıcı (alış fişi ekran görüntüsüyle):** *"Alış fiyatlarında son alış fiyatlarını hatırla, not
düş; hatta stok kartı içinde fiyatlara son alış fiyatlarını listele — alış fiyatı ile gerçekleşen
alışlar arasındaki farkları tespit etmek için."*

**Kaynak: cari hareketleri, ayrı kayıt YOK.** Alış fişi kesildiğinde her kalem cariye ürün adı,
renk, beden, miktar, birim fiyat (çevrimliyse `hamBirimFiyat` + `kalemParaBirimi`) ile yazılıyor;
stok hareketinde fiyat yok. `sonAlisFiyatlari(cariler, urunAd, { renk, sinir })` (075-fis-ortak)
bütün carilerin `AF-` fişlerini tarıyor, en yeni önce. Ayrı bir "son fiyat" alanı tutulsaydı fiş
geri alınınca geride kalır, olmamış bir alışı hatırlatırdı; hareket silinince liste kendiliğinden
düzeliyor. **Eşleşme ürün ADIYLA** (hareket ürün kimliği taşımıyor), harf duyarsız — ürün adı
değişirse eski alışlar görünmez; bilinen sınır.

- **Alış fişinde** (255-stokfisi) birim fiyat kutusunun altında "son 280 ₺ · 05.09" notu; aynı
  rengin alışı yoksa başka rengin fiyatı "(Siyah)" işaretiyle. Girilen fiyat sondan farklıysa
  turuncu ve kalın — fark kaydetmeden önce görülsün. İpucunda tedarikçi, fiş no, miktar.
- **Stok kartı › Fiyatlandırma** başında "Son alış fiyatları" tablosu (son 10): tarih, tedarikçi,
  fiş, renk, ölçü, miktar, fiyat, **kart farkı %** (gerçekleşen − kart) / kart; para birimi karttan
  farklıysa "—". Sağ üstte karttaki alış fiyatı.

**Doğrulama:** `birim-son-alis.js` (yeni) — yalnız AF fişleri, en yeni önce, harf duyarsız, renge
göre, sınır, çevrimli alışta kalemin kendi birimi, satış/ödeme karışmıyor. `senaryo-fis-ihtiyactan`
— tedarikçiye eski bir alış (Deri Siyah 0,25 $) kondu: fişte iki satırda not (`son 0,25 $ · 01.09`,
Taba'da `(Siyah)` işaretli, ikisi de farklı/turuncu — kalem 0,22); stok kartında satır
`… · 10 metre · 0,25 $ · +13,6%`.

> Senaryoya eklenen kart adımı önce fiş ölçümlerinin ÖNÜNE düştü ve altın yanlış üretildi;
> düzeltildi, eski ölçümlerin hepsi önceki değerinde.

### 8t. BULUT KULLANICISI UYGULAMADAN (12 Eylül, v1.255.0) — 7z-46 kapandı

**Kullanıcı:** *"Bulut hesabını uygulama içinden Supabase'e bağlayalım, bu adımda."*

**Supabase fonksiyonu `kullanici`** (`supabase-kullanici-fonksiyonu.ts`, kur fonksiyonuyla aynı
düzen): uygulama OTURUM JETONUYLA çağırır; fonksiyon `auth.getUser(jeton)` ile çağıranı doğrular,
`tanimlar` tablosundaki (id "tekil", `veri.kullanicilar`) kayıtta e-postasıyla eşleyip **rolü
Yönetici değilse 403** döner; sonra service role ile `admin.createUser` (onaylı, `email_confirm`) /
`updateUserById` (şifre) / `deleteUser`. "ekle" **idempotent**: hesap varsa şifre güncellenir —
"bulut hesabı aç" ile "şifre değiştir" tek düğme. Gizli anahtar fonksiyona Supabase'ce verilir,
kopyalanmaz. CORS her yanıtta. Kendi hesabını silemez. **"Verify JWT with legacy secret" KAPALI
olmalı** (yeni tip anahtarla açıkken istek fonksiyona ulaşmayabilir; kur fonksiyonuyla aynı) —
önce "açık kalabilir" yazılmıştı, kullanıcının ekran görüntüsünde anahtar açıktı, düzeltildi.

E-posta eşlemesi: kayıttaki `eposta` alanı; yoksa (elle açılmış ilk hesap) `kullaniciEposta`
türetmesinin TS kopyası — yalnız geçiş için, yeni açılan her hesaba uygulama `eposta` yazıyor.

**Uygulama (030-supabase `bulutKullaniciIslemi`, 130-tanimlar):**
- **Ekle:** önce fonksiyon; başarılıysa kayıt `{ eposta, bulutHesabi: true }` ve **ŞİFRE KAYITTA
  YOK** (2. aşamanın parçası). Fonksiyon reddederse kayıt YAZILMAZ; onay kutusuyla "yine de yerel"
  seçilirse `bulutHesabi: false` + yerel şifre (o kullanıcı bulut hesabı açılana kadar yerel girer).
  Form yalnız gerçekten eklendiyse temizleniyor. Şifre en az 6 (Supabase kuralı) — uygulama da soruyor.
- **Satırda rozet:** bulut / yerel / bulut? (eski kayıt). **"Bulut hesabı aç / şifre" · "Şifre
  değiştir"** kutusu (`KullaniciSifreKutusu`): fonksiyon kabul edince yerel düz metin şifre
  SİLİNİYOR, `eposta` + rozet yazılıyor. Mahmut'un kaydına bunu bir kez yapmak yeter.
- **Sil:** onay → fonksiyon `sil` → kayıt silinir. Fonksiyon reddederse ve kullanıcının bulut
  hesabı vardı: kayıt DURUR (bulutta hesap kalmasın). Bulut hesabı yoksa yerel silme yeter.
- İşlem sürerken düğmeler kilitli (`bulutIslemi`). Hata mesajı olduğu gibi gösteriliyor; fonksiyon
  kurulu değilse (404) açıkça "kurulu değil" deniyor.

**KULLANICININ YAPACAĞI (bir kez):** Supabase > Edge Functions > Create function > adı `kullanici`
> `supabase-kullanici-fonksiyonu.ts` içeriğini yapıştır > Deploy. Sonra Tanımlar'da kendi satırında
"Bulut hesabı aç / şifre" ile şifresini bir kez girsin — kaydına e-posta yazılır, düz metin şifre silinir.

**Doğrulama:** `senaryo-bulut-kullanici.js` (yeni) — auth ve fonksiyon sahte: ekle → `{ islem:
ekle, eposta: ayse@atolye.local, sifre, Bearer jeton }`, kayıt bulut+e-posta, şifre yok; fonksiyon
404 → onay diyaloğu → yerel kayıt (`bulutHesabi: false`, şifre var); sil: bulut reddi → kayıt durur,
kabul → `sil` çağrısı ve kayıt gitti; bulutsuz kullanıcı fonksiyon reddetse de yerel silinir.

**v1.256.0 — kullanıcı "Bulut hesabı açılamadı: HTTP 200" gördü.** 200 ama gövdede `tamam` yok;
uygulama yalnız durum kodunu basıyordu. Artık beklenmeyen gövde OLDUĞU GİBİ gösteriliyor ve en sık
sebep tanınıyor: panelde fonksiyon açılmış ama dosya yapıştırılmamış, Supabase'in "Hello" şablonu
200 dönüyor → "fonksiyon ŞABLON kodla çalışıyor — dosya içeriği yapıştırılıp Deploy edilmemiş".
Senaryoya şablon yanıtı eklendi (diyalogda mesaj, iptalde kayıt yok). **Kullanıcının ikinci ekran
görüntüsü teşhisi doğruladı:** Supabase Test penceresi `{"message":"Hello Functions!"}` döndü — kod
hiç deploy edilmemişti. Adımlar kullanıcıya yazıldı (Code sekmesi → şablonu sil → dosyayı yapıştır →
Deploy → Verify JWT kapat).

**Bilinen sınırlar:** rol bilgisi `tanimlar`dan okunuyor; 2. aşama (`rls-kimlik.sql`) çalışmadan o
tablo anahtarla açık — rolü sunucuda korumak ayrı iş. Fonksiyon çağrıları için bulut oturumu şart:
yerel girişle Tanımlar'dan bulut hesabı açılamaz (mesaj söylüyor).

### 8u. KİMLİK DOĞRULAMA 2. AŞAMA (12 Eylül, v1.257.0) — SQL hazır, ÇALIŞTIRILMADI

**Kullanıcı:** *"Kimlik doğrulamanın 2. aşaması."*

**`rls-kimlik.sql` (yeniden yazıldı; eski dosya pakette yoktu):** `public` şemasındaki HER tabloda
RLS + `authenticated` rolüne "her şey" politikası (tablo listesi yazılmıyor, `pg_tables` döngüsü —
ileride eklenen tablo için yeniden çalıştırılabilir, idempotent) ve **`anon` rolünden bütün
yetkilerin alınması**. İkincisi şart: RLS tek başına anonim SELECT'i hata vermeden BOŞ döndürür,
uygulama "veri yok" sanıp İLK KURULUM ekranına düşerdi. Yetki alınınca anonim istek açıkça 401/403
alır. Tek işlem (BEGIN/COMMIT), sonunda yorum içinde GERİ ALMA bloğu. Edge Function'lar service role
ile çalıştığı için etkilenmez.

**Uygulama (`BulutGirisEkrani`, 065-giris; App):** açılışta bulut okuması 401/403 ya da
"permission denied" verirse **yerel kopyaya DÜŞÜLMÜYOR** (bayat veri; boşsa ilk kurulum ekranı):
oturum siliniyor, bulut ön giriş ekranı geliyor (kullanıcı adı + şifre → e-posta `kullaniciEposta`
ile türetilir → Supabase Auth). Girişten sonra yükleme baştan çalışıyor (`yuklemeSayaci`, yükleme
efekti artık ona bağlı) ve kullanıcı Tanımlar kaydıyla (`eposta` ya da kullanıcı adı) eşlenip
DOĞRUDAN içeri alınıyor — ikinci giriş ekranı yok, "Yerel giriş" rozeti yok. Tanımlar'da olmayan
ama bulutta hesabı olan biri normal giriş ekranına düşer (mesajla). İnternet yokken eski davranış
(yerel kopya) aynen — yalnız yetki reddi bu ekrana götürüyor. Hata metni: iki okuma yolu iki biçimde
hata veriyor ("Supabase 401: …" ve "tanimlar: HTTP 403"), ikisi de yakalanıyor.

Yerel şifre yedeği (`GirisEkrani`) KODDAN KALDIRILMADI: SQL çalışmadan önce geçiş için gerekli;
SQL'den sonra zaten erişilemez (veri okunamadan o ekrana gelinmiyor; kayıtlı oturumla gelinirse
bulut doğrulaması yine önce). Kaldırma, SQL çalışıp herkes girdikten sonraki bir iş.

**Doğrulama:** `senaryo-bulut-on-giris.js` (yeni; harnese `onceRota` eklendi — açılış isteklerini
yakalamak için rota sayfa yüklenmeden kurulmalı): REST anahtarla 403 → bulut giriş ekranı, ilk
kurulum YOK, yerel liste YOK; yanlış şifre → sebep ekranda; doğru şifre → tanımlar jetonla okundu,
doğrudan içeride, ikinci giriş ekranı yok, yerel rozet yok. `bulutGirisSebebi` şifre mesajı
nötrleştirildi ("Tanımlar'daki şifreyle aynı olmalı" 2. aşamada yanıltıcıydı); altın güncellendi.

**GÜNCELLEME (22 Eylül, v1.409.0 — kullanıcı "kimlik doğrulama olsun, nasıl yapalım"):**
150 sürüm sonra yeniden gözden geçirildi. Uygulama: bütün REST/okuma istekleri `yetkiBasliklari()`
ile oturum jetonu taşıyor; Storage ve RPC çağrısı YOK; SQL dosyalarında fonksiyon/tetikleyici YOK
(yalnız tablolar). İki değişiklik: (a) sonradan eklenen tabloların kurulum dosyalarından kalan
**rol sınırsız** `*_hepsi` politikaları (gorevler, mesajlar, surum, fis_defteri, modeller, koliler,
cek_gorselleri) artık siliniyor — anon yetkisi alındığı için zararsızdılar ama anon'a yetki
verilirse kapıyı açarlardı; (b) **`surum` anon'a YALNIZ OKUMA** açık kalıyor (`surum_anon_okuma`):
`baslat.html` giriş öncesi sürümü okuyor (önce surum.json, yoksa bu tablo). SQL'e iki doğrulama
eklendi (tarayıcıdan anahtarla okuma denemesi; pg_policies listesi). Sözdizimi pglast ile doğrulandı
(14 ifade, 2 PL/pgSQL bloğu, geri alma 8 ifade). Kullanıcıya adımlar ve iki soru verildi
(`kullanici` fonksiyonu çalışıyor mu; bütün kullanıcıların rozeti "bulut" mu).

**KULLANICININ SIRASI (bozulmamalı):**
0. Uygulamadan JSON yedeği al (Yedekleme).
1. `kullanici` fonksiyonunu deploy et (8t) — henüz şablon kodla.
2. Her kullanıcıya Tanımlar'dan bulut hesabı; herkes bir kez bulut kimliğiyle girsin (rozet "bulut").
3. Herkeste v1.257.0+ açık olsun (eski sürüm SQL'den sonra açılamaz).
4. `rls-kimlik.sql` (Supabase > SQL Editor). Sorun olursa dosyanın sonundaki geri alma bloğu.

### 8v. TEDARİK GİRİŞLERİ + SEVK KAYNAĞI FIFO (13 Eylül, v1.258.0)

**Kullanıcı (ekran görüntüsüyle):** *"100 çiftlik ürün satın alma ile girişi oldu, burada yanlış
gösteriyor (üretimden diyor). Alış ve üretim giriş fişlerini bir sekmede toplayalım; tıklayınca
üretim veya alış fişine gitsin."*

**Hata:** `kaynakBul` aynı ürün/renk/bedende bu siparişe bağlı İLK girişi buluyor ve BÜTÜN sevk
satırlarına yazıyordu. Üretimden 3 + satın almadan 100 gelmişse hepsi "üretimden depoya girdi".

**Yapılan (340-sipariskarti):**
- `siparisTedarikGirisleri(siparis, stok)`: siparişe bağlı stok girişleri (kaynak Üretim /
  Satınalma; bağ `rezervasyonSiparisId` ya da `siparisNo` ∈ kalemlerin planlama referansları; kalem
  olmayan ürün/renk/beden sayılmaz), tarih sırasıyla.
- **FIFO pay:** sevk satırları tarih sırasıyla o havuzdan miktar düşerek pay alıyor; bir satır iki
  kaynaktan da beslenebilir — "✓ 100 satın alma ile stoğa girdi (AF-…)" + "✓ 3 üretimden depoya
  girdi (10007-Kesim-2-Giriş)"; kalan varsa "N stoktan". Her pay satırında ok: alış → Fişler'de o fiş
  (`onFiseGitNo`), üretim → üretim kartı (`onGoToUretim`).
- **"Tedarik Girişleri" bölümü** (satış kartında, fiş geçmişinin üstünde, sevkten bağımsız —
  henüz satış yokken de): tarih · kaynak · fiş/üretim no · ürün · renk · ölçü · miktar; satıra
  tıklayınca ilgili fiş/üretim. Açılır-kapanır, özet başlıkta.

> ### MATRİS DÜZENİ — HER YENİ TABLODA VARSAYILAN (kullanıcı, 13 Eylül: "matris düzenini
> unutuyorsun hep")
> Tedarik Girişleri önce beden başına satır listelendi (5 bedenli alış = 5 satır); kullanıcı üçüncü
> kez düzeltti (hazır ürünler 8c, rapor 8h, şimdi bu). **Kural:** bir tabloda renk/beden varsa
> satır = kayıt + ürün + renk, sütun = beden, sağda toplam. Yeni tablo yazarken önce bunu uygula,
> sorma. v1.259.0'da `data-tedarik-matris`: satır = fiş/üretim + ürün + renk + tarih, hücre = miktar.

**Doğrulama:** `senaryo-tedarik-girisleri.js` (yeni) — 100 satın alma + 3 üretim girişi, 103 sevk:
kaynak satırları `100 satın alma …` ve `3 üretimden …`; Tedarik Girişleri matriste iki satır (alış 41=100 · 42=5 · 105; üretim 41=3); alış satırına
tıklayınca Fişler modülü ve fiş görünür.

### 8w. SATIŞ FİŞİ GEÇMİŞİ MATRİS + KAYNAK İKONLARI (13 Eylül, v1.260.0)

**Kullanıcı (ekran görüntüsüyle):** *"Burayı da matris yapalım; açıklamalar sığmaz, üretim ikonu
veya satın alma ikonu koyalım yanlarına."*

Fiş geçmişinde ürün+renk grubunun beden rozetleri (her rozet altında iki satır açıklama) yerine
**matris** (`data-sevk-matris`): sütun = beden, hücre = sevk miktarı; altında kaynak payları **ikon +
adet**: çekiç (Hammer) = üretimden, onaylı paket (PackageCheck) = satın almadan, katman (Layers) =
stoktan, ünlem = bekleyen planlama uyarısı. İkonun ipucu tam açıklama ("100 satın alma ile stoğa
girdi (AF-…)"), tıklayınca fiş/üretim açılır (`girisAc`). "Sevk edildi (fiş · tarih)" grup altında
bir kez, yanında ikon açıklaması. Alış fişinde (kaynak yok) yalnız matris.

**Doğrulama:** senaryo — 41 hücresi `103`, ikonlar `Satınalma:100` ve `Üretim:3` (ipuçları tam metin).
Tablonun altında matris kuralı (8v) zaten notta — bu kez sorulmadan uygulandı… kullanıcı yine
söyledikten sonra. Geçmişte KALAN beden-başına listeler varsa ilk fırsatta çevrilmeli.

### 8x. SİPARİŞ EKRANI BAŞLIĞI SIKI (13 Eylül, v1.261.0)

**Kullanıcı (ekran görüntüsüyle):** *"Sekmeler, üst bilgiler vs. çok yer kaplıyor, düzenleyelim."*
(Stok 8o ve Depo 8p ile aynı istek.)

- "Yeni Sipariş" düğmesi tek başına bir satırdı → arama kutusuyla AYNI satıra (sağda), Raporlar
  sekmesinde gizli.
- 20px "Satış Siparişi · 4 kayıt" h2'si kalktı → Liste/Raporlar sekme satırının sağında küçük metin.
- Sekmeler 5×12px / 12px, alt boşluk 14 → 8; durum rozetleri 3×8px / 11px, boşluk 16 → 6; Satış/Alış
  iç sekmesi 18 → 8.
- Kolon süzgeçleri (sipariş / cari / tarih) ile TOPLAM kutusu aynı satırda (toplam sağda, dar
  ekranda sarılır).

Ölçüm (900px): başlıktan ilk sipariş kartına 330px → 241px.

### 8y. SİPARİŞ ÇIKTISI + WHATSAPP (13 Eylül, v1.262.0)

**Kullanıcı:** *"Sipariş tedarik planlamada yazdırma ve WhatsApp gönderimi olmalı — alış veya satış
siparişini çıktı almak ve cariye WhatsApp'tan göndermek için. Çıktıyı sipariş no ve cari adıyla
isimlendir; cari kartta WhatsApp no girişi yapalım, oradaki numaraya otomatik göndersin."*

**Sipariş kartı başlığında iki düğme** (durum rozetinin yanında; salt okunur listede de var —
çıktı almak düzenleme değil):
- **Yazdır** → `siparisCiktisiHTML` (075-fis-ortak): firma başlığı/logo, sipariş no·tarih·teslim,
  cari (ad, adres, telefon, müşteri kodu), kalemler **MATRİS** (ürün+renk satır, beden sütun, resim),
  toplam adet, birim fiyat / tutar (para birimi bazında), not. `htmlGovdesiniIndir` ile dosya:
  **"SAT-1002 - Serdar Özemen.html"** — açılınca yazdırma penceresi gelir, PDF olarak kaydedilebilir
  (fiş yazdırmayla aynı mekanizma).
- **WhatsApp** → `wa.me/<numara>?text=<özet>`: cari kartındaki **WhatsApp** numarası (yoksa telefon)
  ile sohbet açılır, sipariş özeti metin olarak HAZIR gelir (matris satırları `41:10  42:6 = 16 çift`),
  kullanıcı yalnız gönderir. Numara yoksa düğme gri, numarasız `wa.me` (WhatsApp kişi seçtirir).
  **Tarayıcıdan bir numaraya DOSYA otomatik gönderilemez** (WhatsApp buna izin vermiyor); dosya
  istenirse Yazdır'la inen dosya paylaşılır. `whatsappNumarasi`: 05xx → 905xx, +90/0090 korunur.

**Cari kartında WhatsApp alanı** (Düzenle'de Telefon yanında; kapalıyken yeşil ikonla görünür).
Bulutta sütun yok: `cariler.ek.whatsapp`; okuma tarafı cari kökündeki `ek`i açıyor (hareketlerdeki
gibi) — o satır daha önce yoktu, `ek` yazılsa da okunmuyordu.

#### v1.263.0 — PDF (kullanıcı: "WhatsApp'tan fiş gönderme, ekrandakinin aynı bilgileri ve PDF olmalı")

- `htmldenPdfBlob`: çıktı HTML'i ekran dışı 794px kapta çizilip **html2canvas** ile resme, **jsPDF**
  ile A4 sayfalara (uzunsa dilimlenir). Kütüphaneler ANINDA ve DİNAMİK yükleniyor (esm.sh, sürüm
  sabit: jspdf@2.5.2, html2canvas@1.4.1) — açılışa yük yok; yüklenemezse (internet yok) `null`.
  Metin resim olarak gidiyor: jsPDF'in fontları ş/ğ/İ içermiyor, TTF gömmek ağ/dosya yükü; telefonda
  paylaşım için yeterli.
- **PDF düğmesi** (eski "Yazdır"): PDF indirir, adı "SAT-1002 - Cari.pdf"; kütüphane yoksa yazdırılabilir
  HTML (eski yol) + uyarı.
- **WhatsApp düğmesi**: telefonda `navigator.share({ files: [pdf] })` — paylaş menüsü PDF EKLİ açılır,
  kullanıcı WhatsApp'ı ve kişiyi seçer (tarayıcı bir numaraya dosyayı kendiliğinden gönderemez;
  WhatsApp'ın kuralı). Paylaş menüsü yoksa (bilgisayar): PDF iner + numaraya sohbet açılır, dosya
  elle eklenir. PDF hiç üretilemezse: özet metinle sohbet (v1.262 davranışı).
- `import()` doğrudan yazılmıyor (`new Function("u","return import(u)")`): test derlemesi CommonJS,
  `import()`i `require`a çevirip tarayıcıdaki sahte `require`dan anlamsız nesne alıyordu. Yapı
  denetimine `Function` küresel adı eklendi.

**GERÇEK CİHAZDA DENENMEDİ:** test ortamı esm.sh'ye ulaşamıyor (yedek yol ölçüldü: HTML indi,
wa.me açıldı). Telefonda PDF üretimi, paylaş menüsü ve html2canvas'ın resimli tabloyu doğru çizmesi
kullanıcı denemesinde görülecek. Sorun olursa ilk şüpheli: esm.sh'nin modül biçimi (`default`).

**Doğrulama:** `birim-siparis-ciktisi.js` (yeni) — numara normalize (5 biçim), özet metni, bağlantı
önceliği (whatsapp › telefon › numarasız), çıktı HTML'de firma/no/cari, beden sütunları, ürün+renk
satırları, toplam 19, tutarlar (400 + 81 = 481 $), HTML kaçışı. `senaryo-tedarik-girisleri` —
kartta Yazdır/WhatsApp; bağlantı `wa.me/905321234567`, metin `*SİPARİŞ SAT-1*` / `Müşteri B`;
Yazdır dosya indiriyor (başsız tarayıcı dosya adını "download" verdiği için ad ölçülmüyor).

### 8z. ÜRETİMDEN KOLİ — KALAN VE AŞIM KONTROLÜ (13 Eylül, v1.264.0)

**Kullanıcı:** *"Paketlemede koli kur doğru çalışmıyor: 25 çift ürün için 8'li koli kurduğumuzda 17
çift kalması gerekir; 4 tane 8'li koli kurdum ama hâlâ koli kurdurabiliyor. Kontrol koyalım."*

Sipariş kaynağında bu kontrol vardı (kolilerdeki bekleyen adet düşülüyor, aşım reddediliyor — "üç
kez 8'lik koli" olayı). **Üretim kaynağında** ("Paketlemeyi bekleyen üretimler" → Aç ya da üretim
no okutma) kalan hep üretimin tamamı gösteriliyor, koliler düşülmüyor, kayıtta sınır yoktu.

**Yapılan (315-paketleme):** `uretimdenKolilenen(uretimId)` — o üretime bağlı kolilerdeki adetler
(HAZIR + SEVK EDİLMİŞ hepsi: üretim adedi sabit, sevk edilen koli de o üretimden çıktı; siparişteki
gibi `karsilanan`a yansıyan ikinci sayaç yok). Kaynak listesinde kalan = üretim bedeni − kolilenen;
kalanı biten beden listeden düşer. Kayıtta **"Üretim aşılıyor — Bot Siyah 41: kalan 1, girilen 8"**
ile red; üretimde olmayan ürün/renk/beden de reddedilir.

**Doğrulama:** `senaryo-koli-uretim-siniri.js` (yeni) — 25 çiftlik üretimden 8'li koliler: kalan
25 → 17 → 9 → 1; 4. koli (8) reddedildi (koli sayısı 3 kaldı), 1'lik koli kabul (4), sonra kutu yok.
Düzeltme ÖNCESİ aynı senaryo: kalan hep 25, 6 koli kuruldu (kullanıcının gördüğü).

**v1.267.0 — kullanıcı:** *"Koli kurulan ürün yukarıdaki listeden düşsün: 25'in 16'sı kolilendiyse
yukarıda 25 toplam · kalan 9; tamamı kolilenince listeden silinsin; yukarıda yalnız koli kurulacak
ürünler listelensin."* `hazirUretimler` artık `{u, toplam, kalan}`; kalan = bedenler − `uretimdenKolilenen`;
kalanı 0 olan listede yok. Satırda "25 çift · kalan 9"; **Kutu Etiketleri (kalan)** yalnız
kolilenmemiş çiftler için basıyor (kolilenenin etiketi koliden basılır; iki kez basmak aynı çifte iki
etiket). Senaryo: liste 25/17 → 25/9 → 25/1, sonra "listede yok".

> Tuzak: `src` düzenlendi ama `yap.sh` çalıştırılmadan test derlendi — eski `atolye-erp.jsx` ile
> "düzeltme etkisiz" görünmüştü. Test öncesi her zaman `./yap.sh`.

## 9. PAYLAŞIM VE FİŞ KAYNAKLARI

### 9a. SİPARİŞ PDF'İ E-POSTAYLA (13 Eylül, v1.265.0)

**Kullanıcı:** *"Paylaş kısmına mail de ekleyelim; kullanıcı mail bilgilerini girsin, o mail ile PDF
şeklinde sipariş gönderelim, cari kartındaki kayıtlı maile."* Hangi hesap: "henüz belli değil" →
genel SMTP.

- **Supabase fonksiyonu `eposta`** (`supabase-eposta-fonksiyonu.ts`, denomailer): çağıranın oturumunu
  doğrular (rol şartı yok), SMTP ayarlarını **Tanımlar kaydından** okur (şifre ağdan geçmez), PDF'i
  base64 ek olarak gönderir. 465 → TLS, 587 → STARTTLS (Tanımlar'da elle de seçilebilir). Hata
  mesajı SMTP'den olduğu gibi.
- **Tanımlar > Genel > E-posta gönderim ayarları:** sunucu, port, güvenlik, kullanıcı, şifre,
  gönderen adı (`firmaBilgileri.eposta`). Gmail için "uygulama şifresi" şart; Outlook/365
  smtp.office365.com:587. Şifre Tanımlar'da → 2. aşama bitmeden başka yerde kullanılan şifre olmasın.
- **Cari kartında E-posta alanı** (`cariler.ek.eposta`, WhatsApp gibi).
- **Sipariş kartında "E-posta" düğmesi** (`siparisEpostaGonder`): PDF üret → base64 → fonksiyon.
  Adres yoksa uyarı; PDF üretilemezse ya da fonksiyon reddederse PDF/HTML indirilir + `mailto:` ile
  posta programı açılır (dosya elle eklenir) — hiçbir durumda sessiz kalmıyor.

**v1.266.0 — kullanıcı "uygulama şifresi nedir?" diye sordu, ardından "maili PDF olarak WhatsApp'taki
gibi gönderelim" dedi.** E-posta düğmesi artık WhatsApp'la AYNI yol: telefonun paylaş menüsü PDF
ekli açılır, kullanıcı Gmail/Outlook'u seçer; alıcı adresi metne yazılı ve PANOYA kopyalanır ("Kime"ye
yapıştırır — paylaş menüsü alıcıyı kendiliğinden dolduramaz). **SMTP kurulumu GEREKMİYOR.** Tanımlar'daki
SMTP ayarları isteğe bağlı kaldı: doluysa önce fonksiyonla doğrudan gönderilir, olmazsa paylaşa düşer.
Bilgisayarda: PDF iner + mailto (alıcı/konu dolu).

**KULLANICININ YAPACAĞI:** yalnız cari kartlarına e-posta yazmak. (İsteğe bağlı: `eposta` fonksiyonu +
SMTP → doğrudan gönderim.) Gerçek gönderim CİHAZDA
denenecek (test ortamı esm.sh ve SMTP'ye ulaşamıyor; yedek yol ölçüldü: dosya indi, mailto açıldı).

### 9b. "SİPARİŞTEN SEÇ": ALIŞ FİŞİNE BAŞKA SİPARİŞTEN SATIR (13 Eylül, v1.275.0) — YAPILDI

**Durum:** Çekirdek (fisYaz kalem düzeyinde `siparis`, `siparisGerceklestir` çok siparişli teslim,
`fisGeriAl` hareketten `siparisId|kalemId`) kesilen turda yazılmıştı (9g ile aynı kaza); v1.275.0'da
iki ekran eklendi ve uçtan uca test edildi.

- **Sipariş kartı › Alış Fişi Oluştur:** "Kalem Ekle"nin yanında **"Siparişten seç (N açık alış
  siparişi)"** — aynı tedarikçinin diğer açık alış siparişleri, her biri matris (ürün+renk × beden,
  kalan) ve "Bu siparişin kalemlerini ekle". Eklenen kalemler bekleyenlere katılır (`ekKalemler`,
  `ekKalemSiparisi`), miktar kutuları kalanla dolu gelir, teslim satırı `siparisId` taşır. Fiş numarası
  ANA siparişin (`AS-2-F1`), her siparişin `karsilanan`/durumu kendi kaydında.
- **Cari › Alış Fişi (Depo yolu, StokFisiFormu):** aynı "Siparişten seç"; eklenen satır
  `kalemId` + `siparis` taşır (rozet: sipariş no). `stokFisiKaydet` bağlı kalemlerin `karsilanan`ını
  ve durumu günceller (`setSiparisler` + `tabloYaz`). Başka cariye ait siparişler listelenmez.
- Geri alma: cari ekstresinden fiş silinince iki siparişin karşılananı da geri düşüyor (mevcut
  `fisGeriAl`, hareketteki `siparisId|kalemId`).

**Doğrulama:** `senaryo-siparisten-sec.js` (yeni) — AS-1 (41×10) + AS-2 (42×5) aynı tedarikçi, AS-3
başka cari: kartta yalnız diğeri listelendi; tek fiş `AS-2-F1` iki kalem (41 hareketi AS-1'i
taşıyor); ikisi de Tamamlandı; fiş silinince ikisi de Bekliyor/0; Cari › Alış Fişi'nde iki sipariş
listelendi, AS-1 eklendi (rozet), kaydedilince AS-1 Tamamlandı, hareket AS-1.

#### (önceki plan metni)

**Kullanıcı:** *"Alış fişini siparişten tıklayarak oluşturuyoruz; tek satır ekleyebiliyor. Aynı alış
fişi için başka satır da ekleyebilmek için 'siparişten seç' gibi buton olsun, aynı carinin
eklenebilir alımlarını getirsin."* — hangi ekran: **ikisi de** (sipariş kartındaki Alış Fişi
Oluştur + Depo'dan açılan Cari › Alış Fişi).

**Neden hemen yapılmadı:** fiş bugün TEK siparişe bağlı: `siparisGerceklestir(siparisId, …)` fiş
numarasını `SAT-1002-F3` gibi siparişten üretiyor, kalemler `kalemId` ile o siparişe bağlanıyor,
`fisGeriAl` `karsilanan`ı o siparişte geri alıyor, kaynak izi `siparisNo` ile eşleşiyor. Birden çok
siparişi tek fişte karşılamak bu zincirin HER halkasını değiştiriyor — yazma kapısı + geri alma
kapısı + Fişler ekranı + kaynak izi + testler. Değişmez kural gereği geri alma tarafı da aynı turda
yazılmalı; uzun bir oturumun sonunda bu değişikliği başlatmak doğru olmazdı.

**Plan (bir sonraki tur):**
1. Fiş kalemine `siparisId` (kalem düzeyinde); `fisYaz` fiş genelinde tek sipariş varsaymayacak.
2. `siparisGerceklestir` → `siparisleriGerceklestir(teslimler[{siparisId, kalemId, miktar}])`: her
   siparişin `karsilanan`ı ve `teslimSayaci`sı kendi kaydında; fiş no, ANA (açılan) siparişten
   (`SAT-1002-F3`), diğer siparişler kalemde referans.
3. `fisGeriAl`: kalemdeki `siparisId`ye göre geri alma (bugün `fis.siparis` tek).
4. Sipariş kartı Alış Fişi Oluştur'da **"Siparişten seç"**: aynı carinin diğer AÇIK alış siparişlerinin
   kalanı olan kalemleri (matris) → fişe ekle. Depo'dan açılan Cari › Alış Fişi'nde aynı düğme:
   seçilen kalemler siparişe bağlı olarak yazılır (`karsilanan` artar) — bugün o fiş siparişsiz.
5. Kaynak izi ve Tedarik Girişleri kalem düzeyindeki `siparisId`yi de tanır.
6. Testler: iki siparişten tek fiş → iki `karsilanan`, geri alınca ikisi de döner; Fişler'de tek fiş.

### 9c. JSON YEDEĞİ TAM + DOSYADAN GERİ YÜKLEME (13 Eylül, v1.268.0)

**Kullanıcı:** *"JSON yedeğinin içeriği nedir? Veriler gittiğinde JSON ile geri gelir mi?"*

**Cevap kötüydü:** JSON Yedek İndir yalnız stok, sipariş, üretim, cari, tanımlar içeriyordu —
**muhasebe (kasa/banka/ÇEKLER), koliler ve çek görselleri YOKTU**; ve indirilen dosyayı geri
yükleyecek bir yol da yoktu (yalnız buluttaki günlük otomatik yedek tarihle geri yüklenebiliyordu; o
da görselsiz ve kolisiz). "Yedek tam ve kayıpsızdır" yazısı yanlıştı.

**Yapılan:**
- JSON yedeği **sürüm 3**: stok (görsellerle), sipariş, üretim, cari, tanımlar, **muhasebe, koliler,
  çek görselleri**, `uygulama` sürümü. Dosya büyük olabilir (görseller); burada 5 MB sınırı yok.
- **"JSON Yedeğinden Geri Yükle"** (Tanımlar > Genel > Veri Yedekleme): dosya seçilir, onay
  kutusunda yedeğin özeti (kaç ürün/cari/sipariş, muhasebe var mı, tarih), onayla **mevcut verinin
  tamamı** (bulut dahil) yedekle değiştirilir; geri yükleme öncesi hâl `yedek:geri-yukleme-oncesi`ne
  saklanır. Bulut yedeği ve dosya AYNI yoldan (`yedegiUygula`); otomatik bulut yedeğine koliler
  eklendi. Görselsiz yedekte mevcut görseller korunur (eski kural).
- Çek görselleri toplu yazılıyor (`cekGorselKaydet` bağımlılığa alınamaz — daha aşağıda tanımlı, TDZ).

> **ALTIN ÇIKTI DEĞİŞTİ, gerekçe:** `senaryo-gorsel-secici` sayfadaki bütün `input[type=file]`
> girdilerini listeliyor; "JSON Yedeğinden Geri Yükle" girdisi (accept: json) listeye eklendi.
> Ölçülen davranış (galeri/kamera girdileri) değişmedi.

**Doğrulama:** `senaryo-json-yedek.js` (yeni) — indirilen dosyada 8 bölüm, çek 1, koli 1, görseller
dahil; depo boşaltılıp dosya yüklenince stok 2, cari 3, çek 1, koli 1 geri geldi, öncesi saklandı.

### 9d. RENK KODLARI TEK HAVUZDAN (13 Eylül, v1.269.0)

**Kullanıcı:** *"Veritabanını sıfırladım, baştan başlamak için. Renk kodlarında çakışma var: hammadde
ve mamul rengi kodları çakışıyor."*

**Sebep — üç ayrı sayaç:** Tanımlar'da mamul rengi kodu BÜTÜN renklerin en büyüğünden, hammadde
rengi kodu yalnız HAMMADDE renklerinden türetiliyordu; ürün kartı/reçete üzerinden eklenen renk
(100-app `renkEkleVeyaBul`) ise tipe göre ayrı sayaçla ("birbirinin numarasını yemesin" diye —
tam tersi sonuç). Boş veritabanında mamul "Siyah" 101, ardından hammadde "Siyah" da 101.
`kod` etikette ve barkod eşleşmesinde tek anlam taşımalı.

**Yapılan:** üç yerde de aynı kural — sıradaki = bütün RENK kodlarının en büyüğü + 1, kombinasyon
(model rengi, 1001…) ve var olan renk kodları atlanır (`sonrakiRenkKodu`). Renk & Beden sekmesinin
üstünde **çakışma uyarısı** (hangi kod, hangi renkler) ve **"Düzelt"**: ilk kayıt kalır, sonrakilere
sıradaki kod (etiket bastıysa yeniden basması söyleniyor).

**Doğrulama:** `senaryo-renk-kodu.js` (yeni) — iki "Siyah" 101'de: uyarı var; Düzelt → Mamul 101,
Hammadde 102; yeni hammadde "Taba" → 103 (kombinasyon 1001 atlanıyor).

### 9e. YÖNETİCİSİZ LİSTE KİLİDİ (13 Eylül, v1.270.0)

**Kullanıcı:** *"Kullanıcı adıyla giriş yaptım, kısıtlı kullanıcı gibi girdim."* (Veritabanını
sıfırladıktan sonra.)

**Olan:** sıfırlama kullanıcı listesini boşaltıp girişi kapatıyor; giriş kapalıyken uygulama
"test-modu" Yönetici'siyle çalışıyor. Kullanıcı Tanımlar > Kullanıcılar'dan kendini ekledi — formun
rol varsayılanı **"Kullanıcı"** (yetkiler boş) — sonra girişi açtı ve kendi hesabıyla girdi: kısıtlı.
Kullanıcılar bölümü yalnız Yönetici'ye göründüğü ve kısıtlı kullanıcı Tanımlar modülünü bile
göremediği için **hiçbir ekrandan düzeltemezdi** — kilit kalıcıydı.

**Üç kilit:**
1. `kullaniciEkle`: listede Yönetici yoksa eklenen kişi **Yönetici** olur (uyarıyla).
2. Girişi "Aktif" yapmak: listede Yönetici yoksa **reddedilir**.
3. App etkisi: giriş açık, giren kişi Yönetici değil ve listede HİÇ Yönetici yoksa giren kişi
   **Yönetici yapılır** (günlüğe yazılır, uyarı). Yönetici varsa dokunulmaz — yetki devri yöneticinin işi.
   (Tanımlar'a "Bu hesabı Yönetici yap" kutusu da kondu ama kısıtlı kullanıcı oraya ulaşamadığı için
   asıl çıkış App etkisi.)

> `girisSistemiAktif` bileşenin aşağısında tanımlı bir `const` — etki içinde okunursa TDZ çöker (2.
> denetim görmüyor, bkz. "açık kalanlar"). `tanimlar.girisAktifMi` doğrudan okunuyor.

**Doğrulama:** `senaryo-yoneticisiz.js` (yeni) — tek "Kullanıcı" rollü hesapla giriş → rol Yönetici
oldu, Tanımlar menüde; boş listede giriş "Aktif" reddedildi; "Kullanıcı" rolüyle eklenen ilk hesap Yönetici.

### 9f. PLANLAMA ÇİPİNDE ALIŞ FİŞİ NO (13 Eylül, v1.271.0)

**Kullanıcı (ekran görüntüsüyle):** *"'Satın alındı' — satın almada alış siparişi VE alış fişi olması
gerekir."* Çip yalnız alış siparişi numarasını yazıyordu.

`PlanlamaBolumu` (335): satın alma planı gerçekleştiyse ilgili alış fişleri stok hareketlerinden
(kaynak Satınalma, `siparisNo` = alış no, aynı ürün/renk/beden) bulunup çipe ekleniyor:
**"Satın Alındı (10): ALS-1002 · ALS-1002-F1"**; fiş numarasına tıklayınca Fişler'de o fiş
(`onFiseGitNo` — PlanlamaBolumu ve PlanlamaSatiri'ye prop). Sipariş kısmı eskisi gibi alış siparişine.

**v1.272.0 — kullanıcı:** *"Tedarikte tedarik edilen cari adı da yazsın, tedarik sekmesi
detaylandırılsın, satın alma için ikon olsun; tedarik planlamadan fiş yazdırıp WhatsApp'tan veya mail
olarak tedarikçiye gönderme olsun — daha önce benzerini yaptık, aynı mantık."*
- Çipte kaynak ikonu (paket = satın alma, çekiç = üretim) ve **tedarikçi adı**: "Satın Alındı (10):
  ALS-1002 — Fatih Ticaret · ALS-1002-F1".
- Matrisin altında **detay satırları** (`data-tedarik-detay-satir`), referans başına: kaynak, sipariş/
  üretim no (tıklanır), tedarikçi, durum, adet, alış fişleri (tıklanır) ve alış siparişi için
  **PDF / WhatsApp / E-posta** — sipariş kartındaki düğmelerin AYNI fonksiyonları (`siparisPdfIndir`,
  `siparisWhatsappGonder`, `siparisEpostaGonder`), bağlı ALIŞ siparişi ve TEDARİKÇİ kartıyla.
  `PlanlamaBolumu`/`PlanlamaSatiri`ne `firmaBilgileri`, `showToast` propları.

**Doğrulama:** `senaryo-tedarik-girisleri` — tam ekran kartta Tedarik Planlama sekmesi: çip
`Satın Alındı (5): AS-77 — Tedarikçi A · AF-…`; detay satırı "Satın alma AS-77 Tedarikçi A Tamamlandı ·
5 çift fiş AF-…" + üç düğme; PDF düğmesi dosya indiriyor. (Planlama bölümü yalnız tam ekran kartta; senaryo tam ekranı açıp
küçültüyor.)

### 9g. RENK YAPISI: ÜÇLÜ → İKİLİ, TEK RENK HAVUZU (13 Eylül, v1.273.0–v1.274.0) — YAPILDI

> **DÜRÜST NOT:** Bu göç, kullanıcı "kontrol edip tartışalım" dediği turda YARIM yazılmış ve o
> tur kesildiği için belgelenmeden pakette (v1.273.0) kalmış; bir sonraki turda fark edildi ve
> tamamlandı (v1.274.0). Kullanıcıya söylendi. Aşağıdaki "tartışma" metni önceki durumu anlatır;
> uygulama artık ikili yapıda.

**Yapılan:**
- Açılışta **renk göçü** (100-app): bütün renkler tip `"Hammadde"` (= stok rengi); aynı adlı
  Mamul+Hammadde çifti tek kayda iner, silinen kaydın kimliği kombinasyonlarda kalan kayda
  çevrilir; `console.info("Renk göçü …")`; göç olduysa Tanımlar buluta yazılır. İdempotent.
- Tanımlar "Mamul Renkleri" bölümü kalktı (`{false && …}`), model rengi bütün stok renklerinden
  kurulur; ürün kartı / Ürün Ekle / sipariş formu renk listeleri tek havuz (tip filtresi yok,
  kombinasyon etiketleri hariç).
- v1.274.0: sipariş formundaki son `tip === "Mamul"` süzgeci kaldırıldı; göç olan açılışta
  `ozelKodEtiketleri`nin düşmesine yol açan `else if` ayrıldı; `senaryo-renk-kodu` tek havuza göre
  (aynı adlı çift artık birleştiği için farklı adlı iki renk aynı kodda).

**Bilinen açık:** `addMamulRenk` (130-tanimlar) ölü kod; `onYeniRenkKaydet(ad, "Mamul")` çağrıları
hâlâ tip "Mamul" yazıyor (bir sonraki açılışta göç düzeltir; doğrudan "Hammadde" yazılmalı).

#### (önceki tartışma metni)

**Kullanıcı:** *"Hammadde rengi, mamul rengi ve model rengi var; üçlü yapı karmaşık. Mantık şu:
hammadde renklerinden mamul rengi oluşuyor; mamul rengi = üründe hangi stok renkleri kullanılıyor.
Siyah deri + kahve deri + siyah taban kombinasyonu yalnız hammaddeden renk çekiyor; mamul rengi boşa
çıkmış oluyor. Kontrol edip tartışalım."*

**Kod ne diyor (grep):** `tip: "Mamul"` renkler şu yerlerde kullanılıyor: ürün kartı mamul varyant
rengi seçimi (152-stok, 160-urunkarti — "Mamul listesinden seçin"), sipariş formunda yeni renk
(325-siparis:662-676), reçete `mamulRenk` eşleşmesi, Tanımlar "Mamul Renkleri" bölümü. Model
rengi (kombinasyon) ise mamul varyantına etiket olarak giriyor ("1001 - KAHVE SÜET/Bej") ve
barkodda renk kodu (8q). Yani mamulün rengi iki ayrı kaynaktan gelebiliyor: düz "Mamul rengi"
(Siyah) ya da kombinasyon etiketi — karmaşanın sebebi bu ikilik.

**Değerlendirme:** kullanıcı haklı. Tek kaynak: **Hammadde rengi** (stok rengi) + **Model rengi**
(hammadde renklerinin kombinasyonu, tek renkli model dahil — "Siyah" modeli = yalnız siyah
hammaddeden oluşan kombinasyon). "Mamul rengi" listesi kalkar.

**Plan (ayrı tur, kullanıcı onayıyla):**
1. Göç: her `tip:"Mamul"` renk → aynı adlı hammadde rengi (yoksa oluştur) + tek elemanlı kombinasyon;
   mamul varyantlarındaki düz renk adı kombinasyon etiketine çevrilir; reçete `mamulRenk` aynı.
2. Ürün kartı / sipariş formu: mamul rengi yalnız model rengi (kombinasyon) listesinden; "yeni
   renk" → kombinasyon kurucu (hammadde renklerini seç).
3. Tanımlar: "Mamul Renkleri" bölümü kalkar; "Model Renkleri" hammadde renklerinden kurulur.
4. Barkod: kombinasyon kodu zaten renk kodu (8q); göçte kod çakışması denetimi.
5. Raporlar/etiketler: etiket metni kombinasyon etiketi (kod - ad/ad) — etiketlerde uzun olabilir;
   "kısa ad" alanı (ör. "Siyah") kombinasyona eklenebilir.
Riskler: mevcut veri göçü (kullanıcı sıfırladı, veri az — iyi zaman), reçete eşleşmesi, sipariş
girişindeki serbest renk yazımı.

### 9h. PAYLAŞ ŞERİDİ + "ALIŞ SİPARİŞİ / ALIŞ FİŞİ" DİLİ (13 Eylül, v1.273.0)

**Kullanıcı:** *"Satın almaya alış siparişi ve alış fişi diyoruz, söylemiştim. Satış fişinde de mail
ve WhatsApp gönderimi ekle. Mail ve WhatsApp gönderimini ekstre olarak aldığımız her yerde sık sık
kullanacağız — buna bir ad verelim."*

> ### PAYLAŞ ŞERİDİ — belge paylaşımının ADI
> `PaylasSeridi` (075-fis-ortak): **PDF · WhatsApp · E-posta** üç düğme, tek davranış
> (`belgeyiPaylas`): PDF html2canvas+jsPDF; WhatsApp/E-posta telefonda paylaş menüsü PDF ekli,
> bilgisayarda PDF iner + wa.me / mailto; alıcı cari kartından. Belge ya `govdeHTML` (sipariş
> çıktısı gibi üretilen) ya `govdeSecici` (ekrandaki `.yazdir-alani` gibi — tıklandığı anda DOM'dan).
> **Bundan sonra bir belgeye paylaşım eklemek = `<PaylasSeridi …/>` koymak; ayrı düğme yazılmaz.**
> Bugün: sipariş kartı başlığı, tedarik detayı (alış siparişi), fiş penceresi (Yazdır'ın yanı),
> cari ekstre (eski "WhatsApp'ta Paylaş / E-posta ile Gönder" — yalnız metin özeti — kaldırıldı).
> Fiş geçmişindeki düğme "Yazdır / Paylaş" oldu: pencere açılır, şerit orada.

**Dil (kullanıcı ikinci kez söyledi, bir daha "satın alma" yazılmasın):** planlama tipi ekranda
**Alış Siparişi**, gerçekleşince **Alış Fişi Kesildi**; bekleyen **Alış Siparişinde**; rapor
aşamaları "Alış siparişinde (yolda)" / "Alış fişi kesildi"; tedarik girişleri kaynağı "Alış Fişi";
fiş geçmişi ikon açıklaması "alış fişinden". Veri değeri (`planlama.tip: "Satınalma"`, `kaynak:
"Satınalma"`) DEĞİŞMEDİ — yalnız görünen metin.

> **ALTIN ÇIKTI DEĞİŞTİ, gerekçe:** `senaryo-hazir-urunler` kaynak sütunu "Satın alındı" → "Alış fişi"
> (dil değişikliği; davranış aynı).

**Doğrulama:** senaryo-tedarik-girisleri seçicileri şeride geçti (`data-paylas-seridi`,
`data-paylas-pdf/whatsapp/eposta`); çip `Alış Fişi Kesildi (5): AS-77 — Tedarikçi A · AF-…`; detay
satırında şerit; birim-rapor aşama adları güncellendi.

## 10. TEMİZLİK DENETİMİ (14 Eylül, v1.276.0)

**Kullanıcı:** *"Uygulamanın üzerinden geçelim: ölü kod, bağlantısız modüller veya mantıksız
modüller. Çakışan yerler var mı kontrol edelim."*

**Araçlar (kök dizinde, `yap.sh`ye BAĞLI DEĞİL — iki bilinen yanlış pozitif var):**
- `olukoddenetim.js`: üst düzey `function`/`const` bildirimleri; kaynak genelinde adı bir daha
  geçmeyenler. Sonuç: 6 ölü tanım bulundu, silindi.
- `propdenetim.js`: bileşen imzasında olup gövdede kullanılmayan proplar; JSX'te geçirilip imzada
  olmayan proplar. Yanlış pozitifler: `NavItem: size` (ikon JSX'indeki `size={16}`),
  `UretimSiparisKarti: order` (`order: o` takma adı), `PlanlamaBolumu: onAsortiOlustur` (iç içe JSX).

**Silinen ölü kod:** `OZEL_KOD_KAPSAM` (008), `supabaseOturumVarMi` (030), `fiseAitCariHareketiMi`
(075 — fişdenetim 12. kural buna bakıyordu; kural artık gerçek tek yere, `uretimFisAdlari`na
(079) bakıyor), `ACILIS_FIS_ON_EKI` (076), `cekCiroluHal` (200), `SIPARIS_DURUMLARI` (320),
`cekDurumGuncelle` (205), `addMamulRenk` + `yeniRenkMamul` + gizli `{false && <Bolum "Mamul
Renkleri">}` bloğu (130), Cari'de ölü silme zinciri (`removeHareket` → `onRemoveHareket` CariCard'da
hiç okunmuyordu; `onRemoveHareketGlobal` CariModule'den ve App çağrısından kaldırıldı — StokModule'deki
aynı adlı prop CANLI, dokunulmadı).

**Prop uyumsuzlukları (geçiriliyor ama alınmıyor → sessiz işlevsizlik):**
- **`EmptyState mesaj=` ↔ imza `text`** — ürün kartı (renk/beden yok), Mamul Depo, Paketleme'de kutu
  BOŞ çıkıyordu (kullanıcının 13 Eylül Paketleme ekran görüntüsündeki boş kesik çizgili kutu bu).
  Bileşen ikisini de kabul ediyor.
- `AsortiOlusturucu showToast`, `CariEkstre bakiye`, `HesapListesi tur`, `PlanlamaSatiri
  onAsortiOlustur`, `MamulDeposu onGoToSiparis`, `SonIslemlerPaneli uretim`: geçirilen fazla proplar
  kaldırıldı (hiçbiri işlev taşımıyordu).

**Bağlantı / mantık denetimi (değişiklik yapılmadı, bilgi):**
- Yetki anahtarları (`MODULLER`: tanimlar, stok, uretim, siparis, cari, fisler, muhasebe) ile menü
  eşlemesi: Depo ve Paketleme → "stok" yetkisi; Alış Siparişi → "siparis"; Anasayfa, Günlük ve
  **Planlama yetkisiz** (herkese açık). Planlama maliyet göstermiyor, kabul edilebilir; ayrı yetki
  istenirse `MODULLER`e "planlama" eklenir.
- Sipariş durum listesi üç yerde elle yazılı (325 süzgeç rozetleri, 330 özet, 340 kart); `SIPARIS_
  DURUMLARI` sabiti kullanılmadığı için silindi — birleştirmek istenirse önce sabit yeniden yazılır.
- Renk: `renkEkleVeyaBul` artık her zaman `tip: "Hammadde"` yazıyor (tek havuz); çağıranlardaki
  "Mamul" argümanı etkisiz, zararsız.
- Fiş kalemi sipariş bağı (9b) ile `fis.siparis` (fiş düzeyi) BİRLİKTE yaşıyor: kalemde varsa kalem
  kazanır (`kSip = k.siparis || fis.siparis`). Çakışma değil, öncelik kuralı.

**Doğrulama:** tam koşu — 55 senaryo AYNI, 21 birim testi temiz (14 Eylül, v1.276.0).

## 11. GÖREVLER MODÜLÜ (14 Eylül, v1.277.0)

**Kullanıcı:** *"Uygulama içi mesajlaşma yapalım; kullanıcılara görev tanımlama, yazışma, kontrol
gibi detaylı mesajlaşma modülü."* Sorulunca: **hepsi** (ekip sohbeti, kişiden kişiye, kayda bağlı
yorum, görev listesi); **önce görev (atama + durum)**.

**BU TUR: görev listesi.** Sohbet, kişiden kişiye mesaj ve kayda bağlı yorum SONRAKİ turda; kayıt
biçimi ikisine de hazır (`hedef: {tip,id,etiket}` = göreve bağlı kayıt, `yorumlar[]` = yazışma).

**Kayıt (370-gorevler.jsx):** tekil tablo `gorevler` (koliler kalıbı; `gorev:data` yerel yedek).
`{ id, baslik, aciklama, atananId, atayanId, durum, oncelik, bitisTarihi, olusturma, guncelleme,
tamamlanma, hedef, yorumlar[] }`.

**Durum akışı:** Yapılacak → Yapılıyor → **Kontrolde** → Tamamlandı (her aşamadan İptal).
**Kontrol kuralı (kullanıcının istediği "kontrol"):** işi yapan kendi görevini Tamamlandı'ya ALAMAZ
— Kontrole gönderir; Tamamlandı'ya yalnız **görevi veren ya da Yönetici** alır. Aksi halde kontrol
adımı süs olurdu.

**Ekran:** süzgeçler (Bana verilen / Benim verdiğim / Açık / Kapanmış, sayaçlı), arama, Acil rozeti,
gecikmiş görevde kırmızı çerçeve + "gecikti" damgası, sıralama (acil → bitiş tarihi → yenilik).
Kart açılınca açıklama, durum düğmeleri, silme (veren ya da Yönetici) ve **yazışma**: notlar ve
durum değişimleri AYNI akışta (durum değişimi sistem satırı olarak düşüyor — "kim ne zaman ne
yaptı" ayrı bir kayıt gerektirmiyor).

**Menü:** herkese açık (herkesin kendi görevi var), sol menüde rozet = kişinin AÇIK görev sayısı.
`NavItem`e `rozet` ve `title`/`data-nav` eklendi (menü daraldığında düğmenin adı görünmüyordu).
JSON yedeği ve geri yükleme görevleri kapsıyor.

**KULLANICININ YAPACAĞI:** `gorevler.sql` (Supabase > SQL Editor). Çalıştırılmazsa görevler yerelde
kalır, "Buluta yazılamadı: gorevler" uyarısı çıkar, ikinci cihazda görünmez.

### v1.278.0 — SOHBET, GÖREV SOHBETİN PARÇASI

**Kullanıcı:** *"Görevler seçmeli olabilir — örnek: siparişi seçip veya üretimi seçip not
eklenebilir. Sohbet de olsun, kullanıcıyla aynı bu ekrandan devam etsin. Sohbete görev ekleme gibi
hepsi sohbetin parçası olsun."*

- **`KayitSecici`** (370-gorevler): tip (Sipariş / Üretim / Ürün) + arama → `{tip,id,etiket}`.
  Görev formunda ve sohbet yazma alanında AYNI bileşen; seçilen kayıt rozet olur, tıklanınca o
  kayda gidilir.
- **`SohbetModule`** (372-sohbet): sol kanal listesi — **Ekip** (herkes) ve her kullanıcı için
  **kişisel** kanal (`k1|k2`, kimlikler sıralı; kim yazarsa yazsın aynı kanal). Akışta mesajlar,
  okunmamış sayacı, en alta kaydırma.
- **Sohbetten görev:** "Görev olarak ver" açıkken mesaj hem göreve hem akışa düşüyor; akışta
  **görev kartı** (durum, atanan, bitiş, "Görevi aç") ve kart üstünde durum düğmeleri — kontrol
  kuralı burada da geçerli (Tamamlandı'yı yalnız veren/Yönetici). Kişisel kanalda atanan varsayılan
  olarak karşı taraf; ekip kanalında kişi seçilmezse uyarı (sahipsiz görev = kimsenin yapmadığı görev).
- **Tek ekran:** menüde artık **Sohbet**; içinde iki sekme — Sohbet (varsayılan) ve Görevler
  (liste/süzgeç/kontrol, eski modül). Menü rozeti = açık görev + okunmamış mesaj.
- **Kayıt:** `mesajlar` tekil tablosu (`mesaj:data` yerel yedek); okuma damgası (`mesaj:okuma`)
  YALNIZ YEREL — kimin neyi okuduğu kişiseldir, buluta yazmak başkasının sayacını bozardı
  (`katman-muaf` etiketiyle geçildi).
- **Yakalanan hata:** sekmeler `display:none` ile duruyor, yani Sohbet gizliyken de monte. Okuma
  damgası ilk render'da atılıyor ve uygulama açılır açılmaz "ekip" okundu sayılıyordu; `aktifMi`
  propu eklendi (senaryoda rozet 2 çıkıp 3 olması gerektiği fark edildi).

**KULLANICININ YAPACAĞI:** `gorevler.sql` (içinde `gorevler` + `mesajlar`) — çalıştırılmazsa iki
liste de yalnız yerelde kalır.

**Doğrulama:** `senaryo-sohbet.js` (yeni; iki oturum) — ekip mesajı; kişisel kanalda sipariş bağlı
görev mesajı (akışta hedef bağlantısı + görev kartı "Yapılacak", kayıtta hedef tipi `siparis`,
bitiş tarihi); Ali'de menü rozeti 3, kanalda okunmamış 1; Ali Tamamlandı'ya alamıyor, Yapılıyor'a
alıyor ve görev akışına sistem satırı düşüyor.

**Doğrulama:** `senaryo-gorevler.js` (yeni; üç ayrı tarayıcı oturumu = üç cihaz) — Yönetici görev
verir; Ali'de rozet 2, listede gecikmiş görev işaretli; Ali Tamamlandı'ya alamıyor (uyarı, durum
değişmiyor), Kontrole gönderiyor, yorum yazıyor; akışta sistem satırı + yorum; Yönetici Tamamlandı'ya
alıyor, tamamlanma damgası düşüyor, görev "Kapanmış" süzgecine geçiyor.

## 12. SÜRÜM DUYURUSU (14 Eylül, v1.279.0)

**Kullanıcı:** *"Her defasında ayrı HTML geliyor, bunu kullanıcılara tek tek atmak zorundayız. Son
uygulamada güncel versiyon eklense, içine giren günceli indirse? Tek tek uygulama atmayalım."*

**Çözüm:** yayınlanan sürüm bilgisi buluttaki `surum` tablosunda (tek satır):
`{ surum, url, not, zaman }`. Her uygulama **açılışta ve 30 dakikada bir** okuyup KENDİ `SURUM`
sabitiyle karşılaştırıyor; yenisi varsa ekranın üstünde yeşil şerit: **"Yeni sürüm v… · İndir"**.
Kapatılırsa o oturumda çıkmaz.

- **Yayınlama:** Tanımlar > Genel > **"Sürüm yayınla"** (yalnız Yönetici): sürüm no, indirme
  bağlantısı, not. Dosya nereye yüklendiği fark etmez (Supabase Storage, Drive, şirket sitesi) —
  uygulama yalnız bağlantıyı taşıyor.
- **Karşılaştırma** `surumDahaYeniMi`: sayı sayı. Metin karşılaştırması "1.9" ile "1.10"u ters
  sıralardı; ikinci hane 10'u geçtiğinde kesin hata olurdu (birim testte var).
- Okuma **anahtarla**, giriş gerekmiyor: sürüm bilgisi gizli değil ve giriş ekranından önce de
  görünmeli (eski sürümle girilemeyen bir durumda güncelleme yolunu göstermek gerekir).
- Tablo yoksa ya da ağ yoksa sessiz: şerit çıkmaz, uygulama etkilenmez.

**Yakalanan hata:** şerit ilk olarak modül başlığının yanına kondu; o blok `tab !== "anasayfa"`
şartıyla çiziliyor, yani **anasayfada görünmüyordu** — güncellemeyi en çok orada duran kişi
görmeli. Şerit içerik alanının en üstüne alındı (senaryoda yakalandı).

**KULLANICININ YAPACAĞI:**
1. `gorevler.sql`i (içinde `gorevler`, `mesajlar`, `surum`) Supabase'de çalıştır.
2. Yeni HTML'i paylaşılan bir yere yükle (Supabase > Storage > bucket "public" önerilir; dosyanın
   herkese açık URL'sini kopyala).
3. Tanımlar > Genel > Sürüm yayınla: sürüm no + URL → Yayınla. Bundan sonra dosya göndermek yok.

### v1.280.0 — STORAGE'DAN ÇALIŞTIRMA (kullanıcı: "bu çok mantıklı")

**`baslat.html`** (kök dizinde, uygulamadan bağımsız ~2 KB): herkese verilen SABİT adres. Açılınca
`surum` kaydını okuyup yayınlanan sürümün dosyasına `location.replace` ile gidiyor. Supabase URL ve
anon anahtar dosyanın içinde (uygulamadakiyle aynı); bir kez yüklenir, bir daha değişmez.

**Neden her sürüm AYRI DOSYA (`atolye-erp-v1.280.0.html`):** aynı dosyanın üstüne yazmak tarayıcı
önbelleği yüzünden güvenilmez — kullanıcı günlerce eski sürümü görebilir. Adres değişince tarayıcı
yeni dosyayı indirmek zorunda. Başlatıcı bu yüzden var.

**`storage-kurulum.md`** (yeni): bucket açma (public), `baslat.html` yükleme, adresi paylaşma,
telefonda ana ekrana ekleme, her sürümde iki adım (yükle → Tanımlar'dan yayınla), geri dönüş (eski
sürümün URL'sini yayınla), çevrimdışı uyarısı ve "dosya herkese açık, güvenlik veritabanı
tarafında — `rls-kimlik.sql` daha da önemli" notu.

**Şeritteki düğme:** uygulama http(s) üzerinden (Storage'dan) çalışıyorsa **"Güncelle"** ve AYNI
sekmede açılıyor; `file://` ile açıldıysa eskisi gibi **"İndir"** (yeni sekme).

#### v1.281.0 — "Sürüm bilgisi alınamadı (HTTP 401)"

**Kullanıcı ekran görüntüsü:** başlatıcı `surum` TABLOSUNA gidiyor; tablo kurulmamış ya da yetkisi
kapalıysa 401 geliyor ve başlatıcı hiçbir şey yapamıyor. (Ekran görüntüsünde adres
`content://…downloads` — dosya telefona indirilip açılmış; o durumda ağ istekleri de engellenebiliyor.)

**Düzeltme — İKİ KAYNAK:** başlatıcı önce **aynı klasördeki `surum.json`**u okuyor (Storage'dan
düz dosya; veritabanına hiç bağlanmıyor, yetki sorunu yok), bulamazsa `surum` tablosuna düşüyor.
Hata ekranı artık sebebi söylüyor: 401/403 → "surum.json koyun", 404 → "`surum` tablosu yok
(gorevler.sql çalıştırılmamış)". `surum.json` örneği pakette; rehbere "Sorun: HTTP 401" bölümü ve
"başlatıcıyı indirip açmayın, Storage adresinden açın" uyarısı eklendi.

**Yayınlama artık iki yerden:** `surum.json`u güncelleyip yeniden yüklemek (yeni açanlar için) ve/veya
Tanımlar > Sürüm yayınla (uygulamanın içinde duranların şeridi için). İkisini birlikte yapmak en temizi.

**Doğrulama:** `senaryo-surum-duyuru` — (a) DB yolu: sahte `surum` kaydındaki adrese yönlendi;
(b) JSON yolu: yerel http sunucusunda `baslat.html` + `surum.json` → JSON'daki adrese yönlendi;
(c) JSON 404 + tablo 401 → ekranda sebep ve `surum.json` ipucu. Şerit düğmesi `file://` altında "İndir".

**Doğrulama:** `birim-surum.js` (yeni, 7 iddia) — sürüm karşılaştırma, "1.10 > 1.9" dahil.
`senaryo-surum-duyuru.js` (yeni) — yeni sürüm yayındayken şerit + İndir bağlantısı, kapatınca
kayboluyor; eski/aynı sürümde ve kayıt yokken şerit yok; Tanımlar'dan yayınlama buluta yazıyor ve
şerit hemen çıkıyor.

## 13. BEDEN / BOYUT ADI DÜZENLEME (14 Eylül, v1.282.0)

**Kullanıcı:** *"Tanımlarda beden adı düzenleme olsun."*

Renk adı düzenleme zaten vardı (`TanimListesi`nin `onAdDegistir`i); beden/boyut listelerinde
bağlanmamıştı. Bağlandı ve **kayıt hizalama** yazıldı (`olcuAdDegistir`, 100-app): ad değişince
ADLA eşleşen bütün kayıtlar yeni ada çevriliyor —
- ürün **varyantları**, **reçete** satırları (`beden` ve `mamulBeden`), **stok hareketleri**,
- **sipariş kalemleri**, **üretim** beden dağılımı ve proses atamalarındaki `bedenMiktarlari`
  anahtarları, **koli** kalemleri, **asorti** oranları.

Eşleştirme büyük/küçük harf ve boşluk farkını yok sayıyor (renk adındaki kuralın aynısı): geçmişte
yarım kalmış bir yeniden adlandırma varsa bu işlem onu da hizalıyor. Aynı tipte aynı ad varsa
reddediliyor. Günlüğe yazılıyor, ekranda "41 → 41 numara · kayıtlar hizalandı".

> Neden şart: hizalama olmasaydı tanımda "41 numara", stokta "41" kalırdı — üretim malzemeyi
> bulamaz, matris iki ayrı sütun gösterirdi.

**Doğrulama:** `senaryo-beden-adi.js` (yeni) — "41" → "41 numara": tanım, asorti, varyant, reçete,
stok hareketi, sipariş kalemi, üretim beden dağılımı, proses atama anahtarı ve koli kaleminin
hepsi yeni adla.

## 14. BEDEN GRUPLARI (14 Eylül, v1.283.0)

**Kullanıcı:** *"Beden grupları oluşturalım. Örnek: beden için kullanıcı 36-40 seçtiğinde 36'dan
40'a kadar olan numaraları seçmiş olsun — 36,37,38,39,40 gibi."*

- **Tanımlar > Renk & Beden > Beden Grubu:** grup adı (boş bırakılırsa "36-40" kendiliğinden) +
  **baştan / sona** seçimi. Aradaki bedenler tanımlı beden sırasından (`bedenSirala`) alınıyor, tek
  tek işaretlemek gerekmiyor. Grup kaydı beden ADLARINI tutuyor (`tanimlar.bedenGruplari`).
- **Ürün kartı > Beden Ekle:** tanımlı grupların düğmeleri; dokununca üründe OLMAYAN bedenler
  eklenir ("36-40: 4 beden eklendi" / "hepsi zaten var"). İpucunda grubun bedenleri yazılı.
- **Beden adı değişince gruplar da hizalanıyor** (13. bölüm `olcuAdDegistir`e eklendi).

**Yakalanan hata:** grup düğmesi önce her beden için ayrı `onAddBeden` çağırıyordu; art arda
çağrılar aynı state üzerine yazdığı için yalnız SONUNCUSU kalıyordu (senaryoda 5 beden yerine 2).
`addBedenToProduct` artık dizi de alıyor ve **tek yazma** yapıyor (`bedeniUrunEkle` saf yardımcı).

#### v1.285.0 — YENİ ÜRÜN formunda da grup

**Kullanıcı:** *"Oluşturduğumuz beden grubunu stok kartından seçtirelim, o bedenleri stoğa eklesin."*

v1.283.0'da grup düğmeleri VAR OLAN ürünün kartındaki "Beden Ekle" içindeydi; asıl ihtiyaç ürün
KURULURKEN. Stok > Ürün Ekle formunda beden rozetlerinin başına grup düğmeleri kondu (kesik
çizgili, mor): dokununca grubun bu ürüne uygun bedenleri işaretleniyor, ikinci dokunuş kaldırıyor.
Ürün o bedenlerle kuruluyor. Yalnız ölçü tipi "Beden" iken görünür (boyutta grup kavramı yok).

**Doğrulama:** `senaryo-beden-grubu.js` — 36→40 aralığından grup `36,37,38,39,40`; ürün kartındaki
"36-40" düğmesi sonrası üründe beş beden; YENİ ÜRÜN formunda grup düğmesi beş bedeni işaretledi ve
kaydedilen ürünün varyantları `36,37,38,39,40`; "38" → "38N" değişince grup `36,37,38N,39,40`.

## 15. FİŞTE FİYAT + TANIMSIZ ÖLÇÜLER (14 Eylül, v1.284.0)

Kullanıcı iki ekran görüntüsüyle üç şey bildirdi.

### 15a. Alış fişinde fiyat ve para birimi

*"Alış fişi girişinde fiyat ve p.birimi de olsun ve değiştirilebilir olsun."*

Fiş panelindeki matrise **Birim Fiyat** ve **P.B.** sütunları eklendi (ürün+renk grubunda ortak;
aynı model/renk için tek fiyat konuşulur). Boş bırakılırsa siparişteki fiyat kullanılıyor (ipucunda
yazılı). Girilen fiyat FİŞE yazılıyor, **sipariş kaydının fiyatı değişmiyor** — sipariş ne
konuşulduğunu, fiş ne olduğunu gösterir; gerçekleşen alış farkı "son alış fiyatları"nda (8s) zaten
görünüyor.

### 15b. "3840" gibi tanımsız ölçüler — Tanımlar'da düzenlenebilir

*"Beden adı değişen kayıt var, beden adı değişikliği orada düzenlenmesi gerekiyordu. Bedeni id'den
alması lazım, yanlışlık var gibi."*

Teşhis: ölçü kayıtlarda **ADLA** tutuluyor (kimlikle değil) — bu bilinçli, çünkü aynı ad farklı
ürünlerde farklı kimliklerle serbest yazılabiliyor. Sorun, kayıtlarda geçen ama TANIMDA olmayan bir
ad ("3840" — geçmişte serbest giriş sırasında birleşmiş): tanım listesinde görünmediği için 13.
bölümdeki yeniden adlandırma ona ulaşamıyordu.

**Tanımlar > Renk & Beden > "Tanımsız Ölçüler (N)"**: kayıtlarda geçip tanımda olmayan adlar, kaç
kayıtta geçtiğiyle. İki düğme: **Tanıma ekle** (sonra normal yoldan adı düzenlenir) ve **şuna çevir**
(tanımlı bir ölçüyle birleştirir; onay ister). Birleştirme `tanimsizOlcuCevir` ile bütün kayıtları
hizalıyor (ürün, reçete, stok hareketi, sipariş, üretim + proses atamaları, koli).

### 15c. "Ayrı ayrı fiş oluşturdum, tek fişe attı"

İncelendi, **kod doğru çalışıyor**: fiş numarası `SAT-1001-F{teslimSayaci+1}` ile üretiliyor, sayaç
siparişte saklanıyor ve fiş geri alınınca sıfırlanmıyor. Tek fişte iki ürün görünmesinin sebebi, o
iki satırın AYNI "İşlemi Kaydet" işleminde gönderilmiş olması: panelde birden çok ürün/renk satırı
varsa hepsi tek fişe düşer (tasarım gereği; bir sevkiyat = bir fiş). Ayrı fiş isteniyorsa ayrı ayrı
kaydedilmeli. Kullanıcıya soruldu; aksini gösteren bir adım gelirse burada araştırılacak.

**Doğrulama:** `senaryo-siparisten-sec` — fişte fiyat kutusu var, 17,5 girilince cari hareketleri
17,5 ile yazıldı, siparişteki 15 değişmedi. `senaryo-beden-adi` — "3840" tanımsız listesinde
göründü, "41 numara" ile birleştirilince varyantlar hizalandı ve liste boşaldı.

## 16. SAHA MODU — KALDIRILDI (15 Eylül, v1.292.0)

> **KARAR (kullanıcı, 15 Eylül):** *"Saha ile mobil farklı mı? İkisinin de aynı olması lazım, mantık
> bu şekilde söylemiştim. Hiç kod yazma; sadece masaüstü görünümden kısıtlayarak mobili yapalım.
> Ekranları kapatıp yerlerini değiştirip mobil olsun. Pratik olan bir şeyi masaüstünde de
> kullanabiliriz. Mantık tek tip."*
>
> **Saha Modu tamamen kaldırıldı** (`380-saha.jsx`, `senaryo-saha.js`, menü/alt çubuk girişleri,
> `sahaSiparisKaydet`/`sahaTahsilat`, `localStorage saha:modu`). Tek yol: **Tanımlar > Mobil
> Görünüm** ile normal ekranların kısıtlanması (17. bölüm). Ayrı bir mobil uygulama sürdürmek, her
> yeni özellikte "sahada da olsun mu" sorusunu doğuruyordu; üç turda üç kez yaşandı.
>
> **Kaybedilen:** sahaya özel büyük dokunmatik kutular ve üç düğmelik menü. **Kazanılan:** tek ekran
> kümesi, tek veri yolu, bakımın yarıya inmesi. Mobilde bir ekran pratik değilse çözüm o ekranı
> düzeltmek — o zaman masaüstünde de daha iyi olur.
>
> Aşağıdaki bölüm tarihsel kayıt olarak duruyor (ne yapıldığı ve neden kaldırıldığı).

### (kaldırıldı) SAHA MODU — MOBİL (14 Eylül, v1.286.0)

**Kullanıcı:** *"Mobil için basitleştirilmiş halde dizayn yapalım; şu anda mobilde çok karışıyor.
Tek mantıkta ve kısıtlı olsun, detaylara boğulmadan. Sahada sipariş girişi yapabilelim, tahsilatları
girebilelim, müşteri ekstresi alabileyim. Aslında detaylı ama ekran küçük olduğu için pratik olması
lazım."*

**Karar:** masaüstü ekranların mobil uyarlaması DEĞİL, ayrı bir kabuk (`380-saha.jsx`). Üçü de aynı
kalıp: **müşteriyi seç → tek şeyi doldur → kaydet.**
1. **Sipariş Gir** — müşteri, model, renk çipi, beden matrisi (büyük dokunmatik kutular), birim
   fiyat + para birimi, teslim tarihi (isteğe bağlı), canlı özet. Planlama/asorti/koli/defter YOK.
2. **Tahsilat Gir** — tutar (büyük kutu), para birimi çipleri, kasa/banka, açıklama.
3. **Müşteri Ekstresi** — para birimi başına bakiye, son 40 hareket, **Paylaş Şeridi** (PDF /
   WhatsApp / E-posta).

**Kayıt yolları masaüstüyle AYNI:** sipariş `sonrakiSiparisNo(prev, "SAT-")` ile numaralanıp
`siparis:data`ya; tahsilat `addCariHareketFromStok` (fiş numarasını huni üretir, THS-) + kasa
hareketi `muhasebeyePesinIsle` çiftiyle — cari kartındaki Tahsilat düğmesinin ürettiğinin aynısı.
Saha modu kendi veri kuralını kurmuyor, yalnız ekranı sadeleştiriyor. Girilen sipariş masaüstünde
normal şekilde düzenlenmeye devam eder.

**Geçiş:** telefonda sol menü yok, bu yüzden **mobil alt çubukta ilk sıradaki "Saha"** düğmesi;
masaüstünde sol menüde "Saha Modu". Tercih `localStorage saha:modu`da — bir dahaki açılışta
doğrudan saha modu gelir; "Tam ekrana geç" ile dönülür.

**Yakalanan hata:** `sahaTahsilat`, `addCariHareketFromStok`tan önce tanımlıydı — TDZ ("Cannot
access before initialization") ve uygulama açılmıyordu. Tanım bağımlılığın ardına taşındı.
(2. denetim bu sınıfı görmüyor; açık kalanlar listesinde.)

### v1.287.0 — saha modu 2. tur

**Kullanıcı:** *"Mobil için ekstre matris şeklinde olsun yine, sipariş girişinde asorti olsun, fiyat
tanımlı ise kendi çeksin, sipariş listesi olsun matris yine ve planlama yapsın."*

- **Asorti:** sipariş ekranında asorti + set sayısı → beden kutuları doluyor (oran × set;
  masaüstündeki `AsortiUygulaKontrolu` ile aynı hesap). Renkte olmayan bedenler atlanıyor, hiç
  eşleşme yoksa uyarı.
- **Otomatik fiyat:** renge dokununca `fiyatBul` (cariye özel → fiyat grubu → renk/beden → ürün
  fiyatı) sonucu kutuya düşüyor; kullanıcı üstüne yazabiliyor. Fiyat kutusu elle doldurulmuşsa
  dokunulmuyor.
- **Siparişler ve Planlama:** açık satış siparişleri; açılınca kalanlar ÜRÜN+RENK × BEDEN
  matrisinde. İki düğme: **Üretime ver** (planlanmamış kalemlerin hepsi) ve tedarikçi seçip **Alışa
  ver**. `planlaUretim` / `planlaSatinAlma` — masaüstüyle aynı fonksiyonlar; saha yalnız "hepsi"
  kestirmesini sunuyor, kalem kalem bölmek masaüstünde.
- **Ekstre matrisi:** cari hareketinde beden yok, döküm STOK HAREKETLERİNDEN fiş numarasıyla
  eşleştiriliyor: "Sevkiyat dökümü" tablosu (fiş · ürün · renk × beden). Değişmez kural gereği
  matris düzeninde.

### v1.288.0 — saha modu 3. tur + AÇIK SORU

**Kullanıcı:** *"Siparişte resim görünsün. Matris her yerde olsun, ekrana sığmayacağı zaman
küçülebilir veya alt satıra inebilir. Siparişte kalemleri ekle olsun, birden fazla satır. Aslında
normal sürümü dizayn yapsak daha mantıklı olmaz mı, oradakileri kısıtlasak? Baştan yazmaya gerek
yok. Burada dizayn yapabileceğim bir yer yok mu?"*

- **Ürün görseli:** model seçilince 64px görsel (renk seçiliyse rengin resmi); sepet satırlarında
  28px. Doğru modeli seçtiğini gözle doğrulamanın en hızlı yolu.
- **Çoklu kalem:** "Kaleme Ekle" ile doldurulan model+renk sepete geçiyor, ekran yeni model için
  boşalıyor. Sepette satırlar görselli ve tek tek silinebilir. Kaydederken aynı ürün+renk+beden
  TEK KALEMDE toplanıyor (aynı hücrenin iki satır görünmesi karışıklık).
- **Mobilde matris:** dar ekranda tablolar bir tık küçülüyor (12px/6px) ve YATAY KAYDIRILIYOR.
  Beden sütunlarını alt satıra indirmek denenmedi: matrisin okunma biçimi aynı bedenin aynı sütunda
  kalmasına dayanıyor, kırmak onu bozar.

> **AÇIK SORU (kullanıcıya soruldu, cevap bekleniyor):** saha modunu geliştirmeye devam mı, yoksa
> saha modunu bırakıp NORMAL ekranları mobilde kısıtlamak mı? İkinci yol: modül başına "mobilde
> göster/gizle" tercihleri + karmaşık bölümlerin (planlama ayrıntısı, rezervasyon, asorti kurucu)
> dar ekranda kapalı gelmesi. Avantajı tek ekran kümesi (iki yerde bakım yok), dezavantajı
> masaüstü yerleşiminin telefonda hâlâ yoğun kalması. Karar verilmeden ikisine birden yatırım
> yapılmayacak.

**Doğrulama:** `senaryo-saha.js` (390px ekran) — alt çubuktan geçiş, üç menü; müşteri arayıp
seçme, 40 bedenine 12 adet + 250 fiyat → `SAT-1001:Bekliyor:40x12@250`; tahsilat → cari `Alacak:1500`
fiş `THS-…` ve kasa `Giriş:1500`; ekstrede bakiye, hareket satırı ve Paylaş Şeridi; "Tam ekrana geç"
sonrası saha kapandı, tercih `0`.

## 17. MOBİL GÖRÜNÜM DÜZENLEYİCİ (14 Eylül, v1.289.0)

**Kullanıcı:** *"Mobil için dizayn yapacağımız ve kısıtlama yapacağımız ekran en mantıklısı.
Sürükle bırak şeklinde olsun; neyi nereye koyacaksan, hangi dizaynda olacaksa pratik bir ekran
tanımlayalım."* — 16. bölümdeki açık soru böylece kapandı: **normal ekranlar + kullanıcının
kurduğu mobil kısıtlama.** Saha modu duruyor (sipariş girişi için hızlı), ama artık tek yol değil.

**Tanımlar > Genel > Mobil Görünüm** (`385-mobil-gorunum.jsx`):
- Modüller sıralı liste; **basılı tutup sürükleyerek** yer değiştiriyor. Sürükleme **pointer
  olaylarıyla** (fare + dokunmatik tek API) — HTML5 drag&drop telefonda çalışmaz.
- Sürüklemenin kaydığı cihazlar için **↑ ↓ düğmeleri** de var: tek yola bağlı kalmak ekranı
  kullanılamaz hale getirebilirdi.
- **açık/gizli** düğmesi: gizlenen modül TELEFONDA görünmüyor, masaüstünde duruyor.
- **İlk dört görünür modül alt çubuğa** çıkıyor; ekranın üstünde canlı önizleme var. Eskiden on iki
  sekme dar çubuğa sıkışıyordu.
- Kayıt `tanimlar.mobilGorunum = { sira, gizli }`; ayar yoksa varsayılan sıra geçerli, yeni eklenen
  modül listenin sonuna düşüyor (ayar bozulmuyor). "Varsayılana dön" düğmesi var.

### v1.290.0 — alt çubuk sayısı + modül içi bölümler

**Kullanıcı:** *"İlk 4 sıradan fazla olsun listeler; ve listelerin içine girelim, liste içinden de
seçim yapılabilsin normal gibi — oradan açık kapalı, aşağı yukarı vs."*

- **Alt çubuk sayısı:** önizlemenin yanında "kaç modül" seçici (3–8). Alt çubuk artık sabit dört
  değil, seçilen sayı kadar modül gösteriyor; satırlardaki "alt çubuk" rozeti de ona göre.
- **Modül içi bölümler:** modül ADINA dokununca altında o modülün bölümleri açılıyor; her bölüm
  için **açık/gizli** ve **↑ ↓**. Kayıt `mobilGorunum.bolumler[modul] = { sira, gizli }`.
- **Katalog elle tutuluyor** (`MOBIL_BOLUMLER`): Sipariş ve Alış Siparişi için Tedarik Planlama,
  Hammadde İhtiyacı, Rezervasyon, **Tedarik Girişleri, Fiş Geçmişi** (son ikisi 15 Eylül'de eklendi;
  sekme değil, kartın alt bölümleri — `mobilBolumGizliMi` ile gizleniyor). Listeye bir bölüm eklemek, o bölümü gizleyen kodu da yazmak
  demek — yoksa ayar süs olur.
- **Uygulama yeri:** sipariş kartındaki sekme şeridi. Ayar YALNIZ dar ekranda (≤720px) geçerli:
  gizlenen sekme çıkmıyor, sıra kullanıcının verdiği sıra. Masaüstünde hepsi eskisi gibi.

### v1.291.0 — "alt çubuk mobilde görünmüyor, ayarlarım çıkmıyor"

**Kullanıcı bildirimi doğru çıktı.** Mobil kurallar YALNIZ `@media (max-width: 720px)`e bağlıydı;
geniş telefon/tablet ve tarayıcının "masaüstü site" kipi 720'nin üstünde kaldığı için alt çubuk hiç
çıkmıyor, mobil bölüm ayarları da uygulanmıyordu (kullanıcının ekran görüntülerinde sol menü
görünüyordu — işaret oradaydı).

- Kurallar **gövde sınıfına** taşındı: `body.mobil-duzen` / `body.masaustu-duzen`. Media sorgusu
  duruyor; sınıf onu genişlikten bağımsız açıp kapatıyor.
- **Otomatik algı** artık dokunmatiği de sayıyor: `(max-width: 720px), (pointer: coarse) and
  (max-width: 1180px)`.
- **Cihaz tercihi:** Tanımlar > Mobil Görünüm'de "Otomatik / Her zaman mobil / Her zaman masaüstü"
  ve "şu an: …" göstergesi. Tercih `localStorage mobil:duzen`de — cihaza ait, buluta yazılmıyor
  (aynı hesap hem telefondan hem bilgisayardan kullanılıyor).
- JS tarafındaki genişlik kontrolleri de sınıfa bağlandı (sipariş kartı bölüm ayarı).

**İki tuzak (ikisi de test sırasında yakalandı):**
1. CSS bloğu bir şablon dizesi içinde — yorumda ters tırnak kullanınca dize kapanıp derleme kırıldı.
2. `body.masaustu-duzen .sidebar { display: flex !important }` sidebar'ın kendi display değerini
   ezip iç düzeni bozdu, düğmeler sıfır genişliğe düştü. `display: revert` ile düzeldi.
3. Menü genişliği hesabı gövde sınıfına bakıyordu; sınıf effect sırasında eklendiği için ilk hesap
   yanlış çıkıyordu — ref + sürüm sayacıyla düzeltildi.

### v1.293.0 — "TÜMÜ" paneli ve masaüstüne dönüş

**Kullanıcı:** *"Masaüstü moda nasıl geçeceğiz?"* — haklı: alt çubukta yalnız ilk N modül vardı,
gerisine ulaşmanın yolu yoktu; "Her zaman mobil" seçen kullanıcı da masaüstüne dönemiyordu
(Tanımlar gizlenmişse büsbütün kilitleniyordu).

Alt çubuğun sonuna **Tümü** düğmesi kondu. Açılan panelde:
- **görünür bütün modüller** (alt çubuğa sığmayanlar dahil), dokununca o ekrana gidiyor;
- **"Masaüstü görünümüne geç"** düğmesi — tercihi `kapali` yapıyor, sol menü geri geliyor. Geri
  dönüş yolu ekranda yazılı: Tanımlar > Mobil Görünüm.

**Doğrulama:** `senaryo-mobil-gorunum.js` — düzenleyici Genel sekmesinde; "Cari" iki sıra
yukarı → sıra `anasayfa, cari, siparis, satinalma`; "Anasayfa" gizlenince kayıtta `gizli:
["anasayfa"]` ve önizleme `Saha · Cari · Sipariş · Alış Siparişi`; 390px ekranda alt çubuk aynı
dörtlüyü gösteriyor; alt çubuk sayısı 6 yapılınca önizlemede 7 öge (Saha + 6) ve telefonda alt
çubuk `Saha · Cari · Sipariş · Alış Siparişi · Stok · Üretim · Depo`; "Sipariş" bölümlerinde
`ihtiyac` gizlenip `rezervasyon` yukarı taşınınca kayıt `{ sira: [planlama, rezervasyon, ihtiyac],
gizli: [ihtiyac] }`; 1200px ekranda gövde `masaustu-duzen` ve alt çubuk gizli, "Her zaman mobil"
seçilince gövde `mobil-duzen`, alt çubuk görünür, sol menü gizli ve tercih `acik`;
"Varsayılana dön" ayarı sıfırlıyor. 390px'te "Tümü" paneli 12 modül ve masaüstü düğmesiyle
açılıyor; düğmeye basınca gövde `masaustu-duzen`, tercih `kapali`, sol menü görünür.

## 18. STOK DURUMU MATRİSİ (15 Eylül, v1.294.0)

**Kullanıcı (ekran görüntüsüyle):** *"Matris düzeni yapalım. Neden hep bozuluyor?"*

**Dürüst cevap: bozulmadı — bu tablo hiç matrise ÇEVRİLMEMİŞTİ.** Koddaki `matris-muaf` notu benim
kararımdı: satır başına yedi metrik (stok, ayrılan, serbest, alış siparişi, beklenen serbest, talep,
açık) olduğu için "tek matris bu veriyi taşıyamaz" diye liste bırakılmıştı. Değişmez kural yeni
tablolara uygulanıyordu; bu eski ekran taranmamıştı.

**Çözüm — tek metrikli matris:** Stok Durumu'nun üstünde **Matris / Liste** anahtarı (matris
varsayılan) ve matris seçiliyken **metrik çipleri**: Stok · Serbest · Beklenen serbest · Talep ·
Açık. Matris satır = renk (hammadde listelerinde ürün + renk), sütun = beden, hücre = seçili metrik,
sağda satır toplamı. Hücreye dokununca liste görünümündeki satır detayı açılıyor (talepler,
yoldakiler). Liste görünümü yedi sütunuyla duruyor — birini seçmek zorunda kalmadan ikisi de var.

> **ALTIN ÇIKTI DEĞİŞTİ, gerekçe:** `senaryo-satin-alma-sutunu` yedi sütunlu tabloyu ölçüyor; matris
> varsayılan olduğu için senaryo önce "Liste" görünümüne geçiyor ve `matrisVarsayilan: true` ölçümü
> eklendi. Ölçülen davranış (sütun değerleri) değişmedi.

**Doğrulama:** `senaryo-stok-matris.js` (yeni) — matris varsayılan ve metrik `stok`; başlıklar
`RENK · 40 · 41 · 42 · TOP.`; hücreler `Siyah|40=5` …; "Açık" çipi metriği değiştiriyor; hücreye
dokununca detay açılıyor; Liste görünümünde yedi sütun geri geliyor.

### v1.299.0 — kaynak sipariş bağlantısı

**Kullanıcı:** *"Alış siparişinde nereden geldiği (kaynak) tıklanabilir olsun; tıklayınca o siparişi
açsın, kapatınca geri gelsin."*

`NotKaynakla` (340-sipariskarti): not metnindeki sipariş numaraları (`SAT-1001`, `ALS-1002`)
ayrıştırılıp bağlantıya çevriliyor; "Kaynak: SAT-1001" ve "Hammadde ihtiyacı — Kaynak: SAT-1001,
SAT-1003" biçimlerinin ikisi de çalışıyor. Gerisi düz metin.

**Modüller arası gezinme:** alış kartındaki bağlantı SATIŞ siparişine gidiyor; o modülde satış
siparişi listelenmediği için tıklama eskiden sessizce hiçbir şey yapmıyordu. Tip uyuşmuyorsa App'in
`sipariseGit`i çağrılıyor (`onSiparisGitGlobal`), modül de değişiyor. **Kapatınca geri dönüş** sekme
çubuğundan: kaynak sipariş ayrı sekmede açılıyor, alış siparişinin sekmesi yerinde duruyor.

**Doğrulama:** `senaryo-siparisten-sec` — AS-1'in "Kaynak: SAT-9" notundaki numara bağlantı olarak
görünüyor (`data-kaynak-siparis="SAT-9"`).

### v1.298.0 — matrisler tabloya benzesin

**Kullanıcı:** *"Listeyi tablo şeklinde yapalım, daha renkli ve tabloyu andıran."*

Matrisler çizgisizdi: hücreler yalnız boşlukla ayrılıyor, göz hangi sayının hangi bedene ait
olduğunu satır boyunca takip etmek zorunda kalıyordu. Tek bir CSS sınıfı (`matris-tablo`, 100-app'te
tanımlı) eklendi: **başlık satırında zemin**, **hücreler arasında ince dikey çizgi**, **dönüşümlü
satır zemini** ve fare/parmak üzerindeyken vurgulama. Sınıf tek yerde durduğu için bütün matrisler
aynı görünüyor: sipariş kalemleri, sipariş kartındaki yardımcı matrisler, tedarik planlama, stok
durumu (matris ve liste).

> Kalan iş: aynı gözle taranmamış başka liste var mı? `matris-muaf` etiketli yerler tek tek
> gözden geçirilmeli — kural "her yerde matris", istisna gerekçesi eskimiş olabilir.

## 19. SİPARİŞ KARTI: FİŞLER SEKMESİ (15 Eylül, v1.295.0)

**Kullanıcı (ekran görüntüsüyle):** *"Sipariş ekranı çok doldu; bilgiler lazım ama hepsi aynı
ekranda çok karmaşık oluyor. 1) En üstte sadece resim, stok, renk, bedenler, fiyatlar olsun.
2) Altta sekme olsun: planlama, orada planlama yapalım ve planlamaları görelim. 3) Fiş sekmesi,
alış ve satış fişleri orada listelensin. 4) Hammadde ihtiyacı olsun."*

Sekme şeridi zaten vardı (Tedarik Planlama · Hammadde İhtiyacı · Rezervasyon) ama **Tedarik
Girişleri ve Fiş Geçmişi sekmelerin DIŞINDA**, kartın altında alt alta duruyordu — ekranı dolduran
buydu.

**Yapılan:** iki blok da **"Fişler (N)"** sekmesinin içine alındı (`aktifKey === "fisler"`). Sekme,
siparişe bağlı tedarik girişi ya da fişli cari hareketi varsa çıkıyor. Kartın üstü (kalem matrisi,
resim, fiyat) olduğu gibi kaldı; altındaki her şey artık sekmede.

Böylece istenen dörtlü tamamlandı: **Tedarik Planlama · Hammadde İhtiyacı · Fişler · Rezervasyon**.
Mobil Görünüm'deki bölüm ayarı (17) bu sekmeleri de kapsıyor.

**Doğrulama:** `senaryo-tedarik-girisleri` — tedarik girişleri ve sevk matrisi ölçümleri "Fişler"
sekmesi açılarak yapılıyor; değerler (100 alış + 3 üretim payı, matris başlıkları) aynı.

### v1.296.0 — matris hücresi sade

**Kullanıcı:** *"Üstte beden altında adetler de 1/1 yazıyor, buna gerek yok, planlamada zaten
görüyorum."*

Kilitli hücre `karşılanan/toplam` yazıyordu; tamamı karşılanmış bir bedende bu "1/1" gibi gereksiz
bir tekrar. Artık **kalan varsa** `karşılanan/toplam (−kalan)`, **tamamı karşılandıysa tek sayı**.
Karşılanan ayrıntısı hücrenin ipucuna taşındı (`1/1 karşılandı · …`), döküm zaten Planlama ve
Fişler sekmelerinde.

**v1.297.0 — kullanıcı ikinci kez bildirdi ("hâlâ görünüyor").** v1.296.0 yalnız TAMAMI karşılanan
hücreyi sadeleştirmişti; ekranındaki sipariş hiç karşılanmamıştı ve `0/2 (−2)` görünüyordu — aynı
şeyi üç kez söyleyen bir hücre. Kural netleşti: **kesir yalnız KISMİ karşılamada** (0 < karşılanan <
toplam). Karşılanan 0 ise ya da tamamı karşılandıysa tek sayı.

## 20. RAPOR MATRİS HÜCRESİ: SİPARİŞ / GİDEN / KALAN (15 Eylül, v1.300.0)

**Kullanıcı:** *"Bunu not et demiştim: burada üstte sipariş miktarı, bir altta giden miktar, en
altta kalan miktar şeklinde raporu dizayn edelim; daha başka detay varsa onları da listeleyebiliriz."*

Hücrede yalnız AŞAMA dökümü vardı ("12 teslim edildi", "2 üretim bekliyor"); en çok bakılan üç sayı
(sipariş, giden, kalan) yoktu — kullanıcı bunu daha önce de istemişti, bu turda yapıldı.

**Hücre düzeni:**
1. **sipariş** (miktar), 2. **giden** (teslim edilen), 3. **kalan** — üçü sabit satırlarda, renkli.
4. Altında ince ayraçtan sonra **aşama dökümü** (varsa), küçük puntoyla ve proses ikonuyla.

Üç sayı "ne kadar", aşama "nerede" sorusunu yanıtlıyor; ikisi bir arada duruyor. Sayılar KALEM
bazlı olduğu için (aşama satırlarında tekrar ederler) `_kalemId` ile bir kez sayılıyor — aşama
dökümünden bağımsız ve toplamlarla tutarlı.

> **ALTIN ÇIKTI DEĞİŞTİ, gerekçe:** `senaryo-rapor-siparis` hücre metni artık
> `10 sipariş / 4 giden / 6 kalan / 4 teslim edildi 6 saya'da`. Sayılar aynı, hücrenin içeriği genişledi.

**Doğrulama:** `birim-rapor` temiz (matris hesabı değişmedi), `senaryo-rapor-siparis` güncellendi.

## 21. STOK TUTARSIZLIĞI — KÖK NEDEN VE ÇÖZÜM (15 Eylül, v1.301.0) — ÖNEMLİ

**Kullanıcı (dört ekran görüntüsü):** *"Stok tutarsızlığı var. Stoğun giriş ve çıkış fişleri var ama
stokta sıkıntı var. Bu konu çok önemli, üzerinde dur. Veri denetimi yakaladı ama bu sorunun
kesinlikle olmaması gerekli; test aşamasının sonuna yaklaştık, gerçek veriyle devam edeceğiz."*

**Ekranlarda görülen:** SAT-1007 "Tamamlandı", satış fişi SAT-1007-F1 kesilmiş (cari hareketi var,
"Sevk edildi"), ama ürünün stok hareketlerinde yalnız ALS-1004-F1 girişi (+8) var, ÇIKIŞ YOK; stok 8
kalmış. Veri Denetimi: "siparişte 1, stok hareketlerinde 0" × 5 beden. Ve her ekranda sürekli
**"Buluta yazılamadı: cariler"** uyarısı.

**KÖK NEDEN (kod, tahmin değil):** yazma katmanı (`tabloYaz`/`tekilYaz`) buluta yazamayınca YEREL
kopyayı yine de güncelliyor (doğru), ama açılışta `supabasedenOku` bulutu okuyup state'e koyuyor;
bulutun ESKİ hâli yerelin GÜNCEL hâlini eziyordu. Bir işlem üç tabloya yazar (stok, sipariş, cari);
biri buluta gidip diğeri gidemeyince veri ikiye bölünüyor: sipariş bulutta "karşılandı", stok
bulutta eski. Uygulamanın hesabında hata yok; yazma yolu YARIM kalıyor ve açılış yanlış tarafı
esas alıyordu. "Buluta yazılamadı: cariler" bu yolun ayak izi — sebebi (tablo kolonu, RLS, boyut)
kullanıcıdan istendi, henüz bilinmiyor.

**ÇÖZÜM 1 — Bekleyen yazma defteri (030-supabase, 040-esitle, 100-app):**
- Buluta gidemeyen her yazma `bekleyen:yazma` (yerel) defterine düşer: anahtar, tablo, hata,
  deneme sayısı. Başarılı yazma kaydı defterden siler.
- **Açılışta defterde kayıtlı tablo için BULUT DEĞİL YEREL kopya esas alınır** (stok, sipariş,
  üretim, cari, tanımlar). Yerel güncel olduğu için veri bölünmez; en kötü ihtimalle "henüz
  gönderilmedi" olur.
- Ekranda kapatılamayan şerit: "Buluta gönderilemeyen kayıt var: cariler (4×) · … Bu cihazdaki
  veri güncel; diğer cihazlar eksik görür" + **Yeniden dene** + **Hata** (son hata metni).
- Kendiliğinden deneme: bağlantı geri gelince (`online`) ve dakikada bir, sessiz.
- Test ortamında bulut olmadığı için şerit hep görünür; `senaryo-sekmeler` içerik konumu 46px kaydı
  (altın güncellendi), diğer 61 senaryo etkilenmedi.

**ÇÖZÜM 2 — Onarım: "Fişten yeniden yaz" (125-veridenetimi, 100-app `eksikHareketOnar`):**
Veri Denetimi'ndeki "Sipariş karşılananı hareketlerle uyuşmuyor" grubunda düğme. Yalnız "siparişte
var, stokta yok" yönü: eksik miktar kadar hareket, siparişin CARİ FİŞİNDEN alınan fiş numarası ve
tarihiyle yazılır, varyant miktarı düşülür, günlüğe yazılır. Fazla hareket (mükerrer) elle incelenir.
Denetim veri değişince kendiliğinden yeniden koşuyor. Kapı listesine eklendi (`kapidenetim.js`).

**KULLANICININ YAPACAĞI (sırayla):**
1. v1.301'i açınca üstte "Buluta gönderilemeyen kayıt" şeridi görünürse **Hata** düğmesine basıp
   metni gönder — "cariler" neden yazılamıyor, asıl kök bu (büyük ihtimalle tablo kolonu eksik ya da
   `rls-kimlik.sql` sonrası yetki).
2. Tanımlar > Veri Denetimi > Denetimi Başlat > "Fişten yeniden yaz" → SAT-1007'nin 5 bedeni onarılır.
3. Bundan sonra bir işlemden sonra şerit çıkarsa uygulamayı kapatmadan "Yeniden dene".

**Doğrulama:** `senaryo-bekleyen-yazma.js` (yeni, üç oturum) — (1) bulut yokken yazma deftere düşer,
şerit 2 tablo gösterir, yerel kopya güncel; (2) bulut sahte "ESKİ BULUT ÜRÜNÜ" döndürürken defterde
`stok:items` varsa ekranda yerelin ürünleri (Bot, Deri) görünür, bulutunki görünmez; (3) karşılanmış
sipariş + cari fişi + eksik stok çıkışı: bulgu 1 → "Fişten yeniden yaz (1 kalem)" → hareket
`SAT-7-F1:-8:s7` yazıldı, varyant 8→0, bulgu 0.

## 22. FİŞ DEFTERİ — ADIM 1 (15 Eylül, v1.302.0)

**Kullanıcı:** *"Fişleri 3 defter değil de tek deftere yazsa ve oradan okusa nasıl olur?"* →
tartışıldı → *"Kafam net değil. Alt yapının çok sağlam olması gerekir, bu hatalar kabul edilemez."*
→ **"Adım 1 başla."**

**Kararlaştırılan üç adım** (tam defter mimarisi DEĞİL; kazancın çoğunu alan, riski küçük yol):
1. **Atomik fiş yazımı** — her fişin tek kaydı; yazılamazsa işlem hiç olmaz. *(bu sürüm)*
2. **Defterden yeniden kurma** — stok/karşılanan/cari bozulursa defterden kesin olarak onarılır.
3. **Dönem kapanışı** — ay sonu açılış kaydı; defter büyüdükçe yavaşlama olmaz. *(aylar sonra)*

**Bu sürümde yapılan (`077-fisdefter.jsx` + 100-app):**
- Kayıt biçimi: bir fiş = bir satır — kalemler, **stok hareketleri**, **cari hareketleri**, sipariş
  bağı, tarih, kullanıcı, `iptal` bayrağı. Tablo `fis_defteri` (tekil satır, koliler kalıbı),
  yerel yedek `fisdefter:data`.
- **Atomik kapı `fisDefterineYaz`** (cari kartından kesilen fiş yolu, `stokFisiKaydet`):
  `fisYaz` sonucu hesaplanır → defter kaydı TEK yazmada gider → başarısızsa **hiçbir türev tabloya
  dokunulmaz** ve kullanıcıya "hiçbir değişiklik yapılmadı" denir. Aynı fiş numarası ikinci kez
  yazılmaz (çift tıklama/yeniden deneme).
- **Sipariş yolu** (`siparisGerceklestir`): bu yol `setSiparisler` güncelleyicisinin içinde
  çalışıyor ve `await` edilemiyor. Defter kaydı orada kurulup güncelleyicinin DIŞINDA yazılıyor
  (React güncelleyicileri saf olmalı; içinde başka state'e yazmak çift kayıt üretir). Yerel yazma
  senkron; bulut yazımı başarısız olursa 21. bölümün bekleyen yazma defteri devreye giriyor.
  **DÜRÜST NOT: bu yol henüz tam atomik değil** — güncelleyicinin dışına çıkarılması Adım 2'de.
- **Geri alma**: `fisGeriAl` artık `silinenFisNolar` döndürüyor; üç geri alma yolu da (üretim,
  tek hareket, fiş temizleme) defterde **`iptal: true`** işaretliyor. **Kayıt SİLİNMİYOR** — ne
  olduğu kadar ne geri alındığı da tarihin parçası.
- `fisDefterindenStokToplami`: defterden türev stok hesabı; Adım 2'nin temeli, şimdiden test
  ediliyor.

**KULLANICININ YAPACAĞI:** `gorevler.sql`i tekrar çalıştır (içinde artık `fis_defteri` de var).
Çalıştırılmazsa defter yalnız yerelde tutulur; ikinci cihaz defteri görmez.

### ADIM 2 — DEFTERDEN YENİDEN KURMA (v1.303.0)

**İki yeni denetim kuralı** (125-veridenetimi, `fisDefteri` parametresi):
- **"Fiş defterinde var, stokta yok"** (CİDDİ): iptal edilmemiş bir fişin stok hareketi stokta
  bulunamıyorsa. Kaynak kesin olduğu için onarım tahmin değil kopyalama.
- **"Fiş defterinde olmayan stok hareketi"** (BİLGİ): defter 15 Eylül'de kurulduğu için ondan
  önceki hareketler buraya düşer, normaldir. Defterden sonra oluşan bir hareket buraya düşerse
  fiş yolu dışından yazılmış demektir — o zaman incelenmeli.

**"Defterden yeniden kur" düğmesi** (`defterdenYenidenKur`, 100-app): kayıp hareketi defterdeki
kayıttan BİREBİR geri yazar — miktar, tarih, fiş no, sipariş bağı, hareket kimliği dahil — ve
varyant miktarını düzeltir. Zaten yerinde olan hareket atlanır (iki kez yazmaz).

**Sipariş `karsilanan`ına dokunulmaz:** bu onarım kayıp hareketi geri koyar; karşılanan ayrıca 2.
kuralla denetleniyor. İki onarımın aynı sayıyı iki kez düzeltmesi, eksik bırakmaktan tehlikelidir.

**"Fişten yeniden yaz" (21) ile farkı:** o, siparişin cari fişinden TÜRETİYOR (defterden önce
kesilmiş fişler için tek yol). Bu, defterdeki kayıttan KOPYALIYOR. Defter dolu olduğu sürece ikincisi
tercih edilmeli.

### ADIM 3 — SİPARİŞ YOLU DA ATOMİK (v1.304.0)

Adım 1'de açık bırakılan yol kapandı. `siparisGerceklestir` artık:
1. `async`; gövde `setSiparisler` güncelleyicisinin İÇİNDE değil, bir hesap fonksiyonunda
   (`const hesap = (() => { … })()`) çalışıyor ve **hiçbir state'e dokunmuyor** — yalnız
   `nextSiparisler`, `nextStok`, `nextCariler`, defter kaydı, koli işlemi ve bildirim üretiyor.
2. Hesap bitince **önce fiş defteri** yazılıyor (`await fisDefterineKayitYaz`).
3. Yazılamazsa `return`: sipariş, stok, cari, koli — hiçbiri değişmiyor.
4. Yazıldıysa state'ler ve tablo yazmaları sırayla yapılıyor.

Böylece her iki fiş yolu (cari kartından ve sipariş kartından) aynı güvenceye sahip: **ya fiş
vardır ya yoktur.** React güncelleyicisi de saf kaldı (iki kez çalışsa bile yan etki üretmez).

**Doğrulama (Adım 3):** `senaryo-fis-defteri` — aynı siparişten AYNI fiş numarasıyla ikinci kez fiş
kesilmeye çalışıldı: "zaten kayıtlı" uyarısı çıktı, defterde kayıt sayısı 1'de kaldı, siparişin
`karsilanan`ı 6'da, varyant `41:6` — yani reddedilen fiş hiçbir tarafı değiştirmedi.

**Doğrulama (Adım 2):** `senaryo-fis-defteri` — defterde fiş varken ürünün hareketleri boşaltılıp
varyant sıfırlandı (kayıp hareket taklidi): denetim "Fiş defterinde var, stokta yok" 1 kayıt buldu,
"Defterden yeniden kur (1 hareket)" sonrası hareket `ALS-5-F1:6` geri geldi, varyant `41:6`, bulgu 0.

**Doğrulama (Adım 1):** `senaryo-fis-defteri.js` (yeni) — alış siparişinden fiş kesildi: defterde TEK kayıt
(`ALS-5-F1`, kalem `Bot/Siyah/41:6`, stok hareketi `Siyah/41:6`, cari hareketi `Alacak:120`);
defterden hesaplanan toplam (6) ürünün varyantıyla (41:6) aynı; fiş geri alınınca kayıt silinmedi,
`iptal` oldu.

## 23. PARÇA 1 — STOK MİKTARI TÜRETİLİYOR (16 Eylül, v1.308.0)

**Kullanıcı:** *"Stok için konuşuyorum. Tek defterden tutalım, her şey tek deftere yazılsın, girende
çıkanda. Fişi olmayan kayıt aklım almıyor. Defterden okusun hareketleri."* — öncesinde uzun vade
tartışıldı (yavaşlama, kod karmaşası, büyük ERP'ler ne yapıyor) ve üç parçalı yol kabul edildi.

**Sorun:** aynı gerçek İKİ yerde tutuluyordu — `variants[].miktar` (ekranların okuduğu sayı) ve
`hareketler[]` (geçmiş). Ayrı yazıldıkları için ayrışabiliyorlardı; ürün kartındaki "kayıtlı stok
ile hareket geçmişi tutmuyor" uyarısı bu ayrışmanın ölçüsüydü ve hangisinin doğru olduğunu uygulama
bilemiyordu.

**Yapılan (`012-stok-turetme.jsx` + 100-app):**
- `setStok` artık doğrudan yazmıyor: gelen liste `stokMiktarlariniHesapla` ile **hareketlerden
  yeniden hesaplanıyor**. Miktar yazılan değil TÜRETİLEN bir değer. Ayrışma mümkün değil.
- **Okuyucular değişmedi** (kodda 130+ yer `variants[].miktar` okuyor): miktar aynı yerde duruyor,
  yalnız kaynağı değişti. Geçiş tek dosyaya sığdı, ekranlara dokunulmadı.
- **AÇILIŞ GÖÇÜ:** hareketi olmayan başlangıç miktarları (ürün açılırken elle girilen stoklar) düz
  hesapta sıfırlanırdı. Onun için bir kez `acilisFarklariniHareketeCevir` çalışıyor: fark kadar
  **açılış hareketi** yazılıyor (`ACL-<tarih>-<sıra>`, kaynak "Açılış"), günlüğe kayıt, ekranda
  bildirim. Hem stok korunuyor hem "fişsiz kayıt" kalmıyor.
  - **Yalnız POZİTİF fark** açılışa bağlanıyor. Ters yön (kayıtlı stok hareketlerden AZ) bir giriş
    hareketinin fazladan olduğu anlamına gelir; oraya açılış yazmak hareketleri geçersiz kılardı.
  - Damga **tanımlarda** (`acilisGocuYapildi`), cihazda değil: veri ortak, göç hesap başına bir kez.
    (İlk denemede `localStorage` kullanılmıştı; her cihazda tekrar çalışma riski vardı.)
- **İSTİSNA — hiç hareketi olmayan ürün dokunulmadan geçer.** Göç çalışmamış bir veride bütün
  stokları sıfırlamamak için. Göçten sonra her miktarın hareketi olur ve istisna kendiliğinden
  devre dışı kalır. Ayrışmayı önleme amacı zarar görmez: ayrışma ancak hareket VARKEN oluşur.

**Kullanıcının örneği (105 Marjin Bot):** kayıtlı stok 0, hareket neti −104 idi. Artık stok
hareketlerden okunduğu için **−104** görünüyor — beklediği sonuç.

**Test tarafındaki etki (13 senaryo):** göç senaryolarda da çalışıyor, açılış hareketleri altın
çıktılara giriyor. Miktarlar korunuyor, farklar yalnız eklenen hareketlerden ibaret. İki senaryo
anlamca değişti:
- `senaryo-acilis-fisi` artık "düğmeye bas" değil, **göç sonrası durum doğru mu** ölçüyor (açılış
  işini göç devraldı; panel "açık yok" diyor).
- `senaryo-eksi-stok-ihtiyac`: varyanta −7 yazmak yetmiyor, eksiyi yapan HAREKET de tohuma eklendi.
- `normalles`e `ACL-…` normalleştirmesi eklendi (fiş numarasının rastgele son eki her koşuda
  değişiyordu).

**Doğrulama:** `senaryo-stok-turetme.js` (yeni) — (1) geçişte 104 çift korunup açılış fişine
bağlandı; (2) varyant bozukken (0) hareketlerden düzeldi (8); (3) hareketsiz varyant sıfırlandı;
(4) girişsiz satışta stok **−104**. Tam koşu: 66 senaryo temiz.

### PARÇA 2 — HER STOK HAREKETİ DEFTERE (v1.309.0)

**Kullanıcı:** *"Üretim için de, alış satış için de, tüm işlemler için o deftere yazsın."*

Adım 1'de yalnız FİŞ YOLLARI deftere yazıyordu (cari kartından kesilen fiş, sipariş teslimi).
Üretim çıkışı/girişi, açılış, elle stok girişi ve onarım hareketleri defterin dışındaydı.

**Yöntem — kapı kapı değil, TEK GEÇİTTEN:** hareketler `setStok`ta toplanıyor.
`defteryeGirmemisHareketler` önceki/yeni stoku karşılaştırıp yeni beliren hareketleri buluyor;
`defteriHareketlerleGuncelle` bunları fiş numarasına göre gruplayıp deftere ekliyor (aynı fiş
numarası zaten varsa O KAYDA ekleniyor — fişin ikinci kalemi sonradan yazılmış olabilir).

> **Neden kapı kapı değil:** 14 ayrı hareket kapısı var ve yenisi eklenebilir. Her kapıya "deftere
> de yaz" satırı koymak, bir gün birinin unutulması demekti — bu projede tam olarak bu sınıf hata
> yaşandı (21. bölüm). Stok yazımı tek geçit olduğu için oradan toplamak kaçak bırakmıyor.

**Ayrıntılar:**
- Güncelleyici saf kalsın diye hareketler bir `ref`e biriktiriliyor, deftere yazma effect'te.
  React'in güncelleyiciyi iki kez çalıştırdığı kipte çift kayıt olmasın diye yazma anında
  hareket kimliğine göre süzülüyor.
- Fiş yollarından gelmeyen kayıtlar `otomatik: true` işaretli: defterde nereden geldiği görünüyor.
- Fişi olmayan hareket de deftere düşüyor (`fisNo: null`); görünmez kalması daha kötü, Veri Denetimi
  onları ayrıca işaretliyor.

**Doğrulama:** `senaryo-fis-defteri` — tohum açılırken defterde yalnız üretim ve açılış kaynaklı
kayıtlar oluşuyor, hepsi `otomatik` işaretli, hareketi olmayan kayıt yok. Tam koşu: 66 senaryo temiz.
(`senaryo-bekleyen-yazma` altını güncellendi: `fisdefter:data` da bekleyen yazma listesine giriyor.)

### PARÇA 2'NİN TAMAMLANMASI — FİŞSİZ HAREKET YAZILAMAZ (v1.310.0)

**Kullanıcı:** *"Geçmişte fiş numarası olmayan kayıt varsa önemli değil, test aşamasındayız.
Gelecekte olmasın yeterli."*

Numara ATAMA da stok yazımının tek geçidinde yapılıyor (`fissizHareketlereNumaraVer`): numarasız
gelen hareket orada numara alıyor. Kapıya değil geçide bakıldığı için "şu kapı numara üretmeyi
unutmuş" durumu imkânsız.

- **Ön ek kaynaktan:** Üretim → `URT`, Açılış → `ACL`, Satınalma → `ALS`, Satış → `SAT`,
  Sayım → `SYM`, Fire → `FRE`, Transfer → `TRF`, diğer → `MNL`. Numaraya bakınca işin cinsi belli.
- **Aynı işlem tek fiş:** aynı ürün + gün + kaynak + üretim/sipariş bağı olan numarasız hareketler
  AYNI numarayı alıyor — bir işlemde yazılan beş beden beş ayrı fiş değil.
- Atanan numara `fisOtomatik: true` işaretli ve **kalıcı yazılıyor** (yalnız bellekte kalsa bir
  sonraki açılışta hareket yine numarasız görünürdü).
- Serbest stok girişindeki (`bagimsizStokGirisiYap`) **rastgele** `MNL-####` numarası sıralı
  `fisNoUret("MNL")` ile değiştirildi: rastgele dört hane çakışıp geri alma ve defter
  eşleştirmesini bozabiliyordu.

**Doğrulama:** `senaryo-fis-defteri` — numarasız bir sayım hareketi tohuma konuldu: açılışta
`SYM-…` numarası aldı, `fisOtomatik` işaretlendi, fişsiz hareket kalmadı ve defterde Sayım kaynağı
belirdi. Tam koşu: 66 senaryo temiz.

### ÜRETİMDE ARTAN İADESİ AYRI FİŞ (17 Eylül, v1.311.0)

**Kullanıcı (ekran görüntüleriyle):** *"Üretimde 176 desi yapıldı ve 8 desi arttı, iade alındı.
Fişlerde üretimden artan stok girişi olması gerekmez miydi? Stok hareketinde görüyorum ama fişi yok,
bu mantığa ters."*

**Teşhis:** iade hareketi FİŞSİZ DEĞİLDİ — çıkışla AYNI fiş numarasını (`10001-Kesim`) taşıyordu.
Ama fiş listesinde tek satır ve NET (−168) görünüyordu; +8'lik iade hiçbir fişte ayrı görünmüyordu.
Kullanıcının itirazı haklı: iade ayrı bir olay (farklı yön, farklı an), ayrı belgesi olmalı.

**Yapılan:** iade hareketleri `${fisNo}-İade` numarasını alıyor (`10001-Kesim-İade`). Fiş listesinde
ayrı satır olarak duruyor. `uretimFisAdlari` ailesine `-İade` eklendi: adım geri alınınca iade
hareketi de geri alınıyor — yoksa iade edilen mal stokta kalırdı.

> **AÇIK KALAN:** bu davranışın kendi senaryosu (`senaryo-uretim-iade.js`) yazıldı ama üretim
> kartını açma adımı test ortamında oturmadı; senaryo `kosu.sh`ye EKLENMEDİ. Sıradaki turda
> tamamlanacak. Mevcut 66 senaryo bu değişiklikten etkilenmedi (`uretim`, `fis-ozet` dahil).

> **PARÇA 3 (aylar sonra):** dönem kapanışı — defter büyüdükçe yavaşlamayı önler.

## 24. MODELHANE — 1. TUR (17 Eylül, v1.321.0)

**Kullanıcı:** *"Modelhane oluşturmamız gerekiyor. Amacımız henüz koleksiyona girmeyen mamulleri
oluşturmak... Modelci model çizimlerini yükleyecek. Kalıp, taban, aksesuar, deri vs. tüm işlemleri
detaylı girdiği, teknik çizimleri, renderları yüklediği, reçete oluşturup üretim yaptığı alan."*
Öncesinde sektör araştırıldı (PLM: Lifecycle, Rechain, Plmbr, WFX, Onbrand) ve yapı kararlaştırıldı.

**KARAR — AYRI KAYIT, AYRI MODÜL.** Model stok ürünü olarak açılmadı: koleksiyona girmemiş bir
model stok değildir; ürün kartı olsaydı stok listesine, stok değeri raporuna, hammadde ihtiyaç
hesabına ve veri denetimine karışır, "kayıtlı ürün" sayısı gerçeği söylemezdi. Ayrı tablo
(`modeller`, tekil satır kalıbı) ama **yapısı ürün kartıyla aynı** — koleksiyona alırken kopyalamak
tek adım.

**Aşama akışı** (sektörde stage/gate): Fikir → Çizim → Kalıp/Taban → Numune → Revizyon → **Onaylı**
→ Koleksiyonda. "Onaylı" ayrı bir aşama, çünkü sektörde onaylı (sealed) numune üretimin kalite
ölçütü; araştırmada "asla atlanmaması gereken adım" olarak geçiyor. Aşama değişikliği modelin
GEÇMİŞİNE yazılıyor.

**Model kartı sekmeleri (bu tur):**
- **Künye** — ad, sezon, modelci, **kalıp (last)**, taban, topuk, beden serisi, hedef maliyet, not.
- **Tasarım** — eskiz/render görselleri (başlıklı, silme onaylı).
- **Teknik** — teknik çizimler + teknik detay metni (ölçü, malzeme, dikiş, kalıp notu).
- **Geçmiş** — ne zaman ne oldu.

**"Koleksiyona Al"** (`modeliKoleksiyonaAl`, 100-app): model → **mamul ürün kartı**. Taşınanlar:
ad, ilk tasarım görseli (kapak resmi), teknik çizimler, teknik not, reçete ve künye bilgisi
(ürün kartında kalıp/taban alanı yok, uydurmak yerine okunur bir nota çevriliyor).
**Model kaydı SİLİNMİYOR:** "Koleksiyonda" aşamasına geçiyor ve oluşan ürünün kimliğini taşıyor —
gelecek sezonda o modele bakılacak. Aşama "Onaylı" değilse onay soruluyor (engellenmiyor).

**KULLANICININ YAPACAĞI:** `gorevler.sql`i tekrar çalıştır (içinde artık `modeller` de var).

**Doğrulama:** `senaryo-modelhane.js` (yeni) — menüde Modelhane; M-512 açıldı, aşaması "fikir";
kalıp/taban/teknik not kaydedildi; "onaylı" aşamasına geçince geçmişe yazıldı; koleksiyona alınca
mamul ürün kartı oluştu (`kategori: Mamul`), teknik not taşındı, künye notu
`M-512 · Sezon: 2027 Kış · Kalıp: … · Taban: …`, model kaydı silinmedi ve "koleksiyon" aşamasına
geçti. Tam koşu: 70 senaryo temiz.

> **SIRADAKİ TURLAR (modelhane):** reçete (deri/taban/aksesuar miktarları + maliyet, son alış
> fiyatlarından), numune turları (proto → geliştirme → onaylı; her turun fotoğrafı, yorumu, kararı),
> numune üretimi (mevcut üretim modülünden "numune" işaretiyle: hammadde düşer, mamul stoğuna
> girmez).

## 25. GELİR / GİDER KARTLARI (17 Eylül, v1.322.0)

**Kullanıcı:** *"Muhasebe tarafında gelir gider kartları açmamız lazım. Kârlılığımızı kontrol edecek,
giderleri listeleyecek veya alışsız giderleri kapatacağımız kartlar olması gerekli... Muhasebede
alınan ödemeler nasıl giriliyor, girişin çıkış karşılığı olmak zorunda çünkü."*

**Araştırma (çift kayıt):** her işlem en az iki kayıt — bir borç, bir alacak, toplamı sıfır.
Elektrik faturası bankadan ödenince gider hesabına borç, kasaya alacak yazılır; gelir tablosunda
gider, bilançoda azalan nakit görünür. Tek girişli deftere üstünlüğü: defter her zaman dengede,
denk gelmiyorsa bir kayıt atlanmış demek (otomatik hata kontrolü). Küçük işletme yazılımlarında
yevmiye + defteri kebir + **hesap planı** üçlüsü var; hesap planı hangi raporun üretilebileceğini
belirliyor. TDHP'de gider fonksiyona göre ayrılıyor: 730 üretim, 760 satış-pazarlama, 770 genel
yönetim, 780 finansman.

**Bizde eksik olan:** para hareketinin karşı tarafı yalnız CARİ olabiliyordu. Kira, elektrik, maaş,
nakliye gibi alışı olmayan giderlerde karşı taraf yoktu — kasadan çıkıyor, hiçbir yere yazılmıyordu.
Kârlılık bu yüzden hesaplanamıyordu.

**Yapılan:**
- **Gelir/gider kartları** (Tanımlar > Genel): ad, grup, isteğe bağlı TDHP kodu. Gruplar fonksiyona
  göre: Üretim (730) · Satış-pazarlama (760) · Genel yönetim (770) · Finansman (780) · Diğer gelir
  (649). **"Hazır kartlarla başla"** düğmesi atölyenin sık kalemlerini (kira, elektrik, personel,
  SGK, nakliye, bakım, yakıt, banka masrafı, kırtasiye) tek dokunuşta açıyor; sonra eklenir/silinir.
- **Kasa/banka formunda karşı taraf** artık cari VEYA gider/gelir kartı. Biri seçilince diğeri
  temizleniyor (ikisi birden anlamsız).
- **KARŞILIKSIZ HAREKET YOK:** ikisinden biri seçilmeden kayıt reddediliyor. Stokta "fişsiz hareket
  olmaz" kuralının para tarafındaki karşılığı.
- Hareket kartın **adını ve GRUBUNU** taşıyor (`giderKartId`, `giderKartAd`, `giderGrubu`) —
  kâr-zarar raporu bu gruplardan çıkacak, metin ayrıştırmaya gerek kalmayacak.

**Doğrulama:** `senaryo-gider-kartlari.js` (yeni) — boşken "hazır kartlarla başla" düğmesi var,
basınca 10 kart açılıyor, elle eklenen "Numune giderleri" üretim grubunda; kasa formunda kart
seçici çıkıyor; karşı taraf seçmeden kaydet denince hareket yazılmıyor; kart seçilip kaydedilince
hareket `Çıkış:12000:İşyeri kirası:yonetim`. Tam koşu: 71 senaryo temiz.

> **SIRADAKİ:** kâr-zarar raporu — satış geliri − satılan malın maliyeti − giderler, gruplara göre
> dağılım ve ay ay karşılaştırma. Ayrıca Veri Denetimi'ne "karşılığı olmayan para hareketi" kuralı
> (eski kayıtlar için; yeni kayıtlarda artık imkânsız).

## 26. RESİM HAVUZU + MENÜ GRUPLARI (17 Eylül, v1.323.0)

### Modelhane · Resimler (ilham havuzu)

**Kullanıcı:** *"Modelhane için resimler bölümü olsun, resimlerden model yapmak için. Modeli
yapılan resim model oluştursun ve kapak resmi olsun. O modeli hangi tabana düşünüldü bilgisi
girelim. Bu önemli."*

Modelhane iki ana sekmeye ayrıldı: **Modeller** ve **Resimler**. Resimler bir ilham havuzu — fuar
fotoğrafı, müşteriden gelen görsel, internetten referans. Her resimde üç alan: not, **düşünülen
taban**, model adı. **"Model Yap"** deyince:
- resim modelin **kapak resmi** ve ilk tasarım görseli oluyor,
- düşünülen taban **künyeye** (`taban`) geçiyor,
- not modele taşınıyor, geçmişe "Model resimden oluşturuldu · düşünülen taban: …" yazılıyor,
- ilham kaydı havuzdan ÇIKIYOR (modele dönüştü; havuzda ikinci kez durması kafa karıştırırdı).

İlham kayıtları ayrı tablo değil: `modeller` içinde `tip: "ilham"` ile duruyorlar. Sebep, resmin
modele dönüşünce aynı kayıt yolunu kullanması; model listesi `tip !== "ilham"` ile süzülüyor.

### Menü grupları

**Kullanıcı:** *"Soldaki bar çok uzayacak, birleştirelim; mesela Depo ana başlık olsun, altına
Stok eklensin."*

14 modül tek düzlemdeydi ve Modelhane ile liste ekranı aşmaya başladı. Dört grup:
**Depo** (Stok · Depo · Paketleme) · **Üretim** (Üretim · Modelhane · Planlama) ·
**Ticaret** (Sipariş · Alış Siparişi · Cari) · **Finans** (Muhasebe · Fişler).
Anasayfa, Sohbet, Günlük ve Tanımlar grupsuz: biri giriş, ikisi her an lazım, Tanımlar ayrı düğmede.

- **İçinde aktif modül olan grup kendiliğinden açık** — kullanıcı her açılışta grubu elle açmasın.
  Elle kapatılsa bile aktif modülün grubu açık kalıyor.
- Menü **daraltılmışken** (yalnız ikonlar) grup başlığı GÖSTERİLMİYOR: 64 piksele başlık sığmaz,
  ikonlar doğrudan alt alta; o kipte liste uzunluğu sorun değil.

**Yakalanan regresyon:** menüyü gruplara ayırırken Sohbet'in ROZETİ (açık görev + okunmamış mesaj
sayısı) kayboldu — `senaryo-sohbet` ve `senaryo-gorevler` yakaladı. Rozet geri kondu ve kanal
listesi artık mesajlardan türetiliyor (kanallar sabit değil: "ekip" + her ikili özel akış).

**Doğrulama:** `senaryo-menu-gruplari.js` (yeni) — daraltılmışken grup yok, 14 modül görünür;
genişletilince dört grup ve grupsuz üç öğe; Depo başlığına dokununca Stok/Depo/Paketleme çıkıyor;
Muhasebe'ye gidip Finans grubu elle kapatılsa bile açık kalıyor.
`senaryo-modelhane` genişletildi: ilham havuzu, taban alanı, "Model Yap" sonrası
`model:M-001:601 Sneaker:Kauçuk 4 mm EVA:kapak`. Tam koşu: 72 senaryo temiz.

## 27. GÖREVLER, SOHBET, ANASAYFA (17 Eylül, v1.324.0)

Kullanıcının dört isteği (beşincisi — kullanıcı grupları — AÇIK, aşağıda).

**1. "Sohbette görevleri WhatsApp'tan gönder olsun."** Görev kartına WhatsApp bağlantısı eklendi:
metin `GÖREV: … · Bitiş: … · İlgili: … · Veren: …` biçiminde hazır gidiyor. Numara atanan kişinin
kartından (`whatsapp` ya da `telefon`); yoksa WhatsApp'ın kişi seçme ekranı açılıyor — numara
uydurmaktan iyi. Atölyede herkes uygulamaya bakmıyor, görev atanınca en kestirme yol bu.

**2. "Sohbet anlık değil, sayfa yenileyince gözüküyor."** Mesajlar açılışta bir kez okunuyordu.
Artık sohbet ekranı AÇIKKEN **6 saniyede bir** buluttan tazeleniyor; ekran kapalıyken yoklama
duruyor (boşa istek atmamak için). Liste uzunluğu değişmediyse referans yenilenmiyor — her
yoklamada yeni dizi vermek ekranı boşa çizer ve yazma alanını sıçratırdı.
> Gerçek zamanlı abonelik daha zarif olurdu ama ayrı bir bağlantı katmanı gerektiriyor; 6 saniye
> atölye için yeterince "anlık" ve basit.

**3. "Görev oluşturulduğunda anasayfada yer alsın."** Anasayfanın en üstünde **"Açık görevlerim"**
paneli: yalnız bana atanan ve kapanmamış görevler, son tarihi ve durumuyla. Altıdan fazlası varsa
"hepsini aç". Görev sohbetten atanıyordu ve yalnız Sohbet ekranında görünüyordu; gün içinde oraya
bakılmazsa görev kayboluyordu.

**4. "Anasayfadaki stok bilgileri şu an gereksiz."** Kaldırılanlar: Toplam Stok Değeri · Kayıtlı
Ürün · Kritik Stok · Aktif Üretim. Kalanlar: Toplam Alacak · Açık Siparişler — günü onlar
belirliyor. Kullanıcı tanımlı dashboard geldiğinde bu liste oradan beslenecek.

**Doğrulama:** `senaryo-sohbet` genişletildi — görev kartında `wa.me` bağlantısı ve metninde GÖREV
geçiyor; anasayfada görev paneli çıkıyor (1 görev); kaldırılan stok kartları ekranda yok.
Tam koşu: 72 senaryo temiz.

> **AÇIK — KULLANICI GRUPLARI (5. istek):** *"Admin her şeye yetkili; üretim kullanıcısı üretimle
> alakalı yerleri görüp işlem yapabilecek; muhasebe kullanıcısı muhasebe ile alakalı; üretim +
> muhasebe kullanıcısı; bir de panel kullanıcısı — sadece tek ekrandan işlem yapabilecek, örnek
> üretimde barkod ekranı."* Yetki altyapısı (`kullaniciYetkisiVar`) VAR ama rol ŞABLONU yok; her
> kullanıcıya yetkiler tek tek veriliyor. Yapılacak: hazır roller (Admin · Üretim · Muhasebe ·
> Üretim+Muhasebe · Panel) ve Panel rolü için tek ekrana kilitlenme (menü yok, yalnız atanan ekran).

## 28. MENÜ DÜZENİ, FİŞ AYRIMI, KISA FİŞ NUMARASI (17 Eylül, v1.325.0)

**1. Menü yeniden düzenlendi** (kullanıcı: *"Ticaret kalksın, Siparişler olsun, içinde alış ve
satış siparişleri olsun. Finans'ın altında cari, kasa, banka, çek ve muhasebe fişleri olsun.
Planlama başlı başına sekme olsun, orası büyüyecek."*):
- **Depo**: Stok Fişleri · Stok · Depo · Paketleme
- **Üretim**: Üretim · Modelhane
- **Siparişler**: Sipariş · Alış Siparişi ("Ticaret" adı kalktı)
- **Finans**: Cari · Muhasebe (kasa/banka/çek onun içinde) · Muhasebe Fişleri
- **Grupsuz**: Anasayfa · **Planlama** · Sohbet · Günlük

**2. Fişler ikiye ayrıldı** (*"fişler stok hareket fişleri ve muhasebe fişleri olarak ayrılsın,
biri muhasebeye diğeri depoya — para fişi stok değil"*): aynı modül `kapsam` ile açılıyor.
- **Stok Hareket Fişleri** (Depo): Alış · Satış · Üretim Girişi · Üretim Çıkışı · İşçilik
- **Muhasebe Fişleri** (Finans): Alış · Satış · Tahsilat · Ödeme
- Alış/satış **ikisinde de** var: hem mal hem para hareketi doğuruyor. Fişin iki tarafı olduğu
  gerçeğini gizlemek yerine iki listede de gösteriyoruz.
- Kapsam yalnız listeyi değil **sayaçları ve tip çiplerini de** süzüyor; yoksa sayaçlar kapsam dışı
  fişleri sayar ve çipler boş süzgeç gösterirdi.

**3. Tek sözlük** (*"resimde Alış ve Cariden Alış var... kodları da tek yere bağlansın"*):
"Cariden Alış" (AF-) ve "Alış" (ALS-) aynı etiket altında birleşti: **Alış**. Aynısı satışta:
"Cariye Satış" (SF-) + "Satış" (SAT-) → **Satış**. Nereden kesildiği fişin İÇİNDE görünüyor
(sipariş bağı). İki etiket tip süzgecini de ikiye bölüyordu: "alışlar" derken biri kaçıyordu.

**4. Fiş numarası kısaldı** (*"AF-20260917-002 çok uzun, onu 0917002 olarak güncelleyelim, bu
mantık her fişte aynı olsun"*): `fisGunKodu()` = ay+gün. Artık `AF-0917002`, `ODM-0917003`,
`ACL-091702XY`. Yıl atıldı: fişin yılı tarihinden belli ve atölye numarayı gün içinde konuşuyor.
Sıra hesabı mevcut numaralara baktığı için aynı gün çakışma imkânsız; yıllar arası tekrar farklı
tarihli iki fiş demek ve kayıtta tarih zaten var.

**Etkilenen testler:** 6 senaryo "Fişler" düğmesini arıyordu → "Stok Fişleri" / "Muhasebe
Fişleri"; `senaryo-acilis-fisi` ve `senaryo-paketleme`deki numara biçimi desenleri kısaldı;
`normalles` hem eski hem yeni ACL biçimini normalleştiriyor. `senaryo-menu-gruplari` genişletildi:
Finans altında Cari/Muhasebe/Muhasebe Fişleri, muhasebe fişlerinde üretim fişi görünmüyor.
Tam koşu: 72 senaryo temiz.

## 29. KULLANICI ROLLERİ (18 Eylül, v1.326.0)

**Kullanıcı:** *"Kullanıcı gruplarında admin her şeye yetkili, üretim kullanıcısı üretim işleriyle
alakalı yerleri görüp işlem yapabilecek, muhasebe kullanıcısı muhasebe ile alakalı, üretim +
muhasebe kullanıcısı, bir de panel kullanıcısı — bu sadece tek ekrandan işlem yapabilecek, örnek
olarak üretimde barkod ekranı."*

**Önce:** yetkiler kullanıcı başına modül modül, işlem işlem elle veriliyordu (7 modül × 4 işlem =
28 kutu). Yeni personelde unutuluyor ya da yanlış işaretleniyordu.

**Şimdi — `ROL_SABLONLARI` (015-sabitler):**
| Rol | Kapsam |
|---|---|
| **Yönetici (admin)** | Her şey. Kullanıcıları ve tanımları yönetir. |
| **Üretim** | Üretim + stok (yaz), sipariş ve fişler (oku). Para tarafını görmez. |
| **Muhasebe** | Cari + muhasebe (tam), fişler (yaz), sipariş (oku). Üretimi görmez. |
| **Üretim + Muhasebe** | İkisi birden; tanımlar ve kullanıcılar hariç. |
| **Panel (tek ekran)** | Menü yok, yalnız seçilen ekran. |

Kullanıcı kartındaki "Yetkiler" bölümüne **rol şablonu seçici** eklendi: seçilince kutular dolar.
**Şablon başlangıçtır, kilit değil** — sonrasında kutular elle değiştirilebilir. "Özel (elle)"
seçilirse yalnız rol boşalır, kutulara DOKUNULMAZ (elle kurulan yetkiler kaybolmasın).

**PANEL kullanıcısı** — atölyedeki ortak tablet/telefon için:
- Sol menü **hiç çizilmiyor** (`display:none` değil, render edilmiyor: klavye ve ekran okuyucuyla
  da erişilemesin).
- Seçilen ekran **açılmış geliyor** (`PANEL_EKRANLARI`: barkod ekranı · atölye ekranı · paketleme).
- Hangi sekmeye yönlendirilirse yönlendirilsin kendi ekranına dönüyor.
- Amaç: kalfanın eline verilen cihaz barkod okutsun, yanlışlıkla fiş silmesin.

**Doğrulama:** `senaryo-kullanici-rolleri.js` (yeni) — şablon listesi beş rol; "Üretim" seçilince
kullanıcı üretimi görüyor, muhasebeyi ve cariyi görmüyor; panel kullanıcısı girince menü
çizilmiyor, barkod ekranı açık ve fiş menüsü yok. Tam koşu: 73 senaryo temiz.

## 30. KÂR / ZARAR RAPORU (18 Eylül, v1.333.0)

Gelir/gider kartlarının (25. bölüm) meyvesi. Muhasebe modülünde dördüncü sekme: kasa/banka/çek
"para nerede" sorusunu cevaplıyor, bu sekme **"kazanıyor muyuz"** sorusunu.

**Hesap — muhasebenin gelir tablosu sırası:**
```
  Satış geliri              satış fişlerinin tutarı (stok hareketlerinden)
− Satılan malın maliyeti    satılan ürünün kart alış fiyatıyla değeri
= BRÜT KÂR
− Giderler                  gider kartlı kasa/banka çıkışları, gruplara ayrılmış
+ Diğer gelir               gelir kartlı girişler
= NET KÂR
```

**Neden stok hareketinden:** fişin PARA ayağı cari defterinde, MAL ayağı stokta. Satılan malın
maliyetini bilmek için hangi üründen kaç adet çıktığı gerekiyor — o bilgi yalnız stokta.

**Gider dökümü:** grup grup (Üretim · Satış-pazarlama · Genel yönetim · Finansman), yüzde ve oran
çubuğuyla, altında kart adları. "Nereye gitti" sorusunun cevabı tek bakışta.

**Dönem:** Bu ay · Geçen ay · Bu yıl · Tümü.

**AÇIKÇA YAZILAN SINIRLAR** (ekranın altında, kullanıcı görsün diye):
- SMM ürünün **kart alış fiyatıyla** hesaplanıyor, parti bazlı gerçek maliyet değil. Atölye için
  yaklaşık ama tutarlı; uydurulmuş bir kesinlik göstermek, yaklaşık olduğunu söylemekten kötü.
- Döviz **bugünkü kurla** TL'ye çevriliyor; geçmiş dönemde işlem anındaki kur farklı olabilir.
- **Üretim maliyeti (işçilik, fire) henüz tabloda değil.**
- Gider kartı hiç tanımlı değilse ekranın başında uyarı çıkıyor (kira/elektrik hesaba girmiyor).

**Doğrulama:** `senaryo-kar-zarar.js` (yeni) — 10 çift × 900 ₺ satış, kart alışı 400 ₺, 12.000 kira
+ 8.000 personel gideri: satış 9.000, maliyet −4.000, brüt 5.000, gider −20.000, **net −15.000**;
döküm üretim ve yönetim gruplarına ayrılmış, kart adları görünüyor; "geçen ay" süzgecinde hepsi 0;
kartsız veride uyarı çıkıyor. Tam koşu: 75 senaryo temiz.

> **SIRADAKİ:** üretim maliyetini (işçilik + fire) SMM'ye katmak; "karşılığı olmayan para hareketi"
> denetim kuralı (eski kayıtlar için).

## 31. FİYATLANDIRMA — CARİDE RENK/BEDEN (18 Eylül, v1.334.0)

**Kullanıcı (17 Eylül):** *"Fiyatlandırmada tekil cari için fiyatın alış satış olduğunu, renk beden
seçimi de olması gerekir. Varsayılanda renk beden için aynı fiyat işaretli gelsin; özellikle renk
veya bedene fiyat verilecekse farklı girilen satırlara değer girilsin."*

**1. Cariye özel fiyat artık renk/beden taşıyor.** Kural önce "bu cariye hep şu fiyat" demekti; ama
aynı müşteriye siyahı başka, bejı başka fiyata satmak sık (deri maliyeti renge göre değişiyor).
Kuralda renk ve beden **isteğe bağlı**; boş bırakılırsa carinin bütün varyantlarını kapsar.

**Çözümleme sırası (en özel kazanır):** cari+renk+beden → cari+renk → cari+beden → cari →
fiyat grubu → renk+beden → renk → beden → kart fiyatı.

- Aynı cari için farklı kırılımlar **ayrı kurallar**: eşleşme kapsam+değer+renk+beden üzerinden
  yapılıyor, yoksa ikinci kırılım birincinin üzerine yazardı.
- Alış ve satış kuralları zaten ayrı (`tip`); ekranda hangi tipte kural eklendiği seçili tipten
  belli, kural etiketi de kırılımı yazıyor: `Cari: Müşteri B · Siyah / 40`.
- **Eski kayıtlar bozulmuyor:** renk/beden alanı olmayan kurallar cari seviyesinde çalışmaya
  devam ediyor.

**2. Renk+Beden matrisinde "tek fiyat" artık VARSAYILAN AÇIK.** Matris boş açılınca kullanıcı
5 renk × 5 beden = 25 hücreyi tek tek dolduruyordu. Her renk satırı tek fiyat kipinde başlıyor;
farklılaştırmak isteyen o satırın kilidini açıyor. (`undefined` = dokunulmamış → açık; kullanıcı
kapattığında `false` yazılıyor — boş nesne kullansaydık "dokunulmamış" ile "kapatılmış" aynı
görünürdü.)

**Doğrulama:** `birim-fiyat-kurali.js` (yeni birim test, `fiyatBul` dışa aktarıldı) — Siyah/40'ta
1250, Siyah/41'de renk seviyesi 1100, Bej/40'ta cari geneli 1000, alışta 380, carisiz 900 (kart),
kaynak etiketi `Cariye özel (Siyah/40)`, eski kayıt 950. Tam koşu: 75 senaryo + 22 birim testi temiz.
`birim-fisno` beklentileri kısa numara biçimine (17 Eylül) güncellendi.

## 31. TESTLER METİNDEN KURTARILIYOR (19 Eylül, v1.341.0) — 1. TUR

**Kullanıcı:** *"Uygulama büyüdükçe hatalar da büyüyor. Baştan mı başlamak gerekiyor?"*

**Cevap: hayır.** Ölçü: 50.900 satır kaynak, 73 modül, 78 senaryo, 341 sürüm. Sıfırdan yazmak
haftalar sürer ve aynı hataların çoğu tekrar yapılır — çünkü asıl değer kodda değil, koda gömülü
ÖĞRENMEDE: fişsiz hareket olmaz, stok hareketlerden türetilir, yön kuralı tek yerde durur, para
hareketinin karşılığı olmak zorunda.

**Son 20 turdaki "hataların" çoğu UYGULAMA HATASI DEĞİLDİ:** menü adı değişti, düğme İşlemler
menüsüne girdi, fiş numarası kısaldı, çip "Tanımlar" yazdı → senaryolar düğmeyi YAZISINDAN
aradığı için kırıldı. En az 6 kez. Gerçek mantık hatası dörttü ve **dördü de aynı kökten**
geliyordu (aynı gerçeğin birden çok yerde tutulması) — o kök kapatıldı.

**Bu turda yapılan:** sık kullanılan düğmelere kalıcı `data-*` işareti, senaryolar onlara bağlandı.
İşaret arayüz metninden bağımsız: yazı değişse de test kırılmaz.

| İşaret | Düğme |
|---|---|
| `data-kalemlere-ekle` | Kalemlere Ekle (fiş ve sipariş formu) |
| `data-grup-ekle` | Kalem Ekle (sipariş kartı, renk grubu) |
| `data-fis-olustur` | Alış/Satış Fişi Oluştur |
| `data-onay-evet` | Evet, Onayla ve Kaydet |
| `data-islem-kaydet` | İşlemi Kaydet |
| `data-yeni-siparis` · `data-yeni-uretim` · `data-yeni-koli` · `data-koli-kaydet` | ilgili düğmeler |
| `data-denetim-baslat` | Denetimi Başlat |

**Sayı:** metin seçici 126 → **105** (en sık kırılan 21'i dönüştü). Kalanlar tek kullanımlık ve
düşük riskli; sıradaki turlarda azaltılacak.

**Doğrulama:** dönüşüm sonrası tam koşu 77 senaryo temiz — yani davranış aynı, yalnız testlerin
tutunduğu yer değişti.

> **SIRADAKİ (2. madde):** `100-app.jsx` 7.758 satır ve her değişiklik oraya dokunuyor; pencere
> sistemi, veri yükleme ve fiş yolları ayrı dosyalara çıkarılacak.

## 32. `100-app.jsx` BÖLÜNÜYOR (19 Eylül, v1.342.0) — 1. TUR

**Neden:** dosya 7.758 satırdı ve her değişiklik oraya dokunuyordu. Bu yoğunluk somut hatalara yol
açtı: Adım 3'te yan etkilerin yarım kalması, v1.337'de yanlış yerin düzeltilmesi. İkisi de "dosyada
kaybolma" hatasıydı, mimari hata değil.

**Bu turda çıkarılan iki parça:**

**`095-pencereler.jsx` — `usePencereler()`** (68 satır). İlk aday olmasının sebebi: dışarıya
bağımlılığı yok, kendi state'i ve kendi kuralları var. Açık pencereler, aktif pencere, açık
ürün/üretim/sipariş kimlikleri, `pencereAc` / `pencereKapat` / `pencereKucult`. App artık yalnız
sonucu kullanıyor. Kural olduğu gibi korundu: **bir kayıt için tek pencere** — aynı ürün ikinci kez
açılırsa var olan öne getiriliyor, yoksa aynı kartın iki kopyası düzenlenip biri diğerini ezerdi.

**`094-yetki.jsx` — `yetkiVarMi()`**. App'ten çıkarılan ilk SAF kural: girdisi tanımlar, kullanıcı,
modül, işlem; çıktısı evet/hayır. Hiçbir state'e ve React kancasına bağlı değil, tek başına
okunabiliyor. App'te yalnız ince bir sarmalayıcı kaldı.

**Sonuç:** 7.758 → 7.701 satır. Kazanç sayı olarak küçük, ama **yapı kuruldu**: bundan sonraki
parçalar aynı kalıpla (saf fonksiyon ya da custom hook) çıkarılacak.

### 2. TUR — `093-yedekleme.jsx` (v1.343.0)

Otomatik yedek, yedeği uygulama, JSON dosyasından ve tarihten geri yükleme, JSON/Excel dışa
aktarma — **258 satır** App'ten çıktı. `YEDEK_GUN_SAYISI` sabiti ve `yedekDenendi` bayrağı da
oraya taşındı; ikisi de yalnız yedekleme için vardı.

**Neden kanca, saf fonksiyon değil:** bu işler BÜTÜN veriyi okuyup BÜTÜN state'i yeniden yazıyor —
yedek geri yüklemek her tabloya dokunmak demek. Saf fonksiyona çevirmek on bir state ve on bir
setter'ı parametre olarak taşımak olurdu; kanca onları tek nesnede topluyor, App'te tek çağrı kalıyor.

**Kural korundu:** geri yükleme her tabloyu tek tek yazıyor ve her birinin sonucunu bekliyor —
yarım kalan bir geri yükleme, yedeği olmayan veriden kötüdür.

**Sonuç:** `100-app.jsx` 7.701 → **7.453** satır. Üç turda toplam 305 satır çıktı.

**Doğrulama:** `senaryo-json-yedek` ve `senaryo-geri-donus` aynı sonucu veriyor. Tam koşu: 77
senaryo temiz.

### 3. TUR — koli ve fiş defteri (v1.344.0)

**`092-koliler.jsx` — `useKoliler()`**: koli kaydetme, açma, silme. Kurallar korundu — koli kodu
SIRALI (`K-0919001`, barkod okunmazsa insan gözüyle aranabilsin diye) ve silinen koli ÇÖPE gidiyor,
içindeki çiftler stoğa dönüyor (yanlışlıkla silinen koli, paketlenmiş malın kaybolması demekti).

**`091-fisdefter-yaz.jsx` — `useFisDefteriYazma()`**: deftere kayıt yazma, atomik kapı, iptal.
Bu parçanın kendi kuralı en sert olanı: kayıt YAZILAMAZSA türev tablolara (stok, cari, sipariş)
hiç dokunulmuyor; geri alınan fiş silinmiyor, `iptal: true` ile işaretleniyor.

**Dört turun toplamı:** `100-app.jsx` 7.758 → **7.373** satır (385 satır çıktı, beş yeni dosya:
`091` · `092` · `093` · `094` · `095`).

**Doğrulama:** `paketleme`, `sevkiyat`, `mamul-depo`, `fis-defteri`, `bekleyen-yazma` senaryoları
aynı sonucu veriyor. Tam koşu: 77 senaryo temiz.

### 4. TUR — `090-yukleme.jsx` (v1.345.0) — EN BÜYÜK PARÇA

**627 satır** tek seferde çıktı: uygulamanın açılışı. Bulut mu yerel mi okunacak, hangi tablo
hangi sırayla, göç gerekiyor mu, bekleyen yazma defterinde ne var — hepsi orada. Bütün state'leri
bu blok dolduruyordu; App'in içindeyken **her değişiklik açılışın yanından geçiyordu**.

**Korunan kurallar** (dosyanın başına yazıldı):
- Bekleyen yazma defterinde kayıtlı tablo için YEREL kopya esas alınır — yarım kalmış bulut
  yazımı yereldeki güncel veriyi ezmemeli (21. bölümdeki stok tutarsızlığının kök nedeni).
- Bulut okunamazsa yerel kopya kullanılır ve kullanıcıya söylenir; sessizce boş açılmaz.
- Göçler (özel kod, açılış hareketi) okumadan hemen sonra, tek sefer çalışır.

**Taşırken yakalanan tuzak:** `anahtarKumesi` ve `raporlar` bloğun İÇİNDE tanımlıydı, `setErr` ise
bir `catch` değişkeniydi. Otomatik bağımlılık taraması bunları "dışarıdan gelen" sanıp parametre
listesine ekledi; yapı denetimi üçünü de yakaladı ve geri alındı.

**Beş turun toplamı:** `100-app.jsx` 7.758 → **6.753** satır. **1.005 satır** çıktı, altı yeni
dosya: `090` · `091` · `092` · `093` · `094` · `095`.

**Doğrulama:** açılışa en bağımlı senaryolar (`fis`, `siparis`, `oturum`, `bekleyen-yazma`,
`stok-turetme`) aynı sonucu veriyor. Tam koşu: 77 senaryo temiz.

### 5. TUR — `089-carifisi.jsx` (v1.346.0)

Cari kartındaki "Alış Fişi" / "Satış Fişi" ekranından gelen kayıt yolu (**100 satır**) çıktı.
Üç kuralı dosyanın başına yazıldı:
- **Fiş sipariş oluşturmaz** — fiş olmuş bir işin belgesi, sipariş gelecek bir malı anlatır.
- **Tek fiş numarası** bütün kalemleri bağlar, cariye TEK hareket yazılır (ekstre belge bazlı okunur).
- Defter yazılamazsa hiçbir türev tabloya dokunulmaz.

**Altı turun toplamı:** `100-app.jsx` 7.758 → **6.657** satır. **1.101 satır** çıktı, yedi yeni
dosya: `089` · `090` · `091` · `092` · `093` · `094` · `095`.

**Doğrulama:** `fis`, `cok-modelli-fis`, `cikis-fisi`, `fis-defteri` aynı sonucu veriyor.
Tam koşu: 77 senaryo temiz.

### 6.–7. TUR — çekler ve silme zincirleri (v1.347.0)

**`088-cekler.jsx` — `useCekler()`** (177 satır): çek görselleri, çek ekleme, çek üzerindeki
işlemler (ciro, tahsile verme, tahsil, iade, karşılıksız). Kurallar korundu:
- **Her işlem cariye yazılır** — "çeki iade et" deyince çeki VEREN cariye ters hareket gider,
  borcu geri doğar. Eskiden yazılmıyordu; çek geri verilmiş, borç kapalı görünüyordu.
- Çek **görselleri ayrı tabloda**: iki fotoğraf muhasebe kaydının içinde taşınsa her muhasebe
  yazmasında gidip gelirlerdi.
- Fişe bağlı çekte fiş silinmeden durum değiştirilemez (kilit rozeti).

**`087-silme-zinciri.jsx` — `useSilmeZincirleri()`** (178 satır): cari, ürün ve sipariş silindiğinde
ona bağlı ne varsa toplayan zincirler. Bir cariyi silmek yalnız kartı silmek değil — ekstresi,
fişleri, o fişlerin stok hareketleri ve kasadaki karşılıkları da ona bağlı. Yalnız kartı silmek
"yetim" kayıtlar bırakıyor, bir sonraki denetimde açıklanamaz fark olarak çıkıyorlardı.
Zincirin topladığı her şey **çöp kutusuna** yazılıyor.

**Sekiz turun toplamı:** `100-app.jsx` 7.758 → **6.310** satır. **1.448 satır** çıktı, dokuz yeni
dosya: `087` · `088` · `089` · `090` · `091` · `092` · `093` · `094` · `095`.

**Doğrulama:** `cek-bag`, `cek-iade-tahsil`, `cek-gorsel`, `silme` aynı sonucu veriyor.
Tam koşu: 77 senaryo temiz.

> **SIRADAKİ:** Supabase göç bloğu, üretim/hurda telafi, muhasebe bağı temizleme.

**Doğrulama:** tam koşu 77 senaryo temiz — davranış birebir aynı, yalnız kodun durduğu yer değişti.

### AYRIŞMALAR — silme tarafı

| # | ayrışma | durum |
|---|---------|-------|
| 6 | stok hareketi çöpe atılıyor mu | `removeHareketEverywhere` atıyor, `yetimFisTemizle` atmıyor — **korundu** |
| 7 | `muhasebeBagId` karşı kaydı temizleniyor mu | tek hareket yolunda evet, fiş yolunda hayır — **korundu** |
| 8 | sipariş düşümünde cari hareketi kaynak sayılır mı | tek hareket yolunda evet (`cariHareketindenSiparisDus`) — **korundu** |
| 9 | üretim geri alınırken rezervasyon payları serbest bırakılıyor mu | üretim kartı bırakıyor; fiş silme yolu artık üretime hiç dokunamıyor (kilitli) — **konu kapandı** |
| 10 | ara proseste rezervasyon iadesi | atamalı proseste yapılıyor, ara proseste **yapılmıyor** — eski davranış korundu, açık |
| 11 | ara proses son adımsa `stogaEklendiMi` sıfırlanır | eskiden sıfırlanmıyordu, artık sıfırlanıyor — bilinçli, mamul girişi zaten geri alınıyor |

Üçü de çağrı yerinde tek satırlık görünür fark. 6 ve 7 muhtemelen fiş yolunun eksiği (aynı kayıt
iki yerden silinince iki farklı sonuç veriyor); kapatmak kullanıcının çöp kutusunda gördüğünü
değiştirir, o yüzden sorulmadan yapılmadı.

### 3. AÇILIŞ FİŞİ (2'den sonra)

Kullanıcının istediği "her hareket fişe bağlı olsun, stok hareketten türetilsin" tam olarak
şu an mümkün DEĞİL, iki engel var:
- `HAREKET_GECMIS_SINIRI` eski hareketleri kırpıyor,
- açılış bakiyeleri hareket olarak yazılmamış.

Çözüm: her ürün+varyant için bir "açılış fişi" üret (mevcut miktarı tek hareket olarak yaz),
sonra `variants[].miktar` bir ÖNBELLEK olarak kalsın ama onu yalnızca `fisYaz`/`fisGeriAl`
değiştirebilsin. Tutarlılık ekranı önbelleği hareket toplamıyla karşılaştırsın. Açılış fişi
olmadan bu kontrol her üründe yanlış alarm verir.

---

## v1.33 → v1.42'de yapılan (TAMAMLANDI)

**Fiş ekranı (v1.33–1.36.1)**
- Fişte **para birimi**: üstteki alan KAYIT para birimi (hem yeni satırların varsayılanı, hem
  fişin cariye yazılacağı para birimi). Varsayılan carinin kendi para birimi.
- **Satır bazında para birimi**: birim fiyatın YANINDA seçilir (fiyat ile para birimi tek
  bilgidir, ayrı yerlerde sorulması yanlış parada fiyat girilmesine yol açıyordu).
- **Çevrim**: farklı paradaki satırlar kayıt para birimine çevrilir. Kur elle değiştirilebilir,
  Muhasebe'deki güncel kur önerilir. Kur FİŞLE BİRLİKTE saklanır (`kayitKurlari`) — kurlar
  sonradan değişse de fişin tutarı kaymaz. Kur yoksa KAYIT ENGELLENİR.
- **İki kur birden saklanır** (`kur` + `kurHedef`): USD→TL çarpma, TL→USD bölme, USD→EUR ikisi.
  Tek kur saklayıp hep "×" yazmak, bölme yapılan durumda yanlış işlem göstermek olurdu.
- Miktar kutuları kalem satırının sağına alındı; fiş başlığı `auto-fit` ile dar ekranda sarmalanıyor.

**Asorti (v1.34.0)** — yalnızca ölçü tipi "Beden" olan üründe sorulur. Kural BİLEŞENİN İÇİNDE
(iki süzgeç: `olcuTipi` ve asorti oranlarıyla kesişim). Sekiz çağrı yerinin hepsi `olcuTipi`
veriyor; **15. denetleyici** bunu zorunlu tutuyor.

**Fiş gösterimi (v1.37–1.39)**
- Fiş cariye **kalem kalem** yazılıyor (tek toplu hareket değil), hepsi aynı fiş numarasıyla.
- `FisKalemMatrisi`: malzeme satır, beden sütun. **Cari ekstresi ve Fişler ekranı AYNI bileşeni**
  kullanıyor — ikisi ayrı yazılmıştı ve ayrışmışlardı.
- BR. FİYAT sütunu KULLANICININ GİRDİĞİ fiyatı gösterir; KUR sütunu işlemi yazar
  (`× 56 = 112 ₺`).
- Ekstrede fiş kimliği (fiş no + tür + çek/senet) TARİHİN ALTINA taşındı; fiş 3 satırdan 2'ye indi.
- Ödeme şekli rozeti yalnızca Çek/Senet'te: fiş cariye BORÇ yazar, kasadan para çıkarmaz;
  "Nakit" etiketi ödenmiş izlenimi veriyordu. (Ödeme şekline göre kasa hareketi açmak AYRI bir
  iş, bilinçli olarak yapılmadı.)

**Bulunan ve düzeltilen KÖK SEBEPLER**
1. **Cari hareketlerinde `beden`/`miktar`/`birim` buluta HİÇ yazılmıyordu** — tabloda o sütunlar
   yok, `ek` alanı boş gönderiliyordu. Yerelde görünüyor, yenileyince kayboluyordu. Artık `ek`
   içinde gidip okurken açılıyor. Sipariş fişlerini de etkiliyordu.
2. **Fişler ekranı miktarları İKİ KATI gösteriyordu** — bir fiş hem stok hem cari hareketi taşır,
   ikisi de aynı ürün+renk+beden'i yazar; ekran ikisini birden topluyordu. Mal hareketi artık
   yalnızca stok tarafından sayılıyor, birim fiyat cari tarafından taşınıyor.
3. **`AF-`/`SF-` fiş önekleri tanınmıyordu** — bütün fişler "Diğer" olarak listeleniyordu.
4. **Fişler ekranındaki toplam her zaman `₺` yazıyordu** — dolar fişi "10 ₺" görünüyordu.
5. **Sipariş teslim yolu `birimFiyat` yazmıyordu** — matriste BR. FİYAT ve TUTAR tire çıkıyordu.
6. **Fiş silinince siparişin `karsilanan`ı geri düşmüyordu** (v1.40.0) — mal stoktan çıkıyor,
   borç siliniyor ama sipariş "Tamamlandı" kalıyor ve kalem bir daha teslim alınamıyordu.
   Tek hareket silen yol bunu yapıyordu, fişin tamamını silen yol yapmıyordu.
7. **Fiş yolunda stok ve cari hareketi AYRI kimlik alıyordu** (v1.41.0) — ekstreden bir satır
   silindiğinde stok tarafı bulunamıyor, borç siliniyor ama MAL STOKTA KALIYORDU. Sipariş teslim
   yolu bu bağı kuruyordu, fiş yolu kurmuyordu. Artık kalem başına tek kimlik, iki tarafta ortak.
8. **Ekstrede silme grubun yalnızca İLK hareketini siliyordu** — kullanıcı aynı fişi silmek için
   beden beden onay vermek zorunda kalıyordu. Artık tek onayla fişin tamamı, çöp kutusuna da düşer.

**v1.42.0 — SAĞLAM YAPI (yeni)**
- **Veri Tutarlılık Denetimi** (Tanımlar → Veri Denetimi): kodu değil VERİYİ denetler, hiçbir
  şeyi değiştirmez. Yedi kontrol: sipariş karşılananı ↔ stok hareketleri, mal var/cari yok,
  stok–cari kimlik bağı, tutar ↔ miktar×fiyat, muhasebe eş kaydı, fişsiz hareket, yetim referans.
  Motor: `veriTutarliligiDenetle`, ekran: `VeriDenetimiEkrani`.
- **16. denetleyici `kapidenetim.js`**: hareket yazan/silen yerleri SAYAR ve adlarını listede
  tutar. Listede olmayan yeni bir yazıcı çıkarsa bulgu verir. Şu an 10 yazıcı, 3 silici.
  `SAYIM=1 node kapidenetim.js atolye-erp.jsx` ile tam envanter alınır.

---

## v1.32.0'da yapılan — Cari'de Alış/Satış FİŞİ ekranı (TAMAMLANDI)

Cari kartındaki "Alış" ve "Satış" düğmeleri artık **çok kalemli fiş ekranı** açıyor. Düzen
bilinçli olarak Satın Alma sipariş formuyla aynı: ürün seç, renk seç, bedenlere miktar yaz,
"Kalemlere Ekle". Kullanıcı iki ekran öğrenmiyor.

**FARK — sipariş OLUŞMAZ.** Sipariş "gelecek" bir malı anlatır (yolda, teslim alınacak); fiş
ise OLMUŞ bir işlemin belgesidir (mal elde, borç doğdu). Kayıt doğrudan stok hareketi + cari
hareketi olarak yazılır, Satın Alma listesine düşmez.

**Neden değişti:** önceki panel tek ürün + tek renk alıyordu. Bir tedarikçiden aynı anda üç
malzeme alındığında üç ayrı kayıt, üç ayrı fiş numarası çıkıyor ve o alışverişin tek bir belge
olduğu bilgisi kayboluyordu.

Kararlar:
- **TEK FİŞ NUMARASI** bütün kalemleri bağlar (`AF-` alış, `SF-` satış). Fiş no elle
  girilebilir — tedarikçinin gerçek irsaliye numarası varsa ona bağlanmak daha değerli.
  Boş kalırsa `fisNoUret` üretir (fişsiz hareket olmaz).
- **Cari tarafına TEK hareket** yazılır, kalem başına değil: cari ekstresi belge bazlıdır,
  üç satır görmek ekstreyi okunmaz yapardı. Tutar toplam, açıklama kalem sayısını taşır.
- **Fiyat `fiyatBul` ile** geliyor, ürün kartındaki ham alanla değil — o alan cariye özel fiyat
  grubunu görmez ve aynı müşteri için iki ekranda iki farklı fiyat çıkardı.
- **Eksi stok kırpılmaz**: satışta stok eksiye düşebilir, `Math.max(0,…)` yok.
- **Kalem listesi MATRİS**: satır = ürün+renk, sütun = beden.
- **Kaydettikten sonra pencere kapanır** — fiş tek seferlik bir belge; açık bırakmak aynı fişin
  ikinci kez kaydedilme riskiydi.
- Ekran cari kartının İÇİNDE değil ÜSTÜNDE (pencere olarak) açılıyor; çok kalemli form karta
  sığmıyor ve kullanıcı doldururken cari listesini kaybetmemeli. Aynı cari+tip için ikinci kez
  basılırsa yarım kalan fiş korunur.
- Stok etkisi olmayan parasal hareket için "Ürünsüz kayıt" bağlantısı duruyor (istisna).

**Kaldırılanlar:** `cariUzerindenStokIslemi`, `onStokIslemi`, CariCard'daki panel state'leri ve
JSX'i (86 satır). Yenisiyle DEĞİŞTİRİLDİ, yanına eklenmedi.

**Test:** Playwright/Chromium'da tüm uygulama çalıştırılıp fiş elle dolduruldu.
Doğrulananlar: iki ürünlü/üç bedenli alış fişinde matris düzeni ve 600 ₺ toplam; stok
4→14, 1→6, 10→13; üç stok hareketinin AYNI fiş numarasını taşıması; tek cari borç kaydı;
kayıttan sonra pencerenin kapanıp sekmenin kalkması; satışta stoğun −7'ye düşüp KIRPILMAMASI;
"Muhasebe" defterinde iki eş kayıt (Genel + Resmi) çıkması.

---

## v1.31.1'de yapılan — varyant silmesi buluta gidiyor (TAMAMLANDI)

**Kök sebep:** `varyantlar`ın kimliği tek bir `id` sütunu değil, `urun_id+renk+beden`.
Uygulamanın fark hesabı için ürettiği `a|b|c` dizesi veritabanında YOK, dolayısıyla
`id=in.(...)` hiçbir satıra denk gelmiyor. Bu yüzden şemada `cakisma` olan tablolar
`!cocuk.cakisma` koşuluyla silmeden BÜSBÜTÜN muaf tutulmuştu — silinen renk/beden yerelden
gidiyor, ekrandan kayboluyor, buluttan hiç kalkmıyor, yenileyince geri geliyordu.

**Çözüm:**
1. `tabloFarki()` artık `silinenKayitlar` da döndürüyor (yalnızca kimlik değil, kaydın kendisi).
   Sütun değerleri başka hiçbir yerde durmuyor — kayıt gitmişse tek kaynak fark belleği.
   `JSON.parse` bilinçli olarak KORUMASIZ: yutulursa silme sessizce atlanır, yani düzeltilen
   hatanın aynısı geri gelir.
2. `supabaseSilBilesik(tablo, alanlar, kayitlar)` — sütun değerleriyle satır satır siler.
   Alan listesi `cakisma` dizesinden okunuyor (ikisini ayrı tutmak, birini güncelleyip
   diğerini unutma riskiydi).
3. Koşul biçimi **`in.("deger")`**, `eq.deger` değil. `in.()` bu projede zaten kanıtlanmış yol
   (`supabaseSil` onu kullanıyor) ve tırnak kuralı orada nettir: ayırıcı sayılıp soyulur.
   Virgüllü renk adları ve bedensiz malzemenin boş dizesi (`in.("")`) böylece belirsizlik
   bırakmıyor. `eq.` tarafında tırnak değerin PARÇASI sayılır — v1.11–v1.18 felaketinin sebebi.
4. NULL sütun için `is.null` (eşitlik NULL'a denk gelmez).

**Tek istekte birleştirilmedi:** `or=(and(...),...)` mantık ağacının tırnak kuralları `eq.`ten
farklı; yanlış kurulmuş bir DELETE hiçbir satıra denk gelmez ve tam da düzeltilen hata gibi
sessiz kalır. Varyant silme seyrek, istek sayısı sorun değil.

**14. denetleyici genişletildi** — şemada `cakisma` varsa: `supabaseSilBilesik` bulunmalı,
`!cocuk.cakisma` koşulu silme dalını atlamamalı, `tabloFarki` silinen kayıtları döndürmeli.
Ayrıca tırnaklı `eq.` kullanımı ayrı bir bulgu. Eski hata geri konarak denetleyicinin YAKALADIĞI
doğrulandı.

**Test:** `/home/claude/test/t12.js` — gerçek `TABLO_SEMA` + `tabloFarki` + `supabaseSilBilesik`
çalıştırılıp yalnızca `fetch` sahtelendi; "hangi istekler gidiyor" doğrudan okundu.
Doğrulananlar: iki varyant silinince iki hedefli DELETE; virgüllü renk adının doğru kodlanması;
bedensiz satırın boş dizeyle eşleşmesi; değişiklik yokken SIFIR istek (yazma seli yok);
renk adı değişince yeni satırın yazılıp eskisinin silinmesi; ürün silinince önce varyantların
sonra ürünün silinmesi.

---

## v1.30.0 → v1.31.0'da yapılan — Depo'daki iki buton (TAMAMLANDI)

Depo → stok durumu matrisinde her satırın sonunda iki buton var. İkisi de YENİ EKRAN
TASARLAMIYOR ve SEKME DEĞİŞTİRMİYOR: hedef ekranın kendisi, var olan pencere yöneticisiyle
Depo'nun ÜSTÜNDE açılıyor. "−" küçültür, "Kapat" kapatır; ikisinde de altta Depo aynı yerde,
aynı satırda duruyor. (Önce sekme değiştiriliyordu — v1.31.0'da pencereye çevrildi, çünkü
sekme değişince kullanıcı Depo'dan kopuyor ve hangi satırda olduğunu hatırlamak zorunda kalıyordu.)

**1. "Satın Al"** — yalnızca açığı olan satırda. Pencerede `HammaddeIhtiyacSekmesi` çizilir,
liste o malzemeye daraltılır (`hedefHammadde.odakla` → arama kutusu adla doldurulur) ve satın
alma paneli açık gelir.

**2. "Alış Fişi"** — her satırda. Pencerede `SiparisModule sabitTip="Alış"` çizilir, yeni alış
formu ürün/renk/beden/miktar dolu açılır.

Zincir: `StokDurumuMatrisi.onSatinAlPlanla|onAlisFisi` → App `hammaddeyiPlanla|alisFisiAc` →
`pencereAc("depo-satinal"|"depo-alis", …)` → App'teki pencere çizimi.

Kararlar (hepsi bir sebeple):
- **Pencere `display:none` ile gizleniyor, unmount EDİLMİYOR.** Küçültünce sökülseydi yarım
  doldurulmuş alış formu silinirdi.
- **Aynı satırın penceresi açıksa yeniden kurulmuyor, öne getiriliyor** (`depoPencereAc`).
  `pencereAc` açık pencerenin verisini bilinçli tazeler (bayat ekstre sorunu); burada bu,
  girilen miktarları sessizce sıfırlardı.
- **Alış penceresine pencere yöneticisi propları VERİLMİYOR.** İçeriden ikinci bir pencere
  açılsaydı, o pencere bu pencerenin İÇİNDE çizilecek; aktif pencere değişince kap gizlendiği
  için içerideki de görünmez olurdu. Tam ekran sipariş ve fiş yazdırma, Satın Alma sekmesinden.
- **Kalem otomatik EKLENMİYOR.** Form dolu gelir, kullanıcı "Kalemlere Ekle" der.
- **Cari doluysa ezilmiyor** — `urunSec` ile aynı kural.
- **`satinAlmaAc` tek yola indirildi**: başlangıç miktarları render sırasındaki renk grubundan
  değil, doğrudan `mrpSonuclari`'ndan okunuyor.
- **`sadeceEksik`** yalnızca o hammaddenin hiç eksiği yoksa kapatılıyor.
- **MRP'de karşılığı yoksa toast uyarıyor** — MRP sadece bekleyen satış siparişlerini sayar.
- Buton tıklaması satırı açıp kapatmıyor (`stopPropagation`).
- `StokDurumuMatrisi`'nde iki prop da isteğe bağlı; verilmezse işlem sütunu çizilmez.

**Nasıl test edildi — bu kurulum tekrar kullanılabilir.**
`atolye-erp.jsx` TypeScript ile CJS'e çevrilip (lucide-react/xlsx sahte modüller, React yerel
`node_modules_global`'dan) tek bir HTML'e paketlendi ve Playwright/Chromium'da TÜM UYGULAMA
gerçekten çalıştırıldı. `window.storage` bellek içi sahte bir depoyla değiştirilerek veri
tohumlandı (ağ kapalı, Supabase erişilemiyor — uygulama yerel kopyaya düşüyor).

Doğrulananlar: butonların taşıdığı yük; açığı olmayan satırda "Satın Al" çıkmaması; sütun
sayılarının başlıkla tutması; pencerenin açılması; panelin net eksiği (16) ve rezervasyon
payını (SP-1: 16) getirmesi; küçült → Depo'nun altta görünmesi, sekmenin kalması; sekmeden
geri açınca panelin durması; Kapat → sekmenin kalkması; alış formunun ön dolgulu açılması
(tedarikçi/ürün/renk/fiyat/miktar) ve kalemi OTOMATİK EKLEMEMESİ; elle girilen miktarın
küçült-geri aç ve aynı satıra tekrar basma sonrası KORUNMASI; sekmenin çoğalmaması.

Dosyalar: `/home/claude/test/` → `derle.js` → `paket-test.js` → `t*.js`.

---

## Proje nedir

Bir ayakkabı atölyesi için tek dosyalık React ERP. 5 bilgisayar, 3 kullanıcı.
Modüller: Stok, Depo, Sipariş, Satın Alma, Üretim, Planlama, Cari, Fiş, Muhasebe, Günlük, Tanımlar.

**Kaynak:** `atolye-erp.jsx` — ~29.900 satır, tek dosya. Yorumlar Türkçe ve kararların
*gerekçesini* anlatıyor (ne yaptığını değil). Kodu okurken bağlamı bu yorumlar verir.

**Kullanıcı telefondan çalışıyor.** Derleme, denetim ve paketleme tamamen Claude'un ortamında
yapılır; kullanıcı yalnızca HTML dosyasını indirip açar. Kısa ve doğrudan Türkçe konuşur,
sorunları ekran görüntüsüyle bildirir. **Belirtiyi değil kök sebebi düzeltmek ister.**

---

## DEĞİŞMEZ KURAL — YENİ DEFTER, İKİ KAPIYA BİRDEN BAĞLANIR

*(Kullanıcı kararı, 2 Eylül: "bu ve bundan sonraki tüm yaptıklarımız böyle olsun.")*

Bu projede AYNI HATA beş kez tekrarlandı. Her seferinde yeni bir "defter" (kayıt türü) eklendi,
YAZMA yoluna bağlandı, GERİ ALMA yoluna bağlanmadı:

| defter | belirti | düzeltildiği sürüm |
|---|---|---|
| stok + cari kimlik bağı | ekstreden silinen satırın malı stokta kalıyordu | v1.41.0 |
| sipariş `karsilanan` | fiş silindi, sipariş "Tamamlandı" kaldı, kalem bir daha alınamadı | v1.40.0 |
| üretim ilerlemesi | işçilik fişi silindi, proses hâlâ "teslim alındı" | v1.45.0 |
| çek kaydı | ödemesi silinmiş çek vadesi gelince hatırlatılıyordu | v1.80.0 |
| koli (sevkiyat) | fiş geri alındı ama koli "sevk edildi" kaldı, bir daha okutulamıyordu | v1.83.0 — **kural uygulanarak baştan bağlandı** |
| varyant barkodu (ALAN) | atanan kod her açılışta siliniyordu; aynı kod başka varyanta düşebiliyordu | v1.136.0 — **alan tümden kaldırıldı, yerine kalıcı kod şeması** |
| çek (ciro + giriş bağı) | ciro fişi silindi, çek "Ciro Edildi" kaldı; işlem görmüş çekin girişi silinince çek sessizce gidiyor, ciro karşı caride yetim kalıyordu; listeden silinen çekin tahsilatı ekstrede kalıyordu | v1.226.0 — v1.80.0'da yalnız GİRİŞ yönü bağlanmıştı, işlemler (7z-11) eklenince bağlanmadı |

**KURAL:** yeni bir kayıt türü eklendiğinde iş, o kayıt yazıldığında bitmiş SAYILMAZ. Bitmesi için:

1. **Yazma:** kayıt `fisYaz` üzerinden ya da onun bildiği bir alandan doğar.
2. **Geri alma:** `fisGeriAl` o kaydı da geri alır — bağ açık bir kimlikle kurulur
   (`hareketId`, `uretimId`, `siparisId` gibi), metin eşleştirmeyle değil.
3. **Çöp:** silinen kayıt çöp kutusuna düşer (`copaAt`), ne olduğu okunabilir bir özetle.
4. **Bulut:** hem YAZMA hem OKUMA yolu. Yeni tekil/alt tablo gerekiyorsa SQL'i hazırla ve
   kullanıcıya ver; açılışta buluttan okumayı da bağla. Denetleyiciler bunu göremez. Yazma
   eksikliği ilk denemede uyarı verir, OKUMA eksikliği ancak ikinci bir cihazda ortaya çıkar.
5. **Test:** silme senaryosu YAZILIR — "eklendi mi" değil, **"silinince gitti mi"** ölçülür.
   Yazma testi geçip silme testi olmayan her defter, yukarıdaki tablonun bir sonraki satırıdır.

**KURAL YALNIZCA DEFTERLER İÇİN DEĞİL — KALICI ALANLAR İÇİN DE GEÇERLİ (6 Eylül).**
Altıncı satır yeni bir kayıt türü değil, mevcut bir kayda eklenen bir ALAN'dı (`variant.barkod`).
`TABLO_SEMA` sütunları AÇIKÇA sayıyor; sayılmayan alan sessizce düşüyor ve bulut kopyası her
açılışta yereli ezdiği için alan kayboluyor. Bu varsayım bu projede iki kez yanlış çıktı
(`olusturuldu` v1.x, `barkod` v1.136.0).

**Kalıcı olması gereken her yeni alan için:** `TABLO_SEMA`ya sütun ekle, okuma tarafında
(045-oku) karşılığı olduğunu doğrula, gerekiyorsa SQL hazırla ve kullanıcıya ver. Denetim 7 bunu
göremiyor — şemadaki sütundan uygulamadaki alana bakıyor, hiç sütunu olmayan alanı göremiyor.

Bu kontrol yapılmadan "tamamlandı" denmez.

## Çalışma yöntemi

```sh
./yap.sh                         # birleştir → 17 denetim → ölü kod → paketle → derleme doğrula
./test/kosu.sh                   # gerçek tarayıcıda altın çıktı testleri (davranış değişti mi?)
```

Tek komut yeterli. Adımları tek tek çalıştırmak gerekirse:

```sh
node birlestir.js src atolye-erp.jsx   # src/ -> tek dosya (+ satır haritası)
./kontrol.sh atolye-erp.jsx            # 17 denetim (satırlar parça adıyla raporlanır)
./oludenetim.sh atolye-erp.jsx         # kullanılmayan prop/state
node paketle.js atolye-erp.jsx atolye-erp-vX.Y.Z.html
node konum.js 19540                    # birleşik satır -> 205-muhasebe.jsx:265
```

- **Yamalar `src/` içindeki parçaya uygulanır**, birleşik dosyaya DEĞİL — birleşik dosya üretilir,
  bir sonraki `birlestir.js` onu ezer.
- Yamalar Python betiğiyle, **içerik eşleştirmesiyle** (satır numarası kayar).
  Her yamada `assert s.count(eski) == 1`.
- **Paketledikten sonra çıktının DERLENDİĞİNİ doğrula** — bu adım olmadan "denetimler temiz"
  denip açılmayan dosya gönderildi (v1.17.1):
  ```sh
  node -e 'const fs=require("fs");let k=fs.readFileSync("X.html","utf8")
    .match(/<script type="module">([\s\S]*?)<\/script>/)[1]
    .replace(/^import[\s\S]*?from "[^"]+";\s*$/gm,"");
    try{new Function(k);console.log("OK")}catch(e){console.log("HATA:",e.message);process.exit(1)}'
  ```
- Değişikliği göndermeden önce mantığı **izole çalıştırıp test et**.

### TARAYICI TEST KURULUMU (kurulu, tekrar kullanılabilir)

Ağ kapalı: CDN yok, React yerel kurulumdan (19.x) geliyor. Uygulama tarayıcıda 18.3.1 kullanır;
bu testlerde davranış farkı görülmedi. React 19'da UMD yapısı olmadığı için CJS dosyaları küçük
bir `require` kabuğuyla tek HTML'e gömülüyor.

```
test/
  derle.js         atolye-erp.jsx -> erp.cjs (TypeScript ile JSX derleme, saf fonksiyonları dışa aktarır)
  paket-test.js    erp.cjs + React -> test.html   (girdi/çıktı argüman alır)
  ortak.js         Chromium'da açar, window.storage'ı sahte bellek deposuyla değiştirir
  tohum.js         iki ürün, üç cari, iki kalemli (TRY + USD) alış siparişi,
                   TESLİM ALINMIŞ bir üretim (hammadde çıkışı + işçilik + mamul girişi fişleriyle)
  senaryo-fis.js      cariden alış + satış fişi kesme     -> altin-fis.txt
  senaryo-siparis.js  siparişten kısmi teslim alma        -> altin-siparis.txt
  senaryo-silme.js    teslim alınan fişi ekstreden silme  -> altin-silme.txt
  senaryo-uretim.js   Fişler kilidi + üretimden geri alma -> altin-uretim.txt
  senaryo-cari-kart.js cari kartı açılış görünümü         -> altin-cari-kart.txt
  birim-fisyaz-gerial.js  fisYaz/fisGeriAl tersine çevrilebilirlik (tarayıcısız)
  senaryo-uretim.js   üretim kartından geri alma + Fişler'deki kilit  -> altin-uretim.txt
  senaryo-cari-kart.js cari kartı açılışta düzenleme alanlarını gizler -> altin-cari-kart.txt
  senaryo-cikis-fisi.js     fiş düğmesi üstte + aynı fişe çok satır      -> altin-cikis-fisi.txt
  senaryo-cok-modelli-fis.js 3 modelli siparişte 2 modeli tek fişte satma -> altin-cok-modelli-fis.txt
  senaryo-recete-oneri.js   öneri listesi kırpılmıyor (geniş + dar ekran) -> altin-recete-oneri.txt
  birim-fisyaz-gerial.js  tarayıcısız: fisGeriAl gerçekten fisYaz'ın tersi mi
  senaryo-depo-koprusu.js  IndexedDB göçü ve büyük yazma  -> altin-depo-koprusu.txt
  bos.html         köprü testi için boş sayfa (localStorage about:blank'te yasak)
  kosu.sh          hepsini çalıştırır, altın çıktılarla karşılaştırır
```

**Altın çıktı yöntemi:** senaryo çalışır, ortaya çıkan stok/cari/sipariş kayıtları
normalleştirilir (kimlikler `#1`, zamanlar `<zaman>`, üretilen fiş noları `<fisno>`) ve
`altin-*.txt` ile karşılaştırılır. Fark = davranış değişti.
- Anahtar sırası okunabilirlik için sıralanıyor (sıra davranış değiştirmez, bulut eşlemesi ada
  göre). Yine de gözden kaçmasın diye **sırasız hâlin sha özeti** de basılıyor.
- Refaktörün doğruluğunu kanıtlamak için ESKİ paket de aynı senaryoyla çalıştırılabilir:
  `node test/derle.js eski.jsx test/erp-once.cjs && node test/paket-test.js test/erp-once.cjs test/once.html`
  sonra `TEST_HTML=.../once.html node test/senaryo-fis.js`. Tek kapı işi böyle doğrulandı.
- Altın çıktı DEĞİŞTİRİLİRSE gerekçesi bu nota yazılır; sessizce güncellemek testi anlamsız kılar.

---

## Denetleyiciler (17)

| # | Denetim | Yakaladığı hata |
|---|---------|-----------------|
| 1 | sözdizimi | — |
| 2 | TDZ | tanımdan önce kullanım |
| 3 | tanımsız isim **+ çift tanım** | prop/import unutma; aynı adı iki kez tanımlama |
| 4 | JSX yorum sızıntısı | `//` ekrana basılır |
| 5 | ifade konumunda JSX yorumu | `{} is not a function` |
| 6 | iç içe buton | geçersiz HTML |
| 7 | gidiş-dönüş alan eşlemesi | sütun yazılıp okunmaması |
| 8 | hareketsiz stok **+ sıfır kırpması** | defter ayrışması; `Math.max(0,…)` ile sessiz miktar kaybı |
| 9 | katman atlama | `guvenliYaz` ile buluta gitmeme |
| 10 | sürüm koşulu | kilitleme delikleri; `eq.` tırnak hatası |
| 11 | matris kuralı | düz malzeme·beden listesi |
| 12 | fişsiz hareket **+ işçilik fişi eşleşmesi** | izsiz hareket; `-İşçilik` ekini tanımayan kod |
| 13 | silme sonucu | "yapıldı" deyip yapmama (10 borç kayıtlı, `BORC=1` ile listelenir) |
| 14 | alt tablo belleği | alt kayıt silmelerinin buluta gitmemesi |
| 18 | bayat okuma | A set sonrası · B await sonrası · C eksik bağımlılık (efektte yalnız sonradan çalışan) · T tanımdan önce (12 zararsız borç; `BORC=1`) |

**Yeni bir hata sınıfı çıkarsa denetleyici yazmak, hatayı elle aramaktan iyidir.** Kural
konulduğunda muafiyet sessizce geçilemez, gerekçesiyle etiketlenir (`matris-muaf:`, `fis-muaf:`,
`kirpma-muaf:`, `sonuc-muaf:`).

---

15. **asorti ölçü tipi** (`asortidenetim.js`) — `AsortiUygulaKontrolu` `olcuTipi` propunu almalı,
    içindeki iki süzgeç (ölçü tipi + oran eşleşmesi) durmalı, her çağrı yeri `olcuTipi` vermeli.
16. **hareket kapıları** (`kapidenetim.js`) — hareket yazan/silen yerleri sayar ve adlarını
    listede tutar. Listede olmayan yeni bir yazıcı = bulgu. Ölü ad kalırsa da uyarır.
    `SAYIM=1 node kapidenetim.js atolye-erp.jsx` tam envanteri verir.
    **Bu denetleyici hatayı değil, hatanın SEBEBİNİ kovalıyor: kopya sayısını.**

---

## Proje kuralları

**MATRİS KURALI** — bir listede tek değişken boyut BEDEN ise ve hücrede tek sayı varsa,
liste matris çizilir: malzeme satır, beden sütun. `<IhtiyacMatrisi kalemler={…} />`.
İstisna `matris-muaf: <gerekçe>` ile etiketlenir. 11. denetleyici izler.

**FİŞSİZ HAREKET OLMAZ** — stok ya da cari, elle ya da sistem: her hareketin fiş numarası var.
`fisNoUret(onEk)` üretir (`MH-20260830-KX64BC`). Cari hareketleri iki huniden geçiyor
(`addCariHareketFromStok`, `addHareket`); güvence orada, çağıranın hatırlamasına bağlı değil.

**İŞÇİLİK AYRI FİŞ** — `1001-Kesim` hammadde çıkışı, `1001-Kesim-İşçilik` işçilik,
`1001-Kesim-Giriş` mamul girişi. Eşleşme `fiseAitCariHareketiMi()` içinde toplandı.

**EKSİ STOK KIRPILMAZ** — eksi stok bir görüntü sorunu değil, "girişlerin eksik" bilgisidir.

---

## Altyapı

**Supabase** (proje Nds, Frankfurt, ücretsiz katman)
`https://mqdgucoomgqcvhvgixbl.supabase.co` · publishable anahtar kodda gömülü (güvenli).
**Secret anahtar ASLA koda girmez** (bu hata iki kez yapıldı).

**Çalıştırılmış SQL:** `barkod-semasi.sql`, `satis-para-birimi.sql`, `sezon-yili.sql`, `cari-kodu.sql`, `cek-gorselleri.sql` (6 Eylül), `supabase-sema.sql`, `rls-duzeltme.sql`, `muhasebe-tablosu.sql`,
`renk-kimlik-tablo.sql`, `surum-sutunu.sql`, `gunluk-tablosu.sql`, `gunluk-silme.sql`,
`cari-zaman.sql`, `siparis-olusturuldu.sql`

**Bekleyen SQL:** `rls-kimlik.sql` — 2. aşama, ÇALIŞTIRILMADI (aşağıya bak).

---

## Bugün çözülen kök sebepler (tekrarlamamak için)

1. **`eq.` koşulunda tırnak** — `id=eq."abc"` hiçbir satıra denk gelmiyordu. PostgREST'te
   `in.()` tırnağı ayırıcı sayıp soyar, `eq.` değerin parçası sayar. v1.11–v1.18 arası HİÇBİR
   güncelleme buluta gitmiyordu; kilitleme her yazmayı sahte çakışma sanıyordu.
2. **Alt tablo fark belleği kurulmuyordu** — açılışta yalnızca ana tablolar. İlk silme işlemi
   buluta hiç gitmiyordu, yenileyince geri geliyordu. `tabloBaslangicTam()` çözdü.
3. **`Math.max(0, …)` kırpması** (8 yer) — eksi stokta hareket geri alınınca miktar buharlaşıyordu.
4. **Çakışmada alt tablolara yazmaya devam** — ana satır korunurken varyant eziliyordu.
5. **`olusturuldu` şemada yoktu** — uygulama yazıyor, buluta gitmiyordu.
6. **Bileşik anahtarlı alt tablo silmeden muaftı** — `varyantlar`ın `id` sütunu yok;
   `id=in.()` hiçbir satıra denk gelmiyordu, silme dalı da komple atlanıyordu (v1.31.1).
7. **`_yazmaKuyrugu` çift tanım** — modül hiç çalışmadı, ekran "Yükleniyor…"da kaldı.

---

## Bekleyen işler

1. ~~Dosyayı modüllere böl~~ — TAMAMLANDI (31 Ağustos, yukarıda ayrıntılı)
2. ~~Tek kapı: `fisYaz` / `fisGeriAl`~~ — YAPILDI (9 yazıcı, 1 silici). Kalan yazıcılar: üretim (2),
   elle giriş (3), köprü (1), onarım (2) — bunlar ticari fiş değil, ayrı bir iş.
3. ~~Açılış fişi~~ — **YAPILDI (6 Eylül, v1.159.0, bkz. 7v).** Stok önbelleğinin hareketlerle
   açıklanamayan kısmı tek satıra dökülüyor; tutarlılık denetimi artık anlamlı.
3b. ~~Satış/alış fişi yön göçü~~ — **KAPANDI (2 Eylül):** veri test verisi, düzeltilmeyecek.
   Gerçek kullanıma geçerken temiz başlangıç yapılacak.
4. **Kimlik doğrulama 2. aşama** — `rls-kimlik.sql` YENİDEN YAZILDI (v1.257.0, bkz. 8u), çalıştırılmadı; önkoşullar dosyada
4a. ~~Uygulamadan Supabase kullanıcısı açmak~~ — **YAPILDI (v1.255.0, 8t)**; fonksiyonun yüklenmesi kullanıcıda
5. ~~13. denetimin borcu~~ — KAPANDI (v1.410.0): 90 yer `yazimiIzle`, denetim artık her yerde hata
6. ~~Ödeme şekline göre kasa/banka hareketi~~ — **YAPILDI (6 Eylül, v1.160.0, bkz. 7y).**
7. ~~Kapanış state'i~~ — KAPANDI: fiş defteri (v1.406.0), eksik bağımlılık (v1.407.0), efektler (v1.408.0)
8. **Sayım (stocktake) ekranı** — Depo > Okut'un SAY kipi olarak yapılacak (v1.411.0 kararı)
9. **Ölçekleme (3-6 ay)**

---

## Sık karşılaşılan hata kalıpları

1. JSX gövdesinde `//` → ekrana basılır · JSX ÖZNİTELİK arasında `{/* */}` → sözdizimi hatası
2. `<option>` değeri listede yoksa tarayıcı **ilk seçeneği** gösterir → sessiz veri kaybı.
   Kayıtlı değer listede yoksa "(listede yok)" seçeneği olarak eklenmeli.
3. `type="number"` + `step="0.01"` → 0,0125 gibi reçete miktarlarını reddeder. Reçetede `step="any"`.
4. Bir alanı hem yazma hem okuma tarafında eşlemeyi unutmak → sessiz veri kaybı
5. Biçim değiştirirken (fiş no, açıklama metni) ONU AYRIŞTIRAN yerleri güncellemeyi unutmak.
   Bugün iki kez oldu: açıklama regex'i ve geri alma fiş eşleşmesi.
6. Yamalarda satır numarası kayar; içerik eşleştirmesi kullan.
7. **Yeni bir alan adı seçmeden önce `grep -rn "\.<ad>\b" src/` yap.** `renk.kod` zaten doluydu
   (kullanıcının ton kodu) ve barkod kodu oraya yazılınca kullanıcı verisi ezilecekti (6b).
8. **Kalıcı olması gereken alan `TABLO_SEMA`da yoksa sessizce düşer** ve bulut okuması yereli
   ezdiği için her açılışta kaybolur. Denetim 7 bunu göremez (6b).

---

## Claude'a not

Kullanıcı bugün iki kez uyardı: **"emin olmadan işlem yapma"** ve **"beni dinlemiyorsun"**.
Haklıydı. Yapılan hatalar:
- "Tarih yanlış" denince saati gösterimden kaldırdım — belirtiyi sildim, sebebi değil.
- Kullanıcının yaptığını söylediği SQL'leri tekrar tekrar sordum.
- Bir alanı değiştirirken onu kullanan başka yerleri aramadım (iki regresyon).

Kural: **değiştirmeden önce o alanı/biçimi kullanan her yeri ara.** Emin değilsen yapmadan
önce sor, sonra değil. Söylenen bir şeyi tekrar sorma.

### 31 Ağustos oturumu

Kullanıcı **"hız çok tehlikeli, sağlam adımlarla ilerleyelim"** dedi. Titiz mod: her değişiklik
tarayıcıda gerçekten çalıştırılıp tıklanarak doğrulanıyor. Denetleyici + derleme YETERLİ DEĞİL —
bu oturumda bulunan üç gizli hatanın hiçbirini denetleyiciler yakalayamazdı.

Kullanıcı haklı bir tespit yaptı: **"aynı şeyi 5 kere yapıyoruz"**. Sebebi yapısal — fişi yazan
10 ayrı yer var, biri düzeltilince diğerleri ayrışıyor. Çözüm sırası yukarıda (SIRADAKİ İŞ).

Bağlam tüketimi konusunda da uyardı. Tasarruf TESTLERDEN DEĞİL, gereksiz kod okumasından
yapılmalı: geniş `sed` aralıkları yerine hedefli `grep`, ekran görüntüsü yalnızca yerleşim
değişiminde.

Ayrıca: **her turda HTML gönder.** Diğer dosyalar yalnızca yeni oturuma geçerken gerekir.
