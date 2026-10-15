// SENARYO — KUR ÇEVRİMİ (cari ile kasa farklı para biriminde).
//
// Kullanıcı (6 Eylül): "Cari için 42000 TL ödeme verdi ve 1000 USD tutuluyor…" Eskiden Kasa & Banka formunda çift
// yönlü kur çevirici vardı. v1.674.0'da kasa ekranında hareket girişi kalktı (kullanıcı: "ödeme ve tahsilatta
// giriliyor"); aynı iş Ödeme & Tahsilat kısa formunda: cariye işlenecek tutar cari biriminde, kasaya geçen tutar
// kasanın biriminde ("Hesaba geçen"). Boş bırakılırsa güncel kurla önerilen tutar yazılır; elle yazılırsa o geçer.
//
// Ölçülen: (1) kasa 42000 ₺ + Cariye USD → kur önerisi 42; (2) kasa 42000, cari 1000 USD; (3) kasa 41500 + karşı tutar
// 1000 USD elle → cari 1000 USD (kur 41,5). v1.680.0: tutar kasanın biriminde sabit.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({ kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] }], bankalar: [], cekler: [], kurlar: { USD: 42, EUR: 56 } });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Ödeme & Tahsilat"); await sayfa.waitForTimeout(800);
  await sayfa.locator('[data-odeme-tip="Tahsilat"]:visible').click();
  await sayfa.locator('[data-odeme-sekli="Nakit"]:visible').click();
  const kutu = sayfa.locator("[data-odeme-cari]:visible").first();
  await kutu.click(); await kutu.fill("Müşteri B"); await sayfa.waitForTimeout(300); await kutu.press("Enter");
  await sayfa.waitForTimeout(900);
  // v1.680.0: tutar KASANIN biriminde (TL, değiştirilemez); cariye işlenecek birim ve kur ayrı satırda ("Cariye").
  const usdSec = async () => { await sayfa.locator("[data-karsi-pb]:visible").selectOption("USD"); await sayfa.waitForTimeout(300); };
  await sayfa.locator("[data-odeme-satiri-tutar]:visible").fill("42000"); await usdSec();
  const oneri = await sayfa.locator("[data-karsi-kur]:visible").inputValue();   // sistem kuru (1 USD = 42 TRY)
  await sayfa.locator("[data-odeme-satiri-kaydet]:visible").click(); await sayfa.waitForTimeout(1300);
  await sayfa.locator("[data-odeme-satiri-tutar]:visible").fill("41500"); await usdSec();
  await sayfa.locator("[data-karsi-tutar]:visible").fill("1000");               // karşı tutar elle → kur 41,5
  await sayfa.locator("[data-odeme-satiri-kaydet]:visible").click(); await sayfa.waitForTimeout(1300);
  const kasa = ((await depoOku(sayfa, "muhasebe:data")).kasalar[0].hareketler || []).map((h) => `${h.yon}:${h.tutar}`).sort();
  const cari = ((await depoOku(sayfa, "cari:data")).find((c) => c.unvan === "Müşteri B").hareketler || []).filter((h) => /^THS-/.test(h.fisNo || "")).map((h) => `${h.tutar} ${h.paraBirimi}`);
  await tarayici.close();
  return { hatalar, oneri, kasa, cari };
}

if (require.main === module) calistir().then((s) => console.log(normalles(s)));
module.exports = { calistir };
