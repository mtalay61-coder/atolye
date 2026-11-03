const assert=require('assert/strict');assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');const T=require('../f0/ortak'),id=T.ON,k=id+'k';const s=T.siparisKur(T.sipObj(id,[T.kalemObj(k,20,0)]));
T.psql('alter table public.uretim add column if not exists rezervasyon_siparis_id text');
function kim(sql){try{T.psql(`\\set VERBOSITY verbose\nselect set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',false);set role authenticated;${sql};`);return null;}catch(e){return(String(e.stderr).match(/ERROR:\s+([0-9A-Z]{5}):/)||[])[1];}}
assert.equal(kim(`update public.siparisler set durum='İptal' where id='${id}'`),'KR006','REST tek başına iptal yapamaz');
const r=T.rpc('fis_bag_coz',{siparisId:id});assert(r.ok,JSON.stringify(r));
assert.equal(kim(`insert into public.stok_rezervasyonlari(id,siparis_id,miktar) values('${id}r','${id}',5)`),'KR006');
T.psql(`insert into public.uretim(id) values('${id}u')`);
assert.equal(kim(`update public.uretim set rezervasyon_siparis_id='${id}' where id='${id}u'`),'KR006');
const koli=T.rpc('lst_yaz',{tablo:'koliler',kayitlar:[{id:id+'ko',veri:{siparisId:id}}]});assert.equal(koli.ok,false);assert.equal(koli.kod,'KR006');
const alt=T.rpc('alt_yaz',{siparis_kalemleri:{satirlar:[{id:k,rezervasyonlar:[{siparisId:id,miktar:5}]}]}});assert.equal(alt.ok,false);assert.equal(alt.kod,'KR006');
const bos=id+'-bos';T.siparisKur(T.sipObj(bos,[T.kalemObj(bos+'k',10,0)]));const sil=T.rpc('fis_bag_coz',{siparisId:bos,sil:true});assert(sil.ok,JSON.stringify(sil));assert.equal(T.psql(`select count(*) from public.siparisler where id='${bos}'`),'0');assert(T.rpc('fis_bag_coz',{siparisId:bos,sil:true}).sonuc.zatenSilinmis);
console.log('✓ REST iptali engelli; iptal siparişe stok/üretim/koli/kalem rezervasyonu bağlanamaz; teslimsiz silme atomik ve tekrar güvenli');
