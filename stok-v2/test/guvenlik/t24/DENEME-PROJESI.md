# Boş deneme Supabase projesinde doğrulama — adımlar (hazırlık: 17 Kasım 2026, v1.744.25)

Amaç: yeni firma kurulumunu (v2 kurulum dosyası + 23 platform tabloları) ve uygulamanın yeni firmaya bağlanmasını **gerçek
Supabase'de** sınamak. Bugüne kadarki bütün testler yerel PostgreSQL 16 ve taklit katmanlarla yapıldı (bkz. "Kapsam" sonda).

**Canlıya dokunulmaz.** Ana projede hiçbir SQL çalışmaz; `surum.json` değişmez; yayın yok. Kurulum dosyası canlıdan değil, depodaki
SQL'lerden kurulan yerel canlı-benzeri kopyadan üretilir (`deneme-dosyasi-uret.sh`). Gizli değerler (veritabanı şifresi, secret
anahtar, kullanıcı şifresi) sohbette paylaşılmaz; ekran görüntülerinde görünmemeli.

## 0. Önce bilinmesi gerekenler

- **Ücretsiz plan:** kuruluş başına en çok 2 etkin proje. Ana proje + 1 deneme projesi sığar; üçüncüsü açılmaz.
  Deneme projesi 7 gün kullanılmazsa Supabase onu duraklatır. İş bitince silinebilir (adım 9).
- **Tarayıcı:** denemeyi AYRI bir tarayıcı profilinde (ya da başka bir tarayıcıda) yapın. Firma değiştirme, o profildeki ana
  firmanın yerel durumunu (oturum, bekleyen kayıtlar) saklama kutusuna kaldırır. Günlük kullandığınız profilde yapmayın.
- **Deneme profilinde ana firmaya geçmeyin.** Ana firmaya bağlanmak canlıya giriş ve günlük yazması demek. Firmalar arası veri
  ayrımı yerelde sınandı (t24 + ekran testi); gerçek Supabase'de ayrım ikinci bir deneme projesi gerektirir, ücretsiz planda
  sığmaz.

## 1. Kurulum dosyasını hazırlama (Claude yapar)

```bash
PGHOST=localhost stok-v2/test/guvenlik/t24/deneme-dosyasi-uret.sh <çıktı klasörü>
```

Çıktı: `deneme-kurulum.sql` (17 Kasım ölçümü: 6018 satır, 799 adım, SQL Editor'de 2 ifade) ve `deneme-parmak-izi.txt`.
Betik, dosyayı önce yerel boş veritabanında Editor gibi dener. Hata 0, doğrulama 18/18 ve parmak izi birebir değilse
dosya verilmez. 17 Kasım parmak izi: `332d6e9b6124c6058a76f8493bc3cf65`.
Dosyada ana firma verisi yok: yalnız yapı + üç ayar satırı (stk_ayar, boş degisiklik, boş kas_ayar). Gizli değer araması 0.

## 2. Boş proje açma (siz)

1. supabase.com → **New project**. Ad: `atolye-deneme`; bölge ana projeyle aynı; veritabanı şifresini parola yöneticinize
   kaydedin (sohbette paylaşmayın).
2. Proje hazır olunca **hiçbir tablo eklemeyin**: kurulum yalnız boş `public` şemasında çalışır (dolu projede dokunmadan durur).

## 3. Kurulum dosyasını çalıştırma (siz)

1. **SQL Editor → New query** → `deneme-kurulum.sql`'in tamamını yapıştırın → **Run**.
2. Beklenen: sonuç tablosu **18 satır**, hepsinin son sütunu `tamam`.
3. Hata çıkarsa: ekranda `KURULUM DURDU — <n>. adım: <açıklama>` ya da `DOĞRULAMASI TUTMADI` yazar. Bu durumda dosya hiçbir şey
   bırakmaz (public boş kalır). İletinin metnini olduğu gibi paylaşın (gizli değer içermez).
4. Parmak izi (yeni sorgu):
   ```sql
   select md5(string_agg(kategori || sayi || ozet, ',' order by kategori)) from public.kurulum_parmak_izi();
   ```
   Beklenen: adım 1'deki değer (`332d6e9b…`). Farklıysa şunun çıktısını paylaşın:
   `select kategori, sayi, ozet from public.kurulum_parmak_izi() order by kategori;`

## 4. 23 (platform tabloları) doğrulaması (siz)

1. `stok-v2/guvenlik/23-onkosul-salt-okur.sql`'i SQL Editor'de çalıştırın (salt okur). Beklenen: `UYGULANMIŞ` (`KARIŞIK` çıkarsa çıktının tamamını paylaşın).
2. `select (select count(*) from public.platform_firmalar) + (select count(*) from public.platform_sozlesmeler) + (select count(*) from public.platform_odemeler);` → 0 (veri taşınmadı).

## 5. İlk yönetici (siz — `yeni-firma-kurulum.md` §3)

1. **Authentication → Users → Add user → Create new user**: e-posta `deneme@atolye.local` (uygulamada kullanıcı adı `deneme`), şifre sizin belirleyeceğiniz, **Auto Confirm User** işaretli.
2. `yeni-firma-kurulum.md` §3'teki SQL'i `ahmet` → `deneme`, `Ahmet Yılmaz` → `Deneme Yönetici`, e-posta `deneme@atolye.local` ile çalıştırın.
3. Kontrol: `select public.yonetici_mi();` SQL Editor'de `false` döner (Editor'de JWT yok). Asıl ölçüm uygulamadan girişte.

## 6. Uygulamayı deneme projesine bağlama (siz, ayrı profilde)

Sürüm: dal `claude/yeni-firma-kurulum-v2`'deki `atolye-erp-v1.744.25.html` (yayında değil). Bu dosyayı GitHub'dan indirip ayrı
profilde açın. Firma rehberine (firmalar.json) deneme kodu EKLENMEZ; bağlantı elle yapılır:

1. Firma kodu ekranı → **Gelişmiş** → Project URL ve **Publishable** anahtar (Settings → API Keys). Secret anahtar girilirse
   uygulama reddeder; öyle olmalı.
2. Bağlan → sayfa bir kez yeniden açılır → giriş ekranı → adım 5'teki kullanıcıyla giriş.

## 7. Uygulamada kontrol listesi (siz)

| # | İşlem | Beklenen |
|---|---|---|
| 1 | Girişten sonra sayfayı yenile (F5) | Şifre yeniden **istenmez** (1.744.25 düzeltmesi) |
| 2 | Tanımlar'a bir ürün + renk/ölçü; Stok'ta bağımsız giriş (ör. 3 adet) | Stok 3; Table Editor `stk_stok`'ta satır |
| 3 | Bir cari + Kasa & Banka'da nakit tahsilat (ör. 150) | Kasa bakiyesi +150; `kas_hareket`'te satır |
| 4 | Bir alış faturası (fiş) | Fiş numarası bu projede ilk numaradan (…001) başlar |
| 5 | Ana firmanın hiçbir ürünü / carisi / fişi | Görünmez (proje boş başladı) |
| 6 | Tanımlar › Yedek & Bulut › "Yeni firma kurulum dosyasını indir" | Dosya iner (deneme projesinde de `kurulum_betigi` var) |

Sorun olursa: ekranın görüntüsü (adres çubuğu ve anahtar alanları görünmeden) ve tarayıcı konsolundaki kırmızı satırlar.

## 8. Sonuçları bildirme

Paylaşın: adım 3'ün 18 satırı (ya da durma iletisi), adım 3.4 ve 4'ün çıktısı, adım 7 tablosunun her satırı için geçti/kaldı.
Paylaşmayın: şifreler, secret anahtar, erişim jetonları.

## 9. Temizlik

Proje → Settings → General → **Delete project** (ya da duraklatın). Ayrı tarayıcı profilini silin.

## Kapsam: bugüne kadar gerçek Supabase'de SINANMAYANLAR

| Konu | Bugünkü sınama | Deneme projesi kapatır mı |
|---|---|---|
| Kurulum dosyasının gerçek SQL Editor'de çalışması | `editor-icin.py` ile Editor bölmesi taklidi, yerel PG16 | Evet (adım 3) |
| Supabase'in hazır şemaları (auth, storage, realtime, vault, graphql, uzantılar) ile çakışma | Asgari taban (t19 kur.sql başı) | Evet |
| `supabase_realtime` yayını | Yerelde iki yol (var / yok) | Evet (gerçek hâli) |
| Gerçek giriş (GoTrue), JWT, PostgREST, RLS'in gerçek rollerle uygulanması | authenticator + `request.jwt.claims` taklidi; tarayıcıda köprü | Evet (adım 5–7) |
| Kaynağın canlı ile birebirliği | `atolye_guvenlik` depodaki SQL'lerden kurulur; canlı şema dökümüyle karşılaştırılmadı | **Hayır** — canlıdan üretilen dosya gerekir |
| `kurulum-betigi.sql` ve 23'ün ana projede (canlı) çalışması | Yalnız yerel | **Hayır** — onayınızla canlı SQL |
| Firmalar arası ayrımın gerçek iki projede ölçülmesi | Yerelde iki veritabanı (t24 66/66, ekran 42/42) | **Hayır** — ücretsiz planda ikinci deneme projesi sığmaz |
| Edge Functions (gün sonu, yedek), cron işleri, storage bucket'ları, secret'lar | Kurulum dosyasının kapsamı dışında (`yeni-firma-kurulum.md` §4 elle) | Kısmen — §4 ayrıca denenebilir |
| Firma rehberine (firmalar.json) yeni kod ekleme | Taklit rota | Hayır (yayın gerektirir) |
| Safari / mobil tarayıcılar | Yalnız Chromium | Kullanılan tarayıcıya bağlı |
