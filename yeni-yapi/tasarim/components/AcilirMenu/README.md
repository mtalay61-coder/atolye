# AcilirMenu

Açılır menü, sağ tık (bağlam) menüsü, kart başlığındaki "İşlemler" menüsü ve kullanıcı menüsü aynı tasarımdır (`Atolye.menuHtml`).

- Öğe: solda ikon, ortada ad, sağda kısayol. Yükseklik `erp-row-h` (dokunmada 44px).
- Pasif öğe gizlenmez, soluk durur ve `title`'ı nedenini yazar.
- Tehlikeli öğe (Sil, İptal et) en altta, ayırıcıdan sonra, `erp-accent-press` renginde; tıklanınca `SilOnayi` açar.
- **Sağ tık menüsü araç çubuğunun kopyasıdır:** aynı eylemler, aynı sıra, aynı ad. Yalnız menüde bulunan eylem yoktur; menü kısayoldur, gizli yol değildir.
- Kart başlığına sığmayan özel işlemler "İşlemler" menüsünde toplanır (en çok 7 öğe; fazlası ekran tasarımının işaretidir).
- Klavye: ↑ ↓ gez, Enter seç, Esc kapat. Menü açılınca ilk etkin öğe seçili.
- Dokunmatikte sağ tık yerine satıra uzun basma aynı menüyü açar.
