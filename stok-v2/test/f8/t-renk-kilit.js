// Gerçek, yerel PostgreSQL. Satır tetikleyicisiyle renk taşıma h satırını tuttuktan sonra durdurulur.
// Fiş iptalinin kilit beklediği gözlenir, bariyer açılır: iki işlem de tamamlanmalı.
const assert=require('assert/strict'), {spawn}=require('child_process');
assert((process.env.PGHOST||'').startsWith('/')||['127.0.0.1','localhost','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak.js');
function tut(sql,etiket){
  const c=spawn('psql',['-X','-q','-At','-v','ON_ERROR_STOP=1','-d',process.env.STOK_V2_DB||'atolye_stok_v2_sinama'],{env:{...process.env,PGAPPNAME:etiket}});
  let out='',err='',ok=false,salindi=false,coz,red;
  const ready=new Promise((r,j)=>{coz=r;red=j;});
  const timer=setTimeout(()=>{red(new Error('Bariyer açılmadı: '+err));c.kill();},10000);
  c.stdout.on('data',b=>{out+=b;if(!ok&&out.includes('F8_HAZIR')){ok=true;clearTimeout(timer);coz();}});
  c.stderr.on('data',b=>err+=b);
  const done=new Promise(r=>c.on('close',code=>{clearTimeout(timer);if(!ok)red(new Error(err));r({ok:code===0,hata:err});}));
  c.stdin.write(`begin; ${sql}; select 'F8_HAZIR';\n`);
  return {ready,done,release(){if(!salindi){salindi=true;c.stdin.end('commit;\n');}}};
}
async function bekle(etiket,advisory=false){
  for(let i=0;i<200;i++){
    if(Number(T.psql(`select count(*) from pg_stat_activity where application_name='${etiket}' and wait_event_type='Lock'${advisory?" and wait_event='advisory'":''}`)))return;
    await T.uyu(20);
  }
  throw new Error('Kilit beklemesi gözlenmedi: '+etiket);
}
function rpc(ad,p,etiket){
  const eski=process.env.PGAPPNAME;process.env.PGAPPNAME=etiket;
  const r=T.rpcAyri(ad,p);
  if(eski===undefined)delete process.env.PGAPPNAME;else process.env.PGAPPNAME=eski;
  return r;
}
(async()=>{
  const kalemsiz=process.env.F8_KALEMSIZ==='1';
  const u=T.ON+'-u',s=T.ON+'-s',k=T.ON+'-k',h=T.ON+'-h';
  T.psql(`insert into public.urunler(id,ad,kategori) values ('${u}','F8 test','Mamul');`);
  const sip=T.siparisKur(T.sipObj(s,[T.kalemObj(k,10,0,{urunId:u,renk:'F8A'})]));
  const bag=kalemsiz?{}:{siparisId:s,kalemId:k};
  const fis=T.rpc('fis_kes',{istek:T.ON+'-istek',fis:{aile:'stok',tur:'Satış',onek:'SF',...(kalemsiz?{}:{siparisId:s})},
    stok:{satirlar:[{id:h,urunId:u,renk:'F8A',miktar:-3,kaynak:'Satış',...bag}]}});
  assert(fis.ok,JSON.stringify(fis));
  const varyant=T.rpc('stk_yaz',{varyantAc:[{urunId:u,renk:'F8B'}]});assert(varyant.ok,JSON.stringify(varyant));
  const anahtar=BigInt(Date.now())*1000n+BigInt(Math.floor(Math.random()*1000));
  T.psql(`create or replace function public.f8_sinama_bariyer() returns trigger language plpgsql as $$
    begin if new.id='${h}' and current_setting('application_name')='${T.ON}-renk' then
      perform pg_advisory_xact_lock(${anahtar}); end if; return new; end $$;
    drop trigger if exists f8_sinama_bariyer on public.stk_hareket;
    create trigger f8_sinama_bariyer after update on public.stk_hareket for each row execute function public.f8_sinama_bariyer();`);
  const bariyer=tut(`select pg_advisory_xact_lock(${anahtar})`,T.ON+'-bariyer');
  let renk,iptal;
  try{
   try{
    await bariyer.ready;
    renk=rpc('stk_renk_tasi',{eslesmeler:[{urunId:u,eski:'F8A',yeni:'F8B'}]},T.ON+'-renk');
    await bekle(T.ON+'-renk',true);
    iptal=rpc('fis_iptal',{no:fis.sonuc.fisNo,sebep:'F8 zorlanmış sınama'},T.ON+'-iptal');
    await bekle(T.ON+'-iptal');
   } finally {bariyer.release();}
    const [a,b]=await Promise.all([renk,iptal,bariyer.done]);
    console.log(JSON.stringify({renk:a,iptal:b}));
    assert(a&&a.ok,'Renk taşıma tamamlanmalı');assert(b&&b.ok,'Fiş iptali tamamlanmalı');
    const d=T.jsonSorgu(`select miktar::float as miktar,iptal,kalem_id as kalem from public.stk_hareket where id='${h}'`)[0];
    assert.deepEqual(d,{miktar:-3,iptal:true,kalem:kalemsiz?null:k});
    assert.equal(Number(T.psql(`select karsilanan from public.siparis_kalemleri where id='${k}'`)),0);
    console.log('✓ F8 zorlanmış renk taşıma ∥ fiş iptali ('+(kalemsiz?'kalemsiz':'kalemli')+'): iki işlem tamam, hareket ve miktar korunuyor');
  } finally {
    bariyer.release();await Promise.allSettled([renk,iptal,bariyer.done]);
    T.psql('drop trigger if exists f8_sinama_bariyer on public.stk_hareket; drop function if exists public.f8_sinama_bariyer();');
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
