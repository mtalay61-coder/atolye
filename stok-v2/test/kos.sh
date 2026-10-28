#!/usr/bin/env bash
# STOK v2 — yerel PostgreSQL sınaması. Supabase'e DOKUNMAZ.
# Boş bir veritabanı açar; Supabase taklidi → bugünkü tabloların taklidi + örnek veri → depodaki yardımcı SQL'ler
# (yetki, değişiklik sayacı, silme arşivi — Supabase'te kurulu olanların aynısı) → stok-v2.sql → stok-v2-goc.sql → sinama.sql.
# Kullanım: PGHOST=/soket/dizini PGPORT=55432 PGUSER=postgres stok-v2/test/kos.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${STOK_V2_DB:-atolye_stok_v2_sinama}
calistir() { echo "── $1"; psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1"; }
kur() {
  psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
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
  # Supabase'te tablo ekleyen her SQL'den sonra rls-kimlik.sql yeniden çalıştırılıyor (DEVAM-NOTU): stok v2 tablolarını
  # yazılabilir yapmamalı — sinama.sql § 6 doğrudan yazmanın reddedildiğini sınar.
  calistir rls-kimlik.sql
}
kur
calistir stok-v2/test/sinama.sql
kur                                    # geçiş sınaması taze veritabanında
calistir stok-v2/test/sinama-gecis.sql
# Uçtan uca: uygulamanın yazma katmanı (test/erp.cjs) → stk_yaz → görünümler. erp.cjs yoksa: cd test && node derle.js
if [ -f test/erp.cjs ]; then
  kur
  echo "── stk_gecis()"
  psql -X -q -At -v ON_ERROR_STOP=1 -d "$DB" -c "select public.stk_gecis() is not null;" >/dev/null
  echo "── stok-v2/test/uctan-uca.js"
  STOK_V2_DB="$DB" node stok-v2/test/uctan-uca.js
else
  echo "── uçtan uca atlandı: test/erp.cjs yok (cd test && node derle.js)"
fi
