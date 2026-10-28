#!/usr/bin/env python3
# SUPABASE SQL EDITOR İÇİN KOPYA — kaynak SQL'i (yorumlu, belgeli) Editor'un kendi ayırıcısının doğru bölebileceği biçime
# getirir ve denetler. Kullanım: editor-icin.py girdi.sql > cikti.sql   |   editor-icin.py --bol girdi.sql (parçaları
# NUL ile ayırıp yazar; sınama her parçayı AYRI istekle çalıştırır — Editor'un yaptığı gibi).
#
# NEDEN (28 Ekim): Supabase SQL Editor metni kendi ayırıcısıyla ifadelere bölüyor. Adlı dolar tırnağı ($ad$), iç içe
# tırnak ya da yorumdaki dolar işareti gövdeyi ortasından kesti: "syntax error at or near if — LINE 1: … end if;". 7 Ekim'deki
# do-bloğu hatası da buydu. PostgreSQL'in kendisi (psql, yerel sınama) aynı dosyayı sorunsuz okuduğu için yerelde görünmedi.
# Kural: yalnız düz çift-dolar gövde, iç içe yok; başka hiçbir yerde dolar işareti yok. Yorumlar (Türkçe kesme işaretleri
# tırnak sanılmasın) çıkarılır; gövde içi yorumlar da.
import sys

def ayikla(metin):
    """Yorumları çıkarır (tırnak ve gövde dışı: satır sonu yorumları da; gövde içi: yalnız tam satır yorumları)."""
    cikti = []
    govdede = False
    for satir in metin.split("\n"):
        yalin = satir.strip()
        if yalin.startswith("--"):
            continue
        # İşlem sarmalayıcısı çıkarılır: Editor parçaları ayrı ayrı gönderirse "begin" bir oturumda, gerisi başkasında
        # kalabilir. Her ifade tekrar çalıştırılabilir (create or replace / if not exists); geçişin kendisi tek ifade.
        if not govdede and yalin.lower() in ("begin;", "commit;"):
            continue
        if not govdede:
            # Gövde dışı satır sonu yorumu: tek tırnak dışındaki ilk "--"dan sonrası atılır.
            tirnakta = False
            kes = None
            i = 0
            while i < len(satir):
                c = satir[i]
                if c == "'":
                    tirnakta = not tirnakta
                elif not tirnakta and satir.startswith("--", i):
                    kes = i
                    break
                elif not tirnakta and satir.startswith("$$", i):
                    break
                i += 1
            if kes is not None:
                satir = satir[:kes].rstrip()
        if satir.count("$$") % 2 == 1:
            govdede = not govdede
        cikti.append(satir)
    # Ardışık boş satırlar teke iner.
    sonuc = []
    for s in cikti:
        if s.strip() == "" and sonuc and sonuc[-1].strip() == "":
            continue
        sonuc.append(s)
    return "\n".join(sonuc).strip() + "\n"

def denetle(metin):
    hatalar = []
    if metin.count("$$") % 2:
        hatalar.append("çift-dolar sayısı tek")
    if metin.replace("$$", "").count("$"):
        hatalar.append("çift-dolar dışında dolar işareti var (adlı/iç içe tırnak ya da $1)")
    return hatalar

def bol(metin):
    """Editor ayırıcısının taklidi: ; ile böler — tek tırnak ve çift-dolar gövde içi hariç."""
    parcalar, bas, i, tirnak, govde = [], 0, 0, False, False
    while i < len(metin):
        if not tirnak and metin.startswith("$$", i):
            govde = not govde; i += 2; continue
        c = metin[i]
        if not govde and c == "'":
            tirnak = not tirnak
        elif not govde and not tirnak and c == ";":
            parca = metin[bas:i + 1].strip()
            if parca and parca != ";":
                parcalar.append(parca)
            bas = i + 1
        i += 1
    kalan = metin[bas:].strip()
    if kalan:
        parcalar.append(kalan)
    return parcalar

if __name__ == "__main__":
    args = sys.argv[1:]
    bolme = args and args[0] == "--bol"
    if bolme:
        args = args[1:]
    metin = ayikla(open(args[0], encoding="utf-8").read())
    hatalar = denetle(metin)
    if hatalar:
        sys.stderr.write(f"{args[0]}: Supabase SQL Editor için uygun değil: {'; '.join(hatalar)}\n")
        sys.exit(1)
    if bolme:
        sys.stdout.write("\0".join(bol(metin)))
    else:
        sys.stdout.write(metin)
