// SENARYO — HARİCİ BARKOD (v1.542.0).
//
// Kullanıcı (sipariş formunda kutunun etiketi "999000016232" okutuldu, eklenmedi): "İkisini de yap,
// harici barkod ekle."
//   1. Ürün kartı › Barkodlar: bir renk+bedene harici barkod girilir, ürün kaydına yazılır.
//   2. Aynı kod başka bedene girilemez (sebep söylenir, kutu eski değere döner).
//   3. Sipariş formunda harici kod okutulunca o bedene 1 çift eklenir, sonuç satırı yeşil.
//   4. Depo › Sevkiyat: harici kod "ürün etiketi" diye tanınır; sonuç kutunun altında kalıcı (kırmızı).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bedenler = [{ id: "b38", ad: "38" }, { id: "b39", ad: "39" }, ...tan.bedenler];
  t["tanimlar:data"] = JSON.stringify(tan);
  const stok = JSON.parse(t["stok:items"]);
  stok.push({
    id: "m125", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: ["38", "39"].map((b) => ({ renk: "Siyah", beden: b, miktar: 5 })),
    hareketler: [], recete: [], birimFiyat: 465,
  });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const sonucSatiri = () => sayfa.evaluate(() => {
    const e = [...document.querySelectorAll("[data-barkod-sonuc]")].find((x) => x.offsetParent);
    return e ? { tur: e.getAttribute("data-barkod-sonuc"), metin: e.textContent.trim() } : null;
  });

  // ---- 1-2. ÜRÜN KARTI › BARKODLAR -------------------------------------------------------------------
  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.getByText("125 Model", { exact: true }).first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.locator('button:has-text("Barkodlar"):visible').first().click();
  await sayfa.waitForTimeout(600);
  const kutu38 = sayfa.locator('[data-harici-barkod="Siyah|38"]:visible').first();
  const kutu39 = sayfa.locator('[data-harici-barkod="Siyah|39"]:visible').first();
  const kutuVar = (await kutu38.count()) > 0;
  await kutu38.fill("999000016232");
  await kutu38.press("Enter");
  await sayfa.waitForTimeout(600);
  const urun1 = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "m125") || {};
  await kutu39.fill("999000016232");
  await kutu39.press("Enter");
  await sayfa.waitForTimeout(600);
  const cakismaMetni = await sayfa.evaluate(() => (document.querySelector("[data-toast]") || {}).textContent || "");
  const kutu39Degeri = await kutu39.inputValue();
  if (process.env.EKRAN) {
    await kutu38.scrollIntoViewIfNeeded();
    await sayfa.screenshot({ path: process.env.EKRAN });
  }
  const urun2 = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "m125") || {};

  // ---- 3. SİPARİŞ FORMUNDA OKUT ---------------------------------------------------------------------
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(700);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click();
  await sayfa.waitForTimeout(700);
  await sayfa.locator("[data-barkod-paneli-ac]:visible").first().click();
  await sayfa.waitForTimeout(200);
  const bkutu = sayfa.locator('input[title="Barkod"]:visible').first();
  await bkutu.fill("999000016232");
  await bkutu.press("Enter");
  await sayfa.waitForTimeout(500);
  const siparisSonuc = await sonucSatiri();
  const kalemSatiri = await sayfa.evaluate(() => /125 Model/.test(document.body.innerText));

  // ---- 4. DEPO › SEVKİYAT ----------------------------------------------------------------------------
  await modulAc(sayfa, "Depo");
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button[title="Kolileri okutup depodan sevk et"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-sevk-girdi]:visible").first().fill("999000016232");
  await sayfa.locator("[data-sevk-girdi]:visible").first().press("Enter");
  await sayfa.waitForTimeout(400);
  const sevkUrunEtiketi = await sonucSatiri();
  await sayfa.locator("[data-sevk-girdi]:visible").first().fill("K-YOK-1");
  await sayfa.locator("[data-sevk-girdi]:visible").first().press("Enter");
  await sayfa.waitForTimeout(400);
  const sevkKoliYok = await sonucSatiri();

  await tarayici.close();
  return {
    hatalar,
    kutuVar,
    kaydedilen: urun1.hariciBarkodlar || null,
    cakisma: { reddedildi: /zaten kullanılıyor/.test(cakismaMetni), kutuEskiDegerde: kutu39Degeri === "", kayitDegismedi: JSON.stringify(urun2.hariciBarkodlar) === JSON.stringify(urun1.hariciBarkodlar) },
    siparis: { sonuc: siparisSonuc, kalemSatiri },
    sevkiyat: { urunEtiketi: sevkUrunEtiketi, koliYok: sevkKoliYok },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
