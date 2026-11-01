#!/usr/bin/env bash
# F2 KOŞUCUSU — t-f2 (bugünkü istemci), t-f2 (1.742.1 istemcisi, F2_ESKI=1 iken), t-bekleyen-red (iki istemci), t-f2-kilit (F2_N).
# beklenen-f2.txt ile karşılaştırır (f0/kos.sh mantığı). Yerel PG; Supabase'e DOKUNMAZ. Önce stok-v2/test/kos.sh veritabanı kurulmuş olmalı.
set -u
cd "$(dirname "$0")"
: "${PGHOST:=/var/lib/postgresql/atolye-test}" "${PGPORT:=55432}" "${PGUSER:=postgres}"
export PGHOST PGPORT PGUSER
bash ../f0/eski-istemci.sh > /dev/null || { echo "eski istemci derlenemedi"; exit 2; }
( cd ../../../test && node derle.js > /dev/null ) || { echo "erp.cjs derlenemedi"; exit 2; }
ESKI="$(cd ../f0/.eski-istemci && pwd)"
CIKTI=$(mktemp)
kos() { echo "── $*"; "$@" 2>/dev/null | tee -a "$CIKTI"; }
kos node t-f2.js
F0_ERP="$ESKI/erp.cjs" F0_KAYNAK="$ESKI/src" node t-f2.js 2>/dev/null | sed 's/\[F2\./[E2./' | tee -a "$CIKTI"
kos node t-bekleyen-red.js
F0_ERP="$ESKI/erp.cjs" node t-bekleyen-red.js 2>/dev/null | sed 's/\[BR\./[EBR./' | tee -a "$CIKTI"
kos node t-f2-kilit.js
echo
echo "══ F2 ÖZET (beklenen-f2.txt ile) ══"
SAPMA=0
while read -r kimlik durum; do
  case "$kimlik" in ''|\#*) continue;; esac
  satir=$(grep -F "[$kimlik]" "$CIKTI" | head -1)
  if [ -z "$satir" ]; then gercek="YOK"; elif printf '%s' "$satir" | grep -q '✓'; then gercek="YESIL"; else gercek="KIRMIZI"; fi
  if [ "$gercek" = "$durum" ]; then printf '  %-34s %-8s (beklenen)\n' "$kimlik" "$gercek"; else printf '  %-34s %-8s ≠ beklenen %s\n' "$kimlik" "$gercek" "$durum"; SAPMA=1; fi
done < "${BEKLENEN:-beklenen-f2.txt}"
rm -f "$CIKTI"
[ $SAPMA -eq 0 ] && echo "── F2 durumu beklenenle AYNI ──" || echo "── F2 SAPMA VAR ──"
exit $SAPMA
