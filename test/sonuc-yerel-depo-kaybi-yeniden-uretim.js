// KÖK NEDEN KANITI (17 Kasım, v1.744.25) — uygulamasız yeniden üretim. Kullanım: node <bu dosya> file|https <adet> init|noinit [commit]
// Taze Chromium, ilk belge yerel depoya yazar (init ile belge başında da), location.replace; yeni belge okur. "," = tam kayıp.
// Asgari yeniden üretim: taze tarayıcı, ilk belge localStorage'a yazar, 1 sn bekler, location.replace; yeni belge okur.
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const dosya = path.join(require("os").tmpdir(), "yerel-depo-kaybi.html");
fs.writeFileSync(dosya, "<!doctype html><title>s</title><body>s</body>");
async function bir(kok) {
  const t = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
  const p = await t.newPage();
  if (process.argv[4] === "init") await p.addInitScript(() => { if (!localStorage.getItem("ilk")) localStorage.setItem("ilk", "1"); });
  if (kok === "https") await p.route("https://erp.ornek.test/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>s</title><body>s</body>" }));
  await p.goto((kok === "https" ? "https://erp.ornek.test/s.html" : "file://" + dosya) + "?firma=X", { waitUntil: process.argv[5] || "load" });
  await p.evaluate(() => { localStorage.setItem("erken", "1"); });
  await p.waitForTimeout(1000);
  await p.evaluate(() => { localStorage.setItem("gec", "1"); location.replace(location.pathname + "?ikinci=1"); });
  await p.waitForURL(/ikinci=1/); await p.waitForLoadState("domcontentloaded");
  const r = await p.evaluate(() => [localStorage.getItem("erken"), localStorage.getItem("gec")]);
  await t.close(); return r.join(",");
}
(async () => { const kok = process.argv[2], n = +process.argv[3]; const say = {};
  for (let i = 0; i < n; i++) { const r = await bir(kok); say[r] = (say[r] || 0) + 1; }
  console.log(kok, JSON.stringify(say)); })();
