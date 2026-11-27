# B4 / B5 geri alma — hangi dosya kullanılır (27 Kasım 2026)

**Canlı durum:** B4 / B5 ana projede KURULU (27 Kasım; `27-b4-uygula.sql`, `f49078f2…645d`, SQL Editor'den). Kurulum metni Editor'e Windows
satır sonlarıyla (CRLF) ulaştı; canlıdaki beş gövde paketin koduyla aynı, yalnız satır sonları farklı (üç gövdede CR CR LF, ikisinde CRLF).
Geri alma YAPILMADI ve onaylanmadı. Bu belge yalnız hangi dosyanın geçerli olduğunu kaydeder; **dosyanın hazır olması çalıştırma onayı değildir.**

| Dosya | SHA-256 | Durum |
|---|---|---|
| `27-b4-geri-al.sql` | `940c40262bf141d35093d999c30195e098ac730d21b2f9483636c0bb8c1036af` | **KULLANILMAMALI.** Editor'e CRLF ile yapıştırılırsa kendi doğrulamasında durur ("canlı gövdeye dönmedi — HİÇBİR şey değişmedi"): zarar vermez ama geri de almaz. Yalnız LF ile (psql) çalışır. |
| `27-b4-geri-al-satirsonu.sql` | `4dbe9e7e7b843e6369850f8aa9bdc37198bcc371dcceb60f4b2662f75b7ae69c` | **GEÇERLİ geri alma dosyası.** Asıl dosyadan tek farkı: gövdeleri kurmadan önce metindeki satır başı karakterlerini (CR) atar, sonra canlıdaki satır sonlarını yeniden üretir. |

## Düzeltilmiş dosyanın sınaması (yerel, canlıdaki gövdelerin birebir kopyası üzerinde — özetler canlıdan bildirilenle aynı)

| Yapıştırma biçimi | Dosyanın sonuç satırı | Önkoşul sorgusu | Fonksiyon gövdeleri + yetkiler ↔ canlıya hizalı (B4'süz) kopya |
|---|---|---|---|
| LF | `99 | GENEL | HAZIR` | `GENEL: HAZIR` | fark 0 |
| CRLF | `99 | GENEL | HAZIR` | `GENEL: HAZIR` | fark 0 |

Karşılaştırma: aynı başlangıçta asıl dosya (`940c4026…`) CRLF ile yapıştırılınca hata verip durdu; durum `UYGULANMIŞ` olarak kaldı.

## Geri alma neyi yeniden açar
B4 ve B5: iki cihazdan aynı işin teslimi çift stok ve çift işçilik yazabilir; bayat "Geri Al" geçerli yeni teslimin atamasını bozabilir.
Geri alma, kurulu olduğu sürede yazılmış kayıtları değiştirmez.

## Durum sorguları
- `38-canli-b4-durum-salt-okur.sql` (`22c440381ef662f232d3fe914df374891755fd7f1517cdf13b4f72a2ff7f7451`) — GEÇERLİ. Satır sonundan bağımsız;
  CR dışındaki her farkı (tek boşluk dahil) ve yetki farkını "DUR" diye bildirir. LF ve CRLF yapıştırmayla yedi durumda sınandı
  (LF kurulum, canlıdaki hâl, B4 yok, tek boşluk farkı, B4 çağrısı silinmiş, hata kodu değişmiş, denetim fonksiyonu açılmış).
- `37-canli-b4-dogrula-salt-okur.sql` — KULLANILMAMALI: gövde özetini satır sonuyla birlikte karşılaştırır; canlıda doğru kodu "FARKLI" gösterdi.
- `27-b4-onkosul-salt-okur.sql` — kurulumdan ÖNCE geçerli (canlı gövdeyi tam özetle arar); kurulumdan sonra yalnız "B4 imzası var mı"ya bakar.

## Diğer paketler
28 (B3a), 29 (B3a-2) ve 31 (ret iletisi) dosyaları CRLF yapıştırma koşuluyla SINANMADI. Sınanıp gerekiyorsa dayanıklı hâle getirilmeden sunulmaz.

## Teslim izleme sorgusu
- `39-canli-teslim-izle-salt-okur.sql` (`789a69b31d5277b8fb83a797fcd74fed8f5ef5f4230930e37c82291cbcc506af`) — GEÇERLİ. Stok: fiş / ürün / renk / beden, MAMUL ve
  HAMMADDE ayrı. Cari: fiş / cari / yön / açıklama. Atamalar kimlikle, sağlam / tamir / hurda. İşçilik canlı kurala göre (ücretli adet =
  sağlam + tamir; hurda ödenmez; tamir işinde atamanın tamir ücreti). CRLF yapıştırmayla sınandı: hammaddeli (B4T8), tamirli (B4T7),
  kısmi (B4T2), iptal + yeniden teslim (B4T6), ara proses (B4V3) gerçek sınama kayıtları; hurda ve çift işçilik YAPAY kayıtla
  (hurda ödenmişse ve aynı fişe ikinci cari satırı yazılmışsa "FARKLI — incele").
- Sınırı: proses atölye bölümüne (maaşlı) bağlıysa tutar cariye yazılmaz; sorgu bunu ayırt edemez, not düşer. Atamasız ara proses
  fişleri B / C / D bölümlerinde görünür, F'de değerlendirilmez.
- `36-canli-teslim-izle-salt-okur.sql` — KULLANILMAMALI.
