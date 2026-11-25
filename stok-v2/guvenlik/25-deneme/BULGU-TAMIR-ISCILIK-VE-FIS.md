# Bulgu (25 Kasım, kullanıcı — deneme 10005 / 10006): tamire ayrılan çiftlere işçilik ve ÜRT fişinde işçilik satırı

Durum: İNCELENDİ, DEĞİŞTİRİLMEDİ (iş kuralı kararı + istemci değişikliği gerekir; ayrı onay). G-25 dışı, ama ödeme tutarını doğrudan etkiler.

## 1. "8 sağlam + 2 tamir → 10 çift ücret"

Kullanıcı: "8 çift sağlam 2 çift tamir var, 8 çift ücret ödeyeceğine 10 çift ücret ödüyor".

Ölçülen (deneme): 10005 ve 10006'da teslim sağlam 8 + tamir 2 → işçilik **10 × 35 = 350 ₺**; tamir işi ayrıca 2 × 10 (10005) / 2 × 15 (10006).
Ustaya toplam: 350 + 30 = 380 ₺ (10006) — 2 kusurlu çift için hem ilk işçilik hem tamir ücreti.

Kaynak: `src/079-uretim-teslim.jsx` (işçilik bloğu) BİLEREK böyle:
`ucretliAdet = sonucToplam − hurdaAdet` (sağlam + tamir) ve yorum: "Tamir edilen çiftler için ücret ÖDENİR: iş yapıldı, kusur tamirde
giderilecek." Tamir ücreti tamir atamasına özel ("hatayı yapan usta bedelsiz düzeltebilir (0), ya da iş başka bir ustaya yaptırılıp ona ödenir").
Hurda ödenmez. Yani bu bir kod hatası değil, mevcut iş kuralı — ama kullanıcının beklentisiyle çelişiyor.

Karar seçenekleri (kullanıcıya):
- **A (bugünkü):** tamir çiftleri ilk teslimde ödenir; tamir ücreti ayrı (hatayı yapana 0 girilmesi beklenir).
- **B:** ilk teslimde yalnız SAĞLAM ödenir; tamire giden çiftin ilk işçiliği tamir SAĞLAM dönünce ödenir (tamir ücreti ayrıca, varsa).
- **C:** ilk teslimde yalnız sağlam ödenir; tamire giden çiftin ilk işçiliği hiç ödenmez, yalnız tamir ücreti.
B / C istemci (079) + G-25 sunucu bağ denetimi (işçilik miktarı ≤ sağlam, sonuç alt yükünden) birlikte değişmeli; geçmiş kayıtlar değişmez.

## 2. ÜRT fişinde işçilik satırı görünmüyor; BR. FİYAT boş

Ekran (ÜRT-261125008, 10005): satırlar yalnız stok — Deneme Bot G25 8, Deneme Hammadde G25 −10; BR. FİYAT / TUTAR boş; başlıkta 350 ₺.
İşçilik (10 × 35) fişte satır olarak YOK; 8 ile 350 arasındaki ilişki görünmüyor.

Kaynak: `src/250-fisler.jsx` (~340–360): fişte stok hareketi varsa ayrıntı YALNIZ stok satırlarından kurulur; birim fiyat cari satırından
`urunAd|renk|beden` anahtarıyla taşınır. İşçilik cari satırında beden yok (stok satırında 40) → eşleşmez → BR. FİYAT boş. İşçilik satırı
ürün adlı olduğu için "yapısız" listesine de girmez → hiç gösterilmez. Sunucudaki kayıt doğru (car_hareket: 10 adet × 35, tutar 350).
Öneri: ÜRT fişinde cari işçilik satırları stoktan ayrı "İşçilik — <proses> · adet × ücret = tutar" satırı olarak gösterilsin (istemci
değişikliği; yeni sürüm; ayrı onay).
