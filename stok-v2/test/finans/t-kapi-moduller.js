const assert=require('assert/strict');assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak'),id=T.ON;
function rpc(ad,p){try{return{ok:true,r:T.psql(`\\set VERBOSITY verbose\nselect set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',false);select set_config('request.headers','{"x-atolye-surum":"1.744.3"}',false);set role authenticated;select public.${ad}($data$${JSON.stringify(p)}$data$::jsonb);`)}}catch(e){return{ok:false,kod:(String(e.stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)||[])[1]};}}
try{
 T.psql("select public.fis_kural_kapat();update public.stk_ayar set min_istemci_surum='1.744.3' where id='tekil';");
 assert.equal(T.psql('select public.fis_kural_aktif()'),'t','Minimum sürüm açıkken eski kapı tekrar açılamaz');
 const isler=[['stk_yaz',{satirlar:[{id:id+'h',fisId:id+'f',urunId:'u-yeni',miktar:2}]}],['car_yaz',{satirlar:[{id:id+'c',cari_id:'c-yeni',tutar:25}]}],['kas_yaz',{hareketler:[{id:id+'m',hesap_id:'K1',veri:{tutar:25}}]}]];
 for(const [ad,p] of isler){const r=rpc(ad,p);assert.equal(r.ok,false,ad);assert.equal(r.kod,'KR009',ad);}
 const p={istek:id+'i',fis:{aile:'stok',tur:'Manuel',onek:'ST'},stok:{satirlar:[{id:id+'modern',urunId:'u-yeni',miktar:2,kaynak:'Manuel'}]}};
 assert(rpc('fis_kes',p).ok,'Güncel fiş yolu çalışmalı');
 assert.equal(T.psql(`select count(*) from public.stk_hareket where id='${id}h'`),'0');
 assert.equal(T.psql(`select count(*) from public.stk_fis where id='${id}f'`),'0');
 console.log('✓ Etkin protokol: fis_aktif=false bile stok/cari/kasa eski kapıları KR009; yarım kayıt yok; güncel fis_kes çalışır');
}finally{T.psql("update public.stk_ayar set min_istemci_surum=null where id='tekil';select public.fis_kural_ac();");}
