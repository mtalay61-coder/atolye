// SENARYO — SAYFA YENİLENİNCE EKRAN KORUNUYOR (25 Eylül, v1.448.0).
//
// Kullanıcı: "Sayfayı yenilediğimizde her şeyi kapatıp ana sayfaya alıyor. Yenilemeyi aslında
// açılan yeni renk vs. güncellensin diye yapıyorum."
//
// Ölçülenler:
//   1. Açık modül sekmeleri, etkin sekme ve açık sipariş penceresi yenilemeden sonra geri geliyor.
//   2. Veri yenilemede buluttan/depodan YENİDEN okunuyor (pencere güncel kaydı gösteriyor).
//   3. Kaydı olmayan pencere ve kopya taşıyan pencere türü (reçete) geri getirilmiyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

// Test sayfası kendini çizmiyor; yenilemeden sonra uygulama elle kuruluyor.
async function yenileVeKur(sayfa) {
  await sayfa.reload();
  await sayfa.evaluate(() => {
    const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok"));
    kok.render(window.__React.createElement(window.__App));
  });
  await sayfa.waitForTimeout(2300);
}

const ekran = (sayfa) => sayfa.evaluate(() => {
  const d = JSON.parse(sessionStorage.getItem("arayuz:durum") || "null");
  return {
    // Yenilemeden sonra uygulamanın KENDİ durumu (ilk çizimde kayda geri yazılıyor).
    tab: d && d.tab, acikSekmeler: d && d.acikSekmeler, aktifPencere: d && d.aktifPencereId,
    siparisPenceresi: [...document.querySelectorAll('[data-siparis-karti="sy1"]')].some((x) => x.getBoundingClientRect().width > 0),
  };
});

async function calistir() {
  const t = { ...TOHUM };
  t["siparis:data"] = JSON.stringify([
    { id: "sy1", siparisNo: "SAT-Y1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-20", not: "ilk",
      kalemler: [{ id: "ky1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 400, paraBirimi: "TRY" }] },
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  // Stok sekmesi açılıyor, sonra Sipariş; SAT-Y1 tam ekran.
  await sayfa.getByRole("button", { name: "Stok", exact: true }).first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.getByRole("button", { name: "Sipariş", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const d = [...document.querySelectorAll("div")].filter((x) => x.textContent.includes("SAT-Y1") && x.getBoundingClientRect().width > 0).pop();
    if (d) d.click();
  });
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(800);
  const once = await ekran(sayfa);

  // 1 + 2. Yenile. Bu arada "başka bilgisayar" siparişin notunu değiştirmiş gibi: depo tohumu
  // yenilemede baştan kuruluyor, o yüzden değişiklik tohumun kendisine yazılıyor.
  await sayfa.addInitScript(() => {
    const s = JSON.parse(window.__depo["siparis:data"]);
    s[0].not = "başka bilgisayardan güncellendi";
    window.__depo["siparis:data"] = JSON.stringify(s);
  });
  await yenileVeKur(sayfa);
  const sonra = await ekran(sayfa);
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN });
  const guncelNot = await sayfa.evaluate(() =>
    /başka bilgisayardan güncellendi/.test((document.querySelector('[data-siparis-karti="sy1"]') || {}).innerText || ""));

  // 3. Kaydı olmayan sipariş penceresi ve reçete penceresi kayda elle konuyor → geri gelmemeli.
  await sayfa.evaluate(() => {
    const d = JSON.parse(sessionStorage.getItem("arayuz:durum"));
    d.pencereler.push({ id: "siparis-yok", tip: "siparis", kayitId: "yok", baslik: "Satış: SİLİNMİŞ", veri: {} });
    d.pencereler.push({ id: "recete-u2", tip: "recete", kayitId: "u2", baslik: "Reçete: Bot", veri: {} });
    sessionStorage.setItem("arayuz:durum", JSON.stringify(d));
  });
  await yenileVeKur(sayfa);
  const ayiklandi = await sayfa.evaluate(() => {
    const d = JSON.parse(sessionStorage.getItem("arayuz:durum"));
    return {
      pencereler: d.pencereler.map((p) => p.id),
      seritteSilinmis: /SİLİNMİŞ/.test(document.body.innerText),
      seritteRecete: /Reçete: Bot/.test(document.body.innerText),
    };
  });

  await tarayici.close();
  return {
    hatalar,
    once,
    sonra,
    guncelNot,
    ayiklandi,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
