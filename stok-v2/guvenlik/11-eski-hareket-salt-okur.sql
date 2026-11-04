-- ESKİ YOLDAN YAZILMIŞ HAREKET VAR MI? (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. 9 / 10'dan ÖNCE bilgi için.
-- Neden: 1.744.7 fiş defteri kuruluyken hareketi YALNIZ fiş keserek / fiş iptal ederek değiştirir; fis_kes ile KESİLMEMİŞ bir
-- hareketi (fişsiz ya da eski tip fişe bağlı: istek boş) köprüden iptal etmek isteyen akış (ör. eski üretimi / ürünü silme)
-- bugün de ağa çıkmadan durdurulur ("fiş kaydını kullanın"). Kurallar açılınca bu değişmez — ama böyle satırlar canlıda varsa
-- kullanıcı onlara dokunamaz; yoksa bu durum canlıda oluşamaz. Tarayıcı provasında 3 senaryo (eski tohum verisi) buna takıldı.
-- Satır: tablo · tür (fişsiz / eski fiş / fis_kes) · iptal edilmemiş satır sayısı · en eski / en yeni tarih.
select t.tablo, t.tur, count(*) as satir, min(t.tarih) as en_eski, max(t.tarih) as en_yeni
from (
  select 'stk_hareket' as tablo,
         case when h.fis_id is null then 'fişsiz' when f.istek is null then 'eski fiş (fis_kes değil)' else 'fis_kes' end as tur,
         h.tarih::text as tarih
    from public.stk_hareket h left join public.stk_fis f on f.id = h.fis_id where not coalesce(h.iptal, false)
  union all
  select 'car_hareket',
         case when h.fis_id is null then 'fişsiz' when f.istek is null then 'eski fiş (fis_kes değil)' else 'fis_kes' end,
         h.tarih::text
    from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id where not coalesce(h.iptal, false)
  union all
  select 'kas_hareket',
         case when h.fis_id is null then 'fişsiz' when f.istek is null then 'eski fiş (fis_kes değil)' else 'fis_kes' end,
         coalesce(h.veri ->> 'tarih', '')
    from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where not coalesce(h.iptal, false)
) t
group by t.tablo, t.tur
order by t.tablo, t.tur;
