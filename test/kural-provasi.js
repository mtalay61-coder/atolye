// KURAL PROVASI (v1.742.0) — 19. adımdan (`fis_kural_ac`) ÖNCE: kurallar açılınca hareket tablolarına yalnız fis_kes / fis_iptal
// yazabilir; köprüden (stk_yaz / car_yaz / kas_yaz / fis_yaz) hareket satırı taşıyan yazma REDDEDİLİR. Bu prova bütün tarayıcı
// senaryolarını fiş defteri kurulu bir sahte sunucuya karşı koşar (ortak.js KURAL_PROVASI) ve fiş yolu açıkken eski yoldan giden
// her hareket yazmasını senaryo adıyla listeler. Senaryoların çıktısı burada önemsiz (altınla karşılaştırılmaz) — yalnız kayıt.
// Kullanım: cd test && node derle.js && node paket-test.js && node kural-provasi.js [senaryo-adı ...]   (KOSU_IS=4)
// Çıkış kodu: fiş yolunda eski yol yazması varsa 1.
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const DIZIN = fs.mkdtempSync(path.join(require("os").tmpdir(), "kural-provasi-"));
console.log(`prova kayıtları: ${DIZIN}`);
const secilen = process.argv.slice(2);
const senaryolar = (secilen.length ? secilen.map((s) => `senaryo-${s.replace(/^senaryo-|\.js$/g, "")}.js`)
  : fs.readdirSync(__dirname).filter((f) => /^senaryo-.+\.js$/.test(f)).sort())
  .filter((f) => !/^senaryo-fis\.js$/.test(f));   // senaryo-fis.js ortak yardımcı (normalles)
const IS = Number(process.env.KOSU_IS) || 4;
const kosuHatalari = [];

function kos(f) {
  return new Promise((coz) => {
    execFile("node", [f], { cwd: __dirname, timeout: 240000, env: { ...process.env, KURAL_PROVASI: "1", PROVA_DIZIN: DIZIN } }, (hata, stdout, stderr) => {
      if (hata) kosuHatalari.push({ senaryo: f, hata: String(stderr || hata.message).slice(-1200) });
      coz();
    });
  });
}

(async () => {
  const kuyruk = [...senaryolar];
  await Promise.all(Array.from({ length: IS }, async () => { while (kuyruk.length) await kos(kuyruk.shift()); }));
  const bulgular = [];
  let engellenen = 0;
  const engellenenSenaryo = new Map();
  // Ağ denetimi (ortak.js): sürüm kapısı ve fiş kuralları açıkken reddedilecek her istek
  const SURUM = (fs.readFileSync(path.join(__dirname, "../src/015-sabitler.jsx"), "utf8").match(/^const SURUM = "([^"]+)"/m) || [])[1];
  const KORUNAN = /^rest\/(stk_hareket|car_hareket|kas_hareket|stk_fis|stok_hareketleri|cari_hareketleri|kasa_hareketleri)$/;
  const ag = { yazma: 0, edge: 0, basliksiz: [], yanlis: [], dogrudan: [], satirli: [], rpc: new Map(), tablo: new Map() };
  fs.readdirSync(DIZIN).forEach((d) => {
    fs.readFileSync(path.join(DIZIN, d), "utf8").split("\n").filter(Boolean).forEach((s) => {
      const k = JSON.parse(s);
      const sen = d.replace(/\.jsonl$/, "");
      if (k.ag) {
        if (k.yol.startsWith("functions/")) { ag.edge++; return; }
        ag.yazma++;
        const anahtar = k.yol.startsWith("rest/rpc/") ? k.yol.slice(9) : `${k.m} ${k.yol.slice(5)}`;
        const hedef = k.yol.startsWith("rest/rpc/") ? ag.rpc : ag.tablo;
        hedef.set(anahtar, (hedef.get(anahtar) || new Set()).add(sen));
        if (!k.surum) ag.basliksiz.push(`${sen} · ${k.m} ${k.yol}`);
        else if (k.surum !== SURUM) ag.yanlis.push(`${sen} · ${k.m} ${k.yol} · ${k.surum}`);
        if (KORUNAN.test(k.yol)) ag.dogrudan.push(`${sen} · ${k.m} ${k.yol}`);
        if (k.satirli) ag.satirli.push(`${sen} · ${k.yol}`);
        return;
      }
      if (k.fisYolu && k.engellendi) { engellenen++; engellenenSenaryo.set(sen, (engellenenSenaryo.get(sen) || 0) + 1); }
      if (k.fisYolu && !k.engellendi) bulgular.push({ senaryo: d.replace(/\.jsonl$/, ""), ...k });
    });
  });
  console.log(`kural provası: ${senaryolar.length} senaryo, fiş yolunda eski yol hareket yazması: ${bulgular.length}`);
  console.log(`ağa çıkmadan engellenen eski yol girişimi: ${engellenen}`);
  [...engellenenSenaryo.entries()].sort().forEach(([a, n]) => console.log(`  engellenen · ${a}: ${n}`));
  const liste = (ad, l) => { console.log(`${ad}: ${l.length}`); [...new Set(l)].slice(0, 12).forEach((x) => console.log(`      ${x}`)); };
  console.log(`AĞ DENETİMİ (sürüm ${SURUM}) — ağa çıkan yazma isteği: ${ag.yazma} (+ Edge Function ${ag.edge})`);
  liste("  sürüm başlığı OLMAYAN yazma (kapı açıkken AT001)", ag.basliksiz);
  liste("  başka sürüm başlıklı yazma", ag.yanlis);
  liste("  hareket tablosuna DOĞRUDAN yazma (kurallar açıkken red)", ag.dogrudan);
  liste("  satır taşıyan köprü isteği (kurallar açıkken red)", ag.satirli);
  console.log("  kapsam — sunucu işlemleri (istek gören senaryo sayısı):");
  [...ag.rpc.entries()].sort().forEach(([a, l]) => console.log(`      ${a}: ${l.size}`));
  console.log("  kapsam — tablo yazmaları (istek gören senaryo sayısı):");
  [...ag.tablo.entries()].sort().forEach(([a, l]) => console.log(`      ${a}: ${l.size}`));
  const agHatasi = ag.basliksiz.length + ag.yanlis.length + ag.dogrudan.length + ag.satirli.length;
  const grup = new Map();
  bulgular.forEach((b) => { const a = `${b.senaryo} · ${b.tur}`; if (!grup.has(a)) grup.set(a, []); grup.get(a).push(b); });
  [...grup.entries()].sort().forEach(([a, l]) => {
    console.log(`  ${a}: ${l.length} yazma, ${l.reduce((t, b) => t + b.satir, 0)} satır / ${l.reduce((t, b) => t + b.iptal, 0)} iptal`);
    [...new Set(l.flatMap((b) => b.ornek))].slice(0, 4).forEach((o) => console.log(`      ${String(o).slice(0, 160)}`));
  });
  kosuHatalari.forEach((x) => console.error(`ÇALIŞMADI: ${x.senaryo}\n${x.hata}`));
  console.log(`senaryo çalıştırma hatası: ${kosuHatalari.length}`);
  process.exit(bulgular.length || kosuHatalari.length || agHatasi ? 1 : 0);
})();
