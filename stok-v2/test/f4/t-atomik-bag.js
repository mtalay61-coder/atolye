const assert=require('assert/strict');assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak'),id=T.ON,k=id+'-k';const s=T.siparisKur(T.sipObj(id,[T.kalemObj(k,20,0)]));
const diger=id+'-d',dk=diger+'k';T.siparisKur(T.sipObj(diger,[T.kalemObj(dk,20,0)]));
T.psql(`create table if not exists public.stok_rezervasyonlari(id text primary key,siparis_id text,miktar numeric,tuketilen numeric);
 insert into public.stok_rezervasyonlari values('${id}-r','${id}',10,2);
 insert into public.uretim(id,ek) values('${id}-u','{"rezervasyonSiparisId":"${id}"}');
 insert into public.lst_kayit(tablo,id,veri) values('koliler','${id}-ko','{"siparisId":"${id}","miktar":7}');
 update public.siparis_kalemleri set rezervasyonlar='[{"siparisId":"${id}","miktar":8},{"siparisId":"${diger}","miktar":3}]' where id='${dk}';
 update public.siparisler set ek='{"rezervasyonSiparisId":"${id}","rezervasyonSiparisIdleri":["${id}","${diger}"]}' where id='${diger}';`);
const p=T.teslimYuku({s,kalemId:k,adet:4,ekran:0,istek:id+'-i'});assert(T.rpc('fis_kes',p).ok);
// Bilerek son adımı düşür: önceki fiş/stok/üretim/koli/rezervasyon değişiklikleri de geri alınmalı.
T.psql(`create or replace function public.test_f4_dus() returns trigger language plpgsql as $$ begin raise exception 'F4 son adım kesintisi'; end $$;
 create trigger test_f4_dus before update on public.siparisler for each row when (new.durum='İptal') execute function public.test_f4_dus();`);
try{assert.equal(T.rpc('fis_bag_coz',{siparisId:id}).ok,false);assert.equal(T.psql(`select count(*) from public.stk_hareket where kalem_id='${k}'`),'1');assert.equal(T.psql(`select count(*) from public.stok_rezervasyonlari where siparis_id='${id}'`),'1');assert.equal(T.psql(`select veri->>'siparisId' from public.lst_kayit where id='${id}-ko'`),id);}finally{T.psql('drop trigger test_f4_dus on public.siparisler;drop function public.test_f4_dus();');}
const r=T.rpc('fis_bag_coz',{siparisId:id});assert(r.ok,JSON.stringify(r));assert(r.sonuc.baglarAtomik);
assert.equal(T.psql(`select count(*) from public.stok_rezervasyonlari where siparis_id='${id}'`),'0');
assert.equal(T.psql(`select ek ? 'rezervasyonSiparisId' from public.uretim where id='${id}-u'`),'f');
assert.equal(T.psql(`select veri->>'siparisId' is null from public.lst_kayit where id='${id}-ko'`),'t');
assert.equal(T.psql(`select veri->>'miktar' from public.lst_kayit where id='${id}-ko'`),'7');
assert.equal(T.psql(`select jsonb_array_length(rezervasyonlar) from public.siparis_kalemleri where id='${dk}'`),'1');
assert.deepEqual(T.jsonSorgu(`select ek from public.siparisler where id='${diger}'`)[0].ek,{rezervasyonSiparisIdleri:[diger]});
assert.equal(T.kalemDb(k).karsilanan,4);assert(T.rpc('fis_bag_coz',{siparisId:id}).ok);
console.log('✓ F4: son adım hatasında tam rollback; üretim/koli/rezervasyon/kalem zinciri atomik çözülür; miktarlar ve başka siparişin payı korunur; tekrar güvenli');
