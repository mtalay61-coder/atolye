#!/usr/bin/env node
// DENETİM 15 — ASORTİ YALNIZCA BEDENDE
//
// Asorti "bir sette hangi bedenden kaç çift" demektir. Boyutlu malzemede (16 cm fermuar) ya da
// ölçüsüz malzemede karşılığı YOKTUR. Kontrol oralarda da çiziliyordu: kullanıcı asorti seçip
// Uygula'ya basıyor, hiçbir kutu dolmuyor, ekran bozuk sanılıyordu.
//
// Kural bileşenin İÇİNDE (iki süzgeç: `olcuTipi` ve oran eşleşmesi). Bu denetleyici, kuralın
// çağıran tarafta da beslendiğini garanti eder: `olcuTipi` verilmeyen bir çağrı yalnızca ikinci
// süzgece kalır ve bir boyut değeri tesadüfen bir beden adıyla çakışırsa kontrol yine görünür.
const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const kaynak = fs.readFileSync(dosya, "utf8");
const satirNo = (p) => kaynak.slice(0, p).split("\n").length;
const bulgular = [];

// Bileşenin kendisi iki süzgeci de taşıyor mu?
const tanimBas = kaynak.indexOf("function AsortiUygulaKontrolu(");
if (tanimBas < 0) {
  bulgular.push("AsortiUygulaKontrolu bulunamadı");
} else {
  const govde = kaynak.slice(tanimBas, tanimBas + 3000);
  if (!/olcuTipi/.test(govde.slice(0, 400))) {
    bulgular.push("AsortiUygulaKontrolu `olcuTipi` propunu almıyor — beden dışı ölçülerde de çizilir");
  }
  if (!/!==\s*"Beden"\)\s*return null/.test(govde)) {
    bulgular.push("AsortiUygulaKontrolu içinde ölçü tipi süzgeci yok — `olcuTipi !== \"Beden\"` dalı kaldırılmış");
  }
  if (!/uygulanabilir/.test(govde)) {
    bulgular.push("AsortiUygulaKontrolu içinde oran eşleşmesi süzgeci yok — yedek koruma kaldırılmış");
  }
}

// Her ÇAĞRI YERİ `olcuTipi` veriyor mu?
[...kaynak.matchAll(/<AsortiUygulaKontrolu\b/g)].forEach((m) => {
  // Etiketin kapanışına kadar olan kısmı al (kendini kapatan etiket: `/>`).
  const kesit = kaynak.slice(m.index, kaynak.indexOf("/>", m.index) + 2);
  if (!/\bolcuTipi=/.test(kesit)) {
    bulgular.push(`${dosya}:${satirNo(m.index)}  <AsortiUygulaKontrolu> \`olcuTipi\` vermiyor — ` +
      "beden dışı ölçülerde asorti sorulur");
  }
});

if (!bulgular.length) console.log("  15   asorti ölçü tipi ........ TEMİZ");
else {
  bulgular.forEach((b) => console.log("  ✗ [15 asorti ölçü tipi] " + b));
  console.log(`  15   asorti ölçü tipi ........ ${bulgular.length} BULGU`);
}
process.exit(bulgular.length ? 1 : 0);
