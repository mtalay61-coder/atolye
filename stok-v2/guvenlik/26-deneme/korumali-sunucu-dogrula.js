#!/usr/bin/env node
// Korumalı yerel sunucunun DOĞRULAMASI (25 Kasım). Ağ gerektirmez: engel tarayıcıda (CSP), istek ağa çıkmadan durur.
//   1 özeti tutmayan HTML ile sunucu BAŞLAMAZ (çıkış 2)
//   2 gizli (sb_secret_) anahtarla sunucu BAŞLAMAZ
//   3 sayfa içinden ana projeye fetch (REST + auth) → engellenir (TypeError + securitypolicyviolation, blockedURI ana proje); ağa
//     giden istek YOK
//   4 deneme projesine fetch → CSP'den GEÇER (ihlal yok; ağ sonucu ayrı — bu ortamda vekil sunucu engelleyebilir)
//   5 firma seçimi bilerek ANA PROJEYE ayarlanıp uygulama açılır: ana projeye giden her istek engellenir, ana projeden yanıt 0
//   6 sabit dosya dışındaki yollar 404 (sw.js, manifest.json); HTML değiştirilirse 409
// Kullanım: node korumali-sunucu-dogrula.js <html> <sha256>
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const [, , html, sha] = process.argv;
const SUNUCU = path.join(__dirname, "korumali-sunucu.js");
const ANA = "mqdgucoomgqcvhvgixbl.supabase.co", DENEME = "drtmnovafswzcmpacubl.supabase.co";
let gecen = 0, kalan = 0, sinanmayan = 0;
const k = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); ok ? gecen++ : kalan++; console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); };
const SAHTE_ACIK = "sb_publishable_DOGRULAMA_sahte_anahtar";   // biçimi geçerli, gerçek değil — yalnız CSP sınanır

(async () => {
  k("1 özeti tutmayan HTML ile başlamaz", spawnSync("node", [SUNUCU, html, "0".repeat(64), "8791"], { env: { ...process.env, DENEME_ANAHTAR: SAHTE_ACIK } }).status, 2);
  k("2 gizli anahtarla başlamaz", spawnSync("node", [SUNUCU, html, sha, "8792"], { env: { ...process.env, DENEME_ANAHTAR: "sb_secret_xxxxxxxxxxxxxxxx" } }).status, 2);
  // kopya üzerinde (6. adımda değiştirilecek)
  const kopya = path.join(require("os").tmpdir(), `g25-deneme-${process.pid}-${path.basename(html)}`);
  fs.copyFileSync(html, kopya);
  const s = spawn("node", [SUNUCU, kopya, sha, "8790"], { env: { ...process.env, DENEME_ANAHTAR: SAHTE_ACIK } });
  await new Promise((r, h) => { s.stdout.on("data", (d) => /hazır/.test(String(d)) && r());
    s.on("exit", (c) => h(new Error(`sunucu başlamadı (çıkış ${c}) — port dolu olabilir`))); });
  const tarayici = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const sayfa = await (await tarayici.newContext()).newPage();
  const istekler = [], basarisiz = [], yanitlar = [];
  sayfa.on("request", (r) => istekler.push(r.url()));
  sayfa.on("requestfailed", (r) => basarisiz.push({ url: r.url(), neden: (r.failure() || {}).errorText }));
  sayfa.on("response", (r) => yanitlar.push(r.url()));
  await sayfa.goto("http://127.0.0.1:8790/"); await sayfa.waitForTimeout(1500);
  k("giriş sayfası firma seçimini deneme projesine yazdı", await sayfa.evaluate(() => JSON.parse(localStorage.getItem("firma:secim") || "{}").url), `https://${DENEME}`);
  const dene = (url) => sayfa.evaluate(async (u) => {
    const ihlal = []; const d = (e) => ihlal.push(e.blockedURI); document.addEventListener("securitypolicyviolation", d);
    let sonuc; try { await fetch(u, { headers: { apikey: "x" } }); sonuc = "ağa gitti"; } catch (e) { sonuc = e.name; }
    await new Promise((r) => setTimeout(r, 300)); document.removeEventListener("securitypolicyviolation", d);
    return { sonuc, ihlal: ihlal.filter((x) => x.includes(new URL(u).host)).length > 0 };
  }, url);
  k("3 ana proje REST engellendi (CSP)", await dene(`https://${ANA}/rest/v1/tanimlar?select=id`), { sonuc: "TypeError", ihlal: true });
  k("3 ana proje auth engellendi (CSP)", await dene(`https://${ANA}/auth/v1/token?grant_type=password`), { sonuc: "TypeError", ihlal: true });
  const d = await dene(`https://${DENEME}/auth/v1/health`);
  k("4 deneme projesi CSP'den geçer (ihlal yok)", d.ihlal, false);
  console.log(`    · deneme projesine ağ sonucu bu ortamda: ${d.sonuc}`);
  // 5 firma seçimi bilerek ANA PROJEYE ayarlanır (adres + depodaki firmalar.json'daki AÇIK anahtarı) ve uygulama açılır: uygulamanın ana
  // projeye her isteği tarayıcıda engellenmeli (seçimsiz açılışta uygulama önce firma ekranını gösterir, hiç bağlanmaz — sınamaz).
  const ana = Object.values(JSON.parse(fs.readFileSync(path.join(__dirname, "../../../firmalar.json"), "utf8")).firmalar).find((f) => String(f.url).includes(ANA));
  await sayfa.evaluate((f) => localStorage.setItem("firma:secim", JSON.stringify({ kod: "", ad: "ANA (sınama)", url: f.url, anahtar: f.anahtar })), ana);
  const once = istekler.length;
  // CSP'nin durdurduğu istek Playwright'a "istek" olarak hiç gelmez — tarayıcının ihlal olayları belgeye en baştan kaydedilir.
  await sayfa.addInitScript(() => { window.__ihlal = []; document.addEventListener("securitypolicyviolation", (e) => window.__ihlal.push(e.blockedURI + " | " + e.violatedDirective)); });
  await sayfa.goto(`http://127.0.0.1:8790/${path.basename(kopya)}`); await sayfa.waitForTimeout(8000);
  const ihlaller = await sayfa.evaluate(() => window.__ihlal || []);
  const anaIhlal = ihlaller.filter((x) => x.includes(ANA));
  const ekran = await sayfa.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 160));
  console.log(`    · uygulama ekranı: "${ekran}"`);
  console.log(`    · ana projeye CSP ihlali (engellenen deneme): ${anaIhlal.length} — ${[...new Set(anaIhlal.map((x) => x.split(" | ")[0].replace(/\?.*/, "")))].slice(0, 4).join(", ")}`);
  const anaIstek = istekler.slice(once).filter((u) => u.includes(ANA));
  const anaYanit = yanitlar.filter((u) => u.includes(ANA));
  const anaBasarisiz = basarisiz.filter((x) => x.url.includes(ANA));
  console.log(`    · firma seçimi ANA projeyken açılışta ana projeye denenen istek: ${anaIstek.length}, nedenler: ${[...new Set(anaBasarisiz.map((x) => x.neden))].join(", ") || "-"}`);
  // Uygulama BAŞLAMADIYSA (esm.sh modülleri yüklenemedi) ana projeye hiç istek denenmez — engel sınanmamış olur; geçti SAYILMAZ.
  const basladi = yanitlar.some((u) => u.includes("esm.sh"));
  if (basladi && anaIhlal.length > 0) {
    k("5 ana proje seçiliyken uygulamanın ana projeye denemeleri CSP ile engellendi (≥1 ihlal)", anaIhlal.length > 0, true);
    k("5 ana projeden yanıt 0, ağa çıkan istek 0", [anaYanit.length, anaIstek.filter((u) => !basarisiz.some((x) => x.url === u)).length], [0, 0]);
  } else if (!basladi || anaIstek.length === 0) {
    console.log(`  · [5 SINANMADI] uygulama başlamadı ya da ana projeye istek denemedi (esm.sh yanıtı ${basladi ? "var" : "YOK"}, ana proje denemesi ${anaIstek.length}) — ağ açılınca yeniden koşulmalı`);
    sinanmayan++;
  } else {
    k("5 ana proje seçiliyken ana projeden yanıt 0", anaYanit.length, 0);
    k("5 ana projeye her deneme CSP ile engellendi", anaBasarisiz.length === anaIstek.length && anaBasarisiz.every((x) => /csp/i.test(x.neden || "")), true);
  }
  // 6 yollar
  const kod = async (u) => (await sayfa.request.get(`http://127.0.0.1:8790${u}`)).status();
  k("6 sw.js / manifest.json 404", [await kod("/sw.js"), await kod("/manifest.json")], [404, 404]);
  fs.appendFileSync(kopya, "<!-- değişti -->");
  k("6 HTML değişince 409", await kod(`/${path.basename(kopya)}`), 409);
  const csp = (await sayfa.request.get("http://127.0.0.1:8790/")).headers()["content-security-policy"] || "";
  k("CSP connect-src yalnız deneme + esm.sh, ana proje yok", [/connect-src https:\/\/drtmnovafswzcmpacubl\.supabase\.co wss:\/\/drtmnovafswzcmpacubl\.supabase\.co https:\/\/esm\.sh(;|$)/.test(csp), csp.includes("mqdg")], [true, false]);
  await tarayici.close(); s.kill(); fs.unlinkSync(kopya);
  console.log(`── korumalı sunucu doğrulaması: ${gecen} ✓ / ${kalan} ✗ / ${sinanmayan} SINANMADI ──`);
  process.exit(kalan ? 1 : sinanmayan ? 3 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
