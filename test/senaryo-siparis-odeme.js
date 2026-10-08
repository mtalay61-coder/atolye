// SENARYO — SİPARİŞTEN TAHSİLAT (v1.612.0). Kullanıcı: "Siparişte ödeme girişi de olsun, caride ülke de girebilelim."
//
// SAT-9 (Müşteri B, 10 × 25 USD = 250 USD). Sipariş kartında "Tahsilat Gir" → Cari ekranı açılır, Müşteri B'nin
// kartı açık, tahsilat formu dolu: tutar 250, birim USD, açıklama "Sipariş SAT-9". Kasa (USD Kasa) seçilip kaydedilir
// → cari hareketinde islemTipi Tahsilat + siparisId s9; kasada 250 USD giriş. Sipariş kartına dönülünce
// "Ödenen 250 $ · Kalan 0 $". Ayrıca cari kartına Ülke yazılınca kayda `ulke` geçer.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  t["siparis:data"] = JSON.stringify([
    { id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-01", kalemler: [
      { id: "sk9", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 25, paraBirimi: "USD" } ] },
  ]);
  const m = JSON.parse(t["muhasebe:data"] || "{}");
  m.kasalar = [{ id: "k-usd", ad: "USD Kasa", paraBirimi: "USD", hareketler: [] }];
  m.bankalar = m.bankalar || [];
  t["muhasebe:data"] = JSON.stringify(m);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2200);

  async function kartiAc() {
    await modulAc(sayfa, "Sipariş");
    await sayfa.waitForTimeout(600);
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
    await sayfa.waitForTimeout(400);
    // İkinci açılışta tam ekran zaten açık olabiliyor (düğmeyi kartın gövdesi örtüyor): JS ile tıkla, yoksa geç.
    await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-9"]'); if (b) b.click(); });
    await sayfa.waitForTimeout(800);
  }
  await kartiAc();
  const dugme = await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("[data-siparis-odeme-gir]")].find((x) => x.getBoundingClientRect().width > 0);
    return b ? { tip: b.getAttribute("data-siparis-odeme-gir"), yazi: b.textContent.trim(), ozetVar: !!document.querySelector("[data-siparis-odenen]") } : null;
  });
  await sayfa.locator("[data-siparis-odeme-gir]:visible").first().click();
  await sayfa.waitForTimeout(1000);
  const form = await sayfa.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const serit = [...document.querySelectorAll("[data-cari-ust-serit]")].find((x) => x.getBoundingClientRect().width > 0);
    return {
      cariEkrani: !!serit, acikKart: serit ? (serit.textContent.match(/Müşteri B/) ? "Müşteri B" : serit.textContent.slice(0, 30)) : null,
      tutar: q("[data-cari-hareket-tutar]") && q("[data-cari-hareket-tutar]").value,
      pb: q("[data-cari-hareket-pb]") && q("[data-cari-hareket-pb]").value,
      aciklama: q("[data-cari-hareket-aciklama]") && q("[data-cari-hareket-aciklama]").value,
      hesapSecici: !!q("[data-cari-hareket-hesap]"),
    };
  });
  await sayfa.locator("[data-cari-hareket-hesap]").first().selectOption("kasa:k-usd");
  await sayfa.waitForTimeout(300);
  await sayfa.locator("button.btn-save:visible").first().click();
  await sayfa.waitForTimeout(1800);
  const cariler = await depoOku(sayfa, "cari:data");
  const hareket = ((cariler.find((c) => c.id === "c2") || {}).hareketler || []).find((h) => String(h.fisNo || "").startsWith("THS-")); // huni islemTipi yazmaz, tip fiş ön ekinde
  const muhasebe = await depoOku(sayfa, "muhasebe:data");
  const kasaHareketi = (((muhasebe.kasalar || []).find((k) => k.id === "k-usd") || {}).hareketler || [])[0];
  const kayit = hareket ? { yon: hareket.yon, tutar: hareket.tutar, pb: hareket.paraBirimi, siparisId: hareket.siparisId, siparisNo: hareket.siparisNo,
    fisOnEki: String(hareket.fisNo || "").slice(0, 4), kasaYonu: kasaHareketi && kasaHareketi.yon, kasaTutar: kasaHareketi && kasaHareketi.tutar } : null;

  // ÜLKE: cari kartında düzenleme alanı; yazılınca kayda geçer.
  // AÇIK KARTIN Düzenle düğmesi (kapalı kartların başlığında da aynı düğme var; ilk görünen başkasının olabilir).
  await sayfa.evaluate(() => { const serit = [...document.querySelectorAll("[data-cari-ust-serit]")].find((x) => x.getBoundingClientRect().width > 0); const b = serit && serit.querySelector('button[title^="Düzenle"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const ulkeKutusu = sayfa.locator('[data-cari-vergi-alani="ulke"]:visible').first();
  const ulkeAlaniVar = (await ulkeKutusu.count()) > 0;
  if (ulkeAlaniVar) { await ulkeKutusu.fill("Arnavutluk"); await ulkeKutusu.blur(); await sayfa.waitForTimeout(800); }
  const ulke = ((await depoOku(sayfa, "cari:data")).find((c) => c.id === "c2") || {}).ulke || null;

  // SİPARİŞ KARTINA DÖN: ödenen / kalan.
  await kartiAc();
  const ozet = await sayfa.evaluate(() => {
    const e = [...document.querySelectorAll("[data-siparis-odenen]")].find((x) => x.getBoundingClientRect().width > 0);
    return e ? { odenen: e.getAttribute("data-siparis-odenen"), kalan: e.getAttribute("data-siparis-kalan"), yazi: e.textContent.trim() } : null;
  });

  await tarayici.close();
  return { hatalar, dugme, form, kayit, ulkeAlaniVar, ulke, ozet };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
}
module.exports = { calistir };
