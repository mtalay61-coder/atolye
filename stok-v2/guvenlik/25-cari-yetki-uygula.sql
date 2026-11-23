-- =====================================================================================================================
--  25-cari-yetki-uygula.sql — G-25 UYGULAMA (AYRI ONAYLA; canlıya uygulanmadı)
--  G-25 — car_yaz YETKİ GENİŞLİĞİ (stok-v2/guvenlik/25-G25-TASARIM.md). ÜRETİLMİŞ DOSYA — elle düzenlenmez:
--  python3 stok-v2/guvenlik/25-uret.py (kaynak: 25-kaynak/yeni.sql + editor/15-duzeltme.sql car_yaz + editor/18-fis-defteri.sql
--  fis_kes / fis_iptal). Gövde özetleri Faz 0.4 envanterinin formülüyle (yorum / boşluk normalize, md5).
-- =====================================================================================================================
--  NE YAPAR (tasarım § 4):
--   - fis_kes: cari satırı olan fiş, yazmadan ÖNCE g25_fis_cari_yetki'den geçer — cari / muhasebe kaydetme yetkilisi (Yönetici dahil)
--     bugünkü gibi; değilse yalnız stoklu AF / SF (STOK) ve ÜRT (ÜRETİM) fişleri, grubun yetkisi + gerçek stok / üretim bağlantısı
--     (kimlik, cari, yön, tutar, para birimi; işçilikte atama / ara proses ücreti ve üretim adedi) ile. Gerisi 42501.
--   - car_yaz: fiş dışından (kapı kapalı) satır / iptal yalnız cari / muhasebe kaydetme ile.
--   - fis_iptal (fis_iptal_toplu onu çağırır): kayıtlı içeriğe göre grubun SİLME yetkisi (kasa / çek → muhasebe, fisler, cari; cari
--     → cari / muhasebe; stoklu AF / SF → stok grubu; ÜRT işçilik → üretim grubu). Ana + bağlı fiş birlikte, bugünkü gibi.
--   - Mesai (K2): mes_bildirim tablosu (saat, para değil) + mesai_bildir / mesai_bildirimleri / mesai_bildirim_iptal (üretim yetkisi)
--     + mesai_onayla (cari / muhasebe; MS fişi ve onay tek işlem). tanimlar tetikleyicisi: maaş / aylık saat / mesai katı değişimi
--     cari / muhasebe kaydetme ister.
--  ÖNKOŞULLAR (biri tutmazsa HATA, hiçbir şey değişmez): postgres rolü; G-25 uygulanmamış (yedek yok); oluşturulacak nesnelerin
--  HİÇBİRİ yok; car_yaz / fis_kes / fis_iptal gövdeleri beklenen G-25 öncesi hâl (md5); A6 uygulanmış (yetki_var_mi = canlı A6);
--  gerekli tablolar / fonksiyonlar var.
--  YEDEK (guvenlik.g25_yedek): üç fonksiyonun tam tanımı (pg_get_functiondef), yetkileri, sahibi, önce / sonra gövde özeti.
--  GERİ ALMA: 25-cari-yetki-geri-al.sql — AÇIĞI YENİDEN AÇAR (tasarım § 7).
--  Çalıştırma: Supabase › SQL Editor (postgres) › dosyanın TAMAMI › Run. Bütün değişiklik TEK do bloğunda (ya hepsi ya hiçbiri);
--  sonuç guvenlik.g25_sonuc'ta (son select gösterir).
-- =====================================================================================================================
begin;

do $g25d$
declare
  v_eksik text;
  v_r record;
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('guvenlik.g25_yedek') is not null then
    raise exception 'G-25 zaten uygulanmış (guvenlik.g25_yedek var). Geri almak için 25-cari-yetki-geri-al.sql. Hiçbir şey değişmedi.';
  end if;
  select string_agg(x, ', ') into v_eksik from unnest(array['public.g25_fis_cari_yetki(jsonb)', 'public.g25_fis_cari_yetki_tek(jsonb, jsonb, jsonb, jsonb, jsonb)', 'public.g25_fis_iptal_yetki(text)', 'public.g25_stok_bagi(jsonb, jsonb, jsonb, jsonb)', 'public.g25_tanimlar_ucret_koruma()', 'public.g25_ucret_ozeti(jsonb)', 'public.g25_uretim_bagi(jsonb, jsonb, jsonb, jsonb)', 'public.g25_yetki_iste(text[], text, text)', 'public.mesai_bildir(jsonb)', 'public.mesai_bildirim_iptal(jsonb)', 'public.mesai_bildirimleri(jsonb)', 'public.mesai_onayla(jsonb)']) x where to_regprocedure(x) is not null;
  if v_eksik is not null or to_regclass('public.mes_bildirim') is not null or exists (select 1 from pg_trigger where tgname = 'g25_tanimlar_ucret_koruma') then
    raise exception 'G-25''in oluşturacağı nesneler zaten var (%): sessizce değiştirilmez. Hiçbir şey değişmedi.', coalesce(v_eksik, 'mes_bildirim / tetikleyici');
  end if;
  select string_agg(x, ', ') into v_eksik from unnest(array['public.stk_fis', 'public.stk_hareket', 'public.car_hareket', 'public.kas_hareket',
      'public.fis_cek_iz', 'public.uretim', 'public.uretim_atamalari', 'public.urunler', 'public.tanimlar', 'public.stk_ayar']) x where to_regclass(x) is null;
  if v_eksik is not null then raise exception 'Tablo yok: %. Hiçbir şey değişmedi.', v_eksik; end if;
  select string_agg(x, ', ') into v_eksik from unnest(array['public.yetki_var_mi(text[], text)', 'public.stk_dizi(jsonb)', 'public.stk_sayi(text)',
      'public.fis_kapi_acik()', 'public.fis_iptal_toplu(jsonb)', 'public.fis_kalem_durumlari(text[])', 'gen_random_uuid()']) x where to_regprocedure(x) is null;
  if v_eksik is not null then raise exception 'Fonksiyon yok: %. Hiçbir şey değişmedi.', v_eksik; end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.yetki_var_mi(text[], text)')) is distinct from '148fc08c0e06e554b0f81478f8e26931' then
    raise exception 'A6 uygulanmış değil ya da yetki_var_mi değişmiş (gövde %). Hiçbir şey değişmedi.', coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.yetki_var_mi(text[], text)')), 'yok');
  end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.car_yaz(jsonb)')) is distinct from '1af5a49a2fa60b90210f48fac5076a27' then
    raise exception 'car_yaz beklenen G-25 öncesi hâlde değil (gövde %, beklenen 1af5a49a2fa60b90210f48fac5076a27). Hiçbir şey değişmedi.', coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.car_yaz(jsonb)')), 'yok');
  end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_kes(jsonb)')) is distinct from '7b4e3f2474c25784e92d0f91a9053af2' then
    raise exception 'fis_kes beklenen G-25 öncesi hâlde değil (gövde %, beklenen 7b4e3f2474c25784e92d0f91a9053af2). Hiçbir şey değişmedi.', coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_kes(jsonb)')), 'yok');
  end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_iptal(jsonb)')) is distinct from 'c514ade3ebe55cd52ea9c6a26b0bfc7a' then
    raise exception 'fis_iptal beklenen G-25 öncesi hâlde değil (gövde %, beklenen c514ade3ebe55cd52ea9c6a26b0bfc7a). Hiçbir şey değişmedi.', coalesce((select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_iptal(jsonb)')), 'yok');
  end if;

  -- YEDEK
  create schema if not exists guvenlik;
  revoke all on schema guvenlik from public, anon, authenticated;
  create table guvenlik.g25_yedek (ad text primary key, tanim text not null, yetki text, sahip text not null, ozet_once text not null, ozet_sonra text not null);
  revoke all on guvenlik.g25_yedek from public, anon, authenticated;
  insert into guvenlik.g25_yedek select 'car_yaz', pg_get_functiondef(p.oid), p.proacl::text, pg_get_userbyid(p.proowner), '1af5a49a2fa60b90210f48fac5076a27', '4ee7bfb498c6d729a6ddcf47a420031b'
    from pg_proc p where p.oid = 'public.car_yaz(jsonb)'::regprocedure;
  insert into guvenlik.g25_yedek select 'fis_kes', pg_get_functiondef(p.oid), p.proacl::text, pg_get_userbyid(p.proowner), '7b4e3f2474c25784e92d0f91a9053af2', 'c071d8020d8a22b20765cff7aec77c47'
    from pg_proc p where p.oid = 'public.fis_kes(jsonb)'::regprocedure;
  insert into guvenlik.g25_yedek select 'fis_iptal', pg_get_functiondef(p.oid), p.proacl::text, pg_get_userbyid(p.proowner), 'c514ade3ebe55cd52ea9c6a26b0bfc7a', '2ea9f6ce73682303f69f1b8f191e84ab'
    from pg_proc p where p.oid = 'public.fis_iptal(jsonb)'::regprocedure;

  -- YENİ NESNELER (25-kaynak/yeni.sql)
  execute $g25s$-- Yetki yoksa anlaşılır iletiyle 42501 (stk_yetki'nin iletisi modül adını hep "stok" yazıyor).
create or replace function public.g25_yetki_iste(p_moduller text[], p_islem text, p_ne text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.jwt() is null then return; end if;
  if not coalesce(public.yetki_var_mi(p_moduller, p_islem), false) then
    raise exception 'Bu işlem için yetkiniz yok: % (% yetkisi gerekir)', p_ne,
      array_to_string(p_moduller, ' / ') || ' ' || case p_islem when 'silme' then 'silme' when 'goruntuleme' then 'görüntüleme' else 'kaydetme' end
      using errcode = '42501';
  end if;
end $$$g25s$;
  execute $g25s$create or replace function public.g25_stok_bagi(f jsonb, p_stok jsonb, p_cari jsonb, p_kasa jsonb) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  stoklar jsonb := public.stk_dizi(p_stok -> 'satirlar');
  satirlar jsonb := public.stk_dizi(p_cari -> 'satirlar');
  onek text := coalesce(f ->> 'onek', '');
  tur text := coalesce(f ->> 'tur', '');
  cari text := nullif(f ->> 'cariId', '');
  pb text := nullif(f ->> 'paraBirimi', '');
  c jsonb; s jsonb; e jsonb;
  sm numeric; m numeric; b numeric; t numeric; matrah numeric; kdv numeric; oran numeric;
begin
  if jsonb_array_length(public.stk_dizi(p_kasa -> 'hareketler')) > 0 or jsonb_array_length(public.stk_dizi(p_kasa -> 'cekler')) > 0 then
    return 'stok fişinde kasa / çek satırı var';
  end if;
  if not ((onek = 'AF' and tur = 'Alış') or (onek = 'SF' and tur = 'Satış')) then
    return format('önek %s ile tür %s uyuşmuyor', onek, tur);
  end if;
  if cari is null then return 'fişin carisi yok'; end if;
  if (select count(*) from jsonb_array_elements(satirlar) x) <> (select count(distinct x ->> 'id') from jsonb_array_elements(satirlar) x) then
    return 'aynı cari satırı iki kez';
  end if;
  for c in select x from jsonb_array_elements(satirlar) x loop
    select x into s from jsonb_array_elements(stoklar) x where x ->> 'id' = c ->> 'id' limit 1;
    if s is null then return format('cari satırı %s bir stok satırına bağlı değil', c ->> 'id'); end if;
    e := case when jsonb_typeof(c -> 'ek') = 'object' then c -> 'ek' else '{}'::jsonb end;
    if coalesce(c ->> 'cari_id', '') <> cari then return format('cari satırı %s başka cariye yazılıyor', c ->> 'id'); end if;
    if coalesce(s ->> 'cariId', '') <> '' and s ->> 'cariId' <> cari then return format('stok satırı %s başka carinin', s ->> 'id'); end if;
    if coalesce(c ->> 'yon', '') <> (case tur when 'Alış' then 'Alacak' else 'Borç' end) then
      return format('cari satırı %s yönü %s türüne uymuyor', c ->> 'id', tur);
    end if;
    sm := public.stk_sayi(s ->> 'miktar');
    if sm is null or (tur = 'Alış' and sm <= 0) or (tur = 'Satış' and sm >= 0) then
      return format('stok satırı %s miktarı %s türüne uymuyor', s ->> 'id', tur);
    end if;
    if coalesce(e ->> 'islemTipi', '') not in ('', tur) then
      return format('cari satırı %s işlem tipi %s', c ->> 'id', e ->> 'islemTipi');
    end if;
    m := public.stk_sayi(e ->> 'miktar'); b := public.stk_sayi(e ->> 'birimFiyat'); t := public.stk_sayi(c ->> 'tutar');
    if m is null or b is null or t is null or b < 0 or t < 0 then return format('cari satırı %s miktar / fiyat / tutar eksik', c ->> 'id'); end if;
    if abs(m - abs(sm)) > 0.000001 then return format('cari satırı %s miktarı stok satırından farklı', c ->> 'id'); end if;
    oran := public.stk_sayi(e ->> 'kdvOrani');
    if oran is not null then
      matrah := public.stk_sayi(e ->> 'matrah'); kdv := public.stk_sayi(e ->> 'kdvTutari');
      if matrah is null or kdv is null or abs(matrah * oran / 100 - kdv) > 0.011 or abs(matrah + kdv - t) > 0.011 then
        return format('cari satırı %s KDV tutarı tutarsız', c ->> 'id');
      end if;
    else
      matrah := t;
    end if;
    if abs(m * b - matrah) > 0.011 + 0.000001 * abs(matrah) then
      return format('cari satırı %s tutarı miktar × birim fiyattan farklı', c ->> 'id');
    end if;
    if pb is not null and coalesce(c ->> 'para_birimi', '') <> pb then
      return format('cari satırı %s para birimi fişten farklı', c ->> 'id');
    end if;
  end loop;
  if (select count(distinct coalesce(x ->> 'para_birimi', '')) from jsonb_array_elements(satirlar) x) > 1 then
    return 'cari satırlarının para birimleri farklı';
  end if;
  return null;
end $$$g25s$;
  execute $g25s$create or replace function public.g25_uretim_bagi(f jsonb, p_cari jsonb, p_kasa jsonb, p_alt jsonb) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  satirlar jsonb := public.stk_dizi(p_cari -> 'satirlar');
  uid_ text := nullif(f ->> 'uretimId', '');
  u jsonb; ur jsonb; v_ucretler jsonb; ue jsonb; tan jsonb;
  adet numeric; c jsonb; e jsonb; m numeric; b numeric; t numeric;
begin
  if jsonb_array_length(public.stk_dizi(p_kasa -> 'hareketler')) > 0 or jsonb_array_length(public.stk_dizi(p_kasa -> 'cekler')) > 0 then
    return 'üretim fişinde kasa / çek satırı var';
  end if;
  if uid_ is null then return 'fişin üretim kaydı yok'; end if;
  select to_jsonb(x) into u from public.uretim x where x.id::text = uid_;
  if u is null then return format('üretim kaydı %s sunucuda yok', uid_); end if;
  select to_jsonb(x) into ur from public.urunler x where x.id::text = u ->> 'urun_id';
  ue := case when jsonb_typeof(ur -> 'ek') = 'object' then ur -> 'ek' else '{}'::jsonb end;
  -- Ürünün proses ücretleri (canlıda sütun; eski şemada ek / veri); numune üretiminde üretim kaydının kendisinde.
  v_ucretler := coalesce(case when jsonb_typeof(ur -> 'proses_ucretleri') = 'object' then ur -> 'proses_ucretleri' end,
                    case when jsonb_typeof(ue -> 'prosesUcretleri') = 'object' then ue -> 'prosesUcretleri' end,
                    case when jsonb_typeof(ur -> 'veri' -> 'prosesUcretleri') = 'object' then ur -> 'veri' -> 'prosesUcretleri' end, '{}'::jsonb)
           || coalesce(case when jsonb_typeof(u -> 'ek' -> 'prosesUcretleri') = 'object' then u -> 'ek' -> 'prosesUcretleri' end, '{}'::jsonb);
  adet := coalesce(public.stk_sayi(u ->> 'adet'), public.stk_sayi(u -> 'ek' ->> 'adet'));
  select veri into tan from public.tanimlar where id = 'tekil';
  for c in select x from jsonb_array_elements(satirlar) x loop
    e := case when jsonb_typeof(c -> 'ek') = 'object' then c -> 'ek' else '{}'::jsonb end;
    if coalesce(c ->> 'uretim_id', '') <> uid_ then return format('işçilik satırı %s başka üretim kaydına bağlı', c ->> 'id'); end if;
    if coalesce(e ->> 'islemTipi', '') <> 'İşçilik' then return format('cari satırı %s işçilik değil', c ->> 'id'); end if;
    if coalesce(c ->> 'yon', '') <> 'Alacak' then return format('işçilik satırı %s yönü Alacak değil', c ->> 'id'); end if;
    if coalesce(c ->> 'para_birimi', 'TRY') <> 'TRY' then return format('işçilik satırı %s TL değil', c ->> 'id'); end if;
    m := public.stk_sayi(e ->> 'miktar'); b := public.stk_sayi(e ->> 'birimFiyat'); t := public.stk_sayi(c ->> 'tutar');
    if m is null or b is null or t is null or m <= 0 or b <= 0 then return format('işçilik satırı %s miktar / ücret eksik', c ->> 'id'); end if;
    if abs(m * b - t) > 0.011 then return format('işçilik satırı %s tutarı miktar × ücretten farklı', c ->> 'id'); end if;
    if adet is not null and m > adet + 0.000001 then return format('işçilik satırı %s miktarı üretim adedinden (%s) büyük', c ->> 'id', adet); end if;
    if not exists (
      with atamalar as (
        select a.personel_id::text as personel, a.proses, coalesce(a.tamir_mi, false) as tamir, a.tamir_ucret
          from public.uretim_atamalari a where a.uretim_id::text = uid_
        union all
        select x ->> 'personel_id', x ->> 'proses', coalesce((x ->> 'tamir_mi')::boolean, false), public.stk_sayi(x ->> 'tamir_ucret')
          from jsonb_array_elements(public.stk_dizi(p_alt -> 'uretim_atamalari' -> 'satirlar')) x where x ->> 'uretim_id' = uid_),
      ciftler as (
        select personel as cari, public.stk_sayi(v_ucretler ->> proses) as ucret from atamalar where not tamir
        union all select personel, tamir_ucret from atamalar where tamir
        union all
        select coalesce(nullif(ue -> 'araProsesCariOverride' ->> (ap ->> 'id'), ''), ap ->> 'cariId'),
               coalesce(public.stk_sayi(ue -> 'araProsesUcretleri' ->> (ap ->> 'id')), public.stk_sayi(ap ->> 'ucret'))
          from jsonb_array_elements(case when jsonb_typeof(tan -> 'araProsesler') = 'array' then tan -> 'araProsesler' else '[]'::jsonb end) ap)
      select 1 from ciftler where cari = c ->> 'cari_id' and ucret is not null and abs(ucret - b) <= 0.000001) then
      return format('işçilik satırı %s için cari %s ve ücret %s bu üretimin atamalarında / ara proseslerinde yok', c ->> 'id', c ->> 'cari_id', b);
    end if;
  end loop;
  return null;
end $$$g25s$;
  execute $g25s$create or replace function public.g25_fis_cari_yetki_tek(f jsonb, p_stok jsonb, p_cari jsonb, p_kasa jsonb, p_alt jsonb) returns void
language plpgsql stable security definer set search_path = public as $$
declare
  onek text := coalesce(f ->> 'onek', '');
  ne text := coalesce(nullif(f ->> 'tur', ''), onek, 'fiş');
  grup text;
  hata text;
begin
  if jsonb_array_length(public.stk_dizi(p_cari -> 'satirlar')) = 0 then return; end if;
  if auth.jwt() is null then return; end if;
  if coalesce(public.yetki_var_mi(array['cari', 'muhasebe'], 'kaydetme'), false) then return; end if;
  grup := case when onek in ('AF', 'SF') and coalesce(f ->> 'aile', '') = 'stok' and jsonb_array_length(public.stk_dizi(p_stok -> 'satirlar')) > 0 then 'stok'
               when onek = 'ÜRT' then 'uretim' else 'para' end;
  if grup = 'para' then
    perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'kaydetme', ne || ' (cari hareketi)');
  elsif grup = 'stok' then
    perform public.g25_yetki_iste(array['stok', 'fisler', 'siparis', 'uretim'], 'kaydetme', ne);
    hata := public.g25_stok_bagi(f, p_stok, p_cari, p_kasa);
  else
    perform public.g25_yetki_iste(array['uretim', 'stok', 'fisler', 'siparis'], 'kaydetme', ne);
    hata := public.g25_uretim_bagi(f, p_cari, p_kasa, p_alt);
  end if;
  if hata is not null then
    raise exception 'Cari hareketi gerçek bir % işlemine bağlı değil (%) — bu kayıt için cari veya muhasebe kaydetme yetkisi gerekir',
      case grup when 'stok' then 'stok' else 'üretim' end, hata using errcode = '42501';
  end if;
end $$$g25s$;
  execute $g25s$create or replace function public.g25_fis_cari_yetki(p jsonb) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.g25_fis_cari_yetki_tek(p -> 'fis', p -> 'stok', p -> 'cari', p -> 'kasa', p -> 'alt');
  if jsonb_typeof(p -> 'bagli') = 'object' then
    perform public.g25_fis_cari_yetki_tek(p -> 'bagli' -> 'fis', p -> 'bagli' -> 'stok', p -> 'bagli' -> 'cari', p -> 'bagli' -> 'kasa', null);
  end if;
end $$$g25s$;
  execute $g25s$create or replace function public.g25_fis_iptal_yetki(p_no text) returns void
language plpgsql stable security definer set search_path = public as $$
declare
  fis public.stk_fis;
  h text;
  stoklu boolean; carili boolean; kasali boolean; grup text;
begin
  if auth.jwt() is null then return; end if;
  for h in select x from unnest(array[p_no, (select ff.bagli_fis from public.stk_fis ff where ff.id = p_no)]) x where x is not null loop
    select * into fis from public.stk_fis where id = h;
    if not found then continue; end if;
    stoklu := exists (select 1 from public.stk_hareket where fis_id = h);
    carili := exists (select 1 from public.car_hareket where fis_no = h);
    kasali := exists (select 1 from public.kas_hareket where fis_id = h) or exists (select 1 from public.fis_cek_iz where fis_id = h);
    if kasali then
      perform public.g25_yetki_iste(array['muhasebe', 'fisler', 'cari'], 'silme', 'kasa / banka / çek satırlı fişin iptali (' || h || ')');
    end if;
    if carili and not coalesce(public.yetki_var_mi(array['cari', 'muhasebe'], 'silme'), false) then
      grup := case
        when fis.onek in ('AF', 'SF') and fis.aile = 'stok' and stoklu
             and not exists (select 1 from public.car_hareket c where c.fis_no = h
                              and not exists (select 1 from public.stk_hareket s where s.fis_id = h and s.id::text = c.id::text)) then 'stok'
        when fis.onek = 'ÜRT'
             and not exists (select 1 from public.car_hareket c where c.fis_no = h and coalesce(c.ek ->> 'islemTipi', '') <> 'İşçilik') then 'uretim'
        else 'para' end;
      if grup = 'stok' then
        perform public.g25_yetki_iste(array['stok', 'fisler', 'siparis', 'uretim'], 'silme', 'stok fişinin iptali (' || h || ')');
      elsif grup = 'uretim' then
        perform public.g25_yetki_iste(array['uretim', 'stok', 'fisler', 'siparis'], 'silme', 'üretim fişinin iptali (' || h || ')');
      else
        perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'silme', 'cari hareketli fişin iptali (' || h || ')');
      end if;
    end if;
  end loop;
end $$$g25s$;
  execute $g25s$create table public.mes_bildirim (
  id text primary key,
  cari_id text not null,
  ay text not null check (ay ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  saatler jsonb not null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'onaylandi', 'iptal')),
  giren text,
  giris_zamani timestamptz not null default now(),
  guncelleme timestamptz,
  onaylayan text,
  onay_zamani timestamptz,
  fis_no text
)$g25s$;
  execute $g25s$create unique index mes_bildirim_acik on public.mes_bildirim (cari_id, ay) where durum <> 'iptal'$g25s$;
  execute $g25s$alter table public.mes_bildirim enable row level security$g25s$;
  execute $g25s$revoke all on public.mes_bildirim from public, anon, authenticated$g25s$;
  execute $g25s$create or replace function public.mesai_bildir(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cari text := nullif(btrim(coalesce(p ->> 'cariId', '')), '');
  v_ay text := coalesce(p ->> 'ay', '');
  v_saat jsonb;
  k text; n numeric;
  b public.mes_bildirim;
  eposta text := lower(auth.jwt() ->> 'email');
begin
  perform public.g25_yetki_iste(array['uretim', 'cari', 'muhasebe'], 'kaydetme', 'mesai saati bildirimi');
  if v_ay !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Ay YYYY-AA olmalı' using errcode = '22023'; end if;
  if v_cari is null or not exists (
      select 1 from public.tanimlar t, jsonb_array_elements(case when jsonb_typeof(t.veri -> 'bolumler') = 'array' then t.veri -> 'bolumler' else '[]'::jsonb end) bo,
                    jsonb_array_elements(case when jsonb_typeof(bo -> 'personel') = 'array' then bo -> 'personel' else '[]'::jsonb end) pe
       where t.id = 'tekil' and pe ->> 'cariId' = v_cari) then
    raise exception 'Mesai yalnız bir bölümün personeline bildirilir' using errcode = '22023';
  end if;
  v_saat := '{}'::jsonb;
  foreach k in array array['haftaIci', 'cumartesi', 'pazar'] loop
    n := coalesce(public.stk_sayi(p -> 'saatler' ->> k), 0);
    if n < 0 or n > 744 then raise exception 'Mesai saati 0–744 arası olmalı (%)', k using errcode = '22023'; end if;
    v_saat := v_saat || jsonb_build_object(k, n);
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('mes_bildirim:' || v_cari || ':' || v_ay, 0));
  select * into b from public.mes_bildirim where cari_id = v_cari and ay = v_ay and durum <> 'iptal' for update;
  if found and b.durum = 'onaylandi' then
    raise exception 'Bu ayın mesaisi onaylanmış (fiş %) — değiştirilemez', b.fis_no using errcode = 'KR014';
  end if;
  if found then
    update public.mes_bildirim set saatler = v_saat, giren = eposta, guncelleme = now() where id = b.id returning * into b;
  else
    insert into public.mes_bildirim (id, cari_id, ay, saatler, giren) values ('mes-' || gen_random_uuid()::text, v_cari, v_ay, v_saat, eposta)
    returning * into b;
  end if;
  return jsonb_build_object('id', b.id, 'cariId', b.cari_id, 'ay', b.ay, 'saatler', b.saatler, 'durum', b.durum);
end $$$g25s$;
  execute $g25s$create or replace function public.mesai_bildirimleri(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.g25_yetki_iste(array['uretim', 'cari', 'muhasebe'], 'goruntuleme', 'mesai bildirimleri');
  return coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'cariId', b.cari_id, 'ay', b.ay, 'saatler', b.saatler, 'durum', b.durum,
      'giren', b.giren, 'girisZamani', b.giris_zamani, 'onaylayan', b.onaylayan, 'onayZamani', b.onay_zamani, 'fisNo', b.fis_no) order by b.ay desc, b.cari_id)
    from public.mes_bildirim b
   where (nullif(p ->> 'ay', '') is null or b.ay = p ->> 'ay') and (nullif(p ->> 'durum', '') is null or b.durum = p ->> 'durum')), '[]'::jsonb);
end $$$g25s$;
  execute $g25s$create or replace function public.mesai_bildirim_iptal(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.mes_bildirim;
begin
  perform public.g25_yetki_iste(array['uretim', 'cari', 'muhasebe'], 'kaydetme', 'mesai bildiriminin iptali');
  select * into b from public.mes_bildirim where id = p ->> 'id' for update;
  if not found or b.durum <> 'bekliyor' then raise exception 'Bekleyen bildirim bulunamadı' using errcode = 'P0002'; end if;
  update public.mes_bildirim set durum = 'iptal', guncelleme = now() where id = b.id;
  return jsonb_build_object('id', b.id, 'durum', 'iptal');
end $$$g25s$;
  execute $g25s$create or replace function public.mesai_onayla(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.mes_bildirim;
  fp jsonb := p -> 'fis';
  satirlar jsonb;
  r jsonb;
begin
  perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'kaydetme', 'mesai tahakkukunun onayı');
  select * into b from public.mes_bildirim where id = p ->> 'bildirimId' for update;
  if not found or b.durum = 'iptal' then raise exception 'Mesai bildirimi bulunamadı' using errcode = 'P0002'; end if;
  if b.durum = 'onaylandi' then
    return jsonb_build_object('fisNo', b.fis_no, 'zatenVar', true, 'bildirimId', b.id);
  end if;
  satirlar := public.stk_dizi(fp -> 'cari' -> 'satirlar');
  if coalesce(fp -> 'fis' ->> 'onek', '') <> 'MS' or jsonb_array_length(satirlar) <> 1
     or satirlar -> 0 ->> 'cari_id' is distinct from b.cari_id or coalesce(fp -> 'fis' ->> 'cariId', b.cari_id) <> b.cari_id
     or jsonb_array_length(public.stk_dizi(fp -> 'stok' -> 'satirlar')) > 0 or jsonb_typeof(fp -> 'bagli') = 'object' then
    raise exception 'Mesai onayı tek satırlık MS fişi olmalı ve bildirimin personeline yazılmalı' using errcode = '22023';
  end if;
  r := public.fis_kes(fp);
  update public.mes_bildirim set durum = 'onaylandi', onaylayan = lower(auth.jwt() ->> 'email'), onay_zamani = now(),
         fis_no = r ->> 'fisNo', guncelleme = now() where id = b.id;
  return r || jsonb_build_object('bildirimId', b.id);
end $$$g25s$;
  execute $g25s$revoke all on function public.mesai_bildir(jsonb), public.mesai_bildirimleri(jsonb), public.mesai_bildirim_iptal(jsonb), public.mesai_onayla(jsonb) from public, anon$g25s$;
  execute $g25s$grant execute on function public.mesai_bildir(jsonb), public.mesai_bildirimleri(jsonb), public.mesai_bildirim_iptal(jsonb), public.mesai_onayla(jsonb) to authenticated$g25s$;
  execute $g25s$revoke all on function public.g25_yetki_iste(text[], text, text), public.g25_stok_bagi(jsonb, jsonb, jsonb, jsonb),
  public.g25_uretim_bagi(jsonb, jsonb, jsonb, jsonb), public.g25_fis_cari_yetki_tek(jsonb, jsonb, jsonb, jsonb, jsonb),
  public.g25_fis_cari_yetki(jsonb), public.g25_fis_iptal_yetki(text) from public, anon, authenticated$g25s$;
  execute $g25s$create or replace function public.g25_ucret_ozeti(t jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'personel', coalesce((select jsonb_object_agg(pe ->> 'cariId', jsonb_build_object('maas', pe -> 'maas', 'aylikSaat', pe -> 'aylikSaat'))
        from jsonb_array_elements(case when jsonb_typeof(t -> 'bolumler') = 'array' then t -> 'bolumler' else '[]'::jsonb end) bo,
             jsonb_array_elements(case when jsonb_typeof(bo -> 'personel') = 'array' then bo -> 'personel' else '[]'::jsonb end) pe
       where coalesce(pe ->> 'cariId', '') <> ''), '{}'::jsonb),
    'mesaiAyar', coalesce(t -> 'mesaiAyar', 'null'::jsonb))
$$$g25s$;
  execute $g25s$create or replace function public.g25_tanimlar_ucret_koruma() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is null or coalesce(new.id, '') <> 'tekil' then return new; end if;
  if public.g25_ucret_ozeti(case when tg_op = 'INSERT' then '{}'::jsonb else old.veri end) is not distinct from public.g25_ucret_ozeti(new.veri) then
    return new;
  end if;
  perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'kaydetme', 'maaş, aylık çalışma saati ya da mesai katı değişikliği');
  return new;
end $$$g25s$;
  execute $g25s$revoke all on function public.g25_ucret_ozeti(jsonb), public.g25_tanimlar_ucret_koruma() from public, anon, authenticated$g25s$;
  execute $g25s$create trigger g25_tanimlar_ucret_koruma before insert or update on public.tanimlar for each row execute function public.g25_tanimlar_ucret_koruma()$g25s$;

  -- ÜÇ FONKSİYONUN G-25 HÂLİ (kaynaktaki tanım + birer satır; create or replace yetkileri ve sahibi korur)
  execute $g25s$create or replace function public.car_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  eposta text := lower(auth.jwt() ->> 'email');
  n_satir int := 0;
  n_iptal int := 0;
begin
  perform public.v2_yazma_acik('cari');   -- v1.730.1: geri dönüldüyse yazma yok (stok-v2.sql)
  perform public.stk_yetki(array['cari', 'fisler', 'muhasebe', 'siparis', 'uretim', 'stok', 'tanimlar'], 'kaydetme');
  -- G-25: fiş dışından (kapı kapalı — eski zarf yazıcıları) satır ya da iptal yalnız cari / muhasebe kaydetme ile.
  if not public.fis_kapi_acik() and (jsonb_array_length(public.stk_dizi(p -> 'satirlar')) > 0
      or jsonb_array_length(public.stk_dizi(p -> 'iptal')) > 0) then
    perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'kaydetme', 'fiş dışından cari hareketi');
  end if;
  if exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'satirlar')) x
             where coalesce(x ->> 'id', '') = '' or coalesce(x ->> 'cari_id', '') = '') then
    raise exception 'Cari hareketinde kimlik ya da cari yok' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(public.stk_dizi(p->'satirlar')) x
    where (public.stk_sayi(x->>'tutar') is null and to_regprocedure('public.fis_kapi_acik()') is not null)
      or coalesce(public.stk_sayi(x->>'tutar'),0)::text in ('NaN','Infinity','-Infinity')) then
    raise exception 'Cari hareket tutarı sonlu bir sayı olmalı' using errcode='KR010';
  end if;
  insert into public.car_hareket as h (id, cari_id, tarih, zaman, yon, tutar, para_birimi, odeme_sekli, vade, defter, fis_no,
                                       siparis_no, uretim_id, urun_ad, renk, aciklama, ek, olusturan)
  select x ->> 'id', x ->> 'cari_id', x ->> 'tarih', x ->> 'zaman', x ->> 'yon', coalesce(public.stk_sayi(x ->> 'tutar'), 0),
         x ->> 'para_birimi', x ->> 'odeme_sekli', x ->> 'vade', x ->> 'defter', x ->> 'fis_no', x ->> 'siparis_no',
         x ->> 'uretim_id', x ->> 'urun_ad', x ->> 'renk', x ->> 'aciklama',
         case when jsonb_typeof(x -> 'ek') = 'object' then x -> 'ek' else '{}'::jsonb end, eposta
  from (select distinct on (y ->> 'id') y as x from jsonb_array_elements(public.stk_dizi(p -> 'satirlar')) with ordinality as e(y, sira)
        order by y ->> 'id', sira desc) s
  on conflict (id) do update set
    cari_id = excluded.cari_id, tarih = excluded.tarih, zaman = excluded.zaman, yon = excluded.yon, tutar = excluded.tutar,
    para_birimi = excluded.para_birimi, odeme_sekli = excluded.odeme_sekli, vade = excluded.vade, defter = excluded.defter,
    fis_no = excluded.fis_no, siparis_no = excluded.siparis_no, uretim_id = excluded.uretim_id, urun_ad = excluded.urun_ad,
    renk = excluded.renk, aciklama = excluded.aciklama, ek = excluded.ek, guncelleme = now(),
    iptal = false, iptal_zamani = null, iptal_eden = null
  where (h.cari_id, h.tarih, h.zaman, h.yon, h.tutar, h.para_birimi, h.odeme_sekli, h.vade, h.defter, h.fis_no, h.siparis_no,
         h.uretim_id, h.urun_ad, h.renk, h.aciklama, h.ek, h.iptal)
    is distinct from (excluded.cari_id, excluded.tarih, excluded.zaman, excluded.yon, excluded.tutar, excluded.para_birimi,
         excluded.odeme_sekli, excluded.vade, excluded.defter, excluded.fis_no, excluded.siparis_no, excluded.uretim_id,
         excluded.urun_ad, excluded.renk, excluded.aciklama, excluded.ek, false);
  get diagnostics n_satir = row_count;
  update public.car_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta
   where id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'iptal'))) and not iptal;
  get diagnostics n_iptal = row_count;
  return jsonb_build_object('satir', n_satir, 'iptal', n_iptal);
end $$;$g25s$;
  execute $g25s$create or replace function public.fis_kes(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_istek text := nullif(btrim(coalesce(p ->> 'istek', '')), '');
  mevcut public.stk_fis;
  fid text;
  bid text;
  v_idler text[];
  v_once jsonb;
  v_kalem jsonb;
  v_eksik text;
  v_siparisler text[];
  v_sid text;
begin
  if v_istek is null then
    raise exception 'İstek kimliği yok (yeniden gönderimde çift fiş olmasın diye zorunlu)' using errcode = '22023';
  end if;
  if jsonb_typeof(p -> 'fis') <> 'object' then
    raise exception 'Fiş bilgisi yok' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('fis_kes:' || v_istek));
  v_idler := public.fis_kalem_idleri(p);
  select * into mevcut from public.stk_fis f where f.istek = v_istek;
  if found then
    return jsonb_build_object('fisNo', mevcut.id, 'bagliFisNo', mevcut.bagli_fis, 'zatenVar', true,
      'kalemler', public.fis_kalem_durumlari(v_idler), 'karsilananDuzeltme', '[]'::jsonb);
  end if;
  perform public.g25_fis_cari_yetki(p);   -- G-25: cari satırının yetkisi ve stok / üretim bağlantısı (yazmadan önce)
  select coalesce(array_agg(distinct sid order by sid), '{}'::text[]) into v_siparisler from (
    select p -> 'fis' ->> 'siparisId' as sid
    union all select p -> 'bagli' -> 'fis' ->> 'siparisId'
    union all select x ->> 'siparisId' from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) x
    union all select x ->> 'siparisId' from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) x
    union all select x ->> 'siparis_id' from jsonb_array_elements(public.stk_dizi(p -> 'alt' -> 'siparis_kalemleri' -> 'satirlar')) x
    union all select k.siparis_id::text from public.siparis_kalemleri k where k.id::text = any(v_idler)
  ) q where coalesce(sid, '') <> '';
  foreach v_sid in array v_siparisler loop
    perform pg_advisory_xact_lock(hashtextextended('fis_siparis_iptal:' || v_sid, 0));
  end loop;
  perform 1 from public.siparisler s where s.id::text = any(v_siparisler) order by s.id for key share;
  select string_agg(s.id::text, ', ' order by s.id) into v_eksik
    from public.siparisler s where s.id::text = any(v_siparisler) and s.durum = 'İptal';
  if v_eksik is not null then
    raise exception 'İptal edilmiş siparişe yeni fiş yazılamaz (sipariş %) — siparişi yenileyin', v_eksik using errcode = 'KR006';
  end if;
  v_once := public.fis_kalem_kilitle(v_idler);
  select string_agg(distinct x, ', ') into v_eksik from (
    select s ->> 'kalemId' as x from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) s
    union all select s ->> 'kalemId' from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) s) y
   where coalesce(x, '') <> '' and not (v_once ? x)
     and not exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'alt' -> 'siparis_kalemleri' -> 'satirlar')) a where a ->> 'id' = x);
  if v_eksik is not null then
    raise exception 'Var olmayan sipariş kalemine teslim yazılamaz (kalem %) — sipariş silinmiş ya da değişmiş olabilir; siparişi yenileyip yeniden deneyin', v_eksik
      using errcode = 'KR005';
  end if;
  select string_agg(distinct x.kalem || ' (' || coalesce(x.urun, '') || ' ' || coalesce(x.renk, '') || ' ≠ kalem ' || coalesce(k.urun_id::text, '') || ' ' || coalesce(k.renk, '') || ')', ', ')
    into v_eksik
    from (select s ->> 'kalemId' as kalem, s ->> 'urunId' as urun, s ->> 'renk' as renk from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) s
          union all select s ->> 'kalemId', s ->> 'urunId', s ->> 'renk' from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) s) x
    join public.siparis_kalemleri k on k.id::text = x.kalem
   where (x.urun is not null and k.urun_id is not null and x.urun <> k.urun_id::text)
      or (x.renk is not null and k.renk is not null and lower(btrim(x.renk)) <> lower(btrim(k.renk)));
  if v_eksik is not null then
    raise exception 'Teslim edilen ürün / renk sipariş kalemiyle uyuşmuyor: % — sipariş başka cihazda değişmiş olabilir; yenileyip yeniden deneyin', v_eksik
      using errcode = 'KR003';
  end if;

  perform public.kas_cek_kilitle(jsonb_build_object(
    'cekler',public.stk_dizi(p->'kasa'->'cekler')||public.stk_dizi(p->'bagli'->'kasa'->'cekler'),
    'cekIptal',public.stk_dizi(p->'kasa'->'cekIptal')||public.stk_dizi(p->'bagli'->'kasa'->'cekIptal'),
    'cekOnceki',coalesce(p->'kasa'->'cekOnceki','{}'::jsonb)||coalesce(p->'bagli'->'kasa'->'cekOnceki','{}'::jsonb)),true);
  perform public.kas_hesap_kilitle(jsonb_build_object('hareketler',
    public.stk_dizi(p->'kasa'->'hareketler')||public.stk_dizi(p->'bagli'->'kasa'->'hareketler')));
  p := public.fis_satis_teslim_koru(p);
  fid := public.fis_tek_kes(p -> 'fis', p -> 'stok', p -> 'cari', p -> 'kasa', v_istek);
  if jsonb_typeof(p -> 'bagli') = 'object' then
    bid := public.fis_tek_kes(p -> 'bagli' -> 'fis', p -> 'bagli' -> 'stok', p -> 'bagli' -> 'cari', p -> 'bagli' -> 'kasa', v_istek || ':bagli', fid);
    update public.stk_fis set bagli_fis = bid where id = fid;
    update public.stk_fis set bagli_fis = fid where id = bid;
  end if;
  if jsonb_typeof(p -> 'alt') = 'object' then
    perform set_config('fis.kalem', 'acik', true);
    perform public.alt_yaz(public.fis_alt_karsilanansiz(p -> 'alt'));
    perform set_config('fis.kalem', '', true);
  end if;
  v_kalem := public.fis_kalem_karsilanan_yenile(v_idler, v_once, 'fis_kes', fid);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', fid, 'bagliFisNo', bid, 'zatenVar', false,
    'kalemler', v_kalem -> 'kalemler', 'karsilananDuzeltme', v_kalem -> 'duzeltme');
end $$;$g25s$;
  execute $g25s$create or replace function public.fis_iptal(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  no text := nullif(btrim(coalesce(p ->> 'no', '')), '');
  eposta text := lower(auth.jwt() ->> 'email');
  f public.stk_fis;
  hedefler text[];
  h text;
  n int := 0;
  v_idler text[];
  v_once jsonb;
  v_kalem jsonb;
  v_bagli text;
  v_cek_iz record;
  v_cekler jsonb := '[]'::jsonb;
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'silme');
  perform public.g25_fis_iptal_yetki(no);   -- G-25 (K5): kayıtlı içeriğe göre grubun silme yetkisi
  select coalesce(array_agg(distinct x order by x), '{}'::text[]) into v_idler from (
    select coalesce(hh.kalem_id, hh.gecmis_kalem_id) as x from public.stk_hareket hh
     where hh.fis_id in (select ff.id from public.stk_fis ff where ff.id = no union select ff.bagli_fis from public.stk_fis ff where ff.id = no)
       and coalesce(hh.kalem_id, hh.gecmis_kalem_id) is not null
    union all select unnest(public.fis_kalem_idleri(jsonb_build_object('alt', p -> 'alt')))) y;
  v_once := public.fis_kalem_kilitle(v_idler);
  select ff.bagli_fis into v_bagli from public.stk_fis ff where ff.id = no;
  for h in select distinct z.cek_id from public.fis_cek_iz z
      where z.fis_id in (no,v_bagli) order by z.cek_id loop
    perform pg_advisory_xact_lock(hashtextextended('kas_cek:'||h,0));
  end loop;
  perform public.kas_hesap_kilitle(jsonb_build_object('hesaplar',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'tur',a.tur,'veri',a.veri)),'[]'::jsonb)
    from public.kas_hesap a where a.id in(select hesap_id from public.kas_hareket where fis_id in(no,v_bagli)))));
  perform 1 from public.stk_fis ff where ff.id = no or ff.id = v_bagli order by ff.id for update;
  select * into f from public.stk_fis where id = no;
  if not found then
    raise exception 'Fiş bulunamadı: %', coalesce(no, '(yok)') using errcode = 'P0002';
  end if;
  hedefler := array[f.id] || case when f.bagli_fis is not null then array[f.bagli_fis] else '{}'::text[] end;

  for v_cek_iz in select i.*,c.veri,c.iptal as cek_iptal from public.fis_cek_iz i
      join public.stk_fis ff on ff.id=i.fis_id join public.kas_cek c on c.id=i.cek_id
      where i.fis_id=any(hedefler) and not ff.iptal order by i.cek_id loop
    if v_cek_iz.cek_iptal or v_cek_iz.veri is distinct from v_cek_iz.sonraki then
      raise exception 'Çekin daha yeni işlemi var (%) — önce son işlemi geri alın',v_cek_iz.cek_id using errcode='KR008';
    end if;
    update public.kas_cek set veri=coalesce(v_cek_iz.onceki,veri),iptal=(v_cek_iz.onceki is null),
      iptal_zamani=case when v_cek_iz.onceki is null then now() else null end,
      iptal_eden=case when v_cek_iz.onceki is null then eposta else null end,guncelleme=now() where id=v_cek_iz.cek_id;
    v_cekler := v_cekler || jsonb_build_array(jsonb_build_object('id',v_cek_iz.cek_id,'veri',v_cek_iz.onceki));
  end loop;
  perform set_config('fis.kapi', 'acik', true);
  foreach h in array hedefler loop
    update public.stk_fis set iptal = true, iptal_zamani = now(), iptal_eden = eposta, iptal_sebebi = p ->> 'sebep'
     where id = h and not iptal;
    get diagnostics n = row_count;
    update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta where fis_id = h and not iptal;
    update public.car_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now() where fis_id = h and not iptal;
    update public.kas_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now() where fis_id = h and not iptal;
  end loop;
  if jsonb_typeof(p -> 'alt') = 'object' then
    perform set_config('fis.kalem', 'acik', true);
    perform public.alt_yaz(public.fis_alt_karsilanansiz(p -> 'alt'));
    perform set_config('fis.kalem', '', true);
  end if;
  v_kalem := public.fis_kalem_karsilanan_yenile(v_idler, v_once, 'fis_iptal', f.id);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', f.id, 'bagliFisNo', f.bagli_fis, 'zatenIptal', f.iptal,
    'cekler',v_cekler,'kalemler', v_kalem -> 'kalemler', 'karsilananDuzeltme', v_kalem -> 'duzeltme');
end $$;$g25s$;

  -- SONRA DENETİMİ (tutmazsa bütün blok geri alınır)
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.car_yaz(jsonb)')) is distinct from '4ee7bfb498c6d729a6ddcf47a420031b' then raise exception 'car_yaz uygulanan hâlde değil'; end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_kes(jsonb)')) is distinct from 'c071d8020d8a22b20765cff7aec77c47' then raise exception 'fis_kes uygulanan hâlde değil'; end if;
  if (select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) from pg_proc p where p.oid = to_regprocedure('public.fis_iptal(jsonb)')) is distinct from '2ea9f6ce73682303f69f1b8f191e84ab' then raise exception 'fis_iptal uygulanan hâlde değil'; end if;
  for v_r in select y.ad, y.yetki, y.sahip, p.proacl::text as simdi, pg_get_userbyid(p.proowner) as sahip_simdi
               from guvenlik.g25_yedek y join pg_proc p on p.oid = ('public.' || y.ad || '(jsonb)')::regprocedure loop
    if v_r.simdi is distinct from v_r.yetki or v_r.sahip_simdi <> v_r.sahip then raise exception '% yetkisi / sahibi değişti', v_r.ad; end if;
  end loop;
  if not exists (select 1 from pg_trigger where tgname = 'g25_tanimlar_ucret_koruma' and tgrelid = 'public.tanimlar'::regclass and tgenabled = 'O') then
    raise exception 'ücret tetikleyicisi kurulmadı';
  end if;

  create table guvenlik.g25_sonuc (sira int primary key, kontrol text not null, deger text not null);
  revoke all on guvenlik.g25_sonuc from public, anon, authenticated;
  insert into guvenlik.g25_sonuc values
    (1, 'car_yaz / fis_kes / fis_iptal', 'G-25 hâlinde (4ee7bfb4, c071d802, 2ea9f6ce)'),
    (2, 'yeni fonksiyonlar', '12'),
    (3, 'mes_bildirim tablosu (RLS açık, doğrudan erişim yok)', 'kuruldu'),
    (4, 'tanimlar ücret tetikleyicisi', 'kuruldu, etkin'),
    (5, 'yedek', 'guvenlik.g25_yedek (3 fonksiyon)'),
    (99, 'GENEL', 'UYGULANDI — 25-sonra-dogrula-salt-okur.sql ile doğrulayın');
end $g25d$;

select sira, kontrol, deger from guvenlik.g25_sonuc order by sira;

commit;
