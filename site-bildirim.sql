-- =====================================================================================
--  site-bildirim.sql — WEB SİTESİ TALEBİNDE E-POSTA BİLDİRİMİ (v1.744.18)
-- =====================================================================================
--
--  Kullanıcı: "Site talebi için e-posta bildirimi yapalım."
--
--  ÖNCE: Edge Function `site-bildirim` kurulmuş olmalı (supabase-site-bildirim-fonksiyonu.ts başındaki adımlar).
--
--  ÇALIŞTIRMA: Supabase > SQL Editor > New query > bu dosyayı yapıştır. Aşağıdaki İKİ yeri doldurun, sonra Run:
--     <PROJE>    → proje adresinizin baştaki kısmı (https://<PROJE>.supabase.co)
--     <ANAHTAR>  → Edge Functions > Secrets'taki SITE_BILDIRIM_ANAHTAR (girmediyseniz GUN_SONU_ANAHTAR) değerinin AYNISI
--  (Anahtar bu dosyanın depodaki kopyasına YAZILMAZ; yalnız SQL Editor'de doldurulur.)
--
--  VAR OLAN TABLOLARA DOKUNMAZ: site_talepleri / site_kayit_talepleri değişmez; bildirim ayrı bir kayıt tablosunda tutulur.
--  Tekrar çalıştırılabilir: tablo varsa dokunulmaz, zamanlayıcı aynı adla yeniden kurulur.
-- =====================================================================================

-- 1) Bildirim kaydı: talep / kayıt başına TEK satır (birincil anahtar "talep:<id>" | "kayit:<id>") → aynı talep iki kez bildirilmez.
create table if not exists public.site_bildirim_kaydi (
  id text primary key,
  tur text not null,                      -- 'talep' | 'kayit'
  durum text not null default '',         -- 'gönderiliyor' | 'gönderildi (…)' | 'HATA: …'
  zaman timestamptz not null default now()
);
alter table public.site_bildirim_kaydi enable row level security;
-- ERP yalnız OKUR ("son bildirimler"); yazan sunucu fonksiyonudur (servis anahtarı RLS'e takılmaz). Site (anon) göremez.
drop policy if exists "site_bildirim_okuma" on public.site_bildirim_kaydi;
create policy "site_bildirim_okuma" on public.site_bildirim_kaydi for select to authenticated using (true);
revoke all on public.site_bildirim_kaydi from anon;
grant select on public.site_bildirim_kaydi to authenticated;

-- 2) Zamanlayıcı: her 5 dakikada fonksiyonu çağırır; ayar kapalıysa / yeni talep yoksa fonksiyon hiçbir şey göndermez.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('site-bildirim') where exists (select 1 from cron.job where jobname = 'site-bildirim');
select cron.schedule(
  'site-bildirim',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJE>.supabase.co/functions/v1/site-bildirim',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-site-bildirim-anahtar', '<ANAHTAR>'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Kontrol: select * from cron.job_run_details where command like '%site-bildirim%' order by start_time desc limit 5;
--          select * from public.site_bildirim_kaydi order by zaman desc limit 20;
-- Durdurmak: select cron.unschedule('site-bildirim');
-- Geri alma (tamamen): select cron.unschedule('site-bildirim'); drop table if exists public.site_bildirim_kaydi;
