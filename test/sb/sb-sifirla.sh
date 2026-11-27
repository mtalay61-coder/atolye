#!/usr/bin/env bash
# YEREL SUPABASE — VERİYİ SIFIRLA + PAKET DURUMU (27 Kasım). Yalnız `supabase start` ile bu makinede çalışan yerel yığın (127.0.0.1:54322).
# Buluttaki hiçbir projeye bağlanmaz. Kullanım: sb-sifirla.sh paketli|paketsiz
#   1. public şemasındaki bütün tablolar boşaltılır, test/sb/tohum-veri.sql yüklenir (şirket verisi YOK: Ekran Bot, İnceleme Müşteri, Ali / Ayşe)
#   2. paketli: canlı için hazırlanan DÖRT kurulum dosyası AYNEN (27, 28, 29, 31) postgres rolüyle; paketsiz: dört geri alma dosyası
#   3. PostgREST şema belleği yenilenir
set -euo pipefail
K=$(cd "$(dirname "$0")/../.." && pwd); G=$K/stok-v2/guvenlik
export PGPASSWORD=${SB_PAROLA:-postgres}
YON="postgresql://supabase_admin@127.0.0.1:54322/postgres"; PG="postgresql://postgres@127.0.0.1:54322/postgres"
psql -X -q "$YON" -v ON_ERROR_STOP=1 <<SQL >/dev/null
set session_replication_role = replica;
do \$\$ declare t text; begin
  select string_agg(format('public.%I', relname), ', ') into t from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r';
  execute 'truncate ' || t || ' cascade';
end \$\$;
\i $K/test/sb/tohum-veri.sql
SQL
son() { psql -X -A -t "$PG" -v ON_ERROR_STOP=1 -f "$G/$1" 2>/dev/null | tail -1; }
if [ "${1:-paketli}" = paketli ]; then for x in 27-b4-uygula 28-b3a-uygula 29-b3a2-uygula 31-yetki-ileti-uygula; do echo "$x → $(son $x.sql)"; done
else for x in 31-yetki-ileti-geri-al 29-b3a2-geri-al 28-b3a-geri-al 27-b4-geri-al; do echo "$x → $(son $x.sql)"; done; fi
psql -X -q "$YON" -c "notify pgrst, 'reload schema'" >/dev/null
sleep 2
