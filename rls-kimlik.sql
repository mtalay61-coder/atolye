-- =====================================================================================
--  rls-kimlik.sql — KİMLİK DOĞRULAMA 2. AŞAMA: VERİTABANI YALNIZ GİRİŞ YAPMIŞ KULLANICIYA AÇIK
-- =====================================================================================
--
--  BUGÜNE KADAR: HTML dosyasındaki açık anahtarı bilen HERKES veritabanını okuyup yazabiliyordu.
--  BU DOSYADAN SONRA: yalnız Supabase Auth ile giriş yapmış (oturum jetonu taşıyan) istekler geçer.
--
--  GÜNCELLEME (22 Eylül, v1.409.0): (a) tablolardaki ESKİ "herkese açık" politikalar
--  (gorevler_hepsi, koliler_hepsi, cek_gorselleri_hepsi…; rol sınırı YOK) artık SİLİNİYOR — anon
--  yetkisi alındığı için bugün zararsızlar ama biri ileride anon'a yetki verirse kapıyı yeniden
--  açarlardı. (b) `surum` tablosu anon'a YALNIZ OKUMA açık kalıyor: baslat.html giriş ÖNCESİ
--  yayındaki sürümü okuyor (surum.json yoksa); içinde yalnız sürüm no + adres var.
--
--  ÖNKOŞULLAR — sırayla, hepsi doğrulanmış olmalı:
--    1. Uygulama sürümü v1.257.0 ya da üstü (bulut ön giriş ekranı bu sürümde geldi).
--       Eski sürüm bu SQL'den sonra AÇILAMAZ: veriyi anahtarla okumaya çalışır, reddedilir.
--    2. `kullanici` Edge Function kurulu ve çalışıyor (Tanımlar'dan hesap açılabiliyor).
--    3. BÜTÜN kullanıcıların bulut hesabı var ve her biri EN AZ BİR KEZ bulut kimliğiyle
--       girdi (Tanımlar > Kullanıcılar'da hepsinin rozeti "bulut"; girişte turuncu "Yerel giriş"
--       rozeti çıkmıyor). Yerel şifreyle giren kullanıcı bu SQL'den sonra veriyi göremez.
--    4. Uygulama her bilgisayarda en az bir kez bulut kimliğiyle açıldı (oturum kaydedildi).
--
--  NASIL ÇALIŞTIRILIR: Supabase > SQL Editor > New query > bu dosyanın tamamını yapıştır > Run.
--  Hata verirse hiçbir şey değişmez (tek işlem — BEGIN/COMMIT).
--
--  GERİ ALMA: dosyanın sonundaki "GERİ ALMA" bölümünü (yorum içinde) çalıştırın; veritabanı
--  eski hâline (anahtarla açık) döner. Kimse giremiyorsa önce bunu yapın, sonra sebebi arayın.
--
--  NE YAPIYOR:
--    • public şemasındaki HER tabloda RLS açılır (ileride eklenecek tablolar için de: yeni tablo
--      açıldığında bu dosya yeniden çalıştırılabilir, idempotent).
--    • Her tabloya "authenticated" rolü için okuma/yazma/silme izni veren tek bir politika.
--      Rol ayrımı (Yönetici / Kullanıcı) uygulamada kalıyor; burada yalnız "giriş yapmış mı".
--    • "anon" rolünden bütün tablo ve fonksiyon yetkileri ALINIR: RLS tek başına SELECT'i hata
--      vermeden BOŞ döndürür — uygulama "veri yok" sanıp ilk kurulum ekranına düşerdi. Yetki
--      alınınca anonim istek AÇIKÇA reddedilir (401/403) ve uygulama bulut giriş ekranını gösterir.
--    • Edge Function'lar service role ile çalışır; etkilenmez (kullanici, kur).
-- =====================================================================================

begin;

-- 1) RLS + authenticated politikası — public şemasındaki bütün tablolar
do $$
declare
  t record;
  p record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    -- Tablonun KENDİ kurulum dosyasından kalan eski politikalar silinir (rol sınırı yoktu).
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t.tablename
        and policyname not in ('giris_yapmis_hersey', 'surum_anon_okuma')
    loop
      execute format('drop policy %I on public.%I', p.policyname, t.tablename);
    end loop;
    -- Eski politika varsa yeniden kurulur (idempotent).
    execute format('drop policy if exists "giris_yapmis_hersey" on public.%I', t.tablename);
    execute format(
      'create policy "giris_yapmis_hersey" on public.%I for all to authenticated using (true) with check (true)',
      t.tablename
    );
  end loop;
end $$;

-- 2) Anonim rolün yetkileri alınıyor: anahtarla (jetonsuz) istek artık açıkça reddedilir.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- 3) Giriş yapmış rol tabloları kullanabilmeli (RLS politikası üstüne tablo yetkisi de gerekir).
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;

-- 4) `surum`: anon YALNIZ OKUR (baslat.html giriş öncesi). Tablo yoksa atlanır — hata verip
--    bütün işlemi geri sardırmasın.
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'surum') then
    grant usage on schema public to anon;
    grant select on public.surum to anon;
    drop policy if exists "surum_anon_okuma" on public.surum;
    create policy "surum_anon_okuma" on public.surum for select to anon using (true);
  end if;
end $$;

commit;

-- DOĞRULAMA 1 — anahtarla (giriş yapmadan) veri OKUNAMAMALI. Tarayıcıda açın
-- (<proje> ve <anahtar> uygulamadakiyle aynı):
--   https://<proje>.supabase.co/rest/v1/tanimlar?select=id&apikey=<anahtar>
--   Beklenen: "permission denied for table tanimlar" (401/403). Veri görünüyorsa SQL tutmadı.
--   https://<proje>.supabase.co/rest/v1/surum?select=*&apikey=<anahtar>
--   Beklenen: sürüm kaydı GÖRÜNÜR (bilerek açık, yalnız okuma).
--
-- DOĞRULAMA 2 — politikalar: her tabloda yalnız "giris_yapmis_hersey" (surum'da ek olarak
-- "surum_anon_okuma") kalmalı:
--   select tablename, policyname, roles from pg_policies where schemaname = 'public' order by 1, 2;
--
-- KONTROL: aşağıdaki sorgu her tablo için rowsecurity = true ve bir politika göstermeli.
--   select c.relname, c.relrowsecurity, p.policyname
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   left join pg_policies p on p.tablename = c.relname
--   where n.nspname = 'public' and c.relkind = 'r' order by 1;

-- =====================================================================================
--  GERİ ALMA (gerekirse — yorumdan çıkarıp çalıştırın; anahtarla açık eski hâle döner)
-- =====================================================================================
-- begin;
-- do $$
-- declare t record;
-- begin
--   for t in select tablename from pg_tables where schemaname = 'public' loop
--     execute format('drop policy if exists "giris_yapmis_hersey" on public.%I', t.tablename);
--     execute format('alter table public.%I disable row level security', t.tablename);
--   end loop;
-- end $$;
-- grant usage on schema public to anon;
-- grant all on all tables in schema public to anon;
-- grant all on all sequences in schema public to anon;
-- alter default privileges in schema public grant all on tables to anon;
-- alter default privileges in schema public grant all on sequences to anon;
-- commit;
