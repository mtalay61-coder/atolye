#!/usr/bin/env python3
# B4 / B5 PAKET ÜRETİCİSİ (28 Kasım). Kaynaklar (stok-v2/guvenlik/27-b4-kaynak/):
#   canli-fis_kes.sql · canli-fis_iptal.sql · canli-fis_iptal_toplu.sql — CANLI gövdeler (pg_get_functiondef, canlıya hizalı tabandan;
#     md5'leri canlı 25 CSV'siyle aynı: aşağıdaki CANLI sözlüğü — üretici denetler)
#   yeni.sql — b4_teslim_denetle, b4_iptal_denetle ("-- @@" ile ayrılmış ifadeler)
# Üç fonksiyona ÇAPALI ekleme yapılır (çapa tam bir kez bulunmalı); başka satır değişmez. Üretilenler (ELLE DÜZENLENMEZ):
#   27-b4-uretim-teslim.sql  okunur kaynak (psql ile yerel sınama kurar: begin … commit)
#   27-b4-uygula.sql         SQL Editor: TEK do-bloğu (Editor ifadeleri ayrı gönderse de atomik) + salt okur önkoşul sorgusu
#   27-b4-geri-al.sql        TEK do-bloğu: üç gövde CANLI hâline birebir döner (md5 doğrulanır, tutmazsa hiçbir şey değişmez), b4_* kalkar
#   27-b4-onkosul-salt-okur.sql  HAZIR (canlı gövdeler) · UYGULANMIŞ · FARKLI (G-25 vb. başka değişiklik — DUR)
# Kullanım: python3 stok-v2/guvenlik/27-b4-uret.py [--denetle]
import hashlib, os, re, sys

G = os.path.dirname(os.path.abspath(__file__))
K = os.path.join(G, "27-b4-kaynak")
CANLI = {"fis_kes": "d5615b1136ec5b7d8cdd475c2a59543e", "fis_iptal": "23b5e8ca42f7598b448684919df27603", "fis_iptal_toplu": "8ea651cbef26f82028df668db2b2f361"}
ISARET = "B4 (28 Kasım)"   # yamalı gövdede bulunan imza (önkoşul / geri alma bununla tanır)

def oku(ad, ham=False):
    with open(os.path.join(K, ad), encoding="utf-8", newline="" if ham else None) as f:
        return f.read()

# canli-*.sql = pg_get_functiondef + "\n" (node pg ile birebir). CANLI GÖVDELER CRLF satır sonlu (Windows'tan Editor'e yapıştırılmış);
# başlık LF. Yama LF üzerinde yapılır; kurulumda gövde chr(13)||chr(10)'a çevrilir → dosya taşınırken CR kaybolsa da kurulan metin aynı,
# geri almada canlı md5'e BİREBİR dönülür.
BAS, ESKI = {}, {}
for a in CANLI:
    t = oku(f"canli-{a}.sql", ham=True)[:-1]
    if hashlib.md5(t.encode("utf-8")).hexdigest() != CANLI[a]:
        sys.exit(f"{a}: kaynak canlı md5 ile tutmuyor")
    i, j = t.index("$function$"), t.rindex("$function$")
    govde = t[i + 10:j]
    if "\r" in t[:i] or govde.replace("\r\n", "").count("\r") or govde.count("\n") != govde.count("\r\n") or t[j:] != "$function$\n":
        sys.exit(f"{a}: satır sonu düzeni beklenenden farklı")
    BAS[a], ESKI[a] = t[:i], govde.replace("\r\n", "\n")

def ekle(t, capa, yeni, ad, once=False):
    if t.count(capa) != 1:
        sys.exit(f"{ad}: çapa {t.count(capa)} kez: {capa[:60]!r}")
    return t.replace(capa, (yeni + "\n" + capa) if once else (capa + "\n" + yeni), 1)

def degistir(t, eski, yeni, ad):
    if t.count(eski) != 1:
        sys.exit(f"{ad}: değiştirilecek metin {t.count(eski)} kez: {eski[:60]!r}")
    return t.replace(eski, yeni, 1)

Y = dict(ESKI)
Y["fis_kes"] = ekle(Y["fis_kes"], "  perform public.kas_cek_kilitle(jsonb_build_object(",
    f"  -- {ISARET}: üretim teslimi — aynı üretim kilitli; atamanın SUNUCUDAKİ durumu, kısmi teslim / kalan / tamir miktarı ve adımın başka\n"
    "  -- geçerli fişte olmaması denetlenir (iki cihaz, ayrı istek kimlikleri). Aynı isteğin tekrarı yukarıda zatenVar ile döndü.\n"
    "  perform public.b4_teslim_denetle(p);\n", "fis_kes", once=True)
Y["fis_iptal"] = ekle(Y["fis_iptal"], "  v_cekler jsonb := '[]'::jsonb;",
    f"  v_zaten boolean;   -- {ISARET}: fiş (ve bağlısı) bu çağrıdan ÖNCE zaten iptal mi", "fis_iptal")
Y["fis_iptal"] = ekle(Y["fis_iptal"], "  hedefler := array[f.id] || case when f.bagli_fis is not null then array[f.bagli_fis] else '{}'::text[] end;",
    "  -- B5: zaten iptal fişin yeniden iptalinde (bayat cihaz, yanıt kaybı tekrarı) atama / kalem farkı YAZILMAZ; geçerli fişte farktan önce\n"
    "  -- teslim kilidi + bayat geri alma denetimi (b4_iptal_denetle). İptal ve fark aynı işlemde (bu fonksiyon).\n"
    "  v_zaten := f.iptal and not exists (select 1 from public.stk_fis ff where ff.id = any(hedefler) and not ff.iptal);\n"
    "  if jsonb_typeof(p -> 'alt') = 'object' and not v_zaten then\n"
    "    perform public.b4_iptal_denetle(p, hedefler);\n"
    "  end if;", "fis_iptal")
Y["fis_iptal"] = degistir(Y["fis_iptal"], "  if jsonb_typeof(p -> 'alt') = 'object' then\n    perform set_config('fis.kalem', 'acik', true);",
    "  if jsonb_typeof(p -> 'alt') = 'object' and not v_zaten then\n    perform set_config('fis.kalem', 'acik', true);", "fis_iptal")
Y["fis_iptal_toplu"] = ekle(Y["fis_iptal_toplu"], "  ilk boolean := true;", f"  v_alt boolean;   -- {ISARET}", "fis_iptal_toplu")
Y["fis_iptal_toplu"] = degistir(Y["fis_iptal_toplu"],
    "    sonuc:=sonuc||jsonb_build_array(public.fis_iptal(jsonb_build_object('no',no,'sebep',p->>'sebep','alt',case when ilk then p->'alt' else null end)));\n    ilk:=false;",
    "    -- B5: atama / kalem farkı zaten iptal fişe değil, iptal edilmemiş İLK fişe gider (zaten iptal fişte fis_iptal onu yazmaz)\n"
    "    v_alt := ilk and not coalesce((select ff.iptal from public.stk_fis ff where ff.id = no), false);\n"
    "    sonuc:=sonuc||jsonb_build_array(public.fis_iptal(jsonb_build_object('no',no,'sebep',p->>'sebep','alt',case when v_alt then p->'alt' else null end)));\n"
    "    if v_alt then ilk:=false; end if;", "fis_iptal_toplu")

yeni = [x.strip() for x in oku("yeni.sql").split("\n-- @@\n")]
yeni = [re.sub(r"\A(--[^\n]*\n)+", "", x).strip() for x in yeni]
yeni = [x for x in yeni if x]

def ic(s):
    """do bloğunun İÇİNE: $$ / $function$ gövdesi tek tırnakla (gövde bayt bayt aynı), dış kısım girintili."""
    m = re.search(r"\$(function)?\$", s)
    if m:
        etiket = m.group(0)
        i, j = s.index(etiket), s.rindex(etiket)
        govde = s[i + len(etiket):j]
        if "$" in govde:
            sys.exit("gövdede dolar: " + s[:70])
        on, son = s[:i].rstrip(), s[j + len(etiket):].strip().rstrip(";").rstrip()
        if "$" in on + son:
            sys.exit("ifadede dolar: " + s[:70])
        return "  " + on.replace("\n", "\n  ") + " '" + govde.replace("'", "''") + "'" + (" " + son if son else "") + ";"
    if "$" in s:
        sys.exit("ifadede dolar: " + s[:70])
    return "  " + s.rstrip(";").replace("\n", "\n  ") + ";"

sq = lambda x: "'" + x.replace("'", "''") + "'"
def yurut(a, govde):
    """üç canlı fonksiyonun (yeniden) tanımı: başlık (pg_get_functiondef biçimi) + CRLF gövde, execute ile."""
    if "$" in govde or "$" in BAS[a]:
        sys.exit(f"{a}: dolar işareti")
    return f"  execute {sq(BAS[a])} || quote_literal(replace({sq(govde)}, chr(10), chr(13) || chr(10)));"
def okunur(a, govde):
    return BAS[a] + "$function$" + govde + "$function$;"

def md5_ifade(a):
    return f"md5(pg_get_functiondef('public.{a}(jsonb)'::regprocedure))"

ONKOSUL = f"""-- =====================================================================================================================
--  27-b4-onkosul-salt-okur.sql — B4 / B5 ÖNKOŞUL / SONUÇ — SALT OKUR. ÜRETİLDİ (27-b4-uret.py). Hiçbir şey yazmaz.
--  Her fonksiyon: HAZIR (canlıdaki 1.744.37 gövdesi, md5) · UYGULANMIŞ (B4 imzalı gövde) · FARKLI (başka bir değişiklik, ör. G-25 — DUR).
-- =====================================================================================================================
with f(no, ad, md5_canli) as (values (1, 'fis_kes', '{CANLI['fis_kes']}'), (2, 'fis_iptal', '{CANLI['fis_iptal']}'), (3, 'fis_iptal_toplu', '{CANLI['fis_iptal_toplu']}')),
d as (
  select f.no, f.ad || '(jsonb)' as kontrol,
         case when p.oid is null then 'YOK'
              when md5(pg_get_functiondef(p.oid)) = f.md5_canli then 'HAZIR'
              when position('{ISARET}' in pg_get_functiondef(p.oid)) > 0 then 'UYGULANMIŞ'
              else 'FARKLI (md5 ' || md5(pg_get_functiondef(p.oid)) || ')' end as durum
    from f left join pg_proc p on p.oid = to_regprocedure('public.' || f.ad || '(jsonb)')
  union all
  select 4, 'b4_teslim_denetle · b4_iptal_denetle (yetki: authenticated çalıştıramaz)',
         case when to_regprocedure('public.b4_teslim_denetle(jsonb)') is null and to_regprocedure('public.b4_iptal_denetle(jsonb,text[])') is null then 'yok'
              when to_regprocedure('public.b4_teslim_denetle(jsonb)') is not null and to_regprocedure('public.b4_iptal_denetle(jsonb,text[])') is not null
                   and not has_function_privilege('authenticated', 'public.b4_teslim_denetle(jsonb)', 'execute')
                   and not has_function_privilege('authenticated', 'public.b4_iptal_denetle(jsonb,text[])', 'execute') then 'var'
              else 'EKSİK / YETKİ YANLIŞ' end)
select no, kontrol, durum from d
union all
select 99, 'GENEL', case
  when (select count(*) from d where no <= 3 and durum = 'HAZIR') = 3 and (select durum from d where no = 4) = 'yok' then 'HAZIR'
  when (select count(*) from d where no <= 3 and durum = 'UYGULANMIŞ') = 3 and (select durum from d where no = 4) = 'var' then 'UYGULANMIŞ'
  else 'FARKLI — DUR (beklenmeyen gövde; ör. G-25 uygulanmış)' end
order by 1;
"""
onkosul_sorgu = "\n".join(x for x in ONKOSUL.split("\n") if not x.startswith("--")).strip()

def bekci(beklenen):
    """do bloğunun başı: postgres rolü + her gövde beklenen durumda (HAZIR ya da UYGULANMIŞ)."""
    satirlar = ["  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then",
                "    raise exception 'B4 postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;", "  end if;"]
    for a in CANLI:
        kosul = {"uygula": f"{md5_ifade(a)} <> '{CANLI[a]}' and position('{ISARET}' in pg_get_functiondef('public.{a}(jsonb)'::regprocedure)) = 0",
                 "geri": f"position('{ISARET}' in pg_get_functiondef('public.{a}(jsonb)'::regprocedure)) = 0 and {md5_ifade(a)} <> '{CANLI[a]}'"}[beklenen]
        satirlar += [f"  if {kosul} then",
                     f"    raise exception '{a}: beklenmeyen gövde (canlı 1.744.37 de B4 de değil — ör. G-25). Hiçbir şey değişmedi.';", "  end if;"]
    return "\n".join(satirlar)

BASLIK = """-- =====================================================================================================================
--  {ad} — ÜRETİLDİ (stok-v2/guvenlik/27-b4-uret.py; ELLE DÜZENLENMEZ)
--  {ne}
--  SQL Editor: dosyanın TAMAMI, bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- ====================================================================================================================="""

uygula = BASLIK.format(ad="27-b4-uygula.sql", ne="B4 / B5 KURULUMU: üretim teslimi ve bayat geri alma koruması (fis_kes, fis_iptal, fis_iptal_toplu + 2 denetim fonksiyonu). Veri değişmez.") + "\ndo $$\nbegin\n" + bekci("uygula") + "\n" \
    + "\n".join(ic(x) for x in yeni) + "\n" + "\n".join(yurut(a, Y[a]) for a in CANLI) + "\n" \
    + "\n".join(f"  if position('{ISARET}' in pg_get_functiondef('public.{a}(jsonb)'::regprocedure)) = 0 then raise exception 'B4 doğrulama: {a} yamalı değil — kurulum GERİ ALINDI'; end if;" for a in CANLI) \
    + "\nend $$;\n" + onkosul_sorgu + "\n"
geri = BASLIK.format(ad="27-b4-geri-al.sql", ne="B4 / B5 GERİ ALMA (AYRI ONAYLA): üç gövde canlı 1.744.37 hâline BİREBİR döner (md5 doğrulanır), b4_* kalkar. B4 / B5 açıkları yeniden açılır.") \
    + "\ndo $$\nbegin\n" + bekci("geri") + "\n" + "\n".join(yurut(a, ESKI[a]) for a in CANLI) + "\n" \
    + "  drop function if exists public.b4_teslim_denetle(jsonb);\n  drop function if exists public.b4_iptal_denetle(jsonb, text[]);\n" \
    + "\n".join(f"  if {md5_ifade(a)} <> '{CANLI[a]}' then raise exception 'B4 geri alma doğrulaması: {a} canlı gövdeye dönmedi — HİÇBİR şey değişmedi'; end if;" for a in CANLI) \
    + "\nend $$;\n" + onkosul_sorgu + "\n"
kaynak = BASLIK.format(ad="27-b4-uretim-teslim.sql", ne="OKUNUR KAYNAK (yerel sınama psql ile kurar). SQL Editor'e 27-b4-uygula.sql yapıştırılır, bu değil.") \
    + "\nbegin;\n" + "\n\n".join(x.rstrip(";") + ";" for x in yeni) + "\n\n" + "\n\n".join(okunur(a, Y[a]) for a in CANLI) + "\ncommit;\n"

for ad, metin in (("uygula", uygula), ("geri", geri)):
    if metin.count("$$") != 2:
        sys.exit(f"{ad}: $$ sayısı {metin.count('$$')} (2 olmalı)")
    if "$" in metin.replace("$$", ""):
        sys.exit(f"{ad}: $$ dışında dolar işareti")
hedef = {"27-b4-uygula.sql": uygula, "27-b4-geri-al.sql": geri, "27-b4-uretim-teslim.sql": kaynak, "27-b4-onkosul-salt-okur.sql": ONKOSUL}
if "--denetle" in sys.argv:
    farkli = [a for a, m in hedef.items() if not os.path.exists(os.path.join(G, a)) or open(os.path.join(G, a), encoding="utf-8").read() != m]
    print("üretilenler diskteki ile " + ("AYNI" if not farkli else "FARKLI: " + ", ".join(farkli)))
    sys.exit(1 if farkli else 0)
for a, m in hedef.items():
    open(os.path.join(G, a), "w", encoding="utf-8").write(m)
print("yazıldı: " + " · ".join(hedef))
