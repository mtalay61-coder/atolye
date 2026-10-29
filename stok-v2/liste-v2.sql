-- =====================================================================================================================
--  liste-v2.sql — TEK PARÇA LİSTELERİN YENİ YAPISI (v2, 5. adım): teklif, fatura, koli, görev, model, fiş defteri, mesaj
-- =====================================================================================================================
--
--  NEDEN (kullanıcı, 29 Ekim: Kasa & Banka geçişinden sonra "devam et"; planın 5. maddesi "Teklif ve fatura"). Bu yedi
--  liste Kasa & Banka gibi TEK SATIRLIK birer JSON belgesi (tablo.veri = kayıt dizisi). Her kayıtta dizinin tamamı yazılıyor:
--  iki cihaz aynı anda yazarsa (iki kişi aynı anda mesaj atar, biri teklif öteki fatura keser) "oku → birleştir → yaz"
--  arasında öteki cihazın kaydı ezilebiliyor; eski listeli cihaz başkasının kaydını silebiliyordu (teklif olayı, v1.725.0
--  üç yönlü birleştirme deliği daralttı). Bu dosya kasa v2 ile aynı ilkeyle kapatır:
--    1. Her liste kaydı AYRI SATIR (`lst_kayit`: tablo + kimlik). Uygulama yalnız KENDİ farkını gönderir (`lst_yaz`): başka
--       cihazın kaydına dokunulmaz, boş / bayat liste hiçbir şeyi silmez.
--    2. Silinen kayıt SİLİNMEZ, iptal edilir (iz kalır, aynı kimlik yeniden gelirse açılır).
--  Okuma bugünkü biçimde: geçişte her eski ad (`teklifler`…) aynı biçimdeki salt-okur görünüme bağlanır (`liste-v2-goc.sql`)
--  — uygulama, gün sonu raporu, okuyan her yer değişmeden.
--  Sıra: `sira` artan. Göç dizideki sırayı 1..n verir; uygulama yeni kaydı listenin BAŞINA koyduysa eksi (şimdiki zaman),
--  SONUNA koyduysa artı (şimdiki zaman) gönderir — yeniden okunan liste ekrandakiyle aynı sırada gelir.
--  Değişiklik sayacı: satır tetikleyicisi sayacı TABLONUN ESKİ ADIYLA artırır (`teklifler`…) — uygulamanın yoklaması (047)
--  değişmeden çalışır.
--  Supabase SQL Editor kuralı (editor-icin.py): yalnız düz çift-dolar gövde, iç içe yok, başka yerde dolar işareti yok.
--  Önce stok-v2.sql (stk_ayar, stk_yetki, stk_dizi, stk_sayi) kurulmuş olmalı.
-- =====================================================================================================================

begin;

create table if not exists public.lst_kayit (
  tablo         text not null check (tablo in ('teklifler', 'faturalar', 'koliler', 'gorevler', 'modeller', 'fis_defteri', 'mesajlar')),
  id            text not null,
  sira          numeric not null default (extract(epoch from clock_timestamp()) * 1000),
  veri          jsonb not null,
  olusturan     text,
  olusturma     timestamptz not null default now(),
  guncelleme    timestamptz not null default now(),
  goc           boolean not null default false,
  iptal         boolean not null default false,
  iptal_zamani  timestamptz,
  iptal_eden    text,
  primary key (tablo, id)
);
create index if not exists lst_kayit_sira on public.lst_kayit (tablo, sira);

alter table public.stk_ayar add column if not exists liste_aktif boolean not null default false;
alter table public.stk_ayar add column if not exists liste_gecis timestamptz;
alter table public.stk_ayar add column if not exists liste_geri_donus timestamptz;

-- Bir listenin bugünkü belgesi (dizi). Görünümler bunu kullanır; geri dönüş de.
create or replace function public.lst_belge(p_tablo text) returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce((select jsonb_agg(x.veri order by x.sira, x.id) from public.lst_kayit x where x.tablo = p_tablo and not x.iptal),
                  '[]'::jsonb)
$$;

-- Değişiklik sayacı (degisiklik-sayaci.sql): sayaç tablonun ESKİ adıyla artar.
create or replace function public.lst_sayac() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ad text := coalesce(new.tablo, old.tablo);
begin
  if to_regclass('public.degisiklik') is not null then
    update public.degisiklik
       set sayaclar = jsonb_set(coalesce(sayaclar, '{}'::jsonb), array[ad], to_jsonb(coalesce((sayaclar ->> ad)::bigint, 0) + 1), true),
           zaman = now()
     where id = 'tekil';
  end if;
  return null;
end $$;
drop trigger if exists lst_sayac on public.lst_kayit;
create trigger lst_sayac after insert or update or delete on public.lst_kayit for each row execute function public.lst_sayac();

-- LİSTE YAZ — tek kapı (src/038 liste köprüsü). p = { tablo, kayitlar: [{ id, sira?, veri }], iptal: [id] }
--  Tekrara dayanıklı: kimlikle yazılır; iptal edilen kayıt yeniden gelirse açılır. Sıra verilmezse var olanınki korunur,
--  yeni kayıt sona eklenir; var olan kaydın sırası hiç değişmez. Yetki (rls-yazma.sql ile aynı): faturalar → fisler | muhasebe "kaydetme"; ötekiler bugünkü gibi
--  giriş yapmış her kullanıcı.
create or replace function public.lst_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  eposta text := lower(auth.jwt() ->> 'email');
  t text := p ->> 'tablo';
  n_yaz int := 0;
  n_iptal int := 0;
begin
  perform public.v2_yazma_acik('liste');   -- v1.730.1: geri dönüldüyse yazma yok (stok-v2.sql)
  if t is null or t not in ('teklifler', 'faturalar', 'koliler', 'gorevler', 'modeller', 'fis_defteri', 'mesajlar') then
    raise exception 'Liste tanınmıyor: %', coalesce(t, '(yok)') using errcode = '42501';
  end if;
  if t = 'faturalar' then
    perform public.stk_yetki(array['fisler', 'muhasebe'], 'kaydetme');
  end if;
  if exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'kayitlar')) x
             where coalesce(x ->> 'id', '') = '' or jsonb_typeof(x -> 'veri') <> 'object') then
    raise exception 'Liste kaydında kimlik ya da içerik eksik (%)', t using errcode = '22023';
  end if;

  insert into public.lst_kayit as k (tablo, id, sira, veri, olusturan)
  select distinct on (x ->> 'id') t, x ->> 'id',
         coalesce(public.stk_sayi(x ->> 'sira'), (select m.sira from public.lst_kayit m where m.tablo = t and m.id = x ->> 'id'),
                  -- İstemci (038) ms × 1000 ölçeğinde sıra verir; sırasız yeni kayıt da aynı ölçekte sona (v1.730.1).
                  extract(epoch from clock_timestamp()) * 1000000 + e.n),
         x -> 'veri', eposta
  from jsonb_array_elements(public.stk_dizi(p -> 'kayitlar')) with ordinality as e(x, n)
  order by x ->> 'id', e.n desc
  -- Var olan kaydın SIRASI değişmez (iptal edilmiş olan yerine açılır): başka cihazın eklediği kaydı bu cihaz "yeni" sanıp sıra
  -- gönderse de (sohbet yoklaması ekrana ekler, taban bilmeyebilir) liste karışmaz.
  on conflict (tablo, id) do update set veri = excluded.veri, guncelleme = now(),
    iptal = false, iptal_zamani = null, iptal_eden = null
  where (k.veri, k.iptal) is distinct from (excluded.veri, false);
  get diagnostics n_yaz = row_count;

  update public.lst_kayit set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now()
   where tablo = t and id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'iptal'))) and not iptal;
  get diagnostics n_iptal = row_count;

  return jsonb_build_object('tablo', t, 'yaz', n_yaz, 'iptal', n_iptal);
end $$;

create or replace function public.lst_kurulum_tamamla() returns text
language plpgsql security definer set search_path = public as $$
declare
  rapor text := '';
begin
  alter table public.lst_kayit enable row level security;
  drop policy if exists lst_okuma on public.lst_kayit;
  create policy lst_okuma on public.lst_kayit for select to authenticated using (true);
  revoke all on public.lst_kayit from anon, authenticated;
  grant select on public.lst_kayit to authenticated;
  -- Gün sonu raporu (Edge Function, servis rolü) eski adları okur: görünüm lst_belge'yi çağırır.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.lst_kayit to service_role;
    grant execute on function public.lst_belge(text) to service_role;
  end if;
  revoke all on function public.lst_yaz(jsonb) from public, anon;
  grant execute on function public.lst_yaz(jsonb) to authenticated;
  revoke all on function public.lst_belge(text) from public, anon;
  grant execute on function public.lst_belge(text) to authenticated;
  if to_regclass('public.degisiklik') is not null then
    rapor := rapor || 'değişiklik sayacı bağlandı; ';
  end if;
  if to_regprocedure('public.arsive_kopyala_silinen()') is not null then
    drop trigger if exists arsiv_silinen on public.lst_kayit;
    create trigger arsiv_silinen before delete on public.lst_kayit for each row execute function public.arsive_kopyala_silinen();
    rapor := rapor || 'silme arşivi kuruldu; ';
  end if;
  return rapor || 'liste v2 kuruldu';
end $$;
select public.lst_kurulum_tamamla();
drop function public.lst_kurulum_tamamla();

commit;
