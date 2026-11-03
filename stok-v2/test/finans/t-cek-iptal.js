const assert=require('assert/strict');
assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak');const id=T.ON;
const c={id,durum:'Portföyde',tutar:500,paraBirimi:'TRY',gecmis:[]};
function ok(ad,p){const r=T.rpc(ad,p);assert(r.ok,JSON.stringify(r));return r.sonuc;}
function yuk(onceki,ek){return {istek:id+ek,fis:{aile:'para',tur:'Çek tahsili',onek:'ÇT',tutar:500},kasa:{hareketler:[{id:id+ek+'h',hesap_id:'K1',veri:{yon:'Giriş',tutar:500}}],cekler:[{id,onceki,veri:{...onceki,durum:'Tahsil Edildi',gecmis:[...(onceki.gecmis||[]),{id:ek}]}}]}};}
ok('kas_yaz',{cekler:[{id,veri:c,onceki:null}]});
const p=yuk(c,'a'),f=ok('fis_kes',p).fisNo;
const iptal=ok('fis_iptal',{no:f});assert.deepEqual(iptal.cekler,[{id,veri:c}]);
assert.deepEqual(T.jsonSorgu(`select veri from public.kas_cek where id='${id}'`)[0].veri,c);
assert.equal(T.psql(`select bool_and(iptal) from public.kas_hareket where fis_id='${f}'`),'t');
assert(ok('fis_iptal',{no:f}).zatenIptal);
const p2=yuk(c,'b'),f2=ok('fis_kes',p2).fisNo;
ok('fis_iptal',{no:f});assert.equal(T.jsonSorgu(`select veri from public.kas_cek where id='${id}'`)[0].veri.durum,'Tahsil Edildi');
let guncel=T.jsonSorgu(`select veri from public.kas_cek where id='${id}'`)[0].veri;
ok('kas_yaz',{cekler:[{id,onceki:guncel,veri:{...guncel,not:'Sonraki değişiklik'}}]});
const r=T.rpc('fis_iptal',{no:f2});assert.equal(r.ok,false);assert.equal(r.kod,'KR008');
assert.equal(T.psql(`select iptal from public.stk_fis where id='${f2}'`),'f','Ret kısmi iptal bırakmamalı');
ok('kas_yaz',{cekler:[{id,onceki:{...guncel,not:'Sonraki değişiklik'},veri:guncel}]});
ok('fis_iptal',{no:f2});
assert.equal(T.psql(`select count(*) from public.fis_cek_iz where cek_id='${id}'`),'2');
const ic=T.rpc('kas_cek_kilitle',{cekler:[]});assert.equal(ic.ok,false);assert.equal(ic.kod,'42501');
console.log('✓ Çek/fiş/kasa atomik iptal; eski iptal tekrarı yeni tahsili bozmaz; sonraki değişiklikte tam ret; iki audit korunur; iç RPC kapalı');
