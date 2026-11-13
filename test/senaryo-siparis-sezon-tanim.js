// SENARYO — SİPARİŞ SEZONU TANIMLARDAN (v1.744.19, 131). Kullanıcı: "Sipariş sezonu tanımlardan seçtirilsin, aktif/pasif olsun;
// 2028 Yaz'a girince 2027 Yaz'ı seçtirmeye gerek kalmaz — pasife alınca çıkmaz."
// Tohum: tanımlarda 2027 Yaz (PASİF), 2028 Yaz (aktif); SAT-B2'nin sezonu eski serbest yazı "2026 Kış" (tanımlı değil).
// Ölçülen: form sezonu SEÇİM kutusu, pasif sezon yok; seçilen sezon kayda düşer; eski siparişin tanımsız sezonu "(listede yok)"
// etiketiyle seçili kalır ve kayıtta silinmez; Tanımlar › Ürün › Sezonlar: aktif/pasif düğmesi, kullanım sayısı, tanımsız
// sezonu "Tanımlara ekle".
const { uygulamaAc, modulAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.siparisSezonlari = [{ id: "s27", ad: "2027 Yaz", pasif: true }, { id: "s28", ad: "2028 Yaz", pasif: false }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const k = (id, renk, beden) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 10, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([
    { id: "b1", siparisNo: "SAT-B1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-09", kalemler: [k("a", "Siyah", "40")] },
    { id: "b2", siparisNo: "SAT-B2", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-08", sezon: "2026 Kış", kalemler: [k("b", "Siyah", "41")] },
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const duzenleAc = async (no) => {
    await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
    await sayfa.waitForTimeout(400);
    await sayfa.evaluate((n) => { const b = document.querySelector(`[data-siparis-tam-ekran="${n}"]`); if (b) b.click(); }, no);
    await sayfa.waitForTimeout(800);
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0); if (b) b.click(); });
    await sayfa.waitForTimeout(600);
  };
  const sezonKutusu = () => sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("[data-siparis-sezon]")].find((x) => x.getBoundingClientRect().width > 0);
    return s ? { tur: s.tagName.toLowerCase(), deger: s.value, secenekler: s.options ? [...s.options].map((o) => o.textContent) : null } : null;
  });
  // 1) Sezonsuz sipariş: pasif 2027 Yaz seçeneklerde yok; 2028 Yaz seçilip kaydedilir.
  await duzenleAc("SAT-B1");
  const yeniForm = await sezonKutusu();
  await sayfa.locator("[data-siparis-sezon]:visible").first().selectOption("2028 Yaz");
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(1000);
  const b1 = (((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "b1") || {}).sezon;
  // 2) Eski serbest sezonlu sipariş: değer korunur.
  await duzenleAc("SAT-B2");
  const eskiForm = await sezonKutusu();
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(1000);
  const b2 = (((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "b2") || {}).sezon;
  // 3) Tanımlar › Ürün › Sezonlar
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-tanim-sekme="urun"]').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-urun-alt="sezon"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const panel = await sayfa.evaluate(() => ({
    satirlar: [...document.querySelectorAll("[data-siparis-sezon-satir]")].map((x) => x.textContent.replace(/\s+/g, " ").trim()),
    aktarDugmesi: (document.querySelector("[data-siparis-sezon-aktar]") || {}).textContent || null,
  }));
  await sayfa.locator('[data-siparis-sezon-durum="2027 Yaz"]').click();   // pasif → aktif
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-siparis-sezon-aktar]").click();             // 2026 Kış tanımlara
  await sayfa.waitForTimeout(400);
  const sonTan = ((await depoOku(sayfa, "tanimlar:data")) || {}).siparisSezonlari || [];
  await tarayici.close();
  return { yeniForm, b1, eskiForm, b2, panel, tanimlar: sonTan.map((s) => `${s.ad}:${s.pasif ? "pasif" : "aktif"}`), hatalar };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
module.exports = { calistir };
