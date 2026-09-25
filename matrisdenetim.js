#!/usr/bin/env node
// DENETİM 11 — MATRİS KURALI
//
// Kural (kaynak dosyada "MATRİS KURALI" başlığı altında): tek değişken boyut BEDEN ise ve hücrede
// tek sayı duruyorsa liste MATRİS çizilir, düz liste yazılmaz. Düz liste aynı malzemeyi her beden
// için tekrar eder; beş bedenli bir modelde tek malzeme beş satır kaplar.
//
// Kuralı atlamak yasak değil — SESSİZCE atlamak yasak. İstisna, satırının hemen üstünde
// `matris-muaf:` etiketiyle gerekçesini yazar. Bu denetim etiketsiz istisnayı yakalar.
const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const satirlar = fs.readFileSync(dosya, "utf8").split("\n");
const bulgular = [];

// "renk · beden" ikilisini yan yana basan satır: malzeme dökümü satırının imzası.
const IMZA = /\{[\w.$]*renk\}\s*·\s*\{[\w.$]*[Bb]eden\}/;
const PENCERE = 8; // etiketin aranacağı üst pencere

satirlar.forEach((sat, i) => {
  if (!IMZA.test(sat)) return;
  const ust = satirlar.slice(Math.max(0, i - PENCERE), i).join("\n");
  if (/matris-muaf:/.test(ust)) return;
  bulgular.push(`${dosya}:${i + 1}  malzeme·beden satırı düz listede — MATRİS KURALI gereği ` +
    `<IhtiyacMatrisi> kullan ya da üstüne \`matris-muaf: <gerekçe>\` yaz: ${sat.trim().slice(0, 70)}`);
});

// Bileşenin kendisi duruyor mu? Silinirse kural kağıt üstünde kalır.
if (!/function IhtiyacMatrisi\(/.test(satirlar.join("\n"))) {
  bulgular.push("IhtiyacMatrisi bileşeni bulunamadı — matris kuralının uygulanacağı yer yok");
}

if (!bulgular.length) console.log("  11   matris kuralı ........... TEMİZ");
else {
  bulgular.forEach((b) => console.log("  ✗ [11 matris kuralı] " + b));
  console.log(`  11   matris kuralı ........... ${bulgular.length} BULGU`);
}
process.exit(bulgular.length ? 1 : 0);
