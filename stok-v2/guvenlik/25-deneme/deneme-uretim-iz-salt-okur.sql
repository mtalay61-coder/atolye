-- =====================================================================================================================
--  25-deneme/deneme-uretim-iz-salt-okur.sql — SALT OKUR. Yalnız "Deneme Bot G25" üretimlerinin izini sürer: atamalar, fişler,
--  Deneme Usta cari hareketleri, G-25 ücret onayı (ucr_onay) ve işçilik ödemesi (isc_odeme). Hiçbir şey yazmaz.
--  Neden: iş verildikten hemen sonra atama "tamamlandı = true" göründü (beklenen false) — teslim mi alındı, işçilik yazıldı mı?
-- =====================================================================================================================
with ure as (select u.id, u.siparis_no, u.asama, u.adet from public.uretim u join public.urunler p on p.id = u.urun_id where p.ad = 'Deneme Bot G25'),
ata as (select a.* from public.uretim_atamalari a join ure on ure.id = a.uretim_id),
usta as (select id from public.cariler where unvan = 'Deneme Usta')
select sira, kontrol, deger from (
  select 1 as sira, 'üretim (no · aşama · adet)' as kontrol, coalesce((select string_agg(coalesce(siparis_no, id::text) || ' · ' || coalesce(asama, '-') || ' · ' || coalesce(adet::text, '-'), ' | ') from ure), 'yok') as deger
  union all select 2, 'atamalar (id · proses · miktar · verildi · tamamlandı · sonuç · tamamlanma)', coalesce((select string_agg(id::text || ' · ' || proses || ' · ' || coalesce(miktar::text, '-') || ' · ' || coalesce(verildi_mi::text, '-')
      || ' · ' || coalesce(tamamlandi_mi::text, '-') || ' · ' || coalesce(sonuc::text, '-') || ' · ' || coalesce(tamamlanma_tarihi::text, '-'), ' | ' order by id) from ata), 'yok')
  union all select 3, 'bu üretimin fişleri (önek · tür · iptal · tutar · oluşturan · zaman)', coalesce((select string_agg(coalesce(f.onek, '-') || ' · ' || coalesce(f.tur, '-') || ' · ' || coalesce(f.iptal::text, '-') || ' · ' || coalesce(f.tutar::text, '-')
      || ' · ' || coalesce(f.olusturan, f.kullanici, '-') || ' · ' || to_char(f.olusturma, 'HH24:MI:SS'), ' | ' order by f.olusturma) from public.stk_fis f join ure on ure.id::text = f.uretim_id::text), 'yok')
  union all select 4, 'Deneme Usta cari hareketleri (yön · tutar · iptal · açıklama)', coalesce((select string_agg(coalesce(h.yon, '-') || ' · ' || coalesce(h.tutar::text, '-') || ' · ' || coalesce(h.iptal::text, '-') || ' · ' || left(coalesce(h.aciklama, '-'), 60), ' | ' order by h.olusturma)
      from public.car_hareket h join usta on usta.id::text = h.cari_id::text), 'yok')
  union all select 5, 'ücret onayları (ucr_onay: anahtar · onaylayan)', coalesce((select string_agg(o.anahtar || ' · ' || o.onaylayan, ' | ') from public.ucr_onay o where exists (select 1 from ata where o.anahtar like '%' || ata.id::text || '%')
      or exists (select 1 from ure where o.anahtar like '%' || ure.id::text || '%')), 'yok')
  union all select 6, 'işçilik ödemeleri (isc_odeme: id · miktar · ücret · cari Deneme Usta mı)', coalesce((select string_agg(i.id || ' · ' || i.miktar || ' · ' || i.ucret || ' · ' || (i.cari_id in (select id::text from usta))::text, ' | ')
      from public.isc_odeme i join ure on ure.id::text = i.uretim_id), 'yok')
) s order by sira;
