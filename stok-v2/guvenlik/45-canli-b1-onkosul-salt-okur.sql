-- B1 CANLI ÖNKOŞUL — SALT OKUR (27 Kasım). Hiçbir şey yazmaz. 26-b1-uygula.sql'den ÖNCE ana projede çalıştırılır.
-- Beklenen (ilk kurulumdan önce): 1. satır "kurulu değil", 2–5 "tamam", son satır GENEL "HAZIR".
with
b1 as (select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
     and p.proname in ('tanim_renk_ad_degistir', 'tanim_ad_guncel', 'tanim_ad_guncelle_tetik', 'tanim_ad_gecmisi_koru', 'tanim_eski_ad_serbest'))::int as f,
  (select count(*) from pg_trigger g where not g.tgisinternal and g.tgname in ('tanim_ad_guncelle', 'tanim_ad_gecmisi_koru'))::int as t,
  (to_regclass('public.tanim_ad_gecmisi') is not null) as defter),
eksik_tablo as (select coalesce(string_agg(x, ', '), '') as e from unnest(array['tanimlar', 'siparis_kalemleri', 'siparisler', 'uretim', 'stok_rezervasyonlari', 'urunler']) x
  where to_regclass('public.' || x) is null),
eksik_islev as (select coalesce(string_agg(x, ', '), '') as e from unnest(array['public.stk_nrm(text)', 'public.yetki_var_mi(text[],text)', 'public.yonetici_mi()']) x
  where to_regprocedure(x) is null),
koli as (select (to_regclass('public.lst_kayit') is not null or to_regclass('public.koliler') is not null) as var),
surum as (select
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tanimlar' and column_name = 'surum') as sutun,
  exists (select 1 from pg_trigger g where g.tgrelid = to_regclass('public.tanimlar') and g.tgname = 'tanimlar_surum' and g.tgenabled = 'O') as tetik),
paket as (select
  (select count(*) from pg_trigger g where not g.tgisinternal and g.tgname = 'b3a_yazma_koru' and g.tgenabled = 'O')::int as b3a,
  (select count(*) from pg_trigger g where not g.tgisinternal and g.tgname = 'b3a2_alan_koru' and g.tgenabled = 'O')::int as b3a2,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and left(p.proname, 3) = 'b4_')::int as b4),
renk as (select lower(btrim(r ->> 'ad')) as ad from public.tanimlar t, jsonb_array_elements(coalesce(t.veri -> 'renkler', '[]'::jsonb)) r where t.id = 'tekil'),
k(no, kontrol, beklenen, bulunan, tamam) as (
  select 1, 'B1 şu an kurulu mu (fonksiyon · tetikleyici · eski ad defteri tablosu)', 'kurulu değil: 0 · 0 · yok',
         (select f::text || ' · ' || t::text || ' · ' || case when defter then 'var' else 'yok' end from b1), (select f = 0 and t = 0 from b1)
  union all
  select 2, 'gereken tablolar (tanimlar, siparis_kalemleri, siparisler, uretim, stok_rezervasyonlari, urunler; lst_kayit ya da koliler)', 'hepsi var',
         (select case when e.e = '' and c.var then 'hepsi var' else 'EKSİK: ' || e.e || case when c.var then '' else ' lst_kayit/koliler' end end from eksik_tablo e, koli c),
         (select e.e = '' and c.var from eksik_tablo e, koli c)
  union all
  select 3, 'gereken fonksiyonlar: stk_nrm(text), yetki_var_mi(text[], text), yonetici_mi()', 'hepsi var',
         (select case when e = '' then 'hepsi var' else 'EKSİK: ' || e end from eksik_islev), (select e = '' from eksik_islev)
  union all
  select 4, 'Tanımlar sürümü (1.744.46 koşullu yazma için): surum sütunu · tanimlar_surum tetikleyicisi etkin', 'var · var',
         (select case when sutun then 'var' else 'YOK' end || ' · ' || case when tetik then 'var' else 'YOK' end from surum), (select sutun and tetik from surum)
  union all
  select 5, 'dört paket yerinde (özet; ayrıntı 41 numaralı sorguda): b3a tetikleyici · b3a2 tetikleyici · b4_ fonksiyon', '14 · 3 · en az 1',
         (select b3a::text || ' · ' || b3a2::text || ' · ' || b4::text from paket), (select b3a = 14 and b3a2 = 3 and b4 >= 1 from paket)
  union all
  select 6, 'bilgi: Tanımlar''da renk sayısı · aynı adı taşıyan renk adı sayısı (0 beklenir)', '-',
         (select count(*)::text from renk) || ' · ' || (select count(*)::text from (select ad from renk group by ad having count(*) > 1) x), true
  union all
  select 7, 'bilgi: kullanıcılar Yönetici · Yönetici olmayan; giriş sistemi', '-',
         (select count(*) filter (where u ->> 'rol' = 'Yönetici')::text || ' · ' || count(*) filter (where coalesce(u ->> 'rol', '') <> 'Yönetici')::text
            from public.tanimlar t, jsonb_array_elements(coalesce(t.veri -> 'kullanicilar', '[]'::jsonb)) u where t.id = 'tekil')
         || ' ; giriş ' || coalesce((select (t.veri ->> 'girisAktifMi') from public.tanimlar t where t.id = 'tekil'), 'yok'), true
)
select no, kontrol, beklenen, bulunan, case when no >= 6 then 'bilgi' when tamam then 'tamam' when no = 1 then 'ZATEN KURULU / YARIM' else 'EKSİK' end as durum from k
union all
select 99, 'GENEL', 'HAZIR', '',
       case when (select f = 5 and t >= 5 from b1) then 'B1 ZATEN KURULU (26-b1-onkosul-salt-okur.sql ile doğrula)'
            when not (select tamam from k where no = 1) then 'DUR — B1 nesneleri yarım görünüyor; kurulum yapma, sonucu gönder'
            when (select bool_and(tamam) from k where no between 2 and 5) then 'HAZIR'
            else 'HAZIR DEĞİL — EKSİK satırlarına bak; kurulum yapma' end
order by 1;
