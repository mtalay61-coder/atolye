-- =====================================================================================================================
--  24-a6-tanim-kimligi-geri-al.sql — A6 DÜZELTMESİNİ GERİ ALIR (ÜRETİLMİŞ: 24-uret.py)
--  !!! UYARI: Bu dosya A6 GÜVENLİK AÇIĞINI YENİDEN AÇAR — yetkisiz personel tanımlar kimliğini değiştirip bütün modül
--  !!! yetkilerini kendine açabilir. Yalnız düzeltme uygulamayı bozduysa, geçici olarak ve kullanıcı onayıyla çalıştırın;
--  !!! ardından sorun giderilip düzeltme yeniden uygulanmalı.
--  İki fonksiyonun düzeltme ÖNCESİ gövdeleri birebir (rls-rol.sql / rls-yazma.sql, main b4594bc).
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
  if t is null or coalesce((t ->> 'girisAktifMi')::boolean, false) = false then return true; end if;
  eposta := lower(coalesce(auth.jwt() ->> 'email', ''));
  if eposta = '' then return false; end if;
  for k in select jsonb_array_elements(coalesce(t -> 'kullanicilar', '[]'::jsonb)) loop
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
