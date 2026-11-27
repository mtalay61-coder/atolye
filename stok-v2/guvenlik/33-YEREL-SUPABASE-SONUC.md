# Yerel Supabase sınaması — sonuç (27 Kasım 2026)

Buluttaki hiçbir projeye bağlanılmadı: canlıya, mevcut G-25 deneme projesine, main'e ve yayına dokunulmadı. Üçüncü bulut projesi
açılmadı. Ortam: çalışma ortamında Docker + Supabase CLI ile **yerel Supabase** (gerçek Postgres, gerçek Auth, gerçek API geçidi).

**Bu ortam buluttaki Supabase ile birebir aynı DEĞİLDİR** — farklar en altta.

## Ne sınandı, hangi dosyalarla

Paket: dal `claude/aday-birlesik`, commit `4904a7e` (sabit). Sınama düzeneği: dal `claude/yerel-supabase`; `4904a7e`'ye göre `stok-v2/`,
`src/` ve istemci HTML'lerinde fark **0 satır** (yalnız `test/` değişti).

| Dosya | SHA-256 |
|---|---|
| Yapı (yalnız şema; depoda değil) `b4-deneme-yapi.sql` | `d777fb7ebcffa21ba57843f10fe306a21cbb8ca64eed4d6eb14a92c3ce328819` |
| `27-b4-onkosul-salt-okur.sql` | `76c5c3c4c4194db10bc61c68f367aef9964d280bc5b9ec8406620653140f1bba` |
| `27-b4-uygula.sql` / `27-b4-geri-al.sql` | `f49078f2361e8546d59e6a0b9c5d52e0ace6474c47663ef2615478e2b327645d` / `940c40262bf141d35093d999c30195e098ac730d21b2f9483636c0bb8c1036af` |
| `28-b3a-uygula.sql` / `28-b3a-geri-al.sql` | `15f1051d5c9f652ac99d091fb329aea67ef35ef10adb82fee1cbe31ba3d38250` / `c015689afb9f2c3436878c9a15e697f2800b4f72f90ab43bcf478c9b3a40ef3f` |
| `29-b3a2-uygula.sql` / `29-b3a2-geri-al.sql` | `ec3df68d922ba5d49e1f5b95bd795c4ff1982bd89472681a8c75df816a12986f` / `8d471fcf8c5847ecca808f148c1dfb4a95becfc8faa95bc0aa89ec862be1d9c5` |
| `31-yetki-ileti-uygula.sql` / `31-yetki-ileti-geri-al.sql` | `b3a48e5ab1461d9c6b18aec8f925e38769b1e57684bfdf48facbb40c1724acaf` / `661d831a03be7bace5e525e004a6e9b57f9135c2c76ed9aae9b9124586952ec0` |
| İstemci adayı `atolye-erp-v1.744.44.html` | `b87afc137406202b5e6180c3b97f31139581d3e79238eda51b0cb4252418a7e8` |
| Yayındaki istemci `atolye-erp-v1.744.37.html` | `bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a` |

Yığın: Supabase CLI 3.4.0 · `supabase/postgres` 17.12.0.002 · PostgREST v16.6 · GoTrue v2.198.0 · Kong 2.8.1.
Veri: şirket verisi yok. Sınama tohumu `test/sb/tohum-veri.sql` (Ekran Bot, İnceleme Müşteri, Ali / Ayşe). Auth hesapları yerel
GoTrue'da açıldı (12 sınama hesabı, `@atolye.local`); giriş ekrandan kullanıcı adı + şifreyle, jeton GoTrue'nun imzaladığı JWT.

## 1. Kurulum ve geri alma (`postgres` rolü — bulutta olduğu gibi süper kullanıcı DEĞİL)

| Adım | Sonuç |
|---|---|
| Yapı dosyası, boş `public` şemasına | tablo 44 · görünüm 18 · fonksiyon 115 · tetikleyici 117 · politika 36 · `stk_ayar` 1 · diğer veri 0 |
| B4 önkoşul sorgusu | `GENEL: HAZIR` |
| Dört kurulum dosyası sırayla | `UYGULANMIŞ` · `KURULU` · `KURULU` · `KURULU` |
| Aynı dört dosya ikinci kez (tekrar Run) | aynı sonuç, hata yok |
| Dört geri alma dosyası ters sırayla | `KURULU DEĞİL` · `KURULU DEĞİL` · `GERİ ALINDI` · önkoşul yeniden `HAZIR` |
| Geri almadan sonra fonksiyon gövdeleri + tetikleyiciler ↔ canlıya hizalı kopya | **fark 0** (232 satır) |
| Yeniden kurulum ↔ yerel dört paketli kopya | **fark 0** |

## 2. Ekran sınamaları — gerçek giriş, gerçek API (dört paket kurulu)

| Sınama | İstemci | Sonuç |
|---|---|---|
| `ekran-uretim-b4.js` — iki cihazdan eşzamanlı tam / kısmi teslim, tamir, bayat Geri Al, yanıt kaybı, son adımda hata | 1.744.44 | **34 / 34** (iki tam koşu) |
| `ekran-uretim-b4-ver.js` — iki cihazdan İşi Ver, atamasız ara proses | 1.744.44 | **11 / 11** |
| `ekran-geri-al-ileti.js` — gerçekleşmeyen geri alma için başarı iletisi yok | 1.744.44 | **20 / 20** |
| `ekran-personel-akis.js` — 6 hesap; stok, sipariş, tahsilat, tam / kısmi / tamir / hammaddeli teslim; iptal yetkisi olan ve olmayan ayrı; 13 yetkisiz deneme | 1.744.44 | **118 / 118** |
| `ekran-b3a2-personel.js` | 1.744.44 | **10 / 10** |
| `ekran-gecis-1744-37.js` — açık kalmış eski sekme | **1.744.37** (yayın paketi) | **61 geçti · 9 kaldı** (aşağıda) |

Sonuç dosyaları: `test/inceleme/sonuc-sb/`.

### Eşzamanlı teslim (gerçek API)
İki cihaz aynı anda tam teslim: tek ÜRT fişi, mamul +10, usta −350; ikinci cihaz "Bu iş başka cihazda zaten teslim alınmış … [KR030]".
İki cihaz aynı anda kısmi (6 / 6): tek kısmi teslim (+6 / −210), kalan 4 tek atamada. Fazla stok ya da çift işçilik oluşmadı.

### Yanıt kaybı ve tekrar (T6; istek kaydıyla)
| Olay | Kanıt |
|---|---|
| İlk teslim isteği sunucuda TAMAMLANDI, yanıtı düşürüldü | `rpc/fis_kes` istek `fis-mwyx4hy6-7a77` → sunucu HTTP 200; `stk_fis`'te `ÜRT-261127009` bu istek kimliğiyle; mamul +10, usta −350 |
| İstemcinin aynı kimlikle otomatik yeniden denemeleri | sınama bunları ağa ÇIKARMADI (kesildi) — bu akışta aynı kimlik sunucuya ikinci kez ulaşmadı; ikinci fiş yok |
| Aynı istek ağda İKİ KEZ sunucuya ulaştı (T6e) | `rpc/fis_kes` istek `fis-mwyx5hhs-14ky` iki kez, ikisi de HTTP 200 → `stk_fis`'te TEK satır `ÜRT-261127010` |
| Kayıtlı iki isteğin sonradan AYNI kimlikle yeniden gönderilmesi (gerçek API, gerçek oturum) | ikisi de HTTP 200, `zatenVar: true`, aynı fiş no; fiş sayısı önce / sonra aynı (1 geçerli / 1 iptal) |
| Geri Al'ın yanıtı düştü, kullanıcı yeniden Geri Al | defterler başlangıçta, atama "bekliyor"; ikinci Geri Al değişiklik yapmadı |

Açık nokta: "yanıt kaybından sonra aynı kimliğin istemci tarafından kendiliğinden sunucuya ulaşması" tek akışta ekrandan ölçülmedi
(sınama tekrarları kesiyor); aynı kimliğin sunucuya ikinci kez ulaşması T6e ve doğrudan yeniden gönderimle gösterildi.

### Personel yetkileri (gerçek jetonla)
- Yalnız stok yetkili hesap: satış fiyatı → **HTTP 400 · KR040** "… (gereken: sipariş: düzenleme)"; fiş iptali → **HTTP 403 · 42501**
  "Bu işlem için yetkiniz yok: fiş iptali (gereken: stok, fişler, sipariş, üretim, cari, muhasebe modüllerinden birinde silme)".
- 13 yetkisiz denemenin hepsi reddedildi, satırlar değişmedi; izinli iki fiyat yazması geçti; yetkili akışlarda reddedilen yazma 0.
- Silme yetkisi olmayan üretim / muhasebe hesabında Geri Al / Sil düğmesi yok; doğrudan istek reddedildi. Silme yetkili hesaplar iptal etti.

### Açık kalmış 1.744.37 sekmesi (9 kalan kontrol — köprü sınamasındakiyle AYNI dokuz)
Meşru kayıtlar reddedilmedi (açılış, paketler sekme açıkken kurulup yenilemeden ürün kaydı, fiyat dışı alan, Yönetici fiyatı, stok
girişi). Eski istemci korumayı aşamadı (fiyat sunucuda değişmedi). Yeniden gönderim yok; şeritte sunucunun iletisi okunuyor.
Kalan dokuz, eski istemcinin kalıcı ret gösterimidir (PAKET değil, yayındaki istemcinin davranışı): kayıt anında "Ürün güncellendi" /
"kaydedildi" bildirimi, reddedilen değerin o cihazda görünmeye devam etmesi (yenilemeden sonra da), ret nedeninin bildirimde değil
şerit ayrıntısında olması.

## 3. Paket kaynaklı hata — test düzeneği hatası

**Paket kaynaklı hata: bulunmadı.** Bu ortamda dört SQL dosyasında ve 1.744.44'te değişiklik gerektiren bir sonuç çıkmadı.

**Test düzeneği sorunları (yalnız `test/` altında ve yerel yığın ayarında düzeltildi; pakete girmedi):**
1. Yerel Auth giriş hız sınırı (5 dakikada 30 giriş): sınamalar dakikalar içinde onlarca kez giriş yaptığı için oturum açılamadı →
   yalnız yerel yığının `config.jsonc` ayarında yükseltildi. İlk iki koşu bu yüzden yarıda kaldı; sayılmadı.
2. Yenileme sonrası bekleme koşulu: menü bir an çizilip sonra giriş ekranı geliyor; gerçek API daha yavaş olduğu için döngü erken
   çıkıyordu → `ortak-ekran.js` `uretimMenusuHazir` / `yuklenmeyiBekle`.
3. Yanıt kaybı müdahalesi: sahte istek nesnesinde gövde yöntemi eksikti, ilk istek sunucuya gövdesiz gidiyordu → köprünün gerçek API kipi.
4. Giriş öncesi (anon) istekler: uygulama giriş ekranında `rpc/site_kayit_listesi` çağırıyor, anon'a kapalı (401). Paketlerle
   ilgisi yok (yetkiler canlıya hizalı kopyayla aynı); "reddedilen yazma" sayımından ayrıldı.
5. Sınamaların beklentileri: sahte jeton denetimi → JWT e-postası; geçiş sınamasında paket sayısı 3 → 4.

Bu değişikliklerden sonra köprü kipinde (eski düzen) iki sınama yeniden koşuldu: 20 / 20 ve 11 / 11.

## 4. Bu ortamda YAPILMAYANLAR ve buluttan farklar

Yapılmayanlar:
- Yetki matrisleri (`b3a2-matris.js`, `b3a-sina.sh`) ve `b4-sunucu-sina.js` yerel Supabase'de koşulmadı (her durum için veritabanı
  kopyası istiyorlar; yerel PostgreSQL 16'daki sonuçları geçerli: 448 / 0 açık — yalnız B3a-2 matrisinin kapsamı —, 0 açık, 40 / 40).
- Kurulum dosyaları `psql` ile çalıştırıldı; Supabase SQL Editor'ün dosyayı nasıl gönderdiği (parçalama, boyut sınırı) ÖLÇÜLMEDİ.
- Fişler menüsü, ürün kartı hareketleri ve çeklerdeki düğme gizlemesi ekrandan sınanmadı.

Buluttaki projeden farklar:
- Postgres sürümü: yerel 17.12; canlının sürümü doğrulanmadı. PostgREST / GoTrue / Kong sürümleri canlıdakiyle aynı olmayabilir.
- Auth ayarları yerel varsayılan (+ yeni kayıt kapalı, hız sınırı yükseltilmiş); canlının Auth ayarları, e-posta doğrulaması, oturum
  süresi karşılaştırılmadı.
- Veri: yalnız sınama tohumu. Canlı verinin hacmi, eski kayıt biçimleri ve gerçek kullanıcı listesi yok.
- Ağ: tarayıcı API'ye sınama köprüsü üzerinden yerel adrese gitti (gömülü proje anahtarı yerel anahtarla değiştirildi); TLS, gerçek
  alan adı, CDN, bağlantı havuzu (Supavisor), Realtime, Storage, Edge Functions bu yığında kapalıydı.
- Platform farkları: buluttaki `postgres` rolünün tam yetki kümesi, uzantı sürümleri, yedekleme ve zaman aşımları doğrulanmadı.
- Canlıdaki fonksiyon gövdeleri: yerel kopya son alınan canlı dökümüne hizalı; canlı o dökümden sonra değiştiyse önkoşul sorgusu söyler.
