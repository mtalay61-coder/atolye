-- =====================================================================================================================
--  25-deneme/teshis-tanimlar-yetki-salt-okur.sql — SALT OKUR TEŞHİS (hiçbir şey yazmaz; ad / e-posta / anahtar dökmez)
--  Neden: `kullanici` sunucu fonksiyonu "Tanımlar okunamadı: permission denied for table tanimlar" döndü. Fonksiyon tanimlar'ı
--  SUPABASE_SERVICE_ROLE_KEY ile okur. İki olasılık: (H1) bu projede service_role'ün tanimlar üzerinde SELECT yetkisi yok;
--  (H2) yetki var ama fonksiyona verilen anahtar service_role olarak tanınmıyor, istek anon / authenticated olarak gidiyor.
--  Ayrıca başarısız denemenin hiçbir şey yazmadığı sayılarla doğrulanır (beklenen: kullanıcı 2 · auth hesabı 3).
--  Çalıştırma: Supabase › deneme projesi (drtmnovafswzcmpacubl) › SQL Editor › dosyanın tamamı › Run.
-- =====================================================================================================================
select sira, kontrol, deger from (
  select 1 as sira, 'service_role tanimlar SELECT' as kontrol, has_table_privilege('service_role', 'public.tanimlar', 'select')::text as deger
  union all select 2, 'service_role public şeması USAGE', has_schema_privilege('service_role', 'public', 'usage')::text
  union all select 3, 'service_role RLS atlar mı (rolbypassrls)', (select rolbypassrls::text from pg_roles where rolname = 'service_role')
  union all select 4, 'anon tanimlar SELECT', has_table_privilege('anon', 'public.tanimlar', 'select')::text
  union all select 5, 'authenticated tanimlar SELECT', has_table_privilege('authenticated', 'public.tanimlar', 'select')::text
  union all select 6, 'tanimlar RLS açık · zorlanmış', (select relrowsecurity::text || ' · ' || relforcerowsecurity::text from pg_class where oid = 'public.tanimlar'::regclass)
  union all select 7, 'tanimlar yetki listesi (grantee=yetkiler)', coalesce((select string_agg(a::text, ' ') from pg_class c, unnest(c.relacl) a where c.oid = 'public.tanimlar'::regclass), 'varsayılan')
  union all select 8, 'kullanıcı kaydı sayısı (beklenen 2 — deneme bir şey yazmadı)', (select coalesce(jsonb_array_length(case when jsonb_typeof(veri -> 'kullanicilar') = 'array' then veri -> 'kullanicilar' else '[]'::jsonb end), 0)::text from public.tanimlar where id = 'tekil')
  union all select 9, 'auth hesabı sayısı (beklenen 3)', (xpath('/row/n/text()', query_to_xml('select count(*) as n from auth.users', false, true, '')))[1]::text
) s order by sira;
