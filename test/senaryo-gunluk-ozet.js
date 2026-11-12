// SENARYO — GÜNLÜKTE OKUNUR DEĞİŞİKLİK ÖZETİ (v1.744.17). Kullanıcı (12 Kasım): "urunler: 1 güncellendi" yerine ne değiştiği.
// Sahte sunucu urunler / varyant / hareket yazmalarını kabul eder; ürün kartına renk + beden eklenip kaydedilir (tabloYaz yolu),
// sunucuya giden günlük kaydı okunur.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
async function calistir() {
  const gunluk = [];
  const onceRota = async (s) => {
    await s.route("**/rest/v1/gunluk*", (r) => { try { JSON.parse(r.request().postData() || "[]").forEach((g) => gunluk.push(g)); } catch (e) { /* */ } return r.fulfill({ status: 201, body: "" }); });
    for (const t of ["urunler", "varyantlar", "stok_hareketleri"]) {
      await s.route(`**/rest/v1/${t}*`, (r) => (r.request().method() === "GET" ? r.abort()
        : r.fulfill({ status: 200, contentType: "application/json", body: r.request().method() === "PATCH" ? '[{"id":"x"}]' : "[]" })));
    }
  };
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, onceRota });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  // Taban: önce ekrandaki hâl bir kez yazılır (fark belleği bu hâle oturur), sonra yalnız Bot değiştirilir.
  await sayfa.evaluate(async () => { await window.__erp.tabloYaz("stok:items", "urunler", JSON.parse(window.__depo["stok:items"])); });
  await sayfa.waitForTimeout(500);
  gunluk.length = 0;
  await sayfa.evaluate(async () => {
    const E = window.__erp;
    const stok = JSON.parse(window.__depo["stok:items"]);
    const bot = stok.find((u) => u.id === "u2");
    bot.variants = [...bot.variants, { renk: "Lacivert", beden: "40", miktar: 0 }, { renk: "Lacivert", beden: "44", miktar: 0 }];
    bot.satisFiyati = 950;
    await E.tabloYaz("stok:items", "urunler", stok);
  });
  await sayfa.waitForTimeout(800);
  const kayit = gunluk.find((g) => g.kapsam === "veri") || {};
  await tarayici.close();
  return { eylem: kayit.eylem || null, degisiklikler: (kayit.ayrinti || {}).degisiklikler || null, hatalar };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
module.exports = { calistir };
