CREATE OR REPLACE FUNCTION public.fis_iptal_toplu(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  hedefler text[];
  kalemler text[];
  kid text;
  no text;
  sonuc jsonb := '[]'::jsonb;
  ilk boolean := true;
begin
  perform public.stk_yetki(array['stok','fisler','siparis','uretim','cari','muhasebe'],'silme');
  if jsonb_array_length(public.stk_dizi(p->'fisler')) not between 1 and 100 then
    raise exception 'Toplu iptalde 1–100 fiş gerekli' using errcode='KR009';
  end if;
  select array_agg(distinct id order by id) into hedefler from (
    select jsonb_array_elements_text(p->'fisler') as id
    union select bagli_fis from public.stk_fis where id in (select jsonb_array_elements_text(p->'fisler')) and bagli_fis is not null) a;
  select array_agg(distinct id order by id) into kalemler from (
    select coalesce(kalem_id,gecmis_kalem_id) as id from public.stk_hareket where fis_id=any(hedefler)
    union select unnest(public.fis_kalem_idleri(jsonb_build_object('alt',p->'alt')))) a where id is not null;
  perform public.fis_kalem_kilitle(kalemler);
  for kid in select distinct cek_id from public.fis_cek_iz where fis_id=any(hedefler) order by cek_id loop
    perform pg_advisory_xact_lock(hashtextextended('kas_cek:'||kid,0));
  end loop;
  perform public.kas_hesap_kilitle(jsonb_build_object('hesaplar',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'tur',a.tur,'veri',a.veri)),'[]'::jsonb)
    from public.kas_hesap a where a.id in(select hesap_id from public.kas_hareket where fis_id=any(hedefler)))));
  perform 1 from public.stk_fis where id=any(hedefler) order by id for update;
  for no in select distinct jsonb_array_elements_text(p->'fisler') order by 1 loop
    sonuc:=sonuc||jsonb_build_array(public.fis_iptal(jsonb_build_object('no',no,'sebep',p->>'sebep','alt',case when ilk then p->'alt' else null end)));
    ilk:=false;
  end loop;
  return jsonb_build_object('fisler',sonuc);
end $function$

