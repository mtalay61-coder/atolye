create table if not exists public.lst_kayit (
  tablo         text not null check (tablo in ('teklifler', 'faturalar', 'koliler', 'gorevler', 'modeller', 'fis_defteri', 'mesajlar')),
  id            text not null,
  sira          numeric not null default (extract(epoch from clock_timestamp()) * 1000),
  veri          jsonb not null,
  olusturan     text,
  olusturma     timestamptz not null default now(),
  guncelleme    timestamptz not null default now(),
  goc           boolean not null default false,
  iptal         boolean not null default false,
  iptal_zamani  timestamptz,
  iptal_eden    text,
  primary key (tablo, id)
);
create index if not exists lst_kayit_sira on public.lst_kayit (tablo, sira);

alter table public.stk_ayar add column if not exists liste_aktif boolean not null default false;
alter table public.stk_ayar add column if not exists liste_gecis timestamptz;
alter table public.stk_ayar add column if not exists liste_geri_donus timestamptz;

create or replace function public.lst_belge(p_tablo text) returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce((select jsonb_agg(x.veri order by x.sira, x.id) from public.lst_kayit x where x.tablo = p_tablo and not x.iptal),
                  '[]'::jsonb)
$$;

create or replace function public.lst_sayac() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ad text := coalesce(new.tablo, old.tablo);
begin
  if to_regclass('public.degisiklik') is not null then
    update public.degisiklik
       set sayaclar = jsonb_set(coalesce(sayaclar, '{}'::jsonb), array[ad], to_jsonb(coalesce((sayaclar ->> ad)::bigint, 0) + 1), true),
           zaman = now()
     where id = 'tekil';
  end if;
  return null;
end $$;
drop trigger if exists lst_sayac on public.lst_kayit;
create trigger lst_sayac after insert or update or delete on public.lst_kayit for each row execute function public.lst_sayac();

create or replace function public.lst_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  eposta text := lower(auth.jwt() ->> 'email');
  t text := p ->> 'tablo';
  n_yaz int := 0;
  n_iptal int := 0;
begin
  perform public.v2_yazma_acik('liste');   -- v1.730.1: geri dönüldüyse yazma yok (stok-v2.sql)
  if t is null or t not in ('teklifler', 'faturalar', 'koliler', 'gorevler', 'modeller', 'fis_defteri', 'mesajlar') then
    raise exception 'Liste tanınmıyor: %', coalesce(t, '(yok)') using errcode = '42501';
  end if;
  if t = 'faturalar' then
    perform public.stk_yetki(array['fisler', 'muhasebe'], 'kaydetme');
  end if;
  if exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'kayitlar')) x
             where coalesce(x ->> 'id', '') = '' or jsonb_typeof(x -> 'veri') <> 'object') then
    raise exception 'Liste kaydında kimlik ya da içerik eksik (%)', t using errcode = '22023';
  end if;

  insert into public.lst_kayit as k (tablo, id, sira, veri, olusturan)
  select distinct on (x ->> 'id') t, x ->> 'id',
         coalesce(public.stk_sayi(x ->> 'sira'), (select m.sira from public.lst_kayit m where m.tablo = t and m.id = x ->> 'id'),
                  extract(epoch from clock_timestamp()) * 1000000 + e.n),
         x -> 'veri', eposta
  from jsonb_array_elements(public.stk_dizi(p -> 'kayitlar')) with ordinality as e(x, n)
  order by x ->> 'id', e.n desc
  on conflict (tablo, id) do update set veri = excluded.veri, guncelleme = now(),
    iptal = false, iptal_zamani = null, iptal_eden = null
  where (k.veri, k.iptal) is distinct from (excluded.veri, false);
  get diagnostics n_yaz = row_count;

  update public.lst_kayit set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now()
   where tablo = t and id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'iptal'))) and not iptal;
  get diagnostics n_iptal = row_count;

  return jsonb_build_object('tablo', t, 'yaz', n_yaz, 'iptal', n_iptal);
end $$;

create or replace function public.lst_kurulum_tamamla() returns text
language plpgsql security definer set search_path = public as $$
declare
  rapor text := '';
begin
  alter table public.lst_kayit enable row level security;
  drop policy if exists lst_okuma on public.lst_kayit;
  create policy lst_okuma on public.lst_kayit for select to authenticated using (true);
  revoke all on public.lst_kayit from anon, authenticated;
  grant select on public.lst_kayit to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.lst_kayit to service_role;
    grant execute on function public.lst_belge(text) to service_role;
  end if;
  revoke all on function public.lst_yaz(jsonb) from public, anon;
  grant execute on function public.lst_yaz(jsonb) to authenticated;
  revoke all on function public.lst_belge(text) from public, anon;
  grant execute on function public.lst_belge(text) to authenticated;
  if to_regclass('public.degisiklik') is not null then
    rapor := rapor || 'değişiklik sayacı bağlandı; ';
  end if;
  if to_regprocedure('public.arsive_kopyala_silinen()') is not null then
    drop trigger if exists arsiv_silinen on public.lst_kayit;
    create trigger arsiv_silinen before delete on public.lst_kayit for each row execute function public.arsive_kopyala_silinen();
    rapor := rapor || 'silme arşivi kuruldu; ';
  end if;
  return rapor || 'liste v2 kuruldu';
end $$;
select public.lst_kurulum_tamamla();
drop function public.lst_kurulum_tamamla();
