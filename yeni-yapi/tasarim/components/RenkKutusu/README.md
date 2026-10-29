# RenkKutusu

Bir rengin küçük görseli: listede satır başında 20×20, kartta 56×56 (`erp-renk--buyuk`). `Atolye.renkKutusu(dilimler, { resim, buyuk })`.

- Tek renk: tek dilim (rengin görsel kodu, hex). Çok renkli ürün rengi: hücre sırasıyla eşit dilimler, 1. renk solda.
- Resim varsa (deri dokusu, süet) resim gösterilir; hex de resim de yoksa çapraz tarama: "görsel yok".
- Kutu tek başına anlam taşımaz: yanında her zaman kod ve ad yazılır. Seçicide `ek` alanına konur.
- Hex değeri kullanıcının verisidir, token değildir; kutunun dışında hiçbir yerde renk olarak kullanılmaz (yazı rengi, zemin yapılmaz).
- Sağlanan: dilimler (hex listesi), isteğe bağlı resim adresi, boyut.
