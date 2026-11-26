# Gece yedeğini YALITILMIŞ yerel veritabanına açma (yalnız okuma için) — ELLE YOL

Önerilen daha kısa yol: `is-akisi/yedek-ac.yml` (GitHub Actions; kurulum gerektirmez). Bu belge, o yol kullanılamazsa.

Amaç: hata öncesi varyant kimliklerini, kombinasyonları ve reçeteleri görmek. **Canlıya hiçbir şey yüklenmez.** Supabase
bağlantısı, parola ya da anahtar GEREKMEZ — her şey sizin bilgisayarınızda, yalnız `localhost`'ta.

## 0. Önce koruyun (saklama temizliğinde kaybolmasın)

Gece yedeği OneDrive'da `AtolyeYedek/<YYYY-AA-GG-SSDD>` klasörlerine yazılır; her gece **30 günden eski** klasörler
silinir (en yeni 7 klasöre hiç dokunulmaz). Temizlik yalnız `AtolyeYedek`'in içindeki, adı tarihle başlayan klasörlere bakar.

Korunacaklar (adı `-SINANMADI` ile BİTMEYEN = sınanmış olanlar):
1. Hatadan ÖNCEKİ son sınanmış yedek — 26 Kasım gece koşusu. TAM adı varsayılmaz: GitHub › Actions › "Gece yedeği (OneDrive)" ›
   26 Kasım koşusu › "Yedek al, sına, OneDrive'a yükle" adımında `SINAMA TAMAM` ve `3/4 OneDrive'a yükleme: <ad>` satırları.
2. Ondan bir önceki gecenin sınanmış klasörü (karşılaştırma için).
3. Hatadan SONRAKİ ilk gece yedeği (27 Kasım gecesi oluşacak) — "hata sonrası" durumun kanıtı.

Yapılacak: bu klasörleri OneDrive'da **`AtolyeYedek` DIŞINDA** yeni bir klasöre KOPYALAYIN, ör. `AtolyeYedek-KORUNAN/renk-hatasi/`.
(Taşımayın, adını değiştirmeyin — gece işi kendi klasörlerini sayıp düzenliyor; kopya yeterli ve güvenli.)
Her klasörde şu dosyalar olmalı: `public.dump`, `auth-storage.sql`, `envanter-kaynak.csv`, `ozet.txt`
(+ sınama dosyaları). `BASARISIZ.txt` varsa o klasör sınanmamıştır — bildirin.

## 1. Bilgisayarınıza indirin ve doğrulayın

Klasörü OneDrive'dan yerel bir yere indirin (bir git deposunun İÇİNE değil), ör. `C:\AtolyeYedekAc\2026-11-26-0317`.
`ozet.txt` her dosyanın sha256'sının ilk 16 hanesini yazar. PowerShell'de:

```powershell
cd C:\AtolyeYedekAc\2026-11-26-0317
(Get-FileHash .\public.dump -Algorithm SHA256).Hash.Substring(0,16).ToLower()
Get-Content .\ozet.txt
```

İki değer aynı olmalı. Farklıysa DURUN.

## 2. Yerel PostgreSQL 17

Döküm PostgreSQL 17 ile alınıyor; açmak için **17 ya da daha yeni** `pg_restore` gerekir. Bilgisayarınızda yoksa
PostgreSQL 17 (Windows yükleyicisi) kurun; kurulumda yalnız yerel bağlantı (`localhost`) yeterli. Bu veritabanının Supabase'le
hiçbir bağı yoktur.

## 3. Yalnız gerekli tabloları boş bir veritabanına açın

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\17\bin"
createdb -h localhost -U postgres atolye_yedek_2611
pg_restore -h localhost -U postgres --no-owner --no-privileges -d atolye_yedek_2611 `
  -t stk_varyant -t stk_renk -t stk_olcu -t stk_hareket -t stk_fis -t tanimlar -t urunler `
  -t siparisler -t siparis_kalemleri -t uretim .\public.dump
```

- `-t` yalnız o tabloların yapısını ve satırlarını açar: **tetikleyici, fonksiyon, zamanlanmış iş, yetki gelmez** →
  hiçbir şey kendiliğinden çalışmaz, dışarıya bağlanmaz. (Yerelde sınandı: açılan veritabanında tetikleyici sayısı 0.)
- Birkaç "does not exist" uyarısı çıkabilir (dökümdeki fonksiyonlara bağlı varsayılanlar); satırlar yine açılır.
  Uyarıları kopyalayıp iletin.
- Parola: sizin YEREL postgres kullanıcınızın parolası (Supabase'inki DEĞİL).

## 4. Hata öncesi dökümü çıkarın

Depodaki `onarim/yedek-varyant-dokumu-salt-okur.sql` dosyasını aynı klasöre koyun:

```powershell
psql -h localhost -U postgres -d atolye_yedek_2611 -v ON_ERROR_STOP=1 --csv `
  -f .\yedek-varyant-dokumu-salt-okur.sql -o .\yedek-dokum-2611.csv
```

`yedek-dokum-2611.csv`'yi iletin. İçinde ürün / renk adı, varyant kimliği, ölçü, miktar ve reçete satırları var; cari, kullanıcı,
fiyat YOK. (`public.dump`'ın kendisini sohbete YÜKLEMEYİN — bütün şirket verisini içerir.)

## 5. Sonra

Yerel veritabanı işiniz bitince silinebilir: `dropdb -h localhost -U postgres atolye_yedek_2611`.
Bu döküm yalnız okumak içindir; onarım SQL'i ayrıca hazırlanıp canlıda AYRI ONAYLA çalıştırılacaktır.
