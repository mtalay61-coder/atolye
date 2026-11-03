const assert=require('assert/strict');
assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak');
(async()=>{
 const n=Number(process.env.FINANS_N||100);assert(Number.isInteger(n)&&n>0&&n<=1000);
 for(let i=0;i<n;i++){
  const id=T.ON+'-'+i,c={id,durum:'Portföyde',tip:'Alınan',tutar:500,paraBirimi:'TRY',gecmis:[]};
  const kur=T.rpc('kas_yaz',{cekler:[{id,veri:c,onceki:null}]});assert(kur.ok,JSON.stringify(kur));
  const yuk=(a)=>({istek:id+a,fis:{aile:'para',tur:'Çek tahsili',onek:'ÇT',tutar:500,kaynak:'Çek'},kasa:{
   hareketler:[{id:id+'-h'+a,hesap_id:'K1',veri:{id:id+'-h'+a,yon:'Giriş',tutar:500,paraBirimi:'TRY'}}],
   cekler:[{id,onceki:c,veri:{...c,durum:'Tahsil Edildi',gecmis:[{id:id+a,islem:'Tahsil Edildi',oncekiDurum:'Portföyde',yeniDurum:'Tahsil Edildi'}]}}]}});
  const a=yuk('a'),b=yuk('b');const r=await Promise.all([T.rpcAyri('fis_kes',a),T.rpcAyri('fis_kes',b)]);
  assert.equal(r.filter(x=>x.ok).length,1,JSON.stringify(r));
  assert(r.some(x=>!x.ok&&/Çek başka cihazda/.test(x.hata)),JSON.stringify(r));
  assert.equal(Number(T.psql(`select sum((veri->>'tutar')::numeric) from public.kas_hareket where id in ('${id}-ha','${id}-hb')`)),500);
  const kazanan=r[0].ok?a:b;const tekrar=T.rpc('fis_kes',kazanan);assert(tekrar.ok,JSON.stringify(tekrar));assert(tekrar.sonuc.zatenVar);
  const once=T.psql(`select veri from public.kas_cek where id='${id}'`);
  const eski=T.rpc('kas_yaz',{cekler:[{id,onceki:c,veri:{...c,durum:'Tahsilde'}}]});assert.equal(eski.ok,false);assert.equal(eski.kod,'KR008');
  assert.equal(T.psql(`select veri from public.kas_cek where id='${id}'`),once);
 }
 console.log(`✓ Çek ${n} yarış: tek tahsil / tek 500 kasa hareketi; güvenli tekrar; bayat çek yazması KR008`);
})().catch(e=>{console.error(e);process.exitCode=1;});
