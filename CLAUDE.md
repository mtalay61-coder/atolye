# Atölye ERP — Claude Code rehberi

Atölye üretim, stok, sipariş ve cari takibi. React uygulaması, **tek HTML dosyası** olarak
paketlenir ve GitHub Pages'ten (`main` dalı) yayınlanır. Veri Supabase'de, çevrimdışıyken
tarayıcının yerel deposunda (IndexedDB).

Proje uzun süre sohbet üzerinden geliştirildi; tüm geçmiş, kararlar ve kurallar
**`DEVAM-NOTU.md`** içinde (12 000+ satır). Yeni bir işe başlamadan önce en azından
"YENİ OTURUM — BURADAN BAŞLA", "Proje kuralları", "Altyapı" ve "Sık karşılaşılan hata
kalıpları" bölümlerini, ayrıca dokunacağın konunun bölümünü oku (`grep -n "^## " DEVAM-NOTU.md`).

## Dizin yapısı

- `src/*.jsx` — **kaynak kod.** İmport/export yok: `birlestir.js` dosyaları ad sırasıyla
  (000-, 010-, …) tek `atolye-erp.jsx`'e ekler, hepsi tek kapsamı paylaşır. Yeni parça eklerken
  araya numara sıkıştır.
- `src/tema/` — tema CSS/SVG; `src/001-tema-dosyalari.jsx` bunlardan ÜRETİLİR (`tema-gom.js`),
  elle düzenlenmez.
- `*denetim.js`, `kontrol.sh`, `oludenetim.sh` — projeye özel denetleyiciler (her biri yaşanmış
  bir hata sınıfını yakalar).
- `paketle.js` — JSX → tek HTML (React/lucide/xlsx esm.sh'tan, sürümler sabit).
- `test/` — birim testleri (`birim-*.js`) ve Chromium senaryoları (`senaryo-*.js`, çıktı
  `altin-*.txt` ile karşılaştırılır).
- `*.sql`, `supabase-*.ts` — Supabase şeması ve fonksiyonları (kullanıcı elle çalıştırır).
- `index.html` — başlatıcı: `surum.json`'u okuyup yayındaki sürüme yönlendirir. `manifest.json`,
  `sw.js`, `ikon-*.png` — kurulabilir uygulama (PWA).
- `atolye-erp-vX.Y.Z.html` — yayınlanmış sürümler (ÜRETİLEN dosyalar).

## Komutlar

```bash
npm install          # bir kez: typescript, react, playwright (yalnız araçlar için)
./yap.sh             # tema gömme + birleştirme + denetimler + paketleme + derleme kontrolü
                     # → atolye-erp-v<SURUM>.html
./test/kosu.sh       # birim testleri + tüm tarayıcı senaryoları (KOSU_IS=6 ile paralellik)
```

Tek senaryo: `cd test && node derle.js && node paket-test.js && node senaryo-<ad>.js`.

Bilinen test boşlukları (bkz. DEVAM-NOTU "GIT DEPOSUNA TAŞINDI"): `kosu.sh` listesindeki 15
senaryonun dosyası kayıp (FARKLI görünür); `tedarik-girisleri` bu ortamda ağ kısıtı yüzünden
FARKLI; paralel koşuda birkaç senaryo oynak. FARKLI çıkanı tek başına yeniden koş.
`src/137`, `236`, `237`, `238` derlenmiş (React.createElement) hâlde; dokunulursa JSX'e çevir.

## Değişiklik akışı

1. `src/` içinde değişikliği yap.
2. `src/015-sabitler.jsx`: `SURUM`'u artır, `SURUM_TARIHI`, `SURUM_NOTU` ve `SURUM_GECMISI`'nin
   başına yeni kayıt ekle (sürüm denetimi bunu izler).
3. `./yap.sh` → tüm denetimler temiz olmalı. Ardından `./test/kosu.sh` → senaryolar AYNI olmalı.
   Davranış bilerek değiştiyse ilgili `altin-*.txt`'yi güncelle ve nedenini not et.
4. `DEVAM-NOTU.md`: başlıktaki "Son sürüm" ve "Son iş" satırlarını güncelle, yapılanı ve
   kararları ilgili bölüme yaz.
5. Yayın: yeni `atolye-erp-vX.Y.Z.html`'i commit'le ve `surum.json`'u güncelle
   (`{"surum": "X.Y.Z", "url": "https://mtalay61-coder.github.io/atolye/atolye-erp-vX.Y.Z.html"}`).
   `main`'e birleşince GitHub Pages 1-2 dakikada yayına alır.

## Önemli kurallar (ayrıntısı DEVAM-NOTU.md'de)

- Kullanıcıyla ve kodda **Türkçe**; kod yorumları "neden"i anlatır, yoğun ve açıklayıcıdır.
- Supabase **secret anahtarı asla koda girmez**; yalnız publishable anahtar gömülü.
- Dışarıya veri gönderen AI/servis entegrasyonu önerme (kullanıcı kararı, bkz. 7a).
- Fişsiz hareket olmaz, eksi stok kırpılmaz, matris kuralı — bkz. "Proje kuralları".
