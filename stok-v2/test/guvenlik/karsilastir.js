#!/usr/bin/env node
// davranis.js çıktılarını karşılaştırır: <önce.json> <sonra.json> <2-sikilastir.sql> [kip]
//   kip "sikilastir" (varsayılan): veli ve ali için HER fonksiyonun sonucu AYNI; anon için yalnız KAPANACAK listesindekiler değişebilir
//     ve değişen her biri 42501 olmalı; anon'un 42501 almadığı fonksiyonlar yalnız sitenin 8 fonksiyonu (ve 42501 dışı sonuç
//     veren hiçbir başka fonksiyon) kalmalı.
//   kip "ayni": üç rolde de bütün sonuçlar aynı (geri alma sonrası önceki hâl).
const fs = require("fs");
const [a, b, dosya, kip = "sikilastir"] = process.argv.slice(2);
const once = JSON.parse(fs.readFileSync(a, "utf8")), sonra = JSON.parse(fs.readFileSync(b, "utf8"));
const sql = fs.readFileSync(dosya, "utf8");
const liste = (et) => [...(sql.match(new RegExp(`-- LİSTE:${et} BAŞ[\\s\\S]*?-- LİSTE:${et} SON`)) || [""])[0].matchAll(/'public\.([^']+)'/g)].map((m) => m[1].replace(/\s+/g, ""));
const kapanacak = new Set(liste("KAPANACAK"));
const site = new Set(["herkese_acik_vitrin()", "site_ayarlari()", "site_kayit_ol(jsonb,text,text)", "portal_giris(text,text)", "portal(text)",
  "portal_hesap(text,date,date)", "portal_siparis(text,jsonb,text,jsonb)", "portal_cikis(text)", "yonetici_mi()"]);
const k = (x) => x.replace(/\s+/g, "");
let hata = 0; const satir = (s) => { hata += 1; console.log(`  ✗ ${s}`); };
for (const rol of ["anon", "veli", "ali"]) {
  const o = once[rol], s = sonra[rol];
  const adlar = new Set([...Object.keys(o), ...Object.keys(s)]);
  let degisen = 0;
  for (const f of adlar) {
    if (o[f] === s[f]) continue;
    degisen += 1;
    if (kip === "sikilastir" && rol === "anon" && kapanacak.has(k(f)) && s[f] === "42501") continue;
    satir(`[${rol}] ${f}: önce ${o[f]} → sonra ${s[f]}`);
  }
  if (kip === "sikilastir" && rol === "anon") {
    const acik = Object.keys(s).filter((f) => s[f] !== "42501");
    const fazla = acik.filter((f) => !site.has(k(f)));
    if (fazla.length) satir(`[anon] site dışında hâlâ erişilen: ${fazla.join(", ")}`);
    console.log(`  · anon: ${degisen} fonksiyon kapandı; açık kalan ${acik.length}: ${acik.sort().join(", ")}`);
  } else console.log(`  · ${rol}: ${degisen} fark`);
}
console.log(`── karşılaştırma (${kip}): ${hata ? hata + " kırmızı" : "temiz"} ──`);
process.exit(hata ? 1 : 0);
