-- =====================================================================================================================
--  23-faz2-kontrol-salt-okur.sql — FAZ 2 (23) ÖNCESİ VE SONRASI KONTROL (SALT OKUR; tek select, hiçbir şey yazmaz / oluşturmaz)
--  Supabase › SQL Editor › New query › tamamı › Run. 23-platform-yonetim.sql'den ÖNCE ve SONRA aynen çalıştırılır.
--  KİŞİSEL VERİ / SIR DÖNMEZ: yalnız sayılar, durum adları ve kod özetleri (md5).
--  Satırlar:
--    1–5  platform_ tablolarının satır sayısı ("yok" = tablo yok). ÖNCE: hepsi "yok". SONRA: hepsi 0 (yönetici listesi ve olay
--         günlüğü dahil — uygulama hiçbir satır yazmaz; ilk platform yöneticisi AYRI, sonraki adım).
--    6    A6 durumu (24-a6-onkosul-salt-okur.sql ile aynı kural): ÖNCE ve SONRA "UYGULANMIŞ".
--    7–9  A6 İMZASI: iki fonksiyonun pg_get_functiondef md5'i (gövde + definer + search_path + dönüş türü), yetki listeleri ve
--         tetikleyici tanımının md5'i. ÖNCE ile SONRA BİREBİR aynı olmalı (23 bunlara dokunmaz; dokunduysa durulur).
--    10   23 genel durumu bu dosyada ölçülmez → 23-onkosul-salt-okur.sql (ÖNCE "HAZIR", SONRA "UYGULANMIŞ").
-- =====================================================================================================================
with
fn(sira, ad, eski, yeni) as (values
  (1, 'public.tanimlar_kullanici_koruma()', '7a75a37deb2f40bf71569da55292d851', '35c2916e7cc40fa07b98a87864f0436f'),
  (2, 'public.yetki_var_mi(text[], text)', '85a0b3b9c38dc0f7c55f5f8f39519fc4', '148fc08c0e06e554b0f81478f8e26931')),
hal as (
  select fn.sira, fn.ad, p.oid,
         case when p.oid is null then 'yok'
              when md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) = fn.yeni then 'yeni'
              when md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) = fn.eski then 'eski'
              else 'bilinmeyen' end as hal
    from fn left join pg_proc p on p.oid = to_regprocedure(fn.ad)),
t as (select veri from public.tanimlar where id = 'tekil'),
tablo(sira, ad) as (values (1, 'platform_yoneticileri'), (2, 'platform_firmalar'), (3, 'platform_sozlesmeler'), (4, 'platform_odemeler'),
                           (5, 'platform_olaylar')),
sayim as (
  -- tablo yoksa sorgu hata vermesin: satır sayısı xml üzerinden, yalnız tablo VARSA (query_to_xml dinamik ama salt okur)
  select tb.sira, tb.ad,
         case when to_regclass('public.' || tb.ad) is null then 'yok'
              else (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', tb.ad), false, true, '')))[1]::text end as n
    from tablo tb)
select sira, kontrol, sonuc from (
  select s.sira, 'platform_ satır sayısı · ' || s.ad as kontrol, s.n as sonuc from sayim s
  union all
  select 6, 'A6 durumu (HAZIR · UYGULANMIŞ · KARIŞIK · EKSİK)', case
    when not exists (select 1 from pg_trigger g where g.tgrelid = 'public.tanimlar'::regclass and g.tgname = 'tanimlar_kullanici_koruma' and g.tgenabled <> 'D')
      or not exists (select 1 from t) or (select jsonb_typeof(veri -> 'girisAktifMi') from t) is distinct from 'boolean'
      or (select jsonb_typeof(veri -> 'kullanicilar') from t) is distinct from 'array'
      or not exists (select 1 from t, jsonb_array_elements(case when jsonb_typeof(veri -> 'kullanicilar') = 'array' then veri -> 'kullanicilar' else '[]'::jsonb end) e
                      where e ->> 'rol' = 'Yönetici') then 'EKSİK'
    when (select bool_and(hal = 'yeni') from hal) then 'UYGULANMIŞ'
    when (select bool_and(hal = 'eski') from hal) then 'HAZIR'
    else 'KARIŞIK' end
  union all
  select 6 + h.sira, 'A6 imzası · ' || h.ad || ' (functiondef md5 · yetki listesi)',
         coalesce((select md5(pg_get_functiondef(p.oid)) || ' · ' || coalesce(p.proacl::text, '(varsayılan)') from pg_proc p where p.oid = h.oid), 'yok')
    from hal h
  union all
  select 9, 'A6 imzası · tetikleyici tanimlar_kullanici_koruma (tanım md5 · etkin)',
         coalesce((select md5(pg_get_triggerdef(g.oid)) || ' · ' || g.tgenabled::text from pg_trigger g
                    where g.tgrelid = 'public.tanimlar'::regclass and g.tgname = 'tanimlar_kullanici_koruma'), 'YOK')
  union all
  select 10, 'A6 imzası · özet (7–9 birlikte; ÖNCE = SONRA olmalı)',
         md5(coalesce((select string_agg(coalesce(md5(pg_get_functiondef(p.oid)), 'yok') || coalesce(p.proacl::text, ''), ',' order by h.sira)
                         from hal h left join pg_proc p on p.oid = h.oid), '')
             || coalesce((select pg_get_triggerdef(g.oid) || g.tgenabled::text from pg_trigger g
                           where g.tgrelid = 'public.tanimlar'::regclass and g.tgname = 'tanimlar_kullanici_koruma'), ''))
) x
order by sira;
