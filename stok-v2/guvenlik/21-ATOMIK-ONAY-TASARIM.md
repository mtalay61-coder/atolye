# 21 — Kayıt onayında boşta cari: atomik çözüm TASARIMI (uygulanmadı, onay bekler)

Durum: **yalnız tasarım.** Kod, SQL, test yazılmadı; canlıya hiçbir şey uygulanmadı. Bağlam: `21-SITE-YONETIM-YETKI.md`.

## Sorun

Kayıt onayı iki ayrı yazmadır: (1) ERP yeni cariyi açar (yerel veri + bulut yazma kuyruğu, `tabloYaz("cariler")`), (2)
`site_kayit_onayla(p_id, p_cari_id)` site hesabını kurar ve talebi kapatır. (2), (1)'in buluta ulaşmasını bekler ("Cari bulunamadı"
→ 8 deneme). İkisi tek işlem değil. 21'deki ön kontrol (yetki + talep hâlâ bekliyor + kullanıcı adı boş) (1)'den önce sorar, ama:

- **Yarış:** ön kontrolden sonra başka bir cihaz aynı talebi onaylar / reddederse (2) "Talep bulunamadı ya da işlenmiş" ile düşer,
  (1)'de açılan cari boşta kalır. Senaryo bunu ölçüyor (`senaryo-site-yonetim-yetki`, B "yarış": cari 1).
- **Yarım kalma:** (1)'den sonra tarayıcı kapanır / ağ düşerse (2) hiç çalışmaz; talep bekler, cari boşta kalır. Bugün yeniden
  "Onayla" aynı unvanı bulup bu cariye bağlamayı önerir (unvan eşleşmesine dayanır, garanti değil).

## Seçenek A (önerilen): talebi sunucuda AYIRMA — cari açılmadan önce, cari kimliğiyle

Fikir: (1)'den ÖNCE talep sunucuda tek bir işlemde bu cihaza ve **bu cari kimliğine** bağlanır. Bundan sonra talep yalnız o cari
kimliğiyle onaylanabilir. Böylece açılan her cari, onu bekleyen bir talebe bağlı olur; başka cihaz araya giremez.

### Veritabanı (site-portal.sql + ayrı uygula / geri al dosyaları)

```text
site_kayit_talepleri'ne sütunlar:
  ayrilan_cari_id text      -- ayırmada verilen (henüz açılmamış olabilir) cari kimliği
  ayiran          text      -- auth.jwt()->>'email'
  ayrilma         timestamptz
durum: 'yeni' | 'ayrildi' | 'onaylandi' | 'reddedildi'

site_kayit_ayir(p_id text, p_cari_id text) returns void          -- kapılı (site_yonetici_kapisi ilk ifade)
  select … for update where id = p_id;
  'yeni'                                   → 'ayrildi', ayrilan_cari_id = p_cari_id, ayiran, ayrilma = now()
  'ayrildi' ve ayrilan_cari_id = p_cari_id → yalnız ayrilma tazelenir (aynı cihazın yeniden denemesi)
  'ayrildi' ve başka cari                  → hata 'Talep başka bir onayda ayrılmış (<ayiran>, <ayrilma>)'
  'onaylandi' / 'reddedildi'               → hata 'Talep bulunamadı ya da işlenmiş'
  kullanıcı adı site_hesaplari'nda          → hata 'Bu kullanıcı adı artık kullanılıyor'

site_kayit_onayla(p_id, p_cari_id)  (değişir)
  durum 'ayrildi' VE ayrilan_cari_id = p_cari_id şart (eski 'yeni' yolu kalkar → her onay ayırmadan geçer)
  hesap kurulur, durum 'onaylandi', sifre_ozeti null (bugünkü gibi)

site_kayit_reddet(p_id)  (değişir)
  'ayrildi' talep REDDEDİLEMEZ (hata 'Talep onaylanıyor: <ayrilan_cari_id>') — reddetmek açılmış cariyi boşta bırakırdı.
  Ayrılmış talebi bırakmak için ayrı, açık bir işlem: site_kayit_ayirma_birak(p_id) — yalnız ayrilan_cari_id cariler'de
  YOKSA (cari hiç buluta ulaşmadıysa) 'yeni'ye döner; cari varsa reddeder ("önce onaylayın ya da cariyi silin").

site_kayit_listesi  (değişir)  'ayrildi' talepleri de döndürür + ayrilan_cari_id, ayiran, ayrilma
```

Süre aşımı **yok** (bilinçli): ayırma kendiliğinden düşerse başka cihaz talebi başka cariyle alır ve ilk cari yine boşta kalırdı.
Ayrılmış bir talep ancak o cariyle tamamlanır ya da cari hiç oluşmamışsa açıkça bırakılır.

### ERP (`src/266-site-erisim.jsx`)

1. Onay pencereleri → cari kimliği seçilir (mevcut cari ya da `uid("cari")` ile YENİ kimlik — henüz kaydedilmez).
2. `rpc/site_kayit_ayir(p_id, cariId)` — düşerse hiçbir şey yazılmaz (yetki, işlenmiş talep, alınmış ad, başka ayırma: hepsi burada).
3. Ancak başarılıysa cari açılır (`onSave`), ardından `site_kayit_onayla` (bugünkü "Cari bulunamadı" denemesiyle).
4. Liste `ayrildi` talepleri "onay yarım kaldı — <cari>" diye gösterir; "Tamamla" aynı `ayrilan_cari_id` ile 3'ü yeniden dener
   (cari yerelde yoksa ve bulutta da yoksa önce açar). Reddet düğmesi ayrılmış talepte görünmez.

### Neyi garanti eder, neyi etmez

- Başka cihaz yarışı: **kapanır.** Ayırmadan sonra başka cihazın ayırma / onay / reddi sunucuda reddedilir; ayırma `for update`
  ile tek işlemde olduğu için iki cihazdan yalnız biri kazanır, kaybeden hiçbir şey yazmamıştır.
- Yarım kalma: cari boşta kalmaz, **bekleyen bir talebe bağlı** kalır ve "Tamamla" ile bitirilir. Tam atomik değildir (iki yazma
  hâlâ iki işlem), ama her ara durum görünür ve tamamlanabilir; ret yolu kapalı olduğu için sahipsiz cari üretilemez.
- Cariyi sonradan elle silmek mümkün kalır (ERP silme kuralları); o zaman `site_kayit_ayirma_birak` talebi serbest bırakır.

### İş ve test

- SQL: 3 sütun, 1 yeni + 1 bırakma fonksiyonu, 3 fonksiyon değişikliği; Editor'e dayanıklı tek DO uygula + geri al + durum dosyası
  (16 / 19 kalıbı). Geri alma: 'ayrildi' talep varsa durur.
- Testler: t21'e yarış (iki oturum, `for update` ile eşzamanlı ayırma; biri kazanır), ayrılmış talebin reddi / başka cariyle onayı
  reddedilir, bırakma kuralı; senaryo-site-yonetim-yetki'ye ayırma + yarım kalma + "Tamamla" adımları; t19'un 138 kontrolü yeniden.
- Yayın sırası: önce SQL (eski ERP `site_kayit_onayla`'yı 'yeni' talepte çağırır → yeni kural reddeder) — bu yüzden ya ERP ve SQL
  aynı anda yayınlanır ya da geçiş için `site_kayit_onayla` bir sürüm boyunca 'yeni' talebi de kabul eder (önerilen: geçişli).

## Seçenek B: cariyi SUNUCU açar — tek işlem (gerçek atomiklik)

`site_kayit_onayla_yeni_cari(p_id, p_cari jsonb)`: tek işlemde `cariler`e satır ekler, hesabı kurar, talebi kapatır. Yarış da
yarım kalma da tamamen kalkar. Ancak:
- `cariler` bugün yalnız ERP'nin `tabloYaz` fark yazmasıyla yazılıyor (sütun eşlemesi, `ek` alanı, yazma doğrulaması
  `DOGRULANAN_TABLOLAR`, cari v2 köprüsü). Sunucunun yazdığı satırı her cihazın doğru okuyup **ezmeden / silmeden** benimseyeceği
  doğrulanmadı; yanlışsa cari kaybı ya da çift kayıt riski var.
- Bu yüzden önce ayrı inceleme gerekir: fark yazmasının sunucu kaynaklı satıra davranışı, açık cihazların tazelemesi, eşzamanlı
  cari düzenlemesiyle çakışma. Bu inceleme olmadan önerilmez.

## Öneri

Seçenek A. ERP'nin cari yazma yoluna dokunmadan yarışı kapatır ve yarım kalan onayı görünür / tamamlanabilir yapar. Uygulama için
ayrı onay gerekir (veritabanı değişikliği, canlı SQL, ERP sürümü).
