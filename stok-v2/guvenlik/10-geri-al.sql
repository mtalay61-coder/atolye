-- 10 GERİ ALMA (YAZAR — yalnız sorun olursa; 4 Kasım). Sürüm kapısını kapatır (min_istemci_surum = NULL).
-- Veriye dokunmaz. Fiş kuralları fis_aktif = true olduğu sürece AÇIK KALIR (9'u da geri almak için ardından 9-geri-al.sql).
-- Kapı kapanınca eski / başlıksız uygulama yeniden yazabilir; başlıksız yazmalar stk_istemci_iz'e düşer (5-surum-durum-salt-okur.sql).
do $$
begin
  perform set_config('lock_timeout', '5s', true);
  update public.stk_ayar set min_istemci_surum = null where id = 'tekil';
  raise notice 'sürüm kapısı KAPALI · fiş kuralları %', case when public.fis_kural_aktif() then 'açık (fis_aktif)' else 'kapalı' end;
end $$;
