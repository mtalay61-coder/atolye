// Ağsız, geçici PostgreSQL (PGlite). SQL ve tetikleyicileri çalıştırır; çok bağlantılı yarış testi DEĞİLDİR.
const { PGlite } = require('@electric-sql/pglite');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const kok = path.resolve(__dirname, '../../..');
const oku = p => fs.readFileSync(path.join(kok, p), 'utf8');
(async () => {
  const db = new PGlite();
  try {
    const dosyalar = ['stok-v2/test/supabase-taklit.sql','stok-v2/test/eski-tablolar.sql','rls-yazma.sql',
      'degisiklik-sayaci.sql','silinen-arsiv.sql','stok-v2/stok-v2.sql','stok-v2/stok-v2-goc.sql',
      'stok-v2/cari-v2.sql','stok-v2/cari-v2-goc.sql','stok-v2/alt-v2.sql','stok-v2/kasa-v2.sql',
      'stok-v2/kasa-v2-goc.sql','stok-v2/liste-v2.sql','stok-v2/liste-v2-goc.sql','rls-kimlik.sql','stok-v2/fis-defteri.sql'];
    for (const p of dosyalar) {
      let s = p === 'stok-v2/fis-defteri.sql' && process.env.F4_SQL_REF
        ? execFileSync('git', ['show', process.env.F4_SQL_REF + ':' + p], { cwd: kok, encoding: 'utf8', maxBuffer: 2e6 }) : oku(p);
      if (p === 'rls-yazma.sql') s = s.match(/create or replace function public.yetki_var_mi[\s\S]*?end \$\$;/)[0];
      await db.exec(s);
    }
    for (const acik of [false, true]) {
      await db.exec('select public.fis_kural_' + (acik ? 'ac' : 'kapat') + '();');
      await db.exec(oku('stok-v2/test/f4/sinama-iptal.sql'));
      console.log('✓ F4 kurallar ' + (acik ? 'açık' : 'kapalı') + ': atomik iptal, geçmiş bağ, tekrar, teslim reddi, kısmi kayıt yok, bayat durum reddi');
    }
    await db.exec(oku('stok-v2/geri-donus-F4.sql'));
    let eskiDavranis = false;
    try { await db.exec(oku('stok-v2/test/f4/sinama-iptal.sql')); }
    catch (e) { if (e.code !== 'P0004' || !e.message.includes('bağ çözme ve durum aynı işlemde')) throw e; eskiDavranis = true; }
    await db.exec('rollback;');
    if (!eskiDavranis) throw new Error('Geri dönüş F4 öncesi davranışı vermedi');
    await db.exec(oku('stok-v2/fis-defteri.sql'));
    await db.exec(oku('stok-v2/test/f4/sinama-iptal.sql'));
    console.log('✓ F4 geri dönüşü eski hatayı yeniden üretir; yeniden kurulum testi tekrar geçirir');
  } finally { await db.close(); }
})().catch(e => { console.error(e.code + ': ' + e.message); process.exitCode = 1; });
