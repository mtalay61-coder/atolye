# F2 — Teslim geçmişi olan sipariş kalemi (TASARIM — uygulandı, yalnız geliştirme dalında; sonuç: VERI-TUTARLILIGI-F2.md)

**Durum:** 2 Kasım 2026, dal `claude/f2-teslimli-kalem` (F1.1 üzerine, `cb33912`). Kodlama izni verildi ve uygulandı
(K1–K6 önerileriyle); sonuçlar `VERI-TUTARLILIGI-F2.md`. Aşağıdaki "bugünkü" ölçümler F2 ÖNCESİ (F1.1 SQL) durumdur. Canlıya geçiş onayı YOK.

**Kullanıcı hedefi (2 Kasım):** "Teslim geçmişi bulunan sipariş kalemlerinin silinmesi, başka kalemle birleştirilmesi veya
ürün/renk/beden kimliğinin değiştirilmesi sonucunda hiçbir fiş ya da stok hareketi sahipsiz kalmamalı."

**Aynı mesajdaki karar (F1.1):** Bayat veriyle bağı diriltme reddi aynen kalır. Ama reddedilen işlem bekleyen kayıt defterinde
sonsuz otomatik tekrara girmemeli. Yerel kayıt silinmeden açık hata gösterilmeli ve kayıt "inceleme gerekiyor" durumuna alınmalı.

## 0. Bekleyen defter: kalıcı sunucu reddinde bugünkü davranış (ölçüldü)

**Testler:**
- `test/f2/t-bekleyen-red.js`: gerçek yazma yolu `040 tabloYaz → supabaseTabloEsitle → stk_yaz`, F1.1 SQL, kurallar kapalı. Bugünkü (1.743.0) ve eski (1.742.1) istemciyle.
- `test/f2/senaryo-kalici-red.js`: gerçek uygulama tarayıcıda, saat 10 dk ileri sarılır.

| Kontrol | 1.743.0 | 1.742.1 | Not |
|---|---|---|---|
| Sunucu bağı diriltmez | ✓ | ✓ | F1.1 koruması |
| Yerel kayıt silinmez | ✓ | ✓ | `tabloYaz` yereli önce yazar |
| Gönderilemeyen fark kalıcı deftere yazılır | ✓ | ✓ | `bekleyenKayitEkle` |
| **Otomatik tekrar yok** | ✗ her tekrarda yeniden `stk_yaz`, deneme 1→5 | ✗ aynı | `100-app bekleyenleriYenidenGonder`: her 60 sn ve "online"da, sınırsız, geçici / kalıcı ayrımı yok |
| **"İnceleme gerekiyor" durumu** | ✗ yok | ✗ yok | Defter kaydı yalnız `{tablo, hata, zaman, deneme}` |
| **Aynı tablodaki ilgisiz değişiklik takılmaz** | ✗ takılıyor | ✗ takılıyor | Kontrol: aynı değişiklik tek başına yazılıyor (✓). Reddedilen satırla aynı `stk_yaz` paketine binince o da reddediliyor. Tablo tümüyle beklemede kalır. |
| Tarayıcı, 10 dk | ✗ dakikada 1 POST (+10), sayaç 17× | — | Şerit görünür, yerel kayıt durur |
| **Yanıltıcı hata metni** | ✗ | ✗ | Sunucunun kural redleri `42501` döner. `030 supabaseIstek` 42501'i "Buluta yazma yetkisi yok — kimlik koruması açık ama giriş yapılmamış" diye çevirir. Kullanıcı gerçek sebebi görmez. Aynı sorun `fis_satir_koru` "Hareket değiştirilemez" ve F2'nin yeni redleri için de geçerli. |

**Çözüm önerisi (§ 4.1):**
- Kural redleri ayrı hata koduyla döner (`KR001…`).
- İstemci bunları kalıcı ret sayar: otomatik denemede atlanır, şeritte "İnceleme gerekiyor" ve sunucunun Türkçe sebebi görünür, yerel kayıt kalır, "Yeniden dene" yalnız elle çalışır.
- Reddedilen satır paketten ayrılır; aynı tablodaki öteki değişiklikler gider.

## 1. Kullanıcı maddeleri ve karşılıkları

| Madde | Tasarım |
|---|---|
| 1. Önce kırmızı testler | § 8: `t-f2.js` (12 kırmızı / 7 korunacak yeşil), `t-f2-kilit.js`, `t-bekleyen-red.js`, `senaryo-kalici-red.js` |
| 2. Geçerli ve geçmiş bağ birlikte | "Teslim geçmişi" = `kalem_id` VEYA `gecmis_kalem_id` bu kalemi gösteren hareket (§ 2) |
| 3. Teslimli kalem silinmez / birleştirilmez (sunucu) | § 3.2 tetikleyici + § 3.3 yabancı anahtar. Birleştirme = bir kalemin silinmesi; aynı kural. |
| 4. Ürün / renk / beden değişmez | § 3.2 |
| 5. Miktar teslimin altına inmez | § 3.2 (yalnız miktar AZALIRKEN; fazla teslimli kalemin öteki alanları düzenlenebilir) |
| 6. Teslimsiz kalem bozulmaz | Yeşil kontroller: birleştirme, silme, renk / beden, miktar = teslim, fazla teslimli kalemde fiyat, teslimsiz sipariş silme, üretim silme |
| 7. Eski 1.742.1 istemcisi | `t-f2.js` 20834ea derlemesiyle: aynı 12 kırmızı. İptal ve üretim silme akışları dahil. |
| 8. Ret alan eski istemci | § 0 + § 4.3 |
| 9. FK / tetikleyici aşamalı, veriye zararsız | § 5 |
| 10. Kilit sırası, eşzamanlılık | § 6 (bugün iki ters sıra ve kilitlenme ölçüldü) |
| 11. Regresyon | Uygulama aşamasında (F0, F1, F1.1, R1, R1b, birim, tarayıcı, kural provası) |
| 12. 1.742.1'e tam geri dönüş | § 7 |

## 2. Tanımlar

- **Kalemi gösteren hareket:**
  - `stk_hareket.kalem_id = k` (geçerli bağ) ya da `gecmis_kalem_id = k` (F1.1 geçmiş bağı);
  - iptal edilmiş satırlar dahil.
- **Geçerli teslim** (miktar alt sınırı): `fis_kalem_hesap(k)`, yani iki bağdan iptal edilmemiş hareket ve fişler (F1.1).
- **Teslim geçmişi olan kalem:** kalemi gösteren en az bir hareket var.
  - **Karar K1** (§ 9): yalnız iptal edilmiş hareketi olan kalem de bu sayılır mı?
  - Öneri: **evet**. Hareket sahipsiz kalmaz; yabancı anahtarla tutarlıdır.

## 3. Sunucu tasarımı

### 3.1 Kural redleri için ayrı hata kodu

| Kod | Ret |
|---|---|
| `KR001` | Bağı çözülmüş hareket yeniden siparişe bağlanamaz (F1.1 koruması; bugün 42501) |
| `KR002` | Teslim geçmişi olan kalem silinemez / birleştirilemez (sipariş silmede de) |
| `KR003` | Teslim geçmişi olan kalemin ürünü / rengi / bedeni / siparişi değişemez |
| `KR004` | Miktar teslim edilenin altına indirilemez |
| `KR005` | Var olmayan kaleme / siparişe hareket bağlanamaz (yabancı anahtar ihlali, okunur metinle) |

- Mesaj Türkçedir: hangi kalem, kaç teslim, ne yapılmalı.
- PostgREST bunları 400 döndürür. Eski istemci ham metni gösterir (42501 çevirisine düşmez).

### 3.2 Tetikleyici `fis_kalem_teslim_koru` (`siparis_kalemleri`, BEFORE UPDATE OR DELETE, kurallardan bağımsız)

- **DELETE:** kalemi gösteren hareket varsa `KR002`. Doğrudan silme, `alt_yaz` `sil` ve sipariş silmede cascade için geçerli.
- **UPDATE:**
  - `urun_id`, `lower(btrim(renk))`, `lower(btrim(beden))` ya da `siparis_id` değişiyorsa ve kalemi gösteren hareket varsa → `KR003`. Büyük-küçük harf ve boşluk farkı reddedilmez.
  - `miktar` AZALIYORSA ve `yeni miktar < fis_kalem_hesap(k)` → `KR004`. Miktar değişmiyorsa (fazla teslimli kalemin fiyatı gibi) serbest.
- **Hareket varlığı sorgusu** indeksli: `kalem_id` mevcut, `gecmis_kalem_id` indeksi F1.1'de var.
- **Yarış:**
  - Silme satır kilidini aldıktan sonra tetikleyici çalışır (EvalPlanQual), aynı anda biten teslimi görür.
  - Yine de yarış penceresine karşı § 3.3'teki yabancı anahtar son güvencedir.

### 3.3 Yabancı anahtarlar (NOT VALID — mevcut veri doğrulanmaz)

```
stk_hareket.kalem_id          → siparis_kalemleri(id)   NOT VALID   (ON DELETE NO ACTION)
stk_hareket.gecmis_kalem_id   → siparis_kalemleri(id)   NOT VALID
stk_hareket.siparis_id        → siparisler(id)          NOT VALID
stk_hareket.gecmis_siparis_id → siparisler(id)          NOT VALID
```

- `NOT VALID`:
  - YENİ ve DEĞİŞEN satırlarda ve başvurulan satırın silinmesinde hemen zorlanır;
  - mevcut sahipsiz satırlara (yerel sınamada D2a 37, D2b 28) dokunmaz, kurulumu düşürmez.
- **Kapanan delikler:**
  - var olmayan kaleme teslim (`F2.var-olmayan-kaleme-teslim`, bugün kabul ediliyor);
  - silme yarışı (§ 6 Q1, Q2).
- **Kilit etkisi:** hareket yazılırken başvurulan kalem / sipariş satırına `FOR KEY SHARE` alınır.
  - `fis_kes` ve `fis_bag_coz` kalemi zaten `FOR UPDATE` tutuyor (daha güçlü).
  - Eski `stk_yaz` yolu (kurallar kapalı) yeni bir anahtar paylaşım kilidi alır — P9 sınıfı açık risk, ölçülecek.
- `car_hareket.ek.kalemId` jsonb'dir; yabancı anahtar olmaz. Cari satırı denetimde kalır (kapsam dışı).

### 3.4 Kilit sırası (F1.1'in ortak sırasına sipariş satırı ve `alt_yaz` eklenir)

1. İstek kilidi (`fis_kes`).
2. **Sipariş satırları, kimlik sırasıyla, `FOR KEY SHARE`** (YENİ).
   - Sipariş silme (`DELETE siparisler`) sipariş satırını kilitler, sonra cascade ile kalemleri.
   - `fis_kes` / `fis_iptal` ise kalemi kilitleyip sonra (`alt_yaz` içinde, yabancı anahtar denetimiyle) sipariş satırına `KEY SHARE` istiyor → ters sıra.
   - Ölçüldü: § 6 Q3 bugün kilitleniyor.
3. Sipariş kalemleri, kimlik sırasıyla (`fis_kalem_kilitle`).
4. Fiş başlıkları, kimlik sırasıyla.
5. Yazmalar → `degisiklik.tekil`.

**`alt_yaz` (YENİ ön kilit):**
- Yazacağı ve sileceği bütün satırları (`siparis_kalemleri`, `uretim_atamalari`) ilk yazmadan önce kimlik sırasıyla kilitler. Önce o satırların siparişleri (`KEY SHARE`) kilitlenir.
- Bugün önce upsert (`tekil` alınır), sonra silme deyimi silinecek satırı bekliyor. A yoklaması: **TERS SIRA**.
- Birleştirme ∥ aynı kaleme teslim kilitleniyor (§ 6 Q2).

### 3.5 Sipariş silme
- Teslim geçmişi olan siparişin silinmesi `KR002` ile reddedilir (cascade içindeki kalem silmesinden).
- İptal edilmiş sipariş (F1.1: teslim geçmiş bağda) de buna dahildir. Bugün `087 siparisKapat` "zaten İptal → SİL" yoluyla siliniyor, geçmiş bağ sahipsiz kalıyor (D2e).
- Sipariş "İptal" durumunda kalır. Silinemeyen siparişi listeden gizlemek istemci işidir (§ 4.2).

## 4. İstemci tasarımı (F2 istemci parçası, 1.744.0 — sunucuyla birlikte)

### 4.1 Bekleyen defter: kalıcı ret
- **Sınıflandırma:**
  - `supabaseIstek` yanıtında `code` `KR\d{3}` ise (ya da ileride listeye eklenecek kural kodları) hata `kaliciRet: true`, `kod`, sunucu mesajı ve reddedilen satır kimliği (mesajda) taşır.
  - 42501 çevirisi yalnız gerçek yetki hatasına uygulanır.
- **Defter kaydı:** `{ ..., inceleme: true, kod, sebep, satirlar: [id] }`.
  - `bekleyenleriYenidenGonder(sessiz=true)` (60 sn / online) inceleme kayıtlarını ATLAR. Sayaç büyümez.
- **Şerit:** "İnceleme gerekiyor: Stok kartları — Bağı çözülmüş (iptal edilmiş siparişin) hareketi yeniden siparişe bağlanamaz". İki düğme:
  - **"Yeniden dene"** (elle, bir kez);
  - **"Sunucudaki hâli al"**: yalnız reddedilen satırlar buluttan yeniden okunur. Yerel kopya önce çöpe yedeklenir, kullanıcı onaylar. **Yerel kayıt onaysız silinmez.**
- **Paket bölme:** kalıcı ret bir satırı gösteriyorsa o satır paketten ayrılır, aynı tablonun öteki değişiklikleri gönderilir (`BR.ilgisiz-degisiklik`). Satır bulunamazsa bütün tablo inceleme durumuna alınır (karar K3).
- **Günlük:** her kalıcı ret `gunlukYaz` ile kaydedilir (kim, ne, hangi satır).

### 4.2 Önleme (ret almadan)
- `075 bekleyenKalemleriBirlestir`: karşılananı > 0 ya da yerel hareketi olan kalemi birleştirmez.
- Sipariş formu:
  - teslimli kalemde silme / ürün / renk / beden alanları kilitli ve açıklamalı;
  - miktar alt sınırı = karşılanan.
- `087 siparisKapat`: karşılananı > 0 olan kalemi varsa "zaten İptal" siparişi SİLMEZ, İptal'de bırakır ve açıklar.

### 4.3 Eski 1.742.1 istemcisi
- Değiştirilemez. Sunucu redleri bu istemcide de veri bozulmasını önler (`t-f2.js` eski istemciyle: sunucu redleri gelince yeşile döner).
- **Bedeli:** reddedilen yazma eski istemcide dakikada bir tekrar eder (§ 0), aynı tablonun öteki değişiklikleri de bekler. Ret metni okunur ("Supabase 400: … teslim geçmişi olan kalem silinemez"), 42501 çevirisine düşmez.
- **Önlem:** F2 sunucusu 1.744.0 istemcisiyle birlikte geçer. Açık eski sekmeler F1.1 § 7.2 prosedürüyle kapatılır.
- Eski istemcinin sıradan akışları (teslimsiz düzenleme, iptal, üretim silme) etkilenmez (yeşil kontroller).

## 5. Aşamalı kurulum ve doğrulama (madde 9)

| Aşama | İçerik | Doğrulama | Geri alma |
|---|---|---|---|
| 0 | **Salt-okur ön kontrol (canlı):**<br>• D2a / D2b / D2e sahipsiz;<br>• D3 / D3b kimlik farkı;<br>• D4a miktar < teslim;<br>• yeni sorgu: "iptal edilmiş siparişin teslimli kalemi". | Sayılar raporlanır. Mevcut ihlaller tetikleyiciyi ETKİLEMEZ, çünkü kural yalnız DEĞİŞİKLİKTE uygulanır. | — |
| 1 | `KR` kodları:<br>• F1.1 koruması dahil;<br>• tetikleyici `fis_kalem_teslim_koru`;<br>• `alt_yaz` ve fiş işlemlerinde sipariş → kalem ön kilidi. | t-f2, t-f2-kilit, F0 / F1 / F1.1, R1 / R1b | Tetikleyiciyi kaldır; 1.742.1 `alt_yaz` ve fiş defteri metni |
| 2 | Yabancı anahtarlar `NOT VALID` | `pg_constraint.convalidated = false`; yeni sahipsiz üretilemez (yarış testleri) | `drop constraint` |
| 3 | **(ayrı onay)** Sahipsiz kayıtlar tek tek incelendikten sonra `VALIDATE CONSTRAINT` | Doğrulama hatasız | — |

- Her aşama SQL Editor uyumlu ve tekrar çalıştırılabilir.
- Kurulumda veri değişmez: göç yok, mevcut satır güncellenmez.

## 6. Kilit ve eşzamanlılık — bugünkü ölçüm (`t-f2-kilit.js`, F1.1 SQL)

Zorlanmış: 2 sıra × 3. Doğal: × 100, 0–40 ms, rastgele sıra.

| Ölçüm | Zorlanmış kilitlenme / bozuk | Doğal × 100 kilitlenme / bozuk | Hedef |
|---|---|---|---|
| A: `alt_yaz` (upsert A + sil B) → B | **TERS SIRA** (yazdıktan sonra bekliyor) | — | tamam |
| Q1 kalem silme ∥ teslim | 0 / **3** sahipsiz | 0 / **51** sahipsiz (silme teslimden sonra işlenince) | 0 / 0 |
| Q2 birleştirme ∥ teslim | **3** / 0 | **3** / **51** | 0 / 0 |
| Q3 teslimsiz sipariş silme ∥ teslim | **3** / 0 | **28** / **20** (yalnız 20 / 100'de ikisi de tamam) | 0 / 0 |
| Q4 renk değişimi ∥ teslim | 0 / **6** (D3b) | 0 / **100** (D3b) | 0 / 0 |
| Q5 miktar indirme ∥ teslim | 0 / **3** | 0 / **45** (miktar < teslim) | 0 / 0 |

## 7. 1.742.1'e tam geri dönüş

`geri-donus-1.742.1.sql` F2 kurulunca şunları da kaldırır:
- `fis_kalem_teslim_koru`;
- yabancı anahtarlar;
- `alt_yaz` 1.742.1 metnine döner (20834ea; canlıdaki son sürüm — `editor/7` ya da `editor/15`, md5 ile doğrulanacak).

KR kodlu F1.1 koruması zaten kaldırılıyor. Sınama `geri-donus-1741.sh` ile (işlev, tetikleyici, kısıt md5'leri 1.742.1 ile aynı; 1.742.1'in kendi testleri).

## 8. Başarısızlık testleri ve bugünkü sonuçlar

### `test/f2/t-f2.js` (bugünkü 1.743.0 ve eski 1.742.1 istemcisiyle aynı sonuç)

| Kontrol | Bugün | Ölçülen |
|---|---|---|
| `F2.birlestirme-teslimli` | ✗ | B silindi, A 3 / miktar 20; 4 teslim sahipsiz (D2a 1) |
| `F2.birlestirme-karisik` | ✗ | teslimli B silindi, D2a 1 |
| `F2.sil-teslimli` | ✗ | A silindi, D2a 1 |
| `F2.sil-iptal-siparis-gecmis-bag` | ✗ | İptal sipariş silindi (cascade), geçmiş bağ sahipsiz (D2e 1) |
| `F2.sil-bayat-siparis` | ✗ | Teslimli sipariş bayat cihazdan silindi, D2a 1, D2b 1 |
| `F2.kimlik-renk` / `beden` / `urun` | ✗ ✗ ✗ | teslimli kalemin rengi Taba, bedeni 42, ürünü u-baska oldu |
| `F2.kimlik-gecmis-bag` | ✗ | iptal siparişin geçmiş bağlı kaleminin rengi değişti |
| `F2.miktar-teslim-alti` | ✗ | 5 teslimli kalem miktarı 3 |
| `F2.miktar-gecmis-bag` | ✗ | geçmiş bağlı 5 teslim, miktar 2 |
| `F2.var-olmayan-kaleme-teslim` | ✗ | kabul edildi, D2a 1 |
| `F2.birlestirme-teslimsiz`, `sil-teslimsiz`, `sil-teslimsiz-siparis`, `kimlik-teslimsiz`, `miktar-teslime-esit`, `fazla-teslimli-duzenleme`, `uretim-sil` | ✓ (7) | KORUNACAK |
| `F2.sil-yalniz-iptal-hareketli` | gözlem | silindi; iptal satırı var olmayan kalemi gösteriyor (K1) |
| `F2.uretim-sahipsiz-hareket` | gözlem | 0 (kapsam dışı) |

### Diğerleri
- `test/f2/t-bekleyen-red.js`, `senaryo-kalici-red.js`: § 0.
- `test/f2/t-f2-kilit.js`: § 6. Koşucu `test/f2/kos-f2.sh`, beklenen `test/f2/beklenen-f2.txt`.

## 9. Onayınıza sunulan kararlar
1. **K1 — yalnız iptal edilmiş hareketi olan kalem:** silinemez (öneri; yabancı anahtar ve "hiçbir hareket sahipsiz kalmamalı" ile tutarlı) mı, silinebilir (iptal satırı var olmayan kalemi gösterir) mi?
2. **K2 — F1.1 korumasının hata kodu** 42501 → `KR001` (yanıltıcı "giriş yapılmamış" metni biter).
3. **K3 — paket bölme:** reddedilen satır paketten ayrılıp öteki değişiklikler gönderilsin (öneri) mi, bütün tablo incelemeye mi alınsın?
4. **K4 — renk / beden karşılaştırması** büyük-küçük harf ve boşluk duyarsız (öneri).
5. **K5 — yabancı anahtarların doğrulanması (aşama 3):** canlıdaki sahipsiz kayıtlar tek tek incelendikten sonra ayrı onayla.
6. **K6 — üretim silindiğinde stok hareketinin üretim bağı** F2 kapsamı dışında kalır (bugün sahipsiz üretim bağı ölçülmedi: 0).
