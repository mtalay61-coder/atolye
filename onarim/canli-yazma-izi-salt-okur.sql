-- CANLI YAZMA İZİ — SALT OKUR (26 Kasım). "Dünden bugüne veri girilmedi" iddiasını ölçer: gece yedeğinin alındığı andan
-- (SINIR) sonra hangi tabloya kaç satır yazılmış / güncellenmiş.
--
-- YALNIZ SELECT; hiçbir şey yazmaz. Kişisel veri döndürmez: yalnız tablo adı, sütun adı, sayı ve en son zaman.
-- SINIR: OneDrive'daki kullanılacak yedek klasörünün adındaki zaman (ör. 2026-11-26-0317 → '2026-11-26 03:17+03').
--        Klasör adınız farklıysa aşağıdaki tek satırı değiştirin.
-- Bakılan sütunlar: public tablolarında adı olusturma / guncelleme / tarih / zaman / created_at / updated_at olan
-- timestamp(tz) sütunları ve aynı adlı METİN sütunlar (ISO biçimli eski tablolar, ör. stok_hareketleri.tarih).
-- SINIR'dan sonra satırı olmayan tablolar listelenmez. Zaman damgası olmayan tablolar (ör. tanimlar, urunler'in kimi
-- sürümleri) bu sorguyla ÖLÇÜLEMEZ — en altta ayrıca listelenir; onlar yedekle içerik karşılaştırmasıyla doğrulanır.
with sinir as (select timestamptz '2026-11-26 03:17:00+03' as t),
sut as (
  select c.table_name, c.column_name, c.data_type
  from information_schema.columns c
  join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
  where c.table_schema = 'public'
    and c.column_name in ('olusturma', 'guncelleme', 'tarih', 'zaman', 'created_at', 'updated_at')
    and c.data_type in ('timestamp with time zone', 'timestamp without time zone', 'text', 'character varying')
),
olcum as (
  select s.table_name, s.column_name,
         query_to_xml(format(
           case when s.data_type like 'timestamp%'
             then 'select count(*) as n, max(%1$I)::text as son from public.%2$I where %1$I >= %3$L::timestamptz'
             else 'select count(*) as n, max(%1$I) as son from public.%2$I where %1$I ~ ''^\d{4}-\d{2}-\d{2}'' and %1$I >= %4$L'
           end, s.column_name, s.table_name, (select t from sinir),
           to_char((select t from sinir) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')), false, true, '') as x
  from sut s
)
select 'sonra-yazilan' as bolum, table_name as tablo, column_name as sutun,
       (xpath('/row/n/text()', x))[1]::text::int as satir, (xpath('/row/son/text()', x))[1]::text as en_son
from olcum
where (xpath('/row/n/text()', x))[1]::text::int > 0
union all
select 'olculemeyen', t.table_name, null, null, null
from information_schema.tables t
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
  and not exists (select 1 from sut s where s.table_name = t.table_name)
order by bolum desc, satir desc nulls last, tablo;
