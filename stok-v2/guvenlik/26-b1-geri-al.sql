-- =====================================================================================================================
--  26-b1-geri-al.sql — ÜRETİLDİ (stok-v2/guvenlik/26-b1-uret.py; ELLE DÜZENLENMEZ). Kaynak: 26-b1-renk-ad-degistir.sql
--  B1 GERİ ALMA (AYRI ONAYLA). Tetikleyiciler + 5 fonksiyon kalkar; tanim_ad_gecmisi tablosu ve satırları KALIR.
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
--  Etki: ad değişikliği yine ESKİ yolla (istemci belleğinden) yapılabilir hâle gelmez — 1.744.38+ istemci reddeder. Bayat cihaz koruması
--  (eski adla gelen yeni kayıt) KALKAR. Geri almadan sonra 26-b1-onkosul: GENEL "KURULU DEĞİL", 1 / 2 / 4 / 5 / 6 "yok / 0 etkin".
do $$
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'B1 geri alma postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  drop trigger if exists tanim_ad_gecmisi_koru on public.tanimlar;
  drop trigger if exists tanim_ad_guncelle on public.siparis_kalemleri;
  drop trigger if exists tanim_ad_guncelle on public.uretim;
  drop trigger if exists tanim_ad_guncelle on public.stok_rezervasyonlari;
  if to_regclass('public.lst_kayit') is not null then
    execute 'drop trigger if exists tanim_ad_guncelle on public.lst_kayit';
  end if;
  if exists (select 1 from pg_class where oid = to_regclass('public.koliler') and relkind = 'r') then
    execute 'drop trigger if exists tanim_ad_guncelle on public.koliler';
  end if;
  drop function if exists public.tanim_renk_ad_degistir(jsonb);
  drop function if exists public.tanim_eski_ad_serbest(jsonb);
  drop function if exists public.tanim_ad_gecmisi_koru();
  drop function if exists public.tanim_ad_guncelle_tetik();
  drop function if exists public.tanim_ad_guncel(text);
  if exists (select 1 from pg_trigger where tgname in ('tanim_ad_guncelle', 'tanim_ad_gecmisi_koru'))
     or exists (select 1 from pg_proc where proname in ('tanim_renk_ad_degistir', 'tanim_eski_ad_serbest', 'tanim_ad_gecmisi_koru', 'tanim_ad_guncelle_tetik', 'tanim_ad_guncel')
                and pronamespace = 'public'::regnamespace) then
    raise exception 'B1 geri alma doğrulaması tutmadı — HİÇBİR şey değişmedi';
  end if;
end $$;
with k(no, kontrol, beklenen, bulunan) as (
  select 1, 'tanim_renk_ad_degistir(jsonb) fonksiyonu', 'var, güvenlik tanımlı, authenticated çalıştırır',
         coalesce((select 'var, definer=' || p.prosecdef::text || ', authenticated=' || has_function_privilege('authenticated', p.oid, 'execute')::text
                     || ', anon=' || has_function_privilege('anon', p.oid, 'execute')::text
                     from pg_proc p where p.oid = to_regprocedure('public.tanim_renk_ad_degistir(jsonb)')), 'yok')
  union all
  select 2, 'tanim_ad_guncel(text) — belirsizlik kuralı (KR025 / KR027)', 'gövdede KR025 ve KR027',
         coalesce((select case when pg_get_functiondef(p.oid) like '%KR025%' and pg_get_functiondef(p.oid) like '%KR027%' then 'var' else 'eski sürüm' end
                     from pg_proc p where p.oid = to_regprocedure('public.tanim_ad_guncel(text)')), 'yok')
  union all
  select 3, 'tanim_ad_gecmisi tablosu (serbest sütunu ile)', 'var',
         case when to_regclass('public.tanim_ad_gecmisi') is null then 'yok'
              when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tanim_ad_gecmisi' and column_name = 'serbest') then 'var'
              else 'serbest sütunu yok' end
  union all
  select 4, 'bayat yazma tetikleyicisi (siparis_kalemleri, uretim, stok_rezervasyonlari, lst_kayit)', '4 etkin',
         (select count(*)::text || ' etkin' from pg_trigger g join pg_class c on c.oid = g.tgrelid
           where g.tgname = 'tanim_ad_guncelle' and g.tgenabled = 'O' and c.relname in ('siparis_kalemleri', 'uretim', 'stok_rezervasyonlari', 'lst_kayit'))
  union all
  select 5, 'eski ad koruması (tanimlar, KR026)', '1 etkin',
         (select count(*)::text || ' etkin' from pg_trigger g where g.tgrelid = 'public.tanimlar'::regclass and g.tgname = 'tanim_ad_gecmisi_koru' and g.tgenabled = 'O')
  union all
  select 6, 'tanim_eski_ad_serbest(jsonb) fonksiyonu', 'var', case when to_regprocedure('public.tanim_eski_ad_serbest(jsonb)') is null then 'yok' else 'var' end
)
select no, kontrol, beklenen, bulunan,
       case when (no = 1 and bulunan like 'var, definer=true, authenticated=true, anon=false') or (no in (2, 3, 6) and bulunan = 'var')
                 or (no = 4 and bulunan = '4 etkin') or (no = 5 and bulunan = '1 etkin') then 'tamam' else 'EKSİK' end as durum
  from k
union all
select 99, 'GENEL', 'KURULU', '', case when (select count(*) from k) = 6 and not exists (
  select 1 from k where not ((no = 1 and bulunan like 'var, definer=true, authenticated=true, anon=false') or (no in (2, 3, 6) and bulunan = 'var')
                            or (no = 4 and bulunan = '4 etkin') or (no = 5 and bulunan = '1 etkin'))) then 'KURULU' else 'KURULU DEĞİL' end
order by 1;
