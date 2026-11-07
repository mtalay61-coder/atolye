# Gece yedeği → OneDrive — kurulum ve işleyiş (7 Kasım)

Her gece **03:17 (İstanbul)** GitHub'ın makinesinde çalışır; sizin bilgisayarınızın açık olması gerekmez. Kurulum bir kez yapılır,
hepsi telefondan olur (~15 dakika).

## Her gece ne olur

1. **Döküm.** Canlı Supabase'in tam dökümü alınır: bütün tablolar ve satırlar, fonksiyonlar, tetikleyiciler, yetkiler, kullanıcı
   ve dosya kayıtları. Canlıya **yazılmaz** (salt-okur). Envanter (tablo başına satır sayısı, fonksiyon özetleri) ve döküm **aynı
   anlık görüntüden** alınır; gece biri kayıt girse bile ikisi aynı anı gösterir.
2. **Sınama — "doğru alıyor mu"nun cevabı.** Döküm, aynı makinede açılan **boş, geçici** bir PostgreSQL'e geri yüklenir. Geri
   yüklenen veritabanının envanteri canlınınkiyle karşılaştırılır: her tablonun satır sayısı, fonksiyon ve tetikleyici tanımlarının
   özeti, kullanıcı sayısı, dosya kayıtları. **Tek bir fark bile varsa yedek BAŞARISIZ sayılır.** Geçici veritabanı iş bitince yok olur.
3. **OneDrive.** Klasör `OneDrive › AtolyeYedek › <tarih-saat>` olarak yüklenir, sonra her dosya OneDrive'dan yeniden okunarak
   boyut ve özetle doğrulanır (yükleme sırasında bozulma da yakalanır). İçinde **TAMAM.txt** olur.
4. **Saklama.** 30 günden eski klasörler silinir; en yeni 7 klasöre hiç dokunulmaz. AtolyeYedek'teki başka dosyalara dokunulmaz.
5. **Uyarı.** Bir şey ters giderse iş kırmızıya düşer ve depoda **"Gece yedeği başarısız"** başlıklı bir kayıt (issue) açılır →
   GitHub size e-posta atar. Sınama başarısızsa döküm yine yüklenir ama klasör adı **`-SINANMADI`** ile biter ve içinde
   **BASARISIZ.txt** nedenini yazar. Ertesi gece düzelirse kayıt kendiliğinden kapanır.

## 1. Supabase bağlantı bilgileri (Supabase paneli)

1. Projeyi açın → üstteki **Connect** düğmesi → **Session pooler** (ücretsiz planda doğrudan bağlantı IPv6 olabilir; pooler kullanılır).
2. Oradaki iki değeri not edin: **host** (`aws-0-<bölge>.pooler.supabase.com` gibi) ve **user** (`postgres.<proje-kimliği>`). Port 5432.
3. **Veritabanı parolası:** biliyorsanız onu kullanın. Bilmiyorsanız Project Settings › Database › **Reset database password**.
   Uygulamanın kendisi bu parolayı kullanmaz (uygulama anahtarla bağlanır); bu parolayı başka bir araçta kullandıysanız orada da
   güncellemeniz gerekir.

## 2. GitHub secret'ları (github.com, telefondan da olur)

**a) Üç veritabanı değeri.** Depo `mtalay61-coder/atolye` › **Settings › Secrets and variables › Actions › New repository secret**:

| Ad | Değer |
|---|---|
| `YEDEK_DB_HOST` | 1.2'deki host |
| `YEDEK_DB_KULLANICI` | 1.2'deki user (`postgres.…`) |
| `YEDEK_DB_PAROLA` | veritabanı parolası |

**b) GitHub erişim anahtarı** (iş, yenilenen OneDrive erişimini her gece saklayabilsin diye):
github.com › profil › **Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token**

- Token name: `atolye-yedek` · Expiration: 1 yıl (bitiş tarihini takvime yazın; bitince iş kırmızıya düşer ve uyarır)
- Repository access: **Only select repositories** → `atolye`
- Permissions › Repository permissions: **Secrets: Read and write**, **Variables: Read and write** (başka hiçbir şey)
- Generate → çıkan anahtarı kopyalayın → depoda yeni secret: **`YEDEK_PAT`**

Secret değerleri GitHub'da şifreli durur; sohbete, depoya ya da iş kayıtlarına girmez.

## 3. OneDrive'ı bağla — bir kez

İpucu: önce ikinci bir sekmede depo › Settings › Secrets and variables › Actions › **Variables** sekmesini açık tutun.

1. Depo › **Actions** › soldan **"OneDrive'ı bağla (bir kez)"** › **Run workflow**.
2. Çalışan işi açın → **bagla** → **Bağla** adımı. Kayıtta bir Microsoft giriş bağlantısı çıkar (ya da işin **Summary** sayfasında).
3. Bağlantıyı açın, **kişisel Microsoft hesabınızla** girin ve izin verin. İzin ekranında uygulama adı **rclone** görünür — yükleme
   aracı budur (açık kaynak; yalnız OneDrive dosyalarına erişim ister).
4. Sayfa **"bağlanılamıyor / localhost"** der — bu **beklenen**. Adres çubuğundaki adresin **tamamını** kopyalayın
   (`http://localhost:53682/?code=…` ile başlar).
5. Variables sekmesinde **New repository variable** → Name: **`ONEDRIVE_KOD`** · Value: kopyaladığınız adres → **Add variable**.
   Bunu birkaç dakika içinde yapın (Microsoft'un kodu kısa ömürlü).
6. İş kodu birkaç saniyede alır, **değişkeni kendisi siler**, erişimi `ONEDRIVE_TOKEN` ve `ONEDRIVE_DRIVE_ID` secret'larına yazar ve
   OneDrive'da `AtolyeYedek/BENIOKU.txt` dosyasını açıp okuyarak sınar. Sonunda **BAĞLANDI** yazar.

Olmazsa (süre geçti, adres eksik kopyalandı) işi yeniden çalıştırın; önceki deneme bir şey bırakmaz.

## 4. İlk yedek (hemen)

Actions › **"Gece yedeği (OneDrive)"** › **Run workflow**. 2-5 dakika sürer. Yeşil biterse OneDrive › AtolyeYedek'te bugünün
klasörü ve içinde **TAMAM.txt** olur. TAMAM.txt'nin ilk satırlarını (tarih, süre, boyut, SONUÇ) bana yapıştırabilirsiniz;
müşteri verisi içermez.

## Klasörün içi

| Dosya | Ne |
|---|---|
| `public.dump` | uygulamanın bütün tabloları, satırları, fonksiyonları, yetkileri (pg_dump, sıkıştırılmış) |
| `auth-storage.sql` | kullanıcı hesapları ve dosya kayıtlarının satırları (yeni bir Supabase projesine yüklemek için) |
| `auth-storage-sema.sql` | aynı şemaların yapısı (düz bir PostgreSQL'e yüklemek için) |
| `kaynak-nesneler.txt` | uzantılar, yayınlar (realtime) ve yayına üye tablolar — geri dönüşte elle kurulacak liste |
| `envanter-kaynak.csv`, `envanter-sinama.csv`, `karsilastirma.txt` | canlı ve geri yüklenen veritabanının envanteri, karşılaştırma |
| `ozet.txt`, `TAMAM.txt` / `BASARISIZ.txt` | tarih, süre, boyut, özetler, sonuç |
| `sinama-ayrinti.txt` | geri yüklemenin ham çıktısı (hata olursa nedeni burada; paylaşmadan önce müşteri verisi içermediğine bakın) |

Geri dönüş (felakette): `stok-v2/YEDEK-DONUS-PROVASI.md` § 4 — yeni boş Supabase projesine `prova-geri-yukle.sh` ile.

## Güvenlik ve kapsam

- **Canlıya yazılmaz.** Döküm salt-okur; geri yükleme hedefi kodda yalnız `localhost` olabilir ve boş olmalıdır.
- **Depo herkese açık** → iş kayıtlarına ve uyarı kaydına veri, değer ya da hata ayrıntısı yazılmaz (yalnız adım adları ve sayılar);
  döküm GitHub'da saklanmaz (artifact yok), yalnız iş süresince geçici makinede durur. Secret'lar çatallardan (fork) gelen koda açılmaz
  (iş yalnız zamanlayıcıyla ve elle çalışır).
- **OneDrive'da müşteri verisi durur.** Microsoft hesabınızda **iki adımlı doğrulama** açık olsun.
- **Kapsam dışı** (ayrı not): Supabase Storage'daki DOSYALARIN kendisi (kayıtları yedekte), Edge Function gizli değerleri,
  Authentication / proje ayarları, cron işleri (envanterde listelenir, elle yeniden kurulur).
- **Erişim düşerse:** Microsoft hesabının parolasını değiştirirseniz OneDrive erişimi iptal olur → § 3'ü yeniden yapın.
  `YEDEK_PAT` süresi biterse → § 2b, yeni anahtar, aynı ad.
- **Durdurmak:** Actions › Gece yedeği › ⋯ › Disable workflow. Tamamen kaldırmak: secret'ları silin, `YEDEK_PAT`'i iptal edin,
  account.microsoft.com › Gizlilik › uygulama izinlerinden rclone'u kaldırın.

## Sınamalar (yerel; Supabase'e ve OneDrive'a bağlanmaz)

- `stok-v2/test/guvenlik/t-gece-yedek.sh` — 39/39 (`sonuc-gece-yedek.txt`): mutlu yol; **döküm sürerken canlıya sürekli yazma →
  yine AYNI** (anlık görüntü olmadan aynı yarış sağlam yedeği FARKLI gösteriyordu: canlı 44, yedek 46 satır); anlık görüntüsüz eski yol;
  sınama veritabanında tek satır eksik → BAŞARISIZ + `-SINANMADI`; dolu hedef; kopyalama hatası; OneDrive'da bozuk kopya; saklama
  (eski silinir, en yeni 7 kalır, az klasörde hiçbiri silinmez, başka klasöre dokunulmaz); localhost dışı hedef reddi; kayıtta parola /
  müşteri değeri / envanter satırı yok. Kaynakta Supabase'e benzer bağımlılıklar: auth.users'a yabancı anahtar, public şemasında uzantı
  ve ona bağlı dizin, realtime yayını.
- `stok-v2/test/guvenlik/t-onedrive-baglan.sh` — 21/21 (`sonuc-onedrive-baglan.txt`): jeton ve sürücü kimliği saklanır, kod
  değişkeni silinir, jeton / kod / kimlik kayda yazılmaz (yalnız maske satırı), yanlış state / eksik adres / iş hesabı reddedilir.
- `stok-v2/test/guvenlik/t-yedek-betikleri.sh` — 34/34 (anlık görüntü değişikliğinden sonra da).

**Sınanmayan (ilk gerçek çalıştırmada görülecek):** gerçek Supabase'in auth / storage şemasının düz PostgreSQL 17'ye geri yüklenmesi
ve gerçek OneDrive. İlk koşu "auth/storage şeması" ya da "public şeması" adımında durursa BASARISIZ.txt nedeni yazar; düzeltilir.
