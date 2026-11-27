-- =====================================================================================================================
--  40-canli-deneme-temiz-salt-okur.sql — YALNIZ OKUR. Hiçbir şeyi değiştirmez.
--  Canlı tek cihaz denemesinden (DENEME ÜRÜN / DENEME HAMMADDE / DENEME USTA, üretim 10001) geriye GEÇERLİ kayıt kaldı mı:
--  stoklar 0 mı, geçerli deneme fişi / stok hareketi / cari hareketi / bölüm tahakkuku var mı. İptal edilmiş kayıtlar beklenir ve sayılır.
-- =====================================================================================================================
with du as (select id, ad, kategori, pasif from public.urunler where ad in ('DENEME ÜRÜN', 'DENEME HAMMADDE')),
dc as (select id, unvan, pasif from public.cariler where unvan = 'DENEME USTA'),
ur as (select u.* from public.uretim u where (u.siparis_no = '10001' or u.takip_kodu = '10001') and u.urun_id in (select id from du)),
f as (select s.id, s.iptal from public.stk_fis s where s.uretim_id in (select id from ur)),
st as (select d.ad, coalesce((select sum(s.miktar) from public.stk_stok s where s.urun_id = d.id), 0) as miktar from du d),
k as (
  select 1 as sira, 'deneme kartları (2 ürün + 1 cari beklenir) · pasif mi' as kontrol,
         (select count(*) from du) || ' ürün + ' || (select count(*) from dc) || ' cari · '
         || coalesce((select string_agg(ad || ': ' || case when coalesce(pasif, false) then 'pasif' else 'aktif' end, ', ' order by ad) from du), '—')
         || coalesce(', ' || (select string_agg(unvan || ': ' || case when coalesce(pasif, false) then 'pasif' else 'aktif' end, ', ') from dc), '') as durum,
         ((select count(*) from du) = 2 and (select count(*) from dc) = 1) as tamam
  union all
  select 2, 'DENEME ÜRÜN stoku (0 olmalı)', coalesce((select miktar::text from st where ad = 'DENEME ÜRÜN'), 'ürün yok'), coalesce((select miktar = 0 from st where ad = 'DENEME ÜRÜN'), false)
  union all
  select 3, 'DENEME HAMMADDE stoku (0 olmalı)', coalesce((select miktar::text from st where ad = 'DENEME HAMMADDE'), 'ürün yok'), coalesce((select miktar = 0 from st where ad = 'DENEME HAMMADDE'), false)
  union all
  select 4, 'deneme üretim kaydı 10001 (1 kayıt; değiştirilmedi) · aşama · stoğa eklendi mi',
         (select count(*) from ur) || ' kayıt' || coalesce(' · ' || (select string_agg(coalesce(asama, '—') || ' · ' || case when stoga_eklendi_mi then 'stoğa eklendi' else 'stoğa eklenmedi' end, ' | ') from ur), ''),
         (select count(*) from ur) = 1
  union all
  select 5, 'deneme üretiminin fişleri: GEÇERLİ (0 olmalı) / iptal',
         (select count(*) filter (where not iptal) || ' / ' || count(*) filter (where iptal) from f), (select count(*) filter (where not iptal) from f) = 0
  union all
  select 6, 'deneme ürünlerine ait GEÇERLİ stok hareketi (hangi fişten olursa olsun; 0 olmalı)',
         (select count(*)::text from public.stk_hareket h join public.stk_fis s on s.id = h.fis_id where h.urun_id in (select id from du) and not h.iptal and not s.iptal),
         (select count(*) from public.stk_hareket h join public.stk_fis s on s.id = h.fis_id where h.urun_id in (select id from du) and not h.iptal and not s.iptal) = 0
  union all
  select 7, 'DENEME USTA''ya ait GEÇERLİ cari hareketi: sayı · toplam (0 olmalı)',
         (select count(*) || ' · ' || coalesce(sum(c.tutar), 0) from public.car_hareket c left join public.stk_fis s on s.id = c.fis_id
           where c.cari_id in (select id from dc) and not c.iptal and not coalesce(s.iptal, false)),
         (select count(*) from public.car_hareket c left join public.stk_fis s on s.id = c.fis_id
           where c.cari_id in (select id from dc) and not c.iptal and not coalesce(s.iptal, false)) = 0
  union all
  select 8, 'deneme fişlerine bağlı GEÇERLİ cari hareketi (0 olmalı)',
         (select count(*)::text from public.car_hareket c join f on f.id = c.fis_id where not c.iptal and not f.iptal),
         (select count(*) from public.car_hareket c join f on f.id = c.fis_id where not c.iptal and not f.iptal) = 0
  union all
  select 9, 'deneme üretimindeki bölüm tahakkuku satırı (0 olmalı)',
         coalesce((select sum(case when jsonb_typeof(u.ek -> 'bolumTahakkuklari') = 'array' then jsonb_array_length(u.ek -> 'bolumTahakkuklari') else 0 end) from ur u), 0)::text,
         coalesce((select sum(case when jsonb_typeof(u.ek -> 'bolumTahakkuklari') = 'array' then jsonb_array_length(u.ek -> 'bolumTahakkuklari') else 0 end) from ur u), 0) = 0
  union all
  select 10, 'DENEME USTA''nın geçtiği bölüm tahakkuku (bütün üretimlerde; 0 olmalı)',
         (select count(*)::text from public.uretim u, jsonb_array_elements(case when jsonb_typeof(u.ek -> 'bolumTahakkuklari') = 'array' then u.ek -> 'bolumTahakkuklari' else '[]'::jsonb end) t
           where t ->> 'personelId' in (select id from dc)),
         (select count(*) from public.uretim u, jsonb_array_elements(case when jsonb_typeof(u.ek -> 'bolumTahakkuklari') = 'array' then u.ek -> 'bolumTahakkuklari' else '[]'::jsonb end) t
           where t ->> 'personelId' in (select id from dc)) = 0
  union all
  select 11, 'deneme üretiminin atamaları (teslim alınmamış olmalı)',
         coalesce((select string_agg(a.proses || ' · ' || a.miktar || ' · ' || case when a.tamamlandi_mi then 'TESLİM' when a.verildi_mi then 'bekliyor' else 'verilmedi' end, ' | ' order by a.id)
                     from public.uretim_atamalari a where a.uretim_id in (select id from ur)), 'atama yok'),
         not exists (select 1 from public.uretim_atamalari a where a.uretim_id in (select id from ur) and a.tamamlandi_mi)
)
select sira, kontrol, durum, case when tamam then 'tamam' else 'BAK' end as sonuc from k
union all
select 99, 'GENEL', case when (select bool_and(tamam) from k) then 'TEMİZ — geçerli deneme kaydı kalmadı' else 'BAK — yukarıdaki satırları incele' end, ''
order by 1;
