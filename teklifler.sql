-- =====================================================================================
--  teklifler.sql — TEKLİFLER TABLOSU (23 Ekim, v1.715.0 — Siparişler › Teklif)
-- =====================================================================================
--
--  Müşteriye verilen fiyat teklifleri `teklifler` tablosuna yazılır: görevler/faturalar gibi TEKİL
--  satır (id = 'tekil'), bütün liste `veri` içinde JSON. Teklif sipariş DEĞİLDİR; onaylanınca uygulama
--  ondan normal bir satış siparişi açar (siparisler tablosu). Tablo yoksa yazma başarısız olur ve
--  ekranın üstünde "Buluta yazılamadı: teklifler" uyarısı çıkar; yerel kopya çalışır ama ikinci
--  cihazda teklifler görünmez.
--
--  ÇALIŞTIRMA: Supabase > SQL Editor > New query > bu dosyayı yapıştır > Run. Tekrar çalıştırılabilir.
--  Değişiklik sayacı (degisiklik-sayaci.sql) ve sunucu arşivi (silinen-arsiv.sql) kuruluysa bu dosya
--  tabloyu ikisine de bağlar; kurulu değilse o adımlar atlanır.
-- =====================================================================================

begin;

create table if not exists public.teklifler (
  id text primary key,
  veri jsonb not null default '[]'::jsonb,
  guncelleme timestamptz not null default now()
);

alter table public.teklifler enable row level security;

drop policy if exists "teklifler_hepsi" on public.teklifler;
drop policy if exists "giris_yapmis_hersey" on public.teklifler;
create policy "giris_yapmis_hersey" on public.teklifler
  for all to authenticated
  using (true)
  with check (true);

revoke all on public.teklifler from anon;
grant all on public.teklifler to authenticated;

-- Değişiklik sayacı (başka cihazın yazdığını 20 sn'de görmek için) — fonksiyon varsa.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'degisiklik_izle_kur') then
    perform public.degisiklik_izle_kur('teklifler');
  end if;
end $$;

-- Sunucu arşivi: güncelleme öncesi görüntü + silme izi — fonksiyonlar varsa.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'arsive_kopyala_goruntu') then
    execute 'drop trigger if exists arsiv_goruntu on public.teklifler';
    execute 'create trigger arsiv_goruntu before update on public.teklifler for each row execute function public.arsive_kopyala_goruntu()';
  end if;
  if exists (select 1 from pg_proc where proname = 'arsive_kopyala_silinen') then
    execute 'drop trigger if exists arsiv_silinen on public.teklifler';
    execute 'create trigger arsiv_silinen before delete on public.teklifler for each row execute function public.arsive_kopyala_silinen()';
  end if;
end $$;

commit;

-- DOĞRULAMA: select policyname, roles from pg_policies where tablename = 'teklifler';
--   Beklenen: tek satır "giris_yapmis_hersey" · {authenticated}
