-- SIKILAŞTIRMA ÖNCESİ CANLI LİSTE KONTROLÜ (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. 2-sikilastir.sql'in KİLİT'lerinin göreceğini gösterir:
-- listelerin canlıyla uyuşup uyuşmadığı. Beklenen: 'anon_listede_yok', 'anon_zaten_kapali', 'yol_listede_yok', 'yol_baska_deger' satırı YOK;
-- 'yol_zaten_sabit' = site_pb (0b sabitledi, sıkılaştırma atlar); 'ozet' satırı kapanacak 22 / yolu sabitlenecek 20.
-- Listeler 2-sikilastir.sql'den birebir kopyalandı (kos-guvenlik.sh aynılığı denetler).
with
acik as (select to_regprocedure(x) as oid from unnest(array['public.herkese_acik_vitrin()', 'public.site_ayarlari()', 'public.site_kayit_ol(jsonb, text, text)',
    'public.portal_giris(text, text)', 'public.portal(text)', 'public.portal_hesap(text, date, date)',
    'public.portal_siparis(text, jsonb, text, jsonb)', 'public.portal_cikis(text)',
    
    
    
    'public.yonetici_mi()']::text[]) x),
kap  as (select x as ad, to_regprocedure(x) as oid from unnest(array['public.degisiklik_bump()',
    'public.fis_alt_karsilanansiz(jsonb)',
    'public.fis_bag_iz_koru()',
    'public.fis_baslik_koru()',
    'public.fis_kalem_idleri(jsonb)',
    'public.fis_kalem_karsilanan_koru()',
    'public.fis_kalem_teslim_koru()',
    'public.fis_kapi_acik()',
    'public.fis_kural_aktif()',
    'public.fis_satir_koru()',
    'public.fis_satirsiz_denetle()',
    'public.fis_siparis_iptal_koru()',
    'public.fis_siparis_teslim_koru()',
    'public.fis_yer_tutucu(jsonb,text,text)',
    'public.guncelleme_yaz()',
    'public.gunluk_silme_koruma()',
    'public.lst_sayac()',
    'public.site_pb(text)',
    'public.surum_arttir()',
    'public.tanimlar_kullanici_koruma()',
    'public.yazma_yetkisi_koruma()',
    'public.yetki_var_mi(text[],text)']::text[]) x),
yol  as (select x as ad, to_regprocedure(x) as oid from unnest(array['public.fis_alt_artissiz(jsonb)',
    'public.fis_alt_karsilanansiz(jsonb)',
    'public.fis_bag_iz_koru()',
    'public.fis_baslik_koru()',
    'public.fis_kalem_idleri(jsonb)',
    'public.fis_kalem_karsilanan_koru()',
    'public.fis_kapi_acik()',
    'public.fis_satir_koru()',
    'public.fis_siparis_iptal_koru()',
    'public.fis_yer_tutucu(jsonb,text,text)',
    'public.guncelleme_yaz()',
    'public.siparis_durum_hesap(text,text)',
    'public.site_pb(text)',
    'public.stk_dizi(jsonb)',
    'public.stk_kaynak_tur(text)',
    'public.stk_mantik(text)',
    'public.stk_nrm(text)',
    'public.stk_sayi(text)',
    'public.stk_yer_tutucu_mu(text)',
    'public.stk_zaman(text)',
    'public.surum_arttir()']::text[]) x),
fn as (
  select p.oid, p.oid::regprocedure::text as imza, has_function_privilege('anon', p.oid, 'execute') as anon,
         (select c from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') as yol_ayari
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
  where n.nspname = 'public' and l.lanname not in ('c', 'internal')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
),
bulgu as (
  select 'anon_listede_yok' as kontrol, f.imza as fonksiyon from fn f
   where f.anon and f.oid not in (select oid from acik where oid is not null) and f.oid not in (select oid from kap where oid is not null)
  union all select 'anon_zaten_kapali', k.ad from kap k join fn f on f.oid = k.oid where not f.anon
  union all select 'listede_olup_canlida_yok', ad from (select ad, oid from kap union all select ad, oid from yol) z where oid is null
  union all select 'yol_listede_yok', f.imza from fn f where f.yol_ayari is null and f.oid not in (select oid from yol where oid is not null)
  union all select 'yol_zaten_sabit', y.ad from yol y join fn f on f.oid = y.oid where f.yol_ayari = 'search_path=public, extensions, pg_temp'
  union all select 'yol_baska_deger', y.ad || ' → ' || f.yol_ayari from yol y join fn f on f.oid = y.oid
   where f.yol_ayari is not null and f.yol_ayari <> 'search_path=public, extensions, pg_temp'
  union all select 'acik_kalacak_anon_degil', f.imza from acik a join fn f on f.oid = a.oid where not f.anon
  union all select 'yedek_zaten_var', 'guvenlik.yedek tablosu mevcut' where to_regclass('guvenlik.yedek') is not null
)
select kontrol, fonksiyon from bulgu
union all
select 'ozet', 'kapanacak ' || (select count(*) from kap k join fn f on f.oid = k.oid where f.anon)
           || ' · yolu sabitlenecek ' || (select count(*) from yol y join fn f on f.oid = y.oid where f.yol_ayari is null)
           || ' · girişsiz açık kalacak ' || (select count(*) from acik a join fn f on f.oid = a.oid where f.anon)
order by 1, 2;
