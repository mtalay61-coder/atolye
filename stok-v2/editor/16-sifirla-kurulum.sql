drop function if exists public.veri_sifirla(text);

create or replace function public.veri_sifirla(p_onay text, p_ek text[] default '{}') returns jsonb
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
  bagli text[];
  bilinmeyen text[];
  kaldirilan_gorunum text[] := '{}';
  hedef text[];
  dis_bag text[];
begin
  if auth.jwt() is not null then
    raise exception 'Sıfırlama yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if p_onay is distinct from 'SIFIRLA' then
    raise exception 'Onay eksik: select public.veri_sifirla(''SIFIRLA''); — bütün iş verisi silinir, geri alınamaz' using errcode = '22023';
  end if;

  hedef := array(select x from unnest(array['stk_hareket', 'stk_fis', 'stk_varyant', 'stk_renk', 'stk_olcu', 'car_hareket',
                           'kas_hareket', 'kas_cek', 'kas_hesap', 'lst_kayit',
                           'siparis_kalemleri', 'uretim_atamalari', 'stok_rezervasyonlari', 'onaylar', 'cop', 'cek_gorselleri',
                           'urunler', 'cariler', 'siparisler', 'uretim', 'gunluk', 'silinen_arsiv']) x
                 where exists (select 1 from pg_tables where schemaname = 'public' and tablename = x));
  foreach t in array coalesce(p_ek, '{}') loop
    if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      raise exception 'Ek tablo yok: %', t using errcode = '22023';
    end if;
    if t in ('tanimlar', 'stk_ayar', 'kas_ayar', 'degisiklik', 'surum', 'gun_sonu_gonderim') or t like 'site\_%' or t like 'eski\_%' then
      raise exception 'Bu tablo sıfırlamaya verilemez: %', t using errcode = '22023';
    end if;
    if not t = any(hedef) then hedef := hedef || t; end if;
  end loop;

  select coalesce(array_agg(distinct format('%s (%s satır) → %s', r.relname, (xpath('/row/n/text()', query_to_xml(
           format('select count(*) as n from public.%I', r.relname), false, true, '')))[1]::text, h.relname)), '{}')
    into dis_bag
  from pg_constraint k
  join pg_class r on r.oid = k.conrelid
  join pg_class h on h.oid = k.confrelid
  where k.contype = 'f' and h.relnamespace = 'public'::regnamespace and h.relname = any(hedef)
    and not r.relname = any(hedef) and r.relname not like 'eski\_%';
  if array_length(dis_bag, 1) > 0 then
    raise exception 'Boşaltılacak tablolara bağlı başka tablo var, hiçbir şey silinmedi: %. Bunlar da boşaltılsın isterseniz: select jsonb_pretty(public.veri_sifirla(''SIFIRLA'', array[...tablo adları...]));',
      array_to_string(dis_bag, '; ') using errcode = '2BP01';
  end if;

  select coalesce(array_agg(distinct dv.relname::text), '{}') into bagli
  from pg_depend d
  join pg_rewrite r on r.oid = d.objid
  join pg_class dv on dv.oid = r.ev_class
  join pg_class t2 on t2.oid = d.refobjid
  where t2.relnamespace = 'public'::regnamespace and t2.relname like 'eski\_%' and dv.oid <> t2.oid;
  bilinmeyen := array(select x from unnest(bagli) x where x <> 'vitrin_urunler');
  bilinmeyen := bilinmeyen || array(
    select distinct c.conrelid::regclass::text || ' (yabancı anahtar)' from pg_constraint c
    join pg_class t2 on t2.oid = c.confrelid
    where c.contype = 'f' and t2.relnamespace = 'public'::regnamespace and t2.relname like 'eski\_%'
      and (select relname from pg_class where oid = c.conrelid) not like 'eski\_%');
  if array_length(bilinmeyen, 1) > 0 then
    raise exception 'Eski tablolara bağlı bilinmeyen nesne var, hiçbir şey silinmedi: %', array_to_string(bilinmeyen, ', ')
      using errcode = '2BP01';
  end if;
  if 'vitrin_urunler' = any(bagli) then
    drop view public.vitrin_urunler;
    kaldirilan_gorunum := kaldirilan_gorunum || 'vitrin_urunler'::text;
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

  foreach t in array hedef loop
    execute format('select count(*) from public.%I', t) into n;
    bosaltilan := bosaltilan || jsonb_build_object(t, n);
    liste := liste || format('public.%I', t);
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
  return jsonb_build_object('kaldirilanGorunumler', to_jsonb(kaldirilan_gorunum), 'silinenTablolar', to_jsonb(silinen_tablo), 'silinenIslevler', jsonb_array_length(to_jsonb(silinen_islev)),
                            'bosaltilan', bosaltilan, 'kalanKullanici', jsonb_array_length(coalesce(v -> 'kullanicilar', '[]'::jsonb)),
                            'veriKalanTablolar', kalan);
end $$;

revoke all on function public.veri_sifirla(text, text[]) from public, anon, authenticated;
