-- YEDEKTEKİ HATA ÖNCESİ DURUM — SALT OKUR (26 Kasım). YALNIZ gece yedeğinden açılmış YALITILMIŞ YEREL veritabanında
-- çalıştırılır (bkz. YEDEKTEN-ACMA.md). CANLIDA ÇALIŞTIRMAYIN — çalışsa da yalnız okur ama karşılaştırma anlamsız olur.
--
-- Yalnız tablo satırları kullanılır (görünüm / fonksiyon yok): yedekten yalnız tablolar açılır.
-- Çıktı tek tablo (bolum, urun_id, urun, ayrinti) → CSV olarak iletin; canlı envanterle (renk-cokmesi-envanteri) karşılaştırılacak.
--   1-tanim-renk    Tanımlar'daki renkler (id, ad, kod)
--   2-tanim-kombi   Tanımlar'daki kombinasyonlar (id, kod, renkIdler)
--   3-varyant       kombinasyon (tur='model') ya da kombinasyon parçası düz renkle açılmış BÜTÜN varyantlar: KİMLİK, renk, ölçü,
--                   aktif, min_stok, oluşturma, hareket sayısı ve net miktar
--   4-recete        aynı ürünlerin reçete satırları (mamulRenk / mamulRenkId / renk / renkId)
--   5-resim / 5-barkod   renk resmi anahtarları ve harici barkodlar
-- Kişisel veri: ürün adı, renk adı, miktar. Cari, kullanıcı, fiyat DÖNMEZ.
with
tan as (select veri from public.tanimlar where id = 'tekil'),
renk_t as (select r from tan, jsonb_array_elements(coalesce(tan.veri -> 'renkler', '[]'::jsonb)) r),
kombi as (select k from tan, jsonb_array_elements(coalesce(tan.veri -> 'renkKombinasyonlari', '[]'::jsonb)) k),
kombi_renk as (select distinct jsonb_array_elements_text(k -> 'renkIdler') as renk_id from kombi),
hrk as (
  select h.varyant_id, count(*) as adet,
         coalesce(sum(h.miktar) filter (where not coalesce(f.iptal, false) and not coalesce(h.iptal, false)), 0) as net,
         min(h.tarih) as ilk, max(h.tarih) as son
  from public.stk_hareket h left join public.stk_fis f on f.id = h.fis_id
  group by h.varyant_id
),
vry as (
  select v.*, r.ad as renk_ad, r.tur as renk_tur, o.ad as olcu_ad
  from public.stk_varyant v
  left join public.stk_renk r on r.id = v.renk_id
  left join public.stk_olcu o on o.id = v.olcu_id
  where r.tur = 'model' or v.renk_id in (select renk_id from kombi_renk)
),
urun_s as (
  select u.id, u.ad, to_jsonb(u) as j from public.urunler u where u.id in (select urun_id from vry)
)
select * from (
  select '1-tanim-renk' as bolum, null::text as urun_id, null::text as urun,
         jsonb_build_object('id', r ->> 'id', 'ad', r ->> 'ad', 'kod', r ->> 'kod', 'barkodKodu', r ->> 'barkodKodu') as ayrinti
  from renk_t where (r ->> 'id') in (select renk_id from kombi_renk)
  union all
  select '2-tanim-kombi', null, null, jsonb_build_object('id', k ->> 'id', 'kod', k ->> 'kod', 'renkIdler', k -> 'renkIdler', 'barkodKodu', k ->> 'barkodKodu')
  from kombi
  union all
  select '3-varyant', v.urun_id, u.ad, jsonb_build_object('varyant_id', v.id, 'renk_id', v.renk_id, 'renk', v.renk_ad, 'renk_tur', v.renk_tur,
           'olcu_id', v.olcu_id, 'olcu', v.olcu_ad, 'aktif', v.aktif, 'min_stok', v.min_stok, 'olusturma', v.olusturma,
           'hareket', coalesce(h.adet, 0), 'net_miktar', coalesce(h.net, 0), 'ilk_hareket', h.ilk, 'son_hareket', h.son)
  from vry v left join public.urunler u on u.id = v.urun_id left join hrk h on h.varyant_id = v.id
  union all
  select '4-recete', u.id, u.ad, jsonb_build_object('mamulRenk', x ->> 'mamulRenk', 'mamulRenkId', x ->> 'mamulRenkId',
           'renk', x ->> 'renk', 'renkId', x ->> 'renkId', 'hammadde', coalesce(x ->> 'malzemeAd', x ->> 'malzemeId', x ->> 'malzeme'),
           'miktar', x -> 'miktar')
  from urun_s u, jsonb_array_elements(case when jsonb_typeof(u.j -> 'recete') = 'array' then u.j -> 'recete' else '[]'::jsonb end) x
  union all
  select '5-resim', u.id, u.ad, jsonb_build_object('anahtar', k)
  from urun_s u, jsonb_object_keys(case when jsonb_typeof(u.j -> 'renk_resimleri') = 'object' then u.j -> 'renk_resimleri' else '{}'::jsonb end) k
  union all
  select '5-barkod', u.id, u.ad, x
  from urun_s u, jsonb_array_elements(case when jsonb_typeof(u.j -> 'harici_barkodlar') = 'array' then u.j -> 'harici_barkodlar' else '[]'::jsonb end) x
) t
order by bolum, urun nulls first, ayrinti::text;
