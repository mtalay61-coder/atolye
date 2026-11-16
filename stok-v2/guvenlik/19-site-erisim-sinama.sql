-- =====================================================================================================================
--  19-site-erisim-sinama.sql — 19 SONRASI DAVRANIŞ SINAMASI (Supabase SQL Editor'ün ifade bölmesine dayanıklı; veri DEĞİŞMEZ)
-- =====================================================================================================================
--  19-site-erisim-kapat.sql'in ilk canlı çalıştırması "relation site_19_sinama does not exist" (42P01) ile durdu: Editor ifadeleri ayrı
--  isteklerle gönderdiği için geçici tablo kendi işleminin sonunda silindi; davranış sınaması ÇALIŞMADI. Bu dosya onu yapar.
--  ÖNCE 19-durum-salt-okur.sql: "KATALOG TAMAMEN UYGULANMIŞ" görünmeli. Değilse ÇALIŞTIRMAYIN (dosya da kendisi durur).
--
--  KİMLİKLER (hepsi `set local role authenticated` + request.jwt.claims — PostgREST'in yaptığı gibi):
--   N1 ERP listesinde OLMAYAN uydurma e-posta · N2 ERP listesinde olup Yönetici OLMAYAN gerçek bir kullanıcı (canlıda yoksa satırı
--   "bilgi" yazar; bu senaryo izole veritabanında sınanır) · Y Tanımlar'daki bir Yönetici.
--  RET SEBEBİ AYRILIR (42501 tek başına kanıt sayılmaz): "kapı reddetti (YETKI_YOK)" = fonksiyon ÇALIŞTI ve içindeki yönetici kontrolü
--   reddetti · "çalıştırma izni yok" = fonksiyona EXECUTE yetkisi yok · "tablo izni yok" = tabloya doğrudan erişim yetkisi yok.
--  YAZMA DENEMELERİ OLMAYAN kimliklerle (__denetim19_yok__) ve her biri geri sarılan bir alt blokta: kapı geçse bile satır değişmez.
--   Yönetici için her fonksiyonda TEK beklenen sonuç kabul edilir (başka her hata FARKLI): site_hesap_kaydet → P0001 "Cari bulunamadı",
--   site_kayit_onayla → P0001 "Talep bulunamadı ya da işlenmiş" (ikisi de kapıdan SONRAKİ iş kuralı), site_hesap_sil ve
--   site_kayit_reddet → hatasız "çağrı tamamlandı" (değişen satır sayısı ÖLÇÜLMEZ; alt blok zaten geri sarılır).
--  OKUMA FONKSİYONLARI (normal kullanıcıya açık): (i) gövdeleri ve dönüş tipleri oturum anahtarı / şifre özeti / oturum tablosu /
--   tüm satır (select *, x.*, to_jsonb(x), row_to_json) İÇERMEMELİ; (ii) N1 kimliğiyle çağrılan çıktılarda canlıdaki hiçbir oturum
--   anahtarı ve şifre özeti (hesap + bekleyen kayıt) GEÇMEMELİ. Gizli değerler yalnız işlem içinde karşılaştırılır, yazılmaz.
--  Sonuçlar KALICI `guvenlik.site_19_sinama` tablosuna yazılır (her çalıştırmada boşaltılır; anon / authenticated erişemez).
--  İki ifade: DO bloğu + SELECT. Beklenen: "bilgi" dışındaki bütün satırlar "tamam". Çift-dolar dışında dolar işareti yok.
-- =====================================================================================================================
do $$
declare
  n1_jwt text := '{"role":"authenticated","email":"denetim-19-normal@yok.invalid"}';
  n2_eposta text;
  y_eposta text;
  kimlik record;
  r record;
  durum text;
  st text;
  msg text;
  cikti text;
  gizli text[];
  hesap_cariler text[];
  s jsonb := '[]'::jsonb;
  sira integer := 0;
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

  -- Kimlikler (yonetici_mi ile aynı e-posta eşlemesi). E-postalar sonuca yazılmaz.
  select string_agg(e, ',') filter (where rol = 'Yönetici'), string_agg(e, ',') filter (where rol <> 'Yönetici')
    into y_eposta, n2_eposta
  from (select coalesce(k ->> 'rol', '') rol,
               case when coalesce(k ->> 'eposta', '') <> '' then lower(k ->> 'eposta')
                    else regexp_replace(lower(translate(coalesce(k ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local' end e
        from public.tanimlar tt, jsonb_array_elements(coalesce(tt.veri -> 'kullanicilar', '[]'::jsonb)) k where tt.id = 'tekil') x;
  y_eposta := split_part(y_eposta, ',', 1);
  n2_eposta := nullif(split_part(coalesce(n2_eposta, ''), ',', 1), '');

  -- Sızıntı karşılaştırması için gizli değerler (yalnız bu işlemin belleğinde; hiçbir yere yazılmaz).
  select array_agg(x) into gizli from (
    select anahtar as x from public.site_oturumlari
    union all select sifre_ozeti from public.site_hesaplari
    union all select sifre_ozeti from public.site_kayit_talepleri where sifre_ozeti is not null) z where length(x) >= 20;
  select array_agg(cari_id) into hesap_cariler from public.site_hesaplari;

  for kimlik in select * from (values
      ('N1 listede olmayan', n1_jwt, false),
      ('N2 listede, Yönetici değil', case when n2_eposta is null then null else jsonb_build_object('role', 'authenticated', 'email', n2_eposta)::text end, false),
      ('Y Yönetici', jsonb_build_object('role', 'authenticated', 'email', y_eposta)::text, true)) v(ad, jwt, yonetici) loop
    if kimlik.jwt is null then
      sira := sira + 1;
      s := s || jsonb_build_array(jsonb_build_array(sira, kimlik.ad || ': senaryo', '—', 'canlıda böyle kullanıcı yok (izole veritabanında sınandı)', 'bilgi'));
      continue;
    end if;
    perform set_config('request.jwt.claims', kimlik.jwt, true);
    execute 'set local role authenticated';

    -- (a) dört tablo: doğrudan okuma (herkes için "tablo izni yok") ve normal kimliklerde doğrudan yazma
    for r in select * from (values
        ('select site_oturumlari',      'select count(*) from public.site_oturumlari', true),
        ('select site_hesaplari',       'select count(*) from public.site_hesaplari', true),
        ('select site_giris_kaydi',     'select count(*) from public.site_giris_kaydi', true),
        ('select site_kayit_talepleri', 'select count(*) from public.site_kayit_talepleri', true),
        ('update site_hesaplari',       'update public.site_hesaplari set hatali_deneme = hatali_deneme where false', false),
        ('delete site_oturumlari',      'delete from public.site_oturumlari where false', false),
        ('insert site_kayit_talepleri', 'insert into public.site_kayit_talepleri (kullanici) select ''x'' where false', false)) v(ad, komut, herkes) loop
      continue when not r.herkes and kimlik.yonetici;
      begin
        begin
          execute r.komut;
          durum := 'ERİŞTİ';
        exception when others then
          get stacked diagnostics st = returned_sqlstate, msg = message_text;
          durum := case when st = '42501' and msg like 'permission denied for table%' then 'tablo izni yok'
                        when st = '42501' then 'başka izin hatası: ' || left(msg, 60) else 'HATA ' || st || ': ' || left(msg, 60) end;
        end;
        raise exception using errcode = 'P0019', message = 'alt blok geri sarılıyor';
      exception when sqlstate 'P0019' then null;
      end;
      sira := sira + 1;
      s := s || jsonb_build_array(jsonb_build_array(sira, kimlik.ad || ': doğrudan ' || r.ad, 'tablo izni yok', durum,
                                                    case when durum = 'tablo izni yok' then 'tamam' when durum = 'ERİŞTİ' then 'AÇIK' else 'FARKLI' end));
    end loop;

    -- (b) yazan dört yönetim fonksiyonu (olmayan kimliklerle; geri sarılır). yonetici_beklenen: Yönetici için TEK kabul edilen sonuç.
    for r in select * from (values
        ('site_hesap_kaydet', 'select public.site_hesap_kaydet(''__denetim19_yok__'', ''denetim19'', ''Denetim-19x'')',
                              'iş kuralı hatası P0001: Cari bulunamadı'),
        ('site_hesap_sil',    'select public.site_hesap_sil(''__denetim19_yok__'')', 'çağrı tamamlandı'),
        ('site_kayit_onayla', 'select public.site_kayit_onayla(''__denetim19_yok__'', ''__denetim19_yok__'')',
                              'iş kuralı hatası P0001: Talep bulunamadı ya da işlenmiş'),
        ('site_kayit_reddet', 'select public.site_kayit_reddet(''__denetim19_yok__'')', 'çağrı tamamlandı')) v(ad, komut, yonetici_beklenen) loop
      begin
        begin
          execute r.komut;
          durum := 'çağrı tamamlandı';
        exception when others then
          get stacked diagnostics st = returned_sqlstate, msg = message_text;
          durum := case when st = '42501' and msg like 'YETKI_YOK:%' then 'kapı reddetti (YETKI_YOK)'
                        when st = '42501' and msg like 'permission denied for function%' then 'çalıştırma izni yok'
                        when st = '42501' and msg like 'permission denied for table%' then 'tablo izni yok (fonksiyon içinde)'
                        when st = '42501' then 'başka izin hatası: ' || left(msg, 60)
                        when st = 'P0001' then 'iş kuralı hatası P0001: ' || left(msg, 60)
                        else 'HATA ' || st || ': ' || left(msg, 60) end;
        end;
        raise exception using errcode = 'P0019', message = 'alt blok geri sarılıyor';
      exception when sqlstate 'P0019' then null;
      end;
      sira := sira + 1;
      if kimlik.yonetici then
        s := s || jsonb_build_array(jsonb_build_array(sira, kimlik.ad || ': ' || r.ad, r.yonetici_beklenen, durum,
                                                      case when durum = r.yonetici_beklenen then 'tamam' else 'FARKLI' end));
      else
        -- Normal kimlik kapıyı geçtiyse (çağrı tamamlandı ya da kapı SONRASI iş kuralı hatası) açık; başka her şey FARKLI.
        s := s || jsonb_build_array(jsonb_build_array(sira, kimlik.ad || ': ' || r.ad, 'kapı reddetti (YETKI_YOK)', durum,
                                                      case when durum = 'kapı reddetti (YETKI_YOK)' then 'tamam'
                                                           when durum = 'çağrı tamamlandı' or durum like 'iş kuralı hatası%' then 'AÇIK'
                                                           else 'FARKLI' end));
      end if;
    end loop;

    -- (c) okuma fonksiyonları + site_talepleri çalışır; N1'de çıktılarda gizli değer aranır
    for r in select * from (values
        ('site_hesap_listesi()',  'select coalesce(jsonb_agg(x)::text, '''') from public.site_hesap_listesi() x'),
        ('site_hesap_bilgi(…)',   'select coalesce(jsonb_agg(public.site_hesap_bilgi(c))::text, '''') from unnest(coalesce(' ||
                                     quote_literal(coalesce(hesap_cariler, '{}'::text[])) || '::text[], ''{}''::text[])) c'),
        ('site_kayit_listesi()',  'select coalesce(jsonb_agg(x)::text, '''') from public.site_kayit_listesi() x'),
        ('site_raporu(730)',      'select coalesce(public.site_raporu(730)::text, '''')'),
        ('select site_talepleri', 'select count(*)::text from public.site_talepleri')) v(ad, komut) loop
      begin
        execute r.komut into cikti;
        durum := 'çalıştı';
      exception when others then
        get stacked diagnostics st = returned_sqlstate, msg = message_text;
        durum := 'HATA ' || st || ': ' || left(msg, 60); cikti := null;
      end;
      sira := sira + 1;
      s := s || jsonb_build_array(jsonb_build_array(sira, kimlik.ad || ': ' || r.ad, 'çalıştı', durum, case when durum = 'çalıştı' then 'tamam' else 'FARKLI' end));
      if kimlik.ad like 'N1%' and r.ad <> 'select site_talepleri' then
        sira := sira + 1;
        durum := case when cikti is null then 'çıktı yok'
                      when exists (select 1 from unnest(coalesce(gizli, '{}'::text[])) g where position(g in cikti) > 0) then 'GİZLİ DEĞER VAR'
                      else 'yok (' || coalesce(array_length(gizli, 1), 0) || ' gizli değerle karşılaştırıldı)' end;
        s := s || jsonb_build_array(jsonb_build_array(sira, kimlik.ad || ': ' || r.ad || ' çıktısında oturum anahtarı / şifre özeti',
                                                      'yok', durum, case when durum like 'yok%' then 'tamam' else 'AÇIK' end));
      end if;
    end loop;
    execute 'reset role';
  end loop;
  perform set_config('request.jwt.claims', '', true);

  -- (d) çalıştırma izinleri (katalog): anon yönetim fonksiyonlarını hiç çalıştıramaz; kapı fonksiyonu RPC değil
  for r in select unnest(array['public.site_hesap_kaydet(text, text, text)', 'public.site_hesap_sil(text)', 'public.site_kayit_onayla(text, text)',
                                'public.site_kayit_reddet(text)', 'public.site_yonetici_kapisi()']) as f loop
    sira := sira + 1;
    durum := case when has_function_privilege('anon', r.f, 'execute') then 'VAR' else 'yok' end
             || case when r.f like '%kapisi%' then ' · authenticated ' || case when has_function_privilege('authenticated', r.f, 'execute') then 'VAR' else 'yok' end else '' end;
    s := s || jsonb_build_array(jsonb_build_array(sira, 'anon çalıştırma izni: ' || r.f || case when r.f like '%kapisi%' then ' (ve authenticated)' else '' end,
                                                  case when r.f like '%kapisi%' then 'yok · authenticated yok' else 'yok' end, durum,
                                                  case when durum like '%VAR%' then 'AÇIK' else 'tamam' end));
  end loop;

  -- (e) okuma fonksiyonlarının GÖVDESİ ve DÖNÜŞ TİPİ: anahtar / şifre özeti / oturum tablosu / tüm satır yok
  for r in select v.f, p.prosrc, pg_get_function_result(p.oid) as donus
           from unnest(array['public.site_hesap_bilgi(text)', 'public.site_hesap_listesi()', 'public.site_kayit_listesi()', 'public.site_raporu(integer)']) v(f)
           left join pg_proc p on p.oid = to_regprocedure(v.f) loop
    sira := sira + 1;
    cikti := regexp_replace(coalesce(r.prosrc, ''), '--[^\n]*', '', 'g');
    durum := case when r.prosrc is null then 'FONKSİYON YOK'
                  else concat_ws(', ',
                         case when cikti ~* '\m(sifre_ozeti|anahtar)\M' or r.donus ~* '\m(sifre_ozeti|anahtar)\M' then 'anahtar/özet sütunu' end,
                         case when cikti ~* '\msite_oturumlari\M' then 'oturum tablosu' end,
                         case when cikti ~* '\mselect\s+(\w+\.)?\*' or cikti ~* '\m\w+\.\*' then 'tüm satır (*)' end,
                         case when cikti ~* '(to_jsonb|row_to_json|to_json|jsonb_agg|json_agg)\s*\(\s*\w+\s*\)' then 'tüm satır (json)' end) end;
    durum := coalesce(nullif(durum, ''), 'yok');
    s := s || jsonb_build_array(jsonb_build_array(sira, 'gövde + dönüş tipi: ' || r.f || ' → ' || coalesce(r.donus, '—'),
                                                  'yok', durum, case when durum = 'yok' then 'tamam' else 'AÇIK' end));
  end loop;

  insert into guvenlik.site_19_sinama (sira, kontrol, beklenen, sonuc, durum)
  select (e ->> 0)::integer, e ->> 1, e ->> 2, e ->> 3, e ->> 4 from jsonb_array_elements(s) e;
end $$;

select kontrol, beklenen, sonuc, durum,
       case when sira = (select min(sira) from guvenlik.site_19_sinama)
            then (select count(*) filter (where durum = 'tamam') || ' tamam · ' || count(*) filter (where durum not in ('tamam', 'bilgi'))
                         || ' sorun · ' || count(*) filter (where durum = 'bilgi') || ' bilgi' from guvenlik.site_19_sinama) end as ozet
from guvenlik.site_19_sinama order by sira;
