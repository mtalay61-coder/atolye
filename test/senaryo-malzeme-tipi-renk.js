// SENARYO — MALZEME TİPİNE GÖRE RENK (26 Eylül, v1.471.0).
//
// Kullanıcı (Stok ▸ yeni hammadde, Malzeme Tipi "Astar"): "Stok açarken malzeme tipini seçip renk
// eklendiğinde renkler o malzeme tipine ait olsun. Ortak renk varsa onu da işaretlesin. Mantık o
// şekilde idi, kontrol et yine."
//
// Ölçülenler:
//   1. Astar seçiliyken renk listesi: önce Astar'ın renkleri, sonra genel (tipsiz) renkler,
//      sonra başka tipin renkleri — hangisinin hangi tipten geldiği etikette.
//   2. "Yeni Renk" ile açılan renk Astar'a bağlı doğuyor.
//   3. Kaydedince seçilen bütün renkler Astar'a ait: genel renk ve başka tipin rengi Astar'ı
//      KAZANIYOR (ortak renk olarak diğer tipini koruyor), zaten Astar olan değişmiyor.
//   4. Ürün kartında (var olan ürüne renk ekleme) aynı kural: Deri'nin rengi yazınca bulunuyor,
//      eklenince Astar'a da bağlanıyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.hammaddeTipleri = [{ id: "ht1", ad: "Astar" }, { id: "ht2", ad: "Deri" }];
  tanim.renkler = [
    { id: "r1", ad: "Krem", tip: "Hammadde", kod: "51", malzemeTipleri: ["Astar"] },
    { id: "r2", ad: "Beyaz", tip: "Hammadde", kod: "52", malzemeTipleri: [] },
    { id: "r3", ad: "Nubuk Siyah", tip: "Hammadde", kod: "53", malzemeTipleri: ["Deri"] },
    { id: "r4", ad: "Kahve", tip: "Hammadde", kod: "54", malzemeTipleri: ["Astar", "Deri"] },
    { id: "r5", ad: "Taba Deri", tip: "Hammadde", kod: "55", malzemeTipleri: ["Deri"] },
  ];
  t["tanimlar:data"] = JSON.stringify(tanim);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Ürün Ekle/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const l = [...document.querySelectorAll("label")].find((x) => /^Ürün Adı/.test(x.textContent.trim()));
    const i = l && l.querySelector("input");
    if (!i) return;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(i, "Astar Taytüyü"); i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  // Malzeme tipi: Astar.
  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")].find((x) => x.getBoundingClientRect().width > 0 && [...x.options].some((o) => o.value === "Astar"));
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    set.call(s, "Astar"); s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(300);

  const kutu = sayfa.locator("[data-hammadde-renk-arama]").first();
  await kutu.click();
  await sayfa.waitForTimeout(200);
  const secenekler = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-aramali-secenek]")]
    .filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.textContent.replace(/\s+/g, " ").trim()));
  const liste = { bosken: await secenekler() };
  await kutu.fill("nub");
  await sayfa.waitForTimeout(150);
  liste.nubYazinca = await secenekler();
  await kutu.fill("");

  // Genel renk (Beyaz) ve başka tipin rengi (Nubuk Siyah) ve zaten Astar olan (Krem) seçiliyor.
  for (const ad of ["Beyaz", "Nubuk Siyah", "Krem"]) {
    await kutu.click();
    await kutu.fill(ad.slice(0, 3));
    await sayfa.waitForTimeout(150);
    await sayfa.locator(`[data-aramali-secenek="${ad}"]`).first().dispatchEvent("mousedown");
    await sayfa.waitForTimeout(200);
  }
  // Yeni Renk.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && x.textContent.trim() === "Yeni Renk"); if (b) b.click(); });
  await sayfa.waitForTimeout(200);
  await sayfa.locator('input[placeholder="Örn. Ham Bej"]').fill("Ham Bej");
  await sayfa.locator('input[placeholder="Örn. Ham Bej"]').press("Enter");
  await sayfa.waitForTimeout(500);
  const secilenler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-secili-renkler] > span")].map((s) => s.textContent.replace(/\s+/g, " ").trim()));

  // Beden yok → tek stok kalemi; matris oluştur ve kaydet.
  await sayfa.evaluate(() => {
    const c = [...document.querySelectorAll('input[type="checkbox"]')].find((x) => /beden\/ölçü yok/.test((x.parentElement || {}).textContent || ""));
    if (c && !c.checked) c.click();
  });
  await sayfa.waitForTimeout(200);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && /Matris Oluştur/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button.btn-save")].find((x) => x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(1200);

  // 4. Ürün kartı: "Taba Deri" (yalnız Deri) yazınca öneride, eklenince Astar'ı da kazanıyor.
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Astar Taytüyü" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && x.textContent.trim() === "Renk Ekle"); if (b) b.click(); });
  await sayfa.waitForTimeout(300);
  const kartKutu = sayfa.locator("[data-kart-renk-arama]").first();
  const kart = { kutuVar: (await kartKutu.count()) > 0 };
  if (kart.kutuVar) {
    await kartKutu.click();
    kart.bosken = await sayfa.evaluate(() => [...document.querySelectorAll("[data-aramali-oneri]")].map((b) => b.getAttribute("data-aramali-oneri")));
    await kartKutu.fill("taba");
    await sayfa.waitForTimeout(200);
    kart.tabaYazinca = await sayfa.evaluate(() => [...document.querySelectorAll("[data-aramali-oneri]")].map((b) => b.getAttribute("data-aramali-oneri")));
    await sayfa.locator('[data-aramali-oneri="Taba Deri"]').first().dispatchEvent("mousedown");
    await sayfa.waitForTimeout(200);
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button.btn-primary")].find((x) => x.offsetParent && x.textContent.trim() === "Ekle" && !x.disabled); if (b) b.click(); });
    await sayfa.waitForTimeout(900);
  }

  const tanimSon = (await depoOku(sayfa, "tanimlar:data")) || {};
  const tipler = Object.fromEntries((tanimSon.renkler || []).map((r) => [r.ad, (r.malzemeTipleri || (r.malzemeTipi ? [r.malzemeTipi] : [])).join("+") || "Genel"]));
  const urun = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.ad === "Astar Taytüyü");
  const urunRenkleri = urun ? [...new Set(urun.variants.map((v) => v.renk))].sort() : "ürün kaydedilmedi";

  await tarayici.close();
  return { hatalar, liste, secilenler, tipler, urunRenkleri, kart };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
