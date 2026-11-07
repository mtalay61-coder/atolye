-- 10 — SÜRÜM KAPISINI AÇ (YAZAR — ayrı onayla; 4 Kasım). 9'dan SONRA.
-- Ne yapar: stk_ayar.min_istemci_surum = '1.744.7'. Bundan sonra ERP tablolarına (site tabloları hariç, 7) yazan her uygulama
-- isteği `x-atolye-surum` başlığında en az 1.744.7 taşımak zorunda; başlıksız (1.743'ten eski) ya da eski sürüm (1.744.6 ve
-- öncesi) AT001 ile reddedilir — yazma olmaz, eski uygulama "yenileyin" der. Sunucu fonksiyonları (service_role) ve SQL Editor
-- etkilenmez. Veriye DOKUNMAZ.
-- DİKKAT — kapı kuralları da kapsar: fis_kural_aktif() = fis_aktif VEYA min_istemci_surum dolu. Kapı açıkken fiş kuralları,
-- fis_aktif ne olursa olsun etkindir (1.744.3 tasarımı: eski hareket yolu kapı açıkken yeniden açılamaz). Bu yüzden sıra 9 → 10.
-- ÖN KOŞUL (blok içinde; tutmazsa HİÇBİR ŞEY değişmez):
--   - fiş kuralları açık (9 uygulanmış), kapı şu an kapalı;
--   - beş site tablosu kapı dışında, diğer bütün ERP tabloları kapı içinde (7);
--   - son 24 saatte sürüm başlığı GÖNDERMEYEN ERP yazması yok (stk_istemci_iz; site tabloları hariç) — varsa o cihaz eski.
--   Cihazların 1.744.7'de olduğu ayrıca kullanıcı tarafından doğrulanır (Tanımlar ekranı; başlıklı eski sürümleri sunucu ayırt edemez).
-- Sonra: 10-sonra-dogrula.sql (salt-okur). Geri alma: 10-geri-al.sql.
do $$
declare
  hedef constant text := '1.744.7';
  a public.stk_ayar;
  eksik text;
  son_eski timestamptz;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('statement_timeout', '30s', true);
  select * into a from public.stk_ayar where id = 'tekil' for update;
  if not found then raise exception 'DUR: stk_ayar tekil satırı yok'; end if;
  if not coalesce(a.fis_aktif, false) then raise exception 'DUR: fiş kuralları kapalı — önce 9-kurallar-ac.sql'; end if;
  if nullif(a.min_istemci_surum, '') is not null then raise exception 'DUR: sürüm kapısı zaten açık (%)', a.min_istemci_surum; end if;
  if exists (select 1 from pg_trigger g join pg_class c on c.oid = g.tgrelid
             where g.tgname = 'stk_istemci_koru' and c.relname in ('site_giris_kaydi', 'site_hesaplari', 'site_kayit_talepleri', 'site_oturumlari', 'site_talepleri')) then
    raise exception 'DUR: site tabloları kapı içinde — site girişi reddedilirdi (7-surum-kapisi-site-istisna.sql)';
  end if;
  select string_agg(c.relname, ', ' order by c.relname) into eksik
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'stk_istemci_iz'
     and c.relname <> all (array['site_giris_kaydi', 'site_hesaplari', 'site_kayit_talepleri', 'site_oturumlari', 'site_talepleri'])
     and not exists (select 1 from pg_trigger g where g.tgrelid = c.oid and g.tgname = 'stk_istemci_koru');
  if eksik is not null then raise exception 'DUR: kapı tetikleyicisi olmayan ERP tablosu: %', eksik; end if;
  select max(zaman) into son_eski from public.stk_istemci_iz where tablo not like 'site\_%' and zaman > now() - interval '24 hours';
  if son_eski is not null then
    raise exception 'DUR: son 24 saatte sürüm başlığı göndermeyen ERP yazması var (son: %) — o cihaz eski uygulamada', son_eski;
  end if;
  update public.stk_ayar set min_istemci_surum = hedef where id = 'tekil';
  raise notice 'sürüm kapısı AÇIK: en az % · fiş kuralları %', hedef, case when public.fis_kural_aktif() then 'açık' else 'KAPALI (beklenmedik!)' end;
end $$;
