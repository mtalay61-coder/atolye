-- SİPARİŞ KALEMİ / ÜRETİM ATAMASI TEK KAPISI (alt-v2.sql) — alt_yaz, fis_yaz { stok, cari, alt }, geçiş, geri dönüş.
\set ON_ERROR_STOP 1
\pset pager off
create or replace function pg_temp.kullanici(eposta text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('email', eposta, 'role', 'authenticated')::text, false)
$$;
create or replace function pg_temp.editor() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;
select pg_temp.editor() \gset
select jsonb_pretty(public.alt_gecis()) as gecis \gset

set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset

-- 1) Doğrudan yazma kapalı, okuma açık
do $$ begin
  assert (select count(*) from public.siparis_kalemleri) = 1, 'okuma';
  begin
    update public.siparis_kalemleri set karsilanan = 9 where id = 'k1';
    raise exception 'geçişten sonra kaleme doğrudan yazılabildi';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: alt tablolar yalnız okunur';
end $$;

-- 2) alt_yaz: tipine çevirerek ekle/güncelle, tekrara dayanıklı, sil
do $$
declare r jsonb;
  p jsonb := '{"siparis_kalemleri": {"satirlar": [
      {"id": "k1", "siparis_id": "sip-100", "urun_id": "u-canta", "urun_ad": "Deri Çanta", "renk": "1058 - Taba/Siyah", "beden": "36",
       "miktar": 10, "karsilanan": 5, "fiyat": 450, "para_birimi": "TRY", "birim": "adet", "planlama": {"uretim": "ur-1"},
       "ambalaj": null, "rezervasyonlar": [{"id": "rz1", "miktar": 2}], "sira": 0},
      {"id": "k2", "siparis_id": "sip-100", "urun_id": "u-kosele", "miktar": 3, "karsilanan": 0, "fiyat": 0, "sira": 1}]}}';
begin
  r := public.alt_yaz(p);
  assert (r -> 'siparis_kalemleri' ->> 'yazilan')::int = 2, 'yazılan ' || r::text;
  assert (select karsilanan from public.siparis_kalemleri where id = 'k1') = 5, 'karşılanan güncellenmedi';
  assert (select planlama ->> 'uretim' from public.siparis_kalemleri where id = 'k1') = 'ur-1', 'jsonb sütun';
  assert (select jsonb_array_length(rezervasyonlar) from public.siparis_kalemleri where id = 'k1') = 1, 'rezervasyonlar';
  r := public.alt_yaz(p);
  assert (select count(*) from public.siparis_kalemleri) = 2, 'yeniden gönderim çoğalttı';
  r := public.alt_yaz('{"siparis_kalemleri": {"sil": ["k2"]}}');
  assert (r -> 'siparis_kalemleri' ->> 'silinen')::int = 1 and not exists (select 1 from public.siparis_kalemleri where id = 'k2'), 'silme';
  r := public.alt_yaz('{"siparis_kalemleri": {"sil": ["k2"]}}');
  assert (r -> 'siparis_kalemleri' ->> 'silinen')::int = 0, 'ikinci silme';
  -- Üretim ataması: boolean / jsonb / sayı tipleri
  r := public.alt_yaz('{"uretim_atamalari": {"satirlar": [{"id": "at-1", "uretim_id": "ur-1", "proses": "Saya", "personel_id": "p-1",
        "beden_miktarlari": {"36": 5}, "miktar": 5, "verildi_mi": true, "tamamlandi_mi": true, "tamamlanma_tarihi": "2026-10-29",
        "tamir_mi": false, "tamir_ucret": 0, "tamir_hammaddeler": [], "barkod": "10032-1"}]}}');
  assert (select tamamlandi_mi from public.uretim_atamalari where id = 'at-1'), 'atama tamamlandı';
  begin
    perform public.alt_yaz('{"cariler": {"satirlar": [{"id": "c-1"}]}}');
    raise exception 'izin verilmeyen tablo yazıldı';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: alt_yaz';
end $$;

-- 3) fis_yaz { stok, cari, alt } — tek işlem: stok düşerse kalem de cari de yazılmaz
do $$
declare r jsonb;
begin
  r := public.fis_yaz('{"stok": {"satirlar": [{"id": "sv1", "fisId": "SF-S100", "urunId": "u-canta", "renk": "1058 - Taba/Siyah", "olcu": "36", "miktar": -3, "kaynak": "Satış"}]},
                        "cari": {"satirlar": [{"id": "cv1", "cari_id": "c-2", "tarih": "2026-10-29", "yon": "Alacak", "tutar": 1350, "fis_no": "SF-S100"}]},
                        "alt": {"siparis_kalemleri": {"satirlar": [{"id": "k1", "siparis_id": "sip-100", "miktar": 10, "karsilanan": 8, "sira": 0}]}}}');
  assert (select karsilanan from public.siparis_kalemleri where id = 'k1') = 8 and exists (select 1 from public.stk_hareket where id = 'sv1')
         and exists (select 1 from public.car_hareket where id = 'cv1'), 'üçü birlikte ' || r::text;
  begin
    perform public.fis_yaz('{"stok": {"satirlar": [{"id": "sv2", "fisId": "SF-S101", "urunId": "u-yok", "miktar": -1, "kaynak": "Satış"}]},
                             "cari": {"satirlar": [{"id": "cv2", "cari_id": "c-2", "tutar": 1, "fis_no": "SF-S101"}]},
                             "alt": {"siparis_kalemleri": {"satirlar": [{"id": "k1", "siparis_id": "sip-100", "miktar": 10, "karsilanan": 10, "sira": 0}]}}}');
    raise exception 'olmayan ürünlü sevk kabul edildi';
  exception when no_data_found then null; end;
  assert (select karsilanan from public.siparis_kalemleri where id = 'k1') = 8, 'stok düştü ama kalem yazıldı';
  assert not exists (select 1 from public.car_hareket where id = 'cv2'), 'stok düştü ama cari yazıldı';
  raise notice 'TAMAM: fis_yaz stok + cari + kalem tek işlem';
end $$;

-- 4) Yetkisiz kullanıcı
select pg_temp.kullanici('veli@atolye.local') \gset
do $$ begin
  begin
    perform public.alt_yaz('{"siparis_kalemleri": {"sil": ["k1"]}}');
    raise exception 'yetkisiz kullanıcı kalem sildi';
  exception when insufficient_privilege then null; end;
  raise notice 'TAMAM: alt yetki';
end $$;
reset role;
select pg_temp.editor() \gset

-- 5) Geri dönüş: doğrudan yazma geri gelir
select jsonb_pretty(public.alt_geri_don()) as geri \gset
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  update public.siparis_kalemleri set karsilanan = 9 where id = 'k1';
  assert (select karsilanan from public.siparis_kalemleri where id = 'k1') = 9, 'geri dönüşte yazma açılmadı';
  raise notice 'TAMAM: alt geri dönüş';
end $$;
reset role;
\echo 'SINAMA (ALT) BITTI'
