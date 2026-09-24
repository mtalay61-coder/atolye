// SENARYO — BEDEN GRUPLARI (kullanıcı, 14 Eylül: "beden grupları oluşturalım; 36-40 seçince
// 36,37,38,39,40 seçilmiş olsun").
//
// Ölçülen: Tanımlar'da baş/son beden seçilerek grup kuruluyor (aradaki bedenler kendiliğinden);
// ürün kartında "Beden Ekle" içindeki grup düğmesi eksik bedenleri tek dokunuşla ekliyor; beden
// adı değişince grup da hizalanıyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  tanimlar.bedenler = ["36", "37", "38", "39", "40", "41"].map((ad, i) => ({ id: `b${ad}`, ad, tip: "Beden", barkodKodu: 30 + i }));
  tanimlar.bedenGruplari = [];
  t["tanimlar:data"] = JSON.stringify(tanimlar);
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [{ renk: "Siyah", beden: "36", miktar: 0 }];
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // 1) Tanımlar > Renk & Beden > Beden Grubu: 36 → 40 aralığı.
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ürün" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-beden-grup-bas]").selectOption("36");
  await sayfa.locator("[data-beden-grup-son]").selectOption("40");
  await sayfa.evaluate(() => document.querySelector("[data-beden-grup-ekle]").click());
  await sayfa.waitForTimeout(800);
  const grup = ((await depoOku(sayfa, "tanimlar:data")).bedenGruplari || []).map((g) => `${g.ad}:${(g.bedenler || []).join(",")}`);

  // 2) Ürün kartında grup düğmesiyle bedenleri ekle.
  await sayfa.getByRole("button", { name: "Stok", exact: true }).first().click();
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Beden Ekle/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const grupDugmesi = await sayfa.evaluate(() => [...document.querySelectorAll("[data-beden-grup-ekle]")].map((e) => e.getAttribute("data-beden-grup-ekle")).filter((x) => x && x !== "1"));
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-beden-grup-ekle]")].find((e) => e.getAttribute("data-beden-grup-ekle") === "36-40"); if (b) b.click(); });
  await sayfa.waitForTimeout(1200);
  const urunBedenleri = [...new Set(((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").variants || []).map((v) => v.beden))].sort();

  // 2b) YENİ ÜRÜN formunda grup kısayolu (14 Eylül): grup düğmesi bedenleri işaretliyor, ürün o
  //     bedenlerle kuruluyor. İkinci dokunuş seçimi kaldırıyor.
  await sayfa.getByRole("button", { name: "Stok", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Ürün Ekle/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const formGrupDugmesi = await sayfa.evaluate(() => [...document.querySelectorAll("[data-yeni-urun-grup]")].map((e) => e.getAttribute("data-yeni-urun-grup")));
  await sayfa.evaluate(() => { const b = document.querySelector('[data-yeni-urun-grup="36-40"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const secililer = await sayfa.evaluate(() => [...document.querySelectorAll("button.mono")].filter((b) => getComputedStyle(b).backgroundColor === "rgb(252, 231, 218)").map((b) => b.textContent.trim()));
  await sayfa.locator('input[placeholder="Örn. Klasik Loafer 402"]').fill("Deneme Bot");
  // Matris Oluştur → Kaydet (iki adım).
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Matris Oluştur/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Kaydet" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(1500);
  const yeniUrunBedenleri = (() => null)();
  const yeniUrun = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.ad === "Deneme Bot");
  const yeniUrunBeden = yeniUrun ? [...new Set((yeniUrun.variants || []).map((v) => v.beden))].sort() : null;
  void yeniUrunBedenleri;

  // 3) Beden adı değişince grup hizalanıyor.
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ürün" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => { [...document.querySelectorAll("button")].filter((x) => /tanımlı öğe/.test(x.textContent) && x.getBoundingClientRect().width > 0).forEach((b) => b.click()); });
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const i = [...document.querySelectorAll("input")].find((x) => x.value === "38" && x.getBoundingClientRect().width > 0); if (i) i.focus(); });
  await sayfa.keyboard.press("Control+A");
  await sayfa.keyboard.type("38N");
  await sayfa.keyboard.press("Enter");
  await sayfa.waitForTimeout(1500);
  const grupSonra = ((await depoOku(sayfa, "tanimlar:data")).bedenGruplari || []).map((g) => (g.bedenler || []).join(","));

  await tarayici.close();
  return { hatalar, grup, grupDugmesi, urunBedenleri, formGrupDugmesi, secililer, yeniUrunBeden, grupSonra };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
