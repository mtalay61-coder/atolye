-- B1 YAYIN ÖNKOŞULU — SALT OKUR (27 Kasım). 1.744.38 (renk adı sunucuda) yayınlanmadan ÖNCE ana projede çalıştırılır; hiçbir şey yazmaz.
-- İstemci sunucu fonksiyonu yoksa ad değiştirmeyi REDDEDER (eski yola dönmez) — bu sorgu "tamam" demeden yayın yapılmaz.
-- Her satır: kontrol · beklenen · bulunan · durum. Son satır GENEL: hepsi tamamsa "KURULU".
with k(no, kontrol, beklenen, bulunan) as (
  select 1, 'tanim_renk_ad_degistir(jsonb) fonksiyonu', 'var, güvenlik tanımlı, authenticated çalıştırır',
         coalesce((select 'var, definer=' || p.prosecdef::text || ', authenticated=' || has_function_privilege('authenticated', p.oid, 'execute')::text
                     || ', anon=' || has_function_privilege('anon', p.oid, 'execute')::text
                     from pg_proc p where p.oid = to_regprocedure('public.tanim_renk_ad_degistir(jsonb)')), 'yok')
  union all
  select 2, 'tanim_ad_guncel(text) — belirsizlik kuralı (KR025 / KR027)', 'gövdede KR025 ve KR027',
         coalesce((select case when pg_get_functiondef(p.oid) like '%KR025%' and pg_get_functiondef(p.oid) like '%KR027%' then 'var' else 'eski sürüm' end
                     from pg_proc p where p.oid = to_regprocedure('public.tanim_ad_guncel(text)')), 'yok')
  union all
  select 3, 'tanim_ad_gecmisi tablosu (serbest sütunu ile)', 'var',
         case when to_regclass('public.tanim_ad_gecmisi') is null then 'yok'
              when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tanim_ad_gecmisi' and column_name = 'serbest') then 'var'
              else 'serbest sütunu yok' end
  union all
  select 4, 'bayat yazma tetikleyicisi (siparis_kalemleri, uretim, stok_rezervasyonlari, lst_kayit)', '4 etkin',
         (select count(*)::text || ' etkin' from pg_trigger g join pg_class c on c.oid = g.tgrelid
           where g.tgname = 'tanim_ad_guncelle' and g.tgenabled = 'O' and c.relname in ('siparis_kalemleri', 'uretim', 'stok_rezervasyonlari', 'lst_kayit'))
  union all
  select 5, 'eski ad koruması (tanimlar, KR026)', '1 etkin',
         (select count(*)::text || ' etkin' from pg_trigger g where g.tgrelid = 'public.tanimlar'::regclass and g.tgname = 'tanim_ad_gecmisi_koru' and g.tgenabled = 'O')
  union all
  select 6, 'tanim_eski_ad_serbest(jsonb) fonksiyonu', 'var', case when to_regprocedure('public.tanim_eski_ad_serbest(jsonb)') is null then 'yok' else 'var' end
)
select no, kontrol, beklenen, bulunan,
       case when (no = 1 and bulunan like 'var, definer=true, authenticated=true, anon=false') or (no in (2, 3, 6) and bulunan = 'var')
                 or (no = 4 and bulunan = '4 etkin') or (no = 5 and bulunan = '1 etkin') then 'tamam' else 'EKSİK' end as durum
  from k
union all
select 99, 'GENEL', 'KURULU', '', case when (select count(*) from k) = 6 and not exists (
  select 1 from k where not ((no = 1 and bulunan like 'var, definer=true, authenticated=true, anon=false') or (no in (2, 3, 6) and bulunan = 'var')
                            or (no = 4 and bulunan = '4 etkin') or (no = 5 and bulunan = '1 etkin'))) then 'KURULU' else 'KURULU DEĞİL' end
order by 1;
