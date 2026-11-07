# Tarayıcı senaryolarında 4 fark — kök neden incelemesi (7 Kasım)

İstek: "Dört farkı ayrı ayrı incele; eski sürümde de görülmelerini tek başına doğru davranış kanıtı sayma."
Yöntem: her fark için (1) farkı GETİREN değişiklik bulundu (bisect / dosya dosya geri alma / çapraz koşu), (2) uygulamanın
davranışı farktan bağımsız olarak doğrulandı (tohum verisi, kod okuma, piksel ölçümü), (3) yalnız kök neden kanıtlanınca test
düzeltildi. **Uygulama kaynağı (`src/`) değişmedi.** Dördünün de nedeni test düzeneği ya da ortam; uygulama hatası çıkmadı.
Ayrıca bir yan bulgu var (§5: ekran yazı tipi hiç yüklenmiyor — görsel, veri etkisi yok).

| Senaryo | Fark | Kök neden | Kanıt | Düzeltme |
|---|---|---|---|---|
| bekleyen-birak | onayda "2 ürün varyantı" | senaryo c6caeaf'ta değişti (POST'lar artık düşüyor); altın eski | çapraz koşu 2×2 | altın güncellendi |
| tedarik-girisleri | 4 alt fark | (a) senaryo sekmeyi iki kez tıklayıp kapatıyor, (b) wa.me ağ engeli, (c) LANG boş → Chromium Türkçe dosya adını reddediyor | ayrı ayrı yeniden üretildi | senaryo + ortak.js |
| resim-damga | logosuz "acik"→"diger" | örnekleme noktası yazının harf kenarına düşüyor (yazı tipine bağlı) | piksel (194,166,166) | ölçüm noktası |
| sekmeler | 59→60, 298→273 | bant yüksekliği yazı tipine, arama konumu üstteki "gönderilemeyen kayıt" şeridine bağlı | font ve şerit deneyleri | ölçüm göreli/oransal |

## 1. bekleyen-birak — onay metninde "2 ürün varyantı"

- **Bulma:** `git bisect run` (24f0c45 = altının commit'i, AYNI; HEAD FARKLI; 8 adım) → ilk FARKLI commit **c6caeaf** (1.744.3).
- **Ayırma:** c6caeaf'ın 9 `src/` dosyası tek tek eski hâline döndürüldü → 9'unda da FARKLI (fark uygulama kodundan değil).
  Çapraz koşu:

  | Uygulama | Senaryo + ortak.js | Sonuç |
  |---|---|---|
  | c6caeaf^ (eski) | c6caeaf^ (eski) | AYNI (eski altın) |
  | c6caeaf^ (eski) | c6caeaf (yeni) | "2 ürün varyantı" — YENİ METİN |
  | c6caeaf (yeni) | c6caeaf^ (eski) | AYNI (eski altın) |

- **Neden:** c6caeaf senaryoyu değiştirdi: bütün REST POST'ları düşürülüyor ("kural provasının başarılı RPC taklidi bekleyeni
  kendiliğinden temizlememeli"). Eski senaryoda taklit yanıt, tohumlanan iki varyant değişikliğini "gönderilmiş" sayıp defterden
  siliyordu — yani eski altın, takılı yazma senaryosunda bekleyenin bir kısmının SESSİZCE kaybolduğu hâli kaydetmişti.
- **Doğruluk:** tohum (`senaryo-bekleyen-birak.js` 11. satır) tam iki varyant değişikliği taşıyor (`u2|Siyah|40` sil, `u2|1001 - Siyah|40`
  yaz). Yeni metin onları sayıyor: **doğru**. Kullanıcı neyin bırakılacağını eksiksiz görüyor.
- **Düzeltme:** `test/altin-bekleyen-birak.txt` güncellendi (yalnız bu satır).

## 2. tedarik-girisleri — dört alt fark

Altın c00373e'de (17 Ekim) doğdu; o commit'te bile senaryo bu ortamda çöküyor (`null.click`) — altın bu ortamda hiç
üretilememiş. Bu yüzden "eskiden de FARKLI" bir şey kanıtlamıyordu; her alt fark ayrı izlendi (`dbg-tedarik` kopyası).

| Alan | Altın | Bugün | Kök neden | Kanıt |
|---|---|---|---|---|
| `kaynakSatirlari` (sevk matrisi) | 2 hücre, ikonlu | null | Sipariş kartı sekmeleri AÇ/KAPA (v1.547.0, `340-sipariskarti.jsx:1194` `setKartSekme(o => o === key ? null : key)`). Senaryo "Fişler"e iki kez tıklıyor: ilki açıyor (tedarik matrisi ölçülüyor — o alan altınla aynıydı), ikincisi KAPATIYOR | tıklama "kapalıysa aç" yapılınca alan altınla birebir |
| `fisAcildi` (alış satırına tıklayınca Fişler) | Fişler, görünür | Sipariş Yönetimi | Aynı neden: sekme kapalı, satır yok | aynı düzeltmeyle birebir |
| `whatsappAcildi` | wa.me/905321234567 | chrome-error://chromewebdata/ | `ortak.js` (c6caeaf) bütün dış adresleri kesiyor; açılan pencere ağ hatası sayfasına düşüyor — uygulamanın açtığı adres değil | wa.me yerel boş sayfayla yanıtlanınca adres birebir |
| `paylasim.dosya` | SAT-1 - Müşteri B | download | Bu konteynerde `LANG` boş. Chromium dosya sistemi kodlamasını UTF-8 sayamayınca Türkçe harfli `download` adını reddediyor. Uygulama doğru adı veriyor (`075-fis-ortak.jsx:300`) | ayrı deney: "Müşteri.html" → `download`; "Musteri B.html" → doğru; `LANG=C.UTF-8` ile "SAT-1 - Müşteri B.html" doğru |

- **Düzeltme:** senaryoda `fislerSekmesiniAc()` (yalnız kapalıysa tıklar; 3 yer); wa.me yerel yanıt (gerçek ağa çıkmaz);
  `ortak.js` Chromium'u UTF-8 yerel ayarla başlatır. Sonuç: **AYNI** (altına dokunulmadı).
- Gerçek cihazda dosya adı ve WhatsApp ölçülemiyor (CLAUDE.md'deki "ağ kısıtı" notu yalnız WhatsApp için doğruydu; diğer üçü değil).

## 3. resim-damga — logosuz damgada sağ üst "acik" → "diger"

- Ölçüm noktası (w − kenar − lw/2, kenar + 8) = (258, 17) logo içindir; logosuz damgada orada sağa yaslı yazı ("27322 D") var.
  Bu ortamdaki yazı tipiyle (Liberation Sans) nokta bir harfin kenarına düşüyor: piksel **(194, 166, 166)** → ne açık ne kırmızı
  → "diger". 258. sütun yukarıdan aşağı: `....##....+####......` (`.` = beyaz kutu, `#` = harf). Kutu yerinde, yazı yerinde;
  ölçüm yazı tipine bağlıydı.
- **Düzeltme:** logosuz ölçümde nokta (w − kenar − 1, kenar + 2): kutunun içinde, harflerin sağında (yazı w − kenar − 3'te biter)
  → piksel (255, 217, 217) "acik"; kutu çizilmezse kırmızı kalır (ölçüm hâlâ ayırt edici). Logolu ölçümler aynı nokta. Sonuç: **AYNI**.

## 4. sekmeler — bant 59→60 px, ilk içerik 298→273 px

- **Bant yüksekliği yazı tipine bağlı:** aynı kod, yalnız yazı tipi değiştirilerek: Inter (bu ortamın yedeği) 60, DejaVu / Liberation /
  FreeSans 60, DM Sans (uygulamanın istediği, yerel gömülü) **63**. Altındaki 59, başka bir ortamın yazı tipi.
- **Arama kutusunun konumu üstteki şeride bağlı:** yazı tipi 271–278 arası oynatıyor (25 px'i açıklamıyor). Arama ile başlık arasında
  "Buluta gönderilemeyen kayıt var" şeridi var; içeriği test ortamında hangi yazmaların düştüğüne bağlı. Deney: şeride 4 tablo daha
  eklenince şerit 40 → 70 px, arama **273 → 303**. Altındaki 298 ≈ iki satırlık şerit.
- Ölçülen şikâyetler (7 Eylül): "bant ekranın üçte birini kaplıyor", "başlıklar bilgiden fazla yer kaplıyor". Mutlak piksel bunları
  değil ortamı ölçüyordu.
- **Düzeltme:** `yukseklik` → `yukseklikOndaBirdenAz` (bant < pencerenin %10'u; eski hâl %33); `ilkIcerikUstu` →
  `ilkIcerikBaslikAltinda` (başlığın altı ile arama arası < 120 px; bugün 81). Altında yalnız bu iki alan değişti (sayı → true).
  `baslikBoyutu` (22px) ve diğer bütün alanlar aynı.

## 5. Yan bulgu (AÇIK, görsel): ekranda DM Sans hiç yüklenmiyor

`015-sabitler.jsx` `erpTokenCss()` en başa `@import url(…DM+Sans…)` koyuyor ve yorumunda "@import en başta olmalı (sonra gelen
@import tarayıcıda yok sayılır)" yazıyor. Ama ekranda `100-app.jsx:4464` bu metni büyük `<style>` bloğunun ORTASINA ekliyor →
tarayıcı @import'u yok sayıyor. Ölçüldü: sayfa açılışında yalnız `000-cekirdek`'in Space Grotesk / Inter / Plex isteği gidiyor; DM Sans
ve Archivo isteği hiç gitmiyor. `body { font-family: "DM Sans", system-ui, … }` cihazda DM Sans kurulu değilse sistem yazı tipine düşüyor.
Yazdırma çerçevelerinde (`075-fis-ortak.jsx:212, 255`) metin en başta → orada çalışıyor; ekran ile çıktı farklı yazı tipinde.
Veri etkisi yok. Düzeltmek `src/` değişikliği ve yeni sürüm ister — ayrı onaya bırakıldı (ACIK-ISLER madde 10).
