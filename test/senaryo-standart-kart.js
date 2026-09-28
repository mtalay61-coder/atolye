// SENARYO — ÜRÜN KARTINDA "STANDART" YAZMAZ (28 Eylül, v1.507.0).
//
// Kullanıcı (Astar Dana ekran görüntüleri): "Standart yazısı buralarda da var, düzeltelim." Bedensiz hammadde
// (renk Kahve, beden yer tutucu "Standart"): Stok Hareketleri satırında "Kahve Standart -100", Stok Durumu
// matrisinde sütun başlığı "STANDART" görünüyordu.
// Ölçülenler: iki sekmede de ekranda "Standart" geçmiyor; matris sütun başlığı "Miktar", hareket satırı
// "Kahve -100"; kayıt değişmiyor (varyant yine Kahve/Standart).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push({ id: "ad1", ad: "Astar Dana", kategori: "Hammadde", birim: "Desi", olcuTipi: "Beden", malzemeTipi: "Astar",
    variants: [{ renk: "Kahve", beden: "Standart", miktar: -100, minStok: 0 }],
    hareketler: [{ id: "hx1", tarih: "2026-09-27T20:56:00.000Z", renk: "Kahve", beden: "Standart", miktar: -100, kaynak: "Satış", cariId: "c2", fisNo: "SF-0927002" }],
    recete: [], prosesUcretleri: {} });
  t["stok:items"] = JSON.stringify(stok);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => { const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Astar Dana" && e.getBoundingClientRect().width > 0); let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } } });
  await sayfa.waitForTimeout(1200);
  const kart = () => sayfa.evaluate(() => {
    const m = document.querySelector("[data-stok-matris]");
    return {
      standartGeciyor: /Standart/i.test(document.body.innerText),
      matrisBasliklari: m ? [...m.querySelectorAll("thead th")].map((th) => th.innerText.trim()) : null,
    };
  });
  const bilgiler = await kart();
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Stok Hareketleri/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  const hareketler = await sayfa.evaluate(() => ({
    standartGeciyor: /Standart/i.test(document.body.innerText),
    satir: (() => { const t = document.body.innerText; const i = t.indexOf("SF-0927002"); return i < 0 ? null : t.slice(i, i + 64).replace(/\s+/g, " "); })(),
  }));
  const kayit = (((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "ad1") || {}).variants;
  await tarayici.close();
  return { hatalar, bilgiler, hareketler, kayit };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
