#!/usr/bin/env bash
# Yalnız yerel test DB'sinin ayrı kopyasında geri dönüş ve yeniden kurulum.
set -euo pipefail
cd "$(dirname "$0")/../../.."
case "${PGHOST:-}" in localhost|127.0.0.1|::1|/*) ;; *) echo 'Yalnız yerel test sunucusu'; exit 2;; esac
COPY_DB=atolye_butunluk_geri_sinama
OUT_DIR=${ATOLYE_GERI_CIKTI:-/tmp}
psql -X -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $COPY_DB" -c "create database $COPY_DB template atolye_stok_v2_sinama"
AUDIT_ONCE=$(psql -X -At -d "$COPY_DB" -c 'select count(*) from public.fis_cek_iz')
psql -X -q -v ON_ERROR_STOP=1 -d "$COPY_DB" -f stok-v2/geri-donus-1.744.3.sql
if STOK_V2_DB="$COPY_DB" FINANS_N=1 node stok-v2/test/finans/t-cek-yaris.js > "$OUT_DIR/geri-cek-red.txt" 2>&1; then echo 'Eski çek açığı geri gelmedi'; exit 3; fi
rg -q '2 !== 1' "$OUT_DIR/geri-cek-red.txt"
if STOK_V2_DB="$COPY_DB" node stok-v2/test/finans/t-seyrek-alt.js > "$OUT_DIR/geri-alt-red.txt" 2>&1; then echo 'Eski seyrek alan açığı geri gelmedi'; exit 4; fi
rg -q 'fiyat: null' "$OUT_DIR/geri-alt-red.txt"
for f in stok-v2/stok-v2.sql stok-v2/cari-v2.sql stok-v2/alt-v2.sql stok-v2/kasa-v2.sql stok-v2/fis-defteri.sql; do
 psql -X -q -v ON_ERROR_STOP=1 -d "$COPY_DB" -f "$f"
done
AUDIT_SONRA=$(psql -X -At -d "$COPY_DB" -c 'select count(*) from public.fis_cek_iz')
[ "$AUDIT_ONCE" = "$AUDIT_SONRA" ] || { echo 'Audit satırı kaybı/farkı'; exit 5; }
[ "$(psql -X -At -d "$COPY_DB" -c "select siparis_durum_sunucu from public.stk_ayar where id='tekil'")" = t ]
STOK_V2_DB="$COPY_DB" FINANS_N=1 node stok-v2/test/finans/t-cek-yaris.js
STOK_V2_DB="$COPY_DB" node stok-v2/test/finans/t-seyrek-alt.js
STOK_V2_DB="$COPY_DB" node stok-v2/test/finans/t-cek-iptal.js
echo "✓ Geri dönüş eski iki açığı üretti; yeniden kurulum korumaları geri getirdi; $AUDIT_ONCE audit satırı korundu; durum görünümü etkin"
