#!/usr/bin/env bash
# Yalnız yerel, yeniden oluşturulabilen test DB. Supabase'e bağlanmaz.
set -euo pipefail
cd "$(dirname "$0")/../.."
case "${PGHOST:-}" in localhost|127.0.0.1|::1|/*) ;; *) echo 'PGHOST yerel test sunucusu olmalı'; exit 2;; esac
if [ "${STOK_V2_DB:-atolye_stok_v2_sinama}" != atolye_stok_v2_sinama ]; then echo 'Yalnız atolye_stok_v2_sinama test veritabanı'; exit 2; fi
node test/derle.js
bash stok-v2/test/kos.sh
bash stok-v2/test/f0/kos.sh
for t in stok-v2/test/finans/t-*.js; do node "$t"; done
node stok-v2/test/f4/t-atomik-bag.js
node stok-v2/test/f4/t-canli-bag.js
node stok-v2/test/f4/t-rezervasyon-yaris.js
node stok-v2/test/f4/t-yaris.js
node stok-v2/test/f3/t-satis-sinir.js
node stok-v2/test/f3/t-satis-yaris.js
node stok-v2/test/f8/t-renk-kilit.js
node stok-v2/test/f8/t-renk-dogal.js
# 1.744.3 incelemesi düzeltmeleri: bağ koruması ∥ başlık kilit sırası, sürüm kapısı / sunucu fonksiyonu, eski bağ
node stok-v2/test/duzeltme/t-bag-kilit.js
node stok-v2/test/duzeltme/t-servis-kapi.js
node stok-v2/test/duzeltme/t-eski-bag.js
F2_N=100 F2_ZORLA=3 bash stok-v2/test/f2/kos-f2.sh
echo 'BÜTÜNLÜK ADAYI: bütün süreçler 0'
