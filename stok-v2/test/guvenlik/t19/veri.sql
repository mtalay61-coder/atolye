-- Test verisi: bir Yönetici, bir normal kullanıcı (Personel), iki müşteri carisi, hesap / oturum / kayıt talebi.
insert into public.tanimlar values ('tekil', jsonb_build_object('girisAktifMi', true, 'kullanicilar', jsonb_build_array(
  jsonb_build_object('kullaniciAdi', 'Ayşe Yönetici', 'rol', 'Yönetici', 'eposta', 'yonetici@firma.test'),
  jsonb_build_object('kullaniciAdi', 'Personel Ali', 'rol', 'Personel', 'eposta', 'personel@firma.test'))));
insert into auth.users (email) values ('yonetici@firma.test'), ('personel@firma.test');
insert into public.cariler (id, unvan, pasif, ek) values
  ('11111111-1111-1111-1111-111111111111', 'Müşteri A', false, '{}'), ('22222222-2222-2222-2222-222222222222', 'Müşteri B', false, '{}'),
  ('33333333-3333-3333-3333-333333333333', 'Müşteri C (yeni kayıt)', false, '{}');
insert into public.site_hesaplari (cari_id, kullanici, sifre_ozeti) values
  ('11111111-1111-1111-1111-111111111111', 'musteria', extensions.crypt('A-sifre-1', extensions.gen_salt('bf', 4))),
  ('22222222-2222-2222-2222-222222222222', 'musterib', extensions.crypt('B-sifre-1', extensions.gen_salt('bf', 4)));
insert into public.site_oturumlari values (repeat('a', 64), '11111111-1111-1111-1111-111111111111', now() + interval '1 day'),
                                          (repeat('b', 64), '22222222-2222-2222-2222-222222222222', now() + interval '1 day');
insert into public.site_kayit_talepleri (id, bilgiler, kullanici, sifre_ozeti) values
  ('talep-1', '{"unvan":"Müşteri C"}', 'musteric', extensions.crypt('C-sifre-1', extensions.gen_salt('bf', 4))),
  ('talep-2', '{"unvan":"Müşteri D"}', 'musterid', extensions.crypt('D-sifre-1', extensions.gen_salt('bf', 4)));
-- Sitede görünen bir model: B müşterisinin site grubunda, B'ye özel fiyatla (portal / portal_siparis için).
insert into public.urunler (id, ad, mamul_tipi, ek, pasif, kategori, fiyat_kurallari, satis_para_birimi) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Bot', 'Bot', '{"sitedeGoster":"true"}', false, 'Mamul',
   '[{"tip":"Satış","kapsam":"cari","deger":"22222222-2222-2222-2222-222222222222","fiyat":30,"paraBirimi":"USD"}]', 'USD');
insert into public.varyantlar values ('aaaaaaaa-0000-0000-0000-000000000001', 'Siyah', '41', 5);
update public.tanimlar set veri = veri || '{"siteGruplari":[{"cariIdleri":["22222222-2222-2222-2222-222222222222"],"urunIdleri":["aaaaaaaa-0000-0000-0000-000000000001"]}]}' where id = 'tekil';
