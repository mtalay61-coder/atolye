#!/usr/bin/env bash
# Supabase SQL Editor'a verilecek kopyaları üretir (editor-icin.py: yorumsuz, yalnız düz çift-dolar gövde — Editor'un
# ayırıcısı başka türlüsünü gövdenin ortasından kesiyor, 28 Ekim). ÜRETİLEN dosyalar elle düzenlenmez.
#   editor/1-kurulum.sql   — stok-v2.sql
#   editor/2-goc.sql       — stok-v2-goc.sql
#   editor/3-gecis.sql     — geçişin kendisi (tek satır)
#   editor/4-cari-kurulum.sql — cari-v2.sql (v1.727.0)
#   editor/5-cari-goc.sql     — cari-v2-goc.sql
#   editor/6-cari-gecis.sql   — cari geçişi (tek satır)
#   editor/7-siparis-uretim-kurulum.sql — alt-v2.sql (v1.728.0)
#   editor/8-siparis-uretim-gecis.sql    — geçiş (tek satır)
#   stok-v2-gecis-tek-dosya.sql — stok üçlüsü (1–3)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p editor
python3 editor-icin.py stok-v2.sql > editor/1-kurulum.sql
python3 editor-icin.py stok-v2-goc.sql > editor/2-goc.sql
echo "select jsonb_pretty(public.stk_gecis());" > editor/3-gecis.sql
python3 editor-icin.py cari-v2.sql > editor/4-cari-kurulum.sql
python3 editor-icin.py cari-v2-goc.sql > editor/5-cari-goc.sql
echo "select jsonb_pretty(public.car_gecis());" > editor/6-cari-gecis.sql
python3 editor-icin.py alt-v2.sql > editor/7-siparis-uretim-kurulum.sql
echo "select jsonb_pretty(public.alt_gecis());" > editor/8-siparis-uretim-gecis.sql
CIKTI=stok-v2-gecis-tek-dosya.sql
cat editor/1-kurulum.sql editor/2-goc.sql editor/3-gecis.sql > "$CIKTI"
python3 editor-icin.py "$CIKTI" > /dev/null   # denetim: tek dosya da kurala uysun
echo "üretildi: stok-v2/editor/ (3 adım) ve stok-v2/$CIKTI ($(wc -l < "$CIKTI") satır)"
