-- =====================================================================================================================
--  geri-donus-F1.sql — F1'İ (v1.743.0, karşılananın tek yazarı) GERİ ALIR: 1.742.3 sunucu davranışına döner.
-- =====================================================================================================================
--  NE YAPAR: fis_kes, fis_iptal, fis_gece_denetimi (ve F1.1 kuruluysa fis_bag_coz, fis_satir_koru) 1.742.3 (commit 2a81e1f) hâline döner (metinler o commit'ten BİREBİR
--  alındı); F1'in eklediği işlevler kaldırılır. fis_karsilanan_iz tablosu SİLİNMEZ (iz kaydı veri; boş kalır, zararsız) —
--  istenirse ayrıca elle düşürülür. Veriye dokunmaz: F1 döneminde kesilen fişler ve hesaplanmış karşılananlar olduğu gibi kalır
--  (1.742.3 bunları okur). Tetikleyici / kural değişmez (fis_kalem_karsilanan_koru 1.742.3'te de vardı).
--  NE ZAMAN: F1 canlıda sorun çıkarırsa (VERI-TUTARLILIGI-F0.md § 6 geri dönüş tetikleyicileri), uygulama surum.json ile önceki
--  sürüme döndürüldükten SONRA. Yerelde sınandı: kur → geri al → F0 durumu 1.742.3 ile aynı → yeniden kur → F1 durumu.
--  Supabase SQL Editor kuralı: yalnız düz çift-dolar gövde. Tekrar çalıştırmak zararsız.
-- =====================================================================================================================

begin;

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
  -- AYNI İSTEK EŞZAMANLI (v1.742.2): iki kopya aynı anda gelince ikincisi benzersizlik hatası (23505) alıyordu — kayıt doğru ama
  -- kullanıcı "kaydedilemedi" görürdü. İsteğe işlem kilidi: ikincisi birincinin bitmesini bekler, sonra ilk numarayı alır.
  perform pg_advisory_xact_lock(hashtext('fis_kes:' || v_istek));
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
    perform set_config('fis.kalem', 'acik', true);   -- karşılanan yalnız fiş işleminde değişir (fis_kalem_karsilanan_koru)
    perform public.alt_yaz(public.fis_alt_artissiz(p -> 'alt'));
    perform public.fis_kalem_artis(p -> 'alt');
    perform set_config('fis.kalem', '', true);
  end if;
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', fid, 'bagliFisNo', bid, 'zatenVar', false);
end $$;

-- FİŞ İPTAL — fiş ve bütün satırları (bağlı makbuzla birlikte) iptal; silme yok. Tekrar çağrı zararsız. (1.742.3)
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
  -- Karşılanan değişimi (v1.742.2) yalnız fiş bu çağrıda iptal edildiyse: zaten iptal edilmiş fişe gelen tekrar (yanıtı kaybolmuş
  -- istek) karşılananı ikinci kez düşürmesin.
  if jsonb_typeof(p -> 'alt') = 'object' then
    perform set_config('fis.kalem', 'acik', true);
    perform public.alt_yaz(public.fis_alt_artissiz(p -> 'alt'));
    if not f.iptal then perform public.fis_kalem_artis(p -> 'alt'); end if;
    perform set_config('fis.kalem', '', true);
  end if;
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', f.id, 'bagliFisNo', f.bagli_fis, 'zatenIptal', f.iptal);
end $$;

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

-- F1.1 (2 Kasım) DA GERİ ALINIR: fis_bag_coz ve fis_satir_koru 1.742.3 hâline (2a81e1f'den BİREBİR), geçmiş bağ koruması ve tek
-- bağ kısıtı kalkar. Bu yapılmazsa F1.1'in fis_bag_coz'u aşağıda düşürülen fis_kalem_kilitle'yi çağırır ve SİPARİŞ İPTALİ BOZULUR
-- (f0/geri-donus.sh F1.1 ile ölçtü). Geçmiş bağ sütunları (veri) kalır; 1.742.3 bunları okumaz, yazmaz.
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
  -- Güncelleme: yalnız iptal alanları değişebilir (ve kayıt zamanı).
  -- DAR DÜZEN KİPLERİ (v1.742.0, kullanıcı kararı 31 Ekim): iki sunucu işlemi satırın YALNIZ belirli alanlarına dokunur; kip
  -- (`fis.duzen`) yalnız o işlemlerin içinde açılır, işlem sonunda kapanır. Miktar, tutar, ürün, tarih hiçbir kipte değişmez.
  -- (Fiş defterinden önceki eski fişler için ayrı yol YOK — kullanıcı: veriler kurallar açılmadan sıfırlanır.)
  --   bag     (fis_bag_coz): sipariş iptalinde sipariş bağı çözülür — siparis_id / kalem_id / rezervasyon_siparis_id boşalır,
  --           siparis_no "(iptal)" eki alır; cari satırında `ek`ten yalnız siparisId / kalemId / rezervasyonSiparisId düşer.
  --   varyant (stk_renk_tasi): renk kodlamada hedef varyant zaten varsa hareket o varyanta taşınır (renk adı değişir, stok aynı).
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

-- F2 (2 Kasım) DA GERİ ALINIR: koruma tetikleyicileri, yabancı anahtarlar; alt_yaz 1.742.3 metnine (alt-v2.sql 20834ea'dan beri
-- değişmedi; editor/15 Editor kopyası BİREBİR).
drop trigger if exists fis_kalem_teslim_koru on public.siparis_kalemleri;
drop trigger if exists fis_siparis_teslim_koru on public.siparisler;
drop function if exists public.fis_kalem_teslim_koru();
drop function if exists public.fis_siparis_teslim_koru();
drop function if exists public.fis_kalem_hareket_var(text);
alter table public.stk_hareket drop constraint if exists stk_hareket_kalem_fk;
alter table public.stk_hareket drop constraint if exists stk_hareket_gecmis_kalem_fk;
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

drop trigger if exists fis_bag_iz_koru on public.stk_hareket;
drop function if exists public.fis_bag_iz_koru();
alter table public.stk_hareket drop constraint if exists stk_hareket_tek_bag;

drop function if exists public.fis_kalem_kilitle(text[]);
drop function if exists public.fis_kalem_karsilanan_yenile(text[], jsonb, text, text);
drop function if exists public.fis_kalem_durumlari(text[]);
drop function if exists public.fis_kalem_hesap(text);
drop function if exists public.fis_kalem_idleri(jsonb);
drop function if exists public.fis_alt_karsilanansiz(jsonb);

revoke all on function public.fis_gece_denetimi(text) from public, anon;
grant execute on function public.fis_gece_denetimi(text) to authenticated;
grant execute on function public.fis_gece_denetimi(text) to service_role;

commit;
