// SENARYO — TANIMLAR BİRLEŞTİREREK YAZILIR + KAYIP MODEL RENKLERİ (v1.552.0).
//
// Kullanıcı (Paketleme): "75 renk/bedende çift barkodu kurulamıyor — Tanımlar'da yok: 1017 - Beyaz Deri/Gümüş…"
// Sebep: tanımlar tek satır; başka cihazın eski listesi yeni model renklerini siliyordu.
//   1. Paketleme: "1002 - Siyah/Taba" ürünlerde var, tanımı yok → uyarı + "Model renklerini geri kur".
//   2. Geri kur → kombinasyon 1002 KODUYLA tanımlarda, uyarı kalkar.
//   3. Bu yazımda bulut (başka cihaz) "Lacivert" rengini eklemiş → korunur (ekranda ve buluta giden veride);
//      bu cihazda silinen "Gri" geri gelmez.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.renkler = [...tan.renkler, { id: "r3", ad: "Gri", tip: "Hammadde" }];
  tan.renkKombinasyonlari = [];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((u) => u.id === "u2");
  bot.stokNo = bot.stokNo || 101;
  bot.variants = bot.variants.map((v) => ({ ...v, renk: "1002 - Siyah/Taba" }));
  t["stok:items"] = JSON.stringify(st);

  // Buluttaki tanımlar (başka cihazın yazdığı): Gri hâlâ var (bu cihaz siler), Lacivert yeni.
  const bulutTanim = { ...tan, renkler: [...tan.renkler, { id: "renk-lacivert", ad: "Lacivert", tip: "Hammadde" }] };
  const giden = [];
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/tanimlar*", async (r) => {
      const req = r.request();
      if (req.method() === "GET" && req.url().includes("id=eq.tekil")) {
        return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ veri: bulutTanim }]) });
      }
      if (req.method() === "POST") {
        try { giden.push(JSON.parse(req.postData())[0].veri); } catch (e) { /* */ }
        return r.fulfill({ status: 201, body: "" });
      }
      return r.continue();
    });
  };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // ---- 1-2) Paketleme uyarısı + geri kur ----
  await modulAc(sayfa, "Paketleme");
  await sayfa.waitForTimeout(500);
  const dugme = await sayfa.locator("[data-model-rengi-onar]").first().getAttribute("data-model-rengi-onar").catch(() => null);
  const uyariOnce = await sayfa.evaluate(() => /1002 - Siyah\/Taba/.test(document.body.innerText));
  // Önce bu cihazda Gri silinsin (silindi defterine düşer) — Tanımlar › Ürün › Renkler.
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-tanim-sekme="urun"]').first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    let el = [...document.querySelectorAll("input")].find((e) => e.offsetParent && e.value === "Gri");
    while (el && !el.querySelector('[data-ikon="X"]')) el = el.parentElement;
    const x = el && el.querySelector('[data-ikon="X"]');
    if (x) x.closest("button").click();
  });
  await sayfa.waitForTimeout(800);
  await modulAc(sayfa, "Paketleme");
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-model-rengi-onar]").first().click();
  await sayfa.waitForTimeout(1200);
  const yerelTanim = await depoOku(sayfa, "tanimlar:data");
  const uyariSonra = await sayfa.evaluate(() => /1002 - Siyah\/Taba/.test(document.body.innerText));
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-tanim-sekme="urun"]').first().click();
  await sayfa.waitForTimeout(400);
  const ekranda = await sayfa.evaluate(() => ["Siyah", "Taba", "Gri", "Lacivert"].filter((ad) =>
    [...document.querySelectorAll("input")].some((e) => e.offsetParent && e.value === ad)));
  const son = giden[giden.length - 1] || {};
  await tarayici.close();
  return {
    uyariOnce, dugme, uyariSonra,
    kombinasyonlar: (yerelTanim.renkKombinasyonlari || []).map((k) => `${k.kod}:${k.renkIdler.join("+")}`),
    yerelRenkler: (yerelTanim.renkler || []).map((r) => r.ad),
    bulutaGidenRenkler: (son.renkler || []).map((r) => r.ad),
    bulutaGidenKombi: (son.renkKombinasyonlari || []).map((k) => k.kod),
    ekranda, hatalar,
  };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
