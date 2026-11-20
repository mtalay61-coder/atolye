-- =====================================================================================================================
--  24-a6-onkosul-salt-okur.sql — A6 DÜZELTMESİNİN DURUMU (SALT OKUR, tek select; ÜRETİLMİŞ: 24-uret.py)
--  GENEL: HAZIR = düzeltme öncesi bilinen hâl, uygulanabilir · UYGULANMIŞ = iki fonksiyon da yeni · KARIŞIK = biri yeni / biri
--  eski ya da bilinmeyen gövde (hiçbir dosyayı çalıştırmayın, sonucu paylaşın) · EKSİK = tanımlar verisi düzeltmeye hazır değil
--  (girisAktifMi boolean değil ya da kullanicilar dizi değil ya da listede Yönetici yok → düzeltme sonrası jetonlu yazmalar durur).
--  Gövde karşılaştırması yorum ve boşluk dışı md5 ile (22 ile aynı yöntem). Kişisel veri dönmez (yalnız sayı / tür).
-- =====================================================================================================================
with fn as (
  select x.sira, x.ad, x.eski, x.yeni,
         (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure(x.ad)) as su_an
    from (values (1, 'public.tanimlar_kullanici_koruma()', '7a75a37deb2f40bf71569da55292d851', '35c2916e7cc40fa07b98a87864f0436f'),
                 (2, 'public.yetki_var_mi(text[], text)', '85a0b3b9c38dc0f7c55f5f8f39519fc4', '148fc08c0e06e554b0f81478f8e26931')) x(sira, ad, eski, yeni)
),
f as (select *, case when su_an is null then 'yok' when su_an = yeni then 'yeni' when su_an = eski then 'eski' else 'bilinmeyen' end as hal from fn),
t as (select veri from public.tanimlar where id = 'tekil'),
satir(sira, kontrol, sonuc) as (
  select sira, ad, hal from f
  union all select 3, 'tetikleyici tanimlar_kullanici_koruma bağlı', case when exists (select 1 from pg_trigger g where g.tgrelid = 'public.tanimlar'::regclass and g.tgname = 'tanimlar_kullanici_koruma' and g.tgenabled <> 'D') then 'var' else 'yok' end
  union all select 4, 'tanimlar ''tekil'' satırı', case when exists (select 1 from t) then 'var' else 'yok' end
  union all select 5, 'girisAktifMi türü', coalesce((select jsonb_typeof(veri -> 'girisAktifMi') from t), 'yok')
  union all select 6, 'kullanicilar türü', coalesce((select jsonb_typeof(veri -> 'kullanicilar') from t), 'yok')
  union all select 7, 'listedeki Yönetici sayısı', coalesce((select count(*)::text from t, jsonb_array_elements(case when jsonb_typeof(veri -> 'kullanicilar') = 'array' then veri -> 'kullanicilar' else '[]'::jsonb end) e where e ->> 'rol' = 'Yönetici'), '0')
  union all select 8, 'tanimlar tablosundaki satır sayısı', (select count(*)::text from public.tanimlar)
)
select sira, kontrol, sonuc from satir
union all
select 99, 'GENEL', case
  when (select sonuc from satir where sira = 3) <> 'var' or (select sonuc from satir where sira = 4) <> 'var'
    or (select sonuc from satir where sira = 5) <> 'boolean' or (select sonuc from satir where sira = 6) <> 'array'
    or (select sonuc from satir where sira = 7) = '0' then 'EKSİK'
  when (select bool_and(hal = 'yeni') from f) then 'UYGULANMIŞ'
  when (select bool_and(hal = 'eski') from f) then 'HAZIR'
  else 'KARIŞIK' end
order by 1;
