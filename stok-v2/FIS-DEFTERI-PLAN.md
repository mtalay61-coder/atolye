# Tek fiş defteri — plan (onayınıza)

**Durum (30 Ekim 2026):** taslak, envanter tamam. Hiçbir şey değişmedi; karar sizin.

## 0. Kural (sizin sözlerinizle)

> "Fiş defterinden her işlem geçmesi lazım ve her yerin burayı okuması gerek. Stok giriş çıkışı buradan olmalı: alış,
> satış faturaları, üretim hammadde çıkışları… stok sayım da dahil. Para hareketi de fiş oluştursun. Eskiden defterde
> tutardık; para hareketinde karşı tarafa fiş verirdik, stok hareketinde de fiş verirdik. Fatura gibi düşün: mal alıp
> borçlanıyoruz fatura girişinde, para verip borcumuz azalıyor karşılığında."

Bundan çıkan dört madde:

1. **Tek defter.** Bütün giriş-çıkışlar tek fiş defterine işlenir. İki aile var: **stok fişi** (mal) ve **para fişi**
   (makbuz). Genel / Resmi fişin bir özelliğidir, ayrı defter değildir.
2. **Hareket fişin satırıdır.** Stok, cari ve kasa/banka hareketi yalnız bir fişin satırı olarak var olabilir.
   Fişsiz hareket ve hareketsiz fiş veritabanında **yazılamaz**.
3. **Fiş tek işlemde yazılır.** Fiş ve bütün satırları ya birlikte yazılır ya hiçbiri. Yarım fiş olmaz.
4. **Fiş silinmez.** Yanlış fiş iptal edilir (bütün satırlarıyla, iz kalır). Düzeltme: iptal + yeni fiş, eski defterde
   olduğu gibi.

## 1. Bugün durum ne

28 Ekim planı (`PLAN.md`) bu sorunu doğru tespit etmişti ("Fiş diye gerçek bir kayıt yok, fiş defteri ayrıca tutuluyor")
ama uygulama yalnız **stok** tarafında bitti:

| Parça | Bugün | Eksik |
|---|---|---|
| Stok fişi başlığı | `stk_fis` (veritabanı) | Yalnız stok bilgisi: kalem fiyatı, KDV, tutar, defter yok |
| Stok hareketi | `stk_hareket`, fişe **zorunlu bağlı** | — |
| Stok miktarı | Saklanmıyor, hareket toplamı (`stk_stok`) | — |
| Cari hareketi | `car_hareket`, `fis_no` düz metin | Fişe bağ yok; veritabanı fişi denetlemiyor |
| Kasa/banka hareketi | `kas_hareket`, bağ JSON içinde | Fişe bağ yok |
| Fiş defteri | Ayrı liste (`lst_kayit`, fis_defteri) — **ikinci kopya** | Fiş iki yerde; ayrışınca "defterde var, stokta yok" |
| Tek işlem | `fis_yaz` = stok + cari + kasa + sipariş satırları | Fiş defteri dışında |
| Yazma yolları | Alış/satış fişi ve sipariş teslimi fişi kendisi kuruyor | Üretim, sayım, açılış, fire, elle giriş… yalnız hareket yazıyor; defter kaydını uygulama **sonradan** kuruyor (30 Ekim hatasının kaynağı) |

## 2. Fiş türleri

### Stok fişleri (mal)

| Tür | Stok | Cari | Kasa |
|---|---|---|---|
| Alış faturası / irsaliye | + (mal girer) | tedarikçiye borçlanırız | peşinse para fişi de kesilir |
| Satış faturası / irsaliye (sevk) | − | müşteri bize borçlanır | peşinse para fişi de kesilir |
| Alış iadesi | − | borcumuz azalır | — |
| Satış iadesi | + | müşterinin borcu azalır | — |
| Üretim hammadde çıkışı (prosese iş verme) | − hammadde | — | — |
| Üretim girişi (teslim alma) | + mamul / yarı mamul | fasoncuya işçilik borcu (varsa) | — |
| Sayım | ± fark | — | — |
| Açılış | + | — | — |
| Fire / hurda | − | — | — |
| Elle giriş / çıkış, numune | ± | — | — |

### Para fişleri (makbuz)

| Tür | Kasa / banka | Cari |
|---|---|---|
| Tahsilat (nakit, havale, kart) | + | müşterinin borcu azalır |
| Ödeme | − | tedarikçiye borcumuz azalır |
| Çek / senet alma | portföye girer | müşterinin borcu azalır |
| Çek / senet verme, ciro | portföyden çıkar | borcumuz azalır |
| Çek tahsili | + banka, − portföy | — |
| Virman (kasa ↔ banka) | − bir hesap, + öteki | — |
| Gider (kira, elektrik…) | − | — (gider kartına yazılır) |
| Maaş tahakkuku | — | personele borçlanırız |

Bir işlem iki aileye dokunuyorsa (peşin satış: mal + para) **iki fiş** kesilir, aynı işlemde: satış fişi ve tahsilat
makbuzu. Eski defter usulüyle aynı. İkisi birbirine bağlıdır, biri iptal edilince öteki sorulur.

## 3. Veri modeli

- **`fis`** — fişin başlığı. Bugünkü `stk_fis` genişler: numara (kimlik), aile (stok/para), tür, defter
  (Genel / Resmi / Muhasebe), tarih, cari, kasa/banka hesabı, sipariş ve üretim bağı, para birimi, kur, tutar, KDV,
  açıklama, kullanıcı, iptal bilgisi, bağlı fiş (peşin satış gibi).
- **`fis_kalem`** — fişin kalemleri (ürün, renk, ölçü, miktar, birim fiyat, KDV oranı). Faturanın satırları.
- **Satırlar** (bugünkü tablolar, fişe **zorunlu** bağlı):
  - `stk_hareket.fis_id` → `fis` (bağ bugün de var)
  - `car_hareket.fis_id` → `fis` (yeni, zorunlu)
  - `kas_hareket.fis_id` → `fis` (yeni, zorunlu)
- **Fiş defteri** = `fis` + kalemler + satırlar. Ayrı kopya yok: ekran doğrudan bunu okur.
- **Bakiyeler** saklanmaz: stok, cari bakiye ve kasa bakiyesi iptal edilmemiş satırların toplamıdır.

## 4. Sunucu işlemleri

- **`fis_kes(fis)`** — tek kapı. Başlık + kalemler + stok/cari/kasa satırları tek veritabanı işleminde. Denetler:
  - stok fişinde en az bir stok satırı; para fişinde en az bir kasa ya da cari satırı;
  - satırların hepsi bu fişe bağlı; cari satırı fiş tutarıyla tutarlı;
  - aynı fiş numarası ikinci kez gelirse yeniden yazmaz ("zaten var" der — ağda düşüp yeniden gönderilen fiş çift olmaz).
- **`fis_iptal(numara, sebep)`** — fişi ve bütün satırlarını birlikte iptal eder. Silme yok.
- Hareket tablolarına başka yoldan yazma **kapalı** (bugünkü `stk_yaz` / `car_yaz` / `kas_yaz` hareket yazamaz;
  yalnız tanım işleri — ürün, renk, hesap adı — kalır).
- Kural tetikleyicileri: satırsız fiş, fişsiz satır, fiş silme → reddedilir.

## 5. Uygulama tarafı

- Her yazma yolu önce fişi kurar, sonra `fisKes` der. Yolların tam listesi: **§ 7 Envanter**.
- Kalkanlar: stok yazımından "deftere girmemiş hareketleri" toplayıp otomatik fiş kuran kod (100), fişsiz harekete numara
  veren kod, ayrı fiş defteri listesi ve onu birleştiren kodlar, bunların açılıştaki onarımları.
- Ekranlar ilk aşamada değişmez: stok, cari ve kasa bugünkü biçimde okunur (veritabanı görünümleriyle).

## 6. Geçiş, sınama, gece denetimi

- **Göç yok:** veriler 29 Ekim'de sıfırlandı; yeni yapı boş başlar.
- **Sınama:** yerel PostgreSQL'de her fiş türü + iptal + yeniden gönderim; uygulamada her yazma yolu için senaryo
  ("fiş kesildi mi, satırları tam mı, iptal edince hepsi birlikte geri geldi mi").
- **Gece denetimi:** veritabanında, uygulamadan bağımsız sorgular — fişsiz satır, satırsız fiş, kalem toplamı ≠ cari
  tutarı, gün içinde iptal edilenler. Sonuç gün sonu raporuna eklenir.
- **Sizin adımınız:** Supabase'de bir SQL adımı, sonra kontrol listesi.

## 7. Envanter — bugün stoğa, cariye, kasaya yazan yollar

Kodun tamamı tarandı: **43 yol**. Bugün fiş defterinden geçen yalnız **2** tanesi (alış/satış fişi formu, sipariş teslimi).
Otomatik defter kurucu yalnız **stok** tarafını görüyor: fiş yolu dışındaki hiçbir cari ve kasa hareketi (işçilik, maaş,
mesai, çek, kasa girişi, cari kartından hareket) deftere hiç girmiyor.

### Yeni yapıda her yolun karşılığı

| Bugünkü yol (dosya) | Kullanıcı eylemi | Yeni yapıda |
|---|---|---|
| Alış/satış fişi formu (089) — cari kartı, Depo › Alış fişi, siparişten satış, Sevkiyat Merkezi | Fiş kes | **Alış / Satış fişi**; peşin kısım için bağlı **tahsilat/ödeme makbuzu** |
| Sipariş teslimi (081) | Sipariş kartında teslim/sevk | **Satış fişi (sevk) / Alış fişi (giriş)** |
| Üretim teslim alma (079) | Teslim al (kart, atölye, barkod) | **Üretim fişi**: hammadde çıkışı + mamul girişi + iade/ek malzeme + fasoncuya işçilik (cari) — tek fiş |
| Prosese iş verme, ara proses kendiliğinden tamamlanınca (080) | İş ver | **Üretim fişi** (ara prosesin hammaddesi + işçiliği) |
| Numune üret (100) | Modelhane › numune | **Stok fişi — numune çıkışı** |
| Bağımsız stok giriş/çıkış (152) | Stok formu | **Stok fişi — elle giriş/çıkış** (cari bağlıysa alış/satış fişi) |
| Yeni ürün kartında başlangıç miktarı (152) | Ürün kaydet | **Açılış fişi** (bugün aynı gün hepsi tek "ACILIS-gün" numarasında — ayrı numara alacak) |
| Defter düzeltmesi, toplu defter onarımı (152, 086) | Ürün kartı / Bakım | **Sayım fişi** (fark) — onarım aracı kalkar |
| Açılış fişi kes (100/076) | Veri denetimi | **Açılış fişi** |
| Cari kartından hareket (260) — alış/satış/ödeme/tahsilat, demirbaş, çek | Cari kartı formu | **Stok fişi** (ürünlü) ya da **para fişi** (ürünsüz); iki "huni" teke iner |
| Demirbaş satın alındı (273) | Tanımlar › Kapasite | **Alış fişi** (ürünsüz kalem) |
| Mesai yaz (272) | Personel | **Para fişi — mesai tahakkuku** |
| Sipariş ödemesi, Ödeme & Tahsilat kısa formu, Banka Excel cari satırı (100, 260, 339) | Ödeme/tahsilat gir | **Tahsilat / ödeme makbuzu** |
| Kasa & Banka › hareket gir (205) | Kasa hareketi | **Para fişi** (carili ya da carisiz gider/gelir) |
| Gelir/gider kartına ödeme (260 KartOdemeSatiri), Banka Excel kart satırı (339) | Gider gir | **Gider fişi** |
| Virman (205) | Virman | **Virman fişi** (iki ayak tek fişte) |
| Çek ekle, ciro, iade, tahsil (088, 100) | Çek & Senet | **Çek fişleri** (alma, verme/ciro, iade, tahsil) |
| İrsaliye bilgisi ekle (239) | Sevkiyat Merkezi | Fişin başlığına bilgi (hareket değişmez) |

### Geri alma ve iptal (bugün birbirine uymuyor)

| Bugün | Sorun | Yeni yapıda |
|---|---|---|
| Fişi geri al / sil (100 `yetimFisTemizle`, Fişler ekranı, cari ekstresi) | — | **Fiş iptal** |
| Hareket sil (100 `removeHareketEverywhere`) | Yalnız cari hareketi silinirse fiş defteri iptal edilmiyor | **Fiş iptal** (tek hareket silinmez, fiş bütün iptal edilir) |
| Üretim teslimini geri al (100) | — | **Üretim fişi iptal** |
| Üretimi sil (076) | Kendi süzgeci var, `fisGeriAl` kullanmıyor; kasaya bakmıyor | Üretimin bütün fişleri iptal |
| Stok ekranında bağlantısız hareketi sil (152) | Fiş defterine ve cariye dokunmuyor | **Kalkar** (bağlantısız hareket olamaz) |
| Kasa hareketi sil (205), gelir/gider hareketi sil (396) | Fiş defterini iptal etmiyor | **Para fişi iptal** |
| Çekte son işlemi geri al, çek sil (205) | — | İlgili çek fişinin iptali |
| Sipariş iptal/sil (087/088) | Hareketlerden sipariş bağı siliniyor | Fişler kalır; sipariş "iptal" görünür (hareket değiştirilmez) |
| Kasa hareketini düzenle (205) | Hareket yerinde değişiyor | **İptal + yeni fiş** |

### Kendiliğinden yazanlar (kullanıcı eylemi olmadan)

| Bugün | Yeni yapıda |
|---|---|
| Her stok yazımında fişsiz harekete numara verme + otomatik defter kaydı (100, 012) — 30 Ekim hatasının kaynağı | **Kalkar** |
| Açılışta bir kerelik açılış göçü (012) | **Kalkar** (veriler sıfır, gerek yok) |
| Açılışta peşin ödeme yönü onarımı, defterden eksik alan tamamlama (100) | **Kalkar** |
| Açılışta Genel+Resmi ikiz cari hareketi birleştirme (090) | **Kalkar** |
| Ay başında maaş tahakkuku (100) | **Kalır ama** kendiliğinden yazmaz: ay başında "Maaş tahakkuku bekliyor" çıkar, onaylayınca **maaş fişi** kesilir |
| Renk/ölçü adı değiştirince hareketleri yeniden yazma (082, 083) | Gerek kalmaz: hareket rengi kimlikle tutuyor (stok v2'de zaten öyle) |

### Fiş defterini okuyanlar

Bugün: tekrar yazma denetimi, otomatik defter kurucu, fiş geri alma, açılış onarımları, veri denetimi, yedek. **Fişler
ekranı (250) defteri hiç okumuyor**, fişleri stok ve cari hareketlerinden türetiyor. Yeni yapıda Fişler ekranı, cari
ekstresi, stok hareketleri, kasa hareketleri, fatura taslağı ve veri denetimi aynı fiş tablosundan okur.

## 8. Açık sorular (sizin kararınız)

1. **Üretim fişi:** bir teslimde hammadde çıkışı, mamul girişi ve fasoncu işçiliği **tek fiş** mi, yoksa ayrı fişler mi
   (hammadde çıkış fişi + üretim giriş fişi + işçilik fişi)? Öneri: tek fiş — teslim tek olaydır, geri alınınca hepsi
   birlikte döner.
2. **Düzeltme:** kayıtlı fişte yanlışlık olunca yalnız **iptal + yeni fiş** mi? (Bugün kasa hareketi yerinde
   düzenlenebiliyor.) Öneri: evet, eski defter usulü; iptal edilen fiş üstü çizili görünür.
3. **Maaş tahakkuku:** ay başında kendiliğinden mi kesilsin, yoksa onayla mı? Öneri: onayla (kendiliğinden yazma kalmasın).
4. **Fiş numaraları:** tür başına önek + sıra (AF, SF, ÜRT, SYM, ACL, THS, ODM, VRM, ÇEK…) ve numarayı **sunucu** versin
   mi? Öneri: sunucu versin — iki cihaz aynı numarayı alamaz.

## 9. Aşamalar

1. SQL: `fis`, `fis_kalem`, satır bağları, `fis_kes`, `fis_iptal`, kurallar — yerel PostgreSQL'de her fiş türüyle sınama.
2. Uygulama: fiş kurucu ortak işlev + yolların taşınması (tablodaki sırayla: alış/satış → sipariş → üretim → stok
   formları → para fişleri → çek), eski kodun kaldırılması. Her yol için senaryo.
   İlerleme: alış/satış fişi (v1.732.0), sipariş teslimi (v1.732.1), üretim teslimi + geri alma + üretim silme (v1.733.0 —
   tek ÜRT fişi; satır türü `uretimFisAdi` alanında), ara proses kendiliğinden tamamlanma + numune (v1.733.1 — her ara proses
   kendi ÜRT fişi; numune NUM), stok formları (v1.734.0 — bağımsız giriş/çıkış MNL, defter düzeltmesi ve açılış fişi ACL).
   Para fişleri 1 (v1.735.0 — cari kartı tahsilat/ödeme, Ödeme & Tahsilat kısa formu, sipariş ödemesi: TH / ÖD, cari + kasa tek fiş).
   Para fişleri 2 (v1.736.0 — virman VRM, gelir/gider kartı GL/GD, Banka Excel satır başına fiş).
   Silme = fiş iptali (v1.737.0 — kasa / gelir-gider / cari hareketi silme fişi bütün iptal eder; sunucu fişi düzenlenmez).
   Çek işlemleri + mesai (v1.738.0 — çek alma/verme, ciro ÇC, iade Çİ, tahsil ÇT; mesai MS).
   Kalan küçük yollar (v1.739.0 — irsaliye fis_bilgi, sevk panelleri, çek tahsil iptali, Fişler ekranında yeni önekler).
   Kendiliğinden yazanlar kalktı, maaş tahakkuku onaylı (v1.740.0).
   Fişler ekranı kasa fişlerini de gösterir (v1.741.0 — VRM / GD / GL / ÇT; eski fis_defteri listesine sunucu kaydı zaten
   yazılmıyor, v1.732.0 tekilYaz süzgeci).
   Kural provası (v1.742.0 — bütün senaryolar fiş defterli sahte sunucuda; demirbaş AF, sipariş iptali `fis_bag_coz`, renk
   kodlama `stk_renk_tasi`; eski usul fişler için kod yok — kullanıcı kararı: kurallar açılmadan veri sıfırlanır).
   Sırada (kullanıcı): 18 (yeniden) + 20 → 16 + 17 (sıfırlama) → birkaç gün temiz gece raporu → 19. adım.
3. Gece denetimi (v1.741.0 — `fis-gece-denetimi.sql` / editor/20: fişsiz cari / kasa satırı (kural öncesi / sonrası ayrı),
   satırsız fiş, iptal fişin geçerli satırı, başlık tutarı ≠ cari satırları (Resmi hariç), günün kesilen / iptal edilen
   fişleri; gün sonu raporu sunucu fonksiyonu çağırır, bölüm "Fiş defteri denetimi"). Yerel sınama: uçtan uca fişlerin
   üstünde yanlış alarm yok + her sorun türü bilerek kurulup görülüyor (sinama-gece.sql).
4. Siz: Supabase'de tek SQL adımı → kontrol listesi → 1–2 hafta paralel kullanım.
