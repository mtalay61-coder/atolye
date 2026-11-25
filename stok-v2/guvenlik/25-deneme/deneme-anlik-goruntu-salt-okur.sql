-- =====================================================================================================================
--  25-deneme/deneme-anlik-goruntu-salt-okur.sql — SALT OKUR ANLIK GÖRÜNTÜ. Reddedilen bir işlemden ÖNCE ve SONRA çalıştırılır; iki çıktı
--  birebir aynı olmalı. Her tablonun satır sayısı + bütün satırlarının içerik özeti (md5, sıralı) — veri dökmez. Yazmaz.
-- =====================================================================================================================
select t as tablo, n as satir, o as icerik_ozeti from (
  select 'stk_fis' t, count(*) n, md5(coalesce(string_agg(x::text, '|' order by x.id), '')) o from public.stk_fis x
  union all select 'stk_hareket', count(*), md5(coalesce(string_agg(x::text, '|' order by x.id), '')) from public.stk_hareket x
  union all select 'car_hareket', count(*), md5(coalesce(string_agg(x::text, '|' order by x.id), '')) from public.car_hareket x
  union all select 'kas_hareket', count(*), md5(coalesce(string_agg(x::text, '|' order by x.id), '')) from public.kas_hareket x
  union all select 'uretim_atamalari', count(*), md5(coalesce(string_agg(x::text, '|' order by x.id), '')) from public.uretim_atamalari x
  union all select 'uretim', count(*), md5(coalesce(string_agg(x::text, '|' order by x.id), '')) from public.uretim x
  union all select 'ucr_onay', count(*), md5(coalesce(string_agg(x::text, '|' order by x.anahtar), '')) from public.ucr_onay x
  union all select 'isc_odeme', count(*), md5(coalesce(string_agg(x::text, '|' order by x.id), '')) from public.isc_odeme x
  union all select 'Deneme Usta bakiyesi (geçerli Alacak − Borç)', null, (select coalesce(sum(case when h.yon = 'Alacak' then h.tutar else -h.tutar end), 0)::text
      from public.car_hareket h join public.cariler c on c.id::text = h.cari_id::text where c.unvan = 'Deneme Usta' and not coalesce(h.iptal, false))
) s order by 1;
