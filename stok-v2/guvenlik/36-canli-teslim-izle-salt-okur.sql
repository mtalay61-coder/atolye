-- =====================================================================================================================
--  36-canli-teslim-izle-salt-okur.sql — YALNIZ OKUR. Hiçbir şeyi değiştirmez.
--  Kullanıcının ZATEN yapacağı gerçek bir üretim teslimini izlemek için: teslimden ÖNCE ve SONRA çalıştırılır, iki çıktı karşılaştırılır.
--  Aşağıdaki 'BURAYA-TAKIP-KODU' yerine izlenecek üretim kaydının takip kodu / sipariş no'su yazılır (tek yerde).
--  Beklenen (tek teslim): geçerli ÜRT fişi +1; o fişin stok hareketi teslim edilen adet kadar; işçilik tutarı adet × proses ücreti;
--  teslim edilen atama "teslim". Aynı adım için İKİNCİ geçerli fiş, fazla stok ya da çift işçilik OLMAMALI.
-- =====================================================================================================================
with hedef as (
  select u.id from public.uretim u where u.takip_kodu = 'BURAYA-TAKIP-KODU' or u.siparis_no = 'BURAYA-TAKIP-KODU'
), f as (
  select s.* from public.stk_fis s where s.uretim_id in (select id from hedef)
)
select 1 as sira, 'üretim kaydı (1 olmalı)' as kontrol, (select count(*) from hedef)::text as deger
union all select 2, 'ÜRT fişleri: geçerli / iptal', (select count(*) filter (where not iptal) || ' / ' || count(*) filter (where iptal) from f)
union all select 3, 'geçerli fişler (no · oluşturma)', coalesce((select string_agg(id || ' · ' || to_char(olusturma, 'DD.MM HH24:MI:SS'), ' | ' order by olusturma) from f where not iptal), '—')
union all select 4, 'geçerli stok hareketleri toplamı (fiş başına)', coalesce((select string_agg(x.fis_id || ': ' || x.m, ' | ' order by x.fis_id)
    from (select h.fis_id, sum(h.miktar)::text m from public.stk_hareket h where h.fis_id in (select id from f where not iptal) and not h.iptal group by 1) x), '—')
union all select 5, 'geçerli işçilik (cari) toplamı (fiş başına)', coalesce((select string_agg(x.fis_id || ': ' || x.t, ' | ' order by x.fis_id)
    from (select c.fis_id, sum(c.tutar)::text t from public.car_hareket c where c.fis_id in (select id from f where not iptal) and not c.iptal group by 1) x), '—')
union all select 6, 'atamalar (proses · miktar · durum)', coalesce((select string_agg(a.proses || ' · ' || a.miktar || ' · ' || case when a.tamamlandi_mi then 'teslim' else 'bekliyor' end
    || case when a.tamir_mi then ' (tamir)' else '' end, ' | ' order by a.proses, a.id) from public.uretim_atamalari a where a.uretim_id in (select id from hedef)), '—')
order by 1;
