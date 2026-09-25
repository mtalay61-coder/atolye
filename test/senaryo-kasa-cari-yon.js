// SENARYO — KASA/BANKA HAREKETİNİN CARİYE YÖNÜ (kullanıcı, 17 Eylül: "kasadan ödeme yapınca
// alacağa, cariden yapınca borca yazıyor").
//
// SORUN: muhasebe ekranından girilen hareket cariye SABİT "Tahsilat" yönüyle yazılıyordu. Kasadan
// ÇIKIŞ (ödeme) yapıldığında bile cariye alacak düşüyordu; aynı işlem cari kartından girilince borç
// düşüyordu — iki ekran aynı olayı ters kaydediyordu.
//
// KURAL (tek yerde, `hareketYonu`): kasa GİRİŞ = tahsilat → "Alacak"; kasa ÇIKIŞ = ödeme → "Borç".
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function kasaHareketi(yon, tutar) {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({ hesaplar: [], kasalar: [{ id: "k1", ad: "Ana Kasa", paraBirimi: "TRY", hareketler: [] }], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 } });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2400);
  await modulAc(sayfa, "Kasa & Banka");
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Ana Kasa/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);

  // İŞLEM ÇUBUĞU (17 Eylül): form artık işlem seçilince açılıyor. Giriş→Tahsilat, Çıkış→Ödeme.
  await sayfa.evaluate((y) => {
    const b = document.querySelector(y === "Giriş" ? '[data-islem="tahsilat"]' : '[data-islem="odeme"]');
    if (b) b.click();
  }, yon);
  await sayfa.waitForTimeout(600);

  // Yön + cari + tutar.
  await sayfa.evaluate((y) => {
    const s = [...document.querySelectorAll("select")].find((x) => [...x.options].some((o) => /Giriş/.test(o.textContent)));
    const o = [...s.options].find((x) => x.textContent.includes(y));
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  }, yon);
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")].find((x) => [...x.options].some((o) => /Tedarikçi A/.test(o.textContent)));
    const o = [...s.options].find((x) => /Tedarikçi A/.test(x.textContent));
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(400);
  await sayfa.locator('input[type="number"]').first().fill(String(tutar));
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ekle" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(1600);

  const cari = (await depoOku(sayfa, "cari:data")).find((c) => c.id === "c1");
  const hareket = (cari.hareketler || [])[0] || null;
  const kasa = ((await depoOku(sayfa, "muhasebe:data")).kasalar || [])[0];
  await tarayici.close();
  return {
    hatalar,
    cariYonu: hareket && hareket.yon,
    cariFisOnEki: hareket && String(hareket.fisNo || "").slice(0, 3),
    cariAciklama: hareket && /Ödeme|Tahsilat/.test(hareket.aciklama || "") ? (hareket.aciklama.match(/Ödeme|Tahsilat/) || [])[0] : null,
    kasaYonu: (kasa.hareketler || [])[0] && kasa.hareketler[0].yon,
  };
}

async function calistir() {
  const giris = await kasaHareketi("Giriş", 500);     // tahsilat
  const cikis = await kasaHareketi("Çıkış", 300);     // ödeme
  return { giris, cikis };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
