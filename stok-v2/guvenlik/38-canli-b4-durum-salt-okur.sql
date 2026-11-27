-- =====================================================================================================================
--  38-canli-b4-durum-salt-okur.sql — YALNIZ OKUR. Hiçbir şeyi değiştirmez. (37-canli-b4-dogrula-salt-okur.sql'in YERİNE geçer.)
--  B4 / B5 kurulu mu ve kurulu KOD sınanan kodla aynı mı. SATIR SONUNDAN BAĞIMSIZ: gövdeler satır başı karakteri (CR) atılarak
--  karşılaştırılır; LF, CRLF ya da yapıştırmadan gelen CR CR LF aynı kod sayılır ve biçimi ayrıca yazılır. CR dışındaki HER fark
--  (tek boşluk dahil) "FARKLI — DUR" verir. Bu sorgunun kendisi de CRLF ile yapıştırılabilir (satıra yayılan metin sabiti yok).
-- =====================================================================================================================
with b(sira, ad, imza, md5_kod) as (values
  (1, 'fis_kes', 'public.fis_kes(jsonb)', '5e4f82cc6dd2948bed33a0ead5a898a8'),
  (2, 'fis_iptal', 'public.fis_iptal(jsonb)', 'eced3aba9d69309ad0712280744e4d13'),
  (3, 'fis_iptal_toplu', 'public.fis_iptal_toplu(jsonb)', '926db5f07e59a9cea6261e11eba02315'),
  (4, 'b4_teslim_denetle', 'public.b4_teslim_denetle(jsonb)', '651dda83e5328bba55672c2639bafa83'),
  (5, 'b4_iptal_denetle', 'public.b4_iptal_denetle(jsonb,text[])', 'ab0ac07c123aa26555fc54670aa231dc')),
g as (
  select b.sira, b.ad, p.oid, b.md5_kod, md5(replace(p.prosrc, chr(13), '')) as md5_bulunan,
         length(p.prosrc) - length(replace(p.prosrc, chr(13), '')) as cr, length(p.prosrc) - length(replace(p.prosrc, chr(10), '')) as lf
    from b left join pg_proc p on p.oid = to_regprocedure(b.imza))
select g.sira, g.ad || ' kodu' as kontrol,
       case when g.oid is null then 'YOK — DUR'
            when g.md5_bulunan <> g.md5_kod then 'FARKLI — DUR: ' || g.md5_bulunan
            else 'sınanan kodla AYNI · satır sonu ' || case when g.cr = 0 then 'LF' when g.cr = g.lf then 'CRLF' when g.cr = 2 * g.lf then 'CR CR LF'
                 else 'karışık (' || g.cr || ' CR / ' || g.lf || ' LF)' end end as durum
  from g
union all
select 6, 'fis_kes / fis_iptal / fis_iptal_toplu: authenticated çalıştırabilir, anon çalıştıramaz',
       case when has_function_privilege('authenticated', 'public.fis_kes(jsonb)', 'execute')
             and has_function_privilege('authenticated', 'public.fis_iptal(jsonb)', 'execute')
             and has_function_privilege('authenticated', 'public.fis_iptal_toplu(jsonb)', 'execute')
             and not has_function_privilege('anon', 'public.fis_kes(jsonb)', 'execute')
             and not has_function_privilege('anon', 'public.fis_iptal(jsonb)', 'execute')
             and not has_function_privilege('anon', 'public.fis_iptal_toplu(jsonb)', 'execute') then 'evet' else 'HAYIR — DUR' end
union all
select 7, 'b4_teslim_denetle / b4_iptal_denetle: authenticated ve anon çalıştıramaz (yalnız sunucu içinden)',
       case when to_regprocedure('public.b4_teslim_denetle(jsonb)') is null or to_regprocedure('public.b4_iptal_denetle(jsonb,text[])') is null then 'YOK — DUR'
            when not has_function_privilege('authenticated', 'public.b4_teslim_denetle(jsonb)', 'execute')
             and not has_function_privilege('authenticated', 'public.b4_iptal_denetle(jsonb,text[])', 'execute')
             and not has_function_privilege('anon', 'public.b4_teslim_denetle(jsonb)', 'execute')
             and not has_function_privilege('anon', 'public.b4_iptal_denetle(jsonb,text[])', 'execute') then 'evet' else 'HAYIR — DUR' end
union all
select 8, 'yetki paketleri (B3a, B3a-2) kurulu değil; ret iletisi eski kodda',
       case when not exists (select 1 from pg_trigger where tgname in ('b3a_yazma_koru', 'b3a2_alan_koru'))
             and (select md5(replace(prosrc, chr(13), '')) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki') = '8e305635deb402a69983e24136e59ff9'
            then 'evet (yalnız B4 / B5 kurulu)' else 'BEKLENMEYEN — incele' end
union all
select 9, 'public şemasında fonksiyon sayısı (117 beklenir)', (select count(*) from pg_proc where pronamespace = 'public'::regnamespace)::text
union all
select 99, 'GENEL', case when (select count(*) from g where sira in (4, 5) and oid is not null) = 0 then 'B4 / B5 kurulu değil'
                         when (select count(*) from g where oid is not null and md5_bulunan = md5_kod) <> 5 then 'FARKLI — DUR (kod)'
                         when has_function_privilege('authenticated', 'public.b4_teslim_denetle(jsonb)', 'execute')
                           or has_function_privilege('authenticated', 'public.b4_iptal_denetle(jsonb,text[])', 'execute')
                           or has_function_privilege('anon', 'public.b4_teslim_denetle(jsonb)', 'execute')
                           or has_function_privilege('anon', 'public.b4_iptal_denetle(jsonb,text[])', 'execute')
                           or has_function_privilege('anon', 'public.fis_kes(jsonb)', 'execute')
                           or has_function_privilege('anon', 'public.fis_iptal(jsonb)', 'execute')
                           or has_function_privilege('anon', 'public.fis_iptal_toplu(jsonb)', 'execute')
                           or not has_function_privilege('authenticated', 'public.fis_kes(jsonb)', 'execute')
                           or not has_function_privilege('authenticated', 'public.fis_iptal(jsonb)', 'execute')
                           or not has_function_privilege('authenticated', 'public.fis_iptal_toplu(jsonb)', 'execute') then 'FARKLI — DUR (yetki)'
                         else 'B4 / B5 KURULU — kod ve yetkiler sınananla aynı' end
order by 1;
