-- =====================================================================================================================
--  54-f-geri-al.sql — ÜRETİLDİ (stok-v2/guvenlik/54-f-uret.py; ELLE DÜZENLENMEZ).
--  PAKET F (sunucu) — GERİ ALMA (AYRI ONAYLA): tetikleyiciler ve fonksiyonlar kalkar. Veriye dokunmaz; tiplerdeki fason alanı ve kimlikler KALIR.
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
do $$
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'Paket F geri alma postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  drop trigger if exists f_fis_teslim_koru on public.stk_fis;
  drop trigger if exists f_tanim_cari_tipi_koru on public.tanimlar;
  drop trigger if exists f_cari_fason_koru on public.cariler;
  drop trigger if exists f_uretim_tahakkuk_koru on public.uretim;
  drop function if exists public.f_eski_istemci();
  drop function if exists public.f_cari_fason(t jsonb, tip_id text, tip_ad text);
  drop function if exists public.f_fason_yetkisi();
  drop function if exists public.f_tanim_cari_tipi_koru();
  drop function if exists public.f_cari_fason_koru();
  drop function if exists public.f_uretim_tahakkuk_koru();
  drop function if exists public.f_fis_teslim_koru();
end $$;
with k(no, kontrol, beklenen, bulunan) as (
  select 1, 'fonksiyonlar (f_eski_istemci, f_cari_fason, f_fason_yetkisi, f_tanim_cari_tipi_koru, f_cari_fason_koru, f_uretim_tahakkuk_koru, f_fis_teslim_koru)', '7',
     (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('f_eski_istemci', 'f_cari_fason', 'f_fason_yetkisi', 'f_tanim_cari_tipi_koru', 'f_cari_fason_koru', 'f_uretim_tahakkuk_koru', 'f_fis_teslim_koru'))
  union all select 2, 'etkin tetikleyiciler (tanimlar, cariler, uretim, stk_fis)', '4', (select count(*)::text from pg_trigger g where not g.tgisinternal and g.tgenabled = 'O' and g.tgname in ('f_tanim_cari_tipi_koru', 'f_cari_fason_koru', 'f_uretim_tahakkuk_koru', 'f_fis_teslim_koru'))
  union all select 3, 'fonksiyonlar authenticated / anon tarafından doğrudan çağrılamaz', 'evet',
     case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('f_eski_istemci', 'f_cari_fason', 'f_fason_yetkisi', 'f_tanim_cari_tipi_koru', 'f_cari_fason_koru', 'f_uretim_tahakkuk_koru', 'f_fis_teslim_koru')
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))) then 'HAYIR' else 'evet' end
)
select no, kontrol, beklenen, bulunan, case when bulunan = beklenen then 'tamam' else 'EKSİK' end as durum from k
union all select 99, 'GENEL', '', '', case when (select bool_and(bulunan = beklenen) from k) then 'KURULU' when (select bool_and(bulunan in ('0', 'evet')) from k) then 'KURULU DEĞİL' else 'YARIM — sonucu gönder' end
order by 1;
