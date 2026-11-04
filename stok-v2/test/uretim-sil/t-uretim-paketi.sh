#!/usr/bin/env bash
# 12 — ÜRETİM SİLME TEK İŞLEM PAKETİ SINAMASI (4 Kasım). Yalnız yerel; Supabase'e bağlanmaz.
# Veritabanı: atolye_guvenlik'in (canlı benzeri) kopyası; 12-geri-al ile canlının bugünkü hâline indirilir (uretim_sil yok), fiş kuralları ve
# sürüm kapısı KAPALI. Kahin:
#   ÖNCE    12-sonra-dogrula tamam DEĞİL (işlem yok).
#   KUR     12-uretim-sil-kur.sql hatasız; 12-sonra-dogrula 6/6; ikinci kez çalıştırmak zararsız (yine 6/6).
#   DAVRANIŞ t-uretim-sil.js bu kopyada (kurallar KAPALI, canlı gibi) temiz — 1.744.8 istemci, eski fişli / fişsiz / sunucu fişi,
#           yarış, hata, görünmeyen hareket, çöp.
#   GERİ    12-geri-al.sql hatasız; işlem ve tetikleyiciler yok; veri değişmedi (satır sayıları aynı); kurallar / kapı kapalı.
#   EDITOR  üç dosya Editor uyumlu.
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
cd "$(dirname "$0")/../../.."
G=stok-v2/guvenlik; DB=atolye_uretim_paket
hata=0; k() { if [ "$2" = "$3" ]; then echo "  ✓ [$1] $2"; else echo "  ✗ [$1] $2 · beklenen $3"; hata=$((hata + 1)); fi; }
q() { psql -X -q -At -d "$DB" "$@"; }
dosya() { psql -X -q -At -v ON_ERROR_STOP=1 -d "$DB" -f "$1" > /dev/null 2> /tmp/uretim-paket-hata.txt; echo $?; }
tamam() { psql -X -q -At -F'|' -d "$DB" -f $G/12-sonra-dogrula.sql | awk -F'|' '{ n++; if ($4 == "t") t++ } END { print t "/" n }'; }
sayim() { q -c "select (select count(*) from public.stk_hareket) || '/' || (select count(*) from public.car_hareket) || '/' || (select count(*) from public.stk_fis) || '/' || (select count(*) from public.uretim)"; }

psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB template atolye_guvenlik"
q -c "update public.stk_ayar set fis_aktif = false, min_istemci_surum = null where id = 'tekil'"
# atolye_guvenlik bugünkü kaynakla kurulur (uretim_sil içinde) — canlının bugünkü hâline indirmek için önce paket geri alınır.
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f $G/12-geri-al.sql > /dev/null 2>&1
echo "t-uretim-paketi · $DB (atolye_guvenlik kopyası; kurallar ve kapı kapalı — canlı gibi)"
k "ONCE.islem-yok" "$(q -c "select count(*) from pg_proc where proname = 'uretim_sil'")" 0
k "KUR.hatasiz" "$(dosya $G/12-uretim-sil-kur.sql)" 0
k "KUR.12-sonra-dogrula" "$(tamam)" "6/6"
k "KUR.ikinci-kez-zararsiz" "$(dosya $G/12-uretim-sil-kur.sql):$(tamam)" "0:6/6"
if STOK_V2_DB=$DB node stok-v2/test/uretim-sil/t-uretim-sil.js > /tmp/uretim-paket-davranis.txt 2>/dev/null; then d=temiz; else d=kirmizi; fi
grep -E "✗" /tmp/uretim-paket-davranis.txt | head -5
k "DAVRANIS.t-uretim-sil (kurallar kapalı, canlı gibi)" "$d · $(grep -c '✓' /tmp/uretim-paket-davranis.txt) yeşil" "temiz · $(grep -c '✓' /tmp/uretim-paket-davranis.txt) yeşil"
k "DAVRANIS.kurallar-ve-kapi-hala-kapali" "$(q -c "select public.fis_kural_aktif()::text || '/' || coalesce(min_istemci_surum, '-') from public.stk_ayar")" "false/-"
once=$(sayim)
k "GERI.hatasiz" "$(dosya $G/12-geri-al.sql)" 0
k "GERI.islem-ve-tetikleyiciler-yok" "$(q -c "select (select count(*) from pg_proc where proname in ('uretim_sil', 'uretim_bag_koru', 'uretim_silme_koru')) + (select count(*) from pg_trigger where tgname in ('uretim_bag_koru', 'uretim_silme_koru', 'uretim_geri_yukle'))")" 0
k "GERI.veri-degismedi" "$(sayim)" "$once"
for f in 12-uretim-sil-kur 12-sonra-dogrula 12-geri-al; do python3 stok-v2/editor-icin.py $G/$f.sql > /dev/null 2>&1; k "EDITOR.$f" "$?" 0; done
psql -X -q -d postgres -c "drop database $DB"
echo "── t-uretim-paketi.sh: $([ $hata = 0 ] && echo temiz || echo "$hata kırmızı") ──"; exit $([ $hata = 0 ] && echo 0 || echo 1)
