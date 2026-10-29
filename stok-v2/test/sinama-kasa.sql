-- KASA & BANKA v2 — göç, kas_yaz (fark), yetki, fis_yaz { cari, kasa } tek işlem, geçiş, geri dönüş.
\set ON_ERROR_STOP 1
\pset pager off
create or replace function pg_temp.kullanici(eposta text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('email', eposta, 'role', 'authenticated')::text, false)
$$;
create or replace function pg_temp.editor() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;
create or replace function pg_temp.belge() returns jsonb language sql security definer as $$
  select veri from public.kas_muhasebe_g
$$;
select pg_temp.editor() \gset

-- 1) GÖÇ
do $$
declare r jsonb := public.kas_goc();
  b jsonb;
begin
  assert (r ->> 'hesap')::int = 2 and (r ->> 'hareket')::int = 4 and (r ->> 'cek')::int = 2, 'göç sayıları ' || r::text;
  assert r -> 'bakiyeFarki' = '[]'::jsonb and r -> 'yinelenen' = '[]'::jsonb, 'fark / yinelenen ' || r::text;
  assert r -> 'ayarAnahtarlari' = '["kurGecmisi", "kurlar"]'::jsonb, 'ayar ' || r::text;
  b := pg_temp.belge();
  assert jsonb_array_length(b -> 'kasalar') = 1 and jsonb_array_length(b -> 'bankalar') = 1, 'hesaplar';
  assert b -> 'kasalar' -> 0 ->> 'ad' = 'Merkez Kasa' and b -> 'bankalar' -> 0 ->> 'iban' = 'TR00', 'hesap alanları';
  assert jsonb_array_length(b -> 'kasalar' -> 0 -> 'hareketler') = 3, 'kasa hareketleri';
  assert b -> 'kasalar' -> 0 -> 'hareketler' -> 0 ->> 'id' = 'mh1', 'sıra korunmadı ' || (b -> 'kasalar' -> 0 -> 'hareketler')::text;
  assert (b -> 'kasalar' -> 0 -> 'hareketler' -> 2 ->> 'id') like 'mh-%', 'kimliksiz harekete kimlik';
  assert jsonb_array_length(b -> 'cekler') = 2 and (b -> 'cekler' -> 1 ->> 'id') like 'cek-%', 'çekler';
  assert (b -> 'kurlar' ->> 'USD')::numeric = 41.2, 'kurlar';
  raise notice 'TAMAM: kasa göç';
end $$;

set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
-- 2) KAS_YAZ — yalnız fark; tekrara dayanıklı; iptal; hesap pasif; çek; ayar
do $$
declare r jsonb; b jsonb;
  p jsonb := '{"hareketler": [{"id": "mh10", "hesap_id": "kasa-1", "veri": {"id": "mh10", "tarih": "2026-10-29", "yon": "Giriş", "tutar": 300, "cariId": "c-2", "muhasebeBagId": "bag10"}}]}';
begin
  r := public.kas_yaz(p);
  assert (r ->> 'hareket')::int = 1, 'hareket ' || r::text;
  b := pg_temp.belge();
  assert b -> 'kasalar' -> 0 -> 'hareketler' -> 0 ->> 'id' = 'mh10', 'yeni hareket en üstte';
  r := public.kas_yaz(p);
  assert (r ->> 'hareket')::int = 0 and jsonb_array_length(pg_temp.belge() -> 'kasalar' -> 0 -> 'hareketler') = 4, 'yeniden gönderim';
  r := public.kas_yaz('{"hareketIptal": ["mh2"]}');
  assert (r ->> 'iptal')::int = 1 and jsonb_array_length(pg_temp.belge() -> 'kasalar' -> 0 -> 'hareketler') = 3, 'iptal';
  assert (select iptal_eden from public.kas_hareket where id = 'mh2') = 'ali@atolye.local', 'iptal eden';
  -- Hesap ekle, sonra kaldır (pasif — görünmez, hareketleri iz olarak kalır)
  r := public.kas_yaz('{"hesaplar": [{"id": "banka-2", "tur": "banka", "sira": 2, "veri": {"ad": "İş Bankası", "paraBirimi": "USD"}}],
                        "hareketler": [{"id": "mh20", "hesap_id": "banka-2", "veri": {"id": "mh20", "tarih": "2026-10-29", "yon": "Giriş", "tutar": 10}}]}');
  assert jsonb_array_length(pg_temp.belge() -> 'bankalar') = 2, 'hesap eklenmedi';
  r := public.kas_yaz('{"hesapSil": ["banka-2"]}');
  assert jsonb_array_length(pg_temp.belge() -> 'bankalar') = 1 and exists (select 1 from public.kas_hareket where id = 'mh20'), 'hesap pasif';
  -- Çek iptal, ayar
  r := public.kas_yaz('{"cekIptal": ["cek-1"], "ayar": {"kurlar": {"USD": 42, "EUR": 49}}}');
  b := pg_temp.belge();
  assert jsonb_array_length(b -> 'cekler') = 1 and (b -> 'kurlar' ->> 'USD')::numeric = 42 and jsonb_array_length(b -> 'kurGecmisi') = 1, 'çek / ayar';
  begin
    perform public.kas_yaz('{"hareketler": [{"id": "mh30", "veri": {"tutar": 1}}]}');
    raise exception 'hesapsız hareket kabul edildi';
  exception when invalid_parameter_value then null; end;
  raise notice 'TAMAM: kas_yaz';
end $$;

-- 3) YETKİ — kur güncellemesi herkese açık, gerisi muhasebe/fiş/cari yetkisi
select pg_temp.kullanici('veli@atolye.local') \gset
do $$ begin
  perform public.kas_yaz('{"ayar": {"kurlar": {"USD": 43, "EUR": 50}}}');
  assert (pg_temp.belge() -> 'kurlar' ->> 'USD')::numeric = 43, 'kur güncellemesi yetkisiz kullanıcıya kapalı';
  begin
    perform public.kas_yaz('{"hareketIptal": ["mh1"]}');
    raise exception 'yetkisiz kullanıcı kasa hareketi sildi';
  exception when insufficient_privilege then null; end;
  begin
    perform public.kas_yaz('{"ayar": {"kurlar": {"USD": 1}, "baskaAnahtar": 1}}');
    raise exception 'kur dışı ayar yetkisiz yazıldı';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.kas_hareket (id, hesap_id, veri) values ('dogrudan', 'kasa-1', '{}');
    raise exception 'doğrudan yazılabildi';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: kasa yetki';
end $$;

-- 4) FIS_YAZ { cari, kasa } — tahsilat: cari ve kasa tek işlem; kasa kısmı hatalıysa cari de yazılmaz
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  perform public.fis_yaz('{"cari": {"satirlar": [{"id": "tc1", "cari_id": "c-2", "tarih": "2026-10-29", "yon": "Borç", "tutar": 400, "fis_no": "THS-1", "ek": {"muhasebeBagId": "bagT1"}}]},
                           "kasa": {"hareketler": [{"id": "tk1", "hesap_id": "kasa-1", "veri": {"id": "tk1", "tarih": "2026-10-29", "yon": "Giriş", "tutar": 400, "muhasebeBagId": "bagT1"}}]}}');
  assert exists (select 1 from public.car_hareket where id = 'tc1') and exists (select 1 from public.kas_hareket where id = 'tk1'), 'tahsilat iki taraf';
  begin
    perform public.fis_yaz('{"cari": {"satirlar": [{"id": "tc2", "cari_id": "c-2", "tutar": 5, "fis_no": "THS-2"}]},
                             "kasa": {"hareketler": [{"id": "tk2", "veri": {"tutar": 5}}]}}');
    raise exception 'hatalı kasa kısmı kabul edildi';
  exception when invalid_parameter_value then null; end;
  assert not exists (select 1 from public.car_hareket where id = 'tc2'), 'kasa düştü ama cari yazıldı';
  raise notice 'TAMAM: fis_yaz cari + kasa tek işlem';
end $$;
reset role;
select pg_temp.editor() \gset

-- 5) GEÇİŞ ve GERİ DÖNÜŞ
select jsonb_pretty(public.kas_gecis()) as gecis \gset
do $$ begin
  assert (select kasa_aktif from public.stk_ayar), 'ayar';
  assert (select relkind from pg_class where oid = 'public.muhasebe'::regclass) = 'v', 'muhasebe görünüm değil';
  assert (select jsonb_array_length(veri -> 'kasalar') from public.muhasebe where id = 'tekil') = 1, 'görünüm belgesi';
  begin
    perform public.kas_goc();
    raise exception 'geçişten sonra göç çalıştı';
  exception when object_not_in_prerequisite_state then null; end;
  raise notice 'TAMAM: kasa geçiş';
end $$;
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  begin
    insert into public.muhasebe (id, veri) values ('tekil', '{}');
    raise exception 'eski sürüm belgeye yazabildi';
  exception when others then
    if sqlerrm like '%belgeye yazabildi%' then raise; end if;
  end;
  assert (select jsonb_array_length(veri -> 'kasalar') from public.muhasebe) = 1, 'uygulama okuyamıyor';
  -- Geçiş belgeden YENİDEN göç etti (geçiş öncesi deneme yazmaları düştü: gerçekte o dönemde kas_* yazılmaz).
  -- Geçişten sonra uygulama kas_yaz ile yazar; geri dönüşte bu yazmalar belgeye dönmeli.
  assert (select jsonb_array_length(veri -> 'kasalar' -> 0 -> 'hareketler') from public.muhasebe) = 3, 'geçiş göçü';
  perform public.kas_yaz('{"hareketler": [{"id": "mh40", "hesap_id": "kasa-1", "veri": {"id": "mh40", "tarih": "2026-10-29", "yon": "Giriş", "tutar": 5}}],
                           "ayar": {"kurlar": {"USD": 43, "EUR": 50}}}');
  assert (select veri -> 'kasalar' -> 0 -> 'hareketler' -> 0 ->> 'id' from public.muhasebe) = 'mh40', 'geçişten sonra yazma';
  raise notice 'TAMAM: kasa geçişten sonra okuma / yazma, eski yol kapalı';
end $$;
reset role;
select pg_temp.editor() \gset
select jsonb_pretty(public.kas_geri_don()) as geri \gset
do $$
declare b jsonb := (select veri from public.muhasebe where id = 'tekil');
begin
  assert (select relkind from pg_class where oid = 'public.muhasebe'::regclass) = 'r', 'tabloya dönmedi';
  assert jsonb_array_length(b -> 'kasalar' -> 0 -> 'hareketler') = 4, 'geçiş sonrası hareketler belgeye dönmedi ' || (b -> 'kasalar' -> 0 -> 'hareketler')::text;
  assert (b -> 'kurlar' ->> 'USD')::numeric = 43, 'kurlar';
  raise notice 'TAMAM: kasa geri dönüş';
end $$;
do $$
declare r jsonb := public.kas_gecis();
begin
  assert r -> 'goc' -> 'bakiyeFarki' = '[]'::jsonb and r -> 'goc' -> 'yinelenen' = '[]'::jsonb, 'yeniden geçiş ' || r::text;
  raise notice 'TAMAM: kasa yeniden geçiş';
end $$;
\echo 'SINAMA (KASA) BITTI'
