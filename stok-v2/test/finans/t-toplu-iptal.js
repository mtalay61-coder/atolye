const assert=require('assert/strict');assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak'),id=T.ON;
function kes(a){const r=T.rpc('fis_kes',{istek:id+a,fis:{aile:'stok',tur:'Üretim',onek:'ÜRT'},stok:{satirlar:[{id:id+a+'h',urunId:'u-yeni',miktar:2,kaynak:'Üretim'}]}});assert(r.ok,JSON.stringify(r));return r.sonuc.fisNo;}
const a=kes('a'),b=kes('b');
const red=T.rpc('fis_iptal_toplu',{fisler:[a,'zz-yok'],sebep:'Kesinti'});assert.equal(red.ok,false);
assert.equal(T.psql(`select iptal from public.stk_fis where id='${a}'`),'f');assert.equal(T.psql(`select iptal from public.stk_hareket where fis_id='${a}'`),'f');
const r=T.rpc('fis_iptal_toplu',{fisler:[b,a]});assert(r.ok,JSON.stringify(r));assert.equal(T.psql(`select bool_and(iptal) from public.stk_fis where id in ('${a}','${b}')`),'t');
assert(T.rpc('fis_iptal_toplu',{fisler:[a,b]}).ok);
console.log('✓ Toplu üretim fişi iptali: son fiş bulunamazsa önceki de geri alınır; iki fiş atomik iptal ve tekrar güvenli');
