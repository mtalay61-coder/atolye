const assert=require('assert/strict'),fs=require('fs'),path=require('path');assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');const T=require('../f0/ortak');
T.psql(fs.readFileSync(path.join(__dirname,'../../../rls-kimlik.sql'),'utf8'));
function red(sql){let kod;try{T.psql(`\\set VERBOSITY verbose\nselect set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',false);set role authenticated;${sql};`);}catch(e){kod=(String(e.stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)||[])[1];}assert.equal(kod,'42501',sql);}
for(const t of ['fis_cek_iz','fis_karsilanan_iz','fis_sayac','stk_istemci_iz'])red(`select count(*) from public.${t}`);
red("update public.fis_sayac set son=0");red('delete from public.fis_cek_iz');
assert.equal(T.rpc('kas_cek_kilitle',{}).kod,'42501');
T.psql("select set_config('request.jwt.claims','{\"email\":\"ali@atolye.local\",\"role\":\"authenticated\"}',false);set role authenticated;select count(*) from public.siparisler_okuma;");
console.log('✓ Genel RLS betiği tekrar kuruldu: fiş sayacı/çek audit/karşılanan audit/istemci izleri özel; iç RPC kapalı; yetkili sipariş görünümü okunabilir');
