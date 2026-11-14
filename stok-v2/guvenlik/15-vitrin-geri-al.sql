-- 15-vitrin-geri-al.sql — 15-vitrin-kapat.sql'i geri alır: yedeklenen anon / PUBLIC yetkilerini birebir geri verir.
begin;
do $$
declare r record;
begin
  if to_regclass('guvenlik.vitrin_yetki_yedek') is null then raise exception 'yedek yok — 15-vitrin-kapat.sql hiç çalışmamış'; end if;
  for r in select distinct grantee, privilege_type from guvenlik.vitrin_yetki_yedek loop
    execute format('grant %s on public.vitrin_urunler to %s', r.privilege_type, case when r.grantee = 'PUBLIC' then 'public' else quote_ident(r.grantee) end);
  end loop;
end $$;
drop table guvenlik.vitrin_yetki_yedek;
commit;
select has_table_privilege('anon', 'public.vitrin_urunler', 'select') as anon_okur;
