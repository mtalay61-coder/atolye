// Ölü kod taraması: üst düzey function/const bildirimleri; kaynak dışında hiç geçmeyenler.
const fs = require("fs"), path = require("path");
const dir = "src"; const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsx")).sort();
const src = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]));
const hepsi = files.map((f) => src[f]).join("\n");
const tanimlar = [];
for (const f of files) {
  const s = src[f];
  const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^const\s+([A-Za-z_$][\w$]*)\s*=/gm;
  let m; while ((m = re.exec(s))) tanimlar.push({ ad: m[1] || m[2], dosya: f });
}
const olu = [];
for (const t of tanimlar) {
  const re = new RegExp("\\b" + t.ad.replace(/\$/g, "\\$") + "\\b", "g");
  const n = (hepsi.match(re) || []).length;
  if (n <= 1) olu.push(`${t.dosya}: ${t.ad}`);
}
console.log("ÜST DÜZEY TANIM:", tanimlar.length, "· HİÇ KULLANILMAYAN:", olu.length);
console.log(olu.join("\n"));
