// SENARYO — MALİYET HANGİ RENK / BEDEN İÇİN (5 Ekim, v1.595.0).
// Kullanıcı: "maliyete proses adını da ekle; maliyette renk bedenler neye göre çekiyor?" Maliyet, reçetesi olan İLK mamul renk ve
// ORTA beden üzerinden hesaplanıyordu, yazmıyordu. Ölçülen: Bot'ta Siyah + Taba renkleri; Deri Siyah 2 m, Deri Taba 3 m; bedene
// göre değişen satır (Taban 40: 5, 42: 1). Varsayılan Siyah / orta beden (40); Taba seçilince Deri 3; beden 42 seçilince Taban 1.
// Her satırda proses sütunu "Kesim".
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((p) => p.id === "u2");
  bot.variants = [...bot.variants, { renk: "Taba", beden: "41", miktar: 0 }];
  bot.recete = [
    { id: "r1", proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2, birim: "metre" },
    { id: "r2", proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Taba", beden: "", mamulRenk: "Taba", mamulBeden: "Tüm Bedenler", miktar: 3, birim: "metre" },
    { id: "r3", proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "40", miktar: 5, birim: "metre", aciklama: "Taban payı" },
    { id: "r4", proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "42", miktar: 1, birim: "metre", aciklama: "Taban payı" },
  ];
  st.find((p) => p.id === "u1").alisFiyati = 10;
  t["stok:items"] = JSON.stringify(st);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Mamul Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1100);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Maliyet" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const durum = () => sayfa.evaluate(() => {
    const renk = document.querySelector("[data-maliyet-renk]"); const beden = document.querySelector("[data-maliyet-beden]");
    return {
      renk: renk ? renk.value : "yok", renkSecenekleri: renk ? [...renk.options].map((o) => o.value) : [],
      beden: beden ? `${beden.value || "(orta)"} · ${beden.options[0].textContent}` : "yok",
      satirlar: [...document.querySelectorAll("[data-maliyet-dokumu] tbody tr")].slice(0, -1).map((tr) => [...tr.children].slice(0, 3).map((c) => c.textContent.replace(/\s+/g, " ").trim()).join(" | ")),
    };
  });
  const varsayilan = await durum();
  await sayfa.locator("[data-maliyet-beden]").selectOption("42");
  await sayfa.waitForTimeout(400);
  const beden42 = await durum();
  await sayfa.locator("[data-maliyet-renk]").selectOption("Taba");
  await sayfa.waitForTimeout(400);
  const taba = await durum();
  await tarayici.close();
  return { hatalar, varsayilan, beden42, taba };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
