// EKRAN SINAMASI ORTAK (7 Kasım). Uygulama, istemci dizininin test.html'iyle açılır; bütün bulut istekleri gerçek-pg-kopru ile YEREL
// PostgreSQL'e gider (Supabase'e değil). ISTEMCI_DIZIN: içinde test/ortak.js + test/test.html olan çalışma ağacı (ör. 1.744.7 = main).
const path = require("path");
const { kopruKur } = require("../gercek-pg-kopru.js");

const W = process.env.ISTEMCI_DIZIN || path.join(__dirname, "../..");
const O = require(path.join(W, "test/ortak.js"));
const EPOSTA = "ali@atolye.local";

// Kullanıcı adından giriş e-postası (uygulamanın ve yetki_var_mi'nin kuralı: Türkçe harfler sadeleşir + @atolye.local)
const kullaniciEpostasi = (ad) => String(ad).toLowerCase().replace(/[çğıiöşü]/g, (h) => ({ ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u" })[h]).replace(/[^a-z0-9._-]/g, "") + "@atolye.local";
// `kullanici` (23 Kasım): oturumu açılan ve giriş ekranında yazılan kullanıcı (vars. Ali = Yönetici).
async function ekranAc(veritabani, { mudahale = null, kullanici = "Ali" } = {}) {
  const eposta = kullanici === "Ali" ? EPOSTA : kullaniciEpostasi(kullanici);
  const k = kopruKur({ veritabani });
  const ayar = (await k.sorgu("select row_to_json(a) as r from public.stk_ayar a"))[0].r;
  process.env.TEST_HTML = path.join(W, "test/test.html");
  const hatalar = [];
  const { tarayici, sayfa } = await O.uygulamaAc({}, { hataYaz: false, stkAyar: ayar, onceRota: async (s) => {
    // gerçek API kipinde (KOPRU_SUPABASE) sahte oturum KONMAZ: giriş ekrandan, gerçek Auth hesabıyla yapılır (girisYap)
    if (!process.env.KOPRU_SUPABASE) await s.addInitScript((e) => { localStorage.setItem("atolye:oturum", JSON.stringify({ erisim: `yerel-test:${e}`, yenileme: `yerel-test:${e}`, sonaErme: Date.now() + 864e5, email: e })); }, eposta);
    await k.bagla(s);
    // senaryonun ağ müdahalesi (yanıt kaybı, istek tekrarı) köprüden SONRA kaydedilir → önce o denenir
    if (mudahale) await mudahale(s, k);
  } });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await girisYap(sayfa, kullanici);
  // gerçek API kipinde giriş sonrası veriler birkaç saniyede gelir (menü önce yetkisiz varsayılanla çizilir) — yüklenene kadar beklenir
  if (process.env.KOPRU_SUPABASE) await yuklenmeyiBekle(sayfa);
  return { tarayici, sayfa, k, hatalar, ayar, eposta };
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

// YÜKLENDİ Mİ (27 Kasım, gerçek API kipi): menü var, "Yükleniyor" yok, giriş ekranı yok ve menü öğe sayısı art arda üç bakışta aynı.
async function yuklenmeyiBekle(sayfa, enCok = 40) {
  let once = -1, ust = 0;
  for (let i = 0; i < enCok; i++) {
    const d = await sayfa.evaluate(() => ({ menu: document.querySelectorAll("[data-nav]").length, yukleniyor: document.body.innerText.includes("Yükleniyor"),
      sifre: [...document.querySelectorAll('input[type="password"]')].some((x) => x.offsetParent !== null) })).catch(() => ({}));
    if (d.menu && !d.yukleniyor && !d.sifre && d.menu === once) { ust += 1; if (ust >= 2) return true; } else ust = 0;
    once = d.menu; await sayfa.waitForTimeout(1000);
  }
  return false;
}
// ÜRETİM MENÜSÜ HAZIR MI: sınamaların yenileme döngüsündeki koşul. Sayfa yenilenince menü bir an çizilip sonra giriş ekranı gelir;
// köprü kipinde bu çok kısa sürer, gerçek API'de döngü o anı "hazır" sanıp erken çıkıyordu. Gerçek kipte durum 2,5 sn sonra da aynı olmalı.
async function uretimMenusuHazir(sayfa) {
  const bak = () => sayfa.evaluate(() => !!document.querySelector('[data-nav="Üretim"]') && !document.body.innerText.includes("Yükleniyor")
    && ![...document.querySelectorAll('input[type="password"]')].some((x) => x.offsetParent !== null)).catch(() => false);
  if (!process.env.KOPRU_SUPABASE) return (await sayfa.locator('[data-nav="Üretim"]').count()) > 0;
  if (!(await bak())) return false;
  await sayfa.waitForTimeout(2500);
  return bak();
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

module.exports = { ekranAc, yenile, girisYap, toastlar, O, W, EPOSTA, kullaniciEpostasi, yuklenmeyiBekle, uretimMenusuHazir };
