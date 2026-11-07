-- =====================================================================================================================
--  GÜVENLİK SIKILAŞTIRMA (madde 4 + 5) — CANLI LİSTE, SALT-OKUR. HİÇBİR ŞEY YAZMAZ: yalnız SELECT.
--  Supabase › SQL Editor yalnız SON sorgunun sonucunu gösterir: üç bölümü AYRI AYRI çalıştırın (bölümü seçip "Run selected")
--  ve her sonucu CSV olarak indirip iletin. Sıkılaştırma listeleri (2-sikilastir.sql) bu çıktılara göre KESİNLEŞİR.
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- BÖLÜM 1 — public şemasındaki fonksiyonlar (uzantılara ait olanlar hariç): imza, tür, SECURITY DEFINER, search_path,
-- sahibi, kimin çalıştırabildiği ve ham yetki listesi (grantor dahil).
-- ---------------------------------------------------------------------------------------------------------------------
select
  p.oid::regprocedure::text                                              as imza,
  case p.prokind when 'f' then case when p.prorettype = 'trigger'::regtype then 'tetikleyici' else 'fonksiyon' end
                 when 'p' then 'prosedür' when 'a' then 'toplama' when 'w' then 'pencere' end as tur,
  l.lanname                                                              as dil,
  p.prosecdef                                                            as security_definer,
  (select c from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') as search_path,
  pg_get_userbyid(p.proowner)                                            as sahip,
  has_function_privilege('anon', p.oid, 'execute')                       as anon_calistirir,
  exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0) as public_calistirir,
  exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
           where a.grantee = (select oid from pg_roles where rolname = 'anon'))  as anon_acik_yetki,
  has_function_privilege('authenticated', p.oid, 'execute')              as authenticated_calistirir,
  has_function_privilege('service_role', p.oid, 'execute')               as service_role_calistirir,
  coalesce(p.proacl::text, '(varsayılan: sahip + PUBLIC)')               as ham_yetki
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
  and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
order by anon_calistirir desc, security_definer desc, imza;

-- ---------------------------------------------------------------------------------------------------------------------
-- BÖLÜM 2 — search_path'i sabit OLMAYAN fonksiyonlarda ŞEMA ADI YAZILMAMIŞ adlar. Gövdedeki "ad(" çağrıları ve
-- from / join / into / update / table / exists sonrasındaki adlar çıkarılır; public ya da pg_catalog'da BULUNMAYIP başka bir
-- şemada (ör. extensions, auth, net, storage) bulunanlar listelenir. Bu adlar search_path sabitlenince çözülmeyebilir.
-- Satır gelmezse: aday fonksiyonların hepsi yalnız public / pg_catalog adları kullanıyor.
-- ---------------------------------------------------------------------------------------------------------------------
with aday as (
  select p.oid, p.oid::regprocedure::text as imza, lower(p.prosrc) as govde
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
  where n.nspname = 'public' and l.lanname in ('sql', 'plpgsql')
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
),
ad as (
  select a.imza, m[1] as ad, 'çağrı' as yer from aday a, regexp_matches(a.govde, '(?<![.a-z0-9_"])([a-z_][a-z0-9_]*)\s*\(', 'g') m
  union
  select a.imza, m[1], 'tablo' from aday a,
    regexp_matches(a.govde, '\m(?:from|join|into|update|table|exists)\s+(?:only\s+)?([a-z_][a-z0-9_]*)\M(?!\s*\.)', 'g') m
),
nesne as (   -- adın bulunduğu şemalar (fonksiyon, tablo / görünüm, tür)
  select proname as ad, nspname as sema from pg_proc join pg_namespace on pg_namespace.oid = pronamespace
  union select relname, nspname from pg_class join pg_namespace on pg_namespace.oid = relnamespace
  union select typname, nspname from pg_type join pg_namespace on pg_namespace.oid = typnamespace
)
select x.imza, x.ad, x.yer, string_agg(distinct o.sema, ', ') as bulundugu_semalar
from ad x join nesne o on o.ad = x.ad
where not exists (select 1 from nesne y where y.ad = x.ad and y.sema in ('public', 'pg_catalog'))
  and o.sema not in ('information_schema', 'pg_toast')
group by x.imza, x.ad, x.yer
order by x.imza, x.ad;

-- ---------------------------------------------------------------------------------------------------------------------
-- BÖLÜM 3 — ORTAM: (a) yeni fonksiyonlara otomatik verilen yetkiler (varsayılan yetkiler), (b) public dışı şemalardaki
-- tablolarda public fonksiyonu çalıştıran tetikleyiciler (ör. auth.users üzerinde — bunlar başka rolle çalışır), (c) adı
-- public fonksiyonu geçen satır güvenliği politikaları (politika, sorguyu yapan rolle değerlendirilir).
-- ---------------------------------------------------------------------------------------------------------------------
select 'varsayilan_yetki' as bolum,
       pg_get_userbyid(d.defaclrole) || ' · ' || coalesce(n.nspname, '(bütün şemalar)') as ad,
       d.defaclacl::text as deger
  from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
 where d.defaclobjtype = 'f'
union all
select 'dis_tetikleyici', tn.nspname || '.' || c.relname || ' · ' || t.tgname, p.oid::regprocedure::text
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace tn on tn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid join pg_namespace pn on pn.oid = p.pronamespace
 where not t.tgisinternal and tn.nspname <> 'public' and pn.nspname = 'public'
union all
select 'politika', pol.schemaname || '.' || pol.tablename || ' · ' || pol.policyname || ' · ' || array_to_string(pol.roles, ','),
       coalesce(pol.qual, '') || case when pol.with_check is not null then ' | check: ' || pol.with_check else '' end
  from pg_policies pol
 where exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and (coalesce(pol.qual, '') || coalesce(pol.with_check, '')) ~ ('\m' || p.proname || '\s*\('))
order by 1, 2;
