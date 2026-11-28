#!/usr/bin/env bash
# PAKET V SUNUCU SINAMASI (28 Kasım): aynı adla ikinci varyant açılmaz. Yalnız yerel PostgreSQL (şablon $1, vars. b12_k_crlf).
# PAKET_V=0 → paketsiz (bugünkü davranış: ikiz varyant açılır) · PAKET_V=1 → paketle. İstemci yolu: jeton + authenticated rolü.
set -uo pipefail
cd "$(dirname "$0")/../.."; G=stok-v2/guvenlik; DB=v_sina; gecen=0; acik=0
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB template ${1:-b12_k_crlf}" 2>/dev/null
Q() { psql -X -q -At -v ON_ERROR_STOP=1 -d $DB "$@"; }
T=$(mktemp); sed 's/$/\r/' $G/59-v-uygula.sql > $T
[ "${PAKET_V:-1}" = 1 ] && { Q -f $T > /dev/null 2>&1; Q -f $T > /dev/null 2>&1; }
ali() { Q -c "begin" -c "select set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"email\":\"ali@atolye.local\"}', true), set_config('request.headers', '{\"x-atolye-surum\":\"1.744.48\"}', true)" -c "set local role authenticated" -c "$1" -c "commit" 2>&1 | grep '^ERROR' | sed 's/^ERROR: */RET /' | cut -c1-170 | head -1; }
k() { if [ "$2" = "$3" ]; then gecen=$((gecen + 1)); echo "  ✓ $1"; else acik=$((acik + 1)); echo "  ✗ AÇIK $1 — görülen [$2] · hedef [$3]"; fi; }
say() { Q -c "select count(*) from $1"; }
Q <<'SQL'
set session_replication_role = replica;
insert into public.stk_renk (id, ad, tur, aktif) values ('vr-pasif', 'Kahve', 'renk', false), ('vr-etkin', 'Kahve', 'renk', true), ('vr-mavi', 'Mavi', 'renk', true);
insert into public.stk_olcu (id, ad, tur, aktif) values ('vo-36-beden', '36', 'Beden', true), ('vo-36-boyut', '36', 'Boyut', true);
insert into public.urunler (id, ad, kategori, olcu_tipi, birim) values ('vh-astar', 'ASTAR', 'Hammadde', 'Beden', 'desi'), ('vh-boy', 'BOYLU', 'Hammadde', 'Boyut', 'adet');
insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('vv-astar-kahve', 'vh-astar', 'vr-pasif', 'b-40'), ('vv-boy-36', 'vh-boy', 'vr-mavi', 'vo-36-boyut');
SQL
echo "v-sunucu-sina · Paket V $([ "${PAKET_V:-1}" = 1 ] && echo 'KURULU (CRLF, iki kez)' || echo 'YOK (bugünkü davranış)')"
ac() { ali "select public.stk_varyant_ac('$1'::jsonb)"; }
r=$(ac '{"urunId":"vh-astar","renk":"KAHVE","olcu":"40"}'); echo "    V1 ASTAR'da Kahve PASİF kayıtta; adla (\"KAHVE\") varyant isteği → ${r:-tamam}"
k "V1 pasif renk kaydındaki varyantın adıyla ikinci varyant açılmaz" "$(say "public.stk_varyant where urun_id = 'vh-astar'")" "1"
r=$(ac '{"urunId":"vh-boy","renk":"Mavi","olcu":"36"}'); echo "    V2 BOYLU'da 36 [Boyut] var; adla (\"36\") istek sunucuda 36 [Beden] kaydına çözülüyor → ${r:-tamam}"
k "V2 Beden / Boyut: aynı ölçü adıyla başka gruptan ikinci varyant açılmaz" "$(say "public.stk_varyant where urun_id = 'vh-boy'")" "1"
r=$(ac '{"urunId":"vh-astar","renkId":"vr-pasif","renk":"Kahve","olcuId":"b-40","olcu":"40"}'); echo "    V3 var olan varyant KİMLİKLE istenir → ${r:-tamam}"
k "V3 kimlikle istenen var olan varyant bulunur, yenisi açılmaz, istek reddedilmez" "$(say "public.stk_varyant where urun_id = 'vh-astar'")|$(echo "$r" | grep -c RET)" "1|0"
r=$(ac '{"urunId":"vh-astar","renk":"Mavi","olcu":"40"}'); echo "    V4 üründe hiç olmayan renk (Mavi) → ${r:-tamam}"
k "V4 gerçekten yeni renk için varyant açılır (koruma meşru yeni varyantı engellemez)" "$(say "public.stk_varyant v join public.stk_renk r on r.id = v.renk_id where v.urun_id = 'vh-astar' and r.ad = 'Mavi'")" "1"
r=$(ac '{"urunId":"vh-astar","renk":"Kahve","olcu":"41"}'); echo "    V5 aynı renk adı, üründe olmayan beden (41) → ${r:-tamam}"
k "V5 başka bedende varyant açılır (ad çakışması yok)" "$(say "public.stk_varyant v where v.urun_id = 'vh-astar' and v.olcu_id = 'b-41'")" "1"
Q -c "insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('vv-yonetim', 'vh-astar', 'vr-etkin', 'b-40')" > /dev/null 2>&1
k "V6 jetonsuz (yönetim) bağlantı kural dışı: elle düzeltme yolu açık" "$(say "public.stk_varyant where id = 'vv-yonetim'")" "1"
if [ "${PAKET_V:-1}" = 1 ]; then
  k "durum sorgusu KURULU, var olan ikizi bilgi olarak sayar" "$(Q -f $G/59-v-durum-salt-okur.sql | tail -2 | cut -d'|' -f4,5 | tr '\n' ' ')" "1 ad · 2 varyant|bilgi |KURULU "
  pg_dump -s $DB | grep -v restrict > $T.a; sed 's/$/\r/' $G/59-v-geri-al.sql > $T; Q -f $T > /dev/null; Q -f $T > /dev/null
  psql -X -q -d postgres -c "drop database if exists ${DB}_o" -c "create database ${DB}_o template ${1:-b12_k_crlf}" 2>/dev/null; pg_dump -s ${DB}_o | grep -v restrict > $T.b; pg_dump -s $DB | grep -v restrict > $T.c
  k "geri almadan sonra şema, paketsiz şablonla aynı (fark 0 satır)" "$(diff $T.b $T.c | wc -l)" "0"; psql -X -q -d postgres -c "drop database if exists ${DB}_o"
fi
rm -f $T $T.a $T.b $T.c; echo "SONUÇ: $gecen hedefte · $acik AÇIK"
