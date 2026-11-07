-- SIKILAŞTIRMA SONRASI DOĞRULAMA (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. 2-sikilastir.sql çalıştıktan sonra; her satırın
-- "beklenen" sütunu "sonuc" ile aynı olmalı (tamam = true). Yedek 31 fonksiyon = kapanacak 22 ∪ yolu sabitlenen 20 (11'i ortak) + 1 varsayılan.
select kontrol, beklenen, sonuc, beklenen = sonuc as tamam from (
with
acik as (select to_regprocedure(x) as oid from unnest(array['public.herkese_acik_vitrin()', 'public.site_ayarlari()', 'public.site_kayit_ol(jsonb, text, text)',
    'public.portal_giris(text, text)', 'public.portal(text)', 'public.portal_hesap(text, date, date)',
    'public.portal_siparis(text, jsonb, text, jsonb)', 'public.portal_cikis(text)', 'public.yonetici_mi()']::text[]) x),
fn as (
  select p.oid, has_function_privilege('anon', p.oid, 'execute') as anon,
         exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') as yol_var, l.lanname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
),
y as (select * from guvenlik.yedek where uygulama = 'g1')
select 'girişsiz çalıştırabilen fonksiyon' as kontrol, '9' as beklenen, (select count(*) from fn where anon)::text as sonuc
union all select 'girişsiz açık olanların hepsi site + yonetici_mi', 'true',
  (select bool_and(oid in (select oid from acik)) from fn where anon)::text
union all select 'search_path''i sabit olmayan fonksiyon', '0', (select count(*) from fn where not yol_var and lanname not in ('c', 'internal'))::text
union all select 'yedeklenen fonksiyon', '31', (select count(*) from y where tur = 'fonksiyon')::text
union all select 'giriş yapmış kullanıcı yetkisi değişen', '0',
  (select count(*) from y where tur = 'fonksiyon' and has_function_privilege('authenticated', to_regprocedure(imza), 'execute') is distinct from auth_once)::text
union all select 'sunucu (service_role) yetkisi değişen', '0',
  (select count(*) from y where tur = 'fonksiyon' and has_function_privilege('service_role', to_regprocedure(imza), 'execute') is distinct from servis_once)::text
union all select 'yeni fonksiyonlar girişsize kapalı (postgres · public varsayılanı)', 'true',
  (not exists (select 1 from pg_default_acl d, aclexplode(d.defaclacl) a
                where d.defaclrole = (select oid from pg_roles where rolname = 'postgres') and d.defaclnamespace = 'public'::regnamespace
                  and d.defaclobjtype = 'f' and a.grantee = (select oid from pg_roles where rolname = 'anon')))::text
union all select 'yedeklenen varsayılan yetki', '1', (select count(*) from y where tur = 'varsayilan')::text
) k;
