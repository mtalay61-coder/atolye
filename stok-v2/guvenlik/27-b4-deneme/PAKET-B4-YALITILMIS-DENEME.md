# B4 / B5 — YALITILMIŞ, G-25'SİZ DENEME PAKETİ (29 Kasım 2026; ONAYA SUNULAN — hiçbir adım uygulanmadı)

> **Kapsam:**
> - Yeni, boş, ayrı bir Supabase projesi. Mevcut G-25 deneme projesine (`drtmnovafswzcmpacubl`) DOKUNULMAZ.
> - Canlıya (`mqdgucoomgqcvhvgixbl`) hiçbir şey yazılmaz, canlıda hiçbir şey çalıştırılmaz.
> - İstemci: yayındaki `atolye-erp-v1.744.37.html`, SHA-256 `bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a`.
> - Dal `claude/b4-uretim-teslim-koruma`. SQL özetleri `27-b4-PAKET.md` ile aynı; aşağıda yinelenir.

## Neden ayrı proje

- G-25 deneme projesinde `fis_kes` / `fis_iptal` G-25 tarafından değiştirilmiş. `27-b4-uygula.sql` oraya kurulmaz: önkoşul "FARKLI — DUR" der, bekçi hiçbir şeyi değiştirmez.
- B4 canlıdaki gövdelere (1.744.37) yazıldı. Denemenin anlamlı olması için deneme projesindeki üç gövde canlıyla **bayt bayt aynı** olmalı.

## Yapı nereden gelecek — KARAR GEREKİR

Yeni proje boş açılır; içine canlının yapısı kurulmalı. İki yol var, ikisi de senin onayını ister:

- **Yol A (önerilen) — yerel hizalı kopyadan yapı dökümü.**
  - Kaynak: senin gönderdiğin canlı dökümlerinden (25 / 25b CSV, 25c ile tamlığı doğrulandı) kurduğum yerel kopya. Yalnız yapı; veri yok.
  - Yerelde ölçüldü: döküm boş bir veritabanına kurulunca 115 fonksiyon / 117 tetikleyici / 36 politika kaynakla aynı; `27-b4-onkosul` **HAZIR**.
  - **Gerçek Supabase projesinde DENENMEDİ.** SQL Editor'ün dökümü nasıl böldüğü, satır sonlarını koruyup korumadığı ve ilk açılış için gereken başlangıç satırları (ör. `stk_ayar`) bilinmiyor; birkaç deneme turu gerekebilir.
  - Dosya depoya KONMAZ (canlı fonksiyon gövdelerinin tamamını içerir). Onay verirsen dosyayı doğrudan sana veririm.
- **Yol B — `kurulum_betigi()`.**
  - Canlının kendi kurulum üreticisi; ama canlı yapı dökümüne göre fonksiyon canlıda YOK (25 CSV'de satırı yok).
  - Kullanmak için önce canlıya `kurulum-betigi.sql` kurulmalı — canlıya yazma; bugünkü talimatına aykırı. Önermiyorum.

Aşağıdaki adımlar Yol A'ya göre yazıldı.

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
| (commit'te) | `stok-v2/guvenlik/27-b4-deneme/korumali-sunucu.js` | korumalı yerel sunucu — `DENEME_REF` ile; ana projeyi ve G-25 denemesini REDDEDER |

## Adımlar (sırayla; her adımın çıktısını paylaş — tutmazsa DUR)

### 0. Yeni proje (senin işlemin)

- Supabase'de yeni, boş bir proje aç (ör. "atolye-b4-deneme"). Kimliğini (20 karakter) ve **publishable** anahtarını not et.
- Gizli (secret / service_role) anahtar gerekmez, istenmez.

### 1. Yapı dosyası (benden)

- Onayından sonra yapı dökümünü ve SHA-256'sını veririm. Canlıda hiçbir şey çalıştırılmaz.

### 2. Yapıyı yeni projeye kur (YAZAR — yalnız yeni proje)

- Yeni projede SQL Editor → yapı dosyası → Run. Hata çıkarsa iletisini paylaş, devam etme.
- Ardından `27-b4-onkosul-salt-okur.sql` → beklenen: 1–3 **HAZIR**, 4 `yok`, **99 GENEL: HAZIR**.
- "FARKLI" çıkarsa DUR: gövdeler canlıyla bayt bayt aynı kurulmamış demektir (ör. Editor satır sonlarını değiştirmiş). B4 bu hâlde kurulmaz; md5'leri paylaş, hizalama adımı hazırlarım.

### 3. İstemci — korumalı sunucu, iki pencere = iki cihaz

```bash
DENEME_REF=<yeni-proje-kimliği> DENEME_ANAHTAR=sb_publishable_… node korumali-sunucu.js atolye-erp-v1.744.37.html bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a 8790
```

```bash
DENEME_REF=<yeni-proje-kimliği> DENEME_ANAHTAR=sb_publishable_… node korumali-sunucu.js atolye-erp-v1.744.37.html bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a 8791
```

- Pencere A `http://127.0.0.1:8790/`, pencere B `http://127.0.0.1:8791/`.
- Sunucu HTML özetini her istekte denetler. Tarayıcı yalnız yeni projeye ve esm.sh'a bağlanabilir (CSP).
- İlk açılışta Supabase › Authentication'da bir kullanıcı aç (Auto Confirm) ve uygulamanın kurulum ekranından ilk Yönetici'yi oluştur.

### 4. Deneme verisi (uygulamadan, yeni projede)

- Bir mamul ürün: bir renk, bir beden, proses ücreti (ör. Dikim 35 ₺).
- Bir Personel carisi.
- 10 çiftlik üç üretim (U1, U2, U3); her biri personele verilmiş ("İşi Ver").

### 5. ÖNCE — açığı gör (B4 kurulmadan)

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
  - Not: 1.744.37 istemcisi B'de yine "geri alındı" yazar; 8 sn içinde ekran düzelir. Bu ileti ayrı istemci düzeltmesidir (dal `claude/geri-al-ileti`, 1.744.41), bu denemenin parçası değil.
- **Olağan akış:** tek cihazdan teslim → Geri Al → yeniden teslim sorunsuz; kısmi teslim ve tamirli teslim sorunsuz.

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

1. Yol A ile ilerlemek ve yapı dosyasını (depoya konmadan) sana vermem.
2. Yeni projeye yazma: yapı kurulumu, deneme verisi, `27-b4-uygula.sql`.

Canlıya yazma, `main`, yayın, G-25 kapsam dışı.
