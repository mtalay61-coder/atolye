#!/usr/bin/env bash
# F1.1 KOŞUCUSU — t-f11 (bağ izi, S1 / S2), t-f11-kilit (kilit sırası: A yazmadan önce kilit, B zorlanmış araya girme,
# C doğal zorlama × F11_N), t-f11-eski (1.742.1 istemcisi). Sonuç beklenen-f11.txt ile karşılaştırılır (kos.sh mantığı).
# Yerel PG; Supabase'e DOKUNMAZ. Önce stok-v2/test/kos.sh veritabanı kurulmuş olmalı (F0_YENIDEN=1 ile burada kurulur).
set -u
cd "$(dirname "$0")"
bash eski-istemci.sh > /dev/null || { echo "eski istemci derlenemedi"; exit 2; }
F0_TESTLER="t-f11 t-f11-kilit t-f11-eski" BEKLENEN="${BEKLENEN:-beklenen-f11.txt}" exec bash kos.sh
