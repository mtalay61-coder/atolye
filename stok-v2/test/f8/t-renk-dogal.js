// Eski P8 gözlemi yalnız yazdırılıyordu. Bu koşucu kilitlenme/bozulma/yarım işlem varsa başarısız döner.
const {execFileSync}=require('child_process');
const assert=require('assert/strict');
const path=require('path');
assert((process.env.PGHOST||'').startsWith('/')||['127.0.0.1','localhost','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const n=Number(process.env.F11_N||100);
assert(Number.isInteger(n)&&n>0&&n<=1000);
const cikti=execFileSync(process.execPath,[path.join(__dirname,'../f0/t-f11-kilit.js')],{
  env:{...process.env,F11_CIFT:'P8',F11_BOLUM:'C',F11_N:String(n)},encoding:'utf8',maxBuffer:4*1024*1024,
});
process.stdout.write(cikti);
const satir=cikti.split('\n').find(x=>x.includes('[F11.C-P8]'));
assert(satir,'P8 sonucu yok');
const r=JSON.parse(satir.slice(satir.indexOf('{')));
assert.equal(r.kilitlenme,0);assert.equal(r.bozuk,0);assert.equal(r.ikisiTamam,`${n}/${n}`);assert.deepEqual(r.digerHata,{});
console.log('✓ F8 doğal renk/iptal yarışı: bütün işlemler tamam, sıfır kilitlenme/bozuk');
