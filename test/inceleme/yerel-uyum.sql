-- YEREL TEST UYUMU (26 Kasım) — YALNIZ yerel test veritabanı. Canlı yetki dökümü (25-canli-tam-yapi-salt-okur.sql) gelene kadar
-- GEÇİCİ VARSAYIM; o gelince bu dosya yerine canlının yetki / politika satırları uygulanır.
-- 1. auth.uid(): köprü (test/gercek-pg-kopru.js) jetonda sub = e-posta gönderir; Supabase'de sub bir UUID'dir. UUID değilse null.
create or replace function auth.uid() returns uuid language sql stable as
'select case when (auth.jwt() ->> ''sub'') ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' then (auth.jwt() ->> ''sub'')::uuid end';
grant usage on schema auth to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
-- 2. Görünümleri okuma (uygulama açılışta varyantlar / stok_hareketleri / cari_hareketleri / siparisler_okuma okur).
do 'declare v text; begin for v in select viewname from pg_views where schemaname = ''public'' loop
  execute format(''grant select on public.%I to authenticated'', v); end loop; end';
-- 3. Uygulamanın REST ile doğrudan yazdığı sipariş tabloları (canlıda bu yazmalar çalıştığına göre yetki var; varsayım).
grant select, insert, update, delete on public.siparisler, public.siparis_kalemleri to authenticated;
