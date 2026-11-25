-- =====================================================================================================================
--  25-deneme/deneme-is-defteri-salt-okur.sql — SALT OKUR. 10001 ve sonrası Deneme Bot G25 üretimlerinin DÖRT DEFTERİ yan yana: geçerli ÜRT fişi,
--  cari işçilik (kişi başı), ödeme defteri (isc_odeme: atama / ilk / tamir), stok (net), ve defter dışı geçmiş işçilik (g25_gecmis_iscilik — 25c
--  sonrası; yoksa "-"). Her adımdan sonra çalıştırılır. Yazmaz.
-- =====================================================================================================================
with ure as (select u.id, u.siparis_no from public.uretim u join public.urunler p on p.id = u.urun_id where p.ad = 'Deneme Bot G25')
select u.siparis_no as uretim,
  (select count(*) from public.stk_fis f where f.uretim_id::text = u.id::text and f.onek = 'ÜRT' and not f.iptal) as gecerli_fis,
  (select count(*) from public.stk_fis f where f.uretim_id::text = u.id::text and f.onek = 'ÜRT' and f.iptal) as iptal_fis,
  coalesce((select string_agg(c.unvan || ' ' || x.t, ' · ' order by c.unvan) from (select h.cari_id, sum(h.tutar) t from public.car_hareket h
     where h.uretim_id::text = u.id::text and not coalesce(h.iptal, false) and h.ek ->> 'islemTipi' = 'İşçilik' group by h.cari_id) x
     join public.cariler c on c.id::text = x.cari_id::text), '-') as cari_iscilik,
  coalesce((select string_agg(split_part(o.id, ':', 1) || (case when o.tamir then '(tamir)' else '' end) || ' ' || c.unvan || ' ' || o.miktar || '×' || o.ucret, ' · ' order by o.id)
     from public.isc_odeme o join public.stk_fis f on f.istek = o.istek left join public.cariler c on c.id::text = o.cari_id
     where o.uretim_id = u.id::text and not f.iptal), '-') as odeme_defteri,
  (select coalesce(sum(x.miktar), 0) from public.stk_hareket x join public.urunler p on p.id::text = x.urun_id::text
     where x.uretim_id::text = u.id::text and not coalesce(x.iptal, false) and p.ad = 'Deneme Bot G25') as mamul_stok,
  case when to_regprocedure('public.g25_gecmis_iscilik(text, text)') is null then '-'
       else (xpath('/row/n/text()', query_to_xml(format('select public.g25_gecmis_iscilik(%L, %L) as n', u.id::text, 'Kesim'), false, true, '')))[1]::text end as defter_disi_gecmis
from ure u order by u.siparis_no;
