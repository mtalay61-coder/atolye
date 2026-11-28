-- PAKET Ö CANLI ÖNKOŞUL — SALT OKUR (28 Kasım). Hiçbir şey yazmaz. 62-o-uygula.sql'den ÖNCE ana projede çalıştırılır.
-- Beklenen: 1–3 "tamam"; 4. satır ENGEL DEĞİL ama doluysa o ürünlerde kurulumdan sonra işlem açık hata verir (karar gerekir); GENEL "HAZIR".
with cel as (select u.id, u.ad, coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden') as tip, o.tur, count(*) as n, string_agg(o.ad, ', ' order by o.ad) as olculer
   from public.stk_varyant v join public.urunler u on u.id = v.urun_id join public.stk_olcu o on o.id = v.olcu_id
  where coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden') in ('Beden', 'Boyut') and o.tur in ('Beden', 'Boyut') and o.tur <> coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden')
  group by u.id, u.ad, u.olcu_tipi, o.tur),
ad as (select public.stk_nrm(o.ad) as a, o.tur, count(*) filter (where o.aktif) as etkin, count(*) as n from public.stk_olcu o where o.tur in ('Beden', 'Boyut') group by 1, 2),
k(no, kontrol, beklenen, bulunan, tamam) as (
  select 1, 'stk_varyant_coz gövdesi sınanan eski gövdeyle aynı', 'aynı', (select case md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) when 'c4356478fc7cb2346bf8ca4e0cacbed2' then 'aynı' when '8420a7f901793cc7441eb9f895c46698' then 'ZATEN YENİ (Paket Ö kurulu)' else 'FARKLI — özet ' || md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) end from pg_proc p where p.oid = to_regprocedure('public.stk_varyant_coz(text,text,text,text,text)')),
         coalesce((select md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) = 'c4356478fc7cb2346bf8ca4e0cacbed2' from pg_proc p where p.oid = to_regprocedure('public.stk_varyant_coz(text,text,text,text,text)')), false)
  union all select 2, 'gerekli fonksiyonlar (stk_renk_coz, stk_olcu_coz, stk_yer_tutucu_mu, stk_nrm)', 'hepsi var',
         coalesce((select 'EKSİK: ' || string_agg(x, ', ') from unnest(array['public.stk_renk_coz(text,text)', 'public.stk_olcu_coz(text,text)', 'public.stk_yer_tutucu_mu(text)', 'public.stk_nrm(text)']) x where to_regprocedure(x) is null), 'hepsi var'),
         not exists (select 1 from unnest(array['public.stk_renk_coz(text,text)', 'public.stk_olcu_coz(text,text)', 'public.stk_yer_tutucu_mu(text)', 'public.stk_nrm(text)']) x where to_regprocedure(x) is null)
  union all select 3, 'aynı grupta aynı adla birden çok ETKİN ölçü kaydı (belirsizlik → KR061)', '0', (select count(*)::text || coalesce(' — ' || string_agg(a || ' [' || tur || '] ×' || etkin, ', '), '') from ad where etkin > 1), not exists (select 1 from ad where etkin > 1)
  union all select 4, 'BİLGİ · ürünün ölçü tipi ile varyantının ölçü grubu ÇELİŞEN ürünler (kurulumdan sonra bu ürünlerde işlem AÇIK HATA verir)', '',
         (select count(*)::text || ' ürün' || coalesce(' — ' || string_agg(ad || ' [ürün ' || tip || ', varyant ' || tur || ' ×' || n || ': ' || olculer || ']', ' ; '), '') from cel), true
  union all select 5, 'BİLGİ · ürünlerin ölçü tipi dağılımı', '', (select string_agg(t || ' ×' || n, ' · ' order by t) from (select coalesce(nullif(btrim(olcu_tipi), ''), '(boş → Beden)') t, count(*) n from public.urunler group by 1) q), true
  union all select 6, 'BİLGİ · ölçü kayıtları (grup: etkin / toplam) ve iki grupta da geçen adlar', '',
         (select string_agg(tur || ' ' || e || '/' || n, ' · ' order by tur) from (select tur, count(*) filter (where aktif) e, count(*) n from public.stk_olcu group by tur) q)
         || ' · iki grupta da olan ad: ' || coalesce((select string_agg(a, ', ' order by a) from (select a from ad group by a having count(*) > 1) z), 'yok'), true
  union all select 7, 'BİLGİ · varyantı Boyut grubunda olan ürünler (ürün: ölçü tipi ×varyant)', '',
         coalesce((select string_agg(t, ' ; ') from (select u.ad || ': ürün ölçü tipi ' || coalesce(nullif(btrim(u.olcu_tipi), ''), '(boş → Beden)') || ' ×' || count(*) as t from public.stk_varyant v join public.urunler u on u.id = v.urun_id join public.stk_olcu o on o.id = v.olcu_id where o.tur = 'Boyut' group by u.id, u.ad, u.olcu_tipi) q), 'yok'), true
  union all select 8, 'BİLGİ · Paket V (ikiz varyant koruması)', '', (select case when count(*) = 1 then 'kurulu' else 'kurulu değil' end from pg_trigger g where not g.tgisinternal and g.tgname = 'v_ikiz_varyant_koru'), true
)
select no, kontrol, beklenen, bulunan, case when no >= 4 then 'bilgi' when tamam then 'tamam' else 'ENGEL' end as durum from k
union all select 99, 'GENEL', '', '', case when (select bool_and(tamam) from k) then 'HAZIR' else 'HAZIR DEĞİL — ENGEL satırlarını gönder' end
order by 1;
