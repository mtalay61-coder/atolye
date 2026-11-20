-- =====================================================================================================================
--  24-a6-canli-durum-salt-okur.sql — FAZ 0: A6 ÖNCESİ CANLI DURUM (SALT OKUR; tek select, hiçbir şey yazmaz / oluşturmaz)
--  Supabase › SQL Editor › tamamı › Run. 24-a6-onkosul-salt-okur.sql'in AYRINTILI karşılığı.
--  KİŞİSEL VERİ / SIR DÖNMEZ: e-posta, ad, kullanıcı adı, şifre, anahtar yok — yalnız sayı, tür, rol adı, anahtar ADI, kod özeti (md5).
--  Bölümler: F = iki fonksiyon (tanım hâli, sahip, definer, search_path, çalıştırma yetkileri) · B = bağımlı fonksiyonlar ·
--  T = tanimlar tetikleyicileri · Y = tanimlar tablo yetkileri / RLS · V = tanımlar verisinin YAPISI · H = giriş hesapları (sayı) ·
--  GENEL = A6 durumu (24-a6-onkosul-salt-okur.sql ile aynı kural).
-- =====================================================================================================================
with
fn as (
  select x.sira, x.ad, x.eski, x.yeni, p.oid,
         md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) as su_an
    from (values (1, 'public.tanimlar_kullanici_koruma()', '7a75a37deb2f40bf71569da55292d851', '35c2916e7cc40fa07b98a87864f0436f'),
                 (2, 'public.yetki_var_mi(text[], text)', '85a0b3b9c38dc0f7c55f5f8f39519fc4', '148fc08c0e06e554b0f81478f8e26931')) x(sira, ad, eski, yeni)
    left join pg_proc p on p.oid = to_regprocedure(x.ad)
),
f as (select fn.*, case when oid is null then 'yok' when su_an = yeni then 'yeni' when su_an = eski then 'eski' else 'bilinmeyen' end as hal from fn),
t as (select veri from public.tanimlar where id = 'tekil'),
k as (select e from t, jsonb_array_elements(case when jsonb_typeof(veri -> 'kullanicilar') = 'array' then veri -> 'kullanicilar' else '[]'::jsonb end) e),
liste_eposta as (select distinct lower(nullif(e ->> 'eposta', '')) as ep from k where nullif(e ->> 'eposta', '') is not null),
satir(sira, bolum, kontrol, sonuc) as (
  -- F: iki fonksiyon
  select f.sira * 10, 'F', f.ad || ' · hâl', f.hal from f
  union all select f.sira * 10 + 1, 'F', f.ad || ' · sahip', coalesce((select pg_get_userbyid(p.proowner) from pg_proc p where p.oid = f.oid), 'yok') from f
  union all select f.sira * 10 + 2, 'F', f.ad || ' · security definer', coalesce((select p.prosecdef::text from pg_proc p where p.oid = f.oid), 'yok') from f
  union all select f.sira * 10 + 3, 'F', f.ad || ' · ayar (search_path)', coalesce((select array_to_string(p.proconfig, ' ') from pg_proc p where p.oid = f.oid), '(yok)') from f
  union all select f.sira * 10 + 4, 'F', f.ad || ' · çalıştırma: anon / authenticated / public',
         coalesce((select has_function_privilege('anon', f.oid, 'execute')::text || ' / ' || has_function_privilege('authenticated', f.oid, 'execute')::text
                          || ' / ' || coalesce((select bool_or(a.grantee = 0) from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.privilege_type = 'EXECUTE'), false)::text
                     from pg_proc p where p.oid = f.oid), 'yok') from f
  union all select f.sira * 10 + 5, 'F', f.ad || ' · açık yetki listesi (proacl)', coalesce((select coalesce(p.proacl::text, '(varsayılan)') from pg_proc p where p.oid = f.oid), 'yok') from f
  -- B: bağımlı (düzeltme bunlara dokunmaz; var olmaları gerekir)
  union all select 30, 'B', 'public.yonetici_mi() · var / security definer', coalesce((select 'var / ' || p.prosecdef::text from pg_proc p where p.oid = to_regprocedure('public.yonetici_mi()')), 'yok')
  union all select 31, 'B', 'public.stk_yetki(text[], text) · var', case when to_regprocedure('public.stk_yetki(text[], text)') is null then 'yok' else 'var' end
  union all select 32, 'B', 'public.yazma_yetkisi_koruma() · var', case when to_regprocedure('public.yazma_yetkisi_koruma()') is null then 'yok' else 'var' end
  -- T: tanimlar tetikleyicileri
  union all select 40, 'T', 'tanimlar_kullanici_koruma · bağlı / etkin / zaman / olaylar / satır düzeyi',
         coalesce((select 'var / ' || case g.tgenabled when 'O' then 'etkin' when 'D' then 'KAPALI' else g.tgenabled::text end
                          || ' / ' || case when g.tgtype & 2 = 2 then 'BEFORE' else 'AFTER' end
                          || ' / ' || concat_ws(',', case when g.tgtype & 4 = 4 then 'INSERT' end, case when g.tgtype & 16 = 16 then 'UPDATE' end, case when g.tgtype & 8 = 8 then 'DELETE' end)
                          || ' / ' || case when g.tgtype & 1 = 1 then 'satır' else 'ifade' end
                          || ' / ' || g.tgfoid::regproc::text
                     from pg_trigger g where g.tgrelid = 'public.tanimlar'::regclass and g.tgname = 'tanimlar_kullanici_koruma'), 'YOK')
  union all select 41, 'T', 'tanimlar üzerindeki bütün tetikleyiciler (ad)',
         coalesce((select string_agg(g.tgname, ', ' order by g.tgname) from pg_trigger g where g.tgrelid = 'public.tanimlar'::regclass and not g.tgisinternal), '(yok)')
  -- Y: tanimlar tablo yetkileri / RLS
  union all select 50, 'Y', 'tanimlar · RLS açık / zorunlu', (select c.relrowsecurity::text || ' / ' || c.relforcerowsecurity::text from pg_class c where c.oid = 'public.tanimlar'::regclass)
  union all select 51, 'Y', 'tanimlar · politikalar (ad: komut)', coalesce((select string_agg(p.polname || ': ' || p.polcmd::text, ', ' order by p.polname) from pg_policy p where p.polrelid = 'public.tanimlar'::regclass), '(yok)')
  union all select 52, 'Y', 'tanimlar · authenticated tablo yetkileri', coalesce((select string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'tanimlar' and grantee = 'authenticated'), '(yok)')
  union all select 53, 'Y', 'tanimlar · anon tablo yetkileri', coalesce((select string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'tanimlar' and grantee = 'anon'), '(yok)')
  -- V: tanımlar verisinin YAPISI (değer değil; girisAktifMi yalnız true/false)
  union all select 60, 'V', 'tanimlar satır sayısı / ''tekil'' var / başka satır', (select count(*)::text from public.tanimlar) || ' / ' || (case when exists (select 1 from t) then 'var' else 'YOK' end) || ' / ' || (select count(*)::text from public.tanimlar where id <> 'tekil')
  union all select 61, 'V', 'veri türü', coalesce((select jsonb_typeof(veri) from t), 'yok')
  union all select 62, 'V', 'üst düzey anahtar sayısı', coalesce((select count(*)::text from t, jsonb_object_keys(case when jsonb_typeof(veri) = 'object' then veri else '{}'::jsonb end)), '0')
  union all select 63, 'V', 'girisAktifMi türü / değeri', coalesce((select jsonb_typeof(veri -> 'girisAktifMi') || ' / ' || case when jsonb_typeof(veri -> 'girisAktifMi') = 'boolean' then veri ->> 'girisAktifMi' else '-' end from t), 'yok')
  union all select 64, 'V', 'kullanicilar türü / sayısı', coalesce((select jsonb_typeof(veri -> 'kullanicilar') from t), 'yok') || ' / ' || (select count(*)::text from k)
  union all select 65, 'V', 'rol dağılımı (rol: sayı)', coalesce((select string_agg(r || ': ' || n, ', ' order by r) from (select coalesce(nullif(e ->> 'rol', ''), '(boş)') r, count(*)::text n from k group by 1) z), '(yok)')
  union all select 66, 'V', 'Yönetici sayısı / e-postası dolu Yönetici', (select count(*) filter (where e ->> 'rol' = 'Yönetici')::text || ' / ' || count(*) filter (where e ->> 'rol' = 'Yönetici' and nullif(e ->> 'eposta', '') is not null)::text from k)
  union all select 67, 'V', 'e-postası dolu / boş kullanıcı', (select count(*) filter (where nullif(e ->> 'eposta', '') is not null)::text || ' / ' || count(*) filter (where nullif(e ->> 'eposta', '') is null)::text from k)
  union all select 68, 'V', 'yinelenen e-posta (büyük/küçük harf yok sayılır)', (select count(*)::text from (select lower(e ->> 'eposta') from k where nullif(e ->> 'eposta', '') is not null group by 1 having count(*) > 1) z)
  union all select 69, 'V', 'pasif işaretli kullanıcı', (select count(*)::text from k where coalesce((e ->> 'pasif')::text, '') = 'true')
  -- H: giriş hesapları (yalnız sayı)
  union all select 70, 'H', 'auth.users toplam / e-postası onaylı', (select count(*)::text || ' / ' || count(*) filter (where email_confirmed_at is not null)::text from auth.users)
  union all select 71, 'H', 'listedeki e-postalardan giriş hesabı olan', (select count(*)::text from liste_eposta l where exists (select 1 from auth.users u where lower(u.email) = l.ep)) || ' / ' || (select count(*)::text from liste_eposta)
  union all select 72, 'H', 'giriş hesabı olup Tanımlar listesinde OLMAYAN (son 7 günde açılan)',
         (select count(*)::text from auth.users u where not exists (select 1 from liste_eposta l where l.ep = lower(u.email)))
         || ' (' || (select count(*)::text from auth.users u where u.created_at > now() - interval '7 days' and not exists (select 1 from liste_eposta l where l.ep = lower(u.email))) || ')'
)
select sira, bolum, kontrol, sonuc from satir
union all
select 99, 'GENEL', 'A6 durumu (HAZIR = uygulanabilir · UYGULANMIŞ · KARIŞIK · EKSİK)', case
  when not exists (select 1 from pg_trigger g where g.tgrelid = 'public.tanimlar'::regclass and g.tgname = 'tanimlar_kullanici_koruma' and g.tgenabled <> 'D')
    or not exists (select 1 from t) or (select jsonb_typeof(veri -> 'girisAktifMi') from t) is distinct from 'boolean'
    or (select jsonb_typeof(veri -> 'kullanicilar') from t) is distinct from 'array'
    or not exists (select 1 from k where e ->> 'rol' = 'Yönetici') then 'EKSİK'
  when (select bool_and(hal = 'yeni') from f) then 'UYGULANMIŞ'
  when (select bool_and(hal = 'eski') from f) then 'HAZIR'
  else 'KARIŞIK' end
order by 1;
