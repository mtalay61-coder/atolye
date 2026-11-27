# 25 — Kapsamlı güvenlik ve veri bütünlüğü incelemesi · 1. rapor (26 Kasım 2026)

> **DURUM: İLK İNCELEME TAMAMLANDI — KAPSAMLI İNCELEME SÜRÜYOR.** Bu rapor ara rapordur; açık bulgular (B3a, B3b, B4, B5, Y1) ve
> sınanmamış kapsam aşağıda. İlk güvenlik paketi (B1 + B2) deneme projesi için sabitlendi, onay bekliyor (§9); canlıya geçilmedi.

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

### 2. ve 3. tur (27 Kasım) — kullanıcının dört kontrolü

| # | Kontrol | Sonuç | Kanıt |
|---|---|---|---|
| 1 | B1 eski yola dönmesin | Sunucu fonksiyonu yoksa (PGRST202) ad değiştirme **açık iletiyle durur**, hiçbir kayıt değişmez; eski yöntem yalnız bulut hiç kapalıyken (tek cihaz). Sunucu kurulumu YAYIN ÖNKOŞULU: `26-b1-onkosul-salt-okur.sql` "KURULU" demeden yayın yok | ekran-ad-bag kurulumsuz 3/3 (ad değişmedi, kalemler aynı, ileti) · önkoşul sorgusu kurulu tabanda KURULU, kurulumsuzda KURULU DEĞİL |
| 2 | Eski ad defteri | A→B→C: iki eski ad da C'ye · A→B→A: A yeniden güncel ad, B ile gelen A'ya · eski adı başka renge vermek **KR026** (ad değişikliğiyle de, Tanımlar'da yeni renkle de; Yönetici `tanim_eski_ad_serbest` ile bırakır) · geçmişten kalan belirsizlik (eski ad başka etkin rengin adı / iki rengin eski adı) **KR025**, rengi silinmiş eski ad **KR027** — sessiz eşleme yok · eski adla DURAN kaydın başka alanı düzeltilebilir (yalnız yeni / değişen metne bakılır) · KR kodları gerçek SQLSTATE (istemci kalıcı ret olarak tanır) | b1-sina 69/69 (D7–D11) · bozma B-3: eşleme ilk (sessiz) sürüme + koruma kaldırılınca bayat kalem sessizce yazıldı → kırmızı |
| 3 | B2'de karar verilirken üçüncü yazma | "Benimkini uygula" yalnız şeritte GÖRÜLEN çakışmaları onaylar (aynı yol + aynı iki değer); her denemede sürüm ve çakışmalar yeniden hesaplanır. Bu arada başka cihazın eklediği kayıt korunur; aynı alan yeniden değiştiyse onay geçersiz, sunucunun son değeri korunur, yeniden sorulur | ekran-tanim-yaris karar_ucuncu 7/7 (Mor korundu), karar_degisti 6/6 · bozma: önceki istemci (aa605be) karar_degisti'de A'nın son değerini EZDİ → 2 kırmızı |
| 4 | Sayaçlar / kodlar | ÖLÇÜLDÜ: eşzamanlı iki yeni renk ikisi de ton kodu **101** aldı (barkod kodu sonradan onarılıyordu, ton kodu hiç). Düzeltme: birleştirmede BU cihazın henüz yazılmamış yeni öğesi sunucudakiyle aynı kodu taşıyorsa yalnız o yeni öğe sıradaki boş koda geçer (sunucudakine dokunulmaz, bildirilir); kombinasyon kodu etikette göründüğü için sessizce değişmez → açık çakışma | ekle (yarış + kontrol) 5/5: ton kodları 101 / 102, barkod kodları tekil, iki renk de kodlu · birim 9–11 |

**3. turda bulunan B2 hatası (kanıtlandı, düzeltildi):** çakışma bulucu, tabanda OLMAYAN bir alanı (iki cihazın aynı anda ilk kez verdiği
ton kodu) "taban bilinmiyor" sanıp çakışma saymıyordu → yerel sessizce kazanıyor, öbür cihazın değeri eziliyordu (ALAN=kod: 1/4 → 6/6).
"Bilinmiyor" artık yalnız en üstte; ayrıca yazmanın tabanı çağrı anında yakalanıyor (yazma yoldayken açılış / tazeleme / yoklama tabanı
değiştirse de). Birim 8b.

**Birleşik dal (`claude/b1-b2-birlesik`, 1.744.40) — etkileşim bulgusu:** B1 kuruluyken renk ADI Tanımlar yazmasıyla değil sunucu
işlemiyle değişir; B2'nin çakışma şeridi bu yolda devreye GİRMEZ. Koruma sunucuda: ilk gelen uygulanır, ikinci istek eski ad tutmadığı
için **KR021** ile reddedilir (sessiz ezme yok, ikinci cihaza açık ileti; ikinci cihazın değişikliği BEKLETİLMEZ, kullanıcı yeniden yapar).
Ton kodu gibi öbür alanlar B2 yolundan gider. Birleşik sınama: b1-sina 69/69 · ekran-ad-bag bayat 4/4, kontrol 4/4, kurulumsuz 3/3 ·
ekran-tanim-yaris ekle 5/5, ad_yaris 4/4 (köprü günlüğünde A'nın isteği 400 KR021), cakisma (kod) 6/6, karar_ucuncu (kod) 7/7,
karar_degisti (kod) 6/6. Birleşik dalın tam regresyonu (`af8c2a2`) 275/275 AYNI, birim testleri temiz.

**Regresyon (kosu.sh):** B1 2. tur öncesi temiz · B2 2. tur 275/275 AYNI (iki altın gerekçeyle: `bekleyen-yazma` adres uzunluğu 32 → 38;
`tanim-birlestir` sahte sunucusu artık yazılanı saklıyor — eski yolla da aynı altın) · B2 3. tur (`34377d7`) 275/275 AYNI · birleşik dal 275/275 AYNI.

### Canlı yapı CSV'si (25, 27 Kasım) — ilk ölçümler
- 1508 satır + OZET (`ca99b1e1…`). Satır sayısı tutuyor; OZET canlının sıralama kuralıyla (glibc en_US) hesaplandığı için yerelde birebir
  üretilemedi (C, ICU, yerelde üretilen en_US denendi). Sıralamadan bağımsız doğrulama: `25c-ozet-c-salt-okur.sql` → beklenen
  `1508 | bd6b4457b08b9abdfed35bc60b542525` — **canlıda çalıştırıldı, BİREBİR AYNI (CSV tam)**. Gizli değer tarayıcısı: 0 bulgu (yardımcı kontrol).
- 25b (fonksiyon / görünüm gövdeleri, 141 satır): 115 fonksiyonun ve 18 görünümün md5'i 25'teki md5'lerle birebir aynı (25'te ad sütunu `name`
  türünden 63 bayta kırpılıyor — eşleme önekle) → gövdeler tam. Tarayıcı 0 bulgu; parola / anahtar geçen satırlara elle de bakıldı, sabit sır
  yok; fonksiyonlarda dışarıya HTTP çağrısı yok. Ham canlı metin depoya konmadı.
- Hesaplar: auth.users 3, üçü ERP listesinde, doğrulanmış, anonim değil; ERP kullanıcılarının ÜÇÜ DE Yönetici → bugün personel yetkisiyle
  çalışan hesap yok (B3'ün personel kısmı bugün kimseyi etkilemiyor; ileride personel hesabı açılınca geçerli). girisAktifMi = true.
- anon: yalnız `surum` okuma + site portalının 8 fonksiyonu + `yonetici_mi`. Depolama: `Uygulama` ve `gorseller` kovaları HERKESE AÇIK
  okuma (gorseller'e yazma yalnız Yönetici politikası; Uygulama'ya politika yok → yalnız servis rolü yazar). pg_cron: 15 dakikada bir
  `gun-sonu-raporu`. Liste v2'ye geçen tablolar: teklifler, faturalar, koliler, gorevler, modeller, fis_defteri, mesajlar; kasa v2 açık;
  fiş kuralları KAPALI (`fis_aktif = false`), sürüm kapısı boş.
- **B3 canlı yetkilerle yeniden ölçüldü** (`canli-yetki-hizala.py`: canlının tablo yetkileri, RLS, politikaları, eksik tetikleyicileri ve
  stk_ayar'ı yerel tabana; `yerel-uyum.sql`'in yetki varsayımları KALKTI): listede olmayan hesap ürün adını / sürümünü, cari unvanını,
  Tanımlar'daki renkleri (değiştirme ve hepsini silme) YAZABİLİYOR; yalnız stok yetkili personel cari unvanını ve Tanımlar'ı yazabiliyor.
  Silme (ürün, sipariş, cari) ve kullanıcı listesi / giriş ayarı korunuyor. Önceki "sipariş kalemi doğrudan yazılır" bulgusu canlıda
  GEÇERSİZ: authenticated'ın `siparis_kalemleri`'nde yalnız okuma yetkisi var (uygulama sunucu işlemiyle yazar). Yerelde açık görünen
  cari silme canlıda `silme_koruma` ile kapalı. Sınır: RPC'lerin (stk_yaz, fis_kes, car_yaz, kas_yaz, lst_yaz, alt_yaz) ve `yetki_var_mi`,
  `stk_yetki`, `yonetici_mi` gövdeleri yerelde canlıdan FARKLI (md5) — RPC düzeyindeki yetki ölçümü 25b gövdeleri gelince.

### AÇIK KAPSAM (bilerek kapatılmadı)
- **Beden adı değişikliği** (082 `olcuAdDegistir`, `tanimsizOlcuCevir`): B1 ile aynı hata sınıfı — hâlâ istemci belleğinden, 5–6 ayrı
  yazma. Aynı kalıpla (sunucu işlemi + eski ad defteri) ayrı iş.
- **Diğer tek satırlık tablolar** (muhasebe, koliler v1, teklifler, faturalar, görevler, modeller…): 030 üç yönlü birleştirme aynı
  "iki taraf da değiştiyse yerel sessizce kazanır" kuralını taşıyor; B2 yalnız Tanımlar. Liste v2 / kasa v2'ye geçmiş kurulumda bunlar
  satır satır sunucu işlemiyle yazıldığı için etki sınırlı — hangilerinin geçtiği canlı `stk_ayar.liste_tablolari` ile belirlenecek.
- **B3** (yetki) ÖLÇÜLDÜ, DÜZELTİLMEDİ: geçici varsayımlar kaldırıldı, canlı yetki/politika/tetikle hizalı tabanda (`inc_tam`) ölçüldü —
  §5'te B3a (doğrudan tablo) ve B3b (RPC genişliği) ayrı bulgular.
- **Sınanmayan**: eski sekme (sürüm kapısı kapalı) bayat kayıt; site portalı (`portal_giris` konumsal insert); depolama kovalarının
  herkese açık olması (Uygulama, gorseller); Y1'in canlı ölçümü; çok adımlı üretimde ara proses teslimi / hammaddeli reçete ile teslim
  (§7 tek adımlı, reçetesiz ürünle sınandı); tamirde hammadde yeniden çıkışı. (Teslim → geri al → yeniden teslim, kısmi teslim ve tamir
  §7'de sınandı.)
- **Gizli değer tarayıcısı** (`gizli-tara.py`) YARDIMCI kontroldür: bilinen biçimleri (anahtar, jeton, parola ataması, yüksek entropili
  dize, e-posta) yakalar; biçimi tanınmayan bir sır kaçabilir. "Temiz" çıkması "kesinlikle sır yok" demek DEĞİLDİR; canlı metin depoya
  girmeden önce elle de bakılır, ham canlı CSV depoya konmaz.

### Yan bulgu Y1 — `degisiklik` sayacı bütün yazmaları tek satırda sıraya sokuyor (KANITLANDI, B1 sınamasında)
`degisiklik_bump` (deyim düzeyi, her ERP tablosunda) tek `degisiklik.tekil` satırını günceller: açık bir yazma işlemi bitmeden başka HİÇBİR
tabloya yazma tamamlanamaz (b1-sina B-2 ilk denemesi: kilit zaman aşımı `while locking tuple … in relation "degisiklik"`). Veri bozmaz ama
uzun işlemde (ör. büyük `stk_yaz`, ad değişikliği) bütün cihazların yazması bekler; kilitlenme (deadlock) ihtimalini artırır. Öneri: tablo
başına satır ya da sayacı işlem sonunda tek seferde (ayrı karar; canlıda ölçülmedi).

## 5. Atomiklik / tekrar / yanıt kaybı / iptal (yalnız YEREL, canlıyla hizalı taban `inc_ekran_taban`)
Kaynak: ekran sınamalarının (stok, kasa, cari virman) gerçekten gönderdiği 19 `fis_kes` isteği (`KOPRU_KAYIT`) → 15 tekil istek kimliği
(Giriş×5, Çıkış, Gelir×3, Gider×2, Tahsilat, Cari virmanı×3). Her yük atılabilir kopyada (`inc_atom_*`) koşar, iş bitince silinir.
İstemci gerçek kullanıcı yetkisiyle bağlanır: LOGIN rolü `inc_istemci` (süper kullanıcı değil, NOINHERIT) → `SET LOCAL ROLE authenticated`
+ JWT talepleri; her çağrıda `current_user=authenticated`, süper kullanıcı değil denetlenir. Ölçüm ayrı gözlemci bağlantısından.

| Adım | Ne | Sonuç (normal kip) |
|---|---|---|
| N | fişi kes; satır sayıları + bakiye değişti mi | 15/15 — her yükte bakiye gerçekten değişti (ör. kasa K1=1000 / −250 / 400; cari alıcı=33 satıcı=−33) |
| T | yanıt alındıktan sonra aynı istek | 15/15 `zatenVar`, aynı fiş no, sıfır yeni satır |
| Y | **yanıt kaybı**: ilk işlem sunucuda COMMIT, yanıt atılır; aynı istek kimliğiyle yeniden | 15/15 `zatenVar`; fiş/hareket sayısı ilk gönderimdekiyle aynı (ikinci fiş yok) |
| E | aynı isteğin iki eşzamanlı kopyası | 15/15 tek fiş |
| İ | Yönetici iptali kabul; stok, cari bakiye, **kasa Giriş−Çıkış bakiyesi** ve kasa özeti (md5) başlangıçta; ikinci iptal hiçbir kaydı değiştirmez (tam satır özeti) | 15/15 (ör. kasa başlangıç boş → fişli K1=1000 → iptal sonrası boş; stok Siyah/40=5, /41=3 → 0) |
| İ' | fişi kesen silme yetkisiz personel (yük 15, Ayşe) iptal edemez | 42501 "yetkiniz yok (stok: silme)"; 7 tablonun tam satır özeti ve satır sayıları red öncesiyle AYNI; bakiye fişli hâlinde |
| H | yazılan her tabloya AFTER INSERT hata → hiçbir satır kalmamalı | tüm yüklerde tam geri alma |

Toplam: **normal 231 geçti · 0 kaldı · 0 yük atlandı** (`729540b`). (İlk koşuda 1 kalan: iptal fişi kesen personelle denenmişti — iptal ayrı
yetki; düzeltme test beklentisinde, uygulama kodu değişmedi.)

**Bozma kipi** (`BOZMA=1`, yalnız atılabilir kopyalarda): `fis_kes`'in istek kimliği araması (`… where f.istek = v_istek`) `where false`
yapıldı. Sonuç 105 geçti · 31 kaldı — T ve Y'nin `zatenVar` denetimleri beklendiği gibi KIRMIZI (test bozmayı görüyor). İkinci katman: tekil
dizin `stk_fis_istek (istek) WHERE istek IS NOT NULL` ikinci fişi yine engelledi (`duplicate key … "stk_fis_istek"`, fiş sayısı 1); E yeşil.
**Normal taban değişmedi:** şablonun `fis_kes` md5'i koşu başında ve sonunda `d5615b1136ec5b7d8cdd475c2a59543e` (= canlı 25 CSV'deki md5);
normal kipte her kopyanın md5'i şablonla aynı denetlendi; bozuk kopyalar silindi.

İki koruma AYRI değerlendirilir: (1) **istek kimliği araması** — aynı istek önceki sonucu (`zatenVar`, aynı fiş no) hatasız döndürür; istemci
bekleyen yazmayı başarılı sayıp siler. (2) **tekil dizin** — yalnız son savunma: ikinci fişi engeller ama 23505 hatasıyla; arama bozulsaydı
istemci bunu başarısızlık görür, yazma bekleyende kalır ve tekrar dener (veri bozulmaz, kullanıcı hata görür). Normal tabanda (1) çalışıyor.

**Ekran sınamaları (birleşik istemci 1.744.40):** ekran-stok 24/24, ekran-kasa 29/29, ekran-cari-virman 29/29. **ekran-geri-donus-cvr
ATLANDI** — eski istemci (1.744.34) ile yazılmış bir geri dönüş uyumluluğu sınaması; yeni istemciyle koşunca 2 geçti / 7 kaldı, bu sonuç
geçerli sayılmadı. Geri dönüş uyumluluğu yayın paketinde dayanak yapılacaksa 1.744.34 istemcisiyle ayrıca koşulmalı.

**B3b kanıtı (yan sonuç):** yalnız stok yetkili Ayşe Cari virmanı fişi KESEBİLDİ (`fis_kes` "herhangi bir modül" kuralı, G-25 sınıfı).

## 6. Regresyon (kosu.sh, 275 senaryo)
B1 ucu `b282463`: paralel koşuda 274 AYNI + `recete-genis` FARKLI (yalnız `zoom 1.1 → 1`, zamanlama); tek başına yeniden koşunca AYNI → 275/275.
B2 ucu `34377d7` 275/275 · birleşik `af8c2a2` 275/275 (sonraki `a764abb`/`3174e76` yalnız 26-b1 SQL upsert düzeltmesi + b1-sina; istemci kodu değişmedi, kosu.sh yeniden koşulmadı — SQL b1-sina 78/78 ile sınandı).

## 7. Üretim teslimi: geri al, yeniden teslim, kısmi teslim, tamir — çift stok / çift ödeme (yalnız YEREL)
Taban: `inc_ekran_taban` kopyası (canlı 25 yapısı + ekran tohumu), **G-25 nesnesi 0** (sınama başında sayıldı); önceki G-25 sonuçları
KULLANILMADI. İstemci 1.744.40 (birleşik dal), ekrandan (Playwright), gerçek JWT'li `authenticated` (gercek-pg-kopru); ölçüm sunucudan
(mamul stoğu `stk_stok`, personel cari bakiyesi — geçerli satır + geçerli fiş, üretim başına geçerli / iptal ÜRT fişi, atama satırları).
Sınama: `test/inceleme/ekran-uretim-finans.js` · çıktı `test/inceleme/sonuc-ekran-uretim-finans.txt` (`4f1f73f`). Proses ücreti Kesim 35 ₺.
**25 geçti · 4 kaldı** — kalanların hepsi gerçek bulgu (B4, B5); test hatası değil.

| Senaryo | Sonuç |
|---|---|
| S1 tam teslim 10 | ✓ stok 10, usta −350, 1 ÜRT fişi, atama teslim |
| S2 Geri Al | ✓ stok 0, usta 0, fiş iptal, atama yeniden bekliyor |
| S3 yeniden teslim + sayfa yenileme | ✓ stok 10, usta −350 (700 değil), 1 geçerli + 1 iptal; yenilemeden sonra yeniden gönderim yok |
| S4 kısmi 6 + 4 → ikinci parçayı Geri Al → yeniden 4 (çift tıkla) | ✓ her adımda stok / ödeme doğru; kalan 4 yeni atama; çift tık tek fiş |
| S5 sağlam 7 + tamir 3 (başka usta, 5 ₺) → tamir teslimi → Geri Al → yeniden | ✓ tamirdeki 3 stoğa girmedi; tamir teslimiyle girdi; tamirci −15, geri alınca 0, yeniden −15; ilk usta hep −350 (tamir çifti de ödenir — 079 kuralı, işletme kararı; çift ödeme DEĞİL) |
| **S6** iki cihaz, B bayat (yoklama donuk), A teslim aldı, B aynı atamayı teslim aldı | **✗ stok +20, usta −700, 2 geçerli ÜRT fişi** (10'luk iş için) |
| **S7** iki cihaz, yoklama AÇIK, B A'dan hemen sonra basar | **✗ aynı: stok +20, −700, 2 fiş** (8 sn'lik yoklama penceresi) |
| S8 iki cihaz, B 12 sn sonra | ✓ B'nin formu yoklamayla kalktı; ikinci teslim yok |
| **S9** A teslim → B bayat → A Geri Al + yeniden teslim → B eski teslimi Geri Al | **✗ atama satırı "bekliyor"a döndü, üretim "Tamamlandı" ve geçerli ÜRT fişi (stok +10, 350 ₺) kaldı; B'ye "geri alındı" iletisi** — tutarsız |

**B4 — Aynı üretim ataması iki cihazdan teslim alınırsa stok ve işçilik İKİ KEZ yazılır (KANITLANDI, canlıda da oluşabilir).** Öncelik: YÜKSEK.
- Neden: `uretim_atamalari`'nda sürüm sütunu yok; `fis_kes` atamayı `alt_yaz` ile koşulsuz günceller (`tamamlandi_mi` zaten true ise de),
  ÜRT fişinde aynı atamaya ikinci teslimi engelleyen denetim yok. İstemci yalnız kendi belleğine bakıyor; yoklama 8 sn.
- Etki: mamul stoğu fazla görünür, personele iki kez işçilik borçlanılır (cari bakiye), iki ÜRT fişi. Hangisinin yanlış olduğu kayıttan anlaşılmaz.
- Canlıda: `fis_kes` / `alt_yaz` gövdeleri canlıyla aynı (25b md5), atama tablosu aynı → canlıda da açık. G-25'in `isc_odeme` ("her
  atama bir kez") ödemeyi kapatabilir; stoğu kapatıp kapatmadığı ÖLÇÜLMEDİ (G-25 kapsam dışı tutuldu).
**B5 — Bayat cihazın "Geri Al"ı yeni teslimi değil eski (zaten iptal) fişi hedefler, atamayı geri döndürür (KANITLANDI).** Öncelik: ORTA–YÜKSEK.
- `fis_iptal` zaten iptal fişte `zatenIptal` döner (doğru), ama aynı istekteki atama farkı (`tamamlandi_mi=false`) yine yazılır → atama
  "bekliyor", üretim "Tamamlandı", geçerli fiş duruyor. Yeni oturum yeniden teslim SUNMUYOR (kart tamamlandı) — bu yoldan çift stok açılmadı,
  ama kayıtlar tutarsız ve kullanıcıya yanlış "geri alındı" denir.

## 8. B3 — yetki (ÖLÇÜLDÜ, DÜZELTİLMEDİ; açık güvenlik bulguları)
Mevcut üç hesabın üçünün de Yönetici olması bu bulguları KAPATMAZ: B3a jetonu olan listede olmayan HER hesap için geçerli (kayıt yeniden
açılırsa, eski çalışan hesabı, Supabase panelinden açılan hesap); B3b ilk personel hesabı açıldığı an geçerli olur.

**B3a — Doğrudan tablo yazma (REST, RPC'siz).** Canlı yetki / politika / tetikleyicileriyle hizalı tabanda (`inc_tam`) ölçüldü:
- listede OLMAYAN hesap: `urunler` (ad, sürüm), `cariler` (unvan), `tanimlar` (renk adlarını değiştirme ve BÜTÜN renkleri silme) yazabiliyor;
- yalnız stok yetkili personel: `cariler`, `tanimlar` yazabiliyor;
- korunanlar: silme (ürün, sipariş, cari — `silme_koruma`), kullanıcı listesi ve giriş ayarı (`tanimlar_kullanici_koruma`), `siparis_kalemleri`
  (yalnız SELECT yetkisi).
**B3b — RPC yetki genişliği.**
- listede olmayan hesap bütün yazma RPC'lerinde 42501 alıyor (doğru);
- yalnız stok yetkili personel `alt_yaz` ile sipariş kalemi miktarını (999) ve `car_yaz` ile cari hareketini yazabiliyor; `fis_kes` ile Cari
  virmanı fişi KESEBİLDİ (§5, yük 15), iptal edemedi (silme yetkisi yok, 42501 — doğru);
- neden: `stk_yetki` "listelenen modüllerden HERHANGİ birinde kaydetme" kuralı (G-25 sınıfı); ret iletisi her zaman "stok" diyor.

## 9. İlk güvenlik paketi (B1 + B2) — deneme projesi paketi (ONAY BEKLİYOR)
Dal `claude/b1-b2-birlesik`. Sabit commit `c6ee52a`, belge `stok-v2/guvenlik/26-deneme/PAKET-B1-B2-DENEME.md` (son hâli `65afc2f`).
- Deneme projesi ana projenin kopyası sayılmadı. Son ölçülen hâli (G-25 deneme kayıtları): eski G-25 paketi + 25b + tanimlar okuma.
  Yerelde aynı ekler canlıya hizalı tabana kuruldu (`inc_g25`; G-25'in aşama sorgusu "G-25 + 25b"). B1 orada 78/78; ekran B1 / B2 akışları
  geçti. G-25 ücret onayı ad değişikliğinden sonra geçerli kaldı. Kurulumdan önce deneme projesinde salt okur uyum sorgusu
  (`26-deneme-durum-salt-okur.sql`) + G-25 aşama sorgusu çalıştırılacak; "UYUMLU" ve "G-25 + 25b" değilse durulur.
- Kurulum tek ifade (`26-b1-uygula.sql`, üretici `26-b1-uret.py`): Editor parçalasa da atomik; bozma provasında hiçbir şey kalmadı;
  kurulum var olan 18 tablonun hiçbir satırını değiştirmedi (anlık görüntü). Geri alma ayrı dosya, ayrı onay; ad defteri satırları kalır.
- Önceki raporda B2 ekranında sayılan `cakisma ad` birleşik istemcide UYGULANAMAZ (ad değişikliği B1 yolundan gider; karşılığı `ad_yaris`).

## 10. Sonraki düzeltme paketi önerisi (B3 + B4 / B5) — tasarım, henüz kod YOK
Sıra önerisi: **B4/B5 ve B3a birlikte (yalnız sunucu, istemci değişmez), B3b G-25 kararına bağlı.**
1. **B4 / B5 — üretim atamasında durum koşullu yazma (sunucu):** `fis_kes`'te ÜRT fişinin `alt.uretim_atamalari` satırı atamayı
   teslim ALIYORSA (false → true) sunucudaki satır `tamamlandi_mi = false` olmalı; değilse yeni kural kodu ile ret ("bu iş başka cihazdan
   teslim alınmış — ekranı yenileyin"), hiçbir satır yazılmaz. `fis_iptal`'de atama geri döndürme yalnız iptal edilen fiş GEÇERLİYKEN
   (zatenIptal'de atama farkı yazılmaz). İstemci ret iletisini zaten gösterir (kalıcı ret, KR); bekleyen defter tekrar denemez.
   Deneme: `ekran-uretim-finans.js` S6 / S7 / S9 kırmızıdan yeşile (29/0), S1–S5 / S8 değişmeden; bozma provası (koşul kaldırılınca S6
   yeniden kırmızı); `kosu.sh`; atomik sınama (yanıt kaybı / tekrar) ÜRT yükleriyle.
2. **B3a — doğrudan tablo yazmasında liste + modül yetkisi:** `urunler`, `cariler`, `tanimlar` (ve aynı politikayı taşıyan diğer ERP
   tabloları) için yazma politikası `giris_yapmis_hersey` yerine `yetki_var_mi(<modül>, 'kaydetme')`; Tanımlar'da kullanıcı listesi dışındaki
   alanlar `tanimlar` düzenleme. Uygulamanın meşru doğrudan yazmaları (ör. ürün kaydı, Tanımlar PATCH) hangi modül yetkisiyle yapılıyor
   önce envanterlenir — yoksa yetkili personelin işi durur. Deneme: `yetki-api.js` matrisi canlı yetkilerle (listede olmayan → hepsi ret;
   yetkili → bugünkü gibi; yetkisiz modül → ret), ekran sınamaları, `kosu.sh`.
3. **B3b — RPC'de tablo / fiş türüne göre yetki:** "herhangi bir modül" yerine işlem başına modül (sipariş kalemi → sipariş, cari hareketi →
   cari / muhasebe, cari virmanı → cari / muhasebe). G-25 bunun cari / ücret kısmını tasarlıyor; çakışmasın diye G-25 kararından sonra.
   Ret iletisinde gerçek modül adı.
4. Her biri ayrı dal, ayrı deneme paketi (SABİT + önkoşul / sonuç sorgusu + geri alma), önce deneme projesi.

## 11. B4 / B5 ve B3a düzeltmeleri (hazırlık; canlı / deneme / main / yayın YOK)
- **B4 / B5** — dal `claude/b4-uretim-teslim-koruma` (`b3e94ac`; main 1.744.37'den), yalnız sunucu.
  - Belge: `stok-v2/guvenlik/27-b4-PAKET.md`.
  - `fis_kes` içinde: üretim + atama kilidi, atama durumu, kısmi / kalan / tamir miktarı ve adım adı tekilliği denetlenir.
  - `fis_iptal`: zaten iptal fişte fark yazılmaz; bayat geri alma denetlenir. `fis_iptal_toplu` da düzeltildi.
  - Ekran (iki cihaz, istemci 1.744.37): düzeltmesiz 20/14 → düzeltmeyle **34/34**.
  - Sunucu (gerçek yükler, deterministik eşzamanlılık, yanıt kaybı, son adım hatası): düzeltmesiz 22/18 → **40/40**.
  - Bozma: kilit kalkınca 7 kırmızı, denetim kalkınca 13, iptal koruması kalkınca 4; adım adı katmanı tek başına kalkınca yeşil (iki katman bağımsız).
  - G-25'li deneme projesine KURULMAZ: önkoşul FARKLI der.
- **B3a** — dal `claude/b3a-tablo-yazma-yetki` (`b6bb61f`), B4'ten bağımsız. Belge: `stok-v2/guvenlik/28-b3a-PAKET.md`.
  - Yetki matrisi: önce 17 AÇIK → sonra 3. Kalan 3 = B3a-2 (stok personelinin cari / Tanımlar yazması; alan düzeyi kural, ayrı karar).
  - Geri alma matrisi birebir eski hâline döndürüyor.
  - Uygulama regresyonu: stok 24/24 · kasa 29/29 · cari virman 29/29 · B4 + B3a birlikte 34/34 ve 40/40.

## 12. Canlı öncesi ek işler (29 Kasım; canlı / deneme / main / yayın YOK)
- **B4 / B5 öncelikli paket, SQL sabit** (`27-b4-uygula.sql` `f49078f2…`); dal ucu `4e74ce3`.
  - Yayın paketinin kendisiyle (1.744.37, sha `bc6912c2…`): düzeltmesiz 21/14 ve 9/3 → B4 ile **35/35** ve **12/12**; canlıya / G-25 denemesine giden istek 0.
  - İki cihazdan düz "İşi Ver": çift atama oluşmadı (düzeltmesiz de). Atamasız ara proses üzerinden: düzeltmesiz çift fason ödemesi + çift atama; B4 ile kapalı.
  - Adım adı denetimi kapatılınca ara proses senaryosu yeniden kırmızı — denetimin koruduğu durum.
  - Yalıtılmış gerçek-Supabase denemesi: `27-b4-deneme/PAKET-B4-YALITILMIS-DENEME.md`; yapı kaynağı kararı bekliyor (`kurulum_betigi` canlıda yok).
- **İstemci 1.744.41** (dal `claude/geri-al-ileti`): bayat "Geri Al" iletisi; önkoşul B4. Ekran 12/12, kosu 275 AYNI.
- **B3a KISMİ KORUMA**: 3 açık kapanmadı. Alan / işlem yetki haritası `28-b3a-YETKI-HARITASI.md` (dal `claude/b3a-tablo-yazma-yetki`, `8faa4f5`); kararlar bekliyor.

## 13. Yalıtılmış deneme hazırlığı, istemci 1.744.41, yetki haritası, B6 (30 Kasım; canlı / deneme / main / yayın YOK)
- **Yapı dosyası** (yeni boş Supabase projesi için; depoda değil): yerel hizalı kopyadan yalnız şema; geçerli 2. sürüm sha256 `d777fb7e…28819` (ilk sürüm `7510c95a…` geçersiz). "Veri 0" sayımında tek veri satırı olan `stk_ayar` bayrak satırı ayrı gösterilir.
  - Supabase benzeri boş veritabanında kuruldu; canlı 25 dökümüne göre uygulama nesnelerinde fark 0 (ayrıntı `27-b4-deneme/PAKET-B4-YALITILMIS-DENEME.md`).
  - Dökümden kurulan tabanda yayın paketleriyle: 1.744.37 + B4 35/35 ve 12/12; 1.744.41 + B4 35/35 ve 12/12. Gerçek Supabase'de denenmedi.
- **Düz "İşi Ver" neden yazmadan "verildi" diyordu:** ileti yazmadan ÖNCE gösteriliyordu. İkinci cihazın `uretim` satırı sürüm koşullu yazmada 0 satır aldı (çakışma); atama gönderilmedi, bellek geri alındı, turuncu çakışma şeridi çıktı — ama "verildi" iletisi çoktan gösterilmişti. 1.744.41'de ileti yazma sonucuna bağlandı.
- **1.744.41** (dal `claude/geri-al-ileti`): geri almanın sonucu fişten doğrulanır (ara proses dahil); gerçekleşmeyen işlem için başarı iletisi yok.
- **B3a-2 yetki haritası 2. sürüm** (`28-b3a-YETKI-HARITASI.md`, `420cf6f`): kullanıcı kararları işlendi; kural yazılmadı. B3a kısmi koruma; 3 açık duruyor.
- **B6 (AÇIK, yeni kayıt) — ücret verisinin yetkisiz değiştirilmesi:** maaş / aylık saat (`tanimlar.bolumler`), mesai katsayıları, ara proses ücreti, `urunler.proses_ucretleri`, `uretim_atamalari.tamir_ucret` yazma yetkisi olan her hesaba açık. Tasarım G-25'te; bu incelemede açık bulgu.

## 14. B3a-2 yetki paketi + istemci 1.744.42 (27 Kasım; canlı / deneme / main / yayın YOK)
Dal `claude/b3a2-alan-yetki`; belge `29-b3a2-PAKET.md`. B4 / B5 ve 1.744.41 öncelikli; bu paket bağımsız kurulur ve geri alınır.
- **Kural:** sunucu gerçek alan değişikliğine bakar (eski ↔ yeni satır). Satış fiyatı ve müşterinin fiyat grubu → sipariş: düzenleme;
  alış fiyatı / maliyet → muhasebe: düzenleme; müşterinin fiyat grubunu değiştirmek ayrıca cari: düzenleme. Stok personeli ürünün
  fiyat dışındaki alanlarını kaydeder. Tanımlar'da her liste ayrı (ekleme / değiştirme / silme).
- **Sunucu:** `29-b3a2-uygula.sql` sha256 `e67eef17…caef1`, geri alma `8d471fcf…d9c5`. Tek tetikleyici adı (`b3a2_alan_koru`) üç tabloda;
  var olan fonksiyon ve politikaya dokunmaz.
- **İstemci 1.744.42:** fiyat kutuları yetkisizde kapalı; yetkisiz fiyat değişikliği eski değerle gönderilir ve bildirilir.
- **Ölçüm (yerel, canlıya hizalı, G-25'siz):** yetki matrisi 42 durum × 7 hesap — kurulumdan önce 170 uyumlu · 124 AÇIK; sonra
  294 uyumlu · 0 AÇIK · 0 fazla kısıt. Personel ekran sınaması (yalnız stok yetkili hesap + Yönetici) 10/10: reddedilen yazma 0,
  fiyat kutuları kapalı / açık, fiyat dışı alan kaydedildi. Ekran regresyonları 24/24 · 29/29 · 29/29. Geri alma sonrası şema
  kurulum öncesiyle aynı. kosu.sh 275/275 AYNI (paralel koşuda 274 + oynak `recete-genis` tek başına AYNI).
- **Sınamada bulunan ve düzeltilen yanlış retler:** uygulamanın açılışta kendiliğinden yazdığı normalleştirmeler (boş değer dönüşümleri,
  `ek.olusturma`, Tanımlar'a boş listeler ve varsayılan logolu boş firma bilgisi) ilk hâlde yalnız stok yetkili personelin açılışını
  reddediyordu. Yönetici ile koşan sınamalar bunu göstermedi; personel oturumu sınaması bu yüzden eklendi.
- **Durum:** B3a'nın kalan üç açığı bu paket canlıya kurulana kadar AÇIK sayılır. Pakette olmayanlar: B6 (ücret verisi), salt okur
  kullanıcının kişisel tercih tablosu, B3b. Personelin sipariş / üretim / fiş akışları ekrandan uçtan uca koşulmadı. Gerçek
  Supabase'de denenmedi; açığı üretme adımları yalnız yeni, yalıtılmış projede ve DENEME kayıtlarıyla çalıştırılır.
- **İlk Yönetici (yalıtılmış deneme):** publishable anahtar yönetici hesabı oluşturmaz. Hesap Supabase panelinde (Authentication)
  elle açılır, `ilk-yonetici-uygula.sql` SQL Editor'de Tanımlar'a Yönetici kaydını yazar; servis anahtarı hiçbir yere girilmez.

## 4. Sıradaki adımlar (güncel)
1. Kullanıcı onayıyla B1 / B2 deneme paketi (§9) — deneme projesinde salt okur adım 0, sonra kurulum ve elle sınamalar.
2. Sonraki düzeltme paketi (§10) için tasarım onayı: B4 / B5 + B3a; B3b G-25 kararından sonra.
3. Sınanmayan kapsam (§ AÇIK KAPSAM): beden adı değişikliği, diğer tek satırlık tablolar, eski sekme, site portalı, depolama kovaları,
   çok adımlı / hammaddeli teslim.
