// SENARYO — STOK DURUMU MATRİSİ (kullanıcı, 15 Eylül: "matris düzeni yapalım, neden hep bozuluyor?").
//
// Ürün kartındaki Stok Durumu tablosu satır listesiydi (renk · beden satırları). Artık MATRİS
// varsayılan: satır renk, sütun beden, hücrede seçili metrik; metrik çipleriyle değişiyor. Liste
// görünümü yedi sütunuyla duruyor. Hücreye dokununca satır detayı açılıyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Mamul Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1000);

  const matris = await sayfa.evaluate(() => ({
    varsayilanMetrik: (document.querySelector("[data-stok-matris]") || {}).getAttribute ? document.querySelector("[data-stok-matris]").getAttribute("data-stok-matris") : null,
    bedenSutunlari: [...document.querySelectorAll("[data-stok-matris] thead th")].map((e) => e.textContent.trim()),
    hucreler: [...document.querySelectorAll("[data-stok-hucre]")].map((e) => `${e.getAttribute("data-stok-hucre")}=${e.textContent.trim()}`),
  }));

  // Metrik değiştir: "Açık".
  await sayfa.evaluate(() => { const b = document.querySelector('[data-stok-metrik="acikToplam"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const acikMetrik = await sayfa.evaluate(() => document.querySelector("[data-stok-matris]").getAttribute("data-stok-matris"));

  // Hücreye dokun → satır detayı açılıyor.
  await sayfa.evaluate(() => { const h = document.querySelector("[data-stok-hucre]"); if (h) h.click(); });
  await sayfa.waitForTimeout(400);
  const detayAcildi = await sayfa.evaluate(() => /talep|Talep|rezervasyon|Rezervasyon|hareket/i.test(document.body.innerText));

  // Liste görünümü hâlâ var mı?
  await sayfa.evaluate(() => { const b = document.querySelector('[data-stok-gorunum="liste"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const liste = await sayfa.evaluate(() => ({
    matrisYok: !document.querySelector("[data-stok-matris]"),
    sutunlar: [...document.querySelectorAll("table thead th")].map((e) => e.textContent.trim()).slice(0, 8),
  }));

  await tarayici.close();
  return { hatalar, matris, acikMetrik, detayAcildi, liste };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
