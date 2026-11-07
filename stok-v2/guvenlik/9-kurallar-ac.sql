-- 9 — FİŞ KURALLARINI AÇ (YAZAR — ayrı onayla; 4 Kasım). Sürüm kapısı KAPALI kalır.
-- Ne yapar: stk_ayar.fis_aktif = true (fis_kural_ac). Bundan sonra stok / cari / kasa hareketleri YALNIZ fis_kes ile yazılır,
-- fiş iptal edilerek düzeltilir; hareket ve fiş satırı silinmez, kesilmiş fiş değiştirilemez. Veriye DOKUNMAZ (mevcut satır
-- değişmez); yalnız sonraki yazmaların hangi yoldan gelebileceğini belirler.
-- 1.744.7 bu kurala uyar: fiş defteri kuruluyken (canlıda kurulu) bütün hareketleri zaten fis_kes ile yazıyor — tarayıcı senaryolarının
-- ağ denetimi (test/kural-provasi.js) ve iki koruma açık sunucu sınaması (stok-v2/test/iki-koruma) bunu ölçer.
-- ÖN KOŞUL (blok içinde denetlenir, tutmazsa HİÇBİR ŞEY değişmez):
--   - fiş defteri kurulu (stk_ayar.fis_aktif sütunu var), kurallar şu an kapalı, sürüm kapısı kapalı (adım sırası: 9, sonra 10);
--   - iki yabancı anahtar doğrulanmış (6), sürüm kapısı site istisnası kurulu (7).
-- KİLİT: stk_ayar'ın tek satırı güncellenir; lock_timeout 5 sn (alınamazsa 55P03 ile durur, değişiklik yok).
-- Sonra: 9-sonra-dogrula.sql (salt-okur). Geri alma: 9-geri-al.sql.
do $$
declare a public.stk_ayar;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('statement_timeout', '30s', true);
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'stk_ayar' and column_name = 'fis_aktif') then
    raise exception 'DUR: fiş defteri kurulu değil (stk_ayar.fis_aktif yok)';
  end if;
  select * into a from public.stk_ayar where id = 'tekil' for update;
  if not found then raise exception 'DUR: stk_ayar tekil satırı yok'; end if;
  if nullif(a.min_istemci_surum, '') is not null then
    raise exception 'DUR: sürüm kapısı açık (%) — sıra 9 → 10; kapı açıkken kurallar zaten etkin', a.min_istemci_surum;
  end if;
  if a.fis_aktif then raise exception 'DUR: fiş kuralları zaten açık'; end if;
  if exists (select 1 from pg_constraint where conname in ('stk_hareket_kalem_fk', 'stk_hareket_gecmis_kalem_fk') and not convalidated) then
    raise exception 'DUR: yabancı anahtarlar doğrulanmamış (6-fk-dogrula.sql)';
  end if;
  if exists (select 1 from pg_trigger g join pg_class c on c.oid = g.tgrelid
             where g.tgname = 'stk_istemci_koru' and c.relname in ('site_giris_kaydi', 'site_hesaplari', 'site_kayit_talepleri', 'site_oturumlari', 'site_talepleri')) then
    raise exception 'DUR: sürüm kapısı site istisnası yok (7-surum-kapisi-site-istisna.sql)';
  end if;
  raise notice '%', public.fis_kural_ac();
end $$;
