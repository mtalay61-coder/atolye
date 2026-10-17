// SENARYO — ÖZEL CARİ TİPİ (v1.690, kullanıcı: "cari tiplerine yeni tip ekleyebilelim").
// Yeni cari formunda "+ Yeni tip…" → "Fasoncu", Tedarikçi gibi → kayıtta tip=Tedarikçi, altTip=Fasoncu;
// cari listesinde "Fasoncu" sekmesi çıkar.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await modulAc(sayfa, "Cari");
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Cari Ekle/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const gor = '[data-cari-tip-secici]';
  await sayfa.evaluate((q) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    const l = [...document.querySelectorAll("label")].filter((x) => /Unvan/.test(x.textContent) && x.getBoundingClientRect().width > 0)[0];
    const i = l.querySelector("input"); set.call(i, "Fason Atölye"); i.dispatchEvent(new Event("input", { bubbles: true }));
    const s = [...document.querySelectorAll(q)].find((x) => x.getBoundingClientRect().width > 0);
    s.value = "__yeni"; s.dispatchEvent(new Event("change", { bubbles: true }));
  }, gor);
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    const a = document.querySelector("[data-cari-yeni-tip-ad]"); set.call(a, "Fasoncu"); a.dispatchEvent(new Event("input", { bubbles: true }));
    const t = document.querySelector("[data-cari-yeni-tip-temel]"); t.value = "Tedarikçi"; t.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(200);
  await sayfa.evaluate(() => document.querySelector("[data-cari-yeni-tip-tamam]").click());
  await sayfa.waitForTimeout(200);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button.btn-save")].find((x) => x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(1500);
  const c = ((await depoOku(sayfa, "cari:data")) || []).find((x) => x.unvan === "Fason Atölye") || {};
  const sekme = await sayfa.evaluate(() => [...document.querySelectorAll("button")].some((b) => /^Fasoncu/.test(b.textContent.trim())));
  await tarayici.close();
  return { hatalar, tip: c.tip || null, altTip: c.altTip || null, sekme };
}
if (require.main === module) calistir().then((s) => console.log(normalles(s)));
module.exports = { calistir };
