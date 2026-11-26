-- RENK ÇÖKMESİ ENVANTERİ — SALT OKUR (v1.744.37 öncesi hata, 26 Kasım). 2. sürüm: bağlantılar + siparişsiz modeller.
--
-- Hata: Tanımlar'da bir rengin adı değişince (büyük/küçük harf dahil) o rengin geçtiği kombinasyon renkleri
-- ("1054 - KAHVE SÜET/VİZON YILAN") istemcide rengin düz adına ("Vizon Yılan") çöküyor, varyanta rengin KENDİ kimliği
-- damgalanıyordu. Bulutta (stok-v2) kombinasyon varyantlarının renk_id'si kombinasyon kimliğidir (stk_renk.tur='model');
-- çöken varyant ise renk kimliğiyle (tur='renk') yeniden açıldı, eskiler kaldırıldı (stoklu → dokunulmadı, hareketli →
-- aktif=false, ikisi de yok → silindi).
--
-- YALNIZ SELECT — hiçbir şey yazmaz, silmez, kilitlemez. TEK SORGU: SQL Editor yalnız son sonucu gösterdiği için her şey
-- tek tabloda, `bolum` sütunuyla. Sonucu "Export → CSV" ile (ya da kopyalayıp) iletin.
-- Sütunlar okunurken to_jsonb(satir) kullanılır: canlıda olmayan bir sütun sorguyu düşürmez, boş gelir.
--
-- ŞÜPHELİ ÜRÜN (S) — herhangi biri:
--   siparis  : sipariş kaleminde geçen renk ürünün ETKİN varyantlarında yok
--   uretim   : üretim kaydındaki renk etkin varyantlarda yok
--   pasif_model : üründe PASİF, kombinasyon (tur='model') renkli varyant var
--   duz_renk : hammadde olmayan üründe, bir kombinasyonun parçası olan DÜZ renkle (tur='renk') etkin varyant var
--   recete / resim / barkod : reçete model rengi, renk resmi anahtarı ya da harici barkod rengi etkin varyantlarda yok
-- (siparişi olmayan modeller pasif_model / duz_renk / recete / resim / barkod ile yakalanır).
with
tan as (select veri from public.tanimlar where id = 'tekil'),
kombi as (
  select k ->> 'id' as id, k ->> 'kod' as kod, k -> 'renkIdler' as renk_idler
  from tan, jsonb_array_elements(coalesce(tan.veri -> 'renkKombinasyonlari', '[]'::jsonb)) k
),
kombi_renk as (select distinct jsonb_array_elements_text(renk_idler) as renk_id from kombi),
urun as (select u.id, u.ad, u.kategori, to_jsonb(u) as j from public.urunler u),
vry as (
  select v.id as varyant_id, v.urun_id, v.renk_id, r.ad as renk_ad, r.tur as renk_tur, r.aktif as renk_aktif,
         v.olcu_id, o.ad as olcu_ad, v.aktif, v.olusturma, public.stk_nrm(r.ad) as nrm
  from public.stk_varyant v
  left join public.stk_renk r on r.id = v.renk_id
  left join public.stk_olcu o on o.id = v.olcu_id
),
etkin as (select distinct urun_id, nrm from vry where aktif),
kalem as (
  select k.urun_id, s.siparis_no, s.durum, to_jsonb(k) as j, k.renk, public.stk_nrm(k.renk) as nrm
  from public.siparis_kalemleri k join public.siparisler s on s.id = k.siparis_id
  where coalesce(k.renk, '') <> ''
),
uret as (
  select x.j ->> 'urun_id' as urun_id, x.j, x.j ->> 'renk' as renk, public.stk_nrm(x.j ->> 'renk') as nrm
  from (select to_jsonb(u) as j from public.uretim u) x where coalesce(x.j ->> 'renk', '') <> ''
),
recete as (
  select u.id as urun_id, x as j, public.stk_nrm(x ->> 'mamulRenk') as nrm
  from urun u, jsonb_array_elements(case when jsonb_typeof(u.j -> 'recete') = 'array' then u.j -> 'recete' else '[]'::jsonb end) x
),
resim as (
  select u.id as urun_id, key as anahtar, public.stk_nrm(key) as nrm
  from urun u, jsonb_object_keys(case when jsonb_typeof(u.j -> 'renk_resimleri') = 'object' then u.j -> 'renk_resimleri' else '{}'::jsonb end) key
),
barkod as (
  select u.id as urun_id, x as j, public.stk_nrm(x ->> 'renk') as nrm
  from urun u, jsonb_array_elements(case when jsonb_typeof(u.j -> 'harici_barkodlar') = 'array' then u.j -> 'harici_barkodlar' else '[]'::jsonb end) x
),
sebep as (
  select urun_id, 'siparis' as s from kalem k where not exists (select 1 from etkin e where e.urun_id = k.urun_id and e.nrm = k.nrm)
  union select urun_id, 'uretim' from uret k where not exists (select 1 from etkin e where e.urun_id = k.urun_id and e.nrm = k.nrm)
  union select urun_id, 'pasif_model' from vry where not aktif and renk_tur = 'model'
  union select v.urun_id, 'duz_renk' from vry v join urun u on u.id = v.urun_id
        where v.aktif and v.renk_tur = 'renk' and v.renk_id in (select renk_id from kombi_renk)
          and coalesce(u.kategori, '') not ilike 'hammadde%'
  union select urun_id, 'recete' from recete k where coalesce(k.j ->> 'mamulRenk', '') not in ('', 'Tümü', 'Standart')
        and not exists (select 1 from etkin e where e.urun_id = k.urun_id and e.nrm = k.nrm)
  union select urun_id, 'resim' from resim k where not exists (select 1 from etkin e where e.urun_id = k.urun_id and e.nrm = k.nrm)
  union select urun_id, 'barkod' from barkod k where not exists (select 1 from etkin e where e.urun_id = k.urun_id and e.nrm = k.nrm)
),
s as (select urun_id, array_agg(distinct s order by s) as sebepler from sebep where urun_id is not null group by urun_id),
hrk as (
  select h.varyant_id, count(*) as adet,
         coalesce(sum(h.miktar) filter (where not f.iptal and not h.iptal), 0) as miktar,
         min(h.tarih) as ilk, max(h.tarih) as son,
         string_agg(distinct nullif(h.siparis_no, ''), ', ') as siparisler,
         string_agg(distinct coalesce(h.kaynak, '?'), ', ') as kaynaklar
  from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id
  group by h.varyant_id
)
select * from (
  -- 1) ŞÜPHELİ ÜRÜNLER ve nedenleri
  select '1-urun' as bolum, u.ad as urun, u.id as urun_id,
         jsonb_build_object('kategori', u.kategori, 'sebepler', to_jsonb(s.sebepler)) as ayrinti
  from s join urun u on u.id = s.urun_id
  union all
  -- 2) BUTÜN VARYANTLARI (etkin + pasif): kimlik, renk türü, stok, hareket sayısı / tarihleri
  select '2-varyant', u.ad, u.id, jsonb_build_object(
           'varyant_id', v.varyant_id, 'renk_id', v.renk_id, 'renk', v.renk_ad, 'renk_tur', v.renk_tur,
           'renk_tanimi_aktif', v.renk_aktif, 'olcu', v.olcu_ad, 'aktif', v.aktif, 'olusturma', v.olusturma,
           'stok', coalesce(h.miktar, 0), 'hareket', coalesce(h.adet, 0), 'ilk_hareket', h.ilk, 'son_hareket', h.son,
           'hareket_siparisleri', h.siparisler, 'kaynaklar', h.kaynaklar)
  from vry v join s on s.urun_id = v.urun_id join urun u on u.id = v.urun_id left join hrk h on h.varyant_id = v.varyant_id
  union all
  -- 3) SİPARİŞ KALEMLERİ: renk etkin bir varyanta bağlanıyor mu?
  select '3-siparis', u.ad, u.id, jsonb_build_object('siparis_no', k.siparis_no, 'durum', k.durum, 'kalem_id', k.j ->> 'id',
           'renk', k.renk, 'beden', k.j ->> 'beden', 'miktar', k.j -> 'miktar', 'karsilanan', k.j -> 'karsilanan',
           'rezervasyon_var', coalesce(jsonb_array_length(case when jsonb_typeof(k.j -> 'rezervasyonlar') = 'array' then k.j -> 'rezervasyonlar' end), 0) > 0,
           'etkin_varyanta_bagli', exists (select 1 from etkin e where e.urun_id = k.urun_id and e.nrm = k.nrm))
  from kalem k join s on s.urun_id = k.urun_id join urun u on u.id = k.urun_id
  union all
  -- 4) ÜRETİM KAYITLARI
  select '4-uretim', u.ad, u.id, jsonb_build_object('uretim_id', k.j ->> 'id', 'siparis_no', k.j ->> 'siparis_no',
           'takip_kodu', k.j ->> 'takip_kodu', 'renk', k.renk, 'asama', k.j ->> 'asama', 'adet', k.j -> 'adet',
           'etkin_varyanta_bagli', exists (select 1 from etkin e where e.urun_id = k.urun_id and e.nrm = k.nrm))
  from uret k join s on s.urun_id = k.urun_id join urun u on u.id = k.urun_id
  union all
  -- 5) REÇETE SATIRLARI (model rengi + hammadde rengi, kimlikleriyle)
  select '5-recete', u.ad, u.id, jsonb_build_object('mamulRenk', k.j ->> 'mamulRenk', 'mamulRenkId', k.j ->> 'mamulRenkId',
           'hammadde', coalesce(k.j ->> 'malzemeAd', k.j ->> 'malzemeId', k.j ->> 'malzeme'), 'renk', k.j ->> 'renk', 'renkId', k.j ->> 'renkId',
           'miktar', k.j -> 'miktar', 'etkin_varyanta_bagli', exists (select 1 from etkin e where e.urun_id = k.urun_id and e.nrm = k.nrm))
  from recete k join s on s.urun_id = k.urun_id join urun u on u.id = k.urun_id
  union all
  -- 6) RENK RESMİ ANAHTARLARI ve HARİCİ BARKODLAR
  select '6-resim', u.ad, u.id, jsonb_build_object('anahtar', k.anahtar,
           'etkin_varyanta_bagli', exists (select 1 from etkin e where e.urun_id = k.urun_id and e.nrm = k.nrm))
  from resim k join s on s.urun_id = k.urun_id join urun u on u.id = k.urun_id
  union all
  select '6-barkod', u.ad, u.id, k.j || jsonb_build_object(
           'etkin_varyanta_bagli', exists (select 1 from etkin e where e.urun_id = k.urun_id and e.nrm = k.nrm))
  from barkod k join s on s.urun_id = k.urun_id join urun u on u.id = k.urun_id
  union all
  -- 7) RENK TANIMLARI: şüpheli ürünlerin varyantlarının gösterdiği stk_renk satırları + Tanımlar'daki kombinasyon karşılığı
  select '7-renk-tanimi', null, r.id, jsonb_build_object('ad', r.ad, 'tur', r.tur, 'aktif', r.aktif, 'kod', r.kod,
           'barkod_kodu', r.barkod_kodu, 'guncelleme', r.guncelleme,
           'tanimlarda_kombinasyon', (select jsonb_build_object('kod', k.kod, 'renkIdler', k.renk_idler) from kombi k where k.id = r.id),
           'gectigi_kombinasyonlar', (select jsonb_agg(k.kod || ':' || k.id) from kombi k where k.renk_idler ? r.id))
  from public.stk_renk r
  where r.id in (select v.renk_id from vry v join s on s.urun_id = v.urun_id)
     or r.id in (select k.id from kombi k join kombi_renk kr on k.renk_idler ? kr.renk_id
                 where kr.renk_id in (select v.renk_id from vry v join s on s.urun_id = v.urun_id where v.renk_tur = 'renk'))
) t
order by bolum, urun nulls last, ayrinti::text;
