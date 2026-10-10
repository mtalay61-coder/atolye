// SENARYO — SİPARİŞ KARTINDA HAMMADDE DURUM RENKLERİ (10 Ekim, v1.632.0).
// Kullanıcı: "Sipariş hammadde ihtiyacında stoğu bulunan ürünler, siparişi olan ürünler, olmayan ürünler v.s. renkleri
// değişsin; bu bizim standartlarımız da olsun ve planlamanın mantığının aynısı olsun."
// Kurulum: SAT-R1 = Bot Siyah 41×3 + 42×3. Deri Siyah 12 gerekli / stok 7 → 5 eksik, 2'si alışla yolda → KISMEN;
// Deri Taba 3 / stok 4 → YETERLİ; Taban 41: 3 / stok 10 → YETERLİ; Taban 42: 3 / stok 0, 3'ü yolda → YOLDA.
// Ölçülen: Hammadde İhtiyacı sekmesinde her hücrenin durumu ve rengi, lejant (dört durum + sayılar), tek ölçülü satırlar
// (Deri) da renkli.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push({ id: "u3", ad: "Taban", kategori: "Hammadde", birim: "adet", olcuTipi: "Beden",
    variants: [{ renk: "Siyah", beden: "41", miktar: 10 }, { renk: "Siyah", beden: "42", miktar: 0 }], recete: [] });
  t["stok:items"] = JSON.stringify(stok);
  const kalem = (id, beden) => ({ id, urunId: "u2", urunAd: "Bot", renk: "Siyah", beden, miktar: 3, karsilanan: 0, birim: "çift", birimFiyat: 10, paraBirimi: "TRY" });
  const alis = (id, urunId, urunAd, beden, miktar) => ({ id, siparisNo: id, tip: "Alış", cariId: "c1", durum: "Bekliyor", tarih: "2026-10-10", hammaddeTalebiMi: true,
    kalemler: [{ id: `${id}k`, urunId, urunAd, renk: "Siyah", beden, miktar, karsilanan: 0, birim: "adet", birimFiyat: 1, paraBirimi: "TRY", rezervasyonlar: [{ siparisId: "r1", miktar }] }] });
  t["siparis:data"] = JSON.stringify([
    { id: "r1", siparisNo: "SAT-R1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-10", kalemler: [kalem("a", "41"), kalem("b", "42")] },
    alis("ALS-D", "u1", "Deri", "", 2), alis("ALS-T", "u3", "Taban", "42", 3),
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-R1"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.locator('[data-kart-bolum="ihtiyac"]:visible').first().click(); await sayfa.waitForTimeout(500);
  const sonuc = await sayfa.evaluate(() => {
    const hucreler = [...document.querySelectorAll("[data-hammadde-durum]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => {
      const tr = x.closest("tr");
      const ad = tr ? tr.children[0].textContent.trim() + " " + tr.children[1].textContent.trim().split(" ")[0] : "?";
      return `${ad} → ${x.getAttribute("data-hammadde-durum")} (${getComputedStyle(x).color})`;
    }).sort();
    const lejant = [...document.querySelectorAll("[data-hammadde-lejant-durum]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim());
    return { hucreler, lejant };
  });
  if (process.env.EKRAN) { await sayfa.locator("[data-hammadde-lejant]").first().scrollIntoViewIfNeeded(); await sayfa.screenshot({ path: process.env.EKRAN }); }
  await tarayici.close();
  return { hatalar, ...sonuc };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
