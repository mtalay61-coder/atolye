// Yalnız yerel PostgreSQL: eski RPC yeni fişleri kurallar kapalıyken de değiştiremez.
const assert=require('assert/strict');
assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak');
// Red kodu: sürüm kapısı açıkken sunucu aynı reddi KR009 ile verir (fis-defteri.sql: kapı açık → KR009, değilse 42501).
// İki koruma kipi (IKI_KORUMA=1, iki-koruma/kos-iki-koruma.sh) kapıyı açık tutar.
const RED_KODU=process.env.IKI_KORUMA==='1'?'KR009':'42501';
const id=T.ON,k=id+'-k';
const s=T.siparisKur(T.sipObj(id,[T.kalemObj(k,20,0)]));
const p=T.teslimYuku({s,kalemId:k,adet:5,ekran:0,istek:id+'-i'});
function ok(r){assert(r.ok,r.hata);return r.sonuc;}
function red(ad,fn){const once=T.psql(`select row_to_json(h) from public.stk_hareket h where kalem_id='${k}'`);const r=fn();assert.equal(r.ok,false,ad);assert.equal(r.kod,RED_KODU,JSON.stringify(r));assert.equal(T.psql(`select row_to_json(h) from public.stk_hareket h where kalem_id='${k}'`),once);console.log('✓ '+ad);}
const f=ok(T.rpc('fis_kes',p)).fisNo;
const h={...p.stok.satirlar[0],fisId:f,miktar:-19};
try{
 T.psql('select public.fis_kural_kapat();');
 for(const [ad,sql] of [
  ['Fiş başlığının sunucu işareti silinemez',`update public.stk_fis set istek=null where id='${f}'`],
  ['Fiş başlığı silinemez',`delete from public.stk_fis where id='${f}'`],
  ['Hareket doğrudan silinemez',`delete from public.stk_hareket where id='${h.id}'`]
 ]){
  let kod=null;try{T.psql(`\\set VERBOSITY verbose\n${sql};`);}catch(e){kod=(String(e.stderr).match(/ERROR:\s+([0-9A-Z]{5}):/)||[])[1];}
  assert.equal(kod,RED_KODU,ad);console.log('✓ '+ad);
 }
 red('stk_yaz miktarı değiştiremez',()=>T.rpc('stk_yaz',{satirlar:[h]}));
 red('fis_yaz içinden değişiklik de reddedilir',()=>T.rpc('fis_yaz',{stok:{satirlar:[h]}}));
 const cari=T.jsonSorgu(`select * from public.car_hareket where fis_id='${f}'`)[0];
 const cariOnce=JSON.stringify(cari);
 red('Cari tutarı eski yoldan değiştirilemez',()=>T.rpc('car_yaz',{satirlar:[{...cari,tutar:99999}]}));
 red('Cari hareketi tek başına iptal edilemez',()=>T.rpc('car_yaz',{iptal:[cari.id]}));
 assert.equal(JSON.stringify(T.jsonSorgu(`select * from public.car_hareket where fis_id='${f}'`)[0]),cariOnce);
 red('Eski yol hareketi iptal edemez',()=>T.rpc('stk_yaz',{iptal:[h.id]}));
 red('Yeni hareketi mevcut fişe ekleyemez',()=>T.rpc('stk_yaz',{satirlar:[{...h,id:id+'-ek'}]}));
 red('Mevcut hareketi başka fişe taşıyamaz',()=>T.rpc('stk_yaz',{satirlar:[{...h,fisId:id+'-sahte'}]}));
 assert.equal(T.psql(`select count(*) from public.stk_fis where id='${id}-sahte'`),'0','Yarım başlık kalmamalı');
 assert(T.rpc('fis_bilgi',{no:f,aciklama:'Meşru not'}).ok);
 assert(T.rpc('fis_kes',p).sonuc.zatenVar);
 ok(T.rpc('fis_iptal',{no:f,sebep:'Yerel sınama'}));
 red('İptal edilmiş fiş yeniden açılamaz',()=>T.rpc('stk_yaz',{satirlar:[h]}));
 assert.equal(T.kalemDb(k).karsilanan,0);
 assert.equal(T.psql(`select iptal from public.stk_fis where id='${f}'`),'t');
 console.log('✓ Meşru not, idempotent tekrar ve fiş iptali çalışır');
 // Eski sisteme ait yeni bağımsız fiş bu dar korumanın dışında kalır.
 const legacy={...h,id:id+'-legacy-h',fisId:id+'-legacy-f',kalemId:null,siparisId:null,miktar:2};
 if(process.env.IKI_KORUMA==='1'){
  // Sürüm kapısı açıkken kurallar kapatılamaz (fis_kural_aktif = fis_aktif VEYA kapı): eski bağımsız kayıt da reddedilir.
  const r=T.rpc('stk_yaz',{satirlar:[legacy]});assert.equal(r.ok,false,'kapı açıkken eski bağımsız kayıt yazıldı');assert.equal(r.kod,RED_KODU,JSON.stringify(r));
  assert.equal(T.psql(`select count(*) from public.stk_hareket where id='${legacy.id}'`),'0');
  console.log('✓ Kapı açıkken eski bağımsız kayıt da reddedilir (kurallar kapatılamaz)');
 }else{
 ok(T.rpc('stk_yaz',{satirlar:[legacy]}));
 ok(T.rpc('stk_yaz',{satirlar:[{...legacy,miktar:3}]}));
 console.log('✓ Kurallar kapalı eski bağımsız kayıt akışı korunur');
 }
}finally{T.psql('select public.fis_kural_ac();');}
