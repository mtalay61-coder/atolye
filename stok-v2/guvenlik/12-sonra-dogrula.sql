-- 12 SONRASI DOĞRULAMA (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. 12-uretim-sil-kur.sql'den sonra her satırda tamam = true olmalı.
with k as (
  select 1 as sira, 'uretim_sil işlemi var, giriş yapmış kullanıcı çağırabilir' as kontrol, 'true' as beklenen,
    (select (count(*) = 1 and bool_and(has_function_privilege('authenticated', p.oid, 'execute')) and not bool_or(has_function_privilege('anon', p.oid, 'execute')))::text
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'uretim_sil') as sonuc
  union all select 2, 'üretim silme koruması (uretim: silme + geri yükleme)', '2',
    (select count(*)::text from pg_trigger where tgrelid = 'public.uretim'::regclass and tgname in ('uretim_silme_koru', 'uretim_geri_yukle') and tgenabled <> 'D')
  union all select 3, 'silinmiş üretime hareket kilidi (stk_hareket, car_hareket)', '2',
    (select count(*)::text from pg_trigger where tgname = 'uretim_bag_koru' and tgrelid in ('public.stk_hareket'::regclass, 'public.car_hareket'::regclass) and tgenabled <> 'D')
  union all select 4, 'iz tablosu kapalı (RLS açık, uygulama doğrudan erişemez)', 'true',
    (select (c.relrowsecurity and not has_table_privilege('authenticated', c.oid, 'select'))::text from pg_class c where c.oid = 'public.uretim_silinen'::regclass)
  union all select 5, 'iz tablosu sürüm kapısı içinde', 'true',
    (select exists (select 1 from pg_trigger where tgrelid = 'public.uretim_silinen'::regclass and tgname = 'stk_istemci_koru')::text)
  union all select 6, 'sürüm kapısı ve fiş kuralları değişmedi (kapalı)', 'true',
    (select (nullif(min_istemci_surum, '') is null and not public.fis_kural_aktif())::text from public.stk_ayar where id = 'tekil')
)
select kontrol, beklenen, sonuc, beklenen = sonuc as tamam from k order by sira;
