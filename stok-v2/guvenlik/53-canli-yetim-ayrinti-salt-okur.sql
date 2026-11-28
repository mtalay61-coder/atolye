-- YETİM VE BELİRSİZ KAYIT AYRINTISI — SALT OKUR (28 Kasım). Hiçbir şey yazmaz, hiçbir şeyi onarmaz.
-- 51 numaralı envanterin "sorunlu" çıkan satırlarını açar: hangi üst kayıt yok, kaç kayıt ona bağlı, ne zaman, ve o üst kayıt
-- SİLİNENLER ARŞİVİNDE duruyor mu (duruyorsa adı). "arşivde: …" = kayıt bilerek / sonradan silinmiş; "arşivde yok" = iz yok.
with ars as (select distinct on (a.tablo, a.satir_id) a.tablo, a.satir_id, a.veri, a.zaman, a.silen_eposta from public.silinen_arsiv a order by a.tablo, a.satir_id, a.zaman desc),
ad as (select tablo, satir_id, coalesce(veri ->> 'unvan', veri ->> 'ad', veri ->> 'siparis_no', '?') || ' (silindi ' || to_char(zaman at time zone 'Europe/Istanbul', 'DD.MM.YYYY') || ')' as bilgi from ars),
b(no, bulgu, ust_kayit, sayi, aralik, arsiv) as (
  select 1, 'cari hareketi, carisi yok', h.cari_id, count(*), min(h.tarih)::text || ' … ' || max(h.tarih)::text || ' · iptal ' || count(*) filter (where coalesce(h.iptal, false)) || ' · toplam ' || coalesce(sum(h.tutar), 0)::text,
         coalesce((select 'arşivde: ' || bilgi from ad where tablo = 'cariler' and satir_id = h.cari_id), 'arşivde yok')
    from public.car_hareket h where not exists (select 1 from public.cariler c where c.id = h.cari_id) group by h.cari_id
  union all
  select 2, 'fiş, carisi yok', f.cari_id, count(*), min(f.tarih)::text || ' … ' || max(f.tarih)::text || ' · iptal ' || count(*) filter (where coalesce(f.iptal, false)) || ' · tür ' || string_agg(distinct f.tur, ','),
         coalesce((select 'arşivde: ' || bilgi from ad where tablo = 'cariler' and satir_id = f.cari_id), 'arşivde yok')
    from public.stk_fis f where f.cari_id is not null and not exists (select 1 from public.cariler c where c.id = f.cari_id) group by f.cari_id
  union all
  select 3, 'stok hareketi, carisi yok', h.cari_id, count(*), min(h.tarih)::text || ' … ' || max(h.tarih)::text || ' · iptal ' || count(*) filter (where coalesce(h.iptal, false)),
         coalesce((select 'arşivde: ' || bilgi from ad where tablo = 'cariler' and satir_id = h.cari_id), 'arşivde yok')
    from public.stk_hareket h where h.cari_id is not null and not exists (select 1 from public.cariler c where c.id = h.cari_id) group by h.cari_id
  union all
  select 4, 'stok hareketi, ürünü yok', h.urun_id, count(*), min(h.tarih)::text || ' … ' || max(h.tarih)::text || ' · iptal ' || count(*) filter (where coalesce(h.iptal, false)) || ' · net miktar ' || coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0)::text,
         coalesce((select 'arşivde: ' || bilgi from ad where tablo = 'urunler' and satir_id = h.urun_id), 'arşivde yok')
    from public.stk_hareket h where not exists (select 1 from public.urunler u where u.id = h.urun_id) group by h.urun_id
  union all
  select 5, 'varyant, ürünü yok', v.urun_id, count(*), 'etkin ' || count(*) filter (where v.aktif) || ' · hareketi olan ' || count(*) filter (where exists (select 1 from public.stk_hareket h where h.varyant_id = v.id)),
         coalesce((select 'arşivde: ' || bilgi from ad where tablo = 'urunler' and satir_id = v.urun_id), 'arşivde yok')
    from public.stk_varyant v where not exists (select 1 from public.urunler u where u.id = v.urun_id) group by v.urun_id
  union all
  select 6, 'site hesabı, carisi yok', t.cari_id, 1, 'kullanıcı ' || t.kullanici || ' · son giriş ' || coalesce(to_char(t.son_giris at time zone 'Europe/Istanbul', 'DD.MM.YYYY'), 'hiç'),
         coalesce((select 'arşivde: ' || bilgi from ad where tablo = 'cariler' and satir_id = t.cari_id), 'arşivde yok')
    from public.site_hesaplari t where not exists (select 1 from public.cariler c where c.id = t.cari_id)
  union all
  select 7, 'site talebi, carisi yok', t.cari_id, count(*), 'unvan kopyası ' || coalesce(max(t.cari_unvan), '-') || ' · durum ' || string_agg(distinct t.durum, ',') || ' · ' || to_char(min(t.olusturma) at time zone 'Europe/Istanbul', 'DD.MM.YYYY') || ' … ' || to_char(max(t.olusturma) at time zone 'Europe/Istanbul', 'DD.MM.YYYY'),
         coalesce((select 'arşivde: ' || bilgi from ad where tablo = 'cariler' and satir_id = t.cari_id), 'arşivde yok')
    from public.site_talepleri t where not exists (select 1 from public.cariler c where c.id = t.cari_id) group by t.cari_id
  union all
  select 8, 'reçete satırı: renk kimliği ile satırdaki ad çelişiyor (ürün)', x.id, count(*), 'satırdaki ad "' || x.renk || '" · kimlikteki ad "' || coalesce(max(s.ad), '(kimlik yok)') || '"', x.ad
    from (select z.id, z.ad, r ->> 'renk' as renk, r ->> 'renkId' as renk_id from public.urunler z, jsonb_array_elements(case when jsonb_typeof(z.recete) = 'array' then z.recete else '[]'::jsonb end) r
           where coalesce(r ->> 'renkId', '') <> '') x left join public.stk_renk s on s.id = x.renk_id
   where s.id is null or public.stk_nrm(s.ad) is distinct from public.stk_nrm(x.renk)
   group by x.id, x.ad, x.renk, x.renk_id
  union all
  select 9, 'etkin ölçü: aynı ada birden çok kimlik (ad)', min(o.ad), count(*), string_agg(o.id || ' [' || o.tur || '] varyant ' || (select count(*) from public.stk_varyant v where v.olcu_id = o.id), ' · ' order by o.id), ''
    from public.stk_olcu o where o.aktif group by public.stk_nrm(o.ad) having count(*) > 1
  union all
  select 10, 'etkin renk / model rengi: aynı ada birden çok kimlik (ad)', min(s.ad), count(*), string_agg(s.id || ' [' || s.tur || '] varyant ' || (select count(*) from public.stk_varyant v where v.renk_id = s.id), ' · ' order by s.id), ''
    from public.stk_renk s where s.aktif group by public.stk_nrm(s.ad) having count(*) > 1
  union all
  select 11, 'özel tipli cari (tip adı)', c.ek ->> 'altTip', count(*), 'ana tip ' || string_agg(distinct c.tip, ',') || ' · üretim ataması olan ' || count(*) filter (where exists (select 1 from public.uretim_atamalari a where a.personel_id = c.id)), ''
    from public.cariler c where coalesce(c.ek ->> 'altTip', '') <> '' group by c.ek ->> 'altTip'
)
select no, bulgu, ust_kayit, sayi, aralik, arsiv from b order by no, 3;
