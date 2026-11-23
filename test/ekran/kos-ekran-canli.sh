#!/usr/bin/env bash
# EKRAN SINAMASI — CANLI BENZERİ HİZALANMIŞ KOPYADA (23 Kasım). Yalnız yerel PostgreSQL; Supabase'e BAĞLANMAZ, canlıya dokunmaz.
# Kullanıcı: "Son 21 kontrollük ekran testini, A6 ve canlıda uygulanmış güvenlik paketlerini içeren yerel kopyada tekrarla. Fiş
# kuralları ve sürüm kapısını canlıdaki durumla aynı ayarla."
#   1. ÖN KOŞUL: atolye_guvenlik SIKILAŞTIRILMIŞ (stok-v2/test/guvenlik/kos-guvenlik.sh). Bu dalın kaynakları A6'yı içerir
#      (rls-rol.sql, rls-yazma.sql, 15-duzeltme.sql — #364).
#   2. CANLI HİZALAMA: Faz 0.4 betiği `canli-benzeri.sh` + canlı envanteri (20 Kasım) + envanter sorgusu, #362 dalından
#      (HIZALAMA_DALI) git'ten okunur — kopyalanmaz, tek kaynak orada. Bu dalın rls-yazma.sql / gun-sonu.sql'iyle çalışır →
#      atolye_canli; "beklenmeyen fark 0" değilse DUR.
#   3. A6: 24-a6-onkosul-salt-okur.sql → UYGULANMIŞ; 23-faz2-kontrol-salt-okur.sql satır 6 UYGULANMIŞ, satır 9 (tetikleyici) canlı
#      kaydıyla (t23/sonuc-faz2-once-canli-2026-11-20.txt) aynı. Satır 7–8 pg_get_functiondef biçimi yüzünden yerelde farklıdır
#      (kayıtta belgelenmiş); fonksiyon GÖVDELERİ envanterin F satırlarında (normalize md5) canlıyla karşılaştırılır.
#   4. kos-ekran.sh EKRAN_KAYNAK=atolye_canli (12 geri alınır, sema-tamamla + kurulum) → ekran veritabanında envanter YENİDEN
#      karşılaştırılır (test kurulumu koruma nesnelerini değiştirmemeli) → testler.
# Ayar: EKRAN_FIS_KURAL (kapali|acik), EKRAN_SURUM_KAPISI (boş|X.Y.Z) — canlı durumu: 5-surum-durum-salt-okur.sql'in ilk satırı.
# Gerekli: PGHOST=localhost, KOPRU_PG (node pg modülü), ISTEMCI_DIZIN (vars. bu çalışma ağacı).
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
cd "$(dirname "$0")/../.."
KOK=$(pwd)
DAL=${HIZALAMA_DALI:-origin/claude/yeni-firma-kurulum-v2}
T=$(mktemp -d /tmp/ekran-canli.XXXXXX); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/stok-v2/test/guvenlik/t24" "$T/stok-v2/test/guvenlik/t23" "$T/stok-v2/guvenlik"
for f in stok-v2/test/guvenlik/t24/canli-benzeri.sh stok-v2/test/guvenlik/t24/sonuc-faz04-envanter-canli-2026-11-20.txt \
         stok-v2/guvenlik/24-faz04-koruma-envanteri-salt-okur.sql stok-v2/guvenlik/23-faz2-kontrol-salt-okur.sql \
         stok-v2/test/guvenlik/t23/sonuc-faz2-once-canli-2026-11-20.txt; do
  git show "$DAL:$f" > "$T/$f" || { echo "DUR: $DAL içinde $f yok"; exit 2; }
done
ln -s "$KOK/rls-yazma.sql" "$T/rls-yazma.sql"; ln -s "$KOK/gun-sonu.sql" "$T/gun-sonu.sql"
echo "hizalama kaynağı: $DAL $(git rev-parse --short "$DAL") · canli-benzeri.sh sha256 $(sha256sum "$T/stok-v2/test/guvenlik/t24/canli-benzeri.sh" | cut -c1-12)"
bash "$T/stok-v2/test/guvenlik/t24/canli-benzeri.sh" || { echo "DUR: canlı hizalama temiz değil"; exit 2; }

# A6
a6=$(psql -X -At -F '|' -d atolye_canli -f stok-v2/guvenlik/24-a6-onkosul-salt-okur.sql | awk -F'|' '$1 == "99" {print $3}')
echo "A6 önkoşul (24-a6-onkosul-salt-okur.sql) GENEL: $a6"
[ "$a6" = "UYGULANMIŞ" ] || { echo "DUR: A6 uygulanmış değil"; exit 2; }
k=$(psql -X -At -F '|' -d atolye_canli -f "$T/stok-v2/guvenlik/23-faz2-kontrol-salt-okur.sql")
s6=$(echo "$k" | awk -F'|' '$1 == "6" {print $3}'); s9=$(echo "$k" | awk -F'|' '$1 == "9" {print $3}')
c9=$(grep -E '^9  \| ' "$T/stok-v2/test/guvenlik/t23/sonuc-faz2-once-canli-2026-11-20.txt" | sed 's/^9  | //')
echo "A6 imzası: durum $s6 · tetikleyici yerel [$s9] canlı [$c9]"
[ "$s6" = "UYGULANMIŞ" ] && [ "$s9" = "$c9" ] || { echo "DUR: A6 imzası canlıyla uyuşmuyor"; exit 2; }
for fn in 'yetki_var_mi(' 'tanimlar_kullanici_koruma(' 'stk_yetki(' 'fis_kes(' 'kas_yaz('; do
  c=$(grep -F "F|$fn" "$T/stok-v2/test/guvenlik/t24/sonuc-faz04-envanter-canli-2026-11-20.txt" | cut -d'|' -f3 | cut -d' ' -f1)
  y=$(psql -X -At -F '|' -d atolye_canli -f "$T/stok-v2/guvenlik/24-faz04-koruma-envanteri-salt-okur.sql" | grep -F "F|$fn" | cut -d'|' -f3 | cut -d' ' -f1)
  echo "  gövde md5 ${fn%(}: yerel $y · canlı $c $([ "$c" = "$y" ] && echo ✓ || echo ✗)"
  [ "$c" = "$y" ] || { echo "DUR: ${fn%(} gövdesi canlıdan farklı"; exit 2; }
done

# Ekran veritabanı + yeniden karşılaştırma (canli-benzeri.sh'ın karşılaştırma bölümü, DB=atolye_ekran ve hizalama adımları olmadan)
export EKRAN_KAYNAK=atolye_canli EKRAN_CANLI_HIZALI=1 EKRAN_TESTLER=${EKRAN_TESTLER:-ekran-cari-virman} ISTEMCI_DIZIN=${ISTEMCI_DIZIN:-$KOK}
DB=${EKRAN_DB:-atolye_ekran}
EKRAN_TESTLER=yok bash test/ekran/kos-ekran.sh | grep -v "^── kos-ekran" || exit 2
psql -X -At -F '|' -d "$DB" -f "$T/stok-v2/guvenlik/24-faz04-koruma-envanteri-salt-okur.sql" > "$T/ekran.txt" || exit 2
python3 - "$T/stok-v2/test/guvenlik/t24/sonuc-faz04-envanter-canli-2026-11-20.txt" "$T/ekran.txt" <<'PY' || { echo "DUR: ekran veritabanı canlı envanterinden saptı"; exit 2; }
import sys, re
def oku(p):
    d = {}
    for l in open(p, encoding="utf-8"):
        if l.startswith("#") or l.startswith("Z|") or not l.strip(): continue
        b, n, v = l.rstrip("\n").split("|", 2); d[(b, n)] = v
    return d
c, y = oku(sys.argv[1]), oku(sys.argv[2])
ESKI = {"cek_gorselleri", "cekler", "cop", "hesaplar", "icerik", "medya", "onaylar", "profil"}
def bilinen(b, n):
    if b == "R": return n in ESKI
    if b == "T":
        t, ad = n.split(".", 1); return t in ESKI or re.fullmatch(r"[a-z_]+_surum", ad) is not None
    if b == "F": return n in ("guncelleme_yaz()", "surum_arttir()")
    return False
# stk_ayar özeti (S) ekran ayarıyla değişir (fiş kuralı / sürüm kapısı burada bilerek ayarlanır) — ayrı yazılır, fark sayılmaz
fark = [(k, c.get(k), y.get(k)) for k in sorted(set(c) | set(y)) if c.get(k) != y.get(k) and not (k in c and k not in y and bilinen(*k)) and k[0] != "S"]
print(f"ekran veritabanı ({sys.argv[2].split('/')[-1]}): {sum(1 for k in c if k in y and c[k] == y[k])} satır canlıyla aynı · beklenmeyen fark {len(fark)}")
for (b, n), cv, yv in fark: print(f"  [FARK] {b} {n}\n     canlı: {cv}\n     yerel: {yv}")
sys.exit(1 if fark else 0)
PY
echo "fiş kuralları: $(psql -X -At -d "$DB" -c "select case when public.fis_kural_aktif() then 'AÇIK' else 'KAPALI' end") · sürüm kapısı: $(psql -X -At -d "$DB" -c "select coalesce(min_istemci_surum, 'KAPALI') from public.stk_ayar")"
hata=0
for t in $EKRAN_TESTLER; do
  [ -f "test/ekran/$t.js" ] || continue
  EKRAN_DB=$DB EKRAN_TABLO=${EKRAN_CIKTI:-/tmp}/$t.json node test/ekran/$t.js || hata=$((hata + 1))
done
echo "── kos-ekran-canli: $([ $hata = 0 ] && echo TEMİZ || echo "$hata test kırmızı") ──"
exit $([ $hata = 0 ] && echo 0 || echo 1)
