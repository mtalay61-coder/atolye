# F1.1 — Sipariş iptalinde teslim bağının izi ve kilit sırası (TASARIM — uygulanmadı)

**Durum:** 2 Kasım 2026, dal `claude/f1-1-bag-izi` (1.743.0, c2be715 üzerine). **Üretim kodu ve SQL değişmedi.** Bu dalda yalnız tasarım, başarısızlık testleri, kilit analizi araçları, 1.742.1'e geri dönüş SQL'i ve prosedürü var. Uygulama izni ayrıca verilecek.

**Kaynak inceleme:** 6 maddelik rapor (1 Kasım).
- S1: sipariş iptali → fiş iptali, karşılanan hayalet kalıyor. **1.742.1, 1.742.3 ve 1.743.0'da aynı.**
- S2a: eşzamanlı yarışta 1.743.0 hayalet bırakıyor; 1.742.1 ve 1.742.3 tesadüfen tutarlı.
- `fis_bag_coz` ∥ `fis_iptal` doğal zamanlamada bütün sürümlerde %30–70 kilitleniyor.

## 1. Kullanıcı kuralları (2 Kasım) ve tasarımdaki karşılıkları

| Kural | Tasarımdaki karşılığı |
|---|---|
| 1. Eski kimlikler saklanabilir; geçmiş bağ ile geçerli teslim bağı **açıkça ayrı** | Ayrı sütunlar: `stk_hareket.gecmis_siparis_id`, `gecmis_kalem_id`, `bag_cozum_zamani`. Geçerli bağ eskisi gibi `siparis_id` / `kalem_id` (iptalde boşalır). `ek` alanı kullanılmaz: ek serbest biçimli, denetimi ve kısıtı zor. |
| 2. Fiş iptalinde geçmiş bağ korunur; iptal edilmiş hareket karşılanana girmez | `fis_iptal` geçmiş sütunlara dokunmaz. Karşılanan hesabı yalnız GEÇERLİ hareketleri (satır ve fiş iptal değil) sayar; değişmez. |
| 3. S1 ve eşzamanlı senaryo ayrı ayrı | `t-f11.js` S1 / S2a / S2-doğal ayrı kontroller. |
| 4. Kilit sırası bütün ilgili işlemlerle; 3–10 deneme yetmez | § 4: statik sıra tablosu; "yazmadan önce kilit" yoklaması (rastlantıdan bağımsız, her işlem × her kilit noktası); her kilit noktasında zorlanmış iki yönlü araya girme; işlem çiftleri × N=100 doğal zorlama (`t-f11-kilit.js`). |
| 5. Eski 1.742.1 istemcisi + yeni SQL | `t-f11-eski.js` (20834ea derlemesiyle). |
| 6. Birleştirme ve geri yükleme bu düzeltmeyle çözülmez | § 6 açık riskler; F0 `D2.birlestirme`, `Y.*` KIRMIZI kalır (beklenen dosyasında). |
| 7. 1.742.1'e tam geri dönüş SQL'i ve açık sekme prosedürü | `stok-v2/geri-donus-1.742.1.sql` + § 7 (yerelde sınandı). |
| 8. Eski kayıtlarda iz yoksa tahminle bağ kurulmaz | § 5: izsiz kayıt ayrı kategori, yalnız raporlanır. |

## 2. Veri modeli

```
stk_hareket
  siparis_id, kalem_id          -- GEÇERLİ teslim bağı (bugünkü anlam; sipariş iptalinde boşalır)
  gecmis_siparis_id   text      -- YENİ: bağ çözülmeden önceki sipariş (yalnız fis_bag_coz yazar, bir kez)
  gecmis_kalem_id     text      -- YENİ: bağ çözülmeden önceki kalem
  bag_cozum_zamani    timestamptz  -- YENİ: bağın çözüldüğü an (sipariş iptali)
  check (gecmis_kalem_id is null or kalem_id is null)   -- aynı satırda iki bağ birden olamaz
```

- **Geçerli bağ:** "Bu hareket bu kalemin açık teslimidir." Planlama, rezervasyon ve kalan hesapları bunu kullanır; bugünkü davranış aynen sürer.
- **Geçmiş bağ:** "Bu hareket, iptal edilmiş şu siparişin şu kalemine teslim edilmişti." Yalnız teslim geçmişi ve karşılanan için.
- `siparis_no` bugünkü gibi "(iptal)" eki alır; gösterim içindir, eşleştirmede kullanılmaz.

## 3. Davranış

### 3.1 `fis_bag_coz(siparis)`
1. **Ön kilit** (kilit sırası, § 4):
   - siparişin kalemleri, kimlik sırasıyla `for update`;
   - siparişe bağlı fiş başlıkları (`stk_fis`, `siparis_id = sid` ya da numarayla eşleşen eski satırlar), kimlik sırasıyla `for update`.
2. `stk_hareket`: geçerli bağ geçmişe taşınır, geçerli bağ boşalır: `gecmis_siparis_id := siparis_id`, `gecmis_kalem_id := kalem_id`, `bag_cozum_zamani := now()`.
   - **Yalnız geçmiş sütunları boş olan satırda** (bir kez; tekrar çağrı izi ezmez).
   - İptal edilmiş satır dahil (rule 2: geçmiş bağ iptalden bağımsız korunur).
3. Car_hareket bugünkü gibi (karşılanan cari satırından türetilmez; kapsam dışı).
4. **Karşılanan değişmez.** Kalemin karşılananı = geçerli bağ + geçmiş bağlı geçerli hareketler (3.3). Bağın taşınması toplamı değiştirmez; sipariş iptalinde teslim geçmişi kalemde kalır (karar A). Bağ çözme anında yeniden hesap çağrılır: değer aynı kalmalı, kalmıyorsa önceden var olan fark F1 kuralıyla raporlanır (iz).

### 3.2 `fis_iptal(fiş)`
- Kalem ön kilidi, fişin hareketlerindeki `kalem_id` **ve** `gecmis_kalem_id` ile toplanır (bugün yalnız `kalem_id`).
- İptal satırları `iptal = true` yapar; **geçmiş sütunlara dokunmaz** (rule 2).
- Karşılanan yeniden hesaplanır: iptal edilmiş hareket sayılmaz → S1'de 3 → 0.

### 3.3 Karşılanan hesabı (`fis_kalem_hesap`)
```
teslim(k) = Σ h.miktar  (işaret sipariş tipinden)
            h geçerli (not h.iptal and not fiş.iptal)
            and ( h.kalem_id = k  or  (h.kalem_id is null and h.gecmis_kalem_id = k) )
```
- `fis_kalem_kilitle` fotoğrafındaki "hareket var" bilgisi de aynı iki bağı sayar. Böylece iptal edilmiş siparişin kalemi hayalet sayılmaz.
- **Denetim (`denetim.sql`, gece denetimi):**
  - D1a / D1b aynı tanımı kullanır.
  - D5a ikiye ayrılır: "bağı çözülmüş, izli" (bilgi) ve "bağı çözülmüş, İZSİZ" (uyarı, § 5).
  - Yeni D2e: geçmiş kalemi var olmayan hareket.

### 3.4 Satır koruması (`fis_satir_koru`, `bag` kipi)
- Bugünkü izin (geçerli bağ alanları boşalır, numara "(iptal)" eki alır) **ve** geçmiş sütunlar YALNIZ boştan eski geçerli değere yazılabilir: `new.gecmis_kalem_id = old.kalem_id`, `old.gecmis_kalem_id is null`.
- Başka kipte ya da başka değerle geçmiş sütun değişirse reddedilir. İstemci bu sütunları hiçbir yoldan yazamaz; `stk_yaz` / `fis_kes` satır kalıbı bu sütunları almaz.

### 3.5 İstemci
- **Değişmez** (sunucu tarafı düzeltme). 1.742.1 ve 1.743.0 istemcileri aynı yolu çağırıyor (`fis_bag_coz`, `fis_iptal`).
- Okuma görünümü `stok_hareketleri` geçmiş sütunları göstermez. Görünümü değiştirmek eski istemcide ek alan riski doğurur; F4'te.

## 4. Kilit sırası analizi

### 4.1 Sistem çapında sıra (F1'de belgeli, F1.1'de `fis_bag_coz` ve `fis_iptal` için tamamlanır)
1. `pg_advisory_xact_lock` (istek).
2. `siparis_kalemleri`, kimlik sırasıyla.
3. `stk_fis`, kimlik sırasıyla (iptal edilen / bağı çözülen fişler).
4. Yazmalar: `fis_sayac` → yeni `stk_fis` → `stk_hareket` / `car_hareket` / `kas_hareket` → `alt_yaz`.
5. İlk yazma deyiminin sonunda `degisiklik.tekil` (tek satır, bütün izlenen tablolar).

Kural: `tekil` alındıktan sonra yeni satır kilidi alınmaz.

### 4.2 İşlemler (bugün → F1.1 sonrası)

| İşlem | Bugünkü sıra | Sorun | F1.1 sonrası |
|---|---|---|---|
| `fis_kes` (1.743.0) | istek → kalem → sayaç → yazma | — | aynı |
| `fis_iptal` (1.743.0) | kalem → fiş X → hareket / cari / kasa güncelle → alt → hesap | Bağlı makbuz (`bagli_fis`) **kilitlenmeden** güncelleniyor: iki cihaz ana fişi ve makbuzu aynı anda iptal ederse ters sıra (ölçülecek: P6) | kalem (geçerli + geçmiş) → fiş X **ve** bağlı fiş, kimlik sırasıyla → yazmalar |
| `fis_bag_coz` (1.742.0+) | hareket güncelle (`tekil`) → cari → **fiş başlığı (stk_fis)** | `tekil` ve hareket kilidinden SONRA fiş satırı: `fis_iptal` ile ters sıra → **ölçülen kilitlenme %30–70** | kalem → fiş başlıkları (kimlik sırası) → hareket → cari → fiş başlığı notu |
| `alt_yaz` (düzenleme, tek deyim) | kalemler, kimlik sırasıyla (`distinct on … order by id`) → `tekil` | — | aynı (değişmez) |
| REST `siparisler` başlık yazması (tek deyim) | sipariş satırı → `tekil` | — | aynı; F1.1 `siparisler`e yazmaz |
| `stk_renk_tasi` | varyant → hareket (`tekil`) | Kalem ya da fişe dokunmaz; yalnız `fis_iptal` hareketi güncellerken satır bekleşmesi | aynı (ölçülecek: P8) |
| `stk_yaz` (eski yol; kurallar KAPALIYKEN açık — canlının bugünkü hâli) | hareket iptal (`tekil`) → **sonra** `stk_fis … for update` | Yazmadan sonra fiş kilidi: `fis_iptal` / `fis_bag_coz` ile ters sıra mümkün | **F1.1 kapsamı dışı** (eski yol, F8'de kapanır); açık risk olarak ölçülür (P9) |
| `fis_yaz` / `car_yaz` / `kas_yaz` (eski yol) | yazma önce | kalem ya da fiş kilitlemez (`car` / `kas` satırları) | aynı; açık risk |

### 4.3 Doğrulama yöntemi (kural 4: "3–10 denemede görülmedi" yetmez)
Üç ölçüm (`t-f11-kilit.js`); hiçbiri tek başına yeterli sayılmaz.

1. **A — Yazmadan önce kilit (sıra kuralının doğrudan sınaması, rastlantıya bağlı değil):**
   - Bir tutucu oturum, işlemin kilitlemesi gereken satırı (L) 1,5 sn tutar; işlem başlatılır.
   - 0,5 sn sonra bir yoklama oturumu `degisiklik.tekil`i 0,2 sn kilit süresiyle ister.
   - İşlem L'yi bekledi **ve** yoklama `tekil`i aldı → işlem L'yi ilk yazmadan önce istiyor (kural tamam).
   - Yoklama `tekil`i alamadı → işlem yazdıktan SONRA L'yi bekliyor: **ters sıra**. L'yi tutan başka bir işlem `tekil`i isterse kilitlenme kesin; olasılık değil.
   - İşlem beklemedi → L'yi hiç kilitlemiyor (o satır üzerinden sıralanmıyor).
   - Kilit noktaları: `fis_kes` / kalem; `fis_iptal` / kalem, fiş, bağlı makbuz (siparişli ve siparişsiz), geçmiş kalem; `fis_bag_coz` / kalem, fiş; `alt_yaz` / kalem; `stk_renk_tasi` / hareket (P8, gözlem); `stk_yaz` / fiş (P9, gözlem).
2. **B — Zorlanmış araya girme, her kilit noktası, iki başlangıç sırası:** P1, P6, P6b. Tutucu sırayla kalem / fiş / hareket / makbuz satırını ya da `tekil`i 1 sn tutar; iki işlem iki sırayla gönderilir (`F11_ZORLA` tekrar).
3. **C — Doğal zorlama:** Her işlem çifti × N=100 (`F11_N` ile artırılabilir), 0–40 ms rastgele aralık, rastgele başlangıç sırası.
   - Kilitlenme sayısı ve oranı ayrı kontrol (`…-kilit`).
   - Veri bütünlüğü ayrı kontrol (`…-veri`): karşılanan = bağımsız beklenen değer (hangi işlem işlendiyse ona göre) ve denetim D1b / D2* / D6* = 0.
4. **Kabul ölçütü (F1.1 sonrası):** A'da `fis_kes`, `fis_iptal`, `fis_bag_coz` satırları "tamam"; B ve C'de P1–P7 (P6b dahil) için 0 kilitlenme ve bütünlük. P8–P9 açık risk olarak raporlanır (puanlanmaz).
5. **İşlem çiftleri:**

| Çift | İşlemler |
|---|---|
| P1 | `fis_iptal` ∥ `fis_bag_coz` (aynı sipariş) |
| P2 | `fis_bag_coz` ∥ `fis_bag_coz` (iki cihaz aynı siparişi iptal eder) |
| P3 | `fis_bag_coz` ∥ `fis_kes` (aynı kaleme yeni teslim) |
| P4 | `fis_bag_coz` ∥ `alt_yaz` (aynı sipariş düzenlemesi) |
| P5 | `fis_iptal` ∥ `fis_kes` (aynı kalem) |
| P6 | `fis_iptal` (ana fiş) ∥ `fis_iptal` (bağlı makbuz), siparişli satış: kalem kilidi ikisini sıralar |
| P6b | aynısı, siparişsiz peşin satış: kalem kilidi YOK, iki fiş yalnız fiş satırlarıyla sıralanır |
| P7 | `fis_bag_coz` ∥ REST başlık güncellemesi |
| P8 | `fis_iptal` ∥ `stk_renk_tasi` |
| P9 | `fis_iptal` ∥ eski yol `stk_yaz` iptali (kurallar kapalı) |

## 5. Eski kayıtlar: geçmiş bağ bilgisi yoksa (kural 8)
- F1.1'den önce `fis_bag_coz` ile bağı çözülmüş hareketlerin eski kalem ve sipariş kimliği **hiçbir yerde yok**. `siparis_no` "(iptal)" eki ve fiş başlığındaki `ek.siparisIptal` notu sipariş numarasını taşır, kalemi taşımaz.
- **Tahminle bağ kurulmaz.** Numara, ürün, renk ya da miktar eşleştirmesiyle `gecmis_*` doldurulmaz; F1.1'in kurulumu da bir göç adımı içermez.
- Bu satırlar:
  - denetimde **"D5c: bağı çözülmüş, İZSİZ"** olarak listelenir (fiş no, hareket, miktar, "(iptal)" ekli sipariş no);
  - kalemlerindeki karşılanan **değişmez** (hayalet olarak kalır, karar 4) ve gece raporunda görünür;
  - bunların fişi sonradan iptal edilirse karşılanan yine düşmez (kalem bilinmiyor); iz yok diye yeni hayalet de üretilmez, durum aynen kalır.
- **Tek tek değerlendirme** (karar 1): Kullanıcı canlı salt-okur raporundaki D5c / D1b listesine bakıp elle karar verir. Önerilecek tek araç, onaylı ve kayıt bırakan bir **elle düzeltme** işlemi olabilir (F4'te, ayrı onayla). F1.1'de yok.
- **Canlıda beklenen sayı:** Canlı 31 Ekim'de sıfırlandı. O tarihten sonra teslimi olan bir sipariş iptal edilmediyse 0'dır. Canlı salt-okur kontrol bunu gösterir (D5a bugün; F1.1 dosyasıyla D5c).

## 6. Bu düzeltmenin çözmedikleri (açık riskler — kural 6)

| Risk | Durum |
|---|---|
| Teslimli kalem birleştirme (B silinir, hareket sahipsiz) | Çözülmez. F0 `D2.birlestirme` KIRMIZI kalır → F2. |
| Teslimli kalem silme / renk değişimi / miktarın teslim altına inmesi | Çözülmez (`D2.teslimli-sil`, `D3.*`) → F2. |
| Yedekten geri yükleme (yarım işlem; kurallar kapalıyken satırsız fiş ve hayalet) | Çözülmez (`Y.*`) → F5. |
| İptal edilmiş siparişe yeni teslim kabul ediliyor | Çözülmez (`D5.iptal-siparise-teslim`) → F4. |
| Sipariş durumu (Tamamlandı / Kısmi) istemciden | Çözülmez (`D5.durum-eszamanli`) → F4. |
| Eski yol `stk_yaz` / `fis_yaz` kilit sırası (kurallar kapalıyken) | Çözülmez → F8 (kurallar açılınca bu yollar reddedilir). P9 ölçülür. |
| Fazla teslim | → F3. |

## 7. Canlı 1.742.1'e tam geri dönüş

### 7.1 SQL: `stok-v2/geri-donus-1.742.1.sql`
- 1.743.0 (ve ileride F1.1) kurulu bir veritabanını 1.742.1 sunucu davranışına döndürür:
  1. R1b tetikleyicisi ve işlevi kaldırılır;
  2. 1.742.1'in `editor/18` (fiş defteri) ve `editor/20` (gece denetimi) metinleri **birebir** (20834ea'dan üretildi) çalışır;
  3. R1 / R1b / F1 işlevleri kaldırılır.
- **Veri silinmez:** `fis_karsilanan_iz` tablosu ve (F1.1 kurulduysa) `gecmis_*` sütunları kalır. 1.742.1 bunları okumaz, satır koruması (`bag` kipi) bu sütunlar değişmediği sürece etkilenmez.
- **Editor uyumu:** yalnız düz çift-dolar gövde; başlık yorumlarında kesme ve dolar işareti yok. `editor-icin.py --bol` ile 58 parçaya bölünüp her parça AYRI istekle çalıştırıldı (Editor'un yaptığı gibi).
- **Sınama:** `stok-v2/test/f0/geri-donus-1741.sh` (eski ağaç: `eski-istemci.sh` → `.eski-istemci/`, 20834ea):
  1. REF: temiz 1.742.1 kurulumu (20834ea'nın kendi `kos.sh`'i).
  2. GERI: bugünkü SQL + bugünkü istemciyle veri (F0/F1 ve F1.1 testleri) → bu dosya Editor gibi.
     - (a) dosyadaki iki bölüm `git show 20834ea:…` ile birebir;
     - (b) işlevler, tetikleyiciler ve her işlevin gövde özeti (md5) REF ile aynı.
  3. SINAMA: 1.742.1'in kendi `kos.sh`'i, fiş defteri sınamasından sonra araya: geçiş taklidi (bugünkü `editor/18` + `editor/20`) → bugünkü istemciyle veri → bu dosya → 1.742.1'in kalan testleri (uçtan uca fiş, gece denetimi). (c) hepsi temiz ve işlev özeti REF ile aynı.
     - Ayrı veritabanı gerekli: F0 testleri bilerek satırsız fiş ve hayalet üretir; 1.742.1'in gece sınaması temiz taban bekler.
  4. (d) eski istemci testi (`t-f11-eski.js`) geri dönülmüş veritabanında: 1.742.1 davranışının taban çizgisi.
- **Sonuç (2 Kasım, yerel):** (a) aynı, (b) fark yok, (c) 1.742.1 `kos.sh` çıkış 0, 100 TAMAM, ✗ 0; işlev özeti farkı yok. Kalan tek fark `fis_karsilanan_iz` tablosu (bilerek, veri).
- **F1.1 uygulanınca:** F1.1 yeni bir işlev eklerse bu dosyanın sonundaki `drop function` listesine eklenir; sınama (b) eksik düşürmeyi yakalar.

### 7.2 Açık sekmeler ve sıra (prosedür)

**Uygulamanın davranışı** (`index.html`, `030 surumeOtomatikGec`; 1 Kasım'da ölçüldü):
- Başlatıcı `surum.json`'daki adrese gider.
- Uygulama içi otomatik geçiş YALNIZ daha yeni sürüme yapılır.
- Doğrudan açık bir `atolye-erp-v1.743.0.html` sekmesi yenilense de 1.743.0'da kalır.
- 1.743.0 istemcisi 1.742.1 SQL'iyle işlevsel olarak çalışır (uçtan uca testler temiz), ama R1 / F1 korumaları yoktur.

**Sıra:**
1. Kullanıcılara duyuru: kayıt girmeyi durdurun, açık sekmeleri kapatın.
2. **Önce HTML:** `surum.json` 1.742.1'e döner (`main`'e küçük bir commit; Pages 1–2 dk). `atolye-erp-v1.743.0.html` **silinmez**: açık sekmede yenilemenin 404'e düşmemesi için.
3. Her cihazda uygulama **başlatıcıdan** (ana ekran simgesi / `index.html`) yeniden açılır. Açılış ekranındaki sürüm 1.742.1 görünmelidir.
4. **Sonra SQL:** `geri-donus-1.742.1.sql` SQL Editor'de. Bu sırayla, 1.743.0 sekmesi kalsa bile 1.742.1 SQL'iyle çalışır; tersi sırada 1.742.1 istemcisi bir süre 1.743.0 SQL'ine yazar, o da uyumlu (`c41-s43` matrisi).
5. Salt-okur kontrol (`canli-salt-okur-kontrol.sql`), geri dönüş öncesiyle karşılaştırılır.
6. Bir cihazda 1.743.0 sekmesi kaldığı fark edilirse kapatılıp başlatıcıdan açılır. Zorlamak için 1.743.0 HTML'i, sekmeyi 1.742.1'e yönlendiren bir sayfayla değiştirmek mümkündür; bu üretim kodu değişikliğidir, ayrıca onay ister.

## 8. Başarısızlık testleri (bu dalda; 1.743.0 SQL'inde KIRMIZI beklenir)

### `stok-v2/test/f0/t-f11.js`

| Kontrol | Ne bekler |
|---|---|
| `F11.iz-sutunlari` | Geçmiş sütunlar ve aynı satırda iki bağ olamaz kısıtı var. |
| `F11.bag-coz-iz-yazar` | `fis_bag_coz` sonrası geçerli bağ boş, geçmiş bağ eski kalem/sipariş. |
| `F11.iz-bir-kez` | İkinci `fis_bag_coz` izi değiştirmez. |
| `F11.S1-iptal-sonrasi` | S1: sipariş iptalinden sonra karşılanan 3 = hesap 3, hayalet yok. |
| `F11.S1-fis-iptali` | S1: fiş iptalinden sonra karşılanan 0, geçmiş bağ duruyor, iptal satırı sayılmıyor. |
| `F11.S2a-eszamanli` | S2a (zorlanmış): karşılanan 0, hayalet yok. |
| `F11.izsiz-eski-kayit` | Eski, izsiz bağı çözülmüş kayıt: geçmiş sütun boş kalır, karşılanan değişmez, denetimde D5c olarak görünür. |
| `F11.satir-korumasi` | İstemci ya da `fis_kes` yükü geçmiş sütunu yazamaz. |

| `F11.S1-yanit-kalemler` | `fis_iptal` yanıtı geçmiş bağlı kalemi de bildirir (istemci yerel değeri düzeltir). |
| `F11.S1k-kontrol` | Kontrol: önce fiş iptali, sonra sipariş iptali → 0 (bugün de YEŞİL; F1.1 bozmamalı). |
| `F11.S1k-iptal-satiri-izi` | İptal edilmiş satır da sipariş iptalinde geçmişe taşınır. |
| `F11.S2a-ters-sira` | S2a, sipariş iptali önce gönderilir. |
| `F11.S2-dogal` | S2 doğal zamanlama × 10: kilitlenme 0, karşılanan = hesap = beklenen. |
| `F11.izsiz-fis-iptali` | İzsiz kaydın fişi iptal edilince karşılanan değişmez, kalem tahmin edilmez. |

### Diğer test dosyaları
- **`t-f11-kilit.js`** (§ 4.3): A yazmadan önce kilit yoklaması; B zorlanmış araya girme (P1, P6, P6b × 5 kilit noktası × 2 sıra × `F11_ZORLA`); C doğal zorlama (P1–P9 + P6b × `F11_N`). Kilitlenme ve veri ayrı kontrol.
- **`t-f11-eski.js`:** 1.742.1 istemcisi (20834ea; `eski-istemci.sh`) ile sipariş iptali, S1, S2a (iki sıra), birleştirme ve geri yükleme (kurallar kapalı / açık), bu veritabanının SQL'ine karşı.
- **`kos-f11.sh`:** üçünü koşar, `beklenen-f11.txt` ile karşılaştırır (F0 `kos.sh` mantığı; `F0_TESTLER`).
- **`beklenen-f11.txt`:** 1.743.0'daki gerçek durum; başlıkta F1.1 sonrası hangilerinin YEŞİL olacağı.
- **`sonuc-f11-1.743.0.txt`:** bu kaynağın tam çıktısı (önce / sonra değerleri).

## 9. 1.743.0'da ölçülen sonuçlar (2 Kasım, yerel PG, kurallar açık)

Özet: t-f11 13 kırmızı / 1 yeşil (kontrol); t-f11-kilit 22 kırmızı / 31 yeşil + 2 gözlem; t-f11-eski 6 kırmızı / 1 yeşil.

### 9.1 Veri (S1, S2)
| Senaryo | Önce | Sonra (1.743.0) | Beklenen (F1.1) |
|---|---|---|---|
| S1 sipariş iptali | karşılanan 3, hesap 3 | karşılanan 3, **hesap 0**, D1b 1 (hayalet görünüyor) | 3 / 3, D1b 0 |
| S1 fiş iptali | karşılanan 3 | **karşılanan 3**, hesap 0, D1b 1; istemci kalem düşümü `{}`, alt yok; yanıt `kalemler: []` | 0 / 0 |
| S1k (kontrol) | — | 0 / 0 | 0 / 0 (YEŞİL) |
| S2a zorlanmış, iki sıra × 3 | — | ikisi tamam, **karşılanan 3**, hesap 0, D1b 1 (6/6) | 0 / 0 |
| S2 doğal × 10 (uygulama yükü) | — | **6 kilitlenme / 10**, 4 denemede karşılanan ≠ beklenen | 0 kilitlenme, 0 bozuk |
| İzsiz eski kayıt | — | karşılanan 3 (değişmez), D5a 1; D5c ve geçmiş sütun yok | geçmiş boş, 3, D5c 1 |

### 9.2 Kilit sırası
**A — yazmadan önce kilit:**

| İşlem → kilit noktası | 1.743.0 | F1.1 hedefi |
|---|---|---|
| `fis_kes` → kalem | tamam | tamam |
| `fis_iptal` → kalem, iptal edilen fiş | tamam | tamam |
| `fis_iptal` → **bağlı makbuz** (siparişli ve siparişsiz) | **TERS SIRA**: ana fişi yazdıktan sonra makbuzu bekliyor | tamam (fiş + makbuz kimlik sırasıyla ön kilit) |
| `fis_iptal` → sipariş iptalinden sonra geçmiş kalem (gerçek istemci yükü: alt yok) | **kilitlemiyor** | tamam |
| `fis_bag_coz` → kalem | **kilitlemiyor** | tamam |
| `fis_bag_coz` → fiş | **TERS SIRA**: hareketi yazdıktan sonra fiş başlığını bekliyor | tamam |
| `alt_yaz` → kalem | tamam | tamam |
| `stk_renk_tasi` → hareket (gözlem) | tamam | — |
| `stk_yaz` → fiş (gözlem, kurallar kapalı) | kilitlemiyor | — (F8) |

**B — zorlanmış araya girme (6 deneme / nokta):**
- P1 (`fis_iptal` ∥ `fis_bag_coz`): fiş tutulunca 3, hareket 3, tekil **6/6** kilitlenme; kalem tutulunca 0 kilitlenme ama 6/6 hayalet.
- P6 (siparişli makbuz): 0 — kalem kilidi iki iptali sıralıyor.
- **P6b (siparişsiz peşin satış + makbuz): fiş 3, hareket 3, tekil 6/6, makbuz 3/6 kilitlenme.** Sipariş iptaliyle ilgisiz, F1 öncesinden gelen bir sıra hatası; `fis_iptal` düzeltmesine (§ 4.2) dahil edildi.

**C — doğal zorlama × 100:**

| Çift | Kilitlenme | Veri (bozuk deneme) | Not |
|---|---|---|---|
| P1 | **8** (%8) | 53 | hayalet (S1 / S2 kökü) |
| P2, P3, P4, P7 | 0 | 100 / 39 / 100 / 100 | kilit sorunu yok; bozukluk sipariş iptalinden sonra kalemin hayalet görünmesi (D1b, S1 kökü) |
| P5 | 0 | 0 | F1 ön kilidi çalışıyor |
| P6 | 0 | 0 | |
| **P6b** | **8** (%8) | 0 | doğal zamanlamada da görülüyor |
| P8 (gözlem) | 3 | 0 | `stk_renk_tasi` (açık risk) |
| P9 (gözlem) | 1 | 1 (D6a satırsız fiş) | eski yol, kurallar kapalı (açık risk, F8) |

- **Kural 4'ün kanıtı:** ilk denemede P6b doğal zorlamada 6/6 temizdi; zorlanmış araya girme ve A yoklaması aynı kusuru kesin olarak gösterdi.
- P1 doğal kilitlenme oranı ham yükle %3–8; uygulamanın kendi yüküyle (t-f11 S2 doğal) 6/10, 1 Kasım matrisinde %30–70 (zamanlama farkı). İkisi de sıfırdan büyük; kabul ölçütü oran değil, sıfır.
- **Test hatası (düzeltildi, gizlenmedi):** İlk tam koşuda P5 2, P6 1, P8 2 "bozuk" çıktı. Neden: denetim öneki `…-1` diğer denemelerin `…-10…-1z` kimliklerini de kapsıyordu. Kimlikler sabit genişliğe çevrildi; yeniden koşuda P5 / P6 / P8 veri 0. İlk koşunun çıktısı: `sonuc-f11-1.743.0-ilk-kosu-onek-hatasi.txt`.

### 9.3 Eski 1.742.1 istemcisi + 1.743.0 SQL
- Sipariş iptali çalışıyor (`fis_bag_coz` + başlık yazması kabul), ama hesap 0 → hayalet. S1 fiş iptali sonrası **karşılanan 3** (istemci kalem düşümü boş, alt göndermiyor; sunucu geçmiş bağı bilmiyor).
- S2a iki sıra: 3/3 hayalet.
- Birleştirme: A 3 (miktar 20), B silindi, D2a 1 → **teslim 4 kayboldu** (açık risk, F2).
- Geri yükleme, kurallar kapalı: hesap 0 ≠ 3, D1b 1, D6a 1 (açık risk, F5). Kurallar açık: stok yazması reddedildi, karşılanan 3 = hesap 3 (YEŞİL).
- **Geri dönülmüş 1.742.1 SQL'inde** (`geri-donus-1741.sh` d): kurallar açık geri yükleme de KIRMIZI — R1b tetikleyicisi 1.742.1'de yok, eski istemcinin mutlak karşılananı geçiyor. 1 Kasım `c41-s41` sonucuyla aynı.
