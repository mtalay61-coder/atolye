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

## 9. Açık sorular (kullanıcı)

1. Platform yöneticisi yalnız siz mi (hangi kullanıcı)?
2. Ücret para birimi: TL mi, USD mi, ikisi de mi?
3. Firma kartında başka alan (adres, sektör, cihaz / kullanıcı sayısı) gerekli mi?
4. Aşama 1 yalnız **takip** (önerilen) — lisans bitince firmanın ERP'sinde bir şey olmasın; doğru mu?
