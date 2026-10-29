-- =====================================================================================================================
--  kasa-v2-goc.sql — KASA & BANKA'YI v2'YE TAŞIMA, GEÇİŞ VE GERİ DÖNÜŞ (kasa-v2.sql'den SONRA)
-- =====================================================================================================================
--
--  GÖÇ (`kas_goc`): muhasebe.veri belgesini OKUR (yazmaz), kas_* tablolarını baştan kurar, rapor döner.
--    · Hesap sırası korunur; hareket ve çek dizideki sırayla (yeniden eskiye) taşınır.
--    · Kimliği olmayan eski hareket / çek / hesap kalıcı bir kimlik alır (belgeye de yazılır: uygulama bundan sonra o
--      kimlikle görür).
--    · Aynı kimlik iki kez geçiyorsa ilki taşınır, ötekiler raporlanır.
--    · Doğrulama: hesap başına bakiye (Giriş + / Çıkış −) eski belgeyle aynı mı.
--  GEÇİŞ (`kas_gecis`): göç + `muhasebe` tablosu `eski_muhasebe` olur (silinmez), aynı adla salt-okur görünüm açılır,
--  `stk_ayar.kasa_aktif` açılır. Uygulama (v1.729.0+) Kasa & Banka'yı `kas_yaz` / `fis_yaz` ile yazar.
--  GERİ DÖNÜŞ (`kas_geri_don`): görünüm kalkar, tablo adına döner, belge v2'nin o anki hâliyle yazılır.
--  Kullanım (SQL Editor):  select jsonb_pretty(public.kas_gecis());   geri:  select jsonb_pretty(public.kas_geri_don());
-- =====================================================================================================================

create or replace function public.kas_goc(p_zorla boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  belge jsonb;
  tur text;
  h jsonb;
  i int;
  hid text;
  x jsonb;
  j int;
  n int;
  m int;
  xid text;
  yinelenen jsonb := '[]'::jsonb;
  n_hesap int := 0;
  n_hareket int := 0;
  n_cek int := 0;
  eski_bakiye jsonb := '{}'::jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Göç yalnız Supabase SQL Editor''den çalıştırılır' using errcode = '42501';
  end if;
  if exists (select 1 from public.stk_ayar where kasa_aktif) then
    raise exception 'Kasa v2 etkin (geçiş yapıldı) — göç yeniden çalıştırılamaz; geri dönmek için kas_geri_don()' using errcode = '55000';
  end if;
  if not p_zorla and (exists (select 1 from public.kas_hareket where not goc) or exists (select 1 from public.kas_cek where not goc)) then
    raise exception 'kas_* tablolarında uygulamadan yazılmış kayıt var — göç yeniden çalıştırılırsa silinirdi (bilerek: p_zorla => true)'
      using errcode = '55000';
  end if;
  select veri into belge from public.muhasebe where id = 'tekil';
  belge := case when jsonb_typeof(belge) = 'object' then belge else '{}'::jsonb end;
  truncate public.kas_hesap, public.kas_hareket, public.kas_cek;
  update public.kas_ayar set veri = belge - 'kasalar' - 'bankalar' - 'cekler', guncelleme = now() where id = 'tekil';

  foreach tur in array array['kasa', 'banka'] loop
    for h, i in select e.v, e.n from jsonb_array_elements(public.stk_dizi(belge -> (case tur when 'kasa' then 'kasalar' else 'bankalar' end)))
                 with ordinality as e(v, n) loop
      continue when jsonb_typeof(h) <> 'object';
      hid := coalesce(nullif(h ->> 'id', ''), 'kh-' || substr(md5(tur || ':' || i::text || ':' || coalesce(h ->> 'ad', '')), 1, 16));
      insert into public.kas_hesap (id, tur, sira, veri, goc) values (hid, tur, i, h - 'hareketler' - 'id', true)
      on conflict (id) do nothing;
      get diagnostics n = row_count;
      if n = 0 then
        yinelenen := yinelenen || jsonb_build_object('tur', 'hesap', 'id', hid);
        continue;
      end if;
      n_hesap := n_hesap + 1;
      eski_bakiye := eski_bakiye || jsonb_build_object(hid, (
        select coalesce(sum(case when y ->> 'yon' = 'Giriş' then coalesce(public.stk_sayi(y ->> 'tutar'), 0)
                                 else -coalesce(public.stk_sayi(y ->> 'tutar'), 0) end), 0)
        from jsonb_array_elements(public.stk_dizi(h -> 'hareketler')) y where jsonb_typeof(y) = 'object'));
      n := jsonb_array_length(public.stk_dizi(h -> 'hareketler'));
      for x, j in select e.v, e.n from jsonb_array_elements(public.stk_dizi(h -> 'hareketler')) with ordinality as e(v, n) loop
        continue when jsonb_typeof(x) <> 'object';
        xid := coalesce(nullif(x ->> 'id', ''), 'mh-' || substr(md5(hid || ':' || j::text || ':' || x::text), 1, 16));
        insert into public.kas_hareket (id, hesap_id, sira, veri, goc)
        values (xid, hid, n - j + 1, x || jsonb_build_object('id', xid), true)
        on conflict (id) do nothing;
        get diagnostics m = row_count;
        if m = 0 then yinelenen := yinelenen || jsonb_build_object('tur', 'hareket', 'id', xid, 'hesap', hid);
        else n_hareket := n_hareket + 1; end if;
      end loop;
    end loop;
  end loop;

  n := jsonb_array_length(public.stk_dizi(belge -> 'cekler'));
  for x, j in select e.v, e.n from jsonb_array_elements(public.stk_dizi(belge -> 'cekler')) with ordinality as e(v, n) loop
    continue when jsonb_typeof(x) <> 'object';
    xid := coalesce(nullif(x ->> 'id', ''), 'cek-' || substr(md5(j::text || ':' || x::text), 1, 16));
    insert into public.kas_cek (id, sira, veri, goc) values (xid, n - j + 1, x || jsonb_build_object('id', xid), true)
    on conflict (id) do nothing;
    get diagnostics m = row_count;
    if m = 0 then yinelenen := yinelenen || jsonb_build_object('tur', 'cek', 'id', xid);
    else n_cek := n_cek + 1; end if;
  end loop;

  return jsonb_build_object(
    'hesap', n_hesap, 'hareket', n_hareket, 'cek', n_cek, 'yinelenen', yinelenen,
    'ayarAnahtarlari', (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from jsonb_object_keys((select veri from public.kas_ayar where id = 'tekil')) k),
    'bakiyeFarki', (
      select coalesce(jsonb_agg(jsonb_build_object('hesapId', b.key, 'eski', b.value, 'yeni', y.bakiye)), '[]'::jsonb)
      from jsonb_each(eski_bakiye) b
      left join (select hesap_id, sum(case when veri ->> 'yon' = 'Giriş' then coalesce(public.stk_sayi(veri ->> 'tutar'), 0)
                                           else -coalesce(public.stk_sayi(veri ->> 'tutar'), 0) end) as bakiye
                 from public.kas_hareket where not iptal group by hesap_id) y on y.hesap_id = b.key
      where (b.value)::numeric is distinct from coalesce(y.bakiye, 0)));
end $$;

create or replace function public.kas_gecis() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  rapor jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Geçiş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if exists (select 1 from public.stk_ayar where kasa_aktif) then
    raise exception 'Kasa v2 zaten etkin' using errcode = '55000';
  end if;
  if to_regclass('public.eski_muhasebe') is not null then
    raise exception 'eski_muhasebe zaten var — önceki geçiş yarım kalmış olabilir, elle bakın' using errcode = '55000';
  end if;
  rapor := public.kas_goc(true);
  alter table public.muhasebe rename to eski_muhasebe;
  create view public.muhasebe with (security_invoker = true) as select * from public.kas_muhasebe_g;
  revoke all on public.muhasebe from anon, authenticated;
  grant select on public.muhasebe to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.muhasebe to service_role;
  end if;
  update public.stk_ayar set kasa_aktif = true, kasa_gecis = now() where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('gecis', 'tamam', 'goc', rapor);
end $$;

create or replace function public.kas_geri_don() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  belge jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Geri dönüş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if not exists (select 1 from public.stk_ayar where kasa_aktif) or to_regclass('public.eski_muhasebe') is null then
    raise exception 'Kasa v2 etkin değil — geri dönülecek bir şey yok' using errcode = '55000';
  end if;
  select veri into belge from public.kas_muhasebe_g;
  drop view public.muhasebe;
  alter table public.eski_muhasebe rename to muhasebe;
  update public.muhasebe set veri = belge where id = 'tekil';
  if not found then insert into public.muhasebe (id, veri) values ('tekil', belge); end if;
  update public.stk_ayar set kasa_aktif = false, kasa_geri_donus = now() where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('geriDonus', 'tamam',
    'hesap', jsonb_array_length(belge -> 'kasalar') + jsonb_array_length(belge -> 'bankalar'),
    'cek', jsonb_array_length(belge -> 'cekler'));
end $$;

revoke all on function public.kas_goc(boolean) from public, anon, authenticated;
revoke all on function public.kas_gecis() from public, anon, authenticated;
revoke all on function public.kas_geri_don() from public, anon, authenticated;
