# AramaliSecici

Uygulamada listeden seçimin TEK yolu: kutuya yazdıkça liste daralır; yazılan her kelime kaydın içinde herhangi bir yerde geçiyorsa kayıt gelir.

- Sağlanan (`Atolye.aramaliSecici(kok, ayar)`): kaynak liste, aranan alanlar (ad, kod/barkod, il, tip, renk…), sağ sütun bilgisi (stok, bakiye, fiyat), ikinci satır, seçince ne olacağı, varsa "yeni aç" işlevi ve son kullanılanlar.
- **Eşleşme kuralı** (`Atolye.eslesme`): her kelime aranır, sıra önemsiz ("taba süet" = "süet taba"); kelimenin başta olması gerekmez ("deri" → "Çevik Deri Ltd."); Türkçe harf ve büyük/küçük farkı yok ("cevik" → "Çevik", "ISIK" → "Işık").
- Sıralama: birebir kod/barkod en üstte, sonra kelime başında eşleşen, sonra içinde geçen. Eşleşen kısım vurgulanır.
- En çok 50 satır; fazlası "N sonuç daha var; yazmaya devam et" der.
- Okutulan barkod ya da yazılan kod birebir tutarsa liste açılmadan seçilir.
- Boşken odaklanınca son kullanılanlar gelir.
- Klavye: ↑ ↓ gez, Enter seç, Esc kapat. Fare/dokunma ile seç.
- Eşleşme yoksa: '"xyz" ile eşleşen cari yok' ve yetki varsa "+ "xyz" adıyla yeni cari aç" (kart çekmecede açılır, kaydedince seçili döner).
- Seçilince kutu "KOD · Ad" gösterir; × temizler. Seçilmeden bırakılan yazı kayıt sayılmaz, kutu son seçime döner.
- Pasif kayıtlar listede yoktur; kayıtlı değer artık pasif ya da silinmişse kutuda "(listede yok)" ile görünür, başka kayda düşmez.
- **`<select>` yalnız 7 ya da daha az sabit seçenek için** (para birimi, ödeme şekli, durum). Cari, ürün, renk, beden seti, proses, depo, hesap her zaman bu bileşenle seçilir.
