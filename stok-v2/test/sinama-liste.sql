-- TEK PARÇA LİSTELER v2 — göç, lst_yaz (fark, sıra, iptal), yetki, değişiklik sayacı, geçiş, geri dönüş.
\set ON_ERROR_STOP 1
\pset pager off
create or replace function pg_temp.kullanici(eposta text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('email', eposta, 'role', 'authenticated')::text, false)
$$;
create or replace function pg_temp.editor() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;
create or replace function pg_temp.idler(t text) returns text language sql security definer as $$
  select string_agg(x ->> 'id', ',' order by n) from jsonb_array_elements(public.lst_belge(t)) with ordinality as e(x, n)
$$;
select pg_temp.editor() \gset

-- 1) GÖÇ
do $$
declare r jsonb := public.lst_goc();
begin
  assert r -> 'gorevler' ->> 'atlandi' = 'tablo yok' and r -> 'modeller' ->> 'atlandi' = 'tablo yok', 'olmayan tablo atlanmadı ' || r::text;
  assert (r -> 'teklifler' ->> 'eski')::int = 4 and (r -> 'teklifler' ->> 'tasinan')::int = 3
     and (r -> 'teklifler' ->> 'kimliksiz')::int = 1 and r -> 'teklifler' -> 'yinelenen' = '["tkl-1"]'::jsonb, 'teklif göçü ' || (r -> 'teklifler')::text;
  assert (r -> 'faturalar' ->> 'tasinan')::int = 1 and (r -> 'faturalar' ->> 'nesneDegil')::int = 1, 'fatura göçü ' || (r -> 'faturalar')::text;
  -- Her eski öğe hesapta: taşınan + yinelenen + nesne olmayan = eski (test verisinde bilerek yinelenen ve bozuk fiş var).
  assert (r -> 'fis_defteri' ->> 'tasinan')::int + jsonb_array_length(r -> 'fis_defteri' -> 'yinelenen') + (r -> 'fis_defteri' ->> 'nesneDegil')::int
       = (r -> 'fis_defteri' ->> 'eski')::int, 'fiş defteri göçü ' || (r -> 'fis_defteri')::text;
  assert pg_temp.idler('teklifler') like 'tkl-2,tkl-1,lx-%', 'sıra korunmadı ' || pg_temp.idler('teklifler');
  assert (select veri ->> 'teklifNo' from public.lst_kayit where tablo = 'teklifler' and id = 'tkl-1') = 'TKL-1', 'yinelenende ilki taşınmalı';
  assert (select count(*) from public.lst_kayit where tablo = 'teklifler' and id like 'lx-%' and veri ->> 'id' = id) = 1, 'kimliksize kimlik yazılmadı';
  raise notice 'TAMAM: liste göç';
end $$;

-- 2) LST_YAZ — fark, sıra (başa / sona / verilmezse korunur), iptal, yeniden açma, tekrar
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$
declare r jsonb;
  once bigint := (select coalesce((sayaclar ->> 'teklifler')::bigint, 0) from public.degisiklik);
begin
  r := public.lst_yaz('{"tablo": "teklifler", "kayitlar": [{"id": "tkl-3", "sira": -1761730000000, "veri": {"id": "tkl-3", "teklifNo": "TKL-3"}}]}');
  assert (r ->> 'yaz')::int = 1, 'yazma ' || r::text;
  assert pg_temp.idler('teklifler') like 'tkl-3,tkl-2,tkl-1,%', 'başa eklenen başta değil ' || pg_temp.idler('teklifler');
  r := public.lst_yaz('{"tablo": "teklifler", "kayitlar": [{"id": "tkl-4", "sira": 1761730000000, "veri": {"id": "tkl-4"}}]}');
  assert pg_temp.idler('teklifler') like '%,tkl-4', 'sona eklenen sonda değil';
  r := public.lst_yaz('{"tablo": "teklifler", "kayitlar": [{"id": "tkl-1", "veri": {"id": "tkl-1", "teklifNo": "TKL-1", "durum": "Onaylandı"}}]}');
  assert pg_temp.idler('teklifler') like 'tkl-3,tkl-2,tkl-1,%', 'sırasız güncelleme sırayı bozdu';
  r := public.lst_yaz('{"tablo": "teklifler", "kayitlar": [{"id": "tkl-1", "sira": -9999999999999999, "veri": {"id": "tkl-1", "teklifNo": "TKL-1", "durum": "Onaylandı"}}]}');
  assert pg_temp.idler('teklifler') like 'tkl-3,tkl-2,tkl-1,%', 'var olan kaydın sırası değişti';
  r := public.lst_yaz('{"tablo": "teklifler", "kayitlar": [{"id": "tkl-1", "veri": {"id": "tkl-1", "teklifNo": "TKL-1", "durum": "Onaylandı"}}]}');
  assert (r ->> 'yaz')::int = 0, 'aynı kayıt yeniden yazıldı';
  r := public.lst_yaz('{"tablo": "teklifler", "iptal": ["tkl-2"]}');
  assert (r ->> 'iptal')::int = 1 and pg_temp.idler('teklifler') not like '%tkl-2%', 'iptal';
  assert (select iptal_eden from public.lst_kayit where tablo = 'teklifler' and id = 'tkl-2') = 'ali@atolye.local', 'iptal eden';
  r := public.lst_yaz('{"tablo": "teklifler", "kayitlar": [{"id": "tkl-2", "veri": {"id": "tkl-2", "teklifNo": "TKL-2"}}]}');
  assert pg_temp.idler('teklifler') like 'tkl-3,tkl-2,%', 'iptal edilen yeniden gelince yerine açılmadı';
  assert (select (sayaclar ->> 'teklifler')::bigint from public.degisiklik) > once, 'sayaç eski adla artmadı';
  begin
    perform public.lst_yaz('{"tablo": "urunler", "iptal": ["x"]}');
    raise exception 'tanınmayan liste yazıldı';
  exception when insufficient_privilege then null; end;
  begin
    perform public.lst_yaz('{"tablo": "koliler", "kayitlar": [{"veri": {"kod": "K9"}}]}');
    raise exception 'kimliksiz kayıt kabul edildi';
  exception when invalid_parameter_value then null; end;
  raise notice 'TAMAM: lst_yaz';
end $$;

-- 3) YETKİ — fatura fiş/muhasebe yetkisi ister; öteki listeler giriş yapmış herkes; doğrudan yazma kapalı
select pg_temp.kullanici('veli@atolye.local') \gset
do $$ begin
  perform public.lst_yaz('{"tablo": "mesajlar", "kayitlar": [{"id": "mesaj-2", "veri": {"id": "mesaj-2", "metin": "Veli yazdı"}}]}');
  begin
    perform public.lst_yaz('{"tablo": "faturalar", "kayitlar": [{"id": "fatura-9", "veri": {"id": "fatura-9"}}]}');
    raise exception 'yetkisiz kullanıcı fatura yazdı';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.lst_kayit (tablo, id, veri) values ('mesajlar', 'dogrudan', '{}');
    raise exception 'doğrudan yazılabildi';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: liste yetki';
end $$;
reset role;
select pg_temp.editor() \gset

-- 4) GEÇİŞ — eski adlar görünüm, uygulama okur, eski yol kapalı
select jsonb_pretty(public.lst_gecis()) as gecis \gset
do $$ begin
  assert (select liste_aktif from public.stk_ayar) and (select liste_tablolari from public.stk_ayar) = array['teklifler', 'faturalar', 'koliler', 'fis_defteri', 'mesajlar'],
    'ayar ' || (select liste_tablolari::text from public.stk_ayar);
  assert (select relkind from pg_class where oid = 'public.teklifler'::regclass) = 'v', 'teklifler görünüm değil';
  assert to_regclass('public.eski_teklifler') is not null and to_regclass('public.gorevler') is null, 'eski tablo / olmayan liste';
  begin
    perform public.lst_goc();
    raise exception 'geçişten sonra göç çalıştı';
  exception when object_not_in_prerequisite_state then null; end;
  raise notice 'TAMAM: liste geçiş';
end $$;
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  assert (select jsonb_array_length(veri) from public.koliler where id = 'tekil') = 2, 'uygulama okuyamıyor';
  -- Geçiş belgeden YENİDEN göç etti: geçiş öncesi deneme yazmaları düştü (gerçekte o dönemde lst_kayit'e yazılmaz).
  assert (select veri -> 0 ->> 'id' from public.teklifler) = 'tkl-2', 'görünüm sırası';
  begin
    insert into public.teklifler (id, veri) values ('tekil', '[]');
    raise exception 'eski sürüm belgeye yazabildi';
  exception when others then
    if sqlerrm like '%belgeye yazabildi%' then raise; end if;
  end;
  perform public.lst_yaz('{"tablo": "koliler", "kayitlar": [{"id": "koli-3", "veri": {"id": "koli-3", "kod": "K3"}}], "iptal": ["koli-1"]}');
  assert (select string_agg(x ->> 'id', ',') from public.koliler, jsonb_array_elements(veri) x) = 'koli-2,koli-3', 'geçişten sonra yazma';
  raise notice 'TAMAM: liste geçişten sonra okuma / yazma, eski yol kapalı';
end $$;
reset role;
select pg_temp.editor() \gset

-- 5) GERİ DÖNÜŞ ve YENİDEN GEÇİŞ
select jsonb_pretty(public.lst_geri_don()) as geri \gset
do $$
declare r jsonb;
begin
  assert (select relkind from pg_class where oid = 'public.koliler'::regclass) = 'r', 'tabloya dönmedi';
  assert (select string_agg(x ->> 'id', ',') from public.koliler, jsonb_array_elements(veri) x) = 'koli-2,koli-3', 'geçiş sonrası yazmalar belgeye dönmedi';
  assert (select jsonb_array_length(veri) from public.mesajlar) = 1, 'mesajlar';
  assert not (select liste_aktif from public.stk_ayar), 'ayar';
  r := public.lst_gecis();
  assert r ->> 'gecis' = 'tamam' and (r -> 'goc' -> 'koliler' ->> 'tasinan')::int = 2, 'yeniden geçiş ' || r::text;
  raise notice 'TAMAM: liste geri dönüş ve yeniden geçiş';
end $$;
\echo 'SINAMA (LISTE) BITTI'
