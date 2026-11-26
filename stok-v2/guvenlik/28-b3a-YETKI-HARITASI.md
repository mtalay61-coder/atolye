# B3a-2 — ALAN VE İŞLEM BAZINDA YETKİ HARİTASI: `cariler`, `tanimlar`, `urunler` (29 Kasım 2026; TASARIM — kod YOK, uygulanmadı)

> **Durum:** B3a (`28-b3a-uygula.sql`) KISMİ korumadır. Listede olmayan ve salt okur hesabı kapatır; aşağıdaki **üç açık AÇIK durur**.
> Bu belge o açıkları kapatacak kuralın haritasıdır; kural yazılmadı.
>
> **İlke (kullanıcı, 29 Kasım):** "Hızlı cari ekleme veya sayaç artırma izni, cari unvanını ya da bütün renkleri değiştirme yetkisi vermemeli."

## Kalan üç açık (matris, `inc_tam`, B3a kurulu — `sonuc-b3a-matris-sonra.txt`)

Yalnız **stok** modülünde yetkili personel (Ayşe), doğrudan REST ile:
1. cari unvanını değiştirebiliyor (`cariler` UPDATE);
2. Tanımlar'da bir rengin adını değiştirebiliyor — kombinasyon etiketleri ve `stk_renk` aynası da değişiyor;
3. Tanımlar'daki bütün renkleri silebiliyor (0 etkin renk).

Neden tablo düzeyinde kapatılamadı: aynı personelin aynı tablolara **meşru** yazmaları var (aşağıda). Kural satırın NE değiştiğine bakmalı.

## Kaynak: istemci bu tablolara nereden yazıyor (1.744.37, `src/`)

### `cariler` (kart satırı; hareketler `car_hareket`'e sunucu işlemiyle gider, bu tabloya değil)

| İşlem | Nereden | Hangi sütun | Bugün kim yapabiliyor (ekran) |
|---|---|---|---|
| Yeni cari (tam form) | Cari modülü (200) | bütün sütunlar, INSERT | cari modülünü gören |
| **Hızlı cari ekleme** | sipariş / alış / stok ekranları (`hizliCariEkle`, 100:2969) | INSERT: `unvan`, `tip`; diğerleri boş | sipariş / stok kullanıcısı |
| Kart düzenleme | Cari modülü | `unvan`, `tip`, `telefon`, `vergi_no`, `adres`, `para_birimi`, `fiyat_grubu`, `pasif`, `resim`, `ek` (notlar, site ayarları) | cari modülünü gören |
| Personel bağlı prosesleri | Cari › personel (272) | `bagli_prosesler` | cari modülünü gören |
| **Cari kodu / barkod kodu verme** | açılışta otomatik (090:178, 628) | `kod`, `barkod_kodu` — yalnız BOŞ olana | uygulamayı açan herkes |
| Silme | Cari modülü, çöp | DELETE | `silme_koruma` (sunucu) |
| Site kaydından cari | `site_kayit_onayla_yeni_cari` (sunucu işlemi) | INSERT | işlemin kendi yetki denetimi |
| Yedekten geri yükleme | Tanımlar › Yedek (093) | hepsi | Yönetici |

### `tanimlar` (tek satır, `veri` jsonb; üst düzey anahtarlar)

| Anahtar(lar) | Kim yazıyor (meşru) | İşlem türü |
|---|---|---|
| `kullanicilar`, `girisAktifMi` | Tanımlar › Kullanıcılar | **zaten korunuyor** (`tanimlar_kullanici_koruma`: yalnız Yönetici) |
| `kodSayaclari` | otomatik kod verme (`kodlariAta`, her kayıtta; 100:3104) | **yalnız artar** |
| `renkler`, `bedenler`, `asortiler`, `renkKombinasyonlari` | Tanımlar ekranı (ekle / değiştir / sil); ürün ekranından **yeni renk / model rengi EKLEME** (100:2354, 3334–3414); otomatik **kod doldurma** (boş `kod` / `barkodKodu`) | ekleme · kod doldurma · değiştirme · silme |
| `prosesler`, `araProsesler`, `birimler`, `hammaddeTipleri`, `mamulTipleri`, `bedenGruplari`, `fireSebepleri`, `siparisSezonlari`, `ozelKodAlanlari`, `ozelKodEtiketleri` | Tanımlar ekranı; ürün ekranından tip / özel kod ekleme (100:3398, 3445) | ekleme · değiştirme · silme |
| `fiyatGruplari`, `katalogFiyatKaynaklari` | Fiyat listesi (157), Tanımlar | değiştirme |
| `giderKartlari`, `giderGruplari`, `genelGiderler`, `aylikUretimHedefi`, `prosesGiderKartlari`, `*GiderKartId` / `*GelirKartId` | Gelir-Gider (396, 397), Üretim gider bağı (246) | muhasebe ayarı |
| `bolumler` (personel maaşı, aylık saat), `mesaiAyar` | Cari › personel (272) | **ücret verisi** — G-25'in koruduğu alan |
| `cariTipleri` | Cari › tipler (200:1268) | cari ayarı |
| `kapasite` | Kapasite (273), Üretim raporu (276) | üretim ayarı |
| `receteSablonlari` | ürün kartı, modelhane (100:1505) | stok ayarı |
| `raporlar`, `ekranDuzenleri`, `mobilGorunum` | herkes (kişisel / ortak görünüm) | görünüm |
| `firmaBilgileri` (ör. `gunSonu`, `siteBildirim`), `siteAyarlari`, `siteGruplari`, `ceviriler`, `onaySistemiAcik`, `kurulumTamamlandi` | Tanımlar, Gün sonu (264), Site (266–268) | firma / site ayarı |

Ekrandaki tek denetim: Tanımlar ekranından kayıtta `tanimlar` **duzenleme** (100:5659). Diğer ekranlardan gelen yazmalar denetimsiz; sunucuda hiçbiri denetlenmiyor.

### `urunler` (kart satırı; stok hareketleri sunucu işlemiyle)

- Ürün kartı: `ad`, `kategori`, `recete`, `proses_ucretleri`, `renk_resimleri`, `harici_barkodlar`… → stok modülü.
- Stok no / barkod kodu: otomatik, boş olana.
- `surum`: sunucu tetikleyicisi artırır; istemcinin elle düşürmesi matriste AÇIK değil (stok yetkilisine serbest) ama anlamsız — öneri: sunucu `surum`'u istemciden almasın.
- `proses_ucretleri` ücret verisidir: G-25 kapsamı.

## Önerilen kural (satır düzeyi BEFORE tetikleyici; eski ↔ yeni satır karşılaştırması)

Jetonsuz istek ve Yönetici her zaman serbest. Yetki `yetki_var_mi([modül], işlem)` ile okunur.

### `cariler`

| Değişiklik | Gereken yetki |
|---|---|
| INSERT | `cari` kaydetme, **ya da** `siparis` / `stok` / `uretim` / `muhasebe` kaydetme ve satır "hızlı ekleme" biçiminde (aşağıda) |
| UPDATE — yalnız `kod` / `barkod_kodu`, eski değer BOŞ | herhangi bir modülde kaydetme (otomatik kod) |
| UPDATE — `unvan`, `tip`, `vergi_no`, `telefon`, `adres`, `para_birimi`, `fiyat_grubu`, `pasif`, `resim`, `ek`, `bagli_prosesler`; dolu `kod` | `cari` duzenleme ya da kaydetme |
| DELETE | `cari` silme (+ mevcut `silme_koruma`) |

"Hızlı ekleme biçimi": `telefon`, `vergi_no`, `adres`, `fiyat_grubu`, `bagli_prosesler` boş; `pasif` false. Böylece hızlı ekleme izni dolu bir kart yazmaya ya da var olan kartı değiştirmeye yetmez.

### `tanimlar` (üst düzey anahtar bazında; değişen her anahtar ayrı denetlenir)

| Değişiklik | Gereken yetki |
|---|---|
| `kodSayaclari`: her sayaç ≥ eski değer | herhangi bir modülde kaydetme |
| `kodSayaclari`: bir sayaç AZALIYOR / siliniyor | `tanimlar` duzenleme |
| Liste anahtarları (`renkler`, `bedenler`, `asortiler`, `renkKombinasyonlari`, tipler…): yalnız YENİ kimlikli öğe EKLENDİ, var olan öğeler birebir aynı | `tanimlar` duzenleme **ya da** `stok` / `siparis` / `uretim` kaydetme |
| Liste anahtarları: var olan öğede yalnız BOŞ `kod` / `barkodKodu` dolduruldu | herhangi bir modülde kaydetme |
| Liste anahtarları: var olan öğe DEĞİŞTİ (ad, tür…) ya da ÇIKARILDI | `tanimlar` duzenleme (çıkarma: `tanimlar` silme) |
| `giderKartlari`, `giderGruplari`, `genelGiderler`, gider / gelir kart bağları | `muhasebe` kaydetme ya da `tanimlar` duzenleme |
| `fiyatGruplari`, `katalogFiyatKaynaklari` | `siparis` kaydetme ya da `tanimlar` duzenleme (**karar gerekir**) |
| `bolumler`, `mesaiAyar` | `cari` / `muhasebe` kaydetme (G-25 kuralıyla aynı; G-25 kurulursa onun tetikleyicisi) |
| `kapasite`, `aylikUretimHedefi` | `uretim` kaydetme ya da `tanimlar` duzenleme |
| `receteSablonlari` | `stok` kaydetme ya da `tanimlar` duzenleme |
| `cariTipleri` | `cari` kaydetme ya da `tanimlar` duzenleme |
| `raporlar`, `ekranDuzenleri`, `mobilGorunum` | herhangi bir modülde kaydetme (**karar gerekir:** salt okur kullanıcı kendi görünümünü kaydedebilsin mi — B3a bugün kapatıyor) |
| `firmaBilgileri`, `siteAyarlari`, `siteGruplari`, `ceviriler`, `onaySistemiAcik`, `kurulumTamamlandi`, bilinmeyen anahtar | `tanimlar` duzenleme |

Bu kuralla üç açık kapanır:
- (1) unvan → `cari` yetkisi ister;
- (2) renk adı → var olan öğe değişti → `tanimlar` duzenleme;
- (3) bütün renkleri silme → öğe çıkarıldı → `tanimlar` silme.

Hızlı cari ekleme ve sayaç artırma stok personeline açık kalır. B1 kuruluysa renk adı değişikliği zaten `tanim_renk_ad_degistir` içinde `tanimlar` duzenleme istiyor; bu kural doğrudan tablo yolunu da aynı yetkiye bağlar.

### `urunler`

- Kart alanları: `stok` kaydetme / duzenleme.
- `proses_ucretleri`: G-25 kararına bırakılır.
- `surum`: istemciden gelen değer yok sayılır (mevcut `urunler_surum` tetikleyicisi zaten artırıyor; elle düşürme engellenir).

## Senin kararını bekleyen noktalar

1. Fiyat grupları ve katalog fiyat kaynakları hangi modülün yetkisine bağlansın (`siparis` mi, yalnız `tanimlar` mı)?
2. Salt okur kullanıcı kendi rapor / ekran düzenini kaydedebilsin mi? Evetse B3a'nın genel kuralına bu üç anahtar için istisna gerekir.
3. Başka ekrandan yeni renk / beden / tip EKLEME `stok` / `siparis` / `uretim` kaydetme ile serbest kalsın mı, yoksa o da `tanimlar` duzenleme mi istesin? İkincisi daha sıkı ama ürün ekranından renk açmayı durdurur.
4. `bolumler` / `mesaiAyar` / `proses_ucretleri` bu pakette mi, G-25'te mi?

## Sınama planı (kural yazıldığında)

- `yetki-api.js` matrisine satırlar eklenir. Hesaplar: listede yok · salt okur · yalnız stok · yalnız cari · yalnız tanimlar-duzenleme · Yönetici.
- Durumlar:
  - hızlı cari ekle; dolu cari ekle;
  - unvan değiştir; boş koda kod ver; dolu kodu değiştir;
  - sayaç artır / azalt;
  - renk ekle; boş renk koduna kod ver; renk adını değiştir; tek renk sil; bütün renkleri sil;
  - gider kartı, rapor, ekran düzeni yaz.
- Beklenen: üç açık R (42501); meşru yazmalar Y; geri almadan sonra matris B3a hâline birebir döner.
- Ekran regresyonu:
  - stok personeliyle alış ekranından hızlı cari;
  - ürün ekranından yeni renk;
  - açılışta kod verme;
  - mevcut ekran sınamaları ve `kosu.sh`.
