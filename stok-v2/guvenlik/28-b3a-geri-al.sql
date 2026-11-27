-- =====================================================================================================================
--  28-b3a-geri-al.sql — B3a GERİ ALMA (AYRI ONAYLA). Tetikleyiciler ve b3a_yazma_koru kalkar; politikalar / yetkiler zaten değişmemişti.
--  ETKİ: B3a açığı yeniden açılır (listede olmayan hesap ERP tablolarına doğrudan yazabilir). Tek ifade; doğrulama tutmazsa hiçbir şey değişmez.
-- =====================================================================================================================
do $$
declare
  r record;
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'B3a geri alma postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  for r in select c.relname from pg_trigger g join pg_class c on c.oid = g.tgrelid where g.tgname = 'b3a_yazma_koru' loop
    execute format('drop trigger b3a_yazma_koru on public.%I', r.relname);
  end loop;
  drop function if exists public.b3a_yazma_koru();
  if exists (select 1 from pg_trigger where tgname = 'b3a_yazma_koru') or to_regprocedure('public.b3a_yazma_koru()') is not null then
    raise exception 'B3a geri alma doğrulaması tutmadı — HİÇBİR şey değişmedi';
  end if;
end $$;
select 'GENEL' as kontrol, case when to_regprocedure('public.b3a_yazma_koru()') is null and not exists (select 1 from pg_trigger where tgname = 'b3a_yazma_koru')
  then 'GERİ ALINDI' else 'KALDIRILAMADI' end as durum;
