// SENARYO — REÇETEDE OLUP STOKTA OLMAYAN HAMMADDE: UYARI + GERİ KUR (v1.556.0, "Jut" olayı).
// Bot'un reçetesi "jut1" kimlikli Jut'u kullanıyor, stokta Jut yok → Stok'ta uyarı → Geri kur →
// Jut aynı kimlikle, birimiyle, reçetedeki rengiyle stokta; uyarı kalkar; reçete değişmez.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((u) => u.id === "u2");
  bot.recete = [...(bot.recete || []), { hammaddeUrunId: "jut1", hammaddeAd: "Jut", mamulRenk: "Siyah", renk: "Naturel", beden: "", miktar: 0.0286, birim: "Çift", proses: "Kesim" }];
  t["stok:items"] = JSON.stringify(st);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(700);
  const uyari = await sayfa.evaluate(() => { const d = document.querySelector("[data-kayip-hammadde]"); return d ? d.innerText.split("\n")[0] : null; });
  await sayfa.locator("[data-kayip-hammadde-kur]").first().click();
  await sayfa.waitForTimeout(800);
  const stok = await depoOku(sayfa, "stok:items");
  const jut = stok.find((u) => u.id === "jut1");
  const sonra = {
    jut: jut ? { ad: jut.ad, kategori: jut.kategori, birim: jut.birim, renkler: jut.variants.map((v) => v.renk), geriKuruldu: jut.geriKuruldu } : null,
    receteAyni: stok.find((u) => u.id === "u2").recete.some((r) => r.hammaddeUrunId === "jut1"),
    uyariKalkti: (await sayfa.locator("[data-kayip-hammadde]").count()) === 0,
  };
  await tarayici.close();
  return { uyari, sonra, hatalar };
}
if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
