// SENARYO — SİPARİŞ SAĞ TIKINDA "GİT" (10 Ekim, v1.638.0).
// Kullanıcı: "sipariş sağ tık, git olsun açılımında: alış siparişine git, fişlerine git, cari kartına git; stok üzerinde
// tıklarsa stok kartına git, stok renk beden ekle v.s açılsın".
// Kurulum: SAT-Y (Müşteri B) — SF-Y fişi carisinde siparişe bağlı, bir kalemi ALS-Y alışına planlı.
// Ölçülen:
//   1. Kartın boş yerine sağ tık: GİT bölümünde cari kartı, fiş, alış siparişi; STOK bölümü YOK.
//   2. Stok grubunun üstüne sağ tık: ayrıca STOK bölümü (Stok kartı, Renk/beden ekle, Reçete, Fiyatlandırma).
//   3. "Cari kartı" → Cari ekranı, o kart açık. 4. "Alış siparişi" → Satın Alma'da ALS-Y. 5. "Fişe git" → Fişler'de SF-Y.
//   6. "Renk / beden ekle" → ürün kartı Stok Bilgileri sekmesinde açık.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c) => c.id === "c2" ? { ...c, hareketler: [
    { id: "hy1", tarih: "2026-09-28", yon: "Borç", tutar: 400, paraBirimi: "TRY", fisNo: "SF-Y", siparisId: "sy", siparisNo: "SAT-Y",
      urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 4, birimFiyat: 100, defter: "Genel", odemeSekli: "Nakit" }] } : c));
  t["siparis:data"] = JSON.stringify([
    { id: "sy", siparisNo: "SAT-Y", tip: "Satış", cariId: "c2", durum: "Onaylandı", tarih: "2026-09-28", kalemler: [
      { id: "ky1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 4, karsilanan: 4, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" },
      { id: "ky2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 6, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY",
        planlama: { tip: "Satınalma", referansNo: "ALS-Y" } }] },
    { id: "ay", siparisNo: "ALS-Y", tip: "Alış", cariId: "c1", durum: "Bekliyor", tarih: "2026-09-28", rezervasyonSiparisId: "sy",
      kalemler: [{ id: "ak1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 6, karsilanan: 0, birim: "çift", birimFiyat: 60, paraBirimi: "TRY" }] },
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1400, height: 900 });
  await sayfa.waitForTimeout(2200);

  const siparisiAc = async () => {
    await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
    await sayfa.waitForTimeout(300);
    const acik = await sayfa.evaluate(() => [...document.querySelectorAll("[data-siparis-urun]")].some((x) => x.getBoundingClientRect().width > 0));
    if (!acik) { await sayfa.locator('[data-siparis-satir="SAT-Y"]').first().click({ timeout: 5000 }); await sayfa.waitForTimeout(800); }
  };
  const sagTik = (sec) => sayfa.evaluate((sec) => {
    const el = [...document.querySelectorAll(sec)].find((x) => x.getBoundingClientRect().width > 0);
    if (!el) return false;
    const b = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: b.left + 10, clientY: b.top + 10 }));
    return true;
  }, sec);
  const menuOku = () => sayfa.evaluate(() => {
    const m = document.querySelector("[data-siparis-islem-menusu]");
    return m ? [...m.querySelectorAll("[data-siparis-git]")].map((b) => `${b.getAttribute("data-siparis-git")}: ${b.textContent.trim()}`) : null;
  });
  const sec = async (k) => { await sayfa.locator(`[data-siparis-git="${k}"]`).first().click(); await sayfa.waitForTimeout(900); };

  await siparisiAc();
  // 1. Boş yer: siparişin not / toplam alanı — stok grubunun DIŞI. Kart kabının kendisine gönderilir.
  await sagTik('[data-siparis-kart-satir]'); await sayfa.keyboard.press("Escape");
  await sayfa.evaluate(() => { const p = document.querySelector("[data-siparis-islem-perde]"); if (p) p.click(); });
  const kap = await sayfa.evaluate(() => {
    const u = [...document.querySelectorAll("[data-siparis-urun]")].find((x) => x.getBoundingClientRect().width > 0);
    const kart = u && u.parentElement && u.parentElement.closest("[data-siparis-urun]") ? null : u && u.parentElement;
    if (!kart) return false;
    const b = kart.getBoundingClientRect();
    kart.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: b.left + 2, clientY: b.top + 2 }));
    return true;
  });
  await sayfa.waitForTimeout(300);
  const bosYer = { acildi: kap, ogeler: await menuOku() };
  await sayfa.evaluate(() => { const p = document.querySelector("[data-siparis-islem-perde]"); if (p) p.click(); });
  await sayfa.waitForTimeout(200);
  // 2. Stok grubu.
  await sagTik('[data-siparis-urun="u2"]'); await sayfa.waitForTimeout(300);
  const stokUstunde = await menuOku();
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN });
  // 3. Cari kartı.
  await sec("cari");
  const cari = await sayfa.evaluate(() => {
    const k = [...document.querySelectorAll("[data-cari-kart-id]")].filter((x) => x.getBoundingClientRect().width > 0);
    return { gorunenKart: k.length, acikKart: k.filter((x) => x.querySelector("[data-cari-ust-serit]") || x.innerText.includes("Hareketler")).map((x) => x.getAttribute("data-cari-kart-id")) };
  });
  if (process.env.EKRAN2) await sayfa.screenshot({ path: process.env.EKRAN2 });
  // 4. Alış siparişi.
  await siparisiAc(); await sagTik('[data-siparis-urun="u2"]'); await sayfa.waitForTimeout(300);
  await sec("alis");
  const alis = await sayfa.evaluate(() => [...document.querySelectorAll("[data-siparis-satir]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.getAttribute("data-siparis-satir")));
  // 5. Fiş.
  await siparisiAc(); await sagTik('[data-siparis-urun="u2"]'); await sayfa.waitForTimeout(300);
  await sec("fis");
  const fis = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-kart]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.getAttribute("data-fis-kart")));
  // 6. Renk / beden ekle.
  await siparisiAc(); await sagTik('[data-siparis-urun="u2"]'); await sayfa.waitForTimeout(300);
  await sec("renk-beden");
  await sayfa.waitForTimeout(500);
  const urun = await sayfa.evaluate(() => {
    const k = [...document.querySelectorAll('[data-urun-karti="u2"]')].find((x) => x.getBoundingClientRect().width > 0);
    return { pencereAcik: !!k, renkBedenBlogu: !!(k && k.querySelector('[data-duzen-blok="renkBeden"]')) };
  });
  await tarayici.close();
  return { hatalar, bosYer, stokUstunde, cari, alis, fis, urun };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
