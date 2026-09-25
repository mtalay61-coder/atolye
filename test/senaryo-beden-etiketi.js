// SENARYO — BEDEN ETİKETİ BASMA (22 Eylül, v1.413.0)
//
// Kullanıcı: "o düğmeyi ekle ve seçili bedenler için toplu basım da koy". Depoda okutulan asıl
// etiket BEDEN etiketi; Barkodlar sekmesinde kodlar görünüyordu ama basılamıyordu (yalnız ürün ve
// asorti etiketi vardı).
//
// Yazdırma gerçek yazıcıya gitmez: `etiketYazdir` gizli bir iframe'e sayfayı yazıp `print()` çağırır.
// Senaryo `print`i devre dışı bırakıp iframe'in İÇERİĞİNİ ölçüyor: kaç etiket çıktı, üstünde ne var,
// barkodu olmayan varyant basıldı mı.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const etiketleriOku = (sayfa) => sayfa.evaluate(() => {
  const cerceveler = [...document.querySelectorAll("iframe")];
  const son = cerceveler[cerceveler.length - 1];
  if (!son || !son.contentDocument) return null;
  const etiketler = [...son.contentDocument.querySelectorAll(".etiket")];
  return {
    adet: etiketler.length,
    ilk: etiketler[0] ? etiketler[0].textContent.replace(/\s+/g, " ").trim() : null,
    hepsindeBarkodVar: etiketler.every((e) => !!e.querySelector("svg")),
    metinler: [...new Set(etiketler.map((e) => e.textContent.replace(/\s+/g, " ").trim()))],
  };
});

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bedenler = [{ id: "b36", ad: "36" }, { id: "b37", ad: "37" }, { id: "b38", ad: "38" }, ...tan.bedenler];
  t["tanimlar:data"] = JSON.stringify(tan);
  const stok = JSON.parse(t["stok:items"]);
  stok.push({
    id: "m125", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: ["36", "37", "38", "40"].map((b) => ({ renk: "Siyah", beden: b, miktar: 5 })),
    hareketler: [], recete: [], birimFiyat: 465,
  });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  // Yazdırma penceresi açılmasın; iframe içeriği yine oluşur.
  await sayfa.addInitScript(() => {});
  await sayfa.evaluate(() => { window.print = () => {}; });

  // Kodları ata (etiket ancak kodu olan varyanta basılır).
  await modulAc(sayfa, "Paketleme");
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button:has-text("Eksik kodları ata"):visible').click();
  await sayfa.waitForTimeout(1200);

  // Ürün kartı > Barkodlar
  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.getByText("125 Model", { exact: true }).first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.locator('button:has-text("Barkodlar"):visible').first().click();
  await sayfa.waitForTimeout(600);

  // 1) TEK SATIR — satır sonundaki yazıcı düğmesi
  await sayfa.locator('[data-etiket-bas="Siyah|38"]').first().click();
  await sayfa.waitForTimeout(400);
  const tek = await etiketleriOku(sayfa);

  // 2) TOPLU — üç beden seç, kopya 2 → 6 etiket
  for (const b of ["36", "37", "38"]) await sayfa.locator(`[data-etiket-sec="Siyah|${b}"]`).first().check();
  const seritMetni = (await sayfa.locator("[data-etiket-serit]").first().textContent()).replace(/\s+/g, " ").trim();
  await sayfa.locator("[data-etiket-kopya]").first().fill("2");
  await sayfa.waitForTimeout(200);
  const dugmeMetni = (await sayfa.locator("[data-etiket-toplu-bas]").first().textContent()).replace(/\s+/g, " ").trim();
  await sayfa.locator("[data-etiket-toplu-bas]").first().click();
  await sayfa.waitForTimeout(500);
  const toplu = await etiketleriOku(sayfa);

  // 3) TÜMÜNÜ SEÇ — başlıktaki kutu
  await sayfa.locator('[data-etiket-tumu]').first().check();
  await sayfa.waitForTimeout(200);
  const tumSecili = (await sayfa.locator("[data-etiket-serit]").first().textContent()).replace(/\s+/g, " ").trim();

  await tarayici.close();
  return { hatalar, tek, seritMetni, dugmeMetni, toplu, tumSecili };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
