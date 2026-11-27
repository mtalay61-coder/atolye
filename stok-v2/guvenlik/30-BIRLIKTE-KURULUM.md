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
| B3a-2 kurulum | `29-b3a2-uygula.sql` | `ec3df68d922ba5d49e1f5b95bd795c4ff1982bd89472681a8c75df816a12986f` |
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
  ad değişikliğinin yanında fiyat değişikliği → yetkisiz hesapta ret (KR040).
- **Oluşturma damgası:** damganın yanında başka `ek` anahtarı, fiyat grubu ya da unvan değişikliği; mevcut fiyat grubunu silme → ret (KR040).
- **Varsayılan firma bilgisi:** iskeletin içinde dolu unvan, iç içe dolu değer (e-posta sunucusu), KDV anahtarını açma, dönem kapanış
  tarihi; firma bilgisi varken yalnız logoyu değiştirme ya da boş iskeletle ezme; boş iskeletin yanında dolu ara proses listesi ya da
  bilinmeyen anahtarı true yapma → ret (KR040).

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

---

# 2. TUR (27 Kasım, sonradan) — SABİTLENEN SON HÂL: istemci 1.744.44, dört SQL paketi

Bu bölüm yukarıdakinin yerine geçer: aday artık **1.744.44**, B3a-2'nin ret kodu **KR040**, ret iletisi paketi (**31**) eklendi.
Canlıya, main'e, yayına ve G-25'e UYGULANMADI. Gerçek Supabase'de denenmedi (adımlar: `32-GERCEK-SUPABASE-ADIMLAR.md`).

## Sabit paket (dal `claude/aday-birlesik`)

| Parça | Kurulum | Geri alma |
|---|---|---|
| B4/B5 (öncelikli) | `27-b4-uygula.sql` `f49078f2361e8546d59e6a0b9c5d52e0ace6474c47663ef2615478e2b327645d` | `27-b4-geri-al.sql` `940c40262bf141d35093d999c30195e098ac730d21b2f9483636c0bb8c1036af` |
| B3a | `28-b3a-uygula.sql` `15f1051d5c9f652ac99d091fb329aea67ef35ef10adb82fee1cbe31ba3d38250` | `28-b3a-geri-al.sql` `c015689afb9f2c3436878c9a15e697f2800b4f72f90ab43bcf478c9b3a40ef3f` |
| B3a-2 | `29-b3a2-uygula.sql` `ec3df68d922ba5d49e1f5b95bd795c4ff1982bd89472681a8c75df816a12986f` | `29-b3a2-geri-al.sql` `8d471fcf8c5847ecca808f148c1dfb4a95becfc8faa95bc0aa89ec862be1d9c5` |
| Ret iletisi | `31-yetki-ileti-uygula.sql` `b3a48e5ab1461d9c6b18aec8f925e38769b1e57684bfdf48facbb40c1724acaf` | `31-yetki-ileti-geri-al.sql` `661d831a03be7bace5e525e004a6e9b57f9135c2c76ed9aae9b9124586952ec0` |
| İstemci | `atolye-erp-v1.744.44.html` `b87afc137406202b5e6180c3b97f31139581d3e79238eda51b0cb4252418a7e8` | yayındaki 1.744.37 |

B4 ve B3a dosyaları değişmedi. B3a-2'nin kurulum dosyası DEĞİŞTİ (yalnız ret kodu); `claude/b3a2-alan-yetki` dalındaki eski özet
(`e67eef17…`) artık geçersizdir. Kurulum sırası: B4 → B3a → B3a-2 → 31 → istemci. 31 hiçbir pakete bağımlı değildir.

## Bu turda değişenler ve nedenleri

1. **İptal / "Geri Al" silme yetkisi ister (karar: korunur).** Kaydetme yetkisi genişletilmedi. İstemci 1.744.44 düğmeleri silme
   yetkisi olmayan kullanıcıya çizmez (sunucunun kuralının aynısı: stok, fişler, sipariş, üretim, cari, muhasebe modüllerinden birinde
   silme). Kapsanan düğmeler: bildirimdeki "Geri al", cari kartı › Hareketler › Sil, ürün kartı hareketleri, Fişler sağ tık menüsü,
   üretim kartındaki üç "Geri Al", çeklerde "Son işlemi geri al". Sunucu denetimi aynen sürüyor.
   - Dokunulmayanlar: kasa / banka ve gelir-gider hareketi Sil (zaten yalnız muhasebe silmeye bakıp gizleniyor — sunucudan sıkı),
     "Çeki sil" (karışık yol; işleyici reddediyor, düğme görünür), üretim silme (`uretim_sil` — kuralı ölçülmedi).
2. **Ret iletisi (paket 31).** `stk_yetki` her işlemde "(stok: …)" diyordu. Artık çağıran işlemi ve gereken modülleri söyler:
   "Bu işlem için yetkiniz yok: fiş iptali (Geri Al) (gereken: stok, fişler, sipariş, üretim, cari, muhasebe modüllerinden birinde
   silme)". Kural, modül listeleri ve hata kodu (42501) aynı; geri alma canlıdaki gövdeye satır sonlarıyla birlikte bayt bayt döner.
3. **B3a-2 ret kodu 42501 → KR040.** Geçiş sınamasında görüldü (aşağıda). Kural değişmedi.

## Bu bileşimle sınama (dört paket kurulu, istemci 1.744.44; sonuçlar `test/inceleme/sonuc-son/`)

| Sınama | Sonuç |
|---|---|
| `ekran-personel-akis.js` — 6 hesap, iki tam koşu | **118/118** ve **118/118**; bulgu yok |
| `ekran-uretim-b4.js` · `-ver.js` · `ekran-geri-al-ileti.js` (Yönetici) | 34/34 · 11/11 · 20/20 |
| `ekran-stok.js` · `ekran-kasa.js` · `ekran-cari-virman.js` · `ekran-b3a2-personel.js` | 24/24 · 29/29 · 29/29 · 10/10 |
| `b4-sunucu-sina.js` | 40/40 |
| `b3a2-matris.js` | 448 uyumlu · 0 AÇIK · 0 fazla kısıt |
| `b3a-sina.sh` | 11/11; matris 0 AÇIK. 4 satır "yanlış gerekçe": ret doğru, kod 42501 yerine KR040 / KR006 |
| `./test/kosu.sh` (1.744.44) | 275/275 AYNI; `birim-fis-iptal-yetki.js` 24/24 |
| Paket 31: kur → yeniden kur → geri al → kur | geri almadan sonra tanım ve yetkiler kurulum öncesiyle aynı |

### Personel akışları — iptal yetkisi OLAN ve OLMAYAN hesaplar ayrı

| Hesap | Silme | Ekrandan tamamlanan | İptal / Geri Al |
|---|---|---|---|
| Ayşe (stok) | yok | stok giriş fişi · ürün kaydı · hızlı tedarikçi | — |
| Selin (sipariş) | yok | satış siparişi | — |
| Murat (muhasebe) | **yok** | tahsilat fişi | düğme YOK (bildirimde ve cari kartında); doğrudan istek → 403, ileti "fiş iptali … silme" |
| Mert (muhasebe) | **var** | tahsilat fişi ×2 | bildirimden ve cari kartından iptal; kasa ve cari başa döndü |
| Umut (üretim) | **yok** | tam · **kısmi (6 + 4)** · **tamir (8 + 2, tamirci teslimi)** · **hammaddeli (Kesim −10 hammadde → Saya)** teslim | düğme YOK; doğrudan istek → 403; hiçbir kayıt değişmedi |
| Ufuk (üretim) | **var** | aynı dört teslim akışı | Geri Al → stok, hammadde ve işçilik başa döndü → yeniden teslim; kısmi teslimde iki parça ayrı ayrı geri alındı |

Kısmi teslimde toplam 10'u aşan stok ya da işçilik oluşmadı; tamirde mamul 8 + 2, tamirciye 2 × 5 ₺. Yetkisiz yazma ya da iptal
geçmedi; yetkili akışlarda sunucunun reddettiği yazma 0.

### Geçiş uyumluluğu — paketler kurulunca açık kalmış 1.744.37 sekmeleri (`ekran-gecis-1744-37.js`, yayın paketiyle; 61 geçti · 9 kaldı)

| Soru | Sonuç |
|---|---|
| Meşru kayıtlar reddediliyor mu? | **Hayır.** Açılış (yalnız stok yetkili hesap ve Yönetici): reddedilen yazma 0. Paketler sekme AÇIKKEN kuruldu, yenilemeden ürün adı kaydedildi. Fiyat dışı alan kaydı (eski istemci satırın tamamını, fiyatlarla yollar), Yönetici'nin fiyat değişikliği, fiyatsız yeni ürün, stok giriş fişi geçti. |
| Eski istemci korumayı aşabiliyor mu? | **Hayır.** 1.744.37'de fiyat kutuları herkese açık; yalnız stok yetkili hesap satış / alış fiyatını değiştirince sunucu reddetti, sunucudaki fiyat ve ad değişmedi. Satış fiyatlı yeni ürün de reddedildi. |
| Kullanıcı reddi nasıl görüyor? | İlk ölçümde KÖTÜ, KR040'tan sonra kabul edilebilir — aşağıda. |

**İlk ölçüm (ret kodu 42501):** eski istemci reddi "Bulut oturumunuz kapandı" şeridiyle gösterdi, ayrıntıda "giriş yapılmamış /
rls-kimlik.sql" dedi, kaydı bekleyene alıp dakikada bir ve her açılışta yeniden gönderdi (17 kontrol kaldı).

**KR040 ile (istemcinin 1.744.0'dan beri bildiği kalıcı ret):** yeniden gönderim yok (95 sn içinde 1 istek; yenilemede 0); şerit
"Stok kartları — inceleme gerekiyor (kendiliğinden denenmez)", ayrıntısında sunucunun iletisi aynen okunuyor. Kullanıcı fiyatı eski
hâline getirip kaydedince kayıt geçiyor ve şerit kalkıyor.

**Eski sekmede KALAN davranış (9 kontrol; istemcinin kalıcı ret tasarımı, bu pakette değiştirilmedi):**
- kayıt anında "Ürün güncellendi" bildirimi çıkıyor (istemci bildirimi sunucu yanıtından önce gösteriyor);
- reddedilen değer o cihazda görünmeye devam ediyor, yenilemeden sonra da (yerel kayıt kullanıcı bırakmadan silinmez — 1.744.0 kararı);
- ret nedeni bildirimde değil, şeridin ayrıntısında; ayrıntı metni "yetki ya da bağlantı sorunu değil" diye başlıyor, altında
  sunucunun "yetkiniz yok … gereken: …" iletisi var (çelişkili okunabilir).

Yeni istemcide (1.744.44) fiyat kutuları kapalı ve süzgeç yetkisiz fiyatı göndermediği için bu duruma düşülmüyor. Bugün canlıdaki
üç hesabın üçü de Yönetici olduğundan geçiş anında bu ret kimseye çıkmaz; personel hesabı açılmadan önce istemcinin yeni sürüme
geçmiş olması yeterli.

## B3b — KAPSAM DÜZELTMESİ (önceki özet yanlıştı)

B3b **okuma / menü görünürlüğü değil, RPC ile YAZMA genişliğidir.** Bu belgenin ilk hâlinde ve rapor §15'te yanlışlıkla "okuma yetkisi"
diye geçti. Yeniden ölçüldü (`test/inceleme/b3b-olc.js`, sonuç `sonuc-b3b-olc.txt`; fonksiyon gövdeleri canlı dökümle birebir):

| Yalnız STOK yetkili hesap | Paketsiz | Dört paketle |
|---|---|---|
| `alt_yaz` ile sipariş kalemi miktarını 999 yapma | YAZDI | **YAZDI** |
| `car_yaz` ile müşteriye 1.000 ₺ cari hareketi | YAZDI | **YAZDI** |
| `fis_kes` ile cari virmanı fişi (uygulamanın gerçek isteği; `ekran-cari-virman.js` 7d) | KESTİ | **KESTİ** (2 cari satırı) |

Listede olmayan hesap üçünde de reddediliyor. **B3b AÇIKTIR; bu paketlerin hiçbiri kapatmaz.** Neden: `stk_yetki` listelenen
modüllerden herhangi birinde kaydetmeyi yeterli sayıyor. Kapatmak tür bazlı yetki kararı ister (G-25 sınıfı iş).
Ayrıca gözlem (ayrı konu): yalnız stok / sipariş / muhasebe / üretim hesaplarının dördü de Stok ve Sipariş menülerini görüyor.

## Açık duranlar

- **B3b** (yukarıda) · **B6** (maaş, mesai ayarı, proses ücretleri kuralsız; G-25) · **Y1** · B3a'nın açıkları paketler canlıya kurulana kadar.
- Eski sekmede kalıcı ret gösterimi (yukarıdaki üç madde) — istemci tasarımı; ayrı iş.
- Sınanmayan: gerçek Supabase; 1.744.44'ün B4'süz sunucuda davranışı; `uretim_sil` yetki kuralı; "Çeki sil"; salt okur kullanıcının
  kişisel tercihi; beden adı değişikliği, diğer tek satırlık tablolar, site portalı, depolama kovaları. Yeni düğme gizlemeleri
  ekrandan yalnız üretim, tahsilat bildirimi ve cari kartı yollarında doğrulandı; Fişler menüsü, ürün kartı hareketleri ve çekler
  yalnız birim testi ve kod incelemesiyle.
