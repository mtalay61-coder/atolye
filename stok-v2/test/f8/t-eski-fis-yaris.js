// Yeni fişin iptali ile bayat eski istemci yazması: fiş iptali daima tamamlanmalı.
const assert=require('assert/strict');
assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak');
(async()=>{
 const n=Number(process.env.F8_N||100);assert(Number.isInteger(n)&&n>0&&n<=1000);
 T.psql('select public.fis_kural_kapat();');
 try{
  for(let i=0;i<n;i++){
   const id=T.ON+'-'+i,k=id+'-k',s=T.siparisKur(T.sipObj(id,[T.kalemObj(k,20,0)]));
   const p=T.teslimYuku({s,kalemId:k,adet:5,ekran:0,istek:id+'-i'});
   const ilk=T.rpc('fis_kes',p);assert(ilk.ok,JSON.stringify(ilk));const f=ilk.sonuc.fisNo;
   const deg={satirlar:[{...p.stok.satirlar[0],fisId:f,miktar:-19}]};
   const isler=[()=>T.rpcAyri('fis_iptal',{no:f,sebep:'F8 yarış'}),()=>T.rpcAyri('stk_yaz',deg)];
   const r=i%2?await Promise.all(isler.map(fn=>fn())):await Promise.all([...isler].reverse().map(fn=>fn())).then(x=>x.reverse());
   assert(r[0].ok,JSON.stringify(r));assert.equal(r[1].ok,false,JSON.stringify(r));
   const o=T.jsonSorgu(`select f.iptal,(select sum(miktar) from public.stk_hareket where fis_id=f.id)::float as miktar,
    (select bool_and(iptal) from public.stk_hareket where fis_id=f.id) as stok_iptal,
    (select bool_and(iptal) from public.car_hareket where fis_id=f.id) as cari_iptal
    from public.stk_fis f where f.id='${f}'`)[0];
   assert.deepEqual(o,{iptal:true,miktar:-5,stok_iptal:true,cari_iptal:true});assert.equal(T.kalemDb(k).karsilanan,0);
  }
  console.log(`✓ F8 ${n} yarış: fiş iptali tamamlandı, eski miktar yazması reddedildi; özgün miktar ve stok/cari iptali korundu; 0 bozuk veri`);
 }finally{T.psql('select public.fis_kural_ac();');}
})().catch(e=>{console.error(e);process.exitCode=1;});
