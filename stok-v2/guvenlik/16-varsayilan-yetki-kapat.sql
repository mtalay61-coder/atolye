-- =====================================================================================================================
--  16-varsayilan-yetki-kapat.sql — YENİ fonksiyonlar girişsiz kullanıcıya (anon) açık DOĞMASIN (AYRI ONAYLA; canlıya uygulanmadı)
-- =====================================================================================================================
--  Bulgu (14-guncel-denetim, canlı, 16 Kasım): `postgres` rolünün fonksiyonlar için GLOBAL varsayılan yetki kaydı YOK → PostgreSQL'in
--  yerleşik varsayılanı geçerli: yeni fonksiyona PUBLIC EXECUTE; anon da PUBLIC üzerinden çalıştırır. public şemasına özgü kayıtta
--  PUBLIC / anon yok (2-sikilastir anon'u oradan almıştı) — ama şemaya özgü kayıt yalnız EKLER, global PUBLIC'i kapatamaz. Bugün anon'un
--  çalıştırabildiği fonksiyonlar tam 9 (8 site + yonetici_mi): ŞU AN açık fonksiyon yok; risk bundan sonra oluşturulacak fonksiyonda.
--  (4 Kasım doğrulamasındaki "yeni fonksiyonlar girişsize kapalı" kontrolü yalnız şemaya özgü kayda bakıyordu — yanıltıcıydı.)
--
--  YENİ FONKSİYONUN YETKİSİ = global kayıt (yoksa yerleşik: sahip + PUBLIC) ∪ o şemaya özgü kayıt. Bu dosya ikisini BİRLİKTE değerlendirir:
--  önce / sonra tablosu her şema için birleşik sonucu gösterir ve public şemasında GERÇEK bir deneme fonksiyonuyla (işlem içinde açılıp
--  silinir) sınar. Sınama tutmazsa (anon çalıştırabiliyor ya da authenticated / service_role çalıştıramıyor) HATA verir ve işlem
--  TAMAMEN geri alınır — hiçbir şey değişmez.
--
--  DEĞİŞİKLİK (yalnız postgres'in GLOBAL fonksiyon varsayılanı; VAR OLAN hiçbir fonksiyonun yetkisi, şemaya özgü kayıtlar ve
--  supabase_admin'in varsayılanları değişmez):
--    revoke execute on functions from public  +  grant execute on functions to authenticated, service_role
--  Neden authenticated + service_role: depodaki SQL dosyalarının çoğu yeni fonksiyona açık izin VERMİYOR (PUBLIC'e güveniyor). ERP
--  (giriş yapmış) ve Edge fonksiyonları (service_role) yeni fonksiyonları yine çalıştırabilsin; yalnız anon'a kapanır. Site
--  fonksiyonları (site-portal.sql) anon'a İZNİ AÇIKÇA veriyor — etkilenmez. Tetikleyici fonksiyonlarında EXECUTE denetlenmez.
--  supabase_admin'e DOKUNULMAZ: Supabase platform rolü (eklenti / sistem nesneleri); postgres onun varsayılanını değiştiremez.
--
--  YEDEK: değişiklikten ÖNCE postgres'in bütün fonksiyon varsayılan kayıtları (global + her şema) `guvenlik.varsayilan_yetki_yedek`
--  tablosuna yazılır. Yedek zaten varsa (dosya ikinci kez çalıştırılırsa) ÜZERİNE YAZILMAZ — geri alma her zaman ilk hâle döner.
--  Geri alma: 16-varsayilan-yetki-geri-al.sql (yedekten birebir kurar ve birebir aynı olduğunu doğrular).
--  Çalıştırma: Supabase › SQL Editor (postgres olarak) › bu dosyanın TAMAMI › Run. Sonuç tablosu: önce / sonra / birleşik / sınama.
--  Beklenen son satırlar: "sınama (public): yeni fonksiyon" → anon ✗ · authenticated ✓ · service_role ✓ · durum tamam.
-- =====================================================================================================================
begin;

do $$
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
end $$;

create schema if not exists guvenlik;
create table if not exists guvenlik.varsayilan_yetki_yedek (
  alindi timestamptz not null default now(),
  tur    text not null,          -- 'isaret' (yedek alındı; kayıt olmasa da) | 'kayit'
  sema   text,                   -- null = global kayıt
  acl    aclitem[]
);
revoke all on guvenlik.varsayilan_yetki_yedek from public, anon, authenticated;

insert into guvenlik.varsayilan_yetki_yedek (tur, sema, acl)
select 'isaret', null, null
where not exists (select 1 from guvenlik.varsayilan_yetki_yedek where tur = 'isaret')
union all
select 'kayit', case when d.defaclnamespace = 0 then null else n.nspname::text end, d.defaclacl
from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
where d.defaclrole = 'postgres'::regrole and d.defaclobjtype = 'f'
  and not exists (select 1 from guvenlik.varsayilan_yetki_yedek where tur = 'isaret');

alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres grant execute on functions to authenticated, service_role;

-- Sınama: public şemasında postgres'in açtığı GERÇEK yeni fonksiyon (global + şemaya özgü kayıt birlikte uygulanır).
create function public.yetki_sinama_16() returns integer language sql as 'select 1';
create temp table yetki_sinama_16 on commit drop as
select has_function_privilege('anon', 'public.yetki_sinama_16()', 'execute') as anon_x,
       has_function_privilege('authenticated', 'public.yetki_sinama_16()', 'execute') as auth_x,
       has_function_privilege('service_role', 'public.yetki_sinama_16()', 'execute') as servis_x,
       (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname <> 'yetki_sinama_16'
          and has_function_privilege('anon', p.oid, 'execute')) as anon_sayisi;
drop function public.yetki_sinama_16();

do $$
declare s record;
begin
  select * into s from yetki_sinama_16;
  if s.anon_x or not s.auth_x or not s.servis_x then
    raise exception 'Sınama tutmadı (anon %, authenticated %, service_role %) — işlem geri alındı, hiçbir şey değişmedi.', s.anon_x, s.auth_x, s.servis_x;
  end if;
end $$;

-- ---------------- Sonuç: önce (yedek) / sonra / birleşik / sınama ----------------
with
r as (select 'postgres'::regrole::oid as rol),
kayit_once as (select coalesce(sema, '(global)') as yer, acl from guvenlik.varsayilan_yetki_yedek where tur = 'kayit'),
kayit_sonra as (
  select case when d.defaclnamespace = 0 then '(global)' else n.nspname::text end as yer, d.defaclacl as acl
  from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace, r
  where d.defaclrole = r.rol and d.defaclobjtype = 'f'
),
-- birleşik: yeni fonksiyonun alacağı yetki = global (yoksa yerleşik acldefault) ∪ şemaya özgü
semalar as (select 'public'::text as sema union select yer from kayit_sonra where yer <> '(global)' union select yer from kayit_once where yer <> '(global)'),
birlesik as (
  select s.sema, k.zaman,
         coalesce(k.global_acl, acldefault('f', (select rol from r))) || coalesce(k.sema_acl, '{}'::aclitem[]) as acl
  from semalar s
  cross join lateral (
    select 'önce' as zaman,
           (select acl from kayit_once where yer = '(global)') as global_acl,
           (select acl from kayit_once where yer = s.sema) as sema_acl
    union all
    select 'sonra',
           (select acl from kayit_sonra where yer = '(global)'),
           (select acl from kayit_sonra where yer = s.sema)
  ) k
),
yetkili(sema, zaman, anon_x, auth_x, servis_x) as (
  select b.sema, b.zaman,
         exists (select 1 from aclexplode(b.acl) a where a.privilege_type = 'EXECUTE' and a.grantee in (0, 'anon'::regrole)),
         exists (select 1 from aclexplode(b.acl) a where a.privilege_type = 'EXECUTE' and a.grantee in (0, 'authenticated'::regrole)),
         exists (select 1 from aclexplode(b.acl) a where a.privilege_type = 'EXECUTE' and a.grantee in (0, 'service_role'::regrole))
  from birlesik b
),
satirlar(sira, adim, kayit, deger, durum) as (
  select 10, 'önce (yedek)', yer, acl::text, 'bilgi' from kayit_once
  union all
  select 11, 'önce (yedek)', 'kayıt sayısı', count(*)::text, 'bilgi' from kayit_once
  union all
  select 20, 'sonra', yer, acl::text, 'bilgi' from kayit_sonra
  union all
  select 30 + case zaman when 'önce' then 0 else 1 end, 'birleşik (' || zaman || ')', sema || ': yeni fonksiyonu çalıştırabilen',
         'anon ' || case when anon_x then '✓' else '✗' end || ' · authenticated ' || case when auth_x then '✓' else '✗' end ||
         ' · service_role ' || case when servis_x then '✓' else '✗' end,
         case when zaman = 'önce' then 'bilgi' when not anon_x and auth_x and servis_x then 'tamam' else 'FARKLI' end
  from yetkili
  union all
  select 40, 'sınama (public)', 'yeni fonksiyon (gerçek deneme, silindi)',
         'anon ' || case when anon_x then '✓' else '✗' end || ' · authenticated ' || case when auth_x then '✓' else '✗' end ||
         ' · service_role ' || case when servis_x then '✓' else '✗' end,
         case when not anon_x and auth_x and servis_x then 'tamam' else 'FARKLI' end
  from yetki_sinama_16
  union all
  select 41, 'sınama (public)', 'anon''un çalıştırabildiği VAR OLAN fonksiyon sayısı (değişmemeli: 9)', anon_sayisi::text,
         case when anon_sayisi = 9 then 'tamam' else 'bilgi' end
  from yetki_sinama_16
)
select adim, kayit, deger, durum from satirlar order by sira, kayit;

commit;
