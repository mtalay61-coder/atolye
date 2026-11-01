-- =====================================================================================================================
--  geri-donus-F1.sql — F1'İ (v1.743.0, karşılananın tek yazarı) GERİ ALIR: 1.742.3 sunucu davranışına döner.
-- =====================================================================================================================
--  NE YAPAR: fis_kes, fis_iptal ve fis_gece_denetimi 1.742.3 (commit 2a81e1f) hâline döner (metinler o commit'ten BİREBİR
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
