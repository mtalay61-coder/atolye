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

create or replace function public.car_geri_don() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n int;
  atlanan jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Geri dönüş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if not exists (select 1 from public.stk_ayar where cari_aktif) or to_regclass('public.eski_cari_hareketleri') is null then
    raise exception 'Cari v2 etkin değil — geri dönülecek bir şey yok' using errcode = '55000';
  end if;
  drop table if exists _gd_c;
  create temp table _gd_c on commit drop as select to_jsonb(x) as j from public.car_eski_hareketler_g x;
  select coalesce(jsonb_agg(j ->> 'id'), '[]'::jsonb) into atlanan from _gd_c
   where not exists (select 1 from public.cariler c where c.id::text = _gd_c.j ->> 'cari_id');
  delete from _gd_c where not exists (select 1 from public.cariler c where c.id::text = _gd_c.j ->> 'cari_id');
  drop view public.cari_hareketleri;
  alter table public.eski_cari_hareketleri rename to cari_hareketleri;
  truncate public.cari_hareketleri;
  n := public.stk_geri_yaz('cari_hareketleri', '_gd_c');
  update public.stk_ayar set cari_aktif = false, cari_geri_donus = now() where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('geriDonus', 'tamam', 'hareket', n, 'carisiYokAtlanan', atlanan);
end $$;

revoke all on function public.car_geri_don() from public, anon, authenticated;

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

revoke all on function public.fis_yaz(jsonb) from public, anon;

grant execute on function public.fis_yaz(jsonb) to authenticated;

revoke all on function public.degisiklik_izle_kur(text) from public, anon, authenticated;

create or replace function public.yonetici_mi()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  eposta text;
  k jsonb;
  aday text;
begin
  eposta := lower(coalesce(auth.jwt() ->> 'email', ''));
  if eposta = '' then return false; end if;
  for k in
    select jsonb_array_elements(coalesce(veri -> 'kullanicilar', '[]'::jsonb)) from public.tanimlar where id = 'tekil'
  loop
    if coalesce(k ->> 'rol', '') <> 'Yönetici' then continue; end if;
    aday := lower(coalesce(k ->> 'eposta', ''));
    if aday = '' then
      aday := regexp_replace(lower(translate(coalesce(k ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local';
    end if;
    if aday = eposta then return true; end if;
  end loop;
  return false;
end $$;

create or replace function public.tanimlar_kullanici_koruma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.jwt() is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then
    if not public.yonetici_mi() then
      raise exception 'Tanımları yalnız Yönetici silebilir' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if exists (select 1 from public.tanimlar t where t.id = new.id) then return new; end if;
    if not exists (select 1 from public.tanimlar) then return new; end if;
    if not public.yonetici_mi() then
      raise exception 'Tanımlar satırını yalnız Yönetici ekleyebilir' using errcode = '42501';
    end if;
    return new;
  end if;
  if ((coalesce(new.veri -> 'kullanicilar', '[]'::jsonb)) is distinct from (coalesce(old.veri -> 'kullanicilar', '[]'::jsonb))
      or (new.veri -> 'girisAktifMi') is distinct from (old.veri -> 'girisAktifMi'))
     and not public.yonetici_mi() then
    raise exception 'Kullanıcı listesini ve giriş ayarını yalnız Yönetici değiştirebilir' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists tanimlar_kullanici_koruma on public.tanimlar;
create trigger tanimlar_kullanici_koruma
  before insert or update or delete on public.tanimlar
  for each row execute function public.tanimlar_kullanici_koruma();

create or replace function public.gunluk_silme_koruma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.jwt() is null then return old; end if;
  if not public.yonetici_mi() then
    raise exception 'Günlük kayıtlarını yalnız Yönetici silebilir' using errcode = '42501';
  end if;
  return old;
end $$;

drop trigger if exists gunluk_silme_koruma on public.gunluk;
create trigger gunluk_silme_koruma
  before delete on public.gunluk
  for each row execute function public.gunluk_silme_koruma();
