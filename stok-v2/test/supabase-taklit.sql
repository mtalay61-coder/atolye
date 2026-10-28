-- YEREL SINAMA İÇİN SUPABASE TAKLİDİ (stok v2) — yalnız yerel PostgreSQL'de çalıştırılır, Supabase'e VERİLMEZ.
-- Supabase'in hazır verdiği şeyler: `auth` şeması (jwt(), uid()), `anon` / `authenticated` rolleri. Testte jwt boş döner
-- (SQL Editor / servis rolü gibi) ya da `set local request.jwt.claims` ile bir kullanıcının e-postası verilir.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb
$$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
