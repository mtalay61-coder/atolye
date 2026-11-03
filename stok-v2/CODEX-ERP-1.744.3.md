# ERP 1.744.3 — veri bütünlüğü adayı

2 Kasım 2026. Taban: `codex/f8-eski-fis-koruma`, GitHub `834f625df830990661405eb76cb760aa44395cca`.

Bu geliştirme adayının aşağıdaki yerel doğrulamaları tamamlandı. Canlıya geçiş yapılmadı. Canlı Supabase, main, dağıtım ve surum.json değiştirilmedi. Kaynaklar ve ham sonuçlar ayrı geliştirme dalında incelemeye sunulur; bu rapor canlıya geçiş onayı değildir.

## Değişiklikler

- Aynı çekin eşzamanlı tahsili önceki belge kontrolü ve kimlik sıralı transaction kilitleriyle engellenir. Çek/fiş/kasa/cari iptali ve yeni çek durumu aynı işlemde korunur. Daha yeni işlem varsa eski fişin iptali reddedilir; sunucu audit kaydı tutulur.
- Bakiyeli kasa/banka hesabı kapatılamaz; hareket geçmişindeki hesabın türü/para birimi değiştirilemez; kapalı hesaba hareket yazılamaz. Bozuk/sonlu olmayan finans tutarı sıfıra çevrilmez.
- Sipariş iptalinde üretim, koli, rezervasyon ve sipariş zinciri bağları tek işlemde çözülür. Teslimsiz silme de aynı kapıdan geçer; teslim geçmişindeki silme F2 korumasınca bütün işlem geri alınarak reddedilir. İptal edilmiş siparişe yeni operasyon bağı kurulamaz.
- Bir üretim tesliminin birden çok fişi `fis_iptal_toplu` ile atomik iptal edilir.
- Sipariş teslim durumu `siparisler_okuma` görünümünde güncel kalemlerden hesaplanır. Ham `siparisler.durum` alanı önbellektir; yeni uygulama sunucu ayarıyla görünümü okur. Kalemden başlığa yan yazma eklenmedi; eski ters kilit sırası kullanılmaz.
- Farklı alan kümeli alt satırlar birbirinin fiyat/planlamasını NULL yapmaz. Hem temel alt_yaz hem F2 ön kilitli override güncellendi. Tanınmayan alan bütün işlemi reddeder.
- Minimum istemci sürümü açıkken eski/sürümsüz istemci bütün tablo yazmalarında AT001 ile reddedilir. `fis_aktif=false` eski hareket kapısını tekrar açmaz. Yeni istemci ham hareket yazmasını ağa çıkmadan KR009 ile ayırır; yerel kayıt incelemede korunur, ilgisiz meşru değişiklik devam eder.
- Genel RLS betiğinin tekrarı özel fiş sayaç/audit tablolarını açmaz.
- Test derleyicisi güncel src parçalarını kullanır. Kural provası çöken senaryoyu başarı saymaz; geçici klasörler ayrıdır. Tarayıcının açıkça taklit edilmeyen HTTP istekleri kapalıdır.

## Geçiş sınırı

Minimum sürüm varsayılan NULL'dır; bu uyum aşaması güvenli yayın kipi değildir. Yayında SQL/uygulama birlikte doğrulanıp bütün kullanıcılar güncellendikten sonra minimum en az 1.744.3 ve fiş kuralları etkin olmalıdır. Bu etkinleştirme canlıda yapılmadı ve ayrıca açık kullanıcı onayı gerektirir. Yeni istemcide fiş defteri varken tam yedek geri yükleme kapalıdır; eski istemcinin geri yükleme yazmaları etkin minimum sürümle engellenir. Genel amaçlı yeni bir tam geri yükleme servisi eklenmedi.

Geri dönüş `geri-donus-1.744.3.sql` içindedir. Ayrı DB kopyasında çalıştırıldı: eski çift tahsil ve seyrek alan NULL hataları geri geldi; güncel SQL tekrar kurulduğunda korumalar geçti. 104 mevcut çek audit satırı korundu. Geri dönüşte kapanan durum görünümü yeniden kurulumda etkinleşti. Bu geri dönüş de canlıda ayrıca onay gerektirir.

## Yerel doğrulama

`stok-v2/test/kos-butunluk.sh` yalnız localhost ve `atolye_stok_v2_sinama` DB'sinde çalışır. Temiz kurulum, SQL Editor, F0, hedef finans testleri, F4/F3/F8 yarışları ve F2'yi içerir. PostgreSQL 16.15, sahte JWT/rol kabuğu; canlı Supabase HTTPS/JWT doğrulaması değildir. Önceki native ortamın tmpfs/uid/JIT ayrıntıları CODEX-F4-GERCEK-PG-SONUCLARI.md içinde.

## Nihai sonuçlar

| Kontrol | Sonuç |
|---|---|
| Sıfırdan native kurulum, SQL Editor parça parça ve tekrar kurulum, uçtan uca fişler, R1/R1b | Geçti |
| F0 | 60 yeşil, 0 kırmızı; beklenenle aynı |
| F2 | 70 yeşil, 3 eski istemci kırmızısı; beklenenle aynı |
| Güncel istemci kalıcı ret / ilgisiz değişiklik | 7/7; reddedilen hareket yerelde korunurken asgari stok değişikliği geçti |
| Çek eşzamanlı tahsil | 100 yarışta tek tahsil/tek kasa hareketi; 0 bozuk veri |
| Sipariş iptali/yeni rezervasyon | 100 yarışta iptal siparişe aktif rezervasyon kalmadı |
| Sipariş iptali/teslim | 100 doğal + iki yönde 3'er zorlanmış sıra geçti |
| F3 satış sınırı ve onay, teslim yarışı | Sınır senaryoları ve 100 yarış geçti |
| F8 renk/fiş iptali | Zorlanmış ve 100 doğal yarış geçti |
| Kasa/banka hesap koruması, sayısal tutar, sürüm/kapı, toplu iptal, seyrek alt, yetki yeniden kurulumu | Hedef kontrollerin tümü geçti |
| Birim testleri | 92 dosya, 1.634 başarılı kontrol; süreç hatası 0 |
| Kritik finans/sipariş tarayıcı altın çıktıları | 8/8 aynı: fis-kes, stok-fis-kes, para-fis-kes, banka-fis-kes, fis-iptal, cek-fis-kes, karsilanan-fis-yolu, siparis-iptal |
| Statik denetimler / ölü kod / diff boşlukları | Temiz |
| Geri dönüş ve yeniden kurulum | İki eski hata doğrulandı; güncel koruma geri geldi; 104 audit satırı korundu |

Son native koşucu `BÜTÜNLÜK ADAYI: bütün süreçler 0` ile bitti. Ham kanıtlar `test/butunluk/sonuc-*.txt` içinde. Geri dönüşte kırmızı olması beklenen iki test çıktısı ayrı saklandı. Native logda kasıtlı satırsız fiş reddi ve yanlış kilit sırası taklidi kontrolündeki deadlock vardır; gerçek üretim yolu için başarısız koşu değildir.

F2'nin üç kırmızısı eski istemcinin kalıcı ret gösterimi/otomatik denemesi/ilgisiz değişikliği ayırma yeteneğidir. Eski istemcinin davranışı bu dalda değiştirilemez; güvenli geçişte minimum sürüm etkinleştirilerek bu istemcinin yazması engellenir. Bu sayılar gizlenmedi ve eski istemci beklentileri yeşile çevrilmedi.

Önceki oturumdaki tam kural provasında 260 senaryo, 0 eski yol yazması, 8 ağa çıkmadan engellenen girişim ve 0 süreç hatası görüldü. Bu provalar altın çıktı eşitliği anlamına gelmez. Ortam kesintisinde geçici ham çıktı kaybolduğu için bu tekrarın dosyası burada yeniden üretilmiş gibi sunulmuyor; güncel oturumda yukarıdaki 8 kritik tarayıcı çıktısı yeniden karşılaştırıldı ve saklandı. Son ağ izolasyonlu tam prova için yeni sonuç iddiası yapılmıyor.

## Kapsam ve geçişte kalanlar

- Doğrulama yerel PostgreSQL ve taklit JWT/roller üzerindedir. Canlı Supabase şeması, gerçek HTTPS/JWT/RLS dağıtımı ve mevcut kayıtlar bu oturumda okunmadı/doğrulanmadı. Mevcut bozuk geçmiş otomatik tahmin edilip düzeltilmedi.
- Bu yeni tam geri yükleme özelliği değildir. Desteklenen uygulama tam geri yüklemeyi durdurur; eski uygulama yazmaları güvenli geçişte sürüm kapısıyla durdurulur. Minimum NULL bırakılırsa uyum dönemi devam eder ve bu kapı etkin değildir.
- Teslim durumunun yetkili kaynağı `siparisler_okuma`dır. Ham başlık `durum` önbelleği eşzamanlı işlemden sonra eski kalabilir; doğrudan SQL okuyan özel rapor/entegrasyon bu görünümü kullanmalıdır. Eski başlık önbelleği farkı denetimde ayrıca görünür; miktar/bakiye bununla değiştirilmez.
- Alış fazla kabul politikası, negatif stok iş politikası ve F3 yönetici istisnası için yeni arayüz eklenmedi. Önceki satış sunucu sınırı/audit korunur.
- Ayrı açık onay olmadan canlıya kurulum, minimum sürüm etkinleştirme, main birleştirmesi, dağıtım ve surum.json değişikliği yapılmayacak. Bu rapor bunlar için onay değildir.

Önerilen inceleme sırası: kaynak farkı ve bu rapor → salt okunur gerçek ortam uyumluluk kontrolü → ayrı test ortamında aynı kurulum/senaryolar → açık canlı geçiş onayı. Kurulum sırası stok/cari/alt/kasa kaynakları ve güncel 15-düzeltme, ardından 18-fiş-defteri ve genel RLS betiğinin yeni sürümüdür. Sürüm kapısı ancak bütün v2 modülleri ve güncel uygulama hazırken etkinleştirilir; uygulama kaynağı 1.744.3, surum.json halen önceki yayımlanmış sürümdedir. Yayın paketi/deploy bu çalışmanın parçası olarak yapılmadı.
