// SENARYO — REÇETE GERÇEKLEŞMESİ (üretimden ölçülen tüketim).
//
// Kullanıcı (6 Eylül): "Hammadde birim adedi reçeteye NOT olarak yansısın — deri 30 desi
// planlandı ama 31 desiden çıkıyor gibi. Bununla hem reçete kontrolü yaparız, gerçek maliyet
// yakalanıyor mu diye."
//
// Reçete bir TAHMİNDİR; gerçek tüketim ancak iş bitince belli olur (verilen − iade).
// Rakamlar HER ZAMAN gösteriliyor, ama "reçeteni değiştir" önerisi yeterli ölçüm VE anlamlı
// fark birlikteyken çıkıyor — tek üretimde deri kötü çıkmış olabilir.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function receteyiAc(sayfa) {
  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el;
    for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  // 21 Eylül: ölçüm paneli Reçete'den MALİYET sekmesine taşındı ve yalnız farkları gösteriyor.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Maliyet" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
}

const ozetMetni = (sayfa) => sayfa.evaluate(() => {
  const blok = document.querySelector("[data-uretim-sapmalari]");
  return blok ? blok.innerText.replace(/\s+/g, " ").trim() : null;
});

async function calistir() {
  const hatalar = [];

  // ---- 1. ÜÇ ÖLÇÜM, %15 FARK → ÖNERİ ÇIKMALI --------------------------------------------------
  const t1 = { ...TOHUM };
  const stok1 = JSON.parse(t1["stok:items"]);
  stok1.find((p) => p.kategori === "Mamul").receteGerceklesme = {
    "u1|Siyah|": { olcum: 3, toplam: 6.9, planlanan: 2, sonTarih: "2026-09-05" },
  };
  t1["stok:items"] = JSON.stringify(stok1);

  const a = await uygulamaAc(t1, { hataYaz: false });
  a.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await a.sayfa.waitForTimeout(2400);
  await receteyiAc(a.sayfa);
  const oneriliOzet = await ozetMetni(a.sayfa);
  await a.tarayici.close();

  // ---- 2. TEK ÖLÇÜM → RAKAM VAR, ÖNERİ YOK ----------------------------------------------------
  // Tek üretimde deri kötü çıkmış olabilir; bir ölçümden reçete değiştirilmez.
  const t2 = { ...TOHUM };
  const stok2 = JSON.parse(t2["stok:items"]);
  stok2.find((p) => p.kategori === "Mamul").receteGerceklesme = {
    "u1|Siyah|": { olcum: 1, toplam: 2.3, planlanan: 2, sonTarih: "2026-09-05" },
  };
  t2["stok:items"] = JSON.stringify(stok2);

  const b = await uygulamaAc(t2, { hataYaz: false });
  b.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await b.sayfa.waitForTimeout(2400);
  await receteyiAc(b.sayfa);
  const tekOlcumOzet = await ozetMetni(b.sayfa);
  await b.tarayici.close();

  return {
    hatalar,
    // Reçete, ölçüm, kaç ölçüm, yüzde fark ve öneri cümlesi bir arada.
    oneriliOzet,
    // Aynı rakamlar görünüyor ama "değerlendirin" cümlesi YOK.
    tekOlcum: {
      metin: tekOlcumOzet,
      oneriYok: tekOlcumOzet ? !/değerlendirin/.test(tekOlcumOzet) : null,
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
