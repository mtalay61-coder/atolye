-- =====================================================================================================================
--  25-deneme/sonra-kullanici-ve-kapsam-salt-okur.sql — SALT OKUR (yazmaz; ad / e-posta / anahtar dökmez, yalnız sayar)
--  1–2: DenemeMuhasebe ne uygulama listesinde ne Auth hesaplarında var mı (yeniden deneme öncesi; 0 · 0 beklenir).
--  3–6: service_role eksikliği yalnız tanimlar'da mı, kurulumun geneli mi (kurulum_betigi.sql 8. adımı service_role'ü hiç
--       yeniden kurmuyor — bkz. KURULUM-SERVICE-ROLE.md). Yalnız ölçer; başka tablo / fonksiyona yetki VERİLMEZ.
-- =====================================================================================================================
select sira, kontrol, deger from (
  select 1 as sira, 'uygulama listesinde DenemeMuhasebe (kullaniciAdi, büyük/küçük harf duyarsız)' as kontrol,
    (select count(*)::text from public.tanimlar t, jsonb_array_elements(case when jsonb_typeof(t.veri -> 'kullanicilar') = 'array' then t.veri -> 'kullanicilar' else '[]'::jsonb end) x
      where t.id = 'tekil' and lower(coalesce(x ->> 'kullaniciAdi', '')) = 'denememuhasebe') as deger
  union all select 2, 'Auth hesabı denememuhasebe@atolye.local', (xpath('/row/n/text()', query_to_xml('select count(*) as n from auth.users where lower(email) = ''denememuhasebe@atolye.local''', false, true, '')))[1]::text
  union all select 3, 'public tablolar: toplam · service_role SELECT YOK', (select count(*) || ' · ' || count(*) filter (where not has_table_privilege('service_role', c.oid, 'select'))
      from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p'))
  union all select 4, 'public fonksiyonlar: toplam · service_role EXECUTE YOK', (select count(*) || ' · ' || count(*) filter (where not has_function_privilege('service_role', p.oid, 'execute'))
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'))
  union all select 5, 'service_role SELECT olmayan ilk 15 tablo', coalesce((select string_agg(relname, ', ') from (select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and not has_table_privilege('service_role', c.oid, 'select') order by 1 limit 15) z), '-')
  union all select 6, 'postgres varsayılan yetkileri (public; tablolar)', coalesce((select string_agg(a::text, ' ') from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace, unnest(d.defaclacl) a
      where n.nspname = 'public' and d.defaclobjtype = 'r' and pg_get_userbyid(d.defaclrole) = 'postgres'), 'yok')
) s order by sira;
