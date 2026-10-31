-- FİŞ DEFTERİ EK İŞLEMLERİ SINAMASI (v1.742.0, kullanıcı kararları 31 Ekim) — sinama-fis.sql'nin bıraktığı veritabanında (kurallar
-- AÇIK). Kural provasının bulduğu iki yol: sipariş bağ çözme, renk taşıma. Her biri yalnız izin verilen alana
-- dokunmalı; aynı değişiklik doğrudan (eski yol / düz güncelleme) reddedilmeli.
\set ON_ERROR_STOP 1
\pset pager off
create or replace function pg_temp.kullanici(eposta text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('email', eposta, 'role', 'authenticated')::text, false)
$$;

create temp table _no (ad text primary key, no text);
grant all on _no to authenticated;
-- İZ BIRAKMAZ: hepsi tek işlemde, sonunda geri alınır — ardından koşan uçtan uca sınama (uctan-uca-fis.js) veritabanını
-- sinama-fis.sql'nin bıraktığı gibi bulmalı.
begin;

set role authenticated;
select pg_temp.kullanici('ali@atolye.local');

-- 2) SİPARİŞ BAĞ ÇÖZME
do $$
declare r jsonb;
begin
  r := public.fis_kes(jsonb_build_object('istek', 'istek-bag-1',
    'fis', jsonb_build_object('aile', 'stok', 'tur', 'Satış', 'onek', 'SF', 'cariId', 'c-yeni', 'siparisId', 'sip-9', 'siparisNo', 'SAT-9', 'tutar', 80),
    'stok', jsonb_build_object('satirlar', jsonb_build_array(
      jsonb_build_object('id', 'bag-s1', 'urunId', 'u-yeni', 'renk', 'Siyah', 'miktar', -1, 'kaynak', 'Satış', 'siparisId', 'sip-9', 'siparisNo', 'SAT-9', 'kalemId', 'k-1'),
      jsonb_build_object('id', 'bag-s2', 'urunId', 'u-yeni', 'renk', 'Siyah', 'miktar', 1, 'kaynak', 'Satınalma', 'rezervasyonSiparisId', 'sip-9'))),
    'cari', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'bag-c1', 'cari_id', 'c-yeni', 'tarih', '2026-10-31', 'yon', 'Borç',
      'tutar', 80, 'siparis_no', 'SAT-9', 'ek', jsonb_build_object('siparisId', 'sip-9', 'kalemId', 'k-1', 'miktar', 1, 'birimFiyat', 80))))));
  insert into _no values ('bag', r ->> 'fisNo') on conflict (ad) do update set no = excluded.no;
  -- düz güncelleme reddedilir
  begin
    update public.stk_hareket set siparis_id = null where id = 'bag-s1';
    raise exception 'sipariş bağı doğrudan değişti';
  exception when insufficient_privilege then null;
  end;
  r := public.fis_bag_coz('{"siparisId": "sip-9", "siparisNo": "SAT-9"}');
  assert (r ->> 'stok')::int = 1 and (r ->> 'cari')::int = 1 and (r ->> 'zincir')::int = 1, 'bağ çözme sayıları ' || r::text;
  assert (select siparis_id is null and kalem_id is null and siparis_no = 'SAT-9 (iptal)' and miktar = -1 from public.stk_hareket where id = 'bag-s1'), 'stok satırının bağı';
  assert (select rezervasyon_siparis_id is null from public.stk_hareket where id = 'bag-s2'), 'zincir bağı';
  assert (select siparis_no = 'SAT-9 (iptal)' and not (ek ? 'siparisId') and not (ek ? 'kalemId') and (ek ->> 'birimFiyat')::numeric = 80 and tutar = 80
          from public.car_hareket where id = 'bag-c1'), 'cari satırının bağı (fiyat / tutar korunmalı)';
  assert (select ek -> 'siparisIptal' ->> 'no' = 'SAT-9' from public.stk_fis where id = (select no from _no where ad = 'bag')), 'fiş başlığına not düşmedi';
  -- bağ kipi başka alanı değiştirmeye izin vermez (işlem dışında kip açılamaz; içeride bile miktar değişmez)
  begin
    perform set_config('fis.kapi', 'acik', true); perform set_config('fis.duzen', 'bag', true);
    update public.stk_hareket set miktar = -5 where id = 'bag-s1';
    raise exception 'bağ kipinde miktar değişti';
  exception when insufficient_privilege then perform set_config('fis.duzen', '', true); perform set_config('fis.kapi', '', true);
  end;
  raise notice 'TAMAM: sipariş bağı yalnız bağ alanlarında çözülüyor; miktar / tutar / fiyat aynı; doğrudan değişiklik reddediliyor';
end $$;

-- 3) RENK TAŞI (varyant düzeyinde)
do $$
declare
  r jsonb;
  stok_once numeric := (select coalesce(sum(miktar), 0) from public.stk_hareket where urun_id = 'u-yeni' and not iptal);
  hareket_once int := (select count(*) from public.stk_hareket where urun_id = 'u-yeni');
begin
  r := public.stk_renk_tasi('{"eslesmeler": [{"urunId": "u-yeni", "eski": "Siyah", "yeni": "1003 - Siyah"}]}');
  assert (r ->> 'varyant')::int >= 1, 'varyant taşınmadı ' || r::text;
  assert not exists (select 1 from public.stk_varyant v join public.stk_renk k on k.id = v.renk_id where v.urun_id = 'u-yeni' and k.ad = 'Siyah'),
    'eski renkli varyant kaldı';
  assert exists (select 1 from public.stk_varyant v join public.stk_renk k on k.id = v.renk_id where v.urun_id = 'u-yeni' and k.ad = '1003 - Siyah'),
    'yeni renkli varyant yok';
  assert (select coalesce(sum(miktar), 0) from public.stk_hareket where urun_id = 'u-yeni' and not iptal) = stok_once, 'stok değişti';
  assert (select count(*) from public.stk_hareket where urun_id = 'u-yeni') = hareket_once, 'hareket sayısı değişti';
  -- hedef varyant zaten varken (geri taşı → yeni "Siyah" serbest varyant yok; ileri-geri iki kez) hareketler birleşir
  r := public.stk_renk_tasi('{"eslesmeler": [{"urunId": "u-yeni", "eski": "1003 - Siyah", "yeni": "Siyah"}]}');
  assert (select coalesce(sum(miktar), 0) from public.stk_hareket where urun_id = 'u-yeni' and not iptal) = stok_once, 'geri taşımada stok değişti';
  raise notice 'TAMAM: renk varyant düzeyinde taşınıyor; stok ve hareketler aynı';
end $$;

-- 4) Hedef varyant varken birleşme: u-yeni için "1003 - Siyah" varyantını önceden aç (yönetici), sonra taşı → hareketler ona aktarılır
reset role;
select public.stk_varyant_coz('u-yeni', null, '1003 - Siyah', null, null) is not null as hedef_acildi;
set role authenticated;
select pg_temp.kullanici('ali@atolye.local');
do $$
declare
  r jsonb;
  stok_once numeric := (select coalesce(sum(miktar), 0) from public.stk_hareket where urun_id = 'u-yeni' and not iptal);
begin
  r := public.stk_renk_tasi('{"eslesmeler": [{"urunId": "u-yeni", "eski": "Siyah", "yeni": "1003 - Siyah"}]}');
  assert (r ->> 'tasinanHareket')::int > 0, 'hareket taşınmadı ' || r::text;
  assert not exists (select 1 from public.stk_hareket h join public.stk_varyant v on v.id = h.varyant_id join public.stk_renk k on k.id = v.renk_id
                     where h.urun_id = 'u-yeni' and k.ad = 'Siyah'), 'eski varyantta hareket kaldı';
  assert (select coalesce(sum(miktar), 0) from public.stk_hareket where urun_id = 'u-yeni' and not iptal) = stok_once, 'birleşmede stok değişti';
  raise notice 'TAMAM: hedef varyant varken hareketler ona taşınıyor (renk kipi), stok aynı';
end $$;

reset role;
rollback;

-- 5) Anonim çağıramaz
set role anon;
do $$ begin
  begin perform public.fis_bag_coz('{"siparisId": "x"}'); raise exception 'anonim bağ çözdü';
  exception when insufficient_privilege then raise notice 'TAMAM: anonim ek işlemleri çağıramıyor'; end;
end $$;
reset role;
