// SENARYO — SİPARİŞ FORMUNDA SATIR FİYATI BÜTÜN BEDENLERE (28 Eylül, v1.513.0).
//
// Kullanıcı (ekran görüntüsü, ALS-1002): alış siparişini düzenleyip satır fiyatına 550 yazdı; kartta
// "0–550 ₺", toplam 550 (8 çift × 550 olmalıydı). Sebep: fiyat bedenlere `forEach(kalemDuzenle)` ile
// dağıtılıyordu, her çağrı aynı çizimin `kalemler` fotoğrafından kurduğu için yalnız SON beden fiyat
// aldı. Ardından satır "farklı" görünüyor ve fiyat kutusu kayboluyordu.
// Ölçülen:
//   1) aynı fiyatlı satır (3 beden, 0 ₺) → 550 → kaydet → üç bedenin hepsi 550;
//   2) fiyatları farklı satır (0 / 550) → "farklı" kutusuna 500 → kaydet → iki beden de 500;
//   3) Taba satırı "satırı sil" düğmesiyle iki bedeniyle birlikte çıkıyor (v1.515.0).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const kalem = (id, renk, beden, miktar, fiyat) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar, karsilanan: 0, birim: "çift", birimFiyat: fiyat, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([{
    id: "sf1", siparisNo: "ALS-F1", tip: "Alış", cariId: "c1", durum: "Bekliyor", tarih: "2026-09-28", teslimTarihi: "", not: "",
    kalemler: [
      kalem("a1", "Siyah", "39", 1, 0), kalem("a2", "Siyah", "40", 2, 0), kalem("a3", "Siyah", "41", 2, 0),
      kalem("b1", "Kahve", "40", 1, 0), kalem("b2", "Kahve", "41", 3, 550),
      // v1.515.0: satır sil düğmesiyle çıkarılacak satır (iki beden).
      kalem("c1", "Taba", "40", 4, 300), kalem("c2", "Taba", "41", 4, 300),
    ],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Alış Siparişi");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-siparis-tam-ekran="ALS-F1"]').first().click();
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(700);

  const satirlar = sayfa.locator('tr[data-form-kalem-satiri="serbest"]');
  const siyah = satirlar.filter({ has: sayfa.locator('[data-form-kalem-renk] option:checked', { hasText: "Siyah" }) }).first();
  const kahve = satirlar.filter({ has: sayfa.locator('[data-form-kalem-renk] option:checked', { hasText: "Kahve" }) }).first();
  const farkliKutusuOnce = await kahve.locator("[data-form-kalem-farkli-fiyat]").count();
  // Aynı fiyatlı satır: fiyat kutusu miktar kutularından sonraki ilk sayı kutusu (son sayı kutusu).
  const siyahFiyat = siyah.locator('input[type="number"]').last();
  await siyahFiyat.fill("550");
  await siyahFiyat.blur();
  await sayfa.waitForTimeout(300);
  const kahveFiyat = kahve.locator("[data-form-kalem-farkli-fiyat]");
  await kahveFiyat.fill("500");
  await kahveFiyat.blur();
  await sayfa.waitForTimeout(300);
  // SATIRI SİL (v1.515.0 — kullanıcı: "sipariş formunda da satır silme olsun").
  const taba = satirlar.filter({ has: sayfa.locator('[data-form-kalem-renk] option:checked', { hasText: "Taba" }) }).first();
  await taba.locator("[data-form-kalem-satir-sil]").click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(1000);
  const sip = ((await depoOku(sayfa, "siparis:data")) || []).find((s) => s.id === "sf1") || {};
  await tarayici.close();
  return {
    hatalar,
    farkliSatirdaFiyatKutusuVar: farkliKutusuOnce === 1,
    fiyatlar: (sip.kalemler || []).map((k) => `${k.renk}:${k.beden}:${k.miktar}×${k.birimFiyat}`),
  };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
