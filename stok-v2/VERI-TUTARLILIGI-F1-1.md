# F1.1 — Sipariş iptalinde teslim bağının izi ve ortak kilit sırası (UYGULANDI, yalnız geliştirme dalında)

**Durum:** 2 Kasım 2026, dal `claude/f1-1-bag-izi`. Yalnız yerel PostgreSQL'de sınandı. **Canlıya geçiş onayı YOK.**
Canlı Supabase'e erişilmedi; main'e birleştirme, deploy ve sürüm yönlendirmesi değişikliği yapılmadı.

- **Tasarım:** `F1-1-BAG-IZI-TASARIM.md`. Bölüm 9'da 1.743.0'da ölçülen başarısızlıklar var.
- **Değişiklik yalnız sunucuda:** `src/`, `test/`, `index.html`, `surum.json` ve yayınlanmış HTML'ler değişmedi. İstemci 1.743.0 olarak kalır; sürüm numarası artırılmadı.

## 1. Commitler (her değişiklik ayrı)

| Commit | Ne |
|---|---|
| 1/6 `41e0072` | `stk_hareket`: `gecmis_siparis_id`, `gecmis_kalem_id`, `bag_cozum_zamani` sütunları; `fis_bag_iz_koru` tetikleyicisi; `stk_hareket_tek_bag` kısıtı |
| 2/6 `adc5716` | `fis_kalem_hesap` geçerli + geçmiş bağı sayar; `fis_kalem_kilitle` "hareket var" bilgisi geçmiş bağı görür |
| 3/6 `4b46d23` | `fis_iptal`: geçmiş bağlı kalemi kilitler; iptal edilen fiş ve bağlı makbuz kimlik sırasıyla, ilk yazmadan önce kilitlenir |
| 4/6 `99992cd` | `fis_bag_coz`: kalem → fiş ön kilidi; geçerli bağı geçmişe bir kez taşır; tekrar çağrı güvenli |
| 5/6 `21adf78` | Denetim, canlı salt-okur kontrol ve gece denetimi geçmiş bağı sayar; D5a izli (bilgi), D5c izsiz (uyarı), D2e |
| 6/6 `46a96b2` | `geri-donus-1.742.1.sql` F1.1'i de kaldırır |
| `a3eb229` | `geri-donus-F1.sql` F1.1'i de geri alır (ölçülen bozulma, § 5); denetim testleri izli / izsiz ayrımına uyarlandı |
| sonraki | Testler, beklenen dosyası, sonuçlar, bu rapor |

## 2. Kullanıcı şartları ve karşılıkları

| Şart | Nasıl | Kanıt |
|---|---|---|
| 1. Geçerli teslim ile geçmiş bağ SQL düzeyinde ayrı | Ayrı sütunlar. `stk_hareket_tek_bag` kısıtı: `gecmis_kalem_id is null or kalem_id is null`. `fis_bag_iz_koru`, **kurallardan bağımsız** (canlıda kurallar kapalı):<br>• Eklemede geçmiş sütun yazılamaz.<br>• Geçmiş yalnız `bag` kipinde, tek geçişle ve eski geçerli değerden yazılır.<br>• Sonra değiştirilemez.<br>• Bağı çözülmüş satır yeniden siparişe bağlanamaz. | `F11.iz-sutunlari`, `F11.satir-korumasi` (fis_kes yükü, bag kipinde başka değer, kipsiz, kullanıcı, iki bağ), `E11.bayat-satir` |
| 2. İptal edilmiş hareket karşılanana girmez | `fis_kalem_hesap` iki bağdan da yalnız `not h.iptal and not f.iptal` sayar. Fiş iptali geçmiş sütunlara dokunmaz. | `F11.S1-fis-iptali`: karşılanan 3 → 0, satır iptal, geçmiş bağ duruyor |
| 3. `fis_bag_coz` tekrarı güvenli | Yalnız `bag_cozum_zamani is null` satırlar taşınır. Fiş notu yalnız yoksa eklenir. | `F11.iz-bir-kez`; zorlanmış ve doğal P2 (iki cihaz aynı siparişi iptal eder) 0 kilitlenme, 0 bozuk |
| 4. Bağlı makbuz kilitlenmesi + ortak kilit sırası | Ortak sıra (§ 3): `fis_iptal` ana fiş ve makbuzu kimlik sırasıyla önden kilitler. | P6b zorlanmış 0/24 (önce 15/24), doğal 0/100 (önce 8/100); A yoklaması "tamam" |
| 5. Üç yöntem, ≥ 100 doğal tekrar | `t-f11-kilit.js` A + B + C, `F11_N=100` | § 4 |
| 6. Eski 1.742.1 istemcisi | 20834ea derlemesi: `t-f11-eski.js`, R1 ve R1b | § 6 |
| 7. F2 / F5 değişmedi | Birleştirme ve geri yükleme koduna dokunulmadı | `E11.birlestirme`, `E11.geri-yukleme-kapali` bilerek KIRMIZI |
| 8. Yeşile dönen / kırmızı kalan ayrı ayrı | § 4.1 | |
| 9. F0, F1, R1, R1b, birim, tarayıcı, kural provası | § 5 | |
| 10. 1.742.1'e tam geri dönüş F1.1'i kapsar, yerelde sınandı | § 7 | |
| 11. Canlı HTML ve `surum.json` değişmedi | `git diff origin/main` boş; `atolye-erp-v1.742.1.html` md5 `bdb1bafb…` main ile aynı; `surum.json` 1.742.1 | |

## 3. Ortak kilit sırası (bütün ilgili işlemler)

1. İstek kilidi (`pg_advisory_xact_lock`, yalnız `fis_kes`).
2. Sipariş kalemleri, kimlik sırasıyla (`fis_kalem_kilitle`).
3. Fiş başlıkları (`stk_fis`), kimlik sırasıyla.
4. Yazmalar: sayaç → fiş → satırlar → `alt_yaz`. İlk yazma deyiminin sonunda `degisiklik.tekil` alınır.

Kural: `tekil` alındıktan sonra yeni satır kilidi alınmaz.

| İşlem | Kalem | Fiş | Not |
|---|---|---|---|
| `fis_kes` | yükteki kalemler | — (yeni fiş) | F1'den beri |
| `fis_iptal` | fişin ve bağlı fişin hareketlerindeki geçerli ya da geçmiş kalem + alt satırları | iptal edilen fiş + bağlı makbuz, kimlik sırasıyla | **F1.1** |
| `fis_bag_coz` | siparişin kalemleri + bağlı hareketlerin kalemleri | dokunulacak bütün fişler (başlık, stok ve cari satırlarından), kimlik sırasıyla | **F1.1** (önce hiç ön kilit yoktu) |
| `alt_yaz` | tek deyim, kimlik sırasıyla | — | değişmedi |
| REST sipariş başlığı | tek deyim | — | değişmedi |
| `stk_renk_tasi` | — | — | Kapsam dışı (P8, açık risk) |
| `stk_yaz` / `fis_yaz` / `car_yaz` / `kas_yaz` (eski yol) | — | — | Kapsam dışı (P9, F8) |

## 4. Kilit ve veri testleri (`t-f11-kilit.js`, `F11_N=100`, `F11_ZORLA=3`)

**A — yazmadan önce kilit yoklaması** (rastlantıdan bağımsız):

| İşlem → nokta | 1.743.0 | F1.1 |
|---|---|---|
| `fis_iptal` → bağlı makbuz (siparişli / siparişsiz) | TERS SIRA / TERS SIRA | tamam / tamam |
| `fis_iptal` → sipariş iptalinden sonra geçmiş kalem | kilitlemiyor | tamam |
| `fis_bag_coz` → kalem | kilitlemiyor | tamam |
| `fis_bag_coz` → fiş | TERS SIRA | tamam |
| `fis_kes` / `fis_iptal` → kalem, fiş; `alt_yaz` → kalem | tamam | tamam |
| `stk_renk_tasi` → hareket; `stk_yaz` → fiş (gözlem) | tamam; kilitlemiyor | aynı |

**B — zorlanmış araya girme** (kalem / fiş / hareket / tekil / makbuz × iki başlangıç sırası × 3):

| Çift | 1.743.0 kilitlenme | F1.1 kilitlenme | F1.1 veri |
|---|---|---|---|
| P1 `fis_iptal` ∥ `fis_bag_coz` | fiş 3, hareket 3, tekil 6 (/6); kalem 0 ama 6/6 hayalet | **0** (bütün noktalar) | 0 bozuk |
| P6 siparişli makbuz | 0 | 0 | 0 |
| P6b siparişsiz makbuz | fiş 3, hareket 3, tekil 6, makbuz 3 (/6) | **0** | 0 |

**C — doğal zorlama × 100:**

| Çift | 1.743.0 kilitlenme / bozuk | F1.1 kilitlenme / bozuk |
|---|---|---|
| P1 `fis_iptal` ∥ `fis_bag_coz` | 8 / 53 | **0 / 0** |
| P2 `fis_bag_coz` ∥ `fis_bag_coz` | 0 / 100 | 0 / 0 |
| P3 `fis_bag_coz` ∥ `fis_kes` | 0 / 39 | 0 / 0 |
| P4 `fis_bag_coz` ∥ `alt_yaz` | 0 / 100 | 0 / 0 |
| P5 `fis_iptal` ∥ `fis_kes` | 0 / 0 | 0 / 0 |
| P6 siparişli makbuz | 0 / 0 | 0 / 0 |
| P6b siparişsiz makbuz | 8 / 0 | **0 / 0** |
| P7 `fis_bag_coz` ∥ REST başlık | 0 / 100 | 0 / 0 |
| P8 `fis_iptal` ∥ `stk_renk_tasi` (gözlem) | 3 / 0 | 1 / 0 ve 6 / 0 (iki koşu) — açık risk |
| P9 `fis_iptal` ∥ eski `stk_yaz`, kurallar kapalı (gözlem) | 1 / 1 | 2 / 2 ve 4 / 4 (D1b; eski yol karşılananı güncellemez) — açık risk, F8 |

Her C denemesinde iki işlem de tamamlandı (100/100); "bozuk" bağımsız beklenen değerle ve denetim D1b / D2* / D6* ile ölçülür. İkinci bağımsız tam koşu: § 4.2.

### 4.1 1.743.0'da KIRMIZI olan 41 kontrol

**Yeşile dönen (39):**
- `t-f11`: iz-sutunlari, bag-coz-iz-yazar, S1-iptal-sonrasi, iz-bir-kez, S1-fis-iptali, S1-yanit-kalemler, S1k-iptal-satiri-izi, S2a-eszamanli, S2a-ters-sira, S2-dogal, izsiz-eski-kayit, izsiz-fis-iptali, satir-korumasi (13).
- A: fis_iptal-makbuz, fis_iptal-makbuz-kalemsiz, fis_iptal-gecmis-kalem, fis_bag_coz-kalem, fis_bag_coz-fis (5).
- B: P1-kalem-veri, P1-fis-kilit, P1-hareket-kilit, P1-hareket-veri, P1-tekil-kilit, P1-tekil-veri, P6b-fis-kilit, P6b-hareket-kilit, P6b-tekil-kilit, P6b-makbuz-kilit (10).
- C: P1-kilit, P1-veri, P2-veri, P3-veri, P4-veri, P6b-kilit, P7-veri (7).
- Eski istemci: E11.siparis-iptali, E11.S1-fis-iptali, E11.S2a-eszamanli, E11.S2a-ters-sira (4).

**Bilerek KIRMIZI kalan (2, kural 7):**
- `E11.birlestirme` → F2: birleştirmede B silinir, 4 teslim sahipsiz kalır, A karşılananı 3.
- `E11.geri-yukleme-kapali` → F5: kurallar kapalıyken geri yüklemede satırsız fiş + hayalet.

**Yeşilden kırmızıya dönen: YOK.** **Yeni kontrol:** `E11.bayat-satir` (YEŞİL).

### 4.2 Tekrar üretilebilirlik
`kos-f11.sh` F1.1 sonrası ikinci bağımsız tam koşuda `beklenen-f11.txt` ile **AYNI** (75 kontrol). Puanlanan sekiz doğal çiftin hepsi iki koşuda da 0 kilitlenme, 0 bozuk. Gözlem çiftleri ikinci koşuda: P8 6 / 0, P9 4 / 4.

## 5. Regresyon (yeniden çalıştırıldı)

| Küme | Sonuç |
|---|---|
| `stok-v2/test/kos.sh` (temiz kurulum, bütün SQL sınamaları, uçtan uca, R1, R1b) | Çıkış 0; uçtan uca temiz, R1 temiz, R1b temiz, gece denetimi taban temiz |
| F0 + F1 (`f0/kos.sh`, `beklenen.txt`) | Beklenenle AYNI. F0 / F1 kontrollerinde değişen yok. |
| `t-denetim` (19 + 1 yeni) | Temiz. `DN.bag-cozulmus` bilerek değişti: F1.1'de izli ve hayalet yok, 1.742.x'te izsiz ve hayalet. `DN.bag-cozulmus-izsiz` eklendi. |
| F1 geri dönüş (`f0/geri-donus.sh`: F1.1 → `geri-donus-F1.sql` → yeniden) | **İlk koşuda SAPMA:** `geri-donus-F1.sql`, F1.1'in `fis_bag_coz`'unun çağırdığı `fis_kalem_kilitle`'yi düşürüyordu → sipariş iptali hata veriyordu. Düzeltildi (`a3eb229`); üç adımda da AYNI. |
| R1 / R1b, **1.742.1 istemcisiyle** (20834ea derlemesi), F1.1 SQL | R1 temiz (14 ✓), R1b temiz |
| Birim testleri (`test/kosu.sh`) | 1619 ✓, 0 ✗ |
| Tarayıcı regresyonu (260 senaryo, `KOSU_IS=6`) | 253 AYNI, 7 FARKLI. Tek başına: `yenileme-ekran` ve `tanim-basliklari` AYNI. `sekmeler`, `oturum-dustu`, `resim-damga`, `siparis-iptal` FARKLI; `tedarik-girisleri` ağ kısıtı (bilinen). Hepsi F1 raporundaki (1.743.0) bilinen küme. `src/` ve `test/` c2be715'ten beri değişmedi; tarayıcı testleri sahte sunucuyla koşar, SQL'e dokunmaz → F1.1'e bağlanamaz. |
| Kural provası (259 senaryo) | Çıkış 1, **12 eski yol hareket yazması** — 1.742.0 / 1.742.1 / 1.742.3 / 1.743.0 ile aynı 12, aynı senaryolar (F8). |

## 6. Eski 1.742.1 istemcisi + F1.1 SQL

| Senaryo | Sonuç |
|---|---|
| Sipariş iptali (`fis_bag_coz` + başlık yazması) | Kabul. İz yazılır, karşılanan 3 = hesap 3. |
| S1 fiş iptali | Karşılanan 0 = hesap 0. İstemci alt göndermiyor; sunucu geçmiş bağdan buluyor. |
| S2a, iki sıra × 3 | İkisi tamam, 0 / 0. |
| R1, R1b | Temiz. |
| Kalem birleştirme | Açık risk, değişmedi (KIRMIZI). |
| Geri yükleme | Kurallar kapalı: açık risk (KIRMIZI). Kurallar açık: YEŞİL. |
| **Bayat satır** (kurallar kapalı; cihaz sipariş iptalinden önceki yerel veriyle aynı hareketi eski `stk_yaz` yoluyla yeniden yazar) | **Davranış değişti.** 1.742.1 SQL'inde bu yazma bağı sessizce diriltir: 1.742.1'e geri dönülmüş veritabanında `E11.bayat-satir` KIRMIZI. F1.1'de yazma reddedilir: "Bağı çözülmüş (iptal edilmiş siparişin) hareketi yeniden siparişe bağlanamaz". İstemci bunu her reddedilen yazma gibi işler: bellek geri alınır, yazma bekleyen deftere girer, şerit görünür. Kurallar açıkken eski yolun reddedilmesiyle aynı sınıf; veri bozulmaz, ama o cihazda o yazma beklemede kalır (yenileyince düşer). **Karar maddesi (§ 9).** |

## 7. 1.742.1'e tam geri dönüş (`geri-donus-1.742.1.sql`, `f0/geri-donus-1741.sh`)

- **Kaldırılanlar:**
  - R1b tetikleyicisi;
  - F1.1 koruma tetikleyicisi `fis_bag_iz_koru` ve işlevi;
  - `stk_hareket_tek_bag` kısıtı;
  - R1 / F1 işlevleri.
- **20834ea metni:** `editor/18` ve `editor/20` birebir çalışır.
- **Kalan (veri):**
  - geçmiş bağ sütunları ve indeksi;
  - `fis_karsilanan_iz`.
- **Sınama:**
  - (a) bölümler 20834ea ile birebir;
  - (b) işlev, tetikleyici ve kısıt listesi ile her işlev gövdesinin md5'i 1.742.1 kurulumu ile **aynı**;
  - (c) 1.742.1'in kendi `kos.sh`'i (araya geçiş taklidi + F1.1 verisi + geri dönüş eklenmiş) çıkış 0, 100 TAMAM, ✗ 0.
  - **Sonuç: GERİ DÖNÜŞ TEMİZ.** Çıktı: `test/f0/sonuc-geri-donus-1741.txt`.
- **Geri dönüş → F1.1 yeniden kurulum:** 60 + 4 parça Editor gibi çalıştı; t-f11 14/14 yeşil, eski istemci 6 yeşil / 2 bilerek kırmızı.
- **Geri dönüş sonrası yorum:** 1.742.1 geçmiş bağı bilmez. F1.1 döneminde siparişi iptal edilmiş teslimli kalemler 1.742.1 denetiminde yine hayalet görünür; değer değişmez.
- **Açık sekme prosedürü:** tasarım § 7.2 (değişmedi).

## 8. Kalan açık riskler

| Risk | Durum |
|---|---|
| Teslimli kalem birleştirme (F2) | Değişmedi — B silinir, teslim sahipsiz. |
| Teslimli kalem silme / renk / miktar (F2) | Değişmedi. |
| Yedekten geri yükleme, kurallar kapalı (F5) | Değişmedi — satırsız fiş, hayalet. |
| İptal edilmiş siparişe yeni teslim (F4) | Değişmedi (kabul ediliyor; F1.1'de geçerli bağla sayılır). |
| Sipariş durumu istemciden (F4) | Değişmedi. |
| `stk_renk_tasi` ∥ `fis_iptal` (P8) | Doğal %1–6 kilitlenme; veri bozulmuyor (kaybeden işlem tamamen geri alınır). Önerilen düzeltme (ayrı onay): renk taşıma da hareketlerin fişlerini önden kilitlesin. |
| Eski yol `stk_yaz` ∥ `fis_iptal`, kurallar kapalı (P9) | Doğal %2–4 kilitlenme. `stk_yaz` satır iptali karşılananı güncellemez → hayalet (D1b). F8'de kurallar açılınca kapanır. |
| Kural provasındaki 12 eski yol yazması (F8) | Değişmedi. |
| İzsiz eski kayıtlar (D5c) | Tahmin yok; canlıda beklenen sayı 0 (31 Ekim sıfırlaması); salt-okur kontrol gösterir. |
| 1.742.1 istemcisi sipariş iptalinden sonra yerelde karşılananı hemen düzeltmez | Sunucu doğru (0). Eski istemci yanıttaki `kalemler`i okumaz; yenileyince düzelir. 1.743.0 istemcisi okur. |
| Bayat satır yazmasının reddi | § 6 — karar maddesi. |

## 9. Onayınıza sunulan kararlar
1. **Bayat satır reddi** (kurallar kapalı, eski yol):
   - F1.1 bağı diriltecek yazmayı reddediyor. Önerim: böyle kalsın, çünkü veri bozulmasını hataya çeviriyor.
   - Alternatif: `fis_bag_iz_koru` yalnız kurallar açıkken çalışır. Bu, 1.742.1 davranışına yakın kalır ama bağın sessizce dirilmesine izin verir; kural 1'e aykırı.
2. **Canlıya geçiş** ayrı onay gerektirir. F1.1 yalnız SQL'dir (1.743.0 istemcisiyle birlikte geçer). Gerekirse SQL Editor sırası: `editor/18` → `editor/20` → salt-okur kontrol.
