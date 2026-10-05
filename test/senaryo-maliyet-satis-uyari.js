// SENARYO — SATIŞA YAZILMIŞ HAMMADDE FİYATI (5 Ekim, v1.594.0).
// Kullanıcı (Fort Bombe: Fiyatlandırma'da renk fiyatları 7 $, 5,25 $… ama Maliyet 350 ₺ çekiyor): "fiyatlar tanımlı ama
// 350 tl çekiyor kontrol". KÖK: Fiyatlandırma hep SATIŞ sekmesiyle açılıyordu, fiyatlar satışa yazıldı; maliyet ALIŞ okur.
// Ölçülen: Deri kart alış 350 ₺ + Siyah SATIŞ kuralı 7 $. (1) Deri › Fiyatlandırma ALIŞ ile açılır; (2) Bot › Maliyet'te
// Deri satırı 350 ve "SATIŞ fiyatı girilmiş" uyarısı; (3) "alışa kopyala" → Siyah ALIŞ kuralı 7 USD, satır 7 $, uyarı yok.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  const deri = st.find((p) => p.id === "u1");
  deri.alisFiyati = 350; deri.alisParaBirimi = "₺";
  deri.fiyatKurallari = [{ id: "s1", kapsam: "renk", deger: "Siyah", tip: "Satış", fiyat: 7, paraBirimi: "USD", etiket: "Renk: Siyah" }];
  t["stok:items"] = JSON.stringify(st);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  const kartAc = async (nav, ad, sekme) => {
    await sayfa.evaluate((n) => { const b = document.querySelector(`[data-nav="${n}"]`); if (b) b.click(); }, nav);
    await sayfa.waitForTimeout(800);
    await sayfa.evaluate((ad) => {
      const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === ad && e.getBoundingClientRect().width > 0);
      let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    }, ad);
    await sayfa.waitForTimeout(1100);
    await sayfa.evaluate((s) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith(s) && x.offsetParent); if (b) b.click(); }, sekme);
    await sayfa.waitForTimeout(800);
  };
  await kartAc("Stok", "Deri", "Fiyatlandırma");
  const varsayilanSekme = await sayfa.evaluate(() => { const p = document.querySelector("[data-fk-panel-tip]"); return p ? p.getAttribute("data-fk-panel-tip") : "yok"; });
  await kartAc("Mamul Stok", "Bot", "Maliyet");
  const satir = () => sayfa.evaluate(() => {
    const kutu = document.querySelector('[data-maliyet-duzenle="hm-u1-Siyah-"]');
    const u = document.querySelector('[data-maliyet-satis-uyari="u1"]');
    return { fiyat: kutu ? kutu.value : "yok", uyari: u ? u.textContent.replace(/\s+/g, " ").trim() : "yok" };
  });
  const once = await satir();
  await sayfa.locator('[data-maliyet-satis-alisa="u1"]').click();
  await sayfa.waitForTimeout(800);
  const sonra = await satir();
  const d = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u1");
  const kurallar = (d.fiyatKurallari || []).map((k) => `${k.tip}:${k.kapsam}:${k.deger}=${k.fiyat} ${k.paraBirimi}${k.kaynakNotu ? " · " + k.kaynakNotu : ""}`);
  await tarayici.close();
  return { hatalar, varsayilanSekme, once, sonra, kartAlis: d.alisFiyati, kurallar };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
