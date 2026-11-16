-- =====================================================================================================================
--  14-guncel-denetim-salt-okur.sql — GÜNCEL GÜVENLİK DENETİMİ (SALT-OKUR, 14 Kasım; 2. düzeltme)
-- =====================================================================================================================
--  Kullanıcı: "Bu güvenlik raporunu güncel durumla doğrula. Önce yalnız salt okunur inceleme yap; canlıda değişiklik yapma."
--
--  HİÇBİR ŞEY YAZMAZ: BEGIN TRANSACTION READ ONLY … ROLLBACK arasında çalışır (yazma denenirse sunucu reddeder). Yalnız katalog
--  (pg_proc, pg_class, yetkiler, politikalar, varsayılan yetkiler) okur; hiçbir fonksiyonu ÇAĞIRMAZ (site_ayarlari() dahil —
--  canlı gövdesi önce 6. bölümde okunur). Şifre, şifre özeti, e-posta, kişi adı DÖNDÜRMEZ — yalnız sayı, evet/hayır, tablo /
--  sütun / fonksiyon / rol adları, vitrin_urunler ve site_ayarlari tanımları. Var olmayabilecek tablolar (guvenlik.yedek,
--  site_hesaplari) yalnız varsa okunur.
--  Çalıştırma: Supabase › SQL Editor › New query › dosyanın TAMAMI › Run. Tek tablo döner: bolum, kontrol, beklenen, sonuc, durum.
--  "durum": tamam (beklenenle aynı) · FARKLI (beklenenden ayrı — incelenecek) · bilgi (hüküm yok, inceleme için veri).
--  HÜKÜM VERMEZ: "SELECT yetkisi var" gerçek veri erişimi demek değildir; RLS, politikalar ve görünüm sahipliği ayrıca okunur.
--  Not: "Allow new users to sign up" ve "anonymous sign-ins" Supabase ayarıdır, SQL'de görünmez — ekran görüntüsü ayrıca.
-- =====================================================================================================================
begin transaction read only;

with
-- Var olmayabilecek tablolardan sayı (yoksa NULL; sorgu hata vermez). Dinamik okuma da salt-okur işlemin içinde.
-- ---------- 1) Fonksiyonlar: girişsiz (anon) çalıştırabildikleri ve sabit search_path (2-sikilastir.sql, 4 Kasım) ----------
site_fn as (
  select to_regprocedure(x) as oid from unnest(array['public.herkese_acik_vitrin()', 'public.site_ayarlari()',
    'public.site_kayit_ol(jsonb, text, text)', 'public.portal_giris(text, text)', 'public.portal(text)',
    'public.portal_hesap(text, date, date)', 'public.portal_siparis(text, jsonb, text, jsonb)', 'public.portal_cikis(text)',
    'public.yonetici_mi()']::text[]) x
),
fn as (
  select p.oid, p.oid::regprocedure::text as imza, p.prosecdef as tanimci, pg_get_userbyid(p.proowner) as sahip,
         has_function_privilege('anon', p.oid, 'execute') as anon,   -- doğrudan, PUBLIC ya da rol üyeliği üzerinden
         exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') as yol_var, l.lanname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
),
-- ---------- 1b) YENİ fonksiyonun varsayılan yetkisi, oluşturan rol başına ----------
-- PostgreSQL: yeni fonksiyonun ACL'i = oluşturanın GLOBAL varsayılanı (defaclnamespace = 0; kayıt YOKSA yerleşik varsayılan:
-- sahip + PUBLIC EXECUTE) + o şemaya özgü varsayılan (yalnız EKLER). anon, PUBLIC üzerinden de yetki alır. Bu yüzden:
-- global kayıt yok → AÇIK; global kayıtta PUBLIC ya da anon var → AÇIK; şemaya özgü kayıtta PUBLIC ya da anon var → AÇIK.
-- Oluşturan roller: public şemasında fonksiyonu olan sahipler + postgres + supabase_admin (varsa).
olusturan as (
  select distinct r.oid, r.rolname from pg_roles r
  where r.rolname in ('postgres', 'supabase_admin') or r.oid in (select p.proowner from pg_proc p where p.pronamespace = 'public'::regnamespace)
),
vars as (
  select o.rolname,
         g.defaclacl is not null as global_kayit,
         coalesce((select bool_or(a.grantee = 0) from aclexplode(g.defaclacl) a where a.privilege_type = 'EXECUTE'), false) as global_public,
         coalesce((select bool_or(a.grantee = (select oid from pg_roles where rolname = 'anon')) from aclexplode(g.defaclacl) a where a.privilege_type = 'EXECUTE'), false) as global_anon,
         coalesce((select bool_or(a.grantee = 0 or a.grantee = (select oid from pg_roles where rolname = 'anon'))
                   from aclexplode(s.defaclacl) a where a.privilege_type = 'EXECUTE'), false) as sema_public_anon
  from olusturan o
  left join pg_default_acl g on g.defaclrole = o.oid and g.defaclnamespace = 0 and g.defaclobjtype = 'f'
  left join pg_default_acl s on s.defaclrole = o.oid and s.defaclnamespace = 'public'::regnamespace and s.defaclobjtype = 'f'
),
-- ---------- 2) Tablo / görünüm: SELECT yetkisi, RLS, anon'a uyan politikalar, sütun yetkisi ----------
rel as (
  select c.oid, c.relname, c.relkind, c.relrowsecurity as rls, c.relforcerowsecurity as rls_zorunlu,
         pg_get_userbyid(c.relowner) as sahip, coalesce(c.reloptions, '{}') as secenek,
         has_table_privilege('anon', c.oid, 'select') as anon_select,
         has_table_privilege('anon', c.oid, 'insert') or has_table_privilege('anon', c.oid, 'update')
           or has_table_privilege('anon', c.oid, 'delete') as anon_yazma_yetkisi,
         has_table_privilege('authenticated', c.oid, 'select') as auth_select,
         has_any_column_privilege('anon', c.oid, 'select') as anon_sutun_select,
         ('security_invoker=true' = any(coalesce(c.reloptions, '{}')) or 'security_invoker=on' = any(coalesce(c.reloptions, '{}'))) as invoker
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p', 'f')
),
-- anon'a uyan (rolleri anon ya da public olan) SELECT / ALL politikaları
anon_pol as (
  select p.tablename, string_agg(p.policyname || ' [' || p.permissive || ' ' || p.cmd || ' : ' || coalesce(p.qual, 'true') || ']', '; ') as politikalar
  from pg_policies p
  where p.schemaname = 'public' and p.cmd in ('SELECT', 'ALL') and (p.roles && array['anon', 'public']::name[])
  group by p.tablename
),
-- anon'un SELECT (tablo ya da sütun) yetkisi olan her ilişki için okuma koşulu — HÜKÜM DEĞİL, inceleme verisi.
anon_okuma as (
  select r.relname,
         case
           when r.relkind = 'v' and not r.invoker then 'görünüm, sahibinin (' || r.sahip || ') yetkisiyle çalışır: alttaki RLS anon için uygulanmaz'
           when r.relkind = 'v' then 'görünüm, çağıranın yetkisiyle (security_invoker): alttaki tabloların RLS/politikasına bağlı'
           when r.relkind in ('r', 'p') and not r.rls then 'RLS KAPALI: yetki yeterli, satırlar politika olmadan okunur'
           when r.relkind in ('r', 'p') and ap.politikalar is null then 'RLS açık, anon''a uyan SELECT politikası YOK (satır dönmez beklenir)'
           when r.relkind in ('r', 'p') then 'RLS açık, anon politikası: ' || ap.politikalar
           else 'tür ' || r.relkind::text
         end || case when not r.anon_select and r.anon_sutun_select then ' · YALNIZ SÜTUN DÜZEYİNDE yetki' else '' end as kosul
  from rel r left join anon_pol ap on ap.tablename = r.relname
  where r.anon_select or r.anon_sutun_select
),
-- Sütun düzeyinde anon / PUBLIC yetkileri (tablo düzeyinde yetki olmasa da sütun okunabilir)
sutun as (
  select table_name, string_agg(distinct grantee || ':' || column_name || ':' || privilege_type, ', ') as yetkiler
  from information_schema.column_privileges
  where table_schema = 'public' and grantee in ('anon', 'PUBLIC')
    and not exists (select 1 from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = column_privileges.table_name
                    and g.grantee = column_privileges.grantee and g.privilege_type = column_privileges.privilege_type)
  group by table_name
),
hassas as (
  select r.* from rel r where r.relname in ('urunler', 'varyantlar', 'stok_hareketleri', 'stk_stok', 'stk_hareket', 'stk_fis',
    'cariler', 'cari_hareketleri', 'car_hareket', 'muhasebe', 'kas_hesap', 'kas_hareket', 'kas_cek', 'tanimlar', 'siparisler',
    'siparis_kalemleri', 'uretim', 'gunluk', 'site_hesaplari', 'site_oturumlari', 'site_talepleri', 'site_kayit_talepleri',
    'site_giris_kaydi', 'faturalar', 'teklifler', 'koliler')
),
-- ---------- 3) vitrin_urunler ----------
vit as (select to_regclass('public.vitrin_urunler') as oid),
vit_kaynak as (
  select distinct d.refobjid as oid, d.refobjid::regclass::text as ad
  from pg_depend d join pg_rewrite w on w.oid = d.objid
  where w.ev_class = (select oid from vit) and d.refobjid <> (select oid from vit) and d.classid = 'pg_rewrite'::regclass
    and d.refclassid = 'pg_class'::regclass
),
-- ---------- 4) Hesaplar (yalnız SAYI) ----------
erp_eposta as (
  select lower(trim(k->>'eposta')) as e from public.tanimlar t, jsonb_array_elements(coalesce(t.veri->'kullanicilar', '[]'::jsonb)) k
  where t.id = 'tekil' and coalesce(k->>'eposta', '') <> ''
),
hesap as (select to_jsonb(u) as j from auth.users u),
-- ---------- 5) SMTP: yalnız firmaBilgileri.eposta.sifre (DEĞER DÖNMEZ) ----------
smtp as (
  select t.veri #> '{firmaBilgileri,eposta}' as ayar,
         nullif(btrim(coalesce(t.veri #>> '{firmaBilgileri,eposta,sifre}', '')), '') as deger,   -- yalnız karşılaştırma için; çıktıya girmez
         coalesce(t.veri -> 'siteAyarlari', '{}'::jsonb)::text as site_metni
  from public.tanimlar t where t.id = 'tekil'
),
-- ---------- 6) site_ayarlari() canlı tanımı (ÇAĞRILMAZ) ----------
site_ay as (select to_regprocedure('public.site_ayarlari()') as oid)
select bolum, kontrol, beklenen, sonuc,
       case when beklenen = '' then 'bilgi' when beklenen = sonuc then 'tamam' else 'FARKLI' end as durum
from (
  -- 1) Fonksiyonlar
  select 1 as s, '1 fonksiyon' as bolum, 'anon EXECUTE yetkisi olan fonksiyon sayısı (doğrudan + PUBLIC)' as kontrol, '9' as beklenen,
         (select count(*) from fn where anon)::text as sonuc
  union all select 2, '1 fonksiyon', 'anon EXECUTE olanların hepsi site (8) + yonetici_mi', 'true',
         coalesce((select bool_and(oid in (select oid from site_fn)) from fn where anon), true)::text
  union all select 3, '1 fonksiyon', 'anon EXECUTE olan fonksiyonlar (imza · tanımcı yetkisiyle mi)', '',
         coalesce((select string_agg(imza || case when tanimci then ' [SECURITY DEFINER]' else '' end, ', ' order by imza) from fn where anon), '-')
  union all select 4, '1 fonksiyon', 'search_path sabit OLMAYAN fonksiyon (c/internal hariç)', '0',
         (select count(*) from fn where not yol_var and lanname not in ('c', 'internal'))::text
  union all select 5, '1 fonksiyon', 'search_path sabit olmayanlar (ad)', '',
         coalesce((select string_agg(imza, ', ' order by imza) from fn where not yol_var and lanname not in ('c', 'internal')), '-')
  union all select 6, '1 fonksiyon', 'guvenlik.yedek TABLOSU var mı (içerik ayrı satırda)', 'true',
         (to_regclass('guvenlik.yedek') is not null)::text
  union all select 7, '1 fonksiyon', 'guvenlik.yedek g1 içeriği: fonksiyon satırı / varsayılan satırı (4 Kasım: 31 / 1)', '31 / 1',
         case when to_regclass('guvenlik.yedek') is null then 'tablo yok' else
           (xpath('/row/c/text()', query_to_xml('select count(*) filter (where tur = ''fonksiyon'') || '' / '' || count(*) filter (where tur = ''varsayilan'') as c from guvenlik.yedek where uygulama = ''g1''', false, true, '')))[1]::text end
  union all select 8, '1 fonksiyon', 'yeni fonksiyon anon''a AÇIK doğan oluşturucu rol sayısı', '0',
         (select count(*) from vars where not global_kayit or global_public or global_anon or sema_public_anon)::text
  union all select 9, '1 fonksiyon', 'oluşturucu rol başına varsayılan (global kayıt / global PUBLIC / global anon / şema PUBLIC|anon)', '',
         coalesce((select string_agg(rolname || ': ' || case when not global_kayit then 'global kayıt YOK → yerleşik varsayılan PUBLIC EXECUTE'
                     else 'global var, PUBLIC ' || global_public::text || ', anon ' || global_anon::text end
                     || ', şema PUBLIC|anon ' || sema_public_anon::text, ' · ' order by rolname) from vars), '-')
  -- 2) Tablolar / görünümler
  union all select 10, '2 tablo', 'anon SELECT yetkisi olan tablo / görünüm (tablo düzeyi, surum dışında)', '0',
         (select count(*) from rel where anon_select and relname <> 'surum')::text
  union all select 11, '2 tablo', 'anon SELECT yetkisi (tablo ya da sütun) olanlar ve okuma koşulu (RLS / politika / görünüm)', '',
         coalesce((select string_agg(relname || ' → ' || kosul, ' | ' order by relname) from anon_okuma), '-')
  union all select 12, '2 tablo', 'anon INSERT/UPDATE/DELETE yetkisi olan tablo / görünüm', '0',
         (select count(*) from rel where anon_yazma_yetkisi)::text
  union all select 13, '2 tablo', 'anon / PUBLIC yalnız SÜTUN düzeyi yetkiler (tablo:rol:sütun:yetki)', '-',
         coalesce((select string_agg(table_name || ' {' || yetkiler || '}', ' | ' order by table_name) from sutun), '-')
  union all select 14, '2 tablo', 'RLS kapalı tablo (ad)', '',
         coalesce((select string_agg(relname, ', ' order by relname) from rel where relkind in ('r', 'p') and not rls), '-')
  union all select 15, '2 tablo', 'security_invoker OLMAYAN görünüm (sahip)', '',
         coalesce((select string_agg(relname || ' (' || sahip || ')', ', ' order by relname) from rel where relkind = 'v' and not invoker), '-')
  union all select 16, '2 tablo', 'hassas ERP tablolarında anon SELECT yetkisi (tablo ya da sütun) olan', '0',
         (select count(*) from hassas where anon_select or anon_sutun_select)::text
  union all select 17, '2 tablo', 'hassas tablolar: anon yetkisi olanlar ve okuma koşulu', '',
         coalesce((select string_agg(a.relname || ' → ' || a.kosul, ' | ' order by a.relname) from anon_okuma a where a.relname in (select relname from hassas)), '-')
  -- 3) vitrin_urunler
  union all select 20, '3 vitrin_urunler', 'görünüm var mı', '', ((select oid from vit) is not null)::text
  union all select 21, '3 vitrin_urunler', 'sahibi', '', coalesce((select sahip from rel where oid = (select oid from vit)), '-')
  union all select 22, '3 vitrin_urunler', 'security_invoker açık mı', '', coalesce((select invoker::text from rel where oid = (select oid from vit)), '-')
  union all select 23, '3 vitrin_urunler', 'anon SELECT yetkisi var mı (tablo düzeyi)', '', coalesce((select anon_select::text from rel where oid = (select oid from vit)), '-')
  union all select 24, '3 vitrin_urunler', 'anon en az bir sütunda SELECT yetkisi var mı (tablo yetkisi dahil)', '', coalesce((select anon_sutun_select::text from rel where oid = (select oid from vit)), '-')
  union all select 25, '3 vitrin_urunler', 'authenticated SELECT yetkisi var mı', '', coalesce((select auth_select::text from rel where oid = (select oid from vit)), '-')
  union all select 26, '3 vitrin_urunler', 'sütunlar (anon''un SELECT yetkisi olanlar *)', '',
         coalesce((select string_agg(a.attname || case when has_column_privilege('anon', a.attrelid, a.attnum, 'select') then '*' else '' end, ', ' order by a.attnum)
                   from pg_attribute a where a.attrelid = (select oid from vit) and a.attnum > 0 and not a.attisdropped), '-')
  union all select 27, '3 vitrin_urunler', 'dayandığı tablolar (RLS açık / zorunlu)', '',
         coalesce((select string_agg(k.ad || ' (rls ' || c.relrowsecurity::text || ', zorunlu ' || c.relforcerowsecurity::text || ')', ', ' order by k.ad)
                   from vit_kaynak k join pg_class c on c.oid = k.oid), '-')
  union all select 28, '3 vitrin_urunler', 'dayandığı tabloların politikaları (rol : koşul)', '',
         coalesce((select string_agg(p.tablename || '.' || p.policyname || ' [' || p.permissive || ' ' || p.cmd || ' → ' || array_to_string(p.roles, '/') || ' : ' || coalesce(p.qual, 'true') || ']', '; ')
                   from pg_policies p join vit_kaynak k on k.oid = (quote_ident(p.schemaname) || '.' || quote_ident(p.tablename))::regclass), '-')
  union all select 29, '3 vitrin_urunler', 'tanım', '', coalesce((select pg_get_viewdef((select oid from vit), true)), '-')
  union all select 30, '3 vitrin_urunler', 'urunler.vitrinde_mi sütunu var mı', '',
         exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'urunler' and column_name = 'vitrinde_mi')::text
  -- 4) Hesaplar: site müşterisi ↔ ERP
  union all select 40, '4 hesap', 'auth.users toplam hesap', '', (select count(*) from hesap)::text
  union all select 41, '4 hesap', 'anonim (is_anonymous) hesap', '0', (select count(*) from hesap where (j->>'is_anonymous')::boolean is true)::text
  union all select 42, '4 hesap', 'ERP kullanıcı listesinde OLMAYAN hesap (sayı)', '0',
         (select count(*) from hesap where lower(coalesce(j->>'email', '')) not in (select e from erp_eposta))::text
  union all select 43, '4 hesap', 'ERP listesinde olmayan hesapların en yenisinin açılış tarihi', '',
         coalesce((select max(left(j->>'created_at', 10)) from hesap where lower(coalesce(j->>'email', '')) not in (select e from erp_eposta)), '-')
  union all select 44, '4 hesap', 'site müşteri hesabı sayısı (site_hesaplari — Supabase hesabı DEĞİL)', '',
         case when to_regclass('public.site_hesaplari') is null then 'tablo yok' else
           (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.site_hesaplari', false, true, '')))[1]::text end
  union all select 45, '4 hesap', 'site müşteri / oturum tablolarında anon yetkisi (tablo ya da sütun)', 'false',
         coalesce((select bool_or(anon_select or anon_sutun_select or anon_yazma_yetkisi)::text from rel
                   where relname in ('site_hesaplari', 'site_oturumlari', 'site_talepleri', 'site_kayit_talepleri', 'site_giris_kaydi')), 'false')
  -- 5) SMTP şifresi (yalnız firmaBilgileri.eposta.sifre)
  union all select 50, '5 smtp', 'firmaBilgileri.eposta ayarı var mı', '', ((select ayar from smtp) is not null)::text
  union all select 51, '5 smtp', 'firmaBilgileri.eposta ALAN ADLARI (değer yok)', '',
         coalesce((select string_agg(k, ', ' order by k) from smtp, jsonb_object_keys(case when jsonb_typeof(ayar) = 'object' then ayar else '{}'::jsonb end) k), '-')
  union all select 52, '5 smtp', 'firmaBilgileri.eposta.sifre DOLU mu (değer dönmez)', 'false', ((select deger from smtp) is not null)::text
  union all select 53, '5 smtp', 'SMTP şifresinin DEĞERİ siteAyarlari içinde geçiyor mu', 'false',
         case when (select deger from smtp) is null then 'karşılaştırılamaz (tanımlarda şifre yok)'
              else (position((select deger from smtp) in (select site_metni from smtp)) > 0)::text end
  -- 6) site_ayarlari() — çağrılmadı; canlı tanım incelenecek
  union all select 60, '6 site_ayarlari', 'fonksiyon var mı / SECURITY DEFINER / sahip / search_path', '',
         coalesce((select 'var · definer ' || p.prosecdef::text || ' · sahip ' || pg_get_userbyid(p.proowner) || ' · ' || coalesce(array_to_string(p.proconfig, ','), 'search_path yok')
                   from pg_proc p where p.oid = (select oid from site_ay)), 'yok')
  union all select 61, '6 site_ayarlari', 'anon EXECUTE yetkisi', '', coalesce((select has_function_privilege('anon', (select oid from site_ay), 'execute')::text where (select oid from site_ay) is not null), '-')
  union all select 62, '6 site_ayarlari', 'canlı tanım (gövde)', '', coalesce((select pg_get_functiondef((select oid from site_ay)) where (select oid from site_ay) is not null), '-')
) k
order by s;

rollback;

-- ---------------------------------------------------------------------------------------------------------------------
-- AYRI, İSTEĞE BAĞLI (yalnız 62. satırdaki gövde incelenip yalnız okuduğu görüldükten sonra): site_ayarlari() çıktısında SMTP şifre
-- DEĞERİ geçiyor mu? Değer dönmez, yalnız true/false. Tanımlarda şifre yoksa "karşılaştırılamaz" döner.
-- begin transaction read only;
-- select case when nullif(btrim(coalesce(t.veri #>> '{firmaBilgileri,eposta,sifre}', '')), '') is null then 'karşılaştırılamaz (tanımlarda şifre yok)'
--             else (position(btrim(t.veri #>> '{firmaBilgileri,eposta,sifre}') in public.site_ayarlari()::text) > 0)::text end as site_ayarlari_ciktisinda_smtp_sifresi
-- from public.tanimlar t where t.id = 'tekil';
-- rollback;
