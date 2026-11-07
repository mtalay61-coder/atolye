-- ÜRETİM SİLMEYİ YENİDEN AÇ (YAZAR — ayrı onayla; 4 Kasım). 12-silme-durdur.sql'in etkisini kaldırır; veriye dokunmaz.
-- DİKKAT: 12 kurulu DEĞİLSE (12-geri-al uygulanmışsa) bu dosyadan sonra 1.744.7 cihazlarda yarım silme riski yeniden vardır.
drop trigger if exists a_uretim_silme_durdur on public.uretim;
drop function if exists public.uretim_silme_durdur();
