# Canlıya geçiş ve geri dönüş planı — yeni firma kurulumu v2 + 23 + 1.744.25 (taslak, 18 Kasım 2026)

> **DURUM:** Plan. Hiçbir adım uygulanmadı; canlıya, main'e, `surum.json`'a ve yayına dokunulmadı.
> Her faz ayrı onay ister. SQL'leri kullanıcı Supabase SQL Editor'den elle çalıştırır (canlı erişim yalnız onda).
> PR'lar: mtalay61-coder/atolye#362 (23) → mtalay61-coder/atolye#363 (kurulum v2 + 1.744.25); ikisi de TASLAK.

## Neye dayanıyor (bugüne kadar kanıtlananlar)

- **Yerel testler:**
  - t23 163/163; t24 66/66; ekran 42/42.
  - Tam takım: 266 senaryonun 266'sı AYNI.
  - Deneme provası 25/25.
- **Gerçek Supabase deneme projesi (18 Kasım):**
  - kurulum 18/18;
  - 23 UYGULANMIŞ;
  - giriş, F5 oturumu;
  - stok + kasa sunucuda birebir;
  - ana projeye 0 istek;
  - deneme projesinden indirilen dosya yalıtılmış yerelde 18/18, şema 0 fark;
  - yetki sınaması: tek açık A6.
- **Ayrıntı dosyaları** (`stok-v2/test/guvenlik/t24/`):
  - `sonuc-deneme-projesi-2026-11-18.txt`;
  - `sonuc-indirilen-dosya-2026-11-18.txt`;
  - `sonuc-yetki-sinama-2026-11-18.txt`.

## Geçişi engelleyen ya da önce kapanması gerekenler

1. **A6 yetki yükseltme açığı (CANLIDA DA VAR):**
   - **Açık:** Personel tanımlar satırının kimliğini değiştirebiliyor. Ardından `yetki_var_mi` herkese "evet" diyor, `yonetici_mi` herkese "hayır".
   - **Düzeltme** ayrı SQL + geri alma + test olarak hazırlanacak, bu plandaki Faz 1. İki parça:
     - `tanimlar_kullanici_koruma`: JWT varken güncellemede `id` değişimi reddedilir.
     - `yetki_var_mi`: 'tekil' satırı yoksa ve JWT varsa REDDEDER. Bugün izin veriyor; JWT'siz (servis, Editor) davranış aynı kalır.
   - **Sınama:**
     - t23/t24 + `deneme-yetki-sinama.sql`'de A6/A6b `UYGUN` olmalı.
     - Diğer satırlar değişmemeli.
     - Uygulamanın tanım yazmaları (ekran testleri, tam takım) etkilenmemeli.
2. **Kayıt kapalı mı (canlı):**
   - Authentication › Email › "Allow new users to sign up" **KAPALI** olmalı.
   - Neden: Deneme projesinde açık geldi. Açıksa adresi bilen herkes hesap açıp F satırlarındaki gibi okur ve yazar.
   - Faz 0'da yalnız GÖZLE bakılır; açıksa kapatmak ayrı onay.
3. **Kaynak ↔ canlı farkı:**
   - Deneme dosyası yerel kopyadan üretildi.
   - Canlıda `rls-yazma.sql`'in silme korumaları (`silme_koruma`: urunler, cariler, siparisler, uretim) var, yerel kaynakta yok.
   - Asıl kurulum dosyası canlıdan üretilecek (Faz 3) ve bu korumaları TAŞIMALI. Faz 6'da ölçülür.

## Faz 0 — Hazırlık, YALNIZ OKUMA (canlıda yazma yok)

| # | İş | Kim | Ölçüt |
|---|---|---|---|
| 0.1 | Son gece yedeği **sınanmış** mı (OneDrive `AtolyeYedek/<tarih>` klasörü, `-SINANMADI` eki yok) | kullanıcı | Son 24 saatte sınanmış yedek var |
| 0.2 | `23-onkosul-salt-okur.sql` canlıda | kullanıcı | GENEL = **HAZIR** (23 uygulanmamış, uygulanabilir). KARIŞIK / EKSİK → DUR |
| 0.3 | Canlıdaki kurulum fonksiyonlarının bugünkü tanımını yedekle (salt okur: `select pg_get_functiondef(…)`; sorgu hazırlanacak) | kullanıcı | Çıktı dosyası saklandı (Faz 3 geri dönüşü bunu kullanır) |
| 0.4 | Canlı tetikleyici envanteri (salt okur): `silme_koruma` 4 tabloda, `yazma_koruma` muhasebe / faturalar, `tanimlar_kullanici_koruma` | kullanıcı | Liste kaydedildi (Faz 6 karşılaştırması) |
| 0.5 | "Allow new users to sign up" durumu | kullanıcı (göz) | KAPALI. Açıksa ayrı onayla kapatılır |
| 0.6 | Canlı bekleyen kayıt / açık işlem yok; atölye mesai dışı | kullanıcı | Uygulamada "bekleyen kayıt" şeridi yok |

**Geri dönüş:** Gerek yok; yazma yapılmadı.

## Faz 1 — A6 düzeltmesi (canlı SQL; 23'ten ÖNCE)

| Adım | Ölçüt |
|---|---|
| Önce deneme projesinde: düzeltme SQL'i → `deneme-yetki-sinama.sql` | A6 / A6b **UYGUN**, diğer bütün satırlar önceki sonuçla aynı |
| Deneme uygulamasında (deneme sunucusu) yönetici ile tanım değiştir, personel ile giriş | Uygulama normal çalışır |
| Canlıda düzeltme SQL'i (mesai dışı) | Hatasız; doğrulama sorgusu (dosyanın sonunda) beklenen |
| Canlı uygulamada yönetici girişi + bir tanım değişikliği | Kaydedilir, hata yok |

**Geri dönüş:**
- Düzeltmenin geri alma dosyası, iki fonksiyonun önceki gövdesini birebir kurar. Faz 0.3'te alınan tanımla karşılaştırılarak hazırlanır.
- Uygulama kodu değişmediği için geri dönüş yalnız SQL'dir.

## Faz 2 — 23 platform tabloları (canlı SQL)

| Adım | Ölçüt |
|---|---|
| `23-platform-yonetim.sql` canlıda (Editor, tek Run) | Hatasız |
| `23-onkosul-salt-okur.sql` | GENEL = **UYGULANMIŞ**, kayıtlar 0/0/0 |

**Geri dönüş:**
- `23-platform-yonetim-geri-al.sql` (t23'te sınandı).
- Ardından önkoşul = HAZIR.
- Platform tabloları boş olduğu için veri kaybı yok.

## Faz 3 — Yeni kurulum betiği (canlı SQL)

| Adım | Ölçüt |
|---|---|
| `kurulum-betigi.sql` (v2) canlıda | Hatasız |
| Canlıda `select length(public.kurulum_betigi()) > 1000` (Editor'de) | true |
| `select count(*) from public.kurulum_parmak_izi()` | 17 |

**Geri dönüş:**
- Faz 0.3'te saklanan tanımlarla eski fonksiyonları geri kurmak.
- Ya da yalnız yeni fonksiyonları düşürmek: `kurulum_betigi`, `kurulum_parmak_izi`, `kurulum_metni`.
- Yayındaki 1.744.22'de düğme zaten kapalı olduğu için kullanıcıya etkisi yok.

## Faz 4 — Birleştirme (dağıtım; yayın değil)

| Adım | Ölçüt |
|---|---|
| #362 → main (taslaktan çıkarılır, birleştirilir) | Pages dağıtımı başarılı; site açılıyor, sürüm 1.744.22 |
| #363'ün tabanı main'e döner → birleştirilir | Pages başarılı; `surum.json` hâlâ 1.744.22; başlatıcı 1.744.22 açıyor |

**Dikkat:**
- Bu andan itibaren `erp.newdiamond.com.tr/atolye-erp-v1.744.25.html` adresi açılabilir ve canlıya bağlanır. Duyurulmamış ama erişilebilir.
- 1.744.20 / 1.744.21 siteden kalkar.

**Geri dönüş:**
- Birleştirme commit'ini geri alan bir PR (revert). Pages yeniden dağıtır.
- Canlı veritabanına etkisi yok.

## Faz 5 — Yayın (`surum.json` → 1.744.25)

| Adım | Ölçüt |
|---|---|
| `surum.json` = `{"surum":"1.744.25","url":"atolye-erp-v1.744.25.html","not":"…"}` (ayrı küçük PR) | Pages başarılı |
| Bir cihazda açılış | 1.744.25'e kendiliğinden geçer |
| Giriş, F5'te şifre istenmez, stok / kasa kaydı, gün sonu | Normal |
| Tanımlar › Yedek & Bulut › kurulum dosyasını indir | Dosya iner, "betik eski" uyarısı yok |

**Geri dönüş (önemli):**
- `surum.json` ile ESKİ sürüme dönülemez. Uygulama yalnız yeniye geçer (DEVAM-NOTU kuralı).
- Geri dönüş = 1.744.22'nin kodu **daha büyük bir numarayla** (ör. 1.744.26) derlenip yayınlanır.
- Bunun için `src/`'yi 1.744.22 hâline getiren bir dal hazır tutulur: geçişten önce derlenir, sınanır, beklemede durur.
- Veritabanı tarafı (Faz 1–3) 1.744.22 ile uyumlu. 1.744.22 kurulum düğmesini zaten kapalı tutuyor; 23 ve A6 düzeltmesi onu etkilemiyor. Bu, geri dönüş dalı derlenirken ayrıca sınanır.

## Faz 6 — Geçiş sonrası doğrulama (deneme projesinde, canlıya yazmadan)

1. **Kurulum dosyası:** Canlıdan indirilen kurulum dosyası, **boş** bir deneme projesine kurulur. İki yol var:
   - mevcut deneme projesini silip yenisini açmak;
   - ya da duraklatıp ikinci boş proje açmak.
   - Kota: kullanıcı başına 2 etkin ücretsiz proje; duraklatılmış proje sayılmaz.
   - Beklenen: 18/18, parmak izi canlıyla birebir. Bu, "kaynak canlıyla birebir" maddesini kapatır.
2. **Silme korumaları:** Faz 0.4 envanterindeki `silme_koruma` / `yazma_koruma` tetikleyicileri yeni projede de var.
3. **Yetki sınaması:** `deneme-yetki-sinama.sql` yeni projede çalıştırılır. Beklenen:
   - A6 / A6b UYGUN (Faz 1);
   - E4 / E5 / F3 artık RET (silme_koruma).
4. **Deneme sunucusuyla uygulama akışı:** giriş, stok, kasa.

## Kapsam dışı (ayrı işler)

- **7a aykırılığı:** `api.anthropic.com` kur çağrısının kaldırılması. Ayrı sürüm ve PR; geçişi beklemez, geçişe bağlı da değildir.
- **Eski tabloların rol bazlı RLS'i (BİLİNEN AÇIK satırları):** büyük tasarım işi. Kayıt kapalı kaldıkça risk "listedeki çalışanlar" ile sınırlı.
- **Yeni firmada "ND" logosu:** paket varsayılanı, ayrıca bakılacak.
- **Açılışta kısa "Test Kullanıcısı":** main'de de var.

## Önerilen sıra ve zamanlama

| Zaman | Fazlar |
|---|---|
| Gün 1 | Faz 0 (salt okur) + A6 düzeltmesinin hazırlanıp deneme projesinde sınanması |
| Gün 2, mesai dışı | Faz 1 → Faz 2 → Faz 3. Her biri ayrı onayla; bir faz ölçütünü tutturamazsa o fazın geri dönüşü uygulanır, sonrakine geçilmez |
| Gün 3 | Faz 4 (birleştirme), birkaç saat gözlem → Faz 5 (yayın) |
| Ardından | Faz 6 |
