# Açık işler — öncelik sırası (kullanıcı, 4 Kasım)

Her satırda "durum" yalnız kanıta dayanır; kanıtı olmayan iş tamamlandı sayılmaz.

**Veri güvenilirliği sırası (kullanıcı, 4 Kasım):** 1) geri yüklenebilir yedek (madde 6) → 2) bütün cihazlarda 1.744.7 →
3) sürüm kapısı → 4) fiş kuralları. Her adım ayrı onayla. Panel kontrolü YAPILDI (4 Kasım): Free plan, Scheduled backups erişimi yok, PITR kapalı, yükseltme yok → Supabase'de geri yüklenebilir yedek YOK; yol bağımsız döküm + ayrı ortam. Sunucu sürümü 17.6 → istemci (pg_dump / psql) 17 ya da daha yeni olmalı. BEKLİYOR: kullanıcı bilgisayara geçince istemci kurulumu (adım 1); tablette (Termux) yapılmayacak.
PR #348: birleştirme onayı YOK. Sürüm kapısı ve fiş kuralları KAPALI. Elle kullanım ve cihaz kontrolleri BEKLİYOR.

| # | İş | Durum | Kanıt / eksik | Sonraki adım |
|---|---|---|---|---|
| 1 | **Elle kullanım doğrulaması** (sıkılaştırma sonrası: site girişi + vitrin + hesap sayfası, ERP'de bir kayıt, gün sonu raporu) | **BEKLİYOR** — kullanıcı sonra yapacak | `2-sikilastir.sql` canlıda; `2-sonra-dogrula.sql` 8/8 (4 Kasım). Elle deneme yapılmadı. | Kullanıcı üç denemeyi yapıp sonucu bildirir; sorun → `stok-v2/guvenlik/3-geri-al.sql` |
| 2 | **Fiş kuralları** (`guvenlik/9-kurallar-ac.sql`) ve **sürüm kapısı** (`guvenlik/10-surum-kapisi-ac.sql`) — kalan veri bütünlüğü korumaları | **AÇIK — ikisi de KAPALI; açma paketleri HAZIR (yerelde sınandı)** | 7 canlıda (6/6). Yerel hazırlık (4 Kasım): 1.744.7 bütün yazma yollarıyla uyumlu — tarayıcı ağ denetimi 261 senaryo, 12 308 yazmanın hepsi sürüm başlıklı, eski yol 0; iki koruma birlikte açık gerçek PG koşusu TEMİZ (000e48f, 25 süreç); dayanıklılık 43/43; normal kip regresyon kos-butunluk çıkış 0; paketler 35/35 (`guvenlik/IKI-KORUMA-ACMA.md`). **Bağımlılık:** sürüm kapısı açılınca fiş kuralları da açılır (`fis_kural_aktif` = fis_aktif VEYA kapı) — iki ayrı adım için sıra 9 → 10. | Önce yedek (madde 6) → bütün cihazlarda 1.744.7 (kullanıcı, BEKLİYOR) + `5-surum-durum` + `11-eski-hareket` (salt-okur) → **9** (ayrı onay) → elle deneme → **10** (ayrı onay). Sıra "kapı → kurallar" istenirse ilk adım ikisini birden açar. |
| 3 | **Kalıcılık değişiklikleri** (rls-kimlik.sql site fonksiyonlarını geri açar; 19 fonksiyonun kaynak tanımında search_path; 0b kaynağı site-portal.sql) | **DALDA, main'e birleşmedi** | `claude/erp-uygulamasi-devam-0601mp`; yerelde sınandı (kos-guvenlik, kos-butunluk, gecis-provasi temiz). Canlıda yeniden çalıştırma GEREKMEZ. | **PR #348 açıldı, birleştirilmedi** (bkz. madde 7). Birleştirme ayrı onay. Uygulama kodu değişmediği için sürüm / surum.json değişmez. |
| 4 | **Sızmış parola denetimi** | **AÇIK** — ayrı güvenlik ayarı | Plan uygunluğu ve mevcut ayar doğrulanmadı. | Supabase › Authentication parola güvenliği ayarı ve plan kontrolü (kullanıcı). |
| 5 | **Yabancı anahtar doğrulaması** | **TAMAMLANDI (4 Kasım, canlı)** | Ön kontrol: iki anahtar false, ihlal 0/0 → `6-fk-dogrula.sql` çalıştırıldı (Success, hata / zaman aşımı yok) → sonra kontrol: `stk_hareket_kalem_fk` ve `stk_hareket_gecmis_kalem_fk` `dogrulanmis = true`, ihlal 0, tanımda NOT VALID yok. | — |
| 6 | **Yedekten dönüş provası** | **AÇIK — gerçek döküm ve ayrı ortamda geri yükleme yapılana kadar açık kalır** (betikler yerelde sınandı: t-yedek-betikleri 34/34 — bu, provanın yapıldığı anlamına GELMEZ) | VERI-TUTARLILIGI-F0 § 6 ve GECIS-1.744.4 § 1.1 planı istiyordu (son günlük yedeğin tarihi / pg_dump); kaydı yok. Yerelde sınanan yalnız SQL geri dönüş dosyaları (geri-donus-*.sql, 3-geri-al.sql) — veri yedeğinden geri yükleme DEĞİL. Uygulama içi JSON tam geri yükleme fiş defteri kuruluyken kapalı (F5). | **Plan: `stok-v2/YEDEK-DONUS-PROVASI.md`** (canlıya dokunmaz; ayrı ortam). Salt-okur envanter: `guvenlik/8-yedek-envanter-salt-okur.sql`. Betikler: `stok-v2/yedek/dokum-al.sh`, `prova-geri-yukle.sh` (canlıya yüklemeyi reddeder, hatada durur, bağlantı bilgisi yazmaz). Panel: Free plan, panel yedeği ve PITR YOK (4 Kasım) — tek yedek bağımsız döküm olacak. (a) Supabase panelinde yedeklerin varlığı, sıklığı, saklama süresi ve plan (kullanıcı); (b) kullanıcının kendi bilgisayarında `pg_dump` (parola depoya girmez); (c) prova: dökümü ayrı bir veritabanına geri yükleyip salt-okur kontrol (`canli-salt-okur-kontrol.sql`) + satır sayılarını karşılaştırmak. Döküm gerçek müşteri verisi içerir — nereye yükleneceği kullanıcı kararı. |
| 7 | **main'e birleştirme, dağıtım, surum.json** | **AÇIK** — ayrı ayrı onaylanır | Dalda yalnız SQL / test / belge değişiklikleri var (site-portal.sql, rls-kimlik.sql, stok-v2/*). Uygulama kaynağı (`src/`) 1.744.7'den beri değişmedi. | Birleştirme tek başına yapılabilir; uygulama kodu değişmediği için SURUM / HTML / surum.json değişikliği GEREKMEZ (CLAUDE.md değişiklik akışı yalnız uygulama değişince sürüm artırır). |

## Kapanmış (kanıtlı)

- Site girişi onarımı (`0-site-yetki-onar.sql`, 3 Kasım): 8 fonksiyon `girissiz_calistirir = true`, kullanıcı "Giriş çalıştı".
- Hesap sayfası düzeltmesi (`0b`, 3 Kasım): A 4× true, B satır yok, C hatasız, sayfa açıldı. **Değerler (devir / dönem / bakiye) canlıda veri eksikliği nedeniyle doğrulanamadı** — tek site hesabının hareketi yok; yalnız yerel `t-portal-hesap.js`. İlk gerçek hareketli site müşterisinde hesap sayfası ↔ ERP cari kartı karşılaştırılacak.
- Sıkılaştırma SQL doğrulaması (`2-sikilastir.sql`, 4 Kasım): 8/8. (Elle kullanım → madde 1.)

## Son test koşusu (4 Kasım, 13:00–13:30 UTC)

| Koşu | Test edilen commit | Sonuç | Çıktı |
|---|---|---|---|
| Bütünlük `kos-butunluk.sh` | **4004e9b** | çıkış 0 | `test/guvenlik/sonuc-butunluk-kaynak.txt` |
| Güvenlik `kos-guvenlik.sh` (t-site-surum-kapisi dahil) | **4004e9b** | TEMİZ, çıkış 0 | `test/guvenlik/sonuc-yerel.txt` |
| Geçiş provası `gecis-provasi.sh` | **4004e9b** | TEMİZ, çıkış 0 | `test/guvenlik/sonuc-gecis-provasi.txt` |
| Yedek betikleri `t-yedek-betikleri.sh` | **4d602d9** | 34/34 temiz, çıkış 0 | `test/guvenlik/sonuc-yedek-betikleri.txt` |

4004e9b → 4d602d9 farkı yalnız `stok-v2/yedek/*`, `t-yedek-betikleri.sh` ve belgeler; ilk üç koşunun kullandığı dosyalara
dokunmaz. Yedek sınaması iki gerçek kusur buldu ve düzeltildi: dökümdeki `CREATE SCHEMA public` geri yüklemeyi ilk adımda
durduruyordu; iki hata denetimi doğru sonucu yanlış nedenle veriyordu (artık durulan adım ve hatanın kaynağı da denetleniyor).
**Bu sınama yedekten dönüş provası DEĞİLDİR** — madde 6 gerçek döküm + ayrı ortamda geri yükleme yapılana kadar AÇIK.

PR #348: main (6914e21) dalın atası, çatışma yok; GitHub `mergeable_state: clean` (önceki `mergeable: false` ilk açılıştaki
geçici hesaplamaydı). Birleştirilmedi.

Önceki koşu (6 ve 7 canlıya uygulanmadan önce): commit 92cf0ee, üç koşu temiz; 7-sonra-dogrula.sql yerelde 6/6 ve bozulma
denemesinde eksik ERP tablosunu ve açık kapıyı yakaladı. Canlıda 6 (iki anahtar convalidated=true) ve 7 (6/6) tamamlandı.
