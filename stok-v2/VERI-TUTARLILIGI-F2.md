# F2 — Teslim geçmişi olan sipariş kalemi (UYGULANDI, yalnız geliştirme dalında)

**Durum:** 2 Kasım 2026, dal `claude/f2-teslimli-kalem` (F1.1 `cb33912` üzerine). Yalnız yerel PostgreSQL'de ve yerel tarayıcıda sınandı.
**Canlıya geçiş onayı YOK.** Canlı Supabase'e erişilmedi. main'e birleştirme ve deploy yapılmadı. `surum.json` değişmedi (1.742.1).
`atolye-erp-v1.742.1.html` main ile aynı (md5 `bdb1bafb91899724646b31fad3151ec3`).

**Kullanıcı notu (kodlama izniyle birlikte):** "F2 tamamlandıktan sonra da F4 sipariş iptali, F5 güvenli geri yükleme ve F8 eski yazma
yolları çözülmeden bütün sistemi güvenli kabul etmeyelim." Bu rapor F2'nin kendi hedefini ölçer. Sistemin genel güvenliğini iddia etmez (§ 8).

- **Hedef:** Teslim geçmişi bulunan sipariş kaleminin silinmesi, birleştirilmesi veya ürün / renk / beden kimliğinin değiştirilmesi sonucunda hiçbir fiş ya da stok hareketi sahipsiz kalmamalı.
- **Tasarım:** `F2-TESLIMLI-KALEM-TASARIM.md`. Uygulanan kararlar K1–K6 (§ 9 orada):
  - K1: yalnız iptal hareketi olan kalem de silinemez.
  - K2: `KR001`.
  - K3: paket bölme.
  - K4: büyük-küçük harf ve boşluk duyarsız karşılaştırma.
  - K5: FK `NOT VALID` (doğrulama ayrı onay).
  - K6: üretim bağı kapsam dışı.

## 1. Commitler (her değişiklik ayrı)

| Commit | Ne |
|---|---|
| `4eb58ab` | Tasarım + başarısızlık testleri (F2 öncesi 43 KIRMIZI) |
| 1/7 `202f044` | Kural redleri için `KR` SQLSTATE kodları; F1.1 geçmiş bağ koruması 42501 yerine `KR001` |
| 2/7 `6bbffee` | `fis_kalem_teslim_koru` (kalem: silme `KR002`, kimlik `KR003`, miktar < teslim `KR004`); `fis_siparis_teslim_koru` (sipariş silme `KR002`); `fis_kes` var olmayan kaleme teslim `KR005`; iki dizin |
| 3/7 `d8c2935` | Kilit sırası: sipariş satırı (FOR KEY SHARE) → kalemler → fişler; `alt_yaz` ilk yazmadan önce bütün hedef satırları kilitler; `fis_kes` teslim ürün / renk ≠ kalem → `KR003` |
| 4/7 `65ecb02` | `stk_hareket.kalem_id` ve `gecmis_kalem_id` → `siparis_kalemleri(id)` yabancı anahtarları, `DEFERRABLE INITIALLY DEFERRED NOT VALID` |
| 5/7 `fdafc85` | `geri-donus-1.742.1.sql` ve `geri-donus-F1.sql` F2'yi de kaldırır; `alt_yaz` 20834ea'dan birebir geri konur |
| 6/7 `33f790b` | İstemci 1.744.0: kalıcı ret → "inceleme gerekiyor", otomatik tekrar yok, paket bölme, teslimli kalem önleme |
| 7/7 `c976393` | `atolye-erp-v1.744.0.html` paketi (yalnız dal; `surum.json` değişmedi) |
| sonraki | Test enjeksiyonlarının eski veri taklidine çevrilmesi, beklenen dosyaları, sonuçlar, bu rapor |

## 2. Kullanıcı maddeleri ve karşılıkları

| Madde | Nasıl | Kanıt |
|---|---|---|
| 1. Kırmızı testler | `test/f2/` 73 kontrol (t-f2, eski istemci E2, t-bekleyen-red, eski istemci EBR, t-f2-kilit); F2 öncesi 43 KIRMIZI (`sonuc-f2-F1.1.txt`) | § 4 |
| 2. Geçerli + geçmiş bağ birlikte | `fis_kalem_hareket_var` ve tetikleyiciler `kalem_id` VEYA `gecmis_kalem_id` (iptal dahil, K1) arar; miktar alt sınırı `fis_kalem_hesap` (iki bağ) | `F2.sil-iptal-siparis-gecmis-bag`, `F2.kimlik-gecmis-bag`, `F2.miktar-gecmis-bag` |
| 3. Teslimli kalem silme / birleştirme sunucuda engellenir | BEFORE DELETE → `KR002`; birleştirme = A güncelle + B sil → B silinemez, bütün işlem geri alınır. Teslimli siparişin silinmesi de `KR002` | `F2.birlestirme-*`, `F2.sil-teslimli`, `F2.sil-bayat-siparis` |
| 4. Ürün / renk / beden değişimi engellenir | `urun_id`, `lower(trim(renk))`, `lower(trim(beden))`, `siparis_id` değişirse `KR003` (K4). Teslim sırasında da kalemle ürün / renk uyuşmazsa `KR003` | `F2.kimlik-*`, Q4 |
| 5. Miktar teslimin altına inmez | `KR004` | `F2.miktar-*`, Q5 |
| 6. Teslimsiz kalem normal düzenlenir | Tetikleyici yalnız hareket varsa reddeder | `F2.birlestirme-teslimsiz`, `F2.sil-teslimsiz`, `F2.sil-teslimsiz-siparis`, `F2.kimlik-teslimsiz`, `F2.miktar-teslime-esit`, `F2.fazla-teslimli-duzenleme`, `F2.uretim-sil` YEŞİL kaldı |
| 7. Eski 1.742.1 istemcisi | Aynı t-f2 kontrolleri 20834ea derlemesiyle (E2.*); R1, R1b eski istemciyle | § 6 |
| 8. Ret alan eski istemci | t-bekleyen-red eski istemciyle (EBR.*) | § 6 — 3 bilinen kırmızı |
| 9. FK ve tetikleyiciler aşamalı, veriye zararsız | Tetikleyiciler yalnız yeni yazmayı denetler; FK `NOT VALID` (mevcut sahipsiz kayıt kurulumu durdurmaz, dokunulmaz); `VALIDATE` ayrı onay (K5) | `kos.sh` kurulumu F0 bozuk verisiyle temiz; `geri-donus-1741.sh` (c) |
| 10. Kilit sırası, eşzamanlılık | § 3, § 5: 5 yarış çifti × (A + zorlanmış 6 + doğal 100) | 0 kilitlenme, 0 bozuk |
| 11. F0, F1, F1.1, R1, R1b, regresyon | § 7 | |
| 12. 1.742.1'e tam geri dönüş | § 7 | `geri-donus-1741.sh` TEMİZ |

## 3. Ortak kilit sırası (F1.1 + F2)

1. İstek kilidi (`pg_advisory_xact_lock`, yalnız `fis_kes`).
2. **Sipariş satırları, kimlik sırasıyla, `FOR KEY SHARE`** (F2). Silme ile teslimi aynı noktada sıraya sokar. Başlık güncellemesini engellemez.
3. Sipariş kalemleri, kimlik sırasıyla (`fis_kalem_kilitle`; `alt_yaz` artık bütün hedef kalem ve üretim satırlarını ilk yazmadan önce kilitler).
4. Fiş başlıkları, kimlik sırasıyla.
5. Yazmalar; ilk yazma deyiminin sonunda `degisiklik.tekil` alınır.

Kural: `tekil` alındıktan sonra yeni satır kilidi alınmaz. Tek istisna (§ 8): `alt_yaz` içinde **yeni** eklenen kalemin sipariş satırının KEY SHARE kilidi, upsert sırasında yabancı anahtar denetimiyle alınır.

## 4. Sonuçlar — F2 öncesi / sonrası

`test/f2/kos-f2.sh` (kurallar açık; t-bekleyen-red kurallar kapalı; `F2_N=100`, `F2_ZORLA=3`):

| | F2 öncesi (`sonuc-f2-F1.1.txt`) | F2 sonrası (`sonuc-f2-F2.txt`) |
|---|---|---|
| KIRMIZI | 43 / 73 | **3 / 73** (EBR.otomatik-tekrar-yok, EBR.inceleme-durumu, EBR.ilgisiz-degisiklik — eski istemci) |
| YEŞİL → KIRMIZI | — | 0 |

F2 öncesi kırmızı olup yeşile dönen 40 kontrol:

- **t-f2, yeni istemci (12):** F2.birlestirme-teslimli, birlestirme-karisik, sil-teslimli, sil-iptal-siparis-gecmis-bag, sil-bayat-siparis, kimlik-renk, kimlik-beden, kimlik-urun, kimlik-gecmis-bag, miktar-teslim-alti, miktar-gecmis-bag, var-olmayan-kaleme-teslim.
- **t-f2, eski 1.742.1 istemcisi (12):** E2.* — aynı 12 kontrol. Koruma sunucuda olduğundan eski istemci de bozamaz.
- **t-bekleyen-red, yeni istemci (3):** BR.otomatik-tekrar-yok, BR.inceleme-durumu, BR.ilgisiz-degisiklik.
- **Kilit (13):** F2K.A-alt_yaz-sil; B-Q1/Q4/Q5-veri; B-Q2/Q3-kilit; C-Q1…Q5-veri; C-Q2/Q3-kilit.

## 5. Kilit ve veri testleri (`t-f2-kilit.js`)

| Çift | Zorlanmış 6: kilitlenme / bozuk (önce → sonra) | Doğal 100: kilitlenme / bozuk (önce → sonra) | Doğal 100: ikisi de tamam (sonra) |
|---|---|---|---|
| Q1 kalem silme ∥ teslim | 0 / 3 → 0 / 0 | 0 / 51 → 0 / 0 | 53 (teslim önce → silme `KR002`; silme önce → teslim `KR005`) |
| Q2 birleştirme ∥ teslim | 3 / 0 → 0 / 0 | 3 / 51 → 0 / 0 | 53 |
| Q3 teslimsiz sipariş silme ∥ teslim | 3 / 0 → 0 / 0 | 28 / 20 → 0 / 0 | 0 (her zaman biri reddedilir) |
| Q4 renk değişimi ∥ teslim | 0 / 6 → 0 / 0 | 0 / 100 → 0 / 0 | 0 |
| Q5 miktar indirme ∥ teslim | 0 / 3 → 0 / 0 | 0 / 45 → 0 / 0 | 50 |

- **A yoklaması** (`alt_yaz` upsert A + sil B): F2 öncesi "TERS SIRA". Şimdi "tamam": B ilk yazmadan önce kilitleniyor, `tekil` serbest.
- **Bütünlük kahini:** D2a / D2b / D2e / D3 / D3b / D1a + miktar ≥ teslim. Bütün tekrarlarda 0.
- **"İkisi de tamam" sayısı:** Q1, Q2 ve Q5'te ~%50 olması doğru. Sırası önce gelen işlem kazanır; diğeri reddedilir ya da geçerli kalır (ör. Q1'de önce silme gelirse teslim `KR005` ile reddedilir).

## 6. Eski 1.742.1 istemcisi + F2 SQL

- **Sipariş düzenleme, iptal, üretim silme** (t-f2 E2.*): 24 kontrolün hepsi yeşil. Eski istemci teslimli kalemi silemez, birleştiremez, kimliğini değiştiremez. Teslimsiz düzenleme çalışır.
- **R1 ve R1b eski istemciyle:** temiz (R1 14 ✓, R1b 7 ✓, 0 ✗).
- **Ret alan eski istemci** (EBR.*):
  - Sunucu reddeder (veri bozulmaz).
  - Ama eski istemcide kalıcı ret sınıfı yok:
    - Kayıt bekleyen defterde kalır.
    - 60 sn'de ve çevrimiçi olunca **kendiliğinden tekrar denenir** (sunucu her seferinde yine reddeder).
    - Aynı tablodaki ilgisiz değişiklik de aynı pakette takılır.
  - Hata metni artık "giriş yapılmamış" değil, kural metni ve `[KR00x]`.
  - **Yerel kayıt silinmez.** v1.556 "Jut" koruması aynen çalışır.
  - Bu, istemci düzeltmesi gerektiren bir davranış ve 1.742.1'e geri yazılamaz. Çözüm 1.744.0'a geçiş.
- **Sunucu yükü:** dakikada bir reddedilen istek. Veri tutarsızlığı oluşmuyor. Yeni bir eski istemci uyumsuzluğu değil, F2 tasarımında ölçülen bilinen durum (tasarım § 0, § 4.3).

**1.744.0 istemcisi** (`BR.*`, `test/birim-kalici-ret.js`, `senaryo-kalici-red.js`):

- **Kalıcı ret sınıfı:**
  - Kapsar: yalnız `KR00x` kodlu sunucu redleri (F1.1 + F2 korumaları).
  - Reddedilen satır "İnceleme gerekiyor" bandına düşer.
- **Kendiliğinden yeniden denenmez.** Kullanıcı "Yeniden dene" diyebilir.
- **Yönetici seçeneği:** "Yerel hâli bırak, sunucudakini al".
  - Önce yerel hâlin yedeği günlüğe yazılır.
  - Ayrıca `localStorage inceleme-yedek:*` anahtarına yazılır.
- **Paket bölme (K3):** Aynı paketteki öteki satırlar ayrılıp gönderilir.
- **Önleme:**
  - Planlama iptali teslimli kalemi birleştirmez.
  - Teslim geçmişi olan iptal edilmiş sipariş silinmez (uyarı gösterilir).
  - Sipariş formu teslimli kalemi zaten kilitliyordu.

## 7. Regresyon (yeniden çalıştırıldı)

| Koşu | Sonuç |
|---|---|
| `stok-v2/test/kos.sh` (kurulum + uçtan uca + R1 + R1b) | Çıkış 0 |
| F0 `kos.sh` | Beklenenle AYNI. F2 ile 5 kontrol KIRMIZI → YEŞİL: D2.birlestirme, D2.teslimli-sil, D3.renk-degisir, D3.miktar-teslim-alti, Y.kart-referans |
| F1.1 `kos-f11.sh` | İkinci koşuda çıkış 0, beklenenle AYNI. E11.birlestirme KIRMIZI → YEŞİL. E11.geri-yukleme-kapali bilerek KIRMIZI (F5) |
| F2 `kos-f2.sh` | § 4. İkinci bağımsız koşu (beklenen dosyaları güncellendikten sonra): çıkış 0, beklenenle AYNI. Kilit 21/21 yeşil, 5 çiftte doğal 100'de 0 kilitlenme, 0 bozuk (`sonuc-f2-F2.txt`; ilk koşu `sonuc-f2-F2-ilk-kosu.txt`) |
| R1, R1b — eski istemci | Temiz |
| `geri-donus.sh` (F1 → 1.742.3 → F1+F1.1+F2) | Çıkış 0, üç adım beklenenle AYNI (`f0/sonuc-geri-donus-F2.txt`). 1.742.3 adımında `beklenen-geri-donus.txt` güncellendi: D2.birlestirme YEŞİL (önlem istemcide, test 1.744.0 istemcisiyle koşar); D2 / Y.denetim-yakalar KIRMIZI (1.742.3 sunucusu teslimli kalem silmeyi reddetmez, sahipsiz hareket yeniden doğar — geri dönüşün doğru olduğunu gösterir) |
| `geri-donus-1741.sh` (F2 → 1.742.1 tam geri dönüş) | **TEMİZ (a, b, c)** |
| Birim testleri (`test/kosu.sh`) | 1627 ✓, 0 ✗ |
| Tarayıcı senaryoları | 255 AYNI, 5 FARKLI paralel koşuda (sekmeler, tedarik-girisleri, oturum-dustu, resim-damga, siparis-iptal — bilinen oynak küme). Tek başına yeniden:
• `oturum-dustu` AYNI (oynak).
• `sekmeler`, `resim-damga` FARKLI ama F1.1 istemcisiyle (`cb33912`) birebir aynı çıktı (bilinen).
• `tedarik-girisleri` ağ kısıtı (bilinen).
• `siparis-iptal` — **bilerek değişti:** ikinci silmede teslim geçmişi olan iptal edilmiş sipariş artık silinmiyor (`ikinciSilmedenSonraSiparisVar` true; uyarı "teslim geçmişi olan sipariş silinemez — iptal edilmiş olarak kalır", sipariş İptal, kalem teslimi 4). Altın dosyada yalnız bu satır güncellendi. F1'den beri bilinen öteki farkları (`alisDevam`, `siparisDurumu`) aynen duruyor. |
| Tarayıcıda kalıcı ret (`f2/senaryo-kalici-red.js`, saat 10 dk ileri) | KR003: 4/4 ✓ — dakikada POST sabit 7, şerit "inceleme gerekiyor", yerel kayıt duruyor (`sonuc-kalici-red-tarayici-F2.txt`; F2 öncesi 2 ✗, 10 dk'da +10 POST). `RED_KODU=42501` (KR kodsuz kural reddi, F8 açığı): 2 ✗ — eski gibi her dakika yeniden gönderilir (`…-F2-42501.txt`) |
| Kural provası | 259 senaryo, **12 eski yol hareket yazması**. F1.1 ile aynı 12, aynı senaryolar (F8). |

**Test değişiklikleri** (davranış bilerek değişti, nedenleri):

- **`sinama-fis-ek.sql`:** Var olmayan `k-1` kalemine teslim yazıyordu, F2'de `KR005` alır. Sipariş ve kalem artık fixture'da oluşturuluyor.
- **`r1-yaris.js`, `r1b-turetme.js`:** Son temizlik teslimli kalemi siliyordu, F2'de `KR002` alır. Bu silme kaldırıldı. Senaryo 5'in hata metni regex'i, teslim–kalem uyuşmazlığının yeni `KR003` metnini de kabul eder.
- **`f0/t-denetim.js`, `t-kalem-bag.js`, `t-yedek.js`:**
  - Denetimin bozuk veriyi yakaladığını sınamak için enjeksiyonlar artık tetikleyiciyi aşarak (`session_replication_role = replica`) **eski veriyi taklit eder**. F2 bu bozuk hâlin yeni yazmayla üretilmesine izin vermiyor.
  - D2 / Y.denetim-yakalar artık D2a = 0 bekler, çünkü sahipsiz kalem bağı üretilemiyor.
- **`f0/ortak.js`:** psql `maxBuffer` artırıldı (test veritabanı büyüdü). RPC hatası SQLSTATE ile döner (VERBOSITY verbose).

## 8. Kalan açık riskler

| Risk | Durum |
|---|---|
| **F4 sipariş iptali** | Çözülmedi. Sipariş durumu hâlâ istemciden yazılıyor; iptal edilmiş siparişe yeni teslim kabul ediliyor. |
| **F5 güvenli geri yükleme** | Çözülmedi. Kurallar kapalıyken yedekten geri yükleme satırsız fiş ve hayalet üretir (`E11.geri-yukleme-kapali` KIRMIZI). F2 tetikleyicileri geri yüklemede teslimli kalemi silmeye / değiştirmeye kalkan yazmayı da reddeder. Geri yükleme yolu F5'te bu redle uyumlu hâle getirilmeli. |
| **F8 eski yazma yolları** | Çözülmedi. `stk_yaz` / `fis_yaz` / `car_yaz` / `kas_yaz` ve kural provasındaki eski yol yazmaları. `fis_satir_koru` redleri hâlâ 42501 (KR kodu yok). 1.744.0 bunları kalıcı ret saymaz; böyle bir ret bekleyen defterde eski gibi kendiliğinden tekrar denenir (veri bozulmaz). F8'de bu redlere de KR kodu verilmeli. P8 (`stk_renk_tasi` ∥ `fis_iptal`) ve P9 (`stk_yaz` ∥ `fis_iptal`) kilitlenmeleri F1.1'deki gibi açık. |
| Teslimde beden karşılaştırılmıyor | `fis_kes` ürün ve renk uyuşmazlığını reddeder, bedeni karşılaştırmaz. Neden: 255 stok fişi beden alanını farklı biçimde taşıyor. Kalemin bedeni değişemediğinden (`KR003`) yeni bozulma yolu kalem tarafında kapalı. Hareket tarafında yanlış beden yazılması D3b ile gece denetiminde görünür. |
| `alt_yaz`'da yeni kalemin sipariş kilidi | Yeni eklenen kalemin sipariş satırının KEY SHARE kilidi, yabancı anahtar denetimiyle `tekil`den sonra alınır. Ölçülen yarışlarda kilitlenme yok. Kuramsal olarak, aynı siparişi silen bir işlemle ters sıra mümkün. Önerilen düzeltme (ayrı onay): yükteki sipariş kimliklerini ilk yazmadan önce KEY SHARE ile kilitlemek. |
| Eski 1.742.1 istemcisinin sonsuz tekrarı | § 6. Veri bozulmaz; yalnız 1.744.0'a geçişle kapanır. |
| Reddedilen yerel hâl yeniden başlatmadan sonra | Yalnız inceleme yedeğinde (`bekleyen:inceleme`) yaşar. Uygulama yeniden açılınca fark belleği sunucudan dolar. |
| FK doğrulanmadı (K5) | `NOT VALID`. Canlıdaki mevcut sahipsiz kayıtlar salt-okur kontrolle tek tek incelenip ayrı onayla `VALIDATE` edilmeli. |
| Üretim bağı (K6) | Kapsam dışı. Üretim silindiğinde stok hareketinin üretim bağı korunmuyor (bugün ölçülen sahipsiz: 0). |

## 9. Onayınıza sunulanlar

1. **F2 sonuçlarının geliştirme dalında kabulü.**
2. **Canlıya geçiş ayrı onay gerektirir.**
   - SQL ve istemci birlikte geçmeli. Önerim: önce 1.744.0 istemcisi yayına alınsın, açık sekmeler geçsin; sonra SQL. 1.744.0 istemcisi F2 öncesi SQL ile kısmen sınandı: `geri-donus.sh` 2. adımında F0 kümesi 1.744.0 istemcisiyle 1.742.3 SQL'inde koştu ve 1.742.3 davranışını verdi (yalnız istemcideki önlemler fark etti). Canlıdaki 1.742.1 SQL'i ile tam küme sınanmadı; geçiş onayından önce sınanmalı.
   - Önce SQL geçerse eski istemciler § 6'daki sonsuz tekrara girer (veri bozulmaz).
   - SQL Editor sırası: `editor/18` → `editor/20` → salt-okur kontrol.
3. **Önerilen sonraki adımlar:**
   - `alt_yaz` sipariş ön kilidi (küçük).
   - FK `VALIDATE` için canlı salt-okur inceleme (K5).
   - F4, F5, F8.
