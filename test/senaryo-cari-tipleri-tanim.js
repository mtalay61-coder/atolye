// SENARYO — CARİ TİPLERİ TANIMI (v1.701). Tanımlar › Firma › Cari Tipleri: ekle, kullanılan tipin adını değiştir (cari de
// güncellenir), kullanılan tip silinemez.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const cariler = JSON.parse(t["cari:data"]);
  cariler[0] = { ...cariler[0], tip: "Personel", altTip: "Fasoncu" };
  t["cari:data"] = JSON.stringify(cariler);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(800);
  const set = (sel, v) => sayfa.evaluate(([s, v]) => { const i = document.querySelector(s); const st = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; st.call(i, v); i.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]);
  await set("[data-cari-tipi-yeni]", "Kargo");
  await sayfa.evaluate(() => document.querySelector("[data-cari-tipi-ekle]").click());
  await sayfa.waitForTimeout(2500);
  const araTipler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-cari-tipi]")].map((e) => e.getAttribute("data-cari-tipi")));
  await sayfa.evaluate(() => { const i = document.querySelector('[data-cari-tipi-ad="Fasoncu"]'); const st = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; st.call(i, "Fason Usta"); i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); });
  await sayfa.waitForTimeout(1200);
  const tan = await depoOku(sayfa, "tanimlar:data");
  const c = ((await depoOku(sayfa, "cari:data")) || [])[0] || {};
  const silinemez = await sayfa.evaluate(() => !document.querySelector('[data-cari-tipi="Fason Usta"] button'));
  await tarayici.close();
  return { hatalar, araTipler, tipler: (tan.cariTipleri || []).map((x) => `${x.ad}:${x.temel}`), cariTipi: `${c.tip}/${c.altTip}`, silinemez };
}
if (require.main === module) calistir().then((s) => console.log(normalles(s)));
module.exports = { calistir };
