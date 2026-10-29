-- ROL YÜKSELTME VE GÜNLÜK SİLME KORUMASI (v1.640.0, genel denetim 2)
--
-- Sorun: rls-kimlik.sql giriş yapmış HER kullanıcıya her tabloda tam yetki veriyor ("authenticated → her şey",
-- bilinçli karar, 8u). Yetki (Yönetici / Personel) yalnız uygulama ekranında kontrol ediliyordu: publishable anahtar
-- + kendi jetonuyla REST'e bağlanan bir Personel, `tanimlar` satırındaki `kullanicilar` listesini değiştirip kendine
-- Yönetici verebilir; `gunluk` (denetim izi) tablosunu herkes silebilirdi.
--
-- Çözüm (tetikleyici, politika değil — rls-kimlik.sql yeniden çalıştırılınca politikalar silinip kuruluyor, tetikleyici
-- kalıyor):
--   1) `yonetici_mi()`: isteği yapan hesabın e-postası Tanımlar'daki kullanıcı listesinde Yönetici rolüyle var mı?
--      (eposta alanı; eski kayıtlarda kullanıcı adından türetilen "<ad>@atolye.local" — uygulamadaki kuralın aynısı)
--   2) `tanimlar` güncellenirken `veri->'kullanicilar'` DEĞİŞİYORSA yalnız Yönetici geçebilir; öteki tanımlar
--      (renk, beden, proses…) herkes için serbest kalır.
--   3) `gunluk` tablosundan yalnız Yönetici siler.
-- Servis anahtarıyla (Edge Function, yönetim paneli) yapılan işlemlerde auth.jwt() boş olduğu için tetikleyiciler
-- ATLANIR — yönetim işleri eskisi gibi çalışır.
--
-- Kullanım: Supabase > SQL Editor'da bir kez çalıştırın. rls-kimlik.sql'i yeniden çalıştırmak bunu bozmaz.

create or replace function public.yonetici_mi()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  eposta text;
  k jsonb;
  aday text;
begin
  eposta := lower(coalesce(auth.jwt() ->> 'email', ''));
  if eposta = '' then return false; end if;
  for k in
    select jsonb_array_elements(coalesce(veri -> 'kullanicilar', '[]'::jsonb)) from public.tanimlar where id = 'tekil'
  loop
    if coalesce(k ->> 'rol', '') <> 'Yönetici' then continue; end if;
    aday := lower(coalesce(k ->> 'eposta', ''));
    if aday = '' then
      -- Uygulamadaki `kullaniciEposta`: Türkçe harfler sadeleşir, yalnız [a-z0-9._-] kalır, "@atolye.local".
      aday := regexp_replace(lower(translate(coalesce(k ->> 'kullaniciAdi', ''), 'ÇĞIİÖŞÜçğıöşü', 'CGIIOSUcgiosu')), '[^a-z0-9._-]', '', 'g') || '@atolye.local';
    end if;
    if aday = eposta then return true; end if;
  end loop;
  return false;
end $$;

-- GİRİŞ ANAHTARI, SİLME VE YENİDEN EKLEME DE (v1.730.1 — baştan aşağı denetim). Yalnız `kullanicilar` korunuyordu ve yalnız
-- UPDATE'te: yetkisi olmayan kullanıcı REST'ten (a) `girisAktifMi`yi kapatıp (sunucu yetkisi `yetki_var_mi` o zaman herkese
-- "evet" der) ya da (b) satırı silip kendini Yönetici yaparak yeniden ekleyip stk_yaz / kas_yaz / fatura yazmalarını
-- açabiliyordu (yerel PostgreSQL'de doğrulandı). Artık:
--   · UPDATE: `kullanicilar` ya da `girisAktifMi` değişiyorsa yalnız Yönetici.
--   · DELETE: yalnız Yönetici.
--   · INSERT: satır zaten varsa (uygulamanın upsert'i — PostgreSQL önce "before insert" çalıştırır) karar UPDATE'e bırakılır;
--     tablo BOŞSA serbest (yeni firma kurulumunda ilk satır — silme korunduğu için boşaltılamaz); başka kimlikle satır yalnız
--     Yönetici.
create or replace function public.tanimlar_kullanici_koruma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Servis rolü (jetonsuz) → yönetim işi, dokunma.
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

drop trigger if exists tanimlar_kullanici_koruma on public.tanimlar;
create trigger tanimlar_kullanici_koruma
  before insert or update or delete on public.tanimlar
  for each row execute function public.tanimlar_kullanici_koruma();

create or replace function public.gunluk_silme_koruma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.jwt() is null then return old; end if;
  if not public.yonetici_mi() then
    raise exception 'Günlük kayıtlarını yalnız Yönetici silebilir' using errcode = '42501';
  end if;
  return old;
end $$;

drop trigger if exists gunluk_silme_koruma on public.gunluk;
create trigger gunluk_silme_koruma
  before delete on public.gunluk
  for each row execute function public.gunluk_silme_koruma();

-- Kontrol: aşağıdaki sorgu Yönetici hesabıyla true, Personel hesabıyla false dönmeli (SQL Editor servis rolüyle
-- çalıştığı için orada false döner; uygulamadan denemek gerekir).
-- select public.yonetici_mi();
