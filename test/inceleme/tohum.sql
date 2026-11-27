-- KAPSAMLI İNCELEME TOHUMU (26 Kasım; YALNIZ YEREL test veritabanı, kurgusal veri). Canlıya ait hiçbir kayıt yok.
--   hesaplar: ali@atolye.local Yönetici · ayse@atolye.local yalnız stok görüntüleme+düzenleme+kaydetme · zeki@atolye.local LİSTEDE YOK
--   renkler: Siyah (r-siyah), Vizon Yılan (r-vizon) · kombinasyon 1054 = Siyah/Vizon Yılan (k-1054) · bedenler 40, 41
--   ürün "İnceleme Bot" (inc-bot, Mamul): 1054 × 40/41 · sipariş SAT-9001: 1054 - Siyah/Vizon Yılan 40 ×2, 41 ×3
set session_replication_role = replica;
insert into public.tanimlar (id, veri) values ('tekil', jsonb_build_object(
  'girisAktifMi', true,
  'kullanicilar', jsonb_build_array(
    jsonb_build_object('id', 'u-ali', 'kullaniciAdi', 'Ali', 'eposta', 'ali@atolye.local', 'rol', 'Yönetici'),
    jsonb_build_object('id', 'u-ayse', 'kullaniciAdi', 'Ayşe', 'eposta', 'ayse@atolye.local', 'rol', 'Personel',
      'yetkiler', jsonb_build_object('stok', jsonb_build_object('goruntuleme', true, 'duzenleme', true, 'kaydetme', true)))),
  'renkler', jsonb_build_array(
    jsonb_build_object('id', 'r-siyah', 'ad', 'Siyah', 'barkodKodu', '11'),
    jsonb_build_object('id', 'r-vizon', 'ad', 'Vizon Yılan', 'barkodKodu', '12')),
  'renkKombinasyonlari', jsonb_build_array(jsonb_build_object('id', 'k-1054', 'kod', '1054', 'renkIdler', jsonb_build_array('r-siyah', 'r-vizon'))),
  'bedenler', jsonb_build_array(jsonb_build_object('id', 'b-40', 'ad', '40', 'tip', 'Beden', 'barkodKodu', '40'),
                                jsonb_build_object('id', 'b-41', 'ad', '41', 'tip', 'Beden', 'barkodKodu', '41')),
  'prosesler', '[]'::jsonb, 'asortiler', '[]'::jsonb, 'birimler', '[]'::jsonb))
on conflict (id) do update set veri = excluded.veri;
set session_replication_role = origin;
select public.stk_tanim_esitle((select veri from public.tanimlar where id = 'tekil'));
insert into public.urunler (id, ad, kategori, birim, olcu_tipi, pasif, surum)
values ('inc-bot', 'İnceleme Bot', 'Mamul', 'çift', 'Beden', false, 1) on conflict (id) do nothing;
insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif) values
  ('vry-inc-40', 'inc-bot', 'k-1054', 'b-40', 0, true), ('vry-inc-41', 'inc-bot', 'k-1054', 'b-41', 0, true)
on conflict (id) do nothing;
insert into public.cariler (id, unvan, tip, para_birimi) values ('inc-musteri', 'İnceleme Müşteri', 'Müşteri', 'TRY') on conflict (id) do nothing;
insert into public.siparisler (id, siparis_no, tip, cari_id, durum, tarih, surum) values
  ('sp-inc-1', 'SAT-9001', 'satis', 'inc-musteri', 'Bekliyor', current_date, 1) on conflict (id) do nothing;
insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, sira) values
  ('kl-inc-40', 'sp-inc-1', 'inc-bot', 'İnceleme Bot', '1054 - Siyah/Vizon Yılan', '40', 2, 0),
  ('kl-inc-41', 'sp-inc-1', 'inc-bot', 'İnceleme Bot', '1054 - Siyah/Vizon Yılan', '41', 3, 1)
on conflict (id) do nothing;
