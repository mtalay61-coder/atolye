# İki koruma: fiş kuralları ve sürüm kapısı — açma planı (4 Kasım; canlıya UYGULANMADI)

İkisi de canlıda **kapalı**. Her adım ayrı onayla; bu belge yalnız hazırlık.

## Önce bilinmesi gereken: iki koruma birbirinden bağımsız değil

`fis_kural_aktif()` = **`fis_aktif` VEYA `min_istemci_surum` dolu** (1.744.3 tasarımı: "minimum sürüm açıkken `fis_aktif=false`
eski hareket kapısını tekrar açmaz"). Sonuç:

| | fiş kuralları | sürüm kapısı |
|---|---|---|
| yalnız `fis_aktif = true` (9) | **açık** | kapalı |
| yalnız `min_istemci_surum = 1.744.7` | **açık** (kapı kuralları da açar) | açık |

Yani "önce sürüm kapısı, sonra fiş kuralları" sırasında ilk adım ikisini **birden** açar; ikinci adım yalnız `fis_aktif`'i kalıcı
yapar. İki **gerçekten ayrı, ayrı ayrı gözlenebilir** adım için sıra: **9 (kurallar) → 10 (kapı)**. Dosyalar bu sırayı zorlar:
10, 9'dan önce çalıştırılırsa durur; 9'un geri alması, kapı açıkken durur.

## Hazırlık kanıtı (yerel, 4 Kasım)

| Ne | Sonuç | Çıktı |
|---|---|---|
| Tarayıcı senaryoları, 1.744.7 paketi, ağ denetimi (`test/kural-provasi.js`, 261 senaryo) | ağa çıkan **12 308 yazmanın hepsi** `x-atolye-surum: 1.744.7` taşıyor; başlıksız 0, başka sürüm 0, hareket tablosuna doğrudan yazma 0, satır taşıyan köprü isteği 0, eski yol hareket yazması 0 | `stok-v2/test/iki-koruma/sonuc-kural-provasi.txt` |
| Gerçek PostgreSQL, **iki koruma birlikte açık** (`stok-v2/test/iki-koruma/kos-iki-koruma.sh`): uygulamanın fiş yolu uçtan uca (satış + peşin tahsilat, iptal, sipariş teslimi, üretim, kasa, eşitleme), gece denetimi, R1 / R1b yarışları, çek (iptal, yarış), kasa / banka hesap koruması, seyrek alt satır, sonlu tutar, toplu iptal, yetki + tekrar, F4 bağ / rezervasyon / yarış, F3 satış sınırı + yarış, F8 renk kilidi + eski fiş, F1.1 / F2 bağ ve teslimli kalem korumaları, sipariş silme | **TEMİZ** (commit 000e48f): kos.sh içi uçtan uca + gece + R1 + R1b, ardından 24 test; korumayı kapatan test 0. Tek kırmızı (t-eski-fis) testin kodu sabit beklemesiydi: kapı açıkken sunucu aynı reddi KR009 ile verir ve kurallar kapatılamaz — test iki kipe göre düzeltildi | `stok-v2/test/iki-koruma/sonuc-iki-koruma.txt` |
| Dayanıklılık, iki koruma açık (`t-dayaniklilik.js`, 43 denetim) | eski istemci (başlıksız / 1.744.6 / bozuk) AT001, satır yok, numara sayacı ilerlemez; eski yol (köprüden hareket ekleme / iptal) red; aynı istek arka arkaya ve iki bağlantıdan aynı anda → tek fiş; 20 eşzamanlı fiş → 20 benzersiz numara, stok = Σ hareket; commit'ten önce kopan bağlantı → hiçbir satır, sayaç geri, yeniden deneme tek fiş; **uygulamanın kendi yolu** yanıtı kaybolan isteği yeniden dener → `zatenVar`, aynı numara, satırlar bir kez, iki denemede de başlık 1.744.7; yarıda hata veren fiş → hiçbir parçası yazılmaz | aynı dosya |
| Açma / doğrulama / geri alma paketleri (`stok-v2/test/guvenlik/t-koruma-paketleri.sh`, canlı benzeri kopya) | 35/35 — sıra koruması, iz koruması, açma + doğrulama, davranış (1.744.7 geçer, başlıksız / 1.744.6 AT001, köprü hareketi red, site girişi çalışır), ters sırayla geri alma, canlının bugünkü hâline dönüş (7-sonra 6/6), Editor uyumu | `stok-v2/test/guvenlik/sonuc-koruma-paketleri.txt` |

**Bilinen sınır (kuralların açılması değiştirmez):** fis_kes ile kesilmemiş bir hareketi (fişsiz ya da eski tip fiş) köprüden
iptal etmek isteyen akış — eski bir üretimi / ürünü silmek gibi — fiş defteri kurulu olduğu için **bugün de** ağa çıkmadan
durdurulur ("fiş kaydını kullanın; yerel kayıt inceleme için korundu"). Provada 3 senaryo (eski tohum verisi) buna takıldı
(12 girişim, hiçbiri ağa çıkmadı). Canlıda böyle satır olup olmadığını `11-eski-hareket-salt-okur.sql` gösterir; varsa ayrı iş.

Normal kip (IKI_KORUMA kapalı) regresyon: `kos-butunluk.sh` çıkış 0, F0 / F2 beklenenle AYNI (commit 000e48f,
`stok-v2/test/iki-koruma/sonuc-butunluk-normal-kip.txt`); beş tarayıcı senaryosu (fis-kes, kasa-islemler, cek-fis-kes,
siparis-iptal, uretim) altınla AYNI.

**Sınamanın bulduğu, koruma değil test düzeneği olan iki durum:** (1) `sinama-gece.sql` alarmları sınamak için kuralları kapatıp
fişsiz satır enjekte eder — kapı açıkken kurallar kapanmadığından reddedildi; bu, kapının kuralları atlatmayı engellediğinin
kanıtı (iki koruma kipinde yalnız o enjeksiyon süresince kapı kapatılır). (2) `t-eski-fis` red kodunu 42501 bekliyordu.

## Adımlar

### Ön koşul (canlı, salt-okur; ikisinden önce)
1. Bütün cihazlarda Tanımlar'da **1.744.7** (kullanıcı). Sunucu, başlık gönderen eski sürümleri (1.743–1.744.6) ayırt edemez;
   kapı açılınca onlar AT001 alır ve "yenileyin" der (veri kaybı yok; yazma olmaz).
2. `5-surum-durum-salt-okur.sql` — son 7 günde başlıksız ERP yazması yok.
3. `11-eski-hareket-salt-okur.sql` — fişsiz / eski fiş satırlarının sayısı (bilgi).
4. Yedek: bağımsız döküm alınmış olmalı (YEDEK-DONUS-PROVASI.md) — kullanıcı önceliği.

### 9 — fiş kuralları
- **Aç:** `9-kurallar-ac.sql` (blok; ön koşul tutmazsa "DUR" der, hiçbir şey değişmez; kilit 5 sn).
- **Doğrula:** `9-sonra-dogrula.sql` → 6 satır `tamam = true`.
- **Elle deneme (uygulamadan, bir cihaz):** küçük bir alış fişi kes → Fişler ekranında görünsün → aynı fişi iptal et; kasa
  tahsilatı + geri al; bir sipariş teslimi + geri al. Hepsi hatasız; kırmızı şerit / "bekleyen kayıt" yok.
- **İzle (ilk gün):** gün sonu raporu "gece denetimi" temiz; uygulamada "Fiş defterinde hareketler bu yoldan değiştirilemez"
  uyarısı görülürse o işlemi not edin (yukarıdaki bilinen sınır).
- **Geri al:** `9-geri-al.sql` (kapı açıksa durur — önce 10-geri-al).

### 10 — sürüm kapısı (9'dan sonra, ayrı gün önerilir)
- **Aç:** `10-surum-kapisi-ac.sql` (9 açık değilse, site istisnası eksikse, bir ERP tablosu kapı dışındaysa ya da son 24 saatte
  başlıksız ERP yazması varsa durur).
- **Doğrula:** `10-sonra-dogrula.sql` → 5 satır `tamam = true`.
- **Elle deneme:** 1.744.7 cihazdan bir kayıt (ör. cari not, küçük fiş) → geçer; site girişi + hesap sayfası → çalışır.
- **Geri al:** `10-geri-al.sql` (kapıyı kapatır; kurallar `fis_aktif` ile açık kalır). Tamamen geri: ardından `9-geri-al.sql`.

## Uygulama tarafı

Uygulama kodu değişmedi (1.744.7 uyumlu). Bu hazırlıktaki değişiklikler yalnız test ve SQL: `test/ortak.js` + `test/kural-provasi.js`
(ağ denetimi), `stok-v2/test/f0/ortak.js` + `uctan-uca-fis.js` (IKI_KORUMA=1 kipinde uygulamanın başlığını oturuma yazar; kip
kapalıyken davranış aynı), `stok-v2/test/kos.sh` (IKI_KORUMA=1 kancası), `stok-v2/test/iki-koruma/*`, `guvenlik/9-*`, `10-*`, `11-*`.
