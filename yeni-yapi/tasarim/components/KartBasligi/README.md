# KartBasligi

Kartın ve tam ekran pencerenin başlığı: solda kod + ad + durum rozeti, sağda kartın bütün eylemleri.

- Okuma kipi: **‹ 3 / 24 › ┆ Düzenle · (özel işlemler) · Sil ┆ Küçült · Kapat**. Düzenlemede gezgin pasif, eylemler yalnız **Vazgeç · Kaydet**.
- Kayıt gezgini (`KayitGezgini`) listeden açılan her kartta vardır; yeni kayıt formunda yoktur.
- Kartın gövdesinde ikinci bir Düzenle ya da Kaydet olmaz (uzun formun dibindeki Kaydet istisna: aynı ad, aynı iş).
- Tam ekran pencere başlığı koyu `erp-shell` zemindedir (`erp-pencere-baslik`); orada Vazgeç ikonu yoktur, Kapat ve Esc yeter.
- Onaylı belgede Düzenle yerine **Düzelt** (iptal + yeni belge) ve **İptal et** yer alır.
- Sağlanan: kod, ad, durum, eylem listesi ve her birinin pasiflik nedeni.
