-- =====================================================================================================================
--  29-b3a2-geri-al.sql — ÜRETİLDİ (stok-v2/guvenlik/29-b3a2-uret.py; ELLE DÜZENLENMEZ). Kaynak ve açıklama: 29-b3a2-kaynak/kaynak.sql
--  B3a-2 GERİ ALMA (AYRI ONAYLA): üç tetikleyici ve on fonksiyon kalkar. Alan bazlı koruma kalkar; B3a ve B4 paketleri etkilenmez.
--  SQL Editor: dosyanın TAMAMI, bir kez Run. İlk ifade ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
do $$
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'B3a-2 postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  drop trigger if exists b3a2_alan_koru on public.cariler;
  drop trigger if exists b3a2_alan_koru on public.urunler;
  drop trigger if exists b3a2_alan_koru on public.tanimlar;
  drop function if exists public.b3a2_cariler();
  drop function if exists public.b3a2_urunler();
  drop function if exists public.b3a2_tanimlar();
  drop function if exists public.b3a2_kurallar(jsonb, boolean);
  drop function if exists public.b3a2_red(text, text);
  drop function if exists public.b3a2_liste_fark(jsonb, jsonb);
  drop function if exists public.b3a2_serbest();
  drop function if exists public.b3a2_bos(jsonb);
  drop function if exists public.b3a2_yazar();
  drop function if exists public.b3a2_y(text, text);
  if exists (select 1 from pg_trigger where tgname = 'b3a2_alan_koru') or exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\_%') then
    raise exception 'B3a-2 geri alma doğrulaması tutmadı — HİÇBİR şey değişmedi';
  end if;
end $$;
select 'b3a2 fonksiyonları (10 olmalı)' as kontrol, (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\_%')::text as durum
union all
select 'b3a2_alan_koru tetikleyicisi (cariler, tanimlar, urunler — etkin)', coalesce((select string_agg(c.relname, ', ' order by c.relname) from pg_trigger g join pg_class c on c.oid = g.tgrelid
   where g.tgname = 'b3a2_alan_koru' and g.tgenabled = 'O'), 'yok')
union all
select 'GENEL', case when (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\_%') = 10
   and (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru' and tgenabled = 'O') = 3 then 'KURULU'
   when not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\_%') and not exists (select 1 from pg_trigger where tgname = 'b3a2_alan_koru') then 'KURULU DEĞİL'
   else 'YARIM — DUR' end;
