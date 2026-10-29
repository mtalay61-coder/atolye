# RenkHucreleri

Çok renkli ürün rengini kuran hücre dizisi. Renk sayısı kaç seçildiyse o kadar hücre açılır; her hücrenin başında kaçıncı renk olduğu yazar (**1. renk**, **2. renk**…) ve içinde tek renkli ürün renklerinden seçen bir `AramaliSecici` durur.

- Renk sayısı çiplerle seçilir: **1 renkli · 2 renkli · 3 renkli · 4 · 5 · 6**. Sayı artınca sona boş hücre eklenir; azalınca sondaki hücreler düşer (dolu hücre düşecekse önce sorulur).
- Hücreler yalnız **1 renkli ve etkin** ürün renklerinden seçer; kombinasyon içine kombinasyon konmaz.
- Aynı renk iki hücrede olamaz: ikinci hücre kırmızı çerçeveyle "Bu renk 1. hücrede seçili" der.
- Sıra anlamlıdır: 1. renk ana renktir; Siyah-Beyaz ile Beyaz-Siyah iki ayrı renktir. Reçetede "deri = 1. renk" eşlemesi bu sıraya bakar.
- Kod hücrelerden türemez: her ürün rengi gibi sıradaki 4 haneli numarayı alır (1000'den başlar, kayıtta sunucu verir, değişmez). Bütün hücreler dolunca **ad** hücrelerden önerilir (`Siyah-Beyaz`) ve büyük `RenkKutusu` dilimli önizlemeyi gösterir; ad elle değiştirilmediyse öneri hücreleri izler.
- Aynı sıralı kombinasyon zaten varsa kayıt engellenir ve var olan renk bağlantıyla gösterilir.
- Renk bir üründe kullanıldıysa renk sayısı ve hücreler kilitlidir (pasif, nedeni yazılı): "Ürünlerde kullanılan rengin hücreleri değişmez; yeni renk aç".
- Dar ekranda hücreler alt alta, tam genişlik.
