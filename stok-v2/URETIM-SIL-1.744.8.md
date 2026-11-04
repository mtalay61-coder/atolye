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

### 2.5 `12-geri-al.sql` neyi kaldırır

**Kaldırır (üç koruma):** `uretim_sil` işlemi; üretim silme koruması (`uretim_silme_koru` tetikleyicileri ve işlevi); silinmiş
üretime hareket kilidi (`uretim_bag_koru` tetikleyicileri ve işlevi). Geri almadan sonra 1.744.8 cihazlar eski hareketi olan
üretimi SİLMEZ (hiçbir kayıt değişmez), yalnız sunucu fişli üretimi bugünkü (sıralı) yoldan siler; 1.744.7 cihazlar eski davranışa
döner (yarım silme yeniden mümkün).
**Kaldırmaz:** iz tablosu `uretim_silinen` (yalnız silinmiş üretim kimlikleri; RLS'i ve sürüm kapısı tetikleyicisiyle durur), hiçbir
veri satırı. Sınandı: geri almadan sonra 12-sonra-dogrula satır 1–3 tamam değil, 4–6 tamam; satır sayıları aynı.

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
| `t-uretim-paketi.sh` — paket 12, sıkılaştırılmış canlı benzeri kopya, kurallar ve kapı KAPALI: kur, 6/6, tekrar zararsız, sıkılaştırma uygunluğu, yetkiler, kilit, davranış, geri alma (neyi kaldırdığı), veri aynı, Editor | — | 21/21 (`sonuc-regresyon.txt`) |

Regresyon (son hâl): `stok-v2/test/uretim-sil/sonuc-regresyon.txt`.

## 5. 1.744.5 HTML

`yap.sh` her derlemede yalnız en yeni 3 sürüm dosyasını bırakır (`git rm`); 1.744.8 eklenince 1.744.5 silinmişti. Hiçbir yer ona
bağlantı vermiyor (surum.json → 1.744.7; index.html ve sw.js sürüm dosyası adı tutmaz). Bu düzeltme için gerekmediğinden silme PR'dan
ÇIKARILDI (dosya main'deki hâliyle geri). Bir sonraki `yap.sh` derlemesi onu yeniden silecek — yayın derlemesinde karar verilir.

## 6. Açık işler

- Tarayıcı senaryolarında 4 fark (ACIK-ISLER madde 9): `tedarik-girisleri` (ağ kısıtı), `bekleyen-birak`, `sekmeler`, `resim-damga`
  (1.744.7'de de birebir aynı — önceden var).
- Canlıya (ayrı onaylar): 12 → 12-sonra-dogrula 6/6 → 1.744.8 yayını (main + surum.json).
