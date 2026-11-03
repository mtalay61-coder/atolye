-- Yalnız F3 satış miktarı kontrolünü F8 tabanına döndürür; mevcut audit kayıtları silinmez. Canlıda ayrı onay gerekir.
begin;
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
drop function if exists public.fis_satis_teslim_koru(jsonb);
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
commit;
