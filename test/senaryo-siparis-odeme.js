// SENARYO — SİPARİŞTEN TAHSİLAT (v1.612.0). Kullanıcı: "Siparişte ödeme girişi de olsun, caride ülke de girebilelim."
//
// SAT-9 (Müşteri B, 10 × 25 USD = 250 USD). Sipariş kartında "Tahsilat Gir" → form KARTIN İÇİNDE (v1.613.0) dolu:
// tutar 250, USD, açıklama "Sipariş SAT-9". Hesapsız kaydet → uyarı, kayıt yok. USD Kasa seçilip kaydedilir → cari
// hareketi THS- + siparisId s9 + kasa bağı; kasada 250 USD giriş; kartta hemen "Ödenen 250 $ · Kalan 0 $".
// "Çek/senet için cari kartında aç" → cari kartı kalan tutarla dolu (v1.612 köprüsü). Cari kartına Ülke yazılınca
// kayda `ulke` geçer.
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
  await sayfa.waitForTimeout(600);
  // v1.613.0: form KARTIN İÇİNDE açılır (cari ekranına gidilmez); çek/senet için cari kartı bağlantısı durur.
  const form = await sayfa.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      kartta: !!q("[data-siparis-odeme-formu]"), tip: q("[data-siparis-odeme-formu]") && q("[data-siparis-odeme-formu]").getAttribute("data-siparis-odeme-formu"),
      cariEkraninaGitmedi: !document.querySelector("[data-cari-ust-serit]"),
      tutar: q("[data-siparis-odeme-tutar]") && q("[data-siparis-odeme-tutar]").value,
      pb: q("[data-siparis-odeme-pb]") && q("[data-siparis-odeme-pb]").value,
      aciklama: q("[data-siparis-odeme-aciklama]") && q("[data-siparis-odeme-aciklama]").value,
      hesapSecici: !!q("[data-siparis-odeme-hesap]"), carideAcBaglantisi: !!q("[data-siparis-odeme-caride]"),
    };
  });
  // Hesap seçilmeden kaydet → uyarı, kayıt yok.
  await sayfa.locator("[data-siparis-odeme-kaydet]").first().click();
  await sayfa.waitForTimeout(400);
  const hesapsizKayit = ((((await depoOku(sayfa, "cari:data")).find((c) => c.id === "c2") || {}).hareketler) || []).length;
  await sayfa.locator("[data-siparis-odeme-hesap]").first().selectOption("kasa:k-usd");
  await sayfa.waitForTimeout(200);
  await sayfa.locator("[data-siparis-odeme-kaydet]").first().click();
  await sayfa.waitForTimeout(1800);
  const cariler = await depoOku(sayfa, "cari:data");
  const hareket = ((cariler.find((c) => c.id === "c2") || {}).hareketler || []).find((h) => String(h.fisNo || "").startsWith("THS-")); // huni islemTipi yazmaz, tip fiş ön ekinde
  const muhasebe = await depoOku(sayfa, "muhasebe:data");
  const kasaHareketi = (((muhasebe.kasalar || []).find((k) => k.id === "k-usd") || {}).hareketler || [])[0];
  const kayit = hareket ? { yon: hareket.yon, tutar: hareket.tutar, pb: hareket.paraBirimi, siparisId: hareket.siparisId, siparisNo: hareket.siparisNo,
    fisOnEki: String(hareket.fisNo || "").slice(0, 4), aciklama: hareket.aciklama, hesapAd: hareket.hesapAd, bagVar: !!hareket.muhasebeBagId && hareket.muhasebeBagId === (kasaHareketi || {}).muhasebeBagId,
    kasaYonu: kasaHareketi && kasaHareketi.yon, kasaTutar: kasaHareketi && kasaHareketi.tutar, hesapsizKayit } : null;
  // Kayıttan hemen sonra, kart kapanmadan "Ödenen / Kalan".
  const ozetHemen = await sayfa.evaluate(() => {
    const e = [...document.querySelectorAll("[data-siparis-odenen]")].find((x) => x.getBoundingClientRect().width > 0);
    const l = document.querySelector("[data-siparis-odeme-listesi]");
    return e ? { odenen: e.getAttribute("data-siparis-odenen"), kalan: e.getAttribute("data-siparis-kalan"), yazi: e.textContent.trim(), formKapandi: !document.querySelector("[data-siparis-odeme-formu]"),
      liste: l ? { adet: l.getAttribute("data-siparis-odeme-listesi"), fisVar: /THS-/.test(l.textContent), kasaVar: /USD Kasa/.test(l.textContent), tutarVar: /250 \$/.test(l.textContent) } : null } : null;
  });

  // ÇEK/SENET BAĞLANTISI: cari kartı dolu açılır (v1.612 köprüsü).
  await sayfa.locator("[data-siparis-odeme-gir]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-siparis-odeme-caride]:visible").first().click();
  await sayfa.waitForTimeout(1000);
  const kopru = await sayfa.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const serit = [...document.querySelectorAll("[data-cari-ust-serit]")].find((x) => x.getBoundingClientRect().width > 0);
    return { cariEkrani: !!serit, acikKart: serit && /Müşteri B/.test(serit.textContent) ? "Müşteri B" : null,
      tutar: q("[data-cari-hareket-tutar]") && q("[data-cari-hareket-tutar]").value, pb: q("[data-cari-hareket-pb]") && q("[data-cari-hareket-pb]").value };
  });

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
  return { hatalar, dugme, form, kayit, ozetHemen, kopru, ulkeAlaniVar, ulke, ozet };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
}
module.exports = { calistir };
