// SENARYO — FİYATLANDIRMADA "TÜMÜ TEK FİYAT" + RENK GRUPLARI (4 Ekim, v1.576.0).
// Kullanıcı: "Sağ en altta tik koyalım, ona tıklayınca tüm renk bedenler aynı fiyat olsun; fiyatta gruplandırma olsun —
// deri stokta süet renkler hep aynı fiyat olacak şekilde setleri ayrı gruplayıp fiyatlandıralım."
//   1. Sağ alt "Tümü tek fiyat" + USD + 0,0041 → bütün renklere renk kuralı 0.0041 USD.
//   2. "Süetler" grubu (Kahve/Siyah/Taba Süet) + 0,0051 → yalnız üyeler 0.0051; grup ürüne yazılır.
//   3. Gruba Bej Deri eklenince grubun fiyatı ona da yazılır.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
(async () => {
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  const deri = st.find((p) => p.id === "u1");
  deri.alisFiyati = 0.28; deri.alisParaBirimi = "$";
  deri.variants = ["Bej Deri", "Kahve Deri", "Kahve Süet", "Siyah Süet", "Taba Süet"].map((r) => ({ renk: r, beden: "Standart", miktar: 5, minStok: 0 }));
  t["stok:items"] = JSON.stringify(st);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1280, height: 1000 });
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
  // Tümü tek fiyat
  await sayfa.locator("[data-fk-tumu-tik]").check();
  await sayfa.locator('[data-fk-kutu-pb="tumu"]').selectOption("USD");
  const k = sayfa.locator("[data-fk-tumu]"); await k.fill("0,0041"); await k.blur();
  await sayfa.waitForTimeout(600);
  const kur = async () => ((((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u1") || {}).fiyatKurallari || []).filter((x) => x.tip === "Alış").map((x) => `${x.deger}: ${x.fiyat} ${x.paraBirimi}`);
  console.log("TUMU", JSON.stringify(await kur()));
  // Grup: Süetler
  await sayfa.locator("[data-fk-grup-ekle]").click();
  await sayfa.locator("[data-fk-grup-ad]").fill("Süetler");
  for (const r of ["Kahve Süet", "Siyah Süet", "Taba Süet"]) await sayfa.locator(`[data-fk-grup-renk="${r}"]`).click();
  await sayfa.locator("[data-fk-grup-kaydet]").click();
  await sayfa.waitForTimeout(600);
  const g = sayfa.locator('[data-fk-grup-fiyat="Süetler"]');
  await g.fill("0,0051"); await g.blur();
  await sayfa.waitForTimeout(600);
  console.log("GRUP", JSON.stringify(await kur()));
  const u = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u1");
  console.log("GRUPLAR", JSON.stringify((u.fiyatRenkGruplari || []).map((g) => `${g.ad}: ${g.renkler.join(", ")}`)));
  console.log("TUMU KUTU", await sayfa.locator("[data-fk-tumu]").count() ? await sayfa.locator("[data-fk-tumu]").inputValue() : "kapali");
  // Gruba yeni renk eklenince grubun fiyatı ona da yazılır (Bej Deri → Süetler).
  await sayfa.locator('[data-fk-grup-duzenle="Süetler"]').click();
  await sayfa.locator('[data-fk-grup-renk="Bej Deri"]').click();
  await sayfa.locator("[data-fk-grup-kaydet]").click();
  await sayfa.waitForTimeout(600);
  console.log("UYE EKLENDI", JSON.stringify(await kur()));
  console.log("HATALAR", JSON.stringify(hatalar));
  await tarayici.close();
})();
