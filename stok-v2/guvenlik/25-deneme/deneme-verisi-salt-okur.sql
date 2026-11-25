-- =====================================================================================================================
--  25-deneme/deneme-verisi-salt-okur.sql — SALT OKUR. Yalnız adı "Deneme" ile başlayan deneme verisini ve ön koşul tanımlarını gösterir
--  (EKLEMELER.md 2–5). Eklemeden ÖNCE: planlananlar 0 / yok olmalı (tekrar ekleme yapılmaz). SONRA: her biri 1, maaş 30000, Kesim 35.
--  Not: "Deneme Bot" (proses ücreti boş) deneme projesinde önceden vardı; ona dokunulmaz — deneme mamulü "Deneme Bot G25".
-- =====================================================================================================================
with t as (select coalesce((select veri from public.tanimlar where id = 'tekil'), '{}'::jsonb) as v),
bol as (select b from t, jsonb_array_elements(case when jsonb_typeof(t.v -> 'bolumler') = 'array' then t.v -> 'bolumler' else '[]'::jsonb end) b where lower(b ->> 'ad') like 'deneme%'),
car as (select id, unvan, tip from public.cariler where lower(unvan) like 'deneme%'),
urn as (select id, ad, proses_ucretleri from public.urunler where lower(ad) like 'deneme%'),
ure as (select u.id, u.adet from public.uretim u join urn on urn.id = u.urun_id where urn.ad = 'Deneme Bot G25')
select sira, kontrol, deger from (
  select 0 as sira, 'ön koşul tanımları: proses Kesim · renk Siyah · beden 40 (tanimlar içinde geçiyor mu)' as kontrol,
    (select (coalesce((v -> 'prosesler')::text, '') like '%"Kesim"%')::text || ' · ' || (coalesce((v -> 'renkler')::text, '') like '%"Siyah"%')::text || ' · '
       || (coalesce((v -> 'bedenler')::text, '') || coalesce((v -> 'bedenGruplari')::text, '') like '%"40"%')::text from t) as deger
  union all select 1, 'cariler (ünvan · tip)', coalesce((select string_agg(unvan || ' · ' || coalesce(tip, '-'), ' | ' order by unvan) from car), 'yok')
  union all select 2, 'bölümler (ad · personel: ünvan=maaş · prosesler)', coalesce((select string_agg((b ->> 'ad') || ' · ' || coalesce((select string_agg(coalesce(c.unvan, p ->> 'cariId') || '=' || coalesce(p ->> 'maas', '0'), ', ')
      from jsonb_array_elements(case when jsonb_typeof(b -> 'personel') = 'array' then b -> 'personel' else '[]'::jsonb end) p left join public.cariler c on c.id::text = p ->> 'cariId'), '-')
      || ' · prosesler: ' || coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(case when jsonb_typeof(b -> 'prosesler') = 'array' then b -> 'prosesler' else '[]'::jsonb end) x), '-'), ' | ') from bol), 'yok')
  union all select 3, 'ürünler (ad · proses ücretleri)', coalesce((select string_agg(ad || ' · ' || coalesce(proses_ucretleri::text, '-'), ' | ' order by ad) from urn), 'yok')
  union all select 4, 'ADET: Deneme Maaşlı Personel · Deneme Usta · Deneme Bölüm · Deneme Bot G25 (hepsi 1 olmalı)',
    (select count(*) filter (where unvan = 'Deneme Maaşlı Personel') || ' · ' || count(*) filter (where unvan = 'Deneme Usta') from car) || ' · '
    || (select count(*) from bol where b ->> 'ad' = 'Deneme Bölüm') || ' · ' || (select count(*) from urn where ad = 'Deneme Bot G25')
  union all select 5, 'Deneme Maaşlı Personel aylık maaşı (Deneme Bölüm) · Deneme Usta bölümde mi',
    coalesce((select string_agg(p ->> 'maas', ', ') from bol, jsonb_array_elements(case when jsonb_typeof(b -> 'personel') = 'array' then b -> 'personel' else '[]'::jsonb end) p
       join public.cariler c on c.id::text = p ->> 'cariId' where b ->> 'ad' = 'Deneme Bölüm' and c.unvan = 'Deneme Maaşlı Personel'), 'yok') || ' · '
    || (exists (select 1 from t, jsonb_array_elements(case when jsonb_typeof(t.v -> 'bolumler') = 'array' then t.v -> 'bolumler' else '[]'::jsonb end) b2,
       jsonb_array_elements(case when jsonb_typeof(b2 -> 'personel') = 'array' then b2 -> 'personel' else '[]'::jsonb end) p2 join public.cariler c2 on c2.id::text = p2 ->> 'cariId' where c2.unvan = 'Deneme Usta'))::text
  union all select 6, 'Deneme Bot G25 Kesim ücreti (₺/adet)', coalesce((select string_agg(coalesce(proses_ucretleri ->> 'Kesim', 'yok'), ', ') from urn where ad = 'Deneme Bot G25'), 'ürün yok')
  union all select 7, 'Deneme Bot G25 üretimleri (sayı · adetler)', (select count(*) || ' · ' || coalesce(string_agg(coalesce(adet::text, '-'), ', '), '-') from ure)
  union all select 8, 'atamalar (proses · personel · miktar · verildi · tamamlandı)', coalesce((select string_agg(a.proses || ' · ' || coalesce(c.unvan, a.personel_id::text, '-') || ' · ' || coalesce(a.miktar::text, '-')
      || ' · ' || coalesce(a.verildi_mi::text, '-') || ' · ' || coalesce(a.tamamlandi_mi::text, '-'), ' | ' order by a.id) from public.uretim_atamalari a join ure on ure.id = a.uretim_id left join public.cariler c on c.id::text = a.personel_id::text), 'yok')
) s order by sira;
