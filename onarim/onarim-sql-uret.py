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
import csv, json, sys, os, hashlib, collections

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
    if "$veri$" in vj: sys.exit("DUR: veri ayıracı çakışıyor")
    open(f"{cikis}/onarim-uygula.sql", "w", encoding="utf-8").write(UYGULA.replace("@@VERI@@", vj))
    open(f"{cikis}/onarim-geri-al.sql", "w", encoding="utf-8").write(GERI_AL.replace("@@VERI@@", vj))
    open(f"{cikis}/yerel-kopya.sql", "w", encoding="utf-8").write(yerel_kopya(C, vc, cr, U, hareketli))
    print(f"üretildi: A {len(A)} · B {len(B)} · C {len(Cc)} · D {len(D)} · ürün {len(U)} · hareketli varyant {len(hareketli)}")

ORTAK = r"""
  -- PARMAK İZLERİ: değişmemesi gereken her şey (önce / sonra karşılaştırılır).
  create or replace function pg_temp.iz(p_urunler text[], p_eski text[]) returns jsonb language sql as $iz$
    select jsonb_build_object(
      'siparis', (select md5(coalesce(string_agg(to_jsonb(k)::text, '|' order by k.id), '')) from public.siparis_kalemleri k where k.urun_id = any(p_urunler)),
      'siparis_baslik', (select md5(coalesce(string_agg(to_jsonb(s)::text, '|' order by s.id), '')) from public.siparisler s
                         where s.id in (select siparis_id from public.siparis_kalemleri where urun_id = any(p_urunler))),
      'hareket', (select md5(coalesce(string_agg(to_jsonb(h)::text, '|' order by h.id), '')) from public.stk_hareket h where h.urun_id = any(p_urunler)),
      'fis', (select md5(coalesce(string_agg(to_jsonb(f)::text, '|' order by f.id), '')) from public.stk_fis f
              where f.id in (select fis_id from public.stk_hareket where urun_id = any(p_urunler))),
      'stok', (select md5(coalesce(string_agg(s.varyant_id || '=' || s.miktar::text, '|' order by s.varyant_id), '')) from public.stk_stok s where s.varyant_id = any(p_eski)),
      'renk', (select md5(coalesce(string_agg(to_jsonb(r)::text, '|' order by r.id), '')) from public.stk_renk r),
      'olcu', (select md5(coalesce(string_agg(to_jsonb(o)::text, '|' order by o.id), '')) from public.stk_olcu o),
      'tanimlar', (select md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by t.id), '')) from public.tanimlar t),
      'urun_diger', (select md5(coalesce(string_agg((to_jsonb(u) - 'recete' - 'guncelleme' - 'guncelleyen' - 'surum')::text, '|' order by u.id), ''))
                     from public.urunler u where u.id = any(p_urunler)),
      'varyant_diger', (select md5(coalesce(string_agg((to_jsonb(v) - 'aktif')::text, '|' order by v.id), '')) from public.stk_varyant v where v.id = any(p_eski))
    ) $iz$;
"""

UYGULA = r"""-- RENK ÇÖKMESİ ONARIMI — UYGULA (26 Kasım). TEK BLOK: ön koşullardan biri, değişiklik ya da son koşullardan biri tutmazsa
-- RAISE EXCEPTION → blok bütünüyle geri alınır, HİÇBİR kayıt değişmez (kısmi onarım YOK). Başarıda son satır "ONARIM TAMAM".
-- Kapsam: A 100 geri ekleme (eski kimlik) · B 35 yeni kombinasyon varyantı (önceden belirlenmiş kimlik) · C 130 düz varyant
-- yalnız aktif=false · D 149 reçete satırında yalnız mamulRenk / mamulRenkId. E (8 hammadde rengi) YOK.
-- ÖNKOŞUL (insan): 1.744.37 yayında, bütün cihazlarda sürüm 1.744.37 görünüyor, onarım sırasında renk adı değiştirilmiyor.
do $onarim$
#variable_conflict use_column
declare
  d jsonb := $veri$@@VERI@@$veri$::jsonb;
  v_urunler text[] := array(select jsonb_array_elements_text(d->'urunler'));
  v_eski text[];
  once jsonb; sonra jsonb;
  x jsonb; n int; m int; k text; t text;
  e jsonb; beklenen jsonb;
begin
  lock table public.stk_varyant, public.urunler, public.stk_renk in share row exclusive mode;   -- araya yazma girmesin
  v_eski := array(select v.id from public.stk_varyant v where v.urun_id = any(v_urunler));
""" + ORTAK + r"""
  -- ── 1. ÖN KOŞULLAR ──────────────────────────────────────────────────────────────────────────────────────────────────
  -- 1a. 23 modelin varyant kümesi canlı envanterdekiyle BİREBİR (eksik / fazla yok)
  for k in select jsonb_object_keys(d->'beklenen_varyant') loop
    if array(select v.id from public.stk_varyant v where v.urun_id = k order by v.id)
       is distinct from array(select jsonb_array_elements_text(d->'beklenen_varyant'->k) order by 1) then
      raise exception 'ONARIM DUR: % ürününün varyant kümesi envanterdekinden farklı', k;
    end if;
  end loop;
  -- 1b. kombinasyon ve renk tanımları beklenen adla, etkin
  for k, t in select * from jsonb_each_text(d->'kombiler') loop
    if not exists (select 1 from public.stk_renk r where r.id = k and r.ad = t and r.tur = 'model' and r.aktif) then
      raise exception 'ONARIM DUR: kombinasyon % beklenen durumda değil (ad %)', k, t; end if;
  end loop;
  for k, t in select * from jsonb_each_text(d->'renkler') loop
    if not exists (select 1 from public.stk_renk r where r.id = k and r.ad = t and r.tur = 'renk') then
      raise exception 'ONARIM DUR: renk % beklenen adda değil (%)', k, t; end if;
  end loop;
  if (select count(*) from public.stk_olcu o where o.id in (select jsonb_array_elements_text(d->'olculer'))) <> jsonb_array_length(d->'olculer') then
    raise exception 'ONARIM DUR: ölçü tanımları eksik'; end if;
  -- 1c. A ve B: kimlik de (ürün, kombinasyon, ölçü) üçlüsü de YOK
  for x in select * from jsonb_array_elements((d->'A') || (d->'B')) loop
    if exists (select 1 from public.stk_varyant v where v.id = x->>'id'
               or (v.urun_id = x->>'u' and v.renk_id = x->>'r' and coalesce(v.olcu_id, '') = coalesce(x->>'o', ''))) then
      raise exception 'ONARIM DUR: % (veya aynı ürün/kombinasyon/ölçü) zaten var', x->>'id'; end if;
  end loop;
  -- 1d. C: etkin, beklenen ürün/renk/ölçü, hareketsiz, stoksuz
  for x in select * from jsonb_array_elements(d->'C') loop
    if not exists (select 1 from public.stk_varyant v where v.id = x->>'id' and v.urun_id = x->>'u' and v.renk_id = x->>'r'
                   and coalesce(v.olcu_id, '') = coalesce(x->>'o', '') and v.aktif)
       or exists (select 1 from public.stk_hareket h where h.varyant_id = x->>'id') then
      raise exception 'ONARIM DUR: düz varyant % beklenen durumda değil (etkin, hareketsiz)', x->>'id'; end if;
  end loop;
  -- 1e. D: reçete uzunluğu ve her satırın sırası, imzası, ÖNCEKİ mamulRenk / mamulRenkId'si
  for k, n in select key, value::int from jsonb_each_text(d->'recete_uzunluk') loop
    if (select jsonb_array_length(coalesce(recete, '[]'::jsonb)) from public.urunler where id = k) is distinct from n then
      raise exception 'ONARIM DUR: % reçetesi % satır değil', k, n; end if;
  end loop;
  for x in select * from jsonb_array_elements(d->'D') loop
    select u.recete -> ((x->>'sira')::int - 1) into e from public.urunler u where u.id = x->>'u';
    if e is null or e->>'mamulRenk' is distinct from x->>'once' or e->>'mamulRenkId' is distinct from x->>'once_id'
       or exists (select 1 from jsonb_each(x->'imza') i where e->i.key is distinct from i.value) then
      raise exception 'ONARIM DUR: reçete % sıra % beklenen durumda değil', x->>'u', x->>'sira'; end if;
  end loop;

  once := pg_temp.iz(v_urunler, v_eski);
  create temp table onarim_recete_once on commit drop as select id, recete from public.urunler where id = any(v_urunler);

  -- ── 2. DEĞİŞİKLİK ───────────────────────────────────────────────────────────────────────────────────────────────────
  insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif, olusturma)
  select x->>'id', x->>'u', x->>'r', x->>'o', (x->>'min')::numeric, true, (x->>'olus')::timestamptz from jsonb_array_elements(d->'A') x;
  get diagnostics n = row_count; if n <> jsonb_array_length(d->'A') then raise exception 'ONARIM DUR: A % eklendi', n; end if;
  insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif)
  select x->>'id', x->>'u', x->>'r', x->>'o', 0, true from jsonb_array_elements(d->'B') x;
  get diagnostics n = row_count; if n <> jsonb_array_length(d->'B') then raise exception 'ONARIM DUR: B % eklendi', n; end if;
  update public.stk_varyant v set aktif = false
   where v.id in (select x->>'id' from jsonb_array_elements(d->'C') x) and v.aktif;
  get diagnostics n = row_count; if n <> jsonb_array_length(d->'C') then raise exception 'ONARIM DUR: C % pasife alındı', n; end if;
  update public.urunler u set recete = (
    select jsonb_agg(case when dd.x is null then el else (el - 'mamulRenkId') || jsonb_build_object('mamulRenk', dd.x->>'sonra') end order by i)
    from jsonb_array_elements(u.recete) with ordinality as r(el, i)
    left join lateral (select x from jsonb_array_elements(d->'D') x where x->>'u' = u.id and (x->>'sira')::int = i) dd on true)
  where u.id in (select distinct x->>'u' from jsonb_array_elements(d->'D') x);
  get diagnostics n = row_count; if n <> (select count(*) from jsonb_object_keys(d->'recete_uzunluk')) then raise exception 'ONARIM DUR: % ürün reçetesi güncellendi', n; end if;

  -- ── 3. SON KOŞULLAR ─────────────────────────────────────────────────────────────────────────────────────────────────
  for x in select * from jsonb_array_elements((d->'A') || (d->'B')) loop
    if not exists (select 1 from public.stk_varyant v where v.id = x->>'id' and v.urun_id = x->>'u' and v.renk_id = x->>'r'
                   and v.olcu_id = x->>'o' and v.aktif) then raise exception 'ONARIM DUR: % beklenen kimlikle oluşmadı', x->>'id'; end if;
  end loop;
  if (select count(*) from public.stk_varyant v where v.urun_id = any(v_urunler)) <> cardinality(v_eski) + jsonb_array_length(d->'A') + jsonb_array_length(d->'B') then
    raise exception 'ONARIM DUR: varyant sayısı beklenmeyen'; end if;
  if (select count(*) from public.stk_varyant v where v.id = any(v_eski) and not v.aktif) <> jsonb_array_length(d->'C')
     or exists (select 1 from public.stk_varyant v where v.id = any(v_eski) and not v.aktif and v.id not in (select x->>'id' from jsonb_array_elements(d->'C') x)) then
    raise exception 'ONARIM DUR: pasife alınan küme beklenmeyen'; end if;
  -- reçete: yalnız D satırlarının mamulRenk / mamulRenkId alanı değişti, başka hiçbir öğe / alan değişmedi
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
  if exists (select 1 from onarim_recete_once o join public.urunler u on u.id = o.id where jsonb_array_length(coalesce(o.recete, '[]'::jsonb)) <> jsonb_array_length(coalesce(u.recete, '[]'::jsonb))) then
    raise exception 'ONARIM DUR: reçete uzunluğu değişti'; end if;
  sonra := pg_temp.iz(v_urunler, v_eski);
  for k in select jsonb_object_keys(once) loop
    if once->k is distinct from sonra->k then raise exception 'ONARIM DUR: değişmemesi gereken "%" değişti', k; end if;
  end loop;
  raise notice 'ONARIM TAMAM: % geri eklendi, % yeni açıldı, % pasife alındı, % reçete satırı düzeltildi; sipariş / hareket / stok / renk / ölçü / Tanımlar / ürünün diğer alanları aynı',
    jsonb_array_length(d->'A'), jsonb_array_length(d->'B'), jsonb_array_length(d->'C'), jsonb_array_length(d->'D');
end $onarim$;
"""

GERI_AL = r"""-- RENK ÇÖKMESİ ONARIMI — GERİ AL (26 Kasım). onarim-uygula.sql'in tam tersi, TEK BLOK, ya hep ya hiç.
-- A + B (135) silinir — YALNIZ hareketsizse (hareket varsa DURUR: o varyant kullanılmaya başlamıştır, el ile karar gerekir);
-- C (130) yeniden etkin; D (149) reçete satırı önceki mamulRenk / mamulRenkId'ye döner. Silinen 135 satır arsive_kopyala_silinen
-- tetikleyicisi varsa arşive düşer.
do $geri$
#variable_conflict use_column
declare
  d jsonb := $veri$@@VERI@@$veri$::jsonb;
  v_urunler text[] := array(select jsonb_array_elements_text(d->'urunler'));
  yeni text[] := array(select x->>'id' from jsonb_array_elements((d->'A') || (d->'B')) x);
  v_eski text[];
  once jsonb; sonra jsonb; x jsonb; e jsonb; n int;
begin
  lock table public.stk_varyant, public.urunler, public.stk_renk in share row exclusive mode;
  if (select count(*) from public.stk_varyant v where v.id = any(yeni) and v.aktif) <> cardinality(yeni) then
    raise exception 'GERİ AL DUR: onarımın eklediği 135 varyantın hepsi etkin değil / yok'; end if;
  if exists (select 1 from public.stk_hareket h where h.varyant_id = any(yeni)) then
    raise exception 'GERİ AL DUR: eklenen varyantlardan birinde hareket var — otomatik geri alınamaz'; end if;
  if (select count(*) from public.stk_varyant v where v.id in (select x->>'id' from jsonb_array_elements(d->'C') x) and not v.aktif) <> jsonb_array_length(d->'C') then
    raise exception 'GERİ AL DUR: pasife alınan 130 varyant beklenen durumda değil'; end if;
  for x in select * from jsonb_array_elements(d->'D') loop
    select u.recete -> ((x->>'sira')::int - 1) into e from public.urunler u where u.id = x->>'u';
    if e->>'mamulRenk' is distinct from x->>'sonra' or e ? 'mamulRenkId'
       or exists (select 1 from jsonb_each(x->'imza') i where e->i.key is distinct from i.value) then
      raise exception 'GERİ AL DUR: reçete % sıra % onarım sonrası durumda değil', x->>'u', x->>'sira'; end if;
  end loop;
  v_eski := array(select v.id from public.stk_varyant v where v.urun_id = any(v_urunler) and v.id <> all(yeni));
""" + ORTAK + r"""
  once := pg_temp.iz(v_urunler, v_eski);
  delete from public.stk_varyant where id = any(yeni);
  get diagnostics n = row_count; if n <> cardinality(yeni) then raise exception 'GERİ AL DUR: % silindi', n; end if;
  update public.stk_varyant set aktif = true where id in (select x->>'id' from jsonb_array_elements(d->'C') x) and not aktif;
  get diagnostics n = row_count; if n <> jsonb_array_length(d->'C') then raise exception 'GERİ AL DUR: % etkinleşti', n; end if;
  update public.urunler u set recete = (
    select jsonb_agg(case when dd.x is null then el else el || jsonb_build_object('mamulRenk', dd.x->>'once', 'mamulRenkId', dd.x->>'once_id') end order by i)
    from jsonb_array_elements(u.recete) with ordinality as r(el, i)
    left join lateral (select x from jsonb_array_elements(d->'D') x where x->>'u' = u.id and (x->>'sira')::int = i) dd on true)
  where u.id in (select distinct x->>'u' from jsonb_array_elements(d->'D') x);
  sonra := pg_temp.iz(v_urunler, v_eski);
  for x in select to_jsonb(k) from jsonb_object_keys(once) k loop
    if once->(x->>0) is distinct from sonra->(x->>0) then raise exception 'GERİ AL DUR: değişmemesi gereken "%" değişti', x->>0; end if;
  end loop;
  raise notice 'GERİ AL TAMAM: % varyant silindi, % yeniden etkin, % reçete satırı önceki hâlinde', cardinality(yeni), jsonb_array_length(d->'C'), jsonb_array_length(d->'D');
end $geri$;
"""

def yerel_kopya(C, vc, cr, U, hareketli):
    """Canlı envanterdeki 23 modelin durumunu YEREL sınama veritabanına kurar (canlıya ASLA çalıştırılmaz)."""
    s = ["-- YEREL KOPYA (yalnız yerel sınama). Canlı envanterden üretildi; CANLIDA ÇALIŞTIRMAYIN.",
         "alter table public.urunler add column if not exists recete jsonb, add column if not exists renk_resimleri jsonb,",
         "  add column if not exists harici_barkodlar jsonb, add column if not exists guncelleme timestamptz;"]
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
        s.append(f"insert into public.urunler (id, ad, kategori, recete, renk_resimleri, harici_barkodlar) values ({lit(u)}, {lit(adlar[u])}, 'Mamul', "
                 f"{lit(json.dumps(els, ensure_ascii=False)) + '::jsonb' if els else 'null'}, {lit(json.dumps({k: 'gorsel' for k in res[u]}, ensure_ascii=False))}::jsonb, null);")
    for k, x in sorted(vc.items()):
        s.append(f"insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif, olusturma) values ({lit(k)}, {lit(x['u'])}, {lit(x['renk_id'])}, "
                 f"{lit(x['olcu_id'])}, 0, {str(bool(x['aktif'])).lower()}, {lit(x['olusturma'])});")
    s.append("insert into public.stk_fis (id, tur) values ('fis-yerel-1', 'Sayım') on conflict do nothing;")
    for k, n in sorted(hareketli.items()):   # envanterdeki hareket sayısı kadar, net 0 (stok 0) hareket
        for i in range(n):
            s.append(f"insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak) values ({lit(f'h-{k}-{i}')}, 'fis-yerel-1', {lit(k)}, "
                     f"{lit(vc[k]['u'])}, {1 if i % 2 == 0 else -1}, 'Sayım');")
    sip = {}
    for r in C:
        if r["bolum"] == "3-siparis":
            a = J(r); sip.setdefault(a["siparis_no"], a["durum"])
            s.append(f"insert into public.siparisler values ({lit('sip-'+a['siparis_no'])}, {lit(a['siparis_no'])}, 'Satış', 'c-1', {lit(a['durum'])}, null, 1) on conflict do nothing;")
            s.append(f"insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, karsilanan) values ({lit(a['kalem_id'])}, "
                     f"{lit('sip-'+a['siparis_no'])}, {lit(r['urun_id'])}, {lit(r['urun'])}, {lit(a['renk'])}, {lit(a['beden'])}, {a['miktar']}, {a['karsilanan'] or 0});")
    return "\n".join(s) + "\n"

if __name__ == "__main__":
    if len(sys.argv) != 5: sys.exit("kullanım: onarim-sql-uret.py <25-1137.csv> <26-1121.csv> <canli.csv> <çıkış-dizini>")
    main(*sys.argv[1:])
