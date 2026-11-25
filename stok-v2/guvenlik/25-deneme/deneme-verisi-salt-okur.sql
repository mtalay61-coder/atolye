-- =====================================================================================================================
--  25-deneme/deneme-verisi-salt-okur.sql — SALT OKUR. Yalnız adı "Deneme" ile başlayan deneme verisini gösterir (EKLEMELER.md 2–5).
--  Eklemeden ÖNCE: hepsi "yok" / 0 olmalı (tekrar ekleme yapılmaz). Eklemeden SONRA: beklenen değerler doğrulanır.
-- =====================================================================================================================
with t as (select coalesce((select veri from public.tanimlar where id = 'tekil'), '{}'::jsonb) as v),
bol as (select b from t, jsonb_array_elements(case when jsonb_typeof(t.v -> 'bolumler') = 'array' then t.v -> 'bolumler' else '[]'::jsonb end) b where lower(b ->> 'ad') like 'deneme%'),
car as (select id, unvan, tip from public.cariler where lower(unvan) like 'deneme%'),
urn as (select id, ad, proses_ucretleri from public.urunler where lower(ad) like 'deneme%'),
ure as (select u.id from public.uretim u join urn on urn.id = u.urun_id)
select sira, kontrol, deger from (
  select 1 as sira, 'cariler (ünvan · tip)' as kontrol, coalesce((select string_agg(unvan || ' · ' || coalesce(tip, '-'), ' | ' order by unvan) from car), 'yok') as deger
  union all select 2, 'bölümler (ad · personel: ünvan=maaş)', coalesce((select string_agg((b ->> 'ad') || ' · ' || coalesce((select string_agg(coalesce(c.unvan, p ->> 'cariId') || '=' || coalesce(p ->> 'maas', '0'), ', ')
      from jsonb_array_elements(case when jsonb_typeof(b -> 'personel') = 'array' then b -> 'personel' else '[]'::jsonb end) p left join public.cariler c on c.id::text = p ->> 'cariId'), '-')
      || ' · prosesler: ' || coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(case when jsonb_typeof(b -> 'prosesler') = 'array' then b -> 'prosesler' else '[]'::jsonb end) x), '-'), ' | ') from bol), 'yok')
  union all select 3, 'ürünler (ad · proses ücretleri)', coalesce((select string_agg(ad || ' · ' || coalesce(proses_ucretleri::text, '-'), ' | ') from urn), 'yok')
  union all select 4, 'deneme ürünüyle üretim sayısı', (select count(*)::text from ure)
  union all select 5, 'atamalar (proses · personel · miktar · verildi · tamamlandı)', coalesce((select string_agg(a.proses || ' · ' || coalesce(c.unvan, a.personel_id::text, '-') || ' · ' || coalesce(a.miktar::text, '-')
      || ' · ' || coalesce(a.verildi_mi::text, '-') || ' · ' || coalesce(a.tamamlandi_mi::text, '-'), ' | ' order by a.id) from public.uretim_atamalari a join ure on ure.id = a.uretim_id left join public.cariler c on c.id::text = a.personel_id::text), 'yok')
) s order by sira;
