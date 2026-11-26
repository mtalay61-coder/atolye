# 25 — Kapsamlı güvenlik ve veri bütünlüğü incelemesi · 1. rapor (26 Kasım 2026)

Esas: yayındaki **1.744.37** (main `526167e`). Canlıda yalnız salt okur inceleme; canlı veri, SQL, birleştirme, yayın YOK.
Yeni özellikler ve G-25 yayını bekletiliyor (kullanıcı kararı).

## 0. Yapı kaynağı ve sınırları

| Kaynak | Kapsam | Durum |
|---|---|---|
| Canlı yapı CSV'si (26 Kasım, `onarim/canli-yapi-salt-okur.sql`) | 13 tablo: tetikleyiciler + gövdeleri, kısıtlar, sütunlar, RLS bayrakları | ELDE (OZET 299 · fb6bf396…) |
| `25-canli-tam-yapi-salt-okur.sql` / `25b-…` | BÜTÜN public: politikalar, tablo / fonksiyon yetkileri, bütün fonksiyon gövdeleri, görünümler, realtime | KULLANICIDA, bekleniyor |
| Yerel test tabanı `inc_taban` | `canli26` (13 tabloda canlıyla OZET eşit) + `test/ekran/sema-tamamla.sql` + `test/inceleme/tohum.sql` (kurgusal) + **`test/inceleme/yerel-uyum.sql` (GEÇİCİ VARSAYIM)** | KURULDU |

`yerel-uyum.sql` varsayımları: `auth.uid()` köprünün e-posta `sub`'ına dayanıklı; görünümlere `authenticated` okuma; `siparisler` /
`siparis_kalemleri` için `authenticated` yazma (uygulama bu tablolara canlıda REST ile yazdığına göre yetki var sayıldı). 13 tablo dışındaki
tabloların yetki / politika / fonksiyon gövdeleri canlıyla DOĞRULANMADI — 25 sorguları gelince taban yeniden hizalanıp bütün testler
tekrarlanacak. Aşağıda her bulgunun "canlıda" sütunu buna göre yazıldı.

## 1. İşlem ve bağımlılık haritası (1.744.37)

Yazma yolları üçe ayrılır: (A) **tek satır tablolar** (`tanimlar`, `koliler`… — 030 `tekilYaz`: oku → birleştir → koşulsuz upsert),
(B) **fark yazması** (040 `tabloYaz`: bellekteki liste ile son bilinen arasındaki fark, satır başına `surum=eq.N` iyimser kilit; alt tablolar
ayrı istekler), (C) **sunucu işlemleri** (tek işlem: `stk_yaz`, `fis_kes`, `fis_iptal(_toplu)`, `fis_bag_coz`, `car_yaz`, `kas_yaz`, `alt_yaz`,
`lst_yaz`, `stk_renk_tasi`, `uretim_sil`).

| Nesne · işlem | Dokunduğu tablolar / bağlar | Yol | Bağ türü |
|---|---|---|---|
| Renk / beden / kombinasyon ekle-düzenle-sil | `tanimlar.veri` (renkler, bedenler, renkKombinasyonlari, kullanicilar, prosesler, fiyat grupları… HEPSİ tek satır) → tetikleyici `stk_tanim_aynasi` → `stk_renk` / `stk_olcu` (yoksa pasif, `stk_serbest_birlestir`) | A | kimlik (id) |
| **Renk adı değiştir** (082 `hammaddeRenkAdDegistir`) | `tanimlar` + `urunler` (varyant, reçete mamulRenk/renk, renkResimleri, hariciBarkodlar — ADLA) + varyantlar→`stk_yaz` + `siparisler`/`siparis_kalemleri.renk` (METİN) + `uretim.renk` (METİN) + `koliler` + `stok_rezervasyonlari` | A + B + C, **5–6 AYRI yazma, atomik değil** | varyant kimlikle; sipariş, üretim, koli, rezervasyon, resim, harici barkod, reçete ADLA |
| Beden adı değiştir (082 `olcuAdDegistir`) | aynı aile + bedenGruplari, asortiler | aynı | sipariş/üretim/koli ADLA |
| Tanımsız ölçü birleştir (082) · tanım birleştir (089) · renk taşı (`stk_renk_tasi`) | aynı aile; `stk_renk_tasi` sunucuda kilitli tek işlem (F8) | B / C | — |
| Renk sil (130 `removeRenk`) · kombinasyon sil (130 `kombinasyonSil`) | `tanimlar` (bağlı kombinasyonlar da kalkar) → `stk_renk.aktif=false` | A | kullanım denetimi yalnız **ürün varyantlarında, adın TAM eşitliğiyle** |
| Ürün ekle/düzenle | `urunler` (reçete, resim, barkod sütunları) + varyant/hareket farkı → `stk_yaz` (tek işlem) | B + C | — |
| Ürün sil (087) | çöp + `urunler` DELETE (sunucu: `silme_koruma` stok/silme) | B | — |
| Cari ekle/düzenle/sil (087) | `cariler` (REST); hareket `car_yaz` | B + C | — |
| Sipariş ekle/düzenle | `siparisler` + `siparis_kalemleri` (renk/beden METİN, `urun_id` kimlik) | B | kalem → varyant ADLA |
| Sipariş iptal | `fis_bag_coz` (KR006: durum yalnız bu yolla) | C | — |
| Sevk / teslim / satış fişi | `fis_kes` (stok + cari + karşılanan; tekrar = aynı istek kimliği) | C | kalem kimliği |
| Üretim ekle/düzenle | `uretim` (renk METİN), `uretim_atamalari` | B | ADLA |
| Üretim teslim / sil | `fis_kes` (ÜRT) + işçilik `car_yaz` / `uretim_sil` | C | — |
| Kasa / banka / çek | `kas_yaz` | C | — |

Sunucu yetki modeli (canlı, 13 tablo): `stk_istemci_koru` (sürüm kapısı; SQL Editor / servis rolünde atlanır) · `yazma_yetkisi_koruma`
yalnız **silmede** (`urunler`, `siparisler`; `rls-yazma.sql` cariler / uretim için de kuruyor — canlıda doğrulanacak) · `tanimlar_kullanici_koruma`
yalnız kullanıcı listesi, `girisAktifMi` ve satır kimliği. Ekleme / güncellemede modül yetkisi sunucuda **bilerek** denetlenmiyor
(`rls-yazma.sql` başlığı: "uygulama modüller arası yazma yapıyor"). RPC'ler kendi içinde `stk_yetki` / `yetki_var_mi` çağırıyor (G-25: modül
listesinde HERHANGİ biri yeter).

## 2. Tamamlanan kontroller

| # | Kontrol | Nasıl | Sonuç |
|---|---|---|---|
| K1 | Doğrudan API yetki matrisi: 16 işlem × 4 hesap (anon · listede olmayan · yalnız stok yetkili personel · Yönetici) | `test/inceleme/yetki-api.js`; her deneme ayrı işlem, PostgREST eşdeğeri (rol + jwt + başlık), sonra geri alınır; yazılan değer aynı işlemde okunur; ret kodu + iletisi yazılır | 48 uyumlu · **14 AÇIK** · 2 farklı gerekçe (KR006, doğru davranış) |
| K1-B | Bozma: `tanimlar_kullanici_koruma`, `urunler.silme_koruma`, `fis_siparis_iptal_koru` kapatıldı | aynı test, `inc_bozuk` | **9 yeni AÇIK** — her kapatılan koruma yakalandı (kendini Yönetici ekleme, giriş denetimini kapatma, ürün silme, sipariş durumunu doğrudan İptal) |
| K2 | Bayat cihazda renk adı değişikliği (ekrandan, 1.744.37) | `test/inceleme/ekran-ad-bag.js`; başka cihaz kalem ekler, bu cihazın yoklaması o an görmez (yanıt dondurulur) | **BAĞ KOPTU** (aşağıda B1) · kontrol grubu (yoklama sonrası) 4/4 |
| K3 | İki cihaz aynı anda Tanımlar kaydı (ekrandan, iki tarayıcı) | `test/inceleme/ekran-tanim-yaris.js`; B okumuş, yazması yolda; A yazar; B'nin yazması varır | **A'nın eklediği renk KAYBOLDU** (B2) · kontrol (sıralı) 2/2 |

## 3. Bulgular (öncelik sırasıyla)

### KANITLANMIŞ (yerelde yeniden üretildi)

**B1 — Bayat cihazdaki ad değişikliği sipariş kalemini varyanttan koparır (veri bağı kaybı).** Öncelik: YÜKSEK.
- Tetikleyen: Tanımlar › renk adı değiştirme (082), değişiklik yoklamasının henüz görmediği (8 sn aralık; sekme arka plandaysa, ağ oynaksa,
  bekleyen yazması olan alan hiç tazelenmez — 047) bir sipariş kalemi varken.
- Etkilenen: `siparis_kalemleri.renk` (metin). Aynı yol `uretim.renk`, `koliler`, `stok_rezervasyonlari`, ürünlerin `renkResimleri` / `hariciBarkodlar`
  / reçete metinleri için de geçerli (hepsi bu cihazın belleğinden çevriliyor) — yalnız sipariş kalemi ekrandan sınandı.
- Kanıt: `ekran-ad-bag.js` BAYAT=1 → SAT-9002/40 "1054 - Siyah/Vizon Yılan" kaldı, `etkin_varyanta_bagli=false`; miktar değişmedi. BAYAT=0
  (kontrol) → 3/3 bağlı. Sunucuda ada göre yayılım yok (fonksiyon taraması).
- Canlıda: kod ve şema aynı (13 tablo canlıyla eşit: `siparis_kalemleri.renk` metin, kimlik sütunu yok) → **canlıda da oluşabilir**. Bugün
  böyle kopmuş kalem olup olmadığı salt okur envanterle görülebilir (26 Kasım envanteri 23 üründe 115/115 bağlıydı; tüm ürünler için ayrı sorgu
  gerekir).
- Öneri: ad değişikliği sunucuda TEK işlem (yeni RPC: tanım + bütün metin bağları aynı kilit altında, ada göre değil kimliğe göre). Kısa vadede:
  değişiklikten hemen önce ilgili tabloları buluttan zorla tazelemek ve değişiklik sonrası "eski adla kalan kayıt" denetimi. Uzun vadede
  `siparis_kalemleri` / `uretim` için `renk_id` / `olcu_id`.

**B2 — İki cihazın Tanımlar yazması çakışırsa birinin eklediği kaybolur (son yazan kazanır).** Öncelik: YÜKSEK.
- Tetikleyen: iki cihaz (ya da otomatik tanım yazması + kullanıcı) okuma ile yazma arasındaki aralıkta Tanımlar'a yazar. 030 `tekilYaz` önce
  okuyup birleştiriyor (v1.552 düzeltmesi) ama POST **koşulsuz** — `tanimlar_surum` tetikleyicisi sürümü artırıyor, istemci `surum=eq.N`
  göndermiyor.
- Etkilenen: `tanimlar.veri` bütünü (renk, beden, kombinasyon, proses, fiyat grubu…); kaybolan renk `stk_renk`'te pasife düşer
  (`stk_tanim_esitle`) — o renge bağlı varyant pasif renk kimliğine bakar.
- Kanıt: `ekran-tanim-yaris.js` YARIS=1 → sunucuda `Kırmızı` yok, `stk_renk` etkin listesinde yok (25 sn sonra da); YARIS=0 → ikisi de var.
- Canlıda: kod aynı, `tanimlar_surum` canlıda var → **canlıda da oluşabilir**; olasılığı ağ gecikmesiyle artar. 3 Ekim'de (v1.552) aynı ailenin
  daha geniş hâli yaşanmıştı.
- Öneri: koşullu yazma (`PATCH tanimlar?id=eq.tekil&surum=eq.N`; 0 satırda yeniden oku-birleştir-dene) — istemci değişikliği, sunucu hazır.

**B3 — Listede olmayan hesap ve yetkisiz personel API'den ana kayıtları değiştirebilir.** Öncelik: YÜKSEK (yetkisiz işlem), olasılık düşük-orta.
- Tetikleyen: geçerli bir oturum jetonuyla doğrudan REST isteği (ekran gerekmez; publishable anahtar HTML'de).
- Kanıt (`yetki-api.js`, `inc_taban`): listede OLMAYAN hesap (`yetki_var_mi` = hayır) ürün adını, cari unvanını ve Tanımlar'daki renk
  adlarını değiştirdi, **bütün renkleri sildi** (`stk_renk` 0 etkin) ve cariyi sildi; yalnız stok yetkili personel cari ve Tanımlar için
  aynısını yaptı. Bu yazmalar tabanın KENDİ yetkileriyle (18 Kasım kurulumu; `yerel-uyum.sql` bu tablolara yetki eklemez) oldu. Sipariş
  kalemi miktarı / rengi de değişti, ama o tablonun yazma yetkisi `yerel-uyum.sql` VARSAYIMIYLA verildi — canlı yetkisi gelene kadar şüphe
  sayılır. Kullanıcı listesi, giriş ayarı, ürün / sipariş silme ve sipariş iptali korunuyor (doğru gerekçeyle: 42501 / KR006).
- Canlıda: ürün / sipariş / Tanımlar tetikleyicileri canlıyla aynı (13 tablo) → ürün ve Tanımlar yazımı **canlıda da açık** (politika
  `giris_yapmis_hersey` canlıda doğrulanacak). Cariler ve sipariş kalemi yetkileri 25 sorgusuyla doğrulanacak. Bugün auth.users'ta 3 hesap,
  hepsi listede, kayıt kapalı (20-AUTH) → listede olmayan hesap şu an YOK; risk kaydın yeniden açılması, eski çalışanın hesabı ya da personel.
- Öneri (iki katman): (1) her ERP tablosuna "çağıran listede mi" tetikleyicisi (uygulamanın modüller arası yazmasını bozmaz; listede olmayanı
  hep reddeder) · (2) Tanımlar'da kullanıcı listesi dışındaki alanlar için "tanimlar düzenleme" yetkisi (otomatik tanım yazmaları için istisna
  tasarlanmalı — ayrı karar).
- Ek gözlem (yerel kopyada; canlıda doğrulanacak): `cariler` DELETE herkese açık çıktı — yerel tabanda `cariler.silme_koruma` yok;
  `rls-yazma.sql` kuruyor.

### ŞÜPHE (kodda görüldü, henüz koşturulmadı)

| # | Şüphe | Yer | Olası etki |
|---|---|---|---|
| Ş1 | Renk / kombinasyon silme kullanım denetimi yalnız ürün varyantlarına ve adın TAM (büyük-küçük harf duyarlı) eşitliğine bakıyor; sipariş kalemi, üretim, reçete hammadde rengi, harici barkod denetlenmiyor | 130 `removeRenk`, `hammaddeRenkKullanildigiUrunler`, `kombinasyonSil` | yazım farkı olan ya da yalnız siparişte geçen renk silinir → bağ kopar, `stk_renk` pasif |
| Ş2 | Ad değişikliğinin 5–6 yazmasından biri düşerse (ağ, kalıcı ret) kalanlar gitmiş olur; bekleyen defter yeniden dener ama arada başka cihaz eski hâli görür | 082 | geçici / kalıcı bağ kopukluğu |
| Ş3 | Bekleyen yazması olan alan değişiklik yoklamasıyla hiç tazelenmez (047: "yerel kazanır") → uzun süre bayat; B1 penceresini büyütür | 047, 100 | B1 / B2 olasılığı artar |
| Ş4 | Fiş / kasa / cari tek işlem (`fis_kes`, `kas_yaz`, `car_yaz`) — yarım kayıt ve tekrar koruması önceki F0–F8 ve ekran testlerinde sınanmış; canlı gövdeleri gelmeden bu incelemede yeniden koşturulmadı | stok-v2 | doğrulanacak |

## 3b. Düzeltmeler (27 Kasım; ayrı dallar, yalnız yerel — canlı SQL / birleştirme / yayın YOK)

| Bulgu | Dal | İçerik | Sınama |
|---|---|---|---|
| **B1** | `claude/b1-ad-degistir-sunucu` (1.744.38) | `26-b1-renk-ad-degistir.sql`: `tanim_renk_ad_degistir` — Tanımlar satırı FOR UPDATE + adın geçtiği tablolar EXCLUSIVE kilit; Tanımlar, sipariş kalemi (+ sipariş sürümü), üretim, rezervasyon, koli (lst_kayit), reçete, renk resmi, harici barkod TEK işlemde; `tanim_ad_gecmisi` + tetikleyici: ad değişikliğinden SONRA bayat cihazın eski adla yazdığı kayıt güncel ada çevrilir. Yetki: listede + Tanımlar düzenleme. KR020–024. İstemci 082 sunucuyu çağırır, sonucu tazeler; fonksiyon yoksa (PGRST202) eski yol; bekleyen yazma varken ad değiştirmez | `b1-sina.js` 50/50 (tam güncelleme, bayat yazma, eşzamanlı iki sıra + kilitte bekleme, sonda hata → tam geri alma, yetki, bayat istek / aynı ad / boş ad, istek tekrarı); bozma: tetikleyici kaldırılınca ve tablo kilidi kaldırılınca kırmızı · `ekran-ad-bag.js` bayat 2/4 → **4/4** · fonksiyonsuz eski yol 4/4 · `kosu.sh` temiz |
| **B2** | `claude/b2-tanim-surum-kosullu` (1.744.39) | 030 `tekilYaz` (tanımlar): sürümle oku → üç yönlü birleştir → `surum=eq.N` PATCH; 0 satır → yeniden oku-birleştir (6 deneme). 089 `tanimCakismalari`: iki taraf AYNI öğeyi farklı değiştirdiyse (ya da biri sildi, öbürü değiştirdi) yazma durur, değişiklik bekleyen defterde "inceleme" (yoklama ezmez), şeritte öğe öğe çakışma + "Benimkini uygula" / "Sunucudakini al". Sayaçlar (kodSayaclari) büyüğüyle birleşir. Sunucu değişikliği yok | `birim-tanim-cakisma` 12/12 · `ekran-tanim-yaris` ekle 4/4, çakışma 12/12 (yarış + kontrol) · bozma: `tanimlar_surum` kaldırılınca kayıp geri geliyor, sınama kırmızı |

B1 ile istemcideki 046 kuralı arasında BİLEREK fark: sunucu reçete satırında renk kimliği ile adın İKİSİNİ de arar; kimliği bu renk ama
adı başka olan satıra (26 Kasım E: yanlış damgalı 8 satır) dokunmaz, sayısını `celiskili_recete_satiri` olarak döndürür. İstemci kuralı
bu satırları kimliğe güvenip yeniden adlandırıyordu.

Kapsam dışı kalan (B1 sonrası): beden adı değişikliği (082 `olcuAdDegistir`) aynı sınıf — aynı kalıpla ayrı iş; teklifler (082 de
çevirmiyordu); diğer tek parça tablolar (muhasebe, koliler v1…) üç yönlü birleştirmede aynı "yerel sessizce kazanır" kuralını taşıyor
(B2 yalnız Tanımlar) — liste v2 / kasa v2'ye geçmiş kurulumda bu tablolar satır satır sunucu işlemiyle yazıldığı için etkisi sınırlı,
canlı `stk_ayar` gelince belirlenecek.

### Yan bulgu Y1 — `degisiklik` sayacı bütün yazmaları tek satırda sıraya sokuyor (KANITLANDI, B1 sınamasında)
`degisiklik_bump` (deyim düzeyi, her ERP tablosunda) tek `degisiklik.tekil` satırını günceller: açık bir yazma işlemi bitmeden başka HİÇBİR
tabloya yazma tamamlanamaz (b1-sina B-2 ilk denemesi: kilit zaman aşımı `while locking tuple … in relation "degisiklik"`). Veri bozmaz ama
uzun işlemde (ör. büyük `stk_yaz`, ad değişikliği) bütün cihazların yazması bekler; kilitlenme (deadlock) ihtimalini artırır. Öneri: tablo
başına satır ya da sayacı işlem sonunda tek seferde (ayrı karar; canlıda ölçülmedi).

## 4. Sıradaki adımlar
1. 25 / 25b CSV'leri → tam canlı yapı (`yapi-hizala.py` bütün nesnelere genişletilecek) → `inc_taban` yeniden; `yerel-uyum.sql` kalkar.
2. K1–K3 canlı yapısıyla tekrar; Ş1–Ş4 için senaryolar: renk silme kullanım denetimi; ad değişikliğinde yazma düşmesi; `fis_kes` / `kas_yaz` /
   `car_yaz` sonda bilerek hata (yarım kayıt yok mu), aynı istek iki kez, yanıt kaybı, çift tık, iki cihaz aynı kalemi teslim; iptal → yeniden
   teslim, kısmi teslim, tamirde çift stok / çift ödeme; eski sekme (sürüm kapısı kapalı) bayat ürün kaydı.
3. Her kritik test için bozma provası (K1-B gibi).
4. Düzeltmeler ayrı dallarda, hizalanmış kopyada; canlı uygulama yok.
