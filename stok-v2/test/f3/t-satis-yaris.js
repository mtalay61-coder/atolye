const assert=require('assert/strict');
assert((process.env.PGHOST||'').startsWith('/')||['127.0.0.1','localhost','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak.js');
(async()=>{
 const n=Number(process.env.F3_N||100);assert(Number.isInteger(n)&&n>0&&n<=1000);
 for(let i=0;i<n;i++){
  const id=T.ON+'-'+i,k=id+'-k',s=T.siparisKur(T.sipObj(id,[T.kalemObj(k,20,0)]));
  const yuk=(adet,ekran,istek)=>T.teslimYuku({s,kalemId:k,adet,ekran,istek:id+istek});
  const ilk=T.rpc('fis_kes',yuk(14,0,'-ilk'));assert(ilk.ok,ilk.hata);
  const isler=i%2?[yuk(5,14,'-b'),yuk(5,14,'-a')]:[yuk(5,14,'-a'),yuk(5,14,'-b')];
  const r=await Promise.all(isler.map(p=>T.rpcAyri('fis_kes',p)));
  assert.equal(r.filter(x=>x.ok).length,1,JSON.stringify(r));
  assert(r.some(x=>!x.ok&&/Satış siparişi miktarı aşılıyor/.test(x.hata)),JSON.stringify(r));
  assert.equal(T.kalemDb(k).karsilanan,19);assert.equal(T.teslimDb(k),19);
  const o=T.jsonSorgu(`select (select count(*) from public.stk_fis where siparis_id='${id}')::int as fis,
    (select count(*) from public.stk_hareket where kalem_id='${k}')::int as hareket,
    (select sum(c.tutar) from public.car_hareket c join public.stk_fis f on f.id=c.fis_id where f.siparis_id='${id}')::float as cari`)[0];
  assert.deepEqual(o,{fis:2,hareket:2,cari:1900},'Reddedilen istek kısmi fiş/cari/stok bırakmamalı');
 }
 console.log(`✓ F3 gerçek PostgreSQL ${n} yarış: her çiftte bir kabul/bir kural reddi; 19/20, iki fiş, iki hareket, cari 1900; 0 kilitlenme/bozuk`);
})().catch(e=>{console.error(e);process.exitCode=1;});
