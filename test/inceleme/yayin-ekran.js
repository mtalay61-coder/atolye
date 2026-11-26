// YAYINDAKİ PAKETLE EKRAN SINAMASI (29 Kasım, B4 / B5). Kullanıcı: "G-25'siz, yalıtılmış bir deneme ortamında, yayındaki 1.744.37
// istemcisiyle B4/B5'i doğrulanabilir şekilde sına." test/test.html yayın paketi DEĞİL (React 19 geliştirme derlemesi, test kabuğu).
// Bu koşucu YAYINLANMIŞ dosyanın kendisini açar: YAYIN_HTML (ör. atolye-erp-v1.744.37.html), SHA-256'sı YAYIN_SHA ile denetlenir
// (tutmazsa koşmaz). Sayfa yalıtılmış bir kökenden verilir; firma seçimi var olmayan bir proje adresine (yalitilmissinama00.supabase.co — uygulama yalnız <ref>.supabase.co kabul eder) ayarlanır ve
// /rest · /auth · /functions istekleri gercek-pg-kopru ile YEREL PostgreSQL'e gider. Dışarı yalnız esm.sh (React / lucide / xlsx — yayın
// paketi oradan yükler) ve yazı tipleri açık; başka HER istek kesilir. Canlı (mqdg…) ve G-25 deneme (drtm…) projelerine giden istek /
// WebSocket SAYILIR — 0 olmalı (`disIstekler`).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { chromium } = require("playwright");
const { kopruKur } = require("../gercek-pg-kopru.js");
const HTML = process.env.YAYIN_HTML, SHA = process.env.YAYIN_SHA;
const KOK = "https://yalitilmis-sinama.invalid/";
const YASAK = /mqdgucoomgqcvhvgixbl|drtmnovafswzcmpacubl/;
const disIstekler = [];
function htmlOku() {
  const b = fs.readFileSync(HTML);
  const s = crypto.createHash("sha256").update(b).digest("hex");
  if (s !== SHA) throw new Error(`YAYIN_HTML özeti tutmuyor: ${s} ≠ ${SHA}`);
  return b;
}
const epostasi = (ad) => (ad === "Ali" ? "ali@atolye.local" : String(ad).toLowerCase().replace(/[^a-z0-9._-]/g, "") + "@atolye.local");
async function girisYap(sayfa, kullanici = "Ali") {
  const sifre = sayfa.locator('input[type="password"]:visible');
  if (!(await sifre.count())) return false;
  await sayfa.locator('input:not([type="password"]):visible').first().fill(kullanici); await sifre.first().fill("yerel-sinama");
  await sayfa.locator("button", { hasText: "Giriş Yap" }).first().click(); await sayfa.waitForTimeout(3000);
  return true;
}
// Uygulama HAZIR: menü var, "Yükleniyor…" yok, giriş ekranı yok — art arda iki bakışta (yükleme sırasında menü bir an görünüp giriş
// ekranına dönebiliyor). Giriş ekranı çıkarsa giriş yapılır.
async function menuBekle(sayfa, kullanici) {
  let ust = 0;
  for (let i = 0; i < 90; i++) {
    const d = await sayfa.evaluate(() => ({ menu: !!document.querySelector('[data-nav="Üretim"]'), yukleniyor: document.body.innerText.includes("Yükleniyor"),
      sifre: [...document.querySelectorAll('input[type="password"]')].some((x) => x.offsetParent !== null) })).catch(() => ({}));
    if (d.sifre) { try { await girisYap(sayfa, kullanici); } catch (e) { /* ekran değişti */ } ust = 0; continue; }
    if (d.menu && !d.yukleniyor) { ust += 1; if (ust >= 2) return true; } else ust = 0;
    await sayfa.waitForTimeout(1000);
  }
  return false;
}
async function ekranAc(veritabani, { kullanici = "Ali" } = {}) {
  const govde = htmlOku();
  const eposta = epostasi(kullanici);
  const k = kopruKur({ veritabani });
  const ayar = (await k.sorgu("select row_to_json(a) as r from public.stk_ayar a"))[0].r;
  const tarayici = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    env: { ...process.env, LANG: process.env.LANG || "C.UTF-8", LC_ALL: process.env.LC_ALL || "C.UTF-8" } });
  const sayfa = await tarayici.newPage({ viewport: { width: 1400, height: 950 } });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("request", (r) => { if (YASAK.test(r.url())) disIstekler.push(r.url().slice(0, 80)); });
  sayfa.on("websocket", (w) => { if (YASAK.test(w.url())) disIstekler.push("ws " + w.url().slice(0, 80)); });
  await sayfa.context().route(/^https?:\/\//, (r) => {
    const u = r.request().url();
    if (/^https:\/\/(esm\.sh|fonts\.googleapis\.com|fonts\.gstatic\.com)\//.test(u)) return r.continue();
    return r.abort("blockedbyclient");
  });
  await sayfa.route(KOK + "**", (r) => (r.request().url() === KOK + path.basename(HTML)
    ? r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: govde }) : r.fulfill({ status: 404, body: "" })));
  await sayfa.addInitScript((e) => {
    localStorage.setItem("firma:secim", JSON.stringify({ kod: "yalitilmis", ad: "YALITILMIŞ SINAMA", url: "https://yalitilmissinama00.supabase.co", anahtar: "sb_publishable_yalitilmis_yerel_sinama" }));
    if (!localStorage.getItem("atolye:oturum")) localStorage.setItem("atolye:oturum", JSON.stringify({ erisim: `yerel-test:${e}`, yenileme: `yerel-test:${e}`, sonaErme: Date.now() + 864e5, email: e }));
  }, eposta);
  await k.bagla(sayfa);
  await sayfa.goto(KOK + path.basename(HTML));
  if (!(await menuBekle(sayfa, kullanici))) throw new Error("yayın paketi açılmadı: " + (await sayfa.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 300));
  await sayfa.waitForTimeout(1500);
  const c = { tarayici, sayfa, k, hatalar, ayar, eposta, kullanici };
  return c;
}
async function yenile(c) { await c.sayfa.reload(); await menuBekle(c.sayfa, c.kullanici); await c.sayfa.waitForTimeout(1500); }
module.exports = { ekranAc, yenile, girisYap, disIstekler, YAYIN: !!HTML };
