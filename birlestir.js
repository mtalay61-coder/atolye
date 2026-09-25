#!/usr/bin/env node
// BİRLEŞTİRİCİ — src/*.jsx -> atolye-erp.jsx (+ src/.satir-haritasi.json)
//
// Neden `import`/`export` YOK: parçalar tek kapsamı paylaşmaya devam ediyor, sadece ayrı
// dosyalarda duruyorlar. ES modüllerine geçmek bütün üst düzey adları export/import etmeyi
// gerektirirdi — 400+ ad, tek seferde büyük ve gereksiz risk. Bu yüzden birleştirme düz metin
// eklemesi: çıktı, bölmeden önceki dosyanın BİREBİR AYNISI.
//
// Sıra dosya adından geliyor (00-, 10-, 20- …). Yeni parça eklerken araya numara sıkıştır.
const fs = require("fs");
const path = require("path");

const KAYNAK = process.argv[2] || "src";
const CIKTI = process.argv[3] || "atolye-erp.jsx";

const parcalar = fs.readdirSync(KAYNAK).filter((a) => a.endsWith(".jsx")).sort();
if (!parcalar.length) {
  console.error(`HATA: ${KAYNAK}/ içinde .jsx yok`);
  process.exit(1);
}

let metin = "";
let satir = 1;
const harita = []; // { dosya, bas, son } — birleşik dosyadaki satır aralığı

for (const ad of parcalar) {
  const govde = fs.readFileSync(path.join(KAYNAK, ad), "utf8");
  const adet = govde.split("\n").length - 1; // her parça satır sonuyla biter
  harita.push({ dosya: ad, bas: satir, son: satir + adet - 1 });
  satir += adet;
  metin += govde;
}

fs.writeFileSync(CIKTI, metin, "utf8");
fs.writeFileSync(path.join(KAYNAK, ".satir-haritasi.json"), JSON.stringify(harita, null, 2), "utf8");
console.log(`Birleştirildi: ${CIKTI}  (${parcalar.length} parça, ${satir - 1} satır)`);
