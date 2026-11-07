#!/usr/bin/env bash
# YEDEK BETİKLERİ SINAMASI (4 Kasım). Yalnız YEREL test sunucusu (PGHOST=localhost); Supabase'e bağlanmaz.
# Kaynak: atolye_guvenlik'in kopyası + Supabase benzeri auth / storage şemaları (sahte satırlar, gerçek veri yok).
# Hedefler: yeni bir Supabase projesi gibi — supabase-taklit.sql (auth.jwt/uid, roller), extensions.pgcrypto, boş auth/storage.
# Kahin:
#   DÖKÜM   depo içine yazmayı reddeder; hatada yarım dosyaları siler (YARIM-KALDI); başarıda ozet'te kimlik ÖZETİ var.
#   KORUMA  canlı proje kimliği (küçük / BÜYÜK harf, kullanıcı ya da host'ta) → DUR, bağlanmadan; hedef = kaynak → DUR;
#           dolu hedef → DUR ve kaynak envanteri DEĞİŞMEZ.
#   HATA    pg_restore ilk hatada durur, tek işlem: hedefte tablo 0 kalır, envanter adımı çalışmaz, çıkış 1, ozet BAŞARISIZ;
#           auth adımında hata → çıkış 1, auth satırı 0 (geri alındı).
#   MUTLU   boş hedefe yükleme → envanter AYNI, çıkış 0.
#   GİZLİ   hiçbir çıktı dosyasında kullanıcı adı ve parola geçmez.
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
cd "$(dirname "$0")"; Y=$(cd ../../yedek && pwd)
KUL=yedek_dnm_kullanici; export PGPASSWORD='GizliDeneme-7Q!x'
IS=$(mktemp -d /tmp/yedek-sinama.XXXXXX); trap 'rm -rf "$IS"' EXIT
hata=0; k() { if [ "$2" = "$3" ]; then echo "  ✓ [$1] $2"; else echo "  ✗ [$1] $2 · beklenen $3"; hata=$((hata + 1)); fi; }
p() { psql -X -q -At -U postgres "$@"; }

p -d postgres -c "drop database if exists yedek_kaynak" -c "drop database if exists yedek_prova" -c "drop database if exists yedek_prova2" \
  -c "drop role if exists $KUL" -c "create role $KUL login superuser password '$PGPASSWORD'"
p -d postgres -c "create database yedek_kaynak template atolye_guvenlik"
SUPA="create schema if not exists auth; create table if not exists auth.users (id uuid primary key, email text);
  create table if not exists auth.schema_migrations (version text primary key);
  create schema if not exists storage; create table if not exists storage.buckets (id text primary key);
  create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text, metadata jsonb);
  create table if not exists storage.migrations (id int primary key);
  insert into auth.schema_migrations values ('20240101') on conflict do nothing; insert into storage.migrations values (1) on conflict do nothing;"
p -d yedek_kaynak -c "$SUPA" -c "insert into auth.users values (gen_random_uuid(), 'a@deneme.local'), (gen_random_uuid(), 'b@deneme.local');
  insert into storage.buckets values ('gorseller'); insert into storage.objects (bucket_id, name, metadata) values ('gorseller', 'x.png', '{\"size\":123}');"
for d in yedek_prova yedek_prova2; do p -d postgres -c "create database $d owner $KUL"; p -d $d -f ../supabase-taklit.sql -c "$SUPA" \
  -c "create schema if not exists extensions; create extension if not exists pgcrypto schema extensions"; done  # yeni Supabase projesi gibi
ORT=(KAYNAK_HOST=localhost KAYNAK_PORT="${PGPORT:-5432}" KAYNAK_KULLANICI=$KUL KAYNAK_DB=yedek_kaynak)
echo "t-yedek-betikleri · kaynak yedek_kaynak (atolye_guvenlik kopyası + sahte auth/storage)"

# DÖKÜM
env "${ORT[@]}" "$Y/dokum-al.sh" "$(pwd)/.yedek-deneme" > /dev/null 2>&1; k "DOKUM.depo-icine-red" "$?" 2
rm -rf "$(pwd)/.yedek-deneme"
env KAYNAK_HOST=localhost KAYNAK_PORT="${PGPORT:-5432}" KAYNAK_KULLANICI=$KUL KAYNAK_DB=yok_boyle_db "$Y/dokum-al.sh" "$IS/bozuk" > /dev/null 2>&1; r=$?
k "DOKUM.hata-cikis" "$([ $r -ne 0 ] && echo sifirdan-farkli)" sifirdan-farkli
k "DOKUM.hata-yarim-dosya-yok" "$(ls "$IS/bozuk" | tr '\n' ' ')" "YARIM-KALDI.txt "
env "${ORT[@]}" "$Y/dokum-al.sh" "$IS/d" > "$IS/dokum-ekran.txt" 2>&1; k "DOKUM.basari" "$?" 0
k "DOKUM.dosyalar" "$(ls "$IS/d" | tr '\n' ' ')" "auth-storage.sql envanter-kaynak.csv ozet.txt public.dump "
k "DOKUM.ozet-kimlik-ozeti" "$(grep -c '^kaynak kimliği (özet): [0-9a-f]\{16\}$' "$IS/d/ozet.txt")" 1
env "${ORT[@]}" "$Y/dokum-al.sh" "$IS/d" > /dev/null 2>&1; k "DOKUM.dolu-klasore-yazmaz" "$?" 2

# KORUMA (bağlanmadan durmalı: var olmayan host'la da aynı DUR mesajı)
pr() { env PROVA_ONAY=PROVA "$@" "$Y/prova-geri-yukle.sh" "$IS/d" > "$IS/son.txt" 2>&1; echo $?; }
k "KORUMA.canli-kullanici" "$(pr PROVA_HOST=yok.ornek PROVA_KULLANICI=postgres.mqdgucoomgqcvhvgixbl)" 2
k "KORUMA.canli-mesaj" "$(grep -c 'CANLI' "$IS/son.txt")" 1
k "KORUMA.canli-host-buyuk-harf" "$(pr PROVA_HOST=db.MQDGUCOOMGQCVHVGIXBL.supabase.co PROVA_KULLANICI=postgres)" 2
k "KORUMA.hedef-kaynakla-ayni" "$(pr PROVA_HOST=localhost PROVA_PORT="${PGPORT:-5432}" PROVA_KULLANICI=$KUL PROVA_DB=yedek_kaynak)" 2
k "KORUMA.ayni-mesaj" "$(grep -c 'dökümün ALINDIĞI' "$IS/son.txt")" 1
once=$(psql -X -q --csv -U postgres -d yedek_kaynak -f ../../guvenlik/8-yedek-envanter-salt-okur.sql | grep -v 'envanter zamanı' | md5sum)
k "KORUMA.dolu-hedef (127.0.0.1 ile aynı kaynak)" "$(pr PROVA_HOST=127.0.0.1 PROVA_PORT="${PGPORT:-5432}" PROVA_KULLANICI=$KUL PROVA_DB=yedek_kaynak)" 2
k "KORUMA.dolu-mesaj" "$(grep -c 'tablo var' "$IS/son.txt")" 1
sonra=$(psql -X -q --csv -U postgres -d yedek_kaynak -f ../../guvenlik/8-yedek-envanter-salt-okur.sql | grep -v 'envanter zamanı' | md5sum)
k "KORUMA.kaynak-degismedi" "$([ "$once" = "$sonra" ] && echo ayni)" ayni

# HATA — public adımında çakışan nesne: ilk hatada dur, tek işlem geri alınır
ilk=$(p -d yedek_kaynak -c "select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f' and pg_get_function_identity_arguments(p.oid) = '' order by 1 limit 1")
p -d yedek_prova2 -c "create function public.$ilk() returns int language sql as 'select 1'"
k "HATA.public-cikis" "$(pr PROVA_HOST=localhost PROVA_PORT="${PGPORT:-5432}" PROVA_KULLANICI=$KUL PROVA_DB=yedek_prova2)" 1
k "HATA.public-ozet-basarisiz" "$(grep -c "BAŞARISIZ — 'public şeması'" "$IS/son.txt")" 1
k "HATA.public-hata-planlanan-nesnede" "$(grep -c "function $ilk() already exists\|function \"$ilk\" already exists" "$IS/son.txt")" 1
k "HATA.public-hedefte-tablo-0" "$(p -d yedek_prova2 -c "select count(*) from pg_tables where schemaname = 'public'")" 0
k "HATA.envanter-adimi-calismadi" "$(ls "$IS"/d/prova-*/envanter-prova.csv 2>/dev/null | wc -l)" 0
# HATA — auth adımı: hedefte auth.users yok → public yüklenir ama auth adımı durur, auth satırı yok, çıkış 1
p -d yedek_prova2 -c "drop function public.$ilk()" -c "drop table auth.users"
k "HATA.auth-cikis" "$(pr PROVA_HOST=localhost PROVA_PORT="${PGPORT:-5432}" PROVA_KULLANICI=$KUL PROVA_DB=yedek_prova2)" 1
k "HATA.auth-adiminda-durdu" "$(grep -c "BAŞARISIZ — 'auth + storage satırları'" "$IS/son.txt")" 1
k "HATA.auth-oncesi-public-yuklendi" "$([ "$(p -d yedek_prova2 -c "select count(*) from pg_tables where schemaname = 'public'")" -gt 0 ] && echo evet)" evet
k "HATA.auth-storage-geri-alindi" "$(p -d yedek_prova2 -c "select count(*) from storage.objects")" 0
k "HATA.auth-envanter-yok" "$(ls "$IS"/d/prova-*/envanter-prova.csv 2>/dev/null | wc -l)" 0

# MUTLU
k "MUTLU.cikis" "$(pr PROVA_HOST=localhost PROVA_PORT="${PGPORT:-5432}" PROVA_KULLANICI=$KUL PROVA_DB=yedek_prova)" 0
k "MUTLU.envanter-AYNI" "$(grep -c 'SONUÇ: envanter AYNI' "$IS/son.txt")" 1
k "MUTLU.auth-users" "$(p -d yedek_prova -c "select count(*) from auth.users")" 2
k "MUTLU.migrations-cakismadi" "$(p -d yedek_prova -c "select count(*) from auth.schema_migrations")" 1

# GİZLİ — bütün çıktı dosyalarında ve ekranda kullanıcı adı / parola yok
k "GIZLI.parola-hicbir-yerde" "$(grep -rlaF "$PGPASSWORD" "$IS" | wc -l)" 0
k "GIZLI.kullanici-dosyalarda" "$(grep -rlaF "$KUL" "$IS/d" | wc -l)" 0
k "GIZLI.kullanici-ekranda" "$(grep -laF "$KUL" "$IS/son.txt" "$IS/dokum-ekran.txt" | wc -l)" 0
# bağlantı hatası (rol yok) ekrana gizlenerek düşer: kullanıcı adı yerine <hedef-kullanici>
k "GIZLI.baglanti-hatasi-cikis" "$(pr PROVA_HOST=localhost PROVA_PORT="${PGPORT:-5432}" PROVA_KULLANICI=${KUL}_yok PROVA_DB=yedek_prova)" 2
k "GIZLI.baglanti-hatasi-gizli" "$(grep -caF "${KUL}_yok" "$IS/son.txt"):$(grep -caF '<hedef-kullanici>' "$IS/son.txt")" "0:1"

p -d postgres -c "drop database yedek_kaynak" -c "drop database yedek_prova" -c "drop database yedek_prova2" -c "drop role $KUL"
echo "── t-yedek-betikleri.sh: $([ $hata = 0 ] && echo temiz || echo "$hata kırmızı") ──"; exit $([ $hata = 0 ] && echo 0 || echo 1)
