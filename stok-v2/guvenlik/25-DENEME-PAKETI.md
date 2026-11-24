# G-25 + 1.745.0 — DENEME PROJESİ PAKETİ (SQL ve istemci birlikte)

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

## 1. SQL (deneme projesinde; her adım ayrı onay)

| Adım | Dosya | Beklenen |
|---|---|---|
| 1 | `25-onkosul-salt-okur.sql` | GENEL HAZIR |
| 2 | `25-cari-yetki-uygula.sql` (tamamı, tek Run) | son satır GENEL "UYGULANDI"; yeni fonksiyonlar 21; tablolar mes_bildirim, ucr_onay, isc_odeme |
| 3 | `25-sonra-dogrula-salt-okur.sql` | 10 kontrol "tamam", GENEL TAMAM |
| 4 | `25-onkosul-salt-okur.sql` | GENEL UYGULANMIŞ |

Uygulama tek `do` bloğudur (Editor `begin` / `commit`'i düşürür; atomiklik oradan): önkoşul tutmazsa ya da herhangi bir adım
düşerse HİÇBİR ŞEY değişmez (yerelde son adım bilerek düşürülerek sınandı). İkinci uygulama reddedilir.

## 2. İstemci 1.745.0 (deneme projesine bağlı, CANLI cihaz verisinden AYRI)

- Dosya: dalda `atolye-erp-v1.745.0.html`. **erp.newdiamond.com.tr'de AÇILMAZ** (orada canlı firma seçili ve cihazın bekleyen
  kayıtları var). Ayrı bir kökenden açılır — örn. bilgisayarda dosyayı indirip bir klasörde `python3 -m http.server 8080`,
  sonra `http://localhost:8080/atolye-erp-v1.745.0.html`. Ayrı köken = ayrı yerel depo; canlı cihaz verisine dokunmaz.
- Giriş ekranı › Firma satırı › **Değiştir › Gelişmiş**: adres `https://drtmnovafswzcmpacubl.supabase.co` + deneme projesinin
  **Publishable** anahtarı (Settings › API Keys; `sb_publishable_…` — secret anahtar uygulama tarafından reddedilir, girilmez).
- Bu yol yerelde sınanmadı (dosyanın ayrı kökenden açılması); açılmazsa ne gördüğünüzü bildirin — başka bir önizleme yolu ayrı
  karar ister (yayın yok).

## 3. Deneme kullanıcıları ve verisi (deneme projesinde, Yönetici ile Tanımlar'dan)

| Kullanıcı | Yetki | Ne sınanır |
|---|---|---|
| Muhasebe | cari + muhasebe kaydetme | Onaylar (mesai, ücret, tamir), maaş şeridi, para fişleri |
| Üretim | üretim + stok kaydetme (cari görüntüleme YOK) | mesai bildirimi, teslim, tamir talebi; Cari menüsü yok |
| Şef | cari GÖRÜNTÜLEME + üretim / stok / fişler kaydetme | cari kartında "Mesaiyi onaya gönder"; maaş kutusu ve para düğmeleri kapalı |

Veri: bir bölüm (ör. Kesimhane) ve maaşlı bir personeli; bölümde OLMAYAN parça başı bir personel (Personel tipi); proses ücreti
olan bir mamul (ör. Kesim 35); o ürünle bir üretim ve parça başı personele verilmiş bir iş.

## 4. Kontrol listesi (beklenen sonuçlar — yerel ekran sınaması `test/ekran/ekran-g25-akis.js` ile aynı adımlar, 31 / 31)

1. **Üretim** kullanıcısı: Üretim › Ücret onayları → "Kesim ücreti 35 ₺" onay bekliyor.
2. Üretim: işi teslim al → **reddedilir**, bildirimde "… Kesim ücreti (35 ₺) cari / muhasebe onayı bekliyor …"; fiş yok, iş
   ustada kalır.
3. Üretim: Üretim › Mesai bildirimi → maaşlı personele hafta içi 10 s → "onay bekliyor"; ekranda TUTAR YOK.
4. Üretim: maaş şeridi yok; Cari menüsü yok.
5. **Şef**: cari kartı › Bilgiler → maaş / aylık saat kutusu kapalı ("cari veya muhasebe kaydetme yetkisi gerekir"); "Mesaiyi
   yaz" yok, "Mesaiyi onaya gönder" var; cari kartı hareketi Kaydet kapalı (Ödeme & Tahsilat ve cari virmanı menüsü muhasebe
   görüntülemesi ister — Şef'te zaten yok; muhasebe GÖRÜNTÜLEMESİ olan ama kaydetmesi olmayan kullanıcıda Kaydet kapalı görünür).
6. **Muhasebe**: üstte "Onay bekliyor" şeridi → Onaylar › Ücretler → Kesim seç → "Seçilenleri onayla"; Mesai → tutar
   (maaş / 225 × saat × kat) → Onayla → TEK MS fişi; satır listeden düşer.
7. Muhasebe: Onaylar › Ücretler'de bir tamir talebi (önerilen ücretle) → ücret kutusuna kendi ücretini yaz → onayla.
8. Üretim: aynı teslim → **geçer**: tek ÜRT fişi, personel carisine adet × 35 Alacak.
9. Üretim: Mesai bildirimi → aynı ay "onaylandı", Bildir kapalı.
10. Muhasebe: ürün kartında Kesim ücretini değiştir → Onaylar'da "DEĞİŞTİ — yeniden onay gerekir"; onaylanmadan teslim reddedilir.

Sorun olursa: ekran görüntüsü + bildirim metni + (varsa) Supabase › Logs. Deneme verisi silinmez.

## 5. Geri alma (deneme projesinde, ayrı onay)

`25-cari-yetki-geri-al.sql` — **yetki açığını yeniden açar** (stok / üretim yetkilisi yine cari virmanı, tahsilat, maaş / mesai
tahakkuku, onaysız ücretle işçilik yazabilir; PARA fişlerini stok silme yetkisiyle iptal edebilir). Kesilmiş fişlere dokunmaz;
mes_bildirim / ucr_onay / isc_odeme doluysa silinmez, `guvenlik` şemasına arşivlenir. Geri alındıktan sonra 1.745.0'ın yeni
ekranları "fonksiyon yok" iletisi gösterir — istemci de 1.744.36'ya dönülür.

## 6. Denemeden SONRA (bu pakette YOK — ayrı kararlar)

- Canlı uygulama ve yayın sırası; canlıda ilk toplu ücret onayı (Onaylar › Ücretler › "bütün ürünlerin ücretleri") — onaysız
  ücretle teslim işçiliği yazılmaz, toplu onay yapılmadan üretim teslimi durur.
- Kaynak dosyaların G-25 işlenmiş hâliyle depoya girmesi (`25-uret.py --kaynaga-isle .`) — canlıyla AYNI ANDA.
- Canlıdan üretilen kurulum dosyasının boş projede doğrulanması (Faz 4) genel yayından önce zorunlu.
