const assert=require('assert/strict');
assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak');const id=T.ON,k=id+'k',s=T.siparisKur(T.sipObj(id,[T.kalemObj(k,20,0)]));
const once=T.psql(`select row_to_json(x) from public.siparis_kalemleri x where id='${k}'`);
function yaz(surum){try{T.psql(`\\set VERBOSITY verbose\nselect set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',false);select set_config('request.headers','${JSON.stringify(surum?{'x-atolye-surum':surum}:{})}',false);set role authenticated;select public.alt_yaz('{"siparis_kalemleri":{"satirlar":[{"id":"${k}","fiyat":1}]}}');`);return null;}catch(e){return (String(e.stderr).match(/ERROR:\s+([0-9A-Z]{5}):/)||[])[1];}}
try{
 T.psql("update public.stk_ayar set min_istemci_surum='1.744.3' where id='tekil'");
 for(const surum of [null,'1.742.1','1.744.2','bozuk','1.744.3.1','999999999999.0.0']){
  assert.equal(yaz(surum),'AT001');assert.equal(T.psql(`select row_to_json(x) from public.siparis_kalemleri x where id='${k}'`),once);
 }
 assert.equal(yaz('1.744.3'),null);assert.equal(T.psql(`select fiyat from public.siparis_kalemleri where id='${k}'`),'1');
 T.psql("update public.stk_ayar set min_istemci_surum='1.9.0' where id='tekil'");assert.equal(yaz('1.10.0'),null);
 console.log('✓ Sürüm kapısı: sürümsüz/eski/bozuk istemci hiç yazamaz; güncel ve sayısal 1.10 > 1.9 geçer; SQL bakım oturumu korunur');
}finally{T.psql("update public.stk_ayar set min_istemci_surum=null where id='tekil'");}
