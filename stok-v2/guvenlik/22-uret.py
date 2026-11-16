#!/usr/bin/env python3
# 22 DOSYALARINI ÜRETİR — site-portal.sql'in "22 BAŞLANGIÇ / BİTİŞ" bölümü TEK KAYNAK; uygulama, geri alma ve salt-okur önkoşul
# dosyaları 22-kaynak/*.sablon.sql şablonlarından üretilir. Neden: SQL Editor iç içe dolar tırnağını ve gövde dışı dolar işaretini
# bölüyor (editor-icin.py), oysa bütün değişikliğin TEK do bloğunda (ya hepsi ya hiçbiri) olması isteniyor. Üretici fonksiyon
# gövdelerini tek tırnaklı dizgeye çevirir (içerik birebir: prosrc aynı) ve gövde özetlerini (19-durum-salt-okur.sql ile aynı
# normalleştirme) dosyalara gömer. Elle kopyalama yok → site-portal.sql ile 22 arasında sapma olamaz.
# Kullanım: python3 stok-v2/guvenlik/22-uret.py            (dosyaları yazar)
#           python3 stok-v2/guvenlik/22-uret.py --denetle  (üretilen = depodaki mi; değilse çıkış 1)
import hashlib, os, re, sys

sys.dont_write_bytecode = True
BURA = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.abspath(os.path.join(BURA, "../.."))
KAYNAK = os.path.join(BURA, "22-kaynak")
CIKTILAR = {
    "uygula.sablon.sql": "22-site-onay-atomik.sql",
    "geri-al.sablon.sql": "22-site-onay-atomik-geri-al.sql",
    "onkosul.sablon.sql": "22-onkosul-salt-okur.sql",
}
# 19 sonrası (canlıda bugün olması gereken) gövde özetleri — 19-durum-salt-okur.sql'deki "yeni" değerler.
MD5_ONAYLA_19 = "86debf97b2f8ae9c1845f85900e65492"
MD5_REDDET_19 = "071e82fa3ad4c6eb0d2be0c2e6047cbe"
YENI = ["site_eslesme_anahtari", "site_vergi_no_kaydedilecek", "site_kimlik_zamani", "site_kayit_onayla_yeni_cari", "site_cari_ekleme_koru"]


def ozet(govde):
    # PostgreSQL: md5(btrim(regexp_replace(regexp_replace(prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g')))
    s = re.sub(r"--[^\n]*", "", govde)
    s = re.sub(r"\s+", " ", s)
    return hashlib.md5(s.strip(" ").encode("utf-8")).hexdigest()


def bolum():
    metin = open(os.path.join(KOK, "site-portal.sql"), encoding="utf-8").read()
    m = re.search(r"^-- >>> 22 BAŞLANGIÇ\n(.*?)^-- <<< 22 BİTİŞ$", metin, re.S | re.M)
    if not m:
        sys.exit("site-portal.sql'de 22 bölümü bulunamadı")
    return m.group(1)


def ifadeler(blok):
    """Bölümü ifadelere ayırır (çift-dolar gövde içi hariç ; ile)."""
    parcalar, simdiki, govde = [], [], False
    for satir in blok.split("\n"):
        if not govde and (satir.strip() == "" or satir.strip().startswith("--")):
            continue
        simdiki.append(satir)
        if satir.count("$$") % 2 == 1:
            govde = not govde
        if not govde and satir.rstrip().endswith(";"):
            parcalar.append("\n".join(simdiki))
            simdiki = []
    if simdiki or govde:
        sys.exit("22 bölümü yarım ifadeyle bitiyor")
    return parcalar


def imza(ifade):
    m = re.match(r"create or replace function (public\.\w+)\(([^)]*)\)", ifade.strip())
    if not m:
        return None
    turler = [a.strip().split()[-1] for a in m.group(2).split(",") if a.strip()]
    return f"{m.group(1)}({', '.join(turler)})"


def uret():
    blok = bolum()
    donusmus, ozetler = [], {}
    for ifade in ifadeler(blok):
        govdeler = re.findall(r"\$\$(.*?)\$\$", ifade, re.S)
        ad = imza(ifade)
        if ad:
            if len(govdeler) != 1:
                sys.exit(f"{ad}: tek gövde bekleniyordu")
            if "$" in govdeler[0] or re.search(r"^\s*--", govdeler[0], re.M):
                sys.exit(f"{ad}: gövdede dolar işareti ya da tam satır yorum var (Editor bunları bozar)")
            ozetler[ad] = ozet(govdeler[0])
        elif govdeler:
            sys.exit("fonksiyon dışı ifadede çift-dolar gövde")
        donusmus.append(re.sub(r"\$\$(.*?)\$\$", lambda g: "'" + g.group(1).replace("'", "''") + "'", ifade, flags=re.S))
    adlar = list(ozetler)
    yeni = [a for a in adlar if a.split("(")[0].split(".")[1] in YENI]
    if len(yeni) != len(YENI) or "public.site_kayit_onayla(text, text)" not in ozetler or "public.site_kayit_reddet(text)" not in ozetler:
        sys.exit(f"22 bölümündeki fonksiyonlar beklenenden farklı: {adlar}")
    sira = lambda liste: ", ".join(f"({i}, '{a}', '{ozetler[a]}')" for i, a in enumerate(liste, 1))
    yerine = {
        "--@@TANIMLAR@@": "\n\n".join(donusmus),
        "@@MD5_22_SATIRLARI@@": sira(adlar),
        "@@MD5_22_YENI@@": sira(yeni),
        "@@MD5_ONAYLA_19@@": MD5_ONAYLA_19,
        "@@MD5_REDDET_19@@": MD5_REDDET_19,
        "@@MD5_ONAYLA_22@@": ozetler["public.site_kayit_onayla(text, text)"],
        "@@MD5_REDDET_22@@": ozetler["public.site_kayit_reddet(text)"],
    }
    sonuc = {}
    for sablon, cikti in CIKTILAR.items():
        metin = open(os.path.join(KAYNAK, sablon), encoding="utf-8").read()
        for k, v in yerine.items():
            metin = metin.replace(k, v)
        if "@@" in metin:
            sys.exit(f"{sablon}: doldurulmamış yer tutucu kaldı")
        sonuc[cikti] = metin
    return sonuc


if __name__ == "__main__":
    dosyalar = uret()
    if "--denetle" in sys.argv:
        farkli = [ad for ad, m in dosyalar.items()
                  if not os.path.exists(os.path.join(BURA, ad)) or open(os.path.join(BURA, ad), encoding="utf-8").read() != m]
        print("22 üretimi: " + ("AYNI" if not farkli else "FARKLI → " + ", ".join(farkli)))
        sys.exit(1 if farkli else 0)
    for ad, m in dosyalar.items():
        open(os.path.join(BURA, ad), "w", encoding="utf-8").write(m)
        print("yazıldı:", ad)
