-- Yalıtılmış test: Supabase'in ilgili parçalarının taklidi (yalnız yerel).
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator login noinherit; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;
grant usage on schema auth, extensions to anon, authenticated, service_role;
-- Supabase'teki tanımla aynı: PostgREST istek başına request.jwt.claims ayarlar.
create function auth.jwt() returns jsonb language sql stable as
  'select coalesce(nullif(current_setting(''request.jwt.claim'', true), ''''), nullif(current_setting(''request.jwt.claims'', true), ''''))::jsonb';
create function auth.role() returns text language sql stable as 'select auth.jwt() ->> ''role''';
create function auth.uid() returns uuid language sql stable as 'select nullif(auth.jwt() ->> ''sub'', '''')::uuid';
create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz default now());
grant usage on schema public to anon, authenticated, service_role;
-- Supabase varsayılanı: public'teki yeni tablolar anon / authenticated / service_role'e açık doğar.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
-- ERP tablolarının en küçük hâli (site fonksiyonlarının dokunduğu sütunlar).
create table public.tanimlar (id text primary key, veri jsonb);
create table public.cariler (id uuid primary key default gen_random_uuid(), unvan text, pasif boolean, ek jsonb);
create table public.siparisler (id uuid primary key default gen_random_uuid(), siparis_no text, cari_id uuid, tip text, durum text, tarih text, teslim_tarihi text, ek jsonb);
create table public.urunler (id uuid primary key default gen_random_uuid(), ad text, mamul_tipi text, ek jsonb, pasif boolean, kategori text, renk_resimleri text, kapak_resmi text, fiyat_kurallari text, sezon_yili int, satis_para_birimi text);
create table public.varyantlar (urun_id uuid, renk text, beden text, miktar numeric);
create table public.siparis_kalemleri (id uuid primary key default gen_random_uuid(), siparis_id uuid, urun_id uuid, urun_ad text, renk text, beden text, miktar numeric, fiyat numeric, para_birimi text, karsilanan numeric, ek jsonb);
create table public.cari_hareketleri (id uuid primary key default gen_random_uuid(), cari_id uuid, defter text, para_birimi text, yon text, tutar numeric, tarih text, zaman text, fis_no text, siparis_no text, aciklama text, urun_ad text, renk text, odeme_sekli text, vade text, ek jsonb);
create table public.uretim (id uuid primary key default gen_random_uuid(), urun_id uuid, renk text, rezervasyon_siparis_id uuid, siparis_no text, stoga_eklendi_mi boolean, asama text);
create table public.stok_hareketleri (id uuid primary key default gen_random_uuid(), siparis_id uuid, kalem_id uuid, miktar numeric);
create table public.muhasebe (id text primary key, veri jsonb);
create table public.gunluk (id bigserial primary key, zaman timestamptz default now(), metin text);
