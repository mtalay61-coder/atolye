-- !!! KULLANILMAMALI (27 Kasım): gövde özetini satır sonuyla birlikte karşılaştırır; CRLF ile yapıştırılmış DOĞRU kurulumu "FARKLI" gösterir.
-- !!! Yerine: 38-canli-b4-durum-salt-okur.sql
-- =====================================================================================================================
--  37-canli-b4-dogrula-salt-okur.sql — YALNIZ OKUR. Hiçbir şeyi değiştirmez. B4 / B5 kurulumundan SONRA çalıştırılır.
--  Kurulan beş fonksiyonun gövdesi, sınanmış kurulumdaki (yerel PostgreSQL 16 ve yerel Supabase) gövdelerle bayt bayt aynı mı;
--  iki denetim fonksiyonu yalnız sunucu içinden mi çağrılabiliyor; yetki paketleri hâlâ kurulu DEĞİL mi.
-- =====================================================================================================================
with b(sira, ad, imza, md5_beklenen) as (values
  (1, 'fis_kes', 'public.fis_kes(jsonb)', '5a0380c3cb7f6148eadae604b7e158a8'),
  (2, 'fis_iptal', 'public.fis_iptal(jsonb)', '136271823b56a90e3d3a49f50002cfcf'),
  (3, 'fis_iptal_toplu', 'public.fis_iptal_toplu(jsonb)', '53256458ba289bac80981ad3df0f266a'),
  (4, 'b4_teslim_denetle', 'public.b4_teslim_denetle(jsonb)', '651dda83e5328bba55672c2639bafa83'),
  (5, 'b4_iptal_denetle', 'public.b4_iptal_denetle(jsonb,text[])', 'ab0ac07c123aa26555fc54670aa231dc'))
select b.sira, b.ad || ' gövdesi' as kontrol,
       case when p.oid is null then 'YOK — DUR'
            when md5(p.prosrc) = b.md5_beklenen then 'sınanan gövdeyle AYNI'
            else 'FARKLI — DUR: ' || md5(p.prosrc) end as durum
  from b left join pg_proc p on p.oid = to_regprocedure(b.imza)
union all
select 6, 'fis_kes / fis_iptal / fis_iptal_toplu: authenticated çalıştırabilir (uygulama bunları çağırır)',
       case when has_function_privilege('authenticated', 'public.fis_kes(jsonb)', 'execute')
             and has_function_privilege('authenticated', 'public.fis_iptal(jsonb)', 'execute')
             and has_function_privilege('authenticated', 'public.fis_iptal_toplu(jsonb)', 'execute') then 'evet' else 'HAYIR — DUR' end
union all
select 7, 'fis_kes / fis_iptal / fis_iptal_toplu: anon çalıştıramaz',
       case when not has_function_privilege('anon', 'public.fis_kes(jsonb)', 'execute')
             and not has_function_privilege('anon', 'public.fis_iptal(jsonb)', 'execute')
             and not has_function_privilege('anon', 'public.fis_iptal_toplu(jsonb)', 'execute') then 'evet' else 'HAYIR — incele' end
union all
select 8, 'b4_teslim_denetle / b4_iptal_denetle: authenticated ve anon çalıştıramaz (yalnız sunucu içinden)',
       case when to_regprocedure('public.b4_teslim_denetle(jsonb)') is null or to_regprocedure('public.b4_iptal_denetle(jsonb,text[])') is null then 'YOK — DUR'
            when not has_function_privilege('authenticated', 'public.b4_teslim_denetle(jsonb)', 'execute')
             and not has_function_privilege('authenticated', 'public.b4_iptal_denetle(jsonb,text[])', 'execute')
             and not has_function_privilege('anon', 'public.b4_teslim_denetle(jsonb)', 'execute')
             and not has_function_privilege('anon', 'public.b4_iptal_denetle(jsonb,text[])', 'execute') then 'evet' else 'HAYIR — DUR' end
union all
select 9, 'yetki paketleri (B3a, B3a-2) hâlâ kurulu DEĞİL; ret iletisi eski gövdede',
       case when not exists (select 1 from pg_trigger where tgname in ('b3a_yazma_koru', 'b3a2_alan_koru'))
             and (select md5(prosrc) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki') = '32844b94ccc2421fddcf7851907ab88c'
            then 'evet (yalnız B4 / B5 kurulu)' else 'BEKLENMEYEN — incele' end
union all
select 10, 'public şemasında fonksiyon sayısı (kurulumdan önce 115 + 2 = 117 beklenir)',
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace)::text
order by 1;
