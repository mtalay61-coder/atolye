-- SÜRÜM KAPISI — SİTE TABLOLARI İSTİSNASI (4 Kasım; YAZAR — ayrı onayla; sürüm kapısı açılmadan ÖNCE çalıştırılmalı).
-- stk_istemci_koru tetikleyicisi public'teki BÜTÜN tablolara kurulu; site (newdiamond-web) uygulama sürüm başlığı göndermediği için
-- min_istemci_surum ayarlanınca müşteri girişi, kayıt ve site siparişi AT001 ile reddedilir (yerelde üretildi). Bu dosya yalnız
-- site_* tablolarındaki tetikleyiciyi kaldırır (kaynak: fis-defteri.sql'deki aynı istisna). Sürüm kapısı açık DEĞİLKEN davranış
-- değişmez (tetikleyici bugün yalnız eski uygulama izini yazıyor). Tekrar çalıştırmak zararsız.
-- Geri alma: create trigger stk_istemci_koru before insert or update or delete on public.<tablo> for each row
--            execute function public.stk_istemci_koru();   (beş site tablosu için)
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'site\_%' order by tablename loop
    execute format('drop trigger if exists stk_istemci_koru on public.%I', t);
  end loop;
end $$;
-- Kontrol: site tablolarında tetikleyici 0, diğer tablolarda olduğu gibi
select (select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace n on n.oid = c.relnamespace
         where g.tgname = 'stk_istemci_koru' and n.nspname = 'public' and c.relname like 'site\_%') as site_tablosunda,
       (select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace n on n.oid = c.relnamespace
         where g.tgname = 'stk_istemci_koru' and n.nspname = 'public' and c.relname not like 'site\_%') as diger_tablolarda;
