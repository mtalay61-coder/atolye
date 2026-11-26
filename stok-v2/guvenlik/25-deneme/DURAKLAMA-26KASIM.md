# G-25 deneme — DURAKLAMA NOTU (26 Kasım; kullanıcı: "buraya kadar kaydet, not ekle — ana projede başka sıkıntı var")

## Nerede kaldık

- Onay VAR (25 Kasım): yalnız `drtmnovafswzcmpacubl`; commit `63f732d25aa963a600252def669f30030fa057af`; 25c (`8d222633…`) → 25d (`493c58d0…`);
  korumalı sunucu yalnız 1.745.2 (`bea508d4…`); 10007 / 10008 sınamaları. Tam kurulum paketi denemede KULLANILMAZ. 10001 / 10002 / 10004 değişmez.
  Geri alma ayrı onay. Paket ve adımlar: `PAKET-25C-25D-DENEME.md`; özetler: `SABIT.md` GÜNCEL-2.
- **Deneme projesine HİÇBİR SQL uygulanmadı** (25c / 25d YOK). Son ölçülen durum: eski paket (`fcc5429c`) + 25b + tanimlar okuma yetkisi.
- Adım 0a'da durduk: yeni bilgisayarın İndirilenler klasöründe paket dosyaları yoktu; yalnız ESKİ `25-sonra-dogrula` (`BE4141EE…`) ve
  `25-onkosul` (`1BE58205…`) vardı — bunlar kullanılmayacak (kenara: `Downloads\eski-g25`). 0b (paket durumu) ve 0c (başlangıç görüntüsü)
  ÇALIŞTIRILMADI.

## Devam ederken

1. 8 dosyayı yeniden indir, `Get-FileHash` ile özetleri doğrula (63AA5AD7 · 524E0150 · 502B9AC0 · 8D222633 · 493C58D0 · 3F9C6E56 · FCDC0C32 · BEA508D4).
2. 0b: `deneme-paket-durumu-salt-okur.sql` → 5. satır "G-25 + 25b (sırada 25c, sonra 25d)" değilse DUR.
3. 0c: anlık görüntü + iş defteri (başlangıç).
4. 25c → sonuç; 25d → sonuç; sonra-doğrula TAMAM; önkoşul UYGULANMIŞ (34); paket durumu "G-25 + 25b + 25c + 25d"; anlık görüntü 9 / 9 aynı.
5. 1.745.1 sekmeleri kapalı; korumalı sunucu yalnız 1.745.2; v1.745.2 görünür; ana proje ENGELLİ denetimi.
6. Sınama A (10007; DU yeniden tesliminden önce `deneme-onay-gecerlilik-salt-okur.sql` ile onay geçerli) ve Sınama B (10008; Deneme Tamirci;
   iki ustanın cari hareketi, ödeme defteri, stok, fiş görünümü birlikte; retlerde öncesi / sonrası anlık görüntü).

## Açık işler (bu dalda)

- Yeni firma kurulumunda `service_role` yetkilerini kaynaktan birebir taşıyan düzeltme (ayrı dal) — HENÜZ YAPILMADI.
- Kalan sorunlar listesi: `RAPOR-KONTROL-LISTESI.md` ve son raporun "Kalan sorunlar" bölümü (alt_yaz ile yeniden açma, geçmiş tamir ücreti,
  bölüm tahakkuku, farklı prosese tamir, artan girişi doğrulaması, maaş görünürlüğü).
