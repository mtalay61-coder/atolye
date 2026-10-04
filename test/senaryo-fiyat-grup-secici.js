// SENARYO — FİYAT GRUPLARI: SEÇİCİ + OTOMATİK + GRUP RENKLERİ (4 Ekim, v1.577.0).
// Kullanıcı: "Grupları eklerken seçmeli olsun, bu şekilde zor" + "Grupların renkleri de değişsin".
//   1. "Adına göre otomatik grupla" → son kelimeye göre Deri / Süet / Baskı; tek kelimelik (Vizon, Siyah) grupsuz kalır.
//   2. Süet'e 0,0051 $ → Vizon satırdaki seçiciden Süet'e alınınca o da 0.0051 USD.
//   3. Her grubun seçici rengi farklı (aynı gruptakiler aynı).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
(async () => {
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  const deri = st.find((p) => p.id === "u1");
  deri.alisFiyati = 0.28; deri.alisParaBirimi = "$";
  deri.variants = ["Bej Deri", "Kahve Deri", "Kahve Süet", "Siyah Süet", "Taba Süet", "Kahve Baskı", "Siyah Baskı", "Vizon"].map((r) => ({ renk: r, beden: "Standart", miktar: 5, minStok: 0 }));
  t["stok:items"] = JSON.stringify(st);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1280, height: 1100 });
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Deri" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Fiyatlandırma/.test(x.textContent.trim()) && x.offsetParent); b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Alış Fiyatı/.test(x.textContent.trim()) && x.offsetParent); b.click(); });
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-fk-grup-otomatik]").click();
  await sayfa.waitForTimeout(600);
  const gr = async () => ((((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u1") || {}).fiyatRenkGruplari || []).map((g) => `${g.ad}: ${g.renkler.join(", ")}`);
  console.log("OTOMATIK", JSON.stringify(await gr()));
  // Süet grubuna fiyat, sonra Vizon'u satırdan Süet grubuna al → fiyatı alır
  const g = sayfa.locator('[data-fk-grup-fiyat="Süet"]'); await sayfa.locator('[data-fk-kutu-pb="grup|Süet"]').selectOption("USD"); await g.fill("0,0051"); await g.blur();
  await sayfa.waitForTimeout(500);
  const sId = await sayfa.evaluate(() => [...document.querySelector('[data-fk-renk-grup="Vizon"]').options].find((o) => o.textContent === "Süet").value);
  await sayfa.locator('[data-fk-renk-grup="Vizon"]').selectOption(sId);
  await sayfa.waitForTimeout(600);
  console.log("SATIRDAN", JSON.stringify(await gr()));
  const kur = ((((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u1") || {}).fiyatKurallari || []).filter((x) => x.tip === "Alış").map((x) => `${x.deger}: ${x.fiyat} ${x.paraBirimi}`);
  console.log("KURALLAR", JSON.stringify(kur));
  const renkler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fk-renk-grup]")].map((s) => `${s.getAttribute("data-fk-renk-grup")}=${getComputedStyle(s).color}`));
  console.log("RENKLER", JSON.stringify(renkler));
  console.log("HATALAR", JSON.stringify(hatalar));
  await tarayici.close();
})();
