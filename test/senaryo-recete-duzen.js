// SENARYO — REÇETE DÜZENLEME ARAÇLARI (5 Ekim, v1.593.0).
// Kullanıcı: "Pozisyonda düzenleme olsun, stokların sıralaması olsun aşağı yukarı gibi, hammadde kullanmayan proses de
// ekleyebilelim." + "Otomatik eşleşmede kırmızı ama doğru; üzerine tik koyalım, kırmızı kalksın yeşil olsun."
// Ölçülen (Bot › Reçete, Kesim prosesi: Deri kartı + Astar kartı):
//   1) Astar'ın "2. Renk" etiketi → "1. Renk" (satır aciklama değişti, renk korundu).
//   2) Deri kartı aşağı → kart sırası [Astar, Deri]; reçete dizisinde Astar satırları önce.
//   3) "Hammaddesiz proses ekle: Dikim" → DİKİM grubu rozetle; receteEkProsesler ["Dikim"]; × ile kalkıyor.
//   4) Astar'ın kırmızı (geçmişten) hücresinde ✓ → renkGecmisten düştü, renkOnayli; yeşil ✓ görünüyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.prosesler = [{ id: "p1", ad: "Kesim", sira: 1 }, { id: "p2", ad: "Dikim", sira: 2 }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(TOHUM["stok:items"]);
  st.push({ id: "ha", ad: "Astar", kategori: "Hammadde", birim: "Desi", olcuTipi: "Serbest",
    variants: [{ renk: "Siyah", beden: "", miktar: 50 }, { renk: "Bej", beden: "", miktar: 20 }], hareketler: [], recete: [] });
  const bot = st.find((p) => p.id === "u2");
  bot.recete = [
    ...bot.recete,
    { id: "ra1", proses: "Kesim", hammaddeUrunId: "ha", hammaddeAd: "Astar", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler",
      miktar: 3, birim: "Desi", aciklama: "2. Renk", eklemeId: "e-astar", eklemeTarihi: "2026-09-01T10:00:00.000Z", renkGecmisten: true },
  ];
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
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Reçete/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const kartSirasi = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-recete-kart-tasi='yukari']")].map((b) => b.getAttribute("data-recete-kart")));
  const astar = async () => (((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {}).recete.filter((r) => r.hammaddeUrunId === "ha").map((r) => `${r.aciklama} · ${r.renk} · gecmis:${!!r.renkGecmisten} · onayli:${!!r.renkOnayli}`);
  const once = { kartlar: await kartSirasi(), astar: await astar(), kirmiziVar: await sayfa.locator("[data-renk-gecmis-onay]").count() };

  // 1) Pozisyon: 2. Renk → 1. Renk
  await sayfa.locator('[data-recete-pozisyon="2. Renk"]').click();
  await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-recete-pozisyon-sec="2. Renk"]').selectOption("1. Renk");
  await sayfa.waitForTimeout(600);
  const pozisyonSonrasi = await astar();

  // 4) Kırmızı hücreye ✓
  await sayfa.locator("[data-renk-gecmis-onay]").first().click();
  await sayfa.waitForTimeout(600);
  const onaySonrasi = { astar: await astar(), yesilVar: await sayfa.locator("[data-renk-onayli]").count(), kirmiziKaldi: await sayfa.locator("[data-renk-gecmis-onay]").count() };

  // 2) Deri kartını aşağı
  // Ok düğmesi yalnız ikon taşıyor (testte Lucide boş bileşen → görünmez), JS ile tıklanıyor.
  await sayfa.evaluate(() => document.querySelector('[data-recete-kart-tasi="asagi"][data-recete-kart="Deri"]').click());
  await sayfa.waitForTimeout(600);
  const siraSonrasi = { kartlar: await kartSirasi(), ilkSatirHammadde: (((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {}).recete[0].hammaddeAd };

  // 3) Hammaddesiz proses
  await sayfa.locator("[data-recete-bos-proses-sec]").selectOption("Dikim");
  await sayfa.waitForTimeout(600);
  const dikim = {
    rozet: await sayfa.evaluate(() => { const r = document.querySelector('[data-recete-bos-proses-rozet="Dikim"]'); return r ? r.textContent.replace(/\s+/g, " ").trim() : "yok"; }),
    ekProsesler: (((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {}).receteEkProsesler,
    seciciKaldi: await sayfa.locator("[data-recete-bos-proses-sec]").count(),
  };
  await sayfa.locator('[data-recete-bos-proses-kaldir="Dikim"]').click();
  await sayfa.waitForTimeout(500);
  const dikimKaldirildi = { rozet: await sayfa.locator('[data-recete-bos-proses-rozet="Dikim"]').count(), ekProsesler: (((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {}).receteEkProsesler };
  await tarayici.close();
  return { hatalar, once, pozisyonSonrasi, onaySonrasi, siraSonrasi, dikim, dikimKaldirildi };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
