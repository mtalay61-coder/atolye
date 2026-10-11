#!/usr/bin/env node
// FİRMA REHBERİNE KAYIT EKLER (v1.642.0) — `firmalar.json`.
//
//   node firma-ekle.js <kod> <https://xxxx.supabase.co> <sb_publishable_...>
//   node firma-ekle.js --sil <kod>
//
// Kod uygulamadaki `firmaKoduNormal` ile aynı kuralla sadeleşir ve rehbere DÜZ YAZILMAZ: anahtar SHA-256 özeti
// (depo herkese açık — müşteri listesi oradan okunamasın). Gizli (secret / service_role) anahtar REDDEDİLİR.
// Ekledikten sonra firmalar.json commit'lenip main'e birleşince kod 1-2 dakikada çalışır.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DOSYA = path.join(__dirname, "firmalar.json");

function firmaKoduNormal(kod) {
  const harita = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u" };
  return String(kod || "").trim().toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (h) => harita[h] || h)
    .replace(/[^a-z0-9-]/g, "");
}
const ozet = (kod) => crypto.createHash("sha256").update("atolye-firma:" + firmaKoduNormal(kod)).digest("hex");

function anahtarSorunu(a) {
  if (/^sb_secret_/i.test(a)) return "GİZLİ anahtar — asla. Publishable anahtarı verin.";
  if (/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(a)) return null;
  const p = a.split(".");
  if (p.length === 3) {
    try {
      const yuk = JSON.parse(Buffer.from(p[1], "base64url").toString("utf8"));
      if (yuk.role === "anon") return null;
      if (yuk.role === "service_role") return "service_role (gizli) anahtar — asla.";
    } catch (e) { /* aşağıda */ }
  }
  return "Anahtar tanınmadı (sb_publishable_… bekleniyor).";
}

const arg = process.argv.slice(2);
const rehber = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
rehber.firmalar = rehber.firmalar || {};

if (arg[0] === "--sil") {
  const k = firmaKoduNormal(arg[1]);
  if (!rehber.firmalar[ozet(k)]) { console.error(`"${k}" rehberde yok`); process.exit(1); }
  delete rehber.firmalar[ozet(k)];
  fs.writeFileSync(DOSYA, JSON.stringify(rehber, null, 2) + "\n");
  console.log(`silindi: ${k}`);
  process.exit(0);
}

const [kodHam, url, anahtarHam] = arg;
const kod = firmaKoduNormal(kodHam);
const anahtar = String(anahtarHam || "").trim();
if (kod.length < 3) { console.error("Kod en az 3 harf/rakam ([a-z0-9-])"); process.exit(1); }
if (!/^https:\/\/[a-z0-9]{8,40}\.supabase\.co$/.test(String(url || ""))) { console.error("Adres https://<proje>.supabase.co olmalı"); process.exit(1); }
const sorun = anahtarSorunu(anahtar);
if (sorun) { console.error(sorun); process.exit(1); }
const onceki = rehber.firmalar[ozet(kod)];
rehber.firmalar[ozet(kod)] = { url, anahtar };
fs.writeFileSync(DOSYA, JSON.stringify(rehber, null, 2) + "\n");
console.log(`${onceki ? "güncellendi" : "eklendi"}: ${kod} → ${url}`);
