// SENARYO — FİNANS › ÖDEME & TAHSİLAT (v1.645.8).
//
// Kullanıcı: "Ödeme & Tahsilat sekme olsun; kasa, banka, çek, senet hepsi içerisinde olsun, ödemelerin ve tahsilatların
// girileceği yer." Ekran Cari ile AYNI modül örneği (kapsam "odeme"); form cari kartındaki formun kendisi.
//
// Ölçülen:
//   1. Menüde öğe var; ekran açılır, cari seçilmeden boş durum yazısı.
//   2. Tahsilat + Nakit + cari seçince carinin kartı form AÇIK gelir, ödeme şekli seçilen (Nakit), hesap alanı görünür.
//   3. Kaydedince kasa hareketi ve cari hareketi (THS-) yazılır; altta "Son tahsilat ve ödemeler" satırı çıkar.
//   4. Ödeme + Çek seçilince form çek bilgileriyle açılır (ödeme şekli Çek).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

(async () => {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({ kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] }], bankalar: [], cekler: [] });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const sonuc = {};
  sonuc.menuVar = await sayfa.evaluate(() => !!document.querySelector('[data-nav="odemetahsilat"]') || [...document.querySelectorAll("[data-nav]")].some((b) => /Ödeme & Tahsilat/.test(b.textContent)));
  await modulAc(sayfa, "Ödeme & Tahsilat");
  await sayfa.waitForTimeout(700);
  const gorunen = () => sayfa.evaluate(() => { const e = [...document.querySelectorAll("[data-odeme-tahsilat]")].find((x) => x.getBoundingClientRect().width > 0); return e ? e.innerText.replace(/\s+/g, " ") : null; });
  const ilk = await gorunen();
  sonuc.ekran = !!ilk;
  sonuc.bosDurum = /cariyi seçin/.test(ilk || "");

  // Tahsilat + Nakit + Müşteri B.
  await sayfa.locator('[data-odeme-tip="Tahsilat"]:visible').click();
  await sayfa.locator('[data-odeme-sekli="Nakit"]:visible').click();
  const kutu = sayfa.locator("[data-odeme-cari]:visible").first();
  await kutu.click(); await kutu.fill("Müşteri B"); await sayfa.waitForTimeout(300); await kutu.press("Enter");
  await sayfa.waitForTimeout(1000);
  sonuc.formAcik = await sayfa.evaluate(() => /Hangi kasaya\/bankaya girdi/.test(document.querySelector("[data-odeme-tahsilat]").innerText));
  sonuc.odemeSekli = await sayfa.evaluate(() => { const s = [...document.querySelectorAll("[data-odeme-tahsilat] select")].find((x) => [...x.options].some((o) => o.value === "Senet")); return s ? s.value : null; });
  await sayfa.evaluate(() => {
    const k = document.querySelector("[data-odeme-tahsilat]");
    const i = [...k.querySelectorAll('input[type="number"]')].find((x) => x.getBoundingClientRect().width > 0);
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(i, "500"); i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sayfa.locator('[data-odeme-tahsilat] select:has(option:text-is("Kasa: TL Kasa")):visible').first().selectOption({ label: "Kasa: TL Kasa" });
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("[data-odeme-tahsilat] button")].find((x) => /^(Ekle|Kaydet)$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1500);
  const m = await depoOku(sayfa, "muhasebe:data");
  sonuc.kasa = ((((m || {}).kasalar || [])[0] || {}).hareketler || []).map((h) => [h.yon, h.tutar]);
  const c = ((await depoOku(sayfa, "cari:data")) || []).find((x) => x.unvan === "Müşteri B") || {};
  sonuc.cariTahsilat = (c.hareketler || []).filter((h) => /^THS-/.test(h.fisNo || "")).map((h) => [h.tutar, h.odemeSekli]);
  sonuc.sonListe = await sayfa.evaluate(() => [...document.querySelectorAll("[data-odeme-son-satir]")].map((r) => [...r.cells].slice(1, 5).map((x) => x.innerText.trim()).join(" | ")));

  // Ödeme + Çek: form çek bilgileriyle açılır.
  await sayfa.locator('[data-odeme-tip="Ödeme"]:visible').click();
  await sayfa.locator('[data-odeme-sekli="Çek"]:visible').click();
  await sayfa.waitForTimeout(800);
  sonuc.cekFormu = await sayfa.evaluate(() => {
    const k = document.querySelector("[data-odeme-tahsilat]").innerText;
    const s = [...document.querySelectorAll("[data-odeme-tahsilat] select")].find((x) => [...x.options].some((o) => o.value === "Senet"));
    return { sekil: s ? s.value : null, cekBilgileri: /Çek bilgileri/.test(k) };
  });
  sonuc.hatalar = hatalar;
  console.log(JSON.stringify(sonuc, null, 1));
  await tarayici.close();
})();
