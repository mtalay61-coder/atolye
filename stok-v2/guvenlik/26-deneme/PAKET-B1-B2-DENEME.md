# B1 / B2 — İLK GÜVENLİK PAKETİ · DENEME PROJESİ UYGULAMA PAKETİ (28 Kasım 2026; ONAYA SUNULAN)

> **YALNIZ deneme projesi `drtmnovafswzcmpacubl`.**
> - Canlıya (`mqdgucoomgqcvhvgixbl`) hiçbir şey uygulanmaz.
> - `main`'e birleştirme, `surum.json` değişikliği ya da yayın yok.
> - G-25 ve yeni özellikler bekliyor.
>
> Bu belge onay ister; onaysız hiçbir adım yazma yapmaz. Salt okur sorgular (adım 0) onaysız çalıştırılabilir.

## Ne denenecek

**B1 — renk adı değişikliği sunucuda tek işlemde.**
- `tanim_renk_ad_degistir` Tanımlar'ı ve adın geçtiği bütün kayıtları tek işlemde, kilitli günceller. Kayıtlar: kalem, üretim, rezervasyon, koli, reçete, resim, barkod.
- Eski ad defteri (`tanim_ad_gecmisi`) tutulur.
- Bayat cihaz eski adla yeni kayıt gönderirse kayıt güncel ada bağlanır. Belirsiz durumda KR025 / KR027 ile reddedilir.
- İstemci 1.744.40'ta sunucu fonksiyonu yoksa ad değişikliği reddedilir; eski yola dönülmez.

**B2 — Tanımlar sürüm koşullu yazılır.**
- Çakışmada sessiz ezme yok: güvenli birleştirme ya da açık "İnceleme gerekiyor" şeridi çıkar.
- Eşzamanlı eklemede kodlar ayrılır.
- Sunucuda kurulum GEREKMEZ: `tanimlar.surum` sütunu ve `tanimlar_surum` tetikleyicisi zaten var (adım 0a, 10. satırda denetlenir).

## SABİT — commit ve özetler

- **Commit:** `c6ee52acf7addea51b72f3b743f7ac50f2ae8008` (dal `claude/b1-b2-birlesik`).
- Dosyalar bu commit'te birebir bu özetlerle durur. İndirdikten sonra her dosyanın SHA-256'sı karşılaştırılır (`Get-FileHash` / `sha256sum`); tutmayan dosya kullanılmaz.

| SHA-256 | Dosya | Tür |
|---|---|---|
| `3796238dff853d749613e68b760c18c1712c7b212510afa3f2fae055fffbc8ba` | `stok-v2/guvenlik/26-deneme/26-deneme-durum-salt-okur.sql` | salt okur — uyum (GENEL: UYUMLU) |
| `63aa5ad734a8f94e5c7f1d723ae508ec218f2d45bc7596b40ed33982dd8b0af7` | `stok-v2/guvenlik/25-deneme/deneme-paket-durumu-salt-okur.sql` (dal `claude/g25-sql`, değişmedi) | salt okur — G-25 aşaması |
| `6f7708f38ae0781fa2261945446d069628bd3bf147f0faf15a4566669ac38037` | `stok-v2/guvenlik/26-b1-onkosul-salt-okur.sql` | salt okur — B1 kurulu mu (6 kontrol + GENEL) |
| `e947942f9d2c6c802338f4e4ff680efe1a961c2e2d82b0eb3ac6cc401f968617` | `stok-v2/guvenlik/26-deneme/26-anlik-goruntu-salt-okur.sql` | salt okur — 19 tablonun sayı + içerik özeti |
| `ab9661824335b39d8a1cfc1bc3b1aa9ff79bcf04ea4ad85b2628c77a1d176108` | `stok-v2/guvenlik/26-b1-uygula.sql` | **YAZAR** — B1 kurulumu (tek ifade, atomik) |
| `cb255a0cc9101d8eee9d5290d2c1ec843563c0c86f8500351fe66b3cfc4efba3` | `stok-v2/guvenlik/26-deneme/26-deneme-sonuc-salt-okur.sql` | salt okur — sınama sonrası |
| `51aee57ccd384f8e94ce0ae57f53d172bc0ef2c3b7df4de57e7dd6ee3b3eef85` | `stok-v2/guvenlik/26-b1-geri-al.sql` | **YAZAR** — geri alma (AYRI onay) |
| `f49d5fa52e050f62c11e018fbd2ec5ce60cc27c912c10cf50028f8b9ffbcb41a` | `atolye-erp-v1.744.40.html` | istemci 1.744.40 (B1 + B2; yayınlanmadı) |
| `e931a6814d77c9bb2c630d3dd3e3498dc7e1e58241e8db0489706dcbf495a219` | `stok-v2/guvenlik/26-deneme/korumali-sunucu.js` | korumalı yerel sunucu (G-25 denemesindekiyle birebir) |
| `c5ab26aad8e86ecd01551cda7d392f6f733165e883fb8acfefcb8bf8b00abf8f` | `stok-v2/guvenlik/26-b1-renk-ad-degistir.sql` | kaynak (okunur; Editor'e YAPIŞTIRILMAZ — `26-b1-uygula.sql` bundan üretilir) |

**SQL dosyaları neden ayrı:**
- `26-b1-uygula.sql` ve `26-b1-geri-al.sql`, `26-b1-uret.py` ile kaynaktan üretilir. Her biri TEK `do $$ … $$` ifadesi ve ardından bir salt okur doğrulama sorgusudur.
- SQL Editor ifadeleri ayrı isteklerle gönderebilir; `begin`/`commit` Editor'de atomiklik vermez.
- Fonksiyon gövdeleri kaynaktan kurulanla bayt bayt aynı (P2).

## Yerelde ölçülenler (bu commit; canlıya / denemeye dokunulmadı)

**Taban:**
- `inc_g25`: canlıya hizalı taban + deneme projesinin son ölçülen G-25 hâli (eski paket `fcc5429c` + 25b `5ba5620a` + tanimlar okuma yetkisi `dd98bfd5`). G-25'in kendi aşama sorgusu "G-25 + 25b (sırada 25c, sonra 25d)" dedi.
- Karşılaştırma için G-25'siz `inc_tam`.

| Sınama | Sonuç |
|---|---|
| `t-26-paket.sh` (`inc_g25` / `inc_tam`) | **31/31 · 31/31**, alt adımlar aşağıda |
| `b1-sina.js` — `inc_g25` / `inc_tam` × (kaynak / üretilen dosya) | **78/78** dört bileşimde |
| G-25 ücret onayı (25b mühür) | Ad değişikliğinden sonra GEÇERLİ kaldı; `g25_ucret_guncel` renge bakmıyor (elle, `inc_g25`) |
| Ekran, istemci 1.744.40, `inc_g25` + B1 | `ad-bag` bayat 4/4, kontrol 4/4 · `ekle` 5/5 · `cakisma kod` 6/6 · `karar_ucuncu` 7/7 · `karar_degisti` 6/6 · `ad_yaris` 4/4 |
| `cakisma ad` | **uygulanamaz**: birleşik istemcide ad değişikliği B2'nin Tanımlar yazmasıyla değil, B1 sunucu işlemiyle gider. Karşılığı `ad_yaris` (ilk gelen kazanır, ikinci KR021 ile açık ret). G-25'siz `inc_tam_b1`'de de aynı 3 ✗ çıktı: G-25 kaynaklı değil. |
| Korumalı sunucu (1.744.40 HTML) | **11/11** — ana proje REST / auth CSP ile engelli; ana proje seçiliyken bile ağa çıkan istek 0 |

`t-26-paket.sh` alt adımları:
- **P1** — Kurulum → önkoşul KURULU. 19 tablonun anlık görüntüsü kurulum öncesiyle AYNI (`tanim_ad_gecmisi` hariç, o yeni ve boş).
- **P2** — Gövde, tetikleyici ve yetkiler kaynaktan kurulanla AYNI.
- **P3** — Editor gibi 2 parça ayrı isteklerle → KURULU.
- **P4** — Son adımda bozma → hiçbir B1 nesnesi yok, veri AYNI.
- **P5** — Ad değişikliğinden sonra geri alma → KURULU DEĞİL; defter satırları kaldı, diğer veri AYNI.
- **P6** — Geri almanın bozması → hiçbir şey kalkmadı.
- **P7** — Yeniden kurulum → eski defterle eşleme çalışıyor.
- **P8** — İkinci Run → hatasız, veri AYNI.

Sonuç dosyaları bu klasörde (`sonuc-*.txt`).

## Adımlar (sırayla; her adımın çıktısını paylaşın — tutmazsa DUR)

### 0. Salt okur (onaysız çalıştırılabilir, hiçbir şey yazmaz)

| | Dosya | Beklenen |
|---|---|---|
| 0a | `26-deneme-durum-salt-okur.sql` | 1. satırda proje adres çubuğunda `drtmnovafswzcmpacubl`; 2–7 ve 10–12 `tamam`; 7 "0 fonksiyon · 0 tablo · 0 tetikleyici"; **99 GENEL: UYUMLU** |
| 0b | `deneme-paket-durumu-salt-okur.sql` | 5. satır **"G-25 + 25b (sırada 25c, sonra 25d)"** |
| 0c | `26-b1-onkosul-salt-okur.sql` | 99 **KURULU DEĞİL** (1, 2, 3, 6 "yok"; 4, 5 "0 etkin") |
| 0d | `26-anlik-goruntu-salt-okur.sql` | Çıktıyı **"önce"** olarak saklayın (19 satır; `tanim_ad_gecmisi` "yok") |

0b'de başka bir aşama çıkarsa (ör. 25c / 25d uygulanmış) DUR: yerel sınama o aşamada yeniden yapılır.

### 1. B1 kurulumu (YAZAR — onay gerekir)

- `26-b1-uygula.sql` → SQL Editor'de dosyanın tamamı, **bir kez Run**.
- Beklenen sonuç tablosu: 1 `var, definer=true, authenticated=true, anon=false` · 2–3, 6 `var` · 4 `4 etkin` · 5 `1 etkin` · **99 KURULU**.
- Hata çıkarsa hiçbir şey değişmemiştir (P4); mesajı paylaşın.
- Ardından `26-anlik-goruntu-salt-okur.sql` → **"önce" ile 18 satır AYNI** (sayı ve özet); yalnız `tanim_ad_gecmisi` "yok" → `0 · bos`.

### 2. İstemci (korumalı sunucu, yalnız deneme projesine bağlanır)

İki pencere = iki cihaz (ayrı köken = ayrı yerel depo):

```bash
DENEME_ANAHTAR=sb_publishable_… node korumali-sunucu.js atolye-erp-v1.744.40.html f49d5fa52e050f62c11e018fbd2ec5ce60cc27c912c10cf50028f8b9ffbcb41a 8790
```

```bash
DENEME_ANAHTAR=sb_publishable_… node korumali-sunucu.js atolye-erp-v1.744.40.html f49d5fa52e050f62c11e018fbd2ec5ce60cc27c912c10cf50028f8b9ffbcb41a 8791
```

- Yalnız AÇIK (publishable) anahtar kullanılır; gizli anahtar istenmez ve sunucu onu reddeder.
- Pencere **A** `http://127.0.0.1:8790/`, pencere **B** `http://127.0.0.1:8791/`. İkisinde de deneme Yönetici hesabıyla giriş.
- Sürüm `v1.744.40` görünmeli. Konsolda ana proje isteği varsa CSP ile engellenmiş olmalı.

### 3. Elle sınamalar (YAZAR — deneme verisine EK kayıt; mevcut kayıt silinmez / sıfırlanmaz)

Bütün yeni kayıtlar **"DENEME"** önekiyle açılır.

**T1 — Bayat cihazdan eski adla kayıt (B1'in asıl sınaması):**
1. A, Tanımlar'da "DENEME Mavi" rengini ekler.
2. B sayfayı yeniler. B, yeni sipariş formunu açar, bir ürün seçer, renk olarak "DENEME Mavi"yi seçer ve kaydetmeden bekler.
3. A, "DENEME Mavi" adını "DENEME Lacivert" yapar.
4. B, 1 dakika içinde kaydeder.

Beklenen:
- sipariş kaydedilir;
- sunucuda kalemin rengi **"DENEME Lacivert"**;
- sonuç sorgusu 1. satırda defter "… · DENEME Mavi → DENEME Lacivert"; 2. satır `0`.

**T2 — İki cihaz aynı rengin adını birlikte değiştirir:**
1. A ve B Tanımlar'da "DENEME Lacivert" düzenleme kutusunu açar.
2. A "DENEME Gece" yapar ve kaydeder.
3. B, sayfayı yenilemeden "DENEME Koyu" yapar ve kaydeder.

Beklenen:
- B'de "ad bu arada değişmiş" (KR021) iletisi çıkar, hiçbir şey değişmez;
- sunucuda ad "DENEME Gece".

**T3 — Eşzamanlı renk ekleme (B2):** A "DENEME Kırmızı", B "DENEME Yeşil" ekler, birkaç saniye arayla. Beklenen: ikisi de kalır; sonuç sorgusu 6. satır `0 · 0` (ton / barkod kodu çakışmıyor).

**T4 — Aynı alanda çakışma (B2, isteğe bağlı):**
1. A ve B aynı DENEME renginin ton kodunu farklı değerlere getirir.
2. B, A kaydettikten sonra 8 saniye içinde kaydeder.

Beklenen:
- B'de "İnceleme gerekiyor" şeridi çıkar;
- "Sunucudakini al" / "Benimkini uygula" seçimi sunucuya yansır.

Zamanlama tutmazsa (B önce tazelenirse) "sınanamadı" yazılır; yerelde kanıtlı (`karar_*`).

### 4. Sonuç (salt okur)

- `26-b1-onkosul-salt-okur.sql` → **KURULU**.
- `26-deneme-sonuc-salt-okur.sql` → 2–4 `0`; 6 `0 · 0`; 1 ve 5 sınamalara uygun.
- `26-anlik-goruntu-salt-okur.sql`: "önce" ile farklı çıkması BEKLENEN tablolar yalnız `tanimlar`, `stk_renk`, `siparisler`, `siparis_kalemleri`, `tanim_ad_gecmisi`. Başka bir tablo farklıysa DUR ve paylaşın.

## Geri dönüş planı

1. **İstemci:** korumalı sunucuları durdurun (Ctrl+C). Deneme projesi önceki istemcisiyle açılabilir. Canlı cihazlara ve `erp.newdiamond.com.tr`'ye etkisi yok: ayrı köken, CSP ile ana proje engelli.
2. **SQL — yalnız AYRI onayla:** `26-b1-geri-al.sql` (tek ifade).
   - Tetikleyiciler ve 5 fonksiyon kalkar. `tanim_ad_gecmisi` tablosu ve satırları KALIR; ad geçmişi veri sayılır.
   - Sonra `26-b1-onkosul` → KURULU DEĞİL.
   - Yerelde ölçüldü (P5–P7): diğer veri değişmez; yeniden kurulum eski defterle çalışır.
   - Geri almadan sonra 1.744.40 ad değişikliğini REDDEDER ("Hiçbir kayıt değişmedi"). Ad değiştirme gerekiyorsa istemci de eskiye döner.
3. **B2:** sunucu parçası yok; geri dönüş = istemciyi değiştirmek.
4. **Sınama verisi:** DENEME kayıtları silinmez ("mevcut kayıtları silme"). İstenirse uygulamadan pasif yapılır (ayrı karar).

## Durma koşulları

- 0a ≠ UYUMLU · 0b ≠ "G-25 + 25b …" · 0c ≠ KURULU DEĞİL.
- Kurulum hata verdi · kurulum sonrası anlık görüntüde `tanim_ad_gecmisi` dışında fark var.
- T1'de kalem eski adda ya da bağı kopuk (sonuç 2 ≠ 0).
- Sürüm `v1.744.40` değil · ana projeye giden istek görüldü.

## Onay istenen

1. Yalnız deneme projesinde, SHA-256'sı `ab966182…` olan `26-b1-uygula.sql`'in **bir kez** uygulanması.
2. Yukarıdaki elle sınamalar için deneme projesine DENEME önekli **ek kayıt** yazılması: renkler ve bir sipariş. Mevcut kayıt silinmez / sıfırlanmaz.
3. **Kapsam dışı (ayrı onay):** geri alma, canlı, `main`, yayın, G-25 (25c / 25d).
