#!/usr/bin/env bash
# YEDEĞİ YALITILMIŞ AÇ — DOĞRULAMA VE DÖKÜM (26 Kasım, renk çökmesi). yedek-ac.yml her klasör için bunu çağırır; yerelde
# test/yedek-ac/sina.sh ile sağlam ve bozuk dökümlerle sınanır. Canlıya BAĞLANMAZ; yalnız verilen (boş) veritabanına yazar.
#
# Kullanım: yedek-ac-dogrula.sh <klasör> <veritabanı> <sorgu.sql> <çıktı.csv>
#   <klasör>: public.dump, ozet.txt, envanter-kaynak.csv, auth-storage.sql (gece yedeğinin dosyaları; KORUMA KOPYASINDAN indirilmiş)
#   <veritabanı>: BOŞ olmalı (içinde tablo varsa DURUR). PGHOST / PGUSER ortamdan.
#
# KATI KURALLAR (kullanıcı, 26 Kasım: "geri yükleme hatalarını topluca yok sayma … tablo yapısı veya veri yükleme hatasında dur …
# eksik yüklemeden sonuç üretme"):
#   1. ozet.txt'deki her dosyanın BAYT boyutu ve sha256'sı (ozet'in tuttuğu ilk 16 hane) indirilen dosyayla aynı olmalı.
#   2. Açılacak nesneler dökümün içindekiler listesinden (pg_restore -l) SEÇİLİR: 10 tablonun TABLE + TABLE DATA girdileri ve
#      public dizileri (SEQUENCE / SEQUENCE SET — sütun varsayılanı nextval olabilir). Geri kalan her şey (fonksiyon, tetikleyici,
#      politika, dizin, kısıt, yabancı anahtar, yayın, uzantı …) HİÇ DENENMEZ → "beklenen bağımlılık hatası" diye yok sayılacak bir
#      hata doğmaz; dışarıda bırakılanlar türüne göre SAYILIR ve yazılır. 10 tablodan birinin TABLE ya da TABLE DATA girdisi yoksa DURUR.
#   3. Bilinen dış bağımlılıklar AÇIKÇA karşılanır, yok sayılmaz: seçili tablo tanımlarında auth.uid() / auth.jwt() / auth.role()
#      (Supabase varsayılanları) ya da extensions.* geçiyorsa o şemaya etkisiz SAPLAMA kurulur ve hangisinin kurulduğu yazılır.
#      Başka bir dış başvuru varsa açma hata verir → DURUR.
#   4. pg_restore --exit-on-error --single-transaction: İLK hatada hepsi geri alınır, iş DURUR. pg_restore'un hata kanalına tek
#      satır bile düşerse (uyarı dahil) DURUR. Kayda yalnız hatanın hangi NESNEDE olduğu ("from TOC entry … TABLE stk_varyant")
#      yazılır; hata metni (COPY satırı veri taşıyabilir) yalnız yerel dosyada kalır.
#   5. CSV'den ÖNCE: 10 tablonun hepsi veritabanında var ve her birinin satır sayısı envanter-kaynak.csv'deki ("tablo" bölümü,
#      dökümle AYNI anlık görüntüde sayılmış) değere EŞİT; tetikleyici sayısı 0. Biri tutmazsa DURUR, CSV üretilmez.
#   6. Sorgu hatasız biterse CSV önce geçici adla yazılır, en sonda yerine taşınır (yarım CSV kalmaz).
# Kayda yazılanlar (depo ve iş kaydı herkese açık): adım adları, dosya adı + boyut + özetin ilk 16 hanesi, tablo adı + satır
# sayısı, nesne TÜRÜ sayıları, hatalı nesnenin türü ve adı. VERİ YAZILMAZ.
set -euo pipefail
umask 077
[ $# -eq 4 ] || { echo "kullanım: $0 <klasör> <veritabanı> <sorgu.sql> <çıktı.csv>" >&2; exit 2; }
K=$1; DB=$2; SORGU=$3; CIKTI=$4
TABLOLAR="stk_varyant stk_renk stk_olcu stk_hareket stk_fis tanimlar urunler siparisler siparis_kalemleri uretim"
IS=$(mktemp -d); trap 'rm -rf "$IS"' EXIT
dur() { echo "DUR: $*"; exit 1; }
psqlq() { psql -X -At -v ON_ERROR_STOP=1 -d "$DB" "$@" 2>>"$IS/psql-hata.txt"; }

# ── 1. Dosyalar ve özetler ─────────────────────────────────────────────────────────────────────────────────────────────────
for f in public.dump ozet.txt envanter-kaynak.csv; do [ -s "$K/$f" ] || dur "$f yok ya da boş"; done
n=0
for f in public.dump auth-storage.sql envanter-kaynak.csv; do
  satir=$(grep -E "^$f · [0-9]+ bayt · sha256 [0-9a-f]{16}" "$K/ozet.txt" || true)
  [ -n "$satir" ] || dur "ozet.txt'de $f satırı yok"
  [ -f "$K/$f" ] || dur "$f indirilmemiş"
  b_bayt=$(sed -E 's/^.* · ([0-9]+) bayt · .*$/\1/' <<<"$satir"); b_oz=$(grep -oE '[0-9a-f]{16}' <<<"${satir##*sha256 }" | head -1)
  g_bayt=$(wc -c < "$K/$f"); g_oz=$(sha256sum "$K/$f" | cut -c1-16)
  echo "  $f: $g_bayt bayt, sha256 $g_oz… (ozet: $b_bayt bayt, $b_oz…)"
  [ "$b_bayt" = "$g_bayt" ] && [ "$b_oz" = "$g_oz" ] || dur "$f boyut / özet ozet.txt ile AYNI DEĞİL"
  n=$((n + 1))
done
echo "  özet denetimi: $n dosya bayt boyutu ve sha256 ile aynı"

# ── 2. Veritabanı boş mu ───────────────────────────────────────────────────────────────────────────────────────────────────
var=$(psqlq -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p','v','S')") \
  || dur "hedef veritabanına bağlanılamadı"
[ "$var" = 0 ] || dur "hedef veritabanı boş değil ($var nesne)"

# ── 3. İçindekiler: seç, eksik tabloyu yakala, dışarıda kalanı say ────────────────────────────────────────────────────────
pg_restore -l "$K/public.dump" > "$IS/toc.txt" 2> "$IS/toc-hata.txt" || dur "döküm okunamadı (pg_restore -l)"
[ ! -s "$IS/toc-hata.txt" ] || dur "döküm okunurken uyarı / hata: $(grep -c . "$IS/toc-hata.txt") satır"
: > "$IS/secili.toc"
for t in $TABLOLAR; do
  for tur in "TABLE" "TABLE DATA"; do
    s=$(grep -E "^[0-9]+; [0-9]+ [0-9]+ $tur public $t( |$)" "$IS/toc.txt" || true)
    [ "$(grep -c . <<<"$s" || true)" = 1 ] || dur "dökümde '$tur public $t' girdisi yok ya da birden çok"
    echo "$s" >> "$IS/secili.toc"
  done
done
grep -E '^[0-9]+; [0-9]+ [0-9]+ SEQUENCE (SET )?public ' "$IS/toc.txt" >> "$IS/secili.toc" || true
echo "  seçilen: $(grep -c ' TABLE public ' "$IS/secili.toc") tablo yapısı, $(grep -c ' TABLE DATA public ' "$IS/secili.toc") tablo verisi, $(grep -cE ' SEQUENCE (SET )?public ' "$IS/secili.toc" || true) dizi girdisi"
grep -E '^[0-9]+;' "$IS/toc.txt" | grep -vxF -f "$IS/secili.toc" \
  | sed -E 's/^[0-9]+; [0-9]+ [0-9]+ //; s/^(TABLE DATA|SEQUENCE SET|SEQUENCE OWNED BY|FK CONSTRAINT|DEFAULT ACL|ROW SECURITY|PUBLICATION TABLE|EVENT TRIGGER|MATERIALIZED VIEW|[A-Z]+) .*/\1/' \
  | sort | uniq -c | awk '{c=$1; $1=""; printf "    dışarıda (denenmedi): %s ×%s\n", substr($0,2), c}'

# ── 4. Dış bağımlılıklar: açıkça saptanır, saplaması kurulur ──────────────────────────────────────────────────────────────
pg_restore -L "$IS/secili.toc" --no-owner --no-privileges --schema-only -f "$IS/ddl.sql" "$K/public.dump" 2> "$IS/ddl-hata.txt" \
  || dur "seçili tanımlar çıkarılamadı"
[ ! -s "$IS/ddl-hata.txt" ] || dur "seçili tanımlar çıkarılırken uyarı / hata"
sapla=""
if grep -qE '\bauth\.(uid|jwt|role)\(' "$IS/ddl.sql"; then
  psqlq -c "create schema auth;
    create function auth.uid() returns uuid language sql stable as 'select null::uuid';
    create function auth.jwt() returns jsonb language sql stable as 'select null::jsonb';
    create function auth.role() returns text language sql stable as 'select null::text';" >/dev/null || dur "auth saplaması kurulamadı"
  sapla="$sapla auth.uid/jwt/role"
fi
if grep -qE '\bextensions\.' "$IS/ddl.sql"; then
  psqlq -c "create schema extensions; create extension pgcrypto schema extensions; create extension \"uuid-ossp\" schema extensions;" >/dev/null \
    || dur "extensions saplaması kurulamadı"
  sapla="$sapla extensions(pgcrypto,uuid-ossp)"
fi
echo "  dış bağımlılık saplaması:${sapla:- yok (gerekmedi)}"

# ── 5. Katı açma ──────────────────────────────────────────────────────────────────────────────────────────────────────────
if ! pg_restore -L "$IS/secili.toc" --no-owner --no-privileges --exit-on-error --single-transaction -d "$DB" "$K/public.dump" \
     2> "$IS/restore.txt"; then
  echo "  açma HATASI — hatalı nesne(ler) (hata metni kayda yazılmaz):"
  # Hatalı nesne pg_restore'un "Command was: CREATE TABLE public.stk_fis (" / "COPY public.stk_varyant (…" /
  # "COPY failed for table \"stk_varyant\"" / "from TOC entry …" satırlarından YALNIZ tür + ad olarak çıkarılır. ERROR metni
  # (ör. "invalid input syntax …: \"<değer>\"") veri parçası taşıyabileceği için kayda YAZILMAZ.
  { grep -oE '^Command was: (CREATE TABLE|CREATE SEQUENCE|ALTER TABLE|COPY) (ONLY )?(public\.)?[a-z_0-9]+' "$IS/restore.txt" \
      | sed -E 's/^Command was: //; s/ ONLY / /; s/public\.//' || true
    grep -oE 'COPY failed for table "[a-z_0-9]+"' "$IS/restore.txt" | sed -E 's/^COPY failed for table "([a-z_0-9]+)"/COPY \1/' || true
    grep -oE 'from TOC entry [0-9]+; [0-9]+ [0-9]+ [A-Z]+( [A-Z]+)* [a-z_0-9]+' "$IS/restore.txt" | sed -E 's/^from TOC entry [0-9]+; [0-9]+ [0-9]+ //' || true
  } | sort -u | sed 's/^/    /' > "$IS/nesne.txt" || true
  if [ -s "$IS/nesne.txt" ]; then cat "$IS/nesne.txt"; else echo "    (nesne adı çıkmadı — döküm dosyasının kendisi okunamadı)"; fi
  dur "seçili tablolar açılamadı; tek işlem olduğu için hiçbir şey yüklenmedi"
fi
[ ! -s "$IS/restore.txt" ] || dur "açma uyarı verdi ($(grep -c . "$IS/restore.txt") satır) — katı kipte kabul edilmez"
echo "  açma: hatasız, uyarısız (tek işlem)"

# ── 6. Tamlık: 10 tablo var, satır sayıları envanterle aynı, tetikleyici 0 ─────────────────────────────────────────────────
python3 -I - "$K/envanter-kaynak.csv" $TABLOLAR > "$IS/beklenen.txt" <<'PY' || dur "envanter-kaynak.csv okunamadı ya da tablo satırı eksik"
import csv, sys
yol, tablolar = sys.argv[1], sys.argv[2:]
say = {}
with open(yol, newline="", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        if r.get("bolum") == "tablo":
            say[r["ad"]] = r["deger"]
eksik = [t for t in tablolar if t not in say or not str(say[t]).isdigit()]
if eksik:
    print("EKSIK " + " ".join(eksik)); sys.exit(1)
for t in tablolar:
    print(t, say[t])
PY
tutmayan=0
while read -r t beklenen; do
  var=$(psqlq -c "select to_regclass('public.$t') is not null") || dur "tablo denetimi çalışmadı"
  [ "$var" = t ] || { echo "  $t: AÇILMAMIŞ"; tutmayan=$((tutmayan + 1)); continue; }
  gercek=$(psqlq -c "select count(*) from public.$t") || dur "$t sayılamadı"
  if [ "$gercek" = "$beklenen" ]; then echo "  $t: $gercek satır = envanter $beklenen"
  else echo "  $t: $gercek satır ≠ envanter $beklenen"; tutmayan=$((tutmayan + 1)); fi
done < "$IS/beklenen.txt"
[ "$tutmayan" = 0 ] || dur "$tutmayan tablo eksik ya da satır sayısı envanterle tutmuyor — CSV üretilmedi"
tet=$(psqlq -c "select count(*) from pg_trigger where not tgisinternal") || dur "tetikleyici sayılamadı"
[ "$tet" = 0 ] || dur "açılan veritabanında $tet tetikleyici var (0 bekleniyordu)"
echo "  tamlık: 10/10 tablo, satır sayıları envanterle aynı, tetikleyici 0"

# ── 7. Döküm ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" --csv -f "$SORGU" -o "$IS/dokum.csv" 2> "$IS/sorgu-hata.txt" || dur "döküm sorgusu hata verdi (metin kayda yazılmaz)"
[ ! -s "$IS/sorgu-hata.txt" ] || dur "döküm sorgusu uyarı verdi"
[ "$(head -1 "$IS/dokum.csv")" = "bolum,urun_id,urun,ayrinti" ] || dur "döküm başlığı beklenen değil"
mv "$IS/dokum.csv" "$CIKTI"
echo "  döküm: $(($(wc -l < "$CIKTI") - 1)) satır → $(basename "$CIKTI")"
echo "TAMAM"
