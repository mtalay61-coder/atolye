# Tek fiş defteri — plan (onayınıza)

**Durum (30 Ekim 2026):** taslak. Hiçbir şey değişmedi; karar sizin.

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

_(hazırlanıyor)_

## 8. Açık sorular

_(envanterden sonra)_
