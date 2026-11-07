-- SÜRÜM KAPISI — SİTE TABLOLARI İSTİSNASI (4 Kasım; YAZAR — ayrı onayla; sürüm kapısı açılmadan ÖNCE).
-- stk_istemci_koru tetikleyicisi public'teki BÜTÜN tablolara kurulu. Site (newdiamond-web) uygulama sürüm başlığı göndermediği için
-- min_istemci_surum ayarlanınca müşteri girişi, kayıt ve site siparişi AT001 ile reddedilir (yerelde üretildi).
-- KAPSAM — AÇIK LİSTE, yalnız şu BEŞ tablo (girişsiz site fonksiyonlarının yazdığı tablolar; site-portal.sql):
--   site_oturumlari      portal_giris (oturum ekler), portal_cikis (siler), süresi geçenleri siler
--   site_giris_kaydi     portal_giris (deneme kaydı)
--   site_hesaplari       portal_giris (son giriş / hatalı deneme sayacı)
--   site_kayit_talepleri site_kayit_ol (müşteri kayıt talebi)
--   site_talepleri       portal_siparis (site siparişi talebi; ERP tablosuna YAZMAZ — siparişe çevirme ERP'de, sürüm başlığıyla)
-- Adı site_ ile başlayan başka / gelecekteki tablolar istisnaya GİRMEZ (kapının içinde kalır). Kaynak: fis-defteri.sql'deki aynı liste.
-- Sürüm kapısı açık DEĞİLKEN davranış değişmez (tetikleyici bugün yalnız eski uygulama izini yazıyor). Tekrar çalıştırmak zararsız.
-- Geri alma: create trigger stk_istemci_koru before insert or update or delete on public.<tablo> for each row
--            execute function public.stk_istemci_koru();   (aşağıdaki listedeki her tablo için)
do $$
declare t text;
begin
  foreach t in array array['site_giris_kaydi', 'site_hesaplari', 'site_kayit_talepleri', 'site_oturumlari', 'site_talepleri'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists stk_istemci_koru on public.%I', t);
    else
      raise notice 'Bilgi: % bu veritabanında yok — atlandı', t;
    end if;
  end loop;
end $$;
-- Kontrol: adı site_ ile başlayan HER tablo ve sürüm denetiminin durumu. Listedeki beş tablo "kapı dışında"; listede olmayan
-- (varsa) "kapı içinde" görünmeli. Ayrıca kapı içindeki toplam tablo sayısı.
select c.relname as tablo,
       case when exists (select 1 from pg_trigger g where g.tgrelid = c.oid and g.tgname = 'stk_istemci_koru') then 'kapı içinde' else 'kapı dışında' end as surum_denetimi,
       c.relname = any (array['site_giris_kaydi', 'site_hesaplari', 'site_kayit_talepleri', 'site_oturumlari', 'site_talepleri']) as istisna_listesinde
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'site\_%'
union all
select '(diğer bütün tablolar)', (select count(*) from pg_trigger g join pg_class c2 on c2.oid = g.tgrelid join pg_namespace n2 on n2.oid = c2.relnamespace
        where g.tgname = 'stk_istemci_koru' and n2.nspname = 'public' and c2.relname not like 'site\_%')::text || ' tablo kapı içinde', null
order by 1;
