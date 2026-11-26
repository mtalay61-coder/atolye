-- RENK ÇÖKMESİ ENVANTERİ — SALT OKUR (v1.744.37 öncesi hata, 26 Kasım).
--
-- Ne arıyor: Tanımlar'da bir rengin adı değişince (büyük/küçük harf dahil) o rengin geçtiği model kombinasyon renkleri
-- ("1054 - KAHVE SÜET/VİZON YILAN") rengin düz adına ("Vizon Yılan") çöküyordu. Sipariş / üretim adla tutulduğu için doğru
-- kaldı; stok kartındaki varyantlar ise kayboldu (hareketi olan pasifleşti, olmayan silindi).
--
-- YALNIZ SELECT. Hiçbir şey yazmaz, silmez. SQL Editor'da tamamı bir kerede çalıştırılabilir; her bölüm ayrı sonuç verir.
-- Karşılaştırma büyük/küçük harf ve boşluk farkını yok sayar (Türkçe İ/ı dahil).

-- 1) ETKİLENEN MODELLER: siparişte geçen renk, ürünün etkin varyantlarında YOK.
with kalem as (
  select k.urun_id, k.urun_ad, k.renk,
         lower(regexp_replace(translate(trim(k.renk), 'İIŞĞÜÖÇ', 'iışğüöç'), '\s+', ' ', 'g')) as nrm,
         count(*) as kalem_sayisi, sum(k.miktar) as cift,
         string_agg(distinct s.siparis_no, ', ') as siparisler
  from public.siparis_kalemleri k join public.siparisler s on s.id = k.siparis_id
  where coalesce(k.renk, '') <> ''
  group by k.urun_id, k.urun_ad, k.renk
),
etkin as (
  select distinct st.urun_id, lower(regexp_replace(translate(trim(st.renk_ad), 'İIŞĞÜÖÇ', 'iışğüöç'), '\s+', ' ', 'g')) as nrm
  from public.stk_stok st where st.aktif
)
select kalem.urun_ad, kalem.urun_id, kalem.renk as siparisteki_renk, kalem.kalem_sayisi, kalem.cift, kalem.siparisler
from kalem
where not exists (select 1 from etkin e where e.urun_id = kalem.urun_id and e.nrm = kalem.nrm)
order by kalem.urun_ad, kalem.renk;

-- 2) O MODELLERİN BULUTTAKİ BÜTÜN VARYANTLARI (etkin + pasif), renk türüyle ve stokla.
--    Pasif + 'model' türlü satırlar, çöken eski kombinasyon varyantlarıdır (hareketi olduğu için silinmemiş olanlar).
with etkilenen as (
  select distinct k.urun_id
  from public.siparis_kalemleri k
  where coalesce(k.renk, '') <> ''
    and not exists (select 1 from public.stk_stok st where st.urun_id = k.urun_id and st.aktif
      and lower(regexp_replace(translate(trim(st.renk_ad), 'İIŞĞÜÖÇ', 'iışğüöç'), '\s+', ' ', 'g'))
        = lower(regexp_replace(translate(trim(k.renk), 'İIŞĞÜÖÇ', 'iışğüöç'), '\s+', ' ', 'g')))
)
select u.ad as urun, st.urun_id, st.renk_ad, r.tur as renk_turu, st.renk_id, st.olcu_ad, st.aktif, st.miktar,
       (select count(*) from public.stk_hareket h where h.varyant_id = st.varyant_id) as hareket_sayisi
from public.stk_stok st
join etkilenen e on e.urun_id = st.urun_id
left join public.urunler u on u.id = st.urun_id
left join public.stk_renk r on r.id = st.renk_id
order by u.ad, st.aktif desc, st.renk_ad, st.olcu_ad;

-- 3) YALNIZ 27162 D İÇİN KISA GÖRÜNÜM (kullanıcının gösterdiği örnek).
select st.renk_ad, r.tur, st.olcu_ad, st.aktif, st.miktar
from public.stk_stok st
join public.urunler u on u.id = st.urun_id
left join public.stk_renk r on r.id = st.renk_id
where u.ad ilike '27162%'
order by st.aktif desc, st.renk_ad, st.olcu_ad;
