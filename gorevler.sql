-- =====================================================================================
--  gorevler.sql — GÖREVLER TABLOSU (14 Eylül, v1.277.0)
-- =====================================================================================
--
--  Görevler modülü kayıtlarını `gorevler` tablosuna yazıyor (koliler/muhasebe gibi TEKİL satır:
--  id = 'tekil', bütün liste `veri` içinde JSON). Tablo yoksa yazma başarısız olur ve ekranın
--  üstünde "Buluta yazılamadı: gorevler" uyarısı çıkar. VERİ KAYBOLMAZ — yerel kopya çalışır —
--  ama ikinci bilgisayarda görevler görünmez.
--
--  ÇALIŞTIRMA: Supabase > SQL Editor > New query > bu dosyayı yapıştır > Run.
--
--  NOT: `rls-kimlik.sql` (2. aşama) ÇALIŞTIRILDIYSA aşağıdaki "anon" politikası yerine o dosyayı
--  yeniden çalıştırın — o, public şemasındaki HER tabloya giriş yapmış kullanıcı politikası kurar
--  ve yeni tabloyu da kapsar.
-- =====================================================================================

create table if not exists public.gorevler (
  id text primary key,
  veri jsonb not null default '[]'::jsonb,
  guncelleme timestamptz not null default now()
);

alter table public.gorevler enable row level security;

-- Diğer tablolarla aynı erişim kuralı: anon anahtarla okuma/yazma.
drop policy if exists "gorevler_hepsi" on public.gorevler;
create policy "gorevler_hepsi" on public.gorevler
  for all
  using (true)
  with check (true);

-- =====================================================================================
--  MESAJLAR (Sohbet modülü, v1.278.0) — aynı kalıp: tekil satır, liste `veri` içinde.
-- =====================================================================================
create table if not exists public.mesajlar (
  id text primary key,
  veri jsonb not null default '[]'::jsonb,
  guncelleme timestamptz not null default now()
);

alter table public.mesajlar enable row level security;

drop policy if exists "mesajlar_hepsi" on public.mesajlar;
create policy "mesajlar_hepsi" on public.mesajlar
  for all
  using (true)
  with check (true);

-- =====================================================================================
--  SÜRÜM DUYURUSU (v1.279.0) — "yeni sürüm çıktı, buradan indir" kaydı.
--  Yönetici Tanımlar > Genel > "Sürüm yayınla" ile yazar; herkesin uygulaması açılışta okur.
-- =====================================================================================
create table if not exists public.surum (
  id text primary key,
  veri jsonb not null default '{}'::jsonb,
  guncelleme timestamptz not null default now()
);

alter table public.surum enable row level security;

drop policy if exists "surum_hepsi" on public.surum;
create policy "surum_hepsi" on public.surum
  for all
  using (true)
  with check (true);

-- =====================================================================================
--  FİŞ DEFTERİ (v1.302.0, Adım 1) — her fişin TEK kaydı.
--
--  Stok, sipariş karşılananı ve cari hareketi bu kaydın TÜREVİDİR. Fiş kesilirken önce buraya
--  yazılır; yazılamazsa işlem hiç yapılmaz. Geri alınan fiş SİLİNMEZ, `iptal: true` olur.
-- =====================================================================================
create table if not exists public.fis_defteri (
  id text primary key,
  veri jsonb not null default '[]'::jsonb,
  guncelleme timestamptz not null default now()
);

alter table public.fis_defteri enable row level security;

drop policy if exists "fis_defteri_hepsi" on public.fis_defteri;
create policy "fis_defteri_hepsi" on public.fis_defteri
  for all
  using (true)
  with check (true);

-- =====================================================================================
--  MODELHANE (v1.321.0) — koleksiyona girmemiş modeller.
--
--  Model STOK DEĞİLDİR: ürün kartı olarak açılsa stok listesine, stok değerine ve ihtiyaç
--  hesabına karışırdı. Onaylanan model "Koleksiyona Al" ile mamul ürün kartına dönüşür;
--  model kaydı arşivde kalır ve oluşan ürünün kimliğini taşır.
-- =====================================================================================
create table if not exists public.modeller (
  id text primary key,
  veri jsonb not null default '[]'::jsonb,
  guncelleme timestamptz not null default now()
);

alter table public.modeller enable row level security;

drop policy if exists "modeller_hepsi" on public.modeller;
create policy "modeller_hepsi" on public.modeller
  for all
  using (true)
  with check (true);
