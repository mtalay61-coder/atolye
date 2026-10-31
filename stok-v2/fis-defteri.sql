-- =====================================================================================================================
--  fis-defteri.sql — TEK FİŞ DEFTERİ (FIS-DEFTERI-PLAN.md, kullanıcı onayı 30 Ekim: "Önerilerin hepsi uygun, başla")
-- =====================================================================================================================
--
--  KURAL (kullanıcı): "Fiş defterinden her işlem geçmesi lazım ve her yerin burayı okuması gerek. Para hareketi de fiş
--  oluştursun. Fatura gibi düşün: mal alıp borçlanıyoruz fatura girişinde, para verip borcumuz azalıyor karşılığında."
--
--  1. Fiş başlığı `stk_fis` (stok v2'den) iki aileye genişler: STOK fişi (mal) ve PARA fişi (makbuz). Genel / Resmi
--     fişin özelliğidir (`defter`). Fişin kalemleri (faturanın satırları) başlıkta (`kalemler`).
--  2. Hareket fişin SATIRIDIR: stok (`stk_hareket`, bağ zaten zorunlu), cari (`car_hareket.fis_id`) ve kasa/banka
--     (`kas_hareket.fis_id`) satırları fişe bağlıdır.
--  3. Tek kapı `fis_kes`: başlık + satırlar (+ bağlı makbuz, + sipariş/üretim satırı güncellemesi) TEK İŞLEMDE. Fiş
--     numarasını SUNUCU verir (önek + yıl-ay-gün + sıra); uygulama her denemeye bir istek kimliği koyar — ağda düşüp yeniden
--     gönderilen fiş ikinci kez yazılmaz, ilk yazılanın numarası döner.
--  4. Fiş silinmez: `fis_iptal` fişi ve bütün satırlarını (bağlı makbuzla birlikte) iptal eder; düzeltme = iptal + yeni fiş.
--  5. KURALLAR VERİTABANINDA (tetikleyiciler): hareket tablolarına yalnız fis_kes / fis_iptal yazar; satır silinmez ve
--     iptal dışında değişmez; fiş başlığı silinmez; satırsız fiş kalmaz (işlem sonunda denetlenir).
--     Kurallar `stk_ayar.fis_aktif` açılınca işler (`fis_kural_ac()`): önce bu dosya kurulur (bugünkü uygulama çalışmaya
--     devam eder), fiş defterli uygulama yayınlanır, sonra kurallar açılır. Açıldıktan sonra eski yoldan (stk_yaz,
--     car_yaz, kas_yaz ile doğrudan hareket) yazan istek REDDEDİLİR — yanlış kayıt yerine hata.
--  Okuma: `fis_listesi` (fiş defteri ekranı, eski defter kaydı biçiminde). Stok, cari ve kasa bakiyesi bugünkü
--  görünümlerden (iptal edilmemiş satırların toplamı).
--  Supabase SQL Editor kuralı (editor-icin.py): yalnız düz çift-dolar gövde, iç içe yok, başka yerde dolar işareti yok.
--  Önce stok-v2.sql, cari-v2.sql, alt-v2.sql, kasa-v2.sql kurulmuş olmalı.
-- =====================================================================================================================

begin;

-- 1) FİŞ BAŞLIĞI genişler
alter table public.stk_fis add column if not exists aile text not null default 'stok';
alter table public.stk_fis add column if not exists onek text;
alter table public.stk_fis add column if not exists istek text;
alter table public.stk_fis add column if not exists defter text;
alter table public.stk_fis add column if not exists kasa_hesap_id text;
alter table public.stk_fis add column if not exists para_birimi text;
alter table public.stk_fis add column if not exists kur numeric;
alter table public.stk_fis add column if not exists tutar numeric;
alter table public.stk_fis add column if not exists kdv numeric;
alter table public.stk_fis add column if not exists kalemler jsonb not null default '[]'::jsonb;
alter table public.stk_fis add column if not exists bagli_fis text;
create unique index if not exists stk_fis_istek on public.stk_fis (istek) where istek is not null;
create index if not exists stk_fis_cari on public.stk_fis (cari_id);

alter table public.stk_ayar add column if not exists fis_aktif boolean not null default false;
alter table public.stk_ayar add column if not exists fis_aktif_zamani timestamptz;

-- 2) SATIR BAĞLARI — varsayılan değer fis_kes'in o an kestiği fiş: car_yaz / kas_yaz değişmeden fişe bağlı satır yazar.
alter table public.car_hareket add column if not exists fis_id text references public.stk_fis(id);
alter table public.car_hareket alter column fis_id set default nullif(current_setting('fis.aktif', true), '');
create index if not exists car_hareket_fis_id on public.car_hareket (fis_id);
alter table public.kas_hareket add column if not exists fis_id text references public.stk_fis(id);
alter table public.kas_hareket alter column fis_id set default nullif(current_setting('fis.aktif', true), '');
create index if not exists kas_hareket_fis_id on public.kas_hareket (fis_id);

-- 3) FİŞ NUMARASI — önek + yıl-ay-gün (İstanbul saati) + günün sırası: AF-261030001. Aynı gün aynı önekle iki cihaz aynı
--    numarayı alamaz (sayaç satırı kilitlenir). 999'dan sonra hane büyür (kesilmez).
create table if not exists public.fis_sayac (
  onek  text not null,
  gun   text not null,
  son   int  not null default 0,
  primary key (onek, gun)
);

create or replace function public.fis_no_al(p_onek text) returns text
language plpgsql security definer set search_path = public as $$
declare
  g text := to_char(now() at time zone 'Europe/Istanbul', 'YYMMDD');
  n int;
begin
  if p_onek is null or length(p_onek) not between 2 and 4 or p_onek <> upper(p_onek) or p_onek ~ '[^A-ZÇĞİÖŞÜ]' then
    raise exception 'Fiş öneki geçersiz: % (2-4 büyük harf)', coalesce(p_onek, '(yok)') using errcode = '22023';
  end if;
  insert into public.fis_sayac as s (onek, gun, son) values (p_onek, g, 1)
  on conflict (onek, gun) do update set son = s.son + 1
  returning son into n;
  return p_onek || '-' || g || case when n < 1000 then lpad(n::text, 3, '0') else n::text end;
end $$;

-- 4) KURALLAR
create or replace function public.fis_kural_aktif() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select fis_aktif from public.stk_ayar where id = 'tekil'), false)
$$;

create or replace function public.fis_kapi_acik() returns boolean
language sql volatile as $$
  select coalesce(current_setting('fis.kapi', true), '') = 'acik'
$$;

-- Hareket satırı (stok, cari, kasa): silinmez; yalnız fiş kesilirken eklenir ve fiş iptal edilirken iptal işaretlenir.
create or replace function public.fis_satir_koru() returns trigger
language plpgsql as $$
declare
  duzen text := coalesce(current_setting('fis.duzen', true), '');
  yeni_j jsonb;
  eski_j jsonb;
begin
  if not public.fis_kural_aktif() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Hareket silinmez — fişi iptal edin (% %)', tg_table_name, old.id using errcode = '42501';
  end if;
  if not public.fis_kapi_acik() then
    raise exception 'Hareket yalnız fiş kesilerek yazılır (% %) — eski yazma yolu kapalı', tg_table_name, new.id using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.fis_id is null then
      raise exception 'Fişsiz hareket yazılamaz (% %)', tg_table_name, new.id using errcode = '23502';
    end if;
    return new;
  end if;
  -- Güncelleme: yalnız iptal alanları değişebilir (ve kayıt zamanı).
  -- DAR DÜZEN KİPLERİ (v1.742.0, kullanıcı kararı 31 Ekim): üç sunucu işlemi satırın YALNIZ belirli alanlarına dokunur; kip
  -- (`fis.duzen`) yalnız o işlemlerin içinde açılır, işlem sonunda kapanır. Miktar, tutar, ürün, tarih hiçbir kipte değişmez.
  --   eski    (fis_eski_iptal): fişe bağlı olmayan eski satır numarasıyla fişine BAĞLANIR (fis_id boştan dolu) — sonra iptal.
  --   bag     (fis_bag_coz): sipariş iptalinde sipariş bağı çözülür — siparis_id / kalem_id / rezervasyon_siparis_id boşalır,
  --           siparis_no "(iptal)" eki alır; cari satırında `ek`ten yalnız siparisId / kalemId / rezervasyonSiparisId düşer.
  --   varyant (stk_renk_tasi): renk kodlamada hedef varyant zaten varsa hareket o varyanta taşınır (renk adı değişir, stok aynı).
  yeni_j := to_jsonb(new) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'guncelleme';
  eski_j := to_jsonb(old) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'guncelleme';
  if yeni_j is distinct from eski_j then
    if duzen = 'eski' and old.fis_id is null and new.fis_id is not null and (yeni_j - 'fis_id') = (eski_j - 'fis_id') then
      return new;
    end if;
    if duzen = 'bag'
       and (yeni_j - 'siparis_id' - 'siparis_no' - 'kalem_id' - 'rezervasyon_siparis_id' - 'ek')
         = (eski_j - 'siparis_id' - 'siparis_no' - 'kalem_id' - 'rezervasyon_siparis_id' - 'ek')
       and ((yeni_j -> 'ek') is not distinct from (eski_j -> 'ek')
         or (yeni_j -> 'ek') is not distinct from ((eski_j -> 'ek') - 'siparisId' - 'kalemId' - 'rezervasyonSiparisId')
         or (yeni_j -> 'ek') is not distinct from ((eski_j -> 'ek') - 'siparisId' - 'kalemId')
         or (yeni_j -> 'ek') is not distinct from ((eski_j -> 'ek') - 'rezervasyonSiparisId')) then
      return new;
    end if;
    if duzen = 'varyant' and tg_table_name = 'stk_hareket' and (yeni_j - 'varyant_id') = (eski_j - 'varyant_id') then
      return new;
    end if;
    raise exception 'Hareket değiştirilemez — fişi iptal edip yeniden kesin (% %)', tg_table_name, new.id using errcode = '42501';
  end if;
  if old.iptal and not new.iptal then
    raise exception 'İptal edilmiş hareket geri açılamaz — yeni fiş kesin (% %)', tg_table_name, new.id using errcode = '42501';
  end if;
  return new;
end $$;

-- Fiş başlığı: silinmez; yalnız fis_kes / fis_iptal / fis_bilgi yazar; tutar ve satır bilgisi kesildikten sonra değişmez.
create or replace function public.fis_baslik_koru() returns trigger
language plpgsql as $$
begin
  if not public.fis_kural_aktif() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Fiş silinmez — iptal edin (%)', old.id using errcode = '42501';
  end if;
  if not public.fis_kapi_acik() then
    raise exception 'Fiş yalnız fis_kes ile kesilir (%) — eski yazma yolu kapalı', new.id using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'iptal_sebebi' - 'aciklama' - 'ek' - 'bagli_fis')
       is distinct from (to_jsonb(old) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'iptal_sebebi' - 'aciklama' - 'ek' - 'bagli_fis') then
      raise exception 'Kesilmiş fiş değiştirilemez — iptal edip yeniden kesin (%)', new.id using errcode = '42501';
    end if;
    if old.iptal and not new.iptal then
      raise exception 'İptal edilmiş fiş geri açılamaz — yeni fiş kesin (%)', new.id using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Satırsız fiş kalmaz: işlem sonunda (ertelenmiş) denetlenir.
create or replace function public.fis_satirsiz_denetle() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f public.stk_fis;
begin
  if not public.fis_kural_aktif() then return null; end if;
  select * into f from public.stk_fis where id = new.id;
  if not found then return null; end if;
  if f.aile = 'stok' and not exists (select 1 from public.stk_hareket where fis_id = f.id) then
    raise exception 'Stok fişi % satırsız kalamaz — en az bir stok hareketi gerekli', f.id using errcode = '23514';
  end if;
  if f.aile = 'para' and not exists (select 1 from public.car_hareket where fis_id = f.id)
                     and not exists (select 1 from public.kas_hareket where fis_id = f.id) then
    raise exception 'Para fişi % satırsız kalamaz — en az bir cari ya da kasa hareketi gerekli', f.id using errcode = '23514';
  end if;
  return null;
end $$;

-- 5) FİŞ KES — tek fiş (iç işlev; dışarıdan fis_kes çağrılır)
--  f = { aile, tur, onek, kaynak, defter, tarih, cariId, kasaHesapId, siparisId, siparisNo, uretimId, paraBirimi, kur, tutar,
--        kdv, aciklama, kullanici, kalemler, ek }
--  stok = { satirlar: [stk_yaz satırı — fisId sunucu koyar], varyantAc: [...] }
--  cari = { satirlar: [car_yaz satırı — fis_no / fis_id sunucu koyar] }
--  kasa = { hareketler: [kas_yaz hareketi — veri.fisNo sunucu koyar], cekler: [...] }
drop function if exists public.fis_tek_kes(jsonb, jsonb, jsonb, jsonb, text);

-- NUMARA YER TUTUCUSU: uygulama numarayı bilmeden açıklama yazar ("Alış fişi · «FIS»", peşin makbuzda "Ödeme · «ANAFIS»");
-- sunucu numarayı verince bütün metinde değiştirir. Uygulama aynı değişikliği kendi kopyasında yapar.
create or replace function public.fis_yer_tutucu(j jsonb, p_fis text, p_ana text) returns jsonb
language sql immutable as $$
  select case when j is null then null
              else replace(replace(j::text, '«ANAFIS»', coalesce(p_ana, p_fis)), '«FIS»', p_fis)::jsonb end
$$;

create or replace function public.fis_tek_kes(f jsonb, p_stok jsonb, p_cari jsonb, p_kasa jsonb, p_istek text, p_ana text default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  aile text := coalesce(nullif(f ->> 'aile', ''), '');
  fid text;
begin
  if aile not in ('stok', 'para') then
    raise exception 'Fiş ailesi stok ya da para olmalı (%)', aile using errcode = '22023';
  end if;
  if coalesce(f ->> 'tur', '') = '' then
    raise exception 'Fiş türü yok' using errcode = '22023';
  end if;
  fid := public.fis_no_al(f ->> 'onek');
  f := public.fis_yer_tutucu(f, fid, p_ana);
  p_stok := public.fis_yer_tutucu(p_stok, fid, p_ana);
  p_cari := public.fis_yer_tutucu(p_cari, fid, p_ana);
  p_kasa := public.fis_yer_tutucu(p_kasa, fid, p_ana);
  perform set_config('fis.kapi', 'acik', true);
  perform set_config('fis.aktif', fid, true);
  insert into public.stk_fis (id, aile, onek, istek, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, aciklama,
                              kullanici, olusturan, ek, defter, kasa_hesap_id, para_birimi, kur, tutar, kdv, kalemler)
  values (fid, aile, f ->> 'onek', p_istek, f ->> 'tur', f ->> 'kaynak', coalesce(public.stk_zaman(f ->> 'tarih'), now()),
          nullif(f ->> 'cariId', ''), nullif(f ->> 'siparisId', ''), nullif(f ->> 'siparisNo', ''), nullif(f ->> 'uretimId', ''),
          f ->> 'aciklama', f ->> 'kullanici', lower(auth.jwt() ->> 'email'),
          case when jsonb_typeof(f -> 'ek') = 'object' then f -> 'ek' else '{}'::jsonb end,
          coalesce(nullif(f ->> 'defter', ''), 'Genel'), nullif(f ->> 'kasaHesapId', ''), nullif(f ->> 'paraBirimi', ''),
          public.stk_sayi(f ->> 'kur'), public.stk_sayi(f ->> 'tutar'), public.stk_sayi(f ->> 'kdv'),
          case when jsonb_typeof(f -> 'kalemler') = 'array' then f -> 'kalemler' else '[]'::jsonb end);

  if jsonb_array_length(public.stk_dizi(p_stok -> 'satirlar')) > 0 or jsonb_array_length(public.stk_dizi(p_stok -> 'varyantAc')) > 0 then
    perform public.stk_yaz(jsonb_build_object(
      'varyantAc', public.stk_dizi(p_stok -> 'varyantAc'),
      'satirlar', (select coalesce(jsonb_agg(x || jsonb_build_object('fisId', fid)), '[]'::jsonb)
                   from jsonb_array_elements(public.stk_dizi(p_stok -> 'satirlar')) x)));
  end if;
  if jsonb_array_length(public.stk_dizi(p_cari -> 'satirlar')) > 0 then
    perform public.car_yaz(jsonb_build_object(
      'satirlar', (select coalesce(jsonb_agg(x || jsonb_build_object('fis_no', fid)), '[]'::jsonb)
                   from jsonb_array_elements(public.stk_dizi(p_cari -> 'satirlar')) x)));
  end if;
  if jsonb_array_length(public.stk_dizi(p_kasa -> 'hareketler')) > 0 or jsonb_array_length(public.stk_dizi(p_kasa -> 'cekler')) > 0 then
    perform public.kas_yaz(jsonb_build_object(
      'hareketler', (select coalesce(jsonb_agg(x || jsonb_build_object('veri', coalesce(x -> 'veri', '{}'::jsonb) || jsonb_build_object('fisNo', fid))), '[]'::jsonb)
                     from jsonb_array_elements(public.stk_dizi(p_kasa -> 'hareketler')) x),
      'cekler', public.stk_dizi(p_kasa -> 'cekler')));
  end if;

  -- Ailenin satırı hemen denetlenir (işlem sonundaki ertelenmiş denetim de var): hata fişin numarasıyla döner.
  if aile = 'stok' and not exists (select 1 from public.stk_hareket where fis_id = fid) then
    raise exception 'Stok fişinde stok satırı yok (%)', f ->> 'tur' using errcode = '23514';
  end if;
  if aile = 'para' and not exists (select 1 from public.car_hareket where fis_id = fid)
                   and not exists (select 1 from public.kas_hareket where fis_id = fid) then
    raise exception 'Para fişinde cari ya da kasa satırı yok (%)', f ->> 'tur' using errcode = '23514';
  end if;
  perform set_config('fis.aktif', '', true);
  return fid;
end $$;

-- FİŞ KES — tek kapı (uygulama). p = { istek, fis, stok, cari, kasa, bagli: { fis, stok, cari, kasa }, alt }
--  `bagli`: aynı işlemin öteki ailesi (peşin satışın tahsilat makbuzu, peşin alışın ödeme makbuzu) — iki fiş birbirine bağlı,
--  biri iptal edilince öteki de. `alt`: sipariş kalemi karşılanan / üretim ataması (alt_yaz) — aynı işlemde.
--  Dönüş: { fisNo, bagliFisNo, zatenVar } — aynı istek ikinci kez gelirse yazmaz, ilk numaraları döner.
create or replace function public.fis_kes(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_istek text := nullif(btrim(coalesce(p ->> 'istek', '')), '');
  mevcut public.stk_fis;
  fid text;
  bid text;
begin
  if v_istek is null then
    raise exception 'İstek kimliği yok (yeniden gönderimde çift fiş olmasın diye zorunlu)' using errcode = '22023';
  end if;
  if jsonb_typeof(p -> 'fis') <> 'object' then
    raise exception 'Fiş bilgisi yok' using errcode = '22023';
  end if;
  select * into mevcut from public.stk_fis f where f.istek = v_istek;
  if found then
    return jsonb_build_object('fisNo', mevcut.id, 'bagliFisNo', mevcut.bagli_fis, 'zatenVar', true);
  end if;

  fid := public.fis_tek_kes(p -> 'fis', p -> 'stok', p -> 'cari', p -> 'kasa', v_istek);
  if jsonb_typeof(p -> 'bagli') = 'object' then
    bid := public.fis_tek_kes(p -> 'bagli' -> 'fis', p -> 'bagli' -> 'stok', p -> 'bagli' -> 'cari', p -> 'bagli' -> 'kasa', v_istek || ':bagli', fid);
    update public.stk_fis set bagli_fis = bid where id = fid;
    update public.stk_fis set bagli_fis = fid where id = bid;
  end if;
  if jsonb_typeof(p -> 'alt') = 'object' then
    perform public.alt_yaz(p -> 'alt');
  end if;
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', fid, 'bagliFisNo', bid, 'zatenVar', false);
end $$;

-- FİŞ İPTAL — fiş ve bütün satırları (bağlı makbuzla birlikte) iptal; silme yok. Tekrar çağrı zararsız.
--  p = { no, sebep, alt } — `alt`: geri alınan sipariş karşılananı / üretim ataması, aynı işlemde.
create or replace function public.fis_iptal(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  no text := nullif(btrim(coalesce(p ->> 'no', '')), '');
  eposta text := lower(auth.jwt() ->> 'email');
  f public.stk_fis;
  hedefler text[];
  h text;
  n int := 0;
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'silme');
  select * into f from public.stk_fis where id = no for update;
  if not found then
    raise exception 'Fiş bulunamadı: %', coalesce(no, '(yok)') using errcode = 'P0002';
  end if;
  hedefler := array[f.id] || case when f.bagli_fis is not null then array[f.bagli_fis] else '{}'::text[] end;
  perform set_config('fis.kapi', 'acik', true);
  foreach h in array hedefler loop
    update public.stk_fis set iptal = true, iptal_zamani = now(), iptal_eden = eposta, iptal_sebebi = p ->> 'sebep'
     where id = h and not iptal;
    get diagnostics n = row_count;
    update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta where fis_id = h and not iptal;
    update public.car_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now() where fis_id = h and not iptal;
    update public.kas_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now() where fis_id = h and not iptal;
  end loop;
  if jsonb_typeof(p -> 'alt') = 'object' then
    perform public.alt_yaz(p -> 'alt');
  end if;
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', f.id, 'bagliFisNo', f.bagli_fis, 'zatenIptal', f.iptal);
end $$;

-- FİŞ BİLGİSİ — kesilmiş fişe yalnız açıklama ve ek bilgi (irsaliye no gibi); tutar ve satırlar değişmez.
create or replace function public.fis_bilgi(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  no text := nullif(btrim(coalesce(p ->> 'no', '')), '');
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'kaydetme');
  if not exists (select 1 from public.stk_fis where id = no) then
    raise exception 'Fiş bulunamadı: %', coalesce(no, '(yok)') using errcode = 'P0002';
  end if;
  perform set_config('fis.kapi', 'acik', true);
  update public.stk_fis
     set aciklama = case when p ? 'aciklama' then p ->> 'aciklama' else aciklama end,
         ek = ek || case when jsonb_typeof(p -> 'ek') = 'object' then p -> 'ek' else '{}'::jsonb end
   where id = no;
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', no);
end $$;

-- ESKİ FİŞ İPTALİ (v1.742.0, kullanıcı kararı 31 Ekim: "Fiş iptaline bağla"). Fiş defterinden ÖNCE yazılmış fiş: stok satırları
-- kendi başlığına (stk_fis — stok v2 her harekete fiş açıyordu) bağlı, cari / kasa satırlarında fis_id BOŞ (numara yalnız
-- fis_no / veri.fisNo'da). Kurallar açıkken bu satırlar köprüyle iptal edilemez. Bu işlem: başlık yoksa açar (aile: para,
-- tür "Eski fiş"), fişsiz satırları NUMARASIYLA o başlığa bağlar ve fis_iptal ile hepsini birlikte iptal eder — yeni fişlerle
-- aynı kural (silinmez, iz kalır). Sunucu fişi gelirse de çalışır (bağlanacak satırı yoktur, düz fis_iptal).
-- p = { no, sebep, alt }
create or replace function public.fis_eski_iptal(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  no text := nullif(btrim(coalesce(p ->> 'no', '')), '');
  baslik_var boolean;
  cari_var boolean;
  kasa_var boolean;
  bagli int := 0;
  n int;
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'silme');
  if no is null then raise exception 'Fiş numarası yok' using errcode = '22023'; end if;
  baslik_var := exists (select 1 from public.stk_fis where id = no);
  cari_var := exists (select 1 from public.car_hareket where fis_id is null and fis_no = no);
  kasa_var := exists (select 1 from public.kas_hareket where fis_id is null and veri ->> 'fisNo' = no);
  if not baslik_var and not cari_var and not kasa_var then
    raise exception 'Fiş bulunamadı: %', no using errcode = 'P0002';
  end if;
  perform set_config('fis.kapi', 'acik', true);
  if not baslik_var then
    insert into public.stk_fis (id, aile, tur, kaynak, tarih, aciklama, ek)
    values (no, 'para', 'Eski fiş', 'Eski kayıt', now(), 'Fiş defterinden önce yazılmış satırlar — iptal için bağlandı',
            jsonb_build_object('eski', true));
  end if;
  perform set_config('fis.duzen', 'eski', true);
  update public.car_hareket set fis_id = no where fis_id is null and fis_no = no;
  get diagnostics n = row_count; bagli := bagli + n;
  update public.kas_hareket set fis_id = no where fis_id is null and veri ->> 'fisNo' = no;
  get diagnostics n = row_count; bagli := bagli + n;
  perform set_config('fis.duzen', '', true);
  perform set_config('fis.kapi', '', true);
  return public.fis_iptal(p) || jsonb_build_object('eski', not baslik_var or bagli > 0, 'bagliSatir', bagli);
end $$;

-- SİPARİŞ BAĞINI ÇÖZ (v1.742.0, kullanıcı kararı 31 Ekim: "Yalnız bağ alanları sunucuda"). Sipariş iptalinde (087 siparisKapat,
-- 088 siparisBaglariniCoz) fişler silinmez, bağımsız kalır: satırın sipariş bağı çözülür — miktar / tutar / ürün DEĞİŞMEZ. Satır
-- eşleşmesi uygulamayla aynı (088 siparisHareketiMi): kimlikli satırda kimlik, kimliksiz eskide numara. Değerleri istemci
-- VERMEZ, sunucu hesaplar ("(iptal)" eki, düşen anahtarlar) — bu işlemle başka alan değiştirilemez. Fiş başlığına not düşer.
-- p = { siparisId, siparisNo }
create or replace function public.fis_bag_coz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  sid text := nullif(btrim(coalesce(p ->> 'siparisId', '')), '');
  sno text := nullif(btrim(coalesce(p ->> 'siparisNo', '')), '');
  ino text;
  n_stok int := 0;
  n_cari int := 0;
  n_zincir int := 0;
  n int;
begin
  perform public.stk_yetki(array['siparis', 'stok', 'cari'], 'kaydetme');
  if sid is null then raise exception 'Sipariş kimliği yok' using errcode = '22023'; end if;
  ino := case when sno is null then null else sno || ' (iptal)' end;
  perform set_config('fis.kapi', 'acik', true);
  perform set_config('fis.duzen', 'bag', true);
  update public.stk_hareket set siparis_id = null, kalem_id = null, siparis_no = ino
   where not iptal and (siparis_id = sid or (siparis_id is null and sno is not null and siparis_no = sno));
  get diagnostics n_stok = row_count;
  update public.stk_hareket set rezervasyon_siparis_id = null where not iptal and rezervasyon_siparis_id = sid;
  get diagnostics n_zincir = row_count;
  update public.car_hareket set siparis_no = ino, ek = ek - 'siparisId' - 'kalemId', guncelleme = now()
   where not iptal and ((ek ->> 'siparisId') = sid or ((ek ->> 'siparisId') is null and sno is not null and siparis_no = sno));
  get diagnostics n_cari = row_count;
  update public.car_hareket set ek = ek - 'rezervasyonSiparisId', guncelleme = now()
   where not iptal and (ek ->> 'rezervasyonSiparisId') = sid;
  get diagnostics n = row_count; n_zincir := n_zincir + n;
  update public.stk_fis set ek = ek || jsonb_build_object('siparisIptal', jsonb_build_object('no', sno, 'zaman', now()))
   where siparis_id = sid or (siparis_id is null and sno is not null and siparis_no = sno);
  perform set_config('fis.duzen', '', true);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('stok', n_stok, 'cari', n_cari, 'zincir', n_zincir);
end $$;

-- RENK TAŞI (v1.742.0, kullanıcı kararı 31 Ekim: "Varyant düzeyinde"). Tanımlar › Bakım › Kodsuz Mamul Renkleri ("Siyah" →
-- "1003 - Siyah"): satırın rengi tek tek değişmez — VARYANTIN rengi değişir, hareketler aynı varyanta bağlı kalır (stok, geçmiş,
-- fişler aynen). Hedef varyant zaten varsa (aynı ürün, yeni renk, aynı ölçü) hareketler ona taşınır ve eski varyant kalkar
-- (stk_serbest_birlestir ile aynı yol). Yeni renk Tanımlar'a henüz varmadıysa serbest renk açılır, Tanımlar gelince birleşir.
-- p = { eslesmeler: [{ urunId, eski, yeni }] }
create or replace function public.stk_renk_tasi(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e jsonb;
  v record;
  hedef_renk text;
  hedef_v text;
  n_varyant int := 0;
  n_tasinan int := 0;
  n int;
begin
  perform public.stk_yetki(array['stok', 'tanimlar'], 'kaydetme');
  perform set_config('fis.kapi', 'acik', true);
  perform set_config('fis.duzen', 'varyant', true);
  for e in select * from jsonb_array_elements(public.stk_dizi(p -> 'eslesmeler')) loop
    continue when coalesce(e ->> 'urunId', '') = '' or coalesce(e ->> 'yeni', '') = ''
                  or public.stk_nrm(e ->> 'eski') = public.stk_nrm(e ->> 'yeni');
    hedef_renk := public.stk_renk_coz(null, e ->> 'yeni');
    for v in select sv.* from public.stk_varyant sv join public.stk_renk r on r.id = sv.renk_id
              where sv.urun_id = e ->> 'urunId' and public.stk_nrm(r.ad) = public.stk_nrm(e ->> 'eski') and sv.renk_id <> hedef_renk loop
      select id into hedef_v from public.stk_varyant
       where urun_id = v.urun_id and renk_id = hedef_renk and coalesce(olcu_id, '') = coalesce(v.olcu_id, '');
      if hedef_v is null then
        update public.stk_varyant set renk_id = hedef_renk where id = v.id;
      else
        update public.stk_hareket set varyant_id = hedef_v where varyant_id = v.id;
        get diagnostics n = row_count; n_tasinan := n_tasinan + n;
        update public.stk_varyant set min_stok = greatest(min_stok, v.min_stok), aktif = aktif or v.aktif where id = hedef_v;
        delete from public.stk_varyant where id = v.id;
      end if;
      n_varyant := n_varyant + 1;
    end loop;
  end loop;
  perform set_config('fis.duzen', '', true);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('varyant', n_varyant, 'tasinanHareket', n_tasinan);
end $$;

-- 6) FİŞ DEFTERİ OKUMASI — her fiş bir satır, eski defter kaydı biçiminde (uygulama ekranları bu biçimi okuyor).
create or replace view public.fis_listesi with (security_invoker = true) as
select f.id, f.olusturma, f.iptal,
  jsonb_build_object(
    'id', f.id, 'fisNo', f.id, 'aile', f.aile, 'tip', f.tur, 'kaynak', f.kaynak, 'onek', f.onek,
    'cariId', f.cari_id, 'siparisId', f.siparis_id, 'siparisNo', f.siparis_no, 'uretimId', f.uretim_id,
    'zaman', f.olusturma, 'tarih', f.tarih, 'defter', f.defter, 'kullanici', f.kullanici, 'olusturan', f.olusturan,
    'kasaHesapId', f.kasa_hesap_id, 'paraBirimi', f.para_birimi, 'kur', f.kur, 'tutar', f.tutar, 'kdv', f.kdv,
    'aciklama', f.aciklama, 'ek', f.ek, 'kalemler', f.kalemler, 'bagliFis', f.bagli_fis,
    'iptal', f.iptal, 'iptalZamani', f.iptal_zamani, 'iptalEden', f.iptal_eden, 'iptalSebebi', f.iptal_sebebi,
    'stokHareketleri', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'urunId', h.urun_id, 'varyantId', h.varyant_id,
        'renk', coalesce(r.ad, 'Standart'), 'beden', coalesce(o.ad, 'Standart'),
        'miktar', h.miktar, 'kaynak', h.kaynak, 'tarih', h.tarih, 'siparisId', h.siparis_id, 'kalemId', h.kalem_id,
        'cariId', h.cari_id, 'uretimId', h.uretim_id, 'iptal', h.iptal, 'ek', h.ek) order by h.id)
      from public.stk_hareket h
      join public.stk_varyant v on v.id = h.varyant_id
      left join public.stk_renk r on r.id = v.renk_id
      left join public.stk_olcu o on o.id = v.olcu_id
      where h.fis_id = f.id), '[]'::jsonb),
    'cariHareketleri', coalesce((select jsonb_agg(to_jsonb(c) - 'olusturan' - 'goc' order by c.id)
      from public.car_hareket c where c.fis_id = f.id), '[]'::jsonb),
    'kasaHareketleri', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'hesapId', k.hesap_id, 'iptal', k.iptal) || k.veri order by k.id)
      from public.kas_hareket k where k.fis_id = f.id), '[]'::jsonb)
  ) as veri
from public.stk_fis f;

-- 7) KURULUM (geçici işlev: Editor do-bloğunu bölüyor)
create or replace function public.fis_kurulum_tamamla() returns text
language plpgsql security definer set search_path = public as $$
declare
  t text;
begin
  -- Tetikleyiciler
  drop trigger if exists fis_satir_koru on public.stk_hareket;
  create trigger fis_satir_koru before insert or update or delete on public.stk_hareket for each row execute function public.fis_satir_koru();
  drop trigger if exists fis_satir_koru on public.car_hareket;
  create trigger fis_satir_koru before insert or update or delete on public.car_hareket for each row execute function public.fis_satir_koru();
  drop trigger if exists fis_satir_koru on public.kas_hareket;
  create trigger fis_satir_koru before insert or update or delete on public.kas_hareket for each row execute function public.fis_satir_koru();
  drop trigger if exists fis_baslik_koru on public.stk_fis;
  create trigger fis_baslik_koru before insert or update or delete on public.stk_fis for each row execute function public.fis_baslik_koru();
  drop trigger if exists fis_satirsiz_denetle on public.stk_fis;
  create constraint trigger fis_satirsiz_denetle after insert on public.stk_fis deferrable initially deferred
    for each row execute function public.fis_satirsiz_denetle();
  -- Fişsiz cari / kasa satırı: kurallar açıkken tetikleyici reddediyor; kural açılmadan yazılmış eski satırlar (fis_id boş)
  -- denetimde görünür (gece denetimi).

  -- Yetki: sayaç ve numara yalnız işlemlerden
  alter table public.fis_sayac enable row level security;
  revoke all on public.fis_sayac from anon, authenticated;
  revoke all on function public.fis_no_al(text) from public, anon, authenticated;
  revoke all on function public.fis_tek_kes(jsonb, jsonb, jsonb, jsonb, text, text) from public, anon, authenticated;
  foreach t in array array['fis_kes(jsonb)', 'fis_iptal(jsonb)', 'fis_bilgi(jsonb)', 'fis_eski_iptal(jsonb)', 'fis_bag_coz(jsonb)', 'stk_renk_tasi(jsonb)'] loop
    execute 'revoke all on function public.' || t || ' from public, anon';
    execute 'grant execute on function public.' || t || ' to authenticated';
  end loop;
  revoke all on public.fis_listesi from anon, authenticated;
  grant select on public.fis_listesi to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.fis_listesi to service_role;
  end if;
  return 'fiş defteri kuruldu (kurallar KAPALI — bütün işlemler fiş defterine taşınana kadar AÇMAYIN; açma adımı ayrıca verilecek)';
end $$;
select public.fis_kurulum_tamamla();
drop function public.fis_kurulum_tamamla();

-- KURALLARI AÇ / KAPAT (yalnız SQL Editor'den)
create or replace function public.fis_kural_ac() returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is not null then
    raise exception 'Yalnız Supabase SQL Editor''den' using errcode = '42501';
  end if;
  update public.stk_ayar set fis_aktif = true, fis_aktif_zamani = now() where id = 'tekil';
  return 'fiş defteri kuralları AÇIK: hareket yalnız fiş kesilerek yazılır';
end $$;
create or replace function public.fis_kural_kapat() returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is not null then
    raise exception 'Yalnız Supabase SQL Editor''den' using errcode = '42501';
  end if;
  update public.stk_ayar set fis_aktif = false where id = 'tekil';
  return 'fiş defteri kuralları KAPALI';
end $$;
revoke all on function public.fis_kural_ac() from public, anon, authenticated;
revoke all on function public.fis_kural_kapat() from public, anon, authenticated;

commit;
