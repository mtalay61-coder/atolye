-- =====================================================================================================================
--  25-deneme/deneme-test-durum-salt-okur.sql — SALT OKUR. Kontrol listesi sırasında her testten sonra çalıştırılır: deneme üretimlerinin
--  atamaları, fişleri, Deneme Usta işçiliği, ücret onayları / işçilik ödemeleri ve Deneme Maaşlı Personel mesaisi. Yazmaz.
-- =====================================================================================================================
with ure as (select u.id, u.siparis_no from public.uretim u join public.urunler p on p.id = u.urun_id where p.ad = 'Deneme Bot G25'),
ata as (select a.*, ure.siparis_no from public.uretim_atamalari a join ure on ure.id = a.uretim_id),
usta as (select id from public.cariler where unvan = 'Deneme Usta'),
mp as (select id from public.cariler where unvan = 'Deneme Maaşlı Personel')
select sira, kontrol, deger from (
  select 1 as sira, 'atamalar (üretim · proses · miktar · verildi · tamamlandı · tamir)' as kontrol, coalesce((select string_agg(coalesce(siparis_no, '-') || ' · ' || proses || ' · ' || coalesce(miktar::text, '-')
      || ' · ' || coalesce(verildi_mi::text, '-') || ' · ' || coalesce(tamamlandi_mi::text, '-') || ' · ' || coalesce(tamir_mi::text, 'false'), ' | ' order by siparis_no, id) from ata), 'yok') as deger
  union all select 2, 'ÜRT fişleri (üretim · iptal · tutar · zaman)', coalesce((select string_agg(coalesce(u.siparis_no, '-') || ' · ' || coalesce(f.iptal::text, '-') || ' · ' || coalesce(f.tutar::text, '-') || ' · ' || to_char(f.olusturma, 'HH24:MI:SS'), ' | ' order by f.olusturma)
      from public.stk_fis f join ure u on u.id::text = f.uretim_id::text), 'yok')
  union all select 3, 'Deneme Usta: hareket sayısı · geçerli toplam (₺)', (select count(*) || ' · ' || coalesce(sum(tutar) filter (where not coalesce(iptal, false)), 0) from public.car_hareket h join usta on usta.id::text = h.cari_id::text)
  union all select 4, 'ücret onayları (anahtar · onaylayan)', coalesce((select string_agg(o.anahtar || ' · ' || o.onaylayan, ' | ') from public.ucr_onay o where exists (select 1 from ata where o.anahtar like '%' || ata.id::text || '%')), 'yok')
  union all select 5, 'işçilik ödemeleri (id · miktar · ücret)', coalesce((select string_agg(i.id || ' · ' || i.miktar || ' · ' || i.ucret, ' | ') from public.isc_odeme i join ure on ure.id::text = i.uretim_id), 'yok')
  union all select 6, 'mesai bildirimleri (ay · saatler · durum · fiş)', coalesce((select string_agg(b.ay || ' · ' || b.saatler::text || ' · ' || b.durum || ' · ' || coalesce(b.fis_no, '-'), ' | ' order by b.giris_zamani) from public.mes_bildirim b join mp on mp.id::text = b.cari_id), 'yok')
  union all select 7, 'Deneme Maaşlı Personel: hareket sayısı · geçerli toplam (₺)', (select count(*) || ' · ' || coalesce(sum(tutar) filter (where not coalesce(iptal, false)), 0) from public.car_hareket h join mp on mp.id::text = h.cari_id::text)
) s order by sira;
