-- =====================================================================================================================
--  fis-gece-denetimi.sql — TEK FİŞ DEFTERİ GECE DENETİMİ (FIS-DEFTERI-PLAN.md § 6, v1.741.0)
-- =====================================================================================================================
--
--  Plan: "veritabanında, uygulamadan bağımsız sorgular — fişsiz satır, satırsız fiş, kalem toplamı ≠ cari tutarı, gün
--  içinde iptal edilenler. Sonuç gün sonu raporuna eklenir." Uygulamadaki denetim (veri denetimi ekranı) cihazın gördüğü
--  kopyaya bakıyor; bu işlev doğrudan tablolara: başka cihazın ya da eski bir uygulama sürümünün yazdığı yanlış da görünür.
--
--  YALNIZ OKUR. Dönüş (jsonb):
--    fissizCari / fissizKasa : fişe bağlı olmayan, iptal edilmemiş cari / kasa satırı — { sayi, kuraldanSonra, ornek[] }
--                              `kuraldanSonra`: kurallar açıldıktan (fis_aktif_zamani) sonra yazılmış olanlar — açıkken
--                              tetikleyici bunları reddetmeli; sıfırdan büyükse kural deliği var demektir.
--                              (Stok satırı fişsiz OLAMAZ: stk_hareket.fis_id not null — ayrıca bakılmaz.)
--    satirsizFis             : iptal edilmemiş, geçerli satırı kalmamış fiş (stok fişinde stok, para fişinde cari / kasa)
--    iptalTutarsiz           : iptal edilmiş fişin hâlâ geçerli satırı (fis_iptal hepsini birlikte iptal etmeli)
--    tutarFarki              : başlıktaki tutar ≠ fişin cari satırları toplamı (Resmi defter satırları hariç — uygulama
--                              başlık tutarını onlarsız kuruyor, 089 toplamTutar). Yalnız cari satırı olan fişler; 0,01 tolerans.
--    gun                     : { kesilen: { stok, para }, iptal: [{ fisNo, tur, sebep, eden }] } — p_gun (İstanbul günü)
--    temiz                   : yukarıdaki dört sorun listesinin hepsi boş mu
--    karsilanan (v1.743.0, F1 — kullanıcı kararları 1 Kasım): sipariş kalemi karşılananı ↔ geçerli stok hareketleri
--                              hayalet  : karşılanan > 0, kaleme bağlı geçerli hareket yok — OTOMATİK SIFIRLANMAZ, yalnız raporlanır
--                              fark     : hareketi olan kalemde karşılanan ≠ hareket toplamı (işaret sipariş tipinden)
--                              duzeltme : p_gun içinde bir fiş işleminin değiştirdiği önceden var olan fark / korunan hayalet
--                                         (fis_karsilanan_iz). Bunlar `temiz`e katılmaz (eski veri her gün raporu kırmızı yapmasın);
--                                         gün sonu raporunda ayrı başlıkla gösterilir.
--  Örnek listeler 20 kayıtla sınırlı (rapor e-postası şişmesin); `sayi` gerçek sayı.
--
--  Çağıran: gün sonu raporu sunucu fonksiyonu (service_role) ve isteyen giriş yapmış kullanıcı (yalnız sayılar ve fiş
--  numaraları döner; bunları zaten fis_listesi'nden okuyabiliyor).
--  Supabase SQL Editor kuralı (editor-icin.py): yalnız düz çift-dolar gövde, iç içe yok, başka yerde dolar işareti yok.
--  Önce fis-defteri.sql kurulmuş olmalı. Tekrar çalıştırmak zararsız.
-- =====================================================================================================================

begin;

create or replace function public.fis_gece_denetimi(p_gun text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  gun date := coalesce(nullif(p_gun, '')::date, (now() at time zone 'Europe/Istanbul')::date);
  kural_zamani timestamptz := (select fis_aktif_zamani from public.stk_ayar where id = 'tekil' and fis_aktif);
  fissiz_cari jsonb;
  fissiz_kasa jsonb;
  satirsiz jsonb;
  iptal_tutarsiz jsonb;
  tutar_farki jsonb;
  gunluk jsonb;
  karsilanan_bolumu jsonb;
begin
  select jsonb_build_object('sayi', count(*),
           'kuraldanSonra', count(*) filter (where kural_zamani is not null and c.olusturma >= kural_zamani),
           'ornek', coalesce((select jsonb_agg(x) from (
              select jsonb_build_object('id', c2.id, 'cariId', c2.cari_id, 'tarih', c2.tarih, 'tutar', c2.tutar, 'fisNo', c2.fis_no) x
              from public.car_hareket c2 where c2.fis_id is null and not c2.iptal order by c2.olusturma desc limit 20) s), '[]'::jsonb))
    into fissiz_cari
    from public.car_hareket c where c.fis_id is null and not c.iptal;

  select jsonb_build_object('sayi', count(*),
           'kuraldanSonra', count(*) filter (where kural_zamani is not null and k.olusturma >= kural_zamani),
           'ornek', coalesce((select jsonb_agg(x) from (
              select jsonb_build_object('id', k2.id, 'hesapId', k2.hesap_id, 'tarih', k2.veri ->> 'tarih', 'tutar', k2.veri -> 'tutar', 'fisNo', k2.veri ->> 'fisNo') x
              from public.kas_hareket k2 where k2.fis_id is null and not k2.iptal order by k2.olusturma desc limit 20) s), '[]'::jsonb))
    into fissiz_kasa
    from public.kas_hareket k where k.fis_id is null and not k.iptal;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into satirsiz from (
    select jsonb_build_object('fisNo', f.id, 'aile', f.aile, 'tur', f.tur) x
    from public.stk_fis f
    where not f.iptal and not f.goc
      and ((f.aile = 'stok' and not exists (select 1 from public.stk_hareket h where h.fis_id = f.id and not h.iptal))
        or (f.aile = 'para' and not exists (select 1 from public.car_hareket c where c.fis_id = f.id and not c.iptal)
                            and not exists (select 1 from public.kas_hareket k where k.fis_id = f.id and not k.iptal)))
    order by f.olusturma desc limit 20) s;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into iptal_tutarsiz from (
    select jsonb_build_object('fisNo', f.id, 'tur', f.tur,
             'stok', (select count(*) from public.stk_hareket h where h.fis_id = f.id and not h.iptal),
             'cari', (select count(*) from public.car_hareket c where c.fis_id = f.id and not c.iptal),
             'kasa', (select count(*) from public.kas_hareket k where k.fis_id = f.id and not k.iptal)) x
    from public.stk_fis f
    where f.iptal
      and (exists (select 1 from public.stk_hareket h where h.fis_id = f.id and not h.iptal)
        or exists (select 1 from public.car_hareket c where c.fis_id = f.id and not c.iptal)
        or exists (select 1 from public.kas_hareket k where k.fis_id = f.id and not k.iptal))
    order by f.olusturma desc limit 20) s;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into tutar_farki from (
    select jsonb_build_object('fisNo', f.id, 'tur', f.tur, 'baslik', f.tutar, 'satirlar', t.toplam) x
    from public.stk_fis f
    join lateral (select sum(c.tutar) as toplam, count(*) as sayi from public.car_hareket c
                  where c.fis_id = f.id and not c.iptal and coalesce(c.defter, 'Genel') <> 'Resmi') t on true
    where not f.iptal and f.tutar is not null and t.sayi > 0 and abs(f.tutar - t.toplam) > 0.01
    order by f.olusturma desc limit 20) s;

  select jsonb_build_object(
      'tarih', to_char(gun, 'YYYY-MM-DD'),
      'kesilen', jsonb_build_object(
        'stok', (select count(*) from public.stk_fis f where f.aile = 'stok' and not f.goc and (f.olusturma at time zone 'Europe/Istanbul')::date = gun),
        'para', (select count(*) from public.stk_fis f where f.aile = 'para' and (f.olusturma at time zone 'Europe/Istanbul')::date = gun)),
      'iptal', coalesce((select jsonb_agg(x) from (
          select jsonb_build_object('fisNo', f.id, 'tur', f.tur, 'sebep', f.iptal_sebebi, 'eden', f.iptal_eden) x
          from public.stk_fis f where f.iptal and (f.iptal_zamani at time zone 'Europe/Istanbul')::date = gun
          order by f.iptal_zamani) s), '[]'::jsonb))
    into gunluk;

  with kd as (
    select k.id::text as id, s.siparis_no, coalesce(k.karsilanan, 0) as karsilanan, t.sayi,
           trim_scale(round(greatest(0, case when s.tip = 'Alış' then coalesce(t.toplam, 0) else -coalesce(t.toplam, 0) end), 3)) as hesap
      from public.siparis_kalemleri k
      left join public.siparisler s on s.id::text = k.siparis_id::text
      -- F1.1: geçerli ya da geçmiş bağ (fis_kalem_hesap ile aynı) — iptal edilmiş siparişin teslimli kalemi hayalet sayılmaz
      left join (select coalesce(h.kalem_id, h.gecmis_kalem_id) as kalem_id, sum(h.miktar) as toplam, count(*) as sayi
                   from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id
                  where not h.iptal and not f.iptal and coalesce(h.kalem_id, h.gecmis_kalem_id) is not null
                  group by coalesce(h.kalem_id, h.gecmis_kalem_id)) t on t.kalem_id = k.id::text)
  select jsonb_build_object(
      'hayalet', jsonb_build_object('sayi', (select count(*) from kd where coalesce(sayi, 0) = 0 and karsilanan > 0),
        'ornek', coalesce((select jsonb_agg(x) from (select jsonb_build_object('kalem', id, 'siparisNo', siparis_no, 'karsilanan', karsilanan) x
                                                      from kd where coalesce(sayi, 0) = 0 and karsilanan > 0 order by id limit 20) z), '[]'::jsonb)),
      'fark', jsonb_build_object('sayi', (select count(*) from kd where coalesce(sayi, 0) > 0 and abs(karsilanan - hesap) > 0.005),
        'ornek', coalesce((select jsonb_agg(x) from (select jsonb_build_object('kalem', id, 'siparisNo', siparis_no, 'karsilanan', karsilanan, 'hareket', hesap) x
                                                      from kd where coalesce(sayi, 0) > 0 and abs(karsilanan - hesap) > 0.005 order by id limit 20) z), '[]'::jsonb)),
      'duzeltme', jsonb_build_object('sayi', (select count(*) from public.fis_karsilanan_iz i where (i.zaman at time zone 'Europe/Istanbul')::date = gun),
        'ornek', coalesce((select jsonb_agg(x) from (select jsonb_build_object('kalem', i.kalem_id, 'tur', i.tur, 'fisNo', i.fis_no, 'islem', i.islem,
                                                        'onceki', i.onceki_karsilanan, 'hesap', i.onceki_hesap, 'yeni', i.yeni_karsilanan, 'eden', i.eposta) x
                                                      from public.fis_karsilanan_iz i where (i.zaman at time zone 'Europe/Istanbul')::date = gun order by i.id limit 20) z), '[]'::jsonb)))
    into karsilanan_bolumu;

  return jsonb_build_object(
    'karsilanan', karsilanan_bolumu,
    'fissizCari', fissiz_cari, 'fissizKasa', fissiz_kasa, 'satirsizFis', satirsiz, 'iptalTutarsiz', iptal_tutarsiz,
    'tutarFarki', tutar_farki, 'gun', gunluk, 'kuralAcik', kural_zamani is not null,
    'temiz', (fissiz_cari ->> 'kuraldanSonra')::int = 0 and (fissiz_kasa ->> 'kuraldanSonra')::int = 0
             and jsonb_array_length(satirsiz) = 0 and jsonb_array_length(iptal_tutarsiz) = 0 and jsonb_array_length(tutar_farki) = 0);
end $$;

revoke all on function public.fis_gece_denetimi(text) from public, anon;
grant execute on function public.fis_gece_denetimi(text) to authenticated;
grant execute on function public.fis_gece_denetimi(text) to service_role;

commit;
