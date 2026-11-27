-- CANLI public FONKSİYONLARININ TAM TANIMI — SALT OKUR (26 Kasım). Hiçbir şey yazmaz. 25-canli-tam-yapi-salt-okur.sql'in eşi:
-- orada her fonksiyonun md5'i var; burada gövdenin kendisi (yerel kopya canlı metniyle birebir kurulsun diye; canlı gövdelerde
-- \r\n satır sonu bulunduğu 26 Kasım'da görüldü — CSV olduğu gibi okunacak). Görünüm tanımları da burada.
-- OZET: bütün satırların tek md5'i. Kullanım: SQL Editor → çalıştır → "Export → CSV".
with s as (
  select 'fonksiyon' as tur, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as ad, pg_get_functiondef(p.oid) as tanim
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
  union all
  select 'görünüm', v.viewname, v.definition from pg_views v where v.schemaname = 'public'
  union all
  select distinct 'auth tetikleyici fonksiyonu', p.pronamespace::regnamespace::text || '.' || p.proname, pg_get_functiondef(p.oid)
    from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace n on n.oid = c.relnamespace join pg_proc p on p.oid = g.tgfoid
   where n.nspname in ('auth', 'storage') and not g.tgisinternal
)
select tur, ad, tanim from s
union all
select 'OZET', count(*)::text || ' satır', md5(string_agg(tur || '|' || ad || '|' || tanim, chr(10) order by tur, ad, tanim)) from s
order by 1, 2
limit 20000;
