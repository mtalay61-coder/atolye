-- CANLI ŞEMANIN TAMAMI — SALT OKUR (26 Kasım, kapsamlı güvenlik / veri bütünlüğü incelemesi). Hiçbir şey yazmaz.
-- NEDEN: eski test şeması (18 Kasım kurulumu) canlıdan FARKLI çıktı (onarim/ONARIM-PAKETI.md: 5 tetikleyici, 2 fonksiyon,
-- kısıt / sütun farkları); inceleme canlının güncel yapısıyla hizalanmış yalıtılmış kopyada yapılacak. 26 Kasım sorgusu yalnız
-- 13 tabloyu kapsıyordu. Bu sorgu public şemasının bütün tablo / görünüm / sütun / kısıt / indeks / tetikleyici / politika /
-- yetkisini, public + auth + storage tetikleyicilerini, yayın (realtime) tablolarını, uzantıları ve fonksiyonların ÖZETİNİ
-- (md5, güvenlik tanımlı mı, ayarlar) verir. Fonksiyon gövdeleri ayrı sorguda (25b), sonuç çok büyümesin.
-- Veri olarak YALNIZ: stk_ayar satırı (ayar), ERP kullanıcı listesinin rol / yetki ÖZETİ ve auth hesaplarının listede olup olmadığı —
-- e-posta, ad, şifre YAZILMAZ (sıra numarası). Zamanlanmış iş / webhook komutları yazılmaz (anahtar içerebilir), yalnız md5'i.
-- 2. sürüm (27 Kasım): sütun / dizi yetkileri, tablo sahibi, roller, varsayılan yetkiler, olay tetikleyicileri, kovalar, zamanlanmış
-- işler, webhook'lar, hesap özeti eklendi.
-- OZET satırı: bütün satırların tek md5'i — CSV'nin tam geldiği yeniden hesaplanarak doğrulanır.
-- Kullanım: SQL Editor → çalıştır → "Export → CSV" (limit 20000: ekranın 100 satır sınırına takılmaz).
with s as (
  select 'tablo' as tur, c.relname as ad,
         c.relkind::text || ' rls=' || c.relrowsecurity::text || '/' || c.relforcerowsecurity::text
           || ' secenek=' || coalesce(array_to_string(c.reloptions, ','), '') || ' sahip=' || pg_get_userbyid(c.relowner) as tanim
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
  -- SÜTUN DÜZEYİ YETKİ: tablo yetkisi yokken tek tek sütuna verilmiş yazma da yazmadır (has_table_privilege bunu göstermez).
  select 'sütun yetkisi', cp.table_name || '.' || cp.grantee || '.' || cp.privilege_type,
         count(*)::text || '/' || (select count(*) from information_schema.columns c2 where c2.table_schema = 'public' and c2.table_name = cp.table_name)::text
           || ' sütun: ' || string_agg(cp.column_name, ',' order by cp.column_name)
    from information_schema.column_privileges cp
   where cp.table_schema = 'public' and cp.grantee in ('anon', 'authenticated', 'PUBLIC')
   group by cp.table_name, cp.grantee, cp.privilege_type
  union all
  select 'dizi yetkisi', q.sequencename || '.' || r.rol,
         concat_ws(',', case when has_sequence_privilege(r.rol, (q.schemaname || '.' || q.sequencename)::regclass, 'usage') then 'usage' end,
                        case when has_sequence_privilege(r.rol, (q.schemaname || '.' || q.sequencename)::regclass, 'update') then 'update' end)
    from pg_sequences q cross join (values ('anon'), ('authenticated')) r(rol) where q.schemaname = 'public'
  union all
  -- ROLLER: RLS'yi aşan ya da süper kullanıcı rolü uygulamanın rolüne bağlı mı (üyelik dahil).
  select 'rol', r.rolname, 'super=' || r.rolsuper::text || ' bypassrls=' || r.rolbypassrls::text || ' login=' || r.rolcanlogin::text
           || ' uye_oldugu=' || coalesce((select string_agg(g.rolname, ',' order by g.rolname) from pg_auth_members m join pg_roles g on g.oid = m.roleid where m.member = r.oid), '')
    from pg_roles r where r.rolname in ('anon', 'authenticated', 'service_role', 'authenticator', 'postgres', 'supabase_admin')
  union all
  -- VARSAYILAN YETKİLER: ileride açılacak tablo / fonksiyonun kime açık doğacağı.
  select 'varsayılan yetki', pg_get_userbyid(d.defaclrole) || '.' || coalesce(d.defaclnamespace::regnamespace::text, '*') || '.' || d.defaclobjtype::text,
         array_to_string(d.defaclacl, ',')
    from pg_default_acl d
  union all
  select 'olay tetikleyicisi', e.evtname, e.evtevent || ' ' || e.evtfoid::regproc::text || ' etkin=' || e.evtenabled::text from pg_event_trigger e
  union all
  -- DEPOLAMA KOVALARI (yalnız ayar; dosya listesi yok).
  select 'kova', b.id, 'public=' || b.public::text || ' boyut_siniri=' || coalesce(b.file_size_limit::text, '-')
           || ' tur=' || coalesce(array_to_string(b.allowed_mime_types, ','), '-')
    from storage.buckets b
  union all
  -- ZAMANLANMIŞ İŞLER / VERİTABANI WEBHOOK'LARI: komutun kendisi DEĞİL (anahtar içerebilir) — yalnız md5'i ve uzunluğu.
  select 'zamanlanmış iş', 'cron', case when to_regclass('cron.job') is null then 'pg_cron yok'
           else query_to_xml('select jobname, schedule, active, md5(command) as komut_md5, length(command) as komut_boyu from cron.job order by jobname', false, true, '')::text end
  union all
  select 'webhook', 'supabase_functions.hooks', case when to_regclass('supabase_functions.hooks') is null then 'yok'
           else query_to_xml('select hook_table_id::regclass::text as tablo, hook_name from supabase_functions.hooks order by 1, 2', false, true, '')::text end
  union all
  -- HESAPLAR — KİŞİSEL VERİ YOK (e-posta, ad yazılmaz). ERP kullanıcı listesi: sıra no · rol · hangi modüllerde hangi işlemler açık.
  -- auth.users: her hesabın ERP listesinde olup olmadığı (yetki_var_mi ile aynı eşleme: eposta ya da kullanıcı adından @atolye.local).
  select 'erp kullanıcısı', lpad(k.n::text, 3, '0'),
         'rol=' || coalesce(k.j ->> 'rol', '-') || ' eposta_var=' || (coalesce(k.j ->> 'eposta', '') <> '')::text
           || ' yetkiler=' || coalesce((select string_agg(m.key || ':' || (select string_agg(i.key, '+' order by i.key) from jsonb_each_text(m.value) i where i.value = 'true'), ' ' order by m.key)
                                         from jsonb_each(case when jsonb_typeof(k.j -> 'yetkiler') = 'object' then k.j -> 'yetkiler' else '{}'::jsonb end) m), '')
    from public.tanimlar t, jsonb_array_elements(coalesce(t.veri -> 'kullanicilar', '[]'::jsonb)) with ordinality as k(j, n)
   where t.id = 'tekil'
  union all
  select 'giriş ayarı', 'girisAktifMi', coalesce((select veri ->> 'girisAktifMi' from public.tanimlar where id = 'tekil'), 'satır yok')
  union all
  select 'auth hesabı', lpad(row_number() over (order by u.created_at)::text, 3, '0'),
         'listede=' || exists (select 1 from public.tanimlar t, jsonb_array_elements(coalesce(t.veri -> 'kullanicilar', '[]'::jsonb)) k
                                 where t.id = 'tekil' and lower(coalesce(nullif(k ->> 'eposta', ''),
                                   regexp_replace(lower(translate(coalesce(k ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local')) = lower(u.email))::text
           || ' dogrulanmis=' || (u.email_confirmed_at is not null)::text || ' anonim=' || coalesce(u.is_anonymous, false)::text
           || ' yasakli=' || (u.banned_until is not null and u.banned_until > now())::text
    from auth.users u
  union all
  select 'ayar', 'stk_ayar', (select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)::text from public.stk_ayar a)
)
select tur, ad, tanim from s
union all
select 'OZET', count(*)::text || ' satır', md5(string_agg(tur || '|' || ad || '|' || tanim, chr(10) order by tur, ad, tanim)) from s
order by 1, 2
limit 20000;
