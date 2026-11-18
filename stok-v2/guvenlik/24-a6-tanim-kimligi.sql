-- =====================================================================================================================
--  24-a6-tanim-kimligi.sql — A6 DÜZELTMESİ (ÜRETİLMİŞ: python3 stok-v2/guvenlik/24-uret.py; elle düzenlenmez)
--  Önce 24-a6-onkosul-salt-okur.sql → GENEL = HAZIR olmalı. SQL Editor › tamamı › Run. Tek işlem: hata olursa hiçbir şey değişmez.
--  1) tanimlar_kullanici_koruma: jetonlu istekte tanımlar satırının kimliği değiştirilemez (Yönetici dahil).
--  2) yetki_var_mi: tanımlar satırı yoksa / bozuksa jetonlu çağrıya yetki verilmez (eskiden 'evet').
--  Tetikleyici bağlantısı değişmez (aynı ad); yetkiler değişmez (create or replace sahibi ve izinleri korur).
-- =====================================================================================================================
begin;

create or replace function public.tanimlar_kullanici_koruma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.jwt() is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then
    if not public.yonetici_mi() then
      raise exception 'Tanımları yalnız Yönetici silebilir' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if exists (select 1 from public.tanimlar t where t.id = new.id) then return new; end if;
    if not exists (select 1 from public.tanimlar) then return new; end if;
    if not public.yonetici_mi() then
      raise exception 'Tanımlar satırını yalnız Yönetici ekleyebilir' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.id is distinct from old.id then
    raise exception 'Tanımlar satırının kimliği değiştirilemez' using errcode = '42501';
  end if;
  if ((coalesce(new.veri -> 'kullanicilar', '[]'::jsonb)) is distinct from (coalesce(old.veri -> 'kullanicilar', '[]'::jsonb))
      or (new.veri -> 'girisAktifMi') is distinct from (old.veri -> 'girisAktifMi'))
     and not public.yonetici_mi() then
    raise exception 'Kullanıcı listesini ve giriş ayarını yalnız Yönetici değiştirebilir' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function public.yetki_var_mi(moduller text[], islem text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t jsonb;
  eposta text;
  k jsonb;
  aday text;
  m text;
begin
  select veri into t from public.tanimlar where id = 'tekil';
  if t is null or jsonb_typeof(t) <> 'object' or jsonb_typeof(t -> 'girisAktifMi') is distinct from 'boolean'
     or jsonb_typeof(t -> 'kullanicilar') is distinct from 'array' then
    return auth.jwt() is null;
  end if;
  if (t ->> 'girisAktifMi')::boolean = false then return true; end if;
  eposta := lower(coalesce(auth.jwt() ->> 'email', ''));
  if eposta = '' then return false; end if;
  for k in select jsonb_array_elements(t -> 'kullanicilar') loop
    aday := lower(coalesce(k ->> 'eposta', ''));
    if aday = '' then
      aday := regexp_replace(lower(translate(coalesce(k ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local';
    end if;
    if aday <> eposta then continue; end if;
    if coalesce(k ->> 'rol', '') = 'Yönetici' then return true; end if;
    foreach m in array moduller loop
      if coalesce((k -> 'yetkiler' -> m ->> islem)::boolean, false) then return true; end if;
    end loop;
    return false;
  end loop;
  return false;
end $$;

commit;
