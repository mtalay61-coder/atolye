-- ESKİ YOLDAN YAZILMIŞ HAREKET VAR MI? (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. 9 / 10'dan ÖNCE bilgi için.
-- Neden: 1.744.7 fiş defteri kuruluyken hareketi YALNIZ fiş keserek / fiş iptal ederek değiştirir; fis_kes ile KESİLMEMİŞ bir
-- hareketi (fişsiz ya da eski tip fişe bağlı: istek boş) köprüden iptal etmek isteyen akış (ör. eski üretimi / ürünü silme)
-- bugün de ağa çıkmadan durdurulur. Tarayıcı provasında 3 senaryo (eski tohum verisi) buna takıldı; üretim silmede üretim kaydı
-- silindi ama eski hareketlerin iptali gitmedi (yarım işlem). Kurallar açılınca bu değişmez.
--   tur = 'fis_kes'      → sorun yok (normal yol).
--   tur = 'eski fiş'     → fiş numarasıyla fiş iptali (fis_iptal) çalışır — yerelde iki koruma açıkken doğrulandı.
--   tur = 'fişsiz'       → sunucuda iptal yolu YOK; uygulamadan değiştirilemez.
-- Satır: tablo · tür · kaynak (yalnız stok) · iptal edilmemiş satır sayısı · en eski / en yeni tarih. Kişisel veri döndürmez.
select t.tablo, t.tur, t.kaynak, count(*) as satir, min(t.tarih) as en_eski, max(t.tarih) as en_yeni
from (
  select 'stk_hareket' as tablo,
         case when h.fis_id is null then 'fişsiz' when f.istek is null then 'eski fiş' else 'fis_kes' end as tur,
         coalesce(h.kaynak, '-') as kaynak, left(h.tarih::text, 10) as tarih
    from public.stk_hareket h left join public.stk_fis f on f.id = h.fis_id where not coalesce(h.iptal, false)
  union all
  select 'car_hareket',
         case when h.fis_id is null then 'fişsiz' when f.istek is null then 'eski fiş' else 'fis_kes' end,
         '-', left(h.tarih::text, 10)
    from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id where not coalesce(h.iptal, false)
  union all
  select 'kas_hareket',
         case when h.fis_id is null then 'fişsiz' when f.istek is null then 'eski fiş' else 'fis_kes' end,
         '-', left(coalesce(h.veri ->> 'tarih', ''), 10)
    from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where not coalesce(h.iptal, false)
) t
group by t.tablo, t.tur, t.kaynak
order by t.tablo, case t.tur when 'fişsiz' then 1 when 'eski fiş' then 2 else 3 end, t.kaynak;
