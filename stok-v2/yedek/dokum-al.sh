#!/usr/bin/env bash
# BAĞIMSIZ DÖKÜM (YEDEK-DONUS-PROVASI.md § 4). KULLANICININ KENDİ BİLGİSAYARINDA çalışır; canlıya YAZMAZ.
#   - Parola komut satırında / dosyada YOK: pg_dump ve psql sorar (ya da kullanıcının kendi ~/.pgpass'i).
#   - Çıktı klasörü bir git deposunun İÇİNDE olamaz (döküm müşteri verisi içerir; yanlışlıkla commit'lenmesin).
#   - Envanter (8-yedek-envanter-salt-okur.sql) salt-okur oturumda çalışır: "set default_transaction_read_only = on".
# Üretir (klasör izinleri 700, dosyalar 600):
#   public.dump        public şeması: tablolar, satırlar, fonksiyonlar, tetikleyiciler, yetkiler (pg_dump -Fc)
#   auth-storage.sql   auth ve storage şemalarının yalnız SATIRLARI (kullanıcılar, kova kayıtları). Dosyaların kendisi YOK.
#   envanter-kaynak.csv  dökümden HEMEN ÖNCE alınan envanter (karşılaştırmanın kaynağı)
#   ozet.txt           tarih, süreler, dosya boyutları, sha256 ve kaynak bağlantısının yalnız ÖZETİ (host / kullanıcı adı
#                      yazılmaz) — prova-geri-yukle.sh bu özetle "hedef = kaynak" karışmasını reddeder; sohbete yapıştırılabilir
# HATADA DURUR: herhangi bir adım hata verirse yarım dosyalar silinir, klasörde yalnız YARIM-KALDI.txt kalır, çıkış ≠ 0.
# cron işleri BİLEREK dökülmez: provada çalışırsa canlı gün sonu fonksiyonunu çağırabilir. Envanterde listelenir.
#
# Kullanım:
#   KAYNAK_HOST=aws-0-<bölge>.pooler.supabase.com KAYNAK_KULLANICI=postgres.<proje> ./dokum-al.sh ~/AtolyeYedek/2026-11-05
#   (isteğe bağlı: KAYNAK_PORT=5432  KAYNAK_DB=postgres) — değerler panelde Connect › Session pooler'da; parola SORULUR.
set -euo pipefail
cd "$(dirname "$0")"; BURASI=$(pwd); ENVANTER="$BURASI/../guvenlik/8-yedek-envanter-salt-okur.sql"
HEDEF=${1:?"Kullanım: $0 <çıktı klasörü (depo DIŞINDA)>"}
: "${KAYNAK_HOST:?KAYNAK_HOST gerekli}" "${KAYNAK_KULLANICI:?KAYNAK_KULLANICI gerekli}"
PORT=${KAYNAK_PORT:-5432}; DB=${KAYNAK_DB:-postgres}

mkdir -p "$HEDEF"; chmod 700 "$HEDEF"; HEDEF=$(cd "$HEDEF" && pwd)
if git -C "$HEDEF" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "DUR: $HEDEF bir git deposunun içinde. Döküm müşteri verisi içerir — depo dışında bir klasör seçin."; exit 2; fi
if [ -n "$(ls -A "$HEDEF")" ]; then echo "DUR: $HEDEF boş değil (eski dökümün üstüne yazılmaz)."; exit 2; fi
umask 077
bitti=0
temizle() { if [ "$bitti" != 1 ]; then rm -f "$HEDEF"/public.dump "$HEDEF"/auth-storage.sql "$HEDEF"/envanter-kaynak.csv "$HEDEF"/ozet.txt
  echo "döküm YARIM KALDI ($(date -u +%FT%TZ)); dosyalar silindi. Hata ekranda." > "$HEDEF/YARIM-KALDI.txt"
  echo "DUR: döküm tamamlanmadı; yarım dosyalar silindi." >&2; fi; }
trap temizle EXIT
for a in pg_dump psql sha256sum; do command -v "$a" >/dev/null || { echo "DUR: $a bulunamadı (PostgreSQL istemcisi kurulu olmalı)."; exit 2; }; done

BAG=(-h "$KAYNAK_HOST" -p "$PORT" -U "$KAYNAK_KULLANICI" -d "$DB")
sunucu=$(psql -X -At -v ON_ERROR_STOP=1 "${BAG[@]}" -c "show server_version_num")
istemci=$(pg_dump --version | grep -oE '[0-9]+' | head -1)
if [ "$istemci" -lt $((sunucu / 10000)) ]; then
  echo "DUR: pg_dump $istemci, sunucu $((sunucu / 10000)). pg_dump sunucu sürümünden eski olamaz."; exit 2; fi

zaman() { date +%s; }
echo "1/3 envanter (salt-okur oturum)…"
psql -X -q --csv -v ON_ERROR_STOP=1 "${BAG[@]}" -c "set default_transaction_read_only = on" -f "$ENVANTER" > "$HEDEF/envanter-kaynak.csv"

echo "2/3 public şeması…"; t0=$(zaman)
pg_dump "${BAG[@]}" --format=custom --no-owner --schema=public --file="$HEDEF/public.dump"; t1=$(zaman)

echo "3/3 auth + storage satırları…"
# migrations tabloları hedef projede zaten dolu doğar; çakışmasın diye satırları alınmaz.
pg_dump "${BAG[@]}" --format=plain --data-only --no-owner --schema=auth --schema=storage \
  --exclude-table-data=auth.schema_migrations --exclude-table-data=storage.migrations \
  --file="$HEDEF/auth-storage.sql"; t2=$(zaman)

{
  echo "döküm tarihi: $(date -u +%FT%TZ) · sunucu $sunucu · pg_dump $(pg_dump --version | awk '{print $NF}')"
  echo "kaynak kimliği (özet): $(printf '%s|%s|%s|%s' "$(printf '%s' "$KAYNAK_HOST" | tr '[:upper:]' '[:lower:]')" "$PORT" "$KAYNAK_KULLANICI" "$DB" | sha256sum | cut -c1-16)"
  echo "süre: public $((t1 - t0)) sn · auth+storage $((t2 - t1)) sn"
  for f in public.dump auth-storage.sql envanter-kaynak.csv; do
    echo "$f · $(wc -c < "$HEDEF/$f") bayt · sha256 $(sha256sum "$HEDEF/$f" | cut -c1-16)…"; done
  echo "envanter: $(($(wc -l < "$HEDEF/envanter-kaynak.csv") - 1)) satır (tablo sayısı: $(grep -c '^tablo,' "$HEDEF/envanter-kaynak.csv"))"
  echo "kapsam dışı: storage DOSYALARI, Edge Function gizli değerleri, Authentication/proje ayarları, cron işleri (envanterde listeli)"
} > "$HEDEF/ozet.txt"
chmod 600 "$HEDEF"/*
bitti=1
cat "$HEDEF/ozet.txt"
echo "TAMAM. Klasörü şifreli bir yerde saklayın; sohbete yalnız ozet.txt yapıştırılabilir."
