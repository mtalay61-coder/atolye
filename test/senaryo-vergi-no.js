// SENARYO — VERGİ NO KONTROLÜ (27 Eylül, v1.497.0).
//
// Kullanıcı onayı: "1 ve 2'yi yap" — (1) vergi no / TCKN kontrol basamağı, (2) aynı numaralı cari uyarısı.
// Dışarıya hiçbir şey gönderilmez. Kurulum: Tedarikçi A'nın vergi no'su 3230512384.
// Ölçülenler:
//   1. Cari Ekle formu: yazarken 5 hanede uyarı yok; bozuk VKN kırmızı; Tedarikçi A'nın numarası "geçerli" +
//      "kayıtlı" uyarısı.
//   2. Kaydet: soru çıkar; vazgeçilirse cari eklenmez, onaylanırsa eklenir (engellemez, sorar).
//   3. Cari kartı (Müşteri B): bozuk numara yazılıp çıkılınca soru; vazgeçilirse kaydedilmez ve kutu eski
//      değere döner; geçerli numara sorusuz kaydedilir. Bozuk TCKN kaydedilir ama kırmızı yazar.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const cariler = JSON.parse(TOHUM["cari:data"]).map((c) => c.id === "c1" ? { ...c, vergiNo: "3230512384" } : c);
  t["cari:data"] = JSON.stringify(cariler);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const sorular = [];
  let cevap = false;
  sayfa.on("dialog", (d) => { sorular.push(d.message().replace(/\s+/g, " ").trim()); cevap ? d.accept() : d.dismiss(); });
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);

  const uyari = () => sayfa.evaluate(() => {
    const u = document.querySelector("[data-yeni-cari-vergi-no]").parentElement.querySelector("[data-vergi-no-uyarisi]");
    return u ? u.innerText.replace(/\s+/g, " ").trim() : "";
  });
  await sayfa.locator('button:has-text("Cari Ekle")').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('input[placeholder="Örn. Deniz Ayakkabıcılık"]').fill("Yeni Firma");
  const kutu = sayfa.locator("[data-yeni-cari-vergi-no]");
  const form = {};
  for (const [ad, no] of [["yazarken", "12345"], ["bozuk", "1234567891"], ["hane", "123456789012"], ["tckn", "10000000146"], ["mukerrer", "323 051 2384"]]) {
    await kutu.fill(no); await sayfa.waitForTimeout(150);
    form[ad] = await uyari();
  }
  const cariSayisi = async () => ((await depoOku(sayfa, "cari:data")) || []).length;
  const once = await cariSayisi();
  await sayfa.locator("button.btn-save:has-text('Kaydet')").first().click();
  await sayfa.waitForTimeout(400);
  const vazgecince = await cariSayisi();
  cevap = true;
  await sayfa.locator("button.btn-save:has-text('Kaydet')").first().click();
  await sayfa.waitForTimeout(600);
  const yeni = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.unvan === "Yeni Firma");
  const kayit = { once, vazgecince, onaylayinca: await cariSayisi(), vergiNo: yeni ? yeni.vergiNo : null };

  // Cari kartı düzenleme
  cevap = false;
  await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
  await sayfa.evaluate(() => {
    const d = [...document.querySelectorAll('[data-kart-eylem="duzenle"]')].filter((b) => b.getBoundingClientRect().width > 0).find((b) => {
      let p = b; for (let i = 0; i < 10 && p; i++, p = p.parentElement) {
        const x = p.textContent || "";
        if (x.includes("Müşteri B")) return !x.includes("Personel C") && !x.includes("Tedarikçi A") && !x.includes("Yeni Firma");
      }
      return false;
    });
    if (d) d.click();
  });
  await sayfa.waitForTimeout(400);
  const kartKutu = sayfa.locator("[data-cari-vergi-no]:visible").first();
  const c2 = async () => ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  await kartKutu.fill("1234567891"); await kartKutu.blur(); await sayfa.waitForTimeout(400);
  const kart = { bozukVazgec: { kayit: (await c2()).vergiNo || "", kutu: await kartKutu.inputValue() } };
  const soruSayisi = sorular.length;
  await kartKutu.fill("1234567890"); await kartKutu.blur(); await sayfa.waitForTimeout(400);
  kart.gecerli = { kayit: (await c2()).vergiNo, yeniSoru: sorular.length - soruSayisi,
    uyari: await sayfa.evaluate(() => { const e = document.querySelector("[data-cari-vergi-no]").parentElement.querySelector("[data-vergi-no-gecerli]"); return e ? e.innerText.trim() : null; }) };
  const tc = sayfa.locator('[data-cari-vergi-alani="tckn"]:visible').first();
  await tc.fill("10000000147"); await tc.blur(); await sayfa.waitForTimeout(400);
  kart.bozukTckn = { kayit: (await c2()).tckn, uyari: await sayfa.evaluate(() => { const e = document.querySelector("[data-cari-tckn-hatali]"); return e ? e.innerText.trim() : null; }) };

  await tarayici.close();
  return { hatalar, form, sorular, kayit, kart };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
