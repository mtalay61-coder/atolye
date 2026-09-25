-- BARKOD ŞEMASI — stok no sütunu
--
-- Barkod: 90 + stokNo(4) + renkKod(4) + [bedenKod(2) | asortiKod(3)]
--
-- Renk / beden / asorti kodları `tanimlar` tablosunun JSON `veri` sütununda duruyor ve gidiş-dönüşte
-- kendiliğinden korunuyor. STOK NO ise ürünün üstünde; `urunler` tablosu sütunlarını tek tek
-- sayıyor, dolayısıyla sütun açılmadan yazılamaz.
--
-- BU DOSYA ÇALIŞTIRILMADAN barkodlar kalıcı olmaz: kod uygulamada atanır, buluta gitmez ve bir
-- sonraki açılışta bulut kopyası yereli ezdiği için kaybolur. v1.135.0'daki çift barkodları
-- (`8xxxxxxx`) tam olarak bu yüzden her yenilemede siliniyordu.

alter table urunler add column if not exists stok_no integer;

-- Aynı numaranın iki ürüne düşmesi, basılmış etiketin YANLIŞ malı göstermesi demek. Uygulama da
-- tekilliği koruyor ama son söz veritabanında olsun: iki cihaz aynı anda kod atarsa uygulama
-- tarafındaki kontrol bunu göremez.
create unique index if not exists urunler_stok_no_tekil
  on urunler (stok_no)
  where stok_no is not null;
