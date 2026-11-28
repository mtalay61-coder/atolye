-- PAKET K CANLI ÖNKOŞUL — SALT OKUR (28 Kasım). Hiçbir şey yazmaz. 52-k-uygula.sql'den ÖNCE ana projede çalıştırılır.
-- Beklenen (ilk kurulumdan önce): 1. satır "kurulu değil", 2–6 "tamam", 7–10 BİLGİ (kurulum bunlara dokunmaz), son satır GENEL "HAZIR".
with
fk(tablo, sutun, ad, hedef) as (values ('car_hareket', 'cari_id', 'k_car_hareket_cari_fk', 'cariler'), ('stk_fis', 'cari_id', 'k_stk_fis_cari_fk', 'cariler'), ('stk_hareket', 'cari_id', 'k_stk_hareket_cari_fk', 'cariler'),
  ('site_talepleri', 'cari_id', 'k_site_talepleri_cari_fk', 'cariler'), ('site_hesaplari', 'cari_id', 'k_site_hesaplari_cari_fk', 'cariler'), ('stk_hareket', 'urun_id', 'k_stk_hareket_urun_fk', 'urunler')),
tip as (select f.*, (select format_type(a.atttypid, a.atttypmod) from pg_attribute a where a.attrelid = to_regclass('public.' || f.tablo) and a.attname = f.sutun and not a.attisdropped) as kaynak_tip,
               (select format_type(a.atttypid, a.atttypmod) from pg_attribute a where a.attrelid = to_regclass('public.' || f.hedef) and a.attname = 'id' and not a.attisdropped) as hedef_tip from fk f),
kur as (select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('k_cari_silme_koru', 'k_siparis_cari_koru', 'k_uretim_urun_koru', 'k_kasa_cari_koru', 'k_eski_hesap_silme_koru', 'k_urun_silme_koru', 'k_fis_siparis_koru'))::int as f,
  (select count(*) from pg_trigger g where not g.tgisinternal and g.tgname in ('k_cari_silme_koru', 'k_siparis_cari_koru', 'k_uretim_urun_koru', 'k_kasa_cari_koru', 'k_eski_hesap_silme_koru', 'k_urun_silme_koru', 'k_fis_siparis_koru'))::int as t,
  (select count(*) from pg_constraint c where c.conname in (select ad from fk))::int as y),
eksik_tablo as (select coalesce(string_agg(x, ', '), '') as e from unnest(array['cariler', 'urunler', 'siparisler', 'siparis_kalemleri', 'uretim', 'uretim_atamalari', 'car_hareket', 'stk_fis', 'stk_hareket',
  'kas_hareket', 'kas_cek', 'hesaplar', 'hesap_hareketleri', 'site_talepleri', 'site_hesaplari']) x where to_regclass('public.' || x) is null),
eksik_islev as (select coalesce(string_agg(x, ', '), '') as e from unnest(array['auth.jwt()']) x where to_regprocedure(x) is null),
anahtar as (select coalesce(string_agg(h, ', '), '') as e from unnest(array['cariler', 'urunler']) h
  where not exists (select 1 from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
                     where i.indrelid = to_regclass('public.' || h) and i.indisunique and i.indnatts = 1 and a.attname = 'id' and i.indpred is null)),
onceki as (select
  (select count(*) from pg_trigger g where not g.tgisinternal and g.tgname = 'b3a_yazma_koru' and g.tgenabled = 'O')::int as b3a,
  (select count(*) from pg_trigger g where not g.tgisinternal and g.tgname = 'b3a2_alan_koru' and g.tgenabled = 'O')::int as b3a2,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and left(p.proname, 3) = 'b4_')::int as b4,
  (to_regprocedure('public.tanim_renk_ad_degistir(jsonb)') is not null) as b1),
k(no, kontrol, beklenen, bulunan, tamam) as (
  select 1, 'Paket K şu an kurulu mu (fonksiyon · tetikleyici · yabancı anahtar)', 'kurulu değil: 0 · 0 · 0', (select f || ' · ' || t || ' · ' || y from kur), (select f = 0 and t = 0 and y = 0 from kur)
  union all select 2, 'gerekli tablolar', 'hepsi var', (select case when e = '' then 'hepsi var' else 'EKSİK: ' || e end from eksik_tablo), (select e = '' from eksik_tablo)
  union all select 3, 'gerekli sistem fonksiyonu (auth.jwt)', 'var', (select case when e = '' then 'var' else 'EKSİK: ' || e end from eksik_islev), (select e = '' from eksik_islev)
  union all select 4, 'cariler.id ve urunler.id tekil anahtar (yabancı anahtarın hedefi olabilir)', 'evet', (select case when e = '' then 'evet' else 'HAYIR: ' || e end from anahtar), (select e = '' from anahtar)
  union all select 5, 'bağ sütunu ile hedef kimliğin veri tipi aynı (6 bağ)', 'hepsi aynı',
         coalesce((select string_agg(tablo || '.' || sutun || ' ' || coalesce(kaynak_tip, '(sütun yok)') || ' ≠ ' || hedef || '.id ' || coalesce(hedef_tip, '(yok)'), ' ; ') from tip where kaynak_tip is distinct from hedef_tip or kaynak_tip is null), 'hepsi aynı'),
         not exists (select 1 from tip where kaynak_tip is distinct from hedef_tip or kaynak_tip is null)
  union all select 6, 'aynı adı taşıyan başka kısıt / tetikleyici yok (ad çakışması)', 'yok',
         case when (select f + t + y from kur) = 0 then 'yok' else 'VAR — 1. satıra bakın' end, (select f + t + y = 0 from kur)
  union all select 7, 'BİLGİ · önceki paketler (B3a tetikleyici · B3a-2 tetikleyici · B4 fonksiyon · B1)', '', (select b3a || ' · ' || b3a2 || ' · ' || b4 || ' · ' || case when b1 then 'kurulu' else 'yok' end from onceki), true
  union all select 8, 'BİLGİ · bu sütunlarda zaten bulunan yabancı anahtarlar (çift olmaz; ad farklıysa ikisi birlikte çalışır)', '',
         coalesce((select string_agg(c.conrelid::regclass::text || '.' || a.attname || ' → ' || c.confrelid::regclass::text || ' [' || c.conname || case c.confdeltype when 'c' then ', silince SİL' when 'n' then ', silince BOŞALT' when 'a' then ', silmeyi engeller' when 'r' then ', silmeyi engeller' else '' end || ']', ' ; ')
                     from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1] join fk f on c.conrelid = to_regclass('public.' || f.tablo) and a.attname = f.sutun where c.contype = 'f'), 'yok'), true
  union all select 9, 'BİLGİ · mevcut yetim satırlar (kurulum bunlara DOKUNMAZ, reddetmez; yalnız yenisi engellenir)', '',
         'cari hareketi ' || (select count(*) from public.car_hareket h where not exists (select 1 from public.cariler c where c.id = h.cari_id))
         || ' · fiş ' || (select count(*) from public.stk_fis f where f.cari_id is not null and not exists (select 1 from public.cariler c where c.id = f.cari_id))
         || ' · stok hareketi (cari) ' || (select count(*) from public.stk_hareket h where h.cari_id is not null and not exists (select 1 from public.cariler c where c.id = h.cari_id))
         || ' · stok hareketi (ürün) ' || (select count(*) from public.stk_hareket h where not exists (select 1 from public.urunler u where u.id = h.urun_id))
         || ' · site hesabı ' || (select count(*) from public.site_hesaplari h where not exists (select 1 from public.cariler c where c.id = h.cari_id))
         || ' · site talebi ' || (select count(*) from public.site_talepleri t where not exists (select 1 from public.cariler c where c.id = t.cari_id))
         || ' · kasa hareketi (kayıttaki cari yok) ' || (select count(*) from public.kas_hareket h where coalesce(h.veri ->> 'cariId', '') <> '' and not exists (select 1 from public.cariler c where c.id = h.veri ->> 'cariId'))
         || ' · çek (kayıttaki cari yok) ' || (select count(*) from public.kas_cek h where coalesce(h.veri ->> 'cariId', '') <> '' and not exists (select 1 from public.cariler c where c.id = h.veri ->> 'cariId')), true
  union all select 10, 'BİLGİ · kurulum anında kısa süreli kilit alınacak tablolar (satır sayısı)', '',
         (select string_agg(x || ' ' || (select coalesce(s.n_live_tup, 0) from pg_stat_user_tables s where s.schemaname = 'public' and s.relname = x), ' · ') from unnest(array['cariler', 'urunler', 'car_hareket', 'stk_fis', 'stk_hareket', 'site_talepleri', 'site_hesaplari']) x)
         || ' · 1 dakikadan uzun açık işlem ' || (select count(*) from pg_stat_activity a where a.xact_start is not null and a.xact_start < now() - interval '1 minute' and a.pid <> pg_backend_pid()), true
)
select no, kontrol, beklenen, bulunan, case when no >= 7 then 'bilgi' when tamam then 'tamam' else 'ENGEL' end as durum from k
union all select 99, 'GENEL', '', '', case when (select bool_and(tamam) from k) then 'HAZIR' when not (select tamam from k where no = 1) then 'ZATEN KURULU ya da YARIM — sonucu gönder' else 'HAZIR DEĞİL — ENGEL satırlarını gönder' end
order by 1;
