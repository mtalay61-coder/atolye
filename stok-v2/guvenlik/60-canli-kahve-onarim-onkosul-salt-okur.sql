-- 27181 REÇETESİ · KAHVE ONARIMI ÖNKOŞULU VE ÖNCE / SONRA PLANI — SALT OKUR (28 Kasım). Hiçbir şey yazmaz.
-- Üretim kararı (kullanıcı, 28 Kasım): ASTAR DANA = Kahve, LADY BOSS LIGHT TERMO TABAN = Kahve.
-- A: "Kahve" adlı her renk kaydı ve kapsamı.   B: altı reçete satırı — şimdiki değer → planlanan değer.
-- C: astarın Kahve varyantı — kimliği, stok ve hareket geçmişi, taşınacağı renk kaydında çakışma var mı.   D: hazır mı.
with sabit as (select 'stok-mwnj9g21-nyx6'::text as urun, 'renk-mw7p1ue2-b6wc'::text as siyah, 'renk-mwnqdfdn-lhy8'::text as kahve_etkin, 'renk-mvwf90xm-d04e'::text as kahve_pasif,
                      'vry-414c381d2808416ba7aec74c6d77680a'::text as astar_v, array[7, 84, 85, 86, 87, 88]::bigint[] as satirlar),
rs as (select t.sira, t.r, t.r ->> 'hammaddeUrunId' as ham, t.r ->> 'renk' as renk, t.r ->> 'renkId' as renk_id, t.r ->> 'beden' as beden, t.r ->> 'proses' as proses, t.r ->> 'mamulRenk' as mamul_renk
         from public.urunler u, sabit s, jsonb_array_elements(case when jsonb_typeof(u.recete) = 'array' then u.recete else '[]'::jsonb end) with ordinality t(r, sira) where u.id = s.urun),
hedef as (select rs.*, (select h.ad || ' [' || coalesce(h.stok_no::text, '-') || ']' from public.urunler h where h.id = rs.ham) as ham_ad,
            (select count(*) from public.stk_varyant v join public.stk_renk r on r.id = v.renk_id where v.urun_id = rs.ham and public.stk_nrm(r.ad) = 'kahve') as kahve_varyant,
            (select string_agg(distinct v.renk_id, ', ') from public.stk_varyant v join public.stk_renk r on r.id = v.renk_id where v.urun_id = rs.ham and public.stk_nrm(r.ad) = 'kahve') as kahve_kimlikleri
            from rs, sabit s where rs.sira = any (s.satirlar)),
av as (select v.*, (select o.ad || ' [' || o.tur || ']' from public.stk_olcu o where o.id = v.olcu_id) as olcu from public.stk_varyant v, sabit s where v.id = s.astar_v),
cikti(bolum, sira, kayit, simdi, plan, not_) as (
  select 'A Kahve renk kaydı', row_number() over (order by r.aktif desc, r.id), r.id || ' · "' || r.ad || '" · ' || case when r.aktif then 'etkin' else 'pasif' end || ' · kod ' || coalesce(r.kod, '-'),
         'varyant ' || (select count(*) from public.stk_varyant v where v.renk_id = r.id) || ' — ' || coalesce((select string_agg(u.ad || ' ×' || n, ' ; ') from (select v.urun_id, count(*) n from public.stk_varyant v where v.renk_id = r.id group by 1) q join public.urunler u on u.id = q.urun_id), 'yok')
           || ' · Tanımlar''da ' || case when exists (select 1 from public.tanimlar t, jsonb_array_elements(coalesce(t.veri -> 'renkler', '[]'::jsonb)) x where x ->> 'id' = r.id) then 'var' else 'YOK' end,
         case when r.id = s.kahve_etkin then 'DEĞİŞMEZ — astarın Kahve varyantı ve altı reçete satırı bu kayda bağlanır' when r.id = s.kahve_pasif then 'DEĞİŞMEZ, SİLİNMEZ — varyantı kalmaz (astarınki etkin kayda taşınır)' else 'plan dışı — dokunulmaz' end, ''
    from public.stk_renk r, sabit s where public.stk_nrm(r.ad) = 'kahve'
  union all
  select 'B reçete satırı', h.sira, 'satır ' || h.sira || ' · ' || coalesce(h.ham_ad, '(hammadde yok)') || ' · proses ' || coalesce(h.proses, '-') || ' · beden ' || coalesce(h.beden, '-') || ' · mamul rengi ' || coalesce(h.mamul_renk, '-'),
         'renk "' || coalesce(h.renk, '') || '" · renkId ' || coalesce(h.renk_id, '(yok)') || ' → ' || coalesce((select '"' || r.ad || '"' from public.stk_renk r where r.id = h.renk_id), '(kayıt yok)'),
         'renk "' || coalesce(h.renk, '') || '" (AYNI) · renkId ' || s.kahve_etkin || ' → "Kahve" · satırın diğer alanları AYNI',
         case when h.renk_id is distinct from s.siyah or public.stk_nrm(h.renk) <> 'kahve' then 'BEKLENMEYEN — satır artık planlandığı gibi değil' else 'beklendiği gibi' end
           || ' · hammaddede Kahve varyantı ' || h.kahve_varyant || ' (kimlik: ' || coalesce(h.kahve_kimlikleri, 'yok') || ')'
    from hedef h, sabit s
  union all
  select 'C astar varyantı', 1, 'varyant ' || av.id || ' · ' || coalesce((select u.ad from public.urunler u where u.id = av.urun_id), '?') || ' · ölçü ' || coalesce(av.olcu, '(yok)') || ' · ' || case when av.aktif then 'etkin' else 'pasif' end,
         'renk_id ' || av.renk_id || ' · geçerli hareket ' || (select count(*) from public.stk_hareket h where h.varyant_id = av.id and not coalesce(h.iptal, false)) || ' · iptal hareket ' || (select count(*) from public.stk_hareket h where h.varyant_id = av.id and coalesce(h.iptal, false))
           || ' · net ' || (select coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0) from public.stk_hareket h where h.varyant_id = av.id),
         'renk_id ' || s.kahve_etkin || ' · varyant kimliği, ölçüsü, hareketleri ve stoku AYNI kalır',
         case when exists (select 1 from public.stk_varyant x where x.urun_id = av.urun_id and x.renk_id = s.kahve_etkin and coalesce(x.olcu_id, '') = coalesce(av.olcu_id, '')) then 'ÇAKIŞMA — astarda etkin Kahve''ye bağlı aynı ölçüde varyant ZATEN var' else 'çakışma yok' end
    from av, sabit s
  union all
  select 'D hazır mı', 1, 'altı satır planlandığı gibi (ad Kahve, kimlik Siyah)', (select count(*)::text from hedef h, sabit s where h.renk_id = s.siyah and public.stk_nrm(h.renk) = 'kahve'), '6', ''
  union all select 'D hazır mı', 2, 'astar varyantı pasif Kahve kaydında', (select count(*)::text from av, sabit s where av.renk_id = s.kahve_pasif), '1', ''
  union all select 'D hazır mı', 3, 'astarda etkin Kahve''ye bağlı varyant (ikiz olurdu)', (select count(*)::text from public.stk_varyant x, av, sabit s where x.urun_id = av.urun_id and x.renk_id = s.kahve_etkin), '0', ''
  union all select 'D hazır mı', 4, 'tabanın Kahve varyantlarının bağlı olduğu renk kaydı', coalesce((select string_agg(distinct h.kahve_kimlikleri, ' | ') from hedef h where h.sira >= 84), '-'), (select kahve_etkin from sabit), ''
  union all select 'D hazır mı', 5, 'satır 7''nin hammaddesi astar varyantının ürünü', (select (h.ham = av.urun_id)::text from hedef h, av where h.sira = 7), 'true', ''
  union all select 'D hazır mı', 6, 'ürünün reçete satırı sayısı (bilgi)', (select count(*)::text from rs), '114', ''
)
select bolum, kayit, simdi, plan, not_ as "not" from cikti order by bolum, sira;
