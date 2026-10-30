-- FİŞ DEFTERİ SINAMASI — sıfırlanmış veritabanında (canlının aynısı: bütün geçişler + 15. adım + veri sıfırlama), fis-defteri.sql
-- Editor gibi verildikten sonra. sinama-sifirla.sql'nin bıraktığı: ürün u-yeni, cari c-yeni, kasa K1.
\set ON_ERROR_STOP 1
\pset pager off
create or replace function pg_temp.kullanici(eposta text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('email', eposta, 'role', 'authenticated')::text, false)
$$;
create or replace function pg_temp.editor() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;
select pg_temp.editor() \gset

-- 1) Kurallar KAPALI başlar: bugünkü uygulama (fis_yaz ile doğrudan satır) çalışmaya devam eder.
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  assert not public.fis_kural_aktif(), 'kurallar açık başladı';
  perform public.fis_yaz('{"stok": {"satirlar": [{"id": "fk-eski", "fisId": "ESKI-YOL-1", "urunId": "u-yeni", "renk": "Siyah", "miktar": 1, "kaynak": "Manuel"}]}}');
  assert exists (select 1 from public.stk_hareket where id = 'fk-eski'), 'eski yol kapalı (kural kapalıyken açık olmalı)';
  raise notice 'TAMAM: kurallar kapalıyken eski yol çalışıyor';
end $$;

-- 2) Alış faturası (stok + cari) ve bağlı ödeme makbuzu (kasa + cari) tek işlemde; numaraları sunucu verir
create temp table _no (ad text primary key, no text);
grant all on _no to authenticated;
do $$
declare
  r jsonb;
  gun text := to_char(now() at time zone 'Europe/Istanbul', 'YYMMDD');
  fv jsonb;
begin
  r := public.fis_kes(jsonb_build_object(
    'istek', 'istek-af-1',
    'fis', jsonb_build_object('aile', 'stok', 'tur', 'Alış', 'onek', 'AF', 'kaynak', 'Satınalma', 'cariId', 'c-yeni', 'defter', 'Genel',
                              'paraBirimi', 'TRY', 'tutar', 500, 'kullanici', 'Ali',
                              'kalemler', jsonb_build_array(jsonb_build_object('urunId', 'u-yeni', 'renk', 'Siyah', 'miktar', 5, 'birimFiyat', 100))),
    'stok', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'fk-h1', 'urunId', 'u-yeni', 'renk', 'Siyah', 'miktar', 5, 'kaynak', 'Satınalma', 'cariId', 'c-yeni'))),
    'cari', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'fk-c1', 'cari_id', 'c-yeni', 'tarih', '2026-10-30', 'yon', 'Alacak', 'tutar', 500))),
    'bagli', jsonb_build_object(
      'fis', jsonb_build_object('aile', 'para', 'tur', 'Ödeme', 'onek', 'ÖD', 'cariId', 'c-yeni', 'kasaHesapId', 'K1', 'tutar', 200),
      'kasa', jsonb_build_object('hareketler', jsonb_build_array(jsonb_build_object('id', 'fk-k1', 'hesap_id', 'K1', 'veri', jsonb_build_object('id', 'fk-k1', 'tarih', '2026-10-30', 'yon', 'Çıkış', 'tutar', 200)))),
      'cari', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'fk-c2', 'cari_id', 'c-yeni', 'tarih', '2026-10-30', 'yon', 'Borç', 'tutar', 200))))));
  assert r ->> 'fisNo' = 'AF-' || gun || '001', 'alış numarası ' || r::text;
  assert r ->> 'bagliFisNo' = 'ÖD-' || gun || '001', 'makbuz numarası ' || r::text;
  insert into _no values ('af', r ->> 'fisNo'), ('od', r ->> 'bagliFisNo');
  assert (select fis_id from public.stk_hareket where id = 'fk-h1') = r ->> 'fisNo', 'stok satırı fişe bağlı değil';
  assert (select fis_id || '|' || fis_no from public.car_hareket where id = 'fk-c1') = (r ->> 'fisNo') || '|' || (r ->> 'fisNo'), 'cari satırı fişe bağlı değil';
  assert (select fis_id from public.car_hareket where id = 'fk-c2') = r ->> 'bagliFisNo', 'makbuzun cari satırı';
  assert (select fis_id || '|' || (veri ->> 'fisNo') from public.kas_hareket where id = 'fk-k1') = (r ->> 'bagliFisNo') || '|' || (r ->> 'bagliFisNo'), 'kasa satırı';
  assert (select bagli_fis from public.stk_fis where id = r ->> 'fisNo') = r ->> 'bagliFisNo'
     and (select bagli_fis from public.stk_fis where id = r ->> 'bagliFisNo') = r ->> 'fisNo', 'iki fiş birbirine bağlı değil';
  select veri into fv from public.fis_listesi where id = r ->> 'fisNo';
  assert fv ->> 'aile' = 'stok' and jsonb_array_length(fv -> 'stokHareketleri') = 1 and fv -> 'stokHareketleri' -> 0 ->> 'renk' = 'Siyah'
     and jsonb_array_length(fv -> 'cariHareketleri') = 1 and jsonb_array_length(fv -> 'kalemler') = 1, 'fiş listesi ' || fv::text;
  assert (select jsonb_array_length(veri -> 'kasaHareketleri') from public.fis_listesi where id = r ->> 'bagliFisNo') = 1, 'makbuz listesi';
  raise notice 'TAMAM: alış faturası + bağlı ödeme makbuzu tek işlemde, numaralar sunucudan (%, %)', r ->> 'fisNo', r ->> 'bagliFisNo';

  -- Aynı istek yeniden gelirse yazılmaz, ilk numaralar döner
  r := public.fis_kes(jsonb_build_object('istek', 'istek-af-1', 'fis', jsonb_build_object('aile', 'stok', 'tur', 'Alış', 'onek', 'AF'),
        'stok', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'fk-h1-tekrar', 'urunId', 'u-yeni', 'miktar', 5)))));
  assert (r ->> 'zatenVar')::boolean and r ->> 'fisNo' = (select no from _no where ad = 'af'), 'yeniden gönderim ' || r::text;
  assert not exists (select 1 from public.stk_hareket where id = 'fk-h1-tekrar'), 'yeniden gönderim çift yazdı';
  r := public.fis_kes(jsonb_build_object('istek', 'istek-af-2', 'fis', jsonb_build_object('aile', 'stok', 'tur', 'Alış', 'onek', 'AF'),
        'stok', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'fk-h2', 'urunId', 'u-yeni', 'renk', 'Siyah', 'miktar', 1, 'kaynak', 'Satınalma')))));
  assert r ->> 'fisNo' = 'AF-' || gun || '002', 'ikinci numara ' || r::text;
  raise notice 'TAMAM: yeniden gönderim çift fiş yazmıyor, sıra ilerliyor';
end $$;

-- 3) Yarım fiş olmaz: satırlardan biri hata verirse başlık, satırlar ve numara geri alınır
do $$
declare
  gun text := to_char(now() at time zone 'Europe/Istanbul', 'YYMMDD');
  r jsonb;
begin
  begin
    perform public.fis_kes(jsonb_build_object('istek', 'istek-yarim', 'fis', jsonb_build_object('aile', 'stok', 'tur', 'Satış', 'onek', 'SF', 'cariId', 'c-yeni'),
      'stok', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'fk-y1', 'urunId', 'u-yeni', 'miktar', -1, 'kaynak', 'Satış'),
                                                                jsonb_build_object('id', 'fk-y2', 'urunId', 'u-YOK', 'miktar', -1, 'kaynak', 'Satış'))),
      'cari', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'fk-yc', 'cari_id', 'c-yeni', 'yon', 'Borç', 'tutar', 50)))));
    raise exception 'olmayan ürünlü fiş yazıldı';
  exception when no_data_found then null; end;
  assert not exists (select 1 from public.stk_hareket where id = 'fk-y1') and not exists (select 1 from public.car_hareket where id = 'fk-yc')
     and not exists (select 1 from public.stk_fis where istek = 'istek-yarim'), 'yarım fiş kaldı';
  r := public.fis_kes(jsonb_build_object('istek', 'istek-sf-1', 'fis', jsonb_build_object('aile', 'stok', 'tur', 'Satış', 'onek', 'SF', 'cariId', 'c-yeni'),
    'stok', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'fk-s1', 'urunId', 'u-yeni', 'renk', 'Siyah', 'miktar', -2, 'kaynak', 'Satış'))),
    'cari', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'fk-sc1', 'cari_id', 'c-yeni', 'tarih', '2026-10-30', 'yon', 'Borç', 'tutar', 300)))));
  assert r ->> 'fisNo' = 'SF-' || gun || '001', 'düşen fiş numara yaktı ' || r::text;
  insert into _no values ('sf', r ->> 'fisNo');
  -- Ailesinin satırı olmayan fiş
  begin
    perform public.fis_kes('{"istek": "istek-bos-stok", "fis": {"aile": "stok", "tur": "Alış", "onek": "AF"}, "cari": {"satirlar": [{"id": "fk-bc", "cari_id": "c-yeni", "yon": "Alacak", "tutar": 1}]}}');
    raise exception 'stok satırsız stok fişi yazıldı';
  exception when check_violation then null; end;
  begin
    perform public.fis_kes('{"istek": "istek-bos-para", "fis": {"aile": "para", "tur": "Tahsilat", "onek": "TH"}}');
    raise exception 'satırsız para fişi yazıldı';
  exception when check_violation then null; end;
  begin
    perform public.fis_kes('{"fis": {"aile": "stok", "tur": "Alış", "onek": "AF"}}');
    raise exception 'istek kimliksiz fiş yazıldı';
  exception when invalid_parameter_value then null; end;
  raise notice 'TAMAM: yarım fiş yok, satırsız fiş yok, düşen fiş numara yakmıyor';
end $$;
reset role;
select pg_temp.editor() \gset

-- 4) KURALLAR AÇILIR: eski yol kapanır
select public.fis_kural_ac() as ac \gset
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  begin
    perform public.fis_yaz('{"stok": {"satirlar": [{"id": "fk-eski-2", "fisId": "ESKI-YOL-2", "urunId": "u-yeni", "miktar": 1, "kaynak": "Manuel"}]}}');
    raise exception 'kurallar açıkken eski yoldan stok yazıldı';
  exception when insufficient_privilege then null; end;
  begin
    perform public.car_yaz('{"satirlar": [{"id": "fk-eski-c", "cari_id": "c-yeni", "yon": "Borç", "tutar": 1, "fis_no": "X"}]}');
    raise exception 'kurallar açıkken eski yoldan cari yazıldı';
  exception when insufficient_privilege then null; end;
  begin
    perform public.kas_yaz('{"hareketler": [{"id": "fk-eski-k", "hesap_id": "K1", "veri": {"tutar": 1}}]}');
    raise exception 'kurallar açıkken eski yoldan kasa hareketi yazıldı';
  exception when insufficient_privilege then null; end;
  begin
    perform public.stk_yaz('{"iptal": ["fk-h1"]}');
    raise exception 'kurallar açıkken tek satır iptal edildi';
  exception when insufficient_privilege then null; end;
  begin
    perform public.car_yaz('{"iptal": ["fk-c1"]}');
    raise exception 'kurallar açıkken cari satırı tek başına iptal edildi';
  exception when insufficient_privilege then null; end;
  -- Hareket olmayan işler açık: kasa hesabı, renk/ölçü (varyant aç)
  perform public.kas_yaz('{"hesaplar": [{"id": "B1", "tur": "banka", "veri": {"ad": "Ziraat"}}]}');
  perform public.stk_yaz('{"varyantAc": [{"urunId": "u-yeni", "renk": "Taba"}]}');
  assert exists (select 1 from public.kas_hesap where id = 'B1'), 'hesap açılamadı';
  -- fis_kes kurallar açıkken de çalışır
  perform public.fis_kes(jsonb_build_object('istek', 'istek-th-1', 'fis', jsonb_build_object('aile', 'para', 'tur', 'Tahsilat', 'onek', 'TH', 'cariId', 'c-yeni', 'kasaHesapId', 'K1'),
    'kasa', jsonb_build_object('hareketler', jsonb_build_array(jsonb_build_object('id', 'fk-k2', 'hesap_id', 'K1', 'veri', jsonb_build_object('id', 'fk-k2', 'yon', 'Giriş', 'tutar', 300)))),
    'cari', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'fk-c3', 'cari_id', 'c-yeni', 'yon', 'Alacak', 'tutar', 300)))));
  assert (select fis_id is not null from public.kas_hareket where id = 'fk-k2'), 'tahsilat makbuzu';
  raise notice 'TAMAM: kurallar açık — eski yoldan hareket ve tek satır iptali reddedildi; hesap / varyant açık; fis_kes çalışıyor';
end $$;
reset role;
select pg_temp.editor() \gset

-- 5) Veritabanı kuralları editörde bile (silme, değiştirme, fişsiz satır, satırsız fiş)
do $$
declare af text := (select no from _no where ad = 'af');
begin
  begin delete from public.stk_hareket where id = 'fk-h1'; raise exception 'hareket silindi';
  exception when insufficient_privilege then null; end;
  begin delete from public.stk_fis where id = af; raise exception 'fiş silindi';
  exception when insufficient_privilege then null; end;
  begin delete from public.car_hareket where id = 'fk-c1'; raise exception 'cari hareketi silindi';
  exception when insufficient_privilege then null; end;
  begin update public.car_hareket set tutar = 1 where id = 'fk-c1'; raise exception 'kapı kapalıyken değişti';
  exception when insufficient_privilege then null; end;
  perform set_config('fis.kapi', 'acik', true);
  begin update public.stk_hareket set miktar = 50 where id = 'fk-h1'; raise exception 'kesilmiş hareketin miktarı değişti';
  exception when insufficient_privilege then null; end;
  begin update public.stk_fis set tutar = 1 where id = af; raise exception 'kesilmiş fişin tutarı değişti';
  exception when insufficient_privilege then null; end;
  begin insert into public.car_hareket (id, cari_id, yon, tutar) values ('fk-fissiz', 'c-yeni', 'Borç', 1); raise exception 'fişsiz cari satırı';
  exception when not_null_violation then null; end;
  perform set_config('fis.kapi', '', true);
  raise notice 'TAMAM: silme, değiştirme ve fişsiz satır veritabanında reddediliyor';
end $$;
-- Satırsız fiş işlem sonunda düşer
begin;
select set_config('fis.kapi', 'acik', true) \gset
insert into public.stk_fis (id, aile, tur) values ('BOS-1', 'stok', 'Alış');
\set ON_ERROR_STOP 0
commit;
\set ON_ERROR_STOP 1
do $$ begin
  assert not exists (select 1 from public.stk_fis where id = 'BOS-1'), 'satırsız fiş kaldı';
  raise notice 'TAMAM: satırsız fiş işlem sonunda reddedildi';
end $$;

-- 6) İptal: fiş + bağlı makbuz + bütün satırlar birlikte; geri açılmaz; tekrar zararsız
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$
declare
  af text := (select no from _no where ad = 'af');
  od text := (select no from _no where ad = 'od');
  r jsonb;
  stok_once numeric := (select coalesce(sum(miktar), 0) from public.varyantlar where urun_id = 'u-yeni');
begin
  r := public.fis_iptal(jsonb_build_object('no', af, 'sebep', 'yanlış fiyat'));
  assert (select iptal from public.stk_fis where id = af) and (select iptal from public.stk_fis where id = od), 'fiş ya da makbuz iptal değil';
  assert (select iptal from public.stk_hareket where id = 'fk-h1') and (select iptal from public.car_hareket where id = 'fk-c1')
     and (select iptal from public.car_hareket where id = 'fk-c2') and (select iptal from public.kas_hareket where id = 'fk-k1'), 'satırlar iptal değil';
  assert (select coalesce(sum(miktar), 0) from public.varyantlar where urun_id = 'u-yeni') = stok_once - 5, 'stok geri dönmedi';
  assert not exists (select 1 from public.cari_hareketleri where id in ('fk-c1', 'fk-c2')), 'iptal cari görünüyor';
  r := public.fis_iptal(jsonb_build_object('no', af));
  assert (r ->> 'zatenIptal')::boolean, 'tekrar iptal ' || r::text;
  assert (select veri ->> 'iptal' from public.fis_listesi where id = af) = 'true', 'listede iptal görünmüyor';
  perform public.fis_bilgi(jsonb_build_object('no', (select no from _no where ad = 'sf'), 'ek', jsonb_build_object('irsaliye', 'IRS-9')));
  assert (select ek ->> 'irsaliye' from public.stk_fis where id = (select no from _no where ad = 'sf')) = 'IRS-9', 'fiş bilgisi';
  raise notice 'TAMAM: iptal fiş + makbuz + satırlar birlikte, stok geri döndü, tekrar zararsız, fiş bilgisi yazılıyor';
end $$;
reset role;
select pg_temp.editor() \gset
do $$
declare af text := (select no from _no where ad = 'af');
begin
  perform set_config('fis.kapi', 'acik', true);
  begin update public.stk_fis set iptal = false where id = af; raise exception 'iptal fiş geri açıldı';
  exception when insufficient_privilege then null; end;
  begin update public.stk_hareket set iptal = false where id = 'fk-h1'; raise exception 'iptal hareket geri açıldı';
  exception when insufficient_privilege then null; end;
  perform set_config('fis.kapi', '', true);
  raise notice 'TAMAM: iptal geri açılmıyor';
end $$;

-- 7) Yetki: hiç kaydetme yetkisi olmayan fiş kesemez
set role authenticated;
select pg_temp.kullanici('veli@atolye.local') \gset
do $$ begin
  begin
    perform public.fis_kes('{"istek": "istek-veli", "fis": {"aile": "stok", "tur": "Alış", "onek": "AF"}, "stok": {"satirlar": [{"id": "fk-v1", "urunId": "u-yeni", "miktar": 1}]}}');
    raise exception 'yetkisiz kullanıcı fiş kesti';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: yetkisiz fiş kesemez';
end $$;
reset role;
\echo 'SINAMA (FIS DEFTERI) BITTI'
