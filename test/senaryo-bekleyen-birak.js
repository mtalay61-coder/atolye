// SENARYO — TAKILI BEKLEYEN YAZMAYI BIRAK (v1.725.1).
// Kullanıcı (28 Ekim, telefon): "Stok kartları (5×) — Failed to fetch", "Yeniden dene ile düzelmedi. Kullanmaya başlamak için
// ne yapmalıyım?". Yönetici şeritteki çipe dokunur → ayrıntıda "Bu cihazdakini bırak, buluttan yükle" → onay metni ne
// bırakılacağını sayıyla söyler → defter temizlenir, günlüğe düşer, sayfa yeniden açılır ve şerit kalkar.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  t["bekleyen:yazma"] = JSON.stringify({ "stok:items": { tablo: "urunler", zaman: "2026-10-28T10:29:00.000Z", deneme: 5, hata: "Failed to fetch — POST varyantlar · gövde 512 KB · adres 52 karakter" } });
  t["bekleyen:kayitlar"] = JSON.stringify({ urunler: { ana: { u2: "yaz" }, cocuk: { varyantlar: { "u2|Siyah|40": { t: "sil", p: "u2" }, "u2|1001 - Siyah|40": { t: "yaz", p: "u2" } } } } });
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const seritOnce = await sayfa.locator("[data-bekleyen-yazma]").count();
  await sayfa.locator('[data-bekleyen-cip="urunler"]').first().click();
  await sayfa.waitForTimeout(300);
  const ayrinti = (await sayfa.locator("[data-bekleyen-ayrinti]").first().innerText()).split("\n").map((x) => x.trim()).filter(Boolean);
  let onay = "";
  sayfa.on("dialog", (d) => { onay = d.message(); d.accept(); });
  await sayfa.locator('[data-bekleyen-birak="urunler"]').first().click();
  await sayfa.waitForTimeout(400);
  // Test ortamında bulut yok: uygulamanın kendi açılış yazmaları da deftere düşer — yalnız stok kaydına bakılır.
  const defterHemen = await sayfa.evaluate(() => ({ stokYazma: "stok:items" in JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}"),
    stokKayit: "urunler" in JSON.parse(localStorage.getItem("bekleyen:kayitlar") || "{}") }));
  await sayfa.waitForTimeout(3500);   // sayfa yeniden açılır
  const stokCipiSonra = await sayfa.locator('[data-bekleyen-cip="urunler"]').count();
  await tarayici.close();
  return { seritOnce, birakDugmesi: ayrinti.filter((x) => /bırak/.test(x)), onay: onay.split("\n")[0], defterHemen, stokCipiSonra, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
