-- =====================================================================================
--  silinen-arsiv.sql — SUNUCU TARAFI SİLİNENLER ARŞİVİ (3 Ekim, v1.549.0)
-- =====================================================================================
--
--  NEDEN: Çöp kutusu uygulamanın İÇİNDE. Hesabı ele geçen biri (ya da hatalı bir sürüm) kaydı
--  silip çöpü de boşaltırsa iz kalmaz — çöp kutusu da sonuçta uygulamanın silebildiği bir tablo.
--  Bu dosya veritabanının KENDİSİNE bir arşiv ekliyor: silinen her satır, silinmeden hemen önce
--  `silinen_arsiv` tablosuna kopyalanır. Kopyayı veritabanı tetikleyicisi yapar; uygulama bu
--  tabloya YAZAMAZ, SİLEMEZ, DEĞİŞTİREMEZ — yalnız okuyabilir (Tanımlar › Çöp Kutusu ›
--  "Sunucu arşivi", yalnız Yönetici). Yani uygulamadan yapılan hiçbir şey bu izi yok edemez.
--
--  NE ARŞİVLENİR:
--    • Satır tabloları (ürün, varyant, stok/cari hareketi, cari, sipariş + kalem, üretim + atama,
--      rezervasyon, onay, çek görseli, ÇÖP): her DELETE'te silinen satırın tamamı.
--    • Tek satırlık tablolar (tanımlar, modeller, görevler, koliler, faturalar, muhasebe): bunlar
--      silinmez, BÜTÜN OLARAK üstüne yazılır — bir rengi silmek = tanımlar satırını güncellemek.
--      Bu yüzden güncellemede ESKİ hâlin anlık görüntüsü alınır; her tabloda en çok SAATTE BİR
--      (her tuş vuruşunda değil — arşiv şişmesin).
--    • TRUNCATE (tabloyu tek seferde boşaltma) satır satır iz bırakmadığı için giriş yapmış
--      kullanıcıdan TAMAMEN alınır; uygulama zaten kullanmıyor.
--
--  SAKLAMA: silinen satırlar 365 gün, tek satırlık tabloların anlık görüntüleri 90 gün. Eskiler
--  tetikleyicinin kendisi tarafından ara ara temizlenir (uygulama değil).
--
--  NASIL ÇALIŞTIRILIR: Supabase > SQL Editor > New query > tamamını yapıştır > Run. Tekrar
--  çalıştırmak güvenli (idempotent). Hata verirse hiçbir şey değişmez (tek işlem).
--  NOT: rls-kimlik.sql (v1.549.0 ve sonrası) bu tabloya dokunmuyor; yeniden çalıştırılabilir.
--
--  GERİ ALMA: dosyanın sonundaki yorum bloğu (tetikleyicileri ve tabloyu kaldırır).
-- =====================================================================================

begin;

-- 1) Arşiv tablosu
create table if not exists public.silinen_arsiv (
  id        bigserial primary key,
  tablo     text        not null,
  islem     text        not null,                 -- 'DELETE' ya da 'GORUNTU' (tek satırlık tablo, güncelleme öncesi)
  satir_id  text,
  veri      jsonb       not null,
  silen     uuid        default auth.uid(),       -- Supabase oturumundaki kullanıcı (kimlik)
  silen_eposta text     default (auth.jwt() ->> 'email'),  -- uygulama bunu kullanıcı adına çevirir
  zaman     timestamptz not null default now()
);
alter table public.silinen_arsiv add column if not exists silen_eposta text default (auth.jwt() ->> 'email');
create index if not exists silinen_arsiv_zaman on public.silinen_arsiv (zaman desc);
create index if not exists silinen_arsiv_tablo on public.silinen_arsiv (tablo, zaman desc);

-- 2) Yetkiler: giriş yapmış kullanıcı YALNIZ OKUR. Ekleme/silme/güncelleme/boşaltma yok —
--    satırları yalnız aşağıdaki SECURITY DEFINER tetikleyici (tablo sahibi yetkisiyle) yazar.
alter table public.silinen_arsiv enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'silinen_arsiv' loop
    execute format('drop policy %I on public.silinen_arsiv', p.policyname);
  end loop;
end $$;
create policy "arsiv_yalniz_okuma" on public.silinen_arsiv for select to authenticated using (true);
revoke all on public.silinen_arsiv from anon, authenticated;
grant select on public.silinen_arsiv to authenticated;
revoke all on sequence public.silinen_arsiv_id_seq from anon, authenticated;

-- 3) Silinen satırı kopyalayan tetikleyici
create or replace function public.arsive_kopyala_silinen()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.silinen_arsiv (tablo, islem, satir_id, veri)
  values (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD) ->> 'id', to_jsonb(OLD));
  -- Ara ara (~her 200 silmede bir) 365 günden eskiler temizlenir.
  if random() < 0.005 then
    delete from public.silinen_arsiv where islem = 'DELETE' and zaman < now() - interval '365 days';
  end if;
  return OLD;
end $$;

-- 4) Tek satırlık tablonun eski hâlini (saatte en çok bir kez) saklayan tetikleyici
create or replace function public.arsive_kopyala_goruntu()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if OLD.veri is distinct from NEW.veri and not exists (
    select 1 from public.silinen_arsiv
    where tablo = TG_TABLE_NAME and islem = 'GORUNTU' and zaman > now() - interval '1 hour'
  ) then
    insert into public.silinen_arsiv (tablo, islem, satir_id, veri)
    values (TG_TABLE_NAME, 'GORUNTU', to_jsonb(OLD) ->> 'id', to_jsonb(OLD));
    delete from public.silinen_arsiv where islem = 'GORUNTU' and zaman < now() - interval '90 days';
  end if;
  return NEW;
end $$;

revoke all on function public.arsive_kopyala_silinen() from public, anon, authenticated;
revoke all on function public.arsive_kopyala_goruntu() from public, anon, authenticated;

-- 5) Tetikleyicileri bağla (olmayan tablo atlanır — kurulumda hiç açılmamış olabilir)
do $$
declare t text;
begin
  foreach t in array array[
    'urunler', 'varyantlar', 'stok_hareketleri', 'cariler', 'cari_hareketleri',
    'siparisler', 'siparis_kalemleri', 'uretim', 'uretim_atamalari',
    'stok_rezervasyonlari', 'onaylar', 'cek_gorselleri', 'cop'
  ] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      execute format('drop trigger if exists arsiv_silinen on public.%I', t);
      execute format('create trigger arsiv_silinen before delete on public.%I for each row execute function public.arsive_kopyala_silinen()', t);
    end if;
  end loop;
  foreach t in array array['tanimlar', 'modeller', 'gorevler', 'koliler', 'faturalar', 'muhasebe'] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      execute format('drop trigger if exists arsiv_goruntu on public.%I', t);
      execute format('create trigger arsiv_goruntu before update on public.%I for each row execute function public.arsive_kopyala_goruntu()', t);
      -- Tek satırın kendisi silinirse de iz kalsın.
      execute format('drop trigger if exists arsiv_silinen on public.%I', t);
      execute format('create trigger arsiv_silinen before delete on public.%I for each row execute function public.arsive_kopyala_silinen()', t);
    end if;
  end loop;
end $$;

-- 6) TRUNCATE yetkisi giriş yapmış kullanıcıdan alınır (satır tetikleyicisi TRUNCATE'te çalışmaz).
revoke truncate on all tables in schema public from authenticated;

commit;

-- DOĞRULAMA — bir deneme kaydı silin (ör. çöpten bir kaydı kalıcı silin), sonra:
--   select tablo, islem, satir_id, zaman from silinen_arsiv order by zaman desc limit 10;
-- Uygulamadan silme denemesi REDDEDİLMELİ (Supabase > SQL Editor'de değil, uygulamada çalışan
-- kullanıcı yetkisiyle): "permission denied for table silinen_arsiv".

-- =====================================================================================
--  GERİ ALMA (gerekirse — yorumdan çıkarıp çalıştırın)
-- =====================================================================================
-- begin;
-- do $$
-- declare t text;
-- begin
--   foreach t in array array['urunler','varyantlar','stok_hareketleri','cariler','cari_hareketleri',
--     'siparisler','siparis_kalemleri','uretim','uretim_atamalari','stok_rezervasyonlari','onaylar',
--     'cek_gorselleri','cop','tanimlar','modeller','gorevler','koliler','faturalar','muhasebe'] loop
--     if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
--       execute format('drop trigger if exists arsiv_silinen on public.%I', t);
--       execute format('drop trigger if exists arsiv_goruntu on public.%I', t);
--     end if;
--   end loop;
-- end $$;
-- drop function if exists public.arsive_kopyala_silinen();
-- drop function if exists public.arsive_kopyala_goruntu();
-- drop table if exists public.silinen_arsiv;   -- ARŞİV DE GİDER — emin değilseniz bu satırı atlayın
-- commit;
