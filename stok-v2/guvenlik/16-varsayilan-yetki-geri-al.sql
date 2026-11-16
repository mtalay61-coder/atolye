-- =====================================================================================================================
--  16-varsayilan-yetki-geri-al.sql — 16-varsayilan-yetki-kapat.sql'i geri alır: postgres'in fonksiyon varsayılanları YEDEKTEN BİREBİR
-- =====================================================================================================================
--  Kaynak: `guvenlik.varsayilan_yetki_yedek` (kapat dosyası değişiklikten önce yazar). Yedek yoksa HATA — hiçbir şey değişmez.
--
--  Yöntem (yalnız GLOBAL kayıt; 16 yalnız onu değiştirdi):
--   1) Global kaydı yerleşik hâle indir: kayıtta sahip ve PUBLIC dışındaki her alıcıdan EXECUTE alınır, PUBLIC'e ve sahibe verilir →
--      PostgreSQL yerleşikle aynı olan kaydı kendiliğinden siler.
--   2) Yedekte global kayıt VARDIYSA onun her satırını (alıcı, WITH GRANT OPTION dahil) yeniden kurar; yedekte PUBLIC / sahip yoksa
--      onlardan alır. Yedekte global kayıt YOKSA (16 Kasım canlı durumu) 1. adım zaten önceki hâldir.
--   0) ÖNCE (hiçbir şeye dokunmadan): canlıdaki BÜTÜN kayıtlar (GLOBAL + her şema; alıcı · aktarma hakkı · kayıt sayısı) kapat
--      dosyasının uygulama sonrası kaydettiği 'sonra' ile birebir aynı mı? Değilse (arada biri global ya da şemaya özgü bir varsayılanı
--      değiştirmiş) geri alma DURUR ve farkı yazar — başkasının değişikliğini sessizce ezmemek için. Hiçbir şey değişmez.
--   4) Doğrulama: postgres'in BÜTÜN fonksiyon varsayılan kayıtları (global + şema; alıcı · yetki · aktarma hakkı) yedekle BİREBİR aynı
--      olmalı; değilse HATA ve işlem geri alınır. Ayrıca public şemasında gerçek bir deneme fonksiyonu açılıp yetkisi gösterilir, silinir.
--   Başarılı olunca yedek satırları SİLİNİR (durum yedekteki hâle döndü; kapat yeniden çalıştırılırsa yeni yedek alır).
--  Var olan fonksiyonların yetkisi değişmez.
--  Çalıştırma: Supabase › SQL Editor (postgres olarak) › bu dosyanın TAMAMI › Run.
--  Beklenen: "doğrulama: yedekle birebir aynı" → true · tamam; "sınama (public)" → anon ✓ (önceki hâl: yerleşik PUBLIC).
-- =====================================================================================================================
begin;

do $$
declare
  rol oid := 'postgres'::regrole;
  a record;
  yedek_global aclitem[];
  yedek_global_var boolean;
  fark text;
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  -- İki ayrı koşul: tablo yokken ikinci sorgu "relation does not exist" ile anlaşılmaz bir hata verirdi.
  if to_regclass('guvenlik.varsayilan_yetki_yedek') is null then
    raise exception 'Yedek tablosu yok (guvenlik.varsayilan_yetki_yedek) — 16-varsayilan-yetki-kapat.sql hiç çalışmamış. Hiçbir şey değişmedi.';
  end if;
  if not exists (select 1 from guvenlik.varsayilan_yetki_yedek where tur = 'isaret') then
    raise exception 'Yedek bulunamadı (guvenlik.varsayilan_yetki_yedek) — 16-varsayilan-yetki-kapat.sql çalışmamış ya da geri alma zaten yapılmış. Hiçbir şey değişmedi.';
  end if;

  -- 0) Canlı durum = kapat sonrası kaydedilen durum mu? (global + şema; önce bakılır: farklıysa hiçbir şeye dokunmadan durulur)
  if not exists (select 1 from guvenlik.varsayilan_yetki_yedek where tur = 'sonra') then
    raise exception 'Uygulama sonrası durum kaydı (sonra) yok — kapat dosyasının eski bir sürümüyle mi uygulandı? Hiçbir şey değişmedi.';
  end if;
  select string_agg(x, '; ') into fark from (
    (select coalesce(n.nspname::text, '(global)') || ' ' || e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable as x
       from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace, aclexplode(d.defaclacl) e
      where d.defaclrole = rol and d.defaclobjtype = 'f'
     except
     select coalesce(y.sema, '(global)') || ' ' || e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable
       from guvenlik.varsayilan_yetki_yedek y, aclexplode(y.acl) e where y.tur = 'sonra')
    union all
    (select coalesce(y.sema, '(global)') || ' ' || e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable || ' (16 sonrası vardı, şimdi yok)'
       from guvenlik.varsayilan_yetki_yedek y, aclexplode(y.acl) e where y.tur = 'sonra'
     except
     select coalesce(n.nspname::text, '(global)') || ' ' || e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable || ' (16 sonrası vardı, şimdi yok)'
       from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace, aclexplode(d.defaclacl) e
      where d.defaclrole = rol and d.defaclobjtype = 'f')
  ) z;
  if fark is null and (select count(*) from pg_default_acl d where d.defaclrole = rol and d.defaclobjtype = 'f')
                      <> (select count(*) from guvenlik.varsayilan_yetki_yedek where tur = 'sonra') then
    fark := 'kayıt sayısı farklı';
  end if;
  if fark is not null then
    raise exception 'Varsayılan yetkiler 16 uygulandıktan sonra değişmiş (global ya da şema): %. Geri alma durdu, hiçbir şey değişmedi.', fark;
  end if;

  -- 1) Global kaydı yerleşik hâle indir.
  for a in
    select e.grantee from pg_default_acl d, aclexplode(d.defaclacl) e
    where d.defaclrole = rol and d.defaclobjtype = 'f' and d.defaclnamespace = 0 and e.grantee not in (0, rol)
  loop
    execute format('alter default privileges for role postgres revoke execute on functions from %I', a.grantee::regrole::text);
  end loop;
  execute 'alter default privileges for role postgres grant execute on functions to public';
  execute 'alter default privileges for role postgres grant execute on functions to postgres';

  -- 2) Yedekte global kayıt varsa birebir kur.
  select acl, true into yedek_global, yedek_global_var from guvenlik.varsayilan_yetki_yedek where tur = 'kayit' and sema is null;
  if coalesce(yedek_global_var, false) then
    for a in select e.grantee, e.is_grantable from aclexplode(yedek_global) e where e.privilege_type = 'EXECUTE' and e.grantee <> rol loop
      execute format('alter default privileges for role postgres grant execute on functions to %s%s',
                     case when a.grantee = 0 then 'public' else quote_ident(a.grantee::regrole::text) end,
                     case when a.is_grantable then ' with grant option' else '' end);
    end loop;
    if not exists (select 1 from aclexplode(yedek_global) e where e.grantee = 0) then
      execute 'alter default privileges for role postgres revoke execute on functions from public';
    end if;
    if not exists (select 1 from aclexplode(yedek_global) e where e.grantee = rol) then
      execute 'alter default privileges for role postgres revoke execute on functions from postgres';
    end if;
  end if;

  -- 4) Doğrulama: bütün kayıtlar (global + şema) yedekle birebir.
  select string_agg(x, '; ') into fark from (
    (select coalesce(n.nspname::text, '(global)') || ' ' || e.grantee::text || ':' || e.privilege_type || ':' || e.is_grantable as x
       from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace, aclexplode(d.defaclacl) e
      where d.defaclrole = rol and d.defaclobjtype = 'f'
     except
     select coalesce(y.sema, '(global)') || ' ' || e.grantee::text || ':' || e.privilege_type || ':' || e.is_grantable
       from guvenlik.varsayilan_yetki_yedek y, aclexplode(y.acl) e where y.tur = 'kayit')
    union all
    (select coalesce(y.sema, '(global)') || ' ' || e.grantee::text || ':' || e.privilege_type || ':' || e.is_grantable
       from guvenlik.varsayilan_yetki_yedek y, aclexplode(y.acl) e where y.tur = 'kayit'
     except
     select coalesce(n.nspname::text, '(global)') || ' ' || e.grantee::text || ':' || e.privilege_type || ':' || e.is_grantable
       from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace, aclexplode(d.defaclacl) e
      where d.defaclrole = rol and d.defaclobjtype = 'f')
  ) z;
  if fark is not null then
    raise exception 'Geri alma sonrası yedekle birebir değil: %. İşlem geri alındı, hiçbir şey değişmedi.', fark;
  end if;
  -- Kayıt SAYISI da aynı olmalı (ör. yedekte global kayıt yokken şimdi boş bir kayıt kalmasın).
  if (select count(*) from pg_default_acl d where d.defaclrole = rol and d.defaclobjtype = 'f')
     <> (select count(*) from guvenlik.varsayilan_yetki_yedek where tur = 'kayit') then
    raise exception 'Geri alma sonrası kayıt sayısı yedekten farklı. İşlem geri alındı, hiçbir şey değişmedi.';
  end if;
end $$;

-- Sınama: public şemasında gerçek yeni fonksiyonun yetkisi (önceki hâlde anon PUBLIC üzerinden çalıştırabiliyordu).
create function public.yetki_sinama_16() returns integer language sql as 'select 1';
create temp table yetki_sinama_16 on commit drop as
select has_function_privilege('anon', 'public.yetki_sinama_16()', 'execute') as anon_x,
       has_function_privilege('authenticated', 'public.yetki_sinama_16()', 'execute') as auth_x,
       has_function_privilege('service_role', 'public.yetki_sinama_16()', 'execute') as servis_x;
drop function public.yetki_sinama_16();

create temp table yetki_sonuc_16 on commit drop as
select 10 as sira, 'yedek' as adim, coalesce(sema, '(global)') as kayit, acl::text as deger, 'bilgi' as durum
from guvenlik.varsayilan_yetki_yedek where tur = 'kayit'
union all
select 11, 'yedek', 'kayıt sayısı', count(*)::text, 'bilgi' from guvenlik.varsayilan_yetki_yedek where tur = 'kayit'
union all
select 20, 'şimdi', case when d.defaclnamespace = 0 then '(global)' else n.nspname::text end, d.defaclacl::text, 'bilgi'
from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
where d.defaclrole = 'postgres'::regrole and d.defaclobjtype = 'f'
union all
select 30, 'doğrulama', 'yedekle birebir aynı (global + şema; alıcı · yetki · aktarma hakkı · kayıt sayısı)', 'true', 'tamam'
union all
select 40, 'sınama (public)', 'yeni fonksiyon (gerçek deneme, silindi)',
       'anon ' || case when anon_x then '✓' else '✗' end || ' · authenticated ' || case when auth_x then '✓' else '✗' end ||
       ' · service_role ' || case when servis_x then '✓' else '✗' end, 'bilgi'
from yetki_sinama_16;

delete from guvenlik.varsayilan_yetki_yedek;

select adim, kayit, deger, durum from yetki_sonuc_16 order by sira, kayit;
commit;
