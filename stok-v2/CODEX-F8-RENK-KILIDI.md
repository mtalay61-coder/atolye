# F8/P8 — renk taşıma ile fiş iptali kilit sırası

2 Kasım 2026. Dal codex/f8-renk-kilit, taban 3ebfaa1.
Yalnız geliştirme SQL'i ve testler değişti. Canlı Supabase, main, deploy ve surum.json değişmedi. İstemci sürümü aynı kaldı.

## Sorun ve düzeltme

Eski stk_renk_tasi hareket satırını değiştirip degisiklik.tekil kilidini alabiliyordu. Aynı anda fis_iptal önce fiş ve kalemi kilitliyor, sonra global sayaç/hareketi yazıyordu. Fiş iptali global kilidi tutup renk işleminin hareketini beklerken renk işlemi global kilidi bekleyebiliyordu.

Yeni renk yolu ilk yazmadan önce bütün eşleşmelerin mevcut kaynak varyantlarını toplar; geçerli veya geçmiş bağlı kalemleri fis_kalem_kilitle ile, sonra ilgili fiş başlıklarını kimlik sırasıyla kilitler. Kaynak varyantlar aynı başlangıç kümesi ve kimlik sırasıyla işlenir. Renk çözümü, varyant veya hareket yazması bundan sonra başlar. Miktarlar kırpılmaz, hareket/fiş silinmez.

## Gerçek PostgreSQL kanıtı

Yerel PostgreSQL 16.15, UTC, tmpfs; aynı izole ortamın ayrıntıları CODEX-F4-GERCEK-PG-SONUCLARI.md içinde. Bu koşuda isteğe bağlı LLVM kütüphanesi eksik olduğundan yalnız test sunucusunda JIT kapalıdır; uygulama SQL'inde JIT ayarı değiştirilmedi.

- Satır tetikleyicili test bariyeri renk işlemini hareket satırını tutarken durdurur. Fiş iptalinin kilit beklediği pg_stat_activity ile gözlenir, bariyer açılır. Eski kodda gerçek deadlock üretildi; fis_iptal geri alındı ve test başarısız oldu.
- Yeni kodla kalemli ve kalemsiz fişte üçer zorlanmış deneme: **6/6 başarılı**. İki işlem de tamamlandı; özgün hareket kimliği ve -3 miktarı korundu, fiş iptali ve karşılanan doğru.
- Doğal P8 koşusu: **100/100 iki işlem birlikte tamamlandı; 0 kilitlenme, 0 bozuk veri, 0 diğer hata**. Yeni t-renk-dogal.js, eski puanlanmayan gözlemi okuyup bu koşullardan biri sağlanmazsa başarısız döner.
- İşlev SQL testi: hedef varken birleştirme, tekrar çağrı ve hedef yokken yeniden adlandırma geçti. İki hareket, iki fiş, toplam miktar 8 ve min stok 7 korundu.
- F0: beklenenle aynı (52 yeşil, 8 bilinen kırmızı). Hiçbir beklenen dosya bu turda değiştirilmedi.
- t-f1.js: 11 yeşil, 0 kırmızı. İlk koşuda eksik LLVM nedeniyle duran test, yerel JIT kapatılınca tamamlandı.
- F8 renk geri dönüşü eski deadlock'u yeniden üretti; güncel SQL tekrar kurulunca zorlanmış testler geçti.
- F1 geri dönüşü izole DB kopyasında çalıştı. Kalem yardımcı işlevi kaldırıldıktan sonra eski renk işlevi çağrılabildi. 1.742.1 geri dönüşü renk işlevini zaten geri koyduğu için bu dosyada değişiklik gerekmedi.
- JS sözdizimi, SQL Editor kopyası eşitliği ve git diff --check temiz.

Ham kanıtlar test/f8/sonuc-*.txt içinde. SQL fixture'ı işlemin sonunda ROLLBACK yapar; yarış fixture'ları yalnız izole test veritabanında kalır. Test tetikleyicisi finally ile kaldırılır. Koşular aynı veritabanında seri çalıştırılmalıdır.

## Çalıştırma

İzole yerel PostgreSQL, depodaki stok-v2/test/kos.sh ile hazırlanır. PGHOST yerel adres, PGPORT ve PGUSER bu test sunucusuna ayarlanır.

```
node stok-v2/test/f8/t-renk-kilit.js
F8_KALEMSIZ=1 node stok-v2/test/f8/t-renk-kilit.js
node stok-v2/test/f8/t-renk-dogal.js
psql -X -v ON_ERROR_STOP=1 -d atolye_stok_v2_sinama -f stok-v2/test/f8/sinama-renk.sql
```

## Sınır

Bu değişiklik yalnız renk taşıma/fiş iptali P8 kilit tersliğini ele alır. Diğer eski yazma yolları, P9 stok yazma/fiş iptali, yeni teslim ile bütün varyant bakım kombinasyonları, eski istemci sürüm kapısı, F5 sunucu geri yükleme ve F4'ün üretim/koli/rezervasyon temizliği bu raporla kapanmaz. Başlangıçtan sonra eşzamanlı yaratılmış yeni varyantların aynı bakım işlemine dahil olması garanti edilmez. Canlıya geçiş ayrı açık onay gerektirir.
