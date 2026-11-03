#!/usr/bin/env bash
# CANLI BENZERİ TEST VERİTABANI (güvenlik sıkılaştırması için). Yalnız yerel PostgreSQL; Supabase'e DOKUNMAZ.
#  1) stok-v2/test/kos.sh — bütün sistem (1.744.7 kaynakları, rls-kimlik dahil)
#  2) extensions şeması + pgcrypto (Supabase'te pgcrypto `extensions`ta; portal_giris / site_kayit_ol crypt kullanır)
#  3) site-portal.sql — sitenin 8 girişsiz fonksiyonu + ERP site yönetimi. Test şemasında olmayan site sütunları eklenir
#     (yalnız bu test veritabanında); gövde denetimi kapalı kurulur.
#  4) Supabase'in varsayılan yetkileri KURULUMDAN ÖNCE taklit edilir (canlıda olduğu gibi): template1'e "yeni fonksiyon anon /
#     authenticated / service_role'e açık" varsayılanı konur, kos.sh veritabanını ondan yaratır; depodaki SQL'lerin kendi
#     revoke'ları kurulumdan SONRA çalışır (canlıdaki sıra). Bitince template1 eski hâline döner.
set -eu
cd "$(dirname "$0")/../../.."
DB=${GUVENLIK_DB:-atolye_guvenlik}
VARS="alter default privileges in schema public %s all on functions %s anon, authenticated, service_role;"
psql -X -q -d template1 -c "$(printf "$VARS" grant to)"
trap 'psql -X -q -d template1 -c "$(printf "$VARS" revoke from)"' EXIT
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
# Canlıdaki sıra: surum tablosu varken rls-kimlik.sql (anon'a yalnız surum okuması) → site-portal.sql (site fonksiyonları anon'a)
q -f rls-kimlik.sql > /dev/null 2>&1
site
echo "hazır: $DB"
