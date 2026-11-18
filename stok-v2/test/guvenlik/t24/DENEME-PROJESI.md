# Boş deneme Supabase projesinde doğrulama — adımlar (hazırlık: 17 Kasım 2026, v1.744.25; 18 Kasım: kota, adım 6 ve deneme sunucusu koruması)

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
- **Uygulama sabit bir yerel adresten, korumalı sunucuyla açılır** (adım 6): `http://127.0.0.1:8080`.
  - Bu adresin yerel deposu (oturum, firma seçimi) `erp.newdiamond.com.tr`'nin deposundan tamamen ayrıdır.
  - Günlük kullandığınız uygulamanın cihazdaki durumuna dokunmaz; ayrı tarayıcı profili gerekmez.
- **Ana projeye bağlanma yolları gerçekten açık. Koruma bu yüzden var.**
  - Firma kodu rehberi yerelde `firmalar.json` bulamazsa GitHub'daki rehberi okur
    (`https://mtalay61-coder.github.io/atolye/firmalar.json`). Klasörde `firmalar.json` olmaması **yetmez**: düz bir yerel
    sunucuda "nds" yazmak ana projeyi seçer. Bu, yerel provada ölçüldü (kontrol koşusu).
  - "Gelişmiş" alanına ana projenin adresi de yazılabilir.
  - Bu yüzden düz `http.server` değil, `deneme-sunucu.py` kullanılır (adım 6). Sunucu, tarayıcıya yalnız deneme projesine
    bağlanma izni verir. Ana proje, GitHub rehberi ve diğer her adres tarayıcıda, ağa çıkmadan engellenir.

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
   select md5(string_agg(kategori || sayi || ozet, ',' order by kategori collate "C")) from public.kurulum_parmak_izi();
   ```
   Beklenen: adım 1'deki değer (`332d6e9b…`). `collate "C"` şart: Supabase veritabanı `en_US.UTF-8` sıralamasıyla gelir; o
   olmadan Türkçe harfli kategoriler başka sıraya düşer ve özet farklı çıkar (18 Kasım deneme projesinde görüldü:
   `f21635ca…`; sıralama sabitlenince `332d6e9b…`, birebir). Farklıysa şunun çıktısını paylaşın:
   `select kategori, sayi, ozet from public.kurulum_parmak_izi() order by kategori collate "C";`

## 4. 23 (platform tabloları) doğrulaması (siz)

1. `stok-v2/guvenlik/23-onkosul-salt-okur.sql`'i SQL Editor'de çalıştırın (salt okur). Beklenen: `UYGULANMIŞ` (`KARIŞIK` çıkarsa çıktının tamamını paylaşın).
2. `select (select count(*) from public.platform_firmalar) + (select count(*) from public.platform_sozlesmeler) + (select count(*) from public.platform_odemeler);` → 0 (veri taşınmadı).

## 5. İlk yönetici (siz — `yeni-firma-kurulum.md` §3)

1. **Authentication → Users → Add user → Create new user**: e-posta `deneme@atolye.local` (uygulamada kullanıcı adı `deneme`), şifre sizin belirleyeceğiniz, **Auto Confirm User** işaretli.
2. `yeni-firma-kurulum.md` §3'teki SQL'i `ahmet` → `deneme`, `Ahmet Yılmaz` → `Deneme Yönetici`, e-posta `deneme@atolye.local` ile çalıştırın.
3. Kontrol: `select public.yonetici_mi();` SQL Editor'de `false` döner (Editor'de JWT yok). Asıl ölçüm uygulamadan girişte.

## 6. Uygulamayı korumalı yerel sunucudan çalıştırma (siz)

Sürüm: dal `claude/yeni-firma-kurulum-v2`'deki `atolye-erp-v1.744.25.html` (yayında değil).

**Neden bu yol:**
- HTML'i çift tıklayıp `file://` ile açmayın: o kökende tarayıcının yerel depo davranışı farklıdır
  (`test/sonuc-yerel-depo-kaybi-yeniden-uretim.js`).
- GitHub'ın ham dosya adresi HTML'i düz metin verir, tarayıcıda çalışmaz.
- Dosya bilgisayarınızda `deneme-sunucu.py` ile, hep aynı adresten açılır.

### Koruma nasıl çalışır (`stok-v2/test/guvenlik/t24/deneme-sunucu.py`)

- **Başlık:** Sunucu sayfayı bir `Content-Security-Policy` başlığıyla gönderir. `connect-src` listesinde yalnız sayfanın
  kendisi ve **verdiğiniz deneme projesi** (`https://<kimlik>.supabase.co`, `wss://` dahil) vardır.
  - Tarayıcı listede olmayan her adrese fetch / XHR / WebSocket isteğini **ağa çıkarmadan** reddeder.
  - Engellenenler: ana proje, GitHub'daki firma rehberi, döviz kaynakları, `api.anthropic.com`.
- **Bildirim:** Engellenen her istek terminalde `ENGELLENDİ: <adres>` olarak görünür; ana projeye gidecek olan
  `<< ANA PROJE` ile işaretlenir.
- **Başlamama durumları:**
  - Ana projenin adresiyle (`mqdgucoomgqcvhvgixbl`) sunucu **hiç başlamaz**.
  - `https://<20 harf>.supabase.co` biçiminde olmayan adresle de başlamaz.
- **Sunulan dosyalar:** Sunucu yalnız uygulama dosyasını sunar. `surum.json`, `firmalar.json` vb. → 404, yani sürüm geçişi
  de yok. Yalnız `127.0.0.1`'den dinler.
- **Açık kalanlar:**
  - sayfa;
  - modüller (React vb. esm.sh'tan; bunlar betik yüklemesidir, `connect-src` değil);
  - yazı tipleri;
  - deneme projesi.
- **Normal yayın paketine etkisi YOK.**
  - Koruma uygulama dosyasında değil, yalnız bu yerel sunucunun HTTP başlığındadır.
  - Sunulan dosya yayın paketiyle bayt bayt aynıdır; sunucu açılışta SHA-256 özetini yazar.
  - GitHub Pages bu başlığı göndermez. `erp.newdiamond.com.tr`'deki uygulama, kodu aynı olsa da bu korumayı görmez ve
    bugünkü gibi çalışır.
  - Bu, korumanın **yalnız deneme sunucusuyla açılan sayfayı** kapsadığı anlamına da gelir. Aynı dosyayı başka bir yoldan
    açarsanız koruma yoktur.
- **Yerel prova (18 Kasım, `deneme-provasi.sh`): 25/25.** Kurulum dosyasıyla kurulmuş yerel veritabanı ve taklit ana proje
  kullanıldı; gerçek ağa çıkılmadı.
  - **Kontrol (korumasız düz sunucu):** "nds" kodu GitHub rehberinden ana projeye çözülüp **seçildi**. Kapatılan yol gerçek.
  - **Korumalı, "nds":** seçim yazılmadı; ekranda "Firma listesi okunamadı (…)"; ana projeye ve GitHub'a 0 ağ isteği.
  - **Korumalı, Gelişmiş'e ana proje adresi + anahtarı:** seçim yazılmadı; "Sunucuya ulaşılamadı — …"; ana projeye 0 ağ
    isteği; terminalde `<< ANA PROJE`.
  - **Korumalı, deneme projesi:** secret anahtar reddi, tek tıkla bağlanma, giriş, oturum saklanması, F5'te şifre istenmemesi.
    İzinli olmayan hiçbir adrese ağ isteği yok.

**Gerekenler:**
- Python 3: Windows'ta `py`, macOS'ta `python3`. Windows'ta yoksa `winget install Python.Python.3.12` (ya da python.org).
- İnternet: React esm.sh'tan, yazı tipleri Google Fonts'tan gelir.

### Windows (PowerShell)

```powershell
mkdir C:\atolye-deneme
cd C:\atolye-deneme
curl.exe -L -o atolye-erp-v1.744.25.html https://raw.githubusercontent.com/mtalay61-coder/atolye/refs/heads/claude/yeni-firma-kurulum-v2/atolye-erp-v1.744.25.html
curl.exe -L -o deneme-sunucu.py https://raw.githubusercontent.com/mtalay61-coder/atolye/refs/heads/claude/yeni-firma-kurulum-v2/stok-v2/test/guvenlik/t24/deneme-sunucu.py
Get-FileHash atolye-erp-v1.744.25.html, deneme-sunucu.py -Algorithm SHA256
py deneme-sunucu.py --proje https://<deneme-proje-kimliği>.supabase.co
```

### macOS (Terminal)

```bash
mkdir -p ~/atolye-deneme && cd ~/atolye-deneme
curl -L -o atolye-erp-v1.744.25.html https://raw.githubusercontent.com/mtalay61-coder/atolye/refs/heads/claude/yeni-firma-kurulum-v2/atolye-erp-v1.744.25.html
curl -L -o deneme-sunucu.py https://raw.githubusercontent.com/mtalay61-coder/atolye/refs/heads/claude/yeni-firma-kurulum-v2/stok-v2/test/guvenlik/t24/deneme-sunucu.py
shasum -a 256 atolye-erp-v1.744.25.html deneme-sunucu.py
python3 deneme-sunucu.py --proje https://<deneme-proje-kimliği>.supabase.co
```

**Kontroller:**
- `<deneme-proje-kimliği>`: deneme projesinin Settings → API → Project URL'sindeki 20 harf. **Ana projenin adresi değil**;
  verirseniz sunucu zaten başlamaz.
- Özetler: uygulama dosyası `796cfc4edcb1c77f404866c3ef98d449bc27827b1d0f375e482630f497b004a1`; `deneme-sunucu.py` için
  güncel özet bu rehberi verdiğim mesajdadır (dal ucuna göre). Farklıysa durun ve haber verin.
- Sunucunun açılışta yazdığı SHA-256, uygulama dosyasınınkiyle aynı olmalı.
- Sunucu penceresi açık kalmalı. Kapatmak: Ctrl+C. Sonraki denemelerde klasöre girip yalnız son satırı yeniden çalıştırın.
- **Pencerede `ENGELLENDİ` satırları görmek normaldir:** döviz kaynakları ve api.anthropic.com her açılışta (giriş
  ekranında da) denenir; F12 açıksa esm.sh `*.mjs.map` (kaynak haritası) satırları da çıkar, zararsızdır.
  `<< ANA PROJE` işaretli satır görürseniz ne yaptığınızı not edip haber verin.

**Bağlanma:**
1. Tarayıcıda `http://127.0.0.1:8080/` adresini açın (uygulama dosyasına yönlenir). Hep aynı adres ve port; port değişirse
   yerel depo da değişir.
2. Firma kodu ekranında **kod yazmayın** → **Gelişmiş: sunucu adresi ve anahtar**.
   - Project URL: deneme projesinin adresi (sunucuya verdiğinizle aynı).
   - **Publishable** anahtar: Settings → API Keys.
   - Secret anahtar girilirse uygulama reddeder; öyle olmalı.
3. **Bağlan** → sayfa bir kez yeniden açılır → giriş ekranı → adım 5'teki kullanıcıyla giriş.

**Uygulamanın denediği dış adresler (sunucuda hepsi engellenir):**
- Döviz kuru kaynakları: tcmb.gov.tr, haremaltin, frankfurter ve açık aracılar (allorigins, codetabs, corsproxy,
  thingproxy).
- Son çare olarak `api.anthropic.com`. Bu, dış AI entegrasyonu istememe kararına (DEVAM-NOTU 7a) **aykırı mevcut bir
  davranış**. Kaydı DEVAM-NOTU'da "AÇIK AYKIRILIK — DÖVİZ KURU İÇİN api.anthropic.com" başlığında; düzeltmesi ayrı iş.
- Kur deneme ortamında otomatik gelmez; gerekirse rozetteki kalemle elle girilir.

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

## 18 Kasım 2026 sonucu

Bu rehberle gerçek bir boş ücretsiz Supabase projesinde 1–7. adımlar uçtan uca geçti; ayrıntı
`sonuc-deneme-projesi-2026-11-18.txt`. Kısaca:
- **Kurulum:** 18/18; parmak izi `collate "C"` ile birebir.
- **23:** UYGULANMIŞ.
- **Koruma:** tarayıcıda engelledi, ana projeye 0 istek.
- **Uygulama akışı:** RLS girişsiz okumayı kesti; giriş başarılı; F5'te şifre istenmedi.
- **Stok:** 3, fiş `MNL-…001`.
- **Kasa:** +150, fiş `TH-…001`; sunucu doğrulaması birebir.
- **Kurulum dosyası indirme:** çalıştı.

## Kapsam: bugüne kadar gerçek Supabase'de SINANMAYANLAR

| Konu | Bugünkü sınama | Deneme projesi kapatır mı |
|---|---|---|
| Kurulum dosyasının gerçek SQL Editor'de çalışması | `editor-icin.py` ile Editor bölmesi taklidi, yerel PG16 | **Kapandı (18 Kasım): 18/18** |
| Supabase'in hazır şemaları (auth, storage, realtime, vault, graphql, uzantılar) ile çakışma | Asgari taban (t19 kur.sql başı) | **Kapandı (18 Kasım):** kurulum hatasız, 23 UYGULANMIŞ |
| `supabase_realtime` yayını | Yerelde iki yol (var / yok) | **Kapandı (18 Kasım):** yayınlar kategorisi kaynakla birebir (0) |
| Gerçek giriş (GoTrue), JWT, PostgREST, RLS'in gerçek rollerle uygulanması | authenticator + `request.jwt.claims` taklidi; tarayıcıda köprü (köprü her şifreyi kabul eder) | **Kısmen kapandı (18 Kasım):** gerçek şifreyle giriş, F5'te oturum, anon okuma RLS'le kesildi, Yönetici yazmaları (tanımlar, stok fişi, kasa fişi) geçti. Yönetici dışı rollerin (personel vb.) RLS'i gerçekte sınanmadı |
| Kaynağın canlı ile birebirliği | `atolye_guvenlik` depodaki SQL'lerden kurulur; canlı şema dökümüyle karşılaştırılmadı | **Hayır** — canlıdan üretilen dosya gerekir |
| `kurulum-betigi.sql` ve 23'ün ana projede (canlı) çalışması | Yalnız yerel | **Hayır** — onayınızla canlı SQL |
| Firmalar arası ayrımın gerçek iki projede ölçülmesi | Yerelde iki veritabanı (t24 66/66, ekran 42/42) | **Hayır**: ana proje etkinken ikinci bir ücretsiz proje aynı anda etkin olamaz (kota kullanıcı başına 2) |
| Edge Functions (gün sonu, yedek), cron işleri, storage bucket'ları, secret'lar | Kurulum dosyasının kapsamı dışında (`yeni-firma-kurulum.md` §4 elle) | Kısmen — §4 ayrıca denenebilir |
| Firma rehberine (firmalar.json) yeni kod ekleme | Taklit rota | Hayır (yayın gerektirir) |
| Paketlenmiş HTML'in (React esm.sh'tan) açılışı | Prova aynı kodun test paketiyle (React içinde) yapıldı; bu ortamda esm.sh engelli | **Kapandı (18 Kasım)** |
| Korumanın gerçek tarayıcınızda (Chrome / Edge / Safari) CSP'yi uygulaması | Chromium'da 25/25 | **Kapandı — Chrome (Windows), 18 Kasım:** engelleme + bildirim; Edge / Safari sınanmadı |
| Safari / mobil tarayıcılar | Yalnız Chromium | Kullanılan tarayıcıya bağlı |
