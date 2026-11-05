# Tarayıcıdaki dört fark — 1.744.9

Başlangıç: PR #348, `82fc011`; dal: `codex/tarayici-dort-fark`.

## Düzeltilen gerçek hata

Tam ekran sipariş kartındaki alış fişine basıldığında Fişler modülü açılıyor,
ancak sipariş penceresi önde kaldığı için hedef görünmüyordu.
`fiseGit` artık aktif pencereyi küçültür; sipariş sekmesi ve girilmiş değerler korunur.
İstemci sürümü 1.744.9 yalnız geliştirme dalındadır.

## Test farklarının nedenleri

| Senaryo | Neden ve değişiklik |
|---|---|
| tedarik-girisleri | Zaten açık olan Fişler bölümünü tekrar tıklamak geçmişi kapatıyordu. Test görünür bölümü açar, gerçek alış satırına tıklar ve siparişin küçüldüğünü de doğrular. WhatsApp pop-up isteği yerel yanıtlanır. |
| bekleyen-birak | Tohum iki ürün varyantı değişikliği içeriyor; onay metni bunları doğru sayıyor. Eksik altın beklenti düzeltildi. |
| sekmeler | Fonta bağlı tam piksel yerine görünürlük, 64 px kompakt bant ve içerik için 300 px üst sınırı ölçülür. |
| resim-damga | Harf kenarındaki tek piksel yerine damga zemininin çoğunluğu ölçülür; mavi logo ve fotoğraf köşesi ayrıca doğrulanır. |

## Doğrulama

- `./yap.sh`: derleme ve tüm kod denetimleri temiz.
- Dört hedef tarayıcı senaryosu ayrı ayrı altın çıktıyla aynı.
- Toplu regresyon sonuçları aynı dizindeki `test/tarayici-dort-fark/` altında kaydedilir.
- İlk toplu koşunun bir kısmı Chromium kurulmadan başladı; eksik çalıştırılabilir dosya / ETXTBSY sonuçları uygulama testi sayılmadı, kurulumdan sonra yeniden koşuldu.

## Kapsam

SQL, canlı veri, main, dağıtım ve `surum.json` değiştirilmedi.
Derleme betiğinin otomatik kaldırdığı 1.744.5 / 1.744.6 HTML dosyaları geri konuldu.
PR #348'in sunucu/yedek/cihaz kontrolü gibi diğer açık işleri bu düzeltmeyle kapanmaz.
