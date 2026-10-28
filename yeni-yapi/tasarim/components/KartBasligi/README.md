# KartBasligi

Kartın ve tam ekran pencerenin başlığı: solda kod + ad + durum rozeti, sağda kartın bütün eylemleri.

- Okuma kipi: **‹ 3 / 24 › ┆ Düzenle · (özel işlemler) · Sil ┆ Küçült · Kapat**. Düzenlemede gezgin pasif, eylemler yalnız **Kaydet ┆ Kapat**: ikisi de ikon düğme, Kaydet dolu. Kapat vazgeçer; değişiklik varsa sorar.
- Kayıt gezgini (`KayitGezgini`) listeden açılan her kartta vardır; yeni kayıt formunda yoktur.
- Kartın gövdesinde ikinci bir Düzenle, Kaydet ya da Vazgeç olmaz; istisnası yok. Başlık kaydırınca yapışık kalır (`position: sticky`), uzun formda da Kaydet görünür.
- Düğmeler her kartta aynıdır: Düzenle `i-edit` "Düzenle · F2", Sil `i-trash` kırmızı "Sil · Del", Kaydet `i-save` dolu "Kaydet · Ctrl+S", Kapat `i-close` "Kapat · Esc".
- Tam ekran pencere başlığı koyu `erp-shell` zemindedir (`erp-pencere-baslik`); Vazgeç ikonu hiçbir başlıkta yoktur, Kapat ve Esc yeter.
- Onaylı belgede Düzenle yerine **Düzelt** (iptal + yeni belge) ve **İptal et** yer alır.
- Sağlanan: kod, ad, durum, eylem listesi ve her birinin pasiflik nedeni.
