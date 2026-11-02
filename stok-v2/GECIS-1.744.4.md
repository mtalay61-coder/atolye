# Canlıya geçiş planı — 1.742.1 → 1.744.4 (HAZIRLIK; birleştirme ve SQL için son onay kullanıcıda)

**Durum:** 2 Kasım 2026. Kullanıcı kararı: "Önce hazırlık" ve "Önce onay düğmesi". Bu belge, paket ve PR hazır; **main'e
birleştirilmedi, `surum.json` değişmedi (1.742.1), canlı Supabase'e dokunulmadı.** SQL'i kullanıcı Supabase SQL Editor'da
çalıştırır (Claude'un canlı veritabanına erişimi yok ve olmamalı).

Geçişte AÇILMAYANLAR (ayrı karar): fiş kuralları (`19-fis-kural-ac.sql`), sürüm kapısı (`min_istemci_surum`), yabancı
anahtarların doğrulanması (`VALIDATE`). Bunlar kapalı kalır; korumaların çoğu kurallardan bağımsız çalışır (F1.1, F2, F3, F4, F8).

## 0. Neden birlikte ve kısa bir bakım aralığında

Yeni SQL ile eski 1.742.1 uygulaması ve eski SQL ile yeni 1.744.4 uygulaması birbirini tam tanımıyor:

- **Eski uygulama + yeni SQL:** sunucu yeni kurallarla reddeder (teslimli kalem silme, fazla teslim, iptal edilmiş siparişe bağ).
  Eski uygulamada "kalıcı ret" sınıfı yok: reddedilen kayıt bekleyen defterde dakikada bir yeniden gönderilir. Veri bozulmaz,
  yerel kayıt silinmez; ama şerit kapanmaz.
- **Yeni uygulama + eski SQL:** yeni uygulama `fis_iptal_toplu` (üretim teslimi toplu iptali) gibi canlıda olmayan işlevleri çağırır;
  o işlem hata verir.

Bu yüzden: **önce herkes uygulamayı kapatır → SQL → yeni uygulama yayına → herkes açar.** Canlıda işlem tabloları şu an boş
(Codex salt-okur kontrolü, 2 Kasım; 31 Ekim sıfırlaması) — veri riski düşük, en uygun zaman şimdi.

## 1. Geçişten önce (bugün, bakım aralığından bağımsız)

1. **Yedek:** Supabase panelinde Database › Backups — son günlük yedeğin tarihini not et (ya da elle yedek al).
2. **Salt-okur ön kontrol:** `stok-v2/canli-salt-okur-kontrol.sql` iki SELECT bölümünü SQL Editor'da çalıştır; bütün sayılar
   0 olmalı (Codex 2 Kasım'da 17 denetimde 0 gördü). Sıfır değilse DUR, sonucu bana ilet.
3. **PR'ı incele:** değişiklik listesi PR açıklamasında. Birleştirme onayını ver (ya da verme).

## 2. Bakım aralığı (yaklaşık 15 dakika)

1. **Herkes uygulamayı kapatsın** (bütün cihazlar, açık sekmeler). Bekleyen kayıt şeridi olan cihaz varsa önce "Yeniden dene"
   ile gönderilsin.
2. **SQL Editor — her dosya ayrı, bu sırayla** (dosyanın tamamını yapıştır, Run). Her biri birkaç saniye sürer; hata çıkarsa DUR:
   1. `stok-v2/editor/1-kurulum.sql`
   2. `stok-v2/editor/4-cari-kurulum.sql`
   3. `stok-v2/editor/7-siparis-uretim-kurulum.sql`
   4. `stok-v2/editor/9-kasa-kurulum.sql`
   5. `stok-v2/editor/15-duzeltme.sql`
   6. `stok-v2/editor/18-fis-defteri.sql`
   7. `stok-v2/editor/20-gece-denetimi.sql`
   8. `rls-kimlik.sql`
   Bu dosyaların hepsi tekrar çalıştırılabilir: yarıda kalırsa baştan aynı sırayla yeniden çalıştırmak zararsızdır (provada sınandı).
   **`19-fis-kural-ac.sql` ÇALIŞTIRILMAZ.**
3. **Gün sonu fonksiyonu:** Supabase › Edge Functions › gun-sonu: `supabase-gun-sonu-fonksiyonu.ts` içeriğini yapıştır, Deploy.
   (Canlıdaki sürümde karşılanan bölümü yok; yeni sürüm gece denetiminin yeni alanlarını okur.)
4. **Salt-okur kontrolü tekrarla** (madde 1.2) — yine 0 olmalı.
5. **Bana "SQL tamam" yaz.** Ben PR'ı main'e birleştiririm ve `surum.json`'u 1.744.4'e çeviririm. GitHub Pages 1–2 dakikada yayınlar.
6. **Bir cihazda aç:** sürüm 1.744.4 görünmeli. Bir deneme siparişiyle teslim → fiş → iptal yap; sonra deneme kayıtlarını
   bilinen yolla temizle (teslim geçmişi olan sipariş artık silinmez — iptal edilmiş olarak kalır; bu bilerek).
7. Herkes uygulamayı açabilir. Açık kalmış eski sekmeler kendiliğinden yeni sürüme geçer (açılışta / 10 dk arka plan dönüşünde).

## 3. Geri dönüş (gerekirse)

- **Uygulama:** `surum.json`'u 1.742.1'e geri çevirmek yeterli (1.742.1 HTML'i yerinde duruyor). Bunu ben yaparım.
- **SQL:** 1.744.x'ten 1.742.1'e tam dönüş `stok-v2/geri-donus-1.742.1.sql` (F2 dahil sınandı) — Codex'in 1.744.3 eklerini
  kapsamadığı için önce `stok-v2/geri-donus-1.744.3.sql`, sonra `geri-donus-1.742.1.sql`. **Ayrı onayla ve yalnız gerekirse.**
  Not: iki dosya ayrı ayrı sınandı (1.744.3 → F8 ve F2 → 1.742.1); art arda uygulanmaları yerelde sınanmadı — gerekirse önce provası yapılır.
  İşlem tabloları boşken geri dönüş de düşük risklidir.

## 4. Geçişten sonra kalanlar (ayrı kararlar)

1. **Fiş kurallarını açmak** (`19-fis-kural-ac.sql`) — eski yazma yollarını tamamen kapatır. Kural provası 0 eski yol yazması
   gösteriyor; önce birkaç gün 1.744.4'ün canlıda sorunsuz çalıştığı görülmeli.
2. **Sürüm kapısı** (`update stk_ayar set min_istemci_surum='1.744.4'`) — bütün cihazlar 1.744.4'e geçince. Eski sekmelerin
   yazmasını durdurur. Gün sonu fonksiyonu muaf (1.744.3 düzeltmesi).
3. **Yabancı anahtar doğrulaması** (VALIDATE) — salt-okur kontrol 0 iken güvenli.
4. **Supabase danışman bulguları** (Codex kontrolü): sabit `search_path` olmayan 14 fonksiyon, anon'un çağırabildiği SECURITY
   DEFINER fonksiyonlar, sızmış parola denetimi. Ayrıca incelenmeli.
5. **F5:** fiş defteri kuruluyken tam yedekten geri yükleme kapalı (Codex kararı). Politikası kullanıcıya ait.

## 5. Yerel kanıt

| Sınama | Sonuç |
|---|---|
| Geçiş provası (`stok-v2/test/butunluk/gecis-provasi.sh`): 1.742.1'in kendi kurulumu + kurallar kapalı → bu sıra Editor gibi → nesneler, gövdeler, kritik testler → ikinci uygulama | **Temiz.** 8 dosya Editor gibi (242 parça) hatasız; veri korundu (23 fiş, 16 hareket); kurallar kapalı kaldı, min sürüm NULL; sıfırdan kurulumun bütün işlevleri aynı gövdeyle ve bütün tetikleyicileri var (yalnız eskide kalan 4 göç/geçiş işlevi: zararsız, canlıda da var); 9 kritik test (sürüm kapısı / servis rolü, eski bağ, kilit sırası, iptal siparişe bağ, F3 sınırı, çek yarışı, seyrek alan, F2) yükseltilmiş veritabanında geçti; aynı sıra ikinci kez uygulandı, sonuç aynı. Çıktı: `test/butunluk/sonuc-gecis/`. Canlı şemada olup 1.742.1 test şemasında olmayan `uretim.rezervasyon_siparis_id` ve `stok_rezervasyonlari` provada geçişten önce eklendi. |
| Bütünlük koşucusu (sıfırdan kurulum, F0, F2, F3, F4, F8, finans, 1.744.3 düzeltmeleri) | Çıkış 0 (1.744.3 düzeltme turu; bu turda SQL değişmedi) |
| Geri dönüş sınamaları (`butunluk/geri-donus.sh`, `f0/geri-donus-1741.sh`) | 1.744.3 düzeltme turunda temiz |
| 1.744.4 birim + tarayıcı + kural provası | Birim 1649 ✓ / 0 ✗. Tarayıcı 256 AYNI (yeni `fazla-onay` dahil), 4 FARKLI — 1.744.3 turuyla aynı dört, bu turdan değil: `sekmeler`, `resim-damga` bilinen oynak; `bekleyen-birak` onay metni "2 ürün varyantı"nı da sayıyor (bilgi artışı); `tedarik-girisleri` Codex'in güncellediği senaryo — fiş bağlantısı "Sipariş Yönetimi"nde kalıyor; 1.744.0 istemcisiyle de aynı (önceki senaryo bu adıma varmadan çöküyordu), yayın engeli değil, senaryo bakımı gerekiyor. Kural provası 261 senaryo, 0 eski yol yazması, 0 hata. |
| Fazla teslim onayı (`test/senaryo-fazla-onay.js`, `test/birim-fazla-onay.js`) | Yönetici gerekçeyle keser, onay sunucuya gider; Yönetici olmayan durur, sunucuya istek gitmez |
