-- EKRAN SINAMASI EK TOHUMU (27 Kasım; YALNIZ YEREL, kurgusal): canlıyla hizalı tabanda kasa hesabı yok; test/ekran/*.js "Merkez Kasa" (K1, TRY)
-- ve "Ziraat" (B1) bekliyor. Yapı eski test tabanındakiyle aynı. Ardından test/ekran/kurulum.sql (Ekran Bot, gelir / gider kartı, Ekran Müşteri).
insert into public.kas_hesap (id, tur, sira, veri, aktif, olusturan) values
  ('K1', 'kasa', 1, '{"ad": "Merkez Kasa", "paraBirimi": "TRY"}', true, 'ali@atolye.local'),
  ('B1', 'banka', 2, '{"ad": "Ziraat"}', true, 'ali@atolye.local')
on conflict (id) do nothing;
