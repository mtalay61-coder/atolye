-- ÇEK GÖRSELLERİ
--
-- Çekin ön ve arka yüzünün fotoğrafı. AYRI TABLO, çek başına bir satır.
--
-- Neden `muhasebe` kaydının içinde değil: çekler `muhasebe` TEKİL kaydında (tek satır, tek JSON)
-- duruyor. Görselleri oraya koymak, ürün görsellerinde çarptığımız duvarın aynısı olurdu —
-- uygulamanın kayıt başına 5 MB sınırı var ve dolduğunda MUHASEBE KAYDEDİLEMEZ hâle gelir.
-- Çek başına iki fotoğrafla o sınıra hızlı gidilir. Ayrı tabloda her çek kendi satırında.
--
-- `id` = çekin kimliği. Çek silinince görseli de silinsin diye uygulama tarafı ilgileniyor;
-- veritabanı düzeyinde yabancı anahtar YOK, çünkü çeklerin kendi tablosu da yok.

create table if not exists cek_gorselleri (
  id text primary key,
  on_yuz text,
  arka_yuz text,
  guncellendi timestamptz default now()
);

alter table cek_gorselleri enable row level security;

-- Diğer tablolarla aynı politika: uygulama tek anahtarla bağlanıyor.
drop policy if exists "cek_gorselleri_hepsi" on cek_gorselleri;
create policy "cek_gorselleri_hepsi" on cek_gorselleri for all using (true) with check (true);
