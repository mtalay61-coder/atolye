// SENARYO — SİTEDE GÖRÜNEN KAYIT ADLARININ ÇEVİRİSİ (v1.651.0).
//
// Kullanıcı: "Stok, renk, beden vs. de dil değişimi olması gerekli; bunu stok sağ tık ile yaptırabiliriz." Kapsam: yalnız
// sitede görünen adlar. Ölçülen: mamul kartı sağ tık › "Çeviriler" penceresi; "Boşları öner" bilinen kelimeleri doldurur
// (Siyah → Black / Чёрный), model kodu gibi bilinmeyenleri boş bırakır; Kaydet model adını ürünün `ceviriler`ine, rengi
// `tanimlar.ceviriler.renk`e yazar; boş bırakılan dil yazılmaz.
const { uygulamaAc, modulAc, depoOku, sagTikSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Mamul Stok"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0); let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } } });
  await sayfa.waitForTimeout(900);
  const menudeVar = await sagTikSec(sayfa, '[data-urun-kart-serit="Bot"]', "ceviri");
  await sayfa.waitForTimeout(300);
  const pencere = sayfa.locator("[data-urun-ceviri-penceresi]");
  const satirlar = await pencere.locator("[data-ceviri-satiri]").evaluateAll((l) => l.map((x) => x.dataset.ceviriSatiri));
  await pencere.locator("[data-ceviri-oner]").click();
  const oneri = {
    adEn: await pencere.locator('[data-ceviri="ad-en"]').inputValue(),
    renkEn: await pencere.locator('[data-ceviri="renk-Siyah-en"]').inputValue(),
    renkRu: await pencere.locator('[data-ceviri="renk-Siyah-ru"]').inputValue(),
  };
  await pencere.locator('[data-ceviri="ad-en"]').fill("Boot");
  await pencere.locator('[data-ceviri="ad-ru"]').fill("");
  await pencere.locator("[data-ceviri-kaydet]").click();
  await sayfa.waitForTimeout(500);
  const urun = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "u2") || {};
  const tan = (await depoOku(sayfa, "tanimlar:data")) || {};
  const pencereKapandi = (await sayfa.locator("[data-urun-ceviri-penceresi]").count()) === 0;
  await tarayici.close();
  return { hatalar, menudeVar, satirlar, oneri, kaydedilen: { urun: urun.ceviriler, renk: ((tan.ceviriler || {}).renk || {}).Siyah }, pencereKapandi };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
