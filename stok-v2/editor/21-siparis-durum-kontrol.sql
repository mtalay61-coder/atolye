-- SALT-OKUR: bir siparişe bağlı stok satırlarının durumu (1.744.7). Hiçbir şeyi değiştirmez. 'ALS-1001' yerine sipariş numarasını yazın.
-- iptal_edilmemis > 0 ise sipariş silinmez: o fişi önce silin (iptal edin). Yalnız iptal_edilmis varsa 1.744.7 ile silinir.
with s as (select id::text as id, siparis_no, durum from public.siparisler where siparis_no = 'ALS-1001')
select s.siparis_no, s.durum,
  count(h.*) filter (where not h.iptal) as iptal_edilmemis,
  count(h.*) filter (where h.iptal) as iptal_edilmis,
  string_agg(distinct h.fis_id, ', ') filter (where not h.iptal) as iptal_edilmemis_fisler
from s
left join public.stk_hareket h on h.siparis_id = s.id or h.gecmis_siparis_id = s.id
  or h.kalem_id in (select k.id::text from public.siparis_kalemleri k where k.siparis_id::text = s.id)
  or h.gecmis_kalem_id in (select k.id::text from public.siparis_kalemleri k where k.siparis_id::text = s.id)
group by s.siparis_no, s.durum;
