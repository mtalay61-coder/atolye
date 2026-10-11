-- MODÜL YETKİSİ SUNUCUDA — PARA TABLOLARINA YAZMA VE ANA KAYITLARI SİLME (v1.641.0)
--
-- Sorun: modül yetkileri (Tanımlar > Kullanıcılar: Görüntüleme / Düzenleme / Kaydetme / Silme) yalnız uygulama
-- ekranında kontrol ediliyordu. Giriş yapmış bir "Üretim" kullanıcısı, teknik bilgisi varsa, REST'ten kasa/banka/çek
-- kaydını değiştirebilir, fatura yazabilir, cari/ürün/sipariş silebilirdi.
--
-- Bu dosya aynı kuralı SUNUCUDA işletir (tetikleyici; rls-kimlik.sql yeniden çalıştırılınca politikalar yenilenir,
-- tetikleyici kalır). Kural uygulamadaki `yetkiVarMi` (094) ile bire bir:
--   · Giriş sistemi kapalıysa (tanimlar.girisAktifMi değil) kısıt yok.
--   · Çağıran Tanımlar'daki listede yoksa → ret.
--   · Yönetici → her şey.
--   · Diğerleri → kullanicilar[].yetkiler[modül][işlem] = true.
-- Kapsam (bilerek dar — uygulama modüller arası yazma yapıyor, ör. üretim teslimi cariye işçilik yazar; o yüzden
-- cari/stok/sipariş/üretim TABLOLARINA YAZMA kısıtlanmıyor, yalnız SİLME):
--   · muhasebe (kasa/banka/çek, tekil satır): yazma → muhasebe | fisler | cari modüllerinden biri "kaydetme".
--     İSTİSNA: yalnız `kurlar` değişiyorsa serbest (döviz kuru güncellemesi açılışta herkeste çalışır).
--   · faturalar (tekil): yazma → fisler | muhasebe "kaydetme".
--   · urunler / cariler / siparisler / uretim: SİLME → ilgili modülün "silme" yetkisi (stok / cari / siparis / uretim).
-- Okuma kısıtlanmıyor: uygulama açılışta bütün tabloları her kullanıcı için okuyor; okuma kapatılırsa açılmaz.
-- Servis anahtarıyla (Edge Function, panel) jwt boş → tetikleyiciler atlanır.
--
-- Kullanım: rls-rol.sql'den SONRA (yonetici_mi orada) Supabase > SQL Editor'da bir kez çalıştırın.

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

-- Genel tetikleyici: TG_ARGV[0] = modüller ("a|b|c"), TG_ARGV[1] = işlem.
create or replace function public.yazma_yetkisi_koruma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  moduller text[];
begin
  if auth.jwt() is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  moduller := string_to_array(tg_argv[0], '|');
  -- muhasebe: yalnız kurlar değişiyorsa serbest.
  if tg_table_name = 'muhasebe' and tg_op = 'UPDATE'
     and (new.veri - 'kurlar') is not distinct from (old.veri - 'kurlar') then
    return new;
  end if;
  if not public.yetki_var_mi(moduller, tg_argv[1]) then
    raise exception 'Bu işlem için yetkiniz yok (%: %)', tg_table_name, tg_argv[1] using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

drop trigger if exists yazma_koruma on public.muhasebe;
create trigger yazma_koruma before insert or update or delete on public.muhasebe
  for each row execute function public.yazma_yetkisi_koruma('muhasebe|fisler|cari', 'kaydetme');

do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'faturalar') then
    execute 'drop trigger if exists yazma_koruma on public.faturalar';
    execute $t$create trigger yazma_koruma before insert or update or delete on public.faturalar
      for each row execute function public.yazma_yetkisi_koruma('fisler|muhasebe', 'kaydetme')$t$;
  end if;
end $$;

drop trigger if exists silme_koruma on public.urunler;
create trigger silme_koruma before delete on public.urunler
  for each row execute function public.yazma_yetkisi_koruma('stok', 'silme');

drop trigger if exists silme_koruma on public.cariler;
create trigger silme_koruma before delete on public.cariler
  for each row execute function public.yazma_yetkisi_koruma('cari', 'silme');

drop trigger if exists silme_koruma on public.siparisler;
create trigger silme_koruma before delete on public.siparisler
  for each row execute function public.yazma_yetkisi_koruma('siparis', 'silme');

drop trigger if exists silme_koruma on public.uretim;
create trigger silme_koruma before delete on public.uretim
  for each row execute function public.yazma_yetkisi_koruma('uretim', 'silme');
