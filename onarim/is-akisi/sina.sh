#!/usr/bin/env bash
# YEDEK AÇMA İŞİNİN YEREL SINAMASI (26 Kasım). yedek-ac-onedrive.sh + yedek-ac-dogrula.sh'ı, gece yedeğinin klasörüyle AYNI
# biçimde üretilmiş taklit yedeklerle koşar: OneDrive yerine rclone'un YEREL arka ucu (aynı komutlar), PostgreSQL yerel.
# Canlıya, OneDrive'a, GitHub'a hiç bağlanmaz. Her durum için beklenen sonuç (TAMAM / DUR + neden) denetlenir; DUR'da CSV
# OLUŞMAMALI. Çıkış 0 = bütün durumlar beklendiği gibi.
#
# Gerekenler: PostgreSQL (psql, pg_dump, pg_restore, createdb), rclone, python3. Kök kullanıcıyla koşar (yerel 'root' süper
# kullanıcı rolü açılır — yalnız bu yerel sunucuda).
set -uo pipefail
KOK=$(cd "$(dirname "$0")/../.." && pwd)
BETIK="$KOK/onarim/is-akisi"; SORGU="$KOK/onarim/yedek-varyant-dokumu-salt-okur.sql"
ENVANTER="$KOK/stok-v2/guvenlik/8-yedek-envanter-salt-okur.sql"
S=$(mktemp -d /tmp/yedek-ac-sina.XXXXXX); trap 'rm -rf "$S"' EXIT
pg_lsclusters -h 2>/dev/null | grep -q online || pg_ctlcluster "$(pg_lsclusters -h | awk '{print $1; exit}')" main start
su postgres -c "env -u PGUSER -u PGHOST psql -qAtc \"select 1 from pg_roles where rolname = 'root'\"" | grep -q 1 || su postgres -c "env -u PGUSER createuser -s root"
export PGHOST=/var/run/postgresql PGUSER=root PGDATABASE=postgres
gecen=0; kalan=0
sonuc() { if [ "$1" = "$2" ]; then echo "  ✓ $3"; gecen=$((gecen + 1)); else echo "  ✗ $3 (beklenen $2, çıkan $1)"; kalan=$((kalan + 1)); fi; }

# ── taklit kaynak ─────────────────────────────────────────────────────────────────────────────────────────────────────────
kaynak_kur() {   # $1 = db, $2 = ek SQL
  dropdb --if-exists "$1"; createdb "$1"
  psql -q -d "$1" -f "$KOK/stok-v2/test/eski-tablolar.sql" >/dev/null 2>&1
  psql -q -d "$1" -f "$KOK/stok-v2/editor/1-kurulum.sql" >/dev/null 2>&1
  psql -q -v ON_ERROR_STOP=1 -d "$1" >/dev/null <<'SQL'
insert into stk_renk (id, ad, tur) values ('r-viz','VİZON YILAN','renk'),('r-kah','KAHVE SÜET','renk'),('r-bej','BEJ SÜET','renk'),
 ('k-1054','1054 - KAHVE SÜET/VİZON YILAN','model'),('k-1055','1055 - BEJ SÜET/VİZON YILAN','model')
 on conflict (id) do update set ad = excluded.ad, tur = excluded.tur;
insert into stk_olcu (id, ad) values ('b36','36'),('b37','37') on conflict do nothing;
insert into tanimlar values ('tekil', '{"renkler":[{"id":"r-viz","ad":"VİZON YILAN"},{"id":"r-kah","ad":"KAHVE SÜET"},{"id":"r-bej","ad":"BEJ SÜET"}],
 "renkKombinasyonlari":[{"id":"k-1054","kod":"1054","renkIdler":["r-kah","r-viz"]},{"id":"k-1055","kod":"1055","renkIdler":["r-bej","r-viz"]}]}')
 on conflict (id) do update set veri = excluded.veri;
insert into urunler (id, ad, kategori) values ('u-27162','27162 D','Mamul');
insert into stk_varyant (id, urun_id, renk_id, olcu_id) values ('vry-a1','u-27162','k-1054','b36'),('vry-a2','u-27162','k-1054','b37'),('vry-b1','u-27162','k-1055','b36');
insert into stk_fis (id, tur) values ('f-1','Sayım');
insert into stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak) values ('h-1','f-1','vry-a1','u-27162',3,'Sayım');
SQL
  [ -z "${2:-}" ] || psql -q -v ON_ERROR_STOP=1 -d "$1" -c "$2" >/dev/null
}
ozet_yaz() {     # $1 = klasör — dokum-al.sh'ın ozet.txt biçimi
  { echo "döküm tarihi: $(date -u +%FT%TZ) · sunucu 160015 · pg_dump yerel"
    for f in public.dump auth-storage.sql envanter-kaynak.csv; do
      echo "$f · $(wc -c < "$1/$f") bayt · sha256 $(sha256sum "$1/$f" | cut -c1-16)…"; done; } > "$1/ozet.txt"
}
yedek_al() {     # $1 = db, $2 = klasör, $3… = pg_dump ek seçenekleri
  local db=$1 k=$2; shift 2; mkdir -p "$k"
  pg_dump -d "$db" --format=custom --no-owner --schema=public "$@" -f "$k/public.dump"
  psql -X -q -d "$db" --csv -f "$ENVANTER" -o "$k/envanter-kaynak.csv"
  echo "-- auth/storage satırları (taklit)" > "$k/auth-storage.sql"
  ozet_yaz "$k"
}
kos() {          # $1 = durum adı, $2 = kaynak kök, $3 = klasör adı → stdout: TAMAM | DUR; çıktı $S/$1.log
  local ad=$1 kk=$2 kl=$3 db="ac_$1"
  dropdb --if-exists "$db"; createdb "$db"
  rm -f "$S/$ad.csv"
  { bash "$BETIK/yedek-ac-onedrive.sh" "$kk" "$S/korunan" "$kl" "$S/indir-$ad" \
      && bash "$BETIK/yedek-ac-dogrula.sh" "$S/indir-$ad" "$db" "$SORGU" "$S/$ad.csv"; } > "$S/$ad.log" 2>&1
  local rc=$?
  [ $rc = 0 ] && echo TAMAM || echo DUR
}
csv_var() { [ -s "$S/$1.csv" ] && echo var || echo yok; }
neden() { grep -m1 '^DUR:' "$S/$1.log" | cut -c1-150; }

echo "Taklit yedekler kuruluyor…"
kaynak_kur kaynak_saglam
yedek_al kaynak_saglam "$S/uzak/2026-11-25-1137"

# A. sağlam
r=$(kos saglam "$S/uzak" 2026-11-25-1137); echo "A. sağlam döküm:"; sed 's/^/     /' "$S/saglam.log"
sonuc "$r" TAMAM "sağlam döküm TAMAM"; sonuc "$(csv_var saglam)" var "CSV üretildi"
sonuc "$(grep -c '^3-varyant,' "$S/saglam.csv" 2>/dev/null)" 3 "CSV'de hata öncesi 3 kombinasyon varyantı (kimlikleriyle)"

bozuk() {        # $1 = durum, $2 = beklenen DUR metni (düzenli ifade), $3 = açıklama; klasör $S/uzak-$1/2026-11-25-1137 hazır olmalı
  local r; r=$(kos "$1" "$S/uzak-$1" 2026-11-25-1137)
  echo "$3:"; echo "     $(neden "$1")"
  sonuc "$r" DUR "$3 → DUR"; sonuc "$(csv_var "$1")" yok "CSV üretilmedi"
  grep -qE "$2" "$S/$1.log" && sonuc 1 1 "neden doğru: /$2/" || sonuc 0 1 "neden doğru: /$2/"
}
kopya() { rm -rf "$S/uzak-$1"; mkdir -p "$S/uzak-$1"; cp -a "$S/uzak/2026-11-25-1137" "$S/uzak-$1/"; echo "$S/uzak-$1/2026-11-25-1137"; }

# B. dökümde bayt bozuk, ozet eski (gerçek yolda bozulma) → özet denetimi
K=$(kopya bayt); printf '\xff\xfe\xfd\xfc' | dd of="$K/public.dump" bs=1 seek=4000 conv=notrunc status=none
bozuk bayt "public.dump boyut / özet ozet.txt ile AYNI DEĞİL" "B. bayt bozulmuş döküm (ozet.txt eski)"

# C. döküm kesik, ozet de kesik dökümle tutarlı (özet denetimini geçer) → veri yükleme hatası
K=$(kopya kesik); head -c $(( $(wc -c < "$K/public.dump") - 3000 )) "$K/public.dump" > "$K/x" && mv "$K/x" "$K/public.dump"; ozet_yaz "$K"
bozuk kesik "açılamadı|okunamadı" "C. kesik döküm (özet tutarlı)"

# D. SEÇİLİ tablonun VERİSİ bozuk, içindekiler sağlam, ozet tutarlı → COPY (veri yükleme) hatası, tek işlem geri alınır.
#    Bozulmanın kesin stk_varyant'ın veri satırına düşmesi için bu durumda döküm SIKIŞTIRMASIZ alınır (-Z0) ve satırdaki bir
#    sütun ayracı (sekme) aynı uzunlukta bir harfle değiştirilir → "missing data for column". (Gerçek dökümler sıkıştırılmıştır;
#    sınanan, açma yolunun veri hatasındaki davranışıdır.)
rm -rf "$S/uzak-veri"; K="$S/uzak-veri/2026-11-25-1137"; yedek_al kaynak_saglam "$K" -Z0
python3 -I - "$K/public.dump" <<'PY'
import sys
p = sys.argv[1]; b = bytearray(open(p, "rb").read())
i = b.find(b"vry-a1\tu-27162\tk-1054")   # stk_varyant satırı (stk_hareket satırında da "vry-a1\tu-27162" geçer)
assert i > 0, "veri satırı bulunamadı"
b[i + 6] = ord("X")
open(p, "wb").write(b)
PY
ozet_yaz "$K"
pg_restore -l "$K/public.dump" >/dev/null 2>&1 && echo "  (D: içindekiler okunabiliyor; bozulma stk_varyant veri satırında)"
bozuk veri "seçili tablolar açılamadı" "D. seçili tablonun veri satırı bozuk (içindekiler sağlam, özet tutarlı)"
grep -qE "^    COPY stk_varyant" "$S/veri.log" && sonuc 1 1 "veri yükleme hatası tablo adıyla kayıtta: COPY stk_varyant" || sonuc 0 1 "veri yükleme hatası tablo adıyla kayıtta"
sonuc "$(psql -XAt -d ac_veri -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'")" 0 \
  "tek işlem: veri hatasında da yarım yükleme kalmadı (public'te 0 tablo)"

# E. 10 tablodan biri dökümde yok
rm -rf "$S/uzak-eksik"; yedek_al kaynak_saglam "$S/uzak-eksik/2026-11-25-1137" -T stk_renk
bozuk eksik "'TABLE public stk_renk' girdisi yok" "E. stk_renk'siz döküm"

# F. satır sayısı envanterle tutmuyor
K=$(kopya sayi); sed -i 's/^tablo,stk_varyant,3,/tablo,stk_varyant,4,/' "$K/envanter-kaynak.csv"; ozet_yaz "$K"
bozuk sayi "satır sayısı envanterle tutmuyor" "F. envanterde stk_varyant 4, dökümde 3"

# G. tablo yapısı hatası: varsayılan değer dökülmeyen bir fonksiyona bağlı
kaynak_kur kaynak_yapi "create function public.ozel_varsayilan() returns text language sql as 'select ''x''';
  alter table public.stk_fis add column ozel text default public.ozel_varsayilan();"
rm -rf "$S/uzak-yapi"; yedek_al kaynak_yapi "$S/uzak-yapi/2026-11-25-1137"
bozuk yapi "seçili tablolar açılamadı" "G. tablo tanımı açılamıyor (eksik fonksiyon)"
sonuc "$(psql -XAt -d ac_yapi -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'")" 0 \
  "tek işlem: yarım yükleme kalmadı (public'te 0 tablo)"
grep -q "CREATE TABLE stk_fis" "$S/yapi.log" && sonuc 1 1 "hatalı nesne kayıtta adıyla: TABLE stk_fis" || sonuc 0 1 "hatalı nesne kayıtta adıyla"

# H. Supabase varsayılanı auth.uid() → saplama kurulur, açık yazılır, TAMAM
kaynak_kur kaynak_auth "create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';
  alter table public.urunler add column olusturan uuid default auth.uid();"
rm -rf "$S/uzak-auth"; yedek_al kaynak_auth "$S/uzak-auth/2026-11-25-1137"
r=$(kos auth "$S/uzak-auth" 2026-11-25-1137); echo "H. auth.uid() varsayılanlı döküm:"; grep -E 'saplama|TAMAM|DUR' "$S/auth.log" | sed 's/^/     /'
sonuc "$r" TAMAM "auth.uid() varsayılanı → TAMAM"; grep -q "saplaması: auth.uid/jwt/role" "$S/auth.log" && sonuc 1 1 "saplama kayıtta açıkça yazılı" || sonuc 0 1 "saplama kayıtta açıkça yazılı"

# I. hedef veritabanı boş değil
dropdb --if-exists ac_dolu; createdb ac_dolu; psql -q -d ac_dolu -c "create table public.x (a int)"
rm -rf "$S/indir-dolu"; bash "$BETIK/yedek-ac-onedrive.sh" "$S/uzak" "$S/korunan" 2026-11-25-1137 "$S/indir-dolu" >/dev/null 2>&1
bash "$BETIK/yedek-ac-dogrula.sh" "$S/indir-dolu" ac_dolu "$SORGU" "$S/dolu.csv" > "$S/dolu.log" 2>&1 && r=TAMAM || r=DUR
echo "I. dolu hedef:"; echo "     $(neden dolu)"; sonuc "$r" DUR "dolu hedef → DUR"; sonuc "$(csv_var dolu)" yok "CSV üretilmedi"

# J. koruma kopyasında aynı boyut + aynı zaman ama farklı içerik (rclone copy atlar) → özet karşılaştırması yakalar
K=$(kopya kopyabozuk); rm -rf "$S/korunan-kb"; mkdir -p "$S/korunan-kb"; cp -a "$K" "$S/korunan-kb/"
printf 'X' | dd of="$S/korunan-kb/2026-11-25-1137/envanter-kaynak.csv" bs=1 seek=10 conv=notrunc status=none
touch -r "$K/envanter-kaynak.csv" "$S/korunan-kb/2026-11-25-1137/envanter-kaynak.csv"
bash "$BETIK/yedek-ac-onedrive.sh" "$S/uzak-kopyabozuk" "$S/korunan-kb" 2026-11-25-1137 "$S/indir-kb" > "$S/kb.log" 2>&1 && r=TAMAM || r=DUR
echo "J. koruma kopyası içerik farkı (boyut ve zaman aynı):"; grep -E 'FARKLI|DUR' "$S/kb.log" | sed 's/^/     /'
sonuc "$r" DUR "boyutu aynı ama içeriği farklı kopya → DUR"; grep -q "özeti FARKLI: envanter-kaynak.csv" "$S/kb.log" && sonuc 1 1 "farklı dosya adıyla yakalandı" || sonuc 0 1 "farklı dosya adıyla yakalandı"

# K. sınanmamış klasör (BASARISIZ.txt) ve eksik dosya
K=$(kopya basarisiz); echo x > "$K/BASARISIZ.txt"; bozuk basarisiz "SINANMAMIŞ" "K. BASARISIZ.txt olan klasör"
K=$(kopya authyok); rm "$K/auth-storage.sql"; bozuk authyok "auth-storage.sql yok" "L. auth-storage.sql eksik klasör"

# M. İŞ AKIŞININ KENDİ ADIMI (yedek-ac.yml'den birebir çıkarılır): rclone'da "onedrive" adı YEREL bir klasöre takma ad →
#    iki klasörlük döngü, koruma kopyası, katı açma, CSV yükleme ve yüklenen CSV'nin özet doğrulaması uçtan uca.
OD="$S/od"; mkdir -p "$OD/AtolyeYedek"; cp -a "$S/uzak/2026-11-25-1137" "$OD/AtolyeYedek/"; cp -a "$S/uzak/2026-11-25-1137" "$OD/AtolyeYedek/2026-11-26-1121"
printf '[onedrive]\ntype = alias\nremote = %s\n' "$OD" > "$S/rclone-alias.conf"
python3 -I - "$KOK/onarim/is-akisi/yedek-ac.yml" > "$S/adim.sh" <<'PY'
import sys, yaml
d = yaml.safe_load(open(sys.argv[1], encoding="utf-8"))
print([x for x in d["jobs"]["ac"]["steps"] if x.get("name") == "Koru, doğrula, yalıtılmış aç, döküm çıkar"][0]["run"])
PY
for d in yedek_2026_11_25_1137 yedek_2026_11_26_1121; do dropdb --if-exists "$d" 2>/dev/null; done
( cd "$KOK" && KLASORLER="2026-11-25-1137 2026-11-26-1121" KORUMA=onedrive:AtolyeYedek-KORUNAN/renk-hatasi RCLONE_CONFIG="$S/rclone-alias.conf" \
    RUNNER_TEMP="$S/runner" bash -c 'mkdir -p "$RUNNER_TEMP"; bash "$0"' "$S/adim.sh" ) > "$S/adim.log" 2>&1 && r=TAMAM || r=DUR
echo "M. iş akışı adımı (yerel 'onedrive' takma adıyla):"; grep -E '^──|CSV OneDrive|tamlık|koruma kopyası:|DUR|error' "$S/adim.log" | sed 's/^/     /'
sonuc "$r" TAMAM "iş akışı adımı iki klasörde TAMAM"
sonuc "$(ls "$OD/AtolyeYedek-KORUNAN/renk-hatasi" 2>/dev/null | tr '\n' ' ')" "2026-11-25-1137 2026-11-25-1137-yedek-dokum.csv 2026-11-26-1121 2026-11-26-1121-yedek-dokum.csv " "koruma klasöründe iki kopya + iki CSV"
sonuc "$(diff -rq "$OD/AtolyeYedek/2026-11-25-1137" "$OD/AtolyeYedek-KORUNAN/renk-hatasi/2026-11-25-1137" >/dev/null && echo ayni)" ayni "koruma kopyası kaynakla bayt bayt aynı (diff -r)"
sonuc "$(ls "$OD/AtolyeYedek" | tr '\n' ' ')" "2026-11-25-1137 2026-11-26-1121 " "kaynak klasörlere dokunulmadı"

for d in kaynak_saglam kaynak_yapi kaynak_auth ac_saglam ac_bayt ac_kesik ac_veri ac_eksik ac_sayi ac_yapi ac_auth ac_dolu ac_basarisiz ac_authyok; do dropdb --if-exists "$d"; done
echo "── sınama: $gecen geçti, $kalan kaldı ──"
[ "$kalan" = 0 ]
