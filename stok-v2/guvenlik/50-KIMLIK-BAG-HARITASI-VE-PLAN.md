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

## 3. Öncelik (ad / kod değişikliği, silme, birleştirme, eşzamanlı kayıt)

| # | Risk | Neden önce |
|---|---|---|
| 1 | **Beden adı değişikliği atomik değil** | canlıda yaşanan renk hatasının aynı sınıfı; her kayıt beden adıyla bağlı; şema değişmeden kapatılabilir |
| 2 | **Reçete eşleşmesi birebir ad** | sessiz sonuç: hammadde düşmez, maliyet / ihtiyaç boş; kimlik damgası zaten var, okunmuyor |
| 3 | **Sipariş kalemi / üretim / rezervasyon renk-beden metni** | bütün satış-üretim zinciri; eşzamanlı kayıtta bayat ad |
| 4 | **Proses adı ve "Fasoncu" sabiti** | para: ücret, tahakkuk, işçilik fişi |
| 5 | **Cariye özel fiyat kuralı, renk resmi, harici barkod, koli kalemi** | ad taşıması eksik / kırılgan |
| 6 | **Sipariş ↔ üretim numara bağı, rezervasyon `uretim_no`** | iptalde numara değişiyor |
| 7 | **CASCADE silmeler ve eksik yabancı anahtarlar** | geçmişin topluca silinmesi, yetim kayıt |
| 8 | **Cari hareketinde ürün kimliği yok** | maliyet geçmişi ürün adına bağlı |
| 9 | Kimliksiz Tanımlar listeleri, kullanıcı damgası, portal kalemleri | görece düşük hacim / etki |

## 4. Aşamalı uygulama planı

**Ortak kurallar (her paket)**
- Var olan kimlikler korunur; yeni kimlik yalnız kimliği hiç olmayan varlığa (cari tipi) verilir. Sipariş numarası, barkod kodu, fiş
  numarası insan için kalır; teknik bağ kimlikle kurulur.
- Şema değişiklikleri EKLEMELİDİR (yeni boş sütun / JSON alanı). Ad sütunları kalır: "işlem anındaki ad" olarak ve eski istemci için.
- Geçiş üç adımdır: (a) sunucu kimliği ad yanında KABUL eder ve doldurur, (b) istemci kimliği yazar ve kimlikten okur, (c) sunucu
  kimliği ZORUNLU kılar (eksik / geçersiz kimlik KR koduyla reddedilir). (c) adımı ancak bütün cihazlar yeni sürümdeyken ve
  `stk_ayar.min_istemci_surum` kapısıyla birlikte açılır.
- Veri taşıma: yalnız TEK ve KESİN eşleşme otomatik bağlanır. Eşleşmeyen ve birden çok eşleşen kayıtlar tahmin edilmez; salt okur
  raporla listelenir, karar kullanıcıda.
- Her paket: kurulum SQL'i (tek blok, LF / CRLF sınanmış) + geri alma SQL'i + salt okur önkoşul / doğrulama sorgusu + kalıcı ekran
  sınaması (önce eski kodda kalır, sonra geçer) + yerel Supabase'de: ad / kod değişikliği, iki cihaz, bağlantı kesilmesi, tekrar gönderme,
  iptal, geri alma; miktar, bakiye, stok, geçmiş hareket ve barkod karşılaştırması.
- Geri dönüş: sunucu paketi geri alınır (eklenen sütunlar kalır, okunmaz); istemci için her yayında "önceki sağlam kod, daha yüksek
  numara" dosyası hazır olur.

| Paket | Kapsam | Veri dönüşümü | Geri dönüş |
|---|---|---|---|
| **0 · Envanter (salt okur)** | Canlıda her ad bağının ölçümü: kaç kayıt, kaçı tek eşleşiyor, kaçı eşleşmiyor / çoklu. Paketlerin kapsamını ve sırasını kesinleştirir. | yok | yok (yalnız okur) |
| **1 · Beden adı sunucuda tek işlem** | `tanim_olcu_ad_degistir` (B1'in bedene karşılığı): Tanımlar + kalem, üretim (`beden_miktarlari`, atama sonuçları), rezervasyon, koli, reçete, barkod, asorti aynı işlemde; eski ad defteri; bayat yazma çevirisi. İstemci 082 sunucuyu çağırır. | yok (yeni tablo / fonksiyon) | SQL geri alma + istemci geri dönüş |
| **2 · Reçete kimlikle okunur** | Okuyucular `mamulRenkId` / `renkId` (ve yeni `mamulOlcuId`, `olcuId`) ile eşler; ad yalnız kimliksiz satırda yedek. Sunucu reçete yazmasında kimliği doğrular. | var olan damgalar; eksikler tek eşleşmede doldurulur, kalanı rapor | istemci geri dönüş; eklenen alanlar zararsız |
| **3 · Kalem / üretim / rezervasyon satırlarında kimlik** | `siparis_kalemleri`, `uretim`, `stok_rezervasyonlari`'na `renk_id`, `olcu_id` (ve uygun yerde `varyant_id`) sütunları + yabancı anahtar. Sunucu yazmada doldurur / doğrular; "serbest renk aç" yolu bu tablolarda kapanır. İstemci kimlikle eşler, güncel adı kimlikten gösterir. | tek eşleşen otomatik; diğerleri rapor | sütunlar kalır; tetikleyiciler kalkar |
| **4 · Proses kimliği ve fasoncu** | Ücret, bölüm üyeliği, usta yetkisi, kapasite, atama, gider kartı bağı proses `id` ile; işçilik fişinde proses kimliği `ek`'te; cari tipine kimlik ve "fasoncu" için ada bağlı olmayan işaret. | proses adı → kimlik tek eşleşme; çoklu / eksik rapor | eski ad anahtarları yanında tutulur |
| **5 · Ürün JSON bağları** | Fiyat kuralı, renk resmi, harici barkod, koli kalemi (`kalemId`) kimlikli. | tek eşleşme; kalan rapor | eklenen alanlar zararsız |
| **6 · Sipariş ↔ üretim bağı** | `planlama` bağında `uretimId` / `siparisId`; rezervasyonda `uretim_id`; numara gösterim olarak kalır. | numara → kimlik tek eşleşme | eski numara alanları kalır |
| **7 · Silme korumaları ve yabancı anahtarlar** | CASCADE yerine engel / pasife alma (kalem, rezervasyon, atama, hesap hareketi); eksik yabancı anahtarlar önce doğrulanmadan (NOT VALID), yetim raporu temizse doğrulanarak; bölüm / renk / proses silmede sunucu kullanım denetimi. | yok; yetim kayıt raporu | kısıtlar kaldırılır |
| **8 · Cari hareketinde ürün kimliği** | `car_hareket`'e `urun_id` (+ varyant); maliyet / son alış kimlikle. | ad → kimlik tek eşleşme | sütun kalır |
| **9 · Kalanlar** | Kimliksiz Tanımlar listeleri, kullanıcı damgasında `kullaniciId`, portal kalemlerinde renk / ölçü kimliği. | tek eşleşme | zararsız |

**Eski istemci, çevrimdışı kayıt, bekleyen yazma**
- (a) adımında sunucu eski istemcinin adla gelen yazmasını kabul eder ve kimliği kendisi doldurur; çoklu / eksik eşleşmede o tablo için
  KR koduyla reddeder (yeni "serbest" kayıt açmaz). Bekleyen yazma reddedilirse defterde "inceleme gerekiyor" olarak kalır, veri kaybolmaz.
- İnternetsiz kayıt zaten kilitli; çevrimdışı birikmiş yazma yalnız "gönderilemeyen bekleyen kayıt"tır ve aynı kuraldan geçer.
- (c) adımından önce bütün cihazların sürümü doğrulanır; kapı `min_istemci_surum` ile sunucuda da uygulanır.

## 5. Bugün zaten sağlam olanlar (dokunulmayacak)
Cari ↔ hareket / sipariş / çek / kasa (`cari_id`); stok hareketi ↔ fiş / varyant / kalem (yabancı anahtarlı); üretim ataması ↔ kişi
(`personel_id`); fiş ↔ hareketler (`fis_id`, istek kimliğiyle tekrar koruması); gider kartı, fiyat grubu, bölüm üyeliği (`cariId`);
görev / mesaj (`kullaniciId`); site kaydı ↔ cari.

## 6. Bilinmeyenler
- Canlı veride ad bağlarının hacmi ve tutarlılığı (Paket 0).
- Taramaların ayrıntılı okumadığı yerler: sipariş / koli form satırları (325, 092, 315), teklif → sipariş (326), fiş defteri kalem
  yapısı (077), derlenmiş 236 / 237, asorti (140), fiyat listesi (157), 040 / 047 eşleme yollarının tamamı, IndexedDB anahtar yapısı (060),
  onay hedefleri (075), sevk fiş bağı (239), mamul depo (233). Her paket başlarken kendi alanı için tamamlanacak.
- Eski `cariler.fiyat_grubu` sütununun ad mı kimlik mi taşıdığı.
- Cari kodu ve personel barkodu için tekillik / düzenleme yolları.
