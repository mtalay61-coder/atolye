#!/usr/bin/env python3
# RENK ÇÖKMESİ ONARIMI — YEREL SINAMA (26 Kasım). onarim-sql-uret.py'nin çıktılarını YEREL PostgreSQL'de koşar; canlıya bağlanmaz.
# Kullanım (kök kullanıcı, yerel sunucu): python3 -I onarim/onarim-sina.py <çıkış-dizini>
# Her durumda taze bir veritabanı: stok-v2 kurulumu + yerel-kopya.sql (canlı envanterdeki 23 modelin durumu).
# Onarımın KENDİ denetimlerinden BAĞIMSIZ olarak önce / sonra tam tablo dökümleri karşılaştırılır.
import json, os, subprocess, sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CIKIS = sys.argv[1]
PLAN = json.load(open(f"{CIKIS}/plan.json", encoding="utf-8"))
ENV = {**os.environ, "PGHOST": "/var/run/postgresql", "PGUSER": "root", "PGDATABASE": "postgres"}
gecen = kalan = 0

def sh(*a, girdi=None, hata_tamam=False):
    r = subprocess.run(a, input=girdi, capture_output=True, text=True, env=ENV)
    if r.returncode and not hata_tamam: sys.exit(f"KOMUT HATASI {a}: {r.stderr[-500:]}")
    return r
def psql(db, sql=None, dosya=None):
    a = ["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", db]
    a += ["-f", dosya] if dosya else ["-c", sql]
    return sh(*a, hata_tamam=True)
def tek(db, sql):
    return sh("psql", "-X", "-At", "-d", db, "-c", sql).stdout.strip()
def sonuc(kosul, ad):
    global gecen, kalan
    if kosul: gecen += 1; print(f"  ✓ {ad}")
    else: kalan += 1; print(f"  ✗ {ad}")

def taze(db):
    sh("dropdb", "--if-exists", db); sh("createdb", db)
    psql(db, dosya=f"{KOK}/stok-v2/test/eski-tablolar.sql"); psql(db, dosya=f"{KOK}/stok-v2/editor/1-kurulum.sql")
    r = psql(db, dosya=f"{CIKIS}/yerel-kopya.sql")
    if r.returncode: sys.exit("yerel kopya kurulamadı: " + r.stderr[-400:])

TABLOLAR = {"stk_varyant": "id", "urunler": "id", "siparis_kalemleri": "id", "siparisler": "id", "stk_hareket": "id",
            "stk_fis": "id", "stk_renk": "id", "stk_olcu": "id", "tanimlar": "id"}
def dokum(db):
    d = {}
    for t, k in TABLOLAR.items():
        d[t] = {r["id"]: r for r in json.loads(tek(db, f"select coalesce(json_agg(to_jsonb(x) order by x.{k}), '[]') from public.{t} x") or "[]")}
    d["stok"] = {r["varyant_id"]: r["miktar"] for r in json.loads(tek(db, "select coalesce(json_agg(json_build_object('varyant_id', varyant_id, 'miktar', miktar)), '[]') from public.stk_stok"))}
    return d

def uygula(db, dosya):
    r = psql(db, dosya=dosya)
    satir = [l for l in r.stderr.splitlines() if "DUR:" in l or "TAMAM" in l or "ERROR" in l]
    return r.returncode == 0 and ("ONARIM TAMAM" in r.stderr or "GERİ AL TAMAM" in r.stderr), (satir[0].split("ERROR:")[-1].split("NOTICE:")[-1].strip() if satir else "")[:200]

A = {x["id"]: x for x in PLAN["A"]}; B = {x["id"]: x for x in PLAN["B"]}; C = {x["id"]: x for x in PLAN["C"]}
D = {(x["u"], x["sira"]): x for x in PLAN["D"]}
U = set(PLAN["urunler"])

print("1. Sağlam yerel kopyada onarım")
taze("onarim_sina")
once = dokum("onarim_sina")
sonuc(len([v for v in once["stk_varyant"].values() if v["urun_id"] in U]) == 435, "yerel kopya: 23 modelde 435 varyant (canlı envanterle aynı)")
ok, msg = uygula("onarim_sina", f"{CIKIS}/onarim-uygula.sql"); print("   ", msg)
sonuc(ok, "onarım bloğu ONARIM TAMAM ile bitti")
sonra = dokum("onarim_sina")
ov, sv = once["stk_varyant"], sonra["stk_varyant"]
eklenen = set(sv) - set(ov); silinen = set(ov) - set(sv)
sonuc(eklenen == set(A) | set(B) and len(eklenen) == 135, f"tam 135 varyant eklendi ve kimlikleri plandakiyle birebir ({len(eklenen)})")
sonuc(not silinen, "hiç varyant silinmedi")
sonuc(all(sv[k]["urun_id"] == x["u"] and sv[k]["renk_id"] == x["r"] and sv[k]["olcu_id"] == x["o"] and sv[k]["aktif"] for k, x in {**A, **B}.items()),
      "135'inin ürün / kombinasyon / ölçüsü plandaki gibi, hepsi etkin")
sonuc(all(float(sv[k]["min_stok"]) == float(x["min"]) and sv[k]["olusturma"][:19] == x["olus"][:19] for k, x in A.items()),
      "A (100): min_stok ve oluşturma zamanı 25-1137'deki ile aynı")
degisen = {k for k in set(ov) & set(sv) if ov[k] != sv[k]}
sonuc(degisen == set(C), f"değişen eski varyant kümesi tam 130 düz varyant ({len(degisen)})")
sonuc(all({a for a in ov[k] if ov[k][a] != sv[k][a]} == {"aktif"} and ov[k]["aktif"] and not sv[k]["aktif"] for k in C),
      "130 düz varyantta YALNIZ aktif alanı değişti (true → false)")
alan_farki = 0; oge_farki = 0; uzunluk_ok = True; diger_alan_ok = True
for u in U:
    a, b = once["urunler"][u], sonra["urunler"][u]
    if {k for k in a if a[k] != b[k]} - {"recete"}: diger_alan_ok = False
    ra, rb = a.get("recete") or [], b.get("recete") or []
    if len(ra) != len(rb): uzunluk_ok = False; continue
    for i, (ea, eb) in enumerate(zip(ra, rb), 1):
        if ea == eb: continue
        oge_farki += 1
        x = D.get((u, i))
        if not x: alan_farki += 1000; continue
        dk = {k for k in set(ea) | set(eb) if ea.get(k) != eb.get(k)}
        if not (dk <= {"mamulRenk", "mamulRenkId"} and eb["mamulRenk"] == x["sonra"] and "mamulRenkId" not in eb and ea["mamulRenk"] == x["once"]): alan_farki += 1
sonuc(oge_farki == 149 and alan_farki == 0, f"reçetede tam 149 öğe değişti, yalnız mamulRenk / mamulRenkId (öğe {oge_farki}, kural dışı {alan_farki})")
sonuc(uzunluk_ok, "reçete uzunlukları aynı")
sonuc(diger_alan_ok, "ürünlerin reçete dışındaki bütün alanları aynı (renk resimleri, harici barkodlar dahil)")
for t in ("siparis_kalemleri", "siparisler", "stk_hareket", "stk_fis", "stk_renk", "stk_olcu", "tanimlar"):
    sonuc(once[t] == sonra[t], f"{t} birebir aynı ({len(once[t])} satır)")
sonuc(all(once["stok"][k] == sonra["stok"][k] for k in once["stok"]) and all(float(sonra["stok"][k]) == 0 for k in eklenen),
      "stoklar aynı; yeni 135 varyantın stoğu 0")
sonuc(sum(1 for r in once["stk_hareket"].values() if r["urun_id"] in U) == sum(1 for r in sonra["stk_hareket"].values() if r["urun_id"] in U) > 0,
      "hareketler aynı (hareketli 5 varyantın hareketleri dahil)")
# sipariş kalemleri artık etkin bir varyanta bağlanıyor mu (ad + ölçü)
bag = json.loads(tek("onarim_sina", f"""select json_agg(k.id) from public.siparis_kalemleri k where k.urun_id in ({','.join("'"+u+"'" for u in U)}) and not exists (
  select 1 from public.stk_stok s where s.urun_id = k.urun_id and s.aktif and public.stk_nrm(s.renk_ad) = public.stk_nrm(k.renk) and s.olcu_ad = k.beden)""") or "null")
sonuc(not bag, f"onarımdan sonra 115 sipariş kaleminin hepsi etkin bir varyanta bağlanıyor (bağsız {len(bag or [])})")
ok2, msg2 = uygula("onarim_sina", f"{CIKIS}/onarim-uygula.sql")
sonuc(not ok2 and dokum("onarim_sina") == sonra, f"ikinci kez çalıştırmak DURUR ve hiçbir şey değişmez ({msg2[:90]})")

print("2. Geri alma")
ok3, msg3 = uygula("onarim_sina", f"{CIKIS}/onarim-geri-al.sql"); print("   ", msg3)
geri = dokum("onarim_sina")
sonuc(ok3, "geri alma bloğu GERİ AL TAMAM ile bitti")
sonuc(all(geri[t] == once[t] for t in TABLOLAR) and geri["stok"] == once["stok"], "geri almadan sonra 9 tablo ve stok onarım öncesiyle birebir aynı")

print("3. Beklenen değerlerden biri tutmazsa BÜTÜN işlem geri alınır")
bir_C = sorted(C)[0]; bir_A = sorted(A)[0]; bir_D = sorted(D)[0]; bir_U = sorted(U)[0]
bozmalar = [
    ("bir düz varyant zaten pasif", f"update public.stk_varyant set aktif = false where id = '{bir_C}'"),
    ("bir düz varyantta hareket var", f"insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar) values ('h-boz', 'fis-yerel-1', '{bir_C}', '{C[bir_C]['u']}', 1)"),
    ("geri eklenecek kimlik zaten var", f"insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('{bir_A}', '{A[bir_A]['u']}', '{A[bir_A]['r']}', null)"),
    ("modelde beklenmeyen fazladan varyant", f"insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('vry-fazla', '{bir_U}', 'renk-mwbu0vhu-6lad', null)"),
    ("bir reçete satırının mamulRenk'i farklı", f"update public.urunler set recete = jsonb_set(recete, '{{{bir_D[1]-1},mamulRenk}}', '\"başka\"') where id = '{bir_D[0]}'"),
    ("kombinasyonun adı farklı (yeni ad değişikliği)", "update public.stk_renk set ad = ad || ' X' where id = 'kombi-mwc4rml8-j006'"),
    ("düzeltilmiş rengin adı yeniden değişmiş", "update public.stk_renk set ad = 'SİYAH SÜET' where id = 'renk-mwbu0vhu-6lad'"),
]
for ad, boz in bozmalar:
    taze("onarim_boz"); r = psql("onarim_boz", boz)
    if r.returncode: print("    (bozma uygulanamadı:", r.stderr[-150:], ")")
    o = dokum("onarim_boz"); ok, msg = uygula("onarim_boz", f"{CIKIS}/onarim-uygula.sql")
    sonuc(not ok and dokum("onarim_boz") == o, f"{ad} → DUR, hiçbir kayıt değişmedi · {msg[:120]}")
for db in ("onarim_sina", "onarim_boz"): sh("dropdb", "--if-exists", db)
print(f"── onarım sınaması: {gecen} geçti, {kalan} kaldı ──")
sys.exit(1 if kalan else 0)
