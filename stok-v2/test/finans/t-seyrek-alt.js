const assert=require('assert/strict');assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');const T=require('../f0/ortak'),id=T.ON,a=id+'a',b=id+'b';
T.siparisKur(T.sipObj(id,[T.kalemObj(a,20,0),T.kalemObj(b,30,0)]));
const r=T.rpc('alt_yaz',{siparis_kalemleri:{satirlar:[{id:a,fiyat:123},{id:b,planlama:{tip:'Üretim',referansNo:'uret-1'}}]}});assert(r.ok,JSON.stringify(r));
assert.deepEqual(T.jsonSorgu(`select id,fiyat::float as fiyat,planlama,miktar::float as miktar from public.siparis_kalemleri where id in ('${a}','${b}') order by id`),[{id:a,fiyat:123,planlama:null,miktar:20},{id:b,fiyat:100,planlama:{tip:'Üretim',referansNo:'uret-1'},miktar:30}]);
const tekrar=T.rpc('alt_yaz',{siparis_kalemleri:{satirlar:[{id:a,fiyat:140},{id:a,fiyat:150},{id:b,planlama:null}]}});assert(tekrar.ok);assert.equal(T.psql(`select fiyat from public.siparis_kalemleri where id='${a}'`),'150');assert.equal(T.psql(`select planlama is null from public.siparis_kalemleri where id='${b}'`),'t');
console.log('✓ Aynı yükte farklı alanları düzenleyen kalemler birbirinin fiyat/planlamasını NULL yapmaz; son aynı-kimlik kazanır, açık null alanı temizler');

const hatali=T.rpc('alt_yaz',{siparis_kalemleri:{satirlar:[{id:a,fiyat:999},{id:b,yanlisFiyat:300}]}});assert.equal(hatali.ok,false);assert.equal(hatali.kod,'KR010');assert.equal(T.psql(`select fiyat from public.siparis_kalemleri where id='${a}'`),'150');
console.log('✓ Tanınmayan alan bütün işlemi reddeder; önceki geçerli satır da kısmi yazılmaz');
