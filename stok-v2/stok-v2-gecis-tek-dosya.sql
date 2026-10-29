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

create or replace function public.v2_yazma_acik(p_modul text) returns void
language plpgsql stable security definer set search_path = public as $$
declare
  a jsonb;
  on_ek text := case when p_modul = 'stok' then '' else p_modul || '_' end;
begin
  select to_jsonb(s) into a from public.stk_ayar s where s.id = 'tekil';
  if a is null then return; end if;
  if not coalesce((a ->> (on_ek || 'aktif'))::boolean, false) and (a ->> (on_ek || 'geri_donus')) is not null then
    raise exception '% v2 kapalı (geri dönüldü) — uygulamayı yenileyin; kayıt bekleyenlerde, yenileyince eski yoldan gönderilir', p_modul
      using errcode = '55000';
  end if;
end $$;
revoke all on function public.v2_yazma_acik(text) from public, anon, authenticated;

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
  perform public.v2_yazma_acik('stok');
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe', 'tanimlar'], 'kaydetme');

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
create or replace function public.stk_goc(p_fark_fisi boolean default true, p_zorla boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t jsonb;
  r record;
  vid text;
  rid text;
  oid_ text;
  fark_fis text := 'GOC-ACILIS-' || to_char(now(), 'YYYYMMDD');
  atlanan jsonb := '[]'::jsonb;
  tutarsiz_iptal jsonb := '[]'::jsonb;
  defter jsonb;
  d jsonb;
  s jsonb;
  n_fark int := 0;
  sonuc jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Göç yalnız Supabase SQL Editor''den çalıştırılır' using errcode = '42501';
  end if;
  if exists (select 1 from public.stk_ayar where aktif) then
    raise exception 'Stok v2 etkin (geçiş yapıldı) — göç yeniden çalıştırılamaz; geri dönmek için stk_geri_don()' using errcode = '55000';
  end if;
  if not p_zorla and exists (select 1 from public.stk_fis where not goc) then
    raise exception 'stk_fis''te uygulamadan yazılmış fiş var — göç yeniden çalıştırılırsa silinirdi (bilerek: p_zorla => true)'
      using errcode = '55000';
  end if;

  truncate public.stk_hareket, public.stk_fis, public.stk_varyant;
  delete from public.stk_renk where tur = 'serbest';
  delete from public.stk_olcu where tur = 'serbest';
  select veri into t from public.tanimlar where id = 'tekil';
  perform public.stk_tanim_esitle(t);
  select veri into defter from public.fis_defteri where id = 'tekil';
  defter := case when jsonb_typeof(defter) = 'array' then defter else '[]'::jsonb end;

  drop table if exists _ev, _eh, _vm, _fark;
  create temp table _ev on commit drop as
    select j ->> 'urun_id' as urun_id, j ->> 'renk' as renk, j ->> 'renk_id' as renk_id, coalesce(j ->> 'beden', '') as beden,
           coalesce(public.stk_sayi(j ->> 'miktar'), 0) as miktar, coalesce(public.stk_sayi(j ->> 'min_stok'), 0) as min_stok
    from (select to_jsonb(v) as j from public.varyantlar v) x;
  create temp table _eh on commit drop as
    select j ->> 'id' as id, j ->> 'urun_id' as urun_id, j ->> 'renk' as renk, coalesce(j ->> 'beden', '') as beden,
           public.stk_sayi(j ->> 'miktar') as miktar, j ->> 'kaynak' as kaynak,
           coalesce(public.stk_zaman(j ->> 'tarih'), now()) as tarih,
           coalesce(nullif(btrim(j ->> 'fis_no'), ''), 'ESKI-' || (j ->> 'id')) as fis_id,
           j ->> 'siparis_no' as siparis_no, j ->> 'cari_id' as cari_id, j ->> 'uretim_id' as uretim_id,
           j ->> 'siparis_id' as siparis_id, j ->> 'kalem_id' as kalem_id, j ->> 'rezervasyon_siparis_id' as rezervasyon_siparis_id,
           public.stk_mantik(j ->> 'fazla_gonderim') as fazla_gonderim, j ->> 'aciklama' as aciklama,
           coalesce(j -> 'ek', '{}'::jsonb) as ek
    from (select to_jsonb(h) as j from public.stok_hareketleri h) x;

  create temp table _vm (urun_id text, renk_id text, renk_nrm text, beden_nrm text, varyant_id text, eski_miktar numeric) on commit drop;

  for r in
    select urun_id, renk_id, renk, beden, sum(miktar) as miktar, max(min_stok) as min_stok, bool_or(true) as varyanttan
    from _ev group by urun_id, renk_id, renk, beden
    union all
    select distinct h.urun_id, null, h.renk, h.beden, null::numeric, 0, false
    from _eh h
    where not exists (select 1 from _ev e where e.urun_id = h.urun_id and public.stk_nrm(e.renk) is not distinct from public.stk_nrm(h.renk)
                                            and public.stk_nrm(e.beden) is not distinct from public.stk_nrm(h.beden))
  loop
    if not exists (select 1 from public.urunler where id = r.urun_id) then
      atlanan := atlanan || jsonb_build_object('neden', 'ürün yok', 'urunId', r.urun_id, 'renk', r.renk, 'beden', r.beden);
      continue;
    end if;
    rid := null;
    if coalesce(r.renk_id, '') <> '' and exists (select 1 from public.stk_renk where id = r.renk_id and public.stk_nrm(ad) = public.stk_nrm(r.renk)) then
      rid := r.renk_id;
    end if;
    rid := public.stk_renk_coz(rid, r.renk);
    oid_ := public.stk_olcu_coz(null, r.beden);
    vid := public.stk_varyant_coz(r.urun_id, rid, null, oid_, null);
    update public.stk_varyant set min_stok = greatest(min_stok, coalesce(r.min_stok, 0)) where id = vid;
    insert into _vm values (r.urun_id, r.renk_id, public.stk_nrm(case when public.stk_yer_tutucu_mu(r.renk) then '' else r.renk end),
                            public.stk_nrm(case when public.stk_yer_tutucu_mu(r.beden) then '' else r.beden end), vid, r.miktar);
  end loop;

  insert into public.stk_fis (id, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, aciklama, kullanici, goc, ek)
  select g.fis_id,
         coalesce(nullif(dx ->> 'tip', ''),
                  public.stk_kaynak_tur(g.kaynak)),
         g.kaynak,
         coalesce(public.stk_zaman(dx ->> 'stokTarihi'), public.stk_zaman(dx ->> 'zaman'), g.tarih),
         coalesce(dx ->> 'cariId', g.cari_id), coalesce(dx ->> 'siparisId', g.siparis_id), coalesce(dx ->> 'siparisNo', g.siparis_no),
         coalesce(dx ->> 'uretimId', g.uretim_id), null, dx ->> 'kullanici', true,
         case when dx is null then '{}'::jsonb else jsonb_build_object('defter', dx ->> 'defter', 'otomatik', dx -> 'otomatik') end
  from (
    select fis_id, min(tarih) as tarih, (array_agg(kaynak order by tarih, id))[1] as kaynak,
           max(cari_id) as cari_id, max(siparis_id) as siparis_id, max(siparis_no) as siparis_no, max(uretim_id) as uretim_id
    from _eh h
    where coalesce(h.miktar, 0) <> 0 and exists (select 1 from _vm m where m.urun_id = h.urun_id)   -- yazılacak satırı olan fiş
    group by fis_id
  ) g
  left join lateral (select x from jsonb_array_elements(defter) x where coalesce(x ->> 'id', x ->> 'fisNo') = g.fis_id limit 1) dd(dx) on true;

  select coalesce(jsonb_agg(f.id), '[]'::jsonb) into tutarsiz_iptal
  from public.stk_fis f
  where exists (select 1 from jsonb_array_elements(defter) x where coalesce(x ->> 'id', x ->> 'fisNo') = f.id and public.stk_mantik(x ->> 'iptal'));

  insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, siparis_id, siparis_no, kalem_id, cari_id,
                                  uretim_id, rezervasyon_siparis_id, fazla_gonderim, aciklama, ek)
  select h.id, h.fis_id, m.varyant_id, h.urun_id, h.miktar, h.kaynak, h.tarih, h.siparis_id, h.siparis_no, h.kalem_id, h.cari_id,
         h.uretim_id, h.rezervasyon_siparis_id, h.fazla_gonderim, h.aciklama, h.ek
  from _eh h
  join lateral (select varyant_id from _vm m
                where m.urun_id = h.urun_id
                  and m.renk_nrm is not distinct from public.stk_nrm(case when public.stk_yer_tutucu_mu(h.renk) then '' else h.renk end)
                  and m.beden_nrm is not distinct from public.stk_nrm(case when public.stk_yer_tutucu_mu(h.beden) then '' else h.beden end)
                limit 1) m on true
  where coalesce(h.miktar, 0) <> 0;
  select atlanan || coalesce(jsonb_agg(jsonb_build_object('neden', case when coalesce(h.miktar, 0) = 0 then 'miktar sıfır' else 'ürün yok' end,
                                                          'hareketId', h.id, 'fisNo', h.fis_id)), '[]'::jsonb)
    into atlanan
  from _eh h where not exists (select 1 from public.stk_hareket x where x.id = h.id);

  for d in select distinct on (coalesce(x ->> 'id', x ->> 'fisNo')) x
           from jsonb_array_elements(defter) with ordinality as e(x, sira)
           where public.stk_mantik(x ->> 'iptal')
             and coalesce(x ->> 'id', x ->> 'fisNo', '') <> ''
             and not exists (select 1 from public.stk_fis f where f.id = coalesce(x ->> 'id', x ->> 'fisNo'))
             and jsonb_array_length(public.stk_dizi(x -> 'stokHareketleri')) > 0
           order by coalesce(x ->> 'id', x ->> 'fisNo'), sira
  loop
    continue when not exists (
      select 1 from jsonb_array_elements(defter) x, jsonb_array_elements(public.stk_dizi(x -> 'stokHareketleri')) y
      where coalesce(x ->> 'id', x ->> 'fisNo') = coalesce(d ->> 'id', d ->> 'fisNo')
        and public.stk_mantik(x ->> 'iptal')
        and coalesce(y ->> 'id', '') <> '' and coalesce(public.stk_sayi(y ->> 'miktar'), 0) <> 0
        and not exists (select 1 from public.stk_hareket h where h.id = y ->> 'id')
        and exists (select 1 from public.urunler u where u.id = y ->> 'urunId'));
    insert into public.stk_fis (id, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, kullanici, iptal, iptal_zamani, goc)
    values (coalesce(d ->> 'id', d ->> 'fisNo'), coalesce(nullif(d ->> 'tip', ''), 'Manuel'), d ->> 'kaynak',
            coalesce(public.stk_zaman(d ->> 'stokTarihi'), public.stk_zaman(d ->> 'zaman'), now()),
            d ->> 'cariId', d ->> 'siparisId', d ->> 'siparisNo', d ->> 'uretimId', d ->> 'kullanici', true,
            public.stk_zaman(d ->> 'iptalZamani'), true)
    on conflict (id) do nothing;
    for s in select y from jsonb_array_elements(defter) x, jsonb_array_elements(public.stk_dizi(x -> 'stokHareketleri')) y
             where coalesce(x ->> 'id', x ->> 'fisNo') = coalesce(d ->> 'id', d ->> 'fisNo')
               and public.stk_mantik(x ->> 'iptal')
    loop
      continue when coalesce(s ->> 'id', '') = '' or coalesce(public.stk_sayi(s ->> 'miktar'), 0) = 0
                    or exists (select 1 from public.stk_hareket where id = s ->> 'id')
                    or not exists (select 1 from public.urunler where id = s ->> 'urunId');
      vid := public.stk_varyant_coz(s ->> 'urunId', null, s ->> 'renk', null, s ->> 'beden');
      insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, siparis_id, kalem_id, aciklama)
      values (s ->> 'id', coalesce(d ->> 'id', d ->> 'fisNo'), vid, s ->> 'urunId', public.stk_sayi(s ->> 'miktar'), s ->> 'kaynak',
              coalesce(public.stk_zaman(s ->> 'tarih'), now()), s ->> 'siparisId', s ->> 'kalemId', s ->> 'aciklama')
      on conflict (id) do nothing;
    end loop;
  end loop;

  if p_fark_fisi then
    create temp table _fark on commit drop as
      select m.varyant_id, m.urun_id, sum(m.eski_miktar) as eski,
             (select miktar from public.stk_stok s where s.varyant_id = m.varyant_id) as yeni
      from _vm m where m.eski_miktar is not null
      group by m.varyant_id, m.urun_id;
    if exists (select 1 from _fark where eski <> yeni) then
      insert into public.stk_fis (id, tur, kaynak, tarih, aciklama, goc)
      values (fark_fis, 'Açılış', 'Açılış', now(), 'Göç: kayıtlı stok miktarı ile hareket toplamı arasındaki fark (stok v2 geçişi)', true);
      insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, aciklama)
      select 'goc-' || f.varyant_id, fark_fis, f.varyant_id, f.urun_id, f.eski - f.yeni, 'Açılış', now(), 'Göç farkı'
      from _fark f where f.eski <> f.yeni;
      get diagnostics n_fark = row_count;
    end if;
  end if;

  select jsonb_build_object(
    'urun', (select count(distinct urun_id) from public.stk_varyant),
    'varyant', (select count(*) from public.stk_varyant),
    'fis', (select count(*) from public.stk_fis),
    'iptalFis', (select count(*) from public.stk_fis where iptal),
    'hareket', (select count(*) from public.stk_hareket),
    'eskiHareket', (select count(*) from _eh),
    'eskiVaryant', (select count(*) from _ev),
    'serbestRenk', (select coalesce(jsonb_agg(ad order by ad), '[]'::jsonb) from public.stk_renk where tur = 'serbest'),
    'serbestOlcu', (select coalesce(jsonb_agg(ad order by ad), '[]'::jsonb) from public.stk_olcu where tur = 'serbest'),
    'farkSatiri', n_fark,
    'farklar', case when p_fark_fisi then (
      select coalesce(jsonb_agg(jsonb_build_object('urun', u.ad, 'renk', s.renk_ad, 'olcu', s.olcu_ad, 'kayitli', f.eski, 'hareketToplami', f.yeni,
                                                   'fark', f.eski - f.yeni) order by u.ad, s.renk_ad, s.olcu_ad), '[]'::jsonb)
      from _fark f join public.stk_stok s on s.varyant_id = f.varyant_id left join public.urunler u on u.id = f.urun_id
      where f.eski <> f.yeni) else '[]'::jsonb end,
    'defterdeIptalAmaHareketiVar', tutarsiz_iptal,
    'atlanan', atlanan
  ) into sonuc;
  return sonuc;
end $$;

revoke all on function public.stk_goc(boolean, boolean) from public, anon, authenticated;

create or replace function public.stk_goc_karsilastir()
returns table (urun_id text, renk text, beden text, eski numeric, yeni numeric, fark numeric)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if to_regclass('public.eski_varyantlar') is not null then
    return query
      with eski as (
        select j ->> 'urun_id' as urun_id,
               public.stk_nrm(case when public.stk_yer_tutucu_mu(j ->> 'renk') then '' else j ->> 'renk' end) as renk,
               public.stk_nrm(case when public.stk_yer_tutucu_mu(j ->> 'beden') then '' else j ->> 'beden' end) as beden,
               sum(coalesce(public.stk_sayi(j ->> 'miktar'), 0)) as miktar
        from (select to_jsonb(v) as j from public.eski_varyantlar v) x
        where exists (select 1 from public.urunler u where u.id = j ->> 'urun_id')
        group by 1, 2, 3
      ), yeni as (
        select s.urun_id, public.stk_nrm(s.renk_ad) as renk, public.stk_nrm(s.olcu_ad) as beden, sum(s.miktar) as miktar
        from public.stk_stok s group by 1, 2, 3
      )
      select coalesce(e.urun_id, y.urun_id), coalesce(e.renk, y.renk), coalesce(e.beden, y.beden),
             coalesce(e.miktar, 0), coalesce(y.miktar, 0), coalesce(e.miktar, 0) - coalesce(y.miktar, 0)
      from eski e full join yeni y on y.urun_id = e.urun_id and y.renk is not distinct from e.renk and y.beden is not distinct from e.beden;
  else
    return query
      with eski as (
        select j ->> 'urun_id' as urun_id,
               public.stk_nrm(case when public.stk_yer_tutucu_mu(j ->> 'renk') then '' else j ->> 'renk' end) as renk,
               public.stk_nrm(case when public.stk_yer_tutucu_mu(j ->> 'beden') then '' else j ->> 'beden' end) as beden,
               sum(coalesce(public.stk_sayi(j ->> 'miktar'), 0)) as miktar
        from (select to_jsonb(v) as j from public.varyantlar v) x
        where exists (select 1 from public.urunler u where u.id = j ->> 'urun_id')
        group by 1, 2, 3
      ), yeni as (
        select s.urun_id, public.stk_nrm(s.renk_ad) as renk, public.stk_nrm(s.olcu_ad) as beden, sum(s.miktar) as miktar
        from public.stk_stok s group by 1, 2, 3
      )
      select coalesce(e.urun_id, y.urun_id), coalesce(e.renk, y.renk), coalesce(e.beden, y.beden),
             coalesce(e.miktar, 0), coalesce(y.miktar, 0), coalesce(e.miktar, 0) - coalesce(y.miktar, 0)
      from eski e full join yeni y on y.urun_id = e.urun_id and y.renk is not distinct from e.renk and y.beden is not distinct from e.beden;
  end if;
end $$;
revoke all on function public.stk_goc_karsilastir() from public, anon, authenticated;

create or replace function public.stk_gecis(p_fark_fisi boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  rapor jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Geçiş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if exists (select 1 from public.stk_ayar where aktif) then
    raise exception 'Stok v2 zaten etkin' using errcode = '55000';
  end if;
  if to_regclass('public.eski_varyantlar') is not null or to_regclass('public.eski_stok_hareketleri') is not null then
    raise exception 'eski_varyantlar / eski_stok_hareketleri zaten var — önceki geçiş yarım kalmış olabilir, elle bakın' using errcode = '55000';
  end if;
  rapor := public.stk_goc(p_fark_fisi, true);
  alter table public.varyantlar rename to eski_varyantlar;
  alter table public.stok_hareketleri rename to eski_stok_hareketleri;
  create view public.varyantlar with (security_invoker = true) as select * from public.stk_eski_varyantlar_g;
  create view public.stok_hareketleri with (security_invoker = true) as select * from public.stk_eski_hareketler_g;
  revoke all on public.varyantlar, public.stok_hareketleri from anon, authenticated;
  grant select on public.varyantlar, public.stok_hareketleri to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.varyantlar, public.stok_hareketleri to service_role;
  end if;
  update public.stk_ayar set aktif = true, gecis = now() where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('gecis', 'tamam', 'goc', rapor);
end $$;

create or replace function public.stk_geri_yaz(p_tablo text, p_kaynak text) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  sutunlar text;
  n int;
begin
  execute 'select string_agg(quote_ident(c.column_name), '', '' order by c.ordinal_position)'
       || ' from information_schema.columns c'
       || ' where c.table_schema = ''public'' and c.table_name = ' || quote_literal(p_tablo)
       || ' and c.column_name in (select jsonb_object_keys(j) from (select j from pg_temp.' || quote_ident(p_kaynak) || ' limit 1) x)'
    into sutunlar;
  if sutunlar is null then return 0; end if;   -- kaynak boş
  execute format('insert into public.%I (%s) select %s from pg_temp.%I k, jsonb_populate_record(null::public.%I, k.j) r',
                 p_tablo, sutunlar, (select string_agg('r.' || x, ', ') from unnest(string_to_array(sutunlar, ', ')) x), p_kaynak, p_tablo);
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.stk_geri_don() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n_v int;
  n_h int;
begin
  if auth.jwt() is not null then
    raise exception 'Geri dönüş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if not exists (select 1 from public.stk_ayar where aktif) or to_regclass('public.eski_varyantlar') is null then
    raise exception 'Stok v2 etkin değil — geri dönülecek bir şey yok' using errcode = '55000';
  end if;
  drop table if exists _gd_v, _gd_h;
  create temp table _gd_v on commit drop as select to_jsonb(x) as j from public.stk_eski_varyantlar_g x
    where exists (select 1 from public.urunler u where u.id = x.urun_id);
  create temp table _gd_h on commit drop as select to_jsonb(x) as j from public.stk_eski_hareketler_g x
    where exists (select 1 from public.urunler u where u.id = x.urun_id);
  drop view public.varyantlar;
  drop view public.stok_hareketleri;
  alter table public.eski_varyantlar rename to varyantlar;
  alter table public.eski_stok_hareketleri rename to stok_hareketleri;
  truncate public.varyantlar, public.stok_hareketleri;
  n_v := public.stk_geri_yaz('varyantlar', '_gd_v');
  n_h := public.stk_geri_yaz('stok_hareketleri', '_gd_h');
  update public.stk_ayar set aktif = false, geri_donus = now() where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('geriDonus', 'tamam', 'varyant', n_v, 'hareket', n_h);
end $$;

revoke all on function public.stk_gecis(boolean) from public, anon, authenticated;
revoke all on function public.stk_geri_don() from public, anon, authenticated;
revoke all on function public.stk_geri_yaz(text, text) from public, anon, authenticated;
select jsonb_pretty(public.stk_gecis());
