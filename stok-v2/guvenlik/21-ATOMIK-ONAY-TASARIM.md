# 21 — Kayıt onayında boşta cari: atomik çözüm TASARIMI (sürüm 2, 16 Kasım; B seçeneği 22 ile geliştirme dalında uygulandı)

Durum: **B onaylandı ve geliştirme dalında uygulandı (22, `22-SITE-ONAY-ATOMIK.md`); canlıya uygulanmadı.** §3 uygulamada değişti (aşağıdaki not). Bağlam: `21-SITE-YONETIM-YETKI.md`
(PR #360, `7c6ec2e`). Bu sürüm iki şartı ekler: (1) **eski istemci dahil** her onay / ret yolu aynı sunucu kuralına uyar, korumayı
aşan geçiş yolu kalmaz; (2) cihaz kapanır ya da cari buluta yazılamazsa işlem **başka bir Yönetici tarafından güvenle tamamlanır,
ikinci cari oluşmaz.** Ayrıca B seçeneği için "sunucunun açtığı cari bugünkü senkronizasyonda korunur mu" sorusu kodda incelendi.

## Sorun (değişmedi)

Bugünkü onay iki ayrı yazmadır: (1) ERP cariyi açar (`onSave` → `tabloYaz("cariler")`, yerel + bulut kuyruğu), (2)
`site_kayit_onayla(p_id, p_cari_id)` hesabı kurar ve talebi kapatır. 7c6ec2e'deki ön kontrol (1)'den önce sorar ama aradaki pencereyi
kapatmaz: başka cihaz o arada talebi işlerse (1)'in carisi **boşta kalır** (senaryo "yarış": cari 1). (1)'den sonra cihaz kapanırsa
ya da cari buluta ulaşamazsa (2) hiç çalışmaz.

## Sonuç önce

**Önerilen: B — yeni cariyi SUNUCU açar, tek işlemde** (talep kilidi + cari + hesap + talep kapanışı). Kod incelemesi (aşağıda) sunucunun
açtığı carinin bugünkü senkronizasyonda silinmediğini, ezilmediğini ve diğer cihazlara ulaştığını gösteriyor; şartlar ve kalan riskler
listede. Eski istemciler için ek bir sunucu kuralı gerekir (§3).

A (ayırma) değerlendirildi ve **önerilmiyor**: 2. şartı karşılamak için ayrılmış ama carisi buluta ulaşmamış talebi başka Yöneticinin
tamamlaması gerekir; bu da sonunda cariyi sunucunun açmasını (B'nin mekanizması) ister — A, B'nin üstüne bir ara durum (`ayrildi`) ve
devralma kuralları ekler. Ayrıntı §6.

## 1) B'nin sunucu tarafı

Yeni fonksiyon (site-portal.sql; kapılı, SECURITY DEFINER, Editor'e dayanıklı tek DO uygula + geri al + durum dosyası — 16 / 19 kalıbı):

```text
site_kayit_onayla_yeni_cari(p_id text, p_cari_id text) returns jsonb
  0. perform site_yonetici_kapisi();            -- ilk ifade (bugünkü kural)
  1. perform site_istemci_surumu_yeterli();     -- §3; eski istemci burada durur
  2. p_cari_id biçimi: ^cari-[a-z0-9]{6,12}-[a-z0-9]{1,4}$ (uygulamanın uid("cari") biçimi)
  3. select … from site_kayit_talepleri where id = p_id FOR UPDATE   -- aynı talebe gelen her çağrı burada sıraya girer
  4. durum = 'onaylandi' ve cari_id = p_cari_id → {durum:'zaten', cari_id}   (aynı isteğin tekrarı; HİÇBİR ŞEY yazılmaz)
     durum <> 'yeni'                             → hata 'Talep bulunamadı ya da işlenmiş'     (hiçbir şey yazılmaz)
     kullanıcı adı site_hesaplari'nda            → hata 'Bu kullanıcı adı artık kullanılıyor'  (hiçbir şey yazılmaz)
     cariler'de p_cari_id zaten var              → hata 'Cari kimliği kullanılıyor'           (hiçbir şey yazılmaz)
  5. insert into cariler (...)  -- satır TALEPTEKİ bilgilerden SUNUCUDA kurulur (istemciden cari içeriği alınmaz):
       id = p_cari_id, unvan, tip 'Müşteri', telefon, vergi_no (vergiNoKaydedilecek kuralı SQL'de), adres, para_birimi 'TRY',
       bagli_prosesler '[]', pasif false, kod NULL, surum 1,
       ek = {notlar: 'Yetkili: … · Site notu: … · Web sitesinden kayıt', siteOdemeSor: true, eposta, vergiDairesi, ulke, il, ilce}
       -- bugünkü siteKayitCarisi() + TABLO_SEMA.cariler.satir() çıktısıyla birebir (§5 testi bunu ölçer)
  6. insert into site_hesaplari (talepteki şifre özetiyle); update talep: durum 'onaylandi', cari_id, sifre_ozeti null
  7. return {durum:'onaylandi', cari_id}
```

`cariler` tetikleyicileri bu işlemin içinde çalışır: yetki tetikleyicisi (Yönetici geçer), sürüm kapısı tetikleyicisi (RPC isteği
`x-atolye-surum` başlığını taşır), değişiklik sayacı (diğer cihazlar görür). İşlem bütündür: herhangi bir adım düşerse cari de hesap
da talep değişikliği de yoktur.

Değişen fonksiyonlar:
- `site_kayit_onayla(p_id, p_cari_id)` — **mevcut cariye bağlama** yolu kalır (cari açmaz; zaten tek işlem). Eklenen: §3 sürüm kontrolü,
  `FOR UPDATE` (bugün `select … for update` var), aynı cariyle tekrar → `zaten` (idempotent).
- `site_kayit_reddet(p_id)` — §3 sürüm kontrolü; `FOR UPDATE` ile 'yeni' → 'reddedildi'; 'yeni' değilse sessiz geçmek yerine
  "işlenmiş" der (istemci listeyi tazeler).

## 2) Uygulama tarafı (yeni cari yolu)

1. Onay pencereleri (bugünkü gibi). Mevcut cariye bağlama → `site_kayit_onayla` (tek işlem).
2. Yeni cari: `cariId = uid("cari")` üretilir ve **önce cihazda saklanır** (`localStorage` "yarım site onayı": talep → cariId).
3. `rpc/site_kayit_onayla_yeni_cari(p_id, cariId)`. **`onSave` ÇAĞRILMAZ** — cari yerelde de açılmaz (aşağıda 5. madde: yerelde açılsa
   bulut yazması aynı kimlikle tekrar gider).
4. Cevap `onaylandi` ya da `zaten` → yarım kayıt silinir, cariler **buluttan tazelenir** (App'teki `bulutDegisikligiUygula(["cariler"])`
   bir prop ile panele verilir: state + fark tabanı + sürüm birlikte kurulur, 100:1058).
5. Cevap gelmezse (ağ koptu, cihaz kapandı): sonucu bilinmeyen istek. Aynı cihaz açılınca / panelde "Tamamla" ile **aynı cariId ile**
   yeniden çağırır → `zaten` ya da `onaylandi` ya da "işlenmiş" (başka Yönetici bitirdi). Hiçbir yolda ikinci cari yoktur.

### 2. şart: başka Yönetici güvenle tamamlar mı, ikinci cari olur mu?

B'de **ara durum yoktur**: talep ya 'yeni'dir (hiçbir şey yazılmamış — işlem commit olmadan cihaz kapandı / bağlantı koptu) ya da
'onaylandi'dir (cari + hesap + kapanış birlikte yazılmış). Bu yüzden:
- Cihaz commit'ten önce kapandı → talep 'yeni', başka Yönetici normal onaylar → **tek** cari (onun işlemi).
- Commit oldu, cevap kayboldu → talep 'onaylandi'; başka Yönetici listede görmez (liste yalnız 'yeni'); ilk cihazın tekrarı `zaten`.
- İki Yönetici aynı anda → `FOR UPDATE` sıraya sokar; ikincisi 'yeni' bulamaz → "işlenmiş", **cari yazmaz**.
- "Cari buluta yazılamadı" durumu B'de yoktur: cariyi istemci yazmaz; RPC düşerse hiçbir yerde cari yoktur.
- Aynı cariId iki kez yazılamaz: 4. adım `cariler`de kimliği görürse durur; uygulamanın kendi yazması da `resolution=merge-duplicates`
  ile gider (040:88) — aynı kimlikle ikinci satır üretemez.

## 3) 1. şart: eski istemci korumayı aşabilir mi?

> **Uygulamada değişti (22, 16 Kasım):** aşağıdaki ilk taslak (not alanı + sürüm başlığı) UYGULANMADI. Sebep: `siteOdemeSor` her yeni
> müşteri carisine konuyor (`src/260-cari.jsx:152`, `src/100-app.jsx:2944`), not serbest metin, sürüm başlığı istemcinin gönderdiği bir
> değer. Uygulanan kural sunucudaki TALEP VERİSİNE dayanır; ayrıntı ve testler `22-SITE-ONAY-ATOMIK.md`.

Eski ERP (1.744.21 ve 7c6ec2e) yeni cariyi **önce kendisi yazar** (`tabloYaz` → `cariler` POST, `merge-duplicates`), sonra
`site_kayit_onayla` çağırır. Sunucu onayı reddetse de cari çoktan yazılmıştır. Bu yüzden eski istemci **cari yazmasında** durdurulur:

- **`cariler` BEFORE INSERT tetikleyicisi `site_cari_ekleme_koru`:** uygulamadan (JWT var, service_role değil) gelen ve tabloda henüz
  OLMAYAN bir kimliğin eklenmesinde, **bir kayıt talebiyle aynı ünvan + telefonu** taşıyan cari, talep bekliyorsa ya da cari talebin
  işlenmesinden en geç 1 gün sonra OLUŞTURULMUŞSA (an cari kimliğinden okunur — bekleyen defterden günler sonra gelen eski yazma da
  yakalanır; ayrıntı `22-SITE-ONAY-ATOMIK.md`) `KR013` ile reddedilir (1.744.0+ ERP bunu kalıcı ret sayar; bulut yazması tekrarlanmaz). İstisna: bir talep
  `onaylandi` ve `cari_id` = bu kimlik ise geçer — `site_kayit_onayla_yeni_cari` cariyi eklemeden ÖNCE talebi böyle işaretler.
  Bu istisna istemcinin taklit edebileceği bir işaret değildir: `site_kayit_talepleri`ne authenticated yazamaz (19); talep durumu
  yalnız kapılı fonksiyonlarla değişir. Not alanına, `siteOdemeSor`'a ve sürüm başlığına bakılmaz.
- Eşleşme anahtarı: ünvan (baş / son boşluk atılır, iç boşluklar teke iner, `İ I ı` → `i`, küçük harf) + telefonun yalnız rakamları.
- Var olan kimliğin upsert'i (düzenleme), JWT'siz (SQL Editor) ve service_role yazmaları kontrol edilmez.
- Site RPC'lerinde sürüm başlığı kontrolü EKLENMEDİ: eski istemcinin onay / bağlama / ret çağrıları da artık tek işlemlidir (kilit +
  durum kontrolü); boşta cariyi yalnız eski cari yazması üretebiliyordu ve o tetikleyiciyle kapandı.

Bilinen yan etki: bekleyen bir talebin (ya da işlenmesinin üzerinden 1 gün geçmemiş talebin) ünvanı + telefonuyla ERP'de **elle** yeni
cari açılmak istenirse o da KR013 alır ("Siteden gelen kayıt talepleri"nden onaylayın).

## 4) B — sunucunun açtığı cari bugünkü senkronizasyonda korunur mu? (kod incelemesi)

| Soru | Kod | Sonuç |
|---|---|---|
| Bir cihazın sonraki cari yazması bilmediği satırı siler mi? | `src/025-veri-fark.jsx:20` `tabloFarki`: silinen = **bellekteki eski hâlde (`_sonHal`) olup** yeni listede olmayan. Sunucunun açtığı satır, o cihaz buluttan okuyana kadar `_sonHal`'de yoktur; okuduğunda state'e de girer (100:1058 `setCariler` + `tabloBaslangicTam` birlikte). | **Silmez.** |
| Diğer cihazlar görür mü? | `degisiklik-sayaci.sql`: `cariler`de deyim tetikleyicisi sayacı artırır. `src/100-app.jsx:1095` 8 sn'de bir okur → `bulutDegisikligiUygula` cariler'i buluttan yeniden kurar. Bekleyen cari yazması olan ya da son 12 sn'de yazan cihazda ertelenir ama **"görüldü" sayılmaz**, sonraki turda alınır (`src/047-degisiklik.jsx` `degisiklikFarki` / `degisiklikGoruldu`). | **Görür** (sayaç SQL'i canlıda kurulu olmalı — doğrulanacak). |
| Bekleyen yazmalı cihaz açılışta ezer mi? | `src/090-yukleme.jsx` `yerelKazansin` → `src/025-veri-fark.jsx:314` `yereliBulutlaBirlestir`: yerel esasken de **bulutta olup yerelde olmayan ana kayıtlar eklenir** (bu cihazda "sil" defterinde olanlar hariç). Taban buluttan (`tabloBaslangicBekleyen`). | **Ezmez.** |
| Yazma doğrulaması "fazla satır" der mi? | `src/040-esitle.jsx:592` yalnız bulut < beklenen ise uyarır. | Uyarmaz. |
| Aynı kimlik iki kez yazılırsa? | `src/040-esitle.jsx:88` POST `resolution=merge-duplicates`. | İkinci satır olmaz. |
| Sürüm kilidi? | Sunucu `surum = 1` yazar; cihazlar okumada `surumleriYukle` (025:464) ile alır; sonraki düzenleme `PATCH … surum=eq.1` (040:316). | Uyumlu. |
| Cari kodu (`kod`)? | Sunucu NULL bırakır. `src/100-app.jsx:2328` her cari kaydında `cariKodlariAta` bütün listeye bakar; açılışta da (090:171). İlk cari kaydında / açılışta kod alır — bugün `siteKayitCarisi` de kodsuz açıyor. | Bugünkü gibi. |
| Okuma biçimi | Satır `TABLO_SEMA.cariler.satir()` (035:146) biçiminde yazılmalı; okuma `ek`i köke açar. | **Test şartı** (§5): buluttan okunan cari, `siteKayitCarisi` çıktısıyla `tabloIcerikFarki` = aynı (kimlik hariç). |

Kalan riskler (B'ye özgü değil, bugün her cari için geçerli): JSON yedeğinden geri yükleme / sıfırlama (`topluSilmeIzni`, kullanıcı
sayıyı görüp onaylar) yedekte olmayan cariyi siler — o zaman site hesabı carisiz kalır (açık işlerdeki "carisi bulunamayan 3 site
hesabı" bu yoldan doğmuş olabilir; ayrı incelenecek). Kodun aynı anda iki cihazda atanması bugünkü sürüm çakışması yoluyla çözülür.

## 5) Test planı (onaydan sonra; yeni tam takım turu ayrıca istenirse)

- **t21 genişletmesi (PostgreSQL):** iki bağlantıdan aynı talebe eşzamanlı `onayla_yeni_cari` (biri `onaylandi`, öteki "işlenmiş";
  `cariler` +1); bir Yönetici yeni cari, öteki mevcut cariye bağlama aynı anda (biri kazanır, cari en çok 1); aynı cariId tekrar →
  `zaten`, satır sayıları değişmez; commit'ten önce bağlantı öldürülür → hiçbir satır, talep 'yeni', ikinci Yönetici onaylar → tek cari;
  eski sürüm başlığıyla (1.744.21) / başlıksız: site işaretli cari INSERT → KR reddi, satır yok; işaretsiz cari INSERT → geçer;
  eski başlıkla `site_kayit_onayla` / `reddet` → "yenileyin", hiçbir tablo değişmez; Yönetici olmayan → kapı (bugünkü 38 kontrol aynen).
- **Senaryo:** onay sonrası `onSave` çağrılmadığı, cari:data'ya yalnız buluttan tazelemeyle girdiği; ikinci oturum sayaçla görür;
  bekleyen cari yazması olan oturum açılışta sunucu carisini korur; bayat oturum başka cariyi düzenler → sunucu carisi bulutta aynı;
  yanıtı kaybolan istek "Tamamla" ile aynı cariId → `zaten`; buluttan okunan cari = `siteKayitCarisi` çıktısı.
- t19 (138) ve `test/kosu.sh` ilgili senaryolar.

## 6) A (ayırma) neden önerilmiyor — 2. şartla tamamlanmış hâli

A'nın 2. şartı karşılaması için: ayırma `ayrilan_cari_id` + talepten kurulan cari içeriğini saklar; ayıran cihaz kapanırsa başka Yönetici
"devral" ile tamamlar — cari bulutta yoksa **sunucu aynı kimlikle açar** (ikinci cari olmasın diye kimlik sabit), sonra hesabı kurar.
Ayıran cihaz sonra dönüp bekleyen yazmasıyla aynı kimliği POST ederse `merge-duplicates` aynı satırı günceller (ikinci satır yok).
Yani A da sonunda cariyi sunucuda açmak zorunda; üstüne `ayrildi` ara durumu, devralma süresi, ayrılmış talebin reddi / bırakılması
kuralları ve eski istemci için yine §3 gerekir. Aynı güvenceyi B daha az durumla verir.

## 7) Yayın sırası (onaydan sonra)

1. Canlıda salt-okur doğrulama: `degisiklik` tetikleyicisi `cariler`de var mı; `cariler` sütunları (`surum`, `ek`, `kod`) ve
   tetikleyicileri; `stk_ayar` / ayar satırı; `site_kayit_talepleri`nde 'yeni' dışı durum dağılımı.
2. SQL (uygula + geri al + durum + sınama). Uygulandığı anda eski istemciler site onayı / reddi / hesap değişikliği yapamaz
   ("yenileyin"); bekleyen talepler kaybolmaz, yalnız bekler.
3. Yeni ERP sürümü (sürüm artırma + `yap.sh` + yayın onayı). Yeni istemci yeni fonksiyonu bulamazsa (SQL'den önce yayınlanırsa) eski
   yola **düşmez**, "sunucu güncel değil" der — bu yüzden sıra SQL → ERP.
4. Geri alma: yeni fonksiyon + tetikleyici + sürüm kontrolü kaldırılır, eski fonksiyon gövdeleri geri yüklenir; açılmış cariler ve
   hesaplar silinmez.
