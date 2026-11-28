-- CARİSİ OLMAYAN SİTE HESAPLARI — SALT OKUR (28 Kasım). Hiçbir şey yazmaz; giriş / sipariş DENEMEZ; şifre özeti ve oturum anahtarı GÖSTERMEZ.
-- A: carisi bulunmayan her site hesabı — kilit durumu, GEÇERLİ oturum sayısı, giriş kayıtları, talepleri, başka yerde kalan izleri.
-- B: portal fonksiyonlarının canlıdaki gövdesi carisi olmayan hesabı nasıl ele alıyor (gövde metninden okunur, çağrılmaz).
with y as (select h.* from public.site_hesaplari h where not exists (select 1 from public.cariler c where c.id::text = h.cari_id)),
fn as (select p.proname, pg_get_functiondef(p.oid) as g from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('portal_giris', 'site_kod_cari', 'portal', 'portal_hesap', 'portal_siparis', 'site_hesap_sil', 'site_hesap_listesi')),
cikti(bolum, sira, kayit, bilgi_1, bilgi_2, bilgi_3) as (
  select 'A hesap', row_number() over (order by y.kullanici), 'kullanıcı ' || y.kullanici || ' · cari ' || y.cari_id,
         'açılış ' || to_char(y.olusturma at time zone 'Europe/Istanbul', 'DD.MM.YYYY') || ' · son giriş ' || coalesce(to_char(y.son_giris at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'), 'hiç')
           || ' · hatalı deneme ' || y.hatali_deneme || ' · ' || case when y.kilit_bitis is not null and y.kilit_bitis > now() then 'KİLİTLİ' else 'kilitli değil' end,
         'GEÇERLİ oturum ' || (select count(*) from public.site_oturumlari o where o.cari_id = y.cari_id and o.bitis > now())
           || coalesce(' (en geç bitiş ' || (select to_char(max(o.bitis) at time zone 'Europe/Istanbul', 'DD.MM.YYYY') from public.site_oturumlari o where o.cari_id = y.cari_id and o.bitis > now()) || ')', '')
           || ' · süresi dolmuş oturum ' || (select count(*) from public.site_oturumlari o where o.cari_id = y.cari_id and o.bitis <= now())
           || ' · giriş kaydı (180 gün): başarılı ' || (select count(*) from public.site_giris_kaydi g where g.cari_id = y.cari_id and g.basarili) || ', başarısız ' || (select count(*) from public.site_giris_kaydi g where g.cari_id = y.cari_id and not g.basarili)
           || coalesce(' · son kayıt ' || (select to_char(max(g.zaman) at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI') from public.site_giris_kaydi g where g.cari_id = y.cari_id), ''),
         'talep: ' || coalesce((select string_agg(d || ' ' || n, ', ') from (select t.durum d, count(*) n from public.site_talepleri t where t.cari_id = y.cari_id group by t.durum) q), 'yok')
           || ' · talepten açılmış sipariş ' || (select count(*) from public.siparisler s where s.ek ->> 'siteTalepId' in (select t.id from public.site_talepleri t where t.cari_id = y.cari_id))
           || ' · site grubunda adı geçen ' || (select count(*) from public.tanimlar t, jsonb_array_elements(case when jsonb_typeof(t.veri -> 'siteGruplari') = 'array' then t.veri -> 'siteGruplari' else '[]'::jsonb end) g where coalesce(g -> 'cariIdleri', '[]'::jsonb) ? y.cari_id)
           || ' · bu cariye özel fiyat kuralı olan ürün ' || (select count(*) from public.urunler u where exists (select 1 from jsonb_array_elements(case when jsonb_typeof(u.fiyat_kurallari::jsonb) = 'array' then u.fiyat_kurallari::jsonb else '[]'::jsonb end) k where k ->> 'kapsam' = 'cari' and k ->> 'deger' = y.cari_id))
           || ' · sipariş ' || (select count(*) from public.siparisler s where s.cari_id::text = y.cari_id)
    from y
  union all
  select 'A özet', 0, 'carisi olmayan site hesabı ' || (select count(*) from y) || ' / toplam ' || (select count(*) from public.site_hesaplari),
         'carisi olmayan hesaba ait GEÇERLİ oturum ' || (select count(*) from public.site_oturumlari o where o.bitis > now() and o.cari_id in (select cari_id from y)),
         'hesabı da carisi de olmayan (tam yetim) geçerli oturum ' || (select count(*) from public.site_oturumlari o where o.bitis > now() and not exists (select 1 from public.site_hesaplari h where h.cari_id = o.cari_id)),
         'carisi PASİF olan site hesabı ' || (select count(*) from public.site_hesaplari h join public.cariler c on c.id::text = h.cari_id where coalesce(c.pasif, false))
  union all
  select 'B fonksiyon', 1, 'site_kod_cari (bütün portal okuma / sipariş çağrılarının kapısı)',
         coalesce((select case when g ~* 'join\s+(public\.)?cariler' then 'cari ile BİRLEŞTİRİYOR → carisi olmayan oturum geçersiz sayılır' else 'cari birleştirmesi GÖRÜNMÜYOR — incele' end from fn where proname = 'site_kod_cari'), 'fonksiyon YOK'),
         coalesce((select case when g ~* 'join\s+(public\.)?site_hesaplari' then 'hesap ile birleştiriyor → hesabı silinen oturum geçersiz' else 'hesap birleştirmesi görünmüyor' end from fn where proname = 'site_kod_cari'), ''), ''
  union all
  select 'B fonksiyon', 2, 'portal, portal_hesap, portal_siparis', 'site_kod_cari kapısını çağıran: ' || coalesce((select string_agg(proname, ', ' order by proname) from fn where proname in ('portal', 'portal_hesap', 'portal_siparis') and g ~* 'site_kod_cari'), 'HİÇBİRİ'),
         'çağırmayan: ' || coalesce((select string_agg(proname, ', ' order by proname) from fn where proname in ('portal', 'portal_hesap', 'portal_siparis') and g !~* 'site_kod_cari'), 'yok'), ''
  union all
  select 'B fonksiyon', 3, 'portal_giris (giriş)',
         coalesce((select case when g ~* 'not\s+exists\s*\(\s*select\s+1\s+from\s+(public\.)?cariler' then 'carinin VARLIĞINI arıyor → carisi olmayan hesap giremez'
                               when g ~* 'exists\s*\(\s*select\s+1\s+from\s+(public\.)?cariler[^;]*pasif' then 'yalnız carinin PASİF olmasına bakıyor → carisi OLMAYAN hesap doğru şifreyle oturum anahtarı ALABİLİR (anahtar kapıdan geçmez)'
                               else 'cari denetimi görünmüyor — incele' end from fn where proname = 'portal_giris'), 'fonksiyon YOK'), '', ''
  union all
  select 'B fonksiyon', 4, 'site_hesap_sil (ERP''den hesabı kapatma)',
         coalesce((select case when g ~* 'delete\s+from\s+(public\.)?site_oturumlari' then 'oturumları da siliyor' else 'oturumları SİLMİYOR' end || ' · ' || case when g ~* 'site_yonetici_kapisi' then 'Yönetici kapısı var' else 'Yönetici kapısı YOK' end from fn where proname = 'site_hesap_sil'), 'fonksiyon YOK'), '', ''
)
select bolum, kayit, bilgi_1, bilgi_2, bilgi_3 from cikti order by bolum, sira;
