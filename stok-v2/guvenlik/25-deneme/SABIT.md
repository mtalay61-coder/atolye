# G-25 deneme — SABİTLENMİŞ COMMIT VE ÖZETLER (25 Kasım)

Deneme projesinde (`drtmnovafswzcmpacubl`) YALNIZ bu commit'teki dosyalar kullanılır. Özet tutmayan dosya kullanılmaz (korumalı sunucu
HTML özetini kendisi denetler; SQL dosyalarının özetini SQL Editor'e yapıştırmadan önce `sha256sum` ile karşılaştırın).

**Commit:** `2a9295ed3be33571ef94dbab8bb11ac17d232c47` (dal `claude/g25-sql`)

| SHA-256 | Dosya | Ne |
|---|---|---|
| `486232495f90a321371f003940e5fe2e3285a78442841c34a43811d457856748` | `stok-v2/guvenlik/25-onkosul-salt-okur.sql` | salt okur — önkoşul (GENEL HAZIR) |
| `2c54e39a7762887c94e06f7f6fc4910150ae744d6642ca26ce47fd7719f0d65f` | `stok-v2/guvenlik/25-deneme/durum-salt-okur.sql` | salt okur — deneme projesinin sayıları |
| `fcc5429c6d261898e6a055aa774465838b6fbe41d9ec2d7166dc706ccabfebc5` | `stok-v2/guvenlik/25-cari-yetki-uygula.sql` | YAZAR — atomik uygulama (ayrı onay) |
| `57e9015a5fa10c6b000a6081ccbf28d620b3fca1e2789012c1f267ec9939db43` | `stok-v2/guvenlik/25-sonra-dogrula-salt-okur.sql` | salt okur — uygulama sonrası 10 kontrol |
| `a0c3072df83d60a6f91ef13831bd921419b92cdb8a3c71c3826dee61d94201a0` | `stok-v2/guvenlik/25-cari-yetki-geri-al.sql` | YAZAR — geri alma, açığı yeniden açar (ayrı onay) |
| `0957fa0d2972abfb310bd9a04e73d0aa06853acbbfb06118e5a2d7cff7b0645d` | `atolye-erp-v1.745.1.html` | istemci 1.745.1 (yayınlanmadı) |
| `e931a6814d77c9bb2c630d3dd3e3498dc7e1e58241e8db0489706dcbf495a219` | `stok-v2/guvenlik/25-deneme/korumali-sunucu.js` | korumalı yerel sunucu |

Doğrulama (commit'te, yerel): üretici `25-uret.py --denetle` "üretilenler diskteki ile AYNI"; matris 271 / 271 (istenen / kaydedilen istek satırlarıyla); test25 TEMİZ
(Editor biçimli uygulama, son-adım atomikliği, geri alma, tekrar); ekran akışı 33 / 33 (gerçek istemcide kısmi teslim); sunucu +
güvenlik takımları TEMİZ (14 yeniden kurulumda G-25 kaldırılmadı); korumalı sunucu doğrulaması 11 / 11; istemci takımı: yalnız
`recete-genis` paralelde FARKLI, tek başına AYNI (oynak).
