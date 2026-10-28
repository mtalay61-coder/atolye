Atölye ERP'nin bütün ekranları bu kurallarla kurulur. Hiçbir ekran kendi düğmesini, kendi tablosunu ya da kendi rengini icat etmez: önce buradaki kalıplardan biri seçilir (bkz. **Ekran kalıpları**), içine buradaki bileşenler konur. Kalıba uymayan bir ihtiyaç çıkarsa önce bu sistem değişir, sonra ekran.

Kaynak: kullanıcının ERP arayüz standardı (`erp-tokens.css`, `erp-icons.svg`) ve eski uygulamada sonradan verilen kararlar (köşeler yuvarlak, gölge yok, bildirim sol altta "Geri al" ile, silme onayı pencereyle, Excel ve yazdırma ekrandaki tablonun aynısı).

## Dil ve metin

- Arayüz Türkçedir, kullanıcıya "sen" denmez; düğmeler fiil kipindedir: **Kaydet**, **Sil**, **Siparişe çevir**. "Tamam", "Evet", "Gönder" gibi ne yaptığını söylemeyen düğme yoktur.
- Düğme ile bildirim aynı fiili kullanır: Kaydet → "Kaydedildi", Sil → "Silindi".
- Hata metni neyin olmadığını ve ne yapılacağını söyler: "Kaydedilemedi: internet bağlantısı yok. Bağlantı gelince yeniden dene." Özür ve "bir hata oluştu" yazılmaz.
- Pasif düğmenin `title`'ı nedenini yazar: "Önce cari ve en az bir kalem gerekli".
- Para `1.240,00 ₺`, miktar `12`, tarih `28.10.2026`, saat `14:05` biçimindedir. Sayılar sağa yaslanır ve `font-variant-numeric: tabular-nums` kullanır.
- "Standart" renk ve beden ekranda yazılmaz; hücre boş kalır, başlık "Miktar" olur. Kayıtta değer durur.
- Emoji arayüzde kullanılmaz; ikon yalnız `assets/Ikonlar` setinden gelir.

## Renk

- Tek aksiyon rengi `erp-accent` (kırmızı). Bir ekranda **en çok bir dolu kırmızı düğme** olur: liste ekranında **Yeni**, form ve kartta düzenleme sırasında **Kaydet**, onay penceresinde **Sil**.
- Küçük kırmızı yazı `erp-accent` ile değil `erp-accent-press` ile yazılır; `erp-accent` sayfa zemininde 4,5:1'i tutmaz.
- Yazılı dolu düğmenin zemini `erp-accent-hover`, yazısı `erp-on-accent`'tir (4,74:1). Yalnız ikonlu birincil düğme `erp-accent` zeminde durabilir.
- Durum renkleri yalnız durum anlatır: `erp-ok` tamam, `erp-wait` bekliyor, `erp-info` bilgi/taslak, `erp-idle` pasif, `erp-void` iptal/hata/eksi. Her durum renkle birlikte **ikon ve kelime** taşır; renk tek başına anlam taşımaz.
- `erp-text-3` yalnız ipucu yazısı, pasif metin ve giriş kutusu çerçevesidir; asıl bilgi onunla yazılmaz.
- Zemin katmanları: `erp-page` sayfa → `erp-panel` kart ve tablo → `erp-zebra`/`erp-hover`/`erp-accent-tint` satır durumları. Yan menü ve bildirim koyu `erp-shell` zeminindedir.
- Kayda yazılan renk (ürün renginin kodu, kullanıcının seçtiği etiket rengi) veri olarak hex saklanır; token adı veriye yazılmaz.
- Şimdilik tek tema vardır: Açık.

## Yazı

- Tek yazı ailesi Archivo (`sans`). Ekran başına bir `baslik-sayfa`; kart ve pencerelerde `baslik-kart`; geri kalan her şey `govde`.
- Tablo sütun başlıkları ve form etiketleri `etiket` stilinde, BÜYÜK HARF, 0,06em aralıklıdır.
- Yazı küçültülerek sığdırılmaz; sığmayan alan sarılır ya da tablo kendi içinde yana kayar.

## Boyut, boşluk, köşe, gölge

- Masaüstü ölçüleri `erp-toolbar-h` 44, `erp-row-h` 30, `erp-icon-btn` 30, `erp-icon` 16. **720px altında** hepsi parmak ölçüsüne çıkar: `erp-toolbar-h-dokunma` 52, `erp-row-h-dokunma` 44, `erp-icon-btn-dokunma` 44, `erp-icon-dokunma` 18.
- Boşluklar yalnız `erp-gap-1`…`erp-gap-5` adımlarıdır (4, 8, 12, 16, 24).
- Köşeler yuvarlaktır (kullanıcı kararı; standarttaki 0px bilerek uygulanmaz): `erp-r-sm` küçük kontroller, `erp-r-md` panel ve kart, `erp-r-lg` pencere, `erp-r-pill` hap.
- **Gölge yok.** Katmanlar 1px `erp-line` çizgiyle ayrılır. Yalnız onay penceresi ve çekmece perdeyle öne çıkar.
- Form alanları ekrana yayılmaz, içerik kadar sabit genişliktedir: ürün 190, renk 130, ölçü 130, fiyat 120, tarih 150, fiş no 160, ödeme şekli 140 px. Dar ekranda alt satıra sarar.

## Düğmeler ve kısayollar

- Bütün aksiyonlar **araç çubuğundadır**, sıra sabittir ve bileşenin içinde tanımlıdır: **Yeni · Kaydet · Düzenle · Kopyala · Sil ┆ Ara · Filtre ⟶ Yenile · Yazdır · Excel ┆ Küçült · Kapat**. Ekranda olmayan aksiyon listeden çıkar; kalanların sırası değişmez.
- Kullanılamayan aksiyon **gizlenmez**, pasif olur ve nedenini `title`'da yazar.
- Araç çubuğu düğmeleri yazısız ikon düğmedir (`IkonDugme`); adı ve kısayolu `title` ve `aria-label`'dadır: "Kaydet · Ctrl+S".
- Kısayollar her ekranda aynıdır: **Ctrl+S** kaydet, **Ctrl+N** yeni, **F2** düzenle, **F5** yenile, **Del** sil, **Esc** vazgeç/kapat. Yazı kutusunun içindeyken Del ve Esc'e dokunulmaz.
- Kart ve pencere başlığında aynı kural: **Düzenle · (özel işlem) · Sil**; düzenlemedeyken yalnız **Kaydet · Vazgeç**. Gövdede ikinci bir Düzenle ya da Kaydet olmaz (uzun formun altındaki Kaydet istisnadır: aynı ad, aynı iş).
- Sil, Kapat'ın yanına konmaz; kapatma refleksiyle giden parmak Sil'e çarpmasın.
- Pencere başlığında Vazgeç ikonu yoktur; Kapat zaten oradadır, Esc çalışır.
- Satır içinde aksiyon ikonu yoktur: satır seçilir, işlem araç çubuğundan yapılır. Tek istisna küçük tanım listeleridir (renk, beden): satır içi Sil ikonu durur ama mutlaka **Sil onayı** penceresini açar.

## Listeler, tablolar, raporlar

- Her liste **Tablo** bileşenidir: başlık satırı `erp-head` ve 2px `erp-line` alt çizgi, satır `erp-row-h`, zebra, üzerine gelince `erp-hover`, seçili satır `erp-accent-tint`, sayılar sağda.
- Tablo başlığı kaydırınca yapışık kalır; sütun başlığının altında süzgeç satırı vardır; en altta toplam satırı `govde-guclu` ile yazılır.
- **Matris kuralı:** listede tek değişken boyut beden ise satır malzeme × sütun beden matrisi çizilir (`Matris`). İstisna gerekçesiyle yazılır.
- **Excel ve Yazdır ekrandaki tablonun aynısıdır:** aynı sütunlar, aynı sıra, aynı başlıklar, aynı toplam. Ayrı bir rapor şablonu yoktur.
- Boş liste düz "Kayıt yok" demez; neyin görüneceğini ve ilk kaydın nasıl ekleneceğini söyler (`BosDurum`).
- Eksi stok kırpılmaz, `erp-void` ile kırmızı ve eksi işaretli yazılır.

## Geri bildirim

- **Bildirim (toast)** sol alttadır, `erp-shell` zeminde. Süre: 4 sn + her 20 karakter için 1 sn, en çok 12 sn; üzerine dokununca kapanır. Geri alınabilen işlemde **Geri al** düğmesi taşır ve 9 sn kalır. Telefonda tam genişliktedir.
- **Silme** her zaman pencereyle onaylanır: ne silineceği yazılır ("Siyah rengi bu üründen kaldırılsın mı?"), düğmeler **Sil** (tek dolu) ve **Vazgeç**; Esc ve perdeye dokunmak kapatır.
- **Çevrimdışı:** bağlantı yoksa ekranın üstünde kırmızı şerit çıkar ve bütün yazma düğmeleri pasifleşir (v1.557 kilidi). Okumaya devam edilir.
- Bekleyen bir yazma varsa üst çubukta sayaçla görünür; sessiz kalmaz.

## İkonlar

- Tek kaynak `assets/Ikonlar`: 21 çizgi ikon, 24×24 görünüm kutusu, 2px çizgi, yuvarlak uç. Arayüzde `currentColor` ile boyanır; dosyalar önizleme için `erp-text` renginde.
- Her araç çubuğu aksiyonunun ikonu sabittir: Yeni `i-plus`, Kaydet `i-save`, Düzenle `i-edit`, Kopyala `i-copy`, Sil `i-trash`, Ara `i-search`, Filtre `i-filter`, Yenile `i-refresh`, Yazdır `i-print`, Excel `i-export`, Küçült `i-collapse`, Büyüt `i-expand`, Kapat `i-close`.
- Durum ikonları: tamam `i-check`, bekliyor `i-clock`, bilgi `i-info`, pasif `i-ban`, taslak `i-draft`, hata/iptal `i-alert`, geri al `i-undo`, geri `i-back`.
- Yeni bir ikon gerekiyorsa aynı çizgi diliyle sete eklenir; başka kütüphaneden tek tük ikon alınmaz.
- Logo yoktur; uygulama adı düz yazıyla `baslik-kart` stilinde yazılır.

## Kod

- Renk, boşluk ve köşe yalnız token'dan gelir (`var(--erp-…)`); bileşen kodunda hex, px köşe ya da gölge yazılmaz.
- Bileşen sınıfları `components/bundle.css`'te, `erp-` önekiyle. İkonlar ve kural tabloları (araç çubuğu sırası, kısayollar, bildirim süresi) `components/bundle.js`'teki `window.Atolye` nesnesinde; uygulama bu tabloları kopyalamaz, buradan alır.
