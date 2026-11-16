-- =====================================================================================================================
--  18-site-tablo-politika-salt-okur.sql — 17'nin "6 tablolar" FARKLI satırlarının devamı: site tablolarında politikalar
-- =====================================================================================================================
--  SALT OKUNUR: `begin transaction read only … rollback`. Tablo içeriği okunmaz; yalnız katalog ve SAYILAR.
--  Neden: 17 canlıda (16 Kasım) site_oturumlari / site_hesaplari / site_giris_kaydi / site_kayit_talepleri tablolarında
--  authenticated'a SELECT/INSERT/UPDATE/DELETE buldu (site-portal.sql bunları `revoke all … from anon, authenticated` ile kapatıyor).
--  rls-kimlik.sql public şemasındaki (stk_/car_/kas_/lst_ ve 4 istisna dışındaki) HER tabloya
--  `giris_yapmis_hersey: for all to authenticated using (true) with check (true)` kuruyor — site tabloları istisna DEĞİL.
--  İkisi birlikteyse: giriş yapmış HER ERP kullanıcısı (rolü ne olursa olsun) müşteri oturum anahtarlarını okuyup portalda müşteri
--  yerine geçebilir, şifre özetlerini okuyabilir / değiştirebilir. Bu dosya politikanın canlıda olup olmadığını gösterir.
--  Çalıştırma: Supabase › SQL Editor › bu dosyanın TAMAMI › Run. Sonuç: tablo · kontrol · beklenen · sonuc · durum.
-- =====================================================================================================================
begin transaction read only;

with
t(ad) as (values ('site_oturumlari'), ('site_hesaplari'), ('site_giris_kaydi'), ('site_kayit_talepleri'), ('site_talepleri')),
k as (select t.ad, to_regclass('public.' || t.ad) as oid from t),
satirlar(sira, tablo, kontrol, beklenen, sonuc, durum) as (
  -- 1) authenticated / anon'a uyan politikalar (rolleri authenticated, anon ya da public)
  select 100 + row_number() over (order by k.ad), k.ad, 'authenticated / anon / public''e uyan politikalar (ad [komut : using | check])',
         case when k.ad = 'site_talepleri' then 'giris_yapmis_hersey (ERP talepleri yönetir)' else 'yok' end,
         coalesce((select string_agg(p.policyname || ' [' || p.cmd || ' : ' || coalesce(p.qual, '-') || ' | ' || coalesce(p.with_check, '-') || '] → '
                                     || array_to_string(p.roles, ','), '; ' order by p.policyname)
                   from pg_policies p where p.schemaname = 'public' and p.tablename = k.ad
                     and p.roles && array['authenticated', 'anon', 'public']::name[]), 'yok'),
         case when k.oid is null then 'bilgi'
              when k.ad = 'site_talepleri' then 'bilgi'
              when exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = k.ad
                             and p.roles && array['authenticated', 'anon', 'public']::name[]) then 'AÇIK'
              else 'tamam' end
  from k
  union all
  -- 2) RLS zorlaması ve tablo yetkileri (17 ile aynı, bir arada görmek için)
  select 200 + row_number() over (order by k.ad), k.ad, 'RLS · force · authenticated S/I/U/D · anon S',
         'açık · — · ✗✗✗✗ · ✗',
         case when k.oid is null then 'tablo yok' else
           (select case when c.relrowsecurity then 'açık' else 'KAPALI' end || ' · ' || case when c.relforcerowsecurity then 'force' else '—' end
            from pg_class c where c.oid = k.oid) || ' · ' ||
           (select string_agg(case when has_table_privilege('authenticated', k.oid, x) then '✓' else '✗' end, '' order by o)
            from unnest(array['select', 'insert', 'update', 'delete']) with ordinality u(x, o)) || ' · ' ||
           case when has_table_privilege('anon', k.oid, 'select') then '✓' else '✗' end end,
         'bilgi'
  from k
  -- 3) Gerçek erişim: authenticated tablo yetkisi VE ona uyan politika birlikte varsa satırlar okunur / yazılır
  union all
  select 300 + row_number() over (order by k.ad), k.ad, 'giriş yapmış her ERP kullanıcısı satırları OKUYABİLİR mi (yetki + politika)',
         case when k.ad = 'site_talepleri' then 'evet (beklenen)' else 'hayır' end,
         case when k.oid is null then 'tablo yok'
              when has_table_privilege('authenticated', k.oid, 'select')
                   and exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = k.ad and p.cmd in ('SELECT', 'ALL')
                                 and p.roles && array['authenticated', 'public']::name[]) then 'evet' else 'hayır' end,
         case when k.oid is null or k.ad = 'site_talepleri' then 'bilgi'
              when has_table_privilege('authenticated', k.oid, 'select')
                   and exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = k.ad and p.cmd in ('SELECT', 'ALL')
                                 and p.roles && array['authenticated', 'public']::name[]) then 'AÇIK' else 'tamam' end
  from k
  -- 4) authenticated kimlerden oluşuyor (yalnız sayı; e-posta gösterilmez). ERP kullanıcısı = tanimlar.kullanicilar (yonetici_mi ile aynı eşleme).
  union all
  select 400, '(auth)', 'auth.users: toplam / ERP kullanıcı listesinde OLMAYAN / son 30 günde oluşturulan', '— / 0 / —',
         (select count(*) || ' / ' ||
                 count(*) filter (where lower(coalesce(u.email, '')) not in (
                   select case when coalesce(k2 ->> 'eposta', '') <> '' then lower(k2 ->> 'eposta')
                               else regexp_replace(lower(translate(coalesce(k2 ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local' end
                   from public.tanimlar tt, jsonb_array_elements(coalesce(tt.veri -> 'kullanicilar', '[]'::jsonb)) k2 where tt.id = 'tekil')) || ' / ' ||
                 count(*) filter (where u.created_at > now() - interval '30 days')
          from auth.users u),
         case when (select count(*) from auth.users u where lower(coalesce(u.email, '')) not in (
                   select case when coalesce(k2 ->> 'eposta', '') <> '' then lower(k2 ->> 'eposta')
                               else regexp_replace(lower(translate(coalesce(k2 ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local' end
                   from public.tanimlar tt, jsonb_array_elements(coalesce(tt.veri -> 'kullanicilar', '[]'::jsonb)) k2 where tt.id = 'tekil')) = 0
              then 'tamam' else 'FARKLI' end
  union all
  select 401, '(auth)', 'ERP kullanıcıları rol dağılımı (rol: adet) — Yönetici dışındakiler de authenticated', '',
         coalesce((select string_agg(r || ': ' || n, ', ' order by r) from (
            select coalesce(k2 ->> 'rol', '(boş)') r, count(*) n
            from public.tanimlar tt, jsonb_array_elements(coalesce(tt.veri -> 'kullanicilar', '[]'::jsonb)) k2 where tt.id = 'tekil' group by 1) x), '—'),
         'bilgi'
  -- 5) 17'deki "carisi ERP'de bulunmayan 3 hesap": cari_id biçimi (değer gösterilmez)
  union all
  select 500, 'site_hesaplari', 'carisi bulunmayan hesapların cari_id biçimi (uzunluk · uuid biçimli mi · sayısal mı) ×adet', '',
         coalesce((select string_agg(b || ' ×' || n, ', ') from (
            select length(h.cari_id) || ' · ' || (h.cari_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') || ' · ' || (h.cari_id ~ '^[0-9]+$') b, count(*) n
            from public.site_hesaplari h where not exists (select 1 from public.cariler c where c.id::text = h.cari_id) group by 1) x), 'yok'),
         'bilgi'
  union all
  select 501, 'site_hesaplari', 'karşılaştırma için: cariler.id türü · örnek uzunluk', '',
         (select format_type(a.atttypid, a.atttypmod) from pg_attribute a where a.attrelid = 'public.cariler'::regclass and a.attname = 'id')
           || ' · ' || coalesce((select min(length(id::text)) || '–' || max(length(id::text)) from public.cariler), '—'),
         'bilgi'
)
select tablo, kontrol, beklenen, sonuc, durum from satirlar order by sira;

rollback;
