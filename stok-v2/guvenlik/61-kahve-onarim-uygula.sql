-- =====================================================================================================================
--  61-kahve-onarim-uygula.sql — ÜRETİLDİ (stok-v2/guvenlik/61-kahve-onarim-uret.py; ELLE DÜZENLENMEZ).
--  27181 KAHVE ONARIMI: astarın Kahve varyantı etkin Kahve kaydına bağlanır (varyant kimliği, stok, geçmiş aynı); altı reçete satırında
--  renk adı "Kahve", renk kimliği etkin Kahve olur. Yeni varyant açılmaz; renk kaydı silinmez, birleştirilmez.
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
--  Kayıtlar beklenen durumda değilse HİÇBİR ŞEY değişmez ve sebep yazılır. İkinci kez çalıştırmak zararsızdır.
-- =====================================================================================================================
do $$
declare
  n int; nv int; ham7 text; av record; yeni_ad text;
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  perform 1 from public.urunler where id = 'stok-mwnj9g21-nyx6' for update;
  if not found then raise exception 'Ürün bulunamadı (stok-mwnj9g21-nyx6). Hiçbir şey değişmedi.'; end if;
  select * into av from public.stk_varyant where id = 'vry-414c381d2808416ba7aec74c6d77680a' for update;
  if not found then raise exception 'Astar varyantı bulunamadı. Hiçbir şey değişmedi.'; end if;
  if not exists (select 1 from public.stk_renk where id = 'renk-mwnqdfdn-lhy8' and aktif and public.stk_nrm(ad) = 'kahve') or not exists (select 1 from public.stk_renk where id = 'renk-mvwf90xm-d04e' and public.stk_nrm(ad) = 'kahve')
     or not exists (select 1 from public.stk_renk where id = 'renk-mw7p1ue2-b6wc') then
    raise exception 'Renk kayıtları beklenen durumda değil. Hiçbir şey değişmedi.';
  end if;
  select count(*) into n from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = 'stok-mwnj9g21-nyx6' and t.sira = any (array[7, 84, 85, 86, 87, 88]::bigint[])
     and t.r ->> 'renkId' = 'renk-mwnqdfdn-lhy8' and public.stk_nrm(t.r ->> 'renk') = 'kahve';
  if n = 6 and av.renk_id = 'renk-mwnqdfdn-lhy8' then raise notice 'Zaten bu durumda — hiçbir şey değişmedi.'; return; end if;
  select count(*) into n from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = 'stok-mwnj9g21-nyx6' and t.sira = any (array[7, 84, 85, 86, 87, 88]::bigint[])
     and t.r ->> 'renkId' = 'renk-mw7p1ue2-b6wc' and public.stk_nrm(t.r ->> 'renk') = 'kahve';
  if n <> 6 then raise exception 'Altı reçete satırı beklenen durumda değil (uygun satır: %). Hiçbir şey değişmedi.', n; end if;
  if av.renk_id <> 'renk-mvwf90xm-d04e' then raise exception 'Astar varyantı beklenen renk kaydında değil (%). Hiçbir şey değişmedi.', av.renk_id; end if;
  select t.r ->> 'hammaddeUrunId' into ham7 from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = 'stok-mwnj9g21-nyx6' and t.sira = 7;
  if ham7 is distinct from av.urun_id then raise exception 'Satır 7 hammaddesi astar varyantının ürünü değil. Hiçbir şey değişmedi.'; end if;
  if exists (select 1 from public.stk_varyant x where x.urun_id = av.urun_id and x.renk_id = 'renk-mwnqdfdn-lhy8' and coalesce(x.olcu_id, '') = coalesce(av.olcu_id, '')) then
    raise exception 'Astarda hedef renk kaydına bağlı aynı ölçüde varyant zaten var — ikiz olurdu. Hiçbir şey değişmedi.';
  end if;
  -- taban: satır 84–88'in hammaddesinde Kahve varyantlarının HEPSİ etkin Kahve kaydında olmalı (reçete oraya bağlanacak)
  select count(*) filter (where v.renk_id <> 'renk-mwnqdfdn-lhy8'), count(*) into n, nv from public.stk_varyant v join public.stk_renk r on r.id = v.renk_id
   where public.stk_nrm(r.ad) = 'kahve' and v.urun_id in (select t.r ->> 'hammaddeUrunId' from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = 'stok-mwnj9g21-nyx6' and t.sira between 84 and 88);
  if n <> 0 or nv = 0 then raise exception 'Tabanın Kahve varyantları etkin Kahve kaydında değil (başka kayıtta: %, toplam: %). Hiçbir şey değişmedi.', n, nv; end if;
  yeni_ad := (select ad from public.stk_renk where id = 'renk-mwnqdfdn-lhy8');
  select count(*) into nv from public.stk_varyant;
  -- 1) astarın Kahve varyantı: yalnız renk kaydı bağı değişir; varyant kimliği, ölçüsü, hareketleri ve stoku aynı kalır
  update public.stk_varyant set renk_id = 'renk-mwnqdfdn-lhy8' where id = 'vry-414c381d2808416ba7aec74c6d77680a' and renk_id = 'renk-mvwf90xm-d04e';
  -- 2) altı reçete satırı: ad ve kimlik aynı rengi gösterir; satırın başka hiçbir alanı ve başka hiçbir satır değişmez
  update public.urunler u set recete = (select jsonb_agg(case when t.sira = any (array[7, 84, 85, 86, 87, 88]::bigint[]) then t.r || jsonb_build_object('renk', yeni_ad, 'renkId', 'renk-mwnqdfdn-lhy8') else t.r end order by t.sira)
                                           from jsonb_array_elements(u.recete) with ordinality t(r, sira)) where u.id = 'stok-mwnj9g21-nyx6';
  if (select count(*) from public.stk_varyant) <> nv then raise exception 'Varyant sayısı değişti — geri alındı.'; end if;
end $$;
select 'reçete satırı ' || t.sira as kayit, 'renk "' || (t.r ->> 'renk') || '" · renkId ' || (t.r ->> 'renkId') || ' → "' || coalesce((select r.ad from public.stk_renk r where r.id = t.r ->> 'renkId'), '?') || '"' as durum
  from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = 'stok-mwnj9g21-nyx6' and t.sira = any (array[7, 84, 85, 86, 87, 88]::bigint[])
union all select 'astar varyantı vry-414c381d2808416ba7aec74c6d77680a', 'renk_id ' || v.renk_id || ' · geçerli hareket ' || (select count(*) from public.stk_hareket h where h.varyant_id = v.id and not coalesce(h.iptal, false))
       || ' · net ' || (select coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0) from public.stk_hareket h where h.varyant_id = v.id) from public.stk_varyant v where v.id = 'vry-414c381d2808416ba7aec74c6d77680a'
union all select 'astar ürünündeki varyant sayısı', count(*)::text from public.stk_varyant v where v.urun_id = (select urun_id from public.stk_varyant where id = 'vry-414c381d2808416ba7aec74c6d77680a')
union all select 'Kahve renk kayıtları', string_agg(r.id || case when r.aktif then ' etkin' else ' pasif' end || ' ×' || (select count(*) from public.stk_varyant v where v.renk_id = r.id), ' · ' order by r.id) from public.stk_renk r where public.stk_nrm(r.ad) = 'kahve'
order by 1;
