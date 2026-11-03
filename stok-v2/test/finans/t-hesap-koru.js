const assert=require('assert/strict');assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak'),id=T.ON;
function ok(ad,p){const r=T.rpc(ad,p);assert(r.ok,JSON.stringify(r));return r.sonuc;}
function red(p){const r=T.rpc('kas_yaz',p);assert.equal(r.ok,false);assert.equal(r.kod,'KR010',JSON.stringify(r));}
ok('kas_yaz',{hesaplar:[{id,tur:'banka',veri:{ad:'Test bankası',paraBirimi:'TRY'}}]});
const fis=ok('fis_kes',{istek:id+'i',fis:{aile:'para',tur:'Tahsilat',onek:'TH',tutar:100},kasa:{hareketler:[{id:id+'h',hesap_id:id,veri:{yon:'Giriş',tutar:100,paraBirimi:'TRY'}}]}}).fisNo;
red({hesapSil:[id]});red({hesaplar:[{id,tur:'banka',veri:{paraBirimi:'USD'}}]});red({hesaplar:[{id,tur:'kasa',veri:{paraBirimi:'TRY'}}]});
assert.equal(T.psql(`select aktif from public.kas_hesap where id='${id}'`),'t');
ok('kas_yaz',{hesaplar:[{id,tur:'banka',veri:{ad:'Yeni ad',paraBirimi:'TRY'}}]});
ok('fis_iptal',{no:fis});ok('kas_yaz',{hesapSil:[id]});
const r=T.rpc('fis_kes',{istek:id+'kapali',fis:{aile:'para',tur:'Tahsilat',onek:'TH'},kasa:{hareketler:[{id:id+'kapalih',hesap_id:id,veri:{tutar:10,yon:'Giriş'}}]}});assert.equal(r.ok,false);assert.equal(r.kod,'KR010');
assert.equal(T.psql(`select count(*) from public.stk_fis where istek='${id}kapali'`),'0');
console.log('✓ Kasa/banka: bakiyeli hesap kapanamaz; geçmişin para birimi/türü değişmez; ad düzenlenir; iptal sonrası sıfır hesap kapanır; kapalı hesaba yarım fiş yazılmaz');
