-- =====================================================================================================================
--  kurulum-betigi.sql — YENİ FİRMA KURULUM DOSYASINI ÜRETEN FONKSİYONLAR (v2, 17 Kasım 2026; ilk hâli v1.642.0)
-- =====================================================================================================================
--  NEDEN YENİDEN: v1.642 betiği v2 geçişinden sonra bozuktu (uygulamada düğme kapalıydı; DEVAM-NOTU "kurulum betiği v2 için
--  yeniden yazılmalı"). Yerel ölçüm (t23 kabul testi): üretilen dosya boş projede "function public.stk_dizi(jsonb) does not
--  exist" ile düşüyordu (fonksiyonlar alfabetik, gövde denetimi açık), görünümleri (v2'nin eski adları) hiç kurmuyordu, stk_ayar
--  satırı yoktu ve dosya Supabase SQL Editor'ün ayırıcısına uygun değildi (adlı / iç içe dolar tırnağı).
--
--  ÜRETİLEN DOSYA (yeni, BOŞ Supabase projesinde SQL Editor › dosyanın TAMAMI › Run; tek işlem — hata olursa hiçbir şey kalmaz):
--    · Editor uyumlu: tek "do" bloğu (düz çift-dolar) + sonuç select'i; başka hiçbir yerde dolar işareti yok (gövdelerdeki dolar
--      chr(36) ile yazılır), gövde satırları "|| '…'" biçiminde (Editor'ün yorum / boş satır temizliği gövdeye dokunamaz).
--    · Sıra: uzantılar → diziler → tablolar → birincil / benzersiz / dışlama kısıtları → fonksiyonlar (gövde denetimi KAPALI:
--      birbirini çağıranlar sıradan bağımsız) → görünümler (birbirine bağımlılık sırasıyla) → kontrol kısıtları → yabancı
--      anahtarlar → dizinler → replica identity → ayar satırları → tetikleyiciler (+ etkinlik) → RLS + politikalar → yayın
--      üyelikleri → yetkiler → varsayılan yetkiler → DOĞRULAMA.
--    · Yetkiler BİREBİR: önce public'teki bütün tablo / görünüm / dizi / fonksiyonlardan public, anon, authenticated, service_role
--      yetkileri alınır, sonra kaynaktaki her yetki (sütun düzeyi ve "with grant option" dahil) verilir; postgres rolünün
--      varsayılan yetkileri (public şeması ve genel) ve public ŞEMASININ kendi yetkileri (USAGE / CREATE) aynı yolla.
--    · VERİ TAŞIMAZ: hiçbir tablonun satırı dosyaya girmez. Yalnız üç AYAR satırı yazılır: stk_ayar (v2 bayrakları, liste
--      tabloları, en düşük istemci sürümü — zaman damgaları kurulum anı), degisiklik ve kas_ayar (boş varsayılanlar).
--    · DOĞRULAMA: kaynağın parmak izi (kurulum_parmak_izi(): 17 kategori — sütunlar, tablo seçenekleri, diziler, kısıtlar, dizinler,
--      görünümler, fonksiyonlar, tetikleyiciler, RLS, politikalar, tablo / sütun / fonksiyon / ŞEMA / varsayılan yetkileri, yayınlar, ayar)
--      dosyaya gömülür; kurulumun sonunda hedefte aynı fonksiyon çalışır. Bir kategori bile tutmazsa VEYA ayar dışı herhangi bir
--      tabloda satır varsa kurulum hata verir ve BÜTÜNÜYLE geri alınır. Tutarsa sonuç kurulum.sonuc'tan gösterilir.
--    · Güvenlik: yalnız postgres rolüyle (SQL Editor) ve public şeması BOŞKEN çalışır (dolu firmaya yanlışlıkla yapıştırılırsa
--      hiçbir şeye dokunmadan durur).
--
--  KULLANIM (bir kez, ANA projede): Supabase › SQL Editor › bu dosyanın tamamı › Run. Tekrar çalıştırmak zararsız.
--  Sonra uygulamada Tanımlar › Yedek & Bulut › "Yeni firma kurulum dosyasını indir" (yalnız Yönetici).
--  Kapsam dışı (projede elle): Edge Functions ve gizli değerleri, Auth ayarları, Storage kovaları / kuralları, zamanlanmış işler
--  (gün sonu), supabase_admin'in varsayılan yetkileri (postgres değiştiremez). Bkz. yeni-firma-kurulum.md.
-- =====================================================================================================================

-- Metni, Editor ayırıcısının bozamayacağı bir SQL metin ifadesine çevirir: tek tırnak ikilenir, dolar chr(36), her satır
-- "|| '…'" ile ayrı satırda (gövde içi yorum / boş satır Editor temizliğine takılmaz). standard_conforming_strings = on varsayar
-- (ters bölü aynen kalır) — üretilen dosya bunu kurulumdan önce denetler.
create or replace function public.kurulum_metni(x text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select '''' || replace(replace(replace(coalesce(x, ''), '''', ''''''), chr(36), ''' || chr(36) || '''),
                         chr(10), ''' || chr(10)' || chr(10) || '    || ''') || ''''
$$;

-- Şemanın parmak izi: kategori başına sayı + adların / tanımların tek md5 özeti. Kaynakta (dosya üretilirken) ve hedefte
-- (kurulumun sonunda) AYNI fonksiyon çalışır. search_path pg_catalog: tanımlar şema önekiyle yazılır, oturumdan bağımsız.
-- Uzantılara ait nesneler sayılmaz. Veri sayılmaz; yalnız "ayar" kategorisi stk_ayar'ın zaman damgası dışı alanlarını ve
-- degisiklik / kas_ayar satırlarının VARLIĞINI ölçer (içerikleri firmaya özgü).
create or replace function public.kurulum_parmak_izi()
returns table (kategori text, sayi bigint, ozet text)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  ayar_json jsonb;
begin
  if to_regclass('public.stk_ayar') is not null then
    execute 'select coalesce(jsonb_agg(j order by j), ''[]''::jsonb) from (select to_jsonb(a) - array(select attname::text from pg_attribute '
         || 'where attrelid = ''public.stk_ayar''::regclass and atttypid = ''timestamptz''::regtype and attnum > 0) as j from public.stk_ayar a) x'
       into ayar_json;
  end if;
  return query
  with
  iliski as (
    select c.oid, c.relname, c.relkind from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'S')
       and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')),
  islev as (
    select p.* from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')),
  rol(oid, ad) as (
    select 0::oid, 'PUBLIC' union all
    select oid, rolname::text from pg_roles where rolname in ('anon', 'authenticated', 'service_role')),
  satir(kategori, metin) as (
    select 'sütunlar', i.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
           || ' notnull=' || a.attnotnull || ' default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '-')
           || ' identity=' || a.attidentity::text || ' generated=' || a.attgenerated::text
           || ' collation=' || coalesce((select collname from pg_collation where oid = a.attcollation and a.attcollation <> t.typcollation), '-')
           || ' sira=' || (select count(*) from pg_attribute b where b.attrelid = a.attrelid and b.attnum > 0 and not b.attisdropped and b.attnum <= a.attnum)
      from iliski i join pg_attribute a on a.attrelid = i.oid and a.attnum > 0 and not a.attisdropped
      join pg_type t on t.oid = a.atttypid left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
     where i.relkind in ('r', 'p')
    union all
    select 'tablo seçenekleri', c.relname || ' kalicilik=' || c.relpersistence::text || ' replident=' || c.relreplident::text
           || ' secenek=' || coalesce(array_to_string(c.reloptions, ','), '-')
      from pg_class c join iliski i on i.oid = c.oid where i.relkind in ('r', 'p')
    union all
    select 'diziler', i.relname || ' ' || format_type(s.seqtypid, null) || ' +' || s.seqincrement || ' [' || s.seqmin || ',' || s.seqmax || '] bas='
           || s.seqstart || ' onbellek=' || s.seqcache || ' dongu=' || s.seqcycle
           || ' sahip=' || coalesce((select t.relname || '.' || a.attname from pg_depend d join pg_class t on t.oid = d.refobjid
                                       join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
                                      where d.classid = 'pg_class'::regclass and d.objid = i.oid and d.deptype in ('a', 'i') limit 1), '-')
      from iliski i join pg_sequence s on s.seqrelid = i.oid
    union all
    select 'kısıtlar', c.relname || '.' || k.conname || ' ' || k.contype::text || ' ' || pg_get_constraintdef(k.oid) || ' gecerli=' || k.convalidated
      from pg_constraint k join pg_class c on c.oid = k.conrelid join iliski i on i.oid = c.oid
    union all
    select 'dizinler', pg_get_indexdef(x.indexrelid)
      from pg_index x join iliski i on i.oid = x.indrelid
    union all
    -- görünüm: seçenekler + DIŞA VERDİĞİ sütunlar (ad, tip) + tanım. Tanımda yalnız tablo fonksiyonlarının iç sütun takma ad listesi
    -- "(…)" olur: o liste fonksiyonun döndürdüğü tipin görünüm KURULDUĞU andaki sütunlarını yazar (görünümden sonra tabloya sütun
    -- eklenmişse kaynakta eski, yeni projede güncel liste) — görünümün arayüzünü değiştirmez, arayüz "sütunlar=" ile ayrıca ölçülür.
    select 'görünümler', i.relname || ' ' || coalesce(array_to_string(c.reloptions, ','), '-')
           || ' sutunlar=' || (select string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod), ',' order by a.attnum)
                                 from pg_attribute a where a.attrelid = i.oid and a.attnum > 0 and not a.attisdropped)
           || ' ' || regexp_replace(pg_get_viewdef(i.oid), '\) ([a-z_][a-z0-9_]*)\([a-z_][a-z0-9_]*(, [a-z_][a-z0-9_]*)*\)', ') \1(…)', 'g')
      from iliski i join pg_class c on c.oid = i.oid where i.relkind in ('v', 'm')
    union all
    select 'fonksiyonlar', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') -> ' || pg_get_function_result(p.oid)
           || ' dil=' || (select lanname from pg_language where oid = p.prolang) || ' govde=' || md5(p.prosrc)
           || ' definer=' || p.prosecdef || ' oynaklik=' || p.provolatile::text || ' strict=' || p.proisstrict || ' leakproof=' || p.proleakproof
           || ' paralel=' || p.proparallel::text || ' tur=' || p.prokind::text || ' maliyet=' || p.procost || ' satir=' || p.prorows
           || ' ayar=' || coalesce(array_to_string(p.proconfig, ';'), '-')
      from islev p
    union all
    select 'tetikleyiciler', pg_get_triggerdef(g.oid) || ' etkin=' || g.tgenabled::text
      from pg_trigger g join iliski i on i.oid = g.tgrelid where not g.tgisinternal
    union all
    select 'rls', c.relname || ' rls=' || c.relrowsecurity || ' zorunlu=' || c.relforcerowsecurity
      from pg_class c join iliski i on i.oid = c.oid where i.relkind in ('r', 'p')
    union all
    select 'politikalar', c.relname || '.' || p.polname || ' izin=' || p.polpermissive || ' komut=' || p.polcmd::text
           || ' roller=' || (select string_agg(case when r = 0 then 'PUBLIC' else pg_get_userbyid(r)::text end, ',' order by 1) from unnest(p.polroles) r)
           || ' using=' || coalesce(pg_get_expr(p.polqual, p.polrelid), '-') || ' check=' || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '-')
      from pg_policy p join pg_class c on c.oid = p.polrelid join iliski i on i.oid = c.oid
    union all
    select 'tablo yetkileri', i.relname || ' ' || r.ad || ' ' || e.privilege_type || ' grant_option=' || e.is_grantable
      from iliski i join pg_class c on c.oid = i.oid cross join lateral aclexplode(c.relacl) e join rol r on r.oid = e.grantee
    union all
    select 'sütun yetkileri', i.relname || '.' || a.attname || ' ' || r.ad || ' ' || e.privilege_type || ' grant_option=' || e.is_grantable
      from iliski i join pg_attribute a on a.attrelid = i.oid and a.attnum > 0 and not a.attisdropped and a.attacl is not null
      cross join lateral aclexplode(a.attacl) e join rol r on r.oid = e.grantee
    union all
    select 'fonksiyon yetkileri', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') ' || r.ad || ' ' || e.privilege_type
      from islev p cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) e join rol r on r.oid = e.grantee
    union all
    select 'şema yetkileri', r.ad || ' ' || e.privilege_type || ' grant_option=' || e.is_grantable
      from pg_namespace ns cross join lateral aclexplode(coalesce(ns.nspacl, acldefault('n', ns.nspowner))) e join rol r on r.oid = e.grantee
     where ns.nspname = 'public'
    union all
    select 'varsayılan yetkiler', case when d.defaclnamespace = 0 then 'genel' else d.defaclnamespace::regnamespace::text end
           || ' ' || d.defaclobjtype::text || ' ' || r.ad || ' ' || e.privilege_type
      from pg_default_acl d cross join lateral aclexplode(d.defaclacl) e join rol r on r.oid = e.grantee
     where pg_get_userbyid(d.defaclrole) = 'postgres' and d.defaclnamespace in (0, 'public'::regnamespace)
    union all
    select 'yayınlar', p.pubname || ' ' || c.relname
      from pg_publication_rel pr join pg_publication p on p.oid = pr.prpubid join pg_class c on c.oid = pr.prrelid join iliski i on i.oid = c.oid
    union all
    select 'ayar', 'stk_ayar ' || coalesce(ayar_json::text, 'tablo yok')
    union all
    select 'ayar', t || ' satır=' || (case when to_regclass('public.' || t) is null then 'tablo yok'
                                           else (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.' || t, false, true, '')))[1]::text end)
      from unnest(array['degisiklik', 'kas_ayar']) t
  )
  select k.ad, count(s.metin), coalesce(md5(string_agg(s.metin, chr(10) order by s.metin)), '-')
    from unnest(array['sütunlar', 'tablo seçenekleri', 'diziler', 'kısıtlar', 'dizinler', 'görünümler', 'fonksiyonlar', 'tetikleyiciler',
                      'rls', 'politikalar', 'tablo yetkileri', 'sütun yetkileri', 'fonksiyon yetkileri', 'şema yetkileri', 'varsayılan yetkiler', 'yayınlar',
                      'ayar']) with ordinality as k(ad, sira)
    left join satir s on s.kategori = k.ad
   group by k.ad, k.sira
   order by k.sira;
end
$$;

create or replace function public.kurulum_betigi()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  d2 constant text := chr(36) || chr(36);           -- dosyadaki "do" bloğunun düz çift-doları
  cikti text := '';
  govde text := '';
  n int := 0;
  r record;
  rr record;
  s text;
  yetkiler text;
  ayar_satiri jsonb;
  zaman_sutunlari text[];
  yapildi text[] := '{}';
  ilerledi boolean;
  pi_satirlari text := '';
  hedef_rol constant text[] := array['anon', 'authenticated', 'service_role'];
begin
  -- Yalnız Yönetici (ya da SQL Editor / servis rolü: jwt boş). Betik şemayı ve kuralları açık eder.
  if auth.jwt() is not null and not public.yonetici_mi() then
    raise exception 'Kurulum dosyasını yalnız Yönetici indirebilir' using errcode = '42501';
  end if;
  perform set_config('search_path', 'pg_catalog', true);   -- tanımlar şema önekiyle yazılsın (fonksiyonun SET'i çıkışta döner)

  -- ── adım yazıcı: kurulum_metni ile Editor-güvenli metin ─────────────────────────────────────────────────────────────
  -- (yerel kısa yol yok: her adım "adim := n; aciklama := …; execute …;" üç satırı)

  -- 1) uzantılar: kaynakta "extensions" şemasında olanlar (Supabase'in standart yeri)
  for r in select e.extname from pg_extension e where e.extnamespace = to_regnamespace('extensions') order by 1 loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('uzantı ' || r.extname),
      public.kurulum_metni(format('create extension if not exists %I with schema extensions', r.extname)));
  end loop;

  -- 2) diziler (kimlik sütunlarınınki hariç: tabloyla doğar)
  for r in
    select c.relname, s.* from pg_class c join pg_sequence s on s.seqrelid = c.oid
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'
       and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype in ('i', 'e'))
     order by c.relname
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('dizi ' || r.relname),
      public.kurulum_metni(format('create sequence public.%I as %s increment by %s minvalue %s maxvalue %s start with %s cache %s %s',
        r.relname, format_type(r.seqtypid, null), r.seqincrement, r.seqmin, r.seqmax, r.seqstart, r.seqcache,
        case when r.seqcycle then 'cycle' else 'no cycle' end)));
  end loop;

  -- 3) tablolar
  for r in
    select c.oid, c.relname, c.relpersistence, c.reloptions from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
       and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
     order by c.relname
  loop
    select string_agg(
      format('  %I %s', a.attname, format_type(a.atttypid, a.atttypmod))
        || case when a.attcollation <> 0 and a.attcollation <> t.typcollation
                then (select format(' collate %I.%I', n2.nspname, co.collname) from pg_collation co join pg_namespace n2 on n2.oid = co.collnamespace where co.oid = a.attcollation)
                else '' end
        || case
             when a.attidentity in ('a', 'd') then
               (select format(' generated %s as identity (increment by %s minvalue %s maxvalue %s start with %s cache %s %s)',
                         case a.attidentity when 'a' then 'always' else 'by default' end, s2.seqincrement, s2.seqmin, s2.seqmax, s2.seqstart, s2.seqcache,
                         case when s2.seqcycle then 'cycle' else 'no cycle' end)
                  from pg_depend d join pg_sequence s2 on s2.seqrelid = d.objid
                 where d.refobjid = a.attrelid and d.refobjsubid = a.attnum and d.deptype = 'i' and d.classid = 'pg_class'::regclass limit 1)
             when a.attgenerated = 's' then ' generated always as (' || pg_get_expr(ad.adbin, ad.adrelid) || ') stored'
             when ad.adbin is not null then ' default ' || pg_get_expr(ad.adbin, ad.adrelid)
             else '' end
        || case when a.attnotnull and a.attidentity = '' then ' not null' else '' end,
      E',\n' order by a.attnum)
      into s
      from pg_attribute a join pg_type t on t.oid = a.atttypid
      left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
     where a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped;
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('tablo ' || r.relname),
      public.kurulum_metni(format(E'create %stable public.%I (\n%s\n)%s', case when r.relpersistence = 'u' then 'unlogged ' else '' end,
        r.relname, coalesce(s, ''), case when r.reloptions is not null then ' with (' || array_to_string(r.reloptions, ', ') || ')' else '' end)));
  end loop;
  -- dizi sahipliği (serial)
  for r in
    select s.relname as dizi, t.relname as tablo, a.attname as sutun
      from pg_depend d join pg_class s on s.oid = d.objid and s.relkind = 'S'
      join pg_class t on t.oid = d.refobjid join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
     where d.deptype = 'a' and s.relnamespace = 'public'::regnamespace and t.relnamespace = 'public'::regnamespace
     order by 1
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('dizi sahipliği ' || r.dizi),
      public.kurulum_metni(format('alter sequence public.%I owned by public.%I.%I', r.dizi, r.tablo, r.sutun)));
  end loop;

  -- 4) birincil / benzersiz / dışlama kısıtları (görünümler birincil anahtara dayanabilir: önce bunlar)
  for r in
    select k.conname, c.relname, pg_get_constraintdef(k.oid) as tanim from pg_constraint k join pg_class c on c.oid = k.conrelid
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and k.contype in ('p', 'u', 'x') order by c.relname, k.conname
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('kısıt ' || r.relname || '.' || r.conname),
      public.kurulum_metni(format('alter table public.%I add constraint %I %s', r.relname, r.conname, r.tanim)));
  end loop;

  -- 5) fonksiyonlar (uzantılara ait olanlar hariç). Başlık pg_get_functiondef'ten, gövde prosrc'den tek tırnakla.
  for r in
    select p.oid, p.proname, p.prosrc, pg_get_functiondef(p.oid) as tanim from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
       and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
     order by p.proname, p.oid
  loop
    s := left(r.tanim, strpos(r.tanim, E'\nAS ' || chr(36)));
    if s = '' then raise exception 'fonksiyon başlığı ayrılamadı: %', r.proname; end if;
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('fonksiyon ' || r.oid::regprocedure::text),
      public.kurulum_metni(s || 'AS ' || '''' || replace(r.prosrc, '''', '''''') || ''''));
  end loop;

  -- 6) görünümler: birbirine bağımlılık sırasıyla (bağımlı olduğu bütün public görünümleri kurulmuş olan önce)
  loop
    ilerledi := false;
    for r in
      select c.oid, c.relname, c.relkind, c.reloptions, pg_get_viewdef(c.oid) as tanim from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm') and not (c.relname = any (yapildi))
         and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
         and not exists (
           select 1 from pg_rewrite w join pg_depend d on d.classid = 'pg_rewrite'::regclass and d.objid = w.oid
             join pg_class o on o.oid = d.refobjid
            where w.ev_class = c.oid and o.oid <> c.oid and o.relnamespace = 'public'::regnamespace and o.relkind in ('v', 'm')
              and not (o.relname = any (yapildi)))
       order by c.relname
    loop
      n := n + 1;
      govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('görünüm ' || r.relname),
        public.kurulum_metni(format(E'create %s public.%I%s as\n%s', case when r.relkind = 'm' then 'materialized view' else 'view' end, r.relname,
          case when r.reloptions is not null then ' with (' || array_to_string(r.reloptions, ', ') || ')' else '' end,
          rtrim(rtrim(r.tanim), ';'))));
      yapildi := yapildi || r.relname::text;
      ilerledi := true;
    end loop;
    exit when not ilerledi;
  end loop;
  if exists (select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm') and not (c.relname = any (yapildi))
               and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')) then
    raise exception 'görünümler arasında çözülemeyen bağımlılık var';
  end if;

  -- 7) kontrol kısıtları, sonra yabancı anahtarlar
  for r in
    select k.conname, c.relname, pg_get_constraintdef(k.oid) as tanim, k.contype from pg_constraint k join pg_class c on c.oid = k.conrelid
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and k.contype in ('c', 'f')
     order by case k.contype when 'c' then 0 else 1 end, c.relname, k.conname
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('kısıt ' || r.relname || '.' || r.conname),
      public.kurulum_metni(format('alter table public.%I add constraint %I %s', r.relname, r.conname, r.tanim)));
  end loop;

  -- 8) kısıta bağlı olmayan dizinler
  for r in
    select ic.relname, pg_get_indexdef(i.indexrelid) as tanim from pg_index i join pg_class ic on ic.oid = i.indexrelid
      join pg_class tc on tc.oid = i.indrelid
     where tc.relnamespace = 'public'::regnamespace and not exists (select 1 from pg_constraint k where k.conindid = i.indexrelid)
       and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = tc.oid and d.deptype = 'e')
     order by ic.relname
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('dizin ' || r.relname), public.kurulum_metni(r.tanim));
  end loop;

  -- 9) replica identity (varsayılan dışı)
  for r in
    select c.relname, c.relreplident, (select ic.relname from pg_index i join pg_class ic on ic.oid = i.indexrelid where i.indrelid = c.oid and i.indisreplident) as dizin
      from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relreplident <> 'd' order by 1
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('replica identity ' || r.relname),
      public.kurulum_metni(format('alter table public.%I replica identity %s', r.relname,
        case r.relreplident when 'f' then 'full' when 'n' then 'nothing' else format('using index %I', r.dizin) end)));
  end loop;

  -- 10) ayar satırları — VERİ DEĞİL: v2 bayrakları (kaynaktan), sayaç ve kasa ayarı (boş varsayılanlar). Tetikleyicilerden ÖNCE.
  if to_regclass('public.stk_ayar') is not null then
    select coalesce(array_agg(attname::text), '{}') into zaman_sutunlari from pg_attribute
     where attrelid = 'public.stk_ayar'::regclass and atttypid = 'timestamptz'::regtype and attnum > 0 and not attisdropped;
    execute 'select to_jsonb(a) from public.stk_ayar a limit 1' into ayar_satiri;
    if ayar_satiri is not null then
      n := n + 1;
      govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('ayar satırı stk_ayar'),
        public.kurulum_metni(format('insert into public.stk_ayar select * from jsonb_populate_record(null::public.stk_ayar, %L::jsonb)',
          (ayar_satiri - zaman_sutunlari)::text)));
      select string_agg(format('%I = now()', k), ', ') into s from unnest(zaman_sutunlari) k where ayar_satiri ->> k is not null;
      if s is not null then
        n := n + 1;
        govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('ayar satırı stk_ayar zamanları (kurulum anı)'),
          public.kurulum_metni('update public.stk_ayar set ' || s));
      end if;
    end if;
  end if;
  foreach s in array array['degisiklik', 'kas_ayar'] loop
    if to_regclass('public.' || s) is not null then
      n := n + 1;
      govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('ayar satırı ' || s || ' (boş varsayılan)'),
        public.kurulum_metni(format('insert into public.%I default values', s)));
    end if;
  end loop;

  -- 11) tetikleyiciler (+ etkinlik durumu)
  for r in
    select g.tgname, c.relname, pg_get_triggerdef(g.oid) as tanim, g.tgenabled from pg_trigger g join pg_class c on c.oid = g.tgrelid
     where c.relnamespace = 'public'::regnamespace and not g.tgisinternal
       and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
     order by c.relname, g.tgname
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('tetikleyici ' || r.relname || '.' || r.tgname), public.kurulum_metni(r.tanim));
    if r.tgenabled <> 'O' then
      n := n + 1;
      govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('tetikleyici durumu ' || r.tgname),
        public.kurulum_metni(format('alter table public.%I %s trigger %I', r.relname,
          case r.tgenabled when 'D' then 'disable' when 'R' then 'enable replica' when 'A' then 'enable always' end, r.tgname)));
    end if;
  end loop;

  -- 12) RLS + politikalar
  for r in
    select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and (c.relrowsecurity or c.relforcerowsecurity) order by 1
  loop
    if r.relrowsecurity then
      n := n + 1;
      govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('RLS ' || r.relname),
        public.kurulum_metni(format('alter table public.%I enable row level security', r.relname)));
    end if;
    if r.relforcerowsecurity then
      n := n + 1;
      govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('RLS zorunlu ' || r.relname),
        public.kurulum_metni(format('alter table public.%I force row level security', r.relname)));
    end if;
  end loop;
  for r in
    select c.relname, p.polname, p.polpermissive, p.polcmd, p.polroles, pg_get_expr(p.polqual, p.polrelid) as kosul,
           pg_get_expr(p.polwithcheck, p.polrelid) as denetim
      from pg_policy p join pg_class c on c.oid = p.polrelid where c.relnamespace = 'public'::regnamespace order by 1, 2
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('politika ' || r.relname || '.' || r.polname),
      public.kurulum_metni(format('create policy %I on public.%I as %s for %s to %s', r.polname, r.relname,
        case when r.polpermissive then 'permissive' else 'restrictive' end,
        case r.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' else 'all' end,
        (select string_agg(case when x = 0 then 'public' else quote_ident(pg_get_userbyid(x)) end, ', ' order by 1) from unnest(r.polroles) x))
        || coalesce(' using (' || r.kosul || ')', '') || coalesce(' with check (' || r.denetim || ')', '')));
  end loop;

  -- 13) yayın üyelikleri (yayın yoksa açılır — Supabase'te supabase_realtime hazır gelir)
  for r in
    select p.pubname, c.relname from pg_publication_rel pr join pg_publication p on p.oid = pr.prpubid join pg_class c on c.oid = pr.prrelid
     where c.relnamespace = 'public'::regnamespace order by 1, 2
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    if not exists (select 1 from pg_catalog.pg_publication where pubname = %s) then execute %s; end if;\n    execute %s;\n',
      n, public.kurulum_metni('yayın ' || r.pubname || ' ' || r.relname), public.kurulum_metni(r.pubname),
      public.kurulum_metni(format('create publication %I', r.pubname)),
      public.kurulum_metni(format('alter publication %I add table public.%I', r.pubname, r.relname)));
  end loop;

  -- 14) yetkiler: önce hepsi alınır, sonra kaynaktaki her yetki birebir
  n := n + 1;
  govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n    execute %s;\n    execute %s;\n', n, public.kurulum_metni('yetkileri sıfırla'),
    public.kurulum_metni('revoke all on all tables in schema public from public, anon, authenticated, service_role'),
    public.kurulum_metni('revoke all on all sequences in schema public from public, anon, authenticated, service_role'),
    public.kurulum_metni('revoke all on all functions in schema public from public, anon, authenticated, service_role'));
  for r in
    select c.relname, c.relkind, case when e.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(e.grantee)) end as kime, e.is_grantable,
           string_agg(lower(e.privilege_type), ', ' order by e.privilege_type) as yetki
      from pg_class c cross join lateral aclexplode(c.relacl) e
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'S')
       and (e.grantee = 0 or pg_get_userbyid(e.grantee) = any (hedef_rol))
       and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
     group by 1, 2, 3, 4 order by 1, 3, 4
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('yetki ' || r.relname || ' → ' || r.kime),
      public.kurulum_metni(format('grant %s on %s public.%I to %s%s', r.yetki, case when r.relkind = 'S' then 'sequence' else 'table' end,
        r.relname, r.kime, case when r.is_grantable then ' with grant option' else '' end)));
  end loop;
  for r in
    select c.relname, a.attname, case when e.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(e.grantee)) end as kime, e.is_grantable,
           string_agg(lower(e.privilege_type), ', ' order by e.privilege_type) as yetki
      from pg_class c join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and a.attacl is not null
      cross join lateral aclexplode(a.attacl) e
     where c.relnamespace = 'public'::regnamespace and (e.grantee = 0 or pg_get_userbyid(e.grantee) = any (hedef_rol))
     group by 1, 2, 3, 4 order by 1, 2, 3
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('sütun yetkisi ' || r.relname || '.' || r.attname),
      public.kurulum_metni(format('grant %s (%I) on table public.%I to %s%s', r.yetki, r.attname, r.relname, r.kime,
        case when r.is_grantable then ' with grant option' else '' end)));
  end loop;
  for r in
    select p.oid, case when e.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(e.grantee)) end as kime, e.is_grantable
      from pg_proc p cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) e
     where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p') and e.privilege_type = 'EXECUTE'
       and (e.grantee = 0 or pg_get_userbyid(e.grantee) = any (hedef_rol))
       and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
     order by p.proname, p.oid, 2
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('fonksiyon yetkisi ' || r.oid::regprocedure::text || ' → ' || r.kime),
      public.kurulum_metni(format('grant execute on function %s to %s%s', r.oid::regprocedure, r.kime, case when r.is_grantable then ' with grant option' else '' end)));
  end loop;

  -- 14b) public ŞEMASININ yetkileri (USAGE / CREATE): yalnız public, anon, authenticated, service_role için birebir
  n := n + 1;
  govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('şema yetkilerini sıfırla'),
    public.kurulum_metni('revoke all on schema public from public, anon, authenticated, service_role'));
  for r in
    select case when e.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(e.grantee)) end as kime, e.is_grantable,
           string_agg(lower(e.privilege_type), ', ' order by e.privilege_type) as yetki
      from pg_namespace ns cross join lateral aclexplode(coalesce(ns.nspacl, acldefault('n', ns.nspowner))) e
     where ns.nspname = 'public' and (e.grantee = 0 or pg_get_userbyid(e.grantee) = any (hedef_rol))
     group by 1, 2 order by 1
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('şema yetkisi public → ' || r.kime),
      public.kurulum_metni(format('grant %s on schema public to %s%s', r.yetki, r.kime, case when r.is_grantable then ' with grant option' else '' end)));
  end loop;

  -- 15) postgres rolünün varsayılan yetkileri (public şeması + genel): önce alınır, sonra kaynaktaki hâl
  n := n + 1;
  govde := govde || format(E'    adim := %s; aciklama := %s;\n', n, public.kurulum_metni('varsayılan yetkileri sıfırla'));
  foreach s in array array['tables', 'sequences', 'functions'] loop
    govde := govde || format(E'    execute %s;\n    execute %s;\n',
      public.kurulum_metni(format('alter default privileges for role postgres in schema public revoke all on %s from public, anon, authenticated, service_role', s)),
      public.kurulum_metni(format('alter default privileges for role postgres revoke all on %s from public, anon, authenticated, service_role', s)));
  end loop;
  for r in
    select d.defaclnamespace, d.defaclobjtype, case when e.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(e.grantee)) end as kime,
           string_agg(lower(e.privilege_type), ', ' order by e.privilege_type) as yetki
      from pg_default_acl d cross join lateral aclexplode(d.defaclacl) e
     where pg_get_userbyid(d.defaclrole) = 'postgres' and d.defaclnamespace in (0, 'public'::regnamespace) and d.defaclobjtype in ('r', 'S', 'f')
       and (e.grantee = 0 or pg_get_userbyid(e.grantee) = any (hedef_rol))
     group by 1, 2, 3 order by 1, 2, 3
  loop
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('varsayılan yetki ' || r.defaclobjtype::text || ' → ' || r.kime),
      public.kurulum_metni(format('alter default privileges for role postgres%s grant %s on %s to %s',
        case when r.defaclnamespace = 0 then '' else ' in schema public' end, r.yetki,
        case r.defaclobjtype when 'r' then 'tables' when 'S' then 'sequences' else 'functions' end, r.kime)));
  end loop;
  -- genel kayıt yoksa fonksiyonlarda yerleşik varsayılan (PUBLIC çalıştırır) geri verilir — yukarıdaki genel "revoke" onu da almıştı
  if not exists (select 1 from pg_default_acl d where pg_get_userbyid(d.defaclrole) = 'postgres' and d.defaclnamespace = 0 and d.defaclobjtype = 'f') then
    n := n + 1;
    govde := govde || format(E'    adim := %s; aciklama := %s;\n    execute %s;\n', n, public.kurulum_metni('varsayılan yetki f → public (yerleşik)'),
      public.kurulum_metni('alter default privileges for role postgres grant execute on functions to public'));
  end if;

  -- KAYNAĞIN PARMAK İZİ (dosyaya gömülür; hedefte aynı fonksiyonla karşılaştırılır)
  for rr in select * from public.kurulum_parmak_izi() loop
    pi_satirlari := pi_satirlari || format(E'      (%s, %s, %s),\n', public.kurulum_metni(rr.kategori), rr.sayi, public.kurulum_metni(rr.ozet));
  end loop;
  pi_satirlari := rtrim(pi_satirlari, E',\n');

  cikti := '-- Atölye ERP — YENİ FİRMA KURULUM DOSYASI (v2)' || E'\n'
    || '-- Üretildi: ' || to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI') || ' (İstanbul) · ' || n || ' adım' || E'\n'
    || '-- Yeni ve BOŞ bir Supabase projesinde: SQL Editor › New query › dosyanın TAMAMI › Run.' || E'\n'
    || '-- Tek işlem: herhangi bir adım ya da sondaki doğrulama tutmazsa HİÇBİR şey kalmaz; ileti adımı ve nedeni yazar.' || E'\n'
    || '-- Veri taşımaz: yalnız yapı + üç ayar satırı (stk_ayar bayrakları, boş degisiklik ve kas_ayar).' || E'\n'
    || '-- Sonuç: en alttaki tablo — her kategori "tamam" olmalı. İlk yönetici için yeni-firma-kurulum.md, adım 3.' || E'\n\n'
    || 'do ' || d2 || E'\ndeclare\n  adim int := 0;\n  aciklama text := ' || public.kurulum_metni('başlangıç') || E';\n  fark text;\n  dolu text;\nbegin\n'
    || E'  if current_user <> ' || public.kurulum_metni('postgres') || E' then\n'
    || E'    raise exception ' || public.kurulum_metni('KURULUM: postgres rolüyle (SQL Editor) çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.') || E', current_user;\n  end if;\n'
    || E'  if current_setting(' || public.kurulum_metni('standard_conforming_strings') || E') <> ' || public.kurulum_metni('on') || E' then\n'
    || E'    raise exception ' || public.kurulum_metni('KURULUM: standard_conforming_strings kapalı. Hiçbir şey değişmedi.') || E';\n  end if;\n'
    || E'  select string_agg(c.relname, ' || public.kurulum_metni(', ') || E') into dolu from pg_catalog.pg_class c\n'
    || E'   where c.relnamespace = ' || public.kurulum_metni('public') || E'::regnamespace and c.relkind in (' || public.kurulum_metni('r') || ', ' || public.kurulum_metni('v') || ', '
    || public.kurulum_metni('m') || ', ' || public.kurulum_metni('S') || ', ' || public.kurulum_metni('p') || E')\n'
    || E'     and not exists (select 1 from pg_catalog.pg_depend d where d.classid = ' || public.kurulum_metni('pg_class') || E'::regclass and d.objid = c.oid and d.deptype = ' || public.kurulum_metni('e') || E');\n'
    || E'  if dolu is not null then\n'
    || E'    raise exception ' || public.kurulum_metni('KURULUM: hedef projenin public şeması boş değil (%). Bu dosya yalnız YENİ, BOŞ projeye uygulanır. Hiçbir şey değişmedi.') || E', dolu;\n  end if;\n'
    || E'  perform set_config(' || public.kurulum_metni('check_function_bodies') || ', ' || public.kurulum_metni('off') || E', true);\n'
    || E'  perform set_config(' || public.kurulum_metni('search_path') || ', ' || public.kurulum_metni('pg_catalog') || E', true);\n'
    || E'  begin\n'
    || govde
    || E'  exception when others then\n'
    || E'    raise exception ' || public.kurulum_metni('KURULUM DURDU — %. adım (%): % [%]. Hiçbir şey değişmedi.') || E', adim, aciklama, sqlerrm, sqlstate;\n  end;\n'
    || E'  -- DOĞRULAMA: kaynağın parmak izi ↔ hedefin parmak izi; ayar dışı tablolarda satır olmamalı\n'
    || E'  execute ' || public.kurulum_metni('create schema if not exists kurulum') || E';\n'
    || E'  execute ' || public.kurulum_metni('revoke all on schema kurulum from public, anon, authenticated') || E';\n'
    || E'  execute ' || public.kurulum_metni('drop table if exists kurulum.sonuc') || E';\n'
    || E'  execute ' || public.kurulum_metni('create table kurulum.sonuc (sira int, kontrol text, beklenen text, sonuc text, durum text)') || E';\n'
    || E'  execute ' || public.kurulum_metni('revoke all on kurulum.sonuc from public, anon, authenticated') || E';\n'
    || E'  insert into kurulum.sonuc\n'
    || E'  select row_number() over (order by k.sira), k.kategori, k.sayi || ' || public.kurulum_metni(' · ') || E' || k.ozet,\n'
    || E'         coalesce(h.sayi || ' || public.kurulum_metni(' · ') || E' || h.ozet, ' || public.kurulum_metni('yok') || E'),\n'
    || E'         case when h.sayi = k.sayi and h.ozet = k.ozet then ' || public.kurulum_metni('tamam') || ' else ' || public.kurulum_metni('FARKLI') || E' end\n'
    || E'    from (select x.*, row_number() over () as sira from (values\n' || pi_satirlari || E'\n    ) as x(kategori, sayi, ozet)) k\n'
    || E'    left join public.kurulum_parmak_izi() h on h.kategori = k.kategori;\n'
    || E'  select string_agg(format(' || public.kurulum_metni('%I') || E', c.relname), ' || public.kurulum_metni(', ') || E') into dolu from pg_catalog.pg_class c\n'
    || E'   where c.relnamespace = ' || public.kurulum_metni('public') || E'::regnamespace and c.relkind in (' || public.kurulum_metni('r') || ', ' || public.kurulum_metni('p') || E')\n'
    || E'     and c.relname not in (' || public.kurulum_metni('stk_ayar') || ', ' || public.kurulum_metni('degisiklik') || ', ' || public.kurulum_metni('kas_ayar') || E')\n'
    || E'     and (xpath(' || public.kurulum_metni('/row/n/text()') || ', query_to_xml(' || public.kurulum_metni('select count(*) as n from public.') || E' || quote_ident(c.relname), false, true, '
    || public.kurulum_metni('') || E')))[1]::text::bigint > 0;\n'
    || E'  insert into kurulum.sonuc values (99, ' || public.kurulum_metni('ayar dışı tablolarda satır') || ', ' || public.kurulum_metni('yok') || E', coalesce(dolu, '
    || public.kurulum_metni('yok') || E'), case when dolu is null then ' || public.kurulum_metni('tamam') || ' else ' || public.kurulum_metni('FARKLI') || E' end);\n'
    || E'  select string_agg(kontrol, ' || public.kurulum_metni(', ') || E') into fark from kurulum.sonuc where durum <> ' || public.kurulum_metni('tamam') || E';\n'
    || E'  if fark is not null then\n'
    || E'    raise exception ' || public.kurulum_metni('KURULUM DOĞRULAMASI TUTMADI (%): kurulum geri alındı, hiçbir şey değişmedi.') || E', fark;\n  end if;\n'
    || 'end ' || d2 || E';\n\n'
    || E'select sira, kontrol, beklenen, sonuc, durum from kurulum.sonuc order by sira;\n';
  return cikti;
end
$$;

revoke all on function public.kurulum_metni(text) from public, anon;
grant execute on function public.kurulum_metni(text) to authenticated;
revoke all on function public.kurulum_parmak_izi() from public, anon, authenticated;
revoke all on function public.kurulum_betigi() from public, anon;
grant execute on function public.kurulum_betigi() to authenticated;
