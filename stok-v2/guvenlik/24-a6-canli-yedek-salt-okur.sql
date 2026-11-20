-- =====================================================================================================================
--  24-a6-canli-yedek-salt-okur.sql — FAZ 0: GERİ DÖNÜŞ İÇİN CANLIDAKİ BUGÜNKÜ TANIMLARIN KAYDI (SALT OKUR; tek select)
--  Supabase › SQL Editor › tamamı › Run → sonuç tablosunun sağ üstünden "Download CSV" (ya da Copy) → dosyayı sohbete yükleyin.
--  Döner: iki fonksiyonun canlıdaki TAM tanımı (pg_get_functiondef), sahip, definer, search_path, yetki listesi, md5 özeti ve
--  tetikleyicinin tam tanımı. Yalnız KOD ve yetki bilgisi — kişisel veri / sır yok (fonksiyonlar veri içermez).
--  Neden: 24-a6-tanim-kimligi-geri-al.sql depodaki ESKİ gövdeleri kurar; canlının gövdesi onlarla birebir mi (md5 'eski'), yetki
--  ve ayarlar ne — bu kayıt, geri dönüşün canlıyı TAM bugünkü hâline döndürdüğünü belgelemek için saklanır (depoda).
-- =====================================================================================================================
select x.ad as nesne,
       pg_get_userbyid(p.proowner) as sahip,
       p.prosecdef as security_definer,
       coalesce(array_to_string(p.proconfig, ' '), '') as ayar,
       coalesce(p.proacl::text, '(varsayılan)') as yetki_listesi,
       md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) as govde_md5,
       pg_get_functiondef(p.oid) as tam_tanim
  from (values (1, 'public.tanimlar_kullanici_koruma()'), (2, 'public.yetki_var_mi(text[], text)')) x(sira, ad)
  join pg_proc p on p.oid = to_regprocedure(x.ad)
union all
select 'tetikleyici tanimlar_kullanici_koruma', '', null, '', '', md5(pg_get_triggerdef(g.oid)), pg_get_triggerdef(g.oid)
  from pg_trigger g where g.tgrelid = 'public.tanimlar'::regclass and g.tgname = 'tanimlar_kullanici_koruma'
order by 1;
