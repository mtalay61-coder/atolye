# Atölye ERP 2 — yapı şeması

Canlı şema: https://claude.ai/artifact/H3p9BBWRBqhRRkQhLad7RJ (yalnız sahibine açık).

- `sema.html` — şema sayfasının kaynağı (çizim, denetim, yazım sırası, kılavuz). Kurallar `KURALLAR`
  ve `denetle()` içinde; sayfa her kayıttan önce aynı denetimi çalıştırır.
- `sema.json` — şema verisinin depodaki kopyası (moduller, tablolar, baglar, belgeler, kararlar, kilavuz).
  **Asıl veri sayfanın veritabanındadır**; bu dosya Claude'un kod yazarken okuduğu anlık görüntüdür.
  Kullanıcı şemayı değiştirdikten sonra Claude veritabanını okuyup bu dosyayı yeniler.
- `denetle.js` — aynı denetimi `sema.json` üzerinde komut satırından çalıştırır (`boz` eki kuralları
  bilerek bozulmuş bir şemayla dener).

## Tasarım sistemi

Canlı: https://claude.ai/artifact/PZKn1D9oKuRqeY9BctGby4 · kopyası `tasarim/`.
Örnek ekranlar (dört tema): https://claude.ai/artifact/AfF6jCq2jWZtL6YnXJyXtx · kaynağı `tasarim/ekran-ornekleri.html`.
Kullanıcının ERP arayüz standardı (`src/tema/erp-tokens.css`, `erp-icons.svg`) ve eski uygulamanın arayüz
kararları üzerine kurulu. Ekran yazmadan önce `tasarim/README.md`, `tasarim/ekran-kaliplari.md` ve
`tasarim/denetim-listesi.md` okunur. Değerler `tasarim/tokens.json`'dan, sınıflar `components/bundle.css`'ten,
araç çubuğu sırası, kısayollar, bildirim süresi, temalar, menü, aramalı seçici (`aramaliSecici`, `eslesme`) ve ikonlar
`components/bundle.js`'teki `window.Atolye`'den gelir. Uygulama bu davranışları yeniden yazmaz, buradan taşır.

## Prototip

`prototip/`: veritabanı olmadan tıklanabilir ekranlar (React + TypeScript + Vite). Önizleme:
https://claude.ai/artifact/9pSVfkv3ec7zn3a7aL5aqS. Kuralları `prototip/README.md`'de; ekranlar veriyi yalnız
`src/veri/kaynak.ts`'ten alır, bağlama zamanı yalnız o dosya değişir.

## Kavramlar

- **Bağımlılık** (kimden → kime): kime, kimden olmadan çalışmaz; kimden önce yazılır. Yazım sırası ve
  faz denetimi yalnız bunlardan çıkar; döngü hata sayılır.
- **Tetik** (kimden → kime): kimdendeki olay kimede iş yaptırır. Yazım sırasını etkilemez.
- **Durum**: Taslak → Oturdu → Yazılıyor → Bitti. "Yazılmaya hazır" = oturdu, hatasız, dayandığı her
  modül bitti. Açık karar varken "Yazılıyor", kılavuzu yokken "Bitti" denetimde hata verir.
- **Kılavuz konusu**: bir modüle bağlı kullanıcı adımları. "Arkada ne olur" kısmı konunun belge
  tiplerinden ve modülün tetiklerinden kendiliğinden çizilir.

## Renk yapısı (karar k-08)

İki ayrı liste; ikisi de uuid ile bağlı, ad hiçbir yerde anahtar değil.

- **Ürün renkleri** (`urun_renk`, `urun_renk_bilesen`): 1 renkli temel renkler kod, ad, görsel renk (hex) ve
  resim taşır. 2, 3… (en çok 6) renkli renk, renk sayısı kadar **sıralı hücreden** kurulur; her hücre 1 renkli,
  etkin bir renktir (iç içe kombinasyon yok). Renk sayısı saklanmaz, hücre sayısıdır. Ad hücrelerden
  önerilir (`Siyah-Beyaz`), elle değiştirilebilir. Kurallar: ad tekil; aynı renk iki
  hücrede olmaz; aynı sıralı kombinasyon iki kez olmaz (Siyah-Beyaz ≠ Beyaz-Siyah, 1. renk ana renk);
  varyantta kullanılan rengin kodu ve hücreleri kilitli; bir kombinasyonda hücre olan temel renk çok renkliye
  çevrilemez; kullanılan renk silinmez, pasife alınır.
- **Kodlar** numaratörden, kullanıcı yazmaz, hiç değişmez: ürün rengi 4 haneli ve 1000'den (çok renkli de
  sıradaki numarayı alır), hammadde değişkeni 3 haneli ve her tür kendi içinde 001'den.
- **Liste**: etrafı çizili, kendi içinde aşağı kayan kutu; başlık ve sütun süzgeçleri üstte sabit; satır sonunda
  Düzenle (kartı düzenlemede açar) ve Sil (kullanılan kayıtta "Pasife al") — tasarım sisteminin tanım listesi istisnası.
- **Hammadde değişkenleri** (`degisken_turu`, `degisken`): hammadde her zaman renkle çeşitlenmez. Tür
  (Deri rengi, Taban rengi, Deri kalınlığı, Fermuar boyu…) kartta görünen **etiketi** (Renk, Kalınlık, Boy)
  ve görseli (renk kutusu ya da yok) belirler. Hammadde kartı en çok bir tür seçer. Kod ve ad tür içinde tekil.
- **Reçete bağı**: reçete satırı "deri = 1. renk" der; model rengi seçilince hangi değişkenin kullanılacağı
  hücre sırasından gelir (Tanımlar → Reçete tetiği, g-083).
- Kuralların tek yeri: `prototip/src/veri/renk.ts` (saf fonksiyonlar). Veritabanında aynı kurallar benzersiz
  indeks, check ve komut fonksiyonu olarak durur.

## Kodlamaya geçerken

Bir modül "hazır" olduğunda: şemadaki tabloları migration'a, belge tiplerini belge çekirdeğinin
tiplerine, kılavuz adımlarını ekran akışına çevir. Yazarken şemada eksik çıkarsa önce şema, sonra kod.
