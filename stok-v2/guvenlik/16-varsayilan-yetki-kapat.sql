-- =====================================================================================================================
--  16-varsayilan-yetki-kapat.sql — YENİ fonksiyonlar girişsiz kullanıcıya (anon) açık DOĞMASIN (AYRI ONAYLA; canlıya uygulanmadı)
-- =====================================================================================================================
--  Bulgu (14-guncel-denetim, canlı, 16 Kasım): `postgres` rolünün fonksiyonlar için GLOBAL varsayılan yetki kaydı YOK → PostgreSQL'in
--  yerleşik varsayılanı geçerli: yeni fonksiyona PUBLIC EXECUTE; anon da PUBLIC üzerinden çalıştırır. Bugün anon'un çalıştırabildiği
--  fonksiyonlar tam olarak 9 (8 site + yonetici_mi) — yani ŞU AN açık bir fonksiyon yok; risk, bundan sonra oluşturulacak
--  fonksiyonlarda (ör. bir SQL dosyasıyla yeni sunucu işlemi) — SECURITY DEFINER olanı girişsiz çağrılabilir doğar.
--  (4 Kasım doğrulamasındaki "yeni fonksiyonlar girişsize kapalı" kontrolü yalnız şemaya özgü anon kaydına bakıyordu — yanıltıcıydı.)
--
--  DEĞİŞİKLİK (yalnız varsayılan; VAR OLAN hiçbir fonksiyonun yetkisi değişmez):
--    postgres'in global varsayılanı: PUBLIC'ten EXECUTE alınır, authenticated ve service_role'e EXECUTE verilir.
--  Neden authenticated + service_role: depodaki SQL dosyalarının çoğu yeni fonksiyona açık izin VERMİYOR (PUBLIC'e güveniyor). ERP
--  (giriş yapmış) ve Edge fonksiyonları (service_role) yeni fonksiyonları yine çalıştırabilsin; yalnız anon'a kapanır. Site
--  fonksiyonları (site-portal.sql) anon'a İZNİ AÇIKÇA veriyor — etkilenmez. Tetikleyici fonksiyonlarında EXECUTE denetlenmez.
--  supabase_admin'e DOKUNULMAZ: Supabase platform rolü (eklenti / sistem nesneleri); postgres onun varsayılanını değiştiremez.
--  ERP etkisi: yok. Site etkisi: yok (mevcut 8 site fonksiyonunun yetkisi aynı kalır).
--  Geri alma: 16-varsayilan-yetki-geri-al.sql. Doğrulama: dosyanın sonu (ve 14'ün 8–9. satırları: postgres "global var, PUBLIC false").
-- =====================================================================================================================
begin;
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres grant execute on functions to authenticated, service_role;
commit;

-- DOĞRULAMA (salt-okur): postgres global kaydı var; PUBLIC ve anon yok; authenticated ve service_role var.
select (select count(*) from pg_default_acl d where d.defaclrole = 'postgres'::regrole and d.defaclnamespace = 0 and d.defaclobjtype = 'f') = 1 as global_kayit_var,
       coalesce((select bool_or(a.grantee = 0) from pg_default_acl d, aclexplode(d.defaclacl) a
                 where d.defaclrole = 'postgres'::regrole and d.defaclnamespace = 0 and d.defaclobjtype = 'f' and a.privilege_type = 'EXECUTE'), false) as public_var,
       coalesce((select bool_or(a.grantee = 'anon'::regrole) from pg_default_acl d, aclexplode(d.defaclacl) a
                 where d.defaclrole = 'postgres'::regrole and d.defaclnamespace = 0 and d.defaclobjtype = 'f' and a.privilege_type = 'EXECUTE'), false) as anon_var,
       coalesce((select bool_or(a.grantee = 'authenticated'::regrole) from pg_default_acl d, aclexplode(d.defaclacl) a
                 where d.defaclrole = 'postgres'::regrole and d.defaclnamespace = 0 and d.defaclobjtype = 'f' and a.privilege_type = 'EXECUTE'), false) as authenticated_var,
       coalesce((select bool_or(a.grantee = 'service_role'::regrole) from pg_default_acl d, aclexplode(d.defaclacl) a
                 where d.defaclrole = 'postgres'::regrole and d.defaclnamespace = 0 and d.defaclobjtype = 'f' and a.privilege_type = 'EXECUTE'), false) as service_role_var,
       (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute')) as anon_fonksiyon_sayisi_9_kalmali;
-- Beklenen: true · false · false · true · true · 9
