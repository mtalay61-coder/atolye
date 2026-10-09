// SENARYO — SİPARİŞ NOTLARI PENCERESİ (9 Ekim, v1.621.0).
// Kullanıcı: "Sipariş notları görmemiz lazım, siparişte üzerine tıklayınca açılır not şeklinde olsun."
// Ölçülen: listede notlu siparişte "3 not" rozeti, notsuzda yok; kartın mor şeridinde "Notlar (3)"; tıklayınca pencerede
// genel not + iki renk notu (proses etiketli), aynı notun ölçü tekrarları tek; dışına tıklayınca kapanır.
const { uygulamaAc, modulAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const k = (id, renk, beden, notlar) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 10, paraBirimi: "TRY", ...(notlar ? { notlar } : {}) });
  t["siparis:data"] = JSON.stringify([
    { id: "n1", siparisNo: "SAT-N1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-09", not: "Kutular müşterinin logolu", kalemler: [
      k("a", "Siyah", "40", [{ proses: "Kesim", metin: "Deri aynı partiden" }]), k("b", "Siyah", "41", [{ proses: "Kesim", metin: "Deri aynı partiden" }]),
      k("c", "Kahve", "40", [{ proses: "", metin: "Bağcık bej" }])] },
    { id: "n2", siparisNo: "SAT-N2", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-08", kalemler: [k("d", "Siyah", "40")] },
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const rozetler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-siparis-satir]")].map((r) => `${r.getAttribute("data-siparis-satir")}:${(r.querySelector("[data-siparis-satir-not]") || { getAttribute: () => "-" }).getAttribute("data-siparis-satir-not")}`));
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-N1"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const dugme = await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-siparis-notlar]")].find((x) => x.getBoundingClientRect().width > 0); return b ? b.textContent.trim() : null; });
  await sayfa.locator("[data-siparis-notlar]:visible").first().click(); await sayfa.waitForTimeout(300);
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN, clip: { x: 0, y: 0, width: 1400, height: 520 } });
  const pencere = await sayfa.evaluate(() => {
    const p = document.querySelector("[data-siparis-not-penceresi]");
    return p ? { genel: (p.querySelector("[data-siparis-not-genel]") || {}).innerText, renkler: [...p.querySelectorAll("[data-siparis-not-renk]")].map((r) => r.innerText.replace(/\s+/g, " ").trim()) } : null;
  });
  await sayfa.mouse.click(700, 900); await sayfa.waitForTimeout(200);
  const kapandi = await sayfa.evaluate(() => !document.querySelector("[data-siparis-not-penceresi]"));
  // FORM (v1.621.0, aynı gün: "Sipariş girişinde not ekleyebilelim"): SAT-N2 → Düzenle → Notlar paneli → genel not + Siyah
  // satırına "Kesim" notu → Kaydet → kayıtta ikisi de, kartta "Notlar (2)".
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Kapat$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-N2"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const formDugmesi = await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-form-notlar]")].find((x) => x.getBoundingClientRect().width > 0); return b ? b.getAttribute("data-form-notlar") : null; });
  await sayfa.locator("[data-form-notlar]:visible").first().click(); await sayfa.waitForTimeout(200);
  await sayfa.locator("[data-form-genel-not]").first().fill("Acil — fuar numunesi");
  const grup = sayfa.locator('[data-form-not-grubu="Bot · Siyah"]').first();
  await grup.locator("[data-kalem-not-proses]").selectOption("Kesim").catch(async () => {});
  const metinKutusu = grup.locator('input').first();
  await metinKutusu.fill("Deri aynı partiden");
  await metinKutusu.press("Enter"); await sayfa.waitForTimeout(200);
  const panelde = await sayfa.evaluate(() => ({ sayac: [...document.querySelectorAll("[data-form-notlar]")].find((x) => x.getBoundingClientRect().width > 0).getAttribute("data-form-notlar"),
    notlar: [...document.querySelectorAll('[data-form-not-grubu] [data-kalem-not]')].map((e) => e.getAttribute("data-kalem-not")) }));
  if (process.env.EKRAN2) { await sayfa.evaluate(() => { const e = document.querySelector("[data-form-notlar-paneli]"); if (e) e.scrollIntoView({ block: "center" }); }); await sayfa.waitForTimeout(200); await sayfa.screenshot({ path: process.env.EKRAN2 }); }
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click(); await sayfa.waitForTimeout(1000);
  const kayit = ((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "n2") || {};
  const kartDugmesi = await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-siparis-notlar]")].find((x) => x.getBoundingClientRect().width > 0); return b ? b.textContent.trim() : null; });
  await tarayici.close();
  const form = { formDugmesi, panelde, kayitNot: kayit.not, kayitKalemNotlari: (kayit.kalemler || []).map((k) => (k.notlar || []).map((n) => `${n.proses}:${n.metin}`)), kartDugmesi };
  return { hatalar, rozetler, dugme, pencere, kapandi, form };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
