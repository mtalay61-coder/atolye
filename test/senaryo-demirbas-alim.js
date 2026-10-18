// SENARYO — DEMİRBAŞ ALIMI (v1.705). Tanımlar › Kapasite: makine ekle, "Satın alındı…" ile tedarikçiye alım yaz →
// carinin hareketi fişli Alış, üzerinde demirbas bağı ve amortisman ayı; kart altında alım satırı görünür.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(800);
  await sayfa.locator('[data-tanim-sekme="kapasite"]').first().click();
  await sayfa.waitForTimeout(500);
  const set = (sel, v) => sayfa.evaluate(([s, v]) => { const i = document.querySelector(s); const p = i.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, "value").set.call(i, v); i.dispatchEvent(new Event(i.tagName === "SELECT" ? "change" : "input", { bubbles: true })); }, [sel, v]);
  await set("[data-makine-yeni]", "Kesim Presi");
  await sayfa.evaluate(() => document.querySelector("[data-makine-ekle]").click());
  await sayfa.waitForTimeout(1000);
  await sayfa.evaluate(() => document.querySelector('[data-demirbas="Kesim Presi"] [data-demirbas-satin-al]').click());
  await sayfa.waitForTimeout(300);
  const cariId = await sayfa.evaluate(() => document.querySelector("[data-demirbas-cari] option:nth-child(2)").value);
  await set("[data-demirbas-cari]", cariId);
  await set("[data-demirbas-tutar]", "36000");
  await set("[data-demirbas-ay]", "36");
  await sayfa.waitForTimeout(200);
  await sayfa.evaluate(() => document.querySelector("[data-demirbas-kaydet]").click());
  await sayfa.waitForTimeout(1500);
  const c = ((await depoOku(sayfa, "cari:data")) || []).find((x) => x.id === cariId) || {};
  const h = (c.hareketler || []).find((x) => x.demirbas) || {};
  const satir = await sayfa.evaluate(() => (document.querySelector('[data-demirbas="Kesim Presi"]') || {}).innerText || "");
  await tarayici.close();
  return { hatalar, yon: h.yon, tutar: h.tutar, fisVar: !!h.fisNo, aciklama: h.aciklama, demirbas: h.demirbas && `${h.demirbas.tur}:${h.demirbas.ad}:${h.demirbas.amortismanAy}`,
    kartta: /36 ay amortisman/.test(satir) };
}
if (require.main === module) calistir().then((s) => console.log(normalles(s)));
module.exports = { calistir };
