#!/usr/bin/env node
// DENETİM 17 — BEDENLER SIRALI ÇIKMALI
//
// Varyantlar EKLENME sırasında duruyor. Kullanıcı 40'ı önce eklediyse ekranlarda sütunlar
// "40 36 37 38 39" diye çıkıyordu. Beden bir SIRA ifade eder; ekleme sırası değil sayısal sıra
// beklenir. (Kullanıcı bildirdi: "Beden sıralaması küçükten büyüğe doğru olmalı.")
//
// Kural: bir ürünün varyantlarından beden listesi çıkarılıyorsa (`.map(v => v.beden)`), sonuç
// `bedenSirala` ile sıralanmalı. Bu denetleyici, yeni eklenen bir ekranın kuralı atlamasını
// yakalar — hata görünür ama sessizdir: liste çizilir, sadece sırası yanlıştır ve kimse
// "bozuk" demez, "tuhaf" der.
//
// KAPSAM DIŞI: sıralamanın anlamsız olduğu yerler. Tek bir bedenin okunduğu, ya da listenin
// yalnızca ÜYELİK kontrolü için kullanıldığı (`includes`) çağrılar sıralı olmak zorunda değil;
// bunlar satır sonuna `// sirasiz-tamam` yazılarak muaf tutulur.
const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const kaynak = fs.readFileSync(dosya, "utf8");
const satirlar = kaynak.split("\n");
const bulgular = [];

satirlar.forEach((satir, i) => {
  if (!/\.map\(\s*\(?\s*v\s*\)?\s*=>\s*v\.beden\s*\)/.test(satir)) return;
  if (/sirasiz-tamam/.test(satir)) return;

  // Sıralama aynı satırda ya da onu saran birkaç satırda olabilir (çok satırlı ifadeler).
  const pencere = satirlar.slice(Math.max(0, i - 3), i + 2).join(" ");
  if (/bedenSirala/.test(pencere)) return;
  if (/\.sort\s*\(/.test(pencere)) return;   // yerinde sıralama da kabul

  bulgular.push(`${i + 1}: beden listesi sıralanmıyor — \`bedenSirala(...)\` ile sarın` +
    ` (sıralama gerekmiyorsa satır sonuna \`// sirasiz-tamam\` yazın)`);
});

if (bulgular.length) {
  console.log(bulgular.map((b) => `  ✗ [17 beden sırası] ${b}`).join("\n"));
  process.exit(1);
}
console.log(`  17   beden sırası ........... TEMİZ`);
