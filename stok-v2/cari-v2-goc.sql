-- =====================================================================================================================
--  cari-v2-goc.sql — CARİ HAREKETLERİNİ v2'YE TAŞIMA, GEÇİŞ VE GERİ DÖNÜŞ (cari-v2.sql'den SONRA)
-- =====================================================================================================================
--
--  GÖÇ (`car_goc`): bugünkü cari_hareketleri'ni OKUR (yazmaz), car_hareket'i baştan kurar, rapor döner. Geçişe kadar
--  tekrar çalıştırılabilir; uygulamadan yeni satır yazıldıktan sonra çalışmaz (p_zorla yalnız bilerek).
--  Değerler METİN olarak taşınır (to_jsonb): uygulamanın bugün okuduğu biçim (tarih "2026-10-01", zaman ISO) aynen kalır.
--  GEÇİŞ (`car_gecis`): göç + `cari_hareketleri` tablosu `eski_cari_hareketleri` olur (silinmez), aynı adla salt-okur
--  görünüm açılır, `stk_ayar.cari_aktif` açılır. Uygulama (v1.727.0+) cari yazmalarını `car_yaz` / `fis_yaz` ile yapar.
--  GERİ DÖNÜŞ (`car_geri_don`): görünüm kalkar, tablo adına döner, içeriği v2'nin o anki hâliyle yenilenir.
--  Kullanım (SQL Editor):  select jsonb_pretty(public.car_gecis());   geri:  select jsonb_pretty(public.car_geri_don());
-- =====================================================================================================================

create or replace function public.car_goc(p_zorla boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n_eski int;
  n_yeni int;
  bozuk jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Göç yalnız Supabase SQL Editor''den çalıştırılır' using errcode = '42501';
  end if;
  if exists (select 1 from public.stk_ayar where cari_aktif) then
    raise exception 'Cari v2 etkin (geçiş yapıldı) — göç yeniden çalıştırılamaz; geri dönmek için car_geri_don()' using errcode = '55000';
  end if;
  if not p_zorla and exists (select 1 from public.car_hareket where not goc) then
    raise exception 'car_hareket''te uygulamadan yazılmış satır var — göç yeniden çalıştırılırsa silinirdi (bilerek: p_zorla => true)'
      using errcode = '55000';
  end if;
  truncate public.car_hareket;
  drop table if exists _ec;
  create temp table _ec on commit drop as select to_jsonb(h) as j from public.cari_hareketleri h;
  select count(*) into n_eski from _ec;
  -- Kimliği ya da carisi olmayan satır taşınamaz (yeni yapıda zorunlu): raporlanır.
  select coalesce(jsonb_agg(j), '[]'::jsonb) into bozuk from _ec where coalesce(j ->> 'id', '') = '' or coalesce(j ->> 'cari_id', '') = '';
  insert into public.car_hareket (id, cari_id, tarih, zaman, yon, tutar, para_birimi, odeme_sekli, vade, defter, fis_no, siparis_no,
                                  uretim_id, urun_ad, renk, aciklama, ek, goc)
  select j ->> 'id', j ->> 'cari_id', j ->> 'tarih', j ->> 'zaman', j ->> 'yon', coalesce(public.stk_sayi(j ->> 'tutar'), 0),
         j ->> 'para_birimi', j ->> 'odeme_sekli', j ->> 'vade', j ->> 'defter', j ->> 'fis_no', j ->> 'siparis_no',
         j ->> 'uretim_id', j ->> 'urun_ad', j ->> 'renk', j ->> 'aciklama',
         case when jsonb_typeof(j -> 'ek') = 'object' then j -> 'ek' else '{}'::jsonb end, true
  from _ec
  where coalesce(j ->> 'id', '') <> '' and coalesce(j ->> 'cari_id', '') <> ''
  on conflict (id) do nothing;
  get diagnostics n_yeni = row_count;
  return jsonb_build_object(
    'eskiHareket', n_eski, 'hareket', n_yeni, 'atlanan', bozuk,
    'cari', (select count(distinct cari_id) from public.car_hareket),
    -- Doğrulama: cari başına tutar toplamı eskiyle aynı mı (yön ve para birimi ayrı)
    'tutarFarki', (
      select coalesce(jsonb_agg(jsonb_build_object('cariId', coalesce(e.cari_id, y.cari_id), 'yon', coalesce(e.yon, y.yon),
                                                   'eski', coalesce(e.t, 0), 'yeni', coalesce(y.t, 0))), '[]'::jsonb)
      from (select j ->> 'cari_id' as cari_id, j ->> 'yon' as yon, sum(coalesce(public.stk_sayi(j ->> 'tutar'), 0)) as t
            from _ec where coalesce(j ->> 'id', '') <> '' and coalesce(j ->> 'cari_id', '') <> '' group by 1, 2) e
      full join (select cari_id, yon, sum(tutar) as t from public.car_hareket group by 1, 2) y
        on y.cari_id = e.cari_id and y.yon is not distinct from e.yon
      where coalesce(e.t, 0) <> coalesce(y.t, 0)));
end $$;

create or replace function public.car_gecis() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  rapor jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Geçiş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if exists (select 1 from public.stk_ayar where cari_aktif) then
    raise exception 'Cari v2 zaten etkin' using errcode = '55000';
  end if;
  if to_regclass('public.eski_cari_hareketleri') is not null then
    raise exception 'eski_cari_hareketleri zaten var — önceki geçiş yarım kalmış olabilir, elle bakın' using errcode = '55000';
  end if;
  rapor := public.car_goc(true);
  alter table public.cari_hareketleri rename to eski_cari_hareketleri;
  create view public.cari_hareketleri with (security_invoker = true) as select * from public.car_eski_hareketler_g;
  revoke all on public.cari_hareketleri from anon, authenticated;
  grant select on public.cari_hareketleri to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.cari_hareketleri to service_role;
  end if;
  update public.stk_ayar set cari_aktif = true, cari_gecis = now() where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('gecis', 'tamam', 'goc', rapor);
end $$;

create or replace function public.car_geri_don() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if auth.jwt() is not null then
    raise exception 'Geri dönüş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if not exists (select 1 from public.stk_ayar where cari_aktif) or to_regclass('public.eski_cari_hareketleri') is null then
    raise exception 'Cari v2 etkin değil — geri dönülecek bir şey yok' using errcode = '55000';
  end if;
  drop table if exists _gd_c;
  create temp table _gd_c on commit drop as select to_jsonb(x) as j from public.car_eski_hareketler_g x;
  drop view public.cari_hareketleri;
  alter table public.eski_cari_hareketleri rename to cari_hareketleri;
  truncate public.cari_hareketleri;
  n := public.stk_geri_yaz('cari_hareketleri', '_gd_c');
  update public.stk_ayar set cari_aktif = false, cari_geri_donus = now() where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('geriDonus', 'tamam', 'hareket', n);
end $$;

revoke all on function public.car_goc(boolean) from public, anon, authenticated;
revoke all on function public.car_gecis() from public, anon, authenticated;
revoke all on function public.car_geri_don() from public, anon, authenticated;
