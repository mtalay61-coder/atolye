// TEMA DOSYALARINI GÖMME (ERP standardı, 20 Eylül).
// Kullanıcının erp-tokens.css ve erp-icons.svg dosyaları src/tema/ altında DEĞİŞTİRİLMEDEN durur;
// bu betik onları JS sabitine çevirip src/001-tema-dosyalari.jsx üretir. Tek dosyalık HTML
// dış dosya yükleyemez, o yüzden içerik gömülüyor. Dosyayı güncellemek = src/tema'ya kopyalayıp
// ./yap.sh çalıştırmak.
const fs = require("fs");
const css = fs.readFileSync("src/tema/erp-tokens.css", "utf8");
const svg = fs.readFileSync("src/tema/erp-icons.svg", "utf8");
const kacir = (t) => t.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
fs.writeFileSync("src/001-tema-dosyalari.jsx",
`// ÜRETİLMİŞ DOSYA — elle düzenlemeyin. Kaynak: src/tema/erp-tokens.css, src/tema/erp-icons.svg (tema-gom.js)
const ERP_TOKENS_CSS = \`${kacir(css)}\`;
const ERP_ICONS_SVG = \`${kacir(svg)}\`;
`);
console.log("tema gömüldü");
