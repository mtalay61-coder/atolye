-- =====================================================================================================================
--  31-yetki-ileti-geri-al.sql — 27 Kasım 2026. HAZIRLIK; canlıya UYGULANMADI.
--  GERİ ALMA (AYRI ONAYLA): stk_yetki canlıdaki gövdesine bayt bayt döner (satır sonları dahil).
--  KURAL DEĞİŞMEZ: yetki_var_mi çağrısı, modül listeleri, hata kodu (42501) aynı. Yalnız ret İLETİSİ değişir.
--  SQL Editor: dosyanın TAMAMI, bir kez Run. İlk ifade ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
do $$
declare
  v text := (select md5(prosrc) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki');
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception '31 postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if v is null or v not in ('32844b94ccc2421fddcf7851907ab88c', '4de398638778b6b961b9ca410f5c7a4e') then
    raise exception '31 önkoşulu: stk_yetki gövdesi beklenen iki hâlden biri değil (%). Hiçbir şey değişmedi.', coalesce(v, 'yok');
  end if;
  execute 'create or replace function public.stk_yetki(moduller text[], islem text) returns void language plpgsql security definer set search_path to ''public'' as ' || quote_literal(replace('
declare
  ok boolean := true;
begin
  if auth.jwt() is null then return; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = ''public'' and p.proname = ''yetki_var_mi'') then
    ok := public.yetki_var_mi(moduller, islem);
  end if;
  if not coalesce(ok, false) then
    raise exception ''Bu işlem için yetkiniz yok (stok: %)'', islem using errcode = ''42501'';
  end if;
end ', chr(10), chr(13) || chr(10)));
  if (select md5(prosrc) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki') <> '32844b94ccc2421fddcf7851907ab88c' then
    raise exception '31 geri alma doğrulaması tutmadı — HİÇBİR şey değişmedi';
  end if;
end $$;
select 'stk_yetki gövdesi' as kontrol, case md5(prosrc) when '4de398638778b6b961b9ca410f5c7a4e' then 'YENİ İLETİ (31)' when '32844b94ccc2421fddcf7851907ab88c' then 'ESKİ (canlıdaki)' else 'BEKLENMEYEN: ' || md5(prosrc) end as durum
  from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki'
union all
select 'GENEL', case (select md5(prosrc) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki') when '4de398638778b6b961b9ca410f5c7a4e' then 'KURULU' when '32844b94ccc2421fddcf7851907ab88c' then 'KURULU DEĞİL' else 'BEKLENMEYEN — DUR' end;
