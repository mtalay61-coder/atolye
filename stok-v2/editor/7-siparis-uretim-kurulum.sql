alter table public.stk_ayar add column if not exists alt_aktif boolean not null default false;
alter table public.stk_ayar add column if not exists alt_gecis timestamptz;
alter table public.stk_ayar add column if not exists alt_geri_donus timestamptz;

create or replace function public.alt_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t text;
  d jsonb;
  satirlar jsonb;
  sutunlar text;
  atamalar text;
  silinecek text[];
  n_yaz int;
  n_sil int;
  sonuc jsonb := '{}'::jsonb;
  v_satir jsonb;
  n_parca int;
begin
  for t, d in select key, value from jsonb_each(case when jsonb_typeof(p) = 'object' then p else '{}'::jsonb end) loop
    if t not in ('siparis_kalemleri', 'uretim_atamalari') then
      raise exception 'Bu tablo alt_yaz ile yazılamaz: %', t using errcode = '42501';
    end if;
    perform public.stk_yetki(array[case t when 'siparis_kalemleri' then 'siparis' else 'uretim' end, 'fisler', 'stok', 'cari'], 'kaydetme');
    satirlar := public.stk_dizi(d -> 'satirlar');
    n_yaz := 0;
    n_sil := 0;
    if jsonb_array_length(satirlar) > 0 then
      if exists (select 1 from jsonb_array_elements(satirlar) x where coalesce(x ->> 'id', '') = '') then
        raise exception '% satırında kimlik yok', t using errcode = '22023';
      end if;
      if exists(select 1 from jsonb_array_elements(satirlar) r, jsonb_object_keys(r) anahtar
        where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=t and c.column_name=anahtar)) then
        raise exception 'Alt kayıtta tanınmayan alan var (%) — kayıt değiştirilmedi',t using errcode='KR010';
      end if;
      execute format('select 1 from public.%I where id::text in (select x->>''id'' from jsonb_array_elements(%L::jsonb) x) order by id for update',t,satirlar::text);
      for v_satir in select y from (select distinct on (y->>'id') y,n from jsonb_array_elements(satirlar) with ordinality as e(y,n) order by y->>'id',n desc) a order by y->>'id' loop
        select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position),
               string_agg(case when c.column_name <> 'id' then quote_ident(c.column_name) || ' = excluded.' || quote_ident(c.column_name) end, ', ')
          into sutunlar, atamalar
        from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = t
          and c.column_name in (select jsonb_object_keys(v_satir));
        execute format(
          'insert into public.%I as h (%s) select %s from jsonb_populate_record(null::public.%I,%L::jsonb) r '
          || 'on conflict (id) do ' || case when atamalar is null then 'nothing' else 'update set ' || atamalar end,
          t,sutunlar,sutunlar,t,v_satir::text);
        get diagnostics n_parca = row_count;
        n_yaz:=n_yaz+n_parca;
      end loop;
    end if;
    silinecek := array(select jsonb_array_elements_text(public.stk_dizi(d -> 'sil')));
    if array_length(silinecek, 1) > 0 then
      execute format('delete from public.%I where id::text = any(%L::text[])', t, silinecek);
      get diagnostics n_sil = row_count;
    end if;
    sonuc := sonuc || jsonb_build_object(t, jsonb_build_object('yazilan', n_yaz, 'silinen', n_sil));
  end loop;
  return sonuc;
end $$;

create or replace function public.fis_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  c jsonb;
  a jsonb;
  k jsonb;
  bilinmeyen text;
begin
  select string_agg(x, ', ') into bilinmeyen from jsonb_object_keys(coalesce(p, '{}'::jsonb)) x where x not in ('stok', 'cari', 'alt', 'kasa');
  if bilinmeyen is not null then
    raise exception 'fis_yaz: tanınmayan parça (%)', bilinmeyen using errcode = '22023';
  end if;
  if jsonb_typeof(p -> 'stok') = 'object' then s := public.stk_yaz(p -> 'stok'); end if;
  if jsonb_typeof(p -> 'cari') = 'object' then c := public.car_yaz(p -> 'cari'); end if;
  if jsonb_typeof(p -> 'alt') = 'object' then a := public.alt_yaz(p -> 'alt'); end if;
  if jsonb_typeof(p -> 'kasa') = 'object' then k := public.kas_yaz(p -> 'kasa'); end if;
  return jsonb_build_object('stok', s, 'cari', c, 'alt', a, 'kasa', k);
end $$;

create or replace function public.alt_gecis() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is not null then
    raise exception 'Geçiş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  revoke insert, update, delete, truncate on public.siparis_kalemleri, public.uretim_atamalari from anon, authenticated;
  update public.stk_ayar set alt_aktif = true, alt_gecis = now() where id = 'tekil';
  return jsonb_build_object('gecis', 'tamam',
    'siparisKalemi', (select count(*) from public.siparis_kalemleri),
    'uretimAtamasi', (select count(*) from public.uretim_atamalari));
end $$;

create or replace function public.alt_geri_don() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is not null then
    raise exception 'Geri dönüş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  grant insert, update, delete on public.siparis_kalemleri, public.uretim_atamalari to authenticated;
  update public.stk_ayar set alt_aktif = false, alt_geri_donus = now() where id = 'tekil';
  return jsonb_build_object('geriDonus', 'tamam');
end $$;

revoke all on function public.alt_yaz(jsonb) from public, anon;
grant execute on function public.alt_yaz(jsonb) to authenticated;
revoke all on function public.fis_yaz(jsonb) from public, anon;
grant execute on function public.fis_yaz(jsonb) to authenticated;
revoke all on function public.alt_gecis() from public, anon, authenticated;
revoke all on function public.alt_geri_don() from public, anon, authenticated;
