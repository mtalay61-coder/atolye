-- =====================================================================================================================
--  25-deneme/deneme-defter-dokum-salt-okur.sql — SALT OKUR. Deneme projesindeki BÜTÜN fişler (zaman sırasıyla), her atamanın iş verilirken
--  kaydedilen hammadde değerleri (verilen / reçete beklentisi — "artan" kutusu bunların farkıyla ön dolar), stok hareketleri ve cari
--  bakiyeleri. Plan dışı kayıtların hangi adımda oluştuğunu ve başlangıç / sonuç hesaplarını çıkarmak için. Yazmaz.
-- =====================================================================================================================
select bolum, sira, deger from (
  select 'A fiş' as bolum, row_number() over (order by f.olusturma) as sira,
         to_char(f.olusturma, 'DD.MM HH24:MI:SS') || ' · ' || coalesce(f.onek, '-') || ' · ' || coalesce(f.tur, '-') || ' · ' || coalesce(c.unvan, f.cari_id::text, '-')
         || ' · ' || coalesce(f.tutar::text, '-') || ' ₺ · üretim ' || coalesce(u.siparis_no, '-') || ' · ' || coalesce(f.olusturan, f.kullanici, '-')
         || case when f.iptal then ' · İPTAL ' || coalesce(to_char(f.iptal_zamani, 'HH24:MI:SS'), '') || ' ' || coalesce(f.iptal_eden, '') else '' end as deger
    from public.stk_fis f left join public.cariler c on c.id::text = f.cari_id::text left join public.uretim u on u.id::text = f.uretim_id::text
  union all
  select 'B atama hammadde', row_number() over (order by u.siparis_no, a.id),
         coalesce(u.siparis_no, '-') || ' · ' || a.id || ' · ' || a.proses || ' · ' || coalesce(a.miktar::text, '-') || ' · tamamlandı ' || coalesce(a.tamamlandi_mi::text, '-')
         || ' · verilenHammaddeler ' || coalesce((select string_agg(coalesce(v ->> 'ad', k) || ': verilen ' || coalesce(v ->> 'verilen', '-') || ' / beklenen ' || coalesce(v ->> 'beklenen', '-'), ', ')
              from jsonb_each(case when jsonb_typeof(a.ek -> 'verilenHammaddeler') = 'object' then a.ek -> 'verilenHammaddeler' else '{}'::jsonb end) as e(k, v)), 'yok')
    from public.uretim_atamalari a join public.uretim u on u.id = a.uretim_id
  union all
  select 'C stok hareketi', row_number() over (order by x.tarih, x.id),
         to_char(x.tarih, 'DD.MM HH24:MI:SS') || ' · ' || coalesce(p.ad, x.urun_id::text) || ' · ' || x.miktar || ' · ' || coalesce(f.onek, '-') || ' · üretim ' || coalesce(u.siparis_no, '-')
         || ' · ' || coalesce(left(x.aciklama, 50), '-') || case when coalesce(x.iptal, false) then ' · İPTAL' else '' end
    from public.stk_hareket x left join public.urunler p on p.id::text = x.urun_id::text left join public.stk_fis f on f.id = x.fis_id left join public.uretim u on u.id::text = x.uretim_id::text
  union all
  select 'D cari bakiye', row_number() over (order by c.unvan),
         c.unvan || ' (' || coalesce(c.tip, '-') || ') · geçerli hareket ' || count(h.id) filter (where not coalesce(h.iptal, false)) || ' · iptal ' || count(h.id) filter (where coalesce(h.iptal, false))
         || ' · Alacak ' || coalesce(sum(h.tutar) filter (where h.yon = 'Alacak' and not coalesce(h.iptal, false)), 0) || ' · Borç ' || coalesce(sum(h.tutar) filter (where h.yon = 'Borç' and not coalesce(h.iptal, false)), 0)
    from public.cariler c left join public.car_hareket h on h.cari_id::text = c.id::text group by c.id, c.unvan, c.tip
  union all
  select 'E stok toplamı', row_number() over (order by p.ad),
         p.ad || ' · geçerli net ' || coalesce(sum(x.miktar) filter (where not coalesce(x.iptal, false)), 0) || ' · hareket ' || count(x.id)
    from public.urunler p left join public.stk_hareket x on x.urun_id::text = p.id::text group by p.id, p.ad having count(x.id) > 0
) s order by bolum, sira;
