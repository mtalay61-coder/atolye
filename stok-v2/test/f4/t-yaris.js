// Gerçek çok bağlantılı PostgreSQL testi. Önce stok-v2/test/kos.sh ile izole DB kurulmalı.
// PGlite ile çalışmaz. Canlı Supabase'e bağlanmaz; f0/ortak.js yerel psql kullanır.
const assert = require('assert/strict');
const { spawn } = require('child_process');
const pgHost = process.env.PGHOST || '';
assert(pgHost.startsWith('/') || ['127.0.0.1','localhost','::1'].includes(pgHost), 'F4 sınaması yalnız yerel PostgreSQL ile çalışır; PGHOST açıkça yerel adres olmalı');
const T = require('../f0/ortak.js');

// İlk RPC tamamlanır, COMMIT gönderilmez. İkinci bağlantının gerçekten kilit beklediği
// pg_stat_activity ile gözlenir; yalnız zaman gecikmesine bakıp "yarış geçti" denmez.
function acikIslem(ad, p, etiket) {
  const c = spawn('psql', ['-X','-q','-At','-v','ON_ERROR_STOP=1','-d', process.env.STOK_V2_DB || 'atolye_stok_v2_sinama'],
    { env: { ...process.env, PGAPPNAME: etiket } });
  let out = '', err = '', hazir = false, salindi = false;
  let tamam, hata;
  const ready = new Promise((r,j) => { tamam=r; hata=j; });
  const zaman = setTimeout(() => { hata(new Error('İlk RPC hazır olmadı: '+err)); c.kill(); }, 10000);
  c.stdout.on('data', b => { out+=b; if (!hazir && out.includes('F4_HAZIR')) { hazir=true; clearTimeout(zaman); tamam(); } });
  c.stderr.on('data', b => { err+=b; });
  const closed = new Promise(resolve => c.on('close', code => {
    clearTimeout(zaman);
    if (!hazir) hata(new Error('İlk işlem erken kapandı: '+err));
    resolve({ ok: code===0, hata: err, cikti: out });
  }));
  c.stdin.write(`begin; set statement_timeout='15s'; select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true); set local role authenticated;
    select public.${ad}($f4$${JSON.stringify(p)}$f4$::jsonb); select 'F4_HAZIR';\n`);
  return { ready, closed, release() { if (!salindi) { salindi=true; c.stdin.end('commit;\n'); } } };
}
async function kilitBekle(etiket) {
  for (let i=0;i<100;i++) {
    if (Number(T.psql(`select count(*) from pg_stat_activity where application_name='${etiket}' and wait_event_type='Lock'`))>0) return;
    await T.uyu(20);
  }
  throw new Error('İkinci işlemde kilit beklemesi gözlenmedi: '+etiket);
}
function dogrula(id,k,teslimAdet) {
  assert.equal(T.psql(`select durum from public.siparisler where id='${id}'`), 'İptal');
  assert.equal(Number(T.psql(`select count(*) from public.stk_hareket where siparis_id='${id}' or kalem_id='${k}'`)), 0);
  assert.equal(Number(T.psql(`select karsilanan-public.fis_kalem_hesap(id) from public.siparis_kalemleri where id='${k}'`)), 0);
  // İki toplamın birlikte sıfırlanması "tutarlı" görünerek veri kaybını gizleyemez.
  const ozet=T.jsonSorgu(`select
    (select karsilanan from public.siparis_kalemleri where id='${k}')::float as karsilanan,
    (select coalesce(sum(-miktar),0) from public.stk_hareket where gecmis_kalem_id='${k}' and not iptal)::float as gecmis,
    (select count(*) from public.stk_fis where siparis_id='${id}' and not iptal)::int as fis,
    (select coalesce(sum(c.tutar),0) from public.car_hareket c join public.stk_fis f on f.id=c.fis_id where f.siparis_id='${id}' and not c.iptal)::float as cari`)[0];
  assert.deepEqual(ozet,{karsilanan:teslimAdet,gecmis:teslimAdet,fis:teslimAdet?1:0,cari:teslimAdet*100});
}
(async () => {
  const n = Number(process.env.F4_N || 100);
  assert(Number.isInteger(n) && n > 0 && n <= 1000);
  const kurallarAcik = T.psql('select public.fis_kural_aktif();') === 't';
  assert.equal(kurallarAcik, process.env.F4_KURALLAR !== 'kapali', 'Testin beklediği kural durumu doğrulanmalı');
  console.log('F4 gerçek PostgreSQL · kurallar '+(kurallarAcik?'açık':'kapalı')+' · doğal N='+n);
  for (const teslimOnce of [false,true]) {
    for (let j=0;j<3;j++) {
      const id=T.ON+'-zorla-'+Number(teslimOnce)+'-'+j, k=id+'-k';
      const s=T.siparisKur(T.sipObj(id,[T.kalemObj(k,10,0)]));
      const teslim=T.teslimYuku({s,kalemId:k,adet:2,ekran:0,istek:id+'-istek'});
      const iptal={siparisId:id,siparisNo:s.siparisNo};
      const ilk=acikIslem(teslimOnce?'fis_kes':'fis_bag_coz',teslimOnce?teslim:iptal,id+'-ilk');
      let ikinci;
      try {
        await ilk.ready;
        const eski=process.env.PGAPPNAME;
        process.env.PGAPPNAME=id+'-ikinci';
        ikinci=T.rpcAyri(teslimOnce?'fis_bag_coz':'fis_kes',teslimOnce?iptal:teslim);
        if (eski===undefined) delete process.env.PGAPPNAME; else process.env.PGAPPNAME=eski;
        await kilitBekle(id+'-ikinci');
      } finally { ilk.release(); }
      const [a,b]=await Promise.all([ilk.closed,ikinci]);
      assert(a.ok,JSON.stringify(a));
      assert(b && (teslimOnce?b.ok:(!b.ok && /İptal edilmiş sipariş/.test(b.hata))),JSON.stringify(b));
      dogrula(id,k,teslimOnce?2:0);
    }
    console.log('✓ F4 zorlanmış sıra '+(teslimOnce?'teslim → iptal':'iptal → teslim')+': 3/3; ikinci bağlantının kilit beklediği gözlendi');
  }
  let ikisiTamam = 0;
  for (let i = 0; i < n; i++) {
    const id = T.ON + '-f4-' + i, k = id + '-k';
    const s = T.siparisKur(T.sipObj(id, [T.kalemObj(k, 10, 0)]));
    const teslim = T.teslimYuku({ s, kalemId: k, adet: 2, ekran: 0, istek: id + '-istek' });
    const iptalYuku={siparisId:id,siparisNo:s.siparisNo};
    const isler=i%2
      ? [T.rpcAyri('fis_kes',teslim),T.rpcAyri('fis_bag_coz',iptalYuku)]
      : [T.rpcAyri('fis_bag_coz',iptalYuku),T.rpcAyri('fis_kes',teslim)];
    const son=await Promise.all(isler);
    const [iptal,yazma]=i%2?[son[1],son[0]]:son;
    assert(iptal.ok, JSON.stringify(iptal));
    assert(yazma.ok || /İptal edilmiş sipariş/.test(yazma.hata), JSON.stringify(yazma));
    if (yazma.ok) ikisiTamam++;
    dogrula(id,k,yazma.ok?2:0);
  }
  console.log(`✓ F4 doğal yarış ${n}: iptal başarılı, geçerli bağ yok, karşılanan tutarlı; teslimin önce tamamlandığı çift ${ikisiTamam}`);
})().catch(e => { console.error(e); process.exitCode = 1; });
