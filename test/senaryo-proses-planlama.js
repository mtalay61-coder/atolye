// SENARYO — PROSES PLANLAMA (v1.704). Planlama › Proses Planlama › Saya: verilmemiş iki üretim Bekleyen'de; ikisini
// seçip planla → Planlanan'a iner, üretime prosesPlani yazılır; birini plandan çıkar → Bekleyen'e döner.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const urun = JSON.parse(t["stok:items"]).find((p) => p.tip === "Mamul") || JSON.parse(t["stok:items"])[0];
  const adim = (proses, ek) => ({ proses, sira: 1, tamamlandiMi: false, personelId: null, atamalar: [], ...ek });
  t["uretim:siparisler"] = JSON.stringify([
    { id: "pp1", siparisNo: "PP-1", model: urun.ad, urunId: urun.id, renk: "Siyah", adet: 12, bedenMiktarlari: [{ beden: "37", miktar: 12 }],
      prosesIlerleme: [adim("Kesim", { tamamlandiMi: true }), adim("Saya")] },
    { id: "pp2", siparisNo: "PP-2", model: urun.ad, urunId: urun.id, renk: "Taba", adet: 6, bedenMiktarlari: [{ beden: "38", miktar: 6 }],
      prosesIlerleme: [adim("Kesim"), adim("Saya")] },
  ]);
  const tan = JSON.parse(t["tanimlar:data"]);
  if (!(tan.prosesler || []).some((p) => p.ad === "Saya")) tan.prosesler = [...(tan.prosesler || []), { id: "pr-saya", ad: "Saya", sira: 2 }];
  if (!(tan.prosesler || []).some((p) => p.ad === "Kesim")) tan.prosesler = [...tan.prosesler, { id: "pr-kesim", ad: "Kesim", sira: 1 }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  await sayfa.getByRole("button", { name: "Planlama", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator('[data-planlama-alt="proses"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-proses-sekme="Saya"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  const liste = (sel) => sayfa.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute(s.slice(1, -1))), sel);
  const bas = await liste("[data-bekleyen-is]");
  await sayfa.evaluate(() => [...document.querySelectorAll("[data-bekleyen-is] input")].forEach((i) => i.click()));
  await sayfa.locator("[data-proses-planla]:visible").first().click();
  await sayfa.waitForTimeout(1200);
  const planlanan = await liste("[data-planlanan-is]");
  const kayit = ((await depoOku(sayfa, "uretim:siparisler")) || []).map((o) => `${o.siparisNo}:${((o.prosesPlani || {}).Saya || {}).sira || "-"}`);
  await sayfa.locator('[data-planlanan-is="PP-1"] [data-plan-cikar]').first().click();
  await sayfa.waitForTimeout(1000);
  const sonBekleyen = await liste("[data-bekleyen-is]");
  const sonPlanlanan = await liste("[data-planlanan-is]");
  await tarayici.close();
  return { hatalar, bas, planlanan, kayit, sonBekleyen, sonPlanlanan };
}
if (require.main === module) calistir().then((s) => console.log(normalles(s)));
module.exports = { calistir };
