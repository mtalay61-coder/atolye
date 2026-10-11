# Yeni firma kurulumu (v1.642.0)

Her müşteri firmanın **ayrı bir Supabase projesi** olur. Uygulama aynıdır. Firma, girişte "Firma kodu" ya da
`?firma=KOD` bağlantısıyla seçilir. Bir firmanın verisi ötekine hiçbir yoldan karışmaz.

Bir kerelik hazırlık (yalnız ilk müşteride): **ana projede** `kurulum-betigi.sql` dosyasını Supabase › SQL Editor'da
bir kez çalıştırın. Bu, kurulum dosyasını üreten fonksiyonu kurar.

## 1. Supabase projesini açın

1. supabase.com › **New project**. Bölge: **Frankfurt (eu-central-1)**. Veritabanı şifresini güvenli bir yere yazın.
2. Proje açılınca **Project Settings › API Keys**:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **Publishable key** (`sb_publishable_…`)

   İkisini not edin. **Secret key'i asla kimseye vermeyin, hiçbir yere yapıştırmayın.**
3. **Authentication › Sign In / Providers › Email**: "Allow new users to sign up" **KAPALI** olmalı.
   Kullanıcıları yalnız yönetici açar.

## 2. Tabloları ve kuralları kurun

1. Ana firmada uygulamayı açın: **Tanımlar › Yedek & Bulut › "Yeni firma kurulum dosyasını indir (.sql)"**.
   Yalnız Yönetici indirebilir. Dosya veri içermez, yalnız tablo, kural, tetikleyici ve yetkileri taşır.
2. **Yeni projede** SQL Editor › New query › dosyanın tamamını yapıştırın › **Run**.
   "Success" görmelisiniz. Hata çıkarsa hiçbir şey değişmez (tek işlem), ekran görüntüsünü gönderin.

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

Her dosyanın başındaki KURULUM notunu (ör. "Verify JWT" ayarı) uygulayın. `eposta` fonksiyonu isteğe bağlıdır.

## 5. Firma kodunu verin

1. Bir kod seçin: küçük harf, rakam ve tire (örn. `ozderi`). Claude'a şunu yazın:
   "firma ekle: kod ozderi, adres https://xxxx.supabase.co, anahtar sb_publishable_…"
   Claude bunu `node firma-ekle.js ozderi https://xxxx.supabase.co sb_publishable_…` ile `firmalar.json`'a ekler ve yayına alır.
   Rehberde kod düz yazılmaz (özeti tutulur); müşteri listesi depodan okunamaz.
2. Müşteriye bağlantıyı gönderin: `https://mtalay61-coder.github.io/atolye/?firma=ozderi`
3. Müşteri bağlantıyı açar, "Bağlan"a basar, 3. adımdaki kullanıcı adı ve şifreyle girer.

Alternatif: rehbere eklemeden, giriş ekranında **Firma: … › Değiştir › Gelişmiş** ile adres ve publishable
anahtar elle girilebilir.

## Kontrol listesi

- [ ] Giriş yapılabiliyor; Tanımlar'da firma satırı doğru kodu gösteriyor
- [ ] Bir ürün ve cari eklenip silinebiliyor (Yönetici)
- [ ] Döviz kurları geliyor (kur fonksiyonu)
- [ ] Tanımlar › Kullanıcılar'dan yeni kullanıcı açılabiliyor (kullanici fonksiyonu)
- [ ] Yönetici olmayan kullanıcı yetkisi olmayan modülde silme yapamıyor
