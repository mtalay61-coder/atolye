#!/usr/bin/env bash
# G-25 İŞLENMİŞ KAYNAKLARLA SUNUCU + GÜVENLİK TAKIMLARI (24 Kasım). Yalnız yerel PostgreSQL; Supabase'e BAĞLANMAZ.
# Soru: "Testlerin veritabanını yeniden kurarken G-25 kaldırılıyor mu?" Canlıda G-25 uygulandıktan sonra kaynak dosyalar (cari-v2,
# 4 / 15 / 18 Editor adımları, fis-defteri.sql) yeniden çalıştırılabilir; o dosyalar G-25'siz kalırsa fis_kes / fis_iptal / car_yaz
# sessizce eski hâline döner (23 Kasım'da ölçüldü: editor/18 yeniden çalışınca önkoşul KARIŞIK). Bu yüzden:
#   1. HEAD'in ayrı bir çalışma ağacı açılır; 25-uret.py --kaynaga-isle ile G-25 KAYNAK dosyalara işlenir (canlıya uygulamadan önce
#      depoya da girmesi gereken hâl). Ağacın kendi geri-donus-*.sql dosyaları bilerek İŞLENMEZ (aşağıdaki not).
#   2. t25/nokta/psql PATH'in başına konur: her psql çağrısından sonra durum değiştiyse günlüğe yazılır (Y / G / E / F / -).
#   3. stok-v2/test/kos.sh (STOK_V2_DB=atolye_g25_kos) ve kos-guvenlik.sh (GUVENLIK_DB=atolye_g25_guvenlik; regresyon betikleri
#      şablon olarak artık GUVENLIK_DB'yi kopyalar — önce sabit atolye_guvenlik'ti, G-25'siz veritabanını sınarlardı) koşar.
#   4. Günlük çözümlenir: G-25'in KAYBI = aynı veritabanında, arada "drop database" olmadan Y/G → E/F/- geçişi. Sonda her
#      veritabanının son durumu yazılır. Takımların kendi ✗ / atlanan satırları ayrıca dökülür (gizlenmez).
# Çıkış 0: iki takım temiz VE kayıp yok VE son durumlar tam G-25.
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
# f0/kos.sh PGPORT verilmezse 55432'ye bağlanır ("kurallar açık değil / veritabanı yok" der) — 24 Kasım ilk koşuda böyle düştü.
export PGPORT=${PGPORT:-5432} PGUSER=${PGUSER:-postgres}
cd "$(dirname "$0")/../../../.."
KOK=$(pwd); T=$KOK/stok-v2/test/guvenlik/t25
CIK=${T25_TAKIM_CIKTI:-/tmp/t25-takim}; rm -rf "$CIK"; mkdir -p "$CIK"
AGAC=${T25_AGAC:-$CIK/agac}
HATA=0; kirmizi() { echo "   ✗ $*"; HATA=1; }; yesil() { echo "   ✓ $*"; }

echo "══ 1) G-25 işlenmiş çalışma ağacı"
git worktree remove --force "$AGAC" > /dev/null 2>&1; rm -rf "$AGAC"; git worktree prune
git worktree add -q --detach "$AGAC" HEAD || exit 2
python3 stok-v2/guvenlik/25-uret.py --kaynaga-isle "$AGAC" | sed 's/^/   /' || exit 2
for f in stok-v2/editor/4-cari-kurulum.sql stok-v2/editor/15-duzeltme.sql stok-v2/editor/18-fis-defteri.sql; do
  python3 stok-v2/editor-icin.py "$AGAC/$f" > /dev/null || kirmizi "işlenmiş $f Editor kuralına uymuyor"; done
ln -s "$KOK/node_modules" "$AGAC/node_modules"
(cd "$AGAC" && node birlestir.js src atolye-erp.jsx > /dev/null && cd test && node derle.js > /dev/null) || { echo "erp.cjs derlenemedi"; exit 2; }
yesil "ağaç: $AGAC ($(git -C "$AGAC" diff --stat | tail -1))"

# Paketin beklenen gövde özetleri (uygula dosyasının yedek satırlarından: ad, ESKİ, YENİ)
oz() { grep -o "select '$1', pg_get_functiondef.*" stok-v2/guvenlik/25-cari-yetki-uygula.sql | grep -o "'[0-9a-f]\{32\}'" | tr -d "'" | sed -n "$2p"; }
export G25_E_CAR=$(oz car_yaz 1) G25_Y_CAR=$(oz car_yaz 2) G25_E_KES=$(oz fis_kes 1) G25_Y_KES=$(oz fis_kes 2) G25_E_IPT=$(oz fis_iptal 1) G25_Y_IPT=$(oz fis_iptal 2)
[ ${#G25_Y_IPT} = 32 ] || { echo "özetler okunamadı"; exit 2; }
export G25_GERCEK_PSQL=$(command -v psql) PATH="$T/nokta:$PATH" G25_NOKTA_LOG="$CIK/nokta.log"
[ "$(command -v psql)" = "$T/nokta/psql" ] || { echo "denetim noktası sarmalayıcısı PATH'te değil"; exit 2; }
: > "$G25_NOKTA_LOG"

echo "══ 2) sunucu takımı: stok-v2/test/kos.sh (atolye_g25_kos)"
(cd "$AGAC" && STOK_V2_DB=atolye_g25_kos bash stok-v2/test/kos.sh) > "$CIK/kos.txt" 2>&1; r=$?
[ $r = 0 ] && yesil "kos.sh çıkış 0 ($(grep -c '^──' "$CIK/kos.txt") adım)" || { kirmizi "kos.sh çıkış $r"; tail -15 "$CIK/kos.txt" | sed 's/^/       /'; }
grep -n "atlandı\|ATLANDI\|SKIP\|✗\|HATA\|FAIL" "$CIK/kos.txt" | sed 's/^/   ! /' | head -30
echo "── KOS SONU" >> "$G25_NOKTA_LOG"

echo "══ 3) güvenlik takımı: kos-guvenlik.sh (atolye_g25_guvenlik)"
(cd "$AGAC" && GUVENLIK_DB=atolye_g25_guvenlik GUVENLIK_CIKTI="$CIK/guvenlik" bash stok-v2/test/guvenlik/kos-guvenlik.sh) > "$CIK/guvenlik.txt" 2>&1; r=$?
cp /tmp/guvenlik-kos.txt "$CIK/guvenlik-hazirla-kos.txt" 2>/dev/null
[ $r = 0 ] && yesil "kos-guvenlik.sh çıkış 0" || kirmizi "kos-guvenlik.sh çıkış $r"
grep -n "✗\|•\|atlandı\|ATLANDI\|SORUN" "$CIK/guvenlik.txt" | sed 's/^/   ! /' | head -60
echo "   ($(grep -c '✓' "$CIK/guvenlik.txt") ✓ satırı, $(grep -c '✗' "$CIK/guvenlik.txt") ✗ satırı)"

echo "══ 4) denetim noktası çözümlemesi ($(grep -c ' → ' "$G25_NOKTA_LOG") geçiş, $(grep -c 'KURULUM' "$G25_NOKTA_LOG") yeniden kurulum)"
node - "$G25_NOKTA_LOG" > "$CIK/cozum.txt" <<'JS'
const satirlar = require("fs").readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean);
const son = {}; const kayip = []; let n = 0;
const harf = (d) => Object.fromEntries(d.split(" ").filter((x) => x.includes("=")).map((x) => x.split("=")));
for (const s of satirlar) {
  const k = s.match(/KURULUM: drop database if exists (\S+)/); if (k) { delete son[k[1]]; continue; }
  const m = s.match(/^(\S+) (\S+) \| (.*) → (.*) \| (.*)$/); if (!m) continue; n++;
  const [, saat, db, once, sonra, etiket] = m;
  if (once !== "ilk") { const a = harf(once), b = harf(sonra);
    for (const f of ["car_yaz", "fis_iptal", "fis_kes"]) if (/[YG]/.test(a[f]) && !/[YG]/.test(b[f])) kayip.push(`${saat} ${db}: ${f} ${a[f]} → ${b[f]} · ${etiket}`);
    // yeni = fonksiyon + tablo + tetikleyici + mühür (M1/M0): herhangi biri azalırsa koruma kalkmıştır (25 Kasım: mühür tetikleyicileri)
    const pa = a.yeni.split("+").map((x) => parseInt(x.replace("M", ""), 10) || 0), pb = b.yeni.split("+").map((x) => parseInt(x.replace("M", ""), 10) || 0);
    if (pa.some((x, i) => (pb[i] || 0) < x)) kayip.push(`${saat} ${db}: yeni nesne ${a.yeni} → ${b.yeni} · ${etiket}`); }
  son[db] = sonra;
}
console.log(`KAYIP ${kayip.length}`); kayip.forEach((x) => console.log("  " + x));
for (const [db, d] of Object.entries(son)) console.log(`SON ${db} ${d}`);
JS
k=$(sed -n 's/^KAYIP //p' "$CIK/cozum.txt")
[ "$k" = 0 ] && yesil "hiçbir adımda G-25 kaldırılmadı (arada yeniden kurulum olmadan Y/G → E/F/- geçişi yok)" || { kirmizi "G-25 $k kez KALDIRILDI:"; sed -n '2,40p' "$CIK/cozum.txt"; }
while read -r _ db d; do
  case "$d" in "car_yaz=Y fis_iptal=Y fis_kes=Y yeni=22+3+5+M1") yesil "son durum $db: $d";;
    *) echo "   • son durum $db: $d (tam G-25 değil — aşağıda açıklanır)";; esac
done < <(grep '^SON ' "$CIK/cozum.txt")
echo "   günlük: $G25_NOKTA_LOG"
git worktree remove --force "$AGAC" > /dev/null 2>&1 || true
[ $HATA -eq 0 ] && echo "── takımlar (G-25 işlenmiş): TEMİZ ──" || echo "── takımlar (G-25 işlenmiş): KIRMIZI (çıktılar $CIK) ──"
exit $HATA
