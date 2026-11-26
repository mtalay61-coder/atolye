# B4 / B5 — ÜRETİM TESLİMİNDE ÇİFT STOK / İŞÇİLİK VE BAYAT "GERİ AL" (28 Kasım 2026; HAZIRLIK — canlıya UYGULANMADI)

> **Dal `claude/b4-uretim-teslim-koruma`** (`main` `526167e` = yayındaki 1.744.37 üzerinden).
> - Yalnız sunucu: istemci değişmez, sürüm / yayın yok.
> - Canlıya, deneme projesine, `main`'e, G-25'e dokunulmadı.
> - B3a ile bağlı DEĞİL; B3a ayrı dalda (`claude/b3a-tablo-yazma-yetki`), ayrı kurulur ve geri alınır.

## Sorun (kanıt: mevcut kodda kırmızı sınamalar)

**B4 — teslimde çift kayıt.** `fis_kes` üretim atamasını `alt_yaz` ile koşulsuz yazıyordu:
- iki cihaz aynı işi teslim alınca stok, hammadde ve işçilik iki kez yazıldı;
- farklı istek kimlikleri olduğu için tekrar koruması (`istek`) da yakalamadı;
- eşzamanlı kısmi teslimde iki "kalan" parça doğdu.

**B5 — bayat "Geri Al".** `fis_iptal` fiş zaten iptalken de atama farkını yazıyordu:
- bayat cihaz eski teslimi geri alınca atama "bekliyor"a döndü;
- geçerli yeni teslim ve onun stok / ödemesi yerinde kaldı.

## Düzeltme (`27-b4-kaynak/yeni.sql` + üç canlı gövdeye çapalı ekleme)

**`b4_teslim_denetle(p)`** — `fis_kes` içinde çağrılır: istek tekrarı denetiminden SONRA, ilk yazmadan ÖNCE, aynı işlemde.
1. **Kilit:** yükün dokunduğu üretim satırları ve onların bütün atamaları kimlik sırasıyla `FOR UPDATE` kilitlenir. Aynı üretime yazan teslim / iptal işlemleri sıraya girer; ikinci işlem birincinin sonucunu görür.
2. **Atama durumu:** teslim alınan atama sunucuda var ve "bekliyor" olmalı. Zaten teslim alınmış atama teslim yükünde **koşulsuz** reddedilir (KR030). İstemci yalnız değişen atamaları gönderir, bu yüzden teslimli satırı yeniden gönderen ancak bayat cihaz olabilir.
3. **Miktar** (beden başına; uymazsa KR031):
   - teslim + bu yükün açtığı kalan parça ≤ verilen;
   - kalan açılıyorsa teslim + kalan = verilen;
   - tamir parçası ≤ teslimdeki tamir adedi ≤ teslim;
   - kalan / tamir parçası yalnız kaynağının tesliminde açılabilir.
4. **Adım adı:** yükteki adım adları (`uretimFisAdi`) aynı üretimin başka bir geçerli fişindeyse KR032. Atamasız ara proses fişini de korur.

**`fis_iptal`:**
- Fiş ve bağlısı bu çağrıdan önce zaten iptalse atama / kalem farkı **yazılmaz**.
- Geçerli fişte farktan önce `b4_iptal_denetle` çağrılır:
  - aynı kilit alınır;
  - teslimi geri döndürülen atama bu fişin adımıyla teslim alınmış olmalı;
  - silinen kalan / tamir parçası teslim alınmamış olmalı (KR033).
- İptal ve atama güncellemesi aynı işlemde yapılır.

**`fis_iptal_toplu`:** fark, iptal edilmemiş ilk fişe gider.

**İstemci (değişmedi):** KR kodlarını kalıcı ret sayar. Kullanıcı "Teslim kaydedilemedi — hiçbir değişiklik yapılmadı (… [KR030])" görür; bekleyen defter yeniden denemez.

## Dosyalar

Hepsi `27-b4-uret.py` ile üretilir; `--denetle` ile "AYNI" çıkar.

| Dosya | Tür |
|---|---|
| `27-b4-onkosul-salt-okur.sql` | salt okur: HAZIR (canlı 1.744.37 gövdeleri, md5) · UYGULANMIŞ · FARKLI (ör. G-25 — DUR) |
| `27-b4-uygula.sql` | YAZAR — tek `do` bloğu (Editor ifadeleri ayrı gönderse de atomik). Bekçi: gövdeler canlı ya da B4 değilse hiçbir şey değişmez |
| `27-b4-geri-al.sql` | YAZAR (ayrı onay) — üç gövde canlı 1.744.37 hâline birebir döner (md5 doğrulanır, tutmazsa hiçbir şey değişmez), `b4_*` kalkar |
| `27-b4-uretim-teslim.sql` | okunur kaynak (Editor'e yapıştırılmaz) |

**CRLF:** Canlı gövdeler CRLF satır sonlu (Windows'tan yapıştırılmış). Üretilen dosya gövdeyi LF taşır, kurulumda `chr(13)||chr(10)`'a çevirir. Dosya taşınırken CR kaybolsa da kurulan metin aynı çıkar ve geri alma canlı md5'e döner.

**Canlı md5'ler** (25 CSV, `c25.csv`): `fis_kes` `d5615b11…` · `fis_iptal` `23b5e8ca…` · `fis_iptal_toplu` `8ea651cb…`. Canlıya hizalı taban birebir aynı.

**Deneme projesi:** G-25 orada `fis_kes` / `fis_iptal`'i değiştirmiş. Önkoşul "FARKLI" der; bu paket G-25'li veritabanına KURULMAZ. G-25 kararına göre ayrı bir G-25 uyumlu sürüm gerekir.

## Sınamalar (yerel, canlıya hizalı ve G-25'siz taban `inc_ekran_taban`; gerçek JWT'li `authenticated`)

- **`test/inceleme/ekran-uretim-b4.js`:** istemci 1.744.37, iki tarayıcı = iki cihaz. Sonuçlar `sonuc-ekran-uretim-b4-once.txt` / `-sonra.txt`.
- **`test/inceleme/b4-sunucu-sina.js`:** gerçek istemci yükleriyle (`b4-yukler.json`, fikstür `b4-fikstur.sql`). Ayrıntı:
  - LOGIN rolü `inc_istemci` → `authenticated`, süper kullanıcı değil;
  - eşzamanlılık deterministik: A'nın işlemi açıkken B denenir;
  - yanıt kaybı: aynı istek / yeni istek;
  - son adımda hata: 4 tablo;
  - iptal zinciri ve tamir;
  - bozma kipleri (`BOZMA=ad|kilit|denetim|iptal`) yalnız atılabilir kopyada.
  - Sonuçlar `sonuc-b4-sunucu-*.txt`.

## Açık kalanlar (bu paketin dışında)

- **Bayat cihaz iletisi:** bayat cihazın "Geri Al"ı sunucuda hiçbir şeyi değiştirmez, ama istemci `zatenIptal`'i başarı sayıp "geri alındı" der (yoklama 8 sn içinde ekranı düzeltir). İstemci işi: `zatenIptal` → "başka cihazda zaten geri alınmış".
- **Fiş dışı yazma:** fiş dışı `alt_yaz` ile atama durumunu değiştirmek (istemci bunu yapmıyor) — B3b kapsamı.
- **İş verme:** iki cihazdan eşzamanlı "İşi Ver" (hammadde 1.744.37'de teslimde düştüğü için para / stok etkisi yok; yinelenen atama riski) — sınanmadı.
