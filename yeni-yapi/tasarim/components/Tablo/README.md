# Tablo

Bütün listelerin ve raporların tek tablosu: yapışık başlık, süzgeç satırı, zebra, seçili satır, toplam satırı.

- Sağlanan: sütun tanımları (başlık, hizalama, biçim), satırlar, seçili satır, toplamlar.
- Sayı sütunu `erp-sayi`: sağa yaslı, tabular; başlığı da sağa yaslı. Para birimi değerin yanında yazılır.
- Satır tıklanınca seçilir (`aria-selected`), çift tık ya da Enter kartı açar. Satır içinde düğme yoktur; işlem araç çubuğundan yapılır.
- Eksi değer kırpılmaz: `erp-eksi` ile kırmızı ve eksi işaretli.
- "Standart" renk/beden hücresi boş kalır.
- Excel ve Yazdır bu tablonun DOM'undan üretilir: aynı sütun, sıra, başlık, toplam. Süzgeç satırı çıktıya girmez.
- Beden boyutlu liste `Matris` ile çizilir.
