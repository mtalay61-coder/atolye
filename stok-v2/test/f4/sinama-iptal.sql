-- Yerel PostgreSQL / gömülü PostgreSQL. Supabase'e verilmez. Her kontrol gerçek PL/pgSQL işlevlerini çağırır.
begin;
insert into public.urunler(id,ad,kategori) values ('u-f4-sinama','F4 sınama ürünü','Mamul');
insert into public.siparisler(id,siparis_no,tip,durum) values ('f4-s','F4-S','Satış','Bekliyor');
insert into public.siparis_kalemleri(id,siparis_id,urun_id,renk,miktar,karsilanan)
 values ('f4-k','f4-s','u-f4-sinama','Kahve',20,0);
insert into public.siparisler(id,siparis_no,tip,durum) values ('f4-hata','F4-HATA','Satış','Bekliyor');
insert into public.siparis_kalemleri(id,siparis_id,urun_id,renk,miktar,karsilanan)
 values ('f4-hata-k','f4-hata','u-f4-sinama','Kahve',20,0);
create function pg_temp.f4_hata_enjekte() returns trigger language plpgsql as $$
begin
  if new.id='f4-hata' and new.durum='İptal' then raise exception 'F4_KASITLI_HATA'; end if;
  return new;
end $$;
create trigger f4_hata before update on public.siparisler for each row execute function pg_temp.f4_hata_enjekte();
select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true);
set local role authenticated;
do $$
declare r jsonb; onceki int; reddedildi boolean := false;
begin
  -- Teslim önce tamamlanmışsa iptal bu hareketi geçmiş bağa taşır; stok ve miktar korunur.
  r := public.fis_kes('{"istek":"f4-ilk-teslim","fis":{"aile":"stok","tur":"Satış","onek":"SF","siparisId":"f4-s"},"stok":{"satirlar":[{"id":"f4-ilk-h","urunId":"u-f4-sinama","renk":"Kahve","miktar":-2,"kaynak":"Satış","kalemId":"f4-k","siparisId":"f4-s"}]}}');
  r := public.fis_bag_coz('{"siparisId":"f4-s","siparisNo":"BAYAT-NO"}');
  assert (select durum from public.siparisler where id='f4-s') = 'İptal', 'F4: bağ çözme ve durum aynı işlemde olmalı';
  assert exists(select 1 from public.stk_hareket where id='f4-ilk-h' and miktar=-2 and not iptal
    and kalem_id is null and gecmis_kalem_id='f4-k' and siparis_no='F4-S (iptal)'), 'F4: geçmiş bağ ve gerçek sipariş no korunmalı';
  assert (select karsilanan from public.siparis_kalemleri where id='f4-k')=2, 'F4: karşılanan kaybolmamalı';
  r := public.fis_bag_coz('{"siparisId":"f4-s"}');
  assert (select durum from public.siparisler where id='f4-s') = 'İptal', 'F4: iptalin tekrarı zararsız olmalı';
  select count(*) into onceki from public.stk_fis;
  begin
    perform public.fis_kes('{"istek":"f4-yeni-teslim","fis":{"aile":"stok","tur":"Satış","onek":"SF","siparisId":"f4-s"},"stok":{"satirlar":[{"id":"f4-h","urunId":"u-f4-sinama","renk":"Kahve","miktar":-1,"kalemId":"f4-k","siparisId":"f4-s"}]}}');
  exception when sqlstate 'KR006' then reddedildi := true; end;
  assert reddedildi, 'F4: iptal siparişine teslim reddedilmeli';
  assert (select count(*) from public.stk_fis) = onceki, 'F4: reddedilen teslim fiş bırakmamalı';
  assert not exists(select 1 from public.stk_hareket where id='f4-h'), 'F4: reddedilen teslim stok hareketi bırakmamalı';
  reddedildi := false;
  begin
    update public.siparisler set durum='Kısmi Teslim' where id='f4-s';
  exception when sqlstate 'KR006' then reddedildi := true; end;
  assert reddedildi, 'F4: bayat istemci iptali geri açamamalı';
  assert (select durum from public.siparisler where id='f4-s') = 'İptal';
  -- Kalemden siparişi bulmalı: bayat istemci başlık ve hareket siparisId göndermese de koruma var.
  reddedildi := false;
  begin
    perform public.fis_kes('{"istek":"f4-kalemsiparis-teslim","fis":{"aile":"stok","tur":"Satış","onek":"SF"},"stok":{"satirlar":[{"id":"f4-h2","urunId":"u-f4-sinama","renk":"Kahve","miktar":-1,"kalemId":"f4-k"}]}}');
  exception when sqlstate 'KR006' then reddedildi := true; end;
  assert reddedildi, 'F4: yalnız kalemId ile iptal koruması aşılamamalı';
  -- Önceden kabul edilen teslimin yanıtı kaybolmuşsa aynı isteğin tekrarı yeni teslim değildir.
  r := public.fis_kes('{"istek":"f4-ilk-teslim","fis":{"aile":"stok","tur":"Satış","onek":"SF","siparisId":"f4-s"}}');
  assert (r ->> 'zatenVar')::boolean, 'F4: iptal sonrası güvenli tekrar ilk fişi döndürmeli';
  r := public.fis_kes('{"istek":"f4-hata-teslim","fis":{"aile":"stok","tur":"Satış","onek":"SF","siparisId":"f4-hata"},"stok":{"satirlar":[{"id":"f4-hata-h","urunId":"u-f4-sinama","renk":"Kahve","miktar":-1,"kaynak":"Satış","kalemId":"f4-hata-k","siparisId":"f4-hata"}]}}');
  reddedildi := false;
  begin
    perform public.fis_bag_coz('{"siparisId":"f4-hata"}');
  exception when raise_exception then
    if sqlerrm <> 'F4_KASITLI_HATA' then raise; end if;
    reddedildi := true;
  end;
  assert reddedildi, 'F4: hata enjeksiyonu gerçekleşmeli';
  assert (select durum from public.siparisler where id='f4-hata')='Bekliyor', 'F4: hata durumunda başlık değişmemeli';
  assert exists(select 1 from public.stk_hareket where id='f4-hata-h' and siparis_id='f4-hata'
    and kalem_id='f4-hata-k' and gecmis_kalem_id is null and bag_cozum_zamani is null), 'F4: hata durumunda bağ çözme geri alınmalı';
end $$;
rollback;
