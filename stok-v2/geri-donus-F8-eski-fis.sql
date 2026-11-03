-- Yalnız F8 eski fiş korumasını F3 sürümüne döndürür. Canlıda açık onay gerekir.
begin;
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
