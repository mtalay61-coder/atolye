const assert=require('assert/strict');assert(['localhost','127.0.0.1','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');const T=require('../f0/ortak'),id=T.ON;let n=0;
for(const m of ['NaN','Infinity','-Infinity',null,'bozuk'])for(const tur of ['stok','cari','kasa']){
 const k=id+n++;const p={istek:k,fis:{aile:tur==='stok'?'stok':'para',tur:'Test',onek:tur==='stok'?'ST':'TH'}};
 if(tur==='stok'&&(m===null||m==='bozuk'))continue;
 if(tur==='stok')p.stok={satirlar:[{id:k,urunId:'u-yeni',miktar:m}]};
 if(tur==='cari')p.cari={satirlar:[{id:k,cari_id:'c-yeni',yon:'Borç',tutar:m}]};
 if(tur==='kasa')p.kasa={hareketler:[{id:k,hesap_id:'K1',veri:{tutar:m,yon:'Giriş'}}]};
 const r=T.rpc('fis_kes',p);assert.equal(r.ok,false,JSON.stringify(r));assert.equal(r.kod,tur==='stok'?'KR007':'KR010',JSON.stringify(r));assert.equal(T.psql(`select count(*) from public.stk_fis where istek='${k}'`),'0');
}
console.log('✓ Stok/cari/kasa NaN ve sonsuz miktar/tutar: 13 ret, 0 yarım fiş');
