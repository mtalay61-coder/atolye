-- =====================================================================================================================
--  25-onkosul-salt-okur.sql — G-25 ÖNKOŞUL / DURUM (SALT OKUR; hiçbir şey yazmaz, kişisel veri / e-posta dökmez)
--  G-25 — car_yaz YETKİ GENİŞLİĞİ (stok-v2/guvenlik/25-G25-TASARIM.md). ÜRETİLMİŞ DOSYA — elle düzenlenmez:
--  python3 stok-v2/guvenlik/25-uret.py (kaynak: 25-kaynak/yeni.sql + editor/15-duzeltme.sql car_yaz + editor/18-fis-defteri.sql
--  fis_kes / fis_iptal). Gövde özetleri Faz 0.4 envanterinin formülüyle (yorum / boşluk normalize, md5).
--  GENEL: HAZIR (uygulanabilir) · UYGULANMIŞ · KARIŞIK (dur, incele). Satır 8 kullanıcıları yalnız SAYAR (ad / e-posta yok).
-- =====================================================================================================================
with v as (
  select case (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.car_yaz(jsonb)')) when '1af5a49a2fa60b90210f48fac5076a27' then 'eski (G-25 öncesi, beklenen)' when '4ee7bfb498c6d729a6ddcf47a420031b' then 'G-25 uygulanmış' when null then 'YOK' else 'FARKLI: ' || coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.car_yaz(jsonb)')), 'yok') end as car_yaz, case (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_kes(jsonb)')) when '7b4e3f2474c25784e92d0f91a9053af2' then 'eski (G-25 öncesi, beklenen)' when 'c071d8020d8a22b20765cff7aec77c47' then 'G-25 uygulanmış' when null then 'YOK' else 'FARKLI: ' || coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_kes(jsonb)')), 'yok') end as fis_kes, case (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_iptal(jsonb)')) when 'c514ade3ebe55cd52ea9c6a26b0bfc7a' then 'eski (G-25 öncesi, beklenen)' when '2ea9f6ce73682303f69f1b8f191e84ab' then 'G-25 uygulanmış' when null then 'YOK' else 'FARKLI: ' || coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_iptal(jsonb)')), 'yok') end as fis_iptal,
         (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.yetki_var_mi(text[], text)')) as a6, ((to_regprocedure('public.g25_fis_cari_yetki(jsonb)') is not null)::int + (to_regprocedure('public.g25_fis_cari_yetki_tek(jsonb, jsonb, jsonb, jsonb, jsonb)') is not null)::int + (to_regprocedure('public.g25_fis_iptal_yetki(text)') is not null)::int + (to_regprocedure('public.g25_mesai_anahtari(text, text)') is not null)::int + (to_regprocedure('public.g25_mesai_tahakkuku(text, text)') is not null)::int + (to_regprocedure('public.g25_mesai_tutari(text, jsonb)') is not null)::int + (to_regprocedure('public.g25_stok_bagi(jsonb, jsonb, jsonb, jsonb)') is not null)::int + (to_regprocedure('public.g25_tanimlar_ucret_koruma()') is not null)::int + (to_regprocedure('public.g25_ucret_ozeti(jsonb)') is not null)::int + (to_regprocedure('public.g25_uretim_bagi(jsonb, jsonb, jsonb, jsonb)') is not null)::int + (to_regprocedure('public.g25_yetki_iste(text[], text, text)') is not null)::int + (to_regprocedure('public.mesai_bildir(jsonb)') is not null)::int + (to_regprocedure('public.mesai_bildirim_iptal(jsonb)') is not null)::int + (to_regprocedure('public.mesai_bildirimleri(jsonb)') is not null)::int + (to_regprocedure('public.mesai_onayla(jsonb)') is not null)::int + (to_regclass('public.mes_bildirim') is not null)::int + (select count(*) from pg_trigger where tgname = 'g25_tanimlar_ucret_koruma')::int) as yeni,
         to_regclass('guvenlik.g25_yedek') is not null as yedek
), k as (
  select coalesce((select veri from public.tanimlar where id = 'tekil'), '{}'::jsonb) as t
), kul as (
  select x as u, coalesce(x ->> 'rol', '') = 'Yönetici' as yon,
         coalesce((x -> 'yetkiler' -> 'cari' ->> 'kaydetme')::boolean, false) or coalesce((x -> 'yetkiler' -> 'muhasebe' ->> 'kaydetme')::boolean, false) as para,
         coalesce((x -> 'yetkiler' -> 'stok' ->> 'kaydetme')::boolean, false) or coalesce((x -> 'yetkiler' -> 'uretim' ->> 'kaydetme')::boolean, false)
           or coalesce((x -> 'yetkiler' -> 'siparis' ->> 'kaydetme')::boolean, false) as stok,
         coalesce((x -> 'yetkiler' -> 'fisler' ->> 'kaydetme')::boolean, false) as fis
    from k, jsonb_array_elements(case when jsonb_typeof(k.t -> 'kullanicilar') = 'array' then k.t -> 'kullanicilar' else '[]'::jsonb end) x
)
select sira, kontrol, deger from (
  select 1 as sira, 'G-25 yedeği (guvenlik.g25_yedek)' as kontrol, case when yedek then 'VAR (uygulanmış)' else 'yok' end as deger from v
  union all select 2, 'car_yaz gövdesi', car_yaz from v
  union all select 3, 'fis_kes gövdesi', fis_kes from v
  union all select 4, 'fis_iptal gövdesi', fis_iptal from v
  union all select 5, 'A6 (yetki_var_mi gövdesi = canlı A6)', case when a6 = '148fc08c0e06e554b0f81478f8e26931' then 'UYGULANMIŞ' else 'FARKLI: ' || coalesce(a6, 'yok') end from v
  union all select 6, 'G-25''in oluşturacağı nesneler (önce 0, sonra 17)', yeni::text from v
  union all select 7, 'fiş kuralları / sürüm kapısı', 'kurallar ' || case when public.fis_kural_aktif() then 'AÇIK' else 'KAPALI' end
         || ' · min_istemci_surum ' || coalesce((select min_istemci_surum from public.stk_ayar where id = 'tekil'), 'boş')
  union all select 8, 'kullanıcılar (sayı): Yönetici · cari/muhasebe kaydetmeli · PARA''sız stok/üretim/sipariş kaydetmeli · yalnız fisler kaydetmeli · diğer',
         (select count(*) filter (where yon) || ' · ' || count(*) filter (where not yon and para) || ' · ' || count(*) filter (where not yon and not para and stok)
                || ' · ' || count(*) filter (where not yon and not para and not stok and fis) || ' · ' || count(*) filter (where not yon and not para and not stok and not fis) from kul)
  union all select 99, 'GENEL', case
      when not yedek and yeni = 0 and car_yaz like 'eski%' and fis_kes like 'eski%' and fis_iptal like 'eski%' and a6 = '148fc08c0e06e554b0f81478f8e26931' then 'HAZIR'
      when yedek and yeni = 17 and car_yaz like 'G-25%' and fis_kes like 'G-25%' and fis_iptal like 'G-25%' then 'UYGULANMIŞ'
      else 'KARIŞIK — dur, satırları incele' end from v
) s order by sira;
