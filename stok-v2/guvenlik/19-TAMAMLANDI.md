# 19 — Site özel tabloları + müşteri hesap yönetimi: TAMAMLANDI (canlı, 16 Kasım 2026)

Durum: **canlıda uygulandı ve doğrulandı.** Bu kayıt düzeltmenin kaynağını, geri alma yolunu ve doğrulama özetini korur.
Testler yeniden çalıştırılmadı; aşağıdaki sonuçlar kullanıcının SQL Editor'de aldığı çıktılardır.

## Kapatılan iki açık

1. `site_oturumlari`, `site_hesaplari`, `site_giris_kaydi`, `site_kayit_talepleri`: `rls-kimlik.sql`'in `giris_yapmis_hersey`
   politikası + `grant all … to authenticated` yüzünden giriş yapmış HER ERP kullanıcısı müşteri oturum anahtarlarını ve şifre
   özetlerini okuyup değiştirebiliyordu (18 canlıda "AÇIK" doğruladı). Artık anon / authenticated / PUBLIC'e politika ve yetki yok.
2. `site_hesap_kaydet`, `site_hesap_sil`, `site_kayit_onayla`, `site_kayit_reddet`: rol kontrolü yoktu. Artık başlarında
   `public.site_yonetici_kapisi()` var (yonetici_mi() | JWT rolü service_role | JWT'siz doğrudan bağlantı); diğerleri 42501 `YETKI_YOK`.

ERP bu tablolara yalnız SECURITY DEFINER fonksiyonlarla erişir; `site_talepleri` (ERP talepleri doğrudan işler) ve service_role
değişmedi.

## Canlıda ne oldu (sıra)

1. `19-site-erisim-kapat.sql`'in İLK sürümü (`0232474`, sha256 `42e46dcd934f9fc9…`) SQL Editor'de çalıştırıldı ve 5. bölümde
   `42P01 relation "site_19_sinama" does not exist` ile durdu. Sebep: Editor ifadeleri ayrı isteklerle gönderdi; `begin/commit`
   tek işlem olmadı, `create temp table … on commit drop` kendi işleminin sonunda silindi. Önceki ifadeler (önkoşul, yedek,
   politika / yetki kaldırma, beş fonksiyon, katalog doğrulaması) kalıcı oldu; davranış sınaması çalışmadı. Yerelde
   `stok-v2/test/guvenlik/t19/editor-calistir.py` ile birebir yeniden üretildi.
2. `19-durum-salt-okur.sql` → **KATALOG TAMAMEN UYGULANMIŞ**.
3. `19-site-erisim-sinama.sql` (son sürüm) → **42 tamam · 0 sorun · 1 bilgi**.

19 yeniden uygulanmadı. Kaynak dosya artık Editor'e dayanıklı (aşağıda); canlıda çalışan ilk sürümle aynı sonucu verir.

## Doğrulama özeti

`19-durum-salt-okur.sql` (canlı):

| kontrol | sonuç |
|---|---|
| GENEL DURUM | KATALOG TAMAMEN UYGULANMIŞ |
| yedek satır türleri | fonksiyon=4 · isaret=1 · politika=4 · sira_acl=1 · tablo_acl=4 |
| dört tabloda anon / authenticated / PUBLIC politikası | yok |
| dört tablo + site_giris_kaydi_id_seq: anon / authenticated / PUBLIC yetkisi | yok |
| site_yonetici_kapisi() | var |
| site_hesap_kaydet / site_hesap_sil / site_kayit_onayla / site_kayit_reddet gövdesi | 19 sonrası (yönetici kapılı) ×4 |

`19-site-erisim-sinama.sql` (canlı, sha256 `49e19deaa22e52a2…`) — 42 tamam · 0 sorun · 1 bilgi:

| kimlik | sonuç |
|---|---|
| N1 (ERP listesinde olmayan) | 4 tablo okuma + 3 doğrudan yazma: tablo izni yok · 4 yönetim RPC'si: kapı reddetti (YETKI_YOK) · 4 okuma RPC'si + site_talepleri: çalıştı · okuma çıktılarında oturum anahtarı / şifre özeti yok (4 gizli değerle karşılaştırıldı) |
| N2 (listede, Yönetici değil) | bilgi — canlıda böyle kullanıcı yok (3 kullanıcının 3'ü Yönetici); izole veritabanında sınandı |
| Y (Yönetici, authenticated rolünde) | 4 tablo okuma: tablo izni yok · site_hesap_kaydet: P0001 Cari bulunamadı · site_kayit_onayla: P0001 Talep bulunamadı ya da işlenmiş · site_hesap_sil / site_kayit_reddet: çağrı tamamlandı · okuma RPC'leri + site_talepleri: çalıştı |
| anon | 4 yönetim RPC'si ve site_yonetici_kapisi(): çalıştırma izni yok; authenticated da kapıyı çağıramaz |
| okuma RPC gövde + dönüş tipi | site_hesap_bilgi / site_hesap_listesi / site_kayit_listesi / site_raporu: anahtar / özet / oturum tablosu / tüm satır yok |

Yerel (izole PostgreSQL 16, PostgREST benzeri `authenticator` + rol + JWT): `stok-v2/test/guvenlik/t19/test19.sh` 138/138 —
yönetici gerçek RPC etkileri, listede olan Personel ve modül yetkili Kullanıcı, portal / site_talepleri akışı, geri alma ve
korumalar, Editor taklidi, negatif kontroller. Gerçek Supabase HTTP katmanı ve ERP arayüzü sınanmadı.

## Kaynak dosyalar (bu commit'teki hâl)

| dosya | sha256 (ilk 16) | not |
|---|---|---|
| `site-portal.sql` | `43e4ee5acfe0c082` | yönetici kapısı kaynakta — yeniden çalıştırılınca koruma kalır |
| `rls-kimlik.sql` | `5d3cc98e3fc2dd45` | dört site tablosu politika döngüsü dışında + "özel kalır" listesinde — yeniden çalıştırılınca tablolar kapalı kalır |
| `stok-v2/guvenlik/19-site-erisim-kapat.sql` | `a2db2d42e7e7cdf3` | Editor'e dayanıklı sürüm (yedek + tablo değişikliği tek DO; geçici tablo yok) |
| `stok-v2/guvenlik/19-site-erisim-geri-al.sql` | `8de353decf5c2c9f` | yedekten birebir; 19 sonrası başka değişiklik varsa dokunmadan durur |
| `stok-v2/guvenlik/19-durum-salt-okur.sql` | `2b9bc7e019a2a360` | tek SELECT |
| `stok-v2/guvenlik/19-site-erisim-sinama.sql` | `49e19deaa22e52a2` | canlıda çalışan sürüm |
| `stok-v2/guvenlik/18-site-tablo-politika-salt-okur.sql` | `152d3b53a029c59e` | açığı canlıda doğrulayan denetim |

**UYARI:** GitHub'daki eski `rls-kimlik.sql` ya da `site-portal.sql` yeniden çalıştırılırsa açık geri gelir (tablolar açılır /
yönetici kapısı kalkar). Bu dosyaların yukarıdaki hâli depoya alınmadan o dosyalar canlıda çalıştırılmamalı.

## Geri alma

`19-site-erisim-geri-al.sql` — yalnız 19 sonrası ERP'de beklenmeyen bir arıza çıkarsa (açıkları yeniden açar). Kaynak:
`guvenlik.site_erisim_yedek` (canlıda dolu: yukarıdaki satır türleri). Bu tablo SİLİNMEMELİ. `guvenlik.site_19_sinama` yalnız
sınama sonucudur; anon / authenticated erişemez, istenirse silinebilir.

## Açık kalan (19 kapsamı dışı)

- Yerel commit'lerin depoya alınması (bkz. UYARI).
- ERP arayüzünde yönetim düğmelerinin Yönetici olmayanlardan gizlenmesi (bugün herkes Yönetici — etki yok).
- Carisi bulunamayan 3 site hesabı (salt okur inceleme; silme kullanıcı kararı).
- 17'deki küçük riskler: hesap kilitleme ile engelleme, ortak günlük kayıt sınırı, giriş süresinden kullanıcı adı çıkarımı.
