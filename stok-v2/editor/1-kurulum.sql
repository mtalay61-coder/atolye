create or replace function public.stk_nrm(x text) returns text
language sql immutable as $$
  select nullif(lower(translate(regexp_replace(btrim(coalesce(x, '')), '\s+', ' ', 'g'), 'İIĞÜŞÖÇ', 'iığüşöç')), '')
$$;

create or replace function public.stk_yer_tutucu_mu(x text) returns boolean
language sql immutable as $$
  select public.stk_nrm(x) is null or public.stk_nrm(x) = 'standart'
$$;

create or replace function public.stk_zaman(x text) returns timestamptz
language plpgsql immutable as $$
begin
  if x is null or btrim(x) = '' then return null; end if;
  return x::timestamptz;
exception when others then
  return null;
end $$;

create or replace function public.stk_sayi(x text) returns numeric
language plpgsql immutable as $$
begin
  if x is null or btrim(x) = '' then return null; end if;
  return replace(btrim(x), ',', '.')::numeric;
exception when others then
  return null;
end $$;
create or replace function public.stk_dizi(j jsonb) returns jsonb
language sql immutable as $$
  select case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end
$$;
create or replace function public.stk_mantik(x text) returns boolean
language sql immutable as $$
  select lower(btrim(coalesce(x, ''))) in ('true', 't', '1', 'evet', 'yes')
$$;

create table if not exists public.stk_renk (
  id           text primary key,
  ad           text not null,
  tur          text not null check (tur in ('renk', 'model', 'serbest')),
  kod          text,
  barkod_kodu  text,
  renk_kodu    text,
  aktif        boolean not null default true,
  guncelleme   timestamptz not null default now()
);

create table if not exists public.stk_olcu (
  id           text primary key,
  ad           text not null,
  tur          text not null default 'Beden',
  aktif        boolean not null default true,
  guncelleme   timestamptz not null default now()
);

create table if not exists public.stk_varyant (
  id           text primary key default ('vry-' || replace(gen_random_uuid()::text, '-', '')),
  urun_id      text not null,
  renk_id      text references public.stk_renk(id),
  olcu_id      text references public.stk_olcu(id),
  min_stok     numeric not null default 0,
  aktif        boolean not null default true,
  olusturma    timestamptz not null default now()
);
create unique index if not exists stk_varyant_tekil on public.stk_varyant (urun_id, coalesce(renk_id, ''), coalesce(olcu_id, ''));
create index if not exists stk_varyant_urun on public.stk_varyant (urun_id);

create table if not exists public.stk_fis (
  id             text primary key,
  tur            text not null,
  kaynak         text,
  tarih          timestamptz not null default now(),
  cari_id        text,
  siparis_id     text,
  siparis_no     text,
  uretim_id      text,
  aciklama       text,
  kullanici      text,
  olusturan      text,
  olusturma      timestamptz not null default now(),
  iptal          boolean not null default false,
  iptal_zamani   timestamptz,
  iptal_eden     text,
  iptal_sebebi   text,
  goc            boolean not null default false,
  ek             jsonb not null default '{}'::jsonb
);
create index if not exists stk_fis_tarih on public.stk_fis (tarih);
create index if not exists stk_fis_siparis on public.stk_fis (siparis_id);
create index if not exists stk_fis_uretim on public.stk_fis (uretim_id);

create table if not exists public.stk_hareket (
  id                       text primary key,
  fis_id                   text not null references public.stk_fis(id),
  varyant_id               text not null references public.stk_varyant(id),
  urun_id                  text not null,
  miktar                   numeric not null check (miktar <> 0),
  kaynak                   text,
  tarih                    timestamptz not null default now(),
  siparis_id               text,
  siparis_no               text,
  kalem_id                 text,
  cari_id                  text,
  uretim_id                text,
  rezervasyon_siparis_id   text,
  fazla_gonderim           boolean not null default false,
  aciklama                 text,
  ek                       jsonb not null default '{}'::jsonb,
  iptal                    boolean not null default false,
  iptal_zamani             timestamptz,
  iptal_eden               text
);
alter table public.stk_hareket add column if not exists iptal boolean not null default false;
alter table public.stk_hareket add column if not exists iptal_zamani timestamptz;
alter table public.stk_hareket add column if not exists iptal_eden text;
create index if not exists stk_hareket_fis on public.stk_hareket (fis_id);
create index if not exists stk_hareket_varyant on public.stk_hareket (varyant_id);
create index if not exists stk_hareket_urun on public.stk_hareket (urun_id);
create index if not exists stk_hareket_siparis on public.stk_hareket (siparis_id, kalem_id);

create or replace view public.stk_stok with (security_invoker = true) as
select v.id as varyant_id, v.urun_id, v.renk_id, r.ad as renk_ad, v.olcu_id, o.ad as olcu_ad, v.min_stok, v.aktif,
       coalesce(sum(h.miktar) filter (where not f.iptal and not h.iptal), 0) as miktar
from public.stk_varyant v
left join public.stk_renk r on r.id = v.renk_id
left join public.stk_olcu o on o.id = v.olcu_id
left join public.stk_hareket h on h.varyant_id = v.id
left join public.stk_fis f on f.id = h.fis_id
group by v.id, r.ad, o.ad;

create table if not exists public.stk_ayar (
  id          text primary key default 'tekil' check (id = 'tekil'),
  aktif       boolean not null default false,
  gecis       timestamptz,
  geri_donus  timestamptz
);
insert into public.stk_ayar (id) values ('tekil') on conflict (id) do nothing;

create or replace view public.stk_eski_varyantlar_g with (security_invoker = true) as
select s.urun_id, coalesce(s.renk_ad, 'Standart') as renk,
       max(case when r.tur = 'renk' then s.renk_id end) as renk_id,
       coalesce(s.olcu_ad, 'Standart') as beden, sum(s.miktar) as miktar, max(s.min_stok) as min_stok
from public.stk_stok s
left join public.stk_renk r on r.id = s.renk_id
where s.aktif or s.miktar <> 0
group by s.urun_id, coalesce(s.renk_ad, 'Standart'), coalesce(s.olcu_ad, 'Standart');

create or replace view public.stk_eski_hareketler_g with (security_invoker = true) as
select h.id, h.urun_id, coalesce(r.ad, 'Standart') as renk, coalesce(o.ad, 'Standart') as beden, h.miktar, h.kaynak,
       to_char(h.tarih at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as tarih,
       h.fis_id as fis_no,
       h.siparis_no, h.cari_id, h.uretim_id, h.siparis_id, h.kalem_id, h.rezervasyon_siparis_id, h.fazla_gonderim,
       h.aciklama, h.ek
from public.stk_hareket h
join public.stk_fis f on f.id = h.fis_id
join public.stk_varyant v on v.id = h.varyant_id
left join public.stk_renk r on r.id = v.renk_id
left join public.stk_olcu o on o.id = v.olcu_id
where not h.iptal and not f.iptal;

create or replace function public.stk_tanim_esitle(t jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if t is null then return; end if;
  insert into public.stk_renk (id, ad, tur, kod, barkod_kodu, renk_kodu, aktif, guncelleme)
  select distinct on (r ->> 'id') r ->> 'id', btrim(r ->> 'ad'), 'renk', r ->> 'kod', r ->> 'barkodKodu', r ->> 'renkKodu', true, now()
  from jsonb_array_elements(public.stk_dizi(t -> 'renkler')) r
  where coalesce(r ->> 'id', '') <> '' and coalesce(btrim(r ->> 'ad'), '') <> ''
  order by r ->> 'id'
  on conflict (id) do update set ad = excluded.ad, tur = 'renk', kod = excluded.kod, barkod_kodu = excluded.barkod_kodu,
    renk_kodu = excluded.renk_kodu, aktif = true, guncelleme = now()
  where (stk_renk.ad, stk_renk.tur, stk_renk.kod, stk_renk.barkod_kodu, stk_renk.renk_kodu, stk_renk.aktif)
    is distinct from (excluded.ad, 'renk', excluded.kod, excluded.barkod_kodu, excluded.renk_kodu, true);
  insert into public.stk_renk (id, ad, tur, kod, barkod_kodu, aktif, guncelleme)
  select distinct on (k ->> 'id') k ->> 'id',
         (k ->> 'kod') || ' - ' || (
           select string_agg(coalesce((select btrim(r ->> 'ad') from jsonb_array_elements(public.stk_dizi(t -> 'renkler')) r
                                       where r ->> 'id' = ri.v), '?'), '/' order by ri.n)
           from jsonb_array_elements_text(public.stk_dizi(k -> 'renkIdler')) with ordinality as ri(v, n)),
         'model', k ->> 'kod', k ->> 'barkodKodu', true, now()
  from jsonb_array_elements(public.stk_dizi(t -> 'renkKombinasyonlari')) k
  where coalesce(k ->> 'id', '') <> '' and coalesce(k ->> 'kod', '') <> ''
  order by k ->> 'id'
  on conflict (id) do update set ad = excluded.ad, tur = 'model', kod = excluded.kod, barkod_kodu = excluded.barkod_kodu,
    aktif = true, guncelleme = now()
  where (stk_renk.ad, stk_renk.tur, stk_renk.kod, stk_renk.barkod_kodu, stk_renk.aktif)
    is distinct from (excluded.ad, 'model', excluded.kod, excluded.barkod_kodu, true);
  update public.stk_renk s set aktif = false, guncelleme = now()
  where s.aktif and s.tur in ('renk', 'model')
    and not exists (select 1 from jsonb_array_elements(public.stk_dizi(t -> 'renkler')) r where r ->> 'id' = s.id)
    and not exists (select 1 from jsonb_array_elements(public.stk_dizi(t -> 'renkKombinasyonlari')) k where k ->> 'id' = s.id);
  insert into public.stk_olcu (id, ad, tur, aktif, guncelleme)
  select distinct on (b ->> 'id') b ->> 'id', btrim(b ->> 'ad'), coalesce(b ->> 'tip', 'Beden'), true, now()
  from jsonb_array_elements(public.stk_dizi(t -> 'bedenler')) b
  where coalesce(b ->> 'id', '') <> '' and coalesce(btrim(b ->> 'ad'), '') <> ''
  order by b ->> 'id'
  on conflict (id) do update set ad = excluded.ad, tur = excluded.tur, aktif = true, guncelleme = now()
  where (stk_olcu.ad, stk_olcu.tur, stk_olcu.aktif) is distinct from (excluded.ad, excluded.tur, true);
  update public.stk_olcu s set aktif = false, guncelleme = now()
  where s.aktif and s.tur <> 'serbest'
    and not exists (select 1 from jsonb_array_elements(public.stk_dizi(t -> 'bedenler')) b where b ->> 'id' = s.id);
  perform public.stk_serbest_birlestir();
end $$;

create or replace function public.stk_tanim_tetik() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id = 'tekil' then
    begin
      perform public.stk_tanim_esitle(new.veri);
    exception when others then
      raise warning 'stok v2 tanım aynası güncellenemedi: %', sqlerrm;
    end;
  end if;
  return null;
end $$;
drop trigger if exists stk_tanim_aynasi on public.tanimlar;
create trigger stk_tanim_aynasi after insert or update of veri on public.tanimlar
  for each row execute function public.stk_tanim_tetik();

create or replace function public.stk_renk_coz(p_id text, p_ad text) returns text
language plpgsql security definer set search_path = public as $$
declare
  r text;
begin
  if coalesce(p_id, '') <> '' then
    select id into r from public.stk_renk where id = p_id;
    if r is not null then return r; end if;
  end if;
  if public.stk_yer_tutucu_mu(p_ad) then return null; end if;
  select id into r from public.stk_renk
   where public.stk_nrm(ad) = public.stk_nrm(p_ad)
   order by aktif desc, case tur when 'model' then 0 when 'renk' then 1 else 2 end, id
   limit 1;
  if r is not null then return r; end if;
  r := 'srenk-' || substr(md5(public.stk_nrm(p_ad)), 1, 12);
  insert into public.stk_renk (id, ad, tur) values (r, btrim(regexp_replace(p_ad, '\s+', ' ', 'g')), 'serbest')
  on conflict (id) do nothing;
  return r;
end $$;

create or replace function public.stk_olcu_coz(p_id text, p_ad text) returns text
language plpgsql security definer set search_path = public as $$
declare
  r text;
begin
  if coalesce(p_id, '') <> '' then
    select id into r from public.stk_olcu where id = p_id;
    if r is not null then return r; end if;
  end if;
  if public.stk_yer_tutucu_mu(p_ad) then return null; end if;
  select id into r from public.stk_olcu where public.stk_nrm(ad) = public.stk_nrm(p_ad) order by aktif desc, id limit 1;
  if r is not null then return r; end if;
  r := 'solcu-' || substr(md5(public.stk_nrm(p_ad)), 1, 12);
  insert into public.stk_olcu (id, ad, tur) values (r, btrim(regexp_replace(p_ad, '\s+', ' ', 'g')), 'serbest')
  on conflict (id) do nothing;
  return r;
end $$;

create or replace function public.stk_varyant_coz(p_urun_id text, p_renk_id text, p_renk text, p_olcu_id text, p_olcu text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  rid text := public.stk_renk_coz(p_renk_id, p_renk);
  oid_ text := public.stk_olcu_coz(p_olcu_id, p_olcu);
  v text;
begin
  if not exists (select 1 from public.urunler where id = p_urun_id) then
    raise exception 'Ürün bulunamadı: %', p_urun_id using errcode = 'P0002';
  end if;
  select id into v from public.stk_varyant
   where urun_id = p_urun_id and coalesce(renk_id, '') = coalesce(rid, '') and coalesce(olcu_id, '') = coalesce(oid_, '');
  if v is null then
    insert into public.stk_varyant (urun_id, renk_id, olcu_id) values (p_urun_id, rid, oid_)
    on conflict do nothing
    returning id into v;
    if v is null then   -- aynı anda başka işlem açtı
      select id into v from public.stk_varyant
       where urun_id = p_urun_id and coalesce(renk_id, '') = coalesce(rid, '') and coalesce(olcu_id, '') = coalesce(oid_, '');
    end if;
  end if;
  return v;
end $$;

create or replace function public.stk_yetki(moduller text[], islem text) returns void
language plpgsql security definer set search_path = public as $$
declare
  ok boolean := true;
begin
  if auth.jwt() is null then return; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'yetki_var_mi') then
    ok := public.yetki_var_mi(moduller, islem);
  end if;
  if not coalesce(ok, false) then
    raise exception 'Bu işlem için yetkiniz yok (stok: %)', islem using errcode = '42501';
  end if;
end $$;

create or replace function public.stk_bakiye_json(p_varyantlar text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('varyantId', s.varyant_id, 'urunId', s.urun_id, 'renkId', s.renk_id, 'renk', s.renk_ad,
                                               'olcuId', s.olcu_id, 'olcu', s.olcu_ad, 'miktar', s.miktar) order by s.varyant_id), '[]'::jsonb)
  from public.stk_stok s where s.varyant_id = any(p_varyantlar)
$$;

create or replace function public.stk_varyant_bul(p_urun_id text, p_renk_id text, p_renk text, p_olcu_id text, p_olcu text)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  rid text;
  oid_ text;
  v text;
begin
  if coalesce(p_renk_id, '') <> '' and exists (select 1 from public.stk_renk where id = p_renk_id) then
    rid := p_renk_id;
  elsif not public.stk_yer_tutucu_mu(p_renk) then
    select id into rid from public.stk_renk where public.stk_nrm(ad) = public.stk_nrm(p_renk)
     order by aktif desc, case tur when 'model' then 0 when 'renk' then 1 else 2 end, id limit 1;
    if rid is null then return null; end if;
  end if;
  if coalesce(p_olcu_id, '') <> '' and exists (select 1 from public.stk_olcu where id = p_olcu_id) then
    oid_ := p_olcu_id;
  elsif not public.stk_yer_tutucu_mu(p_olcu) then
    select id into oid_ from public.stk_olcu where public.stk_nrm(ad) = public.stk_nrm(p_olcu) order by aktif desc, id limit 1;
    if oid_ is null then return null; end if;
  end if;
  select id into v from public.stk_varyant
   where urun_id = p_urun_id and coalesce(renk_id, '') = coalesce(rid, '') and coalesce(olcu_id, '') = coalesce(oid_, '');
  return v;
end $$;

create or replace function public.stk_serbest_birlestir() returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v record;
  hedef_v text;
  n int := 0;
begin
  for r in
    select s.id as serbest, (select t.id from public.stk_renk t
                              where t.tur <> 'serbest' and t.aktif and public.stk_nrm(t.ad) = public.stk_nrm(s.ad)
                              order by case t.tur when 'model' then 0 else 1 end, t.id limit 1) as hedef
    from public.stk_renk s where s.tur = 'serbest'
  loop
    continue when r.hedef is null;
    for v in select * from public.stk_varyant where renk_id = r.serbest loop
      select id into hedef_v from public.stk_varyant
       where urun_id = v.urun_id and renk_id = r.hedef and coalesce(olcu_id, '') = coalesce(v.olcu_id, '');
      if hedef_v is null then
        update public.stk_varyant set renk_id = r.hedef where id = v.id;
      else
        update public.stk_hareket set varyant_id = hedef_v where varyant_id = v.id;
        update public.stk_varyant set min_stok = greatest(min_stok, v.min_stok), aktif = aktif or v.aktif where id = hedef_v;
        delete from public.stk_varyant where id = v.id;
      end if;
    end loop;
    delete from public.stk_renk where id = r.serbest;
    n := n + 1;
  end loop;
  for r in
    select s.id as serbest, (select t.id from public.stk_olcu t
                              where t.tur <> 'serbest' and t.aktif and public.stk_nrm(t.ad) = public.stk_nrm(s.ad)
                              order by t.id limit 1) as hedef
    from public.stk_olcu s where s.tur = 'serbest'
  loop
    continue when r.hedef is null;
    for v in select * from public.stk_varyant where olcu_id = r.serbest loop
      select id into hedef_v from public.stk_varyant
       where urun_id = v.urun_id and olcu_id = r.hedef and coalesce(renk_id, '') = coalesce(v.renk_id, '');
      if hedef_v is null then
        update public.stk_varyant set olcu_id = r.hedef where id = v.id;
      else
        update public.stk_hareket set varyant_id = hedef_v where varyant_id = v.id;
        update public.stk_varyant set min_stok = greatest(min_stok, v.min_stok), aktif = aktif or v.aktif where id = hedef_v;
        delete from public.stk_varyant where id = v.id;
      end if;
    end loop;
    delete from public.stk_olcu where id = r.serbest;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.stk_kaynak_tur(k text) returns text
language sql immutable as $$
  select case k when 'Satınalma' then 'Alış' when 'Satış' then 'Satış' when 'Üretim' then 'Üretim' when 'Açılış' then 'Açılış'
                when 'Numune' then 'Numune' when 'Manuel' then 'Manuel' when 'Sayım' then 'Sayım' when 'Fire' then 'Fire'
                when 'Transfer' then 'Transfer'
                else coalesce(nullif(k, ''), 'Manuel') end
$$;

create or replace function public.stk_fis_kaydet(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  fid text := btrim(coalesce(p ->> 'id', ''));
  s jsonb;
  vid text;
  hareketler jsonb := '[]'::jsonb;
  varyantlar text[] := '{}';
  mevcut_imza text;
  yeni_imza text;
  m numeric;
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim'], 'kaydetme');
  if fid = '' then raise exception 'Fiş numarası yok' using errcode = '22023'; end if;
  if jsonb_typeof(p -> 'satirlar') <> 'array' or jsonb_array_length(p -> 'satirlar') = 0 then
    raise exception 'Fiş % boş: en az bir satır gerekli', fid using errcode = '22023';
  end if;
  if exists (select 1 from public.stk_fis where id = fid) then
    select string_agg(h.id || ':' || h.miktar::text, ',' order by h.id) into mevcut_imza from public.stk_hareket h where h.fis_id = fid;
    select string_agg((x ->> 'id') || ':' || ((x ->> 'miktar')::numeric)::text, ',' order by x ->> 'id') into yeni_imza
      from jsonb_array_elements(p -> 'satirlar') x;
    if mevcut_imza is not distinct from yeni_imza then
      select array_agg(distinct varyant_id) into varyantlar from public.stk_hareket where fis_id = fid;
      return jsonb_build_object('fisId', fid, 'zatenVar', true,
        'hareketler', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'varyantId', varyant_id) order by id), '[]'::jsonb) from public.stk_hareket where fis_id = fid),
        'bakiye', public.stk_bakiye_json(varyantlar));
    end if;
    raise exception 'Fiş numarası % başka bir fişte kullanılmış', fid using errcode = '23505';
  end if;

  insert into public.stk_fis (id, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, aciklama, kullanici, olusturan, ek)
  values (fid, coalesce(nullif(p ->> 'tur', ''), 'Manuel'), p ->> 'kaynak', coalesce(public.stk_zaman(p ->> 'tarih'), now()),
          p ->> 'cariId', p ->> 'siparisId', p ->> 'siparisNo', p ->> 'uretimId', p ->> 'aciklama', p ->> 'kullanici',
          lower(auth.jwt() ->> 'email'), coalesce(p -> 'ek', '{}'::jsonb));

  for s in select * from jsonb_array_elements(p -> 'satirlar') loop
    if coalesce(s ->> 'id', '') = '' then raise exception 'Fiş % satırında hareket kimliği yok', fid using errcode = '22023'; end if;
    m := (s ->> 'miktar')::numeric;
    if m is null or m = 0 then raise exception 'Fiş % satırı %: miktar sıfır olamaz', fid, s ->> 'id' using errcode = '22023'; end if;
    vid := public.stk_varyant_coz(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, siparis_id, siparis_no, kalem_id,
                                    cari_id, uretim_id, rezervasyon_siparis_id, fazla_gonderim, aciklama, ek)
    values (s ->> 'id', fid, vid, s ->> 'urunId', m, coalesce(s ->> 'kaynak', p ->> 'kaynak'),
            coalesce(public.stk_zaman(s ->> 'tarih'), public.stk_zaman(p ->> 'tarih'), now()),
            coalesce(s ->> 'siparisId', p ->> 'siparisId'), coalesce(s ->> 'siparisNo', p ->> 'siparisNo'), s ->> 'kalemId',
            coalesce(s ->> 'cariId', p ->> 'cariId'), coalesce(s ->> 'uretimId', p ->> 'uretimId'), s ->> 'rezervasyonSiparisId',
            coalesce((s ->> 'fazlaGonderim')::boolean, false), s ->> 'aciklama', coalesce(s -> 'ek', '{}'::jsonb));
    hareketler := hareketler || jsonb_build_object('id', s ->> 'id', 'varyantId', vid);
    varyantlar := array_append(varyantlar, vid);
  end loop;

  return jsonb_build_object('fisId', fid, 'zatenVar', false, 'hareketler', hareketler, 'bakiye', public.stk_bakiye_json(varyantlar));
end $$;

create or replace function public.stk_fis_iptal(p_fis_id text, p_sebep text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  f public.stk_fis;
  varyantlar text[];
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim'], 'silme');
  select * into f from public.stk_fis where id = p_fis_id for update;
  if not found then raise exception 'Fiş bulunamadı: %', p_fis_id using errcode = 'P0002'; end if;
  if not f.iptal then
    update public.stk_fis set iptal = true, iptal_zamani = now(), iptal_eden = lower(auth.jwt() ->> 'email'), iptal_sebebi = p_sebep
     where id = p_fis_id;
  end if;
  select array_agg(distinct varyant_id) into varyantlar from public.stk_hareket where fis_id = p_fis_id;
  return jsonb_build_object('fisId', p_fis_id, 'zatenIptal', f.iptal, 'bakiye', public.stk_bakiye_json(coalesce(varyantlar, '{}')));
end $$;

create or replace function public.stk_varyant_ac(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  vid text;
begin
  perform public.stk_yetki(array['stok'], 'kaydetme');
  vid := public.stk_varyant_coz(p ->> 'urunId', p ->> 'renkId', p ->> 'renk', p ->> 'olcuId', coalesce(p ->> 'olcu', p ->> 'beden'));
  update public.stk_varyant set aktif = true, min_stok = coalesce((p ->> 'minStok')::numeric, min_stok) where id = vid;
  return jsonb_build_object('varyantId', vid, 'bakiye', public.stk_bakiye_json(array[vid]));
end $$;

create or replace function public.stk_varyant_kaldir(p_varyant_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  bakiye numeric;
begin
  perform public.stk_yetki(array['stok'], 'silme');
  select miktar into bakiye from public.stk_stok where varyant_id = p_varyant_id;
  if bakiye is null then raise exception 'Varyant bulunamadı: %', p_varyant_id using errcode = 'P0002'; end if;
  if bakiye <> 0 then
    raise exception 'Stokta % var — önce sayım/çıkış fişiyle sıfırlayın', bakiye using errcode = '23514';
  end if;
  if exists (select 1 from public.stk_hareket where varyant_id = p_varyant_id) then
    update public.stk_varyant set aktif = false where id = p_varyant_id;
    return jsonb_build_object('varyantId', p_varyant_id, 'sonuc', 'pasif');
  end if;
  delete from public.stk_varyant where id = p_varyant_id;
  return jsonb_build_object('varyantId', p_varyant_id, 'sonuc', 'silindi');
end $$;

create or replace function public.stk_min_stok(p_varyant_id text, p_min numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.stk_yetki(array['stok'], 'kaydetme');
  update public.stk_varyant set min_stok = coalesce(p_min, 0) where id = p_varyant_id;
  if not found then raise exception 'Varyant bulunamadı: %', p_varyant_id using errcode = 'P0002'; end if;
  return public.stk_bakiye_json(array[p_varyant_id]);
end $$;

create or replace function public.stk_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  vid text;
  fid text;
  m numeric;
  f public.stk_fis;
  eposta text := lower(auth.jwt() ->> 'email');
  bakiye numeric;
  n_ac int := 0;
  n_satir int := 0;
  n_iptal int := 0;
  n_kaldir int := 0;
  n int;
  atlanan jsonb := '[]'::jsonb;
  acilan text[] := '{}';
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim'], 'kaydetme');

  for s in select * from jsonb_array_elements(coalesce(p -> 'varyantAc', '[]'::jsonb)) loop
    vid := public.stk_varyant_coz(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    update public.stk_varyant set aktif = true, min_stok = coalesce((s ->> 'minStok')::numeric, min_stok)
     where id = vid and (not aktif or min_stok is distinct from coalesce((s ->> 'minStok')::numeric, min_stok));
    acilan := array_append(acilan, vid);
    n_ac := n_ac + 1;
  end loop;

  for s in select * from jsonb_array_elements(coalesce(p -> 'satirlar', '[]'::jsonb)) loop
    fid := nullif(btrim(coalesce(s ->> 'fisId', '')), '');
    if coalesce(s ->> 'id', '') = '' then raise exception 'Stok satırında hareket kimliği yok' using errcode = '22023'; end if;
    if fid is null then raise exception 'Hareket % fişsiz — fişsiz hareket yazılamaz', s ->> 'id' using errcode = '22023'; end if;
    m := coalesce((s ->> 'miktar')::numeric, 0);
    if m = 0 then
      update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta where id = s ->> 'id' and not iptal;
      continue;
    end if;
    select * into f from public.stk_fis where id = fid for update;
    if not found then
      insert into public.stk_fis (id, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, kullanici, olusturan)
      values (fid, public.stk_kaynak_tur(s ->> 'kaynak'), s ->> 'kaynak', coalesce(public.stk_zaman(s ->> 'tarih'), now()),
              s ->> 'cariId', s ->> 'siparisId', s ->> 'siparisNo', s ->> 'uretimId', s -> 'ek' ->> 'kullanici', eposta);
    elsif f.iptal then
      update public.stk_hareket set iptal = true, iptal_zamani = coalesce(f.iptal_zamani, now()), iptal_eden = f.iptal_eden
       where fis_id = fid and not iptal and id <> s ->> 'id';
      update public.stk_fis set iptal = false where id = fid;
    end if;
    vid := public.stk_varyant_coz(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    insert into public.stk_hareket as h (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, siparis_id, siparis_no, kalem_id,
                                         cari_id, uretim_id, rezervasyon_siparis_id, fazla_gonderim, aciklama, ek)
    values (s ->> 'id', fid, vid, s ->> 'urunId', m, s ->> 'kaynak', coalesce(public.stk_zaman(s ->> 'tarih'), now()),
            s ->> 'siparisId', s ->> 'siparisNo', s ->> 'kalemId', s ->> 'cariId', s ->> 'uretimId', s ->> 'rezervasyonSiparisId',
            coalesce((s ->> 'fazlaGonderim')::boolean, false), s ->> 'aciklama', coalesce(s -> 'ek', '{}'::jsonb))
    on conflict (id) do update set
      fis_id = excluded.fis_id, varyant_id = excluded.varyant_id, urun_id = excluded.urun_id, miktar = excluded.miktar,
      kaynak = excluded.kaynak, tarih = excluded.tarih, siparis_id = excluded.siparis_id, siparis_no = excluded.siparis_no,
      kalem_id = excluded.kalem_id, cari_id = excluded.cari_id, uretim_id = excluded.uretim_id,
      rezervasyon_siparis_id = excluded.rezervasyon_siparis_id, fazla_gonderim = excluded.fazla_gonderim,
      aciklama = excluded.aciklama, ek = excluded.ek, iptal = false, iptal_zamani = null, iptal_eden = null
    where (h.fis_id, h.varyant_id, h.miktar, h.kaynak, h.tarih, h.siparis_id, h.siparis_no, h.kalem_id, h.cari_id, h.uretim_id,
           h.rezervasyon_siparis_id, h.fazla_gonderim, h.aciklama, h.ek, h.iptal)
      is distinct from (excluded.fis_id, excluded.varyant_id, excluded.miktar, excluded.kaynak, excluded.tarih, excluded.siparis_id,
           excluded.siparis_no, excluded.kalem_id, excluded.cari_id, excluded.uretim_id, excluded.rezervasyon_siparis_id,
           excluded.fazla_gonderim, excluded.aciklama, excluded.ek, false);
    n_satir := n_satir + 1;
  end loop;

  update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta
   where id in (select jsonb_array_elements_text(coalesce(p -> 'iptal', '[]'::jsonb))) and not iptal;
  get diagnostics n_iptal = row_count;

  for s in select * from jsonb_array_elements(coalesce(p -> 'varyantKaldir', '[]'::jsonb)) loop
    vid := public.stk_varyant_bul(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    continue when vid is null or vid = any(acilan);
    select miktar into bakiye from public.stk_stok where varyant_id = vid;
    if coalesce(bakiye, 0) <> 0 then
      atlanan := atlanan || jsonb_build_object('neden', 'stoğu var', 'varyantId', vid, 'miktar', bakiye);
    elsif exists (select 1 from public.stk_hareket where varyant_id = vid) then
      update public.stk_varyant set aktif = false where id = vid and aktif;
      n_kaldir := n_kaldir + 1;
    else
      delete from public.stk_varyant where id = vid;
      n_kaldir := n_kaldir + 1;
    end if;
  end loop;

  return jsonb_build_object('varyantAc', n_ac, 'satir', n_satir, 'iptal', n_iptal, 'varyantKaldir', n_kaldir, 'atlanan', atlanan);
end $$;

create or replace function public.stk_kurulum_tamamla() returns text
language plpgsql security definer set search_path = public as $$
declare
  t text;
  f text;
  rapor text := '';
begin
  foreach t in array array['stk_renk', 'stk_olcu', 'stk_varyant', 'stk_fis', 'stk_hareket', 'stk_ayar'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists stk_okuma on public.%I', t);
    execute format('create policy stk_okuma on public.%I for select to authenticated using (true)', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  foreach t in array array['stk_stok', 'stk_eski_varyantlar_g', 'stk_eski_hareketler_g'] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    foreach t in array array['stk_renk', 'stk_olcu', 'stk_varyant', 'stk_fis', 'stk_hareket', 'stk_ayar', 'stk_stok',
                             'stk_eski_varyantlar_g', 'stk_eski_hareketler_g'] loop
      execute format('grant select on public.%I to service_role', t);
    end loop;
  end if;

  foreach f in array array['stk_nrm(text)', 'stk_yer_tutucu_mu(text)', 'stk_zaman(text)', 'stk_sayi(text)', 'stk_mantik(text)', 'stk_dizi(jsonb)',
                           'stk_tanim_esitle(jsonb)', 'stk_tanim_tetik()',
                           'stk_renk_coz(text,text)', 'stk_olcu_coz(text,text)', 'stk_varyant_coz(text,text,text,text,text)',
                           'stk_yetki(text[],text)', 'stk_bakiye_json(text[])', 'stk_varyant_bul(text,text,text,text,text)',
                           'stk_serbest_birlestir()', 'stk_kaynak_tur(text)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['stk_fis_kaydet(jsonb)', 'stk_fis_iptal(text,text)', 'stk_varyant_ac(jsonb)', 'stk_varyant_kaldir(text)',
                           'stk_min_stok(text,numeric)', 'stk_yaz(jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;

  if to_regprocedure('public.degisiklik_izle_kur(text)') is not null then
    foreach t in array array['stk_renk', 'stk_olcu', 'stk_varyant', 'stk_fis', 'stk_hareket'] loop
      perform public.degisiklik_izle_kur(t);
    end loop;
    rapor := rapor || 'değişiklik sayacı kuruldu; ';
  end if;
  if to_regprocedure('public.arsive_kopyala_silinen()') is not null then
    foreach t in array array['stk_varyant', 'stk_fis', 'stk_hareket'] loop
      execute format('drop trigger if exists arsiv_silinen on public.%I', t);
      execute format('create trigger arsiv_silinen before delete on public.%I for each row execute function public.arsive_kopyala_silinen()', t);
    end loop;
    rapor := rapor || 'silme arşivi kuruldu; ';
  end if;
  return rapor || 'stok v2 kuruldu';
end $$;
select public.stk_kurulum_tamamla();
drop function public.stk_kurulum_tamamla();

select public.stk_tanim_esitle((select veri from public.tanimlar where id = 'tekil'));
