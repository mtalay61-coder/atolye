// EKRAN SINAMASI ORTAK (7 Kasım). Uygulama, istemci dizininin test.html'iyle açılır; bütün bulut istekleri gerçek-pg-kopru ile YEREL
// PostgreSQL'e gider (Supabase'e değil). ISTEMCI_DIZIN: içinde test/ortak.js + test/test.html olan çalışma ağacı (ör. 1.744.7 = main).
const path = require("path");
const { kopruKur } = require("../gercek-pg-kopru.js");

const W = process.env.ISTEMCI_DIZIN || path.join(__dirname, "../..");
const O = require(path.join(W, "test/ortak.js"));
const EPOSTA = "ali@atolye.local";

async function ekranAc(veritabani, { mudahale = null } = {}) {
  const k = kopruKur({ veritabani });
  const ayar = (await k.sorgu("select row_to_json(a) as r from public.stk_ayar a"))[0].r;
  process.env.TEST_HTML = path.join(W, "test/test.html");
  const hatalar = [];
  const { tarayici, sayfa } = await O.uygulamaAc({}, { hataYaz: false, stkAyar: ayar, onceRota: async (s) => {
    await s.addInitScript((e) => { localStorage.setItem("atolye:oturum", JSON.stringify({ erisim: `yerel-test:${e}`, yenileme: `yerel-test:${e}`, sonaErme: Date.now() + 864e5, email: e })); }, EPOSTA);
    await k.bagla(s);
    // senaryonun ağ müdahalesi (yanıt kaybı, istek tekrarı) köprüden SONRA kaydedilir → önce o denenir
    if (mudahale) await mudahale(s, k);
  } });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await girisYap(sayfa);
  return { tarayici, sayfa, k, hatalar, ayar };
}

// KULLANICI GİRİŞİ (Tanımlar'da giriş açıksa): ekrandan kullanıcı adı + şifre → uygulama /auth/v1/token ister (köprü yerel jeton
// verir; şifre doğrulanmaz — yerel sınama). Kullanıcı ali = Yönetici.
async function girisYap(sayfa, kullanici = "Ali") {
  const sifre = sayfa.locator('input[type="password"]:visible');
  if (!(await sifre.count())) return false;
  const ad = sayfa.locator('input:not([type="password"]):visible').first();
  await ad.fill(kullanici); await sifre.first().fill("yerel-sinama");
  await sayfa.locator("button", { hasText: "Giriş Yap" }).first().click();
  await sayfa.waitForTimeout(3000);
  return true;
}

// SAYFA YENİLEME: aynı sekme (localStorage, oturum aynı) — uygulama baştan açılır ve buluttan yükler
async function yenile(sayfa) {
  await sayfa.reload();
  await sayfa.evaluate(() => {
    const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok"));
    kok.render(window.__React.createElement(window.__App));
  });
  await sayfa.waitForFunction(() => document.body && !document.body.innerText.includes("Yükleniyor"), null, { timeout: 20000 }).catch(() => {});
  await sayfa.waitForTimeout(2500);
  await girisYap(sayfa);
}

const toastlar = (sayfa) => sayfa.evaluate(() => [...document.querySelectorAll("[data-toast]")].map((x) => x.innerText.replace(/\s+/g, " ").trim()).join(" | "));

module.exports = { ekranAc, yenile, girisYap, toastlar, O, W, EPOSTA };
