// SENARYO — SİTE TALEBİ E-POSTA BİLDİRİMİ AYARI (v1.744.18, 266 `SiteBildirimAyari`).
// Tanımlar › Web Sitesi › "E-posta bildirimi": kutu + alıcılar kaydedilir → `firmaBilgileri.siteBildirim`; HERKESE AÇIK
// `siteAyarlari`na alıcı adresi GİRMEZ. "Deneme gönder" site-bildirim fonksiyonunu çağırır (sahte yanıt), sonuç bildirilir.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
async function calistir() {
  const cagrilar = [];
  const onceRota = async (s) => {
    await s.route("**/functions/v1/site-bildirim", (r) => { cagrilar.push(JSON.parse(r.request().postData() || "{}")); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tamam: true, mesaj: "satis@ornek.com: tamam" }) }); });
    await s.route("**/rest/v1/site_bildirim_kaydi*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "talep:t1", tur: "talep", durum: "gönderildi (satis@ornek.com: tamam)", zaman: "2026-11-12T10:05:00Z" }]) }));
  };
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, onceRota });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(1500);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-tanim-sekme="websitesi"]').click();
  await sayfa.waitForTimeout(400);
  const baslikKapali = await sayfa.locator('[data-site-bildirim-ayari] > button').first().innerText();
  await sayfa.locator('[data-site-bildirim-ayari] > button').first().click();
  await sayfa.waitForTimeout(300);
  const denemeKapaliBasta = await sayfa.locator("[data-site-bildirim-dene]").isDisabled();
  await sayfa.locator("[data-site-bildirim-acik]").check();
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-site-bildirim-alicilar]").fill("satis@ornek.com, ikinci@ornek.com");
  await sayfa.locator("[data-site-bildirim-acik]").focus();   // blur → kaydet
  await sayfa.waitForTimeout(600);
  const tan = await depoOku(sayfa, "tanimlar:data");
  await sayfa.locator("[data-site-bildirim-dene]").click();
  await sayfa.waitForTimeout(800);
  const toast = await sayfa.evaluate(() => /Deneme e-postası gönderildi/.test(document.body.innerText));
  const son = await sayfa.locator("[data-site-bildirim-son]").innerText().catch(() => null);
  const baslikAcik = await sayfa.locator('[data-site-bildirim-ayari] > button').first().innerText();
  await tarayici.close();
  return {
    baslikKapali, baslikAcik, denemeKapaliBasta,
    ayar: (tan.firmaBilgileri || {}).siteBildirim || null,
    siteAyarlarindaAdresYok: !/ornek\.com/.test(JSON.stringify(tan.siteAyarlari || {})),
    denemeCagrisi: cagrilar, toast, son, hatalar,
  };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
module.exports = { calistir };
