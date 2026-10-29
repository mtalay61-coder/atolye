-- VERİ SIFIRLAMA (v1.730.2, veri-sifirla.sql) — bütün geçişleri ve 15. adımı yapılmış veritabanında (canlının aynısı).
\set ON_ERROR_STOP 1
\pset pager off
create or replace function pg_temp.kullanici(eposta text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('email', eposta, 'role', 'authenticated')::text, false)
$$;
create or replace function pg_temp.editor() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;
select pg_temp.editor() \gset
create temp table _once as select sayaclar from public.degisiklik;

-- 1) Onaysız ve uygulamadan çalışmaz
do $$ begin
  begin
    perform public.veri_sifirla('evet');
    raise exception 'onaysız sıfırladı';
  exception when invalid_parameter_value then null; end;
  raise notice 'TAMAM: onay sözcüğü olmadan çalışmaz';
end $$;
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  begin
    perform public.veri_sifirla('SIFIRLA');
    raise exception 'uygulamadan sıfırlandı';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: uygulamadan çağrılamaz';
end $$;
reset role;
select pg_temp.editor() \gset

-- 1b) Eski tabloya bağlı görünüm (canlıda: vitrin_urunler → eski_varyantlar). Bilinmeyen bağımlı varsa HİÇBİR ŞEY silinmez.
create view public.vitrin_urunler with (security_invoker = true) as select urun_id, renk from public.eski_varyantlar;
create view public.baska_gorunum as select urun_id from public.eski_varyantlar;
do $$ begin
  begin
    perform public.veri_sifirla('SIFIRLA');
    raise exception 'bilinmeyen bağımlıyla sıfırladı';
  exception when dependent_objects_still_exist then
    assert sqlerrm like '%baska_gorunum%' and sqlerrm not like '%vitrin_urunler%', 'mesaj: ' || sqlerrm;
  end;
  assert (select count(*) from public.urunler) > 0 and to_regclass('public.eski_varyantlar') is not null, 'bir şey silindi';
  raise notice 'TAMAM: bilinmeyen bağımlı varken hiçbir şey silinmedi';
end $$;
drop view public.baska_gorunum;

-- 1c) Boşaltılacak tabloya dışarıdan bağlı tablo (canlıda: hesap_hareketleri → cariler): tek hatada listelenir, hiçbir şey
--     silinmez; açıkça adı verilince boşaltılır. Korunan tablo verilemez.
create table public.hesap_hareketleri (id text primary key, cari_id text references public.cariler(id), tutar numeric);
insert into public.hesap_hareketleri select 'hh1', id, 5 from public.cariler limit 1;
do $$ begin
  begin
    perform public.veri_sifirla('SIFIRLA');
    raise exception 'dış bağlı tabloyla sıfırladı';
  exception when dependent_objects_still_exist then
    assert sqlerrm like '%hesap_hareketleri (1 satır) → cariler%', 'mesaj: ' || sqlerrm;
  end;
  begin
    perform public.veri_sifirla('SIFIRLA', array['tanimlar']);
    raise exception 'korunan tablo verildi';
  exception when invalid_parameter_value then null; end;
  assert to_regclass('public.eski_varyantlar') is not null and (select count(*) from public.cariler) > 0, 'bir şey silindi';
  raise notice 'TAMAM: dış bağlı tablo tek hatada listelendi, korunan tablo verilemez, hiçbir şey silinmedi';
end $$;

-- 2) Sıfırla
do $$
declare r jsonb := public.veri_sifirla('SIFIRLA', array['hesap_hareketleri']);
begin
  assert (r -> 'bosaltilan' ->> 'hesap_hareketleri')::int = 1 and (select count(*) from public.hesap_hareketleri) = 0, 'ek tablo ' || r::text;
  assert r -> 'kaldirilanGorunumler' = '["vitrin_urunler"]'::jsonb and to_regclass('public.vitrin_urunler') is null, 'vitrin_urunler ' || r::text;
  assert jsonb_array_length(r -> 'silinenTablolar') >= 5, 'eski tablolar ' || r::text;
  assert not exists (select 1 from pg_tables where schemaname = 'public' and tablename like 'eski\_%'), 'eski tablo kaldı';
  assert to_regprocedure('public.kas_geri_don()') is null and to_regprocedure('public.stk_gecis()') is null, 'geri dönüş işlevi kaldı';
  assert (r -> 'bosaltilan' ->> 'urunler')::int > 0 and (r -> 'bosaltilan' ->> 'lst_kayit')::int > 0, 'boşaltılan raporu ' || r::text;
  raise notice 'TAMAM: sıfırlandı %', r;
end $$;
do $$
declare t jsonb := (select veri from public.tanimlar where id = 'tekil');
  n bigint;
begin
  select count(*) into n from public.urunler; assert n = 0, 'urunler';
  select count(*) into n from public.stk_hareket; assert n = 0, 'stk_hareket';
  select count(*) into n from public.car_hareket; assert n = 0, 'car_hareket';
  select count(*) into n from public.lst_kayit; assert n = 0, 'lst_kayit';
  select count(*) into n from public.kas_hesap; assert n = 0, 'kas_hesap';
  assert (select array_agg(k order by k) from jsonb_object_keys(t) k) = array['girisAktifMi', 'kullanicilar'], 'tanımlar ' || t::text;
  assert jsonb_array_length(t -> 'kullanicilar') = 3, 'kullanıcılar gitti';
  assert (select veri from public.muhasebe) = '{"kasalar": [], "bankalar": [], "cekler": []}'::jsonb, 'kasa belgesi ' || (select veri::text from public.muhasebe);
  assert (select veri from public.teklifler) = '[]'::jsonb and (select veri from public.fis_defteri) = '[]'::jsonb, 'listeler';
  assert (select count(*) from public.varyantlar) = 0 and (select count(*) from public.stok_hareketleri) = 0 and (select count(*) from public.cari_hareketleri) = 0, 'görünümler';
  assert (select aktif and cari_aktif and alt_aktif and kasa_aktif and liste_aktif from public.stk_ayar), 'bayraklar kapandı';
  assert (select (sayaclar ->> 'urunler')::bigint from public.degisiklik) > coalesce((select (sayaclar ->> 'urunler')::bigint from _once), 0), 'sayaç artmadı';
  raise notice 'TAMAM: tanımlarda yalnız kullanıcılar, görünümler boş, bayraklar açık, sayaç arttı';
end $$;

-- 3) Sıfırdan yazma çalışıyor (yeni yapı yerinde)
insert into public.urunler (id, ad) values ('u-yeni', 'Yeni Ürün');
insert into public.cariler (id, unvan) values ('c-yeni', 'Yeni Cari');
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$
declare r jsonb;
begin
  r := public.fis_yaz('{"stok": {"satirlar": [{"id": "y1", "fisId": "ALS-1", "urunId": "u-yeni", "renk": "Siyah", "miktar": 10, "kaynak": "Satınalma"}]},
                        "cari": {"satirlar": [{"id": "yc1", "cari_id": "c-yeni", "tarih": "2026-10-30", "yon": "Borç", "tutar": 100, "fis_no": "ALS-1"}]},
                        "kasa": {"hesaplar": [{"id": "K1", "tur": "kasa", "veri": {"ad": "Merkez Kasa", "paraBirimi": "TRY"}}]}}');
  assert (select sum(miktar) from public.varyantlar where urun_id = 'u-yeni') = 10, 'stok';
  assert (select count(*) from public.cari_hareketleri where cari_id = 'c-yeni') = 1, 'cari';
  assert (select jsonb_array_length(veri -> 'kasalar') from public.muhasebe) = 1, 'kasa';
  perform public.lst_yaz('{"tablo": "mesajlar", "kayitlar": [{"id": "m1", "veri": {"id": "m1", "metin": "ilk"}}]}');
  assert (select jsonb_array_length(veri) from public.mesajlar) = 1, 'mesaj';
  raise notice 'TAMAM: sıfırdan yazma (fiş + cari + kasa tek işlem, mesaj)';
end $$;
reset role;
\echo 'SINAMA (SIFIRLA) BITTI'
