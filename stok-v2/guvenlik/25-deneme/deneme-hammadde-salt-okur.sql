-- =====================================================================================================================
--  25-deneme/deneme-hammadde-salt-okur.sql — SALT OKUR. "Deneme Hammadde G25" stok hareketleri (iki iş verildi; ekranda −10 göründü).
-- =====================================================================================================================
with h as (select id from public.urunler where ad = 'Deneme Hammadde G25')
select coalesce(f.onek, '-') as fis_onek, coalesce(f.tur, '-') as fis_tur, x.miktar, x.iptal, coalesce(u.siparis_no, x.uretim_id::text, '-') as uretim_no,
       left(coalesce(x.aciklama, '-'), 60) as aciklama, to_char(coalesce(f.olusturma, x.tarih::timestamptz), 'HH24:MI:SS') as zaman
from public.stk_hareket x join h on h.id::text = x.urun_id::text
left join public.stk_fis f on f.id = x.fis_id
left join public.uretim u on u.id::text = x.uretim_id::text
union all
select 'TOPLAM (iptalsiz)', '', (select coalesce(sum(x.miktar), 0) from public.stk_hareket x join h on h.id::text = x.urun_id::text where not coalesce(x.iptal, false)), null, '', '', ''
order by 7 nulls last;
