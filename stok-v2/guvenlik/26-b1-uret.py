#!/usr/bin/env python3
# B1 PAKET ÜRETİCİSİ (28 Kasım, deneme paketi). Kaynak: stok-v2/guvenlik/26-b1-renk-ad-degistir.sql (okunur, yorumlu; yerel sınamalar
# bunu psql ile kurar). Üretilenler (ELLE DÜZENLENMEZ; --denetle diskteki ile aynı mı bakar):
#   26-b1-uygula.sql  — SQL Editor için TEK ifade (tek do $$ … $$ bloğu): Editor ifadeleri ayrı isteklerle gönderse bile ya hepsi kurulur
#                       ya hiçbiri (begin / commit Editor'de atomiklik vermez — editor-icin.py onları bu yüzden çıkarır). Sonda ayrı bir
#                       salt okur sorgu 6 kontrolü ve GENEL satırını gösterir (26-b1-onkosul ile aynı).
#   26-b1-geri-al.sql — B1'i kaldırır (tetikleyiciler + 5 fonksiyon), tek ifade. tanim_ad_gecmisi TABLOSU ve satırları KALIR (ad geçmişi
#                       veri sayılır; silinmez). Geri almadan sonra 1.744.38+ istemci ad değiştirmeyi REDDEDER (PGRST202, eski yola
#                       dönmez) — ad değiştirme gerekiyorsa istemci de 1.744.37'ye döner.
# Yöntem 25-uret.py / 22-site-onay-atomik.sql ile aynı: fonksiyon gövdeleri çift-dolar yerine tek tırnakla (içindeki tırnaklar ikilenir);
# kaynaktaki do-blokları iç içe plpgsql bloğu olur; begin / commit atılır.
# Kullanım: python3 stok-v2/guvenlik/26-b1-uret.py [--denetle]
import os, re, sys

G = os.path.dirname(os.path.abspath(__file__))
KAYNAK = os.path.join(G, "26-b1-renk-ad-degistir.sql")
ONKOSUL = os.path.join(G, "26-b1-onkosul-salt-okur.sql")

def ifadeler(metin):
    """Kaynağı üst düzey ifadelere böler: $$ dışında ';' ayırır; $$ dışındaki '--' yorumları atılır."""
    parcalar, cari, govdede, i = [], [], False, 0
    satirlar = metin.split("\n")
    duz = []
    for s in satirlar:
        # gövde dışında yorum satırını / satır sonu yorumunu at (gövde içindekiler kalır: çalışan koddur)
        if not govdede:
            k = s.find("--")
            parca = s if k < 0 else s[:k]
            # bu satırda $$ varsa durum değişir (yorumdan önceki kısım sayılır)
            n = parca.count("$$")
            if n % 2 == 1:
                # $$ açıldı: gövdenin satır içi kalan kısmı (yorum dahil) korunur
                j = s.index("$$")
                duz.append(s)
                govdede = True
                continue
            duz.append(parca)
        else:
            duz.append(s)
            if s.count("$$") % 2 == 1:
                govdede = False
    metin = "\n".join(duz)
    kes = metin.split("$$")
    if len(kes) % 2 == 0:
        sys.exit("kaynakta tek sayıda $$")
    for idx, p in enumerate(kes):
        if idx % 2 == 1:
            cari.append("$$" + p + "$$")
            continue
        alt = p.split(";")
        for j, a in enumerate(alt):
            cari.append(a)
            if j < len(alt) - 1:
                parcalar.append("".join(cari).strip()); cari = []
    son = "".join(cari).strip()
    if son:
        parcalar.append(son)
    return [x for x in parcalar if x]

def ic(s):
    """do bloğunun İÇİNE yazılacak ifade. do $$ X $$ → X (iç blok). Fonksiyon gövdesi tek tırnakla."""
    if re.match(r"(?is)^do\s+\$\$", s):
        govde = s[s.index("$$") + 2:s.rindex("$$")].strip()
        if "$" in govde:
            sys.exit("do gövdesinde dolar: " + govde[:60])
        g = govde.rstrip(";").rstrip()
        return "  " + g.replace("\n", "\n  ") + ";"
    girinti = lambda x: x.replace("\n", "\n  ")
    if "$$" in s:
        # Gövde BAYT BAYT kaynakla aynı kalır (girinti yalnız gövde dışına) — kurulan prosrc'nin md5'i kaynaktan kurulanla aynı çıksın
        i, j = s.index("$$"), s.rindex("$$")
        govde = s[i + 2:j]
        if "$" in govde:
            sys.exit("gövdede dolar işareti: " + s[:80])
        on, son = s[:i].strip(), s[j + 2:].strip().rstrip(";").rstrip()
        if "$" in on + son:
            sys.exit("ifadede dolar işareti: " + s[:80])
        return "  " + girinti(on) + " '" + govde.replace("'", "''") + "'" + (" " + girinti(son) if son else "") + ";"
    if "$" in s:
        sys.exit("ifadede dolar işareti: " + s[:80])
    return "  " + girinti(s.strip().rstrip(";").rstrip()) + ";"

kaynak = open(KAYNAK, encoding="utf-8").read()
onkosul = open(ONKOSUL, encoding="utf-8").read()
onkosul_sorgu = "\n".join(x for x in onkosul.split("\n") if not x.lstrip().startswith("--")).strip()
ifs = ifadeler(kaynak)
atla = lambda s: re.fullmatch(r"(?is)(begin|commit)", s) or re.match(r"(?is)^select\s+'B1 KURULDU", s)
govde_ifadeleri = [ic(s) for s in ifs if not atla(s)]
if any("$$" in g for g in govde_ifadeleri):
    sys.exit("üretilen gövdede $$ kaldı")

BASLIK = """-- =====================================================================================================================
--  {ad} — ÜRETİLDİ (stok-v2/guvenlik/26-b1-uret.py; ELLE DÜZENLENMEZ). Kaynak: 26-b1-renk-ad-degistir.sql
--  {ne}
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- ====================================================================================================================="""

uygula = BASLIK.format(ad="26-b1-uygula.sql", ne="B1 KURULUMU (renk adı sunucuda tek işlem + eski ad defteri + bayat yazma tetikleyicisi). Var olan satırlara dokunmaz.") + """
do $$
begin
""" + "\n".join(govde_ifadeleri) + """
end $$;
""" + onkosul_sorgu + "\n"

GERI_FONK = ["public.tanim_renk_ad_degistir(jsonb)", "public.tanim_eski_ad_serbest(jsonb)", "public.tanim_ad_gecmisi_koru()",
             "public.tanim_ad_guncelle_tetik()", "public.tanim_ad_guncel(text)"]
geri = BASLIK.format(ad="26-b1-geri-al.sql", ne="B1 GERİ ALMA (AYRI ONAYLA). Tetikleyiciler + 5 fonksiyon kalkar; tanim_ad_gecmisi tablosu ve satırları KALIR.") + """
--  Etki: ad değişikliği yine ESKİ yolla (istemci belleğinden) yapılabilir hâle gelmez — 1.744.38+ istemci reddeder. Bayat cihaz koruması
--  (eski adla gelen yeni kayıt) KALKAR. Geri almadan sonra 26-b1-onkosul: GENEL "KURULU DEĞİL", 1 / 2 / 4 / 5 / 6 "yok / 0 etkin".
do $$
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'B1 geri alma postgres rolüyle çalıştırılmalı (şu an: %%). Hiçbir şey değişmedi.', current_user;
  end if;
  drop trigger if exists tanim_ad_gecmisi_koru on public.tanimlar;
  drop trigger if exists tanim_ad_guncelle on public.siparis_kalemleri;
  drop trigger if exists tanim_ad_guncelle on public.uretim;
  drop trigger if exists tanim_ad_guncelle on public.stok_rezervasyonlari;
  if to_regclass('public.lst_kayit') is not null then
    execute 'drop trigger if exists tanim_ad_guncelle on public.lst_kayit';
  end if;
  if exists (select 1 from pg_class where oid = to_regclass('public.koliler') and relkind = 'r') then
    execute 'drop trigger if exists tanim_ad_guncelle on public.koliler';
  end if;
""" + "\n".join(f"  drop function if exists {f};" for f in GERI_FONK) + """
  if exists (select 1 from pg_trigger where tgname in ('tanim_ad_guncelle', 'tanim_ad_gecmisi_koru'))
     or exists (select 1 from pg_proc where proname in ('tanim_renk_ad_degistir', 'tanim_eski_ad_serbest', 'tanim_ad_gecmisi_koru', 'tanim_ad_guncelle_tetik', 'tanim_ad_guncel')
                and pronamespace = 'public'::regnamespace) then
    raise exception 'B1 geri alma doğrulaması tutmadı — HİÇBİR şey değişmedi';
  end if;
end $$;
""" + onkosul_sorgu + "\n"
geri = geri.replace("%%", "%")

for metin in (uygula, geri):
    # Editor kuralı: $$ yalnız do bloğunun iki ucunda
    if metin.count("$$") != 2:
        sys.exit(f"üretilen dosyada $$ sayısı {metin.count('$$')} (2 olmalı)")
    govde = metin[metin.index("$$") + 2:metin.rindex("$$")]
    if "$" in govde or "$" in metin[metin.rindex("$$") + 2:]:
        sys.exit("üretilen dosyada $$ dışında dolar işareti")

hedefler = {os.path.join(G, "26-b1-uygula.sql"): uygula, os.path.join(G, "26-b1-geri-al.sql"): geri}
if "--denetle" in sys.argv:
    farkli = [y for y, m in hedefler.items() if not os.path.exists(y) or open(y, encoding="utf-8").read() != m]
    print("üretilenler diskteki ile " + ("AYNI" if not farkli else "FARKLI: " + ", ".join(os.path.basename(x) for x in farkli)))
    sys.exit(1 if farkli else 0)
for y, m in hedefler.items():
    open(y, "w", encoding="utf-8").write(m)
print(f"yazıldı: 26-b1-uygula.sql ({len(govde_ifadeleri)} ifade) · 26-b1-geri-al.sql")
