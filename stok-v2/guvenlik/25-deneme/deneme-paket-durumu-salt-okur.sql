-- =====================================================================================================================
--  25-deneme/deneme-paket-durumu-salt-okur.sql — SALT OKUR. Deneme projesinde GERÇEKTE uygulanmış G-25 aşamalarını ölçer (yerel kopyadan
--  değil, bu veritabanının kendi fonksiyon gövdelerinden). Beklenen gövde özetleri yerel sınama kopyalarında ölçüldü (25 Kasım):
--   G-25 (fcc5429c) · +25b (5ba5620a) · +25c (8d222633) · +25d (493c58d0). Özet: yorum / boşluk ayıklanmış prosrc'nin md5'i (Faz 0.4 formülü).
-- =====================================================================================================================
with ozet as (
  select p.proname as ad, md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) as m
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
v as (select
  (select m from ozet where ad = 'g25_onayli') as onayli, (select m from ozet where ad = 'ucret_onayla') as onayla,
  (select m from ozet where ad = 'g25_fis_cari_yetki_tek') as tek, (select m from ozet where ad = 'g25_uretim_bagi') as bagi,
  (select m from ozet where ad = 'g25_uretim_butunluk') as butunluk, (select m from ozet where ad = 'g25_gecmis_iscilik') as gecmis,
  (select m from ozet where ad = 'g25_alt_saglam') as saglam, (select m from ozet where ad = 'g25_ilk_atama') as ilk)
select sira, kontrol, deger from (
  select 1 as sira, 'G-25 (guvenlik.g25_yedek)' as kontrol, case when to_regclass('guvenlik.g25_yedek') is not null then 'VAR' else 'yok' end as deger from v
  union all select 2, '25b onay mührü (gecersiz sütunu · g25_onayli · ucret_onayla · 4 tetikleyici)',
    (exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ucr_onay' and column_name = 'gecersiz'))::text
    || ' · ' || case onayli when '42c615ed2ab27567180544aba48e4552' then '25b' when '45b8f0c5ef558456a7f2c2dc94264432' then 'G-25 (mühürsüz)' else coalesce('FARKLI ' || onayli, 'yok') end
    || ' · ' || case onayla when 'afe6300d9422a8d5925986730f85feb7' then '25b' when '848e8bce8a28798535bc41337d4b18ba' then 'G-25 (mühürsüz)' else coalesce('FARKLI ' || onayla, 'yok') end
    || ' · ' || (select count(*) from pg_trigger where tgname like 'g25\_onay\_degisim\_%')::text from v
  union all select 3, '25c (g25_fis_cari_yetki_tek · g25_uretim_butunluk · g25_gecmis_iscilik)',
    case tek when 'e1a85f91d9488c6e84bbba576c513d23' then '25c' when '975182067797b92334fc80d053640803' then 'G-25 (25c YOK)' else coalesce('FARKLI ' || tek, 'yok') end
    || ' · ' || case butunluk when '0e3914e497cf024b1ebc020d884987ba' then '25c' when '259c03fc21636d6e8d7c55009f246c4d' then '25d' else coalesce('FARKLI ' || butunluk, 'yok') end
    || ' · ' || case gecmis when 'e19ef6bca2ede046c3e6fa252df0e569' then '25c' else coalesce('FARKLI ' || gecmis, 'yok') end from v
  union all select 4, '25d (g25_uretim_bagi · g25_alt_saglam · g25_ilk_atama)',
    case bagi when '70fc54def65f4cbe537a2472610279fa' then '25d' when 'c38a27edda7cd80fedbff42aad896a15' then '25c' when 'c69c0879ce6d29cf15af577ea9fc2acc' then 'G-25 / 25b' else coalesce('FARKLI ' || bagi, 'yok') end
    || ' · ' || case saglam when '206a2993fc5ba3d40535d5be62cee16a' then '25d' else coalesce('FARKLI ' || saglam, 'yok') end
    || ' · ' || case ilk when 'fb851a966b223dce8516fef104cfeab9' then '25d' else coalesce('FARKLI ' || ilk, 'yok') end from v
  union all select 5, 'yürürlükteki aşama', case
    when bagi = '70fc54def65f4cbe537a2472610279fa' and saglam is not null and tek = 'e1a85f91d9488c6e84bbba576c513d23' and onayli = '42c615ed2ab27567180544aba48e4552' then 'G-25 + 25b + 25c + 25d'
    when bagi = 'c38a27edda7cd80fedbff42aad896a15' and tek = 'e1a85f91d9488c6e84bbba576c513d23' and saglam is null and onayli = '42c615ed2ab27567180544aba48e4552' then 'G-25 + 25b + 25c (sırada 25d)'
    when bagi = 'c69c0879ce6d29cf15af577ea9fc2acc' and tek = '975182067797b92334fc80d053640803' and butunluk is null and onayli = '42c615ed2ab27567180544aba48e4552' then 'G-25 + 25b (sırada 25c, sonra 25d)'
    when bagi = 'c69c0879ce6d29cf15af577ea9fc2acc' and onayli = '45b8f0c5ef558456a7f2c2dc94264432' then 'G-25 (sırada 25b, 25c, 25d)'
    else 'KARIŞIK / FARKLI — dur, satırları incele' end from v
  union all select 6, 'tamamlanmamış atama · açık tamir ataması (25d sonrası teslimleri 1.745.2 yapmalı)',
    (select count(*) filter (where not coalesce(tamamlandi_mi, false)) || ' · ' || count(*) filter (where not coalesce(tamamlandi_mi, false) and coalesce(tamir_mi, false)) from public.uretim_atamalari)
) s order by sira;
