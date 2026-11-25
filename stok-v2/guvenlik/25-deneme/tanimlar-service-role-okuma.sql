-- =====================================================================================================================
--  25-deneme/tanimlar-service-role-okuma.sql — YALNIZ DENEME PROJESİ (drtmnovafswzcmpacubl). YAZAR: tek yetki satırı, veri değil.
--  Neden: teşhis (teshis-tanimlar-yetki-salt-okur.sql, 25 Kasım) service_role'ün tanimlar'ı OKUYAMADIĞINI gösterdi
--  (yetki listesi yalnız postgres + authenticated). `kullanici` sunucu fonksiyonu çağıranın Yönetici olup olmadığını bu tablodan
--  okur; okuyamayınca hiçbir kullanıcı açılamaz. Yalnız SELECT verilir: fonksiyon tanimlar'a YAZMAZ (tek erişimi satır 101, select).
--  Etkisi: service_role anahtarı yalnız Supabase sunucusunda (fonksiyon ortamı) durur, istemciye / HTML'e girmez; anon ve
--  authenticated'ın yetkisi DEĞİŞMEZ (son sütun bunu ölçer). Geri alma: revoke select on public.tanimlar from service_role;
--  Kullanıcı onayı: 25 Kasım, "yalnız deneme projesinde service_role'e public.tanimlar için SELECT; diğer yetkilere dokunma".
-- =====================================================================================================================
grant select on public.tanimlar to service_role;
select has_table_privilege('service_role', 'public.tanimlar', 'select') as service_role_okur,
       has_table_privilege('anon', 'public.tanimlar', 'select') as anon_okur,
       (select string_agg(a::text, ' ') from pg_class c, unnest(c.relacl) a where c.oid = 'public.tanimlar'::regclass) as yetki_listesi,
       exists (select 1 from pg_class c, unnest(c.relacl) a where c.oid = 'public.tanimlar'::regclass and a::text = 'authenticated=arwdxt/postgres') as authenticated_ayni;
