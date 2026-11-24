#!/usr/bin/env python3
# G-25 PAKET ÜRETİCİSİ (23 Kasım). Kaynaklar:
#   stok-v2/guvenlik/25-kaynak/yeni.sql      — yeni nesneler ("-- @@" ile ayrılmış ifadeler)
#   stok-v2/editor/15-duzeltme.sql            — car_yaz (geçerli tanım)
#   stok-v2/editor/18-fis-defteri.sql         — fis_kes, fis_iptal (geçerli tanım)
# Üç fonksiyona birer G-25 satırı eklenir (ÇAPA satırından sonra; çapa tam bir kez bulunmalı). Üretilenler (elle düzenlenmez):
#   25-onkosul-salt-okur.sql · 25-cari-yetki-uygula.sql · 25-sonra-dogrula-salt-okur.sql · 25-cari-yetki-geri-al.sql
# Gövde özeti Faz 0.4 envanterinin formülüyle (yorum ve boşluk normalize; md5) — canlıdaki Editor kurulumuyla yereldeki aynı çıkar.
# Kullanım: python3 stok-v2/guvenlik/25-uret.py [--denetle]   (--denetle: üretilen dosyalar diskteki ile aynı mı; değilse çıkış 1)
import hashlib, os, re, sys

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
G = os.path.join(KOK, "stok-v2", "guvenlik")
ETIKET = "$g25s$"
# Canlı envanterinden (t24/sonuc-faz04-envanter-canli-2026-11-20.txt, F satırları) — kaynakla aynı olduğu üreticide denetlenir
CANLI_FIS_KES = "7b4e3f2474c25784e92d0f91a9053af2"
CANLI_YETKI_VAR_MI = "148fc08c0e06e554b0f81478f8e26931"

def oku(yol):
    with open(os.path.join(KOK, yol), encoding="utf-8") as f:
        return f.read()

def blok(metin, ad):
    """create or replace function public.<ad>( … satırından ilk 'end $$;' satırına kadar."""
    satirlar = metin.split("\n")
    bas = [i for i, s in enumerate(satirlar) if s.startswith(f"create or replace function public.{ad}(")]
    if len(bas) != 1:
        sys.exit(f"{ad}: tanım {len(bas)} kez (1 olmalı)")
    for j in range(bas[0], len(satirlar)):
        if satirlar[j] == "end $$;":
            return "\n".join(satirlar[bas[0]:j + 1])
    sys.exit(f"{ad}: 'end $$;' bulunamadı")

def ekle(tanim, capa, eklenecek, ad):
    if tanim.count(capa) != 1:
        sys.exit(f"{ad}: çapa {tanim.count(capa)} kez (1 olmalı): {capa!r}")
    return tanim.replace(capa, capa + "\n" + eklenecek, 1)

def govde(tanim):
    i = tanim.index("$$") + 2
    j = tanim.rindex("$$")
    return tanim[i:j]

def ozet(tanim):
    g = re.sub(r"--[^\n]*", "", govde(tanim))
    g = re.sub(r"\s+", " ", g).strip()
    return hashlib.md5(g.encode("utf-8")).hexdigest()

# --- kaynaklar -----------------------------------------------------------------------------------------------------------
k15, k18 = oku("stok-v2/editor/15-duzeltme.sql"), oku("stok-v2/editor/18-fis-defteri.sql")
ESKI = {"car_yaz": blok(k15, "car_yaz"), "fis_kes": blok(k18, "fis_kes"), "fis_iptal": blok(k18, "fis_iptal")}
YENI = {
    "car_yaz": ekle(ESKI["car_yaz"],
        "  perform public.stk_yetki(array['cari', 'fisler', 'muhasebe', 'siparis', 'uretim', 'stok', 'tanimlar'], 'kaydetme');",
        "  -- G-25: fiş dışından (kapı kapalı — eski zarf yazıcıları) satır ya da iptal yalnız cari / muhasebe kaydetme ile. Kapı fis_kapi_acik()'ın\n"
        "  -- gövdesiyle AYNI ifadeyle okunur, fonksiyon çağrılmaz: o fonksiyonun VARLIĞI 'fiş defteri kurulu' işaretidir (kas_hesap_kilitle,\n"
        "  -- tutarsız satır denetimi) — defterden önce kurulan dosyaya eklenirse onları erken açar (24 Kasım, sinama-kasa yakaladı).\n"
        "  if coalesce(current_setting('fis.kapi', true), '') <> 'acik' and (jsonb_array_length(public.stk_dizi(p -> 'satirlar')) > 0\n"
        "      or jsonb_array_length(public.stk_dizi(p -> 'iptal')) > 0) then\n"
        "    perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'kaydetme', 'fiş dışından cari hareketi');\n"
        "  end if;", "car_yaz"),
    "fis_kes": ekle(ESKI["fis_kes"],
        "      'kalemler', public.fis_kalem_durumlari(v_idler), 'karsilananDuzeltme', '[]'::jsonb);\n  end if;",
        "  perform public.g25_fis_cari_yetki(p);   -- G-25: cari satırının yetkisi ve stok / üretim bağlantısı (yazmadan önce)", "fis_kes"),
    "fis_iptal": ekle(ESKI["fis_iptal"],
        "  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'silme');",
        "  perform public.g25_fis_iptal_yetki(no);   -- G-25 (K5): kayıtlı içeriğe göre grubun silme yetkisi", "fis_iptal"),
}
IMZA = {"car_yaz": "(jsonb)", "fis_kes": "(jsonb)", "fis_iptal": "(jsonb)"}
O_ESKI = {a: ozet(t) for a, t in ESKI.items()}
O_YENI = {a: ozet(t) for a, t in YENI.items()}
if O_ESKI["fis_kes"] != CANLI_FIS_KES:
    sys.exit(f"fis_kes kaynağı canlı envanterden farklı: {O_ESKI['fis_kes']} ≠ {CANLI_FIS_KES}")

ifadeler = [x.strip() for x in oku("stok-v2/guvenlik/25-kaynak/yeni.sql").split("\n-- @@\n")]
ifadeler = [re.sub(r"\A(--[^\n]*\n)+", "", x).strip().rstrip(";") for x in ifadeler]
ifadeler = [x for x in ifadeler if x]
for x in ifadeler + list(YENI.values()):
    if ETIKET in x:
        sys.exit(f"kaynakta {ETIKET} geçiyor")
YENI_FONK = sorted(set(re.findall(r"create or replace function (public\.[a-z0-9_]+)\(", "\n".join(ifadeler))))
YENI_FONK_IMZA = {
    "public.g25_yetki_iste": "(text[], text, text)", "public.g25_stok_bagi": "(jsonb, jsonb, jsonb, jsonb)",
    "public.g25_uretim_bagi": "(jsonb, jsonb, jsonb, jsonb)", "public.g25_fis_cari_yetki_tek": "(jsonb, jsonb, jsonb, jsonb, jsonb)",
    "public.g25_fis_cari_yetki": "(jsonb)", "public.g25_fis_iptal_yetki": "(text)", "public.mesai_bildir": "(jsonb)",
    "public.mesai_bildirimleri": "(jsonb)", "public.mesai_bildirim_iptal": "(jsonb)", "public.mesai_onayla": "(jsonb)",
    "public.g25_ucret_ozeti": "(jsonb)", "public.g25_tanimlar_ucret_koruma": "()",
    "public.g25_mesai_anahtari": "(text, text)", "public.g25_mesai_tahakkuku": "(text, text)", "public.g25_mesai_tutari": "(text, jsonb)",
    # Ücret onay defteri (24 Kasım, K4 / P1–P3)
    "public.g25_ucret_guncel": "(text)", "public.g25_onayli": "(text)", "public.g25_atama_koku": "(text)",
    "public.g25_iscilik_carisi": "(text, text, boolean)", "public.ucret_onaylari": "(jsonb)", "public.ucret_onayla": "(jsonb)",
}
# G-25'in oluşturduğu TABLOLAR (RLS açık, doğrudan erişim yok). Geri almada boşsa silinir, doluysa guvenlik şemasına arşivlenir.
TABLOLAR = ["mes_bildirim", "ucr_onay", "isc_odeme"]
if sorted(YENI_FONK_IMZA) != YENI_FONK:
    sys.exit(f"yeni fonksiyon listesi imza tablosuyla uyuşmuyor: {YENI_FONK}")
RPC = ["public.mesai_bildir", "public.mesai_bildirimleri", "public.mesai_bildirim_iptal", "public.mesai_onayla",
       "public.ucret_onaylari", "public.ucret_onayla"]
regp = lambda ad: f"'{ad}{YENI_FONK_IMZA[ad]}'::regprocedure"
sq = lambda s: "'" + s.replace("'", "''") + "'"

BASLIK_ORTAK = """--  G-25 — car_yaz YETKİ GENİŞLİĞİ (stok-v2/guvenlik/25-G25-TASARIM.md). ÜRETİLMİŞ DOSYA — elle düzenlenmez:
--  python3 stok-v2/guvenlik/25-uret.py (kaynak: 25-kaynak/yeni.sql + editor/15-duzeltme.sql car_yaz + editor/18-fis-defteri.sql
--  fis_kes / fis_iptal). Gövde özetleri Faz 0.4 envanterinin formülüyle (yorum / boşluk normalize, md5)."""

# --- önkoşul (salt okur) ---------------------------------------------------------------------------------------------------
def md5_sql(ad, imza):
    return (f"(select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\\n]*', '', 'g'), '\\s+', ' ', 'g'))) "
            f"from pg_proc p where p.oid = to_regprocedure('public.{ad}{imza}'))")

def durum_sql(ad):
    return (f"case {md5_sql(ad, IMZA[ad])} when '{O_ESKI[ad]}' then 'eski (G-25 öncesi, beklenen)' when '{O_YENI[ad]}' then 'G-25 uygulanmış' "
            f"when null then 'YOK' else 'FARKLI: ' || coalesce({md5_sql(ad, IMZA[ad])}, 'yok') end")

YENI_NESNE_SAYISI = (" + ".join(f"(to_regprocedure('{a}{YENI_FONK_IMZA[a]}') is not null)::int" for a in YENI_FONK)
    + "".join(f" + (to_regclass('public.{t}') is not null)::int" for t in TABLOLAR)
    + " + (select count(*) from pg_trigger where tgname = 'g25_tanimlar_ucret_koruma')::int")

onkosul = f"""-- =====================================================================================================================
--  25-onkosul-salt-okur.sql — G-25 ÖNKOŞUL / DURUM (SALT OKUR; hiçbir şey yazmaz, kişisel veri / e-posta dökmez)
{BASLIK_ORTAK}
--  GENEL: HAZIR (uygulanabilir) · UYGULANMIŞ · KARIŞIK (dur, incele). Satır 8 kullanıcıları yalnız SAYAR (ad / e-posta yok).
-- =====================================================================================================================
with v as (
  select {durum_sql('car_yaz')} as car_yaz, {durum_sql('fis_kes')} as fis_kes, {durum_sql('fis_iptal')} as fis_iptal,
         {md5_sql('yetki_var_mi', '(text[], text)')} as a6, ({YENI_NESNE_SAYISI}) as yeni,
         to_regclass('guvenlik.g25_yedek') is not null as yedek
), k as (
  select coalesce((select veri from public.tanimlar where id = 'tekil'), '{{}}'::jsonb) as t
), kul as (
  select x as u, coalesce(x ->> 'rol', '') = 'Yönetici' as yon,
         coalesce((x -> 'yetkiler' -> 'cari' ->> 'kaydetme')::boolean, false) or coalesce((x -> 'yetkiler' -> 'muhasebe' ->> 'kaydetme')::boolean, false) as para,
         coalesce((x -> 'yetkiler' -> 'stok' ->> 'kaydetme')::boolean, false) or coalesce((x -> 'yetkiler' -> 'uretim' ->> 'kaydetme')::boolean, false)
           or coalesce((x -> 'yetkiler' -> 'siparis' ->> 'kaydetme')::boolean, false) as stok,
         coalesce((x -> 'yetkiler' -> 'fisler' ->> 'kaydetme')::boolean, false) as fis
    from k, jsonb_array_elements(case when jsonb_typeof(k.t -> 'kullanicilar') = 'array' then k.t -> 'kullanicilar' else '[]'::jsonb end) x
)
select sira, kontrol, deger from (
  select 1 as sira, 'G-25 yedeği (guvenlik.g25_yedek)' as kontrol, case when yedek then 'VAR (uygulanmış)' else 'yok' end as deger from v
  union all select 2, 'car_yaz gövdesi', car_yaz from v
  union all select 3, 'fis_kes gövdesi', fis_kes from v
  union all select 4, 'fis_iptal gövdesi', fis_iptal from v
  union all select 5, 'A6 (yetki_var_mi gövdesi = canlı A6)', case when a6 = '{CANLI_YETKI_VAR_MI}' then 'UYGULANMIŞ' else 'FARKLI: ' || coalesce(a6, 'yok') end from v
  union all select 6, 'G-25''in oluşturacağı nesneler (önce 0, sonra {len(YENI_FONK) + len(TABLOLAR) + 1})', yeni::text from v
  union all select 7, 'fiş kuralları / sürüm kapısı', 'kurallar ' || case when public.fis_kural_aktif() then 'AÇIK' else 'KAPALI' end
         || ' · min_istemci_surum ' || coalesce((select min_istemci_surum from public.stk_ayar where id = 'tekil'), 'boş')
  union all select 8, 'kullanıcılar (sayı): Yönetici · cari/muhasebe kaydetmeli · PARA''sız stok/üretim/sipariş kaydetmeli · yalnız fisler kaydetmeli · diğer',
         (select count(*) filter (where yon) || ' · ' || count(*) filter (where not yon and para) || ' · ' || count(*) filter (where not yon and not para and stok)
                || ' · ' || count(*) filter (where not yon and not para and not stok and fis) || ' · ' || count(*) filter (where not yon and not para and not stok and not fis) from kul)
  union all select 99, 'GENEL', case
      when not yedek and yeni = 0 and car_yaz like 'eski%' and fis_kes like 'eski%' and fis_iptal like 'eski%' and a6 = '{CANLI_YETKI_VAR_MI}' then 'HAZIR'
      when yedek and yeni = {len(YENI_FONK) + len(TABLOLAR) + 1} and car_yaz like 'G-25%' and fis_kes like 'G-25%' and fis_iptal like 'G-25%' then 'UYGULANMIŞ'
      else 'KARIŞIK — dur, satırları incele' end from v
) s order by sira;
"""

# --- uygulama ---------------------------------------------------------------------------------------------------------------
def ex(s):
    """do $$ … $$ bloğunun İÇİNE yazılacak ifade (Editor kuralı: adlı / iç içe dolar tırnağı yok, $$ dışında $ yok). Fonksiyon
    gövdesi çift-dolar yerine tek tırnakla (içindeki tırnaklar ikilenir) — 22-site-onay-atomik.sql'in yöntemi."""
    if "$$" in s:
        i, j = s.index("$$"), s.rindex("$$")
        govde_ = s[i + 2:j]
        if "$" in govde_:
            sys.exit("gövdede dolar işareti: " + s[:80])
        s = s[:i] + "'" + govde_.replace("'", "''") + "'" + s[j + 2:]
    if "$" in s:
        sys.exit("ifadede dolar işareti: " + s[:80])
    # Kaynak ifade kendi ';' ile bitebilir ("$$ language plpgsql;"): ikilenirse ';;' boş ifade olur ve do bloğu derlenmez.
    return "  " + s.strip().rstrip(";").rstrip().replace("\n", "\n  ") + ";"

uygula = f"""-- =====================================================================================================================
--  25-cari-yetki-uygula.sql — G-25 UYGULAMA (AYRI ONAYLA; canlıya uygulanmadı)
{BASLIK_ORTAK}
-- =====================================================================================================================
--  NE YAPAR (tasarım § 4):
--   - fis_kes: cari satırı olan fiş, yazmadan ÖNCE g25_fis_cari_yetki'den geçer — cari / muhasebe kaydetme yetkilisi (Yönetici dahil)
--     bugünkü gibi; değilse yalnız stoklu AF / SF (STOK) ve ÜRT (ÜRETİM) fişleri, grubun yetkisi + gerçek stok / üretim bağlantısı
--     (kimlik, cari, yön, tutar, para birimi; işçilikte atama / ara proses ücreti ve üretim adedi) ile. Gerisi 42501.
--   - car_yaz: fiş dışından (kapı kapalı) satır / iptal yalnız cari / muhasebe kaydetme ile.
--   - fis_iptal (fis_iptal_toplu onu çağırır): kayıtlı içeriğe göre grubun SİLME yetkisi (kasa / çek → muhasebe, fisler, cari; cari
--     → cari / muhasebe; stoklu AF / SF → stok grubu; ÜRT işçilik → üretim grubu). Ana + bağlı fiş birlikte, bugünkü gibi.
--   - Ücret onayı (K4 / P1–P3): ÜRT işçiliği yalnız sunucudaki teslim edilen atamaya / ara prosese ve cari / muhasebe yetkilisinin
--     ONAYLADIĞI ücrete bağlıysa (ucr_onay; değer değişince onay geçersiz); müşteri carisine işçilik yok; her atama bir kez (isc_odeme).
--     ucret_onaylari (liste) / ucret_onayla (cari / muhasebe; tamirde ücreti de belirler).
--   - Mesai (K2): mes_bildirim tablosu (saat, para değil) + mesai_bildir / mesai_bildirimleri / mesai_bildirim_iptal (üretim yetkisi)
--     + mesai_onayla (cari / muhasebe; MS fişi ve onay tek işlem). tanimlar tetikleyicisi: maaş / aylık saat / mesai katı değişimi
--     cari / muhasebe kaydetme ister.
--  ÖNKOŞULLAR (biri tutmazsa HATA, hiçbir şey değişmez): postgres rolü; G-25 uygulanmamış (yedek yok); oluşturulacak nesnelerin
--  HİÇBİRİ yok; car_yaz / fis_kes / fis_iptal gövdeleri beklenen G-25 öncesi hâl (md5); A6 uygulanmış (yetki_var_mi = canlı A6);
--  gerekli tablolar / fonksiyonlar var.
--  YEDEK (guvenlik.g25_yedek): üç fonksiyonun tam tanımı (pg_get_functiondef), yetkileri, sahibi, önce / sonra gövde özeti.
--  GERİ ALMA: 25-cari-yetki-geri-al.sql — AÇIĞI YENİDEN AÇAR (tasarım § 7).
--  Çalıştırma: Supabase › SQL Editor (postgres) › dosyanın TAMAMI › Run. Bütün değişiklik TEK do bloğunda (ya hepsi ya hiçbiri);
--  sonuç guvenlik.g25_sonuc'ta (son select gösterir).
-- =====================================================================================================================
begin;

do $$
declare
  v_eksik text;
  v_r record;
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('guvenlik.g25_yedek') is not null then
    raise exception 'G-25 zaten uygulanmış (guvenlik.g25_yedek var). Geri almak için 25-cari-yetki-geri-al.sql. Hiçbir şey değişmedi.';
  end if;
  select string_agg(x, ', ') into v_eksik from unnest(array[{', '.join(sq(a + YENI_FONK_IMZA[a]) for a in YENI_FONK)}]) x where to_regprocedure(x) is not null;
  if v_eksik is not null or {" or ".join(f"to_regclass('public.{t}') is not null" for t in TABLOLAR)} or exists (select 1 from pg_trigger where tgname = 'g25_tanimlar_ucret_koruma') then
    raise exception 'G-25''in oluşturacağı nesneler zaten var (%): sessizce değiştirilmez. Hiçbir şey değişmedi.', coalesce(v_eksik, '{" / ".join(TABLOLAR)} / tetikleyici');
  end if;
  select string_agg(x, ', ') into v_eksik from unnest(array['public.stk_fis', 'public.stk_hareket', 'public.car_hareket', 'public.kas_hareket',
      'public.fis_cek_iz', 'public.uretim', 'public.uretim_atamalari', 'public.urunler', 'public.tanimlar', 'public.stk_ayar', 'public.cariler']) x where to_regclass(x) is null;
  if v_eksik is not null then raise exception 'Tablo yok: %. Hiçbir şey değişmedi.', v_eksik; end if;
  select string_agg(x, ', ') into v_eksik from unnest(array['public.yetki_var_mi(text[], text)', 'public.stk_dizi(jsonb)', 'public.stk_sayi(text)',
      'public.fis_kapi_acik()', 'public.fis_iptal_toplu(jsonb)', 'public.fis_kalem_durumlari(text[])', 'gen_random_uuid()']) x where to_regprocedure(x) is null;
  if v_eksik is not null then raise exception 'Fonksiyon yok: %. Hiçbir şey değişmedi.', v_eksik; end if;
  if {md5_sql('yetki_var_mi', '(text[], text)')} is distinct from '{CANLI_YETKI_VAR_MI}' then
    raise exception 'A6 uygulanmış değil ya da yetki_var_mi değişmiş (gövde %). Hiçbir şey değişmedi.', coalesce({md5_sql('yetki_var_mi', '(text[], text)')}, 'yok');
  end if;
{chr(10).join(f"""  if {md5_sql(a, IMZA[a])} is distinct from '{O_ESKI[a]}' then
    raise exception '{a} beklenen G-25 öncesi hâlde değil (gövde %, beklenen {O_ESKI[a]}). Hiçbir şey değişmedi.', coalesce({md5_sql(a, IMZA[a])}, 'yok');
  end if;""" for a in ESKI)}

  -- YEDEK
  create schema if not exists guvenlik;
  revoke all on schema guvenlik from public, anon, authenticated;
  create table guvenlik.g25_yedek (ad text primary key, tanim text not null, yetki text, sahip text not null, ozet_once text not null, ozet_sonra text not null);
  revoke all on guvenlik.g25_yedek from public, anon, authenticated;
{chr(10).join(f"""  insert into guvenlik.g25_yedek select '{a}', pg_get_functiondef(p.oid), p.proacl::text, pg_get_userbyid(p.proowner), '{O_ESKI[a]}', '{O_YENI[a]}'
    from pg_proc p where p.oid = 'public.{a}{IMZA[a]}'::regprocedure;""" for a in ESKI)}

  -- YENİ NESNELER (25-kaynak/yeni.sql)
{chr(10).join(ex(s) for s in ifadeler)}

  -- ÜÇ FONKSİYONUN G-25 HÂLİ (kaynaktaki tanım + birer satır; create or replace yetkileri ve sahibi korur)
{chr(10).join(ex(YENI[a]) for a in YENI)}

  -- SONRA DENETİMİ (tutmazsa bütün blok geri alınır)
{chr(10).join(f"""  if {md5_sql(a, IMZA[a])} is distinct from '{O_YENI[a]}' then raise exception '{a} uygulanan hâlde değil'; end if;""" for a in YENI)}
  for v_r in select y.ad, y.yetki, y.sahip, p.proacl::text as simdi, pg_get_userbyid(p.proowner) as sahip_simdi
               from guvenlik.g25_yedek y join pg_proc p on p.oid = ('public.' || y.ad || '(jsonb)')::regprocedure loop
    if v_r.simdi is distinct from v_r.yetki or v_r.sahip_simdi <> v_r.sahip then raise exception '% yetkisi / sahibi değişti', v_r.ad; end if;
  end loop;
  if not exists (select 1 from pg_trigger where tgname = 'g25_tanimlar_ucret_koruma' and tgrelid = 'public.tanimlar'::regclass and tgenabled = 'O') then
    raise exception 'ücret tetikleyicisi kurulmadı';
  end if;

  create table guvenlik.g25_sonuc (sira int primary key, kontrol text not null, deger text not null);
  revoke all on guvenlik.g25_sonuc from public, anon, authenticated;
  insert into guvenlik.g25_sonuc values
    (1, 'car_yaz / fis_kes / fis_iptal', 'G-25 hâlinde ({', '.join(O_YENI[a][:8] for a in YENI)})'),
    (2, 'yeni fonksiyonlar', '{len(YENI_FONK)}'),
    (3, '{", ".join(TABLOLAR)} tabloları (RLS açık, doğrudan erişim yok)', 'kuruldu'),
    (4, 'tanimlar ücret tetikleyicisi', 'kuruldu, etkin'),
    (5, 'yedek', 'guvenlik.g25_yedek (3 fonksiyon)'),
    (99, 'GENEL', 'UYGULANDI — 25-sonra-dogrula-salt-okur.sql ile doğrulayın');
end $$;

select sira, kontrol, deger from guvenlik.g25_sonuc order by sira;

commit;
"""

# --- sonra doğrula (salt okur) ------------------------------------------------------------------------------------------------
sonra = f"""-- =====================================================================================================================
--  25-sonra-dogrula-salt-okur.sql — G-25 UYGULANDIKTAN SONRA (SALT OKUR)
{BASLIK_ORTAK}
-- =====================================================================================================================
with k(sira, kontrol, tamam) as (
{(chr(10) + "  union all ").join(f"  select {i + 1}, '{a} G-25 hâlinde', {md5_sql(a, IMZA[a])} = '{O_YENI[a]}'" for i, a in enumerate(YENI))}
  union all select 4, 'yeni fonksiyonların hepsi var ({len(YENI_FONK)})', ({" + ".join(f"(to_regprocedure('{a}{YENI_FONK_IMZA[a]}') is not null)::int" for a in YENI_FONK)}) = {len(YENI_FONK)}
  union all select 5, 'RPC (mesai_*, ucret_onay*) yalnız authenticated çalıştırır, anon çalıştıramaz', {" and ".join(f"has_function_privilege('authenticated', {regp(a)}, 'execute') and not has_function_privilege('anon', {regp(a)}, 'execute')" for a in RPC)}
  union all select 6, 'iç fonksiyonları (g25_*) authenticated / anon çalıştıramaz', {" and ".join(f"not has_function_privilege('authenticated', {regp(a)}, 'execute') and not has_function_privilege('anon', {regp(a)}, 'execute')" for a in YENI_FONK if a not in RPC)}
  union all select 7, '{", ".join(TABLOLAR)}: RLS açık, authenticated / anon yetkisi yok', {" and ".join(f"coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.{t}')), false) and not has_table_privilege('authenticated', 'public.{t}', 'select,insert,update,delete') and not has_table_privilege('anon', 'public.{t}', 'select,insert,update,delete')" for t in TABLOLAR)}
  union all select 8, 'tanimlar ücret tetikleyicisi etkin', exists (select 1 from pg_trigger where tgname = 'g25_tanimlar_ucret_koruma' and tgrelid = 'public.tanimlar'::regclass and tgenabled = 'O')
  union all select 9, 'yedek var (3 fonksiyon)', coalesce((select count(*) = 3 from guvenlik.g25_yedek), false)
  union all select 10, 'üç fonksiyonun yetkisi / sahibi yedektekiyle aynı', coalesce((select bool_and(p.proacl::text is not distinct from y.yetki and pg_get_userbyid(p.proowner) = y.sahip)
       from guvenlik.g25_yedek y join pg_proc p on p.oid = ('public.' || y.ad || '(jsonb)')::regprocedure), false)
)
select sira, kontrol, case when tamam then 'tamam' else 'EKSİK' end as durum from k
union all select 99, 'GENEL', case when bool_and(tamam) then 'TAMAM' else 'EKSİK — incele' end from k
order by 1;
"""

# --- geri alma -----------------------------------------------------------------------------------------------------------------
geri = f"""-- =====================================================================================================================
--  25-cari-yetki-geri-al.sql — G-25'İ GERİ AL  (AYRI ONAYLA)
{BASLIK_ORTAK}
-- =====================================================================================================================
--  !!! GERİ ALMA YETKİ AÇIĞINI YENİDEN AÇAR: stok / üretim yetkilisi yine cari virmanı, cari kartı hareketi, ürünsüz alış / satış,
--  maaş / mesai tahakkuku yazabilir ve cari / kasa satırlı fişleri stok silme yetkisiyle iptal edebilir; personel maaşı / mesai katı
--  yine her oturumdan değiştirilebilir. Yalnız G-25 uygulamasının bir soruna yol açtığı kanıtlanırsa kullanın.
--  Ne yapar: car_yaz / fis_kes / fis_iptal'ı yedekteki (G-25 öncesi) tanıma döndürür; G-25'in oluşturduğu fonksiyonları ve tanimlar
--  tetikleyicisini kaldırır; mes_bildirim / ucr_onay / isc_odeme boşsa siler, DOLUYSA silmez — guvenlik.g25_<tablo>_arsiv_<zaman> olarak taşır (uygulama
--  erişemez; veri kaybı yok); yedeği siler. Kesilmiş fişlere, cari / stok / kasa satırlarına DOKUNMAZ.
--  ÖNKOŞUL (biri tutmazsa HATA, hiçbir şey değişmez): postgres rolü; yedek eksiksiz; üç fonksiyon UYGULANDIĞI HÂLDE (gövde md5),
--  yetkileri / sahipleri yedektekiyle aynı; G-25 nesnelerinin hepsi var. Biri sonradan değiştiyse o değişikliği EZMEDEN durur.
--  Çalıştırma: Supabase › SQL Editor (postgres) › dosyanın TAMAMI › Run. Tek do bloğu (ya hepsi ya hiçbiri); sonuç
--  guvenlik.g25_geri_sonuc'ta.
-- =====================================================================================================================
begin;

do $$
declare
  v_eksik text;
  v_r record;
  v_dolu bigint;
  v_tablo text;
  v_arsiv text;
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('guvenlik.g25_yedek') is null then
    raise exception 'G-25 uygulanmamış (guvenlik.g25_yedek yok). Hiçbir şey değişmedi.';
  end if;
  execute 'select count(*) from guvenlik.g25_yedek' into v_dolu;
  if v_dolu <> 3 then
    raise exception 'G-25 yedeği eksik (% / 3 fonksiyon). Hiçbir şey değişmedi.', v_dolu;
  end if;
{chr(10).join(f"""  if {md5_sql(a, IMZA[a])} is distinct from '{O_YENI[a]}' then
    raise exception '{a} uygulandığı hâlde değil (gövde %) — sonradan değişmiş; ezilmez. Hiçbir şey değişmedi.', coalesce({md5_sql(a, IMZA[a])}, 'yok');
  end if;""" for a in YENI)}
  for v_r in select y.ad, y.yetki, y.sahip, p.proacl::text as simdi, pg_get_userbyid(p.proowner) as sahip_simdi
               from guvenlik.g25_yedek y join pg_proc p on p.oid = ('public.' || y.ad || '(jsonb)')::regprocedure loop
    if v_r.simdi is distinct from v_r.yetki or v_r.sahip_simdi <> v_r.sahip then
      raise exception '% yetkisi / sahibi uygulamadan sonra değişmiş (şimdi %, yedek %). Hiçbir şey değişmedi.', v_r.ad, v_r.simdi, v_r.yetki;
    end if;
  end loop;
  select string_agg(x, ', ') into v_eksik from unnest(array[{', '.join(sq(a + YENI_FONK_IMZA[a]) for a in YENI_FONK)}]) x where to_regprocedure(x) is null;
  if v_eksik is not null or {" or ".join(f"to_regclass('public.{t}') is null" for t in TABLOLAR)}
     or not exists (select 1 from pg_trigger where tgname = 'g25_tanimlar_ucret_koruma' and tgrelid = 'public.tanimlar'::regclass) then
    raise exception 'G-25 nesneleri eksik (%) — karışık durum. Hiçbir şey değişmedi.', coalesce(v_eksik, '{" / ".join(TABLOLAR)} / tetikleyici');
  end if;

  -- ÜÇ FONKSİYON G-25 ÖNCESİ HÂLE (yedekteki tam tanım; create or replace yetkileri korur)
  for v_r in select ad, tanim from guvenlik.g25_yedek order by ad loop
    execute v_r.tanim;
  end loop;
{chr(10).join(f"""  if {md5_sql(a, IMZA[a])} is distinct from '{O_ESKI[a]}' then raise exception '{a} yedekteki hâle dönmedi'; end if;""" for a in ESKI)}

  drop trigger g25_tanimlar_ucret_koruma on public.tanimlar;
{chr(10).join(f"  drop function {a}{YENI_FONK_IMZA[a]};" for a in RPC)}
{chr(10).join(f"  drop function {a}{YENI_FONK_IMZA[a]};" for a in YENI_FONK if a not in RPC)}
  -- Tablolar: boşsa silinir; DOLUYSA silinmez — guvenlik.g25_<tablo>_arsiv_<zaman> olarak taşınır (uygulama erişemez; veri kaybı yok).
  v_arsiv := '';
  foreach v_tablo in array array[{", ".join(sq(t) for t in TABLOLAR)}] loop
    execute format('select count(*) from public.%I', v_tablo) into v_dolu;
    if v_dolu = 0 then
      execute format('drop table public.%I', v_tablo);
    else
      execute format('alter table public.%I set schema guvenlik', v_tablo);
      execute format('alter table guvenlik.%I rename to %I', v_tablo, 'g25_' || v_tablo || '_arsiv_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS'));
      v_arsiv := v_arsiv || v_tablo || ' (' || v_dolu || ' satır) ';
    end if;
  end loop;

  drop table guvenlik.g25_yedek;
  drop table if exists guvenlik.g25_sonuc;
  create table if not exists guvenlik.g25_geri_sonuc (sira int primary key, kontrol text not null, deger text not null);
  revoke all on guvenlik.g25_geri_sonuc from public, anon, authenticated;
  delete from guvenlik.g25_geri_sonuc;
  insert into guvenlik.g25_geri_sonuc values
    (1, 'car_yaz / fis_kes / fis_iptal', 'G-25 öncesi hâle döndü'),
    (2, 'G-25 fonksiyonları ve tanimlar tetikleyicisi', 'kaldırıldı'),
    (3, 'tablolar ({", ".join(TABLOLAR)})', case when v_arsiv = '' then 'boştu, silindi' else 'dolu olanlar guvenlik şemasına arşivlendi: ' || v_arsiv end),
    (98, 'UYARI', 'G-25 yetki açığı YENİDEN AÇIK (tasarım § 7)'),
    (99, 'GENEL', 'GERİ ALINDI');
end $$;

select sira, kontrol, deger from guvenlik.g25_geri_sonuc order by sira;

commit;
"""

# --- KAYNAĞA İŞLE (--kaynaga-isle <kök>) -------------------------------------------------------------------------------------
# Verilen ağaçtaki KURULUM kaynaklarına G-25'i işler — sunucu / güvenlik takımları veritabanını kurarken ve kaynakları yeniden
# çalıştırırken G-25 kalsın (işlenmemiş 18-fis-defteri.sql yeniden çalışınca fis_kes / fis_iptal G-25 öncesine döner: 24 Kasım ölçüldü).
# geri-donus-*.sql BİLEREK işlenmez (eski sürüme dönüş dosyaları — kullanılırlarsa G-25 de kalkar).
CAPALAR = {
    "car_yaz": ("  perform public.stk_yetki(array['cari', 'fisler', 'muhasebe', 'siparis', 'uretim', 'stok', 'tanimlar'], 'kaydetme');",),
    "fis_kes": ("      'kalemler', public.fis_kalem_durumlari(v_idler), 'karsilananDuzeltme', '[]'::jsonb);\n  end if;",),
    "fis_iptal": ("  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'silme');",),
}
EKLER = {a: YENI[a].replace(ESKI[a].split("\n")[0], "", 1) for a in YENI}   # yalnız fark kontrolü için
def isle_blok(metin, ad):
    eski = blok(metin, ad)
    capa = CAPALAR[ad][0]
    yeni_satir = {"car_yaz": YENI["car_yaz"], "fis_kes": YENI["fis_kes"], "fis_iptal": YENI["fis_iptal"]}[ad]
    # eklenecek satırlar = YENİ tanımda çapadan sonra gelip ESKİ'de olmayan kısım
    i = yeni_satir.index(capa) + len(capa)
    j = ESKI[ad].index(capa) + len(capa)
    ek = yeni_satir[i:len(yeni_satir) - (len(ESKI[ad]) - j)]
    return metin.replace(eski, ekle(eski, capa, ek.lstrip("\n"), ad), 1)
# fis_kapi_acik() BİLEREK eklenmez: varlığı başka fonksiyonlarda "fiş defteri kurulu" işareti (yukarıdaki car_yaz notu).
YARDIMCI = """-- G-25 (kaynağa işlendi): car_yaz'ın fiş dışı denetimi bu yardımcıyı çağırır; fis-defteri.sql'den önce kurulan dosyada da bulunsun.
""" + [x[x.index("create or replace function public.g25_yetki_iste("):] for x in ifadeler if "create or replace function public.g25_yetki_iste(" in x][0] + ";\nrevoke all on function public.g25_yetki_iste(text[], text, text) from public, anon, authenticated;\n"
def idempotent(x):
    for t in TABLOLAR:
        x = x.replace(f"create table public.{t} (", f"create table if not exists public.{t} (")
    x = x.replace("create unique index mes_bildirim_acik", "create unique index if not exists mes_bildirim_acik")
    # Tetikleyici "yoksa kur": drop + create Editor'da AYRI ifadelerdir — arada (ya da create düşerse) maaş koruması kalkmış olurdu
    # (24 Kasım, denetim noktası günlüğünde görüldü). create or replace trigger PG14 ister; canlının sürümüne güvenilmez.
    if x.lstrip().startswith("create trigger g25_tanimlar_ucret_koruma") or "\ncreate trigger g25_tanimlar_ucret_koruma" in x:
        i = x.index("create trigger g25_tanimlar_ucret_koruma")
        x = (x[:i] + "do $$ begin\n  if not exists (select 1 from pg_trigger where tgname = 'g25_tanimlar_ucret_koruma' and tgrelid = 'public.tanimlar'::regclass) then\n    "
             + x[i:].strip() + ";\n  end if;\nend $$")
    return x
YENI_KURULUM = "\n-- ===== G-25 (kaynağa işlendi: stok-v2/guvenlik/25-kaynak/yeni.sql) =====\n" + "\n".join(idempotent(x) + ";" for x in ifadeler) + "\n"
KAYNAKLAR = {"stok-v2/cari-v2.sql": ["car_yaz"], "stok-v2/editor/4-cari-kurulum.sql": ["car_yaz"], "stok-v2/editor/15-duzeltme.sql": ["car_yaz"],
             "stok-v2/fis-defteri.sql": ["fis_kes", "fis_iptal"], "stok-v2/editor/18-fis-defteri.sql": ["fis_kes", "fis_iptal"]}
if "--kaynaga-isle" in sys.argv:
    hedef = sys.argv[sys.argv.index("--kaynaga-isle") + 1]
    for yol, adlar in KAYNAKLAR.items():
        tam = os.path.join(hedef, yol)
        metin = open(tam, encoding="utf-8").read()
        if "G-25 (kaynağa işlendi" in metin:
            sys.exit(f"{yol}: zaten işlenmiş")
        for ad in adlar:
            metin = isle_blok(metin, ad)
        if "car_yaz" in adlar:
            metin = YARDIMCI + "\n" + metin
        else:
            metin = metin + YENI_KURULUM
        open(tam, "w", encoding="utf-8").write(metin)
        print(f"işlendi: {yol} ({', '.join(adlar)})")
    sys.exit(0)

dosyalar = {"25-onkosul-salt-okur.sql": onkosul, "25-cari-yetki-uygula.sql": uygula,
            "25-sonra-dogrula-salt-okur.sql": sonra, "25-cari-yetki-geri-al.sql": geri}
for ad, metin in dosyalar.items():   # Editor kuralı (editor-icin.py denetle): $$ çift sayıda, başka dolar yok
    if metin.count("$$") % 2 or metin.replace("$$", "").count("$"):
        sys.exit(f"{ad}: Supabase SQL Editor için uygun değil (dolar işareti)")
denetle = "--denetle" in sys.argv
fark = []
for ad, metin in dosyalar.items():
    yol = os.path.join(G, ad)
    if denetle:
        if not os.path.exists(yol) or open(yol, encoding="utf-8").read() != metin:
            fark.append(ad)
    else:
        with open(yol, "w", encoding="utf-8") as f:
            f.write(metin)
if denetle:
    print("üretilenler diskteki ile " + ("AYNI" if not fark else "FARKLI: " + ", ".join(fark)))
    sys.exit(1 if fark else 0)
print("üretildi: " + ", ".join(dosyalar))
print("özet ESKİ: " + ", ".join(f"{a} {o}" for a, o in O_ESKI.items()))
print("özet YENİ: " + ", ".join(f"{a} {o}" for a, o in O_YENI.items()))
