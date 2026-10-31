-- GECE DENETİMİ SINAMASI (v1.741.0, fis-gece-denetimi.sql) — sinama-fis.sql ve uctan-uca-fis.js'in bıraktığı veritabanında.
-- Önce TABAN: uçtan uca senaryoların bütün fişleri (üretim, ara proses, numune, açılış, makbuz, virman, gider, çek) gerçek
-- yazma yolundan geçti — tutar farkı, satırsız fiş, iptal tutarsızlığı ÇIKMAMALI (yanlış alarm veren denetim işe yaramaz).
-- Sonra her sorun türü bilerek kurulur, denetimin onu gördüğü ölçülür; hepsi geri alınır.
\set ON_ERROR_STOP 1
\pset pager off
do $$
declare
  t jsonb := public.fis_gece_denetimi(null);
begin
  raise notice 'TABAN: %', t::text;
  assert jsonb_array_length(t -> 'satirsizFis') = 0, 'satırsız fiş (yanlış alarm?) ' || (t -> 'satirsizFis')::text;
  assert jsonb_array_length(t -> 'iptalTutarsiz') = 0, 'iptal tutarsız (yanlış alarm?) ' || (t -> 'iptalTutarsiz')::text;
  assert jsonb_array_length(t -> 'tutarFarki') = 0, 'tutar farkı (yanlış alarm?) ' || (t -> 'tutarFarki')::text;
  assert (t #>> '{gun,kesilen,para}')::int > 0, 'bugün kesilen para fişi sayılmadı';
  assert jsonb_array_length(t #> '{gun,iptal}') > 0, 'bugün iptal edilen fişler listelenmedi';
  raise notice 'TAMAM: taban temiz (gerçek yazma yollarının fişlerinde yanlış alarm yok)';
end $$;

begin;
-- Bozuk kayıtlar ancak kurallar KAPALIYKEN kurulabilir (açıkken tetikleyiciler reddediyor — sinama-fis.sql açtı); işlem sonunda geri alınır.
update public.stk_ayar set fis_aktif = false where id = 'tekil';
do $$
declare
  t0 jsonb := public.fis_gece_denetimi(null);
  t jsonb;
  ornek_para text := (select f.id from public.stk_fis f where f.aile = 'para' and not f.iptal and exists (select 1 from public.car_hareket c where c.fis_id = f.id and not c.iptal) limit 1);
  ornek_stok text := (select f.id from public.stk_fis f where f.aile = 'stok' and not f.iptal and not f.goc limit 1);
  ornek_iptal text := (select f.id from public.stk_fis f where not f.iptal and f.id not in (ornek_para, ornek_stok)
                         and exists (select 1 from public.kas_hareket k where k.fis_id = f.id and not k.iptal) limit 1);
begin
  assert ornek_para is not null and ornek_stok is not null and ornek_iptal is not null, 'örnek fiş bulunamadı';
  -- (a) fişsiz cari ve kasa satırı (kurallar kapalı: tetikleyici geçirir)
  insert into public.car_hareket (id, cari_id, tarih, yon, tutar) values ('gd-fissiz', 'c-yeni', '2026-10-31', 'Borç', 10);
  insert into public.kas_hareket (id, hesap_id, veri) values ('gd-fissiz-k', 'K1', '{"yon": "Giriş", "tutar": 5}');
  -- (b) başlık tutarı satırlardan farklı
  update public.stk_fis set tutar = coalesce(tutar, 0) + 7 where id = ornek_para;
  -- (c) stok fişinin bütün satırları iptal (fiş geçerli kaldı) → satırsız fiş
  update public.stk_hareket set iptal = true where fis_id = ornek_stok;
  -- (d) fiş iptal, satırı geçerli kaldı
  update public.stk_fis set iptal = true, iptal_zamani = now() where id = ornek_iptal;
  t := public.fis_gece_denetimi(null);
  assert (t #>> '{fissizCari,sayi}')::int = (t0 #>> '{fissizCari,sayi}')::int + 1, 'fişsiz cari görülmedi ' || (t -> 'fissizCari')::text;
  assert (t #>> '{fissizKasa,sayi}')::int = (t0 #>> '{fissizKasa,sayi}')::int + 1, 'fişsiz kasa görülmedi';
  assert (t #>> '{fissizCari,kuraldanSonra}')::int = 0, 'kurallar kapalıyken "kuraldan sonra" sayıldı';
  assert exists (select 1 from jsonb_array_elements(t -> 'tutarFarki') x where x ->> 'fisNo' = ornek_para), 'tutar farkı görülmedi ' || ornek_para;
  assert exists (select 1 from jsonb_array_elements(t -> 'satirsizFis') x where x ->> 'fisNo' = ornek_stok), 'satırsız fiş görülmedi ' || ornek_stok;
  assert exists (select 1 from jsonb_array_elements(t -> 'iptalTutarsiz') x where x ->> 'fisNo' = ornek_iptal), 'iptal tutarsızlığı görülmedi ' || ornek_iptal;
  assert not (t ->> 'temiz')::boolean, 'sorunlu veritabanı temiz göründü';
  -- (e) kurallar açıldıktan sonra yazılmış fişsiz satır "kuraldanSonra"ya düşer (tetikleyiciyi atlayan delik)
  update public.stk_ayar set fis_aktif = true, fis_aktif_zamani = now() - interval '1 minute' where id = 'tekil';
  t := public.fis_gece_denetimi(null);
  assert (t #>> '{fissizCari,kuraldanSonra}')::int >= 1 and (t ->> 'kuralAcik')::boolean, 'kural sonrası fişsiz satır sayılmadı';
  raise notice 'TAMAM: fişsiz cari / kasa, tutar farkı, satırsız fiş, iptal tutarsızlığı ve kural sonrası delik görülüyor';
end $$;
rollback;

-- Giriş yapmış kullanıcı çağırabilir (sayılar ve fiş numaraları), anonim çağıramaz
set role authenticated;
do $$ begin perform public.fis_gece_denetimi(null); raise notice 'TAMAM: giriş yapmış kullanıcı çağırabiliyor'; end $$;
reset role;
set role anon;
do $$ begin
  begin perform public.fis_gece_denetimi(null); raise exception 'anonim çağırabildi';
  exception when insufficient_privilege then raise notice 'TAMAM: anonim çağıramıyor'; end;
end $$;
reset role;
