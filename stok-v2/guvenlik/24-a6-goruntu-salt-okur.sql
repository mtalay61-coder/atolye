-- =====================================================================================================================
--  24-a6-goruntu-salt-okur.sql — A6 SINAMASI ÖNCESİ / SONRASI ANLIK GÖRÜNTÜ (SALT OKUR; tek select)
--  24-a6-canli-sinama.sql'den ÖNCE ve SONRA çalıştırılır; iki çıktı BİREBİR aynı olmalı (sınama iz bırakmaz).
--  Ölçülen: tanımlar satırları (kimlik + veri özeti), değişiklik sayacı tablosunun özeti (tanımlar güncellenince tetikleyici
--  artırır), günlük ve silinenler arşivi satır sayıları. Kişisel veri dönmez (yalnız md5 özeti ve sayı).
-- =====================================================================================================================
select (select string_agg(id || ' · ' || md5(veri::text), ', ' order by id) from public.tanimlar) as tanimlar,
       (select md5(coalesce(string_agg(to_jsonb(d)::text, ',' order by to_jsonb(d)::text), '')) from public.degisiklik d) as degisiklik,
       (select count(*) from public.gunluk) as gunluk,
       (select count(*) from public.silinen_arsiv) as arsiv;
