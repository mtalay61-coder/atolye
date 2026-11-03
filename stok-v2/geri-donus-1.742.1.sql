-- =====================================================================================================================
--  geri-donus-1.742.1.sql - CANLIDAKI 1.742.1 SUNUCU DAVRANISINA TAM GERI DONUS (1.743.0 ya da F1.1 kurulu veritabanindan)
-- =====================================================================================================================
--  NE YAPAR (F1-1-BAG-IZI-TASARIM.md bolum 7):
--   1) R1b tetikleyicisi ve islevi kaldirilir (fis_kalem_karsilanan_koru; 1.742.1 de yoktu). F1.1 gecmis bag korumasi
--      (fis_bag_iz_koru) ve tek bag kisiti (stk_hareket_tek_bag) kaldirilir. F2 korumalari (fis_kalem_teslim_koru,
--      fis_siparis_teslim_koru) ve yabanci anahtarlar (stk_hareket_kalem_fk, stk_hareket_gecmis_kalem_fk) kaldirilir; alt_yaz
--      1.742.1 metnine doner (20834ea editor/15, asagida BIREBIR).
--   2) 1.742.1 metinleri BIREBIR calisir: commit 20834ea, stok-v2/editor/18-fis-defteri.sql ve editor/20-gece-denetimi.sql
--      (asagidaki iki bolum o dosyalarin aynisidir; test/f0/geri-donus-1741.sh bunu git show ile karsilastirir).
--   3) R1 / F1 / F1.1 islevleri kaldirilir.
--  VERI SILINMEZ: fis_karsilanan_iz tablosu ve (F1.1 kurulduysa) stk_hareket.gecmis_siparis_id / gecmis_kalem_id /
--  bag_cozum_zamani sutunlari (ve indeksi) kalir; 1.742.1 bunlari okumaz, yazmaz. Fisler, hareketler, karsilananlar oldugu gibi
--  kalir. DIKKAT: geri donusten sonra 1.742.1 karsilanani gecmis bagi bilmez — F1.1 doneminde siparisi iptal edilmis teslimli
--  kalemler 1.742.1 hesabinda (ve 1.742.1 denetiminde) yine hayalet gorunur; deger degismez, yalniz yorum degisir.
--  SIRA (bolum 7.2): once surum.json 1.742.1 (uygulama), cihazlar baslaticidan yeniden acilir, SONRA bu dosya, sonra
--  canli-salt-okur-kontrol.sql. Kurallar (fis_kural_ac / kapat) DEGISMEZ.
--  Supabase SQL Editor: yalniz duz cift-dolar govde; bu basliktaki yorumlarda kesme isareti ve dolar isareti yoktur.
--  Tekrar calistirmak zararsiz (create or replace, if exists).
-- =====================================================================================================================

drop trigger if exists fis_kalem_karsilanan_koru on public.siparis_kalemleri;
drop function if exists public.fis_kalem_karsilanan_koru();

-- F1.1 korumasi ve kisiti (1.742.1 de yok). Sutunlar ve indeks KALIR (veri: gecmis bag izi); 1.742.1 bunlari okumaz, yazmaz.
-- Kisit kalkar: 1.742.1 davranisi birebir olsun (eski stk_yaz yolu kurallar kapaliyken satiri yeniden yazabilir).
-- F2 korumalari, kisitlari ve yabanci anahtarlari (1.742.1 de yok). Indeksler ve veri kalir.
drop trigger if exists fis_kalem_teslim_koru on public.siparis_kalemleri;
drop trigger if exists fis_siparis_teslim_koru on public.siparisler;
drop trigger if exists fis_siparis_iptal_koru on public.siparisler;
drop function if exists public.fis_siparis_iptal_koru();
alter table public.stk_hareket drop constraint if exists stk_hareket_kalem_fk;
alter table public.stk_hareket drop constraint if exists stk_hareket_gecmis_kalem_fk;
drop trigger if exists fis_bag_iz_koru on public.stk_hareket;
drop function if exists public.fis_bag_iz_koru();
alter table public.stk_hareket drop constraint if exists stk_hareket_tek_bag;

-- ---- 20834ea:stok-v2/editor/18-fis-defteri.sql (BIREBIR) — BASLANGIC ----
alter table public.stk_fis add column if not exists aile text not null default 'stok';
alter table public.stk_fis add column if not exists onek text;
alter table public.stk_fis add column if not exists istek text;
alter table public.stk_fis add column if not exists defter text;
alter table public.stk_fis add column if not exists kasa_hesap_id text;
alter table public.stk_fis add column if not exists para_birimi text;
alter table public.stk_fis add column if not exists kur numeric;
alter table public.stk_fis add column if not exists tutar numeric;
alter table public.stk_fis add column if not exists kdv numeric;
alter table public.stk_fis add column if not exists kalemler jsonb not null default '[]'::jsonb;
alter table public.stk_fis add column if not exists bagli_fis text;
create unique index if not exists stk_fis_istek on public.stk_fis (istek) where istek is not null;
create index if not exists stk_fis_cari on public.stk_fis (cari_id);

alter table public.stk_ayar add column if not exists fis_aktif boolean not null default false;
alter table public.stk_ayar add column if not exists fis_aktif_zamani timestamptz;

alter table public.car_hareket add column if not exists fis_id text references public.stk_fis(id);
alter table public.car_hareket alter column fis_id set default nullif(current_setting('fis.aktif', true), '');
create index if not exists car_hareket_fis_id on public.car_hareket (fis_id);
alter table public.kas_hareket add column if not exists fis_id text references public.stk_fis(id);
alter table public.kas_hareket alter column fis_id set default nullif(current_setting('fis.aktif', true), '');
create index if not exists kas_hareket_fis_id on public.kas_hareket (fis_id);

create table if not exists public.fis_sayac (
  onek  text not null,
  gun   text not null,
  son   int  not null default 0,
  primary key (onek, gun)
);

create or replace function public.fis_no_al(p_onek text) returns text
language plpgsql security definer set search_path = public as $$
declare
  g text := to_char(now() at time zone 'Europe/Istanbul', 'YYMMDD');
  n int;
begin
  if p_onek is null or length(p_onek) not between 2 and 4 or p_onek <> upper(p_onek) or p_onek ~ '[^A-ZÇĞİÖŞÜ]' then
    raise exception 'Fiş öneki geçersiz: % (2-4 büyük harf)', coalesce(p_onek, '(yok)') using errcode = '22023';
  end if;
  insert into public.fis_sayac as s (onek, gun, son) values (p_onek, g, 1)
  on conflict (onek, gun) do update set son = s.son + 1
  returning son into n;
  return p_onek || '-' || g || case when n < 1000 then lpad(n::text, 3, '0') else n::text end;
end $$;

create or replace function public.fis_kural_aktif() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select fis_aktif from public.stk_ayar where id = 'tekil'), false)
$$;

create or replace function public.fis_kapi_acik() returns boolean
language sql volatile as $$
  select coalesce(current_setting('fis.kapi', true), '') = 'acik'
$$;

create or replace function public.fis_satir_koru() returns trigger
language plpgsql as $$
declare
  duzen text := coalesce(current_setting('fis.duzen', true), '');
  yeni_j jsonb;
  eski_j jsonb;
begin
  if not public.fis_kural_aktif() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Hareket silinmez — fişi iptal edin (% %)', tg_table_name, old.id using errcode = '42501';
  end if;
  if not public.fis_kapi_acik() then
    raise exception 'Hareket yalnız fiş kesilerek yazılır (% %) — eski yazma yolu kapalı', tg_table_name, new.id using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.fis_id is null then
      raise exception 'Fişsiz hareket yazılamaz (% %)', tg_table_name, new.id using errcode = '23502';
    end if;
    return new;
  end if;
  yeni_j := to_jsonb(new) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'guncelleme';
  eski_j := to_jsonb(old) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'guncelleme';
  if yeni_j is distinct from eski_j then
    if duzen = 'bag'
       and (yeni_j - 'siparis_id' - 'siparis_no' - 'kalem_id' - 'rezervasyon_siparis_id' - 'ek')
         = (eski_j - 'siparis_id' - 'siparis_no' - 'kalem_id' - 'rezervasyon_siparis_id' - 'ek')
       and ((yeni_j -> 'ek') is not distinct from (eski_j -> 'ek')
         or (yeni_j -> 'ek') is not distinct from ((eski_j -> 'ek') - 'siparisId' - 'kalemId' - 'rezervasyonSiparisId')
         or (yeni_j -> 'ek') is not distinct from ((eski_j -> 'ek') - 'siparisId' - 'kalemId')
         or (yeni_j -> 'ek') is not distinct from ((eski_j -> 'ek') - 'rezervasyonSiparisId')) then
      return new;
    end if;
    if duzen = 'varyant' and tg_table_name = 'stk_hareket' and (yeni_j - 'varyant_id') = (eski_j - 'varyant_id') then
      return new;
    end if;
    raise exception 'Hareket değiştirilemez — fişi iptal edip yeniden kesin (% %)', tg_table_name, new.id using errcode = '42501';
  end if;
  if old.iptal and not new.iptal then
    raise exception 'İptal edilmiş hareket geri açılamaz — yeni fiş kesin (% %)', tg_table_name, new.id using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function public.fis_baslik_koru() returns trigger
language plpgsql as $$
begin
  if not public.fis_kural_aktif() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Fiş silinmez — iptal edin (%)', old.id using errcode = '42501';
  end if;
  if not public.fis_kapi_acik() then
    raise exception 'Fiş yalnız fis_kes ile kesilir (%) — eski yazma yolu kapalı', new.id using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'iptal_sebebi' - 'aciklama' - 'ek' - 'bagli_fis')
       is distinct from (to_jsonb(old) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'iptal_sebebi' - 'aciklama' - 'ek' - 'bagli_fis') then
      raise exception 'Kesilmiş fiş değiştirilemez — iptal edip yeniden kesin (%)', new.id using errcode = '42501';
    end if;
    if old.iptal and not new.iptal then
      raise exception 'İptal edilmiş fiş geri açılamaz — yeni fiş kesin (%)', new.id using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create or replace function public.fis_satirsiz_denetle() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f public.stk_fis;
begin
  if not public.fis_kural_aktif() then return null; end if;
  select * into f from public.stk_fis where id = new.id;
  if not found then return null; end if;
  if f.aile = 'stok' and not exists (select 1 from public.stk_hareket where fis_id = f.id) then
    raise exception 'Stok fişi % satırsız kalamaz — en az bir stok hareketi gerekli', f.id using errcode = '23514';
  end if;
  if f.aile = 'para' and not exists (select 1 from public.car_hareket where fis_id = f.id)
                     and not exists (select 1 from public.kas_hareket where fis_id = f.id) then
    raise exception 'Para fişi % satırsız kalamaz — en az bir cari ya da kasa hareketi gerekli', f.id using errcode = '23514';
  end if;
  return null;
end $$;

drop function if exists public.fis_tek_kes(jsonb, jsonb, jsonb, jsonb, text);

create or replace function public.fis_yer_tutucu(j jsonb, p_fis text, p_ana text) returns jsonb
language sql immutable as $$
  select case when j is null then null
              else replace(replace(j::text, '«ANAFIS»', coalesce(p_ana, p_fis)), '«FIS»', p_fis)::jsonb end
$$;

create or replace function public.fis_tek_kes(f jsonb, p_stok jsonb, p_cari jsonb, p_kasa jsonb, p_istek text, p_ana text default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  aile text := coalesce(nullif(f ->> 'aile', ''), '');
  fid text;
begin
  if aile not in ('stok', 'para') then
    raise exception 'Fiş ailesi stok ya da para olmalı (%)', aile using errcode = '22023';
  end if;
  if coalesce(f ->> 'tur', '') = '' then
    raise exception 'Fiş türü yok' using errcode = '22023';
  end if;
  fid := public.fis_no_al(f ->> 'onek');
  f := public.fis_yer_tutucu(f, fid, p_ana);
  p_stok := public.fis_yer_tutucu(p_stok, fid, p_ana);
  p_cari := public.fis_yer_tutucu(p_cari, fid, p_ana);
  p_kasa := public.fis_yer_tutucu(p_kasa, fid, p_ana);
  perform set_config('fis.kapi', 'acik', true);
  perform set_config('fis.aktif', fid, true);
  insert into public.stk_fis (id, aile, onek, istek, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, aciklama,
                              kullanici, olusturan, ek, defter, kasa_hesap_id, para_birimi, kur, tutar, kdv, kalemler)
  values (fid, aile, f ->> 'onek', p_istek, f ->> 'tur', f ->> 'kaynak', coalesce(public.stk_zaman(f ->> 'tarih'), now()),
          nullif(f ->> 'cariId', ''), nullif(f ->> 'siparisId', ''), nullif(f ->> 'siparisNo', ''), nullif(f ->> 'uretimId', ''),
          f ->> 'aciklama', f ->> 'kullanici', lower(auth.jwt() ->> 'email'),
          case when jsonb_typeof(f -> 'ek') = 'object' then f -> 'ek' else '{}'::jsonb end,
          coalesce(nullif(f ->> 'defter', ''), 'Genel'), nullif(f ->> 'kasaHesapId', ''), nullif(f ->> 'paraBirimi', ''),
          public.stk_sayi(f ->> 'kur'), public.stk_sayi(f ->> 'tutar'), public.stk_sayi(f ->> 'kdv'),
          case when jsonb_typeof(f -> 'kalemler') = 'array' then f -> 'kalemler' else '[]'::jsonb end);

  if jsonb_array_length(public.stk_dizi(p_stok -> 'satirlar')) > 0 or jsonb_array_length(public.stk_dizi(p_stok -> 'varyantAc')) > 0 then
    perform public.stk_yaz(jsonb_build_object(
      'varyantAc', public.stk_dizi(p_stok -> 'varyantAc'),
      'satirlar', (select coalesce(jsonb_agg(x || jsonb_build_object('fisId', fid)), '[]'::jsonb)
                   from jsonb_array_elements(public.stk_dizi(p_stok -> 'satirlar')) x)));
  end if;
  if jsonb_array_length(public.stk_dizi(p_cari -> 'satirlar')) > 0 then
    perform public.car_yaz(jsonb_build_object(
      'satirlar', (select coalesce(jsonb_agg(x || jsonb_build_object('fis_no', fid)), '[]'::jsonb)
                   from jsonb_array_elements(public.stk_dizi(p_cari -> 'satirlar')) x)));
  end if;
  if jsonb_array_length(public.stk_dizi(p_kasa -> 'hareketler')) > 0 or jsonb_array_length(public.stk_dizi(p_kasa -> 'cekler')) > 0 then
    perform public.kas_yaz(jsonb_build_object(
      'hareketler', (select coalesce(jsonb_agg(x || jsonb_build_object('veri', coalesce(x -> 'veri', '{}'::jsonb) || jsonb_build_object('fisNo', fid))), '[]'::jsonb)
                     from jsonb_array_elements(public.stk_dizi(p_kasa -> 'hareketler')) x),
      'cekler', public.stk_dizi(p_kasa -> 'cekler')));
  end if;

  if aile = 'stok' and not exists (select 1 from public.stk_hareket where fis_id = fid) then
    raise exception 'Stok fişinde stok satırı yok (%)', f ->> 'tur' using errcode = '23514';
  end if;
  if aile = 'para' and not exists (select 1 from public.car_hareket where fis_id = fid)
                   and not exists (select 1 from public.kas_hareket where fis_id = fid) then
    raise exception 'Para fişinde cari ya da kasa satırı yok (%)', f ->> 'tur' using errcode = '23514';
  end if;
  perform set_config('fis.aktif', '', true);
  return fid;
end $$;

create or replace function public.fis_kes(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_istek text := nullif(btrim(coalesce(p ->> 'istek', '')), '');
  mevcut public.stk_fis;
  fid text;
  bid text;
begin
  if v_istek is null then
    raise exception 'İstek kimliği yok (yeniden gönderimde çift fiş olmasın diye zorunlu)' using errcode = '22023';
  end if;
  if jsonb_typeof(p -> 'fis') <> 'object' then
    raise exception 'Fiş bilgisi yok' using errcode = '22023';
  end if;
  select * into mevcut from public.stk_fis f where f.istek = v_istek;
  if found then
    return jsonb_build_object('fisNo', mevcut.id, 'bagliFisNo', mevcut.bagli_fis, 'zatenVar', true);
  end if;

  fid := public.fis_tek_kes(p -> 'fis', p -> 'stok', p -> 'cari', p -> 'kasa', v_istek);
  if jsonb_typeof(p -> 'bagli') = 'object' then
    bid := public.fis_tek_kes(p -> 'bagli' -> 'fis', p -> 'bagli' -> 'stok', p -> 'bagli' -> 'cari', p -> 'bagli' -> 'kasa', v_istek || ':bagli', fid);
    update public.stk_fis set bagli_fis = bid where id = fid;
    update public.stk_fis set bagli_fis = fid where id = bid;
  end if;
  if jsonb_typeof(p -> 'alt') = 'object' then
    perform public.alt_yaz(p -> 'alt');
  end if;
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', fid, 'bagliFisNo', bid, 'zatenVar', false);
end $$;

create or replace function public.fis_iptal(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  no text := nullif(btrim(coalesce(p ->> 'no', '')), '');
  eposta text := lower(auth.jwt() ->> 'email');
  f public.stk_fis;
  hedefler text[];
  h text;
  n int := 0;
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'silme');
  select * into f from public.stk_fis where id = no for update;
  if not found then
    raise exception 'Fiş bulunamadı: %', coalesce(no, '(yok)') using errcode = 'P0002';
  end if;
  hedefler := array[f.id] || case when f.bagli_fis is not null then array[f.bagli_fis] else '{}'::text[] end;
  perform set_config('fis.kapi', 'acik', true);
  foreach h in array hedefler loop
    update public.stk_fis set iptal = true, iptal_zamani = now(), iptal_eden = eposta, iptal_sebebi = p ->> 'sebep'
     where id = h and not iptal;
    get diagnostics n = row_count;
    update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta where fis_id = h and not iptal;
    update public.car_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now() where fis_id = h and not iptal;
    update public.kas_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now() where fis_id = h and not iptal;
  end loop;
  if jsonb_typeof(p -> 'alt') = 'object' then
    perform public.alt_yaz(p -> 'alt');
  end if;
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', f.id, 'bagliFisNo', f.bagli_fis, 'zatenIptal', f.iptal);
end $$;

create or replace function public.fis_bilgi(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  no text := nullif(btrim(coalesce(p ->> 'no', '')), '');
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'kaydetme');
  if not exists (select 1 from public.stk_fis where id = no) then
    raise exception 'Fiş bulunamadı: %', coalesce(no, '(yok)') using errcode = 'P0002';
  end if;
  perform set_config('fis.kapi', 'acik', true);
  update public.stk_fis
     set aciklama = case when p ? 'aciklama' then p ->> 'aciklama' else aciklama end,
         ek = ek || case when jsonb_typeof(p -> 'ek') = 'object' then p -> 'ek' else '{}'::jsonb end
   where id = no;
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', no);
end $$;

create or replace function public.fis_bag_coz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  sid text := nullif(btrim(coalesce(p ->> 'siparisId', '')), '');
  sno text := nullif(btrim(coalesce(p ->> 'siparisNo', '')), '');
  ino text;
  n_stok int := 0;
  n_cari int := 0;
  n_zincir int := 0;
  n int;
begin
  perform public.stk_yetki(array['siparis', 'stok', 'cari'], 'kaydetme');
  if sid is null then raise exception 'Sipariş kimliği yok' using errcode = '22023'; end if;
  ino := case when sno is null then null else sno || ' (iptal)' end;
  perform set_config('fis.kapi', 'acik', true);
  perform set_config('fis.duzen', 'bag', true);
  update public.stk_hareket set siparis_id = null, kalem_id = null, siparis_no = ino
   where not iptal and (siparis_id = sid or (siparis_id is null and sno is not null and siparis_no = sno));
  get diagnostics n_stok = row_count;
  update public.stk_hareket set rezervasyon_siparis_id = null where not iptal and rezervasyon_siparis_id = sid;
  get diagnostics n_zincir = row_count;
  update public.car_hareket set siparis_no = ino, ek = ek - 'siparisId' - 'kalemId', guncelleme = now()
   where not iptal and ((ek ->> 'siparisId') = sid or ((ek ->> 'siparisId') is null and sno is not null and siparis_no = sno));
  get diagnostics n_cari = row_count;
  update public.car_hareket set ek = ek - 'rezervasyonSiparisId', guncelleme = now()
   where not iptal and (ek ->> 'rezervasyonSiparisId') = sid;
  get diagnostics n = row_count; n_zincir := n_zincir + n;
  update public.stk_fis set ek = ek || jsonb_build_object('siparisIptal', jsonb_build_object('no', sno, 'zaman', now()))
   where siparis_id = sid or (siparis_id is null and sno is not null and siparis_no = sno);
  perform set_config('fis.duzen', '', true);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('stok', n_stok, 'cari', n_cari, 'zincir', n_zincir);
end $$;

create or replace function public.stk_renk_tasi(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e jsonb;
  v record;
  hedef_renk text;
  hedef_v text;
  n_varyant int := 0;
  n_tasinan int := 0;
  n int;
begin
  perform public.stk_yetki(array['stok', 'tanimlar'], 'kaydetme');
  perform set_config('fis.kapi', 'acik', true);
  perform set_config('fis.duzen', 'varyant', true);
  for e in select * from jsonb_array_elements(public.stk_dizi(p -> 'eslesmeler')) loop
    continue when coalesce(e ->> 'urunId', '') = '' or coalesce(e ->> 'yeni', '') = ''
                  or public.stk_nrm(e ->> 'eski') = public.stk_nrm(e ->> 'yeni');
    hedef_renk := public.stk_renk_coz(null, e ->> 'yeni');
    for v in select sv.* from public.stk_varyant sv join public.stk_renk r on r.id = sv.renk_id
              where sv.urun_id = e ->> 'urunId' and public.stk_nrm(r.ad) = public.stk_nrm(e ->> 'eski') and sv.renk_id <> hedef_renk loop
      select id into hedef_v from public.stk_varyant
       where urun_id = v.urun_id and renk_id = hedef_renk and coalesce(olcu_id, '') = coalesce(v.olcu_id, '');
      if hedef_v is null then
        update public.stk_varyant set renk_id = hedef_renk where id = v.id;
      else
        update public.stk_hareket set varyant_id = hedef_v where varyant_id = v.id;
        get diagnostics n = row_count; n_tasinan := n_tasinan + n;
        update public.stk_varyant set min_stok = greatest(min_stok, v.min_stok), aktif = aktif or v.aktif where id = hedef_v;
        delete from public.stk_varyant where id = v.id;
      end if;
      n_varyant := n_varyant + 1;
    end loop;
  end loop;
  perform set_config('fis.duzen', '', true);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('varyant', n_varyant, 'tasinanHareket', n_tasinan);
end $$;

create or replace view public.fis_listesi with (security_invoker = true) as
select f.id, f.olusturma, f.iptal,
  jsonb_build_object(
    'id', f.id, 'fisNo', f.id, 'aile', f.aile, 'tip', f.tur, 'kaynak', f.kaynak, 'onek', f.onek,
    'cariId', f.cari_id, 'siparisId', f.siparis_id, 'siparisNo', f.siparis_no, 'uretimId', f.uretim_id,
    'zaman', f.olusturma, 'tarih', f.tarih, 'defter', f.defter, 'kullanici', f.kullanici, 'olusturan', f.olusturan,
    'kasaHesapId', f.kasa_hesap_id, 'paraBirimi', f.para_birimi, 'kur', f.kur, 'tutar', f.tutar, 'kdv', f.kdv,
    'aciklama', f.aciklama, 'ek', f.ek, 'kalemler', f.kalemler, 'bagliFis', f.bagli_fis,
    'iptal', f.iptal, 'iptalZamani', f.iptal_zamani, 'iptalEden', f.iptal_eden, 'iptalSebebi', f.iptal_sebebi,
    'stokHareketleri', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'urunId', h.urun_id, 'varyantId', h.varyant_id,
        'renk', coalesce(r.ad, 'Standart'), 'beden', coalesce(o.ad, 'Standart'),
        'miktar', h.miktar, 'kaynak', h.kaynak, 'tarih', h.tarih, 'siparisId', h.siparis_id, 'kalemId', h.kalem_id,
        'cariId', h.cari_id, 'uretimId', h.uretim_id, 'iptal', h.iptal, 'ek', h.ek) order by h.id)
      from public.stk_hareket h
      join public.stk_varyant v on v.id = h.varyant_id
      left join public.stk_renk r on r.id = v.renk_id
      left join public.stk_olcu o on o.id = v.olcu_id
      where h.fis_id = f.id), '[]'::jsonb),
    'cariHareketleri', coalesce((select jsonb_agg(to_jsonb(c) - 'olusturan' - 'goc' order by c.id)
      from public.car_hareket c where c.fis_id = f.id), '[]'::jsonb),
    'kasaHareketleri', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'hesapId', k.hesap_id, 'iptal', k.iptal) || k.veri order by k.id)
      from public.kas_hareket k where k.fis_id = f.id), '[]'::jsonb)
  ) as veri
from public.stk_fis f;

create or replace function public.fis_kurulum_tamamla() returns text
language plpgsql security definer set search_path = public as $$
declare
  t text;
begin
  drop trigger if exists fis_satir_koru on public.stk_hareket;
  create trigger fis_satir_koru before insert or update or delete on public.stk_hareket for each row execute function public.fis_satir_koru();
  drop trigger if exists fis_satir_koru on public.car_hareket;
  create trigger fis_satir_koru before insert or update or delete on public.car_hareket for each row execute function public.fis_satir_koru();
  drop trigger if exists fis_satir_koru on public.kas_hareket;
  create trigger fis_satir_koru before insert or update or delete on public.kas_hareket for each row execute function public.fis_satir_koru();
  drop trigger if exists fis_baslik_koru on public.stk_fis;
  create trigger fis_baslik_koru before insert or update or delete on public.stk_fis for each row execute function public.fis_baslik_koru();
  drop trigger if exists fis_satirsiz_denetle on public.stk_fis;
  create constraint trigger fis_satirsiz_denetle after insert on public.stk_fis deferrable initially deferred
    for each row execute function public.fis_satirsiz_denetle();

  alter table public.fis_sayac enable row level security;
  revoke all on public.fis_sayac from anon, authenticated;
  revoke all on function public.fis_no_al(text) from public, anon, authenticated;
  revoke all on function public.fis_tek_kes(jsonb, jsonb, jsonb, jsonb, text, text) from public, anon, authenticated;
  foreach t in array array['fis_kes(jsonb)', 'fis_iptal(jsonb)', 'fis_bilgi(jsonb)', 'fis_bag_coz(jsonb)', 'stk_renk_tasi(jsonb)'] loop
    execute 'revoke all on function public.' || t || ' from public, anon';
    execute 'grant execute on function public.' || t || ' to authenticated';
  end loop;
  revoke all on public.fis_listesi from anon, authenticated;
  grant select on public.fis_listesi to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.fis_listesi to service_role;
  end if;
  return 'fiş defteri kuruldu (kurallar KAPALI — bütün işlemler fiş defterine taşınana kadar AÇMAYIN; açma adımı ayrıca verilecek)';
end $$;
select public.fis_kurulum_tamamla();
drop function public.fis_kurulum_tamamla();

create or replace function public.fis_kural_ac() returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is not null then
    raise exception 'Yalnız Supabase SQL Editor''den' using errcode = '42501';
  end if;
  update public.stk_ayar set fis_aktif = true, fis_aktif_zamani = now() where id = 'tekil';
  return 'fiş defteri kuralları AÇIK: hareket yalnız fiş kesilerek yazılır';
end $$;
create or replace function public.fis_kural_kapat() returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is not null then
    raise exception 'Yalnız Supabase SQL Editor''den' using errcode = '42501';
  end if;
  update public.stk_ayar set fis_aktif = false where id = 'tekil';
  return 'fiş defteri kuralları KAPALI';
end $$;
revoke all on function public.fis_kural_ac() from public, anon, authenticated;
revoke all on function public.fis_kural_kapat() from public, anon, authenticated;
-- ---- 20834ea:stok-v2/editor/18-fis-defteri.sql — SON ----

-- ---- 20834ea:stok-v2/editor/20-gece-denetimi.sql (BIREBIR) — BASLANGIC ----
create or replace function public.fis_gece_denetimi(p_gun text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  gun date := coalesce(nullif(p_gun, '')::date, (now() at time zone 'Europe/Istanbul')::date);
  kural_zamani timestamptz := (select fis_aktif_zamani from public.stk_ayar where id = 'tekil' and fis_aktif);
  fissiz_cari jsonb;
  fissiz_kasa jsonb;
  satirsiz jsonb;
  iptal_tutarsiz jsonb;
  tutar_farki jsonb;
  gunluk jsonb;
begin
  select jsonb_build_object('sayi', count(*),
           'kuraldanSonra', count(*) filter (where kural_zamani is not null and c.olusturma >= kural_zamani),
           'ornek', coalesce((select jsonb_agg(x) from (
              select jsonb_build_object('id', c2.id, 'cariId', c2.cari_id, 'tarih', c2.tarih, 'tutar', c2.tutar, 'fisNo', c2.fis_no) x
              from public.car_hareket c2 where c2.fis_id is null and not c2.iptal order by c2.olusturma desc limit 20) s), '[]'::jsonb))
    into fissiz_cari
    from public.car_hareket c where c.fis_id is null and not c.iptal;

  select jsonb_build_object('sayi', count(*),
           'kuraldanSonra', count(*) filter (where kural_zamani is not null and k.olusturma >= kural_zamani),
           'ornek', coalesce((select jsonb_agg(x) from (
              select jsonb_build_object('id', k2.id, 'hesapId', k2.hesap_id, 'tarih', k2.veri ->> 'tarih', 'tutar', k2.veri -> 'tutar', 'fisNo', k2.veri ->> 'fisNo') x
              from public.kas_hareket k2 where k2.fis_id is null and not k2.iptal order by k2.olusturma desc limit 20) s), '[]'::jsonb))
    into fissiz_kasa
    from public.kas_hareket k where k.fis_id is null and not k.iptal;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into satirsiz from (
    select jsonb_build_object('fisNo', f.id, 'aile', f.aile, 'tur', f.tur) x
    from public.stk_fis f
    where not f.iptal and not f.goc
      and ((f.aile = 'stok' and not exists (select 1 from public.stk_hareket h where h.fis_id = f.id and not h.iptal))
        or (f.aile = 'para' and not exists (select 1 from public.car_hareket c where c.fis_id = f.id and not c.iptal)
                            and not exists (select 1 from public.kas_hareket k where k.fis_id = f.id and not k.iptal)))
    order by f.olusturma desc limit 20) s;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into iptal_tutarsiz from (
    select jsonb_build_object('fisNo', f.id, 'tur', f.tur,
             'stok', (select count(*) from public.stk_hareket h where h.fis_id = f.id and not h.iptal),
             'cari', (select count(*) from public.car_hareket c where c.fis_id = f.id and not c.iptal),
             'kasa', (select count(*) from public.kas_hareket k where k.fis_id = f.id and not k.iptal)) x
    from public.stk_fis f
    where f.iptal
      and (exists (select 1 from public.stk_hareket h where h.fis_id = f.id and not h.iptal)
        or exists (select 1 from public.car_hareket c where c.fis_id = f.id and not c.iptal)
        or exists (select 1 from public.kas_hareket k where k.fis_id = f.id and not k.iptal))
    order by f.olusturma desc limit 20) s;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into tutar_farki from (
    select jsonb_build_object('fisNo', f.id, 'tur', f.tur, 'baslik', f.tutar, 'satirlar', t.toplam) x
    from public.stk_fis f
    join lateral (select sum(c.tutar) as toplam, count(*) as sayi from public.car_hareket c
                  where c.fis_id = f.id and not c.iptal and coalesce(c.defter, 'Genel') <> 'Resmi') t on true
    where not f.iptal and f.tutar is not null and t.sayi > 0 and abs(f.tutar - t.toplam) > 0.01
    order by f.olusturma desc limit 20) s;

  select jsonb_build_object(
      'tarih', to_char(gun, 'YYYY-MM-DD'),
      'kesilen', jsonb_build_object(
        'stok', (select count(*) from public.stk_fis f where f.aile = 'stok' and not f.goc and (f.olusturma at time zone 'Europe/Istanbul')::date = gun),
        'para', (select count(*) from public.stk_fis f where f.aile = 'para' and (f.olusturma at time zone 'Europe/Istanbul')::date = gun)),
      'iptal', coalesce((select jsonb_agg(x) from (
          select jsonb_build_object('fisNo', f.id, 'tur', f.tur, 'sebep', f.iptal_sebebi, 'eden', f.iptal_eden) x
          from public.stk_fis f where f.iptal and (f.iptal_zamani at time zone 'Europe/Istanbul')::date = gun
          order by f.iptal_zamani) s), '[]'::jsonb))
    into gunluk;

  return jsonb_build_object(
    'fissizCari', fissiz_cari, 'fissizKasa', fissiz_kasa, 'satirsizFis', satirsiz, 'iptalTutarsiz', iptal_tutarsiz,
    'tutarFarki', tutar_farki, 'gun', gunluk, 'kuralAcik', kural_zamani is not null,
    'temiz', (fissiz_cari ->> 'kuraldanSonra')::int = 0 and (fissiz_kasa ->> 'kuraldanSonra')::int = 0
             and jsonb_array_length(satirsiz) = 0 and jsonb_array_length(iptal_tutarsiz) = 0 and jsonb_array_length(tutar_farki) = 0);
end $$;

revoke all on function public.fis_gece_denetimi(text) from public, anon;
grant execute on function public.fis_gece_denetimi(text) to authenticated;
grant execute on function public.fis_gece_denetimi(text) to service_role;
-- ---- 20834ea:stok-v2/editor/20-gece-denetimi.sql — SON ----

-- ---- 20834ea:stok-v2/editor/15-duzeltme.sql alt_yaz (BIREBIR) — BASLANGIC ----
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
      select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position),
             string_agg(case when c.column_name <> 'id' then quote_ident(c.column_name) || ' = excluded.' || quote_ident(c.column_name) end, ', ')
        into sutunlar, atamalar
      from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = t
        and c.column_name in (select distinct jsonb_object_keys(x) from jsonb_array_elements(satirlar) x where jsonb_typeof(x) = 'object');
      execute format(
        'insert into public.%I as h (%s) select %s from (select distinct on (r.id) r.* from jsonb_array_elements(%L::jsonb) with ordinality as e(x, n), '
        || 'jsonb_populate_record(null::public.%I, e.x) r order by r.id, e.n desc) s '
        || 'on conflict (id) do ' || case when atamalar is null then 'nothing' else 'update set ' || atamalar end,
        t, sutunlar, sutunlar, satirlar::text, t);
      get diagnostics n_yaz = row_count;
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
-- ---- 20834ea:stok-v2/editor/15-duzeltme.sql alt_yaz — SON ----

-- R1 / F1 / F1.1 / F2 islevleri (1.742.1 de yok). 1.742.1 metinleri yukarida bunlari artik cagirmiyor.
drop function if exists public.fis_kalem_teslim_koru();
drop function if exists public.fis_siparis_teslim_koru();
drop function if exists public.fis_kalem_hareket_var(text);
drop function if exists public.fis_kalem_kilitle(text[]);
drop function if exists public.fis_kalem_karsilanan_yenile(text[], jsonb, text, text);
drop function if exists public.fis_kalem_durumlari(text[]);
drop function if exists public.fis_kalem_hesap(text);
drop function if exists public.fis_kalem_idleri(jsonb);
drop function if exists public.fis_alt_karsilanansiz(jsonb);
drop function if exists public.fis_kalem_artis(jsonb);
drop function if exists public.fis_alt_artissiz(jsonb);

drop function if exists public.fis_satis_teslim_koru(jsonb);
