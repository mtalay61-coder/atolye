#!/usr/bin/env node
// GÜVENLİK SIKILAŞTIRMA LİSTELERİ — 1-liste-salt-okur.sql çıktısından (CSV) 2-sikilastir.sql'in KAPANACAK ve YOL listelerini üretir.
// Kullanım: node liste-uret.js <bolum1.csv> <bolum2.csv> [hedef.sql]
//   bolum1.csv: Bölüm 1 sonucu (Supabase SQL Editor › "Download CSV"; ya da psql --csv)
//   bolum2.csv: Bölüm 2 sonucu (şemasız adlar). SATIR VARSA DURUR: o fonksiyonların yolu elle incelenmeden sabitlenmez.
//   hedef.sql : verilirse dosyadaki "LİSTE:… BAŞ / SON" arasındaki listeler yerinde yazılır; verilmezse ekrana basılır.
// Kurallar (dosyadaki açıklamayla aynı):
//   KAPANACAK = anon_calistirir = true VE sitenin 8 fonksiyonundan biri DEĞİL
//   YOL       = search_path boş VE dil c / internal DEĞİL
const fs = require("fs");

const ACIK_BIRAK = ["herkese_acik_vitrin()", "site_ayarlari()", "site_kayit_ol(jsonb,text,text)", "portal_giris(text,text)", "portal(text)",
  "portal_hesap(text,date,date)", "portal_siparis(text,jsonb,text,jsonb)", "portal_cikis(text)"];

function csvOku(yol) {   // tırnaklı alan, alan içinde virgül / çift tırnak / satır sonu destekli
  const m = fs.readFileSync(yol, "utf8").replace(/^﻿/, "");
  const satirlar = []; let alan = "", satir = [], tirnak = false;
  for (let i = 0; i < m.length; i++) {
    const c = m[i];
    if (tirnak) { if (c === '"' && m[i + 1] === '"') { alan += '"'; i++; } else if (c === '"') tirnak = false; else alan += c; continue; }
    if (c === '"') tirnak = true; else if (c === ",") { satir.push(alan); alan = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && m[i + 1] === "\n") i++; satir.push(alan); alan = ""; if (satir.some((x) => x !== "")) satirlar.push(satir); satir = []; }
    else alan += c;
  }
  if (alan !== "" || satir.length) { satir.push(alan); satirlar.push(satir); }
  const [baslik, ...veri] = satirlar;
  return veri.map((s) => Object.fromEntries(baslik.map((b, i) => [b.trim(), (s[i] || "").trim()])));
}
const dogru = (x) => /^(t|true|evet)$/i.test(x);
// Karşılaştırma anahtarı (boşluksuz); listeye yazılan ad veritabanının verdiği imzanın kendisi (to_regprocedure okur).
const nrm = (imza) => imza.replace(/^public\./, "").replace(/\s+/g, "");
const ad = (imza) => `public.${imza.replace(/^public\./, "")}`;

const [b1, b2, hedef] = process.argv.slice(2);
if (!b1 || !b2) { console.error("kullanım: node liste-uret.js <bolum1.csv> <bolum2.csv> [hedef.sql]"); process.exit(2); }
const f = csvOku(b1);
for (const a of ["imza", "dil", "search_path", "anon_calistirir"]) if (!(a in (f[0] || {}))) { console.error(`bolum1.csv: '${a}' sütunu yok`); process.exit(2); }
const sema = csvOku(b2);
if (sema.length) {
  console.error("DUR — Bölüm 2'de şema adı yazılmamış ad var; bu fonksiyonların yolu elle incelenmeden sabitlenmez:");
  for (const s of sema) console.error(`  ${s.imza}: ${s.ad} (${s.yer}) → ${s.bulundugu_semalar}`);
  process.exit(3);
}
const acik = new Set(ACIK_BIRAK.map(nrm));
const kapanacak = f.filter((x) => dogru(x.anon_calistirir) && !acik.has(nrm(x.imza))).map((x) => ad(x.imza)).sort();
const yol = f.filter((x) => !x.search_path && !["c", "internal"].includes(x.dil)).map((x) => ad(x.imza)).sort();
const siteEksik = ACIK_BIRAK.filter((s) => !f.some((x) => nrm(x.imza) === nrm(s)));
const dizi = (degisken, l) => `  ${degisken} text[] := array[\n${l.length ? l.map((x) => `    '${x}'`).join(",\n") : ""}]${l.length ? "" : "::text[]"};`;

console.log(`fonksiyon: ${f.length} · anon'a kapanacak: ${kapanacak.length} · yolu sabitlenecek: ${yol.length}` +
  (siteEksik.length ? ` · bu veritabanında olmayan site fonksiyonu: ${siteEksik.join(", ")}` : ""));
if (!hedef) { console.log(dizi("kapanacak", kapanacak)); console.log(dizi("yol", yol)); process.exit(0); }
let s = fs.readFileSync(hedef, "utf8");
const yerlestir = (etiket, ad, l) => {
  const re = new RegExp(`(-- LİSTE:${etiket} BAŞ[^\\n]*\\n)[\\s\\S]*?(\\n\\s*-- LİSTE:${etiket} SON)`);
  if (!re.test(s)) { console.error(`${hedef}: LİSTE:${etiket} işaretleri yok`); process.exit(2); }
  s = s.replace(re, `$1${dizi(ad, l)}$2`);
};
yerlestir("KAPANACAK", "kapanacak", kapanacak);
yerlestir("YOL", "yol", yol);
fs.writeFileSync(hedef, s);
console.log(`${hedef}: listeler yazıldı`);
