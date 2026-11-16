# 20 — Supabase Authentication: yeni kayıt ve anonim giriş ayarları (16 Kasım 2026)

Durum: **ayarlar kapatıldı ve panelde doğrulandı.** Açık kaldığı süredeki iz incelemesi (20-auth-iz-salt-okur.sql) bekliyor.

## Bulgu

Kullanıcının 16 Kasım 2026'da paylaştığı ilk ekran görüntüsünde (Supabase › Authentication › Sign In / Providers › User Signups):

| Ayar | Görülen |
|---|---|
| Allow new users to sign up | **AÇIK** |
| Allow anonymous sign-ins | Kapalı |
| Confirm email | Açık |
| Auth Providers | yalnız Email etkin; Phone, SAML 2.0, Web3 Wallet, Apple, Azure, Bitbucket, Discord, Facebook, Figma, GitHub, GitLab, Google, Kakao, KeyCloak … kapalı |

Etkisi: açık (publishable) anahtar HTML'de olduğundan herkes `/auth/v1/signup` ile hesap açıp kendi e-postasını doğrulayarak
`authenticated` olabilirdi. `rls-kimlik.sql` public şemasındaki tabloların çoğuna `giris_yapmis_hersey` politikası + tablo yetkisi
verdiği için böyle bir hesap ERP verisini (cariler, siparişler, muhasebe …) OKUYABİLİRDİ; yazmaların bir kısmı rol tetikleyicileriyle
korunur, okuma kısıtlanmaz. 19 yalnız site portalının dört özel tablosunu kapattı; bu açığı kapsamaz. Depodaki not da kaydın
açılmaması gerektiğini söyler (DEVAM-NOTU.md: "Herkese açık kayıt (`/auth/v1/signup`) açılmamalı").
ERP hesapları servis anahtarıyla açılır (`kullanici` Edge Function, `admin.createUser`) — kayıt ayarından bağımsızdır; site müşteri
girişi Supabase Auth değil `portal_giris` kullanır. Ayarın kapatılması ikisini de etkilemez.

## Düzeltme ve doğrulama

| Adım | Tarih | Yöntem | Sonuç |
|---|---|---|---|
| Ayar kapatıldı | 16 Kasım 2026 | kullanıcı panelden (Claude'un panele erişimi yok) | — |
| Doğrulama 1 | 16 Kasım 2026 | kullanıcının ekran görüntüsü (değişiklikten hemen sonra) | sign up kapalı · anonymous kapalı · confirm email açık |
| Doğrulama 2 | 16 Kasım 2026 | kullanıcının ekran görüntüsü, sayfa YENİLENDİKTEN sonra (kaydedildiğinin kanıtı olarak kabul edildi) | sign up kapalı · anonymous kapalı · confirm email açık · yalnız Email sağlayıcısı etkin |

Doğrulanmayan: sunucunun uyguladığı ayar `https://<proje>.supabase.co/auth/v1/settings` yanıtından (`"disable_signup": true`,
`"external" › "anonymous_users": false`) okunmadı — Claude'un ortamından Supabase'e ağ erişimi yok (403); kullanıcı panel görüntüsüyle
doğruladı. Daha kesin kanıt istenirse bu adres tarayıcıda açılabilir.

## Açık kalan

- **Açıklık süresinin izi:** `stok-v2/guvenlik/20-auth-iz-salt-okur.sql` (salt okunur, yalnız sayı) çalıştırılmadı. ERP listesinde
  olmayan / son günlerde açılmış / doğrulanmamış / anonim hesap çıkarsa SİLİNMEDEN araştırılacak (ne zaman açıldı, son giriş, hangi
  sağlayıcı, ERP verisine erişim izi). Bu sorgunun temiz çıkması ayarın kapalı olduğunun kanıtı SAYILMAZ; yalnız iz yokluğunu gösterir.
- Önceki ölçüm (18, 16 Kasım, ayar açıkken): auth.users 3 · ERP listesinde olmayan 0 · son 30 günde açılan 0.
