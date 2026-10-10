// SENARYO — SİPARİŞ FORMUNDA SATIRDA ARAMALI ÜRÜN VE RENK (10 Ekim, v1.631.0).
// Kullanıcı: "Renk değiştirirken hep kullandığımız şekilde olsun", "Stok içinde yazma filtreleme olsun" (satırdaki açılır
// listeler tarayıcının ekranı kaplayan menüsünü açıyordu). Ölçülen: düzenlemede satırdaki ürün ve renk kutuları <select>
// değil yazılabilir kutu; renk kutusuna "ta" yazınca yalnız "Taba" önerisi; seçilince satır rengi değişir; yarım yazıp
// çıkınca kayıtlı renge döner; ürün kutusuna "bo" yazınca öneride yalnız Bot (satışta yalnız mamuller).
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  // Bot'a Taba rengi (tohumda yalnız Siyah var).
  t["stok:items"] = JSON.stringify(JSON.parse(TOHUM["stok:items"]).map((u) => (u.id === "u2"
    ? { ...u, variants: [...u.variants, ...u.variants.filter((v) => v.renk === "Siyah").map((v) => ({ ...v, id: `${v.id}-t`, renk: "Taba", miktar: 0 }))] } : u)));
  const k = (id, beden) => ({ id, urunId: "u2", urunAd: "Bot", renk: "Siyah", beden, miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 10, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([{ id: "a1", siparisNo: "SAT-A1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-10", kalemler: [k("a", "40"), k("b", "41")] }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-A1"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  const satir = sayfa.locator('tr[data-form-kalem-satiri="serbest"]').first();
  const renk = satir.locator("[data-form-kalem-renk]");
  const urun = satir.locator("[data-form-kalem-urun]");
  const tur = { renk: await renk.evaluate((e) => e.tagName), urun: await urun.evaluate((e) => e.tagName) };
  const oneriler = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-aramali-oneri]")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.getAttribute("data-aramali-oneri")));
  await renk.click(); await renk.fill("ta"); await sayfa.waitForTimeout(200);
  const renkOneri = await oneriler();
  await sayfa.locator('[data-aramali-oneri="Taba"]').first().dispatchEvent("mousedown"); await sayfa.waitForTimeout(300);
  const secilen = await renk.inputValue();
  await renk.click(); await renk.fill("Ka"); await sayfa.waitForTimeout(100);
  await sayfa.locator("[data-siparis-form-eylemler]").first().click({ position: { x: 5, y: 5 } }); await sayfa.waitForTimeout(400);
  const yarimdaDondu = await renk.inputValue();
  await urun.click(); await urun.fill("bo"); await sayfa.waitForTimeout(200);
  const urunOneri = await sayfa.evaluate(() => [...document.querySelectorAll("[data-urun-oneri]")]
    .filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.getAttribute("data-urun-oneri")));
  await tarayici.close();
  return { hatalar, tur, renkOneri, secilen, yarimdaDondu, urunOneri };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
