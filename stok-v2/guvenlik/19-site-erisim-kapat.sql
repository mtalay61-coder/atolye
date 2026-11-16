-- =====================================================================================================================
--  19-site-erisim-kapat.sql — MÜŞTERİ PORTALI ÖZEL TABLOLARI ERP KULLANICISINA KAPANIR + HESAP YÖNETİMİ YALNIZ YÖNETİCİ
--  (AYRI ONAYLA; canlıya uygulanmadı)
-- =====================================================================================================================
--  Bulgular (17 canlı, 16 Kasım; 18 doğrulayacak):
--   1) site_oturumlari / site_hesaplari / site_giris_kaydi / site_kayit_talepleri: authenticated'a tam tablo yetkisi + rls-kimlik.sql'in
--      `giris_yapmis_hersey` politikası → giriş yapmış HER ERP kullanıcısı müşteri oturum anahtarlarını okuyup portalda müşterinin
--      yerine geçebilir, şifre özetlerini okuyup değiştirebilir.
--   2) site_hesap_kaydet / site_hesap_sil / site_kayit_onayla / site_kayit_reddet: rol kontrolü YOK → normal ERP kullanıcısı başka
--      bir müşterinin şifresini değiştirebilir, erişimini kapatabilir, kayıt talebini onaylayıp hesap açabilir / reddedebilir.
--
--  DEĞİŞİKLİK:
--   a) Dört tabloda anon / authenticated / PUBLIC'e uyan politikalar silinir; bu üç rolün tablo, sütun ve sıra (site_giris_kaydi_id_seq)
--      yetkileri alınır. site_talepleri'ne DOKUNULMAZ (ERP talepleri doğrudan okur / işler). service_role değişmez (site bildirimi).
--   b) public.site_yonetici_kapisi() kurulur (RPC değil; anon / authenticated çalıştıramaz) ve yazan dört fonksiyonun başına
--      `perform public.site_yonetici_kapisi();` eklenir. İzin: yonetici_mi() | JWT rolü service_role | JWT'siz doğrudan bağlantı
--      (SQL Editor). Reddedilen çağrı: hata 42501 "YETKI_YOK: …" (REST 403) — hiçbir satır değişmez.
--      Okuma fonksiyonları (site_hesap_bilgi / site_hesap_listesi / site_kayit_listesi / site_raporu) ve site_talep_reddet aynen kalır.
--      Fonksiyon metinleri site-portal.sql ile BİREBİR (o dosya yeniden çalıştırılınca koruma kalır).
--  ERP NEDEN BOZULMAZ: ERP bu dört tabloya yalnız SECURITY DEFINER (sahibi postgres) fonksiyonlarla erişir — önkoşul bunu CANLIDA
--  doğrular (bu tablolara başvuran her fonksiyon definer + sahibi tabloya yetkili; invoker görünüm yok). Doğrudan REST okuması
--  yalnız site_talepleri'nde (dokunulmaz). Site (anon) yalnız portal_* / site_kayit_ol fonksiyonlarını çağırır — değişmez.
--  ERP'DE GÖRÜNÜR ETKİ: Yönetici olmayan kullanıcı cari kartında site şifresi belirlediğinde / erişimi kapattığında ya da siteden
--  gelen kaydı onayladığında / reddettiğinde "YETKI_YOK" hatası alır (ekran hâlâ düğmeyi gösterir — uygulamada ayrı iyileştirme).
--
--  ÖNKOŞULLAR (biri tutmazsa HATA, hiçbir şey değişmez): postgres rolü; dört tablo var; daha önce uygulanmamış (yedek yok); giriş
--  sistemi açık (girisAktifMi) ve bulut hesabı olan en az bir Yönetici var (yoksa kimse hesap yönetemezdi); yazan dört fonksiyonun
--  canlı gövdesi depodaki (korumasız) sürümle aynı (md5); bu tablolara başvuran her fonksiyon SECURITY DEFINER ve sahibi tabloya
--  yetkili; bu tablolara başvuran görünüm yok.
--  YEDEK: değişiklikten önce tablo / sütun / sıra yetkileri, politikalar (tam tanım) ve dört fonksiyonun tanımı
--  `guvenlik.site_erisim_yedek` tablosuna yazılır. Geri alma: 19-site-erisim-geri-al.sql (yedekten birebir; 19'dan sonra başka bir
--  değişiklik olduysa dokunmadan durur).
--  SINAMA (veri DEĞİŞMEZ) ayrı dosyada: 19-site-erisim-sinama.sql — ERP listesinde olmayan uydurma e-postalı authenticated kimlikle
--  tablolar okunamaz, yazan dört fonksiyon YETKI_YOK verir, okuma fonksiyonları ve site_talepleri çalışır; Tanımlar'daki bir
--  Yönetici'nin kimliği kapıdan geçer (e-posta sonuçta gösterilmez).
--  Çalıştırma: Supabase › SQL Editor (postgres olarak) › bu dosyanın TAMAMI › Run; SONRA 19-site-erisim-sinama.sql.
--  EDITOR NOTU: Supabase SQL Editor ifadeleri ayrı isteklerle gönderebilir — begin/commit o zaman tek işlem YAPMAZ. Bu yüzden:
--  önkoşul (değişiklik yapmaz), yedek + tablo değişikliği (TEK do bloğu), beş fonksiyon (her biri tekrar çalıştırılabilir) ve
--  katalog doğrulaması ayrı ifadeler; geçici tablo yok. Doğrulama tutmazsa önceki ifadeler kalmış olabilir → 19-durum-salt-okur.sql,
--  gerekirse 19-site-erisim-geri-al.sql.
-- =====================================================================================================================
begin;

-- ---------------- 0) Önkoşullar ----------------
do $$
declare
  tablolar text[] := array['site_oturumlari', 'site_hesaplari', 'site_giris_kaydi', 'site_kayit_talepleri'];
  t text;
  fark text;
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  foreach t in array tablolar loop
    if to_regclass('public.' || t) is null then raise exception 'Tablo yok: public.%. Hiçbir şey değişmedi.', t; end if;
  end loop;
  if to_regclass('guvenlik.site_erisim_yedek') is not null then
    if exists (select 1 from guvenlik.site_erisim_yedek where tur = 'isaret') then
      raise exception '19 zaten uygulanmış (guvenlik.site_erisim_yedek dolu). Önce 19-site-erisim-geri-al.sql. Hiçbir şey değişmedi.';
    end if;
  end if;
  if to_regprocedure('public.yonetici_mi()') is null then
    raise exception 'public.yonetici_mi() yok (rls-rol.sql). Hiçbir şey değişmedi.';
  end if;
  if not coalesce((select (veri ->> 'girisAktifMi')::boolean from public.tanimlar where id = 'tekil'), false) then
    raise exception 'Giriş sistemi kapalı (tanimlar.girisAktifMi) — yonetici_mi() kimseyi tanımaz, hesap yönetimi kilitlenirdi. Hiçbir şey değişmedi.';
  end if;
  if not exists (
    select 1 from public.tanimlar tt, jsonb_array_elements(coalesce(tt.veri -> 'kullanicilar', '[]'::jsonb)) k
    where tt.id = 'tekil' and k ->> 'rol' = 'Yönetici'
      and exists (select 1 from auth.users u where lower(u.email) =
            case when coalesce(k ->> 'eposta', '') <> '' then lower(k ->> 'eposta')
                 else regexp_replace(lower(translate(coalesce(k ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local' end)) then
    raise exception 'Bulut hesabı (auth.users) olan Yönetici yok — hesap yönetimi kimseye açık kalmazdı. Hiçbir şey değişmedi.';
  end if;

  -- Yazan dört fonksiyon depodaki (korumasız) sürümde mi? Başka bir sürümün üstüne yazmayalım.
  select string_agg(x.ad || ' (' || coalesce(x.canli, 'YOK') || ')', ', ') into fark from (
    select v.ad, md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) as canli, v.beklenen
    from (values ('public.site_hesap_kaydet(text, text, text)', '4fe1101e544cec91a4b0d67524e21dc7'),
                 ('public.site_hesap_sil(text)',                '4825c310d535b2902844b1b7ad46be29'),
                 ('public.site_kayit_onayla(text, text)',       '616aeb5e7dd3add79991661ceaec3ebe'),
                 ('public.site_kayit_reddet(text)',             '471f66f924ea4f713e4115113cb5b0a7')) v(ad, beklenen)
    left join pg_proc p on p.oid = to_regprocedure(v.ad)
  ) x where x.canli is distinct from x.beklenen;
  if fark is not null then
    raise exception 'Canlı gövde depodaki sürümden farklı: %. 18''in "B yönetim · depo" satırlarına bakın. Hiçbir şey değişmedi.', fark;
  end if;

  -- Bu tablolara başvuran her fonksiyon SECURITY DEFINER ve sahibi tablolara yetkili olmalı (yoksa yetki alınınca bozulur).
  select string_agg(n.nspname || '.' || p.proname || case when not p.prosecdef then ' (INVOKER)' else ' (sahip ' || pg_get_userbyid(p.proowner) || ' yetkisiz)' end, ', ')
    into fark
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema') and n.nspname not like 'pg\_%'
    and p.prosrc ~ '\m(site_oturumlari|site_hesaplari|site_giris_kaydi|site_kayit_talepleri)\M'
    and (not p.prosecdef or exists (select 1 from unnest(tablolar) tt, unnest(array['select', 'insert', 'update', 'delete']) y
           where not has_table_privilege(p.proowner, ('public.' || tt)::regclass, y)));
  if fark is not null then
    raise exception 'Bu tablolara başvuran fonksiyon tablo yetkisi alınınca bozulur: %. Hiçbir şey değişmedi.', fark;
  end if;
  select string_agg(v.schemaname || '.' || v.viewname, ', ') into fark from pg_views v
  where v.schemaname not in ('pg_catalog', 'information_schema')
    and v.definition ~ '\m(site_oturumlari|site_hesaplari|site_giris_kaydi|site_kayit_talepleri)\M';
  if fark is not null then
    raise exception 'Bu tablolara başvuran görünüm var (inceleyin): %. Hiçbir şey değişmedi.', fark;
  end if;
end $$;

-- ---------------- 1) Yedek + 2) Tablolar: politika + yetki (TEK ifade: Editor ifadeleri ayrı gönderse de ya hepsi ya hiçbiri) ----------------
do $$
declare pr record; tb text;
begin
  create schema if not exists guvenlik;
  revoke all on schema guvenlik from public, anon, authenticated;
  create table if not exists guvenlik.site_erisim_yedek (
    alindi timestamptz not null default now(),
    tur    text not null,    -- isaret | tablo_acl | sutun_acl | sira_acl | politika | fonksiyon
    nesne  text,             -- tablo / sıra / fonksiyon (regprocedure metni)
    ad     text,             -- sütun ya da politika adı
    acl    aclitem[],
    tanim  text,             -- politika: create policy …; fonksiyon: pg_get_functiondef
    ozet   text,             -- fonksiyon gövde md5'i (17 ölçümü)
    veri   jsonb             -- politika alanları (doğrulama için)
  );
  revoke all on guvenlik.site_erisim_yedek from public, anon, authenticated;

  insert into guvenlik.site_erisim_yedek (tur) values ('isaret');
  insert into guvenlik.site_erisim_yedek (tur, nesne, acl)
  select 'tablo_acl', c.relname, c.relacl from pg_class c
  where c.oid in ('public.site_oturumlari'::regclass, 'public.site_hesaplari'::regclass, 'public.site_giris_kaydi'::regclass, 'public.site_kayit_talepleri'::regclass);
  insert into guvenlik.site_erisim_yedek (tur, nesne, ad, acl)
  select 'sutun_acl', c.relname, a.attname, a.attacl from pg_class c join pg_attribute a on a.attrelid = c.oid
  where c.oid in ('public.site_oturumlari'::regclass, 'public.site_hesaplari'::regclass, 'public.site_giris_kaydi'::regclass, 'public.site_kayit_talepleri'::regclass)
    and a.attnum > 0 and not a.attisdropped and a.attacl is not null;
  insert into guvenlik.site_erisim_yedek (tur, nesne, acl)
  select 'sira_acl', s.relname, s.relacl from pg_class s join pg_depend d on d.objid = s.oid and d.classid = 'pg_class'::regclass and d.deptype in ('a', 'i')
  where s.relkind = 'S' and d.refobjid in ('public.site_oturumlari'::regclass, 'public.site_hesaplari'::regclass, 'public.site_giris_kaydi'::regclass, 'public.site_kayit_talepleri'::regclass);
  insert into guvenlik.site_erisim_yedek (tur, nesne, ad, tanim, veri)
  select 'politika', p.tablename, p.policyname,
         format('create policy %I on public.%I as %s for %s to %s', p.policyname, p.tablename, lower(p.permissive), lower(p.cmd),
                (select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ') from unnest(p.roles) r))
           || case when p.qual is not null then ' using (' || p.qual || ')' else '' end
           || case when p.with_check is not null then ' with check (' || p.with_check || ')' else '' end,
         jsonb_build_object('permissive', p.permissive, 'cmd', p.cmd, 'roles', to_jsonb(p.roles), 'qual', p.qual, 'with_check', p.with_check)
  from pg_policies p
  where p.schemaname = 'public' and p.tablename in ('site_oturumlari', 'site_hesaplari', 'site_giris_kaydi', 'site_kayit_talepleri')
    and p.roles && array['authenticated', 'anon', 'public']::name[];
  insert into guvenlik.site_erisim_yedek (tur, nesne, tanim, ozet, acl)
  select 'fonksiyon', p.oid::regprocedure::text, pg_get_functiondef(p.oid),
         md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))), p.proacl
  from pg_proc p where p.oid in ('public.site_hesap_kaydet(text, text, text)'::regprocedure, 'public.site_hesap_sil(text)'::regprocedure,
                                 'public.site_kayit_onayla(text, text)'::regprocedure, 'public.site_kayit_reddet(text)'::regprocedure);

  for pr in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('site_oturumlari', 'site_hesaplari', 'site_giris_kaydi', 'site_kayit_talepleri')
             and roles && array['authenticated', 'anon', 'public']::name[] loop
    execute format('drop policy %I on public.%I', pr.policyname, pr.tablename);
  end loop;
  foreach tb in array array['site_oturumlari', 'site_hesaplari', 'site_giris_kaydi', 'site_kayit_talepleri'] loop
    -- Tablo düzeyindeki REVOKE sütun yetkilerini de alır.
    execute format('revoke all on public.%I from public, anon, authenticated', tb);
  end loop;
  for tb in select s.oid::regclass::text from pg_class s join pg_depend d on d.objid = s.oid and d.classid = 'pg_class'::regclass and d.deptype in ('a', 'i')
           where s.relkind = 'S' and d.refobjid in ('public.site_oturumlari'::regclass, 'public.site_hesaplari'::regclass,
                                                    'public.site_giris_kaydi'::regclass, 'public.site_kayit_talepleri'::regclass) loop
    execute format('revoke all on sequence %s from public, anon, authenticated', tb);
  end loop;
end $$;

-- ---------------- 3) Yönetici kapısı + yazan dört fonksiyon (site-portal.sql ile birebir) ----------------
create or replace function public.site_yonetici_kapisi()
returns void language plpgsql stable set search_path = public, pg_temp
as $$
begin
  if public.yonetici_mi() then return; end if;
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then return; end if;
  if auth.jwt() is null and session_user::text not in ('authenticator', 'anon', 'authenticated') then return; end if;
  raise exception 'YETKI_YOK: müşteri site hesabı işlemleri yalnız Yönetici' using errcode = '42501';
end;
$$;
revoke all on function public.site_yonetici_kapisi() from public, anon, authenticated;

create or replace function public.site_hesap_kaydet(p_cari_id text, p_kullanici text, p_sifre text)
returns void language plpgsql volatile security definer set search_path = public, extensions
as $$
declare
  ad text := lower(trim(coalesce(p_kullanici, '')));
begin
  perform public.site_yonetici_kapisi();
  if ad !~ '^[a-z0-9._-]{3,40}$' then raise exception 'Kullanıcı adı 3-40 karakter: harf, rakam, nokta, tire, alt çizgi'; end if;
  if not exists (select 1 from cariler where id::text = p_cari_id) then raise exception 'Cari bulunamadı'; end if;
  if exists (select 1 from site_hesaplari where kullanici = ad and cari_id <> p_cari_id) then raise exception 'Bu kullanıcı adı başka bir caride kullanılıyor'; end if;
  if coalesce(p_sifre, '') = '' then
    if not exists (select 1 from site_hesaplari where cari_id = p_cari_id) then raise exception 'Şifre gerekli'; end if;
    update site_hesaplari set kullanici = ad where cari_id = p_cari_id;
    return;
  end if;
  if length(p_sifre) < 6 then raise exception 'Şifre en az 6 karakter olmalı'; end if;
  insert into site_hesaplari (cari_id, kullanici, sifre_ozeti) values (p_cari_id, ad, crypt(p_sifre, gen_salt('bf', 10)))
  on conflict (cari_id) do update set kullanici = excluded.kullanici, sifre_ozeti = excluded.sifre_ozeti, hatali_deneme = 0, kilit_bitis = null;
  delete from site_oturumlari where cari_id = p_cari_id;
end;
$$;
create or replace function public.site_hesap_sil(p_cari_id text)
returns void language plpgsql volatile security definer set search_path = public
as $$
begin
  perform public.site_yonetici_kapisi();
  delete from site_oturumlari where cari_id = p_cari_id;
  delete from site_hesaplari where cari_id = p_cari_id;
end;
$$;
create or replace function public.site_kayit_onayla(p_id text, p_cari_id text)
returns void language plpgsql volatile security definer set search_path = public
as $$
declare t record;
begin
  perform public.site_yonetici_kapisi();
  select * into t from site_kayit_talepleri where id = p_id and durum = 'yeni' for update;
  if not found then raise exception 'Talep bulunamadı ya da işlenmiş'; end if;
  if not exists (select 1 from cariler where id::text = p_cari_id) then raise exception 'Cari bulunamadı'; end if;
  if exists (select 1 from site_hesaplari where kullanici = t.kullanici) then raise exception 'Bu kullanıcı adı artık kullanılıyor'; end if;
  insert into site_hesaplari (cari_id, kullanici, sifre_ozeti) values (p_cari_id, t.kullanici, t.sifre_ozeti)
  on conflict (cari_id) do update set kullanici = excluded.kullanici, sifre_ozeti = excluded.sifre_ozeti, hatali_deneme = 0, kilit_bitis = null;
  update site_kayit_talepleri set durum = 'onaylandi', cari_id = p_cari_id, sifre_ozeti = null where id = p_id;
end;
$$;
create or replace function public.site_kayit_reddet(p_id text)
returns void language plpgsql volatile security definer set search_path = public
as $$
begin
  perform public.site_yonetici_kapisi();
  update site_kayit_talepleri set durum = 'reddedildi', sifre_ozeti = null where id = p_id and durum = 'yeni';
end;
$$;
-- create or replace çağırma yetkilerini korur; yine de açıkça (site-portal.sql ile aynı):
revoke all on function public.site_hesap_kaydet(text, text, text), public.site_hesap_sil(text),
                       public.site_kayit_onayla(text, text), public.site_kayit_reddet(text) from public, anon;
grant execute on function public.site_hesap_kaydet(text, text, text), public.site_hesap_sil(text),
                          public.site_kayit_onayla(text, text), public.site_kayit_reddet(text) to authenticated;

-- ---------------- 4) Doğrulama (katalog) ----------------
do $$
declare fark text;
begin
  select string_agg(c.relname || ' ' || e.privilege_type || '→' || case when e.grantee = 0 then 'PUBLIC' else e.grantee::regrole::text end, ', ') into fark
  from pg_class c, aclexplode(c.relacl) e
  where c.oid in ('public.site_oturumlari'::regclass, 'public.site_hesaplari'::regclass, 'public.site_giris_kaydi'::regclass, 'public.site_kayit_talepleri'::regclass,
                  coalesce(to_regclass('public.site_giris_kaydi_id_seq'), 0))
    and e.grantee in (0, 'anon'::regrole, 'authenticated'::regrole);
  if fark is not null then raise exception 'Doğrulama: yetki kaldı: %. İşlem geri alındı.', fark; end if;
  if exists (select 1 from pg_attribute a, aclexplode(a.attacl) e
             where a.attrelid in ('public.site_oturumlari'::regclass, 'public.site_hesaplari'::regclass, 'public.site_giris_kaydi'::regclass, 'public.site_kayit_talepleri'::regclass)
               and a.attacl is not null and e.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)) then
    raise exception 'Doğrulama: sütun yetkisi kaldı. İşlem geri alındı.';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('site_oturumlari', 'site_hesaplari', 'site_giris_kaydi', 'site_kayit_talepleri')
               and roles && array['authenticated', 'anon', 'public']::name[]) then
    raise exception 'Doğrulama: politika kaldı. İşlem geri alındı.';
  end if;
  select string_agg(v.ad, ', ') into fark from (values
      ('public.site_hesap_kaydet(text, text, text)', 'c83d1cbd5d25392c2fe3492501c967f3'),
      ('public.site_hesap_sil(text)',                '7878219eccd2d5b255388a18ac8be066'),
      ('public.site_kayit_onayla(text, text)',       '86debf97b2f8ae9c1845f85900e65492'),
      ('public.site_kayit_reddet(text)',             '071e82fa3ad4c6eb0d2be0c2e6047cbe'),
      ('public.site_yonetici_kapisi()',              '8e4b98cd2d33c703910fab76de655959')) v(ad, beklenen)
    left join pg_proc p on p.oid = to_regprocedure(v.ad)
  where md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) is distinct from v.beklenen;
  if fark is not null then raise exception 'Doğrulama: fonksiyon gövdesi beklenenden farklı: %. İşlem geri alındı.', fark; end if;
  if has_function_privilege('anon', 'public.site_yonetici_kapisi()', 'execute') or has_function_privilege('authenticated', 'public.site_yonetici_kapisi()', 'execute') then
    raise exception 'Doğrulama: site_yonetici_kapisi() RPC olarak çağrılabiliyor. İşlem geri alındı.';
  end if;
  if not has_table_privilege('service_role', 'public.site_hesaplari', 'select') and exists (select 1 from pg_roles where rolname = 'service_role') then
    raise notice 'Bilgi: service_role site_hesaplari''nı okuyamıyor (19 öncesinde de böyleydi; 19 service_role''e dokunmaz).';
  end if;
end $$;

-- ---------------- 5) Sonuç (katalog) ----------------
-- DAVRANIŞ SINAMASI AYRI DOSYADA: 19-site-erisim-sinama.sql (normal kullanıcı reddedilir, okuma ve site_talepleri çalışır, Yönetici geçer).
-- Eskiden burada `create temp table … on commit drop` vardı: Editor ifadeleri ayrı gönderince tablo kendi işleminin sonunda
-- silindi ve sonraki ifade 42P01 verdi (16 Kasım canlı çalıştırması). Geçici tablo kullanılmaz.
select kontrol, sonuc from (
  select 1 as sira, 'yedek: tablo / sütun / sıra yetkisi · politika · fonksiyon' as kontrol,
         (select count(*) filter (where tur = 'tablo_acl') || ' / ' || count(*) filter (where tur = 'sutun_acl') || ' / ' || count(*) filter (where tur = 'sira_acl')
                 || ' · ' || count(*) filter (where tur = 'politika') || ' · ' || count(*) filter (where tur = 'fonksiyon') from guvenlik.site_erisim_yedek) as sonuc
  union all
  select 2, 'silinen politikalar', coalesce((select string_agg(nesne || '.' || ad, ', ' order by nesne) from guvenlik.site_erisim_yedek where tur = 'politika'), 'yok')
  union all
  select 3, 'katalog doğrulaması (4. bölüm) geçti; SIRADAKİ ADIM', '19-site-erisim-sinama.sql çalıştırın (bütün satırlar "tamam" olmalı)'
) x order by sira;

commit;
