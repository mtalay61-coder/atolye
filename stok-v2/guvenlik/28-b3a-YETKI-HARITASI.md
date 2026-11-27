# B3a-2 — ALAN VE İŞLEM BAZINDA YETKİ HARİTASI: `cariler`, `tanimlar`, `urunler` (2. sürüm; 3. sürüm notu 27 Kasım 2026 — kural `29-b3a2` paketinde yazıldı)

> **Durum:** B3a (`28-b3a-uygula.sql`) KISMİ korumadır. Listede olmayan ve salt okur hesabı kapatır; aşağıdaki **üç açık AÇIK durur**.
> Bu belge o açıkları kapatacak kuralın haritasıdır.
>
> **Kullanıcı kararları (30 Kasım) işlendi:**
> - fiyat grupları satış / fiyatlandırma yetkisine, alış ve maliyet ayrıca satın alma / muhasebe yetkisine;
> - salt okur kullanıcı yalnız KENDİ tercihini kaydeder, ortak Tanımlar satırına dokunmaz;
> - ürün ekranından renk EKLEME stok yetkisiyle; mevcut rengi değiştirme / silme / kombinasyonu bozma değil;
> - maaş ve proses ücreti tasarımı G-25'te kalır, bugünkü yetkisiz yollar burada açık bulgu;
> - "yeni öğe eklemek açık" genel kural DEĞİL: her listeyi kimin ekleyebileceği ayrı yazıldı.

>
> **3. sürüm notu (27 Kasım) — KURAL YAZILDI, harita şu kararlarla kesinleşti.** Uygulanan ve sınanan kural tabloları
> `29-b3a2-PAKET.md`'dedir (dal `claude/b3a2-alan-yetki`); bu belgeyle çeliştiği yerde O geçerlidir:
> - yeni yetki modülü açılmadı, MEVCUT modüller kullanıldı: satış fiyatı ve müşterinin fiyat grubu → sipariş: düzenleme;
>   alış fiyatı / maliyet → muhasebe: düzenleme; müşterinin fiyat grubunu değiştirmek ayrıca cari: düzenleme;
> - ürün fiyat kapsamı yalnız fiyat + para birimi + fiyat kuralları (KDV oranı ve tedarikçi alanı kapsam DIŞI);
> - müşterinin fiyat grubu `ek.fiyatGrubuId`'dedir (eski `fiyat_grubu` sütunu da korunur);
> - stok personeli ürünün fiyat dışındaki alanlarını kaydeder; sunucu gerçek alan değişikliğine bakar;
> - salt okur kullanıcının kişisel tercihi için ayrı tablo (`kullanici_tercih`) hâlâ 2. aşamadır, yazılmadı.
## Kalan üç açık (matris, `inc_tam`, B3a kurulu — `test/inceleme/sonuc-b3a-matris-sonra.txt`)

Yalnız **stok** modülünde yetkili personel, doğrudan REST ile:
1. cari unvanını değiştirebiliyor (`cariler` UPDATE);
2. Tanımlar'da bir rengin adını değiştirebiliyor — kombinasyon etiketleri ve `stk_renk` aynası da değişiyor;
3. Tanımlar'daki bütün renkleri silebiliyor (0 etkin renk).

## Açık bulgu: ücret verisinin yetkisiz değiştirilmesi (tasarım G-25'te; burada yalnız kayıt)

Aşağıdaki yollar bugün yazma yetkisi olan her hesaba açık. Ücret onayı ve ödeme tasarımı G-25'in işi olduğu için bu pakette kural yazılmayacak; bulgu inceleme raporunda **B6** olarak açık tutulur.

| Veri | Yer | Bugün kim değiştirebiliyor |
|---|---|---|
| Personel maaşı, aylık çalışma saati | `tanimlar.veri.bolumler[].personel[]` | Tanımlar'a yazabilen herkes (doğrudan tablo; B3a sonrası: herhangi bir modülde yazma yetkisi olan) |
| Mesai katsayıları | `tanimlar.veri.mesaiAyar` | aynı |
| Ara proses ücreti | `tanimlar.veri.araProsesler[].ucret`, `urunler.ek` / ürün bazlı özel ücret | aynı / ürün kartını yazabilen |
| Proses ücretleri | `urunler.proses_ucretleri` | ürün kartını yazabilen (stok yetkisi) |
| Tamir ücreti | `uretim_atamalari.tamir_ucret` (`alt_yaz`, `fis_kes` içinden) | üretim / stok yazabilen |

G-25 kurulduğunda ilk ikisini `g25_tanimlar_ucret_koruma` kapatır; diğerleri G-25'in onay tasarımına bağlı.

## Kaynak: istemci bu tablolara nereden yazıyor (1.744.37, `src/`)

### `cariler` (kart satırı; hareketler `car_hareket`'e sunucu işlemiyle gider)

| İşlem | Nereden | Sütunlar |
|---|---|---|
| Yeni cari (tam form) | Cari modülü (200) | hepsi, INSERT |
| **Hızlı cari ekleme** | sipariş / alış / stok ekranları (`hizliCariEkle`, 100:2969) | INSERT: `unvan`, `tip`; gerisi boş |
| Kart düzenleme | Cari modülü | `unvan`, `tip`, `telefon`, `vergi_no`, `adres`, `para_birimi`, `fiyat_grubu`, `pasif`, `resim`, `ek` |
| Personelin bağlı prosesleri | Cari › personel (272) | `bagli_prosesler` |
| **Cari kodu / barkod kodu** | açılışta otomatik (090:178, 628) | `kod`, `barkod_kodu` — yalnız BOŞ olana |
| Silme | Cari modülü, çöp | DELETE (`silme_koruma` var) |
| Site kaydından cari | `site_kayit_onayla_yeni_cari` (sunucu işlemi) | INSERT — işlemin kendi denetimi |

### `tanimlar` (tek satır, `veri` jsonb) — üst düzey anahtarlar ve yazan ekranlar

| Anahtar | Yazan ekran | Not |
|---|---|---|
| `kullanicilar`, `girisAktifMi` | Tanımlar › Kullanıcılar | zaten korunuyor (yalnız Yönetici) |
| `kodSayaclari` | otomatik kod verme (`kodlariAta`; 100:3104) | yalnız artar |
| `renkler`, `renkKombinasyonlari` | Tanımlar; **ürün ekranı: yeni renk / model rengi** (100:2354, 3334–3375); otomatik kod doldurma | |
| `bedenler`, `asortiler`, `bedenGruplari` | Tanımlar; otomatik kod doldurma | başka ekrandan ekleme YOK |
| `hammaddeTipleri`, `mamulTipleri` | Tanımlar; **ürün ekranı: yeni tip** (100:3398) | |
| `ozelKodAlanlari`, `ozelKodEtiketleri` | Tanımlar; ürün ekranı: alana yeni DEĞER (100:3445, 3453) | var olan alan öğesi değişir |
| `prosesler`, `araProsesler`, `birimler`, `fireSebepleri`, `siparisSezonlari` | Tanımlar | `araProsesler[].ucret` ücret verisi (yukarıda) |
| `fiyatGruplari` | Tanımlar; **Fiyat listesi: yeni grup** (157:398), marj (100:3437) | öğe: `ad`, `tip` (Satış / Alış), `paraBirimi`, `marj` |
| `katalogFiyatKaynaklari` | Fiyat listesi (157:438, 466) | katalogda hangi fiyatların görüneceği; maliyet seçilemez |
| `giderKartlari`, `giderGruplari`, `genelGiderler`, `aylikUretimHedefi`, `prosesGiderKartlari`, `*GiderKartId`, `*GelirKartId` | Gelir-Gider (396, 397), Üretim gider bağı (246) | |
| `bolumler`, `mesaiAyar` | Cari › personel (272) | ücret verisi (yukarıda) |
| `cariTipleri` | Cari › tipler (200:1268) | |
| `kapasite` | Kapasite (273), Üretim raporu (276) | |
| `receteSablonlari` | ürün kartı, modelhane (100:1505) | |
| `raporlar` | Raporlar (245) | öğe: `kapsam` (ortak / kisisel), `sahip` |
| `ekranDuzenleri`, `mobilGorunum` | ekran düzeni (100:4608), mobil görünüm | bugün ORTAK: "bütün cihazlarda geçerli" |
| `firmaBilgileri`, `siteAyarlari`, `siteGruplari`, `ceviriler`, `onaySistemiAcik`, `kurulumTamamlandi` | Tanımlar, Gün sonu (264), Site (266–268) | |

### `urunler` (kart satırı; stok hareketleri sunucu işlemiyle)

| Alan grubu | Sütunlar |
|---|---|
| Kart | `ad`, `kategori`, `birim`, tipler, `recete`, `renk_resimleri`, `harici_barkodlar`, `ozel_kodlar`, web / vitrin alanları, `pasif` |
| Otomatik kod | `stok_no`, `barkod_no` — boş olana |
| **Satış fiyatı** | `satis_fiyati`, `satis_para_birimi`, `fiyat_kurallari` (grup fiyatları; Satış tipli gruplar), `kdv_orani` |
| **Alış fiyatı / maliyet** | `alis_fiyati`, `alis_para_birimi`, `tedarikci_id`, `fiyat_kurallari` içindeki Alış tipli grup fiyatları, `recete_gerceklesme` |
| Ücret | `proses_ucretleri` — G-25 (yukarıda) |
| Sürüm | `surum` — sunucu tetikleyicisi artırır |

## Yetki eşlemesi — bugünkü modüllerle

Uygulamada yedi modül var: `tanimlar`, `stok`, `uretim`, `siparis`, `cari`, `fisler`, `muhasebe`; dört işlem: görüntüleme, düzenleme, kaydetme, silme. Ayrı bir "fiyatlandırma" ya da "satın alma" modülü YOK. Bu belgedeki eşleme:

- **Satış / fiyatlandırma düzenleme** = `siparis` **duzenleme**.
- **Satın alma / muhasebe** = `muhasebe` **duzenleme**.
- **Stok ekleme** = `stok` **kaydetme**.

Ayrı yetki anahtarları (ör. `fiyat`, `satinalma`) istersen eşleme tek satırda değişir; istemcide yetki ekranına iki modül eklemek gerekir.

## Önerilen kural (satır düzeyi BEFORE tetikleyici; eski ↔ yeni satır karşılaştırması)

Jetonsuz istek ve Yönetici serbest. Reddedilen her yazma 42501; hiçbir satır değişmez.

### `cariler`

| Değişiklik | Gereken yetki |
|---|---|
| INSERT, "hızlı ekleme biçimi" (yalnız `unvan`, `tip`; `telefon`, `vergi_no`, `adres`, `fiyat_grubu`, `bagli_prosesler` boş; `pasif` false) | `cari` kaydetme **ya da** `siparis` / `stok` kaydetme |
| INSERT, dolu kart | `cari` kaydetme |
| UPDATE — yalnız `kod` / `barkod_kodu`, eski değer BOŞ | herhangi bir modülde kaydetme |
| UPDATE — `unvan` ve diğer kart alanları; dolu `kod` | `cari` duzenleme |
| UPDATE — `fiyat_grubu` | `cari` duzenleme **ve** `siparis` duzenleme (müşterinin fiyat grubu satış fiyatını belirler) |
| DELETE | `cari` silme (+ mevcut `silme_koruma`) |

### `tanimlar` — değişen her üst düzey anahtar ayrı denetlenir

**Genel:** bir anahtarın değeri değişmişse aşağıdaki satırlardan o anahtara ait olanı uygulanır. Listede olmayan anahtar → `tanimlar` duzenleme.

| Anahtar | EKLEME (yeni kimlikli öğe, mevcutlar birebir aynı) | DEĞİŞTİRME / ÇIKARMA |
|---|---|---|
| `renkler` | `stok` kaydetme | `tanimlar` duzenleme / silme |
| `renkKombinasyonlari` | `stok` kaydetme — yalnız yeni kombinasyon; bileşenleri var olan renkler olmalı | `tanimlar` duzenleme / silme (bileşen değiştirmek dahil) |
| `hammaddeTipleri`, `mamulTipleri` | `stok` kaydetme | `tanimlar` duzenleme / silme |
| `ozelKodAlanlari` | var olan alana yeni DEĞER: `stok` kaydetme; yeni ALAN: `tanimlar` duzenleme | `tanimlar` duzenleme / silme |
| `bedenler`, `asortiler`, `bedenGruplari`, `prosesler`, `araProsesler`, `birimler`, `fireSebepleri`, `siparisSezonlari`, `ozelKodEtiketleri` | `tanimlar` duzenleme | `tanimlar` duzenleme / silme |
| `fiyatGruplari` — tip Satış | `siparis` duzenleme | `siparis` duzenleme (ad, para birimi, marj); çıkarma: + `tanimlar` silme |
| `fiyatGruplari` — tip Alış, ya da tipi Alış'a / Alış'tan çevirme | `muhasebe` duzenleme | `muhasebe` duzenleme; çıkarma: + `tanimlar` silme |
| `katalogFiyatKaynaklari` | `siparis` duzenleme | `siparis` duzenleme; listeye Alış tipli kaynak giriyorsa ayrıca `muhasebe` duzenleme |
| `giderKartlari`, `giderGruplari`, `genelGiderler`, `prosesGiderKartlari`, `*GiderKartId`, `*GelirKartId` | `muhasebe` kaydetme | `muhasebe` duzenleme |
| `cariTipleri` | `cari` kaydetme | `cari` duzenleme |
| `kapasite`, `aylikUretimHedefi` | `uretim` kaydetme | `uretim` duzenleme |
| `receteSablonlari` | `stok` kaydetme | `stok` duzenleme |
| `raporlar` — `kapsam: "ortak"` öğe | `tanimlar` duzenleme | `tanimlar` duzenleme |
| `ekranDuzenleri`, `mobilGorunum` (ortak düzen) | `tanimlar` duzenleme | `tanimlar` duzenleme |
| `bolumler`, `mesaiAyar` | — G-25 (bu pakette kural yok; açık bulgu) | |
| `firmaBilgileri`, `siteAyarlari`, `siteGruplari`, `ceviriler`, `onaySistemiAcik`, `kurulumTamamlandi` | `tanimlar` duzenleme | `tanimlar` duzenleme |

**Otomatik yazmalar** (her anahtarda, herhangi bir modülde kaydetme yetkisiyle):
- `kodSayaclari`: her sayaç ≥ eski değer. Azaltma / silme → `tanimlar` duzenleme.
- Liste öğesinde yalnız BOŞ `kod` / `barkodKodu` doldurma. Dolu kodu değiştirme → o listenin "değiştirme" yetkisi.

Bu kuralla üç açık kapanır:
- (1) unvan → `cari` duzenleme;
- (2) renk adı → mevcut öğe değişti → `tanimlar` duzenleme;
- (3) bütün renkleri silme → öğe çıkarıldı → `tanimlar` silme.

Hızlı cari ekleme, sayaç artırma ve ürün ekranından yeni renk stok personeline açık kalır; aynı izin unvanı, mevcut rengi ya da kombinasyonu değiştirmeye yetmez.

### Kişisel tercihler — salt okur kullanıcı (yeni yapı gerekir)

Bugün kişisel rapor da ekran düzeni de ortak Tanımlar satırında. Kararına göre salt okur kullanıcı ortak satıra yazamayacak; kendi tercihleri için ayrı bir yer gerekir:

- **Yeni tablo `kullanici_tercih`**: `(kullanici uuid = auth.uid(), anahtar text, veri jsonb, guncelleme)`; birincil anahtar `(kullanici, anahtar)`.
- **RLS:** her hesap yalnız KENDİ satırını okur / yazar (`kullanici = auth.uid()`). ERP listesinde olmak yeter; modül yetkisi aranmaz. Listede olmayan hesap yazamaz.
- **İçerik:** `raporlar` (kişisel raporlar), `ekranDuzeni`, `mobilGorunum`.
- **İstemci değişikliği (ayrı sürüm):**
  - `kapsam: "kisisel"` raporlar buraya taşınır; Tanımlar'da yalnız ortak raporlar kalır.
  - Ekran / mobil düzen: kişisel düzen varsa o, yoksa ortak düzen uygulanır. Ortak düzeni değiştirmek `tanimlar` duzenleme ister.
  - Göç: mevcut kişisel raporlar sahibinin ilk girişinde taşınır; Tanımlar'dan çıkarma Yönetici oturumunda.
- **B3a ile ilişki:** B3a'nın "en az bir modülde yazma yetkisi" şartı bu tabloya konmaz; salt okur kullanıcı yalnız buraya yazabilir.

### `urunler`

| Değişiklik | Gereken yetki |
|---|---|
| INSERT; kart alanları | `stok` kaydetme / duzenleme |
| `stok_no`, `barkod_no` — eski değer BOŞ | herhangi bir modülde kaydetme |
| `satis_fiyati`, `satis_para_birimi`, `kdv_orani`, `fiyat_kurallari` içinde Satış tipli grup fiyatı | `siparis` duzenleme |
| `alis_fiyati`, `alis_para_birimi`, `tedarikci_id`, `fiyat_kurallari` içinde Alış tipli grup fiyatı | `muhasebe` duzenleme |
| `proses_ucretleri` | — G-25 (bu pakette kural yok; açık bulgu) |
| `surum` | istemciden gelen değer yok sayılır |
| DELETE | `stok` silme (+ mevcut `silme_koruma`) |

Dikkat: bugün ürün kartını kaydeden stok personeli aynı formda fiyatı da yazıyor. Bu kuralla fiyat alanı değişmişse ve `siparis` / `muhasebe` duzenleme yoksa kayıt reddedilir. İstemcide fiyat kutuları yetkiye göre kapatılmalı (ayrı sürüm); yoksa stok personeli "kaydedilemedi" görür.

## Bu haritada hâlâ senin kararın gereken

1. "Satış / fiyatlandırma" ve "satın alma" için mevcut `siparis` / `muhasebe` modülleri mi kullanılsın, yoksa iki yeni yetki anahtarı mı açılsın?
2. Müşterinin fiyat grubunu (`cariler.fiyat_grubu`) değiştirmek için hem cari hem satış yetkisi şartı uygun mu?

## Uygulama sırası önerisi

1. Sunucu kuralı (cariler + Tanımlar liste / sayaç kuralları): üç açığı kapatır, istemci değişikliği gerektirmez.
2. `kullanici_tercih` tablosu + istemci sürümü (kişisel rapor / düzen).
3. Fiyat alanları kuralı + istemcide fiyat kutularının yetkiye bağlanması — birlikte; ayrı ayrı çıkarsa stok personelinin ürün kaydı durur.

## Sınama planı (kural yazıldığında)

- `yetki-api.js` matrisine hesaplar: listede yok · salt okur · yalnız stok · yalnız cari · yalnız sipariş · yalnız muhasebe · yalnız tanimlar-duzenleme · Yönetici.
- Durumlar:
  - cari: hızlı ekle; dolu ekle; unvan değiştir; boş koda kod; dolu kodu değiştir; fiyat grubu değiştir;
  - sayaç: artır; azalt;
  - renk: ekle; boş koda kod; adını değiştir; tek renk sil; hepsini sil;
  - kombinasyon: yeni ekle; bileşenini değiştir; sil;
  - beden ekle (stok ile → ret);
  - fiyat grubu: Satış ekle / marj değiştir; Alış ekle; tipini çevir;
  - ürün: kart alanı; satış fiyatı; alış fiyatı;
  - kişisel tercih: kendi satırı; başkasının satırı; ortak düzen.
- Beklenen: üç açık R (42501); karar tablosundaki her satır Y / R; geri almadan sonra matris B3a hâline birebir döner.
- Ekran regresyonu: stok personeliyle hızlı cari, ürün ekranından yeni renk, açılışta kod verme; salt okur kullanıcıyla kişisel rapor; mevcut ekran sınamaları ve `kosu.sh`.
