# Güvenlik sıkılaştırması — madde 4 + 5 (HAZIRLIK; canlıya uygulanmadı)

Kullanıcı onayı (3 Kasım): yalnız hazırlık ve yerel test. Canlı veritabanına uygulama YOK. Fiş kuralları (19), sürüm kapısı
(`min_istemci_surum`) ve sızmış parola denetimi bu işin kapsamında değil, ayrı onay bekler.

| Dosya | Ne |
|---|---|
| `1-liste-salt-okur.sql` | Canlıda çalıştırılacak SALT-OKUR liste. Üç bölüm, Editor'da ayrı ayrı (bölümü seç → "Run selected"), her sonuç CSV. |
| `liste-uret.js` | Bölüm 1 + 2 CSV'lerinden `2-sikilastir.sql`'in KAPANACAK ve YOL listelerini yazar. Bölüm 2'de satır varsa DURUR. |
| `2-sikilastir.sql` | Sıkılaştırma. Listeler şimdilik TASLAK (yerel). Canlı listelerle birebir uyuşmazsa hiçbir şey değiştirmeden durur. |
| `3-geri-al.sql` | `guvenlik.yedek`'ten birebir geri kurar ve sonucu yedekle karşılaştırır. |
| `bolum.py` | Liste dosyasından tek bölümü ayıklar (yerel koşucu için). |
| `../test/guvenlik/kos-guvenlik.sh` | Yerel sınama (aşağıda). |

## Girişsiz akışlar (açık kalacaklar)

- **Site (newdiamond-web: `site.js`, `musteri.html`)** yalnız şu 8 fonksiyonu çağırır (hepsi `site-portal.sql`, SECURITY DEFINER,
  `search_path` sabit): `herkese_acik_vitrin()`, `site_ayarlari()`, `site_kayit_ol(jsonb,text,text)`, `portal_giris(text,text)`,
  `portal(text)`, `portal_hesap(text,date,date)`, `portal_siparis(text,jsonb,text,jsonb)`, `portal_cikis(text)`.
- **ERP giriş öncesi:** yalnız `surum` tablosu okunur (fonksiyon değil, `rls-kimlik.sql` § 4). Giriş Supabase Auth'tan (fonksiyon değil).
- **Sunucu fonksiyonları (Edge):** service_role ile çalışır; service_role'ün yetkileri DEĞİŞMEZ (sıkılaştırma bugünkü durumu açıkça korur).

## Kararlar

- anon'dan VE PUBLIC'ten alınır. Supabase'te anon'un yetkisi çoğunlukla PUBLIC'ten gelir (`rls-kimlik.sql` anon'un açık yetkisini
  zaten alıyor); yalnız anon'dan almak etkisizdi. PUBLIC alınmadan önce authenticated ve service_role'e bugünkü durumları açıkça verilir.
- Tetikleyici fonksiyonları da kapanır: tablo yazımında çalışmaları yetki denetlemez (yerelde sınandı), yalnız doğrudan çağrı kapanır.
- `search_path = public, extensions, pg_temp`: PostgREST'in bugün kullandığı yol (public, extensions) — davranış aynı; geçici şema
  en sonda. Şemasız yazılmış ve public / pg_catalog dışında bulunan adlar Bölüm 2'de listelenir; varsa o fonksiyon elle incelenir.
- Yeni fonksiyonlar: bu rolün public varsayılan yetkilerinden anon çıkarılır. PUBLIC'in genel varsayılanına dokunulmaz (yeni
  fonksiyon giriş yapmış kullanıcıya kapanmasın). Not: `site-portal.sql` ya da Editor dosyaları YENİ fonksiyon eklerse onlar
  PUBLIC üzerinden anon'a açık doğar — yeniden listelemek gerekir (ileride `rls-kimlik.sql`'e taşınabilir; ayrı karar).
- Yedek `guvenlik` şemasında (API'de görünmez; `rls-kimlik.sql` public'teki tabloları authenticated'a açtığı için public'e konmadı).

## Akış (canlı — ayrı onaylarla)

1. Kullanıcı `1-liste-salt-okur.sql`'in üç bölümünü çalıştırır, CSV'leri iletir.
2. `node liste-uret.js bolum1.csv bolum2.csv 2-sikilastir.sql` → listeler kesinleşir; Bölüm 3 (varsayılan yetkiler, auth/storage
   tetikleyicileri, politikalar) elle incelenir. Yerel sınama canlı listelerle yeniden koşulur.
3. Kullanıcı ayrı onayla `2-sikilastir.sql`'i çalıştırır; sorun olursa `3-geri-al.sql`.

## Yan bulgu (yetkiyle ilgisiz, kapsam dışı — düzeltilmedi)

`portal_hesap` (müşteri portalı hesap ekstresi) `cari_hareketleri.tarih`'i gün türüyle karşılaştırıyor (`h.tarih < bas`); cari v2'den
(1.727) beri bu alan METİN → yerelde `42883 operator does not exist: text < date`. Canlıda müşteri hesap sayfası çalışmıyor olabilir.

## Yan bulgu 2 — rls-kimlik.sql site fonksiyonlarını girişsiz kullanıcıya kapatıyor (canlıda kontrol edilmeli)

`rls-kimlik.sql` § 2 `revoke all on all functions in schema public from anon` sitenin 8 fonksiyonunu da kapatıyor; yeniden açan yalnız
`site-portal.sql`. 1.744.4 geçişinde son adım `rls-kimlik.sql` idi → canlıda vitrin, müşteri girişi ve kayıt şu an kapalı olabilir
(site 401/403 alır). Yerelde ölçüldü: `rls-kimlik.sql` yeniden çalışınca 8 site fonksiyonunun hepsi anon'a kapanıyor, `site-portal.sql`
çalışınca açılıyor. Canlı Bölüm 1'de bu 8 satırda `anon_calistirir` = false ise doğrulanmış olur. Kalıcı çözüm önerisi (ayrı karar):
`rls-kimlik.sql`'de anon'dan alma işleminden sonra 8 site fonksiyonunun yetkisini (varsa) yeniden vermek.

## Yan bulgu 3 — kaynak dosyası yeniden çalışınca sabitlenen search_path sıfırlanır

`create or replace function` yetkileri KORUR ama ayarları (search_path) tanımdakiyle DEĞİŞTİRİR. Sıkılaştırmadan sonra
`site-portal.sql` ya da bir Editor dosyası (ör. 18) yeniden çalışırsa, tanımında `set search_path` olmayan fonksiyonların yolu
yeniden boşalır (yerelde ölçüldü: `site_pb(text)`). Yetkiler etkilenmez. Kalıcı çözüm: YOL listesindeki fonksiyonların KAYNAK
tanımlarına `set search_path = public, extensions, pg_temp` eklemek — canlı uygulama onayıyla birlikte yapılmalı (kaynak dosyalar
yeniden çalıştırıldığında sıkılaştırmanın bir kısmını onaysız uygulamasın diye şimdi yapılmadı).

## Yerel sınama sonucu (3 Kasım) — `stok-v2/test/guvenlik/sonuc-yerel.txt`

`PGHOST=localhost bash stok-v2/test/guvenlik/kos-guvenlik.sh` → **GÜVENLİK SINAMASI TEMİZ**, çıkış 0:
- Canlı benzeri kurulum (Supabase varsayılan yetkileri kurulumdan ÖNCE; depodaki revoke'lar sonra; rls-kimlik → site-portal):
  anon 28 fonksiyon çalıştırabiliyor (8 site + 20), search_path'i boş 19 fonksiyon. Bölüm 2: şemasız ad yok; deneme fonksiyonuyla
  (extensions'taki gen_salt) yakaladığı ve liste-uret.js'in durduğu sınandı. Depodaki TASLAK listeler bu kurulumla aynı.
- KİLİT: listeden bir ad eksikken durdu, hiçbir yetki değişmedi.
- Sıkılaştırma (Editor gibi): 20 fonksiyon anon'a kapandı, 19 yol sabit. Davranış bataryası (97 fonksiyon × 3 rol): veli 0 fark,
  ali (Yönetici) 0 fark, anon yalnız kapananlarda 42501; anon'a açık kalan tam olarak 8 site fonksiyonu.
- Vitrin / site / giriş akışı (21 adım) önce ve sonra temiz: vitrin, ayarlar, kayıt ol → yönetici onayı → giriş (doğru / yanlış şifre)
  → müşteri sayfası → hesap → sipariş → çıkış; girişsiz ERP'ye (fis_kes, cariler, yonetici_mi) kapalı, `surum` okuması açık.
- Regresyon (sıkılaştırılmış veritabanında): F0, finans (9), F4 (4), F3 (2), F8 (2), düzeltme (4), F2 — hepsi geçti.
- İkinci uygulama zararsız; geri alma → yetki / ayar özeti ilk hâlle birebir (98 satır), batarya önceyle aynı; ikinci geri alma
  "yapılacak bir şey yok"; geri almadan sonra yeniden sıkılaştırma ilk sonuçla aynı.
