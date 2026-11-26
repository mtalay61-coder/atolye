-- 26 — B1 / B2 DENEME SONUCU — SALT OKUR (28 Kasım). Hiçbir şey yazmaz. Deneme projesinde elle sınamalardan (PAKET-B1-B2-DENEME.md,
-- adım 4) SONRA çalıştırılır. Ad / e-posta / tutar yazmaz; renk ADLARI yazar (deneme verisi; sınamada "DENEME" önekiyle eklenenler).
-- Her satır: no · kontrol · bulunan. Değerlendirme belgede (beklenenler adım adım).
select 1 as no, 'eski ad defteri (tanim_ad_gecmisi): renk kimliği · eski ad → yeni ad · serbest' as kontrol,
       coalesce((select string_agg(renk_id || ' · ' || eski_ad || ' → ' || yeni_ad || case when serbest then ' (serbest)' else '' end, ' | ' order by id)
                   from public.tanim_ad_gecmisi), '(boş)') as bulunan
union all
select 2, 'sipariş kalemlerinde renk metni HİÇBİR etkin rengin adı olmayanlar (bağı kopuk; 0 beklenir) — ad · adet',
       coalesce((select string_agg(r || ' · ' || n, ' | ' order by r) from (
          select k.renk r, count(*) n from public.siparis_kalemleri k
           where coalesce(k.renk, '') <> '' and not exists (select 1 from public.stk_renk s where s.aktif and public.stk_nrm(s.ad) = public.stk_nrm(k.renk))
           group by 1) x), '0')
union all
select 3, 'üretim kayıtlarında bağı kopuk renk (0 beklenir)',
       coalesce((select string_agg(r || ' · ' || n, ' | ' order by r) from (
          select u.renk r, count(*) n from public.uretim u
           where coalesce(u.renk, '') <> '' and not exists (select 1 from public.stk_renk s where s.aktif and public.stk_nrm(s.ad) = public.stk_nrm(u.renk))
           group by 1) x), '0')
union all
select 4, 'rezervasyonlarda bağı kopuk renk (0 beklenir)',
       coalesce((select string_agg(r || ' · ' || n, ' | ' order by r) from (
          select z.renk r, count(*) n from public.stok_rezervasyonlari z
           where coalesce(z.renk, '') <> '' and not exists (select 1 from public.stk_renk s where s.aktif and public.stk_nrm(s.ad) = public.stk_nrm(z.renk))
           group by 1) x), '0')
union all
select 5, 'DENEME önekli renkler (Tanımlar): ad · ton kodu (kod) · barkod kodu',
       coalesce((select string_agg(coalesce(r ->> 'ad', '?') || ' · ' || coalesce(r ->> 'kod', '-') || ' · ' || coalesce(r ->> 'barkodKodu', '-'), ' | ' order by r ->> 'ad')
                   from public.tanimlar t, jsonb_array_elements(t.veri -> 'renkler') r where t.id = 'tekil' and (r ->> 'ad') ilike 'deneme%'), '(yok)')
union all
select 6, 'BÜTÜN renklerde aynı ton kodunu ya da aynı barkod kodunu taşıyan çift (0 · 0 beklenir — B2 sayaç / kod ayırma)',
       (select count(*)::text from (select r ->> 'kod' from public.tanimlar t, jsonb_array_elements(t.veri -> 'renkler') r
          where t.id = 'tekil' and coalesce(r ->> 'kod', '') <> '' group by 1 having count(*) > 1) x) || ' · '
       || (select count(*)::text from (select r ->> 'barkodKodu' from public.tanimlar t, jsonb_array_elements(t.veri -> 'renkler') r
          where t.id = 'tekil' and coalesce(r ->> 'barkodKodu', '') <> '' group by 1 having count(*) > 1) x)
union all
select 7, 'stk_renk aynası ↔ Tanımlar (etkin renk sayısı · Tanımlar renk sayısı)',
       (select count(*)::text from public.stk_renk where aktif) || ' · ' || coalesce((select jsonb_array_length(veri -> 'renkler')::text from public.tanimlar where id = 'tekil'), '?')
union all
select 8, 'tanimlar sürümü (B2 her yazmada artar)', coalesce((select surum::text from public.tanimlar where id = 'tekil'), '?')
order by 1;
