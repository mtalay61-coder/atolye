#!/usr/bin/env python3
# 27181 KAHVE ONARIMI üretici (28 Kasım): 61-kahve-onarim-uygula.sql / -geri-al.sql. Kural: tek do bloğu, yalnız düz `$$`.
# Üretim kararı (kullanıcı): ASTAR DANA = Kahve, LADY BOSS LIGHT TERMO TABAN = Kahve. Yeni varyant AÇILMAZ, renk kaydı SİLİNMEZ / BİRLEŞTİRİLMEZ.
import os, re
D = os.path.dirname(os.path.abspath(__file__))
URUN, SIYAH, ETKIN, PASIF, ASTAR_V = "stok-mwnj9g21-nyx6", "renk-mw7p1ue2-b6wc", "renk-mwnqdfdn-lhy8", "renk-mvwf90xm-d04e", "vry-414c381d2808416ba7aec74c6d77680a"
SATIR = "array[7, 84, 85, 86, 87, 88]::bigint[]"
BASLIK = """-- =====================================================================================================================
--  61-kahve-onarim-%s.sql — ÜRETİLDİ (stok-v2/guvenlik/61-kahve-onarim-uret.py; ELLE DÜZENLENMEZ).
--  %s
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
--  Kayıtlar beklenen durumda değilse HİÇBİR ŞEY değişmez ve sebep yazılır. İkinci kez çalıştırmak zararsızdır.
-- =====================================================================================================================
"""
SON = f"""select 'reçete satırı ' || t.sira as kayit, 'renk "' || (t.r ->> 'renk') || '" · renkId ' || (t.r ->> 'renkId') || ' → "' || coalesce((select r.ad from public.stk_renk r where r.id = t.r ->> 'renkId'), '?') || '"' as durum
  from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = '{URUN}' and t.sira = any ({SATIR})
union all select 'astar varyantı {ASTAR_V}', 'renk_id ' || v.renk_id || ' · geçerli hareket ' || (select count(*) from public.stk_hareket h where h.varyant_id = v.id and not coalesce(h.iptal, false))
       || ' · net ' || (select coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0) from public.stk_hareket h where h.varyant_id = v.id) from public.stk_varyant v where v.id = '{ASTAR_V}'
union all select 'astar ürünündeki varyant sayısı', count(*)::text from public.stk_varyant v where v.urun_id = (select urun_id from public.stk_varyant where id = '{ASTAR_V}')
union all select 'Kahve renk kayıtları', string_agg(r.id || case when r.aktif then ' etkin' else ' pasif' end || ' ×' || (select count(*) from public.stk_varyant v where v.renk_id = r.id), ' · ' order by r.id) from public.stk_renk r where public.stk_nrm(r.ad) = 'kahve'
order by 1;
"""
def blok(ileri):
    # ileri: (kimlik SIYAH; varyant PASIF) → (kimlik ETKIN; varyant ETKIN). Satırdaki ad metnine dokunulmaz.   geri: tersi.
    r_once, r_sonra = (SIYAH, ETKIN) if ileri else (ETKIN, SIYAH)
    v_once, v_sonra = (PASIF, ETKIN) if ileri else (ETKIN, PASIF)
    s = "do $$\ndeclare\n  n int; nv int; ham7 text; av record;\nbegin\n"
    s += "  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then\n    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;\n  end if;\n"
    s += f"  perform 1 from public.urunler where id = '{URUN}' for update;\n  if not found then raise exception 'Ürün bulunamadı ({URUN}). Hiçbir şey değişmedi.'; end if;\n"
    s += f"  select * into av from public.stk_varyant where id = '{ASTAR_V}' for update;\n  if not found then raise exception 'Astar varyantı bulunamadı. Hiçbir şey değişmedi.'; end if;\n"
    s += f"  if not exists (select 1 from public.stk_renk where id = '{ETKIN}' and aktif and public.stk_nrm(ad) = 'kahve') or not exists (select 1 from public.stk_renk where id = '{PASIF}' and public.stk_nrm(ad) = 'kahve')\n     or not exists (select 1 from public.stk_renk where id = '{SIYAH}') then\n    raise exception 'Renk kayıtları beklenen durumda değil. Hiçbir şey değişmedi.';\n  end if;\n"
    s += f"  select count(*) into n from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = '{URUN}' and t.sira = any ({SATIR})\n     and t.r ->> 'renkId' = '{r_sonra}' and public.stk_nrm(t.r ->> 'renk') = 'kahve';\n"
    s += f"  if n = 6 and av.renk_id = '{v_sonra}' then raise notice 'Zaten bu durumda — hiçbir şey değişmedi.'; return; end if;\n"
    s += f"  select count(*) into n from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = '{URUN}' and t.sira = any ({SATIR})\n     and t.r ->> 'renkId' = '{r_once}' and public.stk_nrm(t.r ->> 'renk') = 'kahve';\n"
    s += "  if n <> 6 then raise exception 'Altı reçete satırı beklenen durumda değil (uygun satır: %). Hiçbir şey değişmedi.', n; end if;\n"
    s += f"  if av.renk_id <> '{v_once}' then raise exception 'Astar varyantı beklenen renk kaydında değil (%). Hiçbir şey değişmedi.', av.renk_id; end if;\n"
    s += f"  select t.r ->> 'hammaddeUrunId' into ham7 from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = '{URUN}' and t.sira = 7;\n"
    s += "  if ham7 is distinct from av.urun_id then raise exception 'Satır 7 hammaddesi astar varyantının ürünü değil. Hiçbir şey değişmedi.'; end if;\n"
    s += f"  if exists (select 1 from public.stk_varyant x where x.urun_id = av.urun_id and x.renk_id = '{v_sonra}' and coalesce(x.olcu_id, '') = coalesce(av.olcu_id, '')) then\n    raise exception 'Astarda hedef renk kaydına bağlı aynı ölçüde varyant zaten var — ikiz olurdu. Hiçbir şey değişmedi.';\n  end if;\n"
    if ileri:
        s += f"  -- taban: satır 84–88'in hammaddesinde Kahve varyantlarının HEPSİ etkin Kahve kaydında olmalı (reçete oraya bağlanacak)\n  select count(*) filter (where v.renk_id <> '{ETKIN}'), count(*) into n, nv from public.stk_varyant v join public.stk_renk r on r.id = v.renk_id\n   where public.stk_nrm(r.ad) = 'kahve' and v.urun_id in (select t.r ->> 'hammaddeUrunId' from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = '{URUN}' and t.sira between 84 and 88);\n"
        s += "  if n <> 0 or nv = 0 then raise exception 'Tabanın Kahve varyantları etkin Kahve kaydında değil (başka kayıtta: %, toplam: %). Hiçbir şey değişmedi.', n, nv; end if;\n"
    s += f"  select count(*) into nv from public.stk_varyant;\n"
    s += f"  -- 1) astarın Kahve varyantı: yalnız renk kaydı bağı değişir; varyant kimliği, ölçüsü, hareketleri ve stoku aynı kalır\n  update public.stk_varyant set renk_id = '{v_sonra}' where id = '{ASTAR_V}' and renk_id = '{v_once}';\n"
    s += f"  -- 2) altı reçete satırı: YALNIZ renkId alanı değişir; renk adı metni (\"KAHVE\") dahil satırın başka hiçbir alanı ve başka hiçbir satır değişmez\n"
    s += f"  update public.urunler u set recete = (select jsonb_agg(case when t.sira = any ({SATIR}) then jsonb_set(t.r, '{{renkId}}', to_jsonb('{r_sonra}'::text)) else t.r end order by t.sira)\n                                           from jsonb_array_elements(u.recete) with ordinality t(r, sira)) where u.id = '{URUN}';\n"
    s += "  if (select count(*) from public.stk_varyant) <> nv then raise exception 'Varyant sayısı değişti — geri alındı.'; end if;\n"
    return s + "end $$;\n" + SON
for ad, ic in (("61-kahve-onarim-uygula.sql", BASLIK % ("uygula", "27181 KAHVE ONARIMI: astarın Kahve varyantı etkin Kahve kaydına bağlanır (varyant kimliği, stok, geçmiş aynı); altı reçete satırında\n--  YALNIZ renk kimliği (renkId) etkin Kahve olur; satırdaki ad metni ve diğer alanlar aynı kalır. Yeni varyant açılmaz; renk kaydı silinmez, birleştirilmez.") + blok(True)),
               ("61-kahve-onarim-geri-al.sql", BASLIK % ("geri-al", "GERİ ALMA (AYRI ONAYLA): astar varyantı pasif Kahve kaydına, altı satırın renk kimliği Siyah'a döner.") + blok(False))):
    assert len(re.findall(r"\$", ic)) == 4, (ad, "dolar")
    open(os.path.join(D, ad), "w", encoding="utf8", newline="\n").write(ic); print(ad, len(ic), "bayt")
