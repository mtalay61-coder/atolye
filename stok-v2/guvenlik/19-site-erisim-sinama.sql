-- =====================================================================================================================
--  19-site-erisim-sinama.sql — 19 SONRASI DAVRANIŞ SINAMASI (Supabase SQL Editor'ün ifade bölmesine dayanıklı; veri DEĞİŞMEZ)
-- =====================================================================================================================
--  19-site-erisim-kapat.sql'in ilk canlı çalıştırması 5. bölümde "relation site_19_sinama does not exist" (42P01) ile durdu: Editor
--  ifadeleri ayrı isteklerle gönderdiği için `create temp table … on commit drop` kendi işleminin sonunda silindi. Katalog
--  değişiklikleri ve doğrulaması o noktaya kadar çalışmıştı; davranış sınaması ÇALIŞMADI. Bu dosya o sınamayı tek başına yapar.
--  ÖNCE 19-durum-salt-okur.sql: "KATALOG TAMAMEN UYGULANMIŞ" görünmeli. Değilse bu dosyayı ÇALIŞTIRMAYIN.
--
--  İki ifade, her biri kendi başına çalışır:
--   1) DO bloğu: normal (ERP listesinde olmayan uydurma e-postalı) authenticated kimlikle dört tabloyu okumayı ve yazan dört
--      fonksiyonu dener (olmayan kimliklerle; her deneme geri sarılan bir alt blokta — kapı geçseydi bile satır değişmezdi), okuma
--      fonksiyonlarını ve site_talepleri'ni çalıştırır; kapıyı Tanımlar'daki bir Yönetici, normal kimlik ve service_role ile dener.
--      Sonuçlar KALICI `guvenlik.site_19_sinama` tablosuna yazılır (her çalıştırmada önce boşaltılır; anon / authenticated erişemez).
--      Müşteri / ERP verisine hiçbir yazma kalıcı olmaz. E-posta sonuçta gösterilmez.
--   2) SELECT: sonuçlar. Beklenen: bütün satırlar "tamam".
--  Dosyada çift-dolar dışında dolar işareti yok (editor-icin.py kuralı).
-- =====================================================================================================================
do $$
declare
  normal_jwt text := '{"role":"authenticated","email":"denetim-19-normal@yok.invalid"}';
  yonetici_eposta text;
  durum text;
  n integer := 0;
  r record;
  s jsonb := '[]'::jsonb;
begin
  if current_user <> 'postgres' then
    raise exception 'postgres rolüyle çalıştırılmalı (şu an: %).', current_user;
  end if;
  if to_regprocedure('public.site_yonetici_kapisi()') is null then
    raise exception '19 uygulanmamış (site_yonetici_kapisi yok) — önce 19-durum-salt-okur.sql. Hiçbir şey yapılmadı.';
  end if;
  create table if not exists guvenlik.site_19_sinama (sira integer, kontrol text, beklenen text, sonuc text, durum text, zaman timestamptz default now());
  revoke all on guvenlik.site_19_sinama from public, anon, authenticated;
  delete from guvenlik.site_19_sinama;

  -- (a) normal kullanıcı: dört tablo doğrudan
  perform set_config('request.jwt.claims', normal_jwt, true);
  execute 'set local role authenticated';
  for r in select unnest(array['site_oturumlari', 'site_hesaplari', 'site_giris_kaydi', 'site_kayit_talepleri']) as t loop
    n := n + 1;
    begin
      execute format('select count(*) from public.%I', r.t);
      durum := 'OKUNDU';
    exception when insufficient_privilege then durum := 'reddedildi';
    end;
    s := s || jsonb_build_array(jsonb_build_array(10 + n, 'normal kullanıcı: select ' || r.t, 'reddedildi', durum,
                                                  case when durum = 'reddedildi' then 'tamam' else 'AÇIK' end));
  end loop;
  n := 0;
  for r in select unnest(array['update public.site_hesaplari set hatali_deneme = hatali_deneme where false',
                               'delete from public.site_oturumlari where false',
                               'insert into public.site_kayit_talepleri (kullanici) select ''x'' where false']) as komut loop
    n := n + 1;
    begin
      begin
        execute r.komut;
        durum := 'YAZILDI';
      exception when insufficient_privilege then durum := 'reddedildi';
      end;
      raise exception using errcode = 'P0019', message = 'alt blok geri sarılıyor';
    exception when sqlstate 'P0019' then null;
    end;
    s := s || jsonb_build_array(jsonb_build_array(15 + n, 'normal kullanıcı: doğrudan ' || split_part(r.komut, ' ', 1) || ' ' ||
                                                  case n when 1 then 'site_hesaplari' when 2 then 'site_oturumlari' else 'site_kayit_talepleri' end,
                                                  'reddedildi', durum, case when durum = 'reddedildi' then 'tamam' else 'AÇIK' end));
  end loop;
  -- (b) normal kullanıcı: yazan dört fonksiyon
  n := 0;
  for r in select * from (values
      ('site_hesap_kaydet', 'select public.site_hesap_kaydet(''__denetim19_yok__'', ''denetim19'', '''')'),
      ('site_hesap_sil',    'select public.site_hesap_sil(''__denetim19_yok__'')'),
      ('site_kayit_onayla', 'select public.site_kayit_onayla(''__denetim19_yok__'', ''__denetim19_yok__'')'),
      ('site_kayit_reddet', 'select public.site_kayit_reddet(''__denetim19_yok__'')')) v(ad, komut) loop
    n := n + 1;
    begin
      begin
        execute r.komut;
        durum := 'GEÇTİ';
      exception when insufficient_privilege then
        durum := 'reddedildi (YETKI_YOK)';
      when others then
        durum := 'GEÇTİ (sonra: ' || left(sqlerrm, 60) || ')';
      end;
      raise exception using errcode = 'P0019', message = 'alt blok geri sarılıyor';
    exception when sqlstate 'P0019' then null;
    end;
    s := s || jsonb_build_array(jsonb_build_array(20 + n, 'normal kullanıcı: ' || r.ad, 'reddedildi (YETKI_YOK)', durum,
                                                  case when durum like 'reddedildi%' then 'tamam' else 'AÇIK' end));
  end loop;
  -- (c) normal kullanıcı: okuma fonksiyonları ve site_talepleri (ERP talep ekranı) çalışmaya devam eder
  n := 0;
  for r in select * from (values
      ('site_hesap_listesi()',   'select count(*) from public.site_hesap_listesi()'),
      ('site_hesap_bilgi(…)',    'select public.site_hesap_bilgi(''__denetim19_yok__'')'),
      ('site_kayit_listesi()',   'select count(*) from public.site_kayit_listesi()'),
      ('site_raporu(1)',         'select public.site_raporu(1)'),
      ('select site_talepleri',  'select count(*) from public.site_talepleri')) v(ad, komut) loop
    n := n + 1;
    begin
      execute r.komut;
      durum := 'çalıştı';
    exception when others then durum := 'HATA: ' || left(sqlerrm, 60);
    end;
    s := s || jsonb_build_array(jsonb_build_array(30 + n, 'normal kullanıcı: ' || r.ad, 'çalıştı', durum,
                                                  case when durum = 'çalıştı' then 'tamam' else 'FARKLI' end));
  end loop;
  execute 'reset role';
  -- (d) kapı: Tanımlar'daki bir Yönetici geçer, normal kimlik geçemez, service_role geçer (postgres olarak, JWT ile)
  select case when coalesce(k ->> 'eposta', '') <> '' then lower(k ->> 'eposta')
              else regexp_replace(lower(translate(coalesce(k ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local' end
    into yonetici_eposta
  from public.tanimlar tt, jsonb_array_elements(coalesce(tt.veri -> 'kullanicilar', '[]'::jsonb)) k
  where tt.id = 'tekil' and k ->> 'rol' = 'Yönetici' limit 1;
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'authenticated', 'email', yonetici_eposta)::text, true);
  begin perform public.site_yonetici_kapisi(); durum := 'geçti';
  exception when insufficient_privilege then durum := 'REDDEDİLDİ';
  end;
  s := s || jsonb_build_array(jsonb_build_array(41, 'kapı: Tanımlar''daki Yönetici kimliği', 'geçti', durum, case when durum = 'geçti' then 'tamam' else 'FARKLI' end));
  perform set_config('request.jwt.claims', normal_jwt, true);
  begin perform public.site_yonetici_kapisi(); durum := 'GEÇTİ';
  exception when insufficient_privilege then durum := 'reddedildi';
  end;
  s := s || jsonb_build_array(jsonb_build_array(42, 'kapı: normal kullanıcı kimliği', 'reddedildi', durum, case when durum = 'reddedildi' then 'tamam' else 'AÇIK' end));
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin perform public.site_yonetici_kapisi(); durum := 'geçti';
  exception when insufficient_privilege then durum := 'REDDEDİLDİ';
  end;
  s := s || jsonb_build_array(jsonb_build_array(43, 'kapı: servis anahtarı (service_role)', 'geçti', durum, case when durum = 'geçti' then 'tamam' else 'FARKLI' end));
  perform set_config('request.jwt.claims', '', true);

  insert into guvenlik.site_19_sinama (sira, kontrol, beklenen, sonuc, durum)
  select (e ->> 0)::integer, e ->> 1, e ->> 2, e ->> 3, e ->> 4 from jsonb_array_elements(s) e;
end $$;

select kontrol, beklenen, sonuc, durum,
       case when sira = (select min(sira) from guvenlik.site_19_sinama)
            then (select count(*) filter (where durum = 'tamam') || ' / ' || count(*) || ' tamam' from guvenlik.site_19_sinama) end as ozet
from guvenlik.site_19_sinama order by sira;
