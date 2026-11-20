// SENARYO — SİPARİŞ KALEM EKLE SATIRI DÜZENİ (v1.744.28, kullanıcı 20 Kasım).
//
//   "Sipariş ürün ve renk girişleri aynı ölçüde olsun, tasarım olarak hoş olmuyor, düzeni daha net yapalım; üzerine binen
//    yerler var." (ekran görüntüsü: Boyut ayarı büyük; asorti "Uygula" düğmesi miktar kutularının üstüne biniyor, ürün kutusu
//    renk kutusundan kısa)
//
// Ölçülen (geniş 1860 px ve dar 1100 px ekran × Boyut ayarı Normal ve Çok büyük düğme / kutu):
//   - ürün kutusu (görünen kap) ile renk kutusunun yüksekliği aynı mı
//   - kalem grubundaki kutu / düğmeler birbirinin üstüne biniyor mu (dikdörtgen kesişimi)
//   - asorti sütunundan taşan öğe var mı
const { uygulamaAc, modulAc, cariSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function olc(gen, boyut) {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bedenler = [{ id: "b36", ad: "36" }, { id: "b37", ad: "37" }, { id: "b38", ad: "38" }, { id: "b39", ad: "39" }, ...tan.bedenler];
  tan.asortiler = [{ id: "as1", ad: "8 Lİ STANDART", oranlar: [{ beden: "36", oran: 1 }, { beden: "37", oran: 2 }, { beden: "38", oran: 2 }, { beden: "39", oran: 2 }, { beden: "40", oran: 1 }] }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const stok = JSON.parse(t["stok:items"]);
  stok.push({ id: "m125", ad: "27506 D", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: ["36", "37", "38", "39", "40"].map((b) => ({ renk: "1008 - SİGARO SÜET", beden: b, miktar: 0 })), hareketler: [], recete: [], birimFiyat: 0 });
  t["stok:items"] = JSON.stringify(stok);
  t["gorunum:boyut"] = JSON.stringify({ genel: "normal", dugme: boyut, kutu: boyut });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  await sayfa.setViewportSize({ width: gen, height: 900 });
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(700);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click(); await sayfa.waitForTimeout(700);
  await cariSec(sayfa, "Müşteri B"); await sayfa.waitForTimeout(300);
  const bos = await sayfa.evaluate(() => {
    const u = document.querySelector("[data-siparis-urun] input, input[placeholder='Model ara…']");
    const r = [...document.querySelectorAll("[data-siparis-renk-arama] input, [data-siparis-renk-arama]")].find((x) => x.tagName === "INPUT") || document.querySelector("[data-siparis-renk-arama]");
    const h = (e) => e ? Math.round(e.getBoundingClientRect().height) : null;
    return { urunYukseklik: h(u), renkYukseklik: h(r) };
  });
  await sayfa.locator('input[placeholder="Model ara…"]:visible').first().click();
  await sayfa.locator('input[placeholder="Model ara…"]:visible').first().fill("27506");
  await sayfa.waitForTimeout(500);
  await sayfa.locator("text=27506 D").last().click().catch(() => {});
  await sayfa.waitForTimeout(600);
  const ri = sayfa.locator("[data-siparis-renk-arama] input, input[data-siparis-renk-arama]").first();
  await ri.click(); await ri.fill("1008"); await sayfa.waitForTimeout(400);
  await sayfa.locator("text=1008 - SİGARO SÜET").last().click().catch(() => {});
  await sayfa.waitForTimeout(700);
  const olcum = await sayfa.evaluate(() => {
    const h = (e) => e ? Math.round(e.getBoundingClientRect().height) : null;
    const ui = document.querySelector("input[data-siparis-urun]") || document.querySelector("input[placeholder='Model ara…']");
    const u = ui && (ui.closest(".arama-kabi") || ui);
    const r = [...document.querySelectorAll("input")].find((x) => x.getBoundingClientRect().height > 0 && x.closest("[data-siparis-renk-arama]")) || null;
    const grup = document.querySelector("[data-siparis-kalem-grup]");
    const kutular = grup ? [...grup.querySelectorAll("input, select, button")].filter((x) => x.getBoundingClientRect().height > 0) : [];
    const ort = [];
    for (let i = 0; i < kutular.length; i++) for (let j = i + 1; j < kutular.length; j++) {
      const a = kutular[i].getBoundingClientRect(), b = kutular[j].getBoundingClientRect();
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) ort.push(`${kutular[i].tagName}${kutular[i].textContent.trim().slice(0, 10)} × ${kutular[j].tagName}${kutular[j].textContent.trim().slice(0, 10)}`);
    }
    const asorti = document.querySelector("[data-asorti-dar]");
    const aR = asorti && asorti.getBoundingClientRect();
    const tasan = asorti ? [...asorti.querySelectorAll("select, input, button")].filter((x) => x.getBoundingClientRect().right > aR.right + 1).map((x) => x.tagName + (x.textContent || "").trim().slice(0, 8)) : [];
    return { urunYukseklik: h(u), renkYukseklik: h(r), ortusme: ort, asortidenTasan: tasan, renkSecili: !!grup };
  });
  await tarayici.close();
  return { urunRenkAyniBoy: olcum.urunYukseklik === olcum.renkYukseklik && olcum.urunYukseklik > 0, ortusme: olcum.ortusme,
    asortidenTasan: olcum.asortidenTasan, renkSecili: olcum.renkSecili, bosFormdaAyniBoy: bos.renkYukseklik > 0 };
}

async function calistir() {
  const sonuc = {};
  for (const gen of [1860, 1100]) for (const boyut of ["normal", "cokBuyuk"]) sonuc[`${gen}-${boyut}`] = await olc(gen, boyut);
  return sonuc;
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
