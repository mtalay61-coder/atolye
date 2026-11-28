-- ÖLÇÜ TİPİ ↔ VARYANT ÖLÇÜ GRUBU ÇELİŞKİSİ — AYRINTI, SALT OKUR (28 Kasım). Hiçbir şey yazmaz.
-- Ürünün ölçü tipi (Beden / Boyut) ile varyantlarının bağlı olduğu ölçü kaydının grubu uyuşmayan ürünler, varyant varyant.
-- A: ürünün her varyantı (çelişen ve çelişmeyen) — ölçü kaydı, grup, etkinlik, stok hareketi ve net miktar.
-- B: bu ürünü hammadde olarak kullanan reçete satırları (hangi üründe, kaç satır, hangi beden değerleri).
-- C: aynı ölçü adının öbür gruptaki kaydı var mı (çözüm seçenekleri için bilgi).
with cel as (select distinct u.id, u.ad, u.stok_no, coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden') as tip
               from public.stk_varyant v join public.urunler u on u.id = v.urun_id join public.stk_olcu o on o.id = v.olcu_id
              where coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden') in ('Beden', 'Boyut') and o.tur in ('Beden', 'Boyut') and o.tur <> coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden')),
cikti(bolum, sira, kayit, bilgi_1, bilgi_2) as (
  select 'A varyant', row_number() over (order by c.ad, o.tur, o.ad, v.id),
         c.ad || ' [' || coalesce(c.stok_no::text, '-') || '] · ürünün ölçü tipi ' || c.tip || ' · kategori ' || coalesce((select kategori from public.urunler where id = c.id), '-'),
         'varyant ' || v.id || ' · renk ' || coalesce((select r.ad from public.stk_renk r where r.id = v.renk_id), '(yok)') || ' · ölçü ' || coalesce(o.ad || ' [' || o.tur || '] ' || o.id, '(yok)') || ' · ' || case when v.aktif then 'etkin' else 'pasif' end
           || case when o.tur in ('Beden', 'Boyut') and o.tur <> c.tip then ' · ÇELİŞİYOR' else ' · uyumlu' end,
         'geçerli hareket ' || (select count(*) from public.stk_hareket h where h.varyant_id = v.id and not coalesce(h.iptal, false)) || ' · iptal hareket ' || (select count(*) from public.stk_hareket h where h.varyant_id = v.id and coalesce(h.iptal, false))
           || ' · net ' || (select coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0) from public.stk_hareket h where h.varyant_id = v.id)
           || ' · açılış ' || to_char(v.olusturma at time zone 'Europe/Istanbul', 'DD.MM.YYYY')
    from cel c join public.stk_varyant v on v.urun_id = c.id left join public.stk_olcu o on o.id = v.olcu_id
  union all
  select 'B reçete', row_number() over (order by c.ad, m.ad), c.ad || ' → kullanan ürün ' || m.ad || ' [' || coalesce(m.stok_no::text, '-') || ']',
         'reçete satırı ' || count(*) || ' · hammadde beden değerleri: ' || string_agg(distinct coalesce(t.r ->> 'beden', '-'), ', '),
         'hammadde renk değerleri: ' || string_agg(distinct coalesce(t.r ->> 'renk', '-'), ', ')
    from cel c join public.urunler m on jsonb_typeof(m.recete) = 'array', jsonb_array_elements(m.recete) t(r) where t.r ->> 'hammaddeUrunId' = c.id group by c.ad, m.id, m.ad, m.stok_no
  union all
  select 'C öbür grup', row_number() over (order by c.ad, o.ad), c.ad || ' · ölçü "' || o.ad || '" [' || o.tur || ']',
         'ürünün grubundaki (' || c.tip || ') aynı adlı kayıt: ' || coalesce((select string_agg(x.id || case when x.aktif then ' etkin' else ' pasif' end, ', ') from public.stk_olcu x where x.tur = c.tip and public.stk_nrm(x.ad) = public.stk_nrm(o.ad)), 'YOK'),
         'bu üründe o kayda bağlı varyant: ' || (select count(*) from public.stk_varyant y join public.stk_olcu x on x.id = y.olcu_id where y.urun_id = c.id and x.tur = c.tip and public.stk_nrm(x.ad) = public.stk_nrm(o.ad))
    from cel c join public.stk_varyant v on v.urun_id = c.id join public.stk_olcu o on o.id = v.olcu_id where o.tur in ('Beden', 'Boyut') and o.tur <> c.tip
)
select bolum, kayit, bilgi_1, bilgi_2 from cikti order by bolum, sira;
