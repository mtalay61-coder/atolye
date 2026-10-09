// SENARYO — KAYDET / VAZGEÇ ÜST MOR ŞERİTTE (9 Ekim, v1.625.0).
// Kullanıcı: "Sipariş düzenleyip kaydet tuşu mor şeride alalım", "Tüm kaydetler üst mor şeritte olsun".
// Ölçülen (her formda): Kaydet ve Vazgeç aynı mor şeridin (#EDE7F2) içinde ve şerit formun üst kısmında (formdaki ilk
// giriş kutusundan yukarıda). Sipariş düzenlemede şerit yapışkan: form aşağı kaydırılınca Kaydet görünür kalır.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

const MOR = "rgb(237, 231, 242)";
const olc = (sayfa, kaydetSec) => sayfa.evaluate(({ kaydetSec, MOR }) => {
  const k = [...document.querySelectorAll(kaydetSec)].find((x) => x.getBoundingClientRect().width > 0);
  if (!k) return null;
  let s = k.parentElement;
  while (s && getComputedStyle(s).backgroundColor !== MOR) s = s.parentElement;
  if (!s) return { morSeritte: false };
  const vazgec = [...s.querySelectorAll("button")].some((b) => /Vazgeç/.test(b.textContent));
  return { morSeritte: true, vazgecAyniSeritte: vazgec };
}, { kaydetSec, MOR });

async function calistir() {
  const t = { ...TOHUM };
  const k = (id, renk, beden) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 10, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([{ id: "b1", siparisNo: "SAT-B1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-09",
    kalemler: ["36", "37", "38", "39", "40", "41"].map((b, i) => k(`a${i}`, i % 2 ? "Siyah" : "Kahve", b)) }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const sonuc = {};

  // Yeni sipariş.
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-yeni-siparis]:visible").first().click(); await sayfa.waitForTimeout(600);
  sonuc.yeniSiparis = await olc(sayfa, "[data-siparis-kaydet]");
  sonuc.yeniSiparisBaslik = await sayfa.evaluate(() => { const s = document.querySelector("[data-siparis-form-eylemler]"); return s ? s.textContent.replace(/\s+/g, " ").trim().slice(0, 40) : null; });
  await sayfa.locator("[data-siparis-form-vazgec]:visible").first().click(); await sayfa.waitForTimeout(400);

  // Sipariş düzenleme + yapışkanlık.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparis-tam-ekran="SAT-B1"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  sonuc.siparisDuzenleme = await olc(sayfa, "[data-siparis-duzenle-kaydet]");
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN, clip: { x: 0, y: 90, width: 1400, height: 330 } });
  // Form kısa: kaydırma olsun diye pencere alçaltılıyor.
  await sayfa.setViewportSize({ width: 1400, height: 520 }); await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const f = document.querySelector("[data-siparis-duzenleme]"); if (f) f.scrollTop = 400; });
  await sayfa.waitForTimeout(300);
  sonuc.kaydirincaKaydetGorunur = await sayfa.evaluate(() => {
    const k = document.querySelector("[data-siparis-duzenle-kaydet]"); const r = k.getBoundingClientRect();
    return document.querySelector("[data-siparis-duzenleme]").scrollTop > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
  });
  await sayfa.setViewportSize({ width: 1400, height: 950 }); await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-siparis-form-vazgec]:visible").first().click(); await sayfa.waitForTimeout(400);
  sonuc.duzenlemeKapandi = await sayfa.evaluate(() => !document.querySelector("[data-siparis-duzenleme]"));

  // Yeni cari formu.
  await sayfa.keyboard.press("Escape");
  await modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Cari Ekle/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  sonuc.yeniCari = await olc(sayfa, "[data-cari-form-seridi] .btn-save");
  await tarayici.close();
  return { hatalar, ...sonuc };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
