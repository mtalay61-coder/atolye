-- =====================================================================================================================
--  alt-v2.sql — SİPARİŞ KALEMLERİ VE ÜRETİM ATAMALARI İÇİN TEK KAPI (v2, 3. adım) + GEÇİŞ / GERİ DÖNÜŞ
-- =====================================================================================================================
--
--  NEDEN (kullanıcı, 29 Ekim: "Deneme yaptım sorun yok, devam et" — cari v2'den sonra; sıradaki: sipariş ve üretim).
--  Sipariş sevkinde stok çıkışı, cari borcu ve sipariş kaleminin karşılanan miktarı; üretim tesliminde stok, işçilik
--  (cari) ve atamanın tamamlandı işareti AYNI işin parçaları. Stok ve cari tek işlemde gidiyor (fis_yaz); sipariş
--  kalemi ve üretim ataması hâlâ ayrı REST istekleriyle gidiyordu: biri düşerse mal stoktan çıkmış ama sipariş "teslim
--  edilmedi" görünüyordu.
--
--  YAKLAŞIM — veri TAŞINMAZ: stok ve cariden farklı olarak bu iki tablo zaten kimlikli ve tipli satırlar (renk adı /
--  kimlik derdi yok), silinen satırın kopyası da sunucu arşivine düşüyor (silinen-arsiv.sql). Değişen yalnız YAZMA YOLU:
--    · `alt_yaz` — iki tabloya tek kapı: kimlikle ekle/güncelle (tekrara dayanıklı), kimlikle sil (arşive kopyalanır).
--    · `fis_yaz` genişler: { stok, cari, alt } TEK İŞLEMDE.
--    · `alt_gecis()` — ayarı açar ve bu iki tabloya DOĞRUDAN yazmayı uygulamadan alır (eski sürüm yazamaz, hata alır).
--      `alt_geri_don()` — ayarı kapatır, doğrudan yazmayı geri verir. Veri taşınmadığı için ikisi de anlık.
--  Supabase SQL Editor kuralı (editor-icin.py): yalnız düz çift-dolar gövde, iç içe yok, başka yerde dolar işareti yok.
--  Önce stok-v2.sql ve cari-v2.sql kurulmuş olmalı.
-- =====================================================================================================================

begin;

alter table public.stk_ayar add column if not exists alt_aktif boolean not null default false;
alter table public.stk_ayar add column if not exists alt_gecis timestamptz;
alter table public.stk_ayar add column if not exists alt_geri_donus timestamptz;

-- ALT YAZ — p = { "siparis_kalemleri": { satirlar: [satır (bugünkü sütun adlarıyla)], sil: [kimlik] },
--                  "uretim_atamalari":  { … } }
--  Satırlar tablonun KENDİ tipine çevrilir (jsonb_populate_recordset); yalnız istekte geçen sütunlar yazılır (bugünkü
--  REST yazmasıyla aynı: eksik anahtar boş gelir). Aynı kimlik iki kez gelirse sonuncusu. Yetki: tablonun modülü
--  (sipariş / üretim) ya da fiş, stok, cari "kaydetme" — bugün bu tablolara yazma kısıtsızdı (rls-yazma.sql).
create or replace function public.alt_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t text;
  d jsonb;
  satirlar jsonb;
  sutunlar text;
  atamalar text;
  silinecek text[];
  n_yaz int;
  n_sil int;
  sonuc jsonb := '{}'::jsonb;
begin
  for t, d in select key, value from jsonb_each(case when jsonb_typeof(p) = 'object' then p else '{}'::jsonb end) loop
    if t not in ('siparis_kalemleri', 'uretim_atamalari') then
      raise exception 'Bu tablo alt_yaz ile yazılamaz: %', t using errcode = '42501';
    end if;
    perform public.stk_yetki(array[case t when 'siparis_kalemleri' then 'siparis' else 'uretim' end, 'fisler', 'stok', 'cari'], 'kaydetme');
    satirlar := public.stk_dizi(d -> 'satirlar');
    n_yaz := 0;
    n_sil := 0;
    if jsonb_array_length(satirlar) > 0 then
      if exists (select 1 from jsonb_array_elements(satirlar) x where coalesce(x ->> 'id', '') = '') then
        raise exception '% satırında kimlik yok', t using errcode = '22023';
      end if;
      select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position),
             string_agg(case when c.column_name <> 'id' then quote_ident(c.column_name) || ' = excluded.' || quote_ident(c.column_name) end, ', ')
        into sutunlar, atamalar
      from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = t
        and c.column_name in (select distinct jsonb_object_keys(x) from jsonb_array_elements(satirlar) x where jsonb_typeof(x) = 'object');
      execute format(
        'insert into public.%I as h (%s) select %s from (select distinct on (r.id) r.* from jsonb_array_elements(%L::jsonb) with ordinality as e(x, n), '
        || 'jsonb_populate_record(null::public.%I, e.x) r order by r.id, e.n desc) s '
        || 'on conflict (id) do ' || case when atamalar is null then 'nothing' else 'update set ' || atamalar end,
        t, sutunlar, sutunlar, satirlar::text, t);
      get diagnostics n_yaz = row_count;
    end if;
    silinecek := array(select jsonb_array_elements_text(public.stk_dizi(d -> 'sil')));
    if array_length(silinecek, 1) > 0 then
      execute format('delete from public.%I where id::text = any(%L::text[])', t, silinecek);
      get diagnostics n_sil = row_count;
    end if;
    sonuc := sonuc || jsonb_build_object(t, jsonb_build_object('yazilan', n_yaz, 'silinen', n_sil));
  end loop;
  return sonuc;
end $$;

-- FİŞ YAZ — bir işlemin stok, cari, sipariş kalemi / üretim ataması ve kasa satırlarını TEK İŞLEMDE yazar; hepsi isteğe bağlı,
--  biri hata verirse hiçbiri yazılmaz. TAM TANIM ÜÇ DOSYADA AYNI (cari-v2.sql, alt-v2.sql, kasa-v2.sql — v1.730.1): önceden her
--  dosya kendi bildiği parçalarla tanımlıyordu; geçişten sonra cari-v2.sql ya da alt-v2.sql yeniden çalıştırılınca fis_yaz
--  daralıyor, uygulamanın gönderdiği kasa / alt parçası HATASIZ atlanıyor, tahsilatın kasa satırı kayboluyordu (denetim). Artık
--  tanımadığı parça gelirse ya da parçanın işlemi henüz kurulmamışsa hata verir — sessiz kayıp yok.
create or replace function public.fis_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  c jsonb;
  a jsonb;
  k jsonb;
  bilinmeyen text;
begin
  select string_agg(x, ', ') into bilinmeyen from jsonb_object_keys(coalesce(p, '{}'::jsonb)) x where x not in ('stok', 'cari', 'alt', 'kasa');
  if bilinmeyen is not null then
    raise exception 'fis_yaz: tanınmayan parça (%)', bilinmeyen using errcode = '22023';
  end if;
  if jsonb_typeof(p -> 'stok') = 'object' then s := public.stk_yaz(p -> 'stok'); end if;
  if jsonb_typeof(p -> 'cari') = 'object' then c := public.car_yaz(p -> 'cari'); end if;
  if jsonb_typeof(p -> 'alt') = 'object' then a := public.alt_yaz(p -> 'alt'); end if;
  if jsonb_typeof(p -> 'kasa') = 'object' then k := public.kas_yaz(p -> 'kasa'); end if;
  return jsonb_build_object('stok', s, 'cari', c, 'alt', a, 'kasa', k);
end $$;

create or replace function public.alt_gecis() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is not null then
    raise exception 'Geçiş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  revoke insert, update, delete, truncate on public.siparis_kalemleri, public.uretim_atamalari from anon, authenticated;
  update public.stk_ayar set alt_aktif = true, alt_gecis = now() where id = 'tekil';
  return jsonb_build_object('gecis', 'tamam',
    'siparisKalemi', (select count(*) from public.siparis_kalemleri),
    'uretimAtamasi', (select count(*) from public.uretim_atamalari));
end $$;

create or replace function public.alt_geri_don() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is not null then
    raise exception 'Geri dönüş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  grant insert, update, delete on public.siparis_kalemleri, public.uretim_atamalari to authenticated;
  update public.stk_ayar set alt_aktif = false, alt_geri_donus = now() where id = 'tekil';
  return jsonb_build_object('geriDonus', 'tamam');
end $$;

revoke all on function public.alt_yaz(jsonb) from public, anon;
grant execute on function public.alt_yaz(jsonb) to authenticated;
revoke all on function public.fis_yaz(jsonb) from public, anon;
grant execute on function public.fis_yaz(jsonb) to authenticated;
revoke all on function public.alt_gecis() from public, anon, authenticated;
revoke all on function public.alt_geri_don() from public, anon, authenticated;

commit;
