// Gerçek geri yükleme callback'i: engel, ilk yerel değişiklikten ve ilk yazmadan önce çalışmalı.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const kaynak = fs.readFileSync(require('path').join(__dirname, '../src/093-yedekleme.jsx'), 'utf8');
const bas = kaynak.indexOf('const yedegiUygula = useCallback(');
const son = kaynak.indexOf('\n// JSON DOSYASINDAN', bas);
assert(bas >= 0 && son > bas);
async function dene(ad, kurulu, bilinmiyor, bagli) {
  const etkiler = [];
  const mesajlar = [];
  const engelli = () => { etkiler.push('yazma'); throw new Error('ilk yan etkiye ulaşıldı'); };
  const kapsam = {
    useCallback: f => f, _fisDefteriKurulu: kurulu,
    supabaseAcikMi: () => bagli, v2AyarBilinmiyorMu: () => bilinmiyor,
    showToast: m => mesajlar.push(m), yedekSilinecekleri: () => ({ kilitliSatirlar: [], satirlar: [] }),
    guvenliYaz: engelli, tabloYaz: engelli, tekilYaz: engelli,
    window: { confirm: () => true },
  };
  for (const ad of ['stok','siparisler','uretim','cariler','koliler','gorevler','mesajlar','faturalar','stokRezervasyonlari','onaylar','modeller','teklifler']) kapsam[ad] = [];
  for (const ad of ['tanimlar','muhasebe','fisDefteri']) kapsam[ad] = {};
  for (const ad of ['setStok','setSiparisler','setUretim','setCariler','setTanimlar','setMuhasebe','setKoliler','setGorevler','setMesajlar','setFaturalar','setTeklifler','setStokRezervasyonlari','setOnaylar','setFisDefteri','setModeller','setCekGorselleri']) kapsam[ad] = engelli;
  vm.createContext(kapsam);
  vm.runInContext(kaynak.slice(bas, son) + '\nglobalThis.uygula = yedegiUygula;', kapsam);
  if (kurulu || (bagli && bilinmiyor)) {
    assert.equal(await kapsam.uygula({ stok: [], muhasebe: { cekler: [] } }, ad), false);
    assert.equal(etkiler.length, 0, 'yerel durum ve bulut değişmemeli');
    assert(mesajlar.some(m => /geri yükleme/i.test(m)));
  } else {
    await assert.rejects(kapsam.uygula({ stok: [] }, ad), /ilk yan etkiye/);
    assert.equal(etkiler.length, 1, 'eski sistemin geri yüklemesi erişilebilir kalmalı');
  }
  console.log('  ✓ ' + ad);
}
(async () => {
  await dene('Fiş kurulu — kuralların açık olmasına bağlı değil', true, false, true);
  await dene('Fiş kurulu — bağlantı kapansa da engel sürer', true, false, false);
  await dene('Sunucu ayarı okunamadı — önce veri korunur', false, true, true);
  await dene('Fişsiz eski sistem — geri yükleme yolu korunur', false, false, true);
})().catch(e => { console.error(e); process.exitCode = 1; });
