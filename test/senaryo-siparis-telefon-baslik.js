// SENARYO — SİPARİŞ BAŞLIĞI TELEFONDA TAŞMIYOR + KASA FORMUNDA ARAMALI CARİ (9 Ekim, v1.622.0).
// Kullanıcı (SAT-1012 düzenleme, telefon ekranı): "ekran kaymış" — başlık sabit dört sütundu, "Müşteri Sipariş Kodu"
// sağdan kesiliyordu. Ölçülen: 390 px genişlikte başlıktaki her alan kabın içinde (sağ kenar taşmıyor) ve yatay
// kaydırma yok; geniş ekranda cari, tarih, teslim, kod tek satırda (eski düzen). Ayrıca "Fiş ekranlarında da müşteri
// seçimi aramalı olsun": kasa tahsilat formunda kutuya "ted" yazınca yalnız tedarikçi önerilir, seçilen id kutuda.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

const olc = (sayfa) => sayfa.evaluate(() => {
  const kap = document.querySelector("[data-siparis-baslik-alanlari]");
  if (!kap) return null;
  const k = kap.getBoundingClientRect();
  const alanlar = [...kap.children].map((c) => {
    const r = c.getBoundingClientRect();
    return { ad: (c.innerText || "").split("\n")[0].slice(0, 24), ust: Math.round(r.top - k.top), tasiyor: r.right > k.right + 1 || r.left < k.left - 1 };
  });
  return {
    tasan: alanlar.filter((a) => a.tasiyor).map((a) => a.ad),
    yatayKaydirma: document.documentElement.scrollWidth > window.innerWidth + 1,
    ilkSatir: alanlar.filter((a) => a.ust === 0).map((a) => a.ad),
  };
});

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({ hesaplar: [], kasalar: [{ id: "k1", ad: "Ana Kasa", paraBirimi: "TRY", hareketler: [] }], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 } });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  // Kasa formu: Tahsilat → cari kutusu aramalı.
  await modulAc(sayfa, "Kasa & Banka"); await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Ana Kasa/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-islem="tahsilat"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const kutu = sayfa.locator("input[data-kasa-cari]:visible").first();
  const kasaKutusuVar = await kutu.count() > 0;
  let oneri = [], secilen = null;
  if (kasaKutusuVar) {
    await kutu.click(); await kutu.fill("ted"); await sayfa.waitForTimeout(200);
    oneri = await sayfa.evaluate(() => [...document.querySelectorAll("[data-cari-secenek]")].map((b) => b.getAttribute("data-cari-secenek")));
    await kutu.press("Enter"); await sayfa.waitForTimeout(250);
    secilen = await kutu.evaluate((i) => i.getAttribute("data-cari-id"));
  }
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click(); await sayfa.waitForTimeout(700);
  const genis = await olc(sayfa);
  await sayfa.setViewportSize({ width: 390, height: 844 }); await sayfa.waitForTimeout(700);
  const telefon = await olc(sayfa);
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN });

  await tarayici.close();
  return { hatalar, genis, telefon, kasaKutusuVar, oneri, secilen };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
