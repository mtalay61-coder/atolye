// SENARYO — DEPO › ALIŞ / SATIŞ (v1.688.8).
//
// Kullanıcı: "Alış / Satış ekranını da böyle yap" (Sevk et paneli gibi). Ölçülen: cari seçilip "Satış fişi aç" denince
// fiş aynı ekranda panelde açılır, carinin açık siparişi "Siparişten seç" listesinde hazırdır; Ekle ile siparişin
// satırları fişe gelir, kaydedilince siparişin karşılananı artar ve fiş "Son satış fişleri" listesine düşer; liste
// süzgeci (cari) çalışır.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const sip = JSON.parse(TOHUM["siparis:data"]);
  sip.push({ id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-10", kalemler: [
    { id: "k41", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" } ] });
  t["siparis:data"] = JSON.stringify(sip);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Alış / Satış");
  await sayfa.waitForTimeout(600);
  const kutu = sayfa.locator("[alis-satis-cari]").first();
  await kutu.click(); await kutu.fill("Müşteri B"); await sayfa.waitForTimeout(300);
  await kutu.press("Enter"); await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-alis-satis-ac]").click();
  await sayfa.waitForTimeout(900);
  const panel = await sayfa.evaluate(() => ({
    panel: !!document.querySelector('[data-alis-satis-panel="Satış"]'),
    pencereYok: !document.querySelector("[data-pencere-id]"),
    siparisler: [...document.querySelectorAll("[data-alis-satis-panel] [data-siparisten-sec-siparis]")].map((e) => e.getAttribute("data-siparisten-sec-siparis")),
  }));
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparisten-ekle="SAT-9"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-alis-satis-panel] [data-fis-kaydet]").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1800);
  const s9 = (await depoOku(sayfa, "siparis:data")).find((s) => s.id === "s9");
  const panelKapandi = await sayfa.locator("[data-alis-satis-panel]").count() === 0;
  const liste = await sayfa.evaluate(() => [...document.querySelectorAll("[data-alis-satis-fis]")].map((tr) => [...tr.children].slice(2).map((td) => td.textContent.trim()).join(" | ")));
  await sayfa.locator('[data-alis-satis-ara="cari"]').fill("yok"); await sayfa.waitForTimeout(200);
  const suzgec = await sayfa.locator("[data-alis-satis-fis]").count();
  await tarayici.close();
  return { hatalar, panel, karsilanan: s9.kalemler.map((k) => [k.beden, k.karsilanan]), durum: s9.durum, panelKapandi, liste, suzgec };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 1))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
