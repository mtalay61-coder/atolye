// SENARYO — REÇETEDE GEÇMİŞ RENK EŞLEŞTİRMESİ (26 Eylül, v1.480.0).
//
// Kullanıcı (reçete ▸ hammadde ekle ▸ "Mamul: Kahve Süet → Kahve ✓ otomatik"): "Reçete renk
// eşleştirmede geçmişte yapılan eşleştirmeleri hatırlama olsun; hangi renk ile hangi renk eşleşiyorsa
// sonraki eşleştirmelerde otomatik eşleştirsin ama kırmızı uyarı versin kontrol için. Müdahale
// edilmeden kaydedilenler olsun, değişecekse zaten değişecek."
//
// Kurulum: "Bot" reçetesinde Deri için "Kahve Süet → Taba" kararı var. Yeni model "Çizme"de (renkler
// Kahve Süet, Siyah) Deri ekleniyor.
// Ölçülenler:
//   1. Kahve Süet → Taba (geçmişten) KIRMIZI uyarılı; Siyah → Siyah (isim) uyarısız.
//   2. Seçiciye dokununca o satırın uyarısı kalkıyor.
//   3. Dokunmadan "Reçeteye Ekle": satırlar geçmiş eşleşmeyle yazılıyor (engel yok).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const deri = stok.find((p) => p.id === "u1");
  deri.variants = ["Siyah", "Taba", "Kahve"].map((r) => ({ renk: r, beden: "Standart", miktar: 10, minStok: 0 }));
  const bot = stok.find((p) => p.id === "u2");
  bot.recete = [{ id: "rg1", hammaddeUrunId: "u1", hammaddeAd: deri.ad, renk: "Taba", beden: "Standart", mamulRenk: "Kahve Süet", mamulBeden: "Tüm Bedenler",
    miktar: 2, birim: deri.birim, proses: "Kesim", eklemeTarihi: "2026-09-20T08:00:00.000Z" }];
  stok.push({ id: "cz", ad: "Çizme", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", recete: [], hareketler: [],
    variants: ["Kahve Süet", "Siyah"].flatMap((r) => ["40", "41"].map((b) => ({ renk: r, beden: b, miktar: 0, minStok: 0 }))) });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Çizme" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('button:has-text("Reçete"):visible').first().click();
  await sayfa.waitForTimeout(600);
  const kutu = sayfa.locator('input[placeholder="Hammadde ara…"]:visible').first();
  await kutu.click();
  await kutu.fill(deri.ad.slice(0, 3));
  await sayfa.waitForTimeout(300);
  await sayfa.locator("button:visible", { hasText: deri.ad }).first().dispatchEvent("mousedown");
  await sayfa.waitForTimeout(500);

  const durum = () => sayfa.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-recete-renk-eslesme]")].map((s) => {
    const k = s.getAttribute("data-recete-renk-eslesme");
    return [k, `${s.value}${document.querySelector(`[data-recete-gecmis-uyari="${k}"]`) ? " ⚠ geçmişten" : ""}`];
  })));
  const ilk = await durum();

  // 2. Siyah satırına dokun (aynı değeri seç) — uyarısı zaten yok; Kahve Süet'e dokunulmuyor.
  //    Uyarının kalkmasını ölçmek için Kahve Süet'i Kahve yapıp geri Taba'ya çeviriyoruz.
  const sec = (k, v) => sayfa.evaluate(([k, v]) => {
    const s = document.querySelector(`[data-recete-renk-eslesme="${k}"]`);
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    set.call(s, v); s.dispatchEvent(new Event("change", { bubbles: true }));
  }, [k, v]);
  await sec("Kahve Süet|1", "Kahve");
  await sayfa.waitForTimeout(150);
  await sec("Kahve Süet|1", "Taba");
  await sayfa.waitForTimeout(150);
  const dokununca = await durum();

  // 3. Geri yükleyip dokunmadan ekle: hammaddeyi yeniden seç (eşleşme baştan kurulur).
  await kutu.click();
  await kutu.fill(deri.ad.slice(0, 3));
  await sayfa.waitForTimeout(300);
  await sayfa.locator("button:visible", { hasText: deri.ad }).first().dispatchEvent("mousedown");
  await sayfa.waitForTimeout(400);
  const yenidenSecince = await durum();
  await sayfa.evaluate(() => {
    const l = [...document.querySelectorAll("label")].find((x) => /^Miktar \(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
    const i = l && l.querySelector("input");
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(i, "1.5"); i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sayfa.waitForTimeout(150);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && x.textContent.trim() === "Reçeteye Ekle"); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const cizme = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "cz") || {};
  const recete = [...new Set((cizme.recete || []).map((r) => `${r.mamulRenk} → ${r.renk}`))].sort();

  await tarayici.close();
  return { hatalar, ilk, dokununca, yenidenSecince, recete };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
