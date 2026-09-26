// SENARYO — MODEL RENGİ POZİSYONLARI YAZARAK SEÇİLİYOR (26 Eylül, v1.466.0).
//
// Kullanıcı (ürün kartı ekran görüntüsü, "Kaç renkli? 3 · 1./2./3. Renk Seçin…"): "Buradaki renkleri
// de arama ile liste daralsın."
//
// Ölçülenler:
//   1. Ürün kartı ▸ Renk Ekle ▸ 3 renkli ▸ yeni Model Rengi: her pozisyon yazdıkça daralıyor.
//   2. Yarım yazım kutudan çıkınca ilk eşleşene oturuyor; listede olmayan yazım temizleniyor ve
//      "Model Rengi Olarak Ekle" kapalı kalıyor.
//   3. Üç pozisyon seçilince model rengi oluşuyor ve ürüne ekleniyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.renkler = [...(tanim.renkler || []), ...["Siyah Süet", "Taba Süet", "Bej Süet", "Siyah Deri", "Gümüş", "Altın"]
    .map((ad, i) => ({ id: `mr${i}`, ad, tip: "Mamul", kod: String(70 + i) }))];
  t["tanimlar:data"] = JSON.stringify(tanim);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  const tikla = (metin) => sayfa.evaluate((m) => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && x.textContent.trim() === m); if (b) b.click(); return !!b; }, metin);
  await tikla("Renk Ekle");
  await sayfa.waitForTimeout(300);
  await tikla("3");
  await sayfa.waitForTimeout(200);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /Bu sayıda yeni Model Rengi/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(300);

  const kutular = sayfa.locator("[data-model-rengi-poz]");
  const oneriler = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-aramali-oneri]")].map((b) => b.getAttribute("data-aramali-oneri")));
  const ekleAcikMi = () => sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /Model Rengi Olarak Ekle/.test(x.textContent)); return b ? !b.disabled : null; });
  const sonuc = { kutuSayisi: await kutular.count() };

  await kutular.nth(0).click();
  await kutular.nth(0).type("süe");
  await sayfa.waitForTimeout(200);
  sonuc.sueYazinca = await oneriler();
  await sayfa.locator('[data-aramali-oneri="Taba Süet"]').dispatchEvent("mousedown");
  await sayfa.waitForTimeout(150);
  // 2. pozisyon: yarım yazım → kutudan çıkınca ilk eşleşen.
  await kutular.nth(1).click();
  await kutular.nth(1).type("taba d");
  await sayfa.waitForTimeout(150);
  sonuc.tabaDYazinca = await oneriler();
  await kutular.nth(1).fill("siyah d");
  await kutular.nth(2).click();
  await sayfa.waitForTimeout(200);
  // 3. pozisyon: listede olmayan yazım temizleniyor, ekle kapalı.
  await kutular.nth(2).type("mor");
  await kutular.nth(0).click();
  await sayfa.waitForTimeout(200);
  sonuc.degerler = [await kutular.nth(0).inputValue(), await kutular.nth(1).inputValue(), await kutular.nth(2).inputValue()];
  sonuc.eksikkenEkleAcik = await ekleAcikMi();
  await kutular.nth(2).click();
  await kutular.nth(2).type("alt");
  await sayfa.waitForTimeout(150);
  await sayfa.locator('[data-aramali-oneri="Altın"]').dispatchEvent("mousedown");
  await sayfa.waitForTimeout(200);
  sonuc.tamamkenEkleAcik = await ekleAcikMi();
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /Model Rengi Olarak Ekle/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(1000);
  const stok = await depoOku(sayfa, "stok:items");
  sonuc.botRenkleri = [...new Set(((stok || []).find((p) => p.ad === "Bot") || {}).variants.map((v) => v.renk))];

  await tarayici.close();
  return { hatalar, ...sonuc };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
