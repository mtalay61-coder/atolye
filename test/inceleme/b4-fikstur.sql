-- B4 SUNUCU SINAMASI FİKSTÜRÜ (28 Kasım) — ekran-uretim-b4.js'in B4T1 / B4T3 / B4T7 başlangıcıyla AYNI (b4-yukler.json bu hâlde
-- yakalandı). Taban: inc_ekran_taban (canlıya hizalı, G-25'siz). Yalnız yerel.
insert into public.cariler (id, unvan, tip) values ('fin-usta', 'Fin Usta', 'Personel'), ('fin-usta2', 'Fin Usta2', 'Personel'),
  ('fin-tamirci', 'Fin Tamirci', 'Personel') on conflict (id) do nothing;
update public.urunler set proses_ucretleri = '{"Dikim": 35, "Kesim": 30, "Saya": 20}'::jsonb where id = 'ekr-bot';
insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
select 'b4-' || lower(n), n, n, 'ekr-bot', 'Dikim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb,
       '[{"proses": "Dikim", "sira": 1, "verildiMi": true, "tamamlandiMi": false, "personelId": "fin-usta"}]'::jsonb, '2026-11-28T08:00:00.000Z'
  from unnest(array['B4T1', 'B4T3', 'B4T7']) n
on conflict (id) do nothing;
insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
select 'b4-' || lower(n) || '-a', 'b4-' || lower(n), 'Dikim', 'fin-usta', '{"40": 10}'::jsonb, 10, true, '2026-11-28T08:10:00.000Z', false, false, 0, '{}'::jsonb
  from unnest(array['B4T1', 'B4T3', 'B4T7']) n
on conflict (id) do nothing;
