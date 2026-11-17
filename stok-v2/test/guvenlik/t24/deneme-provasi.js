// DENEME PROVASI (17 Kasım, v1.744.25) — DENEME-PROJESI.md'deki "sabit adresten çalıştırma" adımlarının yerel provası.
// Uygulama, kullanıcının yapacağı gibi SABİT bir HTTP adresinden (python3 -m http.server, 127.0.0.1) açılır; klasörde yalnız
// uygulama dosyası vardır (surum.json / firmalar.json YOK → sürüm geçişi ve rehber devre dışı). Taze tarayıcı, yerel depo boş,
// test oturum EKLEMEZ. Firma "Gelişmiş" ile elle bağlanır; deneme projesi = deneme-kurulum.sql ile kurulmuş yerel veritabanı
// (gercek-pg-kopru). Ölçülen: CANLI projenin adresine (mqdgucoomgqcvhvgixbl.supabase.co) HİÇBİR istek gitmez — açılıştan
// sona kadar; secret anahtar reddedilir; bağlanma, giriş, F5'te oturumun sürmesi; gidilen bütün dış adreslerin listesi.
// Sınır: paketlenmiş HTML React'i esm.sh'tan alır, bu konteynerde esm.sh engelli → aynı uygulama kodunun test paketi
// (test/test.html, React içinde) kullanılır; bu paket ilk açılışta uygulamayı kendisi çizmez, "load"da çizen tek init script
// eklenir (yerel depoya yazmaz). Kullanım: deneme-provasi.sh
const path = require("path"), fs = require("fs"), os = require("os");
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const { kopruKur } = require("../../../../test/gercek-pg-kopru.js");
const CANLI = "mqdgucoomgqcvhvgixbl.supabase.co";
const DENEME = { url: "https://denemedeneme01.supabase.co", anahtar: "sb_publishable_DENEME_PROVA_1" };
const PORT = Number(process.env.PROVA_PORT || 8137);
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); ok ? gecen++ : kalan++;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); };
(async () => {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), "deneme-sunucu-"));
  const DOSYA = "atolye-erp-v1.744.25.html";
  fs.copyFileSync(path.join(__dirname, "../../../../test/test.html"), path.join(kok, DOSYA));
  const sunucu = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1", "-d", kok], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const kopru = kopruKur({ veritabani: process.env.DENEME_DB || "deneme_prova" });
  const tarayici = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
  const sayfa = await (await tarayici.newContext()).newPage();
  const istekler = [];
  sayfa.on("request", (r) => { try { const u = new URL(r.url()); istekler.push({ host: u.host, yol: u.pathname, m: r.method() }); } catch (e) { /* data: vb. */ } });
  await sayfa.addInitScript(() => { window.addEventListener("load", () => {
    if (window.__App && window.__ReactDOMClient && !document.getElementById("kok").children.length)
      window.__ReactDOMClient.createRoot(document.getElementById("kok")).render(window.__React.createElement(window.__App)); }); });
  if (process.env.TESHIS) { await sayfa.addInitScript(() => { const y = Storage.prototype.setItem, r = Storage.prototype.removeItem;
      const iz = (a, k) => { if (/oturum/.test(k)) console.log("IZ " + a + " " + k + " " + (new Error().stack || "").split("\n").slice(2, 8).map((x) => x.trim().split(" ")[1]).join("<")); };
      Storage.prototype.setItem = function (k, v) { iz("set", k); return y.call(this, k, v); };
      Storage.prototype.removeItem = function (k) { iz("sil", k); return r.call(this, k); }; });
    sayfa.on("console", (m) => { if (m.text().startsWith("IZ ")) console.log("    " + m.text()); }); }
  await sayfa.route((u) => u.host === CANLI, (r) => r.abort());                          // kaçak olursa yine de canlıya ULAŞMAZ
  await sayfa.route((u) => u.host === new URL(DENEME.url).host, async (r) => r.fulfill(await kopru.__yanitla(r.request())));
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const adres = `http://127.0.0.1:${PORT}/${DOSYA}`;
  console.log(`deneme-provasi · ${adres} · deneme=${process.env.DENEME_DB || "deneme_prova"}`);
  await sayfa.goto(adres); await sayfa.waitForTimeout(2500);
  console.log("1) ilk açılış: firma seçilmemiş");
  k_("firma kodu ekranı görünüyor", await sayfa.locator("[data-firma-penceresi]").count() > 0, true);
  k_("uygulama menüsü yok", await sayfa.locator("[data-nav]").count(), 0);
  console.log("2) Gelişmiş: secret anahtar reddedilir");
  await sayfa.locator("button", { hasText: "Gelişmiş" }).first().click();
  await sayfa.fill("[data-firma-adres]", DENEME.url); await sayfa.fill("[data-firma-anahtar]", "sb_secret_DENEME_PROVA_YANLIS");
  await sayfa.click("[data-firma-uygula]"); await sayfa.waitForTimeout(1200);
  k_("secret anahtar → hata, seçim yok", [/GİZLİ|secret/i.test(await sayfa.locator("[data-firma-hata]").innerText().catch(() => "")),
    await sayfa.evaluate(() => localStorage.getItem("firma:secim"))], [true, null]);
  console.log("3) Gelişmiş: deneme projesi + publishable anahtar → Bağlan (tek tık)");
  await sayfa.fill("[data-firma-anahtar]", DENEME.anahtar);
  await Promise.all([sayfa.waitForNavigation({ timeout: 30000 }).catch(() => null), sayfa.click("[data-firma-uygula]")]);
  await sayfa.waitForLoadState("load"); await sayfa.waitForTimeout(3000);
  k_("seçim deneme projesi", await sayfa.evaluate(() => (JSON.parse(localStorage.getItem("firma:secim") || "{}").url) || null), DENEME.url);
  k_("giriş ekranı", await sayfa.locator('input[type="password"]:visible').count() > 0, true);
  console.log("4) giriş (deneme kullanıcısı) + F5");
  await sayfa.locator('input:not([type="password"]):visible').first().fill("deneme");
  await sayfa.locator('input[type="password"]:visible').first().fill("prova-sifresi");
  await sayfa.locator("button", { hasText: "Giriş Yap" }).first().click();
  await sayfa.waitForFunction(() => !document.querySelector('input[type="password"]'), null, { timeout: 20000 }).catch(() => {});
  await sayfa.waitForTimeout(2500);
  // Oturum, giriş ekranı kapanınca değil VERİ YÜKLENİNCE saklanır (ön giriş yolu: tanımlardan kullanıcı bulununca, ~1 sn).
  const saklandi = await sayfa.waitForFunction(() => !!localStorage.getItem("oturum:aktif"), null, { timeout: 20000 }).then(() => true).catch(() => false);
  k_("oturum saklandı (oturum:aktif)", saklandi, true);
  if (process.env.TESHIS) console.log("    TESHIS kullanıcı:", await sayfa.evaluate(() => ["Test Kullanıcısı", "Deneme Yönetici"].map((a) => a + "=" + document.body.innerHTML.includes(a)).join(" ")));
  if (process.env.TESHIS) console.log("    TESHIS giriş sonrası ekran:", JSON.stringify((await sayfa.evaluate(() => document.body.innerText)).slice(0, 300)));
  k_("etkin kullanıcı deneme yöneticisi", await sayfa.evaluate(() => JSON.parse(localStorage.getItem("oturum:aktif") || "{}").kullaniciId || null), "kullanici-ilk");
  k_("giriş sonrası uygulama açık (menü var, şifre alanı yok)", [await sayfa.locator('input[type="password"]:visible').count(), await sayfa.locator("[data-nav]").count() > 0], [0, true]);
  const anahtarlar = () => sayfa.evaluate(() => Object.keys(localStorage).sort().map((k) => k + (/oturum/.test(k) ? "=" + String(localStorage.getItem(k)).slice(0, 60) : "")));
  if (process.env.TESHIS) console.log("    TESHIS F5 öncesi:", JSON.stringify(await anahtarlar()));
  await sayfa.reload(); await sayfa.waitForLoadState("load"); await sayfa.waitForTimeout(4000);
  if (process.env.TESHIS) console.log("    TESHIS F5 sonrası:", JSON.stringify(await anahtarlar()), JSON.stringify((await sayfa.evaluate(() => document.body.innerText)).slice(0, 200)));
  k_("F5 sonrası şifre istenmez", await sayfa.locator('input[type="password"]:visible').count(), 0);
  const tumu = istekler.map((x) => x.host);
  k_("CANLI projeye istek (açılıştan sona)", istekler.filter((x) => x.host === CANLI).map((x) => `${x.m} ${x.yol}`), []);
  k_("deneme projesine istek gitti", tumu.filter((h) => h === new URL(DENEME.url).host).length > 0, true);
  console.log("    gidilen adresler:", JSON.stringify([...new Set(tumu)].sort()));
  if (hatalar.length) console.log("    sayfa hataları:", JSON.stringify([...new Set(hatalar)].slice(0, 5)));
  await tarayici.close(); sunucu.kill(); fs.rmSync(kok, { recursive: true, force: true });
  console.log(`── deneme-provasi: ${gecen} geçti, ${kalan} kaldı ──`); process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("HATA:", e.message.split("\n")[0]); process.exit(2); });
