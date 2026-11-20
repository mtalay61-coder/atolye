-- =====================================================================================================================
--  24-a6-canli-yedek-2026-11-18.sql — ARŞİV: A6 DÜZELTMESİ ÖNCESİ CANLIDAKİ BİREBİR TANIMLAR (18 Kasım 2026, Faz 0)
--  !!! ÇALIŞTIRMAK İÇİN DEĞİL — kayıttır. Geri dönüş için 24-a6-tanim-kimligi-geri-al.sql kullanılır (atomik, SQL Editor uyumlu;
--  !!! bu dosya pg_get_functiondef çıktısıdır, $function$ ayırıcıları SQL Editor kuralına uymaz). Geri alma A6 AÇIĞINI YENİDEN AÇAR.
--  Kaynak: canlı (ana proje) SQL Editor, 24-a6-canli-yedek-salt-okur.sql çıktısı (kullanıcı paylaştı). Kişisel veri / sır yok.
--  Ortak özellikler (iki fonksiyon): sahip postgres · SECURITY DEFINER · SET search_path TO 'public'
--    yetki listesi {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} (anon ve public çalıştıramaz)
--  Gövde özetleri (yorum ve boşluk dışı md5; 24-a6-onkosul-salt-okur.sql ile aynı yöntem) — bu metinden YENİDEN hesaplandı, canlıyla aynı:
--    tanimlar_kullanici_koruma  7a75a37deb2f40bf71569da55292d851  = geri alma dosyasının 'eski' gövdesi
--    yetki_var_mi               85a0b3b9c38dc0f7c55f5f8f39519fc4  = geri alma dosyasının 'eski' gövdesi
--    tetikleyici (tanım metni)  596f01be91f2baf1c102dfb021fb9bad
--  Not: canlıdaki yetki_var_mi metninde girintiler kaymış (Editor'e yapıştırma izi); anlamı ve özeti etkilemez.
-- =====================================================================================================================

CREATE OR REPLACE FUNCTION public.tanimlar_kullanici_koruma()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;

CREATE OR REPLACE FUNCTION public.yetki_var_mi(moduller text[], islem text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
                                                                    end $function$
;

CREATE TRIGGER tanimlar_kullanici_koruma BEFORE INSERT OR DELETE OR UPDATE ON public.tanimlar FOR EACH ROW EXECUTE FUNCTION tanimlar_kullanici_koruma();
