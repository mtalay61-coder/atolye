-- 9 SONRASI DOĞRULAMA (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. 9-kurallar-ac.sql'den sonra her satırda tamam = true olmalı.
-- (Bu sorgu Editor'da çalıştığı için kuralın REDDETTİĞİNİ deneyemez: Editor oturumu uygulama değildir, kurallar onu engellemez.
--  Reddi uygulamadan bir kez görmek için ONAY-PAKETI § 9 "elle deneme".)
with k as (
  select 1 as sira, 'fiş kuralları açık (fis_aktif)' as kontrol, 'true' as beklenen, (select fis_aktif::text from public.stk_ayar where id = 'tekil') as sonuc
  union all select 2, 'kural fonksiyonu etkin (fis_kural_aktif)', 'true', public.fis_kural_aktif()::text
  union all select 3, 'sürüm kapısı hâlâ KAPALI', 'true', (select (nullif(min_istemci_surum, '') is null)::text from public.stk_ayar where id = 'tekil')
  union all select 4, 'hareket koruma tetikleyicileri (stk/car/kas)', '3',
    (select count(distinct c.relname)::text from pg_trigger g join pg_class c on c.oid = g.tgrelid
      where c.relname in ('stk_hareket', 'car_hareket', 'kas_hareket') and g.tgfoid = 'public.fis_satir_koru'::regproc and g.tgenabled <> 'D')
  union all select 5, 'fiş başlığı koruması (stk_fis)', 'true',
    (select (count(*) > 0)::text from pg_trigger g where g.tgrelid = 'public.stk_fis'::regclass and not g.tgisinternal and g.tgenabled <> 'D'
      and g.tgfoid in (select p.oid from pg_proc p where p.proname in ('fis_koru', 'fis_baslik_koru')))
  union all select 6, 'açılış zamanı yazıldı (fis_aktif_zamani son 1 saat)', 'true',
    (select (fis_aktif_zamani > now() - interval '1 hour')::text from public.stk_ayar where id = 'tekil')
)
select kontrol, beklenen, sonuc, beklenen = sonuc as tamam from k order by sira;
