-- G-25 SINAMASI TOHUMU (YALNIZ YEREL test veritabanı; jetonsuz yönetim kurulumu — sınanan bu değil). Tekrar çalıştırmak zararsız.
-- Kullanıcılar (giriş e-postası: kullanıcı adı küçük harf + @atolye.local; Ali / Veli / Ayşe test şemasında zaten var):
--   Muhasip    = Muhasebe rol şablonu (cari + muhasebe: g/k/s; fisler g/k; siparis g)
--   Uretimci   = Üretim rol şablonu (uretim + stok: g/k; siparis, fisler: g) — silme yok
--   Stokcu     = stok g/k/s         Uretsil = uretim g/k/s
--   Carici     = yalnız cari g/k    Muhasebeci = yalnız muhasebe g/k    Fisci = yalnız fisler g/k
--   Deniz      = cari / muhasebe yalnız görüntüleme
-- Cariler: g25-m (Müşteri), g25-t (Tedarikçi), g25-p (Personel, bölümde maaşlı), g25-f (fasoncu — ara proses carisi),
--   g25-q (Personel, parça başı — bölümde değil), g25-h (Her İkisi).
-- Üretim g25-u1: ürün ekr-bot (Kesim ücreti 35), adet 10; atama g25-a1 (Kesim, g25-p, 10). Ara proses ap-g25 (Boya, g25-f, 2 ₺).
update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}',
  coalesce((select jsonb_agg(x) from jsonb_array_elements(veri -> 'kullanicilar') x
             where x ->> 'kullaniciAdi' not in ('Muhasip', 'Uretimci', 'Stokcu', 'Uretsil', 'Carici', 'Muhasebeci', 'Fisci', 'Deniz')), '[]'::jsonb)
  || '[
    {"kullaniciAdi": "Muhasip", "rol": "Kullanıcı", "yetkiler": {"cari": {"goruntuleme": true, "kaydetme": true, "silme": true}, "muhasebe": {"goruntuleme": true, "kaydetme": true, "silme": true}, "fisler": {"goruntuleme": true, "kaydetme": true}, "siparis": {"goruntuleme": true}}},
    {"kullaniciAdi": "Uretimci", "rol": "Kullanıcı", "yetkiler": {"uretim": {"goruntuleme": true, "kaydetme": true}, "stok": {"goruntuleme": true, "kaydetme": true}, "siparis": {"goruntuleme": true}, "fisler": {"goruntuleme": true}}},
    {"kullaniciAdi": "Stokcu", "rol": "Kullanıcı", "yetkiler": {"stok": {"goruntuleme": true, "kaydetme": true, "silme": true}}},
    {"kullaniciAdi": "Uretsil", "rol": "Kullanıcı", "yetkiler": {"uretim": {"goruntuleme": true, "kaydetme": true, "silme": true}}},
    {"kullaniciAdi": "Carici", "rol": "Kullanıcı", "yetkiler": {"cari": {"goruntuleme": true, "kaydetme": true}}},
    {"kullaniciAdi": "Muhasebeci", "rol": "Kullanıcı", "yetkiler": {"muhasebe": {"goruntuleme": true, "kaydetme": true}}},
    {"kullaniciAdi": "Fisci", "rol": "Kullanıcı", "yetkiler": {"fisler": {"goruntuleme": true, "kaydetme": true}}},
    {"kullaniciAdi": "Deniz", "rol": "Kullanıcı", "yetkiler": {"cari": {"goruntuleme": true}, "muhasebe": {"goruntuleme": true}}}
  ]'::jsonb)
 where id = 'tekil';
-- KULLANICI KİMLİKLERİ (24 Kasım): gerçek kayıtlarda `id` var; istemcinin yetki tazelemesi (100 "YETKİ TAZELEME") oturumdaki kullanıcıyı
-- `id` ile eşler. Kimliksiz kayıtta ilk kimliksiz kaydı (Yönetici Ali) bulup onun rolünü kopyalıyordu — ekran testlerinde ARAYÜZ her
-- kullanıcıda Yönetici gibi davranıyordu (sunucu jetonu doğruydu). Eksik kimlikler k-<ad> olarak tamamlanır.
update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (select jsonb_agg(case when coalesce(x ->> 'id', '') = ''
    then x || jsonb_build_object('id', 'k-' || lower(translate(x ->> 'kullaniciAdi', 'ÇĞİÖŞÜçğıöşü', 'CGIOSUcgiosu'))) else x end)
  from jsonb_array_elements(veri -> 'kullanicilar') x))
 where id = 'tekil';
update public.tanimlar set veri = jsonb_set(jsonb_set(veri,
    '{araProsesler}', coalesce((select jsonb_agg(x) from jsonb_array_elements(case when jsonb_typeof(veri -> 'araProsesler') = 'array' then veri -> 'araProsesler' else '[]'::jsonb end) x where x ->> 'id' <> 'ap-g25'), '[]'::jsonb)
      || '[{"id": "ap-g25", "ad": "Boya", "cariId": "g25-f", "ucret": 2}]'::jsonb),
    '{bolumler}', coalesce((select jsonb_agg(x) from jsonb_array_elements(case when jsonb_typeof(veri -> 'bolumler') = 'array' then veri -> 'bolumler' else '[]'::jsonb end) x where x ->> 'id' <> 'bk-g25'), '[]'::jsonb)
      || '[{"id": "bk-g25", "ad": "G25 Kesimhane", "prosesler": [], "personel": [{"cariId": "g25-p", "maas": 30000}]}]'::jsonb)
 where id = 'tekil';
insert into public.cariler (id, unvan, tip, para_birimi) values
  ('g25-m', 'G25 Müşteri', 'Müşteri', 'TRY'), ('g25-t', 'G25 Tedarikçi', 'Tedarikçi', 'TRY'),
  ('g25-p', 'G25 Personel', 'Personel', 'TRY'), ('g25-f', 'G25 Fasoncu', 'Tedarikçi', 'TRY'),
  -- 24 Kasım (K4): g25-q parça başı çalışan personel (bölümde DEĞİL — işçiliği cariye yazılır); g25-h hem müşteri hem tedarikçi
  ('g25-q', 'G25 Usta', 'Personel', 'TRY'), ('g25-h', 'G25 Karma', 'Her İkisi', 'TRY')
on conflict (id) do nothing;
update public.urunler set proses_ucretleri = '{"Kesim": 35}'::jsonb where id = 'ekr-bot';
insert into public.uretim (id, siparis_no, urun_id, asama, ek, renk, adet, model)
values ('g25-u1', 'G25-1', 'ekr-bot', 'Kesim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot') on conflict (id) do nothing;
insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
values ('g25-a1', 'g25-u1', 'Kesim', 'g25-p', '{"40": 10}'::jsonb, 10, true, false, false, 0, '{}'::jsonb) on conflict (id) do nothing;
