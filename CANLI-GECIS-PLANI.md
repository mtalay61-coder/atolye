# Canlıya geçiş ve geri dönüş planı — A6 düzeltmesi + 23 + yeni firma kurulumu v2 + 1.744.25 (taslak, 18 Kasım 2026; A6 ve sıra güncellendi)

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

1. **A6 yetki yükseltme açığı — CANLIDA KAPATILDI (20 Kasım; Faz 0 + Faz 1 tamam, `ta6/sonuc-canli-a6-2026-11-20.txt` A6 dalında):**
   - **Açık:** Personel (ya da listede olmayan giriş hesabı) tanımlar satırının kimliğini değiştirebiliyor. Ardından
     `yetki_var_mi` herkese "evet", `yonetici_mi` herkese "hayır" diyor. Kayıt kapalı olsa bile mevcut personel kullanabilir.
   - **Düzeltme:** dal `claude/a6-tanim-kimligi-koruma` (main'den; #362 / #363'e bağlı değil).
     - `stok-v2/guvenlik/24-a6-tanim-kimligi.sql`: oturumlu istekte tanımlar kimliği değişmez (Yönetici dahil).
       `yetki_var_mi`, tanımlar satırı yoksa ya da bozuksa oturumlu hesaba yetki vermez.
     - Önkoşul: `24-a6-onkosul-salt-okur.sql` (HAZIR / UYGULANMIŞ / KARIŞIK / EKSİK).
     - Geri alma: `24-a6-tanim-kimligi-geri-al.sql`.
     - Kaynaklar (`rls-rol.sql`, `rls-yazma.sql`) ve `stok-v2/editor/15-duzeltme.sql` aynı gövdelerle güncellendi.
     - Düzeltme ve geri alma TEK İFADE (DO bloğu): ikinci fonksiyon bilerek bozulunca kısmi değişiklik kalmadı.
   - **Yerel sonuçlar:**
     - `ta6/test-a6.sh` 46/46.
     - Mevcut düzenekler temiz: kos.sh, t19 139/139, f4.
     - API provası (taklit): açıkken 200 + `yetki_var_mi` true; düzeltilince 403. Temizlik bozuk / beklenmedik başarı
       durumlarında da son durum = başlangıç.
   - **Deneme projesi (gerçek Auth, 18 Kasım):** önce AÇIK, sonra AÇIK 0 · BAŞARISIZ 0, API 403, uygulama bozulmadı.
   - **Deneme projesi adımları:** `stok-v2/test/guvenlik/ta6/A6-DENEME.md`. Gerçek Auth hesaplarıyla API sınaması dahil
     (`ta6/api-sinama.js`).
   - **⚠ GERİ ALMA A6 AÇIĞINI YENİDEN AÇAR.** Geri alma dosyası eski gövdeleri birebir kurar; ardından yetkisiz personel yine
     tanımlar kimliğini değiştirip bütün modül yetkilerini kendine açabilir (yerelde ölçüldü: geri almadan sonra A6 yeniden
     AÇIK). Bu yüzden:
     - Geri alma yalnız düzeltme uygulamayı gerçekten bozarsa, kullanıcının açık onayıyla ve geçici olarak uygulanır.
     - Öncelik ileri düzeltmedir (sorunu giderip yeni bir düzeltme).
     - Geri alındıysa, düzeltme yeniden uygulanana kadar personel hesaplarının kapatılması değerlendirilir.
2. **Kayıt kapalı mı (canlı):**
   - Authentication › Email › "Allow new users to sign up" **KAPALI** olmalı.
   - Neden: Deneme projesinde açık geldi. Açıksa adresi bilen herkes hesap açıp F satırlarındaki gibi okur ve yazar.
   - Faz 0'da yalnız GÖZLE bakılır; açıksa kapatmak ayrı onay.
3. **Kaynak ↔ canlı farkı:**
   - Deneme dosyası yerel kopyadan üretildi.
   - Canlıda `rls-yazma.sql`'in silme korumaları (`silme_koruma`: urunler, cariler, siparisler, uretim) var, yerel kaynakta yok.
   - Asıl kurulum dosyası canlıdan üretilecek (Faz 3) ve bu korumaları TAŞIMALI. **Faz 4'te, birleştirme ve yayından ÖNCE** ölçülür.
   - **Yerelde kanıtlandı (20 Kasım, `t24/sonuc-a6-koruma-2026-11-20.txt`):** ana canlı gibi kurulunca (A6 düzeltilmiş +
     `rls-yazma.sql` silme korumaları) kurulum dosyası ikisini de taşıyor; korumasız / A6 öncesi ana ile test kırmızıya düşüyor
     (29 / 47 kırmızı — sahte yeşil yok). Canlıdan üretilen dosya için Faz 4 ölçümü yine gerekli.
   - **Faz 0.4 envanteri (canlı, salt okur, 20 Kasım) — TAMAM** (`t24/sonuc-faz04-envanter-canli-2026-11-20.txt`):
     - `muhasebe`, `faturalar` (ve `gorevler`, `modeller`, öteki listeler) GÖRÜNÜM; doğrudan yazılabilir değil, INSTEAD OF yok.
       `yazma_koruma` canlıda YOK; `eski_*` tabloları da yok.
     - Yazma yetkisi sunucu fonksiyonlarında: `muhasebe` → `kas_yaz` (`stk_yetki(muhasebe|fisler|cari, kaydetme)`; yalnız
       kur serbest), `faturalar` → `lst_yaz` (`stk_yetki(fisler|muhasebe, kaydetme)`). `stk_yetki` → `yetki_var_mi` (A6).
       Altta `kas_hareket` / `kas_hesap` / `lst_kayit`'a authenticated yazamaz.
     - `silme_koruma` ×4, `tanimlar_kullanici_koruma`, `gunluk_silme_koruma`: argüman ve etkinlik (O) canlıyla birebir; ortak
       fonksiyon gövdelerinin md5'i birebir (A6 dahil).
     - Yerel ↔ canlı: `t24/canli-benzeri.sh` (atolye_canli) ile **194 satır eşleşti, 32 satır kapsam dışında** — tam şema eşitliği
       DEĞİL (o, Faz 4'te canlıdan üretilen dosyayla ölçülür). Kapsam dışı
       satırlar: canlıdaki eski / site tabloları (cekler, hesaplar, cop, icerik, medya, onaylar, profil, cek_gorselleri) ve
       `surum_arttir` / `guncelleme_yaz` tetikleyicileri — şeması depoda yok, Faz 4 kapsar.

## Faz 0 — Hazırlık, YALNIZ OKUMA (canlıda yazma yok) — A6 kısmı TAMAM (18 Kasım; 23 önkoşulu 0.2 henüz çalıştırılmadı)

| # | İş | Kim | Ölçüt |
|---|---|---|---|
| 0.1 | Son gece yedeği **sınanmış** mı (OneDrive `AtolyeYedek/<tarih>` klasörü, `-SINANMADI` eki yok) | kullanıcı | Son 24 saatte sınanmış yedek var |
| 0.2 | `23-onkosul-salt-okur.sql` canlıda | kullanıcı | GENEL = **HAZIR** (23 uygulanmamış, uygulanabilir). KARIŞIK / EKSİK → DUR |
| 0.2b | `24-a6-onkosul-salt-okur.sql` canlıda | kullanıcı | GENEL = **HAZIR**. EKSİK: tanımlar verisi hazır değil (girisAktifMi boolean değil / kullanicilar dizi değil / Yönetici yok) → DUR, önce veri düzeltilir; aksi hâlde düzeltme sonrası oturumlu yazmalar durur. KARIŞIK → DUR |
| 0.3 | Canlıdaki kurulum fonksiyonlarının bugünkü tanımını yedekle (salt okur: `select pg_get_functiondef(…)`; sorgu hazırlanacak) | kullanıcı | Çıktı dosyası saklandı (Faz 3 geri dönüşü bunu kullanır) |
| 0.4 | Canlı koruma envanteri (salt okur, `24-faz04-koruma-envanteri-salt-okur.sql`) — **TAMAM 20 Kasım** | kullanıcı | Kaydedildi; yerel `canli-benzeri.sh`: 194 satır eşleşti, 32 satır kapsam dışında (tam şema eşitliği değil) |
| 0.5 | "Allow new users to sign up" durumu | kullanıcı (göz) | KAPALI. Açıksa ayrı onayla kapatılır |
| 0.6 | Canlı bekleyen kayıt / açık işlem yok; atölye mesai dışı | kullanıcı | Uygulamada "bekleyen kayıt" şeridi yok |

**Geri dönüş:** Gerek yok; yazma yapılmadı.

## Faz 1 — A6 düzeltmesi (canlı SQL; 23'ten ÖNCE) — TAMAM (20 Kasım)

> 20 Kasım ~12:00, atölye kapalı, yedek 20 Kasım 10:19 sınanmış. Önkoşul HAZIR → düzeltme Success → UYGULANMIŞ → canlı sınama
> (`24-a6-canli-sinama.sql`) AÇIK 0 · BAŞARISIZ 0 · UYGUN 8 → önce / sonra görüntü birebir → uygulama hatasız. Geri alma uygulanmadı.
> PR mtalay61-coder/atolye#364 hâlâ taslak (birleştirme ayrı onay).

| Adım | Ölçüt |
|---|---|
| ÖN KOŞUL — **TAMAM (18 Kasım, `ta6/sonuc-deneme-a6-2026-11-18.txt`)**: deneme projesinde `ta6/A6-DENEME.md` adımları | Önce: A6 AÇIK (SQL + gerçek API). Sonra: `yetki-sinama.sql` AÇIK 0 · BAŞARISIZ 0; API 403; yönetici tanım değiştirir, F5, stok fişi; personel girişi |
| A6 dalı (`claude/a6-tanim-kimligi-koruma`) incelenip main'e birleştirilir (yalnız SQL / test / belge; uygulama değişmez) | Ayrı onay |
| Canlıda `24-a6-onkosul-salt-okur.sql` | HAZIR |
| Canlıda `24-a6-tanim-kimligi.sql` (mesai dışı, tek Run) | Hatasız |
| Canlıda `24-a6-onkosul-salt-okur.sql` | **UYGULANMIŞ** |
| Canlı uygulamada yönetici girişi + bir tanım değişikliği + bir stok fişi | Kaydedilir, hata yok |

**Geri dönüş: ⚠ A6 AÇIĞINI YENİDEN AÇAR.**
- Dosya: `24-a6-tanim-kimligi-geri-al.sql` → önkoşul HAZIR. Eski gövdeler birebir geri gelir; yetkisiz personel yeniden bütün
  yetkileri kendine açabilir.
- Yalnız düzeltme canlı uygulamayı gerçekten bozarsa ve kullanıcı onaylarsa uygulanır. Ardından hemen ileri düzeltme
  hazırlanır; o süre boyunca personel hesaplarının kapatılması değerlendirilir.
- Uygulama kodu değişmediği için geri dönüş yalnız SQL'dir.

## Faz 2 — 23 platform tabloları (canlı SQL) — PAKET HAZIR, ÖN KONTROLLER TAMAM (20 Kasım), UYGULANMADI

> Paket: `stok-v2/guvenlik/23-FAZ2-PAKET.md`. Önce / sonra kontrol `23-faz2-kontrol-salt-okur.sql` (A6 imzası). Uygulanacak
> `23-platform-yonetim.sql` SHA-256 `ca0509fc7fff45605613ecf60080f901ccb1062c4931e6838847695956dad9f8`. Yerel prova 20/20.
> Uygulama ayrı onay; geri alma AYRICA onay. Faz 4 (canlıdan üretilen kurulum dosyasının boş projede doğrulanması) genel
> yayından önce ZORUNLU kalır.
> Ön kontroller (canlı, 20 Kasım): 23 HAZIR · A6 UYGULANMIŞ · platform_ tabloları yok · A6 imzası özeti `0670954a…`
> (`t23/sonuc-faz2-once-canli-2026-11-20.txt`).

| Adım | Ölçüt |
|---|---|
| ÖNCE: `23-onkosul-salt-okur.sql` · `24-a6-onkosul-salt-okur.sql` · `23-faz2-kontrol-salt-okur.sql` | 23 **HAZIR** · A6 **UYGULANMIŞ** · platform_ tabloları `yok` ×5 · A6 imzası kaydedilir |
| `23-platform-yonetim.sql` canlıda (Editor, tek Run) | Hatasız |
| SONRA: `23-onkosul-salt-okur.sql` | GENEL = **UYGULANMIŞ**, fark yok, yönetici 0, kayıtlar 0/0/0 |
| SONRA: `23-faz2-kontrol-salt-okur.sql` | Tablolar 0 ×5 · A6 **UYGULANMIŞ** · A6 imzası ÖNCE ile **birebir** |

**Geri dönüş (AYRI ONAY):**
- `23-platform-yonetim-geri-al.sql`: firma / sözleşme / ödeme kaydı varsa **DURUR**, hiçbir şey silinmez.
- Üçü boşsa beş tablo içerikleriyle kalkar: **yönetici listesi ve olay günlüğü de silinir** (günlük firmaya bağlı; firma yoksa boş).
- Ardından 23 önkoşulu = HAZIR; A6 imzası değişmez (yerelde ölçüldü).

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

## Faz 4 — Canlıdan üretilen kurulum dosyasının boş projede doğrulanması (BİRLEŞTİRME VE YAYINDAN ÖNCE)

Yeni yer (18 Kasım kararı): genel yayından önce, canlıya yalnız Faz 1–3'ün SQL'i uygulanmışken.

| Adım | Ölçüt |
|---|---|
| Canlıda (SQL Editor) `select public.kurulum_betigi();` → çıktının tamamı bir `.sql` dosyasına. Uygulama düğmesi 1.744.22'de kapalı; dosya Editor'den alınır. Salt okur bir üretici; yazma yok | Dosya başlığı "YENİ FİRMA KURULUM DOSYASI (v2)"; gizli değer araması 0 |
| Dosya önce yerelde yalıtılmış boş veritabanında (Claude): editor-icin.py, 18/18, pg_dump, dolu veritabanında durma | Hepsi geçer |
| **Boş** bir deneme projesi: mevcut deneme projesini silip yenisi ya da duraklatıp ikincisi. Kota: kullanıcı başına 2 etkin ücretsiz proje, duraklatılmış sayılmaz. "Allow new users to sign up" KAPALI | Proje boş |
| Dosya SQL Editor'de tek Run | 18/18; parmak izi (`collate "C"`) canlıyla birebir. "Kaynak canlıyla birebir" maddesi kapanır |
| Faz 0.4 envanteri: `silme_koruma` ×4 / `tanimlar_kullanici_koruma` yeni projede (`yazma_koruma` yalnız canlıda varsa) | Canlıyla birebir |
| `24-a6-onkosul-salt-okur.sql` yeni projede | UYGULANMIŞ (düzeltme canlıdan kopyalandı) |
| İlk yönetici + personel + `ta6/yetki-sinama.sql` | AÇIK 0 · BAŞARISIZ 0; E4 / E5 / F3 artık RET (silme_koruma) |
| Deneme sunucusuyla uygulama akışı (1.744.25): giriş, F5, stok, kasa | Normal |

**Geri dönüş:** Gerek yok; canlıya yazılmaz. Ölçüt tutmazsa Faz 5 / 6'ya geçilmez. Fark bir canlı SQL'inden geliyorsa o fazın
geri dönüşü değerlendirilir (Faz 1'in geri dönüşü açığı yeniden açar, yukarıdaki uyarı).

## Faz 5 — Birleştirme (dağıtım; yayın değil)

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

## Faz 6 — Yayın (`surum.json` → 1.744.25)

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

## Kapsam dışı (ayrı işler)

- **7a aykırılığı:** `api.anthropic.com` kur çağrısının kaldırılması. Ayrı sürüm ve PR; geçişi beklemez, geçişe bağlı da değildir.
- **Eski tabloların rol bazlı RLS'i (BİLİNEN AÇIK satırları):** büyük tasarım işi. Kayıt kapalı kaldıkça risk "listedeki çalışanlar" ile sınırlı.
- **Yeni firmada "ND" logosu:** paket varsayılanı, ayrıca bakılacak.
- **Açılışta kısa "Test Kullanıcısı":** main'de de var.

## Önerilen sıra ve zamanlama

| Zaman | Fazlar |
|---|---|
| 18 Kasım — TAMAM | A6 düzeltmesi deneme projesinde önce / sonra sınandı: önce açık (gerçek jeton 200 + yetki true), sonra kapalı (403), uygulama bozulmadı |
| Sonra (ayrı onaylar) | Faz 0 (salt okur) |
| Mesai dışı | Faz 1 (A6) → gözlem → Faz 2 (23) → Faz 3 (kurulum betiği). Her biri ayrı onayla; ölçüt tutmazsa o fazın geri dönüşü değerlendirilir, sonrakine geçilmez |
| Ardından | Faz 4 (canlıdan üretilen dosya, boş projede) — tamamı geçmeden birleştirme ve yayın yok |
| Sonra | Faz 5 (birleştirme), birkaç saat gözlem → Faz 6 (yayın) |
