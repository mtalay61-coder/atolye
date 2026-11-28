-- =====================================================================================================================
--  62-o-geri-al.sql — ÜRETİLDİ (stok-v2/guvenlik/62-o-uret.py; ELLE DÜZENLENMEZ).
--  PAKET Ö — GERİ ALMA (AYRI ONAYLA): stk_varyant_coz eski gövdesine döner (ölçü yalnız ada göre). Veriye dokunmaz.
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
do $$
declare
  o text;
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'Paket Ö postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  select md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) into o from pg_proc p where p.oid = to_regprocedure('public.stk_varyant_coz(text,text,text,text,text)');
  if o is null then raise exception 'stk_varyant_coz bulunamadı. Hiçbir şey değişmedi.'; end if;
  if o not in ('8420a7f901793cc7441eb9f895c46698', 'c4356478fc7cb2346bf8ca4e0cacbed2') then
    raise exception 'stk_varyant_coz gövdesi beklenen iki sürümden biri değil (özet %). Hiçbir şey değişmedi — sonucu gönderin.', o;
  end if;
  create or replace function public.stk_varyant_coz(p_urun_id text, p_renk_id text, p_renk text, p_olcu_id text, p_olcu text) returns text language plpgsql volatile security definer set search_path = public as '
declare
  rid text := public.stk_renk_coz(p_renk_id, p_renk);
  oid_ text := public.stk_olcu_coz(p_olcu_id, p_olcu);
  v text;
begin
  if not exists (select 1 from public.urunler where id = p_urun_id) then
    raise exception ''Ürün bulunamadı: %'', p_urun_id using errcode = ''P0002'';
  end if;
  select id into v from public.stk_varyant
   where urun_id = p_urun_id and coalesce(renk_id, '''') = coalesce(rid, '''') and coalesce(olcu_id, '''') = coalesce(oid_, '''');
  if v is null then
    insert into public.stk_varyant (urun_id, renk_id, olcu_id) values (p_urun_id, rid, oid_)
    on conflict do nothing
    returning id into v;
    if v is null then   -- aynı anda başka işlem açtı
      select id into v from public.stk_varyant
       where urun_id = p_urun_id and coalesce(renk_id, '''') = coalesce(rid, '''') and coalesce(olcu_id, '''') = coalesce(oid_, '''');
    end if;
  end if;
  return v;
end ';
end $$;
with cel as (select u.id, u.ad, coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden') as tip, o.tur, count(*) as n, string_agg(o.ad, ', ' order by o.ad) as olculer
   from public.stk_varyant v join public.urunler u on u.id = v.urun_id join public.stk_olcu o on o.id = v.olcu_id
  where coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden') in ('Beden', 'Boyut') and o.tur in ('Beden', 'Boyut') and o.tur <> coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden')
  group by u.id, u.ad, u.olcu_tipi, o.tur)
select 1 as no, 'stk_varyant_coz gövdesi' as kontrol, case md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) when '8420a7f901793cc7441eb9f895c46698' then 'YENİ — ölçü ürünün grubunda çözülür (Paket Ö KURULU)' when 'c4356478fc7cb2346bf8ca4e0cacbed2' then 'ESKİ — ölçü yalnız ada göre çözülür (Paket Ö KURULU DEĞİL)' else 'BEKLENMEYEN GÖVDE — sonucu gönder' end as durum
  from pg_proc p where p.oid = to_regprocedure('public.stk_varyant_coz(text,text,text,text,text)')
union all select 2, 'fonksiyon authenticated / anon tarafından doğrudan çağrılamaz', case when has_function_privilege('authenticated', to_regprocedure('public.stk_varyant_coz(text,text,text,text,text)'), 'execute') or has_function_privilege('anon', to_regprocedure('public.stk_varyant_coz(text,text,text,text,text)'), 'execute') then 'HAYIR' else 'evet' end
union all select 3, 'BİLGİ · ölçü tipi ile varyantının ölçü grubu ÇELİŞEN ürün (Paket Ö kuruluyken bu ürünlerde işlem AÇIK HATA verir)', (select count(*)::text || ' ürün' || coalesce(' — ' || string_agg(ad || ' [ürün ' || tip || ', varyant ' || tur || ' ×' || n || ']', ' ; '), '') from cel)
order by 1;
