// SENARYO — SEVKİYAT › SEVK ET PANELİ (v1.688.7).
//
// Kullanıcı: "Sevkiyatta sorun var, daha gelişmiş olması gerekli" ve "Cariye satış fişi açılacak, Ekle'ye tıklayınca koli,
// asorti, beden olarak eklenebilecek; birden fazla satırda." Ölçülen: kalan renk × beden matriste stokla birlikte
// (yetmeyen hücre işaretli); fiş "Satır satır ekle" ile boş ve Siparişten seç listesi açık gelir; "Stoktakilerle
// doldur" fişi stok kadar doldurur (42: kalan 10, stok 7 → 7); kaydedilince siparişin karşılananı artar.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const sip = JSON.parse(TOHUM["siparis:data"]);
  sip.push({ id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-10", kalemler: [
    { id: "k41", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" },
    { id: "k42", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" } ] });
  t["siparis:data"] = JSON.stringify(sip);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sevkiyat");
  await sayfa.waitForTimeout(700);
  await sayfa.locator('[data-sevk-et="SAT-9"]').first().click();
  await sayfa.waitForTimeout(900);
  const matris = await sayfa.evaluate(() => [...document.querySelectorAll("[data-sevk-matris] tbody tr")].map((tr) => [...tr.children].map((td) => td.innerText.replace(/\s+/g, " ").trim()).join(" | ")));
  const bos = await sayfa.evaluate(() => ({
    siparistenSecAcik: [...document.querySelectorAll("[data-siparisten-sec-siparis]")].map((e) => e.getAttribute("data-siparisten-sec-siparis")),
    kalemSatiri: document.querySelectorAll("[data-fis-satir-fiyat]").length,
  }));
  await sayfa.locator('[data-sevk-dolum="stok"]').click();
  await sayfa.waitForTimeout(900);
  const doluSatir = await sayfa.locator("[data-fis-satir-fiyat]").count();
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1800);
  const s9 = (await depoOku(sayfa, "siparis:data")).find((s) => s.id === "s9");
  await tarayici.close();
  return { hatalar, matris, bos, doluSatir: doluSatir > 0, karsilanan: s9.kalemler.map((k) => [k.beden, k.karsilanan]), durum: s9.durum };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 1))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
