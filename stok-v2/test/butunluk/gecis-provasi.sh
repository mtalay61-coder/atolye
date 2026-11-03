#!/usr/bin/env bash
# CANLI GEÇİŞ PROVASI (1.742.1 → 1.744.4, stok-v2/GECIS-1.744.4.md). Yalnız yerel PostgreSQL; Supabase'e DOKUNMAZ.
# Şimdiye kadarki koşucular SIFIRDAN kurulumu sınıyordu. Canlıdaki gerçek yol başka: 1.742.1 kurulu, kuralları KAPALI bir
# veritabanına yalnız DEĞİŞEN Editor dosyaları, SQL Editor gibi (her ifade ayrı istek), plandaki sırayla uygulanır.
#  1) PROVA_DB = 20834ea'nın (canlıdaki 1.742.1) KENDİ kos.sh'i (.eski-istemci/ ağacı) + fis_aktif=false (canlı gibi)
#  2) Plandaki sıra: 1, 4, 7, 9, 15, 18, 20 (stok-v2/editor) + rls-kimlik.sql — hepsi Editor gibi
#  3) a) yeni nesneler var; b) public işlev gövdeleri sıfırdan kurulan 1.744.4 veritabanıyla (REF) aynı;
#     c) kritik testler yükseltilmiş veritabanında; d) aynı sıra İKİNCİ kez uygulanır (yarıda kalan geçişin tekrarı zararsız mı)
# Çıkış 0: hepsi temiz.
set -u
cd "$(dirname "$0")/../../.."
KOK="$(pwd)"
case "${PGHOST:-}" in localhost|127.0.0.1|::1) ;; *) echo 'PGHOST=localhost gerekli (finans testleri yalnız TCP kabul eder)'; exit 2;; esac
PROVA_DB=${PROVA_DB:-atolye_gecis_provasi}
REF_DB=${REF_DB:-atolye_gecis_ref}
CIK=${GECIS_CIKTI:-/tmp/gecis-provasi}; mkdir -p "$CIK"
HATA=0
SIRA="stok-v2/editor/1-kurulum.sql stok-v2/editor/4-cari-kurulum.sql stok-v2/editor/7-siparis-uretim-kurulum.sql stok-v2/editor/9-kasa-kurulum.sql stok-v2/editor/15-duzeltme.sql stok-v2/editor/18-fis-defteri.sql stok-v2/editor/20-gece-denetimi.sql rls-kimlik.sql"
editor_ver() {   # $1 dosya, $2 veritabanı — Supabase SQL Editor gibi: her ifade ayrı istek
  python3 "$KOK/stok-v2/editor-icin.py" --bol "$1" | node -e '
    const { execFileSync } = require("child_process");
    const parcalar = require("fs").readFileSync(0, "utf8").split("\0").filter(Boolean);
    parcalar.forEach((p, i) => { try { execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", process.argv[1], "-c", p], { stdio: ["ignore", "ignore", "pipe"] }); }
      catch (e) { console.error(`   parça ${i + 1}/${parcalar.length} düştü:\n${p.slice(0, 300)}\n${e.stderr}`); process.exit(1); } });
    console.log(`   ${process.argv[2]}: ${parcalar.length} parça`);' "$2" "$(basename "$1")"
}
ozetler() { psql -X -At -d "$1" -c "select p.proname||'('||pg_get_function_identity_arguments(p.oid)||') '||md5(regexp_replace(regexp_replace(p.prosrc, '^\\s*--[^\\n]*', '', 'gn'), '\\s+', ' ', 'g')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1"; }
tetikler() { psql -X -At -d "$1" -c "select c.relname||'.'||t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname='public' order by 1"; }

echo "══ 1) canlı benzeri 1.742.1 kurulumu"
bash stok-v2/test/f0/eski-istemci.sh > /dev/null || { echo "eski ağaç kurulamadı"; exit 2; }
(cd stok-v2/test/f0/.eski-istemci && STOK_V2_DB="$PROVA_DB" bash stok-v2/test/kos.sh > "$CIK/1-eski-kurulum.txt" 2>&1) || { echo "   1.742.1 kurulumu düştü"; tail -5 "$CIK/1-eski-kurulum.txt"; exit 2; }
psql -X -q -d "$PROVA_DB" -c "update public.stk_ayar set fis_aktif = false where id = 'tekil';"
# Canlı şemada olup 1.742.1 test şemasında olmayan yapılar (Codex canlı salt-okur kontrolü; test/eski-tablolar.sql c6caeaf):
# üretimin ayrı rezervasyon sütunu ve stok rezervasyon defteri. Geçişten ÖNCE eklenir — canlıda zaten varlar.
psql -X -q -v ON_ERROR_STOP=1 -d "$PROVA_DB" -c "alter table public.uretim add column if not exists rezervasyon_siparis_id text;
  create table if not exists public.stok_rezervasyonlari(id text primary key, siparis_id text, miktar numeric, tuketilen numeric);"
# Canlıda bu tablolar sayaç / silinen arşivi tetikleyicileriyle kurulmuştu: aynı (eski) betikler yeniden çalışır.
for f in degisiklik-sayaci.sql silinen-arsiv.sql; do psql -X -q -v ON_ERROR_STOP=1 -d "$PROVA_DB" -f "stok-v2/test/f0/.eski-istemci/$f" > /dev/null 2>&1 || { echo "   $f (eski) düştü"; exit 2; }; done
echo "   $PROVA_DB: 1.742.1 kuruldu; fiş kuralları KAPALI (canlı gibi): $(psql -X -At -d "$PROVA_DB" -c 'select not public.fis_kural_aktif()')"
echo "   eski sürümde yeni nesne yok: siparis_bag_hedefleri=$(psql -X -At -d "$PROVA_DB" -c "select count(*) from pg_proc where proname='siparis_bag_hedefleri'")"
FIS_ONCE=$(psql -X -At -d "$PROVA_DB" -c "select count(*) from public.stk_fis"); HRK_ONCE=$(psql -X -At -d "$PROVA_DB" -c "select count(*) from public.stk_hareket")

echo "══ 2) geçiş: değişen dosyalar plandaki sırayla, Editor gibi"
for f in $SIRA; do editor_ver "$KOK/$f" "$PROVA_DB" || { echo "   GEÇİŞ DÜŞTÜ: $f"; exit 1; }; done
FIS_SONRA=$(psql -X -At -d "$PROVA_DB" -c "select count(*) from public.stk_fis"); HRK_SONRA=$(psql -X -At -d "$PROVA_DB" -c "select count(*) from public.stk_hareket")
echo "   veri korundu: fiş $FIS_ONCE → $FIS_SONRA, hareket $HRK_ONCE → $HRK_SONRA; fiş kuralları hâlâ KAPALI: $(psql -X -At -d "$PROVA_DB" -c 'select not public.fis_kural_aktif()'); min sürüm: $(psql -X -At -d "$PROVA_DB" -c "select coalesce(min_istemci_surum,'NULL') from public.stk_ayar where id='tekil'")"
[ "$FIS_ONCE" = "$FIS_SONRA" ] && [ "$HRK_ONCE" = "$HRK_SONRA" ] || { echo "   ✗ veri sayısı değişti"; HATA=1; }

echo "══ 3a) yeni nesneler"
for n in siparis_bag_hedefleri siparis_canli_bag_koru fis_satis_teslim_koru fis_iptal_toplu fis_kalem_teslim_koru stk_istemci_koru siparis_durum_hesap; do
  v=$(psql -X -At -d "$PROVA_DB" -c "select count(*) from pg_proc where proname='$n'"); [ "$v" -ge 1 ] && echo "   ✓ $n" || { echo "   ✗ $n yok"; HATA=1; }
done
v=$(psql -X -At -d "$PROVA_DB" -c "select count(*) from pg_views where viewname='siparisler_okuma'"); [ "$v" = 1 ] && echo "   ✓ siparisler_okuma" || { echo "   ✗ siparisler_okuma yok"; HATA=1; }

echo "══ 3b) sıfırdan kurulan 1.744.4 ile işlev gövdeleri ve tetikleyiciler"
STOK_V2_DB="$REF_DB" bash stok-v2/test/kos.sh > "$CIK/3-ref-kurulum.txt" 2>&1 || { echo "   REF kurulumu düştü"; tail -5 "$CIK/3-ref-kurulum.txt"; exit 2; }
# Karşılaştırma: REF'teki her işlev / tetikleyici PROVA'da AYNI gövdeyle olmalı (eksik ya da farklı = HATA). Yalnız PROVA'da
# olanlar 1.742.1 kurulumunun göç / geçiş adımlarından kalır (canlıda da var) — bilgi olarak listelenir.
gov_karsilastir() {   # $1 etiket
  local eksik fazla
  eksik=$(comm -23 <(ozetler "$REF_DB") <(ozetler "$PROVA_DB")); fazla=$(comm -13 <(ozetler "$REF_DB") <(ozetler "$PROVA_DB"))
  local teksik; teksik=$(comm -23 <(tetikler "$REF_DB") <(tetikler "$PROVA_DB"))
  printf '%s\n' "$fazla" > "$CIK/3-yalniz-eskide-$1.txt"
  if [ -z "$eksik" ] && [ -z "$teksik" ]; then
    echo "   ✓ ($1) sıfırdan kurulumun bütün işlevleri aynı gövdeyle, bütün tetikleyicileri var · yalnız eskide kalan $(printf '%s' "$fazla" | grep -c .) işlev (göç/geçiş): $(printf '%s' "$fazla" | sed 's/(.*//' | tr '\n' ' ')"
  else echo "   ✗ ($1) eksik / farklı:"; printf '%s\n%s\n' "$eksik" "$teksik" | grep . | sed 's/^/     /' | head -40; HATA=1; fi
}
gov_karsilastir ilk

echo "══ 3c) kritik testler yükseltilmiş veritabanında"
kos() { local ad="$1"; shift; if STOK_V2_DB="$PROVA_DB" "$@" > "$CIK/3c-$ad.txt" 2>&1; then echo "   ✓ $ad"; else echo "   ✗ $ad — $CIK/3c-$ad.txt"; tail -4 "$CIK/3c-$ad.txt" | sed 's/^/       /'; HATA=1; fi; }
kos t-servis-kapi node stok-v2/test/duzeltme/t-servis-kapi.js
kos t-eski-bag node stok-v2/test/duzeltme/t-eski-bag.js
kos t-bag-kilit env BK_N=30 BK_ZORLA=2 node stok-v2/test/duzeltme/t-bag-kilit.js
kos t-surum-kapi node stok-v2/test/finans/t-surum-kapi.js
kos t-canli-bag node stok-v2/test/f4/t-canli-bag.js
kos t-satis-sinir node stok-v2/test/f3/t-satis-sinir.js
kos t-cek-yaris env FINANS_N=20 node stok-v2/test/finans/t-cek-yaris.js
kos t-seyrek-alt node stok-v2/test/finans/t-seyrek-alt.js
kos t-f2 node stok-v2/test/f2/t-f2.js

echo "══ 3d) aynı sıra ikinci kez (yarıda kalan geçişin tekrarı)"
for f in $SIRA; do editor_ver "$KOK/$f" "$PROVA_DB" || { echo "   İKİNCİ UYGULAMA DÜŞTÜ: $f"; HATA=1; break; }; done
gov_karsilastir ikinci

[ $HATA -eq 0 ] && echo "── GEÇİŞ PROVASI TEMİZ ──" || echo "── GEÇİŞ PROVASINDA SORUN ──"
exit $HATA
