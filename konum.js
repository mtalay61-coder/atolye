#!/usr/bin/env node
// SATIR ÇEVİRİCİ — denetleyiciler birleşik dosya üzerinde çalışır; bulguları okurken
// "atolye-erp.jsx:19540" bir işe yaramaz. Bu süzgeç onu "60-stok.jsx:993"e çevirir.
//
// İki kullanım:
//   node konum.js 19540              -> tek satır numarasını çevirir
//   <denetim çıktısı> | node konum.js -> metindeki bütün "dosya:satır" geçişlerini çevirir
const fs = require("fs");
const path = require("path");

const HARITA = process.env.HARITA || path.join("src", ".satir-haritasi.json");
let harita = [];
try {
  harita = JSON.parse(fs.readFileSync(HARITA, "utf8"));
} catch {
  // Harita yoksa süzgeç kimliktir: bölünmemiş dosyada da çalışsın diye sessiz geçiyoruz.
}

function cevir(no) {
  const p = harita.find((h) => no >= h.bas && no <= h.son);
  return p ? `${p.dosya}:${no - p.bas + 1}` : null;
}

const arg = process.argv[2];
if (arg && /^\d+$/.test(arg)) {
  console.log(cevir(Number(arg)) || `eşleşmedi: ${arg}`);
  process.exit(0);
}

let girdi = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (girdi += d));
process.stdin.on("end", () => {
  // Yalnızca birleşik dosyanın adıyla eşleşen konumlar çevrilir; parça adları zaten doğru.
  const cikti = girdi.replace(/([\w./-]*atolye-erp\.jsx):(\d+)/g, (tam, dosya, no) => cevir(Number(no)) || tam);
  process.stdout.write(cikti);
});
