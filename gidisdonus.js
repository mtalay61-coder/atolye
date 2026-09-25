#!/usr/bin/env node
// DENETİM 7 — GİDİŞ-DÖNÜŞ ALAN EŞLEMESİ
//
// Yaşanmış hata: sipariş kaleminde uygulama alanı `birimFiyat`, sütun adı `fiyat`. Yazma tarafı
// `k.fiyat` okumaya çalıştı, o alan yoktu, veritabanına hep 0 gitti. Geri okunduğunda `birimFiyat`
// tanımsız kaldı ve `undefined.toLocaleString()` sipariş kartını çökertti. Hata hiçbir yerde
// görünmedi çünkü teknik olarak yazma BAŞARILIYDI — yanlış değeri başarıyla yazıyordu.
//
// Bu denetim TABLO_SEMA'daki her sütunun okuma tarafında bir karşılığı olduğunu doğrular:
// alanAdi(sütun) uygulamada gerçekten kullanılan bir ad mı, yoksa sessizce kaybolan bir sütun mu.
const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const kaynak = fs.readFileSync(dosya, "utf8");
const bulgular = [];

// TABLO_SEMA gövdesini çıkar.
const bas = kaynak.indexOf("const TABLO_SEMA = {");
if (bas < 0) { console.log("  7    gidiş-dönüş ............. ATLANDI (TABLO_SEMA yok)"); process.exit(0); }
let derinlik = 0, son = bas;
for (let i = kaynak.indexOf("{", bas); i < kaynak.length; i++) {
  if (kaynak[i] === "{") derinlik++;
  else if (kaynak[i] === "}") { derinlik--; if (derinlik === 0) { son = i; break; } }
}
const sema = kaynak.slice(bas, son + 1);

// Okuma istisnalarını koddan al — burada elle kopyalamak, ikisinin ayrışmasına davetiye olurdu.
const istisnaEsl = kaynak.match(/const OKUMA_ISTISNA = \{([^}]*)\}/);
const istisna = {};
if (istisnaEsl) {
  istisnaEsl[1].split(",").forEach((p) => {
    const m = p.match(/\s*(\w+)\s*:\s*"([^"]+)"/);
    if (m) istisna[m[1]] = m[2];
  });
}
const alanAdi = (s) => (istisna[s] ? istisna[s] : s.replace(/_([a-z])/g, (_, h) => h.toUpperCase()));

// Yazma tarafındaki `sutun: kaynak.alan` çiftlerini topla.
const ciftler = [];
const kalip = /(\w+)\s*:\s*([a-zA-Z_$][\w$]*)\.([a-zA-Z_$][\w$]*)/g;
let m;
while ((m = kalip.exec(sema))) ciftler.push({ sutun: m[1], alan: m[3], pos: bas + m.index });

// Altyapı sütunları uygulama alanı değildir; karşılıkları aranmaz.
const ALTYAPI = new Set(["id", "surum", "ek", "sira", "veri", "urun_id", "cari_id", "siparis_id", "uretim_id"]);

const satirNo = (p) => kaynak.slice(0, p).split("\n").length;
const gorulen = new Set();

ciftler.forEach(({ sutun, alan, pos }) => {
  if (ALTYAPI.has(sutun)) return;
  const beklenen = alanAdi(sutun);
  if (beklenen === alan) return;                       // birebir örtüşüyor
  if (gorulen.has(sutun + "|" + alan)) return;
  gorulen.add(sutun + "|" + alan);

  // Sütun okundu mu? alanAdi(sutun) uygulamada geçiyorsa dönüş yolu kapanmış demektir.
  const okumaVar = new RegExp(`\\b${beklenen}\\b`).test(kaynak);
  if (!okumaVar) {
    bulgular.push(`${dosya}:${satirNo(pos)}  \`${sutun}\` sütunu yazılıyor ama okunduğunda ` +
      `\`${beklenen}\` oluyor — bu ad kodun hiçbir yerinde yok, değer geri okunmuyor`);
  } else if (!istisna[sutun]) {
    // Yazarken başka alandan okunuyor ama istisna listesinde kayıtlı değil: ikisi ayrışabilir.
    bulgular.push(`${dosya}:${satirNo(pos)}  \`${sutun}\` sütunu \`.${alan}\` alanından yazılıyor ` +
      `ama okunduğunda \`${beklenen}\` oluyor — OKUMA_ISTISNA'ya eklenmeli`);
  }
});

if (!bulgular.length) console.log("  7    gidiş-dönüş ............. TEMİZ");
else {
  bulgular.forEach((b) => console.log("  ✗ [7 gidiş-dönüş] " + b));
  console.log(`  7    gidiş-dönüş ............. ${bulgular.length} BULGU`);
}
process.exit(bulgular.length ? 1 : 0);
