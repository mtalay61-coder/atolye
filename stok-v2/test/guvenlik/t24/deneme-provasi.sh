#!/bin/bash
# DENEME PROVASI: deneme-kurulum.sql'i yerel boş veritabanına (Editor gibi) kurar, ilk yöneticiyi (deneme) ekler, sonra
# deneme-provasi.js'i koşar. Kullanım: KOPRU_PG=<pg modülü> deneme-provasi.sh [deneme-kurulum.sql]  (yoksa üretilir)
set -u
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd)
export PGUSER=${PGUSER:-postgres} PGHOST=${PGHOST:-localhost}
PG="psql -X -q -v ON_ERROR_STOP=1"; IS=$(mktemp -d /tmp/prova.XXXXXX); trap 'rm -rf "$IS"' EXIT
DOSYA=${1:-}
if [ -z "$DOSYA" ]; then "$T/deneme-dosyasi-uret.sh" "$IS" || exit 1; DOSYA=$IS/deneme-kurulum.sql; fi
$PG -d postgres -c "drop database if exists deneme_prova" >/dev/null 2>&1; $PG -d postgres -c "create database deneme_prova" >/dev/null
sed -n '1,/ERP tablolarının en küçük/p' $A/stok-v2/test/guvenlik/t19/kur.sql | grep -v 'ERP tablolarının' > $IS/taban.sql
PGOPTIONS='-c client_min_messages=warning' $PG -d deneme_prova -f $IS/taban.sql >/dev/null 2>&1
python3 $A/stok-v2/editor-icin.py --bol "$DOSYA" | python3 -c '
import sys, subprocess
for p in [x for x in sys.stdin.buffer.read().split(b"\0") if x.strip()]:
    r = subprocess.run(["psql", "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", "deneme_prova", "-f", "-"], input=p, capture_output=True)
    if r.returncode: sys.stderr.write(r.stderr.decode()); sys.exit(1)
    sys.stdout.write("kurulum: %d/%d tamam\n" % (r.stdout.decode().count("|tamam"), len([l for l in r.stdout.decode().splitlines() if l[:1].isdigit()]))) if b"select" in p[-400:].lower() else None
' || { echo "DUR: kurulum"; exit 1; }
# yeni-firma-kurulum.md §3 (ilk yönetici), deneme değerleriyle; auth kullanıcısı Supabase'de panelden açılır, burada köprü için satır
$PG -d deneme_prova -c "insert into public.tanimlar (id, veri) values ('tekil', jsonb_build_object('girisAktifMi', true, 'kullanicilar', jsonb_build_array(jsonb_build_object('id', 'kullanici-ilk', 'ad', 'Deneme Yönetici', 'kullaniciAdi', 'deneme', 'rol', 'Yönetici', 'yetkiler', '{}'::jsonb, 'eposta', 'deneme@atolye.local', 'bulutHesabi', true)))) on conflict (id) do nothing" >/dev/null
$PG -d deneme_prova -c "insert into auth.users (email) values ('deneme@atolye.local')" >/dev/null 2>&1 || true
: "${KOPRU_PG:?KOPRU_PG gerekli (node pg modülünün yolu)}"; cd $A/test && node $T/deneme-provasi.js; S=$?
[ -n "${PROVA_TUT:-}" ] || $PG -d postgres -c "drop database if exists deneme_prova" >/dev/null 2>&1; exit $S
