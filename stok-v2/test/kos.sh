#!/usr/bin/env bash
# STOK v2 — yerel PostgreSQL sınaması. Supabase'e DOKUNMAZ.
# Boş bir veritabanı açar; Supabase taklidi → bugünkü tabloların taklidi + örnek veri → depodaki yardımcı SQL'ler
# (yetki, değişiklik sayacı, silme arşivi — Supabase'te kurulu olanların aynısı) → stok-v2.sql → stok-v2-goc.sql → sinama.sql.
# Kullanım: PGHOST=/soket/dizini PGPORT=55432 PGUSER=postgres stok-v2/test/kos.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${STOK_V2_DB:-atolye_stok_v2_sinama}
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
calistir() { echo "── $1"; psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1"; }
calistir stok-v2/test/supabase-taklit.sql
calistir stok-v2/test/eski-tablolar.sql
# rls-yazma.sql'nin yalnız yetki_var_mi fonksiyonu (dosyanın geri kalanı bu taklitte olmayan tablolara tetikleyici kurar).
echo "── rls-yazma.sql (yetki_var_mi)"
awk '/^create or replace function public.yetki_var_mi/,/^end \$\$;/' rls-yazma.sql | psql -X -q -v ON_ERROR_STOP=1 -d "$DB"
calistir degisiklik-sayaci.sql
calistir silinen-arsiv.sql
calistir stok-v2/stok-v2.sql
calistir stok-v2/stok-v2.sql          # ikinci kez: tekrar çalıştırmak zararsız olmalı
calistir stok-v2/stok-v2-goc.sql
calistir stok-v2/test/sinama.sql
