// SENARYO — SONRADAN RENK EKLENEN HAMMADDE (v1.691, kullanıcı: "hammaddeye sonradan renk ilave oldu ama reçetede
// göstermiyor"). Reçeteye renksiz eklenmiş Yapıştırıcı'nın kartına sonra Siyah/Taba açılmış: kartta uyarı çıkar,
// "Aynı adlıları eşle" satırlara renkleri yazar. Tohum recete-standart-kart senaryosundan.
// (eski başlık) STANDART HAMMADDE KARTI SADE (5 Ekim, v1.597.0).
// Kullanıcı: "Standart hammadde için renk dağılımına gerek yok, zaten renksiz ve bedensiz olduğu için boşa yer kaplamasın."
// Ölçülen: Bot (Siyah + Taba) reçetesinde renksiz/bedensiz "Yapıştırıcı" her iki renkte Standart × 0,002 → kartta
// pozisyon/renk tablosu yok, tek satır not; Deri kartı (renkli) tablosu duruyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  st.push({ id: "hy", ad: "Yapıştırıcı", kategori: "Hammadde", birim: "Teneke", olcuTipi: "Serbest", variants: [{ renk: "Siyah", beden: "Standart", miktar: 5 }, { renk: "Taba", beden: "Standart", miktar: 5 }], hareketler: [], recete: [] });
  const bot = st.find((p) => p.id === "u2");
  bot.variants = [...bot.variants, { renk: "Taba", beden: "41", miktar: 0 }];
  bot.recete = [
    { id: "r1", proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2, birim: "metre" },
    { id: "r2", proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Taba", beden: "", mamulRenk: "Taba", mamulBeden: "Tüm Bedenler", miktar: 2, birim: "metre" },
    { id: "y1", proses: "Kesim", hammaddeUrunId: "hy", hammaddeAd: "Yapıştırıcı", renk: "Standart", beden: "Standart", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 0.002, birim: "Teneke", eklemeId: "e-y" },
    { id: "y2", proses: "Kesim", hammaddeUrunId: "hy", hammaddeAd: "Yapıştırıcı", renk: "Standart", beden: "Standart", mamulRenk: "Taba", mamulBeden: "Tüm Bedenler", miktar: 0.002, birim: "Teneke", eklemeId: "e-y" },
  ];
  t["stok:items"] = JSON.stringify(st);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Ürün Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1100);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Reçete/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const uyari = await sayfa.evaluate(() => { const u = document.querySelector('[data-recete-renk-eklendi="Yapıştırıcı"]'); return u ? u.textContent.replace(/\s+/g, " ").trim().slice(0, 90) : "yok"; });
  await sayfa.evaluate(() => { const b = document.querySelector('[data-recete-renk-ad-esle="Yapıştırıcı"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(1200);
  const botSon = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {};
  const satirlar = (botSon.recete || []).filter((r) => r.hammaddeUrunId === "hy").map((r) => `${r.mamulRenk}→${r.renk}`).sort();
  const uyariSonra = await sayfa.evaluate(() => !!document.querySelector('[data-recete-renk-eklendi="Yapıştırıcı"]'));
  const sonuc = { uyari, satirlar, uyariSonra };
  await tarayici.close();
  return { hatalar, ...sonuc };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
