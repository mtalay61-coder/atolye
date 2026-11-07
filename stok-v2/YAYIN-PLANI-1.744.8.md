# 1.744.8 + 12 — yayın planı (7 Kasım; 312529a) — ONAY BEKLİYOR, KOŞULLU

**Bu belge yayın onayı değildir.** Planın geçerli olması için ön koşul P0 sağlanmalı; her adım (12 kurulumu, main birleştirme +
surum.json) ayrı açık onayla yapılır. Canlıya bu belge hazırlanırken hiçbir şey uygulanmadı.

## P0 — ön koşul: yedek ve prova geri yükleme (DURUM: SONUÇ BEKLENİYOR)

| Kontrol | Beklenen | Durum |
|---|---|---|
| `~/AtolyeYedek/<tarih>/ozet.txt` (dokum-al.sh) | tarih, süreler, boyutlar, sha256; "YARIM-KALDI" yok | **gelmedi** |
| `…/prova-<tarih>/ozet.txt` (prova-geri-yukle.sh) | `SONUÇ: envanter AYNI` (ya da yalnız açıklanmış farklar: yeni projede fazladan uzantılar, bilerek taşınmayan cron) | **gelmedi** |
| döküm zamanı | 12 kurulumundan hemen önce, aynı gün (döküm ile kurulum arasındaki yazmalar yedekte yoktur) | — |

P0 sağlanmazsa hiçbir adım başlamaz.

## Adımlar (sıra değişmez)

| # | Adım | Kim / nerede | Doğrulama (beklenen) | DUR koşulu → yapılacak |
|---|---|---|---|---|
| 1 | `13-uretim-hareket-salt-okur.sql` (salt-okur) | kullanıcı, SQL Editor | A ve B bütün satırlar 0; C9 = 0 (12 kurulu değil) | A/B > 0 → **dur**, sonucu getir (yarım silme izi ya da reddedilecek üretim var; karar ayrı) |
| 2 | `12-uretim-sil-kur.sql` | kullanıcı, SQL Editor | hatasız biter | hata → **dur**. Dosya tekrar çalıştırılabilir (create or replace / drop if exists); hata mesajını getir. Karar: düzeltip yeniden çalıştır ya da G1 |
| 3 | `12-sonra-dogrula.sql` | kullanıcı, SQL Editor | **8/8 tamam** (`tttttttt`) | herhangi biri `false` → **dur, 4'e geçme** → G1 |
| 3b | `2-sonra-dogrula.sql` (güvenlik sıkılaştırması bozulmadı) | kullanıcı, SQL Editor | 8/8 | `false` → **dur** → G1 |
| 4 | 1.744.8 yayını: dalda `surum.json` → `{"surum": "1.744.8", "url": "atolye-erp-v1.744.8.html", "not": "Üretim silme ve çöpten geri yükleme yarım kalmaz"}`, PR #348 main'e birleşir → GitHub Pages | Claude (onaydan sonra) | Pages işi başarılı; `https://erp.newdiamond.com.tr/surum.json` 1.744.8 gösteriyor; `atolye-erp-v1.744.8.html` açılıyor | Pages düştü / dosya açılmıyor → **dur**: surum.json yayında değilse cihazlar 1.744.7'de kalır (12 kurulu, güvenli — 1.744.7 üretim silemez, KR012). Düzeltip yeniden yayınla ya da birleştirmeyi geri al (revert commit) |
| 5 | Cihaz kontrolü | kullanıcı, her cihaz | uygulama açılınca / 10 dk arka plandan dönünce 1.744.8'e geçer; sürüm 1.744.8 görünüyor; isteğe bağlı: hareketsiz deneme üretimi açıp 1.744.8 ile silmek (iz tablosuna yalnız kimliği düşer) | bir cihaz geçmiyor → o cihazda sayfayı yenile; 1.744.7'de kalan cihaz üretim silemez (KR012, kayıt değişmez) — veri riski yok |

1.744.7 ile 1.744.8'i sunucu ayırt etmez (sürüm başlığı iz tablosuna yalnız başlıksız, 1.743 öncesi yazmalarda düşer —
`5-surum-durum-salt-okur.sql`); cihaz kontrolü elle yapılır.

## Geri dönüş

| Durum | Geri dönüş | Sonuç (sınandı mı) |
|---|---|---|
| **G1** — 2, 3 ya da 3b'de dur (yayın YAPILMADI) | `12-geri-al.sql` → `12-sonra-dogrula` = `ffftttff` (işlem ve 5 koruma yok; iz tablosu, kapı ve kurallar aynı) | canlının bugünkü hâli (1.744.7, 12 yok — bilinen yarım silme riski geri). Yerelde: geri alma sonrası veri sayıları aynı (`t-uretim-bakiye.sh`, `t-uretim-paketi.sh`) |
| **G2** — 4'ten sonra 1.744.8'de hata (12 sorunsuz) | uygulama `surum.json` ile GERİ ALINMAZ (yalnız yeniye geçer, `surumDahaYeniMi`). 1.744.7 kodu **1.744.9** numarasıyla yayınlanır (ayrı onay). 12 KALIR | 1.744.7 + 12: üretim silme KR012 ile durur, hiçbir kayıt değişmez (`t-istemci-uretim-sil.sh`); öteki işler 1.744.7 gibi. 1.744.9 derlemesi henüz hazırlanmadı (istenirse önceden hazırlanıp sınanır) |
| **G3** — 4'ten sonra 12'nin kendisi sorun (ör. meşru bir iş KR012 alıyor) | önce `12-silme-durdur.sql` (bütün üretim silmeleri durur), sonra `12-geri-al.sql`; düzeltme gelene kadar durdurma açık kalır | ⚠ 12 yokken 1.744.8 sunucu fişli üretimi eski yoldan siler (fişleri iptal edip DELETE) — durdurma DELETE'i engeller ama önceki iptaller kalıcı olur → G3 süresince **üretim silinmemeli** (kullanıcılara duyuru). Tercih: G3 yerine düzeltmeyi ileri yönde yayınlamak |
| **G4** — veri bozulması | P0'daki dökümden geri yükleme (prova edilmiş yol) | dökümden sonraki bütün yazmalar kaybolur — son çare |

## Kanıt (312529a)

- `kos-guvenlik.sh` tamamı TEMİZ 55 ✓ / 0 ✗ · `kos-butunluk.sh` çıkış 0 · `t-yedek-betikleri.sh` 34 ✓ (yerel; gerçek provanın yerini tutmaz)
- 12 × istemci: 1.744.7 beş durumda kayıt değiştirmeden durur; 1.744.8 13/13; normal iptaller ve planlama 22/22 (URETIM-SIL §8)
- `atolye-erp-v1.744.8.html` ile `src/` aynı commit'ten (0649412), sonra `src/` değişmedi
- Canlı 13 (7 Kasım): bütün satırlar 0, üretim kaydı 0
