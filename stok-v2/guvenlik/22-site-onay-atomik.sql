-- =====================================================================================================================
--  22-site-onay-atomik.sql — SİTE KAYIT ONAYI TEK İŞLEM + ESKİ ERP'NİN BOŞTA CARİ AÇMASI ENGELİ  (AYRI ONAYLA; canlıya uygulanmadı)
--  ÜRETİLMİŞ DOSYA — elle düzenlenmez. Kaynak: site-portal.sql "22 BAŞLANGIÇ / BİTİŞ" bölümü + 22-kaynak/uygula.sablon.sql;
--  üretici: python3 stok-v2/guvenlik/22-uret.py (t22 testi üretilenin bu dosyayla aynı olduğunu denetler).
-- =====================================================================================================================
--  Sorun (21, PR #360): ERP yeni cariyi kendisi açıp SONRA site_kayit_onayla çağırıyordu. Arada başka cihaz talebi işlerse, cihaz
--  kapanırsa ya da cari buluta ulaşamazsa cari BOŞTA kalıyordu.
--  DEĞİŞİKLİK (tanımlar site-portal.sql ile birebir):
--   - site_kayit_talepleri.islenme sütunu (onay / ret zamanı).
--   - site_kayit_onayla_yeni_cari(talep, cari kimliği): talep kilitlenir, cari TALEPTEKİ bilgilerden sunucuda açılır, hesap kurulur,
--     talep kapanır — tek işlem. Aynı kimlikle tekrar 'zaten' (yazmaz); başka kimlikle ikinci onay "işlenmiş" (cari yazmaz).
--   - site_kayit_onayla (mevcut cariye bağlama): aynı cariyle tekrar sessiz; işlenme zamanı yazılır.
--   - site_kayit_reddet: onaylanmış talep reddedilemez; işlenme zamanı yazılır.
--   - cariler BEFORE INSERT tetikleyicisi site_cari_ekleme_koru: uygulamadan (JWT) gelen YENİ cari bir talebin ünvan + telefonunu
--     taşıyor ve talep bekliyorsa ya da cari talebin işlenmesinden en geç 1 gün sonra OLUŞTURULMUŞSA (an kimlikten okunur; bekleyen
--     defterden günler sonra gelen eski yazma da yakalanır) KR013 ile reddedilir — bir talebin onayıyla bu kimliğe bağlanmış cari hariç.
--     İstisna istemcinin taklit edebileceği bir işarete değil sunucudaki talep verisine dayanır. 22'den önce işlenmiş taleplerin
--     işlenme zamanı uygulama anıyla doldurulur (tek veri değişikliği).
--   - Yardımcılar: site_eslesme_anahtari, site_vergi_no_kaydedilecek (ERP'nin vergiNoKaydedilecek kuralı), site_kimlik_zamani
--     (uygulamanın cari kimliğindeki oluşturma anı).
--  ETKİ: eski ERP (1.744.21 ve öncesi, 7c6ec2e) yeni cariyle onay yapamaz — cari yazması KR013 ile reddedilir, ardından onay "Cari
--  bulunamadı" ile düşer; bulutta cari oluşmaz. Mevcut cariye bağlama ve ret eski ERP'de de çalışır (tek işlem). Yeni ERP sürümü
--  yayınlanana kadar yeni cariyle onay beklemeli.
--  Sonra 19-durum-salt-okur.sql onayla / reddet satırlarında "FARKLI" der (bu dosya onları bilerek değiştirir); durum için
--  22-onkosul-salt-okur.sql.
--  ÖNKOŞULLAR (biri tutmazsa HATA, hiçbir şey değişmez): postgres rolü; tablolar ve 19'un kapısı var; 22 uygulanmamış; 22'nin
--  OLUŞTURACAĞI nesnelerden (5 fonksiyon, tetikleyici, islenme sütunu) HİÇBİRİ önceden yok — varsa sessizce değiştirilmez, durur;
--  cariler'de değişiklik sayacı (degisiklik_izle) var ve ETKİN; onayla / reddet gövdeleri 19'daki hâlle aynı (md5); cariler'de id /
--  unvan / ek sütunları var.
--  YEDEK (guvenlik.site_onay_22_yedek): onayla / reddet'in tanımı ve yetkileri (önce), 22'nin oluşturduğu nesneler listesi, uygulama
--  SONRASI tetikleyici tanımı + etkinliği ve altı fonksiyonun yetki / sahip / güvenlik ayarı. Geri alma: 22-site-onay-atomik-geri-al.sql
--  (bunlardan biri sonradan değiştiyse dokunmadan durur; yalnız 22'nin oluşturduklarını kaldırır).
--  Çalıştırma: Supabase › SQL Editor (postgres) › dosyanın TAMAMI › Run. Bütün değişiklik TEK do bloğunda: Editor ifadeleri ayrı
--  gönderse de ya hepsi uygulanır ya hiçbiri. Sonuç guvenlik.site_onay_22_sonuc'ta kalır (son select gösterir).
-- =====================================================================================================================
begin;

do $$
declare
  v22_onayla text;
  v22_reddet text;
  v22_eksik text;
  v22_ozet text;
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('public.site_kayit_talepleri') is null or to_regclass('public.site_hesaplari') is null or to_regclass('public.cariler') is null then
    raise exception 'site_kayit_talepleri / site_hesaplari / cariler tablolarından biri yok. Hiçbir şey değişmedi.';
  end if;
  if to_regprocedure('public.site_yonetici_kapisi()') is null or to_regprocedure('public.yonetici_mi()') is null then
    raise exception '19 uygulanmamış (site_yonetici_kapisi yok). Hiçbir şey değişmedi.';
  end if;
  if to_regclass('guvenlik.site_onay_22_yedek') is not null then
    if exists (select 1 from guvenlik.site_onay_22_yedek where tur = 'isaret') then
      raise exception '22 zaten uygulanmış (guvenlik.site_onay_22_yedek dolu). Geri almak için 22-site-onay-atomik-geri-al.sql. Hiçbir şey değişmedi.';
    end if;
  end if;
  select string_agg(n, ', ') into v22_eksik from (
    select x as n from unnest(array['public.site_kimlik_zamani(text)', 'public.site_eslesme_anahtari(text, text)', 'public.site_vergi_no_kaydedilecek(text)', 'public.site_kayit_onayla_yeni_cari(text, text)', 'public.site_cari_ekleme_koru()']) x where to_regprocedure(x) is not null
    union all select 'tetikleyici site_cari_ekleme_koru' where exists (select 1 from pg_trigger where tgname = 'site_cari_ekleme_koru' and not tgisinternal)
    union all select 'sütun site_kayit_talepleri.islenme'
     where exists (select 1 from pg_attribute where attrelid = 'public.site_kayit_talepleri'::regclass and attname = 'islenme' and not attisdropped)) z;
  if v22_eksik is not null then
    raise exception '22''nin oluşturacağı nesneler zaten var (%): sessizce değiştirilmez. Kaynağını inceleyin (site-portal.sql ile kurulmuş olabilir). Hiçbir şey değişmedi.', v22_eksik;
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.cariler'::regclass and tgname = 'degisiklik_izle' and not tgisinternal and tgenabled <> 'D') then
    raise exception 'cariler değişiklik sayacı (degisiklik_izle) yok ya da devre dışı: sunucunun açtığı cari diğer cihazlara ulaşmaz. Önce degisiklik-sayaci.sql. Hiçbir şey değişmedi.';
  end if;
  select md5(btrim(regexp_replace(regexp_replace(prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) into v22_onayla
    from pg_proc where oid = to_regprocedure('public.site_kayit_onayla(text, text)');
  select md5(btrim(regexp_replace(regexp_replace(prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) into v22_reddet
    from pg_proc where oid = to_regprocedure('public.site_kayit_reddet(text)');
  if v22_onayla is distinct from '86debf97b2f8ae9c1845f85900e65492' or v22_reddet is distinct from '071e82fa3ad4c6eb0d2be0c2e6047cbe' then
    raise exception 'site_kayit_onayla / site_kayit_reddet canlıda 19 hâlinden farklı (onayla %, reddet %). Hiçbir şey değişmedi.',
      coalesce(v22_onayla, 'yok'), coalesce(v22_reddet, 'yok');
  end if;
  if exists (select 1 from pg_proc where oid in (to_regprocedure('public.site_kayit_onayla(text, text)'), to_regprocedure('public.site_kayit_reddet(text)')) and proacl is null) then
    raise exception 'site_kayit_onayla / site_kayit_reddet yetkileri varsayılan (açık tanım yok; 19 tanımlamış olmalıydı) — geri alma birebir kuramaz. Hiçbir şey değişmedi.';
  end if;
  select string_agg(s, ', ') into v22_eksik from unnest(array['id', 'unvan', 'ek']) s
   where not exists (select 1 from pg_attribute a where a.attrelid = 'public.cariler'::regclass and a.attname = s and a.attnum > 0 and not a.attisdropped);
  if v22_eksik is not null then raise exception 'cariler tablosunda sütun yok: %. Hiçbir şey değişmedi.', v22_eksik; end if;

  create schema if not exists guvenlik;
  revoke all on schema guvenlik from public, anon, authenticated;
  create table if not exists guvenlik.site_onay_22_yedek (
    alindi timestamptz not null default now(),
    tur    text not null,
    nesne  text,
    tanim  text,
    ozet   text
  );
  revoke all on guvenlik.site_onay_22_yedek from public, anon, authenticated;
  insert into guvenlik.site_onay_22_yedek (tur) values ('isaret');
  insert into guvenlik.site_onay_22_yedek (tur, nesne, tanim, ozet) values
    ('fonksiyon', 'public.site_kayit_onayla(text, text)', pg_get_functiondef(to_regprocedure('public.site_kayit_onayla(text, text)')), v22_onayla),
    ('fonksiyon', 'public.site_kayit_reddet(text)', pg_get_functiondef(to_regprocedure('public.site_kayit_reddet(text)')), v22_reddet);
  insert into guvenlik.site_onay_22_yedek (tur, nesne, tanim)
  select 'once_yetki', x, (select coalesce(p.proacl::text, '') from pg_proc p where p.oid = to_regprocedure(x))
    from unnest(array['public.site_kayit_onayla(text, text)', 'public.site_kayit_reddet(text)']) x;

alter table public.site_kayit_talepleri add column if not exists islenme timestamptz;

update public.site_kayit_talepleri set islenme = now() where durum <> 'yeni' and islenme is null;

create or replace function public.site_kimlik_zamani(p_id text)
returns timestamptz language plpgsql immutable set search_path = public, pg_temp
as '
declare
  parca text := substring(coalesce(p_id, '''') from ''\Acari-([0-9a-z]{1,11})-[0-9a-z]{1,8}\Z'');
  v bigint := 0;
  i int;
begin
  if parca is null then return null; end if;
  for i in 1..length(parca) loop
    v := v * 36 + position(substr(parca, i, 1) in ''0123456789abcdefghijklmnopqrstuvwxyz'') - 1;
  end loop;
  if v < 1577836800000 or v > 4102444800000 then return null; end if;
  return to_timestamp(v / 1000.0);
end;
';

create or replace function public.site_eslesme_anahtari(p_unvan text, p_telefon text)
returns text language sql immutable set search_path = public, pg_temp
as '
  select lower(translate(regexp_replace(btrim(coalesce(p_unvan, '''')), ''\s+'', '' '', ''g''), ''İIı'', ''iii'')) || ''|'' || regexp_replace(coalesce(p_telefon, ''''), ''[^0-9]'', '''', ''g'');
';

create or replace function public.site_vergi_no_kaydedilecek(p text)
returns text language plpgsql immutable set search_path = public, pg_temp
as '
declare
  ham text := btrim(coalesce(p, ''''), '' '' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13));
  n text := regexp_replace(coalesce(p, ''''), ''[[:space:].-]'', '''', ''g'');
  toplam int := 0;
  tmp int;
  v int;
  tek int;
  cift int;
  i int;
begin
  if n = '''' or n !~ ''\A[0-9]+\Z'' then return ham; end if;
  if length(n) = 10 then
    for i in 0..8 loop
      tmp := (substr(n, i + 1, 1)::int + 9 - i) % 10;
      v := (tmp * (2 ^ (9 - i))::int) % 9;
      if tmp <> 0 and v = 0 then v := 9; end if;
      toplam := toplam + v;
    end loop;
    if (10 - (toplam % 10)) % 10 = substr(n, 10, 1)::int then return n; end if;
    return ham;
  end if;
  if length(n) = 11 and n ~ ''\A[1-9]'' then
    tek := substr(n, 1, 1)::int + substr(n, 3, 1)::int + substr(n, 5, 1)::int + substr(n, 7, 1)::int + substr(n, 9, 1)::int;
    cift := substr(n, 2, 1)::int + substr(n, 4, 1)::int + substr(n, 6, 1)::int + substr(n, 8, 1)::int;
    if (((tek * 7 - cift) % 10) + 10) % 10 <> substr(n, 10, 1)::int then return ham; end if;
    toplam := 0;
    for i in 1..10 loop toplam := toplam + substr(n, i, 1)::int; end loop;
    if toplam % 10 = substr(n, 11, 1)::int then return n; end if;
  end if;
  return ham;
end;
';

create or replace function public.site_kayit_onayla_yeni_cari(p_id text, p_cari_id text)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as '
declare
  t record;
  b jsonb;
  satir jsonb;
  sutunlar text;
begin
  perform public.site_yonetici_kapisi();
  if coalesce(p_cari_id, '''') !~ ''\Acari-[a-z0-9]{1,16}-[a-z0-9]{1,8}\Z'' then
    raise exception ''Cari kimliği geçersiz'';
  end if;
  select * into t from site_kayit_talepleri where id = p_id for update;
  if not found then raise exception ''Talep bulunamadı ya da işlenmiş''; end if;
  if t.durum = ''onaylandi'' and t.cari_id = p_cari_id then
    return jsonb_build_object(''durum'', ''zaten'', ''cari_id'', p_cari_id);
  end if;
  if t.durum <> ''yeni'' then raise exception ''Talep bulunamadı ya da işlenmiş''; end if;
  if exists (select 1 from site_hesaplari where kullanici = t.kullanici) then raise exception ''Bu kullanıcı adı artık kullanılıyor''; end if;
  if exists (select 1 from cariler where id::text = p_cari_id) then raise exception ''Cari kimliği kullanılıyor''; end if;
  b := coalesce(t.bilgiler, ''{}''::jsonb);
  update site_kayit_talepleri set durum = ''onaylandi'', cari_id = p_cari_id, islenme = now(), sifre_ozeti = null where id = p_id;
  satir := jsonb_strip_nulls(jsonb_build_object(
    ''id'', p_cari_id, ''unvan'', btrim(coalesce(b ->> ''unvan'', '''')), ''tip'', ''Müşteri'',
    ''telefon'', nullif(b ->> ''telefon'', ''''), ''vergi_no'', nullif(public.site_vergi_no_kaydedilecek(b ->> ''vergiNo''), ''''),
    ''adres'', nullif(b ->> ''adres'', ''''), ''para_birimi'', ''TRY'', ''bagli_prosesler'', ''[]''::jsonb, ''pasif'', false, ''surum'', 1,
    ''ek'', jsonb_strip_nulls(jsonb_build_object(
      ''notlar'', concat_ws('' · '', ''Yetkili: '' || nullif(b ->> ''yetkili'', ''''), ''Site notu: '' || nullif(b ->> ''not'', ''''), ''Web sitesinden kayıt''),
      ''siteOdemeSor'', true, ''eposta'', nullif(b ->> ''eposta'', ''''), ''vergiDairesi'', nullif(b ->> ''vergiDairesi'', ''''),
      ''ulke'', nullif(b ->> ''ulke'', ''''), ''il'', nullif(b ->> ''il'', ''''), ''ilce'', nullif(b ->> ''ilce'', '''')))));
  select string_agg(quote_ident(k), '', '') into sutunlar from jsonb_object_keys(satir) k
   where exists (select 1 from pg_attribute a where a.attrelid = ''public.cariler''::regclass and a.attname = k and a.attnum > 0 and not a.attisdropped);
  execute format(''insert into public.cariler (%s) select %s from jsonb_populate_record(null::public.cariler, %L::jsonb)'', sutunlar, sutunlar, satir::text);
  insert into site_hesaplari (cari_id, kullanici, sifre_ozeti) values (p_cari_id, t.kullanici, t.sifre_ozeti);
  return jsonb_build_object(''durum'', ''onaylandi'', ''cari_id'', p_cari_id);
end;
';

create or replace function public.site_kayit_onayla(p_id text, p_cari_id text)
returns void language plpgsql volatile security definer set search_path = public
as '
declare t record;
begin
  perform public.site_yonetici_kapisi();
  select * into t from site_kayit_talepleri where id = p_id for update;
  if not found then raise exception ''Talep bulunamadı ya da işlenmiş''; end if;
  if t.durum = ''onaylandi'' and t.cari_id = p_cari_id then return; end if;
  if t.durum <> ''yeni'' then raise exception ''Talep bulunamadı ya da işlenmiş''; end if;
  if not exists (select 1 from cariler where id::text = p_cari_id) then raise exception ''Cari bulunamadı''; end if;
  if exists (select 1 from site_hesaplari where kullanici = t.kullanici) then raise exception ''Bu kullanıcı adı artık kullanılıyor''; end if;
  insert into site_hesaplari (cari_id, kullanici, sifre_ozeti) values (p_cari_id, t.kullanici, t.sifre_ozeti)
  on conflict (cari_id) do update set kullanici = excluded.kullanici, sifre_ozeti = excluded.sifre_ozeti, hatali_deneme = 0, kilit_bitis = null;
  update site_kayit_talepleri set durum = ''onaylandi'', cari_id = p_cari_id, islenme = now(), sifre_ozeti = null where id = p_id;
end;
';

create or replace function public.site_kayit_reddet(p_id text)
returns void language plpgsql volatile security definer set search_path = public
as '
declare d text;
begin
  perform public.site_yonetici_kapisi();
  select durum into d from site_kayit_talepleri where id = p_id for update;
  if not found or d = ''reddedildi'' then return; end if;
  if d <> ''yeni'' then raise exception ''Talep onaylanmış; reddedilemez''; end if;
  update site_kayit_talepleri set durum = ''reddedildi'', islenme = now(), sifre_ozeti = null where id = p_id;
end;
';

create or replace function public.site_cari_ekleme_koru()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as '
declare
  anahtar text;
  dogum timestamptz;
begin
  if auth.jwt() is null or coalesce(auth.jwt() ->> ''role'', '''') = ''service_role'' then return new; end if;
  if exists (select 1 from cariler c where c.id = new.id) then return new; end if;
  if exists (select 1 from site_kayit_talepleri t where t.durum = ''onaylandi'' and t.cari_id = new.id::text) then return new; end if;
  anahtar := public.site_eslesme_anahtari(to_jsonb(new) ->> ''unvan'', to_jsonb(new) ->> ''telefon'');
  dogum := coalesce(public.site_kimlik_zamani(new.id::text), now());
  if exists (select 1 from site_kayit_talepleri t
              where (t.durum = ''yeni'' or dogum <= coalesce(t.islenme, now()) + interval ''1 day'')
                and public.site_eslesme_anahtari(t.bilgiler ->> ''unvan'', t.bilgiler ->> ''telefon'') = anahtar) then
    raise exception ''KR013: Bu ünvan ve telefonla siteden gelen bir kayıt talebi var; bu cari yalnız Siteden gelen kayıt talepleri ekranından onayla açılır (uygulama eskiyse yenileyin)''
      using errcode = ''KR013'';
  end if;
  return new;
end;
';

drop trigger if exists site_cari_ekleme_koru on public.cariler;

create trigger site_cari_ekleme_koru before insert on public.cariler for each row execute function public.site_cari_ekleme_koru();

revoke all on function public.site_eslesme_anahtari(text, text), public.site_vergi_no_kaydedilecek(text), public.site_kimlik_zamani(text), public.site_cari_ekleme_koru() from public, anon, authenticated;

revoke all on function public.site_kayit_listesi(), public.site_kayit_onayla(text, text), public.site_kayit_reddet(text), public.site_kayit_onayla_yeni_cari(text, text) from public, anon;

grant execute on function public.site_kayit_listesi(), public.site_kayit_onayla(text, text), public.site_kayit_reddet(text), public.site_kayit_onayla_yeni_cari(text, text) to authenticated;

  insert into guvenlik.site_onay_22_yedek (tur, nesne)
  select 'olusturdu', x from unnest(array['public.site_kimlik_zamani(text)', 'public.site_eslesme_anahtari(text, text)', 'public.site_vergi_no_kaydedilecek(text)', 'public.site_kayit_onayla_yeni_cari(text, text)', 'public.site_cari_ekleme_koru()', 'tetikleyici:public.cariler.site_cari_ekleme_koru', 'sutun:public.site_kayit_talepleri.islenme']) x;
  insert into guvenlik.site_onay_22_yedek (tur, nesne, tanim)
  select 'sonra', 'tetikleyici:public.cariler.site_cari_ekleme_koru', pg_get_triggerdef(t.oid) || ' | ' || t.tgenabled::text
    from pg_trigger t where t.tgrelid = 'public.cariler'::regclass and t.tgname = 'site_cari_ekleme_koru';
  insert into guvenlik.site_onay_22_yedek (tur, nesne, tanim)
  select 'sonra', x.ad, (select coalesce(p.proacl::text, '') || ' | ' || p.prosecdef || ' | ' || coalesce(array_to_string(p.proconfig, ','), '')
                                 || ' | ' || pg_get_userbyid(p.proowner) from pg_proc p where p.oid = to_regprocedure(x.ad))
    from (values (1, 'public.site_kimlik_zamani(text)', '785adfb4ada8114405287a3e5a8dc64a'), (2, 'public.site_eslesme_anahtari(text, text)', '69585b19b83b568603d2b71f27080389'), (3, 'public.site_vergi_no_kaydedilecek(text)', '75620b7d843d458d1303978be7ec8bdb'), (4, 'public.site_kayit_onayla_yeni_cari(text, text)', 'e63acb4dfb28ccffde5191311097cdda'), (5, 'public.site_kayit_onayla(text, text)', '55aaa9ed6a8300ba9ee2847c44f7ea98'), (6, 'public.site_kayit_reddet(text)', 'b02d38f099990a98b992f63b178d2060'), (7, 'public.site_cari_ekleme_koru()', '68e61c5d9ecf07ee2888b6ce39ff0aa1')) x(sira, ad, beklenen);

  create table if not exists guvenlik.site_onay_22_sonuc (sira int, kontrol text, beklenen text, sonuc text, durum text);
  revoke all on guvenlik.site_onay_22_sonuc from public, anon, authenticated;
  delete from guvenlik.site_onay_22_sonuc;
  insert into guvenlik.site_onay_22_sonuc
  select row_number() over (order by f.sira), f.ad, f.beklenen, coalesce(f.canli, 'yok'),
         case when f.canli = f.beklenen then 'tamam' else 'FARKLI' end
    from (select x.sira, x.ad, x.beklenen,
                 (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g')))
                    from pg_proc p where p.oid = to_regprocedure(x.ad)) as canli
            from (values (1, 'public.site_kimlik_zamani(text)', '785adfb4ada8114405287a3e5a8dc64a'), (2, 'public.site_eslesme_anahtari(text, text)', '69585b19b83b568603d2b71f27080389'), (3, 'public.site_vergi_no_kaydedilecek(text)', '75620b7d843d458d1303978be7ec8bdb'), (4, 'public.site_kayit_onayla_yeni_cari(text, text)', 'e63acb4dfb28ccffde5191311097cdda'), (5, 'public.site_kayit_onayla(text, text)', '55aaa9ed6a8300ba9ee2847c44f7ea98'), (6, 'public.site_kayit_reddet(text)', 'b02d38f099990a98b992f63b178d2060'), (7, 'public.site_cari_ekleme_koru()', '68e61c5d9ecf07ee2888b6ce39ff0aa1')) x(sira, ad, beklenen)) f;
  insert into guvenlik.site_onay_22_sonuc values
    (90, 'cariler tetikleyicisi site_cari_ekleme_koru', 'BEFORE INSERT, satır başına',
     coalesce((select case when tgtype & 2 = 2 and tgtype & 4 = 4 and tgtype & 1 = 1 then 'BEFORE INSERT, satır başına' else tgtype::text end
                 from pg_trigger where tgrelid = 'public.cariler'::regclass and tgname = 'site_cari_ekleme_koru'), 'yok'), null),
    (91, 'site_kayit_onayla_yeni_cari: authenticated çalıştırır / anon çalıştıramaz', 'evet / hayır',
     (case when has_function_privilege('authenticated', 'public.site_kayit_onayla_yeni_cari(text, text)', 'execute') then 'evet' else 'hayır' end)
     || ' / ' || (case when has_function_privilege('anon', 'public.site_kayit_onayla_yeni_cari(text, text)', 'execute') then 'evet' else 'hayır' end), null),
    (92, 'site_kayit_talepleri.islenme sütunu', 'var',
     case when exists (select 1 from pg_attribute where attrelid = 'public.site_kayit_talepleri'::regclass and attname = 'islenme' and not attisdropped) then 'var' else 'yok' end, null);
  update guvenlik.site_onay_22_sonuc set durum = case when sonuc = beklenen then 'tamam' else 'FARKLI' end where durum is null;
  select string_agg(kontrol, '; ') into v22_ozet from guvenlik.site_onay_22_sonuc where durum <> 'tamam';
  if v22_ozet is not null then
    raise exception '22 doğrulaması tutmadı (%). Bu blok geri alındı; hiçbir şey değişmedi.', v22_ozet;
  end if;
end $$;

select sira, kontrol, beklenen, sonuc, durum from guvenlik.site_onay_22_sonuc order by sira;

commit;
