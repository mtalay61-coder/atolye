// SENARYO — BOŞ REÇETEYE HAMMADDESİZ PROSES (v1.744.34, kullanıcı 20 Kasım: "reçeteye hammaddesiz proses ekleme olsun,
// daha önce söylemiştim"). "Hammaddesiz proses ekle" satırı (v1.593) yalnız reçetede hammadde satırı varken görünüyordu;
// reçetesi boş yeni ürüne ilk adım (yalnız işçilikli Dikim gibi) eklenemiyordu.
// Ölçülen: reçetesiz mamul "Model R" › Reçete sekmesi: satır görünür, aday prosesler listelenir; bir proses seçilince ürün
// kaydında `receteEkProsesler` olur ve reçetede o prosesin grubu çıkar.
const { uygulamaAc, modulAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push({ id: "u3", ad: "Model R", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: [{ renk: "Siyah", beden: "40", miktar: 0 }], hareketler: [], recete: [] });
  t["stok:items"] = JSON.stringify(stok);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await modulAc(sayfa, "Ürün Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Model R" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('button:has-text("Reçete"):visible').first().click();
  await sayfa.waitForTimeout(600);
  const satir = () => sayfa.evaluate(() => {
    const r = [...document.querySelectorAll("[data-recete-bos-proses]")].find((x) => x.getBoundingClientRect().height > 0);
    if (!r) return null;
    const sec = r.querySelector("[data-recete-bos-proses-sec]");
    return { adaySayisi: Number(r.getAttribute("data-recete-bos-proses")), secenekler: sec ? [...sec.options].map((o) => o.value).filter(Boolean) : [] };
  });
  const once = await satir();
  const secilen = once && once.secenekler[0];
  if (secilen) await sayfa.locator("[data-recete-bos-proses-sec]:visible").first().selectOption(secilen);
  await sayfa.waitForTimeout(900);
  const kayit = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "u3") || {};
  const sonra = await satir();
  // Reçetede o prosesin "hammaddesiz" grubu (rozetiyle) çizildi mi
  const grupGorunur = secilen ? await sayfa.evaluate((ad) => [...document.querySelectorAll("[data-recete-bos-proses-rozet]")].some((e) => e.getAttribute("data-recete-bos-proses-rozet") === ad && e.getBoundingClientRect().height > 0), secilen) : false;
  await tarayici.close();
  return {
    hatalar,
    bosReceteSatirGorunur: !!once,
    adayVar: !!(once && once.adaySayisi > 0),
    eklenenKayitta: (kayit.receteEkProsesler || []).includes(secilen),
    receteSatiriYok: (kayit.recete || []).length === 0,
    grupGorunur,
    adayBirAzaldi: !!(once && sonra && sonra.adaySayisi === once.adaySayisi - 1),
  };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
