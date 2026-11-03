// Gerçek istemci taşıma katmanı: geri alınmış SQL transaction tekrarında aynı idempotency gövdesi kullanılır.
const assert=require('assert/strict');
global.window={localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}};
const E=require('./erp.cjs');
(async()=>{
 let istekler=[],kod='40P01',hep=false;
 global.fetch=async(url,p)=>{istekler.push(p.body);const hata=hep||istekler.length===1;const veri=hata?{code:kod,message:'Test SQL transaction reddi'}:{fisNo:'ST-TEST'};return{ok:!hata,status:hata?400:200,json:async()=>veri,text:async()=>JSON.stringify(veri)};};
 const body=JSON.stringify({p:{istek:'ayni-istek'}});
 assert.equal((await E.supabaseIstek('rpc/fis_kes',{method:'POST',body})).fisNo,'ST-TEST');assert.deepEqual(istekler,[body,body]);
 istekler=[];kod='40001';assert.equal((await E.supabaseIstek('rpc/fis_iptal_toplu',{method:'POST',body})).fisNo,'ST-TEST');assert.equal(istekler.length,2);
 istekler=[];hep=true;kod='40P01';await assert.rejects(E.supabaseIstek('rpc/fis_kes',{method:'POST',body}));assert.equal(istekler.length,3);
 istekler=[];kod='AT001';await assert.rejects(E.supabaseIstek('rpc/fis_kes',{method:'POST',body}),e=>e.kaliciRet&&e.kod==='AT001');assert.equal(istekler.length,1);
 console.log('✓ SQL 40P01/40001: aynı gövdeyle en çok iki tekrar; AT001 kalıcı ret tek deneme');
})().catch(e=>{console.error(e);process.exitCode=1;});
