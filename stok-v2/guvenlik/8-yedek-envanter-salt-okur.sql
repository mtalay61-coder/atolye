-- YEDEK ENVANTERİ (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. YEDEK-DONUS-PROVASI.md § 3 için: canlıda bir kez çalıştırılır,
-- sonuç CSV olarak saklanır (ör. envanter-canli-2026-11-xx.csv). Prova veritabanında AYNI sorgu çalışır; iki CSV satır satır aynı
-- olmalı (zaman damgalı satırlar hariç — bkz. "karsilastir" sütunu). Kişisel veri DÖNDÜRMEZ: yalnız sayı, boyut, ad ve özet (md5).
--   bolum = tablo      → public'teki her tablonun TAM satır sayısı (tahmin değil; query_to_xml ile count(*))
--   bolum = fonksiyon  → public fonksiyon sayısı + tanımlarının tek md5 özeti (şema aynı mı)
--   bolum = auth       → kullanıcı sayısı (auth.users); e-posta vb. DÖNMEZ
--   bolum = storage    → kova başına dosya sayısı ve toplam bayt (dosyaların kendisi veritabanı yedeğinde DEĞİL — plan § 2)
--   bolum = zamanlama  → pg_cron işleri (ad + zamanlama); yoksa satır yok
--   bolum = genel      → veritabanı boyutu, uzantılar, sunucu sürümü
with
tablo as (
  select 'tablo' as bolum, c.relname as ad,
         (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text as deger,
         true as karsilastir
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
fonk as (
  select 'fonksiyon' as bolum, 'public fonksiyonları (sayı · tanım md5)' as ad,
         count(*)::text || ' · ' || md5(string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' || md5(pg_get_functiondef(p.oid)), ',' order by p.proname, pg_get_function_identity_arguments(p.oid))) as deger,
         true as karsilastir
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
),
tetik as (
  select 'fonksiyon' as bolum, 'public tetikleyicileri (sayı · md5)' as ad,
         count(*)::text || ' · ' || coalesce(md5(string_agg(c.relname || '.' || t.tgname || ':' || t.tgenabled::text, ',' order by c.relname, t.tgname)), '-') as deger,
         true as karsilastir
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
kimlik as (
  select 'auth' as bolum, 'auth.users satır sayısı' as ad,
         case when to_regclass('auth.users') is null then 'tablo yok'
              else (xpath('/row/n/text()', query_to_xml('select count(*) as n from auth.users', false, true, '')))[1]::text end as deger,
         true as karsilastir
),
kova as (
  select 'storage' as bolum, 'kova: ' || x.ad as ad, x.deger, true as karsilastir
  from (
    select (xpath('/row/b/text()', r))[1]::text as ad, (xpath('/row/d/text()', r))[1]::text as deger
    from unnest(xpath('/table/row', query_to_xml(
      case when to_regclass('storage.objects') is null then 'select null::text as b, null::text as d where false'
           else 'select bucket_id as b, count(*)::text || '' dosya · '' || coalesce(sum((metadata->>''size'')::bigint), 0)::text || '' bayt'' as d
                   from storage.objects group by bucket_id' end, false, false, ''))) as r
  ) x
),
zaman as (
  select 'zamanlama' as bolum, x.ad, x.deger, true as karsilastir
  from (
    select (xpath('/row/a/text()', r))[1]::text as ad, (xpath('/row/z/text()', r))[1]::text as deger
    from unnest(xpath('/table/row', query_to_xml(
      case when to_regclass('cron.job') is null then 'select null::text as a, null::text as z where false'
           else 'select ''cron: '' || coalesce(jobname, jobid::text) as a, schedule || '' · '' || case when active then ''etkin'' else ''kapalı'' end as z from cron.job' end,
      false, false, ''))) as r
  ) x
),
genel as (
  select 'genel' as bolum, 'veritabanı boyutu' as ad, pg_size_pretty(pg_database_size(current_database())) as deger, false as karsilastir
  union all select 'genel', 'sunucu sürümü', current_setting('server_version'), false
  union all select 'genel', 'uzantılar', (select string_agg(extname || ' ' || extversion, ', ' order by extname) from pg_extension), true
  union all select 'genel', 'envanter zamanı', now()::text, false
)
select bolum, ad, deger, karsilastir from (
  select * from genel union all select * from tablo union all select * from fonk union all select * from tetik
  union all select * from kimlik union all select * from kova union all select * from zaman
) t
order by case bolum when 'genel' then 1 when 'tablo' then 2 when 'fonksiyon' then 3 when 'auth' then 4 when 'storage' then 5 else 6 end, ad;
