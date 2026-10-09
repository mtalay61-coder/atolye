// SENARYO — ÇEKTE DEFTER (v1.539.0, kullanıcı: "Çekte Resmi ve Genel defter yok mu?" → "Evet yap, carideki gibi olsun").
//
//   1. Çek formunda Defter seçimi var (Genel / Resmi / Muhasebe); Resmi seçilen çekin cari girişi Resmi deftere.
//   2. Listede Resmi rozeti görünüyor.
//   3. Resmi çekin tahsilinde bankaya giren para da Resmi deftere (önce hep "Muhasebe").
const { uygulamaAc, depoOku, modulAc, cariSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({
    kurlar: {},
    kasalar: [],
    bankalar: [{ id: "b1", ad: "Ziraat TL", paraBirimi: "TRY", hareketler: [] }],
    cekler: [{ id: "cR", durum: "Tahsilde", tip: "Alınan", cekNo: "88888", cariId: "c2", tutar: 3000, paraBirimi: "TRY",
      vadeTarihi: "2026-12-05", defter: "Resmi", tahsilBankaId: "b1", tahsilBankaAd: "Ziraat TL",
      gecmis: [{ id: "cekh-t", islem: "Bankaya Tahsile Ver", oncekiDurum: "Portföyde", yeniDurum: "Tahsilde",
        tarih: "2026-09-10", bankaId: "b1", bankaAd: "Ziraat TL" }] }],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  await modulAc(sayfa, "Çek & Senet");
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => x.textContent.trim() === "Çek" && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(800);

  // ---- 1. FORMDA DEFTER ----------------------------------------------------------------------------
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Yeni Çek/.test(x.textContent));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  const secenekler = await sayfa.evaluate(() => {
    const s = document.querySelector("[data-cek-defter]");
    return s ? { deger: s.value, secenekler: [...s.options].map((o) => o.value) } : null;
  });
  await sayfa.evaluate(() => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    const bul = (re) => [...document.querySelectorAll("label")].find((l) => re.test(l.textContent));
    const t = bul(/^Tutar/);
    if (t) { const i = t.querySelector("input"); set.call(i, "7000"); i.dispatchEvent(new Event("input", { bubbles: true })); }
    const v = bul(/Vade Tarihi/);
    if (v) { const i = v.querySelector("input"); set.call(i, "2026-12-01"); i.dispatchEvent(new Event("input", { bubbles: true })); }
  });
  await cariSec(sayfa, "Müşteri B", "", "data-cek-cari");   // v1.622.0: aramalı kutu
  await sayfa.waitForTimeout(300);
  await sayfa.selectOption("[data-cek-defter]", "Resmi");
  await sayfa.waitForTimeout(300);
  if (process.env.EKRAN_FORM) await sayfa.screenshot({ path: process.env.EKRAN_FORM, fullPage: false });
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .filter((x) => x.getBoundingClientRect().width > 0)
      .find((x) => x.textContent.trim() === "Kaydet");
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1600);
  let m = await depoOku(sayfa, "muhasebe:data");
  const cariler = await depoOku(sayfa, "cari:data");
  const yeniCek = (m.cekler || []).find((c) => c.tutar === 7000) || {};
  const musteri = cariler.find((c) => c.unvan === "Müşteri B") || {};
  const giris = (musteri.hareketler || []).find((h) => h.id === yeniCek.hareketId) || {};
  const rozetler = await sayfa.evaluate(() =>
    [...document.querySelectorAll("[data-cek-defter-rozet]")].filter((x) => x.getBoundingClientRect().width > 0)
      .map((x) => x.textContent.trim()));
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN, fullPage: false });

  // ---- 3. RESMİ ÇEKİN TAHSİLİ ---------------------------------------------------------------------
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .filter((x) => /İşlemler/.test(x.textContent) && x.getBoundingClientRect().width > 0)
      .find((x) => {
        let e = x.parentElement;
        while (e && !e.textContent.includes("88888")) e = e.parentElement;
        return e && !e.textContent.includes("7.000") && !/7000/.test(e.textContent);
      });
    if (b) b.click();
  });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("bedeli hesaba geçti") && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button.btn-primary")]
      .find((x) => x.textContent.trim() === "Tahsil Edildi" && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1500);
  m = await depoOku(sayfa, "muhasebe:data");
  const bankaHareketleri = ((m.bankalar || [])[0] || {}).hareketler || [];

  await tarayici.close();
  return {
    hatalar,
    secenekler,
    yeniCek: { defter: yeniCek.defter, bagli: !!yeniCek.hareketId },
    cariGirisi: { defter: giris.defter, yon: giris.yon, tutar: giris.tutar },
    rozetler,
    tahsil: {
      durum: ((m.cekler || []).find((c) => c.id === "cR") || {}).durum,
      bankaHareketleri: bankaHareketleri.map((h) => [h.yon, h.tutar, h.defter, h.cekId]),
    },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
