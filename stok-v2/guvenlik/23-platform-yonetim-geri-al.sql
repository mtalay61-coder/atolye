-- =====================================================================================================================
--  23-platform-yonetim-geri-al.sql — 23'Ü GERİ ALIR (platform_ tabloları ve fonksiyonları)   (AYRI ONAYLA)
--  Supabase › SQL Editor › dosyanın TAMAMI › Run. Tek do bloğu = tek işlem.
-- =====================================================================================================================
--  ⚠ AYRI VE AÇIK ONAY GEREKİR: Faz 2 uygulama onayı geri almayı KAPSAMAZ (23-FAZ2-PAKET.md "Geri dönüş").
--  DURMA KOŞULU: platform_firmalar / platform_sozlesmeler / platform_odemeler'de tek satır bile varsa hiçbir şeye dokunmadan
--  DURUR ("DUR: platform tablolarında N kayıt var"); hiçbir şey silinmez.
--  KALDIRILANLAR (üçü boşsa, tek işlemde): beş tablo ve beş fonksiyon — İÇERİKLERİYLE BİRLİKTE:
--    - platform_yoneticileri: YÖNETİCİ LİSTESİ SİLİNİR (eklenmiş platform yöneticisi hesapları; giriş hesapları auth.users'ta kalır).
--      Yeniden uygulamada 23-platform-yonetim.sql'in "SONRA" adımıyla tekrar eklenmeleri gerekir.
--    - platform_olaylar: OLAY GÜNLÜĞÜ SİLİNİR. Günlük firmaya bağlıdır (firma_id zorunlu, firma silinemez); firma yoksa günlük de
--      boştur — yani bu yol yalnız boş günlüğü kaldırır.
--  Kayıt varken geri almak gerekiyorsa önce kayıtları bilinçli olarak dışarı alın; bu dosya o kararı sizin yerinize vermez.
--  Eksik tablolar (yarım kalmış kurulum) hata vermez: her tablo ayrı denetlenir, olanlar kaldırılır.
--  Sonra 23-onkosul-salt-okur.sql → GENEL "HAZIR" (23 uygulanmamış hâl).
-- =====================================================================================================================

do $$
declare
  n bigint;
  k bigint;
begin
  n := 0;
  if to_regclass('public.platform_firmalar') is not null then execute 'select count(*) from public.platform_firmalar' into k; n := n + k; end if;
  if to_regclass('public.platform_sozlesmeler') is not null then execute 'select count(*) from public.platform_sozlesmeler' into k; n := n + k; end if;
  if to_regclass('public.platform_odemeler') is not null then execute 'select count(*) from public.platform_odemeler' into k; n := n + k; end if;
  if n > 0 then
    raise exception 'DUR: platform tablolarında % kayıt var (firma / sözleşme / ödeme). Hiçbir şey silinmedi.', n;
  end if;
  drop table if exists public.platform_olaylar;
  drop table if exists public.platform_odemeler;
  drop table if exists public.platform_sozlesmeler;
  drop table if exists public.platform_firmalar;
  drop table if exists public.platform_yoneticileri;
  drop function if exists public.platform_olay_yaz();
  drop function if exists public.platform_guncelleme_damgasi();
  drop function if exists public.platform_odeme_denetle();
  drop function if exists public.platform_sozlesme_denetle();
  drop function if exists public.platform_yonetici_mi();
end $$;

select case when not exists (select 1 from pg_class where relnamespace = 'public'::regnamespace and relname like 'platform\_%')
             and not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname like 'platform\_%')
            then 'tamam — platform_ nesnesi kalmadı' else 'FARKLI — platform_ nesnesi kaldı' end as sonuc;
