-- CARİSİ BULUNMAYAN KASA HAREKETİ — SALT OKUR (28 Kasım). Hiçbir şey yazmaz, hiçbir kaydı değiştirmez.
-- A: kayıtta cari kimliği DOLU olup o cari bulunmayan her kasa / banka hareketi: hesap, tarih, tutar, yön, bağlı fiş ve fişin durumu,
--    aynı fişin cari hareketi, carinin silinenler arşivindeki izi.
-- B: fiş türü başına bütün kasa hareketlerinde karşı taraf nasıl dolu (cari / gelir-gider kartı / hiçbiri) — o türde cari bağının
--    fiilen zorunlu olup olmadığını gösterir. Boş cari tek başına hata DEĞİLDİR (virman, gelir / gider kartı carisiz yazılır).
with ars as (select distinct on (a.satir_id) a.satir_id, coalesce(a.veri ->> 'unvan', '?') || ' (silindi ' || to_char(a.zaman at time zone 'Europe/Istanbul', 'DD.MM.YYYY') || ')' as bilgi
               from public.silinen_arsiv a where a.tablo = 'cariler' order by a.satir_id, a.zaman desc),
h as (select k.*, nullif(k.veri ->> 'cariId', '') as cari_id, nullif(k.veri ->> 'kartId', '') as kart_id, f.tur as fis_tur, f.iptal as fis_iptal, f.cari_id as fis_cari, f.onek as fis_onek
        from public.kas_hareket k left join public.stk_fis f on f.id = k.fis_id),
cikti(bolum, sira, kayit, bilgi_1, bilgi_2, bilgi_3) as (
  select 'A hareket', row_number() over (order by h.olusturma),
         'hareket ' || h.id || ' · hesap ' || coalesce((select coalesce(s.veri ->> 'ad', s.id) from public.kas_hesap s where s.id = h.hesap_id), '(hesap yok) ' || h.hesap_id) || ' · kayıt ' || to_char(h.olusturma at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
         'tarih ' || coalesce(h.veri ->> 'tarih', '-') || ' · ' || coalesce(h.veri ->> 'yon', '-') || ' ' || coalesce(h.veri ->> 'tutar', '-') || ' ' || coalesce(h.veri ->> 'paraBirimi', '') || ' · açıklama "' || left(coalesce(h.veri ->> 'aciklama', ''), 80) || '"'
           || ' · hareket ' || case when h.iptal then 'İPTAL' else 'geçerli' end || case when h.goc then ' · göçle gelmiş' else '' end,
         'kayıttaki cari ' || h.cari_id || ' → ' || coalesce((select 'arşivde: ' || bilgi from ars where satir_id = h.cari_id), 'arşivde yok')
           || ' · gelir/gider kartı ' || coalesce(h.kart_id, 'yok') || ' · virman ' || coalesce(h.veri ->> 'virmanMi', 'hayır') || ' · cari bağ kimliği ' || case when coalesce(h.veri ->> 'muhasebeBagId', '') <> '' then 'var' else 'yok' end,
         'fiş ' || coalesce(h.fis_id, '(fişsiz)') || coalesce(' · tür ' || h.fis_tur, '') || coalesce(' · ' || case when h.fis_iptal then 'fiş İPTAL' else 'fiş geçerli' end, case when h.fis_id is not null then ' · fiş kaydı YOK' else '' end)
           || coalesce(' · fişin carisi ' || h.fis_cari || case when exists (select 1 from public.cariler c where c.id = h.fis_cari) then ' (var)' else ' (yok)' end, '')
           || ' · aynı fişin cari hareketi ' || (select count(*) from public.car_hareket c where c.fis_id = h.fis_id) || ' (iptal ' || (select count(*) from public.car_hareket c where c.fis_id = h.fis_id and coalesce(c.iptal, false)) || ')'
           || ' · aynı fişin başka kasa hareketi ' || (select count(*) from public.kas_hareket x where x.fis_id = h.fis_id and x.id <> h.id)
    from h where h.cari_id is not null and not exists (select 1 from public.cariler c where c.id = h.cari_id)
  union all
  select 'B tür özeti', row_number() over (order by coalesce(h.fis_tur, '')), 'fiş türü ' || coalesce(h.fis_tur, '(fişsiz)'),
         'hareket ' || count(*) || ' (iptal ' || count(*) filter (where h.iptal) || ')',
         'cari dolu ' || count(*) filter (where h.cari_id is not null) || ' · gelir/gider kartı dolu ' || count(*) filter (where h.cari_id is null and h.kart_id is not null) || ' · ikisi de boş ' || count(*) filter (where h.cari_id is null and h.kart_id is null),
         'cari dolu olup carisi bulunmayan ' || count(*) filter (where h.cari_id is not null and not exists (select 1 from public.cariler c where c.id = h.cari_id))
    from h group by h.fis_tur
  union all
  select 'C çek', 1, 'kayıtta cari dolu olup carisi bulunmayan çek', (select count(*)::text from public.kas_cek k where coalesce(k.veri ->> 'cariId', '') <> '' and not exists (select 1 from public.cariler c where c.id = k.veri ->> 'cariId')), '', ''
)
select bolum, kayit, bilgi_1, bilgi_2, bilgi_3 from cikti order by bolum, sira;
