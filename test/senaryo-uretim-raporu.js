// SENARYO — ÜRETİM RAPORU (v1.706). Üretim › Üretim Raporu: tohumdaki teslim edilmiş Kesim işi aylık görünümde
// proses tablosunda ve personel tablosunda görünür; günlük hedef girilince Tanımlar'a yazılır.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const u = JSON.parse(t["uretim:siparisler"]);
  const bugun = new Date().toISOString();
  u.forEach((o) => (o.prosesIlerleme || []).forEach((p) => (p.atamalar || []).forEach((a) => { if (a.tamamlandiMi) a.tamamlanmaTarihi = bugun; })));
  t["uretim:siparisler"] = JSON.stringify(u);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav-grup="Üretim"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Üretim Raporu"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => document.querySelector('[data-rapor-donem="ay"]').click());
  await sayfa.waitForTimeout(400);
  const oku = () => sayfa.evaluate(() => ({
    prosesler: [...document.querySelectorAll("[data-rapor-proses]")].map((e) => `${e.getAttribute("data-rapor-proses")}:${e.querySelector("[data-rapor-gerceklesen]").innerText}`),
    personel: [...document.querySelectorAll("[data-rapor-personel-toplam]")].map((e) => e.innerText),
    ozet: document.querySelector('[data-rapor-ozet="gerceklesen"]').innerText,
  }));
  const ilk = await oku();
  await sayfa.evaluate(() => { const i = document.querySelector('[data-proses-hedef="Kesim"]'); i.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, "250"); i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); });
  await sayfa.waitForTimeout(1200);
  const hedef = ((((await depoOku(sayfa, "tanimlar:data")) || {}).kapasite || {}).prosesHedefleri || {}).Kesim;
  await tarayici.close();
  return { hatalar, ...ilk, hedef };
}
if (require.main === module) calistir().then((s) => console.log(normalles(s)));
module.exports = { calistir };
