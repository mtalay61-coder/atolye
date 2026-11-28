#!/bin/bash
# 23 — YENİ FİRMA KURULUMU + VERİ AYRIMI (iki yalıtılmış "proje"). Yalnız yerel PostgreSQL; canlıya dokunmaz.
# Akış (yeni-firma-kurulum.md): ana proje (canlı benzeri atolye_guvenlik kopyası: v2 dahil, 23 uygulanmış, platform verisi ve ERP
# verisi var) → kurulum_betigi() ile kurulum dosyası → iki BOŞ Supabase taklidi projede (t23_firma_a, t23_firma_b) çalıştırılır.
# Beklenen (doğru hâl):
#   A) Kurulum dosyası VERİ taşımaz: platform firması, ödeme, platform yöneticisi, ana firmanın carisi dosyada geçmez.
#   B) Dosya Supabase SQL Editor'de çalışabilir (editor-icin.py denetimi) — rehber "SQL Editor › Run" diyor.
#   C) Dosya iki boş projede de hatasız çalışır.
#   D) Her firmada platform_ tabloları BOŞ doğar, 23 önkoşulu UYGULANMIŞ der (yapı birebir taşınmış), firmanın kendi Yönetici'si
#      platform yöneticisi değildir, kendini ekleyemez, platform tablolarında hiçbir şey göremez / yazamaz.
#   E) Veri ayrımı: A'ya yazılan cari B'de ve anada yok; B'ye yazılan A'da ve anada yok; ananın carisi firmalarda yok.
#      (Bir firmanın oturum jetonunun ötekinde geçersiz olması Supabase'in proje başına JWT anahtarıdır — yerelde sınanamaz.)
# TANI KİPİ T23_KURULUM=pgdump (17 Kasım): C geçti, D'de platform tablolarına anon / authenticated FAZLA yetki kaldı (boş projenin
# "yeni tablo herkese açık" varsayılanı; pg_dump kaynağa göre fark yazar) — 23 önkoşulu adıyla yakaladı, yazmayı RLS durdurdu.
# BİLİNEN DURUM (17 Kasım): kurulum betiği v2 geçişinden sonra bozuk — uygulamada düğmesi kapalı (src/032-firma.jsx, "v2'DEN SONRA
# DESTEKLENMİYOR"; DEVAM-NOTU: "kurulum betiği v2 için yeniden yazılmalı"). Bu test o işin KABUL TESTİDİR: bugün B ve C kırmızı,
# C düşünce D ve E ATLANIR (sahte yeşil yok). 23'ün bu akışa kattığı tek şey A ve (C düzelince) D'dir.
# Kullanım: ./test23-yeni-firma.sh   (T23_HOST / T23_PORT; postgres + authenticator şifresiz; atolye_guvenlik hazır — hazirla.sh)
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); G=$A/stok-v2/guvenlik
H=${T23_HOST:-localhost}; PT=${T23_PORT:-5432}; KAYNAK=${GUVENLIK_DB:-atolye_guvenlik}
PG="psql -X -q -h $H -p $PT -U postgres -v ON_ERROR_STOP=1"
IS=$(mktemp -d /tmp/t23-firma.XXXXXX); trap 'rm -rf "$IS"' EXIT
GECTI=0; KALDI=0; ATLANDI=0
sonuc() { if [ "$2" = "$3" ]; then GECTI=$((GECTI+1)); echo "  [GEÇTİ] $1 → $3"; else KALDI=$((KALDI+1)); echo "  [KALDI] $1 → beklenen: $2 · gelen: $3"; fi; }
atla() { ATLANDI=$((ATLANDI+1)); echo "  [ATLANDI] $1"; }
q() { $PG -d "$1" -Atc "$2"; }
editor() { python3 $A/stok-v2/editor-icin.py --bol "$2" | python3 -c '
import subprocess, sys
for p in [x for x in sys.stdin.buffer.read().split(b"\0") if x.strip()]:
    r = subprocess.run(sys.argv[1:] + ["-c", p.decode()], capture_output=True, text=True)
    sys.stdout.write(r.stdout); sys.stderr.write(r.stderr)
    if r.returncode: sys.exit(1)' psql -X -q -h $H -p $PT -U postgres -d "$1" -v ON_ERROR_STOP=1 -At -F '|'; }
api() { local out; out=$(psql -X -q -h $H -p $PT -U authenticator -d "$1" -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -At \
    -c "begin" -c "set local role authenticated" -c "select set_config('request.jwt.claims', '$2', true) is null" -c "$3" -c "commit" 2>&1)
  if [ $? -eq 0 ]; then echo "ok:$(echo "$out" | sed -n '2,$p' | grep -v '^COMMIT$' | tr '\n' ' ' | sed 's/ *$//')"; return; fi
  local hat; hat=$(echo "$out" | grep -m1 '^ERROR:')
  case "$hat" in "ERROR:  42501: permission denied"*) echo "ret:izin" ;; "ERROR:  42501: new row violates row-level security"*) echo "ret:rls" ;; *) echo "hata:${hat#ERROR:  }" ;; esac; }

U_PLAT=00000000-0000-0000-0000-0000000000a1; U_FA=00000000-0000-0000-0000-00000000fa01; U_FB=00000000-0000-0000-0000-00000000fb01
FA="{\"role\":\"authenticated\",\"sub\":\"$U_FA\",\"email\":\"ahmet@atolye.local\"}"
GIZLI_FIRMA='Gizli Musteri Unvani 7Q'; GIZLI_KOD='gizli-firma-7q'; GIZLI_CARI='AnaFirmaCarisi-9K'

for d in t23_ana t23_firma_a t23_firma_b; do $PG -d postgres -c "drop database if exists $d" 2>/dev/null; done
$PG -d postgres -c "create database t23_ana template $KAYNAK" >/dev/null || { echo "kurulum başarısız ($KAYNAK yok — hazirla.sh)"; exit 2; }
q t23_ana "create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text)" >/dev/null
editor t23_ana $G/23-platform-yonetim.sql >/dev/null || { echo "kurulum başarısız (23 anaya uygulanamadı)"; exit 2; }
$PG -d t23_ana -f $A/kurulum-betigi.sql >/dev/null || { echo "kurulum başarısız (kurulum-betigi.sql)"; exit 2; }
q t23_ana "insert into auth.users (id, email) values ('$U_PLAT', 'platform@ana.test');
  insert into public.platform_yoneticileri (kullanici, ad) values ('$U_PLAT', 'Platform yöneticisi');
  insert into public.platform_firmalar (kod, unvan, supabase_adres) values ('$GIZLI_KOD', '$GIZLI_FIRMA', 'https://gizliref1234.supabase.co');
  insert into public.platform_sozlesmeler (firma_id, baslangic, bitis, yillik_ucret, para_birimi) select id, '2026-12-01', '2027-11-30', 98765.43, 'USD' from public.platform_firmalar;
  insert into public.platform_odemeler (firma_id, sozlesme_id, tarih, tutar, para_birimi) select firma_id, id, '2026-12-05', 12345.67, 'USD' from public.platform_sozlesmeler;
  insert into public.cariler (id, unvan) values ('cari-anafirma-1', '$GIZLI_CARI')" >/dev/null
echo "== Ana proje: $KAYNAK kopyası (v2 dahil) + 23 + platform verisi + ERP carisi · $(git -C $A rev-parse --short HEAD) + çalışma ağacı"
sonuc "anada 23 önkoşulu" "UYGULANMIŞ" "$(editor t23_ana $G/23-onkosul-salt-okur.sql | grep '^99|' | cut -d'|' -f3)"
# T23_KURULUM=pgdump (TANI): kurulum dosyası yerine ananın public yapısının pg_dump kopyası (veri yok, sahip yok, yetkiler var).
# Amaç yalnız D / E denetimlerinin kendisini sınamak ve kurulum yolunun yeniden yazımı için aday yöntemi denemek; kabul ölçütü
# kurulum_betigi() yoludur.
if [ "${T23_KURULUM:-}" = pgdump ]; then
  echo "   TANI KİPİ: kurulum dosyası = pg_dump --schema-only --schema=public --no-owner (kurulum_betigi DEĞİL)"
  pg_dump -h $H -p $PT -U postgres -d t23_ana --schema-only --schema=public --no-owner > $IS/kurulum.sql
else
  q t23_ana "select public.kurulum_betigi()" > $IS/kurulum.sql
fi
echo "   kurulum dosyası: $(wc -l < $IS/kurulum.sql) satır"

echo "== A) Kurulum dosyası veri taşımaz"
for x in "$GIZLI_FIRMA" "$GIZLI_KOD" "gizliref1234" "98765.43" "12345.67" "$U_PLAT" "$GIZLI_CARI"; do
  sonuc "dosyada '$x' geçmez" "0" "$(grep -cF "$x" $IS/kurulum.sql)"
done
sonuc "dosyada üst düzey insert / copy ifadesi yok (fonksiyon gövdeleri girintili, sayılmaz)" "0" "$(grep -ciE '^(insert into|copy )' $IS/kurulum.sql)"
sonuc "dosya platform_ YAPISINI taşır (5 tablo)" "5" "$(grep -cE '^create table if not exists public\.platform_' $IS/kurulum.sql)"

echo "== B) Supabase SQL Editor uyumu (rehber: SQL Editor › Run)"
sonuc "editor-icin.py denetimi" "uygun" "$(python3 $A/stok-v2/editor-icin.py --bol $IS/kurulum.sql >/dev/null 2>$IS/uyum.txt && echo uygun || sed 's/^.*: //' $IS/uyum.txt | head -1)"

echo "== C) İki boş projede çalıştırma (psql, tek işlem — dosya begin / commit taşır)"
sed -n '1,/ERP tablolarının en küçük/p' $A/stok-v2/test/guvenlik/t19/kur.sql | grep -v 'ERP tablolarının' > $IS/taban.sql
C_TAMAM=1
for f in a b; do
  $PG -d postgres -c "create database t23_firma_$f" >/dev/null
  PGOPTIONS='-c client_min_messages=warning' $PG -d t23_firma_$f -f $IS/taban.sql >/dev/null 2>&1
  [ "${T23_KURULUM:-}" = pgdump ] && sed -i '/^CREATE SCHEMA public;$/d; /^ALTER SCHEMA public OWNER/d' $IS/kurulum.sql
  hata=$(PGOPTIONS='-c client_min_messages=warning' $PG -d t23_firma_$f -f $IS/kurulum.sql 2>&1 >/dev/null | grep -m1 'ERROR:' | sed 's/^psql:[^ ]* //')
  sonuc "firma $f: kurulum dosyası hatasız" "" "$hata"; [ -n "$hata" ] && C_TAMAM=0
done

echo "== D) Her firmada platform_ tabloları boş ve kapalı"
if [ $C_TAMAM = 1 ]; then
  for f in a b; do
    sonuc "firma $f: 23 önkoşulu (yapı birebir)" "UYGULANMIŞ" "$(editor t23_firma_$f $G/23-onkosul-salt-okur.sql | grep '^99|' | cut -d'|' -f3)"
    sonuc "firma $f: platform tabloları boş (yönetici / firma / sözleşme / ödeme / olay)" "0 0 0 0 0" "$(q t23_firma_$f "select (select count(*) from public.platform_yoneticileri) || ' ' || (select count(*) from public.platform_firmalar) || ' ' || (select count(*) from public.platform_sozlesmeler) || ' ' || (select count(*) from public.platform_odemeler) || ' ' || (select count(*) from public.platform_olaylar)")"
  done
  q t23_firma_a "insert into auth.users (id, email) values ('$U_FA', 'ahmet@atolye.local');
    insert into public.tanimlar (id, veri) values ('tekil', jsonb_build_object('girisAktifMi', true, 'kullanicilar', jsonb_build_array(jsonb_build_object(
      'id', 'kullanici-ilk', 'ad', 'Ahmet', 'kullaniciAdi', 'ahmet', 'rol', 'Yönetici', 'eposta', 'ahmet@atolye.local', 'bulutHesabi', true)))) on conflict (id) do nothing" >/dev/null
  sonuc "firma a Yönetici'si platform yöneticisi değil" "ok:f" "$(api t23_firma_a "$FA" "select public.platform_yonetici_mi()")"
  sonuc "firma a Yönetici'si kendini platform yöneticisi yapamaz" "ret:izin" "$(api t23_firma_a "$FA" "insert into public.platform_yoneticileri (kullanici) values (auth.uid())")"
  sonuc "firma a Yönetici'si platform firması ekleyemez" "ret:rls" "$(api t23_firma_a "$FA" "insert into public.platform_firmalar (kod, unvan) values ('sizma', 'Sızma')")"
  echo "== E) Veri ayrımı"
  q t23_firma_a "insert into public.cariler (id, unvan) values ('cari-firmaa-1', 'A Firmasinin Carisi')" >/dev/null
  sonuc "A'nın carisi A'da" "1" "$(q t23_firma_a "select count(*) from public.cariler where unvan = 'A Firmasinin Carisi'")"
  sonuc "A'nın carisi B'de yok" "0" "$(q t23_firma_b "select count(*) from public.cariler where unvan = 'A Firmasinin Carisi'")"
  sonuc "A'nın carisi anada yok" "0" "$(q t23_ana "select count(*) from public.cariler where unvan = 'A Firmasinin Carisi'")"
  sonuc "ananın carisi A ve B'de yok" "0 0" "$(q t23_firma_a "select count(*) from public.cariler where unvan = '$GIZLI_CARI'") $(q t23_firma_b "select count(*) from public.cariler where unvan = '$GIZLI_CARI'")"
  q t23_firma_b "insert into public.cariler (id, unvan) values ('cari-firmab-1', 'B Firmasinin Carisi')" >/dev/null
  sonuc "B'nin carisi A'da ve anada yok" "0 0" "$(q t23_firma_a "select count(*) from public.cariler where unvan = 'B Firmasinin Carisi'") $(q t23_ana "select count(*) from public.cariler where unvan = 'B Firmasinin Carisi'")"
  # NOT: "A'nın oturum jetonu B'de geçersiz" burada sınanamaz — her Supabase projesinin JWT imza anahtarı ayrı, A'nın jetonu B'nin
  # ağ geçidinde reddedilir (veritabanına hiç ulaşmaz). Yerel taklit imza denetlemez; o yüzden bu yönde bir denetim YAZILMADI.
else
  for x in "firma a/b: 23 önkoşulu" "firma a/b: platform tabloları boş" "firma Yönetici'si platform yöneticisi değil / ekleyemez" "E) veri ayrımı (5 denetim)"; do
    atla "$x — C başarısız (kurulum dosyası boş projede çalışmıyor)"
  done
fi

for d in t23_ana t23_firma_a t23_firma_b; do $PG -d postgres -c "drop database if exists $d" >/dev/null 2>&1; done
echo "── test23-yeni-firma: $GECTI geçti, $KALDI kaldı, $ATLANDI atlandı ──"; [ $KALDI = 0 ] && [ $ATLANDI = 0 ]
