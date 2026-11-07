#!/usr/bin/env bash
# 12 KURULU SUNUCU × 1.744.7 / 1.744.8 İSTEMCİ — ÜRETİM SİLME (7 Kasım). Yalnız yerel; Supabase'e bağlanmaz.
#   1. atolye_guvenlik kopyası → 12-geri-al (canlının bugünkü hâli) → 12-uretim-sil-kur → 12-sonra-dogrula 8/8; kurallar KAPALI
#   2. 1.744.7 istemcisi: origin/main (yayındaki sürüm) geçici çalışma ağacında derlenir (ESKI_ERP verilirse o kullanılır)
#   3. t-istemci-uretim-sil.js 1.744.7 ile (ISTEMCI_ESKI=1) sonra 1.744.8 (test/erp.cjs) ile — durum: yeni / eski / karma / fişsiz / bayat
#   4. t-eski-istemci-koru.js — eski istemci korumasının normal fiş iptallerini ve planlama değişikliklerini etkilemediği
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
cd "$(dirname "$0")/../../.."
KOK=$(pwd); G=stok-v2/guvenlik; DB=atolye_istemci_sinama
hata=0; k() { if [ "$2" = "$3" ]; then echo "  ✓ [$1] $2"; else echo "  ✗ [$1] $2 · beklenen $3"; hata=$((hata + 1)); fi; }
dosya() { psql -X -q -At -v ON_ERROR_STOP=1 -d "$DB" -f "$1" > /dev/null 2> /tmp/istemci-uretim-hata.txt; echo $?; }
dogrula() { psql -X -q -At -F'|' -d "$DB" -f $G/12-sonra-dogrula.sql | awk -F'|' '{ printf "%s", $4 }'; }
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB template atolye_guvenlik"
psql -X -q -At -d "$DB" -c "update public.stk_ayar set fis_aktif = false, min_istemci_surum = null where id = 'tekil'"
k "12-geri-al (canlı hâli)" "$(dosya $G/12-geri-al.sql)" 0
k "12-kur" "$(dosya $G/12-uretim-sil-kur.sql)" 0
k "12-sonra-dogrula" "$(dogrula)" tttttttt
if [ -z "${ESKI_ERP:-}" ]; then
  W=$(mktemp -d); git worktree add -q --detach "$W/w" origin/main
  ln -sfn "$KOK/node_modules" "$W/w/node_modules"
  (cd "$W/w" && node tema-gom.js > /dev/null && node birlestir.js src atolye-erp.jsx > /dev/null)
  (cd test && node derle.js "$W/w/atolye-erp.jsx" "$W/erp-eski.cjs" > /dev/null)
  ln -sfn "$KOK/node_modules" "$W/node_modules"; ESKI_ERP=$W/erp-eski.cjs
  git worktree remove --force "$W/w"
fi
k "eski istemci sürümü" "$(grep -o 'const SURUM = "[0-9.]*"' "$ESKI_ERP" | head -1)" 'const SURUM = "1.744.7"'
export STOK_V2_DB=$DB
ISTEMCI_ESKI=1 F0_ERP="$ESKI_ERP" ISTEMCI_ETIKET=1.744.7 F0_ETIKET=ist1747 node stok-v2/test/uretim-sil/t-istemci-uretim-sil.js 2>&1 \
  | grep -v "^    at \|^  kaliciRet\|^  kod\|^  satirId\|^}\|Supabase yazma hatası"; k "1.744.7" "${PIPESTATUS[0]}" 0
F0_ERP="$KOK/test/erp.cjs" ISTEMCI_ETIKET=1.744.8 F0_ETIKET=ist1748 node stok-v2/test/uretim-sil/t-istemci-uretim-sil.js 2>&1 \
  | grep -v "^    at \|^  kaliciRet\|^  kod\|^  satirId\|^}\|Supabase yazma hatası"; k "1.744.8" "${PIPESTATUS[0]}" 0
node stok-v2/test/uretim-sil/t-eski-istemci-koru.js; k "t-eski-istemci-koru (normal işler etkilenmez)" "$?" 0
echo "── t-istemci-uretim-sil.sh: $([ $hata = 0 ] && echo TEMİZ || echo "$hata kırmızı") ──"
exit $([ $hata = 0 ] && echo 0 || echo 1)
