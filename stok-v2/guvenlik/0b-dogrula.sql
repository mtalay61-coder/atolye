-- 0b DOĞRULAMA (SALT-OKUR, 3 Kasım). Hiçbir şey yazmaz. Üç bölüm; Editor yalnız SON sorgunun sonucunu gösterir → bölümleri
-- ayrı ayrı seçip "Run selected" ile çalıştırın.

-- A) Düzeltme yerinde mi: iki fonksiyonun yeni tanımı + site_pb'nin boş para biriminde TRY dönmesi. Hepsi true olmalı.
select
  (select prosrc like '%left(h.tarih, 10)%' from pg_proc where oid = 'public.portal_hesap(text, date, date)'::regprocedure) as portal_hesap_yeni_tanim,
  public.site_pb(null) = 'TRY' as site_pb_bos_null,
  public.site_pb('') = 'TRY'   as site_pb_bos_metin,
  public.site_pb('TL') = 'TRY' and public.site_pb('€') = 'EUR' as site_pb_eski_davranis;

-- B) Canlıda "para birimi boş" durumu var mı: site hesabı olan carilerin siparişlerinde para birimi boş kalem sayısı (müşteri başına).
-- Satır gelirse o müşteriler düzeltmeden önce hesap sayfasını hiç açamıyordu (22023); şimdi açmaları gerekir.
select s.cari_id, h.kullanici, count(*) as para_birimi_bos_kalem
from public.siparis_kalemleri k
join public.siparisler s on s.id = k.siparis_id
join public.site_hesaplari h on h.cari_id = s.cari_id::text
where nullif(trim(coalesce(k.para_birimi, '')), '') is null
group by 1, 2 order by 3 desc;

-- C) Hesap sayfasının sunucu cevabı — SİTEYE GİRİŞ YAPTIKTAN SONRA çalıştırın: en son açık müşteri oturumuyla portal_hesap çağrılır
-- (sayfanın gördüğünün aynısı; okuma). Defter başına devir, dönemdeki hareket sayısı, ilk / son hareket tarihi, bakiye; siparişlerden
-- kdvDahil'i boş olan sayısı (0 olmalı). Bakiyeyi ERP'deki cari kartıyla karşılaştırın.
with o as (select anahtar, cari_id from public.site_oturumlari where bitis > now() order by bitis desc limit 1),
     r as (select o.cari_id, public.portal_hesap(o.anahtar) as j from o)
select r.cari_id, r.j->>'unvan' as unvan, r.j->>'baslangic' as donem_bas, r.j->>'bitis' as donem_bit,
       h->>'defter' as defter, h->'devir' as devir, jsonb_array_length(h->'hareketler') as donem_hareket_sayisi,
       (select min(x->>'tarih') from jsonb_array_elements(h->'hareketler') x) as ilk_hareket,
       (select max(x->>'tarih') from jsonb_array_elements(h->'hareketler') x) as son_hareket,
       h->'bakiye' as bakiye,
       (select count(*) from jsonb_array_elements(r.j->'siparisler') s where s->'kdvDahil' is null) as kdvsiz_siparis
from r, jsonb_array_elements(r.j->'hesap') h;
