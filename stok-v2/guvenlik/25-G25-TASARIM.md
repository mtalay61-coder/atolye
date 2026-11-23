# G-25 — `car_yaz` yetki genişliği: tasarım ve test planı

**Durum:** TASARIM. Uygulanmadı. Canlı SQL, yayın, PR yok. Faz 2'den ayrı.

**Kullanıcı (23 Kasım):** "Stok kaydetme yetkisi tek başına cari virmanı, ödeme veya tahsilata izin vermemeli; stok işlemlerinin
oluşturduğu bağlı cari hareketleri çalışmaya devam etmeli. Şimdilik yalnız tasarım ve test planı hazırla."

## 1. Bulgu (ölçülen)

`test/ekran/ekran-cari-virman.js` 7d — canlı benzeri yerel kopyada (A6'lı, Faz 0.4 envanteriyle hizalı), JWT'li `authenticated` rolüyle:
yalnız **stok kaydetme** yetkili kullanıcı (Ayşe), uygulamanın gönderdiği cari virmanı (CVR) isteğini kendi jetonuyla gönderdi;
**fiş kesildi, iki cari satırı yazıldı** (`test/ekran/sonuc-ekran-cari-virman-canli-*.txt`, üç koşu, kurallar kapalı / açık aynı).

## 2. Bugünkü sunucu yetki haritası (kaynaktan okundu)

`fis_kes` / `fis_tek_kes`'in KENDİ yetki denetimi yok; yetkiyi içte çağrılan yazıcılar denetliyor. `yetki_var_mi(moduller, islem)`
(rls-yazma.sql, A6): Yönetici her zaman; değilse listedeki modüllerden **herhangi birinde** yetki yeter. Jetonsuz çağrı (SQL Editor,
servis rolü) denetlenmez.

| Sunucu fonksiyonu (geçerli tanım) | Yazdığı | İstediği yetki (herhangi biri) |
|---|---|---|
| `car_yaz` (15-duzeltme) | cari satırı | cari, fisler, muhasebe, siparis, uretim, **stok**, tanimlar · kaydetme |
| `kas_yaz` (15-duzeltme) | kasa / banka satırı, çek | muhasebe, fisler, cari · kaydetme |
| `stk_yaz` (15-duzeltme) | stok satırı | stok, fisler, siparis, uretim, cari, muhasebe, tanimlar · kaydetme |
| `alt_yaz` (15 / 18) | sipariş kalemi / üretim ataması | siparis veya uretim, fisler, stok, cari · kaydetme |
| `fis_iptal`, `fis_iptal_toplu` (18) | fişin bütün satırlarını iptal | stok, fisler, siparis, uretim, cari, muhasebe · **silme** |
| `fis_bilgi` (18) | fiş başlığı bilgisi (irsaliye) | stok, fisler, siparis, uretim, cari, muhasebe · kaydetme |

Sonuç (çıkarım, test planında ölçülecek): stok yetkili kullanıcı **kasa ayağı olmayan** her cari fişini kesebilir (CVR, cari kartı
serbest hareketi, ürünsüz alış / satış, maaş / mesai tahakkuku). Kasa ayaklı TH / ÖD'de `kas_yaz` (muhasebe / fisler / cari) düşürür
ve fiş tek işlem olduğu için tümü geri alınır. Aynı genişlik silmede de var: stok **silme** yetkisi para fişini iptal edebilir.

Uygulamanın hazır rol şablonlarından **"Üretim"** (015 ROL_SABLONLARI: uretim + stok kaydetme, cari / muhasebe yok) tam bu
durumda: bu roldeki kullanıcı bugün cari virmanı yazabiliyor; ama üretim teslimindeki personel işçilik satırı (cari) onun için
çalışmaya devam etmeli.

## 3. Fiş türü envanteri ve önerilen yetki (istemci 1.744.36, `fis_kes` çağıran her yer)

Gruplar:
- **STOK** = stok, fisler, siparis, uretim · kaydetme (= bugünkü `stk_fis_kaydet` listesi) — stok hareketinin doğurduğu cari satırı
- **ÜRETİM** = uretim, stok, fisler, siparis · kaydetme — üretim teslimi / iş vermenin işçilik satırı
- **PARA** = cari, muhasebe · kaydetme (`fisler` dahil mi → karar K1) — stok hareketi olmayan cari satırı

| Önek | Tür | Nereden (src) | Ayaklar | Bugün stok-yetkili geçer mi | Önerilen cari ayağı | Stok / Üretim rolü için sonuç |
|---|---|---|---|---|---|---|
| AF / SF | Alış / Satış fişi (aile stok) | 089 cari fişi, 081 sipariş teslimi | stok + cari (+ alt) | evet | **STOK** | **çalışmaya devam** |
| TH / ÖD (bağlı) | Peşin ödeme makbuzu | 089 `bagli` | cari + kasa | hayır (kas_yaz) — ölçülecek | PARA | değişmez |
| ÜRT | Üretim teslimi, ara proses | 079, 080 | stok ± + personel işçilik cari + alt | evet | **ÜRETİM** | **çalışmaya devam** |
| NUM, ACL, MNL | Numune, açılış, bağımsız giriş / çıkış | 100, 152 | yalnız stok | — (cari yok) | — | değişmez |
| TH / ÖD | Tahsilat / Ödeme | 260 Ödeme & Tahsilat, 265 cari kartı, 338 sipariş ödemesi, 339 Banka Excel | cari + kasa / çek | hayır (kas_yaz) — ölçülecek | PARA | değişmez (zaten kapalı) |
| **CVR** | Cari virmanı | 260 / 337 | cari × 2 | **evet** | PARA | **kapanır** (istenen) |
| CH, AF / SF (aile para) | Cari kartı serbest hareket, ürünsüz alış / satış | 265 | yalnız cari | **evet** | PARA | **kapanır** |
| AF (aile para) | Demirbaş alımı | 273 kapasite | yalnız cari | **evet** | PARA (→ K3) | **kapanır** — üretim ekranında; karar |
| MAŞ | Maaş tahakkuku ("Onayla" düğmesi) | 100 `maasTahakkukOnayla` | yalnız cari | **evet** | PARA (→ K2) | **kapanır** — karar |
| MS | Mesai tahakkuku | 272 personel | yalnız cari | **evet** | PARA (→ K2) | **kapanır** — karar |
| ÇC / Çİ / ÇT | Çek ciro / iade / tahsil | 088 | cari + çek / kasa | hayır (kas_yaz) — ölçülecek | PARA | değişmez |
| VRM, GD, GL | Hesaplar arası aktarım, gider, gelir | 205, 260 | yalnız kasa | — (cari yok; kas_yaz) | — | değişmez |

Fişin grubunu SUNUCU belirler: önek + aile + fişte stok satırı olup olmadığı. AF / SF yalnız stok satırı VARSA STOK grubundadır;
stok satırsız AF / SF PARA'dır. ÜRT her zaman ÜRETİM. Listede olmayan önek → PARA (dar taraf; bilinmeyen tür para fişi sayılır).

**Sahtecilik sınırları** (öneki istemci gönderir; grup kuralları sunucuda — K4):
- STOK grubunda cari satırı: yön fiş türüyle tutarlı (Satış → Borç, Alış → Alacak); `islemTipi` / ödeme şekli Tahsilat, Ödeme,
  Virman OLAMAZ; satır carisi fişin carisi.
- ÜRETİM grubunda cari satırı: yalnız işçilik (Alacak), carisi Personel tipinde.
- Bu kurallar olmadan stok yetkili biri öneki "AF" yapıp bir stok satırının yanına keyfî cari satırı ekleyebilirdi.

## 4. Sunucu değişikliği (tasarım; SQL yazılmadı)

1. **`fis_cari_grubu(f jsonb, p_stok jsonb) returns text`** (yeni, saf): `'stok' | 'uretim' | 'para'` — yukarıdaki tablo.
2. **`fis_tek_kes`**: fişte cari satırı varsa, yazmadan ÖNCE `stk_yetki(<grup modülleri>, 'kaydetme')` + grup kuralları (§3).
   Bağlı fiş (`bagli`) kendi önekiyle ayrıca. Ret → tek işlem: hiçbir satır (stok / cari / kasa / alt) yazılmaz, fiş numarası tüketilmez.
3. **`car_yaz` doğrudan çağrı** (fiş kapısı dışında, satır taşıyorsa): yalnız PARA modülleri. Fiş kapısı içinden gelen çağrı
   `fis_tek_kes`'in kontrolüne güvenir (kapı işareti `fis.kapi` zaten var; 18). Kanıt: kural provası (23 Kasım, main 3f175bc / 1.744.36):
   274 senaryo, fiş yolunda eski yol hareket yazması **0**, satır taşıyan köprü isteği **0** → güncel istemci doğrudan `car_yaz`
   satırı göndermiyor. Risk: hâlâ açık eski sürüm sekmesi (sürüm kapısı kapalıysa) eski yoldan yazmaya çalışabilir — stok-yetkili
   değilse etkilenmez; stok-yetkiliyse reddedilir (istenen).
4. **`fis_iptal` / `fis_iptal_toplu`** (silme): aynı grup tablosu (K5). Stok silme yetkisi para fişini iptal edemez; STOK / ÜRETİM
   fişinin iptali bugünkü gibi.
5. **`stk_yetki` ret iletisi**: modül adı hep "stok" yazıyor → istenen grup ("Bu işlem için yetkiniz yok: cari / muhasebe kaydetme").
6. **İstemci (isteğe bağlı, K6)**: yetkisi olmayana Cari virmanı / Tahsilat / Ödeme düğmesi kapalı ve açıklamalı. Asıl koruma sunucu.

**Kapsam dışı gözlem (ayrı iş):** `stk_yaz` listesi cari, muhasebe ve tanimlar'ı da içeriyor — cari / muhasebe yetkili kullanıcı
stok satırı yazabilir (ters yönlü genişlik). G-25'e katılmadı.

**Paket (projenin alışkanlığı):** `25-onkosul-salt-okur.sql` → `25-car-yaz-yetki.sql` (Editor, tek Run) → `25-sonra-dogrula.sql`;
`25-car-yaz-yetki-geri-al.sql` (ayrı onay). Kaynaklar (`15-duzeltme.sql`, `18-fis-defteri.sql`) aynı tanımla güncellenir (yeniden
kurulumda geri gelmesin). Canlıya uygulama ayrı onay.

## 5. Test planı

**Ortam:** canlı benzeri yerel kopya (`test/ekran/kos-ekran-canli.sh`: kos-guvenlik → Faz 0.4 hizalama → A6 doğrulama → ekran
veritabanı envanterle yeniden karşılaştırma). Bütün denemeler JWT'li `authenticated` (köprü); SQL Editor / jetonsuz başarı kullanıcı
başarısı SAYILMAZ. Fiş kuralları ve sürüm kapısı: canlıdaki değer (önkoşul sorgusu); bilinmiyorsa iki ayarda da.

**Kullanıcılar:** Yönetici (Ali) · Muhasebe rolü (cari + muhasebe + fisler) · Üretim rolü (uretim + stok) · yalnız stok kaydetme
(Ayşe) · yalnız cari kaydetme · yalnız muhasebe kaydetme · yalnız fisler kaydetme · yalnız görüntüleme (Veli) · cari görüntüleme
(Deniz).

**Adım 0 — ÖNCE matrisi (ölçüm, değişiklik yok):** aşağıdaki her işlem × her kullanıcı, uygulamanın kendi isteğiyle (yakala → o
kullanıcının jetonuyla yeniden gönder) ve gerekli olanlarda ekrandan. Sonuç: geçti / ret kodu, yazılan satır sayısı (stok / cari /
kasa / alt), fiş açıldı mı. Tablo §3'teki "bugün" sütununu ÖLÇÜLMÜŞ hâle getirir (şu an çıkarım).

İşlemler: CVR · TH nakit · ÖD havale · TH çek · cari kartı serbest hareket (CH) · ürünsüz AF (cari kartı) · demirbaş AF · AF / SF
stok fişi (089, peşinsiz ve peşinli) · sipariş teslimi SF (081) · üretim teslimi ÜRT (işçilikli) · ara proses ÜRT (080) · MAŞ ·
MS · çek ciro / tahsil · VRM / GD / GL · NUM / MNL / ACL · her fişin `fis_iptal`'i · doğrudan `car_yaz` satırı (fiş dışı).

**Adım 1 — SONRA matrisi (beklenen):**
- Stok-yetkili ve Üretim rolü: CVR, CH, ürünsüz AF / SF, (K2 / K3'e göre) MAŞ / MS / demirbaş → **ret 42501**, hiçbir satır yok;
  AF / SF stok fişi, sipariş teslimi, ÜRT → **geçer** (bağlı cari satırları dahil); stok-only fişler değişmez.
- Muhasebe rolü, yalnız cari, yalnız muhasebe: PARA işlemleri geçer; STOK / ÜRETİM fişleri bugünkü gibi (bu iş değiştirmiyor).
- Yönetici: hepsi geçer. Görüntüleme kullanıcıları: hepsi ret (bugünkü gibi).
- Silme (K5): stok silme yetkisiyle PARA fişi iptali ret; STOK / ÜRETİM fişi iptali geçer.
- Doğrudan `car_yaz` satırı: PARA modülü olmayan her kullanıcıya ret.

**Adım 2 — sahtecilik:** stok-yetkili kullanıcı (a) öneki "AF" yapıp stok satırı OLMADAN cari satırı → ret; (b) stok satırlı AF'ye
Tahsilat / Virman tipli ya da yönü ters cari satırı → ret; (c) ÜRT ile müşteri carisine Borç → ret; (d) bilinmeyen önek → PARA → ret.

**Adım 3 — tek işlem:** her retten sonra stok / cari / kasa / alt satır sayıları, `stk_fis`, `fis_sayac` önceki hâlle aynı.

**Adım 4 — ekrandan:** Üretim rolündeki kullanıcı giriş ekranından girer → üretim teslimi yapar (işçilik cariye düşer) ✓; Ödeme &
Tahsilat › Cari virmanı → "yetkiniz yok: cari / muhasebe" ✓, sunucuda değişiklik yok.

**Adım 5 — regresyon:**
- `stok-v2/test/kos.sh` (sinama-fis / -cari / -kasa / -alt dahil) — yeni beklentilerle
- `stok-v2/test/guvenlik/kos-guvenlik.sh` (davranış bataryası: anon / veli / ali)
- kos-butunluk, `t24` (A6 / silme_koruma), `ta6/test-a6.sh`
- `test/kosu.sh` tam (birim + 274 senaryo) — istemci değişirse
- `test/kural-provasi.js` (eski yol hareket yazması 0 kalmalı)
- `test/ekran/kos-ekran.sh` (stok / kasa) ve `kos-ekran-canli.sh` (cari virmanı 29 + yeni yetki matrisi)
- Faz 0.4 envanter karşılaştırması: yeni fark yalnız değişen fonksiyonlarda (car_yaz, fis_tek_kes, fis_iptal, yeni fis_cari_grubu)
- Geri alma: uygulanır → ÖNCE matrisi ve envanter birebir geri; ikinci uygulama zararsız; geri almadan sonra yeniden uygulama aynı

**Canlı (ayrı onaylarla):** önkoşul salt okur (`car_yaz` / `fis_tek_kes` / `fis_iptal` gövde md5 canlı = beklenen, A6 UYGULANMIŞ,
`fis_kural_aktif()`, `min_istemci_surum`, rol dağılımı SAYIMI — kimlik / e-posta dökülmez: kaç kullanıcı PARA modülü olmadan
stok / uretim kaydetmeli) → uygulama → sonra-doğrula → cihazda: Üretim rolündeki gerçek kullanıcıyla üretim teslimi ✓, cari virmanı ✗.

## 6. Kullanıcı kararları

- **K1** PARA grubu: yalnız cari / muhasebe mi, `fisler` kaydetme de yetsin mi? (Muhasebe rol şablonu üçünü de veriyor.)
- **K2** Maaş (MAŞ "Onayla") ve mesai (MS) tahakkuku: PARA mı, üretim yetkisi de yetsin mi (bölüm sorumlusu mesai giriyorsa)?
- **K3** Demirbaş alımı (üretim ekranı, cari ayaklı ürünsüz AF): PARA mı (Üretim rolü yapamaz olur) yoksa ayrı izin mi?
- **K4** Sahtecilik kuralları (§3): uygulansın mı? (Önerim: evet; yoksa önek değiştirerek atlanır.)
- **K5** Silme tarafı (`fis_iptal`) aynı tabloyla kapsansın mı? (Önerim: evet, aynı paket.)
- **K6** İstemcide yetkisize düğme kapatma bu işe mi, sonraya mı?
