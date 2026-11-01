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
