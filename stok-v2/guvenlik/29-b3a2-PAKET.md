# B3a-2 — alan ve işlem bazında yazma yetkisi (HAZIRLIK)

**Durum:** hazırlandı ve yerelde sınandı. Canlıya, main'e, yayına ve G-25 deneme projesine UYGULANMADI.
B4/B5 ve 1.744.41 önceliklidir; bu paket onlardan bağımsızdır, ayrı kurulur ve ayrı geri alınır.

Paket iki parçadır ve BİRLİKTE devreye girer:

| Parça | Dosya | SHA-256 |
|---|---|---|
| Sunucu kurulumu | `29-b3a2-uygula.sql` | `e67eef17c9f40addc6ccb2b22b5166ba8e16284a5ec4f8a468acd2396cfcaef1` |
| Sunucu geri alma | `29-b3a2-geri-al.sql` | `8d471fcf8c5847ecca808f148c1dfb4a95becfc8faa95bc0aa89ec862be1d9c5` |
| İstemci | `atolye-erp-v1.744.42.html` (dal `claude/b3a2-alan-yetki`) | `1fc546342df8af8f565a19abff5795610cf76d9592063159e497cb485755d07e` |

`29-b3a2-uygula.sql` ÜRETİLİR: okunur kaynak `29-b3a2-kaynak/kaynak.sql`, üretici `29-b3a2-uret.py`. Tek do-bloğu (hepsi ya da hiçbiri),
yalnız düz `$$`, 22 KB. 10 fonksiyon + 3 tetikleyici (`b3a2_alan_koru`: `cariler`, `urunler`, `tanimlar`). Var olan hiçbir fonksiyonu,
politikayı ya da veriyi değiştirmez.

## Kuralın özü

Sunucu **gerçek alan değişikliğine** bakar: eski satır ile yeni satır karşılaştırılır. İstemcinin değiştirmediği alanı da göndermesi
(uygulama satırın tamamını yazar) ret sebebi değildir. Boş değerlerin birbirine dönüşmesi (null ↔ "" ↔ [] ↔ {} ↔ false, fiyatta null ↔ 0,
para biriminde boş → TRY) değişiklik sayılmaz. Ret `42501`'dir ve hiçbir satır değişmez; ileti gereken yetkiyi adıyla söyler.

Denetim dışı: jetonsuz istek (SQL Editor, servis rolü), Yönetici. Giriş sistemi kapalıysa `yetki_var_mi` herkesi yetkili sayar (mevcut kural).

### Cari kartı

| Değişiklik | Gereken yetki |
|---|---|
| Hızlı ekleme (yalnız unvan + tip) | sipariş, stok ya da cari: kaydetme |
| Boş koda kod verme (otomatik) | herhangi bir modülde yazma |
| Müşterinin fiyat grubu (`ek.fiyatGrubuId`, eski `fiyat_grubu` sütunu) | cari: düzenleme **VE** sipariş: düzenleme |
| Kartın diğer alanları (unvan, telefon, vergi no, …), dolu kart ekleme | cari: düzenleme (ekleme: kaydetme) |

### Ürün — yalnız fiyat alanları

| Değişiklik | Gereken yetki |
|---|---|
| Satış fiyatı, satış para birimi, tipi Alış olmayan fiyat kuralları | sipariş: düzenleme |
| Alış fiyatı (maliyet), alış para birimi, tipi Alış olan fiyat kuralları | muhasebe: düzenleme |
| Ürünün diğer bütün alanları | bu pakette denetlenmez (stok personeli kaydeder) |

`proses_ucretleri` bu pakette YOK — G-25'te kalır (açık bulgu B6).

### Tanımlar — değişen her anahtar ayrı

| Anahtar | Ekleme | Mevcut öğeyi değiştirme | Silme |
|---|---|---|---|
| renkler, renkKombinasyonlari, hammaddeTipleri, mamulTipleri | stok: kaydetme | tanımlar: düzenleme | tanımlar: silme |
| receteSablonlari | stok: kaydetme | stok: düzenleme | tanımlar: silme |
| ozelKodAlanlari | tanımlar: düzenleme | stok: kaydetme (alana yeni değer) | tanımlar: silme |
| cariTipleri | cari: kaydetme | cari: düzenleme | tanımlar: silme |
| giderKartlari, giderGruplari, genelGiderler | muhasebe: kaydetme | muhasebe: düzenleme | tanımlar: silme |
| bedenler, asortiler, bedenGruplari, prosesler, araProsesler, birimler, fireSebepleri, siparisSezonlari | tanımlar: düzenleme | tanımlar: düzenleme | tanımlar: silme |
| fiyatGruplari | Satış tipli: sipariş: düzenleme · Alış tipli: muhasebe: düzenleme (ekleme ve değiştirme) | aynı | + tanımlar: silme |
| katalogFiyatKaynaklari | sipariş: düzenleme; alış kaynağı eklemek ayrıca muhasebe: düzenleme | | |
| kodSayaclari | artırma: herhangi bir modülde yazma · geri alma: tanımlar: düzenleme | | |
| raporlar | kişisel rapor: yalnız sahibi (yazma yetkisi olan) · ortak ya da başkasının raporu: tanımlar: düzenleme | | |
| prosesGiderKartlari, `*GiderKartId`, `*GelirKartId` | muhasebe: düzenleme ya da tanımlar: düzenleme | | |
| kapasite, aylikUretimHedefi | üretim: düzenleme, muhasebe: düzenleme ya da tanımlar: düzenleme | | |
| ekranDuzenleri, mobilGorunum, firmaBilgileri, site ayarları, bilinmeyen anahtar | tanımlar: düzenleme | | |
| kullanicilar, girisAktifMi | mevcut `tanimlar_kullanici_koruma` tetikleyicisinde (dokunulmadı) | | |
| bolumler, mesaiAyar | **kural YOK** — maaş verisi, G-25'te (açık bulgu B6) | | |

"Yeni öğe eklemek açık" genel kural değildir; tablo her listeyi ayrı sayar. Listelerdeki boş koda otomatik kod verme, yazma yetkisi olan
herkese açıktır (öğenin başka hiçbir alanı değişmemek koşuluyla).

Tek istisna: firma bilgisi hiç yokken istemcinin açılışta eklediği, **logo dışında bütün alanları boş** iskelet değişiklik sayılmaz.
Var olan firma bilgisine dokunmak her zaman denetlenir. Canlıda firma bilgisi dolu olduğundan bu yol orada çalışmaz; yeni kurulan projede
ilk açılışı personel yaparsa reddedilmesin diye var.

## İstemci (1.744.42)

- `fiyatAlanYetkileri` (094): satış = sipariş düzenleme, alış = muhasebe düzenleme, cari fiyat grubu = sipariş + cari düzenleme.
- Fiyat kutuları (ürün kartı ×4, stok formu ×2, cari fiyat grubu ×2) yetkisizde kapalı; üzerine gelince neden kapalı olduğunu söyler.
- `saveStok` ve `saveCariler`, yetkisiz kullanıcının fiyat alanlarını sunucuya **eski değeriyle** gönderir (`fiyatDegisiklikleriniSuz`,
  `cariFiyatGrubuSuz`) ve bunu bildirimle söyler; kaydın geri kalanı yazılır. Böylece içe aktarma ya da toplu düzenleme gibi yan yollar
  da kaydın tamamını reddettirmez.
- İstemci kuralı yalnız kolaylıktır; koruma sunucudadır. Eski istemci (1.744.37 / 1.744.41) kurulu sunucuyla çalışır: fiyatı değiştiren
  yetkisiz kullanıcı `42501` iletisini görür, kayıt yazılmaz.

## Sınama sonuçları (yerel PostgreSQL 16, canlıya hizalı G-25'siz taban)

| Sınama | Kurulumdan önce | Kurulumdan sonra |
|---|---|---|
| `test/inceleme/b3a2-matris.js` — 42 durum × 7 hesap = 294 deneme | 170 uyumlu · **124 AÇIK** | **294 uyumlu · 0 AÇIK · 0 fazla kısıt** |
| `test/inceleme/ekran-b3a2-personel.js` — Ayşe (yalnız stok) ve Ali (Yönetici) | — | 10/10 — reddedilen yazma 0; fiyat kutuları kapalı / açık; fiyat dışı alan kaydedildi |
| `test/ekran/ekran-stok.js`, `ekran-kasa.js`, `ekran-cari-virman.js` (Yönetici) | — | 24/24 · 29/29 · 29/29 |
| Geri alma: kur → yeniden kur → geri al | — | şema dökümü kurulum öncesiyle aynı; matris yeniden 170 / 124 |
| `test/birim-fiyat-yetki.js` | — | 21/21 |
| `./test/kosu.sh` (1.744.42) | — | 275/275 AYNI (paralel koşuda 274 + oynak `recete-genis` tek başına AYNI) |

Matristeki "AÇIK (B6)" işaretli iki durum (personel maaşı, proses ücretleri) bu paketin bilerek kapatmadığı veridir; beklenen değerleri
"yazabilir" olarak kayıtlıdır ki paket bunları kapatmış gibi görünmesin.

Hesaplar yalnız sınama kopyasına eklenir: Ayşe = yalnız stok, Cem = yalnız cari, Selin = yalnız sipariş, Murat = yalnız muhasebe,
Tuna = yalnız tanımlar (silme yok), Deniz = cari + sipariş, Ali = Yönetici.

## Bilinen sınırlar

1. **Salt okur kullanıcının kişisel raporu / ekran düzeni:** karar "yalnız kendi düzenini kaydetsin, ortak Tanımlar satırını değiştirmesin"
   idi. Bu, kişiye özel ayrı bir tablo gerektirir (`kullanici_tercih`, 2. aşama); bu pakette yok. Burada kişisel raporu yalnız sahibi
   değiştirir ama sahibinin en az bir modülde yazma yetkisi olmalıdır; ekran düzeni tanımlar: düzenleme ister.
2. **B6 (ücret verisi):** `bolumler`, `mesaiAyar`, `proses_ucretleri` kuralsız; G-25 paketinin işi.
3. **B3a'nın kalan üç açığı** bu paket canlıya kurulana kadar kapanmış sayılmaz. B3a (tablo düzeyi) ile birlikte kurulabilir; ikisi
   ayrı tetikleyicidir, sıraları önemli değildir.
4. Ekran regresyonları Yönetici ile koşar; personel akışı yalnız yukarıdaki iki sınamayla ölçüldü (açılış + modül gezme + ürün kartında
   fiyat dışı alan kaydı). Personelin sipariş, üretim ve fiş akışları ekrandan uçtan uca koşulmadı.
5. Gerçek Supabase'de denenmedi. Açığı yeniden üretme adımları yalnız yeni, yalıtılmış deneme projesinde ve DENEME kayıtlarıyla
   çalıştırılır (bkz. B4 yalıtılmış deneme paketi); canlıda ve G-25 deneme projesinde çalıştırılmaz.

## Kurulum sırası (onaydan sonra; şimdi DEĞİL)

1. SQL Editor'de `29-b3a2-uygula.sql` — son satır `GENEL | KURULU` olmalı.
2. İstemci 1.744.42 yayını. (Sıra ters olursa zarar yok: istemci süzgeci sunucu kuralı olmadan da yalnız kutuları kapatır.)
3. Geri alma: `29-b3a2-geri-al.sql` — son satır `GENEL | KURULU DEĞİL`. Veriye dokunmaz.
