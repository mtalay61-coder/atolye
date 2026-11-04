# Açık işler — öncelik sırası (kullanıcı, 4 Kasım)

Her satırda "durum" yalnız kanıta dayanır; kanıtı olmayan iş tamamlandı sayılmaz.

| # | İş | Durum | Kanıt / eksik | Sonraki adım |
|---|---|---|---|---|
| 1 | **Elle kullanım doğrulaması** (sıkılaştırma sonrası: site girişi + vitrin + hesap sayfası, ERP'de bir kayıt, gün sonu raporu) | **BEKLİYOR** — kullanıcı sonra yapacak | `2-sikilastir.sql` canlıda; `2-sonra-dogrula.sql` 8/8 (4 Kasım). Elle deneme yapılmadı. | Kullanıcı üç denemeyi yapıp sonucu bildirir; sorun → `stok-v2/guvenlik/3-geri-al.sql` |
| 2 | **Fiş kuralları** (`19-fis-kural-ac.sql`) ve **sürüm kapısı** (`min_istemci_surum`) — kalan veri bütünlüğü korumaları | **AÇIK — site engeli giderildi (7 canlıda); ikisi de KAPALI** | 7 (4 Kasım, canlı): beş site tablosu kapı dışında, diğer 37 tablo kapı içinde; `7-sonra-dogrula.sql` 6/6 tamam (eksik tablo 0, temel ERP tabloları kapı içinde, sürüm kapısı ve fiş kuralları kapalı). | **7 TAMAMLANDI.** Sürüm kapısı kapalı olduğu için eski ERP istemcilerini engelleme **henüz etkin değil**. Sonraki canlı adım: kullanılan BÜTÜN cihazlarda Tanımlar'da 1.744.7 görülmesi (+ `5-surum-durum-salt-okur.sql`) — **BEKLİYOR, kullanıcı yapacak** → sürüm kapısı (ayrı onay) → fiş kuralları (ayrı onay). |
| 3 | **Kalıcılık değişiklikleri** (rls-kimlik.sql site fonksiyonlarını geri açar; 19 fonksiyonun kaynak tanımında search_path; 0b kaynağı site-portal.sql) | **DALDA, main'e birleşmedi** | `claude/erp-uygulamasi-devam-0601mp`; yerelde sınandı (kos-guvenlik, kos-butunluk, gecis-provasi temiz). Canlıda yeniden çalıştırma GEREKMEZ. | **PR #348 açıldı, birleştirilmedi** (bkz. madde 7). Birleştirme ayrı onay. Uygulama kodu değişmediği için sürüm / surum.json değişmez. |
| 4 | **Sızmış parola denetimi** | **AÇIK** — ayrı güvenlik ayarı | Plan uygunluğu ve mevcut ayar doğrulanmadı. | Supabase › Authentication parola güvenliği ayarı ve plan kontrolü (kullanıcı). |
| 5 | **Yabancı anahtar doğrulaması** | **TAMAMLANDI (4 Kasım, canlı)** | Ön kontrol: iki anahtar false, ihlal 0/0 → `6-fk-dogrula.sql` çalıştırıldı (Success, hata / zaman aşımı yok) → sonra kontrol: `stk_hareket_kalem_fk` ve `stk_hareket_gecmis_kalem_fk` `dogrulanmis = true`, ihlal 0, tanımda NOT VALID yok. | — |
| 6 | **Yedekten dönüş provası** | **AÇIK — tamamlandı kanıtı YOK** | VERI-TUTARLILIGI-F0 § 6 ve GECIS-1.744.4 § 1.1 planı istiyordu (son günlük yedeğin tarihi / pg_dump); kaydı yok. Yerelde sınanan yalnız SQL geri dönüş dosyaları (geri-donus-*.sql, 3-geri-al.sql) — veri yedeğinden geri yükleme DEĞİL. Uygulama içi JSON tam geri yükleme fiş defteri kuruluyken kapalı (F5). | **Plan: `stok-v2/YEDEK-DONUS-PROVASI.md`** (canlıya dokunmaz; ayrı ortam). Salt-okur envanter: `guvenlik/8-yedek-envanter-salt-okur.sql` (yerelde sınandı). (a) Supabase panelinde yedeklerin varlığı, sıklığı, saklama süresi ve plan (kullanıcı); (b) kullanıcının kendi bilgisayarında `pg_dump` (parola depoya girmez); (c) prova: dökümü ayrı bir veritabanına geri yükleyip salt-okur kontrol (`canli-salt-okur-kontrol.sql`) + satır sayılarını karşılaştırmak. Döküm gerçek müşteri verisi içerir — nereye yükleneceği kullanıcı kararı. |
| 7 | **main'e birleştirme, dağıtım, surum.json** | **AÇIK** — ayrı ayrı onaylanır | Dalda yalnız SQL / test / belge değişiklikleri var (site-portal.sql, rls-kimlik.sql, stok-v2/*). Uygulama kaynağı (`src/`) 1.744.7'den beri değişmedi. | Birleştirme tek başına yapılabilir; uygulama kodu değişmediği için SURUM / HTML / surum.json değişikliği GEREKMEZ (CLAUDE.md değişiklik akışı yalnız uygulama değişince sürüm artırır). |

## Kapanmış (kanıtlı)

- Site girişi onarımı (`0-site-yetki-onar.sql`, 3 Kasım): 8 fonksiyon `girissiz_calistirir = true`, kullanıcı "Giriş çalıştı".
- Hesap sayfası düzeltmesi (`0b`, 3 Kasım): A 4× true, B satır yok, C hatasız, sayfa açıldı. **Değerler (devir / dönem / bakiye) canlıda veri eksikliği nedeniyle doğrulanamadı** — tek site hesabının hareketi yok; yalnız yerel `t-portal-hesap.js`. İlk gerçek hareketli site müşterisinde hesap sayfası ↔ ERP cari kartı karşılaştırılacak.
- Sıkılaştırma SQL doğrulaması (`2-sikilastir.sql`, 4 Kasım): 8/8. (Elle kullanım → madde 1.)

## 6 ve 7 — son durum (4 Kasım). İKİSİ DE CANLIDA TAMAMLANDI (6: iki anahtar convalidated=true; 7: 7-sonra-dogrula 6/6)

Test edilen commit **92cf0ee** (kaynak + 6 + 7 + testler); sonra yalnız salt-okur `7-sonra-dogrula.sql` eklendi (17ba480).

| Koşu | Sonuç | Çıktı |
|---|---|---|
| Bütünlük `kos-butunluk.sh` | çıkış 0 | `test/guvenlik/sonuc-butunluk-kaynak.txt` |
| Güvenlik `kos-guvenlik.sh` (t-site-surum-kapisi dahil) | TEMİZ, çıkış 0 | `test/guvenlik/sonuc-yerel.txt` |
| Geçiş provası `gecis-provasi.sh` | TEMİZ, çıkış 0 | `test/guvenlik/sonuc-gecis-provasi.txt` |
| `7-sonra-dogrula.sql` (yerel, canlı benzeri) | 7 öncesi: site tabloları 0/5 istisnada; 7 sonrası 6/6 tamam (kurallar canlıdaki gibi kapalıyken); bozulma denemesinde eksik ERP tablosunu adıyla ve açık kapıyı yakaladı | — |
