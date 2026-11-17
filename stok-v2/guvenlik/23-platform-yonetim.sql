-- =====================================================================================================================
--  23-platform-yonetim.sql — YÖNETİM PANELİ VERİSİ (firmalar, sözleşmeler, ödemeler, olay günlüğü)   (AYRI ONAYLA; canlıya uygulanmadı)
--  Tasarım: YONETIM-PANELI-TASARIM.md. YALNIZ ANA PROJEDE (nds) çalıştırılır. Supabase › SQL Editor › dosyanın TAMAMI › Run.
-- =====================================================================================================================
--  NE YAPAR
--   - public.platform_yoneticileri: paneli görebilecek hesaplar (auth kullanıcı kimliği). Uygulamadan KİMSE yazamaz / okuyamaz;
--     yalnız SQL Editor. Ana firmanın "Yönetici" rolü bile kendini ekleyemez.
--   - public.platform_yonetici_mi(): giriş yapan hesap (auth.uid()) listede mi. Bütün erişim kuralları buna bağlı.
--   - public.platform_firmalar / platform_sozlesmeler / platform_odemeler: RLS açık; yalnız platform yöneticisi okur ve yazar.
--     SİLME YOK (hiçbir rolde DELETE yetkisi yok): firma "ayrıldı", sözleşme "bitti" olur. Ödeme DEĞİŞTİRİLMEZ; düzeltme eksi
--     tutarlı, düzelttiği ödemeyi gösteren yeni ödemedir.
--   - public.platform_olaylar: günlük. Uygulama YAZMAZ; tetikleyiciler yazar (firma açıldı / durum / barındırma, sözleşme, ödeme).
--   - Ödemesi olan sözleşmenin para birimi değişmez; düzeltme ödemesi düzelttiği ödemeyle aynı firma, SÖZLEŞME ve para biriminde.
--     Sözleşme değişikliği ile aynı anda girilen ödeme birbirini bekler (satır kilidi) — ikisi birlikte tutarsızlık bırakamaz.
--   - anon hiçbir platform_ nesnesine erişemez. Supabase'in "yeni tablo herkese açık doğar" varsayılanı burada açıkça geri alınır.
--  NEDEN public ŞEMASI: gece yedeği yalnız public'i döker ve sınar; ayrı şema yedeğin dışında kalırdı.
--  GÜVENLİ ÇALIŞTIRMA: tek do bloğu = tek işlem. platform_ nesnelerinden biri bile VARSA hiçbir şeye dokunmadan durur
--  (önce 23-onkosul-salt-okur.sql). Bloktaki her hata bütün değişiklikleri geri alır. Son select yalnız okur.
--  SONRA (kendi hesabınızı ekleyin; e-postanızı yazın, başka hiçbir şeyi değiştirmeyin):
--    insert into public.platform_yoneticileri (kullanici, ad)
--    select id, 'Platform yöneticisi' from auth.users where email = '<ERP GİRİŞ E-POSTANIZ>';
--  DOĞRULAMA: bu dosyanın son tablosu kaba denetimdir; asıl doğrulama 23-onkosul-salt-okur.sql (politika içerikleri, bütün
--  yetkiler, fonksiyon gövdeleri, tetikleyiciler birebir) → GENEL "UYGULANMIŞ".
--  GERİ ALMA: 23-platform-yonetim-geri-al.sql (firma / sözleşme / ödeme kaydı varsa durur).
-- =====================================================================================================================

do $$
declare
  var_olan text;
begin
  select string_agg(ad, ', ') into var_olan from (
    select c.relname::text as ad from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname like 'platform\_%'
    union all
    select p.proname::text from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'platform\_%') x;
  if var_olan is not null then
    raise exception 'DUR: platform_ nesneleri zaten var (%). Hiçbir şey değişmedi — 23-onkosul-salt-okur.sql ile durumu okuyun.', var_olan;
  end if;

  -- ── yöneticiler + kapı ────────────────────────────────────────────────────────────────────────────────────────────
  create table public.platform_yoneticileri (
    kullanici uuid primary key references auth.users (id) on delete cascade,
    ad text not null default '',
    eklenme timestamptz not null default now()
  );
  alter table public.platform_yoneticileri enable row level security;   -- politika YOK: uygulamadan hiçbir satır görünmez
  revoke all on public.platform_yoneticileri from public, anon, authenticated;

  create function public.platform_yonetici_mi() returns boolean
    language sql stable security definer set search_path = public, pg_catalog
  as ' select auth.uid() is not null and exists (select 1 from public.platform_yoneticileri y where y.kullanici = auth.uid()) ';
  revoke all on function public.platform_yonetici_mi() from public, anon;
  grant execute on function public.platform_yonetici_mi() to authenticated;

  -- ── firmalar ──────────────────────────────────────────────────────────────────────────────────────────────────────
  create table public.platform_firmalar (
    id uuid primary key default gen_random_uuid(),
    kod text not null unique check (kod ~ '\A[a-z0-9-]{2,40}\Z'),
    unvan text not null check (btrim(unvan) <> ''),
    durum text not null default 'deneme' check (durum in ('deneme', 'aktif', 'askida', 'ayrildi')),
    barindirma text not null default 'firma_hesabi' check (barindirma in ('firma_hesabi', 'bizim_org')),
    supabase_adres text check (supabase_adres is null or supabase_adres ~ '\Ahttps://[a-z0-9]{8,40}\.supabase\.co\Z'),
    yetkili text, telefon text, eposta text, vergi_dairesi text, vergi_no text,
    adres text, il text, sektor text, kullanici_sayisi integer check (kullanici_sayisi is null or kullanici_sayisi >= 0), web text,
    ek jsonb not null default '{}'::jsonb check (jsonb_typeof(ek) = 'object'),
    notlar text,
    olusturma timestamptz not null default now(),
    guncelleme timestamptz not null default now()
  );

  -- ── sözleşmeler ───────────────────────────────────────────────────────────────────────────────────────────────────
  create table public.platform_sozlesmeler (
    id uuid primary key default gen_random_uuid(),
    firma_id uuid not null references public.platform_firmalar (id),
    baslangic date not null,
    bitis date not null,
    yillik_ucret numeric(14, 2) not null check (yillik_ucret >= 0),
    para_birimi text not null check (para_birimi in ('TRY', 'USD')),
    durum text not null default 'gecerli' check (durum in ('taslak', 'gecerli', 'bitti')),
    notlar text,
    olusturma timestamptz not null default now(),
    check (bitis >= baslangic),
    unique (id, firma_id)
  );
  create index platform_sozlesmeler_firma on public.platform_sozlesmeler (firma_id);

  -- ── ödemeler (değiştirilmez; düzeltme = eksi tutarlı yeni satır) ───────────────────────────────────────────────────
  create table public.platform_odemeler (
    id uuid primary key default gen_random_uuid(),
    firma_id uuid not null references public.platform_firmalar (id),
    sozlesme_id uuid,
    tarih date not null,
    tutar numeric(14, 2) not null check (tutar <> 0),
    para_birimi text not null check (para_birimi in ('TRY', 'USD')),
    yontem text,
    notlar text,
    duzeltilen_odeme uuid references public.platform_odemeler (id),
    olusturan uuid default auth.uid(),
    olusturma timestamptz not null default now(),
    foreign key (sozlesme_id, firma_id) references public.platform_sozlesmeler (id, firma_id),   -- sözleşme AYNI firmanın olmalı
    check (tutar > 0 or duzeltilen_odeme is not null)                                            -- eksi tutar yalnız düzeltme
  );
  create index platform_odemeler_firma on public.platform_odemeler (firma_id);

  -- ── olay günlüğü (yalnız tetikleyiciler yazar) ─────────────────────────────────────────────────────────────────────
  create table public.platform_olaylar (
    id bigint generated always as identity primary key,
    firma_id uuid not null references public.platform_firmalar (id),
    zaman timestamptz not null default now(),
    tur text not null,
    aciklama text not null default '',
    kim uuid
  );
  create index platform_olaylar_firma on public.platform_olaylar (firma_id, zaman);

  -- ── tutarlılık: ödemenin para birimi sözleşmeninkiyle aynı; düzeltilen ödeme aynı firmanın ve aynı para biriminde ─────
  create function public.platform_odeme_denetle() returns trigger
    language plpgsql security definer set search_path = public, pg_catalog
  as '
  declare pb text; f uuid; s uuid;
  begin
    if new.sozlesme_id is not null then
      -- FOR SHARE: aynı anda sözleşmenin para birimini değiştiren işlem bu ödeme bitene kadar bekler (ve sonra ödemeyi görüp
      -- reddeder); önce o başladıysa bu satır onun bitmesini bekler ve YENİ para birimini okur. Kilit olmadan iki işlem
      -- birbirini görmeden geçebiliyordu (TRY ödemesi + USD sözleşme).
      select para_birimi into pb from public.platform_sozlesmeler where id = new.sozlesme_id for share;
      if pb is distinct from new.para_birimi then
        raise exception using errcode = ''23514'', message = format(''PLATFORM: ödeme para birimi (%s) sözleşmeninkiyle (%s) aynı olmalı'', new.para_birimi, pb);
      end if;
    end if;
    if new.duzeltilen_odeme is not null then
      select firma_id, para_birimi, sozlesme_id into f, pb, s from public.platform_odemeler where id = new.duzeltilen_odeme;
      if f is distinct from new.firma_id or pb is distinct from new.para_birimi or s is distinct from new.sozlesme_id then
        raise exception using errcode = ''23514'', message = ''PLATFORM: düzeltme, düzelttiği ödemeyle aynı firma, sözleşme ve para biriminde olmalı'';
      end if;
    end if;
    return new;
  end ';
  create trigger platform_odeme_denetle before insert on public.platform_odemeler
    for each row execute function public.platform_odeme_denetle();

  -- ── sözleşmenin para birimi, ödemesi varken değişmez (ödemeler o para biriminde tahsil edildi) ───────────────────────
  create function public.platform_sozlesme_denetle() returns trigger
    language plpgsql security definer set search_path = public, pg_catalog
  as '
  begin
    if new.para_birimi is distinct from old.para_birimi
       and exists (select 1 from public.platform_odemeler o where o.sozlesme_id = old.id) then
      raise exception using errcode = ''23514'', message = format(''PLATFORM: ödemesi olan sözleşmenin para birimi değiştirilemez (%s → %s)'', old.para_birimi, new.para_birimi);
    end if;
    return new;
  end ';
  create trigger platform_sozlesme_denetle before update on public.platform_sozlesmeler
    for each row execute function public.platform_sozlesme_denetle();

  create function public.platform_guncelleme_damgasi() returns trigger
    language plpgsql set search_path = public, pg_catalog
  as ' begin new.guncelleme := now(); new.olusturma := old.olusturma; return new; end ';
  create trigger platform_firma_guncelleme before update on public.platform_firmalar
    for each row execute function public.platform_guncelleme_damgasi();

  -- ── olay yazıcı ───────────────────────────────────────────────────────────────────────────────────────────────────
  create function public.platform_olay_yaz() returns trigger
    language plpgsql security definer set search_path = public, pg_catalog
  as '
  declare a text := '''';
  begin
    if tg_table_name = ''platform_firmalar'' then
      if tg_op = ''INSERT'' then
        insert into public.platform_olaylar (firma_id, tur, aciklama, kim) values (new.id, ''firma açıldı'', new.unvan || '' ('' || new.kod || '', '' || new.durum || '')'', auth.uid());
      else
        if new.durum is distinct from old.durum then a := a || ''durum: '' || old.durum || '' → '' || new.durum || ''; ''; end if;
        if new.barindirma is distinct from old.barindirma then a := a || ''barındırma: '' || old.barindirma || '' → '' || new.barindirma || ''; ''; end if;
        if new.kod is distinct from old.kod then a := a || ''kod: '' || old.kod || '' → '' || new.kod || ''; ''; end if;
        if new.supabase_adres is distinct from old.supabase_adres then a := a || ''proje adresi değişti; ''; end if;
        if a = '''' then a := ''bilgiler güncellendi''; end if;
        insert into public.platform_olaylar (firma_id, tur, aciklama, kim) values (new.id, ''firma değişti'', rtrim(a, ''; ''), auth.uid());
      end if;
    elsif tg_table_name = ''platform_sozlesmeler'' then
      insert into public.platform_olaylar (firma_id, tur, aciklama, kim) values (new.firma_id,
        case when tg_op = ''INSERT'' then ''sözleşme eklendi'' else ''sözleşme değişti'' end,
        to_char(new.baslangic, ''DD.MM.YYYY'') || ''–'' || to_char(new.bitis, ''DD.MM.YYYY'') || '' · '' || new.yillik_ucret || '' '' || new.para_birimi || '' · '' || new.durum,
        auth.uid());
    elsif tg_table_name = ''platform_odemeler'' then
      insert into public.platform_olaylar (firma_id, tur, aciklama, kim) values (new.firma_id,
        case when new.duzeltilen_odeme is null then ''ödeme'' else ''ödeme düzeltmesi'' end,
        to_char(new.tarih, ''DD.MM.YYYY'') || '' · '' || new.tutar || '' '' || new.para_birimi || coalesce('' · '' || nullif(new.yontem, ''''), ''''),
        auth.uid());
    end if;
    return null;
  end ';
  create trigger platform_firma_olay after insert or update on public.platform_firmalar for each row execute function public.platform_olay_yaz();
  create trigger platform_sozlesme_olay after insert or update on public.platform_sozlesmeler for each row execute function public.platform_olay_yaz();
  create trigger platform_odeme_olay after insert on public.platform_odemeler for each row execute function public.platform_olay_yaz();

  -- tetikleyici fonksiyonları doğrudan çağrılamasın
  revoke all on function public.platform_odeme_denetle(), public.platform_sozlesme_denetle(), public.platform_guncelleme_damgasi(), public.platform_olay_yaz()
    from public, anon, authenticated;

  -- ── yetkiler ve RLS (Supabase varsayılanı tabloları anon / authenticated'a açık doğurur: önce hepsi alınır) ───────────
  revoke all on public.platform_firmalar, public.platform_sozlesmeler, public.platform_odemeler, public.platform_olaylar
    from public, anon, authenticated;
  grant select, insert, update on public.platform_firmalar, public.platform_sozlesmeler to authenticated;
  grant select, insert on public.platform_odemeler to authenticated;
  grant select on public.platform_olaylar to authenticated;

  alter table public.platform_firmalar enable row level security;
  alter table public.platform_sozlesmeler enable row level security;
  alter table public.platform_odemeler enable row level security;
  alter table public.platform_olaylar enable row level security;

  create policy platform_firmalar_oku on public.platform_firmalar for select to authenticated using (public.platform_yonetici_mi());
  create policy platform_firmalar_ekle on public.platform_firmalar for insert to authenticated with check (public.platform_yonetici_mi());
  create policy platform_firmalar_degistir on public.platform_firmalar for update to authenticated
    using (public.platform_yonetici_mi()) with check (public.platform_yonetici_mi());
  create policy platform_sozlesmeler_oku on public.platform_sozlesmeler for select to authenticated using (public.platform_yonetici_mi());
  create policy platform_sozlesmeler_ekle on public.platform_sozlesmeler for insert to authenticated with check (public.platform_yonetici_mi());
  create policy platform_sozlesmeler_degistir on public.platform_sozlesmeler for update to authenticated
    using (public.platform_yonetici_mi()) with check (public.platform_yonetici_mi());
  create policy platform_odemeler_oku on public.platform_odemeler for select to authenticated using (public.platform_yonetici_mi());
  create policy platform_odemeler_ekle on public.platform_odemeler for insert to authenticated with check (public.platform_yonetici_mi());
  create policy platform_olaylar_oku on public.platform_olaylar for select to authenticated using (public.platform_yonetici_mi());
end $$;

-- SONUÇ (yalnız okur): her satır "tamam" olmalı.
select k.sira, k.kontrol, k.beklenen, k.sonuc, case when k.sonuc = k.beklenen then 'tamam' else 'FARKLI' end as durum
from (values
  (1, 'tablolar (yoneticiler, firmalar, sozlesmeler, odemeler, olaylar)', '5',
      (select count(*)::text from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname in
        ('platform_yoneticileri', 'platform_firmalar', 'platform_sozlesmeler', 'platform_odemeler', 'platform_olaylar'))),
  (2, 'RLS açık tablo sayısı', '5',
      (select count(*)::text from pg_class where relnamespace = 'public'::regnamespace and relname like 'platform\_%' and relkind = 'r' and relrowsecurity)),
  (3, 'politika sayısı', '9',
      (select count(*)::text from pg_policies where schemaname = 'public' and tablename like 'platform\_%')),
  (4, 'anon herhangi bir platform_ tablosunu okuyabilir mi', 'hayır',
      case when exists (select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname like 'platform\_%' and c.relkind = 'r'
                          and has_table_privilege('anon', c.oid, 'select')) then 'evet' else 'hayır' end),
  (5, 'authenticated platform_yoneticileri okuyabilir / yazabilir mi', 'hayır / hayır',
      (case when has_table_privilege('authenticated', 'public.platform_yoneticileri', 'select') then 'evet' else 'hayır' end) || ' / ' ||
      (case when has_table_privilege('authenticated', 'public.platform_yoneticileri', 'insert') then 'evet' else 'hayır' end)),
  (6, 'herhangi bir rolde DELETE yetkisi (anon / authenticated)', 'yok',
      case when exists (select 1 from pg_class c cross join (values ('anon'), ('authenticated')) r(rol)
                          where c.relnamespace = 'public'::regnamespace and c.relname like 'platform\_%' and c.relkind = 'r'
                            and has_table_privilege(r.rol, c.oid, 'delete')) then 'var' else 'yok' end),
  (7, 'platform_yonetici_mi: authenticated çalıştırır / anon çalıştıramaz', 'evet / hayır',
      (case when has_function_privilege('authenticated', 'public.platform_yonetici_mi()', 'execute') then 'evet' else 'hayır' end) || ' / ' ||
      (case when has_function_privilege('anon', 'public.platform_yonetici_mi()', 'execute') then 'evet' else 'hayır' end)),
  (8, 'olay tetikleyicileri', '3',
      (select count(*)::text from pg_trigger where tgname in ('platform_firma_olay', 'platform_sozlesme_olay', 'platform_odeme_olay') and not tgisinternal))
) as k(sira, kontrol, beklenen, sonuc)
order by k.sira;
