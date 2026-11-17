# Yeni firma kurulumu (v1.642.0; v2 kurulum dosyası 1.744.23)

> **DURUM (17 Kasım 2026): kurulum yolu v2 için yeniden yazıldı** (dal `claude/yeni-firma-kurulum-v2`, ERP 1.744.23, son derleme 1.744.25 — henüz
> canlıda ve yayında DEĞİL). Kullanmadan önce: yeni `kurulum-betigi.sql` ana projede çalıştırılmış ve 1.744.23 ya da sonrası (bu dalda 1.744.25) yayında olmalı.
> Kabul testleri: `stok-v2/test/guvenlik/t24/` (kurulum, giriş, stok, kasa, iki firma arasında veri ayrımı — ekrandan dahil).

Her müşteri firmanın **ayrı bir Supabase projesi** olur. Uygulama aynıdır. Firma kodu **her cihazda bir kez** sorulur
(ana firma dahil — ana firmanın kodu `nds`); seçilmeden uygulama açılmaz. `?firma=KOD` bağlantısı kodu doldurur.
Bir firmanın verisi ötekine hiçbir yoldan karışmaz.

Bir kerelik hazırlık (ilk müşteriden önce ve `kurulum-betigi.sql` her değiştiğinde): **ana projede** `kurulum-betigi.sql`
dosyasının tamamını Supabase › SQL Editor'da çalıştırın. Kurulum dosyasını üreten üç fonksiyonu kurar (`kurulum_betigi`,
`kurulum_parmak_izi`, `kurulum_metni`). Tekrar çalıştırmak zararsızdır.

## 1. Supabase projesini açın

1. supabase.com › **New project**. Bölge: **Frankfurt (eu-central-1)**. Veritabanı şifresini güvenli bir yere yazın.
2. Proje açılınca **Project Settings › API Keys**:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **Publishable key** (`sb_publishable_…`)

   İkisini not edin. **Secret key'i asla kimseye vermeyin, hiçbir yere yapıştırmayın.**
3. **Authentication › Sign In / Providers › Email**: "Allow new users to sign up" **KAPALI** olmalı.
   Kullanıcıları yalnız yönetici açar.

## 2. Tabloları, kuralları ve yetkileri kurun

1. Ana firmada uygulamayı açın: **Tanımlar › Yedek & Bulut › "Yeni firma kurulum dosyasını indir (.sql)"** (yalnız Yönetici).
   Sunucudaki betik eskiyse dosya inmez, ne yapılacağı yazar.
2. **Yeni projede** SQL Editor › New query › dosyanın **tamamını** yapıştırın › **Run**.
3. En altta 18 satırlık bir tablo çıkar; **hepsi "tamam"** olmalı (sütunlar, görünümler, fonksiyonlar, tetikleyiciler, kurallar,
   yetkiler… ana projeyle birebir; "ayar dışı tablolarda satır: yok").
   - Bir adım düşerse ileti hangi adımda ve neden durduğunu yazar ("KURULUM DURDU — 412. adım (…)"); doğrulama tutmazsa
     "KURULUM DOĞRULAMASI TUTMADI (…)". İki durumda da **hiçbir şey kurulmamış olur** (tek işlem) — iletiyi paylaşın.
   - Dosya yalnız BOŞ projede çalışır; dolu projeye yanlışlıkla yapıştırılırsa hiçbir şeye dokunmadan durur.

Dosya **veri taşımaz**: ana firmanın carisi, ürünü, fişi, kasası, tanımları, e-posta ayarı… hiçbiri dosyaya girmez. Yalnız üç ayar
satırı yazılır: `stk_ayar` (v2 bayrakları — ana projeyle aynı), `degisiklik` ve `kas_ayar` (boş). Numara sayaçları sıfırdan başlar.
Ana projede 23 (yönetim paneli) uygulanmışsa `platform_…` tabloları da BOŞ kurulur; firmanın kendi Yönetici'si onları göremez.

## 3. İlk yöneticiyi açın

1. Yeni projede **Authentication › Users › Add user › Create new user**:
   - E-posta: `<kullaniciadi>@atolye.local` (örn. `ahmet@atolye.local`; Türkçe harf kullanmayın)
   - Şifre: müşterinin belirleyeceği şifre
   - **Auto Confirm User** işaretli
2. SQL Editor'da aşağıdakini, `ahmet` ve `Ahmet Yılmaz` yerine kendi değerlerinizi yazarak çalıştırın:

```sql
insert into public.tanimlar (id, veri) values ('tekil', jsonb_build_object(
  'girisAktifMi', true,
  'kullanicilar', jsonb_build_array(jsonb_build_object(
    'id', 'kullanici-ilk', 'ad', 'Ahmet Yılmaz', 'kullaniciAdi', 'ahmet', 'rol', 'Yönetici',
    'yetkiler', '{}'::jsonb, 'eposta', 'ahmet@atolye.local', 'bulutHesabi', true))))
on conflict (id) do nothing;
```

## 4. Sunucu fonksiyonlarını kurun

Yeni projede **Edge Functions › Create function**, her biri için dosyanın tamamını yapıştırıp **Deploy**:

| Fonksiyon adı | Dosya | Ne işe yarar |
|---|---|---|
| `kur` | `supabase-kur-fonksiyonu.ts` | Döviz kurları |
| `kullanici` | `supabase-kullanici-fonksiyonu.ts` | Uygulamadan kullanıcı açma |

Her dosyanın başındaki KURULUM notunu (ör. "Verify JWT" ayarı) uygulayın. İsteğe bağlı: `eposta` (+ `SMTP_SIFRE` sırrı),
gün sonu raporu (`gun-sonu` fonksiyonu + `GUN_SONU_ANAHTAR` sırrı + `gun-sonu.sql`), web sitesi bildirimi.

**Kurulum dosyasının KAPSAMI DIŞINDA kalanlar** (projede elle): Edge Functions ve gizli değerleri, Auth ayarları (kayıt kapalı),
Storage kovaları ve kuralları (ör. `gorseller` kovası ve `gorsel_yonetici_yazar`), zamanlanmış işler (gün sonu),
`supabase_admin` rolünün varsayılan yetkileri, gece yedeği (firma başına ayrı karar — KVKK).

## 5. Firma kodunu verin

1. Bir kod seçin: küçük harf, rakam ve tire (örn. `ozderi`). Claude'a şunu yazın:
   "firma ekle: kod ozderi, adres https://xxxx.supabase.co, anahtar sb_publishable_…"
   Claude bunu `node firma-ekle.js ozderi https://xxxx.supabase.co sb_publishable_…` ile `firmalar.json`'a ekler ve yayına alır.
   Rehberde kod düz yazılmaz (özeti tutulur); müşteri listesi depodan okunamaz.
2. Müşteriye bağlantıyı gönderin: `https://erp.newdiamond.com.tr/?firma=ozderi`
3. Müşteri bağlantıyı açar, "Bağlan"a basar, 3. adımdaki kullanıcı adı ve şifreyle girer.

Alternatif: rehbere eklemeden, giriş ekranında **Firma: … › Değiştir › Gelişmiş** ile adres ve publishable
anahtar elle girilebilir.

## Kontrol listesi

- [ ] Giriş yapılabiliyor; Tanımlar'da firma satırı doğru kodu gösteriyor
- [ ] Bir ürün ve cari eklenip silinebiliyor (Yönetici)
- [ ] Döviz kurları geliyor (kur fonksiyonu)
- [ ] Tanımlar › Kullanıcılar'dan yeni kullanıcı açılabiliyor (kullanici fonksiyonu)
- [ ] Yönetici olmayan kullanıcı yetkisi olmayan modülde silme yapamıyor
