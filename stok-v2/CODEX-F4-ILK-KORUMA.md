# F4 — sipariş iptali için ilk sunucu işlemi koruması

2 Kasım 2026. Dal: codex/f4-siparis-iptal. Taban: F5 ecf50b9. Geliştirme sürümü 1.744.2.
Canlı Supabase'e erişilmedi; main, deploy ve surum.json değişmedi. Yayın HTML'i üretilmedi.

## Değişiklik

Önceden fis_bag_coz bağları çözüyor, İptal durumu daha sonra istemciden ayrı yazılıyordu. Şimdi aynı RPC siparişi ilk yazmadan önce FOR UPDATE kilitler, numarasını veritabanından okur ve bağ çözme ile İptal durumunu tek işlemde yazar. İstemcinin bayat/yanlış numarası kullanılmaz. Teslim önce bitmişse hareket geçmiş bağa taşınır; stok ve karşılanan kaybolmaz.

fis_kes, yükteki başlık/satır/alt kalem ve mevcut kalemlerden bütün ilgili sipariş kimliklerini çıkarır, kimlik sırasıyla FOR SHARE kilitler. İptal durumunu kilitten sonra denetler; KR006 ile yeni fişi reddeder. KEY SHARE durum güncellemesini engellemediğinden bu kapıda SHARE gereklidir. Aynı istek kimliğinin güvenli tekrarı, yeni teslim sayılmadan ilk fişi döndürmeye devam eder.

fis_siparis_iptal_koru, eski ekranın başlık POST'u ile İptal durumunu geri açmasını engeller. Koruma fiş kuralları açık/kapalı olmasına bağlı değildir. Yeniden açma gerekiyorsa yeni sipariş kullanılmalı; özel bir yeniden açma akışı bu değişikliğe dahil değildir.

İstemci, yerel görüntüde bağ görünmese de fiş sistemi yolundaki iptali RPC ile başlatır. Sunucu reddederse yerel tablolar değiştirilmez.

## Çalıştırılan testler

- Yeni sinama-iptal.sql, F2 SQL'i üzerinde kırmızı: “bağ çözme ve durum aynı işlemde olmalı”.
- PGlite 0.5.14 ile depodaki gerçek şema/işlev/tetikleyiciler kuruldu; yeni SQL testleri kurallar kapalı ve açıkken geçti. PGlite, PostgreSQL'i gömülü çalıştırır; burada çok bağlantılı yarış kanıtı değildir.
- Kontroller: önceki teslimin geçmiş bağı ve gerçek sipariş numarası, karşılananın korunması, iptalin tekrarı, iptal sonrası yeni teslim reddi, reddedilen fişin satır bırakmaması, yalnız kalemId ile korumanın aşılamaması, bayat başlık güncellemesinin reddi ve önceki teslim isteğinin tekrarının zararsızlığı.
- Son başlık güncellemesine kasıtlı hata eklendi: iptal başarısız olduğunda daha önce çözülen stok bağları geri alındı, sipariş Bekliyor kaldı.
- geri-donus-F4.sql çalıştırıldı: eski hatayı yeniden üretti. Güncel SQL tekrar kurulduğunda test yeniden geçti.
- Gerçek istemci siparisKapat callback testi: yerelde bağ görünmese de RPC önce çağrılır; sunucu reddinde yerel yan etki yok.
- 91 birim dosyasının tam koşusunda 1.633 başarılı, 1 başarısız kontrol vardı. Tek başarısız test birim-alis-ortalama idi; aynı tarihli F5 tabanında da aynı hatayı verdi. Test Eylül fixture'ını gerçek günün üç aylık aralığıyla karşılaştırıyordu. Yalnız test saati fixture tarihine sabitlendi; aynı test tekrar geçti. Böylece ilgili düzeltme sonrası kontrol bazında 1.634 başarılı, açık birim hatası yok; tüm küme ikinci kez çalıştırılmadı.
- Tarayıcı siparis-iptal çıktısı altın dosyayla aynı. F5 yedek kilidi fis_aktif=false/true tarayıcı kontrolleri geçti.
- Derleme, kontrol.sh, SQL Editor kopyası eşitliği ve git diff --check temiz.

## Çalıştırma

`npm ci` sonrasında `npm run test:f4` ağ kullanmadan geçici gömülü veritabanında çalışır. Test bağımlılığı tam sürüme sabitlendi. Önceki hatayı göstermek: `F4_SQL_REF=1a42e48 node stok-v2/test/f4/kos-gomulu.js` (başarısız olması beklenir).

Gerçek PostgreSQL yarış testi hazır: `stok-v2/test/f4/t-yaris.js`. Önce mevcut stok-v2/test/kos.sh ile izole veritabanı kurulmalı; PGHOST/PGPORT/PGUSER yerel ortama ayarlanmalı. Varsayılan 100 eşzamanlı iptal/teslim çifti için `node stok-v2/test/f4/t-yaris.js`. **Bu test bu ortamda henüz çalıştırılmadı.**

## Açık kalan işler — F4 tamamlanmadı

1. Gerçek PostgreSQL ile doğal ve zorlanmış araya girme testleri; F0/F1.1/F2/R1/R1b SQL regresyonlarının tamamı. Yeni paylaşım kilidinin bütün eski yollarla etkileşimi kanıtlanmalı.
2. Üretim/koli/rezervasyon ve diğer sipariş bağlarının temizliği halen istemcide ayrı yazmalardır. Bu değişiklik iptalin bütün modüllerde atomik olduğunu iddia etmez.
3. Teslim sonrası Tamamlandı/Kısmi Teslim durumunun tek yazarı ve eski yazma yolları ayrıca çözülmeli. İptal olmayan siparişlerdeki durum yarışı bu değişiklikte kapanmadı.
4. Eski istemcilerin sunucu retlerinden sonraki davranışı, geçiş uyumluluğu ve F5/F8 sunucu kapıları açık.

Bu dal canlıya hazır sayılmaz. SQL Editor kopyası yalnız inceleme içindir; çalıştırma onayı değildir. F4 geri dönüşü ayrıca mevcut; 1.742.1/F1 geri dönüşleri de yeni iptal tetikleyicisini kaldıracak şekilde güncellendi, bu iki geniş geri dönüş bu oturumda yeniden çalıştırılmadı.
