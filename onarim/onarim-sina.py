#!/usr/bin/env python3
# RENK ÇÖKMESİ ONARIMI — YEREL SINAMA (26 Kasım, 2. sürüm). Canlıya BAĞLANMAZ.
# Kullanım (kök kullanıcı, yerel PostgreSQL): python3 -I onarim/onarim-sina.py <çıkış-dizini> <şablon-veritabanı>
#   <şablon-veritabanı>: canlının yapısı kurulmuş BOŞ veritabanı (atolye-kurulum-2026-11-18.sql: 97 tetikleyici, 90 kısıt,
#   119 fonksiyon, RLS ve politikalar — kurulumun kendi doğrulaması 17/17 "tamam"). Her durum bunun taze kopyasında koşar.
# Yöntem:
#   - Veri: yerel-kopya.sql (canlı envanterdeki 23 modelin durumu; kurulurken tetikleyiciler atlanır, PROVA tetikleyiciler AÇIKKEN).
#   - Çalıştırma Editor gibi: teslim edilen dosya stok-v2/editor-icin.py --bol ile parçalanır, HER PARÇA AYRI psql süreciyle
#     (ayrı bağlantı / istek) gönderilir.
#   - Doğrulama onarımın kendi denetimlerinden BAĞIMSIZ: public şemasındaki BÜTÜN tabloların tam dökümü önce / sonra.
import json, os, subprocess, sys, tempfile

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CIKIS, SABLON = sys.argv[1], sys.argv[2]
PLAN = json.load(open(f"{CIKIS}/plan.json", encoding="utf-8"))
ENV = {**os.environ, "PGHOST": "/var/run/postgresql", "PGUSER": "root", "PGDATABASE": "postgres"}
gecen = kalan = 0

def sh(*a, hata_tamam=False):
    r = subprocess.run(a, capture_output=True, text=True, env=ENV)
    if r.returncode and not hata_tamam: sys.exit(f"KOMUT HATASI {a[:3]}: {r.stderr[-500:]}")
    return r
def psql(db, sql=None, dosya=None):
    a = ["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", db] + (["-f", dosya] if dosya else ["-c", sql])
    return sh(*a, hata_tamam=True)
def tek(db, sql): return sh("psql", "-X", "-At", "-d", db, "-c", sql).stdout.strip()
def sonuc(kosul, ad):
    global gecen, kalan
    if kosul: gecen += 1; print(f"  ✓ {ad}")
    else: kalan += 1; print(f"  ✗ {ad}")

def taze(db):
    sh("dropdb", "--if-exists", db); sh("createdb", "-T", SABLON, db)
    r = psql(db, dosya=f"{CIKIS}/yerel-kopya.sql")
    if r.returncode: sys.exit("yerel kopya kurulamadı: " + r.stderr[-400:])

def dokum(db):
    """public şemasındaki BÜTÜN tabloların satırları (tablo → {satır metni}) + stok görünümü."""
    tablolar = tek(db, "select string_agg(relname, ' ' order by relname) from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r','p')").split()
    d = {}
    for t in tablolar:
        d[t] = sorted(json.loads(tek(db, f"select coalesce(json_agg(to_jsonb(x)::text), '[]') from public.{t} x")))
    d["~stok"] = sorted(json.loads(tek(db, "select coalesce(json_agg(varyant_id || '=' || miktar), '[]') from public.stk_stok")))
    return d
def satirlar(d, t): return {json.loads(x).get("id"): json.loads(x) for x in d[t]}

def editor_gibi(db, dosya):
    """Dosyayı Editor'un ayırıcısıyla parçalar, her parçayı AYRI istekle gönderir. İlk hatada durur (Editor da durur)."""
    r = sh(sys.executable, "-I", f"{KOK}/stok-v2/editor-icin.py", "--bol", dosya)
    parcalar = [p for p in r.stdout.split("\0") if p.strip()]
    cikti = []
    for p in parcalar:
        with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f: f.write(p)
        rr = psql(db, dosya=f.name); os.unlink(f.name)
        cikti.append(rr.stderr + rr.stdout)
        if rr.returncode: return False, len(parcalar), "\n".join(cikti)
    return True, len(parcalar), "\n".join(cikti)
def ileti(metin):
    for l in metin.splitlines():
        if "DUR:" in l or "TAMAM:" in l: return l.split("ERROR:")[-1].split("NOTICE:")[-1].strip()[:170]
    return (metin.strip().splitlines() or [""])[-1][:170]

A = {x["id"]: x for x in PLAN["A"]}; B = {x["id"]: x for x in PLAN["B"]}; C = {x["id"]: x for x in PLAN["C"]}
D = {(x["u"], x["sira"]): x for x in PLAN["D"]}; U = set(PLAN["urunler"])
UYG, GERI = f"{CIKIS}/onarim-uygula.sql", f"{CIKIS}/onarim-geri-al.sql"

print("0. Şablon: canlı yapısı")
yapi = tek(SABLON, "select count(*) from pg_trigger where not tgisinternal") + " tetikleyici · " + \
       tek(SABLON, "select count(*) from pg_constraint where connamespace = 'public'::regnamespace") + " kısıt"
print("   ", yapi)
taze("onarim_sina")
print("   ilgili tablolardaki tetikleyiciler:", tek("onarim_sina", """select string_agg(c.relname || '.' || g.tgname, ', ' order by 1) from pg_trigger g
  join pg_class c on c.oid = g.tgrelid where not g.tgisinternal and c.relname in ('stk_varyant', 'urunler')"""))

print("1. Onarım — Editor gibi, parça parça ayrı isteklerle")
once = dokum("onarim_sina")
sonuc(sum(1 for x in once["stk_varyant"] if json.loads(x)["urun_id"] in U) == 435, "kopya: 23 modelde 435 varyant (canlı envanterle aynı)")
ok, np, out = editor_gibi("onarim_sina", UYG); print("   ", ileti(out))
sonuc(ok and np == 2 and "ONARIM TAMAM" in out, f"Editor ayırıcısı {np} parça verdi; ikisi de ayrı istekle hatasız; ONARIM TAMAM")
sonuc("onarım sonucu" in out and "| 130 |" in out.replace("  ", " ") or "130" in out.split("onarım sonucu")[-1], "2. istek (salt okur sonuç tablosu) çalıştı")
sonra = dokum("onarim_sina")
ov, sv = satirlar(once, "stk_varyant"), satirlar(sonra, "stk_varyant")
eklenen = set(sv) - set(ov)
sonuc(eklenen == set(A) | set(B) and len(eklenen) == 135, f"tam 135 kombinasyon varyantı, kimlikleri plandakiyle birebir ({len(eklenen)})")
sonuc(not (set(ov) - set(sv)), "hiç varyant silinmedi")
sonuc(all(sv[k]["urun_id"] == x["u"] and sv[k]["renk_id"] == x["r"] and sv[k]["olcu_id"] == x["o"] and sv[k]["aktif"] for k, x in {**A, **B}.items()),
      "135'inin ürün / kombinasyon / ölçüsü plandaki gibi, hepsi etkin")
sonuc(all(float(sv[k]["min_stok"]) == float(x["min"]) and sv[k]["olusturma"][:19] == x["olus"][:19] for k, x in A.items()), "A (100): min_stok ve oluşturma 25-1137'deki ile aynı")
degisen = {k for k in set(ov) & set(sv) if ov[k] != sv[k]}
sonuc(degisen == set(C), f"değişen eski varyant tam 130 düz varyant ({len(degisen)}); 23 model dışındaki varyant dahil başka hiçbiri değişmedi")
sonuc(all({a for a in ov[k] if ov[k][a] != sv[k][a]} == {"aktif"} and ov[k]["aktif"] and not sv[k]["aktif"] for k in C), "130'unda YALNIZ aktif değişti (true → false)")
ou, su = satirlar(once, "urunler"), satirlar(sonra, "urunler")
oge = kural = 0
for u in ou:
    if {k for k in ou[u] if ou[u][k] != su[u][k]} - {"recete"}: kural += 1000
    ra, rb = ou[u].get("recete") or [], su[u].get("recete") or []
    if len(ra) != len(rb): kural += 1000; continue
    for i, (ea, eb) in enumerate(zip(ra, rb), 1):
        if ea == eb: continue
        oge += 1; x = D.get((u, i))
        if not x or {k for k in set(ea) | set(eb) if ea.get(k) != eb.get(k)} - {"mamulRenk", "mamulRenkId"} or eb["mamulRenk"] != x["sonra"] or "mamulRenkId" in eb: kural += 1
sonuc(oge == 149 and kural == 0, f"reçetede tam 149 öğe, yalnız mamulRenk / mamulRenkId; ürünlerin diğer bütün sütunları ve kapsam dışı ürünün reçetesi aynı (öğe {oge}, kural dışı {kural})")
dg_o, dg_s = json.loads(once["degisiklik"][0]), json.loads(sonra["degisiklik"][0])
sonuc(dg_s["sayaclar"].get("stk_varyant", 0) - dg_o["sayaclar"].get("stk_varyant", 0) == 3 and dg_s["sayaclar"].get("urunler", 0) - dg_o["sayaclar"].get("urunler", 0) == 1
      and {k: v for k, v in dg_s["sayaclar"].items() if k not in ("stk_varyant", "urunler")} == {k: v for k, v in dg_o["sayaclar"].items() if k not in ("stk_varyant", "urunler")},
      f"degisiklik sayacı: stk_varyant +3, urunler +1, başka anahtar yok ({dg_s['sayaclar']})")
stok_o = dict(x.rsplit("=", 1) for x in once["~stok"]); stok_s = dict(x.rsplit("=", 1) for x in sonra["~stok"])
sonuc(all(stok_s.get(k) == v for k, v in stok_o.items()) and set(stok_s) - set(stok_o) == eklenen and all(float(stok_s[k]) == 0 for k in eklenen),
      f"stok: {len(stok_o)} eski varyantın stoğu aynı; yalnız yeni 135 varyant eklendi, stokları 0")
digerleri = [t for t in once if t not in ("stk_varyant", "urunler", "degisiklik", "~stok")]
farkli = [t for t in digerleri if once[t] != sonra[t]]
sonuc(not farkli, f"diğer {len(digerleri)} tablonun hepsi satır satır aynı (sipariş, hareket, fiş, renk / barkod kodu, ölçü, Tanımlar, arşiv …){' — FARKLI: ' + ', '.join(farkli) if farkli else ''}")
sonuc(len(once["siparis_kalemleri"]) == 115 and len(once["stk_hareket"]) == 10, "sınanan kapsamda 115 sipariş kalemi ve 10 hareket var (boş tablo değil)")
bag = tek("onarim_sina", f"""select count(*) from public.siparis_kalemleri k where k.urun_id in ({','.join("'"+u+"'" for u in U)}) and not exists (
  select 1 from public.stk_stok s where s.urun_id = k.urun_id and s.aktif and public.stk_nrm(s.renk_ad) = public.stk_nrm(k.renk) and s.olcu_ad = k.beden)""")
sonuc(bag == "0", f"115 sipariş kaleminin hepsi etkin bir varyanta bağlanıyor (bağsız {bag})")
ok2, _, out2 = editor_gibi("onarim_sina", UYG)
sonuc(not ok2 and dokum("onarim_sina") == sonra, f"ikinci kez: DUR, hiçbir şey değişmedi · {ileti(out2)}")

print("2. Geri alma — Editor gibi")
ok3, np3, out3 = editor_gibi("onarim_sina", GERI); print("   ", ileti(out3))
geri = dokum("onarim_sina")
sonuc(ok3 and np3 == 2 and "GERİ AL TAMAM" in out3, f"{np3} parça, GERİ AL TAMAM")
sonuc(all(geri[t] == once[t] for t in once if t not in ("degisiklik", "silinen_arsiv")), "geri almadan sonra degisiklik / arşiv dışındaki BÜTÜN tablolar onarım öncesiyle birebir aynı")
yeni_arsiv = [json.loads(x) for x in geri["silinen_arsiv"] if x not in once["silinen_arsiv"]]
sonuc(len(yeni_arsiv) == 135 and {a["satir_id"] for a in yeni_arsiv} == set(A) | set(B) and set(once["silinen_arsiv"]) <= set(geri["silinen_arsiv"]),
      "arşive tam 135 silme kaydı düştü (kimlikleri onarımın eklediği varyantlar); önceki arşiv satırı kaybolmadı")

print("3. SON ADIMDA bilerek hata — bütün değişiklikler yapıldıktan sonra yakalanır, HER ŞEY geri alınır")
TETIK = """create table public.sina_yan_etki (n int);
create or replace function public.sina_yan_etki_f() returns trigger language plpgsql as 'begin insert into public.sina_yan_etki values (1); return null; end';
create trigger sina_yan_etki after update on public.urunler for each statement execute function public.sina_yan_etki_f();"""
taze("onarim_boz"); psql("onarim_boz", TETIK)
o = dokum("onarim_boz"); okb, _, outb = editor_gibi("onarim_boz", UYG)
sonuc(not okb and "sina_yan_etki" in ileti(outb) and dokum("onarim_boz") == o,
      f"reçete güncellemesi (SON değişiklik) başka bir tabloya yazınca son denetim DURDU; 135 ekleme, 130 pasif, reçete ve yan etki dahil hiçbir şey kalmadı · {ileti(outb)}")
taze("onarim_boz"); psql("onarim_boz", "create or replace function public.sina_ara_f() returns trigger language plpgsql as 'begin raise exception ''sınama: ara adımda hata''; end'; "
                                      "create trigger sina_ara before update on public.stk_varyant for each row execute function public.sina_ara_f();")
o = dokum("onarim_boz"); okb, _, outb = editor_gibi("onarim_boz", UYG)
sonuc(not okb and dokum("onarim_boz") == o, f"ara adımda (pasife alma) hata: 135 ekleme dahil hiçbir şey kalmadı · {ileti(outb)[:90]}")
taze("onarim_boz"); okx, _, _ = editor_gibi("onarim_boz", UYG); psql("onarim_boz", TETIK)
o = dokum("onarim_boz"); okb, _, outb = editor_gibi("onarim_boz", GERI)
sonuc(okx and not okb and "sina_yan_etki" in ileti(outb) and dokum("onarim_boz") == o,
      f"geri almanın son adımında hata: silme / etkinleştirme / reçete / arşiv dahil hiçbir şey kalmadı · {ileti(outb)}")

print("4. Ön koşul tutmazsa DUR, hiçbir kayıt değişmez")
bir_C, bir_A, bir_D, bir_U = sorted(C)[0], sorted(A)[0], sorted(D)[0], sorted(U)[0]
for ad, boz in [
    ("bir düz varyant zaten pasif", f"update public.stk_varyant set aktif = false where id = '{bir_C}'"),
    ("bir düz varyantta hareket var", f"set session_replication_role = replica; insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar) values ('h-boz', 'fis-yerel-1', '{bir_C}', '{C[bir_C]['u']}', 1)"),
    ("geri eklenecek kimlik zaten var", f"insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('{bir_A}', '{A[bir_A]['u']}', '{A[bir_A]['r']}', null)"),
    ("modelde beklenmeyen fazladan varyant", f"insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('vry-fazla', '{bir_U}', 'renk-mwbu0vhu-6lad', null)"),
    ("bir reçete satırının mamulRenk'i farklı", f"update public.urunler set recete = jsonb_set(recete, '{{{bir_D[1]-1},mamulRenk}}', '\"başka\"') where id = '{bir_D[0]}'"),
    ("kombinasyonun adı farklı", "update public.stk_renk set ad = ad || ' X' where id = 'kombi-mwc4rml8-j006'"),
    ("Siyah Yılan adı değişmiş", "update public.stk_renk set ad = 'SİYAH NAPA' where id = 'renk-mwbv9p63-7str'"),
]:
    taze("onarim_boz"); r = psql("onarim_boz", boz)
    if r.returncode: print("    (bozma uygulanamadı:", r.stderr[-150:], ")")
    o = dokum("onarim_boz"); okb, _, outb = editor_gibi("onarim_boz", UYG)
    sonuc(not okb and dokum("onarim_boz") == o, f"{ad} → DUR, hiçbir kayıt değişmedi · {ileti(outb)[:110]}")
for db in ("onarim_sina", "onarim_boz"): sh("dropdb", "--if-exists", db)
print(f"── onarım sınaması: {gecen} geçti, {kalan} kaldı ──")
sys.exit(1 if kalan else 0)
