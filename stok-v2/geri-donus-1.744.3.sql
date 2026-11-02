-- Yalnız 1.744.3 geliştirme düzeltmelerini önceki F8 sürümüne döndürür.
-- Canlıda ayrıca açık onay gerekir. Çek audit/istemci izleri SİLİNMEZ.
begin;
update public.stk_ayar set min_istemci_surum=null,siparis_durum_sunucu=false where id='tekil';
create or replace function public.test_geri_kapi() returns void language plpgsql as $$
declare t text;
begin
 for t in select tablename from pg_tables where schemaname='public' loop
  execute format('drop trigger if exists stk_istemci_koru on public.%I',t);
  execute format('drop trigger if exists siparis_canli_bag_koru on public.%I',t);
 end loop;
end $$;
select public.test_geri_kapi();
drop function public.test_geri_kapi();
drop view if exists public.siparisler_okuma;
drop function if exists public.siparis_durum_hesap(text,text);
drop function if exists public.stk_istemci_koru();
drop function if exists public.siparis_canli_bag_koru();
drop function if exists public.fis_iptal_toplu(jsonb);
create or replace function public.fis_kural_aktif() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select fis_aktif from public.stk_ayar where id = 'tekil'), false)
$$;

create or replace function public.fis_satir_koru() returns trigger
language plpgsql as $$
declare
  duzen text := coalesce(current_setting('fis.duzen', true), '');
  yeni_j jsonb;
  eski_j jsonb;
  korunan boolean := false;
begin
  -- F8: fis_kes ile kesilmiş fişin geçmişi, geçiş anahtarı kapalıyken de değişmez.
  -- Eski VE yeni bağ denetlenir: hareketi başka fişe taşıyarak koruma aşılamaz.
  if not public.fis_kural_aktif() then
    if tg_op <> 'INSERT' then
      select exists(select 1 from public.stk_fis where id=old.fis_id and istek is not null) into korunan;
    end if;
    if tg_op <> 'DELETE' and not korunan then
      select exists(select 1 from public.stk_fis where id=new.fis_id and istek is not null) into korunan;
    end if;
    if not korunan then return case when tg_op = 'DELETE' then old else new end; end if;
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
  -- DAR DÜZEN KİPLERİ (v1.742.0, kullanıcı kararı 31 Ekim): iki sunucu işlemi satırın YALNIZ belirli alanlarına dokunur; kip
  -- (`fis.duzen`) yalnız o işlemlerin içinde açılır, işlem sonunda kapanır. Miktar, tutar, ürün, tarih hiçbir kipte değişmez.
  -- (Fiş defterinden önceki eski fişler için ayrı yol YOK — kullanıcı: veriler kurallar açılmadan sıfırlanır.)
  --   bag     (fis_bag_coz): sipariş iptalinde sipariş bağı çözülür — siparis_id / kalem_id / rezervasyon_siparis_id boşalır,
  --           eski değerler geçmiş sütunlara geçer (F1.1; geçişin doğruluğunu fis_bag_iz_koru denetler),
  --           siparis_no "(iptal)" eki alır; cari satırında `ek`ten yalnız siparisId / kalemId / rezervasyonSiparisId düşer.
  --   varyant (stk_renk_tasi): renk kodlamada hedef varyant zaten varsa hareket o varyanta taşınır (renk adı değişir, stok aynı).
  yeni_j := to_jsonb(new) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'guncelleme';
  eski_j := to_jsonb(old) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'guncelleme';
  if yeni_j is distinct from eski_j then
    if duzen = 'bag'
       and (yeni_j - 'siparis_id' - 'siparis_no' - 'kalem_id' - 'rezervasyon_siparis_id' - 'ek' - 'gecmis_siparis_id' - 'gecmis_kalem_id' - 'bag_cozum_zamani')
         = (eski_j - 'siparis_id' - 'siparis_no' - 'kalem_id' - 'rezervasyon_siparis_id' - 'ek' - 'gecmis_siparis_id' - 'gecmis_kalem_id' - 'bag_cozum_zamani')
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

create or replace function public.fis_baslik_koru() returns trigger
language plpgsql as $$
declare
  korunan boolean := false;
begin
  -- F3 onayı sunucu kanıtıdır; kurallar kapalıyken bile not düzenlemesi/geri yükleme silemez.
  if tg_op='DELETE' then
    if old.ek ? 'fazlaTeslimOnayi' then
      raise exception 'Fazla teslim onay kaydı silinemez (%)',old.id using errcode='KR007';
    end if;
  end if;
  if tg_op='UPDATE' then
    if (new.ek -> 'fazlaTeslimOnayi') is distinct from (old.ek -> 'fazlaTeslimOnayi') then
      raise exception 'Fazla teslim onay kaydı değiştirilemez (%)',old.id using errcode='KR007';
    end if;
  end if;
  if not public.fis_kural_aktif() then
    if tg_op <> 'INSERT' then korunan := old.istek is not null; end if;
    if tg_op <> 'DELETE' then korunan := korunan or new.istek is not null; end if;
    if not korunan then return case when tg_op = 'DELETE' then old else new end; end if;
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

create or replace function public.fis_kes(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_istek text := nullif(btrim(coalesce(p ->> 'istek', '')), '');
  mevcut public.stk_fis;
  fid text;
  bid text;
  v_idler text[];
  v_once jsonb;
  v_kalem jsonb;
  v_eksik text;
  v_siparisler text[];
  v_sid text;
begin
  if v_istek is null then
    raise exception 'İstek kimliği yok (yeniden gönderimde çift fiş olmasın diye zorunlu)' using errcode = '22023';
  end if;
  if jsonb_typeof(p -> 'fis') <> 'object' then
    raise exception 'Fiş bilgisi yok' using errcode = '22023';
  end if;
  -- KİLİT SIRASI 1 — AYNI İSTEK EŞZAMANLI (v1.742.2): ikincisi birincinin bitmesini bekler, sonra ilk numarayı alır.
  perform pg_advisory_xact_lock(hashtext('fis_kes:' || v_istek));
  v_idler := public.fis_kalem_idleri(p);
  select * into mevcut from public.stk_fis f where f.istek = v_istek;
  if found then
    return jsonb_build_object('fisNo', mevcut.id, 'bagliFisNo', mevcut.bagli_fis, 'zatenVar', true,
      'kalemler', public.fis_kalem_durumlari(v_idler), 'karsilananDuzeltme', '[]'::jsonb);
  end if;
  -- KİLİT SIRASI 3 — kalemler kimlik sırasıyla, İLK YAZMADAN ÖNCE (v1.743.0, F1)
  -- F4: iptal ve teslim, sipariş işlem kilidinde sıraya girer. SHARE kullanmak, kalemi önceden kilitleyip
  -- başlığı sonra yazan eski işlemle ters sıraya düşüyordu (F1.G1-yeni-kodla gerçek PG'de kırmızı).
  -- Satırda KEY SHARE silmeye karşı korumayı sürdürür; sıradan başlık UPDATE'iyle çakışmaz.
  select coalesce(array_agg(distinct sid order by sid), '{}'::text[]) into v_siparisler from (
    select p -> 'fis' ->> 'siparisId' as sid
    union all select p -> 'bagli' -> 'fis' ->> 'siparisId'
    union all select x ->> 'siparisId' from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) x
    union all select x ->> 'siparisId' from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) x
    union all select x ->> 'siparis_id' from jsonb_array_elements(public.stk_dizi(p -> 'alt' -> 'siparis_kalemleri' -> 'satirlar')) x
    union all select k.siparis_id::text from public.siparis_kalemleri k where k.id::text = any(v_idler)
  ) q where coalesce(sid, '') <> '';
  foreach v_sid in array v_siparisler loop
    perform pg_advisory_xact_lock(hashtextextended('fis_siparis_iptal:' || v_sid, 0));
  end loop;
  perform 1 from public.siparisler s where s.id::text = any(v_siparisler) order by s.id for key share;
  select string_agg(s.id::text, ', ' order by s.id) into v_eksik
    from public.siparisler s where s.id::text = any(v_siparisler) and s.durum = 'İptal';
  if v_eksik is not null then
    raise exception 'İptal edilmiş siparişe yeni fiş yazılamaz (sipariş %) — siparişi yenileyin', v_eksik using errcode = 'KR006';
  end if;
  v_once := public.fis_kalem_kilitle(v_idler);
  -- F2: stok satırının kalemi var olmalı (aynı yükte yeni yazılan kalem hariç — yabancı anahtar işlem sonunda denetler) → KR005
  select string_agg(distinct x, ', ') into v_eksik from (
    select s ->> 'kalemId' as x from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) s
    union all select s ->> 'kalemId' from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) s) y
   where coalesce(x, '') <> '' and not (v_once ? x)
     and not exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'alt' -> 'siparis_kalemleri' -> 'satirlar')) a where a ->> 'id' = x);
  if v_eksik is not null then
    raise exception 'Var olmayan sipariş kalemine teslim yazılamaz (kalem %) — sipariş silinmiş ya da değişmiş olabilir; siparişi yenileyip yeniden deneyin', v_eksik
      using errcode = 'KR005';
  end if;
  -- F2: kaleme bağlı stok satırının ÜRÜNÜ ve RENGİ kalemle aynı olmalı (harf / boşluk duyarsız) → KR003. Uygulama satırı kalemden
  -- kurar (081); fark yalnız bayat ekranda olur: başka cihaz teslimsiz kalemin rengini değiştirmiş, bu cihaz eski renkle teslim
  -- ediyor (t-f2-kilit Q4: hareket Siyah, kalem Taba). BEDEN karşılaştırılmaz: stok fişi (255) kalemi bedensiz tutup satırı
  -- beden beden yazabiliyor — açık risk (VERI-TUTARLILIGI-F2.md).
  select string_agg(distinct x.kalem || ' (' || coalesce(x.urun, '') || ' ' || coalesce(x.renk, '') || ' ≠ kalem ' || coalesce(k.urun_id::text, '') || ' ' || coalesce(k.renk, '') || ')', ', ')
    into v_eksik
    from (select s ->> 'kalemId' as kalem, s ->> 'urunId' as urun, s ->> 'renk' as renk from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) s
          union all select s ->> 'kalemId', s ->> 'urunId', s ->> 'renk' from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) s) x
    join public.siparis_kalemleri k on k.id::text = x.kalem
   where (x.urun is not null and k.urun_id is not null and x.urun <> k.urun_id::text)
      or (x.renk is not null and k.renk is not null and lower(btrim(x.renk)) <> lower(btrim(k.renk)));
  if v_eksik is not null then
    raise exception 'Teslim edilen ürün / renk sipariş kalemiyle uyuşmuyor: % — sipariş başka cihazda değişmiş olabilir; yenileyip yeniden deneyin', v_eksik
      using errcode = 'KR003';
  end if;

  p := public.fis_satis_teslim_koru(p);
  fid := public.fis_tek_kes(p -> 'fis', p -> 'stok', p -> 'cari', p -> 'kasa', v_istek);
  if jsonb_typeof(p -> 'bagli') = 'object' then
    bid := public.fis_tek_kes(p -> 'bagli' -> 'fis', p -> 'bagli' -> 'stok', p -> 'bagli' -> 'cari', p -> 'bagli' -> 'kasa', v_istek || ':bagli', fid);
    update public.stk_fis set bagli_fis = bid where id = fid;
    update public.stk_fis set bagli_fis = fid where id = bid;
  end if;
  if jsonb_typeof(p -> 'alt') = 'object' then
    -- Kalem satırının öteki alanları (planlama, rezervasyon…) yazılır; karşılanan ÇIKAR (v1.743.0: tek yazar aşağıda), artis yok sayılır.
    perform set_config('fis.kalem', 'acik', true);
    perform public.alt_yaz(public.fis_alt_karsilanansiz(p -> 'alt'));
    perform set_config('fis.kalem', '', true);
  end if;
  v_kalem := public.fis_kalem_karsilanan_yenile(v_idler, v_once, 'fis_kes', fid);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', fid, 'bagliFisNo', bid, 'zatenVar', false,
    'kalemler', v_kalem -> 'kalemler', 'karsilananDuzeltme', v_kalem -> 'duzeltme');
end $$;

create or replace function public.fis_iptal(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  no text := nullif(btrim(coalesce(p ->> 'no', '')), '');
  eposta text := lower(auth.jwt() ->> 'email');
  f public.stk_fis;
  hedefler text[];
  h text;
  n int := 0;
  v_idler text[];
  v_once jsonb;
  v_kalem jsonb;
  v_bagli text;
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'silme');
  -- KİLİT SIRASI 2 — fişin (ve bağlı fişin) hareketlerindeki + alt satırlarındaki kalemler, kimlik sırasıyla, FİŞ SATIRINDAN ve
  -- İLK YAZMADAN ÖNCE (v1.743.0, F1). Kimlikler kilitsiz okunur: fis_bag_coz geçerli bağı geçmişe taşırken iki sütundan biri dolu
  -- kalır (coalesce) — eşzamanlı sipariş iptalinin önünde ya da arkasında aynı kalem bulunur; bağlı fiş başlıktan okunur.
  select coalesce(array_agg(distinct x order by x), '{}'::text[]) into v_idler from (
    -- F1.1: geçmiş bağ da (sipariş iptalinden sonra iptal edilen fişin kalemi — S1; uygulama o anda alt göndermez)
    select coalesce(hh.kalem_id, hh.gecmis_kalem_id) as x from public.stk_hareket hh
     where hh.fis_id in (select ff.id from public.stk_fis ff where ff.id = no union select ff.bagli_fis from public.stk_fis ff where ff.id = no)
       and coalesce(hh.kalem_id, hh.gecmis_kalem_id) is not null
    union all select unnest(public.fis_kalem_idleri(jsonb_build_object('alt', p -> 'alt')))) y;
  v_once := public.fis_kalem_kilitle(v_idler);
  -- KİLİT SIRASI 3 — iptal edilen fiş VE bağlı fişi, KİMLİK SIRASIYLA, ilk yazmadan önce (F1.1). Önceden yalnız X kilitlenip bağlı
  -- fiş yazma sırasında kilitleniyordu: aynı anda ana fişi ve makbuzu iptal eden iki cihaz ters sırayla kilitleniyordu
  -- (t-f11-kilit P6b: siparişsiz peşin satışta kalem kilidi ikisini sıralamıyor). Bağlı fiş kimliği kesilirken yazılır, değişmez.
  select ff.bagli_fis into v_bagli from public.stk_fis ff where ff.id = no;
  perform 1 from public.stk_fis ff where ff.id = no or ff.id = v_bagli order by ff.id for update;
  select * into f from public.stk_fis where id = no;
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
  -- Kalem satırının öteki alanları yazılır; karşılanan ÇIKAR, artis yok sayılır (v1.743.0): değer hareketlerden hesaplanır —
  -- zaten iptal edilmiş fişe gelen tekrar (yanıtı kaybolmuş istek, eski istemcinin mutlak değeri) karşılananı DEĞİŞTİREMEZ.
  if jsonb_typeof(p -> 'alt') = 'object' then
    perform set_config('fis.kalem', 'acik', true);
    perform public.alt_yaz(public.fis_alt_karsilanansiz(p -> 'alt'));
    perform set_config('fis.kalem', '', true);
  end if;
  v_kalem := public.fis_kalem_karsilanan_yenile(v_idler, v_once, 'fis_iptal', f.id);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', f.id, 'bagliFisNo', f.bagli_fis, 'zatenIptal', f.iptal,
    'kalemler', v_kalem -> 'kalemler', 'karsilananDuzeltme', v_kalem -> 'duzeltme');
end $$;

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
  v_idler text[];
begin
  perform public.stk_yetki(array['siparis', 'stok', 'cari'], 'kaydetme');
  if sid is null then raise exception 'Sipariş kimliği yok' using errcode = '22023'; end if;
  -- fis_kes ile aynı işlem kilidi, satır kilitlerinden önce. Durum ve bağ çözme tek işlemde kalır.
  perform pg_advisory_xact_lock(hashtextextended('fis_siparis_iptal:' || sid, 0));
  -- F4: iptal durumu ve bağ çözme tek işlemde. Kilit kalemlerden ve ilk yazmadan önce alınır.
  -- Numarayı istemciden alma: bayat/yanlış numara başka siparişin numarayla eşleşen bağlarını çözmemeli.
  select s.siparis_no into sno from public.siparisler s where s.id::text = sid for update;
  if not found then raise exception 'Sipariş bulunamadı (sipariş %)', sid using errcode = 'KR005'; end if;
  ino := case when sno is null then null else sno || ' (iptal)' end;
  -- KİLİT SIRASI 2 (F1.1) — siparişin kalemleri ve bağlı hareketlerin kalemleri, kimlik sırasıyla, İLK YAZMADAN ÖNCE. Önceden hiç
  -- kalem kilidi yoktu ve hareketler yazıldıktan ('tekil' alındıktan) SONRA fiş başlığı güncelleniyordu: aynı siparişin fiş
  -- iptaliyle (kalem → fiş → hareket) ters sıra — %30–70 kilitlenme (1 Kasım matrisi, t-f11-kilit P1). Yazma yapmaz.
  select coalesce(array_agg(distinct x order by x), '{}'::text[]) into v_idler from (
    select k.id::text as x from public.siparis_kalemleri k where k.siparis_id::text = sid
    union all select h.kalem_id from public.stk_hareket h
     where h.kalem_id is not null and (h.siparis_id = sid or (h.siparis_id is null and sno is not null and h.siparis_no = sno))) y;
  perform public.fis_kalem_kilitle(v_idler);
  -- KİLİT SIRASI 3 (F1.1) — bu işlemin dokunacağı BÜTÜN fiş başlıkları (başlıktan ve bağı çözülecek stok / cari satırlarından),
  -- kimlik sırasıyla. fis_iptal de kalem → fiş (kimlik sırasıyla) → yazma sırasını izler.
  perform 1 from public.stk_fis ff where ff.id in (
      select f.id from public.stk_fis f where f.siparis_id = sid or (f.siparis_id is null and sno is not null and f.siparis_no = sno)
      union select h.fis_id from public.stk_hareket h
       where h.siparis_id = sid or (h.siparis_id is null and sno is not null and h.siparis_no = sno) or h.rezervasyon_siparis_id = sid
      union select c.fis_id from public.car_hareket c
       where c.fis_id is not null and not c.iptal
         and ((c.ek ->> 'siparisId') = sid or ((c.ek ->> 'siparisId') is null and sno is not null and c.siparis_no = sno)
              or (c.ek ->> 'rezervasyonSiparisId') = sid))
    order by ff.id for update;

  perform set_config('fis.kapi', 'acik', true);
  perform set_config('fis.duzen', 'bag', true);
  -- GEÇERLİ bağ → GEÇMİŞ bağ (F1.1, kural 1): eski sipariş / kalem kimliği AYRI sütunlara, BİR KEZ (çözülmüş satır eşleşmez:
  -- kimliği boş, numarası "(iptal)" ekli — tekrar çağrı izi bozmaz, kural 3). İptal edilmiş satır DAHİL (geçerli bağ hiçbir
  -- satırda kalmaz); iptal satır karşılanana yine girmez (fis_kalem_hesap, kural 2). Karşılanan DEĞİŞMEZ: aynı hareketler bu kez
  -- geçmiş bağdan sayılır (karar A: teslim geçmişi kalemde kalır).
  update public.stk_hareket
     set gecmis_siparis_id = siparis_id, gecmis_kalem_id = kalem_id, bag_cozum_zamani = now(),
         siparis_id = null, kalem_id = null, siparis_no = ino
   where bag_cozum_zamani is null and (siparis_id = sid or (siparis_id is null and sno is not null and siparis_no = sno));
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
   where (siparis_id = sid or (siparis_id is null and sno is not null and siparis_no = sno)) and not (coalesce(ek, '{}'::jsonb) ? 'siparisIptal');
  perform set_config('fis.duzen', '', true);
  perform set_config('fis.kapi', '', true);
  update public.siparisler set durum = 'İptal' where id::text = sid and durum is distinct from 'İptal';
  return jsonb_build_object('stok', n_stok, 'cari', n_cari, 'zincir', n_zincir, 'durum', 'İptal', 'kalemler', public.fis_kalem_durumlari(v_idler));
end $$;

create or replace function public.fis_siparis_iptal_koru() returns trigger
language plpgsql as $$
begin
  if old.durum = 'İptal' and new.durum is distinct from old.durum then
    raise exception 'İptal edilmiş sipariş yeniden açılamaz (sipariş %) — yeni sipariş oluşturun', old.id using errcode = 'KR006';
  end if;
  return new;
end $$;

create or replace function public.stk_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  vid text;
  fid text;
  m numeric;
  f public.stk_fis;
  eposta text := lower(auth.jwt() ->> 'email');
  bakiye numeric;
  n_ac int := 0;
  n_satir int := 0;
  n_iptal int := 0;
  n_kaldir int := 0;
  n int;
  atlanan jsonb := '[]'::jsonb;
  acilan text[] := '{}';
begin
  perform public.v2_yazma_acik('stok');
  -- Yetki (v1.730.1 genişledi): v1'de stok tablolarına yazma modül yetkisi istemiyordu (rls-yazma.sql); stok satırını cari
  -- kartından fiş kesen cari yetkilisi, peşin fişte muhasebe yetkilisi, Tanımlar'da renk birleştiren kullanıcı da yazar.
  -- Herhangi bir modülde "kaydetme" yeter; Tanımlar'da listede olmayan ya da hiç kaydetme yetkisi olmayan reddedilir.
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe', 'tanimlar'], 'kaydetme');

  -- 1) Varyant aç / min stok
  for s in select * from jsonb_array_elements(coalesce(p -> 'varyantAc', '[]'::jsonb)) loop
    vid := public.stk_varyant_coz(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    update public.stk_varyant set aktif = true, min_stok = coalesce((s ->> 'minStok')::numeric, min_stok)
     where id = vid and (not aktif or min_stok is distinct from coalesce((s ->> 'minStok')::numeric, min_stok));
    acilan := array_append(acilan, vid);
    n_ac := n_ac + 1;
  end loop;

  -- 2) Satırlar
  for s in select * from jsonb_array_elements(coalesce(p -> 'satirlar', '[]'::jsonb)) loop
    fid := nullif(btrim(coalesce(s ->> 'fisId', '')), '');
    if coalesce(s ->> 'id', '') = '' then raise exception 'Stok satırında hareket kimliği yok' using errcode = '22023'; end if;
    if fid is null then raise exception 'Hareket % fişsiz — fişsiz hareket yazılamaz', s ->> 'id' using errcode = '22023'; end if;
    m := coalesce((s ->> 'miktar')::numeric, 0);
    if m = 0 then
      update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta where id = s ->> 'id' and not iptal;
      continue;
    end if;
    select * into f from public.stk_fis where id = fid for update;
    if not found then
      insert into public.stk_fis (id, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, kullanici, olusturan)
      values (fid, public.stk_kaynak_tur(s ->> 'kaynak'), s ->> 'kaynak', coalesce(public.stk_zaman(s ->> 'tarih'), now()),
              s ->> 'cariId', s ->> 'siparisId', s ->> 'siparisNo', s ->> 'uretimId', s -> 'ek' ->> 'kullanici', eposta);
    elsif f.iptal then
      -- İptal edilmiş fişe satır geldi (köprü fiş iptali kullanmaz; göçteki eski iptal fişi): fiş açılır, öteki satırları
      -- iptal kalır — stoğa sayılmayanlar sayılmaya başlamasın.
      update public.stk_hareket set iptal = true, iptal_zamani = coalesce(f.iptal_zamani, now()), iptal_eden = f.iptal_eden
       where fis_id = fid and not iptal and id <> s ->> 'id';
      update public.stk_fis set iptal = false where id = fid;
    end if;
    vid := public.stk_varyant_coz(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    insert into public.stk_hareket as h (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, siparis_id, siparis_no, kalem_id,
                                         cari_id, uretim_id, rezervasyon_siparis_id, fazla_gonderim, aciklama, ek)
    values (s ->> 'id', fid, vid, s ->> 'urunId', m, s ->> 'kaynak', coalesce(public.stk_zaman(s ->> 'tarih'), now()),
            s ->> 'siparisId', s ->> 'siparisNo', s ->> 'kalemId', s ->> 'cariId', s ->> 'uretimId', s ->> 'rezervasyonSiparisId',
            coalesce((s ->> 'fazlaGonderim')::boolean, false), s ->> 'aciklama', coalesce(s -> 'ek', '{}'::jsonb))
    on conflict (id) do update set
      fis_id = excluded.fis_id, varyant_id = excluded.varyant_id, urun_id = excluded.urun_id, miktar = excluded.miktar,
      kaynak = excluded.kaynak, tarih = excluded.tarih, siparis_id = excluded.siparis_id, siparis_no = excluded.siparis_no,
      kalem_id = excluded.kalem_id, cari_id = excluded.cari_id, uretim_id = excluded.uretim_id,
      rezervasyon_siparis_id = excluded.rezervasyon_siparis_id, fazla_gonderim = excluded.fazla_gonderim,
      aciklama = excluded.aciklama, ek = excluded.ek, iptal = false, iptal_zamani = null, iptal_eden = null
    where (h.fis_id, h.varyant_id, h.miktar, h.kaynak, h.tarih, h.siparis_id, h.siparis_no, h.kalem_id, h.cari_id, h.uretim_id,
           h.rezervasyon_siparis_id, h.fazla_gonderim, h.aciklama, h.ek, h.iptal)
      is distinct from (excluded.fis_id, excluded.varyant_id, excluded.miktar, excluded.kaynak, excluded.tarih, excluded.siparis_id,
           excluded.siparis_no, excluded.kalem_id, excluded.cari_id, excluded.uretim_id, excluded.rezervasyon_siparis_id,
           excluded.fazla_gonderim, excluded.aciklama, excluded.ek, false);
    n_satir := n_satir + 1;
  end loop;

  -- 3) Satır iptali (hareket silindi / geri alındı)
  update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta
   where id in (select jsonb_array_elements_text(coalesce(p -> 'iptal', '[]'::jsonb))) and not iptal;
  get diagnostics n_iptal = row_count;

  -- 4) Varyant kaldır
  for s in select * from jsonb_array_elements(coalesce(p -> 'varyantKaldir', '[]'::jsonb)) loop
    vid := public.stk_varyant_bul(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    -- Aynı istekte açılan varyant kaldırılmaz: yeniden adlandırmada eski ad (Tanımlar henüz buluta varmadıysa) hâlâ aynı
    -- varyanta çıkar — "aç" ile "kaldır" aynı varyantı gösterir, kaldırmak açılanı pasife alırdı.
    continue when vid is null or vid = any(acilan);
    select miktar into bakiye from public.stk_stok where varyant_id = vid;
    if coalesce(bakiye, 0) <> 0 then
      atlanan := atlanan || jsonb_build_object('neden', 'stoğu var', 'varyantId', vid, 'miktar', bakiye);
    elsif exists (select 1 from public.stk_hareket where varyant_id = vid) then
      update public.stk_varyant set aktif = false where id = vid and aktif;
      n_kaldir := n_kaldir + 1;
    else
      delete from public.stk_varyant where id = vid;
      n_kaldir := n_kaldir + 1;
    end if;
  end loop;

  return jsonb_build_object('varyantAc', n_ac, 'satir', n_satir, 'iptal', n_iptal, 'varyantKaldir', n_kaldir, 'atlanan', atlanan);
end $$;

create or replace function public.car_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  eposta text := lower(auth.jwt() ->> 'email');
  n_satir int := 0;
  n_iptal int := 0;
begin
  perform public.v2_yazma_acik('cari');   -- v1.730.1: geri dönüldüyse yazma yok (stok-v2.sql)
  perform public.stk_yetki(array['cari', 'fisler', 'muhasebe', 'siparis', 'uretim', 'stok', 'tanimlar'], 'kaydetme');
  if exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'satirlar')) x
             where coalesce(x ->> 'id', '') = '' or coalesce(x ->> 'cari_id', '') = '') then
    raise exception 'Cari hareketinde kimlik ya da cari yok' using errcode = '22023';
  end if;
  insert into public.car_hareket as h (id, cari_id, tarih, zaman, yon, tutar, para_birimi, odeme_sekli, vade, defter, fis_no,
                                       siparis_no, uretim_id, urun_ad, renk, aciklama, ek, olusturan)
  select x ->> 'id', x ->> 'cari_id', x ->> 'tarih', x ->> 'zaman', x ->> 'yon', coalesce(public.stk_sayi(x ->> 'tutar'), 0),
         x ->> 'para_birimi', x ->> 'odeme_sekli', x ->> 'vade', x ->> 'defter', x ->> 'fis_no', x ->> 'siparis_no',
         x ->> 'uretim_id', x ->> 'urun_ad', x ->> 'renk', x ->> 'aciklama',
         case when jsonb_typeof(x -> 'ek') = 'object' then x -> 'ek' else '{}'::jsonb end, eposta
  from (select distinct on (y ->> 'id') y as x from jsonb_array_elements(public.stk_dizi(p -> 'satirlar')) with ordinality as e(y, sira)
        order by y ->> 'id', sira desc) s
  on conflict (id) do update set
    cari_id = excluded.cari_id, tarih = excluded.tarih, zaman = excluded.zaman, yon = excluded.yon, tutar = excluded.tutar,
    para_birimi = excluded.para_birimi, odeme_sekli = excluded.odeme_sekli, vade = excluded.vade, defter = excluded.defter,
    fis_no = excluded.fis_no, siparis_no = excluded.siparis_no, uretim_id = excluded.uretim_id, urun_ad = excluded.urun_ad,
    renk = excluded.renk, aciklama = excluded.aciklama, ek = excluded.ek, guncelleme = now(),
    iptal = false, iptal_zamani = null, iptal_eden = null
  where (h.cari_id, h.tarih, h.zaman, h.yon, h.tutar, h.para_birimi, h.odeme_sekli, h.vade, h.defter, h.fis_no, h.siparis_no,
         h.uretim_id, h.urun_ad, h.renk, h.aciklama, h.ek, h.iptal)
    is distinct from (excluded.cari_id, excluded.tarih, excluded.zaman, excluded.yon, excluded.tutar, excluded.para_birimi,
         excluded.odeme_sekli, excluded.vade, excluded.defter, excluded.fis_no, excluded.siparis_no, excluded.uretim_id,
         excluded.urun_ad, excluded.renk, excluded.aciklama, excluded.ek, false);
  get diagnostics n_satir = row_count;
  update public.car_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta
   where id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'iptal'))) and not iptal;
  get diagnostics n_iptal = row_count;
  return jsonb_build_object('satir', n_satir, 'iptal', n_iptal);
end $$;

create or replace function public.kas_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  eposta text := lower(auth.jwt() ->> 'email');
  yalniz_kur boolean;
  n_hesap int := 0;
  n_hesap_sil int := 0;
  n_hareket int := 0;
  n_iptal int := 0;
  n_cek int := 0;
  n_cek_iptal int := 0;
begin
  perform public.v2_yazma_acik('kasa');   -- v1.730.1: geri dönüldüyse yazma yok (stok-v2.sql)
  yalniz_kur := jsonb_array_length(public.stk_dizi(p -> 'hesaplar')) = 0 and jsonb_array_length(public.stk_dizi(p -> 'hesapSil')) = 0
    and jsonb_array_length(public.stk_dizi(p -> 'hareketler')) = 0 and jsonb_array_length(public.stk_dizi(p -> 'hareketIptal')) = 0
    and jsonb_array_length(public.stk_dizi(p -> 'cekler')) = 0 and jsonb_array_length(public.stk_dizi(p -> 'cekIptal')) = 0
    and jsonb_array_length(public.stk_dizi(p -> 'ayarSil')) = 0
    and not exists (select 1 from jsonb_object_keys(case when jsonb_typeof(p -> 'ayar') = 'object' then p -> 'ayar' else '{}'::jsonb end) k
                    where k not in ('kurlar', 'kurGecmisi'));
  if not yalniz_kur then
    perform public.stk_yetki(array['muhasebe', 'fisler', 'cari'], 'kaydetme');
  end if;
  if exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'hareketler')) x
             where coalesce(x ->> 'id', '') = '' or coalesce(x ->> 'hesap_id', '') = '' or jsonb_typeof(x -> 'veri') <> 'object')
     or exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'hesaplar')) x
                where coalesce(x ->> 'id', '') = '' or coalesce(x ->> 'tur', '') not in ('kasa', 'banka'))
     or exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'cekler')) x
                where coalesce(x ->> 'id', '') = '' or jsonb_typeof(x -> 'veri') <> 'object') then
    raise exception 'Kasa kaydında kimlik, hesap ya da tür eksik' using errcode = '22023';
  end if;

  -- Hesaplar (ekle / güncelle / yeniden etkinleştir) ve kaldırılanlar (pasif — hareketleri iz olarak kalır)
  insert into public.kas_hesap as h (id, tur, sira, veri, aktif, olusturan)
  -- Sıra verilmezse (uygulama vermez): var olan hesap sırasını korur, yeni hesap sona eklenir (ekran da sona ekler).
  select distinct on (x ->> 'id') x ->> 'id', x ->> 'tur',
         coalesce(public.stk_sayi(x ->> 'sira'), (select m.sira from public.kas_hesap m where m.id = x ->> 'id'),
                  (select coalesce(max(m.sira), 0) from public.kas_hesap m) + e.n),
         case when jsonb_typeof(x -> 'veri') = 'object' then (x -> 'veri') - 'hareketler' - 'id' else '{}'::jsonb end, true, eposta
  from jsonb_array_elements(public.stk_dizi(p -> 'hesaplar')) with ordinality as e(x, n)
  order by x ->> 'id', e.n desc   -- aynı kimlik iki kez gelirse sonuncusu (v1.730.1)
  on conflict (id) do update set tur = excluded.tur, sira = excluded.sira, veri = excluded.veri, aktif = true, guncelleme = now()
  where (h.tur, h.sira, h.veri, h.aktif) is distinct from (excluded.tur, excluded.sira, excluded.veri, true);
  get diagnostics n_hesap = row_count;
  update public.kas_hesap set aktif = false, guncelleme = now()
   where id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'hesapSil'))) and aktif;
  get diagnostics n_hesap_sil = row_count;

  -- Hareketler
  insert into public.kas_hareket as k (id, hesap_id, veri, olusturan)
  select distinct on (x ->> 'id') x ->> 'id', x ->> 'hesap_id', x -> 'veri', eposta
  from jsonb_array_elements(public.stk_dizi(p -> 'hareketler')) with ordinality as e(x, n)
  order by x ->> 'id', e.n desc
  on conflict (id) do update set hesap_id = excluded.hesap_id, veri = excluded.veri, guncelleme = now(),
    iptal = false, iptal_zamani = null, iptal_eden = null
  where (k.hesap_id, k.veri, k.iptal) is distinct from (excluded.hesap_id, excluded.veri, false);
  get diagnostics n_hareket = row_count;
  update public.kas_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta
   where id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'hareketIptal'))) and not iptal;
  get diagnostics n_iptal = row_count;

  -- Çekler
  insert into public.kas_cek as c (id, veri, olusturan)
  select distinct on (x ->> 'id') x ->> 'id', x -> 'veri', eposta
  from jsonb_array_elements(public.stk_dizi(p -> 'cekler')) with ordinality as e(x, n)
  order by x ->> 'id', e.n desc
  on conflict (id) do update set veri = excluded.veri, guncelleme = now(), iptal = false, iptal_zamani = null, iptal_eden = null
  where (c.veri, c.iptal) is distinct from (excluded.veri, false);
  get diagnostics n_cek = row_count;
  update public.kas_cek set iptal = true, iptal_zamani = now(), iptal_eden = eposta
   where id in (select jsonb_array_elements_text(public.stk_dizi(p -> 'cekIptal'))) and not iptal;
  get diagnostics n_cek_iptal = row_count;

  -- Ayar (kurlar…): verilen anahtarlar yazılır, silinenler çıkarılır; öteki anahtarlara dokunulmaz.
  if jsonb_typeof(p -> 'ayar') = 'object' or jsonb_array_length(public.stk_dizi(p -> 'ayarSil')) > 0 then
    update public.kas_ayar
       set veri = (veri - array(select jsonb_array_elements_text(public.stk_dizi(p -> 'ayarSil'))))
                  || (case when jsonb_typeof(p -> 'ayar') = 'object' then p -> 'ayar' else '{}'::jsonb end),
           guncelleme = now()
     where id = 'tekil';
  end if;

  return jsonb_build_object('hesap', n_hesap, 'hesapSil', n_hesap_sil, 'hareket', n_hareket, 'iptal', n_iptal,
                            'cek', n_cek, 'cekIptal', n_cek_iptal);
end $$;
drop function if exists public.kas_cek_kilitle(jsonb,boolean);
drop function if exists public.kas_hesap_kilitle(jsonb);
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
  -- ÖN KİLİT (F2, KİLİT SIRASI 2–3): bütün tablolar için, İLK YAZMADAN ÖNCE — üst satırlar (sipariş / üretim) KEY SHARE, sonra
  -- yazılacak ve silinecek alt satırlar FOR UPDATE, kimlik sırasıyla. Önceden upsert deyimi 'tekil'i aldıktan SONRA silme deyimi
  -- silinecek kalemi bekliyordu (t-f2-kilit A: TERS SIRA; birleştirme ∥ teslim kilitleniyordu). Tablolar sabit sırayla.
  foreach t in array array['siparis_kalemleri', 'uretim_atamalari'] loop
    d := case when jsonb_typeof(p) = 'object' then p -> t end;
    continue when jsonb_typeof(d) <> 'object';
    satirlar := public.stk_dizi(d -> 'satirlar');
    if t = 'siparis_kalemleri' then
      perform 1 from public.siparisler s where s.id::text in (
          select x ->> 'siparis_id' from jsonb_array_elements(satirlar) x
          union select k.siparis_id::text from public.siparis_kalemleri k
           where k.id::text in (select x ->> 'id' from jsonb_array_elements(satirlar) x union select jsonb_array_elements_text(public.stk_dizi(d -> 'sil'))))
        order by s.id for key share;
      perform 1 from public.siparis_kalemleri k
       where k.id::text in (select x ->> 'id' from jsonb_array_elements(satirlar) x union select jsonb_array_elements_text(public.stk_dizi(d -> 'sil')))
       order by k.id for update;
    else
      perform 1 from public.uretim u where u.id::text in (
          select x ->> 'uretim_id' from jsonb_array_elements(satirlar) x
          union select a.uretim_id::text from public.uretim_atamalari a
           where a.id::text in (select x ->> 'id' from jsonb_array_elements(satirlar) x union select jsonb_array_elements_text(public.stk_dizi(d -> 'sil'))))
        order by u.id for key share;
      perform 1 from public.uretim_atamalari a
       where a.id::text in (select x ->> 'id' from jsonb_array_elements(satirlar) x union select jsonb_array_elements_text(public.stk_dizi(d -> 'sil')))
       order by a.id for update;
    end if;
  end loop;
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
commit;
