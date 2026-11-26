#!/usr/bin/env python3
# CANLI TAM HİZALAMA (27 Kasım, inceleme 25). 25 (yapı) + 25b (fonksiyon / görünüm gövdeleri) CSV'lerinden ve yerel tabanın kendi 25 çıktısından,
# YEREL test tabanını canlının public şemasına hizalayan SQL üretir. YALNIZ YEREL: canlıya hiçbir şey göndermez; üretilen SQL de canlıda
# çalıştırılmaz (yıkıcıdır: yerelde olup canlıda olmayan tablo / sütun / fonksiyonu KALDIRIR).
# Kapsam: public tablolar (oluştur / kaldır), sütunlar (ekle / kaldır / tür / varsayılan / boş olamaz), kısıtlar, indeksler, fonksiyonlar
# (canlı metniyle birebir; \r\n korunur), tetikleyiciler, görünümler (security_invoker seçeneğiyle, bağımlılık sırasıyla), sonra
# canli-yetki-hizala.py (yetki, RLS, politika, stk_ayar). Her adım kendi bloğunda: hata olursa UYARI yazar, sonraki adıma geçer — sonuç
# yeniden 25 ile ölçülür (hizalama "temiz" sayılmaz, ölçülür).
# Kapsam dışı (ortam): auth / storage / cron şemaları, roller, uzantılar, olay tetikleyicileri, kova, varsayılan yetkiler.
# Kullanım: python3 -I canli-tam-hizala.py <canlı-25.csv> <canlı-25b.csv> <yerel-25.csv> > hizala.sql
import csv, sys, re, subprocess, os
csv.field_size_limit(1 << 30)

def oku(p): return list(csv.DictReader(open(p, newline="", encoding="utf-8-sig")))
def q(ad): return '"' + ad.replace('"', '""') + '"'
def m(s): return "'" + str(s).replace("'", "''") + "'"
def blok(sql, etiket):
    # hata yakalayan blok: dolar tırnaklı gövde içinde EXECUTE metni (iç içe dolar yok)
    return f"do $$ begin execute {m(sql)}; exception when others then raise warning 'HİZALAMA [{etiket.replace(chr(39), '')}]: %', sqlerrm; end $$;"

def main(c25, c25b, y25):
    C, B, Y = oku(c25), oku(c25b), oku(y25)
    t = lambda R, tur: [r for r in R if r["tur"] == tur]
    out = ["-- ÜRETİLDİ: canli-tam-hizala.py — YALNIZ YEREL test tabanı (yıkıcı)", "set client_min_messages = warning;", "set check_function_bodies = off;"]
    ctab = {r["ad"]: r["tanim"] for r in t(C, "tablo")}
    ytab = {r["ad"]: r["tanim"] for r in t(Y, "tablo")}
    kind = lambda s: s.split(" ", 1)[0]
    # 1. bütün public görünümleri kaldır (sonda canlı tanımıyla yeniden)
    out.append("do $$ declare v record; begin for v in select viewname from pg_views where schemaname = 'public' loop "
               "execute format('drop view if exists public.%I cascade', v.viewname); end loop; end $$;")
    # 2. tablolar
    csut = {}
    for r in t(C, "sütun"):
        tb, sut = r["ad"].split(".", 1); csut.setdefault(tb, {})[sut] = r["tanim"]
    ysut = {}
    for r in t(Y, "sütun"):
        tb, sut = r["ad"].split(".", 1); ysut.setdefault(tb, {})[sut] = r["tanim"]
    def sutun_tanimi(s):
        mm = re.match(r"(.+?)( not null)?( default (.*))?$", s)
        tip = mm.group(1); nn = bool(mm.group(2)); df = mm.group(4)
        tip = {"ARRAY": "text[]", "USER-DEFINED": "text", "timestamp with time zone": "timestamptz"}.get(tip, tip)
        return tip, nn, df
    for tb, kd in ytab.items():
        if kind(kd) in ("r", "p") and (tb not in ctab or kind(ctab[tb]) not in ("r", "p")):
            out.append(blok(f"drop table if exists public.{q(tb)} cascade", f"tablo kaldır {tb}"))
    for tb, kd in ctab.items():
        if kind(kd) not in ("r", "p"): continue
        if tb in ytab and kind(ytab[tb]) in ("r", "p"): continue
        cols = []
        for sut, s in sorted(csut.get(tb, {}).items()):
            tip, nn, df = sutun_tanimi(s)
            cols.append(f"{q(sut)} {tip}" + (f" default {df}" if df and "nextval" not in df else "") + (" not null" if nn and not (df and "nextval" in df) else ""))
            if df and "nextval" in df: cols[-1] = f"{q(sut)} bigserial"
        out.append(blok(f"create table public.{q(tb)} ({', '.join(cols)})", f"tablo oluştur {tb}"))
    # 3. sütunlar (iki tarafta da tablo olanlar)
    for tb, kd in ctab.items():
        if kind(kd) not in ("r", "p") or tb not in ytab or kind(ytab[tb]) not in ("r", "p"): continue
        cs, ys = csut.get(tb, {}), ysut.get(tb, {})
        for sut in sorted(set(ys) - set(cs)):
            out.append(blok(f"alter table public.{q(tb)} drop column {q(sut)} cascade", f"sütun kaldır {tb}.{sut}"))
        for sut in sorted(set(cs) - set(ys)):
            tip, nn, df = sutun_tanimi(cs[sut])
            out.append(blok(f"alter table public.{q(tb)} add column {q(sut)} {tip}" + (f" default {df}" if df else ""), f"sütun ekle {tb}.{sut}"))
            if nn: out.append(blok(f"alter table public.{q(tb)} alter column {q(sut)} set not null", f"boş olamaz {tb}.{sut}"))
        for sut in sorted(set(cs) & set(ys)):
            if cs[sut] == ys[sut]: continue
            ct, cn, cd = sutun_tanimi(cs[sut]); yt, yn, yd = sutun_tanimi(ys[sut])
            if ct != yt:
                out.append(blok(f"alter table public.{q(tb)} alter column {q(sut)} drop default", f"varsayılan {tb}.{sut}"))
                out.append(blok(f"alter table public.{q(tb)} alter column {q(sut)} type {ct} using nullif({q(sut)}::text, '''')::{ct}"
                                if ct not in ("text",) else f"alter table public.{q(tb)} alter column {q(sut)} type {ct} using {q(sut)}::text", f"tür {tb}.{sut}"))
            if cd != yd or ct != yt:
                out.append(blok(f"alter table public.{q(tb)} alter column {q(sut)} " + (f"set default {cd}" if cd else "drop default"), f"varsayılan {tb}.{sut}"))
            if cn != yn:
                out.append(blok(f"alter table public.{q(tb)} alter column {q(sut)} " + ("set not null" if cn else "drop not null"), f"boş olamaz {tb}.{sut}"))
    # 4. kısıtlar
    ckis = {r["ad"]: r["tanim"] for r in t(C, "kısıt")}; ykis = {r["ad"]: r["tanim"] for r in t(Y, "kısıt")}
    for ad in sorted(set(ykis) - set(ckis)) + sorted(k for k in set(ckis) & set(ykis) if ckis[k] != ykis[k]):
        tb, kn = ad.split(".", 1)
        out.append(blok(f"alter table public.{q(tb)} drop constraint if exists {q(kn)} cascade", f"kısıt kaldır {ad}"))
    # önce birincil / tekil, sonra yabancı anahtar (başvurulan anahtar hazır olsun)
    eklenecek = sorted(set(ckis) - set(ykis)) + sorted(k for k in set(ckis) & set(ykis) if ckis[k] != ykis[k])
    eklenecek.sort(key=lambda k: 1 if ckis[k].startswith("FOREIGN KEY") else 0)
    for ad in eklenecek:
        tb, kn = ad.split(".", 1)
        tanim, gecerli = re.match(r"(.*) gecerli=(\w+)$", ckis[ad], re.S).groups()
        out.append(blok(f"alter table public.{q(tb)} add constraint {q(kn)} {tanim}" + (" not valid" if gecerli == "false" and re.match(r"(FOREIGN KEY|CHECK)", tanim) else ""), f"kısıt ekle {ad}"))
    # 5. indeksler (kısıt indeksleri hariç)
    cind = {r["ad"]: r["tanim"] for r in t(C, "indeks")}; yind = {r["ad"]: r["tanim"] for r in t(Y, "indeks")}
    kisit_adlari = {k.split(".", 1)[1] for k in ckis} | {k.split(".", 1)[1] for k in ykis}
    for ad in sorted(set(yind) - set(cind)):
        if ad.split(".", 1)[1] in kisit_adlari: continue
        out.append(blok(f"drop index if exists public.{q(ad.split('.', 1)[1])}", f"indeks kaldır {ad}"))
    for ad in sorted(set(cind) - set(yind)):
        if ad.split(".", 1)[1] in kisit_adlari: continue
        out.append(blok(cind[ad], f"indeks oluştur {ad}"))
    # 6. fonksiyonlar: yerelde olup canlıda olmayan kaldırılır; canlıdakiler birebir metinle
    cfn = {r["ad"]: r["tanim"] for r in t(B, "fonksiyon")}
    yfn = {r["ad"] for r in t(Y, "fonksiyon")}
    kirp = lambda s: s.encode()[:63].decode("utf-8", "ignore")
    cfn_kirpik = {kirp(k) for k in cfn}
    for ad in sorted(yfn):
        if kirp(ad) in cfn_kirpik: continue
        out.append(blok(f"drop function if exists public.{ad} cascade", f"fonksiyon kaldır {ad[:40]}"))
    for ad, govde in sorted(cfn.items()):
        imza = ad
        out.append(f"do $$ begin execute {m(govde)}; exception when others then begin execute {m('drop function if exists public.' + imza + ' cascade')}; "
                   f"execute {m(govde)}; exception when others then raise warning 'HİZALAMA [fonksiyon {ad[:40].replace(chr(39), '')}]: %', sqlerrm; end; end $$;")
    # 7. tetikleyiciler (public)
    ctg = {r["ad"]: re.sub(r" etkin=\w+$", "", r["tanim"]) for r in t(C, "tetikleyici") if r["ad"].startswith("public.")}
    ytg = {r["ad"]: re.sub(r" etkin=\w+$", "", r["tanim"]) for r in t(Y, "tetikleyici") if r["ad"].startswith("public.")}
    for ad in sorted(set(ytg) - set(ctg)) + sorted(k for k in set(ctg) & set(ytg) if ctg[k] != ytg[k]):
        _, tb, tg = ad.split(".", 2)
        out.append(blok(f"drop trigger if exists {q(tg)} on public.{q(tb)}", f"tetikleyici kaldır {ad}"))
    for ad in sorted(set(ctg) - set(ytg)) + sorted(k for k in set(ctg) & set(ytg) if ctg[k] != ytg[k]):
        _, tb, tg = ad.split(".", 2)
        out.append(blok(ctg[ad], f"tetikleyici {ad}"))
    # 8. görünümler: bağımlılık sırası bilinmediği için birkaç tur dene
    cv = {r["ad"]: r["tanim"] for r in t(B, "görünüm")}
    for tur in range(4):
        for ad, tanim in sorted(cv.items()):
            secenek = re.search(r"secenek=(\S*)", ctab.get(ad, "")) if ad in ctab else None
            ops = secenek.group(1) if secenek else ""
            ile = f" with ({ops})" if ops else ""
            sql = f"create or replace view public.{q(ad)}{ile} as {tanim.rstrip().rstrip(';')}"
            if tur < 3:
                out.append(f"do $$ begin execute {m(sql)}; exception when others then null; end $$;")
            else:
                out.append(blok(sql, f"görünüm {ad}"))
    # 8b. fonksiyon ÇALIŞTIRMA yetkileri (canlıdaki anon / authenticated bayrakları; 25'te ad 63 bayta kırpık → 25b'nin tam adıyla eşlenir)
    bayrak = {}
    for r in t(C, "fonksiyon"):
        a_ = re.search(r"anon=(\w+)", r["tanim"]); u_ = re.search(r"authenticated=(\w+)", r["tanim"])
        bayrak[kirp(r["ad"])] = (a_.group(1) == "true", u_.group(1) == "true")
    for ad in sorted(cfn):
        b_ = bayrak.get(kirp(ad))
        if not b_: continue
        sql = f"revoke execute on function public.{ad} from public, anon, authenticated"
        out.append(blok(sql, f"yetki {ad[:40]}"))
        for rol, ver in (("anon", b_[0]), ("authenticated", b_[1])):
            if ver: out.append(blok(f"grant execute on function public.{ad} to {rol}", f"yetki {ad[:40]}"))
    # 9. yetki / RLS / politika / stk_ayar
    yetki = subprocess.run([sys.executable, "-I", os.path.join(os.path.dirname(os.path.abspath(__file__)), "canli-yetki-hizala.py"), c25],
                           capture_output=True, text=True, check=True).stdout
    out.append(yetki)
    print("\n".join(out))

if __name__ == "__main__":
    main(*sys.argv[1:4])
