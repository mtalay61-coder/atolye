// DENEME PROVASI (17–18 Kasım, v1.744.25) — DENEME-PROJESI.md adım 6'nın yerel provası ve deneme-sunucu.py korumasının sınaması.
// Uygulama, kullanıcının yapacağı gibi SABİT bir yerel adresten (127.0.0.1) açılır; taze tarayıcı, yerel depo boş, test oturum
// EKLEMEZ. Deneme projesi = deneme-kurulum.sql ile kurulmuş yerel veritabanı (gercek-pg-kopru). ANA PROJE her koşuda TAKLİT:
// gerçek ağa hiçbir istek çıkmaz (rota karşılar ve sayar). Ölçümler:
//   0) KONTROL — korumasız düz sunucu (python http.server): GitHub rehberine dönüş yolu gerçekten var mı? "nds" kodu ana
//      projeye çözülüp seçiliyor mu? (Korumanın neyi kapattığını göstermek için; ana proje taklit.)
//   1) deneme-sunucu.py ana projenin adresiyle ve biçimsiz adresle BAŞLAMAZ.
//   2) KORUMALI — "nds" kodu: çözülmez, seçim yazılmaz, ana projeye ağ düzeyinde 0 istek; engellenen istekler sunucuya bildirilir.
//   3) KORUMALI — Gelişmiş'e ana projenin adresi + publishable anahtarı: seçim yazılmaz, ana projeye 0 istek.
//   4) KORUMALI — deneme projesi: secret anahtar reddi, tek tıkla bağlanma, giriş, oturum saklanır, F5'te şifre istenmez;
//      döviz kaynakları ve api.anthropic.com dahil izinli olmayan hiçbir adrese ağ isteği çıkmaz.
//   5) Sunulan dosya diskteki uygulama dosyasıyla bayt bayt aynı (koruma yalnız HTTP başlığında).
// Ağ düzeyi sayım: bağlamdaki bütün istekler rotadan geçer; CSP'nin engellediği istek rotaya HİÇ ulaşmaz (tarayıcı ağa çıkarmaz).
// Sınır: paketlenmiş HTML React'i esm.sh'tan alır, bu konteynerde esm.sh engelli → aynı uygulama kodunun test paketi
// (test/test.html, React içinde) kullanılır; bu paket ilk açılışta uygulamayı kendisi çizmez, "load"da çizen tek init script
// eklenir (yerel depoya yazmaz). Kullanım: deneme-provasi.sh
const path = require("path"), fs = require("fs"), os = require("os"), crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { kopruKur } = require("../../../../test/gercek-pg-kopru.js");
const ANA = { kod: "nds", url: "https://mqdgucoomgqcvhvgixbl.supabase.co", anahtar: "sb_publishable_MKOjcTQ8Dod9Ofh-P-V-uA_3kKm_Ei2" };
const ANA_HOST = new URL(ANA.url).host;
const DENEME = { url: "https://denemeprovadeneme123.supabase.co", anahtar: "sb_publishable_DENEME_PROVA_1" };   // kimlik 20 harf (Supabase gibi)
const DENEME_HOST = new URL(DENEME.url).host;
const REHBER_GITHUB = "https://mtalay61-coder.github.io/atolye/firmalar.json";
const SUNUCU = path.join(__dirname, "deneme-sunucu.py");
const DOSYA = "atolye-erp-v1.744.25.html";
const PORT = Number(process.env.PROVA_PORT || 8137);
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); ok ? gecen++ : kalan++;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); };
const ozet = (k) => crypto.createHash("sha256").update("atolye-firma:" + k).digest("hex");
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const kok = fs.mkdtempSync(path.join(os.tmpdir(), "deneme-sunucu-"));
fs.copyFileSync(path.join(__dirname, "../../../../test/test.html"), path.join(kok, DOSYA));
const kopru = kopruKur({ veritabani: process.env.DENEME_DB || "deneme_prova" });

async function sunucuAc(korumali) {
  const komut = korumali ? ["python3", [SUNUCU, "--proje", DENEME.url, "--port", String(PORT)]] : ["python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"]];
  const s = spawn(komut[0], komut[1], { cwd: kok, stdio: ["ignore", "pipe", "pipe"] });
  s.cikti = ""; s.stdout.on("data", (d) => { s.cikti += d; }); s.stderr.on("data", (d) => { s.cikti += d; });
  for (let i = 0; i < 30 && !/deneme sunucusu|Serving HTTP/.test(s.cikti); i++) await bekle(100);
  await bekle(300); return s;
}
// Taze tarayıcı + ağ düzeyi sayım. Ana proje TAKLİT (ağa çıkmaz); GitHub rehberi taklit (gerçek rehber gibi ana firmayı içerir).
async function tarayiciAc() {
  const tarayici = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
  const sayfa = await (await tarayici.newContext()).newPage();
  const ag = [];
  await sayfa.addInitScript(() => { window.addEventListener("load", () => {
    if (window.__App && window.__ReactDOMClient && !document.getElementById("kok").children.length)
      window.__ReactDOMClient.createRoot(document.getElementById("kok")).render(window.__React.createElement(window.__App)); }); });
  await sayfa.route(() => true, async (r) => {
    const u = new URL(r.request().url()); ag.push({ host: u.host, yol: u.pathname, m: r.request().method() });
    if (u.host === DENEME_HOST) return r.fulfill(await kopru.__yanitla(r.request()));
    if (u.host === ANA_HOST) return u.pathname === "/auth/v1/settings" ? r.fulfill({ status: 200, contentType: "application/json", body: "{}" }) : r.abort();
    if (u.href.split("?")[0] === REHBER_GITHUB) return r.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ surum: 1, firmalar: { [ozet(ANA.kod)]: { url: ANA.url, anahtar: ANA.anahtar } } }) });
    if (u.host === "127.0.0.1:" + PORT) return r.continue();
    return r.abort();                                                                 // diğer dış adresler: sayılır, ağa çıkmaz
  });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.goto(`http://127.0.0.1:${PORT}/${DOSYA}`); await sayfa.waitForTimeout(2500);
  return { tarayici, sayfa, ag, hatalar };
}
const secim = (sayfa) => sayfa.evaluate(() => (JSON.parse(localStorage.getItem("firma:secim") || "{}").url) || null).catch(() => "OKUNAMADI");
const anaya = (ag) => ag.filter((x) => x.host === ANA_HOST).map((x) => `${x.m} ${x.yol}`);
async function kodlaBaglan(sayfa, kod) {
  await sayfa.fill("[data-firma-kodu]", kod);
  await Promise.all([sayfa.waitForNavigation({ timeout: 8000 }).catch(() => null), sayfa.click("[data-firma-uygula]")]);
  await sayfa.waitForLoadState("load").catch(() => {}); await sayfa.waitForTimeout(2500);
}
async function gelismisBaglan(sayfa, url, anahtar) {
  if (!(await sayfa.locator("[data-firma-adres]").count())) await sayfa.locator("button", { hasText: "Gelişmiş" }).first().click();
  await sayfa.fill("[data-firma-adres]", url); await sayfa.fill("[data-firma-anahtar]", anahtar);
  await Promise.all([sayfa.waitForNavigation({ timeout: 8000 }).catch(() => null), sayfa.click("[data-firma-uygula]")]);
  await sayfa.waitForLoadState("load").catch(() => {}); await sayfa.waitForTimeout(2500);
}
const hataMetni = (sayfa) => sayfa.locator("[data-firma-hata]").innerText().catch(() => "");

(async () => {
  console.log(`deneme-provasi · http://127.0.0.1:${PORT}/${DOSYA} · deneme=${DENEME_HOST} · ana proje TAKLİT`);

  console.log("0) KONTROL — korumasız düz sunucu: GitHub rehberine dönüş yolu");
  { const s = await sunucuAc(false); const { tarayici, sayfa, ag } = await tarayiciAc();
    await kodlaBaglan(sayfa, "nds");
    k_("korumasız: rehber GitHub'dan okundu (firmalar.json yerelde yok)", ag.some((x) => REHBER_GITHUB.endsWith(x.host + x.yol)), true);
    k_("korumasız: 'nds' kodu ANA PROJEYE çözüldü ve seçildi (kapatılması gereken yol)", await secim(sayfa), ANA.url);
    k_("korumasız: ana projeye istek ağa çıktı", anaya(ag).length > 0, true);
    await tarayici.close(); s.kill(); }

  console.log("1) deneme-sunucu.py yanlış adresle başlamaz");
  { const r1 = spawnSync("python3", [SUNUCU, "--proje", ANA.url, "--port", String(PORT)], { cwd: kok, encoding: "utf8", timeout: 5000 });
    k_("ana projenin adresi → DUR, çıkış ≠ 0", [r1.status !== 0, /ANA PROJENİN/.test(r1.stderr + r1.stdout)], [true, true]);
    const r2 = spawnSync("python3", [SUNUCU, "--proje", "https://ornek.com", "--port", String(PORT)], { cwd: kok, encoding: "utf8", timeout: 5000 });
    k_("supabase.co olmayan adres → DUR", [r2.status !== 0, /DUR/.test(r2.stderr + r2.stdout)], [true, true]); }

  console.log("2) KORUMALI — ana firma kodu ('nds')");
  { const s = await sunucuAc(true); const { tarayici, sayfa, ag } = await tarayiciAc();
    k_("sunulan dosya diskteki dosyayla aynı (SHA-256)", (s.cikti.match(/SHA-256: ([0-9a-f]+)/) || [])[1],
      crypto.createHash("sha256").update(fs.readFileSync(path.join(kok, DOSYA))).digest("hex"));
    await kodlaBaglan(sayfa, "nds");
    k_("seçim yazılmadı", await secim(sayfa), null);
    k_("kod ekranında hata gösterildi", (await hataMetni(sayfa)).length > 0, true);
    k_("GitHub rehberine ağ isteği çıkmadı", ag.filter((x) => REHBER_GITHUB.endsWith(x.host + x.yol)).length, 0);
    k_("ana projeye ağ isteği yok", anaya(ag), []);
    await bekle(500);
    k_("engelleme sunucuya bildirildi (github.io)", /ENGELLENDİ: https:\/\/mtalay61-coder\.github\.io/.test(s.cikti), true);

    console.log("3) KORUMALI — Gelişmiş'e ana projenin adresi + publishable anahtarı");
    await gelismisBaglan(sayfa, ANA.url, ANA.anahtar);
    k_("seçim yazılmadı", await secim(sayfa), null);
    k_("hata gösterildi", (await hataMetni(sayfa)).length > 0, true);
    k_("ana projeye ağ isteği yok", anaya(ag), []);
    await bekle(500);
    k_("engelleme sunucuya ANA PROJE olarak bildirildi", /ENGELLENDİ: https:\/\/mqdgucoomgqcvhvgixbl\.supabase\.co.*ANA PROJE/.test(s.cikti), true);
    if (process.env.TESHIS) console.log("    TESHIS hata metni:", JSON.stringify(await hataMetni(sayfa)));

    console.log("4) KORUMALI — deneme projesi");
    await gelismisBaglan(sayfa, DENEME.url, "sb_secret_DENEME_PROVA_YANLIS");
    k_("secret anahtar → hata, seçim yok", [/GİZLİ|secret/i.test(await hataMetni(sayfa)), await secim(sayfa)], [true, null]);
    await gelismisBaglan(sayfa, DENEME.url, DENEME.anahtar);
    k_("seçim deneme projesi (tek tık)", await secim(sayfa), DENEME.url);
    k_("giriş ekranı", await sayfa.locator('input[type="password"]:visible').count() > 0, true);
    await sayfa.locator('input:not([type="password"]):visible').first().fill("deneme");
    await sayfa.locator('input[type="password"]:visible').first().fill("prova-sifresi");
    await sayfa.locator("button", { hasText: "Giriş Yap" }).first().click();
    await sayfa.waitForFunction(() => !document.querySelector('input[type="password"]'), null, { timeout: 20000 }).catch(() => {});
    // Oturum, giriş ekranı kapanınca değil VERİ YÜKLENİNCE saklanır (ön giriş yolu: tanımlardan kullanıcı bulununca, ~1 sn).
    k_("oturum saklandı (oturum:aktif)", await sayfa.waitForFunction(() => !!localStorage.getItem("oturum:aktif"), null, { timeout: 20000 }).then(() => true).catch(() => false), true);
    k_("etkin kullanıcı deneme yöneticisi", await sayfa.evaluate(() => JSON.parse(localStorage.getItem("oturum:aktif") || "{}").kullaniciId || null), "kullanici-ilk");
    k_("uygulama açık (menü var, şifre alanı yok)", [await sayfa.locator('input[type="password"]:visible').count(), await sayfa.locator("[data-nav]").count() > 0], [0, true]);
    await sayfa.reload(); await sayfa.waitForLoadState("load"); await sayfa.waitForTimeout(4000);
    k_("F5 sonrası şifre istenmez", await sayfa.locator('input[type="password"]:visible').count(), 0);
    k_("deneme projesine istek gitti", ag.some((x) => x.host === DENEME_HOST), true);
    k_("baştan sona ana projeye ağ isteği yok", anaya(ag), []);
    const disarisi = [...new Set(ag.map((x) => x.host))].filter((h) => h !== DENEME_HOST && h !== "127.0.0.1:" + PORT).sort();
    k_("izinli olmayan hiçbir adrese ağ isteği yok (döviz kaynakları, api.anthropic.com dahil)", disarisi.filter((h) => !/fonts\.(googleapis|gstatic)\.com$/.test(h)), []);
    const engellenen = [...new Set((s.cikti.match(/ENGELLENDİ: https?:\/\/[^/ ]+/g) || []).map((x) => x.replace("ENGELLENDİ: ", "")))].sort();
    console.log("    sunucunun bildirdiği engellenen adresler:", JSON.stringify(engellenen));
    await tarayici.close(); s.kill(); }

  fs.rmSync(kok, { recursive: true, force: true });
  console.log(`── deneme-provasi: ${gecen} geçti, ${kalan} kaldı ──`); process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("HATA:", e.message.split("\n")[0]); process.exit(2); });
