# AracCubugu

Ekranın bütün aksiyonlarının durduğu tek çubuk; sıra bileşenin içinde sabittir: Yeni · Kaydet · Düzenle · Kopyala · Sil ┆ Ara · Filtre ⟶ Yenile · Yazdır · Excel ┆ Küçült · Kapat.

- Sağlanan: ekran başlığı ve bu ekranda bulunan eylemler, her birinin pasiflik nedeni. Sırayı ekran vermez; `Atolye.EYLEMLER` tablosu verir (`Atolye.aracCubugu(eylemler, baslik)`).
- Ekranda olmayan eylem çubuktan çıkar. Var olan ama şu an kullanılamayan eylem **pasif** görünür ve `title`'ı nedenini yazar ("Önce bir sipariş seç").
- Tek dolu kırmızı düğme: listede Yeni, formda Kaydet. İkisi aynı çubukta bulunmaz.
- Sil ile Kapat arasında her zaman bir ayırıcı ve en az iki düğme vardır.
- Kısayollar çubuktaki eyleme bağlıdır (`Atolye.KISAYOLLAR`): Ctrl+S, Ctrl+N, F2, F5, Del, Esc. Çubukta karşılığı yoksa kısayol tarayıcıya bırakılır.
- Yapma: ekrana özel düğmeyi gövdeye koymak. Özel işlem (Siparişe çevir, İşi ver) kart başlığına, Düzenle ile Sil arasına girer.
