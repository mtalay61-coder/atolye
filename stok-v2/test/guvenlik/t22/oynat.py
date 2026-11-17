#!/usr/bin/env python3
# Eski ERP paketinin yakalanmış cari isteğini (eski-istemci-yakala.js çıktısı) PostgREST'in yapacağı SQL'e çevirir:
#   POST /rest/v1/cariler, Prefer: resolution=merge-duplicates → INSERT … ON CONFLICT (id) DO UPDATE SET (her sütun = excluded)
# Sütunlar gövdenin anahtarlarıdır (PostgREST de böyle kurar). Çıktı tek ifade; t22 bunu authenticated rolünde, JWT ve istek
# başlıklarıyla (request.jwt.claims / request.headers) çalıştırır. Seçenekler (oynatma varyantları):
#   --unvan METİN  --telefon METİN  --id KİMLİK  --ek-bos (notlar / siteOdemeSor dahil ek boşaltılır)  --basliklar (yalnız başlıklar JSON)
import json, sys

argv = sys.argv[1:]
dosya = argv.pop(0)
secenek = {}
while argv:
    a = argv.pop(0)
    secenek[a] = True if a in ("--ek-bos", "--basliklar") else argv.pop(0)
veri = json.load(open(dosya, encoding="utf-8"))
unvan = veri["talep"]["bilgiler"]["unvan"]
istek = next(i for i in veri["cariIstekleri"] if any(r.get("unvan") == unvan for r in i["govde"]))
if secenek.get("--basliklar"):
    print(json.dumps({"x-atolye-surum": istek["basliklar"]["x-atolye-surum"], "prefer": istek["basliklar"]["prefer"]}))
    sys.exit(0)
satirlar = []
for r in istek["govde"]:
    r = dict(r)
    if r.get("unvan") == unvan:
        if "--unvan" in secenek: r["unvan"] = secenek["--unvan"]
        if "--telefon" in secenek: r["telefon"] = secenek["--telefon"]
        if "--id" in secenek: r["id"] = secenek["--id"]
        if secenek.get("--ek-bos"): r["ek"] = {}
    satirlar.append(r)
sutunlar = list(satirlar[0].keys())
liste = ", ".join(sutunlar)
govde = json.dumps(satirlar, ensure_ascii=False).replace("'", "''")
guncelle = ", ".join(f"{s} = excluded.{s}" for s in sutunlar if s != "id")
print(f"insert into public.cariler ({liste}) select {liste} from jsonb_populate_recordset(null::public.cariler, '{govde}'::jsonb) "
      f"on conflict (id) do update set {guncelle}")
