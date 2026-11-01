# TemaSecici

Tanımlar › Görünüm ekranında renk temasını seçtirir; seçim uygulamanın bütün renklerini birlikte değiştirir.

- Temalar `Atolye.TEMALAR`'dadır: Atölye (varsayılan), Gece, Deniz, Yüksek kontrast. Her temada her yazı çifti okunabilirlik eşiğini geçer (Yüksek kontrastta 7:1).
- Firma bir varsayılan tema seçer (Yönetici); her kullanıcı kendine başka tema seçebilir. İkisi de `ayar` tablosunda.
- Uygulama tek satırla uygular: `Atolye.temaUygula(id)` → `<html data-theme="…">`. Geçersiz kimlik Atölye'ye düşer.
- Serbest renk seçtirilmez: renk kutusundan rastgele seçilen ton okunabilirliği bozar. Yeni tema gerekiyorsa bu sisteme eklenir, denetimden geçer, sonra listede çıkar.
- Yazdırma ve Excel çıktısı temadan bağımsızdır; kâğıda her zaman açık zeminde basılır.
