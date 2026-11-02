# F3 — fiş kesme yolunda satış siparişi miktar sınırı

2 Kasım 2026. Dal codex/f3-satis-fazla-teslim; taban 2ddb6a1.
Yalnız geliştirme SQL'i, testler ve raporlar değişti. Canlı Supabase, main, dağıtım, yayın HTML'leri ve surum.json değişmedi. İstemci sürümü aynı kaldı.

## Davranış

Önceki sunucu, 20 adetlik kaleme 25 teslimi kabul ediyordu. 14 teslimli kaleme iki cihaz aynı anda 5'er teslim gönderdiğinde ikisini de kabul edip 24'e çıkıyordu. Yeni kontrol aynı sipariş/kalem kilitleri alındıktan sonra, ilk fiş/stok/cari yazmasından önce çalışır. Aynı iki istekten yalnız biri kabul edilir: toplam 19, diğer istek KR007 ile reddedilir. Reddedilen istek fiş veya başka bir ayak bırakmaz.

Kontrol, fis_kes içindeki **kalem kimliğiyle bağlı, Alış dışındaki siparişlerin eksi stok hareketlerine** uygulanır. Ana ve bağlı fişin bütün çıkışları aynı kalem için toplanır. Pozitif satır ekleyerek fazlalık gizlenemez. Fiş türü/kalan/fazlaGonderim gibi istemci alanları izin kaynağı değildir; miktar veritabanındaki kalemden alınır. Aynı yükte miktar büyütmek mevcut sınırı değiştirmez. Yeni kalem aynı yükte yaratılıyorsa son geçerli alt satırın miktarı kullanılır.

Önceki teslim miktarı, geçerli fiş/hareketlerin ham toplamı ile saklı karşılananın büyük olanıdır. Böylece yuvarlama ya da hayalet karşılananı yok saymak fazlaya izin vermez. Eski farklar otomatik sıfırlanmaz. Sonlu olmayan miktarlar reddedilir. Mevcut fazla teslimli geçmişler kırpılmaz; yeni bir çıkış yokken fiyat gibi düzenlemeler engellenmez.

## Yönetici istisnası ve kayıt

Sunucuya gönderilen üst düzey fazlaTeslimOnayi nesnesinde onay gerçek JSON boolean true ve gerekce boş olmayan metin olmalıdır. Yönetici kimliği auth.jwt e-postasının korunan tanimlar kullanıcı listesiyle eşleşmesinden doğrulanır. Payload içindeki rol/onaylayan bilgisi dikkate alınmaz.

İzinli fazla işlemde ana fişin ek.fazlaTeslimOnayi alanına gerçek e-posta, gerekçe, sunucu zamanı ve kalem bazında önceki/istenen/sipariş miktarı yazılır. Hareketin fazlaGonderim işareti de sunucu tarafından atanır. Normal istekte sahte onay imzası gönderilse bile saklanmaz.

Bu audit alanı fis_baslik_koru ile korunur: fiş kuralları kapalıyken bile değiştirilemez veya silinemez. Normal açıklama/irsaliye gibi notlar değişebilir. İç kontrol helper'ı doğrudan authenticated/anon/public RPC çağrısına kapalıdır; fis_kes kilitleri aldıktan sonra çağırır.

Bu turda **arayüze yönetici onayı düğmesi eklenmedi**. Backend istisna protokolü test edildi; normal uygulama ve eski istemcilerin onaysız fazla yükü reddedilir.

## Doğrulama

- Gerçek PostgreSQL 16.15, UTC, yerel TCP, tmpfs; ortam sınırları önceki F4 gerçek PG raporundaki gibidir. JIT test ortamında kapalıdır. Supabase auth kabuğu ve kullanıcı kimlikleri yerel fixture ile sağlanır; HTTPS/JWT doğrulaması veya canlı rol politikası bu koşuda test edilmez.
- Önceki kodda iki fazla teslim kontrolü kırmızıydı. Yeni kodda aynı D4 kümesi 4/4 yeşil.
- t-satis-sinir.js: 20 senaryo geçti. Yetkisiz/sahte yönetici, boş gerekçe, metin true, sahte audit, miktarı aynı yükte büyütme, çok satır, bağlı fiş, pozitif dengeleme, yeni kalem, hayalet, tam sınır, yönetici istisnası, tekrar, sonlu olmayan sayı ve ham ondalık toplam kontrol edildi. Audit değiştirme/silme açık ve kapalı kurallarda reddedildi; normal not düzenlendi.
- t-satis-yaris.js: **100/100** eşzamanlı çiftte bir kabul/bir miktar reddi; 19/20, iki fiş, iki hareket ve cari 1900 korundu. Kilitlenme/bozuk veri yok.
- F0: beklenenle aynı, **54 yeşil / 6 bilinen kırmızı**. Beklenen dosyada yalnız D4.satis-eszamanli ve D4.satis-onaysiz-fazla yeşile çevrildi.
- F2 (doğal N=100, zorlanmış tekrar=3): beklenenle aynı, **70 yeşil / eski istemciye ait 3 bilinen kırmızı**.
- R1 ve R1b temiz. Fazla miktarın kırpılmamasını sınayan senaryolar artık açık yönetici onayı/gerekçesiyle kurulur. R1'de eski onaysız ilave yükün reddedilip izinli 24 geçmişin korunması beklenir.
- Denetim/F2 mevcut-fazla fixture'ları da izinli istisna ile kurulur ve kurulum reddi sessizce yok sayılmaz. R1 test tamponu, biriken fixture çıktıları 1 MiB'ı aşınca yalnız test katmanında 16 MiB'a yükseltildi.
- Ayrı, yeni yerel PostgreSQL kümesinde stok-v2/test/kos.sh temiz kurulum, geçişler, fiş/gece testleri ve R1/R1b ile tamamlandı.
- F3 geri dönüşü eski iki fazla teslim hatasını yeniden üretti; güncel SQL yeniden kurulduğunda sınır testleri geçti. Eski F0 betiği kırmızı kontrollerde de process.exit(0) kullanır; geri dönüş kanıtında sonuç satırları kontrol edildi.
- SQL Editor kopyası eşitliği, JS sözdizimi ve diff kontrolü temiz.

Ham sonuçlar test/f3/sonuc-*.txt içindedir. Çalıştırma: izole yerel PG kurulduktan sonra PGHOST/PGPORT/PGUSER ayarlanıp node stok-v2/test/f3/t-satis-sinir.js ve node stok-v2/test/f3/t-satis-yaris.js.

## Geri dönüş ve açık kapsam

geri-donus-F3-satis.sql önceki fis_kes ve fiş başlığı korumasını geri koyar, yeni helper'ı kaldırır; mevcut audit verisini silmez. F1/1.742.1/F4 geri dönüşlerinde helper temizliği de eklendi. Bu üç geniş geri dönüşün tamamı bu turda tekrar çalıştırılmadı. Geri dönüş satış sınırını da kaldırır ve canlıda ayrıca açık onay gerektirir.

Alış siparişlerinin fazla kabul politikası değiştirilmedi. Sipariş/kalem kimliği taşımayan bağımsız stok işlemleri ve eski stk_yaz/fis_yaz kapıları bu kontrolün kapsamı değildir; bunlar F8 altında kapatılmalıdır. F4 üretim/koli/rezervasyon temizliği, Tamamlandı durum yarışı, F5 sunucu geri yüklemesi ve diğer finans bütünlüğü işleri devam eder. Bu değişiklik bütün ERP'nin güvenli veya yayına hazır olduğu anlamına gelmez.
