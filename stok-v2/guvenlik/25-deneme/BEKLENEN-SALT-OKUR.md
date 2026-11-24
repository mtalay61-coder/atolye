# G-25 deneme — 0. ADIM: İKİ SALT OKUR SORGU VE BEKLENEN SONUÇLAR

**Kim çalıştırır:** kullanıcı, deneme projesinin SQL Editor'ünde. **Proje kimliği `drtmnovafswzcmpacubl` olmalı** — tarayıcının adres
çubuğunda `supabase.com/dashboard/project/drtmnovafswzcmpacubl/sql/…` görünmeden çalıştırmayın (canlı `mqdgucoomgqcvhvgixbl`).
**İkisi de yalnız okur:** `select` dışında ifade yok; hiçbir tabloya yazmaz, ad / e-posta / tutar dökmez (yalnız sayılar ve durum).
Dosyalar ve SHA-256 özetleri: `SABIT.md`. Çıktıları (satır numarası · kontrol · değer) olduğu gibi yapıştırın; çıktılar görülmeden
uygulama adımına geçilmez. Sorgu HATA verirse (ör. bir tablo / fonksiyon yok) hata metnini aynen yapıştırın — o da bir bulgudur.

## 1. `stok-v2/guvenlik/25-onkosul-salt-okur.sql`

Uygulamaya HAZIR olmak için beklenen (yerel canlı benzeri kopyadaki gerçek çıktı, 26 Kasım):

| # | Kontrol | Beklenen | Başka bir değer gelirse |
|---|---|---|---|
| 1 | G-25 yedeği | `yok` | `VAR` → G-25 daha önce uygulanmış; uygulama adımı YOK, durum incelenir |
| 2 | car_yaz gövdesi | `eski (G-25 öncesi, beklenen)` | `FARKLI: <md5>` → deneme projesi canlının G-25 öncesi hâlinde değil (15. adım farklı) — DUR |
| 3 | fis_kes gövdesi | `eski (G-25 öncesi, beklenen)` | `FARKLI` → fiş defteri (18) farklı sürüm — DUR; `YOK` → fiş defteri kurulu değil — DUR |
| 4 | fis_iptal gövdesi | `eski (G-25 öncesi, beklenen)` | aynı |
| 5 | A6 | `UYGULANMIŞ` | `FARKLI: <md5>` → yetki_var_mi canlıdaki A6 değil — DUR (A6 önce gelmeli) |
| 6 | G-25 nesneleri | `0` | 0 değilse → yarım / eski G-25 kalıntısı — DUR |
| 7 | fiş kuralları / sürüm kapısı | bilgi (yerelde `kurallar KAPALI · min_istemci_surum boş`) | dolu bir sürüm kapısı varsa 1.745.1 o sürümden düşükse yazamaz — bildirin |
| 8 | kullanıcı sayıları | bilgi (Yönetici · cari/muhasebe · PARA'sız stok/üretim/sipariş · yalnız fişler · diğer) | Yönetici 0 → deneme için Yönetici gerekir |
| 99 | GENEL | **`HAZIR`** | `KARIŞIK — dur, satırları incele` → uygulama adımı YOK; satırlara göre karar |

## 2. `stok-v2/guvenlik/25-deneme/durum-salt-okur.sql`

Yalnız SAYAR; "doğru" bir değer yok — deneme için verinin yeterli olup olmadığına bakılır.

| # | Kontrol | Beklenen / bakılacak |
|---|---|---|
| 1 | veritabanı | `postgres · postgres` (proje kimliği SQL'den okunamaz — adres çubuğu `drtmnovafswzcmpacubl`) |
| 2 | surum tablosu | bilgi (deneme projesinde yayın kaydı varsa sürüm numarası; yoksa `yok`) |
| 3 | giriş sistemi açık mı | **`true`** olmalı (G-25 yetki denetimi giriş açıkken çalışır; `false` → herkes yetkili sayılır, deneme anlamsız) |
| 4 | kullanıcılar: toplam · Yönetici · cari/muhasebe · üretim (PARA'sız) | Yönetici ≥ 1, cari/muhasebe ≥ 1, üretim (PARA'sız) ≥ 1 — yoksa deneme kullanıcıları Tanımlar'dan açılır (ayrı adım, yazma) |
| 5 | kimliği (id) olmayan kullanıcı kaydı | **`0`** olmalı (kimliksiz kayıtta istemcinin yetki tazelemesi yanlış kişiyi eşler — yerelde böyle bir test hatası bulundu) |
| 6 | auth hesabı sayısı | ≥ 4 olmalı ki Yönetici, Muhasebe, Üretim, Şef ayrı ayrı girebilsin |
| 7 | bölüm · bölüm personeli · maaşlı personel | mesai denemesi için ≥ 1 · ≥ 1 · ≥ 1 |
| 8 | cari tipleri | Personel ≥ 1 (bölümde OLMAYAN parça başı usta için en az 2 Personel iyi olur) |
| 9 | proses ücreti tanımlı ürün | ≥ 1 |
| 10 | üretim · tamamlanmamış atama · açık tamir | bilgi; deneme için yeni bir üretim + iş açılabilir (yazma — ayrı adım) |
| 11 | fiş sayısı · iptal · son fiş tarihi | bilgi (deneme projesinin dolu olup olmadığı; silme / sıfırlama YAPILMAZ) |
| 12 | fiş kuralları / sürüm kapısı | 1. sorgunun 7. satırıyla aynı olmalı |
| 13 | G-25 nesneleri | **`false · false · false · false`** (1. sorgunun 6. satırı 0 ile tutarlı) |

## Sonra (çıktılar görüldükten sonra, ayrı onayla)

GENEL `HAZIR` ve durum uygunsa: `25-cari-yetki-uygula.sql` (YAZAR) için ayrı onay istenir. Değilse farklar raporlanır, uygulama yapılmaz.
