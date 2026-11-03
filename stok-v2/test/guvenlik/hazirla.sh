#!/usr/bin/env bash
# CANLI BENZERİ TEST VERİTABANI (güvenlik sıkılaştırması için). Yalnız yerel PostgreSQL; Supabase'e DOKUNMAZ.
#  1) stok-v2/test/kos.sh — bütün sistem (1.744.7 kaynakları, rls-kimlik dahil)
#  2) extensions şeması + pgcrypto (Supabase'te pgcrypto `extensions`ta; portal_giris / site_kayit_ol crypt kullanır)
#  3) site-portal.sql — sitenin 8 girişsiz fonksiyonu + ERP site yönetimi. Test şemasında olmayan site sütunları eklenir
#     (yalnız bu test veritabanında); gövde denetimi kapalı kurulur.
#  4) Supabase'in varsayılan yetkileri taklit edilir: public'teki fonksiyonlar anon / authenticated / service_role'e açık,
#     yeni fonksiyonlar da öyle (alter default privileges) → ardından canlıdaki sırayla rls-kimlik.sql ve site-portal.sql.
set -eu
cd "$(dirname "$0")/../../.."
DB=${GUVENLIK_DB:-atolye_guvenlik}
STOK_V2_DB="$DB" bash stok-v2/test/kos.sh > /tmp/guvenlik-kos.txt 2>&1 || { echo "kos.sh düştü — /tmp/guvenlik-kos.txt"; exit 2; }
q() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
q -c "create schema if not exists extensions; create extension if not exists pgcrypto schema extensions;"
q -c "alter table cariler add column if not exists pasif boolean;
      alter table urunler add column if not exists ek jsonb default '{}', add column if not exists fiyat_kurallari jsonb,
        add column if not exists kapak_resmi text, add column if not exists mamul_tipi text, add column if not exists pasif boolean,
        add column if not exists renk_resimleri jsonb, add column if not exists satis_para_birimi text, add column if not exists sezon_yili text;
      alter table uretim add column if not exists renk text, add column if not exists stoga_eklendi_mi boolean;
      create table if not exists public.surum (id text primary key, surum text, url text);"
site() { (echo "set check_function_bodies = off;"; cat site-portal.sql) | q > /dev/null 2>&1; }
site
q -c "alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
      grant execute on all functions in schema public to anon, authenticated, service_role;"
q -f rls-kimlik.sql > /dev/null 2>&1
site
echo "hazır: $DB"
