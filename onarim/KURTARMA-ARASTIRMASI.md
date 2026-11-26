# Renk çökmesi — kurtarma araştırması (26 Kasım, 2. sürüm)

Durum: KOD / ŞEMA İNCELEMESİ + KURTARMA KAYNAKLARI. Canlı envanter, canlı yazma izi ve yedek dökümü HENÜZ GELMEDİ.
Aşağıdaki çıkarımlar **KESİN DEĞİL** — her biri hangi çıktıyla doğrulanacağıyla birlikte yazıldı. Yeni kimlik ÜRETİLMEDİ,
canlıda hiçbir veri değişmedi, hiçbir şey geri yüklenmedi.

## 1. Bulutta varyant kimliği (koddan — canlıda doğrulanacak)

- `stk_varyant.id` varsayılanı `'vry-' || gen_random_uuid()` — rastgele; ad / renk / ölçüden türetilemez. Aynı (ürün, renk,
  ölçü) yeniden açılırsa yeni kimlik alır.
- Depodaki kurulum betiklerinde `stk_varyant`'a başvuran tek yabancı anahtar `stk_hareket.varyant_id`. Sipariş kalemi, üretim,
  rezervasyon, koli, reçete, renk resmi, harici barkod varyant kimliği değil renk ADI (kimi yerde renk tanım kimliği) taşır.
  İstemci varyant kimliğini hiç bilmez (src'de yok) → uygulamanın yerel yedekleri bu kimliği içermez.
- `stk_yaz` varyantKaldir: stoğu ≠ 0 → dokunmaz; hareketi var → `aktif=false`; ikisi de yok → DELETE.

HİPOTEZ (doğrulanmadı): silinen varyantlar o an hareketsiz ve stoksuzdu → onlara bağlı kayıt olmamalı; hareketliler pasif
kimlikleriyle duruyor olmalı. **Doğrulama:** (a) canlıda `stk_varyant`'a başvuran bütün yabancı anahtarlar (canlı şeması depodan
farklı olabilir — envantere eklenecek tek satırlık sorgu, aşağıda § 6), (b) yedekteki kimliklerin canlıda karşılığı (§ 4),
(c) yedekteki hareket sayıları.

## 2. Kurtarma kaynakları

| Kaynak | Varyant kimliği | Kombinasyon | Reçete | Not |
|---|---|---|---|---|
| **OneDrive gece yedeği** (`AtolyeYedek/<tarih>`, GitHub Actions 03:17, sınanmış) | **EVET** (`stk_varyant`) | **EVET** (`tanimlar`, `stk_renk` tur='model') | **EVET** (`urunler.recete`) | `public.dump` = public şemasının tamamı (pg_dump -Fc). Her gece geçici sunucuya açılıp envanterle sınanır; başarısızsa klasör `-SINANMADI`. Saklama 30 gün (en yeni 7 korunur). |
| Supabase yedeği / PITR | EVET | EVET | EVET | Plana bağlı; panelden bakılır, geri yükleme YAPILMAZ |
| Uygulamanın otomatik yedeği (`yedek:<gün>`, cihaz, son 3 gün) | HAYIR | adla | EVET | Yalnız o cihazda; "geri yükle" bütün veriyi döndürür — KULLANILMAZ |
| Elle JSON yedek | HAYIR | adla | EVET | |

Gece yedeği içeriği koddan doğrulandı (`stok-v2/yedek/dokum-al.sh`: `pg_dump --format=custom --schema=public`); yalıtılmış
açma akışı yerelde uçtan uca sınandı (taklit veride hata öncesi üç kombinasyon varyantı kimlikleriyle, iki kombinasyon,
renk tanımları geldi; açılan veritabanında tetikleyici 0). Gerçek yedeğin içeriği sizin çıktınızla doğrulanacak.
Açma yolu: önerilen **`is-akisi/yedek-ac.yml`** (GitHub Actions, canlıya bağlanmaz; koruma kopyasını da kendisi alır; ETKİN DEĞİL, ayrı onay); elle yol `YEDEKTEN-ACMA.md`.
Kullanılacak yedek: 03:17 VARSAYILMAZ. Klasör adı betik başlarken İstanbul saatiyle konur (`gece-yedek.sh` AD=…%H%M) ve zamanlanmış iş gecikebilir;
dökümün bittiği an `ozet.txt` "döküm tarihi" (UTC) satırındadır. Hata öncesi olduğu asıl olarak İÇERİKLE doğrulanır: yedekte 27162 D'nin
kombinasyon varyantları etkin ve rengin adı eski yazımda olmalı.

## 2a. Gerçek gece koşuları (GitHub Actions kaydından, 26 Kasım)

Zamanlama 00:17 UTC ama GitHub işi her gün SAATLERCE geç başlatıyor. Kayıttan (yalnız adım satırları; veri yok):

| Klasör | Koşu (UTC) | İstanbul | Döküm | Sınama | Yükleme | Jeton |
|---|---|---|---|---|---|---|
| `2026-11-25-1137` | 08:37:13 → 08:39:34 | 25 Kas 11:37–11:39 | 08:37:47–08:39:09, 82 sn, public.dump **1839 KB**, 44 tablo | **SINAMA TAMAM** (44 tablo canlıyla aynı) | 12 dosya, bayt bayt doğrulandı | yenilendi, saklandı |
| `2026-11-26-1121` | 08:20:50 → 08:23:02 | 26 Kas 11:21–11:23 | 08:21:22–08:22:40, 78 sn, public.dump **2285 KB**, 44 tablo | **SINAMA TAMAM** | 12 dosya, bayt bayt doğrulandı | yenilendi, saklandı |

Sonuçlar:
- 26 Kasım yedeği 11:21'de alındı. Sorun SABAH oluştuysa bu yedek **hatadan SONRA**dır (hasarlı durumu gösterir) — ad
  değişikliğinin saati canlı envanterden (`2-varyant.olusturma`, `7-renk-tanimi.guncelleme`) okunup kesinleşecek.
- Hatadan önceki kesin yedek: `2026-11-25-1137`. Ama 25 Kasım 11:39'dan SONRA girilen kayıtları İÇERMEZ.
- Döküm bir günde 1839 → 2285 KB büyüdü: 25 Kasım öğleden sonra / 26 Kasım sabahı canlıya veri yazılmış. "Dünden bugüne veri
  girilmedi" bu yüzden ölçülmeden kabul edilemez; bütün veritabanını yedeğe döndürmek bu kayıtları SİLERDİ → hedefli onarım.
- İki yedek de açılıp karşılaştırılacak (yedek-ac iş akışı ikisini birden işler): 25-1137 hata öncesi değer, 26-1121 hatanın
  o saatteki durumu.

## 3. "Gece yedeğinden geri getirebilir miyiz?"

- **Bütün veritabanını yedeğe döndürmek: ÖNERİLMEZ ve yapılmayacak.** Canlıya geri yükleme isteğiniz dışında; ayrıca
  03:17'den sonraki HER yazmayı (ad değişikliğinin kendisi, varsa başka kayıtlar, oturumlar, günlük, sayaçlar) geri alır ve
  açık uygulamaların bellekleriyle çakışır. "Veri girilmedi" doğru olsa bile ölçülmeden güvenilemez.
- **Hedefli geri getirme: EVET, en sağlam yol bu.** Yedekten yalnız etkilenen modellerin hata öncesi satırları alınır
  (aynı varyant kimlikleri, reçete satırları) ve canlıya kayıt kayıt, önce/sonra gösterilerek, ayrı onayla uygulanır.
  Rengin yeni yazımı ("Vizon Yılan") korunur — Tanımlar geri alınmaz.
- **Önkoşullar:** (1) `canli-yazma-izi-salt-okur.sql` — 03:17'den sonra hangi tabloya ne yazıldı; etkilenen modellerde
  sonradan hareket / sipariş / üretim varsa plan ona göre değişir. (2) 1.744.37 yayında olmalı (yoksa ilk ad değişikliği
  yeniden çökertir) ve onarım sırasında açık uygulamalar yenilenmeli (eski bellekle yazmasın).

## 4. Sınıflandırma — önce "ONARIM ADAYI"

Envanterdeki her eşleşme önce **onarım adayı**dır. KESİN sayılması için üç kanıttan en az ikisi, biri yedek olmak üzere:

| Kanıt | Kaynak | Kesinleştirir |
|---|---|---|
| Y — yedek | `yedek-dokum-2611.csv` `3-varyant` | Hata öncesi bu ürün + kombinasyon + ölçü için varyant VARDI (kimliğiyle); şimdi pasif ya da yok |
| İ — işlem izi | canlı envanter `2-varyant` (`olusturma`, hareket tarihleri), `7-renk-tanimi.guncelleme`, `canli-yazma-izi` | Düz-ad varyantı ad değişikliği anında açıldı; kombinasyon varyantı o anda pasifleşti |
| B — bağlantı | canlı envanter `3`–`6` | Sipariş / üretim / reçete / resim / barkod kombinasyon adını taşıyor, etkin varyanta bağlı değil |

- **KESİN**: Y + (İ ya da B).
- **ONARIM ADAYI (doğrulanmamış)**: yalnız İ ya da yalnız B.
- **ŞÜPHELİ / KAPSAM DIŞI**: Y'de de aynı durum (hata öncesinden beri düz renkli mamul ya da artık kayıt) → bu hatayla ilgisiz;
  ayrı listelenir, dokunulmaz.

## 5. Onarım planının biçimi — YALNIZ KANITLANAN HASARLI ALANLAR (veriler gelince, AYRI ONAY)

İlke: **yedekten bütün satır / bütün ürün kopyalanmaz.** Yedek yalnız "hata öncesi değer neydi" kanıtıdır. Canlıdaki güncel
sağlam alanlar (ürün adı, fiyat, stok no, görseller, diğer renkler, sonradan girilmiş her şey), BÜTÜN stok hareketleri ve
barkod tanımları korunur. Her değişiklik tek alan, tek kayıt; önce/sonra değeri ve kanıtı (Y/İ/B) yanında yazılır.

Bu hatanın dokunabildiği alanlar (082 kodundan) ve onarım biçimi:

| Kayıt | Alan | Hasar | Onarım | Korunan |
|---|---|---|---|---|
| `stk_varyant` (kombinasyon, canlıda VAR, pasif) | `aktif` | true → false | `aktif=true` — yedekte etkinse ve kimlik aynıysa | kimlik, renk_id, olcu_id, min_stok, hareketler |
| `stk_varyant` (kombinasyon, canlıda YOK) | satırın kendisi | silindi | yedekteki `id, urun_id, renk_id, olcu_id, min_stok` ile AYNI kimlikle eklenir — yalnız canlıda o (ürün, renk_id, olcu_id) yoksa | — |
| `stk_varyant` (çöken düz-ad) | `aktif` | yeni açıldı | stok 0, hareket 0, etiket / harici barkod bağı yoksa `aktif=false`; varsa DOKUNULMAZ, size sorulur | kimlik, hareketler, satır silinmez |
| `urunler.recete[n]` | `mamulRenk` | kombinasyon adı → düz ad | kombinasyonun GÜNCEL adı (yeni yazım) | satırın diğer bütün alanları |
| `urunler.recete[n]` | `mamulRenkId` | kombinasyonsuz → renk kimliği | yedekteki değer (çoğunlukla boş) | — |

Hasarlı olmadığı koddan görülen (ADLA eşleşir; onarıma GİRMEZ, yalnız doğrulanır): `renk_resimleri` anahtarları, `harici_barkodlar`,
stok hareketleri, sipariş kalemleri, üretim, koliler, rezervasyonlar, Tanımlar.

Reçete satırının kalıcı kimliği yok: yedekteki satır canlıdakiyle **sıra + hammaddeUrunId + mamulBeden + renk + beden + proses +
eklemeId** ile eşlenir. Eşleşme tek ve kesin değilse o satıra DOKUNULMAZ, size gösterilir (ör. sonradan reçete değiştiyse).

Uygulama biçimi: her işlem `where` koşulunda canlıdaki BEKLENEN önceki değeri de taşır (ör. `aktif = false and renk_id = ...`);
değer beklenenden farklıysa satır değişmez ve rapor edilir (araya giren değişikliği ezmez). Tek işlemde, önce salt okur
"önce" dökümü, sonra değişiklik, sonra "sonra" dökümü.

Geri dönüş: "önce" dökümündeki değerler aynı alan / kayıt düzeyinde geri yazılır; eklenen varyantlar hareketsizse kaldırılır.

Önkoşul: 1.744.37 yayında ve açık uygulamalar yenilenmiş olmalı; onarım sırasında renk adı değiştirilmez.

Barkod notu: barkod kombinasyonun `barkodKodu`'ndan kurulur (`077 varyantinBarkodu`). Eski 1054 / 1055 kodlu etiketler
kombinasyon varyantı geri gelince yeniden tanınmalı — onarım sonrası bir eski etiketle okutma sınaması plana girer.

## 6. Canlı envantere eklenecek doğrulama (salt okur, ayrı çalıştırma)

```sql
select conrelid::regclass as tablo, conname from pg_constraint where confrelid = 'public.stk_varyant'::regclass;
```
Tek satır (`stk_hareket`) dönerse § 1 hipotezinin şema kısmı doğrulanır.
