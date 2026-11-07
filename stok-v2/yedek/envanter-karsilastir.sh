#!/usr/bin/env bash
# İki envanter CSV'sini (8-yedek-envanter-salt-okur.sql, psql --csv) karşılaştırır. Yalnız karsilastir = t satırları;
# zaman damgası, boyut, sunucu sürümü gibi doğal olarak değişen satırlar (karsilastir = f) atlanır.
# Çıktı: farklı / eksik satırlar (yalnız sayı ve özet — envanter kişisel veri içermez). Çıkış 0 = aynı, 1 = fark var.
# Not: ayrı Supabase projesinde "uzantılar" satırı farklı çıkabilir (projede başka uzantılar açık) — farkı okuyup açıklayın.
set -euo pipefail
[ $# -eq 2 ] || { echo "Kullanım: $0 <kaynak.csv> <prova.csv>"; exit 2; }
secc() { python3 -c '
import csv, sys
for r in csv.DictReader(open(sys.argv[1], encoding="utf-8")):
    if r["karsilastir"] in ("t", "true"): print(" | ".join((r["bolum"], r["ad"], r["deger"])))
' "$1" | sort; }
fark=$(diff <(secc "$1") <(secc "$2") || true)
toplam=$(secc "$1" | wc -l)
if [ -z "$fark" ]; then echo "AYNI: $toplam karşılaştırılan satırın hepsi eşit."; exit 0; fi
echo "FARK ( < kaynak, > prova ):"; echo "$fark" | grep -E '^[<>]'; exit 1
