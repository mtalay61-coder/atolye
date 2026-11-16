-- =====================================================================================================================
--  22-onkosul-salt-okur.sql — 22 ÖNCESİ / SONRASI DURUM (SALT OKUR: tek select; hiçbir şey yazmaz, oluşturmaz, değiştirmez)
--  ÜRETİLMİŞ DOSYA — elle düzenlenmez (python3 stok-v2/guvenlik/22-uret.py).
-- =====================================================================================================================
--  22'yi uygulamadan ÖNCE çalıştırılır: "GENEL" satırı HAZIR değilse 22 uygulanmaz. Sonra da çalıştırılabilir: UYGULANMIŞ der.
--  Okuduğu: katalog (fonksiyon gövdesi md5'i, tetikleyiciler, sütunlar, yetkiler) ve site_kayit_talepleri / cariler / stk_ayar'dan
--  yalnız SAYI (kişisel veri dönmez). Yoksa hata vermeyen tablolar query_to_xml ile okunur.
-- =====================================================================================================================
with
fn as (
  select x.ad, x.v19, x.v22,
         (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure(x.ad)) as canli
    from (values ('public.site_kayit_onayla(text, text)', '86debf97b2f8ae9c1845f85900e65492', '55aaa9ed6a8300ba9ee2847c44f7ea98'),
                 ('public.site_kayit_reddet(text)', '071e82fa3ad4c6eb0d2be0c2e6047cbe', 'b02d38f099990a98b992f63b178d2060')) x(ad, v19, v22)
),
yeni as (
  select x.ad, x.beklenen,
         (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure(x.ad)) as canli
    from (values (1, 'public.site_kimlik_zamani(text)', '785adfb4ada8114405287a3e5a8dc64a'), (2, 'public.site_eslesme_anahtari(text, text)', '69585b19b83b568603d2b71f27080389'), (3, 'public.site_vergi_no_kaydedilecek(text)', '75620b7d843d458d1303978be7ec8bdb'), (4, 'public.site_kayit_onayla_yeni_cari(text, text)', 'e63acb4dfb28ccffde5191311097cdda'), (5, 'public.site_cari_ekleme_koru()', '68e61c5d9ecf07ee2888b6ce39ff0aa1')) x(sira, ad, beklenen)
),
durum as (
  select
    to_regclass('public.site_kayit_talepleri') is not null as talep_tablosu,
    to_regclass('public.site_hesaplari') is not null as hesap_tablosu,
    to_regclass('public.cariler') is not null as cari_tablosu,
    to_regprocedure('public.site_yonetici_kapisi()') is not null as kapi,
    (select count(*) from fn where canli = v19) as fn19,
    (select count(*) from fn where canli = v22) as fn22,
    (select count(*) from yeni where canli = beklenen) as yeni22,
    (select count(*) from yeni where canli is not null) as yeni_var,
    exists (select 1 from pg_trigger where tgname = 'site_cari_ekleme_koru' and not tgisinternal) as tetik,
    exists (select 1 from pg_attribute where attrelid = to_regclass('public.site_kayit_talepleri') and attname = 'islenme' and not attisdropped) as islenme,
    case when to_regclass('guvenlik.site_onay_22_yedek') is null then 0
         else (xpath('/row/n/text()', query_to_xml('select count(*) as n from guvenlik.site_onay_22_yedek where tur = ''isaret''', false, true, '')))[1]::text::int end as isaret
),
satirlar as (
  select 1 as sira, 'çalıştıran rol' as kontrol, current_user::text as sonuc, 'bilgi' as durum
  union all select 2, 'tablolar: site_kayit_talepleri / site_hesaplari / cariler',
    (case when d.talep_tablosu then 'var' else 'YOK' end) || ' / ' || (case when d.hesap_tablosu then 'var' else 'YOK' end) || ' / ' || (case when d.cari_tablosu then 'var' else 'YOK' end),
    case when d.talep_tablosu and d.hesap_tablosu and d.cari_tablosu then 'tamam' else 'DUR' end from durum d
  union all select 3, '19 yönetici kapısı (site_yonetici_kapisi)', case when d.kapi then 'var' else 'YOK' end, case when d.kapi then 'tamam' else 'DUR' end from durum d
  union all select 3 + row_number() over (order by f.ad), f.ad || ' gövdesi',
    case when f.canli is null then 'yok' when f.canli = f.v19 then '19 hâli' when f.canli = f.v22 then '22 hâli' else 'FARKLI (' || f.canli || ')' end,
    case when f.canli = f.v19 or f.canli = f.v22 then 'tamam' else 'DUR' end from fn f
  union all select 6, '22 nesneleri (yeni fonksiyonlar / tetikleyici / islenme sütunu / yedek işareti)',
    d.yeni_var || '/5 fonksiyon (' || d.yeni22 || ' tanesi 22 hâlinde) · tetikleyici ' || (case when d.tetik then 'var' else 'yok' end)
      || ' · islenme ' || (case when d.islenme then 'var' else 'yok' end) || ' · işaret ' || d.isaret, 'bilgi' from durum d
  union all select 7, 'cariler: zorunlu sütunlar (id, unvan, ek)',
    coalesce((select string_agg(s, ', ') from unnest(array['id', 'unvan', 'ek']) s
               where not exists (select 1 from pg_attribute a where a.attrelid = to_regclass('public.cariler') and a.attname = s and a.attnum > 0 and not a.attisdropped)), 'hepsi var'),
    case when exists (select 1 from unnest(array['id', 'unvan', 'ek']) s
               where not exists (select 1 from pg_attribute a where a.attrelid = to_regclass('public.cariler') and a.attname = s and a.attnum > 0 and not a.attisdropped)) then 'DUR' else 'tamam' end
  union all select 8, 'cariler: fonksiyonun yazdığı sütunlar ve türleri',
    coalesce((select string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod), ', ' order by a.attnum) from pg_attribute a
               where a.attrelid = to_regclass('public.cariler') and a.attnum > 0 and not a.attisdropped
                 and a.attname in ('id', 'unvan', 'tip', 'telefon', 'vergi_no', 'adres', 'para_birimi', 'bagli_prosesler', 'pasif', 'surum', 'ek')), 'yok'), 'bilgi'
  union all select 9, 'cariler: tetikleyiciler',
    coalesce((select string_agg(tgname, ', ' order by tgname) from pg_trigger where tgrelid = to_regclass('public.cariler') and not tgisinternal), 'yok'), 'bilgi'
  union all select 10, 'cariler: değişiklik sayacı (degisiklik_izle — diğer cihazlar sunucunun açtığı cariyi görsün)',
    coalesce((select case when tgenabled = 'D' then 'DEVRE DIŞI' else 'var, etkin' end from pg_trigger
               where tgrelid = to_regclass('public.cariler') and tgname = 'degisiklik_izle' and not tgisinternal), 'YOK'),
    case when exists (select 1 from pg_trigger where tgrelid = to_regclass('public.cariler') and tgname = 'degisiklik_izle' and not tgisinternal and tgenabled <> 'D')
         then 'tamam' else 'DUR' end
  union all select 11, 'cariler: en düşük istemci sürümü (stk_ayar.min_istemci_surum; 22 bunu kullanmaz)',
    case when to_regclass('public.stk_ayar') is null then 'stk_ayar yok'
         else coalesce(nullif((xpath('/row/s/text()', query_to_xml('select min_istemci_surum as s from public.stk_ayar where id = ''tekil''', false, true, '')))[1]::text, ''), 'boş (kapı kapalı)') end, 'bilgi'
  union all select 12, 'kayıt talepleri: durum dağılımı',
    case when to_regclass('public.site_kayit_talepleri') is null then 'tablo yok'
         else (xpath('/row/s/text()', query_to_xml('select coalesce(string_agg(durum || '' '' || n, '' · '' order by durum), ''hiç yok'') as s from (select durum, count(*) n from public.site_kayit_talepleri group by durum) z', false, true, '')))[1]::text end, 'bilgi'
  union all select 13, 'bekleyen talep: ünvanı + telefonu MEVCUT bir cariyle aynı olan (Onayla bu cariye bağlamayı önerir; tetikleyici etkilemez)',
    case when to_regclass('public.site_kayit_talepleri') is null or to_regclass('public.cariler') is null then 'okunamadı'
         else (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.site_kayit_talepleri t where t.durum = ''yeni'' and exists (select 1 from public.cariler c where lower(btrim(coalesce(c.unvan, ''''))) = lower(btrim(coalesce(t.bilgiler ->> ''unvan'', ''''))) and regexp_replace(coalesce(to_jsonb(c) ->> ''telefon'', ''''), ''[^0-9]'', '''', ''g'') = regexp_replace(coalesce(t.bilgiler ->> ''telefon'', ''''), ''[^0-9]'', '''', ''g''))', false, true, '')))[1]::text end, 'bilgi'
  union all select 14, 'site_kayit_talepleri: authenticated doğrudan yazabilir mi (19 kapatmış olmalı)',
    case when to_regclass('public.site_kayit_talepleri') is null then 'tablo yok'
         when has_table_privilege('authenticated', 'public.site_kayit_talepleri', 'INSERT,UPDATE,DELETE') then 'EVET' else 'hayır' end,
    case when to_regclass('public.site_kayit_talepleri') is not null and has_table_privilege('authenticated', 'public.site_kayit_talepleri', 'INSERT,UPDATE,DELETE') then 'DUR' else 'tamam' end
  union all select 15, 'onayla / reddet yetkileri açıkça tanımlı (19; geri alma bunları birebir kurar)',
    case when exists (select 1 from pg_proc where oid in (to_regprocedure('public.site_kayit_onayla(text, text)'), to_regprocedure('public.site_kayit_reddet(text)')) and proacl is null)
         then 'VARSAYILAN' else 'tanımlı' end,
    case when exists (select 1 from pg_proc where oid in (to_regprocedure('public.site_kayit_onayla(text, text)'), to_regprocedure('public.site_kayit_reddet(text)')) and proacl is null)
         then 'DUR' else 'tamam' end
  union all select 16, 'geri alma: tetikleyici ve fonksiyon yetki / sahip / ayarı uygulandığı hâlde mi (22 uygulanmışsa)',
    case when d.isaret = 0 then '22 uygulanmamış'
         else (xpath('/row/n/text()', query_to_xml('select count(*) as n from guvenlik.site_onay_22_yedek y where y.tur = ''sonra'' and y.tanim is distinct from (case when y.nesne like ''tetikleyici:%'' then (select pg_get_triggerdef(t.oid) || '' | '' || t.tgenabled::text from pg_trigger t where t.tgrelid = ''public.cariler''::regclass and t.tgname = ''site_cari_ekleme_koru'') else (select coalesce(p.proacl::text, '''') || '' | '' || p.prosecdef || '' | '' || coalesce(array_to_string(p.proconfig, '',''), '''') || '' | '' || pg_get_userbyid(p.proowner) from pg_proc p where p.oid = to_regprocedure(y.nesne)) end)', false, true, '')))[1]::text || ' nesne değişmiş' end,
    case when d.isaret = 0 then 'bilgi'
         when (xpath('/row/n/text()', query_to_xml('select count(*) as n from guvenlik.site_onay_22_yedek y where y.tur = ''sonra'' and y.tanim is distinct from (case when y.nesne like ''tetikleyici:%'' then (select pg_get_triggerdef(t.oid) || '' | '' || t.tgenabled::text from pg_trigger t where t.tgrelid = ''public.cariler''::regclass and t.tgname = ''site_cari_ekleme_koru'') else (select coalesce(p.proacl::text, '''') || '' | '' || p.prosecdef || '' | '' || coalesce(array_to_string(p.proconfig, '',''), '''') || '' | '' || pg_get_userbyid(p.proowner) from pg_proc p where p.oid = to_regprocedure(y.nesne)) end)', false, true, '')))[1]::text = '0' then 'tamam'
         else 'UYARI' end
    from durum d
)
select sira, kontrol, sonuc, durum from satirlar
union all
select 99, '>>> GENEL',
  case when exists (select 1 from satirlar where durum = 'DUR') then 'DUR — 22 uygulanmaz (DUR satırlarına bakın)'
       when d.isaret > 0 and d.fn22 = 2 and d.yeni22 = 5 and d.tetik and d.islenme then 'UYGULANMIŞ'
       when d.isaret = 0 and d.fn19 = 2 and d.yeni_var = 0 and not d.tetik and not d.islenme then 'HAZIR — 22 uygulanabilir'
       when d.isaret = 0 and d.fn22 = 2 and d.yeni22 = 5 and d.tetik and d.islenme then 'UYGULANMIŞ (yedeksiz: site-portal.sql ile kurulmuş; geri alma dosyası çalışmaz)'
       else 'KISMİ / BEKLENMEYEN — uygulamayın, sonucu paylaşın' end,
  case when exists (select 1 from satirlar where durum = 'DUR') then 'DUR'
       when d.isaret > 0 and d.fn22 = 2 and d.yeni22 = 5 and d.tetik and d.islenme then 'tamam'
       when d.isaret = 0 and d.fn19 = 2 and d.yeni_var = 0 and not d.tetik and not d.islenme then 'tamam'
       when d.isaret = 0 and d.fn22 = 2 and d.yeni22 = 5 and d.tetik and d.islenme then 'bilgi' else 'DUR' end
  from durum d
order by 1;
