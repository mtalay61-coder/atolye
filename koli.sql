-- KOLİ TABLOSU (Paketleme) — v1.86.0
--
-- NEDEN GEREKLİ
-- Paketleme modülü koli kayıtlarını `koliler` tablosuna yazıyor. Tablo yoksa yazma başarısız
-- oluyor ve ekranın üstünde "Buluta yazılamadı: koliler" uyarısı çıkıyor. VERİ KAYBOLMUYOR —
-- yerel kopya (IndexedDB) yazılıyor — ama diğer cihazlara geçmiyor.
--
-- Diğer tekil tablolarla (muhasebe, tanimlar) aynı desen: tek satır, `veri` sütununda JSON.
-- Koliler ayrı satırlara bölünmedi çünkü koli sayısı sınırlı ve içerik zaten iç içe bir liste;
-- bölmek kazanç sağlamadan cari/stok tablolarındaki gibi bir alt tablo yönetimi getirirdi.
--
-- ÇALIŞTIRMA: Supabase > SQL Editor > yapıştır > Run.

create table if not exists public.koliler (
  id text primary key,
  veri jsonb not null default '{}'::jsonb,
  guncelleme timestamptz not null default now()
);

alter table public.koliler enable row level security;

-- Diğer tablolarla aynı erişim kuralı: anon anahtarla okuma/yazma.
-- (Kimlik doğrulama 2. aşamaya geçilirse bu politika da diğerleriyle birlikte daraltılmalı.)
drop policy if exists "koliler_hepsi" on public.koliler;
create policy "koliler_hepsi" on public.koliler
  for all
  using (true)
  with check (true);
