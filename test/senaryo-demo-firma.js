// SENARYO — DEMO FİRMA (v1.645.0): firma kodu ekranında "Demoyu dene" → yeniden yükleme → örnek verili uygulama
// (buluta HİÇ istek gitmez), DEMO şeridi; Sıfırla örnek veriye döndürür; Çık firma kodu ekranına götürür.
const { uygulamaAc, modulAc, bekle } = require("./ortak.js");
const ciz = (sayfa) => sayfa.evaluate(() => window.__ReactDOMClient.createRoot(document.getElementById("kok")).render(window.__React.createElement(window.__App)));

(async () => {
  const sonuc = { hatalar: [] };
  const { tarayici, sayfa } = await uygulamaAc({}, { hataYaz: false, firmaSecili: false, yuklemeyiBekle: false });
  sayfa.on("pageerror", (e) => sonuc.hatalar.push(e.message.split("\n")[0]));
  const bulut = [];
  sayfa.on("request", (r) => { if (/supabase\.co/.test(r.url())) bulut.push(r.url()); });
  await bekle(800);
  sonuc.demoDugmesi = await sayfa.evaluate(() => !!document.querySelector("[data-demo-dene]"));
  let yuklendi = sayfa.waitForEvent("load", { timeout: 8000 }).catch(() => null);
  await sayfa.click("[data-demo-dene]");
  if (!(await yuklendi)) sonuc.hatalar.push("demo: yeniden yüklenmedi");
  sonuc.secim = await sayfa.evaluate(() => JSON.parse(localStorage.getItem("firma:secim") || "null"));
  bulut.length = 0;
  await ciz(sayfa);
  await sayfa.waitForFunction(() => document.body && !/Yükleniyor|hazırlanıyor/.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});
  await bekle(1500);
  sonuc.acilis = await sayfa.evaluate(() => ({
    serit: !!document.querySelector("[data-demo-seridi]"),
    firmaKoduEkraniYok: !document.querySelector("[data-firma-penceresi]"),
    sihirbazYok: !document.querySelector("[data-kurulum-sihirbazi]"),
    urunSayisi: JSON.parse(window.__depo["stok:items"] || "[]").length,
  }));
  await modulAc(sayfa, "Stok");
  await bekle(800);
  sonuc.stokEkrani = await sayfa.evaluate(() => ["Saya Derisi", "Kauçuk Taban", "Dikiş İpi"].filter((ad) => document.body.innerText.includes(ad)));
  await modulAc(sayfa, "Sipariş");
  await bekle(800);
  sonuc.siparisEkrani = await sayfa.evaluate(() => ["SAT-1", "Yıldız Mağazaları"].filter((m) => document.body.innerText.includes(m)));
  sonuc.bulutaIstekYok = bulut.length === 0;

  // Sıfırla: örnek veri bozulsa bile geri gelir.
  await sayfa.evaluate(() => { window.__depo["cari:data"] = "[]"; });
  sayfa.on("dialog", (d) => d.accept());
  yuklendi = sayfa.waitForEvent("load", { timeout: 8000 }).catch(() => null);
  await sayfa.click("[data-demo-sifirla]");
  await yuklendi;
  // Test kabuğunun depo taklidi yeniden yüklemede boşalıyor; yeniden açılışta örnek cariler geri gelmeli.
  await ciz(sayfa);
  await bekle(1500);
  sonuc.sifirlamaSonrasiCariler = await sayfa.evaluate(() => JSON.parse(window.__depo["cari:data"] || "[]").map((c) => c.unvan));

  // Çık: seçim silinir → firma kodu ekranı.
  yuklendi = sayfa.waitForEvent("load", { timeout: 8000 }).catch(() => null);
  await sayfa.click("[data-demo-cik]");
  await yuklendi;
  await ciz(sayfa);
  await bekle(800);
  sonuc.cikis = await sayfa.evaluate(() => ({ secim: localStorage.getItem("firma:secim"), kodEkrani: !!document.querySelector("[data-firma-penceresi]") }));
  await tarayici.close();
  console.log(JSON.stringify(sonuc, null, 1));
})();
