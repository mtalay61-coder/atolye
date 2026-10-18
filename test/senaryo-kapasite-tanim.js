// SENARYO — KAPASİTE TANIMI (v1.703). Tanımlar › Kapasite: makine ekle, saatini ve hızını gir, ona bağlı kalıp ekle,
// kalıba beden beden saatlik adet gir; hepsi tanimlar.kapasite'ye yazılır.
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
  await set("[data-makine-yeni]", "Kesim Makinesi");
  await sayfa.evaluate(() => document.querySelector("[data-makine-ekle]").click());
  await sayfa.waitForTimeout(800);
  await set('[data-makine="Kesim Makinesi"] [data-makine-alan="saatlikAdet"]', "50");
  await sayfa.waitForTimeout(500);
  const makineId = await sayfa.evaluate(() => document.querySelector("[data-kalip-makine] option:nth-child(2)").value);
  await set("[data-kalip-yeni]", "Kalıp A");
  await set("[data-kalip-makine]", makineId);
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => document.querySelector("[data-kalip-ekle]").click());
  await sayfa.waitForTimeout(800);
  const ilkBeden = await sayfa.evaluate(() => { const i = document.querySelector('[data-kalip="Kalıp A"] [data-kalip-beden]'); return i && i.getAttribute("data-kalip-beden"); });
  if (ilkBeden) await set(`[data-kalip="Kalıp A"] [data-kalip-beden="${ilkBeden}"]`, "40");
  await sayfa.waitForTimeout(1500);
  // Proses sekmesi (v1.704.1): Kesim'de yeni makine Kesim'le doğar; prossesiz makine bu sekmede görünmez.
  await sayfa.locator('[data-kapasite-sekme="Kesim"]').first().click();
  await sayfa.waitForTimeout(400);
  await set("[data-makine-yeni]", "Pres");
  await sayfa.evaluate(() => document.querySelector("[data-makine-ekle]").click());
  await sayfa.waitForTimeout(1200);
  const kesimGorunen = await sayfa.evaluate(() => [...document.querySelectorAll("[data-makine]")].map((e) => e.getAttribute("data-makine")));
  const k = ((await depoOku(sayfa, "tanimlar:data")) || {}).kapasite || {};
  await tarayici.close();
  const m = (k.makineler || [])[0] || {};
  const kl = (k.kaliplar || [])[0] || {};
  const pres = (k.makineler || []).find((x) => x.ad === "Pres") || {};
  return { kesimGorunen, presProsesi: pres.prosesler, hatalar, makine: `${m.ad}:${m.saatlikAdet}:${m.gunlukSaat}`, kalip: `${kl.ad}:${kl.tur}:${kl.makineId === m.id}`, bedenYazildi: ilkBeden ? kl.bedenSaatlik[ilkBeden] : "beden yok" };
}
if (require.main === module) calistir().then((s) => console.log(normalles(s)));
module.exports = { calistir };
