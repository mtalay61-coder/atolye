-- PAKET V DURUMU — SALT OKUR. Hiçbir şey yazmaz.
with ikiz as (
  select v.urun_id, coalesce(public.stk_nrm(r.ad), '') as ra, coalesce(public.stk_nrm(o.ad), '') as oa, count(*) as n
    from public.stk_varyant v left join public.stk_renk r on r.id = v.renk_id left join public.stk_olcu o on o.id = v.olcu_id
   group by 1, 2, 3 having count(*) > 1),
k(no, kontrol, beklenen, bulunan) as (
  select 1, 'koruma fonksiyonu (v_ikiz_varyant_koru)', '1', (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'v_ikiz_varyant_koru')
  union all select 2, 'etkin tetikleyici (stk_varyant, kayıt eklenirken)', '1', (select count(*)::text from pg_trigger g where not g.tgisinternal and g.tgenabled = 'O' and g.tgname = 'v_ikiz_varyant_koru')
  union all select 3, 'fonksiyon authenticated / anon tarafından doğrudan çağrılamaz', 'evet',
     case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'v_ikiz_varyant_koru'
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))) then 'HAYIR' else 'evet' end
)
select no, kontrol, beklenen, bulunan, case when bulunan = beklenen then 'tamam' else 'EKSİK' end as durum from k
union all select 90, 'BİLGİ · bugün aynı üründe aynı adla birden çok varyant (paket bunlara dokunmaz)', '', (select count(*)::text || ' ad · ' || coalesce(sum(n), 0)::text || ' varyant' from ikiz), 'bilgi'
union all select 99, 'GENEL', '', '', case when (select bool_and(bulunan = beklenen) from k) then 'KURULU' when (select bool_and(bulunan in ('0', 'evet')) from k) then 'KURULU DEĞİL' else 'YARIM — sonucu gönder' end
order by 1;
