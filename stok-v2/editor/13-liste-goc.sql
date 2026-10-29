alter table public.stk_ayar add column if not exists liste_tablolari text[] not null default '{}';

create or replace function public.lst_goc(p_zorla boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t text;
  belge jsonb;
  x jsonb;
  j int;
  xid text;
  m int;
  rapor jsonb := '{}'::jsonb;
  r jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Göç yalnız Supabase SQL Editor''den çalıştırılır' using errcode = '42501';
  end if;
  if exists (select 1 from public.stk_ayar where liste_aktif) then
    raise exception 'Liste v2 etkin (geçiş yapıldı) — göç yeniden çalıştırılamaz; geri dönmek için lst_geri_don()' using errcode = '55000';
  end if;
  if not p_zorla and exists (select 1 from public.lst_kayit where not goc) then
    raise exception 'lst_kayit tablosunda uygulamadan yazılmış kayıt var — göç yeniden çalıştırılırsa silinirdi (bilerek: p_zorla => true)'
      using errcode = '55000';
  end if;
  foreach t in array array['teklifler', 'faturalar', 'koliler', 'gorevler', 'modeller', 'fis_defteri', 'mesajlar'] loop
    if to_regclass('public.' || t) is null then
      rapor := rapor || jsonb_build_object(t, jsonb_build_object('atlandi', 'tablo yok'));
      continue;
    end if;
    execute format('select veri from public.%I where id = %L', t, 'tekil') into belge;
    delete from public.lst_kayit where tablo = t;
    r := jsonb_build_object('eski', 0, 'tasinan', 0, 'kimliksiz', 0, 'yinelenen', '[]'::jsonb, 'nesneDegil', 0);
    if jsonb_typeof(belge) <> 'array' then
      rapor := rapor || jsonb_build_object(t, r || jsonb_build_object('belge', coalesce(jsonb_typeof(belge), 'yok')));
      continue;
    end if;
    r := r || jsonb_build_object('eski', jsonb_array_length(belge));
    for x, j in select e.v, e.n from jsonb_array_elements(belge) with ordinality as e(v, n) loop
      if jsonb_typeof(x) <> 'object' then
        r := r || jsonb_build_object('nesneDegil', (r ->> 'nesneDegil')::int + 1);
        continue;
      end if;
      xid := nullif(x ->> 'id', '');
      if xid is null then
        xid := 'lx-' || substr(md5(t || ':' || j::text || ':' || x::text), 1, 16);
        x := x || jsonb_build_object('id', xid);
        r := r || jsonb_build_object('kimliksiz', (r ->> 'kimliksiz')::int + 1);
      end if;
      insert into public.lst_kayit (tablo, id, sira, veri, goc) values (t, xid, j, x, true) on conflict (tablo, id) do nothing;
      get diagnostics m = row_count;
      if m = 0 then r := r || jsonb_build_object('yinelenen', (r -> 'yinelenen') || to_jsonb(xid));
      else r := r || jsonb_build_object('tasinan', (r ->> 'tasinan')::int + 1); end if;
    end loop;
    rapor := rapor || jsonb_build_object(t, r);
  end loop;
  return rapor;
end $$;

create or replace function public.lst_gecis() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  rapor jsonb;
  t text;
  tasinan text[] := '{}';
begin
  if auth.jwt() is not null then
    raise exception 'Geçiş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if exists (select 1 from public.stk_ayar where liste_aktif) then
    raise exception 'Liste v2 zaten etkin' using errcode = '55000';
  end if;
  rapor := public.lst_goc(true);
  foreach t in array array['teklifler', 'faturalar', 'koliler', 'gorevler', 'modeller', 'fis_defteri', 'mesajlar'] loop
    continue when to_regclass('public.' || t) is null;
    if to_regclass('public.eski_' || t) is not null then
      raise exception 'eski_% zaten var — önceki geçiş yarım kalmış olabilir, elle bakın', t using errcode = '55000';
    end if;
    execute format('alter table public.%I rename to %I', t, 'eski_' || t);
    execute format('create view public.%I with (security_invoker = true) as select %L::text as id, public.lst_belge(%L) as veri',
                   t, 'tekil', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant select on public.%I to service_role', t);
    end if;
    tasinan := tasinan || t;
  end loop;
  update public.stk_ayar set liste_aktif = true, liste_gecis = now(), liste_tablolari = tasinan where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('gecis', 'tamam', 'listeler', to_jsonb(tasinan), 'goc', rapor);
end $$;

create or replace function public.lst_geri_don() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t text;
  belge jsonb;
  donen jsonb := '{}'::jsonb;
  n int;
begin
  if auth.jwt() is not null then
    raise exception 'Geri dönüş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if not exists (select 1 from public.stk_ayar where liste_aktif) then
    raise exception 'Liste v2 etkin değil — geri dönülecek bir şey yok' using errcode = '55000';
  end if;
  foreach t in array array['teklifler', 'faturalar', 'koliler', 'gorevler', 'modeller', 'fis_defteri', 'mesajlar'] loop
    continue when to_regclass('public.eski_' || t) is null;
    belge := public.lst_belge(t);
    execute format('drop view if exists public.%I', t);
    execute format('alter table public.%I rename to %I', 'eski_' || t, t);
    execute format('update public.%I set veri = %L::jsonb where id = %L', t, belge, 'tekil');
    get diagnostics n = row_count;
    if n = 0 then
      execute format('insert into public.%I (id, veri) values (%L, %L::jsonb)', t, 'tekil', belge);
    end if;
    donen := donen || jsonb_build_object(t, jsonb_array_length(belge));
  end loop;
  update public.stk_ayar set liste_aktif = false, liste_geri_donus = now(), liste_tablolari = '{}' where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('geriDonus', 'tamam', 'listeler', donen);
end $$;

revoke all on function public.lst_goc(boolean) from public, anon, authenticated;
revoke all on function public.lst_gecis() from public, anon, authenticated;
revoke all on function public.lst_geri_don() from public, anon, authenticated;
