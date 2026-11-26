#!/usr/bin/env python3
# CANLI YETKİ HİZALAMA (27 Kasım, inceleme 25 B3). 25-canli-tam-yapi-salt-okur.sql CSV'sinden YEREL test tabanı için SQL üretir:
# public tablo / görünümlerin anon + authenticated yetkileri (tam kümeyle: önce hepsi alınır, sonra canlıdakiler verilir), RLS bayrakları,
# public politikaları (canlıdaki ad / komut / roller / using / check ile), canlıda olup yerelde EKSİK tetikleyiciler (fonksiyonu yerelde
# varsa; yoksa uyarı) ve stk_ayar değerleri. YALNIZ YEREL: canlıya hiçbir şey göndermez. test/inceleme/yerel-uyum.sql'in yetki
# varsayımlarının yerine geçer (auth.uid uyumu köprü için ayrıca gerekir).
# Kullanım: python3 -I canli-yetki-hizala.py <canlı-25.csv> > hizala.sql   (sonra: psql -d <yerel> -f hizala.sql)
import csv, json, sys, re
csv.field_size_limit(1 << 30)

def q(ad): return '"' + ad.replace('"', '""') + '"'

def main(yol):
    satirlar = list(csv.DictReader(open(yol, newline="", encoding="utf-8-sig")))
    tur = lambda t: [r for r in satirlar if r["tur"] == t]
    out = ["-- ÜRETİLDİ: canli-yetki-hizala.py — yalnız yerel test tabanı", "set client_min_messages = warning;"]
    tablolar = {}
    for r in tur("tablo"):
        m = re.match(r"(\w) rls=(\w+)/(\w+)", r["tanim"])
        tablolar[r["ad"]] = (m.group(1), m.group(2) == "true", m.group(3) == "true")
    # 1. yetkiler (tablo + görünüm)
    for r in tur("tablo yetkisi"):
        t, rol = r["ad"].rsplit(".", 1)
        out.append(f"do $$ begin if to_regclass('public.{q(t)}') is not null then execute 'revoke all on public.{q(t)} from {rol}'; "
                   + (f"execute 'grant {r['tanim']} on public.{q(t)} to {rol}'; " if r["tanim"] else "") + "end if; end $$;")
    # 2. RLS
    for t, (kind, rls, force) in tablolar.items():
        if kind not in ("r", "p"): continue
        out.append(f"do $$ begin if to_regclass('public.{q(t)}') is not null then execute 'alter table public.{q(t)} "
                   + ("enable" if rls else "disable") + " row level security'; end if; end $$;")
    # 3. politikalar: public tablolarda yereldekileri kaldır, canlıdakileri kur
    out.append("do $$ declare p record; begin for p in select tablename, policyname from pg_policies where schemaname = 'public' loop "
               "execute format('drop policy %I on public.%I', p.policyname, p.tablename); end loop; end $$;")
    for r in tur("politika"):
        sema, t, ad = r["ad"].split(".", 2)
        if sema != "public": continue
        m = re.match(r"(\w+) (\w+) roller=(\S*) using=(.*) check=(.*)$", r["tanim"], re.S)
        if not m: out.append(f"-- UYARI: politika çözülemedi: {r['ad']}"); continue
        cmd, perm, roller, using, check = m.groups()
        roller = ", ".join(x if x == "public" else q(x) for x in roller.split(",") if x)
        govde = f"create policy {q(ad)} on public.{q(t)} as {perm.lower()} for {cmd.lower()} to {roller}"
        if using != "-": govde += f" using ({using})"
        if check != "-": govde += f" with check ({check})"
        out.append(f"do $$ begin if to_regclass('public.{q(t)}') is not null then execute {sqlmetin(govde)}; end if; end $$;")
    # 4. canlıda olup yerelde eksik tetikleyiciler (yalnız public)
    for r in tur("tetikleyici"):
        sema, t, ad = r["ad"].split(".", 2)
        if sema != "public": continue
        tanim = re.sub(r" etkin=\w+$", "", r["tanim"])
        fn = re.search(r"EXECUTE FUNCTION ([\w.]+)\(", tanim)
        # varlık denetimi İÇ İÇE: tablo yoksa ::regclass dönüşümü hiç değerlendirilmesin
        out.append(f"do $$ begin if to_regclass('public.{q(t)}') is not null then if not exists (select 1 from pg_trigger where tgrelid = to_regclass('public.{q(t)}') and tgname = {sqlmetin(ad)}) then "
                   + f"if exists (select 1 from pg_proc where proname = {sqlmetin(fn.group(1).split('.')[-1])}) then execute {sqlmetin(tanim)}; "
                   + f"else raise warning 'tetikleyici kurulamadı (fonksiyon yerelde yok): %', {sqlmetin(r['ad'])}; end if; end if; "
                   + f"else raise warning 'tablo yerelde yok: %', {sqlmetin(t)}; end if; end $$;")
    # 5. stk_ayar
    ayar = json.loads(tur("ayar")[0]["tanim"])[0]
    atlanan = {"id"}
    setler = []
    for k, v in ayar.items():
        if k in atlanan: continue
        if isinstance(v, list): setler.append(f"{q(k)} = array[{', '.join(sqlmetin(x) for x in v)}]::text[]")
        elif v is None: setler.append(f"{q(k)} = null")
        elif isinstance(v, bool): setler.append(f"{q(k)} = {'true' if v else 'false'}")
        else: setler.append(f"{q(k)} = {sqlmetin(str(v))}")
    out.append(f"set session_replication_role = replica; update public.stk_ayar set {', '.join(setler)} where id = 'tekil'; set session_replication_role = origin;")
    print("\n".join(out))

def sqlmetin(s): return "'" + str(s).replace("'", "''") + "'"

if __name__ == "__main__":
    main(sys.argv[1])
