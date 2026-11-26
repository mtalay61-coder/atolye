#!/usr/bin/env python3
# RENK ÇÖKMESİ — ONARIM SQL ÜRETİCİSİ (26 Kasım). Yalnız dosya okur / yazar; veritabanına bağlanmaz.
#
# Girdiler (kullanıcının sohbete eklediği CSV'ler — DEPOYA KONMAZ, depo herkese açık):
#   Y1 = 2026-11-25-1137-yedek-dokum.csv  (hata öncesi kanıt), Y2 = 2026-11-26-1121-yedek-dokum.csv (ölçü kimlikleri),
#   C  = canlı renk envanteri (renk-cokmesi-envanteri-salt-okur.sql, limit 5000)
# Çıktılar (<çıkış-dizini>):
#   onarim-uygula.sql   tek DO bloğu: ön koşullar → değişiklik → son koşullar. Biri tutmazsa RAISE → HİÇBİR ŞEY değişmez.
#   onarim-geri-al.sql  tek DO bloğu: onarımın tersini, aynı kuralla.
#   yerel-kopya.sql     canlı envanterden bu 23 modelin durumunu yerel bir sınama veritabanına kurar (yalnız yerel sınama).
#   plan.json           üretilen kayıt listesi (A/B/C/D) — rapor için.
#
# KAPSAM (kullanıcı onayı bekleyen plan, 26 Kasım):
#   A  25-1137'de var olup 26 Kasım 10:40'ta silinen kombinasyon varyantları → AYNI kimlik, ürün, kombinasyon, ölçü, min_stok,
#      oluşturma zamanıyla geri eklenir.
#   B  25-1137'den sonra açılan modellerin kombinasyon varyantları (eski kimlik yedekte yok) → ÖNCEDEN BELİRLENMİŞ kimlikle açılır:
#      'vry-' || md5('renk-onarim-2611|<ürün>|<kombinasyon>|<ölçü>'). Plan bu kimlikleri listeler; onarım tam bunları açar.
#   C  26 Kasım 07:40–07:41 UTC'de açılan düz renkli varyantlar → yalnız aktif = false (SİLİNMEZ).
#   D  27001 / 27181 reçete satırlarında yalnız mamulRenk (kombinasyonun güncel adı) ve mamulRenkId (kaldırılır; hata
#      öncesinde yoktu). Satırın diğer bütün alanları aynen kalır.
#   E  (8 reçete hammadde rengi) BU SQL'DE YOK — kullanıcı kararı bekliyor.
import csv, json, sys, os, hashlib, collections, subprocess
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RENAMED = {"renk-mwbu0vhu-6lad", "renk-mwbu40qr-rqlh", "renk-mwbv9p63-7str", "renk-mwbvb3sp-lysi"}
# 25-1137'den sonra açılan modeller → çöken düz rengin yerine gelecek kombinasyonlar (kanıt: sipariş + renk resmi, rapor).
YENI = {"stok-mww7x80r-dpzp": ["kombi-mww7wkjm-21af"],
        "stok-mww2tuks-8t7z": ["kombi-mwc4rml8-j006", "kombi-mwc4e5r8-2xaj"],
        "stok-mww6hozd-7by1": ["kombi-mwc4rml8-j006"],
        "stok-mwvy4wew-vasp": ["kombi-mwvy3pp6-lr63", "kombi-mwvy48rw-4vq1"],
        "stok-mwvzv5d4-typ4": ["kombi-mwc4e5r8-2xaj"]}
OLCULER = ["36", "37", "38", "39", "40"]
CAKISMA_PENCERESI = ("2026-11-26T07:40", "2026-11-26T07:42")   # çöken düz varyantların açıldığı dakikalar (UTC)

def oku(y):
    return list(csv.DictReader(open(y, encoding="utf-8-sig")))
J = lambda r: json.loads(r["ayrinti"])
tr = lambda s: (s or "").replace("I", "ı").replace("İ", "i").lower().strip()
lit = lambda s: "'" + str(s).replace("'", "''") + "'"
yeni_id = lambda u, k, o: "vry-" + hashlib.md5(f"renk-onarim-2611|{u}|{k}|{o}".encode()).hexdigest()

def main(y1, y2, c, cikis):
    Y1, Y2, C = oku(y1), oku(y2), oku(c)
    for ad_, rows, b in (("Y1", Y1, "3-varyant"), ("Y2", Y2, "3-varyant"), ("C", C, "2-varyant")):
        if not any(r["bolum"] == b for r in rows): sys.exit(f"DUR: {ad_} beklenen bölüm yok ({b})")
    V = lambda rows, b: {J(r)["varyant_id"]: {**J(r), "u": r["urun_id"]} for r in rows if r["bolum"] == b}
    v1, v2, vc = V(Y1, "3-varyant"), V(Y2, "3-varyant"), V(C, "2-varyant")
    ad = {r["urun_id"]: r["urun"] for r in C if r["bolum"] == "1-urun"}
    cr = {r["urun_id"]: J(r) for r in C if r["bolum"] == "7-renk-tanimi"}
    # Kod → kombinasyon: YALNIZ Tanımlar'da bulunan (tanimlarda_kombinasyon dolu) etkin kombinasyonlar. Canlıda aynı kodu taşıyan
    # eski, pasif, Tanımlar dışı kayıtlar var (ör. 1001: "1001 - Siyah", pasif) — ilk sürüm onu seçiyordu (ön koşul yakaladı).
    kod2 = {}
    for k, d in cr.items():
        if d.get("tur") == "model" and d.get("aktif") and d.get("tanimlarda_kombinasyon"):
            if d["kod"] in kod2: sys.exit(f"DUR: kod {d['kod']} Tanımlar'da birden çok kombinasyonda")
            kod2[d["kod"]] = k
    olcu_id = {x["olcu"]: x["olcu_id"] for x in list(v1.values()) + list(v2.values())}
    for k in vc:   # canlı envanter olcu_id vermez → 26-1121'den (canlıdakiyle aynı kimlikler; tutmazsa DUR)
        if k not in v2: sys.exit(f"DUR: canlı varyant {k} 26-1121'de yok — ölçü kimliği bilinemiyor")
        vc[k]["olcu_id"] = v2[k]["olcu_id"]
    U = sorted(ad)
    A = [dict(id=k, u=x["u"], r=x["renk_id"], o=x["olcu_id"], ol=x["olcu"], min=x["min_stok"], olus=x["olusturma"])
         for k, x in sorted(v1.items()) if x["u"] in ad and k not in vc and x["renk_tur"] == "model"]
    for a in A:
        if a["id"] in vc or any(y["u"] == a["u"] and y["renk_id"] == a["r"] and y["olcu_id"] == a["o"] for y in vc.values()):
            sys.exit(f"DUR: A {a['id']} canlıda çakışıyor")
    B = [dict(id=yeni_id(u, k, o), u=u, r=k, o=olcu_id[o], ol=o) for u, ks in YENI.items() for k in ks for o in OLCULER]
    Cc = [dict(id=k, u=x["u"], r=x["renk_id"], o=x["olcu_id"]) for k, x in sorted(vc.items())
          if x["u"] in ad and x["renk_tur"] == "renk" and x["renk_id"] in RENAMED]
    for x in Cc:
        y = vc[x["id"]]
        if not (y["aktif"] and int(y["hareket"]) == 0 and float(y["stok"]) == 0 and CAKISMA_PENCERESI[0] <= y["olusturma"][:16] < CAKISMA_PENCERESI[1]):
            sys.exit(f"DUR: C {x['id']} beklenen durumda değil (aktif / hareket 0 / stok 0 / 10:40–10:41)")
    Y1r = {(r["urun_id"], J(r)["sira"]): J(r) for r in Y1 if r["bolum"] == "4-recete"}
    IMZA = ("hammaddeUrunId", "mamulBeden", "renk", "beden", "proses", "eklemeId")
    D = []
    for r in C:
        if r["bolum"] != "5-recete": continue
        a = J(r); b = Y1r.get((r["urun_id"], a["sira"]))
        if a.get("mamulRenkId") and b and tr(b["mamulRenk"]) != tr(a["mamulRenk"]):
            kid = kod2[b["mamulRenk"].split(" - ")[0]]
            D.append(dict(u=r["urun_id"], sira=a["sira"], once=a["mamulRenk"], once_id=a["mamulRenkId"], sonra=cr[kid]["ad"],
                          imza={k: a.get(k) for k in IMZA}))
    rec_uzunluk = collections.Counter(r["urun_id"] for r in C if r["bolum"] == "5-recete")
    kombiler = sorted({x["r"] for x in A + B} | {k for k in cr if cr[k].get("tur") == "model" and any(d["sonra"] == cr[k]["ad"] for d in D)})
    renkler = sorted(RENAMED)
    beklenen_vry = {u: sorted(k for k, x in vc.items() if x["u"] == u) for u in U}
    hareketli = {k: int(x["hareket"]) for k, x in vc.items() if int(x["hareket"])}
    if (len(A), len(B), len(Cc), len(D)) != (100, 35, 130, 149):
        sys.exit(f"DUR: sayılar plandan farklı: A {len(A)} B {len(B)} C {len(Cc)} D {len(D)} (beklenen 100 / 35 / 130 / 149)")
    veri = dict(urunler=U, A=A, B=B, C=Cc, D=D, recete_uzunluk={u: rec_uzunluk[u] for u in sorted({d["u"] for d in D})},
                kombiler={k: cr[k]["ad"] for k in kombiler}, renkler={k: cr[k]["ad"] for k in renkler},
                olculer=sorted({x["o"] for x in A + B}), beklenen_varyant=beklenen_vry)
    os.makedirs(cikis, exist_ok=True)
    json.dump(veri, open(f"{cikis}/plan.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    vj = json.dumps(veri, ensure_ascii=False, separators=(",", ":"))
    # EDITOR KURALI (stok-v2/editor-icin.py): yalnız düz çift-dolar gövde, başka hiçbir yerde dolar işareti yok. Veri tek
    # tırnaklı metin olarak gömülür (tek tırnaklar ikilenir); içinde dolar işareti olursa DUR.
    if "$" in vj: sys.exit("DUR: veride dolar işareti var — Editor kuralı")
    vq = vj.replace("'", "''")
    ulist = "', '".join(U)
    for ad_, sablon in (("onarim-uygula", UYGULA), ("onarim-geri-al", GERI_AL)):
        kaynak = f"{cikis}/{ad_}.kaynak.sql"
        open(kaynak, "w", encoding="utf-8").write(sablon.replace("@@VERI@@", vq).replace("@@URUNLER@@", ulist))
        # Teslim edilen dosya = projenin Editor dönüştürücüsünün çıktısı (yorumlar ayıklanır, dolar kuralı denetlenir).
        r = subprocess.run([sys.executable, "-I", os.path.join(KOK, "stok-v2", "editor-icin.py"), kaynak], capture_output=True, text=True)
        if r.returncode: sys.exit(f"DUR: editor-icin.py reddetti: {r.stderr.strip()}")
        open(f"{cikis}/{ad_}.sql", "w", encoding="utf-8").write(r.stdout)
    open(f"{cikis}/yerel-kopya.sql", "w", encoding="utf-8").write(yerel_kopya(C, vc, cr, U, hareketli))
    print(f"üretildi: A {len(A)} · B {len(B)} · C {len(Cc)} · D {len(D)} · ürün {len(U)} · hareketli varyant {len(hareketli)}")

# ── ORTAK PARÇALAR (gövde içi metin; iç içe fonksiyon / adlı dolar tırnağı YOK) ─────────────────────────────────────────
# Parmak izi: public şemasındaki HER tablonun bütün satırları (satır metni, sıralı) — dışlanan alan YOK. Yalnız değişmesine
# izin verilen tablolar (stk_varyant, urunler, degisiklik; geri almada silinen_arsiv) ayrıca satır satır denetlenir.
TUM_IZ = r"""
  {hedef} := '{{}}'::jsonb;
  for t in select c.relname::text from pg_catalog.pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') order by 1 loop
    execute format('select md5(coalesce(string_agg(z::text, %L order by z::text), %L)) from public.%I z', '|', '', t) into h;
    {hedef} := {hedef} || jsonb_build_object(t, h);
  end loop;
"""
KILIT = r"""
  -- Önce değişiklik sayacı satırı kilitlenir: bu işlem bitene kadar başka oturumların (degisiklik_izle tetikleyicili) yazmaları
  -- bekler; parmak izleri arasında araya yazma girmez. Sonra değişecek iki tablo.
  if to_regclass('public.degisiklik') is not null then
    perform 1 from public.degisiklik where id = 'tekil' for update;
  end if;
  lock table public.stk_varyant, public.urunler in share row exclusive mode;
  v_urunler := array(select jsonb_array_elements_text(d->'urunler'));
"""
def dg_denetim(etiket, beklenen):
    # degisiklik.sayaclar: yalnız beklenen tabloların sayacı TAM beklenen kadar artar; diğer anahtarlar ve satırlar aynı.
    kosullar = " and ".join(f"(coalesce((dg_sonra->'sayaclar'->>'{t}')::bigint, 0) - coalesce((dg_once->'sayaclar'->>'{t}')::bigint, 0)) = {n}" for t, n in beklenen.items())
    haric = " - ".join(f"'{t}'" for t in beklenen)
    return rf"""
  if to_regclass('public.degisiklik') is not null then
    select to_jsonb(z) into dg_sonra from public.degisiklik z where z.id = 'tekil';
    if not ({kosullar}) then raise exception '{etiket} DUR: değişiklik sayacı beklenmeyen (önce %, sonra %)', dg_once->'sayaclar', dg_sonra->'sayaclar'; end if;
    if ((dg_once->'sayaclar') - {haric}) is distinct from ((dg_sonra->'sayaclar') - {haric})
       or (dg_once - 'sayaclar' - 'zaman') is distinct from (dg_sonra - 'sayaclar' - 'zaman') then
      raise exception '{etiket} DUR: değişiklik satırında beklenmeyen alan değişti'; end if;
    select md5(coalesce(string_agg(z::text, '|' order by z::text), '')) into h from public.degisiklik z where z.id <> 'tekil';
    if h is distinct from dg_diger then raise exception '{etiket} DUR: değişiklik tablosunun diğer satırları değişti'; end if;
  end if;
"""
DG_ONCE = r"""
  if to_regclass('public.degisiklik') is not null then
    select to_jsonb(z) into dg_once from public.degisiklik z where z.id = 'tekil';
    select md5(coalesce(string_agg(z::text, '|' order by z::text), '')) into dg_diger from public.degisiklik z where z.id <> 'tekil';
  end if;
"""
BILDIRIM = """declare
  d jsonb := '@@VERI@@'::jsonb;
  v_urunler text[]; v_eski text[]; v_yeni text[];
  t text; h text; k text; v text; n int; m int; arsiv_sinir bigint;
  x jsonb; e jsonb; beklenen jsonb; dg_once jsonb; dg_sonra jsonb; dg_diger text;
  tum_once jsonb; tum_sonra jsonb; izinli text[];
  vr_dis_once text; vr_dis_sonra text; ur_once text; ur_sonra text; rec_dis_once text; rec_dis_sonra text; ar_once text; ar_sonra text;
"""

UYGULA = r"""-- RENK ÇÖKMESİ ONARIMI — UYGULA (26 Kasım, 2. sürüm: Editor kuralı + bütün tablolar). Supabase SQL Editor'da TAMAMI › Run.
-- 1. istek: tek DO bloğu — ön koşul → değişiklik → son koşul. Biri tutmazsa "ONARIM DUR: …" ile durur, blok bütünüyle geri
--    alınır, HİÇBİR kayıt değişmez (kısmi onarım yok). 2. istek: salt okur sonuç tablosu.
-- Kapsam: A 100 geri ekleme (eski kimlik) · B 35 yeni (önceden belirlenmiş kimlik) · C 130 yalnız aktif=false · D 149 reçete
-- satırında yalnız mamulRenk / mamulRenkId. E (8 hammadde rengi) YOK. Sürüm kapısına DOKUNMAZ.
-- İzin verilen yan etki: degisiklik.sayaclar — stk_varyant +3, urunler +1 (degisiklik_izle tetikleyicisi, deyim başına bir);
-- public şemasındaki DİĞER HER TABLO satır satır aynı kalmalı.
do $$
#variable_conflict use_column
""" + BILDIRIM + r"""begin
""" + KILIT + r"""
  -- ── 1. ÖN KOŞULLAR ──
  for k in select jsonb_object_keys(d->'beklenen_varyant') loop
    if array(select z.id from public.stk_varyant z where z.urun_id = k order by z.id)
       is distinct from array(select jsonb_array_elements_text(d->'beklenen_varyant'->k) order by 1) then
      raise exception 'ONARIM DUR: % ürününün varyant kümesi envanterdekinden farklı', k; end if;
  end loop;
  for k, v in select * from jsonb_each_text(d->'kombiler') loop
    if not exists (select 1 from public.stk_renk r where r.id = k and r.ad = v and r.tur = 'model' and r.aktif) then
      raise exception 'ONARIM DUR: kombinasyon % beklenen durumda değil (beklenen ad %)', k, v; end if;
  end loop;
  for k, v in select * from jsonb_each_text(d->'renkler') loop
    if not exists (select 1 from public.stk_renk r where r.id = k and r.ad = v and r.tur = 'renk') then
      raise exception 'ONARIM DUR: renk % beklenen adda değil (beklenen %)', k, v; end if;
  end loop;
  if (select count(*) from public.stk_olcu o where o.id in (select jsonb_array_elements_text(d->'olculer'))) <> jsonb_array_length(d->'olculer') then
    raise exception 'ONARIM DUR: ölçü tanımları eksik'; end if;
  for x in select * from jsonb_array_elements((d->'A') || (d->'B')) loop
    if exists (select 1 from public.stk_varyant z where z.id = x->>'id'
               or (z.urun_id = x->>'u' and z.renk_id = x->>'r' and coalesce(z.olcu_id, '') = coalesce(x->>'o', ''))) then
      raise exception 'ONARIM DUR: % (veya aynı ürün/kombinasyon/ölçü) zaten var', x->>'id'; end if;
  end loop;
  for x in select * from jsonb_array_elements(d->'C') loop
    if not exists (select 1 from public.stk_varyant z where z.id = x->>'id' and z.urun_id = x->>'u' and z.renk_id = x->>'r'
                   and coalesce(z.olcu_id, '') = coalesce(x->>'o', '') and z.aktif)
       or exists (select 1 from public.stk_hareket hh where hh.varyant_id = x->>'id') then
      raise exception 'ONARIM DUR: düz varyant % beklenen durumda değil (etkin, hareketsiz)', x->>'id'; end if;
  end loop;
  for k, n in select key, value::int from jsonb_each_text(d->'recete_uzunluk') loop
    if (select jsonb_array_length(coalesce(z.recete, '[]'::jsonb)) from public.urunler z where z.id = k) is distinct from n then
      raise exception 'ONARIM DUR: % reçetesi % satır değil', k, n; end if;
  end loop;
  for x in select * from jsonb_array_elements(d->'D') loop
    select z.recete -> ((x->>'sira')::int - 1) into e from public.urunler z where z.id = x->>'u';
    if e is null or e->>'mamulRenk' is distinct from x->>'once' or e->>'mamulRenkId' is distinct from x->>'once_id'
       or exists (select 1 from jsonb_each(x->'imza') i where e->i.key is distinct from i.value) then
      raise exception 'ONARIM DUR: reçete % sıra % beklenen durumda değil', x->>'u', x->>'sira'; end if;
  end loop;

  -- ── 2. ÖNCE İZLERİ ──
  v_eski := array(select z.id from public.stk_varyant z where z.urun_id = any(v_urunler));
""" + TUM_IZ.format(hedef="tum_once") + DG_ONCE + r"""
  select md5(coalesce(string_agg(z::text, '|' order by z::text), '')) into vr_dis_once from public.stk_varyant z where z.urun_id <> all(v_urunler);
  select md5(coalesce(string_agg((to_jsonb(z) - 'recete')::text, '|' order by z.id), '')) into ur_once from public.urunler z;
  select md5(coalesce(string_agg(z.id || '=' || coalesce(z.recete::text, '-'), '|' order by z.id), '')) into rec_dis_once
    from public.urunler z where z.id not in (select distinct x2->>'u' from jsonb_array_elements(d->'D') x2);
  create temp table onarim_once on commit drop as select z.* from public.stk_varyant z where z.urun_id = any(v_urunler);
  create temp table onarim_recete_once on commit drop as select z.id, z.recete from public.urunler z where z.id = any(v_urunler);

  -- ── 3. DEĞİŞİKLİK (dört deyim) ──
  insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif, olusturma)
  select x->>'id', x->>'u', x->>'r', x->>'o', (x->>'min')::numeric, true, (x->>'olus')::timestamptz from jsonb_array_elements(d->'A') x;
  get diagnostics n = row_count; if n <> jsonb_array_length(d->'A') then raise exception 'ONARIM DUR: A % eklendi', n; end if;
  insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif)
  select x->>'id', x->>'u', x->>'r', x->>'o', 0, true from jsonb_array_elements(d->'B') x;
  get diagnostics n = row_count; if n <> jsonb_array_length(d->'B') then raise exception 'ONARIM DUR: B % eklendi', n; end if;
  update public.stk_varyant z set aktif = false where z.id in (select x->>'id' from jsonb_array_elements(d->'C') x) and z.aktif;
  get diagnostics n = row_count; if n <> jsonb_array_length(d->'C') then raise exception 'ONARIM DUR: C % pasife alındı', n; end if;
  update public.urunler u set recete = (
    select jsonb_agg(case when dd.x is null then el else (el - 'mamulRenkId') || jsonb_build_object('mamulRenk', dd.x->>'sonra') end order by i)
    from jsonb_array_elements(u.recete) with ordinality as r(el, i)
    left join lateral (select x from jsonb_array_elements(d->'D') x where x->>'u' = u.id and (x->>'sira')::int = i) dd on true)
  where u.id in (select distinct x->>'u' from jsonb_array_elements(d->'D') x);
  get diagnostics n = row_count; if n <> (select count(*) from jsonb_object_keys(d->'recete_uzunluk')) then raise exception 'ONARIM DUR: % ürün reçetesi güncellendi', n; end if;

  -- ── 4. SON KOŞULLAR ──
  for x in select * from jsonb_array_elements((d->'A') || (d->'B')) loop
    if not exists (select 1 from public.stk_varyant z where z.id = x->>'id' and z.urun_id = x->>'u' and z.renk_id = x->>'r'
                   and z.olcu_id = x->>'o' and z.aktif) then raise exception 'ONARIM DUR: % beklenen kimlikle oluşmadı', x->>'id'; end if;
  end loop;
  for x in select * from jsonb_array_elements(d->'A') loop
    if not exists (select 1 from public.stk_varyant z where z.id = x->>'id' and z.min_stok = (x->>'min')::numeric and z.olusturma = (x->>'olus')::timestamptz) then
      raise exception 'ONARIM DUR: % min_stok / oluşturma beklenen değil', x->>'id'; end if;
  end loop;
  if (select count(*) from public.stk_varyant z where z.urun_id = any(v_urunler)) <> cardinality(v_eski) + jsonb_array_length(d->'A') + jsonb_array_length(d->'B') then
    raise exception 'ONARIM DUR: varyant sayısı beklenmeyen'; end if;
  select count(*) into m from onarim_once o join public.stk_varyant z on z.id = o.id where to_jsonb(o) is distinct from to_jsonb(z);
  if m <> jsonb_array_length(d->'C') then raise exception 'ONARIM DUR: % eski varyant değişti (beklenen %)', m, jsonb_array_length(d->'C'); end if;
  if exists (select 1 from onarim_once o join public.stk_varyant z on z.id = o.id
             where to_jsonb(o) is distinct from to_jsonb(z)
               and ((to_jsonb(o) - 'aktif') is distinct from (to_jsonb(z) - 'aktif') or not o.aktif or z.aktif
                    or o.id not in (select x->>'id' from jsonb_array_elements(d->'C') x))) then
    raise exception 'ONARIM DUR: düz varyantlarda aktif dışında bir alan ya da beklenmeyen bir varyant değişti'; end if;
  select count(*) into m from onarim_recete_once o join public.urunler u on u.id = o.id,
         lateral jsonb_array_elements(coalesce(o.recete, '[]'::jsonb)) with ordinality a(el, i)
   where (u.recete -> (i::int - 1)) is distinct from a.el;
  if m <> jsonb_array_length(d->'D') then raise exception 'ONARIM DUR: % reçete öğesi değişti (beklenen %)', m, jsonb_array_length(d->'D'); end if;
  for x in select * from jsonb_array_elements(d->'D') loop
    select o.recete -> ((x->>'sira')::int - 1), u.recete -> ((x->>'sira')::int - 1) into beklenen, e
      from onarim_recete_once o join public.urunler u on u.id = o.id where o.id = x->>'u';
    if (beklenen - 'mamulRenkId' - 'mamulRenk') is distinct from (e - 'mamulRenk') or e ? 'mamulRenkId' or e->>'mamulRenk' is distinct from x->>'sonra' then
      raise exception 'ONARIM DUR: reçete % sıra % beklenmeyen biçimde değişti', x->>'u', x->>'sira'; end if;
  end loop;
  if exists (select 1 from onarim_recete_once o join public.urunler u on u.id = o.id
             where jsonb_array_length(coalesce(o.recete, '[]'::jsonb)) <> jsonb_array_length(coalesce(u.recete, '[]'::jsonb))) then
    raise exception 'ONARIM DUR: reçete uzunluğu değişti'; end if;
  select md5(coalesce(string_agg(z::text, '|' order by z::text), '')) into vr_dis_sonra from public.stk_varyant z where z.urun_id <> all(v_urunler);
  if vr_dis_sonra is distinct from vr_dis_once then raise exception 'ONARIM DUR: 23 model dışındaki bir varyant değişti'; end if;
  select md5(coalesce(string_agg((to_jsonb(z) - 'recete')::text, '|' order by z.id), '')) into ur_sonra from public.urunler z;
  if ur_sonra is distinct from ur_once then raise exception 'ONARIM DUR: ürünlerin reçete dışındaki bir alanı değişti'; end if;
  select md5(coalesce(string_agg(z.id || '=' || coalesce(z.recete::text, '-'), '|' order by z.id), '')) into rec_dis_sonra
    from public.urunler z where z.id not in (select distinct x2->>'u' from jsonb_array_elements(d->'D') x2);
  if rec_dis_sonra is distinct from rec_dis_once then raise exception 'ONARIM DUR: onarım dışındaki bir ürünün reçetesi değişti'; end if;
""" + dg_denetim("ONARIM", {"stk_varyant": 3, "urunler": 1}) + TUM_IZ.format(hedef="tum_sonra") + r"""
  izinli := array['stk_varyant', 'urunler', 'degisiklik'];
  if (select array_agg(k2 order by k2) from jsonb_object_keys(tum_once) k2) is distinct from (select array_agg(k2 order by k2) from jsonb_object_keys(tum_sonra) k2) then
    raise exception 'ONARIM DUR: tablo listesi değişti'; end if;
  for t in select jsonb_object_keys(tum_once) loop
    if t <> all(izinli) and tum_once->>t is distinct from tum_sonra->>t then
      raise exception 'ONARIM DUR: değişmemesi gereken "%" tablosu değişti', t; end if;
  end loop;
  raise notice 'ONARIM TAMAM: % geri eklendi, % yeni açıldı, % pasife alındı, % reçete satırı düzeltildi; diğer % tablo satır satır aynı',
    jsonb_array_length(d->'A'), jsonb_array_length(d->'B'), jsonb_array_length(d->'C'), jsonb_array_length(d->'D'),
    (select count(*) from jsonb_object_keys(tum_once)) - 3;
end $$;

select 'onarım sonucu' as kontrol,
  (select count(*) from public.stk_varyant z where z.urun_id in ('@@URUNLER@@') and z.aktif and z.renk_id in (select r.id from public.stk_renk r where r.tur = 'model')) as etkin_kombinasyon_varyanti,
  (select count(*) from public.stk_varyant z where z.urun_id in ('@@URUNLER@@') and not z.aktif) as pasif_varyant,
  (select count(*) from public.stk_varyant z where z.urun_id in ('@@URUNLER@@') and z.aktif and z.renk_id in (select r.id from public.stk_renk r where r.tur = 'renk')) as etkin_duz_varyant;
"""

GERI_AL = r"""-- RENK ÇÖKMESİ ONARIMI — GERİ AL (26 Kasım, 2. sürüm). onarim-uygula'nın tersi, TEK BLOK, ya hep ya hiç. Sürüm kapısına DOKUNMAZ.
-- A + B (135) silinir — YALNIZ hareketsizse; C (130) yeniden etkin; D (149) reçete satırı önceki mamulRenk / mamulRenkId'ye döner.
-- İzin verilen yan etkiler: degisiklik.sayaclar — stk_varyant +2, urunler +1; silinen_arsiv — silinen 135 satırın arşiv
-- kaydı (arsiv_silinen tetikleyicisi) ve tetikleyicinin ara ara yaptığı 365 günden eski arşiv temizliği. Diğer her tablo aynı.
do $$
#variable_conflict use_column
""" + BILDIRIM + r"""begin
""" + KILIT + r"""
  v_yeni := array(select x->>'id' from jsonb_array_elements((d->'A') || (d->'B')) x);
  if (select count(*) from public.stk_varyant z where z.id = any(v_yeni) and z.aktif) <> cardinality(v_yeni) then
    raise exception 'GERİ AL DUR: onarımın eklediği 135 varyantın hepsi etkin değil / yok'; end if;
  if exists (select 1 from public.stk_hareket hh where hh.varyant_id = any(v_yeni)) then
    raise exception 'GERİ AL DUR: eklenen varyantlardan birinde hareket var — otomatik geri alınamaz'; end if;
  if (select count(*) from public.stk_varyant z where z.id in (select x->>'id' from jsonb_array_elements(d->'C') x) and not z.aktif) <> jsonb_array_length(d->'C') then
    raise exception 'GERİ AL DUR: pasife alınan 130 varyant beklenen durumda değil'; end if;
  for x in select * from jsonb_array_elements(d->'D') loop
    select z.recete -> ((x->>'sira')::int - 1) into e from public.urunler z where z.id = x->>'u';
    if e->>'mamulRenk' is distinct from x->>'sonra' or e ? 'mamulRenkId'
       or exists (select 1 from jsonb_each(x->'imza') i where e->i.key is distinct from i.value) then
      raise exception 'GERİ AL DUR: reçete % sıra % onarım sonrası durumda değil', x->>'u', x->>'sira'; end if;
  end loop;
  v_eski := array(select z.id from public.stk_varyant z where z.urun_id = any(v_urunler) and z.id <> all(v_yeni));
""" + TUM_IZ.format(hedef="tum_once") + DG_ONCE + r"""
  create temp table geri_once on commit drop as select z.* from public.stk_varyant z where z.urun_id = any(v_urunler);
  select md5(coalesce(string_agg(z::text, '|' order by z::text), '')) into vr_dis_once from public.stk_varyant z where z.urun_id <> all(v_urunler);
  select md5(coalesce(string_agg((to_jsonb(z) - 'recete')::text, '|' order by z.id), '')) into ur_once from public.urunler z;
  select md5(coalesce(string_agg(z.id || '=' || coalesce(z.recete::text, '-'), '|' order by z.id), '')) into rec_dis_once
    from public.urunler z where z.id not in (select distinct x2->>'u' from jsonb_array_elements(d->'D') x2);
  if to_regclass('public.silinen_arsiv') is not null then
    select coalesce(max(z.id), 0) into arsiv_sinir from public.silinen_arsiv z;
    select md5(coalesce(string_agg(z::text, '|' order by z.id), '')) into ar_once from public.silinen_arsiv z where z.zaman >= now() - interval '365 days';
  end if;

  delete from public.stk_varyant z where z.id = any(v_yeni);
  get diagnostics n = row_count; if n <> cardinality(v_yeni) then raise exception 'GERİ AL DUR: % silindi', n; end if;
  update public.stk_varyant z set aktif = true where z.id in (select x->>'id' from jsonb_array_elements(d->'C') x) and not z.aktif;
  get diagnostics n = row_count; if n <> jsonb_array_length(d->'C') then raise exception 'GERİ AL DUR: % etkinleşti', n; end if;
  update public.urunler u set recete = (
    select jsonb_agg(case when dd.x is null then el else el || jsonb_build_object('mamulRenk', dd.x->>'once', 'mamulRenkId', dd.x->>'once_id') end order by i)
    from jsonb_array_elements(u.recete) with ordinality as r(el, i)
    left join lateral (select x from jsonb_array_elements(d->'D') x where x->>'u' = u.id and (x->>'sira')::int = i) dd on true)
  where u.id in (select distinct x->>'u' from jsonb_array_elements(d->'D') x);

  if exists (select 1 from public.stk_varyant z where z.id = any(v_yeni)) then raise exception 'GERİ AL DUR: silinmeyen varyant kaldı'; end if;
  if exists (select 1 from geri_once o join public.stk_varyant z on z.id = o.id
             where (to_jsonb(o) - 'aktif') is distinct from (to_jsonb(z) - 'aktif')
                or (o.aktif is distinct from z.aktif and o.id not in (select x->>'id' from jsonb_array_elements(d->'C') x))) then
    raise exception 'GERİ AL DUR: eski varyantlarda beklenmeyen değişiklik'; end if;
  for x in select * from jsonb_array_elements(d->'D') loop
    select z.recete -> ((x->>'sira')::int - 1) into e from public.urunler z where z.id = x->>'u';
    if e->>'mamulRenk' is distinct from x->>'once' or e->>'mamulRenkId' is distinct from x->>'once_id' then
      raise exception 'GERİ AL DUR: reçete % sıra % önceki hâline dönmedi', x->>'u', x->>'sira'; end if;
  end loop;
  select md5(coalesce(string_agg(z::text, '|' order by z::text), '')) into vr_dis_sonra from public.stk_varyant z where z.urun_id <> all(v_urunler);
  if vr_dis_sonra is distinct from vr_dis_once then raise exception 'GERİ AL DUR: 23 model dışındaki bir varyant değişti'; end if;
  select md5(coalesce(string_agg((to_jsonb(z) - 'recete')::text, '|' order by z.id), '')) into ur_sonra from public.urunler z;
  if ur_sonra is distinct from ur_once then raise exception 'GERİ AL DUR: ürünlerin reçete dışındaki bir alanı değişti'; end if;
  select md5(coalesce(string_agg(z.id || '=' || coalesce(z.recete::text, '-'), '|' order by z.id), '')) into rec_dis_sonra
    from public.urunler z where z.id not in (select distinct x2->>'u' from jsonb_array_elements(d->'D') x2);
  if rec_dis_sonra is distinct from rec_dis_once then raise exception 'GERİ AL DUR: onarım dışındaki bir ürünün reçetesi değişti'; end if;
  if to_regclass('public.silinen_arsiv') is not null then
    if (select count(*) from public.silinen_arsiv z where z.id > arsiv_sinir) <> cardinality(v_yeni)
       or exists (select 1 from public.silinen_arsiv z where z.id > arsiv_sinir and (z.tablo <> 'stk_varyant' or z.islem <> 'DELETE' or z.satir_id <> all(v_yeni))) then
      raise exception 'GERİ AL DUR: arşiv kaydı beklenen 135 silme değil'; end if;
    select md5(coalesce(string_agg(z::text, '|' order by z.id), '')) into ar_sonra from public.silinen_arsiv z
     where z.zaman >= now() - interval '365 days' and z.id <= arsiv_sinir;
    if ar_sonra is distinct from ar_once then raise exception 'GERİ AL DUR: arşivin son 365 günü değişti'; end if;
  end if;
""" + dg_denetim("GERİ AL", {"stk_varyant": 2, "urunler": 1}) + TUM_IZ.format(hedef="tum_sonra") + r"""
  izinli := array['stk_varyant', 'urunler', 'degisiklik', 'silinen_arsiv'];
  if (select array_agg(k2 order by k2) from jsonb_object_keys(tum_once) k2) is distinct from (select array_agg(k2 order by k2) from jsonb_object_keys(tum_sonra) k2) then
    raise exception 'GERİ AL DUR: tablo listesi değişti'; end if;
  for t in select jsonb_object_keys(tum_once) loop
    if t <> all(izinli) and tum_once->>t is distinct from tum_sonra->>t then
      raise exception 'GERİ AL DUR: değişmemesi gereken "%" tablosu değişti', t; end if;
  end loop;
  raise notice 'GERİ AL TAMAM: % varyant silindi (arşive düştü), % yeniden etkin, % reçete satırı önceki hâlinde',
    cardinality(v_yeni), jsonb_array_length(d->'C'), jsonb_array_length(d->'D');
end $$;

select 'geri alma sonucu' as kontrol,
  (select count(*) from public.stk_varyant z where z.urun_id in ('@@URUNLER@@') and not z.aktif) as pasif_varyant,
  (select count(*) from public.stk_varyant z where z.urun_id in ('@@URUNLER@@') and z.aktif and z.renk_id in (select r.id from public.stk_renk r where r.tur = 'renk')) as etkin_duz_varyant;
"""

def yerel_kopya(C, vc, cr, U, hareketli):
    """Canlı envanterdeki 23 modelin durumunu YEREL sınama veritabanına kurar (canlıya ASLA çalıştırılmaz). Kurulum sırasında
    tetikleyiciler ve yabancı anahtarlar devre dışı (session_replication_role = replica): fişsiz hareket / sipariş koruma
    tetikleyicileri yalnız kopyayı kurmak için atlanır; onarım provası tetikleyiciler AÇIKKEN koşar."""
    s = ["-- YEREL KOPYA (yalnız yerel sınama). Canlı envanterden üretildi; CANLIDA ÇALIŞTIRMAYIN.",
         "set session_replication_role = replica;"]
    for k, r in cr.items():
        s.append(f"insert into public.stk_renk (id, ad, tur, kod, barkod_kodu, aktif) values ({lit(k)}, {lit(r['ad'])}, {lit(r['tur'])}, "
                 f"{lit(r['kod']) if r.get('kod') else 'null'}, {lit(r['barkod_kodu']) if r.get('barkod_kodu') else 'null'}, {str(bool(r['aktif'])).lower()}) on conflict (id) do nothing;")
    for o, oid in sorted({(x['olcu'], x['olcu_id']) for x in vc.values()}):
        s.append(f"insert into public.stk_olcu (id, ad) values ({lit(oid)}, {lit(o)}) on conflict (id) do nothing;")
    rec = collections.defaultdict(list); res = collections.defaultdict(list)
    for r in C:
        if r["bolum"] == "5-recete": rec[r["urun_id"]].append(J(r))
        if r["bolum"] == "6-resim": res[r["urun_id"]].append(J(r)["anahtar"])
    adlar = {r["urun_id"]: r["urun"] for r in C if r["bolum"] == "1-urun"}
    for u in U:
        els = []
        for a in sorted(rec[u], key=lambda a: a["sira"]):
            e = {k: v for k, v in a.items() if k not in ("sira", "etkin_varyanta_bagli") and v is not None}
            e["birim"] = "adet"; e["aciklama"] = f"korunacak-{a['sira']}"     # envanterde olmayan alanlar: değişmediği sınanır
            els.append(e)
        s.append(f"insert into public.urunler (id, ad, kategori, recete, renk_resimleri, harici_barkodlar, stok_no) values ({lit(u)}, {lit(adlar[u])}, 'Mamul', "
                 f"{lit(json.dumps(els, ensure_ascii=False)) + '::jsonb' if els else 'null'}, {lit(json.dumps({k: 'gorsel' for k in res[u]}, ensure_ascii=False))}::jsonb, null, {lit('SN-' + u[-4:])});")
    s.append("insert into public.urunler (id, ad, kategori, recete) values ('u-disarida', 'Kapsam dışı model', 'Mamul', '[{\"mamulRenk\":\"1001 - Siyah\",\"miktar\":1}]');")
    s.append("insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('vry-disarida', 'u-disarida', 'renk-mwbu0vhu-6lad', null);")
    for k, x in sorted(vc.items()):
        s.append(f"insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif, olusturma) values ({lit(k)}, {lit(x['u'])}, {lit(x['renk_id'])}, "
                 f"{lit(x['olcu_id'])}, 0, {str(bool(x['aktif'])).lower()}, {lit(x['olusturma'])});")
    s.append("insert into public.stk_fis (id, tur) values ('fis-yerel-1', 'Sayım') on conflict do nothing;")
    for k, n in sorted(hareketli.items()):
        for i in range(n):
            s.append(f"insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak) values ({lit(f'h-{k}-{i}')}, 'fis-yerel-1', {lit(k)}, "
                     f"{lit(vc[k]['u'])}, {1 if i % 2 == 0 else -1}, 'Sayım');")
    for r in C:
        if r["bolum"] == "3-siparis":
            a = J(r)
            s.append(f"insert into public.siparisler (id, siparis_no, tip, cari_id, durum) values ({lit('sip-'+a['siparis_no'])}, {lit(a['siparis_no'])}, 'Satış', 'c-1', {lit(a['durum'])}) on conflict do nothing;")
            s.append(f"insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, karsilanan) values ({lit(a['kalem_id'])}, "
                     f"{lit('sip-'+a['siparis_no'])}, {lit(r['urun_id'])}, {lit(r['urun'])}, {lit(a['renk'])}, {lit(a['beden'])}, {a['miktar']}, {a['karsilanan'] or 0});")
    s.append("insert into public.silinen_arsiv (tablo, islem, satir_id, veri, zaman) values ('cariler', 'DELETE', 'c-eski', '{}', now() - interval '30 days');")
    s.append("reset session_replication_role;")
    return "\n".join(s) + "\n"

if __name__ == "__main__":
    if len(sys.argv) != 5: sys.exit("kullanım: onarim-sql-uret.py <25-1137.csv> <26-1121.csv> <canli.csv> <çıkış-dizini>")
    main(*sys.argv[1:])
