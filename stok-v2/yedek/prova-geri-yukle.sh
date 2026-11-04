#!/usr/bin/env bash
# PROVA GERİ YÜKLEMESİ (YEDEK-DONUS-PROVASI.md § 5). dokum-al.sh'ın klasörünü AYRI, BOŞ bir veritabanına yükler, sonra
# envanteri prova üzerinde alıp kaynakla karşılaştırır. CANLIYA ASLA YÜKLEMEZ:
#   - hedef adresinde canlı proje kimliği (mqdgucoomgqcvhvgixbl) geçiyorsa durur;
#   - hedefte public şemasında tablo varsa durur (boş olmayan veritabanının üstüne yazılmaz; --clean YOK);
#   - "PROVA" yazılmadan başlamaz.
# Parola SORULUR (psql / pg_restore). Kullanım:
#   PROVA_HOST=… PROVA_KULLANICI=… ./prova-geri-yukle.sh ~/AtolyeYedek/2026-11-05
#   (isteğe bağlı: PROVA_PORT=5432  PROVA_DB=postgres)
# Hedef iki türlü olabilir: (a) yeni, boş bir Supabase projesi (önerilen: auth / storage / roller hazır gelir);
# (b) yerel PostgreSQL — önce anon / authenticated / service_role rolleri ile auth ve storage şemaları kurulmalı, yoksa
# yetki satırları ve auth satırları hata verir (bu hatalar gecikme değil, provanın sonucu olarak kayda geçer).
set -euo pipefail
cd "$(dirname "$0")"; BURASI=$(pwd); ENVANTER="$BURASI/../guvenlik/8-yedek-envanter-salt-okur.sql"
KLASOR=$(cd "${1:?"Kullanım: $0 <dokum-al.sh klasörü>"}" && pwd)
: "${PROVA_HOST:?PROVA_HOST gerekli}" "${PROVA_KULLANICI:?PROVA_KULLANICI gerekli}"
PORT=${PROVA_PORT:-5432}; DB=${PROVA_DB:-postgres}
CANLI_KIMLIK=mqdgucoomgqcvhvgixbl
for f in public.dump auth-storage.sql envanter-kaynak.csv; do [ -f "$KLASOR/$f" ] || { echo "DUR: $KLASOR/$f yok."; exit 2; }; done
case "$PROVA_HOST $PROVA_KULLANICI $DB" in *"$CANLI_KIMLIK"*) echo "DUR: hedef CANLI proje ($CANLI_KIMLIK). Prova yalnız ayrı veritabanına."; exit 2;; esac

BAG=(-h "$PROVA_HOST" -p "$PORT" -U "$PROVA_KULLANICI" -d "$DB")
tablo=$(psql -X -At "${BAG[@]}" -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p')")
if [ "$tablo" != 0 ]; then echo "DUR: hedefte public şemasında $tablo tablo var. Prova yalnız BOŞ veritabanına."; exit 2; fi
echo "Hedef: $PROVA_HOST:$PORT/$DB (kullanıcı $PROVA_KULLANICI) — boş."
if [ "${PROVA_ONAY:-}" != PROVA ]; then read -r -p "Bu hedefe yüklemek için PROVA yazın: " cevap; [ "$cevap" = PROVA ] || { echo "Vazgeçildi."; exit 1; }; fi

umask 077; RAPOR="$KLASOR/prova-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$RAPOR"
t0=$(date +%s)
echo "1/3 public şeması (pg_restore)…"
# Hata olursa durmaz: hepsini dosyaya yazar, sonda sayılır. Owner'lar hedefte farklı (--no-owner); yetkiler (GRANT) taşınır.
set +e
pg_restore --no-owner "${BAG[@]}" "$KLASOR/public.dump" 2> "$RAPOR/hatalar-public.txt"; r1=$?
t1=$(date +%s)
echo "2/3 auth + storage satırları…"
# Aynı oturumda: tetikleyiciler ve yabancı anahtar sırası satır yüklerken engel olmasın.
psql -X -q "${BAG[@]}" -c "set session_replication_role = replica" -f "$KLASOR/auth-storage.sql" > /dev/null 2> "$RAPOR/hatalar-auth-storage.txt"; r2=$?
set -e
t2=$(date +%s)
echo "3/3 prova envanteri + karşılaştırma…"
psql -X -q --csv -v ON_ERROR_STOP=1 "${BAG[@]}" -c "set default_transaction_read_only = on" -f "$ENVANTER" > "$RAPOR/envanter-prova.csv"
set +e; "$BURASI/envanter-karsilastir.sh" "$KLASOR/envanter-kaynak.csv" "$RAPOR/envanter-prova.csv" > "$RAPOR/karsilastirma.txt"; r3=$?; set -e

{
  echo "prova: $(date -u +%FT%TZ) · hedef $PROVA_HOST/$DB"
  echo "süre: public $((t1 - t0)) sn · auth+storage $((t2 - t1)) sn"
  echo "pg_restore çıkış $r1 · hata satırı $(grep -c 'error' "$RAPOR/hatalar-public.txt")"
  echo "auth+storage çıkış $r2 · hata satırı $(grep -c 'ERROR' "$RAPOR/hatalar-auth-storage.txt")"
  echo "envanter karşılaştırması: $([ $r3 = 0 ] && echo AYNI || echo FARKLI)"
  cat "$RAPOR/karsilastirma.txt"
} > "$RAPOR/ozet.txt"
cat "$RAPOR/ozet.txt"
echo "Hata dosyaları: $RAPOR/hatalar-*.txt — paylaşmadan önce içinde müşteri verisi olmadığına bakın."
echo "Sonra: canli-salt-okur-kontrol.sql, guvenlik/2-sonra-dogrula.sql, guvenlik/7-sonra-dogrula.sql PROVA veritabanında."
