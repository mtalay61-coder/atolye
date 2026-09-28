// SENARYO — SİPARİŞ SİLİNİNCE YETİM HAREKET KALMAZ (28 Eylül, v1.509.0).
//
// Kullanıcı (Stok ekran görüntüsü): "10 bağlantısız stok hareketi bulundu — bağlı sipariş silinmiş"; AF ve SF
// fişlerinin hareketleri silinmiş bir siparişi gösteriyordu. Sebep bu oturumda BULUNAMADI (bkz. DEVAM-NOTU
// v1.509.0): açılışta `siparisKarsilananlariHesapla` teslim sayacını stok hareketlerinden türettiği için
// bağlı stok hareketi olan sipariş her zaman silme zincirinden (`siparisSilCascade`) geçiyor. Bu senaryo o
// güvenceyi koruyor: bağlı fişiyle silinen siparişten yetim hareket kalmamalı.
// Kurulum: SAT-Y (kayıtta karşılanan 0 — açılışta hareketten 4'e türetiliyor) ve ona bağlı SF-Y fişinin stok (−4) ve cari hareketi.
// Ölçülen: kart → "Siparişi sil" → "Evet, Sil" sonrası sipariş yok, stok ve cari hareketi yok, stok eski
// hâline döndü (6 → 10), Stok ekranında "bağlantısız stok hareketi" uyarısı yok.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = bot.variants.map((v) => (v.renk === "Siyah" && v.beden === "40" ? { ...v, miktar: 6 } : v));
  bot.hareketler = [...(bot.hareketler || []), { id: "hy1", tarih: "2026-09-28T09:00:00.000Z", renk: "Siyah", beden: "40", miktar: -4,
    kaynak: "Satış", cariId: "c2", fisNo: "SF-Y", siparisId: "sy", siparisNo: "SAT-Y", kalemId: "ky1" }];
  t["stok:items"] = JSON.stringify(stok);
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c) => c.id === "c2" ? { ...c, hareketler: [
    { id: "hy1", tarih: "2026-09-28", yon: "Borç", tutar: 400, paraBirimi: "TRY", fisNo: "SF-Y", siparisId: "sy", siparisNo: "SAT-Y",
      urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 4, birimFiyat: 100, defter: "Genel", odemeSekli: "Nakit" }] } : c));
  t["siparis:data"] = JSON.stringify([{ id: "sy", siparisNo: "SAT-Y", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-28", teslimTarihi: "2026-10-05", kalemler: [{ id: "ky1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 4, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" }] }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-siparis-tam-ekran="SAT-Y"]').first().click();
  await sayfa.waitForTimeout(800);
  await sayfa.locator('button[title="Siparişi sil"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  // Kart eylemi iki adımlı: "Sil" onayı, ardından (bağlantı uyarısı varsa) "Evet, Sil".
  const sil = sayfa.getByRole("button", { name: "Sil", exact: true }).filter({ visible: true });
  if (await sil.count()) { await sil.first().click(); await sayfa.waitForTimeout(500); }
  const evet = sayfa.getByRole("button", { name: "Evet, Sil" }).filter({ visible: true });
  if (await evet.count()) { await evet.first().click(); }
  await sayfa.waitForTimeout(1200);
  const siparisVar = ((await depoOku(sayfa, "siparis:data")) || []).some((s) => s.id === "sy");
  const b2 = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {};
  const c2 = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(700);
  const yetimUyarisi = await sayfa.evaluate(() => /bağlantısız stok hareketi/.test(document.body.innerText));
  await tarayici.close();
  return {
    hatalar, siparisVar,
    stokHareketi: (b2.hareketler || []).some((h) => h.siparisId === "sy"),
    stok4040: ((b2.variants || []).find((v) => v.renk === "Siyah" && v.beden === "40") || {}).miktar,
    cariHareketi: (c2.hareketler || []).some((h) => h.siparisId === "sy"),
    yetimUyarisi,
  };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
