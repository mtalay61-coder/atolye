# G-25 deneme — SABİTLENMİŞ COMMIT VE ÖZETLER

## GÜNCEL (25 Kasım akşam — 25b onay geçersizlik mührü dahil)

**Commit:** `caeb7fffd9a94b363b878edc8e4645e0c931cc8c` (dal `claude/g25-sql`). Aşağıdaki dosyalar bu commit'te birebir bu özetlerle durur.
Deneme projesi ŞU AN: eski paket (`fcc5429c…`, aşağıdaki ilk sabitleme) + `25b` + `tanimlar-service-role-okuma.sql` uygulanmış hâlde.
Yeni bir projede tam paket (`25-cari-yetki-uygula.sql`, 25b'yi zaten içerir) tek başına yeter; 25b yalnız ESKİ paketin uygulandığı veritabanı içindir.

| SHA-256 | Dosya | Ne |
|---|---|---|
| `1be582058439017552a588065cd5ff3c5f8f65ae8dd031ae5dceda24707bd02f` | `stok-v2/guvenlik/25-onkosul-salt-okur.sql` | salt okur — önkoşul (HAZIR / UYGULANMIŞ; 6. satır 30) |
| `eda7e55a1dcde4271b13ae44e38cc11e5acf7eb0e63977313eb4c0c44191444c` | `stok-v2/guvenlik/25-cari-yetki-uygula.sql` | YAZAR — tam paket (mühür dahil; 22 fonksiyon + 3 tablo + 5 tetikleyici) |
| `5ba5620a1914279dc835f989c2feb55a2e1b501384c6d286c85f926ec9bc6246` | `stok-v2/guvenlik/25b-onay-muhru-uygula.sql` | YAZAR — ek: eski pakete mühür (deneme projesinde UYGULANDI) |
| `be4141ee40dbb73f2de9da8ce78aad2b7e6af3cc597190e1b43e9c571ff56b97` | `stok-v2/guvenlik/25-sonra-dogrula-salt-okur.sql` | salt okur — 10 kontrol (8: 5 tetikleyici) |
| `182844d015a1db6f514c93f70332551d18096cbe9f02399fc27dbf0651884e5d` | `stok-v2/guvenlik/25-cari-yetki-geri-al.sql` | YAZAR — geri alma (mühür dahil kaldırır; açığı yeniden açar) |
| `2c54e39a7762887c94e06f7f6fc4910150ae744d6642ca26ce47fd7719f0d65f` | `stok-v2/guvenlik/25-deneme/durum-salt-okur.sql` | salt okur — deneme sayıları |
| `dd98bfd56722ccc5f8fc093ddff654e4e5d45d09d54eb38a7ea3f55ed91cf9bd` | `stok-v2/guvenlik/25-deneme/tanimlar-service-role-okuma.sql` | YAZAR — service_role'e tanimlar SELECT (deneme projesinde UYGULANDI) |
| `999aaa28d7d2d2d7b61e7b8d3f3aef319a30fa52b63f8a8c9ec119bbeea47041` | `stok-v2/guvenlik/25-deneme/deneme-test-durum-salt-okur.sql` | salt okur — kontrol listesi durumu |
| `302bf7274f9bebc9eb731d66bf23e5cb80c5682093180b79ba5aa1ec8494b37c` | `stok-v2/guvenlik/25-deneme/deneme-onay-gecerlilik-salt-okur.sql` | salt okur — onay geçerliliği |
| `502b9ac06fa45f9c10db180eee635460e80d4a55e2972c038280e381d6080ddb` | `stok-v2/guvenlik/25-deneme/deneme-anlik-goruntu-salt-okur.sql` | salt okur — ret öncesi / sonrası anlık görüntü |
| `0957fa0d2972abfb310bd9a04e73d0aa06853acbbfb06118e5a2d7cff7b0645d` | `atolye-erp-v1.745.1.html` | istemci 1.745.1 (yayınlanmadı; değişmedi) |
| `e931a6814d77c9bb2c630d3dd3e3498dc7e1e58241e8db0489706dcbf495a219` | `stok-v2/guvenlik/25-deneme/korumali-sunucu.js` | korumalı yerel sunucu (değişmedi) |

Doğrulama (bu commit, yerel): `25-uret.py --denetle` AYNI · test25 TEMİZ (matris 288 / 288, atomiklik, geri alma, tekrar, ekran
regresyonu) · eski paket + 25b 288 / 288 (yalnız eski paket 12 ✗ — canlanma) · 25b atomikliği (son adım düşünce hiçbir şey değişmedi) ·
işlenmiş kaynaklarla sunucu (102 adım) + güvenlik (55 ✓) takımları TEMİZ, 14 yeniden kurulumda koruma / mühür kalkmadı (son durum
22+3+5+M1) · kaynakları yeniden çalıştırma: mühürlü kurulumda korunur, mühürsüz kuruluma eklenir (288 / 288 ikisinde) · ekran akışı 33 / 33.

## İLK SABİTLEME (25 Kasım sabah — deneme projesine ilk uygulanan)

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
