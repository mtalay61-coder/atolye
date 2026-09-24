# Uygulamayı Storage'dan çalıştırma — kurulum

Kullanıcı (14 Eylül): *"Uygulamayı Storage'dan doğrudan çalıştırmak, bu çok mantıklı."*

Bundan sonra kimseye dosya göndermeyeceksiniz. Herkese **tek bir adres** verilir; o adres her
zaman yayınladığınız son sürümü açar.

---

## Nasıl çalışıyor

- Her sürümün HTML dosyası Storage'a **kendi adıyla** yüklenir: `atolye-erp-v1.279.0.html`,
  `atolye-erp-v1.280.0.html`…
- `baslat.html` küçük bir yönlendirici sayfadır; Supabase'deki `surum` kaydını okur ve yayınlanan
  sürümün dosyasına gider. Herkese verilen adres budur, bir daha değişmez.
- Yeni sürüm yayınlamak = yeni dosyayı yüklemek + Tanımlar'dan sürüm bilgisini güncellemek.

Neden her sürüm ayrı dosya: aynı dosyanın üstüne yazmak tarayıcı **önbelleği** yüzünden
güvenilmez — kullanıcı günlerce eski sürümü görebilir. Adres değişince tarayıcı yeni dosyayı
indirmek zorunda kalır.

---

## Bir kez yapılacaklar

**1. Bucket oluşturun**

Supabase > Storage > **New bucket**
- Ad: `uygulama`
- **Public bucket: AÇIK** (dosyalar giriş yapmadan açılabilmeli; uygulamanın içindeki veri zaten
  ayrıca korunuyor)
- Create

**2. `baslat.html` ve `surum.json` dosyalarını yükleyin**

- Storage > `uygulama` bucket'ı > **Upload file** > `baslat.html` ve `surum.json` (ikisi de aynı
  klasörde olmalı).
- `surum.json` içinde iki satır var; `url` alanını bir sonraki adımda yüklediğiniz uygulama
  dosyasının adresiyle doldurun:

```json
{ "surum": "1.280.0", "url": "https://<proje>.supabase.co/storage/v1/object/public/uygulama/atolye-erp-v1.280.0.html" }
```

  Başlatıcı önce bu dosyaya bakar; bulamazsa veritabanındaki `surum` kaydına düşer. Dosya yolu
  veritabanına hiç bağlanmadığı için yetki/kurulum sorunlarından etkilenmez — **önerilen yol budur.**

**3. Herkese verilecek adresi alın**

`baslat.html` satırına tıklayın > **Copy URL** (ya da "Get URL"). Şuna benzer:

```
https://<proje>.supabase.co/storage/v1/object/public/uygulama/baslat.html
```

Bu adresi ekibe gönderin. Telefonda tarayıcıda açıp **"Ana ekrana ekle"** derlerse uygulama
ikon gibi durur.

---

## Her yeni sürümde (iki adım)

1. **Yükle:** Storage > `uygulama` > Upload file > `atolye-erp-v1.281.0.html` (adı sürümle aynı
   olsun). Dosyaya tıklayıp **Copy URL**.
2. **Yayınla — iki yerden biri (ikisi de olur):**
   - `surum.json`u güncelleyip aynı adla tekrar yükleyin (Upload file > üzerine yaz). Başlatıcı
     bunu okur; kimsenin uygulamaya girmesi gerekmez.
   - ya da uygulamada Tanımlar > Genel > **Sürüm yayınla** > sürüm no + URL > Yayınla. Bu kayıt,
     uygulamanın İÇİNDE duran kullanıcılara "Yeni sürüm · Güncelle" şeridini gösterir.

   En temizi ikisini birlikte yapmak: `surum.json` yeni açanları, veritabanı kaydı da açık
   duranları yönlendirir.

Bu kadar. Ekip bir sonraki açılışta yeni sürümü kullanır; uygulamanın içinde duranlar da üstteki
yeşil şeritten görür.

> Eski sürüm dosyalarını silmeyin: bir sorun çıkarsa Tanımlar'dan eski sürümün URL'sini yayınlayarak
> anında geri dönersiniz.

---

## Sorun: "Sürüm bilgisi alınamadı (HTTP 401)"

Başlatıcı veritabanındaki `surum` tablosuna erişemiyor demektir (tablo kurulmamış ya da yetkisi
kapalı). İki çözüm:
- **Kolay:** `surum.json` dosyasını `baslat.html` ile aynı klasöre koyun (yukarıdaki 2. adım).
  Başlatıcı önce onu okur, veritabanına hiç gitmez.
- **Ya da:** `gorevler.sql` dosyasını Supabase > SQL Editor'de çalıştırın (içinde `surum` tablosu
  var).

> `baslat.html`i telefona İNDİRİP açmayın; Storage'daki adresinden açın. İndirilen dosya
> `content://…` altından çalışır ve bazı telefonlarda ağ istekleri engellenir.

## Bilinmesi gerekenler

- **Çevrimdışı çalışma:** indirilen dosya internetsiz de açılıyordu; Storage'dan çalıştırınca
  uygulamayı açmak için internet gerekir (veri zaten buluttan geliyor, çevrimdışıyken de yerel
  kopya çalışmaya devam eder — ama sayfayı açabilmek için bağlantı şart). İnternetin kesildiği
  yerlerde çalışan bir bilgisayar varsa ona HTML dosyasını indirip bırakın.
- **Adres gizli değildir:** dosya herkese açık. Veri güvenliği dosyada değil, veritabanı
  tarafındadır — `rls-kimlik.sql` (2. aşama) çalıştırıldığında veriye yalnız giriş yapmış
  kullanıcı ulaşır. Storage'dan çalıştırmaya geçtiyseniz o adımı tamamlamak daha da önemli.
- **Kısayol bozulmaz:** `baslat.html` adresi hep aynı kalır; sürüm değişse de kimsenin kısayolu
  güncellemesi gerekmez.
