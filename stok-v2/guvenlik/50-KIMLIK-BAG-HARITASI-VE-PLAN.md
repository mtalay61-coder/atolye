# Kayıtlar arası bağlar: harita ve risk sıralı dönüşüm planı (28 Kasım)

**Hedef:** bağlar değişmez kimlik (ID) üzerinden kurulsun; kullanıcının değiştirebildiği ad, unvan, kod ya da etiket bağ anahtarı olmasın.
**Durum:** yalnız inceleme. Kod, şema ve veri DEĞİŞMEDİ. Canlıya yazma, veri dönüşümü, birleştirme ve yayın ayrı açık onaya bağlı.

**Kaynaklar ve güven düzeyi**
- Veritabanı: canlıya hizalı yerel kopya (tablolar, sütunlar, yabancı anahtarlar, tekillikler, tetikleyiciler, fonksiyon gövdeleri). Canlıdaki
  VERİ görülmedi: kaç kaydın adla bağlı olduğu, kaçının tek / çok eşleştiği bilinmiyor (Paket 0 bunu ölçer).
- İstemci: `src/*.jsx` iki ayrı taramayla okundu (dosya:satır kanıtlı). Ben yalnız birkaç kritik iddiayı elle doğruladım (aşağıda ✔).
  Taramaların bakamadığı yerler 6. bölümde.

## 1. Bugünkü durumun özeti

| Varlık | Kimliği var mı | Bağlar bugün neyle kurulu |
|---|---|---|
| Cari | var (`cariler.id`) | Hareket, sipariş, çek, kasa, atama: **ID**. Unvan yalnız gösterim kopyası. |
| Ürün | var (`urunler.id`) | Sipariş kalemi, üretim, reçete hammaddesi: ID. **Cari hareketinde yalnız `urun_ad`**; bazı ekranlar ürünü adla arıyor. |
| Renk | var (`stk_renk.id`, Tanımlar'da `id`) | Stok varyantı ID. **Sipariş kalemi, üretim, rezervasyon, koli, reçete, renk resmi, barkod, fiyat kuralı: AD.** |
| Model rengi | var (kombinasyon `id`) | Her yerde **etiket metni** ("1054 - A/B"; içinde renk adları). |
| Beden / ölçü | sunucuda var (`stk_olcu.id`) | İstemcide ve bütün kayıtlarda **AD**. Ad değişikliği sunucuda tek işlem DEĞİL. |
| Varyant | var (`stk_varyant.id`) | Stok hareketi ID. İstemcide anahtar `ürün | renk adı | beden adı`. |
| Sipariş | var | Kalem, hareket, rezervasyon: ID. **Sipariş ↔ üretim / alış bağı: NUMARA metni.** |
| Üretim | var | Atama, hareket: ID. **Rezervasyon ve planlama: üretim NUMARASI.** |
| Proses | Tanımlar'da var ama kullanılmıyor | Ücret, bölüm üyeliği, gider kartı, usta yetkisi, kapasite, reçete, atama: **AD.** |
| Bölüm, gider kartı, fiyat grubu | var | ID (yanında "ID yoksa ada düş" yedekleri var). |
| Cari tipi | **yok** | AD; kodda `"Fasoncu"` sabiti ✔ (`src/015:2144`). |
| Hesap (kasa / banka) | var | ID; eski kayıtlarda açıklama metninden eşleme yedeği. |
| Kullanıcı | var | Görev / mesaj: ID. **Kayıt damgaları (olusturan, kullanici): AD.** |
| Depo | ayrı varlık bulunamadı | — |

## 2. Bağlantı haritası (kopma riski olanlar; ID ile sağlam kurulu olanlar 5. bölümde)

Sütunlar: bağ · anahtar · okuma / yazma · veritabanı koruması · ad değişince / silinince.

### 2.1 Renk, model rengi, beden, varyant
| Bağ | Anahtar | Okuma / yazma | Koruma | Kopma |
|---|---|---|---|---|
| `siparis_kalemleri.renk`, `.beden` → varyant | ad metni (birebir) | istemci fark yazması + `alt_yaz` | yabancı anahtar YOK; B1 tetikleyicisi yalnız RENK eski adını çevirir | beden adı değişince bağ kopar; renk için B1 korur |
| `uretim.renk`, `uretim.beden_miktarlari[].beden`, atama `sonuc.saglam{beden}` | ad metni / JSON anahtarı | aynı | YOK (renk: B1) | aynı |
| `stok_rezervasyonlari.renk`, `.beden`, `.urun_ad` | ad metni | aynı | YOK (renk: B1) | aynı |
| Koli kalemi `{urunId, renk, beden}` → sipariş kalemi | ürün ID + ad metni; `kalemId` yok | `lst_kayit` JSON | YOK | eşleşmezse koli "siparişte yok" sayılır |
| Reçete `mamulRenk`, `mamulBeden`, `renk`, `beden` | ad metni, birebir (`===`) | `urunler.recete` JSON | YOK; `mamulRenkId` / `renkId` damgalanıyor ama okuyan yok | tek harf farkında MRP, hammadde düşümü, maliyet sessizce boş |
| Renk resmi `renk_resimleri{ad: resim}` | JSON anahtarı = ad | `urunler` JSON | YOK | resim kaybolur (kapak resmi görünür) |
| Harici barkod `{kod, renk, beden}` | ad, harf duyarsız | `urunler` JSON | YOK | ad değişince taşınmazsa barkod varyantı bulamaz |
| Cariye özel fiyat kuralı `{renk, beden}` | ad, birebir | `urunler.fiyat_kurallari` | YOK | **hiçbir ad değişikliği taşımıyor** → sessizce genel fiyata düşer |
| İstemci varyant anahtarı, stok toplamı | `ürün | renk | beden` metni | bellek + bekleyen kayıt defteri | sunucu `stk_varyant_bul` adı kimliğe çevirir; bulamazsa "serbest" renk / ölçü AÇAR | yarım ad değişikliğinde stok ikiye bölünür |
| Model rengi etiketi | kod + renk adlarından hesaplanan metin | her kayıtta kopya | YOK | bir rengin adı değişince onu içeren bütün etiketler her kayıtta değişmeli |
| Beden adı değiştirme (082 `olcuAdDegistir`) | bellekteki listelerden 5–6 ayrı yazma | istemci | YOK | **B1 öncesi renk sorununun aynısı beden için AÇIK** |
| Renk silme denetimi | yalnız ürün varyantlarında birebir ad | istemci | `stk_varyant.renk_id` engeller | siparişte / üretimde / reçetede kullanılan renk silinebilir |

### 2.2 Sipariş ↔ üretim ↔ rezervasyon
| Bağ | Anahtar | Koruma | Kopma |
|---|---|---|---|
| Satış kalemi `planlama.referansNo` → üretim / alış siparişi | **numara metni** | `uretim.siparis_no` tekil ✔, `siparisler(tip, siparis_no)` tekil ✔ | iptalde numara yeniden yazılıyor; numarayla bakan yer bulamaz |
| Rezervasyon `uretim_no` → üretim | numara metni | YOK | aynı |
| Fiş / hareket `siparis_no` (eski kayıt yedeği) | numara metni; yeni kayıtlarda `siparis_id` var | `stk_hareket.kalem_id` yabancı anahtar ✔ | yalnız eski kayıtlar |
| Üretim numarası üretimi | istemcide "en büyük + 1" | tekillik çakışmayı reddeder | iki cihaz aynı numarayı üretirse biri ret alır (veri kaybı değil, kullanıcı hatası görünür) |

### 2.3 Proses, bölüm, personel (para etkili)
| Bağ | Anahtar | Kopma |
|---|---|---|
| `urunler.proses_ucretleri{procesAdı: ücret}` | JSON anahtarı = proses adı | ad değişirse ücret kaybolur |
| `bolum.prosesler[]`, `cari.bagli_prosesler[]`, kapasite `prosesler[]` | proses adı | bölüm tahakkuku / usta iş listesi kopar |
| `uretim_atamalari.proses`, `proses_ilerleme[].proses`, reçete `proses` | proses adı | aynı adlı iki adımda atama iki kez görünür |
| `tanimlar.prosesGiderKartlari{procesAdı: kartId}` | proses adı | işçilik fişi "karşılıksız" görünür |
| İşçilik fişi → proses | **fiş numarası metninden ayrıştırma** (`<no>-<Proses>-İşçilik`) | tire içeren ad / numara yanlış karta bağlar |
| `iscilikBolumu`: `altTip === "Fasoncu"` ✔ | sabit metin; cari tipinin adı ekrandan değişebiliyor | fasoncunun işçiliği cariye değil bölüme yazılır (**para hatası**) |
| Bölüm → gider kartı | `bolumId`, yoksa kart ADI | aynı adlı başka kart bağlanır |
| Maaş / mesai tekrar anahtarı | `MAAS-ay-<cari kodu>`, kod yoksa ID | kod sonradan gelirse aynı ay ikinci tahakkuk |
| Bölüm silme | denetim yok | tahakkuk ve maaş hareketleri sahipsiz kalır |

Proses adını değiştiren işlev bulunamadı; tutarlılık bugün "ad değişmiyor" varsayımına dayanıyor.

### 2.4 Cari, fiş, kasa
| Bağ | Anahtar | Kopma |
|---|---|---|
| `car_hareket.urun_ad`, `.renk` → ürün / varyant | **yalnız ad; `urun_id` yok** | son alış fiyatı ve alış maliyeti ürün ADIYLA aranıyor; ürün adı değişince maliyet geçmişi kopar |
| `car_hareket.cari_id`, `stk_fis.cari_id / siparis_id / uretim_id`, `stk_hareket.urun_id / siparis_id / cari_id / uretim_id`, `kas_hareket.hesap_id` | ID | **yabancı anahtar YOK** (yetim kayıt mümkün) |
| Eski fiş ailesi | `siparisNo-proses` metni (yalnız `uretimId` taşımayan eski kayıtta) | başka üretimin fişine dokunabilir |
| Cari ↔ kasa hareketi (eski kayıt) | açıklama + tutar + tarih | hesap adı değişince karşılık bulunamaz |
| Kayıt damgası `olusturan`, `kullanici` | kullanıcı ADI | ad değişince aynı kişi iki kişi görünür |

### 2.5 Silme davranışları (veritabanı)
| İlişki | Bugün | Sorun |
|---|---|---|
| `siparis_kalemleri → siparisler`, `stok_rezervasyonlari → siparisler / urunler`, `uretim_atamalari → uretim`, `hesap_hareketleri → hesaplar` | **CASCADE** | üst kayıt silinince geçmiş topluca silinir |
| `siparisler.cari_id`, `uretim.urun_id`, `siparis_kalemleri.urun_id`, `uretim_atamalari.personel_id`, `cekler.cari_id`, `urunler.tedarikci_id` | SET NULL | bağ sessizce boşalır |
| `stk_hareket → stk_fis / stk_varyant / siparis_kalemleri`, `stk_varyant → stk_renk / stk_olcu` | engel ✔ | sağlam |
| `cariler`, `siparisler` | `silme_koruma` tetikleyicisi (yetki) + arşiv | bağlı kayıt denetimi istemcide |

### 2.6 Tanımlar (tek satır JSON), cihaz önbelleği, bekleyen yazmalar
- Kimlikli listeler (renkler, bedenler, kombinasyonlar, kullanıcılar, gider kartları, fiyat grupları, bölümler) öğe öğe birleşir.
- **Kimliksiz listeler** (`cariTipleri`, `bolum.prosesler`, `fireSebepleri` metin olabilir): iki cihaz aynı anda değiştirirse yerel dizi
  bütünüyle kazanır — biri sessizce ezilir.
- Bekleyen kayıt defteri alt kayıtları `id` ile tutar; **istisna varyant: anahtar `urun_id|renk|beden`** (renk adı anahtarın içinde).
- Sunucu, eksik kimlikte ada düşer ve bulamazsa yeni "serbest" renk / ölçü AÇAR (`stk_renk_coz`, `stk_olcu_coz`) — geçersiz ad sessizce
  kabul edilmiş olur.

### 2.7 Müşteri portalı
- Site talebi kalemleri: `urunId` ID, **renk / beden metin**; renk adı değiştiyse satır atlanıp uyarı veriliyor.
- Site kaydı → cari eşleme önerisi unvan / vergi no ile; bağ kullanıcı onayıyla ID üzerinden kuruluyor (sağlam).
- `site_talepleri.cari_unvan` gösterim kopyası; bağ `cari_id`.

## 3. Kimlikle kurulu bağların denetimi (cari, fiş, stok, kasa)

"Kimlik var" tek başına sağlam demek değildir. Her bağ dört açıdan denetlendi: yabancı anahtar · var olmayan üst kayda bağlanma (yetim) ·
yanlış üst kayda bağlanma · üst kayıt silinince ne olduğu. Ölçüm: `test/inceleme/bag-risk.js` (yerel, beş paket kurulu; Yönetici
hesabıyla, istemcinin yolundan). Canlıdaki mevcut yetim / tutarsız kayıt sayısı Paket 0 sorgusuyla ölçülecek.

| Bağ | Yabancı anahtar | Yetim yazma | Yanlış üst kayıt | Üst kayıt silinince | Karar |
|---|---|---|---|---|---|
| sipariş kalemi → sipariş | var (CASCADE) | reddedilir ✔ (Y5) | hareketi olan kalem taşınamaz ✔ (B1, KR003) | hareketsiz sipariş: kalemler silinir AMA arşive alınır ✔ (S1); hareketli: silinemez ✔ (S2, KR002) | **kapsam dışı** — CASCADE burada korumalı çalışıyor; değiştirilmeyecek |
| sipariş kalemi → ürün | var (SET NULL) | reddedilir ✔ (Y6) | — | kullanılan ürün silinemez ✔ (S4, KR003) | kapsam dışı; SET NULL fiilen devreye girmiyor (Paket 0 "ürünü boş kalem" sayısı doğrular) |
| rezervasyon → sipariş / ürün | var (CASCADE) | reddedilir ✔ (Y3, KR006) | — | sipariş silinince arşive alınıp silinir ✔ (S1) | kapsam dışı (rezervasyon geçici kayıt; arşivleniyor) |
| üretim ataması → üretim | var (CASCADE) | — | — | hareketi olan üretim silinemez ✔ (S3, KR010) | kapsam dışı; hareketsiz üretimde atama silinmesi Paket K'da arşiv kontrolüyle doğrulanacak |
| üretim → ürün | var (SET NULL) | — | **ürün değiştirilebiliyor ✗ (B2)** — ataması ve işçilik hareketi varken | kullanılan ürün silinemez ✔ | **Paket K** |
| üretim → rezervasyon siparişi | YOK | reddedilir ✔ (Y1, KR006) | — | — | kapsam dışı (tetikleyici koruyor); Paket 0 mevcut yetimi ölçer |
| stok hareketi → fiş / varyant / kalem | var (engel) | doğrudan yazılamaz (yalnız sunucu işlemi) | — | engel ✔ | **kapsam dışı — sağlam** |
| stok hareketi → ürün / sipariş / cari / üretim | YOK | doğrudan yazılamaz | Paket 0 C bölümü ölçer | **cari silinebiliyor ✗ (S5)** | **Paket K** (yabancı anahtar + cari silme) |
| cari hareketi → cari | **YOK** | doğrudan yazılamaz (`car_yaz`) | Paket 0 C | **hareketi olan cari silinebiliyor; hareket carisiz kalıyor ✗ (S5, S6)** | **Paket K — öncelikli** |
| fiş → cari / sipariş / üretim / kasa hesabı | **YOK** | doğrudan yazılamaz (`fis_kes`) | **fişi kesilmiş siparişin carisi değiştirilebiliyor ✗ (B3)** | cari silinince fiş carisiz ✗ (S5) | **Paket K** |
| sipariş → cari | var (SET NULL) | — | ✗ (B3) | **cari silinince sipariş carisiz kalıyor ✗ (S5)** | **Paket K** |
| üretim ataması → kişi | var (SET NULL) | — | — | **ataması ve işçilik hareketi olan kişi silinebiliyor ✗ (S6)** | **Paket K** |
| kasa hareketi → kasa hesabı | **YOK** | doğrudan yazılamaz (`kas_yaz`) | Paket 0 C | hesap silme `kas_yaz` içinde (ayrıca sınanacak) | Paket K (yabancı anahtar) |
| eski `hesaplar` → `hesap_hareketleri` | var (**CASCADE**) | — | — | **hesap silinince hareketler iz bırakmadan siliniyor ✗ (S7)** | uygulama bu tabloları kullanmıyor görünüyor; Paket 0 satır sayısına göre: boşsa kapsam dışı, doluysa Paket K |
| site talebi / site hesabı → cari | **YOK** | **olmayan cariye talep yazılabiliyor ✗ (Y2)** | — | cari silinince yetim | Paket K |
| ürün → tedarikçi | var (SET NULL) | reddedilir ✔ (Y4) | — | tedarikçi silinince boşalır | Paket K (cari silme kuralıyla birlikte) |

İstemci hareketi / siparişi olan cariyi silmeyi engelliyor (`src/260:187`, `087:23`), ama bu yalnız o cihazın belleğindeki veriye bakıyor;
sunucuda engel yok. Başka cihazın az önce yazdığı hareket, eski istemci ya da doğrudan API çağrısı bu denetimi aşar.

**Silme kuralları için ilke:** CASCADE topluca değiştirilmeyecek. Yukarıda ✔ olan üç CASCADE (kalem, rezervasyon, atama) bugün üst kayıt
silme korumasıyla birlikte çalışıyor ve silinen satırlar arşive alınıyor; dokunulmayacak. Değişecek olanlar yalnız ölçümle AÇIK çıkanlar:
cari silme (S5, S6), eski hesap tablosu (S7, kullanılıyorsa), üretimin ürünü (B2), fişi olan siparişin carisi (B3), site talebi (Y2).

## 4. Öncelik

| # | Risk | Kanıt | Paket |
|---|---|---|---|
| 1 | **Hareketi / fişi / siparişi olan cari sunucuda silinebiliyor; hareket ve fiş carisiz kalıyor, sipariş ve atama bağı boşalıyor** | bag-risk S5, S6 | K |
| 2 | **Fişi kesilmiş siparişin carisi, hareketi olan üretimin ürünü değiştirilebiliyor** | bag-risk B3, B2 | K |
| 3 | **"Fasoncu" adı ödeme yönünü belirliyor** (ad değişince işçilik cariye değil bölüme yazılır) | bag-risk-fasoncu: 3 açık | F |
| 4 | Eksik yabancı anahtarlar (cari hareketi, fiş, stok hareketi, kasa hareketi, site talebi) | şema dökümü; Y2 | K |
| 5 | Beden adı değişikliği atomik değil | kod; renk için canlıda yaşandı | 1 (geçici koruma) |
| 6 | Reçete eşleşmesi birebir ad | kod | 2 |
| 7 | Kalem / üretim / rezervasyon satırlarında renk–beden metni | kod | 3 |
| 8 | Proses adı (ücret, tahakkuk, işçilik fişi) | kod | 4 |
| 9 | Fiyat kuralı, renk resmi, harici barkod, koli kalemi | kod | 5 |
| 10 | Sipariş ↔ üretim numara bağı | kod | 6 |
| 11 | Cari hareketinde ürün kimliği yok | kod | 8 |
| 12 | Kimliksiz Tanımlar listeleri, kullanıcı damgası, portal kalemleri | kod | 9 |

## 5. Paketler

**Ortak kurallar**
- Var olan kimlikler korunur; yeni kimlik yalnız kimliği hiç olmayan varlığa verilir. Sipariş numarası, barkod kodu, fiş numarası
  insan için kalır.
- Şema değişiklikleri EKLEMELİDİR; ad sütunları "işlem anındaki ad" olarak ve eski istemci için kalır.
- **Eşleme kuralı:** ad tek başına anahtar değildir. Eşleme, gereken kapsamla yapılır: ürün (varyant, reçete, kalem), tür (renk /
  model rengi / serbest; beden / boyut), etkin–pasif durumu, firma (her firma ayrı veritabanı; çapraz eşleme yapılmaz). Aynı kapsamda
  birden çok aday varsa ya da hiç yoksa otomatik bağlanmaz, raporlanır. **Kayıtta kimlik dolu ve ad onunla çelişiyorsa hiçbiri
  sessizce seçilmez: yazma KR koduyla reddedilir, mevcut veri raporlanır.**
- Geçiş adımları: (a) sunucu kimliği ad yanında kabul eder, doldurur, çelişkiyi reddeder → (b) istemci kimlikle yazar ve okur →
  (c) sunucu kimliği zorunlu kılar (`stk_ayar.min_istemci_surum` kapısıyla; bütün cihazlar doğrulandıktan sonra).
- **Geri dönüş kuralı:** geri dönüş, geçişten SONRA oluşan kayıtların kimlik bağlarını kaybettirmez. Bunun için: eklenen sütunlar /
  alanlar geri almada silinmez; (a) adımındaki "sunucu doldurur" tetikleyicileri istemci geri dönse de KALIR (eski kodun adla yazdığı
  kayıt yine kimliklenir); geri dönüş istemcisi kimlik alanlarını bilmese bile onları silmeyen yazma yolu kullanır (satırın tamamını
  yazan yollarda sunucu, gelmeyen kimlik alanını mevcut değerle korur — her paketin sınamasında "geri dönüş istemcisiyle kayıt
  düzenle → kimlik yerinde" kontrolü olur). (c) adımı geri alınabilir tek satır ayardır.
- Her paket: kurulum + geri alma SQL'i (LF / CRLF sınanmış), salt okur önkoşul / doğrulama, önce eski kodda kalan kalıcı sınama,
  yerel Supabase'de ad / kod değişikliği, iki cihaz, bağlantı kesilmesi, tekrar gönderme, iptal, geri alma; miktar, bakiye, stok,
  geçmiş hareket ve barkod karşılaştırması.

| Paket | Kapsam | Veri dönüşümü | Bağımlı olduğu |
|---|---|---|---|
| **0 · Envanter** (salt okur) | `51-canli-bag-envanteri-salt-okur.sql`: yetim, boşalmış bağ, yanlış üst kayıt, eski tablolar, ad bağlarının hacmi, belirsizlik | yok | — |
| **K · Silme ve üst kayıt korumaları** | Cari silme: hareketi / fişi / siparişi / ataması olan cari silinemez (pasife alınır). Fişi olan siparişin carisi, hareketi olan üretimin ürünü değiştirilemez. Eksik yabancı anahtarlar: önce doğrulanmadan eklenir (yeni yazmayı korur), Paket 0 yetim raporu temizse doğrulanır. Site talebinde cari denetimi. Eski hesap tablosu Paket 0 sonucuna göre. | yok (mevcut yetimler raporlanır, onarılmaz) | 0 (yetim sayısı kısıtların nasıl kurulacağını belirler) |
| **F · Fasoncu işareti** | Cari tipine ada bağlı olmayan iş kuralı alanı (`fason: true`) ve tipe kimlik; `iscilikBolumu` ve personel paneli bu alana bakar; ad serbestçe değişir. İstemci + Tanımlar verisi; işçilik sunucuda hesaplanmıyorsa SQL gerekmez. | mevcut "Fasoncu" tipi işaretlenir (tek kayıt); adında "fason" geçen başka tipler RAPORLANIR, otomatik işaretlenmez | 0 (tiplerin dökümü) |
| **1 · Beden adı — GEÇİCİ KORUMA** | Beden adı değişikliği sunucuda tek işlem + eski ad defteri + bayat yazma çevirisi. Hedef değil: asıl hedef Paket 3'te beden bağlarının kimliğe geçmesi. O zamana kadar ad değişikliğinin yarım kalmasını önler; Paket 3'ten sonra gösterim adını değiştiren basit işleme iner. | yok | — |
| **2 · Reçete kimlikle** | Okuyucular `mamulRenkId` / `renkId` (+ ölçü kimlikleri) ile eşler; sunucu reçete yazmasında kimlik–ad çelişkisini reddeder. | var olan damgalar; eksikler ürün kapsamında tek eşleşmede | 0; ölçü kimliği için 3'ün sütun tasarımı |
| **3 · Kalem / üretim / rezervasyon satırlarında kimlik** | `renk_id`, `olcu_id` (uygun yerde `varyant_id`) + yabancı anahtar; bu tablolarda "serbest renk / ölçü aç" yolu kapanır. | ürün + tür + etkinlik kapsamında tek eşleşme | 0, K (yabancı anahtar düzeni), 1 (geçiş süresince ad tutarlılığı) |
| **4 · Proses kimliği** | Ücret, bölüm üyeliği, usta yetkisi, kapasite, atama, gider kartı bağı proses kimliğiyle; işçilik fişinde proses kimliği. | ad → kimlik tek eşleşme | 0, F (aynı işçilik kuralına dokunur; önce F) |
| **5 · Ürün JSON bağları** | Fiyat kuralı, renk resmi, harici barkod, koli kalemi (`kalemId`). | tek eşleşme | 3 (kalem ve renk / ölçü kimlikleri) |
| **6 · Sipariş ↔ üretim bağı** | Planlama bağında ve rezervasyonda kimlik; numara gösterim. | numara → kimlik tek eşleşme | K |
| **8 · Cari hareketinde ürün kimliği** | `car_hareket.urun_id` (+ varyant); maliyet / son alış kimlikle. | ürün adı tek eşleşme | 3 |
| **9 · Kalanlar** | Kimliksiz Tanımlar listeleri, kullanıcı damgası, portal kalemleri. | tek eşleşme | 3 (portal), F (cari tipi kimliği) |

Bağımlılık sırası: **0 → K ve F (birbirinden bağımsız) → 1 → 3 → (2, 5, 8) ; 4 F'den sonra ; 6 K'dan sonra ; 9 en son.**
Paket 1 ile K ve F birbirini beklemez; 2, 5 ve 8 Paket 3'ün kimlik sütunlarına dayanır.

**Eski istemci, çevrimdışı kayıt, bekleyen yazma:** (a) adımında sunucu adla gelen yazmayı kabul eder ve kimliği doldurur; kapsamda
tek eşleşme yoksa ya da kimlik–ad çelişiyorsa KR koduyla reddeder (yeni "serbest" kayıt açmaz). Reddedilen bekleyen yazma defterde
"inceleme gerekiyor" olarak kalır. İnternetsiz kayıt kilitli; birikmiş yazma aynı kuraldan geçer.

## 5b. Canlı envanter sonucu (28 Kasım, `51-canli-bag-envanteri-salt-okur.sql`; kullanıcı çalıştırdı)

| Bölüm | Sonuç | Değerlendirme |
|---|---|---|
| A yetim | cari hareketi 25'te **11** · fiş 9'da **3** · stok hareketi: carisi olmayan 20'de **10**, ürünü olmayan 26'da **10** · varyant 951'de **5** · site hesabı 3'te **3** · site talebi 8'de **8** · fiş → sipariş / üretim / kasa hesabı, kasa hareketi → hesap, üretim → rezervasyon siparişi: 0 | Üst kaydı silinmiş kayıtlar VAR. Site tablolarındaki cari kimliği gerçek cari kimliği (kayıt anında denetleniyor); hepsinin yetim olması o carilerin sonradan silindiğini gösterir. Deneme / sınama kayıtlarının temizliğinden kalmış olabilir — hangi üst kayıtlar olduğu `53-canli-yetim-ayrinti-salt-okur.sql` ile görülür. **Onarılmayacak; raporlanır.** |
| B boşalmış bağ | hepsi 0 (sipariş 3, kalem 150, üretim 1, verilmiş atama 1) | Temiz. SET NULL kuralları fiilen iz bırakmamış. |
| C yanlış üst kayıt | hepsi 0 | Temiz: hareket, fiş, kalem ve sipariş birbirini tutuyor. |
| D eski tablolar | `hesaplar`, `hesap_hareketleri`, `cekler`: 0 satır | Canlıda KULLANILMIYOR (uygulama kodu da bu tablolara yazmıyor). Topluca silen kural bugün veri silemez; Paket K yine de yolu kapatır. |
| E ada bağlı | kalem 150, reçete 221, üretim 1: BİREBİR eşleşmeyen 0 · reçete renk kimliği–ad çelişkisi **6** · cari hareketinde ürün adı eşleşmeyen 20'de **10** · proses adları: eşleşmeyen 0 · tam "Fasoncu" tipli cari **2**, adı "fason" içeren başka tip 0 | Ad bağları bugün tutarlı (hacim küçük). 6 reçete satırında kimlik ile ad çelişiyor: Paket 2'de sessizce seçilmeyecek, raporlanacak. 10 cari hareketinin ürün adı artık hiçbir ürünle eşleşmiyor (silinmiş ürünler — A ile aynı kaynak olabilir). |
| F belirsizlik | etkin ölçüde aynı ada birden çok kimlik **7** · etkin renkte **1** · adla açılmış "serbest" kayıt: renk 155 satırın bir kısmı, ölçü 26 satırın bir kısmı (sorgu toplamı tablo toplamı; etkin serbest sayısı 0 görünüyor) | Aynı ada iki kimlik: Paket 3'te otomatik eşlemeyi engeller (tür ve ürün kapsamıyla ayrışıyorsa bağlanır, ayrışmıyorsa rapor). |

Sonuçlar: (1) Paket K'nın yabancı anahtarları DOĞRULANMADAN kurulmalı (mevcut yetimler var; reddedilmezler). (2) Eski hesap tabloları boş —
kapsam dışı bırakılabilirdi; koruma yine de eklendi (maliyeti yok). (3) Paket F için canlıda tek fason tipi var: adı tam "Fasoncu", 2 cari;
dönüşüm gerekmiyor, eski kural aynen geçerli. (4) Ad bağlarının hacmi küçük ve tutarlı: Paket 2 ve 3'ün veri taşıması düşük riskli.

## 6. Bilinmeyenler
- Canlı veride ad bağlarının hacmi ve tutarlılığı (Paket 0).
- Taramaların ayrıntılı okumadığı yerler: sipariş / koli form satırları (325, 092, 315), teklif → sipariş (326), fiş defteri kalem
  yapısı (077), derlenmiş 236 / 237, asorti (140), fiyat listesi (157), 040 / 047 eşleme yollarının tamamı, IndexedDB anahtar yapısı (060),
  onay hedefleri (075), sevk fiş bağı (239), mamul depo (233). Her paket başlarken kendi alanı için tamamlanacak.
- Eski `cariler.fiyat_grubu` sütununun ad mı kimlik mi taşıdığı.
- Cari kodu ve personel barkodu için tekillik / düzenleme yolları.

## Durum kaydı — 28 Kasım (Paket K canlıda)

- **Paket K canlıda KURULU** (ana proje; kullanıcı SQL Editor'de çalıştırdı). `52-k-uygula.sql`
  `244920e26a81a71747495c51c32316370deccca7897f19d9376d3ce86fdf953d`. Önkoşul sorgusu (`52-k-onkosul-salt-okur.sql`) "HAZIR",
  kurulum sonrası durum sorgusu iki kez "KURULU" (7 fonksiyon · 8 tetikleyici · 6 yabancı anahtar). Geri alma: `52-k-geri-al.sql`
  (ayrı onay). İstemci değişmedi (1.744.48).
- Canlıdaki mevcut yetimler olduğu gibi duruyor: cari hareketi 11 · fiş 3 · stok hareketi 10 (cari) + 10 (ürün) · site hesabı 3 ·
  site talebi 8 · kasa hareketi 1 (hangi cari olduğu incelenmedi). Deneme kalıntılarının tamamı iptal edilmiş.
- **Bekleyen kararlar (kullanıcı):** 27181 reçetesinde altı satır (ad "KAHVE", kimlik Siyah — ölçüm: tüketim ADA göre; astarda
  ikinci Kahve varyantı açılıyor, `test/inceleme/ekran-recete-renk-tuketim.js`); kullanılmayan iki Siyah kaydı; astarın pasif
  Kahve kaydı. Karar gelmeden ad / kimlik değiştirilmez, renk birleştirilmez.
- **Hazır, uygulanmadı:** portal girişi "cari mevcut ve etkin" (dal `claude/portal-giris-cari`, 58-*); Paket F (dal
  `claude/paket-f-fason`; yayın için 1.744.50 geri dönüş istemcisi eksik).
- **Zorunlu kapsam:** ölçü eşlemesinde grup (Beden / Boyut) kimliğin parçasıdır; 36–42 iki grupta ayrı kimliklerle var, ad tek
  başına eşleşme anahtarı olamaz.
