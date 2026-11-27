-- 26 — B1 / B2 DENEME PROJESİ DURUMU VE UYUMU — SALT OKUR (28 Kasım). Hiçbir şey yazmaz. Deneme projesinde (drtmnovafswzcmpacubl)
-- kurulumdan ÖNCE çalıştırılır. NEDEN: deneme projesi ana projenin kopyası DEĞİL — G-25 ekleri (eski paket + 25b, belki 25c / 25d) ve
-- kendi verisi var (kullanıcı, 28 Kasım: "ana projenin kopyası olduğunu varsayma"). B1'in dayandığı her nesne, B1 ile aynı adlı önceden
-- kalmış nesne, G-25'in B1'in dokunduğu tablolardaki tetikleyicileri ve B2'nin sunucu koşulu (tanimlar.surum + sürüm tetikleyicisi) burada
-- tek tek okunur. Her satır: no · kontrol · bulunan · durum. Son satır GENEL: "UYUMLU" değilse kurulum YAPILMAZ.
with k(no, kontrol, bulunan, iyi) as (
  select 1, 'proje kimliği (adres çubuğunda drtmnovafswzcmpacubl olmalı) — veritabanı adı / sürüm', current_database() || ' · ' || split_part(version(), ' ', 2), true
  union all
  select 2, 'B1 tabloları (tanimlar, siparis_kalemleri, siparisler, uretim, stok_rezervasyonlari, urunler)',
         (select string_agg(t || '=' || case when to_regclass('public.' || t) is null then 'YOK' else 'var' end, ' ' order by t)
            from unnest(array['tanimlar', 'siparis_kalemleri', 'siparisler', 'uretim', 'stok_rezervasyonlari', 'urunler']) t),
         (select bool_and(to_regclass('public.' || t) is not null) from unnest(array['tanimlar', 'siparis_kalemleri', 'siparisler', 'uretim', 'stok_rezervasyonlari', 'urunler']) t)
  union all
  select 3, 'renk sütunları (siparis_kalemleri / uretim / stok_rezervasyonlari .renk; urunler .recete / .renk_resimleri / .harici_barkodlar)',
         (select count(*)::text || ' / 6' from information_schema.columns where table_schema = 'public'
             and (table_name, column_name) in (('siparis_kalemleri', 'renk'), ('uretim', 'renk'), ('stok_rezervasyonlari', 'renk'), ('urunler', 'recete'), ('urunler', 'renk_resimleri'), ('urunler', 'harici_barkodlar'))),
         (select count(*) = 6 from information_schema.columns where table_schema = 'public'
             and (table_name, column_name) in (('siparis_kalemleri', 'renk'), ('uretim', 'renk'), ('stok_rezervasyonlari', 'renk'), ('urunler', 'recete'), ('urunler', 'renk_resimleri'), ('urunler', 'harici_barkodlar')))
  union all
  select 4, 'sürüm sütunları (uretim / stok_rezervasyonlari / siparisler / urunler .surum)',
         (select count(*)::text || ' / 4' from information_schema.columns where table_schema = 'public' and column_name = 'surum'
             and table_name in ('uretim', 'stok_rezervasyonlari', 'siparisler', 'urunler')),
         (select count(*) = 4 from information_schema.columns where table_schema = 'public' and column_name = 'surum' and table_name in ('uretim', 'stok_rezervasyonlari', 'siparisler', 'urunler'))
  union all
  select 5, 'koliler: liste v2 (lst_kayit) mi, tablo mu',
         'lst_kayit=' || case when to_regclass('public.lst_kayit') is null then 'yok' else 'var' end || ' · koliler='
           || coalesce((select case c.relkind when 'r' then 'tablo' when 'v' then 'görünüm' else c.relkind::text end from pg_class c where c.oid = to_regclass('public.koliler')), 'yok'),
         to_regclass('public.lst_kayit') is not null or to_regclass('public.koliler') is not null
  union all
  select 6, 'yardımcı fonksiyonlar (stk_nrm, yetki_var_mi, yonetici_mi)',
         (select string_agg(f || '=' || case when to_regprocedure(f) is null then 'YOK' else 'var' end, ' ')
            from unnest(array['public.stk_nrm(text)', 'public.yetki_var_mi(text[],text)', 'public.yonetici_mi()']) f),
         (select bool_and(to_regprocedure(f) is not null) from unnest(array['public.stk_nrm(text)', 'public.yetki_var_mi(text[],text)', 'public.yonetici_mi()']) f)
  union all
  select 7, 'B1 ile aynı adlı ÖNCEDEN kalmış nesne (0 olmalı: tanim_* fonksiyon / tablo / tetikleyici)',
         (select count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname in ('tanim_renk_ad_degistir', 'tanim_eski_ad_serbest', 'tanim_ad_gecmisi_koru', 'tanim_ad_guncelle_tetik', 'tanim_ad_guncel'))
           || ' fonksiyon · ' || case when to_regclass('public.tanim_ad_gecmisi') is null then '0' else '1' end || ' tablo · '
           || (select count(*)::text from pg_trigger where tgname in ('tanim_ad_guncelle', 'tanim_ad_gecmisi_koru')) || ' tetikleyici',
         (select count(*) = 0 from pg_proc where pronamespace = 'public'::regnamespace and proname in ('tanim_renk_ad_degistir', 'tanim_eski_ad_serbest', 'tanim_ad_gecmisi_koru', 'tanim_ad_guncelle_tetik', 'tanim_ad_guncel'))
           and to_regclass('public.tanim_ad_gecmisi') is null and not exists (select 1 from pg_trigger where tgname in ('tanim_ad_guncelle', 'tanim_ad_gecmisi_koru'))
  union all
  select 8, 'G-25 var mı · 25b mühür var mı (aşamanın kesin adı: G-25''in deneme-paket-durumu-salt-okur.sql 5. satırı)',
         case when to_regclass('guvenlik.g25_yedek') is null then 'G-25 YOK' else 'G-25 var' end
           || ' · 25b=' || case when to_regprocedure('public.g25_onay_degisim()') is null then 'yok' else 'var' end,
         true
  union all
  select 9, 'B1''in yazdığı tablolardaki BAŞKA tetikleyiciler (tanimlar, siparis_kalemleri, uretim, stok_rezervasyonlari, urunler, lst_kayit) — G-25 dahil',
         (select string_agg(c.relname || '.' || g.tgname || '(' || g.tgenabled::text || ')', ' ' order by c.relname, g.tgname)
            from pg_trigger g join pg_class c on c.oid = g.tgrelid
           where not g.tgisinternal and c.relnamespace = 'public'::regnamespace
             and c.relname in ('tanimlar', 'siparis_kalemleri', 'uretim', 'stok_rezervasyonlari', 'urunler', 'lst_kayit')),
         true
  union all
  select 10, 'B2: tanimlar.surum sütunu + BEFORE UPDATE sürüm tetikleyicisi (surum_arttir)',
         coalesce((select data_type || coalesce(' default ' || column_default, '') from information_schema.columns where table_schema = 'public' and table_name = 'tanimlar' and column_name = 'surum'), 'surum YOK')
           || ' · tetikleyici=' || coalesce((select string_agg(g.tgname, ',') from pg_trigger g join pg_proc p on p.oid = g.tgfoid
                                              where g.tgrelid = 'public.tanimlar'::regclass and p.proname = 'surum_arttir' and g.tgenabled = 'O'), 'YOK'),
         exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tanimlar' and column_name = 'surum')
           and exists (select 1 from pg_trigger g join pg_proc p on p.oid = g.tgfoid where g.tgrelid = 'public.tanimlar'::regclass and p.proname = 'surum_arttir' and g.tgenabled = 'O')
  union all
  select 11, 'tanimlar satırı (tek ''tekil'' satır) · renk sayısı (Tanımlar) · etkin renk (stk_renk aynası — B1 bunu okur)',
         (select count(*)::text from public.tanimlar) || ' satır · '
           || coalesce((select jsonb_array_length(veri -> 'renkler')::text from public.tanimlar where id = 'tekil'), '?') || ' renk · '
           || case when to_regclass('public.stk_renk') is null then 'stk_renk YOK' else (select count(*)::text from public.stk_renk where aktif) || ' etkin' end,
         (select count(*) = 1 from public.tanimlar where id = 'tekil') and to_regclass('public.stk_renk') is not null
  union all
  select 12, 'aynı adı taşıyan iki ETKİN renk (stk_renk; B1 bunları belirsiz sayar — KR025; 0 beklenir)',
         case when to_regclass('public.stk_renk') is null then '?' else
           (select count(*)::text from (select public.stk_nrm(ad) from public.stk_renk where aktif group by 1 having count(*) > 1) x) end,
         to_regclass('public.stk_renk') is not null and not exists (select 1 from public.stk_renk where aktif group by public.stk_nrm(ad) having count(*) > 1)
  union all
  select 13, 'bilgi: kayıt sayıları (kalem · üretim · rezervasyon · ürün · koli)',
         (select count(*)::text from public.siparis_kalemleri) || ' · ' || (select count(*)::text from public.uretim) || ' · '
           || (select count(*)::text from public.stok_rezervasyonlari) || ' · ' || (select count(*)::text from public.urunler) || ' · '
           || case when to_regclass('public.lst_kayit') is not null
                   then (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.lst_kayit where tablo = ''koliler''', false, true, '')))[1]::text else '-' end,
         true
  union all
  select 14, 'kullanıcılar: Yönetici sayısı · giriş açık mı (girisAktifMi)',
         coalesce((select count(*)::text from public.tanimlar t, jsonb_array_elements(t.veri -> 'kullanicilar') u where t.id = 'tekil' and u ->> 'rol' = 'Yönetici'), '?')
           || ' Yönetici · girisAktifMi=' || coalesce((select veri ->> 'girisAktifMi' from public.tanimlar where id = 'tekil'), '?'),
         true
  union all
  select 15, 'fiş kuralları / sürüm kapısı (stk_ayar)',
         coalesce((select 'fis_aktif=' || coalesce(a.fis_aktif::text, '?') || ' · min_istemci_surum=' || coalesce(nullif(a.min_istemci_surum, ''), 'boş') from public.stk_ayar a limit 1), 'stk_ayar yok'),
         true
)
select no, kontrol, bulunan, case when iyi then 'tamam' else 'UYUMSUZ' end as durum from k
union all
select 99, 'GENEL', '', case when (select bool_and(iyi) from k) then 'UYUMLU' else 'UYUMSUZ — kurulum YAPILMAZ' end
order by 1;
