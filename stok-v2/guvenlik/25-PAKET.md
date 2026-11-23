# G-25 paketi — çalıştırma sırası ve geri alma

**Durum:** HAZIR, yerelde sınandı. **Canlıya UYGULANMADI.** Uygulama ayrı onay, geri alma ayrıca onay.
Tasarım ve kabul ölçütleri: `25-G25-TASARIM.md`. Sınama: `stok-v2/test/guvenlik/t25/test25.sh` → `sonuc-test25.txt`.

## Dosyalar (üretilmiş — elle düzenlenmez; `python3 stok-v2/guvenlik/25-uret.py`)

| Dosya | Ne | Yazar mı |
|---|---|---|
| `25-onkosul-salt-okur.sql` | durum: üç fonksiyonun gövdesi (önce / sonra / FARKLI), A6, yeni nesne sayısı, fiş kuralları / sürüm kapısı, kullanıcı SAYILARI | hayır |
| `25-cari-yetki-uygula.sql` | atomik uygulama (tek `do` bloğu; önkoşul tutmazsa hiçbir şey değişmez; yedek `guvenlik.g25_yedek`) | evet |
| `25-sonra-dogrula-salt-okur.sql` | 10 kontrol + GENEL TAMAM | hayır |
| `25-cari-yetki-geri-al.sql` | atomik geri alma (uygulandığı hâli doğrulamadan dokunmaz) — **AÇIĞI YENİDEN AÇAR** | evet |

Kaynak: `25-kaynak/yeni.sql` (yeni nesneler) + `stok-v2/editor/15-duzeltme.sql` (`car_yaz`) + `stok-v2/editor/18-fis-defteri.sql`
(`fis_kes`, `fis_iptal`) — üretici bu üçüne birer satır ekler. `fis_kes`'in kaynaktaki gövdesi canlı envanteriyle (20 Kasım) aynı;
`car_yaz` / `fis_iptal`'ın canlıdaki gövdesi önkoşul sorgusunun 2. ve 4. satırında görülür ("eski (G-25 öncesi, beklenen)" olmalı).

## Canlı sırası (her adım ayrı onay; kullanıcı SQL Editor'den, proje mqdgucoomgqcvhvgixbl doğrulanarak)

1. `25-onkosul-salt-okur.sql` → GENEL **HAZIR** olmalı. KARIŞIK / FARKLI → DUR (canlıdaki gövde kaynaktan farklı; paket yeniden
   üretilmeden uygulanmaz). Satır 8'deki sayılar kaç kullanıcının etkileneceğini söyler (PARA'sız stok / üretim / sipariş kaydetmeli).
2. Yedek: gece yedeği son 24 saatte sınanmış olmalı (geri dönüş SQL'le olur, yedekle değil — ama veri güvencesi).
3. `25-cari-yetki-uygula.sql` (dosyanın TAMAMI, tek Run) → GENEL UYGULANDI.
4. `25-sonra-dogrula-salt-okur.sql` → GENEL TAMAM; `25-onkosul-salt-okur.sql` → UYGULANMIŞ.
5. Cihazda: PARA yetkili kullanıcıyla tahsilat / cari virmanı / alış fişi ✓; Üretim rolündeki kullanıcıyla üretim teslimi ✓, cari
   virmanı ✗ ("cari / muhasebe kaydetme yetkisi gerekir").

İstemci (K6 düğme kapatma, Üretim'de mesai saati girişi ve muhasebe onay ekranı) ayrı sürüm; SQL ondan önce uygulanabilir
(tasarım § 4 "Dağıtım sırası").

## Geri alma

`25-cari-yetki-geri-al.sql` — yalnız G-25'in bir soruna yol açtığı kanıtlanırsa, ayrı onayla. **Geri alma yetki açığını yeniden
açar:** stok / üretim yetkilisi yine cari virmanı, cari kartı hareketi, ürünsüz alış / satış, maaş / mesai tahakkuku yazabilir; PARA
fişlerini stok / üretim silme yetkisiyle iptal edebilir; maaş / mesai katını değiştirebilir. Kesilmiş fişlere dokunmaz; mesai
bildirimleri silinmez (doluysa `guvenlik.g25_mes_bildirim_arsiv`). Yerel sınama: geri almadan sonra davranış matrisi ve Faz 0.4
envanteri uygulama ÖNCESİYLE birebir; yeniden uygulama ilk uygulamayla birebir.
