# Stok v2 — yeniden kurulum planı (onayınıza)

**Durum (28 Ekim 2026):** veritabanı yapısı, sunucu işlemleri ve veri göçü yazıldı. Yerel bir PostgreSQL'de, bugünkü
verinin biçimiyle sınandı: 16 bölüm, hepsi geçti (`stok-v2/test/kos.sh`). **Supabase'e hiçbir şey dokunmadı.**
Uygulama da değişmedi. Bir sonraki adım sizin onayınızla başlıyor.

Karar (sizin): *"Modül modül kuralım, veriyi taşı, stokla başla."*

---

## 1. Bugün neden bozuluyor?

Yaşadığımız hatalar beş yapısal sorundan çıkıyor. Yamayla kapanmıyorlar:

| Sorun | Sonuç |
|---|---|
| Bir fiş 6–7 **ayrı** istekle yazılıyor: stok, cari, sipariş, koli, kasa, fiş defteri | Biri düşerse fiş yarım kalıyor: stok düşmüş, cari yazılmamış. |
| Cihaz bütün listeyi bellekte tutup buluta "farkı" gönderiyor | Eski listeli cihaz, başkasının yeni kaydını silebiliyor (kaybolan teklif, boşalan Kasa & Banka). |
| Varyant renk ve beden **adıyla** tutuluyor | Bir renk adı değişince yüzlerce satır silinip yeniden yazılıyor. Ağda düşen bu yazma "Failed to fetch" diye takılı kaldı. |
| Stok miktarı ayrıca saklanıyor | Miktar hareket toplamından ayrışabiliyor. Bakım'daki "Defter onarımı" ve "açılış farkı" bunun için var. |
| "Fiş" diye gerçek bir kayıt yok | Fiş, aynı numarayı taşıyan hareketlerin grubu. Fiş defteri ayrıca tek satırlık bir liste olarak tutuluyor. |

## 2. Yeni yapı — dört ilke

1. **Kimlik.** Renk, ölçü, varyant, fiş ve hareket birbirine kimlikle bağlanır. Bir rengin adını değiştirmek **tek
   satırlık** bir güncellemedir: hiçbir stok satırı yeniden yazılmaz.
2. **Fiş gerçek bir kayıt.** `stk_fis` fişin başlığı, `stk_hareket` satırlarıdır. Fişsiz hareket yazılamaz; bunu
   artık veritabanının kendisi engeller.
3. **Stok tek kaynaktan.** Miktar saklanmaz: stok, iptal edilmemiş hareketlerin toplamıdır (`stk_stok`). Bu yüzden
   "eksi stok kırpılmaz" ve "hareketsiz stok olmaz" kuralları kendiliğinden doğru kalır, onarıma gerek kalmaz.
4. **Yazma yalnız sunucu işlemiyle.** Uygulama tablolara doğrudan yazamaz, yalnız okur.
   - Fiş kaydı tek bir veritabanı işlemidir: ya hepsi yazılır ya hiçbiri.
   - Fiş numarasını uygulama üretir. Ağda düşüp yeniden gönderilen fiş **ikinci kez yazılmaz**; sunucu "zaten var" der.
     Bekleyen kayıt defteri böylece güvenle yeniden deneyebilir.

### Tablolar

| Tablo | İçerik |
|---|---|
| `stk_renk` | Hammadde renkleri ve model renkleri ("1058 - Taba/Siyah"). Tanımlar'dan kendiliğinden aynalanır. |
| `stk_olcu` | Bedenler ve boyutlar. Bunlar da Tanımlar'dan aynalanır. |
| `stk_varyant` | Ürün × renk × ölçü. İçinde miktar yoktur, yalnız minimum stok tutulur. |
| `stk_fis` | Fiş başlığı: tür, tarih, cari, sipariş, kullanıcı. İptal edilen fiş silinmez, iz kalır. |
| `stk_hareket` | Fiş satırı. Miktar işaretlidir: + giriş, − çıkış. |
| `stk_stok` (görünüm) | Güncel stok. |

### Sunucu işlemleri

| İşlem | Ne yapar |
|---|---|
| `stk_fis_kaydet` | Fişi bütün satırlarıyla kaydeder ve etkilenen stokları döner, böylece ekran yeniden okumadan güncellenir. Satırlardan biri hatalıysa (ör. olmayan ürün) hiçbir şey yazılmaz. |
| `stk_fis_iptal` | Bugünkü "fiş geri al". Fiş silinmez, stoktan düşer. |
| `stk_varyant_ac` | Ürün kartına renk/ölçü ekler. |
| `stk_varyant_kaldir` | Stoğu olan varyantı kaldırmaz. Geçmişi varsa siler değil pasife alır. |
| `stk_min_stok` | Minimum stoğu yazar. |

**Yetki:** Tanımlar › Kullanıcılar'daki yetki artık sunucuda da işler.
- Fiş kaydetmek için stok, fiş, sipariş ya da üretim modüllerinden birinde **kaydetme** yetkisi gerekir.
- Fiş iptali **silme** yetkisi ister.
- Yönetici her şeyi yapabilir.

## 3. Veri göçü

`stk_goc()` bugünkü tabloları **yalnız okur**, hiçbirine yazmaz. Sonunda bir rapor döner:

| Bugünkü durum | Göçte ne olur |
|---|---|
| Renk adı tanımla eşleşiyor | Tanımdaki renge bağlanır. Varyantta kalmış bayat renk kimliğine güvenilmez, ada bakılır. Büyük/küçük harf farkı önemsenmez. |
| Renk/beden adı tanımda yok (ör. eski bir renk) | "Serbest" renk/ölçü olarak taşınır ve raporda listelenir. Sonra Bakım'da tanımlı renge bağlanabilir. |
| Fiş numarası olmayan eski hareket | Kendi fişini alır (`ESKI-…`). |
| Fiş defterinde iptal edilmiş fiş | Satırlarıyla taşınır, stoğa sayılmaz. |
| Ekranda görünen miktar hareket toplamından farklı | Fark **tek bir açılış fişiyle** kapatılır (`GOC-ACILIS-tarih`) ve satır satır raporlanır. Böylece geçişten sonra her ürünün stoğu bugün ekranda gördüğünüzle **aynı** kalır. |
| Ürünü silinmiş hareket/varyant; sıfır miktarlı hareket | Atlanır, raporda listelenir. |

Doğrulama için `stk_goc_karsilastir()` ürün × renk × ölçü bazında eski ve yeni stoğu yan yana koyar; fark 0 olmalı.
Göç, geçiş gününe kadar istendiği kadar yeniden çalıştırılabilir. Uygulama v2'ye yazmaya başladıktan sonra kendini
kilitler; yeni kayıtları silemez.

## 4. Aşamalar

**Aşama 1 — kurulum ve deneme göçü (risk yok)**
- Siz Supabase › SQL Editor'da `stok-v2.sql` ve `stok-v2-goc.sql` dosyalarını, ardından `select jsonb_pretty(stk_goc());`
  komutunu çalıştırırsınız. Rapor bana gelir.
- Bugünkü tablolara dokunulmaz. Uygulama aynen çalışır.
- Tanımlar'a eklenen aynalama tetikleyicisi hata verse bile Tanımlar kaydını düşürmez; bu da sınandı.
- Raporu birlikte inceleriz: serbest renkler, fark satırları, tutarsız iptaller.

**Aşama 2 — uygulamanın stok katmanı v2'ye**

Bu aşamada stok yazan bütün yollar tek bir işleme bağlanır: stok fişi, sipariş gerçekleştirme/sevk, üretim teslim/ver,
numune, bağımsız stok girişi, açılış, fiş geri al.
- **Fişin cari satırları aynı işlemde.** Fişin cari satırları da aynı veritabanı işleminde yazılır (bugünkü cari
  tablosuna); stok düşüp cari yazılmaması biter.
- **Okuma ve canlı izleme.** Ekran stoğu `stk_stok`'tan okur. Başka cihazın yazdığı, değişiklik sayacıyla birkaç saniyede
  görünür.
- **Korumalar aynen kalır.** Çevrimdışı kilit ve bekleyen kayıt defteri sürer. Düşen fiş aynı numarayla yeniden
  gönderilir ve sunucu çift yazmaz.
- **Önce testte.** Bütün bunlar önce test ortamında, bugünkü senaryo testleriyle sınanır.

**Aşama 3 — geçiş günü**
1. Göç son kez çalıştırılır.
2. Yeni sürüm yayınlanır.
3. Eski stok tabloları **silinmez**, yalnız artık yazılmaz.
4. Geri dönüş için v2 hareketlerini eski biçime aktaran bir işlem hazır bekler.
5. Bir hafta iki taraf karşılaştırılır.

**Sonraki modüller** (her biri aynı ilkelerle, sırayla):
1. Cari
2. Sipariş ve rezervasyon
3. Üretim
4. Kasa & Banka: bugün tek satırlık liste, satır satır kayda geçecek
5. Teklif ve fatura

Ürün kartının kendisi (ad, fiyat, reçete, görsel) ürün modülüyle geçer. Ürün silme o zaman "pasife alma" olur.

## 5. Onayınızı istediğim kararlar

1. **Göç farkı:** kayıtlı miktar ile hareket toplamı arasındaki fark, tek bir açılış fişiyle kapatılsın mı?
   *Önerim: evet. Stoklar bugünküyle aynı kalır, fark raporda görünür.*
2. **Tanımsız eski renkler** "serbest" renk olarak taşınsın, sonra Bakım'dan tanımlı renklere bağlansın mı?
   *Önerim: evet.*
3. **Fiş iptali** fişi silmesin, iptal işaretlesin; iz kalsın mı? *Önerim: evet.*
4. **Fiş iptal yetkisi:** fiş iptali için "silme" yetkisi istensin mi? *Önerim: evet.* Bugün bazı kullanıcılar fiş
   geri alabiliyorsa, onlara Tanımlar › Kullanıcılar'dan silme yetkisi verilir.
5. **Fişin cari satırları** stokla aynı işlemde yazılsın mı (Aşama 2)? *Önerim: evet.*

Onay verirseniz Aşama 1 için çalıştıracağınız iki dosyayı kopyalanacak biçimde veririm.

---

### Dosyalar

| Dosya | İçerik |
|---|---|
| `stok-v2/stok-v2.sql` | Tablolar, aynalama, işlemler, güvenlik. Tekrar çalıştırmak zararsız. |
| `stok-v2/stok-v2-goc.sql` | Göç ve karşılaştırma. |
| `stok-v2/test/` | Yerel sınama: Supabase taklidi, bugünkü tabloların taklidi ve zor durumları içeren örnek veri, `sinama.sql`, `kos.sh`. |
