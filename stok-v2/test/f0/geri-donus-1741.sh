#!/usr/bin/env bash
# CANLIDAKİ 1.742.1'E TAM GERİ DÖNÜŞ SINAMASI (F1.1 kural 7; F1-1-BAG-IZI-TASARIM.md § 7). Yerel PG; Supabase'e DOKUNMAZ.
#  1) Kaynak:  GERI_DB = bugünkü dalın SQL'i (stok-v2/test/kos.sh) + bugünkü istemciyle veri (F0 + F1.1 testleri)
#     Kıyas:   REF_DB  = temiz 1.742.1 kurulumu (20834ea'nın KENDİ kos.sh'i, .eski-istemci/ ağacından)
#  2) geri-donus-1.742.1.sql GERI_DB'ye Supabase SQL Editor gibi (editor-icin.py --bol: her ifade AYRI istek)
#  3) Doğrulama:
#     a) dosyadaki iki bölüm 20834ea editor/18 ve editor/20 ile BİREBİR (git show)
#     b) şema nesneleri (işlev, tetikleyici; tablo listesi bilgi) ve her public işlevin gövde özeti (md5) REF_DB ile aynı
#     c) 1.742.1'in kendi uçtan uca fiş testi (20834ea istemcisi) ve gece denetimi sınaması, AYRI bir veritabanında (SINAMA_DB):
#        1.742.1'in kendi kos.sh'i, fiş defteri sınamasından hemen sonra araya: canlıya geçiş taklidi (bugünkü editor/18 + 20) →
#        bugünkü istemciyle veri (t-f11.js) → geri-donus-1.742.1.sql (Editor gibi) → 1.742.1'in kalan testleri. (GERI_DB'de
#        koşulamaz: F0 testleri bilerek satırsız fiş / hayalet üretir, 1.742.1'in gece sınaması temiz veritabanı bekler.)
#     d) eski istemci testi (t-f11-eski.js) geri dönülmüş veritabanında — 1.742.1 davranışının taban çizgisi (puanlanmaz)
#     e) F1 / F1.1 döneminde yazılan veride denetim (yalnız bilgi)
# Çıkış 0: (a) (b) (c) temiz. Veritabanları yeniden kurulur (GERI_DB, REF_DB silinip açılır).
set -u
cd "$(dirname "$0")"
F0="$(pwd)"
KOK="$(cd ../../.. && pwd)"
: "${PGHOST:=/var/lib/postgresql/atolye-test}" "${PGPORT:=55432}" "${PGUSER:=postgres}"
export PGHOST PGPORT PGUSER
GERI_DB="${GERI_DB:-atolye_f11_geri}"
REF_DB="${REF_DB:-atolye_f11_ref1741}"
SINAMA_DB="${SINAMA_DB:-atolye_f11_geri_sinama}"
SQL="$KOK/stok-v2/geri-donus-1.742.1.sql"
CIK="${GERI_CIKTI:-/tmp/f11-geri}"
mkdir -p "$CIK"
HATA=0

bash "$F0/eski-istemci.sh" > /dev/null || { echo "eski ağaç kurulamadı"; exit 2; }
ESKI="$F0/.eski-istemci"
nesneler() { psql -X -At -d "$1" -c "select 'F:'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  union all select 'T:'||c.relname||'.'||t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal order by 1"; }
ozetler() { psql -X -At -d "$1" -c "select p.proname||'('||pg_get_function_identity_arguments(p.oid)||') '||md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1"; }
tablolar() { psql -X -At -d "$1" -c "select table_name from information_schema.tables where table_schema='public' order by 1"; }

echo "══ 1) kurulum"
(cd "$ESKI" && STOK_V2_DB="$REF_DB" bash stok-v2/test/kos.sh > "$CIK/ref-kur.txt" 2>&1) || { echo "   REF (1.742.1) kurulumu düştü — $CIK/ref-kur.txt"; tail -5 "$CIK/ref-kur.txt"; exit 2; }
echo "   REF_DB $REF_DB: 1.742.1 kurulumu tamam ($(grep -c 'TAMAM' "$CIK/ref-kur.txt") TAMAM)"
(cd "$KOK" && STOK_V2_DB="$GERI_DB" bash stok-v2/test/kos.sh > "$CIK/geri-kur.txt" 2>&1) || { echo "   GERI kurulumu düştü — $CIK/geri-kur.txt"; tail -5 "$CIK/geri-kur.txt"; exit 2; }
echo "   GERI_DB $GERI_DB: bugünkü SQL (R1b tetikleyicisi: $(psql -X -At -d "$GERI_DB" -c "select count(*) from pg_trigger where tgname = 'fis_kalem_karsilanan_koru';"), F1: $(psql -X -At -d "$GERI_DB" -c "select count(*) from pg_proc where proname = 'fis_kalem_kilitle';"), iz sütunları: $(psql -X -At -d "$GERI_DB" -c "select count(*) from information_schema.columns where table_name = 'stk_hareket' and column_name like 'gecmis%';"))"
if [ "${GERI_VERI:-1}" = "1" ]; then
  (cd "$F0" && STOK_V2_DB="$GERI_DB" bash kos.sh > "$CIK/geri-f0.txt" 2>&1); echo "   bugünkü istemciyle veri — F0/F1: $(tail -1 "$CIK/geri-f0.txt")"
  (cd "$F0" && STOK_V2_DB="$GERI_DB" F11_DOGAL=3 node t-f11.js > "$CIK/geri-f11.txt" 2>&1); echo "   F1.1 testleri (veri): $(tail -1 "$CIK/geri-f11.txt")"
fi
echo "   fiş: $(psql -X -At -d "$GERI_DB" -c 'select count(*) from public.stk_fis;') · iz kaydı: $(psql -X -At -d "$GERI_DB" -c "select case when to_regclass('public.fis_karsilanan_iz') is null then 'tablo yok' else (select count(*)::text from public.fis_karsilanan_iz) end;")"

echo "══ 2) geri dönüş SQL'i (Editor gibi: her ifade ayrı istek)"
python3 "$KOK/stok-v2/editor-icin.py" --bol "$SQL" | node -e '
  const { execFileSync } = require("child_process");
  const parcalar = require("fs").readFileSync(0, "utf8").split("\0").filter(Boolean);
  parcalar.forEach((p, i) => { try { execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", process.argv[1], "-c", p], { stdio: ["ignore", "ignore", "pipe"] }); }
    catch (e) { console.error(`   parça ${i + 1}/${parcalar.length} düştü:\n${p.slice(0, 200)}\n${e.stderr}`); process.exit(1); } });
  console.log(`   ${parcalar.length} parça çalıştı`);' "$GERI_DB" || { echo "   GERİ DÖNÜŞ SQL'İ DÜŞTÜ"; exit 1; }

echo "══ 3) doğrulama"
echo "   a) dosyadaki bölümler 20834ea ile birebir:"
for ad in 18-fis-defteri 20-gece-denetimi; do
  if diff <(awk "/^-- ---- 20834ea:stok-v2\/editor\/$ad.sql \(BIREBIR\)/{f=1;next} /^-- ---- 20834ea:stok-v2\/editor\/$ad.sql — SON/{f=0} f" "$SQL") \
          <(git -C "$KOK" show "20834ea:stok-v2/editor/$ad.sql") > /dev/null; then echo "      $ad: aynı"; else echo "      $ad: FARKLI"; HATA=1; fi
done
echo "   b) işlev / tetikleyici farkı (REF ↔ GERI):"
F1=$(diff <(nesneler "$REF_DB") <(nesneler "$GERI_DB")); [ -z "$F1" ] && echo "      yok" || { echo "$F1" | sed 's/^/      /'; HATA=1; }
echo "      işlev gövdesi özet farkı (REF ↔ GERI):"
F2=$(diff <(ozetler "$REF_DB") <(ozetler "$GERI_DB")); [ -z "$F2" ] && echo "      yok — bütün işlevler 1.742.1 ile birebir" || { echo "$F2" | sed 's/^/      /'; HATA=1; }
echo "      tablo farkı (bilgi; veri tabloları bilerek kalır):"; diff <(tablolar "$REF_DB") <(tablolar "$GERI_DB") | sed 's/^/      /'
echo "      stk_hareket sütun farkı (bilgi):"; diff <(psql -X -At -d "$REF_DB" -c "select column_name from information_schema.columns where table_name='stk_hareket' order by 1") \
  <(psql -X -At -d "$GERI_DB" -c "select column_name from information_schema.columns where table_name='stk_hareket' order by 1") | sed 's/^/      /'
echo "   c) 1.742.1'in kendi testleri, geçiş taklidi + geri dönüşten sonra ($SINAMA_DB):"
EK="$CIK/geri-ek.sh"
cat > "$EK" <<EKSON
# 1.742.1 kos.sh'ine fiş defteri sınamasından sonra eklenir (aynı kabukta: DB, editor_ver tanımlı)
echo "══ GEÇİŞ TAKLİDİ: bugünkü editor/18 + editor/20"
editor_ver "$KOK/stok-v2/editor/18-fis-defteri.sql"
editor_ver "$KOK/stok-v2/editor/20-gece-denetimi.sql"
echo "   R1b tetikleyicisi: \$(psql -X -At -d "\$DB" -c "select count(*) from pg_trigger where tgname = 'fis_kalem_karsilanan_koru';") · F1: \$(psql -X -At -d "\$DB" -c "select count(*) from pg_proc where proname = 'fis_kalem_kilitle';")"
( cd "$F0" && STOK_V2_DB="\$DB" F11_DOGAL=2 F11_TEKRAR=1 node t-f11.js > "$CIK/sinama-veri.txt" 2>&1 ); echo "   veri (bugünkü istemci, t-f11.js): \$(tail -n 1 "$CIK/sinama-veri.txt")"
echo "══ TAM GERİ DÖNÜŞ: geri-donus-1.742.1.sql"
editor_ver "$SQL"
echo "══ 1.742.1 TESTLERİ"
EKSON
awk -v ek="$EK" '{print} /calistir stok-v2\/test\/sinama-fis-ek.sql/ {print "  . \"" ek "\""}' "$ESKI/stok-v2/test/kos.sh" > "$ESKI/stok-v2/test/kos-geri.sh"
grep -q "geri-ek.sh" "$ESKI/stok-v2/test/kos-geri.sh" || { echo "      ekleme noktası bulunamadı"; exit 2; }
(cd "$ESKI" && STOK_V2_DB="$SINAMA_DB" bash stok-v2/test/kos-geri.sh > "$CIK/sinama-kos.txt" 2>&1); K=$?
echo "      1.742.1 kos.sh (araya geçiş + geri dönüş eklenmiş): çıkış $K · $(grep -c TAMAM "$CIK/sinama-kos.txt") TAMAM · ✗ $(grep -c '✗' "$CIK/sinama-kos.txt")"
grep -E "^══|R1b tetikleyicisi|veri \\(bugünkü|uçtan uca.*temiz|TAMAM: taban temiz" "$CIK/sinama-kos.txt" | sed 's/^/        /' 
[ $K -eq 0 ] && [ "$(grep -c '✗' "$CIK/sinama-kos.txt")" = "0" ] || HATA=1
echo "      işlev özeti farkı (REF ↔ SINAMA):"; F3=$(diff <(ozetler "$REF_DB") <(ozetler "$SINAMA_DB")); [ -z "$F3" ] && echo "      yok" || { echo "$F3" | sed 's/^/      /'; HATA=1; }
echo "   d) eski istemci (1.742.1) + geri dönülmüş SQL — taban çizgisi (puanlanmaz):"
(cd "$F0" && STOK_V2_DB="$GERI_DB" node t-f11-eski.js > "$CIK/geri-eski.txt" 2>&1); grep -E '✓|✗' "$CIK/geri-eski.txt" | sed 's/^/     /'
echo "   e) denetim (bütün veri; bilgi):"
psql -X -At -F ' ' -d "$GERI_DB" -c "$(cat "$F0/denetim.sql")" | awk '$3 > 0 {print "      " $1, $3}'
echo "   kurallar sonda: $(psql -X -At -d "$GERI_DB" -c 'select public.fis_kural_aktif();')"
[ $HATA -eq 0 ] && echo "── GERİ DÖNÜŞ TEMİZ (a, b, c) ──" || echo "── GERİ DÖNÜŞTE SAPMA VAR ──"
exit $HATA
