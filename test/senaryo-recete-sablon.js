// SENARYO — REÇETE ŞABLONLARI + MODELHANE KATALOG (kullanıcı, 21 Eylül: "reçete şablonu olsun,
// standart malzemeler (yapıştırıcı, silme suyu, fort bombe); şablondan reçeteye ekle / şablondan
// reçete oluştur. Modelhaneyi stoktaki gibi katalog listeleyelim; resme tıklayınca büyüsün").
//
// Ölçülen: (1) Tanımlar'da şablon: yapıştırıcı; (2) boş reçeteli ürüne "Şablondan reçete oluştur"
// → her mamul rengine bir satır; (3) ikinci uygulama çift eklemiyor; (4) modelhane Katalog
// görünümü açılıyor, kapak resmine dokununca büyüyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const KUCUK_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.receteSablonlari = [{ id: "rs1", ad: "Standart bot", satirlar: [
    { id: "s1", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "Standart", miktar: 0.5, birim: "desi", proses: "Kesim" }] }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(TOHUM["stok:items"]);
  st.find((p) => p.id === "u2").recete = [];
  t["stok:items"] = JSON.stringify(st);
  t["model:data"] = JSON.stringify([{ id: "m1", kod: "M-1", ad: "Deneme bot", asama: "cizim", kapakResmi: KUCUK_PNG, tasarimGorselleri: [] }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  // Ürün › Reçete › şablon uygula (iki kez)
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1100);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Reçete/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  const dugmeYazisi = await sayfa.evaluate(() => (document.querySelector("[data-recete-sablon-uygula]") || {}).textContent || null);
  await sayfa.evaluate(() => { const s = document.querySelector("[data-recete-sablon-sec]"); s.value = "rs1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-recete-sablon-uygula]").click();
  await sayfa.waitForTimeout(800);
  const birinci = ((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").recete || []).length;
  await sayfa.locator("[data-recete-sablon-uygula]").click();
  await sayfa.waitForTimeout(800);
  const ikinci = ((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").recete || []).length;
  const renkSayisi = new Set(JSON.parse(TOHUM["stok:items"]).find((p) => p.id === "u2").variants.map((v) => v.renk)).size;

  // Modelhane › Katalog › resmi büyüt
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Modelhane"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-model-gorunum="katalog"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const katalog = await sayfa.evaluate(() => document.querySelectorAll("[data-model-katalog-kart]").length);
  await sayfa.evaluate(() => { const k = document.querySelector('[data-model-katalog-kart="M-1"] img'); if (k) k.parentElement.click(); });
  await sayfa.waitForTimeout(400);
  const buyudu = await sayfa.evaluate(() => !!document.querySelector("[data-resim-buyuk]"));

  await tarayici.close();
  return { hatalar, dugmeYazisi, renkSayisi, satirSayisi: { birinci, ikinciUygulamaSonrasi: ikinci }, katalog, buyudu };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
