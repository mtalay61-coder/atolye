# Açık işler — öncelik sırası (kullanıcı, 4 Kasım)

Her satırda "durum" yalnız kanıta dayanır; kanıtı olmayan iş tamamlandı sayılmaz.

| # | İş | Durum | Kanıt / eksik | Sonraki adım |
|---|---|---|---|---|
| 1 | **Elle kullanım doğrulaması** (sıkılaştırma sonrası: site girişi + vitrin + hesap sayfası, ERP'de bir kayıt, gün sonu raporu) | **BEKLİYOR** — kullanıcı sonra yapacak | `2-sikilastir.sql` canlıda; `2-sonra-dogrula.sql` 8/8 (4 Kasım). Elle deneme yapılmadı. | Kullanıcı üç denemeyi yapıp sonucu bildirir; sorun → `stok-v2/guvenlik/3-geri-al.sql` |
| 2 | **Fiş kuralları** (`19-fis-kural-ac.sql`) ve **sürüm kapısı** (`min_istemci_surum`) — kalan veri bütünlüğü korumaları | **AÇIK — ENGEL BULUNDU, düzeltmesi hazır** | Canlı (4 Kasım, `5-surum-durum-salt-okur.sql`): min_istemci_surum NULL, fiş kuralları kapalı; iz tablosunda tek kayıt `site_oturumlari INSERT` (3 Kasım 17:51 UTC) = sitedeki müşteri girişi, eski ERP uygulaması DEĞİL. **Bulgu:** sürüm denetimi site tablolarına da kurulu; kapı açılırsa site girişi / kayıt / siparişi AT001 ile reddedilir (yerelde üretildi). | Önce `stok-v2/guvenlik/7-surum-kapisi-site-istisna.sql` (ayrı onay; AÇIK LİSTE: site_giris_kaydi, site_hesaplari, site_kayit_talepleri, site_oturumlari, site_talepleri — yeni site_ tabloları kapının içinde kalır; kapı kapalıyken davranış değişmez; kaynak fis-defteri.sql'de kalıcı). `t-site-surum-kapisi.js` 12/12: kapı açıkken site giriş / kayıt / sipariş / çıkış çalışır, site siparişi ERP tablolarına yazmaz, ERP başlıksız ve eski sürüm AT001, 1.744.7 geçer. Sonra cihaz sürümü (her cihazda 1.744.7) → sürüm kapısı → fiş kuralları, ayrı onaylarla. |
| 3 | **Kalıcılık değişiklikleri** (rls-kimlik.sql site fonksiyonlarını geri açar; 19 fonksiyonun kaynak tanımında search_path; 0b kaynağı site-portal.sql) | **DALDA, main'e birleşmedi** | `claude/erp-uygulamasi-devam-0601mp`; yerelde sınandı (kos-guvenlik, kos-butunluk, gecis-provasi temiz). Canlıda yeniden çalıştırma GEREKMEZ. | main'e birleştirme (ayrı onay). Uygulama kodu değişmediyse sürüm / surum.json değişmez (aşağıda). |
| 4 | **Sızmış parola denetimi** | **AÇIK** — ayrı güvenlik ayarı | Plan uygunluğu ve mevcut ayar doğrulanmadı. | Supabase › Authentication parola güvenliği ayarı ve plan kontrolü (kullanıcı). |
| 5 | **Yabancı anahtar doğrulaması** (`stk_hareket_kalem_fk`, `stk_hareket_gecmis_kalem_fk` — F2'de NOT VALID, karar K5) | **AÇIK — yapılmadığı canlıda doğrulandı; ön koşul sağlandı** | Canlı (4 Kasım, `4-fk-durum-salt-okur.sql`): iki anahtar `dogrulanmis = false`, `ihlal_eden = 0`. Diğer iki anahtar (fis_id, varyant_id) zaten doğrulanmış. | `stok-v2/guvenlik/6-fk-dogrula.sql` (YAZAR, ayrı onay): tek ifadede iki `VALIDATE` (ya ikisi ya hiçbiri), `lock_timeout` 5 sn + `statement_timeout` 120 sn. Yerelde: çakışan kilitte 5 sn'de durdu, hiçbir şey değişmedi; süren normal yazmalar beklemedi / beklenmedi; ihlal varken hata, ikisi de doğrulanmamış kaldı; tekrar çalıştırmak zararsız. Davranış değiştirmez (anahtar yeni / değişen satırda zaten zorlanıyor). |
| 6 | **Yedekten dönüş provası** | **AÇIK — tamamlandı kanıtı YOK** | VERI-TUTARLILIGI-F0 § 6 ve GECIS-1.744.4 § 1.1 planı istiyordu (son günlük yedeğin tarihi / pg_dump); kaydı yok. Yerelde sınanan yalnız SQL geri dönüş dosyaları (geri-donus-*.sql, 3-geri-al.sql) — veri yedeğinden geri yükleme DEĞİL. Uygulama içi JSON tam geri yükleme fiş defteri kuruluyken kapalı (F5). | (a) Supabase panelinde yedeklerin varlığı, sıklığı, saklama süresi ve plan (kullanıcı); (b) kullanıcının kendi bilgisayarında `pg_dump` (parola depoya girmez); (c) prova: dökümü ayrı bir veritabanına geri yükleyip salt-okur kontrol (`canli-salt-okur-kontrol.sql`) + satır sayılarını karşılaştırmak. Döküm gerçek müşteri verisi içerir — nereye yükleneceği kullanıcı kararı. |
| 7 | **main'e birleştirme, dağıtım, surum.json** | **AÇIK** — ayrı ayrı onaylanır | Dalda yalnız SQL / test / belge değişiklikleri var (site-portal.sql, rls-kimlik.sql, stok-v2/*). Uygulama kaynağı (`src/`) 1.744.7'den beri değişmedi. | Birleştirme tek başına yapılabilir; uygulama kodu değişmediği için SURUM / HTML / surum.json değişikliği GEREKMEZ (CLAUDE.md değişiklik akışı yalnız uygulama değişince sürüm artırır). |

## Kapanmış (kanıtlı)

- Site girişi onarımı (`0-site-yetki-onar.sql`, 3 Kasım): 8 fonksiyon `girissiz_calistirir = true`, kullanıcı "Giriş çalıştı".
- Hesap sayfası düzeltmesi (`0b`, 3 Kasım): A 4× true, B satır yok, C hatasız, sayfa açıldı. **Değerler (devir / dönem / bakiye) canlıda veri eksikliği nedeniyle doğrulanamadı** — tek site hesabının hareketi yok; yalnız yerel `t-portal-hesap.js`. İlk gerçek hareketli site müşterisinde hesap sayfası ↔ ERP cari kartı karşılaştırılacak.
- Sıkılaştırma SQL doğrulaması (`2-sikilastir.sql`, 4 Kasım): 8/8. (Elle kullanım → madde 1.)

## 6 ve 7 — son durum (4 Kasım; HAZIR, canlıya UYGULANMADI, ayrı onay bekliyor)

Test edilen commit **92cf0ee** (kaynak + 6 + 7 + testler); sonra yalnız salt-okur `7-sonra-dogrula.sql` eklendi (17ba480).

| Koşu | Sonuç | Çıktı |
|---|---|---|
| Bütünlük `kos-butunluk.sh` | çıkış 0 | `test/guvenlik/sonuc-butunluk-kaynak.txt` |
| Güvenlik `kos-guvenlik.sh` (t-site-surum-kapisi dahil) | TEMİZ, çıkış 0 | `test/guvenlik/sonuc-yerel.txt` |
| Geçiş provası `gecis-provasi.sh` | TEMİZ, çıkış 0 | `test/guvenlik/sonuc-gecis-provasi.txt` |
| `7-sonra-dogrula.sql` (yerel, canlı benzeri) | 7 öncesi: site tabloları 0/5 istisnada; 7 sonrası 6/6 tamam (kurallar canlıdaki gibi kapalıyken); bozulma denemesinde eksik ERP tablosunu adıyla ve açık kapıyı yakaladı | — |
