// SENARYO — TEKNİK ÇİZİM SEKMESİ (kullanıcı, 17 Eylül: "stok kartı içerisinde üretim teknik
// çizimlerini yükleyeceğimiz, teknik resim detayları vereceğimiz sekme ekleyelim; o alan oluşsun,
// altını dolduracağız").
//
// Ölçülen: (1) MAMUL kartında sekme her zaman var, hammaddede çizim yoksa YOK; (2) teknik not
// yazılınca ürüne kaydediliyor; (3) çizim eklenince listeye giriyor, başlığı düzenlenebiliyor ve
// sekme başlığındaki sayaç artıyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const NOKTA_GORSEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

async function urunAc(sayfa, ad) {
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate((a) => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === a && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  }, ad);
  await sayfa.waitForTimeout(1000);
}
const sekmeVarMi = (sayfa) => sayfa.evaluate(() =>
  [...document.querySelectorAll("button")].some((b) => /Teknik Çizim/.test(b.textContent) && b.offsetParent));

async function calistir() {
  const hatalar = [];
  // Bot mamul, Deri hammadde: hammaddede çizim yok → sekme çıkmamalı.
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.find((p) => p.id === "u2").teknikCizimler = [{ id: "tcz1", gorsel: NOKTA_GORSEL, baslik: "" }];
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2400);

  await urunAc(sayfa, "Deri");
  const hammaddedeSekme = await sekmeVarMi(sayfa);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Kapat|✕/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(500);

  await urunAc(sayfa, "Bot");
  const mamuldeSekme = await sekmeVarMi(sayfa);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Teknik Çizim/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(700);

  const panel = await sayfa.evaluate(() => ({
    panelVar: !!document.querySelector("[data-teknik-cizim]"),
    cizimSayisi: document.querySelectorAll("[data-teknik-gorsel]").length,
    notKutusu: !!document.querySelector("[data-teknik-not]"),
    sekmeEtiketi: ([...document.querySelectorAll("button")].find((b) => /Teknik Çizim/.test(b.textContent) && b.offsetParent) || {}).textContent,
  }));

  // Çizim başlığı ve teknik not.
  await sayfa.locator("[data-teknik-baslik]").first().fill("Kalıp");
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-teknik-not]").fill("Taban: 4 mm kauçuk · Saya dikişi: 3 mm");
  await sayfa.waitForTimeout(900);

  const kayit = await (async () => {
    const p = (await depoOku(sayfa, "stok:items")).find((x) => x.id === "u2");
    return { not: p.teknikNot, cizimler: (p.teknikCizimler || []).map((c) => `${c.baslik}:${c.gorsel ? "görsel" : "-"}`) };
  })();

  await tarayici.close();
  return { hatalar, hammaddedeSekme, mamuldeSekme, panel, kayit };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
