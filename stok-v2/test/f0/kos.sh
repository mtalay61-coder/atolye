#!/usr/bin/env bash
# F0 KOŞUCUSU — veri tutarlılığı başarısızlık testleri + denetim doğrulaması (VERI-TUTARLILIGI-F0.md).
# Yerel PostgreSQL; Supabase'e DOKUNMAZ. Önce stok-v2/test/kos.sh veritabanı kurulmuş olmalı (F0_YENIDEN=1 ile burada kurulur).
# Çıkış 0: her kontrol beklenen.txt'teki durumda (KIRMIZI'lar hâlâ kırmızı, YESIL'ler yeşil). Çıkış 1: en az bir sapma — sapma
# listelenir. Bir aşama (F1…) bir hatayı düzeltince beklenen.txt'te o satır YESIL yapılır; başka satırın değişmesi gerileme demektir.
set -u
cd "$(dirname "$0")"
KOK="$(cd ../../.. && pwd)"
: "${PGHOST:=/var/lib/postgresql/atolye-test}" "${PGPORT:=55432}" "${PGUSER:=postgres}"
export PGHOST PGPORT PGUSER
if [ "${F0_YENIDEN:-0}" = "1" ]; then bash "$KOK/stok-v2/test/kos.sh" > /tmp/f0-kos-kurulum.txt 2>&1 || { echo "kos.sh başarısız — /tmp/f0-kos-kurulum.txt"; exit 2; }; fi
( cd "$KOK/test" && node derle.js > /dev/null ) || { echo "erp.cjs derlenemedi"; exit 2; }
[ "$(psql -X -At -d "${STOK_V2_DB:-atolye_stok_v2_sinama}" -c 'select public.fis_kural_aktif();' 2>/dev/null)" = "t" ] || { echo "kurallar açık değil / veritabanı yok — önce stok-v2/test/kos.sh"; exit 2; }

CIKTI=$(mktemp)
for t in t-karsilanan t-kalem-bag t-fazla t-iptal t-yedek t-surum t-kilit t-denetim; do
  echo "── $t"
  node "$t.js" 2>&1 | tee -a "$CIKTI"
  [ "${PIPESTATUS[0]}" -le 1 ] || echo "  ! $t çöktü" | tee -a "$CIKTI"
done

echo
echo "══ F0 ÖZET (beklenen.txt ile) ══"
SAPMA=0
while read -r kimlik durum; do
  case "$kimlik" in ''|\#*) continue;; esac
  satir=$(grep -F "[$kimlik]" "$CIKTI" | head -1)
  if [ -z "$satir" ]; then gercek="YOK"
  elif printf '%s' "$satir" | grep -q '✓'; then gercek="YESIL"
  else gercek="KIRMIZI"; fi
  if [ "$gercek" = "$durum" ]; then printf '  %-28s %-8s (beklenen)\n' "$kimlik" "$gercek"
  else printf '  %-28s %-8s ≠ beklenen %s\n' "$kimlik" "$gercek" "$durum"; SAPMA=1; fi
done < beklenen.txt
grep -q '! .* çöktü' "$CIKTI" && SAPMA=1
echo "  kurallar sonda açık: $(psql -X -At -d "${STOK_V2_DB:-atolye_stok_v2_sinama}" -c 'select public.fis_kural_aktif();')"
rm -f "$CIKTI"
[ $SAPMA -eq 0 ] && echo "── F0 durumu beklenenle AYNI ──" || echo "── F0 SAPMA VAR ──"
exit $SAPMA
