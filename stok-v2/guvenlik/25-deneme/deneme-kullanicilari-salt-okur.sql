-- =====================================================================================================================
--  25-deneme/deneme-kullanicilari-salt-okur.sql — SALT OKUR. Yalnız üç DENEME kullanıcısının durumunu gösterir (başka kullanıcı dökmez).
--  Eklemeden ÖNCE: listede / Auth'ta olmayanlar "yok" görünür (tekrar ekleme yapılmaz). Eklemeden SONRA: rol ve yetkiler doğrulanır.
--  yetkiler sütunu: modül=g/d/k/s (görüntüleme / düzenleme / kaydetme / silme); para = cari veya muhasebe kaydetme (G-25 PARA).
-- =====================================================================================================================
with beklenen(sira, ad) as (values (1, 'denememuhasebe'), (2, 'denemeuretim'), (3, 'denemesef')),
kul as (select x from public.tanimlar t, jsonb_array_elements(case when jsonb_typeof(t.veri -> 'kullanicilar') = 'array' then t.veri -> 'kullanicilar' else '[]'::jsonb end) x where t.id = 'tekil')
select b.sira, b.ad as kullanici,
  case when k.x is null then 'yok' else 'var' end as listede,
  coalesce(k.x ->> 'rol', '-') as rol,
  case when k.x is null then '-' when coalesce(k.x ->> 'id', '') = '' then 'KİMLİKSİZ' else 'var' end as kimlik,
  (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from auth.users where lower(email) = %L', b.ad || '@atolye.local'), false, true, '')))[1]::text as auth_hesabi,
  case when k.x is null then '-' else (coalesce((k.x -> 'yetkiler' -> 'cari' ->> 'kaydetme')::boolean, false) or coalesce((k.x -> 'yetkiler' -> 'muhasebe' ->> 'kaydetme')::boolean, false))::text end as para,
  coalesce((select string_agg(m.key || '=' || concat_ws('', case when (m.value ->> 'goruntuleme')::boolean then 'g' end, case when (m.value ->> 'duzenleme')::boolean then 'd' end,
            case when (m.value ->> 'kaydetme')::boolean then 'k' end, case when (m.value ->> 'silme')::boolean then 's' end), ' ' order by m.key)
     from jsonb_each(case when jsonb_typeof(k.x -> 'yetkiler') = 'object' then k.x -> 'yetkiler' else '{}'::jsonb end) m
     where coalesce((m.value ->> 'goruntuleme')::boolean, false) or coalesce((m.value ->> 'kaydetme')::boolean, false)), '-') as yetkiler
from beklenen b left join kul k on lower(coalesce(k.x ->> 'kullaniciAdi', '')) = b.ad
order by b.sira;
