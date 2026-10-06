// SENARYO — STOK AÇILINCA BARKOD KENDİLİĞİNDEN (6 Ekim, v1.603.0).
// Kullanıcı: "Barkod için stok açınca barkodları otomatik kursun, tekrar paketlemeden barkod oluşturmaya gerek yok."
// Ölçülen: Stok › Ürün Ekle ile yeni hammadde (Standart/Standart) kaydedilince hiçbir düğmeye basmadan stok no atanır,
// kod sayacı ilerler, kartın Barkodlar sekmesinde "barkod kurulamıyor" yok ve ürün barkodu 90 + stok no görünür.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
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
    set.call(i, "Yeni Deri"); i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Matris Oluştur/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Kaydet$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0 && !x.disabled); if (b) b.click(); });
  await sayfa.waitForTimeout(2000);
  const stok = await depoOku(sayfa, "stok:items");
  const u = stok.find((x) => x.ad === "Yeni Deri");
  const tan = await depoOku(sayfa, "tanimlar:data");
  const kayit = { var: !!u, stokNo: u ? u.stokNo || "" : "", sayac: (tan.kodSayaclari || {}).stok || 0 };

  // Kartı aç → Barkodlar
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Yeni Deri" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1000);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Barkodlar/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const kart = await sayfa.evaluate(() => {
    const metin = document.body.innerText;
    return { kurulamayan: (metin.match(/barkod kurulamıyor/g) || []).length, urunBarkodu: (metin.match(/Ürün barkodu \(renksiz\):\s*(\d+)/) || [])[1] || "",
      olusturDugmesi: !!document.querySelector("[data-barkod-tamamla]") };
  });
  await tarayici.close();
  return { kayit, kart, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
