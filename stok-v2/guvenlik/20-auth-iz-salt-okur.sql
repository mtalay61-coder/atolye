-- =====================================================================================================================
--  20-auth-iz-salt-okur.sql — SUPABASE AUTH: yeni kayıt / anonim giriş açıklığının İZLERİ (SALT OKUNUR, TEK İFADE)
-- =====================================================================================================================
--  AYARLARIN KENDİSİ veritabanında değil (Auth sunucusunun yapılandırması); SQL ile okunamaz. Ayar: Supabase › Authentication ›
--  Sign In / Providers → "Allow new users to sign up" KAPALI, "Allow anonymous sign-ins" KAPALI olmalı. Ya da tarayıcıda
--  https://<proje>.supabase.co/auth/v1/settings?apikey=<publishable anahtar> → "disable_signup": true ve
--  "external" › "anonymous_users": false.
--  Bu sorgu ayar açık kalmış ve KULLANILMIŞ mı diye bakar: anonim hesap, ERP kullanıcı listesinde olmayan hesap, son 30 / 7 günde
--  açılan hesap, kimlik sağlayıcı dağılımı. YALNIZ SAYI (e-posta / kimlik gösterilmez). Hiçbir şey değişmez.
--  Not: ERP hesapları `kullanici` Edge Function'ı ile servis anahtarından açılır (admin.createUser) — bu yol "sign up" ayarından
--  bağımsızdır; ayar kapalıyken de çalışır. Dosyada çift-dolar yok.
-- =====================================================================================================================
with
erp as (
  select case when coalesce(k ->> 'eposta', '') <> '' then lower(k ->> 'eposta')
              else regexp_replace(lower(translate(coalesce(k ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local' end as eposta
  from public.tanimlar tt, jsonb_array_elements(coalesce(tt.veri -> 'kullanicilar', '[]'::jsonb)) k where tt.id = 'tekil'
),
anonim_sutunu as (
  select exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'is_anonymous') as var
),
satirlar(sira, kontrol, beklenen, sonuc, durum) as (
  select 1, 'auth.users: toplam hesap', '', (select count(*)::text from auth.users), 'bilgi'
  union all
  select 2, 'anonim hesap (is_anonymous)', '0',
         case when (select var from anonim_sutunu)
              then (xpath('/row/c/text()', query_to_xml('select count(*) as c from auth.users where is_anonymous', false, true, '')))[1]::text
              else 'sütun yok (bu Auth sürümünde anonim giriş yok)' end,
         case when not (select var from anonim_sutunu) then 'bilgi'
              when (xpath('/row/c/text()', query_to_xml('select count(*) as c from auth.users where is_anonymous', false, true, '')))[1]::text = '0' then 'tamam'
              else 'FARKLI' end
  union all
  select 3, 'e-postasız hesap (telefon / anonim / sağlayıcı)', '0', (select count(*)::text from auth.users where coalesce(email, '') = ''),
         case when (select count(*) from auth.users where coalesce(email, '') = '') = 0 then 'tamam' else 'FARKLI' end
  union all
  select 4, 'ERP kullanıcı listesinde OLMAYAN hesap', '0',
         (select count(*)::text from auth.users u where lower(coalesce(u.email, '')) not in (select eposta from erp)),
         case when (select count(*) from auth.users u where lower(coalesce(u.email, '')) not in (select eposta from erp)) = 0 then 'tamam' else 'FARKLI' end
  union all
  select 5, 'son 30 gün / son 7 günde açılan hesap', '— / —',
         (select count(*) filter (where created_at > now() - interval '30 days') || ' / ' || count(*) filter (where created_at > now() - interval '7 days') from auth.users),
         'bilgi'
  union all
  select 6, 'e-postası doğrulanmamış hesap (kendi kaydolan hesaplar genelde böyle başlar)', '0',
         (select count(*)::text from auth.users where email_confirmed_at is null and coalesce(email, '') <> ''),
         case when (select count(*) from auth.users where email_confirmed_at is null and coalesce(email, '') <> '') = 0 then 'tamam' else 'FARKLI' end
  union all
  select 7, 'kimlik sağlayıcıları (auth.identities: sağlayıcı ×adet)', 'email',
         coalesce((select string_agg(provider || ' ×' || n, ', ' order by provider) from (select provider, count(*) n from auth.identities group by 1) x), 'yok'),
         case when coalesce((select bool_and(provider = 'email') from auth.identities), true) then 'tamam' else 'FARKLI' end
)
select kontrol, beklenen, sonuc, durum from satirlar order by sira;
