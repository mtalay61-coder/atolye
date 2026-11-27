-- =====================================================================================================================
--  34-canli-durum-salt-okur.sql — YALNIZ OKUR. Hiçbir şeyi değiştirmez. Kurulumdan ÖNCE, her adımdan SONRA ve geri almadan sonra
--  çalıştırılır; dört paketin (B4/B5, B3a, B3a-2, ret iletisi) durumunu ve kurulum önkoşullarını tek tabloda gösterir.
--  B4'ün ayrıntılı önkoşulu ayrıca: 27-b4-onkosul-salt-okur.sql (üç fonksiyon gövdesinin beklenen özetleri).
-- =====================================================================================================================
select 1 as sira, 'B4/B5 (b4_teslim_denetle, b4_iptal_denetle)' as kontrol,
       case (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('b4_teslim_denetle', 'b4_iptal_denetle'))
         when 2 then 'KURULU' when 0 then 'kurulu değil' else 'YARIM — DUR' end as durum
union all
select 2, 'B3a (b3a_yazma_koru: 14 tabloda etkin tetikleyici)',
       case (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru' and tgenabled = 'O')
         when 14 then 'KURULU' when 0 then 'kurulu değil' else 'YARIM — DUR (' || (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru') || ')' end
union all
select 3, 'B3a-2 (b3a2_alan_koru: cariler, tanimlar, urunler; 10 fonksiyon)',
       case when (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru' and tgenabled = 'O') = 3
                 and (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\_%') = 10 then 'KURULU'
            when not exists (select 1 from pg_trigger where tgname = 'b3a2_alan_koru')
                 and not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\_%') then 'kurulu değil'
            else 'YARIM — DUR' end
union all
select 4, 'B3a-2 ret kodu (KR040 olmalı)',
       coalesce((select case when prosrc like '%KR040%' then 'KR040' else 'FARKLI — eski sürüm, DUR' end from pg_proc
                  where pronamespace = 'public'::regnamespace and proname = 'b3a2_red'), 'kurulu değil')
union all
select 5, 'Ret iletisi (stk_yetki gövdesi)',
       coalesce((select case md5(prosrc) when '4de398638778b6b961b9ca410f5c7a4e' then 'KURULU (yeni ileti)'
                                         when '32844b94ccc2421fddcf7851907ab88c' then 'kurulu değil (beklenen eski gövde)'
                                         else 'BEKLENMEYEN GÖVDE — DUR: ' || md5(prosrc) end
                   from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki'), 'stk_yetki YOK — DUR')
union all
select 6, 'önkoşul: yetki_var_mi(text[], text) ve yonetici_mi()',
       case when to_regprocedure('public.yetki_var_mi(text[],text)') is not null and to_regprocedure('public.yonetici_mi()') is not null
            then 'var' else 'EKSİK — DUR' end
union all
select 7, 'önkoşul: G-25 nesnesi (canlıda 0 olmalı)',
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'g25\_%')::text
union all
select 8, 'kullanıcılar: Yönetici · Yönetici olmayan (kurallar yalnız ikinciyi etkiler)',
       coalesce((select count(*) filter (where u ->> 'rol' = 'Yönetici') || ' · ' || count(*) filter (where coalesce(u ->> 'rol', '') <> 'Yönetici')
                   from public.tanimlar t, jsonb_array_elements(coalesce(t.veri -> 'kullanicilar', '[]'::jsonb)) u where t.id = 'tekil'), '0 · 0')
union all
select 9, 'giriş sistemi (açık olmalı; kapalıysa yetki kuralları herkesi yetkili sayar)',
       coalesce((select (veri ->> 'girisAktifMi') from public.tanimlar where id = 'tekil'), 'tanimlar satırı yok')
order by 1;
