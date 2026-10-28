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
- **Bakiye tek kuralla yazılır:** işaretli (`+1.500,00 ₺`, `−12.450,00 ₺`) ve rengiyle: artı `erp-ok` (`erp-arti`) cari bize borçlu, eksi `erp-void` (`erp-eksi`) biz cariye borçluyuz, sıfır nötr. Liste, kart başlığı, ekstrenin koşan bakiyesi ve toplam satırı aynı kuraldan beslenir; mutlak değer yazılıp yön renge bırakılmaz. Dövizli cari Türk lirası toplamına karışmaz.
- Kayda yazılan renk (ürün renginin kodu, kullanıcının seçtiği etiket rengi) veri olarak hex saklanır; token adı veriye yazılmaz.

## Tema

- Renkler temadan gelir. Dört tema var: **Atölye** (varsayılan, ERP standardı), **Gece** (koyu), **Deniz** (soğuk tonlu açık), **Yüksek kontrast** (bütün yazılar ≥7:1). Hepsi aynı token adlarını taşır; her yazı çifti her temada okunabilirlik eşiğini geçer.
- Tema Tanımlar › Görünüm'den seçilir (`TemaSecici`): firma varsayılanı Yönetici seçer, her kullanıcı kendine başkasını seçebilir; ikisi de `ayar` tablosunda.
- Uygulama yalnız `<html data-theme="…">` değiştirir (`Atolye.temaUygula`). Kodda renk değeri yazılmaz; yazılırsa tema o noktada kırılır.
- Serbest renk seçtirilmez. Yeni tema bu sisteme eklenir ve okunabilirlik denetiminden geçer.
- Gece temasında dolu kırmızı düğmenin yazısı koyudur (`erp-on-accent`); koyu menü ve bildirim zeminindeki açık yazı her temada `erp-shell-ink-guclu`'dur.
- Yazdırma ve Excel temadan bağımsızdır: kâğıda açık zeminde basılır.

## Yazı

- Tek yazı ailesi Archivo (`sans`). Ekran başına bir `baslik-sayfa`; kart ve pencerelerde `baslik-kart`; geri kalan her şey `govde`.
- Tablo sütun başlıkları ve form etiketleri `etiket` stilinde, BÜYÜK HARF, 0,06em aralıklıdır. Sayfa dili `tr` olmalıdır (`<html lang="tr">`; `bundle.js` yoksa koyar), yoksa "İL" yerine "IL" yazılır.
- Yazı küçültülerek sığdırılmaz; sığmayan alan sarılır ya da tablo kendi içinde yana kayar.

## Boyut, boşluk, köşe, gölge

- Masaüstü ölçüleri `erp-toolbar-h` 44, `erp-row-h` 30, `erp-icon-btn` 30, `erp-icon` 16. **720px altında** hepsi parmak ölçüsüne çıkar: `erp-toolbar-h-dokunma` 52, `erp-row-h-dokunma` 44, `erp-icon-btn-dokunma` 44, `erp-icon-dokunma` 18.
- Boşluklar yalnız `erp-gap-1`…`erp-gap-5` adımlarıdır (4, 8, 12, 16, 24).
- Köşeler yuvarlaktır (kullanıcı kararı; standarttaki 0px bilerek uygulanmaz): `erp-r-sm` küçük kontroller, `erp-r-md` panel ve kart, `erp-r-lg` pencere, `erp-r-pill` hap.
- **Gölge yok.** Katmanlar 1px `erp-line` çizgiyle ayrılır. Yalnız onay penceresi ve çekmece perdeyle öne çıkar.
- Form alanları ekrana yayılmaz, içerik kadar sabit genişliktedir: ürün 190, renk 130, ölçü 130, fiyat 120, tarih 150, fiş no 160, ödeme şekli 140 px. Dar ekranda alt satıra sarar.

## Menüler

- Uygulamada **tek menü tasarımı** vardır (`AcilirMenu`): açılır menü, sağ tık menüsü, kart başlığındaki "İşlemler" menüsü ve kullanıcı menüsü aynı görünür ve aynı klavyeyle çalışır.
- Sağ tık menüsü araç çubuğunun kopyasıdır: aynı eylemler, aynı sıra, aynı ad. Yalnız menüde duran eylem yoktur. Dokunmatikte uzun basma aynı menüyü açar.
- Tehlikeli öğe en altta, ayırıcıdan sonra ve kırmızı; tıklanınca `SilOnayi` açılır.
- Yan menü (`Kabuk`) modül gruplarıyla sabit sıradadır ve yapı şemasındaki modüllerle aynı adları taşır. Yetkisi olmayan modül menüde görünmez (pasif değil, yok).
- Ekran içi bölümler `Sekmeler` ile ayrılır; sekme içinde ikinci sekme sırası açılmaz.

## Seçim kutuları

- Listeden seçim **her zaman** `AramaliSecici` iledir: cari, ürün, renk, beden seti, proses, depo, hesap, kullanıcı.
- Kutuya yazdıkça liste daralır. Yazılan her kelime kaydın içinde herhangi bir yerde geçmelidir; sıra önemsiz, Türkçe harf ve büyük/küçük farkı yok ("cevik ltd" → "Çevik Deri Ltd. Şti."). Eşleşen kısım vurgulanır.
- Satırda kod, ad, ikinci satırda ayırt edici bilgi (il, tip); sağda işe yarayan sayı: üründe stok, caride bakiye, eksiyse kırmızı.
- Birebir kod ya da okutulan barkod listeyi açmadan seçer. Boş kutuya odaklanınca son kullanılanlar gelir.
- Eşleşme yoksa ne arandığı yazılır ve yetki varsa "+ yeni … aç" çıkar; açılan kart kaydedilince seçili döner.
- `<select>` yalnız 7 ya da daha az SABİT seçenek için (para birimi, ödeme şekli, durum).

## Düğmeler ve kısayollar

- Bütün aksiyonlar **araç çubuğundadır**, sıra sabittir ve bileşenin içinde tanımlıdır: **Yeni · Kaydet · Düzenle · Kopyala · Sil ┆ Ara · Filtre ⟶ Yenile · Yazdır · Excel ┆ Küçült · Kapat**. Ekranda olmayan aksiyon listeden çıkar; kalanların sırası değişmez.
- Kullanılamayan aksiyon **gizlenmez**, pasif olur ve nedenini `title`'da yazar.
- Araç çubuğu düğmeleri yazısız ikon düğmedir (`IkonDugme`); adı ve kısayolu `title` ve `aria-label`'dadır: "Kaydet · Ctrl+S".
- Kısayollar her ekranda aynıdır: **Ctrl+S** kaydet, **Ctrl+N** yeni, **F2** düzenle, **F5** yenile, **Del** sil, **Esc** vazgeç/kapat, **PageUp/PageDown** önceki/sonraki kayıt. Yazı kutusunun içindeyken Del, Esc, PageUp ve PageDown'a dokunulmaz.
- Kart ve pencere başlığında aynı kural: okurken **Düzenle · (özel işlem) · Sil ┆ Kapat**; düzenlemedeyken yalnız **Kaydet ┆ Kapat**. Düzenlemedeki Kapat vazgeçmektir: değişiklik varsa "Kaydet · Kaydetmeden çık · Düzenlemeye dön" sorulur, yoksa sessizce okuma kipine döner.
- **Düğmeler sadıktır.** Kaydet, Düzenle, Sil, Kapat (ve Yeni, Kopyala, Yazdır…) her ekranda **aynı `IkonDugme`**dir: aynı ikon, aynı yer, aynı renk, aynı ipucu ("Kaydet · Ctrl+S", "Sil · Del"), aynı kısayol. Bir ekranda yazılı "Kaydet", ötekinde ikon olmaz; formun altına ikinci Kaydet ya da Vazgeç konmaz. Kart başlığı kaydırınca yapışık kaldığı için Kaydet her an görünür.
- **Yazılı düğme** (`Dugme`) yalnız iki yerde: onay ve soru pencerelerinin dibinde (**Vazgeç · Sil**, **Kaydetmeden çık · Kaydet**) ve ikonu olmayan özel işlemlerde (İşlemler, Kalemlere ekle, Siparişe çevir).
- Sil'in yaptığı işin adı değişebilir (onaylı belgede iptal, caride pasife alma); düğme yine aynı Sil ikonudur, farkı onay penceresi söyler: "İptal et", "Pasife al".
- **Kayıttan kayda geçiş:** listeden açılan her kartın başlığında, eylemlerin solunda `KayitGezgini` durur: **‹ 3 / 24 ›**. Sipariş, cari, ürün, belge, üretim emri, tanım: listesi olan her kart. Sıra kartın açıldığı listenin o anki süzgeci ve sıralamasıdır; liste dışından açılan kartta modülün varsayılan listesi kullanılır. Kısayol **PageUp** önceki, **PageDown** sonraki. İlk ve son kayıtta ilgili düğme pasif ("İlk kayıt", "Son kayıt"), döngü yok. Düzenleme sırasında gezgin pasif ("Önce kaydet ya da vazgeç"). Geçişte açık sekme korunur; Kapat listeye döner ve son bakılan kayıt seçili gelir. Yeni kayıt formunda gezgin yoktur.
- Sil, Kapat'ın yanına konmaz; kapatma refleksiyle giden parmak Sil'e çarpmasın.
- Vazgeç ikonu yoktur; Kapat ve Esc vazgeçmenin tek yoludur.
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

- Tek kaynak `assets/Ikonlar`: 22 çizgi ikon, 24×24 görünüm kutusu, 2px çizgi, yuvarlak uç. Arayüzde `currentColor` ile boyanır; dosyalar önizleme için `erp-text` renginde.
- Her araç çubuğu aksiyonunun ikonu sabittir: Yeni `i-plus`, Kaydet `i-save`, Düzenle `i-edit`, Kopyala `i-copy`, Sil `i-trash`, Ara `i-search`, Filtre `i-filter`, Yenile `i-refresh`, Yazdır `i-print`, Excel `i-export`, Küçült `i-collapse`, Büyüt `i-expand`, Kapat `i-close`.
- Durum ikonları: tamam `i-check`, bekliyor `i-clock`, bilgi `i-info`, pasif `i-ban`, taslak `i-draft`, hata/iptal `i-alert`, geri al `i-undo`. Gezinme: önceki kayıt `i-back`, sonraki kayıt `i-next`.
- Yeni bir ikon gerekiyorsa aynı çizgi diliyle sete eklenir; başka kütüphaneden tek tük ikon alınmaz.
- Logo yoktur; uygulama adı düz yazıyla `baslik-kart` stilinde yazılır.

## Kod

- Renk, boşluk ve köşe yalnız token'dan gelir (`var(--erp-…)`); bileşen kodunda hex, px köşe ya da gölge yazılmaz.
- Bileşen sınıfları `components/bundle.css`'te, `erp-` önekiyle. İkonlar ve kural tabloları (araç çubuğu sırası, kısayollar, bildirim süresi) `components/bundle.js`'teki `window.Atolye` nesnesinde; uygulama bu tabloları kopyalamaz, buradan alır.

---

## Consuming this system (generated — do not edit)

Every path named below is under `project/` in this design system: read `project/api/tokens.md`, not `api/tokens.md`.

`components/bundle.js` defines `window.Atolye` (14 components); `components/bundle.css` is its stylesheet; `tokens.css` is every token as a CSS variable plus `@font-face` for the fonts. `components/bundle.css` reads its variables from `tokens.css`. Build any UI by mounting these components; never hand-build a control or draw an icon the system provides.

- **Standalone page:** inline `tokens.css` and `components/bundle.css` in a `<style>`, then `components/bundle.js` as a classic script (a file containing `</style`, `</script` or `<!--` breaks an inline element: write the sequence `<\/style`, `<\/script` or `\x3C!--` in your copy, or load that file by URL).
- **Design canvas:** bring `tokens.css`, `components/bundle.css` and `components/bundle.js` onto the canvas in full, as the canvas type’s design-system components reference says (a server-side copy first where it offers one); in each artboard that uses this system, right after the `support.js` line, load `tokens.css` first, then the stylesheet, then the script; mount with `<x-import component-from-global-scope="Atolye.<Comp>" …>`.
- **Slides deck, or any surface that cannot run the bundle:** tokens only — the values are on `api/tokens.md`; the deck takes `tokens.json` by file path for its colour pickers.

**Read, per thing:** a component’s props, parts and examples: `api/components/<Comp>.md`; token values: `api/tokens.md`; stored assets and their paths: `api/assets/<Group>.md`. After this README, fetch the cards and fonts you need in ONE message as parallel calls — none depends on another.

**Two rules.** Before you use a thing — a component, a token group, an icon, an asset — read its card from the index below; a value you did not read from a card is a guess. `tokens.json`, `manifest.json` and `design-system.json` are sources for tools: hand them over. `components/<Comp>/README.md` and `assets/<Group>/README.md` are the long-form second read a card links to; `SKILL.md` and `artifact-type/` beside them are authoring guidance, not needed to consume the system.

## Index (generated — do not edit)

**Tokens**

- `api/tokens.md` — Every token: surface, text, fill, palette, type, spacing, radius, z-index. (9.4k)

**Icons and assets**

- `api/assets/Ikonlar.md` — 20 files, by asset id. (2.8k)

**Components** (`api/components/<Comp>.md`, 14)

- **Eylemler**: `AracCubugu` — Ekranın bütün aksiyonlarının durduğu tek çubuk; sıra bileşenin içinde sabittir: Yeni · Kaydet · Düzenle · Kopyala · Sil ┆ Ara · Filtre ⟶ Yenile · Yazdır · Exce… · `Dugme` — Yazılı düğme; yalnız onay ve soru pencerelerinin dibinde ve ikonu olmayan özel işlemlerde kullanılır · `IkonDugme` — Araç çubuğunun ve kart başlığının yazısız düğmesi: 30×30 (dokunmada 44×44), 16px ikon · `KartBasligi` — Kartın ve tam ekran pencerenin başlığı: solda kod + ad + durum rozeti, sağda kartın bütün eylemleri
- **Geri bildirim**: `Bildirim` — İşlemin sonucunu söyleyen kısa mesaj; sol altta, koyu erp-shell zeminde · `Serit` — Ekranın üstünde, kapanmayan durum bildirimi: çevrimdışı kilidi ve gönderilemeyen yazma · `SilOnayi` — Her silme işleminin onay penceresi; ne silineceğini cümleyle söyler, düğmesi "Sil"dir
- **Listeler**: `BosDurum` — Boş liste ya da sonuçsuz arama; "Kayıt yok" demek yerine neyin görüneceğini ve ilk kaydın nasıl ekleneceğini söyler · `Matris` — Tek değişken boyutu beden olan her liste için zorunlu görünüm: satırda malzeme (ve renk), sütunda beden, hücrede tek sayı · `Rozet` — Bir kaydın durumu; her zaman renk, ikon ve kelime birlikte (Atolye.rozet(durum, metin)) · `Tablo` — Bütün listelerin ve raporların tek tablosu: yapışık başlık, süzgeç satırı, zebra, seçili satır, toplam satırı
- **Formlar**: `FormAlani` — Etiketi üstte, genişliği içeriğe göre SABİT giriş alanı; alanlar ekrana yayılmaz, dar ekranda alt satıra sarar
- **Kabuk**: `Kabuk` — Her ekranın çerçevesi: solda koyu yan menü, üstte firma ve oturum çubuğu, altında ekranın araç çubuğu ve içerik
- **Raporlar**: `RaporCercevesi` — Bütün raporların ortak düzeni: araç çubuğu (yalnız Yenile · Yazdır · Excel), süzgeç bandı, özet sayıları, tablo
