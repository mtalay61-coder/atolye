#!/usr/bin/env bash
# PROVA GERİ YÜKLEMESİ (YEDEK-DONUS-PROVASI.md § 4). dokum-al.sh'ın klasörünü AYRI, BOŞ bir veritabanına yükler, sonra
# envanteri prova üzerinde alıp kaynakla karşılaştırır.
# HEDEF KARIŞMASINA KARŞI ÜÇ BAĞIMSIZ KORUMA (biri tutmasa öteki durdurur):
#   1. hedef host / kullanıcı / veritabanı adında canlı proje kimliği (mqdgucoomgqcvhvgixbl) geçerse DUR (bağlanmadan);
#   2. hedef kimliği (host|port|kullanıcı|db özeti) dökümün alındığı kaynakla aynıysa DUR (bağlanmadan; ozet içinde yalnız özet);
#   3. hedefin public şemasında tek bir tablo bile varsa DUR (canlıda onlarca tablo var; --clean YOK, hiçbir şey silinmez).
#   Ardından "PROVA" yazılmadan başlamaz.
# HATADA DURUR: pg_restore --exit-on-error --single-transaction ve psql ON_ERROR_STOP --single-transaction — ilk hatada o
#   adımın HEPSİ geri alınır, sonraki adım çalışmaz, betik 1 ile çıkar. Yarım yüklenmiş prova "tamam" görünmez.
# GİZLİLİK: parola sorulur (ya da kullanıcının kendi ~/.pgpass'i); betik parolayı hiç görmez. Host / kullanıcı / veritabanı
#   adı ekrana ve dosyalara YAZILMAZ; hata dosyalarında geçerse <hedef-host> / <hedef-kullanici> / <hedef-db> ile değiştirilir.
# Kullanım:
#   PROVA_HOST=… PROVA_KULLANICI=… ./prova-geri-yukle.sh ~/AtolyeYedek/2026-11-05     (isteğe bağlı PROVA_PORT, PROVA_DB)
# Hedef: (a) yeni, boş Supabase projesi (önerilen; auth / storage / roller hazır) ya da (b) yerel PostgreSQL — önce anon /
# authenticated / service_role rolleri ile auth ve storage şemaları kurulmalı, yoksa ilk yetki satırında DURUR.
set -euo pipefail
cd "$(dirname "$0")"; BURASI=$(pwd); ENVANTER="$BURASI/../guvenlik/8-yedek-envanter-salt-okur.sql"
KLASOR=$(cd "${1:?"Kullanım: $0 <dokum-al.sh klasörü>"}" && pwd)
: "${PROVA_HOST:?PROVA_HOST gerekli}" "${PROVA_KULLANICI:?PROVA_KULLANICI gerekli}"
PORT=${PROVA_PORT:-5432}; DB=${PROVA_DB:-postgres}
CANLI_KIMLIK=mqdgucoomgqcvhvgixbl
dur() { echo "DUR: $*" >&2; exit 2; }
for f in public.dump auth-storage.sql envanter-kaynak.csv ozet.txt; do [ -f "$KLASOR/$f" ] || dur "$KLASOR/$f yok (dokum-al.sh tamamlanmamış)."; done

# Koruma 1 — adlarda canlı proje kimliği (büyük/küçük harf duyarsız; bağlanmadan önce)
case "$(printf '%s %s %s' "$PROVA_HOST" "$PROVA_KULLANICI" "$DB" | tr '[:upper:]' '[:lower:]')" in
  *"$CANLI_KIMLIK"*) dur "hedef CANLI proje. Prova yalnız ayrı bir veritabanına yapılır.";; esac
# Koruma 2 — dökümün kaynağıyla aynı bağlantı mı (dokum-al.sh ozet.txt'ye yalnız özetini yazar)
kimlik=$(printf '%s|%s|%s|%s' "$(printf '%s' "$PROVA_HOST" | tr '[:upper:]' '[:lower:]')" "$PORT" "$PROVA_KULLANICI" "$DB" | sha256sum | cut -c1-16)
kaynak_kimlik=$(sed -n 's/^kaynak kimliği (özet): //p' "$KLASOR/ozet.txt")
[ -n "$kaynak_kimlik" ] || dur "ozet.txt içinde kaynak kimliği yok (eski / elle değiştirilmiş döküm?)."
[ "$kimlik" != "$kaynak_kimlik" ] || dur "hedef, dökümün ALINDIĞI veritabanı. Prova yalnız ayrı bir veritabanına yapılır."

BAG=(-h "$PROVA_HOST" -p "$PORT" -U "$PROVA_KULLANICI" -d "$DB")
gizle() { sed -e "s|$(printf '%s' "$PROVA_HOST" | sed 's/[.[\*^$|]/\\&/g')|<hedef-host>|g" \
              -e "s|$(printf '%s' "$PROVA_KULLANICI" | sed 's/[.[\*^$|]/\\&/g')|<hedef-kullanici>|g" \
              -e "s|\"$(printf '%s' "$DB" | sed 's/[.[\*^$|]/\\&/g')\"|\"<hedef-db>\"|g"; }
# Koruma 3 — hedef boş mu
tablo=$(psql -X -At -v ON_ERROR_STOP=1 "${BAG[@]}" -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p')" 2> >(gizle >&2)) \
  || dur "hedefe bağlanılamadı."
[ "$tablo" = 0 ] || dur "hedefin public şemasında $tablo tablo var. Prova yalnız BOŞ veritabanına yapılır."
echo "Hedef boş ve dökümün kaynağı değil (kimlik özeti $kimlik)."
if [ "${PROVA_ONAY:-}" != PROVA ]; then read -r -p "Bu hedefe yüklemek için PROVA yazın: " cevap; [ "$cevap" = PROVA ] || { echo "Vazgeçildi."; exit 1; }; fi

umask 077; RAPOR="$KLASOR/prova-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$RAPOR"
ozet() { { echo "prova: $(date -u +%FT%TZ) · hedef kimliği (özet) $kimlik"; printf '%s\n' "$@"; } > "$RAPOR/ozet.txt"; cat "$RAPOR/ozet.txt"; }
adim() {  # adim <ad> <hata dosyası> <komut…>: hata olursa DURUR, hatayı gizleyerek dosyaya yazar
  local ad=$1 dosya=$2; shift 2
  if ! "$@" > /dev/null 2> "$RAPOR/$dosya.ham"; then
    gizle < "$RAPOR/$dosya.ham" > "$RAPOR/$dosya"; rm -f "$RAPOR/$dosya.ham"
    ozet "SONUÇ: BAŞARISIZ — '$ad' adımında DURDU; o adımın tamamı geri alındı (tek işlem)." \
         "ilk hata: $(grep -m1 -iE 'error|hata' "$RAPOR/$dosya" || head -1 "$RAPOR/$dosya")" \
         "tam metin: $RAPOR/$dosya (paylaşmadan önce müşteri verisi içermediğine bakın)"
    exit 1
  fi
  gizle < "$RAPOR/$dosya.ham" > "$RAPOR/$dosya"; rm -f "$RAPOR/$dosya.ham"
}
t0=$(date +%s)
echo "1/3 public şeması (pg_restore, tek işlem, ilk hatada durur)…"
adim "public şeması" hatalar-public.txt pg_restore --no-owner --exit-on-error --single-transaction "${BAG[@]}" "$KLASOR/public.dump"
t1=$(date +%s)
echo "2/3 auth + storage satırları (tek işlem, ilk hatada durur)…"
adim "auth + storage satırları" hatalar-auth-storage.txt psql -X -q -v ON_ERROR_STOP=1 --single-transaction "${BAG[@]}" \
  -c "set local session_replication_role = replica" -f "$KLASOR/auth-storage.sql"
t2=$(date +%s)
echo "3/3 prova envanteri + karşılaştırma…"
adim "prova envanteri" hatalar-envanter.txt bash -c 'psql -X -q --csv -v ON_ERROR_STOP=1 "$@" -c "set default_transaction_read_only = on" -f "'"$ENVANTER"'" > "'"$RAPOR"'/envanter-prova.csv"' _ "${BAG[@]}"
set +e; "$BURASI/envanter-karsilastir.sh" "$KLASOR/envanter-kaynak.csv" "$RAPOR/envanter-prova.csv" > "$RAPOR/karsilastirma.txt"; r=$?; set -e
ozet "süre: public $((t1 - t0)) sn · auth+storage $((t2 - t1)) sn" \
     "yükleme: hatasız (iki adım da tek işlemde tamamlandı)" \
     "SONUÇ: envanter $([ $r = 0 ] && echo AYNI || echo 'FARKLI — aşağıdaki satırları açıklayın')" "$(cat "$RAPOR/karsilastirma.txt")"
echo "Sonra: canli-salt-okur-kontrol.sql, guvenlik/2-sonra-dogrula.sql, guvenlik/7-sonra-dogrula.sql PROVA veritabanında."
exit $r
