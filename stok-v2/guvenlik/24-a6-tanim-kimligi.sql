-- =====================================================================================================================
--  24-a6-tanim-kimligi.sql — A6 DÜZELTMESİ (ÜRETİLMİŞ: python3 stok-v2/guvenlik/24-uret.py; elle düzenlenmez)
--  Önce 24-a6-onkosul-salt-okur.sql → GENEL = HAZIR olmalı. SQL Editor › tamamı › Run.
--  TEK İFADE (DO bloğu): iki fonksiyon ya birlikte kurulur ya hiç; sonda gövdeler doğrulanır, tutmazsa hepsi geri alınır.
--  1) tanimlar_kullanici_koruma: jetonlu istekte tanımlar satırının kimliği değiştirilemez (Yönetici dahil).
--  2) yetki_var_mi: tanımlar satırı yoksa / bozuksa jetonlu çağrıya yetki verilmez (eskiden 'evet').
--  Tetikleyici bağlantısı değişmez (aynı ad); yetkiler değişmez (create or replace sahibi ve izinleri korur).
-- =====================================================================================================================
do $$
declare
  g1 text;
  g2 text;
begin
  execute 'create or replace function public.tanimlar_kullanici_koruma()
returns trigger
language plpgsql
security definer
set search_path = public
as ' || chr(36) || chr(36) || '
begin
  if auth.jwt() is null then return coalesce(new, old); end if;
  if tg_op = ''DELETE'' then
    if not public.yonetici_mi() then
      raise exception ''Tanımları yalnız Yönetici silebilir'' using errcode = ''42501'';
    end if;
    return old;
  end if;
  if tg_op = ''INSERT'' then
    if exists (select 1 from public.tanimlar t where t.id = new.id) then return new; end if;
    if not exists (select 1 from public.tanimlar) then return new; end if;
    if not public.yonetici_mi() then
      raise exception ''Tanımlar satırını yalnız Yönetici ekleyebilir'' using errcode = ''42501'';
    end if;
    return new;
  end if;
  if new.id is distinct from old.id then
    raise exception ''Tanımlar satırının kimliği değiştirilemez'' using errcode = ''42501'';
  end if;
  if ((coalesce(new.veri -> ''kullanicilar'', ''[]''::jsonb)) is distinct from (coalesce(old.veri -> ''kullanicilar'', ''[]''::jsonb))
      or (new.veri -> ''girisAktifMi'') is distinct from (old.veri -> ''girisAktifMi''))
     and not public.yonetici_mi() then
    raise exception ''Kullanıcı listesini ve giriş ayarını yalnız Yönetici değiştirebilir'' using errcode = ''42501'';
  end if;
  return new;
end ' || chr(36) || chr(36) || ';';
  execute 'create or replace function public.yetki_var_mi(moduller text[], islem text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as ' || chr(36) || chr(36) || '
declare
  t jsonb;
  eposta text;
  k jsonb;
  aday text;
  m text;
begin
  select veri into t from public.tanimlar where id = ''tekil'';
  if t is null or jsonb_typeof(t) <> ''object'' or jsonb_typeof(t -> ''girisAktifMi'') is distinct from ''boolean''
     or jsonb_typeof(t -> ''kullanicilar'') is distinct from ''array'' then
    return auth.jwt() is null;
  end if;
  if (t ->> ''girisAktifMi'')::boolean = false then return true; end if;
  eposta := lower(coalesce(auth.jwt() ->> ''email'', ''''));
  if eposta = '''' then return false; end if;
  for k in select jsonb_array_elements(t -> ''kullanicilar'') loop
    aday := lower(coalesce(k ->> ''eposta'', ''''));
    if aday = '''' then
      aday := regexp_replace(lower(translate(coalesce(k ->> ''kullaniciAdi'', ''''), ''ÇĞIİÖŞÜçğıöşü'', ''CGIIOSUcgiosu'')), ''[^a-z0-9._-]'', '''', ''g'') || ''@atolye.local'';
    end if;
    if aday <> eposta then continue; end if;
    if coalesce(k ->> ''rol'', '''') = ''Yönetici'' then return true; end if;
    foreach m in array moduller loop
      if coalesce((k -> ''yetkiler'' -> m ->> islem)::boolean, false) then return true; end if;
    end loop;
    return false;
  end loop;
  return false;
end ' || chr(36) || chr(36) || ';';
  select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) into g1 from pg_proc p where p.oid = to_regprocedure('public.tanimlar_kullanici_koruma()');
  select md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) into g2 from pg_proc p where p.oid = to_regprocedure('public.yetki_var_mi(text[], text)');
  if g1 is distinct from '35c2916e7cc40fa07b98a87864f0436f' or g2 is distinct from '148fc08c0e06e554b0f81478f8e26931' then
    raise exception 'A6 DÜZELTMESİ DURDU: kurulan gövde beklenenle aynı değil (koruma %, yetki %) — HİÇBİR ŞEY DEĞİŞMEDİ', g1, g2;
  end if;
  raise notice 'A6 DÜZELTMESİ TAMAM: iki fonksiyon birlikte kuruldu (koruma %, yetki %)', g1, g2;
end $$;
