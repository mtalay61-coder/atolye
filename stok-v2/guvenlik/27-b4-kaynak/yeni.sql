-- B4 / B5 YENİ NESNELER (28 Kasım). 27-b4-uret.py bu dosyayı ve canli-*.sql gövdelerini birleştirir. "-- @@" ifadeleri ayırır.
-- KR030: iş sunucuda teslim alınmış / yok · KR031: teslim + kalan / tamir miktarı verilenle tutmuyor · KR032: adım başka geçerli fişte
-- KR033: bayat geri alma (teslim bu fişle yapılmamış / kalan parça teslimli). İstemci KR kodlarını kalıcı ret sayar (030 kuralReddiOku):
-- "Teslim kaydedilemedi — hiçbir değişiklik yapılmadı (…)", bekleyen defter yeniden denemez.

-- ÜRETİM TESLİMİ DENETİMİ — fis_kes istek tekrarı denetiminden SONRA, ilk yazmadan ÖNCE çağrılır (aynı işlem).
-- NEDEN (inceleme 25, B4 — kanıt test/inceleme/ekran-uretim-b4.js T1–T3, T7, T8): fis_kes atamayı alt_yaz ile KOŞULSUZ yazıyordu; iki cihaz
-- (farklı istek kimlikleri) aynı işi teslim alınca stok, hammadde ve işçilik İKİ KEZ yazıldı; eşzamanlı kısmi teslimde iki "kalan" doğdu.
-- KURAL:
--   1. KİLİT: yükün dokunduğu üretim satırları ve onların BÜTÜN atamaları FOR UPDATE (kimlik sırasıyla) — aynı üretime yazan teslim /
--      iptal işlemleri sıraya girer; ikinci işlem birincinin SONUCUNU görür.
--   2. Teslim alınan (tamamlandi_mi → true) her atama SUNUCUDA var ve "bekliyor" olmalı; zaten teslimliyse KR030 (koşulsuz).
--   3. Beden başına: teslim + bu yükün açtığı kalan parça (ek.kismiKalanKaynak) ≤ verilen; kalan açılıyorsa teslim + kalan = verilen.
--      Tamir parçaları (ek.tamirKaynakAtamaId) ≤ teslimdeki tamir adedi ≤ teslim. Kalan / tamir parçası yalnız kaynağının tesliminde açılır.
--   4. Yükteki adım adları (satırların uretimFisAdi) aynı üretimin başka GEÇERLİ fişinde varsa KR032 — atamasız ara proses fişini de korur.
-- Kapsam dışı: fiş dışı alt_yaz (istemci teslim durumunu fiş dışından yazmıyor); G-25'in işçilik / onay kuralları (ayrı paket).
create or replace function public.b4_teslim_denetle(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_satirlar jsonb := public.stk_dizi(p -> 'alt' -> 'uretim_atamalari' -> 'satirlar');
  v_uretimler text[];
  v_adlar text[];
  v_cakisan text;
  n jsonb;
  e public.uretim_atamalari;
  v_bedenler text[];
  b text;
  v_ver numeric;
  v_tes numeric;
  v_kal numeric;
  v_tam numeric;
  v_tam_sonuc numeric;
  v_kalan_var boolean;
begin
  select coalesce(array_agg(distinct u order by u), '{}'::text[]) into v_uretimler from (
    select p -> 'fis' ->> 'uretimId' as u
    union all select p -> 'bagli' -> 'fis' ->> 'uretimId'
    union all select x ->> 'uretim_id' from jsonb_array_elements(v_satirlar) x
    union all select a.uretim_id from public.uretim_atamalari a where a.id in (select x ->> 'id' from jsonb_array_elements(v_satirlar) x)
  ) q where coalesce(u, '') <> '';
  if cardinality(v_uretimler) = 0 then
    return;
  end if;
  perform 1 from public.uretim u where u.id = any(v_uretimler) order by u.id for update;
  perform 1 from public.uretim_atamalari a where a.uretim_id = any(v_uretimler) order by a.id for update;

  for n in select x from jsonb_array_elements(v_satirlar) x loop
    if not coalesce((n ->> 'tamamlandi_mi')::boolean, false) then
      -- yeni kalan / tamir parçası: kaynağı bu yükte teslim alınıyor olmalı
      if not exists (select 1 from public.uretim_atamalari a where a.id = n ->> 'id')
         and coalesce(n -> 'ek' ->> 'kismiKalanKaynak', n -> 'ek' ->> 'tamirKaynakAtamaId', '') <> ''
         and not exists (select 1 from jsonb_array_elements(v_satirlar) y
                          where y ->> 'id' = coalesce(n -> 'ek' ->> 'kismiKalanKaynak', n -> 'ek' ->> 'tamirKaynakAtamaId')
                            and coalesce((y ->> 'tamamlandi_mi')::boolean, false)) then
        raise exception 'Kalan / tamir parçası yalnız kaynak işin tesliminde açılabilir (atama %) — iş başka cihazda değişmiş olabilir; ekranı yenileyin. Hiçbir şey kaydedilmedi.',
          coalesce(n -> 'ek' ->> 'kismiKalanKaynak', n -> 'ek' ->> 'tamirKaynakAtamaId') using errcode = 'KR031';
      end if;
      continue;
    end if;
    select * into e from public.uretim_atamalari a where a.id = n ->> 'id';
    if not found then
      raise exception 'Teslim alınacak iş sunucuda yok (atama %) — başka cihazda geri alınmış ya da silinmiş olabilir; ekranı yenileyin. Hiçbir şey kaydedilmedi.',
        n ->> 'id' using errcode = 'KR030';
    end if;
    -- Zaten teslimli atama teslim yükünde KOŞULSUZ ret: istemci yalnız DEĞİŞEN atamaları gönderir (fisKesAltFarki), teslimli satırı yeniden
    -- "teslim" diye gönderen yalnız bayat cihazdır — içerik birebir aynı olsa bile (aynı yük iki cihazda; bozma provası BOZMA=ad gösterdi).
    if e.tamamlandi_mi then
      raise exception 'Bu iş başka cihazda zaten teslim alınmış (atama %) — ekranı yenileyin. Hiçbir şey kaydedilmedi.', e.id using errcode = 'KR030';
    end if;
    if (n ->> 'uretim_id') is distinct from e.uretim_id or (n ->> 'proses') is distinct from e.proses then
      raise exception 'Teslim edilen iş başka üretime / prosese ait görünüyor (atama %) — ekranı yenileyin. Hiçbir şey kaydedilmedi.', e.id using errcode = 'KR031';
    end if;
    if (n ->> 'miktar')::numeric > e.miktar then
      raise exception 'Teslim (%) verilen miktarı (%) aşıyor (atama %) — iş başka cihazda değişmiş olabilir; ekranı yenileyin. Hiçbir şey kaydedilmedi.',
        n ->> 'miktar', e.miktar, e.id using errcode = 'KR031';
    end if;
    select exists (select 1 from jsonb_array_elements(v_satirlar) k
                    where k -> 'ek' ->> 'kismiKalanKaynak' = e.id and not exists (select 1 from public.uretim_atamalari x where x.id = k ->> 'id'))
      into v_kalan_var;
    select coalesce(array_agg(distinct z), '{}'::text[]) into v_bedenler from (
      select jsonb_object_keys(case when jsonb_typeof(e.beden_miktarlari) = 'object' then e.beden_miktarlari else '{}'::jsonb end) z
      union select jsonb_object_keys(case when jsonb_typeof(n -> 'beden_miktarlari') = 'object' then n -> 'beden_miktarlari' else '{}'::jsonb end)) w;
    foreach b in array v_bedenler loop
      v_ver := coalesce((e.beden_miktarlari ->> b)::numeric, 0);
      v_tes := coalesce((n -> 'beden_miktarlari' ->> b)::numeric, 0);
      select coalesce(sum((k -> 'beden_miktarlari' ->> b)::numeric), 0) into v_kal from jsonb_array_elements(v_satirlar) k
       where k -> 'ek' ->> 'kismiKalanKaynak' = e.id and not exists (select 1 from public.uretim_atamalari x where x.id = k ->> 'id');
      select coalesce(sum((k -> 'beden_miktarlari' ->> b)::numeric), 0) into v_tam from jsonb_array_elements(v_satirlar) k
       where k -> 'ek' ->> 'tamirKaynakAtamaId' = e.id and not exists (select 1 from public.uretim_atamalari x where x.id = k ->> 'id');
      select coalesce(sum((t ->> 'miktar')::numeric), 0) into v_tam_sonuc from jsonb_array_elements(public.stk_dizi(n -> 'sonuc' -> 'tamir')) t
       where t ->> 'beden' = b;
      if v_tes + v_kal > v_ver or (v_kalan_var and v_tes + v_kal <> v_ver) then
        raise exception 'Teslim + kalan verilen miktarla tutmuyor (atama %, beden %: teslim %, kalan %, verilen %) — iş başka cihazda değişmiş olabilir; ekranı yenileyin. Hiçbir şey kaydedilmedi.',
          e.id, b, v_tes, v_kal, v_ver using errcode = 'KR031';
      end if;
      if v_tam > v_tam_sonuc or v_tam_sonuc > v_tes then
        raise exception 'Tamir parçası teslimdeki tamir adediyle tutmuyor (atama %, beden %: tamir parçası %, tamir %, teslim %). Hiçbir şey kaydedilmedi.',
          e.id, b, v_tam, v_tam_sonuc, v_tes using errcode = 'KR031';
      end if;
    end loop;
  end loop;

  select coalesce(array_agg(distinct a), '{}'::text[]) into v_adlar from (
    select coalesce(s ->> 'uretimFisAdi', s -> 'ek' ->> 'uretimFisAdi') as a from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) s
    union all select coalesce(c ->> 'uretimFisAdi', c -> 'ek' ->> 'uretimFisAdi') from jsonb_array_elements(public.stk_dizi(p -> 'cari' -> 'satirlar')) c
    union all select coalesce(s ->> 'uretimFisAdi', s -> 'ek' ->> 'uretimFisAdi') from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) s
    union all select coalesce(c ->> 'uretimFisAdi', c -> 'ek' ->> 'uretimFisAdi') from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'cari' -> 'satirlar')) c
  ) q where coalesce(a, '') <> '';
  if cardinality(v_adlar) > 0 then
    select string_agg(distinct z.ad || ' (' || z.fis || ')', ', ') into v_cakisan from (
      select h.ek ->> 'uretimFisAdi' as ad, f.id as fis from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id
       where f.uretim_id = any(v_uretimler) and not f.iptal and not h.iptal and h.ek ->> 'uretimFisAdi' = any(v_adlar)
      union all
      select h.ek ->> 'uretimFisAdi', f.id from public.car_hareket h join public.stk_fis f on f.id = h.fis_id
       where f.uretim_id = any(v_uretimler) and not f.iptal and not coalesce(h.iptal, false) and h.ek ->> 'uretimFisAdi' = any(v_adlar)) z;
    if v_cakisan is not null then
      raise exception 'Bu üretim adımı başka bir geçerli fişte zaten kayıtlı: % — başka cihazda teslim alınmış olabilir; ekranı yenileyin. Hiçbir şey kaydedilmedi.',
        v_cakisan using errcode = 'KR032';
    end if;
  end if;
end $$;
-- @@
-- BAYAT GERİ ALMA DENETİMİ — fis_iptal'de, fiş GEÇERLİYKEN (zaten iptal fişte atama farkı hiç yazılmaz) atama farkından önce çağrılır.
-- NEDEN (B5 — kanıt ekran-uretim-b4.js T4): bayat cihaz eski fişi geri alırken atamayı "bekliyor"a döndürüyordu; geçerli yeni teslim
-- (stok, işçilik) duruyordu. KURAL: kilit (teslimle aynı sıra); teslimi geri döndürülen atama bu fişin adımıyla teslim alınmış olmalı
-- (ek.fisNo, fişin satır adları arasında; eski atamada ad yoksa serbest); silinen parça teslim alınmamış olmalı.
create or replace function public.b4_iptal_denetle(p jsonb, p_hedefler text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_satirlar jsonb := public.stk_dizi(p -> 'alt' -> 'uretim_atamalari' -> 'satirlar');
  v_sil jsonb := public.stk_dizi(p -> 'alt' -> 'uretim_atamalari' -> 'sil');
  v_uretimler text[];
  v_adlar text[];
  n jsonb;
  e public.uretim_atamalari;
  v_ad text;
begin
  if jsonb_array_length(v_satirlar) = 0 and jsonb_array_length(v_sil) = 0 then
    return;
  end if;
  select coalesce(array_agg(distinct u order by u), '{}'::text[]) into v_uretimler from (
    select x ->> 'uretim_id' as u from jsonb_array_elements(v_satirlar) x
    union all select a.uretim_id from public.uretim_atamalari a
               where a.id in (select x ->> 'id' from jsonb_array_elements(v_satirlar) x union select jsonb_array_elements_text(v_sil))
    union all select f.uretim_id from public.stk_fis f where f.id = any(p_hedefler)
  ) q where coalesce(u, '') <> '';
  perform 1 from public.uretim u where u.id = any(v_uretimler) order by u.id for update;
  perform 1 from public.uretim_atamalari a where a.uretim_id = any(v_uretimler) order by a.id for update;
  select coalesce(array_agg(distinct a), '{}'::text[]) into v_adlar from (
    select h.ek ->> 'uretimFisAdi' as a from public.stk_hareket h where h.fis_id = any(p_hedefler)
    union all select h.ek ->> 'uretimFisAdi' from public.car_hareket h where h.fis_id = any(p_hedefler)) q where coalesce(a, '') <> '';

  for n in select x from jsonb_array_elements(v_satirlar) x loop
    select * into e from public.uretim_atamalari a where a.id = n ->> 'id';
    if found and e.tamamlandi_mi and not coalesce((n ->> 'tamamlandi_mi')::boolean, false) then
      v_ad := nullif(e.ek ->> 'fisNo', '');
      if v_ad is not null and not (array[v_ad, v_ad || '-İşçilik', v_ad || '-Giriş', v_ad || '-İade', v_ad || '-EkMalzeme'] && v_adlar) then
        raise exception 'Bu teslim geri alınan fişle yapılmamış (atama %, adım %) — iş başka cihazda yeniden teslim alınmış olabilir; ekranı yenileyin. Hiçbir şey değişmedi.',
          e.id, v_ad using errcode = 'KR033';
      end if;
    end if;
  end loop;
  for v_ad in select jsonb_array_elements_text(v_sil) loop
    if exists (select 1 from public.uretim_atamalari a where a.id = v_ad and a.tamamlandi_mi) then
      raise exception 'Kalan / tamir parçası teslim alınmış (atama %) — önce onun teslimini geri alın; ekranı yenileyin. Hiçbir şey değişmedi.', v_ad using errcode = 'KR033';
    end if;
  end loop;
end $$;
-- @@
revoke all on function public.b4_teslim_denetle(jsonb) from public, anon, authenticated;
-- @@
revoke all on function public.b4_iptal_denetle(jsonb, text[]) from public, anon, authenticated;
