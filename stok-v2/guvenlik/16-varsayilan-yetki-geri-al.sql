-- =====================================================================================================================
--  16-varsayilan-yetki-geri-al.sql — 16-varsayilan-yetki-kapat.sql'i geri alır: postgres'in fonksiyon varsayılanları YEDEKTEN BİREBİR
-- =====================================================================================================================
--  Kaynak: `guvenlik.varsayilan_yetki_yedek` (kapat dosyası değişiklikten önce yazar). Yedek yoksa HATA — hiçbir şey değişmez.
--
--  Yöntem (yalnız GLOBAL kayıt; 16 yalnız onu değiştirdi):
--   0) KORUMA: şimdiki global kayıt, yedeğe 16'nın iki komutu uygulanınca çıkacak hâlle (benzetimle birebir üretilir, iz bırakmaz) aynı
--      olmalı. 16'dan SONRA global varsayılan başka bir işlemle değiştirildiyse geri alma DURUR ve HATA verir — hiçbir şey değişmez,
--      beklenen / şimdiki hâl ve fark hata iletisinde yazılır. (3. adımdaki şema denetimi de bu adımdan önce yapılır.)
--   1) Global kaydı yerleşik hâle indir: kayıtta sahip ve PUBLIC dışındaki her alıcıdan EXECUTE alınır, PUBLIC'e ve sahibe verilir →
--      PostgreSQL yerleşikle aynı olan kaydı kendiliğinden siler.
--   2) Yedekte global kayıt VARDIYSA onun her satırını (alıcı, WITH GRANT OPTION dahil) yeniden kurar; yedekte PUBLIC / sahip yoksa
--      onlardan alır. Yedekte global kayıt YOKSA (16 Kasım canlı durumu) 1. adım zaten önceki hâldir.
--   3) Şemaya özgü kayıtlar: 16 onlara dokunmadı; yedekle karşılaştırılır. Farklıysa (16 dışında biri değiştirmiş) geri alma DURUR ve
--      HATA verir — başkasının değişikliğini sessizce ezmemek için. Hiçbir şey değişmez; fark sonuçta yazılır.
--   4) Doğrulama: postgres'in BÜTÜN fonksiyon varsayılan kayıtları (global + şema; alıcı · yetki · aktarma hakkı) yedekle BİREBİR aynı
--      olmalı; değilse HATA ve işlem geri alınır. Ayrıca public şemasında gerçek bir deneme fonksiyonu açılıp yetkisi gösterilir, silinir.
--   Başarılı olunca yedek satırları SİLİNİR (durum yedekteki hâle döndü; kapat yeniden çalıştırılırsa yeni yedek alır).
--  EDITOR UYUMU: dosyada dört ifade var — `begin;`, tek DO (koruma + geri kurma + doğrulama + sınama + sonuç kaydı + yedeğin
--  silinmesi; biri tutmazsa DO'nun TAMAMI geri alınır), sonuç sorgusu (select … guvenlik.yetki_geri_sonuc_16) ve `commit;`. Bütün iş
--  tek DO içinde olduğu için Editor ifadeleri ayrı isteklerle gönderse de (o zaman begin / commit bir şeyi birlikte tutmaz) sonuç
--  aynıdır. Geçici tablo yok.
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
  beklenen_global aclitem[];
  beklenen_global_var boolean;
  simdiki_global aclitem[];
  fark text;
  v_anon boolean;
  v_auth boolean;
  v_servis boolean;
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

  -- 3) Şemaya özgü kayıtlar yedekle aynı mı? (önce bakılır: farklıysa hiçbir şeye dokunmadan durulur)
  select string_agg(x, '; ') into fark from (
    (select coalesce(n.nspname::text, '?') || ' ' || e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable as x
       from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace, aclexplode(d.defaclacl) e
      where d.defaclrole = rol and d.defaclobjtype = 'f' and d.defaclnamespace <> 0
     except
     select y.sema || ' ' || e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable
       from guvenlik.varsayilan_yetki_yedek y, aclexplode(y.acl) e where y.tur = 'kayit' and y.sema is not null)
    union all
    (select y.sema || ' ' || e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable || ' (yedekte var, şimdi yok)'
       from guvenlik.varsayilan_yetki_yedek y, aclexplode(y.acl) e where y.tur = 'kayit' and y.sema is not null
     except
     select n.nspname::text || ' ' || e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable || ' (yedekte var, şimdi yok)'
       from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace, aclexplode(d.defaclacl) e
      where d.defaclrole = rol and d.defaclobjtype = 'f' and d.defaclnamespace <> 0)
  ) z;
  if fark is not null then
    raise exception 'Şemaya özgü varsayılan yetkiler yedekten farklı (16 bunlara dokunmaz; başka bir değişiklik olmuş): %. Geri alma durdu, hiçbir şey değişmedi.', fark;
  end if;

  -- 0) KORUMA: global kayıt hâlâ 16'nın bıraktığı hâlde mi? 16 uygulandıktan sonra global varsayılan başka bir işlemle değiştirildiyse
  --    geri alma o değişikliği sessizce ezerdi → hiçbir şeye dokunmadan DURUR. Beklenen hâl tahmin edilmez, BİREBİR üretilir: alt blokta
  --    global kayıt yedekteki hâle kurulur, 16'nın iki komutu uygulanır, sonuç okunur ve alt blok kasıtlı hatayla geri sarılır
  --    (değişkenler korunur, veritabanında iz kalmaz). Kapat ikinci kez çalıştırıldıysa sonuç aynıdır (iki komut da tekrarlanabilir).
  beklenen_global_var := false;
  begin
    for a in
      select e.grantee from pg_default_acl d, aclexplode(d.defaclacl) e
      where d.defaclrole = rol and d.defaclobjtype = 'f' and d.defaclnamespace = 0 and e.grantee not in (0, rol)
    loop
      execute format('alter default privileges for role postgres revoke execute on functions from %I', a.grantee::regrole::text);
    end loop;
    execute 'alter default privileges for role postgres grant execute on functions to public';
    execute 'alter default privileges for role postgres grant execute on functions to postgres';
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
    -- 16-varsayilan-yetki-kapat.sql ile AYNI iki komut (orada değişirse burada da değişmeli):
    execute 'alter default privileges for role postgres revoke execute on functions from public';
    execute 'alter default privileges for role postgres grant execute on functions to authenticated, service_role';
    select d.defaclacl, true into beklenen_global, beklenen_global_var
      from pg_default_acl d where d.defaclrole = rol and d.defaclobjtype = 'f' and d.defaclnamespace = 0;
    raise exception using errcode = 'P0016', message = 'benzetim geri sarılıyor';
  exception when sqlstate 'P0016' then
    null;  -- alt bloktaki bütün değişiklikler geri alındı
  end;
  yedek_global := null; yedek_global_var := null;

  select d.defaclacl into simdiki_global
    from pg_default_acl d where d.defaclrole = rol and d.defaclobjtype = 'f' and d.defaclnamespace = 0;
  select string_agg(x, '; ') into fark from (
    (select e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable as x from aclexplode(simdiki_global) e
     except
     select e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable from aclexplode(beklenen_global) e)
    union all
    (select e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable || ' (beklenen, şimdi yok)' from aclexplode(beklenen_global) e
     except
     select e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable || ' (beklenen, şimdi yok)' from aclexplode(simdiki_global) e)
  ) z;
  if fark is not null or (simdiki_global is null) <> (not beklenen_global_var) then
    raise exception 'Global varsayılan yetkiler 16 uygulandıktan sonra başka bir işlemle değiştirilmiş (beklenen: %, şimdi: %; fark: %). Geri alma durdu, hiçbir şey değişmedi.',
      coalesce(beklenen_global::text, '(kayıt yok)'), coalesce(simdiki_global::text, '(kayıt yok)'), coalesce(fark, 'kayıt var/yok');
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

  -- 5) Sınama + sonuç + yedeğin silinmesi AYNI ifadede (Editor ifadeleri ayrı gönderse de geri alma ya hep ya hiç; geçici tablo yok).
  --    Sınama: public şemasında gerçek yeni fonksiyonun yetkisi (önceki hâlde anon PUBLIC üzerinden çalıştırabiliyordu).
  execute 'create function public.yetki_sinama_16() returns integer language sql as ''select 1''';
  v_anon   := has_function_privilege('anon', 'public.yetki_sinama_16()', 'execute');
  v_auth   := has_function_privilege('authenticated', 'public.yetki_sinama_16()', 'execute');
  v_servis := has_function_privilege('service_role', 'public.yetki_sinama_16()', 'execute');
  execute 'drop function public.yetki_sinama_16()';

  create table if not exists guvenlik.yetki_geri_sonuc_16 (sira integer, adim text, kayit text, deger text, durum text,
                                                           zaman timestamptz not null default now());
  revoke all on guvenlik.yetki_geri_sonuc_16 from public, anon, authenticated;
  delete from guvenlik.yetki_geri_sonuc_16;
  insert into guvenlik.yetki_geri_sonuc_16 (sira, adim, kayit, deger, durum)
  select 10, 'yedek', coalesce(y.sema, '(global)'), y.acl::text, 'bilgi' from guvenlik.varsayilan_yetki_yedek y where y.tur = 'kayit'
  union all
  select 11, 'yedek', 'kayıt sayısı', count(*)::text, 'bilgi' from guvenlik.varsayilan_yetki_yedek y where y.tur = 'kayit'
  union all
  select 20, 'şimdi', case when d.defaclnamespace = 0 then '(global)' else n.nspname::text end, d.defaclacl::text, 'bilgi'
  from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
  where d.defaclrole = rol and d.defaclobjtype = 'f'
  union all
  select 30, 'doğrulama', 'yedekle birebir aynı (global + şema; alıcı · yetki · aktarma hakkı · kayıt sayısı)', 'true', 'tamam'
  union all
  select 40, 'sınama (public)', 'yeni fonksiyon (gerçek deneme, silindi)',
         'anon ' || case when v_anon then '✓' else '✗' end || ' · authenticated ' || case when v_auth then '✓' else '✗' end ||
         ' · service_role ' || case when v_servis then '✓' else '✗' end, 'bilgi';

  delete from guvenlik.varsayilan_yetki_yedek;
end $$;

-- Sonuç (bir önceki ifadenin yazdığı kalıcı tablo; anon / authenticated erişemez).
select adim, kayit, deger, durum from guvenlik.yetki_geri_sonuc_16 order by sira, kayit;
commit;
