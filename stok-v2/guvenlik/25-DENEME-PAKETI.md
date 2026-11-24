# G-25 + 1.745.0 — DENEME PROJESİ PAKETİ (SQL ve istemci 1.745.1 birlikte)

**Kapsam:** yalnız DENEME Supabase projesi (`drtmnovafswzcmpacubl`). **Canlı (`mqdgucoomgqcvhvgixbl`) için DEĞİL.** `main`'e
birleştirme, `surum.json`, yayın YOK. Faz 2 ayrı. Her SQL adımı ayrı onay; kullanıcı SQL Editor'den kendisi çalıştırır.
Dal: `claude/g25-sql`. Tasarım: `25-G25-TASARIM.md`; paket ayrıntısı: `25-PAKET.md`.

**Neden birlikte:** G-25 SQL'i 1.744.36'da bugün çalışan işleri (maaş / mesai tahakkuku, personel maaşı, PARA'sız kullanıcının
para fişleri, onaysız ücretle işçilik) sessizce durdurur (tasarım § 5, ekrandan ölçüldü). 1.745.0 o işlerin yeni yolunu (mesai
bildirimi, Onaylar, ücret / tamir onayı) ve kapalı-gerekçeli düğmeleri getirir. İkisi ayrı ayrı denenmez.

## 0. Hazırlık (salt okur)

1. Supabase › **deneme projesi** (`drtmnovafswzcmpacubl` — adres çubuğundan doğrula) › SQL Editor.
2. `25-onkosul-salt-okur.sql` (dosyanın tamamı, Run) → **GENEL = HAZIR** olmalı.
   - KARIŞIK / FARKLI → DUR; satır 2–6'yı bildir (deneme projesi canlının G-25 öncesi hâlinde değil — A6 ya da fiş defteri farklı).
   - Satır 8: kaç kullanıcının etkileneceğini SAYAR (ad / e-posta dökmez).

## 1. SQL (deneme projesinde; her adım ayrı onay; dosyaların özeti `25-deneme/SABIT.md`)

| Adım | Dosya | Beklenen |
|---|---|---|
| 1 | `25-onkosul-salt-okur.sql` | GENEL HAZIR |
| 2 | `25-cari-yetki-uygula.sql` (tamamı, tek Run) | son satır GENEL "UYGULANDI"; yeni fonksiyonlar 21; tablolar mes_bildirim, ucr_onay, isc_odeme |
| 3 | `25-sonra-dogrula-salt-okur.sql` | 10 kontrol "tamam", GENEL TAMAM |
| 4 | `25-onkosul-salt-okur.sql` | GENEL UYGULANMIŞ |

Uygulama tek `do` bloğudur (Editor `begin` / `commit`'i düşürür; atomiklik oradan): önkoşul tutmazsa ya da herhangi bir adım
düşerse HİÇBİR ŞEY değişmez (yerelde son adım bilerek düşürülerek sınandı). İkinci uygulama reddedilir.

## 2. İstemci 1.745.1 — YALNIZ KORUMALI YEREL SUNUCUYLA (deneme projesine bağlı, canlıdan ayrı)

- Sabitlenmiş commit ve SHA-256 özetleri: `25-deneme/SABIT.md` (SQL dosyaları + `atolye-erp-v1.745.1.html`). Başka bir dosya / özet
  kullanılmaz.
- `25-deneme/korumali-sunucu.js`: yalnız 127.0.0.1; yalnız sabit HTML (özet her istekte denetlenir, değişirse 409); her yanıtta CSP —
  tarayıcı YALNIZ `https://drtmnovafswzcmpacubl.supabase.co` (+ wss) ve `esm.sh`'a bağlanabilir; `/` firma seçimini deneme projesine
  yazar. Gizli anahtar verilirse başlamaz. Ayrı köken = ayrı yerel depo (canlı cihaz verisine dokunmaz).
- `25-deneme/korumali-sunucu-dogrula.js` (25 Kasım, 11 / 11): firma seçimi bilerek ANA projeye ayarlanıp uygulama açıldığında
  uygulamanın ana projeye 31 bağlantı denemesinin hepsi tarayıcıda engellendi (CSP ihlali), ana projeden yanıt 0; uygulama
  "İnternet bağlantısı yok" kilidine geçti (kayıt girilemez). Ek katman: deneme oturumunun ağ ortamı (`atolye-deneme`) yalnız deneme
  projesine ve esm.sh'a izin verir; ana proje vekil sunucuda da engelli.
- Elle açmak için: `DENEME_ANAHTAR=sb_publishable_… node stok-v2/guvenlik/25-deneme/korumali-sunucu.js atolye-erp-v1.745.1.html <sha256>`
  → `http://127.0.0.1:8725/`. erp.newdiamond.com.tr'de AÇILMAZ.

## 3. Deneme kullanıcıları ve verisi (deneme projesinde, Yönetici ile Tanımlar'dan)

| Kullanıcı | Yetki | Ne sınanır |
|---|---|---|
| Muhasebe | cari + muhasebe kaydetme | Onaylar (mesai, ücret, tamir), maaş şeridi, para fişleri |
| Üretim | üretim + stok kaydetme (cari görüntüleme YOK) | mesai bildirimi, teslim, tamir talebi; Cari menüsü yok |
| Şef | cari GÖRÜNTÜLEME + üretim / stok / fişler kaydetme | cari kartında "Mesaiyi onaya gönder"; maaş kutusu ve para düğmeleri kapalı |

Veri: bir bölüm (ör. Kesimhane) ve maaşlı bir personeli; bölümde OLMAYAN parça başı bir personel (Personel tipi); proses ücreti
olan bir mamul (ör. Kesim 35); o ürünle bir üretim ve parça başı personele verilmiş bir iş.

## 4. Kontrol listesi (yerel ekran sınaması `test/ekran/ekran-g25-akis.js` 33 / 33 ile aynı adımlar)

0. **Salt okur:** `25-onkosul-salt-okur.sql` (GENEL HAZIR beklenir) + `25-deneme/durum-salt-okur.sql` (yalnız sayılar).
1. **Üretim** kullanıcısı: Üretim › Ücret onayları → iş (ör. "Kesim · personel · 10 adet × 35 ₺") onay bekliyor.
2. Üretim: işi teslim al → **reddedilir**: "… Kesim işi (10 adet × 35 ₺) cari / muhasebe onayı bekliyor …"; fiş yok, iş ustada.
3. Üretim: Üretim › Mesai bildirimi → maaşlı personele hafta içi 10 s → "onay bekliyor"; TUTAR YOK.
4. Üretim: maaş şeridi yok; Cari menüsü yok (cari görüntüleme yoksa).
5. **Şef**: cari kartı › Bilgiler → maaş / aylık saat kapalı; "Mesaiyi onaya gönder" var, "Mesaiyi yaz" yok.
6. **Yönetici / Muhasebe**: "Onay bekliyor" şeridi → Onaylar › Ücretler → işi seç → onayla; Mesai → Onayla → TEK MS fişi.
7. Yönetici / Muhasebe: Onaylar › Ücretler'de tamir işi (önerilen ücretle) → ücret kutusuna kendi ücretini yaz → onayla.
8. Üretim: **kısmi teslim** — SAĞLAM kutusuna 6 → geçer (6 × 35); kalan 4 aynı ustada yeni parça; iş onayı geçerli kalır.
9. Üretim: kalan 4'ü teslim → geçer; işte ödenen toplam = onaylanan 10.
10. **Tekrar deneme:** aynı teslimi yeniden göndermek (çift basış / yenileme) ikinci fiş açmaz.
11. **İptal:** Yönetici / Muhasebe bir teslim fişini iptal eder → fiş ve satırları iptal, ödeme sayılmaz; yeniden teslim tek geçerli fiş.
12. **Değişiklik → yeniden onay:** onaylı işin miktarı / kişisi ya da ürün ücreti değişince Onaylar'da "DEĞİŞTİ — yeniden onay
    gerekir"; onaylanmadan teslim reddedilir.
13. Üretim: Mesai bildirimi → aynı ay "onaylandı", Bildir kapalı.

Sorun olursa: ekran görüntüsü + bildirim metni. Deneme verisi silinmez, sıfırlanmaz.

## 5. Geri alma (deneme projesinde, ayrı onay)

`25-cari-yetki-geri-al.sql` — **yetki açığını yeniden açar** (stok / üretim yetkilisi yine cari virmanı, tahsilat, maaş / mesai
tahakkuku, onaysız ücretle işçilik yazabilir; PARA fişlerini stok silme yetkisiyle iptal edebilir). Kesilmiş fişlere dokunmaz;
mes_bildirim / ucr_onay / isc_odeme doluysa silinmez, `guvenlik` şemasına arşivlenir. Geri alındıktan sonra 1.745.0'ın yeni
ekranları "fonksiyon yok" iletisi gösterir — istemci de 1.744.36'ya dönülür.

## 6. Denemeden SONRA (bu pakette YOK — ayrı kararlar)

- Canlı uygulama ve yayın sırası; canlıda ilk toplu iş onayı (Onaylar › Ücretler › "Onaysızların tümünü seç") — onaysız işin teslim
  işçiliği yazılmaz; açık işler toplu onaylanmadan PARA'sız kullanıcının üretim teslimi durur, sonra her yeni iş için onay gerekir.
- Kaynak dosyaların G-25 işlenmiş hâliyle depoya girmesi (`25-uret.py --kaynaga-isle .`) — canlıyla AYNI ANDA.
- Canlıdan üretilen kurulum dosyasının boş projede doğrulanması (Faz 4) genel yayından önce zorunlu.
