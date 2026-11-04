-- 12 GERİ ALMA (YAZAR — yalnız sorun olursa; 4 Kasım). KALDIRDIĞI ÜÇ KORUMA: (1) uretim_sil tek işlem, (2) üretim silme koruması
-- (geçerli hareketi olan üretim silinemez — uretim_silme_koru), (3) silinmiş üretime hareket kilidi (uretim_bag_koru).
-- KALDIRMADIĞI: iz tablosu uretim_silinen (yalnız silinmiş üretim kimlikleri; RLS'i ve sürüm kapısı tetikleyicisiyle durur) ve
-- hiçbir veri satırı.
-- ⚠ RİSK GERİ GELİR: bu dosyadan sonra 1.744.7 (ve eski) cihazlarda YARIM SİLME yeniden mümkündür — eski hareketi olan üretim
-- silinince üretim kaydı gider, hareketleri geçerli kalır. 1.744.8 cihazlar işlem yokken eski hareketi olan üretimi SİLMEZ, yalnız
-- sunucu fişli üretimi eski (sıralı) yoldan siler.
-- ÖNCE ÜRETİM SİLMEYİ DURDURUN: geri alma gerekiyorsa sıra → 12-silme-durdur.sql (bütün üretim silmelerini durdurur, Yönetici
-- dahil) → bu dosya → sorun giderilip 12 yeniden kurulunca 12-silme-durdur-kaldir.sql. Durdurmadan geri almak yalnız bütün
-- cihazlar 1.744.8'deyse ve eski hareketli üretim yoksa (13-uretim-hareket-salt-okur.sql bölüm B = 0) kabul edilebilir.
drop trigger if exists uretim_bag_koru on public.stk_hareket;
drop trigger if exists uretim_bag_koru on public.car_hareket;
drop trigger if exists uretim_silme_koru on public.uretim;
drop trigger if exists uretim_geri_yukle on public.uretim;
drop function if exists public.uretim_sil(jsonb);
drop function if exists public.uretim_bag_koru();
drop function if exists public.uretim_silme_koru();
