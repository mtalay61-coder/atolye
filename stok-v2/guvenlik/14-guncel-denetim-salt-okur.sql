-- =====================================================================================================================
--  14-guncel-denetim-salt-okur.sql — GÜNCEL GÜVENLİK DENETİMİ (SALT-OKUR, 14 Kasım)
-- =====================================================================================================================
--  Kullanıcı: "Bu güvenlik raporunu güncel durumla doğrula. Önce yalnız salt okunur inceleme yap; canlıda değişiklik yapma."
--
--  HİÇBİR ŞEY YAZMAZ: yalnız katalog (pg_proc, pg_class, yetkiler, politikalar) ve SAYI okur. Şifre, şifre özeti, e-posta,
--  kişi adı DÖNDÜRMEZ — yalnız sayılar, evet/hayır, tablo / sütun / fonksiyon adları ve vitrin_urunler'in TANIMI.
--  Çalıştırma: Supabase › SQL Editor › New query › bu dosyanın TAMAMI › Run. Tek tablo döner (bolum, kontrol, beklenen, sonuc,
--  durum). Sonucu (CSV ya da ekran görüntüsü) paylaşın.
--  Not: "Allow new users to sign up" ve "anonymous sign-ins" Supabase ayarıdır, SQL'de görünmez — ekran görüntüsü ayrıca.
-- =====================================================================================================================
with
-- ---------- 1) Fonksiyonlar: girişsiz (anon) çalıştırılabilenler ve sabit search_path (2-sikilastir.sql, 4 Kasım) ----------
site_fn as (
  select to_regprocedure(x) as oid from unnest(array['public.herkese_acik_vitrin()', 'public.site_ayarlari()',
    'public.site_kayit_ol(jsonb, text, text)', 'public.portal_giris(text, text)', 'public.portal(text)',
    'public.portal_hesap(text, date, date)', 'public.portal_siparis(text, jsonb, text, jsonb)', 'public.portal_cikis(text)',
    'public.yonetici_mi()']::text[]) x
),
fn as (
  select p.oid, p.oid::regprocedure::text as imza, p.prosecdef as tanimci,
         has_function_privilege('anon', p.oid, 'execute') as anon,
         exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') as yol_var, l.lanname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
),
-- ---------- 2) Tablo / görünüm yetkileri ----------
rel as (
  select c.oid, c.relname, c.relkind, c.relrowsecurity as rls, c.relforcerowsecurity as rls_zorunlu,
         pg_get_userbyid(c.relowner) as sahip, coalesce(c.reloptions, '{}') as secenek,
         has_table_privilege('anon', c.oid, 'select') as anon_oku,
         has_table_privilege('anon', c.oid, 'insert') or has_table_privilege('anon', c.oid, 'update')
           or has_table_privilege('anon', c.oid, 'delete') as anon_yaz,
         has_table_privilege('authenticated', c.oid, 'select') as auth_oku
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p', 'f')
),
-- ERP'nin hassas tabloları (site müşterisi / girişsiz kişi görmemeli). Olmayan tablo atlanır.
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
-- ---------- 5) Tanımlar içinde şifre alanı (DEĞER DÖNMEZ, yalnız sayı) ----------
sifre as (
  select count(*) filter (where jsonb_typeof(x) = 'string' and btrim(x #>> '{}') <> '') as dolu
  from public.tanimlar t, jsonb_path_query(t.veri, 'strict $.**.sifre') x where t.id = 'tekil'
)
select bolum, kontrol, beklenen, sonuc,
       case when beklenen = '' then 'bilgi' when beklenen = sonuc then 'tamam' else 'FARKLI' end as durum
from (
  -- 1) Fonksiyonlar
  select 1 as s, '1 fonksiyon' as bolum, 'girişsiz çalıştırılabilen fonksiyon sayısı' as kontrol, '9' as beklenen,
         (select count(*) from fn where anon)::text as sonuc
  union all select 2, '1 fonksiyon', 'girişsiz açık olanların hepsi site (8) + yonetici_mi', 'true',
         coalesce((select bool_and(oid in (select oid from site_fn)) from fn where anon), true)::text
  union all select 3, '1 fonksiyon', 'girişsiz açık fonksiyonlar (ad)', '',
         coalesce((select string_agg(imza, ', ' order by imza) from fn where anon), '-')
  union all select 4, '1 fonksiyon', 'search_path sabit OLMAYAN fonksiyon', '0',
         (select count(*) from fn where not yol_var and lanname not in ('c', 'internal'))::text
  union all select 5, '1 fonksiyon', 'search_path sabit olmayanlar (ad)', '',
         coalesce((select string_agg(imza, ', ' order by imza) from fn where not yol_var and lanname not in ('c', 'internal')), '-')
  union all select 6, '1 fonksiyon', 'sıkılaştırma yedeği duruyor (guvenlik.yedek, g1)', 'true',
         (to_regclass('guvenlik.yedek') is not null)::text
  union all select 7, '1 fonksiyon', 'yeni fonksiyonlar girişsize kapalı doğar (postgres · public varsayılanı)', 'true',
         (not exists (select 1 from pg_default_acl d, aclexplode(d.defaclacl) a
                       where d.defaclrole = (select oid from pg_roles where rolname = 'postgres') and d.defaclnamespace = 'public'::regnamespace
                         and d.defaclobjtype = 'f' and a.grantee = (select oid from pg_roles where rolname = 'anon')))::text
  -- 2) Tablolar / görünümler
  union all select 10, '2 tablo', 'girişsiz OKUNABİLEN tablo / görünüm (surum dışında)', '0',
         (select count(*) from rel where anon_oku and relname <> 'surum')::text
  union all select 11, '2 tablo', 'girişsiz okunabilenler (ad)', '',
         coalesce((select string_agg(relname, ', ' order by relname) from rel where anon_oku), '-')
  union all select 12, '2 tablo', 'girişsiz YAZILABİLEN tablo / görünüm', '0',
         (select count(*) from rel where anon_yaz)::text
  union all select 13, '2 tablo', 'RLS kapalı tablo (ad)', '',
         coalesce((select string_agg(relname, ', ' order by relname) from rel where relkind in ('r', 'p') and not rls), '-')
  union all select 14, '2 tablo', 'güvenlik denetimini atlayan görünüm (security_invoker yok)', '',
         coalesce((select string_agg(relname || ' (sahip ' || sahip || ')', ', ' order by relname) from rel
                   where relkind = 'v' and not ('security_invoker=true' = any(secenek) or 'security_invoker=on' = any(secenek))), '-')
  union all select 15, '2 tablo', 'hassas ERP tablolarından girişsiz okunabilen', '0',
         (select count(*) from hassas where anon_oku)::text
  union all select 16, '2 tablo', 'hassas ERP tablolarından girişsiz okunabilenler (ad)', '',
         coalesce((select string_agg(relname, ', ' order by relname) from hassas where anon_oku), '-')
  -- 3) vitrin_urunler
  union all select 20, '3 vitrin_urunler', 'görünüm var mı', '', ((select oid from vit) is not null)::text
  union all select 21, '3 vitrin_urunler', 'sahibi', '', coalesce((select sahip from rel where oid = (select oid from vit)), '-')
  union all select 22, '3 vitrin_urunler', 'security_invoker açık mı (RLS çağıranın yetkisiyle)', '',
         coalesce((select ('security_invoker=true' = any(secenek) or 'security_invoker=on' = any(secenek))::text from rel where oid = (select oid from vit)), '-')
  union all select 23, '3 vitrin_urunler', 'girişsiz (anon) okuyabiliyor mu', '',
         coalesce((select anon_oku::text from rel where oid = (select oid from vit)), '-')
  union all select 24, '3 vitrin_urunler', 'giriş yapmış (authenticated) okuyabiliyor mu', '',
         coalesce((select auth_oku::text from rel where oid = (select oid from vit)), '-')
  union all select 25, '3 vitrin_urunler', 'sütunlar', '',
         coalesce((select string_agg(a.attname, ', ' order by a.attnum) from pg_attribute a
                   where a.attrelid = (select oid from vit) and a.attnum > 0 and not a.attisdropped), '-')
  union all select 26, '3 vitrin_urunler', 'dayandığı tablolar: RLS açık mı / zorunlu mu', '',
         coalesce((select string_agg(k.ad || ' (rls ' || c.relrowsecurity::text || ', zorunlu ' || c.relforcerowsecurity::text || ')', ', ' order by k.ad)
                   from vit_kaynak k join pg_class c on c.oid = k.oid), '-')
  union all select 27, '3 vitrin_urunler', 'dayandığı tabloların politikaları', '',
         coalesce((select string_agg(p.tablename || '.' || p.policyname || ' [' || p.cmd || ' → ' || array_to_string(p.roles, '/') || ' : ' || coalesce(p.qual, 'true') || ']', '; ')
                   from pg_policies p where p.schemaname = 'public' and ('public.' || p.tablename) in (select ad from vit_kaynak)
                      or (p.schemaname = 'public' and p.tablename in (select ad from vit_kaynak))), '-')
  union all select 28, '3 vitrin_urunler', 'tanım', '',
         coalesce((select pg_get_viewdef((select oid from vit), true)), '-')
  union all select 29, '3 vitrin_urunler', 'urunler.vitrinde_mi sütunu var mı', '',
         exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'urunler' and column_name = 'vitrinde_mi')::text
  -- 4) Site müşterisi ↔ ERP
  union all select 30, '4 hesap', 'auth.users toplam hesap', '', (select count(*) from hesap)::text
  union all select 31, '4 hesap', 'anonim (is_anonymous) hesap', '0', (select count(*) from hesap where (j->>'is_anonymous')::boolean is true)::text
  union all select 32, '4 hesap', 'ERP kullanıcı listesinde OLMAYAN hesap (sayı)', '0',
         (select count(*) from hesap where lower(coalesce(j->>'email', '')) not in (select e from erp_eposta))::text
  union all select 33, '4 hesap', 'ERP listesinde olmayan hesapların en yenisinin açılış tarihi', '',
         coalesce((select max(left(j->>'created_at', 10)) from hesap where lower(coalesce(j->>'email', '')) not in (select e from erp_eposta)), '-')
  union all select 34, '4 hesap', 'site müşteri hesabı (site_hesaplari, Supabase hesabı DEĞİL)', '',
         coalesce((select count(*)::text from public.site_hesaplari), '-')
  union all select 35, '4 hesap', 'site oturum / müşteri tablolarına girişsiz erişim', 'false',
         coalesce((select bool_or(anon_oku or anon_yaz)::text from rel where relname in ('site_hesaplari', 'site_oturumlari', 'site_talepleri', 'site_kayit_talepleri', 'site_giris_kaydi')), 'false')
  -- 5) SMTP / şifre alanı
  union all select 40, '5 şifre', 'tanimlar içinde DOLU "sifre" alanı (sayı; değer dönmez)', '0', (select dolu::text from sifre)
  union all select 41, '5 şifre', 'site_ayarlari() çıktısında "sifre" / "eposta ayarı" var mı', 'false',
         (public.site_ayarlari()::text ~* '"sifre"|"smtp"')::text
) k
order by s;
