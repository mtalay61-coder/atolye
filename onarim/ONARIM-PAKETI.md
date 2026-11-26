# Renk çökmesi — veri onarım paketi (26 Kasım) — CANLIDA UYGULANDI (26 Kasım, 3. sürüm, bir kez)

## Canlı uygulama sonucu
- Onay: yalnız ana proje, `onarim-uygula.sql` sha256 `d5fec6e5…`, bir kez. Kullanıcı SQL Editor'de çalıştırdı.
- Kullanıcının ilettiği sonuç tablosu: `onarım sonucu · 440 · 130 · 0` (beklenen). `ONARIM TAMAM` bildirim metni görülmedi;
  kanıt olarak sayılmaz, "diğer tablolar aynı" canlıda bu yolla doğrulanmadı.
- Onarım sonrası envanter (23 ürünü her durumda listeleyen salt okur kopya) ile DOĞRULANAN: varyant 435 → 570 (A 100 + B 35),
  eski varyant kaybı yok, yalnız C'deki 130 pasif, stok / hareket aynı; sipariş kalemi 115/115 ve resim 16/16 bağlı, miktarlar aynı;
  reçetede yalnız D'nin 149 satırı değişti, E'nin 8 satırı aynı; renk tanımları aynı ("Siyah Yılan" korunuyor).
- Doğrulanmayan: 23 ürün dışı kayıtlar ve tablolar, surum / degisiklik sayacı. Geri alma kullanılmadı (ayrı onay). E ayrı karar.

Yayından (1.744.37) AYRI onaylanır ve YALNIZ yayından + "Sekmeler gerçekten düzeltilmiş sürümde" denetiminden SONRA uygulanır
(YAYIN-PAKETI-1.744.37.md). Kayıt kimlikleri depo herkese açık olduğu için BURADA YOK; yalnız kullanıcıya verilen dosyalarda.

## Dosyalar (kullanıcıya verildi; depoda değil) — 3. sürüm (canlı yapısıyla hizalı prova)
- `onarim-uygula.sql` sha256 `d5fec6e5b0fac7a76eac7fbe2f3fe04f6c51e4184436edd384e211f0070c32b1`
- `onarim-geri-al.sql` sha256 `47fa3cb4f6bf248686ed4ce1acfec2df76bbaafb702f7d825e783bf332cb2cc3`
- `onarim-plani.csv` sha256 `5b60d43397d3f3d8e45ede2b2a8cdf42e968af8534dab899ea50d686c0e985be` (değişmedi)
Projenin `stok-v2/editor-icin.py` çıktısı: yalnız düz `$$` gövde, gövde dışında dolar yok, yorum yok; Editor 2 isteğe böler.
2. sürüm (`1f90b157…`) canlı yapıda DURURDU ("ürünlerin reçete dışındaki bir alanı değişti" — canlıdaki `urunler_surum`
tetikleyicisi): yerelde hizalı şemada gösterildi, hiçbir kayıt değişmedi.

## Canlı yapı ile yerel prova (yalnız sorgunun kapsadığı 13 tablo)
`canli-yapi-salt-okur.sql` (2. sürüm, `1a61a6a2…`): canlıdan CSV 299 satır · `fb6bf396d7e518d267e56c40039f79c5` — CSV'den
yeniden hesaplanan özet aynı (dosya tam). 18 Kasım kurulum şemasından farklar: 5 tetikleyici (urunler_surum, siparisler_surum,
tanimlar_surum, iki silme_koruma), 2 fonksiyon (surum_arttir, yazma_yetkisi_koruma), 2 fonksiyon gövdesi (arsive_kopyala_silinen:
yorum satırı; tanimlar_kullanici_koruma: kimlik değişikliği denetimi), 14 fonksiyonda \r\n satır sonu, 5 kısıt + 2 doğrulanmamış
kısıt, 15 eksik / 1 fazla sütun, 39 sütunda tür / varsayılan / boş olamaz. `onarim/yapi-hizala.py` hepsini yerelde uygular →
yerel OZET = canlı OZET (299 · fb6bf396…). BU EŞLEŞME YALNIZ BU 13 TABLONUN yapısını, tetikleyicilerini ve tetikleyici
fonksiyonlarının gövdelerini doğrular; canlı şemanın tamamının eşit olduğunu GÖSTERMEZ (tetikleyici fonksiyonlarının çağırdığı
fonksiyonlar — ör. fis_kural_aktif, siparis_durum_hesap —, diğer tablolar, görünümler ve yetkiler kapsam dışı).
Onarımın yazdığı tablolardaki tetikleyicilerin yan etkileri (gövdelerden): stk_istemci_koru — SQL Editor'da jeton yok, hemen
çıkar; degisiklik_bump — degisiklik.sayaclar stk_varyant +3 / urunler +1; urunler_surum — reçetesi düzeltilen 2 üründe surum TAM +1
(onarım bunu ayrıca denetler, alan dışlanmaz); arsiv_silinen — yalnız geri almada (135 arşiv kaydı).

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

## Yerel sınama — 29/29 (canlıya hizalanmış yapı: 102 tetikleyici, 95 kısıt; tetikleyiciler AÇIK)
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
3. `onarim-uygula.sql` (SQL Editor) → `ONARIM TAMAM` beklenir. (UYGULANDI 26 Kasım; sonuç tablosu 440 · 130 · 0.)
4. Salt okur renk envanteri → etkilenen model listesinin boşalması; ekrandan 27162 D (1054 / 1055, 36–40).
5. Sorun olursa `onarim-geri-al.sql` (ayrı onay).
