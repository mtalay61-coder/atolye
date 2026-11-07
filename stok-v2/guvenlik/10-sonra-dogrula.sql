-- 10 SONRASI DOĞRULAMA (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. 10-surum-kapisi-ac.sql'den sonra her satırda tamam = true olmalı.
-- (Editor oturumu kapıdan geçer — reddi uygulamadan görmek için ONAY-PAKETI § 10 "elle deneme".)
with
liste as (select unnest(array['site_giris_kaydi', 'site_hesaplari', 'site_kayit_talepleri', 'site_oturumlari', 'site_talepleri']) as t),
tab as (
  select c.relname as t, exists (select 1 from pg_trigger g where g.tgrelid = c.oid and g.tgname = 'stk_istemci_koru' and g.tgenabled <> 'D') as kapida
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p')
),
k as (
  select 1 as sira, 'sürüm kapısı en az 1.744.7' as kontrol, '1.744.7' as beklenen, (select coalesce(min_istemci_surum, 'NULL') from public.stk_ayar where id = 'tekil') as sonuc
  union all select 2, 'fiş kuralları açık (fis_aktif ve fis_kural_aktif)', 'true/true',
    (select fis_aktif::text || '/' || public.fis_kural_aktif()::text from public.stk_ayar where id = 'tekil')
  union all select 3, 'site tabloları kapı dışında', '5', (select count(*)::text from tab where t in (select t from liste) and not kapida)
  union all select 4, 'kapı dışında kalan ERP tablosu (liste ve iz tablosu hariç)', '0',
    (select coalesce(string_agg(t, ', ' order by t), '0') from tab where not kapida and t not in (select t from liste) and t <> 'stk_istemci_iz')
  union all select 5, 'kapı açıldıktan sonra başlıksız ERP yazması (iz)', '0',
    (select count(*)::text from public.stk_istemci_iz where tablo not like 'site\_%' and zaman > now() - interval '10 minutes')
)
select kontrol, beklenen, sonuc, beklenen = sonuc as tamam from k order by sira;
