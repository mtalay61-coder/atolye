#!/usr/bin/env bash
# GÜVENLİK SIKILAŞTIRMA (madde 4 + 5) — YEREL SINAMA. Yalnız yerel PostgreSQL; Supabase'e DOKUNMAZ.
#  0) canlı benzeri veritabanı (hazirla.sh): bütün sistem + site fonksiyonları + Supabase'in varsayılan yetkileri
#  1) liste (1-liste-salt-okur.sql, üç bölüm, Editor gibi ayrı ayrı) → liste-uret.js → bu veritabanına göre 2-sikilastir kopyası;
#     Bölüm 2'nin şemasız adı YAKALADIĞI ayrıca sınanır (extensions'taki gen_salt'ı şemasız çağıran deneme fonksiyonu)
#  2) önce: davranış bataryası (97 fonksiyon × anon / veli / ali) + vitrin akışı
#  3) KİLİT: listeden bir ad çıkarılmış kopya çalıştırılır → hata vermeli ve HİÇBİR yetki değişmemeli
#  4) sıkılaştırma Editor gibi (her ifade ayrı istek) → sonra: batarya karşılaştırması, vitrin akışı, liste (anon yalnız site)
#  5) regresyon: bütünlük koşucusunun testleri (kurulum hariç) sıkılaştırılmış veritabanında
#  6) ikinci uygulama zararsız (yetkiler aynı) → geri alma → yetki / ayar özeti İLK hâlle birebir, batarya önceyle aynı
#  7) geri almadan sonra yeniden sıkılaştırma çalışır, sonuç ilk sıkılaştırmayla aynı
# Çıkış 0: hepsi temiz.
set -u
cd "$(dirname "$0")/../../.."
KOK="$(pwd)"
case "${PGHOST:-}" in localhost|127.0.0.1|::1) ;; *) echo 'PGHOST=localhost gerekli (finans testleri yalnız TCP kabul eder)'; exit 2;; esac
DB=${GUVENLIK_DB:-atolye_guvenlik}; export STOK_V2_DB="$DB"
CIK=${GUVENLIK_CIKTI:-/tmp/guvenlik}; rm -rf "$CIK"; mkdir -p "$CIK"
G=stok-v2/guvenlik; T=stok-v2/test/guvenlik
HATA=0
kirmizi() { echo "   ✗ $*"; HATA=1; }
editor_ver() {   # $1 dosya — Supabase SQL Editor gibi: her ifade ayrı istek; NOTICE / hata metni $2 dosyasına
  python3 "$KOK/stok-v2/editor-icin.py" --bol "$1" | node -e '
    const { spawnSync } = require("child_process");
    const parcalar = require("fs").readFileSync(0, "utf8").split("\0").filter(Boolean);
    let cikis = 0, metin = "";
    for (const p of parcalar) { const r = spawnSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", process.argv[1], "-c", p], { encoding: "utf8" });
      metin += r.stderr; if (r.status !== 0) { cikis = 1; break; } }
    require("fs").writeFileSync(process.argv[2], metin); process.exit(cikis);' "$DB" "$2"
}
ozet() {   # yetki + ayar özeti: her public fonksiyon (uzantı dışı) için kim / hangi yetki (veren hariç) ve ayarlar; varsayılan yetkiler
  psql -X -At -d "$DB" -c "
    select p.oid::regprocedure::text || ' | ' || coalesce((select string_agg(distinct coalesce(nullif(pg_get_userbyid(a.grantee), '-'), 'PUBLIC') || ':' || a.privilege_type, ',')
             from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a), '') || ' | ' || coalesce(array_to_string(p.proconfig, ';'), '')
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
    union all
    select 'varsayilan ' || pg_get_userbyid(d.defaclrole) || ' ' || coalesce(d.defaclnamespace::regnamespace::text, '*') || ' | ' || d.defaclacl::text
      from pg_default_acl d where d.defaclobjtype = 'f'
    order by 1"
}
bolumler() {   # $1 önek — Bölüm 1, 2, 3 CSV
  for i in 1 2 3; do python3 $G/bolum.py $G/1-liste-salt-okur.sql $i | psql -X -q --csv -d "$DB" > "$CIK/$1-bolum$i.csv" || kirmizi "Bölüm $i çalışmadı"; done
}

echo "══ 0) canlı benzeri veritabanı"
bash $T/hazirla.sh || exit 2

echo "══ 1) liste + Bölüm 2'nin şemasız adı yakalaması"
psql -X -q -d "$DB" -c "create function public.dene_semasiz() returns text language sql as \$f\$ select gen_salt('bf') \$f\$;" 2>/dev/null \
  || psql -X -q -d "$DB" -c "set search_path = public, extensions; create function public.dene_semasiz() returns text language sql as \$f\$ select gen_salt('bf') \$f\$;"
python3 $G/bolum.py $G/1-liste-salt-okur.sql 2 | psql -X -q --csv -d "$DB" > "$CIK/dene-bolum2.csv"
grep -q "dene_semasiz().*gen_salt.*extensions" "$CIK/dene-bolum2.csv" && echo "   ✓ Bölüm 2 extensions'taki şemasız gen_salt çağrısını yakaladı" || kirmizi "Bölüm 2 şemasız adı yakalamadı: $(cat "$CIK/dene-bolum2.csv")"
python3 $G/bolum.py $G/1-liste-salt-okur.sql 1 | psql -X -q --csv -d "$DB" > "$CIK/dene-bolum1.csv"
node $G/liste-uret.js "$CIK/dene-bolum1.csv" "$CIK/dene-bolum2.csv" > "$CIK/dene-liste-uret.txt" 2>&1
[ $? -eq 3 ] && echo "   ✓ liste-uret.js Bölüm 2 satırı varken durdu" || kirmizi "liste-uret.js Bölüm 2 satırına rağmen devam etti"
psql -X -q -d "$DB" -c "drop function public.dene_semasiz();"
bolumler once
cp $G/2-sikilastir.sql "$CIK/2-sikilastir-yerel.sql"
node $G/liste-uret.js "$CIK/once-bolum1.csv" "$CIK/once-bolum2.csv" "$CIK/2-sikilastir-yerel.sql" | sed 's/^/   /' || kirmizi "liste üretilemedi"
diff <(sed -n '/LİSTE:KAPANACAK BAŞ/,/LİSTE:YOL SON/p' $G/2-sikilastir.sql | grep -o "'public[^']*'") \
     <(sed -n '/LİSTE:KAPANACAK BAŞ/,/LİSTE:YOL SON/p' "$CIK/2-sikilastir-yerel.sql" | grep -o "'public[^']*'") > /dev/null \
  && echo "   ✓ depodaki TASLAK listeler bu veritabanının listeleriyle aynı" || echo "   • depodaki TASLAK listeler bu veritabanından farklı (yerel kopya kullanılıyor)"
SIK="$CIK/2-sikilastir-yerel.sql"
ozet > "$CIK/ozet-0-once.txt"

echo "══ 2) önce: batarya + vitrin"
node $T/davranis.js "$DB" > "$CIK/davranis-once.json" || kirmizi "batarya (önce) çalışmadı"
node $T/vitrin.js "$DB" once > "$CIK/vitrin-once.txt" 2>&1 && echo "   ✓ vitrin akışı (önce) temiz" || { kirmizi "vitrin (önce)"; cat "$CIK/vitrin-once.txt"; }

echo "══ 3) KİLİT: listede eksik ad → hiçbir şey değişmemeli"
awk 'BEGIN{x=0} /LİSTE:KAPANACAK BAŞ/{x=1} x==1 && /'"'"'public\./ && !y {sub(/'"'"'public\.[^'"'"']*'"'"',?/, ""); y=1} {print}' "$SIK" > "$CIK/2-kilit.sql"
if editor_ver "$CIK/2-kilit.sql" "$CIK/kilit-cikti.txt"; then kirmizi "eksik listeyle çalıştı"; else
  grep -q "KİLİT: anon listesi canlıyla uyuşmuyor" "$CIK/kilit-cikti.txt" && echo "   ✓ KİLİT durdurdu: $(grep -o 'Listede OLMAYAN: [^·]*' "$CIK/kilit-cikti.txt" | head -1)" || kirmizi "beklenmeyen hata: $(tail -2 "$CIK/kilit-cikti.txt")"; fi
ozet > "$CIK/ozet-0-kilit.txt"
cmp -s "$CIK/ozet-0-once.txt" "$CIK/ozet-0-kilit.txt" && echo "   ✓ kilitten sonra yetkiler değişmedi" || kirmizi "kilit sonrası yetkiler değişti"

echo "══ 4) sıkılaştırma (Editor gibi) → sonra"
editor_ver "$SIK" "$CIK/sikilastir-cikti.txt" && echo "   ✓ $(grep -o 'Güvenlik sıkılaştırması.*uygulandı[^.]*' "$CIK/sikilastir-cikti.txt")" || { kirmizi "sıkılaştırma düştü"; tail -5 "$CIK/sikilastir-cikti.txt"; }
ozet > "$CIK/ozet-1-sikilastir.txt"
node $T/davranis.js "$DB" > "$CIK/davranis-sonra.json" || kirmizi "batarya (sonra) çalışmadı"
node $T/karsilastir.js "$CIK/davranis-once.json" "$CIK/davranis-sonra.json" "$SIK" sikilastir | sed 's/^/   /'; [ "${PIPESTATUS[0]}" -eq 0 ] || HATA=1
GUVENLIK_SONRA=1 node $T/vitrin.js "$DB" sonra > "$CIK/vitrin-sonra.txt" 2>&1 && echo "   ✓ vitrin akışı (sonra) temiz" || { kirmizi "vitrin (sonra)"; cat "$CIK/vitrin-sonra.txt"; }
bolumler sonra
anon_sayi=$(psql -X -At -d "$DB" -c "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
  and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')")
[ "$anon_sayi" = 8 ] && echo "   ✓ anon'un çalıştırabildiği: yalnız 8 site fonksiyonu" || kirmizi "anon'un çalıştırabildiği $anon_sayi (8 olmalı)"
yolsuz=$(psql -X -At -d "$DB" -c "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
  where n.nspname = 'public' and l.lanname not in ('c','internal') and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')")
[ "$yolsuz" = 0 ] && echo "   ✓ search_path'i sabit olmayan fonksiyon kalmadı" || kirmizi "search_path'i sabit olmayan $yolsuz fonksiyon"

echo "══ 5) regresyon (sıkılaştırılmış veritabanında)"
reg() { local ad="$1"; shift; if "$@" > "$CIK/reg-$ad.txt" 2>&1; then echo "   ✓ $ad"; else kirmizi "$ad — $CIK/reg-$ad.txt"; tail -4 "$CIK/reg-$ad.txt" | sed 's/^/       /'; fi; }
reg f0 bash stok-v2/test/f0/kos.sh
for t in stok-v2/test/finans/t-*.js; do reg "finans-$(basename "$t" .js)" node "$t"; done
for t in stok-v2/test/f4/t-atomik-bag.js stok-v2/test/f4/t-canli-bag.js stok-v2/test/f4/t-rezervasyon-yaris.js stok-v2/test/f4/t-yaris.js \
         stok-v2/test/f3/t-satis-sinir.js stok-v2/test/f3/t-satis-yaris.js stok-v2/test/f8/t-renk-kilit.js stok-v2/test/f8/t-renk-dogal.js \
         stok-v2/test/duzeltme/t-bag-kilit.js stok-v2/test/duzeltme/t-servis-kapi.js stok-v2/test/duzeltme/t-eski-bag.js stok-v2/test/duzeltme/t-siparis-sil.js; do
  reg "$(basename "$(dirname "$t")")-$(basename "$t" .js)" node "$t"; done
reg f2 env F2_N=100 F2_ZORLA=3 bash stok-v2/test/f2/kos-f2.sh
# finans/t-yetki-tekrar.js rls-kimlik.sql'i YENİDEN çalıştırır: o dosya anon'un BÜTÜN fonksiyon yetkilerini alıyor, sitenin 8
# fonksiyonu dahil (mevcut davranış — kullanıcıya bildirildi). Canlıdaki işlem sırası: rls-kimlik'ten sonra site-portal.sql.
ozet > "$CIK/ozet-1b-regresyon.txt"
site_fark=$(diff "$CIK/ozet-1-sikilastir.txt" "$CIK/ozet-1b-regresyon.txt" | grep '^>' | grep -cE '^> (herkese_acik_vitrin|site_ayarlari|site_kayit_ol|portal)')
diger_fark=$(diff "$CIK/ozet-1-sikilastir.txt" "$CIK/ozet-1b-regresyon.txt" | grep '^>' | grep -vcE '^> (herkese_acik_vitrin|site_ayarlari|site_kayit_ol|portal)')
echo "   • rls-kimlik.sql yeniden çalışınca anon'a kapanan site fonksiyonu: $site_fark (mevcut davranış, sıkılaştırmadan bağımsız)"
[ "$diger_fark" = 0 ] && echo "   ✓ site fonksiyonları dışında testler yetki değiştirmedi" || { kirmizi "regresyon sırasında başka yetkiler de değişti"; diff "$CIK/ozet-1-sikilastir.txt" "$CIK/ozet-1b-regresyon.txt" | head; }
(echo "set check_function_bodies = off;"; cat site-portal.sql) | psql -X -q -d "$DB" > /dev/null 2>&1
ozet > "$CIK/ozet-1c-site.txt"
# Yetkiler (2. sütun) aynı kalmalı. Ayar (3. sütun): create or replace search_path'i SIFIRLAR — kaynak dosyası yeniden çalışan
# fonksiyonun sabitlenmiş yolu kaybolur (bilinen bulgu; kalıcı çözüm kaynak tanımlarına SET search_path eklemek).
cut -d'|' -f1,2 "$CIK/ozet-1-sikilastir.txt" > "$CIK/y1"; cut -d'|' -f1,2 "$CIK/ozet-1c-site.txt" > "$CIK/y2"
cmp -s "$CIK/y1" "$CIK/y2" && echo "   ✓ site-portal.sql yeniden çalışınca YETKİLER sıkılaştırma sonrasıyla aynı" || { kirmizi "site-portal sonrası yetki farkı"; diff "$CIK/y1" "$CIK/y2" | head; }
sifirlanan=$(diff "$CIK/ozet-1-sikilastir.txt" "$CIK/ozet-1c-site.txt" | grep '^>' | sed 's/^> //; s/ |.*//' | tr '\n' ' ')
[ -n "$sifirlanan" ] && echo "   • bulgu: kaynağı yeniden çalışınca search_path'i sıfırlanan: $sifirlanan" || true

echo "══ 6) ikinci uygulama → geri alma"
editor_ver "$SIK" "$CIK/ikinci-cikti.txt" && grep -q "zaten uygulanmış" "$CIK/ikinci-cikti.txt" && echo "   ✓ ikinci uygulama: zaten uygulanmış" || kirmizi "ikinci uygulama: $(tail -2 "$CIK/ikinci-cikti.txt")"
ozet > "$CIK/ozet-2-ikinci.txt"; cmp -s "$CIK/ozet-1c-site.txt" "$CIK/ozet-2-ikinci.txt" && echo "   ✓ ikinci uygulama yetkileri değiştirmedi" || kirmizi "ikinci uygulama yetkileri değiştirdi"
editor_ver $G/3-geri-al.sql "$CIK/geri-al-cikti.txt" && grep -q "geri alındı" "$CIK/geri-al-cikti.txt" && echo "   ✓ geri alma uygulandı" || { kirmizi "geri alma"; tail -3 "$CIK/geri-al-cikti.txt"; }
ozet > "$CIK/ozet-3-geri.txt"
if cmp -s "$CIK/ozet-0-once.txt" "$CIK/ozet-3-geri.txt"; then echo "   ✓ yetki / ayar özeti İLK hâlle birebir aynı ($(wc -l < "$CIK/ozet-0-once.txt") satır)"; else
  kirmizi "geri alma sonrası özet farklı"; diff "$CIK/ozet-0-once.txt" "$CIK/ozet-3-geri.txt" | head -10; fi
node $T/davranis.js "$DB" > "$CIK/davranis-geri.json" || kirmizi "batarya (geri) çalışmadı"
node $T/karsilastir.js "$CIK/davranis-once.json" "$CIK/davranis-geri.json" "$SIK" ayni | sed 's/^/   /'; [ "${PIPESTATUS[0]}" -eq 0 ] || HATA=1
editor_ver $G/3-geri-al.sql "$CIK/geri-al-2.txt" && grep -q "Geri alınacak" "$CIK/geri-al-2.txt" && echo "   ✓ ikinci geri alma: yapılacak bir şey yok" || kirmizi "ikinci geri alma"

echo "══ 7) geri almadan sonra yeniden sıkılaştırma"
editor_ver "$SIK" "$CIK/yeniden-cikti.txt" && grep -q "uygulandı" "$CIK/yeniden-cikti.txt" && echo "   ✓ yeniden uygulandı" || { kirmizi "yeniden sıkılaştırma"; tail -3 "$CIK/yeniden-cikti.txt"; }
ozet > "$CIK/ozet-4-yeniden.txt"; cmp -s "$CIK/ozet-1-sikilastir.txt" "$CIK/ozet-4-yeniden.txt" && echo "   ✓ sonuç ilk sıkılaştırmayla aynı" || { kirmizi "yeniden sıkılaştırma farklı"; diff "$CIK/ozet-1-sikilastir.txt" "$CIK/ozet-4-yeniden.txt" | head; }

[ $HATA -eq 0 ] && echo "── GÜVENLİK SINAMASI TEMİZ ──" || echo "── GÜVENLİK SINAMASINDA SORUN ──"
exit $HATA
