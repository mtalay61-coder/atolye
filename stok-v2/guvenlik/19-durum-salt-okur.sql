-- =====================================================================================================================
--  19-durum-salt-okur.sql — 19-site-erisim-kapat.sql canlıda NE KADAR uygulandı? (SALT OKUNUR, TEK İFADE)
-- =====================================================================================================================
--  Neden: Supabase SQL Editor dosyayı ifadelere bölüp AYRI isteklerle gönderebilir (stok-v2/editor-icin.py). O zaman begin/commit
--  tek işlem yapmaz; her ifade kendi başına kalıcı olur. 19'un ilk çalıştırması "relation site_19_sinama does not exist" (42P01)
--  ile durdu: geçici tablo kendi işleminin sonunda silinmişti → ondan ÖNCEKİ ifadeler (yedek, politika / yetki kaldırma,
--  fonksiyonlar, katalog doğrulaması) kalıcı olmuş olabilir. Bu sorgu hiçbir şey değiştirmez; tek SELECT olduğu için bölünmez.
--  Sonuç "genel durum" satırı: HİÇ UYGULANMAMIŞ | KATALOG TAMAMEN UYGULANMIŞ | KISMİ (hangi parçanın eksik olduğu satırlarda).
-- =====================================================================================================================
with
t(ad) as (values ('site_oturumlari'), ('site_hesaplari'), ('site_giris_kaydi'), ('site_kayit_talepleri')),
f(ad, eski, yeni) as (values
  ('public.site_hesap_kaydet(text, text, text)', '4fe1101e544cec91a4b0d67524e21dc7', 'c83d1cbd5d25392c2fe3492501c967f3'),
  ('public.site_hesap_sil(text)',                '4825c310d535b2902844b1b7ad46be29', '7878219eccd2d5b255388a18ac8be066'),
  ('public.site_kayit_onayla(text, text)',       '616aeb5e7dd3add79991661ceaec3ebe', '86debf97b2f8ae9c1845f85900e65492'),
  ('public.site_kayit_reddet(text)',             '471f66f924ea4f713e4115113cb5b0a7', '071e82fa3ad4c6eb0d2be0c2e6047cbe')),
fm as (
  select f.ad, f.eski, f.yeni, md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) as canli
  from f left join pg_proc p on p.oid = to_regprocedure(f.ad)
),
pol as (
  select p.tablename || '.' || p.policyname as ad from pg_policies p
  where p.schemaname = 'public' and p.tablename in (select ad from t) and p.roles && array['authenticated', 'anon', 'public']::name[]
),
yet as (
  select c.relname || ' ' || e.privilege_type || '→' || case when e.grantee = 0 then 'PUBLIC' else e.grantee::regrole::text end as ad
  from pg_class c, aclexplode(c.relacl) e
  where c.oid in (select to_regclass('public.' || ad) from t union all select to_regclass('public.site_giris_kaydi_id_seq'))
    and e.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)
),
yedek as (
  select case when to_regclass('guvenlik.site_erisim_yedek') is null then 'tablo yok'
              else coalesce((xpath('/row/c/text()', query_to_xml(
                     'select string_agg(tur || ''='' || n, '' · '' order by tur) as c from (select tur, count(*) n from guvenlik.site_erisim_yedek group by tur) x',
                     false, true, '')))[1]::text, 'boş') end as ozet
),
d as (
  select (select count(*) from pol) as pol_n, (select count(*) from yet) as yet_n,
         to_regprocedure('public.site_yonetici_kapisi()') is not null as kapi,
         (select count(*) from fm where canli = yeni) as yeni_n, (select count(*) from fm where canli = eski) as eski_n,
         (select ozet from yedek) as yedek
),
satirlar(sira, kontrol, sonuc) as (
  select 1, 'yedek (guvenlik.site_erisim_yedek): satır türleri', (select yedek from d)
  union all
  select 2, 'dört tabloda anon / authenticated / PUBLIC politikası (19 sonrası: yok)',
         coalesce((select string_agg(ad, ', ' order by ad) from pol), 'yok')
  union all
  select 3, 'dört tablo + site_giris_kaydi_id_seq: anon / authenticated / PUBLIC yetkisi (19 sonrası: yok)',
         coalesce((select count(*) || ' yetki: ' || string_agg(ad, ', ' order by ad) from yet), 'yok')
  union all
  select 4, 'site_yonetici_kapisi() (19 sonrası: var)', case when (select kapi from d) then 'var' else 'yok' end
  union all
  select 10 + row_number() over (order by fm.ad), fm.ad || ': gövde',
         case when fm.canli = fm.yeni then '19 sonrası (yönetici kapılı)' when fm.canli = fm.eski then '19 öncesi (korumasız)'
              else 'BİLİNMEYEN SÜRÜM ' || coalesce(fm.canli, 'YOK') end
  from fm
  union all
  select 20, 'site_19_sinama (geçici tablo) bu oturumda', case when to_regclass('pg_temp.site_19_sinama') is null then 'yok' else 'var' end
  union all
  select 0, '>>> GENEL DURUM',
         case when d.pol_n = 4 and d.yet_n > 0 and not d.kapi and d.eski_n = 4 and d.yedek in ('tablo yok', 'boş') then 'HİÇ UYGULANMAMIŞ (19 öncesi hâl)'
              when d.pol_n = 0 and d.yet_n = 0 and d.kapi and d.yeni_n = 4 and d.yedek like '%isaret=1%' then 'KATALOG TAMAMEN UYGULANMIŞ (davranış sınaması çalışmadı)'
              else 'KISMİ — aşağıdaki satırlara bakın' end
  from d
)
select kontrol, sonuc from satirlar order by sira;
