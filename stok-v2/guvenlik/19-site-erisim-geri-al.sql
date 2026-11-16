-- =====================================================================================================================
--  19-site-erisim-geri-al.sql — 19-site-erisim-kapat.sql'i geri alır: YEDEKTEN BİREBİR (AÇIĞI YENİDEN AÇAR — yalnız ERP bozulursa)
-- =====================================================================================================================
--  UYARI: geri alma 19'un kapattığı iki açığı geri getirir (giriş yapmış her ERP kullanıcısı müşteri oturum anahtarlarını / şifre
--  özetlerini okur; normal kullanıcı müşteri şifresini değiştirir). Yalnız 19 sonrası ERP'de beklenmeyen bir arıza çıkarsa.
--  Kaynak: `guvenlik.site_erisim_yedek` (19 değişiklikten önce yazar). Yedek yoksa HATA — hiçbir şey değişmez.
--
--  KORUMA: önce durum hâlâ 19'un bıraktığı hâlde mi bakılır: dört tabloda anon / authenticated / PUBLIC'e yetki ve politika YOK,
--  yazan dört fonksiyon ve site_yonetici_kapisi() 19'un gövdesinde. 19'dan SONRA biri bunları değiştirdiyse geri alma o değişikliği
--  ezmemek için DURUR ve HATA verir — hiçbir şey değişmez, fark iletide yazılır.
--  Yöntem: (1) dört fonksiyon yedekteki tanımla (pg_get_functiondef) yeniden kurulur, site_yonetici_kapisi() silinir; (2) yedekteki
--  tablo / sütun / sıra yetkilerinin anon / authenticated / PUBLIC satırları (aktarma hakkı dahil) yeniden verilir; (3) silinen
--  politikalar yedekteki tam tanımla kurulur; (4) DOĞRULAMA: bu üç rolün yetkileri, politikalar (ad · komut · izin türü · roller ·
--  using · check) ve fonksiyon gövdeleri yedekle BİREBİR; değilse HATA ve işlem geri alınır. Başarılı olunca yedek satırları silinir.
--  site_talepleri ve service_role'e 19 dokunmadı; burada da dokunulmaz. site-portal.sql / rls-kimlik.sql dosyaları depoda korumalı
--  kalır: geri alma sonrası onlardan biri yeniden çalıştırılırsa koruma yeniden kurulur.
--  Çalıştırma: Supabase › SQL Editor (postgres olarak) › bu dosyanın TAMAMI › Run.
-- =====================================================================================================================
begin;

do $$
declare
  fark text;
  r record;
  e record;
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('guvenlik.site_erisim_yedek') is null then
    raise exception 'Yedek tablosu yok (guvenlik.site_erisim_yedek) — 19 hiç uygulanmamış. Hiçbir şey değişmedi.';
  end if;
  if not exists (select 1 from guvenlik.site_erisim_yedek where tur = 'isaret') then
    raise exception 'Yedek bulunamadı — 19 uygulanmamış ya da geri alma zaten yapılmış. Hiçbir şey değişmedi.';
  end if;

  -- ---------- KORUMA: 19'un bıraktığı hâl değişmemiş olmalı ----------
  select string_agg(x, '; ') into fark from (
    select c.relname || ' ' || e2.privilege_type || '→' || case when e2.grantee = 0 then 'PUBLIC' else e2.grantee::regrole::text end || ' (19 sonrası verilmiş yetki)' as x
    from pg_class c, aclexplode(c.relacl) e2
    where c.oid in ('public.site_oturumlari'::regclass, 'public.site_hesaplari'::regclass, 'public.site_giris_kaydi'::regclass, 'public.site_kayit_talepleri'::regclass,
                    coalesce(to_regclass('public.site_giris_kaydi_id_seq'), 0))
      and e2.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)
    union all
    select a.attrelid::regclass::text || '.' || a.attname || ' sütun yetkisi (19 sonrası)'
    from pg_attribute a, aclexplode(a.attacl) e2
    where a.attrelid in ('public.site_oturumlari'::regclass, 'public.site_hesaplari'::regclass, 'public.site_giris_kaydi'::regclass, 'public.site_kayit_talepleri'::regclass)
      and a.attacl is not null and e2.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)
    union all
    select tablename || '.' || policyname || ' politikası (19 sonrası kurulmuş)' from pg_policies
    where schemaname = 'public' and tablename in ('site_oturumlari', 'site_hesaplari', 'site_giris_kaydi', 'site_kayit_talepleri')
      and roles && array['authenticated', 'anon', 'public']::name[]
    union all
    select v.ad || ' gövdesi 19 sonrası değişmiş (' || coalesce(md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))), 'YOK') || ')'
    from (values ('public.site_hesap_kaydet(text, text, text)', 'c83d1cbd5d25392c2fe3492501c967f3'),
                 ('public.site_hesap_sil(text)',                '7878219eccd2d5b255388a18ac8be066'),
                 ('public.site_kayit_onayla(text, text)',       '86debf97b2f8ae9c1845f85900e65492'),
                 ('public.site_kayit_reddet(text)',             '071e82fa3ad4c6eb0d2be0c2e6047cbe'),
                 ('public.site_yonetici_kapisi()',              '8e4b98cd2d33c703910fab76de655959')) v(ad, beklenen)
    left join pg_proc p on p.oid = to_regprocedure(v.ad)
    where md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) is distinct from v.beklenen
  ) z;
  if fark is not null then
    raise exception '19 uygulandıktan sonra başka bir değişiklik yapılmış: %. Geri alma durdu, hiçbir şey değişmedi.', fark;
  end if;

  -- ---------- 1) Fonksiyonlar ----------
  for r in select tanim from guvenlik.site_erisim_yedek where tur = 'fonksiyon' loop
    execute r.tanim;
  end loop;
  drop function public.site_yonetici_kapisi();

  -- ---------- 2) Yetkiler (yalnız anon / authenticated / PUBLIC satırları; başkalarına 19 dokunmadı) ----------
  for r in select tur, nesne, ad, acl from guvenlik.site_erisim_yedek where tur in ('tablo_acl', 'sira_acl', 'sutun_acl') loop
    for e in select * from aclexplode(r.acl) x where x.grantee in (0, 'anon'::regrole, 'authenticated'::regrole) loop
      execute format('grant %s%s on %s public.%I to %s%s',
                     lower(e.privilege_type),
                     case when r.tur = 'sutun_acl' then ' (' || quote_ident(r.ad) || ')' else '' end,
                     case when r.tur = 'sira_acl' then 'sequence' else 'table' end,
                     r.nesne,
                     case when e.grantee = 0 then 'public' else quote_ident(e.grantee::regrole::text) end,
                     case when e.is_grantable then ' with grant option' else '' end);
    end loop;
  end loop;

  -- ---------- 3) Politikalar ----------
  for r in select tanim from guvenlik.site_erisim_yedek where tur = 'politika' loop
    execute r.tanim;
  end loop;

  -- ---------- 4) Doğrulama: yedekle birebir ----------
  select string_agg(x, '; ') into fark from (
    (select r2.nesne || coalesce('.' || r2.ad, '') || ' ' || x2.grantee || ':' || x2.privilege_type || ':' || x2.is_grantable as x
       from guvenlik.site_erisim_yedek r2, aclexplode(r2.acl) x2
      where r2.tur in ('tablo_acl', 'sira_acl', 'sutun_acl') and x2.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)
     except
     select c.relname || ' ' || x2.grantee || ':' || x2.privilege_type || ':' || x2.is_grantable
       from pg_class c, aclexplode(c.relacl) x2
      where c.oid in (select ('public.' || nesne)::regclass from guvenlik.site_erisim_yedek where tur in ('tablo_acl', 'sira_acl'))
        and x2.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)
     except
     select c.relname || '.' || a.attname || ' ' || x2.grantee || ':' || x2.privilege_type || ':' || x2.is_grantable
       from pg_class c join pg_attribute a on a.attrelid = c.oid, aclexplode(a.attacl) x2
      where c.oid in (select ('public.' || nesne)::regclass from guvenlik.site_erisim_yedek where tur = 'tablo_acl')
        and a.attacl is not null and x2.grantee in (0, 'anon'::regrole, 'authenticated'::regrole))
    union all
    (select c.relname || ' ' || x2.grantee || ':' || x2.privilege_type || ':' || x2.is_grantable || ' (yedekte yok)'
       from pg_class c, aclexplode(c.relacl) x2
      where c.oid in (select ('public.' || nesne)::regclass from guvenlik.site_erisim_yedek where tur in ('tablo_acl', 'sira_acl'))
        and x2.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)
     except
     select r2.nesne || ' ' || x2.grantee || ':' || x2.privilege_type || ':' || x2.is_grantable || ' (yedekte yok)'
       from guvenlik.site_erisim_yedek r2, aclexplode(r2.acl) x2
      where r2.tur in ('tablo_acl', 'sira_acl') and x2.grantee in (0, 'anon'::regrole, 'authenticated'::regrole))
    union all
    (select r2.nesne || '.' || r2.ad || ' politika ' || r2.veri::text
       from guvenlik.site_erisim_yedek r2 where r2.tur = 'politika'
     except
     select p.tablename || '.' || p.policyname || ' politika ' ||
            jsonb_build_object('permissive', p.permissive, 'cmd', p.cmd, 'roles', to_jsonb(p.roles), 'qual', p.qual, 'with_check', p.with_check)::text
       from pg_policies p where p.schemaname = 'public' and p.tablename in ('site_oturumlari', 'site_hesaplari', 'site_giris_kaydi', 'site_kayit_talepleri'))
    union all
    (select p.tablename || '.' || p.policyname || ' politika (yedekte yok)'
       from pg_policies p where p.schemaname = 'public' and p.tablename in ('site_oturumlari', 'site_hesaplari', 'site_giris_kaydi', 'site_kayit_talepleri')
        and p.roles && array['authenticated', 'anon', 'public']::name[]
     except
     select r2.nesne || '.' || r2.ad || ' politika (yedekte yok)' from guvenlik.site_erisim_yedek r2 where r2.tur = 'politika')
    union all
    select r2.nesne || ' gövdesi yedekten farklı'
      from guvenlik.site_erisim_yedek r2 left join pg_proc p on p.oid = to_regprocedure(r2.nesne)
     where r2.tur = 'fonksiyon'
       and (md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) is distinct from r2.ozet
            or p.proacl::text is distinct from r2.acl::text)
    union all
    select 'site_yonetici_kapisi() hâlâ var' where to_regprocedure('public.site_yonetici_kapisi()') is not null
  ) z;
  if fark is not null then
    raise exception 'Geri alma sonrası yedekle birebir değil: %. İşlem geri alındı, hiçbir şey değişmedi.', fark;
  end if;
end $$;

create temp table site_19_geri_sonuc on commit drop as
select 1 as sira, 'geri kurulan: tablo / sütun / sıra yetkisi · politika · fonksiyon' as kontrol,
       (select count(*) filter (where tur = 'tablo_acl') || ' / ' || count(*) filter (where tur = 'sutun_acl') || ' / ' || count(*) filter (where tur = 'sira_acl')
               || ' · ' || count(*) filter (where tur = 'politika') || ' · ' || count(*) filter (where tur = 'fonksiyon') from guvenlik.site_erisim_yedek) as sonuc,
       'bilgi' as durum
union all
select 2, 'doğrulama: yetkiler, politikalar, fonksiyon gövdeleri yedekle birebir; site_yonetici_kapisi() silindi', 'true', 'tamam'
union all
select 3, 'UYARI: 19''un kapattığı açıklar yeniden AÇIK (tablolar authenticated''a, yönetim işlemleri her ERP kullanıcısına)', '', 'bilgi';

delete from guvenlik.site_erisim_yedek;

select kontrol, sonuc, durum from site_19_geri_sonuc order by sira;
commit;
