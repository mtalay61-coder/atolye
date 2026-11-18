#!/usr/bin/env python3
# 24 — A6 DÜZELTMESİ ÜRETİCİSİ (18 Kasım 2026). Üretilen dosyalar elle düzenlenmez:
#   24-a6-tanim-kimligi.sql          düzeltme (SQL Editor, tek Run)
#   24-a6-tanim-kimligi-geri-al.sql  geri alma (ESKİ gövdeler birebir — A6 AÇIĞINI YENİDEN AÇAR)
#   24-a6-onkosul-salt-okur.sql      durum: HAZIR / UYGULANMIŞ / KARIŞIK / EKSİK (salt okur, tek select)
# ve kaynakları (rls-rol.sql, rls-yazma.sql) yeni gövdelerle günceller — eski dosyalar yeniden çalıştırılınca açık geri gelmesin.
#
# A6 (deneme projesi 18 Kasım, gerçek Supabase): yetkisi olmayan personel `update tanimlar set id = 'başka' where id = 'tekil'`
# yapabiliyordu (koruma tetikleyicisi yalnız kullanicilar / girisAktifMi değişimine bakıyordu); ardından yetki_var_mi 'tekil'
# satırını bulamayınca HERKESE "evet" diyordu → tek istekle bütün modül yetkileri (kasa, fiş, stok). Düzeltme iki katmanlı:
#   1) tanimlar_kullanici_koruma: JWT'li her istekte (Yönetici dahil — uygulama tanımlar kimliğini hiç değiştirmez) id değişimi RET.
#   2) yetki_var_mi: satır yoksa / bozuksa (veri nesne değil, kullanicilar dizi değil, girisAktifMi yok ya da boolean değil)
#      JWT'li çağrıya RET. "Giriş sistemi kapalı → herkes yetkili" yalnız girisAktifMi AÇIKÇA false ise (o alanı yalnız Yönetici
#      değiştirebilir). JWT'siz çağrı (servis rolü, SQL Editor) eskisi gibi serbest — stk_yetki ve yazma_yetkisi_koruma zaten
#      JWT yoksa yetki_var_mi'yi çağırmadan döner.
# İlk yönetici kurulumu korunur: tablo BOŞKEN ilk satırı eklemek serbest (uygulamanın ilk kurulum ekranı / rehberdeki SQL).
import hashlib, os, re, subprocess, sys

K = os.path.dirname(os.path.abspath(__file__)); A = os.path.abspath(os.path.join(K, "..", ".."))


def govde(dosya, ad):
    s = open(os.path.join(A, dosya), encoding="utf-8").read()
    m = re.search(r"create or replace function public\." + ad + r"\(.*?^end \$\$;\n", s, re.S | re.M)
    if not m:
        sys.exit(f"{dosya}: {ad} bulunamadı")
    return m.group(0)


YENI_KORUMA = """create or replace function public.tanimlar_kullanici_koruma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Servis rolü (jetonsuz) → yönetim işi, dokunma.
  if auth.jwt() is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then
    if not public.yonetici_mi() then
      raise exception 'Tanımları yalnız Yönetici silebilir' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if exists (select 1 from public.tanimlar t where t.id = new.id) then return new; end if;
    -- İlk yönetici kurulumu: tablo BOŞKEN ilk satır serbest (silme ve kimlik değişimi korunduğu için sonradan boşaltılamaz).
    if not exists (select 1 from public.tanimlar) then return new; end if;
    if not public.yonetici_mi() then
      raise exception 'Tanımlar satırını yalnız Yönetici ekleyebilir' using errcode = '42501';
    end if;
    return new;
  end if;
  -- A6 (18 Kasım): satırın KİMLİĞİ değişmez — 'tekil' başka ada taşınırsa yetki_var_mi / yonetici_mi satırı bulamıyordu.
  -- Yönetici dahil: uygulama tanımlar kimliğini hiç değiştirmez; gerekirse jetonsuz (SQL Editor) yapılır.
  if new.id is distinct from old.id then
    raise exception 'Tanımlar satırının kimliği değiştirilemez' using errcode = '42501';
  end if;
  if ((coalesce(new.veri -> 'kullanicilar', '[]'::jsonb)) is distinct from (coalesce(old.veri -> 'kullanicilar', '[]'::jsonb))
      or (new.veri -> 'girisAktifMi') is distinct from (old.veri -> 'girisAktifMi'))
     and not public.yonetici_mi() then
    raise exception 'Kullanıcı listesini ve giriş ayarını yalnız Yönetici değiştirebilir' using errcode = '42501';
  end if;
  return new;
end $$;
"""

YENI_YETKI = """create or replace function public.yetki_var_mi(moduller text[], islem text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t jsonb;
  eposta text;
  k jsonb;
  aday text;
  m text;
begin
  select veri into t from public.tanimlar where id = 'tekil';
  -- A6 (18 Kasım): satır YOKSA ya da BOZUKSA jetonlu çağrıya yetki VERİLMEZ (eskiden "evet" diyordu). Jetonsuz çağrı (servis
  -- rolü, SQL Editor) yönetim işidir, serbest kalır.
  if t is null or jsonb_typeof(t) <> 'object' or jsonb_typeof(t -> 'girisAktifMi') is distinct from 'boolean'
     or jsonb_typeof(t -> 'kullanicilar') is distinct from 'array' then
    return auth.jwt() is null;
  end if;
  -- Giriş sistemi BİLEREK kapalıysa (yalnız Yönetici değiştirebilir) kısıt yok.
  if (t ->> 'girisAktifMi')::boolean = false then return true; end if;
  eposta := lower(coalesce(auth.jwt() ->> 'email', ''));
  if eposta = '' then return false; end if;
  for k in select jsonb_array_elements(t -> 'kullanicilar') loop
    aday := lower(coalesce(k ->> 'eposta', ''));
    if aday = '' then
      aday := regexp_replace(lower(translate(coalesce(k ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local';
    end if;
    if aday <> eposta then continue; end if;
    if coalesce(k ->> 'rol', '') = 'Yönetici' then return true; end if;
    foreach m in array moduller loop
      if coalesce((k -> 'yetkiler' -> m ->> islem)::boolean, false) then return true; end if;
    end loop;
    return false;
  end loop;
  return false;
end $$;
"""


def editor_temiz(s):
    # SQL Editor ifade ayırıcısı yalnız düz $$ bilir; yorum ve ardışık boş satırlar atılır (editor-icin.py ile aynı kural).
    satir = [l for l in s.splitlines() if not l.strip().startswith("--")]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(satir)).strip() + "\n"


def literal(sql):
    # Fonksiyon tanımını DO $$ … $$ içinde çalıştırılacak tek tırnaklı dizgeye çevirir: SQL Editor kuralı yalnız düz $$'a izin
    # verir ve dış $$ içinde ikinci bir $$ bloğu sonlandırır → iç $$'lar chr(36) || chr(36) ile kurulur, tek tırnaklar ikilenir.
    parca = sql.replace("'", "''").split("$$")
    return "'" + "' || chr(36) || chr(36) || '".join(parca) + "'"


def atomik(baslik_yorum, koruma, yetki, md5_koruma, md5_yetki, ad):
    # TEK İFADE (DO bloğu): SQL Editor ifadeleri ayrı oturumlarda gönderse bile iki fonksiyon ya BİRLİKTE kurulur ya hiç.
    # Sonda kurulan gövdeler md5 ile beklenenle karşılaştırılır; tutmazsa hata → blok bütünüyle geri alınır.
    norm = "md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\\n]*', '', 'g'), '\\s+', ' ', 'g')))"
    return (baslik_yorum +
        "do $$\n"
        "declare\n  g1 text;\n  g2 text;\n"
        "begin\n"
        "  execute " + literal(editor_temiz(koruma).rstrip()) + ";\n"
        "  execute " + literal(editor_temiz(yetki).rstrip()) + ";\n"
        f"  select {norm} into g1 from pg_proc p where p.oid = to_regprocedure('public.tanimlar_kullanici_koruma()');\n"
        f"  select {norm} into g2 from pg_proc p where p.oid = to_regprocedure('public.yetki_var_mi(text[], text)');\n"
        f"  if g1 is distinct from '{md5_koruma}' or g2 is distinct from '{md5_yetki}' then\n"
        f"    raise exception '{ad} DURDU: kurulan gövde beklenenle aynı değil (koruma %, yetki %) — HİÇBİR ŞEY DEĞİŞMEDİ', g1, g2;\n"
        "  end if;\n"
        f"  raise notice '{ad} TAMAM: iki fonksiyon birlikte kuruldu (koruma %, yetki %)', g1, g2;\n"
        "end $$;\n")


def md5_pg(sql_govde, db):
    # md5'i PostgreSQL hesaplar (onkosul dosyasıyla birebir aynı normalleştirme): geçici şemada kurup prosrc'den.
    ad = re.search(r"public\.(\w+)\(", sql_govde).group(1)
    g = sql_govde.replace("public." + ad + "(", "a6_md5." + ad + "(", 1)
    komut = ("begin; create schema a6_md5; set local check_function_bodies = off;\n" + g +
             f"\nselect md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\\n]*', '', 'g'), '\\s+', ' ', 'g'))) from pg_proc p "
             f"join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'a6_md5' and p.proname = '{ad}';\nrollback;\n")
    r = subprocess.run(["su", "postgres", "-c", f"psql -X -qAt -v ON_ERROR_STOP=1 -d {db}"], input=komut, capture_output=True, text=True)
    if r.returncode:
        sys.exit("md5 hesaplanamadı: " + r.stderr)
    return [l for l in r.stdout.splitlines() if re.fullmatch(r"[0-9a-f]{32}", l)][0]


def main():
    db = os.environ.get("A6_MD5_DB", "postgres")
    eski_koruma = govde("rls-rol.sql", "tanimlar_kullanici_koruma") if "A6 (18 Kasım)" not in govde("rls-rol.sql", "tanimlar_kullanici_koruma") else open(os.path.join(K, ".24-eski-koruma.sql"), encoding="utf-8").read()
    eski_yetki = govde("rls-yazma.sql", "yetki_var_mi") if "A6 (18 Kasım)" not in govde("rls-yazma.sql", "yetki_var_mi") else open(os.path.join(K, ".24-eski-yetki.sql"), encoding="utf-8").read()
    # Eski gövdeler bir kez saklanır (kaynaklar güncellendikten sonra üretici yeniden çalışınca geri alma yine ESKİYİ kursun).
    for ad, g in ((".24-eski-koruma.sql", eski_koruma), (".24-eski-yetki.sql", eski_yetki)):
        p = os.path.join(K, ad)
        if not os.path.exists(p):
            open(p, "w", encoding="utf-8").write(g)
    m = {"koruma_eski": md5_pg(eski_koruma, db), "koruma_yeni": md5_pg(YENI_KORUMA, db),
         "yetki_eski": md5_pg(eski_yetki, db), "yetki_yeni": md5_pg(YENI_YETKI, db)}
    bas = "-- " + "=" * 117 + "\n"

    open(os.path.join(K, "24-a6-tanim-kimligi.sql"), "w", encoding="utf-8").write(atomik(
        bas + "--  24-a6-tanim-kimligi.sql — A6 DÜZELTMESİ (ÜRETİLMİŞ: python3 stok-v2/guvenlik/24-uret.py; elle düzenlenmez)\n"
        "--  Önce 24-a6-onkosul-salt-okur.sql → GENEL = HAZIR olmalı. SQL Editor › tamamı › Run.\n"
        "--  TEK İFADE (DO bloğu): iki fonksiyon ya birlikte kurulur ya hiç; sonda gövdeler doğrulanır, tutmazsa hepsi geri alınır.\n"
        "--  1) tanimlar_kullanici_koruma: jetonlu istekte tanımlar satırının kimliği değiştirilemez (Yönetici dahil).\n"
        "--  2) yetki_var_mi: tanımlar satırı yoksa / bozuksa jetonlu çağrıya yetki verilmez (eskiden 'evet').\n"
        "--  Tetikleyici bağlantısı değişmez (aynı ad); yetkiler değişmez (create or replace sahibi ve izinleri korur).\n" + bas,
        YENI_KORUMA, YENI_YETKI, m["koruma_yeni"], m["yetki_yeni"], "A6 DÜZELTMESİ"))

    open(os.path.join(K, "24-a6-tanim-kimligi-geri-al.sql"), "w", encoding="utf-8").write(atomik(
        bas + "--  24-a6-tanim-kimligi-geri-al.sql — A6 DÜZELTMESİNİ GERİ ALIR (ÜRETİLMİŞ: 24-uret.py)\n"
        "--  !!! UYARI: Bu dosya A6 GÜVENLİK AÇIĞINI YENİDEN AÇAR — yetkisiz personel tanımlar kimliğini değiştirip bütün modül\n"
        "--  !!! yetkilerini kendine açabilir. Yalnız düzeltme uygulamayı bozduysa, geçici olarak ve kullanıcı onayıyla çalıştırın;\n"
        "--  !!! ardından sorun giderilip düzeltme yeniden uygulanmalı.\n"
        "--  İki fonksiyonun düzeltme ÖNCESİ gövdeleri birebir (rls-rol.sql / rls-yazma.sql, main b4594bc). TEK İFADE: ya ikisi ya hiçbiri.\n" + bas,
        eski_koruma, eski_yetki, m["koruma_eski"], m["yetki_eski"], "A6 GERİ ALMA"))

    open(os.path.join(K, "24-a6-onkosul-salt-okur.sql"), "w", encoding="utf-8").write(
        bas + "--  24-a6-onkosul-salt-okur.sql — A6 DÜZELTMESİNİN DURUMU (SALT OKUR, tek select; ÜRETİLMİŞ: 24-uret.py)\n"
        "--  GENEL: HAZIR = düzeltme öncesi bilinen hâl, uygulanabilir · UYGULANMIŞ = iki fonksiyon da yeni · KARIŞIK = biri yeni / biri\n"
        "--  eski ya da bilinmeyen gövde (hiçbir dosyayı çalıştırmayın, sonucu paylaşın) · EKSİK = tanımlar verisi düzeltmeye hazır değil\n"
        "--  (girisAktifMi boolean değil ya da kullanicilar dizi değil ya da listede Yönetici yok → düzeltme sonrası jetonlu yazmalar durur).\n"
        "--  Gövde karşılaştırması yorum ve boşluk dışı md5 ile (22 ile aynı yöntem). Kişisel veri dönmez (yalnız sayı / tür).\n"
        + bas +
        "with fn as (\n"
        "  select x.sira, x.ad, x.eski, x.yeni,\n"
        "         (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\\n]*', '', 'g'), '\\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure(x.ad)) as su_an\n"
        f"    from (values (1, 'public.tanimlar_kullanici_koruma()', '{m['koruma_eski']}', '{m['koruma_yeni']}'),\n"
        f"                 (2, 'public.yetki_var_mi(text[], text)', '{m['yetki_eski']}', '{m['yetki_yeni']}')) x(sira, ad, eski, yeni)\n"
        "),\n"
        "f as (select *, case when su_an is null then 'yok' when su_an = yeni then 'yeni' when su_an = eski then 'eski' else 'bilinmeyen' end as hal from fn),\n"
        "t as (select veri from public.tanimlar where id = 'tekil'),\n"
        "satir(sira, kontrol, sonuc) as (\n"
        "  select sira, ad, hal from f\n"
        "  union all select 3, 'tetikleyici tanimlar_kullanici_koruma bağlı', case when exists (select 1 from pg_trigger g where g.tgrelid = 'public.tanimlar'::regclass and g.tgname = 'tanimlar_kullanici_koruma' and g.tgenabled <> 'D') then 'var' else 'yok' end\n"
        "  union all select 4, 'tanimlar ''tekil'' satırı', case when exists (select 1 from t) then 'var' else 'yok' end\n"
        "  union all select 5, 'girisAktifMi türü', coalesce((select jsonb_typeof(veri -> 'girisAktifMi') from t), 'yok')\n"
        "  union all select 6, 'kullanicilar türü', coalesce((select jsonb_typeof(veri -> 'kullanicilar') from t), 'yok')\n"
        "  union all select 7, 'listedeki Yönetici sayısı', coalesce((select count(*)::text from t, jsonb_array_elements(case when jsonb_typeof(veri -> 'kullanicilar') = 'array' then veri -> 'kullanicilar' else '[]'::jsonb end) e where e ->> 'rol' = 'Yönetici'), '0')\n"
        "  union all select 8, 'tanimlar tablosundaki satır sayısı', (select count(*)::text from public.tanimlar)\n"
        ")\n"
        "select sira, kontrol, sonuc from satir\n"
        "union all\n"
        "select 99, 'GENEL', case\n"
        "  when (select sonuc from satir where sira = 3) <> 'var' or (select sonuc from satir where sira = 4) <> 'var'\n"
        "    or (select sonuc from satir where sira = 5) <> 'boolean' or (select sonuc from satir where sira = 6) <> 'array'\n"
        "    or (select sonuc from satir where sira = 7) = '0' then 'EKSİK'\n"
        "  when (select bool_and(hal = 'yeni') from f) then 'UYGULANMIŞ'\n"
        "  when (select bool_and(hal = 'eski') from f) then 'HAZIR'\n"
        "  else 'KARIŞIK' end\n"
        "order by 1;\n")

    # Kaynakları güncelle: eski dosyalar (rls-rol.sql / rls-yazma.sql) yeniden çalıştırılırsa açık geri gelmesin.
    for dosya, ad, yeni in (("rls-rol.sql", "tanimlar_kullanici_koruma", YENI_KORUMA), ("rls-yazma.sql", "yetki_var_mi", YENI_YETKI)):
        p = os.path.join(A, dosya); s = open(p, encoding="utf-8").read()
        s = s.replace(govde(dosya, ad), yeni, 1)
        open(p, "w", encoding="utf-8").write(s)
    print("üretildi:", m)


main()
