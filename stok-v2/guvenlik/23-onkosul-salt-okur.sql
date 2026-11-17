-- =====================================================================================================================
--  23-onkosul-salt-okur.sql — 23'ÜN DURUMU (SALT OKUR; hiçbir şey yazmaz). Supabase › SQL Editor › tamamı › Run.
--  GENEL: HAZIR = 23 uygulanmamış ve uygulanabilir · UYGULANMIŞ = 23 tam ve beklenen hâlde · KARIŞIK = bir kısmı var / farklı
--  (hiçbir dosyayı çalıştırmayın, sonucu paylaşın) · EKSİK = önkoşul tutmuyor.
-- =====================================================================================================================
set default_transaction_read_only = on;

with
nesne as (
  select (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname in
            ('platform_yoneticileri', 'platform_firmalar', 'platform_sozlesmeler', 'platform_odemeler', 'platform_olaylar')) as tablo,
         (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relname like 'platform\_%') as tum_iliski,
         (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in
            ('platform_yonetici_mi', 'platform_odeme_denetle', 'platform_guncelleme_damgasi', 'platform_olay_yaz')) as fonk,
         (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'platform\_%') as tum_fonk,
         (select count(*) from pg_policies where schemaname = 'public' and tablename like 'platform\_%') as politika,
         (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relname like 'platform\_%' and relkind = 'r' and relrowsecurity) as rls,
         (select count(*) from pg_trigger where tgname in ('platform_firma_olay', 'platform_sozlesme_olay', 'platform_odeme_olay',
            'platform_odeme_denetle', 'platform_firma_guncelleme') and not tgisinternal) as tetik
),
acik as (
  select exists (select 1 from pg_class c cross join (values ('anon'), ('authenticated')) r(rol)
                  where c.relnamespace = 'public'::regnamespace and c.relname like 'platform\_%' and c.relkind = 'r'
                    and (has_table_privilege(r.rol, c.oid, 'delete')
                         or (r.rol = 'anon' and has_table_privilege(r.rol, c.oid, 'select'))
                         or (c.relname = 'platform_yoneticileri' and has_table_privilege(r.rol, c.oid, 'select')))) as fazla_yetki
),
satir as (
  select 1 as sira, 'önkoşul: auth.users ve auth.uid()' as kontrol,
         case when to_regclass('auth.users') is not null and to_regprocedure('auth.uid()') is not null then 'var' else 'YOK' end as sonuc
  union all select 2, 'önkoşul: gen_random_uuid()', case when to_regprocedure('gen_random_uuid()') is not null then 'var' else 'YOK' end
  union all select 3, 'platform_ tabloları (5 beklenir)', (select tablo::text || ' / tüm platform_ ilişkileri ' || tum_iliski from nesne)
  union all select 4, 'platform_ fonksiyonları (4 beklenir)', (select fonk::text || ' / tüm platform_ fonksiyonları ' || tum_fonk from nesne)
  union all select 5, 'RLS açık tablo / politika / tetikleyici (5 / 9 / 5 beklenir)', (select rls || ' / ' || politika || ' / ' || tetik from nesne)
  union all select 6, 'fazla yetki (anon okuma, DELETE, yöneticiler listesi)', case when (select fazla_yetki from acik) then 'VAR' else 'yok' end
  union all select 7, 'platform yöneticisi sayısı',
         case when to_regclass('public.platform_yoneticileri') is null then '-' else
           (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.platform_yoneticileri', false, true, '')))[1]::text end
  union all select 8, 'kayıtlar (firma / sözleşme / ödeme)',
         case when to_regclass('public.platform_firmalar') is null then '-' else
           (xpath('/row/n/text()', query_to_xml('select (select count(*) from public.platform_firmalar) || '' / '' || (select count(*) from public.platform_sozlesmeler) || '' / '' || (select count(*) from public.platform_odemeler) as n', false, true, '')))[1]::text end
)
select sira, kontrol, sonuc from satir
union all
select 99, 'GENEL', case
  when (select sonuc from satir where sira = 1) <> 'var' or (select sonuc from satir where sira = 2) <> 'var' then 'EKSİK'
  when (select tum_iliski + tum_fonk from nesne) = 0 then 'HAZIR'
  when (select tablo = 5 and fonk = 4 and tum_fonk = 4 and rls = 5 and politika = 9 and tetik = 5 from nesne)
       and not (select fazla_yetki from acik) then 'UYGULANMIŞ'
  else 'KARIŞIK' end
order by 1;
