# 22 — Site kayıt onayı tek sunucu işlemi + eski ERP'nin boşta cari açması engeli (16 Kasım 2026)

Durum: **geliştirme dalında hazır (`claude/site-yonetim-yetki`, PR #360), canlıya UYGULANMADI.** Canlı SQL çalıştırılmadı, sürüm
numarası ve yayın dosyaları değişmedi. Tasarım: `21-ATOMIK-ONAY-TASARIM.md` (B seçeneği; §3 uygulamada değişti, aşağıda).

## Dosyalar

| Dosya | Ne |
|---|---|
| `site-portal.sql` — "22 BAŞLANGIÇ / BİTİŞ" bölümü | TEK KAYNAK: `islenme` sütunu, `site_kayit_onayla_yeni_cari`, değişen `site_kayit_onayla` / `site_kayit_reddet`, `site_cari_ekleme_koru` tetikleyicisi, iki yardımcı |
| `22-site-onay-atomik.sql` | Canlıya uygulama — ÜRETİLMİŞ; önkoşul + yedek + değişiklik + doğrulama TEK do bloğunda (SQL Editor ifadeleri ayrı gönderse de ya hepsi ya hiçbiri) |
| `22-site-onay-atomik-geri-al.sql` | Geri alma — ÜRETİLMİŞ; tek do bloğu; açılmış cari / hesaplara dokunmaz |
| `22-onkosul-salt-okur.sql` | Canlı önkoşul / durum — ÜRETİLMİŞ; **tek select, hiçbir şey yazmaz**; GENEL satırı HAZIR / UYGULANMIŞ / DUR |
| `22-uret.py`, `22-kaynak/*.sablon.sql` | Üretici: bölümün gövdelerini tek tırnaklı dizgeye çevirir (Editor iç içe dolar tırnağını bozuyor), gövde özetlerini gömer; `--denetle` |
| `src/266-site-erisim.jsx`, `src/100-app.jsx`, `src/260-cari.jsx` | ERP: yeni cari yolu tek RPC, cari yerelde açılmaz, buluttan tazeleme, yarım onay + "Tamamla" |

## Davranış

- **Yeni cariyle onay** — `site_kayit_onayla_yeni_cari(talep, cariId)`: kapı → kimlik biçimi → talep `FOR UPDATE` → aynı kimlikle
  onaylanmışsa `zaten` (yazmaz) → 'yeni' değilse "işlenmiş" → kullanıcı adı / kimlik çakışması → talep `onaylandi, cari_id` →
  cari TALEPTEKİ bilgilerden sunucuda (yalnız tabloda olan sütunlar; `kod` boş, `surum` 1) → hesap. Tek işlem.
- **ERP:** cariId isteğe çıkmadan önce `localStorage`'a (`site:yarim-onay`) yazılır; ERP cariyi yerelde AÇMAZ, buluta yazmaz; sonuçta
  carileri buluttan tazeler (bekleyen cari yazması ya da son 12 sn'de kendi yazması varsa atlar, değişiklik sayacı getirir). Kesin ret
  (iş kuralı, yetki, KR) → yarım kayıt silinir, "hiçbir kayıt açılmadı". Sonucu bilinmeyen hata (ağ) → yarım kayıt kalır, düğme
  "Tamamla" olur ve AYNI kimlikle sorar. Talep listeden düşmüşse (başkası ya da kaybolan cevap bitirdi) yarım kayıt temizlenir.
- **Mevcut cariye bağlama** — `site_kayit_onayla`: tek işlem; aynı cariyle tekrar sessiz; başka cariyle "işlenmiş".
- **Ret** — `site_kayit_reddet`: onaylanmış talep "onaylanmış; reddedilemez"; bulunamayan / zaten reddedilmiş sessiz (19 sınaması aynı).
- **Eski ERP engeli** — `site_cari_ekleme_koru` (cariler BEFORE INSERT): uygulamadan gelen, tabloda olmayan kimlikli, bir talebin ünvan +
  telefonunu taşıyan cari, talep **bekliyorsa** ya da cari talebin işlenmesinden **en geç 1 gün sonra OLUŞTURULMUŞSA** → `KR013`.
  Oluşturma anı cari kimliğinden okunur (`site_kimlik_zamani`; uygulamanın uid'i `cari-<ms, 36 tabanı>-<rastgele>`): eski cihazın
  bekleyen defterden günler sonra AYNI kimlikle yeniden gönderdiği yazma da yakalanır — varış zamanı belirleyici değil. Kimlik bu
  biçimde değilse varış anı esas. 22'den önce işlenmiş taleplerin işlenme zamanı uygulama anıyla doldurulur (22'nin tek veri
  değişikliği): o andan önce üretilmiş bütün eski bekleyen yazmalar kapsanır. İstisna yalnız bir talebin `onaylandi, cari_id = bu kimlik`
  olması (fonksiyon cariyi eklemeden önce yapar; talep tablosuna istemci yazamaz). Not alanına, `siteOdemeSor`'a (her yeni müşteri
  carisinde var), sürüm başlığına bakılmaz. Var olan kimliğin upsert'i, JWT'siz ve service_role yazması serbest.

## Uygulama / geri alma korumaları

- **Önkoşul / uygulama:** `cariler`de değişiklik sayacı (`degisiklik_izle`) YOK ya da DEVRE DIŞI ise önkoşul satırı 10 `DUR`, GENEL
  `DUR`; uygulama dosyası da durur (sunucunun açtığı cari diğer cihazlara ulaşmazdı). 22'nin OLUŞTURACAĞI nesnelerden biri (5 fonksiyon,
  tetikleyici, `islenme` sütunu) önceden varsa uygulama hangisi olduğunu söyleyip durur — sessizce değiştirilmez / üzerine yazılmaz.
  `site_kayit_onayla` / `site_kayit_reddet` yetkileri açıkça tanımlı değilse (varsayılan) durur (önkoşul satırı 15).
- **Yedek:** onayla / reddet'in tanımı ve 22 ÖNCESİ yetkileri; 22'nin oluşturduğu nesnelerin listesi; uygulama SONRASI tetikleyici
  tanımı + etkinliği ve yedi fonksiyonun yetki / sahip / SECURITY DEFINER / ayar (search_path) bilgisi.
- **Geri alma:** gövde (md5), tetikleyici tanımı / etkinliği ya da fonksiyon yetki / sahip / ayarı uygulamadan sonra DEĞİŞTİYSE neyin
  değiştiğini söyleyip DURUR, hiçbir şeyi ezmez (önkoşul satırı 16 bunu önceden `UYARI` olarak gösterir). Yalnız listedeki (22'nin
  oluşturduğu) nesneleri kaldırır; onayla / reddet'in gövdesini ve yetkilerini 22 öncesiyle BİREBİR kurar.

## Testler (16 Kasım, yerel / yalıtılmış; canlıya dokunulmadı)

| Test | Sonuç |
|---|---|
| `stok-v2/test/guvenlik/t22/test22.sh` — PostgreSQL 16, 19 sonrası canlı (ad02222) + değişiklik sayacı + 22 | **125/125** |
| `stok-v2/test/guvenlik/t19/test19.sh` (19'un "yeni kurulum" kontrolü 19 kaynağıyla; güncel depoda 18'in FARKLI'sı yalnız onayla / reddet) | **139/139** |
| `stok-v2/test/guvenlik/t21/test21.sh` (aynı cariyle ikinci onay artık "zaten", başka cariyle "işlenmiş") | **39/39** |
| `test/birim-sunucu-carisi.js` (yeni; uygulamanın gerçek işlevleri) | temiz (10 kontrol) |
| `test/senaryo-site-yonetim-yetki.js` (güncellendi) + ilgili 20 senaryo | 21/21 AYNI |
| `birim-degisiklik`, `birim-kullanici-damga`, `kontrol.sh`, `oludenetim.sh` | temiz |
| `stok-v2/test/guvenlik/kos-guvenlik.sh` (genel güvenlik takımı; site-portal.sql'i yeniden çalıştırır) | **55/55** — beklenti değişmedi; fark yalnız sayımlarda: 5 yeni fonksiyon (anon'a baştan kapalı). İlk deneme `PGPORT` verilmeden başlatıldı: f0 / f2 koşucuları 55432'ye bağlanamayıp sonuçsuz kaldı (ortam hatası); doğru ortamla yeniden: temiz. Kayıt: `stok-v2/test/guvenlik/sonuc-kos-guvenlik.txt` |
| `test/kosu.sh` tam takım | **çalıştırılmadı** |

t22'nin istenen beş noktası:
1. **Eşzamanlı onay, farklı kimlikler:** iki Yönetici 0,4 sn arayla (ilki işlemi 1,5 sn açık tutar) → biri `onaylandi`, öteki kilitte
   bekleyip "işlenmiş"; 6 oturum aynı anda → 1 / 5. Her ikisinde cari 1, hesap 1.
2. **Onay–ret yarışı:** onay önde → ret "onaylanmış; reddedilemez", sonuç onaylandi · 1/1; ret önde → onay "işlenmiş", sonuç
   reddedildi · 0/0; yeni cari ile mevcut cariye bağlama yarışında tek hesap.
3. **Kaybolan cevap:** aynı kimlikle tekrar `zaten`, tablolar aynı (bağlama yolunda da). Commit'ten önce kopan bağlantı → hiçbir şey
   yazılmadı; ikinci Yönetici onayladı; ilk cihazın "Tamamla"sı "işlenmiş"; tek cari. Senaryoda: cevap tamamen kaybolunca "Tamamla"
   görünür ve aynı kimlikle sorar (5 çağrı, 1 kimlik) → tek cari; tek kopmada ERP'nin kendi ağ yeniden denemesi aynı gövdeyle sorup
   `zaten` alır.
4. **Diğer cihazlarda korunma (birim, gerçek işlevler):** bayat cihazın yazması sunucu carisini silmez; bekleyen yazmalı açılışta ekran
   yerel + sunucu carisi, ilk yazma onu ne siler ne yeniden gönderir; bu cihazın bilerek sildiği kayıt silinir, sunucu carisi kalır;
   ayrıntısız eski defterde de korunur; sayaç bekleyen yazma varken erteler ama "görüldü" saymaz; tazelemeden sonra kod ataması
   güncellemedir. (Kod kanıtları: `21-ATOMIK-ONAY-TASARIM.md` §4.)
5. **Eski ERP engeli:** 1.744.21 (`ad02222`) ve `7c6ec2e` paketleri kaynaktan derlenip tarayıcıda gerçekten "Onayla — cari aç" ile
   çalıştırıldı; buluta gönderdikleri istek yakalandı (`t22/eski-*.json`: tek satır, `merge-duplicates`, `x-atolye-surum: 1.744.21`) ve
   PostgreSQL'de PostgREST gibi oynatıldı → **KR013, satır yok**; ardından eski onay "Cari bulunamadı"; tablolar aynı. Not ve
   siteOdemeSor silinse, ünvan büyük harf / fazla boşluk, telefon biçimi farklı olsa, sürüm başlığı sahte (9.9.9) olsa, Yönetici olmasa
   da KR013. Talep başka Yöneticiyle yeni yoldan onaylanmışken eski paketin yazması (yarış) → KR013, sunucu carisi tek. İstisna
   taklit edilemez (talep tablosuna güncelleme / ekleme → izin yok). İlgisiz cari, upsert, service_role, JWT'siz yazma geçer.
   **Gecikmiş yazma (4b):** ilk sürümde kural "son 1 günde işlenmiş talep" (VARIŞ anı) idi; test bunun AŞILDIĞINI gösterdi — talep 2 gün
   önce başka Yöneticiyle onaylanmış / reddedilmişken eski cihazın 3 gün önce üretilmiş kimlikle bugün gelen yazması geçti (onaylanan
   talepte 2. cari, reddedilende 1 cari) ve 22'den önce işlenmiş talepte de engel yoktu. Kural OLUŞTURMA anına çevrildi; şimdi üçü de
   KR013, cari sayıları 1 / 0. Kimliği BUGÜN üretilmiş elle açılış (talep 2 gün önce işlenmiş) ve biçimsiz kimlik (varış anı) serbest.

Ayrıca: biçim — sunucunun açtığı cari, eski ERP'nin aynı talep için yazdığı satırla aynı (kimlik, kod, sürüm hariç); vergi no kuralı
uygulamanın `vergiNoKaydedilecek`'iyle 10 girdide aynı. Kapı: Personel → YETKI_YOK, tablolar aynı; anon ve yardımcılar → izin yok.
Geri alma 19 hâline döner (özetler), açılmış cari / hesap sayısı korunur, yeniden uygulanır; Editor taklidiyle uygula / geri al;
önkoşul tutmazsa hiçbir şey değişmez; ikinci uygulama reddedilir.
Korumalar (8. bölüm): sayaç devre dışı / yok → önkoşul DUR, uygulama durur, katalog ve veri aynı; `islenme` ya da `site_kimlik_zamani`
önceden var → uygulama durur, sütun değerleri / fonksiyon gövdesi ve katalog aynı; uygulamadan sonra tetikleyici kapatıldı, yeniden
tanımlandı (insert or update), yeni fonksiyona anon yetkisi verildi, onayla'dan authenticated alındı, yardımcının search_path'i
değişti → her birinde geri alma durur, değişiklik yerinde kalır, katalog ve veri aynı; değişiklikler geri çekilince geri alma çalışır
ve reddet'in 22 ÖNCESİ yetkisini (anon dahil) birebir geri kurar.

## Sınırlar ve kalanlar

- **Eski paket testi kaynaktan derlenen paketle yapıldı.** Yayındaki HTML'ler esm.sh'tan React yüklüyor (bu ortamda ağ yok). Depo
  sığ (1.744.21'den eski geçmiş yok); `siteKayitCarisi` + "önce cari, sonra onay" sırası erişilebilen her sürümde aynı. Tetikleyici
  yalnız ünvan + telefona baktığı için talepten cari kuran daha eski sürümleri de yakalar.
- **Eski ERP'nin kendi cihazında yerel kopya:** KR013'ten sonra o cihazın ekranında cari yerel olarak görünür ve "inceleme gerekiyor"a
  düşer (1.744.0+ kalıcı ret davranışı); buluta yazılmaz. Uygulama yenilenince kaybolur.
- **Elle açılış:** bekleyen talebin ya da işlenmesinin üzerinden 1 gün geçmemiş talebin ünvan + telefonuyla elle yeni cari KR013 alır
  (talepten onaylanmalı). 22 uygulandığında önceden işlenmiş bütün talepler için bu 1 gün uygulama anından başlar.
- **Eski ERP için kalan koşul:** engel, eski cihazın onayı tıkladığı anın (kimlikteki an) talebin işlenmesinden en geç 1 gün sonra
  olmasına dayanır. Eski ERP yalnız BEKLEYEN talebi listeler (2 dakikada bir tazeler; internetsizken çevrimdışı kilit tıklatmaz), yani
  tıklama anı normalde işlenmeden önce ya da birkaç dakika sonradır. Kalan durum: eski cihazın SAATİ 1 günden fazla ileri ayarlıysa
  kimlikteki an da ileri olur ve gecikmiş yazma geçebilir. Bu yüzden "bütün eski istemciler engellendi" denemez; doğru ifade: **saati
  1 günden fazla kaymamış her eski ERP'nin bu yolu engellendi** (1.744.21 ve 7c6ec2e paketleriyle ölçüldü).
- **Türkçe harf:** eşleşme `lower()` kullanır; canlı veritabanı yerel ayarı C ise ASCII dışı harflerde büyük / küçük ayrımı katlanmaz
  (aynen gelen ünvan yine eşleşir — eski ERP talepteki ünvanı aynen yazar). 22-onkosul bunu ölçmez.
- **Sunucunun açtığı cari diğer cihazlara** değişiklik sayacıyla (8 sn) gelir; canlıda `cariler`de `degisiklik_izle` olmalı —
  22-onkosul 10. satır ölçer (UYARI).
- **Yayın sırası:** önce 22 (salt-okur önkoşul HAZIR ise), sonra yeni ERP sürümü. 22'den sonra eski ERP yeni cariyle onay yapamaz
  (bulutta cari oluşmaz), mevcut cariye bağlama ve ret çalışır. Yeni ERP 22'siz sunucuda yeni cariyle onayda "fonksiyon yok" alır,
  eski yola düşmez.
- 22'den sonra `19-durum-salt-okur.sql` ve `18-…salt-okur.sql` onayla / reddet'te "FARKLI" der (bilerek değişti); durum için 22-onkosul.
