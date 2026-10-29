create table if not exists public.car_hareket (
  id             text primary key,
  cari_id        text not null,
  tarih          text,
  zaman          text,
  yon            text,
  tutar          numeric not null default 0,
  para_birimi    text,
  odeme_sekli    text,
  vade           text,
  defter         text,
  fis_no         text,
  siparis_no     text,
  uretim_id      text,
  urun_ad        text,
  renk           text,
  aciklama       text,
  ek             jsonb not null default '{}'::jsonb,
  olusturan      text,
  olusturma      timestamptz not null default now(),
  guncelleme     timestamptz not null default now(),
  goc            boolean not null default false,
  iptal          boolean not null default false,
  iptal_zamani   timestamptz,
  iptal_eden     text
);
create index if not exists car_hareket_cari on public.car_hareket (cari_id);
create index if not exists car_hareket_fis on public.car_hareket (fis_no);
create index if not exists car_hareket_tarih on public.car_hareket (tarih);

alter table public.stk_ayar add column if not exists cari_aktif boolean not null default false;
alter table public.stk_ayar add column if not exists cari_gecis timestamptz;
alter table public.stk_ayar add column if not exists cari_geri_donus timestamptz;

create or replace view public.car_eski_hareketler_g with (security_invoker = true) as
select id, cari_id, tarih, zaman, yon, tutar, para_birimi, odeme_sekli, vade, defter, fis_no, siparis_no, uretim_id,
       urun_ad, renk, aciklama, ek
from public.car_hareket
where not iptal;

create or replace function public.car_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  eposta text := lower(auth.jwt() ->> 'email');
  n_satir int := 0;
  n_iptal int := 0;
begin
  perform public.v2_yazma_acik('cari');   -- v1.730.1: geri dönüldüyse yazma yok (stok-v2.sql)
  perform public.stk_yetki(array['cari', 'fisler', 'muhasebe', 'siparis', 'uretim', 'stok', 'tanimlar'], 'kaydetme');
  if exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'satirlar')) x
             where coalesce(x ->> 'id', '') = '' or coalesce(x ->> 'cari_id', '') = '') then
    raise exception 'Cari hareketinde kimlik ya da cari yok' using errcode = '22023';
  end if;
  insert into public.car_hareket as h (id, cari_id, tarih, zaman, yon, tutar, para_birimi, odeme_sekli, vade, defter, fis_no,
                                       siparis_no, uretim_id, urun_ad, renk, aciklama, ek, olusturan)
  select x ->> 'id', x ->> 'cari_id', x ->> 'tarih', x ->> 'zaman', x ->> 'yon', coalesce(public.stk_sayi(x ->> 'tutar'), 0),
         x ->> 'para_birimi', x ->> 'odeme_sekli', x ->> 'vade', x ->> 'defter', x ->> 'fis_no', x ->> 'siparis_no',
         x ->> 'uretim_id', x ->> 'urun_ad', x ->> 'renk', x ->> 'aciklama',
         case when jsonb_typeof(x -> 'ek') = 'object' then x -> 'ek' else '{}'::jsonb end, eposta
  from (select distinct on (y ->> 'id') y as x from jsonb_array_elements(public.stk_dizi(p -> 'satirlar')) with ordinality as e(y, sira)
        order by y ->> 'id', sira desc) s
  on conflict (id) do update set
    cari_id = excluded.cari_id, tarih = excluded.tarih, zaman = excluded.zaman, yon = excluded.yon, tutar = excluded.tutar,
    para_birimi = excluded.para_birimi, odeme_sekli = excluded.odeme_sekli, vade = excluded.vade, defter = excluded.defter,
    fis_no = excluded.fis_no, siparis_no = excluded.siparis_no, uretim_id = excluded.uretim_id, urun_ad = excluded.urun_ad,
    renk = excluded.renk, aciklama = excluded.aciklama, ek = excluded.ek, guncelleme = now(),
    iptal = false, iptal_zamani = null, iptal_eden = null
  where (h.cari_id, h.tarih, h.zaman, h.yon, h.tutar, h.para_birimi, h.odeme_sekli, h.vade, h.defter, h.fis_no, h.siparis_no,
         h.uretim_id, h.urun_ad, h.renk, h.aciklama, h.ek, h.iptal)
    is distinct from (excluded.cari_id, excluded.tarih, excluded.zaman, excluded.yon, excluded.tutar, excluded.para_birimi,
         excluded.odeme_sekli, excluded.vade, excluded.defter, excluded.fis_no, excluded.siparis_no, excluded.uretim_id,
         excluded.urun_ad, excluded.renk, excluded.aciklama, excluded.ek, false);
  get diagnostics n_satir = row_count;
  update public.car_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta
   where id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'iptal'))) and not iptal;
  get diagnostics n_iptal = row_count;
  return jsonb_build_object('satir', n_satir, 'iptal', n_iptal);
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

create or replace function public.car_kurulum_tamamla() returns text
language plpgsql security definer set search_path = public as $$
declare
  rapor text := '';
begin
  alter table public.car_hareket enable row level security;
  drop policy if exists car_okuma on public.car_hareket;
  create policy car_okuma on public.car_hareket for select to authenticated using (true);
  revoke all on public.car_hareket from anon, authenticated;
  grant select on public.car_hareket to authenticated;
  revoke all on public.car_eski_hareketler_g from anon, authenticated;
  grant select on public.car_eski_hareketler_g to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.car_hareket, public.car_eski_hareketler_g to service_role;
  end if;
  revoke all on function public.car_yaz(jsonb) from public, anon;
  grant execute on function public.car_yaz(jsonb) to authenticated;
  revoke all on function public.fis_yaz(jsonb) from public, anon;
  grant execute on function public.fis_yaz(jsonb) to authenticated;
  if to_regprocedure('public.degisiklik_izle_kur(text)') is not null then
    perform public.degisiklik_izle_kur('car_hareket');
    rapor := rapor || 'değişiklik sayacı kuruldu; ';
  end if;
  if to_regprocedure('public.arsive_kopyala_silinen()') is not null then
    drop trigger if exists arsiv_silinen on public.car_hareket;
    create trigger arsiv_silinen before delete on public.car_hareket for each row execute function public.arsive_kopyala_silinen();
    rapor := rapor || 'silme arşivi kuruldu; ';
  end if;
  return rapor || 'cari v2 kuruldu';
end $$;
select public.car_kurulum_tamamla();
drop function public.car_kurulum_tamamla();
