// SENARYO — SİPARİŞ PLANLAMA ÇERÇEVE + TOPLU (v1.707). Bekleyen çerçevesi kayar, altında Planlanmış çerçevesi;
// bir satırı tikleyip "Seçilenleri üret" → üretim açılır, satır Bekleyen'den düşer.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const kalem = (id, renk, beden, miktar) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([{ id: "st1", siparisNo: "SAT-T1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-29", teslimTarihi: "", not: "",
    kalemler: [kalem("s40", "Siyah", "40", 2), kalem("k40", "Kahve", "40", 3)] }, ...JSON.parse(TOHUM["siparis:data"])]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  await sayfa.getByRole("button", { name: "Planlama", exact: true }).first().click();
  await sayfa.waitForTimeout(800);
  const satirlar = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-planlama-satir]")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute("data-planlama-satir")));
  const cerceveler = await sayfa.evaluate(() => ({
    bekleyenKayar: getComputedStyle(document.querySelector("[data-bekleyen-cerceve]")).overflowY,
    planlanmis: !!document.querySelector("[data-planlanmis-cerceve]"),
  }));
  const bas = await satirlar();
  const uretimOnce = ((await depoOku(sayfa, "uretim:siparisler")) || []).length;
  await sayfa.evaluate(() => { const i = [...document.querySelectorAll("[data-planlama-satir]")].find((e) => e.getBoundingClientRect().width > 0); i.click(); });
  await sayfa.waitForTimeout(200);
  await sayfa.evaluate(() => [...document.querySelectorAll("[data-toplu-uret]")].find((e) => e.getBoundingClientRect().width > 0).click());
  await sayfa.waitForTimeout(1500);
  const uretimSonra = ((await depoOku(sayfa, "uretim:siparisler")) || []).length;
  const son = await satirlar();
  await tarayici.close();
  return { hatalar, cerceveler, basSayi: bas.length, sonSayi: son.length, dustu: !son.includes(bas[0]), yeniUretim: uretimSonra - uretimOnce };
}
if (require.main === module) calistir().then((s) => console.log(normalles(s)));
module.exports = { calistir };
