# SQL dosyalarının LF / CRLF yapıştırma dayanıklılığı (27 Kasım 2026)

**Canlıya, main'e ve yayına hiçbir şey uygulanmadı.** Bu belge yalnız sınama sonucudur; dosyaların hazır olması çalıştırma onayı değildir.
Neden: B4 kurulumunda metin SQL Editor'e Windows satır sonlarıyla (CRLF) ulaştı. Kurulan kod doğru ama satır sonları farklı; özet
karşılaştıran doğrulama ve geri alma dosyaları bu yüzden yanıldı. Aşağıdaki her dosya iki yapıştırma biçimiyle sınandı.

Sınama tabanı: canlıya hizalı yerel kopya + B4'ün CRLF ile kurulmuş hâli (beş gövdenin özeti canlıdan bildirilenle birebir aynı).

## Yazan dosyalar — hangisi geçerli

| Paket | Kurulum dosyası | SHA-256 | LF | CRLF |
|---|---|---|---|---|
| B4/B5 | `27-b4-uygula.sql` — CANLIDA KURULU | `f49078f2361e8546d59e6a0b9c5d52e0ace6474c47663ef2615478e2b327645d` | kurulur | kurulur (canlıdaki hâl) |
| B3a | `28-b3a-uygula.sql` | `15f1051d5c9f652ac99d091fb329aea67ef35ef10adb82fee1cbe31ba3d38250` | `KURULU` | `KURULU` |
| B3a-2 | `29-b3a2-uygula.sql` | `ec3df68d922ba5d49e1f5b95bd795c4ff1982bd89472681a8c75df816a12986f` | `KURULU` | `KURULU` |
| Ret iletisi | `31-yetki-ileti-uygula-satirsonu.sql` | `98b4c1b4b3265984cafe627f777cf20119be08097e884f6b86954b8e0a046bad` | `KURULU` | `KURULU` |
| Ret iletisi | ~~`31-yetki-ileti-uygula.sql`~~ **KULLANILMAMALI** | `b3a48e5ab1461d9c6b18aec8f925e38769b1e57684bfdf48facbb40c1724acaf` | kurulur | kendi doğrulamasında DURUR (bir şey değişmez) |

| Paket | Geri alma dosyası | SHA-256 | LF | CRLF |
|---|---|---|---|---|
| B4/B5 | `27-b4-geri-al-satirsonu.sql` | `4dbe9e7e7b843e6369850f8aa9bdc37198bcc371dcceb60f4b2662f75b7ae69c` | canlı gövdeye döner, fark 0 | canlı gövdeye döner, fark 0 |
| B4/B5 | ~~`27-b4-geri-al.sql`~~ **KULLANILMAMALI** | `940c40262bf141d35093d999c30195e098ac730d21b2f9483636c0bb8c1036af` | çalışır | kendi doğrulamasında DURUR |
| B3a | `28-b3a-geri-al.sql` | `c015689afb9f2c3436878c9a15e697f2800b4f72f90ab43bcf478c9b3a40ef3f` | `GERİ ALINDI` | `GERİ ALINDI` |
| B3a-2 | `29-b3a2-geri-al.sql` | `8d471fcf8c5847ecca808f148c1dfb4a95becfc8faa95bc0aa89ec862be1d9c5` | `KURULU DEĞİL` | `KURULU DEĞİL` |
| Ret iletisi | `31-yetki-ileti-geri-al-satirsonu.sql` | `5c5b9521137f1f878904b16e9ea7764ac6553f0eccc602905afe66bcb536ff0f` | eski gövdeye döner | eski gövdeye döner |
| Ret iletisi | ~~`31-yetki-ileti-geri-al.sql`~~ **KULLANILMAMALI** | `661d831a03be7bace5e525e004a6e9b57f9135c2c76ed9aae9b9124586952ec0` | çalışır | kendi doğrulamasında DURUR |

B3a ve B3a-2 dosyaları DEĞİŞMEDİ: CRLF ile yapıştırılınca gövdelere satır başı karakteri girer ama kod aynıdır (aşağıda). Ret iletisi ve B4
geri alma dosyalarının dayanıklı sürümleri asıllarından tek noktada ayrılır: gövde kurulmadan önce metindeki CR atılır.

## Sonuçlar

| Sınama | LF | CRLF |
|---|---|---|
| Dört kurulum sırayla | hepsi kurulu | hepsi kurulu |
| Metin sabiti içinde satır sonu (CR'nin değer / ileti değiştirme riski) | — | 17 fonksiyonda 0 |
| `b3a2-matris.js` (64 durum × 7 hesap; yalnız B3a-2 kapsamı) | 448 uyumlu · 0 AÇIK | 448 uyumlu · 0 AÇIK |
| `yetki-api.js` (B3a matrisi) | 86 uyumlu · 0 AÇIK · 4 yanlış gerekçe | 86 uyumlu · 0 AÇIK · 4 yanlış gerekçe |
| Ret iletisi, B4'ün CRLF'li `fis_iptal` gövdesinden çağrıldığında | "fiş iptali (gereken: … silme)" | aynı |
| Geri alma (31 → 29 → 28), dört paket CRLF kuruluyken | yalnız B4'lü hâlle fark 0 | fark 0 |
| `ekran-personel-akis.js` (1.744.44; dört paket CRLF kurulu) | 118 / 118 (önceki koşular) | @@AKIS@@ |
| B4: `b4-sunucu-sina.js` · `ekran-uretim-b4.js` (1.744.37) | 40 / 40 · 35 / 35 | 40 / 40 · 35 / 35 |
| B3b ölçümü (`b3b-olc.js`) | AÇIK | AÇIK (paketler kapatmıyor) |

"4 yanlış gerekçe": ret doğru, hata kodu matrisin beklediği 42501 yerine KR040 / KR006.

## Yalnız okuyan sorgular (hepsi LF ve CRLF yapıştırmayla sınandı)

| Dosya | SHA-256 | İş |
|---|---|---|
| `41-canli-paket-durum-salt-okur.sql` | `f4d003b549f5e1f888c00c73c9ba8e7ec7a64d25dee55de3c705373d665842f8` | dört paketin durumu; satır sonundan bağımsız. `34-…` yerine. |
| `38-canli-b4-durum-salt-okur.sql` | `22c440381ef662f232d3fe914df374891755fd7f1517cdf13b4f72a2ff7f7451` | yalnız B4, ayrıntılı (satır sonu biçimi, yetkiler). `37-…` yerine. |
| `39-canli-teslim-izle-salt-okur.sql` | `789a69b31d5277b8fb83a797fcd74fed8f5ef5f4230930e37c82291cbcc506af` | gerçek teslimin önce / sonra izlenmesi. `36-…` yerine. |
| `40-canli-deneme-temiz-salt-okur.sql` | `7d3dd6de719aeacbb92f6d20ca08b7f3d868cf8c31a96f06e2434c016a49b000` | canlı denemeden geçerli kayıt kaldı mı. |
| `27-b4-onkosul-salt-okur.sql` | `76c5c3c4c4194db10bc61c68f367aef9964d280bc5b9ec8406620653140f1bba` | B4 kurulumundan ÖNCE önkoşul (canlıda kullanıldı). |

`41` dokuz durumda sınandı: hiçbiri kurulu değil · yalnız B4 (canlıdaki hâl) · dördü LF · dördü CRLF · B3a-2 ret kodu değiştirilmiş (DUR) ·
B3a-2 tetikleyicisi kapalı (DUR) · B3a tetikleyicisi bir tabloda yok (DUR) · iç fonksiyon kullanıcılara açılmış (DUR) · ileti kodunda
fazladan boşluk (DUR).

KULLANILMAMALI: `34-canli-durum-salt-okur.sql` (ret iletisini özetle arar; CRLF kurulumu "beklenmeyen" gösterir), `36-…`, `37-…`.

## Sınırlar
- Sınamalar yerel PostgreSQL 16'da; CRLF, dosyanın her satır sonuna CR eklenerek taklit edildi. SQL Editor'ün metni gerçekte nasıl
  gönderdiği yalnız B4 kurulumunda gözlendi (o gözlem bu taklitle bayt bayt eşleşti). Karışık satır sonu (yalnız bazı satırlarda CR)
  ya da başka dönüşümler (sekme, Unicode) sınanmadı.
- Yetki paketleri gerçek Supabase'de CRLF ile kurulmadı.
- "448 uyumlu · 0 açık" yalnız B3a-2 matrisinin kapsamıdır. B1 / B2, B3b, B6, Y1 AÇIK.
