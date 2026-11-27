# Canlı için önerilen kesin paket (ONAY BEKLİYOR — uygulanmadı)

Canlıya, main'e ve yayına hiçbir şey uygulanmadı. Bu belge yalnız öneridir; canlı SQL ve yayın için **ayrı ayrı onay** gerekir.
Kaynak: dal `claude/aday-birlesik`, commit `4904a7e` (sabit). Sınama sonuçları: `33-YEREL-SUPABASE-SONUC.md`, `30-BIRLIKTE-KURULUM.md`.

## Paketin içindekiler

| # | Parça | Kurulum (SHA-256) | Geri alma (SHA-256) |
|---|---|---|---|
| 1 | B4/B5 — üretim teslimi ve geri almada stok / işçilik koruması | `27-b4-uygula.sql` `f49078f2361e8546d59e6a0b9c5d52e0ace6474c47663ef2615478e2b327645d` | `27-b4-geri-al.sql` `940c40262bf141d35093d999c30195e098ac730d21b2f9483636c0bb8c1036af` |
| 2 | B3a — listede olmayan / salt okur hesap tabloya yazamaz | `28-b3a-uygula.sql` `15f1051d5c9f652ac99d091fb329aea67ef35ef10adb82fee1cbe31ba3d38250` | `28-b3a-geri-al.sql` `c015689afb9f2c3436878c9a15e697f2800b4f72f90ab43bcf478c9b3a40ef3f` |
| 3 | B3a-2 — cari kartı, ürün fiyatı ve Tanımlar'da alan bazlı yetki | `29-b3a2-uygula.sql` `ec3df68d922ba5d49e1f5b95bd795c4ff1982bd89472681a8c75df816a12986f` | `29-b3a2-geri-al.sql` `8d471fcf8c5847ecca808f148c1dfb4a95becfc8faa95bc0aa89ec862be1d9c5` |
| 4 | Ret iletisi — gereken işlemi ve yetkiyi söyler | `31-yetki-ileti-uygula.sql` `b3a48e5ab1461d9c6b18aec8f925e38769b1e57684bfdf48facbb40c1724acaf` | `31-yetki-ileti-geri-al.sql` `661d831a03be7bace5e525e004a6e9b57f9135c2c76ed9aae9b9124586952ec0` |
| 5 | İstemci | `atolye-erp-v1.744.44.html` `b87afc137406202b5e6180c3b97f31139581d3e79238eda51b0cb4252418a7e8` | yayındaki 1.744.37 (`surum.json` eski hâline) |

Salt okur yardımcılar: `27-b4-onkosul-salt-okur.sql` (`76c5c3c4c4194db10bc61c68f367aef9964d280bc5b9ec8406620653140f1bba`),
`34-canli-durum-salt-okur.sql` (`b62c92bcb3cdbb156fc76c49ae58a5878c3f79c3a85ac3a41a64786c2c0479f8`).

**Bu paket NEYİ KAPATMAZ:** B1 / B2 (renk adı değişikliği, eşzamanlı Tanımlar yazma — ayrı bekleyen paket, bu adayda YOK), B3b (yalnız
stok yetkili hesabın RPC ile sipariş kalemi, cari hareketi ve cari virmanı yazabilmesi — AÇIK), B6 (maaş, mesai ayarı, proses ücretleri
— AÇIK), Y1. "448 uyumlu · 0 açık" yalnız B3a-2 matrisinin kapsamıdır; genel güvenliğin tamamlandığı anlamına gelmez.

## Kurallar

- Her SQL adımından önce adres çubuğunda **ana projenin** kimliğini gör. Her dosyanın özetini karşılaştır; tutmazsa çalıştırma.
- Her kurulum dosyası tek ifadedir: ya bütünüyle uygulanır ya hiç. Bir adım beklenen satırı vermezse **dur**, sonrakine geçme.
- **B4 kurulmadan istemci yayınlanmaz** (1.744.44'ün geri alma iletisi B4'ün sonucuna dayanır).
- Mesai dışında, kimse üretim teslimi yaparken değil. Kurulumlar saniyeler sürer; tablo verisine dokunmaz.

## Adımlar

**A. Hazırlık (yalnız okur)**
1. Son gece yedeğinin alındığını ve sınandığını doğrula.
2. `34-canli-durum-salt-okur.sql` → beklenen: 1–3 `kurulu değil`, 4 `kurulu değil`, 5 `kurulu değil (beklenen eski gövde)`, 6 `var`, 7 `0`,
   9 `true`. 8. satırı kaydet (Yönetici olmayan hesap sayısı: yeni kurallar yalnız onları etkiler).
3. `27-b4-onkosul-salt-okur.sql` → 1–3 `HAZIR`, 4 `yok`, **99 `GENEL: HAZIR`**. "FARKLI" çıkarsa canlı gövde beklenenden farklıdır: DUR.

**B. Sunucu (ayrı onay: canlı SQL)**
4. `27-b4-uygula.sql` → son satır `99 | GENEL | UYGULANMIŞ`.
5. Duman sınaması (1.744.37 ile, Yönetici): bir üretim işini teslim al → Geri Al → yeniden teslim al. Stok ve usta bakiyesi tek kat.
   Sorun varsa: `27-b4-geri-al.sql`, dur.
6. `28-b3a-uygula.sql` → `GENEL | KURULU`.
7. `29-b3a2-uygula.sql` → `GENEL | KURULU`.
8. `31-yetki-ileti-uygula.sql` → `GENEL | KURULU`.
9. `34-canli-durum-salt-okur.sql` → 1–3 `KURULU`, 4 `KR040`, 5 `KURULU (yeni ileti)`.
10. Duman sınaması (1.744.37 ile, Yönetici): ürün kaydı, fiyat değişikliği, stok girişi, tahsilat fişi, sipariş kaydı. Hepsi geçmeli
    (Yönetici bütün kurallardan muaftır).

**C. İstemci (ayrı onay: yayın)**
11. 1.744.44'ü yayınla (`surum.json`). Önkoşul: 4. adım tamam.
12. **Bütün cihazların yeni sürüme geçtiğini doğrula** — her cihazda uygulamayı açıp başlıkta / Ayarlar'da 1.744.44 görülmeli.
    Neden: açık kalmış 1.744.37 sekmesi, sunucunun reddettiği bir fiyat değişikliğini "Ürün güncellendi" diye gösterir ve reddedilen
    değeri o cihazda tutar. Uygulama açılışta ve 10 dakikadan uzun arka plandan dönünce kendiliğinden geçer; uzun süredir açık duran
    sekme elle yenilenmelidir. Bu doğrulama bitmeden Yönetici olmayan hesap açılmaz / yetkisi değiştirilmez.
13. 1.744.44 ile duman sınaması: teslim → Geri Al → yeniden teslim; başka cihazda geri alınmış teslimi geri almayı dene (ileti
    "geri alındı" dememeli).

**D. Geri dönüş (her biri ayrı onay; hiçbiri veriye dokunmaz)**
- İstemci: `surum.json` 1.744.37'ye. B4 geri alınacaksa ÖNCE istemci geri alınır.
- Sunucu, ters sırayla ya da tek tek: `31-yetki-ileti-geri-al.sql` → `GENEL | KURULU DEĞİL`; `29-b3a2-geri-al.sql` → `GENEL | KURULU DEĞİL`;
  `28-b3a-geri-al.sql` → `GENEL | GERİ ALINDI`; `27-b4-geri-al.sql` → `99 | GENEL | HAZIR`.
- Sonra `34-canli-durum-salt-okur.sql` → başlangıçtaki hâl. Yetki paketleri (6–8) B4'ten bağımsız geri alınabilir.

## Bu paketin dayandığı sınamalar ve sınırları

- Yerel PostgreSQL 16, canlıya hizalı kopya: yetki matrisleri, B4 sunucu sınaması (40 / 40), ekran sınamaları, `kosu.sh` 275 / 275.
- Yerel Supabase (gerçek Postgres 17, Auth, API): kurulum / tekrar / geri alma / yeniden kurulum aynı dosyalarla; ekran sınamaları
  34 / 34, 11 / 11, 20 / 20, 118 / 118, 10 / 10; açık kalmış 1.744.37 sekmesi 61 geçti · 9 kaldı (eski istemcinin bildirim davranışı).
- **Buluttaki Supabase'de hiçbir şey çalıştırılmadı.** Doğrulanmayanlar: SQL Editor'ün dosyaları gönderme biçimi; canlının Postgres /
  API sürümleri ve Auth ayarları; canlı veri hacmi ve eski kayıt biçimleriyle davranış; canlı gövdelerin son dökümden beri değişip
  değişmediği (3. adım bunu söyler). Bu boşlukları önkoşul sorguları, tek ifadelik kurulum ve hazır geri alma dosyaları daraltır; kapatmaz.
- Bugün canlıdaki hesapların hepsi Yönetici ise 6–8. adımlar kimsenin işini değiştirmez; etkisi ilk personel hesabıyla başlar.
