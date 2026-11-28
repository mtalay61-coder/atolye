-- =====================================================================================================================
--  64-taban-astari-uygula.sql — ÜRETİLDİ (stok-v2/guvenlik/64-taban-astari-uret.py; ELLE DÜZENLENMEZ).
--  TABAN ASTARI: 36–42 varyantlarının ölçü kaydı bağı Beden kaydından aynı adlı Boyut kaydına döner (ürünün ölçü tipi Boyut).
--  YALNIZ yedi varyantın olcu_id sütunu değişir. Yeni varyant açılmaz; ölçü kaydı silinmez, birleştirilmez.
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
--  Kayıtlar beklenen durumda değilse HİÇBİR ŞEY değişmez ve sebep yazılır. İkinci kez çalıştırmak zararsızdır.
-- =====================================================================================================================
do $$
declare
  r record; n int; nv int; urun text;
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  select urun_id into urun from public.stk_varyant where id = 'vry-f1afa0598d2f464baa37f9aca719726b';
  if urun is null then raise exception 'Varyant bulunamadı. Hiçbir şey değişmedi.'; end if;
  perform 1 from public.urunler where id = urun and olcu_tipi = 'Boyut' for update;
  if not found then raise exception 'Ürünün ölçü tipi Boyut değil. Hiçbir şey değişmedi.'; end if;
  select count(*) into nv from public.stk_varyant where urun_id = urun;
  select count(*) into n from (values ('36', 'vry-f1afa0598d2f464baa37f9aca719726b', 'olcu-mvwf90xm-f30d', 'olcu-mwngldrp-j8oh'), ('37', 'vry-ddd8cbcbbac3438d85252ef99d0282ab', 'olcu-mvwf90xm-aamo', 'olcu-mwngldrp-wkwq'), ('38', 'vry-93fb8745f97b40de80f665067dc95252', 'olcu-mvwf90xm-k59x', 'olcu-mwngldrp-58si'), ('39', 'vry-749aa48caf9547068e0342bb157bfa06', 'olcu-mvwf90xm-hfpg', 'olcu-mwngldrp-gt2k'), ('40', 'vry-1666208574f949ecb5698881b6a31aed', 'olcu-mvwf90xm-qpqw', 'olcu-mwngldrp-nwtx'), ('41', 'vry-b1fde0f1627748dab6ead09b66146a8f', 'olcu-mvwf90xm-07tn', 'olcu-mwngldrp-192w'), ('42', 'vry-52e47db113c54cb39f60090faf9e55a6', 'olcu-mwdd947i-1b8s', 'olcu-mwngldrp-xm78')) p(ad, varyant, beden, boyut) join public.stk_varyant v on v.id = p.varyant where v.urun_id = urun and v.olcu_id = p.boyut;
  if n = 7 then raise notice 'Zaten bu durumda — hiçbir şey değişmedi.'; return; end if;
  for r in select p.ad, p.varyant, p.beden as once, p.boyut as sonra from (values ('36', 'vry-f1afa0598d2f464baa37f9aca719726b', 'olcu-mvwf90xm-f30d', 'olcu-mwngldrp-j8oh'), ('37', 'vry-ddd8cbcbbac3438d85252ef99d0282ab', 'olcu-mvwf90xm-aamo', 'olcu-mwngldrp-wkwq'), ('38', 'vry-93fb8745f97b40de80f665067dc95252', 'olcu-mvwf90xm-k59x', 'olcu-mwngldrp-58si'), ('39', 'vry-749aa48caf9547068e0342bb157bfa06', 'olcu-mvwf90xm-hfpg', 'olcu-mwngldrp-gt2k'), ('40', 'vry-1666208574f949ecb5698881b6a31aed', 'olcu-mvwf90xm-qpqw', 'olcu-mwngldrp-nwtx'), ('41', 'vry-b1fde0f1627748dab6ead09b66146a8f', 'olcu-mvwf90xm-07tn', 'olcu-mwngldrp-192w'), ('42', 'vry-52e47db113c54cb39f60090faf9e55a6', 'olcu-mwdd947i-1b8s', 'olcu-mwngldrp-xm78')) p(ad, varyant, beden, boyut) loop
    perform 1 from public.stk_varyant v where v.id = r.varyant and v.urun_id = urun and v.olcu_id = r.once for update;
    if not found then raise exception 'Varyant % beklenen ölçü kaydında değil. Hiçbir şey değişmedi.', r.ad; end if;
    if not exists (select 1 from public.stk_olcu o where o.id = r.sonra and o.tur = 'Boyut' and public.stk_nrm(o.ad) = public.stk_nrm(r.ad)) then
      raise exception 'Hedef ölçü kaydı (%) beklenen grupta / adda değil. Hiçbir şey değişmedi.', r.ad;
    end if;
    if exists (select 1 from public.stk_varyant x join public.stk_varyant v on v.id = r.varyant where x.urun_id = urun and coalesce(x.renk_id, '') = coalesce(v.renk_id, '') and x.olcu_id = r.sonra) then
      raise exception 'Üründe % için hedef kayda bağlı varyant zaten var — ikiz olurdu. Hiçbir şey değişmedi.', r.ad;
    end if;
    update public.stk_varyant set olcu_id = r.sonra where id = r.varyant and olcu_id = r.once;   -- yalnız ölçü kaydı bağı; varyant kimliği ve diğer sütunlar aynı
  end loop;
  if (select count(*) from public.stk_varyant where urun_id = urun) <> nv then raise exception 'Varyant sayısı değişti — geri alındı.'; end if;
end $$;
with p(ad, varyant, beden_kaydi, boyut_kaydi) as (values ('36', 'vry-f1afa0598d2f464baa37f9aca719726b', 'olcu-mvwf90xm-f30d', 'olcu-mwngldrp-j8oh'), ('37', 'vry-ddd8cbcbbac3438d85252ef99d0282ab', 'olcu-mvwf90xm-aamo', 'olcu-mwngldrp-wkwq'), ('38', 'vry-93fb8745f97b40de80f665067dc95252', 'olcu-mvwf90xm-k59x', 'olcu-mwngldrp-58si'), ('39', 'vry-749aa48caf9547068e0342bb157bfa06', 'olcu-mvwf90xm-hfpg', 'olcu-mwngldrp-gt2k'), ('40', 'vry-1666208574f949ecb5698881b6a31aed', 'olcu-mvwf90xm-qpqw', 'olcu-mwngldrp-nwtx'), ('41', 'vry-b1fde0f1627748dab6ead09b66146a8f', 'olcu-mvwf90xm-07tn', 'olcu-mwngldrp-192w'), ('42', 'vry-52e47db113c54cb39f60090faf9e55a6', 'olcu-mwdd947i-1b8s', 'olcu-mwngldrp-xm78'))
select p.ad as olcu, p.varyant, coalesce((select u.ad || ' · ölçü tipi ' || coalesce(u.olcu_tipi, '(boş)') from public.urunler u where u.id = v.urun_id), 'VARYANT YOK') as urun,
       coalesce(v.olcu_id, '-') || ' → ' || coalesce((select o.ad || ' [' || o.tur || ']' from public.stk_olcu o where o.id = v.olcu_id), '?') as simdi,
       p.boyut_kaydi || ' → ' || coalesce((select o.ad || ' [' || o.tur || ']' || case when o.aktif then '' else ' PASİF' end from public.stk_olcu o where o.id = p.boyut_kaydi), 'KAYIT YOK') as plan,
       'geçerli hareket ' || (select count(*) from public.stk_hareket h where h.varyant_id = p.varyant and not coalesce(h.iptal, false)) || ' · iptal ' || (select count(*) from public.stk_hareket h where h.varyant_id = p.varyant and coalesce(h.iptal, false))
         || ' · net ' || (select coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0) from public.stk_hareket h where h.varyant_id = p.varyant) as hareket,
       case when v.id is null then 'ENGEL: varyant yok' when v.olcu_id = p.boyut_kaydi then 'zaten Boyut kaydında'
            when v.olcu_id <> p.beden_kaydi then 'ENGEL: beklenmeyen ölçü kaydı'
            when exists (select 1 from public.stk_varyant x where x.urun_id = v.urun_id and coalesce(x.renk_id, '') = coalesce(v.renk_id, '') and x.olcu_id = p.boyut_kaydi) then 'ENGEL: üründe o Boyut kaydına bağlı varyant zaten var (ikiz olurdu)'
            when not exists (select 1 from public.stk_olcu o where o.id = p.boyut_kaydi and o.tur = 'Boyut' and public.stk_nrm(o.ad) = public.stk_nrm(p.ad)) then 'ENGEL: hedef kayıt Boyut değil ya da adı farklı'
            when (select count(distinct x.urun_id) from public.stk_varyant x where x.id in (select varyant from p)) <> 1 then 'ENGEL: varyantlar tek ürüne ait değil'
            when coalesce((select u.olcu_tipi from public.urunler u where u.id = v.urun_id), '') <> 'Boyut' then 'ENGEL: ürünün ölçü tipi Boyut değil'
            else 'hazır — yalnız olcu_id değişecek' end as durum
  from p left join public.stk_varyant v on v.id = p.varyant
union all select 'TOPLAM', '', '', 'ürünün varyant sayısı ' || (select count(*) from public.stk_varyant x where x.urun_id = (select urun_id from public.stk_varyant where id = 'vry-f1afa0598d2f464baa37f9aca719726b')), 'varyant sayısı AYNI kalır', '',
       'ürünün ölçü tipiyle çelişen varyant: ' || (select count(*) from public.stk_varyant x join public.urunler u on u.id = x.urun_id join public.stk_olcu o on o.id = x.olcu_id where x.urun_id = (select urun_id from public.stk_varyant where id = 'vry-f1afa0598d2f464baa37f9aca719726b') and o.tur in ('Beden', 'Boyut') and o.tur <> u.olcu_tipi)
order by 1;
