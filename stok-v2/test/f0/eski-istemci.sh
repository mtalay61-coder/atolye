#!/usr/bin/env bash
# ESKİ SÜRÜM AĞACI (F1.1, kural 5 ve 7): canlıdaki 1.742.1'in kodu (20834ea, yayınlanmış HTML ve görseller hariç bütün ağaç) →
# .eski-istemci/ — istemci derlemesi (erp.cjs; t-f11-eski.js) ve 1.742.1'in KENDİ kurulum / uçtan uca testleri (geri-donus-1741.sh).
# Bugünkü test/derle.js ile derlenir (yalnız dışa aktarma listesi; eski kaynakta olmayan adlar atlanır). Depo içinde
# (node_modules'u bulsun diye) ama .gitignore'da. Supabase'e dokunmaz.
set -eu
cd "$(dirname "$0")"
KOK="$(cd ../../.. && pwd)"
REV="${ESKI_REV:-20834ea}"
D="$(pwd)/.eski-istemci"
mkdir -p "$D"
[ -f "$D/test/erp.cjs" ] && [ -f "$D/stok-v2/test/kos.sh" ] && [ "$(cat "$D/rev" 2>/dev/null)" = "$REV" ] && { echo "$D/erp.cjs ($REV) hazır"; exit 0; }
find "$D" -mindepth 1 -delete
git -C "$KOK" archive "$REV" -- . ':(exclude)atolye-erp-v*.html' ':(exclude)*.png' | tar -x -C "$D"
node "$KOK/birlestir.js" "$D/src" "$D/atolye-erp.jsx" > /dev/null
node "$KOK/test/derle.js" "$D/atolye-erp.jsx" "$D/test/erp.cjs" > /dev/null
cp "$D/test/erp.cjs" "$D/erp.cjs"
echo "$REV" > "$D/rev"
echo "$D/erp.cjs ($REV, SURUM $(grep -o 'const SURUM = "[^"]*"' "$D/src/015-sabitler.jsx" | cut -d'"' -f2))"
