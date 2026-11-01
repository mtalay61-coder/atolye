-- F4 geliştirme değişikliklerini F2/F5 tabanına döndürür. Yalnız ayrı onayla uygulanır.
begin;
drop trigger if exists fis_siparis_iptal_koru on public.siparisler;
drop function if exists public.fis_siparis_iptal_koru();
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
  return jsonb_build_object('stok', n_stok, 'cari', n_cari, 'zincir', n_zincir, 'kalemler', public.fis_kalem_durumlari(v_idler));
end $$;
commit;
