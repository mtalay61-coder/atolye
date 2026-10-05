// SENARYO — STOK / MAMUL STOK ARAMASI AYRI + × TEMİZLE (5 Ekim, v1.596.0).
// Kullanıcı: "mamul arama ile stok arama aynıları kalıyor, silme için × olsun hızlıca temizlemek için, hammadde ile ayrılsın
// arama geçmişi". Ölçülen: Mamul Stok'ta "272" yazılınca Stok'ta kutu boş; Stok'ta "deri" yazılıp Mamul Stok'a dönünce "272"
// duruyor; × ile temizlenince boş ve liste tam.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  const git = async (nav) => { await sayfa.evaluate((n) => { const b = document.querySelector(`[data-nav="${n}"]`); if (b) b.click(); }, nav); await sayfa.waitForTimeout(600); };
  const kutu = () => sayfa.locator('input[placeholder^="Ara: ürün"]:visible').first();
  const durum = async () => ({ metin: await kutu().inputValue(), temizleVar: await sayfa.locator("[data-stok-arama-temizle]:visible").count() });
  await git("Mamul Stok");
  await kutu().fill("272"); await sayfa.waitForTimeout(300);
  const mamul1 = await durum();
  await git("Stok");
  const stokBos = await durum();
  await kutu().fill("deri"); await sayfa.waitForTimeout(300);
  const stok1 = await durum();
  await git("Mamul Stok");
  const mamul2 = await durum();
  await sayfa.locator("[data-stok-arama-temizle]:visible").first().click();
  await sayfa.waitForTimeout(300);
  const mamulTemiz = await durum();
  await git("Stok");
  const stok2 = await durum();
  await tarayici.close();
  return { hatalar, mamul1, stokBos, stok1, mamul2, mamulTemiz, stok2 };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
