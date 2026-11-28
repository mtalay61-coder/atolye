-- REÇETE RENK ÇELİŞKİSİ VE AYNI ADLI RENKLER — SALT OKUR (28 Kasım). Hiçbir şey yazmaz, hiçbir şeyi onarmaz, renk birleştirmez.
-- A: reçete satırında renk ADI ile renk KİMLİĞİNİN gösterdiği ad uyuşmayan satırlar (hammadde rengi ya da mamul rengi), satır satır:
--    hammadde ürünü, yazan ad, kimliğin karşılığı, ve o hammaddede ADLA / KİMLİKLE bulunan varyantlar (stok hareketi toplamıyla).
-- B: A'da adı ya da kimliği geçen her renk kaydı ile aynı adı taşıyan bütün renk kayıtları: türü, etkinliği, Tanımlar'daki yeri,
--    varyantları (ürün ürün), stok hareketleri, reçetelerde KİMLİKLE ve yalnız ADLA kaç satırda geçtiği.
with rs as (
  select u.id as urun_id, u.ad as urun_ad, u.stok_no, t.sira, t.r,
         t.r ->> 'renk' as renk, t.r ->> 'renkId' as renk_id, t.r ->> 'mamulRenk' as mamul_renk, t.r ->> 'mamulRenkId' as mamul_renk_id, t.r ->> 'hammaddeUrunId' as ham_id
    from public.urunler u, jsonb_array_elements(case when jsonb_typeof(u.recete) = 'array' then u.recete else '[]'::jsonb end) with ordinality t(r, sira)
),
cel as (
  select rs.*, hr.ad as kimlik_ad, hr.tur as kimlik_tur, hr.aktif as kimlik_aktif, mr.ad as mamul_kimlik_ad,
         (coalesce(rs.renk_id, '') <> '' and (hr.id is null or public.stk_nrm(hr.ad) is distinct from public.stk_nrm(rs.renk))) as ham_celiski,
         (coalesce(rs.mamul_renk_id, '') <> '' and (mr.id is null or public.stk_nrm(mr.ad) is distinct from public.stk_nrm(rs.mamul_renk))) as mamul_celiski
    from rs left join public.stk_renk hr on hr.id = rs.renk_id left join public.stk_renk mr on mr.id = rs.mamul_renk_id
),
sec as (select * from cel where ham_celiski or mamul_celiski),
ilgili as (
  select distinct s.id from public.stk_renk s
   where s.id in (select renk_id from sec union select mamul_renk_id from sec)
      or public.stk_nrm(s.ad) in (select public.stk_nrm(x) from (select renk as x from sec union select mamul_renk from sec union select kimlik_ad from sec union select mamul_kimlik_ad from sec) q where coalesce(x, '') <> '')
),
vs as (select v.id, v.urun_id, v.renk_id, v.aktif, (select coalesce(sum(h.miktar), 0) from public.stk_hareket h where h.varyant_id = v.id and not coalesce(h.iptal, false)) as net,
              (select count(*) from public.stk_hareket h where h.varyant_id = v.id and not coalesce(h.iptal, false)) as hareket from public.stk_varyant v),
cikti(bolum, sira, kayit, bilgi_1, bilgi_2, bilgi_3, bilgi_4) as (
  select 'A reçete satırı', (coalesce(c.stok_no, 0)::bigint * 1000 + c.sira)::bigint,
         'ürün ' || coalesce(c.stok_no::text, '-') || ' ' || coalesce(c.urun_ad, '') || ' · satır ' || c.sira || ' · proses ' || coalesce(c.r ->> 'proses', '-'),
         'hammadde: ' || coalesce((select h.ad || ' [' || coalesce(h.stok_no::text, '-') || ']' from public.urunler h where h.id = c.ham_id), '(ürün yok) ' || coalesce(c.ham_id, '-')),
         'hammadde rengi — yazan ad "' || coalesce(c.renk, '') || '" · kimlik ' || coalesce(c.renk_id, '(yok)') || ' → ' || coalesce('"' || c.kimlik_ad || '" [' || c.kimlik_tur || case when c.kimlik_aktif then '' else ', pasif' end || ']', '(kayıt yok)') || case when c.ham_celiski then ' · ÇELİŞKİ' else ' · uyumlu' end,
         'mamul rengi — yazan ad "' || coalesce(c.mamul_renk, '') || '" · kimlik ' || coalesce(c.mamul_renk_id, '(yok)') || ' → ' || coalesce('"' || c.mamul_kimlik_ad || '"', '(kayıt yok)') || case when c.mamul_celiski then ' · ÇELİŞKİ' else ' · uyumlu' end,
         'bu hammaddede ADLA ("' || coalesce(c.renk, '') || '") varyant: ' || coalesce((select string_agg(v.id || case when v.aktif then '' else ' pasif' end || ' net ' || v.net || ' / ' || v.hareket || ' hareket', ' ; ') from vs v join public.stk_renk s on s.id = v.renk_id where v.urun_id = c.ham_id and public.stk_nrm(s.ad) = public.stk_nrm(c.renk)), 'YOK')
         || ' ║ KİMLİKLE varyant: ' || coalesce((select string_agg(v.id || case when v.aktif then '' else ' pasif' end || ' net ' || v.net || ' / ' || v.hareket || ' hareket', ' ; ') from vs v where v.urun_id = c.ham_id and v.renk_id = c.renk_id), 'YOK')
    from sec c
  union all
  select 'A özet', coalesce(c.stok_no, 0)::bigint * 1000, 'ürün ' || coalesce(c.stok_no::text, '-') || ' ' || coalesce(c.urun_ad, ''),
         'reçete satırı ' || count(*), 'hammadde rengi çelişen ' || count(*) filter (where c.ham_celiski), 'mamul rengi çelişen ' || count(*) filter (where c.mamul_celiski),
         'bu üründe mamul renkleri: ' || coalesce((select string_agg(distinct s.ad, ', ') from public.stk_varyant v join public.stk_renk s on s.id = v.renk_id where v.urun_id = c.urun_id and v.aktif), '-')
    from cel c where c.urun_id in (select urun_id from sec) group by c.urun_id, c.urun_ad, c.stok_no
  union all
  select 'B renk kaydı', row_number() over (order by public.stk_nrm(s.ad), s.id),
         s.id || ' · "' || s.ad || '" · tür ' || s.tur || case when s.aktif then ' · etkin' else ' · pasif' end,
         'kod ' || coalesce(s.kod, '-') || ' · barkod kodu ' || coalesce(s.barkod_kodu, '-') || ' · renk kodu ' || coalesce(s.renk_kodu, '-') || ' · son güncelleme ' || to_char(s.guncelleme at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
         || ' · Tanımlar''da: ' || coalesce((select string_agg(distinct e.key, ', ') from public.tanimlar t, jsonb_each(t.veri) e, jsonb_array_elements(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) x where jsonb_typeof(x) = 'object' and x ->> 'id' = s.id), 'YOK'),
         'varyant ' || (select count(*) from vs v where v.renk_id = s.id) || ' (etkin ' || (select count(*) from vs v where v.renk_id = s.id and v.aktif) || ') · geçerli stok hareketi ' || (select coalesce(sum(v.hareket), 0) from vs v where v.renk_id = s.id) || ' · net ' || (select coalesce(sum(v.net), 0) from vs v where v.renk_id = s.id),
         'varyantı olan ürünler: ' || coalesce((select string_agg(x.ad || ' [' || coalesce(x.stok_no::text, '-') || ', ' || coalesce(nullif(x.mamul_tipi, ''), nullif(x.malzeme_tipi, ''), x.kategori, '-') || '] ×' || x.n, ' ; ') from (select u.ad, u.stok_no, u.mamul_tipi, u.malzeme_tipi, u.kategori, count(*) n from vs v join public.urunler u on u.id = v.urun_id where v.renk_id = s.id group by u.id, u.ad, u.stok_no, u.mamul_tipi, u.malzeme_tipi, u.kategori) x), '-'),
         'reçetede KİMLİKLE — hammadde rengi ' || (select count(*) from rs where rs.renk_id = s.id) || ' satır, mamul rengi ' || (select count(*) from rs where rs.mamul_renk_id = s.id) || ' satır (ürün: ' || coalesce((select string_agg(distinct coalesce(rs.stok_no::text, rs.urun_ad), ', ') from rs where rs.renk_id = s.id or rs.mamul_renk_id = s.id), '-') || ')'
         || ' ║ yalnız ADLA (kimliksiz) — hammadde ' || (select count(*) from rs where coalesce(rs.renk_id, '') = '' and public.stk_nrm(rs.renk) = public.stk_nrm(s.ad)) || ', mamul ' || (select count(*) from rs where coalesce(rs.mamul_renk_id, '') = '' and public.stk_nrm(rs.mamul_renk) = public.stk_nrm(s.ad))
         || ' ║ adı bu, kimliği BAŞKA — hammadde ' || (select count(*) from rs where coalesce(rs.renk_id, '') not in ('', s.id) and public.stk_nrm(rs.renk) = public.stk_nrm(s.ad)) || ', mamul ' || (select count(*) from rs where coalesce(rs.mamul_renk_id, '') not in ('', s.id) and public.stk_nrm(rs.mamul_renk) = public.stk_nrm(s.ad))
    from public.stk_renk s where s.id in (select id from ilgili)
)
select bolum, kayit, bilgi_1, bilgi_2, bilgi_3, bilgi_4 from cikti order by bolum, sira;
