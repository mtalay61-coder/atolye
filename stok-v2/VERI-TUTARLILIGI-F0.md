# Veri tutarlılığı — F0 raporu (1 Kasım 2026)

Dal: `claude/r1-siparis-teslim-yarisi`, kod tabanı **1.742.3 (2a81e1f)**. F0 yalnız test, denetim ve plan içerir: üretim kodu, SQL fonksiyonları ve iş kuralları değişmedi. Canlı Supabase'e erişilmedi, main'e birleştirme ve deploy yapılmadı. Tasarım kullanıcı tarafından prensipte kabul edildi (1 Kasım); F1–F8 henüz onaylanmadı.

**Kullanıcı kararları (1 Kasım):**
1. Sipariş iptalinde **A**: teslim geçmişi ve fiş bağlantıları korunur.
2. Fazla teslim satışta varsayılan olarak **yasak**; istisna yalnız yetkili yönetici onayı ve gerekçeyle. Alış kuralları ayrıca incelenecek (§ 5).
3. Fiş sistemi açıkken, güvenli olduğu kanıtlanmamış **tam yedek geri yükleme kapalı**. Kart ve tanım geri yüklemesi de referans bütünlüğü denetiminden geçer.
4. Hayalet karşılanan ve sahipsiz hareket **otomatik silinmez ya da sıfırlanmaz**, önce raporlanır.

---

## 1. Dosyalar

| Dosya | Ne |
|---|---|
| `stok-v2/test/f0/ortak.js` | Ortak yardımcı. Yükler uygulamanın kendi kodundan (`test/erp.cjs`) üretilir; köprü yazmaları `supabaseTabloEsitle` → yerel PG'ye gider. |
| `stok-v2/test/f0/t-karsilanan.js` | D1: karşılanan = geçerli hareket toplamı. Eski / yeni / karışık istemci, tekrar gelen iptal, alış. |
| `stok-v2/test/f0/t-kalem-bag.js` | D2–D3: birleştirme, teslimli kalemi silme, renk değişikliği, miktarı teslimin altına indirme. |
| `stok-v2/test/f0/t-fazla.js` | D4: satışta eşzamanlı ve onaysız fazla teslim; alış için gözlem. |
| `stok-v2/test/f0/t-iptal.js` | D5: iptalde bağın korunması, iptal edilmiş siparişe teslim, eşzamanlı teslimde durum. |
| `stok-v2/test/f0/t-yedek.js` | Tam geri yükleme (kurallar açık ve kapalı), kart geri yüklemesinde referans bütünlüğü. |
| `stok-v2/test/f0/t-surum.js` | Sürüm kontrolü mekanizması ve eski yükün reddi. |
| `stok-v2/test/f0/t-kilit.js` | Kilitlenme: bugünkü kod ve tasarımdaki düzenin taklidi (G1–G3). |
| `stok-v2/test/f0/t-denetim.js` | Denetimin kendi doğrulaması: iyi veri temiz, 14 enjeksiyonun her biri yalnız hedef kontrolü artırır, canlı dosyası aynı sorguyu taşır ve yazma komutu içermez. |
| `stok-v2/test/f0/denetim.sql` | D1–D6 denetimi (16 kontrol), tek bir salt-okur SELECT. |
| `stok-v2/canli-salt-okur-kontrol.sql` | Canlı için salt-okur kontrol: 1. bölüm kurulum ve sayımlar, 2. bölüm `denetim.sql`'in aynısı. **Kullanıcı çalıştırır; Claude çalıştırmadı.** |
| `stok-v2/test/f0/beklenen.txt` | Her kontrolün bugünkü beklenen durumu (KIRMIZI / YESIL). |
| `stok-v2/test/f0/kos.sh` | Koşucu: `F0_YENIDEN=1` veritabanını `stok-v2/test/kos.sh` ile yeniden kurar. Çıkış 0 = her kontrol beklenen durumda. |
| `stok-v2/test/f0/sonuc-1.742.3.txt` | Temiz veritabanında alınmış koşu çıktısı (önce ve sonra değerleriyle). |

Çalıştırma: `F0_YENIDEN=1 bash stok-v2/test/f0/kos.sh`. Koşu temiz veritabanında ve ardından aynı veritabanında tekrar yapıldı; ikisinde de sapma yok.

**Yöntem notları:**
- **Eski istemci yükü:** 1.742.1 yükü, aynı yükün `artis` alanı çıkarılmış hâli. `20834ea..19381fd` farkında 081'in yüküne eklenen tek şey `artis`. 1.742.1 derlemesinin kendi yükleriyle 1 Kasım'da alınan sonuçlar (5 / 10) ile aynı.
- **Sipariş başlık satırı:** Yerel test şeması canlıdan farklı olduğu için başlığın REST yazmasından yalnız `durum` taklit edilir.
- **Temizlik yok:** Testler kayıt silmez, çünkü silme denetimi kirletir. Her koşu kendi önekiyle süzülür.

## 2. Sonuçlar — yeniden üretilen hatalar (20 KIRMIZI)

| Kontrol | Önce (veritabanı) | Sonra (veritabanı) | Hedef |
|---|---|---|---|
| D1.eski-eszamanli | karşılanan 0, teslim 0 | **karşılanan 5, teslim 10** | 10 / 10 |
| D1.eski-tekrar-iptal | 8 / 8 | **5 / 8** (eski iptalin tekrarı mutlak 5 yazdı) | 8 / 8 |
| D1.karisik-yeni-once | 0 / 0 | **5 / 10** | 10 / 10 |
| D1.alis-eski-eszamanli | 0 / 0 | **5 / 10** (alışta da) | 10 / 10 |
| D2.birlestirme | A 3/3, B 4/4 | **A 3 (20 adet), B silindi, B'nin hareketi 4 sahipsiz** | B durur, 7 / 7 |
| D2.teslimli-sil | A 5/5 | **A silindi, hareketi 5 sahipsiz** | A durur |
| D3.renk-degisir | A Siyah, 5 teslim (Siyah) | **A Beyaz** | Siyah kalır |
| D3.miktar-teslim-alti | 20 adet, 5 teslim | **3 adet, 5 teslim** | 20 kalır |
| D4.satis-eszamanli | 14 / 14 (miktar 20) | **24 / 24, iki fiş de kabul** | biri reddedilir, 19 / 19 |
| D4.satis-onaysiz-fazla | 0 / 0 | **25 / 25 kabul** (işaretli, onaysız) | reddedilir |
| D5.iptal-bag-korunur | durum Bekliyor, 4 / 4, fiş satırı bağlı | **İptal, karşılanan 4, bağlı teslim 0, satır bağsız** | İptal, 4 / 4, bağlı |
| D5.iptal-siparise-teslim | İptal | **teslim kabul edildi** | reddedilir |
| D5.durum-eszamanli | Kısmi Teslim, 10 / 20 | **Kısmi Teslim, 20 / 20** | Tamamlandı |
| Y.tam-kurallar-kapali | fiş satırı 1, 3 / 3, fiyat 150 | **satır 0 (satırsız fiş), karşılanan 3, teslim 0, fiyat 100** | değişmez |
| Y.tam-kurallar-acik | 1, 3 / 3, fiyat 150 | **stok reddedildi, sipariş fiyatı 100'e döndü (yarım işlem)** | değişmez |
| Y.kart-referans | C 2 / 2 | **C silindi, hareketi 2 sahipsiz** | reddedilir |
| S.mekanizma-var | — | sütun ve iz tablosu yok | var |
| S.eski-yuk-red | 0 / 0 | **5 / 5 kabul** | AT001 ile red |

**Korunması gereken bugünkü doğru davranışlar (YEŞİL):**
- Yeni istemcide eşzamanlı teslim 10 / 10, iptal ve tekrarı 5 / 5.
- Teslimsiz kalem silinebiliyor.
- Miktar teslimin üstünde değiştirilebiliyor (20 → 15).
- Tam sınırdaki teslim (20 / 20) kabul ediliyor.
- Kilit sırası (§ 4).

**Denetimin kendisi:** 16 kontrol, iyi veri kümesinde sıfır bulgu. 14 enjeksiyonun her biri yalnız beklenen kontrolleri artırıyor (`t-denetim.js`).

**Yeni bulgular (1 Kasım raporunda yoktu):**
- İptal edilmiş siparişe teslim kabul ediliyor (D5.iptal-siparise-teslim).
- `fis_bag_coz` ile iptal edilen siparişte karşılanan, hareketi olmayan hayalet karşılanana dönüşüyor (DN.bag-cozulmus: D5a + D1b).

## 3. Denetim kontrolleri (denetim.sql)

| Kod | Seviye | Ne |
|---|---|---|
| D1a | hata | Karşılanan, geçerli hareket toplamından farklı (hareketi olan kalem). |
| D1b | uyarı | Hayalet: karşılanan sıfırdan büyük, geçerli hareket yok. Otomatik sıfırlanmaz. |
| D1c | uyarı | Net hareket yönü sipariş tipine ters (örn. gönderilenden fazla iade). |
| D2a / D2b | hata | Sahipsiz hareket: kalem ya da sipariş yok. Otomatik silinmez. |
| D2c | hata | Hareketin kalemi başka bir siparişe ait. |
| D2d | hata | Geçerli fiş, var olmayan bir siparişe bağlı. |
| D3 / D3b | hata / uyarı | Hareketin ürünü ya da rengi/bedeni kalemden farklı. Ad karşılaştırması büyük-küçük harf ve boşluk duyarsız; yanlış alarm olabilir. |
| D4a / D4b | hata / bilgi | Miktarı aşan teslim, işaretsiz / işaretli. |
| D5a | uyarı | Bağı çözülmüş teslim (iptal edilmiş sipariş). |
| D5b | uyarı | Durum, teslimle çelişiyor. |
| D6a / D6b | hata | Satırsız stok fişi; iptal edilmiş fişin geçerli satırı. |

**İade:** Ayrı bir iade fiş türü yok. Teslim geri alma, fişin iptalidir (hareket iptal olur, teslimden düşer; iyi veri kümesinde var ve temiz). Üretimdeki artan iade satırları kaleme bağlı değildir. Kaleme bağlı ters yönlü hareket teslimi azaltır; net ters yön D1c'de raporlanır.

## 4. Kilitlenme ve sonsuz güncelleme analizi

**Bugünkü durum (ölçüldü):**
- `alt_yaz`, kalem satırlarını `distinct on (r.id) … order by r.id` ile **kimlik sırasıyla** yazıyor. Kalem kilitleri bu yüzden hep aynı sırada alınıyor; ters sıralı iki fiş, ya da fiş ile ters sıralı düzenleme, kilitlenmiyor (K.* yeşil).
- Aynı önekli (örn. SF) ve aynı gün kesilen fişler, `fis_sayac` satırında sıraya giriyor.
- **Gizli sıraya sokma noktası:** Her izlenen tabloda deyim düzeyinde AFTER `degisiklik_izle` → `degisiklik_bump` tetikleyicisi var. Bu tetikleyici **bütün tablolar için tek** bir satırı (`degisiklik.id = 'tekil'`) güncelliyor. İzlenen bir tabloya yazan her işlem bu satırı ilk yazma deyiminin sonunda kilitliyor ve işlem bitene kadar tutuyor.

**Tasarım riski (taklitle ölçüldü, 3 koşuda 3'ünde aynı):**

| Gözlem | Ne yapıldı | Sonuç |
|---|---|---|
| K.G1 | Kalemi önce kilitleyen işlem (tasarım düzeni) + bugünkü `fis_kes` (önce yazar, sonra kalemi kilitler) | **deadlock detected** |
| K.G2 | Kalem yazıp sonra sipariş satırını güncelleyen işlem (önerilen durum tetikleyicisinin taklidi) + başka cihazın REST başlık yazması | **deadlock detected** |
| K.G3 | G2'nin aynısı, ama sipariş satırı işlemin başında kilitleniyor | kilitlenme yok |

PostgreSQL kilitlenmede bir işlemi `40P01` ile geri alıyor. Veri bozulmuyor, ama kullanıcının işlemi düşüyor. Bu yüzden şu kural tasarıma eklenir:

> **KİLİT SIRASI KURALI:** Birden çok deyim yazan her sunucu işlemi, ihtiyaç duyacağı bütün satır kilitlerini **ilk yazma deyiminden önce** alır. Sıra: (1) istek kilidi (`pg_advisory_xact_lock`), (2) `siparis_kalemleri` kimlik sırasıyla, (3) `siparisler` kimlik sırasıyla, (4) fiş satırları (`stk_fis … for update`), ardından yazmalar. İlk yazmayla birlikte `degisiklik.tekil` kilitlenir; ondan sonra **yeni bir satır kilidi alınmaz**.

**Bu kuralın tasarıma etkisi:**
- **D1 (karşılanan):** Tasarımdaki genel tetikleyici (`stk_hareket` AFTER, deyim düzeyinde) karşılananı `degisiklik.tekil`'den sonra yazar. Ön kilit almayan her hareket yazarı (eski `stk_yaz` / `fis_yaz` yolu, `stk_renk_tasi`, `fis_bag_coz`) G1 türü kilitlenme riski taşır.
  - **Öneri:** F1'de genel tetikleyici yerine `fis_kes` ve `fis_iptal` içinde **açık çağrı** ve ön kilit; geri kalanı her gece D1a denetimiyle izlenir.
- **D5 (durum):** Durumu tetikleyiciyle `siparisler` tablosuna yazmak G2'yi doğurur.
  - **Öneri:** Durum yalnız ön kilit alan sunucu işlemlerinde güncellenir (`fis_kes`, `fis_iptal`, `siparis_iptal`; sipariş satırı başta kilitlenir, G3).
  - REST başlık yazmasının teslimle ilgili durum değişikliğini BEFORE UPDATE tetikleyicisi **ek kilit almadan** yok sayar.
- **Sonsuz güncelleme:**
  - Önerilen zincir hareket → kalem → (sipariş) yönünde ve geri yazmıyor. Kalem tetikleyicisi yalnız `new` değerini değiştiriyor; sipariş tetikleyicisi yalnız okuyor.
  - Mevcut tetikleyiciler (`degisiklik_bump` → `degisiklik`; `arsive_kopyala_silinen` → `silinen_arsiv`; `fis_satirsiz_denetle` ertelenmiş ve salt-okur) sipariş, kalem ya da hareket tablolarına yazmıyor; döngü yok.
  - Güvence olarak yeni tetikleyicilerde `pg_trigger_depth() > 1` ise erken dönüş kullanılacak. Deyim düzeyindeki tetikleyiciler sıfır satırda da çalışır; boş geçiş tablosunda hemen döner.
- **Başarım:** `degisiklik.tekil`, bütün yazmaları ilk yazmadan sonra zaten sıraya sokuyor. Yeni ön kilitler bunu değiştirmez, kısa tutulmalı: ön kilitten sonra uyku ya da dış çağrı yok. Bu satırın tablo başına satıra bölünmesi ayrı bir iş (F dışı); önerilmiyor, yalnız not.

## 5. Alış siparişinde fazla teslim — bugünkü iş kuralları (inceleme, karar sizin)

- **Sipariş teslim ekranı (081, satır 213):** Fazla teslimi **alışta da reddediyor** ("Sipariş aşılıyor"). Tipe göre ayrım yok. Stok yeterlilik kontrolü yalnız satışta.
- **Cari fişi formu (255, satır 339):** Siparişten ekleme yapılırken fazla miktar son kaleme yazılıyor, satır `fazlaGonderim` ile işaretleniyor, **kabul ediliyor**. Satışta da alışta da aynı.
- **089 (fiş kalem bağı):** Karşılananı `Math.min(miktar, …)` ile miktarda kesiyor (yerel gösterim).
- **Sunucu:** Hiçbir tipte kontrol yok. Ölçüm (gözlem): alışta 14 + 5 + 5 → 24 / 24; tek istekte 25 → kabul, işaretli.
- **Karar gereken:** Alışta fazla kabul (tedarikçi fazla gönderdi) (a) serbest mi, işaretli olarak; (b) satış gibi yönetici onaylı mı; (c) bir oran sınırıyla mı (örn. %5)? İki ekranın aynı kuralı izlemesi de gerekiyor; bugün 081 ile 255 çelişiyor.

## 6. Canlıya geçiş öncesi yedekleme ve geri dönüş planı

**Önce (her biri kullanıcı tarafından, sırayla):**
1. **Salt-okur kontrol:** `stok-v2/canli-salt-okur-kontrol.sql` dosyasının 1. ve 2. bölümleri **ayrı ayrı** çalıştırılır. Sonuçlar CSV olarak saklanır (`canli-kontrol-<tarih>-once`).
   - 1. bölümdeki `fonksiyon_ozetleri` (md5), canlıdaki fonksiyonların hangi sürüm olduğunu kayda geçirir.
   - 2. bölümdeki D1–D6 sayıları, sonrası için temel çizgidir. Hayalet ve sahipsiz kayıtlar burada listelenir; dokunulmaz (karar 4).
2. **Veritabanı yedeği:**
   - Supabase panosunda otomatik günlük yedek varsa, son yedeğin tarihi not edilir.
   - Ek olarak mantıksal döküm alınır (`pg_dump`). Bu, kullanıcının kendi bilgisayarında, Supabase veritabanı bağlantı parolasıyla yapılır; parola koda ya da depoya **girmez**.
   - Kapsam: en az `stk_*`, `car_hareket`, `kas_*`, `siparisler`, `siparis_kalemleri`, `uretim*`, `fis_sayac`, `degisiklik`, `tanimlar`.
3. **Uygulama yedeği:** Bir cihazdan uygulamanın JSON yedeği indirilir (Tanımlar › yedek). Bu yedek **geri yükleme için değil** (karar 3), karşılaştırma içindir.
4. **Geri dönüş dosyaları hazır olur:**
   - Her aşama kendi `geri-donus-F<n>.sql` dosyasıyla gelir: yeni tetikleyici ve fonksiyonları kaldırır, önceki fonksiyon sürümlerini kurar. Yerelde iki yönde de denenmiş olur: kur → geri al → eski istemci senaryoları.
   - 1.742.1 HTML dosyası yayında hazır tutulur. `yap.sh` yalnız son 3 sürümü bırakıyor; geri dönüşte dosya git geçmişinden (`git show 20834ea:atolye-erp-v1.742.1.html`) geri konur.
5. **Kesinti penceresi:** Kullanıcılar bilgilendirilir. Geçiş sırasında kayıt girilmez (bakım kipi F5'te gelecek; ondan önce sözlü duyuru).

**Geçiş (sırayla):**
1. SQL kurulur (geriye uyumlu, zorlama kapalı).
2. Salt-okur kontrol tekrar çalıştırılır. D1–D6 sayıları temel çizgiden kötü olmamalı.
3. Uygulama yayınlanır (`surum.json`).
4. Bir gün izleme. Sürüm zorlaması ve 19. adım ayrı onaylarla, sonra.

**Geri dönüş tetikleyicileri:**
- D1a, D2* ya da D6* sayılarının artması;
- `AT00x` ya da `deadlock detected` hatalarının sık görülmesi;
- teslim, iptal ya da sipariş düzenlemenin kullanılamaz olması.

**Geri dönüş adımları:**
1. `surum.json` 1.742.1'e döndürülür. Açık sekmeler 10 dakikalık dönüşte ya da yenilemede eski sürüme geçer.
2. `geri-donus-F<n>.sql` çalıştırılır.
3. Salt-okur kontrol tekrar çalıştırılır.

Veri geri **yüklenmez**: yeni sürümde kesilen fişler geçerli kalır, eski SQL bunları okuyabilir (şema eklemeli, sütun silinmez).

## 7. F1–F8 yeniden değerlendirme

| Aşama | Değişiklik (F0 bulgularıyla) | Bağımlılık | Risk |
|---|---|---|---|
| F1 karşılananın tek yazarı | Genel tetikleyici yerine `fis_kes` / `fis_iptal` içinde ön kilit ve açık hesaplama (§ 4). Yanıta kalem değerleri; istemci sürüm bilgisini göndermeye başlar (zorlama yok). | F0 | Orta: yük biçimi değişmez; `fis_kalem_artis` kaldırılınca 1.742.2/3 istemcilerinin artış bilgisi yok sayılır. |
| F2 kalem bütünlüğü | BEFORE DELETE/UPDATE koruması + yabancı anahtar. Yabancı anahtar **NOT VALID** başlar; canlı D2a/D2b sayısı sıfır değilse VALIDATE yapılmaz (karar 4). | F1 | Orta: 1.742.1'in birleştirmeleri hata alır (görünür hata). |
| F3 fazla teslim | Satışta red + yönetici onayı; alış kuralı § 5'teki karara göre. 255 ve 081 tek kurala bağlanır. | F1, alış kararı | Orta: kullanıcının akışı değişir. |
| F4 sipariş iptali (A) | `siparis_iptal` (ön kilit: kalemler → sipariş), bağ korunur; iptal edilmiş siparişe teslim reddedilir (yeni bulgu). `fis_bag_coz` eski istemciler için F7'ye kadar kalır. | F1 | Orta: `fis_bag_coz` açık kaldıkça D5a sürer. |
| F5 geri yükleme | Fiş kipinde tam geri yükleme kapalı (karar 3); kart ve tanım ön kontrolü; bakım kipi. | F2 | Düşük-orta. |
| F6 bekleyen kayıt geçişi | Önce tarayıcı başarısızlık testi (F0'da yazılmadı: açılıştaki yeniden gönderimin sahte sunucuda güvenilir üretimi ayrı düzenek istiyor). | F1 | Orta. |
| F7 sürüm zorlaması | `min_istemci_surum` + iz tablosu; SQL ile açılır. | F1–F6 yayında | Yüksek: zorlama anında eski sekmeler yazamaz. |
| F8 kurallar | Kural provasındaki 12 eski yol iptali (1.742.0'dan beri), sonra 19. adım. | F7 | Orta. |

**Durum hesabı:** Tasarımda F4'e bağlıydı. § 4 nedeniyle tetikleyiciyle değil, ön kilitli işlemlerde yapılacak; F1'den sonra F4'le birlikte.

**Sıra önerisi:** F1 → F2 → F4 → F3 → F5 → F6 → F7 → F8. F3 alış kararını beklediği için F4 öne alındı.

## 8. Önerilen F1 uygulama planı (onayınıza)

**Kapsam:** Karşılanan yalnız sunucuda, hareketlerden hesaplanır (D1); kilit sırası kuralı uygulanır; istemci sürüm bilgisi göndermeye başlar (zorlama yok).

**1. SQL (`stok-v2/fis-defteri.sql`, Editor kopyası `editor/18`):**
- `fis_kalem_kilitle(ids text[])`: `select … from siparis_kalemleri where id::text = any(ids) order by id for update` (ilk yazmadan önce).
- `fis_kalem_karsilanan_yenile(ids text[])`:
  - D1 tanımıyla hesaplar: geçerli hareketlerin toplamı, işaret sipariş tipinden.
  - Yalnız farklı olan satırı yazar; `fis.kalem` bayrağı açık.
  - **Hareketi hiç olmayan kalem hesaplanmaz** (hayalet olduğu gibi kalır, karar 4).
- `fis_kes`:
  - istek kilidi ve "zaten var" kontrolünden sonra, `fis_tek_kes`'ten **önce** kalem kimliklerini toplar (stok satırlarındaki `kalemId` + alt satırlar) ve kilitler;
  - `alt_yaz` karşılananı her zaman çıkarılmış satırla çalışır;
  - `fis_kalem_artis` yerine `fis_kalem_karsilanan_yenile`;
  - yanıta `kalemler: [{id, karsilanan}]` eklenir.
- `fis_iptal`: Fiş satırı kilitlenir (bugünkü gibi), fişin hareketlerindeki kalemler ilk yazmadan önce kilitlenir, iptallerin ardından yenile çağrılır, yanıta kalemler eklenir. Tekrar gelen iptal artık mutlak değer yazamaz; D1.eski-tekrar-iptal düzelir.
- `fis_kalem_karsilanan_koru` aynen kalır (köprüden gelen karşılanan yok sayılır). `alt_yaz` yanıtına `yoksayilanKarsilanan` sayısı eklenir.
- **Toplu yeniden hesaplama YAPILMAZ.** Canlı kontroldeki D1a kayıtları için karar sizde: elle inceleme, ya da onaylı tek seferlik hesaplama.
  - Not: Bu kalemlere yeni bir teslim ya da iptal gelirse değer o anda kendiliğinden doğrulanır. Bunun kabul edilebilir olup olmadığı **sorudur**.
- `geri-donus-F1.sql`: 1.742.3 fonksiyonlarını geri kurar.

**2. İstemci:**
- `src/078-fis-kes.jsx` (`fisKesGonder`, `fisIptalGonder`): yüke `istemci: {surum: SURUM}` eklenir; yanıttaki `kalemler` döndürülür.
- `src/081-siparis-teslim.jsx:251`, `src/089-carifisi.jsx:19`, `src/079-fisgerial.jsx` / 100 `sunucuFisiniIptalEt`: yerel karşılanan, sunucunun döndürdüğü değerle güncellenir. `Math.min` gösterimi kalkar; teslimi yapan cihaz 24'ü görür.
- `src/015-sabitler.jsx`: sürüm 1.743.0.

**3. Testler (önce kırmızı, sonra yeşil):**
- F0'da şu satırlar YESIL olmalı: D1.eski-eszamanli, D1.eski-tekrar-iptal, D1.karisik-yeni-once, D1.alis-eski-eszamanli. **Başka hiçbir satır değişmemeli.**
- D4, D5, Y ve S kırmızı kalmalı. Y.tam-kurallar-kapali da kırmızı kalır, çünkü eski `stk_yaz` yolu hesaplama yapmıyor (F5).
- Ek kilit testleri:
  - ön kilitli `fis_kes` + ters sıralı düzenleme;
  - `fis_iptal` + `fis_kes` aynı kalemlerde;
  - G1'in yeni koddaki karşılığı kilitlenmemeli.
- `stok-v2/test/kos.sh` (R1, R1b; `r1-yaris` 7. senaryo 24 / 24 kalır), birim testleri, `./test/kosu.sh`, kural provası.
- Geri dönüş: kur → geri al → F0 durumu 1.742.3 ile aynı.

**4. Commit:** ayrı dal commit'i. Main, canlı ve deploy yok.

**5. F1'den sonra bilinçli olarak açık kalanlar:**
- D1.alis için eski istemcinin artık zararsız olması, F7'deki sürüm zorlamasına bağlı değil; F1 ile sağlanır.
- Fazla teslim (F3), iptal ve durum (F4), geri yükleme (F5), sürüm reddi (F7) açık.

**F1 için sizden gereken iki karar:**
1. Canlıdaki D1a kayıtları (karşılanan ≠ hareket): elle inceleme mi, onaylı tek seferlik hesaplama mı? Yeni işlemle kendiliğinden doğrulanmaları kabul edilebilir mi?
2. Sonraki aşamalar için alış fazla teslim kuralı: (a), (b) ya da (c), bkz. § 5.
