// SENARYO — YENİ ÜRÜN FORMUNDA VE ÜRÜN KARTINDA "STANDART" YAZILMIYOR (26 Eylül, v1.472.0).
//
// Kullanıcı (Stok ▸ yeni hammadde "Silme Suyu", renk ve beden seçmeden Matris Oluştur; tabloda
// "RENK \ BEDEN — STANDART" ve "Standart" satırı): "Standart beden renk olayını halletmiştik
// sanıyorum, hâlâ önüme çıkıyor."
//
// Ölçülenler:
//   1. Renk/beden seçmeden oluşturulan matriste "Standart" yazmıyor (başlık "Miktar").
//   2. Kayıt değişmedi: varyant yine Standart/Standart (yer tutucu yalnız gösterimde gizli).
//   3. Ürün kartında matris başlığı ve satırı "Standart" yazmıyor; özet "tek stok kalemi".
//   4. (v1.474.0) Renk ve beden yokken köşede "Renk \ Beden" de yazmıyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
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
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(i, "Silme Suyu"); i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && /Matris Oluştur/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const tabloMetni = () => sayfa.evaluate(() => {
    // v1.474.0: köşe başlığı artık eksene göre değişiyor; tablo kendi işaretiyle bulunuyor.
    const t = [...document.querySelectorAll("[data-stok-matrisi]")].find((x) => x.getBoundingClientRect().width > 0);
    return t ? t.innerText.replace(/\s+/g, " ").trim() : null;
  });
  const formMatrisi = await tabloMetni();

  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button.btn-save")].find((x) => x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(1200);
  const urun = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.ad === "Silme Suyu");
  const kayit = urun ? urun.variants.map((v) => `${v.renk}/${v.beden}`) : "kaydedilmedi";

  // Ürün kartı: "Renkler ve Bedenler" açılır.
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Silme Suyu" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  const ozet = await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && /Renkler ve Bedenler/.test(x.textContent));
    return b ? b.textContent.replace("Renkler ve Bedenler", "").trim() : null;
  });
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && /Renkler ve Bedenler/.test(x.textContent));
    if (b && !document.querySelector("table")) b.click();
  });
  await sayfa.waitForTimeout(300);
  let kartMatrisi = await tabloMetni();
  if (!kartMatrisi) {
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && /Renkler ve Bedenler/.test(x.textContent)); if (b) b.click(); });
    await sayfa.waitForTimeout(300);
    kartMatrisi = await tabloMetni();
  }

  await tarayici.close();
  return {
    hatalar,
    formMatrisi, formdaStandartYok: !!formMatrisi && !/Standart/i.test(formMatrisi),
    kayit,
    ozet,
    kartMatrisi, karttaStandartYok: !!kartMatrisi && !/Standart/i.test(kartMatrisi),
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
