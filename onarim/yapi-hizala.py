#!/usr/bin/env python3
# YEREL PROVA ŞEMASINI CANLI YAPI CSV'SİNE HİZALAMA (26 Kasım). Yalnız YEREL sınama içindir; canlıda çalıştırılmaz.
# Kullanım: yapi-hizala.py <canlı-yapı.csv> <yerel-yapı.csv> > hizala.sql
#   CSV'ler onarim/canli-yapi-salt-okur.sql'in çıktısı (canlıdan Editor › Export → CSV; yerelden psql --csv).
# Üretir: kapsamdaki 13 tablonun sütun (ekle / tür / varsayılan / boş olamaz / kaldır), kısıt (ekle / doğrula), tetikleyici (ekle)
#   farkları ve FARKLI her tetikleyici fonksiyonunun canlıdaki TAM metni (satır sonları dahil: canlıda \r\n var). Tür değişikliğine
#   engel olan yerel görünümler saklanıp kaldırılır ve aynı tanımla yeniden kurulur (bu görünümler kapsam DIŞI — canlıyla eşitliği
#   bu araç sağlamaz). Sonra canli-yapi-salt-okur.sql yerelde yeniden çalıştırılır: OZET canlıyla aynı olmalı.
import csv, re, sys

def oku(y): return {(r["tur"], r["ad"]): r["tanim"] for r in csv.DictReader(open(y, encoding="utf-8", newline="")) if r["tur"] != "OZET"}
C, L = oku(sys.argv[1]), oku(sys.argv[2])
def parca(t):
    m = re.match(r"^(.*?)( not null)?( default (.*))?$", t, re.S); return m.group(1), bool(m.group(2)), m.group(4)
o = ["set check_function_bodies = off;",
     "create temp table gor_yedek as select c.relname, pg_get_viewdef(c.oid) as tanim from pg_class c",
     "  where c.relnamespace = 'public'::regnamespace and c.relkind = 'v' and c.relname <> 'stk_stok';",
     "do 'declare r record; begin for r in select relname from gor_yedek loop execute format(''drop view if exists public.%I cascade'', r.relname); end loop; end';"]
for k, v in C.items():
    if k[0] != "sütun": continue
    t, s = k[1].split(".", 1); tip, nn, df = parca(v)
    if k not in L:
        o.append(f'alter table public.{t} add column "{s}" {tip}' + (f" default {df}" if df else "") + (" not null" if nn else "") + ";"); continue
    if L[k] == v: continue
    lt, lnn, ldf = parca(L[k])
    if lt != tip: o.append(f'alter table public.{t} alter column "{s}" drop default; alter table public.{t} alter column "{s}" type {tip} using nullif("{s}"::text, \'\')::{tip};')
    if df != ldf or lt != tip: o.append(f'alter table public.{t} alter column "{s}" ' + (f"set default {df};" if df else "drop default;"))
    if nn != lnn: o.append(f'alter table public.{t} alter column "{s}" ' + ("set not null;" if nn else "drop not null;"))
for k in L:
    if k[0] == "sütun" and k not in C:
        t, s = k[1].split(".", 1); o.append(f'alter table public.{t} drop column "{s}";')
for k, v in C.items():
    if k[0] != "kısıt": continue
    t, a = k[1].split(".", 1); tanim = v.rsplit(" gecerli=", 1)[0]
    if k not in L: o.append(f"alter table public.{t} add constraint {a} {tanim};")
    elif L[k] != v and "NOT VALID" in L[k]: o.append(f"alter table public.{t} validate constraint {a};")
for k, v in C.items():
    if k[0] == "tetikleyici fonksiyonu" and L.get(k) != v: o.append(v.rstrip("\n") + ";")
for k, v in C.items():
    if k[0] == "tetikleyici" and k not in L: o.append(v.rsplit(" etkin=", 1)[0] + ";")
o.append("""do 'declare r record; kalan int; tur int := 0; begin loop kalan := 0;
  for r in select * from gor_yedek g where to_regclass(''public.'' || g.relname) is null loop
    begin execute format(''create view public.%I as %s'', r.relname, r.tanim); exception when others then kalan := kalan + 1; end;
  end loop; tur := tur + 1; exit when kalan = 0 or tur > 10; end loop;
  if kalan > 0 then raise exception ''görünüm yeniden kurulamadı: %'', kalan; end if; end';""")
sys.stdout.write("\n".join(o) + "\n")
