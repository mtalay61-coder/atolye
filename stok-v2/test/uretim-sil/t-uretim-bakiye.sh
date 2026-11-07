#!/usr/bin/env bash
# 12 PAKETİ TEST ORTAMINA → STOK / CARİ BAKİYE, EŞZAMANLI TESLİM, TEKRAR (7 Kasım). Yalnız yerel; Supabase'e bağlanmaz.
# Veritabanı: atolye_guvenlik'in (canlı benzeri, sıkılaştırılmış) kopyası. Adımlar:
#   1. 12-geri-al → canlının bugünkü hâli (uretim_sil yok)       2. 12-uretim-sil-kur.sql (canlıya verilecek dosyanın aynısı)
#   3. 12-sonra-dogrula 6/6                                      4. t-uretim-bakiye.js — kurallar KAPALI (canlı gibi), sonra AÇIK
#   5. GERİ DÖNÜŞ: 12-silme-durdur → 12-geri-al → veri aynı mı, doğrulama "fffttt" → 12 yeniden kur → 6/6 → 12-silme-durdur-kaldir
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
cd "$(dirname "$0")/../../.."
G=stok-v2/guvenlik; DB=atolye_uretim_bakiye
hata=0; k() { if [ "$2" = "$3" ]; then echo "  ✓ [$1] $2"; else echo "  ✗ [$1] $2 · beklenen $3"; hata=$((hata + 1)); fi; }
q() { psql -X -q -At -d "$DB" "$@"; }
dosya() { psql -X -q -At -v ON_ERROR_STOP=1 -d "$DB" -f "$1" > /dev/null 2> /tmp/uretim-bakiye-hata.txt; echo $?; }
dogrula() { psql -X -q -At -F'|' -d "$DB" -f $G/12-sonra-dogrula.sql | awk -F'|' '{ printf "%s", $4 }'; }
sayim() { q -c "select (select count(*) from public.stk_hareket) || '/' || (select count(*) from public.car_hareket) || '/' || (select count(*) from public.stk_fis) || '/' || (select count(*) from public.uretim) || '/' || (select count(*) filter (where iptal) from public.stk_fis)"; }

psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB template atolye_guvenlik"
q -c "update public.stk_ayar set fis_aktif = false, min_istemci_surum = null where id = 'tekil'"
echo "t-uretim-bakiye · $DB (atolye_guvenlik kopyası)"
k "1.geri-al (canlı hâli)" "$(dosya $G/12-geri-al.sql)" 0
k "1.islem-yok" "$(q -c "select count(*) from pg_proc where proname = 'uretim_sil'")" 0
k "2.12-kur" "$(dosya $G/12-uretim-sil-kur.sql)" 0
k "3.12-sonra-dogrula" "$(dogrula)" tttttt
export STOK_V2_DB=$DB
echo "4a. kurallar KAPALI (canlı gibi)"
F0_ETIKET=bakiye-kapali node stok-v2/test/uretim-sil/t-uretim-bakiye.js; k "4a.t-uretim-bakiye (kurallar kapalı)" "$?" 0
echo "4b. kurallar AÇIK (fis_aktif)"
q -c "update public.stk_ayar set fis_aktif = true where id = 'tekil'"
F0_ETIKET=bakiye-acik node stok-v2/test/uretim-sil/t-uretim-bakiye.js; k "4b.t-uretim-bakiye (kurallar açık)" "$?" 0
q -c "update public.stk_ayar set fis_aktif = false where id = 'tekil'"
echo "5. GERİ DÖNÜŞ"
once=$(sayim)
k "5.durdur" "$(dosya $G/12-silme-durdur.sql)" 0
U=$(q -c "select id from public.uretim order by id limit 1")
k "5.durdurulmus-silme (KR011, oturumlu)" "$(psql -X -q -At -d $DB -c "\\set VERBOSITY verbose" -c "begin; select set_config('request.jwt.claims','{\"email\":\"ali@atolye.local\",\"role\":\"authenticated\"}',true); set local role authenticated; select public.uretim_sil('{\"id\":\"$U\"}'::jsonb); commit;" 2>&1 | grep -o 'KR011' | head -1)" KR011
k "5.geri-al" "$(dosya $G/12-geri-al.sql)" 0
k "5.geri-al-sonrasi-dogrula (işlem/koruma yok, iz+kilitler aynı)" "$(dogrula)" fffttt
k "5.veri-ayni (hareket/cari/fiş/üretim/iptal fiş)" "$(sayim)" "$once"
k "5.12-yeniden-kur" "$(dosya $G/12-uretim-sil-kur.sql)" 0
k "5.yeniden-dogrula" "$(dogrula)" tttttt
k "5.durdurma-kaldir" "$(dosya $G/12-silme-durdur-kaldir.sql)" 0
k "5.durdurma-yok" "$(q -c "select count(*) from pg_trigger where tgname = 'a_uretim_silme_durdur'")" 0
k "5.veri-yine-ayni" "$(sayim)" "$once"
echo "── t-uretim-bakiye.sh: $([ $hata = 0 ] && echo TEMİZ || echo "$hata kırmızı") ──"
exit $([ $hata = 0 ] && echo 0 || echo 1)
