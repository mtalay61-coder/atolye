// SENARYO — SİPARİŞTE BELGE NO + SEZON (9 Ekim, v1.624.0).
// Kullanıcı: "Sipariş girerken belge no ve sezon girişi eklensin, bunlar da mor şeritte görünsün."
// v1.624.1: listede Sezon seçici (kayıtlı sezonlar) ve belge no kutusuyla süzme; satırda belge/sezon rozeti.
// Ölçülen: düzenleme formunda Belge No ve Sezon kutuları (sezon önerisi başka siparişten); yazıp kaydedince kayda
// belgeNo/sezon düşer; satırın not kutusuna yazılıp Enter/+ basılmadan kaydedilen not da kaleme yazılır (kullanıcı:
// "sipariş satıra girdiğim notu göremiyorum" — v1.624.0'a kadar kayboluyordu); kartın mor şeridinde "Belge: …" ve "Sezon: …" rozetleri; aramada belge no ile bulunur.
const { uygulamaAc, modulAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const k = (id, renk, beden) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 10, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([
    { id: "b1", siparisNo: "SAT-B1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-09", kalemler: [k("a", "Siyah", "40")] },
    { id: "b2", siparisNo: "SAT-B2", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-08", sezon: "2026 Kış", kalemler: [k("b", "Siyah", "41")] },
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-B1"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  const form = await sayfa.evaluate(() => ({
    belgeKutusu: !!document.querySelector("[data-siparis-belge-no]"),
    sezonKutusu: !!document.querySelector("[data-siparis-sezon]"),
    sezonOnerileri: [...document.querySelectorAll("#siparis-sezon-onerileri option")].map((o) => o.value),
  }));
  await sayfa.locator("[data-siparis-belge-no]:visible").first().fill("BLG-778");
  await sayfa.locator("[data-siparis-sezon]:visible").first().fill("2027 Yaz");
  await sayfa.locator("[data-form-kalem-notlari] [data-kalem-not-metin]:visible").first().fill("taban sert olsun");
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(1000);
  const kayit = (((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "b1") || {});
  const serit = await sayfa.evaluate(() => ({
    belge: [...document.querySelectorAll("[data-siparis-serit-belge]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim()),
    sezon: [...document.querySelectorAll("[data-siparis-serit-sezon]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim()),
    morSeritte: [...document.querySelectorAll("[data-siparis-serit-belge]")].some((x) => getComputedStyle(x.parentElement.parentElement).backgroundColor === "rgb(237, 231, 242)"),
  }));
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN, clip: { x: 0, y: 90, width: 1400, height: 300 } });
  // SÜZGEÇ (v1.624.1 — kullanıcı: "Sezon ve belge no ile siparişleri filtreleyebilelim").
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  const satirlar = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-siparis-satir]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.getAttribute("data-siparis-satir")).sort());
  const suzgec = { hepsi: await satirlar() };
  suzgec.sezonSecenekleri = await sayfa.evaluate(() => { const s = [...document.querySelectorAll("[data-siparis-sezon-filtre]")].find((x) => x.getBoundingClientRect().width > 0); return s ? [...s.options].map((o) => o.value) : null; });
  await sayfa.locator("[data-siparis-sezon-filtre]:visible").first().selectOption("2026 Kış"); await sayfa.waitForTimeout(300);
  suzgec.sezon2026Kis = await satirlar();
  await sayfa.locator("[data-siparis-sezon-filtre]:visible").first().selectOption(""); await sayfa.waitForTimeout(200);
  await sayfa.locator('input[placeholder="belge no…"]:visible').first().fill("778"); await sayfa.waitForTimeout(300);
  suzgec.belge778 = await satirlar();
  suzgec.satirRozetleri = await sayfa.evaluate(() => [...document.querySelectorAll("[data-siparis-satir-belge], [data-siparis-satir-sezon]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim()));
  await tarayici.close();
  return { hatalar, form, suzgec, kayit: { belgeNo: kayit.belgeNo, sezon: kayit.sezon, satirNotu: (kayit.kalemler || []).map((x) => (x.notlar || []).map((n) => n.metin).join("|")) }, serit };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
