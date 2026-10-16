-- =====================================================================================
--  gun-sonu.sql — GÜN SONU RAPORUNUN SUNUCUDAN OTOMATİK GÖNDERİMİ (v1.687.0)
-- =====================================================================================
--
--  Kullanıcı: "Sunucudan otomatik gönderilsin, uygulama açık olmasa da."
--
--  ÖNCE: Edge Function `gun-sonu` kurulmuş olmalı (supabase-gun-sonu-fonksiyonu.ts başındaki adımlar) ve
--  Edge Functions > Secrets'ta GUN_SONU_ANAHTAR girilmiş olmalı.
--
--  ÇALIŞTIRMA: Supabase > SQL Editor > New query > bu dosyayı yapıştır.
--  Aşağıdaki İKİ yeri doldurun, sonra Run:
--     <PROJE>             → proje adresinizin baştaki kısmı (https://<PROJE>.supabase.co)
--     <GUN_SONU_ANAHTAR>  → Secrets'a girdiğiniz değerin AYNISI
--  (Anahtar bu dosyanın depodaki kopyasına YAZILMAZ; yalnız SQL Editor'de doldurulur.)
--
--  Tekrar çalıştırılabilir: tablo varsa dokunulmaz, zamanlayıcı aynı adla yeniden kurulur.
-- =====================================================================================

-- 1) Gönderim kaydı: gün başına TEK satır (birincil anahtar) → aynı günün raporu iki kez gitmez.
create table if not exists public.gun_sonu_gonderim (
  gun date primary key,
  durum text not null default '',
  zaman timestamptz not null default now()
);
alter table public.gun_sonu_gonderim enable row level security;
-- Uygulama yalnız OKUR ("son sunucu gönderimi"); yazan sunucu fonksiyonudur (servis anahtarı RLS'e takılmaz).
drop policy if exists "gun_sonu_okuma" on public.gun_sonu_gonderim;
create policy "gun_sonu_okuma" on public.gun_sonu_gonderim for select to authenticated using (true);
grant select on public.gun_sonu_gonderim to authenticated;

-- 2) Zamanlayıcı: her 15 dakikada fonksiyonu çağırır; saati ve "bugün gönderildi mi"yi fonksiyon kendisi bilir.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('gun-sonu-raporu') where exists (select 1 from cron.job where jobname = 'gun-sonu-raporu');
select cron.schedule(
  'gun-sonu-raporu',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJE>.supabase.co/functions/v1/gun-sonu',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-gun-sonu-anahtar', '<GUN_SONU_ANAHTAR>'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Kontrol: select * from cron.job_run_details order by start_time desc limit 5;
--          select * from public.gun_sonu_gonderim order by gun desc;
-- Bir günün raporunu yeniden göndermek için (ör. hata düzeltildikten sonra): o günün satırını silin.
--          delete from public.gun_sonu_gonderim where gun = current_date;
