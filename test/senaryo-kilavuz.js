// SENARYO — KULLANIM KILAVUZU (v1.698). Kitap ikonuyla açılır; bölüm düğmeleri; arama iki bölümde birden süzer.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  await sayfa.evaluate(() => document.querySelector('[data-nav="Kılavuz"]').click());
  await sayfa.waitForTimeout(600);
  const konular = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-kilavuz-konu]")].map((e) => e.getAttribute("data-kilavuz-konu")));
  const ilk = await konular();
  await sayfa.evaluate(() => document.querySelector('[data-kilavuz-bolum="calisan"]').click());
  await sayfa.waitForTimeout(300);
  const calisan = await konular();
  await sayfa.evaluate(() => { const i = document.querySelector("[data-kilavuz-ara]"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "maaş"); i.dispatchEvent(new Event("input", { bubbles: true })); });
  await sayfa.waitForTimeout(300);
  const arama = await konular();
  await tarayici.close();
  return { hatalar, ilkSayi: ilk.length, calisanSayi: calisan.length, arama };
}
if (require.main === module) calistir().then((s) => console.log(normalles(s)));
module.exports = { calistir };
