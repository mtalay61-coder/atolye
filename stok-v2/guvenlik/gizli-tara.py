#!/usr/bin/env python3
# GİZLİ DEĞER TARAYICISI (27 Kasım). Canlıdan gelen yapı / fonksiyon CSV'leri (25, 25b, onarim/canli-yapi…) ve depoya girecek her canlı
# metni için: herkese açık depoya konmadan ÖNCE çalıştırılır. SALT OKUR: dosyayı okur, bulguyu MASKELEYEREK yazar (değerin kendisini
# ekrana dökmez — tarayıcının çıktısı da bir yere yapıştırılabilir).
# Kullanım: python3 -I gizli-tara.py dosya.csv [dosya2 …]   → çıkış kodu 0 = temiz · 1 = YÜKSEK bulgu var · 2 = okunamadı
# Sınıflar:
#   YÜKSEK  — gizli anahtar biçimi (Supabase secret / service_role JWT / herhangi bir JWT, Bearer jetonu, özel anahtar bloğu, AWS / Stripe /
#             GitHub / Google / Slack anahtar biçimleri, adres içinde key= / token= / secret=, parola / şifre ataması metin değeriyle,
#             tırnak içinde 32+ karakter yüksek entropili dize)
#   KİŞİSEL — e-posta adresi (atolye.local / example dışında), telefon biçimi
#   BİLGİ   — publishable anahtar (sb_publishable_…: HTML'de zaten açık), md5/sha özetleri (yapı özetleri; gizli değil)
# Sınır: biçime bakar. Biçimi tanınmayan bir sır (ör. kısa düz parola bir tablo satırında) kaçabilir; fonksiyon gövdesinde sabit sır OLMAMALI
# kuralı geçerli, şüphe varsa satır elle incelenir.
import csv, math, re, sys

csv.field_size_limit(1 << 30)
YUKSEK = [
    ("supabase secret anahtarı", re.compile(r"sb_secret_[A-Za-z0-9_-]{10,}")),
    ("JWT", re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")),
    ("Bearer jetonu", re.compile(r"(?i)bearer\s+[A-Za-z0-9._~+/=-]{16,}")),
    ("özel anahtar", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("AWS anahtarı", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Stripe anahtarı", re.compile(r"\b[sr]k_(live|test)_[A-Za-z0-9]{10,}")),
    ("GitHub jetonu", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}")),
    ("Google API anahtarı", re.compile(r"\bAIza[0-9A-Za-z_-]{30,}")),
    ("Slack jetonu", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}")),
    ("adreste anahtar", re.compile(r"(?i)https?://[^\s'\"]*[?&](api[_-]?key|key|token|secret|sig|signature|access_token)=[^\s&'\"]{6,}")),
    ("parola ataması", re.compile(r"(?i)\b(password|passwd|parola|sifre|şifre|smtp_?sifre|smtp_?pass|secret|api[_-]?key|apikey|anahtar)\b\s*(:=|=|:|=>)\s*'[^'\s]{6,}'")),
    ("başlıkta anahtar", re.compile(r"(?i)['\"](apikey|authorization|x-api-key)['\"]\s*[,:]\s*['\"][^'\"]{12,}['\"]")),
]
KISISEL = [
    ("e-posta", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")),
    ("telefon", re.compile(r"(?<![\d.])(?:\+90|0)\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}(?!\d)")),
]
BILGI = [("publishable anahtar", re.compile(r"sb_publishable_[A-Za-z0-9_-]{10,}"))]
IZINLI_EPOSTA = re.compile(r"(?i)@(atolye\.local|example\.(com|org)|ornek\.com)$")
HEX = re.compile(r"^[0-9a-f]+$")
TIRNAK = re.compile(r"'([^'\s]{32,})'")

def entropi(s):
    n = len(s); sayac = {}
    for c in s: sayac[c] = sayac.get(c, 0) + 1
    return -sum(v / n * math.log2(v / n) for v in sayac.values())

def maskele(s):
    return s if len(s) <= 8 else f"{s[:4]}…{s[-2:]} ({len(s)} karakter)"

def tara(metin):
    bul = []
    for ad, r in YUKSEK:
        for m in r.finditer(metin): bul.append(("YÜKSEK", ad, m.group(0)))
    for ad, r in KISISEL:
        for m in r.finditer(metin):
            if ad == "e-posta" and IZINLI_EPOSTA.search(m.group(0)): continue
            bul.append(("KİŞİSEL", ad, m.group(0)))
    for ad, r in BILGI:
        for m in r.finditer(metin): bul.append(("BİLGİ", ad, m.group(0)))
    for m in TIRNAK.finditer(metin):
        s = m.group(1)
        if HEX.match(s.lower()) and len(s) in (32, 40, 64): continue          # md5 / sha özeti
        if re.search(r"[\\\[\]^|(){}]", s): continue                          # düzenli ifade kalıbı (\A…\Z, [a-z]…)
        if "0123456789" in s or "abcdefghij" in s.lower(): continue           # alfabe / rakam dizisi (kimlik üretici)
        if re.fullmatch(r"[a-z]+(_[a-z0-9]+)+", s): continue                   # alt çizgili tanımlayıcı (fonksiyon / sütun adı)
        if entropi(s) >= 4.0 and re.search(r"\d", s) and re.search(r"[A-Za-z]", s):
            bul.append(("YÜKSEK", "yüksek entropili dize", s))
    return bul

def main(yollar):
    toplam = {"YÜKSEK": 0, "KİŞİSEL": 0, "BİLGİ": 0}
    for yol in yollar:
        try:
            with open(yol, newline="", encoding="utf-8-sig") as f:
                ilk = f.read(4096); f.seek(0)
                satirlar = list(csv.reader(f)) if "," in ilk.split("\n", 1)[0] else [[x] for x in f.read().split("\n")]
        except OSError as e:
            print(f"OKUNAMADI {yol}: {e}"); return 2
        for no, satir in enumerate(satirlar, 1):
            etiket = " · ".join(satir[:2])[:70]
            for sinif, ad, deger in tara("\n".join(satir)):
                toplam[sinif] += 1
                print(f"{sinif:8} {yol.split('/')[-1]} satır {no} [{etiket}] {ad}: {maskele(deger)}")
    print(f"── gizli-tara: YÜKSEK {toplam['YÜKSEK']} · KİŞİSEL {toplam['KİŞİSEL']} · BİLGİ {toplam['BİLGİ']} ──")
    return 1 if toplam["YÜKSEK"] else 0

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit("kullanım: gizli-tara.py dosya.csv […]")
    sys.exit(main(sys.argv[1:]))
