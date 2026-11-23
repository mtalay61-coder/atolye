# G-25 — `car_yaz` yetki genişliği: tasarım, kabul ölçütleri, test planı

**Durum:** TASARIM KARARLARLA GÜNCELLENDİ (23 Kasım). SQL paketi ve yerel testler ayrı dalda (`claude/g25-sql`). Canlıya uygulama,
`main`'e birleştirme, yayın YOK. Faz 2 ve "muhasebe yetkisiyle stok yazma" gözlemi ayrı.

## 1. Bulgu (ölçülen)

`test/ekran/ekran-cari-virman.js` 7d — canlı benzeri yerel kopya, JWT'li `authenticated`: yalnız **stok kaydetme** yetkili kullanıcı
uygulamanın cari virmanı (CVR) isteğini kendi jetonuyla gönderdi; fiş kesildi, iki cari satırı yazıldı.

## 2. Bugünkü sunucu yetki haritası

`fis_kes` / `fis_tek_kes`'in KENDİ yetki denetimi yok; yetkiyi içte çağrılan yazıcılar denetliyor. `yetki_var_mi(moduller, islem)`
(rls-yazma.sql, A6): Yönetici her zaman; değilse listedeki modüllerden **herhangi birinde** yetki yeter; jetonsuz çağrı (SQL Editor,
servis rolü) denetlenmez.

| Fonksiyon (geçerli tanım) | Yazdığı | İstediği (herhangi biri) |
|---|---|---|
| `car_yaz` (15-duzeltme) | cari satırı | cari, fisler, muhasebe, siparis, uretim, **stok**, tanimlar · kaydetme |
| `kas_yaz` (15-duzeltme) | kasa / banka, çek | muhasebe, fisler, cari · kaydetme |
| `stk_yaz` (15-duzeltme) | stok satırı | stok, fisler, siparis, uretim, cari, muhasebe, tanimlar · kaydetme |
| `fis_iptal` (+ `fis_iptal_toplu` onu çağırır) | fişin ve bağlı fişin bütün satırları | stok, fisler, siparis, uretim, cari, muhasebe · silme |

`car_hareket`'e oturum rolünün doğrudan yazma yetkisi yok (canlı envanter: `auth -`): cari satırının tek kapıları `car_yaz` ve onu
çağıran güvenli tanımlı fonksiyonlar (`fis_tek_kes`, eski "zarf" yazıcıları). Fiş kuralları kapalıyken (canlıda son kayıt) `car_yaz`
fiş dışından da satır yazar.

## 3. Kararlar (kullanıcı, 23 Kasım)

| | Karar |
|---|---|
| **K1** | Tahsilat, ödeme ve cari virmanı **cari VEYA muhasebe kaydetme** ister. Yalnız `fisler` kaydetme yetmez. |
| **K2** | Mesai MİKTARINI girmek ile parasal tahakkuku ayır. Üretim yetkilisi mesai saatini girebilir; ücret belirleme, maaş / mesai tahakkukunu onaylama ve ödeme cari / muhasebe yetkisi ister. |
| **K3** | Demirbaş alımı yalnız üretim / stok yetkisine kapalı; cari veya muhasebe kaydetme ister. |
| **K4** | Sahtecilik korumaları ZORUNLU. Önek, aile ya da isteğe stok satırı eklemek tek başına yetki sağlamaz. Sunucu cari hareketinin gerçek stok / üretim işlemiyle bağlantısını, carisini, yönünü, tutarını ve para birimini doğrular. Sahte stok satırıyla para işlemini geçirme denemesi test edilir. |
| **K5** | İptal aynı pakette: ilgili grubun SİLME yetkisi; grup istemcinin gönderdiğinden değil KAYITLI fişin içeriğinden; iptal bütün bağlı satırları birlikte geri alır. |
| **K6** | Yetkisiz işlemler arayüzde de kapalı; asıl koruma sunucuda. |

## 4. Kural (sunucu)

**Gruplar:** PARA = cari, muhasebe · STOK = stok, fisler, siparis, uretim · ÜRETİM = uretim, stok, fisler, siparis.

**Kaydetme (`fis_kes`, yazmadan önce; ana fiş ve bağlı fiş ayrı ayrı):**
1. Fişte cari satırı yoksa bu kural devreye girmez (VRM / GD / GL / MNL / ACL / NUM bugünkü gibi).
2. Jetonsuz çağrı (yönetim) geçer. **PARA kaydetme** yetkisi olan (Yönetici dahil) geçer — bugünkü muhasebe kullanıcılarının bütün
   işlemleri aynen sürer; bağlantı kuralının kaçırabileceği bir kenar durum onları etkilemez.
3. Değilse fişin grubu sunucuda belirlenir: önek AF / SF + aile `stok` + stok satırı var → STOK; önek ÜRT → ÜRETİM; **geri kalan her şey
   PARA → 42501** ("cari veya muhasebe kaydetme yetkisi gerekir"). Bilinmeyen önek de PARA.
4. STOK / ÜRETİM'de: grubun kaydetme yetkisi + **bağlantı denetimi** (aşağıda). Biri tutmazsa 42501, gerekçesiyle. Ret → tek işlem:
   stok / cari / kasa / kalem satırı, fiş başlığı, fiş numarası sayacı — hiçbiri yazılmaz.

**STOK bağlantısı (K4)** — her cari satırı için:
- aynı kimlikte bir stok satırına bağlı (uygulama cari satırına stok satırının kimliğini veriyor; 23 Kasım derlemi: 175 / 175 satır);
  bir stok satırına en fazla bir cari satırı
- carisi fişin carisi (stok satırında cari varsa o da aynı)
- tür ↔ önek: AF = Alış, SF = Satış; yön: Alış → Alacak, Satış → Borç; stok miktarı işareti: Alış > 0, Satış < 0
- işlem tipi boş ya da fişin türü (Tahsilat / Ödeme / Virman … değil)
- `ek.miktar` = |stok miktarı|; matrah = miktar × birim fiyat (±0,011); KDV varsa KDV = matrah × oran (±0,011) ve tutar = matrah + KDV
- para birimi fişin para birimi; bütün satırlarda aynı
- fişte kasa / çek satırı YOK (peşin ödeme bağlı makbuzdadır ve o PARA'dır)

**ÜRETİM bağlantısı (K4)** — her cari satırı için:
- fişin üretim kaydı (`uretimId`) sunucuda VAR; satırın `uretim_id`'si o
- işlem tipi İşçilik, yön Alacak, para birimi TRY; miktar > 0, birim fiyat > 0, tutar = miktar × birim fiyat (±0,011)
- **(cari, birim fiyat) çifti gerçek bir kaynaktan:** o üretimin atamaları (sunucudaki + aynı istekte gelen) → (atanan personel, ürünün
  proses ücreti — `urunler.proses_ucretleri` / numunede üretim kaydındaki; tamirde atamanın tamir ücreti); ara prosesler →
  (ürüne özel cari ya da tanımın carisi, ürüne özel ücret ya da tanımın ücreti)
- miktar ≤ üretim adedi
- fişte kasa / çek satırı YOK

**`car_yaz` fiş dışından** (kapı kapalı; eski zarf yazıcıları): satır ya da iptal → PARA kaydetme. Kanıt: kural provası (main 3f175bc /
1.744.36): 274 senaryo, eski yol hareket yazması 0, satır taşıyan köprü isteği 0 — güncel istemci bu yolu kullanmıyor.

**İptal (`fis_iptal`, K5)** — iptal edilecek fiş ve bağlı fişi için, KAYITLI satırlardan:
- stok satırı → bugünkü liste · silme (değişmiyor; "muhasebe ile stok" gözlemi ayrı)
- kasa / çek satırı → muhasebe, fisler, cari · silme (kas_yaz'ın listesi)
- cari satırı → PARA silme; değilse kayıtlı içerik STOK (önek AF / SF, stok satırı var, her cari satırı fişin bir stok satırının
  kimliğinde) ise STOK silme, ÜRETİM (önek ÜRT, her cari satırı İşçilik) ise ÜRETİM silme; hiçbiri değilse 42501
- iptal ana fiş + bağlı fişin stok, cari, kasa, çek satırlarını TEK işlemde kapatır (bugünkü davranış; test edilir)

**Mesai (K2) — mevcut yapı ayıramıyor, çözüm:**
- BUGÜN: saat cari kartındaki personel panelinde girilir, tutar aynı anda hesaplanır ve doğrudan MS para fişi olarak cariye yazılır;
  ara kayıt yok. Ücret (`tanimlar.bolumler[].personel[].maas`, `aylikSaat`, `mesaiAyar` katları) `tanimlar`'da ve `tanimlar`'a
  oturum rolünün yazma yetkisi açık (canlı envanter `auth IUD`) — ücreti bugün herkes değiştirebilir.
- ÇÖZÜM:
  - `mes_bildirim` (yeni tablo, doğrudan erişim yok): personel, ay, saatler (hafta içi / Cumartesi / Pazar), durum (bekliyor /
    onaylandı / iptal), giren, onaylayan, fiş no. **Para tutmaz.**
  - `mesai_bildir` — üretim (ya da cari / muhasebe) kaydetme: bekleyen bildirimi ekler / günceller; personel bir bölümde olmalı;
    onaylanmış ay değişmez. `mesai_bildirimleri` (görüntüleme) ve `mesai_bildirim_iptal` (bekleyeni iptal).
  - `mesai_onayla` — PARA kaydetme: bekleyen bildirim kilitlenir, MS fişi (`fis_kes`) kesilir, bildirim "onaylandı" + fiş no — TEK işlem.
  - MS ve MAŞ fişleri PARA (kural 3) — tahakkuk ve ödeme cari / muhasebe ister.
  - Ücret koruması (`tanimlar` tetikleyicisi): personel maaşı, aylık saati ya da mesai katları değişen yazma PARA kaydetme ister
    (bölüm adı / personel listesi gibi öteki değişiklikler serbest).
- İSTEMCİ (sonraki adım, K6 ile): Üretim › Atölye İçi Bölümler'de saat girişi (`mesai_bildir`, tutar gösterilmez); cari / muhasebe
  kullanıcısına bekleyen bildirimler + "Onayla" (`mesai_onayla`).

**İstemci (K6, sonraki adım — ayrı sürüm):** kullanıcının yetkisine göre Ödeme & Tahsilat (tahsilat / ödeme / cari virmanı / çek),
cari kartı hareket formu, demirbaş alımı, maaş "Onayla", mesai tutarı, iptal düğmeleri kapalı ve açıklamalı. Sunucu kuralı asıl koruma.

**Dağıtım sırası:** SQL paketi istemciden önce uygulanabilir: güncel istemcide PARA kullanıcılarının bütün işlemleri değişmez; yetkisiz
kullanıcı sunucudan anlaşılır ret alır. Mesai: bugün saat girişi cari kartında ve Üretim rolü cari kartını görmüyor — SQL'den sonra da
PARA kullanıcıları eskisi gibi girer; Üretim rolünün saat girişi istemci adımıyla gelir.

## 5. Etkilenecek mevcut işlemler

Stok / Üretim rolü (PARA yetkisi YOK) için **kapanacaklar:** cari virmanı · cari kartı serbest hareketi ve ürünsüz alış / satış ·
demirbaş alımı · maaş tahakkuku onayı · mesai tutarı yazma (saat girişi `mesai_bildir` ile açık) · peşin ödemeli alış / satış (bağlı
makbuz PARA) · personel maaşı / aylık saat / mesai katı değiştirme · PARA fişlerinin (ve kasa satırlı fişlerin) iptali.

**Devam edecekler:** stoklu alış / satış fişi · sipariş teslimi · üretim teslimi ve ara proses işçiliği · numune · stok giriş / çıkış /
açılış · stok / üretim fişlerinin iptali (silme yetkisiyle) · mesai saati bildirimi.

**Değişmeyenler:** PARA yetkili kullanıcıların (Muhasebe, Üretim + Muhasebe, Yönetici) bütün işlemleri; cari satırı olmayan fişler.

## 6. Kabul ölçütleri

Hepsi canlı benzeri yerel kopyada (A6'lı, Faz 0.4 envanteriyle hizalı), **JWT'li `authenticated`** ile; jetonsuz / SQL Editor
başarısı kullanıcı başarısı sayılmaz.

- **A1** Stok-only ve Üretim rolü: CVR, TH (nakit), CH, ürünsüz AF, demirbaş AF, MAŞ, MS, peşinli SF → 42501; stoklu AF / SF, ÜRT
  (atama işçiliği ve ara proses) → geçer.
- **A2** Yalnız `fisler` kaydetme: CVR / TH / CH → 42501 (K1).
- **A3** Cari-only, muhasebe-only, Muhasebe rolü, Yönetici: bütün PARA işlemleri geçer (bugünkü gibi).
- **A4** Sahtecilik (stok / üretim yetkilisiyle), her biri 42501: (a) TH isteğine stok satırı ekleme; (b) öneki AF yapıp cari satırını
  Tahsilat tipiyle yazma; (c) cari satırı kimliği stok satırına uymuyor; (d) tutar miktar × birim fiyattan farklı; (e) başka cari;
  (f) Satış'ta yön Alacak; (g) stok fişine kasa satırı; (h) ÜRT'de atanmamış cariye işçilik; (i) ÜRT'de ücret kaynakta yok; (j) ÜRT
  miktarı üretim adedinden büyük; (k) bilinmeyen önek; (l) var olmayan üretim kaydı.
- **A5** Her retten sonra stok / cari / kasa satırı, fiş başlığı ve fiş numarası sayacı aynı (tek işlem).
- **A6** İptal: stok silme yetkilisi stoklu AF'yi iptal eder (stok + cari birlikte); CVR / TH / VRM'yi ve peşinli SF'yi iptal EDEMEZ;
  PARA silme yetkilisi PARA fişlerini iptal eder; peşinli fiş iptalinde ana + bağlı fişin bütün satırları birlikte kapanır; yalnız
  kaydetme yetkilisi hiçbirini iptal edemez.
- **A7** `car_yaz` fiş dışından: stok-only satır ve iptal → 42501; PARA → geçer.
- **A8** Mesai: Üretim rolü saat bildirir (cari satırı oluşmaz) ✓; Üretim rolü onaylayamaz ✗; Muhasebe onaylar → tek MS fişi + bildirim
  onaylandı ✓; onaylı ay yeniden bildirilemez; Üretim rolü maaş / mesai katı değiştiremez ✗, bölüm adını değiştirebilir ✓; Muhasebe
  maaşı değiştirebilir ✓.
- **A9** Paket: önkoşul tutmazsa hiçbir şey değişmez; ikinci uygulama reddedilir; uygulama sonrası Faz 0.4 envanterinde YALNIZ beklenen
  satırlar değişir; geri alma sonrası envanter ve davranış matrisi uygulama ÖNCESİYLE birebir (**açık yeniden açılır** — A1 / A4'ün
  geçen satırları geri gelir); geri almadan sonra yeniden uygulama ilk uygulamayla aynı.
- **A10** Regresyon: uygulanmış kopyada ekran testleri (cari virmanı 29, stok, kasa) Yönetici ile temiz; güncel istemci kural provası
  değişmez (istemci değişmedi).

## 7. Geri alma

`25-cari-yetki-geri-al.sql` bütün değişikliği yedekteki tanımlarla geri alır. **Geri alma yetki açığını YENİDEN AÇAR:** stok / üretim
yetkilisi yine cari virmanı, cari kartı hareketi, ürünsüz alış / satış, maaş / mesai tahakkuku yazabilir ve PARA fişlerini stok silme
yetkisiyle iptal edebilir; maaş / mesai katı yine herkesçe değiştirilebilir. Mesai bildirimleri silinmez: tablo boş değilse
`guvenlik` şemasına arşivlenir (uygulama erişemez).

## 8. Kalan riskler / ayrı kararlar

- **Proses ücretinin kendisi:** ÜRETİM bağlantısı ücreti ürün kartından / ara proses tanımından doğrular; o ücretleri stok yetkilisi
  ürün kartında, tanımlar yetkilisi ara proses tanımında değiştirebilir. Ücret değiştirip işçilik yazmak iki adımlı bir kötüye kullanım
  olarak kalır — ayrı karar (ör. proses ücreti de PARA ister).
- **Stoklu alış / satışta fiyat:** stok yetkilisi fiyatı belirler (bu onun işi); bağlantı kuralı tutarın miktar × fiyat olduğunu ve
  gerçek bir stok hareketine bağlı olduğunu doğrular, fiyatın makullüğünü değil.
- "Muhasebe yetkisiyle stok yazma" (`stk_yaz` listesi) — ayrı iş.
