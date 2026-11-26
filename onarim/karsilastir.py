#!/usr/bin/env python3
# RENK ÇÖKMESİ — ÜÇ CSV KARŞILAŞTIRMASI (26 Kasım). SALT OKUR: yalnız dosya okur, hiçbir yere yazmaz / bağlanmaz.
#
# Girdiler:
#   Y1 = 2026-11-25-1137-yedek-dokum.csv   (yedek-varyant-dokumu-salt-okur.sql; sütunlar: bolum,urun_id,urun,ayrinti)
#   Y2 = 2026-11-26-1121-yedek-dokum.csv   (aynı sorgu)
#   C  = canlı renk envanteri               (renk-cokmesi-envanteri-salt-okur.sql; sütunlar: bolum,urun,urun_id,ayrinti — SIRA FARKLI)
# Kullanım: python3 -I karsilastir.py <Y1> <Y2> <C> [--model "27162 D"]
#
# NET DEĞİŞİM (kullanıcı: "yalnız ekleme yapıldığını varsayma"): her bölümde kayıtlar KİMLİKLE eşlenir ve
#   eklenen / kalkan / değişen (alan alan önce → sonra) / aynı olarak sayılır. Satır sayısı farkı tek başına raporlanmaz.
# KAPSAM FARKI: yedek dökümü kombinasyon (tur='model') ya da kombinasyon parçası renkle açılmış BÜTÜN varyantları verir; canlı
#   envanter yalnız ŞÜPHELİ ürünlerin varyantlarını verir. Yedek ↔ canlı karşılaştırması bu yüzden YALNIZ canlıda görünen
#   ürünlerde yapılır ve çıktıda böyle yazılır.
# Kimlikler: varyant → varyant_id; renk tanımı → id; reçete satırı → (urun_id, sira) + içerik imzası (hammaddeUrunId,
#   mamulBeden, renk, beden, proses, eklemeId) — sıra kayarsa imzayla eşlenir; barkod → (urun_id, barkod json'u).
import csv, json, sys, collections

def oku(yol, canli):
    satirlar = []
    with open(yol, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            try:
                a = json.loads(r.get("ayrinti") or "{}")
            except json.JSONDecodeError:
                sys.exit(f"DUR: {yol}: ayrinti JSON değil (bölüm {r.get('bolum')})")
            satirlar.append({"bolum": r["bolum"], "urun_id": r.get("urun_id") or "", "urun": r.get("urun") or "", "a": a})
    if not satirlar:
        sys.exit(f"DUR: {yol} boş")
    beklenen = {"1-urun", "2-varyant"} if canli else {"3-varyant", "2-tanim-kombi"}
    eksik = beklenen - {s["bolum"] for s in satirlar}
    if eksik:
        sys.exit(f"DUR: {yol} beklenen bölümler yok: {sorted(eksik)} — yanlış dosya mı?")
    return satirlar

def bolum(satirlar, *adlar):
    return [s for s in satirlar if s["bolum"] in adlar]

VARYANT_ALAN = ["renk_id", "renk", "renk_tur", "olcu", "aktif", "min_stok", "hareket"]
# Canlı envanter min_stok vermez → yedek ↔ canlı karşılaştırmasında yalnız İKİ TARAFTA da bulunan alanlar (sahte "değişen" olmasın).
VARYANT_ALAN_CANLI = [a for a in VARYANT_ALAN if a != "min_stok"]
def varyantlar(satirlar, canli):
    d = {}
    for s in bolum(satirlar, "2-varyant" if canli else "3-varyant"):
        a = s["a"]; vid = a.get("varyant_id")
        if not vid:
            continue
        d[vid] = {"urun_id": s["urun_id"], "urun": s["urun"], **{k: a.get(k) for k in VARYANT_ALAN},
                  "stok": a.get("stok", a.get("net_miktar")), "olusturma": a.get("olusturma")}
    return d

def fark(eski, yeni, alanlar):
    e, y = set(eski), set(yeni)
    degisen = {}
    for k in e & y:
        f = {a: (eski[k].get(a), yeni[k].get(a)) for a in alanlar if eski[k].get(a) != yeni[k].get(a)}
        if f:
            degisen[k] = f
    return {"eklenen": sorted(y - e), "kalkan": sorted(e - y), "degisen": degisen, "ayni": len(e & y) - len(degisen)}

def recete(satirlar, canli):
    d = {}
    for s in bolum(satirlar, "5-recete" if canli else "4-recete"):
        a = s["a"]
        imza = tuple(a.get(k) for k in ("hammaddeUrunId", "mamulBeden", "renk", "beden", "proses", "eklemeId"))
        d.setdefault(s["urun_id"], []).append({"sira": a.get("sira"), "imza": imza, "mamulRenk": a.get("mamulRenk"),
                                                "mamulRenkId": a.get("mamulRenkId"), "renkId": a.get("renkId"), "miktar": a.get("miktar")})
    return d

def barkod(satirlar):
    d = collections.defaultdict(list)
    for s in bolum(satirlar, "6-barkod", "5-barkod"):
        d[s["urun_id"]].append(json.dumps({k: v for k, v in s["a"].items() if k != "etkin_varyanta_bagli"}, ensure_ascii=False, sort_keys=True))
    return d

def kombiler(satirlar):
    return {s["a"]["id"]: s["a"] for s in bolum(satirlar, "2-tanim-kombi") if s["a"].get("id")}

def renk_tanimlari(y, c):
    t = {s["a"]["id"]: {"ad": s["a"].get("ad")} for s in bolum(y, "1-tanim-renk") if s["a"].get("id")}
    canli = {s["urun_id"]: s["a"] for s in bolum(c, "7-renk-tanimi")}
    return t, canli

def yaz_fark(baslik, f, sinir=40):
    print(f"  {baslik}: +{len(f['eklenen'])} eklenen, −{len(f['kalkan'])} kalkan, ~{len(f['degisen'])} değişen, ={f['ayni']} aynı")
    for k in f["eklenen"][:sinir]: print(f"      + {k}")
    for k in f["kalkan"][:sinir]: print(f"      − {k}")
    for k, alanlar in list(f["degisen"].items())[:sinir]:
        print(f"      ~ {k}: " + "; ".join(f"{a}: {o!r} → {n!r}" for a, (o, n) in alanlar.items()))

def model_raporu(ad, Y1, Y2, C):
    v1, v2, vc = varyantlar(Y1, False), varyantlar(Y2, False), varyantlar(C, True)
    idler = {s["urun_id"] for s in Y1 + Y2 + C if s["urun"] and s["urun"].strip().lower().startswith(ad.lower())}
    print(f"\n══ MODEL {ad} — ürün kimliği: {sorted(idler) or 'BULUNAMADI'}")
    if not idler:
        return
    for etiket, v in (("YEDEK 25-1137", v1), ("YEDEK 26-1121", v2), ("CANLI (şimdi)", vc)):
        print(f"  {etiket}:")
        for vid, x in sorted(((k, x) for k, x in v.items() if x["urun_id"] in idler), key=lambda kx: (str(kx[1]["renk"]), str(kx[1]["olcu"]))):
            print(f"      {vid}  renk_id={x['renk_id']}  [{x['renk_tur']}] {x['renk']!r}  ölçü={x['olcu']}  aktif={x['aktif']}  "
                  f"stok={x['stok']}  hareket={x['hareket']}  oluşturma={x['olusturma']}")
    s = lambda v: {k: x for k, x in v.items() if x["urun_id"] in idler}
    yaz_fark("varyant 25-1137 → 26-1121", fark(s(v1), s(v2), VARYANT_ALAN))
    yaz_fark("varyant 26-1121 → canlı", fark(s(v2), s(vc), VARYANT_ALAN_CANLI))
    k1, k2 = kombiler(Y1), kombiler(Y2)
    kullanilan = {x["renk_id"] for x in list(s(v1).values()) + list(s(v2).values()) + list(s(vc).values())}
    print("  kombinasyonlar (Tanımlar):")
    for kid in sorted(kullanilan & (set(k1) | set(k2))):
        print(f"      {kid}: 25-1137 {k1.get(kid)}  |  26-1121 {k2.get(kid)}")
    r1, r2, rc = recete(Y1, False), recete(Y2, False), recete(C, True)
    for etiket, r in (("25-1137", r1), ("26-1121", r2), ("canlı", rc)):
        for uid in sorted(idler):
            for x in r.get(uid, []):
                print(f"  reçete {etiket} [{x['sira']}] mamulRenk={x['mamulRenk']!r} mamulRenkId={x['mamulRenkId']} imza={x['imza']}")
    b1, b2, bc = barkod(Y1), barkod(Y2), barkod(C)
    for uid in sorted(idler):
        print(f"  harici barkod: 25-1137 {len(b1.get(uid, []))} · 26-1121 {len(b2.get(uid, []))} · canlı {len(bc.get(uid, []))}")
        for x in sorted(set(b1.get(uid, [])) ^ set(bc.get(uid, []))): print(f"      fark: {x}")

def genel(Y1, Y2, C):
    print("\n══ GENEL NET DEĞİŞİM (yedekler arası, kimlikle eşleşmiş)")
    v1, v2, vc = varyantlar(Y1, False), varyantlar(Y2, False), varyantlar(C, True)
    yaz_fark("varyant (kombinasyon / kombinasyon parçası renkli, BÜTÜN ürünler) 25-1137 → 26-1121", fark(v1, v2, VARYANT_ALAN), sinir=0)
    yaz_fark("Tanımlar kombinasyonları 25-1137 → 26-1121", fark(kombiler(Y1), kombiler(Y2), ["kod", "renkIdler", "barkodKodu"]), sinir=20)
    canli_urun = {x["urun_id"] for x in vc.values()}
    s = lambda v: {k: x for k, x in v.items() if x["urun_id"] in canli_urun}
    print(f"\n══ CANLIDA GÖRÜNEN {len(canli_urun)} ŞÜPHELİ ÜRÜN (yedek ↔ canlı yalnız bunlarda karşılaştırılır)")
    yaz_fark("varyant 26-1121 → canlı", fark(s(v2), s(vc), VARYANT_ALAN_CANLI), sinir=0)
    print("\n  ürün bazında (26-1121 → canlı): ad · eklenen / kalkan / değişen · canlı sebepler")
    sebep = {s_["urun_id"]: s_["a"].get("sebepler") for s_ in bolum(C, "1-urun")}
    ad = {x["urun_id"]: x["urun"] for x in list(v1.values()) + list(v2.values()) + list(vc.values())}
    for uid in sorted(canli_urun | set(sebep), key=lambda u: ad.get(u, u)):
        f = fark({k: x for k, x in v2.items() if x["urun_id"] == uid}, {k: x for k, x in vc.items() if x["urun_id"] == uid}, VARYANT_ALAN_CANLI)
        print(f"      {ad.get(uid, uid)} ({uid}) · +{len(f['eklenen'])} −{len(f['kalkan'])} ~{len(f['degisen'])} · {sebep.get(uid)}")

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="Renk çökmesi: üç CSV karşılaştırması (salt okur)")
    ap.add_argument("y1", help="2026-11-25-1137-yedek-dokum.csv"); ap.add_argument("y2", help="2026-11-26-1121-yedek-dokum.csv")
    ap.add_argument("canli", help="canlı renk envanteri CSV"); ap.add_argument("--model", default="27162 D")
    g = ap.parse_args()
    Y1, Y2, C = oku(g.y1, False), oku(g.y2, False), oku(g.canli, True)
    print(f"satır: 25-1137 {len(Y1)} · 26-1121 {len(Y2)} · canlı {len(C)}")
    model_raporu(g.model, Y1, Y2, C)
    genel(Y1, Y2, C)
