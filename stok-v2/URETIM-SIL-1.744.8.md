# 1.744.8 — Üretim silme ve çöpten geri yükleme yarım kalmaz (İNCELEME PAKETİ; 4 Kasım)

Dalda; **yayınlanmadı** (surum.json 1.744.7), main'e birleştirilmedi, canlıya SQL (12) uygulanmadı. Canlı veri silinmedi,
dönüştürülmedi, iptal edilmedi. Koruma ayarları (fiş kuralları, sürüm kapısı) kapalı.

## 1. Hata

Fiş defteri kuruluyken (canlıda kurulu) üretim silme: sunucu fişli (ÜRT) fişleri tek tek iptal ediyor, kalan (fis_kes ile
**kesilmemiş**, eski) satırların iptalini köprüden göndermek istiyor — köprü bunu ağa çıkmadan durduruyor (038, KR009), 040 kalıcı
ret satırı "inceleme"ye ayırıp tabloyu kalanla yeniden gönderiyor ve **başarılı** dönüyor (`src/040-esitle.jsx:724`), üretim kaydı
ayrı REST isteğiyle siliniyor. Gerçek PostgreSQL'de yeniden üretildi (`stok-v2/test/uretim-sil/sonuc-once.txt`, 18 kırmızı):
sunucuda **üretim yok, stok ve cari hareketleri geçerli**; ekran hareketleri silinmiş gösteriyor, "silindi" deniyor, kopya çöpe
gidiyor. Fişsiz eski cari hareketinde aynı. Çöpten geri yükleme: hareketli eski çöp kaydında kart yalnız ekranda geri geliyor.

## 2. Sunucu düzeltmesi (`stok-v2/fis-defteri.sql`; canlı için `stok-v2/guvenlik/12-uretim-sil-kur.sql` — aynı metin)

### 2.1 Yetkiler

| Nesne | Tür | search_path | authenticated | anon | PUBLIC | Not |
|---|---|---|---|---|---|---|
| `uretim_sil(jsonb)` | security definer | `public, extensions, pg_temp` | **çalıştırır** | hayır | hayır | içeride `stk_yetki(['uretim'],'silme')` — Üretim silme yetkisi olmayan kullanıcı 42501; `fis_iptal_toplu` fiş iptali yetkisini ayrıca denetler |
| `uretim_silme_koru()` | security definer, tetikleyici | aynı | hayır | hayır | hayır | `uretim` BEFORE DELETE + AFTER INSERT (geri yükleme izi siler) |
| `uretim_bag_koru()` | security definer, tetikleyici | aynı | hayır | hayır | hayır | `stk_hareket`, `car_hareket` BEFORE INSERT / UPDATE OF uretim_id |
| `uretim_silinen` | tablo (iz) | — | yetki yok | yetki yok | yetki yok | RLS açık; yalnız tetikleyici yazar; sürüm kapısı tetikleyicisi kurulu |

Önceki güvenlik sıkılaştırmasına (2-sikilastir) uygunluk, canlı benzeri sıkılaştırılmış kopyada 12'den SONRA doğrulandı
(`t-uretim-paketi.sh`): `2-sonra-dogrula.sql` 8/8 tamam (girişsiz çalıştırabilen yine yalnız 9 site + yonetici_mi; search_path'i
sabit olmayan fonksiyon 0; yeni fonksiyonlar girişsize kapalı), tablodaki her satır tek tek ölçüldü.

### 2.2 Kilit sırası (kilitlenme olmaz)

`uretim_sil` her yerde AYNI sırayla kilitler — `fis_kes` ve doğrudan silmeyle uyumlu:
1. iptal edilecek fişlerin (+ bağlı fiş) kalem → çek → kasa hesabı → fiş başlığı kilitleri (`fis_iptal_toplu`'nun sırası);
   `fis_kes` de önce kalem / kasa kilitlerini alır, üretim kilidini satır yazarken (`uretim_bag_koru`, paylaşımlı) ister;
2. üretim satırı (`FOR UPDATE`) — doğrudan REST silme de önce satırı kilitler;
3. üretim danışma kilidi (`uretim:<id>`, özel) — `uretim_silme_koru` ile aynı anahtar.

Kilitler alındıktan SONRA fiş kümesi yeniden hesaplanır; 1)'de kilitlenmemiş yeni fiş çıktıysa (başka cihaz o arada yazdı) KR010 —
yeni kilit istemek sırayı bozardı. **İnceleme sırasında bulunan hata:** 0649412'deki ilk sürüm üretim kilidini kalemden ÖNCE alıyordu;
aynı kaleme eşzamanlı teslimle **kilitlenme (40P01)** oluşuyordu (veri tutarlı kalıyordu, ama kullanıcının teslimi nedensiz hatayla
düşüyordu). `t-uretim-kilit.js` eski sırada 4 kırmızı (40P01, `sonuc-kilit-once.txt`), yeni sırada temiz.

### 2.3 Hata durumunda tam geri alma

Bütün adımlar TEK veritabanı işleminde. Herhangi bir `raise` — KR010 (fişsiz eski satır / başka kayıt taşıyan eski fiş / ekranda
görünmeyen hareket / araya giren fiş / iptal sonrası kalan hareket), `fis_iptal_toplu` hatası, silme koruması, sürüm kapısı AT001,
kilitlenme — işlemi **tamamen** geri alır, fiş iptalleri dahil. Sınandı: S3 (eski fiş başka kayıt taşıyor → aynı üretimin sunucu fişi
de iptal EDİLMEZ), S4 (son adımda yapay hata → iptaller geri), S5 (görünmeyen hareket), F (bağlantı kopması, t-dayaniklilik).

### 2.4 Eski istemci koruması

1.744.7 (ve daha eski) cihazlar üretimi REST ile siler. `uretim_silme_koru` geçerli stok / cari hareketi olan üretimin silinmesini
**hangi yoldan olursa olsun** reddeder (KR010; S1) → eski istemcide de "üretim yok, hareket geçerli" oluşmaz. Eski istemci ekranda
"YARIM KALDI" görür, yenileyince düzelir. Silinmiş üretime hareket yazılamaz (`uretim_bag_koru` + iz tablosu; S2b). SQL Editor /
bakım oturumu (jwt yok) muaf. Var olmayan / henüz eşitlenmemiş üretime yazma engellenmez — yalnız silinmiş olana.

### 2.5 `12-geri-al.sql` neyi kaldırır — ve GERİ ALMA PLANI

**Kaldırır (üç koruma):** `uretim_sil` işlemi; üretim silme koruması (`uretim_silme_koru` tetikleyicileri ve işlevi); silinmiş
üretime hareket kilidi (`uretim_bag_koru` tetikleyicileri ve işlevi).
**Kaldırmaz:** iz tablosu `uretim_silinen` (yalnız silinmiş üretim kimlikleri; RLS'i ve sürüm kapısı tetikleyicisiyle durur), hiçbir
veri satırı. Sınandı: geri almadan sonra 12-sonra-dogrula satır 1–3 tamam değil, 4–6 tamam; satır sayıları aynı.

> **⚠ RİSK GERİ GELİR.** 12 kaldırılırsa **1.744.7 (ve eski) cihazlarda YARIM SİLME yeniden mümkündür**: eski hareketi olan üretim
> silinince üretim kaydı gider, stok / cari hareketleri geçerli kalır (1.744.7 hatası). 1.744.8 cihazlar işlem yokken eski hareketi
> olan üretimi SİLMEZ (hiçbir kayıt değişmez), yalnız sunucu fişli üretimi eski (sıralı) yoldan siler.

**Geri alma gerekirse üretim silme önce DURDURULUR** — `12-silme-durdur.sql`: `uretim` üzerinde BEFORE DELETE tetikleyicisi, oturumlu
(jwt'li) her silmeyi KR011 "Üretim silme geçici olarak durduruldu (bakım) — hiçbir kayıt değişmedi" ile reddeder; REST silme
de `uretim_sil` de durur, **Yönetici dahil**. Yetkiyi kapatmak YETMEZ: `rls-yazma.sql` `silme_koruma` Yönetici'yi her zaman geçirir.
SQL Editor / bakım oturumu (jwt yok) muaf. Fonksiyon security definer, search_path sabit, kimseye EXECUTE yok. Sıra:

1. `12-silme-durdur.sql` (üretim silme durur; veri değişmez)
2. `12-geri-al.sql`
3. sorun giderilip 12 yeniden kurulunca → `12-sonra-dogrula.sql` 6/6 → `12-silme-durdur-kaldir.sql` (silme yeniden açılır)

Durdurmadan geri almak yalnız bütün cihazlar 1.744.8'deyse ve `13` bölüm B = 0 ise kabul edilebilir. 12 kurulu değilken
`12-silme-durdur-kaldir.sql` çalıştırılırsa yarım silme riski 1.744.7 cihazlarda yeniden açılır (dosya başlığında yazılı).
Sınandı (`t-uretim-paketi.sh`): durdurma açıkken REST ve `uretim_sil` KR011, hiçbir satır değişmedi; kaldırınca silme çalışıyor.

### 2.6 12 öncesi salt-okur kontrol — `13-uretim-hareket-salt-okur.sql`

Hiçbir şey yazmaz, silmez, iptal etmez, dönüştürmez. Satırlar: bölüm · kontrol · sayı · miktar/tutar · örnek (en çok 10 kimlik;
ünvan / açıklama dönmez).
- **A — geçmişte oluşmuş yarım silme:** üretim kaydı YOK ama stok hareketi / cari hareketi / fiş başlığı geçerli; etkilenen üretim
  kimlikleri. "Kayıt yok" = silinmiş YA DA bu cihazdan buluta hiç yazılmamış — örnek kimliklerle ayırt edilir. **Bulunanlar
  değiştirilmez**; ne yapılacağı ayrı karar (seçenekler: dokunma; fiş numarasıyla fiş iptali; çöpten üretimi geri yükleme).
- **B — 1.744.8'in reddedeceği üretimler:** duran üretimde eski fişli (istek boş) ya da fişsiz geçerli hareket — 12 ve 1.744.8 sonrası
  uygulamadan silinemez (hiçbir kayıt değişmeden reddedilir).
- **C — genel:** üretim sayısı, geçerli hareketli üretim sayısı, `uretim_sil` kurulu mu.
- Sınır: bağ yalnız `uretim_id` sütunundan okunur; bağı yalnız fiş numarasında olan çok eski satırlar görünmez.
- Sınandı (`t-uretim-paketi.sh`): yerelde bilerek oluşturulan yarım silme A1 (stok), A2 (cari), A3 (fiş başlığı) satırlarında bulundu;
  sorgu sonrası satır sayıları aynı, yarım kalan hareketler hâlâ geçerli (salt-okur).

## 3. İstemci (1.744.8; `src/` 0649412'den beri değişmedi)

- `076-uretim-sil.jsx` — fiş defteri kuruluyken ekrana / çöpe DOKUNMADAN önce `uretim_sil`; reddedilirse sebep, hiçbir kayıt değişmez.
  İşlem sunucuda yoksa (canlının bugünkü hâli): eski hareket varsa silme hiç denenmez; yalnız sunucu fişli üretim bugünkü yoldan.
  Hareketsiz üretim de önce sunucuya sorulur (görünmeyen hareket).
- `077-cop.jsx` — fiş defteri kuruluyken hareketli eski çöp kaydı (ürün / cari) geri yüklenmez.
- `078-fis-kes.jsx` — `uretimSilGonder`, `uretimSilSunucuYok`.

## 4. Testler

| Test | Önce | Sonra |
|---|---|---|
| `t-uretim-sil.js` — gerçek PG, uygulamanın kendi `useUretimSil` / `useCopKutusu` kodu: eski fişli, eski fişli + işlem yok, fişsiz, sunucu fişli, S1–S5, çöp (eski fişli ürün, fişsiz cari), tutarlılık | 18 kırmızı (`sonuc-once.txt`) | 31/31 (`sonuc-sonra.txt`) |
| `t-uretim-kilit.js` — kilitlenme | 4 kırmızı, 40P01 (`sonuc-kilit-once.txt`) | temiz |
| `t-uretim-bakiye.sh` (7 Kasım) — paket 12 canlı benzeri kopyaya (12-geri-al → 12-kur → 6/6); eski fişli / yeni fişli / karma / fişsiz cari üretim: stok (stk_stok) ve cari bakiye silme öncesi/sonrası beklenenle; silinen üretime bağlı geçerli hareket / fiş başlığı; aynı kalemde eşzamanlı teslim ∥ silme (bağlı / bağsız, iki zorla sıra + 12 doğal yarış); tekrar silme (ardışık, eşzamanlı, reddedilenden sonra); kurallar kapalı VE açık; geri dönüş (durdur → geri-al → veri aynı → yeniden kur → durdurmayı kaldır) | — | 49/49 × 2 kip + 16/16 paket adımı = 114 ✓, 0 ✗ (`sonuc-bakiye.txt`) |
| `t-uretim-paketi.sh` — paket 12, sıkılaştırılmış canlı benzeri kopya, kurallar ve kapı KAPALI: kur, 6/6, tekrar zararsız, sıkılaştırma uygunluğu, yetkiler, kilit, davranış, geri alma (neyi kaldırdığı), veri aynı, Editor | — | 21/21 (`sonuc-regresyon.txt`) |

Regresyon (son hâl): `stok-v2/test/uretim-sil/sonuc-regresyon.txt`.

## 5. 1.744.5 HTML

`yap.sh` her derlemede yalnız en yeni 3 sürüm dosyasını bırakır (`git rm`); 1.744.8 eklenince 1.744.5 silinmişti. Hiçbir yer ona
bağlantı vermiyor (surum.json → 1.744.7; index.html ve sw.js sürüm dosyası adı tutmaz). Bu düzeltme için gerekmediğinden silme PR'dan
ÇIKARILDI (dosya main'deki hâliyle geri). Bir sonraki `yap.sh` derlemesi onu yeniden silecek — yayın derlemesinde karar verilir.

## 6. Açık işler

- Tarayıcı senaryolarında 4 fark (ACIK-ISLER madde 9): kök nedenleri kanıtlandı (7 Kasım, `TARAYICI-4-FARK.md`) — dördü de test
  düzeneği / ortam; uygulama hatası yok, `src/` değişmedi. Testler düzeltildi; altın değişiklikleri gerekçeli.
- Canlıya (ayrı onaylar; **12 ve yayın yedek alınmadan YOK**): 13 (salt-okur — yedekten bağımsız, istenince çalıştırılabilir) → yedek → 12 → 12-sonra-dogrula 6/6 → 1.744.8 yayını (main + surum.json).
