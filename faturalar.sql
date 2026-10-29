-- =====================================================================================
--  faturalar.sql — FATURALAR TABLOSU (27 Eylül, v1.500.0 — e-fatura altyapısı, Aşama 2)
-- =====================================================================================
--
--  Fatura taslakları (ve Aşama 3'te gönderilen faturaların durumu/numarası) `faturalar` tablosuna
--  yazılıyor: görevler/koliler gibi TEKİL satır (id = 'tekil'), bütün liste `veri` içinde JSON.
--  Tablo yoksa yazma başarısız olur ve ekranın üstünde "Buluta yazılamadı: faturalar" uyarısı
--  çıkar. VERİ KAYBOLMAZ — yerel kopya çalışır — ama ikinci cihazda taslaklar görünmez.
--
--  ÇALIŞTIRMA: Supabase > SQL Editor > New query > bu dosyayı yapıştır > Run.
--
--  GÜVENLİK: bu veritabanında `rls-kimlik.sql` çalıştırılmış (yalnız giriş yapmış kullanıcı). Bu dosya
--  AYNI kuralı kurar — "herkese açık" politika KURMAZ: faturada müşterinin vergi no'su ve adresi var.
--  Tek işlem (BEGIN/COMMIT): hata verirse hiçbir şey değişmez. Tekrar çalıştırılabilir.
-- =====================================================================================

begin;

-- LİSTE v2'DEN SONRA ÇALIŞTIRILMAZ (v1.730.1): faturalar artık `lst_kayit`'in görünümü (stok-v2/liste-v2.sql). Görünüme
-- RLS / politika kurulamaz; dosya yarıda düşerdi. Açık hata ile durur, hiçbir şey değişmez.
do $$ begin
  if exists (select 1 from pg_views where schemaname = 'public' and viewname in ('faturalar')) then
    raise exception 'Bu liste v2''ye geçti (görünüm) — bu dosya artık çalıştırılmaz; yapı stok-v2/liste-v2.sql''de';
  end if;
end $$;

create table if not exists public.faturalar (
  id text primary key,
  veri jsonb not null default '[]'::jsonb,
  guncelleme timestamptz not null default now()
);

alter table public.faturalar enable row level security;

drop policy if exists "faturalar_hepsi" on public.faturalar;
drop policy if exists "giris_yapmis_hersey" on public.faturalar;
create policy "giris_yapmis_hersey" on public.faturalar
  for all to authenticated
  using (true)
  with check (true);

revoke all on public.faturalar from anon;
grant all on public.faturalar to authenticated;

commit;

-- DOĞRULAMA: select policyname, roles from pg_policies where tablename = 'faturalar';
--   Beklenen: tek satır "giris_yapmis_hersey" · {authenticated}
