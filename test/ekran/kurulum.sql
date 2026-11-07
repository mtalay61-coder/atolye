-- EKRAN SINAMASI KURULUMU (7 Kasım; YALNIZ YEREL test veritabanı). Sınanan akışların BAŞLANGIÇ verisi — akışın kendisi değil:
--   ürün "Ekran Bot" (ekr-bot): Siyah / Taba × 40 / 41, stok 0 (hareketsiz varyantlar)
--   gelir kartı "Ekran Gelir" (ekr-gelir), gider kartı "Ekran Gider" (ekr-gider) — Tanımlar › gelir / gider kartları
--   kasa: mevcut "Merkez Kasa" (K1, TRY) kullanılır
-- Tekrar çalıştırmak zararsız.
insert into public.urunler (id, ad, kategori, birim, olcu_tipi, mamul_tipi, pasif, surum)
values ('ekr-bot', 'Ekran Bot', 'Mamul', 'çift', 'Beden', null, false, 1) on conflict (id) do nothing;
insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif)
select 'vry-ekr-' || r.ad || '-' || o.ad, 'ekr-bot', public.stk_renk_coz(null, r.ad), public.stk_olcu_coz(null, o.ad), 0, true
  from (values ('Siyah'), ('Taba')) r(ad), (values ('40'), ('41')) o(ad)
on conflict (id) do nothing;
update public.tanimlar set veri = jsonb_set(veri, '{giderKartlari}',
  coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(veri -> 'giderKartlari', '[]'::jsonb)) x where x ->> 'id' not like 'ekr-%'), '[]'::jsonb)
  || '[{"id": "ekr-gelir", "ad": "Ekran Gelir", "grup": "diger", "tur": "gelir"}, {"id": "ekr-gider", "ad": "Ekran Gider", "grup": "yonetim", "tur": "gider"}]'::jsonb)
 where id = 'tekil';
