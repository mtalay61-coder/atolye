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
Adımlar ve korunacak klasörler: **`YEDEKTEN-ACMA.md`** (OneDrive'da `AtolyeYedek` dışına kopyalama).

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

## 5. Onarım planının biçimi (veriler gelince, AYRI ONAY)

Her model için: varyant kimliği (yedekteki = korunacak) · renk / ölçü · aktif önce → sonra · stok · hareket · bağlı sipariş /
üretim / barkod / reçete / resim · işlem · geri dönüş.

1. Canlıda PASİF duran kombinasyon varyantı (kimlik yedekteyle aynı) → `aktif=true`. Geri dönüş: `aktif=false`.
2. Canlıda OLMAYAN kombinasyon varyantı → yedekteki satır AYNI kimlikle geri eklenir (yeni kimlik üretilmez). Geri dönüş:
   o kimlik hareketsizse kaldırılır.
3. Çöken düz-ad varyantı → **silinecek varsayılmaz.** Stok, hareket, ona basılmış etiket (0018 kodlu barkod) ya da başka
   bağlantı varsa DOKUNULMAZ ve nasıl korunacağı ayrıca sorulur (stok varsa kombinasyonlara FİŞLE aktarım; fişsiz hareket
   olmaz). Hiçbir bağı yoksa en fazla pasife alınır (silme yok). Geri dönüş: `aktif=true`.
4. Reçete: `urunler.recete`'nin mamulRenk / mamulRenkId'si yedekteki hâline (adlar yeni yazımla). Geri dönüş: işlem öncesi
   tam döküm saklanır, aynen geri yazılır.
5. Uygulama tarafı: yenilenen istemci stok kartını buluttan okur; reçete urunler'den. Onarım öncesi / sonrası 27162 D ekrandan
   karşılaştırılır.

Barkod notu: barkod kombinasyonun `barkodKodu`'ndan kurulur (`077 varyantinBarkodu`). Eski 1054 / 1055 kodlu etiketler
kombinasyon varyantı geri gelince yeniden tanınmalı — onarım sonrası bir eski etiketle okutma sınaması plana girer.

## 6. Canlı envantere eklenecek doğrulama (salt okur, ayrı çalıştırma)

```sql
select conrelid::regclass as tablo, conname from pg_constraint where confrelid = 'public.stk_varyant'::regclass;
```
Tek satır (`stk_hareket`) dönerse § 1 hipotezinin şema kısmı doğrulanır.
