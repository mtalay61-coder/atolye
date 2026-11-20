#!/bin/bash
# DENEME PROJESİ İÇİN KURULUM DOSYASI — CANLIYA DOKUNMADAN (17 Kasım, v1.744.25).
# Gerçek dosya ana projede `kurulum_betigi()` ile üretilir; bu, ana projeye yeni kurulum-betigi.sql'in uygulanmasını (canlı SQL)
# gerektirir. Deneme için dosya YEREL canlı-benzeri kopyadan üretilir: atolye_guvenlik (hazirla.sh) + test/ekran/sema-tamamla.sql
# + 23-platform-yonetim.sql + kurulum-betigi.sql. test24'ten farkı: zorla.sql YOK (test nesneleri ve işaretli veri dosyaya girmez).
# Sınır: kaynak depodaki SQL'lerden kurulan kopya; canlının bugünkü şemasıyla birebir olduğu SINANMADI (bkz. DENEME-PROJESI.md).
# Çıktı: <klasör>/deneme-kurulum.sql, <klasör>/deneme-parmak-izi.txt (kaynağın parmak izi — deneme projesindekiyle karşılaştırılır).
# Üretilen dosya önce yerel BOŞ bir veritabanında Editor gibi (editor-icin.py parçaları, ayrı oturumlar) denenir; 18/18 değilse çıkış 1.
# Kullanım: ./deneme-dosyasi-uret.sh <çıktı klasörü>    (PGHOST/PGPORT; postgres şifresiz; atolye_guvenlik hazır)
set -u
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); G=$A/stok-v2/guvenlik
OUT=$(mkdir -p "${1:?çıktı klasörü gerekli}" && cd "$1" && pwd)
export PGUSER=${PGUSER:-postgres}; KAYNAK=${GUVENLIK_DB:-atolye_guvenlik}
PG="psql -X -q -v ON_ERROR_STOP=1"
IS=$(mktemp -d /tmp/deneme.XXXXXX); trap 'rm -rf "$IS"' EXIT
editor() { python3 - "$1" "$2" "$A/stok-v2/editor-icin.py" <<'PY'
import subprocess, sys
db, dosya, ei = sys.argv[1:4]
b = subprocess.run(["python3", ei, "--bol", dosya], capture_output=True)
if b.returncode: sys.stderr.write(b.stderr.decode()); sys.exit(3)
for p in [x for x in b.stdout.split(b"\0") if x.strip()]:
    r = subprocess.run(["psql", "-X", "-q", "-At", "-F", "|", "-v", "ON_ERROR_STOP=1", "-d", db, "-f", "-"], input=p.decode(), capture_output=True, text=True)
    sys.stdout.write(r.stdout); sys.stderr.write(r.stderr)
    if r.returncode: sys.exit(1)
PY
}
for d in deneme_kaynak deneme_bos; do $PG -d postgres -c "drop database if exists $d" >/dev/null 2>&1; done
$PG -d postgres -c "create database deneme_kaynak template $KAYNAK" >/dev/null || { echo "DUR: $KAYNAK yok (hazirla.sh)"; exit 2; }
$PG -d deneme_kaynak -Atc "create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text)" >/dev/null
PGOPTIONS='-c client_min_messages=warning' $PG -d deneme_kaynak -f $A/test/ekran/sema-tamamla.sql >/dev/null 2>&1 || { echo "DUR: sema-tamamla"; exit 2; }
editor deneme_kaynak $G/23-platform-yonetim.sql >/dev/null 2>&1 || { echo "DUR: 23"; exit 2; }
editor deneme_kaynak $A/kurulum-betigi.sql >/dev/null 2>&1 || { echo "DUR: kurulum-betigi.sql"; exit 2; }
$PG -d deneme_kaynak -Atc "select public.kurulum_betigi()" > $OUT/deneme-kurulum.sql
$PG -d deneme_kaynak -Atc "select kategori || ' | ' || sayi || ' | ' || ozet from public.kurulum_parmak_izi() order by kategori" > $OUT/deneme-parmak-izi.txt
# Yerel prova: Supabase'in boş projesine benzeyen taban (auth / roller) + dosya, Editor gibi
sed -n '1,/ERP tablolarının en küçük/p' $A/stok-v2/test/guvenlik/t19/kur.sql | grep -v 'ERP tablolarının' > $IS/taban.sql
$PG -d postgres -c "create database deneme_bos" >/dev/null
PGOPTIONS='-c client_min_messages=warning' $PG -d deneme_bos -f $IS/taban.sql >/dev/null 2>&1
editor deneme_bos $OUT/deneme-kurulum.sql > $IS/sonuc.txt 2> $IS/hata.txt
TAMAM=$(grep -c '|tamam$' $IS/sonuc.txt); TOPLAM=$(grep -cE '^[0-9]+\|' $IS/sonuc.txt)
IZ_K=$($PG -d deneme_kaynak -Atc "select md5(string_agg(kategori || sayi || ozet, ',' order by kategori collate \"C\")) from public.kurulum_parmak_izi()")
IZ_B=$($PG -d deneme_bos -Atc "select md5(string_agg(kategori || sayi || ozet, ',' order by kategori collate \"C\")) from public.kurulum_parmak_izi()" 2>/dev/null)
PARCA=$(python3 $A/stok-v2/editor-icin.py --bol $OUT/deneme-kurulum.sql | python3 -c 'import sys; print(len([x for x in sys.stdin.buffer.read().split(b"\0") if x.strip()]))')
for d in deneme_kaynak deneme_bos; do $PG -d postgres -c "drop database if exists $d" >/dev/null 2>&1; done
echo "dosya: $OUT/deneme-kurulum.sql ($(wc -l < $OUT/deneme-kurulum.sql) satır, $(grep -c 'adim := ' $OUT/deneme-kurulum.sql) adım, Editor ifadesi $PARCA)"
echo "yerel prova: hata $(grep -c ERROR $IS/hata.txt) · doğrulama $TAMAM/$TOPLAM · parmak izi $([ "$IZ_K" = "$IZ_B" ] && echo birebir || echo FARKLI) ($IZ_K)"
[ "$PARCA" = 2 ] && [ "$TAMAM" = "$TOPLAM" ] && [ "$TOPLAM" -gt 0 ] && [ "$IZ_K" = "$IZ_B" ] && ! grep -q ERROR $IS/hata.txt
