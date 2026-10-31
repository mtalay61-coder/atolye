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
