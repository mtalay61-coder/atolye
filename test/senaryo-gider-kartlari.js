// SENARYO — GELİR / GİDER KARTLARI (kullanıcı, 17 Eylül: "kârlılığımızı kontrol edecek, giderleri
// listeleyecek veya alışsız giderleri kapatacağımız kartlar... girişin çıkış karşılığı olmak
// zorunda çünkü").
//
// ÖNCE: para hareketinin karşı tarafı yalnız CARİ olabiliyordu; kira/elektrik/maaş gibi alışı
// olmayan giderlerde karşı taraf yoktu, para "hiçbir yere" gidiyordu ve kârlılık hesaplanamıyordu.
//
// Ölçülen: (1) Tanımlar'da kart açılıyor, hazır kartlarla başlanabiliyor; (2) kasa formunda kart
// karşı taraf olarak seçilebiliyor; (3) karşı taraf seçilmeden kayıt REDDEDİLİYOR; (4) kaydedilen
// hareket kartın adını ve GRUBUNU taşıyor (kârlılık raporu bu gruplardan çıkacak).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];

  // ---- 1) TANIMLAR: hazır kartlarla başla + elle kart ekle
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2400);
  // 20 Eylül: kartlar Tanımlar'dan çıkıp Finans › Gelir / Gider ekranına taşındı.
  await sayfa.evaluate(() => { const g = document.querySelector('[data-nav-grup="Finans"]'); if (g) g.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Gelir / Gider"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const bosDurum = await sayfa.evaluate(() => ({
    hazirDugmesi: !!document.querySelector("[data-gider-hazir]"),
    kartYok: document.querySelectorAll("[data-gider-kart]").length === 0,
  }));
  await sayfa.evaluate(() => { const b = document.querySelector("[data-gider-hazir]"); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.locator("[data-gider-ad]").fill("Numune giderleri");
  await sayfa.evaluate(() => {
    const s = document.querySelector("[data-gider-grup]");
    const o = [...s.options].find((x) => /Üretim/.test(x.textContent));
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.evaluate(() => { const b = document.querySelector("[data-gider-ekle]"); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const kartlar = (await depoOku(sayfa, "tanimlar:data")).giderKartlari || [];
  const tanimlar = {
    hazirSayisi: kartlar.length,
    elleEklenen: kartlar.filter((k) => k.ad === "Numune giderleri").map((k) => `${k.ad}:${k.grup}:${k.tur}`),
    kiraKarti: kartlar.filter((k) => /kira/i.test(k.ad)).map((k) => `${k.grup}:${k.tdhp}`),
  };
  await tarayici.close();

  // ---- 2) KASA: kart karşı taraf olarak
  const t2 = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.giderKartlari = [{ id: "gk1", ad: "İşyeri kirası", grup: "yonetim", tur: "gider", tdhp: "770.03" }];
  t2["tanimlar:data"] = JSON.stringify(tan);
  t2["muhasebe:data"] = JSON.stringify({ hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48 },
    kasalar: [{ id: "kasa1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] }] });
  const ikinci = await uygulamaAc(t2, { hataYaz: false });
  ikinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ikinci.sayfa.waitForTimeout(2400);
  await modulAc(ikinci.sayfa, "Muhasebe");
  await ikinci.sayfa.waitForTimeout(900);
  await ikinci.sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /TL Kasa/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(700);
  await ikinci.sayfa.evaluate(() => { const b = document.querySelector('[data-islem="serbest"]'); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(500);
  const kartSecici = await ikinci.sayfa.evaluate(() => !!document.querySelector("[data-gider-kart-sec]"));

  // Karşı taraf seçmeden kaydet → reddedilmeli.
  await ikinci.sayfa.locator('input[type="number"]').first().fill("12000");
  await ikinci.sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ekle" && x.offsetParent); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(800);
  const karsiliksizReddedildi = (((await depoOku(ikinci.sayfa, "muhasebe:data")).kasalar[0].hareketler) || []).length === 0;

  // Kart + çıkış + tutar → kaydedilmeli.
  await ikinci.sayfa.evaluate(() => {
    const s = document.querySelector("[data-gider-kart-sec]");
    const o = [...s.options].find((x) => /kirası/.test(x.textContent));
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await ikinci.sayfa.waitForTimeout(300);
  await ikinci.sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")].find((x) => [...x.options].some((o) => /Çıkış/.test(o.textContent)));
    const o = [...s.options].find((x) => /Çıkış/.test(x.textContent));
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await ikinci.sayfa.waitForTimeout(300);
  await ikinci.sayfa.locator('input[type="number"]').first().fill("12000");
  await ikinci.sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ekle" && x.offsetParent); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(1500);
  const kayit = (((await depoOku(ikinci.sayfa, "muhasebe:data")).kasalar[0].hareketler) || [])
    .map((x) => `${x.yon}:${x.tutar}:${x.giderKartAd}:${x.giderGrubu}`);
  await ikinci.tarayici.close();

  return { hatalar, bosDurum, tanimlar, kartSecici, karsiliksizReddedildi, kayit };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
