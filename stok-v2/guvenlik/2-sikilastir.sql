-- =====================================================================================================================
--  GÜVENLİK SIKILAŞTIRMA (madde 4 + 5) — 2-sikilastir.sql
--  DURUM: LİSTELER CANLIDAN (3 Kasım, 1-liste-salt-okur.sql çıktısı, stok-v2/guvenlik/canli/). Önceki taslak yereldi; canlı çıktı
--  ile değiştirildi (liste-uret.js). Çalıştırma anında canlı veritabanı listelerle birebir uyuşmazsa bu dosya HİÇBİR ŞEY DEĞİŞTİRMEDEN
--  durur ve farkı yazar (aşağıda "KİLİT"). Yani yanlış listeyle çalıştırılsa bile yetki kaldırmaz.
--
--  NE YAPAR (tek işlem; bir adım düşerse hepsi geri alınır):
--   1) Girişsiz kullanıcının (anon) çalıştırabildiği fonksiyonlardan, sitenin kullandığı 8 fonksiyon ve storage politikasının çağırdığı yonetici_mi (ACIK_BIRAK) DIŞINDAKİLERİN
--      çalıştırma yetkisi anon'dan ve PUBLIC'ten (herkes) alınır. Önce giriş yapmış kullanıcının (authenticated) ve sunucu
--      fonksiyonlarının (service_role) o fonksiyonu bugün çalıştırıp çalıştıramadığı yazılır; çalıştırabiliyorsa yetki ona AÇIKÇA
--      verilir — PUBLIC'in alınması onları etkilemez. Tetikleyici fonksiyonları tablo yazımında yetki denetlemeden çalışır (yerelde
--      sınandı); doğrudan çağrılmaları kapanır.
--   2) search_path'i sabit olmayan fonksiyonlara (YOL) `public, extensions, pg_temp` yazılır. Bu, uygulamanın (PostgREST) bugün
--      kullandığı yolun aynısı (public, extensions) + geçici şema EN SONA (başkasının geçici nesnesi öne geçemesin).
--   3) Yeni kurulacak fonksiyonlar anon'a kendiliğinden açılmasın: bu rolün public şemasındaki varsayılan yetkilerinden anon
--      çıkarılır (varsa). PUBLIC'in genel varsayılanına DOKUNULMAZ (yeni fonksiyon giriş yapmış kullanıcıya kapanmasın).
--   4) Her değişikliğin öncesi guvenlik.yedek tablosuna yazılır; 3-geri-al.sql bu tablodan BİREBİR geri kurar.
--   5) Sonda doğrulanır: ACIK_BIRAK dışında anon'un çalıştırabildiği fonksiyon kalmadı; authenticated ve service_role'ün
--      çalıştırabildikleri DEĞİŞMEDİ; YOL'daki her fonksiyonun yolu sabit. Biri tutmazsa işlem geri alınır.
--  İkinci kez çalıştırmak zararsız: uygulanmışsa "zaten uygulanmış" der ve çıkar.
--  Fiş kuralları, sürüm kapısı ve sızmış parola denetimi bu dosyanın KAPSAMINDA DEĞİL.
-- =====================================================================================================================

-- Yedek AYRI şemada: API (PostgREST) yalnız public'i gösterir; rls-kimlik.sql yeniden çalışınca public'teki her tabloyu giriş
-- yapmış kullanıcıya açıyor — yedek public'te olsaydı açılırdı.
create schema if not exists guvenlik;
revoke all on schema guvenlik from public, anon, authenticated;
create table if not exists guvenlik.yedek (
  id          bigserial primary key,
  uygulama    text not null,                 -- 'g1' (bu dosyanın sürümü)
  tur         text not null,                 -- 'fonksiyon' | 'varsayilan'
  imza        text,                          -- public.ad(argümanlar)
  acl         aclitem[],                     -- değişiklikten ÖNCEKİ yetki listesi (boşsa sahibinin varsayılanı)
  config      text[],                        -- değişiklikten ÖNCEKİ fonksiyon ayarları (search_path dahil)
  auth_once   boolean,                       -- authenticated önceden çalıştırabiliyor muydu
  servis_once boolean,                       -- service_role önceden çalıştırabiliyor muydu
  geri_al     text,                          -- 'varsayilan' satırları için geri alma komutu
  zaman       timestamptz not null default now()
);
alter table guvenlik.yedek enable row level security;
revoke all on guvenlik.yedek from public, anon, authenticated;
revoke all on sequence guvenlik.yedek_id_seq from public, anon, authenticated;

do $$
declare
  v_uyg text := 'g1';
  yol_degeri text := 'public, extensions, pg_temp';
  -- Sitenin (newdiamond-web: site.js / musteri.html) girişsiz çağırdığı fonksiyonlar — anon'a AÇIK KALIR (site-portal.sql).
  acik_birak text[] := array[
    'public.herkese_acik_vitrin()', 'public.site_ayarlari()', 'public.site_kayit_ol(jsonb, text, text)',
    'public.portal_giris(text, text)', 'public.portal(text)', 'public.portal_hesap(text, date, date)',
    'public.portal_siparis(text, jsonb, text, jsonb)', 'public.portal_cikis(text)',
    -- yonetici_mi: canlıda storage.objects "gorsel_yonetici_yazar" politikası (rol: public) bunu çağırıyor; politika SORGUYU YAPAN
    -- rolle değerlendirilir — anon'a kapatılırsa girişsiz görsel isteği "yetki yok" HATASIYLA düşebilir. Girişsiz çağrıda false
    -- döner (e-posta yok), bilgi sızdırmaz. Canlı Bölüm 3 (3 Kasım) üzerine açık bırakıldı.
    'public.yonetici_mi()'];
  -- LİSTE:KAPANACAK BAŞ (CANLI 3 Kasım: Bölüm 1, 104 fonksiyon — anon_calistirir = true olup ACIK_BIRAK'ta olmayanlar)
  kapanacak text[] := array[
    'public.degisiklik_bump()',
    'public.fis_alt_karsilanansiz(jsonb)',
    'public.fis_bag_iz_koru()',
    'public.fis_baslik_koru()',
    'public.fis_kalem_idleri(jsonb)',
    'public.fis_kalem_karsilanan_koru()',
    'public.fis_kalem_teslim_koru()',
    'public.fis_kapi_acik()',
    'public.fis_kural_aktif()',
    'public.fis_satir_koru()',
    'public.fis_satirsiz_denetle()',
    'public.fis_siparis_iptal_koru()',
    'public.fis_siparis_teslim_koru()',
    'public.fis_yer_tutucu(jsonb,text,text)',
    'public.guncelleme_yaz()',
    'public.gunluk_silme_koruma()',
    'public.lst_sayac()',
    'public.site_pb(text)',
    'public.surum_arttir()',
    'public.tanimlar_kullanici_koruma()',
    'public.yazma_yetkisi_koruma()',
    'public.yetki_var_mi(text[],text)'];
  -- LİSTE:KAPANACAK SON
  -- LİSTE:YOL BAŞ (CANLI 3 Kasım: Bölüm 1 search_path boş olanlar; Bölüm 2 satırsız)
  yol text[] := array[
    'public.fis_alt_artissiz(jsonb)',
    'public.fis_alt_karsilanansiz(jsonb)',
    'public.fis_bag_iz_koru()',
    'public.fis_baslik_koru()',
    'public.fis_kalem_idleri(jsonb)',
    'public.fis_kalem_karsilanan_koru()',
    'public.fis_kapi_acik()',
    'public.fis_satir_koru()',
    'public.fis_siparis_iptal_koru()',
    'public.fis_yer_tutucu(jsonb,text,text)',
    'public.guncelleme_yaz()',
    'public.siparis_durum_hesap(text,text)',
    'public.site_pb(text)',
    'public.stk_dizi(jsonb)',
    'public.stk_kaynak_tur(text)',
    'public.stk_mantik(text)',
    'public.stk_nrm(text)',
    'public.stk_sayi(text)',
    'public.stk_yer_tutucu_mu(text)',
    'public.stk_zaman(text)',
    'public.surum_arttir()'];
  -- LİSTE:YOL SON
  anon_oid oid := (select oid from pg_roles where rolname = 'anon');
  hesap text[]; liste text[]; eksik text; fazla text; f text; r record; c text;
begin
  -- Adlar her yerde aynı yazılsın: şema adıyla (public.ad(argümanlar)). Bu blokta search_path pg_catalog: regprocedure metni
  -- "public." önekiyle döner; blokta kullanılan bütün public nesneleri zaten şema adıyla yazılı.
  perform set_config('search_path', 'pg_catalog', true);
  if exists (select 1 from guvenlik.yedek where uygulama = v_uyg) then
    raise notice 'Güvenlik sıkılaştırması (%) zaten uygulanmış — değişiklik yok. Geri almak için 3-geri-al.sql.', v_uyg;
    return;
  end if;

  -- Listelerdeki adlar veritabanında var mı (yazım hatası ya da canlıda olmayan fonksiyon → DUR)
  select string_agg(x, ', ') into eksik from unnest(kapanacak || yol) x where to_regprocedure(x) is null;
  if eksik is not null then raise exception 'KİLİT: listede olup veritabanında olmayan fonksiyon(lar): %', eksik; end if;
  select string_agg(x, ', ') into eksik from unnest(acik_birak) x where to_regprocedure(x) is null;
  if eksik is not null then raise notice 'Bilgi: site fonksiyonlarından bu veritabanında olmayan(lar): %', eksik; end if;

  -- KİLİT 1: anon'un BUGÜN çalıştırabildiği (site dışı) fonksiyonlar listeyle BİREBİR aynı olmalı
  select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') into hesap
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
     and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
     and p.oid <> all (select to_regprocedure(x) from unnest(acik_birak) x where to_regprocedure(x) is not null);
  select coalesce(array_agg(to_regprocedure(x)::text order by 1), '{}') into liste from unnest(kapanacak) x;
  select string_agg(x, ', ') into eksik from unnest(hesap) x where x <> all (liste);
  select string_agg(x, ', ') into fazla from unnest(liste) x where x <> all (hesap);
  if eksik is not null or fazla is not null then
    raise exception 'KİLİT: anon listesi canlıyla uyuşmuyor — hiçbir şey değişmedi. Listede OLMAYAN: % · Listede olup anon''un zaten çalıştıramadığı: %',
      coalesce(eksik, '—'), coalesce(fazla, '—');
  end if;

  -- KİLİT 2: search_path'i sabit olmayan fonksiyonlar listeyle BİREBİR aynı olmalı. İSTİSNA: listedeki bir fonksiyonun yolu bu
  -- dosyanın yazacağı değere ZATEN eşitse (0b-portal-hesap-duzelt.sql site_pb'yi, kaynak dosyalar yeniden çalışınca 19 fonksiyonu
  -- tanımla birlikte sabitler) o fonksiyon listeden düşer — sıra bağımlılığı olmasın. Başka bir değer taşıyorsa yine DUR.
  select coalesce(array_agg(x), '{}') into liste from unnest(yol) x
   where not exists (select 1 from pg_proc p, unnest(coalesce(p.proconfig, '{}')) cc
                      where p.oid = to_regprocedure(x) and cc = 'search_path=' || yol_degeri);
  if cardinality(liste) < cardinality(yol) then
    raise notice 'Bilgi: yolu zaten "%" olan % fonksiyon atlandı: %', yol_degeri, cardinality(yol) - cardinality(liste),
      (select string_agg(x, ', ') from unnest(yol) x where x <> all (liste));
    yol := liste;
  end if;
  select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') into hesap
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
   where n.nspname = 'public' and l.lanname not in ('c', 'internal')
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cc where cc like 'search_path=%')
     and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e');
  select coalesce(array_agg(to_regprocedure(x)::text order by 1), '{}') into liste from unnest(yol) x;
  select string_agg(x, ', ') into eksik from unnest(hesap) x where x <> all (liste);
  select string_agg(x, ', ') into fazla from unnest(liste) x where x <> all (hesap);
  if eksik is not null or fazla is not null then
    raise exception 'KİLİT: search_path listesi canlıyla uyuşmuyor — hiçbir şey değişmedi. Listede OLMAYAN: % · Yolu zaten sabit olan: %',
      coalesce(eksik, '—'), coalesce(fazla, '—');
  end if;

  -- YEDEK: her fonksiyonun ÖNCEKİ yetki listesi, ayarları ve authenticated / service_role durumu
  for f in select distinct to_regprocedure(x)::text from unnest(kapanacak || yol) x loop
    insert into guvenlik.yedek (uygulama, tur, imza, acl, config, auth_once, servis_once)
    select v_uyg, 'fonksiyon', f, coalesce(p.proacl, acldefault('f', p.proowner)), p.proconfig,
           has_function_privilege('authenticated', p.oid, 'execute'), has_function_privilege('service_role', p.oid, 'execute')
      from pg_proc p where p.oid = to_regprocedure(f);
  end loop;

  -- 1) anon + PUBLIC kapanır; authenticated / service_role bugünkü durumuyla AÇIKÇA korunur
  for r in select * from guvenlik.yedek where uygulama = v_uyg and tur = 'fonksiyon' and to_regprocedure(imza)::text = any
             (select to_regprocedure(x)::text from unnest(kapanacak) x) loop
    if r.auth_once then execute format('grant execute on function %s to authenticated', r.imza); end if;
    if r.servis_once then execute format('grant execute on function %s to service_role', r.imza); end if;
    execute format('revoke execute on function %s from public, anon', r.imza);
  end loop;

  -- 2) search_path sabitlenir
  foreach f in array yol loop
    execute format('alter function %s set search_path = %s', to_regprocedure(f)::text, yol_degeri);
  end loop;

  -- 3) Yeni fonksiyonlar anon'a kendiliğinden açılmasın (bu rolün public şeması varsayılanı; başka rolünkine dokunulamaz)
  if exists (select 1 from pg_default_acl d, aclexplode(d.defaclacl) a
              where d.defaclrole = (select oid from pg_roles where rolname = current_user)
                and d.defaclnamespace = 'public'::regnamespace and d.defaclobjtype = 'f'
                and a.grantee = anon_oid and a.privilege_type = 'EXECUTE') then
    execute 'alter default privileges in schema public revoke execute on functions from anon';
    insert into guvenlik.yedek (uygulama, tur, geri_al)
      values (v_uyg, 'varsayilan', 'alter default privileges in schema public grant execute on functions to anon');
  end if;
  select string_agg(distinct pg_get_userbyid(d.defaclrole), ', ') into c
    from pg_default_acl d, aclexplode(d.defaclacl) a
   where d.defaclobjtype = 'f' and a.grantee = anon_oid and d.defaclrole <> (select oid from pg_roles where rolname = current_user);
  if c is not null then raise notice 'Bilgi: şu rol(ler)in varsayılan yetkileri yeni fonksiyonları anon''a açıyor (bu oturum değiştiremez): %', c; end if;

  -- 5) DOĞRULAMA — tutmazsa işlem geri alınır
  select string_agg(p.oid::regprocedure::text, ', ') into eksik
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
     and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
     and p.oid <> all (select to_regprocedure(x) from unnest(acik_birak) x where to_regprocedure(x) is not null);
  if eksik is not null then raise exception 'DOĞRULAMA: anon hâlâ çalıştırabiliyor (yetki başka rol tarafından verilmiş olabilir): %', eksik; end if;
  select string_agg(r2.imza, ', ') into eksik from guvenlik.yedek r2
   where r2.uygulama = v_uyg and r2.tur = 'fonksiyon'
     and (has_function_privilege('authenticated', to_regprocedure(r2.imza), 'execute') is distinct from r2.auth_once
       or has_function_privilege('service_role', to_regprocedure(r2.imza), 'execute') is distinct from r2.servis_once);
  if eksik is not null then raise exception 'DOĞRULAMA: authenticated / service_role yetkisi değişti: %', eksik; end if;
  select string_agg(x, ', ') into eksik from unnest(yol) x
   where not exists (select 1 from pg_proc p, unnest(coalesce(p.proconfig, '{}')) cc where p.oid = to_regprocedure(x) and cc like 'search_path=%');
  if eksik is not null then raise exception 'DOĞRULAMA: search_path sabitlenemedi: %', eksik; end if;

  raise notice 'Güvenlik sıkılaştırması (%) uygulandı: % fonksiyon anon''a kapandı, % fonksiyonun yolu sabitlendi. Geri almak için 3-geri-al.sql.',
    v_uyg, cardinality(kapanacak), cardinality(yol);
end $$;
