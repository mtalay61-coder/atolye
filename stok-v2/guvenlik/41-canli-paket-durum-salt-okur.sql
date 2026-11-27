-- =====================================================================================================================
--  41-canli-paket-durum-salt-okur.sql — YALNIZ OKUR. Hiçbir şeyi değiştirmez. (34-canli-durum-salt-okur.sql'in YERİNE geçer.)
--  Dört paketin (B4/B5, B3a, B3a-2, ret iletisi) durumu: kurulu mu, kurulu KOD sınanan kodla aynı mı, tetikleyiciler etkin mi.
--  SATIR SONUNDAN BAĞIMSIZ: gövdeler satır başı karakteri (CR) atılarak karşılaştırılır; LF / CRLF / CR CR LF aynı kod sayılır.
--  CR dışındaki her fark "FARKLI — DUR" verir. Bu sorgu CRLF ile de yapıştırılabilir.
-- =====================================================================================================================
with b(paket, imza, md5_yeni, md5_eski) as (values
  ('31', 'public.stk_yetki(text[],text)', '4de398638778b6b961b9ca410f5c7a4e', '8e305635deb402a69983e24136e59ff9'),
  ('B3a-2', 'public.b3a2_bos(jsonb)', '22d8397f6e8bfc9c26d631f7456d62a2', null),
  ('B3a-2', 'public.b3a2_cariler()', '85ce6acc0c1f605fd228c70ea2e19d03', null),
  ('B3a-2', 'public.b3a2_kurallar(jsonb,boolean)', '1ea1c9f51f77e938408f5cfbcd690893', null),
  ('B3a-2', 'public.b3a2_liste_fark(jsonb,jsonb)', 'd7f869398928a0d9deacae994ce01b52', null),
  ('B3a-2', 'public.b3a2_red(text,text)', 'e2caef1f976419b66306c8627bfbe55d', null),
  ('B3a-2', 'public.b3a2_serbest()', '0e8cf1e7a84a897225d713b8a83cc942', null),
  ('B3a-2', 'public.b3a2_tanimlar()', 'e2a32d9d9aa691628aab95eb84e110d6', null),
  ('B3a-2', 'public.b3a2_urunler()', '7fb415d33b55f385aadfdfbfeb409da4', null),
  ('B3a-2', 'public.b3a2_y(text,text)', '36da19ced2fdadc863c7c650c60ecad7', null),
  ('B3a-2', 'public.b3a2_yazar()', 'd6192aa38e1cae75ffc057ec15df3324', null),
  ('B3a', 'public.b3a_yazma_koru()', 'fea7214d3ef07bfe97a8fbb82ec58ed4', null),
  ('B4', 'public.b4_iptal_denetle(jsonb,text[])', 'ab0ac07c123aa26555fc54670aa231dc', null),
  ('B4', 'public.b4_teslim_denetle(jsonb)', '651dda83e5328bba55672c2639bafa83', null),
  ('B4', 'public.fis_iptal(jsonb)', 'eced3aba9d69309ad0712280744e4d13', '76c4aec5070335186fe22a455f46bd01'),
  ('B4', 'public.fis_iptal_toplu(jsonb)', '926db5f07e59a9cea6261e11eba02315', '194d345ce9da60907069413ab4068e10'),
  ('B4', 'public.fis_kes(jsonb)', '5e4f82cc6dd2948bed33a0ead5a898a8', '96b871021122ea749107f54a532b3f33')),
g as (
  select b.paket, b.imza, b.md5_yeni, b.md5_eski, p.oid, md5(replace(p.prosrc, chr(13), '')) as bulunan
    from b left join pg_proc p on p.oid = to_regprocedure(b.imza)),
o as (
  select paket, count(*) as n,
         count(*) filter (where oid is not null and bulunan = md5_yeni) as yeni,
         count(*) filter (where (md5_eski is not null and bulunan = md5_eski) or (md5_eski is null and oid is null)) as eski,
         string_agg(case when oid is null and md5_eski is not null then imza || ' YOK'
                         when oid is not null and bulunan <> md5_yeni and bulunan is distinct from md5_eski then imza || ' FARKLI ' || bulunan end, ' · ') as sorun
    from g group by paket),
t as (
  select (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru' and tgenabled = 'O') as b3a,
         (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru') as b3a_hepsi,
         (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru' and tgenabled = 'O') as b3a2,
         (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru') as b3a2_hepsi),
d as (
  select 1 as sira, 'B4/B5 (5 fonksiyon)' as kontrol,
         case when (select yeni from o where paket = 'B4') = 5 then 'KURULU — kod sınananla aynı'
              when (select eski from o where paket = 'B4') = 5 then 'kurulu değil'
              else 'FARKLI — DUR: ' || coalesce((select sorun from o where paket = 'B4'), 'yarım kurulum') end as durum
  union all
  select 2, 'B3a (b3a_yazma_koru + 14 tabloda etkin tetikleyici)',
         case when (select yeni from o where paket = 'B3a') = 1 and (select b3a from t) = 14 and (select b3a_hepsi from t) = 14 then 'KURULU — kod sınananla aynı'
              when (select eski from o where paket = 'B3a') = 1 and (select b3a_hepsi from t) = 0 then 'kurulu değil'
              else 'FARKLI — DUR: ' || coalesce((select sorun from o where paket = 'B3a'), 'tetikleyici ' || (select b3a || ' etkin / ' || b3a_hepsi from t)) end
  union all
  select 3, 'B3a-2 (10 fonksiyon + cariler, tanimlar, urunler tetikleyicisi; ret kodu KR040)',
         case when (select yeni from o where paket = 'B3a-2') = 10 and (select b3a2 from t) = 3 and (select b3a2_hepsi from t) = 3 then 'KURULU — kod sınananla aynı'
              when (select eski from o where paket = 'B3a-2') = 10 and (select b3a2_hepsi from t) = 0 then 'kurulu değil'
              else 'FARKLI — DUR: ' || coalesce((select sorun from o where paket = 'B3a-2'), 'tetikleyici ' || (select b3a2 || ' etkin / ' || b3a2_hepsi from t)) end
  union all
  select 4, 'Ret iletisi (stk_yetki)',
         case when (select yeni from o where paket = '31') = 1 then 'KURULU — yeni ileti'
              when (select eski from o where paket = '31') = 1 then 'kurulu değil (canlıdaki eski kod)'
              else 'FARKLI — DUR: ' || coalesce((select sorun from o where paket = '31'), 'stk_yetki yok') end
  union all
  select 5, 'b4_* ve b3a* iç fonksiyonları: authenticated / anon doğrudan çağıramaz',
         case when not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and (p.proname like 'b4\_%' or p.proname like 'b3a\_%' or p.proname like 'b3a2\_%')
                                  and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))) then 'evet' else 'HAYIR — DUR' end
  union all
  select 6, 'önkoşul: yetki_var_mi(text[], text) ve yonetici_mi()',
         case when to_regprocedure('public.yetki_var_mi(text[],text)') is not null and to_regprocedure('public.yonetici_mi()') is not null then 'var' else 'EKSİK — DUR' end
  union all
  select 7, 'G-25 nesnesi (canlıda 0 olmalı)', (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'g25\_%')::text
  union all
  select 8, 'kullanıcılar: Yönetici · Yönetici olmayan',
         coalesce((select count(*) filter (where u ->> 'rol' = 'Yönetici') || ' · ' || count(*) filter (where coalesce(u ->> 'rol', '') <> 'Yönetici')
                     from public.tanimlar tn, jsonb_array_elements(coalesce(tn.veri -> 'kullanicilar', '[]'::jsonb)) u where tn.id = 'tekil'), '0 · 0')
  union all
  select 9, 'giriş sistemi (true olmalı)', coalesce((select veri ->> 'girisAktifMi' from public.tanimlar where id = 'tekil'), 'tanimlar satırı yok'))
select sira, kontrol, durum from d
union all
select 99, 'GENEL', case when exists (select 1 from d where durum like '%DUR%') then 'DUR — yukarıdaki satırı incele' else 'tutarlı (yarım ya da farklı kurulum yok)' end
order by 1;
