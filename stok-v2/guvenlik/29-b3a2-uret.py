#!/usr/bin/env python3
# B3a-2 PAKET ÜRETİCİSİ (27 Kasım). Kaynak: 29-b3a2-kaynak/kaynak.sql ("-- @@" ile ayrılmış ifadeler; okunur, yerel sınama psql ile
# kurabilir). Üretilenler (ELLE DÜZENLENMEZ; --denetle diskteki ile aynı mı bakar):
#   29-b3a2-uygula.sql  — SQL Editor için TEK do-bloğu (ya hepsi ya hiç) + salt okur doğrulama
#   29-b3a2-geri-al.sql — tetikleyiciler ve b3a2_* fonksiyonları kalkar (tek do-bloğu); B3a (28) ve B4 (27) paketlerine DOKUNMAZ
# Yöntem 26-b1-uret.py / 27-b4-uret.py ile aynı: gövde çift-dolar yerine tek tırnakla, gövde metni bayt bayt aynı.
import os, re, sys
G = os.path.dirname(os.path.abspath(__file__))
kaynak = open(os.path.join(G, "29-b3a2-kaynak", "kaynak.sql"), encoding="utf-8").read()
ifadeler = [re.sub(r"\A(--[^\n]*\n)+", "", x.strip()).strip() for x in kaynak.split("\n-- @@\n")]
ifadeler = [x for x in ifadeler if x]
def ic(s):
    if "$$" in s:
        i, j = s.index("$$"), s.rindex("$$")
        govde = s[i + 2:j]
        on, son = s[:i].rstrip(), s[j + 2:].strip().rstrip(";").rstrip()
        if "$" in govde + on + son:
            sys.exit("dolar işareti: " + s[:70])
        return "  " + on.replace("\n", "\n  ") + " '" + govde.replace("'", "''") + "'" + (" " + son if son else "") + ";"
    if "$" in s:
        sys.exit("dolar işareti: " + s[:70])
    return "  " + s.rstrip(";").replace("\n", "\n  ") + ";"
FONK = ["b3a2_cariler()", "b3a2_urunler()", "b3a2_tanimlar()", "b3a2_kurallar(jsonb, boolean)", "b3a2_red(text, text)", "b3a2_liste_fark(jsonb, jsonb)",
        "b3a2_serbest()", "b3a2_bos(jsonb)", "b3a2_yazar()", "b3a2_y(text, text)"]
DOGRULA = """select 'b3a2 fonksiyonları (10 olmalı)' as kontrol, (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\\_%')::text as durum
union all
select 'b3a2_alan_koru tetikleyicisi (cariler, tanimlar, urunler — etkin)', coalesce((select string_agg(c.relname, ', ' order by c.relname) from pg_trigger g join pg_class c on c.oid = g.tgrelid
   where g.tgname = 'b3a2_alan_koru' and g.tgenabled = 'O'), 'yok')
union all
select 'GENEL', case when (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\\_%') = 10
   and (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru' and tgenabled = 'O') = 3 then 'KURULU'
   when not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\\_%') and not exists (select 1 from pg_trigger where tgname = 'b3a2_alan_koru') then 'KURULU DEĞİL'
   else 'YARIM — DUR' end;
"""
BAS = """-- =====================================================================================================================
--  {ad} — ÜRETİLDİ (stok-v2/guvenlik/29-b3a2-uret.py; ELLE DÜZENLENMEZ). Kaynak ve açıklama: 29-b3a2-kaynak/kaynak.sql
--  {ne}
--  SQL Editor: dosyanın TAMAMI, bir kez Run. İlk ifade ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
do $$
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'B3a-2 postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
"""
uygula = BAS.format(ad="29-b3a2-uygula.sql", ne="B3a-2 KURULUMU: cariler / urunler (fiyat) / tanimlar alan ve işlem bazında yazma yetkisi. Veri değişmez.") + """  if to_regprocedure('public.yetki_var_mi(text[],text)') is null or to_regprocedure('public.yonetici_mi()') is null then
    raise exception 'B3a-2 önkoşulu: yetki_var_mi / yonetici_mi yok. Hiçbir şey değişmedi.';
  end if;
""" + "\n".join(ic(x) for x in ifadeler) + """
  if (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru' and tgenabled = 'O') <> 3 then
    raise exception 'B3a-2 doğrulama: tetikleyici sayısı 3 değil — kurulum GERİ ALINDI';
  end if;
end $$;
""" + DOGRULA
geri = BAS.format(ad="29-b3a2-geri-al.sql", ne="B3a-2 GERİ ALMA (AYRI ONAYLA): üç tetikleyici ve on fonksiyon kalkar. Alan bazlı koruma kalkar; B3a ve B4 paketleri etkilenmez.") \
    + "".join(f"  drop trigger if exists b3a2_alan_koru on public.{t};\n" for t in ("cariler", "urunler", "tanimlar")) \
    + "".join(f"  drop function if exists public.{f};\n" for f in FONK) + """  if exists (select 1 from pg_trigger where tgname = 'b3a2_alan_koru') or exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\\_%') then
    raise exception 'B3a-2 geri alma doğrulaması tutmadı — HİÇBİR şey değişmedi';
  end if;
end $$;
""" + DOGRULA
for m in (uygula, geri):
    if m.count("$$") != 2 or "$" in m.replace("$$", ""):
        sys.exit("$$ kuralı tutmuyor")
hedef = {"29-b3a2-uygula.sql": uygula, "29-b3a2-geri-al.sql": geri}
if "--denetle" in sys.argv:
    f = [a for a, m in hedef.items() if not os.path.exists(os.path.join(G, a)) or open(os.path.join(G, a), encoding="utf-8").read() != m]
    print("üretilenler diskteki ile " + ("AYNI" if not f else "FARKLI: " + ", ".join(f))); sys.exit(1 if f else 0)
for a, m in hedef.items():
    open(os.path.join(G, a), "w", encoding="utf-8").write(m)
print("yazıldı: " + " · ".join(hedef))
