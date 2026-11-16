-- =====================================================================================================================
--  18-site-tablo-politika-salt-okur.sql — SİTE TABLOLARI (politika + yetki) ve HESAP YÖNETİMİ FONKSİYONLARI (yetkilendirme)
-- =====================================================================================================================
--  SALT OKUNUR: `begin transaction read only … rollback`. Hiçbir fonksiyon ÇAĞRILMAZ; tablo içeriği okunmaz — yalnız katalog
--  ve SAYILAR (e-posta, anahtar, kimlik değeri gösterilmez).
--  Neden: 17 (canlı, 16 Kasım) site_oturumlari / site_hesaplari / site_giris_kaydi / site_kayit_talepleri tablolarında
--  authenticated'a SELECT/INSERT/UPDATE/DELETE buldu; rls-kimlik.sql bu tablolara `giris_yapmis_hersey` (for all to authenticated
--  using true) politikası da kuruyor. Ayrıca hesap yönetimi fonksiyonlarında (şifre belirle, erişimi kapat, kayıt onayla / reddet)
--  depoda rol kontrolü yok: giriş yapmış her ERP kullanıcısı başka bir müşterinin şifresini değiştirebilir.
--  Çalıştırma: Supabase › SQL Editor › bu dosyanın TAMAMI › Run. Sonuç: bolum · kontrol · beklenen · sonuc · durum.
--  durum: tamam | AÇIK (doğrulanmış açık) | FARKLI (beklenenden ayrı; açıklamasıyla değerlendirilir) | bilgi.
--  Not: dosyada çıplak dolar karakteri yok (SQL Editor'ün ifade ayırıcısı, editor-icin.py).
-- =====================================================================================================================
begin transaction read only;

with
t(ad) as (values ('site_oturumlari'), ('site_hesaplari'), ('site_giris_kaydi'), ('site_kayit_talepleri'), ('site_talepleri')),
k as (select t.ad, to_regclass('public.' || t.ad) as oid from t),
-- Hesap yönetimi fonksiyonları. depo_eski = bugünkü depo (korumasız), depo_yeni = 19 sonrası (yönetici kapılı) gövde md5'i
-- (17 ile aynı ölçüm: yorumlar ve boşluklar yok sayılır).
f(ad, imza, kapi_gerekir, depo_eski, depo_yeni, sira) as (values
  ('site_hesap_kaydet',  'text, text, text', true,  '4fe1101e544cec91a4b0d67524e21dc7', 'c83d1cbd5d25392c2fe3492501c967f3', 1),
  ('site_hesap_sil',     'text',             true,  '4825c310d535b2902844b1b7ad46be29', '7878219eccd2d5b255388a18ac8be066', 2),
  ('site_kayit_onayla',  'text, text',       true,  '616aeb5e7dd3add79991661ceaec3ebe', '86debf97b2f8ae9c1845f85900e65492', 3),
  ('site_kayit_reddet',  'text',             true,  '471f66f924ea4f713e4115113cb5b0a7', '071e82fa3ad4c6eb0d2be0c2e6047cbe', 4),
  ('site_hesap_bilgi',   'text',             false, '235e1054a82a78494c9178438755dfed', '235e1054a82a78494c9178438755dfed', 5),
  ('site_hesap_listesi', '',                 false, '1a10b2699d643613ed8a5fe6e01caf80', '1a10b2699d643613ed8a5fe6e01caf80', 6),
  ('site_kayit_listesi', '',                 false, '87f0ddde3354937b8203af44a92b4368', '87f0ddde3354937b8203af44a92b4368', 7),
  ('site_raporu',        'integer',          false, '3027012af98a34f0d8d75f4105d55c62', '3027012af98a34f0d8d75f4105d55c62', 8),
  ('site_talep_reddet',  'text, text',       false, '061737a174f3ae2bdb635a84dd40d016', '061737a174f3ae2bdb635a84dd40d016', 9)),
fp as (
  select f.*, to_regprocedure('public.' || f.ad || '(' || f.imza || ')') as oid from f
),
fd as (
  select fp.*, p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) as sahip, l.lanname,
         md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) as md5_canli,
         (p.prosrc ~ '\m(yonetici_mi|site_yonetici_kapisi|yetki_var_mi)\M') as kapi_var
  from fp left join pg_proc p on p.oid = fp.oid left join pg_language l on l.oid = p.prolang
),
-- Dört özel tabloya başvuran BÜTÜN fonksiyonlar (sistem şemaları dışında) — depoda olmayanlar da yakalansın.
ref as (
  select p.oid, n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as ad, p.prosecdef,
         pg_get_userbyid(p.proowner) as sahip,
         has_function_privilege('anon', p.oid, 'execute') as anon_x, has_function_privilege('authenticated', p.oid, 'execute') as auth_x,
         exists (select 1 from pg_trigger g where g.tgfoid = p.oid) as tetikleyici
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema') and n.nspname not like 'pg\_%'
    and p.prosrc ~ '\m(site_oturumlari|site_hesaplari|site_giris_kaydi|site_kayit_talepleri)\M'
),
-- Giriş sistemi ve yöneticiler (yonetici_mi ile aynı e-posta eşlemesi; yalnız SAYI).
erp as (
  select coalesce(k2 ->> 'rol', '') as rol,
         case when coalesce(k2 ->> 'eposta', '') <> '' then lower(k2 ->> 'eposta')
              else regexp_replace(lower(translate(coalesce(k2 ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local' end as eposta
  from public.tanimlar tt, jsonb_array_elements(coalesce(tt.veri -> 'kullanicilar', '[]'::jsonb)) k2 where tt.id = 'tekil'
),
satirlar(sira, bolum, kontrol, beklenen, sonuc, durum) as (
  -- ================= A) TABLOLAR =================
  select 100 + row_number() over (order by k.ad), 'A tablo · politika', k.ad || ': authenticated / anon / public''e uyan politikalar',
         case when k.ad = 'site_talepleri' then 'giris_yapmis_hersey (ERP talepleri doğrudan işler)' else 'yok' end,
         coalesce((select string_agg(p.policyname || ' [' || p.cmd || ' : ' || coalesce(p.qual, '-') || ' | ' || coalesce(p.with_check, '-') || '] → '
                                     || array_to_string(p.roles, ','), '; ' order by p.policyname)
                   from pg_policies p where p.schemaname = 'public' and p.tablename = k.ad
                     and p.roles && array['authenticated', 'anon', 'public']::name[]), case when k.oid is null then 'tablo yok' else 'yok' end),
         case when k.oid is null or k.ad = 'site_talepleri' then 'bilgi'
              when exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = k.ad
                             and p.roles && array['authenticated', 'anon', 'public']::name[]) then 'FARKLI' else 'tamam' end
  from k
  union all
  select 110 + row_number() over (order by k.ad), 'A tablo · yetki', k.ad || ': RLS · force · authenticated S/I/U/D · sütun yetkisi · anon S',
         case when k.ad = 'site_talepleri' then 'açık · — · ✓✓✓✓ · — · ✗' else 'açık · — · ✗✗✗✗ · yok · ✗' end,
         case when k.oid is null then 'tablo yok' else
           (select case when c.relrowsecurity then 'açık' else 'KAPALI' end || ' · ' || case when c.relforcerowsecurity then 'force' else '—' end
            from pg_class c where c.oid = k.oid) || ' · ' ||
           (select string_agg(case when has_table_privilege('authenticated', k.oid, x) then '✓' else '✗' end, '' order by o)
            from unnest(array['select', 'insert', 'update', 'delete']) with ordinality u(x, o)) || ' · ' ||
           case when exists (select 1 from pg_attribute a, aclexplode(a.attacl) e where a.attrelid = k.oid and a.attacl is not null
                               and e.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)) then 'VAR' else
                case when k.ad = 'site_talepleri' then '—' else 'yok' end end || ' · ' ||
           case when has_table_privilege('anon', k.oid, 'select') then '✓' else '✗' end end,
         'bilgi'
  from k
  union all
  -- Gerçek erişim = tablo yetkisi VE ona uyan politika (RLS açıkken). İkisi birlikteyse satırlar okunur.
  select 120 + row_number() over (order by k.ad), 'A tablo · erişim', k.ad || ': giriş yapmış HER ERP kullanıcısı satırları okuyabilir mi',
         case when k.ad = 'site_talepleri' then 'evet (beklenen)' else 'hayır' end,
         case when k.oid is null then 'tablo yok'
              when has_table_privilege('authenticated', k.oid, 'select')
                   and (not (select relrowsecurity from pg_class where oid = k.oid)
                        or exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = k.ad and p.cmd in ('SELECT', 'ALL')
                                     and p.roles && array['authenticated', 'public']::name[])) then 'evet' else 'hayır' end,
         case when k.oid is null or k.ad = 'site_talepleri' then 'bilgi'
              when has_table_privilege('authenticated', k.oid, 'select')
                   and (not (select relrowsecurity from pg_class where oid = k.oid)
                        or exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = k.ad and p.cmd in ('SELECT', 'ALL')
                                     and p.roles && array['authenticated', 'public']::name[])) then 'AÇIK' else 'tamam' end
  from k
  union all
  select 130, 'A tablo · erişim', 'site_giris_kaydi_id_seq: authenticated / anon kullanım yetkisi', 'yok',
         coalesce((select case when has_sequence_privilege('authenticated', s.oid, 'usage') or has_sequence_privilege('anon', s.oid, 'usage') then 'var' else 'yok' end
                   from pg_class s where s.oid = to_regclass('public.site_giris_kaydi_id_seq')), 'sıra yok'),
         'bilgi'

  -- ================= B) HESAP YÖNETİMİ FONKSİYONLARI =================
  union all
  select 200 + fd.sira, 'B yönetim · tanım', fd.ad || ': var · definer · sahip · yol · dil',
         'var · definer · postgres · sabit',
         case when fd.oid is null then 'YOK' else 'var · ' || case when fd.prosecdef then 'definer' else 'INVOKER' end || ' · ' || fd.sahip || ' · '
              || coalesce((select substr(c, 13) from unnest(fd.proconfig) c where c like 'search_path=%'), 'YOL SABİT DEĞİL') || ' · ' || fd.lanname end,
         case when fd.oid is null then 'FARKLI'
              when fd.ad = 'site_talep_reddet' then 'bilgi'   -- invoker: yalnız site_talepleri (ERP'ye açık tablo)
              when fd.prosecdef and fd.sahip = 'postgres' and exists (select 1 from unnest(fd.proconfig) c where c like 'search_path=%') then 'tamam'
              else 'FARKLI' end
  from fd
  union all
  select 220 + fd.sira, 'B yönetim · çağırma', fd.ad || ': çalıştırabilen (anon / authenticated / PUBLIC / service_role)',
         'anon ✗ · authenticated ✓ · PUBLIC ✗',
         case when fd.oid is null then '—' else
           'anon ' || case when has_function_privilege('anon', fd.oid, 'execute') then '✓' else '✗' end ||
           ' · authenticated ' || case when has_function_privilege('authenticated', fd.oid, 'execute') then '✓' else '✗' end ||
           ' · PUBLIC ' || case when exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) e
                                              where p.oid = fd.oid and e.grantee = 0) then '✓' else '✗' end ||
           ' · service_role ' || case when has_function_privilege('service_role', fd.oid, 'execute') then '✓' else '✗' end end,
         case when fd.oid is null then 'bilgi'
              when has_function_privilege('anon', fd.oid, 'execute')
                   or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) e where p.oid = fd.oid and e.grantee = 0)
                then 'AÇIK' else 'tamam' end
  from fd
  union all
  -- Yazan işlemler yönetici kapılı olmalı. Kapısızsa: giriş yapmış HER ERP kullanıcısı (rolü ne olursa olsun) bu işlemi yapar.
  select 240 + fd.sira, 'B yönetim · yetkilendirme', fd.ad || ': gövdede yönetici kontrolü (yonetici_mi / site_yonetici_kapisi)',
         case when fd.kapi_gerekir then 'var (yalnız Yönetici)' else 'gerekmez (okuma / ERP talep işi)' end,
         case when fd.oid is null then '—' when fd.kapi_var then 'var' else 'yok' end,
         case when fd.oid is null or not fd.kapi_gerekir then 'bilgi'
              when fd.kapi_var then 'tamam'
              when has_function_privilege('authenticated', fd.oid, 'execute') then 'AÇIK'
              else 'FARKLI' end
  from fd
  union all
  select 260 + fd.sira, 'B yönetim · depo', fd.ad || ': canlı gövde md5 (yorum / boşluk yok sayılır)',
         case when fd.depo_eski = fd.depo_yeni then fd.depo_eski else 'depo (korumasız) ' || fd.depo_eski || ' | 19 sonrası ' || fd.depo_yeni end,
         coalesce(fd.md5_canli, 'YOK') || case when fd.md5_canli = fd.depo_eski and fd.depo_eski <> fd.depo_yeni then ' = depo (korumasız)'
                                               when fd.md5_canli = fd.depo_yeni and fd.depo_eski <> fd.depo_yeni then ' = 19 sonrası'
                                               when fd.md5_canli = fd.depo_eski then ' = depo' else ' ≠ depo' end,
         case when fd.md5_canli in (fd.depo_eski, fd.depo_yeni) then 'tamam' else 'FARKLI' end
  from fd
  union all
  select 280, 'B yönetim · tanım', 'site_yonetici_kapisi(): var · çalıştırabilen anon / authenticated / PUBLIC', 'öncesi yok · sonrası var · ✗ ✗ ✗',
         case when to_regprocedure('public.site_yonetici_kapisi()') is null then 'yok' else
           'var · ' || case when has_function_privilege('anon', to_regprocedure('public.site_yonetici_kapisi()'), 'execute') then '✓' else '✗' end || ' '
                    || case when has_function_privilege('authenticated', to_regprocedure('public.site_yonetici_kapisi()'), 'execute') then '✓' else '✗' end || ' '
                    || case when exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) e
                                          where p.oid = to_regprocedure('public.site_yonetici_kapisi()') and e.grantee = 0) then '✓' else '✗' end end,
         'bilgi'

  -- ================= C) BU TABLOLARA BAŞVURAN HER ŞEY (depoda olmayanlar dahil) =================
  union all
  select 300 + row_number() over (order by ref.ad), 'C başvuran fonksiyon', ref.ad,
         'definer (tablo yetkisi alınınca invoker bozulur)',
         case when ref.prosecdef then 'definer' else 'INVOKER' end || ' · sahip ' || ref.sahip || ' · anon ' || case when ref.anon_x then '✓' else '✗' end
           || ' · authenticated ' || case when ref.auth_x then '✓' else '✗' end || case when ref.tetikleyici then ' · TETİKLEYİCİ' else '' end,
         case when ref.prosecdef then 'tamam' else 'FARKLI' end
  from ref
  union all
  select 390, 'C başvuran görünüm', 'bu dört tabloya başvuran görünüm (security_invoker olanlar tablo yetkisi alınınca bozulur)', 'yok',
         coalesce((select string_agg(v.schemaname || '.' || v.viewname, ', ') from pg_views v
                   where v.schemaname not in ('pg_catalog', 'information_schema')
                     and v.definition ~ '\m(site_oturumlari|site_hesaplari|site_giris_kaydi|site_kayit_talepleri)\M'), 'yok'),
         case when exists (select 1 from pg_views v where v.schemaname not in ('pg_catalog', 'information_schema')
                             and v.definition ~ '\m(site_oturumlari|site_hesaplari|site_giris_kaydi|site_kayit_talepleri)\M') then 'FARKLI' else 'tamam' end

  -- ================= D) GİRİŞ SİSTEMİ VE YÖNETİCİLER (yönetici kapısının çalışması için) =================
  union all
  select 400, 'D giriş', 'Tanımlar: giriş sistemi açık (girisAktifMi)', 'true',
         coalesce((select coalesce(veri ->> 'girisAktifMi', '(yok)') from public.tanimlar where id = 'tekil'), '(tanimlar yok)'),
         case when (select coalesce((veri ->> 'girisAktifMi')::boolean, false) from public.tanimlar where id = 'tekil') then 'tamam' else 'FARKLI' end
  union all
  select 401, 'D giriş', 'ERP kullanıcıları rol dağılımı (rol: adet)', '',
         coalesce((select string_agg(r || ': ' || n, ', ' order by r) from (select coalesce(nullif(rol, ''), '(boş)') r, count(*) n from erp group by 1) x), '—'),
         'bilgi'
  union all
  select 402, 'D giriş', 'Yönetici: Tanımlar''da / bulut hesabı (auth.users) olan', '≥1 / ≥1',
         (select count(*) from erp where rol = 'Yönetici') || ' / ' ||
         (select count(*) from erp where rol = 'Yönetici' and exists (select 1 from auth.users u where lower(u.email) = erp.eposta)),
         case when (select count(*) from erp where rol = 'Yönetici' and exists (select 1 from auth.users u where lower(u.email) = erp.eposta)) >= 1
              then 'tamam' else 'FARKLI' end
  union all
  select 403, 'D giriş', 'auth.users: toplam / ERP kullanıcı listesinde OLMAYAN / son 30 günde oluşturulan', '— / 0 / —',
         (select count(*) || ' / ' || count(*) filter (where lower(coalesce(u.email, '')) not in (select eposta from erp)) || ' / '
                 || count(*) filter (where u.created_at > now() - interval '30 days') from auth.users u),
         case when (select count(*) from auth.users u where lower(coalesce(u.email, '')) not in (select eposta from erp)) = 0 then 'tamam' else 'FARKLI' end

  -- ================= E) 17'deki "carisi ERP'de bulunmayan 3 hesap" (değer gösterilmez) =================
  union all
  select 500, 'E hesap', 'carisi bulunmayan hesapların cari_id biçimi (uzunluk · uuid biçimli · sayısal) ×adet', '',
         coalesce((select string_agg(b || ' ×' || n, ', ') from (
            select length(h.cari_id) || ' · ' || (h.cari_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\Z') || ' · ' || (h.cari_id ~ '^[0-9]+\Z') b, count(*) n
            from public.site_hesaplari h where not exists (select 1 from public.cariler c where c.id::text = h.cari_id) group by 1) x), 'yok'),
         'bilgi'
  union all
  select 501, 'E hesap', 'karşılaştırma: cariler.id türü · uzunluk aralığı', '',
         (select format_type(a.atttypid, a.atttypmod) from pg_attribute a where a.attrelid = 'public.cariler'::regclass and a.attname = 'id')
           || ' · ' || coalesce((select min(length(id::text)) || '–' || max(length(id::text)) from public.cariler), '—'),
         'bilgi'
)
select bolum, kontrol, beklenen, sonuc, durum from satirlar order by sira;

rollback;
