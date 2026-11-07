-- HAREKETİ OLAN SİTE MÜŞTERİLERİ (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. Site hesabı olan her müşteri, portal_hesap'in kullandığı
-- defter(ler) için: toplam hareket, devir (son 3 aydan önce), dönem hareket sayısı (son 3 ay), bakiye — portal_hesap ile AYNI kurallar
-- (cari_hareketleri, iptal görünmez; defter = cari ek.siteDefter: Genel / Resmi / Ikisi, "Muhasebe" defteri her ikisine girer;
-- tarih ilk 10 karakter; para birimi boşsa TRY). Bakiye ve devir ERP'deki cari kartıyla karşılaştırılır; aynı müşteriyle siteye girip
-- 0b-dogrula.sql C çalıştırılırsa portal cevabı da bu satırla aynı olmalı. Satır gelmezse site hesabı olan müşteri yok.
with p as (select (current_date - interval '3 months')::date as bas, current_date as bit),
m as (
  select h.kullanici, c.id::text as cari_id, c.unvan, d.defter
  from public.site_hesaplari h
  join public.cariler c on c.id::text = h.cari_id
  cross join lateral unnest(case coalesce(c.ek->>'siteDefter', 'Genel') when 'Resmi' then array['Resmi']
                                 when 'Ikisi' then array['Genel', 'Resmi'] else array['Genel'] end) d(defter)
),
x as (
  select m.*, h.tarih, coalesce(h.para_birimi, 'TRY') as pb, case when h.yon = 'Borç' then h.tutar else -h.tutar end as isaretli
  from m left join public.cari_hareketleri h on h.cari_id = m.cari_id and coalesce(h.defter, 'Genel') in (m.defter, 'Muhasebe')
)
select kullanici, unvan, defter,
  count(tarih) as toplam_hareket,
  count(tarih) filter (where left(tarih, 10) between to_char(p.bas, 'YYYY-MM-DD') and to_char(p.bit, 'YYYY-MM-DD')) as donem_hareket,
  coalesce((select string_agg(pb || ' ' || t, ', ' order by pb) from (select y.pb, round(sum(y.isaretli)::numeric, 2) t from x y
            where y.cari_id = x.cari_id and y.defter = x.defter and y.tarih is not null and left(y.tarih, 10) < to_char(p.bas, 'YYYY-MM-DD')
            group by 1) z), '—') as devir,
  coalesce((select string_agg(pb || ' ' || t, ', ' order by pb) from (select y.pb, round(sum(y.isaretli)::numeric, 2) t from x y
            where y.cari_id = x.cari_id and y.defter = x.defter and y.tarih is not null group by 1
            having round(sum(y.isaretli)::numeric, 2) <> 0) z), '—') as bakiye,
  min(left(tarih, 10)) as ilk, max(left(tarih, 10)) as son
from x, p
group by kullanici, unvan, cari_id, defter, p.bas, p.bit
order by toplam_hareket desc, kullanici;
