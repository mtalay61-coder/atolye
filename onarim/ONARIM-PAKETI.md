# Renk çökmesi — veri onarım paketi (26 Kasım) — UYGULANMADI, AYRI ONAY

Yayından (1.744.37) AYRI onaylanır ve YALNIZ yayından + "Sekmeler gerçekten düzeltilmiş sürümde" denetiminden SONRA uygulanır
(YAYIN-PAKETI-1.744.37.md). Kayıt kimlikleri depo herkese açık olduğu için BURADA YOK; yalnız kullanıcıya verilen dosyalarda.

## Dosyalar (kullanıcıya verildi; depoda değil) — 2. sürüm
- `onarim-uygula.sql` (sha256 `1f90b157eb339cc975b6deb7a8e24e6d70fe43539c1a94531c31344c75ea0b15`) ve
  `onarim-geri-al.sql` (`726f097b4bd44a565930cdb85a88e59030fd8e8d8eaad64652e5a0a6f7c7cae6`): projenin `stok-v2/editor-icin.py`
  çıktısı — yalnız düz `$$` gövde, gövde dışında dolar yok, yorumlar ayıklanmış. Editor 2 isteğe böler: (1) tek DO bloğu, (2) salt
  okur sonuç tablosu. Blok, tek bir beklenti tutmazsa `ONARIM DUR: …` ile durur ve bütünüyle geri alınır (kısmi onarım yok).
- `onarim-plani.csv` (`5b60d433…`) — kayıt bazında plan, güncel adlarla ("Siyah Yılan" — kullanıcı: ad değişikliği bilerek).
- `canli-yapi-salt-okur.sql` (depoda) — canlıda salt okur; OZET satırı yerel provanın şemasıyla karşılaştırılır
  (beklenen: `241 satır · 0e94709f7a31ae2175e09cab83f9179a`, canlının 18 Kasım yapısı).
- Üretici `onarim/onarim-sql-uret.py`, yerel sınama `onarim/onarim-sina.py`.

## Kapsam
| | Kayıt | Değişen |
|---|---|---|
| A | 100 kombinasyon varyantı (18 model) | 25-1137'deki ESKİ kimlik, ürün, kombinasyon, ölçü, min_stok, oluşturma zamanıyla geri eklenir |
| B | 35 kombinasyon varyantı (5 model) | önceden belirlenmiş kimlikle açılır (`vry-` + md5) — eski kimlik hiçbir yedekte yok |
| C | 130 düz varyant | YALNIZ `aktif` true → false; silinmez |
| D | 149 reçete satırı (27001, 27181) | YALNIZ `mamulRenk` (kombinasyonun güncel adı) ve `mamulRenkId` (kaldırılır) |
| E | 8 reçete hammadde rengi | YOK — karar bekliyor (renkId hata öncesinde de yanlış renge işaret ediyordu) |

Ön koşullar (biri tutmazsa durur): 23 modelin varyant kümesi canlı envanterle birebir; 9 kombinasyon ve 4 renk beklenen GÜNCEL
adla (Siyah Yılan dahil); A/B kimliği ve (ürün, kombinasyon, ölçü) üçlüsü yok; C etkin ve hareketsiz; reçete uzunlukları ve
149 satırın sırası, imzası, önceki değeri beklenen. Kombinasyon kimliklerine ve renk / barkod kodlarına DOKUNULMAZ.

Son koşullar: tam 135 ekleme beklenen kimlik / ürün / kombinasyon / ölçüyle (A'da min_stok ve oluşturma da), eski varyantlarda
yalnız 130'unun `aktif` alanı, reçetede tam 149 öğe ve yalnız iki alan, 23 model dışındaki varyantlar ve ürünlerin reçete dışı BÜTÜN
sütunları (alan dışlanmadan) aynı. Yan etkiler: `degisiklik.sayaclar` yalnız stk_varyant +3 / urunler +1 (degisiklik_izle
tetikleyicisi, deyim başına) — başka anahtar ya da satır değişirse durur; geri almada ayrıca `silinen_arsiv`'e tam 135 silme kaydı
(arsiv_silinen) ve son 365 günün arşivi aynı. public şemasındaki DİĞER HER TABLO satır satır (tam satır metni) önce / sonra aynı olmalı.

SINIRI (abartmadan): bu denetim public şemasındaki tabloları kapsar; auth / storage şemaları, şema dışı sistem tabloları ve
yalnız sayaç / zaman damgası olarak bilinen `degisiklik.zaman` karşılaştırılmaz. Onarım sırasında başka bir oturum tetikleyicisiz
bir tabloya yazarsa denetim bunu yan etki sayar ve DURUR (güvenli yön: hiçbir şey değişmez) — bu yüzden onarım kimse çalışmıyorken.
Sürüm kapısına (`min_istemci_surum`) DOKUNMAZ.

## Yerel sınama — 29/29 (canlının 18 Kasım yapısı: 97 tetikleyici, 90 kısıt; tetikleyiciler AÇIK)
Şablon `atolye-kurulum-2026-11-18.sql` ile kuruldu (kurulumun kendi doğrulaması 17/17 tamam); veri canlı envanterden. Dosyalar
Editor gibi parçalanıp her parça ayrı psql bağlantısıyla gönderildi. Sonuç: ONARIM TAMAM; 135 / 130 / 149 bağımsız döküm
karşılaştırmasıyla; degisiklik +3 / +1; diğer 43 tablonun hepsi satır satır aynı; 436 eski varyantın stoğu aynı; 115 sipariş
kalemi bağlanıyor; ikinci çalıştırma durur; geri alma 2 parça, degisiklik / arşiv dışındaki bütün tablolar onarım öncesiyle aynı,
arşive tam 135 kayıt. SON ADIMDA bilerek hata (reçete güncellemesinden sonra başka tabloya yazan sınama tetikleyicisi): onarım ve
geri alma DURDU, hiçbir şey kalmadı; ara adımda hata: aynı; 7 ön koşul bozması: DUR, değişiklik 0.

## Uygulama sırası (her adım ayrı onay)
1. 1.744.37 yayını (PR #370, AYRI onay) + bütün cihazlarda v1.744.37 (YAYIN-PAKETI). Sürüm kapısı bu işe dahil DEĞİL.
2a. `canli-yapi-salt-okur.sql` (salt okur) → OZET yerel provayla aynı olmalı; değilse prova yeni yapıyla tekrarlanır.
2. Salt okur renk envanteri (limit 5000) yeniden — ön koşul tutmuyorsa üretici yeni CSV ile yeniden çalıştırılır.
3. `onarim-uygula.sql` (SQL Editor) → `ONARIM TAMAM` beklenir.
4. Salt okur renk envanteri → etkilenen model listesinin boşalması; ekrandan 27162 D (1054 / 1055, 36–40).
5. Sorun olursa `onarim-geri-al.sql` (ayrı onay).
