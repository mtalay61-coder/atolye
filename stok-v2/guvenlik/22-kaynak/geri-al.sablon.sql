-- =====================================================================================================================
--  22-site-onay-atomik-geri-al.sql — 22'yi GERİ AL  (AYRI ONAYLA)
--  ÜRETİLMİŞ DOSYA — elle düzenlenmez (python3 stok-v2/guvenlik/22-uret.py).
-- =====================================================================================================================
--  Ne yapar: site_cari_ekleme_koru tetikleyicisi ve fonksiyonu, site_kayit_onayla_yeni_cari, site_eslesme_anahtari ve
--  site_vergi_no_kaydedilecek kaldırılır; site_kayit_onayla / site_kayit_reddet guvenlik.site_onay_22_yedek'teki 19 hâline
--  döner; site_kayit_talepleri.islenme sütunu kaldırılır; yedek silinir.
--  Ne yapmaz: 22 ile açılmış carilere, site hesaplarına ve talep durumlarına DOKUNMAZ (veri kaybı yok; yalnız işlenme zamanları gider).
--  Dikkat: geri alındıktan sonra yeni ERP'nin "yeni cariyle onay"ı çalışmaz (fonksiyon yok, hiçbir şey yazılmaz); eski yol (önce
--  cari, sonra onay) ve onun boşta cari riski geri gelir.
--  ÖNKOŞUL (tutmazsa HATA, hiçbir şey değişmez): postgres rolü; 22 uygulanmış (yedek işareti var); 22'nin fonksiyonları uygulandığı
--  hâlde (md5) — arada başka bir değişiklik olduysa durur.
--  Çalıştırma: Supabase › SQL Editor (postgres) › dosyanın TAMAMI › Run. Tek do bloğu (ya hepsi ya hiçbiri); sonuç
--  guvenlik.site_onay_22_geri_sonuc'ta.
-- =====================================================================================================================
begin;

do $$
declare
  v22_ad text;
  v22_beklenen text;
  v22_canli text;
  v22_tanim text;
  v22_ozet text;
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('guvenlik.site_onay_22_yedek') is null or not exists (select 1 from guvenlik.site_onay_22_yedek where tur = 'isaret') then
    raise exception '22 uygulanmamış (yedek işareti yok). Hiçbir şey değişmedi.';
  end if;
  for v22_ad, v22_beklenen in select x.ad, x.beklenen from (values @@MD5_22_SATIRLARI@@) x(sira, ad, beklenen) loop
    select md5(btrim(regexp_replace(regexp_replace(prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) into v22_canli
      from pg_proc where oid = to_regprocedure(v22_ad);
    if v22_canli is distinct from v22_beklenen then
      raise exception '% uygulandıktan sonra değişmiş (beklenen %, canlı %). Hiçbir şey değişmedi.', v22_ad, v22_beklenen, coalesce(v22_canli, 'yok');
    end if;
  end loop;
  if (select count(*) from guvenlik.site_onay_22_yedek where tur = 'fonksiyon') <> 2 then
    raise exception 'Yedekte iki fonksiyon tanımı yok. Hiçbir şey değişmedi.';
  end if;

  drop trigger if exists site_cari_ekleme_koru on public.cariler;
  drop function public.site_cari_ekleme_koru();
  drop function public.site_kayit_onayla_yeni_cari(text, text);
  for v22_tanim in select tanim from guvenlik.site_onay_22_yedek where tur = 'fonksiyon' order by nesne loop
    execute v22_tanim;
  end loop;
  drop function public.site_vergi_no_kaydedilecek(text);
  drop function public.site_eslesme_anahtari(text, text);
  alter table public.site_kayit_talepleri drop column if exists islenme;

  create table if not exists guvenlik.site_onay_22_geri_sonuc (sira int, kontrol text, beklenen text, sonuc text, durum text);
  revoke all on guvenlik.site_onay_22_geri_sonuc from public, anon, authenticated;
  delete from guvenlik.site_onay_22_geri_sonuc;
  insert into guvenlik.site_onay_22_geri_sonuc
  select x.sira, x.ad || ' (19 hâli)', x.beklenen,
         coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g')))
                     from pg_proc p where p.oid = to_regprocedure(x.ad)), 'yok'), null
    from (values (1, 'public.site_kayit_onayla(text, text)', '@@MD5_ONAYLA_19@@'), (2, 'public.site_kayit_reddet(text)', '@@MD5_REDDET_19@@')) x(sira, ad, beklenen);
  insert into guvenlik.site_onay_22_geri_sonuc values
    (3, '22 nesneleri kaldırıldı', '0',
     ((case when to_regprocedure('public.site_kayit_onayla_yeni_cari(text, text)') is null then 0 else 1 end)
      + (case when to_regprocedure('public.site_cari_ekleme_koru()') is null then 0 else 1 end)
      + (case when to_regprocedure('public.site_eslesme_anahtari(text, text)') is null then 0 else 1 end)
      + (case when to_regprocedure('public.site_vergi_no_kaydedilecek(text)') is null then 0 else 1 end)
      + (select count(*)::int from pg_trigger where tgname = 'site_cari_ekleme_koru' and not tgisinternal)
      + (select count(*)::int from pg_attribute where attrelid = 'public.site_kayit_talepleri'::regclass and attname = 'islenme' and not attisdropped))::text, null);
  update guvenlik.site_onay_22_geri_sonuc set durum = case when sonuc = beklenen then 'tamam' else 'FARKLI' end;
  select string_agg(kontrol, '; ') into v22_ozet from guvenlik.site_onay_22_geri_sonuc where durum <> 'tamam';
  if v22_ozet is not null then
    raise exception 'Geri alma doğrulaması tutmadı (%). Bu blok geri alındı; hiçbir şey değişmedi.', v22_ozet;
  end if;
  delete from guvenlik.site_onay_22_yedek;
end $$;

select sira, kontrol, beklenen, sonuc, durum from guvenlik.site_onay_22_geri_sonuc order by sira;

commit;
