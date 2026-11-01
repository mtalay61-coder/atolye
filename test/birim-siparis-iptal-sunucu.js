// Yerelde fiş bağı görünmediğinde de sunucu iptali önce denenmeli; ret gelirse yerel yazma olmamalı.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const kaynak = fs.readFileSync(require('path').join(__dirname, '../src/087-silme-zinciri.jsx'), 'utf8');
const bas = kaynak.indexOf('const siparisKapat = useCallback(');
const son = kaynak.indexOf('\n\n  return {', bas);
const istekler = [], etkiler = [];
const kapsam = {
  useCallback: f => f, siparisler: [{ id: 's', siparisNo: 'SAT-1', durum: 'Bekliyor', kalemler: [] }],
  stok: [], cariler: [], uretim: [], koliler: [], stokRezervasyonlari: [], aktifKullanici: null,
  sonVeriRef: { current: null },
  siparisBaglariniCoz: () => ({ ozet: { stokHareketi: 0, cariHareketi: 0, zincir: 0 }, siparisler: [], degisenler: {} }),
  siparisIslemGormusMu: () => true, fisKesYolu: () => true,
  supabaseIstek: async (url, sec) => { istekler.push({ url, p: JSON.parse(sec.body).p }); throw new Error('sunucu reddetti'); },
  showToast: () => {}, gunlukYaz: () => {},
  copaAt: () => etkiler.push('cop'), fisDefteriniDonustur: () => etkiler.push('fis'),
};
for (const ad of ['setStok','setCariler','setUretim','setKoliler','setStokRezervasyonlari','setSiparisler','tabloYaz','tekilYaz']) kapsam[ad] = () => etkiler.push(ad);
vm.createContext(kapsam);
vm.runInContext(kaynak.slice(bas, son) + '\nglobalThis.kapat = siparisKapat;', kapsam);
kapsam.kapat('s').then(() => {
  assert.equal(istekler.length, 1);
  assert.equal(istekler[0].url, 'rpc/fis_bag_coz');
  assert.equal(istekler[0].p.siparisId, 's');
  assert.deepEqual(etkiler, []);
  console.log('  ✓ Yerelde bağ görünmese de sunucu iptali ilk işlem; ret gelince yerel değişiklik yok');
}).catch(e => { console.error(e); process.exitCode = 1; });
