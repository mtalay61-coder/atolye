# Yönetim paneli — tasarım (17 Kasım 2026)

Durum: **TASARIM — kod yok, SQL yok.** Onaylanınca aşama aşama yapılır; her aşama ayrı sürüm, ayrı onay.

## Kararlar (kullanıcı, 17 Kasım)

- Şimdilik **Supabase ücretsiz plan**.
- **Deneme firmaları kendi Supabase hesaplarında** proje açar (biz kurarız). Firma oturunca proje **bizim ücretli
  organizasyonumuza** alınır.
- Firmaları, yıllık ücretleri ve ödemeleri takip edecek **yönetim ekranı** yapılacak.
- Mimari değişmez: her firmanın ayrı veritabanı, tek uygulama, tek güncelleme (v1.642 firma kodu yapısı).

## 1. Panel nerede duracak

**ERP'nin içinde, yalnız ana firmada (nds) ve yalnız platform yöneticisi hesabında görünen bir "Yönetim" bölümü.**
Verisi ana projede (nds), ayrı tablolarda.

Neden ayrı proje / ayrı sayfa değil:
- Ücretsiz planda hesap başına 2 aktif proje sınırı var; biri ana firma. Panele ayrı proje açmak tek boş yeri harcar.
  Deneme firmaları kendi hesaplarında olduğu için bizim sınırımıza sayılmaz.
- ERP içinde olunca giriş, yetki, yayın, test ve gece yedeği hazır gelir: panel verisi her gece ana projeyle birlikte
  yedeklenir ve sınanır.
- Başka firmaların ERP'si kendi veritabanına bağlanır; orada bu tablolar yoktur, bölüm hiç görünmez.

Sonra (ücretli plana geçince) istenirse ayrı projeye taşınabilir; tablo yapısı aynı kalır.

## 2. Güvenlik

- Tablolar `platform_` önekli. **RLS açık; okuma ve yazma yalnız `platform_yonetici_mi()` doğruysa.** Bu fonksiyon
  giriş yapan kullanıcının kimliğini (`auth.uid()`) `platform_yoneticileri` tablosunda arar.
- `platform_yoneticileri` tablosuna uygulamadan **kimse yazamaz** (ne anon ne authenticated); yalnız SQL Editor'den.
  Ana firmadaki Yönetici rolü bile kendini platform yöneticisi yapamaz.
- `anon` hiçbir `platform_` tablosunu göremez.
- Arayüzde gizlemek güvenlik sayılmaz; koruma veritabanında. Test: platform yöneticisi olmayan, ana firmanın Yönetici
  rolündeki bir hesap bile 0 satır görür, yazamaz.
- Panel **Supabase gizli anahtarı, veritabanı parolası, GitHub anahtarı tutmaz.** Yalnız iş bilgisi (firma, sözleşme,
  ödeme) ve firmanın **açık** proje adresi.

## 3. Veri

| Tablo | Alanlar |
|---|---|
| `platform_yoneticileri` | kullanıcı kimliği, ad, eklenme |
| `platform_firmalar` | kimlik, firma kodu, unvan, durum (**deneme / aktif / askıda / ayrıldı**), barındırma (**firmanın hesabı / bizim organizasyon**), Supabase proje adresi, yetkili adı, telefon, e-posta, vergi dairesi / no, not, oluşturma |
| `platform_sozlesmeler` | firma, başlangıç, bitiş, yıllık ücret, para birimi, durum (taslak / geçerli / bitti), not |
| `platform_odemeler` | firma, sözleşme, tarih, tutar, para birimi, yöntem, not |
| `platform_olaylar` | firma, tarih, tür (oluşturuldu, sözleşme, ödeme, durum değişti, taşındı…), açıklama, kim — silinmez günlük |

Silme yerine durum: firma "ayrıldı", sözleşme "bitti" olur; ödeme kaydı silinmez, ters kayıtla düzeltilir (ERP'nin
fişsiz hareket olmaz kuralıyla aynı ruh).

## 4. Ekranlar (Aşama 1)

1. **Firmalar** — liste: unvan, kod, durum, barındırma, sözleşme bitişi, **kalan gün**, yıllık ücret, **açık bakiye**.
   Süzgeç: deneme / aktif / 30 gün içinde bitecek / borçlu.
2. **Firma kartı** — bilgiler; sözleşmeler; ödemeler; olaylar. Bağlantı satırı: `?firma=KOD` bağlantısı ve
   "rehberde var mı" (kodun özetini `firmalar.json`'da arar; yazmaz).
3. **Yaklaşan yenilemeler** — 30 / 60 gün içinde bitecek sözleşmeler.
4. **Özet** — yıllık sözleşme toplamı, bu yıl tahsil edilen, açık bakiye (para birimi başına; kur çevrimi yok).

## 5. Deneme firması akışı

1. Firma kendi Supabase hesabında **ücretsiz proje** açar (Frankfurt) ve bizi organizasyonuna **üye** olarak davet eder
   (kurulum SQL'ini ve fonksiyonları biz kuralım diye).
2. Biz `yeni-firma-kurulum.md`'yi uygularız; `firmalar.json`'a kodu ekleriz.
3. Panelde firma **deneme / firmanın hesabı** olarak açılır.

Deneme süresince bilinen sınırlar (firmaya söylenir):
- Ücretsiz projede **Supabase yedeği yok**; bir hafta kullanılmayan proje durdurulur (günlük kullanımda olmaz).
- Firmanın **gece yedeği yok** (bizim gece yedeğimiz yalnız ana projeyi alır; firma verisini OneDrive'ımıza almak
  KVKK kararı ister — ayrı konu).

## 6. Bizim organizasyona alma (deneme → ücretli)

Supabase projeyi organizasyonlar arasında **taşıma** destekler (proje ayarları › transfer). Taşımada adres ve anahtar
değişmez → `firmalar.json`, ERP ve firmanın cihazları değişmez. Koşul: taşımayı yapan iki organizasyonda da sahip
olmalı (firma bizi geçici olarak sahip yapar). Taşıma anında koşullar (plan, bölge, eklentiler) Supabase'in o günkü
belgesinden doğrulanır. Panelde: barındırma "bizim organizasyon", olaylara "taşındı".

## 7. Aşama 1'in DIŞINDA (sonra, ayrı onay)

- Firmanın ERP'sinde lisans **uyarısı / kısıtlama** (lisans bilgisinin firmanın veritabanına yazılması gerekir).
- Firmaların **teknik durumu** (son yedek, uygulanan SQL'ler, son gün sonu gönderimi).
- "Firma kur / güncelle" GitHub işi (fonksiyon kodlarını projelere yükleme) ve mail şifresinin uygulamadan girilmesi.
- Fatura kesme / e-fatura.

## 8. Yapım sırası ve test

1. **SQL** (`platform-yonetim.sql`): tablolar, `platform_yonetici_mi()`, RLS, yetkiler; geri alma dosyası; salt-okur
   önkoşul. Yerel testte: platform yöneticisi okur/yazar; ana firmanın Yönetici rolü 0 satır görür, yazamaz; anon hiç
   göremez; `platform_yoneticileri`ne uygulamadan yazılamaz; ödeme silinemez.
2. Canlıya uygulama — **kullanıcı**, SQL Editor (ana proje), önkoşul → uygula → önkoşul; ardından kendi hesabını
   `platform_yoneticileri`ne ekleyen tek satırlık SQL.
3. **ERP sürümü**: "Yönetim" bölümü (yalnız `platform_yonetici_mi()` doğruysa görünür; tablo yoksa — başka firmalarda —
   sessizce gizli). Senaryo testleri + tam `test/kosu.sh`.
4. Yayın: ayrı onay. SQL önce, ERP sonra (sürüm, SQL olmadan da güvenle açılır: bölüm görünmez).

## 9. Cevaplanan sorular (kullanıcı, 17 Kasım)

1. Platform yöneticisi şimdilik **yalnız kullanıcı** (kendi ERP hesabı; SQL Editor'de e-postasıyla eklenir).
2. Ücret **TL ve USD** — her sözleşme / ödeme kendi para biriminde; toplamlar para birimi başına, kur çevrimi yok.
3. **Ek alanlar olabilir** → firma kartında adres, il, sektör, kullanıcı sayısı, web adresi + serbest `ek` alanı
   (sonradan istenen alan için tablo değişikliği gerekmesin).
4. Aşama 1 **yalnız takip** — lisans bitince firmanın ERP'sinde hiçbir şey olmaz.

## 10. Uygulama ayrıntıları (Aşama 1, SQL)

- Dosyalar: `stok-v2/guvenlik/23-platform-yonetim.sql` (uygula), `23-platform-yonetim-geri-al.sql`,
  `23-onkosul-salt-okur.sql`; test `stok-v2/test/guvenlik/t23/test23.sh`.
- Tablolar `public`'te: gece yedeği yalnız `public`i döker ve sınar — ayrı şema yedeğin DIŞINDA kalırdı.
- `kurulum_betigi()` public'teki her tabloyu yeni firma kurulum dosyasına koyar: yeni firmalarda bu tablolar **boş** doğar
  ve `platform_yoneticileri` boş olduğu için kimse göremez. Zararsız; istenirse ayrı bir değişiklikle hariç tutulur.
- Olay günlüğünü uygulama yazmaz; tetikleyiciler yazar (firma açıldı, durum / barındırma değişti, sözleşme eklendi /
  değişti, ödeme). Uygulama günlüğe yalnız bakar.
- Silme yok: hiçbir rolün DELETE yetkisi yok. Ödeme değiştirilmez; düzeltme, eksi tutarlı ve düzelttiği ödemeyi gösteren
  yeni bir ödemeyle yapılır.
- Uygula dosyası tek işlem (do bloğu); nesnelerden biri bile varsa dokunmadan durur. Geri alma, firma / sözleşme / ödeme
  kaydı varsa durur (veri silmez).

## 11. Aşama 1 / SQL — hazır, canlıya UYGULANMADI (17 Kasım inceleme düzeltmeleriyle)

| Dosya | Satır | sha256 |
|---|---|---|
| `stok-v2/guvenlik/23-platform-yonetim.sql` | 250 | `ca0509fc7fff45605613ecf60080f901ccb1062c4931e6838847695956dad9f8` |
| `stok-v2/guvenlik/23-platform-yonetim-geri-al.sql` | 35 | `56920c7f4ed1eeaab3babb6d580532f6e52c0b1f06db9896d5b539b5f9b5f528` |
| `stok-v2/guvenlik/23-onkosul-salt-okur.sql` | 111 | `c81acb8ef1d8b2c73d666d8294ae38db3e15d18c71145f54db64f09ea9347285` |

### İnceleme bulguları (17 Kasım, 0a15166 üzerine) ve düzeltmeler — dördü de yerelde yeniden üretildi

| Bulgu | Yeniden üretim (0a15166) | Düzeltme |
|---|---|---|
| 1. Ödemesi olan sözleşmenin para birimi değiştirilebiliyordu | TRY ödemeli sözleşme USD yapıldı | `platform_sozlesme_denetle` (BEFORE UPDATE): ödemesi varken para birimi değişmez; ücret / tarih / durum değişebilir |
| 2. Düzeltme ödemesi başka sözleşmeye bağlanabiliyordu | A'nın ödemesi B'de düzeltildi: A net +50, B net −50 | `platform_odeme_denetle`: düzeltme, düzelttiği ödemeyle aynı firma, **sözleşme** ve para biriminde (sözleşmesiz de olamaz) |
| 3. "UYGULANMIŞ" yalnız sayıyordu | okuma kuralı `true` + ödemeye UPDATE → yine UYGULANMIŞ | önkoşul tek select; politikalar (USING / WITH CHECK dahil), anon + authenticated için 7 tablo yetkisi (sütun düzeyi ve PUBLIC'ten gelen dahil), fonksiyon gövdesi / definer / ayar / sahip / çalıştıran, tetikleyiciler, RLS **birebir**; fark adıyla yazılır |
| 4. Yeni firma kurulumu sınanmıyordu | — | `t23/test23-yeni-firma.sh` (iki yalıtılmış proje) — aşağıda; **kurulum yolu bugün bozuk** (23'ten bağımsız) |
| (ek) Eşzamanlılık | 0a15166'da iki işlem birbirini görmeden geçti: sözleşme USD, TRY ödeme kaldı | ödeme denetimi sözleşme satırını `for share` kilitler: biri öbürünü bekler, sonra reddeder |

### Testler

- `t23/test23.sh` — **126/126** (`sonuc-t23.txt`). Yeni: bulgu 1 ve 2 (5 denetim); önkoşul bozma denemeleri 10 × (GENEL KARIŞIK +
  farkın adı + onarınca UYGULANMIŞ): okuma kuralı `true`, okuma kuralı anon'a, ödemeye tablo UPDATE, ödemeye **sütun** UPDATE,
  PUBLIC'e DELETE, günlüğe TRUNCATE, kapı fonksiyonu `select true`, kapı fonksiyonu anon'a, ödeme denetimi tetikleyicisi kapalı,
  RLS kapalı; eşzamanlılık iki sıra (ödeme önce / para birimi önce: ikinci işlem ≥ 1,5 sn bekler, reddeder, son hâl tutarlı).
- Aynı test **düzeltmeden önceki SQL'le (0a15166): 29 kırmızı** (`sonuc-t23-once-0a15166.txt`) — bulgu 1, 2, 3 ve eşzamanlılık.
  Yalnız `for share` kaldırılınca: eşzamanlılık 8 denetim kırmızı ve önkoşul gövde farkını yakalıyor.
- `t23/test23-yeni-firma.sh` — **10 geçti, 3 kaldı, 4 atlandı** (`sonuc-t23-yeni-firma.txt`). Geçen: kurulum dosyası veri taşımıyor
  (platform firması, kod, proje adresi, sözleşme ücreti, ödeme tutarı, platform yöneticisi kimliği, ananın carisi dosyada yok;
  üst düzey insert / copy yok), platform_ yapısı (5 tablo) taşınıyor. Kalan (23'ten BAĞIMSIZ, bilinen):
  - Kurulum dosyası Supabase SQL Editor uyumsuz (adlı / iç içe dolar tırnağı) — rehber "SQL Editor › Run" diyor.
  - Boş projede 748. satırda düşüyor: `function public.stk_dizi(jsonb) does not exist` (fonksiyonlar bağımlılık sırasıyla değil
    alfabetik). Uygulamada düğme v2'den beri bilerek kapalı (`src/032-firma.jsx`); DEVAM-NOTU: "kurulum betiği v2 için yeniden
    yazılmalı". Kurulum düşünce firma içi denetimler (önkoşul, boş platform tabloları, firma Yönetici'sinin erişimi, veri ayrımı)
    ATLANIR — sahte yeşil yok. Test, kurulum yolu yeniden yazıldığında KABUL TESTİDİR.
- Tanı (`T23_KURULUM=pgdump`, `sonuc-t23-yeni-firma-pgdump-tani.txt`): ananın yapısı pg_dump ile kopyalanınca kurulum iki projede
  çalıştı, platform tabloları boş, firma Yönetici'si platform yöneticisi değil, veri ayrımı 5/5. Ama boş projenin "yeni tablo
  herkese açık" varsayılanı yüzünden platform tablolarında anon / authenticated'a **fazla yetki** kaldı — 23 önkoşulu adıyla
  yakaladı (KARIŞIK), yazmayı RLS durdurdu. Ders: yeni kurulum yolu yetkileri birebir kurmalı; 23 önkoşulu bunun ölçüsü olabilir.
- Sınanamayan: bir firmanın oturum jetonunun öbür projede geçersiz olması (Supabase'in proje başına JWT anahtarı; yerel taklit
  imza denetlemez).

Sıradaki (ayrı onay): canlıda salt-okur önkoşul → uygula → önkoşul → kendi hesabını ekleme (kullanıcı, SQL Editor). Sonra ERP
"Yönetim" bölümü. Yeni firma kurulum yolunun v2 için yeniden yazılması AYRI bir iş (firma eklemeden önce gerekli).
