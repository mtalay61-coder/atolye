-- =====================================================================================================================
--  22-site-onay-atomik-geri-al.sql — 22'yi GERİ AL  (AYRI ONAYLA)
--  ÜRETİLMİŞ DOSYA — elle düzenlenmez (python3 stok-v2/guvenlik/22-uret.py).
-- =====================================================================================================================
--  Ne yapar: YALNIZ 22'nin oluşturduğu nesneleri (yedekteki "olusturdu" listesi: site_cari_ekleme_koru tetikleyicisi ve fonksiyonu,
--  site_kayit_onayla_yeni_cari, site_eslesme_anahtari, site_vergi_no_kaydedilecek, site_kimlik_zamani, site_kayit_talepleri.islenme)
--  kaldırır; site_kayit_onayla / site_kayit_reddet'in gövdesini ve YETKİLERİNİ yedekteki 19 hâline döndürür; yedeği siler.
--  Ne yapmaz: 22 ile açılmış carilere, site hesaplarına ve talep durumlarına DOKUNMAZ (veri kaybı yok; yalnız işlenme zamanları gider).
--  Dikkat: geri alındıktan sonra yeni ERP'nin "yeni cariyle onay"ı çalışmaz (fonksiyon yok, hiçbir şey yazılmaz); eski yol (önce
--  cari, sonra onay) ve onun boşta cari riski geri gelir.
--  ÖNKOŞUL (biri tutmazsa HATA, hiçbir şey değişmez): postgres rolü; 22 uygulanmış ve yedek eksiksiz; altı fonksiyonun gövdesi (md5),
--  yetkileri, sahibi, güvenlik ayarı ve tetikleyicinin tanımı + etkinliği UYGULANDIĞI HÂLDE — biri sonradan değiştiyse (ör. tetikleyici
--  kapatıldı, fonksiyona yetki verildi / alındı) o değişikliği EZMEDEN durur ve neyin değiştiğini söyler.
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
  v22_r record;
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('guvenlik.site_onay_22_yedek') is null or not exists (select 1 from guvenlik.site_onay_22_yedek where tur = 'isaret') then
    raise exception '22 uygulanmamış (yedek işareti yok). Hiçbir şey değişmedi.';
  end if;
  if (select count(*) from guvenlik.site_onay_22_yedek where tur = 'fonksiyon') <> 2
     or (select count(*) from guvenlik.site_onay_22_yedek where tur = 'once_yetki') <> 2
     or (select count(*) from guvenlik.site_onay_22_yedek where tur = 'sonra') <> 1 + (select count(*) from (values @@MD5_22_SATIRLARI@@) x(sira, ad, beklenen))
     or not exists (select 1 from guvenlik.site_onay_22_yedek where tur = 'olusturdu') then
    raise exception 'Yedek eksik (tanım / önceki yetki / uygulama sonrası durum / oluşturulan nesneler). Hiçbir şey değişmedi.';
  end if;
  for v22_ad, v22_beklenen in select x.ad, x.beklenen from (values @@MD5_22_SATIRLARI@@) x(sira, ad, beklenen) loop
    select md5(btrim(regexp_replace(regexp_replace(prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) into v22_canli
      from pg_proc where oid = to_regprocedure(v22_ad);
    if v22_canli is distinct from v22_beklenen then
      raise exception '% gövdesi uygulandıktan sonra değişmiş (beklenen %, canlı %). Hiçbir şey değişmedi.', v22_ad, v22_beklenen, coalesce(v22_canli, 'yok');
    end if;
  end loop;
  select tanim into v22_beklenen from guvenlik.site_onay_22_yedek where tur = 'sonra' and nesne like 'tetikleyici:%';
  select pg_get_triggerdef(t.oid) || ' | ' || t.tgenabled::text into v22_canli
    from pg_trigger t where t.tgrelid = 'public.cariler'::regclass and t.tgname = 'site_cari_ekleme_koru';
  if v22_canli is distinct from v22_beklenen then
    raise exception 'site_cari_ekleme_koru tetikleyicisi uygulandıktan sonra değişmiş (uygulama sonrası: %; şimdi: %). Değişiklik ezilmez; hiçbir şey değişmedi.',
      v22_beklenen, coalesce(v22_canli, 'yok');
  end if;
  for v22_ad, v22_beklenen in select nesne, tanim from guvenlik.site_onay_22_yedek where tur = 'sonra' and nesne not like 'tetikleyici:%' loop
    select coalesce(p.proacl::text, '') || ' | ' || p.prosecdef || ' | ' || coalesce(array_to_string(p.proconfig, ','), '') || ' | ' || pg_get_userbyid(p.proowner)
      into v22_canli from pg_proc p where p.oid = to_regprocedure(v22_ad);
    if v22_canli is distinct from v22_beklenen then
      raise exception '% yetkisi / sahibi / ayarı uygulandıktan sonra değişmiş (uygulama sonrası: %; şimdi: %). Değişiklik ezilmez; hiçbir şey değişmedi.',
        v22_ad, v22_beklenen, coalesce(v22_canli, 'yok');
    end if;
  end loop;

  if exists (select 1 from guvenlik.site_onay_22_yedek where tur = 'olusturdu' and nesne = 'tetikleyici:public.cariler.site_cari_ekleme_koru') then
    drop trigger site_cari_ekleme_koru on public.cariler;
  end if;
  for v22_ad in select nesne from guvenlik.site_onay_22_yedek where tur = 'olusturdu' and nesne like 'public.%(%' order by nesne loop
    execute 'drop function ' || v22_ad;
  end loop;
  for v22_tanim in select tanim from guvenlik.site_onay_22_yedek where tur = 'fonksiyon' order by nesne loop
    execute v22_tanim;
  end loop;
  for v22_ad, v22_tanim in select nesne, tanim from guvenlik.site_onay_22_yedek where tur = 'once_yetki' loop
    select coalesce(proacl::text, '') into v22_canli from pg_proc where oid = to_regprocedure(v22_ad);
    if v22_canli is distinct from v22_tanim then
      for v22_r in select distinct grantee from aclexplode(nullif(v22_canli, '')::aclitem[]) loop
        execute format('revoke all on function %s from %s', v22_ad, case when v22_r.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(v22_r.grantee)) end);
      end loop;
      if v22_tanim = '' then
        execute format('grant execute on function %s to public', v22_ad);
      else
        for v22_r in select grantee, privilege_type, is_grantable from aclexplode(v22_tanim::aclitem[]) loop
          execute format('grant %s on function %s to %s%s', v22_r.privilege_type, v22_ad,
            case when v22_r.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(v22_r.grantee)) end,
            case when v22_r.is_grantable then ' with grant option' else '' end);
        end loop;
      end if;
    end if;
  end loop;
  if exists (select 1 from guvenlik.site_onay_22_yedek where tur = 'olusturdu' and nesne = 'sutun:public.site_kayit_talepleri.islenme') then
    alter table public.site_kayit_talepleri drop column islenme;
  end if;

  create table if not exists guvenlik.site_onay_22_geri_sonuc (sira int, kontrol text, beklenen text, sonuc text, durum text);
  revoke all on guvenlik.site_onay_22_geri_sonuc from public, anon, authenticated;
  delete from guvenlik.site_onay_22_geri_sonuc;
  insert into guvenlik.site_onay_22_geri_sonuc
  select x.sira, x.ad || ' (19 hâli)', x.beklenen,
         coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g')))
                     from pg_proc p where p.oid = to_regprocedure(x.ad)), 'yok'), null
    from (values (1, 'public.site_kayit_onayla(text, text)', '@@MD5_ONAYLA_19@@'), (2, 'public.site_kayit_reddet(text)', '@@MD5_REDDET_19@@')) x(sira, ad, beklenen);
  insert into guvenlik.site_onay_22_geri_sonuc
  select 2 + row_number() over (order by y.nesne), y.nesne || ' yetkileri (22 öncesi hâl)', y.tanim,
         coalesce((select coalesce(p.proacl::text, '') from pg_proc p where p.oid = to_regprocedure(y.nesne)), 'yok'), null
    from guvenlik.site_onay_22_yedek y where y.tur = 'once_yetki';
  insert into guvenlik.site_onay_22_geri_sonuc
  select 10, '22''nin oluşturduğu nesneler kaldırıldı (kalan)', '0',
         (select count(*) from guvenlik.site_onay_22_yedek o where o.tur = 'olusturdu' and (
            (o.nesne like 'public.%(%' and to_regprocedure(o.nesne) is not null)
            or (o.nesne = 'tetikleyici:public.cariler.site_cari_ekleme_koru' and exists (select 1 from pg_trigger where tgname = 'site_cari_ekleme_koru' and not tgisinternal))
            or (o.nesne = 'sutun:public.site_kayit_talepleri.islenme'
                and exists (select 1 from pg_attribute where attrelid = 'public.site_kayit_talepleri'::regclass and attname = 'islenme' and not attisdropped))))::text, null;
  update guvenlik.site_onay_22_geri_sonuc set durum = case when sonuc = beklenen then 'tamam' else 'FARKLI' end;
  select string_agg(kontrol, '; ') into v22_ozet from guvenlik.site_onay_22_geri_sonuc where durum <> 'tamam';
  if v22_ozet is not null then
    raise exception 'Geri alma doğrulaması tutmadı (%). Bu blok geri alındı; hiçbir şey değişmedi.', v22_ozet;
  end if;
  delete from guvenlik.site_onay_22_yedek;
end $$;

select sira, kontrol, beklenen, sonuc, durum from guvenlik.site_onay_22_geri_sonuc order by sira;

commit;
