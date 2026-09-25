#!/usr/bin/env node
// ÖLÜ KOD — kullanılmayan prop, state ve değişken.
// Ölü prop zararsız değil: bir sonraki okuyan onu canlı sanıp üzerine kod yazıyor.
const fs = require("fs"), path = require("path");
const ts = require("typescript");
const dosya = process.argv[2] || "atolye-erp.jsx";
const kaynak = fs.readFileSync(dosya, "utf8");
const sf = ts.createSourceFile(dosya, kaynak, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JSX);
const satirNo = (p) => kaynak.slice(0, p).split("\n").length;

// Kullanım sayımı: her kimliğin kaç kez GEÇTİĞİ (bildirim dahil).
const sayac = new Map();
(function say(n) {
  if (ts.isIdentifier(n)) sayac.set(n.text, (sayac.get(n.text) || 0) + 1);
  ts.forEachChild(n, say);
})(sf);

const bulgular = [];
// Bileşen propları: function X({ a, b }) — bir kez geçen prop hiç kullanılmıyordur.
(function gez(n) {
  const fn = ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n);
  if (fn && n.parameters.length === 1 && ts.isObjectBindingPattern(n.parameters[0].name)) {
    const bilesenAdi = n.name && n.name.text ? n.name.text : "(anonim)";
    n.parameters[0].name.elements.forEach((e) => {
      if (!e.name || !ts.isIdentifier(e.name)) return;
      const ad = e.name.text;
      // ALT ÇİZGİ = BİLEREK KULLANILMIYOR (23 Eylül). JS'te yerleşik kural: `const { eskiTip: _e,
      // ...r } = x` bir alanı ÇIKARMAK için yazılır; `_e`nin kullanılmaması işin ta kendisidir.
      // Denetim bunu "ölü prop" sanıp uyarı veriyordu — 1 bulgu hep listede duruyor, gerçek bir
      // bulgu çıktığında gözden kaçmasına yol açıyordu.
      if (ad.startsWith("_")) return;
      if ((sayac.get(ad) || 0) <= 1) {
        bulgular.push(`${dosya}:${satirNo(e.getStart())}  \`${ad}\` propu ${bilesenAdi} içinde hiç kullanılmıyor`);
      }
    });
  }
  ts.forEachChild(n, gez);
})(sf);

// useState ikilisi: [x, setX] — ikisi de bir kez geçiyorsa state ölüdür.
[...kaynak.matchAll(/const \[(\w+), (set\w+)\] = useState/g)].forEach((m) => {
  const okunuyor = (sayac.get(m[1]) || 0) > 1;
  const yaziliyor = (sayac.get(m[2]) || 0) > 1;
  if (!okunuyor && !yaziliyor) bulgular.push(`${dosya}:${satirNo(m.index)}  \`${m[1]}\` state'i hiç kullanılmıyor`);
  else if (!okunuyor) bulgular.push(`${dosya}:${satirNo(m.index)}  \`${m[1]}\` yazılıyor ama hiç okunmuyor`);
});

if (!bulgular.length) console.log("  ölü kod ..................... TEMİZ");
else {
  bulgular.forEach((b) => console.log("  · " + b));
  console.log(`  ölü kod ..................... ${bulgular.length} bulgu (uyarı, hata değil)`);
}
process.exit(0); // ölü kod yamayı durdurmaz
