-- CARİ KODU
--
-- Her carinin kalıcı, insan okunur bir kodu olur: unvan değişse de ("Ahmet Tekstil" →
-- "Ahmet Tekstil Ltd.") kod değişmez, silinen numara bir daha verilmez. Carinin zaten bir `id`si
-- var ama o iç kimlik — ekranda okunmuyor, telefonda söylenmiyor, evrakta yazmıyor.
--
-- `barkod_kodu` sütunuyla KARIŞTIRILMASIN: o, personelin atölyede okuttuğu barkod.
--
-- `cariler` tablosu sütunlarını tek tek sayıyor; sütun açılmadan alan buluta gitmez ve bir sonraki
-- açılışta bulut kopyası yereli ezip siler (bkz. barkod işi, v1.135.0).

alter table cariler add column if not exists kod integer;

-- Aynı kodun iki cariye düşmesi, eski bir evrakta yazan kodun BAŞKA bir cariyi göstermesi demek.
-- Uygulama tekilliği koruyor ama iki cihaz aynı anda cari açarsa bunu göremez; son söz burada.
create unique index if not exists cariler_kod_tekil
  on cariler (kod)
  where kod is not null;
