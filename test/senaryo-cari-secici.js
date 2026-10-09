// SENARYO — SİPARİŞTE ARAMALI CARİ SEÇİMİ (9 Ekim, v1.620.0).
// Kullanıcı: "Müşteri seçerken filtreli olsun, cari arttıkça içinden çıkılmıyor." Ölçülen: yeni satış siparişinde kutu
// boş açılır; odakta bütün müşteriler (tedarikçi yok); "tir" yazınca yalnız "İgii Tirana"; cari koduyla ("0007") bulunur;
// Enter ile seçilir, kutuda ünvan, data-cari-id doğru; × temizler; büyük/küçük harf ("İGİİ") duyarsız.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const c = JSON.parse(t["cari:data"]);
  c.push({ id: "c7", unvan: "İgii Tirana", tip: "Müşteri", kod: 7, ulke: "Arnavutluk", hareketler: [] },
    { id: "c8", unvan: "Stone Blue", tip: "Müşteri", kod: 8, hareketler: [] },
    { id: "c9", unvan: "New Diamond", tip: "Her İkisi", kod: 9, hareketler: [] });
  t["cari:data"] = JSON.stringify(c);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click(); await sayfa.waitForTimeout(600);
  const kutu = sayfa.locator("input[data-siparis-cari]:visible").first();
  const liste = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-cari-secenek]")].map((b) => b.getAttribute("data-cari-secenek")));
  const bas = await kutu.evaluate((i) => ({ deger: i.value, id: i.getAttribute("data-cari-id") }));
  await kutu.click(); await sayfa.waitForTimeout(150);
  const tumu = (await liste()).sort();
  await kutu.fill("tir"); await sayfa.waitForTimeout(150);
  const tir = await liste();
  await kutu.fill("0007"); await sayfa.waitForTimeout(150);
  const kod = await liste();
  await kutu.fill("İGİİ"); await sayfa.waitForTimeout(150);
  const buyuk = await liste();
  if (process.env.EKRAN) { await kutu.fill("i"); await sayfa.waitForTimeout(150); await sayfa.screenshot({ path: process.env.EKRAN, clip: { x: 0, y: 0, width: 1400, height: 520 } }); await kutu.fill("İGİİ"); await sayfa.waitForTimeout(100); }
  await kutu.press("Enter"); await sayfa.waitForTimeout(200);
  await sayfa.mouse.click(1300, 900); await sayfa.waitForTimeout(250);
  const secim = await kutu.evaluate((i) => ({ deger: i.value, id: i.getAttribute("data-cari-id") }));
  await sayfa.locator("[data-cari-secici-temizle]").first().dispatchEvent("mousedown"); await sayfa.waitForTimeout(200);
  const temiz = await kutu.evaluate((i) => ({ deger: i.value, id: i.getAttribute("data-cari-id") }));
  await tarayici.close();
  return { hatalar, bas, tumu, tir, kod, buyuk, secim, temiz };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
