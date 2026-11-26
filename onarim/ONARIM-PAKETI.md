# Renk çökmesi — veri onarım paketi (26 Kasım) — UYGULANMADI, AYRI ONAY

Yayından (1.744.37) AYRI onaylanır ve YALNIZ yayından + "Sekmeler gerçekten düzeltilmiş sürümde" denetiminden SONRA uygulanır
(YAYIN-PAKETI-1.744.37.md). Kayıt kimlikleri depo herkese açık olduğu için BURADA YOK; yalnız kullanıcıya verilen dosyalarda.

## Dosyalar (kullanıcıya verildi; depoda değil)
- `onarim-uygula.sql` — tek DO bloğu (ön koşul → değişiklik → son koşul). Tek bir beklenti tutmazsa `ONARIM DUR: …` ile durur,
  blok bütünüyle geri alınır, HİÇBİR kayıt değişmez. Başarıda `ONARIM TAMAM: …` bildirimi.
- `onarim-geri-al.sql` — tersi, aynı kural; eklenen varyantlardan birinde hareket başlamışsa durur.
- `onarim-plani.csv` — kayıt bazında plan (414 satır). SHA-256 özetleri sohbette / DEVAM-NOTU'da.
- Üretici: `onarim/onarim-sql-uret.py` (CSV'lerden üretir); yerel sınama: `onarim/onarim-sina.py`.

## Kapsam
| | Kayıt | Değişen |
|---|---|---|
| A | 100 kombinasyon varyantı (18 model) | 25-1137'deki ESKİ kimlik, ürün, kombinasyon, ölçü, min_stok, oluşturma zamanıyla geri eklenir |
| B | 35 kombinasyon varyantı (5 model) | önceden belirlenmiş kimlikle açılır (`vry-` + md5) — eski kimlik hiçbir yedekte yok |
| C | 130 düz varyant | YALNIZ `aktif` true → false; silinmez |
| D | 149 reçete satırı (27001, 27181) | YALNIZ `mamulRenk` (kombinasyonun güncel adı) ve `mamulRenkId` (kaldırılır) |
| E | 8 reçete hammadde rengi | YOK — karar bekliyor (renkId hata öncesinde de yanlış renge işaret ediyordu) |

Ön koşullar (biri tutmazsa durur): 23 modelin varyant kümesi canlı envanterle birebir; 9 kombinasyon ve 4 renk beklenen adla;
A/B kimliği ve (ürün, kombinasyon, ölçü) üçlüsü yok; C etkin ve hareketsiz; reçete uzunlukları ve 149 satırın sırası, imzası,
önceki değeri beklenen. Son koşullar: tam 135 ekleme beklenen kimliklerle, tam 130 pasif, reçetede tam 149 öğe ve yalnız iki alan;
sipariş kalemleri, siparişler, hareketler, fişler, stoklar, renk / ölçü tanımları (barkod kodları dahil), Tanımlar ve ürünlerin
reçete dışı alanları parmak iziyle aynı.

## Yerel sınama (canlı envanterden kurulan kopya, PostgreSQL 16) — 31/31
Sağlam kopyada TAMAM; 135 / 130 / 149 bağımsız döküm karşılaştırmasıyla doğrulandı; 115 sipariş kaleminin hepsi bağlanıyor; ikinci
çalıştırma durur; geri alma kopyayı birebir eski hâline getirir; 7 bozuk durumda (pasif düz varyant, düz varyantta hareket, var olan
kimlik, fazladan varyant, farklı reçete değeri, kombinasyon adı değişmiş, renk adı değişmiş) DURUR ve hiçbir kayıt değişmez.
Sınamada bulunan ve düzeltilen: kod 1001'i Tanımlar dışı pasif eski bir kayıt da taşıyordu ("1001 - Siyah") — üretici onu seçiyordu,
ön koşul yakaladı; eşleme artık yalnız Tanımlar'daki etkin kombinasyonlarla (ilk plan dosyasındaki 57 satır bu yüzden yanlıştı).

Sınanmayan (canlıya özgü): canlıdaki ek tetikleyiciler / sütunlar (ör. sürüm kapısı tetikleyicisi, günlük) — SQL Editor'da jetonsuz
çalışır; beklenmeyen bir yan etki parmak izlerinden birini değiştirirse blok durur ve hiçbir şey değişmez.

## Uygulama sırası (her adım ayrı onay)
1. 1.744.37 yayını + bütün cihazlarda v1.744.37 (YAYIN-PAKETI).
2. Salt okur renk envanteri (limit 5000) yeniden — ön koşul tutmuyorsa üretici yeni CSV ile yeniden çalıştırılır.
3. `onarim-uygula.sql` (SQL Editor) → `ONARIM TAMAM` beklenir.
4. Salt okur renk envanteri → etkilenen model listesinin boşalması; ekrandan 27162 D (1054 / 1055, 36–40).
5. Sorun olursa `onarim-geri-al.sql` (ayrı onay).
