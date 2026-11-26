#!/usr/bin/env bash
# B1 DENEME PAKETİ SINAMASI (28 Kasım) — YALNIZ yerel PostgreSQL. Taban: TABAN (vars. inc_g25 = canlıyla hizalı taban + deneme projesindeki
# G-25 ekleri: eski paket fcc5429c + 25b + service_role tanimlar okuması). Her adım kendi atılabilir kopyasında; şablon değişmez.
# Ölçülen:
#   P1 kurulum (26-b1-uygula.sql, tek ifade) → önkoşul KURULU; anlık görüntü: kurulum öncesiyle AYNI (yalnız tanim_ad_gecmisi yeni)
#   P2 üretilen gövdeler kaynaktan kurulanla AYNI (5 fonksiyon, prosrc md5)
#   P3 Editor gibi: editor-icin.py --bol parçaları AYRI isteklerle → KURULU
#   P4 bozma: do bloğunun sonuna hata → HİÇBİR B1 nesnesi yok, anlık görüntü aynı
#   P5 geri alma: ad değişikliği sonrası 26-b1-geri-al.sql → KURULU DEĞİL, nesne 0, tanim_ad_gecmisi satırları KALDI, diğer veri aynı
#   P6 geri almanın bozması → hiçbir şey kalkmadı (KURULU kaldı)
#   P7 geri almadan sonra yeniden kurulum → KURULU, eski ad defteri satırları duruyor ve eşleme çalışıyor
#   P8 iki kez kurulum (tekrar Run) → hatasız, KURULU, veri aynı
set -u
TABAN=${TABAN:-inc_g25}
G=$(cd "$(dirname "$0")/.." && pwd)
U=$G/26-b1-uygula.sql; GA=$G/26-b1-geri-al.sql; AG=$G/26-deneme/26-anlik-goruntu-salt-okur.sql; ON=$G/26-b1-onkosul-salt-okur.sql
T=$(mktemp -d)
gecen=0; kalan=0
k_() { if [ "$2" = "$3" ]; then gecen=$((gecen+1)); echo "  ✓ $1: $2"; else kalan=$((kalan+1)); echo "  ✗ $1: $2 · beklenen $3"; fi; }
db() { psql -X -q -d postgres -c "drop database if exists $1" -c "create database $1 template $TABAN" >/dev/null 2>&1; }
q() { psql -X -At -U postgres -d "$1" -c "$2" 2>&1; }
genel() { psql -X -At -U postgres -d "$1" -f "$ON" 2>/dev/null | awk -F'|' '$1==99{print $5}'; }
goruntu() { psql -X -At -U postgres -d "$1" -f "$AG" 2>/dev/null | grep -v '^tanim_ad_gecmisi|'; }
nesne() { q "$1" "select (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ('tanim_renk_ad_degistir','tanim_eski_ad_serbest','tanim_ad_gecmisi_koru','tanim_ad_guncelle_tetik','tanim_ad_guncel')) || '/' || (select count(*) from pg_trigger where tgname in ('tanim_ad_guncelle','tanim_ad_gecmisi_koru'))"; }
ozet5() { q "$1" "select string_agg(proname || '=' || md5(prosrc), ' ' order by proname) from pg_proc where pronamespace='public'::regnamespace and proname like 'tanim\_%'"; }
renk_degis() { psql -X -At -U postgres -d "$1" -c "begin; select set_config('request.jwt.claims', '{\"email\":\"ali@atolye.local\",\"role\":\"authenticated\",\"sub\":\"00000000-0000-0000-0000-000000000001\"}', true); set local role authenticated; select (public.tanim_renk_ad_degistir('{\"renk_id\":\"$2\",\"yeni_ad\":\"$3\",\"eski_ad\":\"$4\"}'::jsonb)) ->> 'zaten'; commit;" 2>&1 | tail -2 | head -1; }

echo "t-26-paket · taban $TABAN · uygula $(sha256sum "$U" | cut -c1-16) · geri-al $(sha256sum "$GA" | cut -c1-16) · önkoşul $(sha256sum "$ON" | cut -c1-16) · anlık $(sha256sum "$AG" | cut -c1-16)"
echo "■ P1 kurulum"
db pk_1; once=$(goruntu pk_1)
k_ "P1 önce GENEL" "$(genel pk_1)" "KURULU DEĞİL"
psql -X -q -U postgres -v ON_ERROR_STOP=1 -d pk_1 -f "$U" >"$T/p1" 2>&1; k_ "P1 kurulum çıkışı" "$?" "0"
k_ "P1 sonra GENEL" "$(genel pk_1)" "KURULU"
k_ "P1 anlık görüntü (tanim_ad_gecmisi dışı) kurulum öncesiyle aynı" "$([ "$once" = "$(goruntu pk_1)" ] && echo AYNI || echo FARKLI)" "AYNI"
k_ "P1 tanim_ad_gecmisi boş" "$(q pk_1 'select count(*) from public.tanim_ad_gecmisi')" "0"
echo "■ P2 üretilen = kaynak"
db pk_2; psql -X -q -U postgres -v ON_ERROR_STOP=1 -d pk_2 -f "$G/26-b1-renk-ad-degistir.sql" >"$T/p2" 2>&1; k_ "P2 kaynaktan kurulum çıkışı" "$?" "0"
k_ "P2 iki kurulumda da 5 fonksiyon" "$(q pk_1 "select count(*) from pg_proc where proname like 'tanim\_%'")/$(q pk_2 "select count(*) from pg_proc where proname like 'tanim\_%'")" "5/5"
k_ "P2 5 fonksiyonun gövdesi (md5) kaynaktan kurulanla aynı" "$([ "$(ozet5 pk_1)" = "$(ozet5 pk_2)" ] && echo AYNI || echo FARKLI)" "AYNI"
k_ "P2 tetikleyici tanımları aynı" "$([ "$(q pk_1 "select string_agg(c.relname||':'||pg_get_triggerdef(g.oid), ' ' order by 1) from pg_trigger g join pg_class c on c.oid=g.tgrelid where tgname like 'tanim%'")" = "$(q pk_2 "select string_agg(c.relname||':'||pg_get_triggerdef(g.oid), ' ' order by 1) from pg_trigger g join pg_class c on c.oid=g.tgrelid where tgname like 'tanim%'")" ] && echo AYNI || echo FARKLI)" "AYNI"
k_ "P2 yetkiler aynı" "$([ "$(q pk_1 "select string_agg(proname||':'||coalesce(proacl::text,''), ' ' order by 1) from pg_proc where proname like 'tanim\_%'")" = "$(q pk_2 "select string_agg(proname||':'||coalesce(proacl::text,''), ' ' order by 1) from pg_proc where proname like 'tanim\_%'")" ] && echo AYNI || echo FARKLI)" "AYNI"
echo "■ P3 Editor gibi parça parça"
db pk_3; python3 "$G/../editor-icin.py" --bol "$U" > "$T/parca"; n=0
while IFS= read -r -d '' p || [ -n "$p" ]; do n=$((n+1)); printf '%s' "$p" | psql -X -q -U postgres -d pk_3 >/dev/null 2>&1; done < "$T/parca"
k_ "P3 parça sayısı (do bloğu + doğrulama sorgusu)" "$n" "2"
k_ "P3 GENEL" "$(genel pk_3)" "KURULU"
echo "■ P4 bozma (do bloğunun sonunda hata)"
db pk_4; once=$(goruntu pk_4)
python3 - "$U" "$T/bozuk.sql" <<'PY'
import sys; s = open(sys.argv[1]).read(); i = s.index("\nend $$;"); open(sys.argv[2], "w").write(s[:i] + "\n  raise exception 'BOZMA: son adımda hata';" + s[i:])
PY
psql -X -q -U postgres -d pk_4 -f "$T/bozuk.sql" >"$T/p4" 2>&1
k_ "P4 hata verdi" "$(grep -c 'BOZMA: son adımda hata' "$T/p4")" "1"
k_ "P4 B1 nesnesi (fonksiyon/tetikleyici)" "$(nesne pk_4)" "0/0"
k_ "P4 tanim_ad_gecmisi tablosu yok" "$(q pk_4 "select to_regclass('public.tanim_ad_gecmisi') is null")" "t"
k_ "P4 anlık görüntü aynı" "$([ "$once" = "$(goruntu pk_4)" ] && echo AYNI || echo FARKLI)" "AYNI"
echo "■ P5 geri alma (ad değişikliğinden sonra)"
k_ "P5 ad değişikliği (r-vizon → Vizon Deri)" "$(renk_degis pk_1 r-vizon 'Vizon Deri' 'Vizon Yılan')" "false"
defter=$(q pk_1 "select string_agg(renk_id||':'||eski_ad||'>'||yeni_ad, ',' order by id) from public.tanim_ad_gecmisi")
once=$(goruntu pk_1)
psql -X -q -U postgres -v ON_ERROR_STOP=1 -d pk_1 -f "$GA" >"$T/p5" 2>&1; k_ "P5 geri alma çıkışı" "$?" "0"
k_ "P5 GENEL" "$(genel pk_1)" "KURULU DEĞİL"
k_ "P5 B1 nesnesi" "$(nesne pk_1)" "0/0"
k_ "P5 ad defteri satırları KALDI" "$(q pk_1 "select string_agg(renk_id||':'||eski_ad||'>'||yeni_ad, ',' order by id) from public.tanim_ad_gecmisi")" "$defter"
k_ "P5 diğer veri geri almadan önceyle aynı" "$([ "$once" = "$(goruntu pk_1)" ] && echo AYNI || echo FARKLI)" "AYNI"
echo "■ P6 geri almanın bozması"
db pk_6; psql -X -q -U postgres -d pk_6 -f "$U" >/dev/null 2>&1
python3 - "$GA" "$T/gbozuk.sql" <<'PY'
import sys; s = open(sys.argv[1]).read(); i = s.index("\nend $$;"); open(sys.argv[2], "w").write(s[:i] + "\n  raise exception 'BOZMA: geri alma sonunda hata';" + s[i:])
PY
psql -X -q -U postgres -d pk_6 -f "$T/gbozuk.sql" >"$T/p6" 2>&1
k_ "P6 hata verdi" "$(grep -c 'BOZMA: geri alma sonunda hata' "$T/p6")" "1"
k_ "P6 hiçbir şey kalkmadı (GENEL)" "$(genel pk_6)" "KURULU"
echo "■ P7 geri almadan sonra yeniden kurulum"
psql -X -q -U postgres -v ON_ERROR_STOP=1 -d pk_1 -f "$U" >"$T/p7" 2>&1; k_ "P7 kurulum çıkışı" "$?" "0"
k_ "P7 GENEL" "$(genel pk_1)" "KURULU"
k_ "P7 defter satırları duruyor" "$(q pk_1 "select string_agg(renk_id||':'||eski_ad||'>'||yeni_ad, ',' order by id) from public.tanim_ad_gecmisi")" "$defter"
k_ "P7 eski ad yeni ada eşleniyor (tanim_ad_guncel)" "$(q pk_1 "select public.tanim_ad_guncel('1054 - Siyah/Vizon Yılan')")" "1054 - Siyah/Vizon Deri"
echo "■ P8 iki kez kurulum"
once=$(goruntu pk_3)
psql -X -q -U postgres -v ON_ERROR_STOP=1 -d pk_3 -f "$U" >"$T/p8" 2>&1; k_ "P8 ikinci Run çıkışı" "$?" "0"
k_ "P8 GENEL" "$(genel pk_3)" "KURULU"
k_ "P8 veri aynı" "$([ "$once" = "$(goruntu pk_3)" ] && echo AYNI || echo FARKLI)" "AYNI"
for d in pk_1 pk_2 pk_3 pk_4 pk_6; do psql -X -q -d postgres -c "drop database if exists $d" >/dev/null 2>&1; done
rm -rf "$T"
echo "── t-26-paket: $gecen geçti · $kalan kaldı ──"
[ "$kalan" = 0 ]
