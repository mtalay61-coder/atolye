create table if not exists public.kas_hesap (
  id          text primary key,
  tur         text not null check (tur in ('kasa', 'banka')),
  sira        numeric not null default 0,
  veri        jsonb not null default '{}'::jsonb,
  aktif       boolean not null default true,
  olusturan   text,
  guncelleme  timestamptz not null default now(),
  goc         boolean not null default false
);

create table if not exists public.kas_hareket (
  id            text primary key,
  hesap_id      text not null,
  sira          numeric not null default (extract(epoch from clock_timestamp()) * 1000),
  veri          jsonb not null,
  olusturan     text,
  olusturma     timestamptz not null default now(),
  guncelleme    timestamptz not null default now(),
  goc           boolean not null default false,
  iptal         boolean not null default false,
  iptal_zamani  timestamptz,
  iptal_eden    text
);
create index if not exists kas_hareket_hesap on public.kas_hareket (hesap_id);

create table if not exists public.kas_cek (
  id            text primary key,
  sira          numeric not null default (extract(epoch from clock_timestamp()) * 1000),
  veri          jsonb not null,
  olusturan     text,
  guncelleme    timestamptz not null default now(),
  goc           boolean not null default false,
  iptal         boolean not null default false,
  iptal_zamani  timestamptz,
  iptal_eden    text
);

create table if not exists public.kas_ayar (
  id          text primary key default 'tekil' check (id = 'tekil'),
  veri        jsonb not null default '{}'::jsonb,
  guncelleme  timestamptz not null default now()
);
insert into public.kas_ayar (id) values ('tekil') on conflict (id) do nothing;

alter table public.stk_ayar add column if not exists kasa_aktif boolean not null default false;
alter table public.stk_ayar add column if not exists kasa_gecis timestamptz;
alter table public.stk_ayar add column if not exists kasa_geri_donus timestamptz;

create or replace view public.kas_muhasebe_g with (security_invoker = true) as
select 'tekil'::text as id,
       coalesce((select a.veri from public.kas_ayar a where a.id = 'tekil'), '{}'::jsonb)
       || jsonb_build_object(
            'kasalar', coalesce((select jsonb_agg(h.veri || jsonb_build_object('id', h.id, 'hareketler',
                                   coalesce((select jsonb_agg(x.veri order by x.sira desc, x.id) from public.kas_hareket x
                                             where x.hesap_id = h.id and not x.iptal), '[]'::jsonb)) order by h.sira, h.id)
                                 from public.kas_hesap h where h.tur = 'kasa' and h.aktif), '[]'::jsonb),
            'bankalar', coalesce((select jsonb_agg(h.veri || jsonb_build_object('id', h.id, 'hareketler',
                                   coalesce((select jsonb_agg(x.veri order by x.sira desc, x.id) from public.kas_hareket x
                                             where x.hesap_id = h.id and not x.iptal), '[]'::jsonb)) order by h.sira, h.id)
                                  from public.kas_hesap h where h.tur = 'banka' and h.aktif), '[]'::jsonb),
            'cekler', coalesce((select jsonb_agg(c.veri order by c.sira desc, c.id) from public.kas_cek c where not c.iptal), '[]'::jsonb)
          ) as veri;

create or replace function public.kas_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  eposta text := lower(auth.jwt() ->> 'email');
  yalniz_kur boolean;
  n_hesap int := 0;
  n_hesap_sil int := 0;
  n_hareket int := 0;
  n_iptal int := 0;
  n_cek int := 0;
  n_cek_iptal int := 0;
begin
  perform public.v2_yazma_acik('kasa');   -- v1.730.1: geri dönüldüyse yazma yok (stok-v2.sql)
  yalniz_kur := jsonb_array_length(public.stk_dizi(p -> 'hesaplar')) = 0 and jsonb_array_length(public.stk_dizi(p -> 'hesapSil')) = 0
    and jsonb_array_length(public.stk_dizi(p -> 'hareketler')) = 0 and jsonb_array_length(public.stk_dizi(p -> 'hareketIptal')) = 0
    and jsonb_array_length(public.stk_dizi(p -> 'cekler')) = 0 and jsonb_array_length(public.stk_dizi(p -> 'cekIptal')) = 0
    and jsonb_array_length(public.stk_dizi(p -> 'ayarSil')) = 0
    and not exists (select 1 from jsonb_object_keys(case when jsonb_typeof(p -> 'ayar') = 'object' then p -> 'ayar' else '{}'::jsonb end) k
                    where k not in ('kurlar', 'kurGecmisi'));
  if not yalniz_kur then
    perform public.stk_yetki(array['muhasebe', 'fisler', 'cari'], 'kaydetme');
  end if;
  if exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'hareketler')) x
             where coalesce(x ->> 'id', '') = '' or coalesce(x ->> 'hesap_id', '') = '' or jsonb_typeof(x -> 'veri') <> 'object')
     or exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'hesaplar')) x
                where coalesce(x ->> 'id', '') = '' or coalesce(x ->> 'tur', '') not in ('kasa', 'banka'))
     or exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'cekler')) x
                where coalesce(x ->> 'id', '') = '' or jsonb_typeof(x -> 'veri') <> 'object') then
    raise exception 'Kasa kaydında kimlik, hesap ya da tür eksik' using errcode = '22023';
  end if;

  insert into public.kas_hesap as h (id, tur, sira, veri, aktif, olusturan)
  select distinct on (x ->> 'id') x ->> 'id', x ->> 'tur',
         coalesce(public.stk_sayi(x ->> 'sira'), (select m.sira from public.kas_hesap m where m.id = x ->> 'id'),
                  (select coalesce(max(m.sira), 0) from public.kas_hesap m) + e.n),
         case when jsonb_typeof(x -> 'veri') = 'object' then (x -> 'veri') - 'hareketler' - 'id' else '{}'::jsonb end, true, eposta
  from jsonb_array_elements(public.stk_dizi(p -> 'hesaplar')) with ordinality as e(x, n)
  order by x ->> 'id', e.n desc   -- aynı kimlik iki kez gelirse sonuncusu (v1.730.1)
  on conflict (id) do update set tur = excluded.tur, sira = excluded.sira, veri = excluded.veri, aktif = true, guncelleme = now()
  where (h.tur, h.sira, h.veri, h.aktif) is distinct from (excluded.tur, excluded.sira, excluded.veri, true);
  get diagnostics n_hesap = row_count;
  update public.kas_hesap set aktif = false, guncelleme = now()
   where id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'hesapSil'))) and aktif;
  get diagnostics n_hesap_sil = row_count;

  insert into public.kas_hareket as k (id, hesap_id, veri, olusturan)
  select distinct on (x ->> 'id') x ->> 'id', x ->> 'hesap_id', x -> 'veri', eposta
  from jsonb_array_elements(public.stk_dizi(p -> 'hareketler')) with ordinality as e(x, n)
  order by x ->> 'id', e.n desc
  on conflict (id) do update set hesap_id = excluded.hesap_id, veri = excluded.veri, guncelleme = now(),
    iptal = false, iptal_zamani = null, iptal_eden = null
  where (k.hesap_id, k.veri, k.iptal) is distinct from (excluded.hesap_id, excluded.veri, false);
  get diagnostics n_hareket = row_count;
  update public.kas_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta
   where id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'hareketIptal'))) and not iptal;
  get diagnostics n_iptal = row_count;

  insert into public.kas_cek as c (id, veri, olusturan)
  select distinct on (x ->> 'id') x ->> 'id', x -> 'veri', eposta
  from jsonb_array_elements(public.stk_dizi(p -> 'cekler')) with ordinality as e(x, n)
  order by x ->> 'id', e.n desc
  on conflict (id) do update set veri = excluded.veri, guncelleme = now(), iptal = false, iptal_zamani = null, iptal_eden = null
  where (c.veri, c.iptal) is distinct from (excluded.veri, false);
  get diagnostics n_cek = row_count;
  update public.kas_cek set iptal = true, iptal_zamani = now(), iptal_eden = eposta
   where id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'cekIptal'))) and not iptal;
  get diagnostics n_cek_iptal = row_count;

  if jsonb_typeof(p -> 'ayar') = 'object' or jsonb_array_length(public.stk_dizi(p -> 'ayarSil')) > 0 then
    update public.kas_ayar
       set veri = (veri - array(select jsonb_array_elements_text(public.stk_dizi(p -> 'ayarSil'))))
                  || (case when jsonb_typeof(p -> 'ayar') = 'object' then p -> 'ayar' else '{}'::jsonb end),
           guncelleme = now()
     where id = 'tekil';
  end if;

  return jsonb_build_object('hesap', n_hesap, 'hesapSil', n_hesap_sil, 'hareket', n_hareket, 'iptal', n_iptal,
                            'cek', n_cek, 'cekIptal', n_cek_iptal);
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

create or replace function public.kas_kurulum_tamamla() returns text
language plpgsql security definer set search_path = public as $$
declare
  t text;
  rapor text := '';
begin
  foreach t in array array['kas_hesap', 'kas_hareket', 'kas_cek', 'kas_ayar'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists kas_okuma on public.%I', t);
    execute format('create policy kas_okuma on public.%I for select to authenticated using (true)', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  revoke all on public.kas_muhasebe_g from anon, authenticated;
  grant select on public.kas_muhasebe_g to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.kas_hesap, public.kas_hareket, public.kas_cek, public.kas_ayar, public.kas_muhasebe_g to service_role;
  end if;
  revoke all on function public.kas_yaz(jsonb) from public, anon;
  grant execute on function public.kas_yaz(jsonb) to authenticated;
  revoke all on function public.fis_yaz(jsonb) from public, anon;
  grant execute on function public.fis_yaz(jsonb) to authenticated;
  if to_regprocedure('public.degisiklik_izle_kur(text)') is not null then
    foreach t in array array['kas_hesap', 'kas_hareket', 'kas_cek', 'kas_ayar'] loop
      perform public.degisiklik_izle_kur(t);
    end loop;
    rapor := rapor || 'değişiklik sayacı kuruldu; ';
  end if;
  if to_regprocedure('public.arsive_kopyala_silinen()') is not null then
    foreach t in array array['kas_hesap', 'kas_hareket', 'kas_cek'] loop
      execute format('drop trigger if exists arsiv_silinen on public.%I', t);
      execute format('create trigger arsiv_silinen before delete on public.%I for each row execute function public.arsive_kopyala_silinen()', t);
    end loop;
    rapor := rapor || 'silme arşivi kuruldu; ';
  end if;
  return rapor || 'kasa v2 kuruldu';
end $$;
select public.kas_kurulum_tamamla();
drop function public.kas_kurulum_tamamla();
