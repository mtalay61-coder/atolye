// SENARYO — KASA & BANKA / ÇEK & SENET / CARİ PASİFE AL (25 Eylül, v1.458.0).
//
// Kullanıcı: "Muhasebe olan adı Kasa & Banka olarak değiştirelim. Finans altına Çek & Senet
// ekleyelim." ve "Cari pasife alma olsun."
//
// Ölçülenler:
//   1. Finans menüsü: Cari, Kasa & Banka, Çek & Senet, Gelir / Gider, Fişler.
//   2. Kasa & Banka: Kasa / Banka / Kâr-Zarar sekmeleri, Çek sekmesi yok; başlık "Kasa & Banka".
//   3. Çek & Senet: sekme şeridi yok, doğrudan çek ekranı; başlık "Çek & Senet".
//   4. Cari kartında yazılı "Pasife Al" düğmesi: cari listeden Pasifler'e geçiyor, bildirim çıkıyor;
//      Pasifler'de "Aktife Al" geri getiriyor.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  const gorunenDugmeler = (adlar) => sayfa.evaluate((adlar) => [...document.querySelectorAll("button")]
    .filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.textContent.trim()).filter((t) => adlar.includes(t)), adlar);
  const baslik = () => sayfa.evaluate(() => ((document.querySelector("h1") || {}).textContent || "").trim());
  const dugmeTikla = (ad) => sayfa.evaluate((ad) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === ad && x.getBoundingClientRect().width > 0);
    if (b) b.click(); return !!b;
  }, ad);

  const finansOgeleri = await sayfa.evaluate(() => {
    const g = document.querySelector('[data-nav-grup="Finans"]');
    const kap = g && g.parentElement;
    return kap ? [...kap.querySelectorAll("[data-nav]")].map((b) => b.getAttribute("data-nav")) : null;
  });

  const SEKMELER = ["Kasa", "Banka", "Çek", "Kâr / Zarar"];
  await modulAc(sayfa, "Kasa & Banka");
  await sayfa.waitForTimeout(700);
  const kasaBanka = { baslik: await baslik(), sekmeler: await gorunenDugmeler(SEKMELER) };

  await modulAc(sayfa, "Çek & Senet");
  await sayfa.waitForTimeout(700);
  const cekSenet = {
    baslik: await baslik(),
    sekmeler: await gorunenDugmeler(SEKMELER),
    cekEkrani: await sayfa.evaluate(() => /Portföy/i.test(document.body.innerText)),
  };
  // Kasa & Banka'ya dönünce Kasa'da açılıyor (Çek & Senet'e geçiş seçimi bozmadı).
  await modulAc(sayfa, "Kasa & Banka");
  await sayfa.waitForTimeout(600);
  const donus = await gorunenDugmeler(SEKMELER);

  // Cari pasife al.
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const e = [...document.querySelectorAll("span, div")].find((x) => x.children.length === 0 && x.textContent.trim() === "Müşteri B" && x.getBoundingClientRect().width > 0);
    if (e) e.click();
  });
  await sayfa.waitForTimeout(800);
  const pasif = { dugmeVar: await dugmeTikla("Pasife Al") };
  await sayfa.waitForTimeout(600);
  pasif.bildirim = await sayfa.evaluate(() => /"Müşteri B" pasife alındı/.test(document.body.innerText));
  pasif.listedeKaldi = await sayfa.evaluate(() => [...document.querySelectorAll("span, div")].some((x) => x.children.length === 0 && x.textContent.trim() === "Müşteri B" && x.getBoundingClientRect().width > 0));
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Pasifler/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  // Kartın açık/kapalı durumu korunuyor: kapalıysa açılıyor (açıkken tıklamak kapatırdı).
  if (!(await gorunenDugmeler(["Aktife Al"])).length) {
    await sayfa.evaluate(() => {
      const e = [...document.querySelectorAll("span, div")].find((x) => x.children.length === 0 && x.textContent.trim() === "Müşteri B" && x.getBoundingClientRect().width > 0);
      if (e) e.click();
    });
    await sayfa.waitForTimeout(600);
  }
  pasif.aktifeAlVar = await dugmeTikla("Aktife Al");
  await sayfa.waitForTimeout(600);
  pasif.kayit = await sayfa.evaluate(() => {
    const c = JSON.parse(window.__depo["cari:data"] || "[]").find((x) => x.id === "c2");
    return c ? !!c.pasif : null;
  });

  await tarayici.close();
  return { hatalar, finansOgeleri, kasaBanka, cekSenet, donus, pasif };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
