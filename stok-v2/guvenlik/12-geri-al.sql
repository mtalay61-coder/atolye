-- 12 GERİ ALMA (YAZAR — yalnız sorun olursa; 4 Kasım). uretim_sil'i, üretim silme korumasını ve hareket kilidini kaldırır;
-- veriye dokunmaz (iz tablosu da kalır — yalnız silinmiş üretim kimlikleri; isterseniz ayrıca silinir). 1.744.8 cihazlar işlem
-- yokken eski hareketi olan üretimi SİLMEZ (hiçbir kayıt değişmez), yalnız sunucu fişli üretimi bugünkü yoldan siler.
drop trigger if exists uretim_bag_koru on public.stk_hareket;
drop trigger if exists uretim_bag_koru on public.car_hareket;
drop trigger if exists uretim_silme_koru on public.uretim;
drop trigger if exists uretim_geri_yukle on public.uretim;
drop function if exists public.uretim_sil(jsonb);
drop function if exists public.uretim_bag_koru();
drop function if exists public.uretim_silme_koru();
