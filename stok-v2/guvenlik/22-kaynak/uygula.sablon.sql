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
--  cariler'de değişiklik sayacı (degisiklik_izle) var, NORMAL yazmada çalışıyor (tgenabled O ya da A; R = yalnız replika, D = kapalı
--  geçmez), public.degisiklik_bump()'a bağlı ve eklemede tetikleniyor; onayla / reddet gövdeleri 19'daki hâlle aynı (md5); cariler'de id /
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
    select x as n from unnest(array[@@YENI_IMZALAR@@]) x where to_regprocedure(x) is not null
    union all select 'tetikleyici site_cari_ekleme_koru' where exists (select 1 from pg_trigger where tgname = 'site_cari_ekleme_koru' and not tgisinternal)
    union all select 'sütun site_kayit_talepleri.islenme'
     where exists (select 1 from pg_attribute where attrelid = 'public.site_kayit_talepleri'::regclass and attname = 'islenme' and not attisdropped)) z;
  if v22_eksik is not null then
    raise exception '22''nin oluşturacağı nesneler zaten var (%): sessizce değiştirilmez. Kaynağını inceleyin (site-portal.sql ile kurulmuş olabilir). Hiçbir şey değişmedi.', v22_eksik;
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.cariler'::regclass and tgname = 'degisiklik_izle' and not tgisinternal and tgenabled in ('O', 'A') and tgfoid = to_regprocedure('public.degisiklik_bump()') and tgtype & 4 = 4) then
    raise exception 'cariler değişiklik sayacı (degisiklik_izle) yok ya da normal yazmada çalışmıyor (devre dışı / yalnız replika / degisiklik_bump dışında fonksiyon / eklemede çalışmaz): sunucunun açtığı cari diğer cihazlara ulaşmaz. Önce degisiklik-sayaci.sql. Hiçbir şey değişmedi.';
  end if;
  select md5(btrim(regexp_replace(regexp_replace(prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) into v22_onayla
    from pg_proc where oid = to_regprocedure('public.site_kayit_onayla(text, text)');
  select md5(btrim(regexp_replace(regexp_replace(prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) into v22_reddet
    from pg_proc where oid = to_regprocedure('public.site_kayit_reddet(text)');
  if v22_onayla is distinct from '@@MD5_ONAYLA_19@@' or v22_reddet is distinct from '@@MD5_REDDET_19@@' then
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

--@@TANIMLAR@@

  insert into guvenlik.site_onay_22_yedek (tur, nesne)
  select 'olusturdu', x from unnest(array[@@YENI_IMZALAR@@, 'tetikleyici:public.cariler.site_cari_ekleme_koru', 'sutun:public.site_kayit_talepleri.islenme']) x;
  insert into guvenlik.site_onay_22_yedek (tur, nesne, tanim)
  select 'sonra', 'tetikleyici:public.cariler.site_cari_ekleme_koru', pg_get_triggerdef(t.oid) || ' | ' || t.tgenabled::text
    from pg_trigger t where t.tgrelid = 'public.cariler'::regclass and t.tgname = 'site_cari_ekleme_koru';
  insert into guvenlik.site_onay_22_yedek (tur, nesne, tanim)
  select 'sonra', x.ad, (select coalesce(p.proacl::text, '') || ' | ' || p.prosecdef || ' | ' || coalesce(array_to_string(p.proconfig, ','), '')
                                 || ' | ' || pg_get_userbyid(p.proowner) from pg_proc p where p.oid = to_regprocedure(x.ad))
    from (values @@MD5_22_SATIRLARI@@) x(sira, ad, beklenen);

  create table if not exists guvenlik.site_onay_22_sonuc (sira int, kontrol text, beklenen text, sonuc text, durum text);
  revoke all on guvenlik.site_onay_22_sonuc from public, anon, authenticated;
  delete from guvenlik.site_onay_22_sonuc;
  insert into guvenlik.site_onay_22_sonuc
  select row_number() over (order by f.sira), f.ad, f.beklenen, coalesce(f.canli, 'yok'),
         case when f.canli = f.beklenen then 'tamam' else 'FARKLI' end
    from (select x.sira, x.ad, x.beklenen,
                 (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g')))
                    from pg_proc p where p.oid = to_regprocedure(x.ad)) as canli
            from (values @@MD5_22_SATIRLARI@@) x(sira, ad, beklenen)) f;
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
