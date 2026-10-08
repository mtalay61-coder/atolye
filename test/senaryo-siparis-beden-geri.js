// SENARYO — SİPARİŞ FORMUNDA SİLİNEN ÖLÇÜ / RENK GERİ EKLENİR (8 Ekim, v1.614.0).
// Kullanıcı (ekran görüntüsü, sipariş formu): "Silinen rengi tekrar ekleyemiyorum." "×" ile silinen ölçünün hücresi
// "—" kalıyordu ve doldurulamıyordu.
// Kurulum: SAT-B1 — Bot Siyah 40:2 41:3 (fiyat 400, KDV 10), Bot Kahve 40:4.
// Ölçülen:
//   1) Siyah 41 "×" ile silinir → hücre boş kutu olur (data-form-kalem-beden-ekle), "—" değil.
//   2) Kutuya 5 yazılır → Siyah 41:5 geri gelir, satırın fiyatı (400) ve KDV'si (10) ile.
//   3) Kahve satırının tek ölçüsü silinir (renk satırı kaybolur) → "Kalem Ekle"den Bot · Kahve · 40:6 geri eklenir.
//   4) Kaydedince sipariş: Siyah 40:2 41:5, Kahve 40:6.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  ["Siyah", "Kahve"].forEach((r) => ["40", "41"].forEach((b) => {
    if (!bot.variants.some((v) => v.renk === r && v.beden === b)) bot.variants.push({ renk: r, beden: b, miktar: 0 });
  }));
  t["stok:items"] = JSON.stringify(stok);
  const kalem = (id, renk, beden, miktar) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar, karsilanan: 0, birim: "çift", birimFiyat: 400, paraBirimi: "TRY", kdvOrani: 10 });
  t["siparis:data"] = JSON.stringify([{ id: "sb1", siparisNo: "SAT-B1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-08", teslimTarihi: "",
    kalemler: [kalem("s40", "Siyah", "40", 2), kalem("s41", "Siyah", "41", 3), kalem("k40", "Kahve", "40", 4)] }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-B1"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(600);

  // Satırın sırası renk değerinden (select'in görünen metni ölçü biçimiyle değişebiliyor).
  const satir = async (renk) => {
    const i = await sayfa.evaluate((r) => [...document.querySelectorAll('tr[data-form-kalem-satiri="serbest"]')].findIndex((x) => (x.querySelector("[data-form-kalem-renk]") || {}).value === r), renk);
    return sayfa.locator('tr[data-form-kalem-satiri="serbest"]').nth(i);
  };
  const satirDurumu = () => sayfa.evaluate(() => [...document.querySelectorAll('tr[data-form-kalem-satiri]')].map((tr) => ({
    renk: (tr.querySelector("[data-form-kalem-renk]") || {}).value || null,
    bosKutular: [...tr.querySelectorAll("[data-form-kalem-beden-ekle]")].map((i) => i.getAttribute("data-form-kalem-beden-ekle")),
    tireler: [...tr.querySelectorAll("td")].filter((td) => td.textContent.trim() === "—").length,
  })));

  // 1) Siyah 41 sil.
  await sayfa.evaluate(() => {
    const tr = [...document.querySelectorAll('tr[data-form-kalem-satiri="serbest"]')].find((x) => (x.querySelector("[data-form-kalem-renk]") || {}).value === "Siyah");
    const sil = [...tr.querySelectorAll('button[title="Bu bedeni sil"]')]; sil[1].click();   // 40, 41 → ikincisi 41
  });
  await sayfa.waitForTimeout(300);
  const silindiktenSonra = await satirDurumu();

  // 2) Boş kutuya 5 yaz.
  const kutu = (await satir("Siyah")).locator('[data-form-kalem-beden-ekle="41"]');
  await kutu.fill("5");
  await kutu.blur();
  await sayfa.waitForTimeout(300);
  const geriYazildi = await satirDurumu();

  // 3) Kahve satırını tamamen sil → Kalem Ekle'den geri ekle.
  await sayfa.evaluate(() => {
    const tr = [...document.querySelectorAll('tr[data-form-kalem-satiri="serbest"]')].find((x) => (x.querySelector("[data-form-kalem-renk]") || {}).value === "Kahve");
    tr.querySelector('button[title="Bu bedeni sil"]').click();
  });
  await sayfa.waitForTimeout(300);
  const kahveSilindi = (await satirDurumu()).map((x) => x.renk);
  await sayfa.locator('[data-siparis-duzenleme] input[placeholder="Model ara…"]').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-siparis-duzenleme] button", { hasText: "Bot" }).first().click();
  await sayfa.waitForTimeout(400);
  const renkKutusu = sayfa.locator("[data-siparis-duzenleme] [data-siparis-renk-arama]").first();
  await renkKutusu.click();
  await renkKutusu.fill("kah");
  await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-siparis-duzenleme] [data-aramali-oneri="Kahve"]').first().dispatchEvent("mousedown");
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-olcu-miktar="40"]').fill("6");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(400);
  const kahveGeri = (await satirDurumu()).map((x) => x.renk);

  // 4) Kaydet.
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(1000);
  const sip = ((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "sb1") || {};
  const kalemler = (sip.kalemler || []).map((k) => `${k.renk}:${k.beden}:${k.miktar}:${k.birimFiyat}:${k.paraBirimi}:${k.kdvOrani == null ? "-" : k.kdvOrani}`).sort();
  await tarayici.close();
  return { hatalar, silindiktenSonra, geriYazildi, kahveSilindi, kahveGeri, kalemler };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
}
module.exports = { calistir };
