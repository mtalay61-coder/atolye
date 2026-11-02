const assert=require('assert/strict');assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');const T=require('../f0/ortak');
(async()=>{
 const n=Number(process.env.REZ_N||100);assert(Number.isInteger(n)&&n>0&&n<=1000);
 T.psql(`create or replace function public.test_rez_yaz(p jsonb) returns jsonb language plpgsql as $$ begin
 insert into public.stok_rezervasyonlari(id,siparis_id,miktar,tuketilen) values(p->>'id',p->>'siparisId',5,0);return '{}'::jsonb;end $$;
 revoke all on function public.test_rez_yaz(jsonb) from public,anon;grant execute on function public.test_rez_yaz(jsonb) to authenticated;`);
 try{
  for(let i=0;i<n;i++){
   const id=T.ON+i;T.siparisKur(T.sipObj(id,[T.kalemObj(id+'k',20,0)]));
   const isler=[()=>T.rpcAyri('fis_bag_coz',{siparisId:id}),()=>T.rpcAyri('test_rez_yaz',{id:id+'r',siparisId:id})];
   const r=i%2?await Promise.all(isler.map(f=>f())):await Promise.all([...isler].reverse().map(f=>f())).then(x=>x.reverse());
   assert(r[0].ok,JSON.stringify(r));assert(r[1].ok||/İptal edilmiş veya silinmiş/.test(r[1].hata),JSON.stringify(r));
   assert.equal(T.psql(`select count(*) from public.stok_rezervasyonlari where siparis_id='${id}'`),'0');assert.equal(T.sipDb(id).durum,'İptal');
  }
  console.log(`✓ ${n} iptal/yeni rezervasyon yarışı: her iptal tamamlandı, iptal siparişte aktif rezervasyon kalmadı`);
 }finally{T.psql('drop function public.test_rez_yaz(jsonb)');}
})().catch(e=>{console.error(e);process.exitCode=1;});
