// Bileşenlere geçirilen ama bileşenin imzasında olmayan proplar + imzada olup gövdede kullanılmayanlar.
const fs = require("fs"), path = require("path");
const dir = "src"; const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsx")).sort();
const hepsi = files.map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
const bilesenler = {};
const re = /^function\s+([A-Z][\w$]*)\s*\(\s*\{([^}]*)\}\s*\)\s*\{/gm;
let m; while ((m = re.exec(hepsi))) {
  const ad = m[1]; const imza = m[2].split(",").map((x) => x.trim().split(/[:=]/)[0].trim()).filter(Boolean);
  // gövde: sonraki "^function" ya da dosya sonuna kadar (kaba)
  const bas = m.index + m[0].length; const son = hepsi.indexOf("\nfunction ", bas); const govde = hepsi.slice(bas, son < 0 ? undefined : son);
  bilesenler[ad] = { imza, govde };
}
const kullanilmayan = [], gecirilipAlinmayan = [];
for (const [ad, b] of Object.entries(bilesenler)) {
  for (const p of b.imza) {
    const n = (b.govde.match(new RegExp("\\b" + p.replace(/\$/g, "\\$") + "\\b", "g")) || []).length;
    if (n === 0) kullanilmayan.push(`${ad}: ${p}`);
  }
  // JSX çağrıları
  const cre = new RegExp("<" + ad + "\\b([\\s\\S]*?)(?:/>|>)", "g"); let c;
  while ((c = cre.exec(hepsi))) {
    const attrs = [...c[1].matchAll(/\b([a-zA-Z_$][\w$]*)=/g)].map((x) => x[1]);
    attrs.forEach((a) => { if (!b.imza.includes(a) && a !== "key" && a !== "ref") gecirilipAlinmayan.push(`${ad}: ${a}`); });
  }
}
console.log("İMZADA VAR, GÖVDEDE KULLANILMAYAN PROP:", kullanilmayan.length); console.log(kullanilmayan.join("\n"));
console.log("\nGEÇİRİLİYOR AMA İMZADA YOK:", [...new Set(gecirilipAlinmayan)].length); console.log([...new Set(gecirilipAlinmayan)].join("\n"));
