#!/usr/bin/env bash
# G-25 YEREL SINAMASI (23 Kasım). Yalnız yerel PostgreSQL; Supabase'e BAĞLANMAZ, canlıya dokunmaz.
# Taban: canlı benzeri hizalanmış kopya (atolye_canli; kos-ekran-canli.sh'ın önkoşulları: kos-guvenlik.sh + Faz 0.4 canli-benzeri) →
# kos-ekran.sh (EKRAN_CANLI_HIZALI=1) → t25/tohum.sql = atolye_t25_taban. Her adım tabanın TAZE kopyasında:
#   1. önkoşul HAZIR                                    5. GERİ: uygula → geri al → önkoşul HAZIR, envanter tabanla AYNI,
#   2. ÖNCE matrisi (bugünkü davranış, açık görünür)        matris ÖNCE ile AYNI (açık yeniden açık)
#   3. uygula → ikinci uygulama reddi (değişiklik yok) → 6. TEKRAR: uygula → geri al → uygula → matris SONRA ile AYNI
#      sonra-doğrula TAMAM → önkoşul UYGULANMIŞ →       7. üretici --denetle (üretilen dosyalar diskteki ile aynı)
#      envanter farkı YALNIZ beklenen nesneler          8. regresyon: uygulanmış kopyada ekran-cari-virman, ekran-stok, ekran-kasa
#   4. SONRA matrisi --beklenen (A1–A8)                    (Yönetici; güncel istemci)
# Gerekli: PGHOST=localhost, KOPRU_PG (node pg), PW_CHROMIUM (8. adım), atolye_canli. Çıkış 0 = hepsi temiz.
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
cd "$(dirname "$0")/../../../.."
KOK=$(pwd); T=stok-v2/test/guvenlik/t25; G=stok-v2/guvenlik
CIK=${T25_CIKTI:-/tmp/t25}; rm -rf "$CIK"; mkdir -p "$CIK"
HATA=0; kirmizi() { echo "   ✗ $*"; HATA=1; }; yesil() { echo "   ✓ $*"; }
q() { psql -X -q -v ON_ERROR_STOP=1 -At -F' | ' -d "$@"; }
# SUPABASE SQL EDITOR GİBİ (24 Kasım): uygulama / geri alma dosyaları psql -f ile DEĞİL, Editor'un ayırıcısıyla bölünüp her parça AYRI
# oturumda çalıştırılır (stok-v2/editor-icin.py --bol; begin / commit Editor'da düşer — atomiklik tek do bloğundan gelmeli).
# Kullanım: ed <db> <dosya>  → parçaların çıktısı; bir parça düşerse çıkış 1 ve hata metni.
ed() {
  python3 stok-v2/editor-icin.py --bol "$2" | node -e '
    const { spawnSync } = require("child_process");
    const ps = require("fs").readFileSync(0, "utf8").split("\0").filter(Boolean); let cikis = 0;
    for (const p of ps) { const r = spawnSync("psql", ["-X", "-q", "-At", "-F", " | ", "-v", "ON_ERROR_STOP=1", "-d", process.argv[1], "-c", p], { encoding: "utf8" });
      process.stdout.write(r.stdout); if (r.status !== 0) { process.stdout.write(r.stderr); cikis = 1; break; } }
    process.exit(cikis);' "$1"
}
kopya() { psql -X -q -d postgres -c "drop database if exists $1" -c "create database $1 template atolye_t25_taban" || exit 2; }
DAL=${HIZALAMA_DALI:-origin/claude/yeni-firma-kurulum-v2}
git show "$DAL:stok-v2/guvenlik/24-faz04-koruma-envanteri-salt-okur.sql" > "$CIK/envanter.sql" || { echo "envanter sorgusu yok ($DAL)"; exit 2; }
envanter() { psql -X -At -F'|' -d "$1" -f "$CIK/envanter.sql" | grep -v '^Z|' | sort; }

echo "══ 0) taban"
psql -X -At -d atolye_canli -c "select 1" > /dev/null 2>&1 || { echo "atolye_canli yok — önce kos-guvenlik.sh + test/ekran/kos-ekran-canli.sh"; exit 2; }
EKRAN_CANLI_HIZALI=1 EKRAN_KAYNAK=atolye_canli EKRAN_DB=atolye_t25_taban EKRAN_TESTLER=yok ISTEMCI_DIZIN="$KOK" bash test/ekran/kos-ekran.sh > "$CIK/taban.txt" 2>&1 \
  || { cat "$CIK/taban.txt"; exit 2; }
q atolye_t25_taban -f $T/tohum.sql > /dev/null || exit 2
envanter atolye_t25_taban > "$CIK/env-taban.txt"
yesil "atolye_t25_taban hazır (canlı hizalı + tohum), envanter $(wc -l < "$CIK/env-taban.txt") satır"

echo "══ 1) önkoşul"
kopya atolye_t25_a
g=$(q atolye_t25_a -f $G/25-onkosul-salt-okur.sql | tee "$CIK/onkosul-once.txt" | awk -F' [|] ' '$1=="99"{print $3}')
[ "$g" = HAZIR ] && yesil "önkoşul GENEL HAZIR" || { kirmizi "önkoşul $g"; cat "$CIK/onkosul-once.txt"; }

echo "══ 2) ÖNCE matrisi"
kopya atolye_t25_once
node $T/matris.js atolye_t25_once ÖNCE > "$CIK/matris-once.txt" 2>&1 || kirmizi "ÖNCE matrisi koşmadı"
grep -E "^A · CVR · Ayse|^A · CVR · Uretimci|^A6 · iptal CVR · Stokcu|^A8 · maaş değiştirme · Uretimci" "$CIK/matris-once.txt" | sed 's/^/   (açık) /'

echo "══ 3a) ATOMİKLİK: uygulama son adımda düşerse hiçbir şey kalmaz"
kopya atolye_t25_k
q atolye_t25_k -c "create schema if not exists guvenlik; create table guvenlik.g25_sonuc (x int)" > /dev/null   # son ifadeyi bilerek düşürür
# Düşüş GERÇEKTEN son adımda olmalı (sözdizimi hatası da "düştü" der ama hiçbir şey çalışmamıştır — 24 Kasım'da böyle yanıltmıştı).
if ed atolye_t25_k $G/25-cari-yetki-uygula.sql > "$CIK/atomik.txt" 2>&1; then kirmizi "bilerek düşürülen uygulama hata vermedi"
elif grep -q 'relation "g25_sonuc" already exists' "$CIK/atomik.txt"; then yesil "uygulama son adımda (g25_sonuc) düştü — önceki tüm adımlar çalışmıştı"
else kirmizi "uygulama son adımdan ÖNCE düştü: $(grep -m1 -o 'ERROR: .*' "$CIK/atomik.txt" | cut -c1-90)"; fi
q atolye_t25_k -c "drop table guvenlik.g25_sonuc" > /dev/null
g=$(q atolye_t25_k -f $G/25-onkosul-salt-okur.sql | awk -F' [|] ' '$1=="99"{print $3}')
envanter atolye_t25_k | diff -q - "$CIK/env-taban.txt" > /dev/null && [ "$g" = HAZIR ] && [ -z "$(q atolye_t25_k -c "select to_regclass('guvenlik.g25_yedek')")" ] \
  && yesil "düşen uygulamadan sonra önkoşul HAZIR, yedek yok, envanter tabanla birebir (yarım nesne yok)" || kirmizi "düşen uygulama iz bıraktı (önkoşul $g)"

echo "══ 3) uygulama"
ed atolye_t25_a $G/25-cari-yetki-uygula.sql > "$CIK/uygula.txt" 2>&1 && grep -q "UYGULANDI" "$CIK/uygula.txt" && yesil "uygulandı" || { kirmizi "uygulama"; tail -5 "$CIK/uygula.txt"; }
envanter atolye_t25_a > "$CIK/env-sonra.txt"
ed atolye_t25_a $G/25-cari-yetki-uygula.sql > "$CIK/uygula-2.txt" 2>&1 && kirmizi "ikinci uygulama hata vermedi" \
  || { grep -q "zaten uygulanmış" "$CIK/uygula-2.txt" && yesil "ikinci uygulama reddedildi"; }
envanter atolye_t25_a | diff -q - "$CIK/env-sonra.txt" > /dev/null && yesil "ikinci uygulama hiçbir şey değiştirmedi (envanter aynı)" || kirmizi "ikinci uygulama envanteri değiştirdi"
g=$(q atolye_t25_a -f $G/25-sonra-dogrula-salt-okur.sql | tee "$CIK/sonra-dogrula.txt" | awk -F' [|] ' '$1=="99"{print $3}')
[ "$g" = TAMAM ] && yesil "sonra doğrula TAMAM" || { kirmizi "sonra doğrula $g"; cat "$CIK/sonra-dogrula.txt"; }
g=$(q atolye_t25_a -f $G/25-onkosul-salt-okur.sql | awk -F' [|] ' '$1=="99"{print $3}'); [ "$g" = UYGULANMIŞ ] && yesil "önkoşul şimdi UYGULANMIŞ" || kirmizi "önkoşul $g"
diff "$CIK/env-taban.txt" "$CIK/env-sonra.txt" | grep '^[<>]' | cut -d'|' -f1,2 | sort -u > "$CIK/env-fark.txt"
BEKLENEN_FARK=$(printf '%s\n' "< F|fis_kes(p jsonb)" "> F|fis_kes(p jsonb)" "> F|g25_tanimlar_ucret_koruma()" "> R|isc_odeme" "> R|mes_bildirim" "> R|ucr_onay" "> T|tanimlar.g25_tanimlar_ucret_koruma" | sort)
[ "$(cat "$CIK/env-fark.txt")" = "$BEKLENEN_FARK" ] && yesil "Faz 0.4 envanterinde YALNIZ beklenen fark: $(tr '\n' ' ' < "$CIK/env-fark.txt")" \
  || { kirmizi "envanter farkı beklenenden farklı"; cat "$CIK/env-fark.txt"; }

echo "══ 4) SONRA matrisi (beklentiler A1–A8)"
T25_AYRINTI=1 node $T/matris.js atolye_t25_a SONRA --beklenen > "$CIK/matris-sonra.txt" 2>&1 && yesil "$(tail -1 "$CIK/matris-sonra.txt")" \
  || { kirmizi "SONRA matrisi: $(tail -1 "$CIK/matris-sonra.txt")"; grep "✗" "$CIK/matris-sonra.txt" | head -20; }

echo "══ 5) GERİ ALMA"
kopya atolye_t25_g
ed atolye_t25_g $G/25-cari-yetki-uygula.sql > /dev/null 2>&1 || kirmizi "geri alma kopyasında uygulama"
ed atolye_t25_g $G/25-cari-yetki-geri-al.sql > "$CIK/geri-al.txt" 2>&1 && grep -q "GERİ ALINDI" "$CIK/geri-al.txt" && yesil "geri alındı · $(grep UYARI "$CIK/geri-al.txt")" \
  || { kirmizi "geri alma"; tail -5 "$CIK/geri-al.txt"; }
g=$(q atolye_t25_g -f $G/25-onkosul-salt-okur.sql | awk -F' [|] ' '$1=="99"{print $3}'); [ "$g" = HAZIR ] && yesil "geri almadan sonra önkoşul HAZIR" || kirmizi "önkoşul $g"
envanter atolye_t25_g | diff -q - "$CIK/env-taban.txt" > /dev/null && yesil "envanter tabanla birebir aynı" || kirmizi "geri almadan sonra envanter farklı"
node $T/matris.js atolye_t25_g ÖNCE > "$CIK/matris-geri.txt" 2>&1
diff <(sed 1d "$CIK/matris-once.txt") <(sed 1d "$CIK/matris-geri.txt") > /dev/null && yesil "geri almadan sonra matris ÖNCE ile birebir (açık YENİDEN AÇIK)" \
  || { kirmizi "geri almadan sonra matris ÖNCE'den farklı"; diff <(sed 1d "$CIK/matris-once.txt") <(sed 1d "$CIK/matris-geri.txt") | head; }
ed atolye_t25_g $G/25-cari-yetki-geri-al.sql > "$CIK/geri-al-2.txt" 2>&1 && kirmizi "ikinci geri alma hata vermedi" \
  || { grep -q "uygulanmamış" "$CIK/geri-al-2.txt" && yesil "ikinci geri alma reddedildi"; }

echo "══ 6) TEKRAR (uygula → geri al → uygula)"
kopya atolye_t25_r
for f in uygula geri-al uygula; do ed atolye_t25_r $G/25-cari-yetki-$f.sql > /dev/null 2>&1 || kirmizi "tekrar: $f"; done
T25_AYRINTI=1 node $T/matris.js atolye_t25_r SONRA --beklenen > "$CIK/matris-tekrar.txt" 2>&1
diff <(sed 1d "$CIK/matris-sonra.txt" | sed 's/  \[.*\]$//') <(sed 1d "$CIK/matris-tekrar.txt" | sed 's/  \[.*\]$//') > /dev/null \
  && yesil "yeniden uygulamanın matrisi ilk uygulamayla birebir" || { kirmizi "yeniden uygulama farklı"; diff "$CIK/matris-sonra.txt" "$CIK/matris-tekrar.txt" | head; }

echo "══ 7) üretici"
python3 $G/25-uret.py --denetle > /dev/null && yesil "üretilen dosyalar diskteki ile aynı" || kirmizi "üretilen dosyalar diskteki ile farklı"

echo "══ 8) regresyon — uygulanmış kopyada ekran testleri (güncel istemci, Yönetici)"
if [ -n "${PW_CHROMIUM:-}" ]; then
  EKRAN_CANLI_HIZALI=1 EKRAN_KAYNAK=atolye_canli EKRAN_DB=atolye_t25_e EKRAN_TESTLER=yok ISTEMCI_DIZIN="$KOK" bash test/ekran/kos-ekran.sh > /dev/null 2>&1 || kirmizi "ekran veritabanı"
  ed atolye_t25_e $G/25-cari-yetki-uygula.sql > /dev/null 2>&1 || kirmizi "ekran kopyasında uygulama"
  for t in ekran-cari-virman ekran-stok ekran-kasa; do
    ISTEMCI_DIZIN="$KOK" EKRAN_DB=atolye_t25_e EKRAN_TABLO="$CIK/$t.json" node test/ekran/$t.js > "$CIK/$t.txt" 2>&1 \
      && yesil "$t: $(grep -E '^── ' "$CIK/$t.txt" | tail -1)" || { kirmizi "$t: $(grep -E '^── ' "$CIK/$t.txt" | tail -1)"; grep "✗" "$CIK/$t.txt" | head -5; }
  done
  grep -h "GÖZLEM Ayşe" "$CIK/ekran-cari-virman.txt" | sed 's/^ */   (G-25 sonrası) /'
else
  kirmizi "PW_CHROMIUM yok — ekran regresyonu koşulmadı"
fi

echo "── test25: $([ $HATA = 0 ] && echo TEMİZ || echo KIRMIZI) (çıktılar $CIK) ──"
exit $HATA
