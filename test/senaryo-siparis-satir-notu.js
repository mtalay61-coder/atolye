// SENARYO — SİPARİŞ KARTINDA SATIR NOTU TIKLAYINCA AÇILIR (9 Ekim, v1.623.0).
// Kullanıcı: "sipariş satır notları üzerine tıklayınca açılsın, düzenleye tıklamadan görünmüyor; not olan satırda not
// olduğunu belli eden renk olsun". Ölçülen: notlu renk satırı sarı zeminli + "N not" rozetli, notsuz satır düz; başta not
// metni kapalı; satıra tıklayınca altında not satırı (proses etiketli) açılır; tekrar tıklayınca kapanır.
// Ayrıca cari kartı (aynı sürüm): kalem iletişim alanlarını mor şeride, adres/vergi alanlarını Bilgiler sekmesine açar.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const k = (id, renk, beden, notlar) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 10, paraBirimi: "TRY", ...(notlar ? { notlar } : {}) });
  t["siparis:data"] = JSON.stringify([{ id: "n1", siparisNo: "SAT-N1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-09", kalemler: [
    k("a", "Siyah", "40", [{ proses: "Kesim", metin: "Deri aynı partiden" }]), k("b", "Siyah", "41", [{ proses: "", metin: "Bağcık bej" }]), k("c", "Kahve", "40")] }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-N1"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const durum = () => sayfa.evaluate(() => ({
    notluSatirlar: [...document.querySelectorAll("[data-kart-notlu-satir]")].filter((x) => x.getBoundingClientRect().width > 0)
      .map((x) => `${x.getAttribute("data-kart-notlu-satir")}:${(x.querySelector("[data-kart-not-rozeti]") || {}).textContent}:${getComputedStyle(x.querySelector("[data-kart-not-rozeti]").closest("td")).backgroundColor}`),
    acikNotlar: [...document.querySelectorAll("[data-kart-kalem-aciklama]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim()),
  }));
  const bas = await durum();
  await sayfa.locator('[data-kart-notlu-satir="Siyah"]:visible [data-kart-not-rozeti]').first().click();
  await sayfa.waitForTimeout(300);
  const acik = await durum();
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN, clip: { x: 0, y: 90, width: 1400, height: 420 } });
  await sayfa.locator('[data-kart-notlu-satir="Siyah"]:visible [data-kart-not-rozeti]').first().click();
  await sayfa.waitForTimeout(300);
  const kapali = await durum();

  // Cari kartı: Müşteri B → kalem → mor şeritte iletişim, Bilgiler sekmesinde vergi alanları.
  await sayfa.keyboard.press("Escape");
  await modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Müşteri B"):visible').last().click(); await sayfa.waitForTimeout(600);
  const cariBas = await sayfa.evaluate(() => ({
    sekmeler: [...document.querySelectorAll("[data-cari-sekme]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.getAttribute("data-cari-sekme")),
    vergiAlaniGorunur: [...document.querySelectorAll("[data-cari-vergi-no]")].some((x) => x.getBoundingClientRect().width > 0),
  }));
  await sayfa.locator('[data-cari-ust-serit] [data-kart-eylem="duzenle"]:visible').first().click(); await sayfa.waitForTimeout(500);
  const cariDuzen = await sayfa.evaluate(() => {
    const serit = document.querySelector("[data-cari-serit-iletisim]");
    const icinde = (sec) => !!(serit && serit.querySelector(sec));
    const gor = (sec) => [...document.querySelectorAll(sec)].some((x) => x.getBoundingClientRect().width > 0);
    return {
      seritteWhatsapp: icinde("[data-cari-whatsapp]"), seritteEposta: icinde("[data-cari-eposta]"), seritteVergi: icinde("[data-cari-vergi-no]"),
      seritMorun: !!(serit && serit.closest("[data-cari-ust-serit]")),
      bilgilerSekmesiSecili: getComputedStyle(document.querySelector('[data-cari-sekme="bilgiler"]')).backgroundColor !== "rgb(255, 255, 255)",
      vergiNoGorunur: gor("[data-cari-vergi-no]"), ulkeGorunur: gor('[data-cari-vergi-alani="ulke"]'), efaturaGorunur: gor("[data-cari-efatura-mukellef]"),
    };
  });
  if (process.env.EKRAN_CARI) { await sayfa.locator("[data-cari-ust-serit]").first().scrollIntoViewIfNeeded(); await sayfa.screenshot({ path: process.env.EKRAN_CARI }); }
  await tarayici.close();
  return { hatalar, bas, acik, kapali, cariBas, cariDuzen };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
