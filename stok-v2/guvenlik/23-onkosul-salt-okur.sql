-- =====================================================================================================================
--  23-onkosul-salt-okur.sql — 23'ÜN DURUMU (SALT OKUR; tek select, hiçbir şey yazmaz). Supabase › SQL Editor › tamamı › Run.
--  GENEL: HAZIR = 23 uygulanmamış ve uygulanabilir · UYGULANMIŞ = 23 BİREBİR beklenen hâlde · KARIŞIK = bir kısmı var ya da
--  beklenenden farklı (hiçbir dosyayı çalıştırmayın, sonucu paylaşın) · EKSİK = önkoşul tutmuyor.
--  "UYGULANMIŞ" için sayılar yetmez; her biri tek tek karşılaştırılır ve fark ADIYLA yazılır:
--    - politikalar: tablo, ad, izin türü, komut, roller, USING ve WITH CHECK ifadeleri (ör. okuma kuralı "true" yapılırsa yakalanır)
--    - tablo yetkileri: anon ve authenticated için SELECT / INSERT / UPDATE / DELETE / TRUNCATE / REFERENCES / TRIGGER — sütun
--      düzeyinde verilen yetki ve PUBLIC'ten gelen yetki dahil (ör. ödemeye UPDATE verilirse yakalanır)
--    - fonksiyonlar: gövde özeti (yorum ve boşluk dışı), security definer, search_path ayarı, sahibi, anon / authenticated çalıştırma
--    - tetikleyiciler: tablo, ad, fonksiyon, tür (önce / sonra, ekleme / değiştirme), etkin
--    - RLS: beş tablonun hepsinde açık
--  Fonksiyon ve politika adları şema öneki olmadan karşılaştırılır (sonuç oturumun search_path'ine bağlı kalmasın).
-- =====================================================================================================================
with
b_politika(tablo, ad, izin, komut, roller, kosul, denetim) as (values
  ('platform_firmalar', 'platform_firmalar_degistir', 'PERMISSIVE', 'UPDATE', '{authenticated}', 'platform_yonetici_mi()', 'platform_yonetici_mi()'),
  ('platform_firmalar', 'platform_firmalar_ekle', 'PERMISSIVE', 'INSERT', '{authenticated}', '', 'platform_yonetici_mi()'),
  ('platform_firmalar', 'platform_firmalar_oku', 'PERMISSIVE', 'SELECT', '{authenticated}', 'platform_yonetici_mi()', ''),
  ('platform_odemeler', 'platform_odemeler_ekle', 'PERMISSIVE', 'INSERT', '{authenticated}', '', 'platform_yonetici_mi()'),
  ('platform_odemeler', 'platform_odemeler_oku', 'PERMISSIVE', 'SELECT', '{authenticated}', 'platform_yonetici_mi()', ''),
  ('platform_olaylar', 'platform_olaylar_oku', 'PERMISSIVE', 'SELECT', '{authenticated}', 'platform_yonetici_mi()', ''),
  ('platform_sozlesmeler', 'platform_sozlesmeler_degistir', 'PERMISSIVE', 'UPDATE', '{authenticated}', 'platform_yonetici_mi()', 'platform_yonetici_mi()'),
  ('platform_sozlesmeler', 'platform_sozlesmeler_ekle', 'PERMISSIVE', 'INSERT', '{authenticated}', '', 'platform_yonetici_mi()'),
  ('platform_sozlesmeler', 'platform_sozlesmeler_oku', 'PERMISSIVE', 'SELECT', '{authenticated}', 'platform_yonetici_mi()', '')),
g_politika as (
  select tablename::text, policyname::text, permissive, cmd, roles::text, replace(coalesce(qual, ''), 'public.', ''), replace(coalesce(with_check, ''), 'public.', '')
    from pg_policies where schemaname = 'public' and tablename like 'platform\_%'),
b_yetki(tablo, rol, yetkiler) as (values
  ('platform_firmalar', 'anon', '-'), ('platform_firmalar', 'authenticated', 'INSERT,SELECT,UPDATE'),
  ('platform_odemeler', 'anon', '-'), ('platform_odemeler', 'authenticated', 'INSERT,SELECT'),
  ('platform_olaylar', 'anon', '-'), ('platform_olaylar', 'authenticated', 'SELECT'),
  ('platform_sozlesmeler', 'anon', '-'), ('platform_sozlesmeler', 'authenticated', 'INSERT,SELECT,UPDATE'),
  ('platform_yoneticileri', 'anon', '-'), ('platform_yoneticileri', 'authenticated', '-')),
g_yetki as (
  select t.relname::text, r.rol, coalesce((select string_agg(y.yetki, ',' order by y.yetki)
           from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) y(yetki)
          where case when y.yetki in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES') then has_any_column_privilege(r.rol, t.oid, y.yetki)
                     else has_table_privilege(r.rol, t.oid, y.yetki) end), '-')
    from pg_class t cross join (values ('anon'), ('authenticated')) r(rol)
   where t.relnamespace = 'public'::regnamespace and t.relkind = 'r' and t.relname like 'platform\_%'),
b_fonk(ad, govde, tur, ayar, sahip, calistiran) as (values
  ('platform_guncelleme_damgasi()', '4320cf6983f773e64d7c59e98dd5c40b', 'invoker', 'search_path=public, pg_catalog', 'postgres', '/'),
  ('platform_odeme_denetle()', 'cdf01a2033601292a0c9887fdccbea18', 'definer', 'search_path=public, pg_catalog', 'postgres', '/'),
  ('platform_olay_yaz()', '7556836803e8843f4bc8a5f86f7a1a74', 'definer', 'search_path=public, pg_catalog', 'postgres', '/'),
  ('platform_sozlesme_denetle()', 'cfd5549438b9b8f867c2e4e82fac5874', 'definer', 'search_path=public, pg_catalog', 'postgres', '/'),
  ('platform_yonetici_mi()', 'b2b6679937dd0f3a010484fd311c3ca4', 'definer', 'search_path=public, pg_catalog', 'postgres', '/authenticated')),
g_fonk as (
  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))),
         case when p.prosecdef then 'definer' else 'invoker' end, coalesce(array_to_string(p.proconfig, ';'), '-'),
         pg_get_userbyid(p.proowner)::text,
         (case when has_function_privilege('anon', p.oid, 'execute') then 'anon' else '' end) || '/'
           || (case when has_function_privilege('authenticated', p.oid, 'execute') then 'authenticated' else '' end)
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'platform\_%'),
b_tetik(tablo, ad, fonk, tur, etkin) as (values
  ('platform_firmalar', 'platform_firma_guncelleme', 'platform_guncelleme_damgasi', '19', 'O'),
  ('platform_firmalar', 'platform_firma_olay', 'platform_olay_yaz', '21', 'O'),
  ('platform_odemeler', 'platform_odeme_denetle', 'platform_odeme_denetle', '7', 'O'),
  ('platform_odemeler', 'platform_odeme_olay', 'platform_olay_yaz', '5', 'O'),
  ('platform_sozlesmeler', 'platform_sozlesme_denetle', 'platform_sozlesme_denetle', '19', 'O'),
  ('platform_sozlesmeler', 'platform_sozlesme_olay', 'platform_olay_yaz', '21', 'O')),
g_tetik as (
  select c.relname::text, g.tgname::text, p.proname::text, g.tgtype::text, g.tgenabled::text
    from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_proc p on p.oid = g.tgfoid
   where c.relnamespace = 'public'::regnamespace and c.relname like 'platform\_%' and not g.tgisinternal),
fark as (
  select 'politika' as tur, x.tablo || '.' || x.ad as nesne from ((select * from b_politika except select * from g_politika)
                                                                  union (select * from g_politika except select * from b_politika)) x
  union all
  select 'yetki', x.tablo || ' → ' || x.rol from ((select * from b_yetki except select * from g_yetki)
                                                 union (select * from g_yetki except select * from b_yetki)) x
  union all
  select 'fonksiyon', x.ad from ((select * from b_fonk except select * from g_fonk) union (select * from g_fonk except select * from b_fonk)) x
  union all
  select 'tetikleyici', x.tablo || '.' || x.ad from ((select * from b_tetik except select * from g_tetik)
                                                    union (select * from g_tetik except select * from b_tetik)) x
  union all
  select 'RLS kapalı', c.relname::text from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'platform\_%' and not c.relrowsecurity
),
var_mi as (
  select (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relname like 'platform\_%')
       + (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'platform\_%') as n,
         (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname in
           ('platform_yoneticileri', 'platform_firmalar', 'platform_sozlesmeler', 'platform_odemeler', 'platform_olaylar')) as tablo
),
satir as (
  select 1 as sira, 'önkoşul: auth.users ve auth.uid()' as kontrol,
         case when to_regclass('auth.users') is not null and to_regprocedure('auth.uid()') is not null then 'var' else 'YOK' end as sonuc
  union all select 2, 'önkoşul: gen_random_uuid()', case when to_regprocedure('gen_random_uuid()') is not null then 'var' else 'YOK' end
  union all select 3, 'platform_ nesneleri (tablo / tüm ilişki + fonksiyon)', (select tablo || ' / ' || n from var_mi)
  union all select 4, 'politika farkı', coalesce((select string_agg(distinct nesne, ', ' order by nesne) from fark where tur = 'politika'), 'yok')
  union all select 5, 'tablo yetkisi farkı', coalesce((select string_agg(distinct nesne, ', ' order by nesne) from fark where tur = 'yetki'), 'yok')
  union all select 6, 'fonksiyon farkı (gövde / definer / ayar / sahip / çalıştıran)', coalesce((select string_agg(distinct nesne, ', ' order by nesne) from fark where tur = 'fonksiyon'), 'yok')
  union all select 7, 'tetikleyici farkı', coalesce((select string_agg(distinct nesne, ', ' order by nesne) from fark where tur = 'tetikleyici'), 'yok')
  union all select 8, 'RLS kapalı tablo', coalesce((select string_agg(distinct nesne, ', ' order by nesne) from fark where tur = 'RLS kapalı'), 'yok')
  union all select 9, 'platform yöneticisi sayısı',
         case when to_regclass('public.platform_yoneticileri') is null then '-' else
           (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.platform_yoneticileri', false, true, '')))[1]::text end
  union all select 10, 'kayıtlar (firma / sözleşme / ödeme)',
         case when to_regclass('public.platform_firmalar') is null then '-' else
           (xpath('/row/n/text()', query_to_xml('select (select count(*) from public.platform_firmalar) || '' / '' || (select count(*) from public.platform_sozlesmeler) || '' / '' || (select count(*) from public.platform_odemeler) as n', false, true, '')))[1]::text end
)
select sira, kontrol, sonuc from satir
union all
select 99, 'GENEL', case
  when (select sonuc from satir where sira = 1) <> 'var' or (select sonuc from satir where sira = 2) <> 'var' then 'EKSİK'
  when (select n from var_mi) = 0 then 'HAZIR'
  when (select tablo from var_mi) = 5 and not exists (select 1 from fark) then 'UYGULANMIŞ'
  else 'KARIŞIK' end
order by 1;
