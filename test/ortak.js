// ORTAK TEST YARDIMCILARI
// Uygulamayı gerçek Chromium'da çalıştırır. `window.storage` bellek içi sahte bir depoyla
// değiştirilir; uygulama Supabase'e ulaşamayınca yerel kopyaya düşer, böylece veri tohumlanabilir.
const path = require("path");
const { chromium } = require("playwright");

// `onceRota(sayfa)`: sayfa yüklenmeden ÖNCE ağ rotaları kurmak için (açılıştaki Supabase
// okumasını taklit etmek gerekiyorsa). Uygulama ilk render'da buluta gider; sonradan kurulan rota
// o istekleri yakalayamaz.
// `tarayiciArgs`: Chromium bayrakları — örn. sahte kamera (`--use-file-for-fake-video-capture`).
// `adres`: uygulamayı file:// yerine bu http(s) adresinden aç — çağıran `onceRota` ile o adresi
// test.html'e yönlendirir (sürüm dosyası gibi göreli okumalar yalnız http'de çalışıyor).
async function uygulamaAc(tohum = {}, { hataYaz = true, onceRota = null, tarayiciArgs = [], adres = null } = {}) {
  const tarayici = await chromium.launch({ args: tarayiciArgs });
  // Geniş pencere: dar ekranda kenar çubuğu daralıyor ve sekme düğmeleri gizleniyor.
  const sayfa = await tarayici.newPage({ viewport: { width: 1400, height: 950 } });
  if (hataYaz) {
    sayfa.on("pageerror", (e) => console.log("  [sayfa hatası]", e.message.split("\n")[0]));
    sayfa.on("console", (m) => { if (m.type() === "error") console.log("  [konsol]", m.text().slice(0, 200)); });
  }
  // Depo, sayfa yüklenmeden ÖNCE kurulmalı: uygulama ilk render'da okumaya başlıyor.
  await sayfa.addInitScript((veri) => {
    const kutu = { ...veri };
    window.__depo = kutu;
    window.storage = {
      async get(a) { if (!(a in kutu)) throw new Error("bulunamadı: " + a); return { key: a, value: kutu[a], shared: true }; },
      async set(a, d) { kutu[a] = String(d); return { key: a, value: String(d), shared: true }; },
      async delete(a) { delete kutu[a]; return { key: a, deleted: true, shared: true }; },
      async list(on = "") { return { keys: Object.keys(kutu).filter((k) => k.startsWith(on)), prefix: on, shared: true }; },
    };
  }, tohum);
  if (onceRota) await onceRota(sayfa);
  // HTML yolu değiştirilebilir: refaktör ÖNCESİ ve SONRASI paketleri aynı senaryoyla karşılaştırmak için.
  await sayfa.goto(adres || ("file://" + (process.env.TEST_HTML || path.join(__dirname, "test.html"))));
  await sayfa.evaluate(() => {
    const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok"));
    kok.render(window.__React.createElement(window.__App));
  });
  return { tarayici, sayfa };
}

// Depodaki bir anahtarı JSON olarak okur — testin "sonuç" tarafı budur.
const depoOku = (sayfa, anahtar) => sayfa.evaluate((a) => {
  const d = window.__depo[a];
  return d === undefined ? null : JSON.parse(d);
}, anahtar);

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { uygulamaAc, depoOku, bekle };
