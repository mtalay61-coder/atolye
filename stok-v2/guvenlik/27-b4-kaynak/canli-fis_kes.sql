CREATE OR REPLACE FUNCTION public.fis_kes(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  perform pg_advisory_xact_lock(hashtext('fis_kes:' || v_istek));
  v_idler := public.fis_kalem_idleri(p);
  select * into mevcut from public.stk_fis f where f.istek = v_istek;
  if found then
    return jsonb_build_object('fisNo', mevcut.id, 'bagliFisNo', mevcut.bagli_fis, 'zatenVar', true,
      'kalemler', public.fis_kalem_durumlari(v_idler), 'karsilananDuzeltme', '[]'::jsonb);
  end if;
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
  select string_agg(distinct x, ', ') into v_eksik from (
    select s ->> 'kalemId' as x from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) s
    union all select s ->> 'kalemId' from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) s) y
   where coalesce(x, '') <> '' and not (v_once ? x)
     and not exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'alt' -> 'siparis_kalemleri' -> 'satirlar')) a where a ->> 'id' = x);
  if v_eksik is not null then
    raise exception 'Var olmayan sipariş kalemine teslim yazılamaz (kalem %) — sipariş silinmiş ya da değişmiş olabilir; siparişi yenileyip yeniden deneyin', v_eksik
      using errcode = 'KR005';
  end if;
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

  perform public.kas_cek_kilitle(jsonb_build_object(
    'cekler',public.stk_dizi(p->'kasa'->'cekler')||public.stk_dizi(p->'bagli'->'kasa'->'cekler'),
    'cekIptal',public.stk_dizi(p->'kasa'->'cekIptal')||public.stk_dizi(p->'bagli'->'kasa'->'cekIptal'),
    'cekOnceki',coalesce(p->'kasa'->'cekOnceki','{}'::jsonb)||coalesce(p->'bagli'->'kasa'->'cekOnceki','{}'::jsonb)),true);
  perform public.kas_hesap_kilitle(jsonb_build_object('hareketler',
    public.stk_dizi(p->'kasa'->'hareketler')||public.stk_dizi(p->'bagli'->'kasa'->'hareketler')));
  p := public.fis_satis_teslim_koru(p);
  fid := public.fis_tek_kes(p -> 'fis', p -> 'stok', p -> 'cari', p -> 'kasa', v_istek);
  if jsonb_typeof(p -> 'bagli') = 'object' then
    bid := public.fis_tek_kes(p -> 'bagli' -> 'fis', p -> 'bagli' -> 'stok', p -> 'bagli' -> 'cari', p -> 'bagli' -> 'kasa', v_istek || ':bagli', fid);
    update public.stk_fis set bagli_fis = bid where id = fid;
    update public.stk_fis set bagli_fis = fid where id = bid;
  end if;
  if jsonb_typeof(p -> 'alt') = 'object' then
    perform set_config('fis.kalem', 'acik', true);
    perform public.alt_yaz(public.fis_alt_karsilanansiz(p -> 'alt'));
    perform set_config('fis.kalem', '', true);
  end if;
  v_kalem := public.fis_kalem_karsilanan_yenile(v_idler, v_once, 'fis_kes', fid);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', fid, 'bagliFisNo', bid, 'zatenVar', false,
    'kalemler', v_kalem -> 'kalemler', 'karsilananDuzeltme', v_kalem -> 'duzeltme');
end $function$

