// SENARYO — SİPARİŞ KARTINDA DÜZEN (29 Eylül, v1.527.0).
//
// Kullanıcı: "Sipariş kartına da düzen ekle." Kart gövdesi `siparisKarti` düzeni: Not / Para birimi çevirisi / Kalemler
// (gizlenemez) / Tedarik ve fiş geçmişi / Koliler / Teslim alma-sevk.
// Kurulum: notlu bir alış siparişi (ALS-D1), tam ekran kart.
// Ölçülen:
//   1) varsayılan sıra; düzen ikonu tek (tam ekran kartta); kipte gizlenebilen bloklar (Kalemler yok);
//   2) Tedarik bloğu Kalemler'in üstüne, Not gizli → Kaydet → sıra uygulanmış, not metni görünmüyor;
//   3) kayıt tanimlar.ekranDuzenleri.siparisKarti.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir(ekranGoruntusu) {
  const t = { ...TOHUM };
  const kalem = (id, renk, beden, miktar) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([{
    id: "sd1", siparisNo: "ALS-D1", tip: "Alış", cariId: "c1", durum: "Bekliyor", tarih: "2026-09-29", teslimTarihi: "", not: "Acil teslim",
    kalemler: [kalem("d1", "Siyah", "40", 2), kalem("d2", "Siyah", "41", 3)],
  }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1100, height: 1000 });
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Alış Siparişi");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-siparis-tam-ekran="ALS-D1"]').first().click();
  await sayfa.waitForTimeout(800);
  const K = '[data-duzen-ekran="siparisKarti"]';
  const gorunur = `${K}:visible`;
  const durum = () => sayfa.evaluate((K) => {
    const k = [...document.querySelectorAll(K)].find((x) => x.getBoundingClientRect().width > 0);
    if (!k) return null;
    return {
      sira: [...k.querySelectorAll(":scope > .duzen-alani > [data-duzen-blok]")].map((b) => b.getAttribute("data-duzen-blok")),
      notGorunur: (k.textContent || "").includes("Acil teslim"),
    };
  }, K);
  const varsayilan = await durum();
  const ikonSayisi = await sayfa.locator('[data-duzen-ac="siparisKarti"]:visible').count();
  await sayfa.locator(`${gorunur} [data-duzen-ac="siparisKarti"]`).first().click();
  await sayfa.waitForTimeout(300);
  const gozler = await sayfa.evaluate((K) => {
    const k = [...document.querySelectorAll(K)].find((x) => x.getBoundingClientRect().width > 0);
    return [...k.querySelectorAll(":scope > .duzen-alani > [data-duzen-blok] > [data-duzen-cubugu] [data-duzen-gizle]")].map((b) => b.getAttribute("data-duzen-gizle"));
  }, K);
  await sayfa.locator(`${gorunur} [data-duzen-yukari="tedarik"]`).first().click();
  await sayfa.locator(`${gorunur} [data-duzen-gizle="not"]`).first().click();
  await sayfa.waitForTimeout(150);
  if (ekranGoruntusu) await sayfa.locator(gorunur).first().screenshot({ path: ekranGoruntusu });
  await sayfa.locator(`${gorunur} [data-duzen-kaydet="siparisKarti"]`).first().click();
  await sayfa.waitForTimeout(900);
  const kayittanSonra = await durum();
  const tanim = await depoOku(sayfa, "tanimlar:data");
  const kayit = ((tanim && tanim.ekranDuzenleri) || {}).siparisKarti || [];
  await tarayici.close();
  return {
    hatalar, varsayilan, ikonSayisi, gozler, kayittanSonra,
    kayit: kayit.map((x) => `${x.id}:${x.genislik}${x.gizli ? "(gizli)" : ""}`),
  };
}

if (require.main === module) {
  calistir(process.argv[2]).then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
