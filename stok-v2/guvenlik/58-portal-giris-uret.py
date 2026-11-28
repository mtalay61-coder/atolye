#!/usr/bin/env python3
# PORTAL GİRİŞ DÜZELTMESİ üretici (28 Kasım): 58-portal-giris-uygula.sql / -geri-al.sql / -durum-salt-okur.sql.
# Kural: tek do bloğu, yalnız düz `$$`. Gövde site-portal.sql'den okunur (tek kaynak); geri alma eski satırı geri koyar.
import os, re, hashlib
D = os.path.dirname(os.path.abspath(__file__)); KOK = os.path.join(D, "..", "..")
s = open(os.path.join(KOK, "site-portal.sql"), encoding="utf8").read()
m = re.search(r"create or replace function public\.portal_giris\(p_kullanici text, p_sifre text\)\nreturns text\nlanguage plpgsql volatile security definer set search_path = public, extensions\nas \$\$\n(.*?)\n\$\$;", s, re.S)
YENI = m.group(1)
ESKI_SATIR = "  if exists (select 1 from cariler c where c.id::text = h.cari_id and coalesce(c.pasif, false)) then return null; end if;\n"
blok = re.search(r"  -- CARİ MEVCUT VE ETKİN OLMALI.*?then return null; end if;\n", YENI + "\n", re.S).group(0)
ESKI = (YENI + "\n").replace(blok, ESKI_SATIR).rstrip("\n")
assert ESKI != YENI and "$" not in YENI and "not exists (select 1 from cariler" not in ESKI
def q(g): return "'" + g.replace("'", "''") + "'"
# Gövde özeti: satır sonu ve baş/son boşluk farkından bağımsız (SQL Editor CRLF yapıştırabilir).
def oz(g): return hashlib.md5(re.sub(r"\s+", " ", g).strip().encode("utf8")).hexdigest()
OZ_SQL = "md5(btrim(regexp_replace(p.prosrc, '\\s+', ' ', 'g')))"
BASLIK = """-- =====================================================================================================================
--  58-portal-giris-%s.sql — ÜRETİLDİ (stok-v2/guvenlik/58-portal-giris-uret.py; ELLE DÜZENLENMEZ).
--  %s
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
"""
DURUM = f"""select case {OZ_SQL} when '{oz(YENI)}' then 'YENİ — cari mevcut ve etkin olmalı' when '{oz(ESKI)}' then 'ESKİ — yalnız pasif cariye bakıyor' else 'BEKLENMEYEN GÖVDE — sonucu gönder' end as portal_giris,
       p.prosecdef as guvenlik_tanimlayici, array_to_string(p.proconfig, ', ') as ayar,
       has_function_privilege('anon', p.oid, 'execute') as anon_cagirabilir, has_function_privilege('authenticated', p.oid, 'execute') as giris_yapmis_cagirabilir,
       (select count(*) from public.site_hesaplari h where not exists (select 1 from public.cariler c where c.id::text = h.cari_id)) as carisi_olmayan_hesap,
       (select count(*) from public.site_hesaplari h join public.cariler c on c.id::text = h.cari_id where coalesce(c.pasif, false)) as carisi_pasif_hesap
  from pg_proc p where p.oid = to_regprocedure('public.portal_giris(text,text)');
"""
def paket(ad, aciklama, govde, beklenen_once):
    t = BASLIK % (ad, aciklama)
    t += "do $$\ndeclare\n  o text;\nbegin\n"
    t += "  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then\n    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;\n  end if;\n"
    t += f"  select {OZ_SQL} into o from pg_proc p where p.oid = to_regprocedure('public.portal_giris(text,text)');\n"
    t += "  if o is null then raise exception 'portal_giris(text,text) bulunamadı. Hiçbir şey değişmedi.'; end if;\n"
    t += f"  if o not in ('{oz(YENI)}', '{oz(ESKI)}') then\n    raise exception 'portal_giris gövdesi beklenen iki sürümden biri değil (özet %). Hiçbir şey değişmedi — sonucu gönderin.', o;\n  end if;\n"
    t += f"  create or replace function public.portal_giris(p_kullanici text, p_sifre text) returns text language plpgsql volatile security definer set search_path = public, extensions as {q(govde)};\n"
    t += "end $$;\n" + DURUM
    return t
for ad, ic in (("58-portal-giris-uygula.sql", paket("uygula", "PORTAL GİRİŞİ: site hesabıyla giriş için cari MEVCUT ve ETKİN olmalı. Yalnız portal_giris gövdesi değişir; yetkiler,\n--  hesaplar, oturumlar ve talepler olduğu gibi kalır (hiçbir hesap silinmez, hiçbir oturum kapatılmaz).", YENI, ESKI)),
               ("58-portal-giris-geri-al.sql", paket("geri-al", "GERİ ALMA (AYRI ONAYLA): portal_giris eski gövdesine döner (yalnız pasif cariye bakar). Veriye dokunmaz.", ESKI, YENI)),
               ("58-portal-giris-durum-salt-okur.sql", "-- PORTAL GİRİŞ DURUMU — SALT OKUR. Hiçbir şey yazmaz; giriş denemez.\n" + DURUM)):
    assert len(re.findall(r"\$", ic)) in (0, 4), (ad, "dolar")
    open(os.path.join(D, ad), "w", encoding="utf8", newline="\n").write(ic); print(ad, len(ic), "bayt")
