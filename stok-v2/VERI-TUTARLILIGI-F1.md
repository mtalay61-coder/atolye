# Veri tutarlılığı — F1: karşılananın tek yazarı sunucu (v1.743.0, 1 Kasım 2026)

Dal: `claude/r1-siparis-teslim-yarisi`. Yalnız yerelde sınandı. Canlı Supabase'e erişilmedi; main'e birleştirme ve deploy yapılmadı. **Canlıya geçiş ayrıca onay ister.**
Tasarım ve plan: `VERI-TUTARLILIGI-F0.md` (§ 4 kilit, § 8 F1 planı).

**Kullanıcı kararları (1 Kasım):**
1. Canlıdaki farklar toplu düzeltilmez; salt-okur raporla tespit edilir, tek tek değerlendirilir.
2. Yeni teslim ve iptalde otomatik hesaplama yapılabilir; önceden var olan farkın işlem sırasında değişmesi **raporlanır ve test edilir**.
3. Alışta fazla teslim: yönetici onayı, gerekçe ve kayıt zorunlu (F3).
4. Hayalet karşılanan sıfırlanmaz; gece denetiminde açıkça raporlanır.

## 1. Değişiklikler

### Sunucu (`stok-v2/fis-defteri.sql` → `editor/18`; `stok-v2/fis-gece-denetimi.sql` → `editor/20`)

| Öğe | Ne |
|---|---|
| `fis_kalem_hesap(kalem)` | D1: kaleme bağlı geçerli hareketlerin toplamı (satış −, alış +), pozitif; `trim_scale(round(…, 3))`. |
| `fis_kalem_idleri(p)` | Yükteki kalemler: stok satırlarının (bağlı fiş dahil) `kalemId`si ve alt satırlar. |
| `fis_alt_karsilanansiz(alt)` | Fiş işleminde kalem satırından karşılanan ve `artis` **her zaman** çıkar. Anahtar yoksa `alt` aynen kalır; ilk sürümdeki NULL hatası `uctan-uca-fis` 6 ve 8'de yakalandı. |
| `fis_kalem_kilitle(ids)` | **Ön kilit**: kalemler kimlik sırasıyla `for update`, yazmadan önce; işlem öncesi fotoğraf (karşılanan, hesap, hareket var mı). |
| `fis_kalem_karsilanan_yenile(ids, once, işlem, fiş)` | **Tek yazar.** Hareketi olan kalem: karşılanan := hesap. Önceden fark varsa ve değer değişiyorsa iz `onceden_fark` (karar 2). Hayalet: önceki değer + bu işlemin değişimi, iz `hayalet_korundu` (karar 4). Yeni satır kilidi almaz. |
| `fis_kalem_durumlari(ids)` | Tekrar gönderimde (`zatenVar`) güncel değerler. |
| `fis_kes` | İstek kilidi → kalem ön kilidi → fiş / satırlar / `alt_yaz` (karşılanansız) → tek yazar. Yanıta `kalemler` ve `karsilananDuzeltme` eklendi. `fis_kalem_artis` artık çağrılmıyor (fonksiyon geri dönüş için duruyor). |
| `fis_iptal` | Kalem ön kilidi (fişin ve bağlı fişin hareketlerinden kilitsiz okunur) → fiş satırı `for update` → iptaller → tek yazar. Zaten iptal edilmiş fişe gelen tekrar karşılananı **değiştiremez**. |
| `fis_karsilanan_iz` (tablo) | İz kaydı: zaman, eden, işlem, fiş, kalem, tür, önceki karşılanan, önceki hesap, yeni değer. RLS açık; anon ve authenticated için yetki kaldırıldı (`F1.iz-erisimi`). |
| `fis_gece_denetimi` | Yeni `karsilanan` bölümü: `hayalet`, `fark`, `duzeltme` (günün iz kayıtları). `temiz`e katılmaz. |
| `stok-v2/geri-donus-F1.sql` | 1.742.3 `fis_kes`, `fis_iptal` ve `fis_gece_denetimi` (2a81e1f'den birebir) + F1 işlevlerinin kaldırılması. İz tablosu silinmez. |

### Kilit sırası (dosya başında belgeli)
1. İstek kilidi (`pg_advisory_xact_lock`).
2. Sipariş kalemleri, kimlik sırasıyla.
3. İptal edilen fiş satırı.
4. Ardından yazmalar; ilk yazmayla `degisiklik.tekil` alınır.

`tekil`'den sonra yeni satır kilidi alınmaz. `alt_yaz` kalemleri zaten kimlik sırasıyla yazıyor (`distinct on … order by id`), bu sırayla uyumlu.

### İstemci (v1.743.0)
- `src/078-fis-kes.jsx`:
  - `fisKesGonder` ve `fisIptalGonder` yüke `istemci: {surum}` ekler. Sunucu bugün yalnız kabul eder; zorlama F7'de.
  - `fisKesKalemleriUygula`: sunucunun döndürdüğü kalem değerleri yerel siparişe işlenir.
  - `fisKarsilananDuzeltmeBildir`: yanıttaki düzeltmeler günlüğe yazılır.
- `src/081-siparis-teslim.jsx` (teslim), `src/089-carifisi.jsx` (cari ve stok fişi), `src/100-app.jsx` (fiş iptali): yerel karşılanan ve fark tabanı sunucunun değeriyle kurulur.
  - Eski sunucuda yanıtta `kalemler` yoktur; o zaman yerel hesap aynen kalır.
  - Miktarı aşan teslim (24 / 20), teslimi yapan cihazda da yenilemeden görünür.
- `src/264-gun-sonu.jsx`: gün sonu raporunda "Sipariş karşılananı" bölümü (hayalet, fark, bugün düzeltilen). `supabase-gun-sonu-fonksiyonu.ts` yeniden üretildi; **canlıda yeniden yapıştırılması gerekir.**
- `src/015-sabitler.jsx`: 1.743.0.
- `test/birim-karsilanan-sunucu.js` (yeni) ve `test/derle.js` (dışa aktarım).

### F1 kapsamı dışında bırakılanlar (bilinçli)
- Fazla teslimin reddi (F3), sipariş durumunun hesaplanması ve iptal (F4), kalem bütünlüğü (F2), geri yükleme (F5), sürüm zorlaması (F7).
- Planda olan `alt_yaz` yanıtına "yok sayılan karşılanan" sayacı **yapılmadı**: `alt-v2.sql` (`editor/7`) değişmesin diye. Karşılanan yine yok sayılıyor, yalnız sayı dönmüyor.

## 2. Testlerde yapılan değişiklikler (bilinçli, gerekçeli)

| Test | Eski beklenti | Yeni beklenti | Neden |
|---|---|---|---|
| `r1-yaris.js` senaryo 8 | Eski yükün mutlak değeri yazılır: karşılanan 1 | Kabul edilir; karşılanan = teslim = 25 | Eski beklenti, stok 25 iken karşılananın 1 olması demekti; bu R1 hatasının kendisi. F1 bunu bilerek kaldırıyor. |
| `t-karsilanan.js` D1.denetim-yakalar | Denetim D1a sayısı > 0 | D1a = bu koşuda karşılananı teslimden farklı kalem sayısı | Eski hâli hatanın varlığına bağlıydı. Yeni hâli her iki sürümde anlamlı; geri dönüş sınamasında 1.742.3'te de yeşil. |
| `t-denetim.js` DN.kalem-baska-sipariste | D2c + D1a + D5b | D2c + D5b | F1 hareketteki kalemin karşılananını hesapladığı için eskiden yan etki olarak doğan D1a yok. Kalem ile sipariş uyuşmazlığının reddi F2'nin işi. 1.742.3'te bu satır kırmızı (`beklenen-geri-donus.txt`). |

Başka hiçbir beklenti değiştirilmedi. `beklenen.txt` farkı: dört D1 satırı KIRMIZI → YESIL, yeni F1.* satırları eklendi.

## 3. Test sonuçları (gerçekten koşuldu, 1 Kasım)

| Test | Sonuç |
|---|---|
| F1 başarısızlık testleri (`t-f1.js`), F1 öncesi (1.742.3 SQL) | 7 kırmızı (yanıtta kalem yok, iz yok, gece bölümü yok, iz tablosu yok, G1 kilitlenmesi), 4 yeşil — `stok-v2/test/f0/sonuc-1.742.3.txt` ile birlikte. |
| `stok-v2/test/kos.sh` (Editor gibi kurulum ×2, sınamalar, uçtan uca, gece, R1, R1b) | **temiz**. İlk denemede uçtan uca 6 ve 8 kırmızıydı → `fis_alt_karsilanansiz` NULL hatası bulundu ve düzeltildi; ayrıca `2.000` ölçek farkı (`trim_scale`) ve gece denetiminde değişken adı çakışması. |
| R1 (`r1-yaris.js`) yeni istemciyle | 9/9 (8. senaryo bilinçli değişti, § 2). |
| R1 **1.742.1 istemcisiyle** (20834ea derlemesi) yeni SQL'de | **9/9 temiz.** Aynı istemci 1.742.3 SQL'inde 1, 2, 6, 6b, 7, 8 kırmızıydı (5 / 10, 19 / 14, tekrar iptal 10 / 14). |
| R1b (`r1b-turetme.js`) | 6/6. |
| F0 + F1 koşucusu (`f0/kos.sh`, 60 kontrol) | Beklenenle AYNI: F0'dan 4 D1 satırı yeşile döndü, başka satır değişmedi (iki test bilinçli güncellendi, § 2). |
| Geri dönüş (`f0/geri-donus.sh`): F1 → geri al → yeniden F1, her adımda F0 / F1 durumu | **Temiz** (iki kez; ikincisi kilit sırası düzeltmesinden sonra, temiz kurulumla). |
| Birim testleri | 1619 ✓, 0 ✗ (yeni: `birim-karsilanan-sunucu.js`). |
| `./yap.sh` (bütün denetimler + paket) | Temiz; `atolye-erp-v1.743.0.html`. |
| Tarayıcı regresyonu (260 senaryo) | 252 AYNI, 8 FARKLI. Tek başına koşunca: `yenileme-ekran` AYNI; `siparis-iptal` uzun beklemeyle AYNI; `sekmeler`, `tedarik-girisleri`, `resim-damga` önceki koşularda da FARKLI; `tanim-basliklari`, `firma-secimi`, `oturum-dustu` **1.742.3 kodunda da** FARKLI (`tanim-basliklari` çıktısı iki sürümde birebir aynı). F1'e bağlanan fark yok. Not: ilk koşu uygulama tarafından durduruldu; kalan 189 senaryo yeniden koşuldu ve 260'ın tamamı altınla karşılaştırıldı. |
| Kural provası (259 senaryo) | **Başarısız (çıkış 1)**: 12 eski yol hareket yazması. 1.742.0 / 1.742.1 / 1.742.3'teki aynı 12 yazma, aynı senaryolar; F1 sayıyı değiştirmedi. F8'de kapanacak. |

**Kilitlenme analizi (degisiklik.tekil):**

| Durum | 1.742.3 | F1 |
|---|---|---|
| G1: kalemi önce kilitleyen işlem + `fis_kes` | **deadlock** | kilitlenme yok |
| `tekil`'i tutan işlem + `fis_kes` | bekler, tamamlanır | bekler, tamamlanır |
| İptal + ters sıralı yeni fiş | kilitlenme yok | kilitlenme yok |
| G4: `fis_iptal` + aynı siparişin `fis_bag_coz`u (araya girme zorlanmış) | — | İlk F1 sırasında (fiş → kalem) **deadlock** ölçüldü; sıra kalem → fiş yapıldı, kilitlenme yok (3/3) |
| G2: durum tetikleyicisi taklidi + REST başlık yazması | deadlock | deadlock (F1'de durum tetikleyicisi yok; F4 bu kuralla yazılacak) |

## 4. Eski sürüm uyumluluğu

| Bileşim | Sınandı mı | Sonuç |
|---|---|---|
| 1.742.1 istemcisi + F1 SQL | Evet (gerçek yükler, eşzamanlı) | R1 9/9; F0 D1 eski / karışık istemci yeşil. Mutlak değer yok sayılır, karşılanan hareketten hesaplanır. |
| 1.742.2 / 1.742.3 istemcisi + F1 SQL | Evet (aynı yük biçimi + `artis`) | `artis` yok sayılır; R1 ve R1b temiz. |
| 1.743.0 istemcisi + 1.742.1 / 1.742.3 SQL | Kısmen: `istemci` alanını eski SQL kabul eder (`F1.istemci-alani-kabul`, 1.742.3 SQL'inde yeşil). `kalemler` yoksa yerel hesap: birim testi ve sahte sunuculu tarayıcı senaryoları. | Gerçek 1.742.1 SQL'ine karşı **sınanmadı**. Sıra SQL önce, uygulama sonra olmalı. |
| Geri dönüş: F1 SQL → 1.742.3 SQL | Evet | Temiz; iz tablosu kalır. |

## 5. Açık riskler

1. **Sipariş iptalinden sonra teslim fişinin iptali.** `fis_bag_coz` hareketin kalem bağını çözdükten sonra fiş iptal edilirse, kalemde hareket görünmez. Karşılanan hayalet olarak korunur ve sıfırlanmaz; gece raporuna düşer. 1.742.3'te istemcinin gönderdiği artışla 0'a inerdi. Kalıcı çözüm F4 (bağ korunur).
2. **`fis_bag_coz` ↔ `fis_iptal` ters sırası** (hareket ↔ fiş) 1.742.3'te de vardı; dar bir pencere olarak kalıyor (F4).
3. **Üretim ataması** (`alt.uretim_atamalari`), `fis_kes` içinde `tekil`'den sonra kilitleniyor. Aynı atamayı tek deyimle yazan `alt_yaz` ile kuramsal kilitlenme riski var. 1.742.3'ten beri var; **sınanmadı**.
4. **Toplu yeniden hesaplama yok** (karar 1). Canlıdaki D1a farkları, o kaleme yeni bir teslim ya da iptal gelene kadar durur. Gelirse düzelir ve iz bırakır (karar 2).
5. **`alt_yaz` yanıtında "yok sayılan karşılanan" sayacı yok** (bilinçli; `editor/7` değişmesin diye).
6. **F2–F8 açık:** fazla teslim reddi, teslimli kalem silme ve birleştirme, durum, iptal, geri yükleme, sürüm zorlaması, kural provasındaki 12 yazma.
7. **Canlı şema:** yerel test şeması canlıdan farklı (sipariş sütunları). Sipariş başlığı testlerde taklit edildi; canlı salt-okur kontrolünün çalıştırılması gerekiyor.

## 6. Canlıya geçiş (AYRICA ONAY GEREKİR — yapılmadı)

**Ön koşul:** `canli-salt-okur-kontrol.sql` çalıştırılır ve saklanır, yedekler alınır (F0 § 6).

Sıra:
1. `stok-v2/editor/18-fis-defteri.sql` çalıştırılır. 1.742.2'nin R1, 1.742.3'ün R1b'si ve F1 birlikte canlıya girer; canlı bugün 1.742.1 SQL'inde.
2. `stok-v2/editor/20-gece-denetimi.sql` çalıştırılır.
3. `supabase-gun-sonu-fonksiyonu.ts` Supabase'e yeniden yapıştırılır.
4. Salt-okur kontrol tekrar çalıştırılır.
5. `surum.json` → 1.743.0.

Geri dönüş: `surum.json` 1.742.1'e döndürülür, ardından `geri-donus-F1.sql` çalıştırılır.

**Dikkat:** `geri-donus-F1.sql` 1.742.3 davranışına döner, 1.742.1'e değil. 1.742.1 SQL'ine dönmek için 20834ea'nın `editor/18`'i gerekir; bu bileşim yerelde sınanmadı.
