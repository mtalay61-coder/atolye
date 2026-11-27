-- =====================================================================================================================
--  B4 YALITILMIŞ DENEME — İLK YÖNETİCİ VE DENEME PERSONELİ (30 Kasım). YALNIZ yeni, yalıtılmış projede; yapı kurulumundan SONRA, bir kez.
--  SQL Editor: dosyanın tamamı, bir kez Run. Tek ifade: ya bütünüyle uygulanır ya hiç. Ana projede / G-25 denemesinde ÇALIŞTIRILMAZ
--  (bekçi: Tanımlar satırı varsa durur — dolu projede hiçbir şey değişmez).
-- =====================================================================================================================
--  NEDEN SQL: uygulamanın "İlk Kurulum" ekranı yalnız Tanımlar'da giriş sistemi AÇIKKEN çıkar; boş projede Tanımlar satırı yok. Publishable
--  anahtar hesap açamaz; servis (secret) anahtarı tarayıcıya konmaz. Bu yüzden:
--    1. HESAPLARI SEN açarsın — Supabase paneli › Authentication › Users › Add user › "Create new user", Auto Confirm User İŞARETLİ:
--         denemeyonetici@atolye.local   ve   denemestok@atolye.local      (şifreleri sen belirlersin; bana / depoya yazılmaz)
--    2. Bu dosya o iki hesabı ERP kullanıcı listesine yazar (şifre YOK — kimlik Supabase'de): DenemeYonetici = Yönetici; DenemeStok =
--       "Üretim" şablonu (üretim / stok: görüntüleme, düzenleme, kaydetme; sipariş / fişler: görüntüleme — silme YOK, para modülleri YOK).
--    3. Uygulamada giriş: kullanıcı adı "DenemeYonetici" (ya da "DenemeStok") + panelde verdiğin şifre.
--  Hesaplardan biri panelde yoksa durur ve hangisinin eksik olduğunu söyler.
do $$
declare
  eksik text;
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('public.tanimlar') is null or to_regclass('public.stk_ayar') is null then
    raise exception 'Yapı kurulmamış (tanimlar / stk_ayar yok) — önce b4-deneme-yapi.sql. Hiçbir şey değişmedi.';
  end if;
  if exists (select 1 from public.tanimlar) then
    raise exception 'Tanımlar satırı ZATEN var — bu dosya yalnız boş, yeni deneme projesinde çalışır. Hiçbir şey değişmedi.';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname like 'g25%') then
    raise exception 'Bu projede G-25 nesneleri var — B4 denemesi G-25''siz, ayrı projede yapılır. Hiçbir şey değişmedi.';
  end if;
  select string_agg(e, ', ') into eksik from unnest(array['denemeyonetici@atolye.local', 'denemestok@atolye.local']) e
   where not exists (select 1 from auth.users u where lower(u.email) = e);
  if eksik is not null then
    raise exception 'Supabase › Authentication › Users''ta açılmamış hesap: % — önce panelden açın (Auto Confirm). Hiçbir şey değişmedi.', eksik;
  end if;
  insert into public.tanimlar (id, veri) values ('tekil', jsonb_build_object(
    'girisAktifMi', true,
    'kullanicilar', jsonb_build_array(
      jsonb_build_object('id', 'kullanici-deneme-yonetici', 'ad', 'Deneme Yönetici', 'kullaniciAdi', 'DenemeYonetici', 'rol', 'Yönetici',
        'yetkiler', '{}'::jsonb, 'eposta', 'denemeyonetici@atolye.local', 'bulutHesabi', true),
      jsonb_build_object('id', 'kullanici-deneme-stok', 'ad', 'Deneme Stok', 'kullaniciAdi', 'DenemeStok', 'rol', 'Üretim',
        'eposta', 'denemestok@atolye.local', 'bulutHesabi', true,
        'yetkiler', '{"uretim": {"goruntuleme": true, "duzenleme": true, "kaydetme": true, "silme": false},
                      "stok": {"goruntuleme": true, "duzenleme": true, "kaydetme": true, "silme": false},
                      "siparis": {"goruntuleme": true, "duzenleme": false, "kaydetme": false, "silme": false},
                      "fisler": {"goruntuleme": true, "duzenleme": false, "kaydetme": false, "silme": false},
                      "cari": {"goruntuleme": false, "duzenleme": false, "kaydetme": false, "silme": false},
                      "muhasebe": {"goruntuleme": false, "duzenleme": false, "kaydetme": false, "silme": false},
                      "tanimlar": {"goruntuleme": false, "duzenleme": false, "kaydetme": false, "silme": false}}'::jsonb))));
end $$;
select u ->> 'kullaniciAdi' as kullanici, u ->> 'rol' as rol,
       exists (select 1 from auth.users a where lower(a.email) = lower(u ->> 'eposta')) as auth_hesabi_var
  from public.tanimlar t, jsonb_array_elements(t.veri -> 'kullanicilar') u where t.id = 'tekil';
