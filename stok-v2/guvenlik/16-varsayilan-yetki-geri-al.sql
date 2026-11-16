-- 16-varsayilan-yetki-geri-al.sql — 16-varsayilan-yetki-kapat.sql'i geri alır: postgres'in fonksiyon varsayılanı yerleşik hâle döner
-- (PUBLIC EXECUTE). Varsayılan, yerleşikle aynı olunca PostgreSQL global kaydı kendiliğinden siler (önceki durum: "global kayıt YOK").
-- Var olan fonksiyonların yetkisi değişmez.
begin;
alter default privileges for role postgres revoke execute on functions from authenticated, service_role;
alter default privileges for role postgres grant execute on functions to public;
commit;
select count(*) = 0 as global_kayit_yok_onceki_hal
from pg_default_acl d where d.defaclrole = 'postgres'::regrole and d.defaclnamespace = 0 and d.defaclobjtype = 'f';
