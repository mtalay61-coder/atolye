# 1.744.8 — Üretim silme ve çöpten geri yükleme yarım kalmaz (incelemeye; 4 Kasım)

Dalda; **yayınlanmadı** (surum.json 1.744.7'de), main'e birleştirilmedi, canlıya SQL uygulanmadı. Canlı veri silinmedi,
dönüştürülmedi, iptal edilmedi. Koruma ayarları (fiş kuralları, sürüm kapısı) kapalı.

## Hata (kural provası bulgusu)

Fiş defteri kuruluyken (canlıda kurulu) üretim silme:
1. sunucu fişli (ÜRT) satırların fişlerini **tek tek** `fis_iptal` ile iptal ediyor,
2. kalan (fis_kes ile **kesilmemiş**, eski) satırların iptalini köprüden göndermek istiyor — köprü bunu ağa çıkmadan durduruyor
   (038, KR009), 040 kalıcı ret satırı "inceleme"ye ayırıp tabloyu kalanla yeniden gönderiyor ve **başarılı** dönüyor,
3. adım başarılı sayıldığı için üretim kaydını ayrı REST isteğiyle siliyor.

Sonuç (gerçek PostgreSQL'de yeniden üretildi, `stok-v2/test/uretim-sil/sonuc-once.txt`): sunucuda **üretim yok, stok ve cari
hareketleri geçerli** (stok / cari etkisi geri alınmadı), ekranda hareketler silinmiş görünüyor, kullanıcıya "silindi" deniyor,
kopyası çöpe gidiyor. Fişsiz eski cari hareketinde aynı. Ayrıca (1)'deki sıralı iptal yarıda koparsa ilk fişler iptal kalıyordu.

Çöpten geri yükleme: hareketi olan eski çöp kaydı (ürün / cari) geri yüklenince kart ekranda geri geliyor, çöpten çıkıyor ama
sunucuya hiçbir şey gitmiyor (köprü hareket satırlarını durduruyor) — ekran ve sunucu ayrışıyor.

## Düzeltme

**Sunucu (stok-v2/fis-defteri.sql; canlı için ayrı paket `guvenlik/12-uretim-sil-kur.sql`):**
- `uretim_sil(p)` — TEK İŞLEM. Üretimi kilitler; geçerli hareketlerini sunucunun kendi bağından (`uretim_id`) + istemcinin
  eşleştirdiği satır kimliklerinden toplar. **Reddeder (KR010, hiçbir şey değişmez):** fişsiz eski satır; başka kayıt da taşıyan
  eski fiş; istemcinin listesinde olmayan (bu ekranda görünmeyen, ör. başka cihazın az önce yazdığı) geçerli hareket. Değilse bütün
  fişleri `fis_iptal_toplu` ile iptal eder, iptalden sonra geçerli satır kalmadığını denetler, üretimi siler. Herhangi bir adımda
  hata → hepsi geri alınır.
- `uretim_silme_koru` — geçerli stok / cari hareketi olan üretim **hangi yoldan olursa olsun** (eski istemci, REST) silinemez.
  SQL Editor / bakım oturumu muaf. Çöpten geri yüklenen üretimin izini kaldırır.
- `uretim_bag_koru` + `uretim_silinen` — yarış: silme ile aynı üretime yeni fiş aynı anda gelirse üretim başına danışma kilidi
  sıraya sokar; önce fiş → silme bekler ve yeni fişi de görür; önce silme → fiş bekler, silinmiş üretime yazamaz (KR010).
  Henüz eşitlenmemiş (var olmayan) üretime yazma ENGELLENMEZ — yalnız silinmiş olana.

**İstemci (1.744.8):**
- `076-uretim-sil.jsx` — fiş defteri kuruluyken ekrana / çöpe DOKUNMADAN önce `uretim_sil` çağrılır; reddedilirse sebep söylenir,
  hiçbir kayıt değişmez. Sunucuda işlem kurulu değilse (canlının bugünkü hâli): eski hareket varsa silme **hiç denenmez**; yalnız
  sunucu fişli üretim bugünkü yoldan silinir (ve paket kuruluysa REST silme de korumaya tabidir). Hareketsiz üretim de önce
  sunucuya sorulur (görünmeyen hareket).
- `077-cop.jsx` — fiş defteri kuruluyken hareketli eski çöp kaydı (ürün / cari) geri yüklenmez; kayıt çöpte kalır, sebep söylenir.
- `078-fis-kes.jsx` — `uretimSilGonder`, `uretimSilSunucuYok`.

Uygulama kodunun geri kalanı değişmedi. 1.744.7 cihazlar paket 12 kurulunca da korunur: yarım silme REST adımında sunucu
tarafından reddedilir (ekranda "YARIM KALDI" uyarısı; yenileyince düzelir) — veri tutarlı kalır.

## Testler (yerel)

| Test | Önce (1.744.7 + eski SQL) | Sonra (1.744.8 + yeni SQL) |
|---|---|---|
| `stok-v2/test/uretim-sil/t-uretim-sil.js` — gerçek PG, uygulamanın kendi `useUretimSil` / `useCopKutusu` kodu | **18 kırmızı** (`sonuc-once.txt`) | **31/31** (`sonuc-sonra.txt`) |
| `t-uretim-paketi.sh` — paket 12, canlı benzeri kopya, kurallar ve kapı KAPALI (canlı gibi): kur, 6/6 doğrulama, tekrar zararsız, davranış testi, geri alma, veri değişmedi, Editor uyumu | — | 12/12 |

Kapsam: eski fişli (stok + cari) · eski fişli + sunucu işlemi yok · fişsiz cari · sunucu fişli (ÜRT) · doğrudan REST silme ·
yarış iki yönde · başka kayıt taşıyan eski fiş · son adımda hata · görünmeyen hareket · çöp: eski fişli ürün, fişsiz cari ·
tutarlılık (silinmiş üretime geçerli hareket yok; iptal fişte geçerli satır yok; geçerli fişte iptal satır yok).

Regresyon: bkz. DEVAM-NOTU "1.744.8" ve PR açıklaması (kos-butunluk, iki koruma, kos-guvenlik, gecis-provasi, tarayıcı senaryoları).

## Canlıya (ayrı onaylar; şimdi YAPILMADI)
1. `guvenlik/12-uretim-sil-kur.sql` → `12-sonra-dogrula.sql` 6/6 (veriye dokunmaz; geri alma `12-geri-al.sql`).
2. 1.744.8'in yayını (main + surum.json) ayrı karar.
Sıra önerisi: 12 → 1.744.8 yayını. 12 tek başına da güvenli (1.744.7 ile).
