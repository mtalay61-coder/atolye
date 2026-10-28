-- STOK v2 — KÖPRÜ (stk_yaz), GEÇİŞ VE GERİ DÖNÜŞ SINAMASI (kos.sh; sinama.sql'den sonra).
\set ON_ERROR_STOP 1
\pset pager off

create or replace function pg_temp.kullanici(eposta text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('email', eposta, 'role', 'authenticated')::text, false)
$$;
create or replace function pg_temp.editor() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;
create or replace function pg_temp.stok(p_urun text, p_renk text, p_olcu text) returns numeric language sql security definer as $$
  select coalesce(sum(miktar), 0) from public.stk_stok
  where urun_id = p_urun and public.stk_nrm(renk_ad) is not distinct from public.stk_nrm(p_renk)
    and public.stk_nrm(olcu_ad) is not distinct from public.stk_nrm(p_olcu)
$$;

-- kos.sh bu dosyayı TAZE bir veritabanında çalıştırır (sinama.sql'in değişikliklerinden bağımsız). Önce göç.
select pg_temp.editor() \gset
select (public.stk_goc() ->> 'varyant') as varyant \gset

-- ---------------------------------------------------------------------------------------------------------------------
-- 1) STK_YAZ — köprünün tek kapısı (uygulama oturumuyla)
set role authenticated;
select pg_temp.kullanici('ayse@atolye.local') \gset
do $$
declare
  p jsonb := '{"satirlar": [
     {"id": "k1", "fisId": "ALS-1", "urunId": "u-kosele", "renkId": "r-taba", "renk": "Taba", "miktar": 5, "kaynak": "Satınalma",
      "tarih": "2026-10-20T10:00:00.000Z", "cariId": "c-1", "ek": {"kullanici": "Ayşe", "birimFiyat": 99}},
     {"id": "k2", "fisId": "ALS-1", "urunId": "u-canta", "renkId": "kombi-1", "renk": "1058 - Taba/Siyah", "olcuId": "b-36", "olcu": "36",
      "miktar": 2, "kaynak": "Satınalma", "tarih": "2026-10-20T10:00:00.000Z"}]}';
  r jsonb;
begin
  r := public.stk_yaz(p);
  assert (r ->> 'satir')::int = 2, 'satır sayısı ' || r::text;
  assert pg_temp.stok('u-kosele', 'Taba', null) = 12, 'Kösele/Taba 7+5';
  assert (select tur || '|' || kullanici || '|' || olusturan from public.stk_fis where id = 'ALS-1') = 'Alış|Ayşe|ayse@atolye.local', 'fiş başlığı';
  -- Aynı istek yeniden (ağda düştü sanıldı): stok değişmez
  r := public.stk_yaz(p);
  assert pg_temp.stok('u-kosele', 'Taba', null) = 12, 'yeniden gönderim iki kez yazdı';
  -- Satır iptali: stoktan düşer, satır kalır
  r := public.stk_yaz('{"iptal": ["k1"]}');
  assert (r ->> 'iptal')::int = 1, 'iptal sayısı';
  assert pg_temp.stok('u-kosele', 'Taba', null) = 7, 'iptal stoktan düşmedi';
  assert (select iptal_eden from public.stk_hareket where id = 'k1') = 'ayse@atolye.local', 'iptal eden';
  r := public.stk_yaz('{"iptal": ["k1"]}');
  assert (r ->> 'iptal')::int = 0, 'ikinci iptal yeniden saydı';
  -- Geri yükleme (çöpten): aynı satır yeniden gelir → iptal kalkar
  r := public.stk_yaz(p);
  assert pg_temp.stok('u-kosele', 'Taba', null) = 12, 'geri yüklenen satır sayılmadı';
  -- Miktarı 0'a düşen satır: iptal
  r := public.stk_yaz(jsonb_set(p, '{satirlar,0,miktar}', '0'));
  assert pg_temp.stok('u-kosele', 'Taba', null) = 7, 'sıfırlanan satır iptal edilmedi';
  -- Satır başka varyanta taşındı (ör. kodsuz rengin model rengine çevrilmesi): eskisinden düşer, yenisine yazılır
  r := public.stk_yaz('{"satirlar": [{"id": "k2", "fisId": "ALS-1", "urunId": "u-canta", "renk": "Kahve", "olcu": "37", "miktar": 2, "kaynak": "Satınalma", "tarih": "2026-10-20T10:00:00.000Z"}]}');
  assert pg_temp.stok('u-canta', '1058 - Taba/Siyah', '36') = 10, 'eski varyanttan düşmedi';
  assert pg_temp.stok('u-canta', 'Kahve', '37') = 7, 'yeni varyanta yazılmadı';
  raise notice 'TAMAM: stk_yaz satır yaz / tekrar / iptal / geri yükle / taşı';
end $$;

-- 2) Tek işlem: bir parça hatalıysa hiçbiri yazılmaz
do $$ begin
  begin
    perform public.stk_yaz('{"satirlar": [
      {"id": "k10", "fisId": "MNL-9", "urunId": "u-iplik", "miktar": 3, "kaynak": "Manuel"},
      {"id": "k11", "urunId": "u-iplik", "miktar": 1, "kaynak": "Manuel"}]}');
    raise exception 'fişsiz satır kabul edildi';
  exception when invalid_parameter_value then null; end;
  assert not exists (select 1 from public.stk_hareket where id = 'k10'), 'yarım yazma kaldı';
  assert not exists (select 1 from public.stk_fis where id = 'MNL-9'), 'yarım fiş başlığı kaldı';
  raise notice 'TAMAM: stk_yaz tek işlem';
end $$;

-- 3) Göçteki iptal fişine (F-2) satır gelirse: fiş açılır, eski satırı sayılmaya BAŞLAMAZ
do $$ begin
  perform public.stk_yaz('{"satirlar": [{"id": "k20", "fisId": "F-2", "urunId": "u-canta", "renk": "1058 - Taba/Siyah", "olcu": "36", "miktar": 1, "kaynak": "Manuel"}]}');
  assert pg_temp.stok('u-canta', '1058 - Taba/Siyah', '36') = 11, 'iptal fişin eski satırı (+50) sayıldı';
  assert (select iptal from public.stk_fis where id = 'F-2') = false, 'fiş açılmadı';
  assert (select iptal from public.stk_hareket where id = 'h-iptal-1'), 'eski satır iptal işaretlenmedi';
  raise notice 'TAMAM: iptal fişe yeni satır';
end $$;

-- 4) Varyant aç / kaldır (ürün kartı)
do $$
declare r jsonb;
begin
  r := public.stk_yaz('{"varyantAc": [{"urunId": "u-iplik", "renk": "Siyah", "minStok": 4}]}');
  assert (select min_stok from public.stk_stok where urun_id = 'u-iplik' and renk_id = 'r-siyah') = 4, 'varyant açılmadı';
  r := public.stk_yaz('{"varyantKaldir": [{"urunId": "u-iplik", "renkId": "r-siyah", "renk": "Siyah"}]}');
  assert (r ->> 'varyantKaldir')::int = 1 and not exists (select 1 from public.stk_varyant where urun_id = 'u-iplik' and renk_id = 'r-siyah'), 'hareketsiz varyant silinmedi';
  -- Stoğu olan varyant kaldırılmaz, raporlanır
  r := public.stk_yaz('{"varyantKaldir": [{"urunId": "u-kosele", "renk": "Taba"}]}');
  assert jsonb_array_length(r -> 'atlanan') = 1 and pg_temp.stok('u-kosele', 'Taba', null) = 7, 'stoklu varyant kaldırıldı';
  -- Tanımda olmayan adla kaldırma: yeni renk AÇILMAZ, hiçbir şey olmaz
  r := public.stk_yaz('{"varyantKaldir": [{"urunId": "u-kosele", "renk": "Hiç Olmayan"}]}');
  assert not exists (select 1 from public.stk_renk where ad = 'Hiç Olmayan'), 'kaldırma yeni renk açtı';
  raise notice 'TAMAM: varyant aç / kaldır';
end $$;
reset role;
select pg_temp.editor() \gset

-- 5) SERBEST RENK → TANIMA BAĞLANIR: Tanımlar kaydı buluta varmadan fişe giren yeni renk, Tanımlar'a girince birleşir
do $$ begin
  perform public.stk_yaz('{"satirlar": [{"id": "k30", "fisId": "MNL-30", "urunId": "u-kosele", "renk": "Mor", "miktar": 3, "kaynak": "Manuel"}]}');
  assert (select tur from public.stk_renk where ad = 'Mor') = 'serbest', 'Mor serbest açılmadı';
  update public.tanimlar set veri = jsonb_set(veri, '{renkler}', (veri -> 'renkler') || '[{"id": "r-mor", "ad": "Mor"}]') where id = 'tekil';
  assert not exists (select 1 from public.stk_renk where tur = 'serbest' and ad = 'Mor'), 'serbest Mor kalktı değil';
  assert exists (select 1 from public.stk_varyant where urun_id = 'u-kosele' and renk_id = 'r-mor'), 'varyant tanımlı renge bağlanmadı';
  assert pg_temp.stok('u-kosele', 'Mor', null) = 3, 'birleşmede stok değişti';
  raise notice 'TAMAM: serbest renk tanıma bağlandı';
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 6) GEÇİŞ
select jsonb_pretty(public.stk_gecis()) as gecis \gset
do $$ begin
  assert (select aktif from public.stk_ayar), 'ayar açılmadı';
  assert (select relkind from pg_class where oid = 'public.varyantlar'::regclass) = 'v', 'varyantlar görünüm değil';
  assert (select relkind from pg_class where oid = 'public.eski_stok_hareketleri'::regclass) = 'r', 'eski tablo yok';
  -- Görünüm bugünkü biçimde: göçten gelen stok, eski tabloyla aynı
  assert (select miktar from public.varyantlar where urun_id = 'u-kosele' and renk = 'Siyah') = -4, 'görünüm stoğu';
  assert (select renk_id from public.varyantlar where urun_id = 'u-kosele' and renk = 'Siyah') = 'r-siyah', 'görünüm renk_id';
  assert (select tarih from public.stok_hareketleri where id = 'h1') = '2026-10-01T09:00:00.000Z', 'tarih biçimi ' || (select tarih from public.stok_hareketleri where id = 'h1');
  assert (select fis_no from public.stok_hareketleri where id = 'h6') = 'ESKI-h6', 'fişsiz eski hareketin fişi';
  assert not exists (select 1 from public.stok_hareketleri where id = 'h-iptal-1'), 'iptal satır görünümde';
  begin
    perform public.stk_goc();
    raise exception 'geçişten sonra göç çalıştı';
  exception when object_not_in_prerequisite_state then null; end;
  begin
    perform public.stk_gecis();
    raise exception 'ikinci geçiş çalıştı';
  exception when object_not_in_prerequisite_state then null; end;
  raise notice 'TAMAM: geçiş (görünümler, ayar, kilitler)';
end $$;

-- 7) Geçişten sonra: uygulama okur, eski yoldan YAZAMAZ, stk_yaz ile yazar
set role authenticated;
select pg_temp.kullanici('ali@atolye.local') \gset
do $$ begin
  assert (select count(*) from public.varyantlar) > 0, 'uygulama görünümü okuyamıyor';
  assert (select aktif from public.stk_ayar), 'uygulama ayarı okuyamıyor';
  begin
    insert into public.stok_hareketleri (id, urun_id, renk, beden, miktar) values ('eski-yol', 'u-iplik', 'Standart', 'Standart', 1);
    raise exception 'eski sürüm görünüme yazabildi';
  exception when others then   -- yetki ya da "görünüme yazılamaz": ikisi de doğru, yeter ki yazılmasın
    if sqlerrm like '%görünüme yazabildi%' then raise; end if;
  end;
  perform public.stk_yaz('{"satirlar": [{"id": "k40", "fisId": "SAT-40", "urunId": "u-kosele", "renk": "Siyah", "miktar": -2, "kaynak": "Satış", "tarih": "2026-10-28T12:00:00.000Z"}]}');
  assert (select miktar from public.varyantlar where urun_id = 'u-kosele' and renk = 'Siyah') = -6, 'yeni yazma görünüme yansımadı';
  assert (select fis_no || '|' || tarih from public.stok_hareketleri where id = 'k40') = 'SAT-40|2026-10-28T12:00:00.000Z', 'yeni hareket görünümde';
  raise notice 'TAMAM: geçişten sonra okuma / yazma';
end $$;
reset role;
select pg_temp.editor() \gset
do $$ begin
  begin
    insert into public.varyantlar (urun_id, renk, beden, miktar) values ('u-iplik', 'X', 'Y', 1);
    raise exception 'yönetici bile görünüme yazabildi';
  exception when others then
    if sqlerrm like '%yönetici bile%' then raise; end if;
  end;
  raise notice 'TAMAM: görünüm yazılamaz';
end $$;

-- 8) GERİ DÖNÜŞ: eski tablolar v2'nin o anki hâliyle geri gelir (geçişten sonraki fiş dahil)
select jsonb_pretty(public.stk_geri_don()) as geri \gset
do $$ begin
  assert not (select aktif from public.stk_ayar), 'ayar kapanmadı';
  assert (select relkind from pg_class where oid = 'public.varyantlar'::regclass) = 'r', 'varyantlar tabloya dönmedi';
  assert to_regclass('public.eski_varyantlar') is null, 'eski ad kaldı';
  assert (select miktar from public.varyantlar where urun_id = 'u-kosele' and renk = 'Siyah') = -6, 'geri dönüşte stok';
  assert (select fis_no from public.stok_hareketleri where id = 'k40') = 'SAT-40', 'geçiş sonrası hareket geri dönmedi';
  assert (select tarih from public.stok_hareketleri where id = 'k40') = '2026-10-28T12:00:00.000Z', 'tarih';
  assert not exists (select 1 from public.stok_hareketleri where id = 'h-iptal-1'), 'iptal satır eski tabloya döndü';
  raise notice 'TAMAM: geri dönüş';
end $$;

-- 9) Yeniden geçiş mümkün; göç eski tablodan (artık v2'nin geri yazılmış hâli) aynı stoğu kurar
do $$
declare r jsonb;
begin
  r := public.stk_gecis();
  assert (select miktar from public.varyantlar where urun_id = 'u-kosele' and renk = 'Siyah') = -6, 'yeniden geçişte stok';
  assert ((r -> 'goc') ->> 'farkSatiri')::int = 0, 'yeniden geçişte fark fişi: ' || (r -> 'goc')::text;
  raise notice 'TAMAM: yeniden geçiş';
end $$;

\echo 'SINAMA (GECIS) BITTI'
