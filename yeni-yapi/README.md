# Atölye ERP 2 — yapı şeması

Canlı şema: https://claude.ai/artifact/H3p9BBWRBqhRRkQhLad7RJ (yalnız sahibine açık).

- `sema.html` — şema sayfasının kaynağı (çizim, denetim, yazım sırası, kılavuz). Kurallar `KURALLAR`
  ve `denetle()` içinde; sayfa her kayıttan önce aynı denetimi çalıştırır.
- `sema.json` — şema verisinin depodaki kopyası (moduller, tablolar, baglar, belgeler, kararlar, kilavuz).
  **Asıl veri sayfanın veritabanındadır**; bu dosya Claude'un kod yazarken okuduğu anlık görüntüdür.
  Kullanıcı şemayı değiştirdikten sonra Claude veritabanını okuyup bu dosyayı yeniler.
- `denetle.js` — aynı denetimi `sema.json` üzerinde komut satırından çalıştırır (`boz` eki kuralları
  bilerek bozulmuş bir şemayla dener).

## Kavramlar

- **Bağımlılık** (kimden → kime): kime, kimden olmadan çalışmaz; kimden önce yazılır. Yazım sırası ve
  faz denetimi yalnız bunlardan çıkar; döngü hata sayılır.
- **Tetik** (kimden → kime): kimdendeki olay kimede iş yaptırır. Yazım sırasını etkilemez.
- **Durum**: Taslak → Oturdu → Yazılıyor → Bitti. "Yazılmaya hazır" = oturdu, hatasız, dayandığı her
  modül bitti. Açık karar varken "Yazılıyor", kılavuzu yokken "Bitti" denetimde hata verir.
- **Kılavuz konusu**: bir modüle bağlı kullanıcı adımları. "Arkada ne olur" kısmı konunun belge
  tiplerinden ve modülün tetiklerinden kendiliğinden çizilir.

## Kodlamaya geçerken

Bir modül "hazır" olduğunda: şemadaki tabloları migration'a, belge tiplerini belge çekirdeğinin
tiplerine, kılavuz adımlarını ekran akışına çevir. Yazarken şemada eksik çıkarsa önce şema, sonra kod.
