-- =====================================================================================================================
--  58-portal-giris-geri-al.sql — ÜRETİLDİ (stok-v2/guvenlik/58-portal-giris-uret.py; ELLE DÜZENLENMEZ).
--  GERİ ALMA (AYRI ONAYLA): portal_giris eski gövdesine döner (yalnız pasif cariye bakar). Veriye dokunmaz.
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
do $$
declare
  o text;
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  select md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) into o from pg_proc p where p.oid = to_regprocedure('public.portal_giris(text,text)');
  if o is null then raise exception 'portal_giris(text,text) bulunamadı. Hiçbir şey değişmedi.'; end if;
  if o not in ('f90cd3a563eabf1465427d3b08fbc19d', '3414d4de1e4fcb8120a82d2c1db54e53') then
    raise exception 'portal_giris gövdesi beklenen iki sürümden biri değil (özet %). Hiçbir şey değişmedi — sonucu gönderin.', o;
  end if;
  create or replace function public.portal_giris(p_kullanici text, p_sifre text) returns text language plpgsql volatile security definer set search_path = public, extensions as 'declare
  h record;
  anahtar text;
begin
  select * into h from site_hesaplari where kullanici = lower(trim(coalesce(p_kullanici, '''')));
  -- Kullanıcı yoksa da aynı hata: hangi adların var olduğu dışarıdan sınanamasın.
  -- Hatalı girişte HATA FIRLATILMAZ, boş döner: hata işlemi geri alır ve hatalı deneme sayacı hiç artmazdı (kilit
  -- çalışmazdı). Site boş cevabı "kullanıcı adı ya da şifre hatalı" diye gösterir.
  if h.cari_id is null then perform pg_sleep(0.3); return null; end if;
  if h.kilit_bitis is not null and h.kilit_bitis > now() then raise exception ''HESAP_KILITLI'' using errcode = ''P0001''; end if;
  if h.sifre_ozeti <> crypt(coalesce(p_sifre, ''''), h.sifre_ozeti) then
    update site_hesaplari set hatali_deneme = hatali_deneme + 1,
      kilit_bitis = case when hatali_deneme + 1 >= 5 then now() + interval ''15 minutes'' else null end
    where cari_id = h.cari_id;
    insert into site_giris_kaydi (cari_id, basarili) values (h.cari_id, false);
    return null;
  end if;
  if exists (select 1 from cariler c where c.id::text = h.cari_id and coalesce(c.pasif, false)) then return null; end if;
  anahtar := encode(gen_random_bytes(32), ''hex'');
  delete from site_oturumlari where bitis < now();
  insert into site_oturumlari values (anahtar, h.cari_id, now() + interval ''30 days'');
  update site_hesaplari set son_giris = now(), hatali_deneme = 0, kilit_bitis = null where cari_id = h.cari_id;
  insert into site_giris_kaydi (cari_id, basarili) values (h.cari_id, true);
  delete from site_giris_kaydi where zaman < now() - interval ''180 days'';
  return anahtar;
end;';
end $$;
select case md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) when 'f90cd3a563eabf1465427d3b08fbc19d' then 'YENİ — cari mevcut ve etkin olmalı' when '3414d4de1e4fcb8120a82d2c1db54e53' then 'ESKİ — yalnız pasif cariye bakıyor' else 'BEKLENMEYEN GÖVDE — sonucu gönder' end as portal_giris,
       p.prosecdef as guvenlik_tanimlayici, array_to_string(p.proconfig, ', ') as ayar,
       has_function_privilege('anon', p.oid, 'execute') as anon_cagirabilir, has_function_privilege('authenticated', p.oid, 'execute') as giris_yapmis_cagirabilir,
       (select count(*) from public.site_hesaplari h where not exists (select 1 from public.cariler c where c.id::text = h.cari_id)) as carisi_olmayan_hesap,
       (select count(*) from public.site_hesaplari h join public.cariler c on c.id::text = h.cari_id where coalesce(c.pasif, false)) as carisi_pasif_hesap
  from pg_proc p where p.oid = to_regprocedure('public.portal_giris(text,text)');
