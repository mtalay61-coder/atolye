-- 9 GERİ ALMA (YAZAR — yalnız sorun olursa; 4 Kasım). Fiş kurallarını kapatır (fis_kural_kapat → fis_aktif = false).
-- Veriye dokunmaz; kurallar açıkken kesilen fişler aynen kalır (F8: istek'li kesilmiş fişlerin geçmişi kurallar kapalıyken de
-- değişmez). SIRA: sürüm kapısı (10) açıksa ÖNCE 10-geri-al.sql — kapı açıkken kurallar fis_aktif'ten bağımsız etkindir
-- (fis_kural_aktif = fis_aktif VEYA min_istemci_surum dolu); bu dosya o durumda durur ve hiçbir şey değiştirmez.
do $$
begin
  perform set_config('lock_timeout', '5s', true);
  if exists (select 1 from public.stk_ayar where id = 'tekil' and nullif(min_istemci_surum, '') is not null) then
    raise exception 'DUR: sürüm kapısı açık — önce 10-geri-al.sql (kapı açıkken kurallar kapatılamaz)';
  end if;
  raise notice '%', public.fis_kural_kapat();
  raise notice 'kurallar şimdi: %', case when public.fis_kural_aktif() then 'AÇIK (beklenmedik!)' else 'kapalı' end;
end $$;
