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
