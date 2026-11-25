-- =====================================================================================================================
--  25-cari-yetki-geri-al.sql — G-25'İ GERİ AL  (AYRI ONAYLA)
--  G-25 — car_yaz YETKİ GENİŞLİĞİ (stok-v2/guvenlik/25-G25-TASARIM.md). ÜRETİLMİŞ DOSYA — elle düzenlenmez:
--  python3 stok-v2/guvenlik/25-uret.py (kaynak: 25-kaynak/yeni.sql + editor/15-duzeltme.sql car_yaz + editor/18-fis-defteri.sql
--  fis_kes / fis_iptal). Gövde özetleri Faz 0.4 envanterinin formülüyle (yorum / boşluk normalize, md5).
-- =====================================================================================================================
--  !!! GERİ ALMA YETKİ AÇIĞINI YENİDEN AÇAR: stok / üretim yetkilisi yine cari virmanı, cari kartı hareketi, ürünsüz alış / satış,
--  maaş / mesai tahakkuku yazabilir ve cari / kasa satırlı fişleri stok silme yetkisiyle iptal edebilir; personel maaşı / mesai katı
--  yine her oturumdan değiştirilebilir. Yalnız G-25 uygulamasının bir soruna yol açtığı kanıtlanırsa kullanın.
--  Ne yapar: car_yaz / fis_kes / fis_iptal'ı yedekteki (G-25 öncesi) tanıma döndürür; G-25'in oluşturduğu fonksiyonları ve tanimlar
--  tetikleyicisini kaldırır; mes_bildirim / ucr_onay / isc_odeme boşsa siler, DOLUYSA silmez — guvenlik.g25_<tablo>_arsiv_<zaman> olarak taşır (uygulama
--  erişemez; veri kaybı yok); yedeği siler. Kesilmiş fişlere, cari / stok / kasa satırlarına DOKUNMAZ.
--  ÖNKOŞUL (biri tutmazsa HATA, hiçbir şey değişmez): postgres rolü; yedek eksiksiz; üç fonksiyon UYGULANDIĞI HÂLDE (gövde md5),
--  yetkileri / sahipleri yedektekiyle aynı; G-25 nesnelerinin hepsi var. Biri sonradan değiştiyse o değişikliği EZMEDEN durur.
--  Çalıştırma: Supabase › SQL Editor (postgres) › dosyanın TAMAMI › Run. Tek do bloğu (ya hepsi ya hiçbiri); sonuç
--  guvenlik.g25_geri_sonuc'ta.
-- =====================================================================================================================
begin;

do $$
declare
  v_eksik text;
  v_r record;
  v_dolu bigint;
  v_tablo text;
  v_arsiv text;
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('guvenlik.g25_yedek') is null then
    raise exception 'G-25 uygulanmamış (guvenlik.g25_yedek yok). Hiçbir şey değişmedi.';
  end if;
  execute 'select count(*) from guvenlik.g25_yedek' into v_dolu;
  if v_dolu <> 3 then
    raise exception 'G-25 yedeği eksik (% / 3 fonksiyon). Hiçbir şey değişmedi.', v_dolu;
  end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.car_yaz(jsonb)')) is distinct from 'f83e760fce533be489ec87be9002b91c' then
    raise exception 'car_yaz uygulandığı hâlde değil (gövde %) — sonradan değişmiş; ezilmez. Hiçbir şey değişmedi.', coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.car_yaz(jsonb)')), 'yok');
  end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_kes(jsonb)')) is distinct from 'c071d8020d8a22b20765cff7aec77c47' then
    raise exception 'fis_kes uygulandığı hâlde değil (gövde %) — sonradan değişmiş; ezilmez. Hiçbir şey değişmedi.', coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_kes(jsonb)')), 'yok');
  end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_iptal(jsonb)')) is distinct from '2ea9f6ce73682303f69f1b8f191e84ab' then
    raise exception 'fis_iptal uygulandığı hâlde değil (gövde %) — sonradan değişmiş; ezilmez. Hiçbir şey değişmedi.', coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_iptal(jsonb)')), 'yok');
  end if;
  for v_r in select y.ad, y.yetki, y.sahip, p.proacl::text as simdi, pg_get_userbyid(p.proowner) as sahip_simdi
               from guvenlik.g25_yedek y join pg_proc p on p.oid = ('public.' || y.ad || '(jsonb)')::regprocedure loop
    if v_r.simdi is distinct from v_r.yetki or v_r.sahip_simdi <> v_r.sahip then
      raise exception '% yetkisi / sahibi uygulamadan sonra değişmiş (şimdi %, yedek %). Hiçbir şey değişmedi.', v_r.ad, v_r.simdi, v_r.yetki;
    end if;
  end loop;
  select string_agg(x, ', ') into v_eksik from unnest(array['public.g25_alt_saglam(jsonb, text)', 'public.g25_atama_koku(text)', 'public.g25_fis_cari_yetki(jsonb)', 'public.g25_fis_cari_yetki_tek(jsonb, jsonb, jsonb, jsonb, jsonb)', 'public.g25_fis_iptal_yetki(text)', 'public.g25_gecmis_iscilik(text, text)', 'public.g25_ilk_atama(text)', 'public.g25_iscilik_carisi(text, text, boolean)', 'public.g25_mesai_anahtari(text, text)', 'public.g25_mesai_tahakkuku(text, text)', 'public.g25_mesai_tutari(text, jsonb)', 'public.g25_onay_degisim()', 'public.g25_onayli(text)', 'public.g25_stok_bagi(jsonb, jsonb, jsonb, jsonb)', 'public.g25_tanimlar_ucret_koruma()', 'public.g25_ucret_guncel(text)', 'public.g25_ucret_ozeti(jsonb)', 'public.g25_uretim_bagi(jsonb, jsonb, jsonb, jsonb)', 'public.g25_uretim_butunluk(jsonb, jsonb, jsonb)', 'public.g25_yetki_iste(text[], text, text)', 'public.mesai_bildir(jsonb)', 'public.mesai_bildirim_iptal(jsonb)', 'public.mesai_bildirimleri(jsonb)', 'public.mesai_onayla(jsonb)', 'public.ucret_onayla(jsonb)', 'public.ucret_onaylari(jsonb)']) x where to_regprocedure(x) is null;
  if v_eksik is not null or to_regclass('public.mes_bildirim') is null or to_regclass('public.ucr_onay') is null or to_regclass('public.isc_odeme') is null
     or not exists (select 1 from pg_trigger where tgname = 'g25_tanimlar_ucret_koruma' and tgrelid = 'public.tanimlar'::regclass) or not exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_urunler' and tgrelid = 'public.urunler'::regclass) or not exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_uretim' and tgrelid = 'public.uretim'::regclass) or not exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_atama' and tgrelid = 'public.uretim_atamalari'::regclass) or not exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_tanimlar' and tgrelid = 'public.tanimlar'::regclass) then
    raise exception 'G-25 nesneleri eksik (%) — karışık durum. Hiçbir şey değişmedi.', coalesce(v_eksik, 'mes_bildirim / ucr_onay / isc_odeme / tetikleyici');
  end if;

  -- ÜÇ FONKSİYON G-25 ÖNCESİ HÂLE (yedekteki tam tanım; create or replace yetkileri korur)
  for v_r in select ad, tanim from guvenlik.g25_yedek order by ad loop
    execute v_r.tanim;
  end loop;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.car_yaz(jsonb)')) is distinct from '1af5a49a2fa60b90210f48fac5076a27' then raise exception 'car_yaz yedekteki hâle dönmedi'; end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_kes(jsonb)')) is distinct from '7b4e3f2474c25784e92d0f91a9053af2' then raise exception 'fis_kes yedekteki hâle dönmedi'; end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_iptal(jsonb)')) is distinct from 'c514ade3ebe55cd52ea9c6a26b0bfc7a' then raise exception 'fis_iptal yedekteki hâle dönmedi'; end if;

  drop trigger g25_tanimlar_ucret_koruma on public.tanimlar;
  drop trigger g25_onay_degisim_urunler on public.urunler;
  drop trigger g25_onay_degisim_uretim on public.uretim;
  drop trigger g25_onay_degisim_atama on public.uretim_atamalari;
  drop trigger g25_onay_degisim_tanimlar on public.tanimlar;
  drop function public.mesai_bildir(jsonb);
  drop function public.mesai_bildirimleri(jsonb);
  drop function public.mesai_bildirim_iptal(jsonb);
  drop function public.mesai_onayla(jsonb);
  drop function public.ucret_onaylari(jsonb);
  drop function public.ucret_onayla(jsonb);
  drop function public.g25_alt_saglam(jsonb, text);
  drop function public.g25_atama_koku(text);
  drop function public.g25_fis_cari_yetki(jsonb);
  drop function public.g25_fis_cari_yetki_tek(jsonb, jsonb, jsonb, jsonb, jsonb);
  drop function public.g25_fis_iptal_yetki(text);
  drop function public.g25_gecmis_iscilik(text, text);
  drop function public.g25_ilk_atama(text);
  drop function public.g25_iscilik_carisi(text, text, boolean);
  drop function public.g25_mesai_anahtari(text, text);
  drop function public.g25_mesai_tahakkuku(text, text);
  drop function public.g25_mesai_tutari(text, jsonb);
  drop function public.g25_onay_degisim();
  drop function public.g25_onayli(text);
  drop function public.g25_stok_bagi(jsonb, jsonb, jsonb, jsonb);
  drop function public.g25_tanimlar_ucret_koruma();
  drop function public.g25_ucret_guncel(text);
  drop function public.g25_ucret_ozeti(jsonb);
  drop function public.g25_uretim_bagi(jsonb, jsonb, jsonb, jsonb);
  drop function public.g25_uretim_butunluk(jsonb, jsonb, jsonb);
  drop function public.g25_yetki_iste(text[], text, text);
  -- Tablolar: boşsa silinir; DOLUYSA silinmez — guvenlik.g25_<tablo>_arsiv_<zaman> olarak taşınır (uygulama erişemez; veri kaybı yok).
  v_arsiv := '';
  foreach v_tablo in array array['mes_bildirim', 'ucr_onay', 'isc_odeme'] loop
    execute format('select count(*) from public.%I', v_tablo) into v_dolu;
    if v_dolu = 0 then
      execute format('drop table public.%I', v_tablo);
    else
      execute format('alter table public.%I set schema guvenlik', v_tablo);
      execute format('alter table guvenlik.%I rename to %I', v_tablo, 'g25_' || v_tablo || '_arsiv_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS'));
      v_arsiv := v_arsiv || v_tablo || ' (' || v_dolu || ' satır) ';
    end if;
  end loop;

  drop table guvenlik.g25_yedek;
  drop table if exists guvenlik.g25_sonuc;
  create table if not exists guvenlik.g25_geri_sonuc (sira int primary key, kontrol text not null, deger text not null);
  revoke all on guvenlik.g25_geri_sonuc from public, anon, authenticated;
  delete from guvenlik.g25_geri_sonuc;
  insert into guvenlik.g25_geri_sonuc values
    (1, 'car_yaz / fis_kes / fis_iptal', 'G-25 öncesi hâle döndü'),
    (2, 'G-25 fonksiyonları ve tetikleyicileri', 'kaldırıldı'),
    (3, 'tablolar (mes_bildirim, ucr_onay, isc_odeme)', case when v_arsiv = '' then 'boştu, silindi' else 'dolu olanlar guvenlik şemasına arşivlendi: ' || v_arsiv end),
    (98, 'UYARI', 'G-25 yetki açığı YENİDEN AÇIK (tasarım § 7)'),
    (99, 'GENEL', 'GERİ ALINDI');
end $$;

select sira, kontrol, deger from guvenlik.g25_geri_sonuc order by sira;

commit;
