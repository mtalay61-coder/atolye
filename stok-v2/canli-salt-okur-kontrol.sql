-- =====================================================================================================================
--  CANLI SALT-OKUR KONTROL (F0 — VERI-TUTARLILIGI-F0.md). HİÇBİR ŞEY YAZMAZ: yalnız SELECT; tablo, fonksiyon, tetikleyici
--  kurmaz, değiştirmez, silmez. (t-denetim.js / kos.sh bu dosyada yazma komutu olmadığını ve 2. bölümün yerelde sınanan
--  stok-v2/test/f0/denetim.sql ile AYNI olduğunu denetler.)
--
--  NE ZAMAN: canlıya geçişten ÖNCE (bugünkü hâl, 1.742.1) ve SONRA. Sonuçlar karşılaştırılır.
--  NASIL (Supabase › SQL Editor): Editor yalnız SON sorgunun sonucunu gösterir — iki bölümü AYRI AYRI çalıştırın: bölümün
--  metnini seçip "Run selected". Sonuç tablosunu (CSV indir) saklayın; adını tarihle verin (ör. canli-kontrol-2026-11-02-once.csv).
--  Kural: yalnız publishable anahtarla giriş yapılmış Editor oturumu yeterli; secret anahtar gerekmez, hiçbir yere yazılmaz.
--  Yorum: hayalet karşılanan (D1b) ve sahipsiz hareket (D2a/D2b) OTOMATİK silinmez / sıfırlanmaz (kullanıcı kararı, 1 Kasım) —
--  bu sorgu yalnız listeler.
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- BÖLÜM 1 — KURULUM VE SAYIMLAR (tek sorgu; satır: bilgi, deger)
-- ---------------------------------------------------------------------------------------------------------------------
select 'stk_ayar' as bilgi, (select to_jsonb(a) from public.stk_ayar a where a.id = 'tekil') as deger
union all select 'tetikleyiciler', (select coalesce(jsonb_agg(jsonb_build_object('tablo', c.relname, 'ad', t.tgname, 'etkin', t.tgenabled) order by c.relname, t.tgname), '[]'::jsonb)
                                      from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
                                     where n.nspname = 'public' and not t.tgisinternal and c.relname in ('stk_fis', 'stk_hareket', 'car_hareket', 'kas_hareket', 'siparis_kalemleri', 'siparisler'))
union all select 'fis_fonksiyonlari', (select coalesce(jsonb_agg(p.proname order by p.proname), '[]'::jsonb) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                        where n.nspname = 'public' and (p.proname like 'fis\_%' or p.proname in ('alt_yaz', 'stk_yaz', 'car_yaz', 'kas_yaz', 'lst_yaz')))
union all select 'siparis_kalemleri_sutunlari', (select coalesce(jsonb_agg(jsonb_build_object('ad', column_name, 'tur', data_type, 'varsayilan', column_default) order by ordinal_position), '[]'::jsonb)
                                                  from information_schema.columns where table_schema = 'public' and table_name = 'siparis_kalemleri')
union all select 'kisitlar_siparis_kalemleri_stk_hareket', (select coalesce(jsonb_agg(jsonb_build_object('tablo', conrelid::regclass::text, 'ad', conname, 'tur', contype) order by conname), '[]'::jsonb)
                                                  from pg_constraint where conrelid in ('public.siparis_kalemleri'::regclass, 'public.stk_hareket'::regclass))
union all select 'fis_sayilari', (select jsonb_build_object('toplam', count(*), 'iptal', count(*) filter (where iptal), 'goc', count(*) filter (where goc),
                                    'stok', count(*) filter (where aile = 'stok'), 'para', count(*) filter (where aile = 'para'),
                                    'ilk', min(olusturma), 'son', max(olusturma), 'istekTekrari', count(*) - count(distinct istek)) from public.stk_fis)
union all select 'hareket_sayilari', (select jsonb_build_object('toplam', count(*), 'iptal', count(*) filter (where iptal),
                                        'kalemeBagli', count(*) filter (where kalem_id is not null), 'sipariseBagli', count(*) filter (where siparis_id is not null),
                                        'fazlaIsaretli', count(*) filter (where fazla_gonderim)) from public.stk_hareket)
union all select 'siparis_durumlari', (select coalesce(jsonb_object_agg(coalesce(durum, '(boş)'), n), '{}'::jsonb) from (select durum, count(*) as n from public.siparisler group by durum) x)
union all select 'kalem_sayilari', (select jsonb_build_object('toplam', count(*), 'karsilananVar', count(*) filter (where coalesce(karsilanan, 0) > 0),
                                      'miktariAsan', count(*) filter (where coalesce(karsilanan, 0) > miktar)) from public.siparis_kalemleri)
union all select 'fonksiyon_ozetleri', (select coalesce(jsonb_object_agg(p.proname, md5(p.prosrc)), '{}'::jsonb) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                         where n.nspname = 'public' and (p.proname like 'fis\_%' or p.proname in ('alt_yaz', 'stk_yaz', 'car_yaz', 'kas_yaz', 'lst_yaz', 'degisiklik_bump')))
union all select 'degisiklik_sayaci', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'zaman', d.zaman)), '[]'::jsonb) from public.degisiklik d)
union all select 'fis_sayac', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from public.fis_sayac s);

-- ---------------------------------------------------------------------------------------------------------------------
-- BÖLÜM 2 — DENETİM D1–D6 (tek sorgu; satır: kontrol, seviye, sayi, ornek). stok-v2/test/f0/denetim.sql ile AYNI.
-- Önek verilmez (denetim.onek boş) → bütün kayıtlar.
-- ---------------------------------------------------------------------------------------------------------------------
with
ayar as (select coalesce(nullif(current_setting('denetim.onek', true), ''), '') as onek),
fis as (
  select f.* from public.stk_fis f, ayar where ayar.onek = '' or coalesce(f.istek, '') like ayar.onek || '%' or coalesce(f.siparis_id, '') like ayar.onek || '%'
),
har as (   -- bütün hareketler (iptaller dahil), fişinin durumuyla
  select h.id, h.fis_id, h.urun_id, h.miktar, h.kaynak, h.siparis_id, h.siparis_no, h.kalem_id, h.fazla_gonderim,
         h.iptal as satir_iptal, f.iptal as fis_iptal, (not h.iptal and not f.iptal) as gecerli, f.istek
    from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id, ayar
   where ayar.onek = '' or coalesce(h.kalem_id, '') like ayar.onek || '%' or coalesce(h.siparis_id, '') like ayar.onek || '%'
      or coalesce(f.istek, '') like ayar.onek || '%'
),
sip as (
  select s.id::text as id, s.siparis_no, s.tip, s.durum from public.siparisler s, ayar where ayar.onek = '' or s.id::text like ayar.onek || '%'
),
kal as (
  select k.id::text as id, k.siparis_id::text as siparis_id, k.urun_id::text as urun_id, k.miktar::numeric as miktar,
         coalesce(k.karsilanan, 0)::numeric as karsilanan
    from public.siparis_kalemleri k, ayar where ayar.onek = '' or k.id::text like ayar.onek || '%' or k.siparis_id::text like ayar.onek || '%'
),
teslim as (   -- kalem başına geçerli hareket toplamı (işaretli) ve fazla işareti
  select h.kalem_id, sum(h.miktar) as isaretli, count(*) as hareket_sayisi, bool_or(h.fazla_gonderim) as fazla_isaretli
    from har h where h.gecerli and h.kalem_id is not null group by h.kalem_id
),
kalem_durum as (
  select k.*, s.tip, s.durum, s.siparis_no, t.isaretli, coalesce(t.hareket_sayisi, 0) as hareket_sayisi, coalesce(t.fazla_isaretli, false) as fazla_isaretli,
         round(greatest(0, case when s.tip = 'Alış' then coalesce(t.isaretli, 0) else -coalesce(t.isaretli, 0) end), 3) as teslim_edilen,
         exists (select 1 from har h2 where h2.kalem_id = k.id) as hic_hareket_var
    from kal k left join sip s on s.id = k.siparis_id left join teslim t on t.kalem_id = k.id
),
bulgu as (
  -- D1a: karşılanan ≠ geçerli hareket toplamı (hareketi olan kalemler)
  select 'D1a_karsilanan_hareketten_farkli' as kontrol, 'hata' as seviye,
         jsonb_build_object('kalem', id, 'siparis', siparis_no, 'karsilanan', karsilanan, 'teslimEdilen', teslim_edilen) as ornek
    from kalem_durum where hareket_sayisi > 0 and abs(karsilanan - teslim_edilen) > 0.005
  union all
  -- D1b: HAYALET — karşılanan > 0 ama geçerli hareket yok (otomatik sıfırlanmaz, kullanıcı kararı)
  select 'D1b_hayalet_karsilanan', 'uyari',
         jsonb_build_object('kalem', id, 'siparis', siparis_no, 'karsilanan', karsilanan, 'iptalEdilmisHareketVar', hic_hareket_var)
    from kalem_durum where hareket_sayisi = 0 and karsilanan > 0
  union all
  -- D1c: ters yön — kaleme bağlı geçerli hareketlerin net yönü sipariş tipine ters (ör. satış kalemine net giriş = gönderilenden fazla iade)
  select 'D1c_ters_yonlu_net_hareket', 'uyari',
         jsonb_build_object('kalem', id, 'siparis', siparis_no, 'tip', tip, 'isaretliToplam', isaretli)
    from kalem_durum where hareket_sayisi > 0 and ((tip = 'Alış' and isaretli < 0) or (coalesce(tip, '') <> 'Alış' and isaretli > 0))
  union all
  -- D2a: SAHİPSİZ — geçerli hareket var olmayan bir kaleme bağlı (otomatik silinmez)
  select 'D2a_sahipsiz_hareket_kalem_yok', 'hata',
         jsonb_build_object('hareket', h.id, 'fis', h.fis_id, 'kalem', h.kalem_id, 'siparis', h.siparis_id, 'miktar', h.miktar)
    from har h where h.gecerli and h.kalem_id is not null and not exists (select 1 from public.siparis_kalemleri k where k.id::text = h.kalem_id)
  union all
  -- D2b: geçerli hareket var olmayan bir siparişe bağlı
  select 'D2b_sahipsiz_hareket_siparis_yok', 'hata',
         jsonb_build_object('hareket', h.id, 'fis', h.fis_id, 'siparis', h.siparis_id, 'miktar', h.miktar)
    from har h where h.gecerli and h.siparis_id is not null and not exists (select 1 from public.siparisler s where s.id::text = h.siparis_id)
  union all
  -- D2c: hareketin kalemi başka siparişe ait
  select 'D2c_hareket_kalem_siparis_uyusmaz', 'hata',
         jsonb_build_object('hareket', h.id, 'kalem', h.kalem_id, 'hareketSiparis', h.siparis_id, 'kalemSiparis', k.siparis_id::text)
    from har h join public.siparis_kalemleri k on k.id::text = h.kalem_id where h.gecerli and h.siparis_id is distinct from k.siparis_id::text
  union all
  -- D2d: geçerli fiş var olmayan bir siparişe bağlı
  select 'D2d_fis_siparis_yok', 'hata', jsonb_build_object('fis', f.id, 'siparis', f.siparis_id, 'siparisNo', f.siparis_no)
    from fis f where not f.iptal and f.siparis_id is not null and not exists (select 1 from public.siparisler s where s.id::text = f.siparis_id)
  union all
  -- D3: hareketin ürünü kalemin ürünüyle aynı değil (kalem sonradan değiştirilmiş)
  select 'D3_hareket_urunu_kalemden_farkli', 'hata',
         jsonb_build_object('hareket', h.id, 'kalem', h.kalem_id, 'hareketUrun', h.urun_id, 'kalemUrun', k.urun_id::text)
    from har h join public.siparis_kalemleri k on k.id::text = h.kalem_id where h.gecerli and k.urun_id is not null and h.urun_id <> k.urun_id::text
  union all
  -- D3b: hareketin rengi / bedeni (varyanttan) kalemin rengi / bedeniyle aynı değil. Ad karşılaştırması büyük-küçük harf ve
  -- boşluk duyarsız; uygulamanın stokAnahtarNrm'i daha geniş olabilir — uyarı seviyesinde (yanlış alarm olabilir, elle bakılır).
  select 'D3b_hareket_renk_beden_kalemden_farkli', 'uyari',
         jsonb_build_object('hareket', h.id, 'kalem', h.kalem_id, 'hareketRenk', r.ad, 'kalemRenk', k.renk, 'hareketBeden', o.ad, 'kalemBeden', k.beden)
    from har h join public.stk_hareket hh on hh.id = h.id join public.stk_varyant v on v.id = hh.varyant_id
    left join public.stk_renk r on r.id = v.renk_id left join public.stk_olcu o on o.id = v.olcu_id
    join public.siparis_kalemleri k on k.id::text = h.kalem_id
   where h.gecerli
     and ((k.renk is not null and lower(btrim(k.renk)) <> lower(btrim(coalesce(r.ad, ''))))
       or (k.beden is not null and lower(btrim(k.beden)) <> lower(btrim(coalesce(o.ad, '')))))
  union all
  -- D4a: miktarı aşan teslim, fazla işareti / onayı YOK
  select 'D4a_onaysiz_fazla_teslim', 'hata',
         jsonb_build_object('kalem', id, 'siparis', siparis_no, 'tip', tip, 'miktar', miktar, 'teslimEdilen', teslim_edilen, 'karsilanan', karsilanan)
    from kalem_durum where teslim_edilen > miktar + 0.005 and not fazla_isaretli
  union all
  -- D4b: miktarı aşan teslim, fazla işaretli (bilgi — onay kaydı F3'te gelecek)
  select 'D4b_isaretli_fazla_teslim', 'bilgi',
         jsonb_build_object('kalem', id, 'siparis', siparis_no, 'miktar', miktar, 'teslimEdilen', teslim_edilen)
    from kalem_durum where teslim_edilen > miktar + 0.005 and fazla_isaretli
  union all
  -- D5a: siparişten bağı ÇÖZÜLMÜŞ geçerli hareket (fis_bag_coz: numara "(iptal)" ekli, sipariş/kalem kimliği boş) — teslim geçmişi koptu
  select 'D5a_bagi_cozulmus_teslim', 'uyari',
         jsonb_build_object('hareket', h.id, 'fis', h.fis_id, 'siparisNo', h.siparis_no, 'miktar', h.miktar)
    from har h where h.gecerli and h.siparis_id is null and h.kalem_id is null and coalesce(h.siparis_no, '') like '%(iptal)%'
  union all
  -- D5b: sipariş durumu kalemlerin teslimiyle çelişiyor (İptal hariç)
  select 'D5b_durum_teslimle_celisiyor', 'uyari',
         jsonb_build_object('siparis', s.siparis_no, 'durum', s.durum, 'tumuTam', x.tumu_tam, 'hicYok', x.hic_yok)
    from sip s join (select siparis_id, bool_and(teslim_edilen >= miktar) as tumu_tam, bool_and(teslim_edilen = 0) as hic_yok
                       from kalem_durum group by siparis_id) x on x.siparis_id = s.id
   where coalesce(s.durum, '') <> 'İptal'
     and ((x.tumu_tam and not x.hic_yok and s.durum <> 'Tamamlandı')
       or (not x.tumu_tam and not x.hic_yok and s.durum not in ('Kısmi Teslim'))
       or (x.hic_yok and s.durum in ('Kısmi Teslim', 'Tamamlandı')))
  union all
  -- D6a: SATIRSIZ FİŞ — geçerli, stok ailesinden, geçerli satırı kalmamış (fis-gece-denetimi.sql ile aynı tanım, stok ailesi)
  select 'D6a_satirsiz_stok_fisi', 'hata', jsonb_build_object('fis', f.id, 'tur', f.tur)
    from fis f where not f.iptal and not f.goc and f.aile = 'stok'
     and not exists (select 1 from public.stk_hareket h where h.fis_id = f.id and not h.iptal)
  union all
  -- D6b: iptal edilmiş fişin hâlâ geçerli satırı
  select 'D6b_iptal_fisin_gecerli_satiri', 'hata', jsonb_build_object('fis', f.id, 'tur', f.tur)
    from fis f where f.iptal and exists (select 1 from public.stk_hareket h where h.fis_id = f.id and not h.iptal)
),
kontroller(kontrol, seviye) as (values
  ('D1a_karsilanan_hareketten_farkli', 'hata'), ('D1b_hayalet_karsilanan', 'uyari'), ('D1c_ters_yonlu_net_hareket', 'uyari'),
  ('D2a_sahipsiz_hareket_kalem_yok', 'hata'), ('D2b_sahipsiz_hareket_siparis_yok', 'hata'), ('D2c_hareket_kalem_siparis_uyusmaz', 'hata'),
  ('D2d_fis_siparis_yok', 'hata'), ('D3_hareket_urunu_kalemden_farkli', 'hata'), ('D3b_hareket_renk_beden_kalemden_farkli', 'uyari'),
  ('D4a_onaysiz_fazla_teslim', 'hata'),
  ('D4b_isaretli_fazla_teslim', 'bilgi'), ('D5a_bagi_cozulmus_teslim', 'uyari'), ('D5b_durum_teslimle_celisiyor', 'uyari'),
  ('D6a_satirsiz_stok_fisi', 'hata'), ('D6b_iptal_fisin_gecerli_satiri', 'hata'))
select k.kontrol, k.seviye, count(b.ornek) as sayi,
       coalesce((select jsonb_agg(o) from (select b2.ornek as o from bulgu b2 where b2.kontrol = k.kontrol limit 20) z), '[]'::jsonb) as ornek
  from kontroller k left join bulgu b on b.kontrol = k.kontrol
 group by k.kontrol, k.seviye
 order by k.kontrol;
