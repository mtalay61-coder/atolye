// Yerel gerçek PostgreSQL: kural, sahte onay, çok satır, yeni kalem ve miktar koruması.
const assert=require('assert/strict');
assert((process.env.PGHOST||'').startsWith('/')||['127.0.0.1','localhost','::1'].includes(process.env.PGHOST),'Yalnız yerel PostgreSQL');
const T=require('../f0/ortak.js');let no=0;
function kur(karsilanan=0,sonek=''){const id=T.ON+'-'+no++,k=id+'-k'+sonek;return {s:T.siparisKur(T.sipObj(id,[T.kalemObj(k,20,karsilanan)])),k};}
function yuk(x,adet){return T.teslimYuku({s:x.s,kalemId:x.k,adet,ekran:0,istek:T.ON+'-i-'+no++});}
function dene(p,eposta='ali@atolye.local'){
 try{return{ok:true,sonuc:JSON.parse(T.psql(`\\set VERBOSITY verbose\nselect set_config('request.jwt.claims','{"email":"${eposta}","role":"authenticated"}',false);set role authenticated;select public.fis_kes($f3$${JSON.stringify(p)}$f3$::jsonb);`).split('\n').pop())};}
 catch(e){const err=String(e.stderr||e.message);return{ok:false,kod:(err.match(/ERROR:\s+([0-9A-Z]{5}):/)||[])[1],hata:err};}
}
function reddet(x,p,ad,eposta){
 const once=T.psql(`select count(*) from public.stk_fis where siparis_id='${x.s.id}'`);
 const r=dene(p,eposta);assert.equal(r.ok,false,ad);assert.equal(r.kod,'KR007',r.hata);
 assert.equal(T.psql(`select count(*) from public.stk_fis where siparis_id='${x.s.id}'`),once,'Ret fiş bırakmamalı');
 assert.equal(Number(T.psql(`select miktar from public.siparis_kalemleri where id='${x.k}'`)),20);
 console.log('✓ '+ad);
}
(async()=>{
 let x=kur(),p=yuk(x,25);
 const dogrudan=T.rpc('fis_satis_teslim_koru',p);assert.equal(dogrudan.ok,false);assert.equal(dogrudan.kod,'42501');console.log('✓ İç kontrol kilitsiz doğrudan RPC olarak çağrılamaz');
 p.fis.tur='Alış';p.fis.ek={fazlaTeslimOnayi:{onaylayan:'ali@atolye.local',gerekce:'Sahte imza'}};
 reddet(x,p,'İstemcinin fiş türü, fazla işareti ve sahte audit sınırı aşamaz');
 x=kur();T.psql(`update public.siparisler set tip=null where id='${x.s.id}'`);p=yuk(x,25);reddet(x,p,'Boş sipariş tipi sınırı kapatmaz');
 p=yuk(x,25);p.fazlaTeslimOnayi={onay:true,gerekce:'   '};reddet(x,p,'Yönetici gerekçesiz fazla gönderemez');
 p=yuk(x,25);p.fazlaTeslimOnayi={onay:'true',gerekce:'Metin onay'};reddet(x,p,'Metin true, gerçek onay değildir');
 p=yuk(x,25);p.fazlaTeslimOnayi={onay:true,gerekce:'Sahte yönetici',onaylayan:'ali@atolye.local'};
 reddet(x,p,'Yetkisiz kullanıcı onayı taklit edemez','ayse@atolye.local');
 p=yuk(x,25);p.alt.siparis_kalemleri.satirlar[0].miktar=100;reddet(x,p,'Aynı yükte miktar artırarak eski sınır aşılamaz');
 p=yuk(x,25);const h=p.stok.satirlar[0];p.stok.satirlar=[{...h,id:h.id+'a',miktar:-12},{...h,id:h.id+'b',miktar:-13}];
 reddet(x,p,'Birden çok satırın toplamı denetlenir');
 p=yuk(x,25);p.bagli={fis:{aile:'stok',tur:'Satış',onek:'SF',siparisId:x.s.id},stok:{satirlar:[{...p.stok.satirlar[0],id:'f3-bagli-'+no++,miktar:-13}]}};p.stok.satirlar[0].miktar=-12;
 reddet(x,p,'Ana ve bağlı fiş birlikte sınanır');
 p=yuk(x,25);p.stok.satirlar.push({...p.stok.satirlar[0],id:'f3-pozitif-'+no++,miktar:100});reddet(x,p,'Pozitif satır fazla çıkışı gizleyemez');
 p=yuk(x,25);const yeni=x.k+'-yeni';p.stok.satirlar[0].kalemId=yeni;p.alt.siparis_kalemleri.satirlar[0].id=yeni;
 reddet(x,p,'Aynı yükte yeni kalemin miktarı da denetlenir');assert.equal(T.psql(`select count(*) from public.siparis_kalemleri where id='${yeni}'`),'0');
 x=kur(5);p=yuk(x,16);reddet(x,p,'Hayalet karşılanan yok sayılıp fazla sevk edilmez');assert.equal(T.kalemDb(x.k).karsilanan,5);
 x=kur();p=yuk(x,20);p.fis.ek={fazlaTeslimOnayi:{onaylayan:'SAHTE'}};let r=dene(p,'ayse@atolye.local');assert(r.ok,r.hata);assert.equal(T.kalemDb(x.k).karsilanan,20);
 assert(!('fazlaTeslimOnayi' in T.jsonSorgu(`select ek from public.stk_fis where id='${r.sonuc.fisNo}'`)[0].ek));console.log('✓ Normal kullanıcı sınırda 20 teslim edebilir; sahte audit saklanmaz');
 x=kur();p=yuk(x,25);p.stok.satirlar.forEach(h=>h.fazlaGonderim=false);p.fazlaTeslimOnayi={onay:true,gerekce:'Müşteri ek talebi',onaylayan:'SAHTE'};r=dene(p);assert(r.ok,r.hata);
 assert.equal(T.kalemDb(x.k).karsilanan,25);
 const audit=T.jsonSorgu(`select ek->'fazlaTeslimOnayi' as a from public.stk_fis where id='${r.sonuc.fisNo}'`)[0].a;
 assert.equal(audit.onaylayan,'ali@atolye.local');assert.equal(audit.gerekce,'Müşteri ek talebi');assert.equal(audit.kalemler[0].istenen,25);
 assert(dene(p).sonuc.zatenVar);assert.equal(T.kalemDb(x.k).karsilanan,25);console.log('✓ Gerekçeli yönetici istisnası 25 olarak kaydedilir, gerçek kimlik audit olur, tekrar çift yazmaz');
 assert.equal(T.psql(`select bool_and(fazla_gonderim) from public.stk_hareket where kalem_id='${x.k}'`),'t');
 const noFis=r.sonuc.fisNo;
 assert(T.rpc('fis_bilgi',{no:noFis,aciklama:'Normal not',ek:{irsaliyeNo:'F3-TEST'}}).ok);
 for(const acik of [true,false]){
  T.psql(`select public.fis_kural_${acik?'ac':'kapat'}();`);
  const deg=T.rpc('fis_bilgi',{no:noFis,ek:{fazlaTeslimOnayi:null}});assert.equal(deg.ok,false);assert.equal(deg.kod,'KR007');
  let silRed=false;try{T.psql(`\\set VERBOSITY verbose\ndelete from public.stk_fis where id='${noFis}';`);}catch(e){silRed=/KR007/.test(String(e.stderr));}
  assert(silRed,'Onay kaydı silinmemeli');
  assert.deepEqual(T.jsonSorgu(`select ek->'fazlaTeslimOnayi' as a from public.stk_fis where id='${noFis}'`)[0].a,audit);
 }
 T.psql('select public.fis_kural_ac();');console.log('✓ Sunucu fazla işareti yazılır; normal not değişir, onay kaydı açık/kapalı kuralda değiştirilemez');
 for(const m of ['NaN','Infinity','-Infinity']){x=kur();p=yuk(x,1);p.stok.satirlar[0].miktar=m;p.fazlaTeslimOnayi={onay:true,gerekce:'Geçersiz miktar'};reddet(x,p,'Sonlu olmayan miktar reddedilir: '+m);}
 x=kur(0,'-NaN');p=yuk(x,25);p.fazlaTeslimOnayi={onay:true,gerekce:'Kimlikte NaN geçmesi miktarı bozmaz'};assert(dene(p).ok);console.log('✓ Miktar doğrulaması kalem kimliğinin metniyle karıştırılmaz');
 x=kur();p=yuk(x,19.9994);p.stok.satirlar[0].miktar=-19.9994;r=dene(p);assert(r.ok,r.hata);
 p=yuk(x,0.0007);p.stok.satirlar[0].miktar=-0.0007;reddet(x,p,'Yuvarlama ham hareket toplamındaki fazlayı gizleyemez');
 console.log('F3 satış sınırı testleri temiz');
})().catch(e=>{console.error(e);process.exitCode=1;});
