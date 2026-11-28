#!/usr/bin/env python3
# PAKET Ö üretici (28 Kasım): 62-o-uygula.sql / 62-o-geri-al.sql / 62-o-durum-salt-okur.sql / 62-o-onkosul-salt-okur.sql.
# Kural: tek do bloğu, yalnız düz `$$`. Eski gövde 62-o-eski-govde.txt'den okunur (geri alma onu geri koyar).
import os, re, hashlib
D = os.path.dirname(os.path.abspath(__file__))
ESKI = open(os.path.join(D, "62-o-eski-govde.txt"), encoding="utf8").read().replace("\r", "").strip("\n").rstrip()
YENI = """
declare
  rid text := public.stk_renk_coz(p_renk_id, p_renk);
  oid_ text;
  v text;
  u record;
  tip text;
  o_id text; o_ad text; o_tur text;
  n int; m int;
begin
  select id, ad, coalesce(nullif(btrim(olcu_tipi), ''), 'Beden') as olcu_tipi into u from public.urunler where id = p_urun_id;
  if not found then
    raise exception 'Ürün bulunamadı: %', p_urun_id using errcode = 'P0002';
  end if;
  tip := u.olcu_tipi;
  -- ÖLÇÜ, ÜRÜNÜN GRUBUNDA VE MEVCUT KİMLİKLERİ ÜZERİNDEN ÇÖZÜLÜR (Paket Ö). Eskiden yalnız ADA bakılırdı (stk_olcu_coz: etkin olan, sonra
  -- kimlik sırası): "36" hem Beden hem Boyut grubunda tanımlıyken Boyut ölçülü ürüne gelen işlem Beden kaydına çözülüyor, üründe
  -- aynı adla İKİNCİ varyant açılıyordu (ölçüm: SÜNGER'e ekrandan stok girişi). Sıra:
  --   1. kimlik verilmiş ve kayıt varsa o kayıt;
  --   2. ürünün bu adla zaten varyantı varsa ONUN ölçü kaydı (birden çok kimlik varsa hata — sunucu seçmez);
  --   3. yoksa ürünün grubundaki (Beden / Boyut) aynı adlı ölçü kaydı;
  --   4. grubu olmayan (Serbest) üründe ya da o adla hiç kayıt yokken eski kural (stk_olcu_coz) aynen sürer.
  -- Ürünün grubu ile bulunan ölçü kaydının grubu çelişirse (Beden ↔ Boyut) hiçbiri seçilmez: açık hata, hiçbir şey yazılmaz.
  if public.stk_yer_tutucu_mu(p_olcu) and coalesce(p_olcu_id, '') = '' then
    oid_ := null;
  else
    if coalesce(p_olcu_id, '') <> '' then select id, ad, tur into o_id, o_ad, o_tur from public.stk_olcu where id = p_olcu_id; end if;
    if o_id is null and not public.stk_yer_tutucu_mu(p_olcu) then
      select count(distinct sv.olcu_id) into n from public.stk_varyant sv join public.stk_olcu x on x.id = sv.olcu_id
       where sv.urun_id = p_urun_id and public.stk_nrm(x.ad) = public.stk_nrm(p_olcu);
      if n > 1 then
        raise exception 'KR061: "%" ürününde "%" ölçüsü birden çok ölçü kaydına bağlı — hangisinin kullanılacağı belirsiz; hiçbir şey kaydedilmedi. Önce ölçü kayıtları düzeltilmeli.', u.ad, btrim(p_olcu) using errcode = 'KR061';
      elsif n = 1 then
        select x.id, x.ad, x.tur into o_id, o_ad, o_tur from public.stk_varyant sv join public.stk_olcu x on x.id = sv.olcu_id
         where sv.urun_id = p_urun_id and public.stk_nrm(x.ad) = public.stk_nrm(p_olcu) limit 1;
      elsif tip in ('Beden', 'Boyut') then
        select count(*) filter (where x.aktif), count(*) into n, m from public.stk_olcu x where public.stk_nrm(x.ad) = public.stk_nrm(p_olcu) and x.tur = tip;
        if n > 1 or (n = 0 and m > 1) then
          raise exception 'KR061: "%" ölçüsü % grubunda birden çok kayıtla tanımlı — hangisinin kullanılacağı belirsiz; hiçbir şey kaydedilmedi.', btrim(p_olcu), tip using errcode = 'KR061';
        elsif m >= 1 then
          select x.id, x.ad, x.tur into o_id, o_ad, o_tur from public.stk_olcu x where public.stk_nrm(x.ad) = public.stk_nrm(p_olcu) and x.tur = tip order by x.aktif desc, x.id limit 1;
        elsif exists (select 1 from public.stk_olcu x where public.stk_nrm(x.ad) = public.stk_nrm(p_olcu) and x.tur in ('Beden', 'Boyut')) then
          raise exception 'KR062: "%" ürünü % grubunda; "%" ölçüsü yalnız başka grupta tanımlı — başka grubun kaydı kullanılmadı, hiçbir şey kaydedilmedi. Ölçü Tanımlar''da % grubuna eklenmeli ya da ürünün ölçü tipi düzeltilmeli.',
            u.ad, tip, btrim(p_olcu), tip using errcode = 'KR062';
        end if;
      end if;
    end if;
    if o_id is not null then
      if tip in ('Beden', 'Boyut') and o_tur in ('Beden', 'Boyut') and o_tur <> tip then
        raise exception 'KR062: "%" ürününün ölçü tipi % ama "%" ölçüsü % grubundaki kayda bağlı — ikisinden biri sessizce seçilmedi, hiçbir şey kaydedilmedi. Ürünün ölçü tipi ya da ölçü kaydı düzeltilmeli.',
          u.ad, tip, o_ad, o_tur using errcode = 'KR062';
      end if;
      oid_ := o_id;
    else
      oid_ := public.stk_olcu_coz(p_olcu_id, p_olcu);   -- eski kural: grubu olmayan ürün ya da o adla hiç kayıt yok (serbest ölçü açılır)
    end if;
  end if;
  select id into v from public.stk_varyant
   where urun_id = p_urun_id and coalesce(renk_id, '') = coalesce(rid, '') and coalesce(olcu_id, '') = coalesce(oid_, '');
  if v is null then
    insert into public.stk_varyant (urun_id, renk_id, olcu_id) values (p_urun_id, rid, oid_)
    on conflict do nothing
    returning id into v;
    if v is null then   -- aynı anda başka işlem açtı
      select id into v from public.stk_varyant
       where urun_id = p_urun_id and coalesce(renk_id, '') = coalesce(rid, '') and coalesce(olcu_id, '') = coalesce(oid_, '');
    end if;
  end if;
  return v;
end
""".strip("\n")
assert "$" not in YENI and "$" not in ESKI
def q(g): return "'" + g.replace("'", "''") + "'"
def oz(g): return hashlib.md5(re.sub(r"\s+", " ", g).strip().encode("utf8")).hexdigest()
OZ_SQL = "md5(btrim(regexp_replace(p.prosrc, '\\s+', ' ', 'g')))"
IMZA = "public.stk_varyant_coz(text,text,text,text,text)"
BASLIK = """-- =====================================================================================================================
--  62-o-%s.sql — ÜRETİLDİ (stok-v2/guvenlik/62-o-uret.py; ELLE DÜZENLENMEZ).
--  PAKET Ö — %s
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
"""
CELISKI = """select u.id, u.ad, coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden') as tip, o.tur, count(*) as n, string_agg(o.ad, ', ' order by o.ad) as olculer
   from public.stk_varyant v join public.urunler u on u.id = v.urun_id join public.stk_olcu o on o.id = v.olcu_id
  where coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden') in ('Beden', 'Boyut') and o.tur in ('Beden', 'Boyut') and o.tur <> coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden')
  group by u.id, u.ad, u.olcu_tipi, o.tur"""
DURUM = f"""with cel as ({CELISKI})
select 1 as no, 'stk_varyant_coz gövdesi' as kontrol, case {OZ_SQL} when '{oz(YENI)}' then 'YENİ — ölçü ürünün grubunda çözülür (Paket Ö KURULU)' when '{oz(ESKI)}' then 'ESKİ — ölçü yalnız ada göre çözülür (Paket Ö KURULU DEĞİL)' else 'BEKLENMEYEN GÖVDE — sonucu gönder' end as durum
  from pg_proc p where p.oid = to_regprocedure('{IMZA}')
union all select 2, 'fonksiyon authenticated / anon tarafından doğrudan çağrılamaz', case when has_function_privilege('authenticated', to_regprocedure('{IMZA}'), 'execute') or has_function_privilege('anon', to_regprocedure('{IMZA}'), 'execute') then 'HAYIR' else 'evet' end
union all select 3, 'BİLGİ · ölçü tipi ile varyantının ölçü grubu ÇELİŞEN ürün (Paket Ö kuruluyken bu ürünlerde işlem AÇIK HATA verir)', (select count(*)::text || ' ürün' || coalesce(' — ' || string_agg(ad || ' [ürün ' || tip || ', varyant ' || tur || ' ×' || n || ']', ' ; '), '') from cel)
order by 1;
"""
ONKOSUL = f"""-- PAKET Ö CANLI ÖNKOŞUL — SALT OKUR (28 Kasım). Hiçbir şey yazmaz. 62-o-uygula.sql'den ÖNCE ana projede çalıştırılır.
-- Beklenen: 1–3 "tamam"; 4. satır ENGEL DEĞİL ama doluysa o ürünlerde kurulumdan sonra işlem açık hata verir (karar gerekir); GENEL "HAZIR".
with cel as ({CELISKI}),
ad as (select public.stk_nrm(o.ad) as a, o.tur, count(*) filter (where o.aktif) as etkin, count(*) as n from public.stk_olcu o where o.tur in ('Beden', 'Boyut') group by 1, 2),
k(no, kontrol, beklenen, bulunan, tamam) as (
  select 1, 'stk_varyant_coz gövdesi sınanan eski gövdeyle aynı', 'aynı', (select case {OZ_SQL} when '{oz(ESKI)}' then 'aynı' when '{oz(YENI)}' then 'ZATEN YENİ (Paket Ö kurulu)' else 'FARKLI — özet ' || {OZ_SQL} end from pg_proc p where p.oid = to_regprocedure('{IMZA}')),
         coalesce((select {OZ_SQL} = '{oz(ESKI)}' from pg_proc p where p.oid = to_regprocedure('{IMZA}')), false)
  union all select 2, 'gerekli fonksiyonlar (stk_renk_coz, stk_olcu_coz, stk_yer_tutucu_mu, stk_nrm)', 'hepsi var',
         coalesce((select 'EKSİK: ' || string_agg(x, ', ') from unnest(array['public.stk_renk_coz(text,text)', 'public.stk_olcu_coz(text,text)', 'public.stk_yer_tutucu_mu(text)', 'public.stk_nrm(text)']) x where to_regprocedure(x) is null), 'hepsi var'),
         not exists (select 1 from unnest(array['public.stk_renk_coz(text,text)', 'public.stk_olcu_coz(text,text)', 'public.stk_yer_tutucu_mu(text)', 'public.stk_nrm(text)']) x where to_regprocedure(x) is null)
  union all select 3, 'aynı grupta aynı adla birden çok ETKİN ölçü kaydı (belirsizlik → KR061)', '0', (select count(*)::text || coalesce(' — ' || string_agg(a || ' [' || tur || '] ×' || etkin, ', '), '') from ad where etkin > 1), not exists (select 1 from ad where etkin > 1)
  union all select 4, 'BİLGİ · ürünün ölçü tipi ile varyantının ölçü grubu ÇELİŞEN ürünler (kurulumdan sonra bu ürünlerde işlem AÇIK HATA verir)', '',
         (select count(*)::text || ' ürün' || coalesce(' — ' || string_agg(ad || ' [ürün ' || tip || ', varyant ' || tur || ' ×' || n || ': ' || olculer || ']', ' ; '), '') from cel), true
  union all select 5, 'BİLGİ · ürünlerin ölçü tipi dağılımı', '', (select string_agg(t || ' ×' || n, ' · ' order by t) from (select coalesce(nullif(btrim(olcu_tipi), ''), '(boş → Beden)') t, count(*) n from public.urunler group by 1) q), true
  union all select 6, 'BİLGİ · ölçü kayıtları (grup: etkin / toplam) ve iki grupta da geçen adlar', '',
         (select string_agg(tur || ' ' || e || '/' || n, ' · ' order by tur) from (select tur, count(*) filter (where aktif) e, count(*) n from public.stk_olcu group by tur) q)
         || ' · iki grupta da olan ad: ' || coalesce((select string_agg(a, ', ' order by a) from (select a from ad group by a having count(*) > 1) z), 'yok'), true
  union all select 7, 'BİLGİ · varyantı Boyut grubunda olan ürünler (ürün: ölçü tipi ×varyant)', '',
         coalesce((select string_agg(t, ' ; ') from (select u.ad || ': ürün ölçü tipi ' || coalesce(nullif(btrim(u.olcu_tipi), ''), '(boş → Beden)') || ' ×' || count(*) as t from public.stk_varyant v join public.urunler u on u.id = v.urun_id join public.stk_olcu o on o.id = v.olcu_id where o.tur = 'Boyut' group by u.id, u.ad, u.olcu_tipi) q), 'yok'), true
  union all select 8, 'BİLGİ · Paket V (ikiz varyant koruması)', '', (select case when count(*) = 1 then 'kurulu' else 'kurulu değil' end from pg_trigger g where not g.tgisinternal and g.tgname = 'v_ikiz_varyant_koru'), true
)
select no, kontrol, beklenen, bulunan, case when no >= 4 then 'bilgi' when tamam then 'tamam' else 'ENGEL' end as durum from k
union all select 99, 'GENEL', '', '', case when (select bool_and(tamam) from k) then 'HAZIR' else 'HAZIR DEĞİL — ENGEL satırlarını gönder' end
order by 1;
"""
def paket(ad, aciklama, govde):
    t = BASLIK % (ad, aciklama) + "do $$\ndeclare\n  o text;\nbegin\n"
    t += "  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then\n    raise exception 'Paket Ö postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;\n  end if;\n"
    t += f"  select {OZ_SQL} into o from pg_proc p where p.oid = to_regprocedure('{IMZA}');\n  if o is null then raise exception 'stk_varyant_coz bulunamadı. Hiçbir şey değişmedi.'; end if;\n"
    t += f"  if o not in ('{oz(YENI)}', '{oz(ESKI)}') then\n    raise exception 'stk_varyant_coz gövdesi beklenen iki sürümden biri değil (özet %). Hiçbir şey değişmedi — sonucu gönderin.', o;\n  end if;\n"
    t += f"  create or replace function public.stk_varyant_coz(p_urun_id text, p_renk_id text, p_renk text, p_olcu_id text, p_olcu text) returns text language plpgsql volatile security definer set search_path = public as {q(chr(10) + govde + ' ')};\n"
    return t + "end $$;\n" + DURUM
for ad, ic in (("62-o-uygula.sql", paket("uygula", "ölçü, ürünün Beden / Boyut grubunda ve mevcut varyant kimlikleri üzerinden çözülür; yalnız ada göre seçim yapılmaz.\n--  Ürünün ölçü tipi ile ölçü kaydının grubu çelişirse açık hata verir. Yalnız stk_varyant_coz gövdesi değişir; veriye dokunmaz.", YENI)),
               ("62-o-geri-al.sql", paket("geri-al", "GERİ ALMA (AYRI ONAYLA): stk_varyant_coz eski gövdesine döner (ölçü yalnız ada göre). Veriye dokunmaz.", ESKI)),
               ("62-o-durum-salt-okur.sql", "-- PAKET Ö DURUMU — SALT OKUR. Hiçbir şey yazmaz.\n" + DURUM), ("62-o-onkosul-salt-okur.sql", ONKOSUL)):
    assert len(re.findall(r"\$", ic)) in (0, 4), (ad, "dolar")
    open(os.path.join(D, ad), "w", encoding="utf8", newline="\n").write(ic); print(ad, len(ic), "bayt")
