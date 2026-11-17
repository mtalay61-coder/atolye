# 21 — Site hesabı yönetimi yalnız Yönetici: ERP ekranı ve onay sırası (16 Kasım 2026)

Durum: **geliştirme dalında hazır (`claude/site-yonetim-yetki`), canlıya alınmadı.** Sürüm numarası değiştirilmedi, yayın paketi

> **22 (16 Kasım, aynı dal):** kayıt onayındaki ayrı ön kontrol (`siteKayitOnKontrol`) kaldırıldı; yeni cariyle onay artık tek sunucu
> işlemidir (`site_kayit_onayla_yeni_cari`) ve aşağıdaki "yarış" açığı orada kapanır. Ayrıntı ve testler: `22-SITE-ONAY-ATOMIK.md`.
üretilmedi, veritabanı değişikliği YOK (canlı SQL gerekmez). Yayın için ayrıca sürüm artırma + `yap.sh` + onay gerekir.

## Kapsam

Güvenlik denetimi açık işler listesinin 1. maddesi. 19'dan sonra sunucu, müşteri site hesabını değiştiren dört fonksiyonu
(`site_hesap_kaydet`, `site_hesap_sil`, `site_kayit_onayla`, `site_kayit_reddet`) yalnız Yöneticiye açıyor. ERP ekranı ise
düğmeleri herkese gösteriyordu. Ayrıca kayıt onayında "boşta cari" kalıp kalmadığı **doğrulanmamış bir şüpheydi**; önce işlem
sırası incelendi, sonra izole ortamda ölçüldü.

Kapsam dışı (değişmedi): siteden gelen **sipariş** talebini reddetme (`site_talep_reddet`) — hesap yönetimi değil, sunucuda kapısı
yok; cari kartındaki "Siparişte ödeme şeklini sorsun" ve "Hesabında görünen defter" — cari alanları, cari düzenleme yetkisine bağlı.

## İnceleme: kayıt onayının işlem sırası (`src/266-site-erisim.jsx`, değişiklikten önce)

1. "Onayla — cari aç" → iki onay penceresi (mevcut cariye bağla / yeni cari aç).
2. Yeni cari seçildiyse **cari hemen kaydedilir** (`onSave` → yerel veri + bulut yazma kuyruğu). Bu adımda yetki, talebin hâlâ
   beklediği ya da kullanıcı adının boş olduğu SORULMAZ.
3. Sonra `site_kayit_onayla` çağrılır; sunucu kapısı burada (fonksiyonun ilk ifadesi) karar verir.

Sıra kendi başına gerekli: `site_kayit_onayla` carinin bulutta olmasını ister ("Cari bulunamadı" → ERP 3 sn arayla 8 kez dener).
Sorun, 2. adımdan önce hiçbir kontrol olmamasıydı. Sunucu 3. adımı reddettiğinde 2. adımda açılan cari geri alınmaz.

## İzole ölçüm — `test/senaryo-site-yonetim-yetki.js`

Gerçek Chromium, ağ kapalı. Sunucu taklittir ve 19'un kuralını uygular (Yönetici değilse 403 / 42501 YETKI_YOK, hiçbir şey yazmaz;
iş kuralları P0001). Üç ayrı oturum. Aynı senaryo değişiklikten önceki pakette (`origin/main` = `ad02222`) ve sonraki pakette çalıştırıldı.

| Oturum / adım | ÖNCE (ad02222) | SONRA |
|---|---|---|
| A — Ali, "Kullanıcı" (cari modülünde tam yetkili), sunucuda Yönetici değil: kayıt talebi düğmeleri | Onayla + Reddet görünüyor | görünmüyor ("Talepleri yalnız Yönetici onaylar ya da reddeder.") |
| A — cari kartı site paneli (hesabı olan / olmayan müşteri) | "Kullanıcı adı / şifre değiştir + Erişimi kapat" / "Giriş bilgisi oluştur" | düğme yok (kullanıcı adı, son giriş görünür) |
| A — "Onayla" sonrası "Yeni Firma Ltd" carisi | **1 (boşta cari)**; sunucu reddetti, talep `yeni` kaldı | düğme yok; cari 0; sunucuya yönetim çağrısı gitmedi |
| C — Veli, istemcide Yönetici ama sunucu tanımıyor (rolü sunucuda düşürülmüş / eski tanımlar): "Onayla" | **cari 1 (boşta)**; "Site hesabı açılamadı: YETKI_YOK…" | cari 0; yalnız `yonetici_mi` soruldu, onay çağrısı gitmedi; "…sunucu bu hesabı Yönetici olarak tanımıyor; hiçbir şey kaydedilmedi" |
| B — Mahmut, Yönetici: kullanıcı adı başka caride olan talep | **cari 1 (boşta)**; sunucu "Bu kullanıcı adı artık kullanılıyor" | cari 0; "…kullanıcı adı başka bir caride kullanılıyor — talep onaylanamaz, cari açılmadı" |
| B — başka cihazda işlenmiş talep (ekranda hâlâ görünüyor) | **cari 1 (boşta)**; sunucu "Talep bulunamadı ya da işlenmiş" | cari 0; "Talep artık bekleyenlerde değil… — cari açılmadı"; liste tazelendi |
| B — normal onay | cari 1 + hesap bu cariye kuruldu, talep kapandı | aynı |
| B — ret / erişimi kapat | çalışıyor | aynı |
| B — YARIŞ: ön kontrol geçtikten hemen sonra başka cihaz talebi işler | cari 1, hata iletisi ham | **cari 1 — boşta cari kalıyor, ÇÖZÜLMEDİ**; yalnız ileti açık: "…"Yaris Ltd" carisi açıldı ama talep bu arada başka bir cihazda işlendi; cari gereksizse silinebilir." |

Sonuç: şüphe **doğrulandı** — değişiklikten önce yetkisiz ya da başarısız onay boşta cari bırakıyordu (A, C ve B'nin iki hata yolu).
Sunucu tarafında hiçbir site tablosu değişmiyordu; boşta kalan yalnız ERP carisiydi.

## Değişiklikler

- `src/094-yetki.jsx` — `siteYonetimiYetkisi(tanimlar, aktifKullanici)`: giriş kapalıysa kısıtlama yok (yetkiVarMi ile aynı sıra; karar
  sunucuda); açıksa yalnız rolü **güncel** tanımlarda "Yönetici" olan. Modül yetkisi sayılmaz (sunucu da saymıyor).
- `src/100-app.jsx` → `src/260-cari.jsx` → `src/265-carikart.jsx`: sonuç `siteYonetici` olarak panellere iletilir.
- `src/266-site-erisim.jsx`:
  - Cari kartı: oluştur / değiştir / kapat düğmeleri yalnız Yöneticiye; `kaydet` ve `kapat` ilk satırda bakar.
  - Kayıt talepleri: Onayla / Reddet yalnız Yöneticiye; `onayla` ve `reddet` ilk satırda bakar.
  - **Onay ön kontrolü (`siteKayitOnKontrol`) — cari açılmadan ÖNCE**: (1) `rpc/yonetici_mi` true mu (sunucu kapısının kullandığı
    kuralın aynısı; istemcideki rol yeterli sayılmaz), (2) talep `site_kayit_listesi`nde hâlâ var mı, (3) kullanıcı adı
    `site_hesap_listesi`nde boş mu. Biri olmazsa hiçbir şey yazılmaz. Sunucu cevap vermezse onay yapılmaz (kapalı kalır).
  - Onay cari açıldıktan sonra düşerse ileti açılan cariyi adıyla söyler.

### Veritabanı değişikliği gerekmedi

Ön kontrolün kullandığı üç fonksiyon zaten var ve `authenticated` çalıştırabiliyor (`t21` ölçtü). Canlı için kanıt: 14. denetimin
`canli/bolum1.csv` satırında `yonetici_mi()` yetkisi `authenticated=X`; 16 yalnız YENİ fonksiyonların varsayılanını değiştirdi.
`site_kayit_listesi` / `site_hesap_listesi` ERP'nin bugün de çağırdığı fonksiyonlar (talep paneli, hesap rozeti).

### Kalan açık: başka cihazla yarış — ÇÖZÜLMEDİ

Ön kontrol ile `site_kayit_onayla` arasında başka bir cihaz aynı talebi onaylar ya da reddederse, bu cihazın açtığı yeni cari
**boşta kalır** (tablodaki "yarış" satırı: cari 1). Değişiklik yalnız bunu kullanıcıya adıyla söyler; boşta cariyi önlemez.
Ön kontrol pencereyi daraltır ama kapatmaz; bu yüzden bu durum **çözülmüş sayılmaz**. Atomik çözümün tasarımı ayrı dosyada:
`21-ATOMIK-ONAY-TASARIM.md` (veritabanı değişikliği gerektirir; uygulanmadı, onay bekler).

## Testler (16 Kasım, yerel / yalıtılmış)

| Test | Sonuç |
|---|---|
| `test/senaryo-site-yonetim-yetki.js` — sonraki paket, altın dosya `test/altin-site-yonetim-yetki.txt` | AYNI (sayfa hatası yok) |
| Aynı senaryo, önceki paket (`ad02222`) | boşta cari: A 1, C 1, B 1+1 (yukarıdaki tablo) |
| `stok-v2/test/guvenlik/t21/test21.sh` — gerçek PostgreSQL 16, depodaki site-portal / rls-rol / rls-kimlik | 38/38 |
| `test/kosu.sh` — tam takım (birim testleri + 266 tarayıcı senaryosu, yeni senaryo dahil; 4 paralel) | birim testlerinin hepsi temiz · senaryolar **265 AYNI, 1 FARKLI** · çıkış kodu 1 |
| `kontrol.sh`, `oludenetim.sh` (birleştirilmiş kaynak) | temiz |

Tek FARKLI: `tedarik-girisleri` — fark yalnız `"whatsappAcildi"`: beklenen `https://wa.me/905321234567`, gelen `""` (sipariş paylaş
menüsünün WhatsApp penceresi). Bu senaryo site / cari site paneli koduna dokunmuyor; depo `CLAUDE.md` bunu "bu ortamda ağ kısıtı
yüzünden FARKLI" diye bilinen test boşluğu olarak yazıyor. Kullanıcı yeni test turu istemediği için tek başına yeniden koşulmadı;
bu yüzden **geçti sayılmadı** — takım sonucu "1 FARKLI, değişiklikle ilgisi gösterilmedi ama ölçülerek dışlanmadı" olarak kayıtlı.

`t21` ölçtükleri: dört fonksiyonda kapı `begin`'den sonraki ilk ifade; ön kontrol fonksiyonları authenticated'da doğru cevap veriyor
(Yönetici true; Personel, cari yetkili Kullanıcı, listede olmayan false); Yönetici olmayan üç kimliğin beş doğrudan çağrısı da
42501 YETKI_YOK ile reddediliyor ve `site_hesaplari`, `site_oturumlari`, `site_kayit_talepleri`, `cariler` satır satır aynı kalıyor;
anon EXECUTE yetkisi yok; Yönetici onay / ret / silme çalışıyor; iş kuralıyla reddedilen onaylar (işlenmiş talep, alınmış ad, olmayan
cari) hiçbir tabloyu değiştirmiyor; negatif kontrol: kapısı kaldırılmış fonksiyonu test yakalıyor.
