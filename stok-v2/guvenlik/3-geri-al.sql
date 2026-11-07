-- =====================================================================================================================
--  GÜVENLİK SIKILAŞTIRMA — GERİ ALMA (3-geri-al.sql). 2-sikilastir.sql'in yaptığını guvenlik.yedek tablosundan BİREBİR geri kurar:
--   · her fonksiyonun yetki listesi sıkılaştırmadan önceki hâline (anon, PUBLIC, authenticated, service_role ve diğerleri),
--   · search_path ayarı önceki hâline (önce yoksa kaldırılır),
--   · varsayılan yetki değişikliği geri.
--  Tek işlem; bir adım düşerse hiçbir şey değişmez. Sonda karşılaştırma: her fonksiyonun yetki listesi ve ayarı yedekle aynı
--  olmalı, değilse geri alma da geri alınır. Uygulanmış sıkılaştırma yoksa "geri alınacak bir şey yok" der.
--  Yedek satırları SİLİNMEZ, "geri alındı" diye işaretlenir (iz kalsın); sıkılaştırma yeniden çalıştırılabilir.
-- =====================================================================================================================
do $$
declare
  v_uyg text := 'g1';
  r record; a record; c text; yol text; uyusmayan text;
begin
  perform set_config('search_path', 'pg_catalog', true);
  if to_regclass('guvenlik.yedek') is null or not exists (select 1 from guvenlik.yedek where uygulama = v_uyg) then
    raise notice 'Geri alınacak güvenlik sıkılaştırması (%) yok — değişiklik yok.', v_uyg;
    return;
  end if;

  for r in select * from guvenlik.yedek where uygulama = v_uyg and tur = 'fonksiyon' order by id loop
    if to_regprocedure(r.imza) is null then
      raise notice 'Bilgi: % artık yok (sonradan silinmiş) — atlandı.', r.imza;
      continue;
    end if;
    -- Yetki listesi: bu oturumun verebileceği bütün yetkiler alınır, yedekteki liste aynen yeniden verilir
    execute format('revoke all on function %s from public, anon, authenticated, service_role', r.imza);
    for a in select * from aclexplode(r.acl) loop
      execute format('grant execute on function %s to %s', r.imza,
        case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end);
    end loop;
    -- search_path: yedekte varsa o değer, yoksa ayar kaldırılır
    select substr(cc, length('search_path=') + 1) into yol from unnest(coalesce(r.config, '{}')) cc where cc like 'search_path=%';
    if yol is null then
      execute format('alter function %s reset search_path', r.imza);
    else
      execute format('alter function %s set search_path = %s', r.imza, yol);
    end if;
  end loop;

  for r in select * from guvenlik.yedek where uygulama = v_uyg and tur = 'varsayilan' order by id desc loop
    execute r.geri_al;
  end loop;

  -- KARŞILAŞTIRMA: yetki listesi (sıra ve yetki veren rol hariç: kim, hangi yetki) ve ayarlar yedekle aynı mı
  select string_agg(r2.imza, ', ') into uyusmayan
    from guvenlik.yedek r2 join pg_proc p on p.oid = to_regprocedure(r2.imza)
   where r2.uygulama = v_uyg and r2.tur = 'fonksiyon'
     and ((select array_agg(distinct x.grantee::text || ':' || x.privilege_type) from aclexplode(r2.acl) x)
          is distinct from
          (select array_agg(distinct x.grantee::text || ':' || x.privilege_type) from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x)
       or coalesce(r2.config, '{}') is distinct from coalesce(p.proconfig, '{}'));
  if uyusmayan is not null then raise exception 'GERİ ALMA DOĞRULAMASI: önceki hâle dönmeyen fonksiyon(lar): % — hiçbir şey değişmedi', uyusmayan; end if;

  update guvenlik.yedek set uygulama = v_uyg || '-geri-alindi-' || to_char(now(), 'YYYYMMDD-HH24MISS') where uygulama = v_uyg;
  raise notice 'Güvenlik sıkılaştırması (%) geri alındı.', v_uyg;
end $$;
