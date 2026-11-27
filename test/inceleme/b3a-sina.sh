#!/usr/bin/env bash
# B3a SINAMASI (28 Kasım) — YALNIZ yerel PostgreSQL. Taban: TABAN (vars. inc_tam = canlının tablo yetkileri, RLS, politikaları ve
# tetikleyicileriyle hizalı; G-25'siz, B4'süz). Her adım atılabilir kopyada; şablon değişmez.
#   M0 kurulumdan ÖNCE yetki matrisi (yetki-api.js; okan = listede, yalnız görüntüleme — bu betik ekler)
#   M1 kurulum (28-b3a-uygula.sql, tek ifade) → KURULU; matris SONRA
#   M2 geri alma → GERİ ALINDI; matris kurulum öncesiyle BİREBİR aynı
#   M3 iki kez kurulum (tekrar Run) hatasız · M4 bozma: do bloğunun sonunda hata → hiçbir B3a nesnesi yok
#   M5 Editor gibi parça parça (editor-icin.py --bol) → KURULU
set -u
TABAN=${TABAN:-inc_tam}
K=$(cd "$(dirname "$0")/../.." && pwd)
U=$K/stok-v2/guvenlik/28-b3a-uygula.sql; GA=$K/stok-v2/guvenlik/28-b3a-geri-al.sql
S=${CIKTI:-$(mktemp -d)}
gecen=0; kalan=0
k_() { if [ "$2" = "$3" ]; then gecen=$((gecen+1)); echo "  ✓ $1: $2"; else kalan=$((kalan+1)); echo "  ✗ $1: $2 · beklenen $3"; fi; }
db() { psql -X -q -d postgres -c "drop database if exists $1" -c "create database $1 template $TABAN" >/dev/null 2>&1
  psql -X -q -d "$1" -c "update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (veri -> 'kullanicilar') || '[{\"id\": \"k-okan\", \"kullaniciAdi\": \"Okan\", \"rol\": \"Kullanıcı\", \"yetkiler\": {\"stok\": {\"goruntuleme\": true}, \"cari\": {\"goruntuleme\": true}}}]'::jsonb) where id = 'tekil'" >/dev/null; }
genel() { psql -X -At -U postgres -d "$1" -f "$U" 2>/dev/null | awk -F'|' '$1=="GENEL"{print $2}'; }
durum() { psql -X -At -d "$1" -c "select (select count(*) from pg_proc where proname = 'b3a_yazma_koru') || '/' || (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru')"; }
matris() { node "$K/test/inceleme/yetki-api.js" "$1" "$2" > "$2.txt" 2>&1; tail -1 "$2.txt"; }
ozet() { node -e "const r=require('$1'); console.log(r.map(x => x.ad + '|' + x.hesap + '|' + x.sonuc + '|' + (x.kod || '')).join('\n'))"; }

echo "b3a-sina · taban $TABAN · uygula $(sha256sum "$U" | cut -c1-16) · geri-al $(sha256sum "$GA" | cut -c1-16)"
db b3a_1
echo "■ M0 kurulumdan önce"; matris b3a_1 "$S/once.json"
echo "■ M1 kurulum"
psql -X -q -U postgres -v ON_ERROR_STOP=1 -d b3a_1 -f "$U" > "$S/m1.txt" 2>&1; k_ "M1 kurulum çıkışı" "$?" "0"
k_ "M1 nesneler (fonksiyon / tetikleyici)" "$(durum b3a_1)" "1/14"
matris b3a_1 "$S/sonra.json"
echo "■ M2 geri alma"
psql -X -q -U postgres -v ON_ERROR_STOP=1 -d b3a_1 -f "$GA" > "$S/m2.txt" 2>&1; k_ "M2 geri alma çıkışı" "$?" "0"
k_ "M2 nesne kalmadı" "$(durum b3a_1)" "0/0"
matris b3a_1 "$S/geri.json"
k_ "M2 geri almadan sonraki matris kurulum öncesiyle BİREBİR aynı" "$([ "$(ozet "$S/once.json")" = "$(ozet "$S/geri.json")" ] && echo AYNI || echo FARKLI)" "AYNI"
echo "■ M3 iki kez kurulum"
psql -X -q -U postgres -v ON_ERROR_STOP=1 -d b3a_1 -f "$U" > /dev/null 2>&1; psql -X -q -U postgres -v ON_ERROR_STOP=1 -d b3a_1 -f "$U" > "$S/m3.txt" 2>&1
k_ "M3 ikinci Run çıkışı" "$?" "0"; k_ "M3 nesneler" "$(durum b3a_1)" "1/14"
echo "■ M4 bozma (do bloğunun sonunda hata)"
db b3a_2
python3 - "$U" "$S/bozuk.sql" <<'PY'
import sys; s = open(sys.argv[1]).read(); i = s.index("\nend $$;"); open(sys.argv[2], "w").write(s[:i] + "\n  raise exception 'BOZMA: son adımda hata';" + s[i:])
PY
psql -X -q -U postgres -d b3a_2 -f "$S/bozuk.sql" > "$S/m4.txt" 2>&1
k_ "M4 hata verdi" "$(grep -c 'BOZMA: son adımda hata' "$S/m4.txt")" "1"; k_ "M4 hiçbir B3a nesnesi yok" "$(durum b3a_2)" "0/0"
echo "■ M5 Editor gibi parça parça"
db b3a_3; n=0
python3 "$K/stok-v2/editor-icin.py" --bol "$U" > "$S/parca"
while IFS= read -r -d '' p || [ -n "$p" ]; do n=$((n+1)); printf '%s' "$p" | psql -X -q -U postgres -d b3a_3 >/dev/null 2>&1; done < "$S/parca"
k_ "M5 parça sayısı" "$n" "2"; k_ "M5 nesneler" "$(durum b3a_3)" "1/14"
for d in b3a_1 b3a_2 b3a_3; do psql -X -q -d postgres -c "drop database if exists $d" >/dev/null 2>&1; done
echo "── b3a-sina: $gecen geçti · $kalan kaldı (matris ayrıntısı: $S/once.json.txt · sonra.json.txt · geri.json.txt) ──"
[ "$kalan" = 0 ]
