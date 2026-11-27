# Birlikte kurulum: B4/B5 + B3a + B3a-2 + istemci 1.744.43 (HAZIRLIK)

**Durum:** hazırlandı, yerelde sınandı. Canlıya, main'e, yayına ve G-25 deneme projesine UYGULANMADI. Gerçek Supabase'de DENENMEDİ
(bkz. en alttaki bölüm). B4/B5 önceliklidir; diğer ikisi ondan bağımsız kurulup geri alınabilir.

## Neden birleşik aday

1.744.42 dalı (`claude/b3a2-alan-yetki`) main'den çıkmıştı; 1.744.41 dalındaki (`claude/geri-al-ileti`) "İşi Ver" ve "Geri Al"
düzeltmelerini **içermiyordu** (`git merge-base --is-ancestor` olumsuz; 1.744.42 paketinde `fisIptalHepsiZatenIptal`,
`uretimAdimiSunucudaGecerliMi` ve "İş VERİLEMEDİ" iletisi yok). Sürüm numarasının büyük olması içerdiğini göstermez.

**1.744.43** (dal `claude/aday-birlesik`) ikisini birleştirir; yeni davranış eklemez. 1.744.42 tek başına yayınlanmamalıdır.

| Parça | Dosya | SHA-256 |
|---|---|---|
| B4/B5 kurulum | `27-b4-uygula.sql` | `f49078f2361e8546d59e6a0b9c5d52e0ace6474c47663ef2615478e2b327645d` |
| B3a kurulum | `28-b3a-uygula.sql` | `15f1051d5c9f652ac99d091fb329aea67ef35ef10adb82fee1cbe31ba3d38250` |
| B3a-2 kurulum | `29-b3a2-uygula.sql` | `e67eef17c9f40addc6ccb2b22b5166ba8e16284a5ec4f8a468acd2396cfcaef1` |
| İstemci adayı | `atolye-erp-v1.744.43.html` | `35cc6fbf4f0ce66eaa6f4d9552803018b5a9da73e77bd355ca78868bf7017d66` |

Üç SQL dosyası kendi dallarındakiyle bayt bayt aynıdır (birleştirme içerik değiştirmedi).

## Bağımlılıklar

| | Neye dokunur | Önkoşul | Diğer paketlere bağımlılık |
|---|---|---|---|
| **B4/B5** | `fis_kes`, `fis_iptal`, `fis_iptal_toplu` gövdeleri + iki yeni denetim fonksiyonu | canlı gövdelerin beklenen özetleri (`27-b4-onkosul-salt-okur.sql`); tutmazsa kurulum kendini durdurur | yok |
| **B3a** | 14 tabloda `b3a_yazma_koru` tetikleyicisi (tablo düzeyi: listede olmayan ve salt okur hesap yazamaz) | `yetki_var_mi` | yok |
| **B3a-2** | `cariler`, `urunler`, `tanimlar` üzerinde `b3a2_alan_koru` (alan düzeyi) | `yetki_var_mi`, `yonetici_mi` | SQL olarak yok; **anlam olarak B3a'yı ister** (aşağıda) |
| **İstemci 1.744.43** | — | **B4 kurulu olmalı** (geri alma iletisi sunucunun B4 sonucuna dayanır) | B3a-2 olmadan da çalışır: yalnız fiyat kutuları kapanır |

- **B3a-2, B3a'sız eksik kalır:** B3a-2 yalnız üç tabloda ve yalnız belirli alanlarda kural koyar. Listede olmayan ya da salt okur
  hesabın diğer tablolara ve ürünün fiyat dışı alanlarına yazmasını B3a keser.
- **B3a, B3a-2'siz eksik kalır:** tablo düzeyi koruma, yazma yetkisi olan bir hesabın cari unvanını, renkleri ya da fiyatları
  değiştirmesini ayırt edemez (B3a'nın kalan üç açığı).
- İki tetikleyici aynı satırda birlikte çalışır; adları farklıdır, birbirini çağırmaz. PostgreSQL ada göre sıralar (`b3a2_alan_koru`
  önce). Hangisi reddederse işlem geri alınır.

## Kurulum sırası (onaydan sonra; şimdi DEĞİL)

1. `27-b4-onkosul-salt-okur.sql` (yalnız okur) — canlı gövdeler beklenen hâlde mi.
2. `27-b4-uygula.sql` → son satır `GENEL | KURULU`.
3. `28-b3a-uygula.sql` → `GENEL | KURULU`.
4. `29-b3a2-uygula.sql` → `GENEL | KURULU`.
5. İstemci 1.744.43 yayını.

2–4 arasındaki sıra teknik olarak serbesttir: iki uç sırayla (B4 → B3a → B3a-2 ve B3a-2 → B3a → B4) kurulan veritabanlarının şema
dökümü **birebir aynı** çıktı. Önerilen sıra önceliği yansıtır: önce para ve stok doğruluğu (B4), sonra yetki.
İstemci en sona kalır: 1.744.37 istemcisi B4 ile sınandı; 1.744.43 ise B4'süz sunucuda sınanmadı.

**Geri alma** ters sırayla ya da tek tek: `29-b3a2-geri-al.sql`, `28-b3a-geri-al.sql`, `27-b4-geri-al.sql`. Hiçbiri veriye dokunmaz.
B4 geri alınacaksa önce istemci 1.744.37'ye döndürülmelidir.

## Bu bileşimle sınama (yerel PostgreSQL 16, canlıya hizalı G-25'siz taban, üç paket kurulu, istemci 1.744.43)

Sonuç dosyaları: `test/inceleme/sonuc-birlesik/`.

| Sınama | Sonuç |
|---|---|
| Kurulum sırası: B4 → B3a → B3a-2 ile B3a-2 → B3a → B4 | şema dökümü birebir aynı (fark 0 satır) |
| `b3a2-matris.js` — 64 durum × 7 hesap (22'si olumsuz istisna testi) | kurulumdan önce 229 uyumlu · 219 AÇIK; üç paketle **448 uyumlu · 0 AÇIK · 0 fazla kısıt** |
| `b3a-sina.sh` — B4 + B3a-2 kurulu tabana B3a kur / geri al | 11/11; B3a matrisi 83 uyumlu · 4 AÇIK → **89 uyumlu · 0 AÇIK** (B3a'nın tek başına bıraktığı 3 açık B3a-2 ile kapanıyor). 1 satır "yanlış gerekçe": ret doğru, kod farklı (KR006, eski kural) |
| `b4-sunucu-sina.js` — B3a + B3a-2 eklenmiş B4 tabanı | 40/40 |
| `ekran-uretim-b4.js` (iki cihaz teslim, kısmi, tamir, bayat Geri Al, yanıt kaybı) | 34/34 |
| `ekran-uretim-b4-ver.js` (iki cihaz İşi Ver, atamasız ara proses) | 11/11 |
| `ekran-geri-al-ileti.js` (1.744.41 düzeltmeleri) | 20/20 |
| `ekran-stok.js`, `ekran-kasa.js`, `ekran-cari-virman.js` (Yönetici) | 24/24 · 29/29 · 29/29 |
| `ekran-b3a2-personel.js` (yalnız stok yetkili hesap + Yönetici) | 10/10 |
| `ekran-personel-akis.js` (stok, sipariş, muhasebe, üretim hesapları) | 51 geçti · **5 kaldı** — beşi de tek nedenden: fiş iptali `silme` yetkisi ister (aşağıda) |
| `./test/kosu.sh` (1.744.43) | 275/275 AYNI |

### Personel akışları (ekrandan; `test/inceleme/ekran-personel-akis.js`, sonuç `sonuc-ekran-personel-akis.txt`)

Hesaplar: Ayşe = yalnız stok, Selin = yalnız sipariş, Murat = yalnız muhasebe, Umut = yalnız üretim (hepsi görüntüleme + düzenleme +
kaydetme; **silme yok**). Umut eklendi çünkü iş verme ve teslim Üretim menüsünde; diğer üç hesap o menüyü görmüyor.

| Hesap | Ekrandan tamamlanan | Sunucunun reddettiği yetkisiz deneme (kendi jetonuyla) |
|---|---|---|
| Ayşe | stok giriş fişi · ürün adını kaydetme (fiyat kutuları kapalı) · ürün kartından hızlı tedarikçi ekleme (yalnız unvan + tip) | satış fiyatı · cari unvanı · renk silme |
| Selin | yeni satış siparişi (mevcut müşteri, 1 kalem) · satış kutusu açık, alış kapalı · satış fiyatı yazma geçti | alış fiyatı · cari unvanı · müşterinin fiyat grubu |
| Murat | tahsilat fişi · alış kutusu açık, satış kapalı · alış fiyatı yazma geçti | satış fiyatı · renk adını değiştirme |
| Umut | İşi Ver · teslim (mamul +10, usta −350) | satış fiyatı · alış fiyatı · cari unvanı |

Yetkisiz yazmanın geçtiği durum YOK. Ayşe ve Selin'de sunucunun reddettiği beklenmeyen yazma 0.

**Kalan 5 kontrol — BULGU P1 (üç paketten gelmiyor; mevcut kural):** Murat tahsilat fişini iptal edemedi, Umut teslimi "Geri Al"
yapamadı (dolayısıyla yeniden teslim de yapılamadı). `fis_iptal` ve `fis_iptal_toplu` altı modülden birinde **silme** yetkisi ister;
bu kural paketsiz, canlıya hizalı tabanda da aynen var. Sunucu doğru reddetti ve hiçbir kayıt değişmedi; ekran "iptal edilemedi /
geri alınamadı — hiçbir değişiklik yapılmadı" dedi. Silme yetkisi eklenmiş iki ek hesapla (Mert, Ufuk) aynı ekran yolundan iptal,
Geri Al ve yeniden teslim tamamlandı; bakiyeler başa döndü.
- Karar gerektirir: "Geri Al / iptal = silme yetkisi" bilinçli tasarım mı, yoksa üretim ve muhasebe personeline iptal verilecek mi.
- Yan gözlemler: Sil / Geri Al düğmesi silme yetkisi olmayan hesaba da görünüyor; ret iletisi hangi modülde olursa olsun
  "stok: silme" diyor (`stk_yetki` içindeki sabit metin).

Sınamanın sınırları: son hâl bir kez baştan sona koştu (oynaklık ölçülmedi); yetkisiz denemelerin gövdesi yalnız değişen alan + sürüm;
köprü gerçek PostgREST değil; üretim fikstürü tek adımlı ve reçetesiz (kısmi teslim, tamir ve hammadde bu sınamada değil, Yönetici ile
koşan `ekran-uretim-b4.js`'de); dört hesap da Stok / Sipariş menülerini görüyor — okuma yetkisi bu işin kapsamında değil (B3b).

### Otomatik yazma istisnaları gerçek değişikliği gizleyebiliyor mu — HAYIR (22 olumsuz durum, hepsi beklenen sonucu verdi)

- **Boş değer:** boş telefonu doldurma, dolu telefonu boşaltma, `pasif` false → true, para birimini TRY dışı doldurma,
  mevcut satış fiyatını sıfırlama, alış fiyatını null yapma, fiyat kurallarını boşaltma, fiyat doluyken para birimini değiştirme,
  ad değişikliğinin yanında fiyat değişikliği → yetkisiz hesapta 42501.
- **Oluşturma damgası:** damganın yanında başka `ek` anahtarı, fiyat grubu ya da unvan değişikliği; mevcut fiyat grubunu silme → 42501.
- **Varsayılan firma bilgisi:** iskeletin içinde dolu unvan, iç içe dolu değer (e-posta sunucusu), KDV anahtarını açma, dönem kapanış
  tarihi; firma bilgisi varken yalnız logoyu değiştirme ya da boş iskeletle ezme; boş iskeletin yanında dolu ara proses listesi ya da
  bilinmeyen anahtarı true yapma → 42501.

Bilinen ve kabul edilen tek gevşeklik: firma bilgisi **hiç yokken** yazma yetkisi olan herhangi bir hesap ilk logoyu yazabilir
(başka hiçbir alanı değil). Canlıda firma bilgisi dolu olduğundan bu yol orada kapalıdır.

## Gerçek Supabase — YAPILMADI

Yeni yalıtılmış projede kurulum ve aynı adayla temel akışların tekrarı bu oturumda **yapılamadı**: bu ortamdan hiçbir Supabase
projesine erişim yok ve proje henüz kurulmadı. Kurulum adımları, yapı dosyası ve karşılaştırma araçları hazır
(`27-b4-deneme/PAKET-B4-YALITILMIS-DENEME.md`). Proje kurulup salt okur çıktılar geldiğinde yapılacaklar:

1. Yapı farkı: 25 sorgusunun CSV çıktısı `yapi-karsilastir.py` ile kaynak dökümle karşılaştırılır.
2. Hesap yetkileri: `deneme-hesaplar-salt-okur.sql` çıktısı.
3. Aynı aday (1.744.43, yukarıdaki özet) ile temel akışlar; önce 1.744.37 + B4.

Mevcut G-25 deneme projesi (`drtmnovafswzcmpacubl`) ve ana proje bu işte kullanılmaz; `korumali-sunucu.js` ikisinin adresini reddeder.
