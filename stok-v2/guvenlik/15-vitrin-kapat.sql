-- =====================================================================================================================
--  15-vitrin-kapat.sql — vitrin_urunler görünümünü girişsiz kullanıcıya (anon) KAPATIR (YALNIZ 14'te açık çıkarsa, AYRI ONAYLA)
-- =====================================================================================================================
--  Neden: `vitrin_urunler` ne ERP'de ne web sitesinde (newdiamond-web) kullanılıyor; site yalnız 8 sunucu fonksiyonunu çağırıyor.
--  Görünüm security_invoker olmadan (sahibinin yetkisiyle) çalışıyorsa `urunler`in RLS'ini atlar; anon'a SELECT verilmişse
--  sütunları herkese açık okunur. En dar düzeltme: görünüme DOKUNMADAN anon'un ve PUBLIC'in SELECT yetkisini almak.
--  ERP etkisi: yok (ERP görünümü okumuyor; giriş yapmış kullanıcının yetkisine dokunulmaz). Site etkisi: yok (site görünümü okumuyor).
--  Yedek: önceki yetkiler guvenlik.vitrin_yetki_yedek'e yazılır (geri alma için). Tekrar çalıştırmak zararsız (yedek ilkinde kalır).
--  Geri alma: 15-vitrin-geri-al.sql. Doğrulama: aşağıdaki son sorgu (ve 14'ün 3. bölümü).
-- =====================================================================================================================
begin;
do $$
begin
  if to_regclass('public.vitrin_urunler') is null then raise exception 'vitrin_urunler yok — yapılacak bir şey yok'; end if;
end $$;
create schema if not exists guvenlik;
revoke all on schema guvenlik from public, anon, authenticated;
create table if not exists guvenlik.vitrin_yetki_yedek (grantee text, privilege_type text, zaman timestamptz default now());
insert into guvenlik.vitrin_yetki_yedek (grantee, privilege_type)
  select grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'vitrin_urunler' and grantee in ('anon', 'PUBLIC')
    and not exists (select 1 from guvenlik.vitrin_yetki_yedek);
revoke all on public.vitrin_urunler from anon;
revoke all on public.vitrin_urunler from public;
commit;
-- Doğrulama: anon_okur ve anon_yazar false olmalı; authenticated değişmez.
select has_table_privilege('anon', 'public.vitrin_urunler', 'select') as anon_okur,
       has_table_privilege('anon', 'public.vitrin_urunler', 'insert') or has_table_privilege('anon', 'public.vitrin_urunler', 'update') as anon_yazar,
       has_table_privilege('authenticated', 'public.vitrin_urunler', 'select') as giris_yapmis_okur,
       (select count(*) from guvenlik.vitrin_yetki_yedek) as yedeklenen_yetki;
