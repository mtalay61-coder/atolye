// SENARYO — SÜRÜM DUYURUSU (kullanıcı, 14 Eylül: "her defasında ayrı HTML geliyor, tek tek atmak
// zorundayız; son uygulamada güncel sürüm eklense içeri giren günceli indirse").
//
// Ölçülen: buluttaki `surum` kaydı okunuyor; kendi sürümümüzden yeniyse üst şeritte "Yeni sürüm"
// ve İndir bağlantısı; eski/aynı sürümde şerit YOK; kapatınca gitmiyor; Tanımlar'dan yayınlama
// buluta yazıyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
// Başlatıcı sayfa depoda index.html adıyla duruyor (GitHub Pages kök adresi).
const BASLAT = require("path").join(__dirname, "..", "index.html");

async function calistir() {
  const hatalar = [];
  const ac = async (yayin) => {
    const onceRota = async (sayfa) => {
      await sayfa.route("**/rest/v1/surum**", (route) => route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify(yayin ? [{ id: "tekil", veri: yayin }] : []) }));
    };
    const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, onceRota });
    sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
    await sayfa.waitForTimeout(3500);   // sürüm kontrolü açılıştan sonra ayrı bir istek
    return { tarayici, sayfa };
  };
  const seritOku = (sayfa) => sayfa.evaluate(() => {
    const e = document.querySelector("[data-surum-seridi]");
    const a = e && e.querySelector("[data-surum-indir]");
    return e ? { surum: e.getAttribute("data-surum-seridi"), dugme: a && a.getAttribute("data-surum-indir"), etiket: a && a.textContent, url: (a || {}).href || null } : null;
  });

  // 1) Yeni sürüm yayında → şerit çıkar.
  let { tarayici, sayfa } = await ac({ surum: "9.9.9", url: "https://ornek.test/atolye-erp.html", not: "deneme" });
  const yeniSurum = await seritOku(sayfa);
  await sayfa.evaluate(() => document.querySelector("[data-surum-kapat]").click());
  await sayfa.waitForTimeout(300);
  const kapatildi = (await seritOku(sayfa)) === null;
  await tarayici.close();

  // 2) Eski sürüm yayında → şerit YOK.
  ({ tarayici, sayfa } = await ac({ surum: "0.1.0", url: "https://ornek.test/eski.html" }));
  const eskiSurum = await seritOku(sayfa);
  await tarayici.close();

  // 3) Kayıt yok → şerit YOK; Tanımlar'dan yayınlama buluta yazıyor.
  ({ tarayici, sayfa } = await ac(null));
  const kayitYok = await seritOku(sayfa);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  // 23 Eylül: elle bağlantı yazılan "Sürüm yayınla" formu KALDIRILDI; kayıt artık GitHub'a yayınla
  // ekranından, dosya yüklendikten sonra tazeleniyor. GitHub taklit ediliyor (gerçek istek yok).
  await sayfa.route("https://api.github.com/**", async (rota) => {
    const yol = new URL(rota.request().url()).pathname;
    const yanit = (v) => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(v) });
    if (/\/git\/ref\/heads\//.test(yol) && rota.request().method() === "GET") return yanit({ object: { sha: "a1" } });
    if (/\/git\/commits\/\w+$/.test(yol)) return yanit({ tree: { sha: "t1" } });
    if (/\/git\/blobs$/.test(yol)) return yanit({ sha: "b1" });
    if (/\/git\/trees$/.test(yol)) return yanit({ sha: "t2" });
    if (/\/git\/commits$/.test(yol)) return yanit({ sha: "c2" });
    return yanit({ object: { sha: "c2" } });
  });
  await sayfa.evaluate(() => { const b = document.querySelector('[data-tanim-sekme="yayin"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const formVar = await sayfa.evaluate(() => !!document.querySelector("[data-github-yayin]"));
  await sayfa.locator("[data-gh-token]").first().fill("github_pat_TEST");
  await sayfa.locator("[data-gh-dosya]").first().setInputFiles({
    name: "atolye-erp-v9.9.9.html", mimeType: "text/html", buffer: Buffer.from("<!doctype html><html><title>Atölye ERP 9.9.9</title></html>", "utf8"),
  });
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-gh-yayinla]").first().click();
  await sayfa.waitForTimeout(1500);
  // SÜRÜM GEÇMİŞİ (23 Eylül): sekme var, kayıtlar sıralı, en üst kayıt = SURUM, yayın notu geçmişten.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-tanim-sekme="surumGecmisi"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const gecmis = await sayfa.evaluate(() => {
    const kayitlar = [...document.querySelectorAll("[data-surum-kaydi]")].map((k) => k.getAttribute("data-surum-kaydi"));
    // Sürümden bağımsız: her sürümde bir kayıt ekleniyor, altın her sürümde değişmesin.
    const surum = (document.querySelector("[data-surum-gecmisi] b.mono") || {}).textContent;
    return { enAz17Kayit: kayitlar.length >= 17, ilkKayitBuSurum: kayitlar[0] === surum, sirali: kayitlar.join(",") === [...kayitlar].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).join(","),
      buSurumIsareti: /bu sürüm/.test(document.querySelector("[data-surum-gecmisi]").textContent),
      acikMaddeler: document.querySelectorAll("[data-surum-madde]").length > 0 };
  });
  const yazilan = await depoOku(sayfa, "surum:data");
  const yayinSonrasiSerit = await seritOku(sayfa);
  await tarayici.close();

  // BAŞLATICI (baslat.html): sabit adres, yayınlanan sürüme yönlendirir.
  const { chromium } = require("playwright");
  const tarayici2 = await chromium.launch();
  const sayfa2 = await tarayici2.newPage();
  await sayfa2.route("**/rest/v1/surum**", (route) => route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify([{ id: "tekil", veri: { surum: "1.280.0", url: "https://ornek.test/uygulama/atolye-erp-v1.280.0.html" } }]) }));
  await sayfa2.route("https://ornek.test/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<h1>UYGULAMA</h1>" }));
  await sayfa2.goto("file://" + BASLAT);
  await sayfa2.waitForTimeout(1500);
  const baslatici = { adres: sayfa2.url().replace(/^https:\/\/ornek\.test/, "<sunucu>"), icerik: (await sayfa2.content()).includes("UYGULAMA") };

  // JSON yolu: küçük bir yerel sunucu (baslat.html + surum.json aynı klasörde). `fetch` file://
  // altında göreli dosyayı okuyamaz, bu yüzden http gerekiyor.
  const fs = require("fs"), http = require("http"), path = require("path");
  const klasor = fs.mkdtempSync("/tmp/baslat-");
  fs.copyFileSync(BASLAT, path.join(klasor, "baslat.html"));
  fs.writeFileSync(path.join(klasor, "surum.json"), JSON.stringify({ surum: "1.281.0", url: "https://ornek.test/u/app.html" }));
  const sunucu = http.createServer((istek, yanit) => {
    const dosya = path.join(klasor, istek.url.split("?")[0].replace(/^\//, "") || "baslat.html");
    if (!fs.existsSync(dosya)) { yanit.writeHead(404); yanit.end(); return; }
    yanit.writeHead(200, { "Content-Type": dosya.endsWith(".json") ? "application/json" : "text/html" });
    yanit.end(fs.readFileSync(dosya));
  }).listen(8123);
  const sayfa3 = await tarayici2.newPage();
  await sayfa3.route("https://ornek.test/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<h1>UYGULAMA</h1>" }));
  await sayfa3.goto("http://localhost:8123/baslat.html");
  await sayfa3.waitForTimeout(1500);
  const baslaticiJson = { adres: sayfa3.url().replace(/^https:\/\/ornek\.test/, "<sunucu>"), icerik: (await sayfa3.content()).includes("UYGULAMA") };

  // JSON yok + tablo 401 → açıklayıcı ipucu (kullanıcının 14 Eylül'de gördüğü ekranın düzeltilmiş hâli).
  const sayfa4 = await tarayici2.newPage();
  await sayfa4.route("**/surum.json**", (route) => route.fulfill({ status: 404, body: "" }));
  await sayfa4.route("**/rest/v1/surum**", (route) => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await sayfa4.goto("file://" + BASLAT);
  await sayfa4.waitForTimeout(1500);
  const baslaticiHata = { durum: await sayfa4.textContent("#durum"), ipucuVar: /surum\.json/.test(await sayfa4.textContent("#ipucu")) };
  sunucu.close();
  await tarayici2.close();

  return { gecmis, hatalar, yeniSurum, kapatildi, eskiSurum, kayitYok, formVar, baslatici, baslaticiJson, baslaticiHata,
    yazilan: yazilan && { surum: yazilan.surum, url: yazilan.url, not: yazilan.not },
    yayinSonrasiSerit: yayinSonrasiSerit && yayinSonrasiSerit.surum };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
