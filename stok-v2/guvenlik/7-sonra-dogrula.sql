-- 7 SONRASI DOĞRULAMA (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. 7-surum-kapisi-site-istisna.sql'den sonra her satırda tamam = true olmalı.
--   1) beş site tablosu istisnada (sürüm denetimi YOK)
--   2) ERP tabloları korunuyor: istisna listesi ve iz tablosu dışında public'teki HER tabloda sürüm denetimi var (eksik = 0);
--      ayrıca temel ERP tabloları tek tek
--   3) sürüm kapısı ve fiş kuralları hâlâ KAPALI
with
liste as (select unnest(array['site_giris_kaydi', 'site_hesaplari', 'site_kayit_talepleri', 'site_oturumlari', 'site_talepleri']) as t),
tab as (
  select c.relname as t, exists (select 1 from pg_trigger g where g.tgrelid = c.oid and g.tgname = 'stk_istemci_koru') as kapida
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
k as (
  select 1 as sira, 'istisnadaki site tablosu (kapı dışında)' as kontrol, '5' as beklenen,
         (select count(*) from tab where t in (select t from liste) and not kapida)::text as sonuc
  union all select 2, 'istisna listesinde olup veritabanında olmayan', '0',
         (select count(*) from liste where t not in (select t from tab))::text
  union all select 3, 'sürüm denetimi EKSİK tablo (liste ve iz tablosu dışında)', '0',
         (select coalesce(string_agg(t, ', ' order by t), '0') from tab where not kapida and t not in (select t from liste) and t <> 'stk_istemci_iz')
  union all select 4, 'temel ERP tabloları kapı içinde', 'true',
         (select bool_and(kapida) from tab where t in ('stk_fis', 'stk_hareket', 'stk_varyant', 'car_hareket', 'kas_hareket', 'kas_cek',
           'siparisler', 'siparis_kalemleri', 'uretim', 'uretim_atamalari', 'lst_kayit', 'tanimlar', 'cariler', 'urunler'))::text
  union all select 5, 'sürüm kapısı kapalı (min_istemci_surum boş)', 'true',
         (select (nullif(min_istemci_surum, '') is null)::text from public.stk_ayar where id = 'tekil')
  union all select 6, 'fiş kuralları kapalı', 'true', (not public.fis_kural_aktif())::text
)
select kontrol, beklenen, sonuc, beklenen = sonuc as tamam from k order by sira;
