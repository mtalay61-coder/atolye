-- PAKET V CANLI ÖNKOŞUL — SALT OKUR (28 Kasım). Hiçbir şey yazmaz. 59-v-uygula.sql'den ÖNCE ana projede çalıştırılır.
-- Beklenen (ilk kurulumdan önce): 1. satır "kurulu değil", 2–4 "tamam", 5–8 BİLGİ, son satır GENEL "HAZIR".
-- 6. ve 7. satır: kurulumdan SONRA adla gelen bir stok işleminin REDDEDİLECEĞİ varyantlar (bugün aynı işlem sessizce ikinci varyant açar).
with
v as (select sv.id, sv.urun_id, sv.aktif, sv.renk_id, sv.olcu_id, r.ad as renk, r.aktif as renk_aktif, o.ad as olcu, o.tur as olcu_tur,
        -- sunucunun bu ADI çözdüğü kayıt (stk_renk_coz / stk_olcu_coz ile aynı sıra)
        (select x.id from public.stk_renk x where public.stk_nrm(x.ad) = public.stk_nrm(r.ad) order by x.aktif desc, case x.tur when 'model' then 0 when 'renk' then 1 else 2 end, x.id limit 1) as renk_cozum,
        (select x.id from public.stk_olcu x where public.stk_nrm(x.ad) = public.stk_nrm(o.ad) order by x.aktif desc, x.id limit 1) as olcu_cozum
   from public.stk_varyant sv left join public.stk_renk r on r.id = sv.renk_id left join public.stk_olcu o on o.id = sv.olcu_id),
risk as (select v.*, (select u.ad from public.urunler u where u.id = v.urun_id) as urun,
           (select count(*) from public.stk_hareket h where h.varyant_id = v.id and not coalesce(h.iptal, false)) as hareket
           from v where (v.renk_id is not null and v.renk_cozum is distinct from v.renk_id) or (v.olcu_id is not null and v.olcu_cozum is distinct from v.olcu_id)),
ikiz as (select v.urun_id, count(*) as n from v group by v.urun_id, public.stk_nrm(coalesce(v.renk, '')), public.stk_nrm(coalesce(v.olcu, '')) having count(*) > 1),
eksik_tablo as (select coalesce(string_agg(x, ', '), '') as e from unnest(array['stk_varyant', 'stk_renk', 'stk_olcu', 'stk_hareket', 'urunler']) x where to_regclass('public.' || x) is null),
eksik_islev as (select coalesce(string_agg(x, ', '), '') as e from unnest(array['auth.jwt()', 'public.stk_nrm(text)', 'public.stk_varyant_coz(text,text,text,text,text)', 'public.stk_renk_coz(text,text)', 'public.stk_olcu_coz(text,text)']) x where to_regprocedure(x) is null),
kur as (select (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'v_ikiz_varyant_koru')::int as f,
               (select count(*) from pg_trigger g where not g.tgisinternal and g.tgname = 'v_ikiz_varyant_koru')::int as t),
k(no, kontrol, beklenen, bulunan, tamam) as (
  select 1, 'Paket V şu an kurulu mu (fonksiyon · tetikleyici)', 'kurulu değil: 0 · 0', (select f || ' · ' || t from kur), (select f = 0 and t = 0 from kur)
  union all select 2, 'gerekli tablolar', 'hepsi var', (select case when e = '' then 'hepsi var' else 'EKSİK: ' || e end from eksik_tablo), (select e = '' from eksik_tablo)
  union all select 3, 'gerekli fonksiyonlar (auth.jwt, stk_nrm, stk_varyant_coz, stk_renk_coz, stk_olcu_coz)', 'hepsi var', (select case when e = '' then 'hepsi var' else 'EKSİK: ' || e end from eksik_islev), (select e = '' from eksik_islev)
  union all select 4, 'Paket K kurulu (bu paket onun üstünde sınandı)', '7 fonksiyon',
         (select count(*)::text || ' fonksiyon' from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and left(p.proname, 2) = 'k_' and p.proname like '%_koru'),
         (select count(*) = 7 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and left(p.proname, 2) = 'k_' and p.proname like '%_koru')
  union all select 5, 'BİLGİ · bugün aynı üründe aynı adla birden çok varyant (paket bunlara dokunmaz)', '', (select count(*)::text || ' ad · ' || coalesce(sum(n), 0)::text || ' varyant' from ikiz), true
  union all select 6, 'BİLGİ · adı başka bir renk / ölçü kaydına çözülen varyantlar — kurulumdan sonra ADLA gelen işlem bunlarda REDDEDİLİR', '',
         (select count(*)::text || ' varyant · ' || count(distinct urun_id)::text || ' ürün · etkin varyant ' || count(*) filter (where aktif)::text || ' · stok hareketi olan ' || count(*) filter (where hareket > 0)::text
            || ' · renk kaydı pasif olan ' || count(*) filter (where renk_aktif is false)::text || ' · ölçüden kaynaklanan ' || count(*) filter (where olcu_id is not null and olcu_cozum is distinct from olcu_id)::text from risk), true
  union all select 7, 'BİLGİ · 6. satırdaki ürünler (ürün: renk / ölçü ×varyant)', '',
         coalesce((select string_agg(t, ' ; ') from (select urun || ': ' || coalesce(renk, '-') || case when renk_aktif is false then ' (pasif renk kaydı)' else '' end || ' / ' || string_agg(distinct coalesce(olcu || ' [' || olcu_tur || ']', '-'), ', ') || ' ×' || count(*) as t
                     from risk group by urun, renk, renk_aktif order by urun limit 40) q), 'yok'), true
  union all select 8, 'BİLGİ · stk_varyant üzerindeki mevcut tetikleyiciler', '', (select coalesce(string_agg(g.tgname, ', ' order by g.tgname), 'yok') from pg_trigger g where g.tgrelid = to_regclass('public.stk_varyant') and not g.tgisinternal), true
)
select no, kontrol, beklenen, bulunan, case when no >= 5 then 'bilgi' when tamam then 'tamam' else 'ENGEL' end as durum from k
union all select 99, 'GENEL', '', '', case when (select bool_and(tamam) from k) then 'HAZIR' when not (select tamam from k where no = 1) then 'ZATEN KURULU ya da YARIM — sonucu gönder' else 'HAZIR DEĞİL — ENGEL satırlarını gönder' end
order by 1;
