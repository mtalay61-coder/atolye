#!/usr/bin/env python3
# Supabase SQL Editor taklidi: dosyayı Editor'un ayırıcısıyla (stok-v2/editor-icin.py: ayikla + bol) ifadelere böler ve her
# ifadeyi AYRI bir psql bağlantısında (kendi işleminde) çalıştırır; ilk hatada durur. 16 Kasım'da canlıda 19'un "relation
# site_19_sinama does not exist" hatası böyle oluştu. Kullanım: editor-calistir.py <host> <port> <db> <dosya.sql>
import sys, os, subprocess, importlib.util
kok = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
spec = importlib.util.spec_from_file_location("editor_icin", os.path.join(kok, "editor-icin.py"))
ei = importlib.util.module_from_spec(spec); spec.loader.exec_module(ei)
host, port, db, dosya = sys.argv[1:5]
parcalar = ei.bol(ei.ayikla(open(dosya, encoding="utf-8").read()))
for i, p in enumerate(parcalar, 1):
    r = subprocess.run(["psql", "-X", "-q", "-h", host, "-p", port, "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1"],
                       input=p, capture_output=True, text=True)
    sys.stdout.write(r.stdout)
    if r.returncode != 0:
        sys.stdout.write(f"EDITOR: {i}/{len(parcalar)}. ifadede durdu: {r.stderr.strip().splitlines()[0] if r.stderr.strip() else r.returncode}\n")
        sys.exit(1)
sys.stdout.write(f"EDITOR: {len(parcalar)} ifade ayrı ayrı çalıştı\n")
