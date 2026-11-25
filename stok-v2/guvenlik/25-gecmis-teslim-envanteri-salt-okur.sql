-- =====================================================================================================================
--  25-gecmis-teslim-envanteri-salt-okur.sql — CANLIYA GEÇİŞ ÖNCESİ / SONRASI GEÇMİŞ TESLİM ENVANTERİ (SALT OKUR; ad / e-posta dökmez)
--  Neden (25 Kasım, deneme): ödeme defteri (isc_odeme) G-25 ile başlar; önceki teslimler ve 25c'den önceki PARA yetkilisi teslimleri
--  defterde YOK. G-25 bunları "kayıtsız" saymaz: g25_gecmis_iscilik geçerli ÜRT fişindeki defter dışı işçiliği proses tavanına ekler.
--  Bu sorgu canlıda bunun neye denk geldiğini SAYAR ve tavanı ZATEN aşmış (geçmişte çift ödenmiş görünen) üretim + prosesleri listeler.
--  G-25 uygulanmadan önce de çalışır (isc_odeme yoksa defter = 0 sayılır).
-- =====================================================================================================================
with defter as (   -- isc_odeme yoksa (G-25 öncesi) boş; tablo adı dinamik okunur ki sorgu G-25'siz veritabanında da çalışsın
  select (unnest(xpath('//i/text()', case when to_regclass('public.isc_odeme') is not null
           then query_to_xml('select istek as i from public.isc_odeme', false, false, '') else '<x/>'::xml end)))::text as istek),
satir as (
  select h.uretim_id::text as uretim, coalesce(nullif(fs.ek ->> 'proses', ''), substring(coalesce(h.aciklama, '') from '^(.*?) (işçilik|tamir) ücreti'), '?') as proses,
         coalesce(h.aciklama, '') ilike '%tamir ücreti%' as tamir, public.stk_sayi(h.ek ->> 'miktar') as miktar, h.tutar,
         exists (select 1 from defter d where d.istek = fs.istek) as defterde
    from public.car_hareket h join public.stk_fis fs on fs.id = h.fis_id
   where fs.onek = 'ÜRT' and not coalesce(fs.iptal, false) and not coalesce(h.iptal, false)
     and coalesce(h.yon, '') = 'Alacak' and coalesce(h.ek ->> 'islemTipi', '') = 'İşçilik'),
pr as (
  select s.uretim, s.proses, sum(s.miktar) filter (where not s.tamir) as normal, sum(s.miktar) filter (where not s.tamir and not s.defterde) as defter_disi,
         max(coalesce(public.stk_sayi(to_jsonb(u) ->> 'adet'), public.stk_sayi(to_jsonb(u) -> 'ek' ->> 'adet'), 0)) as adet
    from satir s left join public.uretim u on u.id::text = s.uretim group by s.uretim, s.proses)
select sira, kontrol, deger from (
  select 1 as sira, 'geçerli ÜRT işçilik satırı: toplam · defterde · defter dışı (geçmiş)' as kontrol,
         count(*) || ' · ' || count(*) filter (where defterde) || ' · ' || count(*) filter (where not defterde) as deger from satir
  union all select 2, 'defter dışı işçilik tutarı (₺) · miktarı (normal) · miktarı (tamir)',
         coalesce(sum(tutar) filter (where not defterde), 0) || ' · ' || coalesce(sum(miktar) filter (where not defterde and not tamir), 0) || ' · '
         || coalesce(sum(miktar) filter (where not defterde and tamir), 0) from satir
  union all select 3, 'proses ADEDİ AŞILMIŞ üretim + proses sayısı (geçmişte fazla ödenmiş görünüyor — incelenecek)', count(*)::text from pr where adet > 0 and normal > adet + 0.000001
  union all select 4, 'aşılmış olanlar (üretim no · proses · ödenen normal · adet) — ilk 20',
         coalesce((select string_agg(coalesce(u.siparis_no, p.uretim) || ' · ' || p.proses || ' · ' || p.normal || ' · ' || p.adet, ' | ')
           from (select * from pr where adet > 0 and normal > adet + 0.000001 order by uretim limit 20) p left join public.uretim u on u.id::text = p.uretim), '-')
  union all select 5, 'TAMAMLANMAMIŞ ama prosesi zaten TAM ödenmiş atama (yeniden açılmış olabilir; yeni teslim işçilik alamaz)',
         (select count(*)::text from public.uretim_atamalari a join pr on pr.uretim = a.uretim_id::text and pr.proses = a.proses
           where not coalesce(a.tamamlandi_mi, false) and not coalesce(a.tamir_mi, false) and pr.adet > 0 and pr.normal >= pr.adet - 0.000001)
  union all select 6, 'tamamlanmış atama · tamamlanmamış atama', (select count(*) filter (where coalesce(tamamlandi_mi, false)) || ' · '
         || count(*) filter (where not coalesce(tamamlandi_mi, false)) from public.uretim_atamalari)
  union all select 7, 'G-25 kurulu mu (isc_odeme · g25_gecmis_iscilik)', (to_regclass('public.isc_odeme') is not null)::text || ' · '
         || (to_regprocedure('public.g25_gecmis_iscilik(text, text)') is not null)::text
) s order by sira;
