-- RENK BAĞ AYRINTISI — SALT OKUR (28 Kasım). Hiçbir şey yazmaz, hiçbir şeyi onarmaz.
-- Bir rengin (ve onu içeren model renklerinin) kayıtlarda HANGİ YAZIMLA durduğunu, şimdiki adla karşılaştırarak gösterir:
--   birebir aynı · YALNIZ HARF FARKI (yazım farklı, harf büyüklüğü dışında aynı) · şimdiki adlarda yok
-- Kapsam: ürün varyantı, sipariş kalemi, üretim, rezervasyon, reçete (model rengi ve hammadde rengi), renk resmi, harici barkod, koli.
-- Aranan renk aşağıdaki ilk satırda ('mavi süet'); büyük / küçük harf fark etmez.
with p as (select public.stk_nrm('mavi süet') as n),
renk as (select r ->> 'id' as id from public.tanimlar t, jsonb_array_elements(t.veri -> 'renkler') r, p where t.id = 'tekil' and public.stk_nrm(r ->> 'ad') = p.n),
kombi as (select k ->> 'id' as id from public.tanimlar t, jsonb_array_elements(coalesce(t.veri -> 'renkKombinasyonlari', '[]'::jsonb)) k, renk
           where t.id = 'tekil' and k -> 'renkIdler' ? renk.id),
simdi as (select s.id, s.tur, s.ad, public.stk_nrm(s.ad) as n from public.stk_renk s where s.aktif and s.id in (select id from renk union select id from kombi)),
defter as (select public.stk_nrm(h.eski_ad) as n from public.tanim_ad_gecmisi h where h.renk_id in (select id from simdi)
           union select public.stk_nrm(h.yeni_ad) from public.tanim_ad_gecmisi h where h.renk_id in (select id from simdi)),
ad as (select n from simdi union select n from defter),
k(sira, kaynak, urun, yazim, sayi) as (
  select 1, 'şimdiki ad (stok tarafı; kimlik · tür)', s.id || ' · ' || s.tur, s.ad, 1::numeric from simdi s
  union all select 2, 'ürün varyantı', v.urun_id, v.renk, count(*) from public.varyantlar v where public.stk_nrm(v.renk) in (select n from ad) group by 2, 3, 4
  union all select 3, 'sipariş kalemi', x.urun_id, x.renk, count(*) from public.siparis_kalemleri x where public.stk_nrm(x.renk) in (select n from ad) group by 2, 3, 4
  union all select 4, 'üretim', u.urun_id, u.renk, count(*) from public.uretim u where public.stk_nrm(u.renk) in (select n from ad) group by 2, 3, 4
  union all select 5, 'rezervasyon', z.urun_id, z.renk, count(*) from public.stok_rezervasyonlari z where public.stk_nrm(z.renk) in (select n from ad) group by 2, 3, 4
  union all select 6, 'reçete: model rengi (mamulRenk)', z.id, r ->> 'mamulRenk', count(*)
    from public.urunler z, jsonb_array_elements(case when jsonb_typeof(z.recete) = 'array' then z.recete else '[]'::jsonb end) r
   where public.stk_nrm(r ->> 'mamulRenk') in (select n from ad) group by 2, 3, 4
  union all select 7, 'reçete: hammadde rengi (renk)', z.id, r ->> 'renk', count(*)
    from public.urunler z, jsonb_array_elements(case when jsonb_typeof(z.recete) = 'array' then z.recete else '[]'::jsonb end) r
   where public.stk_nrm(r ->> 'renk') in (select n from ad) group by 2, 3, 4
  union all select 8, 'renk resmi (anahtar)', z.id, e.key, 1
    from public.urunler z, jsonb_each(case when jsonb_typeof(z.renk_resimleri) = 'object' then z.renk_resimleri else '{}'::jsonb end) e
   where public.stk_nrm(e.key) in (select n from ad)
  union all select 9, 'harici barkod', z.id, b ->> 'renk', count(*)
    from public.urunler z, jsonb_array_elements(case when jsonb_typeof(z.harici_barkodlar) = 'array' then z.harici_barkodlar else '[]'::jsonb end) b
   where public.stk_nrm(b ->> 'renk') in (select n from ad) group by 2, 3, 4
  union all select 10, 'koli kalemi', coalesce(x ->> 'urunId', x ->> 'urun_id', '-'), x ->> 'renk', count(*)
    from public.lst_kayit l, jsonb_array_elements(case when jsonb_typeof(l.veri -> 'kalemler') = 'array' then l.veri -> 'kalemler' else '[]'::jsonb end) x
   where l.tablo = 'koliler' and public.stk_nrm(x ->> 'renk') in (select n from ad) group by 2, 3, 4
)
select k.sira, k.kaynak, k.urun, k.yazim, k.sayi,
       case when k.sira = 1 then '-'
            when exists (select 1 from simdi s where s.ad = k.yazim) then 'birebir aynı'
            when exists (select 1 from simdi s where s.n = public.stk_nrm(k.yazim))
              then 'YALNIZ HARF FARKI — şimdiki: ' || (select s.ad from simdi s where s.n = public.stk_nrm(k.yazim) limit 1)
            else 'şimdiki adlarda yok (eski ad)' end as karsilastirma
  from k
union all
select 99, 'ÖZET: birebir aynı · yalnız harf farkı · şimdiki adlarda yok (kayıt sayısı; 1. bölüm hariç)', '', '', null,
       (select coalesce(sum(sayi) filter (where exists (select 1 from simdi s where s.ad = k.yazim)), 0)::text || ' · '
            || coalesce(sum(sayi) filter (where not exists (select 1 from simdi s where s.ad = k.yazim) and exists (select 1 from simdi s where s.n = public.stk_nrm(k.yazim))), 0)::text || ' · '
            || coalesce(sum(sayi) filter (where not exists (select 1 from simdi s where s.n = public.stk_nrm(k.yazim))), 0)::text from k where k.sira > 1)
order by 1, 2, 3, 4;
