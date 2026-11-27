-- =====================================================================================================================
--  27-b4-geri-al-satirsonu.sql (27-b4-geri-al.sql'in YAPIŞTIRMAYA DAYANIKLI hâli: metin CRLF ile yapıştırılsa da gövdeler canlıdaki satır sonlarıyla kurulur)
--  27-b4-geri-al.sql — ÜRETİLDİ (stok-v2/guvenlik/27-b4-uret.py; ELLE DÜZENLENMEZ)
--  B4 / B5 GERİ ALMA (AYRI ONAYLA): üç gövde canlı 1.744.37 hâline BİREBİR döner (md5 doğrulanır), b4_* kalkar. B4 / B5 açıkları yeniden açılır.
--  SQL Editor: dosyanın TAMAMI, bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
do $$
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'B4 postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if position('B4 (28 Kasım)' in pg_get_functiondef('public.fis_kes(jsonb)'::regprocedure)) = 0 and md5(pg_get_functiondef('public.fis_kes(jsonb)'::regprocedure)) <> 'd5615b1136ec5b7d8cdd475c2a59543e' then
    raise exception 'fis_kes: beklenmeyen gövde (canlı 1.744.37 de B4 de değil — ör. G-25). Hiçbir şey değişmedi.';
  end if;
  if position('B4 (28 Kasım)' in pg_get_functiondef('public.fis_iptal(jsonb)'::regprocedure)) = 0 and md5(pg_get_functiondef('public.fis_iptal(jsonb)'::regprocedure)) <> '23b5e8ca42f7598b448684919df27603' then
    raise exception 'fis_iptal: beklenmeyen gövde (canlı 1.744.37 de B4 de değil — ör. G-25). Hiçbir şey değişmedi.';
  end if;
  if position('B4 (28 Kasım)' in pg_get_functiondef('public.fis_iptal_toplu(jsonb)'::regprocedure)) = 0 and md5(pg_get_functiondef('public.fis_iptal_toplu(jsonb)'::regprocedure)) <> '8ea651cbef26f82028df668db2b2f361' then
    raise exception 'fis_iptal_toplu: beklenmeyen gövde (canlı 1.744.37 de B4 de değil — ör. G-25). Hiçbir şey değişmedi.';
  end if;
  execute 'CREATE OR REPLACE FUNCTION public.fis_kes(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS ' || quote_literal(replace(replace('
declare
  v_istek text := nullif(btrim(coalesce(p ->> ''istek'', '''')), '''');
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
    raise exception ''İstek kimliği yok (yeniden gönderimde çift fiş olmasın diye zorunlu)'' using errcode = ''22023'';
  end if;
  if jsonb_typeof(p -> ''fis'') <> ''object'' then
    raise exception ''Fiş bilgisi yok'' using errcode = ''22023'';
  end if;
  perform pg_advisory_xact_lock(hashtext(''fis_kes:'' || v_istek));
  v_idler := public.fis_kalem_idleri(p);
  select * into mevcut from public.stk_fis f where f.istek = v_istek;
  if found then
    return jsonb_build_object(''fisNo'', mevcut.id, ''bagliFisNo'', mevcut.bagli_fis, ''zatenVar'', true,
      ''kalemler'', public.fis_kalem_durumlari(v_idler), ''karsilananDuzeltme'', ''[]''::jsonb);
  end if;
  select coalesce(array_agg(distinct sid order by sid), ''{}''::text[]) into v_siparisler from (
    select p -> ''fis'' ->> ''siparisId'' as sid
    union all select p -> ''bagli'' -> ''fis'' ->> ''siparisId''
    union all select x ->> ''siparisId'' from jsonb_array_elements(public.stk_dizi(p -> ''stok'' -> ''satirlar'')) x
    union all select x ->> ''siparisId'' from jsonb_array_elements(public.stk_dizi(p -> ''bagli'' -> ''stok'' -> ''satirlar'')) x
    union all select x ->> ''siparis_id'' from jsonb_array_elements(public.stk_dizi(p -> ''alt'' -> ''siparis_kalemleri'' -> ''satirlar'')) x
    union all select k.siparis_id::text from public.siparis_kalemleri k where k.id::text = any(v_idler)
  ) q where coalesce(sid, '''') <> '''';
  foreach v_sid in array v_siparisler loop
    perform pg_advisory_xact_lock(hashtextextended(''fis_siparis_iptal:'' || v_sid, 0));
  end loop;
  perform 1 from public.siparisler s where s.id::text = any(v_siparisler) order by s.id for key share;
  select string_agg(s.id::text, '', '' order by s.id) into v_eksik
    from public.siparisler s where s.id::text = any(v_siparisler) and s.durum = ''İptal'';
  if v_eksik is not null then
    raise exception ''İptal edilmiş siparişe yeni fiş yazılamaz (sipariş %) — siparişi yenileyin'', v_eksik using errcode = ''KR006'';
  end if;
  v_once := public.fis_kalem_kilitle(v_idler);
  select string_agg(distinct x, '', '') into v_eksik from (
    select s ->> ''kalemId'' as x from jsonb_array_elements(public.stk_dizi(p -> ''stok'' -> ''satirlar'')) s
    union all select s ->> ''kalemId'' from jsonb_array_elements(public.stk_dizi(p -> ''bagli'' -> ''stok'' -> ''satirlar'')) s) y
   where coalesce(x, '''') <> '''' and not (v_once ? x)
     and not exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> ''alt'' -> ''siparis_kalemleri'' -> ''satirlar'')) a where a ->> ''id'' = x);
  if v_eksik is not null then
    raise exception ''Var olmayan sipariş kalemine teslim yazılamaz (kalem %) — sipariş silinmiş ya da değişmiş olabilir; siparişi yenileyip yeniden deneyin'', v_eksik
      using errcode = ''KR005'';
  end if;
  select string_agg(distinct x.kalem || '' ('' || coalesce(x.urun, '''') || '' '' || coalesce(x.renk, '''') || '' ≠ kalem '' || coalesce(k.urun_id::text, '''') || '' '' || coalesce(k.renk, '''') || '')'', '', '')
    into v_eksik
    from (select s ->> ''kalemId'' as kalem, s ->> ''urunId'' as urun, s ->> ''renk'' as renk from jsonb_array_elements(public.stk_dizi(p -> ''stok'' -> ''satirlar'')) s
          union all select s ->> ''kalemId'', s ->> ''urunId'', s ->> ''renk'' from jsonb_array_elements(public.stk_dizi(p -> ''bagli'' -> ''stok'' -> ''satirlar'')) s) x
    join public.siparis_kalemleri k on k.id::text = x.kalem
   where (x.urun is not null and k.urun_id is not null and x.urun <> k.urun_id::text)
      or (x.renk is not null and k.renk is not null and lower(btrim(x.renk)) <> lower(btrim(k.renk)));
  if v_eksik is not null then
    raise exception ''Teslim edilen ürün / renk sipariş kalemiyle uyuşmuyor: % — sipariş başka cihazda değişmiş olabilir; yenileyip yeniden deneyin'', v_eksik
      using errcode = ''KR003'';
  end if;

  perform public.kas_cek_kilitle(jsonb_build_object(
    ''cekler'',public.stk_dizi(p->''kasa''->''cekler'')||public.stk_dizi(p->''bagli''->''kasa''->''cekler''),
    ''cekIptal'',public.stk_dizi(p->''kasa''->''cekIptal'')||public.stk_dizi(p->''bagli''->''kasa''->''cekIptal''),
    ''cekOnceki'',coalesce(p->''kasa''->''cekOnceki'',''{}''::jsonb)||coalesce(p->''bagli''->''kasa''->''cekOnceki'',''{}''::jsonb)),true);
  perform public.kas_hesap_kilitle(jsonb_build_object(''hareketler'',
    public.stk_dizi(p->''kasa''->''hareketler'')||public.stk_dizi(p->''bagli''->''kasa''->''hareketler'')));
  p := public.fis_satis_teslim_koru(p);
  fid := public.fis_tek_kes(p -> ''fis'', p -> ''stok'', p -> ''cari'', p -> ''kasa'', v_istek);
  if jsonb_typeof(p -> ''bagli'') = ''object'' then
    bid := public.fis_tek_kes(p -> ''bagli'' -> ''fis'', p -> ''bagli'' -> ''stok'', p -> ''bagli'' -> ''cari'', p -> ''bagli'' -> ''kasa'', v_istek || '':bagli'', fid);
    update public.stk_fis set bagli_fis = bid where id = fid;
    update public.stk_fis set bagli_fis = fid where id = bid;
  end if;
  if jsonb_typeof(p -> ''alt'') = ''object'' then
    perform set_config(''fis.kalem'', ''acik'', true);
    perform public.alt_yaz(public.fis_alt_karsilanansiz(p -> ''alt''));
    perform set_config(''fis.kalem'', '''', true);
  end if;
  v_kalem := public.fis_kalem_karsilanan_yenile(v_idler, v_once, ''fis_kes'', fid);
  perform set_config(''fis.kapi'', '''', true);
  return jsonb_build_object(''fisNo'', fid, ''bagliFisNo'', bid, ''zatenVar'', false,
    ''kalemler'', v_kalem -> ''kalemler'', ''karsilananDuzeltme'', v_kalem -> ''duzeltme'');
end ', chr(13), ''), chr(10), chr(13) || chr(10)));
  execute 'CREATE OR REPLACE FUNCTION public.fis_iptal(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS ' || quote_literal(replace(replace('
declare
  no text := nullif(btrim(coalesce(p ->> ''no'', '''')), '''');
  eposta text := lower(auth.jwt() ->> ''email'');
  f public.stk_fis;
  hedefler text[];
  h text;
  n int := 0;
  v_idler text[];
  v_once jsonb;
  v_kalem jsonb;
  v_bagli text;
  v_cek_iz record;
  v_cekler jsonb := ''[]''::jsonb;
begin
  perform public.stk_yetki(array[''stok'', ''fisler'', ''siparis'', ''uretim'', ''cari'', ''muhasebe''], ''silme'');
  select coalesce(array_agg(distinct x order by x), ''{}''::text[]) into v_idler from (
    select coalesce(hh.kalem_id, hh.gecmis_kalem_id) as x from public.stk_hareket hh
     where hh.fis_id in (select ff.id from public.stk_fis ff where ff.id = no union select ff.bagli_fis from public.stk_fis ff where ff.id = no)
       and coalesce(hh.kalem_id, hh.gecmis_kalem_id) is not null
    union all select unnest(public.fis_kalem_idleri(jsonb_build_object(''alt'', p -> ''alt'')))) y;
  v_once := public.fis_kalem_kilitle(v_idler);
  select ff.bagli_fis into v_bagli from public.stk_fis ff where ff.id = no;
  for h in select distinct z.cek_id from public.fis_cek_iz z
      where z.fis_id in (no,v_bagli) order by z.cek_id loop
    perform pg_advisory_xact_lock(hashtextextended(''kas_cek:''||h,0));
  end loop;
  perform public.kas_hesap_kilitle(jsonb_build_object(''hesaplar'',(select coalesce(jsonb_agg(jsonb_build_object(''id'',a.id,''tur'',a.tur,''veri'',a.veri)),''[]''::jsonb)
    from public.kas_hesap a where a.id in(select hesap_id from public.kas_hareket where fis_id in(no,v_bagli)))));
  perform 1 from public.stk_fis ff where ff.id = no or ff.id = v_bagli order by ff.id for update;
  select * into f from public.stk_fis where id = no;
  if not found then
    raise exception ''Fiş bulunamadı: %'', coalesce(no, ''(yok)'') using errcode = ''P0002'';
  end if;
  hedefler := array[f.id] || case when f.bagli_fis is not null then array[f.bagli_fis] else ''{}''::text[] end;

  for v_cek_iz in select i.*,c.veri,c.iptal as cek_iptal from public.fis_cek_iz i
      join public.stk_fis ff on ff.id=i.fis_id join public.kas_cek c on c.id=i.cek_id
      where i.fis_id=any(hedefler) and not ff.iptal order by i.cek_id loop
    if v_cek_iz.cek_iptal or v_cek_iz.veri is distinct from v_cek_iz.sonraki then
      raise exception ''Çekin daha yeni işlemi var (%) — önce son işlemi geri alın'',v_cek_iz.cek_id using errcode=''KR008'';
    end if;
    update public.kas_cek set veri=coalesce(v_cek_iz.onceki,veri),iptal=(v_cek_iz.onceki is null),
      iptal_zamani=case when v_cek_iz.onceki is null then now() else null end,
      iptal_eden=case when v_cek_iz.onceki is null then eposta else null end,guncelleme=now() where id=v_cek_iz.cek_id;
    v_cekler := v_cekler || jsonb_build_array(jsonb_build_object(''id'',v_cek_iz.cek_id,''veri'',v_cek_iz.onceki));
  end loop;
  perform set_config(''fis.kapi'', ''acik'', true);
  foreach h in array hedefler loop
    update public.stk_fis set iptal = true, iptal_zamani = now(), iptal_eden = eposta, iptal_sebebi = p ->> ''sebep''
     where id = h and not iptal;
    get diagnostics n = row_count;
    update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta where fis_id = h and not iptal;
    update public.car_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now() where fis_id = h and not iptal;
    update public.kas_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now() where fis_id = h and not iptal;
  end loop;
  if jsonb_typeof(p -> ''alt'') = ''object'' then
    perform set_config(''fis.kalem'', ''acik'', true);
    perform public.alt_yaz(public.fis_alt_karsilanansiz(p -> ''alt''));
    perform set_config(''fis.kalem'', '''', true);
  end if;
  v_kalem := public.fis_kalem_karsilanan_yenile(v_idler, v_once, ''fis_iptal'', f.id);
  perform set_config(''fis.kapi'', '''', true);
  return jsonb_build_object(''fisNo'', f.id, ''bagliFisNo'', f.bagli_fis, ''zatenIptal'', f.iptal,
    ''cekler'',v_cekler,''kalemler'', v_kalem -> ''kalemler'', ''karsilananDuzeltme'', v_kalem -> ''duzeltme'');
end ', chr(13), ''), chr(10), chr(13) || chr(10)));
  execute 'CREATE OR REPLACE FUNCTION public.fis_iptal_toplu(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS ' || quote_literal(replace(replace('
declare
  hedefler text[];
  kalemler text[];
  kid text;
  no text;
  sonuc jsonb := ''[]''::jsonb;
  ilk boolean := true;
begin
  perform public.stk_yetki(array[''stok'',''fisler'',''siparis'',''uretim'',''cari'',''muhasebe''],''silme'');
  if jsonb_array_length(public.stk_dizi(p->''fisler'')) not between 1 and 100 then
    raise exception ''Toplu iptalde 1–100 fiş gerekli'' using errcode=''KR009'';
  end if;
  select array_agg(distinct id order by id) into hedefler from (
    select jsonb_array_elements_text(p->''fisler'') as id
    union select bagli_fis from public.stk_fis where id in (select jsonb_array_elements_text(p->''fisler'')) and bagli_fis is not null) a;
  select array_agg(distinct id order by id) into kalemler from (
    select coalesce(kalem_id,gecmis_kalem_id) as id from public.stk_hareket where fis_id=any(hedefler)
    union select unnest(public.fis_kalem_idleri(jsonb_build_object(''alt'',p->''alt'')))) a where id is not null;
  perform public.fis_kalem_kilitle(kalemler);
  for kid in select distinct cek_id from public.fis_cek_iz where fis_id=any(hedefler) order by cek_id loop
    perform pg_advisory_xact_lock(hashtextextended(''kas_cek:''||kid,0));
  end loop;
  perform public.kas_hesap_kilitle(jsonb_build_object(''hesaplar'',(select coalesce(jsonb_agg(jsonb_build_object(''id'',a.id,''tur'',a.tur,''veri'',a.veri)),''[]''::jsonb)
    from public.kas_hesap a where a.id in(select hesap_id from public.kas_hareket where fis_id=any(hedefler)))));
  perform 1 from public.stk_fis where id=any(hedefler) order by id for update;
  for no in select distinct jsonb_array_elements_text(p->''fisler'') order by 1 loop
    sonuc:=sonuc||jsonb_build_array(public.fis_iptal(jsonb_build_object(''no'',no,''sebep'',p->>''sebep'',''alt'',case when ilk then p->''alt'' else null end)));
    ilk:=false;
  end loop;
  return jsonb_build_object(''fisler'',sonuc);
end ', chr(13), ''), chr(10), chr(13) || chr(10)));
  drop function if exists public.b4_teslim_denetle(jsonb);
  drop function if exists public.b4_iptal_denetle(jsonb, text[]);
  if md5(pg_get_functiondef('public.fis_kes(jsonb)'::regprocedure)) <> 'd5615b1136ec5b7d8cdd475c2a59543e' then raise exception 'B4 geri alma doğrulaması: fis_kes canlı gövdeye dönmedi — HİÇBİR şey değişmedi'; end if;
  if md5(pg_get_functiondef('public.fis_iptal(jsonb)'::regprocedure)) <> '23b5e8ca42f7598b448684919df27603' then raise exception 'B4 geri alma doğrulaması: fis_iptal canlı gövdeye dönmedi — HİÇBİR şey değişmedi'; end if;
  if md5(pg_get_functiondef('public.fis_iptal_toplu(jsonb)'::regprocedure)) <> '8ea651cbef26f82028df668db2b2f361' then raise exception 'B4 geri alma doğrulaması: fis_iptal_toplu canlı gövdeye dönmedi — HİÇBİR şey değişmedi'; end if;
end $$;
with f(no, ad, md5_canli) as (values (1, 'fis_kes', 'd5615b1136ec5b7d8cdd475c2a59543e'), (2, 'fis_iptal', '23b5e8ca42f7598b448684919df27603'), (3, 'fis_iptal_toplu', '8ea651cbef26f82028df668db2b2f361')),
d as (
  select f.no, f.ad || '(jsonb)' as kontrol,
         case when p.oid is null then 'YOK'
              when md5(pg_get_functiondef(p.oid)) = f.md5_canli then 'HAZIR'
              when position('B4 (28 Kasım)' in pg_get_functiondef(p.oid)) > 0 then 'UYGULANMIŞ'
              else 'FARKLI (md5 ' || md5(pg_get_functiondef(p.oid)) || ')' end as durum
    from f left join pg_proc p on p.oid = to_regprocedure('public.' || f.ad || '(jsonb)')
  union all
  select 4, 'b4_teslim_denetle · b4_iptal_denetle (yetki: authenticated çalıştıramaz)',
         case when to_regprocedure('public.b4_teslim_denetle(jsonb)') is null and to_regprocedure('public.b4_iptal_denetle(jsonb,text[])') is null then 'yok'
              when to_regprocedure('public.b4_teslim_denetle(jsonb)') is not null and to_regprocedure('public.b4_iptal_denetle(jsonb,text[])') is not null
                   and not has_function_privilege('authenticated', 'public.b4_teslim_denetle(jsonb)', 'execute')
                   and not has_function_privilege('authenticated', 'public.b4_iptal_denetle(jsonb,text[])', 'execute') then 'var'
              else 'EKSİK / YETKİ YANLIŞ' end)
select no, kontrol, durum from d
union all
select 99, 'GENEL', case
  when (select count(*) from d where no <= 3 and durum = 'HAZIR') = 3 and (select durum from d where no = 4) = 'yok' then 'HAZIR'
  when (select count(*) from d where no <= 3 and durum = 'UYGULANMIŞ') = 3 and (select durum from d where no = 4) = 'var' then 'UYGULANMIŞ'
  else 'FARKLI — DUR (beklenmeyen gövde; ör. G-25 uygulanmış)' end
order by 1;
