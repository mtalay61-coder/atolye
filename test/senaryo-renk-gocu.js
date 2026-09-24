// SENARYO — RENK GÖÇÜ: ÜÇ KATMANDAN İKİYE (kullanıcı, 13 Eylül, 9g).
// Eski veri: Mamul "Siyah" (r-m) + Hammadde "Siyah" (r-h) + yalnız mamul "Kahve" (r-k), kombinasyon
// r-m/r-k. Ölçülen: açılışta tek "Siyah" kalır, kombinasyon r-h/r-k'ya çevrilir, her renk tek tip;
// ürün kartında mamul için renk listesi tek havuz; Tanımlar'da "Mamul Renkleri" bölümü yok.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  tanimlar.renkler = [
    { id: "r-m", ad: "Siyah", tip: "Mamul", kod: "101", renkKodu: "#000" },
    { id: "r-h", ad: "Siyah", tip: "Hammadde", kod: "102", renkKodu: "#000", malzemeTipleri: ["Deri"] },
    { id: "r-k", ad: "Kahve", tip: "Mamul", kod: "103", renkKodu: "#642" },
  ];
  tanimlar.renkKombinasyonlari = [{ id: "k1", kod: "1001", renkIdler: ["r-m", "r-k"] }];
  t["tanimlar:data"] = JSON.stringify(tanimlar);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  const goc = await depoOku(sayfa, "tanimlar:data");
  const renkler = (goc.renkler || []).map((r) => `${r.ad}:${r.tip}:${r.id}`);
  const kombi = ((goc.renkKombinasyonlari || [])[0] || {}).renkIdler;

  // Ürün kartı (mamul Bot) → Renkler: eklenebilir renk listesi tek havuz (Siyah zaten ekli, Kahve eklenebilir).
  await sayfa.getByRole("button", { name: "Stok", exact: true }).click();
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  // "Renk Ekle" açılınca seçeneklerde eski mamul rengi "Kahve" tek havuzdan geliyor.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && x.textContent.trim() === "Renk Ekle"); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const kartRenkSecenekleri = await sayfa.evaluate(() => [...document.querySelectorAll("select option, button")]
    .filter((o) => o.offsetParent !== null || o.tagName === "OPTION")
    .map((o) => o.textContent.trim()).filter((x) => /^(\+ )?(Kahve|Siyah)$/.test(x)));

  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ürün" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const tanimlarEkrani = await sayfa.evaluate(() => ({ mamulBolumuYok: !/Mamul Renkleri/.test(document.body.innerText), renklerBolumu: /Renkler/.test(document.body.innerText) }));

  await tarayici.close();
  return { hatalar, renkler, kombi, kartRenkSecenekleri, tanimlarEkrani };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
