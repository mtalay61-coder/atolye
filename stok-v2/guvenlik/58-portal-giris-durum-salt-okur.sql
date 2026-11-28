-- PORTAL GİRİŞ DURUMU — SALT OKUR. Hiçbir şey yazmaz; giriş denemez.
select case md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) when 'f90cd3a563eabf1465427d3b08fbc19d' then 'YENİ — cari mevcut ve etkin olmalı' when '3414d4de1e4fcb8120a82d2c1db54e53' then 'ESKİ — yalnız pasif cariye bakıyor' else 'BEKLENMEYEN GÖVDE — sonucu gönder' end as portal_giris,
       p.prosecdef as guvenlik_tanimlayici, array_to_string(p.proconfig, ', ') as ayar,
       has_function_privilege('anon', p.oid, 'execute') as anon_cagirabilir, has_function_privilege('authenticated', p.oid, 'execute') as giris_yapmis_cagirabilir,
       (select count(*) from public.site_hesaplari h where not exists (select 1 from public.cariler c where c.id::text = h.cari_id)) as carisi_olmayan_hesap,
       (select count(*) from public.site_hesaplari h join public.cariler c on c.id::text = h.cari_id where coalesce(c.pasif, false)) as carisi_pasif_hesap
  from pg_proc p where p.oid = to_regprocedure('public.portal_giris(text,text)');
