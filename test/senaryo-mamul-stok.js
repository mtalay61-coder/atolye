// SENARYO — MAMUL STOK AYRI MENÜ ÖĞESİ (25 Eylül, v1.455.0).
//
// Kullanıcı: "Stokta mamul stoğunu ayıralım; sekme şeklinde değil, Depo'nun alt öğesi olsun."
//
// Ölçülenler:
//   1. Depo ▸ Stok: hammadde görünüyor, mamul görünmüyor; kategori sekmelerinde "Mamul" yok.
//   2. Depo ▸ Mamul Stok: yalnız mamul; kategori sekmesi yok; eklenen yeni ürün MAMUL.
//   3. Şeritten mamul ürünün penceresine dönünce Mamul Stok'a geçiliyor (Stok'ta açık kalmıyor).
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  // Görünen metinde ürün adları ve görünen kategori sekmeleri.
  const liste = () => sayfa.evaluate(() => {
    const gorunur = (e) => e.getBoundingClientRect().width > 0;
    const yaprak = (ad) => [...document.querySelectorAll("*")].some((e) => gorunur(e) && e.children.length === 0 && (e.textContent || "").trim() === ad);
    return {
      baslik: ((document.querySelector("h1") || {}).textContent || "").trim(),
      deri: yaprak("Deri"),
      bot: yaprak("Bot"),
      kategoriSekmeleri: [...document.querySelectorAll("button")].filter(gorunur)
        .map((b) => b.textContent.trim().replace(/\s*\d+$/, ""))
        .filter((t) => ["Tümü", "Hammadde", "Yarı Mamul", "Mamul", "Hizmet"].includes(t)),
    };
  });
  const listedenAc = async (ad) => {
    await sayfa.evaluate((ad) => {
      const el = [...document.querySelectorAll("*")].find((e) =>
        e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === ad && e.children.length === 0);
      let p = el;
      for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    }, ad);
    await sayfa.waitForTimeout(900);
  };

  // Depo menüsündeki öğeler (açılır liste kapalıyken de DOM'da).
  const depoOgeleri = await sayfa.evaluate(() => {
    const g = document.querySelector('[data-nav-grup="Depo"]');
    const kap = g && g.parentElement;
    return kap ? [...kap.querySelectorAll("[data-nav]")].map((b) => b.getAttribute("data-nav")) : null;
  });

  // 1. Stok.
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(700);
  const stok = await liste();

  // 2. Mamul Stok + yeni ürün.
  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(700);
  const mamul = await liste();
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Ürün Ekle/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  // Mamul formu: renk arama kutusu (hammaddede ayrı kutu) çiziliyor.
  const yeniUrunMamul = await sayfa.evaluate(() => !!document.querySelector("[data-renk-ekle-arama]") && !document.querySelector("[data-hammadde-renk-arama]"));
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^(İptal|Vazgeç)$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);

  // 3. Bot'u aç, küçült; Stok'a geç; şeritten Bot'a dön.
  await listedenAc("Bot");
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll('button[title="Sekmede bırak, kapatma"]')].find((x) => x.getBoundingClientRect().height > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const d = [...document.querySelectorAll("div")].find((x) =>
      x.getBoundingClientRect().height > 0 && x.firstChild && x.firstChild.nodeType === 3 && x.firstChild.textContent.trim() === "Ürün: Bot");
    if (d) d.click();
  });
  await sayfa.waitForTimeout(900);
  const seritDonusu = await sayfa.evaluate(() => {
    const d = JSON.parse(sessionStorage.getItem("arayuz:durum") || "null");
    const etiket = [...document.querySelectorAll("span")].find((s) => s.textContent.trim() === "Stok Kartı" && s.getBoundingClientRect().height > 0);
    return { tab: d && d.tab, kart: etiket ? (etiket.nextElementSibling || {}).textContent || "?" : null };
  });

  await tarayici.close();
  return { hatalar, depoOgeleri, stok, mamul, yeniUrunMamul, seritDonusu };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
