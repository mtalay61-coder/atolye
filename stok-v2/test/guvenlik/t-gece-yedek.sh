#!/usr/bin/env bash
# GECE YEDEĞİ SINAMASI (7 Kasım). Yalnız YEREL test sunucusu (PGHOST=localhost); Supabase'e ve OneDrive'a bağlanmaz.
# Kaynak: atolye_guvenlik'in kopyası + Supabase benzeri auth / storage (sahte satırlar) + Supabase'te görülebilecek bağımlılıklar:
#   public tablodan auth.users'a yabancı anahtar, public şemasında uzantı (pg_trgm) ve ona bağlı dizin, extensions'ta uuid-ossp,
#   realtime yayını (supabase_realtime). Hedef: BOŞ, ayrı veritabanı (iş akışındaki geçici "postgres" hizmeti gibi).
# OneDrive yerine sahte-rclone (yerel klasör). Kahin:
#   MUTLU      çıkış 0; TAMAM.txt; uzakta <tarih> klasörü yereldekiyle bayt bayt aynı; anlık görüntü "var".
#   YARIŞ      döküm sürerken canlıya sürekli satır yazılıyor → yine AYNI (envanter ve döküm aynı anı görür). Anlık görüntü
#              olmadan aynı yarış sağlam yedeği FARKLI gösteriyordu (elle denendi: canlı 44 satır, yedek 46).
#   ANLIKSIZ   anlık görüntü desteklenmezse eski yol çökmeden çalışır.
#   FARK       sınama veritabanında bir satır eksikse (kanca) → çıkış 1, BASARISIZ.txt, uzakta "-SINANMADI" klasörü, kayıtta fark sayısı.
#   DOLU       hedefte tablo varsa → çıkış 1, hedefe hiçbir şey yüklenmez.
#   YÜKLEME    kopyalama hatası → çıkış 1; OneDrive'daki kopya bozuksa (check) → çıkış 1.
#   SAKLAMA    30 günden eski klasörler silinir, en yeni 7 her zaman kalır; az klasörde hiçbiri silinmez.
#   KORUMA     hedef localhost değilse bağlanmadan DUR (2).
#   KAYIT      iş kaydında (stdout) parola, müşteri değeri, envanter satırı yok.
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
cd "$(dirname "$0")"; Y=$(cd ../../yedek && pwd); BURASI=$(pwd)
IS=$(mktemp -d /tmp/gece-sinama.XXXXXX); trap 'rm -rf "$IS"; kill $(jobs -p) 2>/dev/null' EXIT
mkdir -p "$IS/bin"; cp "$BURASI/sahte-rclone" "$IS/bin/rclone"; chmod +x "$IS/bin/rclone"
hata=0; k() { if [ "$2" = "$3" ]; then echo "  ✓ [$1] $2"; else echo "  ✗ [$1] $2 · beklenen $3"; hata=$((hata + 1)); fi; }
p() { psql -X -q -At -v ON_ERROR_STOP=1 -U postgres "$@"; }
MUSTERI='Musteri-Degeri-7Q1'; PAROLA='Parola-Gizli-9Z3'

p -d postgres -c "drop database if exists gece_kaynak" -c "drop database if exists gece_hedef"
p -d postgres -c "create database gece_kaynak template atolye_guvenlik"
p -d gece_kaynak -c "create schema if not exists auth; create table auth.users (id uuid primary key, email text);
  create table auth.schema_migrations (version text primary key); insert into auth.schema_migrations values ('20240101');
  create schema if not exists storage; create table storage.buckets (id text primary key);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text, metadata jsonb);
  create table storage.migrations (id int primary key); insert into storage.migrations values (1);
  insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'a@deneme.local'), ('00000000-0000-0000-0000-00000000000b', 'b@deneme.local');
  insert into storage.buckets values ('gorseller'); insert into storage.objects (bucket_id, name, metadata) values ('gorseller', 'x.png', '{\"size\":123}');
  create extension if not exists pg_trgm schema public; create extension if not exists \"uuid-ossp\" schema extensions;
  create table public.gy_profil (id uuid primary key references auth.users, ad text, kod uuid default extensions.uuid_generate_v4());
  insert into public.gy_profil (id, ad) values ('00000000-0000-0000-0000-00000000000a', '$MUSTERI');
  create index gy_profil_ad on public.gy_profil using gin (ad public.gin_trgm_ops);
  create table public.gy_yazi (id bigserial primary key, t timestamptz default now());
  create publication supabase_realtime; alter publication supabase_realtime add table public.gy_profil;"
yeni_hedef() { p -d postgres -c "drop database if exists gece_hedef" -c "create database gece_hedef template template0"; }
ORT=(PATH="$IS/bin:$PATH" PGPASSWORD="$PAROLA" KAYNAK_HOST=localhost KAYNAK_PORT="${PGPORT:-5432}" KAYNAK_KULLANICI=postgres KAYNAK_DB=gece_kaynak
     HEDEF_HOST=localhost HEDEF_PORT="${PGPORT:-5432}" HEDEF_DB=gece_hedef SAHTE_UZAK="$IS/uzak" UZAK="onedrive:AtolyeYedek")
calis() { local ad=$1; shift; env "${ORT[@]}" CALISMA="$IS/c-$ad" "$@" "$Y/gece-yedek.sh" > "$IS/log-$ad.txt" 2>&1; echo $?; }
son_klasor() { local d; d=$(ls "$IS/c-$1" 2>/dev/null | grep -E '^20[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{4}$' | tail -1); [ -n "$d" ] && echo "$IS/c-$1/$d"; }
echo "t-gece-yedek · kaynak gece_kaynak (atolye_guvenlik + auth/storage + FK/uzantı/yayın) · hedef gece_hedef (boş)"

# MUTLU
yeni_hedef
k "MUTLU.cikis" "$(calis mutlu)" 0
K=$(son_klasor mutlu); AD=$(basename "$K")
k "MUTLU.TAMAM" "$(ls "$K" | grep -cx 'TAMAM.txt'):$(ls "$K" | grep -c BASARISIZ)" "1:0"
k "MUTLU.sonuc-satiri" "$(grep -c '^SONUÇ: TAMAM' "$K/TAMAM.txt")" 1
k "MUTLU.anlik-goruntu" "$(grep -c '^anlık görüntü: var' "$K/ozet.txt")" 1
k "MUTLU.uzakta-ayni" "$(diff -r "$K" "$IS/uzak/AtolyeYedek/$AD" > /dev/null && echo ayni)" ayni
k "MUTLU.hedefte-musteri-satiri" "$(p -d gece_hedef -c "select count(*) from public.gy_profil where ad = '$MUSTERI'")" 1
k "MUTLU.FK-auth-users" "$(p -d gece_hedef -c "select count(*) from pg_constraint where conrelid = 'public.gy_profil'::regclass and contype = 'f'")" 1
k "MUTLU.yayin" "$(p -d gece_hedef -c "select count(*) from pg_publication_tables where pubname = 'supabase_realtime'")" 1
k "MUTLU.kayit-sinama-tamam" "$(grep -c 'SINAMA TAMAM' "$IS/log-mutlu.txt")" 1
k "MUTLU.kayit-yuklendi-dogrulandi" "$(grep -c 'yüklendi ve doğrulandı' "$IS/log-mutlu.txt")" 1

# YARIŞ — döküm boyunca canlıya saniyede ~20 satır
yeni_hedef
( for i in $(seq 1 4000); do p -d gece_kaynak -c "insert into public.gy_yazi default values" 2>/dev/null; done ) & YAZAR=$!
sleep 0.5
k "YARIS.cikis" "$(calis yaris)" 0
kill $YAZAR 2>/dev/null; wait $YAZAR 2>/dev/null
K=$(son_klasor yaris)
k "YARIS.kaynak-yazildi" "$([ "$(p -d gece_kaynak -c 'select count(*) from public.gy_yazi')" -gt "$(grep '^tablo,gy_yazi,' "$K/envanter-kaynak.csv" | cut -d, -f3)" ] && echo evet)" evet
k "YARIS.envanter-AYNI" "$(grep -c '^AYNI' "$K/karsilastirma.txt")" 1

# ANLIKSIZ — bağlantı anlık görüntüyü desteklemezse eski yol (envanter ve döküm ayrı anlarda) çökmeden çalışır; yazma yokken AYNI
yeni_hedef
k "ANLIKSIZ.cikis" "$(calis anliksiz DOKUM_ANLIK=0)" 0
k "ANLIKSIZ.ozet" "$(grep -c '^anlık görüntü: yok' "$(son_klasor anliksiz)/ozet.txt")" 1

# FARK — sınama veritabanında bir satır eksik (kanca yalnız sınamada): kahin farkı yakalamalı
yeni_hedef
k "FARK.cikis" "$(calis fark SINAMA_KANCASI="delete from public.gy_yazi where id = (select min(id) from public.gy_yazi)")" 1
K=$(son_klasor fark); AD=$(basename "$K")
k "FARK.BASARISIZ" "$(ls "$K" | grep -cx 'BASARISIZ.txt'):$(ls "$K" | grep -c TAMAM)" "1:0"
k "FARK.karsilastirma-satiri" "$(grep -c '^[<>] tablo | gy_yazi' "$K/karsilastirma.txt")" 2
k "FARK.uzakta-SINANMADI" "$([ -f "$IS/uzak/AtolyeYedek/$AD-SINANMADI/BASARISIZ.txt" ] && echo var)" var
k "FARK.kayitta-sayi" "$(grep -c 'SINAMA BAŞARISIZ.*2 farklı envanter satırı' "$IS/log-fark.txt")" 1
k "FARK.kayitta-tablo-adi-yok" "$(grep -c 'gy_yazi' "$IS/log-fark.txt")" 0

# DOLU hedef
yeni_hedef; p -d gece_hedef -c "create table public.baska (x int)"
k "DOLU.cikis" "$(calis dolu)" 1
k "DOLU.adim" "$(grep -c "hedef boş değil (1 tablo)" "$IS/log-dolu.txt")" 1
k "DOLU.hedefe-yuklenmedi" "$(p -d gece_hedef -c "select count(*) from pg_tables where schemaname = 'public'")" 1

# YÜKLEME
yeni_hedef
k "YUKLEME.kopya-hatasi-cikis" "$(calis yhata SAHTE_COPY_HATA=1)" 1
k "YUKLEME.kopya-hatasi-kayit" "$(grep -c 'YÜKLEME BAŞARISIZ (kopyalama)' "$IS/log-yhata.txt")" 1
yeni_hedef
k "YUKLEME.bozuk-kopya-cikis" "$(calis ybozuk SAHTE_BOZ=1)" 1
k "YUKLEME.bozuk-kopya-kayit" "$(grep -c 'YÜKLEME BAŞARISIZ (doğrulama' "$IS/log-ybozuk.txt")" 1

# SAKLAMA — 3 eski (40/35/31 gün) + 9 yeni (+ bu koşunun klasörü)
rm -rf "$IS/uzak"; mkdir -p "$IS/uzak/AtolyeYedek/Notlar"
for g in 40 35 31 9 8 7 6 5 4 3 2 1; do mkdir -p "$IS/uzak/AtolyeYedek/$(date -d "-$g days" +%Y-%m-%d)-0317"; done
mkdir -p "$IS/uzak/AtolyeYedek/$(date -d '-50 days' +%Y-%m-%d)-0317-SINANMADI"
yeni_hedef
k "SAKLAMA.cikis" "$(calis saklama)" 0
k "SAKLAMA.eskiler-silindi" "$(ls "$IS/uzak/AtolyeYedek" | grep -cE "^($(date -d '-40 days' +%F)|$(date -d '-35 days' +%F)|$(date -d '-31 days' +%F)|$(date -d '-50 days' +%F))")" 0
k "SAKLAMA.yeniler-kaldi" "$(ls "$IS/uzak/AtolyeYedek" | grep -cE '^[0-9]{4}-')" 10
k "SAKLAMA.baska-klasore-dokunmaz" "$([ -d "$IS/uzak/AtolyeYedek/Notlar" ] && echo var)" var
rm -rf "$IS/uzak"; mkdir -p "$IS/uzak/AtolyeYedek"
for g in 60 50 45 40 35; do mkdir -p "$IS/uzak/AtolyeYedek/$(date -d "-$g days" +%Y-%m-%d)-0317"; done
yeni_hedef
k "SAKLAMA.az-klasor-cikis" "$(calis saklama2)" 0
k "SAKLAMA.az-klasorde-silinmez (5 eski + 1 yeni ≤ 7)" "$(ls "$IS/uzak/AtolyeYedek" | wc -l)" 6

# KORUMA
k "KORUMA.uzak-hedef" "$(calis koruma HEDEF_HOST=db.ornek.supabase.co)" 2
k "KORUMA.mesaj" "$(grep -c 'yalnız localhost' "$IS/log-koruma.txt")" 1

# KAYIT — iş kaydında gizli / müşteri / envanter içeriği yok
k "KAYIT.parola-yok" "$(cat "$IS"/log-*.txt | grep -cF "$PAROLA")" 0
k "KAYIT.musteri-degeri-yok" "$(cat "$IS"/log-*.txt | grep -cF "$MUSTERI")" 0
k "KAYIT.envanter-satiri-yok" "$(cat "$IS"/log-*.txt | grep -cE '^(tablo|fonksiyon|auth|storage),')" 0

p -d postgres -c "drop database gece_kaynak" -c "drop database gece_hedef"
echo "── t-gece-yedek.sh: $([ $hata = 0 ] && echo temiz || echo "$hata kırmızı") ──"; exit $([ $hata = 0 ] && echo 0 || echo 1)
