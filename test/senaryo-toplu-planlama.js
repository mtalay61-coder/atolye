// SENARYO — TEDARİK PLANLAMADA ÇOKLU SEÇİM (29 Eylül, v1.531.0).
//
// Kullanıcı: "Tedarik planlama çoktan seçmeli yapalım, çoklu halde alış veya üretime gönderebilelim; çoklu yapılan
// işlemler için yazdır, PDF, WhatsApp da aktif olsun. 20 satır için 20 ayrı üretim oluştursun ve 20 üretim fişi
// çıkarsın, veya 20 alış siparişini tek tedarikçiden WhatsApp'tan gönderebilelim."
// Kurulum: SAT-T1 — Bot Siyah (40:2 41:1), Bot Kahve (40:3), Bot Taba (41:2), Bot Beyaz (42:1); dört satır.
// Ölçülen:
//   1) her satırda seçim kutusu; "Tümünü seç" dört satırı seçer; toplu çubuk "4 satır seçili";
//   2) Siyah + Kahve → Üretime gönder → İKİ ayrı üretim (her satır bir üretim), numaraları farklı; sonuç şeridi
//      "2 üretim" + Yazdır/PDF/WhatsApp; siparişte kalemler bu üretimlere bağlı;
//   3) Taba + Beyaz → Tedarikçi A → Alış siparişine gönder (ayrı ayrı) → İKİ alış siparişi, ikisi de Tedarikçi A;
//      sonuç şeridi "2 alış siparişi", WhatsApp tedarikçi numarasıyla.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir(ekranGoruntusu) {
  const t = { ...TOHUM };
  const cariler = JSON.parse(TOHUM["cari:data"]).map((c) => (c.id === "c1" ? { ...c, whatsapp: "05321112233" } : c));
  t["cari:data"] = JSON.stringify(cariler);
  const kalem = (id, renk, beden, miktar) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" });
  const satis = JSON.parse(TOHUM["siparis:data"] || "[]").filter((s) => s.id !== "st1");
  t["siparis:data"] = JSON.stringify([{
    id: "st1", siparisNo: "SAT-T1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-29", teslimTarihi: "", not: "",
    kalemler: [kalem("s40", "Siyah", "40", 2), kalem("s41", "Siyah", "41", 1), kalem("k40", "Kahve", "40", 3), kalem("t41", "Taba", "41", 2), kalem("b42", "Beyaz", "42", 1)],
  }, ...satis]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1200, height: 1000 });
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-siparis-tam-ekran="SAT-T1"]').first().click();
  await sayfa.waitForTimeout(800);
  // AÇILIR BÖLÜM (v1.547.0): kart açılınca Tedarik Planlama KAPALI; dokununca açılır, tekrar dokununca kapanır.
  const planlamaGorunur = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-planlama-tumunu-sec]")].some((x) => x.getBoundingClientRect().width > 0));
  const bolumDugmesi = async () => { await sayfa.locator('[data-kart-bolum="planlama"]:visible').first().click(); await sayfa.waitForTimeout(400); };
  const acilir = { basta: await planlamaGorunur() };
  if (process.env.EKRAN_KAPALI) await sayfa.screenshot({ path: process.env.EKRAN_KAPALI });
  await bolumDugmesi();
  acilir.dokununca = await planlamaGorunur();
  await bolumDugmesi();
  acilir.tekrarDokununca = await planlamaGorunur();
  await bolumDugmesi();
  if (process.env.EKRAN_ACIK) await sayfa.screenshot({ path: process.env.EKRAN_ACIK });

  const kutular = await sayfa.evaluate(() => [...document.querySelectorAll("[data-planlama-satir-sec]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.getAttribute("data-planlama-satir-sec")));
  await sayfa.locator("[data-planlama-tumunu-sec] input:visible").first().check();
  await sayfa.waitForTimeout(200);
  const tumuSecilince = await sayfa.locator("[data-planlama-toplu-cubuk]:visible").first().getAttribute("data-planlama-toplu-cubuk");
  await sayfa.locator("[data-planlama-tumunu-sec] input:visible").first().uncheck();
  await sayfa.waitForTimeout(200);

  // 2) Üretim.
  await sayfa.locator('[data-planlama-satir-sec="Bot|Siyah"]:visible').first().check();
  await sayfa.locator('[data-planlama-satir-sec="Bot|Kahve"]:visible').first().check();
  await sayfa.waitForTimeout(150);
  await sayfa.locator("[data-planlama-toplu-uretim]:visible").first().click();
  await sayfa.waitForTimeout(1200);
  const uretimSonucu = await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("[data-planlama-toplu-sonuc]")].find((x) => x.getBoundingClientRect().width > 0);
    return s ? { tip: s.getAttribute("data-planlama-toplu-sonuc"), sayi: s.getAttribute("data-planlama-toplu-sayi"), paylas: [...s.querySelectorAll("button")].map((b) => b.textContent.trim()).filter(Boolean) } : null;
  });
  if (ekranGoruntusu) await sayfa.locator("[data-planlama-toplu-sonuc]:visible").first().locator("xpath=../..").screenshot({ path: ekranGoruntusu });

  // 3) Alış (ayrı ayrı).
  await sayfa.locator('[data-planlama-satir-sec="Bot|Taba"]:visible').first().check();
  await sayfa.locator('[data-planlama-satir-sec="Bot|Beyaz"]:visible').first().check();
  await sayfa.waitForTimeout(150);
  await sayfa.locator("[data-planlama-toplu-tedarikci]:visible").first().selectOption("c1");
  await sayfa.locator("[data-planlama-toplu-alis]:visible").first().click();
  await sayfa.waitForTimeout(1200);
  const alisSonucu = await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("[data-planlama-toplu-sonuc]")].find((x) => x.getBoundingClientRect().width > 0);
    const w = s && s.querySelector("[data-paylas-whatsapp]");
    return s ? { tip: s.getAttribute("data-planlama-toplu-sonuc"), sayi: s.getAttribute("data-planlama-toplu-sayi"), whatsapp: w && w.getAttribute("data-paylas-whatsapp") } : null;
  });

  const uretimler = (await depoOku(sayfa, "uretim:siparisler")) || [];
  const siparisler = (await depoOku(sayfa, "siparis:data")) || [];
  await tarayici.close();
  const sat = siparisler.find((s) => s.id === "st1") || {};
  const alislar = siparisler.filter((s) => s.tip === "Alış" && (s.not || "").includes("SAT-T1"));
  const yeniUretimler = uretimler.filter((u) => (u.not || "").includes("SAT-T1"));
  return {
    acilirBolum: acilir,
    hatalar, kutular, tumuSecilince, uretimSonucu, alisSonucu,
    uretimler: yeniUretimler.map((u) => `${u.model} ${u.renk}: ${(u.bedenMiktarlari || []).map((b) => `${b.beden}:${b.miktar}`).join(" ")}`).sort(),
    uretimNolariFarkli: new Set(yeniUretimler.map((u) => u.siparisNo)).size === yeniUretimler.length,
    alislar: alislar.map((a) => `${a.cariId} · ${a.kalemler.map((k) => `${k.renk} ${k.beden}:${k.miktar}`).join(" ")}`).sort(),
    alisNolariFarkli: new Set(alislar.map((a) => a.siparisNo)).size === alislar.length,
    planlama: (sat.kalemler || []).map((k) => `${k.renk} ${k.beden}: ${k.planlama ? k.planlama.tip : "—"}`),
  };
}

if (require.main === module) {
  calistir(process.argv[2]).then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
