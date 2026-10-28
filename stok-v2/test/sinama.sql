-- STOK v2 — YEREL SINAMA (kos.sh çalıştırır; eski-tablolar.sql + stok-v2.sql + stok-v2-goc.sql'den sonra).
-- Her blok bir kuralı doğrular; tutmazsa `assert` hatayla durur (ON_ERROR_STOP). Geçen blok "TAMAM: …" yazar.
\set ON_ERROR_STOP 1
\pset pager off

-- Ortak: kullanıcı olarak çağırmak (Supabase'te uygulamanın oturumu) ve SQL Editor'a dönmek.
create or replace function pg_temp.kullanici(eposta text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('email', eposta, 'role', 'authenticated')::text, false)
$$;
create or replace function pg_temp.editor() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;
create or replace function pg_temp.stok(p_urun text, p_renk text, p_olcu text) returns numeric language sql security definer as $$   -- stk_nrm uygulamaya kapalı
  select miktar from public.stk_stok
  where urun_id = p_urun and public.stk_nrm(renk_ad) is not distinct from public.stk_nrm(p_renk)
    and public.stk_nrm(olcu_ad) is not distinct from public.stk_nrm(p_olcu)
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 1) AYNA: tanımlar stk_renk / stk_olcu'ya yansıdı (kurulumdaki ilk aynalama)
do $$ begin
  assert (select ad from public.stk_renk where id = 'r-taba') = 'Taba', 'hammadde rengi aynalanmadı';
  assert (select ad from public.stk_renk where id = 'kombi-1') = '1058 - Taba/Siyah', 'model rengi etiketi yanlış';
  assert (select tur from public.stk_renk where id = 'kombi-1') = 'model', 'model rengi türü yanlış';
  assert (select count(*) from public.stk_olcu where tur <> 'serbest') = 2, 'bedenler aynalanmadı';
  raise notice 'TAMAM: tanımlar aynası';
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2) GÖÇ
select jsonb_pretty(public.stk_goc()) as goc_raporu \gset
\echo :goc_raporu
do $$
declare r jsonb := public.stk_goc();   -- tekrar çalıştırılabilir olmalı (geçişe kadar): aynı sonuç
begin
  assert (r ->> 'eskiVaryant')::int = 7, 'eski varyant sayısı ' || (r ->> 'eskiVaryant');
  assert (r ->> 'varyant')::int = 6, 'varyant sayısı ' || (r ->> 'varyant');      -- silinmiş ürünün varyantı yok
  assert (r ->> 'farkSatiri')::int = 1, 'fark satırı ' || (r ->> 'farkSatiri');   -- yalnız Kahve/37: 5 − 3
  assert r -> 'serbestRenk' = '["Eski Bordo"]'::jsonb, 'serbest renk ' || (r ->> 'serbestRenk');
  assert r -> 'serbestOlcu' = '["XL"]'::jsonb, 'serbest ölçü ' || (r ->> 'serbestOlcu');
  assert r -> 'defterdeIptalAmaHareketiVar' = '["F-3"]'::jsonb, 'tutarsız iptal ' || (r ->> 'defterdeIptalAmaHareketiVar');
  assert jsonb_array_length(r -> 'atlanan') = 3, 'atlanan ' || (r ->> 'atlanan');  -- silinmiş ürün varyantı + h7 + h8
  assert (r ->> 'iptalFis')::int = 1, 'iptal fiş ' || (r ->> 'iptalFis');          -- F-2
  raise notice 'TAMAM: göç raporu (ikinci çalıştırma)';
end $$;

-- 3) Göçten sonra her ürün × renk × ölçünün stoğu bugünküyle AYNI
select * from public.stk_goc_karsilastir() order by 1, 2, 3;
do $$ begin
  assert not exists (select 1 from public.stk_goc_karsilastir() where fark <> 0), 'göç sonrası stok farkı var';
  assert pg_temp.stok('u-kosele', 'Siyah', null) = -4, 'eksi stok kırpıldı';
  assert pg_temp.stok('u-canta', '1058 - Taba/Siyah', '36') = 10, 'iptal fiş (F-2, +50) stoğa sayıldı';
  assert pg_temp.stok('u-iplik', null, null) = 0, 'hareketsiz ürün';
  raise notice 'TAMAM: göç sonrası stok = bugünkü stok';
end $$;

-- 4) Kimlikler ve fiş başlıkları
do $$ begin
  -- Bayat renk kimliği (r-siyah) ada göre düzeldi: Kösele/Taba → r-taba
  assert exists (select 1 from public.stk_varyant where urun_id = 'u-kosele' and renk_id = 'r-taba'), 'bayat renk kimliği izlendi';
  -- "siyah" (küçük harf) hareketi Siyah varyantına bağlandı
  assert (select v.renk_id from public.stk_hareket h join public.stk_varyant v on v.id = h.varyant_id where h.id = 'h4') = 'r-siyah', 'küçük harf eşleşmedi';
  -- Kodsuz mamul rengi "Kahve" hammadde rengi kimliğine bağlandı (serbest açılmadı)
  assert exists (select 1 from public.stk_varyant where urun_id = 'u-canta' and renk_id = 'r-kahve'), 'Kahve kimliğe bağlanmadı';
  -- Fiş başlığı defterden: tür, kullanıcı, stok tarihi
  assert (select tur || '|' || kullanici || '|' || to_char(tarih at time zone 'UTC', 'HH24:MI') from public.stk_fis where id = 'F-1') = 'Alış|Ali|08:30', 'F-1 başlığı';
  assert (select siparis_id from public.stk_fis where id = 'F-4') = 'sip-100', 'F-4 sipariş kimliği defterden gelmedi';
  -- Fişsiz eski hareket kendi fişini aldı
  assert exists (select 1 from public.stk_fis where id = 'ESKI-h6' and goc), 'fişsiz hareketin fişi yok';
  -- İptal fiş satırlarıyla taşındı
  assert (select count(*) from public.stk_hareket where fis_id = 'F-2') = 1, 'iptal fiş satırı yok';
  raise notice 'TAMAM: kimlikler ve fiş başlıkları';
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5) FİŞSİZ HAREKET VERİTABANINDA İMKÂNSIZ; sıfır miktar da
do $$ begin
  begin
    insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar) values ('x1', null, (select id from public.stk_varyant limit 1), 'u-canta', 1);
    raise exception 'fişsiz hareket yazılabildi';
  exception when not_null_violation then null; end;
  begin
    insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar) values ('x2', 'F-1', (select id from public.stk_varyant limit 1), 'u-canta', 0);
    raise exception 'sıfır miktar yazılabildi';
  exception when check_violation then null; end;
  raise notice 'TAMAM: fişsiz / sıfır hareket reddedildi';
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 6) UYGULAMA OTURUMU: tablolara doğrudan yazamaz, okuyabilir
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  assert (select count(*) from public.stk_stok) = 6, 'okuma yok';
  begin
    insert into public.stk_fis (id, tur) values ('YASAK', 'Manuel');
    raise exception 'uygulama stk_fis''e doğrudan yazabildi';
  exception when insufficient_privilege then null; end;
  begin
    perform public.stk_goc();
    raise exception 'uygulama göçü çalıştırabildi';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: doğrudan yazma ve göç uygulamaya kapalı';
end $$;

-- 7) FİŞ KAYDET — tek işlem, eksi stok kırpılmaz, aynı fiş iki kez yazılmaz
do $$
declare
  p jsonb := '{"id": "F-100", "tur": "Satış", "kaynak": "Satış", "cariId": "c-2", "siparisId": "sip-200", "kullanici": "Ali",
               "satirlar": [
                 {"id": "h100-1", "urunId": "u-canta", "renkId": "kombi-1", "olcuId": "b-36", "miktar": -3, "kalemId": "k1"},
                 {"id": "h100-2", "urunId": "u-kosele", "renk": "Siyah", "miktar": -10}]}';
  r jsonb;
begin
  r := public.stk_fis_kaydet(p);
  assert (r ->> 'zatenVar')::boolean = false, 'ilk kayıt zatenVar döndü';
  assert jsonb_array_length(r -> 'bakiye') = 2, 'bakiye dönmedi';
  assert pg_temp.stok('u-canta', '1058 - Taba/Siyah', '36') = 7, 'satış düşmedi';
  assert pg_temp.stok('u-kosele', 'Siyah', null) = -14, 'eksi stok kırpıldı';
  assert (select olusturan from public.stk_fis where id = 'F-100') = 'ali@atolye.local', 'oluşturan yazılmadı';
  assert (select siparis_id from public.stk_hareket where id = 'h100-2') = 'sip-200', 'satıra başlıktan sipariş geçmedi';
  -- Ağda düşüp yeniden gönderilen aynı fiş: yazılmaz
  r := public.stk_fis_kaydet(p);
  assert (r ->> 'zatenVar')::boolean, 'yeniden gönderim zatenVar dönmedi';
  assert pg_temp.stok('u-canta', '1058 - Taba/Siyah', '36') = 7, 'yeniden gönderim iki kez düştü';
  -- Aynı fiş no başka içerikle: reddedilir
  begin
    perform public.stk_fis_kaydet(jsonb_set(p, '{satirlar,0,miktar}', '-4'));
    raise exception 'fiş no çakışması kabul edildi';
  exception when unique_violation then null; end;
  raise notice 'TAMAM: fiş kaydet (tek işlem, eksi stok, yeniden gönderim)';
end $$;

-- 8) FİŞ KAYDET — satırlardan biri hatalıysa HİÇBİR ŞEY yazılmaz
do $$ begin
  begin
    perform public.stk_fis_kaydet('{"id": "F-101", "satirlar": [
      {"id": "h101-1", "urunId": "u-canta", "renkId": "kombi-1", "olcuId": "b-36", "miktar": 5},
      {"id": "h101-2", "urunId": "u-yok", "renk": "Siyah", "miktar": 1}]}');
    raise exception 'olmayan ürünlü fiş kabul edildi';
  exception when no_data_found then null; end;
  assert not exists (select 1 from public.stk_fis where id = 'F-101'), 'yarım fiş başlığı kaldı';
  assert not exists (select 1 from public.stk_hareket where id = 'h101-1'), 'yarım fişin ilk satırı kaldı';
  assert pg_temp.stok('u-canta', '1058 - Taba/Siyah', '36') = 7, 'yarım fiş stoğu değiştirdi';
  begin
    perform public.stk_fis_kaydet('{"id": "F-102", "satirlar": []}');
    raise exception 'boş fiş kabul edildi';
  exception when invalid_parameter_value then null; end;
  raise notice 'TAMAM: hatalı fiş hiç yazılmadı';
end $$;

-- 9) YENİ RENK/ÖLÇÜ: fişte adı verilen tanımsız renk 'serbest' açılır, varyant kendiliğinden açılır
do $$
declare r jsonb;
begin
  r := public.stk_fis_kaydet('{"id": "F-103", "tur": "Giriş", "satirlar": [{"id": "h103-1", "urunId": "u-iplik", "renk": "Lacivert", "beden": "Standart", "miktar": 25}]}');
  assert pg_temp.stok('u-iplik', 'Lacivert', null) = 25, 'yeni varyanta giriş';
  assert (select tur from public.stk_renk where ad = 'Lacivert') = 'serbest', 'tanımsız renk serbest açılmadı';
  raise notice 'TAMAM: yeni varyant fişle açıldı';
end $$;

-- 10) FİŞ İPTAL — silinmez, stoktan düşer, tekrar çağrı zararsız
do $$
declare r jsonb;
begin
  r := public.stk_fis_iptal('F-100', 'yanlış sipariş');
  assert (r ->> 'zatenIptal')::boolean = false, 'ilk iptal zatenIptal';
  assert pg_temp.stok('u-canta', '1058 - Taba/Siyah', '36') = 10, 'iptal stoğu geri vermedi';
  assert pg_temp.stok('u-kosele', 'Siyah', null) = -4, 'iptal eksi stoğu geri vermedi';
  assert (select iptal_eden from public.stk_fis where id = 'F-100') = 'ali@atolye.local', 'iptal eden yazılmadı';
  assert (select count(*) from public.stk_hareket where fis_id = 'F-100') = 2, 'iptal satırları sildi';
  r := public.stk_fis_iptal('F-100');
  assert (r ->> 'zatenIptal')::boolean, 'ikinci iptal zatenIptal dönmedi';
  assert pg_temp.stok('u-canta', '1058 - Taba/Siyah', '36') = 10, 'ikinci iptal stoğu değiştirdi';
  raise notice 'TAMAM: fiş iptal';
end $$;

-- 11) VARYANT AÇ / KALDIR / MİN STOK
do $$
declare r jsonb; vid text;
begin
  r := public.stk_varyant_ac('{"urunId": "u-canta", "renkId": "kombi-1", "olcuId": "b-37", "minStok": 3}');
  vid := r ->> 'varyantId';
  assert (select min_stok from public.stk_varyant where id = vid) = 3, 'min stok yazılmadı';
  assert (public.stk_varyant_ac('{"urunId": "u-canta", "renk": "1058 - Taba/Siyah", "beden": "37"}') ->> 'varyantId') = vid, 'aynı varyant ikinci kez açıldı';
  assert (public.stk_varyant_kaldir(vid) ->> 'sonuc') = 'silindi', 'hareketsiz varyant silinmedi';
  -- Stoğu olan varyant kaldırılamaz
  begin
    perform public.stk_varyant_kaldir((select varyant_id from public.stk_stok where urun_id = 'u-kosele' and renk_id = 'r-taba'));
    raise exception 'stoklu varyant kaldırıldı';
  exception when check_violation then null; end;
  -- Hareketi olan, stoğu sıfır varyant pasife alınır (geçmiş kalır)
  vid := (select varyant_id from public.stk_stok where urun_id = 'u-canta' and renk_id = 'r-kahve');
  perform public.stk_fis_kaydet(jsonb_build_object('id', 'F-104', 'tur', 'Sayım', 'satirlar',
    jsonb_build_array(jsonb_build_object('id', 'h104-1', 'urunId', 'u-canta', 'renkId', 'r-kahve', 'olcuId', 'b-37', 'miktar', -5))));
  assert (public.stk_varyant_kaldir(vid) ->> 'sonuc') = 'pasif', 'hareketli varyant pasife alınmadı';
  assert (select aktif from public.stk_varyant where id = vid) = false, 'pasif işaretlenmedi';
  perform public.stk_min_stok((select varyant_id from public.stk_stok where urun_id = 'u-kosele' and renk_id = 'r-siyah'), 8);
  assert (select min_stok from public.stk_stok where urun_id = 'u-kosele' and renk_id = 'r-siyah') = 8, 'min stok güncellenmedi';
  raise notice 'TAMAM: varyant aç / kaldır / min stok';
end $$;

-- 12) YETKİ — Tanımlar'daki kullanıcı yetkisi sunucuda da geçerli
select pg_temp.kullanici('veli@atolye.local') \gset   -- stok: kaydetme yok
do $$ begin
  begin
    perform public.stk_fis_kaydet('{"id": "F-200", "satirlar": [{"id": "h200-1", "urunId": "u-iplik", "miktar": 1}]}');
    raise exception 'yetkisiz kullanıcı fiş yazabildi';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: yetkisiz kullanıcı reddedildi';
end $$;
select pg_temp.kullanici('ayse@atolye.local') \gset   -- stok: kaydetme var, silme yok
do $$ begin
  perform public.stk_fis_kaydet('{"id": "F-201", "satirlar": [{"id": "h201-1", "urunId": "u-iplik", "miktar": 1}]}');
  begin
    perform public.stk_fis_iptal('F-201');
    raise exception 'silme yetkisi olmayan iptal edebildi';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: kaydetme var / silme yok';
end $$;
select pg_temp.kullanici('yabanci@ornek.com') \gset   -- listede yok
do $$ begin
  begin
    perform public.stk_fis_kaydet('{"id": "F-202", "satirlar": [{"id": "h202-1", "urunId": "u-iplik", "miktar": 1}]}');
    raise exception 'listede olmayan kullanıcı yazabildi';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: listede olmayan kullanıcı reddedildi';
end $$;
reset role;
select pg_temp.editor() \gset

-- ---------------------------------------------------------------------------------------------------------------------
-- 13) RENK ADI DEĞİŞİMİ tek güncelleme: varyant/hareket satırına dokunulmadan her yerde yeni ad
do $$
declare n_once bigint := (select count(*) from public.stk_hareket);
begin
  update public.tanimlar set veri = jsonb_set(veri, '{renkler,1,ad}', '"Taba Süet"') where id = 'tekil';
  assert (select ad from public.stk_renk where id = 'r-taba') = 'Taba Süet', 'hammadde adı güncellenmedi';
  assert (select ad from public.stk_renk where id = 'kombi-1') = '1058 - Taba Süet/Siyah', 'model etiketi güncellenmedi';
  assert pg_temp.stok('u-kosele', 'Taba Süet', null) = 7, 'stok yeni adla görünmüyor';
  assert pg_temp.stok('u-canta', '1058 - Taba Süet/Siyah', '36') = 10, 'model renkli stok yeni adla görünmüyor';
  assert (select count(*) from public.stk_hareket) = n_once, 'ad değişimi hareket yazdı';
  -- Tanımdan silinen renk pasif olur, varyant ve stoğu yerinde kalır
  update public.tanimlar set veri = jsonb_set(veri, '{renkler}', (veri -> 'renkler') - 2) where id = 'tekil';   -- Kahve
  assert (select aktif from public.stk_renk where id = 'r-kahve') = false, 'silinen renk pasife alınmadı';
  assert exists (select 1 from public.stk_varyant where renk_id = 'r-kahve'), 'silinen rengin varyantı gitti';
  raise notice 'TAMAM: renk adı değişimi / silinen renk';
end $$;

-- 14) GÖÇ, uygulamadan fiş yazıldıktan sonra yeniden çalışmaz (yeni kayıtlar silinmesin)
do $$ begin
  begin
    perform public.stk_goc();
    raise exception 'göç, uygulama fişleri varken yeniden çalıştı';
  exception when object_not_in_prerequisite_state then null; end;
  raise notice 'TAMAM: göç kilidi';
end $$;

-- 15) Değişiklik sayacı ve silme arşivi bağlandı
do $$ begin
  assert (select (sayaclar ->> 'stk_hareket')::int > 0 from public.degisiklik where id = 'tekil'), 'değişiklik sayacı artmadı';
  assert exists (select 1 from public.silinen_arsiv where tablo = 'stk_varyant'), 'silinen varyant arşive düşmedi';
  assert not exists (select 1 from public.silinen_arsiv where tablo in ('stk_fis', 'stk_hareket')), 'göç arşivi doldurdu';
  raise notice 'TAMAM: değişiklik sayacı ve arşiv';
end $$;

-- 16) GEÇİŞ DÖNEMİNDE BUGÜNKÜ UYGULAMA BOZULMAZ
do $$
declare yedek jsonb := (select veri from public.tanimlar where id = 'tekil');
begin
  -- Tanımlar'da yinelenen kimlik (eski veride görülebilir) aynayı bozmaz
  update public.tanimlar set veri = jsonb_set(veri, '{bedenler}', (veri -> 'bedenler') || (veri -> 'bedenler' -> 0)) where id = 'tekil';
  assert (select count(*) from public.stk_olcu where id = 'b-36') = 1, 'yinelenen beden';
  -- Ayna hata verse bile Tanımlar kaydı yazılır (yalnız uyarı)
  update public.tanimlar set veri = jsonb_set(veri, '{bedenler}', '{"bozuk": true}') where id = 'tekil';
  assert (select veri -> 'bedenler' ->> 'bozuk' from public.tanimlar where id = 'tekil') = 'true', 'bozuk tanım kaydı düştü';
  update public.tanimlar set veri = yedek where id = 'tekil';
  -- Bugünkü uygulama hareketli bir ürünü silebilmeli (v2'de bağ yok; ürün modülü geçince pasife alma gelecek)
  delete from public.urunler where id = 'u-eski';
  raise notice 'TAMAM: geçiş döneminde bugünkü uygulama bozulmaz';
end $$;

\echo 'SINAMA BITTI'
