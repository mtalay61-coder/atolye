# KayitGezgini

Listeden açılan kartta kaydı kapatmadan önceki ve sonraki kayda geçiren düğmeler ve sıra: **‹ 3 / 24 ›**.

- Yer: kart (ya da pencere) başlığında, eylemlerin solunda, arkasında ayırıcı. Listesi olan her kartta vardır: sipariş, teklif, cari, ürün, belge, üretim emri, reçete, tanım kartları.
- Sağlanan: kartın açıldığı listenin o anki sırası (kimlik dizisi) ve açık kaydın kimliği; `Atolye.gezgin(liste, mevcut)` sırayı, toplamı, önceki ve sonraki kimliği verir, `Atolye.gezginHtml` çizer.
- Sıra ekranda görülen listedir: süzgeç ve sıralama dahil. "Açık" süzgeciyle açılan siparişte iptal edilenler atlanır. Liste dışından (arama, bağlantı, bildirim) açılan kartta modülün varsayılan listesi kullanılır.
- Kısayol: **PageUp** önceki, **PageDown** sonraki (yazı kutusunun içindeyken çalışmaz). Alt+← kullanılmaz; tarayıcının geri tuşudur.
- İlk kayıtta Önceki, son kayıtta Sonraki pasif: "İlk kayıt", "Son kayıt". Döngü yapmaz.
- Düzenleme sırasında iki düğme de pasif: "Önce kaydet ya da vazgeç". Kaydedilmemiş değişiklik sessizce kaybolmaz.
- Geçişte açık sekme korunur (Kalemler'deyken sonraki kaydın Kalemler'i açılır). Kapat listeye döner ve son bakılan kayıt listede seçili gelir.
- Yeni kayıt formunda gezgin yoktur.
