// F5: onay verilmiş olsa bile fişli sistemde boş/eski JSON mevcut veriyi değiştiremez.
const assert = require('assert/strict');
const { uygulamaAc } = require('./ortak.js');
const { TOHUM } = require('./tohum.js');
(async () => {
  for (const fisAktif of [false, true]) {
    const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, {
      hataYaz: false,
      onceRota: async sayfa => {
        // Açılıştaki bakım/ilk veri yazmaları gerçek ağa gitmesin ve tekrar kuyruğu üretmesin.
        await sayfa.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
      },
      stkAyar: { id: 'tekil', aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true,
        liste_aktif: true, liste_tablolari: ['fis_defteri'], fis_aktif: fisAktif },
    });
    try {
      sayfa.on('dialog', d => d.accept());
      await sayfa.waitForTimeout(3000);
      await sayfa.getByRole('button', { name: 'Tanımlar / Ayarlar', exact: true }).first().click();
      await sayfa.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Yedek & Bulut' && x.getBoundingClientRect().width > 0);
        if (b) b.click();
      });
      const oku = () => sayfa.evaluate(() => Object.fromEntries(['stok:items','siparis:data','cari:data','muhasebe:data','yedek:geri-yukleme-oncesi'].map(k => [k, window.__depo[k] || null])));
      const once = await oku();
      const yazmalar = [];
      await sayfa.route('**/rest/v1/**', r => {
        if (!['GET','HEAD'].includes(r.request().method())) yazmalar.push(r.request().url());
        return r.abort();
      });
      await sayfa.locator('[data-json-geri-yukle] input[type="file"]').setInputFiles({
        name: 'eski-yedek.json', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ stok: [], siparisler: [], cariler: [], muhasebe: { cekler: [] } })),
      });
      await sayfa.getByText('Fiş defteri kullanılan sistemde tam yedek geri yükleme kapalı.', { exact: false }).first().waitFor();
      assert.deepEqual(await oku(), once);
      assert.deepEqual(yazmalar, [], 'geri yükleme buluta hiçbir yazma göndermemeli');
      console.log('  ✓ fiş kurulu, fis_aktif=' + fisAktif + ': onaylı JSON geri yükleme engellendi, veri ve bulut değişmedi');
    } finally { await tarayici.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
