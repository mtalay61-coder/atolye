# Boş deneme Supabase projesinde doğrulama — adımlar (hazırlık: 17 Kasım 2026, v1.744.25; adım 6 ve kota düzeltildi)

Amaç: yeni firma kurulumunu (v2 kurulum dosyası + 23 platform tabloları) ve uygulamanın yeni firmaya bağlanmasını **gerçek
Supabase'de** sınamak. Bugüne kadarki bütün testler yerel PostgreSQL 16 ve taklit katmanlarla yapıldı (bkz. "Kapsam" sonda).

**Canlıya dokunulmaz.** Ana projede hiçbir SQL çalışmaz; `surum.json` değişmez; yayın yok. Kurulum dosyası canlıdan değil, depodaki
SQL'lerden kurulan yerel canlı-benzeri kopyadan üretilir (`deneme-dosyasi-uret.sh`). Gizli değerler (veritabanı şifresi, secret
anahtar, kullanıcı şifresi) sohbette paylaşılmaz; ekran görüntülerinde görünmemeli.

## 0. Önce bilinmesi gerekenler

- **Ücretsiz proje kotası (Supabase faturalama belgeleri):** sınır kuruluş başına değil, **kullanıcı başına**. Owner ya da
  Administrator olduğunuz bütün kuruluşlarda toplam **2 etkin ücretsiz proje** açılabilir. Yeni kuruluş açmak kota açmaz.
  - **Duraklatılmış projeler sayılmaz.** Ücretsiz projeler 1 hafta hareketsiz kalınca duraklatılır.
  - Ana proje ücretsiz plandaysa ve başka etkin ücretsiz projeniz yoksa, **1 deneme projesi** açılabilir. Başka bir etkin
    ücretsiz projeniz varsa deneme projesi açılmaz. Önce Dashboard'daki proje listesine bakın.
  - Gerçek iki projede firmalar arası ayrım, iki deneme projesinin AYNI ANDA etkin olmasını gerektirir. Ana proje etkin
    kaldıkça bu kotaya sığmaz.
- **Uygulama sabit bir yerel adresten açılır** (adım 6): `http://127.0.0.1:8080`. Bu adresin yerel deposu (oturum, firma
  seçimi) `erp.newdiamond.com.tr`'nin deposundan tamamen ayrıdır. Günlük kullandığınız uygulamanın cihazdaki durumuna dokunmaz;
  ayrı tarayıcı profili gerekmez.
- **Deneme adresinde ana firmaya bağlanmayın.** İlk ekranda firma kodu yazmayın, yalnız "Gelişmiş" ile deneme projesinin
  adresini girin. Ana firmaya bağlanmak canlıya giriş ve günlük yazması demektir.

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

## 6. Uygulamayı sabit adresten, canlıya bağlanmadan çalıştırma (siz)

Sürüm: dal `claude/yeni-firma-kurulum-v2`'deki `atolye-erp-v1.744.25.html` (yayında değil).

**Neden sabit adres:**
- HTML'i çift tıklayıp `file://` ile açmayın. O kökende tarayıcının yerel depo davranışı farklıdır (bkz.
  `test/sonuc-yerel-depo-kaybi-yeniden-uretim.js`) ve gerçek kullanımı temsil etmez.
- GitHub'ın ham dosya adresi HTML'i düz metin olarak verir; tarayıcıda çalışmaz.
- Bu yüzden dosya bilgisayarınızda küçük bir yerel sunucudan, hep aynı adresten açılır.

**Klasörde yalnız bu dosya olmalı.**
- `surum.json` yoksa uygulama başka bir sürüme kendiliğinden geçmez.
- `firmalar.json` yoksa firma kodu rehberi çalışmaz; ana firmaya kodla yanlışlıkla bağlanılamaz.

**Gerekenler:** Python 3 (Windows'ta `py`, macOS'ta `python3`) ve internet. React esm.sh'tan, yazı tipleri Google Fonts'tan gelir.
Windows'ta Python yoksa: `winget install Python.Python.3.12` (ya da python.org).

### Windows (PowerShell)

```powershell
mkdir C:\atolye-deneme
cd C:\atolye-deneme
curl.exe -L -o atolye-erp-v1.744.25.html https://raw.githubusercontent.com/mtalay61-coder/atolye/refs/heads/claude/yeni-firma-kurulum-v2/atolye-erp-v1.744.25.html
Get-FileHash atolye-erp-v1.744.25.html -Algorithm SHA256
py -m http.server 8080 --bind 127.0.0.1
```

### macOS (Terminal)

```bash
mkdir -p ~/atolye-deneme && cd ~/atolye-deneme
curl -L -o atolye-erp-v1.744.25.html https://raw.githubusercontent.com/mtalay61-coder/atolye/refs/heads/claude/yeni-firma-kurulum-v2/atolye-erp-v1.744.25.html
shasum -a 256 atolye-erp-v1.744.25.html
python3 -m http.server 8080 --bind 127.0.0.1
```

**Kontroller:**
- Özet `796cfc4edcb1c77f404866c3ef98d449bc27827b1d0f375e482630f497b004a1` olmalı (17 Kasım, dal ucu). Farklıysa
  durun ve haber verin.
- Sunucu penceresi açık kalmalı. Kapatmak: Ctrl+C. Sonraki denemelerde yalnız klasöre girip son satırı (sunucu komutunu)
  yeniden çalıştırın.
- `--bind 127.0.0.1`: sunucu yalnız sizin bilgisayarınızdan erişilebilir.

**Bağlanma:**
1. Tarayıcıda `http://127.0.0.1:8080/atolye-erp-v1.744.25.html` adresini açın. Hep aynı adres ve port kullanılmalı; port
   değişirse yerel depo da değişir, firma yeniden seçilir.
2. Firma kodu ekranında **kod yazmayın** → **Gelişmiş: sunucu adresi ve anahtar**.
   - Project URL: deneme projesinin adresi.
   - **Publishable** anahtar: Settings → API Keys.
   - Secret anahtar girilirse uygulama reddeder; öyle olmalı.
3. **Bağlan** → sayfa bir kez yeniden açılır → giriş ekranı → adım 5'teki kullanıcıyla giriş.

**Yerel prova (17 Kasım, `deneme-provasi.sh`):** aynı akış, aynı uygulama kodu, sabit `http://127.0.0.1` adresinde. Deneme
projesi yerine kurulum dosyasıyla kurulmuş yerel veritabanı kullanıldı. Sonuç 11/11:
- firma kodu ekranı;
- secret anahtar reddi;
- tek tıkla bağlanma;
- giriş, oturumun saklanması, F5'te şifre istenmemesi;
- **canlı projeye (`mqdgucoomgqcvhvgixbl.supabase.co`) açılıştan sona 0 istek.**

**Uygulamanın gittiği dış adresler:**
- Deneme projesi.
- Google Fonts.
- Döviz kuru kaynakları: tcmb.gov.tr, haremaltin, frankfurter ve açık aracılar (allorigins, codetabs, corsproxy,
  thingproxy). Kur, bunlarla birlikte son çare olarak `api.anthropic.com`'a sabit bir soru gönderilerek de aranıyor. ERP
  verisi gitmez, anahtar yoktur; tarayıcıdan reddedilir. Bu davranış main'de de var, bu işin kapsamında değiştirilmedi.

## 7. Uygulamada kontrol listesi (siz)

| # | İşlem | Beklenen |
|---|---|---|
| 1 | Girişten sonra ana ekran yüklenince (birkaç saniye) sayfayı yenile (F5) | Şifre yeniden **istenmez** (1.744.25 düzeltmesi). Oturum, veriler yüklenince saklanır; girişten hemen sonraki ilk saniyede yenilenirse şifre yeniden istenebilir |
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

Proje → Settings → General → **Delete project** (ya da duraklatın; duraklatılmış proje kotaya sayılmaz). Sunucu penceresini
Ctrl+C ile kapatıp `atolye-deneme` klasörünü silin. Tarayıcıda `127.0.0.1:8080` için site verilerini silmek isteğe bağlı.

## Kapsam: bugüne kadar gerçek Supabase'de SINANMAYANLAR

| Konu | Bugünkü sınama | Deneme projesi kapatır mı |
|---|---|---|
| Kurulum dosyasının gerçek SQL Editor'de çalışması | `editor-icin.py` ile Editor bölmesi taklidi, yerel PG16 | Evet (adım 3) |
| Supabase'in hazır şemaları (auth, storage, realtime, vault, graphql, uzantılar) ile çakışma | Asgari taban (t19 kur.sql başı) | Evet |
| `supabase_realtime` yayını | Yerelde iki yol (var / yok) | Evet (gerçek hâli) |
| Gerçek giriş (GoTrue), JWT, PostgREST, RLS'in gerçek rollerle uygulanması | authenticator + `request.jwt.claims` taklidi; tarayıcıda köprü (köprü her şifreyi kabul eder) | Evet (adım 5–7) |
| Kaynağın canlı ile birebirliği | `atolye_guvenlik` depodaki SQL'lerden kurulur; canlı şema dökümüyle karşılaştırılmadı | **Hayır** — canlıdan üretilen dosya gerekir |
| `kurulum-betigi.sql` ve 23'ün ana projede (canlı) çalışması | Yalnız yerel | **Hayır** — onayınızla canlı SQL |
| Firmalar arası ayrımın gerçek iki projede ölçülmesi | Yerelde iki veritabanı (t24 66/66, ekran 42/42) | **Hayır**: ana proje etkinken ikinci bir ücretsiz proje aynı anda etkin olamaz (kota kullanıcı başına 2) |
| Edge Functions (gün sonu, yedek), cron işleri, storage bucket'ları, secret'lar | Kurulum dosyasının kapsamı dışında (`yeni-firma-kurulum.md` §4 elle) | Kısmen — §4 ayrıca denenebilir |
| Firma rehberine (firmalar.json) yeni kod ekleme | Taklit rota | Hayır (yayın gerektirir) |
| Paketlenmiş HTML'in (React esm.sh'tan) açılışı | Prova aynı kodun test paketiyle (React içinde) yapıldı; bu ortamda esm.sh engelli | Evet (adım 6) |
| Safari / mobil tarayıcılar | Yalnız Chromium | Kullanılan tarayıcıya bağlı |
