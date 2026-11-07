-- 12 ÖNCESİ — ÜRETİM ↔ HAREKET İLİŞKİSİ (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz, silmez, iptal etmez, dönüştürmez.
-- Ne sorar:
--   A) GEÇMİŞTE OLUŞMUŞ YARIM SİLME: üretim kaydı bulunmayan (silinmiş ya da hiç eşitlenmemiş) ama hareketi GEÇERLİ kalan
--      stok / cari satırları ve fiş başlıkları — 1.744.7'deki hatanın (üretim silinir, hareket kalır) izleri.
--   B) 1.744.8'İN REDDEDECEĞİ ÜRETİMLER: hâlâ duran üretimlerden fiş kesilmeden yazılmış (eski fiş / fişsiz) geçerli hareketi olanlar —
--      12 ve 1.744.8 sonrası bunlar uygulamadan silinemez (hiçbir kayıt değişmeden reddedilir).
--   C) Genel sayılar.
-- SINIR: bağ yalnız sunucunun uretim_id sütunundan okunur. uretim_id taşımayan çok eski satırlar (bağı yalnız fiş numarasında)
-- burada görünmez. "Üretim kaydı yok" = silinmiş YA DA bu cihazdan buluta hiç yazılmamış; ayırt etmek için örnek kimliklere bakın.
-- Satırlar: bolum · kontrol · sayi · miktar_tutar · ornek (en çok 10 kimlik; kişisel veri yok — ünvan / açıklama dönmez).
with
u as (select id from public.uretim),
sh as (select h.id, h.uretim_id, h.fis_id, h.miktar, f.istek, coalesce(f.iptal, false) as fis_iptal
         from public.stk_hareket h left join public.stk_fis f on f.id = h.fis_id
        where h.uretim_id is not null and not h.iptal),
ch as (select c.id, c.uretim_id, c.fis_id, c.tutar, f.istek, coalesce(f.iptal, false) as fis_iptal
         from public.car_hareket c left join public.stk_fis f on f.id = c.fis_id
        where c.uretim_id is not null and not c.iptal),
k as (
  -- A) üretimi olmayan geçerli satırlar
  select 'A' as bolum, 1 as sira, 'üretim kaydı YOK, stok hareketi geçerli' as kontrol, count(*) as sayi,
         coalesce(sum(miktar), 0)::text as miktar_tutar,
         string_agg(id || ' (üretim ' || uretim_id || ', fiş ' || fis_id || ')', '; ' order by id) filter (where rn <= 10) as ornek
    from (select sh.*, row_number() over (order by id) rn from sh where not fis_iptal and uretim_id not in (select id from u)) x
  union all
  select 'A', 2, 'üretim kaydı YOK, cari hareketi geçerli', count(*), coalesce(sum(tutar), 0)::text,
         string_agg(id || ' (üretim ' || uretim_id || ', fiş ' || coalesce(fis_id, 'YOK') || ')', '; ' order by id) filter (where rn <= 10)
    from (select ch.*, row_number() over (order by id) rn from ch where not fis_iptal and uretim_id not in (select id from u)) x
  union all
  select 'A', 3, 'üretim kaydı YOK, fiş başlığı geçerli (stk_fis.uretim_id)', count(*), '-',
         string_agg(id || ' (üretim ' || uretim_id || ')', '; ' order by id) filter (where rn <= 10)
    from (select f.id, f.uretim_id, row_number() over (order by f.id) rn from public.stk_fis f
           where f.uretim_id is not null and not f.iptal and f.uretim_id not in (select id from u)) x
  union all
  select 'A', 4, 'etkilenen (kaydı olmayan) üretim kimliği', count(distinct uretim_id), '-',
         string_agg(distinct uretim_id, '; ') filter (where uretim_id is not null)
    from (select uretim_id from sh where not fis_iptal and uretim_id not in (select id from u)
          union all select uretim_id from ch where not fis_iptal and uretim_id not in (select id from u)) x
  -- B) duran üretim, fis_kes ile kesilmemiş geçerli hareket
  union all
  select 'B', 5, 'duran üretim: eski fişli (istek boş) geçerli stok / cari satırı', count(*), '-',
         string_agg(distinct uretim_id, '; ')
    from (select uretim_id from sh where not fis_iptal and istek is null and uretim_id in (select id from u)
          union all select uretim_id from ch where not fis_iptal and fis_id is not null and istek is null and uretim_id in (select id from u)) x
  union all
  select 'B', 6, 'duran üretim: fişsiz geçerli cari satırı', count(*), coalesce(sum(tutar), 0)::text,
         string_agg(distinct uretim_id, '; ')
    from ch where fis_id is null and uretim_id in (select id from u)
  -- C) genel
  union all select 'C', 7, 'üretim kaydı', (select count(*) from u), '-', null
  union all select 'C', 8, 'geçerli hareketi olan üretim', (select count(distinct uretim_id) from (select uretim_id from sh where not fis_iptal union select uretim_id from ch where not fis_iptal) x
                                                             where uretim_id in (select id from u)), '-', null
  union all select 'C', 9, 'uretim_sil kurulu mu (12)', (select count(*) from pg_proc where proname = 'uretim_sil'), '-', null
)
select bolum, kontrol, sayi, miktar_tutar, ornek from k order by sira;
