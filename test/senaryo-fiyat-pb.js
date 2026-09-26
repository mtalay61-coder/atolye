// SENARYO — FİYATLANDIRMADA PARA BİRİMİ (26 Eylül, v1.481.0).
//
// Kullanıcı (Deri ▸ Fiyatlandırma, renk tek fiyat kutusunda ",18" görünüyor, her yerde ₺): "Fiyatlandırmada
// para birimi olsun. Daha anlaşılır şekilde fiyat girebilelim."
//
// Deri'nin kart alış fiyatı dolar. Ölçülenler:
//   1. Alış sekmesinde para birimi seçimi kartın biriminden (USD) geliyor; başlık "$ genel".
//   2. Renk tek fiyatına virgülle "0,18" yazılıyor → kural 0.18 USD; listede "0,18 $".
//   3. TRY seçip başka renge "12,5" → kural 12.5 TRY; listede "12,5 ₺".
//   4. Kutu yanında kuralın kendi birimi: TRY seçiliyken USD kuralın yanında "$" (farklı birim uyarısı).
//   5. Fiş fiyatı kuralın biriminden çevriliyor (fiyatBul paraBirimi) — birim testlerinde; burada kayıt.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  const deri = st.find((p) => p.id === "u1");
  deri.alisFiyati = 2; deri.alisParaBirimi = "$";
  deri.variants = ["Siyah", "Taba"].map((r) => ({ renk: r, beden: "Standart", miktar: 5, minStok: 0 }));
  t["stok:items"] = JSON.stringify(st);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Deri" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Fiyatlandırma/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Alış Fiyatı/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(300);
  const baslangic = await sayfa.evaluate(() => ({
    pb: (document.querySelector("[data-fk-para-birimi]") || {}).getAttribute && document.querySelector("[data-fk-para-birimi]").getAttribute("data-fk-para-birimi"),
    alisBasligi: ([...document.querySelectorAll("button")].find((x) => /^Alış Fiyatı/.test(x.textContent.trim())) || {}).textContent,
  }));

  // Satır "Tek fiyat" kutusunu işaretle (Siyah), 0,18 yaz.
  const tekFiyatAc = (renk) => sayfa.evaluate((renk) => {
    const tr = [...document.querySelectorAll("tr")].find((x) => x.offsetParent && (x.querySelector("td") || {}).textContent === renk);
    const c = tr && tr.querySelector('input[type="checkbox"]');
    if (c) c.click();
  }, renk);
  const yaz = async (veri, deger) => {
    const k = sayfa.locator(`[data-fk-hucre="${veri}"]`).first();
    await k.fill(deger);
    await k.blur();
    await sayfa.waitForTimeout(400);
  };
  await tekFiyatAc("Siyah");
  await sayfa.waitForTimeout(200);
  await yaz("renk|Siyah", "0,18");
  // TRY seç, Taba'ya 12,5.
  await sayfa.locator('[data-fk-pb="TRY"]').click();
  await sayfa.waitForTimeout(150);
  await tekFiyatAc("Taba");
  await sayfa.waitForTimeout(200);
  await yaz("renk|Taba", "12,5");

  const liste = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fk-kural]")].map((x) => `${x.getAttribute("data-fk-kural")}: ${x.textContent.replace(/\s+/g, " ").trim()}`));
  const siyahKutuBirimi = await sayfa.evaluate(() => {
    const k = document.querySelector('[data-fk-hucre="renk|Siyah"]');
    return k ? `${k.value} ${k.nextElementSibling.textContent}` : null;
  });
  const kayit = ((((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u1") || {}).fiyatKurallari || [])
    .map((k) => `${k.tip} · ${k.kapsam} ${k.deger}: ${k.fiyat} ${k.paraBirimi}`);

  await tarayici.close();
  return { hatalar, baslangic, liste, siyahKutuBirimi, kayit };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
