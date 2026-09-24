// SENARYO — SİLME ONAYI PENCERELİ (ERP standardı: "silme onay penceresi açıyor, düğmesi 'Sil'
// diyor, 'Tamam' değil"; kullanıcı karma yolu seçti: ikon satırda kalır, onay pencereyle).
//
// Ölçülen: (1) ikona dokununca SİLMİYOR, pencere açılıyor; (2) penceredeki düğme "Sil" yazıyor;
// (3) Vazgeç kapatıyor, kayıt duruyor; (4) Sil siliyor. Örnek: tanımlardaki asorti — önceden
// hiç onay sormadan siliyordu (sekiz satır içi silmeden biri).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.asortiler = [{ id: "as1", ad: "Deneme asorti", oranlar: [{ beden: "40", oran: 1 }] }];
  t["tanimlar:data"] = JSON.stringify(tan);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(900);
  // Asortiler "Ürün" tanım sekmesinde (23 Eylül düzeni).
  await sayfa.evaluate(() => { const b = document.querySelector('[data-tanim-sekme="urun"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(700);

  const sayi = async () => ((await depoOku(sayfa, "tanimlar:data")).asortiler || []).length;
  const bas = await sayi();

  // 1) İkona dokun → silmemeli, pencere açılmalı
  await sayfa.locator("[data-sil-onay]:visible").first().click();
  await sayfa.waitForTimeout(400);
  const pencere = await sayfa.evaluate(() => {
    const p = document.querySelector("[data-sil-penceresi]");
    const d = document.querySelector("[data-sil-onayla]");
    return { acik: !!p, dugmeYazisi: d ? d.textContent.trim() : null };
  });
  const ilkDokunustaSonra = await sayi();

  // 2) Vazgeç → kapanır, kayıt durur
  await sayfa.locator("[data-sil-vazgec]").first().click();
  await sayfa.waitForTimeout(400);
  const vazgecSonra = { pencere: await sayfa.evaluate(() => !!document.querySelector("[data-sil-penceresi]")), sayi: await sayi() };

  // 3) Tekrar aç → Sil
  await sayfa.locator("[data-sil-onay]:visible").first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-sil-onayla]").first().click();
  await sayfa.waitForTimeout(700);
  const silSonra = await sayi();

  await tarayici.close();
  return { hatalar, bas, pencere, ilkDokunustaSonra, vazgecSonra, silSonra };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
