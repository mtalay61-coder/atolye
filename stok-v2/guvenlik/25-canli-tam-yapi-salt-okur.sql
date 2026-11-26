-- CANLI ŞEMANIN TAMAMI — SALT OKUR (26 Kasım, kapsamlı güvenlik / veri bütünlüğü incelemesi). Hiçbir şey yazmaz.
-- NEDEN: eski test şeması (18 Kasım kurulumu) canlıdan FARKLI çıktı (onarim/ONARIM-PAKETI.md: 5 tetikleyici, 2 fonksiyon,
-- kısıt / sütun farkları); inceleme canlının güncel yapısıyla hizalanmış yalıtılmış kopyada yapılacak. 26 Kasım sorgusu yalnız
-- 13 tabloyu kapsıyordu. Bu sorgu public şemasının bütün tablo / görünüm / sütun / kısıt / indeks / tetikleyici / politika /
-- yetkisini, public + auth + storage tetikleyicilerini, yayın (realtime) tablolarını, uzantıları ve fonksiyonların ÖZETİNİ
-- (md5, güvenlik tanımlı mı, ayarlar) verir. Fonksiyon gövdeleri ayrı sorguda (25b), sonuç çok büyümesin.
-- Veri olarak YALNIZ stk_ayar satırı okunur (ayar; kişisel veri yok).
-- OZET satırı: bütün satırların tek md5'i — CSV'nin tam geldiği yeniden hesaplanarak doğrulanır.
-- Kullanım: SQL Editor → çalıştır → "Export → CSV" (limit 20000: ekranın 100 satır sınırına takılmaz).
with s as (
  select 'tablo' as tur, c.relname as ad,
         c.relkind::text || ' rls=' || c.relrowsecurity::text || '/' || c.relforcerowsecurity::text
           || ' secenek=' || coalesce(array_to_string(c.reloptions, ','), '') as tanim
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'f')
  union all
  select 'sütun', a.table_name || '.' || a.column_name,
         a.data_type || case when a.is_nullable = 'NO' then ' not null' else '' end || coalesce(' default ' || a.column_default, '')
    from information_schema.columns a where a.table_schema = 'public'
  union all
  select 'kısıt', c.relname || '.' || k.conname, pg_get_constraintdef(k.oid) || ' gecerli=' || k.convalidated::text
    from pg_constraint k join pg_class c on c.oid = k.conrelid where c.relnamespace = 'public'::regnamespace
  union all
  select 'indeks', i.tablename || '.' || i.indexname, i.indexdef from pg_indexes i where i.schemaname = 'public'
  union all
  select 'tetikleyici', n.nspname || '.' || c.relname || '.' || g.tgname, pg_get_triggerdef(g.oid) || ' etkin=' || g.tgenabled::text
    from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public', 'auth', 'storage') and not g.tgisinternal
  union all
  select 'politika', p.schemaname || '.' || p.tablename || '.' || p.policyname,
         p.cmd || ' ' || p.permissive || ' roller=' || array_to_string(p.roles, ',') || ' using=' || coalesce(p.qual, '-')
           || ' check=' || coalesce(p.with_check, '-')
    from pg_policies p where p.schemaname in ('public', 'storage')
  union all
  select 'tablo yetkisi', c.relname || '.' || r.rol,
         concat_ws(',',
           case when has_table_privilege(r.rol, c.oid, 'select') then 'select' end,
           case when has_table_privilege(r.rol, c.oid, 'insert') then 'insert' end,
           case when has_table_privilege(r.rol, c.oid, 'update') then 'update' end,
           case when has_table_privilege(r.rol, c.oid, 'delete') then 'delete' end,
           case when has_table_privilege(r.rol, c.oid, 'truncate') then 'truncate' end)
    from pg_class c cross join (values ('anon'), ('authenticated')) r(rol)
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'f')
  union all
  select 'fonksiyon', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         'md5=' || md5(pg_get_functiondef(p.oid)) || ' definer=' || p.prosecdef::text || ' dil=' || l.lanname
           || ' oynaklik=' || p.provolatile::text || ' ayar=' || coalesce(array_to_string(p.proconfig, ';'), '')
           || ' anon=' || has_function_privilege('anon', p.oid, 'execute')::text
           || ' authenticated=' || has_function_privilege('authenticated', p.oid, 'execute')::text
           || ' sahip=' || pg_get_userbyid(p.proowner)
    from pg_proc p join pg_language l on l.oid = p.prolang
   where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
  union all
  select 'görünüm', v.viewname, md5(v.definition) from pg_views v where v.schemaname = 'public'
  union all
  select 'dizi', q.sequencename, q.data_type::text from pg_sequences q where q.schemaname = 'public'
  union all
  select 'yayın', p.pubname || '.' || p.schemaname || '.' || p.tablename, 'realtime' from pg_publication_tables p
  union all
  select 'uzantı', e.extname, e.extversion || ' şema=' || e.extnamespace::regnamespace::text from pg_extension e
  union all
  select 'şema', n.nspname, pg_get_userbyid(n.nspowner) from pg_namespace n
   where n.nspname not like 'pg\_%' and n.nspname <> 'information_schema'
  union all
  select 'ayar', 'stk_ayar', (select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)::text from public.stk_ayar a)
)
select tur, ad, tanim from s
union all
select 'OZET', count(*)::text || ' satır', md5(string_agg(tur || '|' || ad || '|' || tanim, chr(10) order by tur, ad, tanim)) from s
order by 1, 2
limit 20000;
