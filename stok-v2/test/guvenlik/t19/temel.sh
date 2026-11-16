#!/bin/bash
# Yalıtılmış test veritabanını sıfırdan kurar: taklit + depodaki site-portal / rls-rol / rls-kimlik (canlıdaki açık durum).
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); H=${T19_HOST:-localhost}; PT=${T19_PORT:-5432}; DB=${1:-t19}; KIMLIK=${2:-$A/rls-kimlik.sql}; KIMLIK=${KIMLIK:-$A/rls-kimlik.sql}; SITE=${3:-$A/site-portal.sql}
P="psql -X -q -h $H -p $PT -U postgres -v ON_ERROR_STOP=1"
$P -d postgres -c "drop database if exists $DB" -c "create database $DB" 2>/dev/null
$P -d $DB -f $T/kur.sql >/dev/null
PGOPTIONS='-c check_function_bodies=off -c client_min_messages=warning' $P -d $DB -f $SITE >/dev/null
PGOPTIONS='-c client_min_messages=warning' $P -d $DB -f $A/rls-rol.sql >/dev/null
PGOPTIONS='-c client_min_messages=warning' $P -d $DB -f $KIMLIK >/dev/null
