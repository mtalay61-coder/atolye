#!/usr/bin/env bash
# Her yamadan sonra çalıştırılır. Her denetim bu projede GERÇEKTEN yaşanmış bir hata sınıfını
# hedefliyor — genel bir linter değil, canı yakmış şeylerin listesi.
DOSYA="${1:-atolye-erp.jsx}"
KOK="$(cd "$(dirname "$0")" && pwd)"
echo "── kontrol: $DOSYA ──"
HATA=0
# Denetleyiciler BİRLEŞİK dosya üzerinde çalışır (kural tek yerde kalsın diye). Bulgudaki satır
# numarası birleşik dosyanın numarasıdır; konum.js onu "60-stok.jsx:993" biçimine çevirir.
set -o pipefail
denetle() { node "$KOK/$1" "$DOSYA" | node "$KOK/konum.js"; }
denetle yapidenetim.js || HATA=1   # 1-6
denetle gidisdonus.js || HATA=1   # 7
denetle stokdenetim.js || HATA=1   # 8
denetle katmandenetim.js || HATA=1  # 9
denetle surumdenetim.js || HATA=1   # 10
denetle matrisdenetim.js || HATA=1  # 11
denetle fisdenetim.js || HATA=1  # 12
denetle sonucdenetim.js || HATA=1  # 13
denetle altdenetim.js || HATA=1  # 14
denetle asortidenetim.js || HATA=1  # 15
denetle bedendenetim.js || HATA=1   # 17
denetle kapidenetim.js || HATA=1  # 16
denetle bayatdenetim.js || HATA=1  # 18
if [ $HATA -eq 0 ]; then echo "── tüm denetimler temiz ──"; else echo "── BULGU VAR ──"; fi
exit $HATA
