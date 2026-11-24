-- =====================================================================================================================
--  25-deneme/durum-salt-okur.sql — DENEME PROJESİNİN MEVCUT DURUMU (SALT OKUR; hiçbir şey yazmaz, ad / e-posta / tutar dökmez)
--  Yalnız SAYAR. 25-onkosul-salt-okur.sql ile birlikte ilk adım: deneme projesi G-25 öncesi canlı hâlinde mi, deneme için veri var mı.
--  Çalıştırma: Supabase › deneme projesi (drtmnovafswzcmpacubl) › SQL Editor › dosyanın tamamı › Run.
-- =====================================================================================================================
with t as (select coalesce((select veri from public.tanimlar where id = 'tekil'), '{}'::jsonb) as v),
kul as (select x from t, jsonb_array_elements(case when jsonb_typeof(t.v -> 'kullanicilar') = 'array' then t.v -> 'kullanicilar' else '[]'::jsonb end) x),
bol as (select b from t, jsonb_array_elements(case when jsonb_typeof(t.v -> 'bolumler') = 'array' then t.v -> 'bolumler' else '[]'::jsonb end) b)
select sira, kontrol, deger from (
  select 1 as sira, 'veritabanı (Supabase''te postgres — PROJE KİMLİĞİNİ adres çubuğundan doğrulayın: drtmnovafswzcmpacubl)' as kontrol, current_database() || ' · ' || current_user as deger
  union all select 2, 'surum tablosu (yayındaki istemci kaydı)', coalesce((select string_agg(coalesce(surum, '?'), ', ') from public.surum), 'yok')
  union all select 3, 'giriş sistemi açık mı (tanimlar.girisAktifMi)', coalesce((select v ->> 'girisAktifMi' from t), 'yok')
  union all select 4, 'kullanıcı sayısı: toplam · Yönetici · cari/muhasebe kaydetmeli · üretim kaydetmeli (PARA yok)',
    (select count(*) || ' · ' || count(*) filter (where x ->> 'rol' = 'Yönetici')
       || ' · ' || count(*) filter (where coalesce((x -> 'yetkiler' -> 'cari' ->> 'kaydetme')::boolean, false) or coalesce((x -> 'yetkiler' -> 'muhasebe' ->> 'kaydetme')::boolean, false))
       || ' · ' || count(*) filter (where coalesce((x -> 'yetkiler' -> 'uretim' ->> 'kaydetme')::boolean, false)
                                     and not coalesce((x -> 'yetkiler' -> 'cari' ->> 'kaydetme')::boolean, false) and not coalesce((x -> 'yetkiler' -> 'muhasebe' ->> 'kaydetme')::boolean, false)
                                     and coalesce(x ->> 'rol', '') <> 'Yönetici') from kul)
  union all select 5, 'kimliği (id) olmayan kullanıcı kaydı', (select count(*)::text from kul where coalesce(x ->> 'id', '') = '')
  union all select 6, 'auth hesabı sayısı (giriş yapabilen)', case when to_regclass('auth.users') is null then 'auth şeması yok' else (xpath('/row/n/text()', query_to_xml('select count(*) as n from auth.users', false, true, '')))[1]::text end
  union all select 7, 'bölüm · bölüm personeli · maaşlı personel', (select count(*) || ' · ' || coalesce(sum(jsonb_array_length(case when jsonb_typeof(b -> 'personel') = 'array' then b -> 'personel' else '[]'::jsonb end)), 0)
       || ' · ' || coalesce((select count(*) from bol, jsonb_array_elements(case when jsonb_typeof(b -> 'personel') = 'array' then b -> 'personel' else '[]'::jsonb end) p where coalesce((p ->> 'maas')::numeric, 0) > 0), 0) from bol)
  union all select 8, 'cari tipleri (Personel · Tedarikçi · Müşteri · Her İkisi · diğer)', (select count(*) filter (where tip = 'Personel') || ' · ' || count(*) filter (where tip = 'Tedarikçi')
       || ' · ' || count(*) filter (where tip = 'Müşteri') || ' · ' || count(*) filter (where tip = 'Her İkisi') || ' · ' || count(*) filter (where coalesce(tip, '') not in ('Personel', 'Tedarikçi', 'Müşteri', 'Her İkisi')) from public.cariler)
  union all select 9, 'proses ücreti tanımlı ürün', (select count(*)::text from public.urunler where jsonb_typeof(proses_ucretleri) = 'object' and proses_ucretleri <> '{}'::jsonb)
  union all select 10, 'üretim · tamamlanmamış atama · tamir ataması (açık)', (select count(*) from public.uretim) || ' · ' || (select count(*) from public.uretim_atamalari where not coalesce(tamamlandi_mi, false))
       || ' · ' || (select count(*) from public.uretim_atamalari where coalesce(tamir_mi, false) and not coalesce(tamamlandi_mi, false))
  union all select 11, 'fiş defteri: fiş sayısı · iptal · son fiş tarihi', (select count(*) || ' · ' || count(*) filter (where iptal) || ' · ' || coalesce(max(olusturma)::date::text, '-') from public.stk_fis)
  union all select 12, 'fiş kuralları / sürüm kapısı', 'kurallar ' || case when public.fis_kural_aktif() then 'AÇIK' else 'KAPALI' end
       || ' · min_istemci_surum ' || coalesce((select min_istemci_surum from public.stk_ayar where id = 'tekil'), 'boş')
  union all select 13, 'G-25 nesneleri (mes_bildirim · ucr_onay · isc_odeme · g25 yedeği)', (to_regclass('public.mes_bildirim') is not null)::text || ' · ' || (to_regclass('public.ucr_onay') is not null)::text
       || ' · ' || (to_regclass('public.isc_odeme') is not null)::text || ' · ' || (to_regclass('guvenlik.g25_yedek') is not null)::text
) s order by sira;
