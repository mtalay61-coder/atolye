#!/bin/bash
# FAZ 2 (23) UYGULAMA PAKETİ — YEREL PROVA. Yalnız yerel PostgreSQL; canlıya dokunmaz.
# Kaynak: canlı benzeri ana (T23F2_KAYNAK; varsayılan atolye_canli — #363'teki t24/canli-benzeri.sh; yoksa atolye_guvenlik:
# kos-guvenlik.sh sonrası, A6 UYGULANMIŞ). Paket sırası birebir (stok-v2/guvenlik/23-FAZ2-PAKET.md), Editor gibi:
#   ÖNCE  23-onkosul-salt-okur.sql → HAZIR · 24-a6-onkosul-salt-okur.sql → UYGULANMIŞ · 23-faz2-kontrol-salt-okur.sql (imza)
#   UYGULA 23-platform-yonetim.sql (sha256 pakette)
#   SONRA 23-onkosul → UYGULANMIŞ · kontrol: platform_ tabloları 0, A6 UYGULANMIŞ, A6 imzası ÖNCE ile birebir
#   GERİ DÖNÜŞ koşulları: firma / sözleşme / ödeme kaydı varken geri alma DURUR (hiçbir şey silinmez); yalnız yönetici listesi
#   doluyken geri alma listeyi ve (boş) olay günlüğünü KALDIRIR — olay günlüğü firmaya bağlı, firma yoksa olay da olamaz;
#   geri alma sonrası 23 HAZIR, A6 imzası aynı.
# Kullanım: ./test23-faz2.sh   (PGHOST / PGPORT / PGUSER; postgres şifresiz)
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); G=$A/stok-v2/guvenlik
KAYNAK=${T23F2_KAYNAK:-atolye_canli}; DB=t23_faz2
psql -X -At -d postgres -c "select 1 from pg_database where datname = '$KAYNAK'" | grep -q 1 || KAYNAK=atolye_guvenlik
GECTI=0; KALDI=0
sonuc() { if [ "$2" = "$3" ]; then GECTI=$((GECTI+1)); echo "  [GEÇTİ] $1 → $3"; else KALDI=$((KALDI+1)); echo "  [KALDI] $1 → beklenen: $2 · gelen: $3"; fi; }
q() { psql -X -q -v ON_ERROR_STOP=1 -d $DB -Atc "$1"; }
editor() { python3 $A/stok-v2/editor-icin.py --bol "$1" | python3 -c '
import subprocess, sys
for p in [x for x in sys.stdin.buffer.read().split(b"\0") if x.strip()]:
    r = subprocess.run(sys.argv[1:] + ["-c", p.decode()], capture_output=True, text=True)
    sys.stdout.write(r.stdout); sys.stderr.write(r.stderr)
    if r.returncode: sys.exit(1)' psql -X -q -d $DB -v ON_ERROR_STOP=1 -At -F '|'; }
g23() { editor $G/23-onkosul-salt-okur.sql | awk -F'|' '$1=="99"{print $3}'; }
ga6() { editor $G/24-a6-onkosul-salt-okur.sql | awk -F'|' '$1=="99"{print $3}'; }
k() { editor $G/23-faz2-kontrol-salt-okur.sql; }
sayilar() { echo "$1" | awk -F'|' '$1>=1 && $1<=5 {printf "%s ", $3}' | sed 's/ $//'; }
satir() { echo "$1" | awk -F'|' -v s="$2" '$1==s{print $3}'; }

psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB template $KAYNAK" > /dev/null || { echo "kurulum başarısız ($KAYNAK)"; exit 2; }
# Supabase'te auth.users hep var (23'ün platform_yoneticileri'si ona bağlı); yerel taklitte yok → t24'teki gibi kurulur
q "create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text)" > /dev/null
echo "== $DB: $KAYNAK kopyası · $(git -C $A rev-parse --short HEAD) + çalışma ağacı"
sonuc "kontrol dosyası SQL Editor kuralına uygun" "0" "$(python3 $A/stok-v2/editor-icin.py $G/23-faz2-kontrol-salt-okur.sql > /dev/null 2>&1; echo $?)"

echo "== ÖNCE"
sonuc "23 önkoşulu" "HAZIR" "$(g23)"
sonuc "A6 önkoşulu" "UYGULANMIŞ" "$(ga6)"
ONCE=$(k)
sonuc "kontrol: platform_ tabloları" "yok yok yok yok yok" "$(sayilar "$ONCE")"
sonuc "kontrol: A6 durumu" "UYGULANMIŞ" "$(satir "$ONCE" 6)"
IMZA=$(satir "$ONCE" 10)
echo "   A6 imzası (önce): $IMZA"

echo "== UYGULA (23-platform-yonetim.sql, Editor gibi)"
editor $G/23-platform-yonetim.sql > /dev/null 2> /tmp/t23f2.hata; sonuc "uygulama hatasız" "" "$(grep -m1 ERROR /tmp/t23f2.hata)"

echo "== SONRA"
sonuc "23 önkoşulu" "UYGULANMIŞ" "$(g23)"
SONRA=$(k)
sonuc "kontrol: platform_ tabloları boş (yönetici, firma, sözleşme, ödeme, olay)" "0 0 0 0 0" "$(sayilar "$SONRA")"
sonuc "kontrol: A6 durumu" "UYGULANMIŞ" "$(satir "$SONRA" 6)"
sonuc "A6 imzası önceyle birebir (fonksiyon tanımları, yetkileri, tetikleyici)" "$IMZA" "$(satir "$SONRA" 10)"
sonuc "A6 imza satırları 7–9 önceyle birebir" "$(echo "$ONCE" | awk -F'|' '$1>=7 && $1<=9')" "$(echo "$SONRA" | awk -F'|' '$1>=7 && $1<=9')"
sonuc "ikinci uygulama hiçbir şeye dokunmadan durur" "1" "$(editor $G/23-platform-yonetim.sql 2>&1 | grep -c 'DUR')"

echo "== GERİ DÖNÜŞ koşulları"
q "insert into public.platform_firmalar (kod, unvan) values ('f2-sinama', 'Sinama')" > /dev/null
sonuc "firma kaydı varken geri alma DURUR" "1" "$(editor $G/23-platform-yonetim-geri-al.sql 2>&1 | grep -c 'DUR: platform tablolarında')"
sonuc "durduktan sonra 23 hâlâ UYGULANMIŞ (hiçbir şey silinmedi)" "UYGULANMIŞ" "$(g23)"
sonuc "durduktan sonra firma ve olay kaydı yerinde (firma 1, olay ≥ 1)" "1 true" "$(q "select (select count(*) from public.platform_firmalar) || ' ' || ((select count(*) from public.platform_olaylar) >= 1)::text")"
q "alter table public.platform_firmalar disable trigger user; delete from public.platform_olaylar; delete from public.platform_firmalar;
   alter table public.platform_firmalar enable trigger user" > /dev/null
# olay günlüğü firmaya bağlı (firma_id zorunlu, firma silinemez) → firma yokken olay da olamaz; yalnız yönetici listesi dolu kalabilir
q "insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000f2a1', 'f2-yonetici@ornek.invalid') on conflict do nothing;
   insert into public.platform_yoneticileri (kullanici, ad) values ('00000000-0000-4000-8000-00000000f2a1', 'Sinama yöneticisi')" > /dev/null
sonuc "yönetici listesinde 1 kayıt" "1" "$(q "select count(*) from public.platform_yoneticileri")"
sonuc "yalnız yönetici listesi doluyken geri alma DURMAZ (listeyi ve olay günlüğünü kaldırır)" "tamam — platform_ nesnesi kalmadı" "$(editor $G/23-platform-yonetim-geri-al.sql 2>&1 | tail -1)"
sonuc "geri alma sonrası 23 önkoşulu" "HAZIR" "$(g23)"
sonuc "geri alma sonrası A6 imzası değişmedi" "$IMZA" "$(satir "$(k)" 10)"
sonuc "geri alma sonrası A6" "UYGULANMIŞ" "$(ga6)"

[ -n "${T23F2_TUT:-}" ] || psql -X -q -d postgres -c "drop database if exists $DB" > /dev/null 2>&1
rm -f /tmp/t23f2.hata
echo "── test23-faz2: $GECTI geçti, $KALDI kaldı ──"; [ $KALDI = 0 ]
