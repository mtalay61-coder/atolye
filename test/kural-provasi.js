// KURAL PROVASI (v1.742.0) — 19. adımdan (`fis_kural_ac`) ÖNCE: kurallar açılınca hareket tablolarına yalnız fis_kes / fis_iptal
// yazabilir; köprüden (stk_yaz / car_yaz / kas_yaz / fis_yaz) hareket satırı taşıyan yazma REDDEDİLİR. Bu prova bütün tarayıcı
// senaryolarını fiş defteri kurulu bir sahte sunucuya karşı koşar (ortak.js KURAL_PROVASI) ve fiş yolu açıkken eski yoldan giden
// her hareket yazmasını senaryo adıyla listeler. Senaryoların çıktısı burada önemsiz (altınla karşılaştırılmaz) — yalnız kayıt.
// Kullanım: cd test && node derle.js && node paket-test.js && node kural-provasi.js [senaryo-adı ...]   (KOSU_IS=4)
// Çıkış kodu: fiş yolunda eski yol yazması varsa 1.
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const DIZIN = "/tmp/kural-provasi";
fs.rmSync(DIZIN, { recursive: true, force: true });
fs.mkdirSync(DIZIN, { recursive: true });
const secilen = process.argv.slice(2);
const senaryolar = (secilen.length ? secilen.map((s) => `senaryo-${s.replace(/^senaryo-|\.js$/g, "")}.js`)
  : fs.readdirSync(__dirname).filter((f) => /^senaryo-.+\.js$/.test(f)).sort())
  .filter((f) => !/^senaryo-fis\.js$/.test(f));   // senaryo-fis.js ortak yardımcı (normalles)
const IS = Number(process.env.KOSU_IS) || 4;

function kos(f) {
  return new Promise((coz) => {
    execFile("node", [f], { cwd: __dirname, timeout: 240000, env: { ...process.env, KURAL_PROVASI: "1", PROVA_DIZIN: DIZIN } }, () => coz());
  });
}

(async () => {
  const kuyruk = [...senaryolar];
  await Promise.all(Array.from({ length: IS }, async () => { while (kuyruk.length) await kos(kuyruk.shift()); }));
  const bulgular = [];
  fs.readdirSync(DIZIN).forEach((d) => {
    fs.readFileSync(path.join(DIZIN, d), "utf8").split("\n").filter(Boolean).forEach((s) => {
      const k = JSON.parse(s);
      if (k.fisYolu) bulgular.push({ senaryo: d.replace(/\.jsonl$/, ""), ...k });
    });
  });
  console.log(`kural provası: ${senaryolar.length} senaryo, fiş yolunda eski yol hareket yazması: ${bulgular.length}`);
  const grup = new Map();
  bulgular.forEach((b) => { const a = `${b.senaryo} · ${b.tur}`; if (!grup.has(a)) grup.set(a, []); grup.get(a).push(b); });
  [...grup.entries()].sort().forEach(([a, l]) => {
    console.log(`  ${a}: ${l.length} yazma, ${l.reduce((t, b) => t + b.satir, 0)} satır / ${l.reduce((t, b) => t + b.iptal, 0)} iptal`);
    [...new Set(l.flatMap((b) => b.ornek))].slice(0, 4).forEach((o) => console.log(`      ${String(o).slice(0, 160)}`));
  });
  process.exit(bulgular.length ? 1 : 0);
})();
