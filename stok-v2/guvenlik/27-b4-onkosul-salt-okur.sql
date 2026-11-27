-- =====================================================================================================================
--  27-b4-onkosul-salt-okur.sql — B4 / B5 ÖNKOŞUL / SONUÇ — SALT OKUR. ÜRETİLDİ (27-b4-uret.py). Hiçbir şey yazmaz.
--  Her fonksiyon: HAZIR (canlıdaki 1.744.37 gövdesi, md5) · UYGULANMIŞ (B4 imzalı gövde) · FARKLI (başka bir değişiklik, ör. G-25 — DUR).
-- =====================================================================================================================
with f(no, ad, md5_canli) as (values (1, 'fis_kes', 'd5615b1136ec5b7d8cdd475c2a59543e'), (2, 'fis_iptal', '23b5e8ca42f7598b448684919df27603'), (3, 'fis_iptal_toplu', '8ea651cbef26f82028df668db2b2f361')),
d as (
  select f.no, f.ad || '(jsonb)' as kontrol,
         case when p.oid is null then 'YOK'
              when md5(pg_get_functiondef(p.oid)) = f.md5_canli then 'HAZIR'
              when position('B4 (28 Kasım)' in pg_get_functiondef(p.oid)) > 0 then 'UYGULANMIŞ'
              else 'FARKLI (md5 ' || md5(pg_get_functiondef(p.oid)) || ')' end as durum
    from f left join pg_proc p on p.oid = to_regprocedure('public.' || f.ad || '(jsonb)')
  union all
  select 4, 'b4_teslim_denetle · b4_iptal_denetle (yetki: authenticated çalıştıramaz)',
         case when to_regprocedure('public.b4_teslim_denetle(jsonb)') is null and to_regprocedure('public.b4_iptal_denetle(jsonb,text[])') is null then 'yok'
              when to_regprocedure('public.b4_teslim_denetle(jsonb)') is not null and to_regprocedure('public.b4_iptal_denetle(jsonb,text[])') is not null
                   and not has_function_privilege('authenticated', 'public.b4_teslim_denetle(jsonb)', 'execute')
                   and not has_function_privilege('authenticated', 'public.b4_iptal_denetle(jsonb,text[])', 'execute') then 'var'
              else 'EKSİK / YETKİ YANLIŞ' end)
select no, kontrol, durum from d
union all
select 99, 'GENEL', case
  when (select count(*) from d where no <= 3 and durum = 'HAZIR') = 3 and (select durum from d where no = 4) = 'yok' then 'HAZIR'
  when (select count(*) from d where no <= 3 and durum = 'UYGULANMIŞ') = 3 and (select durum from d where no = 4) = 'var' then 'UYGULANMIŞ'
  else 'FARKLI — DUR (beklenmeyen gövde; ör. G-25 uygulanmış)' end
order by 1;
