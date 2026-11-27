-- 26 — B1 / B2 DENEME: VERİ ANLIK GÖRÜNTÜSÜ — SALT OKUR (28 Kasım). Hiçbir şey yazmaz.
-- NEDEN: kurulumun (26-b1-uygula.sql) var olan HİÇBİR satırı değiştirmediğini ve deneme sınamasının yalnız beklenen satırları
-- değiştirdiğini ölçmek. Kurulumdan önce ve sonra çalıştırılır; iki sonuçta her satırın "sayi" ve "ozet" değeri AYNI olmalı (yalnız
-- tanim_ad_gecmisi kurulumla "yok" → "0 · boş" olur). Sınamadan sonra farklı çıkan tablolar, sınamanın dokunması beklenenlerdir.
-- ozet: tablonun BÜTÜN satırlarının (her sütun) md5'lerinin sıralı birleşiminin md5'i — tek satır değişse farklı çıkar. Veri YAZILMAZ,
-- yalnız sayı ve özet döner (ad, e-posta, tutar görünmez).
select t as tablo,
       case when to_regclass('public.' || t) is null then 'yok'
            else (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', t), false, true, '')))[1]::text end as sayi,
       case when to_regclass('public.' || t) is null then '-'
            else (xpath('/row/m/text()', query_to_xml(format('select coalesce(md5(string_agg(md5(x::text), '','' order by md5(x::text))), ''bos'') as m from public.%I x', t), false, true, '')))[1]::text end as ozet
  from unnest(array['tanimlar', 'stk_renk', 'stk_olcu', 'siparisler', 'siparis_kalemleri', 'uretim', 'uretim_atamalari', 'stok_rezervasyonlari',
                    'lst_kayit', 'urunler', 'cariler', 'stk_fis', 'stk_hareket', 'car_hareket', 'kas_hareket', 'ucr_onay', 'isc_odeme', 'mes_bildirim',
                    'tanim_ad_gecmisi']) with ordinality as u(t, sira)
 order by sira;
