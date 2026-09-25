// SENARYO — YENİ SÜRÜME OTOMATİK GEÇİŞ (25 Eylül, v1.447.0).
//
// Kullanıcı: "Yeni sürüm haber versin ve ona geçiş yapsın kullanıcılar. Uygulama olarak girdikleri
// için eski sürüm çıkabilir veya otomatik geçsin."
//
// Uygulama http adresinden açılıyor (surum.json göreli okunuyor; file:// altında okunamaz).
// Ölçülenler:
//   1. AÇILIŞTA yeni sürüm → sormadan geçiliyor.
//   2. DÖNGÜ KORUMASI: geçilen adres hâlâ eski sürümü açıyorsa ikinci kez geçilmiyor, şerit çıkıyor.
//   3. Yayındaki sürüm eskiyse geçiş de şerit de yok.
//   4. ÇALIŞIRKEN yeni sürüm çıkınca: KISA arka plan → geçilmiyor (şerit çıkıyor);
//      UZUN arka plan (eşik) → geri gelince geçiliyor.
const fs = require("fs");
const path = require("path");
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const UYGULAMA = fs.readFileSync(path.join(__dirname, "test.html"), "utf8");
const KOK = "http://atolye.test/";

// `surum`: fonksiyon — her istekte o anki yayın bilgisini döndürür (senaryo ortasında değişebilsin).
// `yeniSayfa`: yeni sürüm adresinin içeriği ("uygulama" = aynı eski uygulama, döngü denemesi için).
function rotalar(surum, yeniSayfa = "isaret") {
  return async (sayfa) => {
    await sayfa.addInitScript(() => {
      window.__surumGeriDonusEsigiMs = 700;
      // Görünürlük test tarafından sürülüyor: gerçek sekme gizlenemiyor.
      window.__gorunurluk = "visible";
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => window.__gorunurluk });
    });
    await sayfa.route(`${KOK}**`, (route) => {
      const u = new URL(route.request().url());
      if (u.pathname === "/surum.json") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(surum()) });
      }
      if (u.pathname === "/yeni.html" && yeniSayfa === "isaret") {
        return route.fulfill({ status: 200, contentType: "text/html", body: "<h1 id='yeni'>YENİ SÜRÜM</h1>" });
      }
      return route.fulfill({ status: 200, contentType: "text/html", body: UYGULAMA });
    });
  };
}

const adresi = (sayfa) => sayfa.url().replace(KOK, "<kok>/");
const serit = (sayfa) => sayfa.evaluate(() => {
  const e = document.querySelector("[data-surum-seridi]");
  return e ? e.getAttribute("data-surum-seridi") : null;
});
const gorunurlukDegistir = (sayfa, durum) => sayfa.evaluate((d) => {
  window.__gorunurluk = d;
  document.dispatchEvent(new Event("visibilitychange"));
}, durum);

async function calistir() {
  const yeni = { surum: "9.9.9", url: `${KOK}yeni.html`, not: "deneme" };

  // 1. Açılışta geçiş.
  let { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, adres: `${KOK}uygulama.html`, onceRota: rotalar(() => yeni) });
  await sayfa.waitForTimeout(2500);
  const acilis = { adres: adresi(sayfa), yeniSayfa: await sayfa.evaluate(() => !!document.getElementById("yeni")) };
  await tarayici.close();

  // 2. Döngü koruması: yeni.html de ESKİ uygulamayı açıyor.
  ({ tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, adres: `${KOK}uygulama.html`, onceRota: rotalar(() => yeni, "uygulama") }));
  await sayfa.waitForTimeout(2500);
  const ilkAdres = adresi(sayfa);
  // Geçilen sayfada uygulama yeniden kuruluyor (test.html kendini çizmiyor).
  await sayfa.evaluate(() => {
    const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok"));
    kok.render(window.__React.createElement(window.__App));
  });
  await sayfa.waitForTimeout(2500);
  const dongu = { ilkAdres, sonAdres: adresi(sayfa), serit: await serit(sayfa) };
  await tarayici.close();

  // 3. Yayındaki sürüm eski.
  ({ tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, adres: `${KOK}uygulama.html`, onceRota: rotalar(() => ({ surum: "0.1.0", url: `${KOK}eski.html` })) }));
  await sayfa.waitForTimeout(2500);
  const eski = { adres: adresi(sayfa), serit: await serit(sayfa) };
  await tarayici.close();

  // 4. Çalışırken yeni sürüm yayınlanıyor.
  let yayin = { surum: "0.1.0", url: `${KOK}eski.html` };
  ({ tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, adres: `${KOK}uygulama.html`, onceRota: rotalar(() => yayin) }));
  await sayfa.waitForTimeout(2500);
  yayin = yeni;
  // Kısa arka plan (eşiğin altında): geçiş yok, şerit var.
  await gorunurlukDegistir(sayfa, "hidden");
  await sayfa.waitForTimeout(100);
  await gorunurlukDegistir(sayfa, "visible");
  await sayfa.waitForTimeout(1200);
  const kisa = { adres: adresi(sayfa), serit: await serit(sayfa) };
  // Uzun arka plan (eşiğin üstünde): geri gelince geçiş.
  await gorunurlukDegistir(sayfa, "hidden");
  await sayfa.waitForTimeout(1000);
  await gorunurlukDegistir(sayfa, "visible");
  await sayfa.waitForTimeout(1500);
  const uzun = { adres: adresi(sayfa), yeniSayfa: await sayfa.evaluate(() => !!document.getElementById("yeni")) };
  await tarayici.close();

  return { acilis, dongu, eski, kisa, uzun };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
