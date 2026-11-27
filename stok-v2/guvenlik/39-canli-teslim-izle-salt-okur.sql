-- =====================================================================================================================
--  39-canli-teslim-izle-salt-okur.sql — YALNIZ OKUR. Hiçbir şeyi değiştirmez. (36-canli-teslim-izle-salt-okur.sql'in YERİNE geçer.)
--  Kullanıcının ZATEN yapacağı gerçek bir üretim teslimini izlemek için: teslimden ÖNCE ve SONRA çalıştırılır, iki çıktı karşılaştırılır.
--  'BURAYA-TAKIP-KODU' (iki yerde) izlenecek üretim kaydının takip kodu / sipariş no'su ile değiştirilir.
--  Bölümler: A üretim kaydı · B fişler · C stok hareketleri (fiş / ürün / renk / beden; MAMUL ve HAMMADDE ayrı) · D cari hareketleri
--  (fiş / cari / yön / açıklama) · E atamalar (kimlik, sağlam / tamir / hurda) · F beklenen işçilik (canlı kural) ↔ yazılan işçilik.
--  CANLI İŞÇİLİK KURALI (istemci 079): ücretli adet = SAĞLAM + TAMİR (hurda ödenmez). Ücret = tamir atamasında atamanın tamir ücreti,
--  değilse ürünün o proses ücreti (yoksa Tanımlar'daki ara proses ücreti). Personel yoksa ya da ücret 0 ise cari satırı yazılmaz;
--  proses bir atölye bölümüne (maaşlı personel) bağlıysa tutar cariye DEĞİL bölüm tahakkukuna gider — sorgu bunu ayırt edemez, not düşer.
-- =====================================================================================================================
with hedef as (
  select u.id, u.takip_kodu, u.siparis_no, u.urun_id, u.model, u.renk, u.adet, u.asama
    from public.uretim u where u.takip_kodu = 'BURAYA-TAKIP-KODU' or u.siparis_no = 'BURAYA-TAKIP-KODU'
), f as (
  select s.id, s.iptal, s.olusturma, s.ek ->> 'proses' as proses, s.ek ->> 'uretimFisAdi' as fis_adi
    from public.stk_fis s where s.uretim_id in (select id from hedef)
), a as (
  select t.id, t.proses, t.personel_id, t.miktar, t.verildi_mi, t.tamamlandi_mi, t.tamir_mi, t.tamir_ucret, t.ek ->> 'fisNo' as fis_adi,
         coalesce((select sum((x.value)::numeric) from jsonb_each_text(case when jsonb_typeof(t.sonuc -> 'saglam') = 'object' then t.sonuc -> 'saglam' else '{}'::jsonb end) x), 0) as saglam,
         coalesce((select sum((x ->> 'miktar')::numeric) from jsonb_array_elements(case when jsonb_typeof(t.sonuc -> 'tamir') = 'array' then t.sonuc -> 'tamir' else '[]'::jsonb end) x), 0) as tamir,
         coalesce((select sum((x ->> 'miktar')::numeric) from jsonb_array_elements(case when jsonb_typeof(t.sonuc -> 'hurda') = 'array' then t.sonuc -> 'hurda' else '[]'::jsonb end) x), 0) as hurda
    from public.uretim_atamalari t where t.uretim_id in (select id from hedef)
), ucret as (
  select a.id,
         case when a.tamir_mi then coalesce(a.tamir_ucret, 0)
              else coalesce((select (p.proses_ucretleri ->> a.proses)::numeric from public.urunler p where p.id = (select urun_id from hedef limit 1)),
                            (select (x ->> 'ucret')::numeric from public.tanimlar tn, jsonb_array_elements(coalesce(tn.veri -> 'araProsesler', '[]'::jsonb)) x
                              where tn.id = 'tekil' and x ->> 'ad' = a.proses limit 1), 0) end as birim,
         case when a.tamir_mi then 'atamanın tamir ücreti'
              when (select p.proses_ucretleri ? a.proses from public.urunler p where p.id = (select urun_id from hedef limit 1)) then 'ürünün proses ücreti'
              when exists (select 1 from public.tanimlar tn, jsonb_array_elements(coalesce(tn.veri -> 'araProsesler', '[]'::jsonb)) x where tn.id = 'tekil' and x ->> 'ad' = a.proses) then 'ara proses ücreti'
              else 'ücret tanımlı değil' end as kaynak
    from a
), yazilan as (
  select f.fis_adi, sum(case when c.yon ilike 'a%' then c.tutar else -c.tutar end) as tutar, count(*) as satir
    from public.car_hareket c join f on f.id = c.fis_id where not f.iptal and not c.iptal group by 1
)
select 'A' as bolum, 1 as sira, 'üretim kaydı (1 satır olmalı)' as anahtar,
       coalesce((select string_agg(h.id || ' · takip ' || coalesce(h.takip_kodu, '—') || ' · ' || coalesce(h.model, '') || ' ' || coalesce(h.renk, '') || ' · adet ' || coalesce(h.adet::text, '—')
                        || ' · aşama ' || coalesce(h.asama, '—'), ' || ') from hedef h), 'BULUNAMADI') as deger
union all
select 'B', row_number() over (order by f.olusturma)::int, 'fiş ' || f.id,
       case when f.iptal then 'İPTAL' else 'geçerli' end || ' · proses ' || coalesce(f.proses, '—') || ' · iş ' || coalesce(f.fis_adi, '—') || ' · ' || to_char(f.olusturma, 'DD.MM HH24:MI:SS')
  from f
union all
select 'C', row_number() over (order by q.fis_id, q.sinif desc, q.urun, q.renk, q.beden)::int, 'stok ' || q.fis_id,
       q.sinif || ' · ' || q.urun || ' · ' || q.renk || ' · ' || q.beden || ' · ' || case when q.miktar >= 0 then 'GİRİŞ +' else 'ÇIKIŞ ' end || q.miktar || case when q.iptal then ' · (iptal)' else '' end
  from (select h.fis_id, case when h.urun_id = (select urun_id from hedef limit 1) then 'MAMUL' else 'HAMMADDE' end as sinif,
               coalesce(p.ad, h.urun_id) as urun, coalesce(r.ad, '—') as renk, coalesce(o.ad, '—') as beden, sum(h.miktar) as miktar, (h.iptal or f.iptal) as iptal
          from public.stk_hareket h join f on f.id = h.fis_id left join public.urunler p on p.id = h.urun_id
          left join public.stk_varyant v on v.id = h.varyant_id left join public.stk_renk r on r.id = v.renk_id left join public.stk_olcu o on o.id = v.olcu_id
         group by h.fis_id, 2, 3, 4, 5, (h.iptal or f.iptal)) q
union all
select 'D', row_number() over (order by q.fis_id, q.cari, q.yon)::int, 'cari ' || q.fis_id,
       q.cari || ' · ' || q.yon || ' ' || q.tutar || case when q.iptal then ' · (iptal)' else '' end || ' · ' || q.aciklama
  from (select c.fis_id, coalesce(k.unvan, c.cari_id) as cari, coalesce(c.yon, '—') as yon, sum(c.tutar) as tutar, (c.iptal or f.iptal) as iptal,
               string_agg(coalesce(c.aciklama, ''), ' / ') as aciklama
          from public.car_hareket c join f on f.id = c.fis_id left join public.cariler k on k.id = c.cari_id
         group by c.fis_id, 2, 3, (c.iptal or f.iptal)) q
union all
select 'E', row_number() over (order by a.proses, a.id)::int, 'atama ' || a.id,
       a.proses || ' · iş ' || coalesce(a.fis_adi, '—') || ' · ' || coalesce(k.unvan, a.personel_id, 'personel yok') || ' · verilen ' || a.miktar
       || ' · ' || case when a.tamamlandi_mi then 'TESLİM (sağlam ' || a.saglam || ' / tamir ' || a.tamir || ' / hurda ' || a.hurda || ')' when a.verildi_mi then 'bekliyor' else 'verilmedi' end
       || case when a.tamir_mi then ' · TAMİR işi (ücret ' || coalesce(a.tamir_ucret, 0) || ')' else '' end
  from a left join public.cariler k on k.id = a.personel_id
union all
select 'F', row_number() over (order by a.proses, a.id)::int, 'işçilik ' || a.id,
       'ücretli adet ' || (a.saglam + a.tamir) || ' (sağlam ' || a.saglam || ' + tamir ' || a.tamir || '; hurda ' || a.hurda || ' ödenmez) × ' || u.birim || ' [' || u.kaynak || '] = beklenen '
       || ((a.saglam + a.tamir) * u.birim) || ' · yazılan ' || coalesce(y.tutar, 0) || ' → '
       || case when a.personel_id is null then 'personel yok: cari satırı beklenmez' || case when coalesce(y.tutar, 0) = 0 then ' (UYUMLU)' else ' (FARKLI — incele)' end
               when coalesce(y.tutar, 0) = (a.saglam + a.tamir) * u.birim then 'UYUMLU'
               when coalesce(y.tutar, 0) = 0 and (a.saglam + a.tamir) * u.birim > 0 then 'cari satırı YOK — proses atölye bölümüne (maaşlı) bağlıysa beklenen budur; değilse incele'
               else 'FARKLI — incele' end
  from a join ucret u on u.id = a.id left join yazilan y on y.fis_adi = a.fis_adi
 where a.tamamlandi_mi
order by 1, 2;
