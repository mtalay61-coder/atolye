#!/usr/bin/env python3
# YALITILMIŞ DENEME — YAPI KURULUM DOSYASI ÜRETİCİSİ (30 Kasım, B4 / B5). Girdi: `pg_dump --schema-only --no-owner -n public` çıktısı
# (kaynak: canlı 25 / 25b dökümleriyle hizalanmış YEREL kopya; canlıya bağlanılmaz). Çıktı: yeni, BOŞ Supabase projesinin SQL Editor'ünde
# bir kez çalıştırılacak dosya. ÜRETİLEN DOSYA DEPOYA KONMAZ (canlı fonksiyon gövdelerinin tamamını içerir); bu betik konur.
#
# Neden pg_dump çıktısı olduğu gibi verilmiyor:
#   • SQL Editor ifadeleri ayrı isteklerle gönderebilir → `SET check_function_bodies = false` sonraki ifadelere taşınmaz, yarıda kalan
#     kurulum yarım yapı bırakır. Çıktı TEK `do $$ … $$` bloğudur: ya hepsi kurulur ya hiçbiri.
#   • Canlıdaki fonksiyon gövdelerinin çoğu CRLF satır sonlu. Editor / pano satır sonlarını değiştirirse gövdeler canlıdan farklı kurulur
#     ve 27-b4-onkosul "FARKLI" der. Çıktı dosyası yalnız LF içerir; her CR, kurulumda chr(13) ile YENİDEN üretilir (işaret: «CR»).
#   • Supabase yeni projede public şemasına varsayılan yetki (anon / authenticated / service_role) verir; döküm yalnız GRANT içerir. Önce
#     bu varsayılanlar alınır, sonra dökümün kendi yetkileri uygulanır → yetkiler kaynaktaki gibi.
# VERİ YOK: yalnız yapı. Tek satır eklenir: `stk_ayar` (hangi v2 parçalarının açık olduğu — bayraklar; tarih alanları kurulum anı).
# Kullanım: yapi-uret.py <pg_dump.sql> <stk_ayar.json> <çıktı.sql>
import json, re, sys

ham, ayar_json, cikti = sys.argv[1], sys.argv[2], sys.argv[3]
metin = open(ham, encoding="utf-8", newline="").read()
# pg_dump 16.10+ dosyanın başına / sonuna psql meta komutu koyar (\restrict <rastgele> / \unrestrict) — SQL değil, atılır.
metin = re.sub(r"(?m)^\\(un)?restrict [A-Za-z0-9]+\r?\n", "", metin)
if re.search(r"(?m)^\\", metin):
    sys.exit("beklenmeyen psql meta komutu")
ISARET = "«CR»"
if ISARET in metin:
    sys.exit("işaret metinde geçiyor")

# --- ifadelere böl: gövde dışında ';'. pg_dump gövdeyi $$ ile, gövdede dolar işareti varsa $_$ ile sarar (başka etiket beklenmez) ---
DOLAR = "\u00abD\u00bb"
if DOLAR in metin or re.search(r"\$[A-Za-z][A-Za-z0-9_]*\$", metin):
    sys.exit("beklenmeyen dolar etiketi / işaret")
parcalar, bas, i, govde, tirnak = [], 0, 0, None, False
while i < len(metin):
    if not tirnak:
        e = "$_$" if metin.startswith("$_$", i) else "$$" if metin.startswith("$$", i) else None
        if e and (govde is None or govde == e):
            govde = None if govde else e; i += len(e); continue
    c = metin[i]
    if not govde and c == "'":
        tirnak = not tirnak
    elif not govde and not tirnak and c == "-" and metin.startswith("--", i):
        j = metin.find("\n", i)
        j = len(metin) if j < 0 else j
        metin = metin[:i] + metin[j:]      # gövde dışı yorum atılır
        continue
    elif not govde and not tirnak and c == ";":
        parcalar.append(metin[bas:i].strip()); bas = i + 1
    i += 1
if metin[bas:].strip():
    parcalar.append(metin[bas:].strip())
parcalar = [p for p in parcalar if p]

sq = lambda x: "'" + x.replace("'", "''") + "'"
def cr(x):
    """CR / dolar içeren metin → LF-only, dolarsız ifade: replace(replace('…«CR»…«D»…', '«CR»', chr(13)), '«D»', chr(36))"""
    y = sq(x.replace(chr(13), ISARET).replace("$", DOLAR))
    if "\r" in x:
        y = f"replace({y}, {sq(ISARET)}, chr(13))"
    if "$" in x:
        y = f"replace({y}, {sq(DOLAR)}, chr(36))"
    return y

ATLA = re.compile(r"^(SET |SELECT pg_catalog\.set_config|CREATE SCHEMA public$|COMMENT ON SCHEMA public )", re.S)
satirlar, sayac = [], {"fonksiyon": 0, "crli": 0, "diger": 0, "atlanan": 0}
for p in parcalar:
    if ATLA.match(p):
        sayac["atlanan"] += 1; continue
    m = re.search(r"\$_?\$", p)
    if m:
        e = m.group(0)
        a, b = p.index(e), p.rindex(e)
        on, g, son = p[:a], p[a + len(e):b], p[b + len(e):]
        if "$" in on + son or (e == "$$" and "$" in g):
            sys.exit("dolar işareti: " + p[:80])
        if "\r" in on + son:
            sys.exit("başlıkta CR: " + p[:80])
        sayac["fonksiyon"] += 1
        sayac["crli"] += 1 if "\r" in g else 0
        satirlar.append(f"  execute {sq(on)} || quote_literal({cr(g)}) || {sq(son)};")
    else:
        if "$" in p:
            sys.exit("dolar işareti: " + p[:80])
        sayac["diger"] += 1
        satirlar.append(f"  execute {cr(p)};" if "\r" in p else "  " + p.replace("\n", "\n  ") + ";")

ayar = json.load(open(ayar_json, encoding="utf-8"))
for k in list(ayar):
    if k.endswith("gecis") or k.endswith("_donus"):
        ayar[k] = None
ayar_sql = ("  insert into public.stk_ayar select * from jsonb_populate_record(null::public.stk_ayar, " + sq(json.dumps(ayar, ensure_ascii=False)) + "::jsonb)"
            " on conflict do nothing;\n"
            + "".join(f"  update public.stk_ayar set {k} = now() where {k} is null and {k.replace('gecis', 'aktif') if k != 'gecis' else 'aktif'};\n"
                      for k in ayar if k.endswith("gecis")))

bas_blok = """-- =====================================================================================================================
--  B4 YALITILMIŞ DENEME — YAPI KURULUMU (ÜRETİLDİ: 27-b4-deneme/yapi-uret.py). YALNIZ yeni, BOŞ Supabase projesinde, bir kez.
--  Kaynak: canlı yapı dökümleriyle (25 / 25b) hizalı yerel kopya. VERİ YOK; yalnız yapı + stk_ayar bayrak satırı.
--  Tek ifade: ya bütünüyle kurulur ya hiç. Dolu projede ÇALIŞMAZ (bekçi). Ana projede / G-25 denemesinde ÇALIŞTIRILMAZ.
-- =====================================================================================================================
do $$
declare
  n int;
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'Yapı kurulumu postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  select count(*) into n from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'm');
  if n > 0 or exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace) then
    raise exception 'Bu proje BOŞ değil (public şemasında % tablo / görünüm ya da fonksiyon var). Yapı kurulumu yalnız yeni, boş projede çalışır. Hiçbir şey değişmedi.', n;
  end if;
  if to_regprocedure('auth.jwt()') is null or to_regprocedure('auth.uid()') is null or to_regclass('auth.users') is null then
    raise exception 'auth.jwt() / auth.uid() / auth.users yok — bu bir Supabase projesi değil. Hiçbir şey değişmedi.';
  end if;
  perform set_config('check_function_bodies', 'off', true);
  perform set_config('search_path', '', true);
  alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
  alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
  alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;
"""
son_blok = ayar_sql + """end $$;
select 'tablo' as tur, count(*)::text as sayi from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
union all select 'görünüm', count(*)::text from pg_class where relnamespace = 'public'::regnamespace and relkind = 'v'
union all select 'fonksiyon', count(*)::text from pg_proc where pronamespace = 'public'::regnamespace
union all select 'tetikleyici', count(*)::text from pg_trigger g join pg_class c on c.oid = g.tgrelid where c.relnamespace = 'public'::regnamespace and not g.tgisinternal
union all select 'politika', count(*)::text from pg_policies where schemaname = 'public'
union all select 'veri satırı (stk_ayar dışında 0 olmalı)', (select count(*) from public.tanimlar)::text;
"""
sonuc = bas_blok + "\n".join(satirlar) + "\n" + son_blok
if "\r" in sonuc:
    sys.exit("çıktıda CR kaldı")
if sonuc.count("$$") != 2 or "$" in sonuc.replace("$$", ""):
    sys.exit("çıktıda $$ kuralı tutmuyor")
open(cikti, "w", encoding="utf-8", newline="\n").write(sonuc)
print(f"yazıldı: {cikti} · {len(sonuc) // 1024} KB · {sonuc.count(chr(10))} satır · fonksiyon {sayac['fonksiyon']} (CRLF'li {sayac['crli']}) · diğer ifade {sayac['diger']} · atlanan {sayac['atlanan']}")
