// SENARYO — MALİYETTEN FİYAT GRUBU FİYATI (kullanıcı, 21 Eylül: "bu listeyi maliyet sekmesi
// olarak aç, buradan satış fiyatı oluşturalım. Tanımlı fiyatları çekip eklediğimiz fiyatlar
// çeksin. Örnek: toptan USD fiyat tanımladık ve toptan USD cari o fiyattan o stoğu alsın").
//
// Zincir: Tanımlar'da "Toptan USD" (Satış, USD) → Ürün › Maliyet sekmesinde öneri (tam maliyet ×
// marj ÷ kur) → Uygula (kural USD ile yazılır) → gruba atanmış cariye satış fişi → fiyat gelir.
// İki cari: USD çalışan (fiyat olduğu gibi) ve TL çalışan (kurla ÇEVRİLMİŞ).
//
// ÖNCE: kural para birimi taşımıyordu — "Toptan USD" grubunun 6,30'u TL cariye 6,30 ₺ gidiyordu.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function fisFiyati(t, cariAd) {
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  // Cari kartını aç: kart başlığındaki ada tıkla (satır bir div).
  await sayfa.evaluate((ad) => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === ad && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON" || p.getAttribute("role") === "button") { p.click(); return; } }
  }, cariAd);
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-cari-fis-ac="Satış"]').first().click();
  await sayfa.waitForTimeout(700);
  const etiket = await sayfa.evaluate(() => {
    const dl = document.getElementById("fis-urun-listesi");
    const o = dl ? [...dl.options].find((x) => /Bot/.test(x.value)) : null;
    return o ? o.value : "Bot";
  });
  await sayfa.locator("[data-urun-arama]").first().fill(etiket);
  await sayfa.waitForTimeout(600);
  const fiyat = await sayfa.evaluate(() => { const i = document.querySelector("[data-kalem-fiyat]"); return i ? i.value : null; });
  await tarayici.close();
  return fiyat;
}

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.fiyatGruplari = [{ id: "fg1", ad: "Toptan USD", tip: "Satış", paraBirimi: "USD" }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(TOHUM["stok:items"]);
  const deri = st.find((p) => p.id === "u1"); deri.alisFiyati = 2; deri.alisParaBirimi = "$";
  const bot = st.find((p) => p.id === "u2");
  bot.recete = [{ hammaddeUrunId: "u1", hammaddeAd: "Deri", mamulRenk: "Siyah", renk: "Siyah", beden: "", miktar: 2, birim: "desi", proses: "Kesim" }];
  bot.prosesUcretleri = { Kesim: 50 }; bot.karMarji = 25;
  t["stok:items"] = JSON.stringify(st);

  // 1) Maliyet sekmesi → Toptan USD satırına Uygula
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1200);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Maliyet" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  // Yeni akış (21 Eylül): grubu SEÇ → fiyat öneriyle dolar → Ekle.
  await sayfa.evaluate(() => { const s = document.querySelector("[data-fg-sec]"); s.value = "fg1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await sayfa.waitForTimeout(400);
  const oneri = await sayfa.evaluate(() => (document.querySelector("[data-fg-fiyat]") || {}).value || null);
  await sayfa.locator("[data-fg-ekle]").click();
  await sayfa.waitForTimeout(800);
  const urun = (await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2");
  const kural = (urun.fiyatKurallari || []).map((k) => `${k.kapsam}:${k.fiyat}:${k.paraBirimi}`);
  await tarayici.close();

  // 2) Gruba atanmış cariler: biri USD, biri TL çalışıyor
  const tahsis = (pb) => {
    const t2 = { ...t, "stok:items": JSON.stringify(JSON.parse(t["stok:items"]).map((p) => (p.id === "u2" ? urun : p))) };
    t2["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c) => (c.id === "c2" ? { ...c, fiyatGrubuId: "fg1", paraBirimi: pb } : c)));
    return t2;
  };
  const usdCari = await fisFiyati(tahsis("USD"), "Müşteri B");
  const tlCari = await fisFiyati(tahsis("TRY"), "Müşteri B");

  return { hatalar, oneri, kural, fisFiyati: { usdCari, tlCari } };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
