// SENARYO — BARKOD OTOMATİK + ASORTİ BARKODUNU KULLANICI OLUŞTURUR (4 Ekim, v1.579.0).
//
// Kullanıcı (Bağcık › Barkodlar; 100 Cm / 120 cm "barkod kurulamıyor", asorti "8 li Standart" kendiliğinden listeli):
// "Stokta renk, beden, boyut vs. açıldığında barkodunu otomatik oluştursun. Sadece asorti barkodunu stok içerisinden
// kullanıcı oluştursun. Birden fazla asorti olacağı için kullanıcı stok içerisinden asorti barkodları oluştursun."
//   1. Tanımsız boyutlu, stok no'suz hammadde: "Barkodları oluştur" → boyutlar Boyut olarak tanımlanır, kod + stok no
//      atanır, "barkod kurulamıyor" kalmaz.
//   2. Mamulde asorti barkodları kendiliğinden listelenmez; "Asorti barkodu ekle" (Bütün renkler + asorti) → her renge bir
//      kod, ürüne `asortiBarkodlari` olarak yazılır; ikinci kez eklemek çoğaltmaz.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function kartAc(sayfa, nav, ad) {
  await sayfa.evaluate((nav) => { const b = document.querySelector(`[data-nav="${nav}"]`); if (b) b.click(); }, nav);
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate((ad) => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === ad && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  }, ad);
  await sayfa.waitForTimeout(1000);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Barkodlar/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
}

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bedenler = [{ id: "b36", ad: "36" }, { id: "b37", ad: "37" }, ...tan.bedenler];
  tan.asortiler = [{ id: "as1", ad: "8 li Standart", oranlar: [{ beden: "36", oran: 3 }, { beden: "37", oran: 5 }] }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(t["stok:items"]);
  st.push({ id: "bag", ad: "Bağcık", kategori: "Hammadde", birim: "çift", olcuTipi: "Boyut", malzemeTipi: "Rekapta", hareketler: [], recete: [],
    variants: ["Siyah", "Kahve"].flatMap((r) => ["100 Cm", "120 cm"].map((b) => ({ renk: r, beden: b, miktar: 0 }))) });
  st.push({ id: "m125", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", hareketler: [], recete: [],
    variants: ["Siyah", "Kahve"].flatMap((r) => ["36", "37"].map((b) => ({ renk: r, beden: b, miktar: 0 }))) });
  t["stok:items"] = JSON.stringify(st);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const kurulamayan = () => sayfa.evaluate(() => (document.body.innerText.match(/barkod kurulamıyor/g) || []).length);

  // 1. Bağcık
  await kartAc(sayfa, "Stok", "Bağcık");
  const once = { kurulamayan: await kurulamayan(), dugme: await sayfa.locator("[data-barkod-tamamla]").count() };
  await sayfa.locator("[data-barkod-tamamla]").click();
  await sayfa.waitForTimeout(1200);
  const tanim = await depoOku(sayfa, "tanimlar:data");
  const bag = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "bag") || {};
  const sonra = {
    kurulamayan: await kurulamayan(),
    dugme: await sayfa.locator("[data-barkod-tamamla]").count(),
    boyutlar: (tanim.bedenler || []).filter((b) => /cm/i.test(b.ad)).map((b) => `${b.ad}:${b.tip}:${b.barkodKodu > 0 ? "kodlu" : "kodsuz"}:${(b.malzemeTipleri || []).join(",")}`),
    stokNoVar: bag.stokNo > 0,
  };
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && x.textContent.trim() === "Kapat"); if (b) b.click(); });
  await sayfa.waitForTimeout(500);

  // 2. 125 Model — asorti barkodları
  await kartAc(sayfa, "Mamul Stok", "125 Model");
  const asortiOnce = await sayfa.evaluate(() => { const x = document.querySelector("[data-asorti-barkodlari]"); return x ? x.innerText.replace(/\s+/g, " ").trim() : "yok"; });
  const ekle = async () => {
    await sayfa.locator("[data-asorti-barkod-ekle]").click();
    await sayfa.locator("[data-asorti-barkod-renk]").selectOption("__hepsi__");
    await sayfa.locator("[data-asorti-barkod-olustur]").click();
    await sayfa.waitForTimeout(1500);
  };
  await ekle();
  await ekle();   // ikinci kez: çoğaltmamalı
  const satirlar = await sayfa.evaluate(() => [...document.querySelectorAll("[data-asorti-barkod]")].map((x) => `${x.getAttribute("data-asorti-barkod")}: ${/90\d{11}/.test(x.textContent) ? "kodlu" : "kodsuz"}`));
  const m = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "m125") || {};
  await tarayici.close();
  return { hatalar, bagcik: { once, sonra }, asorti: { once: asortiOnce, satirlar, kayit: (m.asortiBarkodlari || []).map((x) => `${x.renk}|${x.asortiId}`) } };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
