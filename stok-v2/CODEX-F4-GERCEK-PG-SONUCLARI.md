# F4 — gerçek PostgreSQL doğrulaması ve kilit düzeltmesi

2 Kasım 2026. Dal: `codex/f4-native-dogrulama`; taban: F4 `e54a2d6`.
Canlı Supabase'e bağlanılmadı. main, dağıtım, yayın HTML'leri ve surum.json değiştirilmedi.

## Sonuç

Gerçek PostgreSQL 16.15 üzerinde iki ayrı bağlantıyla iptal/teslim yarışı çalıştırıldı. Fiş kuralları hem açık hem kapalıyken ayrı ayrı 100 doğal yarış ve iki sırada üçer zorlanmış deneme geçti: toplam **200 doğal + 12 zorlanmış**.

İkinci bağlantının gerçekten kilit beklediği pg_stat_activity üzerinden doğrulandı. İlk işlem COMMIT edilene kadar açık tutuldu. Sabit bir gecikme verip sonucu başarılı sayan bir test kullanılmadı. Doğal koşularda ilk başlatılan işlem sırası dönüşümlü değiştirildi.

Kontrol edilenler:

- İptal önce tamamlanırsa yeni teslim KR006 ile reddedilir, fiş/cari/stok satırı oluşmaz.
- Teslim önce tamamlanırsa iptal onu geçmiş bağa taşır; fiş, cari tutarı, stok hareketi ve karşılanan kaybolmaz.
- Son durumda sipariş İptal'dir; geçerli sipariş/kalem bağı kalmaz.
- Karşılanan ile hareket hesabı eşittir; ayrıca ikisinin birlikte sıfırlanıp veri kaybını gizlememesi için beklenen teslim miktarı, geçmiş bağ miktarı, fiş sayısı ve cari tutar ayrı ayrı doğrulanır.
- Atomik iptal SQL testi de gerçek PostgreSQL'de kurallar açık/kapalı geçti. Son adıma kasıtlı hata eklenince daha önceki bağ çözmelerinin geri alınması doğrulandı.

Ham F4 çıktıları `test/f4/sonuc-pg-acik.txt`, `sonuc-pg-kapali.txt` içinde.

## Bulunan ve giderilen yeni kilitlenme

İlk F4 sürümündeki sipariş satırı SHARE kilidi, mevcut `F1.G1-yeni-kodla` testini kırdı. Testte bir işlem kalemi kilitleyip başlığı daha sonra yazarken teslim işlemi başlığı SHARE kilitleyip kalemi bekliyordu. PostgreSQL gerçek deadlock üretti.

Düzeltme: fis_kes ile fis_bag_coz, satır kilitlerinden önce aynı sipariş advisory işlem kilidini alır. Birden çok sipariş kimlik sırasıyla kilitlenir. Teslimin sipariş satırı kilidi KEY SHARE olarak kalır; sıradan başlık UPDATE'iyle çakışmaz. İptal, advisory kilitten sonra başlığın FOR UPDATE kilidini alıp bağ çözme ve durumu aynı işlemde yazar.

F1 testinin beklentisi veya işlem sırası değiştirilmedi. Aynı test düzeltmeden önce deadlock ile kırmızı, düzeltmeden sonra yeşil oldu. `t-f1.js` bütünü: **11 başarılı, 0 başarısız**. Önce/sonra ham kanıtı test/f4 dizininde.

## Regresyonlar

| Koşu | Sonuç | Yorum |
|---|---|---|
| stok-v2/test/kos.sh | Çıkış 0 | Gerçek PostgreSQL: kurulum, göçler, Editor parça koşuları, fiş/gece denetimleri, R1 ve R1b. İlk SHARE sürümü üzerinde; sonraki advisory düzeltmesi ayrıca aşağıdaki koşularda sınandı. |
| F0, son advisory SQL'i | Beklenenle aynı: 52 yeşil, 8 bilinen kırmızı | D5.iptal-siparise-teslim artık yeşil; beklenen dosyada yalnız bu gerçek davranış düzelmesi değiştirildi. F1.G1 yeşil beklentisi korundu. |
| F2, son advisory SQL'i | Beklenenle aynı: 70 yeşil, 3 bilinen kırmızı | Üç kırmızı eski istemcinin otomatik tekrar/inceleme/ilgisiz değişiklik davranışıdır. F2 doğal N=100, zorlanmış tekrar=3. |
| F1.1 tam küme, SHARE düzeltmesinden önce | Beklenenle aynı | Ayrı F0 kümesinin bulduğu G1 bu kümede yoktu; bu yüzden tek kümenin geçmesi yeterli değildi. |
| F1.1 son advisory SQL'i | P1/P2/P3/P4 × 100: 8 yeşil, 0 kırmızı; P8 × 100: 1 kilitlenme, 0 bozuk | Son ham çıktıyı test/f4/sonuc-pg-f11-hedefli.txt içinde inceleyin. P8 puanlanmayan eski yol gözlemidir; puanlı testlerle karıştırılmaz. |
| Gömülü PostgreSQL | Geçti | Açık/kapalı kural, hata enjeksiyonu ve F4 geri dönüş/yeniden kurulum. |
| JS sözdizimi, SQL Editor kopyası ve diff kontrolü | Temiz | Bu turda tarayıcı/üretim istemci akışı değişmedi. |

F0'ın sekiz kırmızı kontrolü silinmedi: fazla teslim, eski canlı-bağ beklentisi, Tamamlandı durum yarışı, ham RPC ile tam geri yükleme ve minimum istemci sürümü kontrolleri hâlâ açık/uyumsuz durumdadır. “Beklenenle aynı” bütün sistem güvenli demek değildir.

## Test kurulumundaki sessiz hata

P8 renk taşıma gözlemi, aynı teslim kalemine başka renkte ikinci teslim kurmaya çalışıyor, F2'nin KR003 reddini yok sayıyor ve var olmayan bir teslimi bekliyordu. Bu yüzden önceki raporlarda da 100/100 “bozuk” görünüyordu.

Hedef varyant artık stok hareketi oluşturmadan açılır; kurulum RPC'sinin başarısı zorunlu doğrulanır. İlk kalemin gerçek üçlük teslimi üzerinden doğru 0/3 karşılanan beklentisi kullanılır. Renk taşımanın üretim SQL'i bu turda değiştirilmedi. Düzeltilmiş fixture ile P8 doğal 100 koşuda bir kilitlenme, sıfır bozuk veri ölçüldü; P8/F8 riskleri tamamlandı ilan edilmez.

F4 atomik SQL fixture'ı da kendi ürününü işlem içinde oluşturup sonunda ROLLBACK yapar; önceki kurulumun u-canta ürününü bırakmasına bağımlı değildir. Yarış testinin PGHOST değeri açıkça yerel adres olmak zorundadır; uzak adres, ortak yardımcı yüklenmeden reddedilir.

## Ortam ve kanıt sınırı

Ubuntu PostgreSQL 16.15 paketlerinin gerçek sunucu ve psql ikilileri kullanıldı. Bağlantılar yerel TCP 127.0.0.1 üzerindeydi; canlı anahtar veya gerçek iş verisi kullanılmadı. SQL işlevleri, tetikleyiciler, roller ve kilitler taklit edilmedi.

Bu çalışma ortamı yalnız uid 0 eşlediğinden sunucu süreçlerinde yerel bir UID/ownership adaptörü (LD_PRELOAD) gerekti; bu adaptör depo veya uygulama bağımlılığı değildir. İşletim sistemi kullanıcı kurulum güvenliği bu testin kapsamı değildir. PostgreSQL ikilileri veya kilit algoritması değiştirilmedi.

İlk disk denemesinde ortamın normal çalışma dosya sisteminde katalog I/O hatası görüldü. Hata bastırılmadı; veritabanı /dev/shm tmpfs üzerinde yeniden kuruldu. Nihai testler bu yeni veritabanında, UTC saat dilimiyle yapıldı. Bu ölçümler gerçek PostgreSQL işlem/SQL/kilit davranışını doğrular; Supabase/PostgREST ağ katmanı ve üretim depolama dayanıklılığı için kanıt değildir.

## Kalan iş

Üretim, koli ve rezervasyon temizliği hâlâ istemcide ayrı yazmalardır. Siparişin Tamamlandı/Kısmi Teslim durumunun tek yazarı, fazla teslim, F5 sunucu geri yükleme kapısı ve F8 eski yazma yolları açık. Bu rapor bu başlıkların kapandığını veya canlı geçişin onaylandığını söylemez.
