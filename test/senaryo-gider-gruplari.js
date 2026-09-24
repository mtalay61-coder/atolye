// SENARYO — GİDER GRUPLARI EKLEME/DÜZENLEME (kullanıcı, 20 Eylül: "grup için yeni grup ekleme
// veya düzeltme olsun").
//
// Gruplar gelir/gider kartlarının ana başlıkları ve TEK KAYNAK: kart formu, genel gider defteri
// ve kâr-zarar dökümü hepsi bu listeyi okuyor. Sabit liste yetmiyordu — her atölye kendi
// başlığını kurabilmeli ("Fason işçilik", "İhracat giderleri").
//
// Ölçülen: (1) yeni grup eklenebiliyor; (2) adı düzenlenebiliyor ve KALICI yazılıyor;
// (3) tür seçilebiliyor (gider/gelir) — kâr-zarar raporu türe göre ayırıyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Gelir / Gider"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);

  const baslangic = await sayfa.evaluate(() => [...document.querySelectorAll("[data-gider-grup-ad]")].map((i) => i.value));

  // Yeni grup: Fason işçilik (gider)
  await sayfa.locator("[data-gider-yeni-grup]").fill("Fason işçilik");
  await sayfa.evaluate(() => { const b = document.querySelector("[data-gider-grup-ekle]"); if (b) b.click(); });
  await sayfa.waitForTimeout(800);

  // Yeni grup: Hurda satışı (GELİR)
  await sayfa.locator("[data-gider-yeni-grup]").fill("Hurda satışı");
  await sayfa.evaluate(() => {
    const s = document.querySelector("[data-gider-yeni-tur]");
    if (s) { s.value = "gelir"; s.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = document.querySelector("[data-gider-grup-ekle]"); if (b) b.click(); });
  await sayfa.waitForTimeout(800);

  // Var olan grubun adını düzenle
  await sayfa.locator('[data-gider-grup-ad="uretim"]').fill("Üretim maliyeti");
  await sayfa.waitForTimeout(700);

  const kayitli = await depoOku(sayfa, "tanimlar:data");
  const sonuc = {
    baslangicSayisi: baslangic.length,
    adlar: (kayitli.giderGruplari || []).map((g) => g.ad),
    turler: (kayitli.giderGruplari || []).filter((g) => /Fason|Hurda/.test(g.ad)).map((g) => `${g.ad}:${g.tur}`),
  };

  await tarayici.close();
  return { hatalar, sonuc };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
