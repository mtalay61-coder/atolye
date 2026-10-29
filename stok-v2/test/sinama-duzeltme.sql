-- v1.730.1 DENETİM DÜZELTMELERİ — bütün geçişleri yapılmış veritabanında (canlının aynısı), editor/15-duzeltme.sql
-- verildikten ve cari-v2.sql / alt-v2.sql YENİDEN çalıştırıldıktan sonra. kos.sh çalıştırır.
\set ON_ERROR_STOP 1
\pset pager off
create or replace function pg_temp.kullanici(eposta text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('email', eposta, 'role', 'authenticated')::text, false)
$$;
create or replace function pg_temp.editor() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;
select pg_temp.editor() \gset

-- 1) fis_yaz kurulum dosyaları yeniden çalıştırılınca DARALMAZ; tanımadığı parçayı sessizce atlamaz
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$
declare r jsonb;
begin
  r := public.fis_yaz('{"kasa": {"hareketler": [{"id": "dz-k1", "hesap_id": "kasa-1", "veri": {"id": "dz-k1", "tarih": "2026-10-30", "yon": "Giriş", "tutar": 7}}]},
                        "alt": {"siparis_kalemleri": {"satirlar": [{"id": "k1", "karsilanan": 6}]}}}');
  assert r -> 'kasa' is not null and r -> 'alt' is not null, 'fis_yaz parça düşürdü ' || r::text;
  assert exists (select 1 from public.kas_hareket where id = 'dz-k1'), 'kasa satırı yazılmadı';
  assert (select karsilanan from public.siparis_kalemleri where id = 'k1') = 6, 'kalem yazılmadı';
  begin
    perform public.fis_yaz('{"kasaa": {"hareketler": []}}');
    raise exception 'tanınmayan parça sessizce atlandı';
  exception when invalid_parameter_value then null; end;
  raise notice 'TAMAM: fis_yaz tam tanım (cari-v2 / alt-v2 yeniden çalıştırıldıktan sonra)';
end $$;

-- 2) Aynı kimlik iki kez gelirse SONUNCUSU (alt_yaz, kas_yaz — car_yaz / lst_yaz ile aynı)
do $$ begin
  perform public.alt_yaz('{"siparis_kalemleri": {"satirlar": [{"id": "k1", "karsilanan": 1}, {"id": "k1", "karsilanan": 2}]}}');
  assert (select karsilanan from public.siparis_kalemleri where id = 'k1') = 2, 'alt_yaz ilkini yazdı';
  perform public.kas_yaz('{"hareketler": [{"id": "dz-k2", "hesap_id": "kasa-1", "veri": {"n": 1}}, {"id": "dz-k2", "hesap_id": "kasa-1", "veri": {"n": 2}}]}');
  assert (select veri ->> 'n' from public.kas_hareket where id = 'dz-k2') = '2', 'kas_yaz ilkini yazdı';
  raise notice 'TAMAM: aynı kimlikte son gelen';
end $$;

-- 3) Liste: sırasız yeni kayıt istemcinin "sona" sırasıyla aynı ölçekte (sona eklenenlerin önüne geçmez)
do $$
declare son numeric := extract(epoch from clock_timestamp()) * 1000000;
begin
  perform public.lst_yaz(jsonb_build_object('tablo', 'koliler', 'kayitlar', jsonb_build_array(
    jsonb_build_object('id', 'dz-a', 'sira', son - 5000000, 'veri', jsonb_build_object('id', 'dz-a')))));
  perform public.lst_yaz('{"tablo": "koliler", "kayitlar": [{"id": "dz-b", "veri": {"id": "dz-b"}}]}');
  assert (select sira from public.lst_kayit where tablo = 'koliler' and id = 'dz-b')
       > (select sira from public.lst_kayit where tablo = 'koliler' and id = 'dz-a'), 'sırasız yeni kayıt sona düşmedi';
  raise notice 'TAMAM: liste sıra ölçeği';
end $$;

-- 4) Tanımlar koruması: giriş anahtarı, silme ve yeniden ekleme yalnız Yönetici (yetki_var_mi atlatılamaz)
select pg_temp.kullanici('veli@atolye.local') \gset
do $$ begin
  begin
    update public.tanimlar set veri = veri || '{"girisAktifMi": false}' where id = 'tekil';
    raise exception 'yetkisiz kullanıcı giriş sistemini kapattı';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.tanimlar where id = 'tekil';
    raise exception 'yetkisiz kullanıcı tanımları sildi';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.tanimlar (id, veri) values ('ikinci', '{}');
    raise exception 'yetkisiz kullanıcı ikinci tanım satırı ekledi';
  exception when insufficient_privilege then null; end;
  -- Upsert (uygulamanın yazması): satır varsa karar UPDATE'te — renk eklemek serbest
  insert into public.tanimlar (id, veri) select 'tekil', veri || '{"dzNot": 1}' from public.tanimlar where id = 'tekil'
    on conflict (id) do update set veri = excluded.veri;
  assert (select veri ->> 'dzNot' from public.tanimlar where id = 'tekil') = '1', 'izinli tanım yazması reddedildi';
  begin
    perform public.stk_yaz('{"satirlar": [{"id": "dz-s1", "fisId": "DZ-1", "urunId": "u-kosele", "renk": "Siyah", "miktar": 1, "kaynak": "Sayım"}]}');
    raise exception 'hiç kaydetme yetkisi olmayan stok yazdı';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: tanımlar koruması, yetki atlatılamaz';
end $$;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  update public.tanimlar set veri = veri || '{"girisAktifMi": true}' where id = 'tekil';
  raise notice 'TAMAM: yönetici giriş ayarını değiştirebilir';
end $$;
reset role;
select pg_temp.editor() \gset

-- 5) Geri dönüşten sonra v2 yazması REDDEDİLİR (açık cihazın yazması kaybolmasın); yeniden geçişte açılır
select public.kas_geri_don() is not null as geri \gset
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  begin
    perform public.kas_yaz('{"hareketler": [{"id": "dz-k3", "hesap_id": "kasa-1", "veri": {"id": "dz-k3"}}]}');
    raise exception 'geri dönüşten sonra kas_yaz kabul edildi';
  exception when object_not_in_prerequisite_state then null; end;
  raise notice 'TAMAM: geri dönüşten sonra v2 yazması reddedildi';
end $$;
reset role;
select pg_temp.editor() \gset
select public.kas_gecis() is not null as gecis \gset
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  perform public.kas_yaz('{"hareketler": [{"id": "dz-k4", "hesap_id": "kasa-1", "veri": {"id": "dz-k4"}}]}');
  raise notice 'TAMAM: yeniden geçişte v2 yazması açık';
end $$;
reset role;
select pg_temp.editor() \gset

-- 6) stk_goc_karsilastir geçişten sonra ESKİ tabloyla karşılaştırır (v2'yi kendisiyle değil)
do $$ begin
  assert (select count(*) from public.stk_goc_karsilastir() where eski <> 0) > 0, 'eski varyantlar okunmadı';
  raise notice 'TAMAM: göç karşılaştırması eski tabloyla';
end $$;

-- 7) Carisi silinmiş hareket cari geri dönüşünü düşürmez (atlanır, raporlanır)
do $$
declare r jsonb;
begin
  insert into public.cariler (id, unvan) values ('c-dz', 'Silinecek Cari');
  insert into public.car_hareket (id, cari_id, tarih, yon, tutar, fis_no) values ('dz-c1', 'c-dz', '2026-10-30', 'Borç', 5, 'DZ-C1');
  delete from public.cariler where id = 'c-dz';
  r := public.car_geri_don();
  assert r ->> 'geriDonus' = 'tamam' and r -> 'carisiYokAtlanan' ? 'dz-c1', 'cari geri dönüş ' || r::text;
  perform public.car_gecis();
  raise notice 'TAMAM: carisi silinmiş hareket geri dönüşü düşürmedi';
end $$;
\echo 'SINAMA (DUZELTME) BITTI'
