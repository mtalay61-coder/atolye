-- ONARIMIN DOKUNDUĞU / İZLEDİĞİ TABLOLARIN YAPISI — SALT OKUR (26 Kasım). Hiçbir şey yazmaz. Editor kuralına uygun (dolar yok).
-- Tetikleyiciler (tanım + etkin mi), tetikleyici fonksiyonlarının tanım özeti, kısıtlar, sütunlar (tür / boş olamaz / varsayılan),
-- RLS bayrakları ve stk_stok görünümünün tanım özeti. En altta "OZET" satırı: bütün satırların tek md5'i — yerel provanın
-- şemasıyla (canlının 18 Kasım yapısı) karşılaştırılır; aynıysa prova canlıyla aynı yapıda yapılmıştır.
with t(ad) as (values ('stk_varyant'), ('urunler'), ('stk_renk'), ('stk_olcu'), ('stk_hareket'), ('stk_fis'), ('siparisler'),
                      ('siparis_kalemleri'), ('tanimlar'), ('degisiklik'), ('silinen_arsiv')),
s as (
  select 'tetikleyici' as tur, c.relname || '.' || g.tgname as ad, pg_get_triggerdef(g.oid) || ' etkin=' || g.tgenabled::text as tanim
    from pg_trigger g join pg_class c on c.oid = g.tgrelid where c.relnamespace = 'public'::regnamespace and c.relname in (select ad from t) and not g.tgisinternal
  union all
  select distinct 'tetikleyici fonksiyonu', p.proname, md5(pg_get_functiondef(p.oid))
    from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_proc p on p.oid = g.tgfoid
   where c.relnamespace = 'public'::regnamespace and c.relname in (select ad from t) and not g.tgisinternal
  union all
  select 'kısıt', c.relname || '.' || k.conname, pg_get_constraintdef(k.oid)
    from pg_constraint k join pg_class c on c.oid = k.conrelid where c.relnamespace = 'public'::regnamespace and c.relname in (select ad from t)
  union all
  select 'sütun', a.table_name || '.' || a.column_name, a.data_type || case when a.is_nullable = 'NO' then ' not null' else '' end || coalesce(' default ' || a.column_default, '')
    from information_schema.columns a where a.table_schema = 'public' and a.table_name in (select ad from t)
  union all
  select 'rls', c.relname, c.relrowsecurity::text || '/' || c.relforcerowsecurity::text
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname in (select ad from t)
  union all
  select 'görünüm', 'stk_stok', md5(pg_get_viewdef('public.stk_stok'::regclass))
)
select tur, ad, tanim from s
union all
select 'OZET', count(*)::text || ' satır', md5(string_agg(tur || '|' || ad || '|' || tanim, chr(10) order by tur, ad, tanim)) from s
order by 1, 2;
