create or replace function public.veri_sifirla(p_onay text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t text;
  f text;
  silinen_tablo text[] := '{}';
  silinen_islev text[] := '{}';
  bosaltilan jsonb := '{}'::jsonb;
  n bigint;
  liste text[] := '{}';
  kalan jsonb := '{}'::jsonb;
  v jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Sıfırlama yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if p_onay is distinct from 'SIFIRLA' then
    raise exception 'Onay eksik: select public.veri_sifirla(''SIFIRLA''); — bütün iş verisi silinir, geri alınamaz' using errcode = '22023';
  end if;

  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'eski\_%' order by tablename loop
    execute format('drop table public.%I', t);
    silinen_tablo := silinen_tablo || t;
  end loop;
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace
           where s.nspname = 'public'
             and p.proname in ('stk_geri_don', 'car_geri_don', 'alt_geri_don', 'kas_geri_don', 'lst_geri_don',
                               'stk_goc', 'car_goc', 'kas_goc', 'lst_goc', 'stk_goc_karsilastir', 'stk_geri_yaz',
                               'stk_gecis', 'car_gecis', 'alt_gecis', 'kas_gecis', 'lst_gecis') loop
    execute 'drop function ' || f;
    silinen_islev := silinen_islev || f;
  end loop;

  foreach t in array array['stk_hareket', 'stk_fis', 'stk_varyant', 'stk_renk', 'stk_olcu', 'car_hareket',
                           'kas_hareket', 'kas_cek', 'kas_hesap', 'lst_kayit',
                           'siparis_kalemleri', 'uretim_atamalari', 'stok_rezervasyonlari', 'onaylar', 'cop', 'cek_gorselleri',
                           'urunler', 'cariler', 'siparisler', 'uretim', 'gunluk', 'silinen_arsiv'] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      execute format('select count(*) from public.%I', t) into n;
      bosaltilan := bosaltilan || jsonb_build_object(t, n);
      liste := liste || format('public.%I', t);
    end if;
  end loop;
  if array_length(liste, 1) > 0 then
    execute 'truncate table ' || array_to_string(liste, ', ');
  end if;
  update public.kas_ayar set veri = '{}'::jsonb, guncelleme = now() where id = 'tekil';

  update public.tanimlar
     set veri = jsonb_strip_nulls(jsonb_build_object('kullanicilar', coalesce(veri -> 'kullanicilar', '[]'::jsonb),
                                                     'girisAktifMi', veri -> 'girisAktifMi'))
   where id = 'tekil';

  if to_regclass('public.degisiklik') is not null then
    update public.degisiklik
       set sayaclar = coalesce(sayaclar, '{}'::jsonb)
                      || (select coalesce(jsonb_object_agg(k, to_jsonb(coalesce((sayaclar ->> k)::bigint, 0) + 1)), '{}'::jsonb)
                       from unnest(array['tanimlar', 'urunler', 'cariler', 'siparisler', 'uretim', 'stok_rezervasyonlari',
                                         'onaylar', 'cop', 'stk_varyant', 'stk_hareket', 'car_hareket', 'siparis_kalemleri',
                                         'uretim_atamalari', 'kas_hesap', 'kas_hareket', 'teklifler', 'faturalar', 'koliler',
                                         'gorevler', 'modeller', 'fis_defteri', 'mesajlar']) k),
           zaman = now()
     where id = 'tekil';
  end if;

  for t in select tablename from pg_tables where schemaname = 'public' order by tablename loop
    execute format('select count(*) from public.%I', t) into n;
    if n > 0 then kalan := kalan || jsonb_build_object(t, n); end if;
  end loop;
  select veri into v from public.tanimlar where id = 'tekil';
  return jsonb_build_object('silinenTablolar', to_jsonb(silinen_tablo), 'silinenIslevler', jsonb_array_length(to_jsonb(silinen_islev)),
                            'bosaltilan', bosaltilan, 'kalanKullanici', jsonb_array_length(coalesce(v -> 'kullanicilar', '[]'::jsonb)),
                            'veriKalanTablolar', kalan);
end $$;

revoke all on function public.veri_sifirla(text) from public, anon, authenticated;
