# Deneme projesi — 0. adım sonuçları (salt okur; kullanıcı SQL Editor'de çalıştırdı, 26 Kasım)

Proje: `drtmnovafswzcmpacubl` (kullanıcı adres çubuğunda doğruladı). Hiçbir şey yazılmadı.

## Önkoşul (`25-onkosul-salt-okur.sql`)
1 yedek yok · 2–4 car_yaz / fis_kes / fis_iptal "eski (G-25 öncesi, beklenen)" · 5 A6 UYGULANMIŞ · 6 G-25 nesneleri 0 ·
7 **kurallar AÇIK** · min_istemci_surum boş · 8 kullanıcılar 1 · 0 · 0 · 0 · 1 · **GENEL HAZIR**.

## Durum (`25-deneme/durum-salt-okur.sql`)
1 postgres · postgres · 2 surum tablosu yok · 3 giriş açık (true) · 4 kullanıcı 2 (Yönetici 1, cari/muhasebe 0, üretim 0) ·
5 kimliksiz 0 · 6 auth hesabı 3 · 7 bölüm 0 / personel 0 / maaşlı 0 · 8 cari: yalnız 1 Müşteri · 9 proses ücretli ürün 0 ·
10 üretim 0 · 11 fiş 3 (iptal 0, son 2026-11-18) · 12 kurallar AÇIK · 13 G-25 nesneleri yok.

## Değerlendirme
- Paket uygulanabilir (HAZIR). Deneme projesinde fiş kuralları AÇIK (yerel sınamaların çoğu kapalıydı) → yerelde kurallar AÇIK iken
  yeniden ölçüldü: matris 271 / 271 (A7: fiş dışı car_yaz kurallar açıkken herkese kapalı — fiş kuralı, G-25'ten bağımsız; beklenti
  kurala bağlandı), ekran akışı 33 / 33 (`sonuc-matris-sonra-kurallar-acik.txt`, `test/ekran/sonuc-ekran-g25-akis-kurallar-acik.txt`).
- Deneme projesi neredeyse boş: Muhasebe / Üretim / Şef kullanıcısı, Personel carisi, bölüm, proses ücretli ürün, üretim YOK.
  Kontrol listesi için bunların açılması gerekir — deneme projesine YAZMA; ayrı onay.

# 1. adım — G-25 UYGULANDI (deneme projesi, kullanıcı SQL Editor'de, 25 Kasım)

Dosyalar kullanıcının bilgisayarında SHA-256 ile doğrulandı (dördü `SABIT.md` ile birebir; commit 2a9295e).
- `25-cari-yetki-uygula.sql` → 1 "G-25 hâlinde (f83e760f, c071d802, 2ea9f6ce)" · 2 yeni fonksiyonlar 21 · 3 tablolar kuruldu ·
  4 tetikleyici kuruldu, etkin · 5 yedek (3 fonksiyon) · 99 **UYGULANDI**
- `25-sonra-dogrula-salt-okur.sql` → 1–10 hepsi `tamam` · 99 **TAMAM**
- `25-onkosul-salt-okur.sql` (yeniden) → 1 VAR · 2–4 G-25 uygulanmış · 5 A6 UYGULANMIŞ · 6 25 · 7 kurallar AÇIK · min_istemci_surum boş ·
  8 1 · 0 · 0 · 0 · 1 · 99 **UYGULANMIŞ**
Veri silinmedi / sıfırlanmadı. Kullanıcı / veri eklemeleri (EKLEMELER.md) henüz YAPILMADI.

# 2. adım — korumalı sunucu + `kullanici` sunucu fonksiyonu (deneme projesi, 25 Kasım)

- Korumalı sunucu kullanıcının bilgisayarında açıldı: `ANA PROJE: ENGELLENDİ · DENEME: ulaştı (401)`; Yönetici girişi tamam.
- İlk `DenemeMuhasebe` ekleme denemesi: "Kullanıcı EKLENMEDİ: bulut hesabı açılamadı. Fonksiyona ulaşılamadı…" — deneme projesinde
  `kullanici` fonksiyonu YOKTU. Hiçbir şey yazılmadı; durduruldu.
- Kullanıcı onayıyla `supabase-kullanici-fonksiyonu.ts` (SHA-256 `e3a0291e…ca5ea`, kullanıcıda doğrulandı) yalnız deneme projesine
  `kullanici` olarak kuruldu. Kurulumdan önce kaynak incelendi: jeton `auth.getUser` ile sunucuda doğrulanır; rol, doğrulanmış
  e-postayla `tanimlar.veri.kullanicilar`'dan okunur (istemcinin gönderdiği rol kullanılmaz); rol denetimi gövde okunmadan önce.
  Listeyi yalnız Yönetici değiştirebilir: `tanimlar_kullanici_koruma` deneme projesinde etkin (`O · true · 1`).
- Ağ geçidi JWT denetimi ("Verify JWT with legacy secret") açıkken jetonsuz POST geçidin kendi 401'ini aldı
  (`UNAUTHORIZED_NO_AUTH_HEADER`); kullanıcı yalnız bu fonksiyon için kapattı (genel Auth ayarlarına dokunulmadı).
- Kapattıktan sonra konteynerden ölçüldü (hiçbiri yazmaz):
  OPTIONS → **200** · jetonsuz POST → **401** "Oturum jetonu yok — bulut kimliğiyle giriş yapılmalı" ·
  sahte jetonlu POST → **401** "Oturum geçersiz ya da süresi dolmuş — çıkıp yeniden girin".
- Sınanmadı (sıradaki): gerçek oturumlu, Yönetici OLMAYAN çağrının 403 alması (DenemeMuhasebe açıldıktan sonra, yetki verilmeden).
