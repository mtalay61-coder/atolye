-- ÜRETİM SİLMEYİ DURDUR (YAZAR — yalnız acil durumda, ayrı onayla; 4 Kasım). Veriye dokunmaz.
-- Ne zaman: 12 geri alınacaksa (12-geri-al.sql) ya da üretim silmede beklenmedik bir sorun görülürse. 12 kaldırıldığında
-- 1.744.7 cihazlarda YARIM SİLME RİSKİ GERİ GELİR (üretim kaydı silinir, eski hareketleri geçerli kalır). Bu dosya, sorun
-- giderilene kadar uygulamadan gelen BÜTÜN üretim silmelerini durdurur — hangi sürüm, hangi rol (Yönetici dahil), hangi yol
-- (REST, uretim_sil) olursa olsun. Kullanıcı "Üretim silme geçici olarak durduruldu" iletisini görür; hiçbir kayıt değişmez
-- (silme işleminin tamamı geri alınır). Çöpten geri yükleme, üretim düzenleme, teslim ve fiş işlemleri ETKİLENMEZ.
-- Yönetici rolü yetki denetimini (yetki_var_mi) her zaman geçtiği için yetkiyi kapatmak yetmez — bu yüzden ayrı tetikleyici.
-- SQL Editor / bakım oturumu (jwt yok) muaftır. Kaldırma: 12-silme-durdur-kaldir.sql.
create or replace function public.uretim_silme_durdur() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if auth.jwt() is null then return old; end if;
  raise exception 'KR011: Üretim silme geçici olarak durduruldu (bakım) — hiçbir kayıt değişmedi' using errcode = 'KR011';
end $$;
revoke all on function public.uretim_silme_durdur() from public, anon, authenticated;
drop trigger if exists a_uretim_silme_durdur on public.uretim;
create trigger a_uretim_silme_durdur before delete on public.uretim for each row execute function public.uretim_silme_durdur();
