-- SEZON YILI
--
-- "İlkbahar/Yaz" tek başına hangi yılın koleksiyonu olduğunu söylemiyor. Yıl AYRI bir sütun:
-- sezon adıyla birleştirip tek metin yapmak ("İlkbahar/Yaz 2027") süzgecin sezona VE yıla ayrı
-- ayrı bakmasını imkânsız kılardı — "bütün 2027 koleksiyonu" ile "bütün yazlıklar" iki farklı soru.
--
-- `urunler` sütunlarını tek tek sayıyor; sütun açılmadan alan buluta gitmez ve bir sonraki
-- açılışta bulut kopyası yereli ezip siler (bkz. barkod işi, v1.135.0).
--
-- Varsayılan YOK: yılı olmayan eski kayıtlar boş kalıyor. Uydurulan bir yıl, süzgeçte yanlış
-- koleksiyona düşen ürünler demek olurdu.

alter table urunler add column if not exists sezon_yili integer;
