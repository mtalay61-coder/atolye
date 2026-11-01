#!/usr/bin/env bash
# F1 GERİ DÖNÜŞ SINAMASI (yerel PG; Supabase'e DOKUNMAZ):
#  1) veritabanı F1 ile kurulur (stok-v2/test/kos.sh) → F0/F1 durumu beklenen.txt
#  2) stok-v2/geri-donus-F1.sql SQL Editor gibi (parça parça) uygulanır → durum beklenen-geri-donus.txt (= 1.742.3 davranışı)
#  3) F1 yeniden kurulur (editor/18 + editor/20, Editor gibi) → durum yine beklenen.txt
# Çıkış 0: üç adımın üçü de beklenenle aynı.
set -u
cd "$(dirname "$0")"
KOK="$(cd ../../.. && pwd)"
: "${PGHOST:=/var/lib/postgresql/atolye-test}" "${PGPORT:=55432}" "${PGUSER:=postgres}"
export PGHOST PGPORT PGUSER
DB="${STOK_V2_DB:-atolye_stok_v2_sinama}"
editor_ver() {
  echo "── $1 (Editor gibi, parça parça)"
  python3 "$KOK/stok-v2/editor-icin.py" --bol "$1" | node -e '
    const { execFileSync } = require("child_process");
    const parcalar = require("fs").readFileSync(0, "utf8").split("\0").filter(Boolean);
    parcalar.forEach((p, i) => {
      try { execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", process.argv[1], "-c", p], { stdio: ["ignore", "ignore", "pipe"] }); }
      catch (e) { console.error(`parça ${i + 1}/${parcalar.length} düştü:\n${p.slice(0, 300)}\n${e.stderr}`); process.exit(1); }
    });
    console.log(`   ${parcalar.length} parça`);
  ' "$DB" || exit 2
}
SONUC=0
echo "══ 1) F1 kurulu"
F0_YENIDEN=1 bash kos.sh > /tmp/f0-gd-1.txt 2>&1; r=$?; tail -1 /tmp/f0-gd-1.txt; [ $r -eq 0 ] || { grep "≠" /tmp/f0-gd-1.txt; SONUC=1; }
echo "══ 2) geri dönüş"
editor_ver "$KOK/stok-v2/geri-donus-F1.sql"
echo "   fis_kalem_kilitle var mı: $(psql -X -At -d "$DB" -c "select count(*) from pg_proc where proname = 'fis_kalem_kilitle';")"
BEKLENEN=beklenen-geri-donus.txt bash kos.sh > /tmp/f0-gd-2.txt 2>&1; r=$?; tail -1 /tmp/f0-gd-2.txt; [ $r -eq 0 ] || { grep "≠" /tmp/f0-gd-2.txt; SONUC=1; }
echo "══ 3) F1 yeniden"
editor_ver "$KOK/stok-v2/editor/18-fis-defteri.sql"
editor_ver "$KOK/stok-v2/editor/20-gece-denetimi.sql"
bash kos.sh > /tmp/f0-gd-3.txt 2>&1; r=$?; tail -1 /tmp/f0-gd-3.txt; [ $r -eq 0 ] || { grep "≠" /tmp/f0-gd-3.txt; SONUC=1; }
[ $SONUC -eq 0 ] && echo "── GERİ DÖNÜŞ SINAMASI TEMİZ ──" || echo "── GERİ DÖNÜŞ SINAMASINDA SAPMA ──"
exit $SONUC
