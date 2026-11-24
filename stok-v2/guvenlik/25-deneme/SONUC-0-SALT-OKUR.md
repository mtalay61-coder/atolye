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
