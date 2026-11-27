-- RENK ADI TANISI — SALT OKUR (27 Kasım). Hiçbir şey yazmaz. Bir rengin adı değiştikten sonra kayıtların hangi adla durduğunu gösterir.
-- Aranan renk aşağıdaki ilk satırda ('haki napa'); büyük / küçük harf fark etmez.
with p as (select public.stk_nrm('haki napa') as n),
renk as (select r ->> 'id' as id, r ->> 'ad' as ad from public.tanimlar t, jsonb_array_elements(t.veri -> 'renkler') r, p where t.id = 'tekil' and public.stk_nrm(r ->> 'ad') = p.n),
kombi as (select k ->> 'id' as id, k ->> 'kod' as kod from public.tanimlar t, jsonb_array_elements(coalesce(t.veri -> 'renkKombinasyonlari', '[]'::jsonb)) k, renk
           where t.id = 'tekil' and k -> 'renkIdler' ? renk.id),
ilgili as (select id from renk union select id from kombi),
etiket as (select s.id, s.tur, s.ad, s.aktif from public.stk_renk s where s.id in (select id from ilgili)
           union select s.id, s.tur, s.ad, s.aktif from public.stk_renk s, p where public.stk_nrm(s.ad) = p.n),
ad as (select public.stk_nrm(e.ad) as n from etiket e),
v as (select vv.urun_id, vv.renk, vv.renk_id, count(*) as n, sum(vv.miktar) as miktar from public.varyantlar vv where public.stk_nrm(vv.renk) in (select n from ad) group by 1, 2, 3),
kl as (select k.renk, k.urun_id, count(*) as n from public.siparis_kalemleri k where public.stk_nrm(k.renk) in (select n from ad) group by 1, 2),
s(sira, bolum, ayrinti, sayi) as (
  select 1, 'Tanımlar''daki renk (kimlik = ad)', id || ' = ' || ad, 1::numeric from renk
  union all select 2, 'bu rengi içeren model rengi (kod)', kod || ' (' || id || ')', 1 from kombi
  union all select 3, 'stok tarafındaki ad kaydı (kimlik · tür · ad · etkin)', id || ' · ' || tur || ' · ' || ad || ' · ' || aktif::text, 1 from etiket
  union all select 4, 'ürün varyantı (ürün · varyanttaki ad · renk kimliği) — sayı = beden sayısı', v.urun_id || ' · ' || v.renk || ' · ' || coalesce(v.renk_id, '(kimliksiz)'), v.n from v
  union all select 5, 'sipariş kalemi (ürün · kalemdeki ad) — sayı = kalem', kl.urun_id || ' · ' || kl.renk, kl.n from kl
  union all select 6, 'KOPUK: kalemdeki ad, o ürünün hiçbir varyant adıyla birebir aynı değil (ürün · ad)', kl.urun_id || ' · ' || kl.renk, kl.n from kl
            where not exists (select 1 from public.varyantlar vv where vv.urun_id = kl.urun_id and vv.renk = kl.renk)
  union all select 7, 'üretim kaydı (kayıttaki ad)', u.renk, count(*) from public.uretim u where public.stk_nrm(u.renk) in (select n from ad) group by u.renk
  union all select 8, 'reçetesinde bu ad geçen ürün (ürün · reçetedeki ad)', z.id || ' · ' || coalesce(r ->> 'renk', '') || ' / ' || coalesce(r ->> 'mamulRenk', ''), count(*)
            from public.urunler z, jsonb_array_elements(case when jsonb_typeof(z.recete) = 'array' then z.recete else '[]'::jsonb end) r
           where public.stk_nrm(r ->> 'renk') in (select n from ad) or public.stk_nrm(r ->> 'mamulRenk') in (select n from ad) group by 1, 2, 3
  union all select 9, 'eski ad defteri (kimlik: eski → yeni)', h.renk_id || ': ' || h.eski_ad || ' → ' || h.yeni_ad, 1 from public.tanim_ad_gecmisi h where h.renk_id in (select id from ilgili)
)
select sira, bolum, ayrinti, sayi from s
union all select 99, 'ÖZET: varyant satırı · kalem · kopuk kalem',
  (select coalesce(sum(n), 0)::text from v) || ' · ' || (select coalesce(sum(n), 0)::text from kl) || ' · '
  || (select coalesce(sum(kl.n), 0)::text from kl where not exists (select 1 from public.varyantlar vv where vv.urun_id = kl.urun_id and vv.renk = kl.renk)), null
order by 1, 3;
