# Stok v2 — yeniden kurulum planı (onayınıza)

**Durum (28 Ekim 2026, akşam):** yapı, göç ve **uygulama köprüsü (v1.726.0)** hazır.
- **Sınama:** yerel PostgreSQL'de 29 bölüm ve uçtan uca sınama geçti; uçtan uca sınamada uygulamanın gerçek yazma katmanı
  gerçek sunucu işlemine yazdı ve buluttaki stok her adımda ekrandakiyle aynı çıktı (`stok-v2/test/kos.sh`).
- **Supabase:** henüz dokunulmadı. Geçiş tek dosya: `stok-v2/stok-v2-gecis-tek-dosya.sql`.
- **Ayrı deneme göçü yok:** kullanıcı, 28 Ekim: "Dosyaları kopyalamaya gerek yok, zaten deneme verisi." Bu yüzden 1. aşama
  (deneme göçü) atlandı ve köprüye geçildi.

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

**Aşama 1 — deneme göçü: ATLANDI** (veri deneme verisi). Göç, geçişin içinde çalışır ve raporunu döner.

**Aşama 2 — uygulama köprüsü: YAPILDI (v1.726.0, `src/038-stok-v2-kopru.jsx`)**
- **Tek yazma geçidi.** Uygulamanın bütün stok akışları (25'ten fazla kapı) tek bir geçitten yazıyor: bellekteki ürün
  listesinin farkı. Köprü bu farkı tek bir sunucu işlemine (`stk_yaz`) çevirir. Ekranlar ve akışlar değişmedi.
- **Tek işlem, çift yazma yok.** İstek tek işlemde yazılır, ya hepsi ya hiçbiri. Ağda düşüp yeniden gönderilen istek
  stoğu iki kez değiştirmez; bekleyen kayıt defteri aynen çalışır.
- **Renk ve beden kimlikle.** Ad Tanımlar'dan kimliğe çevrilir. Yeniden adlandırma hiçbir stok isteği üretmez: bugün 305
  rengin kodlanması binlerce satır silip yazıyordu.
- **Silinen hareket iptal edilir.** Satır silinmez, iz kalır, stoktan düşer.
- **Okuma değişmedi.** Geçişte bugünkü `varyantlar` / `stok_hareketleri` adları v2'nin görünümüne döner. Uygulama, gün
  sonu raporu ve bulut sayımı değişmeden v2'den okur. Eski sürümde kalmış bir cihaz görünüme yazamaz, hata alır.
- **Geçiş yapılmadıkça** uygulama bugünkü yolda kalır.

**Geçiş (sizin bir adımınız)**
1. v1.726.0 yayında olsun (main'e birleşince 1–2 dk).
2. Supabase › SQL Editor'da `stok-v2/stok-v2-gecis-tek-dosya.sql` dosyasının tamamını çalıştırın. Rapor döner.
3. Açık uygulamaları yenileyin.

Geri dönüş tek komut: `select jsonb_pretty(public.stk_geri_don());`. Eski tablolar v2'nin o anki hâliyle geri gelir;
geçişten sonra girilen fişler kaybolmaz.

**Aşama 2b — cari v2 ve yazma zarfı: YAPILDI (v1.727.0)**
- **Cari hareketleri tek kapıdan.** Cari hareketleri `car_hareket` tablosuna `car_yaz` işlemiyle yazılır. Silinen hareket
  silinmez, iptal edilir.
- **Stok ve cari tek işlemde.** Bir fişin, sipariş sevkinin, üretim tesliminin ve fiş geri almanın stok ve cari satırları
  tek `fis_yaz` isteğiyle gider: biri düşerse hiçbiri yazılmaz.
- **Geçiş:** SQL Editor'da `stok-v2/editor/` altındaki 4–5–6. adımlar.

**Aşama 3 — akışları doğrudan fiş işlemine taşımak** (sonraki)
- **Akışlar `stk_fis_kaydet`'e.** Akışlar (stok fişi, sipariş sevki, üretim teslimi…) farkı değil fişin kendisini
  gönderir; fişin cari satırları da aynı işlemde yazılır.
- **Köprü sadeleşir.** Her taşınan akışla köprü incelir.

**Sonraki modüller** (her biri aynı ilkelerle, sırayla):
1. Cari
2. Sipariş ve rezervasyon
3. Üretim
4. Kasa & Banka: bugün tek satırlık liste, satır satır kayda geçecek
5. Teklif ve fatura

Ürün kartının kendisi (ad, fiyat, reçete, görsel) ürün modülüyle geçer. Ürün silme o zaman "pasife alma" olur.

## 5. Kararlar (önerilerle uygulandı — itiraz ederseniz değişir)

1. **Göç farkı** tek açılış fişiyle kapatılır: stoklar bugünküyle aynı kalır, fark raporda görünür.
2. **Tanımsız eski renkler** "serbest" renk olarak taşınır. Aynı ad Tanımlar'a girince sunucu kendiliğinden bağlar,
   elle işe gerek kalmaz.
3. **İptal edilen fiş ve satır silinmez,** iptal işaretlenir; iz kalır.
4. **Fiş iptal yetkisi:** köprüde silme de bugünkü gibi ekranın yetki kuralıyla yürür; sunucu "kaydetme" yetkisi ister.
   Doğrudan fiş iptali (`stk_fis_iptal`, Aşama 3) "silme" yetkisi ister.
5. **Fişin cari satırları** stokla aynı işlemde yazılacak: Aşama 3.

---

### Dosyalar

| Dosya | İçerik |
|---|---|
| `stok-v2/stok-v2.sql` | Tablolar, aynalama, işlemler, güvenlik. Tekrar çalıştırmak zararsız. |
| `stok-v2/stok-v2-goc.sql` | Göç, karşılaştırma, geçiş (`stk_gecis`) ve geri dönüş (`stk_geri_don`). |
| `stok-v2/stok-v2-gecis-tek-dosya.sql` | ÜRETİLİR (`stok-v2/tek-dosya.sh`): ikisi + geçiş, tek yapıştırma. |
| `src/038-stok-v2-kopru.jsx` | Uygulama köprüsü (v1.726.0). |
| `stok-v2/test/` | Yerel sınama: Supabase taklidi, bugünkü tabloların taklidi ve zor durumları içeren örnek veri, `sinama.sql`, `sinama-gecis.sql`, `uctan-uca.js`, `kos.sh`. |
