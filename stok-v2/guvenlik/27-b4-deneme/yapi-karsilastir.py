#!/usr/bin/env python3
# YAPI KARŞILAŞTIRMA (30 Kasım): iki "25-canli-tam-yapi-salt-okur.sql" CSV'sini (tur, ad, tanim) karşılaştırır — ör. yeni deneme
# projesinin dökümü ↔ kaynak (canlı 25 CSV'si ya da yerel hizalı kopya). Çıktı: türe göre yalnız A'da / yalnız B'de / farklı sayıları ve
# satırları. Ham CSV'ler depoya konmaz. Kullanım: yapi-karsilastir.py <A.csv> <B.csv> [--ayrinti]
import csv, sys
csv.field_size_limit(10**9)
def oku(p):
    r = list(csv.reader(open(p, encoding="utf-8", newline="")))
    return {(x[0], x[1]): x[2] for x in r[1:] if len(x) >= 3 and x[0] != "OZET"}
a, b = oku(sys.argv[1]), oku(sys.argv[2])
ayrinti = "--ayrinti" in sys.argv
turler = sorted({k[0] for k in a} | {k[0] for k in b})
toplam = [0, 0, 0]
print(f"A: {sys.argv[1]} ({len(a)} satır) · B: {sys.argv[2]} ({len(b)} satır)")
for t in turler:
    ya = sorted(k for k in a if k[0] == t and k not in b); yb = sorted(k for k in b if k[0] == t and k not in a)
    f = sorted(k for k in a if k[0] == t and k in b and a[k] != b[k])
    n = sum(1 for k in a if k[0] == t)
    toplam[0] += len(ya); toplam[1] += len(yb); toplam[2] += len(f)
    if not (ya or yb or f):
        print(f"  = {t}: {n} satır AYNI"); continue
    print(f"  ≠ {t}: A'da {n} · yalnız A {len(ya)} · yalnız B {len(yb)} · farklı {len(f)}")
    if ayrinti:
        for k in ya[:12]: print(f"      yalnız A: {k[1]} → {a[k][:110]}")
        for k in yb[:12]: print(f"      yalnız B: {k[1]} → {b[k][:110]}")
        for k in f[:12]: print(f"      farklı: {k[1]}\n         A: {a[k][:150]}\n         B: {b[k][:150]}")
print(f"TOPLAM: yalnız A {toplam[0]} · yalnız B {toplam[1]} · farklı {toplam[2]}")
