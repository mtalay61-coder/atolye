-- Yalnız izole test DB'si. Birleştirme, hedef yokken yeniden adlandırma ve tekrarda fiş/miktar korunur.
begin;
insert into public.urunler(id,ad,kategori) values('f8-sql-u','F8 SQL ürünü','Mamul');
select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true);
set local role authenticated;
do $$ declare r jsonb; begin
  perform public.fis_kes('{"istek":"f8-sql-a","fis":{"aile":"stok","tur":"Giriş","onek":"GF"},"stok":{"satirlar":[{"id":"f8-sql-ha","urunId":"f8-sql-u","renk":"F8-SQL-A","miktar":3,"kaynak":"Manuel"}]}}');
  perform public.fis_kes('{"istek":"f8-sql-b","fis":{"aile":"stok","tur":"Giriş","onek":"GF"},"stok":{"satirlar":[{"id":"f8-sql-hb","urunId":"f8-sql-u","renk":"F8-SQL-B","miktar":5,"kaynak":"Manuel"}]}}');
  perform public.stk_yaz('{"varyantAc":[{"urunId":"f8-sql-u","renk":"F8-SQL-A","minStok":4},{"urunId":"f8-sql-u","renk":"F8-SQL-B","minStok":7}]}');
  r:=public.stk_renk_tasi('{"eslesmeler":[{"urunId":"f8-sql-u","eski":"F8-SQL-A","yeni":"F8-SQL-B"}]}');
  assert (r->>'tasinanHareket')::int=1;
  assert (select count(distinct varyant_id) from public.stk_hareket where urun_id='f8-sql-u')=1;
  assert (select count(*) from public.stk_hareket where urun_id='f8-sql-u' and not iptal)=2;
  assert (select sum(miktar) from public.stk_hareket where urun_id='f8-sql-u')=8;
  assert (select max(min_stok) from public.stk_varyant where urun_id='f8-sql-u')=7;
  r:=public.stk_renk_tasi('{"eslesmeler":[{"urunId":"f8-sql-u","eski":"F8-SQL-A","yeni":"F8-SQL-B"}]}');
  assert (r->>'varyant')::int=0, 'Tekrar yeni hareket oluşturmamalı';
  r:=public.stk_renk_tasi('{"eslesmeler":[{"urunId":"f8-sql-u","eski":"F8-SQL-B","yeni":"F8-SQL-C"}]}');
  assert (r->>'varyant')::int=1;
  assert exists(select 1 from public.stk_hareket where id='f8-sql-ha' and miktar=3 and not iptal);
  assert exists(select 1 from public.stk_hareket where id='f8-sql-hb' and miktar=5 and not iptal);
  assert (select count(distinct fis_id) from public.stk_hareket where urun_id='f8-sql-u')=2;
  raise notice 'F8 SQL temiz: birleştirme, tekrar, hedef yokken adlandırma; miktar 8, iki hareket ve iki fiş korunuyor';
end $$;
rollback;
