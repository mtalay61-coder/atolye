#!/usr/bin/env bash
# 12 — ÜRETİM SİLME TEK İŞLEM PAKETİ SINAMASI (4 Kasım). Yalnız yerel; Supabase'e bağlanmaz.
# Veritabanı: atolye_guvenlik'in (canlı benzeri) kopyası; 12-geri-al ile canlının bugünkü hâline indirilir (uretim_sil yok), fiş kuralları ve
# sürüm kapısı KAPALI. Kahin:
#   ÖNCE    12-sonra-dogrula tamam DEĞİL (işlem yok).
#   KUR     12-uretim-sil-kur.sql hatasız; 12-sonra-dogrula 8/8; ikinci kez çalıştırmak zararsız (yine 8/8).
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
# 13 — 12 ÖNCESİ SALT-OKUR SORGU: geçmişte oluşmuş yarım silmeyi (üretim yok, hareket geçerli) bulur, hiçbir şeyi değiştirmez.
# Yarım silme 1.744.7'nin yaptığı gibi kurulur (yalnız bu kopyada, tetikleyiciler atlanarak): üretim + eski fişli stok + cari, sonra
# üretim kaydı silinir.
YU=pk-yarim-$$
q -c "set session_replication_role = replica;
  insert into public.uretim (id, siparis_no, urun_id, ek) values ('$YU', '$YU-NO', 'u-yeni', '{}');
  insert into public.stk_fis (id, aile, onek, istek, tur, kaynak, uretim_id) values ('$YU-EF', 'stok', 'ÜRT', null, 'Üretim', 'Üretim', '$YU');
  insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, uretim_id) select '$YU-h', '$YU-EF', varyant_id, 'u-yeni', -2, 'Üretim', '$YU' from public.stk_hareket where urun_id = 'u-yeni' limit 1;
  insert into public.car_hareket (id, cari_id, tutar, yon, fis_id, uretim_id) values ('$YU-c', 'c-yeni', 40, 'Alacak', '$YU-EF', '$YU');
  delete from public.uretim where id = '$YU';"
s13() { psql -X -q -At -F'|' -d "$DB" -f $G/13-uretim-hareket-salt-okur.sql; }
once13=$(sayim)
k "13.yarim-silme-stok-bulundu" "$(s13 | awk -F'|' -v u="$YU" '$2 ~ /stok hareketi geçerli/ && index($5, u) { print "bulundu" }')" bulundu
k "13.yarim-silme-cari-bulundu" "$(s13 | awk -F'|' -v u="$YU" '$2 ~ /cari hareketi geçerli/ && index($5, u) { print "bulundu" }')" bulundu
k "13.yarim-silme-fis-basligi-bulundu" "$(s13 | awk -F'|' -v u="$YU" '$2 ~ /fiş başlığı geçerli/ && index($5, u) { print "bulundu" }')" bulundu
k "13.hicbir-sey-degismedi (salt-okur)" "$(sayim)" "$once13"
k "13.yarim-kayitlar-degismedi (hareketler hâlâ geçerli)" "$(q -c "select (select count(*) from public.stk_hareket where id = '$YU-h' and not iptal) + (select count(*) from public.car_hareket where id = '$YU-c' and not iptal)")" 2
k "KUR.hatasiz" "$(dosya $G/12-uretim-sil-kur.sql)" 0
k "KUR.12-sonra-dogrula" "$(tamam)" "8/8"
k "KUR.ikinci-kez-zararsiz" "$(dosya $G/12-uretim-sil-kur.sql):$(tamam)" "0:8/8"
# GÜVENLİK SIKILAŞTIRMASINA UYGUNLUK (2-sikilastir / 2-sonra-dogrula, 4 Kasım): kopya sıkılaştırılmış (kos-guvenlik son hâli).
#   - 2-sonra-dogrula.sql'in BÜTÜN satırları 12'den sonra da tamam (girişsiz yalnız 9 site + yonetici_mi; search_path sabit olmayan 0);
#   - uretim_sil: security definer, search_path = public, extensions, pg_temp; authenticated ÇALIŞTIRIR; anon ve PUBLIC çalıştıramaz;
#   - tetikleyici işlevleri (uretim_silme_koru, uretim_bag_koru): security definer, sabit search_path; anon / authenticated /
#     PUBLIC çalıştıramaz (tetikleyici olarak çalışırlar, doğrudan çağrılamazlar);
#   - iz tablosu (uretim_silinen): RLS açık, anon / authenticated hiçbir yetki yok.
k "GUVENLIK.2-sonra-dogrula (12 sonrası)" "$(psql -X -q -At -F'|' -d "$DB" -f $G/2-sonra-dogrula.sql | awk -F'|' '{ n++; if ($4 == "t") t++; else bad = bad $1 "(" $3 ") " } END { print (bad == "" ? "hepsi " t "/" n : bad) }')" "hepsi 8/8"
fn() { q -c "select p.prosecdef::text || '|' || coalesce(array_to_string(p.proconfig, ','), '-') || '|auth=' || has_function_privilege('authenticated', p.oid, 'execute')::text
  || '|anon=' || has_function_privilege('anon', p.oid, 'execute')::text
  || '|public=' || exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = '$1'"; }
YOL='search_path=public, extensions, pg_temp'
k "GUVENLIK.uretim_sil" "$(fn uretim_sil)" "true|$YOL|auth=true|anon=false|public=false"
k "GUVENLIK.uretim_silme_koru" "$(fn uretim_silme_koru)" "true|$YOL|auth=false|anon=false|public=false"
k "GUVENLIK.uretim_bag_koru" "$(fn uretim_bag_koru)" "true|$YOL|auth=false|anon=false|public=false"
k "GUVENLIK.iz-tablosu" "$(q -c "select c.relrowsecurity::text || '|' || has_table_privilege('anon', c.oid, 'select,insert,update,delete')::text || '|' || has_table_privilege('authenticated', c.oid, 'select,insert,update,delete')::text from pg_class c where c.oid = 'public.uretim_silinen'::regclass")" "true|false|false"
k "GUVENLIK.yetki-denetimi (Üretim silme yetkisi yoksa red)" "$(psql -X -q -At -d "$DB" 2>&1 <<SQL | grep -oE "ERROR: +[0-9A-Z]{5}|SONUC" | head -1 | sed -E 's/ERROR: +//'
\set VERBOSITY verbose
begin;
select set_config('request.jwt.claims', '{"email":"yetkisiz@atolye.local","role":"authenticated"}', true);
set local role authenticated;
select 'SONUC' || public.uretim_sil('{"id":"yok-boyle"}'::jsonb)::text;
rollback;
SQL
)" 42501
if STOK_V2_DB=$DB node stok-v2/test/uretim-sil/t-uretim-kilit.js > /tmp/uretim-paket-kilit.txt 2>/dev/null; then kl=temiz; else kl=kirmizi; fi
k "DAVRANIS.t-uretim-kilit (kilitlenme yok)" "$kl" temiz
if STOK_V2_DB=$DB node stok-v2/test/uretim-sil/t-uretim-sil.js > /tmp/uretim-paket-davranis.txt 2>/dev/null; then d=temiz; else d=kirmizi; fi
grep -E "✗" /tmp/uretim-paket-davranis.txt | head -5
k "DAVRANIS.t-uretim-sil (kurallar kapalı, canlı gibi)" "$d · $(grep -c '✓' /tmp/uretim-paket-davranis.txt) yeşil" "temiz · $(grep -c '✓' /tmp/uretim-paket-davranis.txt) yeşil"
k "DAVRANIS.kurallar-ve-kapi-hala-kapali" "$(q -c "select public.fis_kural_aktif()::text || '/' || coalesce(min_istemci_surum, '-') from public.stk_ayar")" "false/-"
# DURDUR — geri alma gerekirse önce bütün üretim silmeleri durdurulur (Yönetici dahil, REST ve uretim_sil); hiçbir şey değişmez.
DU=pk-durdur-$$
q -c "set session_replication_role = replica; insert into public.uretim (id, siparis_no, urun_id, ek) values ('$DU', '$DU-NO', 'u-yeni', '{}');"
uyg() { psql -X -q -At -d "$DB" 2>&1 <<SQL | grep -oE "ERROR: +[0-9A-Z]{5}|^tamam$" | head -1 | sed -E 's/ERROR: +//'
\set VERBOSITY verbose
begin;
select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', true);
set local role authenticated;
$1;
select 'tamam';
commit;
SQL
}
k "DURDUR.kur" "$(dosya $G/12-silme-durdur.sql)" 0
k "DURDUR.REST-silme-red (1.744.7 yolu)" "$(uyg "delete from public.uretim where id = '$DU'")" KR011
k "DURDUR.uretim_sil-red (1.744.8 yolu)" "$(uyg "select public.uretim_sil('{\"id\":\"$DU\",\"stokIdler\":[],\"cariIdler\":[]}'::jsonb)")" KR011
k "DURDUR.uretim-duruyor" "$(q -c "select count(*) from public.uretim where id = '$DU'")" 1
k "DURDUR.kaldir" "$(dosya $G/12-silme-durdur-kaldir.sql)" 0
k "DURDUR.kaldirinca-silme-yeniden-calisir" "$(uyg "select public.uretim_sil('{\"id\":\"$DU\",\"stokIdler\":[],\"cariIdler\":[]}'::jsonb)"):$(q -c "select count(*) from public.uretim where id = '$DU'")" "tamam:0"
once=$(sayim)
k "GERI.hatasiz" "$(dosya $G/12-geri-al.sql)" 0
k "GERI.islem-ve-tetikleyiciler-yok" "$(q -c "select (select count(*) from pg_proc where proname in ('uretim_sil', 'uretim_bag_koru', 'uretim_silme_koru')) + (select count(*) from pg_trigger where tgname in ('uretim_bag_koru', 'uretim_silme_koru', 'uretim_geri_yukle'))")" 0
k "GERI.veri-degismedi" "$(sayim)" "$once"
k "GERI.kalan (iz tablosu durur, veri; sürüm kapısı tetikleyicisi onunla)" "$(q -c "select (to_regclass('public.uretim_silinen') is not null)::text")" "true"
# 12-geri-al YALNIZ üç korumayı kaldırır: uretim_sil işlemi (satır 1), üretim silme koruması (satır 2), silinmiş üretime hareket
# kilidi (satır 3). İz tablosu, RLS'i ve sürüm kapısı tetikleyicisi KALIR (satır 4–5); kurallar / kapı zaten kapalı (satır 6).
k "GERI.kalkan-bes-koruma (12-sonra: 1–3 ve 7–8 değil, 4–6 tamam)" "$(psql -X -q -At -F'|' -d "$DB" -f $G/12-sonra-dogrula.sql | awk -F'|' '{ printf "%s", ($4 == "t" ? "t" : "f") }')" "ffftttff"
for f in 12-uretim-sil-kur 12-sonra-dogrula 12-geri-al 12-silme-durdur 12-silme-durdur-kaldir 13-uretim-hareket-salt-okur; do python3 stok-v2/editor-icin.py $G/$f.sql > /dev/null 2>&1; k "EDITOR.$f" "$?" 0; done
psql -X -q -d postgres -c "drop database $DB"
echo "── t-uretim-paketi.sh: $([ $hata = 0 ] && echo temiz || echo "$hata kırmızı") ──"; exit $([ $hata = 0 ] && echo 0 || echo 1)
