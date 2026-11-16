# 22 — Uygulama, doğrulama ve ERP 1.744.22 yayın planı (16 Kasım 2026)

Durum: **PLAN — hiçbir adımı uygulanmadı.** Her adım ayrı onayla yapılır. Canlı önkoşul (`22-onkosul-salt-okur.sql`, `b33ac92`)
kullanıcı tarafından çalıştırıldı: **HAZIR**.

## Sabitler

| | Değer |
|---|---|
| SQL sürümü | `b33ac92` (dal `claude/site-yonetim-yetki`, PR #360) |
| Uygulama dosyası | `stok-v2/guvenlik/22-site-onay-atomik.sql` — 307 satır, sha256 `f9b29aaf5343bfa4083478bb31bd5cbbf1500d804e28d3ba12719dfc90b4762d` |
| Geri alma | `stok-v2/guvenlik/22-site-onay-atomik-geri-al.sql` — 122 satır, sha256 `78efde5a52fe5e971b2f69e985ba3bb57b8ffcd6dd8ab1ee1df55ce04f59107f` |
| Salt-okur önkoşul / durum | `stok-v2/guvenlik/22-onkosul-salt-okur.sql` — 108 satır, sha256 `3e243119be4489acadb513a055b4e81b0656c4940ccab113b5daa226a03416cb` |
| Yayındaki ERP | 1.744.21 (`main` = `ad02222`, `surum.json` 1.744.21) |
| Yayınlanacak ERP | **1.744.22** (hiçbir dalda kullanılmıyor) — 21 (yönetim düğmeleri yalnız Yönetici) + 22 (yeni cariyle onay tek sunucu çağrısı) |
| ERP çıktısı | `atolye-erp-v1.744.22.html` + `surum.json` → `{"surum": "1.744.22", "url": "atolye-erp-v1.744.22.html", "not": "<SURUM_NOTU>"}`; `yap.sh` en yeni üç HTML'i bırakır (1.744.19 `git rm` ile çıkar; 1.744.20 ve 1.744.21 kalır — geri dönüş için 1.744.21 yerinde) |

Bağımlılık: **1.744.22, 22 SQL'i olmadan yeni cariyle onay YAPAMAZ** (`site_kayit_onayla_yeni_cari` yok → "Onaylanamadı … hiçbir kayıt
açılmadı"; eski yola düşmez, cari açmaz). 1.744.21, 22 uygulandıktan sonra yeni cariyle onay yapamaz (cari yazması KR013), mevcut
cariye bağlama ve ret çalışır. Bu yüzden sıra **SQL → ERP** ve arası kısa tutulur.

## Aşama 0 — Yayın paketi (geliştirme dalında; ayrı onay: "sürüm hazırla")

1. Dal `claude/site-yonetim-yetki` (`b33ac92`, `main`'i içeriyor). `src/015-sabitler.jsx`: `SURUM = "1.744.22"`, `SURUM_TARIHI`,
   `SURUM_NOTU` (öneri: "Web sitesi kayıt onayı tek adımda — yönetim düğmeleri yalnız Yönetici"), `SURUM_GECMISI` başına kayıt.
2. `./yap.sh` → denetimler temiz, `atolye-erp-v1.744.22.html` üretilir; 1.744.19 kaldırılır.
3. `./test/kosu.sh` TAM takım (son tam koşu `7c6ec2e`'deydi; ERP kodu `2cf944e`'de değişti — yayından önce zorunlu). Bilinen
   `tedarik-girisleri` farkı tek başına yeniden koşulur; başka fark → dur.
4. `surum.json` 1.744.22; `DEVAM-NOTU.md` "Son sürüm / Son iş". Commit + push. PR #360 **taslak kalır** — birleşme = yayın.

## Aşama 1 — Canlı SQL (kullanıcı, Supabase SQL Editor, postgres; ayrı onay: "22'yi uygula")

Pencere: kimse siteden gelen kayıt talebini onaylamıyorken (birkaç dakika). Aşama 0 bitmiş ve PR birleşmeye hazır olmalı.

1. `22-onkosul-salt-okur.sql` (b33ac92) — aynı gün, hemen önce: GENEL **HAZIR**; 10. satır "var, etkin (O|A), degisiklik_bump() | tamam".
   Değilse dur.
2. `22-site-onay-atomik.sql` (b33ac92) dosyanın **tamamı** → Run. Tek do bloğu: hata verirse HİÇBİR şey değişmemiştir (iletiyi paylaş).
   Son tablo: yedi gövde satırı + 90 (tetikleyici "BEFORE INSERT, satır başına"), 91 ("evet / hayır"), 92 ("var") → hepsi **tamam**.
3. `22-onkosul-salt-okur.sql` tekrar → GENEL **UYGULANMIŞ**; 4–5. satır "22 hâli"; 16. satır "0 nesne değişmiş | tamam".
4. Beklenen yan görünüm: `19-durum-salt-okur.sql` ve `18-…-salt-okur.sql` onayla / reddet'te "FARKLI" der (22 bilerek değiştirdi).

Bu aşamadan sonra, 1.744.22 yayınlanana kadar: Yöneticiler **"Onayla — cari aç"ı yeni cari için kullanmaz** (1.744.21'de cari
yazması KR013 alır, o cihazda cari "inceleme gerekiyor"a düşer, bulutta cari oluşmaz). Mevcut cariye bağlama ve ret kullanılabilir.

## Aşama 2 — ERP 1.744.22 yayını (ayrı onay: "yayına al")

1. PR #360 incelemeye hazır → `main`'e birleştir (uçlar doğrulanarak). GitHub Pages "pages build and deployment" başarılı.
2. `https://erp.newdiamond.com.tr/surum.json` → `"surum": "1.744.22"`. Uygulama açılışta / 10 dk arka plandan dönünce kendiliğinden geçer;
   açık oturumlarda şerit çıkar. Her Yönetici cihazında profil menüsü **v1.744.22** olmalı (eski sürümde kalan cihaz = Aşama 1 sonrası
   sınırlamalar sürer).

## Aşama 3 — Canlı doğrulama (yayından sonra)

- Salt-okur: `22-onkosul-salt-okur.sql` → UYGULANMIŞ, 16. satır tamam.
- Yönetici olmayan hesap: cari kartında site giriş düğmeleri ve kayıt taleplerinde Onayla / Reddet **görünmez**.
- Yönetici: bekleyen gerçek bir talep varsa "Onayla — cari aç" → "… carisi sunucuda açıldı"; cari birkaç saniyede listede; ikinci
  cihazda değişiklik sayacıyla (≈8 sn) görünür. (Bilerek test kaydı açmak canlıya veri yazar — ayrı karar.)
- Elle cari açılırken KR013 alınırsa: bekleyen ya da işlenmesinin üzerinden 1 gün geçmemiş bir talebin ünvan + telefonudur — talepten onaylanır.

## Geri dönüş sırası

| Durum | Sıra |
|---|---|
| Yalnız ERP sorunu (SQL sağlam) | `surum.json`'u 1.744.21'e döndür (`main`'de geri alma commit'i; 1.744.21 HTML'i yerinde) → cihazlar 1.744.21'e geçer. 22 SQL **kalır**: veri güvenli; 1.744.21 yeni cariyle onay yapamaz (Aşama 1 notu), bağlama / ret çalışır. |
| SQL geri alınacak | **Önce ERP** 1.744.21'e (yukarıdaki satır), **sonra** `22-site-onay-atomik-geri-al.sql` (b33ac92) tamamı → son tablo hepsi **tamam**, ardından önkoşul **HAZIR**. Geri alma; gövde, tetikleyici (tanım / etkinlik) ya da fonksiyon yetki / sahip / ayarı sonradan değiştiyse neyi bulduğunu söyleyip **durur, ezmez** → değişikliği bilinçli geri çek ya da olduğu gibi bırak, sonra tekrar. 22 ile açılmış cariler ve hesaplar KALIR; yalnız işlenme zamanları gider. Geri alındıktan sonra eski yolun boşta cari riski geri gelir. |
| Aşama 1'de hata | Tek do bloğu — hiçbir şey değişmemiştir; ileti paylaşılır, ERP yayınlanmaz. |

ERP önce dönmezse de güvenlidir (1.744.22 fonksiyonu bulamayınca "hiçbir kayıt açılmadı" der, cari açmaz) ama Yöneticiler için
anlaşılır olan sıra yukarıdakidir. 1.744.22'nin cihazlarda bıraktığı "yarım onay" kayıtlarını (`site:yarim-onay`) 1.744.21 okumaz; zararsız.

## Açık sınırlar (yayından sonra da geçerli)

- **Saat sınırı:** eski istemci engeli, eski cihazın saati 1 günden fazla ileri ayarlı DEĞİLSE geçerli; doğru ifade "saati 1 günden
  fazla kaymamış her eski ERP'nin bu yolu engellendi" (`22-SITE-ONAY-ATOMIK.md`, "Sınırlar ve kalanlar"). Yayından sonra eski
  sürümde cihaz kalmaması bu sınırı da fiilen kapatır.
- Türkçe büyük / küçük harf katlaması canlı veritabanının yerel ayarına bağlı (aynen gelen ünvan her durumda eşleşir); önkoşul ölçmez.
- `kos-guvenlik.sh` 55/55 `8940e05`'te; `c4b2471` / `b33ac92` yalnız 22 dosyalarını ve site-portal.sql'de bir yetki satırının yerini
  değiştirdi — o koşudan sonra `t22` 138/138, `t21` 39/39.
