// SENARYO — FİYAT GRUBU KÂR MARJI + RAKAMLA DÜZENLEME (5 Ekim, v1.597.0).
// Kullanıcı: "maliyetten fiyat gruplarına atama yapabilelim, rakam girerek de olsun, hatta fiyat gruplarının kâr marjı olsun,
// marj girerek otomatik fiyat versin." Ölçülen: Bot tam maliyet 200 ₺ (Deri 2 m × 100), ürün kârı %30 → genel öneri 285,71;
// Toptan grubu marj %20 → öneri 250. Ekle → kural 250; kutuya 260 → kural 260; marjı 50 yapınca öneri 400 ve Tanımlar'da marj 50.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.fiyatGruplari = [{ id: "fg1", ad: "Toptan", tip: "Satış", paraBirimi: "TRY", marj: 20 }];
  tan.aylikUretimHedefi = 0; tan.genelGiderler = [];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(TOHUM["stok:items"]);
  const deri = st.find((p) => p.id === "u1"); deri.alisFiyati = 100; deri.alisParaBirimi = "₺";
  const bot = st.find((p) => p.id === "u2");
  bot.recete = [{ id: "r1", proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2, birim: "metre" }];
  bot.prosesUcretleri = {}; bot.karMarji = 30; bot.fiyatKurallari = [];
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
  const tam = await sayfa.evaluate(() => ({ tam: (document.querySelector("[data-ozet-tam]") || {}).textContent, toplam: (document.querySelector("[data-ozet-toplam]") || {}).textContent }));
  await sayfa.evaluate(() => { const s = document.querySelector("[data-fg-sec]"); s.value = "fg1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await sayfa.waitForTimeout(300);
  const oneriMarjli = await sayfa.evaluate(() => (document.querySelector("[data-fg-fiyat]") || {}).value || null);
  await sayfa.locator("[data-fg-ekle]").click();
  await sayfa.waitForTimeout(700);
  const kural = async () => ((((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {}).fiyatKurallari || []).map((k) => `${k.deger}=${k.fiyat} ${k.paraBirimi}`);
  const eklendi = await kural();
  // Rakamla düzenle
  const kutu = sayfa.locator('[data-grup-fiyat-kutu="fg1"]');
  await kutu.fill("260"); await kutu.blur(); await sayfa.waitForTimeout(700);
  const duzeltildi = await kural();
  // Marjı 50 yap → öneri 400
  const marj = sayfa.locator('[data-fg-marj="fg1"]');
  await marj.fill("50"); await marj.blur(); await sayfa.waitForTimeout(900);
  const oneriSonra = await sayfa.evaluate(() => { const r = document.querySelector('[data-fiyat-grubu-satir="fg1"]'); return r ? r.children[2].textContent.replace(/\s+/g, " ").trim() : "yok"; });
  const tanimMarj = ((((await depoOku(sayfa, "tanimlar:data")) || {}).fiyatGruplari || [])[0] || {}).marj;
  await sayfa.locator('[data-fiyat-uygula="fg1"]').click();
  await sayfa.waitForTimeout(700);
  const esitlendi = await kural();
  await tarayici.close();
  return { hatalar, tam, oneriMarjli, eklendi, duzeltildi, oneriSonra, tanimMarj, esitlendi };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
