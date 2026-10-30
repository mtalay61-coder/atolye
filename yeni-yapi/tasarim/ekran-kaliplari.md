# Ekran kalıpları

Uygulamada beş çeşit ekran vardır. Yeni bir ekran bunlardan birine oturur; düzeni baştan çizilmez. Her kalıbın bölgeleri ve sırası sabittir.

## 1. Liste ekranı

Siparişler, cariler, ürünler, belgeler, üretim emirleri.

1. `Kabuk` içinde, üstte **araç çubuğu**: solda `baslik-sayfa`, sonra Yeni · Kopyala · Sil ┆ Ara · Filtre ⟶ Yenile · Yazdır · Excel.
2. Altında **süzgeç satırı**: durum çipleri (Açık / Tümü / …) ve arama kutusu. Seçili süzgeç sayıyla görünür: "Açık 24".
3. **Tablo**: satır seçilir, çift tık ya da Enter kartı açar. Satır içi düğme yok.
4. Tablonun altında **toplam satırı** (varsa) ve kayıt sayısı.
5. Boşsa `BosDurum`.

Kural: listede Düzenle yoktur; düzenleme kartın işidir.

## 2. Kart (kayıt) ekranı

Bir siparişin, carinin, ürünün ayrıntısı. Tam ekran pencere ya da listenin içinde açılan kart.

1. **Kart başlığı**: solda kod + ad (`baslik-kart`) ve durum rozeti; sağda **‹ 3 / 24 ›** kayıt gezgini, sonra Düzenle · (özel işlemler) · Sil, en sağda Küçült · Kapat.
2. Düzenlemedeyken başlıkta yalnız **Kaydet ┆ Kapat** (ikon düğmeler); Kaydet tek dolu düğmedir. Kapat vazgeçer, değişiklik varsa sorar. Gövdede yazılı Kaydet/Vazgeç yoktur; başlık yapışık olduğu için uzun formda da Kaydet görünür.
3. Gövde **sekmelere** ayrılır (Genel · Kalemler · Hareketler · …). Sekme adı tek kelime ya da iki kelime.
4. Alanlar okuma kipinde etiket + değer çiftidir; düzenlemede aynı yerde giriş kutusu olur (yer değişmez).
5. Önceki/sonraki kayda geçişte açık sekme korunur; Kapat listeye döner, son bakılan kayıt seçili gelir.

## 3. Belge (fiş) formu

Sipariş, alış, sevk, tahsilat, iş verme, teslim alma.

1. Pencere başlığı: belge tipi + numara ("SAT-2026-000123"), sağda kayıtlı belgede **‹ 3 / 24 ›** gezgini, Kaydet · Sil ┆ Küçült · Kapat. Yeni belgede gezgin yok.
2. **Üst bölge**: belgenin tamamını ilgilendiren alanlar tek satırda: cari (`AramaliSecici`, sağında bakiye), tarih, belge no; para birimi ve defter sağ üstte küçük.
3. **Kalem satırı ekleme**: ürün (`AramaliSecici`, sağında stok) → renk → ölçü → miktar → fiyat aynı hizada, sabit genişlikli alanlar; barkod okutmak ürünü doğrudan seçer.
4. **Kalemler**: beden boyutluysa `Matris`, değilse `Tablo`.
5. **Alt bölge**: not ve toplamlar (sağda). Kaydet burada tekrar edilmez; yapışık başlıktadır.
6. Onaylı belge düzenlenmez: başlıkta Düzenle yerine **Düzelt** (iptal + yeni belge) ve **İptal et** vardır.

## 4. Rapor ekranı

Stok durumu, cari ekstre, kâr-zarar, üretim raporu.

1. Araç çubuğu: başlık, sonra yalnız ⟶ Yenile · Yazdır · Excel (raporda Yeni/Sil yoktur).
2. **Rapor çerçevesi** süzgeç bandı: tarih aralığı (Bugün · Bu hafta · Bu ay · Aralık), kaydırma okları, süzgeçler.
3. **Özet satırı**: en çok 4 sayı, her biri etiketli.
4. **Tablo** ya da **Matris**; Excel ve Yazdır bu tablonun aynısını verir.
5. Rapor veri yazmaz; raporda düzenlenebilir alan yoktur.

## 5. Panel (atölye cihazı)

Barkod ekranı, atölye ekranı, paketleme. Menü yoktur, tek iş yapılır.

1. Dokunma ölçüleri her genişlikte geçerlidir (`erp-…-dokunma` token'ları).
2. Üstte kim olduğu ve çevrimdışı durumu; ortada tek büyük giriş (barkod/kart okutma); altta son işlemler listesi.
3. Okutmanın sonucu büyük rozetle ve sesle verilir; hata `erp-void` + açıklama.

## Ortak kurallar

- Pencereler üst üste en çok bir onay penceresi açar; pencere içinde pencere yok.
- Ekran açılınca odak ilk mantıklı alandadır (listede arama, formda ilk boş zorunlu alan).
- Kaydedilmemiş değişiklikle Kapat'a basılırsa sorulur: "Değişiklikler kaydedilmedi. Kaydet · Kaydetmeden kapat · Vazgeç".
- Kaydırma: başlık ve araç çubuğu yapışıktır; içerik onların altında kalmaz (`scroll-padding-top`).
