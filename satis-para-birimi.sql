-- SATIŞ PARA BİRİMİ
--
-- Ürünün alış ve satış fiyatları artık AYRI para biriminde olabiliyor: deriyi dolarla alıp mamulü
-- euroyla satmak mümkün. Daha önce tek bir `alis_para_birimi` vardı ve satış fiyatı ekranlarda
-- "₺" sabitiyle basılıyordu — yani dövizli satış fiyatı yanlış birimde görünüyordu.
--
-- `urunler` tablosu sütunlarını TEK TEK sayıyor (TABLO_SEMA). Bu sütun açılmadan `satisParaBirimi`
-- buluta yazılamaz; uygulamada girilir, bir sonraki açılışta bulut kopyası yereli ezdiği için
-- kaybolur. v1.135.0'daki çift barkodu hatası tam olarak buydu.
--
-- Varsayılan ₺: bu tarihe kadar satış fiyatı zaten ₺ olarak gösteriliyordu. Geçmiş kayıtları
-- başka bir birime çekmek, hiç girilmemiş bir bilgiyi uydurmak olurdu.

alter table urunler add column if not exists satis_para_birimi text default '₺';
