-- =====================================================================================================================
--  17-site-fonksiyon-denetim-salt-okur.sql — CANLIDAKİ SİTE / PORTAL FONKSİYONLARI: gövde, yetki, oturum doğrulaması, cari ayrımı
-- =====================================================================================================================
--  SALT OKUNUR: tamamı `begin transaction read only … rollback` içinde; hiçbir fonksiyon ÇAĞRILMAZ (yalnız katalog okunur), müşteri
--  tablolarından yalnız SAYI alınır (ad, kullanıcı adı, anahtar, şifre özeti okunmaz / gösterilmez). Gizli değer görünümündeki uzun
--  dizgeler (anahtar, JWT, 40+ karakterlik belirteç) gövde gösteriminde "‹gizlendi›" olarak maskelenir.
--  Çalıştırma: Supabase › SQL Editor › New query › bu dosyanın TAMAMI › Run. Tek sonuç tablosu: bolum · kontrol · beklenen · sonuc · durum.
--  durum: tamam | FARKLI (beklenenden ayrı — kendiliğinden AÇIK demek değil, satırın açıklamasıyla birlikte değerlendirilir) | bilgi.
--
--  Neye bakılır:
--   1 envanter   — 8 site fonksiyonu + yonetici_mi + iç yardımcılar (site_kod_cari, site_modeller, site_pb): tek tanım, beklenen imza.
--   2 yetki      — SECURITY DEFINER, sabit search_path (ve yoldaki şemalarda anon/authenticated CREATE yok), sahip, kimin çalıştırabildiği
--                  (anon / authenticated / PUBLIC / service_role). İç yardımcılar girişsize KAPALI olmalı: site_modeller(p_cari_id)
--                  anon'a açık olsaydı herkes istediği carinin fiyatını görebilirdi — cari ayrımı buna dayanıyor.
--   3 oturum     — oturum anahtarı → cari çözümü (site_kod_cari): süresi dolmamış, hesabı var, cari pasif değil. Portal fonksiyonları
--                  cariyi YALNIZ bu çözümden alır (parametrede cari yok), çözüm boşsa hata verir.
--   4 cari ayrımı— gövdede `cari_id` / `'cariId'` geçen her eşitliğin öbür tarafı oturumdan gelen `c.id` mi?
--   5 depo       — canlı gövde depodaki (site-portal.sql / rls-rol.sql) gövdeyle aynı mı (yorumlar ve boşluklar yok sayılarak md5).
--                  FARKLI: canlı tanım başka bir sürüm — gövdesini 9. bölümde incele; açık olduğu anlamına gelmez.
--   6 tablolar   — site tablolarında RLS ve anon / authenticated tablo + sütun yetkileri.
--   7 sayılar    — oturum / hesap tablolarında yalnız sayılar (süre aşımı, anahtar uzunluğu, şifre özeti biçimi).
--   8 gizli      — gövdelerde gizli değer benzeri dizge sayısı (içerik gösterilmez).
--   9 tanım      — canlı gövdeler (maskeli), elle okumak için.
--  Not: dosyada çıplak dolar karakteri yok (SQL Editor'ün ifade ayırıcısını şaşırtıyor, editor-icin.py).
-- =====================================================================================================================
begin transaction read only;

with
hedef(ad, tur, imza, depo_md5, sira) as (values
  ('portal_giris',        'site',     'p_kullanici text, p_sifre text',                                   'ec53a289cf1dffd6471d3e6b3b940d27', 1),
  ('portal',              'site',     'p_kod text',                                                       '6adc9aeb0147c76aa7fe63d8983c4718', 2),
  ('portal_hesap',        'site',     'p_kod text, p_baslangic date, p_bitis date',                       '79c3380f225c8c3c34a8aca8bfcdbb31', 3),
  ('portal_siparis',      'site',     'p_kod text, p_kalemler jsonb, p_not text, p_odeme jsonb',          'e2a670fbc2c97b28df3e59cc6a50f122', 4),
  ('portal_cikis',        'site',     'p_kod text',                                                       '6e3ecf82069b86b3c9675fd33cb054d7', 5),
  ('site_kayit_ol',       'site',     'p_bilgi jsonb, p_kullanici text, p_sifre text',                    'a91a796bcfc7986c7ab5f8c399083dec', 6),
  ('herkese_acik_vitrin', 'site',     '',                                                                 '4154bda0c15b148628f89d5aadf89845', 7),
  ('site_ayarlari',       'site',     '',                                                                 'e330b92cf54afcde0efc75bc557007df', 8),
  ('yonetici_mi',         'erp',      '',                                                                 '75d83f02d081b107c7aef40a93c67bd9', 9),
  ('site_kod_cari',       'yardimci', 'p_kod text',                                                       '137731c5b59ecf2fc6f43a28cb06d113', 10),
  ('site_modeller',       'yardimci', 'p_cari_id text, p_grup text',                                      '9c70faad94dcaf2c3baca16f2e89489b', 11),
  ('site_pb',             'yardimci', 'p text',                                                           '1ca335c0c0c712f3deaa0677f4b2a6eb', 12)
),
f as (
  select h.ad, h.tur, h.imza, h.depo_md5, h.sira, p.oid, p.prosecdef, p.proconfig, p.prosrc,
         pg_get_function_identity_arguments(p.oid) as args, pg_get_userbyid(p.proowner) as sahip,
         -- yorumsuz gövde: kalıp aramaları yorumdaki sözcüklere takılmasın
         regexp_replace(p.prosrc, '--[^\n]*', '', 'g') as kod,
         (select substr(c, 13) from unnest(p.proconfig) c where c like 'search_path=%') as yol,
         has_function_privilege('anon', p.oid, 'execute') as anon_x,
         has_function_privilege('authenticated', p.oid, 'execute') as auth_x,
         has_function_privilege('service_role', p.oid, 'execute') as servis_x,
         exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') as public_x
  from hedef h
  left join pg_proc p on p.proname = h.ad and p.pronamespace = 'public'::regnamespace
),
tanim_sayisi as (select ad, count(oid) n, string_agg(coalesce(args, '—'), ' | ') imzalar from f group by ad),
-- Yoldaki şemalar (pg_temp / pg_catalog hariç): anon ya da authenticated orada nesne YARATABİLİYORSA yol sabit olsa da gölgeleme mümkün.
yol_sema as (
  select f.ad, trim(both ' "' from s) as sema from f, unnest(string_to_array(coalesce(f.yol, ''), ',')) s
  where trim(both ' "' from s) not in ('', 'pg_temp', 'pg_catalog')
),
yol_yazilabilir as (
  select y.ad, string_agg(y.sema || '(' ||
           case when n.oid is null then 'yok' else
             concat_ws('/', case when has_schema_privilege('anon', n.oid, 'CREATE') then 'anon CREATE' end,
                            case when has_schema_privilege('authenticated', n.oid, 'CREATE') then 'authenticated CREATE' end) end || ')', ', ') as yazilabilir
  from yol_sema y left join pg_namespace n on n.nspname = y.sema
  where n.oid is null or has_schema_privilege('anon', n.oid, 'CREATE') or has_schema_privilege('authenticated', n.oid, 'CREATE')
  group by y.ad
),
-- Cari ayrımı: gövdedeki her `X = Y` eşitliğinden bir tarafı cari kimliği olanlar; öbür taraf (::text atılarak).
esitlik as (
  select f.ad, m[1] as sol, m[2] as sag
  from f, regexp_matches(f.kod, '([A-Za-z0-9_.>''-]+(?:::text)?)\s*=\s*([A-Za-z0-9_.>''-]+(?:::text)?)', 'g') m
  where f.tur = 'site' and f.ad in ('portal', 'portal_hesap', 'portal_siparis')
),
cari_es as (
  select ad, replace(case when sol ~* 'cari_?id' then sag else sol end, '::text', '') as obur
  from esitlik where sol ~* 'cari_?id' or sag ~* 'cari_?id'
),
satirlar(sira, bolum, kontrol, beklenen, sonuc, durum) as (
  -- ---------------- 1 envanter ----------------
  select 100 + h.sira, '1 envanter', h.ad || ': tanım sayısı · imza', '1 · ' || coalesce(nullif(h.imza, ''), '(parametresiz)'),
         t.n || ' · ' || coalesce(nullif(t.imzalar, ''), '(parametresiz)'),
         case when t.n = 1 and t.imzalar = h.imza then 'tamam' else 'FARKLI' end
  from hedef h join tanim_sayisi t on t.ad = h.ad

  -- ---------------- 2 yetki ----------------
  union all
  select 200 + f.sira, '2 yetki', f.ad || ': definer · yol · sahip',
         case when f.ad = 'site_pb' then 'yol sabit (invoker olabilir; yalnız metin çevirir)' else 'definer · yol sabit' end,
         case when f.oid is null then 'YOK' else
           case when f.prosecdef then 'definer' else 'invoker' end || ' · yol=' || coalesce(f.yol, 'SABİT DEĞİL') || ' · sahip=' || f.sahip end,
         case when f.oid is null then 'FARKLI'
              when f.yol is null then 'FARKLI'
              when f.ad <> 'site_pb' and not f.prosecdef then 'FARKLI'
              else 'tamam' end
  from f
  union all
  select 220 + f.sira, '2 yetki', f.ad || ': çalıştırabilen (anon / authenticated / PUBLIC / service_role)',
         case f.tur when 'site' then 'anon ✓ · authenticated ✓ · PUBLIC ✗'
                    when 'erp' then 'anon ✓ (RLS politikalarında çağrılıyor; girişsizde false döner) · authenticated ✓'
                    else case when f.ad = 'site_pb' then 'anon ✗ · PUBLIC ✗ (authenticated önemsiz: invoker, yalnız para birimi metni çevirir)'
                              else 'anon ✗ · authenticated ✗ · PUBLIC ✗ (yalnız definer fonksiyonların içinden)' end end,
         case when f.oid is null then 'YOK' else
           'anon ' || case when f.anon_x then '✓' else '✗' end || ' · authenticated ' || case when f.auth_x then '✓' else '✗' end ||
           ' · PUBLIC ' || case when f.public_x then '✓' else '✗' end || ' · service_role ' || case when f.servis_x then '✓' else '✗' end end,
         case when f.oid is null then 'FARKLI'
              when f.tur = 'site' and f.anon_x and f.auth_x and not f.public_x then 'tamam'
              when f.tur = 'erp' and f.anon_x and f.auth_x then 'tamam'
              when f.tur = 'yardimci' and not f.anon_x and not f.public_x and (not f.auth_x or f.ad = 'site_pb') then 'tamam'
              else 'FARKLI' end
  from f
  union all
  select 240 + f.sira, '2 yetki', f.ad || ': yoldaki şemada anon / authenticated nesne yaratabilir mi', 'hiçbiri',
         coalesce(y.yazilabilir, 'hiçbiri'), case when y.yazilabilir is null then 'tamam' else 'FARKLI' end
  from f left join yol_yazilabilir y on y.ad = f.ad where f.oid is not null
  union all
  select 260, '2 yetki', 'public şemasında anon / authenticated / PUBLIC CREATE', 'false · false · false',
         has_schema_privilege('anon', 'public', 'CREATE') || ' · ' || has_schema_privilege('authenticated', 'public', 'CREATE') || ' · ' ||
         coalesce((select bool_or(a.grantee = 0 and a.privilege_type = 'CREATE') from pg_namespace n, aclexplode(n.nspacl) a where n.nspname = 'public'), false),
         case when has_schema_privilege('anon', 'public', 'CREATE') or has_schema_privilege('authenticated', 'public', 'CREATE') then 'FARKLI' else 'tamam' end
  union all
  -- Parametresinde cari kimliği alan HER public fonksiyon (ERP'nin site_hesap_*, site_kayit_onayla … dahil) girişsize kapalı olmalı:
  -- bunlar oturum doğrulamadan cari kimliğine güvenir.
  select 270, '2 yetki', 'anon''un çalıştırabildiği, parametresinde cari kimliği olan fonksiyon (ad)', '0',
         coalesce((select count(*) || ': ' || string_agg(p.proname, ', ' order by p.proname) from pg_proc p
                   where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute')
                     and pg_get_function_identity_arguments(p.oid) ~* 'cari'
                   having count(*) > 0), '0'),
         case when exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute')
                             and pg_get_function_identity_arguments(p.oid) ~* 'cari') then 'FARKLI' else 'tamam' end
  union all
  select 271, '2 yetki', 'anon''un çalıştırabildiği public fonksiyonlar (ad)', '8 site + yonetici_mi',
         (select count(*) || ': ' || string_agg(p.proname, ', ' order by p.proname) from pg_proc p
          where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute')),
         case when (select array_agg(p.proname::text order by p.proname) from pg_proc p
                    where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute'))
                   = array['herkese_acik_vitrin','portal','portal_cikis','portal_giris','portal_hesap','portal_siparis','site_ayarlari','site_kayit_ol','yonetici_mi']
              then 'tamam' else 'FARKLI' end

  -- ---------------- 3 oturum doğrulaması ----------------
  union all
  select 300, '3 oturum', 'site_kod_cari: anahtar eşleşmesi · süresi dolmamış · hesabı var · cari pasif değil · tek satır',
         'true · true · true · true · true',
         concat_ws(' · ', kod ~* 'anahtar\s*=\s*coalesce\(\s*p_kod', kod ~* 'bitis\s*>\s*now\(\)', kod ~* 'join\s+site_hesaplari',
                   kod ~* 'not\s+coalesce\(\s*c\.pasif', kod ~* 'limit\s+1'),
         case when kod ~* 'anahtar\s*=\s*coalesce\(\s*p_kod' and kod ~* 'bitis\s*>\s*now\(\)' and kod ~* 'join\s+site_hesaplari'
                   and kod ~* 'not\s+coalesce\(\s*c\.pasif' and kod ~* 'limit\s+1' then 'tamam' else 'FARKLI' end
  from f where ad = 'site_kod_cari' and oid is not null
  union all
  select 310 + f.sira, '3 oturum', f.ad || ': cari oturumdan (site_kod_cari(p_kod)) · çözüm boşsa hata · parametrede cari yok',
         'true · true · true',
         concat_ws(' · ', f.kod ~* 'from\s+public\.site_kod_cari\(\s*p_kod\s*\)', f.kod ~* 'if\s+c\.id\s+is\s+null\s+then\s+raise', f.args !~* 'cari'),
         case when f.kod ~* 'from\s+public\.site_kod_cari\(\s*p_kod\s*\)' and f.kod ~* 'if\s+c\.id\s+is\s+null\s+then\s+raise' and f.args !~* 'cari'
              then 'tamam' else 'FARKLI' end
  from f where f.ad in ('portal', 'portal_hesap', 'portal_siparis') and f.oid is not null
  union all
  select 320 + f.sira, '3 oturum', f.ad || ': site_modeller yalnız oturum carisiyle (çağrı sayısı / c.id ile)', 'eşit',
         (select count(*) from regexp_matches(f.kod, 'site_modeller\(', 'g')) || ' / ' ||
         (select count(*) from regexp_matches(f.kod, 'site_modeller\(\s*c\.id\s*,', 'g')),
         case when (select count(*) from regexp_matches(f.kod, 'site_modeller\(', 'g')) = (select count(*) from regexp_matches(f.kod, 'site_modeller\(\s*c\.id\s*,', 'g'))
              then 'tamam' else 'FARKLI' end
  from f where f.ad in ('portal', 'portal_siparis') and f.oid is not null
  union all
  select 330, '3 oturum', 'portal_giris: şifre crypt ile · anahtar gen_random_bytes(32) · hatalı deneme kilidi · pasif cari girmez · bilinmeyen adda aynı cevap',
         'true · true · true · true · true',
         concat_ws(' · ', kod ~* 'crypt\(', kod ~* 'gen_random_bytes\(\s*32\s*\)', kod ~* 'hatali_deneme' and kod ~* 'kilit_bitis\s*>\s*now\(\)',
                   kod ~* 'c\.pasif', kod ~* 'pg_sleep'),
         case when kod ~* 'crypt\(' and kod ~* 'gen_random_bytes\(\s*32\s*\)' and kod ~* 'hatali_deneme' and kod ~* 'kilit_bitis\s*>\s*now\(\)'
                   and kod ~* 'c\.pasif' and kod ~* 'pg_sleep' then 'tamam' else 'FARKLI' end
  from f where ad = 'portal_giris' and oid is not null
  union all
  select 331, '3 oturum', 'portal_giris: gövdedeki süreler (now() + interval)', '15 minutes (hatalı deneme kilidi), 30 days (oturum)',
         coalesce((select string_agg(m[1], ', ') from regexp_matches(kod, 'now\(\)\s*\+\s*interval\s*''([^'']+)''', 'g') m), 'bulunamadı'),
         case when kod ~* 'site_oturumlari\s+values\s*\([^;]*now\(\)\s*\+\s*interval\s*''30 days''' then 'tamam' else 'FARKLI' end
  from f where ad = 'portal_giris' and oid is not null
  union all
  select 340, '3 oturum', 'portal_cikis: yalnız verilen anahtarın oturumunu siler (başka tablo yok)', 'true',
         -- Gövdenin TAMAMI bu tek ifade olmalı (ek bir "or …" koşulu başkasının oturumunu da silebilirdi).
         (btrim(regexp_replace(lower(kod), '\s+', ' ', 'g')) in ('delete from site_oturumlari where anahtar = p_kod;', 'delete from site_oturumlari where anahtar = p_kod'))::text,
         case when btrim(regexp_replace(lower(kod), '\s+', ' ', 'g')) in ('delete from site_oturumlari where anahtar = p_kod;', 'delete from site_oturumlari where anahtar = p_kod') then 'tamam' else 'FARKLI' end
  from f where ad = 'portal_cikis' and oid is not null
  union all
  select 350, '3 oturum', 'site_kayit_ol: yalnız talep yazar (hesap / oturum açmaz) · şifre bcrypt · günlük sınır', 'true · true · true',
         concat_ws(' · ', kod !~* 'site_hesaplari\s*\(|into\s+site_hesaplari|into\s+site_oturumlari', kod ~* 'gen_salt\(\s*''bf''', kod ~* 'GUNLUK_SINIR'),
         case when kod !~* 'into\s+site_hesaplari|into\s+site_oturumlari' and kod ~* 'gen_salt\(\s*''bf''' and kod ~* 'GUNLUK_SINIR' then 'tamam' else 'FARKLI' end
  from f where ad = 'site_kayit_ol' and oid is not null
  union all
  select 360, '3 oturum', 'herkese_acik_vitrin: fiyat / cari / sipariş / stok miktarına dokunmaz · herkeseAcik + sitedeGoster süzgeci', 'true · true',
         concat_ws(' · ', kod !~* 'fiyat|cari|siparis|miktar', kod ~* 'herkeseAcik' and kod ~* 'sitedeGoster'),
         case when kod !~* 'fiyat|cari|siparis|miktar' and kod ~* 'herkeseAcik' and kod ~* 'sitedeGoster' then 'tamam' else 'FARKLI' end
  from f where ad = 'herkese_acik_vitrin' and oid is not null
  union all
  select 370, '3 oturum', 'site_ayarlari: yalnız siteAyarlari (+ isteğe bağlı logo); kullanıcılar / eposta / sifre seçilmez', 'true',
         (kod !~* 'kullanicilar|eposta|sifre')::text,
         case when kod !~* 'kullanicilar|eposta|sifre' then 'tamam' else 'FARKLI' end
  from f where ad = 'site_ayarlari' and oid is not null
  union all
  select 380, '3 oturum', 'yonetici_mi: kimlik JWT e-postasından; boş e-postada false; rol Yönetici', 'true · true · true',
         concat_ws(' · ', kod ~* 'auth\.jwt\(\)', kod ~* 'eposta\s*=\s*''''\s*then\s+return\s+false', kod ~* 'Yönetici'),
         case when kod ~* 'auth\.jwt\(\)' and kod ~* 'eposta\s*=\s*''''\s*then\s+return\s+false' and kod ~* 'Yönetici' then 'tamam' else 'FARKLI' end
  from f where ad = 'yonetici_mi' and oid is not null

  -- ---------------- 4 cari ayrımı ----------------
  union all
  select 400 + f.sira, '4 cari ayrımı', f.ad || ': cari kimliği eşitliklerinin öbür tarafı (değer ×adet)', 'yalnız c.id',
         coalesce((select string_agg(obur || ' ×' || n, ', ' order by obur) from (select obur, count(*) n from cari_es e where e.ad = f.ad group by obur) x), 'eşitlik yok'),
         case when not exists (select 1 from cari_es e where e.ad = f.ad) then case when f.ad = 'portal_siparis' then 'tamam' else 'FARKLI' end
              when exists (select 1 from cari_es e where e.ad = f.ad and e.obur <> 'c.id') then 'FARKLI' else 'tamam' end
  from f where f.ad in ('portal', 'portal_hesap', 'portal_siparis') and f.oid is not null
  union all
  select 420, '4 cari ayrımı', 'portal_siparis: talep oturum carisine yazılır (values (c.id, …)) · fiyat sunucuda (site_modeller)', 'true · true',
         concat_ws(' · ', kod ~* 'values\s*\(\s*c\.id\s*,', kod ~* '''birimFiyat''\s*,\s*m\.fiyat'),
         case when kod ~* 'values\s*\(\s*c\.id\s*,' and kod ~* '''birimFiyat''\s*,\s*m\.fiyat' then 'tamam' else 'FARKLI' end
  from f where ad = 'portal_siparis' and oid is not null
  union all
  select 430, '4 cari ayrımı', 'site_modeller: müşteri yalnız dahil olduğu site grubunun modelini görür (cariIdleri ? p_cari_id)', 'true',
         (kod ~* 'cariIdleri''\s*,\s*''\[\]''::jsonb\)\s*\?\s*p_cari_id')::text,
         case when kod ~* 'cariIdleri''\s*,\s*''\[\]''::jsonb\)\s*\?\s*p_cari_id' then 'tamam' else 'FARKLI' end
  from f where ad = 'site_modeller' and oid is not null

  -- ---------------- 5 depo karşılaştırması ----------------
  union all
  select 500 + f.sira, '5 depo', f.ad || ': canlı gövde = depodaki (yorum / boşluk yok sayılır)', f.depo_md5,
         coalesce(md5(btrim(regexp_replace(f.kod, '\s+', ' ', 'g'))), 'YOK'),
         case when md5(btrim(regexp_replace(f.kod, '\s+', ' ', 'g'))) = f.depo_md5 then 'tamam' else 'FARKLI' end
  from f

  -- ---------------- 6 site tabloları ----------------
  union all
  select 600 + row_number() over (order by t.ad), '6 tablolar',
         t.ad || ': RLS · anon tablo yetkisi · authenticated tablo yetkisi · anon/authenticated sütun yetkisi',
         'RLS açık · anon yok · authenticated ' || t.auth_beklenen || ' · sütun yok',
         case when c.oid is null then 'tablo yok' else
           case when c.relrowsecurity then 'RLS açık' else 'RLS KAPALI' end || ' · anon ' ||
           coalesce(nullif(concat_ws('/', case when has_table_privilege('anon', c.oid, 'SELECT') then 'SELECT' end, case when has_table_privilege('anon', c.oid, 'INSERT') then 'INSERT' end,
                                     case when has_table_privilege('anon', c.oid, 'UPDATE') then 'UPDATE' end, case when has_table_privilege('anon', c.oid, 'DELETE') then 'DELETE' end), ''), 'yok') ||
           ' · authenticated ' ||
           coalesce(nullif(concat_ws('/', case when has_table_privilege('authenticated', c.oid, 'SELECT') then 'SELECT' end, case when has_table_privilege('authenticated', c.oid, 'INSERT') then 'INSERT' end,
                                     case when has_table_privilege('authenticated', c.oid, 'UPDATE') then 'UPDATE' end, case when has_table_privilege('authenticated', c.oid, 'DELETE') then 'DELETE' end), ''), 'yok') ||
           ' · sütun ' || coalesce((select string_agg(distinct a.attname || ':' || g.privilege_type, ',') from pg_attribute a, aclexplode(a.attacl) g
                                    where a.attrelid = c.oid and a.attacl is not null and g.grantee in ('anon'::regrole, 'authenticated'::regrole, 0)), 'yok') end,
         case when c.oid is null then case when t.ad = 'site_bildirim_kaydi' then 'bilgi' else 'FARKLI' end
              when not c.relrowsecurity then 'FARKLI'
              when has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('anon', c.oid, 'INSERT')
                or has_table_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE') then 'FARKLI'
              when exists (select 1 from pg_attribute a, aclexplode(a.attacl) g where a.attrelid = c.oid and a.attacl is not null
                             and g.grantee in ('anon'::regrole, 0)) then 'FARKLI'
              when t.auth_beklenen = 'yok' and (has_table_privilege('authenticated', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'INSERT')
                or has_table_privilege('authenticated', c.oid, 'UPDATE') or has_table_privilege('authenticated', c.oid, 'DELETE')) then 'FARKLI'
              else 'tamam' end
  from (values ('site_hesaplari', 'yok'), ('site_oturumlari', 'yok'), ('site_giris_kaydi', 'yok'), ('site_kayit_talepleri', 'yok'),
               ('site_talepleri', 'ERP için olabilir'), ('site_bildirim_kaydi', 'SELECT (ERP okur)')) t(ad, auth_beklenen)
  left join pg_class c on c.oid = to_regclass('public.' || t.ad)

  -- ---------------- 7 sayılar (içerik okunmaz) ----------------
  union all
  select 700, '7 sayılar', 'geçerli oturum sayısı (bitis > now)', '', (select count(*) from public.site_oturumlari where bitis > now())::text, 'bilgi'
  union all
  select 701, '7 sayılar', 'bitişi 31 günden uzak oturum (giriş 30 gün veriyor)', '0',
         (select count(*) from public.site_oturumlari where bitis > now() + interval '31 days')::text,
         case when (select count(*) from public.site_oturumlari where bitis > now() + interval '31 days') = 0 then 'tamam' else 'FARKLI' end
  union all
  select 702, '7 sayılar', 'oturum anahtarı uzunluğu (en kısa / en uzun; 32 bayt hex = 64)', '64 / 64',
         coalesce((select min(length(anahtar)) || ' / ' || max(length(anahtar)) from public.site_oturumlari), 'oturum yok'),
         case when (select count(*) from public.site_oturumlari) = 0 or (select min(length(anahtar)) from public.site_oturumlari) >= 64 then 'tamam' else 'FARKLI' end
  union all
  select 703, '7 sayılar', 'geçerli oturumu olup hesabı silinmiş / carisi pasif olan (site_kod_cari bunları zaten reddeder)', '',
         (select count(*) from public.site_oturumlari o where o.bitis > now()
            and (not exists (select 1 from public.site_hesaplari h where h.cari_id = o.cari_id)
                 or exists (select 1 from public.cariler c where c.id::text = o.cari_id and coalesce(c.pasif, false))))::text, 'bilgi'
  union all
  select 704, '7 sayılar', 'site hesabı: toplam / şifre özeti bcrypt olmayan / şu an kilitli', '— / 0 / —',
         (select count(*) || ' / ' || count(*) filter (where sifre_ozeti !~ '^.2[abxy].') || ' / ' || count(*) filter (where kilit_bitis > now())
          from public.site_hesaplari),
         case when (select count(*) filter (where sifre_ozeti !~ '^.2[abxy].') from public.site_hesaplari) = 0 then 'tamam' else 'FARKLI' end
  union all
  select 705, '7 sayılar', 'site hesabı olup carisi ERP''de bulunmayan', '0',
         (select count(*) from public.site_hesaplari h where not exists (select 1 from public.cariler c where c.id::text = h.cari_id))::text,
         case when (select count(*) from public.site_hesaplari h where not exists (select 1 from public.cariler c where c.id::text = h.cari_id)) = 0 then 'tamam' else 'FARKLI' end
  union all
  select 706, '7 sayılar', 'kayıt talebi: bekleyen / sonuçlanmış ama şifre özeti duran', '— / 0',
         (select count(*) filter (where durum = 'yeni') || ' / ' || count(*) filter (where durum <> 'yeni' and sifre_ozeti is not null) from public.site_kayit_talepleri),
         case when (select count(*) filter (where durum <> 'yeni' and sifre_ozeti is not null) from public.site_kayit_talepleri) = 0 then 'tamam' else 'FARKLI' end

  -- ---------------- 8 gizli değer taraması (yalnız sayı) ----------------
  union all
  select 800 + f.sira, '8 gizli', f.ad || ': gövdede gizli değer benzeri dizge (JWT / sb_secret / sk_ / 40+ karakter belirteç)', '0',
         ((select count(*) from regexp_matches(f.prosrc, 'eyJ[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_-]+|sk_[A-Za-z0-9_]{10,}|[A-Za-z0-9+/_=-]{40,}', 'g')))::text,
         case when (select count(*) from regexp_matches(f.prosrc, 'eyJ[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_-]+|sk_[A-Za-z0-9_]{10,}|[A-Za-z0-9+/_=-]{40,}', 'g')) = 0
              then 'tamam' else 'FARKLI' end
  from f where f.oid is not null

  -- ---------------- 9 tanımlar (maskeli, okumak için) ----------------
  union all
  select 900 + f.sira, '9 tanım', f.ad || '(' || f.args || ') gövdesi', '',
         regexp_replace(f.prosrc, 'eyJ[A-Za-z0-9._-]{10,}|sb_secret_[A-Za-z0-9_-]+|sk_[A-Za-z0-9_]{10,}|[A-Za-z0-9+/_=-]{40,}', '‹gizlendi›', 'g'), 'bilgi'
  from f where f.oid is not null
)
select bolum, kontrol, beklenen, sonuc, durum from satirlar order by sira;

rollback;
