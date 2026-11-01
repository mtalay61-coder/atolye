// Gerçek çok bağlantılı PostgreSQL testi. Önce stok-v2/test/kos.sh ile izole DB kurulmalı.
// PGlite ile çalışmaz. Canlı Supabase'e bağlanmaz; f0/ortak.js yerel psql kullanır.
const assert = require('assert/strict');
const T = require('../f0/ortak.js');
(async () => {
  const n = Number(process.env.F4_N || 100);
  assert(Number.isInteger(n) && n > 0 && n <= 1000);
  let ikisiTamam = 0;
  for (let i = 0; i < n; i++) {
    const id = T.ON + '-f4-' + i, k = id + '-k';
    const s = T.siparisKur(T.sipObj(id, [T.kalemObj(k, 10, 0)]));
    const teslim = T.teslimYuku({ s, kalemId: k, adet: 2, ekran: 0, istek: id + '-istek' });
    const [iptal, yazma] = await Promise.all([
      T.rpcAyri('fis_bag_coz', { siparisId: id, siparisNo: s.siparisNo }),
      T.rpcAyri('fis_kes', teslim),
    ]);
    assert(iptal.ok, JSON.stringify(iptal));
    assert(yazma.ok || /İptal edilmiş sipariş/.test(yazma.hata), JSON.stringify(yazma));
    if (yazma.ok) ikisiTamam++;
    assert.equal(T.psql(`select durum from public.siparisler where id='${id}'`), 'İptal');
    assert.equal(Number(T.psql(`select count(*) from public.stk_hareket where siparis_id='${id}' or kalem_id='${k}'`)), 0);
    assert.equal(Number(T.psql(`select karsilanan-public.fis_kalem_hesap(id) from public.siparis_kalemleri where id='${k}'`)), 0);
  }
  console.log(`✓ F4 doğal yarış ${n}: iptal başarılı, geçerli bağ yok, karşılanan tutarlı; teslimin önce tamamlandığı çift ${ikisiTamam}`);
})().catch(e => { console.error(e); process.exitCode = 1; });
