# Yayın paketi — istemci 1.744.48 (27 Kasım): buluttan gelen Tanımlar ekrana işlenmiyordu

**Durum:** HAZIR, ONAY BEKLİYOR. main'e birleştirilmedi, yayınlanmadı (`surum.json` main'de 1.744.46). Sunucu tarafında değişiklik YOK;
canlıya yazan SQL yok. Dal `claude/rozet-1-744-48` (kaynak + sınamalar), taban main `c0c173d`.

## 1. Hata (yayındaki 1.744.46'da)

`bulutDegisikligiUygula` (src/100) buluttan okunan Tanımlar'ı ekrandaki hâlin KENDİ alt kümesiyle karşılaştırıyor; anahtar kümeleri
aynıyken Tanımlar ekrana hiç işlenmiyor, fark tabanı ise sunucu hâline geçiyordu (kod 16 Kasım'dan beri böyle). Sonuçlar:

1. **Aynı cihaz:** renk adı sunucuda değişince (B1) ürünler ve siparişler ekranda yeni ada geçer, Tanımlar eski adda kalır ("N üründe"
   rozeti kaybolur). Sayfa yenilenmeden yapılan SONRAKİ Tanımlar kaydı eski adı "yerel değişiklik" sanıp sunucuya geri yazar; sipariş
   kalemleri yeni adda kalır → **bağ kopar** (yerelde: 2 kalem kopuk).
2. **Diğer cihaz:** başka cihazın Tanımlar değişikliği (ton kodu, yeni renk, yeni ad) açık ekrana gelmez; o cihazın sonraki kaydı
   değişikliği **geri çevirir** (yerelde: ton kodu ve ad geri yazıldı, 2 kalem kopuk).
3. **Bekleyen kayıt + aynı alan (ayrı hata, 091):** gönderilmeyi bekleyen Tanımlar değişikliği yeniden gönderilirken, başka cihaz bu
   arada AYNI öğeyi değiştirdiyse uzlaştırma bu cihazı kazandırıp tabanı sunucuya çekiyor, çakışma görülmüyor, öbür cihazın değeri
   **sessizce eziliyor** (B2 çakışma koruması bu yolda devre dışıydı).

1.744.44'e kadar renk adı değişikliği Tanımlar'ı ekranda kendisi güncellediği için 1. madde görünmüyordu; B1 ile ortaya çıktı.
2. ve 3. maddeler 1.744.46'dan önce de vardı (2: en az 16 Kasım'dan beri; 3: 1.744.46'da B2 ile gelen korumanın kapsamadığı yol).

## 2. Düzeltme (yalnız istemci)

- `src/100-app.jsx`: Tanımlar tazelemesinde ekrandaki değerler (bulutun getirdiği anahtarlar için) BULUT hâliyle karşılaştırılır;
  farklıysa ekrana işlenir ve "Başka cihazdan güncellendi: Tanımlar" notu düşer.
- `src/091-tanim-tazele.jsx` + `src/100-app.jsx`: bekleyen tanım kaydı yeniden gönderilirken aynı öğede çakışma varsa uzlaştırma
  yapılmaz, taban değişmez; sürüm koşullu yazma çakışmayı bulur, şerit çıkar ("Benimkini uygula" / "Sunucudakini al").
- Sınama gözlem kancası (`window.__TANI`, yalnız `window.__TANI_AC` verilirse; salt okuma).

Kaynak farkı (main `c0c173d`): `src/015` (sürüm), `091`, `100`; +satır haritası.

## 3. Dosyalar

| Dosya | SHA-256 | Not |
|---|---|---|
| `atolye-erp-v1.744.48.html` | `9a3d8786e4e659e884bd2f5f6417fa1f791cbc2f2475de54ff741a314276723d` | yayınlanacak; `./yap.sh` çıkış 0, denetimler temiz |
| `atolye-erp-v1.744.49.html` | `78ea1c59c5a0d2e1cc2ef45274070e7e5fd4ba9f4eb7c723a6d2ab62cbf292f6` | **GERİ DÖNÜŞ:** 1.744.44 kodu, yalnız sürüm bilgisi (dal `claude/geri-donus-1744-49`, `273e9cc`) |
| `atolye-erp-v1.744.46.html` | `29fa13c5de845a14ef263653d8c080518d52943c22a9d5d1bf07232dab549d9e` | yayında; BİLİNEN HATALI — geri dönüş SAYILMAZ |
| `atolye-erp-v1.744.47.html` | `6fe659e97a3d07c5fc913082821bd8d300c34a9462223fbff10c1977a2c3b045` | yerinde kalır; 48'den geri dönüş sağlamaz (düşük numara) |
| `47-canli-ad-geri-yazma-tani-salt-okur.sql` | `0ea1ebb8f2b36ed82ffaac8e33bc877beef992972160694233a001cc45645bc8` | canlıda etkilenen renk taraması (salt okur, onarım yok) |

## 4. Sınama

Kalıcı sınama `test/inceleme/ekran-tanim-tazele.js` (beş sunucu paketi kurulu; iki tarayıcı = iki cihaz):

| Senaryo | 1.744.46 (eski kod) | 1.744.48 |
|---|---|---|
| T1 aynı cihaz: ad değiştir → renk ekle → yenile → bir kayıt daha | KALDI (7 kontrol: ad geri yazıldı, 2 kalem kopuk, rozet yok) | geçti |
| T2 diğer cihaz: ton kodu + yeni renk + yeni ad açık ekrana gelir; sonraki kayıt geri çevirmez | KALDI (4 kontrol: ekrana gelmedi, geri çevrildi, 2 kalem kopuk) | geçti |
| T3 bekleyen yerel değişiklik: tazeleme ezmez; yazma açılınca ikisi de sunucuda | geçti | geçti |
| T4 bekleyen + aynı alan: sessiz ezme yok, çakışma şeridi, "Benimkini uygula" | KALDI (2 kontrol: sessizce ezdi, şerit yok) | geçti |
| **Toplam** | **14 geçti · 13 kaldı** (`sonuc-ekran-tanim-tazele-eski-1744-46.txt`) | **27 geçti · 0 kaldı** (`sonuc-ekran-tanim-tazele.txt`) |
| Yerel Supabase (Kong → PostgREST / GoTrue), giriş ekrandan | — | **27 geçti · 0 kaldı** (`…-supabase.txt`) |

T1 / T2'de ölçülen: sunucudaki ad, varyant etiketleri, sipariş kalemleri, kopuk bağ sayısı, renk / kombinasyon kimlikleri, varyantlar,
kalem ve sipariş bağları (öncekiyle AYNI), ekrandaki (bellekteki) Tanımlar, rozet, bekleyen defter, çakışma şeridi, reddedilen yazma.

| Diğer | Sonuç |
|---|---|
| `./test/kosu.sh` 1.744.48 (iki düzeltmeyle) | 275/275 AYNI, birim testleri temiz |
| `ekran-b12-etkilesim.js` (B1/B2 × dört paket, Yönetici olmayan hesaplar) | 36 geçti · 0 kaldı |
| `ekran-tanim-yaris.js` karar_ucuncu · karar_degisti | 7/7 · 6/6 |
| **Sürüm geçişi 46 → 48 → 49** (`ekran-surum-gecis-48.js`): oturum, bekleyen kayıtlar, temel kayıt, B1 ad değişikliği, sunucu korumaları | PostgreSQL CRLF **27/27** · yerel Supabase **29/29** |

Ölçülmeyen: gerçek bulut, GitHub Pages önbelleği, kurulu uygulama (PWA) kabuğu, telefonda uzun arka plandan dönüş. 1.744.49 için tam
senaryo takımı koşulmadı (kod 1.744.44 ile aynı — 275/275; pakette yalnız sürüm satırları farklı).

## 5. Canlıda etkilenen renk taraması

`47-canli-ad-geri-yazma-tani-salt-okur.sql` — salt okur, onarım YOK. Aranan iz: eski ad defterindeki son ad ≠ şimdiki ad; Tanımlar ≠
stok tarafı; adı defterde geçen kopuk sipariş kalemi; adı defterde geçen ve şimdiki bir ad olmayan üretim / rezervasyon. Yerelde üç
durumda sınandı (hiç değişiklik yok → TEMİZ; doğru ad değişikliği → TEMİZ; ad Tanımlar yazmasıyla geri yazılmış → İNCELE, iki kimlik +
2 kopuk kalem). Sınırı: yalnız eski ad defterine girmiş (B1 ile değişmiş) adlara bakar; 2. maddedeki "diğer cihazın ton kodu / açıklama
değişikliğinin geri çevrilmesi" iz bırakmaz, sorguyla bulunamaz.

## 6. Yayın ve geri dönüş

1. Yayından önce (salt okur): `47-…` → GENEL "TEMİZ" beklenir (değilse önce sonuç değerlendirilir); `41-…` → "tutarlı".
2. Yayın (ayrı onay): `surum.json` → 1.744.48; klasörde 1.744.48 ve 1.744.49 birlikte.
3. Doğrulama: sürüm 1.744.48; giriş; günlük bir kayıt; bir renk adı değiştirildiğinde rozet kaybolmaz.
4. Cihazların hepsi 1.744.48'e geçene kadar 1.744.46'da kalan cihazda kural: renk adı değiştirdikten sonra sayfayı yenile.
5. **Geri dönüş (gerekirse, ayrı onay):** `surum.json` → 1.744.49 (1.744.44 kodu). Uygulama düşük numaraya dönmez; 1.744.47 kullanılamaz,
   1.744.46 bilinen hatası nedeniyle geri dönüş sayılmaz. Sunucudaki beş paket KORUNUR (1.744.44 kodu B1 kurulu sunucuyla sınandı;
   ad değişikliği eski yoldan gider, B2 koruması olmaz). Sonraki ileri sürüm en az 1.744.50.

## 7. Açık kalanlar

B3b, B6, Y1, kalıcı ret sebebinin ekranda doğrudan gösterilmemesi. Canlıda Yönetici olmayan hesap yok.
