# Yayın paketi — istemci 1.744.44 (27 Kasım)

**Durum:** HAZIR, ONAY BEKLİYOR. Bu dal (`claude/yayin-1-744-44`) main'e BİRLEŞTİRİLMEDİ; yayın yapılmadı. Bu pakette canlıya
yazan SQL YOK — sunucu tarafı 27 Kasım'da kuruldu, burada yalnız kaydı tutulur.

## 1. Canlı sunucu kaydı (sabit)

Ana proje `mqdgucoomgqcvhvgixbl`, 27 Kasım, kullanıcı SQL Editor'de çalıştırdı; son doğrulama `41-canli-paket-durum-salt-okur.sql`
(`f4d003b549f5e1f888c00c73c9ba8e7ec7a64d25dee55de3c705373d665842f8`): dört paket KURULU, iç fonksiyonlar kapalı, GENEL "tutarlı".

| Sıra | Paket | Dosya | SHA-256 |
|---|---|---|---|
| 1 | B4/B5 teslim / geri alma / iş verme | `27-b4-uygula.sql` | `f49078f2361e8546d59e6a0b9c5d52e0ace6474c47663ef2615478e2b327645d` |
| 2 | B3a tablo düzeyi yazma yetkisi | `28-b3a-uygula.sql` | `15f1051d5c9f652ac99d091fb329aea67ef35ef10adb82fee1cbe31ba3d38250` |
| 3 | B3a-2 alan / işlem düzeyi yetki | `29-b3a2-uygula.sql` | `ec3df68d922ba5d49e1f5b95bd795c4ff1982bd89472681a8c75df816a12986f` |
| 4 | Ret iletisi | `31-yetki-ileti-uygula-satirsonu.sql` | `98b4c1b4b3265984cafe627f777cf20119be08097e884f6b86954b8e0a046bad` |

Geri alma dosyaları (çalıştırma onayı YOK; ters sırayla): `31-yetki-ileti-geri-al-satirsonu.sql` `5c5b9521…6ff0f` ·
`29-b3a2-geri-al.sql` `8d471fcf…1d9c5` · `28-b3a-geri-al.sql` `c015689a…0ef3f` · `27-b4-geri-al-satirsonu.sql` `4dbe9e7e…e69c`.
KULLANILMAMALI: `27-b4-geri-al.sql`, `31-yetki-ileti-uygula.sql`, `31-yetki-ileti-geri-al.sql`, sorgular 34 / 36 / 37 (bkz. `42-SATIR-SONU-DAYANIKLILIK.md`).

Canlıda doğrulanan: B4/B5 TEK CİHAZ (kullanıcı, DENEME kayıtlarıyla: iş verme → teslim → Geri Al ×2). Canlıda doğrulanMAYAN: iki cihaz
koruması (yalnız yerelde), yetki kurallarının Yönetici olmayan hesapla davranışı (canlıda 3 Yönetici · 0 diğer).

## 2. Yayınlanacak dosyalar

| Dosya | SHA-256 | Not |
|---|---|---|
| `atolye-erp-v1.744.44.html` | `b87afc137406202b5e6180c3b97f31139581d3e79238eda51b0cb4252418a7e8` | yayınlanacak sürüm; bu dalda temiz derleme (`./yap.sh` çıkış 0) AYNI özeti verdi |
| `atolye-erp-v1.744.45.html` | `37c20323e6ccc9bb2afac2428143b94a22ff1dc970169965f2f65570e872f299` | GERİ DÖNÜŞ istemcisi: 1.744.37 kodu, yalnız sürüm bilgisi; yayınla birlikte klasörde hazır durur, `surum.json` onu GÖSTERMEZ |
| `atolye-erp-v1.744.37.html` | `bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a` | şu an yayında; yerinde kalır |
| `surum.json` | — | `1.744.37` → `1.744.44` (yayını başlatan TEK satır) |

`index.html`, `sw.js`, `manifest.json` DEĞİŞMEDİ. `atolye-erp-v1.744.35/36.html` silinir (`yap.sh`'ın olağan temizliği).

## 3. 1.744.44'ün 1.744.37'ye göre içeriği (yalnız istemci; hepsi sunucuda zaten kurulu kuralların ekran karşılığı)

- **1.744.41 — İşi Ver / Geri Al iletileri:** sunucu "zaten teslim alınmış / zaten geri alınmış / iş başkasına verilmiş" dediğinde ekran
  gerçek sebebi söyler; başarı sanılmaz (`078`, `080`, `100`, `310`).
- **1.744.42 — fiyat yetkisi:** satış fiyatı = sipariş düzenleme, alış fiyatı = muhasebe düzenleme, cari fiyat grubu = sipariş + cari
  düzenleme. Yetkisizde kutular kapalı; kayıt yolları yetkisiz fiyat alanını eski değeriyle gönderir, kaydın geri kalanı yazılır
  (`094 fiyatAlanYetkileri`, `100`, `152`, `160`, `260`, `265`).
- **1.744.44 — iptal / Geri Al düğmeleri:** silme yetkisi olmayana fiş iptali ve Geri Al düğmeleri gösterilmez; sunucu denetimi sürer
  (`094 fisIptalYetkisi`, `100`, `160`, `205`, `250`, `265`, `310`).
- Yönetici hesabında davranış değişmez (canlıdaki üç hesap Yönetici).

Kaynak farkı (main `526167e` → bu dal): `src/` 12 dosya, +511 / −311 satır (`.satir-haritasi.json` dahil). Dalın geri kalanı sınama
betikleri (`test/inceleme`, `test/sb`), sonuç dosyaları ve `stok-v2/guvenlik` altındaki SQL / belgelerdir; uygulamaya girmez.

## 4. Sınama özeti

| Sınama | Sonuç |
|---|---|
| `./yap.sh` (bu dal, temiz derleme) | çıkış 0; bütün denetimler temiz; paket özeti sabit |
| `./test/kosu.sh` 1.744.44 · 1.744.45 | 275/275 AYNI · 275/275 AYNI (önceki koşular; bu turda yinelenmedi) |
| **`test/inceleme/ekran-surum-gecis.js` — PostgreSQL, dört paket CRLF kurulum** | **25 geçti · 0 kaldı** (`sonuc-ekran-surum-gecis.txt`) |
| **aynı sınama — yerel Supabase (Kong → PostgREST / GoTrue), giriş ekrandan** | **29 geçti · 0 kaldı** (`sonuc-ekran-surum-gecis-supabase.txt`) |

Sürüm geçişi sınamasının ölçtüğü (iki kipte de):
- `surum.json` 1.744.44 olunca açık cihaz yenilemede kendiliğinden 1.744.44'e geçti; oturum korundu; Yönetici ürün adı + satış fiyatı
  kaydetti (yazma başlığı 1.744.44, HTTP 200).
- `surum.json` 1.744.45 olunca cihaz 1.744.45'e geçti; oturum korundu; aynı kayıt 1.744.45'ten yazıldı (HTTP 200).
- 1.744.44 ya da 1.744.37 adresi elle açılırsa da 1.744.45'e gidildi. `surum.json` 1.744.44 / 1.744.37'ye geri çevrilince 1.744.45
  yerinde kaldı — **uygulama düşük numaraya dönmez; geri dönüş yalnız daha yüksek numaralı dosyayla olur.**
- Yalnız stok yetkili personel: 1.744.44'te fiyat kutusu kapalı, ürün adı kaydı geçti; 1.744.45'e dönünce ürün adı kaydı yine geçti.
- Reddedilen yazma 0, sayfa hatası 0; dört paket sınama sonunda kurulu ve gövdeleri aynı; bulut projelerine istek 0.

**Yan gözlem (yayından bağımsız, 1.744.37'de de var):** yeni bir cihazdaki İLK giriş "bulut ön giriş" ekranından yapılır ve o yol
kullanıcı oturumunu (`oturum:aktif`) saklamaz — ilk yenilemede normal giriş ekranı bir kez daha gelir, sonra oturum korunur. Giriş
yapmış, yerleşik cihazlarda geçişte giriş istenmedi. Bu çalışmada değiştirilmedi.

**Bu sınamanın kapsamadıkları:** gerçek Supabase bulutu ve GitHub Pages önbelleği; kurulu uygulama (PWA) kabuğu ve `sw.js`; telefonda
10 dakikadan uzun arka plandan dönüş yolu (aynı `surumeOtomatikGec` işlevi, burada yalnız "açılış" yolu koşuldu); açık formu olan sekme
(çalışırken geçiş yapılmaz, şerit çıkar — tasarım gereği).

## 5. Yayın adımları (her biri AYRI onayla)

1. **Önkoşullar (karşılandı):** B4/B5 canlıda kurulu ✓ · geri dönüş istemcisi hazır ve sınandı ✓ · gece yedeği "SINAMA TAMAM" ✓
   (27.11). Yayından hemen önce `41-canli-paket-durum-salt-okur.sql` bir kez daha çalıştırılır (salt okur): dört paket KURULU olmalı.
2. **Yayın:** bu PR'ın main'e birleştirilmesi. GitHub Pages 1–2 dakikada yayına alır. Başka işlem yok; SQL yok.
3. **Doğrulama (kullanıcı, kendi cihazında):** uygulamayı yenile → sürüm 1.744.44 görünmeli; giriş; her gün yapılan bir kayıt (ör. ürün
   kartında küçük bir düzeltme) → "güncellendi". Deneme teslimi YAPILMAZ; ilk gerçek teslimde `39-canli-teslim-izle-salt-okur.sql`
   önce / sonra çalıştırılabilir.
4. **Cihazların geçişi:** her cihaz uygulamayı açtığında ya da 10 dakikadan uzun arka plandan döndüğünde geçer; açık duran sekmede
   "Yeni sürüm — Güncelle" şeridi çıkar. Bütün cihazların (bilgisayarlar, telefonlar) sürüm numarası tek tek kontrol edilir; geçmeyen
   cihaz olursa uygulama kapatılıp açılır. Geçiş tamamlanana kadar 1.744.37 ile 1.744.44 yan yana çalışır — ikisi de dört paketle sınandı.
5. **Geri dönüş (gerekirse; ayrı onay):** `surum.json` → `{"surum": "1.744.45", "url": "atolye-erp-v1.744.45.html", …}` tek satırlık
   değişiklik main'e alınır. Cihazlar 1.744.45'e (eski kod) kendiliğinden geçer. Sunucudaki dört pakete DOKUNULMAZ (1.744.37 kodu
   dört paketle uyumlu; canlıda bugün bu birleşim çalışıyor). SQL geri alma ayrı karardır ve istemci geri dönüşü için gerekmez.
   Geri dönüşten sonraki ilk ileri sürüm en az 1.744.46 olmalıdır.

## 6. Açık kalanlar (bu yayın KAPATMAZ)

- **B1/B2** (renk adı değişikliği tek işlem; Tanımlar sürüm koşullu yazma): bu adayda YOK, ayrı paket.
- **B3b** (RPC ile yazma genişliği: `alt_yaz`, `car_yaz`, `fis_kes` CVR): dört paketle de AÇIK.
- **B6** (ücret verisi: `bolumler`, `mesaiAyar`, `proses_ucretleri`): AÇIK, G-25'in işi.
- **Y1** ve eski sekmede kalıcı ret gösterimi: açık.
- "448 uyumlu · 0 açık" yalnız B3a-2 matrisinin kapsamı içindir; genel güvenliğin tamamlandığı anlamına gelmez.
- Ekrandan sınanmayan: `uretim_sil` kuralı, "Çeki sil", Fişler / ürün kartı / çek ekranlarındaki düğme gizlemesi; 1.744.44 B4'süz sunucuda.
- Üretim 10001 ve DENEME kartlarına dokunulmadı (kullanıcı kararı).
