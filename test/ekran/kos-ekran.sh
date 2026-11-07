#!/usr/bin/env bash
# EKRAN SINAMASI KOŞUCUSU (7 Kasım). Yalnız yerel PostgreSQL; Supabase'e bağlanmaz.
#   1. atolye_ekran ← atolye_guvenlik kopyası (canlı benzeri, sıkılaştırılmış) → 12-geri-al (canlıda 12 YOK) → fiş kuralları ve sürüm
#      kapısı KAPALI (canlı gibi) → sema-tamamla.sql (test şemasının eksik sütun / tabloları) → kurulum.sql (Ekran Bot, gelir/gider kartı)
#   2. istemci: ISTEMCI_DIZIN (vars. origin/main = yayındaki 1.744.7) geçici çalışma ağacında derlenir (test.html)
#   3. ekran-stok.js, ekran-kasa.js
# Gerekli: KOPRU_PG = node "pg" modülünün yolu (depoda bağımlılık yok; ör. npm install pg ile geçici bir klasöre)
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
cd "$(dirname "$0")/../.."
KOK=$(pwd); DB=${EKRAN_DB:-atolye_ekran}
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB template atolye_guvenlik" || exit 2
q() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
q -f stok-v2/guvenlik/12-geri-al.sql > /dev/null || exit 2
q -c "update public.stk_ayar set fis_aktif = false, min_istemci_surum = null where id = 'tekil'" || exit 2
q -f test/ekran/sema-tamamla.sql > /dev/null 2>&1 || exit 2
q -f test/ekran/kurulum.sql > /dev/null || exit 2
echo "veritabanı $DB hazır · uretim_sil $(psql -X -At -d $DB -c "select count(*) from pg_proc where proname = 'uretim_sil'") · kurallar $(psql -X -At -d $DB -c "select public.fis_kural_aktif()")"
if [ -z "${ISTEMCI_DIZIN:-}" ]; then
  T=$(mktemp -d); git worktree add -q --detach "$T/w" origin/main; ln -sfn "$KOK/node_modules" "$T/w/node_modules"
  (cd "$T/w" && node tema-gom.js > /dev/null && node birlestir.js src atolye-erp.jsx > /dev/null && cd test && node derle.js > /dev/null && node paket-test.js > /dev/null) || exit 2
  export ISTEMCI_DIZIN=$T/w
fi
echo "istemci $(grep -o 'const SURUM = "[0-9.]*"' "$ISTEMCI_DIZIN/test/test.html" | head -1)"
export EKRAN_DB=$DB
hata=0
for t in ${EKRAN_TESTLER:-ekran-stok ekran-kasa}; do
  [ -f "test/ekran/$t.js" ] || continue
  EKRAN_TABLO=${EKRAN_CIKTI:-/tmp}/$t.json node test/ekran/$t.js || hata=$((hata + 1))
done
echo "── kos-ekran: $([ $hata = 0 ] && echo TEMİZ || echo "$hata test kırmızı") ──"
exit $([ $hata = 0 ] && echo 0 || echo 1)
