# Faz 2 — 23 platform tabloları: canlı uygulama paketi (20 Kasım 2026)

> **DURUM: HAZIRLANDI · ÖN KONTROLLER TAMAM (20 Kasım) — CANLIYA UYGULANMADI.**
> - Canlı uygulama ayrı ve açık onay ister.
> - Geri alma **ayrıca** onay ister; uygulama onayı geri almayı kapsamaz.
> - PR birleştirme, yayın ve `surum.json` bu paketin kapsamında değil.
> - **Canlıdan üretilen kurulum dosyasının boş bir projede doğrulanması (Faz 4), genel yayından önce ZORUNLU kalır.** Faz 2 onu kaldırmaz.

## Ne yapar, ne yapmaz

- **Ekler:** ana projeye (`mqdgucoomgqcvhvgixbl`) 5 boş tablo ekler (`platform_yoneticileri`, `platform_firmalar`, `platform_sozlesmeler`, `platform_odemeler`, `platform_olaylar`). Ayrıca RLS, politikaları, 5 fonksiyon ve tetikleyicileri ekler.
- **Dokunmaz:** mevcut tablolara, verilere ve A6 fonksiyonlarına. Uygulama (1.744.22) bu tablolara bakmaz; kullanıcıya görünür bir etkisi yok.
- **Tek işlem:** platform_ nesnelerinden biri bile varsa hiçbir şeye dokunmadan durur. Bloktaki her hata bütün değişikliği geri alır.
- **İlk platform yöneticisini eklemek bu paketin parçası DEĞİL.** Dosyanın başlığındaki "SONRA" adımı ayrı bir yazmadır, ayrı onay ister. Bu yüzden uygulama sonrası kontrolde tablolar 0 satır olmalı.

## Dosyalar ve SHA-256

| Dosya | Rol | SHA-256 |
|---|---|---|
| `stok-v2/guvenlik/23-platform-yonetim.sql` | **UYGULANACAK** | `ca0509fc7fff45605613ecf60080f901ccb1062c4931e6838847695956dad9f8` |
| `stok-v2/guvenlik/23-onkosul-salt-okur.sql` | 23 durumu (salt okur) | `d352c5e1f22c5045ad2a24852cf526a90047f24bddde543a1010173622244f08` |
| `stok-v2/guvenlik/24-a6-onkosul-salt-okur.sql` | A6 durumu (salt okur) | `92363358ef7afd8f1ae5957c0258397e9382863f5b7be0f1dbcf8a75a855d540` |
| `stok-v2/guvenlik/23-faz2-kontrol-salt-okur.sql` | Önce / sonra kontrol, A6 imzası (salt okur) | `5f1530c40edee84dca1a06a08051b4b25d29ad14f9d96390743caac11563e4d7` |
| `stok-v2/guvenlik/23-platform-yonetim-geri-al.sql` | Geri alma (**ayrı onay**) | `44e4e44f819978213bff3ee24781863bd1f1dc118f743ec8ad7c5a05a26e09d5` |

- `23-platform-yonetim.sql`, `da0e268`'den beri değişmedi ve #363 dalındakiyle aynı.
- Geri alma dosyasının yalnız başlık yorumu 20 Kasım'da netleştirildi; davranışı aynı.

## Ön koşullar (uygulama günü)

1. Adres çubuğunda `…/project/mqdgucoomgqcvhvgixbl/…` olmalı. Deneme projesi `drtmnovafswzcmpacubl` DEĞİL.
2. Son 24 saatte **sınanmış** gece yedeği olmalı (GitHub Actions `gece-yedek`, "SINAMA TAMAM").
3. Atölye kapalı, bekleyen kayıt yok. 23 mevcut veriye dokunmaz, ama Faz 1'deki gibi güvenli zaman tercih edilir.

## ÖNCE — salt okur — **TAMAM (20 Kasım, canlı)**

> Kayıt: `stok-v2/test/guvenlik/t23/sonuc-faz2-once-canli-2026-11-20.txt`.
> - Ö1 **HAZIR** (platform_ nesnesi 0 / 0); çıktı yereldeki HAZIR çıktısıyla birebir.
> - Ö2 **UYGULANMIŞ**.
> - Ö3: beş tablo `yok`, A6 **UYGULANMIŞ**.
>
> **SONRA'da birebir aranacak A6 imzası** (Ö3 satır 7–10):
> - 7: `889fe0863581380d64f5ee4c48ff067a`
> - 8: `4e13bc49e068c183bd58af2dcb056e76`
> - Yetki listeleri: `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`
> - 9: `596f01be91f2baf1c102dfb021fb9bad · O`
> - 10 (özet): `0670954ad6b52222fabbd417115e5982`

| # | Dosya | Beklenen |
|---|---|---|
| Ö1 | `23-onkosul-salt-okur.sql` | Satır 99 GENEL = **HAZIR** (satır 3: `0 / 0`; KARIŞIK / EKSİK → DUR) |
| Ö2 | `24-a6-onkosul-salt-okur.sql` | Satır 99 GENEL = **UYGULANMIŞ** |
| Ö3 | `23-faz2-kontrol-salt-okur.sql` | Satır 1–5: `yok` ×5 · Satır 6: `UYGULANMIŞ` · **Satır 7–10 (A6 imzası) KAYDEDİLİR** |

Ö3'ün 9. satırındaki tetikleyici md5'i canlı arşivindekiyle aynı olmalı: `596f01be91f2baf1c102dfb021fb9bad` (Faz 0 ve Faz 1'de ölçüldü).

## UYGULA — ayrı onayla

- `23-platform-yonetim.sql` dosyasının **tamamı**, SQL Editor'de tek Run.
- **Beklenen:** hata yok; son tablo kaba denetim.
- **DUR:** "DUR: platform_ nesneleri zaten var" ya da herhangi bir hata görülürse dur ve sonucu paylaş.

## SONRA — salt okur

| # | Dosya | Beklenen |
|---|---|---|
| S1 | `23-onkosul-salt-okur.sql` | GENEL = **UYGULANMIŞ** · politika, yetki, fonksiyon, tetikleyici farkı **yok** · RLS kapalı tablo **yok** · satır 9 (platform yöneticisi) **0** · satır 10 (kayıtlar) **0 / 0 / 0** |
| S2 | `23-faz2-kontrol-salt-okur.sql` | Satır 1–5: **0 0 0 0 0** (yönetici, firma, sözleşme, ödeme, olay — tablolar BOŞ) · Satır 6: **UYGULANMIŞ** · Satır 7–10: **Ö3 ile BİREBİR** (A6 fonksiyonlarının tam tanımı, yetki listeleri ve tetikleyici tanımı değişmedi) |
| S3 | Uygulama (1.744.22): giriş, F5, bir ekran | Hatasız (23 uygulamayı etkilemez; görünür kontrol) |
| S4 | Ertesi gece yedeği | "SINAMA TAMAM": 5 yeni boş tablo yedeğe girer, sınama canlıyla aynı sayar |

Herhangi biri tutmazsa dur. İleri düzeltme önceliklidir; geri alma aşağıdaki koşullarla ve ayrı onayla yapılır.

## Geri dönüş — AYRI VE AÇIK ONAY

- **Dosya:** `23-platform-yonetim-geri-al.sql`. Tek işlemdir.
- **DURMA KOŞULU:** `platform_firmalar`, `platform_sozlesmeler` ya da `platform_odemeler`'de **tek satır bile varsa** geri alma hiçbir şeye dokunmadan durur ("DUR: platform tablolarında N kayıt var"), hiçbir şey silinmez.
  - Kayıt varken geri almak gerekiyorsa önce kayıtlar bilinçli olarak dışarı alınır. Bu karar dosyaya bırakılmaz; ayrı onay ister.
- **KALDIRILANLAR** (üç tablo boşsa): beş tablo ve beş fonksiyon, **içerikleriyle birlikte**.
  - **Yönetici listesi (`platform_yoneticileri`) silinir.** Eklenmiş platform yöneticileri kaybolur; giriş hesapları `auth.users`'ta kalır. Yeniden uygulamada tekrar eklenmeleri gerekir.
  - **Olay günlüğü (`platform_olaylar`) silinir.** Günlük firmaya bağlıdır (firma kimliği zorunlu, firma silinemez). Firma yoksa günlük de boştur; bu yol pratikte yalnız boş günlüğü kaldırır.
- **Geri alma sonrası:** `23-onkosul-salt-okur.sql` → **HAZIR** · `23-faz2-kontrol-salt-okur.sql` → satır 1–5 `yok`, satır 6–10 Ö3 ile birebir (A6 etkilenmez).
- **A6 ile ilişki:** 23'ün geri alınması A6'ya dokunmaz. A6'nın kendi geri alması (`24-a6-tanim-kimligi-geri-al.sql`) açığı yeniden açar; Faz 2 ile **ilgisi yoktur, kullanılmaz.**

## Yerel prova (`stok-v2/test/guvenlik/t23/test23-faz2.sh`)

Canlı benzeri kaynakta (`atolye_canli`: Faz 0.4 envanteriyle hizalı, A6 uygulanmış), paket sırası Editor gibi uygulanarak koşuldu: **20/20**.

| Adım | Sonuç |
|---|---|
| ÖNCE | 23 HAZIR · A6 UYGULANMIŞ · tablolar `yok` ×5 |
| UYGULA | Hatasız |
| SONRA | 23 UYGULANMIŞ · tablolar 0 ×5 · A6 UYGULANMIŞ · A6 imzası (satır 7–10) önceyle birebir · ikinci uygulama durur |
| Firma kaydı varken geri alma | DURUR; 23 UYGULANMIŞ kalır, firma ve olay yerinde |
| Yalnız yönetici listesi doluyken geri alma | Durmaz; listeyi ve günlüğü kaldırır → 23 HAZIR, A6 imzası aynı |

Ayrıca `t23/test23.sh` **163/163**.

## Kaynak ↔ canlı (Faz 0.4) — doğru ifade

- Canlı koruma envanteriyle karşılaştırma: **194 satır eşleşti, 32 satır kapsam dışında.**
- Kapsam dışı satırlar: şeması depoda olmayan eski / site tabloları ile `surum_arttir` / `guncelleme_yaz` tetikleyicileri.
- Bu, **tam şema eşitliği değildir.** Tam eşitlik, canlıdan üretilen kurulum dosyasının boş projede doğrulanmasıyla (Faz 4) ölçülür.
