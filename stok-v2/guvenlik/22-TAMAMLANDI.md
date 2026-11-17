# 22 — Site kayıt onayı tek sunucu işlemi: CANLIDA UYGULANDI (17 Kasım 2026)

Durum: **22 SQL canlıda uygulandı ve doğrulandı.** ERP 1.744.22 henüz YAYINLANMADI (PR #360 taslak; birleştirme ve yayın ayrı onay
bekliyor). Bu arada Yöneticiler "Onayla — cari aç"ı yeni cari için KULLANMAZ (1.744.21'in cari yazması KR013 alır); mevcut cariye
bağlama ve ret çalışır. Uygulama anında bekleyen kayıt talebi yoktu.

## Uygulanan sürüm

- Commit: `b33ac92196aef8564bfa3b32c1e873489ea75e45` (dal `claude/site-yonetim-yetki`, PR #360).
- Dosya: `stok-v2/guvenlik/22-site-onay-atomik.sql` — 307 satır, sha256 `f9b29aaf5343bfa4083478bb31bd5cbbf1500d804e28d3ba12719dfc90b4762d`.
- Çalıştıran: kullanıcı, Supabase SQL Editor (postgres), dosyanın tamamı. Claude'un canlı erişimi yok; aşağıdaki tablolar kullanıcının
  paylaştığı çıktılardır.

## Sıra ve sonuçlar

1. **Önkoşul (önce)** — `22-onkosul-salt-okur.sql` (b33ac92): GENEL **HAZIR**. Onayla / reddet "19 hâli"; 22 nesnelerinden hiçbiri yok
   (0/5, tetikleyici yok, islenme yok, işaret 0); değişiklik sayacı "var, etkin (O), degisiklik_bump()"; talep tablosuna doğrudan yazma
   kapalı; onayla / reddet yetkileri tanımlı; en düşük istemci sürümü boş (kapı kapalı); kayıt talebi hiç yok.
2. **Canlı tetikleyici incelemesi (salt okur)** — `cariler` tetikleyicileri ve fonksiyon gövdeleri kullanıcı tarafından okundu:
   `cariler_surum` → `surum_arttir()` yalnız BEFORE UPDATE (eklemede çalışmaz); `stk_istemci_koru` BEFORE INSERT/UPDATE/DELETE, ret
   yalnız `min_istemci_surum` doluyken (boş); `degisiklik_izle` AFTER INSERT/UPDATE/DELETE (sayaç artar); `silme_koruma` ve
   `arsiv_silinen` yalnız BEFORE DELETE. `surum` integer NOT NULL varsayılan 1; `id` text NOT NULL. Değerlendirme: 22'nin eklemesiyle
   uyumlu (Claude'un karşılaştırması; ham çıktı kullanıcıda).
3. **Uygulama** — `22-site-onay-atomik.sql` (b33ac92), hata yok. Sonuç tablosu:

| sira | kontrol | beklenen = sonuç | durum |
|---|---|---|---|
| 1 | public.site_kimlik_zamani(text) | 785adfb4ada8114405287a3e5a8dc64a | tamam |
| 2 | public.site_eslesme_anahtari(text, text) | 69585b19b83b568603d2b71f27080389 | tamam |
| 3 | public.site_vergi_no_kaydedilecek(text) | 75620b7d843d458d1303978be7ec8bdb | tamam |
| 4 | public.site_kayit_onayla_yeni_cari(text, text) | e63acb4dfb28ccffde5191311097cdda | tamam |
| 5 | public.site_kayit_onayla(text, text) | 55aaa9ed6a8300ba9ee2847c44f7ea98 | tamam |
| 6 | public.site_kayit_reddet(text) | b02d38f099990a98b992f63b178d2060 | tamam |
| 7 | public.site_cari_ekleme_koru() | 68e61c5d9ecf07ee2888b6ce39ff0aa1 | tamam |
| 90 | cariler tetikleyicisi site_cari_ekleme_koru | BEFORE INSERT, satır başına | tamam |
| 91 | site_kayit_onayla_yeni_cari: authenticated çalıştırır / anon çalıştıramaz | evet / hayır | tamam |
| 92 | site_kayit_talepleri.islenme sütunu | var | tamam |

4. **Önkoşul (sonra)** — GENEL **UYGULANMIŞ · tamam**:

| sira | kontrol | sonuç | durum |
|---|---|---|---|
| 2 | tablolar | var / var / var | tamam |
| 3 | 19 yönetici kapısı | var | tamam |
| 4 | site_kayit_onayla gövdesi | 22 hâli | tamam |
| 5 | site_kayit_reddet gövdesi | 22 hâli | tamam |
| 6 | 22 nesneleri | 5/5 fonksiyon (5 tanesi 22 hâlinde) · tetikleyici var · islenme var · işaret 1 | bilgi |
| 7 | cariler zorunlu sütunlar | hepsi var | tamam |
| 9 | cariler tetikleyicileri | arsiv_silinen, cariler_surum, degisiklik_izle, silme_koruma, site_cari_ekleme_koru, stk_istemci_koru | bilgi |
| 10 | değişiklik sayacı | var, etkin (O), degisiklik_bump() | tamam |
| 11 | en düşük istemci sürümü | boş (kapı kapalı) | bilgi |
| 12 | kayıt talepleri | hiç yok | bilgi |
| 14 | talep tablosuna doğrudan yazma | hayır | tamam |
| 15 | onayla / reddet yetkileri | tanımlı | tamam |
| 16 | geri alma hazır mı | 0 nesne değişmiş | tamam |
| 99 | GENEL | UYGULANMIŞ | tamam |

## Bundan sonra

- **Ara dönem (şimdi):** 1.744.21 yeni cariyle onay yapamaz (cari yazması KR013 → o cihazda "inceleme gerekiyor", bulutta cari yok,
  ardından "Cari bulunamadı"); mevcut cariye bağlama ve ret çalışır. Arayı kısa tut.
- **Aşama 2 (ayrı onay):** PR #360 → `main` → Pages; `surum.json` 1.744.22. Ayrıntı: `22-YAYIN-PLANI.md`.
- **Geri dönüş:** önce ERP 1.744.21'e, sonra `22-site-onay-atomik-geri-al.sql` (b33ac92; sha256 `78efde5a…107f`). Geri alma; tetikleyici
  ya da fonksiyon yetki / sahip / ayarı sonradan değiştiyse durur, ezmez. Açılmış cariler ve hesaplar kalır.
- Beklenen yan görünüm: `19-durum-salt-okur.sql` ve `18-…-salt-okur.sql` onayla / reddet'te "FARKLI" der (22 bilerek değiştirdi).
- **Saat sınırı** (`22-SITE-ONAY-ATOMIK.md`): eski istemci engeli, eski cihazın saati 1 günden fazla ileri ayarlı değilse geçerli; açık
  cihazlarda yeni sürümü görmek kapalı / çevrimdışı eski cihaz kalmadığını kanıtlamaz.
