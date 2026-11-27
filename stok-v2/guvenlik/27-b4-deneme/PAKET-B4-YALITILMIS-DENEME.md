# B4 / B5 — YALITILMIŞ, G-25'SİZ DENEME PAKETİ (29 Kasım 2026; ONAYA SUNULAN — hiçbir adım uygulanmadı)

> **Kapsam:**
> - Yeni, boş, ayrı bir Supabase projesi. Mevcut G-25 deneme projesine (`drtmnovafswzcmpacubl`) DOKUNULMAZ.
> - Canlıya (`mqdgucoomgqcvhvgixbl`) hiçbir şey yazılmaz, canlıda hiçbir şey çalıştırılmaz.
> - İstemci: yayındaki `atolye-erp-v1.744.37.html`, SHA-256 `bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a`.
> - Dal `claude/b4-uretim-teslim-koruma`. SQL özetleri `27-b4-PAKET.md` ile aynı; aşağıda yinelenir.

## Neden ayrı proje

- G-25 deneme projesinde `fis_kes` / `fis_iptal` G-25 tarafından değiştirilmiş. `27-b4-uygula.sql` oraya kurulmaz: önkoşul "FARKLI — DUR" der, bekçi hiçbir şeyi değiştirmez.
- B4 canlıdaki gövdelere (1.744.37) yazıldı. Denemenin anlamlı olması için deneme projesindeki üç gövde canlıyla **bayt bayt aynı** olmalı.

## Yapı dosyası (karar: yerel hizalı kopyadan, yalnız şema — 30 Kasım)

- **Dosya:** `b4-deneme-yapi.sql` — depoda DEĞİL; doğrudan sana verildi.
- **SHA-256:** `d777fb7ebcffa21ba57843f10fe306a21cbb8ca64eed4d6eb14a92c3ce328819` · 4734 satır · ~300 KB.
- **Üretim:** `pg_dump --schema-only --no-owner -n public` (yerel hizalı kopya) → `27-b4-deneme/yapi-uret.py`.
- **Biçim:** tek `do $$ … $$` bloğu + bir salt okur sayım sorgusu. Ya bütünüyle kurulur ya hiç.
  - Dosyada yalnız LF var; canlıdaki CRLF satır sonları kurulumda yeniden üretilir (pano / Editor satır sonlarını değiştirse de gövdeler canlıyla aynı kurulur).
  - Bekçi: `public` şeması boş değilse çalışmaz; `auth.jwt()` yoksa çalışmaz.
  - Başta Supabase'in `public` varsayılan yetkileri alınır, sonra kaynaktaki yetkiler verilir.
- **İçerik denetimi** (yardımcı tarayıcı + elle desen araması; ikisi de "kesin yok" garantisi değildir):
  - veri satırı: yalnız `stk_ayar` bayrak satırı (hangi v2 parçalarının açık olduğu; tarihleri kurulum anı). Başka INSERT / COPY yok; kalan `insert` / `update` satırlarının hepsi fonksiyon gövdesi (kod);
  - hesap, e-posta: yok (`@atolye.local` yalnız kullanıcı adından e-posta türeten kuralın metni);
  - parola: yok (`p_sifre`, `sifre_ozeti` parametre / sütun adları; değer yok);
  - anahtar / jeton (`sb_secret_`, `sb_publishable_`, JWT, `Bearer`, `apikey`): 0;
  - adres (`http://`, `https://`), proje kimlikleri, alan adı: 0.

**Yerelde kurulum sınaması** (Supabase benzeri boş veritabanı: `auth` + `extensions` + Supabase varsayılan yetkileri):
- Kurulum: 44 tablo · 18 görünüm · 115 fonksiyon · 117 tetikleyici · 36 politika · `stk_ayar` satırı 1 · diğer tablolarda veri satırı 0. İkinci çalıştırma bekçide durdu.
- `27-b4-onkosul`: **HAZIR** (üç gövde canlı md5'iyle aynı).
- **Kaynakla fark** (`yapi-karsilastir.py`, 25 sorgusunun iki çıktısı):
  - yerel kaynak kopyaya göre: yalnız nesne sahibi (`root` → `postgres`; canlıdaki gibi) ve veriye bağlı satırlar;
  - canlı 25 dökümüne göre: tablo, sütun, kısıt, indeks, görünüm, fonksiyon (115), dizi, tablo yetkisi **AYNI**. Farklar:
    - sütun düzeyi REFERENCES yetkisi (51 satır; yalnız canlıda);
    - `public` varsayılan yetkilerinde `service_role` ve TRUNCATE yok (yalnız sonradan açılacak tabloları etkiler);
    - ortam: depolama kovaları ve politikaları, `pg_cron` / `pg_net`, zamanlanmış iş, olay tetikleyicileri, roller;
    - veri: hesaplar, ERP kullanıcıları, giriş ayarı.
- **Dökümden kurulan veritabanında uygulama sınaması** (yayın paketleri, iki cihaz; sonuçlar `test/inceleme/sonuc-dokumden/`):

  | Koşu | Sonuç |
  |---|---|
  | 1.744.37, B4 YOK | çift kayıtlar görüldü (ör. eşzamanlı teslim mamul 20; yanıt kaybından sonra yeniden "Teslim Al" ikinci fişi kesti). Betik bu bozuk durumdan sonra T6'da durdu — tam sayı yok |
  | 1.744.37, B4 kurulu | **35/35** · "İşi Ver" **12/12** |
  | 1.744.41, B4 kurulu | **35/35** · "İşi Ver" **12/12** (ikinci cihaz "İş VERİLEMEDİ" diyor) |

  Dört koşuda canlıya / G-25 denemesine giden istek 0.
- **Gerçek Supabase projesinde henüz DENENMEDİ.** Bilinmeyenler: Editor'ün 300 KB'lık tek ifadeyi kabul edip etmeyeceği; gerçek Supabase girişinin kendisi (yerelde hesaplar ve `ilk-yonetici-uygula.sql` sınandı, yayın paketi iki hesapla açıldı; ama oturum jetonu taklit edildi).

## Yerelde ölçülenler (bu paketin dayanağı)

Sonuçlar `27-b4-PAKET.md` "Sınamalar" bölümünde. Özet:
- Canlı 25 CSV'sinin md5'leriyle birebir aynı üç gövdeyi taşıyan, G-25'siz yerel tabanda sınandı.
- **Yayın paketinin kendisiyle** (yukarıdaki SHA-256; `test/inceleme/yayin-ekran.js`) iki cihaz sınamaları koşuldu.
- Canlı ya da G-25 deneme projesine giden istek / WebSocket sayısı 0.

## Dosyalar ve özetler

| SHA-256 | Dosya | Tür |
|---|---|---|
| `76c5c3c4c4194db10bc61c68f367aef9964d280bc5b9ec8406620653140f1bba` | `stok-v2/guvenlik/27-b4-onkosul-salt-okur.sql` | salt okur — HAZIR / UYGULANMIŞ / FARKLI |
| `f49078f2361e8546d59e6a0b9c5d52e0ace6474c47663ef2615478e2b327645d` | `stok-v2/guvenlik/27-b4-uygula.sql` | **YAZAR** — B4 / B5 kurulumu (tek ifade) |
| `940c40262bf141d35093d999c30195e098ac730d21b2f9483636c0bb8c1036af` | `stok-v2/guvenlik/27-b4-geri-al.sql` | **YAZAR** (ayrı onay) — canlı gövdelere birebir dönüş |
| `bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a` | `atolye-erp-v1.744.37.html` | yayındaki istemci |
| `d777fb7ebcffa21ba57843f10fe306a21cbb8ca64eed4d6eb14a92c3ce328819` | `b4-deneme-yapi.sql` (depoda değil) | **YAZAR** — yeni boş projeye yapı |
| `b7d0714e2553075124db352154e697a68a944916ac04b1c3665273f3c1c74354` | `atolye-erp-v1.744.41.html` (dal `claude/geri-al-ileti`) | istemci 1.744.41 (yayınlanmadı) — adım 7b |
| `e6b0afd59cafae6445d913b67c6d801a8c7e773dfd4b7260926b8230a38ca8d7` | `stok-v2/guvenlik/27-b4-deneme/ilk-yonetici-uygula.sql` | **YAZAR** — deneme hesaplarını ERP listesine yazar (şifre yok) |
| `066741c15ec41eab6d0701a394458498be600b340774ba6b3eba1df8a2a0b1bb` | `stok-v2/guvenlik/27-b4-deneme/deneme-hesaplar-salt-okur.sql` | salt okur — ortam ve yetki doğrulaması |
| (commit'te) | `stok-v2/guvenlik/27-b4-deneme/korumali-sunucu.js` | korumalı yerel sunucu — `DENEME_REF` ile; ana projeyi ve G-25 denemesini REDDEDER |

## Adımlar (sırayla; her adımın çıktısını paylaş — tutmazsa DUR)

### 0. Yeni proje (senin işlemin)

- Supabase'de yeni, boş bir proje aç (ör. "atolye-b4-deneme"). Kimliğini (20 karakter) ve **publishable** anahtarını not et.
- Gizli (secret / service_role) anahtar gerekmez, istenmez.

### 1. Dosyayı doğrula

- `b4-deneme-yapi.sql` SHA-256'sı yukarıdakiyle aynı olmalı (`Get-FileHash` / `sha256sum`). Tutmazsa kullanma.

### 2. Yapıyı yeni projeye kur (YAZAR — yalnız yeni proje)

- Adres çubuğunda YENİ projenin kimliği olmalı (`mqdg…` ya da `drtm…` DEĞİL).
- SQL Editor → dosyanın tamamı → Run. Beklenen sonuç tablosu: tablo 44 · görünüm 18 · fonksiyon 115 · tetikleyici 117 · politika 36 · `stk_ayar` satırı 1 · diğer tablolarda veri satırı 0.
- Hata çıkarsa hiçbir şey kurulmamıştır; iletisini paylaş, devam etme.
- `27-b4-onkosul-salt-okur.sql` → 1–3 **HAZIR**, 4 `yok`, **99 GENEL: HAZIR**. "FARKLI" çıkarsa DUR.

### 2b. Kurulan yapının kaynakla farkı (salt okur)

- Yeni projede `25-canli-tam-yapi-salt-okur.sql` (dal `claude/guvenlik-inceleme`; SHA-256 `9d7f8ee1…`) → Export → CSV → bana gönder.
- CSV'yi canlı 25 dökümüyle `yapi-karsilastir.py` ile karşılaştırıp farkları raporlarım. Beklenen: yukarıdaki "canlı 25 dökümüne göre" listesi; uygulama nesnelerinde (tablo, sütun, kısıt, indeks, görünüm, fonksiyon, tablo yetkisi) fark 0.

### 2c. Deneme hesapları ve ilk Yönetici

Publishable anahtar hesap açamaz; servis (secret) anahtarı tarayıcıya ya da bana verilmez. Hesapları sen panelden açarsın:

1. Yeni projede Supabase paneli › Authentication › Users › **Add user › Create new user**, "Auto Confirm User" işaretli, iki hesap:
   - `denemeyonetici@atolye.local`
   - `denemestok@atolye.local`
   - Şifreleri sen belirlersin; bana ya da depoya yazılmaz.
2. Authentication › Sign In / Providers: yeni kayıt (sign-up) KAPALI olsun (canlıdaki gibi).
3. SQL Editor → `ilk-yonetici-uygula.sql` (YAZAR, tek ifade). Bu dosya iki hesabı ERP kullanıcı listesine yazar; şifre içermez.
   - DenemeYonetici = Yönetici.
   - DenemeStok = "Üretim" şablonu: üretim ve stok görüntüleme / düzenleme / kaydetme; sipariş ve fişler yalnız görüntüleme; silme ve para modülleri yok.
   - Bekçiler: Tanımlar satırı varsa, G-25 nesnesi varsa ya da hesaplardan biri panelde yoksa durur.
   - Beklenen sonuç: iki satır, `auth_hesabi_var` ikisinde de `true`.
4. Uygulamada giriş (adım 3'ten sonra): kullanıcı adı `DenemeYonetici` + panelde verdiğin şifre. İlk girişte "Hoş geldiniz — kurulum" sihirbazı çıkar; atlanabilir.

### 2d. Ortam ve yetki doğrulaması (salt okur)

- `deneme-hesaplar-salt-okur.sql` → her satır `tamam`, son satır **YALITILMIŞ DENEME ORTAMI: EVET**. Değilse sınama yapılmaz.
- Denetledikleri:
  - G-25 nesnesi yok;
  - kullanıcıların hepsi "Deneme…" ve auth hesabı var; listede olmayan auth hesabı yok;
  - giriş sistemi açık;
  - DenemeStok yetkileri tam olarak `fisler=g siparis=g stok=gdk uretim=gdk`;
  - "DENEME" ile başlamayan ürün / cari yok.
- Deneme verisi girildikten sonra (adım 4) ve sınamalardan önce bir kez daha çalıştır.

### 3. İstemci — korumalı sunucu, iki pencere = iki cihaz

```bash
DENEME_REF=<yeni-proje-kimliği> DENEME_ANAHTAR=sb_publishable_… node korumali-sunucu.js atolye-erp-v1.744.37.html bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a 8790
```

```bash
DENEME_REF=<yeni-proje-kimliği> DENEME_ANAHTAR=sb_publishable_… node korumali-sunucu.js atolye-erp-v1.744.37.html bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a 8791
```

- Pencere A `http://127.0.0.1:8790/`, pencere B `http://127.0.0.1:8791/`.
- Sunucu HTML özetini her istekte denetler. Tarayıcı yalnız yeni projeye ve esm.sh'a bağlanabilir (CSP).

### 4. Deneme verisi (uygulamadan, yeni projede)

Bütün kayıtlar **"DENEME"** ile başlar (2d bunu denetler); DenemeYonetici ile girilir:
- Bir mamul ürün "DENEME Bot": bir renk, bir beden, proses ücreti (ör. Dikim 35 ₺).
- Bir Personel carisi "DENEME Usta".
- 10 çiftlik üç üretim (U1, U2, U3); her biri DENEME Usta'ya verilmiş ("İşi Ver").

### 5. ÖNCE — açığı gör (B4 kurulmadan)

> Açığı yeniden üretme adımları YALNIZ bu yeni, yalıtılmış projede ve DENEME kayıtlarıyla yapılır. Önce 2d "EVET" demeli; korumalı sunucu
> ana projeye ve G-25 denemesine bağlanmayı zaten reddeder. Canlıda ya da G-25 denemesinde DENENMEZ.

- **U1:** A ve B kartı açar. A "Teslim Al" (10). B, sayfayı yenilemeden 8 saniye içinde "Teslim Al" (10).
- Beklenen (hata): mamul stoğu **20**, personel bakiyesi **−700**, Fişler'de iki geçerli ÜRT.
- B'nin ekranı önce tazelenirse form kapanır; "sınanamadı" yaz — bu durum yerelde kanıtlı.

### 6. B4 kurulumu (YAZAR — yalnız yeni proje)

- `27-b4-uygula.sql` → tamamı, bir kez Run.
- Sonuç tablosu: 1–3 **UYGULANMIŞ**, 4 `var`, **99 UYGULANMIŞ**.
- Hata çıkarsa hiçbir şey değişmemiştir.

### 7. SONRA — korumayı gör

- **U2 (çift teslim):** adım 5'in aynısı.
  - Beklenen: B'de "Teslim kaydedilemedi — hiçbir değişiklik yapılmadı (Bu iş başka cihazda zaten teslim alınmış … [KR030])".
  - Stok **10**, bakiye **−350**, tek ÜRT.
- **U3 (kısmi):** A sağlam 6 girer, teslim alır. B (yenilemeden, 8 sn içinde) 10 teslim almaya çalışır.
  - Beklenen: B reddedilir; stok +6, −210; kalan 4 ustada tek atama.
  - Sonra A kalan 4'ü teslim alır → toplam 10 / −350.
- **U2 (bayat Geri Al):** B sayfayı yeniler, U2 kartını açar. A "Geri Al" yapar ve yeniden teslim alır. B, 8 sn içinde eski teslimi "Geri Al" yapar.
  - Beklenen: stok ve bakiye değişmez; iş "Teslim Alındı" kalır; tek geçerli ÜRT.
  - Not: 1.744.37 istemcisi B'de yine "geri alındı" yazar; 8 sn içinde ekran düzelir. Düzeltmesi 1.744.41'de — adım 7b.
- **Olağan akış:** tek cihazdan teslim → Geri Al → yeniden teslim sorunsuz; kısmi teslim ve tamirli teslim sorunsuz.
- **Yetki (DenemeStok ile giriş):** teslim alabilir; "Geri Al" reddedilir (silme yetkisi yok) ve hiçbir kayıt değişmez; Cari ve Finans menüleri görünmez.

### 7b. Aynı sınamalar 1.744.41 ile (B4 kurulu)

- Korumalı sunucuları durdur; `atolye-erp-v1.744.41.html` ile yeniden başlat (dal `claude/geri-al-ileti`; SHA-256 belgenin sonunda).
- Yeni üretimlerle adım 7'nin tamamı: sonuçlar (stok, bakiye, fiş sayısı) 1.744.37 ile AYNI olmalı.
- Ek olarak iletiler:
  - **Bayat Geri Al:** B'de "… teslimi zaten geri alınmıştı … ve iş yeniden teslim alınmış — bu işlem yeni bir değişiklik yapmadı"; "geri alındı" DENMEZ; B'nin ekranı işi teslim alınmış gösterir.
  - **İki cihazdan aynı anda "İşi Ver":** bir cihaz "verildi", öteki "İş VERİLEMEDİ — bu üretim az önce başka bir cihazda değişti"; tek atama.

### 8. Sonuç

- `27-b4-onkosul-salt-okur.sql` → UYGULANMIŞ.
- Fişler ekranı: U2 ve U3'te üretim başına geçerli fiş sayısı beklenenle aynı.

## Geri dönüş

- Yeni proje atılabilir: işin sonunda silinebilir (senin kararın).
- SQL geri alma: `27-b4-geri-al.sql` (ayrı onay). Üç gövde canlı md5'ine birebir döner; önkoşul yeniden HAZIR.
- Canlıda hiçbir şey değişmediği için canlıya geri dönüş gerekmez.

## Durma koşulları

- Adım 2'de yapı kurulumu hata verdi.
- Adım 2'de GENEL ≠ HAZIR.
- Adım 6'da hata, ya da GENEL ≠ UYGULANMIŞ.
- Adım 7'de stok / bakiye iki kez yazıldı.
- Tarayıcı konsolunda ana projeye ya da G-25 denemesine giden istek.

## Onay istenen

1. Yeni projeye yazma: yapı kurulumu (`b4-deneme-yapi.sql`), `ilk-yonetici-uygula.sql`, DENEME verisi, `27-b4-uygula.sql`.
2. Yeni projede salt okur yapı dökümü (2b) ve CSV'nin bana gönderilmesi.

Canlıya yazma, `main`, yayın, G-25 kapsam dışı.
