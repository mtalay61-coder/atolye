#!/usr/bin/env bash
# GECE YEDEĞİ (7 Kasım; GECE-YEDEK-KURULUM.md). GitHub Actions'ta her gece çalışır (.github/workflows/gece-yedek.yml); kullanıcının
# bilgisayarı gerekmez. Sıra:
#   1. DÖKÜM      dokum-al.sh (canlıdan salt-okur; public.dump + auth/storage satırları + envanter) + auth/storage ŞEMASI
#                 (boş bir PostgreSQL'e geri yüklenebilsin diye) + kaynağın uzantı / yayın listesi.
#   2. SINAMA     Döküm, aynı makinedeki BOŞ, geçici bir PostgreSQL'e (iş akışının "postgres" hizmeti) geri yüklenir; geri yüklenen
#                 veritabanının envanteri canlının envanteriyle karşılaştırılır (tablo başına TAM satır sayısı, fonksiyon /
#                 tetikleyici tanım özeti, auth.users sayısı, kova başına dosya sayısı). Tek fark = yedek BAŞARISIZ.
#                 Bilinen ve açıklanmış iki satır karşılaştırılmaz, ayrıca yazılır: "uzantılar" (Supabase'e özgü uzantılar düz
#                 PostgreSQL'de yok) ve cron işleri (bilerek dökülmez — dokum-al.sh).
#   3. ONEDRIVE   (UZAK verilmişse) klasör rclone ile UZAK/<tarih>'e yüklenir, sonra "rclone check" ile dosya dosya (boyut + özet)
#                 doğrulanır. Sınama başarısızsa klasör yine yüklenir ama adı "-SINANMADI" ile biter ve içinde BASARISIZ.txt olur
#                 (sağlam olabilecek bir dökümü atmak yerine işaretle sakla); iş kırmızıya düşer → GitHub e-posta atar.
#   4. SAKLAMA    SAKLAMA_GUN'den eski klasörler silinir; en yeni EN_AZ klasöre (sınanmamışlar dahil) hiç dokunulmaz.
# GÜVENLİK
#   - Canlıya YAZILMAZ: pg_dump salt-okur işlem kullanır; envanter ve liste sorguları "default_transaction_read_only = on".
#   - Geri yükleme hedefi YALNIZ localhost / 127.0.0.1 olabilir ve public şeması BOŞ olmalı — canlıya geri yükleme imkânsız.
#   - DEPO HERKESE AÇIK → iş kaydına (log) veri / değer / hata ayrıntısı YAZILMAZ: yalnız adım adları, sayılar, sonuç. Hata metinleri
#     (DETAIL satırları satır değeri içerebilir) yalnız klasördeki dosyalara yazılır; klasör yalnız OneDrive'a gider (GitHub'da
#     yapıt / artifact olarak SAKLANMAZ). Parola PGPASSWORD ile gelir (GitHub secret), hiçbir dosyaya yazılmaz.
# Ortam:
#   KAYNAK_HOST KAYNAK_KULLANICI [KAYNAK_PORT=5432 KAYNAK_DB=postgres] PGPASSWORD   canlı (Supabase Session pooler)
#   HEDEF_HOST=localhost [HEDEF_PORT=5432 HEDEF_KULLANICI=postgres HEDEF_DB=postgres] geçici sınama veritabanı (süper kullanıcı)
#   CALISMA        çalışma klasörü (git deposu DIŞINDA; ör. $RUNNER_TEMP/yedek)
#   UZAK           rclone hedefi, ör. "onedrive:AtolyeYedek" — boşsa yükleme / saklama adımı atlanır (yerel sınama)
#   SAKLAMA_GUN=30  EN_AZ=7
# Çıkış: 0 = döküm sınandı (envanter AYNI) ve (UZAK varsa) OneDrive'a yüklenip doğrulandı; 1 = sınama ya da yükleme başarısız;
#        2 = döküm alınamadı / ayar eksik.
set -euo pipefail
cd "$(dirname "$0")"; BURASI=$(pwd); ENVANTER="$BURASI/../guvenlik/8-yedek-envanter-salt-okur.sql"
: "${KAYNAK_HOST:?KAYNAK_HOST gerekli}" "${KAYNAK_KULLANICI:?KAYNAK_KULLANICI gerekli}" "${CALISMA:?CALISMA gerekli}"
HEDEF_HOST=${HEDEF_HOST:-localhost}; HEDEF_PORT=${HEDEF_PORT:-5432}; HEDEF_KULLANICI=${HEDEF_KULLANICI:-postgres}; HEDEF_DB=${HEDEF_DB:-postgres}
SAKLAMA_GUN=${SAKLAMA_GUN:-30}; EN_AZ=${EN_AZ:-7}; UZAK=${UZAK:-}
case "$HEDEF_HOST" in localhost|127.0.0.1) ;; *) echo "DUR: sınama hedefi yalnız localhost olabilir."; exit 2;; esac
log() { echo "[$(date -u +%H:%M:%S)] $*"; }

AD=$(TZ=Europe/Istanbul date +%Y-%m-%d-%H%M)
mkdir -p "$CALISMA"; KLASOR="$CALISMA/$AD"
KBAG=(-h "$KAYNAK_HOST" -p "${KAYNAK_PORT:-5432}" -U "$KAYNAK_KULLANICI" -d "${KAYNAK_DB:-postgres}")
HBAG=(-h "$HEDEF_HOST" -p "$HEDEF_PORT" -U "$HEDEF_KULLANICI" -d "$HEDEF_DB")
# hedefe parola gönderilmez (geçici hizmet "trust"); canlı parolası yalnız kaynağa gider
hpsql() { env -u PGPASSWORD psql -X -q -v ON_ERROR_STOP=1 "${HBAG[@]}" "$@"; }

# ── 1. DÖKÜM ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
log "1/4 döküm (canlı, salt-okur)…"
t0=$(date +%s)
if ! KAYNAK_PORT="${KAYNAK_PORT:-5432}" KAYNAK_DB="${KAYNAK_DB:-postgres}" "$BURASI/dokum-al.sh" "$KLASOR" > "$CALISMA/dokum-ekran.txt" 2>&1; then
  # dokum-al hatası pg_dump / psql bağlantı hatasıdır (satır değeri taşımaz); host / kullanıcı GitHub'da secret olarak maskelenir
  log "DÖKÜM ALINAMADI. İlk hata: $(grep -m1 -iE 'error|hata|DUR' "$CALISMA/dokum-ekran.txt" | cut -c1-200)"
  exit 2
fi
umask 077
# auth + storage ŞEMASI (yalnız yapı): düz PostgreSQL'e geri yükleme için gerekli (dokum-al yalnız satırları alır — o dosya yeni
# bir Supabase projesine yükleme içindir). Sahip ve yetki satırları alınmaz (Supabase'in iç rolleri).
pg_dump "${KBAG[@]}" --schema-only --no-owner --no-privileges --schema=auth --schema=storage --file="$KLASOR/auth-storage-sema.sql" 2> "$KLASOR/hata-sema.txt" \
  || { log "DÖKÜM ALINAMADI (auth/storage şeması)."; exit 2; }
# Kaynağın uzantıları (hangi şemada), yayınları ve yayına üye public tabloları (realtime): -n public dökümü bunları içermez ama public nesneleri onlara bağlı
# olabilir; sınama hedefinde AYNI ad ve şemayla kurulur (kurulamayanlar yazılır).
psql -X -q -At -F '|' -v ON_ERROR_STOP=1 "${KBAG[@]}" -c "set default_transaction_read_only = on" \
  -c "select 'uzanti', e.extname, n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace union all select 'yayin', pubname, '' from pg_publication union all select 'yayin_tablo', pubname, quote_ident(schemaname) || '.' || quote_ident(tablename) from pg_publication_tables where schemaname = 'public' order by 1, 2, 3" \
  > "$KLASOR/kaynak-nesneler.txt" 2>> "$KLASOR/hata-sema.txt" || { log "DÖKÜM ALINAMADI (uzantı listesi)."; exit 2; }
t1=$(date +%s)
tablo_sayisi=$(grep -c '^tablo,' "$KLASOR/envanter-kaynak.csv" || true)
log "    döküm tamam: $((t1 - t0)) sn · public.dump $(( $(wc -c < "$KLASOR/public.dump") / 1024 )) KB · $tablo_sayisi tablo"

# ── 2. SINAMA ────────────────────────────────────────────────────────────────────────────────────────────────────────────
SONUC=""; ADIM=""
sinama() {
  local dosya="$KLASOR/sinama-ayrinti.txt"; : > "$dosya"
  adim() { ADIM=$1; shift; echo "== $ADIM" >> "$dosya"; "$@" >> "$dosya" 2>&1; }
  log "2/4 sınama: boş veritabanına geri yükleme…"
  local dolu; dolu=$(hpsql -At -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p')") \
    || { ADIM="hedefe bağlanma"; return 1; }
  [ "$dolu" = 0 ] || { ADIM="hedef boş değil ($dolu tablo)"; return 1; }
  # a) Supabase rolleri (yetki / politika satırları bunlara atıf yapar) — yoksa oluştur, giriş yetkisiz
  adim "roller" hpsql -c "do \$\$ declare r text; begin foreach r in array array['anon','authenticated','service_role','supabase_admin',
      'supabase_auth_admin','supabase_storage_admin','authenticator','dashboard_user','pgbouncer','supabase_realtime_admin',
      'supabase_replication_admin','supabase_read_only_user','supabase_functions_admin'] loop
      if not exists (select 1 from pg_roles where rolname = r) then execute format('create role %I nologin', r); end if; end loop; end \$\$" || return 1
  # b) uzantılar (kaynaktaki şemasıyla) ve yayınlar — düz PostgreSQL'de bulunmayanlar (pg_graphql, pgsodium, vault, pg_net, pg_cron…)
  #    atlanır ve yazılır; public nesnesi onlara bağlıysa sonraki adım zaten hata verir
  : > "$KLASOR/sinama-atlanan-uzantilar.txt"
  while IFS='|' read -r tur ad sema; do
    if [ "$tur" = uzanti ]; then
      [ "$ad" = plpgsql ] && continue
      hpsql -c "create schema if not exists \"$sema\"" >> "$dosya" 2>&1 || true
      hpsql -c "create extension if not exists \"$ad\" schema \"$sema\"" >> "$dosya" 2>&1 || echo "$ad ($sema)" >> "$KLASOR/sinama-atlanan-uzantilar.txt"
    elif [ "$tur" = yayin ]; then
      hpsql -c "do \$\$ begin if not exists (select 1 from pg_publication where pubname = '$ad') then create publication \"$ad\"; end if; end \$\$" >> "$dosya" 2>&1 || true
    fi
  done < "$KLASOR/kaynak-nesneler.txt"
  # c) auth + storage yapısı, d) auth + storage satırları (public'ten ÖNCE: public'in auth.users'a yabancı anahtarı olabilir;
  #    kısıt, pg_restore'da veriden SONRA kurulur ve o an auth.users dolu olmalı), e) public (CREATE SCHEMA public hariç her şey)
  adim "auth/storage şeması" hpsql --single-transaction -f "$KLASOR/auth-storage-sema.sql" || return 1
  adim "auth/storage satırları" hpsql --single-transaction -c "set local session_replication_role = replica" -f "$KLASOR/auth-storage.sql" || return 1
  pg_restore -l "$KLASOR/public.dump" | grep -vE '^[0-9]+; [0-9]+ [0-9]+ SCHEMA - public ' > "$CALISMA/liste.txt" || true
  adim "public şeması" env -u PGPASSWORD pg_restore --no-owner --exit-on-error --single-transaction -L "$CALISMA/liste.txt" "${HBAG[@]}" "$KLASOR/public.dump" || return 1
  # yayın üyelikleri (-n public dökümünde yok; geri dönüşte elle kurulacak listenin sınaması)
  while IFS='|' read -r tur ad tablo; do
    [ "$tur" = yayin_tablo ] || continue
    adim "yayın üyeliği" hpsql -c "alter publication \"$ad\" add table $tablo" || return 1
  done < "$KLASOR/kaynak-nesneler.txt"
  # YALNIZ SINAMA (t-gece-yedek.sh): geri yüklenen veritabanını bozar — kahinin farkı gerçekten yakaladığını göstermek için.
  # İş akışı bunu hiç vermez.
  if [ -n "${SINAMA_KANCASI:-}" ]; then adim "sınama kancası" hpsql -c "$SINAMA_KANCASI" || return 1; fi
  log "2/4 sınama: envanter karşılaştırması…"
  adim "sınama envanteri" bash -c 'env -u PGPASSWORD psql -X -q --csv -v ON_ERROR_STOP=1 "$@" -c "set default_transaction_read_only = on" -f "'"$ENVANTER"'" > "'"$KLASOR"'/envanter-sinama.csv"' _ "${HBAG[@]}" || return 1
  # bilinen iki satır karşılaştırma dışı (yukarıda); ikisi de ayrıca dosyada görünür
  local suz='import csv, sys
w = csv.writer(sys.stdout, lineterminator="\n"); r = csv.reader(open(sys.argv[1], encoding="utf-8")); w.writerow(next(r))
for x in r:
    if x[0] == "zamanlama" or (x[0] == "genel" and x[1] == "uzantılar"): continue
    w.writerow(x)'
  python3 -c "$suz" "$KLASOR/envanter-kaynak.csv" > "$CALISMA/k.csv"; python3 -c "$suz" "$KLASOR/envanter-sinama.csv" > "$CALISMA/s.csv"
  ADIM="envanter karşılaştırması"
  "$BURASI/envanter-karsilastir.sh" "$CALISMA/k.csv" "$CALISMA/s.csv" > "$KLASOR/karsilastirma.txt" 2>&1
}
set +e; sinama; r=$?; set -e
t2=$(date +%s)
{
  echo "yedek: $AD (İstanbul saati) · döküm $((t1 - t0)) sn · sınama $((t2 - t1)) sn"
  grep -E '^(döküm tarihi|süre|public\.dump|auth-storage\.sql|envanter:)' "$KLASOR/ozet.txt" || true
  if [ $r = 0 ]; then
    echo "SONUÇ: TAMAM — döküm boş bir PostgreSQL'e hatasız geri yüklendi ve envanteri canlıyla AYNI."
  else
    echo "SONUÇ: BAŞARISIZ — '$ADIM' adımı. Ayrıntı: sinama-ayrinti.txt / karsilastirma.txt (paylaşmadan önce müşteri verisi içermediğine bakın)."
  fi
  cat "$KLASOR/karsilastirma.txt" 2>/dev/null || true
  echo "karşılaştırma dışı (bilinen): uzantılar satırı, cron işleri — kaynaktaki değerler:"
  grep -E '^(genel,uzantılar|zamanlama,)' "$KLASOR/envanter-kaynak.csv" | sed 's/^/  /' || true
  [ -s "$KLASOR/sinama-atlanan-uzantilar.txt" ] && echo "sınama veritabanında kurulamayan uzantılar: $(tr '\n' ' ' < "$KLASOR/sinama-atlanan-uzantilar.txt")"
  echo "kapsam dışı: Storage DOSYALARI, Edge Function gizli değerleri, Authentication / proje ayarları, cron işleri (envanterde listeli)"
} > "$CALISMA/sonuc.txt"
if [ $r = 0 ]; then SONUC=TAMAM; cp "$CALISMA/sonuc.txt" "$KLASOR/TAMAM.txt"
  log "    SINAMA TAMAM: $tablo_sayisi tablonun satır sayıları, fonksiyon / tetikleyici özetleri, kullanıcı ve dosya kayıtları canlıyla AYNI ($((t2 - t1)) sn)"
else SONUC=BASARISIZ; cp "$CALISMA/sonuc.txt" "$KLASOR/BASARISIZ.txt"
  fark=$(grep -cE '^[<>]' "$KLASOR/karsilastirma.txt" 2>/dev/null || true)
  log "    SINAMA BAŞARISIZ: '$ADIM' adımı${fark:+ · $fark farklı envanter satırı}. Ayrıntı yalnız OneDrive'daki BASARISIZ.txt'de (kayda yazılmaz)."
fi

# ── 3. ONEDRIVE ──────────────────────────────────────────────────────────────────────────────────────────────────────────
if [ -z "$UZAK" ]; then log "3/4 yükleme atlandı (UZAK yok)"; [ $SONUC = TAMAM ] && exit 0 || exit 1; fi
HEDEF_AD=$AD; [ $SONUC = TAMAM ] || HEDEF_AD="$AD-SINANMADI"
log "3/4 OneDrive'a yükleme: $HEDEF_AD"
yukleme=0
rclone copy "$KLASOR" "$UZAK/$HEDEF_AD" --retries 5 --low-level-retries 10 > "$CALISMA/yukleme.txt" 2>&1 || yukleme=1
# yükleme doğrulaması: her dosya OneDrive'da var ve boyut + özet (quickxorhash) aynı
[ $yukleme = 0 ] && { rclone check "$KLASOR" "$UZAK/$HEDEF_AD" --one-way >> "$CALISMA/yukleme.txt" 2>&1 || yukleme=2; }
if [ $yukleme != 0 ]; then
  log "    YÜKLEME BAŞARISIZ ($([ $yukleme = 1 ] && echo kopyalama || echo 'doğrulama: OneDrive dosyaları yerel kopyayla aynı değil')): $(grep -m1 -oiE '(error|failed)[^"]{0,100}' "$CALISMA/yukleme.txt" || true)"
  exit 1
fi
log "    yüklendi ve doğrulandı: $(ls "$KLASOR" | wc -l) dosya, OneDrive'daki kopyalar yereldekiyle bayt bayt aynı (boyut + özet)"

# ── 4. SAKLAMA ───────────────────────────────────────────────────────────────────────────────────────────────────────────
log "4/4 saklama: $SAKLAMA_GUN günden eski klasörler (en yeni $EN_AZ korunur)…"
sinir=$(TZ=Europe/Istanbul date -d "-$SAKLAMA_GUN days" +%Y-%m-%d)
mapfile -t klasorler < <(rclone lsf "$UZAK" --dirs-only 2>/dev/null | sed 's:/$::' | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}' | sort)
silinen=0
if [ "${#klasorler[@]}" -gt "$EN_AZ" ]; then
  for d in "${klasorler[@]:0:$(( ${#klasorler[@]} - EN_AZ ))}"; do
    if [[ "${d:0:10}" < "$sinir" ]]; then rclone purge "$UZAK/$d" >> "$CALISMA/yukleme.txt" 2>&1 && silinen=$((silinen + 1)); fi
  done
fi
log "    OneDrive'da ${#klasorler[@]} yedek klasörü vardı, $silinen eski klasör silindi"
[ $SONUC = TAMAM ] && exit 0 || exit 1
