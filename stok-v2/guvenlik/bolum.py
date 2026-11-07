#!/usr/bin/env python3
# 1-liste-salt-okur.sql'den N. bölümü (tek SELECT) ayıklar — yerel test koşucusu bölümleri ayrı ayrı çalıştırır (Editor'daki gibi).
import sys, re
s = open(sys.argv[1], encoding="utf-8").read()
parcalar = re.split(r"\n-- -{50,}\n-- BÖLÜM ", s)
print("-- BÖLÜM " + parcalar[int(sys.argv[2])])
