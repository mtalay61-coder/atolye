# F8 — Eski yazma yoluna karşı kesilmiş fiş koruması

2 Kasım 2026. Taban: GitHub F3 dalı `5413212ee94f28d1614b44fc018cd88e7d1cecea` (yerel aynı ağaç `b60d83b`). Yalnız geliştirme SQL'i, SQL Editor kopyası, test ve belgeler değişti. Canlı Supabase, main, dağıtım ve surum.json değişmedi.

## Bağımsız bulgu

`fis_satir_koru` ve `fis_baslik_koru`, `fis_aktif=false` olduğunda hiçbir fiş değişmezliği kontrolü yapmadan dönüyordu. Yeni `fis_kes` ile kesilmiş bir teslim fişindeki -5 hareket, kimliği aynı tutulan eski `stk_yaz` isteğiyle -19 yapılabildi. Sipariş karşılananı ve cari tutarı bu eski yolda birlikte hesaplanmıyor; stok/sipariş/cari tutarsızlığı oluşabiliyor. Hata yerel PostgreSQL'de düzeltmeden önce testin ilk iddiasını gerçekten düşürdü; ham çıktı `test/f8/sonuc-eski-fis-once.txt`.

## Düzeltme

Fiş başlığında `istek` dolu olması sunucu fiş kesicisinin mevcut işaretidir (ana ve bağlı fişte kullanılır). Bu fişlerde başlık ve stok/cari/kasa hareketi koruması artık geçiş anahtarı kapalıyken de uygulanır. Hareketin hem eski hem yeni fiş bağı sorgulanır; başka fişe taşıyarak koruma aşılamaz. Başlığın istek işaretini silme veya fişi yeniden açma da engellenir.

Yeni kilit alınmaz, hareket veya miktar silinmez/kırpılmaz. Önceki dar izinler korunur: sunucu fiş iptali, not bilgisi, sipariş bağı çözümü ve renk taşıma. İç fiş kapısı önceki gibi yalnız güvenilir sunucu işlemlerinin transaction ayarıdır; yeni bir istemci yetkisi eklenmedi.

Bu dar değişiklik `istek` taşımayan eski bağımsız kayıtların açık geçiş davranışını değiştirmez. Fiş kuralları açıkken bütün fişlerde önceki sıkı koruma sürer. Mevcut 42501 ret kodları korundu; yeni bir istemci kalıcı-ret akışı eklenmedi.

## Doğrulama

Yerel PostgreSQL 16.15, önceki native test ortamı (tmpfs, JIT kapalı, JWT/rol kabuğu taklidi; gerçek Supabase HTTPS kimlik doğrulaması değildir). Çalıştırma yalnız localhost kabul eder.

- `t-eski-fis.js`: eski stk_yaz ve fis_yaz miktar değişikliği, hareketi iptal etme, mevcut fişe ekleme, başka fişe taşıma, iptalden sonra açma, cari tutarı değiştirme/cariyi tek başına iptal etme retleri; değişmeyen hareket/cari snapshot'ı ve yarım fiş bırakmama. Meşru not, idempotent tekrar, fiş iptali ve eski bağımsız fiş yazması da sınanır.
- `t-eski-fis-yaris.js`: bayat eski miktar yazması ile gerçek fiş iptali eşzamanlı; özgün -5 korunmalı, stok ve cari iptal olmalı, karşılanan 0 olmalı. Her sapma başarısız süreç çıkışıdır.

## Geri dönüş ve açık kapsam

`geri-donus-F8-eski-fis.sql` yalnız değişen iki koruma işlevini önceki F3 sürümüne döndürür. Verileri silmez. Geri dönüş, bu açığı yeniden açar; canlıda ayrıca açık onay gerekir. Mevcut geniş geri dönüş dosyaları önceki işlevleri zaten yeniden tanımlar.

Bu çalışma bütün F8'i kapatmaz. İstek taşımayan eski/bağımsız fişler, eski istemci sürüm kapısı ve reddedilen yazmanın kullanıcıya doğru gösterilmesi, yeni eski-yol fişiyle kalem bağlantısı kurarak F3 sınırını aşma, bütün varyant bakım kombinasyonları açık kalır. Finans modüllerinin tamamının doğrulandığı anlamına gelmez. Canlı güvenliği için bütün yolların birlikte kapanması ve ayrı geçiş onayı gerekir.

## Yeniden çalıştırma

Önce izole yerel PostgreSQL ve `stok-v2/test/kos.sh` ile test veritabanı hazırlanır. Sunucu bağlantısı yerel olmalıdır:

```
node stok-v2/test/f8/t-eski-fis.js
node stok-v2/test/f8/t-eski-fis-yaris.js
node stok-v2/test/f3/t-satis-sinir.js
node stok-v2/test/f3/t-satis-yaris.js
bash stok-v2/test/f0/kos.sh
node stok-v2/test/f8/t-renk-dogal.js
node stok-v2/test/f8/t-renk-kilit.js
```

F0 `Y.denetim-yakalar` iddiası, daha önce beklenen satırsız fişin artık oluşmadığını (`D6a=0`) doğrulayacak biçimde sıkılaştırıldı. Beklenen durum dosyası değiştirilmedi; geri yüklemenin fiyatı eskiye çekme kontrolleri hâlâ kırmızıdır. Bu test değişikliği düzeltilen veri kaybını başarı sayar; sunucu geri yüklemesinin tamamlandığını iddia etmez.

## Sonuçlar

- Yeni koruma ve cari testleri başarılı. Ek doğrudan başlık işareti silme, başlık silme ve hareket silme girişimleri de reddedildi.
- Eski miktar yazması / fiş iptali: 100/100 doğru; iptal daima tamamlandı, eski miktar yazması reddedildi.
- F3 sınır/onay testleri ve 100 teslim yarışı geçti.
- F0: 54 yeşil, 6 bilinen kırmızı; güncellenmiş denetim iddiasıyla beklenen dosyayla eşleşti. Beklenen dosyasında değişiklik yok.
- Renk taşıma: 100 doğal yarış ve kalemli zorlanmış test başarılı, sıfır kilitlenme/bozuk veri.
- Dar geri dönüş eski miktar yazma açığını yeniden üretti (beklenen assertion hatası); güncel SQL yeniden kurulunca koruma geçti.
- Sıfırdan ayrı PostgreSQL kümesinde tam `kos.sh` geçti: SQL Editor tekrar kurulumu, uçtan uca fişler, gece denetimi, R1 ve R1b. Gece denetiminin bilerek bozuk fiş üreten fixture'ı artık kapalı kuralla korumayı aşamadığından yalnız test transaction'ında iki tetikleyiciyi geçici kapatıyor; ROLLBACK ikisini de geri getiriyor. Gerçek yazma yolu testleri tetikleyiciler açıkken çalışır.
- JS sözdizimi ve git diff --check temiz. SQL Editor kopyası kaynak üreticisinden yeniden üretildi.

Ham çıktılar `test/f8/sonuc-eski-fis-*.txt`. `sonuc-eski-fis-f3.txt` ilk geniş koşudur: F3 testleri geçti, eski denetim iddiasının beklenen iyileşmeye takılması görülebilir. Final koşu düzelen iddiayı ve geri dönüşün beklenen başarısız testini içerir. Temiz kurulum son koşusu süreç çıkışı 0'dır. F2'nin tamamı bu tur yeniden koşulmadı (önceki F3 raporunda mevcut); F0 ve hedef yarışlar yeniden koşuldu.
