#!/usr/bin/env node
// TEST PAKETLEYİCİSİ — test/erp.cjs + React -> test/test.html
//
// Ağ kapalı: CDN kullanılamaz, React yerel kurulumdan (19.x) geliyor. Uygulama tarayıcıda 18.3.1
// kullanıyor; bu testlerde davranış farkı görülmedi (not: bu, üretim paketiyle AYNI paket değil,
// yalnızca mantığı gerçek tarayıcıda çalıştırma aracı).
//
// UMD yapıları React 19'da yok. Bu yüzden CJS dosyaları küçük bir `require` kabuğuyla gömülüyor.
const fs = require("fs");
const path = require("path");
// Paketler deponun kendi node_modules'ünden (npm install) geliyor.
const G = path.join(__dirname, "..", "node_modules");
// scheduler, react-dom'un yanında ya da kendi node_modules'ünde durabilir; Node'a çözdürüyoruz.
const SCHEDULER = require.resolve("scheduler/cjs/scheduler.development.js", { paths: [path.join(G, "react-dom")] });

const oku = (p) => fs.readFileSync(p, "utf8");
const modul = (ad, kod) => `__kayit["${ad}"] = function (module, exports, require) {\n${kod}\n};\n`;

const GIRDI = process.argv[2] || path.join(__dirname, "erp.cjs");
const CIKTI = process.argv[3] || path.join(__dirname, "test.html");
const erp = oku(GIRDI)
  // Node yolları tarayıcıda çözülemez; require adlarını kabuğun bildiği adlara indiriyoruz.
  .replace(/require\("[^"]*node_modules[^"]*\/react"\)/g, 'require("react")');

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>ERP test</title></head>
<body>
<div id="kok"></div>
<script>
// --- mini modül kabuğu ---
var __kayit = {}, __onbellek = {};
function require(ad) {
  if (__onbellek[ad]) return __onbellek[ad].exports;
  var m = { exports: {} };
  __onbellek[ad] = m;
  if (!__kayit[ad]) throw new Error("modül yok: " + ad);
  __kayit[ad](m, m.exports, require);
  return m.exports;
}
var process = { env: { NODE_ENV: "development" } };
${modul("react", oku(path.join(G, "react/cjs/react.development.js")))}
${modul("scheduler", oku(SCHEDULER))}
${modul("react-dom", oku(path.join(G, "react-dom/cjs/react-dom.development.js")))}
${modul("react-dom/client", oku(path.join(G, "react-dom/cjs/react-dom-client.development.js")))}
${modul("erp", erp)}
</script>
<script>
window.__React = require("react");
window.__ReactDOMClient = require("react-dom/client");
window.__erp = require("erp");
window.__App = window.__erp.AtolyeERP;
</script>
</body></html>
`;

fs.writeFileSync(CIKTI, html, "utf8");
console.log(`Paketlendi: ${path.basename(CIKTI)}  (${(html.length / 1024 / 1024).toFixed(1)} MB)`);
