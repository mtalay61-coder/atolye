-- CARİ v2 — car_yaz, fis_yaz (stok + cari tek işlem), göç, geçiş, geri dönüş. kos.sh çalıştırır (stok-v2 kurulu, cari-v2 kurulu).
\set ON_ERROR_STOP 1
\pset pager off
create or replace function pg_temp.kullanici(eposta text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('email', eposta, 'role', 'authenticated')::text, false)
$$;
create or replace function pg_temp.editor() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;
create or replace function pg_temp.bakiye(p_cari text) returns numeric language sql security definer as $$
  select coalesce(sum(case when yon = 'Alacak' then tutar else -tutar end), 0) from public.car_hareket where cari_id = p_cari and not iptal
$$;
select pg_temp.editor() \gset

-- 1) GÖÇ
do $$
declare r jsonb := public.car_goc();
begin
  assert (r ->> 'eskiHareket')::int = 4 and (r ->> 'hareket')::int = 3, 'göç sayıları ' || r::text;
  assert jsonb_array_length(r -> 'atlanan') = 1, 'carisiz satır raporlanmadı';
  assert r -> 'tutarFarki' = '[]'::jsonb, 'tutar farkı ' || (r ->> 'tutarFarki');
  assert (select tarih || '|' || zaman from public.car_hareket where id = 'ch1') = '2026-10-01|2026-10-01T09:00:00+00:00', 'tarih biçimi';
  assert (select ek ->> 'birim' from public.car_hareket where id = 'ch1') = 'm', 'ek taşınmadı';
  raise notice 'TAMAM: cari göç';
end $$;

-- 2) CAR_YAZ — tek kapı, tekrara dayanıklı, iptal
set role authenticated;
select pg_temp.kullanici('ayse@atolye.local') \gset
do $$
declare
  p jsonb := '{"satirlar": [{"id": "ch10", "cari_id": "c-1", "tarih": "2026-10-28", "zaman": "2026-10-28T10:00:00.000Z", "yon": "Borç",
               "tutar": 300, "para_birimi": "TRY", "defter": "Genel", "fis_no": "AF-1", "aciklama": "Alış", "ek": {"miktar": 2}}]}';
  r jsonb;
  b numeric := pg_temp.bakiye('c-1');
begin
  r := public.car_yaz(p);
  assert (r ->> 'satir')::int = 1 and pg_temp.bakiye('c-1') = b - 300, 'yazılmadı';
  r := public.car_yaz(p);
  assert (r ->> 'satir')::int = 0 and pg_temp.bakiye('c-1') = b - 300, 'yeniden gönderim iki kez yazdı';
  r := public.car_yaz('{"iptal": ["ch10"]}');
  assert (r ->> 'iptal')::int = 1 and pg_temp.bakiye('c-1') = b, 'iptal';
  assert (select iptal_eden from public.car_hareket where id = 'ch10') = 'ayse@atolye.local', 'iptal eden';
  r := public.car_yaz(p);
  assert pg_temp.bakiye('c-1') = b - 300, 'geri yükleme';
  begin
    perform public.car_yaz('{"satirlar": [{"id": "ch11", "tutar": 1}]}');
    raise exception 'carisiz satır kabul edildi';
  exception when invalid_parameter_value then null; end;
  raise notice 'TAMAM: car_yaz';
end $$;

-- 3) FIS_YAZ — stok ve cari TEK İŞLEMDE: cari kısmı hatalıysa stok da yazılmaz
do $$
declare r jsonb;
begin
  r := public.fis_yaz('{"stok": {"satirlar": [{"id": "fs1", "fisId": "SF-1", "urunId": "u-kosele", "renk": "Siyah", "miktar": -1, "kaynak": "Satış"}]},
                        "cari": {"satirlar": [{"id": "fc1", "cari_id": "c-2", "tarih": "2026-10-28", "yon": "Alacak", "tutar": 99, "fis_no": "SF-1"}]}}');
  assert (r -> 'stok' ->> 'satir')::int = 1 and (r -> 'cari' ->> 'satir')::int = 1, 'fis_yaz ' || r::text;
  assert exists (select 1 from public.stk_hareket where id = 'fs1') and exists (select 1 from public.car_hareket where id = 'fc1'), 'iki taraf';
  begin
    perform public.fis_yaz('{"stok": {"satirlar": [{"id": "fs2", "fisId": "SF-2", "urunId": "u-kosele", "renk": "Siyah", "miktar": -1, "kaynak": "Satış"}]},
                             "cari": {"satirlar": [{"id": "fc2", "tutar": 5}]}}');
    raise exception 'hatalı cari kısmı kabul edildi';
  exception when invalid_parameter_value then null; end;
  assert not exists (select 1 from public.stk_hareket where id = 'fs2'), 'cari düştü ama stok yazıldı — tek işlem değil';
  raise notice 'TAMAM: fis_yaz tek işlem';
end $$;

-- 4) Yetki
select pg_temp.kullanici('veli@atolye.local') \gset
do $$ begin
  begin
    perform public.car_yaz('{"satirlar": [{"id": "ch20", "cari_id": "c-1", "tutar": 1}]}');
    raise exception 'yetkisiz kullanıcı cari yazdı';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.car_hareket (id, cari_id) values ('dogrudan', 'c-1');
    raise exception 'uygulama car_hareket''e doğrudan yazdı';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: cari yetki';
end $$;
reset role;
select pg_temp.editor() \gset

-- 5) GEÇİŞ — görünüm bugünkü biçimde, göç kilidi, eski yoldan yazılamaz
select jsonb_pretty(public.car_gecis()) as gecis \gset
do $$ begin
  assert (select cari_aktif from public.stk_ayar), 'ayar';
  assert (select relkind from pg_class where oid = 'public.cari_hareketleri'::regclass) = 'v', 'görünüm değil';
  assert (select tarih || '|' || zaman || '|' || tutar from public.cari_hareketleri where id = 'ch1') = '2026-10-01|2026-10-01T09:00:00+00:00|840', 'görünüm biçimi';
  assert (select ek ->> 'kullanici' from public.cari_hareketleri where id = 'ch1') = 'Ali', 'görünüm ek';
  begin
    perform public.car_goc();
    raise exception 'geçişten sonra göç çalıştı';
  exception when object_not_in_prerequisite_state then null; end;
  raise notice 'TAMAM: cari geçiş';
end $$;
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  perform public.car_yaz('{"satirlar": [{"id": "ch30", "cari_id": "c-2", "tarih": "2026-10-29", "zaman": "2026-10-29T08:00:00.000Z", "yon": "Borç", "tutar": 50, "fis_no": "TH-2"}]}');
  assert (select tarih || '|' || zaman from public.cari_hareketleri where id = 'ch30') = '2026-10-29|2026-10-29T08:00:00.000Z', 'yeni satır görünümde';
  begin
    insert into public.cari_hareketleri (id, cari_id, tutar) values ('eski-yol', 'c-1', 1);
    raise exception 'eski sürüm görünüme yazabildi';
  exception when others then
    if sqlerrm like '%görünüme yazabildi%' then raise; end if;
  end;
  raise notice 'TAMAM: cari geçişten sonra okuma / yazma';
end $$;
reset role;
select pg_temp.editor() \gset

-- 6) GERİ DÖNÜŞ — tablo v2'nin o anki hâliyle, tiplere çevrilerek
select jsonb_pretty(public.car_geri_don()) as geri \gset
do $$ begin
  assert not (select cari_aktif from public.stk_ayar), 'ayar kapanmadı';
  assert (select relkind from pg_class where oid = 'public.cari_hareketleri'::regclass) = 'r', 'tabloya dönmedi';
  assert (select tarih from public.cari_hareketleri where id = 'ch30') = date '2026-10-29', 'geçiş sonrası satır / tip';
  assert (select zaman from public.cari_hareketleri where id = 'ch30') = timestamptz '2026-10-29T08:00:00Z', 'zaman tipi';
  assert not exists (select 1 from public.cari_hareketleri where id = 'fc2'), 'yazılmamış satır';
  raise notice 'TAMAM: cari geri dönüş';
end $$;
do $$
declare r jsonb := public.car_gecis();
begin
  assert r -> 'goc' -> 'tutarFarki' = '[]'::jsonb, 'yeniden geçişte fark';
  raise notice 'TAMAM: cari yeniden geçiş';
end $$;
\echo 'SINAMA (CARI) BITTI'
