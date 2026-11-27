-- =====================================================================================================================
--  29-b3a2-uygula.sql — ÜRETİLDİ (stok-v2/guvenlik/29-b3a2-uret.py; ELLE DÜZENLENMEZ). Kaynak ve açıklama: 29-b3a2-kaynak/kaynak.sql
--  B3a-2 KURULUMU: cariler / urunler (fiyat) / tanimlar alan ve işlem bazında yazma yetkisi. Veri değişmez.
--  SQL Editor: dosyanın TAMAMI, bir kez Run. İlk ifade ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
do $$
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'B3a-2 postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regprocedure('public.yetki_var_mi(text[],text)') is null or to_regprocedure('public.yonetici_mi()') is null then
    raise exception 'B3a-2 önkoşulu: yetki_var_mi / yonetici_mi yok. Hiçbir şey değişmedi.';
  end if;
  create or replace function public.b3a2_y(p_modul text, p_islem text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as '
  select public.yetki_var_mi(array[p_modul], p_islem)
';
  create or replace function public.b3a2_yazar()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as '
  select public.yetki_var_mi(array[''tanimlar'', ''stok'', ''uretim'', ''siparis'', ''cari'', ''fisler'', ''muhasebe''], ''kaydetme'')
      or public.yetki_var_mi(array[''tanimlar'', ''stok'', ''uretim'', ''siparis'', ''cari'', ''fisler'', ''muhasebe''], ''duzenleme'')
';
  create or replace function public.b3a2_serbest()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as '
  select auth.jwt() is null or coalesce(auth.jwt() ->> ''role'', '''') <> ''authenticated'' or public.yonetici_mi()
';
  create or replace function public.b3a2_bos(p jsonb)
  returns boolean
  language plpgsql
  immutable
  as '
begin
  if p is null or p in (''null''::jsonb, ''""''::jsonb, ''[]''::jsonb, ''{}''::jsonb, ''false''::jsonb) then return true; end if;
  -- bütün alanları boş olan nesne de boştur (istemcinin varsayılan iskeleti: firmaBilgileri { logo: "", unvan: "", … })
  if jsonb_typeof(p) = ''object'' then
    return not exists (select 1 from jsonb_each(p) x where not public.b3a2_bos(x.value));
  end if;
  return false;
end ';
  create or replace function public.b3a2_liste_fark(p_eski jsonb, p_yeni jsonb)
  returns jsonb
  language sql
  immutable
  as '
  with e as (select coalesce(x ->> ''id'', x #>> ''{}'') k, x from jsonb_array_elements(case when jsonb_typeof(p_eski) = ''array'' then p_eski else ''[]''::jsonb end) x),
       y as (select coalesce(x ->> ''id'', x #>> ''{}'') k, x from jsonb_array_elements(case when jsonb_typeof(p_yeni) = ''array'' then p_yeni else ''[]''::jsonb end) x),
       d as (select e.x eski, y.x yeni,
                    (jsonb_typeof(e.x) = ''object'' and jsonb_typeof(y.x) = ''object''
                     and (y.x - ''kod'' - ''barkodKodu'') = (e.x - ''kod'' - ''barkodKodu'')
                     and (coalesce(e.x ->> ''kod'', '''') = '''' or (e.x -> ''kod'') is not distinct from (y.x -> ''kod''))
                     and (coalesce(e.x ->> ''barkodKodu'', '''') = '''' or (e.x -> ''barkodKodu'') is not distinct from (y.x -> ''barkodKodu''))) as kod
               from e join y on y.k = e.k where e.x is distinct from y.x)
  select jsonb_build_object(
    ''eklenen'', coalesce((select jsonb_agg(y.x) from y where not exists (select 1 from e where e.k = y.k)), ''[]''::jsonb),
    ''cikan'', coalesce((select jsonb_agg(e.x) from e where not exists (select 1 from y where y.k = e.k)), ''[]''::jsonb),
    ''degisen'', coalesce((select jsonb_agg(jsonb_build_object(''eski'', d.eski, ''yeni'', d.yeni)) from d where not d.kod), ''[]''::jsonb),
    ''kodDoldurma'', (select count(*) from d where d.kod))
';
  create or replace function public.b3a2_red(p_ne text, p_yetki text)
  returns void
  language plpgsql
  as '
begin
  raise exception ''Bu değişiklik için yetkiniz yok: % (gereken: %). Hiçbir şey kaydedilmedi.'', p_ne, p_yetki using errcode = ''42501'';
end ';
  create or replace function public.b3a2_cariler()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as '
declare
  e public.cariler;
  v_var boolean := true;
  v_alanlar text[];
  v_kalan text[];
  a text;
begin
  if public.b3a2_serbest() then return new; end if;
  if tg_op = ''INSERT'' then
    select * into e from public.cariler c where c.id = new.id;
    v_var := found;
  else
    e := old;
  end if;
  if not v_var then
    if coalesce(new.fiyat_grubu, '''') <> '''' or coalesce(new.ek ->> ''fiyatGrubuId'', '''') <> '''' then
      if not (public.b3a2_y(''cari'', ''duzenleme'') and public.b3a2_y(''siparis'', ''duzenleme'')) then
        perform public.b3a2_red(''fiyat gruplu yeni cari ('' || coalesce(new.unvan, '''') || '')'', ''cari: düzenleme VE sipariş: düzenleme'');
      end if;
    end if;
    if public.b3a2_y(''cari'', ''kaydetme'') then return new; end if;
    if (public.b3a2_y(''siparis'', ''kaydetme'') or public.b3a2_y(''stok'', ''kaydetme''))
       and coalesce(new.telefon, '''') = '''' and coalesce(new.vergi_no, '''') = '''' and coalesce(new.adres, '''') = '''' and coalesce(new.fiyat_grubu, '''') = ''''
       and coalesce(new.ek ->> ''fiyatGrubuId'', '''') = ''''
       and coalesce(new.bagli_prosesler, ''[]''::jsonb) = ''[]''::jsonb and not coalesce(new.pasif, false) then
      return new;
    end if;
    perform public.b3a2_red(''yeni cari kartı ('' || coalesce(new.unvan, '''') || '')'', ''cari: kaydetme; hızlı ekleme — yalnız unvan ve tip — için sipariş / stok: kaydetme'');
  end if;
  select coalesce(array_agg(n.key order by n.key), ''{}''::text[]) into v_alanlar
    from jsonb_each(to_jsonb(new)) n
   where n.key not in (''surum'', ''olusturma'') and n.value is distinct from (to_jsonb(e) -> n.key)
     and not (public.b3a2_bos(n.value) and public.b3a2_bos(to_jsonb(e) -> n.key))
     and not (n.key = ''para_birimi'' and public.b3a2_bos(to_jsonb(e) -> n.key) and n.value = ''"TRY"''::jsonb);
  if cardinality(v_alanlar) = 0 then return new; end if;
  v_kalan := v_alanlar;
  -- otomatik kod: yalnız BOŞ koda değer
  foreach a in array array[''kod'', ''barkod_kodu''] loop
    if a = any(v_kalan) and coalesce(to_jsonb(e) ->> a, '''') = '''' then
      if not public.b3a2_yazar() then perform public.b3a2_red(''cari kodu'', ''herhangi bir modülde yazma''); end if;
      v_kalan := array_remove(v_kalan, a);
    end if;
  end loop;
  -- FİYAT GRUBU: istemci bunu `ek.fiyatGrubuId`de tutar (sütun `fiyat_grubu` eski kayıtlar için) — ikisi de fiyat grubu sayılır
  if ''fiyat_grubu'' = any(v_kalan) or coalesce(new.ek ->> ''fiyatGrubuId'', '''') is distinct from coalesce(e.ek ->> ''fiyatGrubuId'', '''') then
    if not (public.b3a2_y(''cari'', ''duzenleme'') and public.b3a2_y(''siparis'', ''duzenleme'')) then
      perform public.b3a2_red(''müşterinin fiyat grubu ('' || coalesce(e.unvan, '''') || '')'', ''cari: düzenleme VE sipariş: düzenleme'');
    end if;
    v_kalan := array_remove(v_kalan, ''fiyat_grubu'');
  end if;
  -- `ek`te fiyat grubundan BAŞKA değişiklik yoksa `ek` kart değişikliği sayılmaz
  -- (`ek.olusturma`: istemci sunucunun `olusturma` sütununu ek''e geri yazar — veri değil)
  if ''ek'' = any(v_kalan) and (coalesce(new.ek, ''{}''::jsonb) - ''fiyatGrubuId'' - ''olusturma'') = (coalesce(e.ek, ''{}''::jsonb) - ''fiyatGrubuId'' - ''olusturma'') then
    v_kalan := array_remove(v_kalan, ''ek'');
  end if;
  if cardinality(v_kalan) > 0 and not public.b3a2_y(''cari'', ''duzenleme'') then
    perform public.b3a2_red(''cari kartı ('' || coalesce(e.unvan, '''') || '': '' || array_to_string(v_kalan, '', '') || '')'', ''cari: düzenleme'');
  end if;
  return new;
end ';
  create or replace function public.b3a2_urunler()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as '
declare
  e public.urunler;
  v_var boolean := true;
  v_satis boolean;
  v_alis boolean;
begin
  if public.b3a2_serbest() then return new; end if;
  if tg_op = ''INSERT'' then
    select * into e from public.urunler u where u.id = new.id;
    v_var := found;
  else
    e := old;
  end if;
  if v_var then
    -- fiyat: null ≡ 0; para birimi: yalnız iki taraf da DOLUYKEN farklıysa değişiklik (istemci boş birimi varsayılanla yazar)
    v_satis := coalesce(new.satis_fiyati, 0) <> coalesce(e.satis_fiyati, 0)
      or (nullif(new.satis_para_birimi, '''') is not null and nullif(e.satis_para_birimi, '''') is not null and new.satis_para_birimi <> e.satis_para_birimi)
      or public.b3a2_kurallar(new.fiyat_kurallari, false) is distinct from public.b3a2_kurallar(e.fiyat_kurallari, false);
    v_alis := coalesce(new.alis_fiyati, 0) <> coalesce(e.alis_fiyati, 0)
      or (nullif(new.alis_para_birimi, '''') is not null and nullif(e.alis_para_birimi, '''') is not null and new.alis_para_birimi <> e.alis_para_birimi)
      or public.b3a2_kurallar(new.fiyat_kurallari, true) is distinct from public.b3a2_kurallar(e.fiyat_kurallari, true);
  else
    -- yeni ürün: fiyat GİRİLMİŞSE fiyat yetkisi (para birimi tek başına fiyat sayılmaz — form varsayılanı)
    v_satis := coalesce(new.satis_fiyati, 0) <> 0 or public.b3a2_kurallar(new.fiyat_kurallari, false) <> ''[]''::jsonb;
    v_alis := coalesce(new.alis_fiyati, 0) <> 0 or public.b3a2_kurallar(new.fiyat_kurallari, true) <> ''[]''::jsonb;
  end if;
  if v_satis and not public.b3a2_y(''siparis'', ''duzenleme'') then
    perform public.b3a2_red(''satış fiyatı ('' || coalesce(new.ad, '''') || '')'', ''sipariş: düzenleme'');
  end if;
  if v_alis and not public.b3a2_y(''muhasebe'', ''duzenleme'') then
    perform public.b3a2_red(''alış fiyatı / maliyet ('' || coalesce(new.ad, '''') || '')'', ''muhasebe: düzenleme'');
  end if;
  return new;
end ';
  create or replace function public.b3a2_kurallar(p jsonb, p_alis boolean)
  returns jsonb
  language sql
  immutable
  as '
  select coalesce(jsonb_agg(x order by x::text), ''[]''::jsonb)
    from jsonb_array_elements(case when jsonb_typeof(p) = ''array'' then p else ''[]''::jsonb end) x
   where (coalesce(x ->> ''tip'', ''Satış'') = ''Alış'') = p_alis
';
  create or replace function public.b3a2_tanimlar()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as '
declare
  v_eski jsonb;
  k text;
  f jsonb;
  o jsonb;
  n jsonb;
  x jsonb;
  v_td boolean;
  v_ts boolean;
  v_kim text[];
  v_tip_s boolean;
  v_tip_a boolean;
  v_ok boolean;   -- CASE sonucu önce değişkene: plpgsql IF koşulu ilk THEN''de biter (CASE içindeki THEN''e takılır)
begin
  if public.b3a2_serbest() or coalesce(new.id, '''') <> ''tekil'' then return new; end if;
  if tg_op = ''INSERT'' then
    select t.veri into v_eski from public.tanimlar t where t.id = new.id;
    if not found then return new; end if;   -- ilk satır: mevcut tanimlar_kullanici_koruma karar verir
  else
    v_eski := old.veri;
  end if;
  v_eski := coalesce(v_eski, ''{}''::jsonb);
  v_td := public.b3a2_y(''tanimlar'', ''duzenleme'');
  v_ts := public.b3a2_y(''tanimlar'', ''silme'');
  for k in select distinct z from (select jsonb_object_keys(v_eski) z union all select jsonb_object_keys(coalesce(new.veri, ''{}''::jsonb))) q loop
    o := v_eski -> k; n := new.veri -> k;
    if o is not distinct from n or (public.b3a2_bos(o) and public.b3a2_bos(n)) then continue; end if;
    -- Açılış iskeleti: istemci firma bilgileri hiç yokken gömülü varsayılan logoyla boş bir kayıt ekler.
    -- Logo dışında her alanı boşsa bu bir firma bilgisi değişikliği değildir; var olan kayda dokunmak ise hep denetlenir.
    if k = ''firmaBilgileri'' and public.b3a2_bos(o) and public.b3a2_bos(n - ''logo'') then continue; end if;
    if k in (''kullanicilar'', ''girisAktifMi'', ''bolumler'', ''mesaiAyar'') then
      continue;   -- ilk ikisi tanimlar_kullanici_koruma''da; son ikisi G-25 (bu pakette kural yok — açık bulgu B6)
    elsif k = ''kodSayaclari'' then
      if exists (select 1 from jsonb_each(case when jsonb_typeof(o) = ''object'' then o else ''{}''::jsonb end) s
                  where coalesce((n ->> s.key)::numeric, -1) < coalesce((s.value #>> ''{}'')::numeric, 0)) then
        if not v_td then perform public.b3a2_red(''kod sayacını geri alma'', ''tanımlar: düzenleme''); end if;
      elsif not public.b3a2_yazar() then
        perform public.b3a2_red(''kod sayacı'', ''herhangi bir modülde yazma'');
      end if;
    elsif k = ''raporlar'' then
      -- kişisel rapor: yalnız sahibi (ad ya da kullanıcı adı); ortak rapor: tanımlar düzenleme
      if not v_td then
        select array[u ->> ''ad'', u ->> ''kullaniciAdi''] into v_kim from public.tanimlar t, jsonb_array_elements(t.veri -> ''kullanicilar'') u
         where t.id = ''tekil'' and lower(coalesce(nullif(u ->> ''eposta'', ''''),
                 regexp_replace(lower(translate(coalesce(u ->> ''kullaniciAdi'', ''''), ''ÇĞIİÖŞÜçğıöşü'', ''CGIIOSUcgiosu'')), ''[^a-z0-9._-]'', '''', ''g'') || ''@atolye.local''))
               = lower(coalesce(auth.jwt() ->> ''email'', '''')) limit 1;
        f := public.b3a2_liste_fark(o, n);
        for x in select y from jsonb_array_elements(f -> ''eklenen'') y union all select y from jsonb_array_elements(f -> ''cikan'') y
                 union all select y -> ''eski'' from jsonb_array_elements(f -> ''degisen'') y union all select y -> ''yeni'' from jsonb_array_elements(f -> ''degisen'') y loop
          if coalesce(x ->> ''kapsam'', ''ortak'') <> ''kisisel'' or not coalesce((x ->> ''sahip'') = any(array_remove(coalesce(v_kim, ''{}''::text[]), null)), false) or not public.b3a2_yazar() then
            perform public.b3a2_red(''ortak ya da başkasına ait rapor ('' || coalesce(x ->> ''ad'', '''') || '')'', ''tanımlar: düzenleme; kişisel raporu yalnız sahibi değiştirir'');
          end if;
        end loop;
      end if;
    elsif k = ''fiyatGruplari'' then
      f := public.b3a2_liste_fark(o, n);
      select coalesce(bool_or(coalesce(y ->> ''tip'', ''Satış'') <> ''Alış''), false), coalesce(bool_or(coalesce(y ->> ''tip'', ''Satış'') = ''Alış''), false) into v_tip_s, v_tip_a
        from (select y from jsonb_array_elements(f -> ''eklenen'') y union all select y from jsonb_array_elements(f -> ''cikan'') y
              union all select y -> ''eski'' from jsonb_array_elements(f -> ''degisen'') y union all select y -> ''yeni'' from jsonb_array_elements(f -> ''degisen'') y) q;
      if v_tip_s and not public.b3a2_y(''siparis'', ''duzenleme'') then perform public.b3a2_red(''satış fiyat grubu'', ''sipariş: düzenleme''); end if;
      if v_tip_a and not public.b3a2_y(''muhasebe'', ''duzenleme'') then perform public.b3a2_red(''alış fiyat grubu'', ''muhasebe: düzenleme''); end if;
      if jsonb_array_length(f -> ''cikan'') > 0 and not v_ts then perform public.b3a2_red(''fiyat grubunu silme'', ''tanımlar: silme''); end if;
    elsif k = ''katalogFiyatKaynaklari'' then
      if not public.b3a2_y(''siparis'', ''duzenleme'') then perform public.b3a2_red(''katalog fiyat kaynakları'', ''sipariş: düzenleme''); end if;
      if exists (select 1 from jsonb_array_elements_text(case when jsonb_typeof(n) = ''array'' then n else ''[]''::jsonb end) s
                  where (s = ''__genelAlis'' or exists (select 1 from jsonb_array_elements(coalesce(new.veri -> ''fiyatGruplari'', ''[]''::jsonb)) g
                                                       where g ->> ''id'' = s and g ->> ''tip'' = ''Alış''))
                    and not exists (select 1 from jsonb_array_elements_text(case when jsonb_typeof(o) = ''array'' then o else ''[]''::jsonb end) q where q = s))
         and not public.b3a2_y(''muhasebe'', ''duzenleme'') then
        perform public.b3a2_red(''kataloğa alış fiyatı kaynağı ekleme'', ''muhasebe: düzenleme'');
      end if;
    elsif k in (''renkler'', ''renkKombinasyonlari'', ''hammaddeTipleri'', ''mamulTipleri'', ''bedenler'', ''asortiler'', ''bedenGruplari'', ''prosesler'', ''araProsesler'',
                ''birimler'', ''fireSebepleri'', ''siparisSezonlari'', ''ozelKodAlanlari'', ''cariTipleri'', ''receteSablonlari'', ''giderKartlari'', ''giderGruplari'', ''genelGiderler'') then
      f := public.b3a2_liste_fark(o, n);
      -- EKLEME: hangi listeyi hangi modül ekleyebilir (genel "ekleme açık" kuralı yok)
      v_ok := case
           when k in (''renkler'', ''renkKombinasyonlari'', ''hammaddeTipleri'', ''mamulTipleri'', ''receteSablonlari'') then public.b3a2_y(''stok'', ''kaydetme'')
           when k = ''cariTipleri'' then public.b3a2_y(''cari'', ''kaydetme'')
           when k in (''giderKartlari'', ''giderGruplari'', ''genelGiderler'') then public.b3a2_y(''muhasebe'', ''kaydetme'')
           else false end;
      if jsonb_array_length(f -> ''eklenen'') > 0 and not v_td and not v_ok then
        perform public.b3a2_red(k || '' listesine ekleme'', case
           when k in (''renkler'', ''renkKombinasyonlari'', ''hammaddeTipleri'', ''mamulTipleri'', ''receteSablonlari'') then ''stok: kaydetme ya da tanımlar: düzenleme''
           when k = ''cariTipleri'' then ''cari: kaydetme ya da tanımlar: düzenleme''
           when k in (''giderKartlari'', ''giderGruplari'', ''genelGiderler'') then ''muhasebe: kaydetme ya da tanımlar: düzenleme''
           else ''tanımlar: düzenleme'' end);
      end if;
      -- DEĞİŞTİRME: mevcut öğe
      v_ok := case
           when k = ''ozelKodAlanlari'' then public.b3a2_y(''stok'', ''kaydetme'')      -- ürün ekranı alana yeni değer ekler (öğe değişir)
           when k = ''receteSablonlari'' then public.b3a2_y(''stok'', ''duzenleme'')
           when k = ''cariTipleri'' then public.b3a2_y(''cari'', ''duzenleme'')
           when k in (''giderKartlari'', ''giderGruplari'', ''genelGiderler'') then public.b3a2_y(''muhasebe'', ''duzenleme'')
           else false end;
      if jsonb_array_length(f -> ''degisen'') > 0 and not v_td and not v_ok then
        perform public.b3a2_red(k || '' listesinde mevcut öğeyi değiştirme'', ''tanımlar: düzenleme'');
      end if;
      -- ÇIKARMA
      if jsonb_array_length(f -> ''cikan'') > 0 and not v_ts then
        perform public.b3a2_red(k || '' listesinden öğe silme ('' || jsonb_array_length(f -> ''cikan'') || '')'', ''tanımlar: silme'');
      end if;
      if (f ->> ''kodDoldurma'')::int > 0 and not public.b3a2_yazar() then perform public.b3a2_red(''otomatik kod'', ''herhangi bir modülde yazma''); end if;
    elsif k in (''prosesGiderKartlari'') or k like ''%GiderKartId'' or k like ''%GelirKartId'' then
      if not (v_td or public.b3a2_y(''muhasebe'', ''duzenleme'')) then perform public.b3a2_red(k, ''muhasebe: düzenleme ya da tanımlar: düzenleme''); end if;
    elsif k in (''kapasite'', ''aylikUretimHedefi'') then
      if not (v_td or public.b3a2_y(''uretim'', ''duzenleme'') or public.b3a2_y(''muhasebe'', ''duzenleme'')) then
        perform public.b3a2_red(k, ''üretim: düzenleme, muhasebe: düzenleme ya da tanımlar: düzenleme'');
      end if;
    else
      -- ekranDuzenleri, mobilGorunum (ortak düzen), firmaBilgileri, site ayarları, bilinmeyen anahtar
      if not v_td then perform public.b3a2_red(''Tanımlar › '' || k, ''tanımlar: düzenleme''); end if;
    end if;
  end loop;
  return new;
end ';
  revoke all on function public.b3a2_y(text, text), public.b3a2_yazar(), public.b3a2_serbest(), public.b3a2_bos(jsonb), public.b3a2_liste_fark(jsonb, jsonb), public.b3a2_red(text, text),
    public.b3a2_kurallar(jsonb, boolean), public.b3a2_cariler(), public.b3a2_urunler(), public.b3a2_tanimlar() from public, anon, authenticated;
  drop trigger if exists b3a2_alan_koru on public.cariler;
  create trigger b3a2_alan_koru before insert or update on public.cariler for each row execute function public.b3a2_cariler();
  drop trigger if exists b3a2_alan_koru on public.urunler;
  create trigger b3a2_alan_koru before insert or update on public.urunler for each row execute function public.b3a2_urunler();
  drop trigger if exists b3a2_alan_koru on public.tanimlar;
  create trigger b3a2_alan_koru before insert or update on public.tanimlar for each row execute function public.b3a2_tanimlar();
  if (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru' and tgenabled = 'O') <> 3 then
    raise exception 'B3a-2 doğrulama: tetikleyici sayısı 3 değil — kurulum GERİ ALINDI';
  end if;
end $$;
select 'b3a2 fonksiyonları (10 olmalı)' as kontrol, (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\_%')::text as durum
union all
select 'b3a2_alan_koru tetikleyicisi (cariler, tanimlar, urunler — etkin)', coalesce((select string_agg(c.relname, ', ' order by c.relname) from pg_trigger g join pg_class c on c.oid = g.tgrelid
   where g.tgname = 'b3a2_alan_koru' and g.tgenabled = 'O'), 'yok')
union all
select 'GENEL', case when (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\_%') = 10
   and (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru' and tgenabled = 'O') = 3 then 'KURULU'
   when not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b3a2\_%') and not exists (select 1 from pg_trigger where tgname = 'b3a2_alan_koru') then 'KURULU DEĞİL'
   else 'YARIM — DUR' end;
