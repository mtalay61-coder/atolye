# Bildirim

İşlemin sonucunu söyleyen kısa mesaj; sol altta, koyu `erp-shell` zeminde. Telefonda iki kenara yayılır.

- Metin düğmenin fiilini kullanır: "Kaydedildi", "Silindi", "Siparişe çevrildi".
- Süre metnin uzunluğuna göre: 4 sn + her 20 karakter için 1 sn, en çok 12 sn (`Atolye.bildirimSuresi`). Üzerine dokununca kapanır.
- Geri alınabilen işlemde **Geri al** düğmesi taşır ve 9 sn kalır; Geri al işlemi işlemin döndürdüğü kimlikle yapar.
- Hata bildirimi ne olmadığını ve ne yapılacağını söyler; kalıcı hatalar bildirim değil `Serit` olur.
